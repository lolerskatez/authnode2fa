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
    category = Column(String, default="Personal")  # Work, Personal, Security
    favorite = Column(Boolean, default=False)
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