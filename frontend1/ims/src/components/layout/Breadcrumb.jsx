import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

const PATH_META = [
  { path: '/admin/dashboard', section: 'Administration', page: 'Admin Dashboard' },
  { path: '/student/dashboard', section: 'Student', page: 'Student Area' },
  { path: '/company/dashboard', section: 'Company', page: 'Company Area' },
  { path: '/university/dashboard', section: 'University', page: 'Dashboard' },
  { path: '/university/students', section: 'University', page: 'Students' },
  { path: '/university/schools', section: 'University', page: 'Schools' },
  { path: '/university/departments', section: 'University', page: 'Departments' },
  { path: '/university/programmes', section: 'University', page: 'Programmes' },
  { path: '/university/academic-units', section: 'University', page: 'Academic Units' },
  { path: '/university/courses', section: 'University', page: 'Courses' },
  { path: '/university/staff', section: 'University', page: 'Staff' },
  { path: '/university/unit-courses', section: 'University', page: 'Unit Courses' },
  { path: '/company', section: 'Company', page: 'Companies' },
  { path: '/admin/placements', section: 'Administration', page: 'Internship Placement' },
  { path: '/admin/universities', section: 'Administration', page: 'Universities' },
  { path: '/admin/users', section: 'Administration', page: 'User Management' },
  { path: '/file-management', section: 'Administration', page: 'File Management' },
  { path: '/admin/audit-logs', section: 'Administration', page: 'Audit Logs' },
];

export function Breadcrumb({ title, subtitle }) {
  const location = useLocation();
  const meta =
    PATH_META.find((m) => location.pathname.startsWith(m.path)) || {
      section: 'IMS',
      page: title,
    };

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
          to="/admin/dashboard"
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
