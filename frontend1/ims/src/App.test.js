import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({}),
    })
  );
});

test('renders the login page for anonymous users', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
});
