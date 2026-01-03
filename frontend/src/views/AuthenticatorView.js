import React, { useState, useCallback } from 'react';
import axios from 'axios';
import AddAccountModal from '../components/AddAccountModal';
import AccountCard from '../components/AccountCard';
import AccountMetadataModal from '../components/AccountMetadataModal';
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importConflictAction, setImportConflictAction] = useState('skip');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Metadata modal state
  const [selectedAccountForMetadata, setSelectedAccountForMetadata] = useState(null);

  // Drag and drop state
  const [draggedAccount, setDraggedAccount] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Update filtered accounts to use backend API with debounced search
  const fetchFilteredAccounts = useCallback(async () => {
    try {
      setIsSearching(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'favorites') {
          params.favorite = true;
        } else {
          params.category = selectedCategory;
        }
      }

      const response = await axios.get('/api/applications/', { params });
      const applications = response.data;

      onAccountsChange(applications.map(app => ({
        id: app.id,
        name: app.name,
        email: '',
        icon: app.icon || 'fab fa-key',
        color: app.color || '#6B46C1',
        category: app.category || 'Personal',
        favorite: app.favorite || false
      })));
    } catch (error) {
      console.error('Failed to fetch filtered accounts:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategory, onAccountsChange]);

  // Debounced search effect
  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const newTimer = setTimeout(() => {
      fetchFilteredAccounts();
    }, 300); // 300ms debounce
    
    setDebounceTimer(newTimer);
    
    return () => {
      if (newTimer) {
        clearTimeout(newTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, fetchFilteredAccounts]);

  // Filter accounts based on selected category and search query (fallback for local filtering if needed)
  const filteredAccounts = accounts;

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

  const handleExportAccounts = async () => {
    try {
      const response = await axios.post('/api/applications/export');
      const exportData = response.data;
      
      // Convert to JSON and download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `2fa-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${exportData.account_count} accounts!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export accounts. Please try again.');
    }
  };

  const handleImportAccounts = async (file) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Make import request
      const response = await axios.post('/api/applications/import', {
        accounts: importData.accounts,
        conflict_action: importConflictAction
      });
      
      // Reload accounts
      const appsResponse = await axios.get('/api/applications');
      onAccountsChange(appsResponse.data.map(app => ({
        id: app.id,
        name: app.name,
        email: '',
        icon: app.icon || 'fab fa-key',
        color: app.color || '#6B46C1',
        category: app.category || 'Personal',
        favorite: app.favorite || false
      })));
      
      setShowImportDialog(false);
      alert(`Import complete!\nImported: ${response.data.imported}\nSkipped: ${response.data.skipped}\nOverwritten: ${response.data.overwritten}${response.data.errors.length > 0 ? '\nErrors: ' + response.data.errors.length : ''}`);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import accounts. Please check the file format and try again.');
    }
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

  // Metadata modal handlers
  const handleShowMetadata = (account) => {
    setSelectedAccountForMetadata(account);
  };

  const handleCloseMetadata = () => {
    setSelectedAccountForMetadata(null);
  };

  const handleAccountUpdate = (updatedAccount) => {
    onAccountsChange(
      accounts.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e, account) => {
    setDraggedAccount(account);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedAccount(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedAccount) return;

    const draggedIndex = filteredAccounts.findIndex(acc => acc.id === draggedAccount.id);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    // Reorder the accounts array
    const newAccounts = [...filteredAccounts];
    const [removed] = newAccounts.splice(draggedIndex, 1);
    newAccounts.splice(dropIndex, 0, removed);

    try {
      // Use the dedicated move endpoint for reordering
      await axios.put(`/api/applications/${draggedAccount.id}/move?position=${dropIndex}`);
      
      // Update the local accounts list with new order
      onAccountsChange(newAccounts);
    } catch (error) {
      console.error('Failed to update account order:', error);
      alert('Failed to update account order. Please try again.');
    }

    setDraggedAccount(null);
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

        {/* Floating Add Button for Mobile */}
        <button
          onClick={handleAddAccountClick}
          style={{
            position: 'fixed',
            bottom: '110px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#4361ee',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(67, 97, 238, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 999,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(67, 97, 238, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 97, 238, 0.4)';
          }}
        >
          <i className="fas fa-plus"></i>
        </button>

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
          <i className={`fas ${isSearching ? 'fa-spinner fa-spin' : 'fa-search'}`} style={{ color: colors.secondary }}></i>
          <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: colors.background,
              color: colors.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              padding: '8px 12px'
            }}
          />
        </div>
        <div className="content-header">
          <h2>Authenticator</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {filteredAccounts.length > 0 && (
              <>
                <button 
                  className="btn-add"
                  onClick={handleExportAccounts}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px'
                  }}
                  title="Export all accounts as JSON"
                >
                  <i className="fas fa-download"></i>
                  Export
                </button>
                <button 
                  className="btn-add"
                  onClick={() => setShowImportDialog(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px'
                  }}
                  title="Import accounts from JSON file"
                >
                  <i className="fas fa-upload"></i>
                  Import
                </button>
              </>
            )}
            <button 
              className="btn-add"
              onClick={handleAddAccountClick}
            >
              <i className="fas fa-plus"></i>
              Add Account
            </button>
          </div>
        </div>

        <div className="accounts-grid">
          {filteredAccounts.map((account, index) => (
            <div
              key={account.id}
              draggable={!isMobile}
              onDragStart={(e) => handleDragStart(e, account)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                opacity: draggedAccount?.id === account.id ? 0.5 : 1,
                border: dragOverIndex === index ? '2px dashed #4361ee' : 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <AccountCard
                account={account}
                code={codes[account.id]}
                timer={timers[account.id]}
                progress={progresses[account.id]}
                onContextMenu={(e) => handleContextMenu(e, account)}
                isMobile={false}
                codeFormat={appSettings?.codeFormat || 'spaced'}
                onShowMetadata={handleShowMetadata}
                appSettings={appSettings}
              />
            </div>
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

        {selectedAccountForMetadata && (
          <AccountMetadataModal
            account={selectedAccountForMetadata}
            onClose={handleCloseMetadata}
            onAccountUpdate={handleAccountUpdate}
            appSettings={appSettings}
          />
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

      {showImportDialog && (
        <div className="context-menu-overlay" onClick={() => setShowImportDialog(false)}>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
              <i className="fas fa-upload" style={{ marginRight: '8px', color: colors.accent }}></i>
              Import Accounts
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontWeight: '500', fontSize: '14px' }}>
                What should happen if an account name already exists?
              </label>
              <select 
                value={importConflictAction}
                onChange={(e) => setImportConflictAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.primary,
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="skip">Skip (keep existing)</option>
                <option value="overwrite">Overwrite (replace existing)</option>
                <option value="merge">Merge (combine all)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontWeight: '500', fontSize: '14px' }}>
                Select export file
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImportAccounts(e.target.files[0]);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `2px dashed ${colors.border}`,
                  backgroundColor: colors.backgroundLight,
                  color: colors.primary,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              />
            </div>

            <p style={{ 
              fontSize: '12px', 
              color: colors.secondary, 
              margin: '0 0 16px 0',
              lineHeight: '1.5'
            }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px', color: colors.accent }}></i>
              Upload a JSON file exported from this app. Your encrypted secrets remain secure.
            </p>

            <button
              onClick={() => setShowImportDialog(false)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: colors.accent,
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthenticatorView;
