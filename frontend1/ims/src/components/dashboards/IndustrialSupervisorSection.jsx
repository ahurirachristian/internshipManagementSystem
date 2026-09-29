import { useEffect, useState } from 'react';
import { fetchMyIndustrialSupervisor } from '../../services/api';

export default function IndustrialSupervisorSection() {
  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSupervisor();
  }, []);

  async function loadSupervisor() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyIndustrialSupervisor();
      setSupervisor(data);
    } catch (err) {
      setError(err.message || 'Unable to load industrial supervisor.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading industrial supervisor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (!supervisor) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Industrial Supervisor</h2>
        <p className="text-sm text-slate-500">No industrial supervisor assigned yet.</p>
      </div>
    );
  }

  const details = [
    ['Name', `${supervisor.firstName || ''} ${supervisor.lastName || ''}`],
    ['Email', supervisor.email],
    ['Phone', supervisor.phoneNumber],
    ['Department', supervisor.department],
    ['Company', supervisor.companyName],
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Industrial Supervisor</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Your assigned industrial supervisor details.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {details.map(([label, value]) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{label}</span>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{value || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
