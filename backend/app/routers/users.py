from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth

router = APIRouter()

@router.get("/", response_model=list[schemas.User])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    return db.query(models.User).all()

@router.post("/", response_model=schemas.User)
def create_user(
    user_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Create a new user (admin only)"""
    username = user_data.get("username")
    email = user_data.get("email")
    password = user_data.get("password")
    name = user_data.get("name", "")
    role = user_data.get("role", "user")
    
    # Validation
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    if role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'user'")
    
    # Check if username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == username) | (models.User.email == email)
    ).first()
    
    if existing_user:
        if existing_user.username == username:
            raise HTTPException(status_code=400, detail="Username already exists")
        else:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    # Create new user
    new_user = models.User(
        username=username,
        email=email,
        password_hash=auth.hash_password(password),
        name=name,
        role=role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int, 
    role_update: dict, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    """Update a user's role (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_role = role_update.get("role")
    if new_role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'user'")
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/password")
def update_user_password(
    user_id: int, 
    password_update: dict, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Update a user's password (own profile with current password, or admin)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If user is changing their own password, require current password
    if current_user.id == user_id:
        current_password = password_update.get("current_password")
        if not current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not auth.verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        new_password = password_update.get("new_password")
    elif current_user.role == 'admin':
        # Admin can change password without current password
        new_password = password_update.get("password") or password_update.get("new_password")
    else:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    user.password_hash = auth.hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/name")
def update_user_name(
    user_id: int, 
    name_update: dict, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Update a user's name (own profile or admin)"""
    # Check if user is updating their own profile or is admin
    if current_user.id != user_id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_name = name_update.get("name")
    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    user.name = new_name.strip()
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/email")
def update_user_email(
    user_id: int, 
    email_update: dict, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Update a user's email (own profile or admin)"""
    # Check if user is updating their own profile or is admin
    if current_user.id != user_id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_email = email_update.get("email")
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    # Check if email already exists for another user
    existing_user = db.query(models.User).filter(models.User.email == new_email).first()
    if existing_user and existing_user.id != user_id:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    user.email = new_email
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    """Delete a user (admin only)"""
    # Prevent deleting the current user
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete all associated applications first
    db.query(models.Application).filter(models.Application.user_id == user_id).delete()
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.get("/{user_id}/preferences", response_model=schemas.UserPreferences)
def get_user_preferences(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences"""
    # Users can only get their own preferences, admins can get any
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot access other user's preferences")
    
    # Check user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create preferences
    prefs = db.query(models.UserPreferences).filter(models.UserPreferences.user_id == user_id).first()
    if not prefs:
        # Create default preferences
        prefs = models.UserPreferences(user_id=user_id, email_notifications_enabled=False)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


@router.put("/{user_id}/preferences", response_model=schemas.UserPreferences)
def update_user_preferences(
    user_id: int,
    preferences: schemas.UserPreferencesUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    # Users can only update their own preferences, admins can update any
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot modify other user's preferences")
    
    # Check user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create preferences
    prefs = db.query(models.UserPreferences).filter(models.UserPreferences.user_id == user_id).first()
    if not prefs:
        prefs = models.UserPreferences(user_id=user_id)
        db.add(prefs)
    
    # Update fields
    if preferences.email_notifications_enabled is not None:
        prefs.email_notifications_enabled = preferences.email_notifications_enabled
    
    db.commit()
    db.refresh(prefs)
    
    return prefs


# Session Management Endpoints
@router.get("/sessions", response_model=schemas.SessionListResponse)
def get_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Get all active sessions for the current user"""
    sessions = crud.get_user_sessions(db, current_user.id, exclude_revoked=True)
    
    # Convert to response format
    session_responses = [
        schemas.UserSessionResponse(
            id=session.id,
            user_id=session.user_id,
            token_jti=session.token_jti,
            device_name=session.device_name,
            ip_address=session.ip_address,
            last_activity=session.last_activity,
            created_at=session.created_at,
            expires_at=session.expires_at
        )
        for session in sessions
    ]
    
    return schemas.SessionListResponse(sessions=session_responses, current_session_id=None)


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Revoke a specific session"""
    # Verify the session belongs to the current user
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot revoke other user's sessions")
    
    # Revoke the session
    success = crud.revoke_session(db, session_id)
    
    if success:
        crud.create_audit_log(
            db,
            user_id=current_user.id,
            action="session_revoked",
            resource_type="session",
            resource_id=session_id,
            status="success"
        )
        return {"message": "Session revoked successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to revoke session")


@router.post("/sessions/revoke-all")
def revoke_all_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Revoke all sessions except the current one"""
    # Get current token JTI from claims if available (would need to be passed through)
    # For now, revoke all sessions which will force re-login everywhere
    crud.revoke_all_user_sessions(db, current_user.id)
    
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="all_sessions_revoked",
        status="success"
    )
    
    return {"message": "All sessions have been revoked. Please log in again."}

@router.get("/activity", response_model=list[schemas.AuditLogResponse])
def get_user_activity(
    limit: int = 50,
    offset: int = 0,
    action: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get current user's activity log"""
    # Validate limit and offset
    if limit > 500:
        limit = 500
    if offset < 0:
        offset = 0
    
    # Get audit logs for current user
    logs = crud.get_audit_logs(
        db, 
        user_id=current_user.id, 
        action=action,
        status=status,
        limit=limit, 
        offset=offset
    )
    
    return logs
