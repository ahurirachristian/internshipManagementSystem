import {
  Shield,
  GraduationCap,
  Building2,
  LayoutDashboard,
  RectangleHorizontal,
  University,
  Users,
  ListChecks,
  BookOpen,
  FolderOpen,
} from 'lucide-react';

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  STUDENT: 'Student',
  COMPANY: 'Company',
  SUPERVISOR: 'Supervisor',
};

export const NAV_GROUPS = [
  {
    label: 'Main',
    links: [
      { to: '/admin/dashboard', icon: Shield, label: 'Admin Dashboard', roles: ['ADMIN'] },
      { to: '/student/dashboard', icon: GraduationCap, label: 'Student Area', roles: ['ADMIN', 'STUDENT'] },
      { to: '/company/dashboard', icon: Building2, label: 'Company Area', roles: ['ADMIN', 'COMPANY'] },
      { to: '/university/dashboard', icon: LayoutDashboard, label: 'University Dashboard', roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Management',
    links: [
      { to: '/university/students', icon: GraduationCap, label: 'Students', roles: ['SUPERVISOR'] },
      { to: '/company', icon: Building2, label: 'Companies', roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/admin/placements', icon: RectangleHorizontal, label: 'Internship Placement', roles: ['ADMIN'] },
      { to: '/admin/universities', icon: University, label: 'Universities', roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Settings',
    links: [
      { to: '/university/schools', icon: Building2, label: 'Schools', roles: ['SUPERVISOR'] },
      { to: '/university/departments', icon: ListChecks, label: 'Departments', roles: ['SUPERVISOR'] },
      { to: '/university/programmes', icon: BookOpen, label: 'Programmes', roles: ['SUPERVISOR'] },
      { to: '/university/academic-units', icon: Building2, label: 'Academic Units', roles: ['SUPERVISOR'] },
      { to: '/university/courses', icon: BookOpen, label: 'Courses', roles: ['SUPERVISOR'] },
      { to: '/university/staff', icon: Users, label: 'Staff', roles: ['SUPERVISOR'] },
      { to: '/university/unit-courses', icon: ListChecks, label: 'Unit Courses', roles: ['SUPERVISOR'] },
      { to: '/admin/users', icon: Users, label: 'User Management', roles: ['ADMIN'] },
      { to: '/file-management', icon: FolderOpen, label: 'File Management', roles: ['ADMIN'] },
      { to: '/admin/audit-logs', icon: ListChecks, label: 'Audit Logs', roles: ['ADMIN'] },
    ],
  },
];

export function navGroupsForRole(role) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => link.roles.includes(role)),
  })).filter((group) => group.links.length > 0);
}
