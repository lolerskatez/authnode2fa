from pydantic import BaseModel
from typing import Optional, Dict, Any
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


class GlobalSettingsCreate(GlobalSettingsBase):
    pass


class GlobalSettings(GlobalSettingsBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True