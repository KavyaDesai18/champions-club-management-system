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
    bg: 'slot-available transition-transform',
    badge: 'bg-grass-500/20 text-grass-700 dark:text-grass-300 border-grass-500/30',
    label: 'Available',
    dot: 'bg-grass-500',
  },
  BOOKED: {
    bg: 'slot-booked cursor-not-allowed opacity-90',
    badge: 'bg-clay-500/20 text-clay-700 dark:text-clay-300 border-clay-500/30',
    label: 'Booked',
    dot: 'bg-clay-500',
  },
  HELD: {
    bg: 'slot-held animate-pulse',
    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    label: 'Cart Hold',
    dot: 'bg-amber-400',
  },
  BLOCKED: {
    bg: 'slot-blocked cursor-not-allowed opacity-75',
    badge: 'bg-court-200 dark:bg-court-700 text-court-600 dark:text-court-300 border-court-300 dark:border-court-600',
    label: 'Blocked',
    dot: 'bg-court-400',
  },
  PAST: {
    bg: 'slot-past cursor-not-allowed opacity-60',
    badge: 'bg-court-100 dark:bg-court-800 text-court-500 border-court-200 dark:border-court-700',
    label: 'Past',
    dot: 'bg-court-500',
  },
  SOCIAL: {
    bg: 'slot-social transition-transform',
    badge: 'bg-hardcourt-500/20 text-hardcourt-700 dark:text-hardcourt-300 border-hardcourt-500/40',
    label: 'Social Mixer',
    dot: 'bg-hardcourt-500',
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
    <div className="w-full court-card border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 rounded-xl p-4 sm:p-6 shadow-court-md flex flex-col gap-6">
      {/* 1. Header: Title, Controls, Date Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-court-200 dark:border-court-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-wider text-court-950 dark:text-court-50 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-optic-500 stroke-[1.75]" />
              Court Availability & Pricing
            </h2>
            <span className="text-xs px-2.5 py-1 bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30 rounded-full font-mono font-bold tracking-tight">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-court-600 dark:text-court-400 mt-1 font-sans">
            Browse 30-minute intervals, active slots, and personalized tier rates
          </p>
        </div>

        {/* View mode toggle & Legend Summary */}
        <div className="flex items-center gap-3">
          <div className="flex bg-court-100 dark:bg-court-800/80 border border-court-200 dark:border-court-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                viewMode === 'grid'
                  ? 'bg-optic-500 text-court-950 shadow-court-sm'
                  : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5 stroke-[1.75]" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                viewMode === 'list'
                  ? 'bg-optic-500 text-court-950 shadow-court-sm'
                  : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5 stroke-[1.75]" />
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
            className={`px-3.5 py-2 rounded-md text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              !selectedSportId
                ? 'bg-optic-500 text-court-950 shadow-court-sm'
                : 'bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-300 hover:bg-court-200 dark:hover:bg-court-700 border border-court-200 dark:border-court-700'
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
                className={`px-3.5 py-2 rounded-md text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-optic-500 text-court-950 shadow-court-sm'
                    : 'bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-300 hover:bg-court-200 dark:hover:bg-court-700 border border-court-200 dark:border-court-700'
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
              className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[78px] py-2 px-2 rounded-md border transition-all ${
                isSelected
                  ? 'bg-optic-500/15 border-optic-500 text-court-950 dark:text-optic-300 shadow-court-sm ring-1 ring-optic-500'
                  : 'bg-court-50 dark:bg-court-850 border-court-200 dark:border-court-800 text-court-600 dark:text-court-400 hover:border-court-300 dark:hover:border-court-700 hover:text-court-900 dark:hover:text-white'
              }`}
            >
              <span className="text-[10px] uppercase font-heading font-bold tracking-wider">
                {item.isToday ? 'Today' : item.weekday}
              </span>
              <span className="text-lg font-heading font-bold tabular-nums mt-0.5 leading-none">{item.dayNum}</span>
              <span className="text-[10px] text-court-500 font-sans mt-0.5">{item.month}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Color Legend Bar with accessible patterns */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3.5 py-2.5 bg-court-50 dark:bg-court-800/50 rounded-lg border border-court-200 dark:border-court-800 text-xs">
        <span className="text-court-500 font-heading font-bold uppercase tracking-wider text-[11px] mr-1">Legend:</span>
        {Object.entries(STATE_CONFIG).map(([state, cfg]) => (
          <div key={state} className="flex items-center gap-1.5 text-court-700 dark:text-court-300 font-sans text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* 5. Facility Closed Warning */}
      {availabilityData?.facilityClosed && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 stroke-[1.75]" />
          <div>
            <h4 className="font-heading font-bold uppercase tracking-wider text-sm">Facility Closed on {selectedDate}</h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5 font-sans">
              {availabilityData.closureReason || 'Scheduled holiday closure'}
            </p>
          </div>
        </div>
      )}

      {/* 6. Main Grid or List View */}
      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-court-400">
          <RefreshCw className="w-8 h-8 animate-spin text-optic-500 stroke-[1.75]" />
          <span className="text-sm font-medium font-sans">Resolving real-time availability and dynamic pricing...</span>
        </div>
      ) : !availabilityData?.courts?.length ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-court-400 bg-court-50 dark:bg-court-850 rounded-lg border border-court-200 dark:border-court-800">
          <Info className="w-6 h-6 text-court-400 stroke-[1.75]" />
          <p className="text-sm font-sans">No courts found matching selected criteria.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* --- 2D MATRIX GRID --- */
        <div className="overflow-x-auto relative rounded-lg border border-court-200 dark:border-court-800 max-h-[680px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            {/* Sticky Header: Courts */}
            <thead className="sticky top-0 z-20 bg-court-100 dark:bg-court-800 border-b border-court-200 dark:border-court-700 shadow-court-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-court-100 dark:bg-court-800 p-3.5 text-xs font-heading font-bold uppercase tracking-wider text-court-600 dark:text-court-300 w-24 border-r border-court-200 dark:border-court-700">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-court-500 stroke-[1.75]" />
                    <span>Time</span>
                  </div>
                </th>
                {availabilityData.courts.map((court) => (
                  <th
                    key={court.courtId}
                    className="p-3.5 text-xs text-court-800 dark:text-court-200 min-w-[150px] border-r border-court-200/80 dark:border-court-700/80 last:border-r-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white text-sm truncate">
                        {court.courtName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-court-200 dark:bg-court-700 text-court-700 dark:text-court-300 font-mono font-bold">
                        {court.indoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </div>
                    <div className="text-[11px] text-court-500 font-sans font-normal mt-0.5">
                      {court.sportName} • {court.surface}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Grid Body: Rows = Times, Cols = Courts */}
            <tbody className="divide-y divide-court-200/60 dark:divide-court-800/60 text-xs">
              {timeRows.map((time) => (
                <tr key={time} className="hover:bg-court-50/60 dark:hover:bg-court-800/40 transition-colors">
                  {/* Sticky Time column */}
                  <td className="sticky left-0 z-10 bg-court-50 dark:bg-court-900 p-2.5 font-mono text-[11px] font-bold text-court-700 dark:text-court-300 border-r border-court-200 dark:border-court-800 whitespace-nowrap tabular-nums">
                    {time}
                  </td>

                  {/* Slot Cells */}
                  {availabilityData.courts.map((court) => {
                    const slot = court.slots?.find((s) => s.localStartTime === time);
                    if (!slot) {
                      return (
                        <td
                          key={court.courtId}
                          className="p-2 border-r border-court-200/40 dark:border-court-800/40 bg-court-50/20 dark:bg-court-900/20 text-court-400 text-center"
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
                        className="p-1.5 border-r border-court-200/40 dark:border-court-800/40 last:border-r-0 relative"
                      >
                        <motion.button
                          whileHover={isSelectable ? { scale: 1.02 } : {}}
                          whileTap={isSelectable ? { scale: 0.98 } : {}}
                          disabled={!isSelectable}
                          onClick={() => isSelectable && onSlotSelect && onSlotSelect(court, slot)}
                          onMouseEnter={() => setHoveredSlot({ court, slot })}
                          onMouseLeave={() => setHoveredSlot(null)}
                          className={`w-full py-2 px-2 rounded-md border flex flex-col items-center justify-center transition-all relative ${
                            cfg.bg
                          } ${
                            isSelected
                              ? 'ring-2 ring-optic-500 ring-offset-2 ring-offset-white dark:ring-offset-court-950 font-bold'
                              : ''
                          }`}
                        >
                          <span className="font-heading font-bold uppercase tracking-wider text-[11px] truncate max-w-full">
                            {cfg.label}
                          </span>
                          {slot.price !== null && (
                            <span className="text-[10px] font-mono tabular-nums mt-0.5 font-bold">
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
              className="court-card bg-court-50/60 dark:bg-court-850/60 border border-court-200 dark:border-court-800 rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-court-200 dark:border-court-800 pb-2">
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white text-sm">
                    {court.courtName}
                  </h4>
                  <p className="text-xs text-court-500 font-sans">
                    {court.sportName} • {court.surface} • {court.indoor ? 'Indoor' : 'Outdoor'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-court-200 dark:bg-court-700 text-court-700 dark:text-court-300 rounded-xs font-mono font-bold">
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
                      className={`py-2 px-1.5 rounded-md border text-center flex flex-col items-center justify-center transition-all ${
                        cfg.bg
                      }`}
                    >
                      <span className="text-[11px] font-mono font-bold tabular-nums">{slot.localStartTime}</span>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider opacity-90 mt-0.5">{cfg.label}</span>
                      {slot.price !== null && (
                        <span className="text-[10px] font-mono font-bold tabular-nums text-grass-600 dark:text-grass-300 mt-0.5">
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
            className="p-3 bg-white/98 dark:bg-court-900/98 border border-court-300 dark:border-court-700 rounded-lg shadow-court-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-optic-500 stroke-[1.75]" />
              <div>
                <span className="font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white">
                  {hoveredSlot.court.courtName} — {hoveredSlot.slot.localStartTime} to{' '}
                  {hoveredSlot.slot.localEndTime}
                </span>
                <span className="text-court-500 ml-2 font-sans">({hoveredSlot.slot.reason || hoveredSlot.slot.state})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-court-500 font-heading font-bold uppercase tracking-wider text-[11px]">Quote:</span>
              <span className="text-sm font-bold font-mono tabular-nums text-grass-600 dark:text-grass-400">
                {hoveredSlot.slot.formattedPrice}
              </span>
              <span className="text-[11px] text-court-400 font-sans">
                (Priced strictly by session start)
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
