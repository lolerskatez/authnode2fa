import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeviceSyncTab = ({ appSettings, currentUser }) => {
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

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

  const showToast = (message, type = 'success') => {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`Toast [${type}]: ${message}`);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setDevicesLoading(true);
      const response = await axios.get('/api/sync/devices');
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleRegisterDevice = async () => {
    if (!deviceName.trim()) {
      showToast('Please enter a device name', 'warning');
      return;
    }

    try {
      setRegistering(true);
      await axios.post('/api/sync/register', {
        device_name: deviceName
      });
      setDeviceName('');
      setShowRegisterModal(false);
      await fetchDevices();
      showToast('Device registered successfully!', 'success');
    } catch (error) {
      console.error('Failed to register device:', error);
      showToast('Error registering device: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    // TODO: Replace with proper confirmation modal
    const confirmed = window.confirm('Are you sure you want to revoke access for this device?');
    if (!confirmed) return;

    try {
      await axios.post(`/api/sync/devices/${deviceId}/revoke`);
      await fetchDevices();
    } catch (error) {
      console.error('Failed to revoke device:', error);
      showToast('Error revoking device: ' + (error.response?.data?.detail || error.message), 'error');
    }
  };

  const handleSyncNow = async (deviceId) => {
    try {
      await axios.post(`/api/sync/devices/${deviceId}/sync`);
      await fetchDevices();
      showToast('Sync initiated!', 'success');
    } catch (error) {
      console.error('Failed to sync:', error);
      showToast('Error syncing: ' + (error.response?.data?.detail || error.message), 'error');
    }
  };

  const getDeviceIcon = (device) => {
    const userAgent = device.user_agent || '';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'fa-apple';
    } else if (userAgent.includes('Android')) {
      return 'fa-android';
    } else if (userAgent.includes('Windows')) {
      return 'fa-windows';
    } else if (userAgent.includes('Mac')) {
      return 'fa-apple';
    } else if (userAgent.includes('Linux')) {
      return 'fa-linux';
    }
    return 'fa-laptop';
  };

  return (
    <div>
      <div style={{ maxWidth: '900px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-sync" style={{ marginRight: '8px', color: colors.accent }}></i>
          Device Synchronization
        </h3>

        {/* Register Device Section */}
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
            Manage your devices and keep your authenticator accounts in sync
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
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
            Register Device
          </button>
        </div>

        {/* Info Box */}
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
          Your authenticator accounts are automatically synced across registered devices
        </div>

        {/* Devices List */}
        {devicesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.secondary }}>
            <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <div>No devices registered yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map(device => (
              <div
                key={device.id}
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
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.primary,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className={`fas ${getDeviceIcon(device)}`}></i>
                    {device.device_name}
                    {device.is_current && (
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        fontSize: '11px',
                        borderRadius: '3px',
                        fontWeight: '600'
                      }}>
                        Current Device
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: '4px' }}>
                    Registered: {new Date(device.registered_at).toLocaleString()}
                  </div>
                  {device.last_sync_at && (
                    <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: '4px' }}>
                      Last sync: {new Date(device.last_sync_at).toLocaleString()}
                    </div>
                  )}
                  {device.status && (
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: device.status === 'active' ? '#c6f6d5' : '#feebc8',
                        color: device.status === 'active' ? '#22543d' : '#7c2d12',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {device.status}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!device.is_current && (
                    <button
                      onClick={() => handleSyncNow(device.id)}
                      title="Sync this device now"
                      style={{
                        padding: '8px 12px',
                        backgroundColor: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-sync" style={{ marginRight: '4px' }}></i>
                      Sync
                    </button>
                  )}
                  {!device.is_current && (
                    <button
                      onClick={() => handleRevokeDevice(device.id)}
                      title="Revoke this device"
                      style={{
                        padding: '8px 12px',
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Register Device Modal */}
        {showRegisterModal && (
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
                Register New Device
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontWeight: '500', fontSize: '14px' }}>
                  Device Name
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., My iPhone, Work Desktop"
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
              <p style={{ color: colors.secondary, fontSize: '12px', margin: '0 0 16px 0' }}>
                This device will be registered and will automatically sync with your other devices.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setDeviceName('');
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
                  onClick={handleRegisterDevice}
                  disabled={registering}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: registering ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: registering ? 0.6 : 1
                  }}
                >
                  {registering ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceSyncTab;
