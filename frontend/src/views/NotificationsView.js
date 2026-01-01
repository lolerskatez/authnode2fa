import React from 'react';
import NotificationsTab from './tabs/NotificationsTab';
import NotificationPreferences from '../components/NotificationPreferences';

const NotificationsView = ({ 
  appSettings, 
  currentUser, 
  currentView 
}) => {
  // Default to inbox if no sub-view is specified
  const subView = currentView.sub || 'inbox';

  return (
    <div className="app-content">
      {subView === 'inbox' && (
        <NotificationsTab appSettings={appSettings} currentUser={currentUser} />
      )}
      
      {subView === 'preferences' && (
        <NotificationPreferences appSettings={appSettings} currentUser={currentUser} />
      )}
    </div>
  );
};

export default NotificationsView;
