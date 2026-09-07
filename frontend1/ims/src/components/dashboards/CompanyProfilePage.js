import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  FileText,
  CheckCircle,
} from 'lucide-react';

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
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading company...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Company Profile">
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error || 'Company not found.'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const details = [
    ['Company Name', company.name],
    ['Industry', company.industry],
    ['Size', company.size],
    ['Registration No.', company.registrationNumber],
    ['Country', company.country],
    ['City', company.city],
    ['Email', company.email],
    ['Phone', company.phone],
    ['Website', company.website],
    ['Postal Address', company.postalAddress],
    ['Physical Address', company.physicalAddress],
  ];

  return (
    <DashboardLayout title="Company Profile">
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

        {/* Company Details */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{company.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Company details and their assigned interns</p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Company</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {details.map(([label, value]) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{value || '—'}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Interns Table */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Assigned Interns</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Students placed at this company</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }} aria-label="Assigned interns">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                  <th scope="col" className="py-3.5 px-3 pl-5">Intern</th>
                  <th scope="col" className="py-3.5 px-3">Email</th>
                  <th scope="col" className="py-3.5 px-3">Student Number</th>
                  <th scope="col" className="py-3.5 px-3">Degree Program</th>
                  <th scope="col" className="py-3.5 px-3 pr-5">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {interns.length > 0 ? (
                  interns.map((intern) => (
                    <tr key={intern.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-3 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{intern.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.email}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.studentNumber}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.degreeProgram}</td>
                      <td className="py-3.5 px-3 pr-5 text-xs text-slate-600 dark:text-slate-400">{intern.yearOfStudy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No interns assigned</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No interns assigned to this company yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Edit Modal */}
        {editOpen && (
          <CompanyEditModal
            company={company}
            title={`Edit Company: ${company.name}`}
            onClose={() => setEditOpen(false)}
            onSubmit={handleCompanySave}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
