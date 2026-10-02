/**
 * PC12 chart 5: admin placement coverage.
 *
 * <p>The chart fetches its own payload, so most of these tests are about what it
 * refuses to render. Its reporting risk is not a crash — it is a plausible bar
 * that misstates how many students need help, and the case worth pinning is the
 * over-covered anomaly, where placements are attributed to a university the
 * student does not belong to. Silently dropping those would understate the
 * number of students needing attention.
 */
import { render, screen, waitFor } from '@testing-library/react';
import PlacementCoverageChart from './PlacementCoverageChart';
import { fetchAdminPlacementCoverage } from '../../services/api';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../services/api', () => ({
  fetchAdminPlacementCoverage: jest.fn(),
}));

const payload = {
  byUniversity: [
    { universityId: 1, name: 'Needs Help University', totalStudents: 40, coveredStudents: 10, uncoveredStudents: 30, overCoveredStudents: 0, coveragePct: 25 },
    { universityId: 2, name: 'Mostly Placed University', totalStudents: 50, coveredStudents: 48, uncoveredStudents: 2, overCoveredStudents: 0, coveragePct: 96 },
  ],
  placementsByStatus: [{ status: 'ASSIGNED', count: 58 }],
  unattributedStudents: 0,
  overCoveredTotal: 0,
  totalStudents: 90,
  totalPlacements: 58,
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchAdminPlacementCoverage.mockResolvedValue(payload);
});

describe('PlacementCoverageChart', () => {
  test('leads with the universities needing the most placements', async () => {
    render(<PlacementCoverageChart />);

    const img = await screen.findByRole('img');
    // 32 students need a placement in total; the leading university accounts
    // for 30 of them. Both halves of that are what the reader needs.
    expect(img).toHaveAccessibleName(/32 students need a placement across 2 universities/);
    expect(img).toHaveAccessibleName(/Needs Help University has the most \(30\)/);
  });

  test('carries each university cohort size into the description', async () => {
    render(<PlacementCoverageChart />);

    const img = await screen.findByRole('img');
    // A stacked bar alone does not say "96% covered out of 50", which is the
    // difference between healthy and nearly empty.
    expect(img).toHaveAccessibleName(/Needs Help University: 10 of 40 students covered \(25%\)/);
    expect(img).toHaveAccessibleName(/Mostly Placed University: 48 of 50 students covered \(96%\)/);
  });

  test('discloses over-covered students instead of dropping them silently', async () => {
    fetchAdminPlacementCoverage.mockResolvedValue({
      ...payload,
      overCoveredTotal: 3,
    });
    render(<PlacementCoverageChart />);

    // These students are in placements the endpoint refuses to credit, so the
    // total is short by three and the chart has to say so.
    expect(await screen.findByRole('img')).toHaveAccessibleName(
      /3 placed students are attributed to a university they do not belong to/,
    );
  });

  test('says nothing about attribution when the data is consistent', async () => {
    render(<PlacementCoverageChart />);

    expect(await screen.findByRole('img')).not.toHaveAccessibleName(/do not belong to/);
  });

  test('uses the singular for a single university with a single student to place', async () => {
    fetchAdminPlacementCoverage.mockResolvedValue({
      byUniversity: [
        { universityId: 1, name: 'Solo University', totalStudents: 1, coveredStudents: 0, uncoveredStudents: 1, coveragePct: 0 },
      ],
      overCoveredTotal: 0,
    });
    render(<PlacementCoverageChart />);

    expect(await screen.findByRole('img')).toHaveAccessibleName(/1 student needs a placement across 1 university/);
  });

  test('shows an empty state when no universities have students', async () => {
    fetchAdminPlacementCoverage.mockResolvedValue({ byUniversity: [], overCoveredTotal: 0 });
    render(<PlacementCoverageChart />);

    expect(await screen.findByText('No placement data yet')).toBeInTheDocument();
  });

test('announces a pending request instead of reporting no placement data', async () => {
    // Never resolves, so the card stays in its pending state.
    fetchAdminPlacementCoverage.mockReturnValue(new Promise(() => {}));
    render(<PlacementCoverageChart />);

    // "No placement data yet" would read as a finding about the system.
    expect(screen.queryByText('No placement data yet')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/loading placement coverage by university/i);
  });

  test('surfaces a load failure', async () => {
    fetchAdminPlacementCoverage.mockRejectedValue(new Error('Unable to load placement coverage.'));
    render(<PlacementCoverageChart />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load placement coverage.');
  });

  test('does not update state after unmount', async () => {
    let resolve;
    fetchAdminPlacementCoverage.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = render(<PlacementCoverageChart />);
    unmount();
    resolve(payload);

    // React logs a setState-after-unmount warning if the guard is removed. The
    // fetch is not cancellable, so the live flag is the only protection.
    await waitFor(() => expect(fetchAdminPlacementCoverage).toHaveBeenCalled());
  });
});
