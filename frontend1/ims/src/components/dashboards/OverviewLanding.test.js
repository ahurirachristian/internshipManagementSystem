/**
 * PC11: every role lands on Overview, and Overview is the first tab offered.
 *
 * <p>This is the phase that satisfies the original request, so the tests assert
 * the two things a reviewer would otherwise have to check by hand for each
 * dashboard: that the first thing rendered after a login is the Overview panel
 * (not that an Overview tab merely exists somewhere in the strip), and that
 * Overview is the tab at position zero.
 *
 * <p>Both halves are needed. Asserting only "a tab named Overview exists" passed
 * while the University dashboard defaulted to the raw student table, which is
 * exactly the complaint that motivated this phase. Asserting only the default
 * would not catch an Overview buried sixth in the tab order, which is reachable
 * but not visible.
 *
 * <p>Five dashboards, not four: PC7 added the field-supervisor persona, and a
 * fifth dashboard that nobody tests is a fifth dashboard nobody verifies.
 */
import { render, screen, waitFor } from '@testing-library/react';
import UniversityDashboard from './UniversityDashboard';
import AdminDashboard from './AdminDashboard';
import CompanyDashboard from './CompanyDashboard';
import StudentDashboard from './StudentDashboard';
import IndustrialSupervisorDashboard from './IndustrialSupervisorDashboard';

jest.mock('../../services/api', () => ({
  // University
  fetchStudents: jest.fn(),
  fetchDiaries: jest.fn(),
  fetchVacancies: jest.fn(),
  fetchAdminStudentsPerUniversity: jest.fn(),
  fetchUniversityStudents: jest.fn(),
  fetchUniversityStats: jest.fn(),
  fetchUniversityProfile: jest.fn(),
  fetchCompanies: jest.fn(),
  fetchSupervisors: jest.fn(),
  fetchSchools: jest.fn(),
  fetchDepartments: jest.fn(),
  fetchProgrammes: jest.fn(),
  fetchUniversitySupervisors: jest.fn(),
  fetchIndustrialSupervisors: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  submitDiaryFeedback: jest.fn(),
  resetUserPassword: jest.fn(),
  createUniversitySupervisor: jest.fn(),
  fetchEvaluationRequests: jest.fn(),
  // Company
  fetchCompanyAnalytics: jest.fn(),
  fetchCompany: jest.fn(),
  fetchCompanySupervisors: jest.fn(),
  fetchStudentsByCompany: jest.fn(),
  updateCompany: jest.fn(),
  createCompanySupervisor: jest.fn(),
  updateCompanySupervisor: jest.fn(),
  fetchUniversityOptions: jest.fn(),
  studentLookup: jest.fn(),
  offerPlacement: jest.fn(),
  fetchApplications: jest.fn(),
  transitionApplication: jest.fn(),
  // Student
  fetchMyProfile: jest.fn(),
  fetchMyDiaries: jest.fn(),
  fetchMyPlacement: jest.fn(),
  fetchMyEvaluations: jest.fn(),
  createDiary: jest.fn(),
  updateDiary: jest.fn(),
  deleteDiary: jest.fn(),
}));

let mockRole = 'SUPERVISOR';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'tester', role: mockRole } }),
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(''), () => {}],
  Link: ({ children }) => <span>{children}</span>,
  useNavigate: () => () => {},
}));

// Mirrors the real DashboardLayout closely enough to expose the tab strip as a
// tablist with aria-selected, which is what a screen reader (and this test)
// reads to know which panel is showing.
jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: ({ tabs, activeTab, onTabChange, children }) => (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  ),
}));

const STATS = {
  rosters: { totalStudents: 3, assigned: 2, pending: 1 },
  diaries: { totalEntries: 4, pendingReview: 2, reviewed: 2, recent: [] },
  attention: { windowHours: 48, sinceDate: null, total: 1, neverFiled: 1, students: [] },
  companies: { distinctCompanies: 2, companies: [] },
  placements: { byStatus: {} },
  analytics: {
    byYearOfStudy: [],
    byGender: [],
    bySchool: [],
    byProgramme: [],
    byCompany: [],
    placementStatus: {},
    diaryStatus: {},
    avgScores: {},
    evaluations: {
      totalEvaluations: 2,
      evaluatedStudents: 1,
      midTermReady: 1,
      finalReportReady: 0,
      byStudent: [],
    },
  },
};

