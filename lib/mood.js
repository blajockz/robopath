// Which ghost animation the mascot shows, for each moment of the game.

export const MOODS = {
  idle: "/mascot/idle.gif", // a level just opened, nothing written yet
  thinking: "/mascot/thinking.gif", // empty program for a while, or a failed run
  coding: "/mascot/coding.gif", // writing the program, and while it runs
  celebrate: "/mascot/celebrate.gif", // a star was just collected, or level complete
  victory: "/mascot/victory.gif", // the last level is complete
};

// How long the mascot celebrates after each star during a run
export const STAR_FLASH_MS = 900;

// How long an empty program waits before the mascot starts thinking
export const PONDER_MS = 6000;

const FAILED = ["fell", "ended", "limit"];

/**
 * status:     "ready" (not run yet), "running", "won", or a failure
 * hasCommands: the program has at least one command
 * starFlash:   a star was collected a moment ago
 * pondering:   the program has been empty for a while
 * isLastLevel: this is the final level
 */
export function getMood({ status, hasCommands, starFlash, pondering, isLastLevel }) {
  if (status === "won") return isLastLevel ? "victory" : "celebrate";
  if (FAILED.includes(status)) return "thinking";
  if (status === "running") return starFlash ? "celebrate" : "coding";
  if (hasCommands) return "coding";

  return pondering ? "thinking" : "idle";
}
