from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth, utils
from cryptography.fernet import Fernet
import os

key = os.getenv("ENCRYPTION_KEY").encode()
cipher = Fernet(key)

router = APIRouter()

@router.get("/", response_model=list[schemas.Application])
def get_applications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.get_applications(db, current_user.id)

@router.post("/", response_model=schemas.Application)
def create_application(app: schemas.ApplicationCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Auto-detect icon if not provided
    if not app.icon:
        app.icon = utils.get_service_icon(app.name)
    # Auto-detect color if not provided
    if not app.color:
        app.color = utils.get_service_color(app.name)
    return crud.create_application(db, app, current_user.id)

@router.post("/upload-qr")
def upload_qr(file: UploadFile = File(...), name: str = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    try:
        image_bytes = file.file.read()
        
        # Extract QR data first to get both secret and issuer
        qr_data = utils.extract_qr_data(image_bytes)
        secret = utils.extract_secret_from_qr_data(qr_data)
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
            color=color
        )
        return crud.create_application(db, app, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{app_id}/code")
def get_code(app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    decrypted_secret = cipher.decrypt(app.secret.encode()).decode()
    code = utils.generate_totp_code(decrypted_secret)
    return {"code": code}

@router.put("/{app_id}", response_model=schemas.Application)
def update_application(app_id: int, app_update: schemas.ApplicationUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    return crud.update_application(db, app_id, app_update)

@router.delete("/{app_id}")
def delete_application(app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    crud.delete_application(db, app_id)
    return {"message": "Deleted"}