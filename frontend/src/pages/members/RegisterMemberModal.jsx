import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Stepper } from '../../components/ui/Stepper';
import { Badge } from '../../components/ui/Badge';
import { membersApi, plansApi } from '../../api/membersApi';

export const RegisterMemberModal = ({ isOpen, onClose, onSuccess, onNavigateToMember }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [duplicateConflict, setDuplicateConflict] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Guardian State (for minors)
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Parent');
  const [guardianConsent, setGuardianConsent] = useState(false);

  // Plan & Portal Account
  const [selectedPlanCode, setSelectedPlanCode] = useState('SILVER');
  const [createPortalAccount, setCreatePortalAccount] = useState(true);
  const [portalPassword, setPortalPassword] = useState('');

  // Idempotency key per modal session
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
      setErrorBanner(null);
      setDuplicateConflict(null);
      plansApi.getAllPlans().then(setPlans).catch(() => {});
    }
  }, [isOpen]);

  // Compute age from DOB
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = calculateAge(dob);
  const isMinor = currentAge !== null && currentAge < 18;

  // Sync plan when age status changes
  useEffect(() => {
    if (isMinor) {
      setSelectedPlanCode('JUNIOR');
    } else if (selectedPlanCode === 'JUNIOR') {
      setSelectedPlanCode('SILVER');
    }
  }, [isMinor]);

  const steps = [
    { title: 'Personal', description: 'Contact & DOB' },
    ...(isMinor ? [{ title: 'Guardian', description: 'Minor Consent' }] : []),
    { title: 'Plan Tier', description: 'Select Tier' },
    { title: 'Confirm', description: 'Portal & Review' },
  ];

  const validateStep1 = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim() || !email.includes('@')) return 'A valid email address is required.';
    if (!phone.trim()) return 'Phone number is required.';
    if (!dob) return 'Date of birth is required.';
    if (currentAge === null || currentAge < 0) return 'Date of birth cannot be in the future.';
    if (currentAge > 120) return 'Date of birth exceeds realistic lifespan (>120 years).';
    return null;
  };

  const validateGuardianStep = () => {
    if (!guardianName.trim()) return 'Parent/Guardian name is required.';
    if (!guardianPhone.trim()) return 'Parent/Guardian phone number is required.';
    if (!guardianConsent) return 'You must confirm parental consent for athletes under 18.';
    return null;
  };

  const handleNext = () => {
    setErrorBanner(null);
    if (activeStep === 0) {
      const err = validateStep1();
      if (err) {
        setErrorBanner(err);
        return;
      }
    } else if (isMinor && activeStep === 1) {
      const err = validateGuardianStep();
      if (err) {
        setErrorBanner(err);
        return;
      }
    }
    setActiveStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleBack = () => {
    setErrorBanner(null);
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    setErrorBanner(null);
    setDuplicateConflict(null);
    setIsSubmitting(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dob,
      gender,
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
      notes: notes.trim(),
      planCode: selectedPlanCode,
      createPortalAccount,
      portalPassword: portalPassword || undefined,
      guardianName: isMinor ? guardianName.trim() : undefined,
      guardianPhone: isMinor ? guardianPhone.trim() : undefined,
      guardianRelation: isMinor ? guardianRelation : undefined,
      guardianConsent: isMinor ? guardianConsent : undefined,
    };

    try {
      const result = await membersApi.registerMember(payload, idempotencyKey);
      onSuccess?.(result);
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (err.response?.status === 409 && resp?.existingMemberId) {
        setDuplicateConflict({
          message: resp.message,
          memberId: resp.existingMemberId,
          memberNo: resp.existingMemberNo,
        });
      } else {
        setErrorBanner(resp?.message || err.message || 'Registration failed. Please check inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Member"
      description="Front desk athlete onboarding wizard with age-based plan enforcement"
      size="xl"
    >
      <div className="space-y-6">
        {/* Stepper Bar */}
        <Stepper
          steps={steps}
          activeStep={activeStep}
          onStepClick={(idx) => {
            if (idx < activeStep) setActiveStep(idx);
          }}
        />

        {/* Error / Conflict Alert */}
        {errorBanner && (
          <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{errorBanner}</span>
          </div>
        )}

        {duplicateConflict && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <AlertCircle className="w-4 h-4" /> Member Already Exists
            </div>
            <p>{duplicateConflict.message}</p>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToMember?.(duplicateConflict.memberId);
                }}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Member {duplicateConflict.memberNo}
              </Button>
            </div>
          </div>
        )}

        {/* Step Contents */}
        <div className="min-h-[320px]">
          {/* STEP 1: Personal Details */}
          {activeStep === 0 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Legal Name"
                  placeholder="e.g. Rahul Dravid"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  id="wizard-fullname"
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  id="wizard-email"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  id="wizard-phone"
                />
                <div>
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    id="wizard-dob"
                  />
                  {currentAge !== null && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Calculated Age:</span>
                      <span className="font-bold text-white">{currentAge} years</span>
                      {isMinor ? (
                        <Badge variant="warning" size="sm">
                          Minor (&lt;18) — Guardian Required
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Adult Member
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-900 border border-slate-800 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="Emergency Contact"
                  placeholder="Name & Contact (Optional)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </div>

              <Input
                label="Residential Address"
                placeholder="Street address, city, pin code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </motion.div>
          )}

          {/* STEP 2: Guardian Details (Only if isMinor) */}
          {isMinor && activeStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <HeartHandshake className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="font-bold">Minor Safety Mandate</div>
                  <div className="text-[11px] text-amber-400/90">
                    Athletes under 18 years of age require verified parental/guardian consent and will be assigned the Junior Cadet plan.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Parent / Guardian Name"
                  placeholder="e.g. Ramesh Dravid"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                  id="wizard-guardian-name"
                />
                <Input
                  label="Guardian Phone"
                  placeholder="e.g. +91 98765 43211"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  required
                  id="wizard-guardian-phone"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Relationship to Athlete</label>
                <select
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-900 border border-slate-800 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-800 bg-surface-900/60 cursor-pointer hover:bg-surface-900 transition">
                  <input
                    type="checkbox"
                    checked={guardianConsent}
                    onChange={(e) => setGuardianConsent(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500"
                    id="wizard-guardian-consent"
                  />
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block">Parental Consent & Facility Waiver Confirmation</span>
                    I confirm that I have verified the parent/guardian relationship and received signed authorization for athletic participation.
                  </div>
                </label>
              </div>
            </motion.div>
          )}

          {/* STEP 3 (or 2 for Adult): Plan Selection */}
          {((isMinor && activeStep === 2) || (!isMinor && activeStep === 1)) && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="text-xs text-slate-400">
                Choose the membership tier that fits the athlete's schedule and goals:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GOLD CARD */}
                <div
                  onClick={() => !isMinor && setSelectedPlanCode('GOLD')}
                  className={`
                    p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between
                    ${
                      selectedPlanCode === 'GOLD'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                        : isMinor
                        ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/40'
                        : 'border-slate-800 bg-surface-900/70 hover:border-slate-700'
                    }
                  `}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-amber-400 tracking-wider uppercase">Gold VIP</span>
                      {selectedPlanCode === 'GOLD' && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white">₹2,999</div>
                    <div className="text-[11px] text-slate-400 mb-3">12 Months • Full Access</div>

                    <ul className="text-xs space-y-1.5 text-slate-300 border-t border-slate-800/80 pt-3">
                      <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> 14-day advance booking</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 25% court discount</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 20% pro shop discount</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 2 Guest passes / mo</li>
                    </ul>
                  </div>
                  {isMinor && (
                    <div className="text-[10px] text-rose-400 font-semibold mt-3">Requires Adult (18+)</div>
                  )}
                </div>

                {/* SILVER CARD */}
                <div
                  onClick={() => !isMinor && setSelectedPlanCode('SILVER')}
                  className={`
                    p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between
                    ${
                      selectedPlanCode === 'SILVER'
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                        : isMinor
                        ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/40'
                        : 'border-slate-800 bg-surface-900/70 hover:border-slate-700'
                    }
                  `}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-indigo-400 tracking-wider uppercase">Silver Standard</span>
                      {selectedPlanCode === 'SILVER' && (
                        <div className="w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white">₹1,499</div>
                    <div className="text-[11px] text-slate-400 mb-3">12 Months • Standard</div>

                    <ul className="text-xs space-y-1.5 text-slate-300 border-t border-slate-800/80 pt-3">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400" /> 7-day advance booking</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 10% court discount</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 10% pro shop discount</li>
                    </ul>
                  </div>
                  {isMinor && (
                    <div className="text-[10px] text-rose-400 font-semibold mt-3">Requires Adult (18+)</div>
                  )}
                </div>

                {/* JUNIOR CARD */}
                <div
                  onClick={() => isMinor && setSelectedPlanCode('JUNIOR')}
                  className={`
                    p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between
                    ${
                      selectedPlanCode === 'JUNIOR'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : !isMinor
                        ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/40'
                        : 'border-slate-800 bg-surface-900/70 hover:border-slate-700'
                    }
                  `}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">Junior Cadet</span>
                      {selectedPlanCode === 'JUNIOR' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white">₹999</div>
                    <div className="text-[11px] text-slate-400 mb-3">12 Months • Ages &lt; 18</div>

                    <ul className="text-xs space-y-1.5 text-slate-300 border-t border-slate-800/80 pt-3">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 30% off junior courts</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 15% off junior gear</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Concludes before 20:00</li>
                    </ul>
                  </div>
                  {!isMinor && (
                    <div className="text-[10px] text-rose-400 font-semibold mt-3">Exclusive to Minors (&lt;18)</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Review & Portal Account */}
          {((isMinor && activeStep === 3) || (!isMinor && activeStep === 2)) && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="p-4 rounded-3xl bg-surface-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-white text-sm">{fullName}</div>
                  <Badge variant={selectedPlanCode === 'GOLD' ? 'warning' : selectedPlanCode === 'JUNIOR' ? 'success' : 'primary'}>
                    {selectedPlanCode} Tier
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="text-white font-medium">{email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>{' '}
                    <span className="text-white font-medium">{phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Age:</span>{' '}
                    <span className="text-white font-medium">{currentAge} years</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender:</span>{' '}
                    <span className="text-white font-medium">{gender}</span>
                  </div>
                  {isMinor && (
                    <div className="col-span-2 text-amber-300">
                      <span className="text-slate-400">Guardian:</span> {guardianName} ({guardianRelation}) • {guardianPhone}
                    </div>
                  )}
                </div>
              </div>

              {/* Portal Invite Toggle */}
              <div className="p-4 rounded-3xl border border-slate-800 bg-surface-900/50 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPortalAccount}
                    onChange={(e) => setCreatePortalAccount(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Create Member App / Portal Account</div>
                    <div className="text-[11px] text-slate-400">
                      Allows member to log in at /app for mobile reservations and wallet top-ups.
                    </div>
                  </div>
                </label>

                {createPortalAccount && (
                  <div className="pt-1">
                    <Input
                      label="Initial Portal Password"
                      placeholder="Leave blank to auto-generate default password"
                      type="password"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
          <Button
            type="button"
            variant="ghost"
            onClick={activeStep === 0 ? onClose : handleBack}
            disabled={isSubmitting}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Complete Registration
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RegisterMemberModal;
