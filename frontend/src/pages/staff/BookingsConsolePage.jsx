import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookingsApi';
import { courtsApi } from '../../api/courtsApi';
import { membersApi } from '../../api/membersApi';
import { emitToast } from '../../api/client';
import {
  Calendar,
  Clock,
  Layers,
  Search,
  Plus,
  X,
  UserCheck,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign
} from 'lucide-react';

export default function BookingsConsolePage() {
  const queryClient = useQueryClient();

  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [quickBookOpen, setQuickBookOpen] = useState(false);

  // Quick book form state
  const [bookMode, setBookMode] = useState('MEMBER'); // MEMBER or GUEST
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [targetCourtId, setTargetCourtId] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetTime, setTargetTime] = useState('10:00');
  const [bookingSource, setBookingSource] = useState('FRONT_DESK'); // FRONT_DESK, WALK_IN, PHONE

  // Phone match suggestion state
  const [matchedMemberSuggestion, setMatchedMemberSuggestion] = useState(null);

  // 1. Fetch Courts
  const { data: courts = [] } = useQuery({
    queryKey: ['active-courts'],
    queryFn: courtsApi.getAllCourts,
  });

  // 2. Fetch All Bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['console-bookings', selectedCourtId, selectedStatus],
    queryFn: () =>
      bookingsApi.getAllBookings({
        courtId: selectedCourtId || undefined,
        status: selectedStatus || undefined,
      }),
    refetchInterval: 15000,
  });

  // 3. Member Search Query for Quick Book
  const { data: memberResults = [] } = useQuery({
    queryKey: ['member-search', memberSearchQuery],
    queryFn: () => membersApi.searchMembers(memberSearchQuery),
    enabled: bookMode === 'MEMBER' && memberSearchQuery.length >= 2,
  });

  // Check guest phone for existing member linking suggestion
  const handleGuestPhoneChange = async (e) => {
    const phone = e.target.value;
    setGuestPhone(phone);
    if (phone.length >= 8) {
      try {
        const found = await membersApi.searchMembers(phone);
        if (found && found.length > 0) {
          setMatchedMemberSuggestion(found[0]);
        } else {
          setMatchedMemberSuggestion(null);
        }
      } catch {
        setMatchedMemberSuggestion(null);
      }
    } else {
      setMatchedMemberSuggestion(null);
    }
  };

  // Create Staff Quick Booking Mutation
  const quickBookMutation = useMutation({
    mutationFn: (payload) => bookingsApi.createBooking(payload),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Booking Created!',
        message: `Reserved ${data.courtName} for ${data.userName || data.guestName} (${data.bookingReference}).`,
      });
      setQuickBookOpen(false);
      resetQuickBookForm();
      queryClient.invalidateQueries(['console-bookings']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Reservation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Mark No-Show Mutation
  const noShowMutation = useMutation({
    mutationFn: ({ id, reason }) => bookingsApi.markNoShow(id, reason),
    onSuccess: (data) => {
      emitToast({
        type: 'warning',
        title: 'Marked as NO_SHOW',
        message: `Booking ${data.bookingReference} marked as unfulfilled.`,
      });
      queryClient.invalidateQueries(['console-bookings']);
    },
  });

  // Cancel with staff override mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, overrideReason }) =>
      bookingsApi.cancelBooking(id, { staffOverride: true, overrideReason }),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Booking Cancelled (Staff Override)',
        message: `Freed slot for ${data.courtName}.`,
      });
      queryClient.invalidateQueries(['console-bookings']);
    },
  });

  const resetQuickBookForm = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setGuestName('');
    setGuestPhone('');
    setMatchedMemberSuggestion(null);
  };

  const handleQuickBookSubmit = () => {
    if (!targetCourtId) {
      emitToast({ type: 'error', message: 'Please select a court.' });
      return;
    }

    // Combine date and time into ISO UTC
    const [hours, minutes] = targetTime.split(':');
    const startDateTime = new Date(`${targetDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    const payload = {
      courtId: targetCourtId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      source: bookingSource,
      isHold: false, // Desk bookings are immediately confirmed
      memberId: bookMode === 'MEMBER' ? selectedMember?.id : undefined,
      guestName: bookMode === 'GUEST' ? guestName.trim() : undefined,
      guestPhone: bookMode === 'GUEST' ? guestPhone.trim() : undefined,
    };

    quickBookMutation.mutate(payload);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-black uppercase bg-grass-500/20 text-grass-700 dark:text-grass-300 border border-grass-500/30">CONFIRMED</span>;
      case 'HELD':
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-black uppercase bg-optic-500/20 text-optic-700 dark:text-optic-300 border border-optic-500/30">HELD</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-black uppercase bg-court-500/20 text-court-700 dark:text-court-300 border border-court-500/30">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-black uppercase bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-500/30">CANCELLED</span>;
      case 'NO_SHOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-black uppercase bg-clay-500/20 text-clay-700 dark:text-clay-300 border border-clay-500/30">NO SHOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-heading font-bold uppercase bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-black uppercase tracking-wider border border-optic-500/30 mb-2">
            <Calendar className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400" />
            <span>Reservations Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-court-950 dark:text-white uppercase flex items-center gap-2">
            Court Reservations Console
          </h1>
          <p className="text-court-500 dark:text-court-400 text-xs mt-1 font-sans">
            Front-desk quick reservation, phone bookings, walk-in rate allocations, and attendance management.
          </p>
        </div>

        <button
          onClick={() => {
            setQuickBookOpen(true);
            if (!targetCourtId && courts.length > 0) {
              setTargetCourtId(courts[0].id);
            }
          }}
          className="px-4 py-2.5 bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black uppercase tracking-wider rounded-xl text-xs flex items-center gap-2 shadow-court-sm transition"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" /> Quick Desk Reservation
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 p-3.5 rounded-2xl items-center text-xs shadow-court-xs">
        <div className="flex items-center gap-2">
          <span className="text-court-500 font-heading font-bold uppercase">Court:</span>
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-3 py-1.5 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-lg text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
          >
            <option value="">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-court-500 font-heading font-bold uppercase">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-lg text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="HELD">HELD</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>
      </div>

      {/* Dense, Scannable Bookings Table */}
      <div className="court-card bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 rounded-2xl overflow-hidden shadow-court-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-court-700 dark:text-court-300 border-collapse">
            <thead className="bg-court-50 dark:bg-court-950/80 text-court-500 font-heading font-black uppercase tracking-wider text-[11px] border-b border-court-200 dark:border-court-800 h-10">
              <tr>
                <th className="py-2.5 px-4 font-mono">Ref</th>
                <th className="py-2.5 px-4">Court</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-court-100 dark:divide-court-800/60 font-mono">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-court-400 font-sans">
                    No reservations matching current filter.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-court-50 dark:hover:bg-court-800/40 transition h-11">
                    <td className="py-2 px-4 font-bold text-court-950 dark:text-white tabular-nums">{b.bookingReference}</td>
                    <td className="py-2 px-4 font-sans font-semibold text-court-900 dark:text-court-100">{b.courtName}</td>
                    <td className="py-2 px-4 font-sans">
                      <div className="font-semibold text-court-950 dark:text-white">{b.memberName || b.userName || b.guestName}</div>
                      <div className="text-[10px] text-court-400 font-mono">{b.memberNo || b.guestPhone || 'Guest'}</div>
                    </td>
                    <td className="py-2 px-4 text-[11px] tabular-nums">
                      <div>{new Date(b.startTime).toLocaleDateString()}</div>
                      <div className="text-court-400">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-[10px] text-court-500 uppercase font-heading font-bold">{b.source}</td>
                    <td className="py-2 px-4 font-bold text-grass-600 dark:text-grass-400 tabular-nums">
                      ${Number(b.price || b.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-2 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => noShowMutation.mutate({ id: b.id, reason: 'Member failed to arrive' })}
                              className="px-2 py-0.5 bg-clay-500/15 hover:bg-clay-500/25 border border-clay-500/30 text-clay-700 dark:text-clay-300 rounded text-[10px] font-heading font-bold uppercase transition"
                            >
                              No-Show
                            </button>
                            <button
                              onClick={() =>
                                cancelMutation.mutate({
                                  id: b.id,
                                  overrideReason: 'Staff administrative cancellation',
                                })
                              }
                              className="px-2 py-0.5 bg-danger-500/15 hover:bg-danger-500/25 border border-danger-500/30 text-danger-700 dark:text-danger-300 rounded text-[10px] font-heading font-bold uppercase transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Front-Desk Quick-Book Drawer / Modal */}
      {quickBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-court-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 rounded-2xl p-6 max-w-lg w-full shadow-court-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-court-200 dark:border-court-800 pb-3">
              <h3 className="font-heading font-black text-lg text-court-950 dark:text-white uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-optic-500" />
                Quick Front-Desk Reservation
              </h3>
              <button onClick={() => setQuickBookOpen(false)} className="text-court-400 hover:text-court-950 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode: Member or Guest */}
            <div className="flex bg-court-100 dark:bg-court-950 p-1 rounded-xl border border-court-200 dark:border-court-800 text-xs font-heading font-bold uppercase">
              <button
                onClick={() => {
                  setBookMode('MEMBER');
                  setMatchedMemberSuggestion(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  bookMode === 'MEMBER' ? 'bg-optic-500 text-court-950 font-black shadow-court-xs' : 'text-court-500'
                }`}
              >
                Registered Member
              </button>
              <button
                onClick={() => {
                  setBookMode('GUEST');
                  setSelectedMember(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  bookMode === 'GUEST' ? 'bg-optic-500 text-court-950 font-black shadow-court-xs' : 'text-court-500'
                }`}
              >
                Walk-In Guest (Non-Member)
              </button>
            </div>

            {/* Customer Inputs */}
            {bookMode === 'MEMBER' ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-heading font-bold uppercase text-court-500">
                  Search Member (Name, Phone, CC No):
                </label>
                {selectedMember ? (
                  <div className="flex justify-between items-center bg-court-50 dark:bg-court-950 p-3 rounded-xl border border-optic-500/40">
                    <div>
                      <strong className="block text-court-950 dark:text-white text-xs font-heading uppercase">{selectedMember.fullName}</strong>
                      <span className="text-[11px] text-court-500 font-mono tabular-nums">
                        {selectedMember.memberNo} • Plan: {selectedMember.planCode}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="text-xs text-court-400 hover:text-court-950 dark:hover:text-white font-heading font-bold uppercase p-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Type member name or phone..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
                    />
                    {memberResults.length > 0 && (
                      <div className="max-h-36 overflow-y-auto bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl divide-y divide-court-200 dark:divide-court-800 text-xs">
                        {memberResults.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberSearchQuery('');
                            }}
                            className="p-2.5 hover:bg-court-100 dark:hover:bg-court-800 cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-heading font-bold uppercase text-court-950 dark:text-white">{m.fullName}</span>
                            <span className="text-optic-600 dark:text-optic-400 font-mono tabular-nums">{m.memberNo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                    Guest Full Name:
                  </label>
                  <input
                    type="text"
                    placeholder="Guest Athlete Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                    Guest Phone Number:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={guestPhone}
                    onChange={handleGuestPhoneChange}
                    className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-mono outline-none focus:border-optic-500"
                  />
                </div>

                {/* Member linking suggestion if phone matches an existing member */}
                {matchedMemberSuggestion && (
                  <div className="p-3 bg-optic-500/10 border border-optic-500/40 rounded-xl text-xs text-court-900 dark:text-optic-200 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 font-heading font-black text-optic-700 dark:text-optic-400 uppercase">
                      <AlertCircle className="w-4 h-4" />
                      Phone matches existing member!
                    </div>
                    <p className="font-sans">
                      <strong>{matchedMemberSuggestion.fullName}</strong> ({matchedMemberSuggestion.memberNo}) is registered with this phone number.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedMember(matchedMemberSuggestion);
                        setBookMode('MEMBER');
                        setMatchedMemberSuggestion(null);
                      }}
                      className="py-1 px-2.5 bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black uppercase text-[11px] self-start rounded-lg transition"
                    >
                      Book Under Member Profile Instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Session Settings */}
            <div className="space-y-3 border-t border-court-200 dark:border-court-800 pt-3">
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                  Court:
                </label>
                <select
                  value={targetCourtId}
                  onChange={(e) => setTargetCourtId(e.target.value)}
                  className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sportType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                    Date:
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-mono outline-none focus:border-optic-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                    Start Time (:00 / :30):
                  </label>
                  <input
                    type="time"
                    step="1800"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-mono outline-none focus:border-optic-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase text-court-500 mb-1">
                  Booking Channel / Source:
                </label>
                <select
                  value={bookingSource}
                  onChange={(e) => setBookingSource(e.target.value)}
                  className="w-full px-3 py-2 bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl text-xs text-court-950 dark:text-white font-sans outline-none focus:border-optic-500"
                >
                  <option value="FRONT_DESK">FRONT_DESK (Walk-in at reception)</option>
                  <option value="PHONE">PHONE (Call-in reservation)</option>
                  <option value="WALK_IN">WALK_IN (Public court fee)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-court-200 dark:border-court-800 pt-3">
              <button
                onClick={() => setQuickBookOpen(false)}
                className="px-4 py-2 bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-300 rounded-xl text-xs font-heading font-bold uppercase"
              >
                Cancel
              </button>
              <button
                disabled={quickBookMutation.isPending}
                onClick={handleQuickBookSubmit}
                className="px-5 py-2.5 bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black uppercase text-xs rounded-xl shadow-court-sm transition"
              >
                {quickBookMutation.isPending ? 'Confirming...' : 'Reserve Immediately'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
