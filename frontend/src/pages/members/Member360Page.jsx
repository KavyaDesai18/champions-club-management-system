import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield, 
  QrCode, 
  Edit3, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Activity, 
  CreditCard, 
  Trash2, 
  Ban, 
  RefreshCw,
  Award,
  Layers,
  HeartHandshake,
  Coffee
} from 'lucide-react';
import { membersApi, plansApi } from '../../api/membersApi';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import QrBadgeModal from './QrBadgeModal';
import RenewMembershipModal from '../../components/membership/RenewMembershipModal';

export default function Member360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modals state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [plans, setPlans] = useState([]);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadMember();
    loadPlans();
  }, [id]);

  const loadMember = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getMember360(id);
      if (res.success && res.data) {
        setMember(res.data);
        if (res.data.plan?.code) {
          setSelectedPlanCode(res.data.plan.code);
        }
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error loading profile',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await plansApi.getAllPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  const handleStatusToggle = async () => {
    if (!member) return;
    const newStatus = member.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    try {
      setStatusUpdating(true);
      const res = await membersApi.updateStatus(member.id, {
        status: newStatus,
        reason: newStatus === 'SUSPENDED' ? 'Front desk manual suspension' : 'Reactivated by staff',
      });
      if (res.success) {
        addToast({
          type: 'success',
          title: `Member ${newStatus === 'ACTIVE' ? 'Reactivated' : 'Suspended'}`,
          message: `${member.fullName}'s status is now ${newStatus}.`,
        });
        setStatusConfirmOpen(false);
        loadMember();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleChangePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanCode || selectedPlanCode === member?.plan?.code) return;

    try {
      setChangingPlan(true);
      const res = await membersApi.changePlan(member.id, {
        planCode: selectedPlanCode,
        effectiveImmediately: true,
        reason: 'Staff console plan migration',
      });
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Plan Updated',
          message: `Successfully migrated ${member.fullName} to ${selectedPlanCode} plan.`,
        });
        setChangePlanModalOpen(false);
        loadMember();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Plan Change Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setChangingPlan(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Frontend pre-check for SVG / size
    if (file.type === 'image/svg+xml') {
      addToast({
        type: 'error',
        title: 'Unsupported Image Type',
        message: 'SVG files are not permitted for security reasons.',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Photo must be under 5MB.',
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      const res = await membersApi.uploadPhoto(member.id, file);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Photo Uploaded',
          message: 'Member profile avatar has been updated.',
        });
        loadMember();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteMember = async () => {
    try {
      setDeleting(true);
      const res = await membersApi.deleteMember(member.id);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Member Deleted',
          message: 'Member record has been soft-deleted and archived.',
        });
        navigate('/console/members');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-48 rounded-2xl bg-zinc-900 border border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-zinc-900 border border-zinc-800" />
          <div className="h-64 rounded-2xl bg-zinc-900 border border-zinc-800 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-bold text-zinc-100">Member Not Found</h2>
        <p className="text-sm text-zinc-400">The requested member profile could not be located or has been deleted.</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/console/members')}>
          Back to Members
        </Button>
      </div>
    );
  }

  const planCode = member.plan?.code || 'MEMBER';
  const planGradient = 
    planCode === 'GOLD' ? 'from-amber-500/20 via-yellow-500/5 to-transparent border-amber-500/30' :
    planCode === 'SILVER' ? 'from-slate-400/20 via-zinc-400/5 to-transparent border-slate-400/30' :
    'from-emerald-500/20 via-teal-500/5 to-transparent border-emerald-500/30';

  const planBadgeVariant =
    planCode === 'GOLD' ? 'warning' :
    planCode === 'SILVER' ? 'default' : 'success';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          to="/console/members"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Members Roster
        </Link>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={QrCode}
            onClick={() => setQrModalOpen(true)}
          >
            Digital Pass & QR
          </Button>

          <Button
            type="button"
            variant={member.status === 'EXPIRED' ? 'primary' : 'outline'}
            size="sm"
            icon={Sparkles}
            onClick={() => setRenewModalOpen(true)}
            className={member.status === 'EXPIRED' ? 'bg-red-600 hover:bg-red-500 shadow-glow' : ''}
          >
            Renew Membership
          </Button>

          <Button
            type="button"
            variant={member.status === 'SUSPENDED' ? 'primary' : 'outline'}
            size="sm"
            icon={member.status === 'SUSPENDED' ? CheckCircle2 : Ban}
            onClick={() => setStatusConfirmOpen(true)}
          >
            {member.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Trash2}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Unsettled Bar Tab Warning Banner */}
      {member.hasUnsettledBarTabs && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Unsettled Bar & Cafeteria Tabs ({member.unsettledTabsCount || 1})
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Member has ₹{Number(member.unsettledTabsAmount || 0).toFixed(2)} in open bar tabs (Credit limit: ₹5,000). Settlement required prior to new court bookings.
              </p>
            </div>
          </div>
          <Link
            to="/console/bar"
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center gap-2 flex-shrink-0"
          >
            <Coffee className="w-4 h-4" />
            Open Bar POS
          </Link>
        </div>
      )}

      {/* Upgrade Due Warning Banner */}
      {member.upgradeDue && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Junior Membership Upgrade Due
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                This member has reached 18 years of age (DOB: {member.dob}). They must be transitioned from Junior Cadet to an adult membership plan (Gold or Silver).
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={TrendingUp}
            onClick={() => setChangePlanModalOpen(true)}
            className="flex-shrink-0"
          >
            Upgrade Membership Plan
          </Button>
        </div>
      )}

      {/* Expired Warning Banner */}
      {member.status === 'EXPIRED' && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-300">
                Membership Expired
              </h4>
              <p className="text-xs text-red-400/80 mt-0.5">
                Member privileges and court discounts are suspended. Front desk check-in displays a red status banner.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={() => setRenewModalOpen(true)}
            className="flex-shrink-0 bg-red-600 hover:bg-red-500"
          >
            Renew Membership
          </Button>
        </div>
      )}

      {/* Suspended Warning Banner */}
      {member.status === 'SUSPENDED' && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-red-300">Account Suspended</h4>
            <p className="text-xs text-red-400/80 mt-0.5">
              Court booking privileges and club access rights are currently restricted for this member.
            </p>
          </div>
        </div>
      )}

      {/* Hero Header 360 Card */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${planGradient} border bg-zinc-900 shadow-xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar with Upload Hover Trigger */}
            <div className="relative group flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center shadow-md">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-zinc-400">
                    {member.fullName?.charAt(0) || 'M'}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity gap-1"
              >
                <Camera className="w-5 h-5" />
                <span>Change</span>
              </button>
            </div>

            {/* Profile Info */}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                  {member.fullName}
                </h1>
                <Badge 
                  variant={
                    member.status === 'ACTIVE'
                      ? 'success'
                      : member.status === 'EXPIRED' || member.status === 'SUSPENDED'
                      ? 'danger'
                      : 'default'
                  }
                  size="sm"
                  className={member.status === 'EXPIRED' ? 'bg-red-500/20 text-red-300 border-red-500/40 font-black' : ''}
                >
                  {member.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap mt-2 text-xs sm:text-sm text-zinc-400">
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {member.memberNo}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {member.phone || 'No phone'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {member.email || 'No email'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Age {member.age}
                </span>
              </div>
            </div>
          </div>

          {/* Current Tier & Change Button */}
          <div className="flex flex-col sm:items-end gap-2 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              Current Membership Plan
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={planBadgeVariant} size="lg">
                {planCode}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setChangePlanModalOpen(true)}
              >
                Change Plan
              </Button>
            </div>
            <div className="text-xs text-zinc-400">
              ₹{member.plan?.price?.toLocaleString() || 0} / {member.plan?.durationMonths || 12} mo
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Entitlements', icon: Layers },
          { id: 'guardian', label: 'Guardian & Emergency', icon: HeartHandshake },
          { id: 'activity', label: 'Activity & Bookings', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Entitlements */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entitlements Card */}
          <Card className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Member Entitlements & Privileges
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {member.plan?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Court Discount</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {member.entitlements?.courtDiscountPct || 0}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Pro Shop Discount</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  {member.entitlements?.shopDiscountPct || 0}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Bar / Lounge Discount</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {member.entitlements?.barDiscountPct || 0}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Free Courts Access</div>
                <div className="text-lg font-bold text-zinc-200 mt-1">
                  {member.entitlements?.freeCourts ? 'Yes (Unlimited)' : 'Standard'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Max Bookings / Day</div>
                <div className="text-2xl font-black text-zinc-200 mt-1">
                  {member.entitlements?.maxBookingsPerDay || 2} slots
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <div className="text-xs text-zinc-400">Advance Booking</div>
                <div className="text-2xl font-black text-zinc-200 mt-1">
                  {member.entitlements?.advanceBookingDays || 7} days
                </div>
              </div>
            </div>

            {/* Plan Display Benefits */}
            {member.plan?.benefits?.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  Included Plan Benefits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {member.plan.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{b.benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Contact & Personal Specs Card */}
          <Card className="space-y-5">
            <h3 className="text-base font-bold text-zinc-100 border-b border-zinc-800 pb-3">
              Personal Information
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-zinc-500 block">Date of Birth</span>
                <span className="text-zinc-200 font-medium">{member.dob || 'Not provided'} ({member.age} yrs)</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Gender</span>
                <span className="text-zinc-200 font-medium capitalize">{member.gender || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Residential Address</span>
                <span className="text-zinc-200 font-medium">{member.address || 'No address registered'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Emergency Contact</span>
                <span className="text-zinc-200 font-medium">{member.emergencyContact || 'None recorded'}</span>
              </div>
              {member.notes && (
                <div>
                  <span className="text-zinc-500 block">Desk Notes</span>
                  <p className="text-zinc-300 italic bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                    {member.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Guardian & Emergency */}
      {activeTab === 'guardian' && (
        <Card className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-400" /> Guardian & Parental Consent
            </h3>
            {member.guardian && (
              <Badge variant="success" size="sm">
                Consent Verified
              </Badge>
            )}
          </div>

          {member.guardian ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-500">Guardian Full Name</div>
                  <div className="text-sm font-semibold text-zinc-100 mt-1">{member.guardian.name}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-500">Contact Number</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 font-mono">{member.guardian.phone}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-500">Relationship</div>
                  <div className="text-sm font-semibold text-zinc-100 mt-1">{member.guardian.relation || 'Parent / Legal Guardian'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-500">Consent Recorded At</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-1">
                    {member.guardian.consentAt ? new Date(member.guardian.consentAt).toLocaleDateString() : 'At Registration'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Shield className="w-8 h-8 text-zinc-500 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-300">No Guardian Attached</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {member.age >= 18 
                  ? 'This member is an adult (18+), guardian record is not required.'
                  : 'No guardian recorded for this profile.'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Activity & Bookings */}
      {activeTab === 'activity' && (
        <Card className="space-y-5">
          <h3 className="text-base font-bold text-zinc-100 border-b border-zinc-800 pb-3">
            Recent Club History & Bookings
          </h3>

          <div className="space-y-3">
            <div className="p-6 text-center text-xs text-zinc-500 rounded-xl border border-dashed border-zinc-800">
              No recent court bookings or tabs found for this member yet.
            </div>
          </div>
        </Card>
      )}

      {/* Change Plan Modal */}
      <Modal
        isOpen={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        title="Migrate Membership Plan"
        size="md"
      >
        <form onSubmit={handleChangePlan} className="space-y-5">
          <p className="text-sm text-zinc-400">
            Select a new membership tier for <span className="text-zinc-200 font-semibold">{member.fullName}</span>. 
            Age-based tier validation is strictly enforced.
          </p>

          <Select
            label="Target Membership Tier"
            value={selectedPlanCode}
            onChange={(e) => setSelectedPlanCode(e.target.value)}
            required
            options={plans.map((p) => ({
              value: p.code,
              label: `${p.name} (₹${p.price?.toLocaleString()} / ${p.durationMonths} mo)`,
            }))}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setChangePlanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={changingPlan}
              disabled={!selectedPlanCode || selectedPlanCode === member.plan?.code}
            >
              Update Membership Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Reactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleStatusToggle}
        title={member.status === 'SUSPENDED' ? 'Reactivate Member Account?' : 'Suspend Member Account?'}
        description={
          member.status === 'SUSPENDED'
            ? `Are you sure you want to reactivate ${member.fullName}'s account? Court booking privileges and digital access will be restored.`
            : `Are you sure you want to suspend ${member.fullName}? They will not be able to book courts or use club privileges until reactivated.`
        }
        confirmText={member.status === 'SUSPENDED' ? 'Reactivate Account' : 'Suspend Account'}
        variant={member.status === 'SUSPENDED' ? 'primary' : 'danger'}
        loading={statusUpdating}
      />

      {/* Soft Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteMember}
        title="Archive / Soft Delete Member"
        description={`Are you sure you want to delete ${member.fullName} (${member.memberNo})? The record will be archived and excluded from active member rosters.`}
        confirmText="Archive Member"
        variant="danger"
        loading={deleting}
      />

      {/* QR Badge Modal */}
      <QrBadgeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        member={member}
      />

      {/* Renew Membership Modal */}
      <RenewMembershipModal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        member={member}
        currentMembership={member?.activeMembership}
        onSuccess={() => {
          setRenewModalOpen(false);
          loadMember();
        }}
      />
    </div>
  );
}
