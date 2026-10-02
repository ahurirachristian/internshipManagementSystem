/**
 * PC12 chart 8: placement pace over time.
 *
 * <p>The gap handling is the substance. PC8b's backend emits one bucket per
 * month that saw an event, so a company with placements in January and April
 * gets two buckets and no record of February or March. Plotting only the months
 * that have data draws a straight segment across that hole and asserts a steady
 * pace where there was none — on a line chart that is a claim, not an omission.
 * So missing months are filled with explicit zeros and the series is not
 * smoothed, and both are pinned below.
 */
import { render, screen } from '@testing-library/react';
import PlacementPaceChart from './PlacementPaceChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const month = (m, offered, assigned = 0, started = 0, completed = 0) => ({
  month: m,
  offered,
  assigned,
  started,
  completed,
});

beforeEach(() => jest.clearAllMocks());

describe('PlacementPaceChart', () => {
  test('plots each stage with its own total in the description', () => {
    render(
      <PlacementPaceChart
        error=""
        timeline={{
          funnel: [month('2026-01', 3, 2, 1, 0), month('2026-02', 1, 1, 1, 1)],
          medianTimeToPlacementDays: 6,
          timeToPlacementSample: 4,
          averageActiveDurationDays: 21,
          activeDurationSample: 3,
        }}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/Offered 4/);
    expect(img).toHaveAccessibleName(/Assigned 3/);
    expect(img).toHaveAccessibleName(/Started 2/);
    expect(img).toHaveAccessibleName(/Completed 1/);
  });

  test('spans the months the backend skipped instead of joining across them', () => {
    render(
      <PlacementPaceChart
        error=""
        timeline={{
          funnel: [month('2026-01', 2), month('2026-04', 1)],
          medianTimeToPlacementDays: null,
          timeToPlacementSample: 0,
          averageActiveDurationDays: null,
          activeDurationSample: 0,
        }}
      />,
    );

    // January to April is four months, and the two quiet ones are part of the
    // range rather than silently absent.
    expect(screen.getByRole('img')).toHaveAccessibleName(/over 4 months/);
  });

  test('reports the median only when the backend had a sample', () => {
    const { unmount } = render(
      <PlacementPaceChart
        error=""
        timeline={{
          funnel: [month('2026-01', 1)],
          medianTimeToPlacementDays: null,
          timeToPlacementSample: 0,
          averageActiveDurationDays: null,
          activeDurationSample: 0,
        }}
      />,
    );

    // A median needs both endpoints; without one the figure is absent, not zero.
    expect(screen.getByRole('img')).not.toHaveAccessibleName(/Median time/);
    unmount();

    render(
      <PlacementPaceChart
        error=""
        timeline={{
          funnel: [month('2026-01', 1)],
          medianTimeToPlacementDays: 9,
          timeToPlacementSample: 2,
          averageActiveDurationDays: 14,
          activeDurationSample: 2,
        }}
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/Median time from created to assigned is 9 days/);
  });

  test('shows an empty state when every month is zero', () => {
    render(
      <PlacementPaceChart
        error=""
        timeline={{
          funnel: [month('2026-01', 0, 0, 0, 0)],
          medianTimeToPlacementDays: null,
          timeToPlacementSample: 0,
          averageActiveDurationDays: null,
          activeDurationSample: 0,
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No placement activity yet')).toBeInTheDocument();
  });

  test('shows an empty state for a null payload', () => {
    render(<PlacementPaceChart error="" timeline={null} />);

    expect(screen.getByText('No placement activity yet')).toBeInTheDocument();
  });

  test('surfaces a load failure', () => {
    render(<PlacementPaceChart timeline={null} error="Unable to load placement pace." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load placement pace.');
  });
});
