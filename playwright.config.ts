import { defineConfig, devices } from "@playwright/test";

import { E2E_BASE_URL, E2E_STORAGE_STATE_PATH } from "./e2e/environment";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  timeout: 30_000,
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev:e2e",
    reuseExistingServer: false,
    timeout: 120_000,
    url: E2E_BASE_URL,
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/*.setup.ts",
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: "**/*.setup.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: E2E_STORAGE_STATE_PATH,
      },
    },
    {
      name: "iphone-13",
      dependencies: ["setup"],
      testIgnore: "**/*.setup.ts",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        storageState: E2E_STORAGE_STATE_PATH,
      },
    },
  ],
});
