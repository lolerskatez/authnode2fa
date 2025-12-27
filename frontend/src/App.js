import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Auth from './Auth';
import MainLayout from './layouts/MainLayout';
import AuthenticatorView from './views/AuthenticatorView';
import SettingsView from './views/SettingsView';
import ProfileView from './views/ProfileView';
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
  const [currentView, setCurrentView] = useState({ main: 'applications', sub: 'general' });
  const [appSettings, setAppSettings] = useState({
    theme: 'light',
    autoLock: 5,
    codeFormat: 'spaced'
  });

  // Load settings from server after authentication or reset to defaults when logged out
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Load user-specific settings from database via /api/auth/me endpoint
      if (currentUser.settings) {
        setAppSettings(currentUser.settings);
      }
    } else {
      // Reset to defaults when not authenticated
      setAppSettings({
        theme: 'light',
        autoLock: 5,
        codeFormat: 'spaced'
      });
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

  const generateCode = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
  }, []);

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
      
      // Initialize codes and timers
      const initialCodes = {};
      const initialTimers = {};
      const initialProgresses = {};
      
      applications.forEach((app, index) => {
        initialCodes[app.id] = generateCode();
        initialTimers[app.id] = (index * 5) % 30;
        initialProgresses[app.id] = ((30 - ((index * 5) % 30)) / 30) * 100;
      });
      
      setCodes(initialCodes);
      setTimers(initialTimers);
      setProgresses(initialProgresses);
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [generateCode]);

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
    const updateTimers = () => {
      const newTimers = { ...timers };
      const newProgresses = { ...progresses };
      const newCodes = { ...codes };
      let updated = false;

      Object.keys(newTimers).forEach(key => {
        newTimers[key] -= 1;
        if (newTimers[key] <= 0) {
          newTimers[key] = 30;
          newCodes[key] = generateCode();
          updated = true;
        }
        newProgresses[key] = ((30 - newTimers[key]) / 30) * 100;
      });

      setTimers(newTimers);
      setProgresses(newProgresses);
      if (updated) {
        setCodes(newCodes);
      }
    };

    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [timers, progresses, codes, generateCode]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('appSettings'); // Clear settings so next user doesn't see this user's theme
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
    setCurrentView({ main, sub });
  };

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
        <Auth onLoginSuccess={loadUserData} />
      ) : (
        <div className="container">
          <header>
            <div className="logo">
              <i className="fas fa-shield-alt"></i>
              <span>AuthNode 2FA</span>
            </div>
            <div className="user-profile">
              <div className="user-avatar">{currentUser ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{currentUser ? currentUser.name : 'User'}</div>
                <div style={{ fontSize: '14px', color: '#718096' }}>Web Authenticator</div>
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
                  {currentView.main === 'profile' && (
                    <ProfileView
                      currentUser={currentUser}
                      onUserUpdate={setCurrentUser}
                      appSettings={appSettings}
                    />
                  )}
                </div>
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
                    {currentView.main === 'profile' && (
                      <ProfileView
                        currentUser={currentUser}
                        onUserUpdate={setCurrentUser}
                        appSettings={appSettings}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
