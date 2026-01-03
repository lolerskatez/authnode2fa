from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth, secrets_encryption
from ..rate_limit import limiter, limit_login, limit_signup, limit_totp_verify, TOTP_VERIFY_RATE_LIMIT
from ..oidc_state import generate_secure_state, store_oidc_state, validate_oidc_state
from ..notifications import email_service
from datetime import timedelta, datetime
from authlib.integrations.httpx_client import AsyncOAuth2Client
import os
from urllib.parse import urlencode

# Utility functions for device/browser detection
def getBrowserInfo(user_agent: str = "") -> str:
    """Extract browser information from user agent string"""
    if not user_agent:
        return "Unknown Browser"
    if 'Chrome' in user_agent:
        return 'Chrome'
    if 'Safari' in user_agent:
        return 'Safari'
    if 'Firefox' in user_agent:
        return 'Firefox'
    if 'Edge' in user_agent:
        return 'Edge'
    return 'Unknown Browser'

def getDeviceFromUserAgent(user_agent: str = "") -> str:
    """Extract device information from user agent string"""
    if not user_agent:
        return 'Unknown Device'
    if 'Windows' in user_agent:
        return 'Windows'
    if 'Mac' in user_agent:
        return 'Mac'
    if 'Linux' in user_agent:
        return 'Linux'
    if 'iPhone' in user_agent:
        return 'iPhone'
    if 'iPad' in user_agent:
        return 'iPad'
    if 'Android' in user_agent:
        return 'Android'
    return 'Unknown Device'

router = APIRouter()

