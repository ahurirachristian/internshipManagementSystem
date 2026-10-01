/**
 * PC5 accessibility: the dashboard tab strip.
 *
 * <p>The tabs were plain buttons, which left a keyboard user tabbing past every tab
 * to reach the panel — with six tabs on the university dashboard that is most of the
 * focus ring spent on navigation. This pins the WAI-ARIA tabs pattern: a tablist, a
 * single tab stop, arrow-key movement that wraps, and Home/End jumps.
 */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardLayout from './DashboardLayout';

jest.mock('./layout/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('./layout/Header', () => ({ Header: () => null }));
jest.mock('./layout/Breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('./layout/FloatingToolbar', () => ({ FloatingToolbar: () => null }));
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ primaryColor: '#0a4d4c', isDark: false }),
}));

const TABS = [
  { id: 'students', label: 'Students' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'diaries', label: 'Diaries' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'academic', label: 'Academic Structure' },
];

function setup(activeTab = 'students') {
  function Harness() {
    const [tab, setTab] = useState(activeTab);
    return (
      <DashboardLayout
        title="University Dashboard"
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        <p>Panel for {tab}</p>
      </DashboardLayout>
    );
  }
  return render(<Harness />);
}

describe('dashboard tab strip', () => {
  test('exposes a labelled tablist with one panel per view', () => {
    setup();

    const tablist = screen.getByRole('tablist', { name: 'University Dashboard sections' });
    expect(tablist).toBeInTheDocument();

    const panel = screen.getByRole('tabpanel');
    // The panel has to name its tab, or a screen reader announces it as a bare region.
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-students');
  });

  test('keeps a single tab stop so arrows, not Tab, move between tabs', () => {
    setup();

    // Only the selected tab is reachable by Tab; the rest are arrow-key only.
    expect(screen.getByRole('tab', { name: 'Students' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'Academic Structure' })).toHaveAttribute('tabindex', '-1');
  });

  test('moves right with ArrowRight and wraps at the end', () => {
    setup('academic');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-students');
  });

  test('moves left with ArrowLeft and wraps at the start', () => {
    setup('students');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-academic');
  });

  test('jumps to the ends with Home and End', () => {
    setup('students');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-academic');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-students');
  });

  test('moves focus along with the selection, since only the selected tab is focusable', async () => {
    setup('students');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });

    const analyticsTab = screen.getByRole('tab', { name: 'Analytics' });
    expect(analyticsTab).toHaveAttribute('tabindex', '0');
    // Focus follows on the next frame, after React has committed the new selection.
    await waitFor(() => expect(analyticsTab).toHaveFocus());
  });

  test('leaves ordinary keys to the page instead of hijacking them', () => {
    setup('students');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'a' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-students');
  });

  test('renders children without a tabpanel when the layout has no tabs', () => {
    render(
      <DashboardLayout title="Plain Page">
        <p>No tabs here</p>
      </DashboardLayout>
    );

    expect(screen.getByText('No tabs here')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
