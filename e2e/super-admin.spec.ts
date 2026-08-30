import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

test.describe("Super Administrator", () => {
  test("can sign in, use the platform shell, then sign out", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@chms.local");
    await page.getByLabel("Password").fill("ChangeMe!admin1");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText("Platform Owner")).toBeVisible();
    await expect(page.getByText("Super Administrator")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total churches")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Churches", level: 2 })).toBeVisible();

    await expect(page.getByRole("link", { name: "All churches" })).not.toBeVisible();
    await page.getByRole("button", { name: "Expand Churches" }).click();
    await expect(page.getByRole("link", { name: "All churches" })).toBeVisible();
    await page.getByRole("button", { name: "Collapse Churches" }).click();
    await expect(page.getByRole("link", { name: "All churches" })).not.toBeVisible();

    await page.getByRole("link", { name: "Churches", exact: true }).click();
    await expect(page).toHaveURL(/\/platform\/churches/);
    await expect(page.getByRole("heading", { name: "Churches" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All churches" })).toBeVisible();
    await expect(page.getByLabel("Main")).toHaveCSS("overflow-y", "auto");

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/platform/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("can open change password while signed in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@chms.local");
    await page.getByLabel("Password").fill("ChangeMe!admin1");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15_000 });

    await page.goto("/platform/change-password");
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();
  });
});
