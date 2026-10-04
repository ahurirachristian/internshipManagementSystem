/**
 * S4.3 (opportunity plan §8.5): the super-admin moderation inbox UI.
 *
 * The contract under test is the wiring of S4.1 + S4.2: the list comes from
 * the server's inbox, every verdict carries its note to the transition
 * endpoint, a blank note cannot be sent, and a server refusal is shown
 * verbatim with the row left in place — the client never papers over the
 * server's decision.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpportunityInbox from './OpportunityInbox';

jest.mock('../../services/api', () => ({
  fetchOpportunityInbox: jest.fn(),
  transitionOpportunity: jest.fn(),
}));

jest.mock('../layout/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('../layout/Header', () => ({ Header: () => null }));
jest.mock('../layout/Breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('../layout/FloatingToolbar', () => ({ FloatingToolbar: () => null }));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ primaryColor: '#0a4d4c', isDark: false }),
}));

const { fetchOpportunityInbox, transitionOpportunity } = require('../../services/api');

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

  test('verify sends the note to the transition endpoint and retires the row', async () => {
    fetchOpportunityInbox.mockResolvedValue(TWO_AWAITING);
    transitionOpportunity.mockResolvedValue({ id: 1, status: 'PUBLISHED' });
    render(<OpportunityInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Verify Data intern' }));
    fireEvent.change(noteField(), { target: { value: 'Evidence checked and legit' } });
    record();

    await waitFor(() =>
      expect(transitionOpportunity).toHaveBeenCalledWith(
        1,
        'PUBLISHED',
        'Evidence checked and legit',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/is now PUBLISHED/);
    // The decided row leaves the queue; the other one stays.
    expect(screen.queryByRole('button', { name: 'Verify Data intern' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject Lab assistant' })).toBeInTheDocument();
  });

  test('reject walks the same form to the REJECTED target', async () => {
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
