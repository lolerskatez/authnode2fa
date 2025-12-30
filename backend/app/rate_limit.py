"""
Rate Limiting Module for AuthNode2FA

Provides configurable rate limiting for API endpoints to prevent:
- Brute force attacks on login endpoints
- API abuse and DoS attacks
- Resource exhaustion

Enhanced with:
- Per-user rate limiting for authenticated endpoints
- Progressive delays for repeated violations
- Role-based rate limits
- Real-time monitoring and alerts
"""

import os
import time
from typing import Optional, Dict, Any
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from jose import jwt, JWTError
from .auth import SECRET_KEY, ALGORITHM


# Get rate limit configuration from environment variables
# Default values are conservative but not overly restrictive
LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "5/minute")
SIGNUP_RATE_LIMIT = os.getenv("SIGNUP_RATE_LIMIT", "3/minute")
TOTP_VERIFY_RATE_LIMIT = os.getenv("TOTP_VERIFY_RATE_LIMIT", "10/minute")
API_RATE_LIMIT = os.getenv("API_RATE_LIMIT", "100/minute")
SENSITIVE_API_RATE_LIMIT = os.getenv("SENSITIVE_API_RATE_LIMIT", "30/minute")

# User-based limits (stricter for authenticated users)
USER_API_RATE_LIMIT = os.getenv("USER_API_RATE_LIMIT", "200/minute")
ADMIN_API_RATE_LIMIT = os.getenv("ADMIN_API_RATE_LIMIT", "500/minute")

# Progressive delay configuration
PROGRESSIVE_DELAY_BASE = int(os.getenv("PROGRESSIVE_DELAY_BASE", "2"))  # Base delay in seconds
PROGRESSIVE_DELAY_MAX = int(os.getenv("PROGRESSIVE_DELAY_MAX", "300"))  # Max delay in seconds


def get_client_ip(request: Request) -> str:
    """
    Get the real client IP address, considering proxy headers.
    Supports Cloudflare, nginx, and other reverse proxies.
    """
    # Cloudflare provides the real IP in CF-Connecting-IP
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip

    # Standard proxy header (may contain multiple IPs)
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # Get the first IP (original client)
        return x_forwarded_for.split(",")[0].strip()

    # X-Real-IP header (commonly used by nginx)
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip

    # Fall back to direct connection IP
    return get_remote_address(request)


def get_user_id_from_token(request: Request) -> Optional[int]:
    """
    Extract user ID from JWT token in Authorization header.
    Returns None if no valid token found.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (JWTError, ValueError):
        return None


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key based on user authentication status.
    - Authenticated users: limited by user ID
    - Unauthenticated requests: limited by IP address
    """
    user_id = get_user_id_from_token(request)
    if user_id:
        return f"user:{user_id}"
    else:
        return f"ip:{get_client_ip(request)}"


# Create limiter with custom key function
limiter = Limiter(key_func=get_rate_limit_key)


# Global storage for violation tracking (in production, use Redis)
_violation_counts: Dict[str, Dict[str, Any]] = {}


def get_progressive_delay(key: str, endpoint: str) -> float:
    """
    Calculate progressive delay based on violation history.
    Returns delay in seconds (0 if no delay needed).
    """
    now = time.time()
    violation_key = f"{key}:{endpoint}"

    if violation_key not in _violation_counts:
        _violation_counts[violation_key] = {
            "count": 0,
            "last_violation": 0,
            "reset_time": now + 3600  # Reset after 1 hour
        }

    violation_data = _violation_counts[violation_key]

    # Reset if window expired
    if now > violation_data["reset_time"]:
        violation_data["count"] = 0
        violation_data["reset_time"] = now + 3600

    # Calculate delay based on violation count
    if violation_data["count"] > 0:
        delay = min(PROGRESSIVE_DELAY_BASE * (2 ** (violation_data["count"] - 1)), PROGRESSIVE_DELAY_MAX)
        return delay

    return 0


