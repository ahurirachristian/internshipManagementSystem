import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import StudentDataProvider, { useStudentData } from './context/StudentDataContext';
import StudentDashboard from './components/dashboards/StudentDashboard';
import UniversityDashboard from './components/dashboards/UniversityDashboard';
import CompanyDashboard from './components/dashboards/CompanyDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import AdminUsersPage from './components/dashboards/AdminUsersPage';
import AuditLogs from './components/dashboards/AuditLogs';
import CompanyProfilePage from './components/dashboards/CompanyProfilePage';
import CompanyPage from './components/CompanyPage';
import UniversitiesManagement from './components/UniversitiesManagement';
import PlacementMatching from './components/PlacementMatching';
import VacanciesManagement from './components/VacanciesManagement';
import FileManagement from './components/FileManagement';
import DashboardLayout from './components/DashboardLayout';
import DayDiariesPage from './components/dashboards/DayDiariesPage';
import InternshipProgress from './components/InternshipProgress';
import LearningInstituteSection from './components/dashboards/LearningInstituteSection';
import CompaniesSection from './components/dashboards/CompaniesSection';
import IndustrialSupervisorSection from './components/dashboards/IndustrialSupervisorSection';
import UniversitySupervisorSection from './components/dashboards/UniversitySupervisorSection';
import SettingsSection from './components/dashboards/SettingsSection';
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

function UniversitiesPage() {
  return (
    <DashboardLayout title="University Management" subtitle="Manage registered universities">
      <UniversitiesManagement />
    </DashboardLayout>
  );
}

function StudentProgressPage() {
  return (
    <DashboardLayout title="Level of Progress" subtitle="Track your internship progress">
      <InternshipProgress />
    </DashboardLayout>
  );
}

function StudentTasksPage() {
  const { tasks } = useStudentData();

  return (
    <DashboardLayout title="Tasks" subtitle="Your assigned tasks">
      <div className="card-panel">
        <h2>Tasks</h2>
        <p>Your assigned tasks will appear here.</p>
        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
          <table className="tasks-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const statusClass = task.status === 'Completed'
                  ? 'row-completed'
                  : task.status === 'In Progress'
                    ? 'row-in-progress'
                    : 'row-uncompleted';
                return (
                  <tr key={task.id} className={statusClass}>
                    <td>{task.id}</td>
                    <td>{task.title}</td>
                    <td>{task.assignee}</td>
                    <td>{task.priority}</td>
                    <td>
                      <span className={`pill pill-${task.status === 'Completed' ? 'done' : task.status === 'In Progress' ? 'in-progress' : 'pending'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.dueDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StudentLearningInstitutePage() {
  return (
    <DashboardLayout title="Learning Institute" subtitle="Learning institute details">
      <LearningInstituteSection />
    </DashboardLayout>
  );
}

function StudentCompaniesPage() {
  return (
    <DashboardLayout title="Companies" subtitle="Company placements">
      <CompaniesSection />
    </DashboardLayout>
  );
}

function StudentProfileSettingsPage() {
  return (
    <DashboardLayout title="Profile Settings" subtitle="Manage your preferences">
      <SettingsSection />
    </DashboardLayout>
  );
}

function StudentSupervisorPage() {
  return (
    <DashboardLayout title="Supervisor" subtitle="Your supervisors">
      <IndustrialSupervisorSection />
      <UniversitySupervisorSection />
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
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentDataProvider>
              <StudentDashboard />
            </StudentDataProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/progress"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentProgressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/tasks"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentDataProvider>
              <StudentTasksPage />
            </StudentDataProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning-institute"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentLearningInstitutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/companies"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentCompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile-settings"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentProfileSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/supervisor"
        element={
          <ProtectedRoute roles={["ADMIN", "STUDENT"]}>
            <StudentSupervisorPage />
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
        path="/admin/placements"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
            <PlacementMatching />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vacancies"
        element={
          <ProtectedRoute role="ADMIN">
            <VacanciesManagement />
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;




