from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
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
def get_smtp_config(
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Get SMTP configuration (admin only)"""
    smtp_config = db.query(models.SMTPConfig).first()
    if not smtp_config:
        # Return default empty config
        return {
            "id": 0,
            "enabled": False,
            "host": "",
            "port": 587,
            "username": "",
            "password": "",
            "from_email": "",
            "from_name": "SecureAuth",
            "created_at": None,
            "updated_at": None
        }
    return smtp_config


@router.post("/smtp", response_model=schemas.SMTPConfig)
def save_smtp_config(
    smtp_data: schemas.SMTPConfigCreate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Save SMTP configuration (admin only)"""
    smtp_config = db.query(models.SMTPConfig).first()
    
    if smtp_config:
        # Update existing
        smtp_config.enabled = smtp_data.enabled  # type: ignore
        smtp_config.host = smtp_data.host  # type: ignore
        smtp_config.port = smtp_data.port  # type: ignore
        smtp_config.username = smtp_data.username  # type: ignore
        smtp_config.password = smtp_data.password  # type: ignore
        smtp_config.from_email = smtp_data.from_email  # type: ignore
        smtp_config.from_name = smtp_data.from_name  # type: ignore
    else:
        # Create new
        smtp_config = models.SMTPConfig(
            enabled=smtp_data.enabled,
            host=smtp_data.host,
            port=smtp_data.port,
            username=smtp_data.username,
            password=smtp_data.password,
            from_email=smtp_data.from_email,
            from_name=smtp_data.from_name
        )
        db.add(smtp_config)
    
    db.commit()
    db.refresh(smtp_config)
    return smtp_config


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
        
        # Send email
        with smtplib.SMTP(smtp_config.host, smtp_config.port) as server:  # type: ignore
            server.starttls()
            server.login(smtp_config.username, smtp_config.password)  # type: ignore
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
    settings_update: schemas.GlobalSettingsCreate,
    current_user: models.User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """Update global settings (admin only)"""
    from .. import crud
    settings = crud.update_global_settings(db, settings_update.login_page_theme)
    return settings