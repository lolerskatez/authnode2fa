from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from ..rate_limit import limiter, SENSITIVE_API_RATE_LIMIT
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes,
    bytes_to_base64url
)
from webauthn.helpers import (
    parse_registration_credential_json,
    parse_authentication_credential_json
)
import os
import secrets
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64

router = APIRouter()

# WebAuthn configuration
RP_ID = os.getenv("WEBAUTHN_RP_ID", "localhost")
RP_NAME = os.getenv("WEBAUTHN_RP_NAME", "AuthNode 2FA")
ORIGIN = os.getenv("WEBAUTHN_ORIGIN", "http://localhost:3000")


@router.get("/status", response_model=schemas.WebAuthnStatus)
def get_webauthn_status(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Get WebAuthn status for the current user."""
    credentials = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.user_id == current_user.id
    ).all()

    return schemas.WebAuthnStatus(
        enabled=len(credentials) > 0,
        credentials_count=len(credentials),
        credentials=credentials
    )


@router.post("/register/initiate", response_model=schemas.WebAuthnRegistrationOptions)
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def initiate_webauthn_registration(
    request: Request,
    reg_request: schemas.WebAuthnRegistrationRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate WebAuthn credential registration."""
    try:
        # Check if user already has too many credentials (limit to 5)
        existing_count = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == current_user.id
        ).count()

        if existing_count >= 5:
            raise HTTPException(status_code=400, detail="Maximum number of WebAuthn credentials reached")

        # Generate challenge
        challenge = secrets.token_bytes(32)
        challenge_b64 = bytes_to_base64url(challenge)

        # Store challenge
        challenge_obj = models.WebAuthnChallenge(
            user_id=current_user.id,
            challenge=challenge_b64,
            challenge_type="registration",
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        db.add(challenge_obj)
        db.commit()

        # Generate registration options
        registration_options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(current_user.id),
            user_name=current_user.username,
            user_display_name=current_user.name,
            challenge=challenge,
            authenticator_selection={
                "authenticatorAttachment": "cross-platform",  # Allow any authenticator
                "requireResidentKey": False,
                "userVerification": "preferred"
            },
            timeout=60000  # 60 seconds
        )

        # Convert to dict for response
        options_dict = options_to_json(registration_options)

        # Log the action
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="webauthn_registration_initiated",
            ip_address=request.client.host if request.client else None,
            status="success",
            details={"device_name": reg_request.device_name}
        )

        return options_dict

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate WebAuthn registration: {str(e)}")


