import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookingsApi';
import { courtsApi } from '../../api/courtsApi';
import { emitToast } from '../../api/client';
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  X,
  RefreshCw,
  CheckCircle,
  User,
  Users,
  DollarSign,
  AlertTriangle,
  Hourglass,
  Tag
} from 'lucide-react';

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('UPCOMING'); // UPCOMING, PAST, WAITLIST
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [newCourtId, setNewCourtId] = useState('');
  const [newStartTime, setNewStartTime] = useState('');

  // 1. Fetch My Bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsApi.getMyBookings,
    refetchInterval: 15000,
  });

  // 2. Fetch My Waitlist
  const { data: waitlist = [], isLoading: isLoadingWaitlist } = useQuery({
    queryKey: ['my-waitlist'],
    queryFn: bookingsApi.getMyWaitlist,
  });

  // 3. Fetch Active Courts for Reschedule Picker
  const { data: courts = [] } = useQuery({
    queryKey: ['active-courts'],
    queryFn: courtsApi.getAllCourts,
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => bookingsApi.cancelBooking(id, { reason }),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Booking Cancelled',
        message: `Reservation ${data.bookingReference} has been cancelled and slot freed.`,
      });
      setCancelModalBooking(null);
      setCancelReason('');
      queryClient.invalidateQueries(['my-bookings']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newCourtId, newStartTime }) =>
      bookingsApi.rescheduleBooking(id, { newCourtId, newStartTime }),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Reschedule Successful!',
        message: `Moved to ${data.courtName} at ${new Date(data.startTime).toLocaleTimeString()}.`,
      });
      setRescheduleModalBooking(null);
      queryClient.invalidateQueries(['my-bookings']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Reschedule Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Leave Waitlist Mutation
  const leaveWaitlistMutation = useMutation({
    mutationFn: (id) => bookingsApi.leaveWaitlist(id),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Removed from Waitlist',
        message: 'You have left the waitlist for this slot.',
      });
      queryClient.invalidateQueries(['my-waitlist']);
    },
  });

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'HELD'
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'NO_SHOW'
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONFIRMED</span>;
      case 'HELD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">IN CART (HELD)</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CANCELLED</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">NO SHOW</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const isEligibleForRefund = (startTime) => {
    const diffHours = (new Date(startTime).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours >= 12;
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            My Court Reservations
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Review your upcoming matches, manage schedule changes, or cancel with instant policy clarity.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'UPCOMING'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'PAST'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Past History ({pastBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('WAITLIST')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'WAITLIST'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Waitlist ({waitlist.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {activeTab === 'UPCOMING' && (
        <div className="flex flex-col gap-4">
          {upcomingBookings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-white">No upcoming reservations found.</p>
              <p className="text-xs mt-1">Head to the availability grid to reserve your next match!</p>
            </div>
          ) : (
            upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {b.bookingReference}
                    </span>
                    {getStatusBadge(b.status)}
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      {b.planSnapshot || 'MEMBER'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{b.courtName}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {new Date(b.startTime).toLocaleDateString()} •{' '}
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${Number(b.price || b.totalAmount || 0).toFixed(2)}
                    </span>
                    {b.participants?.length > 0 && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        +{b.participants.length} players
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                  <button
                    onClick={() => {
                      setRescheduleModalBooking(b);
                      setNewCourtId(b.courtId);
                      setNewStartTime(b.startTime);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                  </button>
                  <button
                    onClick={() => setCancelModalBooking(b)}
                    className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Past History Tab */}
      {activeTab === 'PAST' && (
        <div className="flex flex-col gap-4">
          {pastBookings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-white">No past reservations recorded yet.</p>
            </div>
          ) : (
            pastBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-500">{b.bookingReference}</span>
                    {getStatusBadge(b.status)}
                  </div>
                  <h4 className="font-bold text-white text-sm">{b.courtName}</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(b.startTime).toLocaleDateString()} •{' '}
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {b.cancelReason && (
                    <p className="text-[11px] text-rose-400/80 mt-1">Reason: {b.cancelReason}</p>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-400">
                  ${Number(b.price || b.totalAmount || 0).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Waitlist Tab */}
      {activeTab === 'WAITLIST' && (
        <div className="flex flex-col gap-4">
          {waitlist.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Hourglass className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-white">You are not on any active waitlists.</p>
              <p className="text-xs mt-1">If your preferred court slot is taken, join the FIFO waitlist!</p>
            </div>
          ) : (
            waitlist.map((w) => (
              <div
                key={w.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center"
              >
                <div>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 font-bold">
                    {w.status}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">{w.courtName}</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(w.startTime).toLocaleDateString()} •{' '}
                    {new Date(w.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  disabled={leaveWaitlistMutation.isPending}
                  onClick={() => leaveWaitlistMutation.mutate(w.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold rounded-xl"
                >
                  Leave Queue
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cancellation Dialog with Policy Text */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Cancel Reservation
              </h3>
              <button onClick={() => setCancelModalBooking(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Court:</span>
                <span className="font-bold text-white">{cancelModalBooking.courtName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Time:</span>
                <span className="font-mono text-emerald-400">
                  {new Date(cancelModalBooking.startTime).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Policy Clarity Notice */}
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              isEligibleForRefund(cancelModalBooking.startTime)
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">
                  {isEligibleForRefund(cancelModalBooking.startTime)
                    ? 'Eligible for Full Wallet Credit'
                    : 'Late Cancellation Policy (Within 12 Hours)'}
                </strong>
                {isEligibleForRefund(cancelModalBooking.startTime)
                  ? 'Since you are cancelling at least 12 hours before session start, your full booking amount will be credited back.'
                  : 'Cancellations within 12 hours of match time are non-refundable according to Champions Club policy.'}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason for cancellation (optional):</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, injury..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none h-16"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Keep Booking
              </button>
              <button
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancelModalBooking.id,
                    reason: cancelReason || 'MEMBER_VOLUNTARY_CANCEL',
                  })
                }
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-500/20"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                Reschedule Court Session
              </h3>
              <button onClick={() => setRescheduleModalBooking(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the new court and target session start time. The operation is atomic: if the new slot cannot be secured, your current booking remains intact!
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Court:</label>
                <select
                  value={newCourtId}
                  onChange={(e) => setNewCourtId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sportType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">New Start Time (ISO):</label>
                <input
                  type="datetime-local"
                  onChange={(e) => {
                    if (e.target.value) {
                      setNewStartTime(new Date(e.target.value).toISOString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setRescheduleModalBooking(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={rescheduleMutation.isPending || !newCourtId || !newStartTime}
                onClick={() =>
                  rescheduleMutation.mutate({
                    id: rescheduleModalBooking.id,
                    newCourtId,
                    newStartTime,
                  })
                }
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Apply Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
