// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { levels } from "../../lib/levels";
import {
  STORAGE_KEY,
  emptyProgress,
  loadProgress,
  sanitizeProgress,
  saveProgress,
} from "../../lib/storage";
import { solutions } from "../solutions";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("emptyProgress", () => {
  it("starts with nothing solved and empty programs", () => {
    const progress = emptyProgress(levels);

    expect(progress.solved).toEqual([false, false, false, false, false, false]);
    expect(progress.programs).toHaveLength(6);
    expect(progress.programs[0][0]).toEqual(Array(6).fill(null));
  });
});

describe("saveProgress and loadProgress", () => {
  it("gives back what was saved", () => {
    const progress = emptyProgress(levels);
    progress.solved[0] = true;
    progress.programs[0][0][0] = { cmd: "forward", color: null };

    saveProgress(progress);

    expect(loadProgress(levels)).toEqual(progress);
  });

  it("starts fresh when nothing is saved", () => {
    expect(loadProgress(levels)).toEqual(emptyProgress(levels));
  });

  it("starts fresh when the saved text is not valid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadProgress(levels)).toEqual(emptyProgress(levels));
  });

  it("starts fresh when the saved text is suspiciously large", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ junk: "x".repeat(50000) }));

    expect(loadProgress(levels)).toEqual(emptyProgress(levels));
  });

  it("does not crash when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(loadProgress(levels)).toEqual(emptyProgress(levels));
    expect(() => saveProgress(emptyProgress(levels))).not.toThrow();
  });
});

describe("sanitizeProgress (saved data is not trusted)", () => {
  it("ignores junk", () => {
    for (const junk of [null, 7, "x", [], { solved: "yes", programs: 3 }]) {
      expect(sanitizeProgress(levels, junk)).toEqual(emptyProgress(levels));
    }
  });

  it("does not let a player skip ahead by editing the saved data", () => {
    // Claims level 6 is solved without solving levels 2 to 5
    const edited = { solved: [true, false, false, false, false, true] };

    expect(sanitizeProgress(levels, edited).solved).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("only accepts the exact value true as solved", () => {
    const edited = { solved: [1, "true", {}, [], true, true] };

    expect(sanitizeProgress(levels, edited).solved).toEqual(Array(6).fill(false));
  });

  it("cleans saved programs to fit each level", () => {
    const edited = {
      programs: [
        [Array(40).fill({ cmd: "forward", color: null })], // far too long
        [[{ cmd: "<img src=x onerror=alert(1)>", color: null }]], // not a command
      ],
    };
    const clean = sanitizeProgress(levels, edited);

    expect(clean.programs[0][0]).toHaveLength(6);
    expect(clean.programs[1][0]).toEqual([null, null]);
  });

  it("keeps valid saved solutions unchanged", () => {
    const saved = {
      solved: Array(6).fill(true),
      programs: levels.map((level) => solutions[level.id]),
    };
    const clean = sanitizeProgress(levels, saved);

    expect(clean.solved).toEqual(Array(6).fill(true));
    expect(clean.programs[5][1]).toHaveLength(8);
    expect(clean.programs[5][1][0]).toEqual({ cmd: "left", color: null });
  });
});
