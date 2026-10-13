import React, { useState, useEffect } from 'react';
import {
  Activity,
  Award,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  Flame,
  Info,
  Lock,
  Menu,
  Moon,
  Palette,
  Phone,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  DropdownItem,
  DropdownDivider,
  ConfirmDialog,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
  PricingCard,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  EmptyState,
  ErrorState,
  Stepper,
} from '../../components/ui';
import { emitToast } from '../../api/client';
import ThemeToggle from '../../components/common/ThemeToggle';

export const StyleguidePage = () => {
  // Modal / Drawer states
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form controls state
  const [buttonLoading, setButtonLoading] = useState(false);
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [selectedTab, setSelectedTab] = useState('slots');
  const [dateVal, setDateVal] = useState('2026-10-13');
  const [activeStep, setActiveStep] = useState(1);

  // Live countdown timer for the HELD slot demo
  const [holdTimer, setHoldTimer] = useState(285); // 4m 45s

  useEffect(() => {
    const timer = setInterval(() => {
      setHoldTimer((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHoldTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // High-Density Sample Table Data (Indian Champions Demo Data)
  const sampleTableData = [
    { id: '1', athlete: 'Sania Mirza', memberNo: 'CC-001001', court: 'Tennis Court 1 (Hard)', sport: 'Tennis', rate: 450.0, status: 'Active', tier: 'GOLD' },
    { id: '2', athlete: 'Rohan Bopanna', memberNo: 'CC-001002', court: 'Tennis Court 2 (Clay)', sport: 'Tennis', rate: 550.0, status: 'Active', tier: 'GOLD' },
    { id: '3', athlete: 'P.V. Sindhu', memberNo: 'CC-001003', court: 'Badminton Court 1', sport: 'Badminton', rate: 350.0, status: 'Active', tier: 'GOLD' },
    { id: '4', athlete: 'Lakshya Sen', memberNo: 'CC-001004', court: 'Badminton Court 2', sport: 'Badminton', rate: 350.0, status: 'Active', tier: 'SILVER' },
    { id: '5', athlete: 'Aryan Cadet', memberNo: 'CC-001051', court: 'Squash Court 1', sport: 'Squash', rate: 300.0, status: 'Active', tier: 'JUNIOR' },
  ];

  const tableColumns = [
    {
      key: 'athlete',
      label: 'Athlete & Member No',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-court-900 dark:text-court-100">{val}</span>
          <span className="text-[11px] font-mono text-court-500 dark:text-court-400 tabular-nums">{row.memberNo}</span>
        </div>
      ),
    },
    { key: 'court', label: 'Assigned Court', sortable: true },
    { key: 'sport', label: 'Sport', sortable: true },
    {
      key: 'rate',
      label: 'Hourly Rate',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-optic-700 dark:text-optic-400 tabular-nums">
          ₹{Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'tier',
      label: 'Membership Tier',
      render: (val) => (
        <Badge
          variant={
            val === 'GOLD'
              ? 'gold'
              : val === 'SILVER'
              ? 'silver'
              : val === 'JUNIOR'
              ? 'junior'
              : 'default'
          }
          size="sm"
          dot
        >
          {val}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant="success" size="sm">
          {val}
        </Badge>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-court-200 dark:border-court-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-optic text-xs font-bold mb-3 tracking-wide uppercase">
            <Palette className="w-3.5 h-3.5" />
            <span>Athletic Design System 2.0</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-court-900 dark:text-court-100 tracking-tight font-heading uppercase">
            Design Tokens & Living Styleguide
          </h1>
          <p className="text-sm text-court-600 dark:text-court-400 mt-2 max-w-3xl leading-relaxed">
            Engineered for Champions Club: tournament courts, chalk lines, red clay, turf grass, and electric ball-optic yellow. High contrast, WCAG 2.1 AA compliant, color-blind safe, and tablet-optimized.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button
            variant="optic"
            size="md"
            onClick={() =>
              emitToast({
                id: Date.now(),
                type: 'success',
                title: 'Token System Synced',
                message: 'Ball-Optic Yellow & Warm Court Neutrals active.',
              })
            }
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      {/* 1. Core Color System */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            1. Core Color Tokens
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            One bold accent (Ball-Optic Yellow) grounded by warm court neutrals and authentic playing surface tones.
          </p>
        </div>

        {/* Hero Accent: Ball-Optic Yellow */}
        <div className="court-card rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-optic-600 dark:text-optic-400">
                The One Hero Accent
              </span>
              <h3 className="text-xl font-bold text-court-900 dark:text-court-100">Ball-Optic Yellow</h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-sm bg-court-100 dark:bg-court-850 text-court-800 dark:text-court-200 border border-court-200 dark:border-court-700">
              #CCFF00 / --color-accent
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Optic 400', hex: '#D4FF1A', text: '#0E1216' },
              { label: 'Optic 500 (Hero)', hex: '#CCFF00', text: '#0E1216' },
              { label: 'Optic 600', hex: '#B0DE00', text: '#0E1216' },
              { label: 'Optic 700', hex: '#8CA800', text: '#FFFFFF' },
              { label: 'Optic 900', hex: '#4F6100', text: '#FFFFFF' },
              { label: 'Optic Subtle', hex: 'rgba(204,255,0,0.18)', text: '#6B8200' },
            ].map((c) => (
              <div key={c.label} className="flex flex-col rounded-sm overflow-hidden border border-court-200 dark:border-court-800 shadow-sm">
                <div
                  style={{ backgroundColor: c.hex, color: c.text }}
                  className="h-16 flex items-center justify-center p-2 text-center text-xs font-bold font-heading"
                >
                  {c.label}
                </div>
                <div className="p-2 bg-court-50 dark:bg-court-900 text-[11px] font-mono text-court-700 dark:text-court-300 text-center border-t border-court-200 dark:border-court-800">
                  {c.hex}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Court Surfaces & Neutrals */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="court-card rounded-lg p-4 space-y-2">
            <div style={{ backgroundColor: '#16A34A' }} className="h-10 rounded-sm text-white flex items-center justify-center font-bold text-xs uppercase font-heading">
              Grass Turf (Success)
            </div>
            <div className="flex justify-between text-xs font-mono text-court-600 dark:text-court-400">
              <span>Wimbledon Lawn</span>
              <span>#16A34A</span>
            </div>
          </div>

          <div className="court-card rounded-lg p-4 space-y-2">
            <div style={{ backgroundColor: '#C2410C' }} className="h-10 rounded-sm text-white flex items-center justify-center font-bold text-xs uppercase font-heading">
              Roland-Garros Clay (Danger)
            </div>
            <div className="flex justify-between text-xs font-mono text-court-600 dark:text-court-400">
              <span>Terracotta Clay</span>
              <span>#C2410C</span>
            </div>
          </div>

          <div className="court-card rounded-lg p-4 space-y-2">
            <div style={{ backgroundColor: '#2563EB' }} className="h-10 rounded-sm text-white flex items-center justify-center font-bold text-xs uppercase font-heading">
              DecoTurf (Info)
            </div>
            <div className="flex justify-between text-xs font-mono text-court-600 dark:text-court-400">
              <span>US Open Blue</span>
              <span>#2563EB</span>
            </div>
          </div>

          <div className="court-card rounded-lg p-4 space-y-2">
            <div style={{ backgroundColor: '#FAF8F5' }} className="h-10 rounded-sm border border-court-300 text-court-950 flex items-center justify-center font-bold text-xs uppercase font-heading">
              Chalk Boundary Lines
            </div>
            <div className="flex justify-between text-xs font-mono text-court-600 dark:text-court-400">
              <span>Court Chalk Line</span>
              <span>#FAF8F5</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Color-Blind Accessible Booking Slot State Matrix */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-grass-600 dark:text-grass-400 uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4" /> WCAG 2.1 AA Guaranteed
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            2. Color-Blind Accessible Slot Palette
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            Never relies on color alone. Each state features distinct luminance, stroke pattern (solid, dashed, dotted, hatched), and clear icon indicators.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. AVAILABLE */}
          <div className="slot-available rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
              <Check className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">06:30 - 07:30</span>
              <span className="text-xs font-mono font-bold tabular-nums">₹350.00</span>
            </div>
          </div>

          {/* 2. HELD */}
          <div className="slot-held rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cart Hold</span>
              <Clock className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">17:00 - 18:00</span>
              <span className="text-xs font-mono font-bold tabular-nums">
                {formatHoldTimer(holdTimer)}
              </span>
            </div>
          </div>

          {/* 3. BOOKED */}
          <div className="slot-booked rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Booked</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">18:00 - 19:00</span>
              <span className="text-[11px] font-medium truncate block">Sania Mirza</span>
            </div>
          </div>

          {/* 4. BLOCKED */}
          <div className="slot-blocked rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Blocked</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">12:00 - 13:00</span>
              <span className="text-[10px] font-semibold tracking-wide uppercase">Maintenance</span>
            </div>
          </div>

          {/* 5. SOCIAL */}
          <div className="slot-social rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Social Mixer</span>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">19:00 - 22:00</span>
              <span className="text-[11px] font-bold">Round-Robin</span>
            </div>
          </div>

          {/* 6. PAST */}
          <div className="slot-past rounded-sm p-3.5 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Past</span>
              <Clock className="w-3.5 h-3.5 opacity-50" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-extrabold font-heading block">07:00 - 08:00</span>
              <span className="text-[11px] opacity-75">Elapsed</span>
            </div>
          </div>
        </div>

        <div className="court-card rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-court-700 dark:text-court-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0" />
            <span>
              <strong>Accessibility Key:</strong> Solid Green (Available), Dashed Amber + Timer (Held), Solid Orange/Red (Booked), Diagonal Stripe Hatch (Blocked), Dotted Violet (Social), Muted 40% (Past).
            </span>
          </div>
          <span className="text-optic-600 dark:text-optic-400 font-mono font-semibold shrink-0">
            Deuteranopia & Protanopia Tested
          </span>
        </div>
      </section>

      {/* 3. Typography Scale & Tabular Numerals */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            3. Typography Scale & Tabular Numerals
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            <strong>Barlow Condensed</strong> for tournament impact headings; <strong>Plus Jakarta Sans</strong> for open UI legibility; <strong>Tabular Numerals</strong> for prices, clocks, and scoreboards.
          </p>
        </div>

        <div className="court-card rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <div className="border-b border-court-200 dark:border-court-800 pb-3">
              <span className="text-xs font-mono text-court-500 dark:text-court-400 block mb-1">
                Display 2XL — Barlow Condensed 56px / -0.02em tracking
              </span>
              <div className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-court-900 dark:text-court-100 uppercase">
                CHAMPIONS CLUB ARENA
              </div>
            </div>

            <div className="border-b border-court-200 dark:border-court-800 pb-3">
              <span className="text-xs font-mono text-court-500 dark:text-court-400 block mb-1">
                Display XL — Barlow Condensed 40px
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-heading text-court-900 dark:text-court-100 uppercase">
                COURT RESERVATIONS & TOURNAMENT LIVE DRAW
              </div>
            </div>

            <div className="border-b border-court-200 dark:border-court-800 pb-3">
              <span className="text-xs font-mono text-court-500 dark:text-court-400 block mb-1">
                Display LG — Barlow Condensed 28px
              </span>
              <div className="text-2xl font-bold font-heading text-court-900 dark:text-court-100 uppercase">
                BADMINTON ARENA 3 (WOODEN SPRUNG FLOOR)
              </div>
            </div>

            <div>
              <span className="text-xs font-mono text-court-500 dark:text-court-400 block mb-1">
                Body MD — Plus Jakarta Sans 14px / 20px
              </span>
              <p className="text-sm text-court-700 dark:text-court-300 max-w-2xl leading-relaxed">
                Precision sports operations powered by real-time exclusionary locking. Fixed 60-minute session slots starting on the hour or half-hour, with member daily quota enforcement and digital lounge ordering.
              </p>
            </div>
          </div>

          {/* Tabular Numerals Live Demo */}
          <div className="court-card-elevated rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-optic-700 dark:text-optic-400 font-heading">
                Tabular Numerals Specimen (font-variant-numeric: tabular-nums)
              </span>
              <span className="text-[11px] font-mono text-court-500 dark:text-court-400">Fixed column widths</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-court-100 dark:bg-court-950 rounded-sm border border-court-200 dark:border-court-800">
                <span className="text-[10px] text-court-500 dark:text-court-400 block uppercase">Gold Rate</span>
                <span className="text-xl font-bold font-mono text-optic-700 dark:text-optic-400 tabular-nums">₹350.00</span>
              </div>
              <div className="p-3 bg-court-100 dark:bg-court-950 rounded-sm border border-court-200 dark:border-court-800">
                <span className="text-[10px] text-court-500 dark:text-court-400 block uppercase">Guest Rate</span>
                <span className="text-xl font-bold font-mono text-court-800 dark:text-court-200 tabular-nums">₹550.00</span>
              </div>
              <div className="p-3 bg-court-100 dark:bg-court-950 rounded-sm border border-court-200 dark:border-court-800">
                <span className="text-[10px] text-court-500 dark:text-court-400 block uppercase">Club Clock</span>
                <span className="text-xl font-bold font-mono text-court-800 dark:text-court-200 tabular-nums">18:30:00</span>
              </div>
              <div className="p-3 bg-court-100 dark:bg-court-950 rounded-sm border border-court-200 dark:border-court-800">
                <span className="text-[10px] text-court-500 dark:text-court-400 block uppercase">Daily Quota</span>
                <span className="text-xl font-bold font-mono text-grass-600 dark:text-grass-400 tabular-nums">1 / 2 Slots</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Component-Role Radius Scale */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            4. Component-Role Radius Scale
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            No universal rounded-2xl. Border radius is assigned strictly by component role and physical interaction.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="court-card rounded-none p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-none (0px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Court Rails / Flush Lines</span>
          </div>

          <div className="court-card rounded-xs p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-xs (4px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Pills & Table Tags</span>
          </div>

          <div className="court-card rounded-sm p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-sm (6px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Slot Cells & Date Chips</span>
          </div>

          <div className="court-card rounded-md p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-md (10px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Action Buttons & Inputs</span>
          </div>

          <div className="court-card rounded-lg p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-lg (16px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Facility Cards & KDS Tickets</span>
          </div>

          <div className="court-card rounded-xl p-4 text-center">
            <span className="text-xs font-mono font-bold text-optic-700 dark:text-optic-400 block">radius-xl (24px)</span>
            <span className="text-[11px] text-court-600 dark:text-court-400 mt-1 block">Modals & Drawers</span>
          </div>
        </div>
      </section>

      {/* 5. Tactile Buttons & 48px+ Touch Targets */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            5. Athletic Buttons & Tablet Touch Targets
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            Tactile button variants with minimum 48px targets for tablet counter operations (Bar POS & KDS).
          </p>
        </div>

        <div className="court-card rounded-lg p-6 space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-bold text-court-700 dark:text-court-300 uppercase tracking-wide block">
              Variant Hierarchy
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="optic">Ball-Optic Hero</Button>
              <Button variant="secondary">Court Secondary</Button>
              <Button variant="clay">Clay Danger</Button>
              <Button variant="grass">Grass Success</Button>
              <Button variant="gold">Gold VIP</Button>
              <Button variant="outline">Chalk Outline</Button>
              <Button variant="ghost">Court Ghost</Button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-court-700 dark:text-court-300 uppercase tracking-wide block">
              Size Scale & Tablet Touch Target (Min 48px)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="optic">Small (sm)</Button>
              <Button size="md" variant="optic">Medium (md)</Button>
              <Button size="lg" variant="optic">Large (lg)</Button>
              <Button size="touch" variant="optic" startIcon={<Zap className="w-5 h-5" />}>
                Tablet POS Touch (52px Touch Height)
              </Button>
              <Button
                variant="secondary"
                isLoading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 1500);
                }}
              >
                {buttonLoading ? 'Reserving...' : 'Click for Loading State'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Form Inputs & Selects */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            6. Accessible Form Controls
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            High-contrast inputs with clean chalk borders and optic yellow active rings.
          </p>
        </div>

        <div className="court-card rounded-lg p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            label="Athlete Full Name"
            placeholder="Sania Mirza"
            required
            helperText="Enter full name as per registration ID"
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            startIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Security Password"
            type="password"
            placeholder="••••••••"
            error="Password must contain at least 8 characters"
          />

          <Select
            label="Court Surface Selection"
            placeholder="Select court surface..."
            options={[
              { value: 'SYNTHETIC', label: 'BWF Certified Taraflex Matting' },
              { value: 'WOODEN', label: 'Sprung Hardwood Floor' },
              { value: 'CLAY', label: 'Roland-Garros Crushed Brick Clay' },
              { value: 'ACRYLIC', label: 'US Open 8-Layer Acrylic Hardcourt' },
            ]}
          />

          <DatePicker
            label="Session Date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
          />

          <div className="space-y-3 pt-6">
            <Switch
              label="SMS Reservation Alerts"
              description="Dispatch instant WhatsApp confirmation"
              checked={switchVal}
              onChange={setSwitchVal}
            />
          </div>
        </div>
      </section>

      {/* 7. High-Density Operational Table */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            7. High-Density Operational Table
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            Engineered for rapid front-desk scanning. 40px row density, tabular figures, and immediate keyboard accessibility.
          </p>
        </div>

        <div className="court-card rounded-lg p-4">
          <Table
            columns={tableColumns}
            data={sampleTableData}
            selectable
          />
        </div>
      </section>

      {/* 8. Overlays: Modal & Drawer Demo */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            8. Dialogs & Sheet Drawers
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            Clean spring animations without glowing halos or ungrounded blur effects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="optic" onClick={() => setModalOpen(true)}>
            Open Court Booking Modal
          </Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open Side Sheet Drawer
          </Button>
          <Button variant="clay" onClick={() => setConfirmOpen(true)}>
            Open Cancellation Confirm Dialog
          </Button>
        </div>

        {/* Modal Demo */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Reserve Court 1 (Badminton)"
          description="Fixed 60-minute duration with instant idempotency verification"
        >
          <div className="space-y-4 py-2">
            <div className="p-4 bg-court-100 dark:bg-court-950 rounded-md border border-court-200 dark:border-court-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-court-500 dark:text-court-400">Selected Slot:</span>
                <span className="font-bold text-court-900 dark:text-court-100">Today, 18:00 - 19:00 IST</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-court-500 dark:text-court-400">Standard Rate:</span>
                <span className="font-mono text-court-800 dark:text-court-300">₹350.00</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-court-200 dark:border-court-800">
                <span className="font-bold text-court-900 dark:text-court-100">Gold Member Total:</span>
                <span className="font-mono font-bold text-optic-700 dark:text-optic-400">₹262.50 (25% off)</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="optic"
                onClick={() => {
                  setModalOpen(false);
                  emitToast({ type: 'success', title: 'Court Reserved', message: 'Slot 18:00 confirmed.' });
                }}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        </Modal>

        {/* Drawer Demo */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Court 3 Schedule Drawer"
          subtitle="Real-time timeline & equipment check"
        >
          <div className="space-y-4 p-4 text-xs text-court-700 dark:text-court-300">
            <p>
              Badminton Court 3 features tournament-grade wooden sprung flooring and glare-free vertical LED lighting.
            </p>
            <div className="p-3 bg-court-100 dark:bg-court-950 rounded-sm border border-court-200 dark:border-court-800 space-y-2">
              <span className="font-bold text-court-900 dark:text-court-100 block">Upcoming Schedule:</span>
              <div className="flex justify-between text-court-600 dark:text-court-400">
                <span>17:00 - 18:00</span>
                <span className="text-grass-600 dark:text-grass-400 font-bold">Available (₹350)</span>
              </div>
              <div className="flex justify-between text-court-600 dark:text-court-400">
                <span>18:00 - 19:00</span>
                <span className="text-clay-600 dark:text-orange-400 font-bold">Booked (P.V. Sindhu)</span>
              </div>
            </div>
          </div>
        </Drawer>

        {/* Confirm Dialog Demo */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            emitToast({ type: 'warning', title: 'Reservation Cancelled', message: 'Court slot released.' });
          }}
          title="Release Held Slot?"
          description="Are you sure you want to cancel this booking? The slot will immediately become available for other club members."
          confirmLabel="Release Slot"
          variant="danger"
        />
      </section>

      {/* 9. Specialized Building Blocks (Pricing, Stepper, Dropdown & Tooltips) */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            9. Operational Building Blocks
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            Reference building blocks adapted from 21st.dev to our tokens: pricing tiers, step wizards, dropdowns, and micro-tooltips.
          </p>
        </div>

        {/* Stepper Demo */}
        <div className="court-card rounded-lg p-6 space-y-4">
          <span className="text-xs font-bold text-court-700 dark:text-court-300 uppercase tracking-wide block font-heading">
            Booking & Onboarding Stepper
          </span>
          <Stepper
            steps={[
              { title: 'Select Court', description: 'Taraflex Matting' },
              { title: 'Pick Slot', description: '18:00 - 19:00' },
              { title: 'Guest Details', description: 'Doubles Match' },
              { title: 'Payment', description: 'UPI / Member Tab' },
            ]}
            activeStep={activeStep}
            onStepClick={(idx) => setActiveStep(idx)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            >
              Previous Step
            </Button>
            <Button
              size="sm"
              variant="optic"
              disabled={activeStep >= 3}
              onClick={() => setActiveStep((prev) => Math.min(3, prev + 1))}
            >
              Next Step
            </Button>
          </div>
        </div>

        {/* Dropdowns & Tooltips row */}
        <div className="court-card rounded-lg p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Dropdown
              trigger={
                <Button variant="secondary" size="sm">
                  Quick Actions Menu
                </Button>
              }
            >
              <DropdownItem onClick={() => emitToast({ type: 'info', title: 'Court Assigned', message: 'Assigned to Court 2' })}>
                Assign to Court 2
              </DropdownItem>
              <DropdownItem onClick={() => emitToast({ type: 'info', title: 'Rackets Added', message: '2x Wilson Pro Staff added' })}>
                Add Equipment Rental
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem danger onClick={() => setConfirmOpen(true)}>
                Release Court Hold
              </DropdownItem>
            </Dropdown>

            <Tooltip content="Live court availability updated every 3 seconds">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-court-100 dark:bg-court-800 text-xs font-medium text-court-700 dark:text-court-300 cursor-help border border-court-200 dark:border-court-700">
                <Info className="w-3.5 h-3.5 stroke-[1.75]" />
                Hover for Tooltip
              </span>
            </Tooltip>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-court-500 font-sans">Skeleton Shimmer:</span>
            <Skeleton variant="text" width={100} height={16} />
            <Skeleton variant="circular" width={28} height={28} />
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            name="Silver Player"
            tier="SILVER"
            price="₹2,500"
            period="/month"
            description="Essential access for casual racquet sports enthusiasts"
            features={[
              'Access to all 6 Badminton Courts',
              '7-Day Advance Slot Booking',
              'Member Rates for Pro-Shop gear',
              { text: 'Peak Tennis Court Access', included: false },
            ]}
            onCtaClick={() => emitToast({ type: 'info', title: 'Plan Selected', message: 'Silver Player tier chosen.' })}
          />

          <PricingCard
            name="Gold Champion"
            tier="GOLD"
            popular
            price="₹4,800"
            period="/month"
            description="Full-facility access with peak priority and guest privileges"
            features={[
              'All Courts (Tennis Clay & Acrylic + Badminton)',
              '14-Day Advance Prime Slot Booking',
              '2 Complimentary Guest Passes / month',
              'Free Racquet Restringing & Grips',
              'Member Lounge & Sauna Access',
            ]}
            onCtaClick={() => emitToast({ type: 'success', title: 'Plan Selected', message: 'Gold Champion tier chosen.' })}
          />

          <PricingCard
            name="Junior Academy"
            tier="JUNIOR"
            price="₹1,800"
            period="/month"
            description="Structured coaching & weekend developmental matches"
            features={[
              'Supervised Academy Sessions (Mon-Fri)',
              'Coach Video Analysis (Monthly)',
              'Tournament Entry Fee Subsidies',
              { text: 'Evening Bar & Lounge Access', included: false },
            ]}
            onCtaClick={() => emitToast({ type: 'info', title: 'Plan Selected', message: 'Junior Academy tier chosen.' })}
          />
        </div>
      </section>

      {/* 10. Kanban Board, Empty States & Error States */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-court-900 dark:text-court-100 uppercase font-heading">
            10. Kanban Workflow & Status States
          </h2>
          <p className="text-xs text-court-600 dark:text-court-400">
            High-density task columns for Lead CRM, Bar Orders, and tournament match tracking.
          </p>
        </div>

        {/* Kanban Board */}
        <KanbanBoard>
          <KanbanColumn
            id="new"
            title="Incoming Inquiries"
            count={2}
            accentColor="court"
          >
            <KanbanCard onClick={() => emitToast({ type: 'info', title: 'Lead Selected', message: 'Ananya Sharma inquiry' })}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-heading font-bold uppercase text-xs text-court-900 dark:text-court-100">Ananya Sharma</span>
                <Badge variant="junior">Junior</Badge>
              </div>
              <p className="text-xs text-court-600 dark:text-court-400">Interested in Weekend Badminton Coaching Batch.</p>
              <div className="mt-2 pt-2 border-t border-court-200 dark:border-court-800 flex justify-between text-[11px] text-court-500 font-mono">
                <span>Phone Inquiry</span>
                <span>Today, 14:20</span>
              </div>
            </KanbanCard>

            <KanbanCard onClick={() => emitToast({ type: 'info', title: 'Lead Selected', message: 'Vikram Mehta corporate' })}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-heading font-bold uppercase text-xs text-court-900 dark:text-court-100">Vikram Mehta</span>
                <Badge variant="gold">Gold</Badge>
              </div>
              <p className="text-xs text-court-600 dark:text-court-400">Corporate Padel Tournament booking for 24 players.</p>
              <div className="mt-2 pt-2 border-t border-court-200 dark:border-court-800 flex justify-between text-[11px] text-court-500 font-mono">
                <span>WhatsApp</span>
                <span>Yesterday</span>
              </div>
            </KanbanCard>
          </KanbanColumn>

          <KanbanColumn
            id="trial"
            title="Trial Scheduled"
            count={1}
            accentColor="optic"
          >
            <KanbanCard onClick={() => emitToast({ type: 'info', title: 'Trial Selected', message: 'Coach trial session' })}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-heading font-bold uppercase text-xs text-court-900 dark:text-court-100">Rohit Verma</span>
                <Badge variant="optic">Trial</Badge>
              </div>
              <p className="text-xs text-court-600 dark:text-court-400">Tennis Evaluation on Clay Court 2 with Coach Arun.</p>
              <div className="mt-2 pt-2 border-t border-court-200 dark:border-court-800 flex justify-between text-[11px] text-court-500 font-mono">
                <span>Court 2</span>
                <span>Tomorrow 09:00</span>
              </div>
            </KanbanCard>
          </KanbanColumn>

          <KanbanColumn
            id="joined"
            title="Converted & Active"
            count={1}
            accentColor="grass"
          >
            <KanbanCard>
              <div className="flex justify-between items-start mb-2">
                <span className="font-heading font-bold uppercase text-xs text-court-900 dark:text-court-100">Kavya Desai</span>
                <Badge variant="grass">Paid</Badge>
              </div>
              <p className="text-xs text-court-600 dark:text-court-400">Annual Gold Membership activated via Razorpay.</p>
              <div className="mt-2 pt-2 border-t border-court-200 dark:border-court-800 flex justify-between text-[11px] text-grass-600 dark:text-grass-400 font-mono font-bold">
                <span>Invoice #8921</span>
                <span>₹57,600/yr</span>
              </div>
            </KanbanCard>
          </KanbanColumn>
        </KanbanBoard>

        {/* Empty State & Error State side-by-side demo */}
        <div className="grid md:grid-cols-2 gap-6 pt-4">
          <EmptyState
            title="No Matches Scheduled"
            description="There are currently no active tournament fixtures scheduled on Court 4 for today."
            action={
              <Button size="sm" variant="optic" onClick={() => emitToast({ type: 'info', title: 'Fixture Generator', message: 'Opening match scheduler' })}>
                Create Match Fixture
              </Button>
            }
          />

          <ErrorState
            title="Razorpay Gateway Timeout"
            message="Unable to communicate with the payment processor. The session has been safely preserved."
            traceId="TXN-ERR-98421"
            onRetry={() => emitToast({ type: 'info', title: 'Retrying', message: 'Re-polling payment gateway status' })}
            retryLabel="Retry Transaction"
          />
        </div>
      </section>
    </div>
  );
};

export default StyleguidePage;
