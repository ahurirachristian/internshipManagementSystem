/**
 * PC5: the admin Overview tab — students per university, and the supervisor diary
 * attention list.
 *
 * <p>Two behaviours are worth pinning. First, that the admin bar reports the
 * server's figures and does not re-aggregate them client-side: if it recomputed
 * totals from `students` it would silently disagree with the endpoint the moment
 * a university row was filtered out. Second, that the diary list distinguishes
 * "never filed" from "quiet since", because those need different nudges and a
 * collapsed label would hide the more urgent case.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';
import UniversityDashboard from './UniversityDashboard';

jest.mock('../../services/api', () => ({
  fetchStudents: jest.fn(),
  fetchDiaries: jest.fn(),
  fetchVacancies: jest.fn(),
  fetchAdminStudentsPerUniversity: jest.fn(),
  fetchAdminPlacementCoverage: jest.fn(),
  fetchAdminDiaryBacklog: jest.fn(),
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
}));

const {
  fetchStudents,
  fetchDiaries,
  fetchVacancies,
  fetchCompanies,
  fetchAdminStudentsPerUniversity,
  fetchAdminPlacementCoverage,
  fetchAdminDiaryBacklog,
  fetchUniversityStudents,
  fetchUniversityStats,
  fetchUniversityProfile,
  fetchSupervisors,
  fetchSchools,
  fetchDepartments,
  fetchProgrammes,
  fetchUniversitySupervisors,
  fetchIndustrialSupervisors,
} = require('../../services/api');

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'admin', role: 'ADMIN' } }),
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(''), () => {}],
  Link: ({ children }) => <span>{children}</span>,
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: ({ tabs, activeTab, onTabChange, children }) => (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  ),
}));

const BASE_STATS = {
  rosters: { totalStudents: 3, studentsBySchool: [] },
  diaries: { totalEntries: 2, pendingReview: 2, reviewed: 0, recent: [] },
  evaluations: { averageScores: {}, byStudent: [] },
  companies: { companies: [] },
  placements: { byStatus: {} },
  analytics: { byYearOfStudy: [], byGender: [], bySchool: [], byProgramme: [], byCompany: [], placementStatus: {}, diaryStatus: {}, avgScores: {} },
};

/** Selects a tab by its visible label, matching what a user clicks. */
function openTab(label) {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(label, 'i') }));
}

beforeEach(() => {
  // clearAllMocks, not resetAllMocks: the matchMedia stub in setupTests is a
  // jest.fn() whose implementation resetAllMocks would strip, leaving
  // useMediaQuery reading `.matches` off undefined.
  jest.clearAllMocks();
  // The admin bar is driven entirely by its own endpoint, so the roster mocks stay
  // empty on purpose: if the UI starts recomputing from `students`, these tests fail
  // rather than quietly agreeing with it.
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
  fetchUniversityStats.mockResolvedValue(BASE_STATS);
  // PC12 chart 5 fetches its own endpoint, so it needs its own resolved promise.
  // Left unmocked the mock returns undefined and the chart's .then() throws,
  // taking the whole Overview tab down with it.
  fetchAdminPlacementCoverage.mockResolvedValue({
    byUniversity: [],
    placementsByStatus: [],
    unattributedStudents: 0,
    overCoveredTotal: 0,
    totalStudents: 0,
    totalPlacements: 0,
  });
  fetchAdminDiaryBacklog.mockResolvedValue({
    byUniversity: [],
    unattributedEntries: 0,
    totalAwaitingReview: 0,
    totalReviewed: 0,
  });
});

