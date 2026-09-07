import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { E2E_ENVIRONMENT } from "./environment";
import { buildAureoQaFixture } from "./fixtures";

const uploadAccountId = E2E_ENVIRONMENT.descriptor
  ? buildAureoQaFixture(E2E_ENVIRONMENT.descriptor).accounts[0].id
  : "e2e-dashboard-positive";
const uploadRoute = `/transactions/upload?accountId=${encodeURIComponent(uploadAccountId)}`;

const essentialRoutes = [
  "/",
  "/accounts",
  "/categories",
  "/transactions",
  uploadRoute,
];

const assertNoHorizontalOverflow = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
};

test.describe("AUR-18 authenticated accessibility matrix", () => {
  test("essential routes load without horizontal page overflow", async ({ page }) => {
    for (const route of essentialRoutes) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test("dashboard chart request succeeds and theme/reduced-motion states are observable", async ({
    page,
  }) => {
    const overTimeResponse = page.waitForResponse((response) =>
      /\/api\/summary\/over-time(?:\?|$)/.test(response.url()),
    );

    await page.goto("/");
    await expect((await overTimeResponse).ok()).toBe(true);

    const categoryFilters = page.getByRole("button", {
      name: "Filtros de categorías",
    });
    await expect(categoryFilters).toBeVisible();
    await categoryFilters.click();
    const categoryDialog = page.getByRole("dialog");
    await expect(categoryDialog.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await expect(
      categoryDialog.getByRole("combobox", { name: "Tipo de transacción" }),
    ).toBeVisible();
    await expect(
      categoryDialog.getByRole("combobox", { name: "Principales categorías" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    const themeToggle = page.getByRole("button", { name: /Cambiar a tema/ });
    await expect(themeToggle).toBeVisible();

    const initialTheme = await page.locator("html").getAttribute("class");
    await themeToggle.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.locator("html").getAttribute("class"))
      .not.toBe(initialTheme);

    await themeToggle.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.locator("html").getAttribute("class"))
      .toBe(initialTheme);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect
      .poll(() =>
        page.locator(".scanline").evaluate((element) =>
          getComputedStyle(element, "::after").getPropertyValue("display"),
        ),
      )
      .toBe("none");
  });

  test("keyboard interaction restores focus after closing a form sheet", async ({ page }) => {
    await page.goto("/accounts");

    const addAccount = page.getByRole("button", { name: "Añadir cuenta" });
    await addAccount.focus();
    await addAccount.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Nueva cuenta", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(addAccount).toBeFocused();
  });

  test("tables expose sortable state and import errors are announced", async ({ page }) => {
    await page.goto("/accounts");

    const resultsRegion = page.getByRole("region", { name: "Resultados de la tabla" });
    await expect(resultsRegion).toBeVisible();
    await expect(resultsRegion).toHaveAttribute("tabindex", "0");

    const nameSortButton = page.getByRole("button", {
      name: /Ordenar por nombre:/,
    });
    const nameHeader = page.getByRole("columnheader").filter({ hasText: "Nombre" });
    await expect(nameHeader).toHaveAttribute("aria-sort", "none");
    await nameSortButton.focus();
    await nameSortButton.press("Enter");
    await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(
      page.getByRole("button", { name: "Ordenar por nombre: descendente" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ordenar por nombre: descendente" })
      .press("Enter");
    await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    await page
      .getByRole("button", { name: "Ordenar por nombre: sin orden" })
      .press("Enter");
    await expect(nameHeader).toHaveAttribute("aria-sort", "none");

    await page.goto("/categories");
    const categoryNameSortButton = page.getByRole("button", {
      name: /Ordenar por nombre:/,
    });
    const categoryNameHeader = page
      .getByRole("columnheader")
      .filter({ hasText: "Nombre" });
    await expect(categoryNameHeader).toHaveAttribute("aria-sort", "none");
    await categoryNameSortButton.focus();
    await categoryNameSortButton.press("Enter");
    await expect(categoryNameHeader).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await page.goto("/transactions");
    const dateFilter = page.getByRole("button").filter({ hasText: / - / }).first();
    await expect(dateFilter).toBeVisible();
    await dateFilter.click();
    await expect(
      page.getByRole("button", { name: "Ir al mes anterior" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ir al mes siguiente" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    const addTransaction = page.getByRole("button", { name: "Añadir transacción" });
    await addTransaction.click();
    const transactionDialog = page.getByRole("dialog");
    await expect(transactionDialog).toBeVisible();
    await expect(transactionDialog.getByLabel("Fecha", { exact: true })).toBeVisible();
    await expect(transactionDialog.getByRole("combobox", { name: "Cuenta", exact: true })).toBeVisible();
    await expect(transactionDialog.getByLabel("Tipo", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Importe", exact: true }),
    ).toBeVisible();
    await expect(
      transactionDialog.getByRole("button", { name: "Cambiar el signo del importe" }),
    ).toBeVisible();
    await transactionDialog
      .getByRole("button", { name: "Crear transacción" })
      .click();
    await expect(transactionDialog.getByRole("alert").first()).toBeVisible();
    await expect(transactionDialog.getByRole("combobox", { name: "Cuenta", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(addTransaction).toBeFocused();

    await page.goto(uploadRoute);
    const csvInput = page.getByLabel("Subir archivo CSV");
    await expect(csvInput).toBeAttached();
    await csvInput.setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a csv"),
    });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Sube un archivo CSV");
    await assertNoHorizontalOverflow(page);
  });
});
