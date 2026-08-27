import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GraduationCap, ChevronRight, LogOut, X } from 'lucide-react';
import { getThemePalette } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { navGroupsForRole, ROLE_LABELS } from './nav';

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  primaryColor = '#0a4d4c',
  isDark = false,
}) {
  const palette = getThemePalette(primaryColor, isDark);
  const location = useLocation();
  const { user, logout } = useAuth();

  const role = user?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[role] || role;
  const displayName = user?.username || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const groups = navGroupsForRole(role);

  async function handleLogout() {
    await logout();
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{ backgroundColor: 'var(--sidebar-bg, #0a4d4c)' }}
        className={`fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 flex flex-col select-none ${
          isCollapsed ? 'w-[76px]' : 'w-[260px]'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } shadow-xl lg:shadow-none border-r border-white/10`}
      >
        {/* Brand Tile */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <NavLink to="/" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-inner font-bold text-lg tracking-wider shrink-0 border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-white text-base tracking-wider font-sans leading-none">
                  IMS
                </span>
                <span
                  style={{ color: 'var(--sidebar-text-muted, #9fcbc4)' }}
                  className="text-[10px] font-medium tracking-widest uppercase mt-0.5"
                >
                  Internship Management
                </span>
              </div>
            )}
          </NavLink>

          {/* Close on Mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              {!isCollapsed && (
                <p
                  style={{ color: 'var(--sidebar-text-muted, #9fcbc4)' }}
                  className="text-[10px] font-bold tracking-widest uppercase px-3 mb-2 opacity-80"
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.to ||
                    location.pathname.startsWith(item.to + '/');

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      style={
                        isActive
                          ? {
                              backgroundColor: 'var(--sidebar-active, #0e746b)',
                              color: '#ffffff',
                            }
                          : {
                              color: 'var(--sidebar-text-muted, #9fcbc4)',
                            }
                      }
                      className={`flex items-center ${
                        isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                      } py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-white/10 hover:text-white group`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                      {!isCollapsed && isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Card */}
        {!isCollapsed && (
          <div className="p-3 border-t border-white/10 bg-black/10 shrink-0 space-y-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 ring-1 ring-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">
                  {displayName}
                </span>
                <span
                  style={{ color: 'var(--sidebar-text-muted, #9fcbc4)' }}
                  className="text-[10px] block truncate"
                >
                  {roleLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
