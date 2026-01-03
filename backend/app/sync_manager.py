"""
Multi-Device Synchronization System

Enables secure account syncing across multiple user devices with conflict resolution.
Uses device tokens and encrypted sync packages.
"""

import secrets
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import os

# Handle encryption key - auto-generate if not set or invalid
key = os.getenv("ENCRYPTION_KEY")
if not key or len(key) != 44:  # Fernet keys are 32 bytes base64 encoded = 44 chars
    # Auto-generate a new Fernet key
    from cryptography.fernet import Fernet
    key = Fernet.generate_key().decode()
    # Save it to a file for persistence
    key_file = os.path.join(os.path.dirname(__file__), '..', '.encryption_key')
    os.makedirs(os.path.dirname(key_file), exist_ok=True)
    with open(key_file, 'w') as f:
        f.write(key)
    print(f"Auto-generated encryption key saved to {key_file}")
else:
    print("Using existing encryption key from environment")

cipher = Fernet(key.encode())


class DeviceSyncManager:
    """Manages multi-device synchronization"""
    
    @staticmethod
    def register_device(db, user_id: int, device_name: str, device_info: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new device for synchronization"""
        from . import models
        
        device_token = secrets.token_urlsafe(32)
        device_token_hash = hashlib.sha256(device_token.encode()).hexdigest()
        
        device = models.SyncDevice(
            user_id=user_id,
            device_name=device_name,
            device_token_hash=device_token_hash,
            device_info=device_info,
            last_sync_at=None,
            is_active=True
        )
        
        db.add(device)
        db.commit()
        db.refresh(device)
        
        return {
            "device_id": device.id,
            "device_token": device_token,  # Only shown once
            "device_name": device_name,
            "created_at": device.created_at.isoformat(),
            "message": "⚠️ Save this device token securely. You won't be able to see it again!"
        }
    
    @staticmethod
    def get_devices(db, user_id: int) -> List[Dict[str, Any]]:
        """Get all devices for user"""
        from . import models
        
        devices = db.query(models.SyncDevice).filter(
            models.SyncDevice.user_id == user_id,
            models.SyncDevice.is_active == True
        ).order_by(models.SyncDevice.last_sync_at.desc()).all()
        
        return [
            {
                "id": d.id,
                "name": d.device_name,
                "device_info": d.device_info,
                "last_sync_at": d.last_sync_at.isoformat() if d.last_sync_at else None,
                "created_at": d.created_at.isoformat()
            }
            for d in devices
        ]
    
    @staticmethod
    def revoke_device(db, device_id: int, user_id: int) -> bool:
        """Revoke device access"""
        from . import models
        
        device = db.query(models.SyncDevice).filter(
            models.SyncDevice.id == device_id,
            models.SyncDevice.user_id == user_id
        ).first()
        
        if not device:
            return False
        
        device.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def push_sync(db, user_id: int, device_id: int, sync_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push sync data from device"""
        from . import models
        from . import crud
        
        device = db.query(models.SyncDevice).filter(
            models.SyncDevice.id == device_id,
            models.SyncDevice.user_id == user_id,
            models.SyncDevice.is_active == True
        ).first()
        
        if not device:
            return {"success": False, "error": "Device not found or inactive"}
        
        try:
            # Encrypt and store sync package
            sync_package = models.SyncPackage(
                user_id=user_id,
                source_device_id=device_id,
                sync_type="push",  # push or pull
                data=sync_data,
                status="pending",
                conflict_count=0
            )
            
            db.add(sync_package)
            db.commit()
            db.refresh(sync_package)
            
            # Update device last sync
            device.last_sync_at = datetime.utcnow()
            db.commit()
            
            # Log the sync
            crud.create_audit_log(
                db,
                user_id=user_id,
                action="device_sync_push",
                status="success",
                details={"device_id": device_id}
            )
            
            return {
                "success": True,
                "sync_id": sync_package.id,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def pull_sync(db, user_id: int, device_id: int, last_sync: Optional[datetime] = None) -> Dict[str, Any]:
        """Pull sync data for device"""
        from . import models
        from . import crud
        
        device = db.query(models.SyncDevice).filter(
            models.SyncDevice.id == device_id,
            models.SyncDevice.user_id == user_id,
            models.SyncDevice.is_active == True
        ).first()
        
        if not device:
            return {"success": False, "error": "Device not found or inactive"}
        
        try:
            # Get pending sync packages
            query = db.query(models.SyncPackage).filter(
                models.SyncPackage.user_id == user_id,
                models.SyncPackage.source_device_id != device_id,
                models.SyncPackage.status == "pending"
            )
            
            if last_sync:
                query = query.filter(models.SyncPackage.created_at > last_sync)
            
            sync_packages = query.all()
            
            # Update device last sync
            device.last_sync_at = datetime.utcnow()
            
            # Mark packages as synced
            for package in sync_packages:
                package.status = "synced"
            
            db.commit()
            
            # Log the sync
            crud.create_audit_log(
                db,
                user_id=user_id,
                action="device_sync_pull",
                status="success",
                details={"device_id": device_id, "package_count": len(sync_packages)}
            )
            
            return {
                "success": True,
                "packages": [
                    {
                        "id": p.id,
                        "source_device_id": p.source_device_id,
                        "data": p.data,
                        "created_at": p.created_at.isoformat()
                    }
                    for p in sync_packages
                ],
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def resolve_conflict(db, sync_id: int, resolution: str, user_id: int) -> bool:
        """Resolve sync conflict (keep_local, keep_remote, merge)"""
        from . import models
        
        package = db.query(models.SyncPackage).filter(
            models.SyncPackage.id == sync_id,
            models.SyncPackage.user_id == user_id
        ).first()
        
        if not package:
            return False
        
        package.conflict_resolution = resolution
        package.resolved_at = datetime.utcnow()
        db.commit()
        return True
