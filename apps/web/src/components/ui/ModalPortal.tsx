import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  /** Content to render inside the portal */
  children: ReactNode;
  /** Controls visibility and lifecycle of the modal */
  isOpen: boolean;
  /** Called when the modal requests to close (Escape key, etc.) */
  onClose: () => void;
  /** ID of the element that labels this dialog (for aria-labelledby) */
  labelId: string;
}

/**
 * Production-hardened modal portal.
 * 
 * Renders children into document.body via React Portal, escaping
 * any parent stacking context (fixes R3 z-index trap).
 * 
 * Features:
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Body scroll lock while open
 * - Escape key to close
 * - Focus trap: initial focus on modal, restore on close
 * - Reliable cleanup on unmount
 */
export default function ModalPortal({ children, isOpen, onClose, labelId }: ModalPortalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture focus origin for restoration
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 2. Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 3. Focus the modal container
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    // 4. Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        stableOnClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 5. Cleanup: restore scroll, remove listener, restore focus
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, stableOnClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      {children}
    </div>,
    document.body
  );
}
