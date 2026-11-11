// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "../../components/Game";
import { levels } from "../../lib/levels";
import { MOODS, PONDER_MS, STAR_FLASH_MS } from "../../lib/mood";
import { SOUND_KEY, playSound, resetSoundForTests } from "../../lib/sound";
import { STORAGE_KEY } from "../../lib/storage";
import { program, solutions } from "../solutions";

// next/image needs the Next.js server; a plain <img> is enough here
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

// Record which sounds play, instead of playing them
vi.mock("../../lib/sound", async (importOriginal) => ({
  ...(await importOriginal()),
  playSound: vi.fn(),
}));

const COMMAND_LABELS = {
  forward: "Forward",
  left: "Turn left",
  right: "Turn right",
  f1: "Call F1",
  f2: "Call F2",
};

// ---------- helpers ----------

function button(name) {
  return screen.getByRole("button", { name });
}

function tap(name) {
  fireEvent.click(button(name));
}

function slot(fn, number) {
  return button(new RegExp(`^F${fn} slot ${number}:`));
}

function ghost() {
  const element = screen.getByTestId("ghost");

  return {
    x: Number(element.dataset.x),
    y: Number(element.dataset.y),
    dir: Number(element.dataset.dir),
  };
}

function message() {
  return within(screen.getByRole("status")).getByRole("paragraph").textContent;
}

/**
 * Lets the game clock run. One move takes 420 ms at speed x1.
 * Time advances in small slices so the screen updates between moves,
 * as it does in a real browser.
 */
async function wait(ms) {
  for (let left = ms; left > 0; left -= 140) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(140, left));
    });
  }
}

/** Lets the game run until the current run is over (win or fail). */
async function finish() {
  for (let i = 0; i < 3000 && message() === "Running..."; i++) {
    await wait(140);
  }
}

/** Enters a program by tapping, like a player. */
function enter(solution) {
  solution.forEach((commands, fn) => {
    if (commands.length === 0) return;

    fireEvent.click(slot(fn + 1, 1));

    for (const command of commands) {
      const brush = screen.queryByRole("button", {
        name: command.color ? `Only on ${command.color}` : "Any colour",
      });
      if (brush) fireEvent.click(brush);

      tap(COMMAND_LABELS[command.cmd]);
    }
  });
}

