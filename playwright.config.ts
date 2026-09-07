import { defineConfig, devices } from "@playwright/test";

import { E2E_BASE_URL, E2E_PORT, E2E_STORAGE_STATE_PATH } from "./e2e/environment";
import { AUTH_SETUP_TEST_MATCH,AUTHENTICATED_TEST_IGNORE } from "./e2e/project-selection";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  timeout: 30_000,
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node_modules/.bin/next dev -p ${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: E2E_BASE_URL,
  },
  projects: [
    {
      name: "setup",
      testMatch: AUTH_SETUP_TEST_MATCH,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: AUTHENTICATED_TEST_IGNORE,
      use: {
        ...devices["Desktop Chrome"],
        storageState: E2E_STORAGE_STATE_PATH,
      },
    },
    {
      name: "iphone-13",
      dependencies: ["setup"],
      testIgnore: AUTHENTICATED_TEST_IGNORE,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        storageState: E2E_STORAGE_STATE_PATH,
      },
    },
  ],
});
