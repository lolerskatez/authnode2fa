import React from 'react';

const AccountCard = ({ 
  account, 
  code, 
  timer, 
  progress,
  onContextMenu,
  isMobile,
  codeFormat = 'spaced'
}) => {
  // Format code based on user preference
  const formatCode = (codeStr, format) => {
    if (!codeStr) return codeStr;
    if (format === 'compact') {
      return codeStr.replace(/\s/g, '');
    } else {
      // spaced format: "123456" -> "123 456"
      return codeStr.replace(/\s/g, '').replace(/(\d{3})(?=\d)/g, '$1 ');
    }
  };

  const displayCode = formatCode(code, codeFormat);
  if (isMobile) {
    return (
      <div className="account-item">
        <div 
          className="account-icon" 
          style={{ backgroundColor: account.color }}
        >
          <i className={account.icon}></i>
        </div>
        <div className="account-details">
          <div className="account-name">{account.name}</div>
          <div className="account-email">{account.email}</div>
        </div>
        <div className="account-code">
          <div className="code-value">{displayCode}</div>
          <div className="code-timer">
            Expires in <span>{timer}</span>s
          </div>
          <div className="timer-bar">
            <div 
              className="timer-progress"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <button 
          className="menu-btn"
          onClick={onContextMenu}
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="account-card"
      onContextMenu={onContextMenu}
      style={{ cursor: 'context-menu' }}
    >
      <div className="card-icon" style={{ backgroundColor: account.color }}>
        <i className={account.icon}></i>
      </div>
      
      <div className="card-content">
        <div className="card-name">{account.name}</div>
        <div className="card-code">{displayCode}</div>
      </div>
      
      <div className="card-timer-badge">
        <svg className="timer-circle" viewBox="0 0 40 40">
          <circle className="timer-circle-bg" cx="20" cy="20" r="18" />
          <circle 
            className="timer-circle-progress" 
            cx="20" 
            cy="20" 
            r="18"
            style={{ strokeDashoffset }}
          />
        </svg>
        <span className="timer-number">{timer}</span>
      </div>
    </div>
  );
};

export default AccountCard;
