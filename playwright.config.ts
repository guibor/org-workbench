import { defineConfig } from '@playwright/test';
const port = process.env.ORG_WORKBENCH_TEST_PORT || '4318';
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/browser', fullyParallel: true,
  use: { baseURL: url, headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url, reuseExistingServer: !process.env.CI },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
});
