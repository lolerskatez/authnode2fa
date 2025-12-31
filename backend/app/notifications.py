"""
Notification System for AuthNode2FA

Handles email and in-app notifications for:
- Security events (brute force, suspicious logins)
- 2FA events (enable, disable, backup codes used)
- Account events (password changed, profile updated)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from . import models, crud
import asyncio
from threading import Thread


class EmailNotificationService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from = os.getenv("SMTP_FROM_EMAIL", "noreply@authnode2fa.com")
        self.app_name = os.getenv("APP_NAME", "AuthNode 2FA")
        self.app_url = os.getenv("APP_URL", "https://localhost")
        self.enabled = os.getenv("SMTP_ENABLED", "false").lower() == "true"
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None):
        """Send email asynchronously to avoid blocking"""
        if not self.enabled:
            print(f"[NOTIFICATION] Email disabled. Would send to {to_email}: {subject}")
            return False
        
        # Send in background thread to avoid blocking
        thread = Thread(target=self._send_email_sync, args=(to_email, subject, html_content, text_content))
        thread.daemon = True
        thread.start()
        return True
    
    def _send_email_sync(self, to_email: str, subject: str, html_content: str, text_content: str = None):
        """Synchronous email sending (runs in background thread)"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.app_name} <{self.smtp_from}>"
            msg['To'] = to_email
            
            # Add text content if provided, else use plain text version of HTML
            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            
            msg.attach(MIMEText(html_content, 'html'))
            
            # Connect and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            print(f"[NOTIFICATION] Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            print(f"[NOTIFICATION ERROR] Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_suspicious_login_alert(self, user: models.User, ip_address: str, device_info: str = None):
        """Alert user of login from new location/IP"""
        subject = f"⚠️ Unusual Login Detected - {self.app_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #d9534f;">⚠️ Unusual Login Detected</h2>
                    
                    <p>Hi {user.name or user.username},</p>
                    
                    <p>We detected a login to your {self.app_name} account from an unusual location:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>IP Address:</strong> {ip_address}</p>
                        <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                        {f'<p><strong>Device:</strong> {device_info}</p>' if device_info else ''}
                    </div>
                    
                    <p><strong>If this was you:</strong> No action needed. You can ignore this message.</p>
                    
                    <p><strong>If this wasn't you:</strong></p>
                    <ul>
                        <li>Change your password immediately</li>
                        <li>Review your active sessions</li>
                        <li>Enable 2FA if not already enabled</li>
                        <li>Contact support if you have questions</li>
                    </ul>
                    
                    <p>
                        <a href="{self.app_url}/settings" style="background-color: #0275d8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Account Security
                        </a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated security alert. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_brute_force_alert(self, user: models.User, failed_attempts: int):
        """Alert user of multiple failed login attempts"""
        subject = f"🔒 Account Locked Due to Failed Login Attempts - {self.app_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #d9534f;">🔒 Account Locked</h2>
                    
                    <p>Hi {user.name or user.username},</p>
                    
                    <p>Your account has been temporarily locked for security reasons.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Reason:</strong> {failed_attempts} failed login attempts detected</p>
                        <p><strong>Status:</strong> Account locked for 15 minutes</p>
                        <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    </div>
                    
                    <p>Your account will be automatically unlocked in 15 minutes.</p>
                    
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>Wait 15 minutes before trying to log in again</li>
                        <li>Make sure you're using the correct password</li>
                        <li>Check for caps lock while typing your password</li>
                        <li>Use the password reset feature if you forgot your password</li>
                    </ul>
                    
                    <p style="color: #d9534f; font-weight: bold;">
                        If you didn't attempt these logins, your account may be at risk. 
                        Contact support immediately.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated security alert. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_2fa_disabled_alert(self, user: models.User):
        """Alert user that 2FA was disabled"""
        subject = f"🔐 Two-Factor Authentication Disabled - {self.app_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #d9534f;">🔐 2FA Disabled</h2>
                    
                    <p>Hi {user.name or user.username},</p>
                    
                    <p>Two-Factor Authentication (2FA) has been disabled on your account.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Action:</strong> 2FA disabled</p>
                        <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    </div>
                    
                    <p style="color: #d9534f; font-weight: bold;">
                        Your account is now less secure. We recommend enabling 2FA immediately.
                    </p>
                    
                    <p>
                        <a href="{self.app_url}/settings" style="background-color: #0275d8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Re-enable 2FA
                        </a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated security alert. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_password_changed_alert(self, user: models.User):
        """Alert user that password was changed"""
        subject = f"✅ Password Changed - {self.app_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #5cb85c;">✅ Password Changed</h2>
                    
                    <p>Hi {user.name or user.username},</p>
                    
                    <p>Your account password was successfully changed.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Action:</strong> Password changed</p>
                        <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    </div>
                    
                    <p><strong>If you didn't make this change:</strong> Your account may be compromised.</p>
                    <ol>
                        <li>Change your password again with a new, unique password</li>
                        <li>Review your active sessions and revoke suspicious ones</li>
                        <li>Enable 2FA if not already enabled</li>
                        <li>Contact support immediately</li>
                    </ol>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated security alert. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)


class InAppNotificationService:
    """Service for creating in-app notifications"""
    
    @staticmethod
    def create_notification(db: Session, user_id: int, notification_type: str, 
                          title: str, message: str, details: Dict[str, Any] = None):
        """Create an in-app notification"""
        try:
            notification = models.InAppNotification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                details=details or {},
                read=False
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            return notification
        except Exception as e:
            print(f"[NOTIFICATION ERROR] Failed to create in-app notification: {str(e)}")
            return None
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int):
        """Mark notification as read"""
        notification = db.query(models.InAppNotification).filter(
            models.InAppNotification.id == notification_id
        ).first()
        if notification:
            notification.read = True
            db.commit()
            return True
        return False
    
    @staticmethod
    def get_unread_notifications(db: Session, user_id: int, limit: int = 50):
        """Get unread notifications for user"""
        return db.query(models.InAppNotification).filter(
            models.InAppNotification.user_id == user_id,
            models.InAppNotification.read == False
        ).order_by(models.InAppNotification.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def get_all_notifications(db: Session, user_id: int, limit: int = 100, offset: int = 0):
        """Get all notifications for user (paginated)"""
        return db.query(models.InAppNotification).filter(
            models.InAppNotification.user_id == user_id
        ).order_by(models.InAppNotification.created_at.desc()).limit(limit).offset(offset).all()


# Global instances
email_service = EmailNotificationService()
