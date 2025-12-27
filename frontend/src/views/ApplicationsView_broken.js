import React, { useState } from 'react';
import axios from 'axios';
import AddAccountModal from '../components/AddAccountModal';
import AccountCard from '../components/AccountCard';
import ContextMenu from '../components/ContextMenu';
import '../App.css';

const ApplicationsView = ({ 
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
  onProgressesChange
}) => {
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

  // Generate random 6-digit codes
  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
  };

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
      <div className="app-content">
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
            generateCode={generateCode}
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
      </div>
    );
  }

  return (
    <div className="app-content">
      <div className="content-area">
        <div className="content-header">
          <h2>Authentication Codes</h2>
          <button 
            className="btn-add"
            onClick={handleAddAccountClick}
          >
            <i className="fas fa-plus"></i>
            Add Account
          </button>
        </div>

        {/* Desktop Category Sidebar */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ minWidth: '200px' }}>
            <div className="category-list">
              <div 
                className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => onCategoryChange('all')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-key"></i>
                <span>All Accounts</span>
              </div>
              <div 
                className={`category-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
                onClick={() => onCategoryChange('favorites')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-star"></i>
                <span>Favorites</span>
              </div>
              <div style={{ paddingTop: '10px', paddingBottom: '10px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                CATEGORIES
              </div>
              <div 
                className={`category-item ${selectedCategory === 'Work' ? 'active' : ''}`}
                onClick={() => onCategoryChange('Work')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-briefcase"></i>
                <span>Work</span>
              </div>
              <div 
                className={`category-item ${selectedCategory === 'Personal' ? 'active' : ''}`}
                onClick={() => onCategoryChange('Personal')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-user"></i>
                <span>Personal</span>
              </div>
              <div 
                className={`category-item ${selectedCategory === 'Security' ? 'active' : ''}`}
                onClick={() => onCategoryChange('Security')}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-lock"></i>
                <span>Security</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
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
                />
              ))}
            </div>

            {filteredAccounts.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#718096'
              }}>
                <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '20px', display: 'block', opacity: 0.5 }}></i>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>No accounts yet</p>
                <p style={{ fontSize: '14px', marginBottom: '20px' }}>Add your first authentication code to get started</p>
                <button 
                  className="btn-add"
                  onClick={handleAddAccountClick}
                >
                  <i className="fas fa-plus"></i>
                  Add Your First Account
                </button>
              </div>
            )}
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
          generateCode={generateCode}
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
    </div>
  );
};

export default ApplicationsView;
