import { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import { deleteStudent, fetchStudents, updateStudent, fetchCompanies, fetchSupervisors } from '../../services/api';
import { TableCard } from '../ui/TableCard';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { Modal } from '../ui/Modal';

export default function AdminStudentArea() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStudents()
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load students.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data || []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    fetchSupervisors()
      .then((data) => {
        if (!cancelled) setSupervisors(data || []);
      })
      .catch(() => {
        if (!cancelled) setSupervisors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddSave(payload) {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to create student.');
      }
      setNotice('Student added successfully.');
      setAddOpen(false);
      const refreshed = await fetchStudents();
      setStudents(refreshed);
    } catch (err) {
      setError(err.message || 'Unable to add student.');
      throw err;
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    setNotice('');
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  async function handleEditSave(payload) {
    setError('');
    setNotice('');
    try {
      await updateStudent(editStudent.id, payload);
      setNotice('Student updated successfully.');
      setEditOpen(false);
      setEditStudent(null);
      const refreshed = await fetchStudents();
      setStudents(refreshed);
    } catch (err) {
      setError(err.message || 'Unable to update student.');
      throw err;
    }
  }

  const filtered = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (s.studentNumber || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.degreeProgram || '').toLowerCase().includes(q)
    );
  });

  function renderActions(student) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
          onClick={() => setViewStudent(student)}
          title="View profile"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-lg border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors flex items-center justify-center"
          onClick={() => {
            setEditStudent(student);
            setEditOpen(true);
          }}
          title="Edit student"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center"
          onClick={() => handleDelete(student.id)}
          title="Delete student"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Student Area"
      subtitle="Manage registered students"
      searchable
      onSearch={setSearchQuery}
    >
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading students...</div>}

      {!loading && (
        <TableCard
          title="Registered Students"
          subtitle="All student profiles in the system"
          icon={Users}
          actions={
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold transition-all hover:opacity-90 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((student) => {
                    const hasDiary = students.some((s) => s.username === student.username);
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={student.pictureUrl || null}
                              name={`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
                              size="md"
                            />
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {student.studentNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {student.registrationNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {student.degreeProgram || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {student.internshipCompany || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={hasDiary ? 'Active' : 'Inactive'} />
                        </td>
                        <td className="px-4 py-3">{renderActions(student)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                          &#128100;
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {searchQuery ? 'No matching students' : 'No registered students'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {searchQuery
                            ? 'No students match your search criteria.'
                            : 'No registered students found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      )}

      {addOpen && (
        <StudentEditModal
          student={null}
          title="Add Student"
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddSave}
          companies={[]}
          supervisors={[]}
        />
      )}

      {editOpen && editStudent && (
        <StudentEditModal
          student={editStudent}
          title="Edit Student"
          onClose={() => {
            setEditOpen(false);
            setEditStudent(null);
          }}
          onSubmit={handleEditSave}
          companies={companies}
          supervisors={supervisors}
        />
      )}

      <Modal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title="Student Profile"
        maxWidth="max-w-xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Full Name', `${viewStudent?.firstName || ''} ${viewStudent?.lastName || ''}`.trim()],
            ['Email', viewStudent?.email],
            ['Student Number', viewStudent?.studentNumber],
            ['Registration Number', viewStudent?.registrationNumber],
            ['Degree Program', viewStudent?.degreeProgram],
            ['Year of Study', viewStudent?.yearOfStudy],
            ['Phone Number', viewStudent?.phoneNumber],
            ['Internship Company', viewStudent?.internshipCompany],
            ['University Supervisor', viewStudent?.universitySupervisor],
            ['Industrial Supervisor ID', viewStudent?.industrialSupervisorId],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}
              </span>
              <span className="text-sm text-slate-800 dark:text-slate-100">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
