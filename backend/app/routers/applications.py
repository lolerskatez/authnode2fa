from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth, utils, secrets_encryption
from ..rate_limit import limiter, API_RATE_LIMIT, SENSITIVE_API_RATE_LIMIT
import os
import json

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
        print(f"DEBUG: Extracted QR data: {qr_data}")  # Debug log

        qr_info = utils.extract_secret_from_qr_data(qr_data)
        print(f"DEBUG: Extracted QR info: {qr_info}")  # Debug log

        if not qr_info:
            print(f"DEBUG: Failed to extract secret from QR data: {qr_data}")  # Debug log
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
    decrypted_secret = secrets_encryption.decrypt_secret(app.secret)
    
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
    
    # Log code generation for audit trail
    from ..models import CodeGenerationHistory
    history_entry = CodeGenerationHistory(
        application_id=app_id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get('user-agent')
    )
    db.add(history_entry)
    db.commit()
    
    return {"code": code}

@router.get("/{app_id}/history", response_model=list)
@limiter.limit(API_RATE_LIMIT)
def get_code_history(
    request: Request,
    app_id: int,
    limit: int = Query(50, description="Maximum number of history entries to return", ge=1, le=200),
    offset: int = Query(0, description="Number of entries to skip", ge=0),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get code generation history for a specific application"""
    # Verify the application belongs to the current user
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get history entries
    from ..models import CodeGenerationHistory
    history_entries = db.query(CodeGenerationHistory).filter(
        CodeGenerationHistory.application_id == app_id
    ).order_by(
        CodeGenerationHistory.generated_at.desc()
    ).limit(limit).offset(offset).all()
    
    # Convert to response format
    history_response = []
    for entry in history_entries:
        history_response.append({
            "id": entry.id,
            "generated_at": entry.generated_at.isoformat(),
            "ip_address": entry.ip_address,
            "user_agent": entry.user_agent
        })
    
    return history_response

@router.put("/{app_id}", response_model=schemas.Application)
@limiter.limit(API_RATE_LIMIT)
def update_application(request: Request, app_id: int, app_update: schemas.ApplicationUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    return crud.update_application(db, app_id, app_update)

@router.put("/{app_id}/move", response_model=schemas.Application)
@limiter.limit(API_RATE_LIMIT)
def move_application(request: Request, app_id: int, position: int = Query(..., ge=0, description="New position in the list (0-based)"), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Move an application to a new position in the user's account list"""
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    moved_app = crud.move_application(db, current_user.id, app_id, position)
    if not moved_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="account_reordered",
        resource_type="application",
        resource_id=app_id,
        ip_address=request.client.host if request.client else None,
        status="success",
        details={"new_position": position}
    )
    
    return moved_app

@router.delete("/{app_id}")
@limiter.limit(API_RATE_LIMIT)
def delete_application(request: Request, app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    app = crud.get_application(db, app_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404)
    crud.delete_application(db, app_id)
    return {"message": "Deleted"}

@router.delete("/bulk")
@limiter.limit(API_RATE_LIMIT)
def bulk_delete_applications(
    request: Request,
    account_ids: list[int],
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk delete multiple applications"""
    if not account_ids:
        raise HTTPException(status_code=400, detail="No account IDs provided")
    
    if len(account_ids) > 50:  # Limit bulk operations to prevent abuse
        raise HTTPException(status_code=400, detail="Cannot delete more than 50 accounts at once")
    
    # Verify all accounts belong to the current user
    accounts_to_delete = db.query(models.Application).filter(
        models.Application.id.in_(account_ids),
        models.Application.user_id == current_user.id
    ).all()
    
    if len(accounts_to_delete) != len(account_ids):
        raise HTTPException(status_code=400, detail="Some accounts not found or not owned by you")
    
    # Delete the accounts
    deleted_count = 0
    for account in accounts_to_delete:
        db.delete(account)
        deleted_count += 1
        
        # Log individual deletions
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="account_deleted",
            resource_type="application",
            resource_id=account.id,
            ip_address=request.client.host if request.client else None,
            status="success"
        )
    
    db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} accounts",
        "deleted_count": deleted_count
    }

@router.put("/bulk/category")
@limiter.limit(API_RATE_LIMIT)
def bulk_update_category(
    request: Request,
    account_ids: list[int],
    category: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk update category for multiple applications"""
    if not account_ids:
        raise HTTPException(status_code=400, detail="No account IDs provided")
    
    if len(account_ids) > 100:  # Allow larger batches for category updates
        raise HTTPException(status_code=400, detail="Cannot update more than 100 accounts at once")
    
    # Verify all accounts belong to the current user
    accounts_to_update = db.query(models.Application).filter(
        models.Application.id.in_(account_ids),
        models.Application.user_id == current_user.id
    ).all()
    
    if len(accounts_to_update) != len(account_ids):
        raise HTTPException(status_code=400, detail="Some accounts not found or not owned by you")
    
    # Update categories
    updated_count = 0
    for account in accounts_to_update:
        account.category = category
        updated_count += 1
    
    db.commit()
    
    # Log the bulk operation
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="accounts_bulk_category_update",
        ip_address=request.client.host if request.client else None,
        status="success",
        details={
            "updated_count": updated_count,
            "new_category": category,
            "account_ids": account_ids
        }
    )
    
    return {
        "message": f"Successfully updated category for {updated_count} accounts",
        "updated_count": updated_count,
        "new_category": category
    }

@router.put("/bulk/favorite")
@limiter.limit(API_RATE_LIMIT)
def bulk_update_favorite(
    request: Request,
    account_ids: list[int],
    favorite: bool,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk update favorite status for multiple applications"""
    if not account_ids:
        raise HTTPException(status_code=400, detail="No account IDs provided")
    
    if len(account_ids) > 100:  # Allow larger batches for favorite updates
        raise HTTPException(status_code=400, detail="Cannot update more than 100 accounts at once")
    
    # Verify all accounts belong to the current user
    accounts_to_update = db.query(models.Application).filter(
        models.Application.id.in_(account_ids),
        models.Application.user_id == current_user.id
    ).all()
    
    if len(accounts_to_update) != len(account_ids):
        raise HTTPException(status_code=400, detail="Some accounts not found or not owned by you")
    
    # Update favorite status
    updated_count = 0
    for account in accounts_to_update:
        account.favorite = favorite
        updated_count += 1
    
    db.commit()
    
    # Log the bulk operation
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="accounts_bulk_favorite_update",
        ip_address=request.client.host if request.client else None,
        status="success",
        details={
            "updated_count": updated_count,
            "favorite_status": favorite,
            "account_ids": account_ids
        }
    )
    
    return {
        "message": f"Successfully updated favorite status for {updated_count} accounts",
        "updated_count": updated_count,
        "favorite_status": favorite
    }