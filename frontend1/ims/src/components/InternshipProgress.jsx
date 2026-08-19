import { useEffect, useState } from 'react';

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
    return <div className="status-message">Loading progress...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="card-panel" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Internship Progress</h2>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', marginTop: '4px', color: '#64748b' }}>
            {completedCount} of {MILESTONES.length} milestones completed
          </p>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f766e' }}>
          {percentage}%
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', padding: '0 12px' }}>
        <div style={{ position: 'absolute', top: '20px', left: '24px', right: '24px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', top: '20px', left: '24px', height: '4px', background: '#0f766e', borderRadius: '2px', width: lineWidth }} />

        {MILESTONES.map((milestone, index) => {
          const isCompleted = steps[index];
          const isActive = index === activeIndex;

          return (
            <div key={milestone.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1, flex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted ? '#0f766e' : '#ffffff',
                  border: `3px solid ${isCompleted ? '#0f766e' : isActive ? '#0f766e' : '#cbd5e1'}`,
                  color: isCompleted ? '#ffffff' : isActive ? '#0f766e' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  boxShadow: isActive ? '0 0 0 4px rgba(15, 118, 110, 0.15)' : 'none',
                }}
              >
                {isCompleted ? (
                  <i className="fa-solid fa-check" style={{ fontSize: '0.875rem' }} />
                ) : (
                  index + 1
                )}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: isActive || isCompleted ? 600 : 400,
                  color: isCompleted || isActive ? '#0f172a' : '#64748b',
                  maxWidth: '100px',
                  lineHeight: 1.3,
                }}
              >
                {milestone.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
