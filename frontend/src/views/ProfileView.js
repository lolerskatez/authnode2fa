import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import WebAuthnHelper from '../utils/WebAuthnHelper';

const ProfileView = ({ currentUser, onUserUpdate, appSettings, onSettingsChange, onSecurityClick, twoFAEnabled, activeTab = 'general' }) => {
  // Theme-aware color helpers
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      accentLight: isDark ? '#2c5282' : '#e6f0ff',
      border: isDark ? '#4a5568' : '#e0e6ed',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundSecondary: isDark ? '#1a202c' : '#f7fafc',
      success: '#68d391',
      danger: isDark ? '#fc8181' : '#f56565'
    };
  };

  const colors = getThemeColors();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_security_alerts: true,
    email_2fa_alerts: true,
    email_account_alerts: true,
    in_app_security_alerts: true,
    in_app_2fa_alerts: true,
    in_app_account_alerts: true
  });
  const [loadingNotificationPrefs, setLoadingNotificationPrefs] = useState(false);
  
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
  const [globalSettings, setGlobalSettings] = useState({ totp_enforcement: 'optional' });

  // WebAuthn states
  const [webauthnStatus, setWebauthnStatus] = useState(null);
  const [loadingWebauthn, setLoadingWebauthn] = useState(false);
  const [showWebauthnSetup, setShowWebauthnSetup] = useState(false);
  const [webauthnDeviceName, setWebauthnDeviceName] = useState('');
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [platformAuthenticatorAvailable, setPlatformAuthenticatorAvailable] = useState(false);
  const [error, setError] = useState('');

  // General loading and toast states
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [userSessions, setUserSessions] = useState([]);

  // Recovery codes states
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [loadingBackupCodes, setLoadingBackupCodes] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState(null);

  const fetchUserPreferences = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      await axios.get(`/api/users/${currentUser.id}/preferences`);
      // User preferences loaded successfully (currently only used for future expansion)
    } catch (error) {
      // Gracefully handle endpoint not found or other errors
      if (error.response?.status === 404) {
        console.log('User preferences endpoint not yet implemented on backend');
      } else if (error.message === 'Network Error' || !error.response) {
        console.log('User preferences not available yet');
      } else {
        console.error('Failed to load user preferences:', error.message);
      }
    }
  }, [currentUser?.id]);

  const fetchNotificationPreferences = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingNotificationPrefs(true);
      const response = await axios.get('/api/notifications/preferences');
      if (response.data) {
        setNotificationPreferences({
          email_security_alerts: response.data.email_security_alerts !== false,
          email_2fa_alerts: response.data.email_2fa_alerts !== false,
          email_account_alerts: response.data.email_account_alerts !== false,
          in_app_security_alerts: response.data.in_app_security_alerts !== false,
          in_app_2fa_alerts: response.data.in_app_2fa_alerts !== false,
          in_app_account_alerts: response.data.in_app_account_alerts !== false
        });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setLoadingNotificationPrefs(false);
    }
  }, [currentUser?.id]);

  // Load 2FA and global settings when component mounts or when security/preferences tab is active
  useEffect(() => {
    if (activeTab === 'security') {
      // Load 2FA status
      axios.get('/api/auth/2fa/status')
        .then(res => {
          setTwoFAStatus(res.data);
        })
        .catch(err => {
          console.error('Error loading 2FA status:', err);
        });

      // Load global settings to show enforcement policy
      axios.get('/api/admin/settings')
        .then(res => {
          if (res.data) {
            setGlobalSettings({
              totp_enforcement: res.data.totp_enforcement || 'optional'
            });
          }
        })
        .catch(err => {
          console.log('Global settings not available:', err.message);
        });
    } else if (activeTab === 'preferences') {
      fetchUserPreferences();
      fetchNotificationPreferences();
    }
  }, [activeTab, fetchUserPreferences, fetchNotificationPreferences]);

  const handleSetup2FA = async () => {
    setShowTwoFASetup(true);
    setTwoFALoading(true);
    try {
      const res = await axios.post('/api/auth/2fa/setup');
      setTwoFASetupData(res.data);
      setTwoFABackupCodes(res.data.backup_codes || []);
      setTwoFASetupStep('qr');
    } catch (err) {
      showToast('Error setting up 2FA: ' + (err.response?.data?.detail || err.message));
      setShowTwoFASetup(false);
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
      setShowTwoFASetup(false);
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

  const handleThemeChange = (theme) => {
    const newSettings = {
      ...appSettings,
      theme: theme
    };
    onSettingsChange(newSettings);
    
    // Save settings to server
    axios.put('/api/auth/settings', newSettings)
      .then(res => {
        showToast(`Theme changed to ${theme}`);
      })
      .catch(err => {
        console.error('Failed to save theme setting:', err);
        showToast('Failed to save theme setting', 'error');
      });
  };

  const handleNotificationPreferenceChange = async (key, value) => {
    const newPreferences = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(newPreferences);

    try {
      setLoadingNotificationPrefs(true);
      await axios.put('/api/notifications/preferences', newPreferences);
      showToast('Notification preferences updated');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      showToast('Failed to save notification preferences', 'error');
      // Revert on error
      setNotificationPreferences(notificationPreferences);
    } finally {
      setLoadingNotificationPrefs(false);
    }
  };

  const handleSessionTimeoutChange = (minutes) => {
    const newSettings = {
      ...appSettings,
      autoLock: minutes
    };
    onSettingsChange(newSettings);
    
    // Save settings to server
    axios.put('/api/auth/settings', newSettings)
      .then(res => {
        showToast(minutes === 0 ? 'Auto-lock disabled' : `Session timeout set to ${minutes} minutes`);
      })
      .catch(err => {
        console.error('Failed to save session timeout:', err);
        showToast('Failed to save session timeout', 'error');
      });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateName = async () => {
    if (!currentUser?.id || !name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`/api/users/${currentUser.id}/name`, { name: name.trim() });
      onUserUpdate({ ...currentUser, name: name.trim() });
      setIsEditingName(false);
      showToast('Name updated successfully');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update name', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!currentUser?.id || !email.trim()) {
      showToast('Email cannot be empty', 'error');
      return;
      }
    
    setLoading(true);
    try {
      await axios.put(`/api/users/${currentUser.id}/email`, { email: email.trim() });
      onUserUpdate({ ...currentUser, email: email.trim() });
      setIsEditingEmail(false);
      showToast('Email updated successfully');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.id) return;
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`/api/users/${currentUser.id}/password`, { 
        current_password: currentPassword,
        new_password: newPassword 
      });
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = (field) => {
    if (field === 'name') {
      setName(currentUser?.name || '');
      setIsEditingName(false);
    } else if (field === 'email') {
      setEmail(currentUser?.email || '');
      setIsEditingEmail(false);
    } else if (field === 'password') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    }
  };

  const fetchUserSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const response = await axios.get('/api/auth/sessions');
      setUserSessions(response.data.sessions || []);
      setCurrentSessionId(response.data.current_session_id);
    } catch (error) {
      console.error('Failed to fetch user sessions:', error);
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const revokeSession = async (sessionId, sessionName) => {
    if (!window.confirm(`Are you sure you want to revoke the session "${sessionName}"? This will log you out of that device.`)) {
      return;
    }

    try {
      await axios.delete(`/api/auth/sessions/${sessionId}`);
      showToast('Session revoked successfully');
      fetchUserSessions(); // Refresh the sessions list
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to revoke session', 'error');
    }
  };

  const logoutAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices? You will remain logged in on this device.')) {
      return;
    }

    try {
      await axios.post('/api/auth/logout-all');
      showToast('Logged out of all other devices');
      fetchUserSessions(); // Refresh the sessions list
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to logout other sessions', 'error');
    }
  };

  // Recovery codes functions
  const fetchBackupCodesRemaining = async () => {
    try {
      const response = await axios.get('/api/auth/2fa/backup-codes-remaining');
      setBackupCodesRemaining(response.data.remaining || 0);
    } catch (error) {
      console.error('Failed to fetch backup codes count:', error);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!window.confirm('Are you sure you want to regenerate your backup codes? Your old codes will no longer work.')) {
      return;
    }

    try {
      setLoadingBackupCodes(true);
      const response = await axios.post('/api/auth/2fa/regenerate-backup-codes');
      setRegeneratedCodes(response.data.backup_codes);
      setBackupCodesRemaining(response.data.backup_codes.length);
      showToast('Backup codes regenerated successfully. Please save them in a safe place!');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to regenerate backup codes', 'error');
    } finally {
      setLoadingBackupCodes(false);
    }
  };

  // WebAuthn Functions
  const checkWebauthnSupport = useCallback(async () => {
    try {
      const supported = WebAuthnHelper.isSupported();
      setWebauthnSupported(supported);

      if (supported) {
        try {
          const platformAvailable = await WebAuthnHelper.isPlatformAuthenticatorAvailable();
          setPlatformAuthenticatorAvailable(platformAvailable === true);
        } catch (error) {
          console.log('Platform authenticator check failed:', error);
          setPlatformAuthenticatorAvailable(false);
        }
      } else {
        setPlatformAuthenticatorAvailable(false);
      }
    } catch (error) {
      console.error('WebAuthn support check failed:', error);
      setWebauthnSupported(false);
      setPlatformAuthenticatorAvailable(false);
    }
  }, []);

  const loadWebauthnStatus = useCallback(async () => {
    try {
      setLoadingWebauthn(true);
      const response = await axios.get('/api/webauthn/status');
      setWebauthnStatus(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // WebAuthn endpoint not available
        console.log('WebAuthn endpoint not available');
        setWebauthnStatus({ enabled: false, credentials_count: 0, credentials: [], endpoint_available: false });
      } else {
        console.error('Failed to load WebAuthn status:', error);
        setWebauthnStatus({ enabled: false, credentials_count: 0, credentials: [] });
      }
    } finally {
      setLoadingWebauthn(false);
    }
  }, []);

  const handleWebauthnRegister = async () => {
    if (!webauthnDeviceName.trim()) {
      showToast('Please enter a device name', 'error');
      return;
    }

    try {
      setLoadingWebauthn(true);

      // Register the security key
      // eslint-disable-next-line no-unused-vars
      const response = await axios.post('/api/webauthn/register', {
        device_name: webauthnDeviceName.trim()
      });

      showToast('Security key registered successfully!');
      setShowWebauthnSetup(false);
      setWebauthnDeviceName('');
      loadWebauthnStatus(); // Refresh status

    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      showToast(error.response?.data?.detail || error.message || 'Failed to register security key', 'error');
    } finally {
      setLoadingWebauthn(false);
    }
  };

  const handleDeleteWebauthnCredential = async (credentialId) => {
    if (!window.confirm('Are you sure you want to delete this security key? You will no longer be able to use it for authentication.')) {
      return;
    }

    try {
      await axios.delete(`/api/webauthn/credentials/${credentialId}`);
      showToast('Security key deleted successfully');
      loadWebauthnStatus(); // Refresh status
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete security key', 'error');
    }
  };

  // Load WebAuthn support and status on component mount - separate effect to avoid render phase errors
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const initWebAuthn = async () => {
      // Delay execution to ensure component is fully mounted
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 0);
      });

      if (!isMounted) return;

      try {
        await checkWebauthnSupport();
      } catch (error) {
        console.error('Failed to check WebAuthn support:', error);
      }

      if (!isMounted) return;

      try {
        await loadWebauthnStatus();
      } catch (error) {
        console.error('Failed to load WebAuthn status:', error);
      }
    };

    initWebAuthn();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkWebauthnSupport, loadWebauthnStatus]);

  // Store current session ID
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Load user sessions on component mount and when sessions tab becomes active
  useEffect(() => {
    if (currentUser?.id && (activeTab === 'sessions' || !userSessions.length)) {
      fetchUserSessions();
    }
  }, [currentUser?.id, activeTab, fetchUserSessions, userSessions.length]);

  // Load backup codes count when security tab becomes active
  useEffect(() => {
    if (currentUser?.id && activeTab === 'security') {
      fetchBackupCodesRemaining();
    }
  }, [currentUser?.id, activeTab]);

  return (
    <>
      <div className="content-area" style={{ paddingTop: '16px' }}>
        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'error' ? colors.danger : colors.success,
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 2000,
            animation: 'slideIn 0.3s ease-out'
          }}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

        <div className="content-header" style={{ marginBottom: '24px' }}>
          <h2>
            {activeTab === 'general' && 'Profile Information'}
            {activeTab === 'security' && 'Security Settings'}
            {activeTab === 'sessions' && 'Active Sessions'}
            {activeTab === 'recovery-codes' && 'Recovery Codes'}
            {activeTab === 'preferences' && 'Preferences'}
          </h2>
        </div>

        <div style={{ maxWidth: '600px' }}>
          {/* Profile Info Tab */}
          {(activeTab === 'general' || activeTab === undefined) && (
            <>
              {/* Avatar Section */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px', 
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: colors.backgroundSecondary,
                borderRadius: '12px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: colors.accent,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: '600'
                }}>
                  {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: colors.primary }}>{currentUser?.name}</h3>
                  <p style={{ margin: 0, color: colors.secondary, fontSize: '14px' }}>{currentUser?.email}</p>
                  <span style={{ 
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '4px 12px',
                    backgroundColor: currentUser?.role === 'admin' ? colors.accent : colors.secondary,
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {currentUser?.role}
                  </span>
                </div>
              </div>

              {/* Name Field */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px' }}>Display Name</label>
                  {!isEditingName && (
                    <button 
                      onClick={() => setIsEditingName(true)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: colors.accent, 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-pen" style={{ marginRight: '4px' }}></i> Edit
                    </button>
                  )}
                </div>
                {isEditingName ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-control"
                      style={{ flex: 1 }}
                      disabled={loading}
                    />
                    <button 
                      onClick={handleUpdateName} 
                      className="btn" 
                      style={{ padding: '8px 16px' }}
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => cancelEdit('name')} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: colors.secondary, fontSize: '16px' }}>{currentUser?.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px' }}>Email Address</label>
                  {!isEditingEmail && (
                    <button 
                      onClick={() => setIsEditingEmail(true)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: colors.accent, 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-pen" style={{ marginRight: '4px' }}></i> Edit
                    </button>
                  )}
                </div>
                {isEditingEmail ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control"
                      style={{ flex: 1 }}
                      disabled={loading}
                    />
                    <button 
                      onClick={handleUpdateEmail} 
                      className="btn" 
                      style={{ padding: '8px 16px' }}
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => cancelEdit('email')} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: colors.secondary, fontSize: '16px' }}>{currentUser?.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px' }}>Password</label>
                  {!isChangingPassword && (
                    <button 
                      onClick={() => setIsChangingPassword(true)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: colors.accent, 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-key" style={{ marginRight: '4px' }}></i> Change
                    </button>
                  )}
                </div>
                {isChangingPassword ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Hidden username field for accessibility and password managers */}
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      autoComplete="username"
                      style={{ display: 'none' }}
                      readOnly
                    />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="form-control"
                      placeholder="Current password"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-control"
                      placeholder="New password (min 6 characters)"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-control"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="submit"
                        className="btn" 
                        style={{ padding: '8px 16px' }}
                        disabled={loading}
                      >
                        Update Password
                      </button>
                      <button 
                        type="button"
                        onClick={() => cancelEdit('password')} 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 16px' }}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p style={{ margin: 0, color: colors.secondary, fontSize: '16px' }}>••••••••</p>
                )}
              </div>

              {/* Account Info */}
              <div style={{ 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Account Information
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: colors.primary, fontWeight: '500' }}>Username:</span>
                    <span style={{ marginLeft: '8px', color: colors.primary }}>{currentUser?.username}</span>
                  </div>
                  <div>
                    <span style={{ color: colors.primary, fontWeight: '500' }}>Role:</span>
                    <span style={{ marginLeft: '8px', color: colors.primary, textTransform: 'capitalize' }}>{currentUser?.role}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              {/* WebAuthn Security Keys */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px' }}>
                    <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Security Keys (WebAuthn)
                  </label>
                  {webauthnSupported && (
                    <button 
                      onClick={() => setShowWebauthnSetup(true)}
                      style={{ 
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                      disabled={loadingWebauthn}
                    >
                      <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                      Add Key
                    </button>
                  )}
                </div>
                
                {webauthnStatus?.endpoint_available === false ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-info-circle" style={{ fontSize: '24px', marginBottom: '8px', color: colors.info }}></i>
                    <div>Security Key feature is not enabled</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Contact your administrator to enable WebAuthn support
                    </div>
                  </div>
                ) : !webauthnSupported ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '8px', color: colors.warning }}></i>
                    <div>WebAuthn is not supported in this browser</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Try using Chrome, Firefox, Safari, or Edge
                    </div>
                  </div>
                ) : loadingWebauthn ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Loading security keys...
                  </div>
                ) : webauthnStatus?.credentials_count === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-shield-alt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <div>No security keys registered</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      Add a hardware security key for the most secure authentication
                    </div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {webauthnStatus?.credentials?.map((credential) => (
                      <div 
                        key={credential.id} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: colors.primary
                          }}>
                            <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                            {credential.device_name || `Security Key ${credential.id}`}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: colors.secondary,
                            lineHeight: '1.4'
                          }}>
                            <div>
                              <i className="fas fa-calendar" style={{ marginRight: '4px' }}></i>
                              Added: {new Date(credential.created_at).toLocaleDateString()}
                            </div>
                            {credential.last_used_at && (
                              <div>
                                <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>
                                Last used: {new Date(credential.last_used_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteWebauthnCredential(credential.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: `1px solid ${colors.danger}`,
                            color: colors.danger,
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                          disabled={loading}
                        >
                          <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <i 
                    className={`fas fa-${twoFAStatus.totp_enabled ? 'check-circle' : 'exclamation-circle'}`} 
                    style={{ 
                      fontSize: '20px', 
                      color: twoFAStatus.totp_enabled ? colors.success : colors.warning, 
                      marginRight: '12px' 
                    }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
                      Two-Factor Authentication
                    </h4>
                    <p style={{ margin: 0, color: colors.secondary, fontSize: '13px' }}>
                      {twoFAStatus.totp_enabled ? 'Enabled' : 'Not enabled'}
                      {twoFAStatus.is_admin && !twoFAStatus.totp_enabled && globalSettings.totp_enforcement === 'admin_only' ? ' (Required for admins)' : ''}
                      {!twoFAStatus.totp_enabled && globalSettings.totp_enforcement === 'required_all' ? ' (Required)' : ''}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  {!twoFAStatus.totp_enabled ? (
                    <button
                      onClick={() => {
                        if (!showTwoFASetup) {
                          handleSetup2FA();
                        } else {
                          setShowTwoFASetup(false);
                        }
                      }}
                      disabled={twoFALoading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: twoFALoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: twoFALoading ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
                      {twoFALoading ? 'Setting up...' : showTwoFASetup ? 'Cancel' : 'Enable 2FA'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowBackupCodes(true)}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          backgroundColor: colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fas fa-key" style={{ marginRight: '8px' }}></i>
                        Backup Codes
                      </button>
                      <button
                        onClick={() => setShowDisableTwoFA(true)}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          backgroundColor: colors.danger,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fas fa-times-circle" style={{ marginRight: '8px' }}></i>
                        Disable 2FA
                      </button>
                    </>
                  )}
                </div>

                {/* 2FA Setup Flow */}
                {showTwoFASetup && !twoFAStatus.totp_enabled && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: colors.backgroundSecondary,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`
                  }}>
                    {twoFASetupStep === 'qr' && (
                      <>
                        <h5 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                          <i className="fas fa-qrcode" style={{ marginRight: '8px', color: colors.accent }}></i>
                          Scan QR Code
                        </h5>
                        <div style={{
                          backgroundColor: colors.background,
                          padding: '20px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          textAlign: 'center'
                        }}>
                          {twoFASetupData && twoFASetupData.qr_code && (
                            <img 
                              src={twoFASetupData.qr_code} 
                              alt="2FA QR Code" 
                              style={{
                                maxWidth: '200px',
                                width: '100%',
                                marginBottom: '16px',
                                border: `4px solid white`,
                                borderRadius: '8px'
                              }} 
                            />
                          )}
                          <p style={{
                            margin: '0 0 8px 0',
                            color: colors.secondary,
                            fontSize: '13px'
                          }}>
                            Scan with Google Authenticator, Authy, or Microsoft Authenticator
                          </p>
                          {twoFASetupData && twoFASetupData.secret && (
                            <p style={{
                              margin: 0,
                              color: colors.secondary,
                              fontSize: '11px'
                            }}>
                              Manual entry: <code style={{
                                backgroundColor: colors.border,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>{twoFASetupData.secret}</code>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setTwoFASetupStep('verify')}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Next: Verify Code
                        </button>
                      </>
                    )}

                    {twoFASetupStep === 'verify' && (
                      <>
                        <h5 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                          <i className="fas fa-check-circle" style={{ marginRight: '8px', color: colors.accent }}></i>
                          Verify Your Code
                        </h5>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: colors.primary,
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            Enter the 6-digit code from your authenticator app:
                          </label>
                          <input
                            type="text"
                            placeholder="000000"
                            value={twoFAVerifyCode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setTwoFAVerifyCode(val);
                            }}
                            maxLength="6"
                            style={{
                              width: '100%',
                              padding: '14px',
                              fontSize: '20px',
                              letterSpacing: '8px',
                              textAlign: 'center',
                              border: `2px solid ${colors.border}`,
                              borderRadius: '8px',
                              backgroundColor: colors.backgroundSecondary,
                              color: colors.primary,
                              boxSizing: 'border-box',
                              fontWeight: '600'
                            }}
                            autoFocus
                          />
                        </div>

                        {twoFABackupCodes && twoFABackupCodes.length > 0 && (
                          <div style={{
                            backgroundColor: '#ffcccc',
                            padding: '14px',
                            borderRadius: '8px',
                            border: `1px solid #ff6666`,
                            marginBottom: '16px'
                          }}>
                            <p style={{
                              margin: '0 0 10px 0',
                              color: '#cc0000',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                              Save these backup codes:
                            </p>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '8px'
                            }}>
                              {twoFABackupCodes.map((code, idx) => (
                                <code key={idx} style={{
                                  backgroundColor: colors.background,
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  color: colors.secondary,
                                  fontFamily: 'monospace',
                                  textAlign: 'center'
                                }}>
                                  {code}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleComplete2FAEnrollment}
                            disabled={twoFALoading || twoFAVerifyCode.length !== 6}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              backgroundColor: colors.accent,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: twoFALoading || twoFAVerifyCode.length !== 6 ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              opacity: twoFALoading || twoFAVerifyCode.length !== 6 ? 0.6 : 1,
                              marginBottom: '8px'
                            }}
                          >
                            {twoFALoading ? 'Verifying...' : 'Complete Setup'}
                          </button>

                          <button
                            onClick={() => setTwoFASetupStep('qr')}
                            disabled={twoFALoading}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              backgroundColor: 'transparent',
                              color: colors.accent,
                              border: `2px solid ${colors.accent}`,
                              borderRadius: '6px',
                              cursor: twoFALoading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              opacity: twoFALoading ? 0.6 : 1
                            }}
                          >
                            Back to QR Code
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Recovery Codes Section */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background,
                opacity: twoFAStatus.totp_enabled ? 1 : 0.5,
                pointerEvents: twoFAStatus.totp_enabled ? 'auto' : 'none',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                      <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                      Recovery Codes
                    </label>
                    <p style={{ margin: 0, color: colors.secondary, fontSize: '12px' }}>
                      Use recovery codes to access your account if you lose your authenticator device
                    </p>
                  </div>
                </div>

                {!twoFAStatus.totp_enabled && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: colors.background,
                    padding: '16px 24px',
                    borderRadius: '8px',
                    border: `2px solid ${colors.border}`,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    zIndex: 1,
                    opacity: 1,
                    pointerEvents: 'auto'
                  }}>
                    <i className="fas fa-lock" style={{ fontSize: '24px', color: colors.secondary, marginBottom: '8px', display: 'block' }}></i>
                    <div style={{ color: colors.primary, fontWeight: '500', marginBottom: '4px' }}>
                      2FA Required
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      Enable Two-Factor Authentication to use recovery codes
                    </div>
                  </div>
                )}

                {loadingBackupCodes ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Loading...
                  </div>
                ) : (
                  <>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: colors.backgroundSecondary, 
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '24px', fontWeight: '600', color: colors.primary }}>
                            {backupCodesRemaining}
                          </div>
                          <div style={{ fontSize: '12px', color: colors.secondary }}>
                            Unused recovery codes remaining
                          </div>
                        </div>
                        <button
                          onClick={handleRegenerateBackupCodes}
                          disabled={loadingBackupCodes || !twoFAStatus.totp_enabled}
                          style={{
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: (loadingBackupCodes || !twoFAStatus.totp_enabled) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: (loadingBackupCodes || !twoFAStatus.totp_enabled) ? 0.6 : 1
                          }}
                        >
                          <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
                          Regenerate Codes
                        </button>
                      </div>
                    </div>

                    {regeneratedCodes && (
                      <div style={{ 
                        padding: '16px', 
                        backgroundColor: colors.accentLight, 
                        borderRadius: '6px',
                        border: `2px solid ${colors.accent}`,
                        marginTop: '16px'
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: colors.primary }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
                            Save these codes now!
                          </strong>
                          <p style={{ margin: '8px 0', fontSize: '12px', color: colors.secondary }}>
                            Each code can only be used once. Store them in a safe place.
                          </p>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                          gap: '8px',
                          padding: '12px',
                          backgroundColor: colors.background,
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {regeneratedCodes.map((code, index) => (
                            <div 
                              key={index}
                              style={{ 
                                padding: '8px',
                                backgroundColor: colors.backgroundSecondary,
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: colors.primary,
                                letterSpacing: '1px'
                              }}
                            >
                              {code}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const text = regeneratedCodes.join('\n');
                            navigator.clipboard.writeText(text);
                            showToast('Recovery codes copied to clipboard');
                          }}
                          style={{
                            marginTop: '12px',
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            width: '100%'
                          }}
                        >
                          <i className="fas fa-copy" style={{ marginRight: '8px' }}></i>
                          Copy All Codes
                        </button>
                      </div>
                    )}

                    <div style={{ 
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: colors.backgroundSecondary,
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: colors.secondary
                    }}>
                      <p style={{ margin: '0 0 8px 0' }}>
                        <strong style={{ color: colors.primary }}>Important:</strong>
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Each recovery code can only be used once</li>
                        <li>Store codes in a secure location (password manager, safe, etc.)</li>
                        <li>Regenerating codes will invalidate all previous codes</li>
                        <li>You can use a recovery code to log in if you lose access to your authenticator app</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <>
              {/* Active Sessions */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px' }}>
                    <i className="fas fa-desktop" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Active Sessions
                  </label>
                  <button 
                    onClick={logoutAllSessions}
                    style={{ 
                      backgroundColor: colors.danger,
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                    disabled={loading}
                  >
                    <i className="fas fa-sign-out-alt" style={{ marginRight: '4px' }}></i>
                    Logout All Other Devices
                  </button>
                </div>
                
                {loadingSessions ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Loading sessions...
                  </div>
                ) : userSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    No active sessions found
                  </div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {userSessions.map((session) => (
                      <div 
                        key={session.id} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: '6px',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: colors.primary
                          }}>
                            <i className="fas fa-circle" 
                               style={{ 
                                 marginRight: '8px', 
                                 color: session.token_jti === currentSessionId ? colors.success : colors.secondary,
                                 fontSize: '8px'
                               }} 
                            />
                            {session.device_name || 'Unknown Device'}
                            {session.token_jti === currentSessionId && (
                              <span style={{ 
                                marginLeft: '8px',
                                backgroundColor: colors.accent,
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}>
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: colors.secondary,
                            lineHeight: '1.4'
                          }}>
                            <div>
                              <i className="fas fa-globe" style={{ marginRight: '4px' }}></i>
                              {session.ip_address || 'Unknown IP'}
                            </div>
                            <div>
                              <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>
                              Last active: {new Date(session.last_activity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {session.token_jti !== currentSessionId && (
                          <button
                            onClick={() => revokeSession(session.id, session.device_name || 'Unknown Device')}
                            style={{
                              backgroundColor: 'transparent',
                              border: `1px solid ${colors.danger}`,
                              color: colors.danger,
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            disabled={loading}
                          >
                            <i className="fas fa-times" style={{ marginRight: '4px' }}></i>
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}



          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <>
              {/* Theme Preference */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                  <i className="fas fa-palette" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Theme Preference
                </label>
                <p style={{ margin: '0 0 12px 0', color: colors.secondary, fontSize: '12px' }}>
                  Choose your preferred color theme for the application
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['light', 'dark', 'auto'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => handleThemeChange(theme)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: appSettings?.theme === theme ? colors.accent : colors.backgroundSecondary,
                        color: appSettings?.theme === theme ? 'white' : colors.primary,
                        border: `1px solid ${appSettings?.theme === theme ? colors.accent : colors.border}`,
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}
                    >
                      <i className={`fas fa-${theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'adjust'}`} style={{ marginRight: '6px' }}></i>
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Timeout */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                  <i className="fas fa-clock" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Session Timeout
                </label>
                <p style={{ margin: '0 0 12px 0', color: colors.secondary, fontSize: '12px' }}>
                  Automatically lock your session after a period of inactivity
                </p>
                <select
                  value={appSettings?.autoLock || 5}
                  onChange={(e) => handleSessionTimeoutChange(parseInt(e.target.value))}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.primary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={0}>Never (not recommended)</option>
                </select>
              </div>

              {/* Notification Preferences */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '8px',
                backgroundColor: colors.background
              }}>
                <h4 style={{ 
                  fontWeight: '500', 
                  color: colors.primary, 
                  fontSize: '14px', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <i className="fas fa-bell" style={{ marginRight: '8px', color: colors.accent }}></i>
                  Notification Preferences
                </h4>
                <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '12px' }}>
                  Choose which types of notifications you want to receive
                </p>

                {loadingNotificationPrefs ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Loading preferences...
                  </div>
                ) : (
                  <>
                    {/* Email Notifications Section */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontWeight: '500', 
                        color: colors.primary, 
                        fontSize: '13px', 
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: `1px solid ${colors.border}`
                      }}>
                        <i className="fas fa-envelope" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                        Email Notifications
                      </div>

                      {[
                        { key: 'email_security_alerts', label: 'Security Alerts', description: 'Login attempts, password changes', icon: 'shield-alt' },
                        { key: 'email_2fa_alerts', label: '2FA Changes', description: 'Two-factor authentication setup and changes', icon: 'key' },
                        { key: 'email_account_alerts', label: 'Account Changes', description: 'Profile updates and settings changes', icon: 'user-edit' }
                      ].map(pref => (
                        <div 
                          key={pref.key}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '10px 12px',
                            marginBottom: '8px',
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: '6px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                              <i className={`fas fa-${pref.icon}`} style={{ marginRight: '8px', color: colors.accent, fontSize: '12px', width: '14px' }}></i>
                              <span style={{ fontSize: '13px', fontWeight: '500', color: colors.primary }}>
                                {pref.label}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: colors.secondary, marginLeft: '22px' }}>
                              {pref.description}
                            </div>
                          </div>
                          <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '44px',
                            height: '24px',
                            marginLeft: '12px'
                          }}>
                            <input
                              type="checkbox"
                              checked={notificationPreferences[pref.key]}
                              onChange={(e) => handleNotificationPreferenceChange(pref.key, e.target.checked)}
                              disabled={loadingNotificationPrefs}
                              style={{
                                opacity: 0,
                                width: 0,
                                height: 0
                              }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: loadingNotificationPrefs ? 'not-allowed' : 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: notificationPreferences[pref.key] ? colors.accent : colors.border,
                              transition: '0.4s',
                              borderRadius: '24px'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: notificationPreferences[pref.key] ? '23px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                transition: '0.4s',
                                borderRadius: '50%'
                              }}></span>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* In-App Notifications Section */}
                    <div>
                      <div style={{ 
                        fontWeight: '500', 
                        color: colors.primary, 
                        fontSize: '13px', 
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: `1px solid ${colors.border}`
                      }}>
                        <i className="fas fa-desktop" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                        In-App Notifications
                      </div>

                      {[
                        { key: 'in_app_security_alerts', label: 'Security Alerts', description: 'Login attempts, password changes', icon: 'shield-alt' },
                        { key: 'in_app_2fa_alerts', label: '2FA Changes', description: 'Two-factor authentication setup and changes', icon: 'key' },
                        { key: 'in_app_account_alerts', label: 'Account Changes', description: 'Profile updates and settings changes', icon: 'user-edit' }
                      ].map(pref => (
                        <div 
                          key={pref.key}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '10px 12px',
                            marginBottom: '8px',
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: '6px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                              <i className={`fas fa-${pref.icon}`} style={{ marginRight: '8px', color: colors.accent, fontSize: '12px', width: '14px' }}></i>
                              <span style={{ fontSize: '13px', fontWeight: '500', color: colors.primary }}>
                                {pref.label}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: colors.secondary, marginLeft: '22px' }}>
                              {pref.description}
                            </div>
                          </div>
                          <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '44px',
                            height: '24px',
                            marginLeft: '12px'
                          }}>
                            <input
                              type="checkbox"
                              checked={notificationPreferences[pref.key]}
                              onChange={(e) => handleNotificationPreferenceChange(pref.key, e.target.checked)}
                              disabled={loadingNotificationPrefs}
                              style={{
                                opacity: 0,
                                width: 0,
                                height: 0
                              }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: loadingNotificationPrefs ? 'not-allowed' : 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: notificationPreferences[pref.key] ? colors.accent : colors.border,
                              transition: '0.4s',
                              borderRadius: '24px'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: notificationPreferences[pref.key] ? '23px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                transition: '0.4s',
                                borderRadius: '50%'
                              }}></span>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

            {/* 2FA Disable Modal */}
            {showDisableTwoFA && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
              }}>
                <div style={{
                  backgroundColor: colors.background,
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '400px',
                  width: '90%',
                  border: `1px solid ${colors.border}`
                }}>
                  <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '18px' }}>
                    Disable 2FA
                  </h4>
                  <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
                    Enter your password and a 2FA code to disable two-factor authentication:
                  </p>
                  <input
                    type="password"
                    placeholder="Password"
                    value={disableTwoFAPassword}
                    onChange={(e) => setDisableTwoFAPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '12px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.primary,
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="2FA Code (optional)"
                    value={disableTwoFACode}
                    onChange={(e) => setDisableTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '16px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.primary,
                      boxSizing: 'border-box',
                      letterSpacing: '4px',
                      textAlign: 'center'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setShowDisableTwoFA(false);
                        setDisableTwoFAPassword('');
                        setDisableTwoFACode('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.backgroundSecondary,
                        color: colors.primary,
                        border: `2px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDisable2FA}
                      disabled={!disableTwoFAPassword}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: !disableTwoFAPassword ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: !disableTwoFAPassword ? 0.5 : 1
                      }}
                    >
                      Disable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Codes Modal */}
            {showBackupCodes && twoFABackupCodes.length > 0 && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
              }}>
                <div style={{
                  backgroundColor: colors.background,
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  border: `1px solid ${colors.border}`
                }}>
                  <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '18px' }}>
                    <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Backup Recovery Codes
                  </h4>
                  <p style={{ margin: '0 0 20px 0', color: colors.secondary, fontSize: '14px' }}>
                    Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                  </p>
                  
                  <div style={{
                    backgroundColor: '#ffcccc',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #ff6666',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: '#cc0000', marginRight: '8px', fontSize: '16px' }}></i>
                      <span style={{ color: '#cc0000', fontWeight: '600', fontSize: '14px' }}>Important</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#cc0000', fontSize: '13px' }}>
                      <li>Each code can only be used once</li>
                      <li>Store these codes securely (not on your phone)</li>
                      <li>Don't share these codes with anyone</li>
                      <li>If you lose these codes, you'll need to disable and re-enable 2FA</li>
                    </ul>
                  </div>

                  <div style={{
                    backgroundColor: colors.backgroundSecondary,
                    padding: '20px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '16px',
                      fontFamily: 'monospace'
                    }}>
                      {twoFABackupCodes.map((code, idx) => (
                        <div key={idx} style={{
                          backgroundColor: colors.background,
                          padding: '10px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          border: `1px solid ${colors.border}`,
                          fontWeight: '600',
                          color: colors.primary
                        }}>
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(twoFABackupCodes.join('\n'));
                        showToast('Backup codes copied to clipboard');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-copy" style={{ marginRight: '8px' }}></i>
                      Copy Codes
                    </button>
                    <button
                      onClick={() => setShowBackupCodes(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: 'transparent',
                        color: colors.accent,
                        border: `2px solid ${colors.accent}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      I've Saved Them
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

        {/* WebAuthn Setup Modal */}
        {showWebauthnSetup && (
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
              Add Security Key
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              color: colors.secondary,
              fontSize: '14px'
            }}>
              Register a hardware security key for passwordless authentication.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: colors.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Device Name
              </label>
              <input
                type="text"
                placeholder="e.g., YubiKey, Touch ID"
                value={webauthnDeviceName}
                onChange={(e) => setWebauthnDeviceName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#ffcccc',
                color: '#cc0000',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleWebauthnRegister}
              disabled={loadingWebauthn || !webauthnDeviceName.trim()}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingWebauthn || !webauthnDeviceName.trim() ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '8px',
                opacity: loadingWebauthn || !webauthnDeviceName.trim() ? 0.6 : 1
              }}
            >
              {loadingWebauthn ? 'Setting up...' : 'Register Security Key'}
            </button>

            <button
              onClick={() => {
                setShowWebauthnSetup(false);
                setWebauthnDeviceName('');
                setError('');
              }}
              disabled={loadingWebauthn}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: colors.accent,
                border: `2px solid ${colors.accent}`,
                borderRadius: '6px',
                cursor: loadingWebauthn ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                opacity: loadingWebauthn ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileView;
