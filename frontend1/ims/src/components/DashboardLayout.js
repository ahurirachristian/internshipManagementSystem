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
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearedNotifs, setClearedNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const role = user?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[role] || role;
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

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

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const areaDashboardLinks = [
    { to: '/admin/dashboard', icon: 'fa-shield-halved', label: 'Admin Dashboard', roles: ['ADMIN'] },
    { to: '/company/dashboard', icon: 'fa-building', label: 'Company Area', roles: ['ADMIN', 'COMPANY'] },
    { to: '/university/dashboard', icon: 'fa-user-tie', label: 'University Area', roles: ['ADMIN', 'SUPERVISOR'] },
  ];

  const studentLinks = [
    { to: '/student/dashboard', icon: 'fa-user-graduate', label: 'Dashboard', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/progress', icon: 'fa-bars-progress', label: 'Level of Progress', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/tasks', icon: 'fa-list-check', label: 'Tasks', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/day-diaries', icon: 'fa-book-open', label: 'Day Diaries', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/learning-institute', icon: 'fa-building-columns', label: 'Learning Institute', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/companies', icon: 'fa-briefcase', label: 'Companies', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/profile-settings', icon: 'fa-gear', label: 'Profile Settings', roles: ['ADMIN', 'STUDENT'] },
    { to: '/student/supervisor', icon: 'fa-chalkboard-user', label: 'Supervisor', roles: ['ADMIN', 'STUDENT'] },
  ];

  const navLinks = [
    { to: '/file-management', icon: 'fa-folder-open', label: 'File Management', roles: ['ADMIN', 'SUPERVISOR', 'STUDENT', 'COMPANY'] },
    { to: '/admin/users', icon: 'fa-users', label: 'User Management', roles: ['ADMIN'] },
    { to: '/company', icon: 'fa-building', label: 'Companies', roles: ['ADMIN', 'SUPERVISOR'] },
    { to: '/admin/placements', icon: 'fa-users-rectangle', label: 'Placement & Supervisors', roles: ['ADMIN'] },
    { to: '/admin/audit-logs', icon: 'fa-list-check', label: 'Audit Logs', roles: ['ADMIN'] },
    { to: '/admin/universities', icon: 'fa-university', label: 'Universities', roles: ['ADMIN'] },
  ];

  const visibleAreaDashboardLinks = areaDashboardLinks.filter((link) => link.roles.includes(role));
  const visibleStudentLinks = studentLinks.filter((link) => link.roles.includes(role));
  const visibleNavLinks = navLinks.filter((link) => link.roles.includes(role));

  const hasActiveChild = visibleAreaDashboardLinks.some((link) => isActive(link.to));

  useEffect(() => {
    if (hasActiveChild) setDropdownOpen(true);
  }, [location.pathname, hasActiveChild]);

  return (
    <div className={`dashboard-shell${showSidebar ? '' : ' sidebar-collapsed'}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo"><i className="fa-solid fa-graduation-cap"></i></div>
          <div>
            <div className="brand-name">IMS Portal</div>
            <div className="brand-sub">Internship Management</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleAreaDashboardLinks.length > 0 && (
            <div className={`nav-dropdown${dropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
              <button
                type="button"
                className="nav-link nav-dropdown-toggle"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className="fa-solid fa-gauge"></i> Dashboards <i className="fa-solid fa-chevron-down nav-caret"></i>
              </button>
              <div className="nav-submenu">
                {visibleAreaDashboardLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={isActive(link.to) ? 'active' : ''}>
                    <i className={`fa-solid ${link.icon}`}></i> {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {visibleStudentLinks.length > 0 && (
            <>
              {visibleStudentLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link${isActive(link.to) ? ' active' : ''}`}
                >
                  <i className={`fa-solid ${link.icon}`}></i> {link.label}
                </Link>
              ))}
            </>
          )}

          {visibleNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isActive(link.to) ? ' active' : ''}`}
            >
              <i className={`fa-solid ${link.icon}`}></i> {link.label}
            </Link>
          ))}
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

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn sidebar-toggle"
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <i className={`fa-solid fa-bars${showSidebar ? '' : ' fa-bars-open'}`}></i>
          </button>
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

          {children}
        </div>
      </div>
    </div>
  );
}
