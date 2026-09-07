import { useEffect, useState } from 'react';
import { fetchMyIndustrialSupervisor } from '../../services/api';

export default function IndustrialSupervisorSection() {
  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMyIndustrialSupervisor();
        setSupervisor(data);
      } catch (err) {
        if (err.status !== 204) {
          setError(err.message || 'Unable to load industrial supervisor details.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="status-message">Loading industrial supervisor...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!supervisor) {
    return (
      <div className="card-panel">
        <h2>Industrial Supervisor</h2>
        <p>No industrial supervisor assigned yet.</p>
      </div>
    );
  }

  const details = [
    ['Full Name', `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim()],
    ['Job Title', supervisor.jobTitle],
    ['Department', supervisor.department],
    ['Phone Number', supervisor.phoneNumber],
    ['Company', supervisor.companyName],
  ];

  return (
    <div className="card-panel">
      <h2>Industrial Supervisor</h2>
      <p>Your assigned industrial supervisor details.</p>
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
