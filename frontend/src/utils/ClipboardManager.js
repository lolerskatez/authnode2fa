// Enhanced Clipboard Manager with auto-clear and feedback
export class ClipboardManager {
  static async copyToClipboard(text, options = {}) {
    const {
      autoClear = true,
      clearDelay = 30000, // 30 seconds
      onSuccess,
      onError,
      showToast = true
    } = options;

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS or older browsers
        this.fallbackCopyToClipboard(text);
      }

      if (showToast && window.showToast) {
        window.showToast('Code copied to clipboard', 'success');
      }
      if (onSuccess) onSuccess();

      // Auto-clear clipboard after delay
      if (autoClear) {
        setTimeout(() => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('')
              .then(() => {
                if (showToast && window.showToast) {
                  window.showToast('Clipboard cleared for security', 'info');
                }
              })
              .catch(err => console.log('Failed to clear clipboard:', err));
          }
        }, clearDelay);
      }

      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      if (showToast && window.showToast) {
        window.showToast('Failed to copy code', 'error');
      }
      if (onError) onError(err);
      return false;
    }
  }

  static fallbackCopyToClipboard(text) {
    // Fallback method using textarea for older browsers/HTTP
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  static async copyMultipleCodes(codes, options = {}) {
    const {
      separator = '\n',
      onSuccess,
      onError,
      showToast = true
    } = options;

    const combinedText = codes.join(separator);

    return this.copyToClipboard(combinedText, {
      ...options,
      onSuccess: () => {
        if (showToast && window.showToast) {
          window.showToast(`${codes.length} codes copied to clipboard`, 'success');
        }
        if (onSuccess) onSuccess();
      },
      onError
    });
  }

  static getCopyButtonProps(onClick, options = {}) {
    const { disabled = false, className = '', style = {} } = options;

    return {
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      },
      disabled,
      className: `copy-btn ${className}`,
      style: {
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style
      },
      title: 'Copy code to clipboard (auto-clears in 30 seconds)',
      'aria-label': 'Copy code'
    };
  }
}

export default ClipboardManager;
