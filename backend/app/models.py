from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String, nullable=True)  # Nullable for SSO users
    oidc_id = Column(String, unique=True, index=True, nullable=True)
    is_sso_user = Column(Boolean, default=False)  # True for SSO users, False for local users
    role = Column(String, default="user")  # admin or user
    settings = Column(JSON, default={"theme": "light", "autoLock": 5, "codeFormat": "spaced"})  # User preferences
    totp_secret = Column(String, nullable=True)  # TOTP secret for 2FA (encrypted)
    totp_enabled = Column(Boolean, default=False)  # Whether TOTP 2FA is enabled

    # Account lockout fields
    failed_login_attempts = Column(Integer, default=0)  # Counter for failed login attempts
    locked_until = Column(DateTime, nullable=True)  # When account unlocks (None if not locked)
    last_failed_login = Column(DateTime, nullable=True)  # Timestamp of last failed login attempt

    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="owner")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    icon = Column(String, nullable=True, default=None)  # Custom emoji or icon
    color = Column(String, nullable=True, default='#6B46C1')  # Background color for the icon
    secret = Column(Text)  # Encrypted
    backup_key = Column(String)
    otp_type = Column(String, default="TOTP")  # TOTP or HOTP
    counter = Column(Integer, default=0)  # For HOTP counter
    category = Column(String, default="Personal")  # Work, Personal, Security
    favorite = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)  # For user-defined ordering
    username = Column(String, nullable=True)  # Username for this account
    url = Column(String, nullable=True)  # Website/service URL
    notes = Column(Text, nullable=True)  # User notes and reminders
    custom_fields = Column(JSON, nullable=True)  # Flexible custom fields
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="applications")


class SMTPConfig(Base):
    __tablename__ = "smtp_config"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)
    host = Column(String, nullable=True)
    port = Column(Integer, default=587)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)  # Should be encrypted in production
    from_email = Column(String, nullable=True)
    from_name = Column(String, default="SecureAuth")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    email_notifications_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)
    login_page_theme = Column(String, default="light")  # Theme for login/signup page: light, dark, or auto
    signup_enabled = Column(Boolean, default=True)  # Whether signup is allowed on the login page
    totp_enabled = Column(Boolean, default=False)  # Whether 2FA system is enabled
    totp_enforcement = Column(String, default="optional")  # optional, admin_only, or required_all
    totp_grace_period_days = Column(Integer, default=7)  # Days before forced enrollment
    webauthn_enabled = Column(Boolean, default=True)  # Whether WebAuthn/Security Keys are enabled
    webauthn_enforcement = Column(String, default="optional")  # optional, admin_only, or required_all
    password_reset_enabled = Column(Boolean, default=True)  # Whether password reset is allowed (requires SMTP)
    
    # Access restrictions
    ip_restrictions_enabled = Column(Boolean, default=False)  # Whether IP restrictions are enabled
    allowed_ip_ranges = Column(JSON, default=[])  # List of allowed IP ranges in CIDR notation
    blocked_ip_ranges = Column(JSON, default=[])  # List of blocked IP ranges in CIDR notation
    geo_restrictions_enabled = Column(Boolean, default=False)  # Whether geographic restrictions are enabled
    allowed_countries = Column(JSON, default=[])  # List of allowed country codes (ISO 3166-1 alpha-2)
    blocked_countries = Column(JSON, default=[])  # List of blocked country codes
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OIDCConfig(Base):
    __tablename__ = "oidc_config"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)
    provider_name = Column(String, default="Custom OIDC Provider")
    client_id = Column(String, nullable=True)
    client_secret = Column(String, nullable=True)  # Should be encrypted in production
    issuer_url = Column(String, nullable=True)
    authorization_endpoint = Column(String, nullable=True)
    token_endpoint = Column(String, nullable=True)
    userinfo_endpoint = Column(String, nullable=True)
    jwks_uri = Column(String, nullable=True)
    logout_endpoint = Column(String, nullable=True)
    redirect_uri = Column(String, nullable=True)
    post_logout_redirect_uri = Column(String, nullable=True)
    scope = Column(String, default="openid email profile")
    admin_groups = Column(JSON, default=["administrators", "admins"])  # Groups that map to admin role
    user_groups = Column(JSON, default=["users"])  # Groups that map to user role
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OIDCState(Base):
    """
    Stores OIDC state tokens for CSRF protection during OAuth2 flows.
    State tokens are hashed for security and automatically expire after 15 minutes.
    """
    __tablename__ = "oidc_states"

    id = Column(Integer, primary_key=True, index=True)
    state_hash = Column(String, unique=True, index=True)  # SHA256 hash of the state token
    nonce = Column(String, nullable=True)  # Optional nonce for ID token validation
    expires_at = Column(DateTime, index=True)  # When this state expires
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class PasswordResetToken(Base):
    """
    Stores password reset tokens for self-service account recovery.
    Tokens are single-use and expire after 1 hour.
    """
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    token_hash = Column(String, unique=True, index=True)  # SHA256 hash of the reset token
    used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, index=True)  # Expires in 1 hour
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")


