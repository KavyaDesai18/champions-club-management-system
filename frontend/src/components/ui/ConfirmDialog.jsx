import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false,
}) => {
  const iconConfig = {
    danger: { icon: Trash2, color: 'text-rose-400 bg-rose-950/60 border-rose-800/40' },
    warning: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-950/60 border-amber-800/40' },
    primary: { icon: Info, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' },
  }[variant] || { icon: AlertTriangle, color: 'text-rose-400 bg-rose-950/60 border-rose-800/40' };

  const Icon = iconConfig.icon;

  const footer = (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        size="sm"
        isLoading={isLoading}
        onClick={onConfirm}
      >
        {confirmText}
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
        <div className={`p-3 rounded-2xl border ${iconConfig.color} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">{title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
