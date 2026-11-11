# Tests

Everything that checks the game lives in this folder.

| Folder / file | What it checks | Runs with |
|---|---|---|
| `unit/engine.test.js` | The game rules: moving, turning, F1/F2 calls, colour conditions, endless-loop protection, cleaning of untrusted programs | `npm test` |
| `unit/levels.test.js` | The six levels: valid maps, slot limits, each one solvable by its known solution, difficulty order | `npm test` |
| `unit/storage.test.js` | Saved progress: save/load, broken or edited data is ignored | `npm test` |
| `ui/game.test.jsx` | Every button and screen: slots, commands, colours, erase, clear, play, pause, stop, speed, level arrows, help, win and fail messages | `npm test` |
| `e2e/layout.spec.js` | In a real browser: the game fits the screen with no scrolling at 8 landscape sizes and 3 portrait sizes, on all six levels | `npm run test:e2e` |
| `e2e/play.spec.js` | In a real browser: playing all six levels by tapping, saved progress, colours, security headers, no requests to other websites | `npm run test:e2e` |
| `solutions.js` | One known solution per level. Used only by tests, never sent to players | |
| `setup.js` | Shared test setup | |

## Commands

```bash
npm test            # unit + UI tests (fast, about 5 seconds)
npm run test:watch  # same, re-runs when a file changes
npm run test:e2e    # browser tests (about 1 minute)
npm run test:all    # everything
```

The browser tests need a browser the first time:

```bash
npx playwright install chromium
```

Or use a Google Chrome that is already installed:

```bash
# Windows (cmd)
set PW_CHANNEL=chrome && npm run test:e2e
# macOS / Linux
PW_CHANNEL=chrome npm run test:e2e
```

## Adding a level

1. Add the level to `lib/levels.js`.
2. Add its solution to `tests/solutions.js`.
3. Run `npm test`. The level tests check the new level automatically.
