# 2FA Application Enhancement Prompts for Grok Code Fast 1

## Priority 1: Recovery Codes System 🔐
**Status**: High Priority - Critical Security Gap

**Main Prompt:**
```
You are Grok Code Fast 1, an expert AI coding assistant. I need you to implement a comprehensive recovery codes system for this 2FA application. The codebase is located at e:\new projects\authnode2fa.

Current State Analysis:
- Backend: FastAPI with SQLAlchemy, PostgreSQL/SQLite support
- Frontend: React with Axios, existing 2FA enrollment flow
- Security: Fernet encryption, JWT auth, WebAuthn support

Requirements:
1. Generate 10 one-time recovery codes during TOTP/WebAuthn enrollment
2. Store encrypted codes in database with usage tracking
3. Add recovery code validation endpoint
4. Frontend UI for viewing/downloading codes (one-time view)
5. Mark codes as used when redeemed
6. Security audit logging for recovery code usage
7. Admin ability to invalidate all recovery codes for a user

Technical Implementation:
- New model: RecoveryCode with fields: id, user_id, code_hash, used, used_at, created_at
- New endpoint: POST /api/auth/recover - validate recovery code and return JWT
- Frontend: Add recovery codes display in Settings > Security tab
- Encryption: Use existing Fernet cipher for code storage
- Validation: Rate limit recovery attempts (5 per hour per IP)

Files to modify/create:
- backend/app/models.py: Add RecoveryCode model
- backend/app/routers/auth.py: Add recovery endpoint
- backend/app/crud.py: Add recovery code functions
- backend/app/schemas.py: Add recovery schemas
- frontend/src/views/SettingsView.js: Add recovery codes section
- frontend/src/components/RecoveryCodesModal.js: New component

Security Considerations:
- Codes shown only once during generation
- Secure random generation (cryptographically secure)
- Rate limiting on recovery attempts
- Audit logging of all recovery attempts
- Admin override capability

Integration Points:
- Hook into existing 2FA enrollment flow
- Add to user settings page
- Include in security audit reports
- Support both TOTP and WebAuthn recovery

Please implement this complete system with proper error handling, validation, and security measures.
```

**Follow-up Prompts:**
```
1. Add recovery code generation during 2FA setup
2. Implement recovery code validation endpoint
3. Create frontend recovery codes management UI
4. Add rate limiting for recovery attempts
5. Implement admin recovery code management
6. Add recovery code usage audit logging
```

---

## Priority 2: Session Auto-Lock Enforcement ⏱️
**Status**: High Priority - Security Enhancement

**Main Prompt:**
```
You are Grok Code Fast 1. Implement server-side session auto-lock enforcement for this 2FA application at e:\new projects\authnode2fa.

Current State:
- Frontend has auto-lock setting (5-60 minutes)
- Backend has session management but no activity tracking
- JWT tokens with refresh capability

Requirements:
1. Track user activity timestamps server-side
2. Automatic session invalidation based on configured timeout
3. Client-side countdown warnings (5 minutes before lock)
4. Activity refresh on user interactions
5. Force logout on timeout with notification
6. Admin override for session management

Technical Implementation:
- New model: SessionActivity with user_id, last_activity, session_id
- Middleware: Update activity timestamp on authenticated requests
- Background job: Clean expired sessions every 5 minutes
- Frontend: Activity heartbeat every 30 seconds
- Warning: Show modal 5 minutes before auto-lock

Files to modify:
- backend/app/models.py: Add SessionActivity model
- backend/app/main.py: Add activity tracking middleware
- backend/app/routers/auth.py: Update login/logout with activity tracking
- frontend/src/App.js: Add activity heartbeat and timeout warnings
- frontend/src/components/AutoLockWarning.js: New warning modal

Security Features:
- Server-side enforcement (cannot be bypassed by client)
- Configurable timeouts per user
- Activity detection for mouse, keyboard, touch events
- Graceful session extension on activity
- Clear security notifications

Integration:
- Works with existing auto-lock settings
- Compatible with mobile and desktop
- No impact on API performance
- Audit logging of forced logouts
```

**Follow-up Prompts:**
```
1. Implement server-side activity tracking
2. Add session timeout middleware
3. Create client-side timeout warnings
4. Add activity heartbeat mechanism
5. Implement forced logout on timeout
6. Add admin session management controls
```

---

## Priority 3: Bulk Export in Standard Formats 📤
**Status**: Medium Priority - User Experience

