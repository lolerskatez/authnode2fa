import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = ({ currentUser, appSettings, isMobile }) => {
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

  const [stats, setStats] = useState({
    total_users: 0,
    active_users_7d: 0,
    total_accounts: 0,
    users_with_2fa: 0,
    two_fa_coverage_percent: 0,
    recent_logins_7d: 0,
    recent_failed_logins_7d: 0,
    locked_accounts: 0,
    locked_accounts_details: [],
    top_active_users: [],
    account_distribution_by_category: [],
    recent_events: [],
    login_trend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedCard, setSelectedCard] = useState(null);
  const [unlockedUsers, setUnlockedUsers] = useState(new Set());
  // eslint-disable-next-line no-unused-vars
  const [toast, setToast] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/admin/dashboard/stats');
      console.log('[DEBUG] Dashboard stats received:', response.data);
      setStats(response.data);
      setLastRefresh(new Date());
      showToast('Dashboard refreshed', 'success');
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAccount = async (userId, email) => {
    try {
      await axios.post(`/api/admin/unlock-account/${userId}`);
      setUnlockedUsers(prev => new Set([...prev, userId]));
      showToast(`Account for ${email} has been unlocked`, 'success');
      // Refresh stats after unlock
      setTimeout(fetchStats, 1000);
    } catch (err) {
      console.error('Failed to unlock account:', err);
      showToast('Failed to unlock account', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin access check
  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <i className="fas fa-lock" style={{ fontSize: '48px', color: colors.danger, marginBottom: '16px' }}></i>
        <h2 style={{ color: colors.danger }}>Access Denied</h2>
        <p style={{ color: colors.secondary }}>Only administrators can view the dashboard.</p>
      </div>
    );
  }

  const StatCard = ({ icon, label, value, color = colors.accent, change = null, onClick = null }) => (
    <div
      onClick={onClick}
      style={{
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: isMobile ? '16px' : '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: onClick ? 'scale(1)' : 'none',
        boxShadow: onClick ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }
      }}
    >
      <div
        style={{
          width: isMobile ? '48px' : '56px',
          height: isMobile ? '48px' : '56px',
          borderRadius: '8px',
          backgroundColor: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <i className={`fas ${icon}`} style={{ fontSize: isMobile ? '24px' : '28px', color }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: colors.secondary, fontSize: isMobile ? '12px' : '13px', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 'bold', color: colors.primary }}>
          {value}
        </div>
        {change && (
          <div
            style={{
              fontSize: '12px',
              color: change > 0 ? colors.success : colors.danger,
              marginTop: '4px'
            }}
          >
            {change > 0 ? '↑' : '↓'} {Math.abs(change)} this week
          </div>
        )}
      </div>
    </div>
  );

  const DetailModal = ({ card, onClose }) => {
    if (!card) return null;

    const getCardDetails = () => {
      const details = {
        'total_users': {
          title: 'Total Users',
          icon: 'fa-users',
          description: `There are ${stats.total_users || 0} registered users in the system.`,
          insights: [
            `Active in last 7 days: ${stats.active_users_7d || 0} users`,
            `${stats.users_with_2fa || 0} users have 2FA enabled (${stats.two_fa_coverage_percent !== undefined ? stats.two_fa_coverage_percent : 0}%)`,
            `${stats.locked_accounts || 0} accounts are currently locked`
          ]
        },
        'active_users_7d': {
          title: 'Active Users (Last 7 Days)',
          icon: 'fa-user-check',
          description: `${stats.active_users_7d || 0} users have logged in or been active in the past 7 days.`,
          insights: [
            `Total logins: ${stats.recent_logins_7d || 0}`,
            `Failed logins: ${stats.recent_failed_logins_7d || 0}`,
            `User engagement: ${((stats.active_users_7d || 0) / (stats.total_users || 1) * 100).toFixed(1)}%`
          ]
        },
        'total_accounts': {
          title: '2FA Accounts',
          icon: 'fa-key',
          description: `${stats.total_accounts || 0} authenticator accounts are configured in the system.`,
          insights: [
            `2FA adoption rate: ${stats.two_fa_coverage_percent !== undefined ? stats.two_fa_coverage_percent : 0}%`,
            `Users with 2FA: ${stats.users_with_2fa || 0}`,
            `Avg accounts per user: ${((stats.total_accounts || 0) / (stats.users_with_2fa || 1)).toFixed(1)}`
          ]
        },
        'two_fa_coverage_percent': {
          title: '2FA Coverage',
          icon: 'fa-shield-alt',
          description: `${stats.two_fa_coverage_percent !== undefined ? stats.two_fa_coverage_percent : 0}% of users have 2FA enabled.`,
          insights: [
            `${stats.users_with_2fa || 0} out of ${stats.total_users || 0} users protected`,
            `${stats.total_accounts || 0} total 2FA accounts configured`,
            `${(stats.total_users || 0) - (stats.users_with_2fa || 0)} users without 2FA protection`
          ]
        },
        'recent_logins_7d': {
          title: 'Logins (Last 7 Days)',
          icon: 'fa-sign-in-alt',
          description: `${stats.recent_logins_7d || 0} successful logins in the past 7 days.`,
          insights: [
            `Failed attempts: ${stats.recent_failed_logins_7d || 0}`,
            `Success rate: ${(((stats.recent_logins_7d || 0) / ((stats.recent_logins_7d || 0) + (stats.recent_failed_logins_7d || 0) || 1)) * 100).toFixed(1)}%`,
            `Avg logins per active user: ${((stats.recent_logins_7d || 0) / (stats.active_users_7d || 1)).toFixed(1)}`
          ]
        },
        'recent_failed_logins_7d': {
          title: 'Failed Logins (Last 7 Days)',
          icon: 'fa-times-circle',
          description: `${stats.recent_failed_logins_7d || 0} failed login attempts in the past 7 days.`,
          insights: [
            `Success rate: ${(((stats.recent_logins_7d || 0) / ((stats.recent_logins_7d || 0) + (stats.recent_failed_logins_7d || 0) || 1)) * 100).toFixed(1)}%`,
            `Failed ratio: ${(((stats.recent_failed_logins_7d || 0) / ((stats.recent_logins_7d || 0) + (stats.recent_failed_logins_7d || 0) || 1)) * 100).toFixed(1)}%`,
            `${stats.locked_accounts || 0} accounts locked due to failed attempts`
          ]
        },
        'locked_accounts': {
          title: 'Locked Accounts',
          icon: 'fa-lock',
          description: `${stats.locked_accounts || 0} accounts are currently locked due to failed login attempts.`,
          isTable: true,
          insights: [
            `Automatic unlock after too many failed attempts`,
            `Admins can manually unlock accounts`,
            `Failed attempts are tracked per account`
          ]
        }
      };
      return details[card] || {};
    };

    const details = getCardDetails();

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
              maxWidth: '500px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '28px', color: colors.info }}>
                <i className={`fas ${details.icon}`}></i>
              </div>
              <h2 style={{ margin: 0, color: colors.primary }}>{details.title}</h2>
            </div>

            {/* Description */}
            <p style={{ color: colors.secondary, fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              {details.description}
            </p>

            {/* Locked Accounts Table View */}
            {details.isTable && stats.locked_accounts_details && stats.locked_accounts_details.length > 0 && (
              <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
                <h3 style={{ color: colors.primary, fontSize: '14px', marginBottom: '12px', marginTop: 0 }}>
                  Locked Users
                </h3>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: colors.secondary, fontWeight: '600' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '8px', color: colors.secondary, fontWeight: '600' }}>Failed Attempts</th>
                      <th style={{ textAlign: 'center', padding: '8px', color: colors.secondary, fontWeight: '600' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.locked_accounts_details.map((user) => (
                      <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '8px', color: colors.primary }}>{user.email}</td>
                        <td style={{ padding: '8px', color: colors.secondary }}>{user.failed_login_attempts}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {unlockedUsers.has(user.id) ? (
                            <span style={{ color: colors.success }}>✓ Unlocked</span>
                          ) : (
                            <button
                              onClick={() => handleUnlockAccount(user.id, user.email)}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: colors.warning,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Unlock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Insights */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: colors.primary, fontSize: '14px', marginBottom: '12px', marginTop: 0 }}>
                Key Insights
              </h3>
              <ul style={{ color: colors.secondary, fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                {details.insights?.map((insight, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {insight}
                  </li>
                ))}
              </ul>
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
      <div style={{ padding: '16px', backgroundColor: colors.backgroundLight, minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: colors.primary }}>Dashboard</h2>
          <button
            onClick={fetchStats}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: colors.success,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <i className="fas fa-sync-alt" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}></i>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
            <p>Loading statistics...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: colors.danger + '20', color: colors.danger, padding: '12px', borderRadius: '4px' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '20px' }}>
              <StatCard icon="fa-users" label="Total Users" value={stats.total_users} color={colors.info} onClick={() => setSelectedCard('total_users')} />
              <StatCard icon="fa-user-check" label="Active Users (7d)" value={stats.active_users_7d} color={colors.success} onClick={() => setSelectedCard('active_users_7d')} />
              <StatCard icon="fa-key" label="2FA Accounts" value={stats.total_accounts} color={colors.accent} onClick={() => setSelectedCard('total_accounts')} />
              <StatCard icon="fa-shield-alt" label="2FA Coverage" value={`${stats.two_fa_coverage_percent}%`} color={colors.warning} onClick={() => setSelectedCard('two_fa_coverage_percent')} />
              <StatCard icon="fa-sign-in-alt" label="Logins (7d)" value={stats.recent_logins_7d} color={colors.success} onClick={() => setSelectedCard('recent_logins_7d')} />
              <StatCard icon="fa-times-circle" label="Failed Logins (7d)" value={stats.recent_failed_logins_7d} color={colors.danger} onClick={() => setSelectedCard('recent_failed_logins_7d')} />
              <StatCard icon="fa-lock" label="Locked Accounts" value={stats.locked_accounts || 0} color={colors.danger} onClick={() => setSelectedCard('locked_accounts')} />
            </div>

            {/* Top Active Users */}
            {stats.top_active_users && stats.top_active_users.length > 0 && (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px' }}>
                  <i className="fas fa-fire" style={{ marginRight: '8px', color: colors.warning }}></i>
                  Top Active Users (7d)
                </h3>
                {stats.top_active_users.map((user, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px 0',
                      borderBottom: index < stats.top_active_users.length - 1 ? `1px solid ${colors.border}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: colors.primary }}>
                        {index + 1}. {user.email}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: colors.accent + '20',
                        color: colors.accent,
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      {user.login_count} logins
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Account Distribution */}
            {stats.account_distribution_by_category && stats.account_distribution_by_category.length > 0 && (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px' }}>
                  <i className="fas fa-chart-pie" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Account Distribution
                </h3>
                {stats.account_distribution_by_category.map((item, index) => {
                  const total = stats.account_distribution_by_category.reduce((sum, cat) => sum + cat.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  return (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: colors.primary, fontSize: '12px', fontWeight: '600' }}>
                          {item.category}
                        </span>
                        <span style={{ color: colors.secondary, fontSize: '12px' }}>
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: colors.backgroundLight,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: colors.accent,
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '16px', color: colors.secondary, fontSize: '12px', textAlign: 'center' }}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </>
        )}
        {selectedCard && <DetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
      </div>
    );
  }

  // Desktop View
  return (
    <div style={{ padding: '24px', backgroundColor: colors.backgroundLight, minHeight: '100vh', overflowY: 'auto', maxHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: colors.primary }}>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: colors.secondary, fontSize: '12px' }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchStats}
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
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.secondary }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '20px' }}></i>
          <p>Loading statistics...</p>
        </div>
      ) : error ? (
        <div
          style={{
            backgroundColor: appSettings?.theme === 'dark' ? '#7c2d12' : '#fff5f5',
            color: colors.danger,
            padding: '16px',
            borderRadius: '4px',
            border: `1px solid ${colors.danger}30`,
            marginBottom: '24px'
          }}
        >
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <StatCard icon="fa-users" label="Total Users" value={stats.total_users} color={colors.info} onClick={() => setSelectedCard('total_users')} />
            <StatCard icon="fa-user-check" label="Active Users (7 days)" value={stats.active_users_7d} color={colors.success} onClick={() => setSelectedCard('active_users_7d')} />
            <StatCard icon="fa-key" label="2FA Accounts" value={stats.total_accounts} color={colors.accent} onClick={() => setSelectedCard('total_accounts')} />
            <StatCard
              icon="fa-shield-alt"
              label="2FA Coverage"
              value={`${stats.two_fa_coverage_percent !== undefined ? stats.two_fa_coverage_percent : 0}%`}
              color={colors.warning}
              onClick={() => setSelectedCard('two_fa_coverage_percent')}
            />
            <StatCard icon="fa-sign-in-alt" label="Logins (7 days)" value={stats.recent_logins_7d} color={colors.success} onClick={() => setSelectedCard('recent_logins_7d')} />
            <StatCard
              icon="fa-times-circle"
              label="Failed Logins (7 days)"
              value={stats.recent_failed_logins_7d}
              color={colors.danger}
              onClick={() => setSelectedCard('recent_failed_logins_7d')}
            />
            <StatCard
              icon="fa-lock"
              label="Locked Accounts"
              value={stats.locked_accounts || 0}
              color={colors.danger}
              onClick={() => setSelectedCard('locked_accounts')}
            />
          </div>

          {/* Security Alerts */}
          {stats.locked_accounts > 0 && (
            <div
              style={{
                backgroundColor: colors.danger + '15',
                border: `1px solid ${colors.danger}40`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <i className="fas fa-exclamation-triangle" style={{ color: colors.danger, marginTop: '2px' }}></i>
              <div>
                <div style={{ color: colors.danger, fontWeight: '600', marginBottom: '4px' }}>
                  ⚠️ Security Alert
                </div>
                <div style={{ color: colors.secondary, fontSize: '13px' }}>
                  {stats.locked_accounts} account(s) currently locked due to failed login attempts.
                </div>
              </div>
            </div>
          )}

          {/* Bottom Row: Top Users and Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Top Active Users */}
            {stats.top_active_users && stats.top_active_users.length > 0 && (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '20px'
                }}
              >
                <h3 style={{ margin: '0 0 16px 0', color: colors.primary }}>
                  <i className="fas fa-fire" style={{ marginRight: '8px', color: colors.warning }}></i>
                  Top Active Users (Last 7 Days)
                </h3>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th
                        style={{
                          padding: '8px 0',
                          textAlign: 'left',
                          color: colors.secondary,
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        User
                      </th>
                      <th
                        style={{
                          padding: '8px 0',
                          textAlign: 'right',
                          color: colors.secondary,
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        Logins
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_active_users.map((user, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px 0', color: colors.primary, fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: colors.accent + '20',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: colors.accent
                              }}
                            >
                              {index + 1}
                            </span>
                            {user.email}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '12px 0',
                            textAlign: 'right',
                            color: colors.secondary,
                            fontSize: '13px'
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: colors.accent + '20',
                              color: colors.accent,
                              padding: '4px 8px',
                              borderRadius: '3px',
                              fontWeight: '600'
                            }}
                          >
                            {user.login_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Account Distribution */}
            {stats.account_distribution_by_category && stats.account_distribution_by_category.length > 0 && (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '20px'
                }}
              >
                <h3 style={{ margin: '0 0 16px 0', color: colors.primary }}>
                  <i className="fas fa-chart-pie" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Account Distribution by Category
                </h3>
                {stats.account_distribution_by_category.map((item, index) => {
                  const total = stats.account_distribution_by_category.reduce((sum, cat) => sum + cat.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  const colors_array = [colors.accent, colors.success, colors.warning, colors.info];
                  const color = colors_array[index % colors_array.length];

                  return (
                    <div key={index} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              borderRadius: '2px',
                              backgroundColor: color,
                              marginRight: '8px'
                            }}
                          ></span>
                          <span style={{ color: colors.primary, fontWeight: '600', fontSize: '13px' }}>
                            {item.category}
                          </span>
                        </div>
                        <span style={{ color: colors.secondary, fontSize: '13px', fontWeight: '600' }}>
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: colors.backgroundLight,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: color,
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Login Trend Chart */}
          {stats.login_trend ? (
            stats.login_trend.length > 0 ? (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '24px'
                }}
              >
                <h3 style={{ margin: '0 0 16px 0', color: colors.primary }}>
                  <i className="fas fa-chart-line" style={{ marginRight: '8px', color: colors.success }}></i>
                  Login Trend (Last 7 Days)
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px' }}>
                  {stats.login_trend.map((data, index) => {
                    const maxCount = Math.max(...stats.login_trend.map(d => d.count));
                    const height = (data.count / maxCount) * 100;
                    const date = new Date(data.date);
                    return (
                      <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                        <div
                          style={{
                            width: '100%',
                            height: `${height}%`,
                            backgroundColor: colors.success,
                            borderRadius: '4px 4px 0 0',
                            minHeight: '20px',
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                          title={`${data.count} logins`}
                        ></div>
                        <div style={{ fontSize: '11px', color: colors.secondary, marginTop: '8px' }}>
                          {date.getMonth() + 1}/{date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '24px',
                  textAlign: 'center',
                  color: colors.secondary
                }}
              >
                <i className="fas fa-chart-bar" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.5 }}></i>
                <p>No login data available for the past 7 days</p>
              </div>
            )
          ) : null}
        </>
      )}
      {selectedCard && <DetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
};

export default AdminDashboard;
