// Runs before every test file.
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  // Adds matchers such as toBeDisabled() and toBeInTheDocument()
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });
}
