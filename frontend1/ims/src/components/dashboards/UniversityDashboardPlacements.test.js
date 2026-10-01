/**
 * PC6e gate: the university Placement Status section derives its rows from the
 * backend payload instead of a hardcoded status list.
 *
 * <p>The list here used to restate five statuses and dropped OFFERED — the
 * first state the offer pipeline sets (PlacementPipelineService assigns
 * OFFERED on create) — while the backend zero-fills all six Placement.Status
 * values. Any placement sitting at OFFERED was counted and then thrown away,
 * so the section's total silently disagreed with the placement count. Deriving
 * from Object.keys(byStatus) also means a status added server-side renders
 * automatically instead of being dropped again.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import UniversityDashboard from './UniversityDashboard';

jest.mock('../../services/api', () => ({
  deleteStudent: jest.fn(),
  fetchUniversityStudents: jest.fn(),
  fetchCompanies: jest.fn(),
  fetchSupervisors: jest.fn(),
  fetchUniversityProfile: jest.fn(),
  fetchSchools: jest.fn(),
  fetchDepartments: jest.fn(),
  fetchProgrammes: jest.fn(),
  fetchUniversitySupervisors: jest.fn(),
  fetchIndustrialSupervisors: jest.fn(),
  fetchUniversityStats: jest.fn(),
  submitDiaryFeedback: jest.fn(),
  updateStudent: jest.fn(),
}));

// Imported after the mock so the jest.fn()s above are the ones under test.
const {
  fetchUniversityStudents,
  fetchCompanies,
  fetchSupervisors,
  fetchUniversityProfile,
  fetchSchools,
  fetchDepartments,
  fetchProgrammes,
  fetchUniversitySupervisors,
  fetchIndustrialSupervisors,
  fetchUniversityStats,
} = require('../../services/api');

// CRA enables jest's resetMocks by default, which strips module-scope
// mockResolvedValue implementations before every test, so the fetch mocks are
// (re)primed here — the pattern CompanyDashboard.test already uses.
beforeEach(() => {
  fetchUniversityStudents.mockResolvedValue([]);
  fetchCompanies.mockResolvedValue([]);
  fetchSupervisors.mockResolvedValue([]);
  fetchUniversityProfile.mockResolvedValue({ fullName: 'Nkumba University' });
  fetchSchools.mockResolvedValue([]);
  fetchDepartments.mockResolvedValue([]);
  fetchProgrammes.mockResolvedValue([]);
  fetchUniversitySupervisors.mockResolvedValue([]);
  fetchIndustrialSupervisors.mockResolvedValue([]);
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'university', role: 'SUPERVISOR', universityId: 19 } }),
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [{ get: () => null }],
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

async function renderPlacementsTab(byStatus) {
  fetchUniversityStats.mockResolvedValue({
    placements: { byStatus },
    companies: { companies: [], distinctCompanies: 0 },
    rosters: { placementRatePct: 40 },
  });

  render(<UniversityDashboard />);

  fireEvent.click(await screen.findByRole('tab', { name: 'Placements & Companies' }));
  await screen.findByText('Placement Status');
}

test('renders all six statuses including OFFERED, with the pie total equal to the placement count', async () => {
  const byStatus = { PENDING: 1, OFFERED: 2, ASSIGNED: 0, ACTIVE: 3, COMPLETED: 1, CANCELLED: 1 };
  await renderPlacementsTab(byStatus);

  // Every status the backend sends renders as a row — including OFFERED, which
  // the old hardcoded five dropped — and every count is asserted, so the rows
  // reconcile with the 8 placements the fixture carries (3+2+1+1+1+0).
  for (const status of Object.keys(byStatus)) {
    expect(screen.getByText(status)).toBeInTheDocument();
  }
  expect(screen.getByText('3')).toBeInTheDocument(); // ACTIVE
  expect(screen.getByText('2')).toBeInTheDocument(); // OFFERED
  expect(screen.getAllByText('1')).toHaveLength(3); // PENDING, COMPLETED, CANCELLED
  expect(screen.getByText('0')).toBeInTheDocument(); // ASSIGNED zero-fill
});

test('follows the payload automatically when the backend adds a status', async () => {
  await renderPlacementsTab({ PENDING: 1, ARCHIVED: 4 });

  // The row list is derived, not restated: a future backend state renders as
  // its own row rather than being silently dropped.
  expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('PENDING')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});
