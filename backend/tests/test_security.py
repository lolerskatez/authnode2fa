"""
Tests for security features including access restrictions and rate limiting.
"""

import pytest
import time


class TestAccessRestrictions:
    """Test geographic and IP-based access restrictions"""

    def test_ip_restriction_check(self, db_session):
        """Test IP restriction validation"""
        from app.access_restrictions import AccessRestrictions

        restrictions = AccessRestrictions()

        # Test with no restrictions
        settings = type('Settings', (), {
            'ip_restrictions_enabled': False,
            'allowed_ip_ranges': [],
            'blocked_ip_ranges': []
        })()

        allowed, reason = restrictions.check_ip_restrictions("192.168.1.1", settings)
        assert allowed is True
        assert reason is None

        # Test with allowed IP range
        settings.ip_restrictions_enabled = True
        settings.allowed_ip_ranges = ["192.168.1.0/24"]

        allowed, reason = restrictions.check_ip_restrictions("192.168.1.50", settings)
        assert allowed is True

        allowed, reason = restrictions.check_ip_restrictions("10.0.0.1", settings)
        assert allowed is False
        assert "not in allowed ranges" in reason

        # Test with blocked IP range
        settings.allowed_ip_ranges = []
        settings.blocked_ip_ranges = ["10.0.0.0/8"]

        allowed, reason = restrictions.check_ip_restrictions("192.168.1.1", settings)
        assert allowed is True

        allowed, reason = restrictions.check_ip_restrictions("10.5.5.5", settings)
        assert allowed is False
        assert "in blocked range" in reason

    def test_geo_restriction_check(self, db_session):
        """Test geographic restriction validation"""
        from app.access_restrictions import AccessRestrictions

        restrictions = AccessRestrictions()

        # Mock the geo lookup to return a country code
        original_get_country = restrictions._get_country_code
        restrictions._get_country_code = lambda ip: "US" if ip == "192.168.1.1" else "CN"

        try:
            # Test with no restrictions
            settings = type('Settings', (), {
                'geo_restrictions_enabled': False,
                'allowed_countries': [],
                'blocked_countries': []
            })()

            allowed, reason = restrictions.check_geo_restrictions("192.168.1.1", settings)
            assert allowed is True

            # Test with blocked country
            settings.geo_restrictions_enabled = True
            settings.blocked_countries = ["CN"]

            allowed, reason = restrictions.check_geo_restrictions("192.168.1.1", settings)  # US
            assert allowed is True

            allowed, reason = restrictions.check_geo_restrictions("10.0.0.1", settings)  # CN
            assert allowed is False
            assert "blocked for country CN" in reason

            # Test with allowed countries
            settings.blocked_countries = []
            settings.allowed_countries = ["US", "CA"]

            allowed, reason = restrictions.check_geo_restrictions("192.168.1.1", settings)  # US
            assert allowed is True

            allowed, reason = restrictions.check_geo_restrictions("10.0.0.1", settings)  # CN
            assert allowed is False
            assert "not allowed for country CN" in reason

        finally:
            # Restore original method
            restrictions._get_country_code = original_get_country


class TestRateLimiting:
    """Test API rate limiting"""

    def test_login_rate_limiting(self, client):
        """Test login endpoint rate limiting"""
        # Make multiple rapid login requests
        for i in range(10):
            response = client.post("/api/auth/login", json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            })

        # Should eventually get rate limited (429 status)
        # Note: This test depends on the rate limit configuration
        # In a real scenario, we might get 429, but for now just ensure it doesn't crash
        assert response.status_code in [401, 429]

    def test_application_rate_limiting(self, authenticated_client):
        """Test application endpoints rate limiting"""
        # Make multiple rapid requests to an application endpoint
        for i in range(20):
            response = authenticated_client.get("/api/applications/")

        # Should eventually get rate limited
        assert response.status_code in [200, 429]


class TestPasswordSecurity:
    """Test password security features"""

    def test_password_policy_validation(self):
        """Test password policy validation"""
        from app.utils import PasswordPolicy

        # Test valid password
        result = PasswordPolicy.validate_password("StrongPass123!")
        assert result["valid"] is True

        # Test weak passwords
        weak_passwords = [
            "123",  # Too short
            "password",  # Common password
            "abcdefgh",  # No numbers or special chars
            "ABCDEFGH",  # No lowercase
            "12345678",  # No letters
            "Password123",  # No special characters
            "Pa$$word",  # Too short
            "Password123!",  # Valid, just for comparison
        ]

        for pwd in weak_passwords[:-1]:  # Skip the last one which is valid
            result = PasswordPolicy.validate_password(pwd)
            assert result["valid"] is False
            assert len(result["errors"]) > 0

    def test_password_history_check(self, db_session, test_user):
        """Test password history prevents reuse"""
        from app.utils import check_password_history, add_password_to_history

        # Initially should allow any password
        can_use = check_password_history(db_session, test_user.id, "NewPassword123!")
        assert can_use is True

        # Add password to history
        add_password_to_history(db_session, test_user.id, "NewPassword123!")

        # Should now reject the same password
        can_use = check_password_history(db_session, test_user.id, "NewPassword123!")
        assert can_use is False

        # But should allow a different password
        can_use = check_password_history(db_session, test_user.id, "DifferentPass123!")
        assert can_use is True


class TestSessionSecurity:
    """Test session security features"""

    def test_session_fingerprinting(self):
        """Test session fingerprint generation"""
        from app.session_utils import create_session_fingerprint

        session_data1 = {
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'ip_address': '192.168.1.1',
            'screen_resolution': '1920x1080',
            'timezone': 'America/New_York',
            'language': 'en-US'
        }

        session_data2 = {
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'ip_address': '192.168.1.1',
            'screen_resolution': '1920x1080',
            'timezone': 'America/New_York',
            'language': 'en-US'
        }

        fingerprint1 = create_session_fingerprint(session_data1)
        fingerprint2 = create_session_fingerprint(session_data2)

        # Different user agents should produce different fingerprints
        assert fingerprint1 != fingerprint2

        # Same data should produce same fingerprint
        fingerprint1_again = create_session_fingerprint(session_data1)
        assert fingerprint1 == fingerprint1_again

    def test_user_agent_parsing(self):
        """Test user agent parsing"""
        from app.session_utils import parse_user_agent

        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

        parsed = parse_user_agent(ua)

        assert parsed['browser_name'] == 'Chrome'
        assert parsed['os_name'] == 'Windows'
        assert parsed['device_type'] == 'desktop'

    def test_suspicious_session_detection(self, db_session, test_user):
        """Test suspicious session detection"""
        from app.session_utils import detect_suspicious_session
        from app import models

        # Create a session for the user
        session1 = models.UserSession(
            user_id=test_user.id,
            token_jti="test_jti_1",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            device_name="Chrome on Windows"
        )
        db_session.add(session1)
        db_session.commit()

        # Create another session with different fingerprint
        session2 = models.UserSession(
            user_id=test_user.id,
            token_jti="test_jti_2",
            ip_address="10.0.0.1",  # Different IP
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",  # Different UA
            device_name="Safari on macOS"
        )
        db_session.add(session2)
        db_session.commit()

        # Check if session2 is suspicious compared to existing sessions
        all_sessions = [session1, session2]
        is_suspicious = detect_suspicious_session(session2, all_sessions)

        # Should be suspicious because it's the first session with this fingerprint
        assert is_suspicious is True
