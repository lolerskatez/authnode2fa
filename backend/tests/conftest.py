"""
Pytest configuration and fixtures for AuthNode 2FA backend testing.
"""

import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models
from app import crud
from app import auth as auth_module
import app.utils as utils


# Test database URL - use SQLite in memory for tests
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    """Create test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={
            "check_same_thread": False,
        },
        poolclass=StaticPool,
    )
    return engine


@pytest.fixture
def db_session(engine):
    """Create a test database session with fresh tables"""
    # Create all tables for this test
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

    # Clean up tables after test
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient
    test_client = TestClient(app)

    yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "name": "Test User",
        "password": "testpassword123"
    }

    user = crud.create_user(db_session, user_data)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    """Create a test admin user"""
    user_data = {
        "email": "admin@example.com",
        "username": "admin",
        "name": "Admin User",
        "password": "adminpassword123"
    }

    user = crud.create_user(db_session, user_data)
    user.role = "admin"
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client, test_user):
    """Create a test client with authenticated user"""
    # Login to get token
    login_response = client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "testpassword123"
    })

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Set authorization header for subsequent requests
    client.headers["Authorization"] = f"Bearer {token}"

    return client


@pytest.fixture
def admin_client(client, admin_user):
    """Create a test client with admin authentication"""
    # Login to get token
    login_response = client.post("/api/auth/login", json={
        "email": admin_user.email,
        "password": "adminpassword123"
    })

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Set authorization header for subsequent requests
    client.headers["Authorization"] = f"Bearer {token}"

    return client


@pytest.fixture
def test_application(db_session, test_user):
    """Create a test application"""
    app_data = {
        "name": "Test App",
        "secret": "JBSWY3DPEHPK3PXP",  # Valid base32 secret
        "category": "Personal"
    }

    app = crud.create_application(db_session, app_data, test_user.id)
    db_session.commit()
    db_session.refresh(app)
    return app


# Set up test environment variables
@pytest.fixture(autouse=True)
def setup_test_env():
    """Set up test environment variables"""
    original_env = dict(os.environ)

    # Set test environment variables
    os.environ.update({
        "SECRET_KEY": "test_secret_key_for_testing_only",
        "ENCRYPTION_KEY": "test_encryption_key_for_testing_only_32_chars",
        "DATABASE_URL": TEST_DATABASE_URL,
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "MAX_FAILED_LOGIN_ATTEMPTS": "5",
        "ACCOUNT_LOCKOUT_MINUTES": "15",
    })

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)
