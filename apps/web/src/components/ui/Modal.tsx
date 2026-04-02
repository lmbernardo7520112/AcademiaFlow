import React, { useEffect } from 'react';
import '../../styles/design-tokens.css';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} className="glass-panel slide-in-bottom">
        <header style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>{title}</h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <div style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(5, 5, 20, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '0',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'all 0.2s',
};

const bodyStyle: React.CSSProperties = {
  padding: '1.5rem',
  overflowY: 'auto',
  flex: 1,
};
