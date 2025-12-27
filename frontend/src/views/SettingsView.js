import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserManagement from '../UserManagement';
import '../App.css';

const SettingsView = ({ 
  currentUser, 
  isMobile,
  activeTab,
  onTabChange,
  appSettings,
  onSettingsChange
}) => {
  // Theme-aware color helpers
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
      dangerDark: isDark ? '#e53e3e' : '#e53e3e',
      dangerLight: isDark ? '#2d1b1b' : '#fff5f5',
      dangerBorder: isDark ? '#fc8181' : '#fc8181',
      info: isDark ? '#63b3ed' : '#4299e1',
      infoLight: isDark ? '#2c5282' : '#ebf8ff',
      infoBorder: isDark ? '#63b3ed' : '#90caf9',
      warning: isDark ? '#f6e05e' : '#ed8936',
      warningLight: isDark ? '#744210' : '#fef3c7',
      warningBorder: isDark ? '#f6e05e' : '#fcd34d'
    };
  };

  const colors = getThemeColors();

  const [smtpSettings, setSmtpSettings] = useState({
    enabled: false,
    host: '',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'AuthNode 2FA'
  });

  const [testEmailInput, setTestEmailInput] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ login_page_theme: 'light' });
  const [globalSettingsLoading, setGlobalSettingsLoading] = useState(false);
  const [oidcSettings, setOidcSettings] = useState({
    enabled: false,
    provider_name: 'Custom OIDC Provider',
    client_id: '',
    client_secret: '',
    issuer_url: '',
    authorization_endpoint: '',
    token_endpoint: '',
    userinfo_endpoint: '',
    jwks_uri: '',
    logout_endpoint: '',
    redirect_uri: '',
    scope: 'openid email profile',
    admin_groups: ['administrators', 'admins'],
    user_groups: ['users']
  });
  const [oidcLoading, setOidcLoading] = useState(false);

  // Load SMTP settings from backend if admin
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      axios.get('/api/admin/smtp')
        .then(res => {
          if (res.data) {
            setSmtpSettings(prev => ({
              ...prev,
              enabled: res.data.enabled || false,
              host: res.data.host || '',
              port: res.data.port || 587,
              username: res.data.username || '',
              password: res.data.password || '',
              fromEmail: res.data.from_email || '',
              fromName: res.data.from_name || 'AuthNode 2FA'
            }));
          }
        })
        .catch(err => {
          if (err.response?.status === 404) {
            console.log('SMTP endpoint not yet implemented on backend');
          } else {
            console.log('SMTP settings not available yet:', err.message);
          }
        });

      // Load global settings
      axios.get('/api/admin/settings')
        .then(res => {
          if (res.data) {
            setGlobalSettings({
              login_page_theme: res.data.login_page_theme || 'light'
            });
          }
        })
        .catch(err => {
          console.log('Global settings not available yet:', err.message);
        });

      // Load OIDC settings
      axios.get('/api/admin/oidc')
        .then(res => {
          if (res.data) {
            setOidcSettings({
              enabled: res.data.enabled || false,
              provider_name: res.data.provider_name || 'Custom OIDC Provider',
              client_id: res.data.client_id || '',
              client_secret: res.data.client_secret || '',
              issuer_url: res.data.issuer_url || '',
              authorization_endpoint: res.data.authorization_endpoint || '',
              token_endpoint: res.data.token_endpoint || '',
              userinfo_endpoint: res.data.userinfo_endpoint || '',
              jwks_uri: res.data.jwks_uri || '',
              logout_endpoint: res.data.logout_endpoint || '',
              redirect_uri: res.data.redirect_uri || '',
              scope: res.data.scope || 'openid email profile',
              admin_groups: res.data.admin_groups || ['administrators', 'admins'],
              user_groups: res.data.user_groups || ['users']
            });
          }
        })
        .catch(err => {
          console.log('OIDC settings not available yet:', err.message);
        });
    }
  }, [currentUser]);

  const [toast, setToast] = useState(null);

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...appSettings,
      [key]: value
    };
    onSettingsChange(newSettings);
    
    // Save settings to server
    axios.put('/api/auth/settings', newSettings)
      .then(res => {
        showToast('Settings saved');
      })
      .catch(err => {
        console.error('Failed to save settings:', err);
        showToast('Failed to save settings', 'error');
      });
  };

  const handleGlobalSettingChange = (key, value) => {
    const newSettings = {
      ...globalSettings,
      [key]: value
    };
    setGlobalSettings(newSettings);
    setGlobalSettingsLoading(true);
    
    // Save global settings to server
    axios.put('/api/admin/settings', newSettings)
      .then(res => {
        showToast('Login page theme updated');
      })
      .catch(err => {
        console.error('Failed to save global settings:', err);
        showToast('Failed to update login page theme', 'error');
      })
      .finally(() => {
        setGlobalSettingsLoading(false);
      });
  };

  const handleSmtpChange = (key, value) => {
    setSmtpSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSmtp = async () => {
    try {
      setSmtpLoading(true);
      await axios.post('/api/admin/smtp', {
        enabled: smtpSettings.enabled,
        host: smtpSettings.host,
        port: smtpSettings.port,
        username: smtpSettings.username,
        password: smtpSettings.password,
        from_email: smtpSettings.fromEmail,
        from_name: smtpSettings.fromName
      });
      showToast('SMTP settings saved successfully');
    } catch (error) {
      if (error.response?.status === 404) {
        showToast('SMTP endpoint not yet available - backend not implemented');
      } else {
        showToast(error.response?.data?.detail || 'Failed to save SMTP settings');
      }
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailInput) {
      showToast('Please enter an email address');
      return;
    }

    try {
      setSmtpLoading(true);
      await axios.post('/api/admin/smtp/test', {
        test_email: testEmailInput
      });
      showToast('Test email sent successfully');
      setTestEmailInput('');
    } catch (error) {
      if (error.response?.status === 404) {
        showToast('SMTP test endpoint not yet available - backend not implemented');
      } else {
        showToast(error.response?.data?.detail || 'Test email failed');
      }
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleOidcChange = (key, value) => {
    setOidcSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveOidc = async () => {
    try {
      setOidcLoading(true);
      await axios.put('/api/admin/oidc', {
        enabled: oidcSettings.enabled,
        provider_name: oidcSettings.provider_name,
        client_id: oidcSettings.client_id,
        client_secret: oidcSettings.client_secret,
        issuer_url: oidcSettings.issuer_url,
        authorization_endpoint: oidcSettings.authorization_endpoint,
        token_endpoint: oidcSettings.token_endpoint,
        userinfo_endpoint: oidcSettings.userinfo_endpoint,
        jwks_uri: oidcSettings.jwks_uri,
        logout_endpoint: oidcSettings.logout_endpoint,
        redirect_uri: oidcSettings.redirect_uri,
        scope: oidcSettings.scope,
        admin_groups: oidcSettings.admin_groups,
        user_groups: oidcSettings.user_groups
      });
      showToast('OIDC settings saved successfully');
    } catch (error) {
      if (error.response?.status === 404) {
        showToast('OIDC endpoint not yet available - backend not implemented');
      } else {
        showToast(error.response?.data?.detail || 'Failed to save OIDC settings');
      }
    } finally {
      setOidcLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const getLastLoginTime = () => {
    const lastLogin = localStorage.getItem('lastLogin');
    if (lastLogin) {
      const date = new Date(lastLogin);
      return date.toLocaleString();
    }
    return 'Just now';
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-content">
      {/* Global Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: colors.success,
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {toast}
        </div>
      )}

      <div className="content-area" style={{ paddingTop: '12px' }}>
        <div className="content-header" style={{ marginBottom: '12px' }}>
          <h2>Settings</h2>
        </div>

        {/* Settings Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `2px solid ${colors.border}`,
          marginBottom: '24px',
          gap: '0'
        }}>
          <button
            onClick={() => onTabChange('general')}
            style={{
              padding: '12px 20px',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === 'general' ? `3px solid ${colors.accent}` : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'general' ? '600' : '500',
              color: activeTab === 'general' ? colors.accent : colors.primary,
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-sliders-h"></i> General
          </button>
          <button
            onClick={() => onTabChange('security')}
            style={{
              padding: '12px 20px',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === 'security' ? `3px solid ${colors.accent}` : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'security' ? '600' : '500',
              color: activeTab === 'security' ? colors.accent : colors.primary,
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-shield-alt"></i> Security
          </button>
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => onTabChange('smtp')}
              style={{
                padding: '12px 20px',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeTab === 'smtp' ? `3px solid ${colors.accent}` : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'smtp' ? '600' : '500',
                color: activeTab === 'smtp' ? colors.accent : colors.primary,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-envelope"></i> SMTP
            </button>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => onTabChange('oidc')}
              style={{
                padding: '12px 20px',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeTab === 'oidc' ? `3px solid ${colors.accent}` : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'oidc' ? '600' : '500',
                color: activeTab === 'oidc' ? colors.accent : colors.primary,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-key"></i> OIDC SSO
            </button>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => onTabChange('user-management')}
              style={{
                padding: '12px 20px',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeTab === 'user-management' ? `3px solid ${colors.accent}` : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'user-management' ? '600' : '500',
                color: activeTab === 'user-management' ? colors.accent : colors.primary,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-users-cog"></i> User Management
            </button>
          )}
        </div>

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div>
            <div style={{ maxWidth: '600px' }}>
              <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>General Settings</h3>

              {/* Theme Setting */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.primary,
                  fontWeight: '500',
                  marginBottom: '10px'
                }}>
                  <i className="fas fa-palette" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Theme
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['light', 'dark', 'auto'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => handleSettingChange('theme', theme)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: appSettings.theme === theme ? colors.accent : colors.backgroundSecondary,
                        color: appSettings.theme === theme ? 'white' : colors.primary,
                        border: appSettings.theme === theme ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {theme === 'light' && <i className="fas fa-sun" style={{ marginRight: '6px' }}></i>}
                      {theme === 'dark' && <i className="fas fa-moon" style={{ marginRight: '6px' }}></i>}
                      {theme === 'auto' && <i className="fas fa-circle-half-stroke" style={{ marginRight: '6px' }}></i>}
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin: Login Page Theme Setting */}
              {currentUser && currentUser.role === 'admin' && (
                <div style={{
                  padding: '16px',
                  backgroundColor: colors.background,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '16px'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    color: colors.primary,
                    fontWeight: '500',
                    marginBottom: '10px'
                  }}>
                    <i className="fas fa-door-open" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Login Page Theme (Admin)
                  </label>
                  <p style={{ color: colors.secondary, fontSize: '12px', marginBottom: '10px', margin: '0 0 10px 0' }}>
                    Set the default theme for the login/signup page
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['light', 'dark', 'auto'].map(theme => (
                      <button
                        key={theme}
                        onClick={() => handleGlobalSettingChange('login_page_theme', theme)}
                        disabled={globalSettingsLoading}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          backgroundColor: globalSettings.login_page_theme === theme ? colors.accent : colors.backgroundSecondary,
                          color: globalSettings.login_page_theme === theme ? 'white' : colors.primary,
                          border: globalSettings.login_page_theme === theme ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          cursor: globalSettingsLoading ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                          opacity: globalSettingsLoading ? 0.6 : 1
                        }}
                      >
                        {theme === 'light' && <i className="fas fa-sun" style={{ marginRight: '6px' }}></i>}
                        {theme === 'dark' && <i className="fas fa-moon" style={{ marginRight: '6px' }}></i>}
                        {theme === 'auto' && <i className="fas fa-circle-half-stroke" style={{ marginRight: '6px' }}></i>}
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-lock Setting */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.primary,
                  fontWeight: '500',
                  marginBottom: '10px'
                }}>
                  <i className="fas fa-lock" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Auto-lock Duration
                </label>
                <select 
                  value={appSettings.autoLock}
                  onChange={(e) => handleSettingChange('autoLock', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: colors.background,
                    color: colors.primary
                  }}
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={0}>Never</option>
                </select>
                <p style={{ color: colors.secondary, fontSize: '12px', marginTop: '8px', margin: '8px 0 0 0' }}>
                  Lock the app after this period of inactivity
                </p>
              </div>

              {/* Code Format Setting */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.primary,
                  fontWeight: '500',
                  marginBottom: '10px'
                }}>
                  <i className="fas fa-hashtag" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Code Display Format
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'spaced', label: '123 456', desc: 'Spaced' },
                    { value: 'compact', label: '123456', desc: 'Compact' }
                  ].map(format => (
                    <button
                      key={format.value}
                      onClick={() => handleSettingChange('codeFormat', format.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: appSettings.codeFormat === format.value ? colors.accent : colors.backgroundSecondary,
                        color: appSettings.codeFormat === format.value ? 'white' : colors.primary,
                        border: appSettings.codeFormat === format.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>{format.label}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>{format.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <div style={{ maxWidth: '600px' }}>
              <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>Security & Sessions</h3>

              {/* Current Device */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <i className="fas fa-laptop" style={{ fontSize: '20px', color: colors.accent, marginRight: '12px' }}></i>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>Current Device</h4>
                    <p style={{ margin: 0, color: colors.secondary, fontSize: '12px' }}>This browser</p>
                  </div>
                </div>
                <div style={{ backgroundColor: colors.backgroundSecondary, padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: colors.secondary }}>Browser:</span>
                    <span style={{ marginLeft: '8px', color: colors.primary, fontWeight: '500' }}>{getBrowserInfo()}</span>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: colors.secondary }}>Last Active:</span>
                    <span style={{ marginLeft: '8px', color: colors.primary, fontWeight: '500' }}>{getLastLoginTime()}</span>
                  </div>
                  <div>
                    <span style={{ color: colors.secondary }}>Status:</span>
                    <span style={{ marginLeft: '8px', color: colors.success, fontWeight: '500' }}>
                      <i className="fas fa-circle" style={{ fontSize: '8px', marginRight: '4px' }}></i>Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                  <i className="fas fa-history" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Recent Login Activity
                </h4>
                <div style={{ fontSize: '13px' }}>
                  {[
                    { date: 'Today', time: '9:35 PM', browser: 'Chrome', device: 'Windows' },
                    { date: 'Yesterday', time: '3:42 PM', browser: 'Safari', device: 'iPhone' },
                    { date: '2 days ago', time: '10:15 AM', browser: 'Chrome', device: 'Windows' }
                  ].map((activity, idx) => (
                    <div key={idx} style={{
                      padding: '10px',
                      borderBottom: idx < 2 ? `1px solid ${colors.border}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ color: colors.primary, fontWeight: '500' }}>{activity.browser} • {activity.device}</div>
                        <div style={{ color: colors.secondary, fontSize: '12px', marginTop: '2px' }}>{activity.date} at {activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Management */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.dangerLight,
                borderRadius: '8px',
                border: `1px solid ${colors.dangerBorder}`,
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <i className="fas fa-sign-out-alt" style={{ fontSize: '16px', color: colors.danger, marginRight: '8px' }}></i>
                  <h4 style={{ margin: 0, color: colors.dangerDark, fontSize: '14px', fontWeight: '600' }}>
                    Session Management
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', color: colors.dangerDark, fontSize: '13px' }}>
                  Sign out from all other devices and sessions
                </p>
                <button
                  onClick={() => {
                    showToast('All other sessions have been signed out');
                  }}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = colors.dangerDark}
                  onMouseOut={(e) => e.target.style.backgroundColor = colors.danger}
                >
                  <i className="fas fa-lock" style={{ marginRight: '6px' }}></i>
                  Logout All Sessions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Configuration Tab */}
        {activeTab === 'smtp' && currentUser && currentUser.role === 'admin' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {/* SMTP Settings Card */}
            <div style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ marginBottom: '16px', color: colors.primary }}>
                <i className="fas fa-envelope" style={{ marginRight: '8px', color: colors.accent }}></i>
                SMTP Configuration
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}>
                  <input
                    type="checkbox"
                    checked={smtpSettings.enabled}
                    onChange={(e) => handleSmtpChange('enabled', e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ color: colors.primary, fontWeight: '500' }}>Enable SMTP</span>
                </label>
              </div>

              {smtpSettings.enabled && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={smtpSettings.host}
                      onChange={(e) => handleSmtpChange('host', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Port
                      </label>
                      <input
                        type="number"
                        placeholder="587"
                        value={smtpSettings.port}
                        onChange={(e) => handleSmtpChange('port', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Username
                      </label>
                      <input
                        type="text"
                        placeholder="your-email@gmail.com"
                        value={smtpSettings.username}
                        onChange={(e) => handleSmtpChange('username', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Password / App Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={smtpSettings.password}
                      onChange={(e) => handleSmtpChange('password', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        From Email
                      </label>
                      <input
                        type="email"
                        placeholder="noreply@example.com"
                        value={smtpSettings.fromEmail}
                        onChange={(e) => handleSmtpChange('fromEmail', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        From Name
                      </label>
                      <input
                        type="text"
                        placeholder="AuthNode 2FA"
                        value={smtpSettings.fromName}
                        onChange={(e) => handleSmtpChange('fromName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={handleSaveSmtp}
                      disabled={smtpLoading}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: smtpLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: smtpLoading ? 0.6 : 1
                      }}
                      onMouseOver={(e) => !smtpLoading && (e.target.style.backgroundColor = '#3651d4')}
                      onMouseOut={(e) => !smtpLoading && (e.target.style.backgroundColor = colors.accent)}
                    >
                      <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
                      Save Settings
                    </button>
                  </div>
                </>
              )}

              {smtpSettings.enabled && (
                <div style={{
                  backgroundColor: colors.infoLight,
                  border: `1px solid ${colors.infoBorder}`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  color: colors.info
                }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                    <strong>Note:</strong> SMTP is now enabled. Users can opt-in to receive email notifications for authentication events.
                  </p>
                </div>
              )}

              {!smtpSettings.enabled && (
                <div style={{
                  backgroundColor: colors.warningLight,
                  border: `1px solid ${colors.warningBorder}`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  color: colors.warning
                }}>
                  <p style={{ margin: 0 }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                    <strong>Disabled:</strong> Email notifications are currently unavailable.
                  </p>
                </div>
              )}
            </div>

            {/* Test Email Section */}
            {smtpSettings.enabled && (
              <div style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ marginBottom: '16px', color: colors.primary }}>
                  <i className="fas fa-flask" style={{ marginRight: '8px', color: colors.success }}></i>
                  Test Email
                </h3>

                <p style={{ color: colors.secondary, fontSize: '13px', marginBottom: '16px' }}>
                  Send a test email to verify your SMTP configuration is working correctly.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: colors.primary,
                    fontWeight: '500',
                    fontSize: '14px'
                  }}>
                    Recipient Email
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input
                      type="email"
                      placeholder="your-email@example.com"
                      value={testEmailInput}
                      onChange={(e) => setTestEmailInput(e.target.value)}
                      disabled={smtpLoading}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        opacity: smtpLoading ? 0.6 : 1,
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                    <button
                      onClick={handleTestSmtp}
                      disabled={smtpLoading}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: colors.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: smtpLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: smtpLoading ? 0.6 : 1
                      }}
                      onMouseOver={(e) => !smtpLoading && (e.target.style.backgroundColor = '#48a868')}
                      onMouseOut={(e) => !smtpLoading && (e.target.style.backgroundColor = colors.success)}
                    >
                      {smtpLoading ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OIDC SSO Configuration Tab */}
        {activeTab === 'oidc' && currentUser && currentUser.role === 'admin' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {/* OIDC Settings Card */}
            <div style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ marginBottom: '16px', color: colors.primary }}>
                <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                OIDC SSO Configuration
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}>
                  <input
                    type="checkbox"
                    checked={oidcSettings.enabled}
                    onChange={(e) => handleOidcChange('enabled', e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ color: colors.primary, fontWeight: '500' }}>Enable OIDC SSO</span>
                </label>
              </div>

              {oidcSettings.enabled && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Provider Name
                    </label>
                    <input
                      type="text"
                      placeholder="Custom OIDC Provider"
                      value={oidcSettings.provider_name}
                      onChange={(e) => handleOidcChange('provider_name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="your-client-id"
                        value={oidcSettings.client_id}
                        onChange={(e) => handleOidcChange('client_id', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Client Secret
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={oidcSettings.client_secret}
                        onChange={(e) => handleOidcChange('client_secret', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Issuer URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-oidc-provider.com"
                      value={oidcSettings.issuer_url}
                      onChange={(e) => handleOidcChange('issuer_url', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Authorization Endpoint
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-oidc-provider.com/oauth2/authorize"
                      value={oidcSettings.authorization_endpoint}
                      onChange={(e) => handleOidcChange('authorization_endpoint', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Token Endpoint
                      </label>
                      <input
                        type="url"
                        placeholder="https://your-oidc-provider.com/oauth2/token"
                        value={oidcSettings.token_endpoint}
                        onChange={(e) => handleOidcChange('token_endpoint', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        UserInfo Endpoint
                      </label>
                      <input
                        type="url"
                        placeholder="https://your-oidc-provider.com/oauth2/userinfo"
                        value={oidcSettings.userinfo_endpoint}
                        onChange={(e) => handleOidcChange('userinfo_endpoint', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      JWKS URI
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-oidc-provider.com/oauth2/jwks"
                      value={oidcSettings.jwks_uri}
                      onChange={(e) => handleOidcChange('jwks_uri', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Logout Endpoint
                      </label>
                      <input
                        type="url"
                        placeholder="https://your-oidc-provider.com/oauth2/logout"
                        value={oidcSettings.logout_endpoint}
                        onChange={(e) => handleOidcChange('logout_endpoint', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Redirect URI
                      </label>
                      <input
                        type="url"
                        placeholder="http://localhost:8040/api/auth/oidc/callback"
                        value={oidcSettings.redirect_uri}
                        onChange={(e) => handleOidcChange('redirect_uri', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Scope
                    </label>
                    <input
                      type="text"
                      placeholder="openid email profile"
                      value={oidcSettings.scope}
                      onChange={(e) => handleOidcChange('scope', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.background,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Admin Groups (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="administrators,admins"
                        value={oidcSettings.admin_groups.join(',')}
                        onChange={(e) => handleOidcChange('admin_groups', e.target.value.split(',').map(s => s.trim()))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        User Groups (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="users"
                        value={oidcSettings.user_groups.join(',')}
                        onChange={(e) => handleOidcChange('user_groups', e.target.value.split(',').map(s => s.trim()))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.background,
                          color: colors.primary
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={handleSaveOidc}
                      disabled={oidcLoading}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: oidcLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: oidcLoading ? 0.6 : 1
                      }}
                      onMouseOver={(e) => !oidcLoading && (e.target.style.backgroundColor = '#3651d4')}
                      onMouseOut={(e) => !oidcLoading && (e.target.style.backgroundColor = colors.accent)}
                    >
                      <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
                      Save Settings
                    </button>
                  </div>
                </>
              )}

              {oidcSettings.enabled && (
                <div style={{
                  backgroundColor: colors.infoLight,
                  border: `1px solid ${colors.infoBorder}`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  color: colors.info
                }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                    <strong>Note:</strong> OIDC SSO is now enabled. Users can login using the SSO button on the login page.
                  </p>
                  <p style={{ margin: 0 }}>
                    SSO users will be created automatically and cannot login with passwords.
                  </p>
                </div>
              )}

              {!oidcSettings.enabled && (
                <div style={{
                  backgroundColor: colors.warningLight,
                  border: `1px solid ${colors.warningBorder}`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  color: colors.warning
                }}>
                  <p style={{ margin: 0 }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                    <strong>Disabled:</strong> OIDC SSO is currently disabled.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'user-management' && currentUser && currentUser.role === 'admin' && (
          <UserManagement 
            currentUser={currentUser}
            onClose={() => {}}
            isEmbedded={true}
            appSettings={appSettings}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsView;
