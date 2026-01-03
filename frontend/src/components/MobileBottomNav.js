import React, { useState } from 'react';
import '../App.css';

const MobileBottomNav = ({ currentView, onViewChange, unreadCount, currentUser, appSettings, onLogout }) => {
  const [showOverflow, setShowOverflow] = useState(false);
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
    };
  };

  const colors = getThemeColors();
  const isAdmin = currentUser?.role === 'admin';

  // Define navigation items based on current view
  const getNavItems = () => {
    switch (currentView.main) {
      case 'applications':
        const appNavItems = [
          {
            id: 'all',
            icon: 'fa-key',
            label: 'Codes',
            action: () => onViewChange('applications')
          },
          {
            id: 'profile',
            icon: 'fa-user',
            label: 'Profile',
            action: () => onViewChange('profile', 'general')
          }
        ];

        if (isAdmin) {
          appNavItems.push({
            id: 'dashboard',
            icon: 'fa-chart-line',
            label: 'Dashboard',
            action: () => onViewChange('system-dashboard', 'activity')
          });
        }

        appNavItems.push({
          id: 'logout',
          icon: 'fa-sign-out-alt',
          label: 'Logout',
          action: onLogout,
          isDanger: true
        });

        return appNavItems;

      case 'profile':
        return [
          {
            id: 'general',
            icon: 'fa-user-circle',
            label: 'Info',
            active: currentView.sub === 'general',
            action: () => onViewChange('profile', 'general')
          },
          {
            id: 'security',
            icon: 'fa-shield-alt',
            label: 'Security',
            active: currentView.sub === 'security',
            action: () => onViewChange('profile', 'security')
          },
          {
            id: 'sessions',
            icon: 'fa-laptop',
            label: 'Sessions',
            active: currentView.sub === 'sessions',
            action: () => onViewChange('profile', 'sessions')
          },
          {
            id: 'preferences',
            icon: 'fa-sliders-h',
            label: 'Prefs',
            active: currentView.sub === 'preferences',
            action: () => onViewChange('profile', 'preferences')
          },
          {
            id: 'back',
            icon: 'fa-arrow-left',
            label: 'Back',
            action: () => onViewChange('applications')
          }
        ];

      case 'settings':
        const settingsItems = [
          {
            id: 'general',
            icon: 'fa-cog',
            label: 'General',
            active: currentView.sub === 'general',
            action: () => onViewChange('settings', 'general')
          },
          {
            id: 'security',
            icon: 'fa-shield-alt',
            label: 'Security',
            active: currentView.sub === 'security',
            action: () => onViewChange('settings', 'security')
          },
          {
            id: 'notifications',
            icon: 'fa-bell',
            label: 'Notifs',
            active: currentView.sub === 'notification-preferences',
            action: () => onViewChange('settings', 'notification-preferences')
          },
          {
            id: 'more',
            icon: 'fa-ellipsis-h',
            label: 'More',
            action: () => setShowOverflow(true),
            hasOverflow: true
          },
          {
            id: 'back',
            icon: 'fa-arrow-left',
            label: 'Back',
            action: () => onViewChange('applications')
          }
        ];

        return settingsItems;

      case 'system-dashboard':
        const dashboardItems = [];
        
        if (isAdmin) {
          dashboardItems.push({
            id: 'admin-dashboard',
            icon: 'fa-chart-bar',
            label: 'Dashboard',
            active: currentView.sub === 'admin-dashboard',
            action: () => onViewChange('system-dashboard', 'admin-dashboard')
          });
        }

        dashboardItems.push(
          {
            id: 'activity',
            icon: 'fa-history',
            label: 'Activity',
            active: currentView.sub === 'activity',
            action: () => onViewChange('system-dashboard', 'activity')
          }
        );

        if (isAdmin) {
          dashboardItems.push({
            id: 'user-management',
            icon: 'fa-users-cog',
            label: 'Users',
            active: currentView.sub === 'user-management',
            action: () => onViewChange('system-dashboard', 'user-management')
          });

          dashboardItems.push({
            id: 'more',
            icon: 'fa-ellipsis-h',
            label: 'More',
            action: () => setShowOverflow(true),
            hasOverflow: true
          });
        }

        dashboardItems.push({
          id: 'back',
          icon: 'fa-arrow-left',
          label: 'Back',
          action: () => onViewChange('applications')
        });

        return dashboardItems;

      case 'notifications':
        return [
          {
            id: 'inbox',
            icon: 'fa-inbox',
            label: 'Inbox',
            active: currentView.sub === 'inbox',
            action: () => onViewChange('notifications', 'inbox'),
            badgeCount: unreadCount > 0 ? unreadCount : null
          },
          {
            id: 'preferences',
            icon: 'fa-sliders-h',
            label: 'Prefs',
            active: currentView.sub === 'preferences',
            action: () => onViewChange('notifications', 'preferences')
          },
          {
            id: 'back',
            icon: 'fa-arrow-left',
            label: 'Back',
            action: () => onViewChange('applications')
          }
        ];

      default:
        return [
          {
            id: 'applications',
            icon: 'fa-key',
            label: 'Codes',
            action: () => onViewChange('applications')
          },
          {
            id: 'profile',
            icon: 'fa-user',
            label: 'Profile',
            action: () => onViewChange('profile', 'general')
          },
          {
            id: 'logout',
            icon: 'fa-sign-out-alt',
            label: 'Logout',
            action: onLogout,
            isDanger: true
          }
        ];
    }
  };

  const navItems = getNavItems();

  // Get overflow menu items based on current view
  const getOverflowItems = () => {
    switch (currentView.main) {
      case 'settings':
        const settingsOverflow = [];
        
        if (isAdmin) {
          settingsOverflow.push(
            {
              id: 'password-policy',
              icon: 'fa-key',
              label: 'Password Policy',
              action: () => {
                onViewChange('settings', 'password-policy');
                setShowOverflow(false);
              }
            },
            {
              id: 'smtp',
              icon: 'fa-envelope',
              label: 'SMTP',
              action: () => {
                onViewChange('settings', 'smtp');
                setShowOverflow(false);
              }
            },
            {
              id: 'oidc',
              icon: 'fa-sign-in-alt',
              label: 'OIDC SSO',
              action: () => {
                onViewChange('settings', 'oidc');
                setShowOverflow(false);
              }
            },
            {
              id: 'backups',
              icon: 'fa-database',
              label: 'Backups',
              action: () => {
                onViewChange('settings', 'backups');
                setShowOverflow(false);
              }
            },
            {
              id: 'api-keys',
              icon: 'fa-code',
              label: 'API Keys',
              action: () => {
                onViewChange('settings', 'api-keys');
                setShowOverflow(false);
              }
            }
          );
        }

        settingsOverflow.push({
          id: 'device-sync',
          icon: 'fa-sync',
          label: 'Device Sync',
          action: () => {
            onViewChange('settings', 'device-sync');
            setShowOverflow(false);
          }
        });

        return settingsOverflow;

      case 'system-dashboard':
        if (isAdmin) {
          return [
            {
              id: 'locked-accounts',
              icon: 'fa-user-lock',
              label: 'Locked Accounts',
              action: () => {
                onViewChange('system-dashboard', 'locked-accounts');
                setShowOverflow(false);
              }
            },
            {
              id: 'audit-logs',
              icon: 'fa-clipboard-list',
              label: 'Audit Logs',
              action: () => {
                onViewChange('system-dashboard', 'audit-logs');
                setShowOverflow(false);
              }
            }
          ];
        }
        return [];

      default:
        return [];
    }
  };

  const overflowItems = getOverflowItems();

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      backgroundColor: colors.background,
      borderTop: `1px solid ${colors.border}`,
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
    }}>
      {navItems.map(item => {
        const isActive = item.active || false;
        
        return (
          <div
            key={item.id}
            onClick={item.action}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              position: 'relative',
              flex: 1,
              maxWidth: '80px',
              color: item.isDanger ? colors.danger : (isActive ? colors.accent : colors.secondary)
            }}
          >
            <div style={{ position: 'relative' }}>
              <i 
                className={`fas ${item.icon}`}
                style={{
                  fontSize: '20px',
                  transition: 'transform 0.2s ease',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)'
                }}
              ></i>
              
              {item.badgeCount && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  minWidth: '18px',
                  textAlign: 'center',
                  border: `2px solid ${colors.background}`
                }}>
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </div>
              )}
            </div>
            
            <span style={{
              fontSize: '11px',
              fontWeight: isActive ? '600' : '500',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {item.label}
            </span>
            
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '30px',
                height: '3px',
                backgroundColor: colors.accent,
                borderRadius: '3px 3px 0 0'
              }}></div>
            )}
          </div>
        );
      })}

      {/* Overflow Menu Modal */}
      {showOverflow && overflowItems.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowOverflow(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998
            }}
          />
          
          {/* Overflow Menu */}
          <div
            style={{
              position: 'fixed',
              bottom: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: colors.background,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              minWidth: '280px',
              maxWidth: '90%',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}
          >
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.primary
              }}>
                More Options
              </span>
              <i
                className="fas fa-times"
                onClick={() => setShowOverflow(false)}
                style={{
                  fontSize: '18px',
                  color: colors.secondary,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              />
            </div>
            
            {overflowItems.map((item, index) => (
              <div
                key={item.id}
                onClick={item.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: index < overflowItems.length - 1 ? `1px solid ${colors.border}` : 'none',
                  transition: 'background-color 0.2s ease',
                  color: colors.primary
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.backgroundLight}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <i className={`fas ${item.icon}`} style={{ fontSize: '18px', width: '20px', color: colors.accent }} />
                <span style={{ fontSize: '15px', fontWeight: '500' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MobileBottomNav;
