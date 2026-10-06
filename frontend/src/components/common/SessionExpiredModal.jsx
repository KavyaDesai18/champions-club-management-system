import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal';
import Button from '../ui/Button';

export const SessionExpiredModal = () => {
  const { sessionExpiredOpen, closeSessionExpired } = useAuth();
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    closeSessionExpired();
    navigate('/login');
  };

  return (
    <Modal
      isOpen={sessionExpiredOpen}
      onClose={handleLoginRedirect}
      size="sm"
    >
      <ModalHeader
        title="Session Expired"
        description="Your security session has ended"
      />
      <ModalBody>
        <div className="flex flex-col items-center text-center p-4 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-8 h-8 stroke-1.5" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-white">Security Timeout</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your authentication session has expired, was revoked, or credentials were reset on another device.
              Please sign in again to restore access.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          className="w-full"
          onClick={handleLoginRedirect}
          startIcon={<LogIn className="w-4 h-4" />}
        >
          Sign In Again
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SessionExpiredModal;
