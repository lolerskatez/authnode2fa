import React, { useState, useEffect } from 'react';
import axios from 'axios';

const APIKeysTab = ({ appSettings }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Theme-aware colors
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#cbd5e0' : '#718096',
      accent: isDark ? '#63b3ed' : '#4361ee',
      accentLight: isDark ? '#2c5282' : '#e6f0ff',
      border: isDark ? '#4a5568' : '#e2e8f0',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundSecondary: isDark ? '#1a202c' : '#f7fafc',
      success: '#68d391',
      danger: isDark ? '#fc8181' : '#f56565'
    };
  };

  const colors = getThemeColors();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setApiKeysLoading(true);
      const response = await axios.get('/api/admin/api-keys/list');
      setApiKeys(response.data || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const response = await axios.post('/api/admin/api-keys/generate');
      setNewKeyData(response.data);
      setShowKeyModal(true);
      await fetchApiKeys();
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('Error generating API key: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await axios.post(`/api/admin/api-keys/${keyId}/revoke`);
      await fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Error revoking API key: ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div>
      <div style={{ maxWidth: '900px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-code" style={{ marginRight: '8px', color: colors.accent }}></i>
          API Keys
        </h3>

        {/* Generate Key Button */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ margin: 0, color: colors.secondary, fontSize: '13px' }}>
            Create a new API key for programmatic access to your account
          </p>
          <button
            onClick={handleGenerateKey}
            style={{
              padding: '10px 16px',
              backgroundColor: colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
            Generate New Key
          </button>
        </div>

        {/* API Keys List */}
        {apiKeysLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <div>No API keys created yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apiKeys.map(key => (
              <div
                key={key.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: colors.secondary, marginBottom: '4px' }}>
                    {key.key_prefix}...
                  </div>
                  <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: '8px' }}>
                    Created: {new Date(key.created_at).toLocaleString()}
                  </div>
                  {key.last_used_at && (
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      Last used: {new Date(key.last_used_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New Key Modal */}
        {showKeyModal && newKeyData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              width: '90%'
            }}>
              <h3 style={{ marginTop: 0, color: colors.primary, marginBottom: '16px' }}>
                API Key Generated
              </h3>
              <p style={{ color: colors.secondary, marginBottom: '12px', fontSize: '13px' }}>
                Save this key securely. You won't be able to see it again.
              </p>
              <div style={{
                padding: '12px',
                backgroundColor: colors.backgroundSecondary,
                borderRadius: '6px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                fontSize: '12px',
                color: colors.primary
              }}>
                {newKeyData.key}
              </div>
              <button
                onClick={() => copyToClipboard(newKeyData.key)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px'
                }}
              >
                <i className="fas fa-copy" style={{ marginRight: '6px' }}></i>
                {copiedKey ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.primary,
                  border: `1px solid ${colors.border}`,
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
    </div>
  );
};

export default APIKeysTab;
