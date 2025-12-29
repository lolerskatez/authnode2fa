import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../App.css';

const ProfileView = ({ currentUser, onUserUpdate, appSettings }) => {
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
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(currentUser?.email_notifications_enabled || false);
  
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userSessions, setUserSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchUserPreferences = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${currentUser.id}/preferences`);
      if (response.data) {
        setEmailNotificationsEnabled(response.data.email_notifications_enabled || false);
      }
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
  }, [currentUser.id]);

  // Load user preferences on component mount
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserPreferences();
    }
  }, [currentUser?.id, fetchUserPreferences]);

  const handleToggleEmailNotifications = async () => {
    const newValue = !emailNotificationsEnabled;
    setLoading(true);
    try {
      await axios.put(`/api/users/${currentUser.id}/preferences`, {
        email_notifications_enabled: newValue
      });
      setEmailNotificationsEnabled(newValue);
      showToast(newValue ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch (error) {
      if (error.response?.status === 404) {
        showToast('User preferences endpoint not yet available - backend not implemented', 'error');
      } else {
        showToast(error.response?.data?.detail || 'Failed to update notification preference', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateName = async () => {
    if (!name.trim()) {
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
    if (!email.trim()) {
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

  // Store current session ID
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Load user sessions on component mount
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserSessions();
    }
  }, [currentUser?.id, fetchUserSessions]);

  return (
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
        <h2>Profile</h2>
      </div>

      <div style={{ maxWidth: '600px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-control"
                placeholder="Current password"
                disabled={loading}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                placeholder="New password (min 6 characters)"
                disabled={loading}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control"
                placeholder="Confirm new password"
                disabled={loading}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleChangePassword} 
                  className="btn" 
                  style={{ padding: '8px 16px' }}
                  disabled={loading}
                >
                  Update Password
                </button>
                <button 
                  onClick={() => cancelEdit('password')} 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 16px' }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: colors.secondary, fontSize: '16px' }}>••••••••</p>
          )}
        </div>

        {/* Email Notifications Preference */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          border: `1px solid ${colors.border}`, 
          borderRadius: '8px',
          backgroundColor: colors.background
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <label style={{ fontWeight: '500', color: colors.primary, fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                <i className="fas fa-envelope" style={{ marginRight: '8px', color: colors.accent }}></i>
                Email Notifications
              </label>
              <p style={{ margin: 0, color: colors.secondary, fontSize: '12px' }}>
                Receive email notifications for authentication events (if enabled by administrator)
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '16px' }}>
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={handleToggleEmailNotifications}
                disabled={loading}
                style={{ cursor: 'pointer', width: '18px', height: '18px', marginRight: '8px' }}
              />
              <span style={{ color: colors.primary, fontWeight: '500', fontSize: '14px' }}>
                {emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

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
                           color: session.id === currentSessionId ? colors.success : colors.secondary,
                           fontSize: '8px'
                         }} 
                      />
                      {session.device_name || 'Unknown Device'}
                      {session.id === currentSessionId && (
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
                  {session.id !== currentSessionId && (
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
      </div>
    </div>
  );
};

export default ProfileView;
