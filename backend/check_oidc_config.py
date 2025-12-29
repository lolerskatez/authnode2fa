#!/usr/bin/env python
"""Check and display OIDC configuration"""

import sys
import os
import json

# Set up path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app import models, crud

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    print("\n=== OIDC Configuration Status ===\n")
    
    # Get OIDC config
    config = crud.get_oidc_config(db)
    
    if config:
        print(f"✓ OIDC Config exists (ID: {config.id})")
        print(f"  Enabled: {config.enabled}")
        print(f"  Provider Name: {config.provider_name}")
        print(f"  Client ID: {'Set' if config.client_id else 'Not set'}")
        print(f"  Client Secret: {'Set' if config.client_secret else 'Not set'}")
        print(f"  Issuer URL: {config.issuer_url or 'Not set'}")
        print(f"  Authorization Endpoint: {config.authorization_endpoint or 'Not set'}")
        print(f"  Token Endpoint: {config.token_endpoint or 'Not set'}")
        print(f"  UserInfo Endpoint: {config.userinfo_endpoint or 'Not set'}")
        print(f"  Logout Endpoint: {config.logout_endpoint or 'Not set'}")
        print(f"  Redirect URI: {config.redirect_uri or 'Not set'}")
        print(f"  Post Logout Redirect URI: {config.post_logout_redirect_uri or 'Not set'}")
        print(f"  Scope: {config.scope}")
        print(f"  Admin Groups: {json.dumps(config.admin_groups, indent=2)}")
        print(f"  User Groups: {json.dumps(config.user_groups, indent=2)}")
        
        if config.enabled:
            print("\n✓ OIDC is ENABLED")
        else:
            print("\n⚠ OIDC is DISABLED")
    else:
        print("✗ No OIDC config found in database")
        
finally:
    db.close()
    print("\n")
