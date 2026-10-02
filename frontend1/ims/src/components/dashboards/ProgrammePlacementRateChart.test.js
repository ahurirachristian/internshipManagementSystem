/**
 * PC12 chart 4: placement rate by programme.
 *
 * <p>The tests here are about what the chart refuses to do. Its first job is to
 * not mislead about cohort size — a rate-only bar chart treats a 3-student
 * programme and a 300-student one as equally important — so the placed count
 * drives the bar length and the cohort size travels into the accessible
 * description. Its second job is to not invent a failure for programmes nobody
 * attends.
 */
import { render, screen } from '@testing-library/react';
import ProgrammePlacementRateChart from './ProgrammePlacementRateChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const rates = [
  { programmeId: 1, programmeName: 'Computer Science', programmeCode: 'CS', total: 120, placed: 108, placementRatePct: 90 },
  { programmeId: 2, programmeName: 'History', programmeCode: 'HIS', total: 40, placed: 10, placementRatePct: 25 },
  { programmeId: 3, programmeName: 'Fine Art', programmeCode: 'FA', total: 12, placed: 12, placementRatePct: 100 },
];

beforeEach(() => jest.clearAllMocks());

describe('ProgrammePlacementRateChart', () => {
  test('names every programme with its rate and cohort size', () => {
    render(<ProgrammePlacementRateChart rates={rates} error="" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/Computer Science: 90% of 120 students, 108 placed/);
    expect(img).toHaveAccessibleName(/History: 25% of 40 students, 10 placed/);
    expect(img).toHaveAccessibleName(/Fine Art: 100% of 12 students, 12 placed/);
  });

  test('drops rows with no students rather than showing a 0% failure', () => {
    // The backend omits these, but if one ever arrived the chart must not plot
    // a 0% bar: nobody attends that programme, so 0% is not a placement failure.
    render(
      <ProgrammePlacementRateChart
        rates={[...rates, { programmeId: 4, programmeName: 'Marine Biology', total: 0, placed: 0, placementRatePct: 0 }]}
        error=""
      />,
    );

    expect(screen.getByRole('img')).not.toHaveAccessibleName(/Marine Biology/);
  });

  test('falls back to the programme code when the name is missing', () => {
    render(
      <ProgrammePlacementRateChart
        rates={[{ programmeId: 5, programmeName: null, programmeCode: 'ZZ', total: 10, placed: 5, placementRatePct: 50 }]}
        error=""
      />,
    );

    expect(screen.getByRole('img')).toHaveAccessibleName(/ZZ: 50% of 10 students, 5 placed/);
  });

  test('shows an empty state when there are no programme rates', () => {
    render(<ProgrammePlacementRateChart rates={[]} error="" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No programme data yet')).toBeInTheDocument();
  });

  test('tolerates a missing rates prop', () => {
    render(<ProgrammePlacementRateChart error="" />);

    expect(screen.getByText('No programme data yet')).toBeInTheDocument();
  });

test('shows a loading state instead of an empty rate list while in flight', () => {
    render(<ProgrammePlacementRateChart rates={[]} error="" loading />);

    expect(screen.queryByText('No programme data yet')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading placement rate by programme/i);
  });

  test('surfaces a load failure', () => {
    render(<ProgrammePlacementRateChart rates={[]} error="Unable to load stats." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load stats.');
  });
});
