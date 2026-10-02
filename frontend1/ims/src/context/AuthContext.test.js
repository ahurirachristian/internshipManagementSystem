import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { fetchCurrentUser, fetchNotifications, fetchUnreadCount, logoutSession } from '../services/api';

jest.mock('../services/api', () => ({
  fetchCurrentUser: jest.fn(),
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  login: jest.fn(),
  logoutSession: jest.fn(),
}));

let auth;

function Probe() {
  auth = useAuth();
  return <div data-testid="who">{auth.user ? auth.user.username : 'anonymous'}</div>;
}

async function signIn() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
  await screen.findByText('sara');
}

beforeEach(() => {
  jest.clearAllMocks();
  // A live session on mount, so logout has something to tear down.
  fetchCurrentUser.mockResolvedValue({ username: 'sara', role: 'STUDENT' });
  fetchNotifications.mockResolvedValue([{ id: 1 }]);
  fetchUnreadCount.mockResolvedValue({ count: 3 });
});

describe('logout', () => {
  // Signing out used to reject whenever logoutSession did, which surfaced as an
  // uncaught runtime error and skipped Header's navigate('/login') call entirely.
  test('clears the session state when the request succeeds', async () => {
    logoutSession.mockResolvedValue(undefined);
    await signIn();
    expect(screen.getByTestId('who')).toHaveTextContent('sara');

    await act(async () => {
      await auth.logout();
    });

    expect(logoutSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous');
    expect(auth.notifications).toEqual([]);
    expect(auth.unreadCount).toBe(0);
  });

  test('resolves and still signs out when the request fails', async () => {
    logoutSession.mockRejectedValue(new Error('Logout failed.'));
    await signIn();

    let outcome;
    await act(async () => {
      outcome = 'resolved';
      try {
        await auth.logout();
      } catch {
        outcome = 'rejected';
      }
    });

    expect(outcome).toBe('resolved');
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous');
    expect(auth.notifications).toEqual([]);
    expect(auth.unreadCount).toBe(0);
  });

  test('mount identity check never reaches the network', async () => {
    // fetchCurrentUser returns null rather than throwing on a 401, so a logged-out
    // visitor must not be able to trip an unhandled rejection during startup.
    logoutSession.mockResolvedValue(undefined);
    fetchCurrentUser.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('anonymous');
    expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(logoutSession).not.toHaveBeenCalled();
  });
});
