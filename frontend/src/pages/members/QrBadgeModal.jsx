import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  RefreshCw,
  QrCode
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { membersApi } from '../../api/membersApi';
import { useToast } from '../../context/ToastContext';

export default function QrBadgeModal({ isOpen, onClose, member }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isOpen && member?.id) {
      loadQrToken();
    } else {
      setTokenData(null);
    }
  }, [isOpen, member?.id]);

  const loadQrToken = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getQrToken(member.id);
      if (res.success) {
        setTokenData(res.data);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error generating QR token',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!tokenData?.token) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Token Copied',
      message: 'QR verification token copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!member) return null;

  const planCode = member.planCode || member.plan?.code || 'MEMBER';
  const planColor = 
    planCode === 'GOLD' ? 'from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/30' :
    planCode === 'SILVER' ? 'from-slate-400/20 via-zinc-400/10 to-transparent border-slate-400/30' :
    'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30';

  const planBadgeVariant =
    planCode === 'GOLD' ? 'warning' :
    planCode === 'SILVER' ? 'default' : 'success';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Access Pass & QR"
      size="md"
    >
      <div className="space-y-6">
        {/* Printable Pass Card Container */}
        <div className="flex justify-center">
          <div 
            ref={cardRef}
            id="printable-member-badge"
            className={`w-full max-w-sm rounded-2xl p-6 bg-gradient-to-b ${planColor} border bg-zinc-900 shadow-2xl relative overflow-hidden`}
          >
            {/* Background watermark */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-sm">
                  CC
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-zinc-100 uppercase">Champions Club</h3>
                  <p className="text-[10px] text-zinc-400">Digital Access Pass</p>
                </div>
              </div>
              <Badge variant={planBadgeVariant} size="sm">
                {planCode}
              </Badge>
            </div>

            {/* Member Profile info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-zinc-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-zinc-400">
                    {member.fullName?.charAt(0) || 'M'}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-semibold text-zinc-100 truncate">
                  {member.fullName}
                </h4>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {member.memberNo}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {member.phone || member.email}
                </div>
              </div>
            </div>

            {/* QR Code Canvas Frame */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-inner my-2">
              {loading ? (
                <div className="h-44 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium">Signing access token...</span>
                </div>
              ) : tokenData?.token ? (
                <>
                  <QRCodeSVG
                    value={tokenData.token}
                    size={176}
                    level="H"
                    includeMargin={false}
                    className="w-44 h-44"
                  />
                  <div className="mt-2 text-[10px] font-mono text-zinc-600 tracking-wider uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    HMAC-SHA256 Signed Access Key
                  </div>
                </>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-red-500 gap-2">
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-xs">Failed to load QR</span>
                </div>
              )}
            </div>

            {/* Card Footer details */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                Status: <span className="font-semibold text-emerald-400">{member.status || 'ACTIVE'}</span>
              </span>
              <span className="font-mono text-zinc-500 text-[10px]">
                Valid 24h
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
              disabled={!tokenData?.token}
              className="flex-1 sm:flex-none"
            >
              {copied ? 'Copied' : 'Copy Token'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadQrToken}
              loading={loading}
              className="flex-1 sm:flex-none"
            >
              Regenerate
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="w-full sm:w-auto"
            >
              Print ID Pass
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
