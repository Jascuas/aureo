import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

import {
  E2E_STORAGE_STATE_PATH,
  getE2EClerkUserEmail,
} from "./environment";

setup("authenticate the dedicated E2E user", async ({ page }) => {
  await clerkSetup({ dotenv: false });
  await page.goto("/sign-in");
  await clerk.signIn({
    emailAddress: getE2EClerkUserEmail(),
    page,
  });

  await page.goto("/");
  mkdirSync(dirname(E2E_STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: E2E_STORAGE_STATE_PATH });
});
