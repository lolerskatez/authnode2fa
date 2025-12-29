import React, { useState, useCallback } from 'react';
import axios from 'axios';
import AddAccountModal from '../components/AddAccountModal';
import AccountCard from '../components/AccountCard';
import ContextMenu from '../components/ContextMenu';
import '../App.css';

const AuthenticatorView = ({ 
  accounts, 
  codes, 
  timers, 
  progresses,
  currentUser,
  isMobile,
  selectedCategory,
  onCategoryChange,
  onAccountsChange,
  onCodesChange,
  onTimersChange,
  onProgressesChange,
  appSettings
}) => {
  // Theme-aware color helpers
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      accentDark: isDark ? '#3651d4' : '#3651d4',
      border: isDark ? '#4a5568' : '#e2e8f0',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundLight: isDark ? '#1a202c' : '#f0f4f8'
    };
  };

  const colors = getThemeColors();
  const [showModal, setShowModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [setupMethod, setSetupMethod] = useState('scan');
  const [accountNamePreview, setAccountNamePreview] = useState('');

  // Filter accounts based on selected category
  const filteredAccounts = accounts.filter(account => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return account.favorite;
    return account.category === selectedCategory;
  });

  // Fetch real TOTP code from backend API
  const fetchCode = useCallback(async (appId) => {
    try {
      const response = await axios.get(`/api/applications/${appId}/code`);
      const code = response.data.code;
      return code.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
    } catch (error) {
      console.error('Failed to fetch TOTP code:', error);
      return '--- ---';
    }
  }, []);

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
    setSetupMethod('scan');
    setShowModal(true);
  };

  const handleEditAccount = () => {
    setIsEditMode(true);
    setSetupMethod('manual');
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
      
      onAccountsChange(
        accounts.map(acc => 
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
        
        onAccountsChange(accounts.filter(acc => acc.id !== selectedAccount.id));
        
        const newCodes = { ...codes };
        const newTimers = { ...timers };
        const newProgresses = { ...progresses };
        delete newCodes[selectedAccount.id];
        delete newTimers[selectedAccount.id];
        delete newProgresses[selectedAccount.id];
        
        onCodesChange(newCodes);
        onTimersChange(newTimers);
        onProgressesChange(newProgresses);
        
        setShowContextMenu(false);
        setSelectedAccount(null);
      } catch (error) {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      }
    }
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setSelectedAccount(null);
  };

  if (isMobile) {
    return (
      <>
        <div className="accounts-list">
          {filteredAccounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              code={codes[account.id]}
              timer={timers[account.id]}
              progress={progresses[account.id]}
              onContextMenu={(e) => handleContextMenu(e, account)}
              isMobile={true}
              codeFormat={appSettings?.codeFormat || 'spaced'}
            />
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

        {showModal && (
          <AddAccountModal
            isEditMode={isEditMode}
            selectedAccount={selectedAccount}
            setupMethod={setupMethod}
            onSetupMethodChange={setSetupMethod}
            accountNamePreview={accountNamePreview}
            onAccountNameChange={setAccountNamePreview}
            onClose={() => setShowModal(false)}
            onAccountsChange={onAccountsChange}
            onCodesChange={onCodesChange}
            onTimersChange={onTimersChange}
            onProgressesChange={onProgressesChange}
            codes={codes}
            timers={timers}
            progresses={progresses}
            fetchCode={fetchCode}
            appSettings={appSettings}
          />
        )}

        {showContextMenu && (
          <ContextMenu
            position={contextMenuPosition}
            account={selectedAccount}
            onEdit={handleEditAccount}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteAccount}
            onClose={handleCloseContextMenu}
          />
        )}
      </>
    );
  }

  // Desktop View
  return (
    <>
      <div className="content-area">
        <div className="search-box" style={{ marginBottom: '12px' }}>
          <i className="fas fa-search" style={{ color: colors.secondary }}></i>
          <input type="text" placeholder="Search accounts..." />
        </div>
        <div className="content-header">
          <h2>Authenticator</h2>
          {filteredAccounts.length > 0 && (
            <button 
              className="btn-add"
              onClick={handleAddAccountClick}
            >
              <i className="fas fa-plus"></i>
              Add Account
            </button>
          )}
        </div>

        <div className="accounts-grid">
          {filteredAccounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              code={codes[account.id]}
              timer={timers[account.id]}
              progress={progresses[account.id]}
              onContextMenu={(e) => handleContextMenu(e, account)}
              isMobile={false}
              codeFormat={appSettings?.codeFormat || 'spaced'}
            />
          ))}
        </div>

        {filteredAccounts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            maxWidth: '450px',
            margin: '40px auto'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 24px',
              backgroundColor: colors.backgroundLight,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-shield-alt" style={{ 
                fontSize: '48px', 
                color: colors.accent,
                opacity: 0.8
              }}></i>
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              marginBottom: '10px',
              color: colors.primary
            }}>
              No accounts yet
            </h3>
            <p style={{ 
              fontSize: '14px', 
              marginBottom: '24px',
              color: colors.secondary,
              lineHeight: '1.5'
            }}>
              Add your first authentication code to get started securing your accounts
            </p>
            <button 
              onClick={handleAddAccountClick}
              style={{
                padding: '12px 24px',
                backgroundColor: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: `0 4px 12px ${colors.accent}4d`,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.accentDark;
                e.currentTarget.style.boxShadow = `0 6px 16px ${colors.accent}66`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.accent;
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accent}4d`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-plus-circle"></i>
              Add Your First Account
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddAccountModal
          isEditMode={isEditMode}
          selectedAccount={selectedAccount}
          setupMethod={setupMethod}
          onSetupMethodChange={setSetupMethod}
          accountNamePreview={accountNamePreview}
          onAccountNameChange={setAccountNamePreview}
          onClose={() => setShowModal(false)}
          onAccountsChange={onAccountsChange}
          onCodesChange={onCodesChange}
          onTimersChange={onTimersChange}
          onProgressesChange={onProgressesChange}
          codes={codes}
          timers={timers}
          progresses={progresses}
          fetchCode={fetchCode}
          appSettings={appSettings}
        />
      )}

      {showContextMenu && (
        <ContextMenu
          position={contextMenuPosition}
          account={selectedAccount}
          onEdit={handleEditAccount}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteAccount}
          onClose={handleCloseContextMenu}
        />
      )}
    </>
  );
};

export default AuthenticatorView;
