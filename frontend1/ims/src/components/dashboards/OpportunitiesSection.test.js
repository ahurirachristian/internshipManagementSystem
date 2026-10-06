/**
 * S7.2 (opportunity plan §8.8): the student's opportunity tab.
 *
 * Two claims, both asserted from the outside: the tab renders the *scoped*
 * S6.4 feed (share note, zero-filled counts, Apply honouring the server's
 * `applied` flag), and — with a fetch spy — `fetchVacancies` is never called
 * from student code. The second one is the security claim: D1's leaky
 * `GET /api/vacancies` stays live until S7.4, and "the code looks repointed"
 * is not evidence that the student stopped calling it.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import OpportunitiesSection from './OpportunitiesSection';

jest.mock('../../services/api', () => ({
  fetchOpportunityFeed: jest.fn(),
  fetchApplications: jest.fn(),
  applyToVacancy: jest.fn(),
  fetchVacancies: jest.fn(),
}));

const {
  fetchOpportunityFeed,
  fetchApplications,
  applyToVacancy,
  fetchVacancies,
} = require('../../services/api');

const FEED = [
  {
    id: 4,
    shareId: 41,
    title: 'Frontend intern',
    description: 'Build components with the team.',
    location: 'Kampala',
    deadline: '2026-12-31',
    status: 'PUBLISHED',
    externalOrgName: 'Kololo Labs',
    workMode: 'HYBRID',
    shareNote: 'Shared with the ICT cohort',
    sharedAt: '2026-10-01T09:00:00',
    applied: false,
    applicationCount: 0,
  },
  {
    id: 5,
    shareId: 42,
    title: 'Data intern',
    description: 'Clean and chart programme data.',
    location: 'Kampala',
    deadline: '2026-11-30',
    status: 'PUBLISHED',
    externalOrgName: null,
    workMode: 'ONSITE',
    shareNote: null,
    sharedAt: '2026-10-02T09:00:00',
    applied: true,
    applicationCount: 2,
  },
];

describe('OpportunitiesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchApplications.mockResolvedValue([]);
  });

  test('renders the scoped feed and never touches the legacy vacancy list', async () => {
    fetchOpportunityFeed.mockResolvedValue(FEED);
    render(<OpportunitiesSection />);

    expect(await screen.findByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByText('Data intern')).toBeInTheDocument();
    expect(fetchOpportunityFeed).toHaveBeenCalledTimes(1);

    // The security claim: student code never calls the D1 leaky list.
    expect(fetchVacancies).not.toHaveBeenCalled();

    // Feed-specific context the legacy list never had.
    expect(screen.getByText(/Shared with the ICT cohort/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply for Frontend intern' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Apply for Data intern' })).toBeDisabled();
  });

  test('applying through a feed item refreshes and shows the Applied state', async () => {
    fetchOpportunityFeed
      .mockResolvedValueOnce(FEED)
      .mockResolvedValueOnce(FEED.map((item) => (item.id === 4 ? { ...item, applied: true } : item)));
    applyToVacancy.mockResolvedValue({ id: 90, status: 'SUBMITTED' });
    render(<OpportunitiesSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Apply for Frontend intern' }));

    expect(await screen.findByText('Applied for "Frontend intern".')).toBeInTheDocument();
    expect(applyToVacancy).toHaveBeenCalledWith(4);
    // The feed is reloaded so `applied` comes back from the server, not from hope.
    expect(fetchOpportunityFeed).toHaveBeenCalledTimes(2);
    expect(fetchVacancies).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Apply for Frontend intern' })).toBeDisabled();
  });

  test('zero-filled feed metadata renders as zero, never interpolated', async () => {
    fetchOpportunityFeed.mockResolvedValue([FEED[0]]);
    render(<OpportunitiesSection />);

    expect(await screen.findByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByText('0 applicants')).toBeInTheDocument();
  });

  test('my applications render the server-side state verbatim', async () => {
    fetchOpportunityFeed.mockResolvedValue([]);
    fetchApplications.mockResolvedValue([
      {
        id: 90,
        vacancyId: 4,
        vacancyTitle: 'Frontend intern',
        status: 'SUBMITTED',
        createdAt: '2026-10-03T09:00:00',
      },
    ]);
    render(<OpportunitiesSection />);

    expect(await screen.findByText('No opportunities have been shared with you yet.'))
      .toBeInTheDocument();
    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText(/Submitted 2026-10-03/)).toBeInTheDocument();
  });

  test('a failed feed load is shown verbatim', async () => {
    fetchOpportunityFeed.mockRejectedValue(new Error('Opportunity not found.'));
    render(<OpportunitiesSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Opportunity not found.');
    expect(fetchVacancies).not.toHaveBeenCalled();
  });
});
