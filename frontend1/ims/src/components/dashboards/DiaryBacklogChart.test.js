/**
 * PC12 chart 6: admin diary review backlog.
 *
 * <p>The two decisions this pins are the ones that could quietly make the chart
 * wrong rather than broken: it must show the awaiting-review backlog and not the
 * total diary volume, and it must keep the reviewed denominator reachable so a
 * zero backlog is distinguishable from a university that has filed nothing.
 */
import { render, screen } from '@testing-library/react';
import DiaryBacklogChart from './DiaryBacklogChart';
import { fetchAdminDiaryBacklog } from '../../services/api';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../services/api', () => ({
  fetchAdminDiaryBacklog: jest.fn(),
}));

const payload = {
  byUniversity: [
    { universityId: 1, name: 'Backlogged University', total: 80, reviewed: 30, awaitingReview: 50, reviewedPct: 38 },
    { universityId: 2, name: 'Clear University', total: 40, reviewed: 40, awaitingReview: 0, reviewedPct: 100 },
  ],
  unattributedEntries: 0,
  totalAwaitingReview: 50,
  totalReviewed: 70,
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchAdminDiaryBacklog.mockResolvedValue(payload);
});

describe('DiaryBacklogChart', () => {
  test('reports the awaiting-review backlog, not total diary volume', async () => {
    render(<DiaryBacklogChart />);

    // 50 awaiting in total. The naive figure — total filed across universities —
    // is 120, and plotting that would rank universities by how much they write
    // rather than by how much review is owed.
    const img = await screen.findByRole('img');
    expect(img).toHaveAccessibleName(/50 diaries await a university supervisor's review/);
    expect(img).toHaveAccessibleName(/Backlogged University: 50 awaiting review of 80 filed/);
    expect(img).not.toHaveAccessibleName(/120 diaries await/);
  });

  test('keeps the reviewed denominator in the description', async () => {
    render(<DiaryBacklogChart />);

    // A zero backlog and a university that has filed nothing both read as "no
    // bar". Only the denominator tells them apart.
    const img = await screen.findByRole('img');
    expect(img).toHaveAccessibleName(/30 reviewed, 38%/);
    expect(img).toHaveAccessibleName(/Clear University: 0 awaiting review of 40 filed \(40 reviewed, 100%\)/);
  });

  test('uses the singular for a single diary', async () => {
    fetchAdminDiaryBacklog.mockResolvedValue({
      byUniversity: [
        { universityId: 1, name: 'Solo University', total: 1, reviewed: 0, awaitingReview: 1, reviewedPct: 0 },
      ],
      totalAwaitingReview: 1,
    });
    render(<DiaryBacklogChart />);

    expect(await screen.findByRole('img')).toHaveAccessibleName(
      /1 diary awaits a university supervisor's review across 1 university/,
    );
  });

  test('shows an empty state when no university has filed a diary', async () => {
    // Distinct from a university whose backlog is zero, which is a cleared
    // backlog rather than an absent one.
    fetchAdminDiaryBacklog.mockResolvedValue({ byUniversity: [] });
    render(<DiaryBacklogChart />);

    expect(await screen.findByText('No diaries filed yet')).toBeInTheDocument();
  });

test('announces a pending request instead of reporting no diaries filed', async () => {
    fetchAdminDiaryBacklog.mockReturnValue(new Promise(() => {}));
    render(<DiaryBacklogChart />);

    expect(screen.queryByText('No diaries filed yet')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/loading diary review backlog/i);
  });

  test('surfaces a load failure', async () => {
    fetchAdminDiaryBacklog.mockRejectedValue(new Error('Unable to load the diary backlog.'));
    render(<DiaryBacklogChart />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the diary backlog.');
  });
});
