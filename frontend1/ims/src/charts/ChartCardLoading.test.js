/**
 * PC12: the loading state that all eight charts were missing.
 *
 * <p>Before this existed, every PC12 chart rendered its empty state while its
 * request was still in flight. That is a claim about the data — "No students
 * yet", "Nothing to chart" — made before anybody had asked the question, and it
 * is indistinguishable from a genuine empty result once it reaches the screen.
 *
 * <p>These tests pin the three states as genuinely distinct, because the whole
 * value of the distinction is lost if two of them render the same thing.
 */
import { render, screen } from '@testing-library/react';
import { ChartCard, ChartEmpty, ChartLoading } from './ChartCard';

beforeEach(() => jest.clearAllMocks());

describe('ChartCard loading state', () => {
  test('announces loading instead of claiming the data is empty', () => {
    render(
      <ChartCard title="Students by University" subtitle="Largest first" loading>
        <ChartEmpty message="No students registered yet" />
      </ChartCard>,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/loading students by university/i);
    // The empty state is a statement about reality; showing it while the request
    // is pending is exactly the failure being fixed.
    expect(screen.queryByText('No students registered yet')).not.toBeInTheDocument();
  });

  test('is polite so it does not interrupt a screen reader mid-sentence', () => {
    render(
      <ChartCard title="Diary Backlog" subtitle="By university" loading>
        <div />
      </ChartCard>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  test('loading and empty are different states, not the same markup', () => {
    const { rerender } = render(
      <ChartCard title="Coverage" subtitle="By university" loading>
        <ChartEmpty message="No placement data yet" />
      </ChartCard>,
    );
    expect(screen.queryByText('No placement data yet')).not.toBeInTheDocument();

    rerender(
      <ChartCard title="Coverage" subtitle="By university" loading={false}>
        <ChartEmpty message="No placement data yet" />
      </ChartCard>,
    );
    expect(screen.getByText('No placement data yet')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('renders children once loading finishes, including the image role', () => {
    render(
      <ChartCard title="Coverage" subtitle="By university" summary="10 students" loading={false}>
        <svg />
      </ChartCard>,
    );

    expect(screen.getByRole('img')).toHaveAccessibleName('10 students');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('ChartLoading stands alone for charts that render their own shell', () => {
    render(<ChartLoading label="Placement Pace" />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading placement pace/i);
  });

  test('ChartLoading degrades to a generic message with no label', () => {
    render(<ChartLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading chart/i);
  });
});
