import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Flame,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { crmApi } from '../../api/crmApi';
import { emitToast } from '../../api/client';

export const LeadCrmPage = () => {
  const [leads, setLeads] = useState([]);
  const [funnelStats, setFunnelStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Activity modal state
  const [newActivityDetails, setNewActivityDetails] = useState('');
  const [newActivityType, setNewActivityType] = useState('NOTE');

  // Follow-up modal state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Quote builder modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteLines, setQuoteLines] = useState([
    { description: 'Annual Gold Membership Pass', quantity: 1, unitPrice: 5499.00 },
  ]);
  const [quoteValidityDays, setQuoteValidityDays] = useState(14);
  const [quoteNotes, setQuoteNotes] = useState('Includes 18% GST. Valid for 14 calendar days.');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [createdQuoteResult, setCreatedQuoteResult] = useState(null);

  // Convert to Member modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertPlanCode, setConvertPlanCode] = useState('GOLD');
  const [convertDob, setConvertDob] = useState('1995-06-15');
  const [submittingConvert, setSubmittingConvert] = useState(false);

  // Load leads and funnel stats
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        crmApi.getLeads({ search: searchQuery }),
        crmApi.getFunnelStats(),
      ]);
      setLeads(leadsData);
      setFunnelStats(statsData);
    } catch (err) {
      console.error('Failed to load CRM data', err);
      emitToast({ type: 'error', message: 'Failed to load leads pipeline.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery]);

  // Status columns
  const columns = [
    { id: 'NEW', label: 'New Enquiries', color: 'border-blue-500/50 text-blue-400 bg-blue-950/20' },
    { id: 'CONTACTED', label: 'Contacted', color: 'border-purple-500/50 text-purple-400 bg-purple-950/20' },
    { id: 'QUOTE_SENT', label: 'Quote Sent', color: 'border-amber-500/50 text-amber-400 bg-amber-950/20' },
    { id: 'TRIAL_BOOKED', label: 'Trial Booked', color: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/20' },
    { id: 'WON', label: 'Won / Enrolled', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20' },
    { id: 'LOST', label: 'Closed / Lost', color: 'border-rose-500/50 text-rose-400 bg-rose-950/20' },
  ];

  // Quick update status
  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      let lostReason = null;
      if (newStatus === 'LOST') {
        lostReason = window.prompt('Please enter the reason this lead was lost:') || 'Not interested';
      }
      await crmApi.updateLeadStatus(leadId, { status: newStatus, lostReason });
      emitToast({ type: 'success', message: `Lead moved to ${newStatus}` });
      fetchLeads();
      if (selectedLead && selectedLead.id === leadId) {
        const refreshed = await crmApi.getLeadById(leadId);
        setSelectedLead(refreshed);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status.';
      emitToast({ type: 'error', message: msg });
    }
  };

  // Open detail modal
  const handleOpenDetail = async (lead) => {
    try {
      const full = await crmApi.getLeadById(lead.id);
      setSelectedLead(full);
      setDetailModalOpen(true);
    } catch (err) {
      setSelectedLead(lead);
      setDetailModalOpen(true);
    }
  };

  // Add activity log
  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivityDetails.trim() || !selectedLead) return;

    try {
      await crmApi.addActivity(selectedLead.id, {
        type: newActivityType,
        details: newActivityDetails.trim(),
      });
      emitToast({ type: 'success', message: 'Activity logged successfully.' });
      setNewActivityDetails('');
      const refreshed = await crmApi.getLeadById(selectedLead.id);
      setSelectedLead(refreshed);
      fetchLeads();
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to record activity.' });
    }
  };

  // Schedule Follow-Up
  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpDate || !selectedLead) return;

    try {
      await crmApi.scheduleFollowUp(selectedLead.id, {
        followUpAt: new Date(followUpDate).toISOString(),
        note: followUpNote,
      });
      emitToast({ type: 'success', message: 'Follow-up reminder set.' });
      setFollowUpModalOpen(false);
      setFollowUpNote('');
      const refreshed = await crmApi.getLeadById(selectedLead.id);
      setSelectedLead(refreshed);
      fetchLeads();
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to schedule follow-up.' });
    }
  };

  // Create Quote
  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    setSubmittingQuote(true);
    try {
      const res = await crmApi.createQuote({
        leadId: selectedLead.id,
        lines: quoteLines,
        validityDays: parseInt(quoteValidityDays, 10),
        notes: quoteNotes,
      });
      setCreatedQuoteResult(res);
      emitToast({ type: 'success', message: `Quote ${res.quoteNumber} created and sent!` });
      const refreshed = await crmApi.getLeadById(selectedLead.id);
      setSelectedLead(refreshed);
      fetchLeads();
    } catch (err) {
      emitToast({ type: 'error', message: 'Failed to build quote.' });
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Convert Lead to Member
  const handleConvertLead = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    setSubmittingConvert(true);
    try {
      const res = await crmApi.convertLead(selectedLead.id, {
        planCode: convertPlanCode,
        dob: convertDob,
        createPortalAccount: true,
      });
      emitToast({ type: 'success', message: `Lead successfully converted to Member ${res.convertedMemberNo}!` });
      setConvertModalOpen(false);
      const refreshed = await crmApi.getLeadById(selectedLead.id);
      setSelectedLead(refreshed);
      fetchLeads();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to convert lead.';
      emitToast({ type: 'error', message: msg });
    } finally {
      setSubmittingConvert(false);
    }
  };

  // Line item helpers for Quote builder
  const handleAddQuoteLine = () => {
    setQuoteLines([...quoteLines, { description: '', quantity: 1, unitPrice: 1000.00 }]);
  };
  const handleUpdateQuoteLine = (idx, field, val) => {
    const updated = [...quoteLines];
    updated[idx][field] = val;
    setQuoteLines(updated);
  };
  const handleRemoveQuoteLine = (idx) => {
    if (quoteLines.length === 1) return;
    setQuoteLines(quoteLines.filter((_, i) => i !== idx));
  };

  const calculateSubtotal = () => {
    return quoteLines.reduce((acc, l) => acc + (l.quantity * (parseFloat(l.unitPrice) || 0)), 0);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-400" />
            Lead CRM & Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Convert prospective visitors into champions. Automated round-robin assignment & quotes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="crm-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchLeads}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Conversion Funnel Analytics Banner */}
      {funnelStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass-card p-4 rounded-2xl border-slate-800 bg-surface-900/50 text-center">
            <div className="text-xs text-slate-400">Total Leads</div>
            <div className="text-2xl font-black text-white mt-1">{funnelStats.totalLeads}</div>
          </div>
          <div className="glass-card p-4 rounded-2xl border-slate-800 bg-surface-900/50 text-center">
            <div className="text-xs text-slate-400">Trial Booked</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">{funnelStats.trialBookedCount}</div>
          </div>
          <div className="glass-card p-4 rounded-2xl border-slate-800 bg-surface-900/50 text-center">
            <div className="text-xs text-slate-400">Active Quotes</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{funnelStats.activeQuotesCount}</div>
          </div>
          <div className="glass-card p-4 rounded-2xl border-slate-800 bg-surface-900/50 text-center">
            <div className="text-xs text-slate-400">Won / Enrolled</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{funnelStats.wonCount}</div>
          </div>
          <div className="glass-card p-4 rounded-2xl border-slate-800 bg-surface-900/50 text-center col-span-2 md:col-span-1">
            <div className="text-xs text-slate-400">Win Rate %</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{funnelStats.winRatePercentage}%</div>
          </div>
        </div>
      )}

      {/* Overdue Follow-ups Notice */}
      {funnelStats && funnelStats.overdueFollowUpsCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span><strong>{funnelStats.overdueFollowUpsCount} Follow-ups Overdue!</strong> Please check contact schedules.</span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-amber-400 underline font-semibold"
          >
            Show All
          </button>
        </div>
      )}

      {/* 3. CRM Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div
              key={col.id}
              className="glass-card rounded-2xl p-3 border-slate-800 bg-surface-900/40 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className={`p-2.5 rounded-xl border mb-3 flex items-center justify-between ${col.color}`}>
                <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-900/80">
                  {colLeads.length}
                </span>
              </div>

              {/* Lead Cards List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colLeads.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    No leads in this stage
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleOpenDetail(lead)}
                      id={`lead-card-${lead.id}`}
                      className="p-3 rounded-xl border border-slate-800 bg-surface-950/70 hover:border-slate-700 hover:bg-surface-950 transition cursor-pointer space-y-2 group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-bold text-xs text-white group-hover:text-emerald-400 transition">
                          {lead.name}
                        </div>
                        {lead.overdue && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/40">
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{lead.phone || 'No phone'}</span>
                      </div>

                      {lead.interest && (
                        <div className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/30">
                          {lead.interest}
                        </div>
                      )}

                      {/* Quick Move stage buttons */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {lead.source}
                        </span>
                        <div className="flex gap-1">
                          {col.id === 'NEW' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(lead.id, 'CONTACTED')}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800/50"
                            >
                              Contact →
                            </button>
                          )}
                          {col.id === 'CONTACTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead);
                                setQuoteModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800/50"
                            >
                              Quote →
                            </button>
                          )}
                          {col.id !== 'WON' && col.id !== 'LOST' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead);
                                setConvertModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/50"
                            >
                              Convert ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Lead Detail & Timeline Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-2xl w-full p-6 border-slate-800 bg-surface-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{selectedLead.name}</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                      {selectedLead.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex gap-4">
                    <span>Email: {selectedLead.email || 'N/A'}</span>
                    <span>Phone: {selectedLead.phone || 'N/A'}</span>
                    <span>Source: {selectedLead.source}</span>
                  </div>
                </div>
                <button
                  type="button"
                  id="close-lead-detail-modal-btn"
                  onClick={() => setDetailModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lead Details & Actions Bar */}
              <div className="py-4 border-b border-slate-800 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFollowUpModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Schedule Follow-Up
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Create Quote
                </button>
                {selectedLead.status !== 'WON' && (
                  <button
                    type="button"
                    onClick={() => setConvertModalOpen(true)}
                    id="modal-convert-member-btn"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Convert to Member
                  </button>
                )}
              </div>

              {/* Message from Lead (XSS Safe) */}
              {selectedLead.message && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <div className="text-slate-500 font-bold mb-1">Incoming Message:</div>
                  <div className="leading-relaxed">{selectedLead.message}</div>
                </div>
              )}

              {/* Quotes Associated */}
              {selectedLead.quotes && selectedLead.quotes.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Sent Quotes</h4>
                  {selectedLead.quotes.map((q) => (
                    <div key={q.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-white">{q.quoteNumber}</span>
                        <span className="text-slate-400 ml-2">Total: ₹{q.total}</span>
                        <span className="text-slate-500 ml-2">Status: {q.status}</span>
                      </div>
                      <a
                        href={crmApi.getQuotePdfUrl(q.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-[11px]"
                      >
                        <Download className="w-3 h-3 text-emerald-400" /> PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity Timeline */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Activity Timeline</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedLead.activities?.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span className="font-bold text-slate-300">{act.type} • {act.performerName || 'System'}</span>
                        <span>{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-200">{act.details}</div>
                    </div>
                  ))}
                </div>

                {/* Log New Activity */}
                <form onSubmit={handleAddActivity} className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="NOTE">Note</option>
                      <option value="CALL">Phone Call</option>
                      <option value="EMAIL">Email</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Log call notes, remarks..."
                      value={newActivityDetails}
                      onChange={(e) => setNewActivityDetails(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                    >
                      Log
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Schedule Follow-up Modal */}
      <AnimatePresence>
        {followUpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-md w-full p-6 border-slate-800 bg-surface-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Schedule Follow-Up
                </h4>
                <button type="button" onClick={() => setFollowUpModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleScheduleFollowUp} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Follow-Up Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reminder Note</label>
                  <input
                    type="text"
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="e.g. Call regarding family weekend membership"
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs transition"
                >
                  Save Reminder
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Quote Builder Modal */}
      <AnimatePresence>
        {quoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-xl w-full p-6 border-slate-800 bg-surface-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" /> Quote Builder for {selectedLead?.name}
                </h4>
                <button
                  type="button"
                  id="close-quote-modal-btn"
                  onClick={() => {
                    setQuoteModalOpen(false);
                    setCreatedQuoteResult(null);
                  }}
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {createdQuoteResult ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Quotation Dispatched!</h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                    <div>Quote Number: <span className="font-mono text-emerald-400">{createdQuoteResult.quoteNumber}</span></div>
                    <div>Total Amount: ₹{createdQuoteResult.total} (includes 18% GST)</div>
                    <div>Valid Until: {new Date(createdQuoteResult.validUntil).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <a
                      href={crmApi.getQuotePdfUrl(createdQuoteResult.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-emerald-500 text-slate-950 text-xs"
                    >
                      <Download className="w-4 h-4" /> Download PDF Quotation
                    </a>
                    <button
                      type="button"
                      id="done-quote-modal-btn"
                      onClick={() => {
                        setQuoteModalOpen(false);
                        setCreatedQuoteResult(null);
                      }}
                      className="px-6 py-2.5 rounded-xl font-semibold bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateQuote} className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>Line Items</span>
                      <button
                        type="button"
                        onClick={handleAddQuoteLine}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Line
                      </button>
                    </div>

                    {quoteLines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => handleUpdateQuoteLine(idx, 'description', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => handleUpdateQuoteLine(idx, 'quantity', parseInt(e.target.value, 10))}
                          className="w-16 px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white text-center"
                        />
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Rate"
                          value={line.unitPrice}
                          onChange={(e) => handleUpdateQuoteLine(idx, 'unitPrice', parseFloat(e.target.value))}
                          className="w-24 px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQuoteLine(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST Tax (18%):</span>
                      <span>₹{(calculateSubtotal() * 0.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-1">
                      <span>Total Quote Value:</span>
                      <span className="text-emerald-400">₹{(calculateSubtotal() * 1.18).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Validity (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={quoteValidityDays}
                      onChange={(e) => setQuoteValidityDays(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="w-full py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs transition"
                  >
                    {submittingQuote ? 'Generating Quote...' : 'Issue & Send Quote'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. One-Click Convert to Member Modal */}
      <AnimatePresence>
        {convertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-md w-full p-6 border-slate-800 bg-surface-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> One-Click Member Conversion
                </h4>
                <button type="button" onClick={() => setConvertModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleConvertLead} className="mt-4 space-y-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div><strong>Lead Name:</strong> {selectedLead?.name}</div>
                  <div><strong>Email:</strong> {selectedLead?.email || 'Will auto-generate member handle'}</div>
                  <div><strong>Phone:</strong> {selectedLead?.phone || 'Will auto-assign default'}</div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Membership Plan *</label>
                  <select
                    value={convertPlanCode}
                    onChange={(e) => setConvertPlanCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="GOLD">Gold Tier (₹5,499/mo) - 14-day advance, 25% court discount</option>
                    <option value="SILVER">Silver Tier (₹2,999/mo) - 7-day advance</option>
                    <option value="JUNIOR">Junior Cadet (₹1,999/mo) - Under 18 Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={convertDob}
                    onChange={(e) => setConvertDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                  <div>✓ Automatically sends welcome email & SMS stub</div>
                  <div>✓ Creates Member Portal user invite</div>
                  <div>✓ Generates voucher <code className="text-amber-400">WELCOME100</code> for 1st-week perks</div>
                  <div>✓ Dispatches task to front desk for club tour</div>
                </div>

                <button
                  type="submit"
                  id="convert-submit-btn"
                  disabled={submittingConvert}
                  className="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs transition"
                >
                  {submittingConvert ? 'Converting...' : 'Confirm & Convert Lead'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadCrmPage;
