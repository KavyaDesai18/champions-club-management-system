import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, Modal } from '../components/ui';

describe('Modal & Dialog Focus Trap and ESC Behavior', () => {
  it('does not render modal content when isOpen is false', () => {
    render(
      <Modal isOpen={false} title="Test Modal">
        <p>Hidden body</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders modal dialog when isOpen is true', () => {
    render(
      <Modal isOpen={true} title="Active Modal" description="Modal description">
        <p>Visible content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Active Modal')).toBeInTheDocument();
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('calls onClose when pressing ESC key', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="ESC Test Modal">
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus inside modal on Tab key navigation', () => {
    render(
      <Modal isOpen={true} title="Focus Trap Modal">
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    const focusables = dialog.querySelectorAll('button');
    const firstBtn = focusables[0];
    const lastBtn = focusables[focusables.length - 1];

    // Focus last button and press Tab -> should cycle to first
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // First focusable element should receive focus
    expect(document.activeElement).toBe(firstBtn);

    // Focus first button and press Shift+Tab -> should cycle to last
    firstBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('ConfirmDialog triggers onConfirm and onCancel', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onConfirm={handleConfirm}
        onClose={handleClose}
        title="Confirm Delete"
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Yes, Delete/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
