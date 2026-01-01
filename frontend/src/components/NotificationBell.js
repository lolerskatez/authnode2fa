import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NotificationBell = ({ appSettings, onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Theme-aware colors
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
      danger: isDark ? '#fc8181' : '#f56565'
    };
  };

  const colors = getThemeColors();

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/notifications/count');
        setUnreadCount(response.data.unread || 0);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={onClick}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '6px',
          color: colors.primary,
          fontSize: '18px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.backgroundSecondary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={`${unreadCount} unread notifications`}
      >
        <i className="fas fa-bell"></i>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: colors.danger,
              color: 'white',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: unreadCount >= 10 ? '2px 4px' : '2px 5px',
              minWidth: '16px',
              textAlign: 'center',
              border: `2px solid ${colors.background}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              animation: 'pulse 2s infinite'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '8px',
              height: '8px',
              border: `2px solid ${colors.accent}`,
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
