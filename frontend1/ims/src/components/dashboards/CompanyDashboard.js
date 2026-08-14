import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import { useAuth } from '../../context/AuthContext';
import { fetchCompany, fetchStudentsByCompany, updateCompany } from '../../services/api';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [interns, setInterns] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (user.companyId == null) {
      setCompany(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    setError('');
    let cancelled = false;
    fetchCompany(user.companyId)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load company profile.');
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.companyId, refresh]);

  async function loadInterns() {
    setError('');
    try {
      setInterns(await fetchStudentsByCompany(user.companyId));
    } catch (err) {
      setError(err.message || 'Unable to load interns.');
    }
  }

  async function handleCompanySave(payload) {
    await updateCompany(user.companyId, payload);
    setNotice('Company profile updated successfully.');
    setRefresh((value) => value + 1);
  }

  function renderProfile() {
    if (companyLoading) {
      return <div className="status-message">Loading company profile...</div>;
    }
    if (user.companyId == null) {
      return (
        <div className="card-panel">
          <h2>No company linked</h2>
          <p>Your account is not linked to a company yet. Please contact an administrator.</p>
        </div>
      );
    }
    if (!company) {
      return <div className="alert alert-error">Company profile not found.</div>;
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
      <div className="card-panel">
        <h2>Company Profile</h2>
        <p>Your company details as recorded in the system.</p>
        <div className="detail-grid">
          {details.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <span className="detail-label">{label}</span>
              <span className="detail-value">{value || '—'}</span>
            </div>
          ))}
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditOpen(true)}>
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  function renderInterns() {
    if (user.companyId == null) {
      return (
        <div className="card-panel">
          <h2>No company linked</h2>
          <p>Your account is not linked to a company, so no interns can be listed.</p>
        </div>
      );
    }
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Student Number</th>
              <th>Degree Program</th>
              <th>Year</th>
              <th>Phone</th>
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
                  <td>{intern.phoneNumber}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-row">
                  No interns assigned to your company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Company Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'profile', label: 'Profile' },
        { id: 'interns', label: 'Interns' },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'interns' && user.companyId != null) {
          loadInterns();
        }
      }}
    >
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {activeTab === 'profile' ? renderProfile() : renderInterns()}

      {editOpen && company && (
        <CompanyEditModal
          company={company}
          title="Edit Company Profile"
          onClose={() => setEditOpen(false)}
          onSubmit={handleCompanySave}
        />
      )}
    </DashboardLayout>
  );
}
