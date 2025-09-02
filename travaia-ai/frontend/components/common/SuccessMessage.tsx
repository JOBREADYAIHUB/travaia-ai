import React from 'react';
import { motion } from 'framer-motion';
import './SuccessMessage.css';

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <motion.div
      className="success-message"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="success-content">
        <div className="success-icon">✅</div>
        <div className="success-text">{message}</div>
        {onClose && (
          <button
            className="success-close"
            onClick={onClose}
            aria-label="Close success message"
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default SuccessMessage;
