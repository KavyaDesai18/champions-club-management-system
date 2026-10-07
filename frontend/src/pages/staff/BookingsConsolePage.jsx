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
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONFIRMED</span>;
      case 'HELD':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">HELD</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CANCELLED</span>;
      case 'NO_SHOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">NO SHOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            Court Reservations Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">
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
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> Quick Desk Reservation
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Court:</span>
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
          >
            <option value="">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
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

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ref</th>
                <th className="py-3 px-4">Court</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-sans">
                    No reservations matching current filter.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{b.bookingReference}</td>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">{b.courtName}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-white">{b.memberName || b.userName || b.guestName}</div>
                      <div className="text-[11px] text-slate-500">{b.memberNo || b.guestPhone || 'Guest'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      <div>{new Date(b.startTime).toLocaleDateString()}</div>
                      <div className="text-slate-400">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">{b.source}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      ${Number(b.price || b.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => noShowMutation.mutate({ id: b.id, reason: 'Member failed to arrive' })}
                              className="px-2 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded text-[11px]"
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
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded text-[11px]"
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

      {/* Front-Desk Quick-Book Drawer */}
      {quickBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Quick Front-Desk Reservation
              </h3>
              <button onClick={() => setQuickBookOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode: Member or Guest */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => {
                  setBookMode('MEMBER');
                  setMatchedMemberSuggestion(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  bookMode === 'MEMBER' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
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
                  bookMode === 'GUEST' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Walk-In Guest (Non-Member)
              </button>
            </div>

            {/* Customer Inputs */}
            {bookMode === 'MEMBER' ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400">Search Member (Name, Phone, CC No):</label>
                {selectedMember ? (
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-emerald-500/40">
                    <div>
                      <strong className="block text-white text-xs">{selectedMember.fullName}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {selectedMember.memberNo} • Plan: {selectedMember.planCode}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="text-xs text-slate-400 hover:text-white p-1"
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
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                    {memberResults.length > 0 && (
                      <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs">
                        {memberResults.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberSearchQuery('');
                            }}
                            className="p-2.5 hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-semibold text-white">{m.fullName}</span>
                            <span className="text-slate-400 font-mono">{m.memberNo}</span>
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
                  <label className="block text-xs text-slate-400 mb-1">Guest Full Name:</label>
                  <input
                    type="text"
                    placeholder="Guest Athlete Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Guest Phone Number:</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={guestPhone}
                    onChange={handleGuestPhoneChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                {/* Member linking suggestion if phone matches an existing member */}
                {matchedMemberSuggestion && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4" />
                      Phone matches existing member!
                    </div>
                    <p>
                      <strong>{matchedMemberSuggestion.fullName}</strong> ({matchedMemberSuggestion.memberNo}) is registered with this phone number.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedMember(matchedMemberSuggestion);
                        setBookMode('MEMBER');
                        setMatchedMemberSuggestion(null);
                      }}
                      className="py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] self-start"
                    >
                      Book Under Member Profile Instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Session Settings */}
            <div className="space-y-3 border-t border-slate-800 pt-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Court:</label>
                <select
                  value={targetCourtId}
                  onChange={(e) => setTargetCourtId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
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
                  <label className="block text-xs text-slate-400 mb-1">Date:</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Time (:00 / :30):</label>
                  <input
                    type="time"
                    step="1800"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Booking Channel / Source:</label>
                <select
                  value={bookingSource}
                  onChange={(e) => setBookingSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="FRONT_DESK">FRONT_DESK (Walk-in at reception)</option>
                  <option value="PHONE">PHONE (Call-in reservation)</option>
                  <option value="WALK_IN">WALK_IN (Public court fee)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setQuickBookOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={quickBookMutation.isPending}
                onClick={handleQuickBookSubmit}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
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
