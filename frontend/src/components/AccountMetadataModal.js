import React, { useState } from 'react';
import axios from 'axios';

const AccountMetadataModal = ({ account, onClose, onAccountUpdate, appSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAccount, setEditedAccount] = useState({
    name: account.name || '',
    username: account.username || '',
    url: account.url || '',
    notes: account.notes || '',
    icon: account.icon || 'fab fa-key',
    color: account.color || '#6B46C1',
    category: account.category || 'Personal',
    favorite: account.favorite || false
  });
  const [loading, setLoading] = useState(false);

  // Theme-aware colors
  const colors = {
    primary: appSettings?.theme === 'dark' ? '#e2e8f0' : '#2d3748',
    secondary: appSettings?.theme === 'dark' ? '#cbd5e0' : '#718096',
    accent: appSettings?.theme === 'dark' ? '#63b3ed' : '#4361ee',
    border: appSettings?.theme === 'dark' ? '#4a5568' : '#e2e8f0',
    background: appSettings?.theme === 'dark' ? '#2d3748' : '#ffffff',
    backgroundSecondary: appSettings?.theme === 'dark' ? '#1a202c' : '#f7fafc'
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await axios.put(`/api/applications/${account.id}`, editedAccount);
      onAccountUpdate({ ...account, ...editedAccount });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update account:', error);
      alert('Failed to update account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedAccount(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  return (
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
        backgroundColor: colors.background,
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            color: colors.primary,
            fontSize: '20px',
            fontWeight: '600'
          }}>
            <i className={account.icon} style={{ marginRight: '8px', color: account.color }}></i>
            {account.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: colors.secondary
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: colors.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Account Name
              </label>
              <input
                type="text"
                value={editedAccount.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: colors.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Username
              </label>
              <input
                type="text"
                value={editedAccount.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Your username for this account"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: colors.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Website URL
              </label>
              <input
                type="url"
                value={editedAccount.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: colors.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Notes
              </label>
              <textarea
                value={editedAccount.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this account..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: colors.primary,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '14px'
            }}>
              <div>
                <span style={{ color: colors.secondary, fontWeight: '500' }}>Name:</span>
                <div style={{ color: colors.primary, marginTop: '2px' }}>{account.name}</div>
              </div>
              <div>
                <span style={{ color: colors.secondary, fontWeight: '500' }}>Category:</span>
                <div style={{ color: colors.primary, marginTop: '2px' }}>{account.category}</div>
              </div>
              <div>
                <span style={{ color: colors.secondary, fontWeight: '500' }}>Username:</span>
                <div style={{ color: colors.primary, marginTop: '2px' }}>
                  {account.username || <span style={{ color: colors.secondary, fontStyle: 'italic' }}>Not set</span>}
                </div>
              </div>
              <div>
                <span style={{ color: colors.secondary, fontWeight: '500' }}>Website:</span>
                <div style={{ color: colors.primary, marginTop: '2px' }}>
                  {account.url ? (
                    <a
                      href={formatUrl(account.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: colors.accent, textDecoration: 'none' }}
                    >
                      {account.url} <i className="fas fa-external-link-alt" style={{ fontSize: '12px' }}></i>
                    </a>
                  ) : (
                    <span style={{ color: colors.secondary, fontStyle: 'italic' }}>Not set</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: colors.secondary, fontWeight: '500', fontSize: '14px' }}>Notes:</span>
              <div style={{
                color: colors.primary,
                marginTop: '4px',
                padding: '8px',
                backgroundColor: colors.backgroundSecondary,
                borderRadius: '4px',
                minHeight: '40px',
                whiteSpace: 'pre-wrap'
              }}>
                {account.notes || <span style={{ color: colors.secondary, fontStyle: 'italic' }}>No notes</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                Edit Details
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountMetadataModal;
