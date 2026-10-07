import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courtsApi } from '../../api/courtsApi';
import { emitToast } from '../../api/client';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  X,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function BlackoutsConsolePage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const [formData, setFormData] = useState({
    courtId: '',
    startTime: '2026-10-08T14:00',
    endTime: '2026-10-08T16:00',
    reason: 'Emergency Net & Surface Repair',
    confirmCancelAndNotify: false,
  });

  const { data: blackouts = [], isLoading } = useQuery({
    queryKey: ['admin-blackouts'],
    queryFn: courtsApi.getAllBlackouts,
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['admin-courts'],
    queryFn: courtsApi.getAllCourtsAdmin,
  });

  const createBlackoutMutation = useMutation({
    mutationFn: courtsApi.createBlackout,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-blackouts']);
      setIsCreateOpen(false);
      setConflictData(null);
      emitToast({
        type: 'success',
        title: 'Blackout Scheduled',
        message: 'Court blocked successfully for the requested duration.',
      });
    },
    onError: (err) => {
      // Check 409 Conflict with conflictingBookings
      if (err.response?.status === 409 && err.response?.data?.conflictingBookings) {
        setConflictData({
          message: err.response.data.message,
          conflicts: err.response.data.conflictingBookings,
        });
      } else {
        emitToast({
          type: 'error',
          title: 'Failed to create blackout',
          message: err.response?.data?.message || err.message,
        });
      }
    },
  });

  const deleteBlackoutMutation = useMutation({
    mutationFn: courtsApi.deleteBlackout,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-blackouts']);
      emitToast({ type: 'success', title: 'Blackout Removed', message: 'Court is now unblocked.' });
    },
  });

  const handleCreateSubmit = (confirmCancel = false) => {
    if (!formData.courtId) {
      emitToast({ type: 'error', title: 'Court required', message: 'Please select a court.' });
      return;
    }

    const payload = {
      courtId: formData.courtId,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      reason: formData.reason,
      confirmCancelAndNotify: confirmCancel,
    };

    createBlackoutMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Court Blackouts & Maintenance
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Schedule maintenance blocks with conflict detection and automated member notification
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              courtId: courts[0]?.id || '',
              startTime: '2026-10-08T14:00',
              endTime: '2026-10-08T16:00',
              reason: 'Routine Court Deep Cleaning',
              confirmCancelAndNotify: false,
            });
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Schedule Blackout
        </button>
      </div>

      {/* Blackouts Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Court</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Start Time</th>
                <th className="p-4">End Time</th>
                <th className="p-4">Created By</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading blackouts...
                  </td>
                </tr>
              ) : blackouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No scheduled blackouts. All courts available as normal.
                  </td>
                </tr>
              ) : (
                blackouts.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{b.courtName}</td>
                    <td className="p-4 text-amber-300 font-medium">{b.reason}</td>
                    <td className="p-4 font-mono">{new Date(b.startTime).toLocaleString()}</td>
                    <td className="p-4 font-mono">{new Date(b.endTime).toLocaleString()}</td>
                    <td className="p-4 text-slate-400">{b.createdByName || 'Front Desk'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm('Delete blackout and unblock court?')) {
                            deleteBlackoutMutation.mutate(b.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        title="Remove blackout"
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

      {/* Schedule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Schedule Court Blackout</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-400 font-medium">Select Court</label>
                <select
                  value={formData.courtId}
                  onChange={(e) => setFormData({ ...formData, courtId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Select Court --</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.sportName || c.sportType})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Reason for Blackout</label>
                <input
                  type="text"
                  placeholder="e.g. Net Tension Adjustments, Surface Cleaning"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
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
                disabled={!formData.courtId || !formData.reason}
                onClick={() => handleCreateSubmit(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Schedule Blackout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicting Bookings Modal */}
      {conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/60 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-white">Booking Conflict Detected</h3>
                <p className="text-xs text-rose-300">
                  {conflictData.message}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              The following member reservations overlap with your requested maintenance window. Creating this blackout
              will cancel these bookings and dispatch automated notification emails/SMS to the members.
            </p>

            <div className="max-h-52 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-2">
              {conflictData.conflicts?.map((c) => (
                <div key={c.bookingId} className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="font-bold text-white block">{c.bookingReference}</span>
                    <span className="text-slate-400 text-[11px]">{c.userName} ({c.userEmail})</span>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-300">
                    <div>{new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-slate-500">{new Date(c.startTime).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setConflictData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateSubmit(true)}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
                Cancel Bookings & Notify Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
