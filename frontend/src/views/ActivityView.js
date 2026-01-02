import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityView = ({ currentUser, appSettings, isMobile }) => {
  // Theme-aware colors
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#f1f5f9' : '#1a202c',
      secondary: isDark ? '#94a3b8' : '#475569',
      accent: isDark ? '#60a5fa' : '#3b82f6',
      border: isDark ? '#334155' : '#e2e8f0',
      background: isDark ? '#1e293b' : '#ffffff',
      backgroundLight: isDark ? '#0f172a' : '#f8fafc',
      success: '#10b981',
      danger: isDark ? '#ef4444' : '#dc2626',
      warning: isDark ? '#f59e0b' : '#f97316',
      info: isDark ? '#60a5fa' : '#0284c7'
    };
  };

  const colors = getThemeColors();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [toast, setToast] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch users list for admin filter
  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/admin/users')
        .then(res => setUsers(res.data || []))
        .catch(err => console.error('Failed to fetch users:', err));
    }
  }, [isAdmin]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit, offset };
      if (filterAction) params.action = filterAction;
      if (filterStatus) params.status = filterStatus;
      if (filterUserId) params.user_id = filterUserId;

      // Use admin endpoint if admin, otherwise user endpoint
      const endpoint = isAdmin ? '/api/admin/activity' : '/api/users/activity';
      const response = await axios.get(endpoint, { params });
      setActivities(response.data || []);
      setTotalCount(response.data?.length || 0);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to load activity history');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, filterAction, filterStatus, filterUserId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchActivities();
    showToast('Activity refreshed', 'success');
  };

  const getActionIcon = (action) => {
    const iconMap = {
      // Login/Auth actions
      login_success: 'fa-sign-in-alt',
      login_failed: 'fa-times-circle',
      logout: 'fa-sign-out-alt',
      signup_success: 'fa-user-plus',
      signup_failed: 'fa-user-times',
      signup_password_breached: 'fa-exclamation-triangle',
      access_denied: 'fa-ban',
      account_locked: 'fa-lock',
      account_unlocked: 'fa-unlock',
      suspicious_login_detected: 'fa-exclamation-triangle',
      
      // Password actions
      password_reset_requested: 'fa-envelope',
      password_reset_completed: 'fa-check-circle',
      password_reset_failed: 'fa-times-circle',
      password_reset_breached: 'fa-exclamation-triangle',
      password_changed: 'fa-key',
      
      // 2FA actions
      '2fa_enabled': 'fa-shield-alt',
      '2fa_disabled': 'fa-shield-alt',
      login_success_backup_code: 'fa-key',
      login_failed_backup_code: 'fa-times-circle',
      backup_codes_regenerated: 'fa-redo',
      
      // WebAuthn actions
      webauthn_key_registered: 'fa-fingerprint',
      webauthn_login: 'fa-fingerprint',
      webauthn_key_deleted: 'fa-fingerprint',
      
      // Session actions
      session_created: 'fa-plus-circle',
      session_revoked: 'fa-minus-circle',
      all_sessions_revoked: 'fa-sign-out-alt',
      
      // Account/Application actions
      account_added: 'fa-plus-circle',
      account_updated: 'fa-edit',
      account_deleted: 'fa-trash',
      account_reordered: 'fa-arrows-alt',
      accounts_bulk_category_update: 'fa-folder',
      accounts_bulk_favorite_update: 'fa-star',
      
      // Import/Export
      applications_exported: 'fa-download',
      applications_export_failed: 'fa-times-circle',
      applications_imported: 'fa-upload',
      applications_import_failed: 'fa-times-circle'
    };
    return iconMap[action] || 'fa-info-circle';
  };

  const getActionLabel = (action) => {
    const labels = {
      // Login/Auth actions
      login_success: 'Login',
      login_failed: 'Login Failed',
      logout: 'Logout',
      signup_success: 'Sign Up',
      signup_failed: 'Sign Up Failed',
      signup_password_breached: 'Sign Up Blocked (Breached)',
      access_denied: 'Access Denied',
      account_locked: 'Account Locked',
      account_unlocked: 'Account Unlocked',
      suspicious_login_detected: 'Suspicious Login',
      
      // Password actions
      password_reset_requested: 'Password Reset Requested',
      password_reset_completed: 'Password Reset',
      password_reset_failed: 'Password Reset Failed',
      password_reset_breached: 'Password Reset Blocked',
      password_changed: 'Password Changed',
      
      // 2FA actions
      '2fa_enabled': '2FA Enabled',
      '2fa_disabled': '2FA Disabled',
      login_success_backup_code: 'Login (Backup Code)',
      login_failed_backup_code: 'Backup Code Failed',
      backup_codes_regenerated: 'Backup Codes Regenerated',
      
      // WebAuthn actions
      webauthn_key_registered: 'Passkey Registered',
      webauthn_login: 'Passkey Login',
      webauthn_key_deleted: 'Passkey Deleted',
      
      // Session actions
      session_created: 'Session Created',
      session_revoked: 'Session Revoked',
      all_sessions_revoked: 'All Sessions Revoked',
      
      // Account/Application actions
      account_added: 'Account Added',
      account_updated: 'Account Updated',
      account_deleted: 'Account Deleted',
      account_reordered: 'Accounts Reordered',
      accounts_bulk_category_update: 'Bulk Category Update',
      accounts_bulk_favorite_update: 'Bulk Favorite Update',
      
      // Import/Export
      applications_exported: 'Accounts Exported',
      applications_export_failed: 'Export Failed',
      applications_imported: 'Accounts Imported',
      applications_import_failed: 'Import Failed'
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStatusColor = (status) => {
    return status === 'success' ? colors.success : colors.danger;
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Unknown';
    }
  };

  const pageInfo = {
    currentPage: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil((totalCount || activities.length) / limit),
    showing: activities.length
  };

  const handlePreviousPage = () => {
    if (offset > 0) setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    setOffset(offset + limit);
  };

  const ActivityDetailModal = ({ activity, onClose }) => {
    if (!activity) return null;

    return (
      <>
        {/* Modal Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.secondary,
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {/* Title with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(activity.status) + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i
                  className={`fas ${getActionIcon(activity.action)}`}
                  style={{ color: getStatusColor(activity.status), fontSize: '24px' }}
                ></i>
              </div>
              <div>
                <h2 style={{ margin: 0, color: colors.primary }}>{getActionLabel(activity.action)}</h2>
                <div style={{ color: colors.secondary, fontSize: '13px', marginTop: '4px' }}>
                  {formatDate(activity.created_at)}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                  Status
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: getStatusColor(activity.status) + '20',
                    color: getStatusColor(activity.status),
                    fontSize: '13px',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {activity.status}
                </div>
              </div>

              {activity.email && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    User
                  </div>
                  <div style={{ color: colors.primary, fontSize: '14px' }}>
                    {activity.email}
                  </div>
                </div>
              )}

              {activity.ip_address && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    IP Address
                  </div>
                  <div style={{ color: colors.primary, fontSize: '14px' }}>
                    <i className="fas fa-globe" style={{ marginRight: '8px' }}></i>
                    {activity.ip_address}
                  </div>
                </div>
              )}

              {activity.created_at && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Timestamp
                  </div>
                  <div style={{ color: colors.primary, fontSize: '14px' }}>
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              )}

              {activity.resource_type && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Resource Type
                  </div>
                  <div style={{ color: colors.primary, fontSize: '14px', textTransform: 'capitalize' }}>
                    {activity.resource_type}
                  </div>
                </div>
              )}

              {activity.details && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.secondary, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Additional Details
                  </div>
                  <div style={{
                    backgroundColor: colors.backgroundLight,
                    padding: '12px',
                    borderRadius: '6px',
                    color: colors.primary,
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details, null, 2)}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  };

  if (isMobile) {
    return (
      <div style={{ padding: '16px', backgroundColor: appSettings?.theme === 'dark' ? '#0f172a' : '#f8fafc', minHeight: '100vh' }}>
        <h2 style={{ color: colors.primary, marginBottom: '16px' }}>Activity Log</h2>

        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setOffset(0);
            }}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
              color: colors.primary
            }}
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="account_added">Account Added</option>
            <option value="account_updated">Account Updated</option>
            <option value="password_changed">Password Changed</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setOffset(0);
            }}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
              color: colors.primary
            }}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          {isAdmin && (
            <select
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setOffset(0);
              }}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.background,
                color: colors.primary
              }}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          )}
        </div>

        {/* Activity List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
            <p>Loading activity...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fff5f5', color: colors.danger, padding: '16px', borderRadius: '4px' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.secondary }}>
            <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
            <p>No activity found</p>
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ':hover': { transform: 'translateY(-2px)' }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.backgroundColor = appSettings?.theme === 'dark' ? '#1e293b' : '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = colors.background;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(activity.status) + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <i
                      className={`fas ${getActionIcon(activity.action)}`}
                      style={{ color: getStatusColor(activity.status), fontSize: '16px' }}
                    ></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.primary, fontWeight: '600', marginBottom: '4px' }}>
                      {getActionLabel(activity.action)}
                    </div>
                    <div style={{ color: colors.secondary, fontSize: '13px', marginBottom: '4px' }}>
                      {formatDate(activity.created_at)}
                    </div>
                    {activity.ip_address && (
                      <div style={{ color: colors.secondary, fontSize: '12px' }}>
                        <i className="fas fa-globe" style={{ marginRight: '4px' }}></i>
                        {activity.ip_address}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '3px',
                      backgroundColor: getStatusColor(activity.status) + '20',
                      color: getStatusColor(activity.status),
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {activity.status}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Pagination */}
        {activities.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: colors.background,
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '13px',
              color: colors.secondary
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              Page {pageInfo.currentPage} of {pageInfo.totalPages} ({activities.length} items)
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={handlePreviousPage}
                disabled={offset === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: offset === 0 ? colors.border : colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  opacity: offset === 0 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Next
              </button>
              <button
                onClick={handleRefresh}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.success,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop View
  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: colors.backgroundLight }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', padding: '24px 24px 0 24px' }}>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.success,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <i className="fas fa-sync-alt" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}></i>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          padding: '0 24px'
        }}
      >
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setOffset(0);
          }}
          style={{
            padding: '10px 12px',
            borderRadius: '4px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.primary,
            minWidth: '150px'
          }}
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="account_added">Account Added</option>
          <option value="account_updated">Account Updated</option>
          <option value="account_deleted">Account Deleted</option>
          <option value="account_reordered">Account Reordered</option>
          <option value="password_changed">Password Changed</option>
          <option value="2fa_enabled">2FA Enabled</option>
          <option value="session_created">Session Created</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setOffset(0);
          }}
          style={{
            padding: '10px 12px',
            borderRadius: '4px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.primary,
            minWidth: '150px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>

        {/* User Filter (Admin Only) */}
        {isAdmin && (
          <select
            value={filterUserId}
            onChange={(e) => {
              setFilterUserId(e.target.value);
              setOffset(0);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '4px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
              color: colors.primary,
              minWidth: '150px'
            }}
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* Activity Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.secondary }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '20px' }}></i>
          <p>Loading activity history...</p>
        </div>
      ) : error ? (
        <div
          style={{
            backgroundColor: appSettings?.theme === 'dark' ? '#7c2d12' : '#fff5f5',
            color: colors.danger,
            padding: '16px',
            borderRadius: '4px',
            border: `1px solid ${colors.danger}30`,
            margin: '0 24px'
          }}
        >
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.secondary }}>
          <i className="fas fa-inbox" style={{ fontSize: '40px', marginBottom: '20px' }}></i>
          <p>No activity records found</p>
        </div>
      ) : (
        <>
          <div
            style={{
              overflowX: 'auto',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              backgroundColor: colors.background,
              margin: '0 24px 24px 24px',
              flex: 1
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.backgroundLight }}>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: colors.primary,
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Action
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: colors.primary,
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Date/Time
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: colors.primary,
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    IP Address
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: colors.primary,
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: index % 2 === 0 ? colors.background : colors.backgroundLight,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = appSettings?.theme === 'dark' ? '#1e293b' : '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? colors.background : colors.backgroundLight;
                    }}
                  >
                    <td style={{ padding: '12px', color: colors.primary }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i
                          className={`fas ${getActionIcon(activity.action)}`}
                          style={{
                            color: getStatusColor(activity.status),
                            minWidth: '20px'
                          }}
                        ></i>
                        <span>{getActionLabel(activity.action)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: colors.secondary, fontSize: '13px' }}>
                      {formatDate(activity.created_at)}
                      <br />
                      <span style={{ fontSize: '11px' }}>
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: colors.secondary, fontSize: '13px' }}>
                      {activity.ip_address || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          backgroundColor: getStatusColor(activity.status) + '20',
                          color: getStatusColor(activity.status),
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: colors.backgroundLight,
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '16px 24px 24px 24px'
            }}
          >
            <div style={{ color: colors.secondary, fontSize: '13px' }}>
              Showing {activities.length} items | Page {pageInfo.currentPage} of {pageInfo.totalPages}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePreviousPage}
                disabled={offset === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: offset === 0 ? colors.border : colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  opacity: offset === 0 ? 0.5 : 1,
                  fontSize: '13px'
                }}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <button
                onClick={handleNextPage}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default ActivityView;