**Main Prompt:**
```
You are Grok Code Fast 1. Implement bulk export functionality for 2FA codes in standard formats for the application at e:\new projects\authnode2fa.

Current State:
- Individual QR code export exists
- No bulk export capability
- Encrypted secret storage

Requirements:
1. Export multiple accounts as QR codes (batch)
2. Support Aegis Authenticator format (JSON)
3. Support andOTP format (JSON)
4. Support plain text format (CSV with secrets)
5. Password-protected encrypted exports
6. Frontend progress indicators for large exports

Technical Implementation:
- New endpoint: POST /api/applications/export with format parameter
- Formats: 'aegis', 'andotp', 'plaintext', 'qrcodes'
- Encryption: Optional password protection using Fernet
- Frontend: Export modal with format selection and password option
- Validation: Rate limit exports (max 10 per hour per user)

Files to create/modify:
- backend/app/routers/applications.py: Add export endpoint
- backend/app/export.py: New export format handlers
- frontend/src/components/ExportModal.js: New export UI
- frontend/src/views/AuthenticatorView.js: Add export button

Security Considerations:
- Password protection for sensitive exports
- Rate limiting to prevent abuse
- Audit logging of exports
- No plaintext secrets in logs
- Secure temporary file handling

Supported Formats:
1. Aegis: {"version":1,"header":{"slots":null,"params":null},"db":{"version":1,"entries":[...]}}
2. andOTP: {"version":1,"entries":[...]}
3. Plaintext: CSV with name,username,secret,issuer
4. QR Batch: Multiple QR codes in single PDF/image

Integration:
- Add to existing export options in AuthenticatorView
- Support category filtering
- Progress indicators for large exports
- Download with proper filename and MIME type
```

**Follow-up Prompts:**
```
1. Implement Aegis Authenticator export format
2. Add andOTP export format support
3. Create plaintext CSV export option
4. Add QR code batch export (PDF)
5. Implement password protection for exports
6. Add export progress indicators
7. Integrate with existing UI
```

---

## Priority 4: Geographic Login Anomaly Detection 🌍
**Status**: Medium Priority - Advanced Security

**Main Prompt:**
```
You are Grok Code Fast 1. Implement geographic login anomaly detection for enhanced security in this 2FA application at e:\new projects\authnode2fa.

Current State:
- Basic login logging exists
- IP address tracking available
- No geographic analysis

Requirements:
1. Track login locations using IP geolocation
2. Detect impossible travel (login from distant locations in short time)
3. Flag suspicious logins for additional verification
4. Send security alerts for anomalous logins
5. Admin dashboard for reviewing suspicious activity
6. User notification system for security events

Technical Implementation:
- New model: LoginAttempt with ip_address, country, city, latitude, longitude
- Geolocation service integration (ipapi.co or similar)
- Anomaly detection algorithm (distance/time analysis)
- Risk scoring system (0-100)
- Additional verification for high-risk logins

Files to modify/create:
- backend/app/models.py: Add LoginAttempt model with geo fields
- backend/app/auth.py: Update login flow with geo tracking
- backend/app/anomaly_detection.py: New anomaly detection logic
- frontend/src/views/SettingsView.js: Add security alerts section
- frontend/src/components/SecurityAlert.js: New alert component

Detection Rules:
- Distance > 500km in < 2 hours = High risk
- Login from new country = Medium risk
- Multiple failed attempts from same IP = Medium risk
- Risk score > 70 = Require additional verification

Integration:
- Works with existing 2FA flow
- Compatible with OIDC and local auth
- Admin review interface
- User security notifications
- Audit logging of all detections
```

**Follow-up Prompts:**
```
1. Implement IP geolocation tracking
2. Add anomaly detection algorithms
3. Create risk scoring system
4. Add additional verification for high-risk logins
5. Implement security alert notifications
6. Build admin anomaly review interface
```

---

## Priority 5: Encrypted Notes & Metadata 📝
**Status**: Medium Priority - Privacy Enhancement

