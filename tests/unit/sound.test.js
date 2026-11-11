// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SOUNDS,
  SOUND_KEY,
  isSoundEnabled,
  loadSoundSetting,
  playSound,
  resetSoundForTests,
  saveSoundSetting,
  setSoundEnabled,
} from "../../lib/sound";

/** A pretend Web Audio API that records what the game asks it to play. */
class FakeAudioContext {
  static instances = [];

  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = { name: "speakers" };
    this.oscillators = [];
    this.resume = vi.fn(async () => {
      this.state = "running";
    });
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const oscillator = {
      type: "",
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

beforeEach(() => {
  resetSoundForTests();
  FakeAudioContext.instances = [];
  window.AudioContext = FakeAudioContext;
  delete window.webkitAudioContext;
  window.localStorage.clear();
});

afterEach(() => {
  delete window.AudioContext;
  delete window.webkitAudioContext;
});

function lastContext() {
  return FakeAudioContext.instances.at(-1);
}

describe("playSound", () => {
  it("plays one note per entry, connected to the speakers", () => {
    playSound("star");

    const ctx = lastContext();
    expect(ctx.oscillators).toHaveLength(SOUNDS.star.length);

    for (const oscillator of ctx.oscillators) {
      expect(oscillator.type).toBe("square");
      expect(oscillator.connect).toHaveBeenCalledOnce();
      expect(oscillator.start).toHaveBeenCalledOnce();
      expect(oscillator.stop).toHaveBeenCalledOnce();
    }
  });

  it("uses each note's pitch, and slides when asked", () => {
    playSound("fall");

    const [oscillator] = lastContext().oscillators;
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(SOUNDS.fall[0].f, expect.any(Number));
    expect(oscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      SOUNDS.fall[0].to,
      expect.any(Number)
    );
  });

  it("unlocks audio the first time, as browsers require", () => {
    playSound("tap");

    expect(lastContext().resume).toHaveBeenCalledOnce();
  });

  it("reuses one audio context for every sound", () => {
    playSound("tap");
    playSound("place");
    playSound("star");

    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it("is silent when sound is off, and plays again when it is back on", () => {
    setSoundEnabled(false);
    playSound("star");
    expect(FakeAudioContext.instances).toHaveLength(0);

    setSoundEnabled(true);
    playSound("star");
    expect(lastContext().oscillators).toHaveLength(2);
  });

  it("ignores unknown sound names", () => {
    expect(() => playSound("explosion")).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("works with the older Safari name for Web Audio", () => {
    delete window.AudioContext;
    window.webkitAudioContext = FakeAudioContext;

    playSound("tap");

    expect(lastContext().oscillators).toHaveLength(1);
  });

  it("does nothing, without crashing, when the browser has no Web Audio", () => {
    delete window.AudioContext;

    expect(() => playSound("win")).not.toThrow();
  });

  it("does not crash when the browser refuses to create audio", () => {
    window.AudioContext = class {
      constructor() {
        throw new Error("not allowed");
      }
    };

    expect(() => playSound("win")).not.toThrow();
  });

  it("does not crash when playing a note fails", () => {
    window.AudioContext = class extends FakeAudioContext {
      createOscillator() {
        throw new Error("broken audio");
      }
    };

    expect(() => playSound("win")).not.toThrow();
  });
});

describe("the sound list", () => {
  it.each(Object.entries(SOUNDS))("%s has valid, short notes", (_, notes) => {
    expect(notes.length).toBeGreaterThan(0);

    for (const note of notes) {
      expect(note.f).toBeGreaterThan(20);
      expect(note.d).toBeGreaterThan(0);
      if (note.to) expect(note.to).toBeGreaterThan(20);
      if (note.v) expect(note.v).toBeLessThanOrEqual(1);
      // Every sound is over within 1.5 seconds
      expect((note.t ?? 0) + note.d).toBeLessThan(1.5);
    }
  });

  it("covers every moment of the game", () => {
    for (const name of ["tap", "place", "erase", "clear", "level", "start", "pause", "stop", "step", "turn", "star", "win", "victory", "fall", "fail"]) {
      expect(SOUNDS[name], name).toBeDefined();
    }
  });
});

describe("sound setting", () => {
  it("is on by default", () => {
    expect(loadSoundSetting()).toBe(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it("remembers that the player turned sound off", () => {
    saveSoundSetting(false);

    expect(window.localStorage.getItem(SOUND_KEY)).toBe("off");
    expect(loadSoundSetting()).toBe(false);
    expect(isSoundEnabled()).toBe(false);
  });

  it("stays on when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveSoundSetting(false)).not.toThrow();
    expect(loadSoundSetting()).toBe(true);
  });
});
