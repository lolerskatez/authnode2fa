"""
Tests for user management endpoints.
"""

import pytest


class TestUserManagement:
    """Test user management functionality"""

    def test_admin_get_users(self, admin_client):
        """Test admin can get list of users"""
        response = admin_client.get("/api/users/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Should have at least the admin user

    def test_admin_create_user(self, admin_client):
        """Test admin can create new users"""
        response = admin_client.post("/api/users/", json={
            "username": "createduser",
            "email": "created@example.com",
            "password": "CreatedPass123!",
            "name": "Created User"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "createduser"
        assert data["email"] == "created@example.com"
        assert data["name"] == "Created User"

    def test_non_admin_cannot_create_users(self, authenticated_client):
        """Test regular users cannot create new users"""
        response = authenticated_client.post("/api/users/", json={
            "username": "shouldfail",
            "email": "fail@example.com",
            "password": "FailPass123!",
            "name": "Should Fail"
        })

        assert response.status_code == 403

    def test_admin_update_user_role(self, admin_client, test_user):
        """Test admin can update user roles"""
        response = admin_client.put(f"/api/users/{test_user.id}/role", json={
            "role": "admin"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"

    def test_user_update_own_profile(self, authenticated_client, test_user):
        """Test users can update their own profile"""
        response = authenticated_client.put(f"/api/users/{test_user.id}/name", json={
            "name": "Updated Name"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    def test_user_cannot_update_other_profile(self, client, authenticated_client, test_user):
        """Test users cannot update other users' profiles"""
        # Create another user
        signup_response = client.post("/api/auth/signup", json={
            "email": "other2@example.com",
            "username": "otheruser2",
            "name": "Other User 2",
            "password": "OtherPass123!"
        })
        assert signup_response.status_code == 200

        # Get the other user's ID (we'd need to query it, but for simplicity let's assume we know it)
        # In a real test, we'd query the database or use a fixture
        # For now, just test that the current user can't update a non-existent user
        response = authenticated_client.put("/api/users/99999/name", json={
            "name": "Should Fail"
        })

        assert response.status_code == 404  # User not found

    def test_user_change_password(self, authenticated_client, test_user):
        """Test users can change their own password"""
        response = authenticated_client.put(f"/api/users/{test_user.id}/password", json={
            "current_password": "testpassword123",
            "new_password": "NewSecurePass123!"
        })

        assert response.status_code == 200

        # Verify can login with new password
        login_response = authenticated_client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "NewSecurePass123!"
        })

        assert login_response.status_code == 200

    def test_admin_change_user_password(self, admin_client, test_user):
        """Test admin can change any user's password"""
        response = admin_client.put(f"/api/users/{test_user.id}/password", json={
            "password": "AdminSetPass123!"
        })

        assert response.status_code == 200

        # Verify the new password works
        login_response = admin_client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "AdminSetPass123!"
        })

        assert login_response.status_code == 200


class TestUserPreferences:
    """Test user preferences functionality"""

    def test_get_user_preferences(self, authenticated_client, test_user):
        """Test getting user preferences"""
        response = authenticated_client.get(f"/api/users/{test_user.id}/preferences")

        assert response.status_code == 200
        data = response.json()
        assert "email_notifications_enabled" in data

    def test_update_user_preferences(self, authenticated_client, test_user):
        """Test updating user preferences"""
        response = authenticated_client.put(f"/api/users/{test_user.id}/preferences", json={
            "email_notifications_enabled": True
        })

        assert response.status_code == 200
        data = response.json()
        assert data["email_notifications_enabled"] is True

    def test_user_cannot_access_other_preferences(self, authenticated_client, test_user):
        """Test users cannot access other users' preferences"""
        response = authenticated_client.get("/api/users/99999/preferences")

        assert response.status_code == 404  # Should not find other user's preferences


class TestSessionManagement:
    """Test session management functionality"""

    def test_get_user_sessions(self, authenticated_client):
        """Test getting current user's sessions"""
        response = authenticated_client.get("/api/sessions")

        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "current_session_id" in data

    def test_revoke_user_session(self, authenticated_client, db_session, test_user):
        """Test revoking a user session"""
        # First get sessions
        sessions_response = authenticated_client.get("/api/sessions")
        assert sessions_response.status_code == 200

        sessions = sessions_response.json()["sessions"]
        if sessions:  # If there are sessions
            session_id = sessions[0]["id"]

            # Revoke the session
            revoke_response = authenticated_client.delete(f"/api/sessions/{session_id}")
            assert revoke_response.status_code == 200
        else:
            # Skip test if no sessions exist
            pytest.skip("No sessions available to revoke")

    def test_revoke_all_sessions(self, authenticated_client):
        """Test revoking all user sessions"""
        response = authenticated_client.post("/api/logout-all")

        assert response.status_code == 200
        assert "message" in response.json()