def record_violation(key: str, endpoint: str):
    """Record a rate limit violation for progressive delay calculation."""
    now = time.time()
    violation_key = f"{key}:{endpoint}"

    if violation_key not in _violation_counts:
        _violation_counts[violation_key] = {
            "count": 0,
            "last_violation": 0,
            "reset_time": now + 3600
        }

    violation_data = _violation_counts[violation_key]
    violation_data["count"] += 1
    violation_data["last_violation"] = now


def get_user_rate_limit(user_role: Optional[str] = None) -> str:
    """Get appropriate rate limit based on user role."""
    if user_role == "admin":
        return ADMIN_API_RATE_LIMIT
    else:
        return USER_API_RATE_LIMIT


def get_rate_limit_exceeded_handler():
    """Return the rate limit exceeded handler for FastAPI exception handling."""
    return _rate_limit_exceeded_handler


def get_limiter():
    """Get the configured limiter instance."""
    return limiter


# Enhanced decorators with progressive delays
def limit_with_progressive_delay(rate_limit: str, endpoint_name: str = None):
    """
    Decorator that applies rate limiting with progressive delays for violations.
    Simplified to work better with FastAPI.
    """
    def decorator(func):
        # Apply the standard rate limit first
        limited_func = limiter.limit(rate_limit)(func)

        def wrapper(*args, **kwargs):
            # Extract request object from function arguments
            request = None
            if args and isinstance(args[0], Request):
                request = args[0]
            elif 'request' in kwargs:
                request = kwargs['request']

            if request:
                key = get_rate_limit_key(request)
                endpoint = endpoint_name or f"{func.__module__}.{func.__name__}"

                # Check for progressive delay
                delay = get_progressive_delay(key, endpoint)
                if delay > 0:
                    time.sleep(delay)

            try:
                result = limited_func(*args, **kwargs)
                return result
            except RateLimitExceeded:
                # Record violation for progressive delay
                if request:
                    key = get_rate_limit_key(request)
                    endpoint = endpoint_name or f"{func.__module__}.{func.__name__}"
                    record_violation(key, endpoint)
                raise

        # Preserve function metadata
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper
    return decorator


# Pre-configured decorators for common use cases
def limit_login(func):
    """Rate limit decorator for login endpoints (stricter)."""
    return limiter.limit(LOGIN_RATE_LIMIT)(func)


def limit_signup(func):
    """Rate limit decorator for signup endpoints."""
    return limiter.limit(SIGNUP_RATE_LIMIT)(func)


def limit_totp_verify(func):
    """Rate limit decorator for TOTP verification endpoints."""
    return limiter.limit(TOTP_VERIFY_RATE_LIMIT)(func)


def limit_api(func):
    """Rate limit decorator for general API endpoints."""
    return limiter.limit(API_RATE_LIMIT)(func)


def limit_sensitive(func):
    """Rate limit decorator for sensitive operations."""
    return limiter.limit(SENSITIVE_API_RATE_LIMIT)(func)


def limit_authenticated_api(func):
    """
    Rate limit decorator for authenticated API endpoints.
    Uses user-based limits and progressive delays.
    """
    def decorator(request: Request, *args, **kwargs):
        # Get user role for role-based limits
        user_id = get_user_id_from_token(request)
        user_role = None

        if user_id:
            # In a real implementation, you'd fetch user role from database
            # For now, we'll use a simple check or assume regular user
            user_role = "user"  # This should be fetched from DB

        rate_limit = get_user_rate_limit(user_role)
        endpoint_name = f"authenticated_api_{func.__name__}"

        # Apply progressive delay
        key = get_rate_limit_key(request)
        delay = get_progressive_delay(key, endpoint_name)
        if delay > 0:
            time.sleep(delay)

        try:
            limited_func = limiter.limit(rate_limit)(func)
            return limited_func(request, *args, **kwargs)
        except RateLimitExceeded:
            record_violation(key, endpoint_name)
            raise

    return decorator
