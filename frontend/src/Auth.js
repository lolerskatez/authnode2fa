import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Auth.css';

function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [oidcConfig, setOidcConfig] = useState(null);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [loginPageTheme, setLoginPageTheme] = useState('light');
  const [oidcCallbackProcessed, setOidcCallbackProcessed] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [enrollmentStep, setEnrollmentStep] = useState('qr'); // 'qr' or 'verify'
  const [enrollmentQRCode, setEnrollmentQRCode] = useState('');
  const [enrollmentSecret, setEnrollmentSecret] = useState('');
  const [enrollmentBackupCodes, setEnrollmentBackupCodes] = useState([]);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  const handleOidcCallback = useCallback(async (code, state) => {
    // Prevent double processing (React StrictMode calls useEffect twice)
    if (oidcCallbackProcessed) return;
    setOidcCallbackProcessed(true);
    
    // Clear URL parameters immediately to prevent re-processing
    window.history.replaceState({}, document.title, window.location.pathname);
    
    try {
      setSsoLoading(true);
      setError('');

      const res = await axios.get('/api/auth/oidc/callback', {
        params: { code, state }
      });
      const token = res.data.access_token;

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      onLoginSuccess(token);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'SSO authentication failed. Please try again.';
      setError(errorMsg);
      console.error('OIDC callback error:', err);
    } finally {
      setSsoLoading(false);
    }
  }, [onLoginSuccess, oidcCallbackProcessed]);

  useEffect(() => {
    // Load login page theme from server
    const loadLoginPageTheme = async () => {
      try {
        const res = await axios.get('/api/auth/login-page-theme');
        applyTheme(res.data.theme);
        setLoginPageTheme(res.data.theme);
      } catch (err) {
        // Default to light if error
        applyTheme('light');
        setLoginPageTheme('light');
      }
    };

    loadLoginPageTheme();

    // Check if there are any users in the database
    const checkUsers = async () => {
      try {
        const res = await axios.get('/api/auth/check-users');
        if (!res.data.has_users) {
          setIsInitialSetup(true);
          setMode('signup');
        }
      } catch (err) {
        // If error, assume there are users (default to login)
        setIsInitialSetup(false);
      } finally {
        setCheckingUsers(false);
      }
    };
    checkUsers();

    // Load OIDC configuration
    const loadOidcConfig = async () => {
      try {
        const res = await axios.get('/api/auth/oidc/config');
        if (res.data && res.data.enabled) {
          setOidcConfig(res.data);
        } else {
          setOidcConfig(null);
        }
      } catch (err) {
        console.log('OIDC config not available:', err.message);
        setOidcConfig(null);
      }
    };

    loadOidcConfig();

    // Load signup enabled setting from server
    const loadSignupEnabled = async () => {
      try {
        const res = await axios.get('/api/auth/settings');
        setSignupEnabled(res.data.signup_enabled !== false);
      } catch (err) {
        // Default to enabled if error
        setSignupEnabled(true);
      }
    };

    loadSignupEnabled();

    // Check for OIDC callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // Handle OIDC callback
      handleOidcCallback(code, state);
    }
  }, [handleOidcCallback]);

  const applyTheme = (theme) => {
    let effectiveTheme = theme;
    
    // Handle 'auto' theme by detecting system preference
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }
    
    if (effectiveTheme === 'dark') {
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else if (effectiveTheme === 'light') {
      document.documentElement.style.colorScheme = 'light';
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }
  };

  const suggestUsername = async (fullName, email) => {
    if (!fullName && !email) return;
    try {
      const res = await axios.post('/api/auth/suggest-username', {
        name: fullName,
        email: email
      });
      setUsername(res.data.suggested_username);
    } catch (err) {
      console.error('Error suggesting username:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (mode === 'signup') {
      if (!name || !username) {
        setError('Name and username are required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      setLoading(true);
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const payload = mode === 'login' 
        ? { email, password }
        : { email, username, name, password };

      const res = await axios.post(endpoint, payload);
      
      // Check if 2FA enrollment is required
      if (res.data.requires_2fa_enrollment) {
        // Setup enrollment modal
        const setupRes = await axios.post('/api/auth/2fa/setup');
        setEnrollmentData({ token: res.data.access_token, email, mode });
        setEnrollmentQRCode(setupRes.data.qr_code);
        setEnrollmentSecret(setupRes.data.secret);
        setEnrollmentBackupCodes(setupRes.data.backup_codes);
        setEnrollmentStep('qr');
        setShowEnrollmentModal(true);
      } else {
        // Normal login
        const token = res.data.access_token;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        onLoginSuccess(token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || `${mode === 'login' ? 'Login' : 'Signup'} failed`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentComplete = async () => {
    if (!enrollmentCode || enrollmentCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setEnrollmentLoading(true);
      await axios.post('/api/auth/2fa/enable', {
        secret: enrollmentSecret,
        totp_code: enrollmentCode,
        backup_codes: enrollmentBackupCodes
      }, {
        headers: {
          Authorization: `Bearer ${enrollmentData.token}`
        }
      });

      // Enrollment complete, proceed with login
      localStorage.setItem('token', enrollmentData.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${enrollmentData.token}`;
      setShowEnrollmentModal(false);
      onLoginSuccess(enrollmentData.token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to enable 2FA');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    try {
      setSsoLoading(true);
      setError('');

      const res = await axios.get('/api/auth/oidc/login');
      if (res.data.authorization_url) {
        // Redirect to the authorization URL
        window.location.href = res.data.authorization_url;
      } else {
        setError('Failed to get authorization URL from server.');
        console.error('No authorization_url in response:', res.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'SSO login failed. Please try again.';
      setError(`SSO login failed: ${errorMsg}`);
      console.error('SSO login error:', err);
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo">
          <i className="fas fa-shield-alt"></i>
          AuthNode 2FA
        </div>
        
        {checkingUsers ? (
          <div className="loading">Initializing...</div>
        ) : (
          <>
            {isInitialSetup && (
              <div className="setup-message">
                <p>No users found. Please create the first admin account.</p>
              </div>
            )}
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  if (!isInitialSetup) {
                    setMode('login');
                    setError('');
                    setName('');
                    setUsername('');
                    setConfirmPassword('');
                  }
                }}
                disabled={isInitialSetup}
              >
                Login
              </button>
              {(signupEnabled || isInitialSetup) && (
                <button 
                  className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                >
                  Sign Up
                </button>
              )}
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'signup' && (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        suggestUsername(e.target.value, email);
                      }}
                      autoComplete="name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        suggestUsername(name, e.target.value);
                      }}
                      autoComplete="email"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                </>
              )}

              {mode === 'login' && (
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {mode === 'signup' && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
              </button>

              {mode === 'login' && oidcConfig && (
                <>
                  <div style={{ textAlign: 'center', margin: '16px 0', color: '#666', fontSize: '14px' }}>
                    or
                  </div>
                  <button
                    type="button"
                    onClick={handleSSOLogin}
                    disabled={ssoLoading}
                    className="auth-submit"
                    style={{
                      backgroundColor: '#4285f4',
                      border: 'none',
                      color: 'white',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      cursor: ssoLoading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      width: '100%',
                      marginBottom: '16px',
                      opacity: ssoLoading ? 0.6 : 1
                    }}
                  >
                    <i className="fas fa-key" style={{ marginRight: '8px' }}></i>
                    {ssoLoading ? 'Redirecting...' : `Login with ${oidcConfig.provider_name}`}
                  </button>
                </>
              )}
            </form>

            {!isInitialSetup && (
              <p className="auth-footer">
                {mode === 'login' 
                  ? (signupEnabled ? "Don't have an account? Click Sign Up" : "")
                  : "Already have an account? Click Login"}
              </p>
            )}
          </>
        )}
      </div>

      {/* 2FA Enrollment Modal */}
      {showEnrollmentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: loginPageTheme === 'dark' ? '#1e1e1e' : '#ffffff',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              margin: '0 0 8px 0',
              color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Enable Two-Factor Authentication
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              color: loginPageTheme === 'dark' ? '#aaaaaa' : '#666666',
              fontSize: '14px'
            }}>
              2FA is required to continue. Please set it up now to secure your account.
            </p>

            {enrollmentStep === 'qr' && (
              <>
                <div style={{
                  backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  padding: '24px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  {enrollmentQRCode && (
                    <img src={enrollmentQRCode} alt="2FA QR Code" style={{
                      maxWidth: '200px',
                      width: '100%',
                      marginBottom: '16px'
                    }} />
                  )}
                  <p style={{
                    margin: '0 0 12px 0',
                    color: loginPageTheme === 'dark' ? '#cccccc' : '#555555',
                    fontSize: '13px'
                  }}>
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <p style={{
                    margin: 0,
                    color: loginPageTheme === 'dark' ? '#888888' : '#999999',
                    fontSize: '12px'
                  }}>
                    Manual Entry: <code style={{
                      backgroundColor: loginPageTheme === 'dark' ? '#333333' : '#eeeeee',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>{enrollmentSecret}</code>
                  </p>
                </div>

                <button
                  onClick={() => setEnrollmentStep('verify')}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: '#4361ee',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                    marginTop: '16px'
                  }}
                >
                  Next: Verify Code
                </button>
              </>
            )}

            {enrollmentStep === 'verify' && (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Enter the 6-digit code from your authenticator app:
                  </label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={enrollmentCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setEnrollmentCode(val);
                    }}
                    maxLength="6"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '20px',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      border: `2px solid ${loginPageTheme === 'dark' ? '#444444' : '#dddddd'}`,
                      borderRadius: '6px',
                      backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                      color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>

                <div style={{
                  backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f0f0f0',
                  padding: '16px',
                  borderRadius: '6px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    Backup Codes (Save these in a safe place):
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    {enrollmentBackupCodes.map((code, idx) => (
                      <code key={idx} style={{
                        backgroundColor: loginPageTheme === 'dark' ? '#333333' : '#ffffff',
                        padding: '6px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: loginPageTheme === 'dark' ? '#aaaaaa' : '#666666',
                        fontFamily: 'monospace'
                      }}>
                        {code}
                      </code>
                    ))}
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: loginPageTheme === 'dark' ? '#888888' : '#999999'
                  }}>
                    Use these codes if you lose access to your authenticator app
                  </p>
                </div>

                {error && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#ffcccc',
                    color: '#cc0000',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '13px'
                  }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleEnrollmentComplete}
                  disabled={enrollmentLoading || enrollmentCode.length !== 6}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: '#4361ee',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: enrollmentLoading || enrollmentCode.length !== 6 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                    opacity: enrollmentLoading || enrollmentCode.length !== 6 ? 0.6 : 1
                  }}
                >
                  {enrollmentLoading ? 'Setting up...' : 'Complete & Login'}
                </button>

                <button
                  onClick={() => setEnrollmentStep('qr')}
                  disabled={enrollmentLoading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    color: '#4361ee',
                    border: `2px solid #4361ee`,
                    borderRadius: '6px',
                    cursor: enrollmentLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '8px',
                    opacity: enrollmentLoading ? 0.6 : 1
                  }}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Auth;