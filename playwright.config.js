import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Tests that do not depend on the screen size run only on the Redmi size.
const ONCE = ['**/offline.spec.js', '**/data.spec.js', '**/engine.spec.js'];

// Phone sizes from the specification (14.2). Chromium with touch, like Chrome
// on Android; continuous animations off, so screenshots are repeatable.
const phone = {
  ...devices['Pixel 7'],
  reducedMotion: 'reduce',
};

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    // The app runs under a subpath, like on GitHub Pages.
    baseURL: `http://127.0.0.1:${PORT}/Cleaneh/`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tools/serve.mjs --port ${PORT} --base Cleaneh`,
    url: `http://127.0.0.1:${PORT}/Cleaneh/`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'redmi',
      use: { ...phone, viewport: { width: 393, height: 820 }, deviceScaleFactor: 2.75 },
    },
    {
      name: 'small',
      testIgnore: ONCE,
      use: { ...phone, viewport: { width: 360, height: 616 }, deviceScaleFactor: 2 },
    },
    {
      name: 'small-130',
      testIgnore: ONCE,
      use: { ...phone, viewport: { width: 360, height: 616 }, deviceScaleFactor: 2, fontScale: 1.3 },
    },
  ],
});
