import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Award,
  Sparkles,
  Shield,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  CreditCard,
  RefreshCw,
  Trash2,
  ChevronRight,
  Filter,
  DollarSign,
  AlertTriangle,
  Info
} from 'lucide-react';
import { socialApi } from '../../api/socialApi';
import { courtsApi } from '../../api/courtsApi';
import { useAuth } from '../../context/AuthContext';
import { emitToast } from '../../api/client';

export default function SocialPlayPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = user?.role && ['OWNER', 'MANAGER', 'FRONT_DESK', 'COACH'].includes(user.role);

  // Filter states
  const [selectedSportId, setSelectedSportId] = useState('ALL');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'all'

  // Modals
  const [selectedSessionForJoin, setSelectedSessionForJoin] = useState(null);
  const [selectedSessionForLeave, setSelectedSessionForLeave] = useState(null);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Guest join state
  const [isGuestJoin, setIsGuestJoin] = useState(!user);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Attendance local state
  const [localAttendance, setLocalAttendance] = useState({});

  // 1. Fetch Sports
  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: courtsApi.getAllSports,
  });

  // 2. Fetch Courts
  const { data: courts = [] } = useQuery({
    queryKey: ['active-courts'],
    queryFn: courtsApi.getActiveCourts,
  });

  // 3. Fetch Social Sessions
  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['social-sessions', selectedSportId, activeTab],
    queryFn: () =>
      socialApi.getSocialSessions({
        sportId: selectedSportId === 'ALL' ? undefined : selectedSportId,
        from: activeTab === 'upcoming' ? new Date().toISOString() : undefined,
      }),
  });

  // Join Mutation
  const joinMutation = useMutation({
    mutationFn: ({ sessionId, payload }) => socialApi.joinSocialSession(sessionId, payload),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: data.status === 'WAITLISTED' ? 'Added to Waitlist' : 'Spot Reserved!',
        message: data.status === 'WAITLISTED'
          ? `You are on the waitlist (Position #${data.waitlistPosition || 1}).`
          : 'You are confirmed for this social session!',
      });
      queryClient.invalidateQueries({ queryKey: ['social-sessions'] });
      setSelectedSessionForJoin(null);
      setGuestName('');
      setGuestPhone('');
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Unable to Join',
        message: err.response?.data?.message || err.message || 'Error joining social session',
      });
    },
  });

  // Leave Mutation
  const leaveMutation = useMutation({
    mutationFn: ({ sessionId, participantId }) => socialApi.leaveSocialSession(sessionId, participantId),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Session Left',
        message: data.paymentStatus === 'REFUNDED'
          ? 'Spot cancelled and fee refunded to your account balance.'
          : 'Your registration has been cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['social-sessions'] });
      setSelectedSessionForLeave(null);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.response?.data?.message || err.message || 'Error leaving social session',
      });
    },
  });

  // Cancel Session Mutation (Staff)
  const cancelSessionMutation = useMutation({
    mutationFn: ({ sessionId, cancelSeries }) =>
      socialApi.cancelSocialSession(sessionId, { cancelSeries }, 'Session cancelled by staff'),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Session Cancelled',
        message: 'The session has been cancelled and participants notified/refunded.',
      });
      queryClient.invalidateQueries({ queryKey: ['social-sessions'] });
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Attendance Mutation
  const attendanceMutation = useMutation({
    mutationFn: ({ sessionId, updates }) =>
      socialApi.markAttendance(sessionId, { updates }),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Attendance Saved',
        message: 'Participant attendance records updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['social-sessions'] });
      setAttendanceSession(null);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Failed to Save Attendance',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Create Session Form State
  const [formTitle, setFormTitle] = useState('Friday Social Mixer');
  const [formSportId, setFormSportId] = useState('');
  const [formCourtId, setFormCourtId] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().split('T')[0];
  });
  const [formStartTime, setFormStartTime] = useState('18:00');
  const [formDurationMinutes, setFormDurationMinutes] = useState(180);
  const [formCapacity, setFormCapacity] = useState(12);
  const [formMinParticipants, setFormMinParticipants] = useState(4);
  const [formFeeMember, setFormFeeMember] = useState(10.0);
  const [formFeeGuest, setFormFeeGuest] = useState(15.0);
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formRecurrenceWeeks, setFormRecurrenceWeeks] = useState(4);
  const [formAllowJunior, setFormAllowJunior] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: (payload) => socialApi.createSocialSession(payload),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Session Created',
        message: 'Social play session and court blocks scheduled successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['social-sessions'] });
      setShowCreateModal(false);
      setCreateError(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message;
      setCreateError(msg);
      emitToast({
        type: 'error',
        title: 'Scheduling Conflict',
        message: msg,
      });
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError(null);

    const startDateTime = new Date(`${formStartDate}T${formStartTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + formDurationMinutes * 60000);

    const payload = {
      sportId: formSportId || (sports[0]?.id),
      courtId: formCourtId || (courts[0]?.id),
      title: formTitle,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      capacity: parseInt(formCapacity, 10),
      minParticipants: parseInt(formMinParticipants, 10),
      feeMember: parseFloat(formFeeMember),
      feeGuest: parseFloat(formFeeGuest),
      allowJunior: formAllowJunior,
      recurrenceRule: formIsRecurring ? `FREQ=WEEKLY;INTERVAL=1;COUNT=${formRecurrenceWeeks}` : null,
      generateWeeksAhead: formIsRecurring ? parseInt(formRecurrenceWeeks, 10) : 1,
    };

    createSessionMutation.mutate(payload);
  };

  const handleOpenAttendance = (session) => {
    setAttendanceSession(session);
    const initialMap = {};
    (session.participants || []).forEach((p) => {
      initialMap[p.id] = p.attendanceStatus || (p.status === 'JOINED' ? 'ATTENDED' : 'JOINED');
    });
    setLocalAttendance(initialMap);
  };

  const handleSaveAttendance = () => {
    if (!attendanceSession) return;
    const updates = Object.entries(localAttendance).map(([participantId, status]) => ({
      participantId,
      attendanceStatus: status,
    }));
    attendanceMutation.mutate({ sessionId: attendanceSession.id, updates });
  };

  const formatSessionTime = (startAt, endAt) => {
    try {
      const s = new Date(startAt);
      const e = new Date(endAt);
      const dayName = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const startTime = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = e.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${dayName} · ${startTime} - ${endTime}`;
    } catch {
      return `${startAt} - ${endAt}`;
    }
  };

  // User's participant state in a given session
  const getUserParticipant = (session) => {
    if (!user) return null;
    return (session.participants || []).find(
      (p) =>
        (p.memberId === user.id || p.memberId === user.memberId) &&
        p.status !== 'CANCELLED'
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="social-play-container">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-900 via-surface-950 to-slate-900 border border-slate-800/80 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Community & Friday Socials
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Social Play Sessions
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Meet fellow champions, play friendly round-robins, and level up your game.
              Courts are reserved automatically with real-time capacity and waitlist management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="refresh-sessions-btn"
              onClick={() => refetch()}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-surface-900/80 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {isStaff && (
              <button
                type="button"
                id="create-social-session-btn"
                onClick={() => {
                  setCreateError(null);
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                Schedule Session
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Active Sessions</div>
            <div className="text-xl font-black text-white mt-0.5">{sessions.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Total Joined</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {sessions.reduce((acc, s) => acc + (s.joinedCount || 0), 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">On Waitlists</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {sessions.reduce((acc, s) => acc + (s.waitlistCount || 0), 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Open Spots</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">
              {sessions.reduce((acc, s) => acc + (s.availableSpots || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Sport Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="sport-filter-tabs">
          <button
            type="button"
            id="sport-filter-all"
            onClick={() => setSelectedSportId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedSportId === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-surface-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Sports
          </button>
          {sports.map((sport) => (
            <button
              key={sport.id}
              id={`sport-filter-${sport.id}`}
              onClick={() => setSelectedSportId(sport.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedSportId === sport.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-surface-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sport.name}
            </button>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-surface-900 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            id="tab-upcoming"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'upcoming'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            id="tab-all"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Sessions
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="sessions-loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-surface-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Social Sessions Scheduled</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'There are no upcoming social play sessions matching your filter.'
              : 'No past or upcoming sessions found.'}
          </p>
          {isStaff && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule One Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="sessions-grid" data-testid="sessions-grid">
          <AnimatePresence>
            {sessions.map((session) => {
              const myParticipant = getUserParticipant(session);
              const isJoined = myParticipant?.status === 'JOINED';
              const isWaitlisted = myParticipant?.status === 'WAITLISTED';
              const isFull = session.isFull || session.availableSpots <= 0;
              const fillPct = Math.min(100, Math.round(((session.joinedCount || 0) / (session.capacity || 1)) * 100));

              return (
                <motion.div
                  key={session.id}
                  id={`session-card-${session.id}`}
                  data-testid={`session-card-${session.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-3xl border transition flex flex-col justify-between overflow-hidden ${
                    session.status === 'CANCELLED'
                      ? 'bg-surface-950/40 border-rose-900/30 opacity-70'
                      : isJoined
                      ? 'bg-surface-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : isWaitlisted
                      ? 'bg-surface-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'bg-surface-900/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Top Header Card */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {session.sportName || 'Racquet Sport'}
                          </span>
                          {session.recurrenceRule && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" /> Weekly
                            </span>
                          )}
                          {session.allowJunior ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              All Ages
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                              Adults 18+
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight pt-1">
                          {session.title}
                        </h3>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {session.status === 'CANCELLED' ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Cancelled
                          </span>
                        ) : isJoined ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Booked
                          </span>
                        ) : isWaitlisted ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Waitlist #{myParticipant?.waitlistPosition || 1}
                          </span>
                        ) : isFull ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Full
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {session.availableSpots} Left
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Court and Schedule */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-200">
                          {formatSessionTime(session.startAt, session.endAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Court: <strong className="text-slate-300">{session.courtName}</strong></span>
                        <span className="text-slate-600">·</span>
                        <span>Min {session.minParticipants} players</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Capacity</span>
                        <span className="font-bold text-white">
                          <span className={fillPct >= 100 ? 'text-rose-400' : 'text-emerald-400'}>
                            {session.joinedCount}
                          </span>
                          <span className="text-slate-500"> / {session.capacity} spots</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            fillPct >= 100
                              ? 'bg-rose-500'
                              : fillPct >= 80
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      {session.waitlistCount > 0 && (
                        <div className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.waitlistCount} golfer(s)/player(s) on waitlist
                        </div>
                      )}
                    </div>

                    {/* Participant Avatars */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        {(session.participants || [])
                          .filter((p) => p.status === 'JOINED')
                          .slice(0, 5)
                          .map((p, idx) => (
                            <div
                              key={p.id || idx}
                              title={p.memberName || p.guestName || 'Player'}
                              className="w-7 h-7 rounded-full border-2 border-surface-900 bg-gradient-to-tr from-slate-700 to-slate-600 text-[10px] font-bold text-white flex items-center justify-center uppercase shadow"
                            >
                              {(p.memberName || p.guestName || 'P').slice(0, 2)}
                            </div>
                          ))}
                        {(session.joinedCount || 0) > 5 && (
                          <div className="w-7 h-7 rounded-full border-2 border-surface-900 bg-surface-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                            +{session.joinedCount - 5}
                          </div>
                        )}
                        {(session.joinedCount || 0) === 0 && (
                          <span className="text-[11px] text-slate-500 italic">No players yet</span>
                        )}
                      </div>

                      {/* Pricing badge */}
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">
                          ${Number(session.feeMember || 0).toFixed(2)}
                          <span className="text-[10px] text-slate-400 font-normal"> / member</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Guest: ${Number(session.feeGuest || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-4 bg-surface-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* User CTA: Join / Leave */}
                    <div className="flex-1 flex items-center gap-2">
                      {session.status === 'CANCELLED' ? (
                        <span className="text-xs text-rose-400 italic">Session cancelled</span>
                      ) : isJoined || isWaitlisted ? (
                        <button
                          type="button"
                          id={`leave-session-btn-${session.id}`}
                          data-testid={`leave-session-btn-${session.id}`}
                          onClick={() => setSelectedSessionForLeave({ session, participant: myParticipant })}
                          className="w-full px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          {isJoined ? 'Leave Session' : 'Leave Waitlist'}
                        </button>
                      ) : isFull ? (
                        <button
                          type="button"
                          id={`join-waitlist-btn-${session.id}`}
                          data-testid={`join-waitlist-btn-${session.id}`}
                          onClick={() => setSelectedSessionForJoin(session)}
                          className="w-full px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Join Waitlist
                        </button>
                      ) : (
                        <button
                          type="button"
                          id={`join-session-btn-${session.id}`}
                          data-testid={`join-session-btn-${session.id}`}
                          onClick={() => setSelectedSessionForJoin(session)}
                          className="w-full px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Join Session
                        </button>
                      )}
                    </div>

                    {/* Staff Console Actions */}
                    {isStaff && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          id={`attendance-btn-${session.id}`}
                          data-testid={`attendance-btn-${session.id}`}
                          title="Manage Attendance"
                          onClick={() => handleOpenAttendance(session)}
                          className="p-2 rounded-xl border border-slate-700 bg-surface-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        {session.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            id={`cancel-session-btn-${session.id}`}
                            data-testid={`cancel-session-btn-${session.id}`}
                            title="Cancel Session"
                            onClick={() => {
                              if (window.confirm('Cancel this session? All joined participants will be refunded.')) {
                                cancelSessionMutation.mutate({ sessionId: session.id, cancelSeries: false });
                              }
                            }}
                            className="p-2 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 text-xs transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* MODAL 1: Join Session Confirmation */}
      <AnimatePresence>
        {selectedSessionForJoin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" data-testid="join-session-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-surface-900 border border-slate-800 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Registration
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedSessionForJoin.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSessionForJoin(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notice */}
              {selectedSessionForJoin.isFull || selectedSessionForJoin.availableSpots <= 0 ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>
                    This session is currently at full capacity ({selectedSessionForJoin.capacity} players).
                    You will be added to the <strong>auto-promoting waitlist</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>
                    Spots available: <strong>{selectedSessionForJoin.availableSpots} remaining</strong>.
                    Confirm to lock in your spot immediately.
                  </span>
                </div>
              )}

              {/* Member vs Guest Selector */}
              <div className="space-y-3">
                <div className="flex items-center p-1 rounded-xl bg-surface-950 border border-slate-800 text-xs">
                  <button
                    type="button"
                    id="member-tab-btn"
                    onClick={() => setIsGuestJoin(false)}
                    className={`flex-1 py-2 rounded-lg font-bold transition ${
                      !isGuestJoin ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Club Member
                  </button>
                  <button
                    type="button"
                    id="guest-tab-btn"
                    onClick={() => setIsGuestJoin(true)}
                    className={`flex-1 py-2 rounded-lg font-bold transition ${
                      isGuestJoin ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Non-Member Guest
                  </button>
                </div>

                {!isGuestJoin ? (
                  <div className="p-4 rounded-2xl bg-surface-950/60 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Signing up as:</span>
                      <span className="font-bold text-white">{user?.fullName || 'Active Member'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Member Fee:</span>
                      <span className="font-bold text-emerald-400">
                        ${Number(selectedSessionForJoin.feeMember || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                      VIP Gold Plan holders enjoy 100% complimentary access ($0.00).
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Guest Full Name</label>
                      <input
                        type="text"
                        id="guest-name-input"
                        data-testid="guest-name-input"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Michael Jordan"
                        className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Phone Number (Required for SMS Alerts)</label>
                      <input
                        type="tel"
                        id="guest-phone-input"
                        data-testid="guest-phone-input"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+1-555-0199"
                        className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Guest Rate:</span>
                      <span className="font-bold text-emerald-400">
                        ${Number(selectedSessionForJoin.feeGuest || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Policy note */}
              <div className="text-[11px] text-slate-500 space-y-1">
                <div>• Cancellations up to 2 hours before start receive full refund hook.</div>
                <div>• Cancellation after session start is strictly prohibited.</div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForJoin(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-join-btn"
                  data-testid="confirm-join-btn"
                  disabled={joinMutation.isPending || (isGuestJoin && (!guestName || !guestPhone))}
                  onClick={() => {
                    const payload = isGuestJoin
                      ? { guestName, guestPhone }
                      : { memberId: user?.id };
                    joinMutation.mutate({ sessionId: selectedSessionForJoin.id, payload });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {joinMutation.isPending ? 'Processing...' : 'Confirm Registration'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Leave Session Confirmation */}
      <AnimatePresence>
        {selectedSessionForLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" data-testid="leave-session-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-surface-900 border border-slate-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Leave Social Session?</h3>
                  <p className="text-xs text-slate-400">{selectedSessionForLeave.session.title}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  Are you sure you want to surrender your registration?
                </p>
                <p className="text-[11px] text-slate-400">
                  If you leave more than 2 hours before start, any paid fee will be automatically refunded.
                  The next player on the waitlist will be immediately promoted.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForLeave(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                >
                  Keep Spot
                </button>
                <button
                  type="button"
                  id="confirm-leave-btn"
                  data-testid="confirm-leave-btn"
                  disabled={leaveMutation.isPending}
                  onClick={() =>
                    leaveMutation.mutate({
                      sessionId: selectedSessionForLeave.session.id,
                      participantId: selectedSessionForLeave.participant.id,
                    })
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {leaveMutation.isPending ? 'Leaving...' : 'Yes, Leave'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Staff Recurrence Scheduler */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto" data-testid="scheduler-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-surface-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Staff Console
                  </span>
                  <h3 className="text-xl font-bold text-white">Schedule Social Session</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Scheduling Conflict:</strong>
                    <span>{createError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Session Title</label>
                  <input
                    type="text"
                    id="create-title-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Sport</label>
                    <select
                      id="create-sport-select"
                      value={formSportId}
                      onChange={(e) => setFormSportId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {sports.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Reserved Court</label>
                    <select
                      id="create-court-select"
                      value={formCourtId}
                      onChange={(e) => setFormCourtId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.surface})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Start Date</label>
                    <input
                      type="date"
                      id="create-date-input"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Start Time</label>
                    <input
                      type="time"
                      id="create-time-input"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Duration (Min)</label>
                    <input
                      type="number"
                      id="create-duration-input"
                      value={formDurationMinutes}
                      step={30}
                      onChange={(e) => setFormDurationMinutes(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Capacity</label>
                    <input
                      type="number"
                      id="create-capacity-input"
                      value={formCapacity}
                      min={1}
                      onChange={(e) => setFormCapacity(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Min Players</label>
                    <input
                      type="number"
                      id="create-min-players-input"
                      value={formMinParticipants}
                      min={1}
                      onChange={(e) => setFormMinParticipants(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Member Fee ($)</label>
                    <input
                      type="number"
                      id="create-fee-member-input"
                      value={formFeeMember}
                      step={1}
                      min={0}
                      onChange={(e) => setFormFeeMember(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Guest Fee ($)</label>
                    <input
                      type="number"
                      id="create-fee-guest-input"
                      value={formFeeGuest}
                      step={1}
                      min={0}
                      onChange={(e) => setFormFeeGuest(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Recurrence generator */}
                <div className="p-4 rounded-2xl bg-surface-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Repeat Weekly (e.g. Every Friday)</div>
                      <div className="text-[11px] text-slate-400">
                        Generates occurrences idempotently and blocks the court.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="create-recurring-checkbox"
                      checked={formIsRecurring}
                      onChange={(e) => setFormIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-slate-700"
                    />
                  </div>

                  {formIsRecurring && (
                    <div className="flex items-center gap-3 pt-2">
                      <label className="text-slate-400">Generate for next:</label>
                      <select
                        id="create-recurrence-weeks-select"
                        value={formRecurrenceWeeks}
                        onChange={(e) => setFormRecurrenceWeeks(parseInt(e.target.value, 10))}
                        className="px-3 py-1.5 rounded-lg bg-surface-900 border border-slate-700 text-white text-xs"
                      >
                        <option value={2}>2 weeks</option>
                        <option value={4}>4 weeks</option>
                        <option value={8}>8 weeks</option>
                        <option value={12}>12 weeks</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Junior policy */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-junior-checkbox"
                    checked={formAllowJunior}
                    onChange={(e) => setFormAllowJunior(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-slate-700"
                  />
                  <label htmlFor="create-junior-checkbox" className="text-slate-300">
                    Allow Junior Members (Requires guardian on file & adheres to curfew)
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-session-create-btn"
                    disabled={createSessionMutation.isPending}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createSessionMutation.isPending ? 'Scheduling...' : 'Save & Block Court'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Attendance Management Screen */}
      <AnimatePresence>
        {attendanceSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" data-testid="attendance-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-surface-900 border border-slate-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Front Desk / Coach
                  </span>
                  <h3 className="text-lg font-bold text-white">Attendance Check-in</h3>
                  <p className="text-xs text-slate-400">{attendanceSession.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttendanceSession(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Roster List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {(attendanceSession.participants || []).length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    No participants registered for this session.
                  </div>
                ) : (
                  (attendanceSession.participants || []).map((p) => {
                    const currentStatus = localAttendance[p.id] || p.attendanceStatus || 'JOINED';
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-surface-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center uppercase">
                            {(p.memberName || p.guestName || 'P').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white">
                              {p.memberName || p.guestName}
                              {p.guestPhone && <span className="text-slate-400 font-normal"> ({p.guestPhone})</span>}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Status: <span className="font-semibold text-slate-400">{p.status}</span> · Paid: {p.paymentStatus}
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setLocalAttendance((prev) => ({
                                ...prev,
                                [p.id]: currentStatus === 'ATTENDED' ? 'JOINED' : 'ATTENDED',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              currentStatus === 'ATTENDED'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-surface-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" /> Attended
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLocalAttendance((prev) => ({
                                ...prev,
                                [p.id]: currentStatus === 'ABSENT' ? 'JOINED' : 'ABSENT',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-500 text-white'
                                : 'bg-surface-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <UserX className="w-3 h-3" /> Absent
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAttendanceSession(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  id="save-attendance-btn"
                  data-testid="save-attendance-btn"
                  disabled={attendanceMutation.isPending}
                  onClick={handleSaveAttendance}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition disabled:opacity-50"
                >
                  {attendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
