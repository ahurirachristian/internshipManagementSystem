/**
 * PC12 chart 7: applications by status, for the company.
 *
 * <p>The load-bearing decision here is that this is NOT a funnel despite the
 * plan's name for it, and the tests below pin that. Application rows store the
 * status they are in, not the path they took, so the counts cannot support a
 * cumulative drop-off: an application shortlisted and then rejected shows up
 * only as REJECTED. A chart that tapered those six buckets would assert a
 * story the data does not contain.
 */
import { render, screen } from '@testing-library/react';
import ApplicationsFunnelChart from './ApplicationsFunnelChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const app = (status) => ({ id: `${status}-${Math.random()}`, status });

beforeEach(() => jest.clearAllMocks());

describe('ApplicationsFunnelChart', () => {
  test('counts applications by their current status', () => {
    render(
      <ApplicationsFunnelChart
        error=""
        applications={[app('SUBMITTED'), app('SUBMITTED'), app('REVIEWING'), app('ACCEPTED')]}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/4 applications/);
    expect(img).toHaveAccessibleName(/Submitted 2/);
    expect(img).toHaveAccessibleName(/Reviewing 1/);
    expect(img).toHaveAccessibleName(/Accepted 1/);
  });

  test('names every stage including those with no entries', () => {
    render(<ApplicationsFunnelChart error="" applications={[app('SUBMITTED')]} />);

    // The sentence is a complete account of the pipeline, not only the stages
    // that happened to have rows.
    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/Withdrawn 0/);
    expect(img).toHaveAccessibleName(/Shortlisted 0/);
  });

  test('separates still-open from accepted rather than implying a conversion rate', () => {
    render(
      <ApplicationsFunnelChart
        error=""
        applications={[app('SUBMITTED'), app('REVIEWING'), app('SHORTLISTED'), app('ACCEPTED')]}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/3 still open, 1 accepted/);
  });

  test('shows an empty state when there are no applications', () => {
    render(<ApplicationsFunnelChart error="" applications={[]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Nothing to chart by status yet')).toBeInTheDocument();
  });

  test('does not drop a status outside the expected set silently', () => {
    render(<ApplicationsFunnelChart error="" applications={[app('SUBMITTED'), { id: 'x', status: 'WAT' }]} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/outside the expected set/);
  });

  test('describes the chart as a current-status snapshot, not a progression', () => {
    render(<ApplicationsFunnelChart error="" applications={[app('SUBMITTED')]} />);

    // The title carries the claim, so a screen reader user is not told this is a
    // funnel.
    expect(screen.getByText('Applications by Status')).toBeInTheDocument();
    expect(screen.getByText(/by current status/i)).toBeInTheDocument();
  });

  test('surfaces a load failure', () => {
    render(<ApplicationsFunnelChart applications={[]} error="Unable to load applications." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load applications.');
  });
});
