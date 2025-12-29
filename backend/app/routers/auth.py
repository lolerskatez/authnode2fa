from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from ..rate_limit import limiter, LOGIN_RATE_LIMIT, SIGNUP_RATE_LIMIT, TOTP_VERIFY_RATE_LIMIT
from ..oidc_state import generate_secure_state, store_oidc_state, validate_oidc_state
from datetime import timedelta
from authlib.integrations.httpx_client import AsyncOAuth2Client
import os
from urllib.parse import urlencode

router = APIRouter()

@router.post("/signup", response_model=schemas.Token)
@limiter.limit(SIGNUP_RATE_LIMIT)
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
    
    # Create new user
    db_user = crud.create_user(db, user)
    
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
@limiter.limit(LOGIN_RATE_LIMIT)
def login(request: Request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Authenticate user
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        # Log failed login attempt
        crud.create_audit_log(
            db,
            action="login_failed",
            ip_address=request.client.host if request.client else None,
            status="failed",
            reason="Invalid credentials"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
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
            ip_address=request.client.host if request.client else None,
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
            ip_address=request.client.host if request.client else None,
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
    
    # Log successful login
    crud.create_audit_log(
        db,
        user_id=user.id,
        action="login_success",
        ip_address=request.client.host if request.client else None,
        status="success"
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
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(status_code=500, detail="Encryption key not configured")
    
    cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    encrypted_secret = cipher.encrypt(secret.encode()).decode()
    
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
        from cryptography.fernet import Fernet
        
        encryption_key = os.getenv("ENCRYPTION_KEY")
        cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        
        try:
            decrypted_secret = cipher.decrypt(current_user.totp_secret.encode()).decode()
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
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(status_code=500, detail="Encryption key not configured")
    
    cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    
    try:
        decrypted_secret = cipher.decrypt(user.totp_secret.encode()).decode()
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
    
    return {"access_token": access_token, "token_type": "bearer"}


# Password Reset Endpoints
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
    
    # Check password requirements (at least 8 chars)
    if len(reset_confirm.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Complete reset
    updated_user = crud.complete_password_reset(db, reset_confirm.token, reset_confirm.new_password)
    
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to reset password")
    
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
    
    # Generate new token for automatic login after reset
    access_token = auth.create_access_token(
        data={"sub": str(updated_user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

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