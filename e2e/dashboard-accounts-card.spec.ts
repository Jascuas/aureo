import { expect, test } from "@playwright/test";

test("shows positive, zero, and negative fixture accounts without sync status", async ({
  page,
}) => {
  await page.goto("/");

  const accountList = page.locator(".acct-list-a");

  await expect(accountList.getByText("E2E Positive Account", { exact: true })).toBeVisible();
  await expect(accountList.getByText("E2E Zero Account", { exact: true })).toBeVisible();
  await expect(accountList.getByText("E2E Negative Account", { exact: true })).toBeVisible();
  await expect(page.getByText("SYNC", { exact: true })).toHaveCount(0);
});
