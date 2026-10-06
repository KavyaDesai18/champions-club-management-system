import React, { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle,
  Edit2,
  Lock,
  LogOut,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient, { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../../components/ui/Modal';
import Dropdown, { DropdownDivider, DropdownItem } from '../../components/ui/Dropdown';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'MEMBER',
  });
  const [editForm, setEditForm] = useState({ fullName: '', phone: '' });
  const [newRole, setNewRole] = useState('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = currentUser?.role === 'OWNER';

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;

      const res = await apiClient.get('/users', { params });
      setUsers(res.data?.content || []);
    } catch {
      // Mock / fallback if backend is offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', createForm);
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'User Created',
        message: `Account for ${createForm.fullName} has been created successfully.`,
      });
      setCreateModalOpen(false);
      setCreateForm({ fullName: '', email: '', password: '', phone: '', role: 'MEMBER' });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user.';
      emitToast({ id: Date.now(), type: 'error', title: 'Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/users/${selectedUser.id}`, editForm);
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Profile Updated',
        message: `Profile for ${editForm.fullName} has been updated.`,
      });
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user profile.';
      emitToast({ id: Date.now(), type: 'error', title: 'Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/users/${selectedUser.id}/role`, { role: newRole });
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Role Updated',
        message: `${selectedUser.fullName}'s role has been changed to ${newRole}.`,
      });
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user role.';
      emitToast({ id: Date.now(), type: 'error', title: 'Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const targetStatus = selectedUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await apiClient.patch(`/users/${selectedUser.id}/status`, { status: targetStatus });
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Status Updated',
        message: `Account for ${selectedUser.fullName} is now ${targetStatus}.`,
      });
      setStatusConfirmOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update account status.';
      emitToast({ id: Date.now(), type: 'error', title: 'Action Prohibited', message: msg });
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUser) return;
    try {
      await apiClient.post(`/users/${selectedUser.id}/logout`);
      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Sessions Terminated',
        message: `Forced logout applied to ${selectedUser.fullName}.`,
      });
      setLogoutConfirmOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to force logout.';
      emitToast({ id: Date.now(), type: 'error', title: 'Error', message: msg });
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'OWNER':
        return 'gold';
      case 'MANAGER':
        return 'indigo';
      case 'FRONT_DESK':
      case 'SHOP_STAFF':
      case 'BAR_STAFF':
      case 'KITCHEN':
      case 'COACH':
        return 'silver';
      case 'MEMBER':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Member / Staff',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-white text-sm">{row.fullName}</div>
          <div className="text-xs text-slate-400">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role Assignment',
      sortable: true,
      render: (role) => (
        <Badge variant={getRoleBadgeVariant(role)} dot>
          {role}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <Badge variant={status === 'ACTIVE' ? 'success' : 'danger'}>
          {status}
        </Badge>
      ),
    },
    {
      key: 'phone',
      label: 'Phone Contact',
      render: (phone) => <span className="text-xs text-slate-300 font-mono">{phone || '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Dropdown
          trigger={
            <button
              type="button"
              className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              aria-label={`Actions for ${row.fullName}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          }
        >
          <DropdownItem
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => {
              setSelectedUser(row);
              setEditForm({ fullName: row.fullName, phone: row.phone || '' });
              setEditModalOpen(true);
            }}
          >
            Edit Profile
          </DropdownItem>

          {isOwner && (
            <DropdownItem
              icon={<Shield className="w-4 h-4" />}
              onClick={() => {
                setSelectedUser(row);
                setNewRole(row.role);
                setRoleModalOpen(true);
              }}
            >
              Change Role
            </DropdownItem>
          )}

          <DropdownItem
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              setSelectedUser(row);
              setLogoutConfirmOpen(true);
            }}
          >
            Force Logout
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem
            danger={row.status === 'ACTIVE'}
            icon={row.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            onClick={() => {
              setSelectedUser(row);
              setStatusConfirmOpen(true);
            }}
          >
            {row.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" /> User & Role Management
          </h1>
          <p className="text-xs text-slate-400">
            Control club access, assign security privileges, and manage member credentials
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            startIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            startIcon={<Plus className="w-4 h-4" />}
            id="create-user-btn"
          >
            New User
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card border-slate-800">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                placeholder="Search by full name or email address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { label: 'All Roles', value: '' },
                  { label: 'Owner', value: 'OWNER' },
                  { label: 'Manager', value: 'MANAGER' },
                  { label: 'Front Desk', value: 'FRONT_DESK' },
                  { label: 'Coach', value: 'COACH' },
                  { label: 'Member', value: 'MEMBER' },
                ]}
              />
            </div>

            <Button type="submit" variant="secondary" size="md" className="w-full sm:w-auto">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card border-slate-800 overflow-hidden">
        <Table
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyTitle="No Club Users Found"
          emptyMessage="No user accounts matched your search criteria."
        />
      </Card>

      {/* 1. Modal: Create User */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} size="md">
        <ModalHeader title="Create Club Account" description="Register a new staff member or club athlete" />
        <form onSubmit={handleCreateUser}>
          <ModalBody className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Maria Sharapova"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. maria@championsclub.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
            <Input
              label="Temporary Password"
              type="password"
              placeholder="Min 8 chars with letters & numbers"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              helperText="Must comply with security policy (minimum 8 characters with letters & numbers)"
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
            <Select
              label="Role Privilege"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              options={
                isOwner
                  ? [
                      { label: 'Club Owner', value: 'OWNER' },
                      { label: 'General Manager', value: 'MANAGER' },
                      { label: 'Front Desk Attendant', value: 'FRONT_DESK' },
                      { label: 'Pro Shop Staff', value: 'SHOP_STAFF' },
                      { label: 'Lounge & Bar Staff', value: 'BAR_STAFF' },
                      { label: 'Kitchen KDS Staff', value: 'KITCHEN' },
                      { label: 'Certified Coach', value: 'COACH' },
                      { label: 'Club Member', value: 'MEMBER' },
                    ]
                  : [
                      { label: 'Front Desk Attendant', value: 'FRONT_DESK' },
                      { label: 'Pro Shop Staff', value: 'SHOP_STAFF' },
                      { label: 'Lounge & Bar Staff', value: 'BAR_STAFF' },
                      { label: 'Kitchen KDS Staff', value: 'KITCHEN' },
                      { label: 'Certified Coach', value: 'COACH' },
                      { label: 'Club Member', value: 'MEMBER' },
                    ]
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create User
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 2. Modal: Edit User */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="md">
        <ModalHeader title="Edit Profile Details" description={`Update personal data for ${selectedUser?.fullName}`} />
        <form onSubmit={handleEditUser}>
          <ModalBody className="space-y-4">
            <Input
              label="Full Name"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 3. Modal: Change Role (Owner Only) */}
      <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} size="sm">
        <ModalHeader title="Reassign Security Role" description={`Assign new permissions to ${selectedUser?.fullName}`} />
        <form onSubmit={handleRoleChange}>
          <ModalBody className="space-y-4">
            <Select
              label="New Role Assignment"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              options={[
                { label: 'Club Owner', value: 'OWNER' },
                { label: 'General Manager', value: 'MANAGER' },
                { label: 'Front Desk Staff', value: 'FRONT_DESK' },
                { label: 'Pro Shop Staff', value: 'SHOP_STAFF' },
                { label: 'Bar & Lounge Staff', value: 'BAR_STAFF' },
                { label: 'Kitchen Queue Staff', value: 'KITCHEN' },
                { label: 'Certified Coach', value: 'COACH' },
                { label: 'Club Member', value: 'MEMBER' },
              ]}
            />
            <p className="text-xs text-amber-400">
              Note: Changing a role takes effect immediately and revokes active sessions for this user.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Update Role
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 4. Confirm Dialog: Enable/Disable */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        variant={selectedUser?.status === 'ACTIVE' ? 'danger' : 'primary'}
        title={selectedUser?.status === 'ACTIVE' ? 'Disable User Account?' : 'Activate User Account?'}
        description={
          selectedUser?.status === 'ACTIVE'
            ? `Disabling ${selectedUser?.fullName} will immediately revoke their access tokens and prevent further club log-ins.`
            : `Re-activating ${selectedUser?.fullName} will allow them to authenticate with their existing credentials.`
        }
        confirmText={selectedUser?.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
      />

      {/* 5. Confirm Dialog: Force Logout */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleForceLogout}
        variant="danger"
        title="Force Logout Across All Devices?"
        description={`This action will increment token version for ${selectedUser?.fullName} and terminate all active desktop and mobile sessions.`}
        confirmText="Terminate Sessions"
      />
    </div>
  );
};

export default UserManagementPage;
