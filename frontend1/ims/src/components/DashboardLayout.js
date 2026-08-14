import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  STUDENT: 'Student',
  COMPANY: 'Company',
  SUPERVISOR: 'Supervisor',
};

export default function DashboardLayout({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
  searchable = true,
  onSearch,
  notifications = [],
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearedNotifs, setClearedNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const role = user?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[role] || role;
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  }

  const visibleNotifications = clearedNotifs ? [] : notifications;
  const unreadCount = visibleNotifications.length;

  // Role-aware dashboard dropdown links
  const dashboardLinks = [];
  if (role === 'ADMIN' || role === 'SUPERVISOR') {
    dashboardLinks.push({ to: '/university/dashboard', icon: 'fa-user-tie', label: 'University Area' });
  }
  if (role === 'ADMIN' || role === 'STUDENT') {
    dashboardLinks.push({ to: '/student/dashboard', icon: 'fa-user-graduate', label: 'Student Area' });
  }
  if (role === 'ADMIN' || role === 'COMPANY') {
    dashboardLinks.push({ to: '/company/dashboard', icon: 'fa-building', label: 'Company Area' });
  }

  // Role-aware main section links
  const mainLinks = [];
  if (role === 'ADMIN') {
    mainLinks.push({ to: '/admin/dashboard', icon: 'fa-shield-halved', label: 'Admin Dashboard' });
    mainLinks.push({ to: '/admin/users', icon: 'fa-users', label: 'User Management' });
  }
  if (role === 'ADMIN' || role === 'SUPERVISOR') {
    mainLinks.push({ to: '/company', icon: 'fa-building', label: 'Companies' });
  }
  if (role === 'STUDENT') {
    mainLinks.push({ to: '/student/dashboard', icon: 'fa-id-card', label: 'Student Area' });
  }
  if (role === 'COMPANY') {
    mainLinks.push({ to: '/company/dashboard', icon: 'fa-building', label: 'Company Dashboard' });
  }
  if (role === 'SUPERVISOR') {
    mainLinks.push({ to: '/university/dashboard', icon: 'fa-user-tie', label: 'University Area' });
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="dashboard-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo"><i className="fa-solid fa-graduation-cap"></i></div>
          <div>
            <div className="brand-name">IMS Portal</div>
            <div className="brand-sub">Internship Management</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Main</div>
          {dashboardLinks.length > 0 && (
            <div className={`nav-dropdown${dropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
              <button
                type="button"
                className="nav-link nav-dropdown-toggle"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className="fa-solid fa-gauge"></i> Dashboard <i className="fa-solid fa-chevron-down nav-caret"></i>
              </button>
              <div className="nav-submenu">
                {dashboardLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={isActive(link.to) ? 'active' : ''}>
                    <i className={`fa-solid ${link.icon}`}></i> {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {mainLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isActive(link.to) ? ' active' : ''}`}
            >
              <i className={`fa-solid ${link.icon}`}></i> {link.label}
            </Link>
          ))}
          <div className="nav-label">Areas</div>
          {role === 'ADMIN' && (
            <>
              <Link to="/company" className="nav-link">
                <i className="fa-solid fa-building"></i> Companies
              </Link>
              <Link to="/student/dashboard" className="nav-link">
                <i className="fa-solid fa-id-card"></i> Student Area
              </Link>
            </>
          )}
          {role === 'STUDENT' && (
            <Link to="/student/dashboard" className="nav-link">
              <i className="fa-solid fa-id-card"></i> Student Area
            </Link>
          )}
          {role === 'COMPANY' && (
            <Link to="/company/dashboard" className="nav-link">
              <i className="fa-solid fa-building"></i> Company Area
            </Link>
          )}
          {role === 'SUPERVISOR' && (
            <Link to="/university/dashboard" className="nav-link">
              <i className="fa-solid fa-user-tie"></i> University Area
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-link"
            onClick={handleLogout}
            style={{
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          {searchable && (
            <div className="topbar-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search dashboard..."
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          )}
          <div className="topbar-actions">
            <div className="notif-wrapper" ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                title="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <i className="fa-regular fa-bell"></i>
                {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-clear" onClick={() => setClearedNotifs(true)}>
                        Clear all
                      </button>
                    )}
                  </div>
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((notif, idx) => (
                      <div className="notif-item" key={idx}>
                        <div className="notif-icon">
                          <i className={`fa-solid ${notif.icon || 'fa-bell'}`}></i>
                        </div>
                        <div className="notif-body">
                          <div className="notif-title">{notif.title}</div>
                          <div className="notif-msg">{notif.message}</div>
                          <div className="notif-time">{notif.time}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-empty">No new notifications</div>
                  )}
                </div>
              )}
            </div>
            <div className="user-chip">
              <div className="avatar">{initials}</div>
              <div>
                <div className="user-name">{user?.username || 'User'}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          </div>

          {tabs && tabs.length > 0 && (
            <div className="tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.icon && <i className={`fa-solid ${tab.icon}`}></i>}
                  {tab.label}
                  {tab.count != null && <span className="tab-count">{tab.count}</span>}
                </button>
              ))}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}