"""
Account Sharing Router

Handles sharing 2FA applications between users with different permission levels.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from ..rate_limit import limiter, API_RATE_LIMIT
from ..notifications import email_service
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/share", response_model=schemas.AccountShare)
@limiter.limit(API_RATE_LIMIT)
def share_application(
    request: Request,
    share_request: schemas.AccountShareCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Share an application with another user"""
    # Verify the application belongs to current user
    app = crud.get_application(db, share_request.application_id)
    if not app or app.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if user to share with exists
    shared_user = crud.get_user_by_email(db, share_request.shared_with_email)
    if not shared_user:
        # Create invitation instead
        invitation = crud.create_share_invitation(
            db=db,
            application_id=share_request.application_id,
            owner_id=current_user.id,
            invited_email=share_request.shared_with_email,
            permission_level=share_request.permission_level,
            expires_at=share_request.expires_at
        )
        
        # Send invitation email
        app_url = os.getenv("APP_URL", "http://localhost:3000")
        invitation_url = f"{app_url}/share/accept/{invitation.invitation_token}"
        
        email_service.send_share_invitation_email(
            invited_email=share_request.shared_with_email,
            inviter_name=current_user.name or current_user.username,
            app_name=app.name,
            invitation_url=invitation_url
        )
        
        # Return invitation as share (for frontend compatibility)
        return schemas.AccountShare(
            id=invitation.id,
            application_id=invitation.application_id,
            owner_id=invitation.owner_id,
            shared_with_id=0,  # Placeholder
            permission_level=invitation.permission_level,
            expires_at=invitation.expires_at,
            is_active=True,
            created_at=invitation.created_at,
            updated_at=invitation.created_at,
            application_name=app.name,
            shared_with_name=f"{share_request.shared_with_email} (pending)",
            shared_with_email=share_request.shared_with_email
        )
    
    # Check if already shared
    existing_share = db.query(models.AccountShare).filter(
        models.AccountShare.application_id == share_request.application_id,
        models.AccountShare.shared_with_id == shared_user.id,
        models.AccountShare.is_active == True
    ).first()
    
    if existing_share:
        raise HTTPException(status_code=400, detail="Application already shared with this user")
    
    # Create the share
    share = crud.create_account_share(
        db=db,
        application_id=share_request.application_id,
        owner_id=current_user.id,
        shared_with_id=shared_user.id,
        permission_level=share_request.permission_level,
        expires_at=share_request.expires_at
    )
    
    # Send notification to recipient
    crud.create_in_app_notification(
        db=db,
        user_id=shared_user.id,
        notification_type="account_shared",
        title="New Account Shared With You",
        message=f"{current_user.name or current_user.username} shared '{app.name}' with you",
        details={
            "shared_by": current_user.name or current_user.username,
            "app_name": app.name,
            "permission_level": share_request.permission_level
        }
    )
    
    return schemas.AccountShare(
        id=share.id,
        application_id=share.application_id,
        owner_id=share.owner_id,
        shared_with_id=share.shared_with_id,
        permission_level=share.permission_level,
        expires_at=share.expires_at,
        is_active=share.is_active,
        created_at=share.created_at,
        updated_at=share.updated_at,
        application_name=app.name,
        shared_with_name=shared_user.name or shared_user.username,
        shared_with_email=shared_user.email
    )


