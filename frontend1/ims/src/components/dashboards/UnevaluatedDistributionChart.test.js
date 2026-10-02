/**
 * PC12 chart 3: the unevaluated-student distribution.
 *
 * <p>The behaviour worth protecting is the mismatch disclosure. The backend is
 * tested to guarantee the buckets partition the cohort, so this chart should
 * never see a disagreement — but if it ever does, the chart has a choice between
 * plotting a distribution that silently omits students and saying so. It says so,
 * and that is pinned here because the failure is invisible: the bars still look
 * entirely reasonable.
 */
import { render, screen } from '@testing-library/react';
import UnevaluatedDistributionChart from './UnevaluatedDistributionChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const buckets = [
  { evaluationCount: 0, students: 4 },
  { evaluationCount: 1, students: 3 },
  { evaluationCount: 2, students: 1 },
  { evaluationCount: 3, students: 0 },
  { evaluationCount: 4, students: 2, label: '4+' },
];

beforeEach(() => jest.clearAllMocks());

describe('UnevaluatedDistributionChart', () => {
  test('plots every bucket in evaluation order', () => {
    render(<UnevaluatedDistributionChart buckets={buckets} totalStudents={10} error="" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/10 students/);
    expect(img).toHaveAccessibleName(/0 4/);
    expect(img).toHaveAccessibleName(/1 3/);
    // The empty bucket is named even though it has no bar.
    expect(img).toHaveAccessibleName(/3 0/);
  });

  test('uses the open-ended label for the capped bucket', () => {
    render(<UnevaluatedDistributionChart buckets={buckets} totalStudents={10} error="" />);

    // "4+" is the backend's label and must reach the axis and the description.
    expect(screen.getByRole('img')).toHaveAccessibleName(/4\+ 2/);
  });

  test('states a mismatch rather than plotting a distribution that loses students', () => {
    render(<UnevaluatedDistributionChart buckets={buckets} totalStudents={14} error="" />);

    // The buckets total 10 but the cohort is 14. Publishing the bars silently
    // would under-report exactly the students a supervisor needs to chase.
    expect(screen.getByRole('img')).toHaveAccessibleName(/buckets total 10 but the university has 14 students/);
  });

  test('says nothing about a mismatch when the figures agree', () => {
    render(<UnevaluatedDistributionChart buckets={buckets} totalStudents={10} error="" />);

    expect(screen.getByRole('img')).not.toHaveAccessibleName(/Note:/);
  });

  test('shows an empty state when no student has any evaluations recorded', () => {
    render(
      <UnevaluatedDistributionChart
        buckets={[{ evaluationCount: 0, students: 0 }]}
        totalStudents={0}
        error=""
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No students yet')).toBeInTheDocument();
  });

  test('surfaces a load failure', () => {
    render(<UnevaluatedDistributionChart buckets={[]} totalStudents={0} error="Unable to load stats." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load stats.');
  });
});
