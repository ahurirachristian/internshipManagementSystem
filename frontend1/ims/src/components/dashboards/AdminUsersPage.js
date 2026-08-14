import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../services/api';

const ROLES = ['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN'];

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
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading users...</div>}

      <div className="card-panel">
        <h2>Add User</h2>
        <p>Create a new account. Default password is the username followed by 123.</p>
        <form onSubmit={handleAddSubmit} className="modal-form">
          <label>
            Username
            <input
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
            />
          </label>
          <label>
            Role
            <select
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="submit" className="primary-button" disabled={addLoading}>
              {addLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>
                    <button className="icon-button edit" onClick={() => openEdit(user)}>
                      Edit
                    </button>
                    <button className="icon-button delete" onClick={() => handleDelete(user.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-row">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-button" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <label>
                Username
                <input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
