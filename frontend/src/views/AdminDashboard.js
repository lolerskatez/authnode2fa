import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = ({ currentUser, appSettings, isMobile }) => {
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

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [toast, setToast] = useState(null);

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

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/admin/dashboard/stats');
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

  useEffect(() => {
    fetchStats();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const StatCard = ({ icon, label, value, color = colors.accent, change = null }) => (
    <div
      style={{
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: isMobile ? '16px' : '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
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
              cursor: 'pointer',
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
        ) : stats ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '20px' }}>
              <StatCard icon="fa-users" label="Total Users" value={stats.total_users} color={colors.info} />
              <StatCard icon="fa-user-check" label="Active Users (7d)" value={stats.active_users_7d} color={colors.success} />
              <StatCard icon="fa-key" label="2FA Accounts" value={stats.total_accounts} color={colors.accent} />
              <StatCard icon="fa-shield-alt" label="Users with 2FA" value={stats.users_with_2fa} color={colors.warning} />
              <StatCard icon="fa-sign-in-alt" label="Logins (7d)" value={stats.recent_logins_7d} color={colors.success} />
              <StatCard icon="fa-times-circle" label="Failed Logins (7d)" value={stats.recent_failed_logins_7d} color={colors.danger} />
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
        ) : null}
      </div>
    );
  }

  // Desktop View
  return (
    <div style={{ padding: '24px' }}>
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
      ) : stats ? (
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
            <StatCard icon="fa-users" label="Total Users" value={stats.total_users} color={colors.info} />
            <StatCard icon="fa-user-check" label="Active Users (7 days)" value={stats.active_users_7d} color={colors.success} />
            <StatCard icon="fa-key" label="2FA Accounts" value={stats.total_accounts} color={colors.accent} />
            <StatCard
              icon="fa-shield-alt"
              label="Users with 2FA"
              value={stats.users_with_2fa}
              color={colors.warning}
            />
            <StatCard icon="fa-sign-in-alt" label="Logins (7 days)" value={stats.recent_logins_7d} color={colors.success} />
            <StatCard
              icon="fa-times-circle"
              label="Failed Logins (7 days)"
              value={stats.recent_failed_logins_7d}
              color={colors.danger}
            />
          </div>

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
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
