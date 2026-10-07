import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courtsApi } from '../../api/courtsApi';
import { emitToast } from '../../api/client';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Sun,
  Moon
} from 'lucide-react';

export default function OpeningHoursConsolePage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    courtId: '',
    dayOfWeek: 'MONDAY',
    specificDate: '',
    openTime: '06:00:00',
    closeTime: '23:00:00',
    isClosed: false,
    reason: '',
  });

  const { data: hours = [], isLoading } = useQuery({
    queryKey: ['admin-hours'],
    queryFn: courtsApi.getAllHours,
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['admin-courts'],
    queryFn: courtsApi.getAllCourtsAdmin,
  });

  const createHoursMutation = useMutation({
    mutationFn: courtsApi.createHours,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-hours']);
      setIsCreateOpen(false);
      emitToast({ type: 'success', title: 'Schedule Saved', message: 'Opening hours updated.' });
    },
    onError: (err) => {
      emitToast({ type: 'error', title: 'Failed to save', message: err.response?.data?.message || err.message });
    },
  });

  const deleteHoursMutation = useMutation({
    mutationFn: courtsApi.deleteHours,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-hours']);
      emitToast({ type: 'success', title: 'Rule Deleted', message: 'Hours rule removed.' });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Opening Hours & Holidays
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Club operating windows, court-specific schedules, and holiday closure exceptions
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              courtId: '',
              dayOfWeek: 'MONDAY',
              specificDate: '',
              openTime: '06:00:00',
              closeTime: '23:00:00',
              isClosed: false,
              reason: '',
            });
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Schedule / Holiday
        </button>
      </div>

      {/* Hours Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Scope</th>
                <th className="p-4">Day / Specific Date</th>
                <th className="p-4">Operating Hours</th>
                <th className="p-4">Status / Reason</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Loading opening hours...
                  </td>
                </tr>
              ) : hours.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No custom hours configured. Default 06:00 - 23:00 applies.
                  </td>
                </tr>
              ) : (
                hours.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      {h.courtName || 'Club-Wide (All Courts)'}
                    </td>
                    <td className="p-4">
                      {h.specificDate ? (
                        <span className="font-mono text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {h.specificDate} (Exception)
                        </span>
                      ) : (
                        <span className="font-medium text-slate-200">
                          Every {h.dayOfWeek}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {h.isClosed ? '—' : `${h.openTime} to ${h.closeTime}`}
                    </td>
                    <td className="p-4">
                      {h.isClosed ? (
                        <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-medium">
                          Closed: {h.reason || 'Holiday'}
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          {h.reason || 'Open as Scheduled'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this opening hours rule?')) {
                            deleteHoursMutation.mutate(h.id);
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

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Set Operating Hours or Closure</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-400 font-medium">Court Scope (Optional)</label>
                <select
                  value={formData.courtId}
                  onChange={(e) => setFormData({ ...formData, courtId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="">Club-Wide (All Courts)</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Or Specific Date (Holiday)</label>
                  <input
                    type="date"
                    value={formData.specificDate}
                    onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Open Time (HH:mm:ss)</label>
                  <input
                    type="text"
                    value={formData.openTime}
                    onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Close Time (HH:mm:ss)</label>
                  <input
                    type="text"
                    value={formData.closeTime}
                    onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Reason / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Regular Club Hours or Diwali Holiday"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.isClosed}
                    onChange={(e) => setFormData({ ...formData, isClosed: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500"
                  />
                  Mark Facility / Court as Closed
                </label>
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
                onClick={() => createHoursMutation.mutate({
                  ...formData,
                  courtId: formData.courtId || null,
                  specificDate: formData.specificDate || null,
                })}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
