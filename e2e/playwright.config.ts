import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const root = path.resolve(__dirname, '..');

const API_URL = 'http://localhost:8082';
const APP_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: APP_URL,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'bash backend/start.sh spring-boot:run',
      cwd: root,
      url: `${API_URL}/actuator/health`,
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm start',
      cwd: path.resolve(root, 'frontend1/ims'),
      env: { BROWSER: 'none', CI: 'false' },
      url: APP_URL,
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
