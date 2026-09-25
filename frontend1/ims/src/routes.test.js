import { render, screen } from '@testing-library/react';
import App from './App';

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: { get: (key) => (key === 'content-type' ? 'application/json' : 'text/plain') },
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(''),
  };
}

let sessionUser;

beforeEach(() => {
  window.history.pushState({}, '', '/');
  sessionUser = { username: 'admin', role: 'ADMIN', companyId: null, universityId: null };
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/me')) {
      return Promise.resolve(jsonResponse(sessionUser));
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
    return Promise.resolve(jsonResponse([]));
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

test('admin users can open the student dashboard', async () => {
  window.history.pushState({}, '', '/student/dashboard');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
});

test('renders the schools management page for university users', async () => {
  sessionUser = { username: 'nkumba', role: 'SUPERVISOR', companyId: null, universityId: 2 };
  window.history.pushState({}, '', '/university/schools');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Schools Management' })).toBeInTheDocument();
});

test('renders the departments management page for university users', async () => {
  sessionUser = { username: 'nkumba', role: 'SUPERVISOR', companyId: null, universityId: 2 };
  window.history.pushState({}, '', '/university/departments');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Departments Management' })).toBeInTheDocument();
});

test('renders the programmes management page for university users', async () => {
  sessionUser = { username: 'nkumba', role: 'SUPERVISOR', companyId: null, universityId: 2 };
  window.history.pushState({}, '', '/university/programmes');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Programmes Management' })).toBeInTheDocument();
});
