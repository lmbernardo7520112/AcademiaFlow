import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalPortal from './ModalPortal';

describe('ModalPortal', () => {
  let triggerButton: HTMLButtonElement;

  beforeEach(() => {
    triggerButton = document.createElement('button');
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
  });

  afterEach(() => {
    document.body.removeChild(triggerButton);
    document.body.style.overflow = '';
  });

  it('renders children into document.body, outside parent container', () => {
    const { baseElement } = render(
      <div data-testid="parent-container">
        <ModalPortal isOpen={true} onClose={() => {}} labelId="test-label">
          <div data-testid="modal-content">Modal Content</div>
        </ModalPortal>
      </div>
    );

    const parent = baseElement.querySelector('[data-testid="parent-container"]');
    const modalContent = baseElement.querySelector('[data-testid="modal-content"]');
    
    // Modal should exist in the document
    expect(modalContent).toBeInTheDocument();
    // Modal should NOT be inside the parent container
    expect(parent?.contains(modalContent)).toBe(false);
  });

  it('applies role="dialog" and aria-modal="true"', () => {
    render(
      <ModalPortal isOpen={true} onClose={() => {}} labelId="test-label">
        <div>Content</div>
      </ModalPortal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('applies aria-labelledby pointing to provided labelId', () => {
    render(
      <ModalPortal isOpen={true} onClose={() => {}} labelId="my-modal-title">
        <h2 id="my-modal-title">Title</h2>
      </ModalPortal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'my-modal-title');
  });

  it('sets body overflow to hidden when open', () => {
    render(
      <ModalPortal isOpen={true} onClose={() => {}} labelId="test">
        <div>Content</div>
      </ModalPortal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow on close', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <ModalPortal isOpen={true} onClose={() => {}} labelId="test">
        <div>Content</div>
      </ModalPortal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();

    render(
      <ModalPortal isOpen={true} onClose={onClose} labelId="test">
        <div>Content</div>
      </ModalPortal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <ModalPortal isOpen={false} onClose={() => {}} labelId="test">
        <div data-testid="hidden-modal">Content</div>
      </ModalPortal>
    );

    expect(screen.queryByTestId('hidden-modal')).not.toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const onClose = vi.fn();

    const { unmount } = render(
      <ModalPortal isOpen={true} onClose={onClose} labelId="test">
        <div>Content</div>
      </ModalPortal>
    );

    unmount();

    // After unmount, Escape should not trigger onClose
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
