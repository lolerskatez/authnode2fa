import React, { useState, useEffect } from 'react';
import './Auth.css';

function UserManagement({ currentUser, onClose, isEmbedded = false, appSettings }) {
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme-aware color helpers
  const getThemeColors = () => {
    const isDark = appSettings?.theme === 'dark';
    return {
      primary: isDark ? '#e2e8f0' : '#2d3748',
      secondary: isDark ? '#a0aec0' : '#718096',
      tertiary: isDark ? '#cbd5e0' : '#4a5568',
      accent: isDark ? '#63b3ed' : '#4361ee',
      border: isDark ? '#4a5568' : '#e2e8f0',
      background: isDark ? '#2d3748' : '#ffffff',
      backgroundSecondary: isDark ? '#1a202c' : '#f7fafc',
      adminBg: isDark ? '#1e3a5f' : '#bee3f8',
      adminText: isDark ? '#63b3ed' : '#2c5aa0',
      userBg: isDark ? '#22433a' : '#c6f6d5',
      userText: isDark ? '#68d391' : '#22543d',
      ssoBg: isDark ? '#2c4a6e' : '#e6f3ff',
      ssoText: isDark ? '#90cdf4' : '#0066cc',
      localBg: isDark ? '#2d4a3e' : '#f0fff4',
      localText: isDark ? '#276749' : '#276749',
      success: isDark ? '#48bb78' : '#48bb78',
      danger: isDark ? '#fc8181' : '#f56565',
      dangerLight: isDark ? '#9b2c2c' : '#fed7d7',
      avatarBg: isDark ? '#4a5568' : '#a0aec0'
    };
  };

  const colors = getThemeColors();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user'
    });
    setShowForm(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');

      if (editingUser) {
        // Update existing user
        if (formData.email && formData.email !== editingUser.email) {
          const emailResponse = await fetch(`/api/users/${editingUser.id}/email`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: formData.email })
          });
          if (!emailResponse.ok) throw new Error('Failed to update email');
        }

        if (formData.password) {
          const pwResponse = await fetch(`/api/users/${editingUser.id}/password`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: formData.password })
          });
          if (!pwResponse.ok) throw new Error('Failed to update password');
        }

        if (formData.role !== editingUser.role) {
          const roleResponse = await fetch(`/api/users/${editingUser.id}/role`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: formData.role })
          });
          if (!roleResponse.ok) throw new Error('Failed to update role');
        }

        showToast('User updated successfully!');
      } else {
        // Create new user
        const createResponse = await fetch('/api/users/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.email.split('@')[0], // Generate username from email
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role
          })
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.detail || 'Failed to create user');
        }

        showToast('User created successfully!');
      }

      setShowForm(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user'
      });
      loadUsers();
    } catch (err) {
      console.error('Error submitting user:', err);
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      setError('Cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userId));
      setShowForm(false);
      setEditingUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const getUserInitials = (name) => {
    return name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
  };

  // Card container style
  const cardStyle = {
    padding: '16px',
    backgroundColor: colors.background,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    marginBottom: '16px'
  };

  if (isEmbedded) {
    return (
      <div style={{ padding: isMobile ? '12px' : '20px' }}>
        {toast.show && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            backgroundColor: toast.type === 'success' ? '#48bb78' : '#f56565',
            color: 'white',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            {toast.message}
          </div>
        )}

        {/* Page Header */}
        <h3 style={{ 
          marginBottom: '24px', 
          color: colors.primary, 
          fontSize: isMobile ? '16px' : '18px', 
          fontWeight: '600',
          marginTop: 0
        }}>
          <i className="fas fa-users-cog" style={{ marginRight: '8px', color: colors.accent }}></i>
          User Management
        </h3>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.dangerLight,
            color: colors.danger,
            borderRadius: '6px',
            marginBottom: '16px',
            border: `1px solid ${colors.danger}`
          }}>
            {error}
          </div>
        )}

        {/* Actions Card */}
        <div style={cardStyle}>
          <div style={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '0'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: colors.primary, fontSize: isMobile ? '13px' : '14px', fontWeight: '600' }}>
                <i className="fas fa-user-plus" style={{ marginRight: '8px', color: colors.accent }}></i>
                Manage Users
              </h4>
              <p style={{ margin: 0, color: colors.secondary, fontSize: '12px' }}>
                {users.length} user{users.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
              <button
                onClick={loadUsers}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: colors.accent,
                  border: `1px solid ${colors.accent}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: isMobile ? '1' : 'auto',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-sync"></i>
                {!isMobile && 'Refresh'}
              </button>
              <button
                onClick={handleAddUser}
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: isMobile ? '1' : 'auto',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-user-plus"></i>
                {!isMobile && 'Add User'}
              </button>
            </div>
          </div>
        </div>

        {/* Users List Card */}
        <div style={cardStyle}>
        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.secondary
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.secondary
          }}>
            <i className="fas fa-users" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.5 }}></i>
            <p style={{ margin: 0 }}>No users found</p>
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((user) => (
              <div key={user.id} style={{
                padding: '12px',
                backgroundColor: colors.backgroundSecondary,
                borderRadius: '6px',
                border: `1px solid ${colors.border}`
              }}>
                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: colors.avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {getUserInitials(user.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: colors.primary, fontSize: '14px', marginBottom: '2px' }}>
                      {user.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                {/* User Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  {/* Email */}
                  <div>
                    <div style={{ fontSize: '11px', color: colors.secondary, fontWeight: '500', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '12px', color: colors.primary, wordBreak: 'break-word' }}>
                      {user.email}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <div style={{ fontSize: '11px', color: colors.secondary, fontWeight: '500', marginBottom: '4px' }}>Role</div>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: user.role === 'admin' ? colors.adminBg : colors.userBg,
                      color: user.role === 'admin' ? colors.adminText : colors.userText,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {user.role}
                    </span>
                  </div>

                  {/* Type */}
                  <div>
                    <div style={{ fontSize: '11px', color: colors.secondary, fontWeight: '500', marginBottom: '4px' }}>Type</div>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: user.is_sso_user ? colors.ssoBg : colors.localBg,
                      color: user.is_sso_user ? colors.ssoText : colors.localText,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {user.is_sso_user ? 'SSO' : 'Local'}
                    </span>
                  </div>

                  {/* Created */}
                  <div>
                    <div style={{ fontSize: '11px', color: colors.secondary, fontWeight: '500', marginBottom: '4px' }}>Created</div>
                    <div style={{ fontSize: '12px', color: colors.primary }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditClick(user)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: colors.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  {currentUser.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: colors.dangerLight,
                        color: colors.danger,
                        border: `1px solid ${colors.danger}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop Table View
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>User</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>Email</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>Role</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>Created</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: colors.primary, fontSize: '13px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} style={{ borderBottom: index < users.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: colors.avatarBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {getUserInitials(user.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: colors.primary }}>{user.name || 'Unknown'}</div>
                          <div style={{ fontSize: '12px', color: colors.secondary }}>@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: colors.primary }}>{user.email}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: user.role === 'admin' ? colors.adminBg : colors.userBg,
                        color: user.role === 'admin' ? colors.adminText : colors.userText,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-block'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: user.is_sso_user ? colors.ssoBg : colors.localBg,
                        color: user.is_sso_user ? colors.ssoText : colors.localText,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-block'
                      }}>
                        {user.is_sso_user ? 'SSO' : 'Local'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: colors.secondary, fontSize: '12px' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEditClick(user)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>

        {showForm && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal" style={{ backgroundColor: colors.background, borderRadius: isMobile ? '12px 12px 0 0' : '8px', padding: '0', maxWidth: '500px', width: '100%', maxHeight: isMobile ? '95vh' : '90vh', overflow: 'auto', border: `1px solid ${colors.border}` }}>
              <div className="modal-header" style={{ padding: isMobile ? '16px' : '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.accent }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: isMobile ? '16px' : '18px' }}>
                  {editingUser ? `Edit ${editingUser.name}` : 'Add New User'}
                </h3>
                <button
                  onClick={handleCloseForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'white',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      autoComplete="off"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.secondaryBg,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      autoComplete="off"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.secondaryBg,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                      {editingUser ? 'New Password (leave empty to keep current)' : 'Password (min 6 characters)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Leave empty to keep current' : 'At least 6 characters'}
                      autoComplete="new-password"
                      required={!editingUser}
                      minLength={editingUser ? undefined : 6}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: colors.secondaryBg,
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      disabled={editingUser && editingUser.id === currentUser.id}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: editingUser && editingUser.id === currentUser.id ? colors.border : colors.secondaryBg,
                        color: colors.primary,
                        cursor: editingUser && editingUser.id === currentUser.id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    {editingUser && editingUser.id === currentUser.id && (
                      <p style={{ color: colors.secondary, fontSize: '12px', marginTop: '6px' }}>
                        You cannot change your own role
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        style={{
                          padding: '10px 20px',
                          backgroundColor: colors.success,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {editingUser ? 'Update User' : 'Create User'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: colors.secondary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {editingUser && editingUser.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(editingUser.id)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: colors.danger,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fas fa-trash"></i>
                        Delete User
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          backgroundColor: toast.type === 'success' ? colors.success : colors.danger,
          color: 'white',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}
      <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>User Management</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: colors.dangerLight,
              color: colors.danger,
              borderRadius: '6px',
              marginBottom: '16px',
              border: `1px solid ${colors.danger}`
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAddUser}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-user-plus"></i>
              Add User
            </button>
            <button
              onClick={loadUsers}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-sync"></i>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: colors.secondary
            }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: colors.backgroundSecondary,
              borderRadius: '8px',
              color: colors.secondary
            }}>
              <p>No users found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: colors.primary }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: colors.primary }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: colors.primary }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: colors.primary }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: colors.primary }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: colors.primary }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: colors.avatarBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            {getUserInitials(user.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: colors.primary }}>{user.name || 'Unknown'}</div>
                            <div style={{ fontSize: '12px', color: colors.secondary }}>@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: colors.primary }}>{user.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: user.role === 'admin' ? colors.adminBg : colors.userBg,
                          color: user.role === 'admin' ? colors.adminText : colors.userText,
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: user.is_sso_user ? colors.ssoBg : colors.localBg,
                          color: user.is_sso_user ? colors.ssoText : colors.localText,
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block'
                        }}>
                          {user.is_sso_user ? 'SSO' : 'Local'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: colors.secondary, fontSize: '12px' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEditClick(user)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showForm && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
              <div className="modal" style={{ backgroundColor: colors.background, borderRadius: '8px', padding: '0', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto', border: `1px solid ${colors.border}` }}>
                <div className="modal-header" style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.accent }}>
                  <h3 style={{ margin: 0, color: 'white' }}>
                    {editingUser ? `Edit ${editingUser.name}` : 'Add New User'}
                  </h3>
                  <button
                    onClick={handleCloseForm}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: 'white',
                      padding: '0',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        autoComplete="off"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.secondaryBg,
                          color: colors.primary
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="user@example.com"
                        autoComplete="off"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.secondaryBg,
                          color: colors.primary
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                        {editingUser ? 'New Password (leave empty to keep current)' : 'Password (min 6 characters)'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingUser ? 'Leave empty to keep current' : 'At least 6 characters'}
                        autoComplete="new-password"
                        required={!editingUser}
                        minLength={editingUser ? undefined : 6}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: colors.secondaryBg,
                          color: colors.primary
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: colors.primary }}>
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        disabled={editingUser && editingUser.id === currentUser.id}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          backgroundColor: editingUser && editingUser.id === currentUser.id ? colors.border : colors.secondaryBg,
                          color: colors.primary,
                          cursor: editingUser && editingUser.id === currentUser.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {editingUser && editingUser.id === currentUser.id && (
                        <p style={{ color: colors.secondary, fontSize: '12px', marginTop: '6px' }}>
                          You cannot change your own role
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="submit"
                          style={{
                            padding: '10px 20px',
                            backgroundColor: colors.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {editingUser ? 'Update User' : 'Create User'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseForm}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: colors.secondary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {editingUser && editingUser.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(editingUser.id)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: colors.danger,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-trash"></i>
                          Delete User
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
