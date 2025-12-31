"""
Synchronization Router

Handles multi-device synchronization endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from ..rate_limit import limiter, API_RATE_LIMIT, SENSITIVE_API_RATE_LIMIT
from ..sync_manager import DeviceSyncManager

router = APIRouter()


@router.post("/devices/register", response_model=dict)
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def register_device(
    request: Request,
    device_data: schemas.SyncDeviceRegister,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new device for synchronization"""
    result = DeviceSyncManager.register_device(
        db,
        user_id=current_user.id,
        device_name=device_data.device_name,
        device_info=device_data.device_info
    )
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="device_registered",
        status="success",
        details={"device_name": device_data.device_name}
    )
    
    return result


@router.get("/devices")
@limiter.limit(API_RATE_LIMIT)
def list_devices(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all registered devices for current user"""
    devices = DeviceSyncManager.get_devices(db, current_user.id)
    return {
        "devices": devices,
        "total": len(devices)
    }


@router.delete("/devices/{device_id}")
@limiter.limit(API_RATE_LIMIT)
def revoke_device(
    request: Request,
    device_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke access for a device"""
    success = DeviceSyncManager.revoke_device(db, device_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="device_revoked",
        status="success",
        details={"device_id": device_id}
    )
    
    return {"success": True, "message": "Device access revoked"}


@router.post("/sync/push/{device_id}")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def push_sync(
    request: Request,
    device_id: int,
    sync_data: schemas.SyncPushRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Push sync data from device"""
    result = DeviceSyncManager.push_sync(
        db,
        user_id=current_user.id,
        device_id=device_id,
        sync_data=sync_data.data
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/sync/pull/{device_id}")
@limiter.limit(API_RATE_LIMIT)
def pull_sync(
    request: Request,
    device_id: int,
    sync_request: schemas.SyncPullRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Pull sync data for device"""
    result = DeviceSyncManager.pull_sync(
        db,
        user_id=current_user.id,
        device_id=device_id,
        last_sync=sync_request.last_sync
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/sync/resolve/{sync_id}")
@limiter.limit(API_RATE_LIMIT)
def resolve_conflict(
    request: Request,
    sync_id: int,
    resolution_data: schemas.ConflictResolution,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a sync conflict"""
    if resolution_data.resolution not in ["keep_local", "keep_remote", "merge"]:
        raise HTTPException(status_code=400, detail="Invalid resolution type")
    
    success = DeviceSyncManager.resolve_conflict(
        db,
        sync_id=sync_id,
        resolution=resolution_data.resolution,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Sync package not found")
    
    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="sync_conflict_resolved",
        status="success",
        details={"sync_id": sync_id, "resolution": resolution_data.resolution}
    )
    
    return {"success": True, "message": "Conflict resolved"}
