import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  description,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary' | 'clay' | 'optic'
  isLoading = false,
}) => {
  const dialogMessage = description || message || 'This action cannot be undone.';
  const dialogConfirmText = confirmLabel || confirmText || 'Confirm';

  const iconConfig = {
    danger: { icon: Trash2, color: 'text-clay-600 dark:text-clay-400 bg-clay-500/10 border-clay-500/30' },
    clay: { icon: Trash2, color: 'text-clay-600 dark:text-clay-400 bg-clay-500/10 border-clay-500/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
    primary: { icon: Info, color: 'text-optic-600 dark:text-optic-400 bg-optic-500/10 border-optic-500/30' },
    optic: { icon: Info, color: 'text-optic-600 dark:text-optic-400 bg-optic-500/10 border-optic-500/30' },
  }[variant] || { icon: AlertTriangle, color: 'text-clay-600 dark:text-clay-400 bg-clay-500/10 border-clay-500/30' };

  const Icon = iconConfig.icon;

  const footer = (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button
        variant={variant === 'danger' || variant === 'clay' ? 'clay' : 'optic'}
        size="sm"
        isLoading={isLoading}
        onClick={onConfirm}
      >
        {dialogConfirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-md border ${iconConfig.color} shrink-0 shadow-xs`}>
          <Icon className="w-5 h-5 stroke-[1.75]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-extrabold font-heading uppercase text-court-900 dark:text-court-100">{title}</h4>
          <p className="text-xs text-court-600 dark:text-court-400 leading-relaxed">{dialogMessage}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
