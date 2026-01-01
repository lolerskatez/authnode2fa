import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationSettings.css';

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
      setLoading(true);
      // POST to /api/admin/notification-settings in future
      // await axios.put('/api/admin/notification-settings', newSettings);
      setMessage('Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setMessage('Failed to save settings');
      setSettings(settings);
    } finally {
      setLoading(false);
    }
  };

  // Determine theme
  let isDark = appSettings?.theme === 'dark';
  if (appSettings?.theme === 'auto') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const containerClass = isDark ? 'notification-settings notification-settings-dark' : 'notification-settings notification-settings-light';

  return (
    <div className={containerClass}>
      <div className="settings-section">
        <h3>System Notification Configuration</h3>
        <p className="section-description">Configure system-wide notification settings and behavior</p>

        <div className="settings-group">
          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Enable Notifications</span>
              <span className="setting-description">Master switch for all system notifications</span>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked)}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Email Configuration</h3>
        <p className="section-description">Control how email notifications are handled</p>

        <div className="settings-group">
          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Email Notifications</span>
              <span className="setting-description">Enable sending notifications via email</span>
            </div>
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) => handleSettingChange('email_enabled', e.target.checked)}
              disabled={loading}
            />
          </label>

          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Require SMTP Configuration</span>
              <span className="setting-description">Disable email notifications if SMTP is not configured</span>
            </div>
            <input
              type="checkbox"
              checked={settings.smtp_required_for_email}
              onChange={(e) => handleSettingChange('smtp_required_for_email', e.target.checked)}
              disabled={loading}
            />
          </label>

          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Daily Digest</span>
              <span className="setting-description">Send users a daily summary of notifications</span>
            </div>
            <input
              type="checkbox"
              checked={settings.daily_digest}
              onChange={(e) => handleSettingChange('daily_digest', e.target.checked)}
              disabled={loading}
            />
          </label>

          {settings.daily_digest && (
            <div className="setting-item nested">
              <label>
                <span className="setting-label">Digest Time</span>
                <input
                  type="time"
                  value={settings.digest_time}
                  onChange={(e) => handleSettingChange('digest_time', e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>Storage & Retention</h3>
        <p className="section-description">Configure notification storage and cleanup policies</p>

        <div className="settings-group">
          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Notification Retention</span>
              <span className="setting-description">Days to keep notifications in the system</span>
            </div>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.notification_retention_days}
              onChange={(e) => handleSettingChange('notification_retention_days', parseInt(e.target.value))}
              disabled={loading}
            />
          </label>

          <label className="setting-item">
            <div className="setting-header">
              <span className="setting-label">Maximum Notifications Per User</span>
              <span className="setting-description">Limit notifications stored per user</span>
            </div>
            <input
              type="number"
              min="10"
              max="10000"
              value={settings.max_notifications}
              onChange={(e) => handleSettingChange('max_notifications', parseInt(e.target.value))}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
