"""
Notifications Router

Handles in-app notification endpoints for users.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, crud, auth
from ..rate_limit import limiter, API_RATE_LIMIT

router = APIRouter()


@router.get("/unread", response_model=list[schemas.InAppNotification])
@limiter.limit(API_RATE_LIMIT)
def get_unread_notifications(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notifications for current user"""
    return crud.get_unread_notifications(db, current_user.id)


@router.get("/", response_model=dict)
@limiter.limit(API_RATE_LIMIT)
def get_notifications(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated notifications for current user"""
    notifications = crud.get_all_notifications(db, current_user.id, limit, offset)
    unread_count = len(crud.get_unread_notifications(db, current_user.id))
    
    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset
    }


@router.post("/{notification_id}/read")
@limiter.limit(API_RATE_LIMIT)
def mark_notification_read(
    request: Request,
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    # Verify ownership
    notification = db.query(models.InAppNotification).filter(
        models.InAppNotification.id == notification_id
    ).first()
    
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    crud.mark_notification_as_read(db, notification_id)
    return {"success": True, "message": "Notification marked as read"}


@router.post("/read-all")
@limiter.limit(API_RATE_LIMIT)
def mark_all_as_read(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    crud.mark_all_notifications_as_read(db, current_user.id)
    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
@limiter.limit(API_RATE_LIMIT)
def delete_notification(
    request: Request,
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    # Verify ownership
    notification = db.query(models.InAppNotification).filter(
        models.InAppNotification.id == notification_id
    ).first()
    
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    crud.delete_notification(db, notification_id)
    return {"success": True, "message": "Notification deleted"}


@router.get("/count", response_model=dict)
@limiter.limit(API_RATE_LIMIT)
def get_notification_count(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification counts for current user"""
    unread_count = crud.get_unread_notification_count(db, current_user.id)
    total_count = db.query(models.InAppNotification).filter(
        models.InAppNotification.user_id == current_user.id
    ).count()
    
    return {
        "unread": unread_count,
        "total": total_count
    }


@router.get("/preferences", response_model=schemas.UserNotificationPreferences)
@limiter.limit(API_RATE_LIMIT)
def get_notification_preferences(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification preferences for current user"""
    return crud.get_user_notification_preferences(db, current_user.id)


@router.put("/preferences", response_model=schemas.UserNotificationPreferences)
@limiter.limit(API_RATE_LIMIT)
def update_notification_preferences(
    request: Request,
    preferences: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences for current user"""
    return crud.update_user_notification_preferences(db, current_user.id, preferences)
