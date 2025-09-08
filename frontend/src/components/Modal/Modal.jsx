import React, { useEffect } from 'react';
import './Modal.css';

/**
 * Modal component for displaying overlays and dialogs.
 * Implements accessibility features and keyboard navigation.
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true 
}) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`modal ${isOpen ? 'modal--open' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={`modal__backdrop ${isOpen ? 'modal__backdrop--open' : ''}`} />
      
      <div className={`modal__content modal__content--${size}`}>
        {title && (
          <div className="modal__header">
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
            {showCloseButton && (
              <button
                className="modal__close"
                onClick={onClose}
                aria-label="Fechar modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        )}
        
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
}
