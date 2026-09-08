import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

import {
  E2E_BASE_URL,
  E2E_STORAGE_STATE_PATH,
  getE2EClerkUserEmail,
  getE2EClerkUserId,
} from "./environment";

setup("authenticate the dedicated E2E user", async ({ page }) => {
  await clerkSetup({ dotenv: false });
  await page.goto("/sign-in");
  await clerk.signIn({
    emailAddress: getE2EClerkUserEmail(),
    page,
  });

  await page.goto("/");
  const currentUrl = new URL(page.url());
  if (currentUrl.origin !== E2E_BASE_URL || currentUrl.pathname !== "/") {
    throw new Error(
      `Clerk E2E sign-in did not return to the protected Aureo origin; received ${currentUrl.origin}${currentUrl.pathname}`,
    );
  }

  const expectedUserId = getE2EClerkUserId();
  await expect.poll(() => page.evaluate(() => {
    const browserClerk = (window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk;
    return browserClerk?.user?.id ?? null;
  }), { timeout: 10_000, message: "Clerk must hydrate the exact approved QA identity" }).toBe(expectedUserId);

  const protectedResponse = await page.request.get("/api/accounts");
  expect(protectedResponse.status()).toBe(200);
  mkdirSync(dirname(E2E_STORAGE_STATE_PATH), { recursive: true, mode: 0o700 });
  await page.context().storageState({ path: E2E_STORAGE_STATE_PATH });
  chmodSync(E2E_STORAGE_STATE_PATH, 0o600);
});
