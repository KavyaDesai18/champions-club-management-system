import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Info,
  Shield,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
  Lock,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';

const STATE_CONFIG = {
  AVAILABLE: {
    bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    label: 'Available',
    dot: 'bg-emerald-400',
  },
  BOOKED: {
    bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400 cursor-not-allowed opacity-80',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    label: 'Booked',
    dot: 'bg-rose-500',
  },
  HELD: {
    bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    label: 'Cart Hold',
    dot: 'bg-amber-400',
  },
  BLOCKED: {
    bg: 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed opacity-60',
    badge: 'bg-slate-700 text-slate-300 border-slate-600',
    label: 'Blocked',
    dot: 'bg-slate-500',
  },
  PAST: {
    bg: 'bg-slate-900/60 border-slate-800/50 text-slate-500 cursor-not-allowed opacity-40',
    badge: 'bg-slate-800 text-slate-500 border-slate-700',
    label: 'Past',
    dot: 'bg-slate-600',
  },
  SOCIAL: {
    bg: 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40 text-indigo-300',
    badge: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40',
    label: 'Social Mixer',
    dot: 'bg-indigo-400',
  },
};

export default function AvailabilityGrid({
  availabilityData,
  isLoading,
  selectedDate,
  onDateChange,
  sports = [],
  selectedSportId,
  onSportChange,
  onSlotSelect,
  selectedSlot,
  advanceBookingDays = 14,
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Generate 14-day date strip
  const dateStrip = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < advanceBookingDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ iso, weekday, dayNum, month, isToday: i === 0 });
    }
    return dates;
  }, [advanceBookingDays]);

  // Extract unique times across all courts
  const timeRows = useMemo(() => {
    if (!availabilityData?.courts?.length) return [];
    const timeSet = new Set();
    availabilityData.courts.forEach((c) => {
      c.slots?.forEach((s) => {
        timeSet.add(s.localStartTime);
      });
    });
    return Array.from(timeSet).sort();
  }, [availabilityData]);

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
      {/* 1. Header: Title, Controls, Date Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              Court Availability & Pricing
            </h2>
            <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono font-medium">
              Live Real-Time
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Browse 30-minute intervals, active slots, and personalized tier rates
          </p>
        </div>

        {/* View mode toggle & Legend Summary */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sport Tabs */}
      {sports.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => onSportChange(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              !selectedSportId
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            All Sports
          </button>
          {sports.map((sport) => {
            const isSelected = selectedSportId === sport.id;
            return (
              <button
                key={sport.id}
                onClick={() => onSportChange(sport.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {sport.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Interactive Date Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {dateStrip.map((item) => {
          const isSelected = item.iso === selectedDate;
          return (
            <button
              key={item.iso}
              onClick={() => onDateChange(item.iso)}
              className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[78px] py-2.5 px-2 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {item.isToday ? 'Today' : item.weekday}
              </span>
              <span className="text-lg font-extrabold mt-0.5">{item.dayNum}</span>
              <span className="text-[10px] text-slate-400 font-medium">{item.month}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Color Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-800/60 text-xs">
        <span className="text-slate-400 font-medium text-[11px] mr-1">Legend:</span>
        {Object.entries(STATE_CONFIG).map(([state, cfg]) => (
          <div key={state} className="flex items-center gap-1.5 text-slate-300">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* 5. Facility Closed Warning */}
      {availabilityData?.facilityClosed && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Facility Closed on {selectedDate}</h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {availabilityData.closureReason || 'Scheduled holiday closure'}
            </p>
          </div>
        </div>
      )}

      {/* 6. Main Grid or List View */}
      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Resolving real-time availability and dynamic pricing...</span>
        </div>
      ) : !availabilityData?.courts?.length ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800/50">
          <Info className="w-6 h-6 text-slate-500" />
          <p className="text-sm">No courts found matching selected criteria.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* --- 2D MATRIX GRID --- */
        <div className="overflow-x-auto relative rounded-xl border border-slate-800/80 max-h-[680px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            {/* Sticky Header: Courts */}
            <thead className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shadow-md">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-900 p-3.5 text-xs font-semibold text-slate-400 w-24 border-r border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Time</span>
                  </div>
                </th>
                {availabilityData.courts.map((court) => (
                  <th
                    key={court.courtId}
                    className="p-3.5 text-xs font-semibold text-slate-200 min-w-[150px] border-r border-slate-800/60 last:border-r-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{court.courtName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {court.indoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                      {court.sportName} • {court.surface}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Grid Body: Rows = Times, Cols = Courts */}
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {timeRows.map((time) => (
                <tr key={time} className="hover:bg-slate-900/30 transition-colors">
                  {/* Sticky Time column */}
                  <td className="sticky left-0 z-10 bg-slate-950 p-2.5 font-mono text-[11px] font-bold text-slate-300 border-r border-slate-800 whitespace-nowrap">
                    {time}
                  </td>

                  {/* Slot Cells */}
                  {availabilityData.courts.map((court) => {
                    const slot = court.slots?.find((s) => s.localStartTime === time);
                    if (!slot) {
                      return (
                        <td
                          key={court.courtId}
                          className="p-2 border-r border-slate-800/40 bg-slate-900/20 text-slate-600 text-center"
                        >
                          —
                        </td>
                      );
                    }

                    const cfg = STATE_CONFIG[slot.state] || STATE_CONFIG.BLOCKED;
                    const isSelectable = slot.state === 'AVAILABLE' || slot.state === 'SOCIAL';
                    const isSelected =
                      selectedSlot &&
                      selectedSlot.courtId === court.courtId &&
                      selectedSlot.startTime === slot.startTime;

                    return (
                      <td
                        key={court.courtId}
                        className="p-1.5 border-r border-slate-800/40 last:border-r-0 relative"
                      >
                        <motion.button
                          whileHover={isSelectable ? { scale: 1.02 } : {}}
                          whileTap={isSelectable ? { scale: 0.98 } : {}}
                          disabled={!isSelectable}
                          onClick={() => isSelectable && onSlotSelect && onSlotSelect(court, slot)}
                          onMouseEnter={() => setHoveredSlot({ court, slot })}
                          onMouseLeave={() => setHoveredSlot(null)}
                          className={`w-full py-2 px-2.5 rounded-lg border flex flex-col items-center justify-center transition-all relative ${
                            cfg.bg
                          } ${
                            isSelected
                              ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950'
                              : ''
                          }`}
                        >
                          <span className="font-semibold tracking-tight text-[11px] truncate max-w-full">
                            {cfg.label}
                          </span>
                          {slot.price !== null && (
                            <span className="text-[10px] font-mono mt-0.5 opacity-90 font-bold">
                              {slot.formattedPrice}
                            </span>
                          )}
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* --- MOBILE/CARD LIST VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availabilityData.courts.map((court) => (
            <div
              key={court.courtId}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-white text-sm">{court.courtName}</h4>
                  <p className="text-xs text-slate-400">
                    {court.sportName} • {court.surface} • {court.indoor ? 'Indoor' : 'Outdoor'}
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">
                  {court.status}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {court.slots?.map((slot) => {
                  const cfg = STATE_CONFIG[slot.state] || STATE_CONFIG.BLOCKED;
                  const isSelectable = slot.state === 'AVAILABLE' || slot.state === 'SOCIAL';
                  return (
                    <button
                      key={slot.startTime}
                      disabled={!isSelectable}
                      onClick={() => isSelectable && onSlotSelect && onSlotSelect(court, slot)}
                      className={`py-2 px-1.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                        cfg.bg
                      }`}
                    >
                      <span className="text-[11px] font-mono font-bold">{slot.localStartTime}</span>
                      <span className="text-[10px] font-medium opacity-90 mt-0.5">{cfg.label}</span>
                      {slot.price !== null && (
                        <span className="text-[10px] font-mono font-extrabold text-emerald-300 mt-0.5">
                          {slot.formattedPrice}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Hover Price Breakdown Tooltip Drawer (Fixed Footer) */}
      <AnimatePresence>
        {hoveredSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-white">
                  {hoveredSlot.court.courtName} — {hoveredSlot.slot.localStartTime} to{' '}
                  {hoveredSlot.slot.localEndTime}
                </span>
                <span className="text-slate-400 ml-2">({hoveredSlot.slot.reason || hoveredSlot.slot.state})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">Quote:</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {hoveredSlot.slot.formattedPrice}
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Priced strictly by session start)
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
