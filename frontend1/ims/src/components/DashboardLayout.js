import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  ChevronDown,
  Shield,
  Building2,
  BookUser,
  LayoutDashboard,
  FolderOpen,
  Users,
  RectangleHorizontal,
  ListChecks,
  University,
  LogOut,
  Menu,
  Search,
  Bell,
  CheckCircle,
  Network,
  BookOpen,
  Link2,
} from 'lucide-react';

const MOBILE_BREAKPOINT = 900;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

const ROLE_LABELS = {
  ADMIN: 'Admin',
  STUDENT: 'Student',
  COMPANY: 'Company',
  SUPERVISOR: 'Supervisor',
};

const SIDEBAR_ICON_SIZE = 'w-5 h-5';

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
  const [notifOpen, setNotifOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearedNotifs, setClearedNotifs] = useState(false);
  const notifRef = useRef(null);
  const sidebarRef = useRef(null);

  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  const role = user?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[role] || role;
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  useEffect(() => {
    function handleClickOutside(event) {
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

  function handleToggle(event) {
    if (isMobile) {
      event.stopPropagation();
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  }

  const visibleNotifications = clearedNotifs ? [] : notifications;
  const unreadCount = visibleNotifications.length;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const dashboardLinks = [
    { to: '/admin/dashboard', icon: <Shield className={SIDEBAR_ICON_SIZE} />, label: 'Admin Dashboard', roles: ['ADMIN'] },
    { to: '/student/dashboard', icon: <GraduationCap className={SIDEBAR_ICON_SIZE} />, label: 'Student Area', roles: ['ADMIN', 'STUDENT'] },
    { to: '/company/dashboard', icon: <Building2 className={SIDEBAR_ICON_SIZE} />, label: 'Company Area', roles: ['ADMIN', 'COMPANY'] },
    { to: '/university/dashboard', icon: <LayoutDashboard className={SIDEBAR_ICON_SIZE} />, label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR'] },
  ];

  const navLinks = [
    { to: '/university/students', icon: <GraduationCap className={SIDEBAR_ICON_SIZE} />, label: 'Students', roles: ['SUPERVISOR'] },
    { to: '/company', icon: <Building2 className={SIDEBAR_ICON_SIZE} />, label: 'Companies', roles: ['ADMIN', 'SUPERVISOR'] },
    { to: '/admin/placements', icon: <RectangleHorizontal className={SIDEBAR_ICON_SIZE} />, label: 'Internship Placement', roles: ['ADMIN'] },
    { to: '/admin/universities', icon: <University className={SIDEBAR_ICON_SIZE} />, label: 'Universities', roles: ['ADMIN'] },
  ];

  const settingsLinks = [
    { to: '/university/schools', icon: <Building2 className={SIDEBAR_ICON_SIZE} />, label: 'Schools', roles: ['SUPERVISOR'] },
    { to: '/university/departments', icon: <ListChecks className={SIDEBAR_ICON_SIZE} />, label: 'Departments', roles: ['SUPERVISOR'] },
    { to: '/university/programmes', icon: <BookOpen className={SIDEBAR_ICON_SIZE} />, label: 'Programmes', roles: ['SUPERVISOR'] },
    { to: '/admin/users', icon: <Users className={SIDEBAR_ICON_SIZE} />, label: 'User Management', roles: ['ADMIN'] },
    { to: '/file-management', icon: <FolderOpen className={SIDEBAR_ICON_SIZE} />, label: 'File Management', roles: ['ADMIN'] },
    { to: '/admin/audit-logs', icon: <ListChecks className={SIDEBAR_ICON_SIZE} />, label: 'Audit Logs', roles: ['ADMIN'] },
  ];

  const visibleDashboardLinks = dashboardLinks.filter((link) => link.roles.includes(role));
  const visibleNavLinks = navLinks.filter((link) => link.roles.includes(role));
  const visibleSettingsLinks = settingsLinks.filter((link) => link.roles.includes(role));



  const sidebarCollapsed = !isMobile && collapsed;
  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    isMobile && mobileOpen ? 'sidebar-mobile-open' : '',
  ].filter(Boolean).join(' ');

  const sidebarClassName = [
    'sidebar',
    isMobile && mobileOpen ? 'sidebar-mobile-open' : '',
  ].filter(Boolean).join(' ');

  const toggleLabel = isMobile
    ? (mobileOpen ? 'Close menu' : 'Open menu')
    : (collapsed ? 'Expand sidebar' : 'Collapse sidebar');

  return (
    <div className={shellClassName}>
      {isMobile && mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          aria-hidden="true"
          onClick={closeMobileSidebar}
        />
      )}

      <aside ref={sidebarRef} className={sidebarClassName}>
        <div className="sidebar-brand">
          <div className="brand-logo"><GraduationCap className="w-5 h-5" /></div>
          <div>
            <div className="brand-name">IMS Portal</div>
            <div className="brand-sub">Internship Management</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Main</div>

          {visibleDashboardLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isActive(link.to) ? ' active' : ''}`}
            >
              {link.icon}
              <span className="nav-link-text">{link.label}</span>
            </Link>
          ))}

          {visibleNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isActive(link.to) ? ' active' : ''}`}
            >
              {link.icon}
              <span className="nav-link-text">{link.label}</span>
            </Link>
          ))}

          {visibleSettingsLinks.length > 0 && (
            <>
              <div className="nav-label">Settings</div>
              {visibleSettingsLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link${isActive(link.to) ? ' active' : ''}`}
                >
                  {link.icon}
                  <span className="nav-link-text">{link.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-link"
            onClick={handleLogout}
          >
            <LogOut className={SIDEBAR_ICON_SIZE} />
            <span className="nav-link-text">Logout</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            title={toggleLabel}
            aria-label={toggleLabel}
            onClick={handleToggle}
          >
            <Menu className="w-5 h-5" />
          </button>

          {searchable && (
            <div className="relative w-full max-w-md">
              <label htmlFor="global-search-input" className="sr-only">Search</label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="global-search-input"
                  type="search"
                  placeholder="Search dashboard..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder:text-slate-500 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 transition-all relative focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                title="Notifications"
                aria-label={`Notifications: ${unreadCount} unread`}
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white" aria-hidden="true">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={() => setClearedNotifs(true)} className="text-xs text-teal-700 hover:text-teal-900 font-semibold hover:underline">
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {visibleNotifications.length > 0 ? (
                      visibleNotifications.map((notif, idx) => (
                        <div key={idx} className="flex gap-3 p-3.5 hover:bg-slate-50/80 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{notif.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</div>
                            <div className="text-[11px] text-slate-400 mt-1">{notif.time}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 px-4 text-center text-sm text-slate-400">No new notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none">
              <div className="w-8 h-8 rounded-full bg-[#063b33] text-white flex items-center justify-center text-xs font-bold shadow-xs ring-1 ring-teal-500/30">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-none">{user?.username || 'User'}</div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">{roleLabel}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
            </div>
          </div>

          {tabs && tabs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#063b33] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
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
