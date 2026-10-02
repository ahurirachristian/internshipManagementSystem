/**
 * PC12 chart 2: diary filing cadence.
 *
 * <p>The date handling is the substance here, not the chart. Bucketing by week
 * means deciding what a "week" is and where its boundary sits, and both the
 * obvious shortcuts are wrong in ways a visual check will not show:
 * `new Date('2026-01-05')` parses as UTC midnight and slides into the previous
 * week behind UTC, and a naive 7-day bucket from the first entry is not a week at
 * all. So the boundary cases are pinned directly.
 */
import { render, screen } from '@testing-library/react';
import DiaryCadenceChart from './DiaryCadenceChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const diary = (date) => ({ id: date, date });

describe('DiaryCadenceChart', () => {
  test('buckets entries by ISO week, Monday to Sunday', () => {
    render(
      <DiaryCadenceChart
        error=""
        diaries={[diary('2026-01-05'), diary('2026-01-06'), diary('2026-01-07')]}
      />,
    );

    // 5, 6 and 7 Jan 2026 are Mon-Wed of the same ISO week.
    expect(screen.getByRole('img')).toHaveAccessibleName(/3 entries across 1 week/);
  });

  test('keeps Sunday and the following Monday in separate weeks', () => {
    // 2026-01-11 is a Sunday, 2026-01-12 the next Monday. A boundary that treats
    // them as one week hides exactly the gap a cadence chart exists to show.
    render(<DiaryCadenceChart error="" diaries={[diary('2026-01-11'), diary('2026-01-12')]} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/2 entries across 2 weeks/);
  });

  test('does not let a UTC parse shift an entry into the previous week', () => {
    // A Monday entry read as UTC midnight lands on Sunday behind UTC, which
    // would file it under the wrong week.
    render(<DiaryCadenceChart error="" diaries={[diary('2026-03-02')]} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/1 entry across 1 week/);
    expect(screen.getByRole('img')).toHaveAccessibleName(/Busiest week began 02\/03/);
  });

  test('plots only weeks that have entries, but reports the full range', () => {
    render(
      <DiaryCadenceChart
        error=""
        diaries={[diary('2026-01-05'), diary('2026-01-19')]}
      />,
    );

    // Two bursts three weeks apart are two weeks with entries; the empty weeks
    // between them are implied by the axis rather than plotted as columns.
    expect(screen.getByRole('img')).toHaveAccessibleName(/2 entries across 2 weeks/);
  });

  test('shows an empty state with no diaries', () => {
    render(<DiaryCadenceChart error="" diaries={[]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No diary entries yet')).toBeInTheDocument();
  });

  test('does not silently discard an entry whose date cannot be read', () => {
    render(<DiaryCadenceChart error="" diaries={[diary('2026-01-05'), { id: 'bad' }]} />);

    // A malformed date is a backend problem; the chart says so rather than
    // looking complete while omitting a filing.
    expect(screen.getByRole('img')).toHaveAccessibleName(/unreadable date and are not plotted/);
  });

  test('surfaces a load failure', () => {
    render(<DiaryCadenceChart diaries={[]} error="Unable to load diary entries." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load diary entries.');
  });
});
