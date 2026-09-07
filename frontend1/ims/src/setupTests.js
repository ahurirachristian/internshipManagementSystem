// jest-dom adds custom jsdom matchers.
import '@testing-library/jest-dom';

// jsdom does not implement window.matchMedia (used by DashboardLayout's useMediaQuery).
// CRA enables jest's resetMocks by default, which would strip a one-time
// implementation, so the mock is (re)created before every test instead.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});
