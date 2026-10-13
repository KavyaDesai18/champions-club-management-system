import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Upload, 
  QrCode, 
  Search, 
  Filter, 
  ChevronRight, 
  ShieldCheck, 
  Calendar, 
  Phone, 
  Eye, 
  RefreshCw,
  X,
  Keyboard,
  Sparkles
} from 'lucide-react';
import { membersApi, plansApi } from '../../api/membersApi';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import RegisterMemberModal from './RegisterMemberModal';
import BulkImportModal from './BulkImportModal';
import QrBadgeModal from './QrBadgeModal';
import QrLookupModal from './QrLookupModal';

export default function MembersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const searchInputRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || '');
  const [plans, setPlans] = useState([]);

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [qrLookupOpen, setQrLookupOpen] = useState(false);
  const [selectedBadgeMember, setSelectedBadgeMember] = useState(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setRegisterModalOpen(true);
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setQrLookupOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, planFilter, page]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await plansApi.getAllPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        size: 15,
      };
      if (query.trim()) params.query = query.trim();
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.planCode = planFilter;

      const res = await membersApi.searchMembers(params);
      if (res.success && res.data) {
        setMembers(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error searching members',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSuccess = (res) => {
    fetchMembers();
    const member = res?.data || res;
    if (member?.id) {
      navigate(`/console/members/${member.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-black uppercase tracking-wider border border-optic-500/30 mb-2">
            <Users className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400" />
            <span>Staff Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            Members Directory
          </h1>
          <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
            Manage memberships, Junior guardian consents, access passes, and bulk records.
          </p>
        </div>

        {/* Action Buttons & Keyboard Hints */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={QrCode}
            onClick={() => setQrLookupOpen(true)}
            className="border-court-200 dark:border-court-700 font-heading font-bold uppercase tracking-wider"
          >
            Verify Pass <kbd className="hidden md:inline ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">V</kbd>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Upload}
            onClick={() => setBulkImportOpen(true)}
            className="border-court-200 dark:border-court-700 font-heading font-bold uppercase tracking-wider"
          >
            Bulk Import
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => setRegisterModalOpen(true)}
            className="font-heading font-black uppercase tracking-wider"
          >
            Register Member <kbd className="hidden md:inline ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-court-950/20 text-court-950">N</kbd>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="court-card p-4 rounded-xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Input
              ref={searchInputRef}
              placeholder="Search by name, phone, email, or member no (fuzzy search)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              icon={Search}
              className="bg-court-50 dark:bg-court-950 border-court-200 dark:border-court-700"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-court-400 hover:text-court-700 dark:hover:text-court-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              className="bg-court-50 dark:bg-court-950 border-court-200 dark:border-court-700"
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(0);
              }}
              options={[
                { value: '', label: 'All Plans' },
                ...plans.map((p) => ({ value: p.code, label: p.name })),
              ]}
              className="bg-court-50 dark:bg-court-950 border-court-200 dark:border-court-700"
            />
          </div>
        </div>
      </div>

      {/* Dense, Scannable Members Data Grid */}
      <div className="court-card overflow-hidden p-0 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950/80 text-court-500 font-heading font-black uppercase tracking-wider text-[11px] h-10">
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4 font-mono">Member No</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Plan Tier</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-court-100 dark:divide-court-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse h-11">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-court-200 dark:bg-court-800" />
                        <div className="space-y-1">
                          <div className="w-28 h-3 bg-court-200 dark:bg-court-800 rounded" />
                          <div className="w-16 h-2 bg-court-200 dark:bg-court-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4"><div className="w-20 h-3 bg-court-200 dark:bg-court-800 rounded" /></td>
                    <td className="py-2 px-4"><div className="w-24 h-3 bg-court-200 dark:bg-court-800 rounded" /></td>
                    <td className="py-2 px-4"><div className="w-16 h-5 bg-court-200 dark:bg-court-800 rounded-full" /></td>
                    <td className="py-2 px-4"><div className="w-14 h-5 bg-court-200 dark:bg-court-800 rounded-full" /></td>
                    <td className="py-2 px-4 text-right"><div className="w-16 h-6 bg-court-200 dark:bg-court-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-court-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-court-300 dark:text-court-600" />
                      <p className="text-sm font-heading font-bold uppercase text-court-700 dark:text-court-300">
                        No members found
                      </p>
                      <p className="text-xs text-court-400">
                        Try adjusting your search query or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const planCode = m.planCode || m.plan?.code || 'MEMBER';
                  const badgeVariant =
                    planCode === 'GOLD' ? 'warning' :
                    planCode === 'SILVER' ? 'default' : 'success';

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-court-50 dark:hover:bg-court-800/40 transition-colors cursor-pointer group h-11"
                      onClick={() => navigate(`/console/members/${m.id}`)}
                    >
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700 overflow-hidden flex items-center justify-center font-heading font-black text-xs text-court-700 dark:text-court-300 shrink-0">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                            ) : (
                              m.fullName?.charAt(0) || 'M'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-heading font-bold text-court-950 dark:text-white group-hover:text-optic-600 dark:group-hover:text-optic-400 transition-colors truncate uppercase text-xs">
                              {m.fullName}
                            </div>
                            <div className="text-[10px] text-court-500 truncate font-sans">
                              Age {m.age || 0} {m.guardianName && `• Guardian: ${m.guardianName}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-4 font-mono font-bold text-optic-700 dark:text-optic-400 tabular-nums">
                        {m.memberNo}
                      </td>

                      <td className="py-2 px-4">
                        <div className="text-court-800 dark:text-court-200 font-mono text-[11px] tabular-nums">
                          {m.phone || '—'}
                        </div>
                        <div className="text-court-500 text-[10px] truncate max-w-xs font-sans">
                          {m.email || '—'}
                        </div>
                      </td>

                      <td className="py-2 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider ${
                          planCode === 'GOLD'
                            ? 'bg-optic-500/15 text-optic-700 dark:text-optic-400 border border-optic-500/30'
                            : planCode === 'SILVER'
                            ? 'bg-clay-500/15 text-clay-700 dark:text-clay-400 border border-clay-500/30'
                            : 'bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30'
                        }`}>
                          {planCode}
                        </span>
                      </td>

                      <td className="py-2 px-4">
                        <Badge
                          variant={
                            m.status === 'ACTIVE' ? 'success' :
                            m.status === 'SUSPENDED' ? 'danger' : 'default'
                          }
                          size="sm"
                        >
                          {m.status}
                        </Badge>
                      </td>

                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            icon={QrCode}
                            onClick={() => setSelectedBadgeMember(m)}
                            title="Access Pass & QR"
                            className="p-1.5 h-7 w-7 text-court-500 hover:text-court-950 dark:hover:text-white"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            icon={Eye}
                            onClick={() => navigate(`/console/members/${m.id}`)}
                            title="Member 360"
                            className="p-1.5 h-7 w-7 text-court-500 hover:text-court-950 dark:hover:text-white"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dense Pagination Bar */}
        {!loading && members.length > 0 && (
          <div className="p-3 border-t border-court-200 dark:border-court-800 flex items-center justify-between text-xs text-court-500 bg-court-50 dark:bg-court-950/60 font-sans">
            <div className="font-mono tabular-nums">
              Showing {members.length} of {totalElements} members
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 text-xs border-court-200 dark:border-court-700"
              >
                Previous
              </Button>
              <span className="font-mono text-court-700 dark:text-court-300 tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs border-court-200 dark:border-court-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RegisterMemberModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={fetchMembers}
      />

      <QrLookupModal
        isOpen={qrLookupOpen}
        onClose={() => setQrLookupOpen(false)}
      />

      {selectedBadgeMember && (
        <QrBadgeModal
          isOpen={!!selectedBadgeMember}
          onClose={() => setSelectedBadgeMember(null)}
          member={selectedBadgeMember}
        />
      )}
    </div>
  );
}
