import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MOODS, getMood } from "../../lib/mood";

const base = {
  status: "ready",
  hasCommands: false,
  starFlash: false,
  pondering: false,
  isLastLevel: false,
};

describe("getMood", () => {
  it("is idle when a level opens with an empty program", () => {
    expect(getMood(base)).toBe("idle");
  });

  it("thinks when the program has stayed empty for a while", () => {
    expect(getMood({ ...base, pondering: true })).toBe("thinking");
  });

  it("codes while the player writes the program", () => {
    expect(getMood({ ...base, hasCommands: true })).toBe("coding");
    // Writing commands beats pondering
    expect(getMood({ ...base, hasCommands: true, pondering: true })).toBe("coding");
  });

  it("codes while the program runs, and celebrates a star for a moment", () => {
    expect(getMood({ ...base, status: "running", hasCommands: true })).toBe("coding");
    expect(getMood({ ...base, status: "running", hasCommands: true, starFlash: true })).toBe(
      "celebrate"
    );
  });

  it.each(["fell", "ended", "limit"])("thinks after a failed run (%s)", (status) => {
    expect(getMood({ ...base, status, hasCommands: true })).toBe("thinking");
  });

  it("celebrates a complete level", () => {
    expect(getMood({ ...base, status: "won", hasCommands: true })).toBe("celebrate");
  });

  it("shows the victory animation after the last level", () => {
    expect(getMood({ ...base, status: "won", hasCommands: true, isLastLevel: true })).toBe(
      "victory"
    );
  });
});

describe("MOODS", () => {
  it("has the five animations", () => {
    expect(Object.keys(MOODS).sort()).toEqual(["celebrate", "coding", "idle", "thinking", "victory"]);
  });

  it.each(Object.entries(MOODS))("%s points to a GIF that exists in public/", (_, src) => {
    expect(src).toMatch(/^\/mascot\/\w+\.gif$/);
    expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
  });
});