function save(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function solvedUpTo(count) {
  return { solved: levels.map((_, index) => index < count) };
}

function mood() {
  return screen.getByTestId("mascot-mood").dataset.mood;
}

function sounds() {
  return playSound.mock.calls.map(([name]) => name);
}

beforeEach(() => {
  vi.useFakeTimers();
  playSound.mockClear();
  resetSoundForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------- tests ----------

describe("first screen", () => {
  it("shows level 1 with its name, hint and star count", () => {
    render(<Game />);

    expect(screen.getByRole("heading", { name: "RoboPath" })).toBeInTheDocument();
    expect(screen.getByText("Level 01")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First steps" })).toBeInTheDocument();
    expect(message()).toBe(levels[0].hint);
    expect(screen.getByLabelText("0 of 1 stars collected")).toBeInTheDocument();
  });

  it("shows the N7GD logo, and no other club", () => {
    render(<Game />);

    expect(screen.getByAltText("N7GD, the game dev club")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /club/ })).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/N7SEC/i);
  });

  it("shows how many levels are solved", () => {
    save(solvedUpTo(2));
    render(<Game />);

    expect(screen.getByRole("img", { name: "2 of 6 levels solved" })).toBeInTheDocument();
  });

  it("shows exactly the slots the level allows", () => {
    render(<Game />);

    expect(screen.getAllByRole("button", { name: /^F1 slot/ })).toHaveLength(6);
    expect(screen.queryAllByRole("button", { name: /^F2 slot/ })).toHaveLength(0);
  });

  it("hides what level 1 does not use: F2 and colours", () => {
    render(<Game />);

    expect(screen.queryByRole("button", { name: "Call F2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Any colour" })).not.toBeInTheDocument();
  });

  it("starts with play, stop, clear and level arrows disabled", () => {
    render(<Game />);

    expect(button("Run program")).toBeDisabled();
    expect(button("Stop and reset")).toBeDisabled();
    expect(button("Clear program")).toBeDisabled();
    expect(button("Previous level")).toBeDisabled();
    expect(button("Next level")).toBeDisabled();
  });
});

describe("building a program", () => {
  it("puts a command in the selected slot and moves to the next slot", () => {
    render(<Game />);

    expect(slot(1, 1)).toHaveAttribute("aria-pressed", "true");

    tap("Forward");

    expect(button("F1 slot 1: Forward")).toBeInTheDocument();
    expect(slot(1, 2)).toHaveAttribute("aria-pressed", "true");
  });

  it("puts a command in whichever slot the player taps", () => {
    render(<Game />);

    fireEvent.click(slot(1, 4));
    tap("Turn left");

    expect(button("F1 slot 4: Turn left")).toBeInTheDocument();
    expect(button("F1 slot 1: empty")).toBeInTheDocument();
  });

  it("replaces a command when the slot is filled again", () => {
    render(<Game />);

    tap("Forward");
    fireEvent.click(slot(1, 1));
    tap("Turn right");

    expect(button("F1 slot 1: Turn right")).toBeInTheDocument();
  });

  it("stays on the last slot when the function is full", () => {
    render(<Game />);

    for (let i = 0; i < 8; i++) tap("Forward");

    expect(screen.getAllByRole("button", { name: /^F1 slot \d: Forward$/ })).toHaveLength(6);
    expect(slot(1, 6)).toHaveAttribute("aria-pressed", "true");
  });

  it("erases like backspace", () => {
    render(<Game />);

    tap("Forward");
    tap("Turn left"); // slots 1 and 2 filled, slot 3 selected
    tap("Erase slot"); // slot 3 is empty, so slot 2 is erased

    expect(button("F1 slot 2: empty")).toBeInTheDocument();
    expect(button("F1 slot 1: Forward")).toBeInTheDocument();
    expect(slot(1, 2)).toHaveAttribute("aria-pressed", "true");
  });

  it("erases the selected slot when it is filled", () => {
    render(<Game />);

    tap("Forward");
    tap("Forward");
    fireEvent.click(slot(1, 1));
    tap("Erase slot");

    expect(button("F1 slot 1: empty")).toBeInTheDocument();
    expect(button("F1 slot 2: Forward")).toBeInTheDocument();
  });

  it("clears the whole program", () => {
    render(<Game />);

    tap("Forward");
    tap("Forward");
    tap("Clear program");

    expect(screen.getAllByRole("button", { name: /^F1 slot \d: empty$/ })).toHaveLength(6);
    expect(button("Run program")).toBeDisabled();
    expect(slot(1, 1)).toHaveAttribute("aria-pressed", "true");
  });

  it("enables play once there is a command", () => {
    render(<Game />);

    tap("Forward");

    expect(button("Run program")).toBeEnabled();
  });
});

describe("running a program", () => {
  it("moves the ghost one step at a time", async () => {
    render(<Game />);
    enter(program("F F"));
    tap("Run program");

    expect(ghost()).toEqual({ x: 0, y: 2, dir: 1 });
    await wait(420);
    expect(ghost().x).toBe(1);
    await wait(420);
    expect(ghost().x).toBe(2);
  });

  it("wins when every star is collected", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    tap("Run program");
    await finish();

    expect(message()).toBe("Level complete!");
    expect(screen.getByLabelText("1 of 1 stars collected")).toBeInTheDocument();
    expect(ghost()).toMatchObject({ x: 3, y: 0 });
  });

  it("explains when the ghost leaves the path", async () => {
    render(<Game />);
    enter(program("L F"));
    tap("Run program");
    await finish();

    expect(message()).toMatch(/left the path/);
  });

  it("explains when the program ends too early", async () => {
    render(<Game />);
    enter(program("F"));
    tap("Run program");
    await finish();

    expect(message()).toMatch(/some stars are left/);
  });

  it("stops an endless loop and explains it", async () => {
    render(<Game />);
    enter(program("L 1"));
    tap(/^Speed x1/);
    tap(/^Speed x2/);
    tap("Run program");
    await finish();

    expect(message()).toMatch(/Too many steps/);
    expect(button("Run program")).toBeEnabled();
  });

  it("locks the editing controls while running", async () => {
    render(<Game />);
    enter(program("F F F"));
    tap("Run program");
    await wait(420);

    expect(button("Forward")).toBeDisabled();
    expect(button("Erase slot")).toBeDisabled();
    expect(button("Clear program")).toBeDisabled();
    expect(slot(1, 1)).toBeDisabled();
    expect(message()).toBe("Running...");
  });

  it("pauses and resumes", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    tap("Run program");
    await wait(420);
    tap("Pause");

    const position = ghost();
    await wait(5000);
    expect(ghost()).toEqual(position);
    expect(message()).toMatch(/Paused/);

    tap("Resume");
    await finish();
    expect(message()).toBe("Level complete!");
  });

  it("stop sends the ghost back to the start and keeps the program", async () => {
    render(<Game />);
    enter(program("F F"));
    tap("Run program");
    await wait(420);
    tap("Stop and reset");

    expect(ghost()).toEqual({ x: 0, y: 2, dir: 1 });
    expect(button("F1 slot 1: Forward")).toBeInTheDocument();
    expect(message()).toBe(levels[0].hint);

    // and nothing keeps running in the background
    await wait(5000);
    expect(ghost().x).toBe(0);
  });

  it("puts the ghost back at the start when the program is edited after a fail", async () => {
    render(<Game />);
    enter(program("F"));
    tap("Run program");
    await finish();
    expect(ghost().x).toBe(1);

    tap("Forward");

    expect(ghost().x).toBe(0);
    expect(message()).toBe(levels[0].hint);
  });

  it("runs again from the start after a fail", async () => {
    render(<Game />);
    enter(program("F"));
    tap("Run program");
    await finish();
    tap("Run program");

    expect(ghost().x).toBe(0);
  });

  it("goes faster at higher speeds", async () => {
    render(<Game />);
    enter(program("F F F"));
    tap(/^Speed x1/);
    tap(/^Speed x2/); // now x3: one move every 140 ms
    tap("Run program");
    await wait(300);

    expect(ghost().x).toBe(2);
  });
});

