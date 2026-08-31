import { useEffect, useState } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Breadcrumb } from './layout/Breadcrumb';
import { FloatingToolbar } from './layout/FloatingToolbar';
import { useTheme } from '../context/ThemeContext';

const MOBILE_BREAKPOINT = 900;
const SIDEBAR_W = 260;
const SIDEBAR_W_COLLAPSED = 76;

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
  const { primaryColor, isDark } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const sidebarCollapsed = !isMobile && collapsed;

  useEffect(() => {
    if (isMobile) {
      setCollapsed(false);
    }
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = isMobile && mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mobileOpen]);

  return (
    <div className="min-h-screen bg-[var(--bg-app,#f4f7f6)] dark:bg-slate-900 transition-colors">
      <Sidebar
        isOpenMobile={isMobile && mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        primaryColor={primaryColor}
        isDark={isDark}
      />

      <div
        className="flex flex-col min-h-screen transition-[margin] duration-300"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W) }}
      >
        <Header
          onToggleMobile={() => setMobileOpen((o) => !o)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          isCollapsed={sidebarCollapsed}
          notifications={notifications}
          searchable={searchable}
          onSearch={onSearch}
        />

        <main className="flex-1">
          <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
            <Breadcrumb title={title} subtitle={subtitle} />

            {tabs && tabs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-[var(--primary-color,#0a4d4c)] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none`}
                    onClick={() => onTabChange(tab.id)}
                  >
                    {tab.label}
                    {tab.count != null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {children}
          </div>
        </main>
      </div>

      <FloatingToolbar />
    </div>
  );
}
