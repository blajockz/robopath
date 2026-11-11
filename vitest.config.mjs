import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests run in plain Node. UI tests ask for a browser-like
    // environment with a "@vitest-environment jsdom" line at the top.
    environment: "node",
    include: ["tests/unit/**/*.test.{js,jsx}", "tests/ui/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
    restoreMocks: true,
  },
});
