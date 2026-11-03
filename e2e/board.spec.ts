import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a local preview" }).click();
});
test("create, edit, filter, comment, cancel and delete", async ({ page }) => {
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Give your task a title.");
  await page.getByLabel("Task title").fill("Test the complete flow");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A persistent task once connected.");
  await page.getByLabel("Assignee", { exact: true }).fill("Test User");
  await page.getByLabel("Labels").fill("QA,Engineering");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("heading", { name: "Test the complete flow" }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("done");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .getByRole("region", { name: "Done", exact: true })
      .getByRole("heading", { name: "Test the complete flow" }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Test the complete flow" }).click();
  await page.getByLabel("New comment").fill("Looks good!");
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText("Looks good!")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Search tasks").fill("test the");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("heading", { name: "Test the complete flow" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Keep task" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "Test the complete flow" }),
  ).toHaveCount(0);
});
test("drag to another column", async ({ page }) => {
  const handle = page.getByRole("button", {
    name: "Drag Map the first-run experience",
    exact: true,
  });
  const box = await handle.boundingBox();
  const target = await page
    .getByRole("region", { name: "Done", exact: true })
    .boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 10,
    box!.y + box!.height / 2,
    { steps: 3 },
  );
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 70, {
    steps: 20,
  });
  await page.mouse.up();
  await expect(
    page
      .getByRole("region", { name: "Done", exact: true })
      .getByRole("heading", { name: "Map the first-run experience" }),
  ).toBeVisible();
});
test("mobile has no horizontal overflow and modal escape works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "qa-mobile.png", fullPage: true });
});
test("desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: "qa-desktop.png", fullPage: true });
});
