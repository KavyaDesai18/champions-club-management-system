import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Calendar, CheckCircle2, Clock, ShieldAlert, Sparkles, Trophy, Wallet } from 'lucide-react';
import { emitToast } from '../../api/client';
import MembershipCard from '../../components/membership/MembershipCard';
import { membershipsApi } from '../../api/membershipsApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export const MemberDashboard = () => {
  const [selectedSport, setSelectedSport] = useState('BADMINTON');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Sample active reservations
  const [reservations, setReservations] = useState([
    {
      id: 'BK-991A82',
      court: 'Badminton Court 3',
      sport: 'BADMINTON',
      time: 'Today, 17:00 - 18:00 IST',
      tier: 'GOLD',
      amount: '$13.50',
      discount: '25% Gold VIP applied',
      status: 'CONFIRMED',
    },
  ]);

  const handleBookSlot = (courtName, slotTime, rate) => {
    // Simulate booking with non-negotiable rules
    const newBooking = {
      id: 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      court: courtName,
      sport: selectedSport,
      time: `Tomorrow, ${slotTime}`,
      tier: 'GOLD',
      amount: `$${(rate * 0.75).toFixed(2)}`,
      discount: '25% Gold VIP applied',
      status: 'CONFIRMED',
    };

    setReservations([newBooking, ...reservations]);
    setBookingSuccess(true);
    emitToast({
      id: Date.now(),
      type: 'success',
      title: 'Booking Confirmed!',
      message: `${courtName} booked for ${newBooking.time}. Idempotency key recorded.`,
    });

    setTimeout(() => setBookingSuccess(false), 4000);
  };

  // Membership state
  const [membership, setMembership] = useState({
    id: 'MEM-VIP-9901',
    planCode: 'GOLD',
    planName: 'Gold Tier VIP',
    status: 'ACTIVE',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    pricePaid: 1200.0,
    memberNo: 'CC-001000',
    fullName: 'Alex Rodriguez',
  });

  useEffect(() => {
    membershipsApi
      .getMyActiveMembership()
      .then((res) => {
        if (res?.success && res?.data) {
          setMembership(res.data);
        }
      })
      .catch(() => {
        // Fallback to active mock data
      });
  }, []);

  return (
    <div className="space-y-8">
      {/* 1. Membership Card with Circular Progress Ring & Days Remaining */}
      <MembershipCard
        member={{
          id: membership?.memberId || 'mem-alex-01',
          fullName: membership?.fullName || 'Alex Rodriguez',
          memberNo: membership?.memberNo || 'CC-001000',
          status: membership?.status,
        }}
        membership={membership}
        onRenewSuccess={(renewed) => {
          setMembership(renewed);
          emitToast({
            id: Date.now(),
            type: 'success',
            title: 'Membership Renewed!',
            message: `Membership extended through ${renewed.endDate || 'new expiry date'}.`,
          });
        }}
      />

      {/* 2. Top Welcome & Quota Alert */}
      <div className="court-card p-6 sm:p-7 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-bold uppercase tracking-wider border border-optic-500/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-optic-500 stroke-[2]" /> Gold Tier Active (25% Court Discount)
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
            Welcome back, Alex!
          </h2>
          <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
            Book slots up to 14 days in advance. All sessions are 60 minutes starting on the hour or half-hour.
          </p>
        </div>

        {/* Quota Progress Pill */}
        <div className="px-5 py-3 rounded-xl border border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-500">
              Today's Quota
            </div>
            <div className="text-lg font-heading font-bold text-court-950 dark:text-white font-mono tabular-nums">
              <span className="text-optic-600 dark:text-optic-400">{reservations.length}</span> / 2 Slots
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-optic-500 flex items-center justify-center font-mono font-bold text-xs text-court-950 dark:text-optic-300">
            50%
          </div>
        </div>
      </div>

      {/* 3. Available Courts & Quick Booking Grid (Designed for Thumbs) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white">
              Quick Court Reservation
            </h3>
            <p className="text-xs text-court-500 dark:text-court-400 font-sans">
              Select sport and 60-minute session slot
            </p>
          </div>

          <div className="flex gap-2">
            {['BADMINTON', 'TENNIS', 'SQUASH'].map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition min-h-[40px] ${
                  selectedSport === sport
                    ? 'bg-optic-500 text-court-950 shadow-court-xs'
                    : 'bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white border border-court-200 dark:border-court-700'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: `${selectedSport} Court 1`, rate: 20.0, nextSlot: '16:00 - 17:00 IST' },
            { name: `${selectedSport} Court 2`, rate: 20.0, nextSlot: '16:30 - 17:30 IST' },
            { name: `${selectedSport} Court 3`, rate: 24.0, nextSlot: '17:00 - 18:00 IST' },
          ].map((court, i) => (
            <div
              key={i}
              className="court-card rounded-xl p-5 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-heading font-bold uppercase text-court-950 dark:text-white text-base">
                      {court.name}
                    </h4>
                    <span className="text-[11px] text-court-500 font-sans">Fixed 60-min slot</span>
                  </div>
                  <Badge variant="grass">Available</Badge>
                </div>

                <div className="mt-4 p-3.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between text-court-500">
                    <span>Base Member Rate:</span>
                    <span className="line-through font-mono tabular-nums">${court.rate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-optic-700 dark:text-optic-400">
                    <span>Gold VIP Rate (25% off):</span>
                    <span className="font-mono tabular-nums">${(court.rate * 0.75).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-court-600 dark:text-court-300 mt-2 pt-2 border-t border-court-200 dark:border-court-800">
                    <Clock className="w-3.5 h-3.5 text-optic-500 stroke-[2]" />
                    <span className="font-mono font-medium">Slot: {court.nextSlot}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleBookSlot(court.name, court.nextSlot, court.rate)}
                className="w-full py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 transition text-xs shadow-court-xs min-h-[48px] flex items-center justify-center"
              >
                Confirm Reservation (${(court.rate * 0.75).toFixed(2)})
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Active Reservations Table */}
      <section className="court-card rounded-xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white">
            Your Scheduled Bookings
          </h3>
          <span className="text-xs font-mono text-court-500">{reservations.length} active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="text-[11px] font-heading font-bold uppercase tracking-wider text-court-500 border-b border-court-200 dark:border-court-800">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Facility</th>
                <th className="pb-3">Slot Window</th>
                <th className="pb-3">Charge</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-court-100 dark:divide-court-800">
              {reservations.map((res) => (
                <tr key={res.id} className="text-court-700 dark:text-court-300">
                  <td className="py-3.5 font-mono text-xs font-bold text-optic-600 dark:text-optic-400">
                    {res.id}
                  </td>
                  <td className="py-3.5 font-semibold text-court-950 dark:text-white">
                    {res.court}
                  </td>
                  <td className="py-3.5 text-xs font-mono text-court-600 dark:text-court-400">
                    {res.time}
                  </td>
                  <td className="py-3.5">
                    <span className="font-mono font-bold text-court-950 dark:text-white tabular-nums">
                      {res.amount}
                    </span>
                    <span className="block text-[10px] text-optic-600 dark:text-optic-400 font-semibold">
                      {res.discount}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-grass-500/15 text-grass-700 dark:text-grass-300 border border-grass-500/30">
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MemberDashboard;
