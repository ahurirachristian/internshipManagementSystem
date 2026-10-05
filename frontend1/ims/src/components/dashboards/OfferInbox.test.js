/**
 * S6.1/S6.3 (opportunity plan §8.7): the university supervisor's inbox UI.
 *
 * The contract under test is the wiring of S5.2/S6.2/S6.3: the lists come from
 * the server's session-scoped endpoints, each answer or verdict carries its
 * verb to the respond endpoint, an already-handled row keeps its outcome
 * instead of vanishing, and every server refusal (404 because someone beat us
 * to it, 409 because it was already answered, 400 because a share would widen
 * the offered audience [§5.8]) is shown verbatim with the row and form
 * untouched. Sharing targets reach the endpoint as comma-separated id lists,
 * and empty targeting means "the whole university" — sent as no target at all.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OfferInbox from './OfferInbox';

jest.mock('../../services/api', () => ({
  fetchOfferInbox: jest.fn(),
  respondToOffer: jest.fn(),
  fetchSubmissionQueue: jest.fn(),
  respondToSubmission: jest.fn(),
  shareOpportunity: jest.fn(),
}));

jest.mock('../layout/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('../layout/Header', () => ({ Header: () => null }));
jest.mock('../layout/Breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('../layout/FloatingToolbar', () => ({ FloatingToolbar: () => null }));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ primaryColor: '#0a4d4c', isDark: false }),
}));

const {
  fetchOfferInbox,
  respondToOffer,
  fetchSubmissionQueue,
  respondToSubmission,
  shareOpportunity,
} = require('../../services/api');

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
const recordReview = () =>
  fireEvent.click(screen.getByRole('button', { name: /Record (approval|rejection)/ }));

const TWO_SUBMISSIONS = [
  {
    id: 71,
    vacancyId: 6,
    universityId: 777,
    status: 'PENDING',
    note: 'Found this at a local NGO',
    submittedAt: '2026-10-03T09:00:00',
    reviewNote: null,
  },
  {
    id: 72,
    vacancyId: 7,
    universityId: 777,
    status: 'PENDING',
    submittedAt: '2026-10-04T09:00:00',
    reviewNote: null,
  },
];

const ACCEPTED_OFFER = {
  id: 33,
  vacancyId: 4,
  universityId: 777,
  status: 'ACCEPTED',
  offeredAt: '2026-10-01T09:00:00',
  respondedAt: '2026-10-02T09:00:00',
};

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

  // --- S6.3: the review queue ---

  test('lists pending proposals in the review queue', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    fetchSubmissionQueue.mockResolvedValue(TWO_SUBMISSIONS);
    render(<OfferInbox />);

    expect(
      await screen.findByRole('list', { name: 'Submissions awaiting review' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Opportunity #6')).toBeInTheDocument();
    expect(screen.getByText(/Found this at a local NGO/)).toBeInTheDocument();
    expect(screen.getAllByText('PENDING')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Approve submission/ })).toHaveLength(2);
    // Both lists empty is what the empty state waits for — one is enough.
    expect(screen.queryByText('No opportunities have been offered')).not.toBeInTheDocument();
  });

  test('approve sends APPROVED to the review endpoint and unlocks sharing', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    fetchSubmissionQueue.mockResolvedValue(TWO_SUBMISSIONS);
    respondToSubmission.mockResolvedValue({ id: 71, status: 'APPROVED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve submission 71' }));
    recordReview();

    await waitFor(() =>
      expect(respondToSubmission).toHaveBeenCalledWith(6, 71, 'APPROVED', undefined),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Submission 71 is now APPROVED/);
    // The verdict sticks, the review controls are gone, and the approved
    // proposal may now be shared — the S6.3 hop this verdict unlocks.
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve submission 71' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Share opportunity 6 with students' }),
    ).toBeInTheDocument();
  });

  test('reject walks the same form to REJECTED with an optional note', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    fetchSubmissionQueue.mockResolvedValue(TWO_SUBMISSIONS);
    respondToSubmission.mockResolvedValue({ id: 72, status: 'REJECTED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject submission 72' }));
    fireEvent.change(screen.getByLabelText(/Note/), {
      target: { value: 'Not enough detail to onboard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record rejection' }));

    await waitFor(() =>
      expect(respondToSubmission).toHaveBeenCalledWith(
        7,
        72,
        'REJECTED',
        'Not enough detail to onboard',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Submission 72 is now REJECTED/);
    // A rejected proposal has nothing to share.
    expect(
      screen.queryByRole('button', { name: 'Share opportunity 7 with students' }),
    ).not.toBeInTheDocument();
  });

  test('a review refusal is shown verbatim and the proposal stays pending', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    fetchSubmissionQueue.mockResolvedValue(TWO_SUBMISSIONS);
    respondToSubmission.mockRejectedValue(new Error('Submission not found.'));
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve submission 71' }));
    recordReview();

    expect(await screen.findByRole('alert')).toHaveTextContent('Submission not found.');
    // No silent success: still PENDING, the form stays open to retry.
    expect(screen.getAllByText('PENDING')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Record approval' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // --- S6.3: sharing with the students ---

  test('an accepted offer can be shared with parsed targeting', async () => {
    fetchOfferInbox.mockResolvedValue([ACCEPTED_OFFER]);
    fetchSubmissionQueue.mockResolvedValue([]);
    shareOpportunity.mockResolvedValue({ id: 9, status: 'SHARED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Share opportunity 4 with students' }));
    fireEvent.change(screen.getByLabelText(/Share note/), {
      target: { value: 'Shared with ICT cohort' },
    });
    fireEvent.change(screen.getByLabelText(/Programme ids/), {
      target: { value: '93201, 93202' },
    });
    fireEvent.change(screen.getByLabelText(/Years of study/), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Share with students' }));

    await waitFor(() =>
      expect(shareOpportunity).toHaveBeenCalledWith(
        4,
        { programmeIds: ['93201', '93202'], yearsOfStudy: ['3'] },
        'Shared with ICT cohort',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Opportunity #4 is now shared with your students.',
    );
    // The offer moved on: SHARED chip, no second share button.
    expect(screen.getByText('SHARED')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Share opportunity 4 with students' }),
    ).not.toBeInTheDocument();
  });

  test('sharing without targeting sends no target at all', async () => {
    fetchOfferInbox.mockResolvedValue([ACCEPTED_OFFER]);
    fetchSubmissionQueue.mockResolvedValue([]);
    shareOpportunity.mockResolvedValue({ id: 10, status: 'SHARED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Share opportunity 4 with students' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share with students' }));

    await waitFor(() =>
      expect(shareOpportunity).toHaveBeenCalledWith(4, undefined, undefined),
    );
  });

  test('a share refusal is shown verbatim and the form stays open', async () => {
    fetchOfferInbox.mockResolvedValue([ACCEPTED_OFFER]);
    fetchSubmissionQueue.mockResolvedValue([]);
    shareOpportunity.mockRejectedValue(
      new Error(
        'A share may narrow the offered audience, never widen it — the programme targeting is wider than what was offered.',
      ),
    );
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Share opportunity 4 with students' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share with students' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A share may narrow the offered audience, never widen it',
    );
    // No silent success: the form is still there to retry, and nothing claims
    // the students were told.
    expect(screen.getByRole('button', { name: 'Share with students' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('SHARED')).not.toBeInTheDocument();
  });

  test('an approved proposal can be shared too', async () => {
    fetchOfferInbox.mockResolvedValue([]);
    fetchSubmissionQueue.mockResolvedValue([
      { ...TWO_SUBMISSIONS[0], status: 'APPROVED' },
    ]);
    shareOpportunity.mockResolvedValue({ id: 11, status: 'SHARED' });
    render(<OfferInbox />);

    fireEvent.click(await screen.findByRole('button', { name: 'Share opportunity 6 with students' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share with students' }));

    await waitFor(() =>
      expect(shareOpportunity).toHaveBeenCalledWith(6, undefined, undefined),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Opportunity #6 is now shared with your students.',
    );
    // The proposal keeps its APPROVED verdict and gains the shared marker —
    // a second share would be a 409 at the server.
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('SHARED')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Share opportunity 6 with students' }),
    ).not.toBeInTheDocument();
  });

  test('an offer that was never accepted has no share action at all', async () => {
    fetchOfferInbox.mockResolvedValue(TWO_OFFERS);
    fetchSubmissionQueue.mockResolvedValue([]);
    render(<OfferInbox />);

    expect(await screen.findByRole('button', { name: 'Accept offer 31' })).toBeInTheDocument();
    // The server would 409 (S6.1's deferred test), so the button never renders.
    expect(
      screen.queryByRole('button', { name: 'Share opportunity 4 with students' }),
    ).not.toBeInTheDocument();
  });
});
