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

  // Theme-aware background color
  const getBackgroundColor = () => {
    let isDark = appSettings?.theme === 'dark';
    
    if (appSettings?.theme === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    return isDark ? '#111827' : '#f7fafc';
  };

  return (
    <div className="app-content" style={{ 
      paddingLeft: '20px', 
      paddingTop: '20px',
      paddingRight: '20px',
      paddingBottom: '20px',
      overflowY: 'auto',
      height: '100%',
      backgroundColor: getBackgroundColor()
    }}>
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
