# API Quick Reference - New Features

## Reordering Accounts

### Move an Account to a New Position
```bash
PUT /api/applications/{app_id}/move?position={new_position}

# Example: Move account 42 to position 0 (first)
PUT /api/applications/42/move?position=0

# Response
{
  "id": 42,
  "name": "GitHub",
  "display_order": 0,
  ...
}
```

**Notes:**
- Position is 0-based (0 = first, 1 = second, etc.)
- Positions are automatically constrained to valid range
- Returns updated application object
- Action is logged to audit trail

---

## Enhanced Search & Filtering

### Search Applications
```bash
GET /api/applications/?q=search_term&category=Work&favorite=true

# Examples
GET /api/applications/?q=github              # Find GitHub account
GET /api/applications/?q=john.doe            # Find by username
GET /api/applications/?q=backup              # Find by notes
GET /api/applications/?category=Work         # Filter by category
GET /api/applications/?favorite=true         # Show favorites only
GET /api/applications/?q=github&category=work&favorite=true  # Combine filters
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "GitHub",
    "username": "john.doe",
    "url": "https://github.com",
    "notes": "Personal backup account",
    "category": "Work",
    "favorite": true,
    "display_order": 0,
    ...
  }
]
```

**Search Fields:**
- Account name
- Username
- Notes/metadata
- Service URL

**Filter Options:**
- `q`: Full-text search term
- `category`: Personal, Work, Security
- `favorite`: true/false

---

## Account Metadata Management

### View Account Details
```bash
GET /api/applications/{app_id}

# Response includes:
{
  "id": 42,
  "name": "GitHub",
  "username": "john.doe",
  "url": "https://github.com/john.doe",
  "notes": "Personal GitHub account - 2FA backup at NotionPage",
  "icon": "fab fa-github",
  "color": "#000000",
  "category": "Work",
  "favorite": true,
  "display_order": 5
}
```

### Update Account Metadata
```bash
PUT /api/applications/{app_id}

{
  "name": "GitHub",
  "username": "john.doe",
  "url": "https://github.com/john.doe",
  "notes": "Work account - enable IP whitelist",
  "category": "Work",
  "favorite": true,
  "icon": "fab fa-github",
  "color": "#000000"
}

# Response: Updated application object
```

**Updatable Fields:**
- `name`: Account display name
- `username`: Service username
- `url`: Service website/account URL
- `notes`: User notes (supports markdown)
- `category`: Personal, Work, Security
- `favorite`: true/false
- `icon`: Font Awesome icon class
- `color`: Hex color for display
- `custom_fields`: JSON object with extra data

---

## User Activity Dashboard

### Get Personal Activity Log
```bash
GET /api/users/activity?limit=50&offset=0

# Response
[
  {
    "id": 1234,
    "user_id": 42,
    "action": "login",
    "resource_type": "user",
    "resource_id": 42,
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "status": "success",
    "created_at": "2025-12-30T10:30:00",
    "details": {}
  },
  {
    "id": 1235,
    "user_id": 42,
    "action": "account_added",
    "resource_type": "application",
    "resource_id": 99,
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "status": "success",
    "created_at": "2025-12-30T10:31:30",
    "details": {"account_name": "GitHub"}
  }
]
```

**Query Parameters:**
- `limit`: Max results (default 50, max 500)
- `offset`: Skip N results (default 0)

**Tracked Actions:**
- `login`: User authentication
- `logout`: User logout
- `account_added`: New 2FA account created
- `account_updated`: Account metadata changed
- `account_deleted`: Account removed
- `account_reordered`: Account moved
- `session_created`: New session started
- `session_revoked`: Session terminated
- `2fa_enabled`: 2FA setup enabled
- `2fa_disabled`: 2FA setup disabled

---

## Admin Dashboard Statistics

### Get System Statistics
```bash
GET /api/admin/dashboard/stats

# Response
{
  "total_users": 42,
  "active_users_7d": 28,
  "total_accounts": 356,
  "users_with_2fa": 38,
  "recent_logins_7d": 145,
  "recent_failed_logins_7d": 8,
  "top_active_users": [
    {
      "email": "alice@example.com",
      "login_count": 24
    },
    {
      "email": "bob@example.com",
      "login_count": 18
    }
  ],
  "account_distribution_by_category": [
    {
      "category": "Work",
      "count": 120
    },
    {
      "category": "Personal",
      "count": 180
    },
    {
      "category": "Security",
      "count": 56
    }
  ]
}
```

