from pydantic import BaseModel
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
    icon: Optional[str] = None
    color: Optional[str] = '#6B46C1'
    category: Optional[str] = "Personal"
    favorite: Optional[bool] = False

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    secret: Optional[str] = None
    category: Optional[str] = None
    favorite: Optional[bool] = None

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


class GlobalSettingsCreate(GlobalSettingsBase):
    pass


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