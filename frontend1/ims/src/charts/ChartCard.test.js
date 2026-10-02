/**
 * PC12: the shared chart primitives, pinned before eight new charts depend on
 * them.
 *
 * <p>These assertions exist because the contract is easy to break while writing
 * a chart and hard to notice. The failure mode is subtle: a chart that passes a
 * summary still renders, still looks correct, and silently drops out of
 * accessibility entirely. Pinning it here means the eight PC12 charts inherit a
 * tested contract instead of a convention.
 */
import { render, screen } from '@testing-library/react';
import { ChartCard, ChartEmpty } from './ChartCard';

describe('ChartCard', () => {
  test('exposes the chart as an image described by its summary', () => {
    render(
      <ChartCard title="Placement Status" subtitle="Lifecycle distribution" summary="3 placed, 1 cancelled.">
        <svg data-testid="plot" />
      </ChartCard>,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName('3 placed, 1 cancelled.');
    expect(screen.getByRole('heading', { name: 'Placement Status' })).toBeInTheDocument();
  });

  test('leaves the empty state readable instead of hiding it behind an image role', () => {
    // No summary means nothing is plotted, so announcing an image would replace
    // a readable explanation with an absent label.
    render(
      <ChartCard title="Placement Status" subtitle="Lifecycle distribution">
        <ChartEmpty message="No placement data yet" />
      </ChartCard>,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No placement data yet')).toBeInTheDocument();
  });

  test('renders the subtitle as context for the chart', () => {
    render(
      <ChartCard title="Title" subtitle="What this measures" summary="A summary.">
        <svg />
      </ChartCard>,
    );

    expect(screen.getByText('What this measures')).toBeInTheDocument();
  });
});

describe('ChartEmpty', () => {
  test('states the reason rather than showing a blank box', () => {
    render(<ChartEmpty message="No evaluation scores yet" />);
    expect(screen.getByText('No evaluation scores yet')).toBeInTheDocument();
  });
});
