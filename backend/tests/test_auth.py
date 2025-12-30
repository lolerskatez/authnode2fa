"""
Tests for authentication endpoints.
"""

import pytest


class TestAuthentication:
    """Test authentication functionality"""

    def test_user_registration(self, client):
        """Test user registration"""
        response = client.post("/api/auth/signup", json={
            "email": "newuser@example.com",
            "username": "newuser",
            "name": "New User",
            "password": "SecurePass123!"
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_user_login(self, client, test_user):
        """Test user login"""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "testpassword123"
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_invalid_login(self, client):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })

        assert response.status_code == 401

    def test_duplicate_user_registration(self, client, test_user):
        """Test registration with existing email"""
        response = client.post("/api/auth/signup", json={
            "email": test_user.email,  # Existing email
            "username": "differentuser",
            "name": "Different User",
            "password": "SecurePass123!"
        })

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_weak_password_registration(self, client):
        """Test registration with weak password"""
        response = client.post("/api/auth/signup", json={
            "email": "weakpass@example.com",
            "username": "weakuser",
            "name": "Weak User",
            "password": "123"  # Too short
        })

        assert response.status_code == 400
        assert "Password does not meet requirements" in response.json()["detail"]

    def test_get_current_user(self, authenticated_client, test_user):
        """Test getting current user info"""
        response = authenticated_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["name"] == test_user.name

    def test_unauthorized_access(self, client):
        """Test accessing protected endpoint without authentication"""
        response = client.get("/api/auth/me")

        assert response.status_code == 401


class TestPasswordReset:
    """Test password reset functionality"""

    def test_password_reset_request(self, client, test_user):
        """Test password reset request"""
        response = client.post("/api/auth/password-reset", json={
            "email": test_user.email
        })

        # Should return success regardless of whether user exists (security)
        assert response.status_code == 200
        assert "message" in response.json()

    def test_password_reset_with_invalid_token(self, client):
        """Test password reset with invalid token"""
        response = client.post("/api/auth/password-reset/confirm", json={
            "token": "invalid_token",
            "new_password": "NewSecurePass123!"
        })

        assert response.status_code == 400
        assert "Invalid or expired reset token" in response.json()["detail"]


class TestAccountLockout:
    """Test account lockout functionality"""

    def test_account_lockout_after_failed_attempts(self, client, test_user):
        """Test account gets locked after multiple failed login attempts"""
        # Set environment for faster testing
        import os
        original_max_attempts = os.environ.get("MAX_FAILED_LOGIN_ATTEMPTS", "5")
        original_lockout_minutes = os.environ.get("ACCOUNT_LOCKOUT_MINUTES", "15")

        os.environ["MAX_FAILED_LOGIN_ATTEMPTS"] = "3"
        os.environ["ACCOUNT_LOCKOUT_MINUTES"] = "1"

        try:
            # Attempt multiple failed logins
            for i in range(4):  # One more than the limit
                response = client.post("/api/auth/login", json={
                    "email": test_user.email,
                    "password": "wrongpassword"
                })
                if i < 3:  # First 3 should fail but not lock
                    assert response.status_code == 401
                else:  # 4th should be locked
                    assert response.status_code == 423
                    assert "locked" in response.json()["detail"].lower()

        finally:
            # Restore environment
            os.environ["MAX_FAILED_LOGIN_ATTEMPTS"] = original_max_attempts
            os.environ["ACCOUNT_LOCKOUT_MINUTES"] = original_lockout_minutes
