from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..rate_limit import limiter, SENSITIVE_API_RATE_LIMIT
from ..smtp_encryption import encrypt_smtp_password, decrypt_smtp_password
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()


def is_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Check if user is admin"""
    if current_user.role != "admin":  # type: ignore
        raise HTTPException(status_code=403, detail="Only admins can access this")
    return current_user


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