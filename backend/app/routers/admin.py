from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_current_user
from ..rate_limit import limiter, SENSITIVE_API_RATE_LIMIT
from ..smtp_encryption import encrypt_smtp_password, decrypt_smtp_password
from ..backup import backup_manager
from ..api_key_manager import APIKeyManager
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

router = APIRouter()


def is_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Check if user is admin"""
    if current_user.role != "admin":  # type: ignore
        raise HTTPException(status_code=403, detail="Only admins can access this")
    return current_user


@router.get("/users", response_model=list[schemas.User])
def get_users(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get list of all users (admin only)"""
    users = db.query(models.User).all()
    return users


@router.get("/smtp")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def get_smtp_config(
    request: Request,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get SMTP configuration (admin only)"""
    try:
        smtp_config = db.query(models.SMTPConfig).first()
        if not smtp_config:
            # Return default empty config as a dict that matches the schema
            return schemas.SMTPConfig(
                id=0,
                enabled=False,
                host="",
                port=587,
                username="",
                password="",
                from_email="",
                from_name="SecureAuth",
                created_at=None,
                updated_at=None
            )
        
        # Decrypt the password for display (frontend will re-encrypt on save)
        decrypted_config = schemas.SMTPConfig(
            id=smtp_config.id,
            enabled=smtp_config.enabled,
            host=smtp_config.host,
            port=smtp_config.port,
            username=smtp_config.username,
            password=decrypt_smtp_password(smtp_config.password) if smtp_config.password else "",
            from_email=smtp_config.from_email,
            from_name=smtp_config.from_name,
            created_at=smtp_config.created_at,
            updated_at=smtp_config.updated_at
        )
        return decrypted_config
    except Exception as e:
        print(f"[ERROR] Error getting SMTP config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting SMTP config: {str(e)}")


@router.post("/smtp", response_model=schemas.SMTPConfig)
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def save_smtp_config(
    request: Request,
    smtp_data: schemas.SMTPConfigCreate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Save SMTP configuration (admin only)"""
    # Encrypt the password before storing
    encrypted_password = ""
    if smtp_data.password:
        try:
            encrypted_password = encrypt_smtp_password(smtp_data.password)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=f"Failed to encrypt SMTP password: {str(e)}")
    
    smtp_config = db.query(models.SMTPConfig).first()
    
    if smtp_config:
        # Update existing
        smtp_config.enabled = smtp_data.enabled  # type: ignore
        smtp_config.host = smtp_data.host  # type: ignore
        smtp_config.port = smtp_data.port  # type: ignore
        smtp_config.username = smtp_data.username  # type: ignore
        smtp_config.password = encrypted_password  # type: ignore
        smtp_config.from_email = smtp_data.from_email  # type: ignore
        smtp_config.from_name = smtp_data.from_name  # type: ignore
    else:
        # Create new
        smtp_config = models.SMTPConfig(
            enabled=smtp_data.enabled,
            host=smtp_data.host,
            port=smtp_data.port,
            username=smtp_data.username,
            password=encrypted_password,
            from_email=smtp_data.from_email,
            from_name=smtp_data.from_name
        )
        db.add(smtp_config)
    
    db.commit()
    db.refresh(smtp_config)
    
    # Return the config with decrypted password for the response
    return schemas.SMTPConfig(
        id=smtp_config.id,
        enabled=smtp_config.enabled,
        host=smtp_config.host,
        port=smtp_config.port,
        username=smtp_config.username,
        password=decrypt_smtp_password(smtp_config.password) if smtp_config.password else "",
        from_email=smtp_config.from_email,
        from_name=smtp_config.from_name,
        created_at=smtp_config.created_at,
        updated_at=smtp_config.updated_at
    )


