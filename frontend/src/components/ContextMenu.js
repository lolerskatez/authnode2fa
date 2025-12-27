import React, { useEffect } from 'react';

const ContextMenu = ({ 
  position, 
  account, 
  onEdit, 
  onToggleFavorite, 
  onDelete, 
  onClose 
}) => {
  useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="context-menu-overlay"
      onClick={onClose}
    >
      <div 
        className="context-menu"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="context-menu-item" onClick={onEdit}>
          <i className="fas fa-edit"></i>
          <span>Edit</span>
        </div>
        <div className="context-menu-item" onClick={onToggleFavorite}>
          <i className={`fas fa-star ${account?.favorite ? 'text-warning' : ''}`}></i>
          <span>{account?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
        </div>
        <div className="context-menu-item delete" onClick={onDelete}>
          <i className="fas fa-trash"></i>
          <span>Delete</span>
        </div>
      </div>
    </div>
  );
};

export default ContextMenu;