**Metrics:**
- `total_users`: All registered users
- `active_users_7d`: Users who logged in last 7 days
- `total_accounts`: Total 2FA accounts across system
- `users_with_2fa`: Users who enabled 2FA
- `recent_logins_7d`: Successful login attempts (last 7 days)
- `recent_failed_logins_7d`: Failed login attempts (last 7 days)
- `top_active_users`: Most active users by login count
- `account_distribution_by_category`: Accounts grouped by category

---

## JavaScript/Frontend Usage

### Copy Code to Clipboard
```javascript
import ClipboardManager from '../utils/ClipboardManager';

// Copy code with auto-clear (30 seconds)
await ClipboardManager.copyToClipboard(code, {
  autoClear: true,
  clearDelay: 30000,
  showToast: true,
  onSuccess: () => console.log('Copied!'),
  onError: (err) => console.error('Failed:', err)
});

// Copy multiple codes
await ClipboardManager.copyMultipleCodes([code1, code2], {
  separator: '\n',  // Codes separated by newline
  showToast: true
});
```

### Reorder Accounts (Frontend)
```javascript
import axios from 'axios';

// Move account to new position
const response = await axios.put(
  `/api/applications/${accountId}/move?position=${newPosition}`
);

// Returns updated account object
console.log(response.data.display_order);
```

### Update Metadata (Frontend)
```javascript
import axios from 'axios';

// Update account metadata
const updatedAccount = await axios.put(
  `/api/applications/${accountId}`,
  {
    name: 'GitHub',
    username: 'john.doe',
    url: 'https://github.com/john.doe',
    notes: 'Main work account',
    category: 'Work',
    favorite: true
  }
);
```

---

## Error Handling

### Common Error Responses

**404 Not Found**
```json
{
  "detail": "Application not found"
}
```

**400 Bad Request**
```json
{
  "detail": "No account IDs provided"
}
```

**401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden**
```json
{
  "detail": "Only admins can access this"
}
```

**429 Rate Limited**
```json
{
  "detail": "Rate limit exceeded"
}
```

---

## Rate Limiting

All endpoints have rate limiting applied:

- **Normal Endpoints**: 5 requests per minute per user
- **Sensitive Endpoints**: 3 requests per minute per user
  - Password reset
  - 2FA setup
  - Account import
  - SMTP operations

---

## Audit Logging

All actions are automatically logged:

- **What's Logged:**
  - User ID
  - Action (what happened)
  - Resource type (user, application, session)
  - Resource ID (which item affected)
  - IP address
  - User agent
  - Status (success/failed)
  - Timestamp
  - Additional details (JSON)

- **View Your Activity:** `/api/users/activity`
- **View User Activity** (admin): `/api/admin/audit-logs/user/{user_id}`

---

## Best Practices

1. **Search First**: Use search to filter before pagination
2. **Respect Rate Limits**: Implement exponential backoff
3. **Paginate Results**: Use limit/offset for large datasets
4. **Handle Errors**: Check status codes and error messages
5. **Log Actions**: Store important audit events
6. **Secure Metadata**: Don't store sensitive data in notes
7. **Clear Clipboard**: Rely on auto-clear for security
8. **Organize Accounts**: Use categories and favorites
9. **Monitor Activity**: Review personal activity log
10. **Admin Oversight**: Check dashboard stats regularly

---

## Examples

### Complete Workflow: Add and Organize Accounts
```javascript
import axios from 'axios';

// 1. Create new account
const newAccount = await axios.post('/api/applications/', {
  name: 'GitHub',
  secret: 'JBSWY3DPEBLW64TMMQ======',
  backup_key: 'backup-key-123',
  username: 'john.doe',
  url: 'https://github.com/john.doe',
  notes: 'Work account with IP whitelist',
  category: 'Work',
  favorite: true
});

// 2. Move to top position
await axios.put(`/api/applications/${newAccount.data.id}/move?position=0`);

// 3. Search to verify
const results = await axios.get('/api/applications/?q=github&category=work');
console.log(results.data);

// 4. Check activity
const activity = await axios.get('/api/users/activity?limit=10');
console.log('Recent activity:', activity.data);
```

---

**Last Updated**: December 30, 2025
**Version**: 1.0