beforeEach(() => {
  // clearAllMocks, not resetAllMocks: the matchMedia stub in setupTests is a
  // jest.fn() whose implementation resetAllMocks would strip.
  jest.clearAllMocks();
  mockRole = 'SUPERVISOR';
  const {
    fetchStudents, fetchDiaries, fetchVacancies, fetchCompanies,
    fetchUniversityStudents, fetchUniversityProfile, fetchSupervisors,
    fetchSchools, fetchDepartments, fetchProgrammes,
    fetchUniversitySupervisors, fetchIndustrialSupervisors,
    fetchUniversityStats, fetchAdminStudentsPerUniversity,
    fetchCompanyAnalytics, fetchCompany, fetchCompanySupervisors,
    fetchStudentsByCompany, fetchApplications,
    fetchMyProfile, fetchMyDiaries, fetchMyPlacement, fetchMyEvaluations,
    fetchEvaluationRequests,
  } = require('../../services/api');

  fetchStudents.mockResolvedValue([]);
  fetchDiaries.mockResolvedValue([]);
  fetchVacancies.mockResolvedValue([]);
  fetchCompanies.mockResolvedValue([]);
  fetchUniversityStudents.mockResolvedValue([]);
  fetchUniversityProfile.mockResolvedValue(null);
  fetchSupervisors.mockResolvedValue([]);
  fetchSchools.mockResolvedValue([]);
  fetchDepartments.mockResolvedValue([]);
  fetchProgrammes.mockResolvedValue([]);
  fetchUniversitySupervisors.mockResolvedValue([]);
  fetchIndustrialSupervisors.mockResolvedValue([]);
  fetchEvaluationRequests.mockResolvedValue([]);
  fetchUniversityStats.mockResolvedValue(STATS);
  fetchAdminStudentsPerUniversity.mockResolvedValue({
    studentsPerUniversity: [], unassignedCount: 0, totalStudents: 0,
  });
  fetchCompanyAnalytics.mockResolvedValue({});
  fetchCompany.mockResolvedValue(null);
  fetchCompanySupervisors.mockResolvedValue([]);
  fetchStudentsByCompany.mockResolvedValue([]);
  fetchApplications.mockResolvedValue([]);
  fetchMyProfile.mockResolvedValue({});
  fetchMyDiaries.mockResolvedValue([]);
  fetchMyPlacement.mockResolvedValue(null);
  fetchMyEvaluations.mockResolvedValue([]);
});

/** The tabs in the order the layout renders them. */
function tabLabels() {
  return screen.getAllByRole('tab').map((t) => t.textContent.trim());
}

describe('Overview-first landing for every role', () => {
  test('university lands on Overview and lists it first', async () => {
    render(<UniversityDashboard />);

    // Wait for the stats fetch to land and the Overview to paint, rather than
    // for a particular element type: the point is that the panel is what is
    // showing on first render.
    await waitFor(() => expect(tabLabels()[0]).toBe('Overview'));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Evaluation readiness')).toBeInTheDocument();
  });

  test('university Overview surfaces the eight analytics charts, not a duplicate set', async () => {
    render(<UniversityDashboard />);

    // The Overview delegates to renderAnalytics(), so the charts must be present
    // on landing with no tab click at all.
    expect(await screen.findByText('Students by Year of Study')).toBeInTheDocument();
    expect(screen.getByText('Gender Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Students by School')).toBeInTheDocument();
    expect(screen.getByText('Students by Programme')).toBeInTheDocument();
    expect(screen.getByText('Interns per Company')).toBeInTheDocument();
    expect(screen.getByText('Placement Status')).toBeInTheDocument();
    expect(screen.getByText('Diary Review Status')).toBeInTheDocument();
    expect(screen.getByText('Average Evaluation Scores')).toBeInTheDocument();
  });

  test('university Overview reports the diary-attention count from the payload', async () => {
    render(<UniversityDashboard />);

    // 1 student has gone quiet, straight from stats.attention.total. The tile
    // carries its own accessible name, so this needs no DOM traversal.
    expect(await screen.findByRole('group', { name: 'Diary attention: 1' })).toBeInTheDocument();
  });

  test('admin lands on Overview (PC6d) and lists it first', async () => {
    mockRole = 'ADMIN';
    render(<AdminDashboard />);

    await waitFor(() => expect(tabLabels()[0]).toBe('Overview'));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('company lands on Overview and lists it first', async () => {
    mockRole = 'COMPANY';
    render(<CompanyDashboard />);

    await waitFor(() => expect(tabLabels()[0]).toBe('Overview'));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('student lands on Overview and lists it first', async () => {
    mockRole = 'STUDENT';
    render(<StudentDashboard />);

    await waitFor(() => expect(tabLabels()[0]).toBe('Overview'));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('field supervisor lands on Overview (PC7 persona)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ interns: [], stats: {} }),
    });
    mockRole = 'INDUSTRIAL_SUPERVISOR';
    render(<IndustrialSupervisorDashboard />);

    await waitFor(() => expect(tabLabels()).toEqual(['Overview']));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });
});
