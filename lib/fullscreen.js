// Full screen on phones.
//
// Browsers only allow a page to go full screen right after the player
// touches it, so the game asks on every tap until it is full screen.
// iPhones do not allow web pages to go full screen at all; there the
// player can use "Add to Home Screen", which opens the game full screen.

export function isFullscreen(doc = document) {
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function canFullscreen(doc = document) {
  const root = doc.documentElement;

  return Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
}

/** Asks for full screen, then tries to turn the screen to landscape. */
export async function enterFullscreen(win = window) {
  const doc = win.document;
  const root = doc.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;

  if (!request || isFullscreen(doc)) return false;

  try {
    await request.call(root, { navigationUI: "hide" });
  } catch {
    return false; // refused by the browser: the game still works
  }

  try {
    await win.screen?.orientation?.lock?.("landscape");
  } catch {
    // Not supported everywhere (for example Firefox on desktop)
  }

  return true;
}

/**
 * On touch devices, goes full screen at the player's first tap, and again
 * after any tap if they left full screen. Returns a function that stops it.
 */
export function keepFullscreenOnTouch(win = window) {
  const isTouch = win.matchMedia?.("(pointer: coarse)")?.matches;

  if (!isTouch || !canFullscreen(win.document)) return () => {};

  const onTap = () => {
    enterFullscreen(win);
  };

  win.document.addEventListener("click", onTap, true);

  return () => win.document.removeEventListener("click", onTap, true);
}
