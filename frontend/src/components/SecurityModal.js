import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SecurityModal = ({ isOpen, onClose, currentUser, colors, isMobile }) => {
  const [twoFAStatus, setTwoFAStatus] = useState({ totp_enabled: false, is_admin: false });
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState(null);
  const [twoFAVerifyCode, setTwoFAVerifyCode] = useState('');
  const [twoFASetupStep, setTwoFASetupStep] = useState('qr');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableTwoFAPassword, setDisableTwoFAPassword] = useState('');
  const [disableTwoFACode, setDisableTwoFACode] = useState('');
  const [showDisableTwoFA, setShowDisableTwoFA] = useState(false);
  const [toast, setToast] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ totp_enforcement: 'optional' });
  
  // WebAuthn states
  const [webauthnStatus, setWebauthnStatus] = useState(null);
  const [loadingWebauthn, setLoadingWebauthn] = useState(false);
  const [showWebauthnSetup, setShowWebauthnSetup] = useState(false);
  const [webauthnDeviceName, setWebauthnDeviceName] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load 2FA status
      axios.get('/api/auth/2fa/status')
        .then(res => {
          setTwoFAStatus(res.data);
        })
        .catch(err => {
          console.error('Error loading 2FA status:', err);
        });

      // Load WebAuthn status
      axios.get('/api/webauthn/status')
        .then(res => {
          setWebauthnStatus(res.data);
        })
        .catch(err => {
          console.log('WebAuthn not available:', err.message);
        });

      // Load global settings to show enforcement policy
      axios.get('/api/admin/settings')
        .then(res => {
          if (res.data) {
            setGlobalSettings({
              totp_enforcement: res.data.totp_enforcement || 'optional'
            });
          }
        })
        .catch(err => {
          console.log('Global settings not available:', err.message);
        });
    }
  }, [isOpen]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetup2FA = async () => {
    setShowTwoFASetup(true);
    setTwoFALoading(true);
    try {
      const res = await axios.post('/api/auth/2fa/setup');
      setTwoFASetupData(res.data);
      setTwoFABackupCodes(res.data.backup_codes || []);
      setTwoFASetupStep('qr');
    } catch (err) {
      showToast('Error setting up 2FA: ' + (err.response?.data?.detail || err.message));
      setShowTwoFASetup(false);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleComplete2FAEnrollment = async () => {
    if (!twoFAVerifyCode || twoFAVerifyCode.length !== 6) {
      showToast('Please enter a valid 6-digit code');
      return;
    }
    setTwoFALoading(true);
    try {
      await axios.post('/api/auth/2fa/enable', {
        secret: twoFASetupData.secret,
        totp_code: twoFAVerifyCode,
        backup_codes: twoFABackupCodes
      });
      setTwoFAStatus({ ...twoFAStatus, totp_enabled: true });
      setShowBackupCodes(true);
      setTwoFAVerifyCode('');
      setShowTwoFASetup(false);
      showToast('2FA enabled successfully!');
    } catch (err) {
      showToast('Error enabling 2FA: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableTwoFAPassword) {
      showToast('Please enter your password');
      return;
    }
    setTwoFALoading(true);
    try {
      await axios.post('/api/auth/2fa/disable', {
        password: disableTwoFAPassword,
        totp_code: disableTwoFACode
      });
      setTwoFAStatus({ ...twoFAStatus, totp_enabled: false });
      setDisableTwoFAPassword('');
      setDisableTwoFACode('');
      setShowDisableTwoFA(false);
      showToast('2FA disabled successfully');
    } catch (err) {
      showToast('Error disabling 2FA: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleWebauthnRegister = async () => {
    if (!webauthnDeviceName.trim()) {
      showToast('Please enter a device name');
      return;
    }

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      showToast('WebAuthn is not supported on this browser');
      return;
    }

    setLoadingWebauthn(true);
    try {
      // Step 1: Get registration options from server
      const optionsRes = await axios.post('/api/webauthn/register/options', {
        device_name: webauthnDeviceName.trim()
      });

      const options = optionsRes.data;

      // Decode challenge from base64url to ArrayBuffer
      const challenge = Uint8Array.from(
        atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Decode userId from base64url to ArrayBuffer
      const userId = Uint8Array.from(
        atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Step 2: Create credentials using WebAuthn API
      const attestationResponse = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: options.rp.name,
            id: options.rp.id
          },
          user: {
            id: userId,
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          timeout: 60000,
          attestation: 'direct',
          authenticatorSelection: {
            authenticatorAttachment: 'cross-platform', // Allow YubiKey and other cross-platform authenticators
            userVerification: 'preferred' // Allow platform authenticators for Windows Hello, etc.
          }
        }
      });

      if (!attestationResponse) {
        showToast('Registration cancelled');
        setLoadingWebauthn(false);
        return;
      }

      // Step 3: Send attestation to server for verification
      await axios.post('/api/webauthn/register/complete', {
        id: attestationResponse.id,
        rawId: Array.from(new Uint8Array(attestationResponse.rawId)),
        response: {
          attestationObject: Array.from(
            new Uint8Array(attestationResponse.response.attestationObject)
          ),
          clientDataJSON: Array.from(
            new Uint8Array(attestationResponse.response.clientDataJSON)
          )
        },
        type: attestationResponse.type,
        device_name: webauthnDeviceName.trim()
      });

      showToast('Security key registered successfully!');
      setWebauthnDeviceName('');
      setShowWebauthnSetup(false);
      
      // Reload WebAuthn status
      const statusRes = await axios.get('/api/webauthn/status');
      setWebauthnStatus(statusRes.data);
    } catch (err) {
      console.error('WebAuthn registration error:', err);
      if (err.name === 'NotAllowedError') {
        showToast('Registration cancelled or no authenticator available');
      } else if (err.name === 'InvalidStateError') {
        showToast('Authenticator is already registered');
      } else {
        showToast('Error registering security key: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoadingWebauthn(false);
    }
  };

  const handleDeleteWebauthnCredential = async (credentialId) => {
    if (!window.confirm('Are you sure you want to remove this security key?')) {
      return;
    }
    setLoadingWebauthn(true);
    try {
      await axios.delete(`/api/webauthn/credentials/${credentialId}`);
      showToast('Security key removed');
      // Reload WebAuthn status
      const res = await axios.get('/api/webauthn/status');
      setWebauthnStatus(res.data);
    } catch (err) {
      showToast('Error removing security key: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingWebauthn(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: colors.background,
        borderRadius: '12px',
        padding: isMobile ? '20px' : '24px',
        maxWidth: isMobile ? '90%' : '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 9999,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        border: `1px solid ${colors.border}`,
        animation: 'slideUp 0.3s'
      }}>
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: colors.primary,
            color: colors.background,
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            fontSize: '14px',
            fontWeight: '500',
            animation: 'slideDown 0.3s'
          }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: `2px solid ${colors.border}`
        }}>
          <h2 style={{
            margin: 0,
            color: colors.primary,
            fontSize: '20px',
            fontWeight: '600'
          }}>
            <i className="fas fa-shield-alt" style={{ marginRight: '10px', color: colors.accent }}></i>
            Security Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.secondary,
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.border;
              e.target.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = colors.secondary;
            }}
          >
            ×
          </button>
        </div>

        {/* 2FA Status */}
        <div style={{
          padding: '16px',
          backgroundColor: twoFAStatus.totp_enabled ? colors.infoLight : colors.backgroundSecondary,
          borderRadius: '8px',
          border: `1px solid ${twoFAStatus.totp_enabled ? colors.infoBorder : colors.border}`,
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <i 
              className={`fas fa-${twoFAStatus.totp_enabled ? 'check-circle' : 'exclamation-circle'}`} 
              style={{ 
                fontSize: '20px', 
                color: twoFAStatus.totp_enabled ? colors.success : colors.warning, 
                marginRight: '12px' 
              }}
            />
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
                Two-Factor Authentication
              </h3>
              <p style={{ margin: 0, color: colors.secondary, fontSize: '13px' }}>
                {twoFAStatus.totp_enabled ? 'Enabled' : 'Not enabled'}
                {twoFAStatus.is_admin && !twoFAStatus.totp_enabled && globalSettings.totp_enforcement === 'admin_only' ? ' (Required for admins)' : ''}
                {!twoFAStatus.totp_enabled && globalSettings.totp_enforcement === 'required_all' ? ' (Required)' : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
            {!twoFAStatus.totp_enabled ? (
              <button
                onClick={() => {
                  if (!showTwoFASetup) {
                    handleSetup2FA();
                  } else {
                    setShowTwoFASetup(false);
                  }
                }}
                disabled={twoFALoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: twoFALoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: twoFALoading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
                {twoFALoading ? 'Setting up...' : showTwoFASetup ? 'Cancel' : 'Enable 2FA'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowDisableTwoFA(true)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-times-circle" style={{ marginRight: '8px' }}></i>
                  Disable 2FA
                </button>
                <button
                  onClick={() => setShowBackupCodes(true)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-key" style={{ marginRight: '8px' }}></i>
                  Backup Codes
                </button>
              </>
            )}
          </div>

          {/* 2FA Setup Flow */}
          {showTwoFASetup && !twoFAStatus.totp_enabled && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: colors.background,
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>
              {twoFASetupStep === 'qr' && (
                <>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                    <i className="fas fa-qrcode" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Scan QR Code
                  </h4>
                  <div style={{
                    backgroundColor: colors.backgroundSecondary,
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    {twoFASetupData && twoFASetupData.qr_code && (
                      <img 
                        src={twoFASetupData.qr_code} 
                        alt="2FA QR Code" 
                        style={{
                          maxWidth: '200px',
                          width: '100%',
                          marginBottom: '16px',
                          border: `4px solid white`,
                          borderRadius: '8px'
                        }} 
                      />
                    )}
                    <p style={{
                      margin: '0 0 8px 0',
                      color: colors.secondary,
                      fontSize: '13px'
                    }}>
                      Scan with Google Authenticator, Authy, or Microsoft Authenticator
                    </p>
                    {twoFASetupData && twoFASetupData.secret && (
                      <p style={{
                        margin: 0,
                        color: colors.secondary,
                        fontSize: '11px'
                      }}>
                        Manual entry: <code style={{
                          backgroundColor: colors.border,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>{twoFASetupData.secret}</code>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setTwoFASetupStep('verify')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: colors.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Next: Verify Code
                  </button>
                </>
              )}

              {twoFASetupStep === 'verify' && (
                <>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '8px', color: colors.accent }}></i>
                    Verify Your Code
                  </h4>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      Enter the 6-digit code from your authenticator app:
                    </label>
                    <input
                      type="text"
                      placeholder="000000"
                      value={twoFAVerifyCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setTwoFAVerifyCode(val);
                      }}
                      maxLength="6"
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '20px',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '8px',
                        backgroundColor: colors.backgroundSecondary,
                        color: colors.primary,
                        boxSizing: 'border-box',
                        fontWeight: '600'
                      }}
                      autoFocus
                    />
                  </div>

                  {twoFABackupCodes && twoFABackupCodes.length > 0 && (
                    <div style={{
                      backgroundColor: colors.warningLight,
                      padding: '14px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.warningBorder}`,
                      marginBottom: '16px'
                    }}>
                      <p style={{
                        margin: '0 0 10px 0',
                        color: colors.primary,
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px', color: colors.warning }}></i>
                        Save these backup codes:
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                      }}>
                        {twoFABackupCodes.map((code, idx) => (
                          <code key={idx} style={{
                            backgroundColor: colors.background,
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: colors.secondary,
                            fontFamily: 'monospace',
                            textAlign: 'center'
                          }}>
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleComplete2FAEnrollment}
                    disabled={twoFALoading || twoFAVerifyCode.length !== 6}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: colors.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: twoFALoading || twoFAVerifyCode.length !== 6 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: twoFALoading || twoFAVerifyCode.length !== 6 ? 0.6 : 1,
                      marginBottom: '8px'
                    }}
                  >
                    {twoFALoading ? 'Verifying...' : 'Complete Setup'}
                  </button>

                  <button
                    onClick={() => setTwoFASetupStep('qr')}
                    disabled={twoFALoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'transparent',
                      color: colors.accent,
                      border: `2px solid ${colors.accent}`,
                      borderRadius: '6px',
                      cursor: twoFALoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: twoFALoading ? 0.6 : 1
                    }}
                  >
                    Back to QR Code
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Disable 2FA Modal */}
        {showDisableTwoFA && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: colors.background,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '18px' }}>
                Disable 2FA
              </h3>
              <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
                Enter your password and a 2FA code to disable two-factor authentication:
              </p>
              <input
                type="password"
                placeholder="Password"
                value={disableTwoFAPassword}
                onChange={(e) => setDisableTwoFAPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '12px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                placeholder="2FA Code (optional)"
                value={disableTwoFACode}
                onChange={(e) => setDisableTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '16px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  boxSizing: 'border-box',
                  letterSpacing: '4px',
                  textAlign: 'center'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setShowDisableTwoFA(false);
                    setDisableTwoFAPassword('');
                    setDisableTwoFACode('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.primary,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={!disableTwoFAPassword}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: !disableTwoFAPassword ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: !disableTwoFAPassword ? 0.5 : 1
                  }}
                >
                  Disable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WebAuthn/Security Keys Section */}
        {webauthnStatus && (
          <div style={{
            padding: '16px',
            backgroundColor: webauthnStatus.credentials_count > 0 ? colors.infoLight : colors.backgroundSecondary,
            borderRadius: '8px',
            border: `1px solid ${webauthnStatus.credentials_count > 0 ? colors.infoBorder : colors.border}`,
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <i 
                className={`fas fa-${webauthnStatus.credentials_count > 0 ? 'check-circle' : 'key'}`} 
                style={{ 
                  fontSize: '20px', 
                  color: webauthnStatus.credentials_count > 0 ? colors.success : colors.warning, 
                  marginRight: '12px' 
                }}
              />
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
                  Security Keys
                </h3>
                <p style={{ margin: 0, color: colors.secondary, fontSize: '13px' }}>
                  {webauthnStatus.credentials_count > 0 
                    ? `${webauthnStatus.credentials_count} key${webauthnStatus.credentials_count !== 1 ? 's' : ''} registered` 
                    : 'No security keys registered'}
                </p>
              </div>
            </div>

            {/* List of registered credentials */}
            {webauthnStatus.credentials && webauthnStatus.credentials.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {webauthnStatus.credentials.map((cred) => (
                  <div 
                    key={cred.id}
                    style={{
                      backgroundColor: colors.background,
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.primary, fontWeight: '500', fontSize: '13px', marginBottom: '4px' }}>
                        <i className="fas fa-usb" style={{ marginRight: '8px' }}></i>
                        {cred.device_name}
                      </div>
                      <div style={{ color: colors.secondary, fontSize: '11px' }}>
                        Registered: {new Date(cred.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteWebauthnCredential(cred.id)}
                      disabled={loadingWebauthn}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: colors.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loadingWebauthn ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: loadingWebauthn ? 0.6 : 1
                      }}
                    >
                      <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Security Key Button */}
            <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
              {!showWebauthnSetup ? (
                <button
                  onClick={() => setShowWebauthnSetup(true)}
                  disabled={loadingWebauthn}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loadingWebauthn ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loadingWebauthn ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
                  {loadingWebauthn ? 'Adding...' : 'Register Security Key'}
                </button>
              ) : (
                <>
                  <div style={{ flex: 1, marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: colors.primary,
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      Device Name (e.g., "YubiKey", "Windows Hello"):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., My Security Key"
                      value={webauthnDeviceName}
                      onChange={(e) => setWebauthnDeviceName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: colors.backgroundSecondary,
                        color: colors.primary,
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleWebauthnRegister}
                      disabled={loadingWebauthn || !webauthnDeviceName.trim()}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        backgroundColor: colors.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (loadingWebauthn || !webauthnDeviceName.trim()) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: (loadingWebauthn || !webauthnDeviceName.trim()) ? 0.5 : 1
                      }}
                    >
                      <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
                      Register
                    </button>
                    <button
                      onClick={() => {
                        setShowWebauthnSetup(false);
                        setWebauthnDeviceName('');
                      }}
                      disabled={loadingWebauthn}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        backgroundColor: colors.border,
                        color: colors.primary,
                        border: `2px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: loadingWebauthn ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: loadingWebauthn ? 0.5 : 1
                      }}
                    >
                      <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: colors.background,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '18px' }}>
                Backup Codes
              </h3>
              <p style={{ margin: '0 0 16px 0', color: colors.secondary, fontSize: '13px' }}>
                Save these codes in a safe place. Each code can be used once if you lose access to your authenticator app.
              </p>
              {twoFABackupCodes && twoFABackupCodes.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  {twoFABackupCodes.map((code, idx) => (
                    <code key={idx} style={{
                      backgroundColor: colors.backgroundSecondary,
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: colors.secondary,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}>
                      {code}
                    </code>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowBackupCodes(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SecurityModal;
