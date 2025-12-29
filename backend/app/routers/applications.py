from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth, utils
from ..rate_limit import limiter, API_RATE_LIMIT, SENSITIVE_API_RATE_LIMIT
from cryptography.fernet import Fernet
import os
import json

key = os.getenv("ENCRYPTION_KEY").encode()
cipher = Fernet(key)

router = APIRouter()

@router.get("/", response_model=list[schemas.Application])
@limiter.limit(API_RATE_LIMIT)
def get_applications(
    request: Request, 
    q: str = Query(None, description="Search by application name"),
    category: str = Query(None, description="Filter by category"),
    favorite: bool = Query(None, description="Filter by favorite status"),
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Get applications with optional search and filtering"""
    if q or category is not None or favorite is not None:
        return crud.search_applications(db, current_user.id, query=q, category=category, favorite=favorite)
    return crud.get_applications(db, current_user.id)

@router.post("/", response_model=schemas.Application)
@limiter.limit(API_RATE_LIMIT)
def create_application(request: Request, app: schemas.ApplicationCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Auto-detect icon if not provided
    if not app.icon:
        app.icon = utils.get_service_icon(app.name)
    # Auto-detect color if not provided
    if not app.color:
        app.color = utils.get_service_color(app.name)
    return crud.create_application(db, app, current_user.id)

@router.post("/upload-qr")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def upload_qr(request: Request, file: UploadFile = File(...), name: str = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    try:
        image_bytes = file.file.read()
        
        # Extract QR data with OTP type and counter
        qr_data = utils.extract_qr_data(image_bytes)
        qr_info = utils.extract_secret_from_qr_data(qr_data)
        if not qr_info:
            raise ValueError("Could not extract secret from QR code")
        
        secret = qr_info["secret"]
        otp_type = qr_info["otp_type"]
        counter = qr_info["counter"]
        
        issuer = utils.extract_issuer_from_qr_data(qr_data)
        
        # Determine service name for icon
        service_name = name or issuer or "Unknown Service"
        icon = utils.get_service_icon(service_name)
        color = utils.get_service_color(service_name)
        
        backup_key = utils.generate_backup_key()
        app = schemas.ApplicationCreate(
            name=service_name, 
            secret=secret, 
            backup_key=backup_key,
            icon=icon,
            color=color,
            otp_type=otp_type,
            counter=counter
        )
        return crud.create_application(db, app, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/export", response_model=schemas.ExportResponse)
@limiter.limit(API_RATE_LIMIT)
def export_applications(request: Request, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Export all applications as JSON with decrypted secrets"""
    try:
        export_data = crud.export_applications(db, current_user.id)
        # Log the export action
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="applications_exported",
            status="success",
            details={"account_count": export_data.account_count}
        )
        return export_data
    except Exception as e:
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="applications_export_failed",
            status="failed",
            reason=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/import", response_model=schemas.ImportResponse)
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def import_applications(
    request: Request, 
    import_data: schemas.ImportRequest,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Import applications from export file"""
    try:
        result = crud.import_applications(db, current_user.id, import_data)
        
        # Log the import action
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="applications_imported",
            status="success",
            details={
                "imported": result.imported,
                "skipped": result.skipped,
                "overwritten": result.overwritten,
                "errors": len(result.errors)
            }
        )
        return result
    except Exception as e:
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="applications_import_failed",
            status="failed",
            reason=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.get("/{app_id}/code")
@limiter.limit(API_RATE_LIMIT)
def get_code(request: Request, app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    decrypted_secret = cipher.decrypt(app.secret.encode()).decode()
    
    # Generate code based on OTP type
    if app.otp_type == "HOTP":
        # Increment counter and generate code
        code = utils.generate_totp_code(decrypted_secret, app.otp_type, app.counter)
        # Update counter in database for HOTP
        app.counter += 1
        db.commit()
    else:
        # TOTP
        code = utils.generate_totp_code(decrypted_secret, app.otp_type, app.counter)
    
    return {"code": code}

@router.put("/{app_id}", response_model=schemas.Application)
@limiter.limit(API_RATE_LIMIT)
def update_application(request: Request, app_id: int, app_update: schemas.ApplicationUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    return crud.update_application(db, app_id, app_update)

@router.delete("/{app_id}")
@limiter.limit(API_RATE_LIMIT)
def delete_application(request: Request, app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    crud.delete_application(db, app_id)
    return {"message": "Deleted"}