@router.post("/register/complete")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def complete_webauthn_registration(
    request: Request,
    completion: schemas.WebAuthnRegistrationComplete,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Complete WebAuthn credential registration."""
    try:
        # Parse the credential response
        credential = parse_registration_credential_json(completion.credential.dict())

        # Find the challenge
        challenge_obj = db.query(models.WebAuthnChallenge).filter(
            models.WebAuthnChallenge.user_id == current_user.id,
            models.WebAuthnChallenge.challenge_type == "registration",
            models.WebAuthnChallenge.expires_at > datetime.utcnow()
        ).order_by(models.WebAuthnChallenge.created_at.desc()).first()

        if not challenge_obj:
            raise HTTPException(status_code=400, detail="No valid challenge found")

        challenge_bytes = base64url_to_bytes(challenge_obj.challenge)

        # Verify the registration response
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge_bytes,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID
        )

        # Extract credential data
        credential_id = bytes_to_base64url(verification.credential_id)
        public_key_pem = verification.credential_public_key

        # Serialize public key to PEM format
        if hasattr(public_key_pem, 'public_key'):
            # It's a cryptography key object
            pem_data = public_key_pem.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
        else:
            # It's already PEM string
            pem_data = public_key_pem

        # Create the credential record
        webauthn_cred = models.WebAuthnCredential(
            user_id=current_user.id,
            credential_id=credential_id,
            public_key=pem_data,
            sign_count=verification.sign_count,
            device_name=completion.device_name or f"Security Key {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            device_type="cross-platform",
            transports=completion.credential.response.get("transports", [])
        )

        db.add(webauthn_cred)

        # Delete the used challenge
        db.delete(challenge_obj)

        db.commit()
        db.refresh(webauthn_cred)

        # Log the action
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="webauthn_registration_completed",
            resource_type="webauthn_credential",
            resource_id=webauthn_cred.id,
            ip_address=request.client.host if request.client else None,
            status="success",
            details={"device_name": webauthn_cred.device_name}
        )

        return {"message": "WebAuthn credential registered successfully", "credential_id": credential_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"WebAuthn registration failed: {str(e)}")


@router.post("/authenticate/initiate", response_model=schemas.WebAuthnAuthenticationOptions)
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def initiate_webauthn_authentication(
    request: Request,
    auth_request: schemas.WebAuthnAuthenticationRequest,
    db: Session = Depends(get_db)
):
    """Initiate WebAuthn authentication."""
    try:
        # Find user by email
        user = crud.get_user_by_email(db, auth_request.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get user's WebAuthn credentials
        credentials = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == user.id
        ).all()

        if not credentials:
            raise HTTPException(status_code=400, detail="No WebAuthn credentials registered")

        # Generate challenge
        challenge = secrets.token_bytes(32)
        challenge_b64 = bytes_to_base64url(challenge)

        # Store challenge
        challenge_obj = models.WebAuthnChallenge(
            user_id=user.id,
            challenge=challenge_b64,
            challenge_type="authentication",
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        db.add(challenge_obj)
        db.commit()

        # Prepare credential descriptors
        allow_credentials = []
        for cred in credentials:
            allow_credentials.append({
                "id": cred.credential_id,
                "type": "public-key",
                "transports": cred.transports or ["usb", "nfc", "ble"]
            })

        # Generate authentication options
        auth_options = generate_authentication_options(
            rp_id=RP_ID,
            challenge=challenge,
            allow_credentials=allow_credentials,
            timeout=60000,  # 60 seconds
            user_verification="preferred"
        )

        # Convert to dict for response
        options_dict = options_to_json(auth_options)

        return options_dict

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate WebAuthn authentication: {str(e)}")


@router.post("/authenticate/complete")
@limiter.limit(SENSITIVE_API_RATE_LIMIT)
def complete_webauthn_authentication(
    request: Request,
    completion: schemas.WebAuthnAuthenticationComplete,
    db: Session = Depends(get_db)
):
    """Complete WebAuthn authentication."""
    try:
        # Find user by email
        user = crud.get_user_by_email(db, completion.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Parse the credential response
        credential = parse_authentication_credential_json(completion.credential.dict())

        # Find the challenge
        challenge_obj = db.query(models.WebAuthnChallenge).filter(
            models.WebAuthnChallenge.user_id == user.id,
            models.WebAuthnChallenge.challenge_type == "authentication",
            models.WebAuthnChallenge.expires_at > datetime.utcnow()
        ).order_by(models.WebAuthnChallenge.created_at.desc()).first()

        if not challenge_obj:
            raise HTTPException(status_code=400, detail="No valid challenge found")

        challenge_bytes = base64url_to_bytes(challenge_obj.challenge)

        # Find the credential
        credential_obj = db.query(models.WebAuthnCredential).filter(
            models.WebAuthnCredential.user_id == user.id,
            models.WebAuthnCredential.credential_id == bytes_to_base64url(credential.raw_id)
        ).first()

        if not credential_obj:
            raise HTTPException(status_code=400, detail="Credential not found")

        # Verify the authentication response
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge_bytes,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            credential_public_key=credential_obj.public_key,
            credential_current_sign_count=credential_obj.sign_count
        )

        # Update sign count
        credential_obj.sign_count = verification.new_sign_count
        credential_obj.last_used_at = datetime.utcnow()

        # Delete the used challenge
        db.delete(challenge_obj)

        db.commit()

        # Generate JWT token
        access_token = auth.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Create user session for tracking
        try:
            from jose import jwt
            payload = jwt.decode(access_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            token_jti = payload.get('jti')
            expires_at = payload.get('exp')
            if token_jti and expires_at:
                crud.create_user_session(
                    db,
                    user_id=user.id,
                    token_jti=token_jti,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get('user-agent'),
                    expires_at=datetime.utcfromtimestamp(expires_at)
                )
        except Exception as e:
            # Don't fail login if session creation fails
            print(f"Warning: Failed to create user session: {str(e)}")

        # Log the successful authentication
        crud.create_audit_log(
            db,
            user_id=user.id,
            action="login_success_webauthn",
            ip_address=request.client.host if request.client else None,
            status="success",
            details={"credential_id": credential_obj.id}
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"WebAuthn authentication failed: {str(e)}")


@router.delete("/credentials/{credential_id}")
def delete_webauthn_credential(
    request: Request,
    credential_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a WebAuthn credential."""
    # Find the credential
    credential = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.id == int(credential_id),
        models.WebAuthnCredential.user_id == current_user.id
    ).first()

    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    # Don't allow deletion if it's the user's only credential and they don't have TOTP
    other_credentials = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.user_id == current_user.id,
        models.WebAuthnCredential.id != int(credential_id)
    ).count()

    if other_credentials == 0 and not current_user.totp_enabled:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the only WebAuthn credential without TOTP backup"
        )

    # Delete the credential
    db.delete(credential)
    db.commit()

    # Log the action
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="webauthn_credential_deleted",
        resource_type="webauthn_credential",
        resource_id=int(credential_id),
        ip_address=request.client.host if request.client else None,
        status="success"
    )

    return {"message": "WebAuthn credential deleted successfully"}
