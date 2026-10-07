import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityApi } from '../../api/availabilityApi';
import { courtsApi } from '../../api/courtsApi';
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
  AlertCircle
} from 'lucide-react';

export default function CourtBookingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSportId, setSelectedSportId] = useState(null);
  const [bookingDrawerSlot, setBookingDrawerSlot] = useState(null);
  const [activeHold, setActiveHold] = useState(null);

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
    refetchInterval: 15000, // Background poll every 15s in addition to SSE
  });

  // 3. Connect to live SSE stream for real-time updates
  useEffect(() => {
    const streamUrl = availabilityApi.getStreamUrl(selectedDate, selectedSportId);
    let eventSource = null;

    try {
      eventSource = new EventSource(streamUrl);
      eventSource.addEventListener('AVAILABILITY_CHANGED', () => {
        queryClient.invalidateQueries(['availability', selectedDate]);
      });
      eventSource.addEventListener('CONNECTED', (e) => {
        console.log('SSE connected:', e.data);
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

  // Hold slot mutation
  const holdMutation = useMutation({
    mutationFn: availabilityApi.holdSlot,
    onSuccess: (data) => {
      setActiveHold(data);
      queryClient.invalidateQueries(['availability', selectedDate]);
      emitToast({
        type: 'success',
        title: 'Slot Held (5-min lock)',
        message: 'Your slot is held for 5 minutes to complete reservation.',
      });
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Could not hold slot',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const handleSlotSelect = (court, slot) => {
    setBookingDrawerSlot({ court, slot });
  };

  const handleProceedToHold = () => {
    if (!bookingDrawerSlot) return;
    holdMutation.mutate({
      courtId: bookingDrawerSlot.court.courtId,
      startTime: bookingDrawerSlot.slot.startTime,
      endTime: bookingDrawerSlot.slot.endTime,
      userId: user?.id,
    });
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
        selectedSlot={bookingDrawerSlot ? {
          courtId: bookingDrawerSlot.court.courtId,
          startTime: bookingDrawerSlot.slot.startTime,
        } : null}
      />

      {/* Booking Drawer / Confirmation Modal */}
      {bookingDrawerSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Reserve Court Slot
              </h3>
              <button
                onClick={() => {
                  setBookingDrawerSlot(null);
                  setActiveHold(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Court:</span>
                <span className="font-bold text-white">{bookingDrawerSlot.court.courtName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Sport:</span>
                <span>{bookingDrawerSlot.court.sportName} ({bookingDrawerSlot.court.surface})</span>
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
                <span className="text-slate-500">Resolved Rate:</span>
                <span className="font-mono text-lg font-extrabold text-emerald-400">
                  {bookingDrawerSlot.slot.formattedPrice}
                </span>
              </div>
            </div>

            {activeHold ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="block font-semibold">Slot Held in Cart!</strong>
                  Checkout hold token: <span className="font-mono">{activeHold.holdToken.substring(0, 16)}...</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Holding this slot prevents other members from booking it for 5 minutes.</span>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  setBookingDrawerSlot(null);
                  setActiveHold(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              {!activeHold ? (
                <button
                  disabled={holdMutation.isPending}
                  onClick={handleProceedToHold}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {holdMutation.isPending ? 'Holding...' : 'Hold Slot (5 min)'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    emitToast({
                      type: 'success',
                      title: 'Booking Confirmed!',
                      message: `Reserved ${bookingDrawerSlot.court.courtName} at ${bookingDrawerSlot.slot.localStartTime}.`,
                    });
                    setBookingDrawerSlot(null);
                    setActiveHold(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Confirm & Finalize
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
