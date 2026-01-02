import React from 'react';
import ActivityView from './ActivityView';
import AdminDashboard from './AdminDashboard';
import SettingsView from './SettingsView';
import LockedAccountsTab from './tabs/LockedAccountsTab';
import AuditLogsTab from './tabs/AuditLogsTab';

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
    <div className="app-content" style={{ 
      paddingLeft: '20px', 
      paddingTop: '20px',
      paddingRight: '20px',
      paddingBottom: '20px',
      overflowY: 'auto',
      height: '100%'
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
    </div>
  );
};

export default SystemDashboardView;
