# Quick Test Guide: Activity & Dashboard Features

## 🚀 Quick Start Testing

This guide helps you quickly test the two new features that were just implemented.

---

## Prerequisites

✅ Backend running: `python -m uvicorn app.main:app --reload`
✅ Frontend running: `npm start` 
✅ At least one user account created
✅ Logged in as that user

---

## Feature 1: Activity Log

### Test Location
```
Sidebar → Activity
OR
Mobile Menu → Activity
```

### What to Look For

1. **Page Loads Successfully**
   - [ ] Activity view displays without errors
   - [ ] "Loading statistics..." spinner appears briefly
   - [ ] Activity list appears after loading

2. **Activity List Displays**
   - [ ] See activity entries with:
     - Action (login, logout, account_added, etc.)
     - Status (success or failed)
     - Timestamp
     - IP address (if available)
   - [ ] Entries are formatted nicely
   - [ ] Relative time displays ("2 hours ago")

3. **Filtering Works**
   - [ ] Click "Action Type" dropdown
   - [ ] Select different action types
   - [ ] List updates accordingly
   - [ ] Click "Status" dropdown
   - [ ] Filter by "success" or "failed"
   - [ ] List updates accordingly

4. **Pagination Works**
   - [ ] See pagination controls at bottom
   - [ ] Click "Next" button
   - [ ] New entries appear
   - [ ] Click "Previous" button
   - [ ] Original entries return
   - [ ] Page info updates ("Page 1 of N")

5. **Refresh Works**
   - [ ] Click refresh button
   - [ ] Spinner animates
   - [ ] Toast notification shows "Activity refreshed"
   - [ ] "Last updated" timestamp changes

6. **Mobile Responsive**
   - [ ] On mobile device, activity shows as cards
   - [ ] On desktop, activity shows as table
   - [ ] All controls work on both layouts

### Example Activity Actions
```
login             - User logged in
logout            - User logged out
account_added     - New 2FA account added
account_updated   - 2FA account modified
account_deleted   - 2FA account removed
code_viewed       - 2FA code displayed
password_changed  - Password was changed
2fa_enabled       - 2FA was enabled
webauthn_added    - Security key added
profile_updated   - User profile changed
```

---

## Feature 2: Admin Dashboard

### Test Location (Admin Users Only)
```
Sidebar → Dashboard
OR
Mobile Menu → Dashboard
```

### What to Look For

1. **Access Control**
   - [ ] Regular users: Dashboard option does NOT appear in sidebar
   - [ ] Regular users: If they somehow access it, see "Access Denied"
   - [ ] Admin users: Dashboard appears in sidebar
   - [ ] Admin users: Can click and view dashboard

2. **Statistics Cards Display**
   - [ ] See 6 cards with these metrics:
     1. **Total Users** - Total count of all users
     2. **Active Users (7d)** - Users who logged in last 7 days
     3. **2FA Accounts** - Total authenticator accounts
     4. **Users with 2FA** - Users who have at least one 2FA account
     5. **Logins (7d)** - Successful logins last 7 days
     6. **Failed Logins (7d)** - Failed login attempts last 7 days
   - [ ] Cards show icons and numbers
   - [ ] Numbers update correctly

3. **Top Active Users**
   - [ ] See list of most active users (last 7 days)
   - [ ] Shows user email and login count
   - [ ] Users ranked by activity

4. **Account Distribution**
   - [ ] See categories (Work, Personal, Security)
   - [ ] Shows count and percentage for each
   - [ ] Progress bars visualize distribution
   - [ ] Colors differentiate categories

5. **Refresh Functionality**
   - [ ] Click "Refresh" button
   - [ ] Spinner animates
   - [ ] "Last updated" timestamp changes
   - [ ] Stats update (if new data available)

6. **Mobile Responsive**
   - [ ] On mobile: cards stack vertically
   - [ ] On mobile: charts show simplified view
   - [ ] On desktop: grid layout with 2-3 columns
   - [ ] All features work on mobile

---

## Testing Checklist

### Activity View
```
[ ] Page loads without errors
[ ] Activity list displays
[ ] Action type filter works
[ ] Status filter works
[ ] Pagination buttons work
[ ] Refresh button works
[ ] Mobile layout responsive
[ ] Desktop layout responsive
[ ] Dark theme works
[ ] Light theme works
[ ] Loading spinner shows
[ ] Empty state shows (if no data)
[ ] Error state shows (if API fails)
```

