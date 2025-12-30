import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityView = ({ currentUser, appSettings, isMobile }) => {
  // Theme-aware colors
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      border: isDark ? '#4a5568' : '#e2e8f0',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundLight: isDark ? '#1a202c' : '#f7fafc',
      success: '#48bb78',
      danger: isDark ? '#fc8181' : '#f56565',
      warning: isDark ? '#f6ad55' : '#ed8936',
      info: isDark ? '#63b3ed' : '#4299e1'
    };
  };

  const colors = getThemeColors();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit, offset };
      if (filterAction) params.action = filterAction;
      if (filterStatus) params.status = filterStatus;

      const response = await axios.get('/api/users/activity', { params });
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
  }, [limit, offset, filterAction, filterStatus]);

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
      login: 'fa-sign-in-alt',
      logout: 'fa-sign-out-alt',
      account_added: 'fa-plus-circle',
      account_updated: 'fa-edit',
      account_deleted: 'fa-trash',
      account_reordered: 'fa-arrows',
      'session_created': 'fa-plus-circle',
      'session_revoked': 'fa-minus-circle',
      '2fa_enabled': 'fa-shield-alt',
      '2fa_disabled': 'fa-times-circle',
      'password_changed': 'fa-key',
      'applications_exported': 'fa-download',
      'applications_imported': 'fa-upload'
    };
    return iconMap[action] || 'fa-info-circle';
  };

  const getActionLabel = (action) => {
    const labels = {
      login: 'Login',
      logout: 'Logout',
      account_added: 'Account Added',
      account_updated: 'Account Updated',
      account_deleted: 'Account Deleted',
      account_reordered: 'Account Reordered',
      'session_created': 'Session Created',
      'session_revoked': 'Session Revoked',
      '2fa_enabled': '2FA Enabled',
      '2fa_disabled': '2FA Disabled',
      'password_changed': 'Password Changed',
      'applications_exported': 'Accounts Exported',
      'applications_imported': 'Accounts Imported'
    };
    return labels[action] || action;
  };

  const getStatusColor = (status) => {
    return status === 'success' ? colors.success : colors.danger;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
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
    } catch {
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

  if (isMobile) {
    return (
      <div style={{ padding: '16px', backgroundColor: colors.backgroundLight, minHeight: '100vh' }}>
        <h2 style={{ color: colors.primary, marginBottom: '16px' }}>Activity Log</h2>

        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              color: colors.primary,
              flex: 1,
              minWidth: '120px'
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
              color: colors.primary,
              flex: 1,
              minWidth: '100px'
            }}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
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
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '8px'
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
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: colors.primary }}>Activity History</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.success,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
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
          flexWrap: 'wrap'
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
            border: `1px solid ${colors.danger}30`
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
              backgroundColor: colors.background
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
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: index % 2 === 0 ? colors.background : colors.backgroundLight
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
              backgroundColor: colors.background,
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
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
    </div>
  );
};

export default ActivityView;
