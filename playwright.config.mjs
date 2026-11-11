import { defineConfig } from "@playwright/test";

// Browser tests (tests/e2e). They start the game, open it in a real
// browser at several phone sizes, and play it by tapping.
//
// First time only:  npx playwright install chromium
// Then:             npm run test:e2e
// By default the tests run in Chromium (Chrome, Edge, Brave, Opera...).
// To also run them in Firefox and in WebKit (Safari's engine):
//   npx playwright install firefox webkit
//   PW_ALL_BROWSERS=1 npm run test:e2e      (Windows cmd: set PW_ALL_BROWSERS=1)
const projects = [{ name: "chromium", use: { browserName: "chromium" } }];

if (process.env.PW_ALL_BROWSERS) {
  projects.push(
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } }
  );
}

export default defineConfig({
  projects,
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    // Set PW_CHANNEL=chrome to use an installed Google Chrome instead
    channel: process.env.PW_CHANNEL || undefined,
    hasTouch: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
