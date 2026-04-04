import React, { useState } from 'react';
import './ConfirmModal.css';

/**
 * Reusable Confirmation Modal Component
 * 
 * @param {boolean} show - Whether to show the modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} confirmClass - CSS class for confirm button (default: "btn-primary")
 * @param {boolean} requireInput - Whether to require text input for confirmation
 * @param {string} requiredInputValue - The exact value user must type to confirm
 * @param {string} inputPlaceholder - Placeholder text for the input field
 */
const ConfirmModal = ({
    show,
    title = 'Confirm Action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmClass = 'btn-primary',
    requireInput = false,
    requiredInputValue = '',
    inputPlaceholder = 'Type to confirm...'
}) => {
    const [inputValue, setInputValue] = useState('');

    if (!show) return null;

    const handleConfirm = () => {
        if (requireInput && inputValue !== requiredInputValue) {
            return; // Don't allow confirm if input doesn't match
        }
        setInputValue(''); // Reset input
        onConfirm();
    };

    const handleCancel = () => {
        setInputValue(''); // Reset input
        onCancel();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const isConfirmDisabled = requireInput && inputValue !== requiredInputValue;

    return (
        <div className="confirm-modal-overlay" onClick={handleOverlayClick}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <h2>{title}</h2>
                    <button className="confirm-modal-close" onClick={handleCancel}>
                        &times;
                    </button>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                    {requireInput && (
                        <div className="confirm-modal-input">
                            <label>Type <strong>"{requiredInputValue}"</strong> to confirm:</label>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputPlaceholder}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn btn-secondary" onClick={handleCancel}>
                        {cancelText}
                    </button>
                    <button 
                        className={`btn ${confirmClass}`}
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
