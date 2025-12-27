import React, { useEffect } from 'react';
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
  generateCode,
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

        // Initialize code, timer, and progress
        const newCodes = { ...codes, [newAccount.id]: generateCode() };
        const newTimers = { ...timers, [newAccount.id]: 30 };
        const newProgresses = { ...progresses, [newAccount.id]: 100 };

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
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Account' : 'Add New Account'}</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleAddAccount}>
            <div className="form-grid">
              <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="accountName">Account Name</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="text" 
                    id="accountName" 
                    className="form-control" 
                    placeholder="e.g., Google, Facebook, etc."
                    name="accountName"
                    onChange={(e) => onAccountNameChange(e.target.value)}
                    style={{ flex: 1 }}
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                  <input 
                    type="checkbox" 
                    id="accountFavorite" 
                    name="accountFavorite"
                    style={{ margin: 0 }}
                  />
                  <span>Add to Favorites</span>
                </label>
              </div>
            </div>

            {!isEditMode && (
              <>
                <div className="form-group form-group-full">
                  <label>Setup Method</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      className={`btn ${setupMethod === 'scan' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={{ flex: 1 }} 
                      type="button"
                      onClick={() => onSetupMethodChange('scan')}
                    >
                      <i className="fas fa-qrcode"></i> Scan QR Code
                    </button>
                    <button 
                      className={`btn ${setupMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={{ flex: 1 }} 
                      type="button"
                      onClick={() => onSetupMethodChange('manual')}
                    >
                      <i className="fas fa-keyboard"></i> Manual Entry
                    </button>
                  </div>
                </div>

                {setupMethod === 'scan' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="qrFile">Upload QR Code Image</label>
                    <input 
                      type="file" 
                      id="qrFile" 
                      className="form-control" 
                      accept="image/*"
                      name="qrFile"
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Upload a screenshot or photo of the QR code from your service
                    </small>
                  </div>
                )}

                {setupMethod === 'manual' && (
                  <div className="form-group form-group-full">
                    <label htmlFor="manualSecret">Secret Key</label>
                    <input 
                      type="text" 
                      id="manualSecret" 
                      className="form-control" 
                      placeholder="Enter your 2FA secret key (e.g., JBSWY3DPEHPK3PXP)"
                      name="manualSecret"
                    />
                    <small style={{ color: colors.secondary, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      The secret key is usually found in the advanced settings of your 2FA setup
                    </small>
                  </div>
                )}
              </>
            )}

            <div className="btn-group" style={{ marginTop: '20px' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={onClose}
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
  );
};

export default AddAccountModal;
