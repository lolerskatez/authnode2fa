import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Auth.css';

axios.defaults.baseURL = 'http://localhost:8040';

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
  const [loginPageTheme, setLoginPageTheme] = useState('light');

  useEffect(() => {
    // Load login page theme from server
    const loadLoginPageTheme = async () => {
      try {
        const res = await axios.get('/api/auth/login-page-theme');
        setLoginPageTheme(res.data.theme);
        applyTheme(res.data.theme);
      } catch (err) {
        // Default to light if error
        setLoginPageTheme('light');
        applyTheme('light');
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
  }, []);

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else if (theme === 'light') {
      document.documentElement.style.colorScheme = 'light';
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.style.colorScheme = 'light dark';
      document.body.classList.remove('theme-dark', 'theme-light');
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
      const token = res.data.access_token;

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      onLoginSuccess(token);
    } catch (err) {
      setError(err.response?.data?.detail || `${mode === 'login' ? 'Login' : 'Signup'} failed`);
      console.error(err);
    } finally {
      setLoading(false);
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
              <button 
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
              >
                Sign Up
              </button>
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
            </form>

            {!isInitialSetup && (
              <p className="auth-footer">
                {mode === 'login' 
                  ? "Don't have an account? Click Sign Up" 
                  : "Already have an account? Click Login"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;