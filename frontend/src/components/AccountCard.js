import React from 'react';
import ClipboardManager from '../utils/ClipboardManager';

const AccountCard = ({
  account,
  code,
  timer,
  progress,
  onContextMenu,
  isMobile,
  codeFormat = 'spaced',
  onShowMetadata,
  appSettings
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

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    if (!code || code === '--- ---') return;

    await ClipboardManager.copyToClipboard(displayCode.replace(/\s/g, ''), {
      showToast: true
    });
  };

  const handleShowMetadata = (e) => {
    e.stopPropagation();
    if (onShowMetadata) {
      onShowMetadata(account);
    }
  };
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
        <div className="card-name">
          {account.name}
          {(account.username || account.url || account.notes) && (
            <button
              onClick={handleShowMetadata}
              style={{
                marginLeft: '8px',
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 4px',
                borderRadius: '3px'
              }}
              title="View account details"
            >
              <i className="fas fa-info-circle"></i>
            </button>
          )}
        </div>
        <div className="card-code" style={{ position: 'relative' }}>
          <span>{displayCode}</span>
          {code && code !== '--- ---' && (
            <button
              {...ClipboardManager.getCopyButtonProps(handleCopyCode)}
              style={{
                position: 'absolute',
                right: '-25px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '14px',
                padding: '4px',
                borderRadius: '3px'
              }}
              title="Copy code to clipboard (auto-clears in 30 seconds)"
            >
              <i className="fas fa-copy"></i>
            </button>
          )}
        </div>
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
