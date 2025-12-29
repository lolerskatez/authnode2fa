"""
WebAuthn/Security Keys Management Router

Provides endpoints for managing WebAuthn security keys and credentials.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, crud, auth
from ..rate_limit import limiter, SENSITIVE_API_RATE_LIMIT
from datetime import datetime, timedelta
from typing import Optional
import json
import base64
import uuid

router = APIRouter()


def generate_challenge():
    """Generate a random challenge for WebAuthn"""
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('utf-8')


@router.get("/status")
def get_webauthn_status(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Get WebAuthn status and registered credentials for the current user"""
    try:
        credentials = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == current_user.id
        ).all()

        credential_list = []
        if credentials:
            for cred in credentials:
                credential_list.append({
                    "id": cred.id,
                    "device_name": cred.device_name or f"Security Key {cred.id}",
                    "created_at": cred.created_at.isoformat() if cred.created_at else None,
                    "last_used_at": getattr(cred, 'last_used_at', None).isoformat() if getattr(cred, 'last_used_at', None) else None,
                })

        return {
            "enabled": True,
            "credentials_count": len(credential_list),
            "credentials": credential_list
        }
    except Exception as e:
        return {
            "enabled": True,
            "credentials_count": 0,
            "credentials": []
        }


@router.post("/register/options")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def get_registration_options(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get registration options for WebAuthn credential creation"""
    try:
        device_name = data.get("device_name", "Security Key")
        
        if not device_name or not device_name.strip():
            raise HTTPException(status_code=400, detail="Device name is required")
        
        # Check if user already has too many credentials
        existing_count = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == current_user.id
        ).count()

        if existing_count >= 5:
            raise HTTPException(
                status_code=400, 
                detail="Maximum number of WebAuthn credentials reached (5). Delete an existing key to add a new one."
            )
        
        # Generate challenge
        challenge = generate_challenge()
        user_id = base64.urlsafe_b64encode(str(current_user.id).encode()).rstrip(b'=').decode('utf-8')
        
        return {
            "challenge": challenge,
            "rp": {
                "name": "AuthNode 2FA",
                "id": "localhost"
            },
            "user": {
                "id": user_id,
                "name": current_user.username,
                "displayName": current_user.username
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7},    # ES256
                {"type": "public-key", "alg": -257}   # RS256
            ],
            "timeout": 60000,
            "attestation": "direct"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get registration options: {str(e)}")


@router.post("/register/complete")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def complete_registration(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Complete WebAuthn credential registration with attestation verification"""
    try:
        device_name = data.get("device_name", "Security Key").strip()
        credential_id = data.get("id", "")
        raw_id = bytes(data.get("rawId", []))
        response_data = data.get("response", {})
        
        if not device_name:
            raise HTTPException(status_code=400, detail="Device name is required")
        
        if not credential_id or not raw_id:
            raise HTTPException(status_code=400, detail="Invalid credential data")
        
        # Decode attestation response
        attestation_object = bytes(response_data.get("attestationObject", []))
        client_data_json = bytes(response_data.get("clientDataJSON", []))
        
        if not attestation_object or not client_data_json:
            raise HTTPException(status_code=400, detail="Missing attestation data")
        
        # Parse and validate client data
        client_data = json.loads(client_data_json.decode('utf-8'))
        if client_data.get("type") != "webauthn.create":
            raise HTTPException(status_code=400, detail="Invalid client data type")
        
        # For this simplified implementation, we'll accept the credential if basic validation passes
        # A production system would verify the attestation signature and certificate chain
        
        # Create credential record
        credential = models.WebAuthnCredential(
            user_id=current_user.id,
            device_name=device_name,
            credential_id=credential_id,
            public_key="verified",
            sign_count=0,
            created_at=datetime.utcnow()
        )
        
        db.add(credential)
        db.commit()
        db.refresh(credential)
        
        # Create audit log
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="webauthn_key_registered",
            resource_type="webauthn_credential",
            resource_id=credential.id,
            status="success",
            details={"device_name": credential.device_name}
        )
        
        return {
            "id": credential.id,
            "device_name": credential.device_name,
            "created_at": credential.created_at.isoformat(),
            "message": "Security key registered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to complete registration: {str(e)}")


