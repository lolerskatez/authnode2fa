import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserManagement from '../UserManagement';
import '../App.css';

// Get dynamic redirect URIs based on current domain - MUST be outside component
function getRedirectURIs() {
  const origin = window.location.origin;
  return {
    redirect_uri: `${origin}/api/auth/oidc/callback`,
    post_logout_redirect_uri: `${origin}/auth`
  };
}

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
  const [globalSettings, setGlobalSettings] = useState({ login_page_theme: 'light', signup_enabled: true, totp_enabled: false, totp_enforcement: 'optional', totp_grace_period_days: 7 });
  const [globalSettingsLoading, setGlobalSettingsLoading] = useState(false);
  
  // Session Management States
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // 2FA States
  const [twoFAStatus, setTwoFAStatus] = useState({ totp_enabled: false, is_admin: false });
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState(null);
  const [twoFAVerifyCode, setTwoFAVerifyCode] = useState('');
  const [twoFASetupStep, setTwoFASetupStep] = useState('qr');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableTwoFAPassword, setDisableTwoFAPassword] = useState('');
  const [disableTwoFACode, setDisableTwoFACode] = useState('');
  const [showDisableTwoFA, setShowDisableTwoFA] = useState(false);
  const [twoFAEnforcementSaving, setTwoFAEnforcementSaving] = useState(false);
  
  const [oidcSettings, setOidcSettings] = useState(() => ({
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
    ...getRedirectURIs(),
    scope: 'openid email profile',
    admin_groups: ['administrators', 'admins'],
    user_groups: ['users']
  }));
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcAdvanced, setOidcAdvanced] = useState(false);

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsFilter, setAuditLogsFilter] = useState({
    user_id: '',
    action: '',
    status: '',
    limit: 100,
    offset: 0
  });
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);
  const [discoveringEndpoints, setDiscoveringEndpoints] = useState(false);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setSessionsLoading(true);
        const response = await axios.get('/api/users/sessions');
        setSessions(response.data || []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, []);

  // Load audit logs when audit-logs tab is active
  useEffect(() => {
    if (activeTab === 'audit-logs' && currentUser?.role === 'admin') {
      fetchAuditLogs();
    }
  }, [activeTab, currentUser?.role, fetchAuditLogs]);

  // Load 2FA status
  useEffect(() => {
    axios.get('/api/auth/2fa/status')
      .then(res => {
        setTwoFAStatus(res.data);
      })
      .catch(err => {
        console.log('2FA status not available:', err.message);
      });
  }, []);

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
              login_page_theme: res.data.login_page_theme || 'light',
              signup_enabled: res.data.signup_enabled !== false,
              totp_enabled: res.data.totp_enabled || false,
              totp_enforcement: res.data.totp_enforcement || 'optional',
              totp_grace_period_days: res.data.totp_grace_period_days || 7
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
            const dynamicURIs = getRedirectURIs();
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
              redirect_uri: dynamicURIs.redirect_uri,
              post_logout_redirect_uri: dynamicURIs.post_logout_redirect_uri,
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

  const handleDiscoverEndpoints = async () => {
    if (!oidcSettings.issuer_url) {
      showToast('Please enter an Issuer URL first');
      return;
    }

    try {
      setDiscoveringEndpoints(true);
      // Use backend discovery endpoint to avoid CORS issues
      const response = await fetch(`/api/auth/oidc/discover?issuer_url=${encodeURIComponent(oidcSettings.issuer_url)}`);
      if (!response.ok) throw new Error('Discovery request failed');
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Discovery failed');
      }
      
      setOidcSettings(prev => ({
        ...prev,
        authorization_endpoint: result.authorization_endpoint || prev.authorization_endpoint,
        token_endpoint: result.token_endpoint || prev.token_endpoint,
        userinfo_endpoint: result.userinfo_endpoint || prev.userinfo_endpoint,
        jwks_uri: result.jwks_uri || prev.jwks_uri,
        logout_endpoint: result.end_session_endpoint || prev.logout_endpoint
      }));
      
      showToast('Endpoints discovered successfully!');
    } catch (error) {
      console.error('OIDC discovery error:', error);
      showToast('Could not discover endpoints. Please enter them manually.');
      setOidcAdvanced(true);
    } finally {
      setDiscoveringEndpoints(false);
    }
  };

  const updateRedirectURIs = () => {
    const dynamicURIs = getRedirectURIs();
    setOidcSettings(prev => ({
      ...prev,
      ...dynamicURIs
    }));
    showToast('Redirect URIs updated to current domain');
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
        post_logout_redirect_uri: oidcSettings.post_logout_redirect_uri,
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

  const getBrowserFromUserAgent = (userAgent) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const getDeviceFromUserAgent = (userAgent) => {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    return 'Unknown Device';
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await axios.delete(`/api/users/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      showToast('Session revoked successfully');
    } catch (error) {
      console.error('Failed to revoke session:', error);
      showToast('Failed to revoke session');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (window.confirm('Are you sure? This will sign you out from all other devices.')) {
      try {
        await axios.post('/api/users/sessions/revoke-all');
        setSessions(sessions.filter(s => s.is_current_session));
        showToast('All other sessions have been signed out');
      } catch (error) {
        console.error('Failed to revoke all sessions:', error);
        showToast('Failed to revoke sessions');
      }
    }
  };

  // Audit Logs Functions
  const fetchAuditLogs = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;

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
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditLogsFilter, currentUser?.role]);

  const handleAuditLogsFilterChange = (field, value) => {
    setAuditLogsFilter(prev => ({
      ...prev,
      [field]: value,
      offset: field !== 'offset' ? 0 : value // Reset offset when changing filters
    }));
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
      'all_sessions_revoked': 'fas fa-ban'
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
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  // 2FA Handlers
  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const res = await axios.post('/api/auth/2fa/setup');
      setTwoFASetupData(res.data);
      setTwoFABackupCodes(res.data.backup_codes);
      setShowTwoFASetup(true);
      setTwoFASetupStep('qr');
    } catch (err) {
      showToast('Error setting up 2FA: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleComplete2FAEnrollment = async () => {
    if (!twoFAVerifyCode || twoFAVerifyCode.length !== 6) {
      showToast('Please enter a valid 6-digit code');
      return;
    }
    setTwoFALoading(true);
    try {
      await axios.post('/api/auth/2fa/enable', {
        secret: twoFASetupData.secret,
        totp_code: twoFAVerifyCode,
        backup_codes: twoFABackupCodes
      });
      setTwoFAStatus({ ...twoFAStatus, totp_enabled: true });
      setShowBackupCodes(true);
      setTwoFAVerifyCode('');
      showToast('2FA enabled successfully!');
    } catch (err) {
      showToast('Error enabling 2FA: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableTwoFAPassword) {
      showToast('Please enter your password');
      return;
    }
    setTwoFALoading(true);
    try {
      await axios.post('/api/auth/2fa/disable', {
        password: disableTwoFAPassword,
        totp_code: disableTwoFACode
      });
      setTwoFAStatus({ ...twoFAStatus, totp_enabled: false });
      setDisableTwoFAPassword('');
      setDisableTwoFACode('');
      setShowDisableTwoFA(false);
      showToast('2FA disabled successfully');
    } catch (err) {
      showToast('Error disabling 2FA: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FASystem = async () => {
    setTwoFAEnforcementSaving(true);
    try {
      const newEnabled = !globalSettings.totp_enabled;
      await axios.put('/api/admin/settings', {
        totp_enabled: newEnabled,
        totp_enforcement: newEnabled ? 'optional' : globalSettings.totp_enforcement
      });
      setGlobalSettings({ 
        ...globalSettings, 
        totp_enabled: newEnabled,
        totp_enforcement: newEnabled ? 'optional' : globalSettings.totp_enforcement
      });
      showToast('Settings saved');
      if (newEnabled) {
        setTimeout(() => {
          showToast('2FA system enabled with optional enforcement policy');
        }, 1000);
      } else {
        setTimeout(() => {
          showToast('2FA system disabled');
        }, 1000);
      }
    } catch (err) {
      showToast('Error updating 2FA system: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFAEnforcementSaving(false);
    }
  };

  const handleTOTPEnforcementChange = async (value) => {
    setTwoFAEnforcementSaving(true);
    try {
      await axios.put('/api/admin/settings', {
        totp_enforcement: value
      });
      setGlobalSettings({ ...globalSettings, totp_enforcement: value });
      showToast('2FA enforcement policy updated');
    } catch (err) {
      showToast('Error updating 2FA policy: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFAEnforcementSaving(false);
    }
  };

  const handleGracePeriodChange = async (days) => {
    setTwoFAEnforcementSaving(true);
    try {
      await axios.put('/api/admin/settings', {
        totp_grace_period_days: days
      });
      setGlobalSettings({ ...globalSettings, totp_grace_period_days: days });
      showToast('Grace period updated');
    } catch (err) {
      showToast('Error updating grace period: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFAEnforcementSaving(false);
    }
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

              {/* Admin: Signup Toggle */}
              {currentUser && currentUser.role === 'admin' && (
                <div style={{
                  padding: '16px',
                  backgroundColor: colors.background,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '16px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={globalSettings.signup_enabled}
                      onChange={(e) => handleGlobalSettingChange('signup_enabled', e.target.checked)}
                      disabled={globalSettingsLoading}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: globalSettingsLoading ? 'not-allowed' : 'pointer'
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: colors.primary,
                      fontWeight: '500'
                    }}>
                      <i className="fas fa-user-plus" style={{ marginRight: '8px', color: colors.accent }}></i>
                      Allow User Signup
                    </span>
                  </label>
                  <p style={{ color: colors.secondary, fontSize: '12px', marginBottom: '0', margin: '8px 0 0 26px' }}>
                    When disabled, users can only login with existing accounts or SSO
                  </p>
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
              {/* Two-Factor Authentication (2FA) System Settings (Admin Only) */}
              {currentUser && currentUser.role === 'admin' && (
                <>
                  <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
                    <i className="fas fa-shield-alt" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Two-Factor Authentication (2FA) System
                  </h3>

                  {/* Enable/Disable 2FA System */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: colors.background,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                          <i className="fas fa-power-off" style={{ marginRight: '8px', color: colors.accent }}></i>
                          2FA System Status
                        </h4>
                        <p style={{ margin: 0, color: colors.secondary, fontSize: '12px' }}>
                          {globalSettings.totp_enabled ? 'System is enabled' : 'System is disabled'}
                        </p>
                      </div>
                      <button
                        onClick={handleEnable2FASystem}
                        disabled={twoFAEnforcementSaving}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: globalSettings.totp_enabled ? colors.danger : colors.success,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: twoFAEnforcementSaving ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          opacity: twoFAEnforcementSaving ? 0.6 : 1,
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className={`fas fa-${globalSettings.totp_enabled ? 'toggle-off' : 'toggle-on'}`} style={{ marginRight: '6px' }}></i>
                        {twoFAEnforcementSaving ? 'Updating...' : (globalSettings.totp_enabled ? 'Disable 2FA' : 'Enable 2FA')}
                      </button>
                    </div>
                    {!globalSettings.totp_enabled && (
                      <div style={{
                        padding: '10px 12px',
                        backgroundColor: colors.warningLight,
                        borderRadius: '6px',
                        border: `1px solid ${colors.warningBorder}`,
                        fontSize: '12px',
                        color: colors.secondary
                      }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '6px', color: colors.warning }}></i>
                        Enable the 2FA system to configure enforcement policies. Personal enrollment is available from your profile menu.
                      </div>
                    )}
                  </div>

                  {/* Enforcement Policy - Only visible when 2FA is enabled */}
                  {globalSettings.totp_enabled && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: colors.background,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      marginBottom: '16px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                        <i className="fas fa-cog" style={{ marginRight: '8px', color: colors.accent }}></i>
                        Enforcement Policy
                      </h4>
                      <p style={{ margin: '0 0 12px 0', color: colors.secondary, fontSize: '13px' }}>
                        Control how strictly 2FA is enforced across your application:
                      </p>

                      {[
                        {
                          value: 'optional',
                          label: 'Optional',
                          description: 'Users can choose to enable 2FA for their account.',
                          icon: 'check-circle'
                        },
                        {
                          value: 'admin_only',
                          label: 'Required for Admins',
                          description: 'All admins must enroll in 2FA. Regular users remain optional.',
                          icon: 'user-shield'
                        },
                        {
                          value: 'required_all',
                          label: 'Required for All Users',
                          description: 'All users and admins must enroll in 2FA.',
                          icon: 'lock'
                        }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleTOTPEnforcementChange(option.value)}
                          disabled={twoFAEnforcementSaving}
                          style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: globalSettings.totp_enforcement === option.value ? colors.accentLight : colors.backgroundSecondary,
                            border: `2px solid ${globalSettings.totp_enforcement === option.value ? colors.accent : colors.border}`,
                            borderRadius: '6px',
                            cursor: twoFAEnforcementSaving ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            opacity: twoFAEnforcementSaving ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: globalSettings.totp_enforcement === option.value ? colors.accent : colors.border,
                              color: globalSettings.totp_enforcement === option.value ? 'white' : colors.secondary,
                              flexShrink: 0,
                              fontSize: '12px'
                            }}>
                              <i className={`fas fa-${option.icon}`}></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                color: colors.primary,
                                fontWeight: '600',
                                fontSize: '13px',
                                marginBottom: '2px'
                              }}>
                                {option.label}
                                {globalSettings.totp_enforcement === option.value && (
                                  <span style={{ marginLeft: '6px', color: colors.accent, fontSize: '11px' }}>✓</span>
                                )}
                              </div>
                              <div style={{
                                color: colors.secondary,
                                fontSize: '12px'
                              }}>
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grace Period - Only visible when enforcement is not optional */}
                  {globalSettings.totp_enabled && globalSettings.totp_enforcement !== 'optional' && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: colors.background,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      marginBottom: '24px'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '8px', color: colors.accent }}></i>
                        Grace Period Before Forced Enrollment
                      </h4>
                      <p style={{ margin: '0 0 12px 0', color: colors.secondary, fontSize: '12px' }}>
                        Number of days users can continue logging in before being forced to enroll in 2FA.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={globalSettings.totp_grace_period_days}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val >= 0 && val <= 365) {
                              setGlobalSettings({ ...globalSettings, totp_grace_period_days: val });
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 7;
                            handleGracePeriodChange(val);
                          }}
                          style={{
                            width: '100px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            border: `2px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.backgroundSecondary,
                            color: colors.primary,
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ color: colors.secondary, fontSize: '13px' }}>
                          days
                        </span>
                      </div>
                      {globalSettings.totp_grace_period_days === 0 && (
                        <div style={{
                          marginTop: '10px',
                          padding: '8px 10px',
                          backgroundColor: colors.warningLight,
                          borderRadius: '6px',
                          border: `1px solid ${colors.warningBorder}`,
                          fontSize: '11px',
                          color: colors.secondary
                        }}>
                          <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px', color: colors.warning }}></i>
                          Users will be required to enroll immediately on their next login.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Note for non-admin users */}
              {currentUser && currentUser.role !== 'admin' && (
                <>
                  <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
                    <i className="fas fa-shield-alt" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Security
                  </h3>
                  <div style={{
                    padding: '16px',
                    backgroundColor: colors.backgroundSecondary,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: '24px'
                  }}>
                    <p style={{ margin: 0, color: colors.secondary, fontSize: '13px' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px', color: colors.accent }}></i>
                      To manage your personal 2FA settings, use the <strong>Security</strong> option in your profile menu (top right).
                    </p>
                  </div>
                </>
              )}

              {/* Sessions Section */}
              <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
                <i className="fas fa-laptop" style={{ marginRight: '8px', color: colors.accent }}></i>
                Sessions
              </h3>

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
                  Active Sessions
                </h4>
                {sessionsLoading ? (
                  <div style={{ color: colors.secondary, fontSize: '13px' }}>Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div style={{ color: colors.secondary, fontSize: '13px' }}>No active sessions found</div>
                ) : (
                  <div style={{ fontSize: '13px' }}>
                    {sessions.map((session, idx) => {
                      const sessionDate = new Date(session.created_at);
                      const now = new Date();
                      const diff = Math.floor((now - sessionDate) / 1000);
                      
                      let timeAgo;
                      if (diff < 60) timeAgo = 'Just now';
                      else if (diff < 3600) timeAgo = `${Math.floor(diff / 60)}m ago`;
                      else if (diff < 86400) timeAgo = `${Math.floor(diff / 3600)}h ago`;
                      else timeAgo = `${Math.floor(diff / 86400)}d ago`;

                      return (
                        <div key={session.id} style={{
                          padding: '12px',
                          borderBottom: idx < sessions.length - 1 ? `1px solid ${colors.border}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: colors.primary, fontWeight: '500', marginBottom: '4px' }}>
                              {getBrowserFromUserAgent(session.user_agent)} • {getDeviceFromUserAgent(session.user_agent)}
                              {session.is_current_session && (
                                <span style={{ marginLeft: '8px', color: colors.accent, fontSize: '11px', fontWeight: '600' }}>
                                  (Current)
                                </span>
                              )}
                            </div>
                            <div style={{ color: colors.secondary, fontSize: '12px', marginTop: '2px' }}>
                              {session.ip_address && `IP: ${session.ip_address}`}
                              {session.ip_address && ' • '}{timeAgo}
                            </div>
                          </div>
                          {!session.is_current_session && (
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              style={{
                                marginLeft: '8px',
                                padding: '6px 12px',
                                backgroundColor: colors.danger,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    Sign Out All Other Sessions
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', color: colors.dangerDark, fontSize: '13px' }}>
                  Immediately sign out from all other devices and sessions
                </p>
                <button
                  onClick={handleRevokeAllOtherSessions}
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
                  {/* Basic Configuration */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px' }}>Basic Configuration</h4>
                    
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
                        name="oidc-provider-name"
                        autoComplete="off"
                        placeholder="e.g. Keycloak, Auth0, Azure AD"
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

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Issuer URL
                        <span style={{ color: colors.secondary, fontWeight: '400', fontSize: '12px' }}> (Discovery URL)</span>
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          name="oidc-issuer-url"
                          autoComplete="off"
                          placeholder="https://your-provider.com/realms/master"
                          value={oidcSettings.issuer_url}
                          onChange={(e) => handleOidcChange('issuer_url', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            backgroundColor: colors.background,
                            color: colors.primary
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleDiscoverEndpoints}
                          disabled={discoveringEndpoints || !oidcSettings.issuer_url}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (discoveringEndpoints || !oidcSettings.issuer_url) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: (discoveringEndpoints || !oidcSettings.issuer_url) ? 0.6 : 1
                          }}
                        >
                          {discoveringEndpoints ? 'Discovering...' : 'Auto-Discover'}
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', color: colors.secondary, marginTop: '4px' }}>
                        Auto-discovery will attempt to configure endpoints from the OIDC well-known configuration.
                      </div>
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
                          name="oidc-client-id"
                          autoComplete="off"
                          spellCheck="false"
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
                          name="oidc-client-secret"
                          autoComplete="new-password"
                          spellCheck="false"
                          placeholder="••••••••••••••••••••"
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
                        Redirect URI
                        <span style={{ color: colors.secondary, fontWeight: '400', fontSize: '12px' }}> (Configure this in your OIDC provider)</span>
                      </label>
                      <div style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.secondary + '10',
                        color: colors.primary,
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{oidcSettings.redirect_uri}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(oidcSettings.redirect_uri)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.accent,
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = colors.accent + '20'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          title="Copy to clipboard"
                        >
                          <i className="fas fa-copy"></i> Copy
                        </button>
                      </div>
                    </div>

                    {/* Post-Logout Redirect URI */}
                    <div style={{ marginBottom: '16px' }}>  
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Post-Logout Redirect URI
                        <span style={{ color: colors.secondary, fontWeight: '400', fontSize: '12px' }}> (Configure this in your OIDC provider)</span>
                      </label>
                      <div style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.secondary + '10',
                        color: colors.primary,
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{oidcSettings.post_logout_redirect_uri}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(oidcSettings.post_logout_redirect_uri)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.accent,
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = colors.accent + '20'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          title="Copy to clipboard"
                        >
                          <i className="fas fa-copy"></i> Copy
                        </button>
                      </div>
                    </div>

                    {/* Update Redirect URIs Button */}
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={updateRedirectURIs}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          margin: '0 auto'
                        }}
                        title="Update redirect URIs to match current domain"
                      >
                        <i className="fas fa-sync-alt"></i>
                        Update URIs to Current Domain
                      </button>
                      <div style={{ 
                        fontSize: '11px', 
                        color: colors.secondary, 
                        marginTop: '4px',
                        textAlign: 'center'
                      }}>
                        Current domain: {window.location.origin}
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setOidcAdvanced(!oidcAdvanced)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        color: colors.accent,
                        border: `1px solid ${colors.accent}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className={`fas fa-chevron-${oidcAdvanced ? 'up' : 'down'}`}></i>
                      Advanced Settings
                    </button>
                  </div>

                  {/* Advanced Configuration */}
                  {oidcAdvanced && (
                    <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: colors.backgroundSecondary, borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px' }}>Advanced Configuration</h4>
                      
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
                          name="oidc-auth-endpoint"
                          autoComplete="off"
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
                            name="oidc-token-endpoint"
                            autoComplete="off"
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
                            name="oidc-userinfo-endpoint"
                            autoComplete="off"
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
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
                            name="oidc-jwks-uri"
                            autoComplete="off"
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
                            name="oidc-logout-endpoint"
                            autoComplete="off"
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
                          name="oidc-scope"
                          autoComplete="off"
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
                            name="oidc-admin-groups"
                            autoComplete="off"
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
                            name="oidc-user-groups"
                            autoComplete="off"
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
                    </div>
                  )}

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

        {/* Audit Logs Tab */}
        {activeTab === 'audit-logs' && currentUser && currentUser.role === 'admin' && (
          <div>
            <div style={{ maxWidth: '1200px' }}>
              <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
                <i className="fas fa-history" style={{ marginRight: '8px', color: colors.accent }}></i>
                Audit Logs
              </h3>

              {/* Filters */}
              <div style={{
                padding: '16px',
                backgroundColor: colors.background,
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
                          <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: '12px', color: colors.secondary, fontSize: '12px', fontFamily: 'monospace' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', color: colors.primary, fontSize: '12px' }}>
                              {log.user_id ? `User ${log.user_id}` : 'System'}
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
            </div>
          </div>
        )}

        {/* 2FA Disable Modal */}
        {showDisableTwoFA && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: colors.background,
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{
                margin: '0 0 8px 0',
                color: colors.primary,
                fontSize: '24px',
                fontWeight: '600'
              }}>
                Disable 2FA
              </h2>
              <p style={{
                margin: '0 0 24px 0',
                color: colors.secondary,
                fontSize: '14px'
              }}>
                To disable 2FA, please confirm your password and provide your current TOTP code:
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: colors.primary,
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={disableTwoFAPassword}
                  onChange={(e) => setDisableTwoFAPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '6px',
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.primary,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: colors.primary,
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  6-Digit Code from Authenticator
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={disableTwoFACode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setDisableTwoFACode(val);
                  }}
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '20px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '6px',
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.primary,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                onClick={handleDisable2FA}
                disabled={twoFALoading || !disableTwoFAPassword || disableTwoFACode.length !== 6}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: colors.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: twoFALoading || !disableTwoFAPassword || disableTwoFACode.length !== 6 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  opacity: twoFALoading || !disableTwoFAPassword || disableTwoFACode.length !== 6 ? 0.6 : 1
                }}
              >
                {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
              </button>

              <button
                onClick={() => {
                  setShowDisableTwoFA(false);
                  setDisableTwoFAPassword('');
                  setDisableTwoFACode('');
                }}
                disabled={twoFALoading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: colors.accent,
                  border: `2px solid ${colors.accent}`,
                  borderRadius: '6px',
                  cursor: twoFALoading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: twoFALoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && twoFABackupCodes && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: colors.background,
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{
                margin: '0 0 8px 0',
                color: colors.primary,
                fontSize: '24px',
                fontWeight: '600'
              }}>
                Backup Codes
              </h2>
              <p style={{
                margin: '0 0 24px 0',
                color: colors.secondary,
                fontSize: '14px'
              }}>
                Save these codes in a safe place. Use them if you lose access to your authenticator app.
              </p>

              <div style={{
                backgroundColor: colors.backgroundSecondary,
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  {twoFABackupCodes.map((code, idx) => (
                    <code key={idx} style={{
                      backgroundColor: colors.border,
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: colors.primary,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}>
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(twoFABackupCodes.join('\n'));
                  showToast('Backup codes copied to clipboard');
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                <i className="fas fa-copy" style={{ marginRight: '6px' }}></i>
                Copy All Codes
              </button>

              <button
                onClick={() => setShowBackupCodes(false)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: colors.accent,
                  border: `2px solid ${colors.accent}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
