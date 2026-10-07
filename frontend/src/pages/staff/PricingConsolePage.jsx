import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '../../api/pricingApi';
import { courtsApi } from '../../api/courtsApi';
import { emitToast } from '../../api/client';
import {
  Tag,
  Plus,
  Trash2,
  Play,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';

export default function PricingConsolePage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Quote Tester state
  const [testerCourtId, setTesterCourtId] = useState('');
  const [testerDateTime, setTesterDateTime] = useState('2026-10-08T18:00');
  const [testerPlanId, setTesterPlanId] = useState('');
  const [testerResult, setTesterResult] = useState(null);
  const [testerError, setTesterError] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // New Rule Form state
  const [newRule, setNewRule] = useState({
    sportId: '',
    planId: '',
    dayType: 'WEEKDAY',
    timeBand: 'PEAK',
    startTime: '17:00:00',
    endTime: '23:00:00',
    price: 30,
    priority: 10,
    active: true,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['admin-pricing-rules'],
    queryFn: pricingApi.getAllRules,
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['admin-courts'],
    queryFn: courtsApi.getAllCourtsAdmin,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['admin-sports'],
    queryFn: courtsApi.getAllSports,
  });

  const createRuleMutation = useMutation({
    mutationFn: pricingApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pricing-rules']);
      setIsCreateOpen(false);
      emitToast({ type: 'success', title: 'Pricing Rule Created', message: 'New deterministic pricing rule is active.' });
    },
    onError: (err) => {
      emitToast({ type: 'error', title: 'Failed to create rule', message: err.response?.data?.message || err.message });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: pricingApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pricing-rules']);
      emitToast({ type: 'success', title: 'Rule Deleted', message: 'Pricing rule has been deactivated.' });
    },
  });

  const handleTestQuote = async () => {
    if (!testerCourtId) {
      emitToast({ type: 'error', title: 'Court required', message: 'Please select a court to test.' });
      return;
    }

    setIsTesting(true);
    setTesterResult(null);
    setTesterError(null);

    try {
      // Form date-time into ISO instant (club timezone)
      const startInstant = new Date(testerDateTime).toISOString();
      const payload = {
        courtId: testerCourtId,
        start: startInstant,
      };

      const res = await pricingApi.previewQuote(payload);
      setTesterResult(res);
    } catch (err) {
      setTesterError(err.response?.data?.message || err.message || 'Pricing resolution failed.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-400" />
            Pricing Rules & Resolution Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic rule matrix: most specific match wins, ties broken by priority
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Pricing Rule
        </button>
      </div>

      {/* 2. Interactive Price Preview Tester Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Interactive Price Quote Tester</h2>
          </div>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-mono border border-emerald-500/20">
            Real-Time Simulator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Select Court</label>
            <select
              value={testerCourtId}
              onChange={(e) => setTesterCourtId(e.target.value)}
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="">-- Choose Court --</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.sportName || c.sportType})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Session Start (Date & Time)</label>
            <input
              type="datetime-local"
              value={testerDateTime}
              onChange={(e) => setTesterDateTime(e.target.value)}
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTestQuote}
              disabled={isTesting || !testerCourtId}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {isTesting ? 'Calculating...' : 'Run Quote Resolution'}
            </button>
          </div>
        </div>

        {/* Tester Output Container */}
        {testerResult && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Deterministic Quote Resolved:</span>
                <span className="font-mono text-lg text-white ml-1">
                  {testerResult.price === 0 ? 'FREE ($0.00)' : `₹${testerResult.price}`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Rule ID: {testerResult.matchedRuleId}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono text-slate-300">
              <span className="text-slate-400 font-sans font-bold text-[11px] mb-1">Resolution Audit Steps:</span>
              {testerResult.explanation?.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testerError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <strong className="block font-semibold">Pricing Resolution Error (No Silent 0):</strong>
              {testerError}
            </div>
          </div>
        )}
      </div>

      {/* 3. Pricing Rules Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Active Pricing Rules</h3>
          <span className="text-xs text-slate-400">Total Rules: {rules.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Sport / Scope</th>
                <th className="p-3.5">Plan / Customer</th>
                <th className="p-3.5">Day & Time Band</th>
                <th className="p-3.5">Active Hours</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {rulesLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading pricing rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No rules configured.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      {rule.sportName || 'Club-wide (All Sports)'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                        {rule.planCode || 'Walk-in / Guest'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">
                          {rule.dayType}
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                          {rule.timeBand}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {rule.startTime} - {rule.endTime}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-emerald-400">
                      {rule.price === 0 ? 'FREE ($0.00)' : `₹${rule.price}`}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {rule.priority}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this pricing rule?')) {
                            deleteRuleMutation.mutate(rule.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Create Pricing Rule</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Sport (Optional)</label>
                <select
                  value={newRule.sportId}
                  onChange={(e) => setNewRule({ ...newRule, sportId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">All Sports (Generic)</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Day Type</label>
                <select
                  value={newRule.dayType}
                  onChange={(e) => setNewRule({ ...newRule, dayType: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="WEEKDAY">WEEKDAY (Mon-Fri)</option>
                  <option value="WEEKEND">WEEKEND (Sat-Sun)</option>
                  <option value="ALL">ALL DAYS</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Time Band</label>
                <select
                  value={newRule.timeBand}
                  onChange={(e) => setNewRule({ ...newRule, timeBand: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="OFFPEAK">OFFPEAK</option>
                  <option value="PEAK">PEAK</option>
                  <option value="ALL">ALL HOURS</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Priority (Higher wins ties)</label>
                <input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Start Time (HH:mm:ss)</label>
                <input
                  type="text"
                  value={newRule.startTime}
                  onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">End Time (HH:mm:ss)</label>
                <input
                  type="text"
                  value={newRule.endTime}
                  onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="text-slate-400 font-medium">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRule.price}
                  onChange={(e) => setNewRule({ ...newRule, price: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => createRuleMutation.mutate({
                  ...newRule,
                  sportId: newRule.sportId || null,
                  planId: newRule.planId || null,
                })}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
