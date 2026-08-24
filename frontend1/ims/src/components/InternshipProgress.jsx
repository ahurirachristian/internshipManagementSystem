import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const MILESTONES = [
  { key: 'startDate', label: 'Orientation / Start Date' },
  { key: 'logbook', label: 'Weekly Logbook Submissions' },
  { key: 'midTerm', label: 'Mid-Term Evaluation' },
  { key: 'finalReport', label: 'Final Report & Completion' },
];

export default function InternshipProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/students/me/progress', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to load progress');
        }
        const data = await response.json();
        setProgress(data);
      } catch (err) {
        setError(err.message || 'Unable to load progress.');
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const startDate = progress?.startDate ?? false;
  const diaryCount = progress?.diaryCount ?? 0;
  const midTerm = progress?.midTerm ?? diaryCount >= 5;
  const finalReport = progress?.finalReport ?? diaryCount >= 10;

  const steps = [startDate, diaryCount >= 5, midTerm, finalReport];
  const completedCount = steps.filter(Boolean).length;
  const activeIndex = steps.findIndex((step) => !step);
  const percentage = Math.round((completedCount / 4) * 100);
  const lineWidth = `${Math.min(completedCount / 3, 1) * 100}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading progress...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Internship Progress</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount} of {MILESTONES.length} milestones completed
          </p>
        </div>
        <div className="text-2xl font-bold text-teal-700">
          {percentage}%
        </div>
      </div>

      <div className="relative px-3 pt-2">
        <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 rounded-full" />
        <div
          className="absolute top-5 left-6 h-1 bg-teal-700 rounded-full transition-all duration-500"
          style={{ width: lineWidth }}
        />

        <div className="flex items-start justify-between relative z-10">
          {MILESTONES.map((milestone, index) => {
            const isCompleted = steps[index];
            const isActive = index === activeIndex;

            return (
              <div key={milestone.key} className="flex flex-col items-center gap-2.5 relative flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-[3px] transition-all ${
                    isCompleted
                      ? 'bg-teal-700 text-white border-teal-700'
                      : isActive
                        ? 'bg-white text-teal-700 border-teal-700 ring-4 ring-teal-700/15'
                        : 'bg-white text-slate-500 border-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div
                  className={`text-center text-[11px] max-w-[100px] leading-tight ${
                    isActive || isCompleted ? 'font-semibold text-slate-900' : 'font-normal text-slate-500'
                  }`}
                >
                  {milestone.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
