"use client";

import { useEffect, useMemo, useState } from "react";
import { preload } from "react-dom";
import Image from "next/image";
import {
  countCommands,
  createRun,
  emptyProgram,
  parseLevel,
  sanitizeProgram,
  step,
} from "../lib/engine";
import { levels } from "../lib/levels";
import { keepFullscreenOnTouch } from "../lib/fullscreen";
import { MOODS, PONDER_MS, STAR_FLASH_MS, getMood } from "../lib/mood";
import {
  loadSoundSetting,
  playSound,
  saveSoundSetting,
  setSoundEnabled,
} from "../lib/sound";
import { emptyProgress, loadProgress, saveProgress } from "../lib/storage";
import { HELP_TEXT } from "./helpText";
import PixelGhost from "./PixelGhost";
import {
  ChevronIcon,
  EraseIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  SoundOffIcon,
  SoundOnIcon,
  StarIcon,
  StopIcon,
  TrashIcon,
  TurnLeftIcon,
  TurnRightIcon,
} from "./icons";
import styles from "./Game.module.css";

const STEP_MS = 420; // time per move at speed x1
const VICTORY_DELAY_MS = 900; // pause before the victory window, after the last star
const SPEEDS = [1, 2, 3];
const FUNCTION_NAMES = ["F1", "F2"];

const COMMAND_INFO = {
  forward: { label: "Forward", content: <ForwardIcon /> },
  left: { label: "Turn left", content: <TurnLeftIcon /> },
  right: { label: "Turn right", content: <TurnRightIcon /> },
  f1: { label: "Call F1", content: "F1" },
  f2: { label: "Call F2", content: "F2" },
};

const FAIL_MESSAGES = {
  fell: "Oops! The ghost left the path. Change the program and try again.",
  ended: "The program ended, but some stars are left.",
  limit: "Too many steps. Is the program looping forever?",
};

function pad(number) {
  return String(number).padStart(2, "0");
}

function describeSlot(fn, slot, command) {
  const name = `${FUNCTION_NAMES[fn]} slot ${slot + 1}`;

  if (!command) return `${name}: empty`;

  const condition = command.color ? ` on ${command.color}` : "";

  return `${name}: ${COMMAND_INFO[command.cmd].label}${condition}`;
}

