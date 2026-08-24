import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import { useAuth } from '../../context/AuthContext';
import { fetchCompany, fetchStudentsByCompany, updateCompany } from '../../services/api';
import {
  Building2,
  Pencil,
  GraduationCap,
  AlertCircle,
  X,
  CheckCircle,
} from 'lucide-react';

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
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading company profile...</span>
        </div>
      );
    }
    if (user.companyId == null) {
      return (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No company linked</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Your account is not linked to a company yet. Please contact an administrator.</p>
          </div>
        </section>
      );
    }
    if (!company) {
      return (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">Company profile not found.</span>
        </div>
      );
    }
    const details = [
      ['Company Name', company.name],
      ['Registration No.', company.registrationNumber],
      ['Industry', company.industry],
      ['Size', company.size],
      ['Country', company.country],
      ['City', company.city],
      ['Email', company.email],
      ['Phone', company.phone],
      ['Website', company.website],
      ['Physical Address', company.physicalAddress],
      ['Postal Address', company.postalAddress],
      ['Description', company.description],
    ];
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Company Profile</h3>
              <p className="text-[11px] text-slate-500">Your company details as recorded in the system</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {details.map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
              <div className="text-sm font-bold text-slate-900">{value || '—'}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderInterns() {
    if (user.companyId == null) {
      return (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No company linked</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Your account is not linked to a company, so no interns can be listed.</p>
          </div>
        </section>
      );
    }
    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assigned Interns</h3>
              <p className="text-[11px] text-slate-500">Students placed at your company</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '750px' }} aria-label="Assigned interns">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Name</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Student Number</th>
                <th scope="col" className="py-3.5 px-3">Degree Program</th>
                <th scope="col" className="py-3.5 px-3">Year</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {interns.length > 0 ? (
                interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900">{intern.firstName} {intern.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{intern.email}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{intern.studentNumber}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{intern.degreeProgram}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{intern.yearOfStudy}</td>
                    <td className="py-3.5 px-3 pr-5 text-xs text-slate-600">{intern.phoneNumber}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">No interns assigned</h3>
                      <p className="text-xs text-slate-500 mt-1">No interns assigned to your company yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Notice Banner */}
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'profile' ? renderProfile() : renderInterns()}
      </div>

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
