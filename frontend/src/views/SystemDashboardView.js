import React from 'react';
import ActivityView from './ActivityView';
import AdminDashboard from './AdminDashboard';
import SettingsView from './SettingsView';
import LockedAccountsTab from './tabs/LockedAccountsTab';
import AuditLogsTab from './tabs/AuditLogsTab';
import UserManagement from '../UserManagement';

const SystemDashboardView = ({ 
  currentUser, 
  currentView, 
  appSettings,
  onSettingsChange,
  accounts,
  onSecurityClick,
  twoFAEnabled
}) => {
  // Default to activity if no sub-view is specified
  const subView = currentView.sub || 'activity';

  return (
    <div style={{ 
      height: '100%',
      width: '100%',
      overflow: 'auto'
    }}>
      {subView === 'activity' && (
        <ActivityView 
          currentUser={currentUser}
          appSettings={appSettings}
        />
      )}
      
      {subView === 'admin-dashboard' && (
        <AdminDashboard 
          currentUser={currentUser}
          appSettings={appSettings}
        />
      )}

      {subView === 'general' && (
        <SettingsView 
          currentUser={currentUser}
          isMobile={false}
          activeTab={subView}
          onTabChange={() => {}}
          appSettings={appSettings}
          onSettingsChange={onSettingsChange}
        />
      )}

      {subView === 'locked-accounts' && (
        <LockedAccountsTab 
          appSettings={appSettings}
          currentUser={currentUser}
        />
      )}

      {subView === 'audit-logs' && (
        <AuditLogsTab 
          appSettings={appSettings}
          currentUser={currentUser}
        />
      )}

      {subView === 'user-management' && currentUser?.role === 'admin' && (
        <UserManagement 
          currentUser={currentUser}
          onClose={() => {}}
          isEmbedded={true}
          appSettings={appSettings}
        />
      )}
    </div>
  );
};

export default SystemDashboardView;
