import { levels } from "../../lib/levels";

export const STORAGE_KEY = "robopath:v1";

/** Opens the game with the given saved progress already in the browser. */
export async function openGame(page, saved) {
  if (saved) {
    await page.addInitScript(
      ([key, value]) => {
        // Only on the first load, so progress made during the test is kept
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, value);
        }
      },
      [STORAGE_KEY, JSON.stringify(saved)]
    );
  }

  await page.goto("/");
  await page.getByRole("button", { name: "How to play" }).waitFor();
}

export const allSolved = { solved: levels.map(() => true) };

const COMMAND_LABELS = {
  forward: "Forward",
  left: "Turn left",
  right: "Turn right",
  f1: "Call F1",
  f2: "Call F2",
};

/** Enters a program by tapping, exactly as a player would. */
export async function enterProgram(page, program) {
  for (const [fn, commands] of program.entries()) {
    if (commands.length === 0) continue;

    await page.getByRole("button", { name: new RegExp(`^F${fn + 1} slot 1:`) }).tap();

    for (const command of commands) {
      const brush = command.color ? `Only on ${command.color}` : "Any colour";
      const brushButton = page.getByRole("button", { name: brush });

      if (await brushButton.count()) await brushButton.tap();

      await page.getByRole("button", { name: COMMAND_LABELS[command.cmd], exact: true }).tap();
    }
  }
}
