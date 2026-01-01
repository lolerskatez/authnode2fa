import React from 'react';
import NotificationsTab from './tabs/NotificationsTab';
import NotificationPreferences from '../components/NotificationPreferences';

const NotificationsView = ({ 
  appSettings, 
  currentUser, 
  currentView 
}) => {
  let isDark = appSettings?.theme === 'dark';
  
  // Handle 'auto' theme by checking system preference
  if (appSettings?.theme === 'auto') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  const colors = {
    primary: isDark ? '#e2e8f0' : '#2d3748',
    secondary: isDark ? '#cbd5e0' : '#718096',
    accent: isDark ? '#63b3ed' : '#4361ee',
    border: isDark ? '#4a5568' : '#e2e8f0',
    background: isDark ? '#2d3748' : '#ffffff',
    backgroundSecondary: isDark ? '#1a202c' : '#f7fafc'
  };

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
