import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityApi } from '../../api/availabilityApi';
import { courtsApi } from '../../api/courtsApi';
import { bookingsApi } from '../../api/bookingsApi';
import { membersApi } from '../../api/membersApi';
import { useAuth } from '../../context/AuthContext';
import { emitToast } from '../../api/client';
import AvailabilityGrid from '../../components/availability/AvailabilityGrid';
import {
  Calendar,
  Clock,
  Sparkles,
  Shield,
  CheckCircle,
  X,
  CreditCard,
  Lock,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  Hourglass,
  ArrowRight,
  Info
} from 'lucide-react';

export default function CourtBookingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSportId, setSelectedSportId] = useState(null);

  // Selected slot for booking drawer
  const [bookingDrawerSlot, setBookingDrawerSlot] = useState(null);
  const [activeHeldBooking, setActiveHeldBooking] = useState(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState(null);

  // Co-players state
  const [coPlayers, setCoPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [isGuestPlayer, setIsGuestPlayer] = useState(false);

  // Conflict state (someone took slot)
  const [slotTakenError, setSlotTakenError] = useState(null);

  // 1. Fetch Sports
  const { data: sports = [] } = useQuery({
    queryKey: ['public-sports'],
    queryFn: courtsApi.getAllSports,
  });

  // 2. Fetch Availability Grid for Selected Date & Sport
  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ['availability', selectedDate, selectedSportId, user?.id],
    queryFn: () =>
      availabilityApi.getAvailability({
        date: selectedDate,
        sportId: selectedSportId,
        userId: user?.id,
      }),
    refetchInterval: 15000,
  });

  // 3. Connect to live SSE stream for real-time grid updates
  useEffect(() => {
    const streamUrl = availabilityApi.getStreamUrl(selectedDate, selectedSportId);
    let eventSource = null;

    try {
      eventSource = new EventSource(streamUrl);
      eventSource.addEventListener('AVAILABILITY_CHANGED', () => {
        queryClient.invalidateQueries(['availability', selectedDate]);
      });
      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (err) {
      console.warn('Failed to connect SSE:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedDate, selectedSportId, queryClient]);

  // 4. Hold Timer Countdown
  useEffect(() => {
    if (!activeHeldBooking?.holdExpiresAt) {
      setHoldSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const expires = new Date(activeHeldBooking.holdExpiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setHoldSecondsRemaining(diff);
      if (diff <= 0) {
        emitToast({
          type: 'warning',
          title: 'Hold Expired',
          message: 'Your 5-minute slot hold has expired. Please select the slot again.',
        });
        setActiveHeldBooking(null);
        setBookingDrawerSlot(null);
        queryClient.invalidateQueries(['availability', selectedDate]);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHeldBooking, selectedDate, queryClient]);

  // Create / Hold Booking Mutation
  const holdBookingMutation = useMutation({
    mutationFn: (payload) => bookingsApi.createBooking(payload),
    onSuccess: (data) => {
      setSlotTakenError(null);
      setActiveHeldBooking(data);
      queryClient.invalidateQueries(['availability', selectedDate]);
      emitToast({
        type: 'success',
        title: 'Slot Held (5-Min Lock)',
        message: 'Your slot is held. Confirm within 5 minutes to finalize.',
      });
    },
    onError: (err) => {
      const errorData = err.response?.data;
      if (err.response?.status === 409 || errorData?.code === 'SLOT_TAKEN') {
        // Collect alternative available slots today
        const alternatives = [];
        if (availabilityData?.courts) {
          for (const court of availabilityData.courts) {
            for (const slot of court.slots) {
              if (slot.state === 'AVAILABLE' && slot.startTime !== bookingDrawerSlot?.slot?.startTime) {
                alternatives.push({ court, slot });
              }
              if (alternatives.length >= 3) break;
            }
            if (alternatives.length >= 3) break;
          }
        }
        setSlotTakenError({
          message: errorData?.message || 'Someone just took this slot!',
          alternatives,
        });
      } else {
        emitToast({
          type: 'error',
          title: 'Hold Failed',
          message: errorData?.message || err.message,
        });
      }
    },
  });

  // Confirm Held Booking Mutation
  const confirmBookingMutation = useMutation({
    mutationFn: (bookingId) => bookingsApi.confirmBooking(bookingId),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Booking Confirmed!',
        message: `Reservation ${data.bookingReference} confirmed on ${data.courtName}!`,
      });
      setBookingDrawerSlot(null);
      setActiveHeldBooking(null);
      setCoPlayers([]);
      queryClient.invalidateQueries(['availability', selectedDate]);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Waitlist Mutation
  const waitlistMutation = useMutation({
    mutationFn: (payload) => bookingsApi.joinWaitlist(payload),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Joined Waitlist (FIFO)',
        message: "You're in the queue. If this slot opens up, you'll receive a 10-minute hold!",
      });
      setBookingDrawerSlot(null);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Waitlist Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const handleSlotSelect = (court, slot) => {
    setSlotTakenError(null);
    setActiveHeldBooking(null);
    setCoPlayers([]);
    setBookingDrawerSlot({ court, slot });
  };

  const handleProceedToHold = () => {
    if (!bookingDrawerSlot) return;
    const participants = coPlayers.map((cp) => ({
      guestName: cp.name,
      guestPhone: cp.phone,
      isGuest: cp.isGuest,
      fee: cp.isGuest ? 5.0 : 0.0,
    }));

    holdBookingMutation.mutate({
      courtId: bookingDrawerSlot.court.courtId,
      userId: user?.id,
      startTime: bookingDrawerSlot.slot.startTime,
      endTime: bookingDrawerSlot.slot.endTime,
      source: 'ONLINE',
      isHold: true,
      participants,
    });
  };

  const handleAddCoPlayer = () => {
    if (!newPlayerName.trim()) return;
    setCoPlayers([
      ...coPlayers,
      {
        id: crypto.randomUUID(),
        name: newPlayerName.trim(),
        phone: newPlayerPhone.trim(),
        isGuest: isGuestPlayer,
        fee: isGuestPlayer ? 5.0 : 0.0,
      },
    ]);
    setNewPlayerName('');
    setNewPlayerPhone('');
  };

  const handleRemoveCoPlayer = (id) => {
    setCoPlayers(coPlayers.filter((p) => p.id !== id));
  };

  const formatTimer = (seconds) => {
    if (seconds == null) return '05:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalCalculatedPrice = () => {
    const base = Number(bookingDrawerSlot?.slot?.price || 0);
    const guestFees = coPlayers.filter((p) => p.isGuest).length * 5.0;
    return (base + guestFees).toFixed(2);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      <AvailabilityGrid
        availabilityData={availabilityData}
        isLoading={isLoading}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        sports={sports}
        selectedSportId={selectedSportId}
        onSportChange={setSelectedSportId}
        onSlotSelect={handleSlotSelect}
        selectedSlot={
          bookingDrawerSlot
            ? {
                courtId: bookingDrawerSlot.court.courtId,
                startTime: bookingDrawerSlot.slot.startTime,
              }
            : null
        }
      />

      {/* Booking Drawer / Hold Modal */}
      {bookingDrawerSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Reserve Court Session
              </h3>
              <button
                onClick={() => {
                  setBookingDrawerSlot(null);
                  setActiveHeldBooking(null);
                  setSlotTakenError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 409 Conflict State: Friendly Alternatives */}
            {slotTakenError && (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  {slotTakenError.message}
                </div>
                <p>Another athlete just booked or held this slot. Here are nearby open alternatives today:</p>
                {slotTakenError.alternatives.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {slotTakenError.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setBookingDrawerSlot(alt);
                          setSlotTakenError(null);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/20 text-left transition"
                      >
                        <div>
                          <strong className="block text-white text-xs">{alt.court.courtName}</strong>
                          <span className="text-[11px] text-slate-400">{alt.slot.localStartTime} - {alt.slot.localEndTime}</span>
                        </div>
                        <span className="text-emerald-400 font-bold font-mono text-xs">{alt.slot.formattedPrice}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No other open slots for this sport today.</p>
                )}
                {/* Join Waitlist CTA */}
                <button
                  disabled={waitlistMutation.isPending}
                  onClick={() =>
                    waitlistMutation.mutate({
                      courtId: bookingDrawerSlot.court.courtId,
                      startTime: bookingDrawerSlot.slot.startTime,
                      endTime: bookingDrawerSlot.slot.endTime,
                      memberId: user?.memberId,
                    })
                  }
                  className="mt-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  Join Waitlist (Get notified if released)
                </button>
              </div>
            )}

            {/* Slot Details Card */}
            <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Court:</span>
                <span className="font-bold text-white">{bookingDrawerSlot.court.courtName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Sport & Surface:</span>
                <span>{bookingDrawerSlot.court.sportName} • {bookingDrawerSlot.court.surface}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Date:</span>
                <span className="font-mono text-emerald-300">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Session Window:</span>
                <span className="font-mono font-bold text-white">
                  {bookingDrawerSlot.slot.localStartTime} - {bookingDrawerSlot.slot.localEndTime} (60 min)
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-slate-300">
                <span className="text-slate-500">Base Slot Price:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {bookingDrawerSlot.slot.formattedPrice}
                </span>
              </div>
            </div>

            {/* Co-players / Extra Players */}
            {!activeHeldBooking && (
              <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" /> Co-Players & Doubles Partners
                  </span>
                  <span className="text-[11px] text-slate-400">Quota counts owner only</span>
                </div>

                {coPlayers.map((cp) => (
                  <div key={cp.id} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div>
                      <span className="font-medium text-white">{cp.name}</span>
                      {cp.isGuest && <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Guest (+$5.00)</span>}
                    </div>
                    <button onClick={() => handleRemoveCoPlayer(cp.id)} className="text-rose-400 hover:text-rose-300 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Player Name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone (optional)"
                    value={newPlayerPhone}
                    onChange={(e) => setNewPlayerPhone(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGuestPlayer}
                      onChange={(e) => setIsGuestPlayer(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                    Guest
                  </label>
                  <button
                    onClick={handleAddCoPlayer}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>
            )}

            {/* Total Summary */}
            <div className="flex justify-between items-center px-1 text-sm">
              <span className="text-slate-400 font-medium">Total Payable:</span>
              <span className="text-xl font-extrabold font-mono text-emerald-400">
                ${totalCalculatedPrice()}
              </span>
            </div>

            {/* Active Hold Countdown Badge */}
            {activeHeldBooking && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="block font-semibold">Slot Held Exclusively For You</strong>
                    <span className="text-[11px] text-slate-400">Ref: {activeHeldBooking.bookingReference}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-500/40 font-mono font-bold text-sm text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimer(holdSecondsRemaining)}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  setBookingDrawerSlot(null);
                  setActiveHeldBooking(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              {!activeHeldBooking ? (
                <button
                  disabled={holdBookingMutation.isPending || !!slotTakenError}
                  onClick={handleProceedToHold}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {holdBookingMutation.isPending ? 'Holding...' : 'Hold Slot (5 Min)'}
                </button>
              ) : (
                <button
                  disabled={confirmBookingMutation.isPending}
                  onClick={() => confirmBookingMutation.mutate(activeHeldBooking.id)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {confirmBookingMutation.isPending ? 'Confirming...' : 'Confirm & Reserve'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
