import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NotificationPreferences = ({ appSettings, currentUser }) => {
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    in_app_enabled: true,
    security_events: true,
    account_changes: true,
    system_updates: true,
    marketing_emails: false
  });
  const [loading, setLoading] = useState(false);

  // Theme-aware colors
  const getThemeColors = () => {
    let isDark = appSettings?.theme === 'dark';
    
    // Handle 'auto' theme by checking system preference
    if (appSettings?.theme === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
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

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get('/api/notifications/preferences');
      if (response.data) {
        setPreferences({
          email_enabled: response.data.email_enabled !== false,
          in_app_enabled: response.data.in_app_enabled !== false,
          security_events: response.data.security_events !== false,
          account_changes: response.data.account_changes !== false,
          system_updates: response.data.system_updates !== false,
          marketing_emails: response.data.marketing_emails === true
        });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      setLoading(true);
      await axios.put('/api/notifications/preferences', newPreferences);
      // Success - preferences saved
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'email_enabled',
      label: 'Email Notifications',
      description: 'Receive notifications via email when SMTP is configured',
      icon: 'envelope',
      category: 'general'
    },
    {
      key: 'in_app_enabled',
      label: 'In-App Notifications',
      description: 'Show notifications within the application',
      icon: 'bell',
      category: 'general'
    },
    {
      key: 'security_events',
      label: 'Security Events',
      description: 'Login attempts, 2FA changes, password resets',
      icon: 'shield-alt',
      category: 'security'
    },
    {
      key: 'account_changes',
      label: 'Account Changes',
      description: 'Profile updates, application modifications',
      icon: 'user-edit',
      category: 'account'
    },
    {
      key: 'system_updates',
      label: 'System Updates',
      description: 'New features, maintenance notifications',
      icon: 'cogs',
      category: 'system'
    },
    {
      key: 'marketing_emails',
      label: 'Marketing Communications',
      description: 'Product updates, tips, and promotional content',
      icon: 'bullhorn',
      category: 'marketing'
    }
  ];

  const categories = {
    general: notificationTypes.filter(t => t.category === 'general'),
    security: notificationTypes.filter(t => t.category === 'security'),
    account: notificationTypes.filter(t => t.category === 'account'),
    system: notificationTypes.filter(t => t.category === 'system'),
    marketing: notificationTypes.filter(t => t.category === 'marketing')
  };

  return (
    <div>
      <div style={{ maxWidth: '800px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-cog" style={{ marginRight: '8px', color: colors.accent }}></i>
          Notification Preferences
        </h3>

        <p style={{ marginBottom: '24px', color: colors.secondary, fontSize: '14px' }}>
          Choose how you want to be notified about important events and updates.
        </p>

        {/* General Settings */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
            <i className="fas fa-sliders-h" style={{ marginRight: '8px', color: colors.accent }}></i>
            General Settings
          </h4>

          {categories.general.map(setting => (
            <div key={setting.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={`fas fa-${setting.icon}`} style={{ color: colors.accent, width: '16px' }}></i>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: colors.primary }}>
                      {setting.label}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      {setting.description}
                    </div>
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '26px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={preferences[setting.key]}
                  onChange={(e) => handlePreferenceChange(setting.key, e.target.checked)}
                  disabled={loading}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences[setting.key] ? colors.accent : colors.border,
                  transition: '0.4s',
                  borderRadius: '26px',
                  opacity: loading ? 0.6 : 1
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: preferences[setting.key] ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    transition: '0.4s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* Security Notifications */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
            <i className="fas fa-shield-alt" style={{ marginRight: '8px', color: colors.danger }}></i>
            Security & Account
          </h4>

          {[...categories.security, ...categories.account].map(setting => (
            <div key={setting.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={`fas fa-${setting.icon}`} style={{ color: colors.accent, width: '16px' }}></i>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: colors.primary }}>
                      {setting.label}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      {setting.description}
                    </div>
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '26px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={preferences[setting.key]}
                  onChange={(e) => handlePreferenceChange(setting.key, e.target.checked)}
                  disabled={loading}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences[setting.key] ? colors.accent : colors.border,
                  transition: '0.4s',
                  borderRadius: '26px',
                  opacity: loading ? 0.6 : 1
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: preferences[setting.key] ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    transition: '0.4s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* System & Marketing */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '8px', color: colors.accent }}></i>
            System & Marketing
          </h4>

          {[...categories.system, ...categories.marketing].map(setting => (
            <div key={setting.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: setting.key !== 'marketing_emails' ? `1px solid ${colors.border}` : 'none'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={`fas fa-${setting.icon}`} style={{ color: colors.accent, width: '16px' }}></i>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: colors.primary }}>
                      {setting.label}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      {setting.description}
                    </div>
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '26px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={preferences[setting.key]}
                  onChange={(e) => handlePreferenceChange(setting.key, e.target.checked)}
                  disabled={loading}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences[setting.key] ? colors.accent : colors.border,
                  transition: '0.4s',
                  borderRadius: '26px',
                  opacity: loading ? 0.6 : 1
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: preferences[setting.key] ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    transition: '0.4s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: colors.secondary,
            fontSize: '14px'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Saving preferences...
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;