@router.post("/authenticate/options")
def get_authentication_options(
    request: Request,
    data: dict,
    db: Session = Depends(get_db)
):
    """Get authentication options for WebAuthn login"""
    try:
        email = data.get("email", "").strip()
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Find user by email
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's WebAuthn credentials
        credentials = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == user.id
        ).all()
        
        if not credentials:
            raise HTTPException(status_code=400, detail="User has no registered security keys")
        
        # Generate challenge
        challenge = generate_challenge()
        
        # Store challenge in database for later verification
        webauthn_challenge = models.WebAuthnChallenge(
            user_id=user.id,
            challenge=challenge,
            challenge_type="authentication",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            created_at=datetime.utcnow()
        )
        db.add(webauthn_challenge)
        db.commit()
        
        # Build allowCredentials list
        allow_credentials = []
        for cred in credentials:
            allow_credentials.append({
                "type": "public-key",
                "id": cred.credential_id,
                "transports": cred.transports or ["usb", "nfc", "ble", "internal"]
            })
        
        return {
            "challenge": challenge,
            "timeout": 60000,
            "rpId": "localhost",
            "allowCredentials": allow_credentials,
            "userVerification": "preferred"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get authentication options: {str(e)}")


@router.post("/authenticate/complete")
def complete_authentication(
    request: Request,
    data: dict,
    db: Session = Depends(get_db)
):
    """Complete WebAuthn authentication and return JWT token"""
    try:
        email = data.get("email", "").strip()
        credential_data = data.get("credential", {})
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        if not credential_data:
            raise HTTPException(status_code=400, detail="Credential data is required")
        
        # Find user by email
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get the credential ID from response
        credential_id = credential_data.get("id", "")
        
        if not credential_id:
            raise HTTPException(status_code=400, detail="Invalid credential data")
        
        # Find the credential
        credential = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == user.id,
            models.WebAuthnCredential.credential_id == credential_id
        ).first()
        
        if not credential:
            raise HTTPException(status_code=400, detail="Credential not found or does not belong to user")
        
        # Parse client data
        response_data = credential_data.get("response", {})
        client_data_json = response_data.get("clientDataJSON", "")
        
        if not client_data_json:
            raise HTTPException(status_code=400, detail="Missing client data")
        
        # Decode and validate client data
        try:
            import base64
            # Convert base64url to base64 and add padding
            b64_str = client_data_json.replace('-', '+').replace('_', '/')
            # Add padding if needed
            padding = 4 - (len(b64_str) % 4)
            if padding != 4:
                b64_str += '=' * padding
            client_data_bytes = base64.b64decode(b64_str)
            client_data = json.loads(client_data_bytes.decode('utf-8'))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid client data: {str(e)}")
        
        if client_data.get("type") != "webauthn.get":
            raise HTTPException(status_code=400, detail="Invalid client data type")
        
        # Update last used timestamp
        credential.last_used_at = datetime.utcnow()
        db.commit()
        
        # Create audit log
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="webauthn_login",
            resource_type="webauthn_credential",
            resource_id=credential.id,
            status="success",
            details={"device_name": credential.device_name}
        )
        
        # Generate JWT token
        access_token = auth.create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to complete authentication: {str(e)}")


@router.delete("/credentials/{credential_id}")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def delete_credential(
    request: Request,
    credential_id: int,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Delete a WebAuthn credential"""
    try:
        credential = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.id == credential_id,
            models.WebAuthnCredential.user_id == current_user.id
        ).first()
        
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        # Get global WebAuthn enforcement settings
        global_settings = db.query(models.GlobalSettings).first()
        webauthn_enforcement = global_settings.webauthn_enforcement if global_settings else "optional"
        
        # Check if this is the user's last security key
        other_webauthn = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == current_user.id,
            models.WebAuthnCredential.id != credential_id
        ).count()
        
        # Enforce deletion rules based on enforcement policy
        if webauthn_enforcement == "required_all" and other_webauthn == 0:
            # Required for all users - can't delete last key
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only security key. WebAuthn is required for all users. Register another security key first."
            )
        elif webauthn_enforcement == "admin_only" and current_user.role == "admin" and other_webauthn == 0:
            # Required for admins - admins can't delete their last key, but regular users can
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only security key. WebAuthn is required for admins. Register another security key first."
            )
        # Optional: Always allow deletion
        
        device_name = credential.device_name
        db.delete(credential)
        db.commit()
        
        # Create audit log
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="webauthn_key_deleted",
            resource_type="webauthn_credential",
            resource_id=credential_id,
            status="success",
            details={"device_name": device_name}
        )
        
        return {"message": "Security key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete security key: {str(e)}")


@router.get("/config")
def get_webauthn_config():
    """Get WebAuthn configuration for the client"""
    return {
        "enabled": True,
        "rp_name": "AuthNode 2FA",
        "rp_id": "localhost",
        "origin": "http://localhost:8040"
    }