**Main Prompt:**
```
You are Grok Code Fast 1. Implement end-to-end encrypted notes and metadata for account management in this 2FA application at e:\new projects\authnode2fa.

Current State:
- Basic notes field exists (unencrypted)
- Custom fields support
- Server-side encryption for secrets only

Requirements:
1. Client-side encryption for sensitive account notes
2. Encrypted custom fields storage
3. Searchable encryption for note content
4. Secure key derivation from user password
5. Migration path for existing unencrypted notes
6. Admin inability to read encrypted content

Technical Implementation:
- Client-side encryption using Web Crypto API
- Key derivation: PBKDF2 from user password + salt
- AES-GCM encryption for notes and custom fields
- Searchable encryption for basic search capability
- Database storage: Encrypted blobs with metadata

Files to modify/create:
- frontend/src/utils/encryption.js: New client-side crypto utilities
- backend/app/models.py: Update Application model for encrypted fields
- frontend/src/views/AuthenticatorView.js: Update note editing
- backend/app/routers/applications.py: Handle encrypted fields
- frontend/src/components/EncryptedNoteEditor.js: New component

Security Features:
- Zero-knowledge architecture (server cannot decrypt)
- Key derived from user credentials
- Perfect forward secrecy considerations
- Secure key storage in browser (IndexedDB)
- Migration with user consent

Integration:
- Seamless upgrade for existing users
- Fallback to server encryption if client crypto fails
- Search functionality preserved
- Mobile and desktop compatibility
- Audit logging without revealing content
```

**Follow-up Prompts:**
```
1. Implement client-side encryption utilities
2. Add encrypted notes storage
3. Create searchable encryption for notes
4. Update UI for encrypted note editing
5. Add migration for existing notes
6. Implement secure key management
```

---

## Priority 6: Scheduled Backup System 💾
**Status**: Medium Priority - Data Protection

**Main Prompt:**
```
You are Grok Code Fast 1. Implement a comprehensive scheduled backup system for this 2FA application at e:\new projects\authnode2fa.

Current State:
- Basic backup UI exists but not functional
- Database models for backup tracking
- No automated scheduling

Requirements:
1. Automated daily/weekly database backups
2. Encrypted backup storage
3. Backup integrity verification
4. Restore functionality with confirmation
5. Admin backup management interface
6. Backup retention policies (30 days default)
7. Cloud storage integration (optional)

Technical Implementation:
- Background scheduler (APScheduler)
- Encrypted backup creation (Fernet)
- Backup metadata tracking
- Restore validation and conflict detection
- Admin UI for backup operations
- Automatic cleanup of old backups

Files to modify/create:
- backend/app/backup_scheduler.py: New automated backup system
- backend/app/routers/admin.py: Add backup management endpoints
- frontend/src/views/tabs/BackupsTab.js: Make functional
- backend/app/models.py: Ensure backup models are complete
- backend/app/backup.py: Enhance existing backup manager

Features:
- Scheduled backups (configurable intervals)
- Manual backup creation
- Backup listing with size/date/status
- Secure restore with password confirmation
- Backup integrity checking (hash verification)
- Retention policy enforcement
- Admin notifications for backup failures

Integration:
- Works with existing backup UI
- Compatible with SQLite and PostgreSQL
- Secure credential handling
- Error handling and recovery
- Audit logging of backup operations
```

**Follow-up Prompts:**
```
1. Implement automated backup scheduling
2. Add backup encryption and integrity checks
3. Create backup management UI
4. Implement restore functionality
5. Add backup retention policies
6. Integrate with existing backup tab
```

---

## Implementation Guidelines for All Features

**Code Quality Standards:**
- Follow existing patterns in the codebase
- Add comprehensive error handling
- Include input validation and sanitization
- Add audit logging for security-sensitive operations
- Write unit tests for critical functions
- Update API documentation

**Security Requirements:**
- Use existing encryption patterns (Fernet)
- Implement rate limiting where appropriate
- Add audit logging for sensitive operations
- Validate all inputs server-side
- Use secure random generation for secrets
- Implement proper access controls

**UI/UX Standards:**
- Follow existing component patterns
- Add loading states and error handling
- Implement mobile-responsive design
- Use consistent styling and theming
- Add proper accessibility attributes
- Include user feedback for all actions

**Testing Requirements:**
- Test all new endpoints with various inputs
- Verify error conditions and edge cases
- Test UI components on different screen sizes
- Validate security measures work correctly
- Test integration with existing features
- Verify database migrations work properly

**Documentation Updates:**
- Update API documentation for new endpoints
- Add frontend component documentation
- Update security documentation
- Add user-facing help text
- Update deployment guides if needed

**Deployment Considerations:**
- Ensure backward compatibility
- Add database migrations for new models
- Update environment variable documentation
- Test in staging environment first
- Plan rollback procedures
- Monitor performance impact

Use these prompts with Grok Code Fast 1 to implement each feature systematically, starting with Priority 1 (Recovery Codes) for maximum security impact.