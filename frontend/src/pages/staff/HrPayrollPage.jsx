import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  Building,
  UserCheck,
  Shield,
  Coffee,
  UtensilsCrossed,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info,
  CalendarDays,
  Percent,
  Check,
  X,
  CreditCard,
  MapPin,
  CalendarCheck,
} from 'lucide-react';
import { hrApi } from '../../api/hrApi';
import { useAuth } from '../../context/AuthContext';
import { emitToast } from '../../api/client';

export const HrPayrollPage = () => {
  const { user } = useAuth();
  const isManagerOrOwner = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const [activeTab, setActiveTab] = useState('directory'); // directory, roster, attendance, leave, payroll
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // Tab 1: Staff Directory State
  // -------------------------------------------------------------
  const [employees, setEmployees] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState('ALL');
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    userId: '',
    designation: '',
    department: 'FRONT_DESK',
    joinDate: new Date().toISOString().split('T')[0],
    salaryType: 'MONTHLY',
    baseSalary: 45000,
    hourlyRate: 280,
    bankAccountNumber: '',
    bankIfscCode: '',
    panNumber: '',
  });

  // -------------------------------------------------------------
  // Tab 2: Roster Calendar State
  // -------------------------------------------------------------
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [rosterShifts, setRosterShifts] = useState([]);
  const [coverageGaps, setCoverageGaps] = useState([]);
  const [addShiftModalOpen, setAddShiftModalOpen] = useState(false);
  const [newShiftData, setNewShiftData] = useState({
    employeeId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    roleTag: 'FRONT_DESK',
    station: 'FRONT_DESK_DESK1',
    notes: 'Regular scheduled shift',
  });
  const [draggedShift, setDraggedShift] = useState(null);

  // -------------------------------------------------------------
  // Tab 3: Attendance Board State
  // -------------------------------------------------------------
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [currentClockInSession, setCurrentClockInSession] = useState(null);
  const [regularizeModalOpen, setRegularizeModalOpen] = useState(false);
  const [regularizeData, setRegularizeData] = useState({
    attendanceId: '',
    clockIn: '',
    clockOut: '',
    reason: '',
  });

  // -------------------------------------------------------------
  // Tab 4: Leave State
  // -------------------------------------------------------------
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveCalcPreview, setLeaveCalcPreview] = useState(null);
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [newLeaveData, setNewLeaveData] = useState({
    leaveTypeCode: 'CASUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isHalfDay: false,
    halfDaySession: 'FIRST_HALF',
    reason: '',
  });
  const [reviewLeaveModalOpen, setReviewLeaveModalOpen] = useState(false);
  const [selectedLeaveToReview, setSelectedLeaveToReview] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [approvalCoverageGapWarning, setApprovalCoverageGapWarning] = useState(null);

  // -------------------------------------------------------------
  // Tab 5: Payroll Wizard State
  // -------------------------------------------------------------
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState(null);
  const [payrollPayslips, setPayrollPayslips] = useState([]);
  const [generatePayrollModalOpen, setGeneratePayrollModalOpen] = useState(false);
  const [newPayrollYear, setNewPayrollYear] = useState(2026);
  const [newPayrollMonth, setNewPayrollMonth] = useState(6);
  const [newPayrollNotes, setNewPayrollNotes] = useState('');
  const [selectedPayslipForModal, setSelectedPayslipForModal] = useState(null);

  // -------------------------------------------------------------
  // Initial Data Load
  // -------------------------------------------------------------
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [empsRes, holsRes, typesRes] = await Promise.all([
        hrApi.getEmployees().catch(() => []),
        hrApi.getHolidays().catch(() => []),
        hrApi.getLeaveTypes().catch(() => []),
      ]);

      setEmployees(empsRes || []);
      setHolidays(holsRes || []);
      setLeaveTypes(typesRes || []);

      // If staff directory exists, prefill shift selector
      if (empsRes && empsRes.length > 0) {
        setNewShiftData((prev) => ({ ...prev, employeeId: empsRes[0].id }));
      }

      // Load today attendance
      const attRes = await hrApi.getTodayAttendance().catch(() => []);
      setTodayAttendance(attRes || []);

      // Check current user active clock-in
      const activeUserAtt = (attRes || []).find((a) => a.clockOut === null);
      setCurrentClockInSession(activeUserAtt || null);

      // Load leaves
      if (isManagerOrOwner) {
        const reqs = await hrApi.getAllLeaveRequests().catch(() => []);
        setLeaveRequests(reqs || []);
      } else {
        const reqs = await hrApi.getMyLeaveRequests().catch(() => []);
        setLeaveRequests(reqs || []);
      }

      // Load balances
      const balRes = await hrApi.getLeaveBalances().catch(() => []);
      setLeaveBalances(balRes || []);

      // Load weekly roster
      await loadRosterForWeek(currentWeekStart);

      // Load payroll runs
      if (isManagerOrOwner) {
        const runs = await hrApi.getPayrollRuns().catch(() => []);
        setPayrollRuns(runs || []);
        if (runs && runs.length > 0) {
          selectPayrollRun(runs[0]);
        }
      } else {
        const slips = await hrApi.getMyPayslips().catch(() => []);
        setPayrollPayslips(slips || []);
      }
    } catch (err) {
      console.error('Failed to load HR data:', err);
      emitToast({ type: 'error', message: 'Error loading HR management data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [isManagerOrOwner]);

  // Load roster week
  const loadRosterForWeek = async (mondayStr) => {
    try {
      const monday = new Date(mondayStr);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = sunday.toISOString().split('T')[0];

      const [shifts, gaps] = await Promise.all([
        hrApi.getRosterShifts(mondayStr, sundayStr).catch(() => []),
        hrApi.getCoverageGaps(mondayStr, sundayStr).catch(() => []),
      ]);
      setRosterShifts(shifts || []);
      setCoverageGaps(gaps || []);
    } catch (err) {
      console.error('Error fetching weekly roster:', err);
    }
  };

  const handleWeekChange = (offsetWeeks) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offsetWeeks * 7);
    const newStart = d.toISOString().split('T')[0];
    setCurrentWeekStart(newStart);
    loadRosterForWeek(newStart);
  };

  // Select Payroll Run
  const selectPayrollRun = async (run) => {
    setSelectedPayrollRun(run);
    try {
      const slips = await hrApi.getPayslipsForRun(run.id);
      setPayrollPayslips(slips || []);
    } catch (err) {
      console.error('Failed to load payslips for run:', err);
    }
  };

  // -------------------------------------------------------------
  // Live Leave Calculation Preview
  // -------------------------------------------------------------
  useEffect(() => {
    if (newLeaveData.startDate && newLeaveData.endDate) {
      hrApi
        .calculateLeave(newLeaveData.startDate, newLeaveData.endDate, newLeaveData.isHalfDay)
        .then((res) => setLeaveCalcPreview(res))
        .catch(() => setLeaveCalcPreview(null));
    }
  }, [newLeaveData.startDate, newLeaveData.endDate, newLeaveData.isHalfDay]);

  // -------------------------------------------------------------
  // Attendance Handlers
  // -------------------------------------------------------------
  const handleClockIn = async () => {
    try {
      await hrApi.clockIn({ source: 'WEB_CONSOLE' });
      emitToast({ type: 'success', message: 'Clocked in successfully!' });
      const att = await hrApi.getTodayAttendance();
      setTodayAttendance(att || []);
      const active = (att || []).find((a) => a.clockOut === null);
      setCurrentClockInSession(active || null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to clock in';
      emitToast({ type: 'error', message: msg });
    }
  };

  const handleClockOut = async () => {
    try {
      await hrApi.clockOut({});
      emitToast({ type: 'success', message: 'Clocked out successfully!' });
      const att = await hrApi.getTodayAttendance();
      setTodayAttendance(att || []);
      setCurrentClockInSession(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to clock out';
      emitToast({ type: 'error', message: msg });
    }
  };

  const handleAutoFlagMissing = async () => {
    try {
      const flaggedCount = await hrApi.flagMissingClockOuts();
      emitToast({ type: 'info', message: `Scanned & flagged ${flaggedCount} incomplete sessions.` });
      const att = await hrApi.getTodayAttendance();
      setTodayAttendance(att || []);
    } catch (err) {
      emitToast({ type: 'error', message: 'Error running missing clock-out auto detection.' });
    }
  };

  // -------------------------------------------------------------
  // Roster Publish & Drag/Drop
  // -------------------------------------------------------------
  const handlePublishRoster = async () => {
    try {
      const monday = new Date(currentWeekStart);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = sunday.toISOString().split('T')[0];

      await hrApi.publishWeeklyRoster({
        weekStartDate: currentWeekStart,
        weekEndDate: sundayStr,
      });
      emitToast({ type: 'success', message: 'Weekly roster successfully published to staff!' });
      await loadRosterForWeek(currentWeekStart);
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to publish weekly roster.' });
    }
  };

  const handleDropShiftOnDate = async (targetDate) => {
    if (!draggedShift) return;
    try {
      await hrApi.updateRosterShift(draggedShift.id, {
        shiftDate: targetDate,
        startTime: draggedShift.startTime,
        endTime: draggedShift.endTime,
        roleTag: draggedShift.roleTag,
        station: draggedShift.station,
      });
      emitToast({ type: 'success', message: `Shift rescheduled to ${targetDate}` });
      await loadRosterForWeek(currentWeekStart);
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to reschedule shift.' });
    } finally {
      setDraggedShift(null);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      await hrApi.createRosterShift(newShiftData);
      emitToast({ type: 'success', message: 'Shift added to roster schedule!' });
      setAddShiftModalOpen(false);
      await loadRosterForWeek(currentWeekStart);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create shift';
      emitToast({ type: 'error', message: msg });
    }
  };

  // -------------------------------------------------------------
  // Leave Apply & Review
  // -------------------------------------------------------------
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await hrApi.applyLeave(newLeaveData);
      emitToast({ type: 'success', message: 'Leave request submitted for manager review!' });
      setApplyLeaveModalOpen(false);
      // Reload balances & requests
      const balRes = await hrApi.getLeaveBalances().catch(() => []);
      setLeaveBalances(balRes || []);
      const reqRes = isManagerOrOwner
        ? await hrApi.getAllLeaveRequests()
        : await hrApi.getMyLeaveRequests();
      setLeaveRequests(reqRes || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply leave';
      emitToast({ type: 'error', message: msg });
    }
  };

  const handleReviewLeave = async (status) => {
    if (!selectedLeaveToReview) return;
    try {
      const result = await hrApi.reviewLeave(selectedLeaveToReview.id, {
        status,
        comment: reviewComment,
      });

      if (result.hasCoverageGaps && result.coverageGapWarning) {
        setApprovalCoverageGapWarning(result.coverageGapWarning);
        emitToast({ type: 'warning', message: result.coverageGapWarning });
      } else {
        emitToast({ type: 'success', message: `Leave request ${status.toLowerCase()}ed!` });
        setReviewLeaveModalOpen(false);
        setSelectedLeaveToReview(null);
        setReviewComment('');
      }

      // Refresh list
      const reqRes = isManagerOrOwner
        ? await hrApi.getAllLeaveRequests()
        : await hrApi.getMyLeaveRequests();
      setLeaveRequests(reqRes || []);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to review leave request`;
      emitToast({ type: 'error', message: msg });
    }
  };

  // -------------------------------------------------------------
  // Payroll Run Wizard & Status Transitions
  // -------------------------------------------------------------
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      const run = await hrApi.generatePayroll({
        year: Number(newPayrollYear),
        month: Number(newPayrollMonth),
        notes: newPayrollNotes,
      });
      emitToast({ type: 'success', message: `Generated Payroll Run ${run.runNumber}!` });
      setGeneratePayrollModalOpen(false);
      const runs = await hrApi.getPayrollRuns();
      setPayrollRuns(runs || []);
      const matched = (runs || []).find((r) => r.id === run.id) || run;
      selectPayrollRun(matched);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate payroll run';
      emitToast({ type: 'error', message: msg });
    }
  };

  const handleTransitionPayrollStatus = async (targetStatus) => {
    if (!selectedPayrollRun) return;
    try {
      const updated = await hrApi.updatePayrollStatus(selectedPayrollRun.id, {
        status: targetStatus,
        notes: `Transitioned to ${targetStatus} by ${user?.fullName || 'Manager'}`,
      });
      emitToast({ type: 'success', message: `Payroll run status changed to ${targetStatus}` });
      setSelectedPayrollRun(updated);
      const runs = await hrApi.getPayrollRuns();
      setPayrollRuns(runs || []);
      const slips = await hrApi.getPayslipsForRun(updated.id);
      setPayrollPayslips(slips || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to transition payroll status';
      emitToast({ type: 'error', message: msg });
    }
  };

  const handleDownloadPayslip = async (slip) => {
    try {
      const blob = await hrApi.downloadPayslipPdf(slip.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${slip.payslipNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      emitToast({ type: 'success', message: `Downloaded ${slip.payslipNumber}` });
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to download payslip PDF.' });
    }
  };

  // -------------------------------------------------------------
  // Filtered staff directory
  // -------------------------------------------------------------
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const name = e.userFullName?.toLowerCase() || '';
      const no = e.empNo?.toLowerCase() || '';
      const matchesSearch = name.includes(staffSearch.toLowerCase()) || no.includes(staffSearch.toLowerCase());
      const matchesDept = staffDeptFilter === 'ALL' || e.department === staffDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, staffSearch, staffDeptFilter]);

  // Week days for roster matrix
  const weekDays = useMemo(() => {
    const days = [];
    const base = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ iso, dayName, display: `${dayName} ${d.getDate()}` });
    }
    return days;
  }, [currentWeekStart]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-800/80 bg-surface-900/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Module 13: HR & Payroll Suite
            </span>
            <span className="text-xs text-slate-400">Champions Club Enterprise</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            Human Resources & Staff Payroll
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Full workforce lifecycle: staff roster, live attendance, intelligent leave deductions, and monthly salary proration.
          </p>
        </div>

        {/* Quick Staff Clock-In / Clock-Out Widget */}
        <div className="flex items-center gap-3 bg-surface-950/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800 text-xs">
            <Clock className="w-4 h-4 text-primary-400" />
            <div>
              <div className="font-semibold text-slate-200">
                {currentClockInSession ? 'Session Active' : 'Off Duty'}
              </div>
              <div className="text-slate-400 text-[11px]">
                {currentClockInSession
                  ? `In since ${new Date(currentClockInSession.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Ready to punch'}
              </div>
            </div>
          </div>

          {currentClockInSession ? (
            <button
              onClick={handleClockOut}
              className="px-4 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              Clock Out
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              className="px-4 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              Clock In
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        {[
          { id: 'directory', label: 'Staff Directory', icon: Users, count: employees.length },
          { id: 'roster', label: 'Roster Calendar', icon: Calendar, count: rosterShifts.length },
          { id: 'attendance', label: 'Attendance Board', icon: Clock, count: todayAttendance.length },
          { id: 'leave', label: 'Leave & Absences', icon: CalendarDays, count: leaveRequests.filter((r) => r.status === 'PENDING').length },
          { id: 'payroll', label: 'Payroll Run Wizard', icon: DollarSign, count: payrollRuns.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive ? 'bg-primary-500/20 text-primary-200' : 'bg-surface-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STAFF DIRECTORY                                    */}
      {/* ========================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search staff name or EMP-ID..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>

              <select
                value={staffDeptFilter}
                onChange={(e) => setStaffDeptFilter(e.target.value)}
                className="px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                <option value="FRONT_DESK">Front Desk</option>
                <option value="BAR_STAFF">Bar & Cafe</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="COACH">Coaching</option>
                <option value="MANAGEMENT">Management</option>
              </select>
            </div>

            {isManagerOrOwner && (
              <button
                onClick={() => setAddStaffModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-primary-950/40 transition-all self-end"
              >
                <Plus className="w-4 h-4" />
                Add Employee Profile
              </button>
            )}
          </div>

          {/* Employee Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-surface-900/40 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
                      {emp.userFullName ? emp.userFullName.charAt(0) : 'E'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{emp.userFullName || 'Staff Member'}</div>
                      <div className="text-xs text-primary-400 font-mono">{emp.empNo}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      emp.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : emp.status === 'ON_LEAVE'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Designation</span>
                    <span className="text-slate-300 font-medium">{emp.designation || 'Staff'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Department</span>
                    <span className="text-slate-300 font-medium">{emp.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Joined</span>
                    <span className="text-slate-300 font-medium">{emp.joinDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Base Salary</span>
                    <span className="text-slate-200 font-semibold">₹{Number(emp.baseSalary).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-surface-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Bank: {emp.bankAccountMasked || '•••• •••• 9999'}</span>
                  <span>PAN: {emp.panNumberMasked || '••••••543K'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ROSTER CALENDAR                                    */}
      {/* ========================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Controls & Coverage Warning Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleWeekChange(-1)}
                className="p-1.5 rounded-lg bg-surface-900 border border-slate-800 hover:bg-surface-800 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-semibold text-sm text-slate-200 px-2">
                Week starting: <span className="text-primary-400">{currentWeekStart}</span>
              </div>
              <button
                onClick={() => handleWeekChange(1)}
                className="p-1.5 rounded-lg bg-surface-900 border border-slate-800 hover:bg-surface-800 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {coverageGaps.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{coverageGaps.length} Coverage Gap(s) flagged</span>
                </div>
              )}

              {isManagerOrOwner && (
                <>
                  <button
                    onClick={() => setAddShiftModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign Shift
                  </button>
                  <button
                    onClick={handlePublishRoster}
                    className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-primary-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publish Week Roster
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 7-Day Weekly Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const shiftsOnDay = rosterShifts.filter((s) => s.shiftDate === day.iso);
              const dayGaps = coverageGaps.filter((g) => g.date === day.iso);

              return (
                <div
                  key={day.iso}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropShiftOnDate(day.iso)}
                  className="glass-card p-3 rounded-xl border border-slate-800/80 bg-surface-900/30 flex flex-col min-h-[320px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-200">
                    <span>{day.display}</span>
                    <span className="text-slate-500 text-[10px]">{shiftsOnDay.length} shifts</span>
                  </div>

                  {dayGaps.length > 0 && (
                    <div className="my-1.5 p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                      ⚠️ No {dayGaps[0].requiredRole} staff!
                    </div>
                  )}

                  <div className="flex-1 space-y-2 pt-2">
                    {shiftsOnDay.map((shift) => (
                      <div
                        key={shift.id}
                        draggable={isManagerOrOwner}
                        onDragStart={() => setDraggedShift(shift)}
                        className="p-2.5 rounded-lg bg-surface-950/80 border border-slate-800/80 hover:border-primary-500/50 cursor-grab active:cursor-grabbing text-xs space-y-1 transition-all"
                      >
                        <div className="font-semibold text-slate-200 flex items-center justify-between">
                          <span>{shift.employeeName}</span>
                          <span className="text-[10px] text-primary-400 font-mono">{shift.startTime.slice(0, 5)}-{shift.endTime.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{shift.roleTag}</span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-800 text-[10px] text-slate-300">
                            {shift.station || 'Main'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {shiftsOnDay.length === 0 && (
                      <div className="h-28 flex items-center justify-center text-slate-600 text-xs italic">
                        No shifts
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ATTENDANCE BOARD                                   */}
      {/* ========================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between glass-card p-4 rounded-xl border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200 text-sm">Today's Attendance Ledger</div>
              <div className="text-slate-400 text-xs">Real-time punch records, overtime past 8 hours, and missing clock-outs.</div>
            </div>

            {isManagerOrOwner && (
              <button
                onClick={handleAutoFlagMissing}
                className="px-3.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Auto-detect Missing Out
              </button>
            )}
          </div>

          <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Total Hrs</th>
                  <th className="py-3 px-4">Overtime</th>
                  <th className="py-3 px-4">Status</th>
                  {isManagerOrOwner && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {todayAttendance.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {row.employeeName || row.employeeNo || 'Staff'}
                    </td>
                    <td className="py-3 px-4 font-mono">{row.workDate}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      {new Date(row.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {row.clockOut
                        ? new Date(row.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-amber-400 italic">In Progress</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold">{row.totalHours} hrs</td>
                    <td className="py-3 px-4">
                      {Number(row.overtimeHours) > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          +{row.overtimeHours} hrs (1.5x)
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : row.status === 'MISSING_OUT'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    {isManagerOrOwner && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setRegularizeData({
                              attendanceId: row.id,
                              clockIn: row.clockIn ? row.clockIn.slice(0, 16) : '',
                              clockOut: row.clockOut ? row.clockOut.slice(0, 16) : '',
                              reason: '',
                            });
                            setRegularizeModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded text-xs"
                        >
                          Regularize
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {todayAttendance.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      No attendance punches recorded today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: LEAVE & ABSENCES                                   */}
      {/* ========================================================= */}
      {activeTab === 'leave' && (
        <div className="space-y-5">
          {/* Leave Balances Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {leaveBalances.map((bal) => (
              <div
                key={bal.id}
                className="glass-card p-4 rounded-xl border border-slate-800/80 bg-surface-900/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs">{bal.leaveTypeCode}</span>
                  <span className="text-[11px] text-slate-400">{bal.year}</span>
                </div>
                <div className="text-2xl font-black text-primary-400">
                  {bal.remainingDays} <span className="text-xs font-normal text-slate-400">days left</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-1">
                  <span>Quota: {bal.allocatedDays}</span>
                  <span>Used: {bal.usedDays}</span>
                  <span>Pending: {bal.pendingDays}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm">Leave Requests Flow</h3>
            <button
              onClick={() => setApplyLeaveModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-950"
            >
              <Plus className="w-4 h-4" />
              Apply for Leave
            </button>
          </div>

          {/* Requests Table */}
          <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaveRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">{req.employeeName || 'Staff'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-primary-300">{req.leaveTypeCode}</td>
                    <td className="py-3 px-4 font-mono">
                      {req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ''}
                      {req.isHalfDay && <span className="ml-1 text-indigo-400 font-semibold">(Half-Day)</span>}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">{req.totalDays} days</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isManagerOrOwner && req.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedLeaveToReview(req);
                            setReviewComment('');
                            setApprovalCoverageGapWarning(null);
                            setReviewLeaveModalOpen(true);
                          }}
                          className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs font-semibold"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No leave requests filed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: PAYROLL WIZARD                                     */}
      {/* ========================================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Select Payroll Run:</span>
              <select
                value={selectedPayrollRun?.id || ''}
                onChange={(e) => {
                  const run = payrollRuns.find((r) => r.id === e.target.value);
                  if (run) selectPayrollRun(run);
                }}
                className="px-3 py-1.5 bg-surface-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
              >
                {payrollRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.runNumber} ({r.year}-{String(r.month).padStart(2, '0')}) - {r.status}
                  </option>
                ))}
              </select>
            </div>

            {isManagerOrOwner && (
              <button
                onClick={() => setGeneratePayrollModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-950"
              >
                <Plus className="w-4 h-4" />
                Generate / Recalculate Payroll
              </button>
            )}
          </div>

          {selectedPayrollRun && (
            <>
              {/* Wizard Status Pipeline */}
              <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-surface-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-100">{selectedPayrollRun.runNumber}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedPayrollRun.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : selectedPayrollRun.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {selectedPayrollRun.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Period: {selectedPayrollRun.year}-{String(selectedPayrollRun.month).padStart(2, '0')} • {selectedPayrollRun.notes}
                    </div>
                  </div>

                  {/* Actions according to status */}
                  {isManagerOrOwner && (
                    <div className="flex items-center gap-2">
                      {selectedPayrollRun.status === 'DRAFT' && (
                        <button
                          onClick={() => handleTransitionPayrollStatus('REVIEW')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Submit for Review ➔
                        </button>
                      )}
                      {selectedPayrollRun.status === 'REVIEW' && (
                        <button
                          onClick={() => handleTransitionPayrollStatus('APPROVED')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Payroll Run
                        </button>
                      )}
                      {selectedPayrollRun.status === 'APPROVED' && (
                        <button
                          onClick={() => handleTransitionPayrollStatus('PAID')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Mark Paid & Lock Ledger
                        </button>
                      )}
                      {selectedPayrollRun.status === 'PAID' && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <Lock className="w-3.5 h-3.5" /> Permanently Locked
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                  <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Total Gross Wages</span>
                    <span className="text-lg font-bold text-slate-100">
                      ₹{Number(selectedPayrollRun.totalGross || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Total Deductions</span>
                    <span className="text-lg font-bold text-rose-400">
                      -₹{Number(selectedPayrollRun.totalDeductions || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Net Payout</span>
                    <span className="text-lg font-black text-emerald-400">
                      ₹{Number(selectedPayrollRun.totalNet || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Total Payslips</span>
                    <span className="text-lg font-bold text-indigo-400">{selectedPayrollRun.payslipsCount}</span>
                  </div>
                </div>
              </div>

              {/* Employee Payslips Diff Table */}
              <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Payslip Ref</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Base (₹)</th>
                      <th className="py-3 px-4">Proration</th>
                      <th className="py-3 px-4">Overtime</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Tax (TDS)</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4 text-right">View / PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payrollPayslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-surface-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-300">{slip.payslipNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-100">{slip.employeeName}</td>
                        <td className="py-3 px-4 font-mono">₹{Number(slip.baseSalary).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-primary-300">
                          {Number(slip.prorationFactor) < 1.0 ? (
                            <span className="text-amber-400 font-bold">{slip.prorationFactor}x</span>
                          ) : (
                            '1.00x'
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">₹{Number(slip.overtimePay).toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">₹{Number(slip.grossPay).toLocaleString()}</td>
                        <td className="py-3 px-4 text-rose-400 font-mono">-₹{Number(slip.taxDeduction).toLocaleString()}</td>
                        <td className="py-3 px-4 font-black text-emerald-400">
                          ₹{Number(slip.netPay).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPayslipForModal(slip)}
                            className="p-1.5 rounded bg-surface-800 hover:bg-surface-700 text-slate-300"
                            title="View Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPayslip(slip)}
                            className="p-1.5 rounded bg-primary-600/30 hover:bg-primary-600 text-primary-300 hover:text-white"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: APPLY LEAVE                                        */}
      {/* ========================================================= */}
      {applyLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg">Apply for Leave</h3>
              <button onClick={() => setApplyLeaveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Leave Type</label>
                <select
                  value={newLeaveData.leaveTypeCode}
                  onChange={(e) => setNewLeaveData({ ...newLeaveData, leaveTypeCode: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  <option value="CASUAL">Casual Leave (Paid)</option>
                  <option value="SICK">Sick Leave (Paid)</option>
                  <option value="PAID">Annual Paid Leave</option>
                  <option value="UNPAID">Loss of Pay (Unpaid)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeaveData.startDate}
                    onChange={(e) => setNewLeaveData({ ...newLeaveData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeaveData.endDate}
                    onChange={(e) => setNewLeaveData({ ...newLeaveData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDayToggle"
                  checked={newLeaveData.isHalfDay}
                  onChange={(e) => setNewLeaveData({ ...newLeaveData, isHalfDay: e.target.checked })}
                  className="rounded border-slate-700 text-primary-600 focus:ring-0"
                />
                <label htmlFor="halfDayToggle" className="text-xs font-medium text-slate-300">
                  Half-Day Leave (Single Date Only)
                </label>
              </div>

              {/* Live Working Days Calculation Preview */}
              {leaveCalcPreview && (
                <div className={`p-3 rounded-xl border text-xs ${
                  leaveCalcPreview.isValid
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  <div className="font-semibold flex items-center justify-between">
                    <span>Working Days Count: {leaveCalcPreview.workingDaysCount} day(s)</span>
                    <span className="text-[11px] text-slate-400">
                      (Weekends: {leaveCalcPreview.weekendsCount}, Holidays: {leaveCalcPreview.holidaysCount})
                    </span>
                  </div>
                  {leaveCalcPreview.validationMessage && (
                    <div className="mt-1 text-[11px]">{leaveCalcPreview.validationMessage}</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={newLeaveData.reason}
                  onChange={(e) => setNewLeaveData({ ...newLeaveData, reason: e.target.value })}
                  placeholder="Explain reason for leave..."
                  className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyLeaveModalOpen(false)}
                  className="px-4 py-2 bg-surface-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveCalcPreview && !leaveCalcPreview.isValid}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
                >
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REVIEW LEAVE REQUEST                               */}
      {/* ========================================================= */}
      {reviewLeaveModalOpen && selectedLeaveToReview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg">Review Leave Application</h3>
              <button onClick={() => setReviewLeaveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-surface-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div><strong className="text-slate-300">Staff:</strong> {selectedLeaveToReview.employeeName}</div>
              <div><strong className="text-slate-300">Period:</strong> {selectedLeaveToReview.startDate} to {selectedLeaveToReview.endDate} ({selectedLeaveToReview.totalDays} working days)</div>
              <div><strong className="text-slate-300">Type:</strong> {selectedLeaveToReview.leaveTypeCode}</div>
              <div><strong className="text-slate-300">Reason:</strong> {selectedLeaveToReview.reason}</div>
            </div>

            {/* Self-approval guard warning */}
            {selectedLeaveToReview.employeeUserId === user?.id && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Self-Approval Prohibited: You cannot approve your own leave request.</span>
              </div>
            )}

            {/* Coverage gap warning if triggered */}
            {approvalCoverageGapWarning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{approvalCoverageGapWarning}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reviewer Comment</label>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Manager comment..."
                className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleReviewLeave('REJECTED')}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleReviewLeave('APPROVED')}
                disabled={selectedLeaveToReview.employeeUserId === user?.id}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold"
              >
                Approve & Update Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: GENERATE PAYROLL                                   */}
      {/* ========================================================= */}
      {generatePayrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg">Generate Monthly Payroll</h3>
              <button onClick={() => setGeneratePayrollModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                  <input
                    type="number"
                    min="2024"
                    max="2030"
                    value={newPayrollYear}
                    onChange={(e) => setNewPayrollYear(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Month</label>
                  <select
                    value={newPayrollMonth}
                    onChange={(e) => setNewPayrollMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })} ({m})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Run Notes</label>
                <input
                  type="text"
                  value={newPayrollNotes}
                  onChange={(e) => setNewPayrollNotes(e.target.value)}
                  placeholder="e.g. Regular June payroll run"
                  className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div className="p-3 bg-surface-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>✓ Idempotent generation: recalculates from draft without duplicate runs.</div>
                <div>✓ Calendar day proration applied automatically for mid-month joiners & exits.</div>
                <div>✓ 1.5x overtime hours integrated directly from attendance records.</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGeneratePayrollModalOpen(false)}
                  className="px-4 py-2 bg-surface-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold"
                >
                  Calculate & Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PAYSLIP VIEWER BREAKDOWN                           */}
      {/* ========================================================= */}
      {selectedPayslipForModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-lg">Official Payslip Voucher</h3>
                <span className="text-xs text-primary-400 font-mono">{selectedPayslipForModal.payslipNumber}</span>
              </div>
              <button onClick={() => setSelectedPayslipForModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-surface-950 rounded-xl border border-slate-800/80 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Employee Name:</span>
                <span className="text-slate-100 font-bold">{selectedPayslipForModal.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Base Salary:</span>
                <span className="text-slate-200">₹{Number(selectedPayslipForModal.baseSalary).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proration Factor:</span>
                <span className="text-primary-300">{selectedPayslipForModal.prorationFactor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Overtime Pay:</span>
                <span className="text-indigo-400">+₹{Number(selectedPayslipForModal.overtimePay).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Allowances (Meal/Wellness):</span>
                <span className="text-slate-200">+₹{Number(selectedPayslipForModal.allowances).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-100 border-t border-slate-800 pt-2">
                <span>GROSS EARNINGS:</span>
                <span>₹{Number(selectedPayslipForModal.grossPay).toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-slate-800/60 space-y-1 text-rose-400">
                <div className="flex justify-between">
                  <span>Tax (TDS):</span>
                  <span>-₹{Number(selectedPayslipForModal.taxDeduction).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unpaid Leave ({selectedPayslipForModal.unpaidLeaveDays} days):</span>
                  <span>-₹{Number(selectedPayslipForModal.unpaidLeaveDeduction).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional Tax / Other:</span>
                  <span>-₹{Number(selectedPayslipForModal.otherDeductions).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between font-extrabold text-sm text-emerald-400 border-t-2 border-emerald-500/30 pt-2">
                <span>NET TAKE-HOME:</span>
                <span>₹{Number(selectedPayslipForModal.netPay).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadPayslip(selectedPayslipForModal)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-950"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSIGN SHIFT                                       */}
      {/* ========================================================= */}
      {addShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg">Assign Roster Shift</h3>
              <button onClick={() => setAddShiftModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Staff Member</label>
                <select
                  value={newShiftData.employeeId}
                  onChange={(e) => setNewShiftData({ ...newShiftData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.userFullName} ({e.empNo} - {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShiftData.shiftDate}
                  onChange={(e) => setNewShiftData({ ...newShiftData, shiftDate: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShiftData.startTime}
                    onChange={(e) => setNewShiftData({ ...newShiftData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShiftData.endTime}
                    onChange={(e) => setNewShiftData({ ...newShiftData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department / Role</label>
                  <select
                    value={newShiftData.roleTag}
                    onChange={(e) => setNewShiftData({ ...newShiftData, roleTag: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  >
                    <option value="FRONT_DESK">Front Desk</option>
                    <option value="BAR_STAFF">Bar & Lounge</option>
                    <option value="KITCHEN">Kitchen</option>
                    <option value="COACH">Coaching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Station / Zone</label>
                  <input
                    type="text"
                    value={newShiftData.station}
                    onChange={(e) => setNewShiftData({ ...newShiftData, station: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddShiftModalOpen(false)}
                  className="px-4 py-2 bg-surface-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrPayrollPage;