@router.post("/smtp/test")
def test_smtp(
    test_data: dict,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Test SMTP configuration by sending a test email (admin only)"""
    test_email = test_data.get("test_email")
    if not test_email:
        raise HTTPException(status_code=400, detail="test_email is required")
    
    smtp_config = db.query(models.SMTPConfig).first()
    
    if not smtp_config or not smtp_config.enabled:  # type: ignore
        raise HTTPException(status_code=400, detail="SMTP is not configured or enabled")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg["From"] = f"{smtp_config.from_name} <{smtp_config.from_email}>"
        msg["To"] = test_email
        msg["Subject"] = "SecureAuth SMTP Test Email"
        
        body = """
This is a test email from SecureAuth.

If you received this email, your SMTP configuration is working correctly!

---
SecureAuth 2FA Manager
        """
        
        msg.attach(MIMEText(body, "plain"))
        
        # Decrypt the password before using it
        decrypted_password = decrypt_smtp_password(smtp_config.password) if smtp_config.password else ""  # type: ignore
        
        # Send email
        with smtplib.SMTP(smtp_config.host, smtp_config.port) as server:  # type: ignore
            server.starttls()
            server.login(smtp_config.username, decrypted_password)  # type: ignore
            server.send_message(msg)
        
        return {"success": True, "message": "Test email sent successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

@router.get("/settings", response_model=schemas.GlobalSettings)
def get_global_settings(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get global settings (admin only)"""
    from .. import crud
    settings = crud.get_global_settings(db)
    return settings


@router.put("/settings", response_model=schemas.GlobalSettings)
def update_global_settings(
    settings_update: schemas.GlobalSettingsUpdate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Update global settings (admin only)"""
    from .. import crud
    settings = crud.update_global_settings(db, settings_update)
    return settings

@router.get("/oidc", response_model=schemas.OIDCConfig)
def get_oidc_config(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get OIDC configuration (admin only)"""
    from .. import crud
    config = crud.get_oidc_config(db)
    return config

@router.put("/oidc", response_model=schemas.OIDCConfig)
def update_oidc_config(
    config_update: schemas.OIDCConfigUpdate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Update OIDC configuration (admin only)"""
    from .. import crud
    config = crud.update_oidc_config(db, config_update)
    return config


# Audit Log Endpoints
@router.post("/unlock-account/{user_id}")
def unlock_user_account(
    user_id: int,
    request: Request,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Unlock a locked user account (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.locked_until or user.locked_until <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Account is not currently locked")
    
    # Unlock the account
    user.locked_until = None
    user.failed_login_attempts = 0  # Reset failed attempts
    user.last_failed_login = None
    db.commit()
    db.refresh(user)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=user_id,
        action="account_unlocked",
        resource_type="user",
        resource_id=user_id,
        ip_address=request.client.host if request.client else None,
        status="success",
        details={"unlocked_by": current_user.id}
    )
    
    return {"message": f"Account for user {user.email} has been unlocked"}


@router.get("/locked-accounts")
def get_locked_accounts(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get list of all locked accounts (admin only)"""
    locked_users = db.query(
        models.User.id,
        models.User.email,
        models.User.locked_until,
        models.User.failed_login_attempts,
        models.User.last_failed_login
    ).filter(
        models.User.locked_until != None,
        models.User.locked_until > datetime.utcnow()
    ).all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "locked_until": user.locked_until.isoformat(),
            "failed_login_attempts": user.failed_login_attempts,
            "last_failed_login": user.last_failed_login.isoformat() if user.last_failed_login else None
        }
        for user in locked_users
    ]


@router.get("/audit-logs", response_model=list[schemas.AuditLogResponse])
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def get_audit_logs(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    user_id: int = None,
    action: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs with optional filtering (admin only)"""
    from .. import crud
    
    # Validate limit and offset
    if limit > 1000:
        limit = 1000
    if offset < 0:
        offset = 0
    
    # Parse dates if provided
    start_datetime = None
    end_datetime = None
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    # Get audit logs with filters
    audit_logs = crud.get_audit_logs(
        db=db,
        user_id=user_id,
        action=action,
        status=status,
        start_date=start_datetime,
        end_date=end_datetime,
        limit=limit,
        offset=offset
    )
    
    return audit_logs


@router.get("/audit-logs/user/{user_id}", response_model=list[schemas.AuditLogResponse])
def get_user_audit_logs(
    request: Request,
    user_id: int,
    limit: int = 100,
    offset: int = 0,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs for a specific user (admin only)"""
    from .. import crud
    
    # Verify user exists
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate limit and offset
    if limit > 1000:
        limit = 1000
    if offset < 0:
        offset = 0
    
    # Get audit logs
    logs = crud.get_audit_logs(db, user_id=user_id, limit=limit, offset=offset)
    
    return logs


@router.get("/activity", response_model=list[schemas.AuditLogResponse])
def get_all_activity(
    limit: int = 50,
    offset: int = 0,
    action: str = None,
    status: str = None,
    user_id: int = None,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get all users' activity log (admin only)"""
    # Validate limit and offset
    if limit > 500:
        limit = 500
    if offset < 0:
        offset = 0
    
    # Get audit logs with filters
    logs = crud.get_audit_logs(
        db, 
        user_id=user_id,
        action=action,
        status=status,
        limit=limit, 
        offset=offset
    )
    
    return logs


@router.get("/dashboard/stats", response_model=dict)
def get_dashboard_stats(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics (admin only)"""
    from .. import crud
    
    # Count total users
    total_users = db.query(models.User).count()
    
    # Count active users (created or used in last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_users = db.query(models.User).filter(
        models.User.created_at >= seven_days_ago
    ).count()
    
    # Count total 2FA accounts
    total_accounts = db.query(models.Application).count()
    
    # Count users with 2FA enabled
    users_with_2fa = db.query(models.User).filter(
        models.User.totp_enabled == True
    ).count()
    
    # Get recent activity (last 7 days)
    recent_logins = db.query(models.AuditLog).filter(
        models.AuditLog.action == "login_success",
        models.AuditLog.created_at >= seven_days_ago
    ).count()
    
    recent_failed_logins = db.query(models.AuditLog).filter(
        models.AuditLog.action == "login_failed",
        models.AuditLog.created_at >= seven_days_ago
    ).count()
    
    # Top 5 active users (by login count in last 7 days)
    top_users = db.query(
        models.User.email,
        models.AuditLog.user_id,
        func.count(models.AuditLog.id).label('login_count')
    ).join(
        models.AuditLog,
        models.User.id == models.AuditLog.user_id
    ).filter(
        models.AuditLog.action == "login_success",
        models.AuditLog.created_at >= seven_days_ago
    ).group_by(models.User.email, models.AuditLog.user_id).order_by(
        func.count(models.AuditLog.id).desc()
    ).limit(5).all()
    
    # Account distribution by category
    category_distribution = db.query(
        models.Application.category,
        func.count(models.Application.id).label('count')
    ).group_by(
        models.Application.category
    ).all()
    
    # Security alerts - locked accounts
    locked_accounts = db.query(models.User).filter(
        models.User.locked_until != None,
        models.User.locked_until > datetime.utcnow()
    ).count()
    
    # Recent activity (last 10 events)
    try:
        recent_events = db.query(
            models.AuditLog.action,
            models.AuditLog.created_at,
            models.User.email,
            models.AuditLog.status
        ).join(
            models.User,
            models.AuditLog.user_id == models.User.id
        ).order_by(
            models.AuditLog.created_at.desc()
        ).limit(10).all()
    except Exception as e:
        print(f"[ERROR] Error fetching recent events: {str(e)}")
        recent_events = []
    
    # Login trend (last 7 days by day)
    try:
        login_trend = db.query(
            func.date(models.AuditLog.created_at).label('date'),
            func.count(models.AuditLog.id).label('count')
        ).filter(
            models.AuditLog.action == "login_success",
            models.AuditLog.created_at >= seven_days_ago
        ).group_by(
            func.date(models.AuditLog.created_at)
        ).order_by(
            func.date(models.AuditLog.created_at)
        ).all()
    except Exception as e:
        print(f"[ERROR] Error fetching login trend: {str(e)}")
        login_trend = []
    
    # Calculate 2FA coverage percentage
    two_fa_coverage = (users_with_2fa / total_users * 100) if total_users > 0 else 0
    
    # Get locked accounts details
    locked_accounts_details = db.query(
        models.User.id,
        models.User.email,
        models.User.locked_until,
        models.User.failed_login_attempts,
        models.User.last_failed_login
    ).filter(
        models.User.locked_until != None,
        models.User.locked_until > datetime.utcnow()
    ).all()
    
    response_data = {
        "total_users": total_users,
        "active_users_7d": active_users,
        "total_accounts": total_accounts,
        "users_with_2fa": users_with_2fa,
        "two_fa_coverage_percent": round(two_fa_coverage, 1),
        "recent_logins_7d": recent_logins,
        "recent_failed_logins_7d": recent_failed_logins,
        "locked_accounts": locked_accounts,
        "locked_accounts_details": [
            {
                "id": user.id,
                "email": user.email,
                "locked_until": user.locked_until.isoformat(),
                "failed_login_attempts": user.failed_login_attempts,
                "last_failed_login": user.last_failed_login.isoformat() if user.last_failed_login else None
            }
            for user in locked_accounts_details
        ],
        "top_active_users": [
            {"email": email, "login_count": login_count} 
            for email, _, login_count in top_users
        ],
        "account_distribution_by_category": [
            {"category": category, "count": count} 
            for category, count in category_distribution
        ],
        "recent_events": [
            {
                "action": action,
                "email": email,
                "status": status,
                "created_at": created_at.isoformat()
            }
            for action, created_at, email, status in recent_events
        ],
        "login_trend": [
            {"date": str(date), "count": count}
            for date, count in login_trend
        ]
    }
    
    # Log response for debugging
    print(f"[DEBUG] Dashboard stats response: {response_data}")
    
    return response_data


# Backup Management Endpoints

@router.post("/backups/create")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def create_backup_manual(
    request: Request,
    description: str = None,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Create a manual backup (admin only)"""
    result = backup_manager.create_backup(backup_type="manual", description=description)
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create backup")
    
    # Log the backup action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="backup_created",
        status="success",
        details={"backup_id": result["id"], "size_mb": result["size_mb"]}
    )
    
    return result


@router.get("/backups")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def list_backups(
    request: Request,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """List all available backups (admin only)"""
    backups = backup_manager.get_backups()
    return {
        "backups": backups,
        "total": len(backups),
        "max_retention": backup_manager.max_backups
    }


@router.post("/backups/{backup_id}/restore")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def restore_backup(
    request: Request,
    backup_id: str,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Restore database from backup (admin only)"""
    # This is dangerous - require explicit confirmation
    result = backup_manager.restore_backup(backup_id)
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to restore backup")
    
    # Log the restore action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="backup_restored",
        status="success",
        details={"backup_id": backup_id}
    )
    
    return {"success": True, "message": f"Database restored from backup {backup_id}"}


@router.delete("/backups/{backup_id}")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def delete_backup(
    request: Request,
    backup_id: str,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Delete a backup (admin only)"""
    result = backup_manager.delete_backup(backup_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Log the delete action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="backup_deleted",
        status="success",
        details={"backup_id": backup_id}
    )
    
    return {"success": True, "message": f"Backup {backup_id} deleted"}

# API Key Management Endpoints

@router.post("/api-keys")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def create_api_key(
    request: Request,
    key_data: schemas.APIKeyCreate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Create a new API key (admin only)"""
    result = APIKeyManager.create_api_key(
        db,
        user_id=current_user.id,
        name=key_data.name,
        expires_in_days=key_data.expires_in_days,
        scopes=key_data.scopes
    )
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="api_key_created",
        status="success",
        details={"key_name": key_data.name}
    )
    
    return result


@router.get("/api-keys")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def list_api_keys(
    request: Request,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """List all API keys for admin (admin only)"""
    keys = APIKeyManager.get_api_keys(db, current_user.id)
    return {
        "keys": [
            {
                "id": key.id,
                "name": key.name,
                "scopes": key.scopes,
                "created_at": key.created_at.isoformat(),
                "expires_at": key.expires_at.isoformat() if key.expires_at else None,
                "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
                "revoked": key.revoked
            }
            for key in keys
        ],
        "total": len(keys)
    }


@router.post("/api-keys/{key_id}/revoke")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def revoke_api_key(
    request: Request,
    key_id: int,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Revoke an API key (admin only)"""
    success = APIKeyManager.revoke_api_key(db, key_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="api_key_revoked",
        status="success",
        details={"key_id": key_id}
    )
    
    return {"success": True, "message": "API key revoked"}


@router.delete("/api-keys/{key_id}")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def delete_api_key(
    request: Request,
    key_id: int,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Delete an API key (admin only)"""
    success = APIKeyManager.delete_api_key(db, key_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="api_key_deleted",
        status="success",
        details={"key_id": key_id}
    )
    
    return {"success": True, "message": "API key deleted"}


# Password Policy Endpoints

@router.get("/password-policy")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def get_password_policy_endpoint(
    request: Request,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get current password policy (admin only)"""
    policy = crud.get_password_policy(db)
    return {
        "id": policy.id,
        "min_length": policy.min_length,
        "max_length": policy.max_length,
        "require_uppercase": policy.require_uppercase,
        "require_lowercase": policy.require_lowercase,
        "require_numbers": policy.require_numbers,
        "require_special_chars": policy.require_special_chars,
        "special_chars": policy.special_chars,
        "password_expiry_days": policy.password_expiry_days,
        "password_history_count": policy.password_history_count,
        "max_login_attempts": policy.max_login_attempts,
        "lockout_duration_minutes": policy.lockout_duration_minutes,
        "check_breach_database": policy.check_breach_database,
        "created_at": policy.created_at.isoformat(),
        "updated_at": policy.updated_at.isoformat()
    }


@router.put("/password-policy")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def update_password_policy_endpoint(
    request: Request,
    policy_data: schemas.PasswordPolicyUpdate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Update password policy (admin only)"""
    policy_dict = policy_data.dict(exclude_unset=True)
    policy = crud.update_password_policy(db, policy_dict)
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="password_policy_updated",
        status="success",
        details=policy_dict
    )
    
    return {
        "success": True,
        "message": "Password policy updated",
        "policy": {
            "min_length": policy.min_length,
            "max_length": policy.max_length,
            "require_uppercase": policy.require_uppercase,
            "require_lowercase": policy.require_lowercase,
            "require_numbers": policy.require_numbers,
            "require_special_chars": policy.require_special_chars,
            "password_expiry_days": policy.password_expiry_days,
            "password_history_count": policy.password_history_count,
            "max_login_attempts": policy.max_login_attempts,
            "lockout_duration_minutes": policy.lockout_duration_minutes,
            "check_breach_database": policy.check_breach_database
        }
    }


# Bulk User Import Endpoints

@router.post("/users/import")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def import_users_bulk(
    request: Request,
    import_data: schemas.BulkUserImportRequest,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Import multiple users at once (admin only)"""
    
    # Validate data
    if not import_data.users or len(import_data.users) == 0:
        raise HTTPException(status_code=400, detail="No users provided")
    
    if len(import_data.users) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 users per import")
    
    # Perform bulk import
    result = crud.bulk_import_users(
        db,
        import_data.users,
        default_role=import_data.role
    )
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="bulk_user_import",
        status="success",
        details={
            "total": result["total"],
            "created": result["created"],
            "skipped": result["skipped"],
            "error_count": len(result["errors"])
        }
    )
    
    return result


# Audit Export Endpoints

@router.get("/audit-logs/export")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def export_audit_logs_csv(
    request: Request,
    limit: int = 10000,
    offset: int = 0,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Export audit logs as CSV (admin only)"""
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    # Get audit logs
    logs = db.query(models.AuditLog).order_by(
        models.AuditLog.created_at.desc()
    ).limit(limit).offset(offset).all()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "ID", "User ID", "User Email", "Action", "Resource Type", "Resource ID",
        "IP Address", "Status", "Reason", "Created At", "Details"
    ])
    
    # Write rows
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first() if log.user_id else None
        writer.writerow([
            log.id,
            log.user_id,
            user.email if user else "",
            log.action,
            log.resource_type or "",
            log.resource_id or "",
            log.ip_address or "",
            log.status,
            log.reason or "",
            log.created_at.isoformat(),
            str(log.details or "")
        ])
    
    # Log the export
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="audit_logs_exported",
        status="success",
        details={"record_count": len(logs)}
    )
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
    )