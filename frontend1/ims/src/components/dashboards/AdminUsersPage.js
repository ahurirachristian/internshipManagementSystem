import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../services/api';
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  UserCircle,
} from 'lucide-react';
import CustomSelect from '../CustomSelect';

const ROLES = ['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN'];

const ROLE_BADGE_STYLES = {
  ADMIN: 'bg-teal-50 text-teal-700 border border-teal-200',
  STUDENT: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUPERVISOR: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPANY: 'bg-amber-50 text-amber-700 border border-amber-200',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addForm, setAddForm] = useState({ username: '', role: 'STUDENT' });
  const [addLoading, setAddLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'STUDENT' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
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

  function openEdit(user) {
    setEditing(user);
    setEditForm({ username: user.username, role: user.role });
  }

  async function handleAddSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setAddLoading(true);
    try {
      await createUser({ username: addForm.username.trim(), role: addForm.role });
      setAddForm({ username: '', role: 'STUDENT' });
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

  async function refreshUsers() {
    setUsers(await fetchUsers());
  }

  return (
    <DashboardLayout title="User Management" subtitle="Welcome,">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Notice Banner */}
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading users...</span>
          </div>
        )}

        {/* Add User Form */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add User</h3>
              <p className="text-[11px] text-slate-500">Create a new account. Default password is the username followed by 123.</p>
            </div>
          </div>
          <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label htmlFor="add-username" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Username
              </label>
              <input
                id="add-username"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                required
                className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              />
            </div>
            <div className="flex-1 w-full sm:w-48">
              <label htmlFor="add-role" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Role
              </label>
              <CustomSelect
                id="add-role"
                value={addForm.role}
                onChange={(value) => setAddForm({ ...addForm, role: value })}
                options={ROLES.map((role) => ({ value: role, label: role }))}
              />
            </div>
            <button
              type="submit"
              disabled={addLoading}
              className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {addLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </section>

        {/* Users Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }} aria-label="Users list">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                  <th scope="col" className="py-3.5 px-3 pl-5">ID</th>
                  <th scope="col" className="py-3.5 px-3">Username</th>
                  <th scope="col" className="py-3.5 px-3">Role</th>
                  <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 pl-5 text-xs text-slate-500 font-mono">{user.id}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                            <Users className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_BADGE_STYLES[user.role] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 pr-5 text-right">
                        <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                          <li>
                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                              aria-label="Edit user"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                              aria-label="Delete user"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        </ul>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No users found</h3>
                        <p className="text-xs text-slate-500 mt-1">No users have been registered yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Edit Modal */}
        {editing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setEditing(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 id="edit-user-modal-title" className="text-base font-bold text-slate-900">Edit User</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                <div>
                  <label htmlFor="edit-username" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Username
                  </label>
                  <input
                    id="edit-username"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                    className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Role
                  </label>
                  <CustomSelect
                    id="edit-role"
                    value={editForm.role}
                    onChange={(value) => setEditForm({ ...editForm, role: value })}
                    options={ROLES.map((role) => ({ value: role, label: role }))}
                  />
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
