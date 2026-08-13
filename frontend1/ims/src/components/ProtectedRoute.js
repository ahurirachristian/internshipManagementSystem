import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role, roles }) {
  const { user, loading, homeFor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-shell">
        <div className="status-message">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = roles || (role ? [role] : null);
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return children;
}
