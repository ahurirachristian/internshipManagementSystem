import { useEffect, useState } from 'react';
import { fetchMyLearningInstitute } from '../../services/api';

export default function LearningInstituteSection() {
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMyLearningInstitute();
        setInstitute(data);
      } catch (err) {
        if (err.status !== 204) {
          setError(err.message || 'Unable to load learning institute.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="status-message">Loading learning institute...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!institute) {
    return (
      <div className="card-panel">
        <h2>Learning Institute</h2>
        <p>No learning institute assigned to your profile yet.</p>
      </div>
    );
  }

  const details = [
    ['Name', institute.name],
    ['Code', institute.code],
    ['Email', institute.email],
    ['Location', institute.location],
  ];

  return (
    <div className="card-panel">
      <h2>Learning Institute</h2>
      <p>Your assigned learning institute details.</p>
      <div className="detail-grid">
        {details.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <span className="detail-label">{label}</span>
            <span className="detail-value">{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
