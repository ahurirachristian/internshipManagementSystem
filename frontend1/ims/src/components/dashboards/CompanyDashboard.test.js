/**
 * PC4: the company Overview tab and the supervisor modal.
 *
 * <p>Two things are worth pinning here. First, that the dashboard does not invent
 * figures — an empty analytics payload has to render as an empty state, not as
 * zeros that read like real measurements. Second, that the modal's field set
 * matches what P6 actually persists: the reference had seven inputs, two of which
 * (`username`, `role`) P6 derives server-side, so accepting them here would be
 * collecting input that is silently discarded.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CompanyDashboard from './CompanyDashboard';
import CompanySupervisorModal from '../CompanySupervisorModal';

jest.mock('../../services/api', () => ({
  fetchCompanyAnalytics: jest.fn(),
  fetchCompany: jest.fn(),
  fetchCompanySupervisors: jest.fn(),
  fetchStudentsByCompany: jest.fn().mockResolvedValue([]),
  updateCompany: jest.fn().mockResolvedValue({}),
  createCompanySupervisor: jest.fn().mockResolvedValue({ username: 'ada.okello' }),
  updateCompanySupervisor: jest.fn().mockResolvedValue({ username: 'ada.okello' }),
  resetUserPassword: jest.fn().mockResolvedValue({ tempPassword: 'x' }),
  fetchUniversityOptions: jest.fn().mockResolvedValue([]),
  studentLookup: jest.fn().mockResolvedValue(null),
  offerPlacement: jest.fn().mockResolvedValue({}),
}));

// Imported after the mock so the jest.fn()s above are the ones under test.
const {
  fetchCompanyAnalytics,
  fetchCompany,
  fetchCompanySupervisors,
} = require('../../services/api');

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'airtel', role: 'COMPANY', companyId: 7 } }),
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

// The real layout needs a router and full theme context; this suite is about the
// dashboard body.
jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: ({ tabs, activeTab, onTabChange, children }) => (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  ),
}));

jest.mock('../CompanyEditModal', () => ({ __esModule: true, default: () => null }));

const FULL_ANALYTICS = {
  offers: { PENDING: 1, OFFERED: 2, ASSIGNED: 0, ACTIVE: 3, COMPLETED: 1, CANCELLED: 1 },
  interns: [
    {
      studentId: 11,
      firstName: 'Ada',
      lastName: 'Lovelace',
      degreeProgram: 'Computer Science',
      yearOfStudy: 3,
      placementStatus: 'ACTIVE',
      startDate: '2026-01-05',
      endDate: '2026-05-05',
      started: true,
      evaluated: true,
      averageGrade: 88,
      progressPercent: 100,
    },
    {
      studentId: 12,
      firstName: 'Alan',
      lastName: 'Turing',
      degreeProgram: 'Mathematics',
      yearOfStudy: 2,
      placementStatus: 'OFFERED',
      startDate: null,
      endDate: null,
      started: false,
      evaluated: false,
      averageGrade: null,
      progressPercent: 0,
    },
  ],
  internCount: 2,
  avgEvaluation: 88,
  evaluationCount: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchCompany.mockResolvedValue({ name: 'Airtel Uganda', industry: 'Telecom' });
  fetchCompanySupervisors.mockResolvedValue([]);
  fetchCompanyAnalytics.mockResolvedValue(FULL_ANALYTICS);
});

describe('CompanyDashboard overview', () => {
  it('opens on Overview and reports the server figures', async () => {
    render(<CompanyDashboard />);

    await waitFor(() => expect(fetchCompanyAnalytics).toHaveBeenCalled());
    expect(await screen.findByText('Offers Pipeline')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    // All six statuses render as donut segments, including the zero one.
    for (const label of ['Pending', 'Offered', 'Assigned', 'Active', 'Completed', 'Cancelled']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Avg Evaluation')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('counts a cancelled placement out of the pipeline total but still shows the segment', async () => {
    render(<CompanyDashboard />);
    await screen.findByText('Offers Pipeline');

    // 1 + 2 + 0 + 3 + 1 = 7 non-cancelled. Cancelled is a displayed segment but
    // not progress, so it stays out of the pipeline headline.
    expect(screen.getByRole('group', { name: 'Pipeline: 7' })).toBeInTheDocument();
    // The donut's denominator is all 8 placements: pending, completed and cancelled
    // each hold 1 (13%), offered 2 (25%), active 3 (38%). Only the pipeline
    // headline excludes cancelled, which is why it reads 7 rather than 8.
    expect(screen.getAllByText('1 (13%)')).toHaveLength(3);
    expect(screen.getByText('2 (25%)')).toBeInTheDocument();
    expect(screen.getByText('3 (38%)')).toBeInTheDocument();
    // Assigned holds zero and must still be listed rather than silently dropped.
    expect(screen.getByText('0 (0%)')).toBeInTheDocument();
  });

  it('renders intern progress rows rather than a chart of them', async () => {
    render(<CompanyDashboard />);
    await screen.findByText('Intern Onboarding');

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Evaluated (88%)')).toBeInTheDocument();
    expect(screen.getByText('Start date not set')).toBeInTheDocument();
    expect(screen.getByText('Not yet evaluated')).toBeInTheDocument();
  });

  it('does not fabricate zeroes when a company has no placements', async () => {
    fetchCompanyAnalytics.mockResolvedValue({
      offers: { PENDING: 0, OFFERED: 0, ASSIGNED: 0, ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 },
      interns: [],
      internCount: 0,
      avgEvaluation: null,
      evaluationCount: 0,
    });
    render(<CompanyDashboard />);
    await screen.findByText('Offers Pipeline');

    // An absent evaluation average renders as a dash, not as 0% — 0% would read
    // as a real score.
    expect(screen.getByRole('group', { name: 'Avg Evaluation: —' })).toBeInTheDocument();
    expect(screen.getByText('No interns placed at your company yet.')).toBeInTheDocument();
  });

  it('offers a retry instead of an empty dashboard when analytics fail', async () => {
    fetchCompanyAnalytics.mockRejectedValue(new Error('Service unavailable'));
    render(<CompanyDashboard />);

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('Offers Pipeline')).not.toBeInTheDocument();
  });
});

describe('CompanySupervisorModal', () => {
  const onClose = jest.fn();

  beforeEach(() => onClose.mockClear());

  function openCreate() {
    return render(
      <CompanySupervisorModal title="Add Field Supervisor" onClose={onClose} onSubmit={jest.fn().mockResolvedValue({})} />,
    );
  }

  it('asks for exactly the fields P6 persists', () => {
    openCreate();

    // Five inputs, one per field POST /api/companies/me/supervisors accepts.
    const inputs = [
      screen.getByLabelText(/First Name/),
      screen.getByLabelText(/Last Name/),
      screen.getByLabelText(/Email Address/),
      screen.getByLabelText(/Contact/),
      screen.getByLabelText(/Department/),
    ];
    expect(inputs).toHaveLength(5);
    expect(inputs.filter((input) => input.tagName === 'INPUT')).toHaveLength(5);
  });

  it('does not offer a username or role input, because P6 derives both', () => {
    openCreate();

    // The reference modal had a "Login Username" field that P6 ignores and a
    // free-text "Role / Job Title" that looked like an access role but was not.
    expect(screen.queryByLabelText(/Username/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Job Title/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Role/i)).not.toBeInTheDocument();
    expect(screen.getByText(/generated from their name/i)).toBeInTheDocument();
  });

  it('refuses to submit without a first name', async () => {
    const onSubmit = jest.fn();
    render(<CompanySupervisorModal title="Add" onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Save Field Supervisor/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('First name is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the trimmed payload and closes', async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    render(<CompanySupervisorModal title="Add" onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: '  Ada  ' } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contact/), { target: { value: ' +256700000001 ' } });
    fireEvent.change(screen.getByLabelText(/Department/), { target: { value: 'Technology' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Field Supervisor/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+256700000001',
      department: 'Technology',
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces a server rejection and stays open', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('A user with that email already exists.'));
    render(<CompanySupervisorModal title="Add" onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Field Supervisor/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A user with that email already exists.');
    expect(onClose).not.toHaveBeenCalled();
  });
});
