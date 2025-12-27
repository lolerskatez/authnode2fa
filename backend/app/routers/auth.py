from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from datetime import timedelta
from authlib.integrations.httpx_client import AsyncOAuth2Client
import os
from urllib.parse import urlencode

router = APIRouter()

@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    db_user = crud.create_user(db, user)
    
    # Generate token - sub must be a string
    access_token = auth.create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Authenticate user
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token - sub must be a string
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
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
    
    # Always use https://{host} for redirect_uri (Cloudflare sets Host header)
    host = request.headers.get('host')
    if host and host not in ['localhost', '127.0.0.1']:
        # Remove port if present
        if ':' in host:
            parts = host.rsplit(':', 1)
            if parts[1].isdigit():
                host = parts[0]
        origin = f"https://{host}"
    else:
        origin = request.headers.get('origin') or f"{request.url.scheme}://{request.url.netloc}"
    # Build dynamic redirect URI based on the current domain
    redirect_uri = f"{origin}/api/auth/oidc/callback"
    
    # Build authorization URL
    params = {
        'client_id': config.client_id,
        'response_type': 'code',
        'scope': config.scope,
        'redirect_uri': redirect_uri,
        'state': 'random_state'  # In production, use proper state management
    }
    
    auth_url = f"{config.authorization_endpoint}?{urlencode(params)}"
    return {"authorization_url": auth_url}

@router.post("/oidc/callback")
async def oidc_callback(code: str, state: str, request: Request, db: Session = Depends(get_db)):
    """Handle OIDC callback"""
    config = crud.get_oidc_config(db)
    if not config.enabled:
        raise HTTPException(status_code=400, detail="OIDC not enabled")
    
    # Always use https://{host} for redirect_uri (Cloudflare sets Host header)
    host = request.headers.get('host')
    if host and host not in ['localhost', '127.0.0.1']:
        # Remove port if present
        if ':' in host:
            parts = host.rsplit(':', 1)
            if parts[1].isdigit():
                host = parts[0]
        origin = f"https://{host}"
    else:
        origin = request.headers.get('origin') or f"{request.url.scheme}://{request.url.netloc}"
    # Build dynamic redirect URI to match the login request
    redirect_uri = f"{origin}/api/auth/oidc/callback"
    
    # Exchange code for token
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
        
        return {"access_token": access_token, "token_type": "bearer"}

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
