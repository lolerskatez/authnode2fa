"""
Rate Limiting Module for AuthNode2FA

Provides configurable rate limiting for API endpoints to prevent:
- Brute force attacks on login endpoints
- API abuse and DoS attacks
- Resource exhaustion

Uses slowapi (based on limits library) with in-memory storage by default.
For production with multiple workers, use Redis storage.
"""

import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

# Get rate limit configuration from environment variables
# Default values are conservative but not overly restrictive
LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "5/minute")
SIGNUP_RATE_LIMIT = os.getenv("SIGNUP_RATE_LIMIT", "3/minute")
TOTP_VERIFY_RATE_LIMIT = os.getenv("TOTP_VERIFY_RATE_LIMIT", "10/minute")
API_RATE_LIMIT = os.getenv("API_RATE_LIMIT", "100/minute")
SENSITIVE_API_RATE_LIMIT = os.getenv("SENSITIVE_API_RATE_LIMIT", "30/minute")


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


# Create limiter with custom key function
limiter = Limiter(key_func=get_client_ip)


def get_rate_limit_exceeded_handler():
    """Return the rate limit exceeded handler for FastAPI exception handling."""
    return _rate_limit_exceeded_handler


def get_limiter():
    """Get the configured limiter instance."""
    return limiter


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
