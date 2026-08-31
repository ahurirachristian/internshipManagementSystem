import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../services/api';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import CustomSelect from '../CustomSelect';
import { TableCard } from '../ui/TableCard';
import { FilterTabs } from '../ui/FilterTabs';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

const ROLES = ['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN'];

const ROLE_BADGE_STYLES = {
  ADMIN: 'bg-teal-50 text-teal-700 border border-teal-200',
  STUDENT: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUPERVISOR: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPANY: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const initialForm = { username: '', role: 'STUDENT' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeRole, setActiveRole] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(initialForm);
  const [addLoading, setAddLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((data) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load users.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleTabs = [
    { id: 'All', label: 'All Users', count: users.length },
    ...ROLES.map((role) => ({
      id: role,
      label: role,
      count: users.filter((u) => u.role === role).length,
    })),
  ];

  const filteredUsers = users.filter((user) => {
    const matchRole = activeRole === 'All' || user.role === activeRole;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      (user.username || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  function openEdit(user) {
    setEditing(user);
    setEditForm({ username: user.username, role: user.role });
  }

  async function refreshUsers() {
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to refresh users.');
    }
  }

  async function handleAddSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setAddLoading(true);
    try {
      await createUser({ username: addForm.username.trim(), role: addForm.role });
      setAddForm(initialForm);
      setIsAddModalOpen(false);
      setNotice('User created successfully.');
      await refreshUsers();
    } catch (err) {
      setError(err.message || 'Unable to create user.');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setEditLoading(true);
    try {
      await updateUser(editing.id, {
        username: editForm.username.trim(),
        role: editForm.role,
      });
      setEditing(null);
      setNotice('User updated successfully.');
      await refreshUsers();
    } catch (err) {
      setError(err.message || 'Unable to update user.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user?')) return;
    setError('');
    setNotice('');
    try {
      await deleteUser(id);
      setNotice('User deleted successfully.');
      await refreshUsers();
    } catch (err) {
      setError(err.message || 'Unable to delete user.');
    }
  }

  return (
    <DashboardLayout title="User Management" subtitle="Welcome,">
      <div className="space-y-6 max-w-7xl mx-auto">
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading users...</span>
          </div>
        )}

        <TableCard
          title="User Directory & RBAC Permissions"
          subtitle="Role-based access matrix and user lifecycle management"
          icon={Users}
          actions={
            <>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-95 text-white transition-opacity shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </>
          }
        >
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-slate-900/40">
            <FilterTabs
              tabs={roleTabs}
              activeTab={activeRole}
              onChange={setActiveRole}
            />
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search username or role..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.username} size="sm" />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">
                            {user.username}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono block truncate">
                            ID: {user.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE_STYLES[user.role] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                      >
                        <Shield className="w-3 h-3 shrink-0" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
                          aria-label="Edit user"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition-colors"
                          aria-label="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-0">
                    <EmptyState
                      title="No users found"
                      description={`No users found${activeRole !== 'All' ? ` with role "${activeRole}"` : ''}${searchTerm ? ` matching "${searchTerm}"` : ''}.`}
                      actionLabel={activeRole !== 'All' || searchTerm ? 'Clear Filter' : undefined}
                      onAction={() => {
                        setActiveRole('All');
                        setSearchTerm('');
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Total: <strong className="text-slate-700 dark:text-slate-200">{filteredUsers.length}</strong> accounts
            </span>
          </div>
        </TableCard>

        {/* Add User Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New User"
          subtitle="Create a new account. Default password is the username followed by 123."
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={addLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-95 text-white shadow-xs disabled:opacity-50"
              >
                {addLoading ? 'Creating...' : 'Create User'}
              </button>
            </>
          }
        >
          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="add-username" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                id="add-username"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                placeholder="e.g. j.doe"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label htmlFor="add-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System Role
              </label>
              <CustomSelect
                id="add-role"
                value={addForm.role}
                onChange={(value) => setAddForm({ ...addForm, role: value })}
                options={ROLES.map((role) => ({ value: role, label: role }))}
              />
            </div>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          title={`Edit User — ${editing?.username || ''}`}
          subtitle="Update role and account details"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-95 text-white shadow-xs disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="edit-username" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System Role
              </label>
              <CustomSelect
                id="edit-role"
                value={editForm.role}
                onChange={(value) => setEditForm({ ...editForm, role: value })}
                options={ROLES.map((role) => ({ value: role, label: role }))}
              />
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
