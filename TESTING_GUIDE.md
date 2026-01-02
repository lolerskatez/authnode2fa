# Testing & Pre-Publishing Guide

This guide walks through testing the application before publishing.

## Quick Test (5-10 minutes)

### 1. Run Backend Tests

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run tests with coverage
pytest -v --cov=app --cov-report=term-missing
```

**Expected output:**
- All tests pass ✅
- Coverage report shows percentage
- No errors in critical modules

### 2. Run Security Tests

```bash
# Security-specific tests
pytest -v -m security
```

### 3. Build Docker Images

```bash
cd ..
docker-compose build
```

**Expected:**
- ✅ Backend image builds successfully
- ✅ Frontend image builds successfully
- ✅ No build errors

## Comprehensive Test (20-30 minutes)

### 1. Full Test Suite

```bash
cd backend
pytest -v --cov=app --cov-report=html --cov-report=term-missing
```

View HTML report: Open `htmlcov/index.html` in browser

### 2. Performance Tests

```bash
pytest -v --durations=10  # Show slowest 10 tests
```

### 3. Docker Compose Test

```bash
cd ..
docker-compose -f docker-compose.yml up -d
docker-compose ps
```

Verify all containers running:
- ✅ db (PostgreSQL)
- ✅ backend (FastAPI)
- ✅ frontend (React)

### 4. Health Check

```bash
curl http://localhost:8041/health
```

Expected response:
```json
{"status": "healthy"}
```

### 5. API Documentation Test

Open in browser:
- http://localhost:8041/api/docs (Swagger)
- http://localhost:8041/api/redoc (ReDoc)

### 6. Test Login

Frontend: http://localhost:8040

Test credentials (from setup):
- Email: `test@example.com`
- Password: `password123`

### 7. Cleanup

```bash
docker-compose down
```

## Pre-Publishing Checklist

```bash
# 1. Verify no secrets in git
git log -S "password" --all --full-history -p
git log -S "ENCRYPTION_KEY" --all --full-history -p
git log -S "SECRET_KEY" --all --full-history -p

# 2. Check git status
git status  # Should be clean

# 3. Run full test suite
cd backend && pytest -v --cov=app

# 4. Check for Python linting issues
flake8 app/ --max-line-length=120  # (optional, requires flake8)

# 5. Verify .env templates
cat .env.example
cat .env.docker.example

# 6. Update version number if needed
# Edit: package.json (frontend), CHANGELOG.md

# 7. Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## What Happens When Tests Run

### Backend Tests (`test_*.py`)

**test_auth.py**
- User registration
- Login/logout
- Token refresh
- Password validation

**test_users.py**
- User profile operations
- User preferences
- Preference updates

**test_applications.py**
- 2FA app CRUD operations
- QR code handling
- Secret encryption/decryption
- Backup code generation

**test_security.py**
- Rate limiting
- Session security
- CSRF protection
- Audit logging

## Expected Test Results

```
============================= test session starts ==============================
platform win32 -- Python 3.9.0, pytest-7.4.3, py-1.13.0, pluggy-1.1.1
rootdir: /backend
collected 25 items

test_auth.py::test_register PASSED                                        [ 4%]
test_auth.py::test_login PASSED                                           [ 8%]
test_users.py::test_get_profile PASSED                                    [12%]
...

========================== 25 passed in 2.45s ==========================
Coverage: 85% (example)
```

## Troubleshooting

### Tests fail with "Database connection error"

**Solution:** Tests use in-memory SQLite, should be isolated
```bash
# Clear any temporary files
rm -rf __pycache__ .pytest_cache

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Run tests again
pytest -v
```

### Docker build fails

**Solution:** Check Docker is running
```bash
docker --version
docker ps
```

### Port already in use

**Solution:** Stop existing containers
```bash
docker-compose down
# or
docker ps -a  # Find container ID
docker stop <container_id>
```

## Test Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| auth.py | 90%+ | ✅ Ready |
| crud.py | 85%+ | ✅ Ready |
| models.py | 95%+ | ✅ Ready |
| schemas.py | 80%+ | ✅ Ready |
| Overall | 80%+ | ✅ Ready |

## Publishing Steps

After all tests pass:

1. **Final review**
   ```bash
   git log --oneline -5
   ```

2. **Create release tag**
   ```bash
   git tag -a v1.0.0 -m "Production release v1.0.0"
   git push origin v1.0.0
   ```

3. **Push to GitHub**
   ```bash
   git push origin main
   ```

4. **Create GitHub release** (if using GitHub)
   - Go to Releases
   - Click "Draft a new release"
   - Select tag: v1.0.0
   - Add release notes
   - Publish

## Post-Publishing

Monitor:
- ✅ CI/CD pipeline (if configured)
- ✅ Docker registry builds
- ✅ Repository view on GitHub
- ✅ README renders correctly
- ✅ API docs are accessible
- ✅ Deployment guide is clear

---

**Ready to test?** Start with "Quick Test" above, then run "Comprehensive Test" for final validation.
---

## Feature-Specific Testing

### Testing Activity Log Feature

**Location:** Sidebar → Activity (or Mobile Menu → Activity)

**Test Checklist:**
- [ ] Page loads without errors
- [ ] Activity list displays with action, status, timestamp, IP address
- [ ] Action type filter works
- [ ] Status filter (success/failed) works
- [ ] Pagination controls work (Next/Previous)
- [ ] Refresh button works with toast notification
- [ ] Mobile responsive (cards on mobile, table on desktop)
- [ ] Dark/light theme works correctly

**Example Activity Actions:**
- `login` - User logged in
- `logout` - User logged out
- `account_added` - New 2FA account added
- `account_updated` - 2FA account modified
- `account_deleted` - 2FA account removed
- `code_viewed` - 2FA code displayed
- `password_changed` - Password changed
- `2fa_enabled` - 2FA enabled
- `webauthn_added` - Security key added
- `profile_updated` - User profile changed

### Testing Admin Dashboard Feature

**Location:** Sidebar → Dashboard (Admin users only)

**Test Checklist:**
- [ ] Access control: Regular users cannot access
- [ ] Admin users: Dashboard link visible in sidebar
- [ ] All 6 statistics cards display:
  1. Total Users
  2. Active Users (7d)
  3. 2FA Accounts
  4. Users with 2FA
  5. Logins (7d)
  6. Failed Logins (7d)
- [ ] Top active users list shows
- [ ] Account distribution by category shows
- [ ] Refresh button updates stats
- [ ] Mobile responsive layout works
- [ ] Dark/light theme works correctly

### Testing Password Reset

**Test Flow:**
1. Click "Forgot Password" on login page
2. Enter email address
3. Check email for reset link (or check backend logs)
4. Click reset link
5. Enter new password
6. Verify login with new password

### Testing Session Management

**Test Flow:**
1. Navigate to Profile → Sessions
2. View active sessions list
3. Click "Revoke" on a session
4. Verify session removed from list
5. Try "Logout All Sessions"
6. Verify forced logout

### Testing Backup Codes

**Test Flow:**
1. Enable 2FA in Profile → Security
2. Generate backup codes
3. Download/copy backup codes
4. Test login with backup code
5. Verify backup code is marked as used
6. Regenerate backup codes

---