/**
 * S6.1 (opportunity plan §8.7): the university supervisor's offer inbox UI.
 *
 * The contract under test is the wiring of S5.2: the list comes from the
 * server's session-scoped offers, each answer carries its verb to the respond
 * endpoint, an already-offered row keeps its outcome instead of vanishing, and
 * a server refusal (404 because someone beat us to it, 409 because it was
 * already answered) is shown verbatim with the row untouched.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OfferInbox from './OfferInbox';

jest.mock('../../services/api', () => ({
  fetchOfferInbox: jest.fn(),
  respondToOffer: jest.fn(),
}));

jest.mock('../layout/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('../layout/Header', () => ({ Header: () => null }));
jest.mock('../layout/Breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('../layout/FloatingToolbar', () => ({ FloatingToolbar: () => null }));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ primaryColor: '#0a4d4c', isDark: false }),
}));

const { fetchOfferInbox, respondToOffer } = require('../../services/api');

const TWO_OFFERS = [
  {
    id: 31,
    vacancyId: 4,
    universityId: 777,
    status: 'OFFERED',
    note: 'Best fit for your ICT cohort',
    offeredAt: '2026-10-01T09:00:00',
    respondedAt: null,
    responseNote: null,
  },
  {
    id: 32,
    vacancyId: 5,
    universityId: 777,
    status: 'OFFERED',
    offeredAt: '2026-10-02T09:00:00',
    respondedAt: null,
    responseNote: null,
  },
];

const record = () => fireEvent.click(screen.getByRole('button', { name: /Record (acceptance|decline)/ }));

describe('OfferInbox', () => {
  test('lists this university offers with provenance and status', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    render(<OfferInbox />);

    expect(await screen.findByText('Opportunity #4')).toBeInTheDocument();
    expect(screen.getByText('Opportunity #5')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Offers for your university' })).toBeInTheDocument();
    // The super admin's note is part of what the supervisor decides by.
    expect(screen.getByText(/Best fit for your ICT cohort/)).toBeInTheDocument();
    expect(screen.getAllByText('OFFERED')).toHaveLength(2);
    expect(fetchOfferInbox).toHaveBeenCalledTimes(1);
  });

  test('accept sends ACCEPTED to the respond endpoint and updates the row', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    respondToOffer.mockResolvedValue({ id: 31, status: 'ACCEPTED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Accept offer 31' }));
    fireEvent.change(screen.getByLabelText(/Note/), {
      target: { value: 'Sharing with ICT year 3' },
    });
    record();

    await waitFor(() =>
      expect(respondToOffer).toHaveBeenCalledWith(
        4,
        31,
        'ACCEPTED',
        'Sharing with ICT year 3',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Offer 31 is now ACCEPTED/);
    // The answered row keeps its outcome; the other one is still open.
    expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept offer 32' })).toBeInTheDocument();
    // Its controls are gone: a second answer would be a 409.
    expect(screen.queryByRole('button', { name: 'Accept offer 31' })).not.toBeInTheDocument();
  });

  test('decline walks the same form to the DECLINED verb', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    respondToOffer.mockResolvedValue({ id: 32, status: 'DECLINED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Decline offer 32' }));
    record();

    await waitFor(() =>
      expect(respondToOffer).toHaveBeenCalledWith(5, 32, 'DECLINED', undefined),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Offer 32 is now DECLINED/);
  });

  test('the note is optional — an empty answer still reaches the endpoint', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    respondToOffer.mockResolvedValue({ id: 31, status: 'ACCEPTED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Accept offer 31' }));
    const confirm = screen.getByRole('button', { name: 'Record acceptance' });
    expect(confirm).toBeEnabled();
    record();

    await waitFor(() =>
      expect(respondToOffer).toHaveBeenCalledWith(4, 31, 'ACCEPTED', undefined),
    );
  });

  test('a server refusal is shown verbatim and the offer stays open', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    respondToOffer.mockRejectedValue(new Error('Offer not found.'));
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Decline offer 31' }));
    record();

    expect(await screen.findByRole('alert')).toHaveTextContent('Offer not found.');
    // No silent success: still OFFERED, the form stays open to retry, and
    // nothing claims an answer was recorded.
    expect(screen.getAllByText('OFFERED')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Record decline' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('an answered offer keeps its outcome and its controls disappear', async () => {
    fetchOfferInbox.mockResolvedValue([
      { ...TWO_OFFERS[0], status: 'DECLINED', responseNote: 'No slots left' },
    ]);
    render(<OfferInbox />);

    expect(await screen.findByText('DECLINED')).toBeInTheDocument();
    expect(screen.getByText(/Your note: No slots left/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept offer 31' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline offer 31' })).not.toBeInTheDocument();
  });

  test('an empty inbox explains itself instead of showing a bare table', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    render(<OfferInbox />);

    expect(
      await screen.findByText('No opportunities have been offered to your university yet'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Offers for your university' }),
    ).not.toBeInTheDocument();
  });

  test('a failed load surfaces verbatim', async () => {
    fetchOfferInbox.mockRejectedValue(new Error('Access denied'));
    render(<OfferInbox />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  });
});
