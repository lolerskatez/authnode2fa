# 2FA (Two-Factor Authentication) Implementation

## Overview
The application now has mandatory 2FA for admin users and optional 2FA for regular users. The implementation uses TOTP (Time-based One-Time Password) with encrypted storage of secrets.

## Database Changes

### User Model Updates
Added two new columns to the `users` table:
- `totp_secret` (String, nullable): Stores the encrypted TOTP secret
- `totp_enabled` (Boolean, default=False): Indicates if 2FA is enabled for the user

### GlobalSettings Model Updates
Added one new column to the `global_settings` table:
- `totp_enforcement` (String, default='optional'): Controls 2FA enforcement policy
  - `optional`: 2FA is disabled for all users (users can still enable voluntarily)
  - `admin_only`: 2FA is required for admin users only
  - `required_all`: 2FA is required for all users

### Migrations
- **Migration 1 ID**: `d633d3f1f735`
  - **Name**: "Add TOTP 2FA support to users"
  - **Applied**: Yes ✓
  
- **Migration 2 ID**: `5cf678704ab4`
  - **Name**: "Add TOTP enforcement setting to global settings"
  - **Applied**: Yes ✓

## Backend API Endpoints

### 1. Setup 2FA
**POST** `/api/auth/2fa/setup`
- **Auth**: Required (Bearer token)
- **Description**: Generates a TOTP secret and QR code for 2FA setup
- **Response**:
  ```json
  {
    "secret": "JBSWY3DPEHPK3PXP...",
    "qr_code": "data:image/png;base64,...",
    "backup_codes": ["AB12CD34", "EF56GH78", ...]
  }
  ```

### 2. Enable 2FA
**POST** `/api/auth/2fa/enable`
- **Auth**: Required (Bearer token)
- **Description**: Verifies TOTP code and enables 2FA for the user
- **Request Body**:
  ```json
  {
    "secret": "JBSWY3DPEHPK3PXP...",
    "totp_code": "123456",
    "backup_codes": ["AB12CD34", "EF56GH78", ...]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "2FA enabled successfully",
    "backup_codes": [...]
  }
  ```

### 3. Disable 2FA
**POST** `/api/auth/2fa/disable`
- **Auth**: Required (Bearer token)
- **Description**: Disables 2FA for the user (requires password and current TOTP code)
- **Request Body**:
  ```json
  {
    "password": "user_password",
    "totp_code": "123456"  // Optional if 2FA is already enabled
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "2FA disabled successfully"
  }
  ```

### 4. Get 2FA Status
**GET** `/api/auth/2fa/status`
- **Auth**: Required (Bearer token)
- **Description**: Gets the current 2FA status for the user
- **Response**:
  ```json
  {
    "totp_enabled": true,
    "is_admin": true
  }
  ```

### 5. Login with 2FA Support
**POST** `/api/auth/login`
- **Auth**: Not required
- **Description**: Enhanced login endpoint that enforces 2FA for admins
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Behavior**:
  - If user is **admin** and 2FA is NOT enabled: Returns **403 Forbidden** with message "2FA is required for admin accounts"
  - If user has 2FA enabled: Returns **token_type: "2fa_pending"** to indicate further verification is needed
  - If user has no 2FA: Returns regular bearer token

