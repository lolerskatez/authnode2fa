from sqlalchemy.orm import Session
from . import models, schemas, auth
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("ENCRYPTION_KEY")
cipher = Fernet(key.encode() if isinstance(key, str) else key)

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    # Check if this is the first user (make them admin)
    user_count = db.query(models.User).count()
    role = "admin" if user_count == 0 else "user"
    
    db_user = models.User(
        email=user.email,
        username=user.username,
        name=user.name,
        password_hash=auth.hash_password(user.password),
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not auth.verify_password(password, user.password_hash):
        return None
    return user

def get_applications(db: Session, user_id: int):
    return db.query(models.Application).filter(models.Application.user_id == user_id).all()

def create_application(db: Session, app: schemas.ApplicationCreate, user_id: int):
    encrypted_secret = cipher.encrypt(app.secret.encode()).decode()
    db_app = models.Application(
        name=app.name,
        secret=encrypted_secret,
        backup_key=app.backup_key,
        icon=app.icon,
        color=app.color,
        category=app.category,
        favorite=app.favorite,
        user_id=user_id
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

def get_application(db: Session, app_id: int):
    return db.query(models.Application).filter(models.Application.id == app_id).first()

def update_application(db: Session, app_id: int, app: schemas.ApplicationUpdate):
    db_app = get_application(db, app_id)
    if db_app:
        for key, value in app.dict().items():
            if key == "secret" and value:
                value = cipher.encrypt(value.encode()).decode()
            if value is not None:
                setattr(db_app, key, value)
        db.commit()
        db.refresh(db_app)
    return db_app

def delete_application(db: Session, app_id: int):
    db_app = get_application(db, app_id)
    if db_app:
        db.delete(db_app)
        db.commit()
    return db_app

def get_global_settings(db: Session):
    """Get or create global settings"""
    settings = db.query(models.GlobalSettings).first()
    if not settings:
        settings = models.GlobalSettings(login_page_theme="light")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_global_settings(db: Session, login_page_theme: str):
    """Update global settings"""
    settings = get_global_settings(db)
    settings.login_page_theme = login_page_theme
    db.commit()
    db.refresh(settings)
    return settings