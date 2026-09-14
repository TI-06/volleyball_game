import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'mobile-landscape-compact-chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile-landscape-wide-chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 932, height: 430 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
