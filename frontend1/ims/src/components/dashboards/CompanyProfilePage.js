import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import { useAuth } from '../../context/AuthContext';
import { fetchCompany, fetchStudentsByCompany, updateCompany } from '../../services/api';

export default function CompanyProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const canEdit = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    let cancelled = false;

    async function load() {
      try {
        const companyData = await fetchCompany(id);
        if (cancelled) return;
        setCompany(companyData);
        try {
          const internsData = await fetchStudentsByCompany(id);
          if (!cancelled) setInterns(internsData);
        } catch {
          if (!cancelled) setInterns([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load company.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, refresh]);

  async function handleCompanySave(payload) {
    await updateCompany(id, payload);
    setNotice('Company updated successfully.');
    setRefresh((value) => value + 1);
  }

  if (loading) {
    return (
      <DashboardLayout title="Company Profile">
        <div className="status-message">Loading company...</div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Company Profile">
        <div className="alert alert-error">{error || 'Company not found.'}</div>
      </DashboardLayout>
    );
  }

  const [postalAddress, physicalAddress] = company.profile?.split(' | ') || ['', ''];
  const details = [
    ['Company Name', company.name],
    ['Country', company.location],
    ['Branch', company.department],
    ['Email', company.email],
    ['Website', company.website],
    ['Phone', company.phone],
    ['Field Supervisor', company.fieldSupervisor],
    ['Postal Address', postalAddress],
    ['Physical Address', physicalAddress],
  ];

  return (
    <DashboardLayout title="Company Profile">
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card-panel">
        <h2>{company.name}</h2>
        <p>Company details and their assigned interns.</p>
        <div className="detail-grid">
          {details.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <span className="detail-label">{label}</span>
              <span className="detail-value">{value || '—'}</span>
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="inline-actions">
            <button className="primary-button" onClick={() => setEditOpen(true)}>
              Edit Company
            </button>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Intern</th>
              <th>Email</th>
              <th>Student Number</th>
              <th>Degree Program</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {interns.length > 0 ? (
              interns.map((intern) => (
                <tr key={intern.id}>
                  <td>
                    {intern.firstName} {intern.lastName}
                  </td>
                  <td>{intern.email}</td>
                  <td>{intern.studentNumber}</td>
                  <td>{intern.degreeProgram}</td>
                  <td>{intern.yearOfStudy}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-row">
                  No interns assigned to this company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <CompanyEditModal
          company={company}
          title={`Edit Company: ${company.name}`}
          onClose={() => setEditOpen(false)}
          onSubmit={handleCompanySave}
        />
      )}
    </DashboardLayout>
  );
}
