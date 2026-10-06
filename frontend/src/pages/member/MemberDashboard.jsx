import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Calendar, CheckCircle2, Clock, ShieldAlert, Sparkles, Trophy, Wallet } from 'lucide-react';
import { emitToast } from '../../api/client';

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

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quota Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border-brand-500/30 bg-gradient-to-r from-surface-900 to-brand-950/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-400 text-xs font-bold border border-gold-500/30 mb-2">
            <Trophy className="w-3.5 h-3.5" /> Gold Tier Active (25% Court Discount)
          </div>
          <h2 className="text-2xl font-extrabold text-white">Welcome back, Alex!</h2>
          <p className="text-xs text-slate-300 mt-1">
            Book slots up to 14 days in advance. All sessions are 60 minutes starting on the hour or half-hour.
          </p>
        </div>

        {/* Quota Progress Pill */}
        <div className="glass-card px-5 py-3 rounded-xl border-slate-700/80 bg-surface-950/60 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Today's Quota</div>
            <div className="text-lg font-black text-white">
              <span className="text-brand-400">{reservations.length}</span> / 2 Slots
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 flex items-center justify-center font-bold text-xs text-brand-400">
            50%
          </div>
        </div>
      </div>

      {/* Available Courts & Live Booking Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Quick Court Reservation</h3>
            <p className="text-xs text-slate-400">Select sport and 60-minute session slot</p>
          </div>

          <div className="flex gap-2">
            {['BADMINTON', 'TENNIS', 'SQUASH'].map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedSport === sport
                    ? 'bg-brand-500 text-surface-950 shadow-glow'
                    : 'glass-card text-slate-400 hover:text-white'
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
            <div key={i} className="glass-card rounded-2xl p-5 border-slate-800/80 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">{court.name}</h4>
                    <span className="text-[11px] text-slate-400">Fixed 60-min slot</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    Available
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-surface-950/60 border border-slate-800/60 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Member Rate:</span>
                    <span className="line-through">${court.rate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gold-400">
                    <span>Gold VIP Rate (25% off):</span>
                    <span>${(court.rate * 0.75).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 mt-2 pt-2 border-t border-slate-800/60">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span>Slot: {court.nextSlot}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleBookSlot(court.name, court.nextSlot, court.rate)}
                className="w-full py-2.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-surface-950 transition text-sm shadow-glow hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirm Reservation (${(court.rate * 0.75).toFixed(2)})
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Active Reservations Table */}
      <section className="glass-card rounded-2xl p-6 border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Your Scheduled Bookings</h3>
          <span className="text-xs text-slate-400">{reservations.length} active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Facility</th>
                <th className="pb-3">Slot Window</th>
                <th className="pb-3">Charge</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reservations.map((res) => (
                <tr key={res.id} className="text-slate-300">
                  <td className="py-3.5 font-mono text-xs text-brand-400 font-bold">{res.id}</td>
                  <td className="py-3.5 font-semibold text-white">{res.court}</td>
                  <td className="py-3.5 text-xs text-slate-300">{res.time}</td>
                  <td className="py-3.5">
                    <span className="font-bold text-white">{res.amount}</span>
                    <span className="block text-[10px] text-gold-400">{res.discount}</span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
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
