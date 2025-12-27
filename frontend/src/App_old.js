import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './Auth';
import UserManagement from './UserManagement';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const App = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [codes, setCodes] = useState({});
  const [timers, setTimers] = useState({});
  const [progresses, setProgresses] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [setupMethod, setSetupMethod] = useState('scan'); // 'scan' or 'manual'
  const [accountNamePreview, setAccountNamePreview] = useState('');
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Filter accounts based on selected category
  const filteredAccounts = accounts.filter(account => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return account.favorite;
    return account.category === selectedCategory;
  });

  // Generate random 6-digit codes
  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
  };

  // Automatic icon detection function
  const getIconForService = (serviceName, qrData = null, manualSecret = null) => {
    // Clean and normalize the service name
    const cleanName = serviceName.toLowerCase().trim();
    
    // Common service mappings (same as backend)
    const icon_map = {
      // Tech companies
      'google': 'fab fa-google',
      'microsoft': 'fab fa-microsoft',
      'apple': 'fab fa-apple',
      'amazon': 'fab fa-amazon',
      'facebook': 'fab fa-facebook',
      'twitter': 'fab fa-twitter',
      'instagram': 'fab fa-instagram',
      'linkedin': 'fab fa-linkedin',
      'github': 'fab fa-github',
      'gitlab': 'fab fa-gitlab',
      'bitbucket': 'fab fa-bitbucket',
      'slack': 'fab fa-slack',
      'discord': 'fab fa-discord',
      'zoom': 'fas fa-video',
      'teams': 'fab fa-microsoft',
      'skype': 'fab fa-skype',
      
      // Email services
      'gmail': 'fab fa-google',
      'outlook': 'fab fa-microsoft',
      'yahoo': 'fab fa-yahoo',
      'protonmail': 'fas fa-shield-alt',
      
      // Cloud services
      'aws': 'fab fa-aws',
      'azure': 'fab fa-microsoft',
      'digitalocean': 'fab fa-digital-ocean',
      'heroku': 'fab fa-heroku',
      'netlify': 'fas fa-globe',
      'vercel': 'fas fa-rocket',
      
      // Remote access
      'rustdesk': 'fas fa-desktop',
      'teamviewer': 'fas fa-tv',
      'anydesk': 'fas fa-desktop',
      'chrome remote desktop': 'fab fa-chrome',
      
      // Password managers
      'lastpass': 'fas fa-key',
      'bitwarden': 'fas fa-shield-alt',
      '1password': 'fas fa-key',
      'keepass': 'fas fa-key',
      
      // Banking/Finance
      'paypal': 'fab fa-paypal',
      'stripe': 'fab fa-stripe-s',
      'coinbase': 'fab fa-bitcoin',
      
      // Communication
      'telegram': 'fab fa-telegram',
      'whatsapp': 'fab fa-whatsapp',
      'signal': 'fas fa-comment',
      
      // Development
      'jetbrains': 'fas fa-code',
      'visual studio': 'fab fa-microsoft',
      'vscode': 'fas fa-code',
      
      // Self-hosted services
      'nextcloud': 'fas fa-cloud',
      'owncloud': 'fas fa-cloud',
      'pi-hole': 'fas fa-shield-alt',
      'home assistant': 'fas fa-home',
      'plex': 'fas fa-play',
      'jellyfin': 'fas fa-play',
      'emby': 'fas fa-play',
      
      // Generic fallbacks
      'auth': 'fas fa-key',
      'login': 'fas fa-sign-in-alt',
      'account': 'fas fa-user',
      'security': 'fas fa-shield-alt',
      '2fa': 'fas fa-key',
      'totp': 'fas fa-clock',
    };
    
    // Check for exact matches first
    if (cleanName in icon_map) {
      return icon_map[cleanName];
    }
    
    // Check for partial matches
    for (const key in icon_map) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return icon_map[key];
      }
    }
    
    // Default fallback
    return 'fab fa-key';
  };

  const getColorForService = (serviceName) => {
    // Clean and normalize the service name
    const cleanName = serviceName.toLowerCase().trim();
    
    // Common service color mappings
    const color_map = {
      // Tech companies
      'google': '#4285F4',
      'microsoft': '#00BCF2',
      'apple': '#000000',
      'amazon': '#FF9900',
      'facebook': '#1877F2',
      'twitter': '#1DA1F2',
      'instagram': '#E4405F',
      'linkedin': '#0077B5',
      'github': '#181717',
      'gitlab': '#FC6D26',
      'bitbucket': '#0052CC',
      'slack': '#4A154B',
      'discord': '#5865F2',
      'zoom': '#2D8CFF',
      'teams': '#6264A7',
      'skype': '#00AFF0',
      
      // Email services
      'gmail': '#EA4335',
      'outlook': '#0078D4',
      'yahoo': '#5F01D1',
      'protonmail': '#6D4AFF',
      
      // Cloud services
      'aws': '#FF9900',
      'azure': '#0078D4',
      'digitalocean': '#0080FF',
      'heroku': '#430098',
      'netlify': '#00C46A',
      'vercel': '#000000',
      
      // Remote access
      'rustdesk': '#1E90FF',
      'teamviewer': '#0E70F5',
      'anydesk': '#EF443B',
      'chrome remote desktop': '#4285F4',
      
      // Password managers
      'lastpass': '#D32F2F',
      'bitwarden': '#175DDC',
      '1password': '#0094F5',
      'keepass': '#4CAF50',
      
      // Banking/Finance
      'paypal': '#003087',
      'stripe': '#635BFF',
      'coinbase': '#0052FF',
      
      // Communication
      'telegram': '#0088CC',
      'whatsapp': '#25D366',
      'signal': '#3A76F0',
      
      // Development
      'jetbrains': '#000000',
      'visual studio': '#5C2D91',
      'vscode': '#007ACC',
      
      // Self-hosted services
      'nextcloud': '#0082C9',
      'owncloud': '#041E42',
      'pi-hole': '#96060C',
      'home assistant': '#18BCF2',
      'plex': '#E5A00D',
      'jellyfin': '#AA5CC3',
      'emby': '#52B54B',
      
      // Generic fallbacks
      'auth': '#6B46C1',
      'login': '#6B46C1',
      'account': '#6B46C1',
      'security': '#6B46C1',
      '2fa': '#6B46C1',
      'totp': '#6B46C1',
    };
    
    // Check for exact matches first
    if (cleanName in color_map) {
      return color_map[cleanName];
    }
    
    // Check for partial matches
    for (const key in color_map) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return color_map[key];
      }
    }
    
    // Default fallback
    return '#6B46C1';
  };

  // API Functions
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setIsAuthenticated(true);
      await loadUserData();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const signup = async (email, password, username, name) => {
    try {
      const response = await axios.post('/api/auth/signup', { email, password, username, name });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setIsAuthenticated(true);
      await loadUserData();
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAccounts([]);
    setCodes({});
    setTimers({});
    setProgresses({});
  };

  const handleUserManagementClick = () => {
    setShowUserManagement(true);
    setShowDropdown(false);
  };

  const loadUserData = async () => {
    try {
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
        email: '', // Backend doesn't store email, just name
        icon: app.icon || 'fab fa-key',
        color: app.color || '#6B46C1', // Use color from backend or default
        category: app.category || 'Personal',
        favorite: app.favorite || false
      })));
      
      // Initialize codes and timers for API accounts
      const initialCodes = {};
      const initialTimers = {};
      const initialProgresses = {};
      
      applications.forEach((app, index) => {
        initialCodes[app.id] = generateCode();
        initialTimers[app.id] = (index * 5) % 30; // Stagger timers
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
  };

  // Initialize app and check authentication
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize codes and timers for API accounts
  useEffect(() => {
    if (accounts.length > 0 && Object.keys(codes).length === 0) {
      const initialCodes = {};
      const initialTimers = {};
      const initialProgresses = {};
      
      accounts.forEach((account, index) => {
        initialCodes[account.id] = generateCode();
        initialTimers[account.id] = (index * 5) % 30; // Stagger timers
        initialProgresses[account.id] = ((30 - ((index * 5) % 30)) / 30) * 100;
      });
      
      setCodes(initialCodes);
      setTimers(initialTimers);
      setProgresses(initialProgresses);
    }
  }, [accounts]);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update timers and progress bars
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
  }, [timers, progresses, codes]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
        setSelectedAccount(null);
      }
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && selectedAccount && showModal) {
      // Use setTimeout to ensure the form is rendered
      setTimeout(() => {
        const form = document.querySelector('.modal form');
        if (form) {
          form.accountName.value = selectedAccount.name;
          form.accountUsername.value = selectedAccount.email;
          form.accountCategory.value = selectedAccount.category || 'Personal';
          form.accountFavorite.checked = selectedAccount.favorite || false;
        }
      }, 100);
    }
  }, [isEditMode, selectedAccount, showModal]);

  const handleContextMenu = (e, account) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    setContextMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    setSelectedAccount(account);
    setShowContextMenu(true);
  };

  const handleAddAccountClick = () => {
    setIsEditMode(false);
    setSelectedAccount(null);
    setSetupMethod('scan'); // Reset to default setup method
    setShowModal(true);
  };

  const handleEditAccount = () => {
    setIsEditMode(true);
    setSetupMethod('manual'); // Switch to manual for editing
    setShowModal(true);
    setShowContextMenu(false);
  };

  const handleToggleFavorite = async () => {
    try {
      const newFavoriteStatus = !selectedAccount.favorite;
      await axios.put(`/api/applications/${selectedAccount.id}`, {
        name: selectedAccount.name,
        icon: selectedAccount.icon,
        color: selectedAccount.color,
        category: selectedAccount.category,
        favorite: newFavoriteStatus
      });
      
      // Update local state
      setAccounts(prevAccounts => 
        prevAccounts.map(acc => 
          acc.id === selectedAccount.id 
            ? { ...acc, favorite: newFavoriteStatus }
            : acc
        )
      );
      
      setShowContextMenu(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorite status. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm(`Are you sure you want to delete the account "${selectedAccount.name}"?`)) {
      try {
        await axios.delete(`/api/applications/${selectedAccount.id}`);
        
        // Remove account from list
        setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== selectedAccount.id));
        
        // Clean up associated data
        const newCodes = { ...codes };
        const newTimers = { ...timers };
        const newProgresses = { ...progresses };
        
        delete newCodes[selectedAccount.id];
        delete newTimers[selectedAccount.id];
        delete newProgresses[selectedAccount.id];
        
        setCodes(newCodes);
        setTimers(newTimers);
        setProgresses(newProgresses);
        
        setShowContextMenu(false);
        setSelectedAccount(null);
      } catch (error) {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      }
    } else {
      setShowContextMenu(false);
      setSelectedAccount(null);
    }
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setSelectedAccount(null);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const accountName = e.target.accountName.value;
    const accountEmail = e.target.accountUsername?.value || '';
    const accountCategory = e.target.accountCategory?.value || 'Personal';
    const accountFavorite = e.target.accountFavorite?.checked || false;
    const accountColor = getColorForService(accountName); // Detect color based on service name
    
    if (accountName.trim() === '') {
      alert('Please enter an account name');
      return;
    }

    try {
      if (isEditMode && selectedAccount) {
        // Update existing account via API
        await axios.put(`/api/applications/${selectedAccount.id}`, {
          name: accountName,
          icon: selectedAccount.icon,
          category: accountCategory,
          favorite: accountFavorite
        });
        
        // Update local state
        setAccounts(prevAccounts => 
          prevAccounts.map(acc => 
            acc.id === selectedAccount.id 
              ? { ...acc, name: accountName, email: accountEmail, category: accountCategory, favorite: accountFavorite }
              : acc
          )
        );
        setIsEditMode(false);
        setSelectedAccount(null);
      } else {
        let newAccount;

        if (setupMethod === 'scan') {
          // Handle QR code upload
          const qrFile = e.target.qrFile?.files[0];
          if (!qrFile) {
            alert('Please select a QR code image to upload');
            return;
          }

          const formData = new FormData();
          formData.append('file', qrFile);
          formData.append('name', accountName);

          const response = await axios.post('/api/applications/upload-qr', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          newAccount = response.data;
        } else {
          // Handle manual entry
          const manualSecret = e.target.manualSecret?.value;
          if (!manualSecret || manualSecret.trim() === '') {
            alert('Please enter a secret key');
            return;
          }

          const response = await axios.post('/api/applications/', {
            name: accountName,
            secret: manualSecret.toUpperCase().replace(/\s/g, ''), // Clean up the secret
            backup_key: 'BACKUP123',
            category: accountCategory,
            favorite: accountFavorite,
            color: accountColor
          });
          newAccount = response.data;
        }
        
        // Add to local state
        setAccounts(prevAccounts => [...prevAccounts, {
          id: newAccount.id,
          name: newAccount.name,
          email: accountEmail,
          icon: newAccount.icon || 'fab fa-key',
          color: accountColor,
          category: newAccount.category || accountCategory,
          favorite: newAccount.favorite || accountFavorite
        }]);

        // Initialize code, timer, and progress for new account
        const newCodes = { ...codes, [newAccount.id]: generateCode() };
        const newTimers = { ...timers, [newAccount.id]: 30 };
        const newProgresses = { ...progresses, [newAccount.id]: 100 };

        setCodes(newCodes);
        setTimers(newTimers);
        setProgresses(newProgresses);
      }

      setShowModal(false);
      e.target.reset();
      setAccountNamePreview(''); // Reset preview
    } catch (error) {
      console.error('Failed to save account:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save account. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <div className="App">
      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner">
            <i className="fas fa-shield-alt"></i>
            <div>Loading SecureAuth...</div>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <Auth onLoginSuccess={loadUserData} />
      ) : (
        <div className="container">
        <header>
          <div className="logo">
            <i className="fas fa-shield-alt"></i>
            <span>SecureAuth</span>
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
            // Mobile View
            <div className="app-display">
              <div className="mobile-view">
                <div className="mobile-header">
                  <div className="mobile-logo">
                    <i className="fas fa-shield-alt"></i>
                    <span>SecureAuth</span>
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
                        <div className="dropdown-item">
                          <i className="fas fa-cog"></i>
                          Settings
                        </div>
                        {currentUser && currentUser.role === 'admin' && (
                          <div className="dropdown-item" onClick={handleUserManagementClick} style={{ cursor: 'pointer' }}>
                            <i className="fas fa-users-cog"></i>
                            User Management
                          </div>
                        )}
                        <div className="dropdown-item">
                          <i className="fas fa-question-circle"></i>
                          Help
                        </div>
                        <div className="dropdown-item logout" onClick={logout}>
                          <i className="fas fa-sign-out-alt"></i>
                          Logout
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="app-content">
                  <div className="accounts-list">
                    {filteredAccounts.map(account => (
                      <div key={account.id} className="account-item">
                        <div 
                          className="account-icon" 
                          style={{ backgroundColor: account.color }}
                        >
                          <i className={account.icon}></i>
                        </div>
                        <div className="account-details">
                          <div className="account-name">{account.name}</div>
                          <div className="account-email">{account.email}</div>
                        </div>
                        <div className="account-code">
                          <div className="code-value">{codes[account.id]}</div>
                          <div className="code-timer">
                            Expires in <span>{timers[account.id]}</span>s
                          </div>
                          <div className="timer-bar">
                            <div 
                              className="timer-progress"
                              style={{ width: `${progresses[account.id]}%` }}
                            ></div>
                          </div>
                        </div>
                        <button 
                          className="menu-btn"
                          onClick={(e) => handleContextMenu(e, account)}
                        >
                          <i className="fas fa-ellipsis-v"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bottom-nav">
                    <div className="nav-item active">
                      <i className="fas fa-key"></i>
                      <span>Codes</span>
                    </div>
                    <div className="nav-item" onClick={handleAddAccountClick}>
                      <i className="fas fa-plus-circle"></i>
                      <span>Add</span>
                    </div>
                    <div className="nav-item">
                      <i className="fas fa-cog"></i>
                      <span>Settings</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Desktop View
            <div className="app-display desktop-mode">
              <div className="desktop-view">
                <div className="desktop-layout">
                  <div className="sidebar">
                    <div className="sidebar-header">
                      <i className="fas fa-shield-alt"></i>
                      <span>SecureAuth</span>
                    </div>
                    
                    <div className="user-info">
                      <div className="user-avatar-large">
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <h4>{currentUser ? currentUser.name : 'User'}</h4>
                        <p style={{ color: '#718096', fontSize: '14px' }}>
                          {accounts.length} accounts
                        </p>
                      </div>
                    </div>

                    <div className="search-box">
                      <i className="fas fa-search" style={{ color: '#718096' }}></i>
                      <input type="text" placeholder="Search accounts..." />
                    </div>

                    <div className="category-list">
                      <div 
                        className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                      >
                        <i className="fas fa-key"></i>
                        <span>All Accounts</span>
                      </div>
                      <div 
                        className={`category-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('favorites')}
                      >
                        <i className="fas fa-star"></i>
                        <span>Favorites</span>
                      </div>
                      <div 
                        className={`category-item ${selectedCategory === 'Work' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('Work')}
                      >
                        <i className="fas fa-briefcase"></i>
                        <span>Work</span>
                      </div>
                      <div 
                        className={`category-item ${selectedCategory === 'Personal' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('Personal')}
                      >
                        <i className="fas fa-home"></i>
                        <span>Personal</span>
                      </div>
                      <div 
                        className={`category-item ${selectedCategory === 'Security' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('Security')}
                      >
                        <i className="fas fa-shield-alt"></i>
                        <span>Security</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      {currentUser && currentUser.role === 'admin' && (
                        <div className="category-item" onClick={handleUserManagementClick} style={{ cursor: 'pointer' }}>
                          <i className="fas fa-users-cog"></i>
                          <span>User Management</span>
                        </div>
                      )}
                      <div className="category-item">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <span>Backup & Sync</span>
                      </div>
                      <div className="category-item">
                        <i className="fas fa-cog"></i>
                        <span>Settings</span>
                      </div>
                      <div className="category-item logout-nav" onClick={logout}>
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                      </div>
                    </div>
                  </div>

                  <div className="main-content">
                    <div className="content-header">
                      <h2 className="section-title">Authentication Codes</h2>
                      <button 
                        className="btn"
                        style={{ width: 'auto', padding: '10px 20px' }}
                        onClick={handleAddAccountClick}
                      >
                        <i className="fas fa-plus"></i> Add Account
                      </button>
                    </div>

                    <div className="grid-view">
                      {filteredAccounts.slice(0, 4).map(account => (
                        <div key={account.id} className="account-card">
                          <div className="card-header">
                            <div 
                              className="account-icon"
                              style={{
                                backgroundColor: account.color,
                                width: '40px',
                                height: '40px'
                              }}
                            >
                              <i className={account.icon}></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{account.name}</div>
                              <div style={{ fontSize: '14px', color: '#718096' }}>
                                {account.email}
                              </div>
                            </div>
                            <button 
                              className="menu-btn card-menu-btn"
                              onClick={(e) => handleContextMenu(e, account)}
                            >
                              <i className="fas fa-ellipsis-v"></i>
                            </button>
                          </div>
                          <div className="card-code">{codes[account.id]}</div>
                          <div className="card-timer">
                            <span style={{ color: '#718096' }}>
                              Expires in <span>{timers[account.id]}</span>s
                            </span>
                            <div style={{
                              width: '100px',
                              height: '6px',
                              backgroundColor: '#e0e6ed',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                backgroundColor: '#4361ee',
                                width: `${progresses[account.id]}%`
                              }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Account Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{isEditMode ? 'Edit Account' : 'Add New Account'}</h2>
                <button 
                  className="modal-close"
                  onClick={() => {
                    setShowModal(false);
                    setIsEditMode(false);
                    setSelectedAccount(null);
                    setSetupMethod('scan'); // Reset setup method
                    setAccountNamePreview(''); // Reset preview
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleAddAccount}>
                  <div className="form-group">
                    <label htmlFor="accountName">Account Name</label>
                    <input 
                      type="text" 
                      id="accountName" 
                      className="form-control" 
                      placeholder="e.g., Google, Facebook, etc."
                      name="accountName"
                      onChange={(e) => setAccountNamePreview(e.target.value)}
                    />
                    {accountNamePreview && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Icon preview:</span>
                        <div 
                          style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '4px', 
                            backgroundColor: getColorForService(accountNamePreview),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className={getIconForService(accountNamePreview)} style={{ fontSize: '14px', color: 'white' }}></i>
                        </div>
                        <span style={{ fontSize: '14px', color: '#666' }}>{getIconForService(accountNamePreview)}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="accountUsername">Username/Email (Optional)</label>
                    <input 
                      type="text" 
                      id="accountUsername" 
                      className="form-control" 
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="accountCategory">Category</label>
                    <select 
                      id="accountCategory" 
                      className="form-control" 
                      name="accountCategory"
                      defaultValue="Personal"
                    >
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="accountFavorite" 
                        name="accountFavorite"
                        style={{ margin: 0 }}
                      />
                      <span>Add to Favorites</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Setup Method</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        className={`btn ${setupMethod === 'scan' ? 'btn-primary' : 'btn-secondary'}`} 
                        style={{ flex: 1 }} 
                        type="button"
                        onClick={() => setSetupMethod('scan')}
                      >
                        <i className="fas fa-qrcode"></i> Scan QR Code
                      </button>
                      <button 
                        className={`btn ${setupMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
                        style={{ flex: 1 }} 
                        type="button"
                        onClick={() => setSetupMethod('manual')}
                      >
                        <i className="fas fa-keyboard"></i> Manual Entry
                      </button>
                    </div>
                  </div>

                  {setupMethod === 'scan' && (
                    <div className="form-group">
                      <label htmlFor="qrFile">Upload QR Code Image</label>
                      <input 
                        type="file" 
                        id="qrFile" 
                        className="form-control" 
                        accept="image/*"
                        name="qrFile"
                      />
                      <small style={{ color: '#718096', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                        Upload a screenshot or photo of the QR code from your service
                      </small>
                    </div>
                  )}

                  {setupMethod === 'manual' && (
                    <div className="form-group">
                      <label htmlFor="manualSecret">Secret Key</label>
                      <input 
                        type="text" 
                        id="manualSecret" 
                        className="form-control" 
                        placeholder="Enter your 2FA secret key (e.g., JBSWY3DPEHPK3PXP)"
                        name="manualSecret"
                      />
                      <small style={{ color: '#718096', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                        The secret key is usually found in the advanced settings of your 2FA setup
                      </small>
                    </div>
                  )}

                  <div className="btn-group">
                    <button 
                      type="button"
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowModal(false);
                        setSetupMethod('scan'); // Reset setup method
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn">
                      {isEditMode ? 'Update Account' : 'Add Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* User Management Modal */}
        {showUserManagement && currentUser && currentUser.role === 'admin' && (
          <UserManagement 
            currentUser={currentUser}
            onClose={() => setShowUserManagement(false)}
          />
        )}

        {/* Context Menu */}
        {showContextMenu && selectedAccount && (
          <div 
            className="context-menu-overlay"
            onClick={handleCloseContextMenu}
          >
            <div 
              className="context-menu"
              style={{
                position: 'fixed',
                left: `${contextMenuPosition.x}px`,
                top: `${contextMenuPosition.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="context-menu-item" onClick={handleEditAccount}>
                <i className="fas fa-edit"></i>
                <span>Edit</span>
              </div>
              <div className="context-menu-item" onClick={handleToggleFavorite}>
                <i className={`fas fa-star ${selectedAccount?.favorite ? 'text-warning' : ''}`}></i>
                <span>{selectedAccount?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </div>
              <div className="context-menu-item delete" onClick={handleDeleteAccount}>
                <i className="fas fa-trash"></i>
                <span>Delete</span>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default App;

