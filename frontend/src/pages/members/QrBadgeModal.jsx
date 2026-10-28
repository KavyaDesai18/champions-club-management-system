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
  QrCode,
  Phone,
  Mail,
  Calendar,
  Clock,
  Award,
  Trophy
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
    if (isOpen && (member?.id || member?.memberId)) {
      loadQrToken();
    } else {
      setTokenData(null);
    }
  }, [isOpen, member?.id, member?.memberId]);

  const memberId = member?.id || member?.memberId;

  const loadQrToken = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await membersApi.getQrToken(memberId);
      if (res?.success && res?.data) {
        setTokenData(res.data);
      } else if (res?.data) {
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
    const textToCopy = tokenData?.qrPayload || tokenData?.token;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Pass Data Copied',
      message: 'QR verification payload copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPayload = () => {
    const payload = tokenData?.qrPayload || JSON.stringify(tokenData, null, 2);
    if (!payload) return;
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `champions-pass-${member?.memberNo || 'badge'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Pass Downloaded',
      message: 'Digital pass saved to your downloads folder.',
    });
  };

  if (!member) return null;

  const planCode = tokenData?.planCode || member.planCode || member.plan?.code || 'GOLD';
  const planName = tokenData?.planName || member.planName || member.plan?.name || `${planCode} Club Membership`;
  const phone = tokenData?.phone || member.phone || member.contactNumber || 'Contact on file';
  const email = tokenData?.email || member.email || 'Athlete profile';
  const benefits = tokenData?.benefits || [
    '25% discount on all court bookings',
    '15% discount at the pro-shop',
    '10 guest passes included per term',
    'Complimentary locker & sauna access',
  ];
  const bookedSlots = tokenData?.bookedSlots || [];
  const qrString = tokenData?.qrPayload || tokenData?.token || member.memberNo || 'CC-000001';

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
      size="lg"
    >
      <div className="space-y-6">
        {/* Printable Pass Card Container */}
        <div className="flex justify-center">
          <div 
            ref={cardRef}
            id="printable-member-badge"
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 bg-gradient-to-b ${planColor} border bg-zinc-950 shadow-2xl relative overflow-hidden`}
          >
            {/* Background watermark */}
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-sm">
                  CC
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider text-zinc-100 uppercase">Champions Club</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Digital Access Pass</p>
                </div>
              </div>
              <Badge variant={planBadgeVariant} size="sm">
                <Trophy className="w-3 h-3 mr-1" />
                {planCode}
              </Badge>
            </div>

            {/* Member Profile info & Contact */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-5 border-b border-zinc-800/80">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-zinc-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                {member.photoUrl || tokenData?.photoUrl ? (
                  <img src={member.photoUrl || tokenData?.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-emerald-400">
                    {member.fullName?.charAt(0) || 'M'}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-white truncate">
                    {tokenData?.fullName || member.fullName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {member.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  ID: {tokenData?.memberNo || member.memberNo}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-zinc-500" /> {phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-500" /> {email}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Canvas Frame */}
            <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner my-3">
              {loading ? (
                <div className="h-44 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium">Generating encrypted pass token...</span>
                </div>
              ) : qrString ? (
                <>
                  <QRCodeSVG
                    value={qrString}
                    size={176}
                    level="M"
                    includeMargin={false}
                    className="w-44 h-44"
                  />
                  <div className="mt-3 text-[10px] font-mono text-zinc-700 tracking-wider uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    HMAC-SHA256 Signed Access Key
                  </div>
                </>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-red-500 gap-2">
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-xs">Failed to load QR token</span>
                </div>
              )}
            </div>

            {/* Plan Details & Validity */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-300 font-semibold">
                <span>Plan: <strong className="text-white">{planName}</strong></span>
                <span className="text-emerald-400 font-mono text-[11px]">Valid 24h Pass</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>Start: {tokenData?.startDate || '2026-01-01'}</span>
                <span>End: <strong className="text-zinc-200">{tokenData?.endDate || member?.endDate || '2026-12-31'}</strong></span>
              </div>
            </div>

            {/* Membership Benefits Breakdown */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Included Plan Benefits
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {benefits.map((b, i) => (
                  <div key={i} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[10px] text-zinc-300 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Booked Slots (If any) */}
            {bookedSlots.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Scheduled Court Slots Today
                </span>
                <div className="space-y-1">
                  {bookedSlots.map((slot) => (
                    <div key={slot.id} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-300 flex items-center justify-between">
                      <span className="font-semibold text-white">{slot.courtName} ({slot.sport})</span>
                      <span className="font-mono text-cyan-300">{slot.timeWindow}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
              disabled={!tokenData?.token}
              className="flex-1 sm:flex-none"
            >
              {copied ? 'Copied' : 'Copy Pass Data'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadPayload}
              disabled={!tokenData?.token}
              className="flex-1 sm:flex-none"
            >
              Save JSON
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
              Refresh
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
