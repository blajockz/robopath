import { describe, expect, it, vi } from "vitest";
import {
  canFullscreen,
  enterFullscreen,
  isFullscreen,
  keepFullscreenOnTouch,
} from "../../lib/fullscreen";

/** A minimal fake browser window, so no real browser is needed. */
function fakeWindow({ touch = true, supported = true, refuse = false, lock } = {}) {
  const listeners = {};
  const root = {};
  const doc = {
    documentElement: root,
    fullscreenElement: null,
    addEventListener: vi.fn((type, handler) => (listeners[type] = handler)),
    removeEventListener: vi.fn((type) => delete listeners[type]),
  };

  if (supported) {
    root.requestFullscreen = vi.fn(async () => {
      if (refuse) throw new Error("refused");
      doc.fullscreenElement = root;
    });
  }

  return {
    document: doc,
    listeners,
    matchMedia: vi.fn(() => ({ matches: touch })),
    screen: { orientation: { lock: lock ?? vi.fn(async () => {}) } },
  };
}

describe("isFullscreen and canFullscreen", () => {
  it("knows when the page is full screen", () => {
    const win = fakeWindow();

    expect(isFullscreen(win.document)).toBe(false);
    win.document.fullscreenElement = win.document.documentElement;
    expect(isFullscreen(win.document)).toBe(true);
  });

  it("understands the older Safari names too", () => {
    const doc = { documentElement: { webkitRequestFullscreen() {} }, webkitFullscreenElement: {} };

    expect(canFullscreen(doc)).toBe(true);
    expect(isFullscreen(doc)).toBe(true);
  });

  it("knows when the browser cannot go full screen (iPhone)", () => {
    expect(canFullscreen(fakeWindow({ supported: false }).document)).toBe(false);
  });
});

describe("enterFullscreen", () => {
  it("goes full screen and turns the screen to landscape", async () => {
    const win = fakeWindow();

    expect(await enterFullscreen(win)).toBe(true);
    expect(win.document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    expect(win.screen.orientation.lock).toHaveBeenCalledWith("landscape");
  });

  it("does nothing when already full screen", async () => {
    const win = fakeWindow();
    await enterFullscreen(win);

    expect(await enterFullscreen(win)).toBe(false);
    expect(win.document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
  });

  it("does not crash when the browser refuses", async () => {
    expect(await enterFullscreen(fakeWindow({ refuse: true }))).toBe(false);
  });

  it("does not crash when the browser cannot go full screen", async () => {
    expect(await enterFullscreen(fakeWindow({ supported: false }))).toBe(false);
  });

  it("still goes full screen when the screen cannot be turned", async () => {
    const lock = vi.fn(async () => {
      throw new Error("not supported");
    });

    expect(await enterFullscreen(fakeWindow({ lock }))).toBe(true);
  });
});

describe("keepFullscreenOnTouch", () => {
  it("goes full screen at the first tap on a phone", async () => {
    const win = fakeWindow();
    keepFullscreenOnTouch(win);

    win.listeners.click();
    await Promise.resolve();

    expect(win.document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
  });

  it("goes full screen again if the player left it", async () => {
    const win = fakeWindow();
    keepFullscreenOnTouch(win);
    win.listeners.click();
    await Promise.resolve();

    win.document.fullscreenElement = null; // the player pressed back
    win.listeners.click();

    expect(win.document.documentElement.requestFullscreen).toHaveBeenCalledTimes(2);
  });

  it("leaves computers with a mouse alone", () => {
    const win = fakeWindow({ touch: false });
    keepFullscreenOnTouch(win);

    expect(win.document.addEventListener).not.toHaveBeenCalled();
  });

  it("does nothing on phones that cannot go full screen", () => {
    const win = fakeWindow({ supported: false });
    keepFullscreenOnTouch(win);

    expect(win.document.addEventListener).not.toHaveBeenCalled();
  });

  it("can be switched off", () => {
    const win = fakeWindow();
    const stop = keepFullscreenOnTouch(win);
    stop();

    expect(win.document.removeEventListener).toHaveBeenCalledOnce();
  });
});
