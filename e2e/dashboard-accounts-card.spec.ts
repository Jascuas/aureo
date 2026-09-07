import { expect, test } from "@playwright/test";

import { E2E_ENVIRONMENT } from "./environment";
import { getAureoDashboardFixtureNames } from "./fixtures";

const fixtureNames = getAureoDashboardFixtureNames(E2E_ENVIRONMENT.runId);

test("shows positive, zero, and negative fixture accounts without sync status", async ({
  page,
}) => {
  await page.goto("/");

  const accountList = page.locator(".acct-list-a");

  await expect(accountList.getByText(fixtureNames.positive, { exact: true })).toBeVisible();
  await expect(accountList.getByText(fixtureNames.zero, { exact: true })).toBeVisible();
  await expect(accountList.getByText(fixtureNames.negative, { exact: true })).toBeVisible();
  await expect(page.getByText("SYNC", { exact: true })).toHaveCount(0);
});
