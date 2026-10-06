import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  Heart,
  HelpCircle,
  Inbox,
  Lock,
  Mail,
  Palette,
  Search,
  Send,
  Shield,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  DatePicker,
  Drawer,
  Dropdown,
  DropdownDivider,
  DropdownItem,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  Skeleton,
  StatCard,
  Stepper,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
} from '../../components/ui';
import { emitToast } from '../../api/client';
import ThemeToggle from '../../components/common/ThemeToggle';

export const StyleguidePage = () => {
  // Modal / Drawer / Dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form controls state
  const [buttonLoading, setButtonLoading] = useState(false);
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateVal, setDateVal] = useState('2026-10-06');
  const [activeStep, setActiveStep] = useState(1);

  // Table demo state
  const [tableLoading, setTableLoading] = useState(false);
  const [tableEmpty, setTableEmpty] = useState(false);

  const sampleTableData = [
    { id: '1', court: 'Badminton Court 1', sport: 'Badminton', rate: 20.0, status: 'Active', tier: 'GOLD' },
    { id: '2', court: 'Tennis Court 2', sport: 'Tennis', rate: 35.0, status: 'Reserved', tier: 'SILVER' },
    { id: '3', court: 'Squash Court 1', sport: 'Squash', rate: 25.0, status: 'Active', tier: 'JUNIOR' },
    { id: '4', court: 'Badminton Court 4', sport: 'Badminton', rate: 20.0, status: 'Maintenance', tier: 'GUEST' },
    { id: '5', court: 'Tennis Court 1', sport: 'Tennis', rate: 35.0, status: 'Active', tier: 'GOLD' },
  ];

  const tableColumns = [
    { key: 'court', label: 'Facility Name', sortable: true },
    { key: 'sport', label: 'Sport', sortable: true },
    {
      key: 'rate',
      label: 'Hourly Rate',
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-emerald-400">${Number(val).toFixed(2)}</span>,
    },
    {
      key: 'tier',
      label: 'Eligible Tier',
      render: (val) => (
        <Badge variant={val.toLowerCase() === 'gold' ? 'gold' : val.toLowerCase() === 'silver' ? 'silver' : 'junior'}>
          {val}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Operational Status',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            val === 'Active'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
              : val === 'Reserved'
              ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-2">
            <Palette className="w-3.5 h-3.5" /> Living Design System Showcase
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Component Styleguide & Tokens
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Atomic components engineered for Champions Club with WCAG AA compliance, Framer Motion springs, light/dark modes, and reduced-motion support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              emitToast({
                id: Date.now(),
                type: 'success',
                title: 'Design System Alert',
                message: 'Global toast dispatcher working seamlessly!',
              })
            }
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">1. Buttons & Variants</h2>
          <p className="text-xs text-slate-400">Tactile button components with scale feedback, disabled & loading states.</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Emerald</Button>
            <Button variant="gold">Gold VIP</Button>
            <Button variant="indigo">Indigo Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm" variant="primary">Small (sm)</Button>
            <Button size="md" variant="primary">Medium (md)</Button>
            <Button size="lg" variant="primary">Large (lg)</Button>
            <Button
              variant="primary"
              isLoading={buttonLoading}
              onClick={() => {
                setButtonLoading(true);
                setTimeout(() => setButtonLoading(false), 2000);
              }}
            >
              {buttonLoading ? 'Saving...' : 'Click for Loading State'}
            </Button>
            <Button variant="primary" disabled>
              Disabled State
            </Button>
            <Button variant="outline" startIcon={<Calendar className="w-4 h-4" />}>
              With Icon
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Badges */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">2. Badges & Tiers</h2>
          <p className="text-xs text-slate-400">Role and membership status indicators with optional pulse dot.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="gold" dot>Gold VIP</Badge>
          <Badge variant="silver" dot>Silver Plan</Badge>
          <Badge variant="junior" dot>Junior Athlete</Badge>
          <Badge variant="success" dot>Confirmed</Badge>
          <Badge variant="warning">Pending Tab</Badge>
          <Badge variant="danger">Exclusion Conflict</Badge>
          <Badge variant="default">Standard</Badge>
          <Badge variant="outline">Guest Pass</Badge>
        </div>
      </section>

      {/* 3. Form Inputs */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">3. Form Controls & Inputs</h2>
          <p className="text-xs text-slate-400">Accessible inputs with error indicators and helper labels.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            label="Full Name"
            placeholder="Alex Rodriguez"
            required
            helperText="Enter name as per government ID"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="member@championsclub.com"
            startIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password Field"
            type="password"
            placeholder="••••••••"
            error="Password must contain at least 8 characters"
          />

          <Select
            label="Court Facility"
            placeholder="Choose sport arena..."
            options={[
              { value: 'badminton-1', label: 'Badminton Court 1 (Taraflex)' },
              { value: 'tennis-1', label: 'Tennis Court 1 (Hardcourt)' },
              { value: 'squash-1', label: 'Squash Arena 1 (Glass)' },
            ]}
          />

          <DatePicker
            label="Reservation Date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            helperText="Bookings open 14 days in advance"
          />

          <div className="space-y-4 pt-4">
            <Checkbox
              label="Allow courtside SMS notifications"
              description="Receive booking reminders 15 min prior"
              checked={checkboxVal}
              onChange={(e) => setCheckboxVal(e.target.checked)}
            />
            <Switch
              label="Instant Wallet Debit"
              description="Auto-pay court bookings via balance"
              checked={switchVal}
              onChange={setSwitchVal}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Textarea
              label="Coach Feedback / Special Instructions"
              placeholder="Specify racquet tension or court lighting preferences..."
              showCount
              maxLength={200}
            />
          </div>
        </div>
      </section>

      {/* 4. Stat Cards & Counters */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">4. Stat Cards with Animated Counters</h2>
          <p className="text-xs text-slate-400">Dynamic spring counters with trend arrows and metric tooltips.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Reservations"
            value={142}
            trend={18}
            icon={Activity}
            accentColor="emerald"
            tooltip="Active reservations confirmed today"
          />
          <StatCard
            title="Today's Revenue"
            value={3840.50}
            prefix="$"
            trend={12}
            icon={DollarSign}
            accentColor="indigo"
          />
          <StatCard
            title="Active Members"
            value={840}
            trend={-2}
            icon={Users}
            accentColor="gold"
          />
          <StatCard
            title="Peak Occupancy"
            value={94}
            suffix="%"
            trend={5}
            icon={Zap}
            accentColor="rose"
          />
        </div>
      </section>

      {/* 5. Stepper Component */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">5. Stepper (Reservation Flow)</h2>
          <p className="text-xs text-slate-400">Step progression with animated track fill.</p>
        </div>

        <Card>
          <Stepper
            activeStep={activeStep}
            onStepClick={setActiveStep}
            steps={[
              { title: 'Select Court', description: 'Choose surface' },
              { title: 'Pick Slot', description: '60 min window' },
              { title: 'Apply Tier', description: 'Gold 25% off' },
              { title: 'Confirmation', description: 'Idempotent save' },
            ]}
          />
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-800/80 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            >
              Previous Step
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={activeStep === 3}
              onClick={() => setActiveStep((s) => Math.min(3, s + 1))}
            >
              Next Step
            </Button>
          </div>
        </Card>
      </section>

      {/* 6. Tabs, Tooltips, & Dropdowns */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">6. Navigation, Tooltips & Dropdowns</h2>
          <p className="text-xs text-slate-400">Micro-animated tabs with sliding spring pill, hover tooltips, and click dropdowns.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 glass-card p-6 rounded-3xl border-slate-800">
          <Tabs
            activeTab={selectedTab}
            onChange={setSelectedTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: Compass },
              { id: 'courts', label: 'Courts', icon: Calendar, badge: '16' },
              { id: 'members', label: 'Members', icon: Users },
            ]}
          />

          <div className="flex items-center gap-4">
            <Tooltip content="Tooltip positioned on top" position="top">
              <Button variant="outline" size="sm">Hover for Tooltip</Button>
            </Tooltip>

            <Dropdown
              trigger={
                <Button variant="secondary" size="sm" endIcon={<Zap className="w-3.5 h-3.5" />}>
                  Action Menu
                </Button>
              }
            >
              <DropdownItem icon={<Calendar className="w-4 h-4" />}>Book New Session</DropdownItem>
              <DropdownItem icon={<CreditCard className="w-4 h-4" />}>Top Up Wallet</DropdownItem>
              <DropdownDivider />
              <DropdownItem danger icon={<Trash2 className="w-4 h-4" />}>Cancel Booking</DropdownItem>
            </Dropdown>
          </div>
        </div>
      </section>

      {/* 7. Modal, Drawer, & Confirm Dialog */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">7. Modals, Drawers & Confirm Dialogs</h2>
          <p className="text-xs text-slate-400">Focus-trapped dialogs with ESC closing and backdrop blur.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Animated Modal
          </Button>

          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open Slide Drawer
          </Button>

          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>
        </div>

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Reserve Badminton Court 3"
          description="Fixed 60-minute session duration in club timezone."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
                Confirm Slot
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              This reservation is protected by PostgreSQL exclusion constraints. Press <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-white">ESC</kbd> to dismiss.
            </p>
            <Input label="Session Notes" placeholder="Doubles practice..." />
          </div>
        </Modal>

        {/* Drawer */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Member Wallet Summary"
          description="View recent deposits and point-of-sale charges."
          footer={
            <Button variant="primary" size="sm" fullWidth onClick={() => setDrawerOpen(false)}>
              Close Panel
            </Button>
          }
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-surface-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Current Balance</span>
              <div className="text-2xl font-black text-emerald-400">$175.50</div>
            </div>
            <p>
              Your Gold tier membership qualifies for 25% automated discount on all court bookings.
            </p>
          </div>
        </Drawer>

        {/* ConfirmDialog */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            emitToast({
              id: Date.now(),
              type: 'warning',
              title: 'Reservation Cancelled',
              message: 'Slot has been released back into public inventory.',
            });
          }}
          title="Cancel Court Reservation?"
          message="Are you sure you want to cancel BK-991A82? This action will refund $13.50 to your wallet balance."
          variant="danger"
          confirmText="Yes, Cancel Booking"
        />
      </section>

      {/* 8. Table Component */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">8. Data Table Component</h2>
            <p className="text-xs text-slate-400">Sortable headers, sticky table bar, pagination, and skeleton state.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTableLoading((l) => !l)}
            >
              {tableLoading ? 'Stop Skeleton' : 'Toggle Skeleton'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTableEmpty((e) => !e)}
            >
              {tableEmpty ? 'Show Records' : 'Toggle Empty'}
            </Button>
          </div>
        </div>

        <Table
          columns={tableColumns}
          data={tableEmpty ? [] : sampleTableData}
          isLoading={tableLoading}
          itemsPerPage={3}
          emptyMessage="No court reservations found matching query."
        />
      </section>

      {/* 9. Skeletons, Empty & Error States */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">9. States (Loading, Empty, & Error)</h2>
          <p className="text-xs text-slate-400">Slow-render placeholders and resilient fallbacks.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
              <Skeleton variant="rectangular" height={80} />
            </div>
          </Card>

          <EmptyState
            title="No Pro-Shop Orders"
            description="All orders have been fulfilled by staff."
            action={<Button size="sm" variant="outline">Browse Merch</Button>}
          />

          <ErrorState
            title="Double Booking Collision"
            message="PostgreSQL GiST exclusion constraint blocked simultaneous booking."
            traceId="a7f89d41b0"
            onRetry={() => {}}
          />
        </div>
      </section>
    </div>
  );
};

export default StyleguidePage;
