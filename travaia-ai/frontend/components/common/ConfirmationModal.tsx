import React from 'react';
import { GlassModal } from '../design-system';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
}

/**
 * ConfirmationModal - Now uses the consolidated GlassModal component
 * This provides consistent styling and behavior across all modals
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmVariant = 'danger',
}) => {
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant="popup"
      message={message}
      onConfirm={onConfirm}
      confirmText={confirmText}
      cancelText={cancelText}
      confirmVariant={confirmVariant}
    />
  );
};

export default ConfirmationModal;
