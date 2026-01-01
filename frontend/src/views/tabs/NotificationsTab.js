import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NotificationsTab = ({ appSettings, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

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
      border: isDark ? '#374151' : '#e2e8f0',
      background: isDark ? '#1f2937' : '#ffffff',
      backgroundSecondary: isDark ? '#111827' : '#f7fafc',
      success: '#68d391',
      danger: isDark ? '#fc8181' : '#f56565'
    };
  };

  const colors = getThemeColors();

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await axios.get('/api/notifications/');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.post(`/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <div>
      <div style={{ maxWidth: '900px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-bell" style={{ marginRight: '8px', color: colors.accent }}></i>
          Notifications
        </h3>

        {/* Notification Stats */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: '4px' }}>Total Unread</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.accent }}>
              {unreadCount}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-check-double" style={{ marginRight: '6px' }}></i>
                Mark All as Read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.backgroundSecondary,
                color: colors.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: activeFilter === filter.value ? colors.accent : colors.secondary,
                border: 'none',
                borderBottom: activeFilter === filter.value ? `2px solid ${colors.accent}` : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeFilter === filter.value ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {notificationsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <div>No notifications</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  padding: '16px',
                  backgroundColor: !notification.read ? colors.accentLight : colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.primary,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {!notification.read && (
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: colors.accent
                      }}></span>
                    )}
                    {notification.title}
                  </div>
                  <p style={{ fontSize: '13px', color: colors.secondary, margin: '8px 0 0 0' }}>
                    {notification.message}
                  </p>
                  <div style={{ fontSize: '12px', color: colors.secondary, marginTop: '8px' }}>
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <i className="fas fa-check"></i>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    title="Delete notification"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: colors.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsTab;