### 6. Verify 2FA Login
**POST** `/api/auth/login/verify-2fa`
- **Auth**: Not required
- **Description**: Completes the login process after 2FA verification
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "totp_code": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
  }
  ```

### 7. Get Global 2FA Settings (Admin)
**GET** `/api/admin/settings`
- **Auth**: Required (Bearer token, admin only)
- **Description**: Retrieves global application settings including 2FA enforcement policy
- **Response**:
  ```json
  {
    "id": 1,
    "login_page_theme": "light",
    "signup_enabled": true,
    "totp_enforcement": "optional",
    "created_at": "2025-12-28T19:34:45.303250",
    "updated_at": "2025-12-29T00:52:50.234219"
  }
  ```

### 8. Update Global 2FA Settings (Admin)
**PUT** `/api/admin/settings`
- **Auth**: Required (Bearer token, admin only)
- **Description**: Updates global application settings including 2FA enforcement policy
- **Request Body** (all fields optional):
  ```json
  {
    "login_page_theme": "dark",
    "signup_enabled": false,
    "totp_enforcement": "admin_only"
  }
  ```
- **Valid `totp_enforcement` values**:
  - `"optional"` - 2FA is disabled for all users (default)
  - `"admin_only"` - 2FA is required for admin users only
  - `"required_all"` - 2FA is required for all users
- **Response**: Returns updated GlobalSettings object

## Implementation Details

### Security Features
1. **Encrypted Storage**: TOTP secrets are encrypted using Fernet encryption with the `ENCRYPTION_KEY` from `.env`
2. **Time Window**: TOTP verification accepts codes from the current time window ±1 (30-second window)
3. **Enforcement Policy**: Admins can control 2FA requirements globally via `totp_enforcement` setting
4. **Backup Codes**: Users receive 10 single-use backup codes during setup

### Libraries Used
- `pyotp==2.9.0`: TOTP generation and verification
- `qrcode[pil]==7.4.2`: QR code generation
- `cryptography==41.0.7`: Fernet encryption for secrets

### Encryption
- Algorithm: Fernet (AES-128 in CBC mode with HMAC for authentication)
- Key Source: `ENCRYPTION_KEY` environment variable
- Storage: Encrypted TOTP secrets stored in `users.totp_secret` column

## Frontend Integration (TODO)

### Required Components
1. **2FA Setup Screen**
   - Display QR code with provisioning URI
   - Manual secret entry fallback
   - TOTP code verification
   - Display and save backup codes

2. **2FA Verification Screen**
   - Appears when login returns `token_type: "2fa_pending"`
   - Accept 6-digit TOTP code
   - Fallback option to use backup code

3. **Settings Page**
   - Display 2FA status
   - Ability to disable 2FA
   - Change TOTP secret
   - Download backup codes

### Login Flow
```
User enters email/password
         ↓
POST /api/auth/login
         ↓
Get global totp_enforcement setting (optional/admin_only/required_all)
         ↓
Check 2FA requirement based on policy:
         ├─ optional: 
         │  ├─ User has 2FA? → Return 2fa_pending token
         │  └─ No 2FA? → Return bearer token
         │
         ├─ admin_only:
         │  ├─ Admin + No 2FA? → 403 Error (must setup first)
         │  ├─ Admin + 2FA? → Return 2fa_pending token
         │  ├─ User + 2FA? → Return 2fa_pending token
         │  └─ User + No 2FA? → Return bearer token
         │
         └─ required_all:
            ├─ Any user + No 2FA? → 403 Error (must setup first)
            └─ Any user + 2FA? → Return 2fa_pending token
         ↓
If token_type is "2fa_pending":
   POST /api/auth/login/verify-2fa with TOTP code
         ↓
   Return bearer token on success
```

**Admin Control Panel**: Admins can change the enforcement policy at any time via `PUT /api/admin/settings`
```

## Testing Checklist

- [ ] Admin can change 2FA enforcement policy via `PUT /api/admin/settings`
- [ ] With `totp_enforcement: "optional"`: Users can log in without 2FA
- [ ] With `totp_enforcement: "admin_only"`: Admins must have 2FA, regular users don't
- [ ] With `totp_enforcement: "required_all"`: All users must have 2FA
- [ ] Admin user without 2FA cannot log in when enforcement requires it (returns 403)
- [ ] Admin can set up 2FA with `/api/auth/2fa/setup`
- [ ] Admin can enable 2FA with valid TOTP code
- [ ] Regular user can optionally enable 2FA
- [ ] Users with 2FA must provide TOTP code during login
- [ ] Invalid TOTP codes are rejected (returns 401)
- [ ] Users can disable 2FA with password and current TOTP
- [ ] Backup codes work as fallback for TOTP codes
- [ ] TOTP secrets are encrypted in database
- [ ] Changing enforcement policy dynamically affects all users on next login