describe("speed button", () => {
  it("cycles x1, x2, x3 and back to x1", () => {
    render(<Game />);

    tap(/^Speed x1/);
    tap(/^Speed x2/);
    tap(/^Speed x3/);

    expect(button(/^Speed x1/)).toBeInTheDocument();
  });
});

describe("levels", () => {
  it("unlocks the next level only after a win", async () => {
    render(<Game />);
    expect(button("Next level")).toBeDisabled();

    enter(solutions["first-steps"]);
    tap("Run program");
    await finish();

    // One arrow in the top bar and one button in the speech bubble
    const nextButtons = screen.getAllByRole("button", { name: "Next level" });
    expect(nextButtons).toHaveLength(2);
    nextButtons.forEach((next) => expect(next).toBeEnabled());

    fireEvent.click(nextButtons[1]);

    expect(screen.getByRole("heading", { name: "Loop" })).toBeInTheDocument();
    expect(screen.getByText("Level 02")).toBeInTheDocument();
  });

  it("lets the player go back to an earlier level", () => {
    save(solvedUpTo(2));
    render(<Game />);
    expect(screen.getByText("Level 03")).toBeInTheDocument();

    tap("Previous level");

    expect(screen.getByText("Level 02")).toBeInTheDocument();
  });

  it("shows colour brushes from level 3, and uses them", () => {
    save(solvedUpTo(2));
    render(<Game />);

    expect(button("Any colour")).toHaveAttribute("aria-pressed", "true");
    expect(button("Only on blue")).toBeInTheDocument();
    expect(button("Only on orange")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Only on green" })).not.toBeInTheDocument();

    tap("Only on orange");
    tap("Turn right");

    expect(button("F1 slot 1: Turn right on orange")).toBeInTheDocument();
  });

  it("shows F2 from level 5, and moves on to F2 when F1 is full", () => {
    save(solvedUpTo(4));
    render(<Game />);

    expect(screen.getAllByRole("button", { name: /^F1 slot/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^F2 slot/ })).toHaveLength(4);

    tap("Call F2");
    tap("Call F1");
    tap("Forward");

    expect(button("F1 slot 1: Call F2")).toBeInTheDocument();
    expect(button("F2 slot 1: Forward")).toBeInTheDocument();
  });

  it.each(levels.map((level, index) => [index + 1, level]))(
    "level %i can be solved by tapping",
    async (number, level) => {
      save(solvedUpTo(number - 1));
      render(<Game />);
      expect(screen.getByRole("heading", { name: level.name })).toBeInTheDocument();

      enter(solutions[level.id]);
      tap("Run program");
      await finish();

      expect(message()).toMatch(number === 6 ? /finished all 6 levels/ : /Level complete!/);
    }
  );

  it("has no next-level button after the last level", async () => {
    save(solvedUpTo(5));
    render(<Game />);
    enter(solutions["side-quests"]);
    tap("Run program");
    await finish();

    expect(within(screen.getByRole("status")).queryByRole("button")).not.toBeInTheDocument();
    expect(button("Next level")).toBeDisabled();
  });
});

describe("help window", () => {
  it("opens and closes", () => {
    render(<Game />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    tap("How to play");
    expect(screen.getByRole("dialog", { name: "How to play" })).toBeInTheDocument();

    tap("Got it");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is in English first, with Arabic as an option", () => {
    render(<Game />);
    tap("How to play");

    const dialog = screen.getByRole("dialog");
    expect(button("English")).toHaveAttribute("aria-pressed", "true");
    expect(button("العربية")).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(5);
    expect(dialog.querySelector("[dir]")).toHaveAttribute("dir", "ltr");
  });

  it("switches to Arabic, written right to left, and back", () => {
    render(<Game />);
    tap("How to play");
    tap("العربية");

    const dialog = screen.getByRole("dialog", { name: "طريقة اللعب" });
    const text = dialog.querySelector("[dir]");
    expect(text).toHaveAttribute("dir", "rtl");
    expect(text).toHaveAttribute("lang", "ar");
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(5);
    expect(within(dialog).getAllByRole("listitem")[0].textContent).toMatch(/[\u0600-\u06FF]/);
    expect(dialog.textContent).not.toMatch(/Collect every star/);

    tap("English");
    expect(screen.getByRole("dialog", { name: "How to play" })).toBeInTheDocument();
  });

  it("can be closed from the Arabic version", () => {
    render(<Game />);
    tap("How to play");
    tap("العربية");
    tap("فهمت");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when tapping outside it", () => {
    render(<Game />);
    tap("How to play");

    fireEvent.click(screen.getByRole("dialog").parentElement);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("saved progress", () => {
  it("is written to the browser after a win", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    tap("Run program");
    await finish();

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.solved).toEqual([true, false, false, false, false, false]);
    expect(saved.programs[0][0][0]).toEqual({ cmd: "forward", color: null });
  });

  it("opens on the first unsolved level, with the saved program", () => {
    save({ ...solvedUpTo(1), programs: [null, [[{ cmd: "forward", color: null }]]] });
    render(<Game />);

    expect(screen.getByText("Level 02")).toBeInTheDocument();
    expect(button("F1 slot 1: Forward")).toBeInTheDocument();
  });

  it("ignores edited data that tries to skip levels", () => {
    save({ solved: [false, true, true, true, true, true] });
    render(<Game />);

    expect(screen.getByText("Level 01")).toBeInTheDocument();
    expect(button("Next level")).toBeDisabled();
  });

  it("ignores saved commands that are not real commands", () => {
    save({ programs: [[[{ cmd: "<script>alert(1)</script>", color: "red" }]]] });
    render(<Game />);

    expect(button("F1 slot 1: empty")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("still works when the saved data is broken", () => {
    window.localStorage.setItem(STORAGE_KEY, "{broken");
    render(<Game />);

    expect(screen.getByText("Level 01")).toBeInTheDocument();
  });
});

describe("the animated ghost (mascot)", () => {
  it("is idle when a level opens", () => {
    render(<Game />);

    expect(mood()).toBe("idle");
    expect(screen.getByTestId("mascot-mood").querySelector("img")).toHaveAttribute(
      "src",
      MOODS.idle
    );
  });

  it("starts thinking when the program stays empty for a while", async () => {
    render(<Game />);

    await wait(PONDER_MS - 500);
    expect(mood()).toBe("idle");

    await wait(700);
    expect(mood()).toBe("thinking");
  });

  it("codes as soon as the player writes a command", async () => {
    render(<Game />);
    await wait(PONDER_MS + 200);

    tap("Forward");

    expect(mood()).toBe("coding");
  });

  it("is idle again after the program is cleared", async () => {
    render(<Game />);
    tap("Forward");
    tap("Clear program");

    expect(mood()).toBe("idle");
  });

  it("codes while the program runs and celebrates each star for a moment", async () => {
    save(solvedUpTo(1)); // level 2: three stars in a row
    render(<Game />);
    enter(solutions.loop);
    tap("Run program");

    await wait(420);
    expect(mood()).toBe("coding");

    await wait(420); // first star
    expect(screen.getByLabelText("1 of 3 stars collected")).toBeInTheDocument();
    expect(mood()).toBe("celebrate");

    await wait(STAR_FLASH_MS + 140);
    expect(message()).toBe("Running...");
    expect(mood()).toBe("coding");
  });

  it("thinks after a failed run", async () => {
    render(<Game />);
    enter(program("L F"));
    tap("Run program");
    await finish();

    expect(mood()).toBe("thinking");
  });

  it("celebrates a complete level", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    tap("Run program");
    await finish();

    expect(mood()).toBe("celebrate");
  });
});

describe("victory window", () => {
  async function winLastLevel() {
    save(solvedUpTo(5));
    render(<Game />);
    enter(solutions["side-quests"]);
    tap("Run program");
    await finish();
  }

  it("appears a moment after the last level, with the victory ghost", async () => {
    await winLastLevel();
    expect(mood()).toBe("victory");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await wait(1000);

    const dialog = screen.getByRole("dialog", { name: "Victory!" });
    expect(dialog.querySelector("img")).toHaveAttribute("src", MOODS.victory);
    expect(sounds()).toContain("victory");
  });

  it("closes", async () => {
    await winLastLevel();
    await wait(1000);

    tap("Close");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Level 06")).toBeInTheDocument();
  });

  it("can start the game over from level 1", async () => {
    await winLastLevel();
    await wait(1000);

    tap("Start over");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Level 01")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "0 of 6 levels solved" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).solved).toEqual(
      Array(6).fill(false)
    );
  });

  it("does not appear after other levels", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    tap("Run program");
    await finish();
    await wait(2000);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("sound effects", () => {
  it("play when building the program", () => {
    render(<Game />);

    tap("Forward");
    fireEvent.click(slot(1, 1));
    tap("Erase slot");
    tap("Forward");
    tap("Clear program");

    expect(sounds()).toEqual(["place", "tap", "erase", "place", "clear"]);
  });

  it("follow the ghost on the board: steps, turns and the star", async () => {
    render(<Game />);
    enter(solutions["first-steps"]); // F F F L F F
    playSound.mockClear();
    tap("Run program");
    await finish();

    expect(sounds()).toEqual(["start", "step", "step", "step", "turn", "step", "star", "win"]);
  });

  it("play a fall sound when the ghost leaves the path", async () => {
    render(<Game />);
    enter(program("L F"));
    playSound.mockClear();
    tap("Run program");
    await finish();

    expect(sounds()).toEqual(["start", "turn", "fall"]);
  });

  it("play a fail sound when the program ends too early", async () => {
    render(<Game />);
    enter(program("F"));
    playSound.mockClear();
    tap("Run program");
    await finish();

    expect(sounds()).toEqual(["start", "step", "fail"]);
  });

  it("play for pause, resume and stop", async () => {
    render(<Game />);
    enter(solutions["first-steps"]);
    playSound.mockClear();

    tap("Run program");
    await wait(420);
    tap("Pause");
    tap("Resume");
    tap("Stop and reset");

    expect(sounds()).toEqual(["start", "step", "pause", "start", "stop"]);
  });

  it("play when changing level", () => {
    save(solvedUpTo(2));
    render(<Game />);

    tap("Previous level");

    expect(sounds()).toEqual(["level"]);
  });

  it("can be turned off, and the choice is remembered", () => {
    const { unmount } = render(<Game />);
    expect(button("Sound")).toHaveAttribute("aria-pressed", "true");

    tap("Sound");

    expect(button("Sound")).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(SOUND_KEY)).toBe("off");

    unmount();
    render(<Game />);
    expect(button("Sound")).toHaveAttribute("aria-pressed", "false");
  });
});