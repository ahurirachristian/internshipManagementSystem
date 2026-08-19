import { render, screen } from '@testing-library/react';
import App from './App';

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: { get: (key) => (key === 'content-type' ? 'application/json' : 'text/plain') },
    json: () => Promise.resolve(payload),
  };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/me')) {
      return Promise.resolve(
        jsonResponse({ username: 'admin', role: 'ADMIN', companyId: null, universityId: null })
      );
    }
    if (String(url).includes('/api/admin/users')) {
      return Promise.resolve(jsonResponse([{ id: 1, username: 'admin', role: 'ADMIN' }]));
    }
    if (String(url).includes('/api/students')) {
      return Promise.resolve(jsonResponse([]));
    }
    if (String(url).includes('/api/diaries')) {
      return Promise.resolve(jsonResponse([]));
    }
    return Promise.resolve(jsonResponse({}));
  });
});

test('renders the admin user management page for admin users', async () => {
  window.history.pushState({}, '', '/admin/users');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'User Management' })).toBeInTheDocument();
});

test('renders the admin dashboard for admin users', async () => {
  window.history.pushState({}, '', '/admin/dashboard');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
});

test('redirects admin users away from the student dashboard', async () => {
  window.history.pushState({}, '', '/student/dashboard');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
});

