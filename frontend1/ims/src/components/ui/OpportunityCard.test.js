/**
 * S7.1 (opportunity plan §8.8): the shared `OpportunityCard`.
 *
 * The card's contract is the entitlement matrix, so every audience test feeds
 * it the *same* maximally-privileged object — origin, verdict, targeting, share
 * note and application facts all populated — and asserts only the blocks that
 * audience may see come back out. A test fed sparse data could not tell a
 * filtered field from a missing one; this way a regression that stops
 * filtering fails the student test with the very field that leaked.
 */
import { render, screen } from '@testing-library/react';
import OpportunityCard from './OpportunityCard';

const EVERYTHING = {
  id: 4,
  title: 'Frontend intern',
  description: 'Build components with the team.',
  location: 'Kampala',
  deadline: '2026-12-31',
  status: 'PUBLISHED',
  origin: 'COMPANY',
  companyId: 9,
  externalOrgName: 'Kololo Labs',
  workMode: 'HYBRID',
  verificationStatus: 'VERIFIED',
  verificationNote: 'Checked the company records',
  targetProgrammeIds: '96201,96202',
  targetYearOfStudy: '3',
  shareNote: 'Shared with the ICT cohort',
  sharedAt: '2026-10-01T09:00:00',
  applied: true,
  applicationCount: 3,
};

describe('OpportunityCard — one card, four audiences', () => {
  test('a student sees the feed context and none of the advertiser-side fields', () => {
    render(<OpportunityCard opportunity={EVERYTHING} audience="STUDENT" />);

    // Shared core is always on.
    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByText('Build components with the team.')).toBeInTheDocument();
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText(/Kampala/)).toBeInTheDocument();
    expect(screen.getByText(/Kololo Labs/)).toBeInTheDocument();

    // Student context: why this reached them, zero-filled application facts.
    expect(screen.getByText(/Shared with the ICT cohort/)).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('3 applicants')).toBeInTheDocument();

    // Everything the advertiser is entitled to stays invisible [H6][H13].
    expect(screen.queryByLabelText('Provenance')).toBeNull();
    expect(screen.queryByLabelText('Verification')).toBeNull();
    expect(screen.queryByLabelText('Targeting')).toBeNull();
    expect(screen.queryByText('Checked the company records')).toBeNull();
    expect(screen.queryByText(/Origin/)).toBeNull();
  });

  test('the owning company sees provenance, verdict and targeting but no student context', () => {
    render(<OpportunityCard opportunity={EVERYTHING} audience="COMPANY" />);

    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByLabelText('Provenance')).toHaveTextContent('Origin: Company');
    expect(screen.getByLabelText('Verification')).toHaveTextContent('VERIFIED');
    expect(screen.getByText('Checked the company records')).toBeInTheDocument();
    expect(screen.getByLabelText('Targeting')).toBeInTheDocument();
    expect(screen.getByText('Programme 96201')).toBeInTheDocument();
    expect(screen.getByText('Programme 96202')).toBeInTheDocument();
    expect(screen.getByText('Year 3')).toBeInTheDocument();

    // A student's view of "why am I seeing this" is not the submitter's data.
    expect(screen.queryByText(/Shared with the ICT cohort/)).toBeNull();
    expect(screen.queryByText('Applied')).toBeNull();
    expect(screen.queryByText('3 applicants')).toBeNull();
  });

  test('a university supervisor sees the advertiser side with their action slot', () => {
    render(
      <OpportunityCard opportunity={EVERYTHING} audience="SUPERVISOR">
        <button type="button">Share with students</button>
      </OpportunityCard>,
    );

    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByLabelText('Provenance')).toHaveTextContent('Origin: Company');
    expect(screen.getByLabelText('Verification')).toHaveTextContent('VERIFIED');
    expect(screen.getByLabelText('Targeting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share with students' })).toBeInTheDocument();

    expect(screen.queryByText(/Shared with the ICT cohort/)).toBeNull();
    expect(screen.queryByText('Applied')).toBeNull();
  });

  test('the super admin sees provenance, verdict and targeting, never the student context', () => {
    render(<OpportunityCard opportunity={EVERYTHING} audience="ADMIN" />);

    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByLabelText('Provenance')).toHaveTextContent('Origin: Company');
    expect(screen.getByLabelText('Provenance')).toHaveTextContent('Company #9');
    expect(screen.getByLabelText('Verification')).toHaveTextContent('VERIFIED');
    expect(screen.getByLabelText('Targeting')).toBeInTheDocument();

    // The share note and application facts belong to the student's view only.
    expect(screen.queryByText(/Shared with the ICT cohort/)).toBeNull();
    expect(screen.queryByText('Applied')).toBeNull();
    expect(screen.queryByText('3 applicants')).toBeNull();
  });

  test('an unknown audience falls back to the shared core alone (default-deny)', () => {
    render(<OpportunityCard opportunity={EVERYTHING} audience="GUEST" />);

    expect(screen.getByText('Frontend intern')).toBeInTheDocument();
    expect(screen.getByText('Build components with the team.')).toBeInTheDocument();

    expect(screen.queryByLabelText('Provenance')).toBeNull();
    expect(screen.queryByLabelText('Verification')).toBeNull();
    expect(screen.queryByLabelText('Targeting')).toBeNull();
    expect(screen.queryByLabelText('Shared with you')).toBeNull();
    expect(screen.queryByText('Applied')).toBeNull();
    expect(screen.queryByText('3 applicants')).toBeNull();
  });

  test('zero-filled feed metadata renders as zero, never interpolated', () => {
    render(
      <OpportunityCard
        opportunity={{
          ...EVERYTHING,
          applied: false,
          applicationCount: 0,
          shareNote: null,
          sharedAt: null,
        }}
        audience="STUDENT"
      />,
    );

    expect(screen.getByText('0 applicants')).toBeInTheDocument();
    expect(screen.queryByText('Applied')).toBeNull();
    expect(screen.queryByLabelText('Shared with you')).toBeNull();
    // No targeting block can leak into the student view even when populated.
    expect(screen.queryByLabelText('Targeting')).toBeNull();
  });
});
