"""
Enhanced Session Management Utilities

Provides device fingerprinting, session parsing, and security features.
"""

import re
from typing import Dict, Optional, Tuple
import hashlib


def parse_user_agent(user_agent: str) -> Dict[str, str]:
    """
    Parse user agent string to extract device and browser information.

    Returns dict with browser_name, browser_version, os_name, os_version, device_type
    """
    if not user_agent:
        return {}

    info = {}

    # Browser detection patterns
    browser_patterns = {
        'Chrome': r'Chrome/([0-9.]+)',
        'Firefox': r'Firefox/([0-9.]+)',
        'Safari': r'Version/([0-9.]+).*Safari',
        'Edge': r'Edg/([0-9.]+)',
        'Opera': r'OPR/([0-9.]+)',
        'Internet Explorer': r'MSIE ([0-9.]+)',
    }

    for browser, pattern in browser_patterns.items():
        match = re.search(pattern, user_agent, re.IGNORECASE)
        if match:
            info['browser_name'] = browser
            info['browser_version'] = match.group(1)
            break

    # OS detection patterns
    os_patterns = {
        'Windows': r'Windows NT ([0-9.]+)',
        'macOS': r'Mac OS X ([0-9_.]+)',
        'Linux': r'Linux',
        'Android': r'Android ([0-9.]+)',
        'iOS': r'iPhone OS ([0-9_.]+)',
    }

    for os_name, pattern in os_patterns.items():
        match = re.search(pattern, user_agent, re.IGNORECASE)
        if match:
            info['os_name'] = os_name
            if os_name in ['Windows', 'Android', 'iOS']:
                version = match.group(1).replace('_', '.')
                info['os_version'] = version
            elif os_name == 'macOS':
                version = match.group(1).replace('_', '.')
                info['os_version'] = version
            break

    # Device type detection
    if 'Mobile' in user_agent or 'Android' in user_agent or 'iPhone' in user_agent:
        info['device_type'] = 'mobile'
    elif 'Tablet' in user_agent or 'iPad' in user_agent:
        info['device_type'] = 'tablet'
    else:
        info['device_type'] = 'desktop'

    return info


def generate_device_fingerprint(session_data: Dict[str, str]) -> str:
    """
    Generate a unique fingerprint for the device based on session data.
    This helps identify suspicious logins from unknown devices.
    """
    # Create a hash from key device identifiers
    fingerprint_data = [
        session_data.get('user_agent', ''),
        session_data.get('screen_resolution', ''),
        session_data.get('timezone', ''),
        session_data.get('language', ''),
        session_data.get('ip_address', ''),
    ]

    fingerprint_string = '|'.join(fingerprint_data)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()


def create_session_fingerprint(session_data: Dict[str, str]) -> str:
    """
    Create a more detailed session fingerprint for security monitoring.
    """
    return generate_device_fingerprint(session_data)


def detect_suspicious_session(session, known_sessions) -> bool:
    """
    Check if a session appears suspicious based on device fingerprinting.
    Returns True if suspicious activity is detected.
    """
    if not session or not known_sessions:
        return False

    # Check if this IP/browser combination is seen with this user before
    session_fingerprint = create_session_fingerprint({
        'user_agent': session.user_agent or '',
        'ip_address': session.ip_address or '',
        'screen_resolution': getattr(session, 'screen_resolution', ''),
        'timezone': getattr(session, 'timezone', ''),
        'language': getattr(session, 'language', ''),
    })

    # Count how many known sessions have similar fingerprints
    similar_sessions = 0
    for known_session in known_sessions:
        if known_session.id == session.id:  # Skip current session
            continue

        known_fingerprint = create_session_fingerprint({
            'user_agent': known_session.user_agent or '',
            'ip_address': known_session.ip_address or '',
            'screen_resolution': getattr(known_session, 'screen_resolution', ''),
            'timezone': getattr(known_session, 'timezone', ''),
            'language': getattr(known_session, 'language', ''),
        })

        if session_fingerprint == known_fingerprint:
            similar_sessions += 1

    # If this is a completely new device/IP combination, flag as suspicious
    return similar_sessions == 0


def get_session_display_name(session) -> str:
    """
    Generate a user-friendly display name for a session.
    """
    parts = []

    if getattr(session, 'device_name', None):
        parts.append(session.device_name)
    elif getattr(session, 'browser_name', None):
        browser = session.browser_name
        if getattr(session, 'browser_version', None):
            browser += f" {session.browser_version.split('.')[0]}"  # Major version only
        parts.append(browser)

    if getattr(session, 'os_name', None):
        os_name = session.os_name
        if session.os_name == 'macOS':
            os_name = 'macOS'
        elif session.os_name == 'Windows':
            os_name = 'Windows'
        parts.append(f"on {os_name}")

    if getattr(session, 'city', None) and getattr(session, 'country_code', None):
        location = f"{session.city}, {session.country_code}"
        parts.append(f"in {location}")

    return ' '.join(parts) if parts else "Unknown Device"