## Current Status

✅ **Completed**:
- Database migrations (User 2FA + GlobalSettings enforcement columns added)
- Global 2FA enforcement setting in GlobalSettings
- Admin API to GET/PUT global settings with totp_enforcement control

- Backend API endpoints (all 8 endpoints implemented including admin settings)
- 2FA enforcement in login flow with flexible policy (optional/admin_only/required_all)
- Global 2FA enforcement setting in GlobalSettings
- Admin panel endpoints for controlling 2FA policy
- TOTP secret generation and encryption
- QR code generation

✅ **Login Flow Updates**:
- Respects global `totp_enforcement` setting
- Enforces 2FA based on policy (optional/admin_only/required_all)
- Returns `token_type: "2fa_pending"` when verification needed
- Returns 403 when 2FA is required but not enabled

⏳ **TODO**:
- Frontend 2FA setup screen
- Frontend 2FA verification screen
- Frontend settings page for 2FA management
- Frontend admin panel for 2FA enforcement policy
- Backup code generation and validation
- Session management with 2FA verification

## Admin 2FA Enforcement Policy Control

Admins can control 2FA requirements for the entire application via the settings panel:

### Setting 2FA Enforcement Policy

**Endpoint**: `PUT /api/admin/settings`

**Request**:
```bash
curl -X PUT http://localhost:8041/api/admin/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "totp_enforcement": "admin_only"
  }'
```

**Policy Options**:
1. **`optional`** (default)
   - 2FA is disabled for all users
   - Users can still voluntarily enable 2FA in settings
   - All users can log in without 2FA
   - **Use case**: Early adopter phase, gradual rollout

2. **`admin_only`**
   - Admins MUST enable and use 2FA
   - Regular users can optionally enable 2FA
   - Admins cannot log in without 2FA
   - **Use case**: Secure admin accounts only, standard user access

3. **`required_all`**
   - ALL users MUST enable and use 2FA
   - No exceptions - everyone needs 2FA
   - No user can log in without 2FA enabled
   - **Use case**: High-security environment, zero-trust policy

### What Happens When Policy Changes

1. **Immediate**: Login enforcement applies to all new login attempts
2. **Existing Sessions**: Not affected (users can continue using valid tokens)
3. **On Next Login**: Users will be prompted for 2FA if enforcement requires it

**Example Scenario**:
- You start with `optional` (no 2FA required)
- Admins voluntarily enable 2FA
- Later you change to `admin_only` to enforce admin 2FA
- Admins without 2FA cannot log in anymore
- Regular users can still log in without 2FA
- Change again to `required_all` when ready
- Now ALL users must have 2FA to log in

## Admin 2FA Setup Instructions

1. Admin attempts to log in → Receives 403 error
2. Admin visits Settings → Sees "2FA Required" notice
3. Admin clicks "Enable 2FA"
4. System generates QR code via `/api/auth/2fa/setup`
5. Admin scans QR code with authenticator app
6. Admin enters 6-digit code → Calls `/api/auth/2fa/enable`
7. System saves encrypted secret and enables 2FA
8. Admin can now log in normally (will be prompted for TOTP code)

## User 2FA Setup Instructions (Optional)

1. Regular user logs in successfully
2. User visits Settings
3. User clicks "Enable 2FA"
4. System generates QR code via `/api/auth/2fa/setup`
5. User scans QR code with authenticator app
6. User enters 6-digit code → Calls `/api/auth/2fa/enable`
7. System saves encrypted secret and enables 2FA
8. On next login, user will be prompted for TOTP code
