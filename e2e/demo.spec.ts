import { expect, test, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

test("landing page renders the hero with real detections", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every hard hat.");
  await expect(page.getByText("violations").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("playground runs the ONNX model in the browser", async ({ page }) => {
  await page.goto("/#playground");
  await page.getByRole("button", { name: /Rail crew/ }).click();
  // First run downloads the model + wasm runtime; allow generous time.
  await expect(page.getByText(/^\d+ ms$/)).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("li", { hasText: "Person" })).toBeVisible();
});

test("one-click demo opens a populated dashboard", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Live demo")).toBeVisible();
  await expect(page.getByText("PPE Compliance", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent Incidents")).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("image detection works end-to-end through the mock API", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/detection/image");
  await page.locator('input[type="file"]').first().setInputFiles("public/samples/hi-vis-crew.jpg");
  await expect(page.getByText("Detection complete").first()).toBeVisible({ timeout: 120_000 });
});

test("every product page renders without crashing", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);

  for (const path of [
    "/app/detection/image",
    "/app/detection/video",
    "/app/detection/live",
    "/app/analytics",
    "/app/incidents",
    "/app/workers",
    "/app/reports",
    "/app/models",
    "/app/system",
    "/app/settings",
    "/app/settings/users",
    "/app/about",
  ]) {
    await page.goto(path);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(page.locator("main")).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test("simulated site cameras stream real detections into the command center", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  // First simulated frame fires ~3 s after mount, then runs the real model.
  await expect(page.getByText("Listening for detections")).toBeVisible();
  await expect(page.getByText("CAM-01 · Loading Dock").first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Listening for detections")).toHaveCount(0);
});

test("guided tour ticks off steps from real activity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch live demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  const tour = page.getByRole("dialog", { name: "Demo tour" });
  await expect(tour).toBeVisible(); // opens automatically on first visit

  await page.getByRole("link", { name: /Run the model on a photo/ }).click();
  await page.locator('input[type="file"]').first().setInputFiles("public/samples/site-inspector.jpg");
  await expect(page.getByText("Detection complete").first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("button", { name: /Tour [1-9]\/5/ })).toBeVisible();
});
