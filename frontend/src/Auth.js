import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Auth.css';
import WebAuthnHelper from './utils/WebAuthnHelper';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetTokenLoading, setResetTokenLoading] = useState(false);
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(true);

  // WebAuthn states
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [webauthnEnabled, setWebauthnEnabled] = useState(true);

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

    // Load WebAuthn enabled setting from server
    const loadWebauthnEnabled = async () => {
      try {
        const res = await axios.get('/api/auth/login-settings');
        setWebauthnEnabled(res.data.webauthn_enabled !== false);
        setPasswordResetEnabled(res.data.password_reset_enabled !== false);
      } catch (err) {
        // Default to enabled if error
        setWebauthnEnabled(true);
        setPasswordResetEnabled(true);
      }
    };

    loadWebauthnEnabled();

    // Assume WebAuthn is supported - the actual WebAuthn calls will fail gracefully if not supported
    // Don't check navigator.credentials during initialization to avoid illegal invocation errors
    setWebauthnSupported(true);

    // Check for OIDC callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const resetToken = urlParams.get('token');

    if (code && state) {
      // Handle OIDC callback
      handleOidcCallback(code, state);
    } else if (resetToken) {
      // Handle password reset token
      setResetToken(resetToken);
      setShowForgotPassword(true);
      // Clear URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
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

  const handleWebauthnLogin = async () => {
    try {
      setWebauthnLoading(true);
      setError('');
      
      if (!email) {
        setError('Please enter your email address');
        setWebauthnLoading(false);
        return;
      }
      
      // Step 1: Get authentication options from server
      const optionsRes = await axios.post('/api/webauthn/authenticate/options', {
        email: email.trim()
      });
      
      const options = optionsRes.data;
      
      // Step 2: Use WebAuthnHelper to authenticate with the credential
      const credential = await WebAuthnHelper.authenticateCredential(options);
      
      // Step 3: Send credential to server for verification
      const res = await axios.post('/api/webauthn/authenticate/complete', {
        email: email.trim(),
        credential: credential
      });
      
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setWebauthnLoading(false);
      onLoginSuccess(token);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.name === 'NotAllowedError') {
        setError('Authentication cancelled or no authenticator available');
      } else {
        setError(err.message || 'WebAuthn authentication failed');
      }
      console.error(err);
      setWebauthnLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    try {
      setSsoLoading(true);
      const res = await axios.get('/api/auth/oidc/login');
      window.location.href = res.data.authorization_url;
    } catch (err) {
      setError('Failed to initiate SSO login');
      console.error(err);
      setSsoLoading(false);
    }
  };

  const handleEnrollmentComplete = async () => {
    try {
      setEnrollmentLoading(true);
      await axios.post('/api/auth/2fa/enable', {
        secret: enrollmentSecret,
        totp_code: enrollmentCode
      }, {
        headers: { Authorization: `Bearer ${enrollmentData.token}` }
      });
      
      localStorage.setItem('token', enrollmentData.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${enrollmentData.token}`;
      setShowEnrollmentModal(false);
      onLoginSuccess(enrollmentData.token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to enable 2FA');
      console.error(err);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setForgotPasswordLoading(true);
      setError('');
      await axios.post('/api/auth/password-reset', {
        email: forgotPasswordEmail
      });
      setResetToken(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
      console.error(err);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (e) => {
    e.preventDefault();
    try {
      setResetTokenLoading(true);
      setError('');
      const res = await axios.post('/api/auth/password-reset/confirm', {
        token: resetToken,
        new_password: newPassword
      });
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setShowForgotPassword(false);
      onLoginSuccess(token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
      console.error(err);
    } finally {
      setResetTokenLoading(false);
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
                {mode === 'signup' && <PasswordStrengthIndicator password={password} />}
              </div>

              {mode === 'login' && passwordResetEnabled && !isInitialSetup && (
                <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4361ee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'underline'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

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

              {mode === 'login' && webauthnSupported && webauthnEnabled && !isInitialSetup && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <div style={{ 
                    height: '1px', 
                    backgroundColor: '#e0e6ed', 
                    marginBottom: '16px',
                    position: 'relative'
                  }}>
                    <span style={{
                      backgroundColor: loginPageTheme === 'dark' ? '#1e1e1e' : '#ffffff',
                      padding: '0 12px',
                      fontSize: '12px',
                      color: '#718096',
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: '-8px'
                    }}>
                      or
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleWebauthnLogin}
                    disabled={webauthnLoading || !email}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      backgroundColor: '#6b46c1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: webauthnLoading || !email ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      opacity: webauthnLoading || !email ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fas fa-key"></i>
                    {webauthnLoading ? 'Authenticating...' : 'Login with Security Key'}
                  </button>
                  {!email && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#718096', 
                      marginTop: '8px',
                      marginBottom: '0'
                    }}>
                      Enter your email address first
                    </p>
                  )}
                </div>
              )}

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

      {/* Password Reset Modal */}
      {showForgotPassword && (
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
            backgroundColor: loginPageTheme === 'dark' ? '#2d3748' : '#ffffff',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              margin: '0 0 8px 0',
              color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              {resetToken ? 'Reset Password' : 'Forgot Password'}
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              color: loginPageTheme === 'dark' ? '#aaaaaa' : '#666666',
              fontSize: '14px'
            }}>
              {resetToken 
                ? 'Enter your new password below.'
                : 'Enter your email address and we\'ll send you a link to reset your password.'
              }
            </p>

            <form onSubmit={resetToken ? handlePasswordResetConfirm : handleForgotPassword}>
              {!resetToken && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${loginPageTheme === 'dark' ? '#444444' : '#dddddd'}`,
                      borderRadius: '6px',
                      backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                      color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>
              )}

              {resetToken && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${loginPageTheme === 'dark' ? '#444444' : '#dddddd'}`,
                        borderRadius: '6px',
                        backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                        color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${loginPageTheme === 'dark' ? '#444444' : '#dddddd'}`,
                        borderRadius: '6px',
                        backgroundColor: loginPageTheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                        color: loginPageTheme === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: loginPageTheme === 'dark' ? '#3d2626' : '#ffcccc',
                  color: loginPageTheme === 'dark' ? '#ff9999' : '#cc0000',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={(resetToken ? resetTokenLoading : forgotPasswordLoading) || (!resetToken && !forgotPasswordEmail) || (resetToken && (!newPassword || newPassword !== confirmNewPassword))}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: '#4361ee',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (resetToken ? resetTokenLoading : forgotPasswordLoading) || (!resetToken && !forgotPasswordEmail) || (resetToken && (!newPassword || newPassword !== confirmNewPassword)) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '16px',
                  opacity: (resetToken ? resetTokenLoading : forgotPasswordLoading) || (!resetToken && !forgotPasswordEmail) || (resetToken && (!newPassword || newPassword !== confirmNewPassword)) ? 0.6 : 1
                }}
              >
                {resetToken ? resetTokenLoading ? 'Resetting...' : 'Reset Password' : forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setForgotPasswordEmail('');
                  setResetToken('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                disabled={resetToken ? resetTokenLoading : forgotPasswordLoading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#4361ee',
                  border: `2px solid ${loginPageTheme === 'dark' ? '#5a7fd4' : '#4361ee'}`,
                  borderRadius: '6px',
                  cursor: (resetToken ? resetTokenLoading : forgotPasswordLoading) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (resetToken ? resetTokenLoading : forgotPasswordLoading) ? 0.6 : 1
                }}
              >
                {resetToken ? 'Cancel' : 'Back to Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Auth;