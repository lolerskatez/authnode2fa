from pydantic import BaseModel, field_serializer
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    username: str
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    requires_2fa_enrollment: Optional[bool] = None

class User(UserBase):
    id: int
    is_sso_user: bool
    role: str
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    name: str
    secret: str
    backup_key: str
    otp_type: Optional[str] = "TOTP"
    counter: Optional[int] = 0
    icon: Optional[str] = None
    color: Optional[str] = '#6B46C1'
    category: Optional[str] = "Personal"
    favorite: Optional[bool] = False
    display_order: Optional[int] = 0
    username: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    secret: Optional[str] = None
    category: Optional[str] = None
    favorite: Optional[bool] = None
    display_order: Optional[int] = None
    username: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class Application(ApplicationBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class SMTPConfigBase(BaseModel):
    enabled: bool
    host: Optional[str] = None
    port: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str = "SecureAuth"


class SMTPConfigCreate(SMTPConfigBase):
    pass


class SMTPConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class SMTPConfig(SMTPConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserPreferencesBase(BaseModel):
    email_notifications_enabled: bool = False


class UserPreferencesCreate(UserPreferencesBase):
    user_id: int


class UserPreferencesUpdate(BaseModel):
    email_notifications_enabled: Optional[bool] = None


class UserPreferences(UserPreferencesBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GlobalSettingsBase(BaseModel):
    login_page_theme: str = "light"  # light, dark, or auto
    signup_enabled: bool = True  # Whether signup is allowed on the login page
    totp_enabled: bool = False  # Whether 2FA system is enabled
    totp_enforcement: str = "optional"  # optional, admin_only, or required_all
    totp_grace_period_days: int = 7  # Days before forced enrollment
    webauthn_enabled: bool = True  # Whether WebAuthn/Security Keys are enabled
    webauthn_enforcement: str = "optional"  # optional, admin_only, or required_all


class GlobalSettingsCreate(GlobalSettingsBase):
    pass


class GlobalSettingsUpdate(BaseModel):
    login_page_theme: Optional[str] = None
    signup_enabled: Optional[bool] = None
    totp_enabled: Optional[bool] = None
    totp_enforcement: Optional[str] = None
    totp_grace_period_days: Optional[int] = None
    webauthn_enabled: Optional[bool] = None
    webauthn_enforcement: Optional[str] = None
    password_reset_enabled: Optional[bool] = None


class GlobalSettings(GlobalSettingsBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OIDCConfigBase(BaseModel):
    enabled: bool = False
    provider_name: str = "Custom OIDC Provider"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    issuer_url: Optional[str] = None
    authorization_endpoint: Optional[str] = None
    token_endpoint: Optional[str] = None
    userinfo_endpoint: Optional[str] = None
    jwks_uri: Optional[str] = None
    logout_endpoint: Optional[str] = None
    redirect_uri: Optional[str] = None
    post_logout_redirect_uri: Optional[str] = None
    scope: str = "openid email profile"
    admin_groups: List[str] = ["administrators", "admins"]
    user_groups: List[str] = ["users"]


class OIDCConfigCreate(OIDCConfigBase):
    pass


class OIDCConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    provider_name: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    issuer_url: Optional[str] = None
    authorization_endpoint: Optional[str] = None
    token_endpoint: Optional[str] = None
    userinfo_endpoint: Optional[str] = None
    jwks_uri: Optional[str] = None
    logout_endpoint: Optional[str] = None
    redirect_uri: Optional[str] = None
    post_logout_redirect_uri: Optional[str] = None
    scope: Optional[str] = None
    admin_groups: Optional[List[str]] = None
    user_groups: Optional[List[str]] = None


class OIDCConfig(OIDCConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TOTP2FASetup(BaseModel):
    """2FA setup request with TOTP code verification"""
    totp_code: str


class TOTP2FAVerify(BaseModel):
    """2FA verification request during login"""
    totp_code: str


class TOTP2FASetupResponse(BaseModel):
    """Response containing TOTP secret and QR code"""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    backup_codes: List[str]  # Single-use backup codes


class TOTP2FADisable(BaseModel):
    """Request to disable 2FA with password confirmation"""
    password: str
    totp_code: Optional[str] = None  # Optional if 2FA is already enabled


# Password Reset Schemas
class PasswordResetRequest(BaseModel):
    """Request to initiate password reset"""
    email: str


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token and new password"""
    token: str
    new_password: str


# Session Management Schemas
class UserSessionBase(BaseModel):
    device_name: Optional[str] = None
    ip_address: Optional[str] = None


class UserSessionResponse(UserSessionBase):
    id: int
    user_id: int
    token_jti: str
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    last_activity: datetime
    created_at: datetime
    expires_at: datetime
    
    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    sessions: List[UserSessionResponse]
    current_session_id: Optional[str] = None  # JWT ID (jti) - UUID string


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    status: str
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        """Serialize datetime as ISO 8601 with UTC timezone"""
        if value and value.tzinfo is None:
            # If naive datetime (no timezone), assume it's UTC
            return value.isoformat() + 'Z'
        return value.isoformat() if value else None
    
    class Config:
        from_attributes = True


class AuditLogFilterRequest(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


# Export/Import Schemas
class ApplicationExportData(BaseModel):
    """Single application for export"""
    name: str
    secret: str
    otp_type: Optional[str] = "TOTP"
    counter: Optional[int] = 0
    icon: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    favorite: Optional[bool] = False
    display_order: Optional[int] = 0
    username: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class ExportResponse(BaseModel):
    """Response format for account export"""
    version: str = "1.0"
    export_date: datetime
    account_count: int
    accounts: List[ApplicationExportData]


class ImportRequest(BaseModel):
    """Request format for account import"""
    accounts: List[ApplicationExportData]
    conflict_action: str = "skip"  # skip, overwrite, or merge


class ImportResponse(BaseModel):
    """Response from import operation"""
    imported: int
    skipped: int
    overwritten: int
    errors: List[str] = []


# WebAuthn Schemas
class WebAuthnCredentialBase(BaseModel):
    credential_id: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    transports: Optional[List[str]] = None


class WebAuthnCredentialCreate(WebAuthnCredentialBase):
    public_key: str
    sign_count: int = 0


class WebAuthnCredential(WebAuthnCredentialBase):
    id: int
    user_id: int
    sign_count: int
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebAuthnRegistrationOptions(BaseModel):
    """Options sent to browser for WebAuthn registration"""
    challenge: str  # Base64 encoded
    rp: Dict[str, Any]  # Relying Party info
    user: Dict[str, Any]  # User info
    pubKeyCredParams: List[Dict[str, Any]]
    authenticatorSelection: Dict[str, Any]
    timeout: int
    attestation: str


class WebAuthnRegistrationResponse(BaseModel):
    """Response from browser after WebAuthn registration"""
    id: str
    rawId: str
    type: str
    response: Dict[str, Any]


class WebAuthnAuthenticationOptions(BaseModel):
    """Options sent to browser for WebAuthn authentication"""
    challenge: str  # Base64 encoded
    timeout: int
    rpId: str
    allowCredentials: List[Dict[str, Any]]
    userVerification: str


class WebAuthnAuthenticationResponse(BaseModel):
    """Response from browser after WebAuthn authentication"""
    id: str
    rawId: str
    type: str
    response: Dict[str, Any]


class WebAuthnRegistrationRequest(BaseModel):
    """Request to initiate WebAuthn registration"""
    device_name: Optional[str] = None


class WebAuthnRegistrationComplete(BaseModel):
    """Request to complete WebAuthn registration"""
    device_name: Optional[str] = None
    credential: WebAuthnRegistrationResponse


class WebAuthnAuthenticationRequest(BaseModel):
    """Request to initiate WebAuthn authentication"""
    email: str


class WebAuthnAuthenticationComplete(BaseModel):
    """Request to complete WebAuthn authentication"""
    email: str
    credential: WebAuthnAuthenticationResponse


class WebAuthnStatus(BaseModel):
    """WebAuthn status for user"""
    enabled: bool
    credentials_count: int
    credentials: List[WebAuthnCredential]


class InAppNotification(BaseModel):
    """In-app notification schema"""
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    details: Optional[Dict[str, Any]] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InAppNotificationCreate(BaseModel):
    """Create in-app notification"""
    notification_type: str
    title: str
    message: str
    details: Optional[Dict[str, Any]] = None


class NotificationPreferences(BaseModel):
    """User notification preferences"""
    security_alerts_enabled: bool = True
    login_alerts_enabled: bool = True
    account_change_alerts_enabled: bool = True
    email_notifications: bool = True
    in_app_notifications: bool = True


class APIKeyCreate(BaseModel):
    """Create API key request"""
    name: str
    expires_in_days: Optional[int] = None
    scopes: Optional[List[str]] = ["read:applications", "read:activity"]


class APIKeyResponse(BaseModel):
    """API key response (with actual key only at creation)"""
    id: int
    name: str
    scopes: List[str]
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked: bool
    api_key: Optional[str] = None  # Only included at creation time

    class Config:
        from_attributes = True


class PasswordPolicyUpdate(BaseModel):
    """Update password policy"""
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_numbers: Optional[bool] = None
    require_special_chars: Optional[bool] = None
    special_chars: Optional[str] = None
    password_expiry_days: Optional[int] = None
    password_history_count: Optional[int] = None
    max_login_attempts: Optional[int] = None
    lockout_duration_minutes: Optional[int] = None
    check_breach_database: Optional[bool] = None


class PasswordPolicy(BaseModel):
    """Password policy schema"""
    id: int
    min_length: int
    max_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_numbers: bool
    require_special_chars: bool
    special_chars: str
    password_expiry_days: int
    password_history_count: int
    max_login_attempts: int
    lockout_duration_minutes: int
    check_breach_database: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkUserImportRequest(BaseModel):
    """Bulk user import request"""
    users: List[Dict[str, Any]]
    role: str = "user"  # Default role for imported users
    send_welcome_email: bool = False


class BulkUserImportResponse(BaseModel):
    """Bulk user import response"""
    total: int
    created: int
    skipped: int
    errors: List[Dict[str, str]]


class SyncDeviceRegister(BaseModel):
    """Register sync device request"""
    device_name: str
    device_info: Dict[str, Any] = {}


class SyncDevice(BaseModel):
    """Sync device schema"""
    id: int
    name: str
    device_info: Dict[str, Any]
    last_sync_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SyncPushRequest(BaseModel):
    """Push sync data"""
    data: Dict[str, Any]


class SyncPullRequest(BaseModel):
    """Pull sync data"""
    last_sync: Optional[datetime] = None


class ConflictResolution(BaseModel):
    """Resolve sync conflict"""
    resolution: str  # keep_local, keep_remote, merge


# Notification Schemas

class InAppNotification(BaseModel):
    """In-app notification model"""
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    details: Optional[Dict[str, Any]] = None
    read: bool = False
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserNotificationPreferences(BaseModel):
    """User notification preferences"""
    id: int
    user_id: int

    # Email preferences
    email_security_alerts: bool = True
    email_2fa_alerts: bool = True
    email_account_alerts: bool = True

    # In-app preferences
    in_app_security_alerts: bool = True
    in_app_2fa_alerts: bool = True
    in_app_account_alerts: bool = True

    # Push notification preferences (future use)
    push_security_alerts: bool = True
    push_2fa_alerts: bool = True
    push_account_alerts: bool = True

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationCount(BaseModel):
    """Notification count response"""
    unread: int
    total: int


class CreateNotificationRequest(BaseModel):
    """Request to create a notification (admin/internal use)"""
    user_id: int
    notification_type: str
    title: str
    message: str
    details: Optional[Dict[str, Any]] = None


class UpdateNotificationPreferences(BaseModel):
    """Update notification preferences"""
    # Email preferences
    email_security_alerts: Optional[bool] = None
    email_2fa_alerts: Optional[bool] = None
    email_account_alerts: Optional[bool] = None

    # In-app preferences
    in_app_security_alerts: Optional[bool] = None
    in_app_2fa_alerts: Optional[bool] = None
    in_app_account_alerts: Optional[bool] = None

    # Push notification preferences (future use)
    push_security_alerts: Optional[bool] = None
    push_2fa_alerts: Optional[bool] = None
    push_account_alerts: Optional[bool] = None


# Account Sharing Schemas

class AccountShareBase(BaseModel):
    """Base schema for account sharing"""
    permission_level: str = "view"  # view, use, manage
    expires_at: Optional[datetime] = None


class AccountShareCreate(AccountShareBase):
    """Create account share request"""
    shared_with_email: str
    application_id: int


class AccountShare(AccountShareBase):
    """Account share response"""
    id: int
    application_id: int
    owner_id: int
    shared_with_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Related data
    application_name: Optional[str] = None
    shared_with_name: Optional[str] = None
    shared_with_email: Optional[str] = None

    class Config:
        from_attributes = True


class ShareInvitationBase(BaseModel):
    """Base schema for share invitations"""
    invited_email: str
    permission_level: str = "view"
    expires_at: Optional[datetime] = None


class ShareInvitationCreate(ShareInvitationBase):
    """Create share invitation request"""
    application_id: int


class ShareInvitation(ShareInvitationBase):
    """Share invitation response"""
    id: int
    application_id: int
    owner_id: int
    invitation_token: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    # Related data
    application_name: Optional[str] = None
    owner_name: Optional[str] = None

    class Config:
        from_attributes = True


class AcceptShareInvitation(BaseModel):
    """Accept share invitation request"""
    invitation_token: str


class SharedApplication(BaseModel):
    """Application shared with current user"""
    id: int
    name: str
    icon: str
    color: str
    category: str
    favorite: bool
    permission_level: str
    shared_by_name: str
    shared_by_email: str
    shared_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AccountSharingStats(BaseModel):
    """Account sharing statistics"""
    total_shared_by_me: int
    total_shared_with_me: int
    pending_invitations: int
    active_shares: int