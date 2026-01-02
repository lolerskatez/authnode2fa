import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuditLogsTab = ({ appSettings, currentUser }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [auditLogsFilter, setAuditLogsFilter] = useState({
    user_id: '',
    action: '',
    status: '',
    limit: 50,
    offset: 0
  });
  const [toast, setToast] = useState(null);

  // Theme-aware colors
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      accentLight: isDark ? '#2c5282' : '#e6f0ff',
      border: isDark ? '#4a5568' : '#e2e8f0',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundSecondary: isDark ? '#1a202c' : '#f7fafc',
      success: '#68d391',
      danger: isDark ? '#fc8181' : '#f56565'
    };
  };

  const colors = getThemeColors();

  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLogsLoading(true);
      const params = {};
      if (auditLogsFilter.user_id) params.user_id = auditLogsFilter.user_id;
      if (auditLogsFilter.action) params.action = auditLogsFilter.action;
      if (auditLogsFilter.status) params.status = auditLogsFilter.status;
      if (auditLogsFilter.limit) params.limit = auditLogsFilter.limit;
      if (auditLogsFilter.offset) params.offset = auditLogsFilter.offset;

      const response = await axios.get('/api/admin/audit-logs', { params });
      setAuditLogs(response.data || []);
      showToast('Audit logs loaded', 'success');
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditLogsFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleAuditLogsFilterChange = (field, value) => {
    setAuditLogsFilter(prev => ({
      ...prev,
      [field]: value,
      offset: field !== 'offset' ? 0 : value
    }));
  };

  const handleExportAuditLogs = async () => {
    try {
      const response = await axios.get('/api/admin/audit-logs/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Audit logs exported successfully');
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      showToast('Error exporting audit logs: ' + (error.response?.data?.detail || error.message), 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getActionIcon = (action) => {
    const actionIcons = {
      'login_success': 'fas fa-sign-in-alt',
      'login_failed': 'fas fa-exclamation-triangle',
      'login_2fa_pending': 'fas fa-clock',
      'login_2fa_enrollment_required': 'fas fa-shield-alt',
      'logout_success': 'fas fa-sign-out-alt',
      'signup_success': 'fas fa-user-plus',
      'signup_failed': 'fas fa-user-times',
      'password_reset_requested': 'fas fa-key',
      'password_reset_completed': 'fas fa-check-circle',
      '2fa_enabled': 'fas fa-shield-alt',
      '2fa_disabled': 'fas fa-shield-halved',
      'applications_exported': 'fas fa-download',
      'applications_imported': 'fas fa-upload',
      'session_revoked': 'fas fa-ban',
      'all_sessions_revoked': 'fas fa-ban',
      'account_locked': 'fas fa-lock',
      'account_unlocked': 'fas fa-unlock'
    };
    return actionIcons[action] || 'fas fa-info-circle';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return colors.success;
      case 'failed': return colors.danger;
      default: return colors.secondary;
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', padding: '24px', boxSizing: 'border-box' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
            <i className="fas fa-history" style={{ marginRight: '8px', color: colors.accent }}></i>
            Audit Logs
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fetchAuditLogs()}
              disabled={auditLogsLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: auditLogsLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: auditLogsLoading ? 0.6 : 1
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
              Refresh
            </button>
            <button
              onClick={handleExportAuditLogs}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-download" style={{ marginRight: '6px' }}></i>
              Export CSV
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: toast.type === 'success' ? colors.success : colors.danger,
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {toast.message}
          </div>
        )}

        {/* Filters */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.backgroundSecondary,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            <i className="fas fa-filter" style={{ marginRight: '8px', color: colors.accent }}></i>
            Filters
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: colors.primary, fontSize: '12px', fontWeight: '500' }}>
                Action
              </label>
              <select
                value={auditLogsFilter.action}
                onChange={(e) => handleAuditLogsFilterChange('action', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.primary
                }}
              >
                <option value="">All Actions</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
                <option value="logout_success">Logout Success</option>
                <option value="signup_success">Signup Success</option>
                <option value="signup_failed">Signup Failed</option>
                <option value="password_reset_requested">Password Reset Requested</option>
                <option value="password_reset_completed">Password Reset Completed</option>
                <option value="2fa_enabled">2FA Enabled</option>
                <option value="2fa_disabled">2FA Disabled</option>
                <option value="applications_exported">Applications Exported</option>
                <option value="applications_imported">Applications Imported</option>
                <option value="session_revoked">Session Revoked</option>
                <option value="all_sessions_revoked">All Sessions Revoked</option>
                <option value="account_locked">Account Locked</option>
                <option value="account_unlocked">Account Unlocked</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: colors.primary, fontSize: '12px', fontWeight: '500' }}>
                Status
              </label>
              <select
                value={auditLogsFilter.status}
                onChange={(e) => handleAuditLogsFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.primary
                }}
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: colors.primary, fontSize: '12px', fontWeight: '500' }}>
                User ID
              </label>
              <input
                type="text"
                placeholder="User ID (optional)"
                value={auditLogsFilter.user_id}
                onChange={(e) => handleAuditLogsFilterChange('user_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.primary
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                onClick={() => fetchAuditLogs()}
                disabled={auditLogsLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: auditLogsLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: auditLogsLoading ? 0.6 : 1
                }}
              >
                <i className="fas fa-search" style={{ marginRight: '6px' }}></i>
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div style={{
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden'
        }}>
          {auditLogsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
              Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
              <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
              <div>No audit logs found</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.backgroundSecondary }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      Time
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      User
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      Action
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      Status
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      IP Address
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedAuditLog(log)}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.backgroundSecondary}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px', color: colors.secondary, fontSize: '12px', fontFamily: 'monospace' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', color: colors.primary, fontSize: '12px' }}>
                        {log.username || (log.user_id ? `User ${log.user_id}` : 'System')}
                      </td>
                      <td style={{ padding: '12px', color: colors.primary, fontSize: '12px' }}>
                        <i className={getActionIcon(log.action)} style={{ marginRight: '6px', color: colors.accent }}></i>
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>
                        <span style={{
                          color: getStatusColor(log.status),
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: colors.secondary, fontSize: '12px', fontFamily: 'monospace' }}>
                        {log.ip_address || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', color: colors.secondary, fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.reason || log.details ? (
                          <span title={log.reason || JSON.stringify(log.details)}>
                            {log.reason || (log.details ? 'Details available' : 'N/A')}
                          </span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Log Detail Modal */}
        {selectedAuditLog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedAuditLog(null)}
          >
            <div
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
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, color: colors.primary, fontSize: '24px', fontWeight: '600' }}>
                  <i className={getActionIcon(selectedAuditLog.action)} style={{ marginRight: '12px', color: colors.accent }}></i>
                  Audit Log Details
                </h2>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: colors.secondary,
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Timestamp
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px', fontFamily: 'monospace' }}>
                      {new Date(selectedAuditLog.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      User
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px' }}>
                      {selectedAuditLog.username || (selectedAuditLog.user_id ? `User ${selectedAuditLog.user_id}` : 'System')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Action
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px' }}>
                      {selectedAuditLog.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Status
                    </label>
                    <span style={{
                      color: getStatusColor(selectedAuditLog.status),
                      fontWeight: '500',
                      textTransform: 'capitalize',
                      fontSize: '14px'
                    }}>
                      {selectedAuditLog.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      IP Address
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px', fontFamily: 'monospace' }}>
                      {selectedAuditLog.ip_address || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Resource
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px' }}>
                      {selectedAuditLog.resource_type ? `${selectedAuditLog.resource_type} ${selectedAuditLog.resource_id || ''}`.trim() : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedAuditLog.reason && (
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Reason
                    </label>
                    <div style={{ color: colors.primary, fontSize: '14px', lineHeight: '1.5' }}>
                      {selectedAuditLog.reason}
                    </div>
                  </div>
                )}

                {selectedAuditLog.details && (
                  <div>
                    <label style={{ display: 'block', color: colors.secondary, fontSize: '12px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Additional Details
                    </label>
                    <pre style={{
                      backgroundColor: colors.backgroundSecondary,
                      padding: '12px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      fontSize: '12px',
                      color: colors.primary,
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(selectedAuditLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsTab;
