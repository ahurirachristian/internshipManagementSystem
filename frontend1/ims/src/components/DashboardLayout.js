import { useEffect, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Breadcrumb } from './layout/Breadcrumb';
import { FloatingToolbar } from './layout/FloatingToolbar';
import { useTheme } from '../context/ThemeContext';

const MOBILE_BREAKPOINT = 900;
const SIDEBAR_W = 260;
const SIDEBAR_W_COLLAPSED = 76;

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

  // Arrow-key navigation across the tab strip, per the WAI-ARIA tabs pattern.
  // Home/End jump to the ends; arrows wrap, as the pattern specifies.
  function handleTabKeyDown(event) {
    if (!tabs || tabs.length === 0) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    onTabChange(tabs[nextIndex].id);
    // Focus has to follow the selection, since the newly selected tab is the only
    // one left in the tab order.
    window.requestAnimationFrame(() => {
      document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
    });
  }

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
              <div
                role="tablist"
                aria-label={`${title} sections`}
                className="flex flex-wrap items-center gap-2"
                onKeyDown={handleTabKeyDown}
              >
                {tabs.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      // The WAI-ARIA tabs pattern: only the selected tab is in the tab
                      // order, and arrow keys move between them. Without this a keyboard
                      // user has to Tab through every tab to reach the panel below.
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={selected}
                      aria-controls={`tabpanel-${tab.id}`}
                      tabIndex={selected ? 0 : -1}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selected
                          ? 'bg-[var(--primary-color,#0a4d4c)] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none`}
                      onClick={() => onTabChange(tab.id)}
                    >
                      {tab.label}
                      {tab.count != null && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            selected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tabs && tabs.length > 0 ? (
              <div
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                tabIndex={0}
                className="focus-visible:outline-none"
              >
                {children}
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      <FloatingToolbar />
    </div>
  );
}
