import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

test.describe("mobile navigation", () => {
  test("opens the sidebar from a hamburger and closes after a visit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.getByLabel("Email").fill("admin@chms.local");
    await page.getByLabel("Password").fill("ChangeMe!admin1");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const openNav = page.getByRole("button", { name: "Open navigation" });
    await expect(openNav).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

    await openNav.click();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

    await openNav.click();
    await page.getByRole("link", { name: "Churches", exact: true }).click();
    await expect(page).toHaveURL(/\/platform\/churches/);
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    await expect(openNav).toBeVisible();
  });

  test("keeps the sidebar visible on desktop without a hamburger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.getByLabel("Email").fill("admin@chms.local");
    await page.getByLabel("Password").fill("ChangeMe!admin1");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText("Super Administrator")).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

    const searchBox = await page
      .getByRole("searchbox", { name: "Global search" })
      .boundingBox();
    const notificationsBox = await page
      .getByRole("button", { name: "Notifications" })
      .boundingBox();
    expect(searchBox).toBeTruthy();
    expect(notificationsBox).toBeTruthy();
    expect(searchBox!.x).toBeLessThan(400);
    expect(searchBox!.x).toBeLessThan(notificationsBox!.x);

    await expect(
      page.getByRole("button", { name: "Account menu" }).locator(".truncate").first(),
    ).toHaveCSS("text-overflow", "ellipsis");
  });
});
