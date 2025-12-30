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
        password_hash=auth.hash_password(user.password) if user.password else None,
        role=role,
        is_sso_user=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if user.is_sso_user:
        return None  # SSO users cannot login locally
    if not auth.verify_password(password, user.password_hash):
        return None
    return user

def get_applications(db: Session, user_id: int):
    return db.query(models.Application).filter(models.Application.user_id == user_id).order_by(models.Application.display_order).all()

def create_application(db: Session, app: schemas.ApplicationCreate, user_id: int):
    encrypted_secret = cipher.encrypt(app.secret.encode()).decode()
    db_app = models.Application(
        name=app.name,
        secret=encrypted_secret,
        backup_key=app.backup_key,
        otp_type=app.otp_type,
        counter=app.counter,
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

def update_global_settings(db: Session, settings_update):
    """Update global settings"""
    settings = get_global_settings(db)
    if isinstance(settings_update, dict):
        for key, value in settings_update.items():
            if value is not None and hasattr(settings, key):
                setattr(settings, key, value)
    else:
        # Handle schema object
        for key, value in settings_update.dict(exclude_unset=True).items():
            if hasattr(settings, key):
                setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings

def get_oidc_config(db: Session):
    """Get or create OIDC configuration"""
    try:
        config = db.query(models.OIDCConfig).first()
    except Exception as e:
        # If there's an error (like missing column), recreate the table
        if "no such column" in str(e).lower():
            import sqlite3
            conn = db.get_bind().raw_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("ALTER TABLE oidc_config ADD COLUMN post_logout_redirect_uri VARCHAR")
                conn.commit()
                cursor.close()
                config = db.query(models.OIDCConfig).first()
            except sqlite3.OperationalError:
                # If table doesn't exist or other error, just continue
                config = None
        else:
            config = None
    
    if not config:
        config = models.OIDCConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_oidc_config(db: Session, config_update: schemas.OIDCConfigUpdate):
    """Update OIDC configuration"""
    config = get_oidc_config(db)
    for key, value in config_update.dict().items():
        if value is not None:
            setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config

def get_user_by_oidc_id(db: Session, oidc_id: str):
    """Get user by OIDC ID"""
    return db.query(models.User).filter(models.User.oidc_id == oidc_id).first()

def create_sso_user(db: Session, oidc_id: str, email: str, name: str, username: str, groups: list = None):
    """Create a new SSO user"""
    if groups is None:
        groups = []
    
    # Determine role based on groups
    config = get_oidc_config(db)
    role = "user"  # default
    if any(group in config.admin_groups for group in groups):
        role = "admin"
    
    db_user = models.User(
        email=email,
        username=username,
        name=name,
        password_hash=None,  # No password for SSO users
        oidc_id=oidc_id,
        is_sso_user=True,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def link_existing_user_to_oidc(db: Session, user_id: int, oidc_id: str):
    """Link an existing user to OIDC"""
    user = get_user(db, user_id)
    if user:
        user.oidc_id = oidc_id
        user.is_sso_user = True
        db.commit()
        db.refresh(user)
    return user


# Password Reset Functions
def create_password_reset_token(db: Session, user_id: int, expires_in_hours: int = 1):
    """Create a password reset token for a user"""
    from datetime import datetime, timedelta
    
    token = auth.generate_token()
    token_hash = auth.hash_token(token)
    
    reset_token = models.PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
    )
    db.add(reset_token)
    db.commit()
    return token  # Return unhashed token to send to user

def validate_password_reset_token(db: Session, token: str):
    """Validate a password reset token and return the user if valid"""
    from datetime import datetime
    
    token_hash = auth.hash_token(token)
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        return None
    
    return reset_token.user

def complete_password_reset(db: Session, token: str, new_password: str):
    """Complete password reset: hash token, find token, update password"""
    from datetime import datetime
    
    token_hash = auth.hash_token(token)
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        return None
    
    # Update password
    user = reset_token.user
    user.password_hash = auth.hash_password(new_password)
    reset_token.used = True
    reset_token.used_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    return user


# Backup Code Functions
def create_backup_codes(db: Session, user_id: int):
    """Create backup codes for a user"""
    codes = auth.generate_backup_codes(count=10)
    
    for code in codes:
        code_hash = auth.hash_token(code)
        backup_code = models.BackupCode(
            user_id=user_id,
            code_hash=code_hash
        )
        db.add(backup_code)
    
    db.commit()
    return codes

def use_backup_code(db: Session, user_id: int, code: str):
    """Use a backup code (mark as used)"""
    from datetime import datetime
    
    code_hash = auth.hash_token(code)
    backup_code = db.query(models.BackupCode).filter(
        models.BackupCode.user_id == user_id,
        models.BackupCode.code_hash == code_hash,
        models.BackupCode.used == False
    ).first()
    
    if not backup_code:
        return False
    
    backup_code.used = True
    backup_code.used_at = datetime.utcnow()
    db.commit()
    return True

def get_unused_backup_codes_count(db: Session, user_id: int):
    """Get count of unused backup codes"""
    return db.query(models.BackupCode).filter(
        models.BackupCode.user_id == user_id,
        models.BackupCode.used == False
    ).count()


# Session Functions
def create_enhanced_user_session(db: Session, **session_data):
    """Create an enhanced user session with detailed device information"""
    session = models.UserSession(**session_data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def create_user_session(db: Session, user_id: int, token_jti: str, ip_address: str = None, user_agent: str = None, expires_at = None):
    """Create a new user session"""
    session = models.UserSession(
        user_id=user_id,
        token_jti=token_jti,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_user_sessions(db: Session, user_id: int, exclude_revoked: bool = True):
    """Get all sessions for a user"""
    query = db.query(models.UserSession).filter(models.UserSession.user_id == user_id)
    if exclude_revoked:
        query = query.filter(models.UserSession.revoked == False)
    return query.order_by(models.UserSession.created_at.desc()).all()

def revoke_session(db: Session, session_id: int):
    """Revoke a specific session"""
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if session:
        session.revoked = True
        db.commit()
        return True
    return False

def revoke_all_user_sessions(db: Session, user_id: int, exclude_session_id: int = None):
    """Revoke all sessions for a user except optionally one (current session)"""
    query = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.revoked == False
    )
    if exclude_session_id:
        query = query.filter(models.UserSession.id != exclude_session_id)
    query.update({"revoked": True})
    db.commit()

# Audit Log Functions
def create_audit_log(db: Session, user_id: int = None, action: str = None, resource_type: str = None, 
                     resource_id: int = None, ip_address: str = None, user_agent: str = None,
                     status: str = "success", reason: str = None, details: dict = None):
    """Create an audit log entry"""
    audit_log = models.AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        reason=reason,
        details=details
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    # Also log to security monitor for real-time analysis
    try:
        from .security_monitor import log_security_event
        log_security_event(action, user_id, ip_address, details)
    except ImportError:
        # Security monitor not available, continue without it
        pass

    return audit_log

def get_audit_logs(db: Session, user_id: int = None, action: str = None, status: str = None,
                   start_date = None, end_date = None, limit: int = 100, offset: int = 0):
    """Get audit logs with optional filters"""
    from datetime import datetime
    
    query = db.query(models.AuditLog)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if status:
        query = query.filter(models.AuditLog.status == status)
    if start_date:
        query = query.filter(models.AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(models.AuditLog.created_at <= end_date)
    
    return query.order_by(models.AuditLog.created_at.desc()).limit(limit).offset(offset).all()


# Export/Import Functions
def export_applications(db: Session, user_id: int):
    """Export all applications for a user with decrypted secrets"""
    from datetime import datetime
    applications = db.query(models.Application).filter(models.Application.user_id == user_id).all()
    
    exported_apps = []
    for app in applications:
        try:
            decrypted_secret = cipher.decrypt(app.secret.encode()).decode()
            exported_apps.append(schemas.ApplicationExportData(
                name=app.name,
                secret=decrypted_secret,
                otp_type=app.otp_type,
                counter=app.counter,
                icon=app.icon,
                color=app.color,
                category=app.category,
                favorite=app.favorite
            ))
        except Exception as e:
            print(f"Error exporting app {app.id}: {str(e)}")
            continue
    
    return schemas.ExportResponse(
        export_date=datetime.utcnow(),
        account_count=len(exported_apps),
        accounts=exported_apps
    )


def import_applications(db: Session, user_id: int, import_data: schemas.ImportRequest):
    """Import applications for a user, handling conflicts based on strategy"""
    imported = 0
    skipped = 0
    overwritten = 0
    errors = []
    
    existing_apps = {app.name: app for app in db.query(models.Application).filter(models.Application.user_id == user_id).all()}
    
    for app_data in import_data.accounts:
        try:
            # Check if app with same name exists
            if app_data.name in existing_apps:
                if import_data.conflict_action == "skip":
                    skipped += 1
                    continue
                elif import_data.conflict_action == "overwrite":
                    # Update existing app
                    existing_app = existing_apps[app_data.name]
                    encrypted_secret = cipher.encrypt(app_data.secret.encode()).decode()
                    existing_app.secret = encrypted_secret
                    existing_app.icon = app_data.icon or existing_app.icon
                    existing_app.color = app_data.color or existing_app.color
                    existing_app.category = app_data.category or existing_app.category
                    db.add(existing_app)
                    db.commit()
                    overwritten += 1
                    continue
            
            # Create new application
            encrypted_secret = cipher.encrypt(app_data.secret.encode()).decode()
            backup_key = auth.generate_token()
            
            new_app = models.Application(
                user_id=user_id,
                name=app_data.name,
                secret=encrypted_secret,
                backup_key=backup_key,
                otp_type=app_data.otp_type,
                counter=app_data.counter,
                icon=app_data.icon,
                color=app_data.color,
                category=app_data.category or "Personal",
                favorite=app_data.favorite or False
            )
            db.add(new_app)
            db.commit()
            imported += 1
            
        except Exception as e:
            errors.append(f"Error importing '{app_data.name}': {str(e)}")
            continue
    
    return schemas.ImportResponse(
        imported=imported,
        skipped=skipped,
        overwritten=overwritten,
        errors=errors
    )


def search_applications(db: Session, user_id: int, query: str = None, category: str = None, favorite: bool = None):
    """Search and filter applications with optional criteria"""
    search_query = db.query(models.Application).filter(models.Application.user_id == user_id)
    
    if query:
        # Case-insensitive search on name, username, and notes
        search_term = f"%{query}%"
        search_query = search_query.filter(
            (models.Application.name.ilike(search_term)) |
            (models.Application.username.ilike(search_term)) |
            (models.Application.notes.ilike(search_term)) |
            (models.Application.url.ilike(search_term))
        )
    
    if category:
        search_query = search_query.filter(models.Application.category == category)
    
    if favorite is not None:
        search_query = search_query.filter(models.Application.favorite == favorite)
    
    return search_query.order_by(models.Application.display_order).all()

def move_application(db: Session, user_id: int, app_id: int, position: int):
    """Move an application to a new position in the user's list"""
    # Get the application
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.user_id == user_id
    ).first()
    
    if not app:
        return None
    
    # Get all applications for this user, ordered by display_order
    all_apps = db.query(models.Application).filter(
        models.Application.user_id == user_id
    ).order_by(models.Application.display_order).all()
    
    # Find current position
    current_position = next((i for i, a in enumerate(all_apps) if a.id == app_id), None)
    
    if current_position is None:
        return app
    
    # Constrain position to valid range
    position = max(0, min(position, len(all_apps) - 1))
    
    # If position hasn't changed, return
    if current_position == position:
        return app
    
    # Remove app from current position
    all_apps.pop(current_position)
    
    # Insert at new position
    all_apps.insert(position, app)
    
    # Update display_order for all apps
    for idx, a in enumerate(all_apps):
        a.display_order = idx
    
    db.commit()
    db.refresh(app)
    return app