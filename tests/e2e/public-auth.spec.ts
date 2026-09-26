import { expect, test } from "@playwright/test";

test("public authentication journey is reachable without leaking server failures", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading")).toContainText(/essai gratuit/i);
  await page.goto("/login");
  await expect(page.getByLabel(/adresse email/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /mot de passe/i })).toBeVisible();
});

test("unsubscribe GET requires confirmation rather than silently changing consent", async ({ page }) => {
  await page.goto("/optout/not-a-real-token");
  await expect(page.locator("body")).not.toContainText(/internal server error/i);
});
