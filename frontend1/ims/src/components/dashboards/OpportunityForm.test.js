/**
 * S3.4 (opportunity plan §8.4): the R8 submission form.
 *
 * The two payload tests are the contract with S3.1's endpoint: a minimal-valid
 * submission must carry exactly title/description/deadline and nothing that
 * would trip a validation, and a full submission must carry every §5.2–§5.4
 * field with the types the server parses (numbers as numbers, the two booleans
 * as booleans) — an empties-dropped payload is what keeps "unstated" (null)
 * distinct from "zero" on the server.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpportunityForm from './OpportunityForm';

jest.mock('../../services/api', () => ({
  createOpportunity: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { createOpportunity } = require('../../services/api');
const { useAuth } = require('../../context/AuthContext');

function asRole(role) {
  useAuth.mockReturnValue({ user: { username: 'formtester', role } });
}

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Submit opportunity' }));

describe('OpportunityForm', () => {
  test('a minimal-valid submission sends exactly the required trio', async () => {
    asRole('SUPERVISOR');
    createOpportunity.mockResolvedValue({ id: 1, title: 'Data intern', status: 'PENDING_REVIEW' });
    render(<OpportunityForm />);

    fill('Title', 'Data intern');
    fill('Description', 'A real role a student can be onboarded into');
    fill('Deadline', '2026-12-31');
    submit();

    await waitFor(() =>
      expect(createOpportunity).toHaveBeenCalledWith({
        title: 'Data intern',
        description: 'A real role a student can be onboarded into',
        deadline: '2026-12-31',
      }),
    );
    // findBy* waits for the state flip the resolved promise triggers.
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for review/i);
    // The form empties itself, so a double submit cannot duplicate the advert.
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  test('a full submission carries every field, numbers and booleans typed', async () => {
    asRole('SUPERVISOR');
    createOpportunity.mockResolvedValue({ id: 2, title: 'Backend intern', status: 'PUBLISHED' });
    render(<OpportunityForm />);

    fill('Title', 'Backend intern');
    fill('Description', 'Build services, ship features');
    fill('Deadline', '2026-12-31');
    fill('Location', 'Kampala');
    fill('Requirements', 'Know Python');
    // Fields carrying a hint match by regex: the hint is part of the label's
    // accessible name (a screen reader should hear it), so an exact string miss.
    fill(/External organisation/, 'Kololo Labs');
    fill('Source kind', 'SUPERVISOR_SOURCED');
    fill(/Source reference/, 'ref-42');
    fill('Responsibilities', 'Build tooling');
    fill('Deliverables expected', 'A working service');
    fill('Benefits', 'Lunch');
    fill('Required skills', 'Java');
    fill('Nice to have', 'Docker');
    fill('Tools & technologies', 'Git, PostgreSQL');
    fill('Safety notes', 'Lab rules apply');
    fireEvent.click(screen.getByLabelText('Safety orientation required'));
    fill('Work mode', 'HYBRID');
    fill('Country', 'Uganda');
    fill('City', 'Kampala');
    fill('Address detail', 'Plot 42, Kololo');
    fill('Duration (weeks)', '12');
    fill('Start date', '2026-07-01');
    fill('End date', '2026-09-30');
    fill('Payment', 'true');
    fill('Stipend amount', '450000');
    fill('Stipend currency', 'UGX');
    fill('Stipend period', 'MONTHLY');
    fill(/Target school ids/, '91001, 91002');
    fill(/Target department ids/, '91101');
    fill(/Target programme ids/, '91201');
    fill(/Target years of study/, '2, 3');
    fill(/Target degree levels/, 'UNDERGRADUATE');
    fill('Minimum CGPA', '3.5');
    fill('Slots', '4');
    fill('Eligibility notes', 'Finalists only');
    fill('Contact person', 'Jane A.');
    fill('Contact role', 'HR');
    fill('Contact email', 'jane@example.org');
    fill('Contact phone', '0700111222');
    fill('Application instructions', 'Send a CV and transcript');
    fill('Application email', 'apply@example.org');
    fill('Application phone', '0700333444');
    fill('Application url', 'https://example.org/apply');
    fill(/Required attachments/, 'Transcript, national id');
    submit();

    await waitFor(() =>
      expect(createOpportunity).toHaveBeenCalledWith({
        title: 'Backend intern',
        description: 'Build services, ship features',
        deadline: '2026-12-31',
        location: 'Kampala',
        requirements: 'Know Python',
        externalOrgName: 'Kololo Labs',
        sourceKind: 'SUPERVISOR_SOURCED',
        sourceReference: 'ref-42',
        responsibilities: 'Build tooling',
        deliverablesExpected: 'A working service',
        benefits: 'Lunch',
        requiredSkills: 'Java',
        niceToHave: 'Docker',
        toolsTechnologies: 'Git, PostgreSQL',
        safetyOrientationRequired: true,
        safetyNotes: 'Lab rules apply',
        workMode: 'HYBRID',
        country: 'Uganda',
        city: 'Kampala',
        addressDetail: 'Plot 42, Kololo',
        durationWeeks: 12,
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        isPaid: true,
        stipendAmount: 450000,
        stipendCurrency: 'UGX',
        stipendPeriod: 'MONTHLY',
        targetSchoolIds: '91001, 91002',
        targetDepartmentIds: '91101',
        targetProgrammeIds: '91201',
        targetYearOfStudy: '2, 3',
        targetDegreeLevels: 'UNDERGRADUATE',
        minCgpa: 3.5,
        slots: 4,
        eligibilityNotes: 'Finalists only',
        contactPersonName: 'Jane A.',
        contactRole: 'HR',
        contactEmail: 'jane@example.org',
        contactPhone: '0700111222',
        applicationInstructions: 'Send a CV and transcript',
        applicationEmail: 'apply@example.org',
        applicationPhone: '0700333444',
        applicationUrl: 'https://example.org/apply',
        requiredAttachments: 'Transcript, national id',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/live/i);
  });

  test('an unstated payment and untouched checkbox stay out of the payload', async () => {
    asRole('SUPERVISOR');
    createOpportunity.mockResolvedValue({ id: 3, title: 'T', status: 'PENDING_REVIEW' });
    render(<OpportunityForm />);

    fill('Title', 'T');
    fill('Description', 'D');
    fill('Deadline', '2026-12-31');
    submit();

    await waitFor(() => expect(createOpportunity).toHaveBeenCalledTimes(1));
    const payload = createOpportunity.mock.calls[0][0];
    expect(payload).not.toHaveProperty('isPaid');
    expect(payload).not.toHaveProperty('safetyOrientationRequired');
    expect(payload).not.toHaveProperty('stipendAmount');
  });

  test('a server rejection is surfaced verbatim, not swallowed', async () => {
    asRole('SUPERVISOR');
    createOpportunity.mockRejectedValue(
      new Error('An opportunity with no company must name the external organisation.'),
    );
    render(<OpportunityForm />);

    fill('Title', 'T');
    fill('Description', 'D');
    fill('Deadline', '2026-12-31');
    submit();

    expect(
      await screen.findByText(
        'An opportunity with no company must name the external organisation.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('targeting is a university claim: shown to a supervisor, hidden from a company', () => {
    asRole('SUPERVISOR');
    const { unmount } = render(<OpportunityForm />);
    expect(screen.getByLabelText(/Target school ids/)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission completeness/i)).toBeInTheDocument();
    unmount();

    asRole('COMPANY');
    render(<OpportunityForm />);
    expect(screen.queryByLabelText(/Target school ids/)).not.toBeInTheDocument();
    // The rest of the form still renders — only the university's section moves.
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });
});
