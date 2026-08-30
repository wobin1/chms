import { expect, test } from "@playwright/test";

test.describe("auth pages", () => {
  test("login page is branded and has no public registration", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByTestId("auth-card")).toBeVisible();
    await expect(page.getByTestId("auth-brand-panel")).toBeVisible();
    await expect(page.getByText("CHMS", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Login to your Account" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Switch theme" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /register|sign up/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: "Forgot Password?" })).toBeVisible();
    await expect(
      page.getByText(/Registration is not public/i),
    ).toBeVisible();
  });

  test("register URL is not a public signup page", async ({ page }) => {
    const response = await page.goto("/register");
    expect(response?.status()).toBe(404);
  });

  test("signed-out visitors are sent to login", async ({ page }) => {
    await page.goto("/platform/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
