import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BackupsTab = ({ appSettings }) => {
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [autoBackupsEnabled, setAutoBackupsEnabled] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restorePassword, setRestorePassword] = useState('');

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
      danger: isDark ? '#fc8181' : '#f56565',
      warning: isDark ? '#f6e05e' : '#ed8936'
    };
  };

  const colors = getThemeColors();

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setBackupsLoading(true);
      const response = await axios.get('/api/admin/backups/list');
      setBackups(response.data || []);
      // Check if auto backups are enabled
      const settingsResponse = await axios.get('/api/admin/settings');
      setAutoBackupsEnabled(settingsResponse.data?.auto_backups_enabled || false);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      await axios.post('/api/admin/backups/create');
      await fetchBackups();
      alert('Backup created successfully!');
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('Error creating backup: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup || !restorePassword) {
      alert('Please select a backup and enter your password');
      return;
    }

    try {
      await axios.post(`/api/admin/backups/${selectedBackup.id}/restore`, {
        password: restorePassword
      });
      setShowRestoreModal(false);
      setRestorePassword('');
      alert('Backup restored successfully! Please refresh the page.');
      await fetchBackups();
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Error restoring backup: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (backupId) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;

    try {
      await axios.delete(`/api/admin/backups/${backupId}`);
      await fetchBackups();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert('Error deleting backup: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div style={{ maxWidth: '1000px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-save" style={{ marginRight: '8px', color: colors.accent }}></i>
          Database Backups
        </h3>

        {/* Backup Actions */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              style={{
                padding: '10px 16px',
                backgroundColor: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: creatingBackup ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: creatingBackup ? 0.6 : 1
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
              {creatingBackup ? 'Creating...' : 'Create Backup Now'}
            </button>
            <button
              onClick={fetchBackups}
              style={{
                padding: '10px 16px',
                backgroundColor: colors.backgroundSecondary,
                color: colors.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Auto Backups Status */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: colors.accentLight,
          borderRadius: '6px',
          borderLeft: `4px solid ${colors.accent}`,
          marginBottom: '16px',
          fontSize: '13px',
          color: colors.primary
        }}>
          <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
          Auto backups are currently <strong>{autoBackupsEnabled ? 'enabled' : 'disabled'}</strong>
        </div>

        {/* Backups List */}
        {backupsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <div>No backups found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.backgroundSecondary }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                    Created
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                    Size
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', color: colors.primary, fontWeight: '600', fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px', color: colors.primary, fontSize: '13px' }}>
                      {new Date(backup.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: colors.primary, fontSize: '13px' }}>
                      {formatBytes(backup.size_bytes || 0)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: backup.status === 'completed' ? '#c6f6d5' : '#feebc8',
                        color: backup.status === 'completed' ? '#22543d' : '#7c2d12',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {backup.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginRight: '6px'
                        }}
                      >
                        <i className="fas fa-undo" style={{ marginRight: '4px' }}></i>
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: colors.danger,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Restore Modal */}
        {showRestoreModal && selectedBackup && (
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
                Restore Backup
              </h3>
              <p style={{ color: colors.secondary, marginBottom: '16px' }}>
                Created: {new Date(selectedBackup.created_at).toLocaleString()}
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontWeight: '500', fontSize: '14px' }}>
                  Password (for confirmation)
                </label>
                <input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.primary
                  }}
                />
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fff5f5', borderRadius: '6px', marginBottom: '16px' }}>
                <p style={{ margin: 0, color: '#c53030', fontSize: '13px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  This will overwrite the current database. This action cannot be undone.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestorePassword('');
                  }}
                  style={{
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
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <i className="fas fa-undo" style={{ marginRight: '6px' }}></i>
                  Restore Backup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupsTab;
