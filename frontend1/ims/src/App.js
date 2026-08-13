import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import StudentDashboard from './components/dashboards/StudentDashboard';
import UniversityDashboard from './components/dashboards/UniversityDashboard';
import CompanyDashboard from './components/dashboards/CompanyDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import AdminUsersPage from './components/dashboards/AdminUsersPage';
import CompanyProfilePage from './components/dashboards/CompanyProfilePage';
import CompanyPage from './components/CompanyPage';
import './App.css';

function CompanyManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return <CompanyPage onLogout={handleLogout} />;
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
          <ProtectedRoute role="STUDENT">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/dashboard"
        element={
          <ProtectedRoute role="SUPERVISOR">
            <UniversityDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute role="COMPANY">
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
