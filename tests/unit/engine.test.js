import { describe, expect, it } from "vitest";
import {
  MAX_STACK,
  MAX_STEPS,
  countCommands,
  createRun,
  emptyProgram,
  parseLevel,
  runToEnd,
  sanitizeProgram,
  step,
} from "../../lib/engine";
import { program } from "../solutions";

// A small level used by most tests:
//   b B        start at the left, facing right
//   o .
const level = {
  name: "Test",
  map: ["bB", "o."],
  start: { x: 0, y: 0, dir: 1 },
  slots: [4, 2],
};
const parsed = parseLevel(level);

function run(testLevel, ...functions) {
  return runToEnd(parseLevel(testLevel), sanitizeProgram(testLevel, program(...functions)));
}

describe("parseLevel", () => {
  it("reads the size, tiles and stars of a map", () => {
    expect(parsed.cols).toBe(2);
    expect(parsed.rows).toBe(2);
    expect(parsed.tiles).toEqual(["blue", "blue", "orange", null]);
    expect(parsed.stars).toEqual([1]);
  });

  it("lists only the colours that appear in the map", () => {
    expect(parsed.colors).toEqual(["blue", "orange"]);
  });

  it("rejects rows of different lengths", () => {
    expect(() => parseLevel({ ...level, map: ["bB", "o"] })).toThrow();
  });

  it("rejects unknown map letters", () => {
    expect(() => parseLevel({ ...level, map: ["bB", "x."] })).toThrow();
  });
});

describe("emptyProgram and countCommands", () => {
  it("creates one list of empty slots per function", () => {
    expect(emptyProgram(level)).toEqual([
      [null, null, null, null],
      [null, null],
    ]);
  });

  it("counts only the filled slots", () => {
    expect(countCommands(emptyProgram(level))).toBe(0);
    expect(countCommands(sanitizeProgram(level, program("F L", "R")))).toBe(3);
  });
});

describe("sanitizeProgram", () => {
  it("returns an empty program for junk input", () => {
    for (const junk of [null, undefined, 42, "text", {}, [], [[1, "x", {}]]]) {
      expect(sanitizeProgram(level, junk)).toEqual(emptyProgram(level));
    }
  });

  it("drops unknown commands and unknown colours", () => {
    const clean = sanitizeProgram(level, [
      [
        { cmd: "forward", color: "pink" },
        { cmd: "explode", color: null },
        { cmd: "left", color: "orange" },
      ],
    ]);

    expect(clean[0]).toEqual([
      { cmd: "forward", color: null },
      null,
      { cmd: "left", color: "orange" },
      null,
    ]);
  });

  it("never keeps more commands than the level has slots", () => {
    const tooLong = [Array(50).fill({ cmd: "forward", color: null })];

    expect(sanitizeProgram(level, tooLong)[0]).toHaveLength(4);
  });

  it("drops F2 calls when the level has no F2", () => {
    const noF2 = { ...level, slots: [4, 0] };

    expect(sanitizeProgram(noF2, program("2 F"))[0][0]).toBeNull();
  });

  it("drops colours when the map has a single colour", () => {
    const oneColor = { ...level, map: ["bB"] };

    expect(sanitizeProgram(oneColor, program("bF"))[0][0]).toEqual({
      cmd: "forward",
      color: null,
    });
  });

  it("copies the data instead of keeping a reference to it", () => {
    const original = { cmd: "forward", color: null, extra: "<script>" };
    const clean = sanitizeProgram(level, [[original]]);

    expect(clean[0][0]).not.toBe(original);
    expect(clean[0][0]).toEqual({ cmd: "forward", color: null });
  });
});

describe("step", () => {
  it("moves forward and collects the star", () => {
    const state = step(parsed, program("F"), createRun(parsed));

    expect([state.x, state.y]).toEqual([1, 0]);
    expect(state.status).toBe("won");
    expect(state.stars).toEqual([]);
  });

  it("turns left and right", () => {
    const start = createRun(parsed); // facing right (1)

    expect(step(parsed, program("L"), start).dir).toBe(0);
    expect(step(parsed, program("R"), start).dir).toBe(2);
  });

  it("does not change the state it was given", () => {
    const start = createRun(parsed);
    const snapshot = JSON.stringify(start);

    step(parsed, program("F"), start);

    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it("reports which command just ran", () => {
    const state = step(parsed, sanitizeProgram(level, [[null, { cmd: "left" }]]), createRun(parsed));

    expect(state.active).toEqual({ fn: 0, slot: 1 });
  });

  it("does nothing once the run is over", () => {
    const won = step(parsed, program("F"), createRun(parsed));

    expect(step(parsed, program("F"), won)).toBe(won);
  });
});

describe("running a program", () => {
  it("fails when the ghost leaves the tiles", () => {
    expect(run(level, "L F").status).toBe("fell"); // off the top edge
    expect(run(level, "R F R F").status).toBe("fell"); // onto the empty corner
  });

  it("keeps the ghost on its last tile when it falls", () => {
    const state = run(level, "L F");

    expect([state.x, state.y]).toEqual([0, 0]);
  });

  it("ends without a win when commands run out", () => {
    expect(run(level, "L").status).toBe("ended");
    expect(run(level, "").status).toBe("ended");
  });

  it("skips empty slots", () => {
    const state = runToEnd(parsed, [[null, null, { cmd: "forward", color: null }, null], []]);

    expect(state.status).toBe("won");
  });

  it("runs a coloured command only on a tile of that colour", () => {
    // Start tile is blue: the orange turn is skipped, the blue move runs
    expect(run(level, "oR bF").status).toBe("won");
    // The orange move is skipped, so nothing happens
    expect(run(level, "oF").status).toBe("ended");
  });

  it("calls F2 and comes back to F1", () => {
    // F2 turns around twice (no net change), then F1 moves forward
    const state = run(level, "2 F", "R L");

    expect(state.status).toBe("won");
  });

  it("repeats with a function that calls itself", () => {
    const line = { ...level, map: ["bbbbbbB"], slots: [2, 0] };

    expect(run(line, "F 1").status).toBe("won");
  });

  it("stops an endless loop instead of freezing", () => {
    const spin = run(level, "L 1"); // turns forever
    const callOnly = run(level, "1"); // calls itself forever, never moves

    expect(spin.status).toBe("limit");
    expect(callOnly.status).toBe("limit");
    expect(spin.steps).toBeLessThanOrEqual(MAX_STEPS + 1);
  });

  it("keeps a long simple loop from overflowing the stack", () => {
    // Empty slots after the call must not make the stack grow
    const line = { ...level, map: ["b".repeat(MAX_STACK + 50) + "B"], slots: [4, 0] };
    const state = run(line, "F 1");

    expect(state.status).toBe("won");
    expect(state.stack.length).toBeLessThan(5);
  });

  it("stops recursion that really does nest too deep", () => {
    // The turn after the call means every call must be remembered
    const state = run(level, "1 L");

    expect(state.status).toBe("limit");
    expect(state.stack.length).toBeLessThanOrEqual(MAX_STACK + 1);
  });
});
