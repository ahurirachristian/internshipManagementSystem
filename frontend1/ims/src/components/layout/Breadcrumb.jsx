import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PATH_META = [
  { path: '/admin/dashboard', section: 'Administration', page: 'Admin Dashboard', home: '/admin/dashboard' },
  { path: '/student/dashboard', section: 'Student', page: 'Student Area', home: '/student/dashboard' },
  { path: '/student/profile', section: 'Student', page: 'Student Profile', home: '/student/dashboard' },
  { path: '/company/dashboard', section: 'Company', page: 'Company Area', home: '/company/dashboard' },
  { path: '/university/dashboard', section: 'University', page: 'Dashboard', home: '/university/dashboard' },
  { path: '/university/students', section: 'University', page: 'Students', home: '/university/dashboard' },
  { path: '/university/schools', section: 'University', page: 'Schools', home: '/university/dashboard' },
  { path: '/university/departments', section: 'University', page: 'Departments', home: '/university/dashboard' },
  { path: '/university/programmes', section: 'University', page: 'Programmes', home: '/university/dashboard' },
  { path: '/university/academic-units', section: 'University', page: 'Academic Units', home: '/university/dashboard' },
  { path: '/university/courses', section: 'University', page: 'Courses', home: '/university/dashboard' },
  { path: '/university/staff', section: 'University', page: 'Staff', home: '/university/dashboard' },
  { path: '/university/unit-courses', section: 'University', page: 'Unit Courses', home: '/university/dashboard' },
  { path: '/company', section: 'Company', page: 'Companies', home: '/company/dashboard' },
  { path: '/admin/placements', section: 'Administration', page: 'Internship Placement', home: '/admin/dashboard' },
  { path: '/admin/universities', section: 'Administration', page: 'Universities', home: '/admin/dashboard' },
  { path: '/admin/users', section: 'Administration', page: 'User Management', home: '/admin/dashboard' },
  { path: '/file-management', section: 'Administration', page: 'File Management', home: '/admin/dashboard' },
  { path: '/admin/audit-logs', section: 'Administration', page: 'Audit Logs', home: '/admin/dashboard' },
];

const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  STUDENT: '/student/dashboard',
  SUPERVISOR: '/university/dashboard',
  COMPANY: '/company/dashboard',
};

export function Breadcrumb({ title, subtitle }) {
  const location = useLocation();
  const { user } = useAuth();
  const meta =
    PATH_META.find((m) => location.pathname.startsWith(m.path)) || {
      section: 'IMS',
      page: title,
      home: ROLE_HOME[user?.role] || '/admin/dashboard',
    };
  const homePath = meta.home || ROLE_HOME[user?.role] || '/admin/dashboard';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <NavLink
          to={homePath}
          className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </NavLink>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="hover:text-teal-600 transition-colors">{meta.section}</span>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {title || meta.page}
        </span>
      </nav>
    </div>
  );
}
