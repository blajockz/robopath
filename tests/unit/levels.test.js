import { describe, expect, it } from "vitest";
import {
  countCommands,
  emptyProgram,
  parseLevel,
  runToEnd,
  sanitizeProgram,
} from "../../lib/engine";
import { levels } from "../../lib/levels";
import { solutions } from "../solutions";

describe("the level list", () => {
  it("has six levels with unique ids", () => {
    expect(levels).toHaveLength(6);
    expect(new Set(levels.map((level) => level.id)).size).toBe(6);
  });

  it("has a known solution for every level", () => {
    expect(Object.keys(solutions).sort()).toEqual(levels.map((level) => level.id).sort());
  });
});

describe.each(levels)("level: $name", (level) => {
  const parsed = parseLevel(level);
  const solution = sanitizeProgram(level, solutions[level.id]);

  it("has a valid map, a name and a hint", () => {
    expect(level.name).toBeTruthy();
    expect(level.hint).toBeTruthy();
    expect(parsed.stars.length).toBeGreaterThan(0);
    // Small enough to stay readable on a phone in landscape
    expect(parsed.cols).toBeLessThanOrEqual(8);
    expect(parsed.rows).toBeLessThanOrEqual(5);
  });

  it("starts the ghost on a tile, facing a valid direction", () => {
    const { x, y, dir } = parsed.start;

    expect(parsed.tiles[y * parsed.cols + x]).toBeTruthy();
    expect([0, 1, 2, 3]).toContain(dir);
  });

  it("limits the functions to a small number of slots", () => {
    expect(level.slots).toHaveLength(2);
    expect(level.slots[0]).toBeGreaterThan(0);
    expect(level.slots[0]).toBeLessThanOrEqual(8);
    expect(level.slots[1]).toBeLessThanOrEqual(8);
  });

  it("is solved by its known solution, within the slot limits", () => {
    // sanitizeProgram cuts anything over the limits, so the solution
    // must survive it unchanged to count
    expect(countCommands(solution)).toBe(countCommands(solutions[level.id]));

    const result = runToEnd(parsed, solution);

    expect(result.status).toBe("won");
    expect(result.stars).toEqual([]);
  });

  it("is not solved by an empty program", () => {
    expect(runToEnd(parsed, emptyProgram(level)).status).toBe("ended");
  });

  it("is not solved by just walking straight ahead", () => {
    const straight = sanitizeProgram(level, [
      [
        { cmd: "forward", color: null },
        { cmd: "f1", color: null },
      ],
    ]);

    // Level 2 is the one level where this IS the answer
    if (level.id !== "loop") {
      expect(runToEnd(parsed, straight).status).not.toBe("won");
    }
  });
});

describe("difficulty", () => {
  it("needs F2 only from level 5 on", () => {
    expect(levels.map((level) => level.slots[1] > 0)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("introduces colour conditions at level 3", () => {
    const usesColor = levels.map((level) =>
      solutions[level.id].flat().some((command) => command.color)
    );

    expect(usesColor.slice(0, 2)).toEqual([false, false]);
    expect(usesColor[2]).toBe(true);
  });
});
