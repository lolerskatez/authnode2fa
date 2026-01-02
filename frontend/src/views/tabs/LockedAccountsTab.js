import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const LockedAccountsTab = ({ appSettings, currentUser }) => {
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
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
      danger: isDark ? '#fc8181' : '#f56565',
      warning: isDark ? '#f6e05e' : '#ed8936'
    };
  };

  const colors = getThemeColors();

  const fetchLockedAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/locked-accounts');
      setLockedAccounts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch locked accounts:', error);
      showToast('Failed to load locked accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLockedAccounts();
  }, [fetchLockedAccounts]);

  const handleUnlockAccount = async (userId, userEmail) => {
    try {
      setUnlocking(userId);
      await axios.post(`/api/admin/unlock-account/${userId}`);
      setLockedAccounts(lockedAccounts.filter(account => account.id !== userId));
      showToast(`Account ${userEmail} has been unlocked`, 'success');
    } catch (error) {
      console.error('Failed to unlock account:', error);
      showToast(error.response?.data?.detail || 'Failed to unlock account', 'error');
    } finally {
      setUnlocking(null);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeUntilUnlock = (lockedUntil) => {
    const now = new Date();
    const unlockTime = new Date(lockedUntil);
    const diffMs = unlockTime - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  return (
    <div>
      <div style={{ maxWidth: '1000px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-lock" style={{ marginRight: '8px', color: colors.accent }}></i>
          Locked Accounts
        </h3>

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

        {/* Loading State */}
        {loading ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: colors.secondary
          }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading locked accounts...
          </div>
        ) : lockedAccounts.length === 0 ? (
          <div style={{
            padding: '32px',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.secondary
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '32px', marginBottom: '12px', color: colors.success, display: 'block' }}></i>
            <p style={{ margin: '0' }}>No locked accounts at this time</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {lockedAccounts.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{
                    color: colors.primary,
                    fontWeight: '600',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}>
                    {account.email}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '13px',
                    color: colors.secondary
                  }}>
                    <div>
                      <span style={{ fontWeight: '500' }}>Failed Attempts:</span>
                      <span style={{ marginLeft: '6px', color: colors.danger }}>
                        {account.failed_login_attempts}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '500' }}>Unlocks In:</span>
                      <span style={{ marginLeft: '6px', color: colors.warning }}>
                        {getTimeUntilUnlock(account.locked_until)}
                      </span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ fontWeight: '500' }}>Locked Since:</span>
                      <span style={{ marginLeft: '6px' }}>
                        {formatDateTime(account.last_failed_login)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnlockAccount(account.id, account.email)}
                  disabled={unlocking === account.id}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: unlocking === account.id ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: unlocking === account.id ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (unlocking !== account.id) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (unlocking !== account.id) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {unlocking === account.id ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-unlock"></i>
                      Unlock Account
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={fetchLockedAccounts}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: colors.accent,
              border: `2px solid ${colors.accent}`,
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <i className="fas fa-sync"></i>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockedAccountsTab;