@router.get("/shared-by-me", response_model=list[schemas.AccountShare])
@limiter.limit(API_RATE_LIMIT)
def get_shares_created_by_me(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get applications I've shared with others"""
    shares = crud.get_account_shares_by_owner(db, current_user.id)
    
    result = []
    for share in shares:
        result.append(schemas.AccountShare(
            id=share.id,
            application_id=share.application_id,
            owner_id=share.owner_id,
            shared_with_id=share.shared_with_id,
            permission_level=share.permission_level,
            expires_at=share.expires_at,
            is_active=share.is_active,
            created_at=share.created_at,
            updated_at=share.updated_at,
            application_name=share.application.name,
            shared_with_name=share.shared_with.name or share.shared_with.username,
            shared_with_email=share.shared_with.email
        ))
    
    return result


@router.get("/shared-with-me", response_model=list[schemas.SharedApplication])
@limiter.limit(API_RATE_LIMIT)
def get_applications_shared_with_me(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get applications shared with me"""
    shares = crud.get_shared_applications_for_user(db, current_user.id)
    
    result = []
    for share in shares:
        result.append(schemas.SharedApplication(
            id=share.application.id,
            name=share.application.name,
            icon=share.application.icon,
            color=share.application.color,
            category=share.application.category,
            favorite=share.application.favorite,
            permission_level=share.permission_level,
            shared_by_name=share.owner.name or share.owner.username,
            shared_by_email=share.owner.email,
            shared_at=share.created_at,
            expires_at=share.expires_at
        ))
    
    return result


@router.put("/{share_id}", response_model=schemas.AccountShare)
@limiter.limit(API_RATE_LIMIT)
def update_share_permissions(
    request: Request,
    share_id: int,
    update_data: schemas.AccountShareBase,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update share permissions (only by owner)"""
    share = crud.update_share_permissions(
        db=db,
        share_id=share_id,
        owner_id=current_user.id,
        permission_level=update_data.permission_level,
        expires_at=update_data.expires_at
    )
    
    if not share:
        raise HTTPException(status_code=404, detail="Share not found or access denied")
    
    return schemas.AccountShare(
        id=share.id,
        application_id=share.application_id,
        owner_id=share.owner_id,
        shared_with_id=share.shared_with_id,
        permission_level=share.permission_level,
        expires_at=share.expires_at,
        is_active=share.is_active,
        created_at=share.created_at,
        updated_at=share.updated_at,
        application_name=share.application.name,
        shared_with_name=share.shared_with.name or share.shared_with.username,
        shared_with_email=share.shared_with.email
    )


@router.delete("/{share_id}")
@limiter.limit(API_RATE_LIMIT)
def revoke_share(
    request: Request,
    share_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke an account share (only by owner)"""
    success = crud.revoke_account_share(db, share_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Share not found or access denied")
    
    return {"message": "Share revoked successfully"}


@router.get("/invitations/pending", response_model=list[schemas.ShareInvitation])
@limiter.limit(API_RATE_LIMIT)
def get_pending_invitations(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending share invitations I've sent"""
    invitations = crud.get_pending_share_invitations_by_owner(db, current_user.id)
    
    result = []
    for inv in invitations:
        result.append(schemas.ShareInvitation(
            id=inv.id,
            application_id=inv.application_id,
            owner_id=inv.owner_id,
            invited_email=inv.invited_email,
            permission_level=inv.permission_level,
            expires_at=inv.expires_at,
            invitation_token=inv.invitation_token,
            status=inv.status,
            created_at=inv.created_at,
            responded_at=inv.responded_at,
            application_name=inv.application.name,
            owner_name=current_user.name or current_user.username
        ))
    
    return result


@router.post("/accept-invitation", response_model=schemas.AccountShare)
@limiter.limit(API_RATE_LIMIT)
def accept_share_invitation(
    request: Request,
    accept_data: schemas.AcceptShareInvitation,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a share invitation"""
    share = crud.accept_share_invitation(db, accept_data.invitation_token, current_user.id)
    
    if not share:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
    
    return schemas.AccountShare(
        id=share.id,
        application_id=share.application_id,
        owner_id=share.owner_id,
        shared_with_id=share.shared_with_id,
        permission_level=share.permission_level,
        expires_at=share.expires_at,
        is_active=share.is_active,
        created_at=share.created_at,
        updated_at=share.updated_at,
        application_name=share.application.name,
        shared_with_name=current_user.name or current_user.username,
        shared_with_email=current_user.email
    )


@router.post("/decline-invitation")
@limiter.limit(API_RATE_LIMIT)
def decline_share_invitation(
    request: Request,
    decline_data: schemas.AcceptShareInvitation,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a share invitation"""
    success = crud.decline_share_invitation(db, decline_data.invitation_token)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid invitation token")
    
    return {"message": "Invitation declined"}


@router.get("/stats", response_model=schemas.AccountSharingStats)
@limiter.limit(API_RATE_LIMIT)
def get_sharing_stats(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get account sharing statistics for current user"""
    stats = crud.get_account_sharing_stats(db, current_user.id)
    return schemas.AccountSharingStats(**stats)
