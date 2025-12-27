# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- SMTP configuration tab in Settings (admin-only) with full email server setup
- Email notifications preference moved to user profile (per-user control)
- Comprehensive CSS variables system for theming
- Auto-lock functionality with inactivity timer
- Code format options (spaced vs compact)
- Browser notifications toggle (UI ready)
- Docker deployment with nginx reverse proxy
- OIDC SSO integration
- Role-based access control
- Encrypted secret storage using Fernet
- QR code extraction and management
- User and application management for admins

### Changed
- Dark theme now applies throughout the entire app with smooth transitions
- Notifications moved from global settings to per-user profile
- Improved responsive React frontend

### Fixed
- Hardcoded colors in CSS replaced with CSS variables for proper theming

### Technical Details

#### Settings Implementation
- **Theme Switching**: Fully functional with light/dark/auto modes stored in localStorage
- **Code Format**: Spaced ("123 456") vs Compact ("123456") display options
- **Auto-lock**: Configurable inactivity timer (1-60 minutes or never)
- **Notifications**: Toggle for future browser notifications integration

#### SMTP Configuration
- Admin-only SMTP settings with enable/disable toggle
- Full configuration: host, port, credentials, from address
- Save and test functionality with API endpoints
- Status indicators and toast notifications

#### Email Notifications
- Per-user preference in profile view
- Integrates with SMTP when enabled by admin
- API endpoints for user preferences

#### Theming System
- CSS variables for consistent theming:
  - `--bg-primary`, `--bg-secondary`
  - `--text-primary`, `--text-secondary`
  - `--border-color`, `--accent-color`
  - Box shadow variables for depth
- Automatic application across all components
- Smooth transitions between themes

#### API Endpoints Added
- `GET/POST /api/admin/smtp` - SMTP configuration
- `POST /api/admin/smtp/test` - Test email sending
- `GET/PUT /api/users/{id}/preferences` - User preferences

### Files Modified
- `App.js` - Settings state management, theming, auto-lock
- `App.css` - CSS variables system
- `SettingsView.js` - SMTP tab and configuration
- `ProfileView.js` - Email notifications preference
- `AuthenticatorView.js` - Code format prop passing
- `AccountCard.js` - Code formatting logic
- Backend models and routers for new endpoints

## [1.0.0] - 2025-12-27

### Added
- Initial release of 2FA Manager
- Basic 2FA token management
- User authentication
- Docker setup