@router.post("/signup", response_model=schemas.Token)
@limit_signup
def signup(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, user.email)
    if existing_user:
        # Log failed signup (already exists)
        crud.create_audit_log(
            db,
            action="signup_failed",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Email already registered"
        )
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password against policy
    from ..utils import PasswordPolicy
    password_validation = PasswordPolicy.validate_password(user.password)
    if not password_validation["valid"]:
        crud.create_audit_log(
            db,
            action="signup_failed",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Password policy violation",
            details={"errors": password_validation["errors"]}
        )
        raise HTTPException(
            status_code=400, 
            detail=f"Password does not meet requirements: {'; '.join(password_validation['errors'])}"
        )
    
    # Check password against breach database
    breach_check = PasswordPolicy.check_password_breach(user.password)
    if breach_check["breached"] and not breach_check.get("error"):
        # Log the breach but don't block signup - just warn
        crud.create_audit_log(
            db,
            action="signup_password_breached",
            ip_address=request.client.host if request.client else None,
            status="warning",
            details={"breach_count": breach_check["count"]}
        )
        # For now, allow signup but could be configured to block
    
    # Create new user
    db_user = crud.create_user(db, user)
    
    # Add password to history
    from ..utils import add_password_to_history
    add_password_to_history(db, db_user.id, user.password)
    
    # Log successful signup
    crud.create_audit_log(
        db,
        user_id=db_user.id,
        action="signup_success",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    # Generate token - sub must be a string
    access_token = auth.create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
@limit_login
def login(request: Request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Get client IP address
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Check access restrictions
    global_settings = crud.get_global_settings(db)
    from ..access_restrictions import check_access_restrictions
    access_allowed, restriction_reason = check_access_restrictions(client_ip, global_settings)
    
    if not access_allowed:
        # Log the access denial
        crud.create_audit_log(
            db,
            action="access_denied",
            ip_address=client_ip,
            status="failed",
            reason=restriction_reason,
            details={"restriction_type": "ip_geo"}
        )
        raise HTTPException(
            status_code=403,  # Forbidden
            detail=f"Access denied: {restriction_reason}"
        )
    
    # Get user by email first to check lockout status
    user = crud.get_user_by_email(db, credentials.email)
    
    # Check if account is locked
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        # Account is locked
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="login_failed",
            ip_address=client_ip,
            status="failed",
            reason="Account locked due to too many failed attempts",
            details={"locked_until": user.locked_until.isoformat()}
        )
        raise HTTPException(
            status_code=423,  # Locked
            detail=f"Account is locked due to too many failed login attempts. Try again after {user.locked_until.strftime('%Y-%m-%d %H:%M:%S UTC')}."
        )
    
    # Authenticate user
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        # Authentication failed - handle lockout logic
        failed_user = crud.get_user_by_email(db, credentials.email)  # Get user again for lockout tracking
        if failed_user and not failed_user.is_sso_user:  # Only lock local users
            # Increment failed login attempts
            failed_user.failed_login_attempts = (failed_user.failed_login_attempts or 0) + 1
            failed_user.last_failed_login = datetime.utcnow()
            
            # Check if we should lock the account
            MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
            LOCKOUT_DURATION_MINUTES = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "15"))
            
            if failed_user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                # Lock the account
                failed_user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                
                crud.create_audit_log(
                    db,
                    user_id=failed_user.id,
                    action="account_locked",
                    ip_address=client_ip,
                    status="warning",
                    reason="Too many failed login attempts",
                    details={
                        "failed_attempts": failed_user.failed_login_attempts,
                        "locked_until": failed_user.locked_until.isoformat(),
                        "lockout_duration_minutes": LOCKOUT_DURATION_MINUTES
                    }
                )
                # Send email alert about account lock
                email_service.send_brute_force_alert(failed_user, failed_user.failed_login_attempts)
                # Create in-app notification
                crud.create_in_app_notification(
                    db,
                    user_id=failed_user.id,
                    notification_type="security_alert",
                    title="Account Locked",
                    message=f"Your account has been locked due to {failed_user.failed_login_attempts} failed login attempts. It will unlock in 15 minutes."
                )
            else:
                crud.create_audit_log(
                    db,
                    user_id=failed_user.id,
                    action="login_failed",
                    ip_address=client_ip,
                    status="failed",
                    reason="Invalid password",
                    details={"failed_attempts": failed_user.failed_login_attempts}
                )
            
            db.commit()
        
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Authentication successful - reset failed attempts
    if user.failed_login_attempts and user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_failed_login = None
        db.commit()
    
    # Get global settings to check 2FA enforcement
    global_settings = crud.get_global_settings(db)
    totp_enforcement = global_settings.totp_enforcement  # optional, admin_only, or required_all
    
    # Check if user needs to enroll in 2FA
    requires_enrollment = False
    if totp_enforcement == "admin_only" and user.role == "admin" and not user.totp_enabled:
        # Admins need to enroll when enforcement is admin_only
        requires_enrollment = True
    elif totp_enforcement == "required_all" and not user.totp_enabled:
        # All users need to enroll when enforcement is required_all
        requires_enrollment = True
    
    # If enrollment is required, return a temporary token and flag
    if requires_enrollment:
        # Generate a temporary token valid only for 2FA setup (valid for 15 minutes)
        access_token = auth.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=15)
        )
        # Log the login attempt requiring 2FA enrollment
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="login_2fa_enrollment_required",
            ip_address=client_ip,
            status="success"
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "requires_2fa_enrollment": True
        }
    
    # If user has 2FA enabled, they need to provide TOTP code
    if user.totp_enabled:
        # For now, return a temporary token that can be used to complete 2FA verification
        # The frontend will need to provide the TOTP code in a separate request
        # Return status 202 (Accepted) to indicate 2FA is required
        # Log the login attempt with 2FA pending
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="login_2fa_pending",
            ip_address=client_ip,
            status="success"
        )
        return {
            "access_token": f"2fa_required_{user.id}",
            "token_type": "2fa_pending"
        }
    
    # Generate token - sub must be a string
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Create user session for tracking
    try:
        from jose import jwt
        payload = jwt.decode(access_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        token_jti = payload.get('jti')
        expires_at = payload.get('exp')
        if token_jti and expires_at:
            crud.create_user_session(
                db,
                user_id=user.id,
                token_jti=token_jti,
                ip_address=client_ip,
                user_agent=request.headers.get('user-agent'),
                expires_at=datetime.utcfromtimestamp(expires_at)
            )
    except Exception as e:
        # Don't fail login if session creation fails
        print(f"Warning: Failed to create user session: {str(e)}")
    
    # Log successful login
    crud.create_audit_log(
        db,
        user_id=user.id,
        action="login_success",
        ip_address=client_ip,
        status="success"
    )
    
    # Create in-app notification for new login
    from ..notifications import InAppNotificationService
    user_agent = request.headers.get('user-agent', '')
    device_info = f"{getBrowserInfo(user_agent)} on {getDeviceFromUserAgent(user_agent)}"
    InAppNotificationService.create_notification(
        db,
        user_id=user.id,
        notification_type="login_alert",
        title="New Login Detected",
        message=f"You logged in from {device_info} at {datetime.utcnow().strftime('%H:%M UTC')}. If this wasn't you, please change your password immediately.",
        details={
            "ip_address": client_ip,
            "device_info": device_info,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def get_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/settings", response_model=schemas.User)
def update_user_settings(settings: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Update user settings (theme, autoLock, codeFormat)"""
    current_user.settings = settings
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/check-users")
def check_users_exist(db: Session = Depends(get_db)):
    """Check if any users exist in the database (unauthenticated endpoint)"""
    user_count = db.query(models.User).count()
    return {"has_users": user_count > 0}

@router.get("/login-settings")
def get_login_settings(db: Session = Depends(get_db)):
    """Get public login settings (unauthenticated endpoint)"""
    try:
        settings = db.query(models.GlobalSettings).first()
        smtp_config = db.query(models.SMTPConfig).first()
        smtp_enabled = smtp_config.enabled if smtp_config else False
        
        if settings:
            # Password reset is only enabled if both the setting is enabled AND SMTP is configured
            password_reset_enabled = (settings.password_reset_enabled if hasattr(settings, 'password_reset_enabled') else True) and smtp_enabled
            
            return {
                "webauthn_enabled": settings.webauthn_enabled if hasattr(settings, 'webauthn_enabled') else True,
                "signup_enabled": settings.signup_enabled if hasattr(settings, 'signup_enabled') else True,
                "password_reset_enabled": password_reset_enabled
            }
        return {
            "webauthn_enabled": True,
            "signup_enabled": True,
            "password_reset_enabled": False
        }
    except Exception as e:
        # Default to enabled if error
        return {
            "webauthn_enabled": True,
            "signup_enabled": True,
            "password_reset_enabled": False
        }

@router.post("/suggest-username")
def suggest_username(data: dict, db: Session = Depends(get_db)):
    """Generate a suggested username based on full name and/or email"""
    full_name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    
    # Generate suggestions from full name
    suggestions = []
    if full_name:
        # Try first name + last name combination
        parts = full_name.lower().split()
        if len(parts) >= 2:
            suggestions.append(f"{parts[0]}{parts[-1]}")  # firstlast
            suggestions.append(f"{parts[0]}.{parts[-1]}")  # first.last
        suggestions.append(parts[0] if parts else "")  # first name only
    
    # Generate suggestions from email
    if email and "@" in email:
        email_user = email.split("@")[0].lower()
        suggestions.append(email_user)
    
    # Filter and deduplicate
    suggestions = [s for s in suggestions if s]
    
    # Find a username that doesn't exist
    for suggestion in suggestions:
        base = suggestion
        counter = 1
        username = base
        
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base}{counter}"
            counter += 1
        
        return {"suggested_username": username}
    
    # Fallback: generate from timestamp
    import time
    fallback = f"user{int(time.time()) % 10000}"
    return {"suggested_username": fallback}

@router.get("/login-page-theme")
def get_login_page_theme(db: Session = Depends(get_db)):
    """Get the login page theme (public endpoint, no auth required)"""
    from .. import crud
    settings = crud.get_global_settings(db)
    return {"theme": settings.login_page_theme}

@router.get("/settings")
def get_auth_settings(db: Session = Depends(get_db)):
    """Get public auth settings (public endpoint, no auth required)"""
    from .. import crud
    settings = crud.get_global_settings(db)
    return {
        "signup_enabled": settings.signup_enabled,
        "theme": settings.login_page_theme
    }

@router.get("/oidc/config")
def get_oidc_config(db: Session = Depends(get_db)):
    """Get OIDC configuration (public endpoint for frontend)"""
    config = crud.get_oidc_config(db)
    if not config.enabled:
        return {"enabled": False}
    return {
        "enabled": config.enabled,
        "provider_name": config.provider_name,
        "authorization_endpoint": config.authorization_endpoint,
        "scope": config.scope,
        "client_id": config.client_id
    }

@router.get("/oidc/login")
async def oidc_login(request: Request, db: Session = Depends(get_db)):
    """Initiate OIDC login flow"""
    config = crud.get_oidc_config(db)
    if not config.enabled:
        raise HTTPException(status_code=400, detail="OIDC not enabled")
    
    # Get redirect URI - must match what's configured in the OIDC provider
    if config.redirect_uri:
        redirect_uri = config.redirect_uri
    else:
        # Dynamic detection: Get the correct origin, considering proxies and Cloudflare
        # Priority: origin header > x-forwarded-host > host header
        origin = request.headers.get('origin')
        
        if not origin or origin.startswith('http://localhost'):
            # If origin is localhost or not available, try to construct from headers
            host = request.headers.get('x-forwarded-host') or request.headers.get('host')
            
            if host and host not in ['localhost', '127.0.0.1']:
                # Remove port if present
                if ':' in host:
                    parts = host.rsplit(':', 1)
                    if parts[1].isdigit():
                        host = parts[0]
                origin = f"https://{host}"
            else:
                # Last resort: use request URL
                origin = f"{request.url.scheme}://{request.url.netloc}"
        
        redirect_uri = origin
    
    # Ensure no trailing slash for consistency
    redirect_uri = redirect_uri.rstrip('/')
    
    # Generate a cryptographically secure state token for CSRF protection
    state = generate_secure_state()
    
    # Store the state in the database with expiration
    store_oidc_state(db, state, expiration_minutes=15)
    
    # Build authorization URL
    params = {
        'client_id': config.client_id,
        'response_type': 'code',
        'scope': config.scope,
        'redirect_uri': redirect_uri,
        'state': state  # Use the secure state token
    }
    
    auth_url = f"{config.authorization_endpoint}?{urlencode(params)}"
    return {"authorization_url": auth_url}

@router.get("/oidc/callback")
async def oidc_callback(code: str, state: str, request: Request, db: Session = Depends(get_db)):
    """Handle OIDC callback - exchanges authorization code for token"""
    config = crud.get_oidc_config(db)
    if not config.enabled:
        raise HTTPException(status_code=400, detail="OIDC not enabled")
    
    # Validate the state token to prevent CSRF attacks
    if not validate_oidc_state(db, state, delete_after_validation=True):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired state token. Please try logging in again."
        )
    
    # Get redirect URI - must match what was used in the login request and configured in OIDC provider
    if config.redirect_uri:
        redirect_uri = config.redirect_uri
    else:
        # Dynamic detection: Get the correct origin, considering proxies and Cloudflare
        # Priority: origin header > x-forwarded-host > host header
        origin = request.headers.get('origin')
        
        if not origin or origin.startswith('http://localhost'):
            # If origin is localhost or not available, try to construct from headers
            host = request.headers.get('x-forwarded-host') or request.headers.get('host')
            
            if host and host not in ['localhost', '127.0.0.1']:
                # Remove port if present
                if ':' in host:
                    parts = host.rsplit(':', 1)
                    if parts[1].isdigit():
                        host = parts[0]
                origin = f"https://{host}"
            else:
                # Last resort: use request URL
                origin = f"{request.url.scheme}://{request.url.netloc}"
        
        redirect_uri = origin
    
    # Ensure no trailing slash for consistency
    redirect_uri = redirect_uri.rstrip('/')
    
    # Exchange code for token
    try:
        async with AsyncOAuth2Client(
            client_id=config.client_id,
            client_secret=config.client_secret,
            token_endpoint=config.token_endpoint,
        ) as client:
            token = await client.fetch_token(
                url=config.token_endpoint,
                code=code,
                redirect_uri=redirect_uri
            )
            
            # Get user info
            user_info = await client.get(config.userinfo_endpoint)
            user_data = user_info.json()
            
            # Extract user information
            oidc_id = user_data.get('sub')
            email = user_data.get('email')
            name = user_data.get('name', user_data.get('preferred_username', ''))
            username = user_data.get('preferred_username', email.split('@')[0] if email else oidc_id)
            groups = user_data.get('groups', [])
            
            if not oidc_id or not email:
                raise HTTPException(status_code=400, detail="Invalid user data from OIDC provider")
            
            # Check if user exists
            user = crud.get_user_by_oidc_id(db, oidc_id)
            if not user:
                # Check if email already exists
                existing_user = crud.get_user_by_email(db, email)
                if existing_user:
                    # Link existing user to OIDC
                    user = crud.link_existing_user_to_oidc(db, existing_user.id, oidc_id)
                else:
                    # Create new SSO user
                    user = crud.create_sso_user(db, oidc_id, email, name, username, groups)
            
            # Generate token
            access_token = auth.create_access_token(
                data={"sub": str(user.id)},
                expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            
            # Return HTML that stores token and redirects to app
            # This handles the case where OIDC provider redirects directly to this endpoint
            return HTMLResponse(content=f"""
            <html>
              <head>
                <title>Logging in...</title>
                <script>
                  // Store the token in localStorage
                  localStorage.setItem('token', '{access_token}');
                  // Set authorization header for axios
                  document.cookie = 'token={access_token}; path=/';
                  // Redirect to the app
                  window.location.href = '/';
                </script>
              </head>
              <body>
                <p>Logging in... <a href="/">Click here if not redirected</a></p>
              </body>
            </html>
            """)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OIDC token exchange failed: {str(e)}. Redirect URI used: {redirect_uri}")

@router.get("/oidc/logout")
async def oidc_logout(db: Session = Depends(get_db)):
    """Get OIDC logout URL"""
    config = crud.get_oidc_config(db)
    if not config.enabled or not config.logout_endpoint:
        return {"logout_url": None}
    
    return {"logout_url": config.logout_endpoint}

@router.get("/oidc/discover")
async def oidc_discover_endpoints(issuer_url: str):
    """Discover OIDC endpoints from provider's .well-known configuration"""
    import httpx
    
    try:
        # Construct discovery URL
        discovery_url = issuer_url.rstrip('/') + '/.well-known/openid-configuration'
        
        # Make request to discovery endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(discovery_url)
            response.raise_for_status()
            
        config = response.json()
        
        # Return relevant endpoints
        return {
            "success": True,
            "authorization_endpoint": config.get("authorization_endpoint"),
            "token_endpoint": config.get("token_endpoint"),
            "userinfo_endpoint": config.get("userinfo_endpoint"),
            "jwks_uri": config.get("jwks_uri"),
            "end_session_endpoint": config.get("end_session_endpoint")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/2fa/setup")
def setup_2fa(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Generate TOTP secret and QR code for 2FA setup"""
    import pyotp
    import qrcode
    import io
    import base64
    
    # Generate TOTP secret
    secret = pyotp.random_base32()
    
    # Create TOTP object for generating QR code
    totp = pyotp.TOTP(secret)
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(totp.provisioning_uri(name=current_user.email, issuer_name='SecureAuth'))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 PNG
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
    
    # Generate backup codes (10 codes)
    import secrets
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    # Store temporary secret in user object (not yet enabled)
    # We'll use a property to avoid database update until verification
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{img_base64}",
        "backup_codes": backup_codes
    }

@router.post("/2fa/verify")
def verify_2fa_setup(setup_data: schemas.TOTP2FASetup, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Verify TOTP code and enable 2FA"""
    import pyotp
    
    # The client should have the secret from the setup endpoint
    # For this endpoint, we need the secret to be passed or stored temporarily
    # Since we can't store state in a stateless API, we'll expect the setup data to include the secret
    raise HTTPException(status_code=501, detail="Use POST /2fa/enable instead")

@router.post("/2fa/enable")
@limiter.limit(TOTP_VERIFY_RATE_LIMIT)
def enable_2fa(request: Request, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Enable 2FA for user with TOTP secret and verification code"""
    import pyotp
    from cryptography.fernet import Fernet
    
    secret = data.get("secret")
    totp_code = data.get("totp_code")
    
    if not secret or not totp_code:
        raise HTTPException(status_code=400, detail="Missing secret or TOTP code")
    
    # Verify the TOTP code
    totp = pyotp.TOTP(secret)
    if not totp.verify(totp_code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid TOTP code")
    
    # Encrypt the secret before storing
    encrypted_secret = secrets_encryption.encrypt_secret(secret)
    
    # Generate and store backup codes
    backup_codes = crud.create_backup_codes(db, current_user.id)
    
    # Update user with encrypted TOTP secret and enabled flag
    current_user.totp_secret = encrypted_secret
    current_user.totp_enabled = True
    db.commit()
    db.refresh(current_user)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="2fa_enabled",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    # Send security alert email
    from ..utils import send_security_alert_email
    send_security_alert_email(db, current_user.email, '2fa_enabled')
    
    # Create in-app notification
    from ..notifications import InAppNotificationService
    InAppNotificationService.create_notification(
        db,
        user_id=current_user.id,
        notification_type="security_alert",
        title="2FA Enabled",
        message="Two-factor authentication has been successfully enabled on your account. Your account is now more secure.",
        details={
            "ip_address": request.client.host if request.client else None,
            "timestamp": datetime.utcnow().isoformat(),
            "action": "2fa_enabled"
        }
    )
    
    return {
        "success": True,
        "message": "2FA enabled successfully",
        "backup_codes": backup_codes
    }

@router.post("/2fa/disable")
def disable_2fa(disable_data: schemas.TOTP2FADisable, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Disable 2FA for user with password verification"""
    # Verify password
    if not auth.verify_password(disable_data.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # If user has 2FA enabled, verify the TOTP code before disabling
    if current_user.totp_enabled and disable_data.totp_code:
        import pyotp
        
        try:
            decrypted_secret = secrets_encryption.decrypt_secret(current_user.totp_secret)
            totp = pyotp.TOTP(decrypted_secret)
            
            if not totp.verify(disable_data.totp_code, valid_window=1):
                raise HTTPException(status_code=401, detail="Invalid TOTP code")
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to verify 2FA")
    
    # Disable 2FA
    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "message": "2FA disabled successfully"
    }

@router.get("/2fa/status")
def get_2fa_status(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Get current 2FA status for user"""
    return {
        "totp_enabled": current_user.totp_enabled,
        "is_admin": current_user.role == "admin"
    }

@router.post("/login/verify-2fa", response_model=schemas.Token)
@limiter.limit(TOTP_VERIFY_RATE_LIMIT)
def verify_login_2fa(request: Request, data: dict, db: Session = Depends(get_db)):
    """Verify TOTP code and complete login"""
    import pyotp
    from cryptography.fernet import Fernet
    
    totp_code = data.get("totp_code")
    email = data.get("email")
    
    if not totp_code or not email:
        raise HTTPException(status_code=400, detail="Missing TOTP code or email")
    
    # Get user by email
    user = crud.get_user_by_email(db, email)
    if not user or not user.totp_enabled:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    # Decrypt TOTP secret
    try:
        decrypted_secret = secrets_encryption.decrypt_secret(user.totp_secret)
        totp = pyotp.TOTP(decrypted_secret)
        
        if not totp.verify(totp_code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="Failed to verify TOTP code")
    
    # Generate token - sub must be a string
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Create user session for tracking
    try:
        from jose import jwt
        from ..session_utils import parse_user_agent, create_session_fingerprint
        from ..access_restrictions import access_restrictions
        
        payload = jwt.decode(access_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        token_jti = payload.get('jti')
        expires_at = payload.get('exp')
        
        if token_jti and expires_at:
            # Parse device information from user agent
            device_info = parse_user_agent(request.headers.get('user-agent'))
            
            # Get geographic information
            client_ip = request.client.host if request.client else "127.0.0.1"
            country_code = None
            city = None
            
            try:
                geo_info = access_restrictions._get_country_code(client_ip)
                if geo_info:
                    country_code = geo_info
                    # Note: City lookup would require a more advanced geo-IP service
            except:
                pass  # Geo lookup failure shouldn't block login
            
            # Create enhanced session
            session_data = {
                'user_id': user.id,
                'token_jti': token_jti,
                'ip_address': client_ip,
                'country_code': country_code,
                'city': city,
                'user_agent': request.headers.get('user-agent'),
                'device_name': f"{device_info.get('browser_name', 'Browser')} on {device_info.get('os_name', 'Unknown OS')}",
                'device_type': device_info.get('device_type', 'desktop'),
                'browser_name': device_info.get('browser_name'),
                'browser_version': device_info.get('browser_version'),
                'os_name': device_info.get('os_name'),
                'os_version': device_info.get('os_version'),
                'expires_at': datetime.utcfromtimestamp(expires_at),
                'is_current_session': True,  # Mark this as the current session
            }
            
            session = crud.create_enhanced_user_session(**session_data)
            
            # Check for suspicious activity
            all_user_sessions = crud.get_user_sessions(db, user.id, exclude_revoked=False)
            if detect_suspicious_session(session, all_user_sessions):
                session.suspicious_activity = True
                db.commit()
                
                # Log suspicious activity
                crud.create_audit_log(
                    db,
                    user_id=user.id,
                    action="suspicious_login_detected",
                    ip_address=client_ip,
                    status="warning",
                    details={
                        "device_fingerprint": create_session_fingerprint({
                            'user_agent': session.user_agent,
                            'ip_address': session.ip_address,
                            'screen_resolution': getattr(session, 'screen_resolution', ''),
                            'timezone': getattr(session, 'timezone', ''),
                            'language': getattr(session, 'language', ''),
                        }),
                        "device_info": device_info
                    }
                )
    
    except Exception as e:
        # Don't fail login if session creation fails
        print(f"Warning: Failed to create enhanced session: {str(e)}")
    
    return {"access_token": access_token, "token_type": "bearer"}

# Password Reset Endpoints
# ... (rest of the code remains the same)
@router.post("/password-reset")
@limiter.limit("3/minute")  # Rate limit password reset requests
def password_reset_request(request: Request, reset_req: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    """Request a password reset. Sends email with reset link."""
    # Check if user exists (don't reveal if user exists or not for security)
    user = crud.get_user_by_email(db, reset_req.email)
    
    if user and not user.is_sso_user:
        # Only allow password reset for local users
        # Create reset token
        reset_token = crud.create_password_reset_token(db, user.id, expires_in_hours=1)
        
        # Send email
        from ..utils import send_password_reset_email
        from os import getenv
        app_url = getenv("APP_URL", "http://localhost:3000")
        
        success = send_password_reset_email(db, user.email, reset_token, app_url)
        
        if success:
            # Log the action
            crud.create_audit_log(
                db,
                user_id=user.id,
                action="password_reset_requested",
                ip_address=request.client.host if request.client else None,
                status="success"
            )
    
    # Always return success to avoid user enumeration
    return {"message": "If an account exists with this email, a password reset link has been sent"}


@router.post("/password-reset/confirm", response_model=schemas.Token)
@limiter.limit("5/minute")  # Rate limit reset confirmation
def password_reset_confirm(request: Request, reset_confirm: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    """Confirm password reset with token and new password."""
    # Validate token and get user
    user = crud.validate_password_reset_token(db, reset_confirm.token)
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Validate new password against policy
    from ..utils import PasswordPolicy
    password_validation = PasswordPolicy.validate_password(reset_confirm.new_password)
    if not password_validation["valid"]:
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="password_reset_failed",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Password policy violation",
            details={"errors": password_validation["errors"]}
        )
        raise HTTPException(
            status_code=400, 
            detail=f"Password does not meet requirements: {'; '.join(password_validation['errors'])}"
        )
    
    # Check password against breach database
    breach_check = PasswordPolicy.check_password_breach(reset_confirm.new_password)
    if breach_check["breached"] and not breach_check.get("error"):
        # Log the breach but don't block reset - just warn
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="password_reset_breached",
            ip_address=request.client.host if request.client else None,
            status="warning",
            details={"breach_count": breach_check["count"]}
        )
    
    # Check password history (prevent reuse of recent passwords)
    from ..utils import check_password_history
    if not check_password_history(db, user.id, reset_confirm.new_password):
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="password_reset_failed",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Password recently used"
        )
        raise HTTPException(
            status_code=400, 
            detail="Password was recently used. Please choose a different password."
        )
    
    # Complete reset
    updated_user = crud.complete_password_reset(db, reset_confirm.token, reset_confirm.new_password)
    
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to reset password")
    
    # Add new password to history
    from ..utils import add_password_to_history
    add_password_to_history(db, updated_user.id, reset_confirm.new_password)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=updated_user.id,
        action="password_reset_completed",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    # Send security alert email
    from ..utils import send_security_alert_email
    send_security_alert_email(
        db,
        updated_user.email,
        'password_changed',
        {'ip_address': request.client.host if request.client else None}
    )
    
    # Create in-app notification
    from ..notifications import InAppNotificationService
    InAppNotificationService.create_notification(
        db,
        user_id=updated_user.id,
        notification_type="security_alert",
        title="Password Changed",
        message="Your password has been successfully changed. If you didn't make this change, please contact support immediately.",
        details={
            "ip_address": request.client.host if request.client else None,
            "timestamp": datetime.utcnow().isoformat(),
            "action": "password_reset"
        }
    )
    
    # Generate new token for automatic login after reset
    access_token = auth.create_access_token(
        data={"sub": str(updated_user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


# Session Management Endpoints
@router.get("/sessions", response_model=schemas.SessionListResponse)
def get_user_sessions(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active sessions for the current user."""
    sessions = crud.get_user_sessions(db, current_user.id)
    
    # Find current session by checking JWT token
    current_session_id = None
    if hasattr(request.state, 'user') and hasattr(request.state.user, 'token_jti'):
        current_session_id = request.state.user.token_jti
    elif request.headers.get('authorization'):
        # Try to extract JTI from current token
        try:
            from jose import jwt
            token = request.headers.get('authorization').replace('Bearer ', '')
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            current_session_id = payload.get('jti')
        except:
            pass
    
    return schemas.SessionListResponse(
        sessions=sessions,
        current_session_id=current_session_id
    )


@router.delete("/sessions/{session_id}")
def revoke_session(
    request: Request,
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific user session."""
    # Verify the session belongs to the current user
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id,
        models.UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    success = crud.revoke_session(db, session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to revoke session")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="session_revoked",
        resource_type="session",
        resource_id=session_id,
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    # Create in-app notification
    from ..notifications import InAppNotificationService
    InAppNotificationService.create_notification(
        db,
        user_id=current_user.id,
        notification_type="security_alert",
        title="Session Revoked",
        message="One of your active sessions has been terminated.",
        details={
            "session_id": session_id,
            "ip_address": request.client.host if request.client else None,
            "timestamp": datetime.utcnow().isoformat(),
            "action": "session_revoked"
        }
    )
    
    return {"message": "Session revoked successfully"}


@router.post("/logout-all")
def logout_all_sessions(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all user sessions except the current one."""
    # Find current session
    current_session_id = None
    if request.headers.get('authorization'):
        try:
            from jose import jwt
            token = request.headers.get('authorization').replace('Bearer ', '')
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            current_session_id = payload.get('jti')
        except:
            pass
    
    crud.revoke_all_user_sessions(db, current_user.id, exclude_session_id=current_session_id)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="all_sessions_revoked",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {"message": "All other sessions have been logged out"}


# Backup Code Endpoints
@router.post("/2fa/verify-backup-code")
@limiter.limit(TOTP_VERIFY_RATE_LIMIT)
def verify_backup_code(request: Request, data: dict, db: Session = Depends(get_db)):
    """Verify a backup code during 2FA login (unauthenticated)"""
    user_id = data.get("user_id")
    backup_code = data.get("backup_code")
    
    if not user_id or not backup_code:
        raise HTTPException(status_code=400, detail="Missing user ID or backup code")
    
    # Get user
    user = crud.get_user(db, user_id)
    if not user or not user.totp_enabled:
        raise HTTPException(status_code=401, detail="Invalid user or 2FA not enabled")
    
    # Verify backup code
    if crud.use_backup_code(db, user_id, backup_code):
        # Log successful 2FA verification
        crud.create_audit_log(
            db,
            user_id=user_id,
            action="login_success_backup_code",
            ip_address=request.client.host if request.client else None,
            status="success"
        )
        
        # Generate token
        access_token = auth.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    else:
        # Log failed backup code attempt
        crud.create_audit_log(
            db,
            user_id=user_id,
            action="login_failed_backup_code",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Invalid backup code"
        )
        raise HTTPException(status_code=401, detail="Invalid backup code")


@router.get("/2fa/backup-codes-remaining", response_model=dict)
def get_backup_codes_remaining(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Get count of remaining backup codes for current user"""
    remaining = crud.get_unused_backup_codes_count(db, current_user.id)
    return {"remaining_codes": remaining}


@router.post("/2fa/regenerate-backup-codes", response_model=dict)
def regenerate_backup_codes(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Regenerate backup codes (admin/user action)"""
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA not enabled")
    
    # Delete old codes (mark as used or delete)
    db.query(models.BackupCode).filter(models.BackupCode.user_id == current_user.id).delete()
    db.commit()
    
    # Generate new codes
    backup_codes = crud.create_backup_codes(db, current_user.id)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="backup_codes_regenerated",
        status="success"
    )
    
    return {"message": "Backup codes regenerated", "backup_codes": backup_codes}