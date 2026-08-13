import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ title, subtitle, tabs, activeTab, onTabChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1>{title}</h1>
          <p>
            {subtitle ? `${subtitle} ` : ''}Signed in as <strong>{user.username}</strong>{' '}
            <span className="role-badge">{user.role}</span>
          </p>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </header>
      {tabs && tabs.length > 0 && (
        <nav className="tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
