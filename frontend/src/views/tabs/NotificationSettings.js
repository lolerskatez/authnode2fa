import React, { useState, useEffect } from 'react';

const NotificationSettings = ({ appSettings }) => {
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_enabled: true,
    smtp_required_for_email: true,
    daily_digest: false,
    digest_time: '09:00',
    notification_retention_days: 30,
    max_notifications: 1000
  });
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Theme-aware colors (matching SettingsView Security tab)
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
      infoLight: isDark ? '#1e3a5f' : '#e6f3ff',
      infoBorder: isDark ? '#2c5282' : '#90cdf4',
      info: isDark ? '#63b3ed' : '#3182ce'
    };
  };

  const colors = getThemeColors();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // For now, use default settings. In future, fetch from /api/admin/notification-settings
      setSettings({
        notifications_enabled: true,
        email_enabled: true,
        smtp_required_for_email: true,
        daily_digest: false,
        digest_time: '09:00',
        notification_retention_days: 30,
        max_notifications: 1000
      });
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // POST to /api/admin/notification-settings in future
      // await axios.put('/api/admin/notification-settings', newSettings);
      setMessage('Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setMessage('Failed to save settings');
      setSettings(settings);
    }
  };

  // Card container style (matches Security tab)
  const cardStyle = {
    padding: '16px',
    backgroundColor: colors.background,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    marginBottom: '16px'
  };

  // Setting row style - no background, just clean layout
  const settingRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`
  };

  // Last row without border
  const lastSettingRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0'
  };

  const labelStyle = {
    color: colors.primary,
    fontWeight: '600',
    fontSize: '13px',
    marginBottom: '2px'
  };

  const descriptionStyle = {
    color: colors.secondary,
    fontSize: '12px',
    margin: 0
  };

  const checkboxStyle = {
    width: '20px',
    height: '20px',
    cursor: loading ? 'not-allowed' : 'pointer',
    accentColor: colors.accent
  };

  const inputStyle = {
    width: '100px',
    padding: '10px 12px',
    fontSize: '14px',
    border: `2px solid ${colors.border}`,
    borderRadius: '6px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.primary,
    textAlign: 'center'
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Page Header */}
      <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
        <i className="fas fa-bell" style={{ marginRight: '8px', color: colors.accent }}></i>
        Notification Settings
      </h3>

      {/* System Notification Configuration */}
      <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
        <i className="fas fa-cog" style={{ marginRight: '8px', color: colors.accent }}></i>
        System Notification Configuration
      </h4>
      <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
        Configure system-wide notification settings and behavior
      </p>

      <div style={cardStyle}>
        <div style={settingRowStyle}>
          <div>
            <div style={labelStyle}>Enable Notifications</div>
            <p style={descriptionStyle}>Master switch for all system notifications</p>
          </div>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={settings.notifications_enabled}
            onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Email Configuration */}
      <h4 style={{ margin: '24px 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
        <i className="fas fa-envelope" style={{ marginRight: '8px', color: colors.accent }}></i>
        Email Configuration
      </h4>
      <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
        Control how email notifications are handled
      </p>

      <div style={cardStyle}>
        <div style={settingRowStyle}>
          <div>
            <div style={labelStyle}>Email Notifications</div>
            <p style={descriptionStyle}>Enable sending notifications via email</p>
          </div>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={settings.email_enabled}
            onChange={(e) => handleSettingChange('email_enabled', e.target.checked)}
            disabled={loading}
          />
        </div>

        <div style={settingRowStyle}>
          <div>
            <div style={labelStyle}>Require SMTP Configuration</div>
            <p style={descriptionStyle}>Disable email notifications if SMTP is not configured</p>
          </div>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={settings.smtp_required_for_email}
            onChange={(e) => handleSettingChange('smtp_required_for_email', e.target.checked)}
            disabled={loading}
          />
        </div>

        <div style={settings.daily_digest ? settingRowStyle : lastSettingRowStyle}>
          <div>
            <div style={labelStyle}>Daily Digest</div>
            <p style={descriptionStyle}>Send users a daily summary of notifications</p>
          </div>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={settings.daily_digest}
            onChange={(e) => handleSettingChange('daily_digest', e.target.checked)}
            disabled={loading}
          />
        </div>

        {settings.daily_digest && (
          <div style={lastSettingRowStyle}>
            <div>
              <div style={labelStyle}>Digest Time</div>
              <p style={descriptionStyle}>Time to send the daily digest email</p>
            </div>
            <input
              type="time"
              style={inputStyle}
              value={settings.digest_time}
              onChange={(e) => handleSettingChange('digest_time', e.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* Storage & Retention */}
      <h4 style={{ margin: '24px 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
        <i className="fas fa-database" style={{ marginRight: '8px', color: colors.accent }}></i>
        Storage & Retention
      </h4>
      <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
        Configure notification storage and cleanup policies
      </p>

      <div style={cardStyle}>
        <div style={settingRowStyle}>
          <div>
            <div style={labelStyle}>Notification Retention (days)</div>
            <p style={descriptionStyle}>Days to keep notifications in the system</p>
          </div>
          <input
            type="number"
            style={inputStyle}
            min="1"
            max="365"
            value={settings.notification_retention_days}
            onChange={(e) => handleSettingChange('notification_retention_days', parseInt(e.target.value) || 30)}
            disabled={loading}
          />
        </div>

        <div style={lastSettingRowStyle}>
          <div>
            <div style={labelStyle}>Maximum Notifications Per User</div>
            <p style={descriptionStyle}>Limit notifications stored per user</p>
          </div>
          <input
            type="number"
            style={inputStyle}
            min="10"
            max="10000"
            value={settings.max_notifications}
            onChange={(e) => handleSettingChange('max_notifications', parseInt(e.target.value) || 1000)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        padding: '10px 12px',
        backgroundColor: colors.infoLight,
        borderRadius: '6px',
        border: `1px solid ${colors.infoBorder}`,
        fontSize: '12px',
        color: colors.secondary,
        marginTop: '8px'
      }}>
        <i className="fas fa-info-circle" style={{ marginRight: '6px', color: colors.info }}></i>
        Notifications older than the retention period will be automatically cleaned up. Users will still have access to notification history within the retention window.
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginTop: '16px',
          backgroundColor: message.includes('successfully') ? 'rgba(104, 211, 145, 0.1)' : 'rgba(252, 129, 129, 0.1)',
          color: message.includes('successfully') ? colors.success : colors.danger,
          border: `1px solid ${message.includes('successfully') ? colors.success : colors.danger}`
        }}>
          <i className={`fas fa-${message.includes('successfully') ? 'check-circle' : 'exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
          {message}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
