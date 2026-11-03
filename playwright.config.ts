import { defineConfig, devices } from "@playwright/test";

// E2E runs against the production build in demo mode, served with the same
// cross-origin-isolation headers as production, i.e. exactly what the public
// static deployment serves, real in-browser inference included.
export default defineConfig({
  testDir: "./e2e",
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run build:demo && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