### Admin Dashboard
```
[ ] Admin can access (regular user cannot)
[ ] All 6 stat cards display
[ ] Top users list shows
[ ] Distribution chart shows
[ ] Refresh button works
[ ] Mobile layout responsive
[ ] Desktop layout responsive
[ ] Dark theme works
[ ] Light theme works
[ ] Loading spinner shows
[ ] Access denied message shows for non-admins
```

### Theme Switching
```
[ ] Toggle theme in Settings
[ ] ActivityView colors update instantly
[ ] AdminDashboard colors update instantly
[ ] No page reload required
[ ] Colors are readable in both modes
```

### Navigation
```
[ ] Activity link visible in sidebar
[ ] Dashboard link visible for admins only
[ ] Active state highlights current view
[ ] Clicking navigation changes view
[ ] Mobile menu works
[ ] Back buttons work
```

---

## What Data You Should See

### Example Activity Log Entry
```
Action:     login
Status:     success (green badge)
Timestamp:  2 hours ago
IP:         192.168.1.100
User Agent: Mozilla/5.0...
```

### Example Dashboard Stats
```
Total Users:         25
Active Users (7d):   18
2FA Accounts:        47
Users with 2FA:      15
Logins (7d):         156
Failed Logins (7d):  3
```

### Example Top Users
```
1. john@example.com     - 23 logins
2. jane@example.com     - 18 logins
3. admin@example.com    - 15 logins
```

### Example Distribution
```
Work:       30 accounts (63%)
Personal:   15 accounts (32%)
Security:   2 accounts   (4%)
```

---

## Troubleshooting

### Activity View Not Loading
**Problem**: Shows error or blank page
**Solution**:
1. Check browser console for errors
2. Verify backend is running: `curl http://localhost:8000/api/users/activity`
3. Check JWT token in localStorage
4. Verify user is authenticated

### Dashboard Not Visible
**Problem**: Dashboard link doesn't appear
**Solution**:
1. Make sure you're logged in as admin
2. Check user role in database
3. Clear browser cache and reload

### Stats Not Updating
**Problem**: Numbers don't change after refresh
**Solution**:
1. Check if there's new activity in the system
2. Verify API is responding: `curl http://localhost:8000/api/admin/dashboard/stats`
3. Check network tab in DevTools

### Mobile Layout Broken
**Problem**: Cards overlap or don't display correctly
**Solution**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check screen width (should trigger mobile at <768px)
3. Clear browser cache
4. Try different mobile device size

---

## Performance Notes

- **First Load**: ~1-2 seconds (includes API call)
- **Pagination**: ~500ms per page load
- **Theme Switch**: Instant (< 100ms)
- **Refresh**: ~500ms-1s (includes API call)

---

## Browser DevTools Tips

### Activity View
```javascript
// In browser console, test the API directly:
fetch('/api/users/activity?limit=50&offset=0', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(d => console.log(d))
```

### Admin Dashboard
```javascript
// In browser console, test the API directly:
fetch('/api/admin/dashboard/stats', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(d => console.log(d))
```

---

## Expected API Responses

### GET /api/users/activity
```json
[
  {
    "id": 1,
    "user_id": 1,
    "action": "login",
    "status": "success",
    "timestamp": "2024-01-15T10:30:00",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
]
```

### GET /api/admin/dashboard/stats
```json
{
  "total_users": 25,
  "active_users_7d": 18,
  "total_accounts": 47,
  "users_with_2fa": 15,
  "recent_logins_7d": 156,
  "recent_failed_logins_7d": 3,
  "top_active_users": [
    {"email": "user@example.com", "login_count": 23}
  ],
  "account_distribution_by_category": [
    {"category": "Work", "count": 30}
  ]
}
```

---

## Success Criteria

✅ **Feature is working if**:
- No console errors
- Data displays correctly
- Filters/pagination work
- Responsive design works
- Theme switching works
- Mobile and desktop layouts differ appropriately
- API calls succeed
- Access control works (admin-only for dashboard)

---

## Next Steps

Once you've verified everything works:

1. **Deploy to staging** for user testing
2. **Collect user feedback** on the new features
3. **Monitor logs** for errors
4. **Deploy to production** when ready
5. **Train users** on how to use Activity and Dashboard

---

## Support

If something isn't working:

1. Check the browser console for errors
2. Check the backend logs
3. Verify all files were created correctly
4. Review INTEGRATION_VERIFICATION.md for setup details
5. Check API endpoints are responding

---

**Happy Testing! 🎉**

The Activity Log and Admin Dashboard are now ready for use.
