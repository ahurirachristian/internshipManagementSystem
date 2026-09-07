import { useEffect, useState } from 'react';
import { fetchMyCompany } from '../../services/api';

export default function CompaniesSection() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMyCompany();
        setCompany(data);
      } catch (err) {
        if (err.status !== 204) {
          setError(err.message || 'Unable to load company details.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="status-message">Loading company details...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!company) {
    return (
      <div className="card-panel">
        <h2>Companies</h2>
        <p>No company assigned to your profile yet.</p>
      </div>
    );
  }

  const details = [
    ['Name', company.name],
    ['Location', company.location],
    ['Email', company.email],
    ['Phone', company.phone],
    ['Website', company.website],
    ['Department', company.department],
    ['Field Supervisor', company.fieldSupervisor],
    ['Roles', company.roles],
  ];

  return (
    <div className="card-panel">
      <h2>Companies</h2>
      <p>Your assigned internship company details.</p>
      <div className="detail-grid">
        {details.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <span className="detail-label">{label}</span>
            <span className="detail-value">{value || '—'}</span>
          </div>
        ))}
      </div>
      {company.profile && (
        <div className="detail-item" style={{ marginTop: '16px' }}>
          <span className="detail-label">Profile</span>
          <span className="detail-value">{company.profile}</span>
        </div>
      )}
    </div>
  );
}
