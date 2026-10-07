import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { membershipsApi } from '../../api/membershipsApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';
import RenewMembershipModal from '../../components/membership/RenewMembershipModal';

export const ExpiringMembershipsPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daysWindow, setDaysWindow] = useState(30); // 7, 30, 0 (expired), null (all)
  const [selectedTier, setSelectedTier] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState(null);
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  useEffect(() => {
    loadMemberships();
  }, [daysWindow, selectedTier]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      const params = {
        daysWindow: daysWindow === null ? undefined : daysWindow,
        planCode: selectedTier || undefined,
        search: search.trim() || undefined,
        page: 0,
        size: 50,
      };
      const res = await membershipsApi.getExpiringMemberships(params);
      const items = res?.content || res?.data?.content || res?.data || (Array.isArray(res) ? res : []);
      setData(items);
    } catch (err) {
      console.error('Failed to load expiring memberships', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (item) => {
    try {
      await membershipsApi.sendManualReminder(item.memberId);
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Reminder Dispatched',
        message: `Sent expiry reminder to ${item.fullName} (${item.memberNo}).`,
      });
    } catch (err) {
      emitToast({
        id: Date.now(),
        type: 'error',
        title: 'Dispatch Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMemberships();
  };

  const openRenew = (item) => {
    setSelectedMemberForRenew({
      id: item.memberId,
      memberNo: item.memberNo,
      fullName: item.fullName,
      endDate: item.endDate,
      plan: { code: item.planCode, name: item.planName },
    });
    setRenewModalOpen(true);
  };

  // Quick stats
  const expiredCount = data.filter((m) => m.daysLeft === 0 || m.status === 'EXPIRED').length;
  const under7DaysCount = data.filter((m) => m.daysLeft > 0 && m.daysLeft <= 7).length;
  const under30DaysCount = data.filter((m) => m.daysLeft > 7 && m.daysLeft <= 30).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
            <Clock className="w-3.5 h-3.5" /> Retention & Renewal Command
          </div>
          <h2 className="text-2xl font-black text-white">Expiring Memberships Roster</h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor members approaching expiry, trigger instant multi-channel reminders, and process rapid front-desk renewals.
          </p>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadMemberships}>
          Refresh Roster
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setDaysWindow(7)}
          className={`cursor-pointer glass-card rounded-2xl p-5 border transition ${
            daysWindow === 7 ? 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-400' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-2">
            <span>Expiring in 7 Days</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-white">{under7DaysCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Urgent follow-up required</p>
        </div>

        <div
          onClick={() => setDaysWindow(30)}
          className={`cursor-pointer glass-card rounded-2xl p-5 border transition ${
            daysWindow === 30 ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2">
            <span>Expiring in 30 Days</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-white">{under30DaysCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">First reminder milestone queue</p>
        </div>

        <div
          onClick={() => setDaysWindow(0)}
          className={`cursor-pointer glass-card rounded-2xl p-5 border transition ${
            daysWindow === 0 ? 'border-rose-500/60 bg-rose-950/20 ring-1 ring-rose-400' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-2">
            <span>Expired Members</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-white">{expiredCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Court privileges paused</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card rounded-2xl p-4 border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 outline-none focus:border-amber-400 transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Expiry Window Pills */}
          <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { label: 'All Windows', val: null },
              { label: '< 7d', val: 7 },
              { label: '< 30d', val: 30 },
              { label: 'Expired', val: 0 },
            ].map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setDaysWindow(pill.val)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                  daysWindow === pill.val
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Plan Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-surface-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-amber-400"
          >
            <option value="">All Plan Tiers</option>
            <option value="GOLD">Gold Tier VIP</option>
            <option value="SILVER">Silver Standard</option>
            <option value="JUNIOR">Junior Cadet</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="glass-card rounded-3xl p-6 border-slate-800/80 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="pb-3">Member ID</th>
                <th className="pb-3">Athlete</th>
                <th className="pb-3">Tier</th>
                <th className="pb-3">Expiry Date</th>
                <th className="pb-3">Countdown</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 animate-pulse">
                    Loading expiring memberships...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No memberships found matching the selected filters.
                  </td>
                </tr>
              ) : (
                data.map((m) => {
                  const isExp = m.daysLeft === 0 || m.status === 'EXPIRED';
                  const isUrgent = m.daysLeft > 0 && m.daysLeft <= 7;

                  return (
                    <tr key={m.id || m.membershipId || m.memberId || m.memberNo} className="text-slate-300 hover:bg-slate-900/40 transition">
                      <td className="py-3.5 font-mono font-bold text-cyan-400">
                        {m.memberNo}
                      </td>
                      <td className="py-3.5 font-semibold text-white">
                        <Link to={`/console/members/${m.memberId}`} className="hover:text-amber-400 transition">
                          {m.fullName}
                        </Link>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            m.planCode === 'GOLD'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : m.planCode === 'SILVER'
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {m.planCode}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono">{m.endDate}</td>
                      <td className="py-3.5">
                        {isExp ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                            EXPIRED
                          </span>
                        ) : isUrgent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {m.daysLeft} Days Left
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            {m.daysLeft} Days Left
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        <div>{m.phone}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{m.email}</div>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSendReminder(m)}
                          className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-amber-400 text-[11px] font-semibold transition"
                          title="Dispatch Email & SMS reminder"
                        >
                          <Bell className="w-3 h-3 inline mr-1 text-amber-400" />
                          Remind
                        </button>

                        <button
                          type="button"
                          onClick={() => openRenew(m)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-surface-950 font-bold hover:bg-amber-400 text-[11px] transition shadow-glow"
                        >
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Renew
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {selectedMemberForRenew && (
        <RenewMembershipModal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          member={selectedMemberForRenew}
          onSuccess={() => {
            loadMemberships();
          }}
        />
      )}
    </div>
  );
};

export default ExpiringMembershipsPage;
