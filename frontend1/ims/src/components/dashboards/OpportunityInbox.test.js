/**
 * S4.3 + S5.1 (opportunity plan §8.5/§8.6): the super-admin moderation inbox UI.
 *
 * The contract under test is the wiring of S4.1 + S4.2 + S5.1: the list comes
 * from the server's inbox, every verdict carries its note to the transition
 * endpoint, a blank note cannot be sent, and a server refusal is shown
 * verbatim with the row left in place — the client never papers over the
 * server's decision. A verify then steps into the S5.1 offer panel, where a
 * rejection still retires the row outright.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpportunityInbox from './OpportunityInbox';

jest.mock('../../services/api', () => ({
  fetchOpportunityInbox: jest.fn(),
  fetchUniversities: jest.fn(),
  offerToUniversities: jest.fn(),
  transitionOpportunity: jest.fn(),
}));

jest.mock('../layout/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('../layout/Header', () => ({ Header: () => null }));
jest.mock('../layout/Breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('../layout/FloatingToolbar', () => ({ FloatingToolbar: () => null }));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ primaryColor: '#0a4d4c', isDark: false }),
}));

const { fetchOpportunityInbox, fetchUniversities, offerToUniversities, transitionOpportunity } =
  require('../../services/api');

const TWO_AWAITING = [
  {
    id: 1,
    title: 'Data intern',
    origin: 'COMPANY',
    companyId: 42,
    deadline: '2026-12-31',
    status: 'PENDING_REVIEW',
    verificationStatus: 'UNVERIFIED',
  },
  {
    id: 2,
    title: 'Lab assistant',
    origin: 'SUPERVISOR',
    externalOrgName: 'Kololo Labs',
    status: 'PENDING_REVIEW',
    verificationStatus: 'UNVERIFIED',
  },
];

const noteField = () => screen.getByLabelText(/Verification note/);
const record = () => fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));

const THREE_UNIVERSITIES = [
  { universityId: 11, shortForm: 'MAK', fullName: 'Makerere University' },
  { universityId: 12, shortForm: 'KYU', fullName: 'Kyambogo University' },
  { universityId: 13, shortForm: 'MUST', fullName: 'Mbarara University of Science and Technology' },
];

/** Walk one row through the verify verdict into the S5.1 offer panel. */
async function verifyIntoOfferPanel(title = 'Data intern') {
  fireEvent.click(await screen.findByRole('button', { name: `Verify ${title}` }));
  fireEvent.change(noteField(), { target: { value: 'Evidence checked and legit' } });
  record();
  expect(await screen.findByText('Offer to universities')).toBeInTheDocument();
}

