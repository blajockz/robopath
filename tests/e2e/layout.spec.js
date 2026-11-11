import { expect, test } from "@playwright/test";
import { levels } from "../../lib/levels";
import { solutions } from "../solutions";
import { allSolved, openGame } from "./helpers";

// Width x height of the visible page. Phone browsers show less than the
// full screen, so some of these are shorter than the device itself.
const LANDSCAPE = [
  { name: "small phone, browser bars showing", width: 568, height: 270 },
  { name: "iPhone SE", width: 568, height: 320 },
  { name: "iPhone 8", width: 667, height: 375 },
  { name: "Galaxy S", width: 740, height: 360 },
  { name: "iPhone 14", width: 844, height: 390 },
  { name: "Pixel 7", width: 915, height: 412 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "laptop", width: 1280, height: 800 },
];

const PORTRAIT = [
  { name: "Galaxy S", width: 360, height: 740 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "Pixel 7", width: 412, height: 915 },
];

async function box(page, testId) {
  return page.getByTestId(testId).boundingBox();
}

/** Every button must be fully on screen and large enough to tap. */
async function expectButtonsOnScreen(page, viewport, minSize) {
  const buttons = await page.getByRole("button").all();

  expect(buttons.length).toBeGreaterThan(8);

  for (const button of buttons) {
    const rect = await button.boundingBox();
    const name = await button.getAttribute("aria-label");

    expect(rect, `${name} is visible`).not.toBeNull();
    expect(rect.x, `${name} left edge`).toBeGreaterThanOrEqual(0);
    expect(rect.y, `${name} top edge`).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width, `${name} right edge`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(rect.y + rect.height, `${name} bottom edge`).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(Math.min(rect.width, rect.height), `${name} size`).toBeGreaterThanOrEqual(minSize);
  }
}

for (const viewport of LANDSCAPE) {
  test.describe(`landscape ${viewport.width}x${viewport.height} (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every level fits the screen exactly, with no scrolling", async ({ page }) => {
      await openGame(page, allSolved);
      // With everything solved the game opens on the last level: go back to 1
      for (let i = 0; i < levels.length - 1; i++) {
        await page.getByRole("button", { name: "Previous level" }).tap();
      }

      for (const [index, level] of levels.entries()) {
        await expect(page.getByRole("heading", { name: level.name })).toBeVisible();

        const size = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        }));
        expect(size.scrollWidth, `${level.name}: no sideways scroll`).toBeLessThanOrEqual(viewport.width);
        expect(size.scrollHeight, `${level.name}: no vertical scroll`).toBeLessThanOrEqual(viewport.height);

        await expectButtonsOnScreen(page, viewport, 22);

        // Ghost on the left, board in the centre, controls on the right
        const mascot = await box(page, "mascot");
        const board = await box(page, "board");
        const controls = await box(page, "controls");

        expect(mascot.x + mascot.width).toBeLessThanOrEqual(board.x);
        expect(board.x + board.width).toBeLessThanOrEqual(controls.x);
        expect(controls.x + controls.width).toBeLessThanOrEqual(viewport.width);

        // The ghost on the board is inside the board, and big enough to see
        const ghost = await box(page, "ghost");
        expect(ghost.width).toBeGreaterThanOrEqual(20);
        expect(ghost.x).toBeGreaterThanOrEqual(board.x);
        expect(ghost.y + ghost.height).toBeLessThanOrEqual(board.y + board.height + 0.5);

        // The speech bubble stays in its column and its text is not cut off
        const bubble = await page.getByRole("status").boundingBox();
        const text = await page.getByRole("status").locator("p").boundingBox();

        expect(bubble.y, `${level.name}: bubble starts inside the column`).toBeGreaterThanOrEqual(
          mascot.y - 0.5
        );
        expect(text.y + text.height, `${level.name}: hint fits in the bubble`).toBeLessThanOrEqual(
          bubble.y + bubble.height
        );

        if (index < levels.length - 1) {
          await page.getByRole("button", { name: "Next level" }).tap();
        }
      }
    });

    test("the victory window fits the screen", async ({ page }) => {
      const solution = solutions["side-quests"];
      await openGame(page, {
        solved: [true, true, true, true, true, false],
        programs: [null, null, null, null, null, solution],
      });
      await page.getByRole("button", { name: /^Speed x1/ }).tap();
      await page.getByRole("button", { name: /^Speed x2/ }).tap();
      await page.getByRole("button", { name: "Run program" }).tap();

      const dialog = page.getByRole("dialog", { name: "Victory!" });
      await expect(dialog).toBeVisible({ timeout: 20000 });
      const box = await dialog.boundingBox();

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

      for (const name of ["Close", "Start over"]) {
        const button = await page.getByRole("button", { name }).boundingBox();
        expect(button.y + button.height, name).toBeLessThanOrEqual(box.y + box.height);
      }
    });

    test("the help window fits the screen", async ({ page }) => {
      await openGame(page);
      await page.getByRole("button", { name: "How to play" }).tap();

      const dialog = await page.getByRole("dialog").boundingBox();
      const close = await page.getByRole("button", { name: "Got it" }).boundingBox();

      expect(dialog.y).toBeGreaterThanOrEqual(0);
      expect(dialog.y + dialog.height).toBeLessThanOrEqual(viewport.height);
      expect(close).not.toBeNull();
    });
  });
}

for (const viewport of PORTRAIT) {
  test.describe(`portrait ${viewport.width}x${viewport.height} (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every level fits the screen, stacked", async ({ page }) => {
      await openGame(page, allSolved);
      for (let i = 0; i < levels.length - 1; i++) {
        await page.getByRole("button", { name: "Previous level" }).tap();
      }

      for (const [index, level] of levels.entries()) {
        await expect(page.getByRole("heading", { name: level.name })).toBeVisible();

        const size = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        }));
        expect(size.scrollWidth).toBeLessThanOrEqual(viewport.width);
        expect(size.scrollHeight).toBeLessThanOrEqual(viewport.height);

        await expectButtonsOnScreen(page, viewport, 26);

        // Stacked: ghost, then board, then controls
        const mascot = await box(page, "mascot");
        const board = await box(page, "board");
        const controls = await box(page, "controls");

        expect(mascot.y + mascot.height).toBeLessThanOrEqual(board.y);
        expect(board.y + board.height).toBeLessThanOrEqual(controls.y);

        if (index < levels.length - 1) {
          await page.getByRole("button", { name: "Next level" }).tap();
        }
      }
    });
  });
}