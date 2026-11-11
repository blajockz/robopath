// Saves progress in the player's own browser (localStorage).
//
// Saved data can be edited by the player, so nothing read from it is
// trusted: every value is checked and rebuilt before the game uses it.

import { sanitizeProgram } from "./engine";

export const STORAGE_KEY = "robopath:v1";
const MAX_SAVED_SIZE = 20000; // characters; real saves are far smaller

export function emptyProgress(levels) {
  return {
    solved: levels.map(() => false),
    programs: levels.map((level) => sanitizeProgram(level, null)),
  };
}

/** Rebuilds progress from untrusted data. Never throws. */
export function sanitizeProgress(levels, raw) {
  const clean = emptyProgress(levels);

  if (!raw || typeof raw !== "object") return clean;

  levels.forEach((level, index) => {
    // A level only counts as solved if every level before it is solved too
    const previousSolved = index === 0 || clean.solved[index - 1];
    clean.solved[index] =
      previousSolved && Array.isArray(raw.solved) && raw.solved[index] === true;

    if (Array.isArray(raw.programs)) {
      clean.programs[index] = sanitizeProgram(level, raw.programs[index]);
    }
  });

  return clean;
}

export function loadProgress(levels) {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);

    if (typeof text !== "string" || text.length > MAX_SAVED_SIZE) {
      return emptyProgress(levels);
    }

    return sanitizeProgress(levels, JSON.parse(text));
  } catch {
    // Storage blocked (private mode) or the saved text is not valid JSON
    return emptyProgress(levels);
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: the game still works, it just won't remember
  }
}
