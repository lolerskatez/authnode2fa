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

  return (
    <div 
      className="account-card"
      onContextMenu={onContextMenu}
      style={{ cursor: 'context-menu' }}
    >
      <div className="card-header">
        <div 
          className="card-icon" 
          style={{ backgroundColor: account.color }}
        >
          <i className={account.icon}></i>
        </div>
        <div className="card-title">
          <h3>{account.name}</h3>
          <p>{account.email}</p>
        </div>
        {account.favorite && (
          <div className="favorite-badge">
            <i className="fas fa-star"></i>
          </div>
        )}
      </div>
      <div className="card-code">
        <div className="code-display">{displayCode}</div>
        <div className="code-info">
          <span className="timer-text">Expires in {timer}s</span>
          <div className="timer-bar-small">
            <div 
              className="timer-progress-small"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
      <div 
        className="card-menu"
        onClick={onContextMenu}
        style={{ cursor: 'pointer' }}
      >
        <i className="fas fa-ellipsis-v"></i>
      </div>
    </div>
  );
};

export default AccountCard;
