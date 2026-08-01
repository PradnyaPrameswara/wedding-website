import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4322',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'python -m http.server 4321',
      cwd: process.cwd(),
      url: 'http://127.0.0.1:4321/index.html',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node node_modules/astro/astro.js dev --host 127.0.0.1 --port 4322',
      cwd: process.cwd(),
      url: 'http://127.0.0.1:4322/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
