/**
 * PC6d gate: the admin lands on Overview.
 *
 * <p>The Overview tab was first in the tabs array, but the default state was
 * 'students' — the second tab — so the PC5 "Students by University" chart was
 * unreachable on landing and the admin's single chart required a click. This
 * pins that the dashboard opens on Overview with the chart rendered, and that
 * the tab order is unchanged.
 *
 * <p>CRA enables jest's resetMocks by default, which strips module-scope
 * mockResolvedValue implementations before every test, so the fetch mocks are
 * (re)primed in beforeEach — the same pattern CompanyDashboard.test uses.
 */
import { render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

jest.mock('../../services/api', () => ({
  fetchStudents: jest.fn(),
  fetchDiaries: jest.fn(),
  fetchVacancies: jest.fn(),
  fetchCompanies: jest.fn(),
  fetchAdminStudentsPerUniversity: jest.fn(),
  fetchAdminPlacementCoverage: jest.fn(),
  fetchAdminDiaryBacklog: jest.fn(),
  updateStudent: jest.fn().mockResolvedValue({}),
  deleteStudent: jest.fn().mockResolvedValue({}),
}));

// Imported after the mock so the jest.fn()s above are the ones under test.
const {
  fetchStudents,
  fetchDiaries,
  fetchVacancies,
  fetchCompanies,
  fetchAdminStudentsPerUniversity,
  fetchAdminPlacementCoverage,
  fetchAdminDiaryBacklog,
} = require('../../services/api');

beforeEach(() => {
  fetchStudents.mockResolvedValue([]);
  fetchDiaries.mockResolvedValue([]);
  fetchVacancies.mockResolvedValue([]);
  fetchCompanies.mockResolvedValue([]);
  fetchAdminStudentsPerUniversity.mockResolvedValue({
    studentsPerUniversity: [
      { name: 'Nkumba University', count: 3 },
      { name: 'Kyambogo University', count: 2 },
    ],
    unassignedCount: 0,
    totalStudents: 5,
  });
  // PC12 chart 5 has its own endpoint. Unmocked, the jest.fn() returns undefined
  // and the chart's .then() throws, failing every Overview test for a reason
  // that has nothing to do with what they assert.
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

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: ({ tabs, activeTab, children }) => (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}>
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  ),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children }) => <>{children}</>,
}));

test('opens on Overview and renders the students-by-university chart on landing', async () => {
  render(<AdminDashboard />);

  // Overview is the selected tab from the first paint, not the second tab.
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Students' })).toHaveAttribute('aria-selected', 'false');

  // The PC5 chart and its factual aria summary are on the landing render; the
  // summary sentence lives in the chart's aria-label, not element text.
  const chart = await screen.findByRole('img', { name: /Students by university, largest first/ });
  expect(chart).toHaveAttribute(
    'aria-label',
    expect.stringContaining('5 students across 2 universities'),
  );
});

test('keeps the five tabs in their original order', () => {
  render(<AdminDashboard />);

  const labels = screen.getAllByRole('tab').map((tab) => tab.textContent);
  expect(labels).toEqual(['Overview', 'Students', 'Day Diary Logs', 'Marketplace', 'System']);
});
