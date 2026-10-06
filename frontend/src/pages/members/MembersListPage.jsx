import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw 
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" /> Members Directory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage memberships, Junior guardian consents, access passes, and bulk Excel records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={QrCode}
            onClick={() => setQrLookupOpen(true)}
          >
            Verify Pass
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Upload}
            onClick={() => setBulkImportOpen(true)}
          >
            Bulk Import
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => setRegisterModalOpen(true)}
          >
            Register Member
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Input
              placeholder="Search by name, phone, email, or member no (fuzzy search)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              icon={Search}
            />
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
            />
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <Card className="overflow-hidden p-0 border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Member No</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-zinc-800 rounded" />
                          <div className="w-16 h-2.5 bg-zinc-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4"><div className="w-20 h-3 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="w-24 h-3 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="w-16 h-5 bg-zinc-800 rounded-full" /></td>
                    <td className="py-4 px-4"><div className="w-14 h-5 bg-zinc-800 rounded-full" /></td>
                    <td className="py-4 px-4 text-right"><div className="w-16 h-6 bg-zinc-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-zinc-600" />
                      <p className="text-sm font-medium">No members found</p>
                      <p className="text-xs text-zinc-600">Try adjusting your search query or filters.</p>
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
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/console/members/${m.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 overflow-hidden flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                            ) : (
                              m.fullName?.charAt(0) || 'M'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                              {m.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              Age {m.age || 0} {m.guardianName && `• Guardian: ${m.guardianName}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {m.memberNo}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-zinc-300 font-mono text-[11px]">{m.phone || '—'}</div>
                        <div className="text-zinc-500 text-[11px] truncate max-w-xs">{m.email || '—'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={badgeVariant} size="sm">
                          {planCode}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            icon={QrCode}
                            onClick={() => setSelectedBadgeMember(m)}
                            title="Access Pass & QR"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            icon={Eye}
                            onClick={() => navigate(`/console/members/${m.id}`)}
                            title="Member 360"
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

        {/* Pagination Bar */}
        {!loading && members.length > 0 && (
          <div className="p-3.5 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/40">
            <div>
              Showing {members.length} of {totalElements} members
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="font-mono text-zinc-300">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

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
