import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import StudentDashboard from './components/dashboards/StudentDashboard';
import InternshipProgress from './components/InternshipProgress';
import DayDiariesPage from './components/dashboards/DayDiariesPage';
import StudentProfile from './components/StudentProfile';
import UniversityDashboard from './components/dashboards/UniversityDashboard';
import CompanyDashboard from './components/dashboards/CompanyDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import AdminUsersPage from './components/dashboards/AdminUsersPage';
import AdminStudentArea from './components/dashboards/AdminStudentArea';
import AuditLogs from './components/dashboards/AuditLogs';
import CompanyProfilePage from './components/dashboards/CompanyProfilePage';
import CompanyPage from './components/CompanyPage';
import UniversitiesManagement from './components/UniversitiesManagement';
import PlacementMatching from './components/PlacementMatching';
import FileManagement from './components/FileManagement';
import UniversityStudents from './components/UniversityStudents';
import SchoolsManagement from './components/dashboards/SchoolsManagement';
import DepartmentsManagement from './components/dashboards/DepartmentsManagement';
import ProgrammesManagement from './components/dashboards/ProgrammesManagement';
import AcademicUnitsManagement from './components/dashboards/AcademicUnitsManagement';
import CourseManagement from './components/dashboards/CourseManagement';
import StaffManagement from './components/dashboards/StaffManagement';
import UnitCoursesManagement from './components/dashboards/UnitCoursesManagement';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

function CompanyManagement() {
  return (
    <DashboardLayout title="Company Management" subtitle="Manage companies and their details from the backend">
      <CompanyPage />
    </DashboardLayout>
  );
}

function PlacementsPage() {
  return (
    <DashboardLayout title="Placement & Supervisor Management" subtitle="Assign and evaluate student placements">
      <PlacementMatching />
    </DashboardLayout>
  );
}

function UniversityStudentsPage() {
  return (
    <DashboardLayout title="Students" subtitle="Manage students by school/department">
      <UniversityStudents />
    </DashboardLayout>
  );
}

function UniversitiesPage() {
  return (
    <DashboardLayout title="University Management" subtitle="Manage registered universities">
      <UniversitiesManagement />
    </DashboardLayout>
  );
}

function SchoolsPage() {
  return (
    <DashboardLayout title="Schools Management" subtitle="Manage colleges, schools and directorates">
      <SchoolsManagement />
    </DashboardLayout>
  );
}

function DepartmentsPage() {
  return (
    <DashboardLayout title="Departments Management" subtitle="Manage departments within schools">
      <DepartmentsManagement />
    </DashboardLayout>
  );
}

function ProgrammesPage() {
  return (
    <DashboardLayout title="Programmes Management" subtitle="Manage academic programmes">
      <ProgrammesManagement />
    </DashboardLayout>
  );
}

function AcademicUnitsPage() {
  return (
    <DashboardLayout title="Academic Units Management" subtitle="Manage colleges, schools and directorates as academic units">
      <AcademicUnitsManagement />
    </DashboardLayout>
  );
}

function CoursesPage() {
  return (
    <DashboardLayout title="Course Management" subtitle="Manage academic courses offered by the university">
      <CourseManagement />
    </DashboardLayout>
  );
}

function StaffPage() {
  return (
    <DashboardLayout title="Staff Management" subtitle="Manage university supervisors and staff">
      <StaffManagement />
    </DashboardLayout>
  );
}

function UnitCoursesPage() {
  return (
    <DashboardLayout title="Unit Courses" subtitle="Courses offered under each academic unit">
      <UnitCoursesManagement />
    </DashboardLayout>
  );
}

function AppRoutes() {
  const { user, loading, homeFor } = useAuth();

  if (loading) {
    return (
      <div className="page-shell">
        <div className="status-message">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homeFor(user.role)} replace /> : <LoginPage />}
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={["STUDENT"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={["STUDENT"]}>
            <StudentProfile defaultEditing={false} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile/edit"
        element={
          <ProtectedRoute roles={["STUDENT"]}>
            <StudentProfile defaultEditing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/progress"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Level of Progress" subtitle="Track your internship milestones">
              <InternshipProgress />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/tasks"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Tasks" subtitle="Your assigned tasks">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Tasks</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your assigned tasks will appear here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning-institute"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Learning Institute" subtitle="Your learning institution details">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Learning Institute</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your learning institute information will appear here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/companies"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Companies" subtitle="Your company placements">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Companies</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your company placement information will appear here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile-settings"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Profile Settings" subtitle="Manage your preferences">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Profile Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your settings will appear here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/supervisor"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DashboardLayout title="Supervisor" subtitle="Your supervisors">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Supervisor</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your supervisor information will appear here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/day-diaries"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <DayDiariesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/dashboard"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPERVISOR"]}>
            <UniversityDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/students"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPERVISOR"]}>
            <UniversityStudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute roles={["ADMIN", "COMPANY"]}>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
            <CompanyManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/:id"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'COMPANY']}>
            <CompanyProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminStudentArea />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute role="ADMIN">
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/universities"
        element={
          <ProtectedRoute role="ADMIN">
            <UniversitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/schools"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <SchoolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/departments"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/programmes"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <ProgrammesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/academic-units"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <AcademicUnitsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/courses"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <CoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/staff"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <StaffPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/unit-courses"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <UnitCoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/placements"
        element={
          <ProtectedRoute role="ADMIN">
            <PlacementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/file-management"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'STUDENT', 'COMPANY']}>
            <FileManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;




