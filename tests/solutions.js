// One known solution per level, used by the tests to prove that every
// level can be solved within its slot limits.
//
// This file is only used by tests. It is never imported by the app, so
// the solutions are not sent to players' browsers.
//
// Short notation: F = forward, L = turn left, R = turn right,
// 1 = call F1, 2 = call F2. A colour letter in front (b, o, g) makes the
// command run only on a tile of that colour.

const COMMAND_LETTERS = { F: "forward", L: "left", R: "right", 1: "f1", 2: "f2" };
const COLOR_LETTERS = { b: "blue", o: "orange", g: "green" };

/** Turns "F oR 1" into the program format the engine uses. */
export function program(...functions) {
  return functions.map((text) =>
    text
      .split(" ")
      .filter(Boolean)
      .map((token) => ({
        cmd: COMMAND_LETTERS[token.at(-1)],
        color: token.length > 1 ? COLOR_LETTERS[token[0]] : null,
      }))
  );
}

export const solutions = {
  "first-steps": program("F F F L F F", ""),
  loop: program("F 1", ""),
  "colour-sensor": program("F oR 1", ""),
  "left-or-right": program("F oR gL 1", ""),
  helper: program("2 1", "F L F R"),
  "side-quests": program("F g2 1", "L F F L L F F L"),
};
