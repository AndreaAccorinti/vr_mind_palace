import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Some environments (CI images, this project's container) ship a Chromium build
 * that does not match the pinned Playwright revision. Point at the provided
 * binary when it exists, otherwise let Playwright use its own download.
 */
const providedChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = existsSync(providedChromium) ? providedChromium : undefined;

/**
 * Desktop browser checks against the production build.
 *
 * These cover the entry page, the desktop fallback and the recall loop. They do
 * NOT cover immersive behaviour: Playwright has no WebXR device, so comfort,
 * controller input and frame pacing remain physical-device checks. See
 * docs/QUEST-TEST.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Headless Chromium has no GPU; SwiftShader gives it a real WebGL2
          // context so the canvas path under test is the production one.
          args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
          ...(executablePath === undefined ? {} : { executablePath }),
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
