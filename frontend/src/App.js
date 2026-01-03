import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Auth from './Auth';
import MainLayout from './layouts/MainLayout';
import MobileBottomNav from './components/MobileBottomNav';
import AuthenticatorView from './views/AuthenticatorView';
import SettingsView from './views/SettingsView';
import NotificationsView from './views/NotificationsView';
import SystemDashboardView from './views/SystemDashboardView';
import ProfileView from './views/ProfileView';
import ActivityView from './views/ActivityView';
import AdminDashboard from './views/AdminDashboard';
import SecurityModal from './components/SecurityModal';
import NotificationBell from './components/NotificationBell';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = '';
axios.defaults.headers.common['Content-Type'] = 'application/json';

const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const App = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [codes, setCodes] = useState({});
  const [timers, setTimers] = useState({});
  const [progresses, setProgresses] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ totp_enabled: false });
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentView, setCurrentView] = useState(() => {
    // Restore view from localStorage on mount
    const saved = localStorage.getItem('currentView');
    return saved ? JSON.parse(saved) : { main: 'applications', sub: 'general' };
  });
  const [appSettings, setAppSettings] = useState(() => {
    // Load appSettings from localStorage for unauthenticated users
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back to defaults if parsing fails
      }
    }
    return {
      theme: 'light',
      autoLock: 5,
      codeFormat: 'spaced'
    };
  });

  // Validate token on mount (page refresh)
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !currentUser) {
        try {
          // Verify token is still valid by calling /api/auth/me
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setCurrentUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    if (isAuthenticated && !currentUser) {
      validateToken();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [currentUser, isAuthenticated]);
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Load user-specific settings from database via /api/auth/me endpoint
      if (currentUser.settings) {
        setAppSettings(currentUser.settings);
      }
      // Load global settings to check if 2FA system is enabled
      axios.get('/api/admin/settings')
        .then(res => {
          if (res.data) {
            setGlobalSettings({
              totp_enabled: res.data.totp_enabled || false
            });
          }
        })
        .catch(err => {
          console.log('Global settings not available:', err.message);
        });
    } else {
      // Reset to defaults when not authenticated
      setAppSettings({
        theme: 'light',
        autoLock: 5,
        codeFormat: 'spaced'
      });
      setGlobalSettings({ totp_enabled: false });
    }
  }, [isAuthenticated, currentUser]);

  // Save settings to server when authenticated, otherwise to localStorage as temporary cache
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Don't save to localStorage when authenticated - use database instead
      // localStorage should only cache theme for unauthenticated users
    } else {
      // Only cache default theme in localStorage for unauthenticated users
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
    }
  }, [appSettings, isAuthenticated, currentUser]);

  // Apply theme to document
  useEffect(() => {
    if (appSettings.theme === 'dark') {
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else if (appSettings.theme === 'light') {
      document.documentElement.style.colorScheme = 'light';
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.style.colorScheme = 'light dark';
      document.body.classList.remove('theme-dark', 'theme-light');
    }
  }, [appSettings.theme]);

  // Persist currentView to localStorage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('currentView', JSON.stringify(currentView));
    }
  }, [currentView, isAuthenticated]);

  // Fetch unread notification count
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/notifications/count');
        setUnreadCount(response.data.unread || 0);
      } catch (error) {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    
    // Listen for notification changes to update count immediately
    const handleNotificationsChanged = () => {
      fetchUnreadCount();
    };
    window.addEventListener('notificationsChanged', handleNotificationsChanged);
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsChanged', handleNotificationsChanged);
    };
  }, [isAuthenticated]);

  // Auto-lock functionality
  useEffect(() => {
    if (!isAuthenticated || appSettings.autoLock === 0) return;

    let inactivityTimer;
    const autoLockMinutes = appSettings.autoLock;
    const autoLockMs = autoLockMinutes * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        alert('Session locked due to inactivity');
      }, autoLockMs);
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, appSettings.autoLock]);

  // Fetch real TOTP code from API
  const fetchCode = useCallback(async (appId) => {
    try {
      const response = await axios.get(`/api/applications/${appId}/code`);
      const code = response.data.code;
      // Format code with space in middle if needed
      return code.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
    } catch (error) {
      console.error(`Failed to fetch code for app ${appId}:`, error);
      return '--- ---';
    }
  }, []);

  // Fetch codes for all accounts
  const fetchAllCodes = useCallback(async (appIds) => {
    const newCodes = {};
    await Promise.all(
      appIds.map(async (appId) => {
        newCodes[appId] = await fetchCode(appId);
      })
    );
    return newCodes;
  }, [fetchCode]);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [userResponse, appsResponse] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/applications/')
      ]);
      
      setCurrentUser(userResponse.data);
      setIsAuthenticated(true);
      const applications = appsResponse.data;
      setAccounts(applications.map(app => ({
        id: app.id,
        name: app.name,
        email: '',
        icon: app.icon || 'fab fa-key',
        color: app.color || '#6B46C1',
        category: app.category || 'Personal',
        favorite: app.favorite || false
      })));
      
      // Initialize timers and progresses
      const initialTimers = {};
      const initialProgresses = {};
      
      // Calculate time remaining in current 30-second period
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = 30 - (now % 30);
      
      applications.forEach((app) => {
        initialTimers[app.id] = timeRemaining;
        initialProgresses[app.id] = ((30 - timeRemaining) / 30) * 100;
      });
      
      setTimers(initialTimers);
      setProgresses(initialProgresses);
      
      // Fetch real TOTP codes from API
      if (applications.length > 0) {
        const appIds = applications.map(app => app.id);
        const initialCodes = await fetchAllCodes(appIds);
        setCodes(initialCodes);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [fetchAllCodes]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadUserData]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateTimers = async () => {
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = 30 - (now % 30);
      
      const newTimers = {};
      const newProgresses = {};
      const expiredIds = [];

      Object.keys(timers).forEach(key => {
        const previousTime = timers[key];
        newTimers[key] = timeRemaining;
        newProgresses[key] = ((30 - timeRemaining) / 30) * 100;
        
        // Detect when we've crossed into a new 30-second period
        if (previousTime <= 1 && timeRemaining > 25) {
          expiredIds.push(key);
        }
      });

      setTimers(newTimers);
      setProgresses(newProgresses);
      
      // Fetch new codes for expired timers
      if (expiredIds.length > 0) {
        const newCodes = { ...codes };
        await Promise.all(
          expiredIds.map(async (id) => {
            newCodes[id] = await fetchCode(parseInt(id));
          })
        );
        setCodes(newCodes);
      }
    };

    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [timers, codes, fetchCode]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('appSettings'); // Clear settings so next user doesn't see this user's theme
    localStorage.removeItem('currentView'); // Clear view state
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAccounts([]);
    setCurrentView({ main: 'applications', sub: 'general' });
    // Reset settings to default
    setAppSettings({
      theme: 'light',
      autoLock: 5,
      codeFormat: 'spaced'
    });
  };

  const handleViewChange = (main, sub = 'general') => {
    setCurrentView(prevView => ({ 
      main, 
      sub,
      previousView: prevView.main !== main ? { main: prevView.main, sub: prevView.sub } : prevView.previousView
    }));
  };

  const handleLoginSuccess = useCallback((token) => {
    setIsAuthenticated(true);
  }, []);

  return (
    <div className="App">
      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner">
            <i className="fas fa-shield-alt"></i>
            <div>Loading AuthNode 2FA...</div>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="container">
          <header>
            <div className="logo">
              <i className="fas fa-shield-alt"></i>
              <span>AuthNode 2FA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Notification Bell */}
              <NotificationBell 
                appSettings={appSettings} 
                onClick={() => handleViewChange('settings', 'notifications')}
              />
              <div className="user-profile">
                <div className="user-avatar">{currentUser ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{currentUser ? currentUser.name : 'User'}</div>
                  <div style={{ fontSize: '14px', color: '#718096' }}>Web Authenticator</div>
                </div>
              </div>
            </div>
          </header>

          <div className="app-container">
            {isMobile ? (
              <div className="app-display">
                <MainLayout 
                  currentUser={currentUser}
                  currentView={currentView}
                  onViewChange={handleViewChange}
                  accounts={accounts}
                  onLogout={logout}
                  isMobile={true}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  appSettings={appSettings}
                  onSecurityClick={() => setShowSecurityModal(true)}
                  twoFAEnabled={globalSettings.totp_enabled}
                  unreadCount={unreadCount}
                />
                <div className="app-content">
                  {currentView.main === 'applications' && (
                    <AuthenticatorView
                      accounts={accounts}
                      codes={codes}
                      timers={timers}
                      progresses={progresses}
                      currentUser={currentUser}
                      isMobile={true}
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                      onAccountsChange={setAccounts}
                      onCodesChange={setCodes}
                      onTimersChange={setTimers}
                      onProgressesChange={setProgresses}
                      appSettings={appSettings}
                    />
                  )}
                  {currentView.main === 'settings' && (
                    <SettingsView
                      currentUser={currentUser}
                      isMobile={true}
                      activeTab={currentView.sub}
                      onTabChange={(tab) => handleViewChange('settings', tab)}
                      appSettings={appSettings}
                      onSettingsChange={setAppSettings}
                    />
                  )}
                  {currentView.main === 'notifications' && (
                    <NotificationsView
                      currentUser={currentUser}
                      currentView={currentView}
                      appSettings={appSettings}
                    />
                  )}
                  {currentView.main === 'system-dashboard' && (
                    <SystemDashboardView
                      currentUser={currentUser}
                      currentView={currentView}
                      appSettings={appSettings}
                      onSettingsChange={setAppSettings}
                      accounts={accounts}
                      onSecurityClick={() => setShowSecurityModal(true)}
                      twoFAEnabled={globalSettings.totp_enabled}
                    />
                  )}
                  {currentView.main === 'profile' && (
                    <ProfileView
                      currentUser={currentUser}
                      onUserUpdate={setCurrentUser}
                      appSettings={appSettings}
                      onSettingsChange={setAppSettings}
                      onSecurityClick={() => setShowSecurityModal(true)}
                      twoFAEnabled={globalSettings.totp_enabled}
                      activeTab={currentView.sub || 'general'}
                    />
                  )}
                  {currentView.main === 'dashboard' && currentView.sub === 'activity' && (
                    <ActivityView
                      currentUser={currentUser}
                      appSettings={appSettings}
                      isMobile={true}
                    />
                  )}
                  {currentView.main === 'system-dashboard' && currentView.sub === 'activity' && (
                    <ActivityView
                      currentUser={currentUser}
                      appSettings={appSettings}
                      isMobile={true}
                    />
                  )}
                  {currentView.main === 'dashboard' && currentView.sub === 'admin-dashboard' && (
                    <AdminDashboard
                      currentUser={currentUser}
                      appSettings={appSettings}
                      isMobile={true}
                    />
                  )}
                </div>
                <MobileBottomNav
                  currentView={currentView}
                  onViewChange={handleViewChange}
                  unreadCount={unreadCount}
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onLogout={logout}
                />
              </div>
            ) : (
              <div className="app-display desktop-mode">
                <div className="desktop-view">
                  <MainLayout 
                    currentUser={currentUser}
                    currentView={currentView}
                    onViewChange={handleViewChange}
                    accounts={accounts}
                    onLogout={logout}
                    isMobile={false}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    appSettings={appSettings}
                    onSecurityClick={() => setShowSecurityModal(true)}
                    twoFAEnabled={globalSettings.totp_enabled}
                    unreadCount={unreadCount}
                  />
                  <div className="app-content">
                    {currentView.main === 'applications' && (
                      <AuthenticatorView
                        accounts={accounts}
                        codes={codes}
                        timers={timers}
                        progresses={progresses}
                        currentUser={currentUser}
                        isMobile={false}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        onAccountsChange={setAccounts}
                        onCodesChange={setCodes}
                        onTimersChange={setTimers}
                        onProgressesChange={setProgresses}
                        appSettings={appSettings}
                      />
                    )}
                    {currentView.main === 'settings' && (
                      <SettingsView
                        currentUser={currentUser}
                        isMobile={false}
                        activeTab={currentView.sub}
                        onTabChange={(tab) => handleViewChange('settings', tab)}
                        appSettings={appSettings}
                        onSettingsChange={setAppSettings}
                      />
                    )}
                    {currentView.main === 'notifications' && (
                      <NotificationsView
                        currentUser={currentUser}
                        currentView={currentView}
                        appSettings={appSettings}
                      />
                    )}
                    {currentView.main === 'system-dashboard' && (
                      <SystemDashboardView
                        currentUser={currentUser}
                        currentView={currentView}
                        appSettings={appSettings}
                        onSettingsChange={setAppSettings}
                        accounts={accounts}
                        onSecurityClick={() => setShowSecurityModal(true)}
                        twoFAEnabled={globalSettings.totp_enabled}
                      />
                    )}
                    {currentView.main === 'profile' && (
                      <ProfileView
                        currentUser={currentUser}
                        onUserUpdate={setCurrentUser}
                        appSettings={appSettings}
                        onSettingsChange={setAppSettings}
                        onSecurityClick={() => setShowSecurityModal(true)}
                        twoFAEnabled={globalSettings.totp_enabled}
                        activeTab={currentView.sub || 'general'}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Modal */}
      <SecurityModal 
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        currentUser={currentUser}
        colors={{
          primary: appSettings.theme === 'dark' ? '#e2e8f0' : '#2d3748',
          secondary: appSettings.theme === 'dark' ? '#cbd5e0' : '#718096',
          accent: '#5a67d8',
          success: '#48bb78',
          warning: '#ed8936',
          danger: '#f56565',
          info: '#4299e1',
          background: appSettings.theme === 'dark' ? '#1a202c' : '#ffffff',
          backgroundSecondary: appSettings.theme === 'dark' ? '#2d3748' : '#f7fafc',
          border: appSettings.theme === 'dark' ? '#4a5568' : '#e2e8f0',
          accentLight: appSettings.theme === 'dark' ? 'rgba(90, 103, 216, 0.15)' : 'rgba(90, 103, 216, 0.1)',
          infoLight: appSettings.theme === 'dark' ? 'rgba(66, 153, 225, 0.15)' : 'rgba(66, 153, 225, 0.1)',
          infoBorder: appSettings.theme === 'dark' ? 'rgba(66, 153, 225, 0.3)' : 'rgba(66, 153, 225, 0.2)',
          warningLight: appSettings.theme === 'dark' ? 'rgba(237, 137, 54, 0.15)' : 'rgba(237, 137, 54, 0.1)',
          warningBorder: appSettings.theme === 'dark' ? 'rgba(237, 137, 54, 0.3)' : 'rgba(237, 137, 54, 0.2)'
        }}
        isMobile={isMobile}
      />
    </div>
  );
};

export default App;
