import { expect, test } from "@playwright/test";
import { levels } from "../../lib/levels";
import { solutions } from "../solutions";
import { STORAGE_KEY, enterProgram, openGame } from "./helpers";

// A phone in landscape, the main way people will play
test.use({ viewport: { width: 740, height: 360 } });

test("a player can finish all six levels by tapping", async ({ page }) => {
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(String(error)));

  await openGame(page);
  // Fastest speed, so the test does not take long
  await page.getByRole("button", { name: /^Speed x1/ }).tap();
  await page.getByRole("button", { name: /^Speed x2/ }).tap();

  for (const [index, level] of levels.entries()) {
    await expect(page.getByRole("heading", { name: level.name })).toBeVisible();
    await expect(page.getByText(`Level 0${index + 1}`)).toBeVisible();

    await enterProgram(page, solutions[level.id]);
    await page.getByRole("button", { name: "Run program" }).tap();

    if (index < levels.length - 1) {
      await expect(page.getByText("Level complete!")).toBeVisible({ timeout: 30000 });
      await page.getByRole("button", { name: "Next level", exact: true }).last().tap();
    } else {
      await expect(page.getByText("You finished all 6 levels. Well played!")).toBeVisible({
        timeout: 30000,
      });

      // A moment later, the victory window opens and fits the screen
      const victory = page.getByRole("dialog", { name: "Victory!" });
      await expect(victory).toBeVisible();
      const box = await victory.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(360);
      await page.getByRole("button", { name: "Close" }).tap();
      await expect(victory).toBeHidden();
    }
  }

  // Nothing was blocked by the security policy and nothing crashed
  expect(problems).toEqual([]);
});

test("progress is still there after reloading the page", async ({ page }) => {
  await openGame(page);
  await enterProgram(page, solutions["first-steps"]);
  await page.getByRole("button", { name: "Run program" }).tap();
  await expect(page.getByText("Level complete!")).toBeVisible({ timeout: 15000 });

  await page.reload();

  // Level 1 is solved, so the game opens on level 2
  await expect(page.getByRole("heading", { name: "Loop" })).toBeVisible();
});

test("editing the saved data does not unlock later levels", async ({ page }) => {
  await openGame(page, { solved: [false, false, false, false, false, true] });

  await expect(page.getByRole("heading", { name: "First steps" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next level" })).toBeDisabled();
});

test("broken saved data is ignored", async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, "{broken"), STORAGE_KEY);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "First steps" })).toBeVisible();
});

test("the server sends the security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the page loads nothing from other websites", async ({ page }) => {
  const outside = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol.startsWith("http")) {
      outside.push(request.url());
    }
  });

  await openGame(page);
  await page.waitForLoadState("networkidle");

  expect(outside).toEqual([]);
});

test("a command with a colour condition is shown in that colour", async ({ page }) => {
  await openGame(page, { solved: [true, true, false, false, false, false] });
  await page.getByRole("button", { name: "Only on orange" }).tap();
  await page.getByRole("button", { name: "Turn right", exact: true }).tap();

  const background = (name) =>
    page.getByRole("button", { name }).evaluate((element) => getComputedStyle(element).backgroundColor);

  expect(await background("F1 slot 1: Turn right on orange")).toBe(await background("Only on orange"));
  expect(await background("F1 slot 1: Turn right on orange")).not.toBe(await background("F1 slot 2: empty"));
});

test("on a phone, the first tap asks for full screen", async ({ page }) => {
  // Record the request instead of really going full screen
  await page.addInitScript(() => {
    window.fullscreenRequests = 0;
    Element.prototype.requestFullscreen = async function () {
      window.fullscreenRequests++;
    };
  });
  await page.emulateMedia({});
  await openGame(page);

  const isTouch = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  test.skip(!isTouch, "this browser is not emulating a touch screen");

  expect(await page.evaluate(() => window.fullscreenRequests)).toBe(0);
  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  expect(await page.evaluate(() => window.fullscreenRequests)).toBe(1);
});

test("the help is available in Arabic, right to left", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "How to play" }).tap();
  await page.getByRole("button", { name: "العربية" }).tap();

  const dialog = page.getByRole("dialog", { name: "طريقة اللعب" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("ol")).toHaveCSS("direction", "rtl");

  // The whole window still fits the phone screen
  const box = await dialog.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(360);

  await page.getByRole("button", { name: "فهمت" }).tap();
  await expect(dialog).toBeHidden();
});

test("the ghost is animated", async ({ page }) => {
  await openGame(page);

  const animation = await page
    .getByTestId("ghost")
    .locator("svg")
    .evaluate((element) => getComputedStyle(element).animationName);

  expect(animation).not.toBe("none");
});

test("only the N7GD club is shown", async ({ page }) => {
  await openGame(page);

  await expect(page.getByAltText("N7GD, the game dev club")).toBeVisible();
  await expect(page).toHaveTitle("RoboPath Challenge | N7GD");
  expect(await page.content()).not.toMatch(/N7SEC/i);
});

test("the ghost's animations load and change with the game", async ({ page }) => {
  await openGame(page);

  const mascot = page.getByTestId("mascot-mood");
  await expect(mascot).toHaveAttribute("data-mood", "idle");

  // Every animation is a real, loaded 128 x 128 image
  for (const name of ["idle", "thinking", "coding", "celebrate", "victory"]) {
    const response = await page.request.get(`/mascot/${name}.gif`);
    expect(response.status(), name).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/gif");
  }

  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  await expect(mascot).toHaveAttribute("data-mood", "coding");

  const size = await mascot
    .locator("img")
    .evaluate((img) => (img.complete ? [img.naturalWidth, img.naturalHeight] : null));
  expect(size).toEqual([128, 128]);
});

test("sounds play through the browser's audio, and can be turned off", async ({ page }) => {
  // Count the notes the game asks the browser to play
  await page.addInitScript(() => {
    window.notesPlayed = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      window.notesPlayed++;
      return original.call(this);
    };
  });
  await openGame(page);
  const notes = () => page.evaluate(() => window.notesPlayed);

  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  expect(await notes()).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Sound" }).tap();
  await expect(page.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "false");
  const before = await notes();

  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  await page.getByRole("button", { name: "Run program" }).tap();
  await page.waitForTimeout(1000);
  expect(await notes()).toBe(before);

  // The choice survives a reload
  await page.reload();
  await expect(page.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "false");
});