class BackupCode(Base):
    """
    Stores encrypted backup codes for 2FA recovery.
    Each user gets 10 codes during TOTP setup.
    Each code can be used only once.
    """
    __tablename__ = "backup_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    code_hash = Column(String, unique=True, index=True)  # SHA256 hash of the backup code
    used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")


class UserSession(Base):
    """
    Tracks active user sessions for device management and security.
    Enhanced with comprehensive device fingerprinting and session metadata.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    token_jti = Column(String, unique=True, index=True)  # JWT ID for token revocation

    # Device identification
    device_name = Column(String, nullable=True)  # User-friendly device name
    device_type = Column(String, nullable=True)  # desktop, mobile, tablet
    browser_name = Column(String, nullable=True)  # Chrome, Firefox, Safari, etc.
    browser_version = Column(String, nullable=True)
    os_name = Column(String, nullable=True)  # Windows, macOS, Linux, iOS, Android
    os_version = Column(String, nullable=True)

    # Location and network
    ip_address = Column(String, nullable=True)
    country_code = Column(String, nullable=True)  # ISO country code
    city = Column(String, nullable=True)

    # Device fingerprinting
    user_agent = Column(String, nullable=True)
    screen_resolution = Column(String, nullable=True)  # width x height
    timezone = Column(String, nullable=True)  # timezone offset
    language = Column(String, nullable=True)  # browser language

    # Session metadata
    last_activity = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, index=True)  # Session expiration time
    revoked = Column(Boolean, default=False)
    revoked_reason = Column(String, nullable=True)  # Why session was revoked

    # Security flags
    is_current_session = Column(Boolean, default=False)  # Mark current session
    suspicious_activity = Column(Boolean, default=False)  # Flag suspicious sessions

    user = relationship("User")


class AuditLog(Base):
    """
    Stores audit logs for security and compliance.
    Logs all important actions: login, logout, account changes, etc.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, index=True)  # login, logout, account_added, password_changed, etc
    resource_type = Column(String, nullable=True)  # user, account, settings
    resource_id = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, default="success")  # success, failed
    details = Column(JSON, nullable=True)  # Additional context
    reason = Column(String, nullable=True)  # Failure reason if status is failed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")


class WebAuthnCredential(Base):
    """
    Stores WebAuthn/FIDO2 credentials for hardware security keys.
    Each user can have multiple credentials (different keys).
    """
    __tablename__ = "webauthn_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    # Credential data from WebAuthn registration
    credential_id = Column(String, unique=True, index=True)  # Base64 encoded
    public_key = Column(Text)  # PEM encoded public key
    sign_count = Column(Integer, default=0)

    # Device information
    device_name = Column(String, nullable=True)  # User-friendly name
    device_type = Column(String, nullable=True)  # platform, cross-platform
    transports = Column(JSON, nullable=True)  # Available transports

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    user = relationship("User")


