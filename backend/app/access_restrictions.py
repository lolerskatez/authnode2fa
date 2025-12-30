"""
Access Restrictions Module for AuthNode2FA

Provides IP-based and geographic access control functionality:
- IP range validation using CIDR notation
- Geographic restrictions using country codes
- Integration with login/signup endpoints
- Admin configuration endpoints

Supports both allowlists (only specified IPs/countries) and blocklists (block specified IPs/countries).
"""

import ipaddress
import requests
import os
from typing import List, Dict, Optional, Tuple
from ipaddress import IPv4Network, IPv6Network


class AccessRestrictions:
    """Handles IP and geographic access restrictions"""

    def __init__(self):
        # Use a free geo-IP service (ipapi.co) for country lookup
        self.geo_api_url = "http://ip-api.com/json/{}"
        self.geo_cache = {}  # Simple in-memory cache for geo lookups

    def check_ip_restrictions(self, ip_address: str, settings) -> Tuple[bool, Optional[str]]:
        """
        Check if IP address is allowed based on configured restrictions.

        Returns: (is_allowed: bool, reason: str or None)
        """
        if not settings.ip_restrictions_enabled:
            return True, None

        try:
            client_ip = ipaddress.ip_address(ip_address)
        except ValueError:
            return False, "Invalid IP address format"

        # Check blocked IP ranges first
        for cidr in settings.blocked_ip_ranges or []:
            try:
                network = ipaddress.ip_network(cidr, strict=False)
                if client_ip in network:
                    return False, f"IP address {ip_address} is in blocked range {cidr}"
            except ValueError:
                continue  # Skip invalid CIDR ranges

        # If allowlist is configured, IP must be in allowed ranges
        if settings.allowed_ip_ranges:
            for cidr in settings.allowed_ip_ranges:
                try:
                    network = ipaddress.ip_network(cidr, strict=False)
                    if client_ip in network:
                        return True, None
                except ValueError:
                    continue  # Skip invalid CIDR ranges

            # IP not in any allowed range
            return False, f"IP address {ip_address} is not in allowed ranges"

        # No restrictions or IP passed all checks
        return True, None

    def check_geo_restrictions(self, ip_address: str, settings) -> Tuple[bool, Optional[str]]:
        """
        Check if geographic location is allowed based on configured restrictions.

        Returns: (is_allowed: bool, reason: str or None)
        """
        if not settings.geo_restrictions_enabled:
            return True, None

        country_code = self._get_country_code(ip_address)
        if not country_code:
            # If we can't determine location, allow access (fail open for reliability)
            return True, None

        # Check blocked countries first
        if country_code in (settings.blocked_countries or []):
            return False, f"Access blocked for country {country_code}"

        # If allowlist is configured, country must be in allowed list
        if settings.allowed_countries:
            if country_code not in settings.allowed_countries:
                return False, f"Access not allowed for country {country_code}"
            return True, None

        # No restrictions or country passed all checks
        return True, None

    def check_all_restrictions(self, ip_address: str, settings) -> Tuple[bool, Optional[str]]:
        """
        Check both IP and geographic restrictions.

        Returns: (is_allowed: bool, reason: str or None)
        """
        # Check IP restrictions
        ip_allowed, ip_reason = self.check_ip_restrictions(ip_address, settings)
        if not ip_allowed:
            return False, ip_reason

        # Check geographic restrictions
        geo_allowed, geo_reason = self.check_geo_restrictions(ip_address, settings)
        if not geo_allowed:
            return False, geo_reason

        return True, None

    def _get_country_code(self, ip_address: str) -> Optional[str]:
        """
        Get country code for IP address using ip-api.com
        Returns ISO 3166-1 alpha-2 country code or None if lookup fails
        """
        # Check cache first
        if ip_address in self.geo_cache:
            return self.geo_cache[ip_address]

        try:
            response = requests.get(self.geo_api_url.format(ip_address), timeout=3)
            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'success':
                country_code = data.get('countryCode')
                # Cache the result
                self.geo_cache[ip_address] = country_code
                return country_code
            else:
                # Cache failure to avoid repeated requests
                self.geo_cache[ip_address] = None
                return None

        except (requests.RequestException, ValueError, KeyError):
            # Cache failure to avoid repeated requests
            self.geo_cache[ip_address] = None
            return None

    def validate_cidr_ranges(self, cidr_list: List[str]) -> List[str]:
        """
        Validate a list of CIDR ranges.
        Returns list of valid CIDR ranges, silently filtering out invalid ones.
        """
        valid_ranges = []
        for cidr in cidr_list:
            try:
                ipaddress.ip_network(cidr, strict=False)
                valid_ranges.append(cidr)
            except ValueError:
                continue  # Skip invalid ranges
        return valid_ranges

    def validate_country_codes(self, country_codes: List[str]) -> List[str]:
        """
        Validate a list of ISO 3166-1 alpha-2 country codes.
        Returns list of valid country codes (basic validation).
        """
        # Basic validation: 2-letter uppercase codes
        valid_codes = []
        for code in country_codes:
            if isinstance(code, str) and len(code) == 2 and code.isalpha():
                valid_codes.append(code.upper())
        return valid_codes


# Global instance
access_restrictions = AccessRestrictions()


def check_access_restrictions(ip_address: str, settings) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to check all access restrictions.

    Returns: (is_allowed: bool, reason: str or None)
    """
    return access_restrictions.check_all_restrictions(ip_address, settings)
