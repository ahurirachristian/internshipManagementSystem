/**
 * PC6c gate: the student To Do list no longer ships fabricated data.
 *
 * <p>The list used to be seeded with seven lorem-ipsum QA notes ("Check
 * validation involves making sure all your tags are properly closed and
 * nested.", invented dates and all), so a student's "Completed: 2" counted
 * strings no one had written. The seed is gone; the list starts empty, the
 * three counters start at zero, and the milestone percentage — which was
 * always derived from the real /api/students/me/progress payload — is
 * unchanged, proving the fix did not touch real state.
 */
import { render, screen } from '@testing-library/react';
import InternshipProgress from './InternshipProgress';

jest.mock('../services/api', () => ({ API_ROOT: '' }));

global.fetch = jest.fn();

function progressResponds(payload) {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
}

afterEach(() => {
  global.fetch.mockReset();
});

it('opens on an explicit empty state instead of invented tasks', async () => {
  progressResponds({ startDate: false, diaryCount: 0, midTerm: false, finalReport: false });

  render(<InternshipProgress />);

  expect(await screen.findByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
  expect(
    screen.queryByText(/tags are properly closed and nested/),
  ).not.toBeInTheDocument();
});

it('reads zero in all three task counters rather than the old 7/2/2', async () => {
  progressResponds({ startDate: false, diaryCount: 0, midTerm: false, finalReport: false });

  render(<InternshipProgress />);

  await screen.findByText('To Do List');

  // All Task, Completed and In Process chips each hold exactly zero.
  expect(screen.getAllByText('0')).toHaveLength(3);
});

it('leaves the milestone percentage driven by the real progress payload', async () => {
  // Six real diary entries complete the logbook step and the >=5 diary-count
  // threshold for mid-term, so 2 of 4 milestones = 50%. Before and after this
  // fix the percentage never depended on the task list.
  progressResponds({ startDate: false, diaryCount: 6, midTerm: false, finalReport: false });

  render(<InternshipProgress />);

  expect(await screen.findByText('50%')).toBeInTheDocument();
  expect(screen.getByText(/6 diary entries/)).toBeInTheDocument();
});
