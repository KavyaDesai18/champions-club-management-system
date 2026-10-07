import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courtsApi } from '../../api/courtsApi';
import { emitToast } from '../../api/client';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  ShieldAlert,
  Calendar
} from 'lucide-react';

export default function CourtsConsolePage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [warningModalData, setWarningModalData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sportId: '',
    surface: 'SYNTHETIC',
    indoor: true,
    status: 'ACTIVE',
    hourlyRateMember: 15,
    hourlyRateGuest: 20,
  });

  const { data: courts = [], isLoading } = useQuery({
    queryKey: ['admin-courts'],
    queryFn: courtsApi.getAllCourtsAdmin,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['admin-sports'],
    queryFn: courtsApi.getAllSports,
  });

  const createMutation = useMutation({
    mutationFn: courtsApi.createCourt,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courts']);
      setIsCreateOpen(false);
      emitToast({ type: 'success', title: 'Court Created', message: 'New court added to system.' });
    },
    onError: (err) => {
      emitToast({ type: 'error', title: 'Failed to create court', message: err.response?.data?.message || err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => courtsApi.updateCourt(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries(['admin-courts']);
      setEditingCourt(null);
      // Check future bookings warning
      if (updated.futureActiveBookings && updated.futureActiveBookings.length > 0) {
        setWarningModalData(updated);
      } else {
        emitToast({ type: 'success', title: 'Court Updated', message: 'Court details updated successfully.' });
      }
    },
    onError: (err) => {
      emitToast({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: courtsApi.deleteCourt,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courts']);
      emitToast({ type: 'success', title: 'Court Deleted', message: 'Court has been retired/deleted.' });
    },
  });

  const handleStatusChange = (court, newStatus) => {
    updateMutation.mutate({
      id: court.id,
      data: { status: newStatus, active: newStatus === 'ACTIVE' },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            Courts Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure court inventory, surfaces, indoor status, and operational states
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              name: '',
              sportId: sports[0]?.id || '',
              surface: 'SYNTHETIC',
              indoor: true,
              status: 'ACTIVE',
              hourlyRateMember: 15,
              hourlyRateGuest: 20,
            });
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Court
        </button>
      </div>

      {/* Courts Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Court Name</th>
                <th className="p-4">Sport</th>
                <th className="p-4">Surface / Setting</th>
                <th className="p-4">Member / Guest Rate</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Loading courts...
                  </td>
                </tr>
              ) : courts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No courts found. Add your first facility court!
                  </td>
                </tr>
              ) : (
                courts.map((court) => (
                  <tr key={court.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{court.name}</td>
                    <td className="p-4">{court.sportName || court.sportType}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {court.surface}
                        </span>
                        <span className="text-xs text-slate-400">
                          {court.indoor ? 'Indoor' : 'Outdoor'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium">
                      ₹{court.hourlyRateMember} / ₹{court.hourlyRateGuest}
                    </td>
                    <td className="p-4">
                      <select
                        value={court.status}
                        onChange={(e) => handleStatusChange(court, e.target.value)}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-all ${
                          court.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : court.status === 'MAINTENANCE'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <option value="ACTIVE" className="bg-slate-900 text-white">ACTIVE</option>
                        <option value="MAINTENANCE" className="bg-slate-900 text-white">MAINTENANCE</option>
                        <option value="RETIRED" className="bg-slate-900 text-white">RETIRED</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete court '${court.name}'?`)) {
                              deleteMutation.mutate(court.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete court"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Modal when moved to MAINTENANCE with future bookings */}
      {warningModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-white">Future Bookings Warning</h3>
                <p className="text-xs text-amber-300/90">
                  Court was moved to {warningModalData.status} but has existing active bookings!
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Court <strong className="text-white">{warningModalData.name}</strong> currently has{' '}
              <strong className="text-amber-400">{warningModalData.futureActiveBookings?.length}</strong> upcoming
              reservations. Consider notifying affected members or scheduling blackouts with cancellation.
            </p>

            <div className="max-h-40 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-2">
              {warningModalData.futureActiveBookings?.map((b) => (
                <div key={b.bookingId} className="flex justify-between items-center text-slate-400 border-b border-slate-900 pb-1">
                  <span>{b.bookingReference} ({b.userName})</span>
                  <span className="font-mono text-[11px]">{new Date(b.startTime).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setWarningModalData(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-all"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Add New Facility Court</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 font-medium">Court Name</label>
                <input
                  type="text"
                  placeholder="e.g. Badminton Court 4"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Sport</label>
                <select
                  value={formData.sportId}
                  onChange={(e) => setFormData({ ...formData, sportId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Surface</label>
                <select
                  value={formData.surface}
                  onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="SYNTHETIC">Synthetic Mat</option>
                  <option value="WOODEN">Wooden Parquet</option>
                  <option value="ACRYLIC_HARD">Acrylic Hard Court</option>
                  <option value="CLAY">Clay Court</option>
                  <option value="GLASS_BACK">Glass Back Squash</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Member Rate (₹/hr)</label>
                <input
                  type="number"
                  value={formData.hourlyRateMember}
                  onChange={(e) => setFormData({ ...formData, hourlyRateMember: parseFloat(e.target.value) })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Guest Rate (₹/hr)</label>
                <input
                  type="number"
                  value={formData.hourlyRateGuest}
                  onChange={(e) => setFormData({ ...formData, hourlyRateGuest: parseFloat(e.target.value) })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="col-span-2 flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.indoor}
                    onChange={(e) => setFormData({ ...formData, indoor: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500"
                  />
                  Indoor Facility Court
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                disabled={!formData.name}
                onClick={() => createMutation.mutate(formData)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm"
              >
                Create Court
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
