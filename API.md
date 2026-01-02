# API Documentation

The backend API is fully documented with interactive endpoints and multiple documentation styles.

## Access Documentation

### Swagger UI (Recommended)
**URL**: `/api/docs`  
**Best for**: Interactive testing and exploration

Features:
- ✅ Try-it-out functionality
- ✅ Request/response examples
- ✅ Parameter validation
- ✅ Authentication testing
- ✅ Dark mode support

### ReDoc (Alternative)
**URL**: `/api/redoc`  
**Best for**: Reading and understanding the API

Features:
- ✅ Beautiful responsive design
- ✅ Search functionality
- ✅ Code examples
- ✅ Organized by tags
- ✅ Mobile-friendly

### OpenAPI Schema
**URL**: `/api/openapi.json`  
**Best for**: Integration with tools and IDEs

Usage:
- Generate client SDKs
- Integrate with Postman
- Use with Insomnia
- Import into other tools

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Authenticate user
- `POST /logout` - End session
- `POST /refresh` - Refresh JWT token

### User Management (`/api/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update profile
- `DELETE /me` - Delete account
- `GET /me/applications` - List user's 2FA apps

### 2FA Applications (`/api/applications`)
- `GET /` - List all applications
- `POST /` - Create new application
- `GET /{id}` - Get application details
- `PUT /{id}` - Update application
- `DELETE /{id}` - Delete application
- `POST /{id}/verify` - Verify TOTP code

### Administration (`/api/admin`)
- `GET /users` - List all users (admin only)
- `DELETE /users/{id}` - Delete user (admin only)
- `GET /settings` - Get global settings
- `PUT /settings` - Update settings (admin only)

### Health Check
- `GET /health` - Application health status

---

## Making API Requests

### Example: Login

**Swagger UI**:
1. Click "Authentication" section
2. Click "POST /login"
3. Click "Try it out"
4. Enter credentials
5. Click "Execute"

**cURL**:
```bash
curl -X POST "http://localhost:8041/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Python**:
```python
import requests

response = requests.post(
    "http://localhost:8041/api/auth/login",
    json={"email": "test@example.com", "password": "password123"}
)
token = response.json()["access_token"]
```

---

## Authentication

### Bearer Token
Include in headers after login:
```
Authorization: Bearer <token>
```

### Swagger UI Testing
1. Login to get token
2. Click "Authorize" button at top right
3. Paste token value
4. All subsequent requests will include it

---

## Response Format

All responses follow this format:

**Success**:
```json
{
  "data": {...},
  "message": "Success message",
  "status": 200
}
```

**Error**:
```json
{
  "detail": "Error description",
  "status": 400
}
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - New resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

---

## Rate Limiting

Currently no rate limiting is configured. To add:

1. Install dependency:
   ```bash
   pip install slowapi
   ```

2. Configure in `main.py`:
   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   ```

3. Add to endpoints:
   ```python
   @app.get("/api/users")
   @limiter.limit("100/minute")
   async def get_users():
       ...
   ```

---

## CORS Configuration

API supports Cross-Origin Resource Sharing (CORS).

**Configure via environment**:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Allowed methods**: GET, POST, PUT, DELETE, OPTIONS, PATCH
**Allowed headers**: All (with credentials support)

---

## Development vs Production

### Local Development
- Base URL: `http://localhost:8041`
- CORS allows: localhost:8040, localhost:8041
- Docs at: `http://localhost:8041/api/docs`

### Production
- Base URL: `https://yourdomain.com/api`
- CORS restricted to: your domain
- Docs at: `https://yourdomain.com/api/docs`

---

## Integration Examples

### JavaScript/Fetch
```javascript
// Login
const response = await fetch('https://yourdomain.com/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.access_token;

// Use token
const apps = await fetch('https://yourdomain.com/api/applications', {
  headers: {'Authorization': `Bearer ${token}`}
});
```

### Python/Requests
```python
import requests

# Login
response = requests.post(
    'https://yourdomain.com/api/auth/login',
    json={'email': 'test@example.com', 'password': 'password123'}
)
token = response.json()['access_token']

# Use token
headers = {'Authorization': f'Bearer {token}'}
apps = requests.get('https://yourdomain.com/api/applications', headers=headers)
```

### Postman
1. Import OpenAPI spec: `https://yourdomain.com/api/openapi.json`
2. Set variables:
   - `base_url` = `https://yourdomain.com/api`
   - `token` = (auto-updated from login)
3. All requests configured automatically

---

## Troubleshooting

### CORS Errors
- Check `ALLOWED_ORIGINS` environment variable
- Verify frontend domain is in list
- Restart backend after changes

### Authentication Fails
- Verify credentials are correct
- Check token is included in headers
- Ensure token hasn't expired

### API Returns 500 Error
- Check backend logs: `docker-compose logs backend`
- Verify database connection: `GET /health`
- Check request format is valid JSON

### Documentation Won't Load
- Verify FastAPI is running
- Check server logs for errors
- Try `/api/redoc` as alternative
- Clear browser cache

---

## API Design

### RESTful Principles
- Resources identified by URLs
- HTTP methods: GET (read), POST (create), PUT (update), DELETE (delete)
- Stateless - each request is independent
- JSON request/response format

### Versioning
Currently on API v1.0.0. Future versions will be available at:
- `/api/v2/...` (future)

Current version will remain as `/api/...`

---

## Quick Reference - Common Operations

### Reordering Accounts

**Move an Account to a New Position**
```bash
PUT /api/applications/{app_id}/move?position={new_position}

# Example: Move account 42 to position 0 (first)
PUT /api/applications/42/move?position=0
```

- Position is 0-based (0 = first, 1 = second, etc.)
- Positions are automatically constrained to valid range
- Returns updated application object

### Enhanced Search & Filtering

**Search Applications**
```bash
GET /api/applications/?q=search_term&category=Work&favorite=true

# Examples
GET /api/applications/?q=github              # Find GitHub account
GET /api/applications/?category=Work         # Filter by category
GET /api/applications/?favorite=true         # Show favorites only
```

**Search Fields:** Account name, Username, Notes/metadata, Service URL  
**Filter Options:** `q` (search term), `category` (Personal/Work/Security), `favorite` (true/false)

### Account Metadata Management

**Update Account Metadata**
```bash
PUT /api/applications/{app_id}

{
  "name": "GitHub",
  "username": "john.doe",
  "url": "https://github.com/john.doe",
  "notes": "Work account - enable IP whitelist",
  "category": "Work",
  "favorite": true
}
```

**Updatable Fields:** name, username, url, notes, category, favorite, icon, color

### User Activity Dashboard

**Get Personal Activity Log**
```bash
GET /api/users/activity?limit=50&offset=0
```

**Tracked Actions:** login, logout, account_added, account_updated, account_deleted, account_reordered, session_created, session_revoked, 2fa_enabled, 2fa_disabled

### Admin Dashboard Statistics

**Get System Statistics**
```bash
GET /api/admin/dashboard/stats
```

Returns: total_users, active_users_7d, total_accounts, users_with_2fa, recent_logins_7d, account_distribution_by_category

### JavaScript Frontend Usage

**Copy Code to Clipboard**
```javascript
import ClipboardManager from '../utils/ClipboardManager';

await ClipboardManager.copyToClipboard(code, {
  autoClear: true,
  clearDelay: 30000,
  showToast: true
});
```

**Reorder Accounts**
```javascript
const response = await axios.put(
  `/api/applications/${accountId}/move?position=${newPosition}`
);
```

---

**See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions.**
