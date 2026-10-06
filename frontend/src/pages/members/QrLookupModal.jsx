import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Camera, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { membersApi } from '../../api/membersApi';
import { useToast } from '../../context/ToastContext';

export default function QrLookupModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setLookupResult(null);

      const res = await membersApi.lookupByQr(token);
      if (res.success && res.data) {
        setLookupResult(res.data);
      } else {
        setErrorMsg('Invalid QR token or member not found.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. QR code may be tampered or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (!lookupResult?.id) return;
    onClose();
    navigate(`/console/members/${lookupResult.id}`);
  };

  const handleReset = () => {
    setTokenInput('');
    setLookupResult(null);
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Access Pass / QR Lookup"
      size="md"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-400">
          Enter or scan the signed HMAC access token or short code to look up membership and verify access permissions.
        </p>

        <form onSubmit={handleLookup} className="space-y-4">
          <div className="relative">
            <Input
              label="QR Access Token / Payload"
              placeholder="e.g. eyJhbGciOi... or paste scanned payload"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              autoFocus
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            {tokenInput && (
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                Clear
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Search}
              loading={loading}
              disabled={!tokenInput.trim()}
            >
              Verify Token
            </Button>
          </div>
        </form>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs tracking-wider uppercase">Verification Failed</p>
              <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Lookup Success Result Card */}
        {lookupResult && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> Valid Signature & Access
              </span>
              <Badge 
                variant={lookupResult.status === 'ACTIVE' ? 'success' : 'danger'}
                size="sm"
              >
                {lookupResult.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                {lookupResult.photoUrl ? (
                  <img src={lookupResult.photoUrl} alt={lookupResult.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-zinc-300">
                    {lookupResult.fullName?.charAt(0) || 'M'}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-zinc-100 truncate">
                  {lookupResult.fullName}
                </h4>
                <div className="text-xs font-mono text-emerald-400 font-semibold">
                  {lookupResult.memberNo}
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span>Plan: {lookupResult.plan?.name || lookupResult.planCode || 'Standard'}</span>
                  <span>•</span>
                  <span>{lookupResult.phone}</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={handleViewProfile}
              className="w-full justify-center"
            >
              Open Member 360 Profile
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
