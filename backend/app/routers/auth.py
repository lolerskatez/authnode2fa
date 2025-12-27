from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from datetime import timedelta

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
