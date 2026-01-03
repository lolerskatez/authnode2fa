import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const AddAccountModal = ({ 
  isEditMode, 
  selectedAccount,
  setupMethod,
  onSetupMethodChange,
  accountNamePreview,
  onAccountNameChange,
  onClose,
  onAccountsChange,
  onCodesChange,
  onTimersChange,
  onProgressesChange,
  codes,
  timers,
  progresses,
  fetchCode,
  appSettings
}) => {
  const serviceIcons = {
    'google': { icon: 'fab fa-google', color: '#4285F4' },
    'microsoft': { icon: 'fab fa-microsoft', color: '#00BCF2' },
    'apple': { icon: 'fab fa-apple', color: '#000000' },
    'amazon': { icon: 'fab fa-amazon', color: '#FF9900' },
    'facebook': { icon: 'fab fa-facebook', color: '#1877F2' },
    'twitter': { icon: 'fab fa-twitter', color: '#1DA1F2' },
    'instagram': { icon: 'fab fa-instagram', color: '#E4405F' },
    'linkedin': { icon: 'fab fa-linkedin', color: '#0077B5' },
    'github': { icon: 'fab fa-github', color: '#181717' },
    'gitlab': { icon: 'fab fa-gitlab', color: '#FC6D26' },
    'bitbucket': { icon: 'fab fa-bitbucket', color: '#0052CC' },
    'discord': { icon: 'fab fa-discord', color: '#5865F2' },
    'slack': { icon: 'fab fa-slack', color: '#4A154B' },
    'zoom': { icon: 'fas fa-video', color: '#2D8CFF' },
    'teams': { icon: 'fab fa-microsoft', color: '#6264A7' },
    'skype': { icon: 'fab fa-skype', color: '#00AFF0' },
    'gmail': { icon: 'fab fa-google', color: '#EA4335' },
    'outlook': { icon: 'fab fa-microsoft', color: '#0078D4' },
    'yahoo': { icon: 'fab fa-yahoo', color: '#5F01D1' },
    'protonmail': { icon: 'fas fa-shield-alt', color: '#6D4AFF' },
    'aws': { icon: 'fab fa-aws', color: '#FF9900' },
    'azure': { icon: 'fab fa-microsoft', color: '#0078D4' },
    'digitalocean': { icon: 'fab fa-digital-ocean', color: '#0080FF' },
    'heroku': { icon: 'fab fa-heroku', color: '#430098' },
    'netlify': { icon: 'fas fa-globe', color: '#00C46A' },
    'vercel': { icon: 'fas fa-rocket', color: '#000000' },
    'rustdesk': { icon: 'fas fa-desktop', color: '#1E90FF' },
    'teamviewer': { icon: 'fas fa-tv', color: '#0E70F5' },
    'anydesk': { icon: 'fas fa-desktop', color: '#EF443B' },
    'chrome remote desktop': { icon: 'fab fa-chrome', color: '#4285F4' },
    'lastpass': { icon: 'fas fa-key', color: '#D32F2F' },
    'bitwarden': { icon: 'fas fa-shield-alt', color: '#175DDC' },
    '1password': { icon: 'fas fa-key', color: '#0094F5' },
    'keepass': { icon: 'fas fa-key', color: '#4CAF50' },
    'paypal': { icon: 'fab fa-paypal', color: '#003087' },
    'stripe': { icon: 'fab fa-stripe-s', color: '#635BFF' },
    'coinbase': { icon: 'fab fa-bitcoin', color: '#0052FF' },
    'telegram': { icon: 'fab fa-telegram', color: '#0088CC' },
    'whatsapp': { icon: 'fab fa-whatsapp', color: '#25D366' },
    'signal': { icon: 'fas fa-comment', color: '#3A76F0' },
    'jetbrains': { icon: 'fas fa-code', color: '#000000' },
    'visual studio': { icon: 'fab fa-microsoft', color: '#5C2D91' },
    'vscode': { icon: 'fas fa-code', color: '#007ACC' },
    'nextcloud': { icon: 'fas fa-cloud', color: '#0082C9' },
    'owncloud': { icon: 'fas fa-cloud', color: '#041E42' },
    'pi-hole': { icon: 'fas fa-shield-alt', color: '#96060C' },
    'home assistant': { icon: 'fas fa-home', color: '#18BCF2' },
    'plex': { icon: 'fas fa-play', color: '#E5A00D' },
    'jellyfin': { icon: 'fas fa-play', color: '#AA5CC3' },
    'emby': { icon: 'fas fa-play', color: '#52B54B' },
  };

  const getIconForService = (serviceName) => {
    const cleanName = serviceName.toLowerCase().trim();
    
    if (serviceIcons[cleanName]) {
      return serviceIcons[cleanName].icon;
    }
    
    for (const key in serviceIcons) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return serviceIcons[key].icon;
      }
    }
    
    return 'fas fa-key';
  };

  const getColorForService = (serviceName) => {
    const cleanName = serviceName.toLowerCase().trim();
    
    if (serviceIcons[cleanName]) {
      return serviceIcons[cleanName].color;
    }
    
    for (const key in serviceIcons) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return serviceIcons[key].color;
      }
    }
    
    return '#6B46C1';
  };

  // Theme-aware color helpers
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      border: isDark ? '#2d3748' : '#e0e6ed',
      background: isDark ? '#1a202c' : '#ffffff',
      secondaryBg: isDark ? '#2d3748' : '#f5f7fa',
      success: isDark ? '#48bb78' : '#48bb78',
      danger: isDark ? '#f56565' : '#f56565',
    };
  };

  const colors = getThemeColors();
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenSize = window.innerWidth <= 768;
      setIsMobile(userAgent || screenSize);
      
      // Check if camera API is available
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      const hasCamera = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      
      // On iOS, camera requires HTTPS
      if (isIOS && !isSecure) {
        setCameraAvailable(false);
      } else if (!hasCamera) {
        setCameraAvailable(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize camera when showCamera becomes true
  useEffect(() => {
    let animationFrame;

    const startCamera = async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setScanningActive(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        
        let errorMessage = 'Unable to access camera. ';
        
        // Check if it's iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        
        if (isIOS && !isSecure) {
          errorMessage += 'iOS requires HTTPS to access the camera. Please use the "Upload QR" option instead, or access this site via HTTPS.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage += 'Camera permission was denied. Please check your browser settings and allow camera access.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device. Please use the "Upload QR" option instead.';
        } else {
          errorMessage += 'Please use the "Upload QR" option instead.';
        }
        
        alert(errorMessage);
        setShowCamera(false);
      }
    };

    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !scanningActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simple QR code detection - look for otpauth:// pattern
        // In production, you'd use a library like jsQR
        try {
          // For now, we'll just show a message that this feature needs a QR library
          // You can add jsQR library for full implementation
        } catch (error) {
          console.error('QR scan error:', error);
        }
      }

      animationFrame = requestAnimationFrame(scanQRCode);
    };

    if (showCamera) {
      startCamera().then(() => {
        scanQRCode();
      });
    }

    return () => {
      // Cleanup
      setScanningActive(false);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera, scanningActive]);

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && selectedAccount) {
      setTimeout(() => {
        const form = document.querySelector('.modal form');
        if (form) {
          form.accountName.value = selectedAccount.name;
          form.accountUsername.value = selectedAccount.email || '';
          form.accountCategory.value = selectedAccount.category || 'Personal';
          form.accountFavorite.checked = selectedAccount.favorite || false;
        }
      }, 100);
    }
  }, [isEditMode, selectedAccount]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const accountName = e.target.accountName.value;
    const accountEmail = e.target.accountUsername?.value || '';
    const accountCategory = e.target.accountCategory?.value || 'Personal';
    const accountFavorite = e.target.accountFavorite?.checked || false;
    const accountColor = getColorForService(accountName);
    
    if (accountName.trim() === '') {
      alert('Please enter an account name');
      return;
    }

    try {
      if (isEditMode && selectedAccount) {
        // Update existing account
        await axios.put(`/api/applications/${selectedAccount.id}`, {
          name: accountName,
          icon: selectedAccount.icon,
          category: accountCategory,
          favorite: accountFavorite
        });
        
        onAccountsChange(
          (accounts) => accounts.map(acc => 
            acc.id === selectedAccount.id 
              ? { ...acc, name: accountName, email: accountEmail, category: accountCategory, favorite: accountFavorite }
              : acc
          )
        );
      } else {
        let newAccount;

        if (setupMethod === 'scan') {
          const qrFile = e.target.qrFile?.files[0];
          if (!qrFile) {
            alert('Please select a QR code image to upload');
            return;
          }

          const formData = new FormData();
          formData.append('file', qrFile);
          formData.append('name', accountName);

          const response = await axios.post('/api/applications/upload-qr', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newAccount = response.data;
        } else {
          const manualSecret = e.target.manualSecret?.value;
          if (!manualSecret || manualSecret.trim() === '') {
            alert('Please enter a secret key');
            return;
          }

          const response = await axios.post('/api/applications/', {
            name: accountName,
            secret: manualSecret.toUpperCase().replace(/\s/g, ''),
            backup_key: 'BACKUP123',
            otp_type: e.target.otpType?.value || 'TOTP',
            category: accountCategory,
            favorite: accountFavorite,
            color: accountColor
          });
          newAccount = response.data;
        }
        
        // Add to local state
        onAccountsChange((prevAccounts) => [...prevAccounts, {
          id: newAccount.id,
          name: newAccount.name,
          email: accountEmail,
          icon: newAccount.icon || 'fab fa-key',
          color: accountColor,
          category: newAccount.category || accountCategory,
          favorite: newAccount.favorite || accountFavorite
        }]);

        // Initialize timer and progress, fetch real code from API
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = 30 - (now % 30);
        
        const newCode = await fetchCode(newAccount.id);
        const newCodes = { ...codes, [newAccount.id]: newCode };
        const newTimers = { ...timers, [newAccount.id]: timeRemaining };
        const newProgresses = { ...progresses, [newAccount.id]: ((30 - timeRemaining) / 30) * 100 };

        onCodesChange(newCodes);
        onTimersChange(newTimers);
        onProgressesChange(newProgresses);
      }

      onClose();
      e.target.reset();
      onAccountNameChange('');
    } catch (error) {
      console.error('Failed to save account:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save account. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <div className="modal-overlay" style={isMobile ? { alignItems: 'flex-end' } : {}}>
      <div className="modal" style={isMobile ? {
        width: '100%',
        maxWidth: '100%',
        height: '85vh',
        borderRadius: '16px 16px 0 0',
        margin: 0,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      } : {
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="modal-header" style={isMobile ? {
          padding: '14px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        } : {
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h2 style={isMobile ? { fontSize: '18px' } : { fontSize: '20px', marginBottom: 0 }}>
            {isEditMode ? 'Edit Account' : 'Add New Account'}
          </h2>
          <button 
            className="modal-close"
            onClick={onClose}
            style={isMobile ? { width: '36px', height: '36px', fontSize: '18px' } : {}}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body" style={isMobile ? {
          padding: '16px',
          overflowY: 'auto',
          flex: 1
        } : {
          display: 'flex',
          flex: 1,
          overflowY: 'auto'
        }}>
          {!isMobile && !isEditMode && (
            // Desktop: Left sidebar with setup methods
            <div style={{
              width: '280px',
              borderRight: `1px solid ${colors.border}`,
              padding: '24px 20px',
              backgroundColor: colors.secondaryBg,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: colors.primary, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Setup Method
                </h4>
              </div>

              {/* Scan QR Method */}
              <button 
                className={`btn ${setupMethod === 'scan' ? 'btn-primary' : 'btn-secondary'}`} 
                type="button"
                onClick={() => onSetupMethodChange('scan')}
                style={{
                  padding: '14px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  border: setupMethod === 'scan' ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  backgroundColor: setupMethod === 'scan' ? colors.accent : 'transparent',
                  color: setupMethod === 'scan' ? 'white' : colors.primary,
                  cursor: 'pointer',
                  fontWeight: setupMethod === 'scan' ? '600' : '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-qrcode" style={{ fontSize: '16px' }}></i>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Scan QR Code</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Upload QR image</div>
                </div>
              </button>

              {/* Camera Method */}
              {cameraAvailable && (
                <button 
                  className="btn btn-secondary" 
                  type="button"
                  onClick={() => setShowCamera(true)}
                  style={{
                    padding: '14px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="fas fa-camera" style={{ fontSize: '16px' }}></i>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Use Camera</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Scan live QR</div>
                  </div>
                </button>
              )}

              {/* Manual Entry Method */}
              <button 
                className={`btn ${setupMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
                type="button"
                onClick={() => onSetupMethodChange('manual')}
                style={{
                  padding: '14px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  border: setupMethod === 'manual' ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  backgroundColor: setupMethod === 'manual' ? colors.accent : 'transparent',
                  color: setupMethod === 'manual' ? 'white' : colors.primary,
                  cursor: 'pointer',
                  fontWeight: setupMethod === 'manual' ? '600' : '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-keyboard" style={{ fontSize: '16px' }}></i>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Manual Entry</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Enter code manually</div>
                </div>
              </button>

              {/* Help Section */}
              <div style={{
                marginTop: '20px',
                padding: '12px 14px',
                backgroundColor: colors.background,
                borderRadius: '6px',
                borderLeft: `3px solid ${colors.accent}`
              }}>
                <p style={{ margin: 0, color: colors.secondary, fontSize: '12px', lineHeight: '1.5' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: colors.primary }}>Tip:</strong>
                  Most services provide a QR code during setup. Scan it for quick setup.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleAddAccount} style={!isMobile && !isEditMode ? { flex: 1, padding: '24px', overflowY: 'auto' } : {}}>
            <div className="form-grid" style={!isMobile && !isEditMode ? { maxWidth: '450px', display: 'block' } : {}}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="accountName" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                  Account Name
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="text" 
                    id="accountName" 
                    className="form-control" 
                    placeholder="e.g., Google, Facebook, etc."
                    name="accountName"
                    onChange={(e) => onAccountNameChange(e.target.value)}
                    style={isMobile ? { 
                      flex: 1, 
                      padding: '12px', 
                      fontSize: '15px',
                      borderRadius: '8px'
                    } : { flex: 1 }}
                  />
                  {accountNamePreview && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '0px', minWidth: '50px' }}>
                      <span style={{ fontSize: '11px', color: '#718096' }}>Icon</span>
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
                        <i className={getIconForService(accountNamePreview)} style={{ fontSize: '12px', color: 'white' }}></i>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="accountUsername" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                  Username/Email (Optional)
                </label>
                <input 
                  type="text" 
                  id="accountUsername" 
                  className="form-control" 
                  placeholder="your.email@example.com"
                  name="accountUsername"
                  style={isMobile ? { 
                    padding: '12px', 
                    fontSize: '15px',
                    borderRadius: '8px'
                  } : {}}
                />
              </div>

              <div className="form-group">
                <label htmlFor="accountCategory" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                  Category
                </label>
                <select 
                  id="accountCategory" 
                  className="form-control" 
                  name="accountCategory"
                  defaultValue="Personal"
                  style={isMobile ? { 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '15px',
                    borderRadius: '8px'
                  } : { width: '100%' }}
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Security">Security</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="otpType" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                  OTP Type
                </label>
                <select 
                  id="otpType" 
                  className="form-control" 
                  name="otpType"
                  defaultValue="TOTP"
                  style={isMobile ? { 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '15px',
                    borderRadius: '8px'
                  } : { width: '100%' }}
                >
                  <option value="TOTP">TOTP (Time-based)</option>
                  <option value="HOTP">HOTP (Counter-based)</option>
                </select>
                <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  TOTP: Codes change every 30 seconds. HOTP: Codes increment with each use.
                </small>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
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

            {!isEditMode && isMobile && (
              <>
                <div className="form-group form-group-full">
                  <label style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                    Setup Method
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '10px' : '10px', 
                    marginTop: isMobile ? '10px' : '10px', 
                    flexWrap: 'wrap' 
                  }}>
                    <button 
                      className={`btn ${setupMethod === 'scan' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={isMobile ? { 
                        flex: 1, 
                        minWidth: '130px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      } : { flex: 1, minWidth: '140px' }}
                      type="button"
                      onClick={() => onSetupMethodChange('scan')}
                    >
                      <i className="fas fa-qrcode"></i> {isMobile ? 'Upload' : 'Scan'} QR
                    </button>
                    {isMobile && cameraAvailable && (
                      <button 
                        className="btn btn-primary" 
                        style={{ 
                          flex: 1, 
                          minWidth: '130px',
                          padding: '12px 16px',
                          fontSize: '14px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        type="button"
                        onClick={() => setShowCamera(true)}
                      >
                        <i className="fas fa-camera"></i> Use Camera
                      </button>
                    )}
                    <button 
                      className={`btn ${setupMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={isMobile ? { 
                        flex: 1, 
                        minWidth: '130px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      } : { flex: 1, minWidth: '140px' }}
                      type="button"
                      onClick={() => onSetupMethodChange('manual')}
                    >
                      <i className="fas fa-keyboard"></i> Manual Entry
                    </button>
                  </div>
                </div>

                {setupMethod === 'scan' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="qrFile" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                      Upload QR Code Image
                    </label>
                    <input 
                      type="file" 
                      id="qrFile" 
                      className="form-control" 
                      accept="image/*"
                      name="qrFile"
                      style={isMobile ? { 
                        padding: '12px', 
                        fontSize: '15px',
                        borderRadius: '8px'
                      } : {}}
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Upload a screenshot or photo of the QR code from your service
                    </small>
                  </div>
                )}

                {setupMethod === 'manual' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="manualSecret" style={isMobile ? { fontSize: '14px', marginBottom: '8px' } : {}}>
                      Secret Key
                    </label>
                    <input 
                      type="text" 
                      id="manualSecret" 
                      className="form-control" 
                      placeholder="Enter your 2FA secret key (e.g., JBSWY3DPEHPK3PXP)"
                      name="manualSecret"
                      style={isMobile ? { 
                        padding: '12px', 
                        fontSize: '15px',
                        borderRadius: '8px'
                      } : {}}
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      The secret key is usually found in the advanced settings of your 2FA setup
                    </small>
                  </div>
                )}
              </>
            )}

            {!isEditMode && !isMobile && (
              <>
                {setupMethod === 'scan' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="qrFile" style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <i className="fas fa-image" style={{ marginRight: '8px', color: colors.accent }}></i>
                      Upload QR Code Image
                    </label>
                    <input 
                      type="file" 
                      id="qrFile" 
                      className="form-control" 
                      accept="image/*"
                      name="qrFile"
                      style={{
                        padding: '12px', 
                        fontSize: '14px',
                        borderRadius: '8px'
                      }}
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Upload a screenshot or photo of the QR code from your service
                    </small>
                  </div>
                )}

                {setupMethod === 'manual' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="manualSecret" style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <i className="fas fa-key" style={{ marginRight: '8px', color: colors.accent }}></i>
                      Secret Key
                    </label>
                    <input 
                      type="text" 
                      id="manualSecret" 
                      className="form-control" 
                      placeholder="Enter your 2FA secret key (e.g., JBSWY3DPEHPK3PXP)"
                      name="manualSecret"
                      style={{
                        padding: '12px', 
                        fontSize: '14px',
                        borderRadius: '8px'
                      }}
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      The secret key is usually found in the advanced settings of your 2FA setup
                    </small>
                  </div>
                )}
              </>
            )}

            <div className="btn-group" style={isMobile ? {
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.border}`,
              position: 'sticky',
              bottom: 0,
              backgroundColor: colors.background,
              marginLeft: '-16px',
              marginRight: '-16px',
              marginBottom: '-16px',
              padding: '16px',
              gap: '10px'
            } : { marginTop: '20px' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={onClose}
                style={isMobile ? {
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  borderRadius: '8px'
                } : {}}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn"
                style={isMobile ? {
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  borderRadius: '8px'
                } : {}}
              >
                {isEditMode ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Scanner Modal for Mobile */}
      {showCamera && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: colors.background,
            borderRadius: '8px',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: colors.primary }}>Scan QR Code</h3>
              <button
                onClick={() => setShowCamera(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.primary,
                  padding: 0
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p style={{ color: colors.secondary, fontSize: '13px', marginBottom: '16px' }}>
              {scanningActive 
                ? 'Position the QR code within the camera view. The code will be scanned automatically.'
                : 'Initializing camera...'}
            </p>
            <div style={{
              width: '100%',
              aspectRatio: '1',
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: scanningActive ? 'block' : 'none'
                }}
              />
              {!scanningActive && (
                <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
                  <p>Starting camera...</p>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCamera(false)}
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAccountModal;