describe('admin students-per-university', () => {
  test('renders the server figures without recomputing them', async () => {
    fetchAdminStudentsPerUniversity.mockResolvedValue({
      studentsPerUniversity: [
        { universityId: 2, name: 'Nkumba University', count: 42 },
        { universityId: 1, name: 'Makerere University', count: 7 },
      ],
      unassignedCount: 3,
      totalStudents: 52,
    });

    render(<AdminDashboard />);
    openTab('Overview');

    expect(await screen.findByText('Students by University')).toBeInTheDocument();

    const table = await screen.findByRole('table', { name: 'Students by university' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Nkumba University')).toBeInTheDocument();
    expect(within(rows[0]).getByText('42')).toBeInTheDocument();
    // Largest first, straight from the payload order.
    expect(within(rows[1]).getByText('Makerere University')).toBeInTheDocument();
  });

  test('counts unassigned students rather than dropping them', async () => {
    fetchAdminStudentsPerUniversity.mockResolvedValue({
      studentsPerUniversity: [{ universityId: 1, name: 'Makerere University', count: 10 }],
      unassignedCount: 5,
      totalStudents: 15,
    });

    render(<AdminDashboard />);
    openTab('Overview');

    const table = await screen.findByRole('table', { name: 'Students by university' });
    expect(within(table).getByText('Not yet assigned')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  test('describes the chart for a screen reader with the figures a sighted user reads', async () => {
    fetchAdminStudentsPerUniversity.mockResolvedValue({
      studentsPerUniversity: [{ universityId: 1, name: 'Makerere University', count: 9 }],
      unassignedCount: 0,
      totalStudents: 9,
    });

    render(<AdminDashboard />);
    openTab('Overview');

    const chart = await screen.findByRole('img');
    expect(chart).toHaveAccessibleName(/Makerere University/);
    expect(chart).toHaveAccessibleName(/9/);
  });

  test('renders an empty state instead of zeros when no students exist', async () => {
    fetchAdminStudentsPerUniversity.mockResolvedValue({
      studentsPerUniversity: [],
      unassignedCount: 0,
      totalStudents: 0,
    });

    render(<AdminDashboard />);
    openTab('Overview');

    expect(await screen.findByText('No students registered yet')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Students by university' })).not.toBeInTheDocument();
  });

  test('narrows the axis on a phone so the plot is not squeezed off screen', async () => {
    // Long names are truncated at the axis on narrow viewports; without this the
    // y-axis would claim 150px of a 390px screen and the bars would vanish.
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 640px'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    fetchAdminStudentsPerUniversity.mockResolvedValue({
      studentsPerUniversity: [
        { universityId: 1, name: 'Busitema University of Technology and Innovation', count: 5 },
      ],
      unassignedCount: 0,
      totalStudents: 5,
    });

    render(<AdminDashboard />);
    openTab('Overview');

    await screen.findByText('Students by University');
    // The full name has to survive somewhere readable even when the axis truncates.
    expect(screen.getByRole('table', { name: 'Students by university' })).toHaveTextContent(
      'Busitema University of Technology and Innovation'
    );
  });

  test('surfaces an analytics failure instead of showing an empty chart', async () => {
    fetchAdminStudentsPerUniversity.mockRejectedValue(new Error('Analytics unavailable'));

    render(<AdminDashboard />);
    openTab('Overview');

    expect(await screen.findByText('Analytics unavailable')).toBeInTheDocument();
  });
});

describe('university chart accessibility', () => {
  test('each analytics chart carries the figures a sighted user reads', async () => {
    fetchUniversityStats.mockResolvedValue({
      ...BASE_STATS,
      analytics: {
        ...BASE_STATS.analytics,
        byYearOfStudy: [
          { year: 'Year 1', count: 4 },
          { year: 'Year 2', count: 9 },
        ],
        byGender: [{ gender: 'Male', count: 7 }, { gender: 'Female', count: 6 }],
        placementStatus: { ACTIVE: 3, PENDING: 2 },
      },
    });

    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Analytics');

    const yearChart = await screen.findByRole('img', { name: /academic years/ });
    // The label has to carry values, not just name the chart, or it adds nothing a
    // screen reader user could not get from the title.
    expect(yearChart).toHaveAccessibleName(/Year 1 4/);
    expect(yearChart).toHaveAccessibleName(/Year 2 9/);
    expect(yearChart).toHaveAccessibleName(/Largest is Year 2/);

    expect(screen.getByRole('img', { name: /Male 7, Female 6/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /ACTIVE 3, PENDING 2/ })).toBeInTheDocument();
  });

  test('leaves an empty chart readable instead of hiding it behind an image role', async () => {
    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Analytics');

    // An empty chart has no figures to describe, so its own message has to stay text.
    expect(await screen.findByText('No gender data yet')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /students by gender/i })).not.toBeInTheDocument();
  });
});

describe('university diary attention', () => {
  const ATTENTION = {
    windowHours: 48,
    sinceDate: '2026-09-29',
    total: 2,
    neverFiled: 1,
    students: [
      { studentId: 5, firstName: 'Ada', lastName: 'Never', studentNumber: 'S-Never', lastEntryDate: null, daysSinceLastEntry: null, neverFiled: true },
      { studentId: 4, firstName: 'Grace', lastName: 'Quiet', studentNumber: 'S-Quiet', lastEntryDate: '2026-09-22', daysSinceLastEntry: 9, neverFiled: false },
    ],
  };

  test('separates never-filed students from those who have gone quiet', async () => {
    fetchUniversityStats.mockResolvedValue({ ...BASE_STATS, attention: ATTENTION });

    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Diaries');

    const panel = await screen.findByRole('region', { name: 'Needs Diary Attention' });
    expect(within(panel).getByText('Ada Never')).toBeInTheDocument();
    expect(within(panel).getByText('Never filed')).toBeInTheDocument();
    expect(within(panel).getByText('Grace Quiet')).toBeInTheDocument();
    expect(within(panel).getByText('9 days ago')).toBeInTheDocument();
  });

  test('reports the window in days rather than raw hours', async () => {
    fetchUniversityStats.mockResolvedValue({ ...BASE_STATS, attention: ATTENTION });

    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Diaries');

    expect(await screen.findByText(/2-day window/)).toBeInTheDocument();
  });

  test('confirms the good case instead of rendering an empty list', async () => {
    fetchUniversityStats.mockResolvedValue({
      ...BASE_STATS,
      attention: { windowHours: 48, sinceDate: '2026-09-29', total: 0, neverFiled: 0, students: [] },
    });

    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Diaries');

    expect(await screen.findByText('Every student has a current entry')).toBeInTheDocument();
  });

  test('leaves other tabs untouched when stats carry no attention block', async () => {
    render(<UniversityDashboard />);
    await waitFor(() => expect(fetchUniversityStats).toHaveBeenCalled());
    openTab('Diaries');

    // A payload predating the attention block must not crash the diaries tab.
    expect(screen.getByText('Total Entries')).toBeInTheDocument();
  });
});
