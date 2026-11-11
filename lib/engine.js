// Game engine: pure functions, no React and no browser APIs.
// Everything here is covered by tests/unit/engine.test.js.

export const COMMANDS = ["forward", "left", "right", "f1", "f2"];
export const COLORS = ["blue", "orange", "green"];

// Hard limits, so a program can never freeze the browser
export const MAX_STEPS = 1000; // commands executed in one run
export const MAX_STACK = 200; // nested function calls

// Directions: 0 = up, 1 = right, 2 = down, 3 = left
const DELTAS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const TILE_LETTERS = { b: "blue", o: "orange", g: "green" };

/**
 * Turns a level definition into data the engine can use.
 * Map letters: "." = no tile, b/o/g = blue/orange/green tile,
 * B/O/G = the same tile with a star on it.
 */
export function parseLevel(level) {
  const rows = level.map.length;
  const cols = level.map[0].length;
  const tiles = []; // colour name, or null where there is no tile
  const stars = []; // tile indexes that hold a star

  level.map.forEach((line, y) => {
    if (line.length !== cols) {
      throw new Error(`Level "${level.name}": row ${y} has the wrong length`);
    }

    [...line].forEach((letter, x) => {
      const color = TILE_LETTERS[letter.toLowerCase()] ?? null;

      if (letter !== "." && !color) {
        throw new Error(`Level "${level.name}": unknown map letter "${letter}"`);
      }

      tiles.push(color);
      if (color && letter !== letter.toLowerCase()) stars.push(y * cols + x);
    });
  });

  return {
    cols,
    rows,
    tiles,
    stars,
    start: { ...level.start },
    slots: [...level.slots],
    // Colour conditions are only offered when the map has more than one colour
    colors: COLORS.filter((color) => tiles.includes(color)),
  };
}

/** An empty program for a level: one list of empty slots per function. */
export function emptyProgram(level) {
  return level.slots.map((count) => Array(count).fill(null));
}

/**
 * Returns a clean copy of a program, keeping only what the level allows.
 * Used on anything that comes from outside the code (saved data), and
 * before every run, so the engine never sees unexpected values.
 */
export function sanitizeProgram(level, raw) {
  const allowedColors = parseLevel(level).colors;
  const allowedCommands = COMMANDS.filter(
    (command) => command !== "f2" || level.slots[1] > 0
  );

  return level.slots.map((count, fn) => {
    const source = Array.isArray(raw) && Array.isArray(raw[fn]) ? raw[fn] : [];

    return Array.from({ length: count }, (_, slot) => {
      const item = source[slot];

      if (!item || typeof item !== "object") return null;
      if (!allowedCommands.includes(item.cmd)) return null;

      const color =
        allowedColors.length > 1 && allowedColors.includes(item.color)
          ? item.color
          : null;

      return { cmd: item.cmd, color };
    });
  });
}

export function countCommands(program) {
  return program.flat().filter(Boolean).length;
}

/** The state at the start of a run. */
export function createRun(parsed) {
  return {
    x: parsed.start.x,
    y: parsed.start.y,
    dir: parsed.start.dir,
    stars: parsed.stars.filter(
      (index) => index !== parsed.start.y * parsed.cols + parsed.start.x
    ),
    stack: [{ fn: 0, ip: 0 }], // the program always starts in F1
    steps: 0,
    active: null, // { fn, slot } of the command that just ran
    // running | won | fell | ended | limit
    status: "running",
  };
}

function tileAt(parsed, x, y) {
  if (x < 0 || y < 0 || x >= parsed.cols || y >= parsed.rows) return null;

  return parsed.tiles[y * parsed.cols + x];
}

/**
 * Advances the run until the ghost makes one visible action (a move or a
 * turn), or until the run finishes. Returns a new state; the old one is
 * left untouched.
 */
export function step(parsed, program, state) {
  if (state.status !== "running") return state;

  const next = {
    ...state,
    stars: [...state.stars],
    stack: state.stack.map((frame) => ({ ...frame })),
  };

  while (true) {
    const frame = next.stack[next.stack.length - 1];

    // Nothing left to run: the program ended without collecting every star
    if (!frame) {
      next.status = "ended";
      next.active = null;
      return next;
    }

    const slots = program[frame.fn] ?? [];

    // End of this function: go back to the one that called it
    if (frame.ip >= slots.length) {
      next.stack.pop();
      continue;
    }

    const slot = frame.ip;
    const command = slots[slot];
    frame.ip++;

    if (!command) continue; // empty slot

    next.steps++;
    if (next.steps > MAX_STEPS) {
      next.status = "limit";
      return next;
    }

    // A coloured command only runs on a tile of the same colour
    const here = tileAt(parsed, next.x, next.y);
    if (command.color && command.color !== here) continue;

    next.active = { fn: frame.fn, slot };

    if (command.cmd === "f1" || command.cmd === "f2") {
      // If the caller has nothing left to do, drop it first. This keeps
      // simple loops such as "forward, F1" from growing the stack.
      if (slots.slice(frame.ip).every((rest) => !rest)) next.stack.pop();

      next.stack.push({ fn: command.cmd === "f1" ? 0 : 1, ip: 0 });

      if (next.stack.length > MAX_STACK) {
        next.status = "limit";
        return next;
      }
      continue;
    }

    if (command.cmd === "left") {
      next.dir = (next.dir + 3) % 4;
      return next;
    }

    if (command.cmd === "right") {
      next.dir = (next.dir + 1) % 4;
      return next;
    }

    // forward
    const [dx, dy] = DELTAS[next.dir];
    const x = next.x + dx;
    const y = next.y + dy;

    if (!tileAt(parsed, x, y)) {
      next.status = "fell";
      return next;
    }

    next.x = x;
    next.y = y;
    next.stars = next.stars.filter((index) => index !== y * parsed.cols + x);

    if (next.stars.length === 0) next.status = "won";

    return next;
  }
}

/** Runs a whole program at once. Used by the tests. */
export function runToEnd(parsed, program) {
  let state = createRun(parsed);

  // Each call to step() either moves, turns or finishes, and the engine
  // stops by itself after MAX_STEPS commands, so this loop always ends.
  for (let i = 0; i <= MAX_STEPS && state.status === "running"; i++) {
    state = step(parsed, program, state);
  }

  return state;
}
