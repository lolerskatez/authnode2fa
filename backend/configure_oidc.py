#!/usr/bin/env python
"""Interactive script to configure OIDC/SSO settings"""

import sys
import os
import json

# Set up path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app import models, schemas, crud

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    print("\n" + "="*60)
    print("OIDC/SSO Configuration Setup")
    print("="*60 + "\n")
    
    print("Enter your OIDC provider details. Leave blank to skip a field.\n")
    
    config_data = {}
    
    # Provider name
    config_data['provider_name'] = input("Provider name (e.g., Keycloak, Auth0, Okta): ").strip() or "Custom OIDC Provider"
    
    # Enable OIDC
    enable_str = input("\nEnable OIDC? (yes/no) [default: no]: ").strip().lower()
    config_data['enabled'] = enable_str in ['yes', 'y', '1', 'true']
    
    # Client ID
    config_data['client_id'] = input("\nClient ID: ").strip() or None
    
    # Client Secret
    config_data['client_secret'] = input("Client Secret: ").strip() or None
    
    # Issuer URL
    config_data['issuer_url'] = input("\nIssuer URL (e.g., https://keycloak.example.com/auth/realms/myrealm): ").strip() or None
    
    # Authorization Endpoint (optional if issuer_url provided)
    config_data['authorization_endpoint'] = input("Authorization Endpoint (optional, auto-discovered if issuer_url provided): ").strip() or None
    
    # Token Endpoint (optional if issuer_url provided)
    config_data['token_endpoint'] = input("Token Endpoint (optional, auto-discovered if issuer_url provided): ").strip() or None
    
    # UserInfo Endpoint (optional if issuer_url provided)
    config_data['userinfo_endpoint'] = input("UserInfo Endpoint (optional, auto-discovered if issuer_url provided): ").strip() or None
    
    # Redirect URI
    config_data['redirect_uri'] = input("\nRedirect URI (e.g., http://localhost:8040/api/auth/oidc/callback): ").strip() or None
    
    # Logout endpoint
    config_data['logout_endpoint'] = input("Logout Endpoint (optional): ").strip() or None
    
    # Post logout redirect
    config_data['post_logout_redirect_uri'] = input("Post Logout Redirect URI (optional): ").strip() or None
    
    # Scope
    scope = input("\nScope [default: openid email profile]: ").strip()
    config_data['scope'] = scope if scope else "openid email profile"
    
    # Admin groups
    admin_groups_str = input("\nAdmin Groups (comma-separated) [default: administrators,admins]: ").strip()
    if admin_groups_str:
        config_data['admin_groups'] = [g.strip() for g in admin_groups_str.split(',')]
    else:
        config_data['admin_groups'] = ['administrators', 'admins']
    
    # User groups
    user_groups_str = input("User Groups (comma-separated) [default: users]: ").strip()
    if user_groups_str:
        config_data['user_groups'] = [g.strip() for g in user_groups_str.split(',')]
    else:
        config_data['user_groups'] = ['users']
    
    # Confirm before saving
    print("\n" + "="*60)
    print("Configuration Summary:")
    print("="*60)
    for key, value in config_data.items():
        if key in ['admin_groups', 'user_groups']:
            print(f"  {key}: {', '.join(value)}")
        else:
            print(f"  {key}: {value}")
    
    confirm = input("\n\nSave this configuration? (yes/no): ").strip().lower()
    
    if confirm in ['yes', 'y', '1', 'true']:
        # Update config
        config_update = schemas.OIDCConfigUpdate(**config_data)
        updated_config = crud.update_oidc_config(db, config_update)
        
        print("\n✓ OIDC configuration saved successfully!")
        print(f"\n  Provider: {updated_config.provider_name}")
        print(f"  Enabled: {updated_config.enabled}")
        print(f"  Client ID: {updated_config.client_id}")
        print(f"  Issuer URL: {updated_config.issuer_url}")
        print(f"  Redirect URI: {updated_config.redirect_uri}")
        
    else:
        print("\n✗ Configuration not saved")
        
finally:
    db.close()
    print("\n")
