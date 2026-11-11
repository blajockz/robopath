// Retro sound effects, made in the browser with the Web Audio API.
// No audio files: nothing to download, and nothing loaded from other sites.
//
// Browsers only allow sound after the player has touched the page. Every
// sound here is first played from a tap, which unlocks audio for the rest
// of the game.

export const SOUND_KEY = "robopath:sound";
const MASTER_VOLUME = 0.14;

// Note frequencies, in hertz
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const B5 = 987.77;
const C6 = 1046.5;
const E6 = 1318.51;
const G4 = 392;
const C4 = 261.63;

// Each sound is a list of notes:
//   f: frequency, to: slide to this frequency, t: start (seconds),
//   d: length (seconds), type: waveform, v: volume (0 to 1)
export const SOUNDS = {
  // Interface
  tap: [{ f: 700, d: 0.035, type: "square", v: 0.35 }],
  place: [{ f: 760, to: 1000, d: 0.06, type: "square", v: 0.45 }],
  erase: [{ f: 520, to: 300, d: 0.07, type: "square", v: 0.4 }],
  clear: [{ f: 600, to: 150, d: 0.18, type: "triangle", v: 0.8 }],
  level: [{ f: 300, to: 900, d: 0.14, type: "triangle", v: 0.8 }],

  // Running the program
  start: [
    { f: C5, d: 0.07, type: "square", v: 0.45 },
    { f: G5, t: 0.07, d: 0.1, type: "square", v: 0.45 },
  ],
  pause: [
    { f: G5, d: 0.07, type: "square", v: 0.4 },
    { f: C5, t: 0.07, d: 0.1, type: "square", v: 0.4 },
  ],
  stop: [{ f: 330, to: 220, d: 0.12, type: "triangle", v: 0.7 }],
  step: [{ f: 220, d: 0.04, type: "triangle", v: 0.6 }],
  turn: [{ f: 330, to: 400, d: 0.04, type: "triangle", v: 0.5 }],

  // Results
  star: [
    { f: B5, d: 0.06, type: "square", v: 0.45 },
    { f: E6, t: 0.06, d: 0.16, type: "square", v: 0.45 },
  ],
  win: [
    { f: C5, t: 0.18, d: 0.09, type: "square", v: 0.4 },
    { f: E5, t: 0.27, d: 0.09, type: "square", v: 0.4 },
    { f: G5, t: 0.36, d: 0.09, type: "square", v: 0.4 },
    { f: C6, t: 0.45, d: 0.3, type: "square", v: 0.45 },
  ],
  victory: [
    { f: G4, d: 0.1, type: "square", v: 0.4 },
    { f: C5, t: 0.1, d: 0.1, type: "square", v: 0.4 },
    { f: E5, t: 0.2, d: 0.1, type: "square", v: 0.4 },
    { f: G5, t: 0.3, d: 0.18, type: "square", v: 0.4 },
    { f: E5, t: 0.5, d: 0.1, type: "square", v: 0.4 },
    { f: G5, t: 0.6, d: 0.5, type: "square", v: 0.45 },
    { f: C4, t: 0.6, d: 0.5, type: "triangle", v: 0.7 },
  ],
  fall: [{ f: 620, to: 110, d: 0.45, type: "square", v: 0.35 }],
  fail: [
    { f: 330, d: 0.16, type: "triangle", v: 0.8 },
    { f: 247, t: 0.18, d: 0.28, type: "triangle", v: 0.8 },
  ],
};

let enabled = true;
let context = null;

function getContext() {
  if (typeof window === "undefined") return null;

  // webkitAudioContext: older Safari on iPhone
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!context) {
    try {
      context = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (context.state === "suspended") {
    // Allowed here because sounds are triggered by the player's taps
    context.resume?.().catch(() => {});
  }

  return context;
}

/** Plays one of the SOUNDS by name. Never throws. */
export function playSound(name) {
  const notes = SOUNDS[name];
  if (!enabled || !notes) return;

  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.01;

    for (const note of notes) {
      const start = now + (note.t ?? 0);
      const end = start + note.d;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = note.type ?? "square";
      oscillator.frequency.setValueAtTime(note.f, start);
      if (note.to) oscillator.frequency.exponentialRampToValueAtTime(note.to, end);

      // A quick fade in and out avoids clicks
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(MASTER_VOLUME * (note.v ?? 1), start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Audio is a bonus: the game keeps working without it
  }
}

export function setSoundEnabled(on) {
  enabled = Boolean(on);
}

export function isSoundEnabled() {
  return enabled;
}

/** Reads the player's sound choice (on by default) and applies it. */
export function loadSoundSetting() {
  let on = true;

  try {
    on = window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    // Storage blocked: keep the default
  }

  setSoundEnabled(on);
  return on;
}

export function saveSoundSetting(on) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice lasts until the page is closed
  }
}

/** Only for tests: forget the audio context between tests. */
export function resetSoundForTests() {
  context = null;
  enabled = true;
}
