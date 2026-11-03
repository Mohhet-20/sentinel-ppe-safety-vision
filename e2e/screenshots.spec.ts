import { expect, test } from "@playwright/test";

// Regenerates the README screenshots: SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate docs/screenshots");

const OUT = "docs/screenshots";

test("capture README screenshots", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500); // let the hero boxes animate in
  await page.screenshot({ path: `${OUT}/landing.png` });
  await page.screenshot({ path: `${OUT}/landing-full.png`, fullPage: true });

  await page.locator("#playground").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Rail crew/ }).click();
  await expect(page.getByText(/^\d+ ms$/)).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(1200);
  await page.locator("#playground").screenshot({ path: `${OUT}/playground.png` });

  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  // Let the simulated site cameras push a couple of frames into the live feed.
  await expect(page.getByText("CAM-01 · Loading Dock").first()).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(16_000);
  await page.screenshot({ path: `${OUT}/dashboard.png` });
  await page.getByRole("button", { name: "Close tour" }).click();

  await page.goto("/app/detection/image");
  await page.locator('input[type="file"]').first().setInputFiles("public/samples/hi-vis-crew.jpg");
  await expect(page.getByText("Detection complete").first()).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/image-detection.png` });

  await page.goto("/app/incidents");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/incidents.png` });

  await page.goto("/app/analytics");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/analytics.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/mobile.png` });
});