describe('OpportunityInbox', () => {
  test('lists every advert awaiting a verdict', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    render(<OpportunityInbox />);

    expect(await screen.findByText('Data intern')).toBeInTheDocument();
    expect(screen.getByText('Lab assistant')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Opportunities awaiting review' })).toBeInTheDocument();
    // Origin and provenance are part of what the moderator judges by.
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Kololo Labs')).toBeInTheDocument();
    expect(fetchOpportunityInbox).toHaveBeenCalledTimes(1);
  });

  test('verify sends the note to the transition endpoint, then opens the offer panel', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    fetchUniversities.mockResolvedValue(THREE_UNIVERSITIES);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    render(<OpportunityInbox />);

    await verifyIntoOfferPanel();

    await waitFor(() =>
      expect(transitionOpportunity).toHaveBeenCalledWith(
        1,
        'PUBLISHED',
        'Evidence checked and legit',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/is now PUBLISHED/);
    // Verified rows step into the offer panel instead of leaving the queue.
    expect(screen.getByRole('button', { name: 'Send offers' })).toBeInTheDocument();
    expect(screen.getByText('Makerere University')).toBeInTheDocument();
    // The other row is untouched.
    expect(screen.getByRole('button', { name: 'Reject Lab assistant' })).toBeInTheDocument();
  });

  test('reject walks the same form to the REJECTED target and retires the row', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    transitionOpportunity.mockResolvedValue({ id: 2, status: 'REJECTED' });
    render(<OpportunityInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject Lab assistant' }));
    fireEvent.change(noteField(), { target: { value: 'No evidence behind this offer' } });
    record();

    await waitFor(() =>
      expect(transitionOpportunity).toHaveBeenCalledWith(
        2,
        'REJECTED',
        'No evidence behind this offer',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/is now REJECTED/);
    // Nothing to broadcast: the rejected row leaves the queue outright.
    expect(screen.queryByText('Lab assistant')).not.toBeInTheDocument();
    expect(screen.queryByText('Offer to universities')).not.toBeInTheDocument();
  });

  test('a blank note cannot be sent', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    render(<OpportunityInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Verify Data intern' }));
    const confirm = screen.getByRole('button', { name: 'Record decision' });
    expect(confirm).toBeDisabled();

    // Whitespace is still blank as far as the verdict is concerned.
    fireEvent.change(noteField(), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(noteField(), { target: { value: 'Legit' } });
    expect(confirm).toBeEnabled();
    expect(transitionOpportunity).not.toHaveBeenCalled();
  });

  test('a server refusal is shown verbatim and the row stays queued', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    transitionOpportunity.mockRejectedValue(
      new Error('A verification note is required — record why the advert was approved or rejected.'),
    );
    render(<OpportunityInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject Data intern' }));
    fireEvent.change(noteField(), { target: { value: 'Looks good' } });
    record();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A verification note is required — record why the advert was approved or rejected.',
    );
    // The row stays queued and the form stays open to retry — no silent success.
    expect(screen.getByText('Data intern')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // --- S5.1: the offer broadcast ---

  test('offers the selected universities with the note and retires the row', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    fetchUniversities.mockResolvedValue(THREE_UNIVERSITIES);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    offerToUniversities.mockResolvedValue([{ id: 90 }, { id: 91 }]);
    render(<OpportunityInbox />);

    await verifyIntoOfferPanel();
    fireEvent.click(screen.getByRole('checkbox', { name: /Makerere University/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Kyambogo University/ }));
    fireEvent.change(screen.getByLabelText(/Offer note/), {
      target: { value: 'Strong ICT cohort' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send offers' }));

    await waitFor(() =>
      expect(offerToUniversities).toHaveBeenCalledWith(1, [11, 12], 'Strong ICT cohort'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Offered “Data intern” to 2 universities/,
    );
    // The broadcast row leaves the queue; the untouched one stays.
    expect(screen.queryByText('Data intern')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject Lab assistant' })).toBeInTheDocument();
  });

  test('offers cannot be sent without a university selected', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    fetchUniversities.mockResolvedValue(THREE_UNIVERSITIES);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    render(<OpportunityInbox />);

    await verifyIntoOfferPanel();
    const send = screen.getByRole('button', { name: 'Send offers' });
    expect(send).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Makerere University/ }));
    expect(send).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Makerere University/ }));
    expect(send).toBeDisabled();
    expect(offerToUniversities).not.toHaveBeenCalled();
  });

  test('a server refusal on the offer is shown verbatim and the row stays', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    fetchUniversities.mockResolvedValue(THREE_UNIVERSITIES);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    offerToUniversities.mockRejectedValue(
      new Error('This opportunity has already been offered to university 11.'),
    );
    render(<OpportunityInbox />);

    await verifyIntoOfferPanel();
    fireEvent.click(screen.getByRole('checkbox', { name: /Makerere University/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send offers' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This opportunity has already been offered to university 11.',
    );
    // No silent success: the panel is still open and the row still queued,
    // and nothing claims the offer was sent (the earlier verify notice may stay).
    expect(screen.getByRole('button', { name: 'Send offers' })).toBeInTheDocument();
    expect(screen.getByText('Data intern')).toBeInTheDocument();
    expect(screen.queryByText(/Offered “Data intern”/)).not.toBeInTheDocument();
  });

  test('dismiss retires a verified row without offering it anywhere', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    fetchUniversities.mockResolvedValue(THREE_UNIVERSITIES);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    render(<OpportunityInbox />);

    await verifyIntoOfferPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Data intern')).not.toBeInTheDocument();
    expect(screen.queryByText('Offer to universities')).not.toBeInTheDocument();
    expect(offerToUniversities).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reject Lab assistant' })).toBeInTheDocument();
  });

  test('an empty inbox explains itself instead of showing a bare table', async () => {
    fetchOpportunityInbox.mockResolvedValue([]);
    render(<OpportunityInbox />);

    expect(
      await screen.findByText('No opportunities are waiting for review'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Opportunities awaiting review' })).not.toBeInTheDocument();
  });

  test('a failed load surfaces verbatim', async () => {
    fetchOpportunityInbox.mockRejectedValue(new Error('Access denied'));
    render(<OpportunityInbox />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  });
});
