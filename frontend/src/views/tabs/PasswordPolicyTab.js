import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PasswordPolicyTab = ({ appSettings }) => {
  const [policy, setPolicy] = useState({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    expiration_days: 0,
    history_count: 0,
    lockout_attempts: 5,
    lockout_duration_minutes: 15
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      success: '#68d391'
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

  const fetchPolicy = async () => {
    try {
      setPolicyLoading(true);
      const response = await axios.get('/api/admin/password-policy');
      setPolicy(response.data || policy);
    } catch (error) {
      console.error('Failed to fetch password policy:', error);
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePolicy = async () => {
    try {
      setSaving(true);
      await axios.put('/api/admin/password-policy', policy);
      showToast('Password policy saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save password policy:', error);
      showToast('Error saving policy: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPolicy({ ...policy, [field]: value });
  };

  const handleToggle = (field) => {
    setPolicy({ ...policy, [field]: !policy[field] });
  };

  if (policyLoading) {
    return <div style={{ color: colors.secondary }}>Loading policy...</div>;
  }

  return (
    <div>
      <div style={{ maxWidth: '700px' }}>
        <h3 style={{ marginBottom: '24px', color: colors.primary, fontSize: '18px', fontWeight: '600' }}>
          <i className="fas fa-lock" style={{ marginRight: '8px', color: colors.accent }}></i>
          Password Policy
        </h3>

        {/* Complexity Requirements */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            Complexity Requirements
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { field: 'require_uppercase', label: 'Require Uppercase Letters (A-Z)' },
              { field: 'require_lowercase', label: 'Require Lowercase Letters (a-z)' },
              { field: 'require_numbers', label: 'Require Numbers (0-9)' },
              { field: 'require_special_chars', label: 'Require Special Characters (!@#$%...)' }
            ].map(item => (
              <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id={item.field}
                  checked={policy[item.field]}
                  onChange={() => handleToggle(item.field)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor={item.field} style={{
                  cursor: 'pointer',
                  color: colors.primary,
                  fontSize: '14px',
                  margin: 0
                }}>
                  {item.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Length Requirement */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            Length Requirements
          </h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontSize: '14px', fontWeight: '500' }}>
              Minimum Password Length: <strong>{policy.min_length}</strong> characters
            </label>
            <input
              type="range"
              min="6"
              max="20"
              value={policy.min_length}
              onChange={(e) => handleInputChange('min_length', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Expiration */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            Password Expiration
          </h4>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontSize: '14px', fontWeight: '500' }}>
              Expire passwords after (days) - 0 = Never expire
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={policy.expiration_days}
              onChange={(e) => handleInputChange('expiration_days', parseInt(e.target.value))}
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
        </div>

        {/* Password History */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            Password History
          </h4>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontSize: '14px', fontWeight: '500' }}>
              Remember previous passwords (0 = disabled)
            </label>
            <input
              type="number"
              min="0"
              max="24"
              value={policy.history_count}
              onChange={(e) => handleInputChange('history_count', parseInt(e.target.value))}
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
        </div>

        {/* Account Lockout */}
        <div style={{
          padding: '20px',
          backgroundColor: colors.background,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.primary, fontSize: '14px', fontWeight: '600' }}>
            Account Lockout Policy
          </h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontSize: '14px', fontWeight: '500' }}>
              Failed login attempts before lockout
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={policy.lockout_attempts}
              onChange={(e) => handleInputChange('lockout_attempts', parseInt(e.target.value))}
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.primary, fontSize: '14px', fontWeight: '500' }}>
              Lockout duration (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={policy.lockout_duration_minutes}
              onChange={(e) => handleInputChange('lockout_duration_minutes', parseInt(e.target.value))}
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
        </div>

        {/* Policy Preview */}
        <div style={{
          padding: '16px',
          backgroundColor: '#e6f0ff',
          borderRadius: '8px',
          border: `1px solid #63b3ed`,
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#2c5282', fontSize: '13px', fontWeight: '600' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
            Policy Preview
          </h4>
          <div style={{ fontSize: '12px', color: '#2c5282' }}>
            <div>Minimum {policy.min_length} characters</div>
            {policy.require_uppercase && <div>• Requires uppercase letters</div>}
            {policy.require_lowercase && <div>• Requires lowercase letters</div>}
            {policy.require_numbers && <div>• Requires numbers</div>}
            {policy.require_special_chars && <div>• Requires special characters</div>}
            {policy.expiration_days > 0 && <div>• Expires after {policy.expiration_days} days</div>}
            <div>• Account lockout after {policy.lockout_attempts} failed attempts for {policy.lockout_duration_minutes} minutes</div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <button
            onClick={handleSavePolicy}
            disabled={saving}
            style={{
              padding: '10px 16px',
              backgroundColor: '#4361ee',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saving ? 0.6 : 1
            }}
          >
            <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
            {saving ? 'Saving...' : 'Save Password Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordPolicyTab;
