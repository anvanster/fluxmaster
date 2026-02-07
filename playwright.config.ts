import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-web',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5199',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5199',
    cwd: './packages/web',
    port: 5199,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
