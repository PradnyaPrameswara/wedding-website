import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4321',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'python -m http.server 4323',
      cwd: join(process.cwd(), 'tests', 'fixtures', 'original'),
      url: 'http://127.0.0.1:4323/index.html',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node node_modules/astro/astro.js dev --host 127.0.0.1 --port 4321',
      cwd: process.cwd(),
      url: 'http://127.0.0.1:4321/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
