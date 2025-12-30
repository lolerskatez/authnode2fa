"""
Tests for applications management endpoints.
"""

import pytest


class TestApplications:
    """Test application CRUD operations"""

    def test_create_application(self, authenticated_client):
        """Test creating a new application"""
        response = authenticated_client.post("/api/applications/", json={
            "name": "Test App",
            "secret": "JBSWY3DPEHPK3PXP",  # Valid base32 secret
            "category": "Personal"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test App"
        assert data["category"] == "Personal"
        assert "id" in data

    def test_get_applications(self, authenticated_client, test_application):
        """Test getting user's applications"""
        response = authenticated_client.get("/api/applications/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Check that our test application is in the list
        app_names = [app["name"] for app in data]
        assert test_application.name in app_names

    def test_update_application(self, authenticated_client, test_application):
        """Test updating an application"""
        response = authenticated_client.put(f"/api/applications/{test_application.id}", json={
            "name": "Updated App Name",
            "category": "Work"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated App Name"
        assert data["category"] == "Work"

    def test_delete_application(self, authenticated_client, test_application):
        """Test deleting an application"""
        response = authenticated_client.delete(f"/api/applications/{test_application.id}")

        assert response.status_code == 200

        # Verify it's deleted
        response = authenticated_client.get(f"/api/applications/{test_application.id}")
        assert response.status_code == 404

    def test_get_code(self, authenticated_client, test_application):
        """Test getting TOTP code for an application"""
        response = authenticated_client.get(f"/api/applications/{test_application.id}/code")

        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert len(data["code"]) == 6  # TOTP codes are 6 digits
        assert data["code"].isdigit()

    def test_access_other_user_application(self, client, authenticated_client, test_application):
        """Test that users cannot access other users' applications"""
        # Create another user and application
        signup_response = client.post("/api/auth/signup", json={
            "email": "other@example.com",
            "username": "otheruser",
            "name": "Other User",
            "password": "OtherPass123!"
        })
        assert signup_response.status_code == 200

        # Try to access the first user's application with the second user's token
        login_response = client.post("/api/auth/login", json={
            "email": "other@example.com",
            "password": "OtherPass123!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Set the token for the client
        client.headers["Authorization"] = f"Bearer {token}"

        # Try to access the original application
        response = client.get(f"/api/applications/{test_application.id}/code")
        assert response.status_code == 404  # Should not be found


class TestBulkOperations:
    """Test bulk operations on applications"""

    def test_bulk_delete_applications(self, authenticated_client, test_application, db_session, test_user):
        """Test bulk deletion of applications"""
        # Create additional test applications
        from app import crud
        app_data = [
            {"name": "App 1", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"},
            {"name": "App 2", "secret": "JBSWY3DPEHPK3PXP", "category": "Work"},
            {"name": "App 3", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"}
        ]

        created_apps = []
        for data in app_data:
            app = crud.create_application(db_session, data, test_user.id)
            created_apps.append(app)
        db_session.commit()

        # Get all app IDs
        all_app_ids = [test_application.id] + [app.id for app in created_apps]

        # Bulk delete
        response = authenticated_client.delete("/api/applications/bulk", json=all_app_ids)

        assert response.status_code == 200
        data = response.json()
        assert data["deleted_count"] == len(all_app_ids)
        assert "Successfully deleted" in data["message"]

    def test_bulk_update_category(self, authenticated_client, test_application, db_session, test_user):
        """Test bulk category update"""
        # Create additional test applications
        from app import crud
        app_data = [
            {"name": "Personal App 1", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"},
            {"name": "Personal App 2", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"}
        ]

        created_apps = []
        for data in app_data:
            app = crud.create_application(db_session, data, test_user.id)
            created_apps.append(app)
        db_session.commit()

        # Get app IDs
        app_ids = [app.id for app in created_apps]

        # Bulk update category
        response = authenticated_client.put("/api/applications/bulk/category", json={
            "account_ids": app_ids,
            "category": "Work"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == len(app_ids)
        assert data["new_category"] == "Work"

    def test_bulk_update_favorite(self, authenticated_client, test_application, db_session, test_user):
        """Test bulk favorite update"""
        # Create additional test applications
        from app import crud
        app_data = [
            {"name": "App 1", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"},
            {"name": "App 2", "secret": "JBSWY3DPEHPK3PXP", "category": "Work"}
        ]

        created_apps = []
        for data in app_data:
            app = crud.create_application(db_session, data, test_user.id)
            created_apps.append(app)
        db_session.commit()

        # Get app IDs
        app_ids = [app.id for app in created_apps]

        # Bulk update favorite status
        response = authenticated_client.put("/api/applications/bulk/favorite", json={
            "account_ids": app_ids,
            "favorite": True
        })

        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == len(app_ids)
        assert data["favorite_status"] is True


class TestSearchAndFiltering:
    """Test application search and filtering"""

    def test_search_applications(self, authenticated_client, test_application, db_session, test_user):
        """Test searching applications by name"""
        # Create test applications with different names
        from app import crud
        app_data = [
            {"name": "Google Account", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"},
            {"name": "GitHub Account", "secret": "JBSWY3DPEHPK3PXP", "category": "Work"},
            {"name": "Amazon Account", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"}
        ]

        for data in app_data:
            crud.create_application(db_session, data, test_user.id)
        db_session.commit()

        # Search for "Account"
        response = authenticated_client.get("/api/applications/?q=Account")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3  # All apps contain "Account"

    def test_filter_by_category(self, authenticated_client, test_application, db_session, test_user):
        """Test filtering applications by category"""
        # Create test applications
        from app import crud
        app_data = [
            {"name": "Personal App", "secret": "JBSWY3DPEHPK3PXP", "category": "Personal"},
            {"name": "Work App", "secret": "JBSWY3DPEHPK3PXP", "category": "Work"}
        ]

        for data in app_data:
            crud.create_application(db_session, data, test_user.id)
        db_session.commit()

        # Filter by Personal category
        response = authenticated_client.get("/api/applications/?category=Personal")

        assert response.status_code == 200
        data = response.json()
        # Should include the original test app (Personal) plus the new Personal app
        personal_apps = [app for app in data if app["category"] == "Personal"]
        assert len(personal_apps) >= 2
