/**
 * PC12 chart 1: the student's own evaluation scores.
 *
 * <p>The tests that matter are the ones about missing data. Every criterion is
 * a nullable Integer that a supervisor may legitimately leave blank, and the
 * obvious implementation — averaging with `|| 0` — is wrong in a way no visual
 * check would catch: it shows a student a lower mean than they were actually
 * awarded, for criteria nobody scored. So the blank-handling cases are pinned
 * directly.
 */
import { render, screen } from '@testing-library/react';
import EvaluationScoresChart from './EvaluationScoresChart';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const full = {
  punctuality: 8,
  practicalWorkEthics: 7,
  attendance: 9,
  workplacePerformance: 8,
  logbookQuality: 6,
  academicReport: 7,
  presentation: 8,
};

beforeEach(() => jest.clearAllMocks());

describe('EvaluationScoresChart', () => {
  test('averages each criterion across the evaluations that scored it', () => {
    render(
      <EvaluationScoresChart
        evaluations={[{ ...full }, { ...full, punctuality: 4, attendance: 6 }]}
        error=""
      />,
    );

    // Punctuality (8,4) and attendance (9,6) average; others are single-valued.
    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName(/Punctuality 6/);
    expect(img).toHaveAccessibleName(/Attendance 7.5/);
    expect(img).toHaveAccessibleName(/Work Ethics 7/);
  });

  test('does not treat an unscored criterion as a zero', () => {
    // One evaluation scored every criterion except work ethics. Counting the
    // null as 0 would report "Work Ethics 0", telling the student they scored
    // nothing when they were simply not assessed on it.
    render(
      <EvaluationScoresChart
        evaluations={[{ ...full, practicalWorkEthics: null }]}
        error=""
      />,
    );

    const img = screen.getByRole('img');
    expect(img).not.toHaveAccessibleName(/Work Ethics 0/);
    expect(img).toHaveAccessibleName(/Punctuality 8/);
  });

  test('shows an empty state when there are no evaluations at all', () => {
    render(<EvaluationScoresChart evaluations={[]} error="" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No evaluation scores yet')).toBeInTheDocument();
  });

  test('shows an empty state when evaluations exist but none scored a criterion', () => {
    render(
      <EvaluationScoresChart
        evaluations={[{ id: 1, punctuality: null, attendance: null }]}
        error=""
      />,
    );

    expect(screen.getByText('No evaluation scores yet')).toBeInTheDocument();
  });

  test('surfaces a load failure without blanking the card', () => {
    render(<EvaluationScoresChart evaluations={[]} error="Unable to load your evaluation scores." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load your evaluation scores.');
    // The title survives so the student knows which card failed.
    expect(screen.getByText('My Evaluation Scores')).toBeInTheDocument();
  });

  test('states the scale in the chart description', () => {
    render(<EvaluationScoresChart evaluations={[{ ...full }]} error="" />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/out of 10/);
  });
});
