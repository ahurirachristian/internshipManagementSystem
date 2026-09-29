import { useEffect, useState } from 'react';
import { fetchMyLearningInstitute } from '../../services/api';

export default function LearningInstituteSection() {
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstitute();
  }, []);

  async function loadInstitute() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyLearningInstitute();
      setInstitute(data);
    } catch (err) {
      setError(err.message || 'Unable to load learning institute.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading learning institute...</span>
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

  if (!institute) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Learning Institute</h2>
        <p className="text-sm text-slate-500">No learning institute assigned yet.</p>
      </div>
    );
  }

  const details = [
    ['Name', institute.name],
    ['Short Form', institute.shortForm],
    ['Full Name', institute.fullName],
    ['Email', institute.email],
    ['Phone', institute.phone],
    ['Address', institute.address],
    ['Website', institute.website],
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Learning Institute</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Your assigned learning institution details.</p>
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
