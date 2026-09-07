import { useEffect, useState } from 'react';
import { fetchMyUniversitySupervisor } from '../../services/api';

export default function UniversitySupervisorSection() {
  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMyUniversitySupervisor();
        setSupervisor(data);
      } catch (err) {
        if (err.status !== 204) {
          setError(err.message || 'Unable to load university supervisor details.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="status-message">Loading university supervisor...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!supervisor) {
    return (
      <div className="card-panel">
        <h2>University Supervisor</h2>
        <p>No university supervisor assigned yet.</p>
      </div>
    );
  }

  const details = [
    ['Full Name', `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim()],
    ['Department', supervisor.department],
    ['Phone Number', supervisor.phoneNumber],
    ['University', supervisor.universityName],
  ];

  return (
    <div className="card-panel">
      <h2>University Supervisor</h2>
      <p>Your assigned university supervisor details.</p>
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
