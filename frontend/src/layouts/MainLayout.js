import React, { useState, useEffect, useRef } from 'react';
import '../App.css';

const MainLayout = ({ 
  currentUser, 
  currentView, 
  onViewChange, 
  accounts, 
  onLogout,
  isMobile,
  selectedCategory,
  onCategoryChange,
  appSettings,
  onSecurityClick,
  twoFAEnabled,
  unreadCount = 0
}) => {
  // Theme-aware color helpers
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      border: isDark ? '#4a5568' : '#e0e6ed',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundLight: isDark ? '#1a202c' : '#f7fafc',
      danger: isDark ? '#fc8181' : '#e53e3e',
      dangerDark: isDark ? '#c53030' : '#c53030'
    };
  };

  const colors = getThemeColors();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const accountCount = accounts.length;
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleUserManagementClick = () => {
    onViewChange('settings', 'user-management');
    setShowDropdown(false);
  };

  if (isMobile) {
    return (
      <div className="mobile-view">
        <div className="mobile-header">
          <div className="mobile-logo">
            <i className="fas fa-shield-alt"></i>
            <span>AuthNode 2FA</span>
          </div>
          <div className="profile-menu">
            <div 
              className="user-avatar" 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ cursor: 'pointer' }}
            >
              {currentUser ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item">
                  <i className="fas fa-user"></i>
                  Profile
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('settings', 'general');
                    setShowDropdown(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-cog"></i>
                  Settings
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('notifications', 'inbox');
                    setShowDropdown(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-bell"></i>
                  Notifications
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('settings', 'notification-preferences');
                    setShowDropdown(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-cog"></i>
                  Notification Settings
                </div>
                {currentUser && currentUser.role === 'admin' && (
                  <div 
                    className="dropdown-item" 
                    onClick={handleUserManagementClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="fas fa-users-cog"></i>
                    User Management
                  </div>
                )}
                <div className="dropdown-item">
                  <i className="fas fa-question-circle"></i>
                  Help
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <i className="fas fa-shield-alt"></i>
        <span>AuthNode 2FA</span>
      </div>
      
      <div ref={userMenuRef} style={{ position: 'relative' }}>
        <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => setShowUserMenu(!showUserMenu)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <div className="user-avatar-large" style={{ position: 'relative' }}>
              <i className="fas fa-user"></i>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '2px solid ' + colors.background
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>{currentUser ? currentUser.name : 'User'}</h4>
              <p style={{ color: colors.secondary, fontSize: '12px', margin: 0 }}>
                {accountCount} accounts
              </p>
            </div>
          </div>
        </div>

        {showUserMenu && (
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '0',
            width: '200px',
            backgroundColor: colors.background,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${colors.border}`,
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div 
              className="category-item"
              onClick={() => {
                onViewChange('profile');
                setShowUserMenu(false);
              }}
              style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}` }}
            >
              <i className="fas fa-user-circle"></i>
              <span>Profile</span>
            </div>
            <div 
              className="category-item"
              onClick={() => {
                onViewChange('system-dashboard', 'activity');
                setShowUserMenu(false);
              }}
              style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}` }}
            >
              <i className="fas fa-chart-line"></i>
              <span>Dashboard</span>
            </div>
            <div 
              className="category-item"
              onClick={() => {
                onViewChange('notifications', 'inbox');
                setShowUserMenu(false);
              }}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <i className="fas fa-bell"></i>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {/* Logout button removed - only one at bottom of sidebar */}
          </div>
        )}
      </div>

      {currentView.main !== 'settings' && currentView.main !== 'dashboard' && currentView.main !== 'notifications' && currentView.main !== 'system-dashboard' && currentView.main !== 'profile' && (
          <div style={{ marginTop: '30px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Navigation
            </h4>
            <div 
              className={`category-item ${currentView.main === 'applications' ? 'active' : ''}`}
              onClick={() => onViewChange('applications')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-mobile-alt"></i>
              <span>Authenticator</span>
            </div>
          </div>
        )}

      {currentView.main === 'dashboard' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="category-item"
                onClick={() => onViewChange('applications')}
                style={{ cursor: 'pointer', backgroundColor: 'transparent', color: colors.secondary }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back to Authenticator</span>
              </div>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Dashboard
            </h4>
            <div 
              className={`category-item ${currentView.sub === 'activity' ? 'active' : ''}`}
              onClick={() => onViewChange('dashboard', 'activity')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-history"></i>
              <span>Activity</span>
            </div>
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => onViewChange('dashboard', 'admin-dashboard')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-chart-bar"></i>
                <span>Admin Dashboard</span>
              </div>
            )}
          </div>
        )}

      {currentView.main === 'notifications' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="category-item"
                onClick={() => onViewChange('applications')}
                style={{ cursor: 'pointer', backgroundColor: 'transparent', color: colors.secondary }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back to Authenticator</span>
              </div>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Notifications
            </h4>
            <div 
              className={`category-item ${currentView.sub === 'inbox' ? 'active' : ''}`}
              onClick={() => onViewChange('notifications', 'inbox')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-inbox"></i>
              <span>Inbox</span>
            </div>
            <div 
              className={`category-item ${currentView.sub === 'preferences' ? 'active' : ''}`}
              onClick={() => onViewChange('notifications', 'preferences')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-sliders-h"></i>
              <span>Preferences</span>
            </div>
          </div>
        )}

      {currentView.main === 'system-dashboard' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="category-item"
                onClick={() => onViewChange('applications')}
                style={{ cursor: 'pointer', backgroundColor: 'transparent', color: colors.secondary }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back to Authenticator</span>
              </div>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              System Dashboard
            </h4>
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => onViewChange('system-dashboard', 'admin-dashboard')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-chart-bar"></i>
                <span>Dashboard</span>
              </div>
            )}
            <div 
              className={`category-item ${currentView.sub === 'activity' ? 'active' : ''}`}
              onClick={() => onViewChange('system-dashboard', 'activity')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-history"></i>
              <span>Activity</span>
            </div>
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'user-management' ? 'active' : ''}`}
                onClick={() => onViewChange('system-dashboard', 'user-management')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-users-cog"></i>
                <span>User Management</span>
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'locked-accounts' ? 'active' : ''}`}
                onClick={() => onViewChange('system-dashboard', 'locked-accounts')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-user-lock"></i>
                <span>Locked Accounts</span>
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'audit-logs' ? 'active' : ''}`}
                onClick={() => onViewChange('system-dashboard', 'audit-logs')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-clipboard-list"></i>
                <span>Audit Logs</span>
              </div>
            )}
            <div 
              className={`category-item ${currentView.main === 'settings' ? 'active' : ''}`}
              onClick={() => onViewChange('settings', 'general')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </div>
          </div>
        )}

      {/* Dynamic content based on current view */}
      {currentView.main === 'applications' && (
          <div style={{ marginTop: '20px' }}>
            <div 
              className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => onCategoryChange('all')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-key"></i>
              <span>All Accounts</span>
            </div>
            <div 
              className={`category-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
              onClick={() => onCategoryChange('favorites')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-star"></i>
              <span>Favorites</span>
            </div>
            <div style={{ padding: '15px 16px 10px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Categories
            </div>
            <div 
              className={`category-item ${selectedCategory === 'Work' ? 'active' : ''}`}
              onClick={() => onCategoryChange('Work')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-briefcase"></i>
              <span>Work</span>
            </div>
            <div 
              className={`category-item ${selectedCategory === 'Personal' ? 'active' : ''}`}
              onClick={() => onCategoryChange('Personal')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-user"></i>
              <span>Personal</span>
            </div>
            <div 
              className={`category-item ${selectedCategory === 'Security' ? 'active' : ''}`}
              onClick={() => onCategoryChange('Security')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-lock"></i>
              <span>Security</span>
            </div>
          </div>
        )}

      {currentView.main === 'settings' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="category-item"
                onClick={() => onViewChange(currentView.previousView?.main || 'applications', currentView.previousView?.sub)}
                style={{ cursor: 'pointer', backgroundColor: 'transparent', color: colors.secondary }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>
                  {currentView.previousView?.main === 'system-dashboard' ? 'Back to System Dashboard' : 'Back to Authenticator'}
                </span>
              </div>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Settings
            </h4>
            <div 
              className={`category-item ${currentView.sub === 'general' ? 'active' : ''}`}
              onClick={() => onViewChange('settings', 'general')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-cog"></i>
              <span>General</span>
            </div>
            <div 
              className={`category-item ${currentView.sub === 'security' ? 'active' : ''}`}
              onClick={() => onViewChange('settings', 'security')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-shield-alt"></i>
              <span>Security</span>
            </div>
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'password-policy' ? 'active' : ''}`}
                onClick={() => onViewChange('settings', 'password-policy')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-key"></i>
                <span>Password Policy</span>
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'smtp' ? 'active' : ''}`}
                onClick={() => onViewChange('settings', 'smtp')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-envelope"></i>
                <span>SMTP</span>
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'oidc' ? 'active' : ''}`}
                onClick={() => onViewChange('settings', 'oidc')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-sign-in-alt"></i>
                <span>OIDC SSO</span>
              </div>
            )}
            <div 
              className={`category-item ${currentView.sub === 'notification-preferences' ? 'active' : ''}`}
              onClick={() => onViewChange('settings', 'notification-preferences')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-bell"></i>
              <span>Notifications</span>
            </div>
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'backups' ? 'active' : ''}`}
                onClick={() => onViewChange('settings', 'backups')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-database"></i>
                <span>Backups</span>
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div 
                className={`category-item ${currentView.sub === 'api-keys' ? 'active' : ''}`}
                onClick={() => onViewChange('settings', 'api-keys')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-code"></i>
                <span>API Keys</span>
              </div>
            )}
            <div 
              className={`category-item ${currentView.sub === 'device-sync' ? 'active' : ''}`}
              onClick={() => onViewChange('settings', 'device-sync')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-sync"></i>
              <span>Device Sync</span>
            </div>

          </div>
        )}

      {currentView.main === 'profile' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
              <div 
                className="category-item"
                onClick={() => onViewChange('applications')}
                style={{ cursor: 'pointer', backgroundColor: 'transparent', color: colors.secondary }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back to Authenticator</span>
              </div>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: colors.secondary, textTransform: 'uppercase' }}>
              Profile
            </h4>
            <div 
              className={`category-item ${currentView.sub === 'general' ? 'active' : ''}`}
              onClick={() => onViewChange('profile', 'general')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-user-circle"></i>
              <span>Profile Info</span>
            </div>
            <div 
              className={`category-item ${currentView.sub === 'security' ? 'active' : ''}`}
              onClick={() => onViewChange('profile', 'security')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-shield-alt"></i>
              <span>Security</span>
            </div>
            <div 
              className={`category-item ${currentView.sub === 'sessions' ? 'active' : ''}`}
              onClick={() => onViewChange('profile', 'sessions')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-laptop"></i>
              <span>Active Sessions</span>
            </div>
            <div 
              className={`category-item ${currentView.sub === 'preferences' ? 'active' : ''}`}
              onClick={() => onViewChange('profile', 'preferences')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-sliders-h"></i>
              <span>Preferences</span>
            </div>
          </div>
        )}

      <div style={{ padding: '20px 16px', marginTop: 'auto' }}>
          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: colors.danger,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.dangerDark}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.danger}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
  );
};

export default MainLayout;
