import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import {
  assignUniversityUserRole,
  createUniversityPerson,
  fetchUniversityPeople,
  resetUserPassword,
  setUniversityUserEnabled,
} from '../../services/api';

export default function UniversityPeoplePage() {
  const [people, setPeople] = useState([]);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchUniversityPeople()
      .then((list) => setPeople(Array.isArray(list) ? list : []))
      .catch((err) => setError(err.message || 'Unable to load people.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await createUniversityPerson({ username: username.trim(), role });
      setNotice(`Created ${username.trim()} with the temporary password ${username.trim()}123.`);
      setUsername('');
      load();
    } catch (err) {
      setError(err.message || 'Unable to create the account.');
    }
  }

  async function handleRole(person, nextRole) {
    setError('');
    try {
      await assignUniversityUserRole(person.id, nextRole);
      setNotice(`${person.username} is now ${nextRole}.`);
      load();
    } catch (err) {
      setError(err.message || 'Unable to change the role.');
    }
  }

  async function handleToggle(person) {
    setError('');
    try {
      await setUniversityUserEnabled(person.id, !person.enabled);
      load();
    } catch (err) {
      setError(err.message || 'Unable to change account status.');
    }
  }

  async function handleReset(person) {
    if (!window.confirm(`Reset the password for ${person.username}?`)) return;
    setError('');
    try {
      const { tempPassword } = await resetUserPassword(person.id);
      window.prompt('Temporary password (shown once):', tempPassword);
    } catch (err) {
      setError(err.message || 'Unable to reset the password.');
    }
  }

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 focus:border-primary focus:outline-none transition-all font-medium';

  return (
    <DashboardLayout title="People" subtitle="Manage students and supervisors of your university" searchable={false}>
      <div className="space-y-5">
        {notice && <div className="alert alert-success show">{notice}</div>}
        {error && <div className="alert alert-error show">{error}</div>}

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Create a person</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className={inputClass}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="STUDENT">STUDENT</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
            </select>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
              Create
            </button>
          </form>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            New accounts use the temporary password <code>username123</code> and must change it at first sign-in.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">My university</h2>
          </div>
          {loading ? (
            <p className="p-5 text-xs text-slate-500">Loading people...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {people.map((person) => (
                    <tr key={person.id}>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{person.username}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{person.role}</td>
                      <td className="px-4 py-3">
                        <span className={person.enabled ? 'text-emerald-600' : 'text-rose-600'}>
                          {person.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-1.5">
                        {person.role === 'STUDENT' && (
                          <button type="button" className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                            onClick={() => handleRole(person, 'SUPERVISOR')}>
                            Make supervisor
                          </button>
                        )}
                        {person.role === 'SUPERVISOR' && (
                          <button type="button" className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                            onClick={() => handleRole(person, 'STUDENT')}>
                            Make student
                          </button>
                        )}
                        <button type="button" className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                          onClick={() => handleToggle(person)}>
                          {person.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="px-2 py-1 rounded-lg border border-amber-200 text-amber-700"
                          onClick={() => handleReset(person)}>
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500">No people found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