class WebAuthnChallenge(Base):
    """
    Stores WebAuthn challenges for registration and authentication.
    Challenges expire after 5 minutes for security.
    """
    __tablename__ = "webauthn_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    challenge = Column(String, unique=True, index=True)  # Base64 encoded challenge
    challenge_type = Column(String)  # 'registration' or 'authentication'
    expires_at = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CodeGenerationHistory(Base):
    """
    Tracks when TOTP/HOTP codes are generated for each application.
    Helps users see when they last used each account and provides audit trail.
    """
    __tablename__ = "code_generation_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # For easier querying
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationship to application
    application = relationship("Application")

    user = relationship("User")


class InAppNotification(Base):
    """
    Stores in-app notifications for users.
    Notifications are displayed in the UI and can be marked as read.
    """
    __tablename__ = "in_app_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    notification_type = Column(String, index=True)  # security_alert, account_change, system_message
    title = Column(String)
    message = Column(Text)
    details = Column(JSON, nullable=True)  # Additional metadata
    read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User")


class APIKey(Base):
    """
    Stores API keys for third-party integrations and applications.
    Keys are hashed and can be scoped to specific permissions.
    """
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String, index=True)  # User-friendly name
    key_hash = Column(String, unique=True, index=True)  # SHA256 hash of the key
    scopes = Column(JSON, default=[])  # List of permitted scopes
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)  # Optional expiration
    last_used_at = Column(DateTime, nullable=True)  # Track usage
    
    # Lifecycle
    revoked = Column(Boolean, default=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    
    user = relationship("User")


class PasswordPolicy(Base):
    """
    Stores password policy settings for the organization.
    """
    __tablename__ = "password_policy"

    id = Column(Integer, primary_key=True, index=True)
    
    # Length requirements
    min_length = Column(Integer, default=12)
    max_length = Column(Integer, default=128)
    
    # Character requirements
    require_uppercase = Column(Boolean, default=True)
    require_lowercase = Column(Boolean, default=True)
    require_numbers = Column(Boolean, default=True)
    require_special_chars = Column(Boolean, default=True)
    special_chars = Column(String, default="!@#$%^&*()_+-=[]{}|;:,.<>?")
    
    # Expiration and history
    password_expiry_days = Column(Integer, default=90)  # 0 = never expires
    password_history_count = Column(Integer, default=5)  # Prevent reuse
    
    # Lockout policy
    max_login_attempts = Column(Integer, default=5)
    lockout_duration_minutes = Column(Integer, default=15)
    
    # Breach checking
    check_breach_database = Column(Boolean, default=True)  # Use HaveIBeenPwned API
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncDevice(Base):
    """
    Stores registered devices for multi-device synchronization.
    Each device has a unique token and tracks last sync time.
    """
    __tablename__ = "sync_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    device_name = Column(String)  # User-friendly name
    device_token_hash = Column(String, unique=True, index=True)  # SHA256 hash of token
    device_info = Column(JSON)  # Device metadata (OS, browser, etc)
    
    # Sync tracking
    last_sync_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    user = relationship("User")


class SyncPackage(Base):
    """
    Stores synchronization packages for conflict detection and resolution.
    """
    __tablename__ = "sync_packages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    source_device_id = Column(Integer, ForeignKey("sync_devices.id"))
    
    # Sync metadata
    sync_type = Column(String)  # push or pull
    data = Column(JSON)  # Encrypted sync data
    status = Column(String, default="pending")  # pending, synced, conflicted
    
    # Conflict resolution
    conflict_count = Column(Integer, default=0)
    conflict_resolution = Column(String, nullable=True)  # keep_local, keep_remote, merge
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User")
    source_device = relationship("SyncDevice")