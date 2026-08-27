import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from './nav';
import { useTheme } from '../../context/ThemeContext';

export function Header({
  onToggleMobile,
  onToggleCollapse,
  isCollapsed,
  notifications = [],
  searchable = true,
  onSearch,
}) {
  const { user, logout, homeFor } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const navigate = useNavigate();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearedNotifs, setClearedNotifs] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  const role = user?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[role] || role;
  const displayName = user?.username || 'User';
  const displayEmail = user?.email || '';

  const visibleNotifications = clearedNotifs ? [] : notifications;
  const unreadCount = visibleNotifications.length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchChange(value) {
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  }

  async function handleLogout() {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  function goToProfile() {
    setIsUserMenuOpen(false);
    navigate(homeFor(role));
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Search */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search bar */}
          {searchable && (
            <div className="relative flex-1 hidden sm:block max-w-md">
              <label htmlFor="global-search-input" className="sr-only">Search</label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="global-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search dashboard..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-all"
              />
            </div>
          )}
        </div>

        {/* Right: Actions (Theme Toggle, Notifications, User Chip) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDark}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 animate-in fade-in zoom-in-75 duration-200" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
              aria-label={`Notifications: ${unreadCount} unread`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-teal-700 dark:text-teal-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setClearedNotifs(true)}
                      className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((n, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 px-4 text-center text-xs text-slate-400">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Chip */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Avatar name={displayName} size="sm" showStatus status="online" />
              <div className="hidden md:block text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  {roleLabel}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {displayEmail || roleLabel}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={goToProfile}
                    className="w-full px-4 py-2 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left font-medium"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Dashboard</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