export default function Game() {
  const [progress, setProgress] = useState(() => emptyProgress(levels));
  const [loaded, setLoaded] = useState(false);
  const [levelIndex, setLevelIndex] = useState(0);
  const [cursor, setCursor] = useState({ fn: 0, slot: 0 }); // selected slot
  const [brush, setBrush] = useState(null); // colour condition for new commands
  const [run, setRun] = useState(null); // engine state, or null before a run
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [helpLanguage, setHelpLanguage] = useState("en");
  const [soundOn, setSoundOn] = useState(true);
  const [starCount, setStarCount] = useState(0); // stars taken in this run
  const [flashing, setFlashing] = useState(false); // celebrating a star
  const [pondering, setPondering] = useState(false); // empty program for a while
  const [showVictory, setShowVictory] = useState(false);

  const level = levels[levelIndex];
  const parsed = useMemo(() => parseLevel(level), [level]);
  const program = progress.programs[levelIndex];
  const view = useMemo(() => run ?? createRun(parsed), [run, parsed]);

  const status = run ? run.status : "ready";
  const won = status === "won";
  const paused = status === "running" && !playing;
  const hasCommands = countCommands(program) > 0;
  const hasF2 = level.slots[1] > 0;
  const hasColors = parsed.colors.length > 1;
  const collected = parsed.stars.length - view.stars.length;
  const isLastLevel = levelIndex === levels.length - 1;
  const canGoNext = !isLastLevel && progress.solved[levelIndex];
  const finishedAll = won && isLastLevel;
  const mood = getMood({
    status,
    hasCommands,
    starFlash: flashing,
    pondering,
    isLastLevel,
  });

  // Load every ghost animation early, so changing mood is instant
  Object.values(MOODS).forEach((src) => preload(src, { as: "image" }));

  // Read saved progress once the page is in the browser. It is done here,
  // not during the first render, so the server and the browser draw the
  // same first screen.
  useEffect(() => {
    const saved = loadProgress(levels);
    const firstOpen = saved.solved.findIndex((solved) => !solved);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(saved);
    setLevelIndex(firstOpen === -1 ? levels.length - 1 : firstOpen);
    setSoundOn(loadSoundSetting());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveProgress(progress);
  }, [progress, loaded]);

  // On phones, go full screen as soon as the player taps
  useEffect(() => keepFullscreenOnTouch(), []);

  // The run loop: one ghost action per tick while playing
  useEffect(() => {
    if (!playing || !run) return;

    const timer = setTimeout(() => {
      const next = step(parsed, program, run);
      const gotStar = next.stars.length < run.stars.length;

      // One sound per action, at the moment it happens on the board
      if (gotStar) playSound("star");
      else if (next.x !== run.x || next.y !== run.y) playSound("step");
      else if (next.dir !== run.dir) playSound("turn");

      if (next.status === "fell") playSound("fall");
      if (next.status === "ended" || next.status === "limit") playSound("fail");
      // The last level gets its own fanfare with the victory window
      if (next.status === "won" && !isLastLevel) playSound("win");

      // The mascot celebrates each star, if the run goes on
      if (gotStar && next.status === "running") {
        setStarCount((count) => count + 1);
        setFlashing(true);
      }

      setRun(next);

      if (next.status !== "running") {
        setPlaying(false);

        if (next.status === "won") {
          setProgress((previous) => ({
            ...previous,
            solved: previous.solved.map((solved, index) =>
              index === levelIndex ? true : solved
            ),
          }));
        }
      }
    }, STEP_MS / speed);

    return () => clearTimeout(timer);
  }, [playing, run, speed, parsed, program, levelIndex, isLastLevel]);

  // End the star celebration after a short moment. A new star restarts it.
  useEffect(() => {
    if (!flashing) return;

    const timer = setTimeout(() => setFlashing(false), STAR_FLASH_MS);

    return () => clearTimeout(timer);
  }, [flashing, starCount]);

  // An empty program for a while: the mascot starts thinking
  useEffect(() => {
    if (status !== "ready" || hasCommands) return;

    const timer = setTimeout(() => setPondering(true), PONDER_MS);

    return () => {
      clearTimeout(timer);
      setPondering(false);
    };
  }, [status, hasCommands, levelIndex]);

  // After the last level: a short pause, then the victory window
  useEffect(() => {
    if (!finishedAll) return;

    const timer = setTimeout(() => {
      setShowVictory(true);
      playSound("victory");
    }, VICTORY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [finishedAll]);

  function stopRun() {
    setPlaying(false);
    setRun(null);
    setFlashing(false);
  }

  function handleStop() {
    stopRun();
    playSound("stop");
  }

  function selectSlot(target) {
    setCursor(target);
    playSound("tap");
  }

  function selectBrush(color) {
    setBrush(color);
    playSound("tap");
  }

  function toggleSound() {
    const on = !soundOn;

    setSoundEnabled(on);
    saveSoundSetting(on);
    setSoundOn(on);
    playSound("tap"); // only heard when turning sound on
  }

  function openHelp() {
    setShowHelp(true);
    playSound("tap");
  }

  function startOver() {
    stopRun();
    setProgress(emptyProgress(levels));
    setLevelIndex(0);
    setCursor({ fn: 0, slot: 0 });
    setBrush(null);
    setShowVictory(false);
    playSound("level");
  }

  function openLevel(index) {
    const unlocked = index === 0 || progress.solved[index - 1];

    if (index < 0 || index >= levels.length || !unlocked) return;

    stopRun();
    setLevelIndex(index);
    setCursor({ fn: 0, slot: 0 });
    setBrush(null);
    playSound("level");
  }

  function updateProgram(change) {
    stopRun();
    setProgress((previous) => ({
      ...previous,
      programs: previous.programs.map((saved, index) =>
        index === levelIndex ? sanitizeProgram(level, change(saved)) : saved
      ),
    }));
  }

  function setSlot(target, value) {
    updateProgram((saved) =>
      saved.map((slots, fn) =>
        slots.map((command, slot) =>
          fn === target.fn && slot === target.slot ? value : command
        )
      )
    );
  }

  function placeCommand(cmd) {
    if (playing) return;

    setSlot(cursor, { cmd, color: hasColors ? brush : null });
    playSound("place");

    // Move on to the next slot, continuing into F2 after the end of F1
    if (cursor.slot + 1 < level.slots[cursor.fn]) {
      setCursor({ fn: cursor.fn, slot: cursor.slot + 1 });
    } else if (cursor.fn === 0 && hasF2) {
      setCursor({ fn: 1, slot: 0 });
    }
  }

  // Works like backspace: clears the selected slot, or the one before it
  function eraseSlot() {
    if (playing) return;

    if (program[cursor.fn][cursor.slot]) {
      setSlot(cursor, null);
      playSound("erase");
    } else if (cursor.slot > 0) {
      const previous = { fn: cursor.fn, slot: cursor.slot - 1 };

      setSlot(previous, null);
      setCursor(previous);
      playSound("erase");
    }
  }

  function clearProgram() {
    if (playing) return;

    updateProgram(() => emptyProgram(level));
    setCursor({ fn: 0, slot: 0 });
    playSound("clear");
  }

  function handlePlay() {
    if (playing) {
      setPlaying(false); // pause
      playSound("pause");
    } else if (paused) {
      setPlaying(true); // resume
      playSound("start");
    } else if (hasCommands) {
      setRun(createRun(parsed)); // start from the beginning
      setStarCount(0);
      setPlaying(true);
      playSound("start");
    }
  }

  function cycleSpeed() {
    setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);
    playSound("tap");
  }

  let message = level.hint;
  if (won) {
    message = isLastLevel
      ? `You finished all ${levels.length} levels. Well played!`
      : "Level complete!";
  } else if (FAIL_MESSAGES[status]) {
    message = FAIL_MESSAGES[status];
  } else if (playing) {
    message = "Running...";
  } else if (paused) {
    message = "Paused. Press play to continue.";
  }

  let playLabel = "Run program";
  if (playing) playLabel = "Pause";
  else if (paused) playLabel = "Resume";

  const commands = ["forward", "left", "right", "f1", ...(hasF2 ? ["f2"] : [])];

  return (
    <main className={styles.page}>
      <header className={`${styles.card} ${styles.topbar}`}>
        <div className={styles.brand}>
          <PixelGhost className={styles.brandGhost} />
          <h1>RoboPath</h1>
        </div>

        <div className={styles.levelNav}>
          <button
            className={styles.btn}
            onClick={() => openLevel(levelIndex - 1)}
            disabled={levelIndex === 0}
            aria-label="Previous level"
          >
            <ChevronIcon direction="left" />
          </button>

          <span className={styles.levelName} aria-live="polite">
            Level {pad(levelIndex + 1)}
          </span>

          <button
            className={styles.btn}
            onClick={() => openLevel(levelIndex + 1)}
            disabled={!canGoNext}
            aria-label="Next level"
            title={
              canGoNext || isLastLevel
                ? undefined
                : "Finish this level to unlock the next one"
            }
          >
            <ChevronIcon direction="right" />
          </button>
        </div>

        <div
          className={styles.starCount}
          aria-label={`${collected} of ${parsed.stars.length} stars collected`}
        >
          <span className={styles.gold}>
            <StarIcon />
          </span>
          {collected}/{parsed.stars.length}
        </div>

        <div
          className={styles.pips}
          role="img"
          aria-label={`${progress.solved.filter(Boolean).length} of ${levels.length} levels solved`}
        >
          {levels.map((item, index) => (
            <span
              key={item.id}
              className={`${styles.pip} ${
                progress.solved[index] ? styles.pipSolved : ""
              } ${index === levelIndex ? styles.pipCurrent : ""}`}
            />
          ))}
        </div>

        <Image
          src="/logos/n7gd.png"
          alt="N7GD, the game dev club"
          width={173}
          height={63}
          className={styles.logo}
          priority
        />

        <button
          className={`${styles.btn} ${styles.soundButton}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label="Sound"
          title={soundOn ? "Sound on" : "Sound off"}
        >
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>

        <button
          className={`${styles.btn} ${styles.helpButton}`}
          onClick={openHelp}
          aria-label="How to play"
        >
          ?
        </button>
      </header>

      <div className={styles.main}>
        {/* Left: the ghost and what it says */}
        <aside className={styles.mascot} data-testid="mascot">
          <div
            className={`${styles.card} ${styles.bubble} ${
              won ? styles.bubbleWon : ""
            } ${FAIL_MESSAGES[status] ? styles.bubbleFail : ""}`}
            role="status"
          >
            <h2>{level.name}</h2>
            <p>{message}</p>

            {won && !isLastLevel && (
              <button
                className={`${styles.btn} ${styles.go}`}
                onClick={() => openLevel(levelIndex + 1)}
              >
                Next level
              </button>
            )}
          </div>

          {/* The animated ghost: its mood follows what happens in the game */}
          <div
            className={styles.mascotGif}
            data-testid="mascot-mood"
            data-mood={mood}
          >
            <Image
              key={mood}
              src={MOODS[mood]}
              alt=""
              width={128}
              height={128}
              unoptimized
              loading="eager"
            />
          </div>
        </aside>

        {/* Centre: the board */}
        <section
          className={`${styles.card} ${styles.boardCard}`}
          aria-label="Game board"
          data-testid="board"
        >
          <div className={styles.boardArea}>
            <div
              className={styles.board}
              style={{ "--cols": parsed.cols, "--rows": parsed.rows }}
              role="img"
              aria-label={`Board with ${parsed.stars.length} stars. Ghost at column ${
                view.x + 1
              }, row ${view.y + 1}.`}
            >
              {parsed.tiles.map((color, index) => (
                <div key={index} className={styles.cell}>
                  {color && (
                    <div className={`${styles.tile} ${styles[color]}`}>
                      {view.stars.includes(index) && (
                        <span className={styles.star}>
                          <StarIcon />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div
                className={`${styles.ghost} ${
                  status === "fell" ? styles.ghostFell : ""
                }`}
                style={{ "--x": view.x, "--y": view.y }}
                data-testid="ghost"
                data-x={view.x}
                data-y={view.y}
                data-dir={view.dir}
              >
                <PixelGhost className={styles.sprite} />
                {/* A small arrow on the side the ghost is facing */}
                <span
                  className={styles.facing}
                  style={{ transform: `rotate(${view.dir * 90}deg)` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right: the program and the controls */}
        <div className={styles.controls} data-testid="controls">
          <section
            className={`${styles.card} ${styles.panel}`}
            aria-label="Functions"
          >
            {program.map((slots, fn) =>
              slots.length === 0 ? null : (
                <div key={fn} className={styles.functionRow}>
                  <span className={styles.functionName}>
                    {FUNCTION_NAMES[fn]}
                  </span>

                  <div
                    className={styles.slots}
                    style={{ "--per-row": slots.length <= 6 ? slots.length : 4 }}
                  >
                    {slots.map((command, slot) => {
                      const selected =
                        !playing && cursor.fn === fn && cursor.slot === slot;
                      const active =
                        run?.active?.fn === fn && run.active.slot === slot;

                      return (
                        <button
                          key={slot}
                          className={`${styles.slot} ${
                            command?.color ? styles[command.color] : ""
                          } ${command ? styles.filled : ""} ${
                            selected ? styles.selected : ""
                          } ${active ? styles.active : ""}`}
                          onClick={() => selectSlot({ fn, slot })}
                          disabled={playing}
                          aria-pressed={selected}
                          aria-label={describeSlot(fn, slot, command)}
                        >
                          {command && COMMAND_INFO[command.cmd].content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </section>

          <section
            className={`${styles.card} ${styles.panel}`}
            aria-label="Commands"
          >
            <div className={styles.row}>
              {commands.map((cmd) => (
                <button
                  key={cmd}
                  className={`${styles.btn} ${
                    hasColors && brush ? styles[brush] : ""
                  }`}
                  onClick={() => placeCommand(cmd)}
                  disabled={playing}
                  aria-label={COMMAND_INFO[cmd].label}
                >
                  {COMMAND_INFO[cmd].content}
                </button>
              ))}
            </div>

            <div className={styles.row}>
              {hasColors && (
                <div
                  className={styles.brushes}
                  role="group"
                  aria-label="Run the command on"
                >
                  <button
                    className={`${styles.brush} ${
                      brush === null ? styles.brushOn : ""
                    }`}
                    onClick={() => selectBrush(null)}
                    disabled={playing}
                    aria-pressed={brush === null}
                    aria-label="Any colour"
                  />

                  {parsed.colors.map((color) => (
                    <button
                      key={color}
                      className={`${styles.brush} ${styles[color]} ${
                        brush === color ? styles.brushOn : ""
                      }`}
                      onClick={() => selectBrush(color)}
                      disabled={playing}
                      aria-pressed={brush === color}
                      aria-label={`Only on ${color}`}
                    />
                  ))}
                </div>
              )}

              <span className={styles.spacer} />

              <button
                className={styles.btn}
                onClick={eraseSlot}
                disabled={playing}
                aria-label="Erase slot"
              >
                <EraseIcon />
              </button>

              <button
                className={styles.btn}
                onClick={clearProgram}
                disabled={playing || !hasCommands}
                aria-label="Clear program"
              >
                <TrashIcon />
              </button>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.panel} ${styles.execution}`}
            aria-label="Execution"
          >
            <button
              className={`${styles.btn} ${styles.go} ${styles.playButton}`}
              onClick={handlePlay}
              disabled={!hasCommands}
              aria-label={playLabel}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              className={styles.btn}
              onClick={handleStop}
              disabled={!run}
              aria-label="Stop and reset"
            >
              <StopIcon />
            </button>

            <button
              className={styles.btn}
              onClick={cycleSpeed}
              aria-label={`Speed x${speed}. Tap to change.`}
            >
              x{speed}
            </button>
          </section>
        </div>
      </div>

      {showHelp && (
        <div className={styles.overlay} onClick={() => setShowHelp(false)}>
          <div
            className={`${styles.card} ${styles.help}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.helpBar}>
              {Object.entries(HELP_TEXT).map(([code, text]) => (
                <button
                  key={code}
                  className={`${styles.btn} ${
                    helpLanguage === code ? styles.languageOn : ""
                  }`}
                  onClick={() => {
                    setHelpLanguage(code);
                    playSound("tap");
                  }}
                  aria-pressed={helpLanguage === code}
                  lang={code}
                >
                  {text.name}
                </button>
              ))}

              <span className={styles.spacer} />

              <button
                className={`${styles.btn} ${styles.go}`}
                onClick={() => setShowHelp(false)}
                lang={helpLanguage}
                autoFocus
              >
                {HELP_TEXT[helpLanguage].close}
              </button>
            </div>

            <div
              className={styles.helpText}
              lang={helpLanguage}
              dir={HELP_TEXT[helpLanguage].dir}
            >
              <h2 id="help-title">{HELP_TEXT[helpLanguage].title}</h2>

              <ol>
                {HELP_TEXT[helpLanguage].steps.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>

              <p className={styles.credit}>{HELP_TEXT[helpLanguage].credit}</p>
            </div>

          </div>
        </div>
      )}

      {showVictory && (
        <div className={styles.overlay} onClick={() => setShowVictory(false)}>
          <div
            className={`${styles.card} ${styles.victory}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={MOODS.victory}
              alt=""
              width={128}
              height={128}
              unoptimized
              loading="eager"
              className={styles.victoryGif}
            />

            <div className={styles.victoryText}>
              <h2 id="victory-title">Victory!</h2>
              <p>
                You solved all {levels.length} levels. You think like a
                programmer!
              </p>
              <p className={styles.credit}>A game by N7GD (Game Dev).</p>

              <div className={styles.victoryActions}>
                <button
                  className={`${styles.btn} ${styles.go}`}
                  onClick={() => setShowVictory(false)}
                  autoFocus
                >
                  Close
                </button>
                <button className={styles.btn} onClick={startOver}>
                  Start over
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}