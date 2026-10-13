# Cleaneh

A PWA (a web app to install on the home screen, phones first) that asks about the state of specific places in the home and offers short cleaning tasks with a stopwatch. The successor of Cleanerr (native Android), without notifications: the app waits for the user to open it.

Status: the build plan (specification 14.3, steps 0–11) is done: the skeleton, logic, data, engine, look (building blocks in `src/ui`, gallery `dev/gallery.html`), the Sweep, the home screen with series, stopwatch and rewards, the setup, Settings, the big clean, developer mode and PWA polish. Since then: the home screen prompt first on iPhones and a theme setting. Left: publishing on GitHub Pages at https://thesigns.github.io/Cleaneh/ (the user creates the repository and turns Pages on) and testing on a phone.

The user speaks Polish: talk to them in Polish. Code, comments, commit messages, `README.md` and this file are in English; the specification and the question catalogue are in Polish.

## Documents

- `docs/cleaneh-design.md` — the main specification. The source of truth for how the app behaves.
- `docs/cleaneh-questions.md` — the question catalogue (accepted): PL/EN texts, PL/EN tasks, time, interval, priority, season, required gear, big clean stage, ★ (first Sweep), set; at the end the switches and room kinds with their sets. **Changes to texts, times, intervals or sets only after the user accepts them.**
- A change in the app's behaviour goes into the specification first, then into the code. Report a mismatch between code and specification; do not settle it quietly.
- Icons: sources in `design/icons/*.svg` (24×24 grid, 1.75 stroke, the second tone as a semi-transparent fill). `node tools/icon-sprite.mjs` builds them into `assets/icons/sprite.svg` (a test checks it is up to date); in the app `icon(name)` from `src/ui/icons.js` after `loadIcons()`. New icons and changes go into the sources first, preview in the gallery.

## Model: Cleanerr

- The repository next door: `E:\Alu\Cleanerr` (Release 1.4). Read only; never change anything there.
- Logic to port: the `core/` module (Kotlin) with its tests, including the pool simulation. Tuning values (weights, multipliers, thresholds) stay the same.
- The catalogue generator `tools/generate_catalog.py` was the starting point for the Node generator.
- Typeface: `app/src/main/res/font/nunito.ttf` (variable) and its license `app/src/main/assets/licenses/nunito-OFL.txt`. In Cleaneh as WOFF2, with the license shipped in the app.
- Differences from Cleanerr: no slots, notifications, alarms, "Only at home", signing, or data migration from Cleanerr. An abandoned series, big clean and forgotten task are closed by the "app opened" event (specification 4.3).

## Architecture

- **Vanilla JS**: ES modules, HTML, CSS. No framework, TypeScript, bundler or build step: the files in the repository are what the browser gets.
- **Libraries in the app: none.** An exception only with a reason in the specification. Dev tools (Node LTS, `node:test`, Playwright, ESLint, the file server) never get into the app.
- **`src/core`** — pure decision logic, runs in the browser and in Node. No DOM, no browser APIs, no texts. Catalogue, home, scheduler, loop (state machine of series, task, big clean), Sweep with undo, big clean plan, last cleaning, switch state.
  - Time through a clock interface, randomness through a seeded generator. **Never `Date.now()`, `new Date()` without an argument or `Math.random()` directly in `core`.**
  - Every logic change has unit tests (`node --test`). The pool simulation shows what interval changes do.
  - JSDoc on the data model and public functions.
- **`src/data`** — IndexedDB through a thin promise wrapper, writing only changes. The current activity and a Sweep in progress as JSON with a `kind` discriminator. An area as text `room#3` / `group#LAUNDRY`.
- **`src/engine`** — the only place that changes state: load, call `core`, save. A queue across tabs too (`navigator.locks`), then a signal to the other tabs (`BroadcastChannel`).
- **`src/ui`** — screens and components on the DOM, theme, texts from translation files. No decision logic of its own.
  - `dom.js` (`h()` builds elements; CSS variables in `style` through `setProperty`), `icons.js`, `blob.js` (the blob under an icon, one animation loop), `areas.js` (an area's colour, icon and seed; `paintArea` sets the `--area-*` variables of both themes, the element gets the `area` class), `deck.js` (card stack with gestures), `components.js` (pills, buttons, answer buttons, question card, walk card).
  - Styles: `theme.css` (tokens, `.t-*` typography, dark theme from the system or `data-theme`), `app.css`, `components.css`, `screens.css`.
  - Texts: `src/ui/i18n/en.js` and `pl.js` (flat keys, plurals as objects with `Intl.PluralRules` categories), `createI18n(lang)` from `i18n/index.js` (`t`, `areaName`, `questionText`, `taskText`, `collator`).
  - App start: `src/ui/app.js` (`startApp`); the engine is put together in `src/engine/start.js`. Screens by the address after `#` (`src/ui/router.js`): `/` home, `/sweep`, `/sweep/first`, `/sweep/area/room:3` (an area's `#` as `:`). A screen may have `leave()` (Back works like X) and `destroy()`. History entries carry `history.state.depth` (the app's first entry = 0); `navigate('/')` goes back to the first entry, so Back on the home screen closes the app, and `router.root(path)` starts there with another screen ("Start over"). Layers (`historyLayer`) add `depth` too. Sheets (`src/ui/sheet.js`) have their own history entry; Back closes them.
  - Setup (`src/ui/screens/setup.js`): steps at `/setup/welcome|rooms|features`, `/sweep/first`, `/setup/install|summary`; the step is saved in `settings.onboarding` ('done' after the setup), the first Sweep's summary in `settings.firstSummary`. Until the setup is done, `screenFor` in `app.js` sends every address to the current step (`allowedInSetup`); after the first Sweep the earlier steps cannot be gone back to. On an iPhone in Safari (`installFirst()`) the home screen prompt comes right after the welcome, because there the app on the home screen has storage separate from Safari's; elsewhere it comes after the first Sweep. The room editor (`src/ui/rooms.js`) and the switches (`src/ui/features.js`) are shared with Settings. Layers over a screen (sheet, dialog, reward, editor) go through `historyLayer` from `src/ui/layer.js`; Back closes only the top one.
  - App tests after the setup: `seedHome` marks the setup as done (`setupDone: false` to not) and reloads the page, because the app reads settings at start. Read attributes of a screen that may disappear with one `page.evaluate`, not a locator (a locator waits for the element to come back).
  - Big clean: start screen `/clean` (`src/ui/screens/clean.js`), then the ordinary home screen with `series.clean` (`.home-root[data-clean="true"]`): block header with "N of M" and an upper time limit, walk card with "up to X min", lavender rewards (block, end). Reward order as in Cleanerr: end of big clean > block > task. Lavender as text/outline: `--lavender-on-bg`, as background: `--lavender-container`.
  - Developer mode (`src/ui/screens/dev.js`, `/settings/dev`, `/settings/dev/pool`; `app.js` routes there only with `ctx.dev`): time shift (`engine.age`), season month (the scheduler's `seasonMonth`), language and theme (the same settings as in Settings), a pretend last cleaning (the engine's `lastDoneAt`), pool preview (`engine.poolPreview`). Knobs (month, last cleaning) in `localStorage` (`src/ui/dev.js`: `devPref`, `setDevPref`), outside the app's data.
  - Settings (`src/ui/screens/settings.js`): `/settings`, `/settings/rooms|features|off`. Changing the language saves the setting and reloads the app. The theme (`settings.theme`: null / 'light' / 'dark') applies at once through `data-theme` on `<html>` and the `media` of the `theme-color` meta tags (`src/ui/theme.js`); a copy in `localStorage` (`cleaneh.theme`, with `?dev` `cleaneh-dev.theme`) lets `src/ui/theme-early.js` (a classic script in `index.html`, without `defer`) apply the theme before anything shows, and lets other tabs follow a change. "Start over" clears everything except language, theme and sound, sets `onboarding: 'rooms'` and goes back to the setup. The human version is in `src/version.js` (`APP_VERSION`), shown next to the short hash from the service worker's cache name.
  - The home screen (`src/ui/screens/home.js`) shows what the loop is doing: `.home-root[data-mode]` = idle / asking / offering / timing, `data-busy` while an event is being sent; a series question has `data-moving` (walk card). The reward (`src/ui/reward.js`) and the confirmation dialog (`src/ui/dialog.js`) have their own history entries. The reward sound (`src/ui/sound.js`) is unlocked by `unlockSound()` in the DONE tap handler.
  - Browser tests that change stored state (stopwatch start time, abandoned series, history): `editStored`, `resetStored` from `tests/e2e/app.js`. Run Playwright on its own only after `npm run stamp`, or the service worker keeps an old file list and the offline tests fail.
  - The Sweep screen sets `data-step` (number of answers) and `data-moving` on `.screen`; tests wait for those, not for the card text to change (fast clicks during an animation are ignored).
  - App tests: `tests/e2e/app.js` (`openApp`, `seedHome` with `ageDays`, because right after adding rooms nothing is due, `stored`). The gallery also has a button that puts a sample home into the app's data.
  - The gallery `dev/gallery.html` (development only, outside the app): palette, typography, colours, icons and playgrounds with gestures (`?view=series|sweep|move`, `&lang=pl`, `&theme=dark`).
- **`src/core` modules**: `catalog` (+ generated `catalog-data`), `home` (rooms, colours, switches), `scheduler` (pool, weights, intervals, seasons, calibration), `loop` (state machine: events `open`, `request-task`, `start-clean`, `answer`, `start`, `skip`, `stop`, `done`, `give-up`, `take`), `clean` (big clean plan), `sweep` (the Sweep as data, undo by replaying answers), `history` (last cleaning, today's result), `time` (zones, local dates), `random` (seeded generator).
- **Data in `core` are plain JSON objects**: time in milliseconds, area `room#3` / `group#LAUNDRY`, instance key `question@area`, instance state in the `household.instances` object. Functions return new objects; without a change they return the same one (e.g. `refresh`), which lets saving be skipped.
- **`tools/generate-catalog.mjs`**: from `docs/cleaneh-questions.md` creates `src/core/catalog-data.js` and the texts and names in `src/ui/i18n/catalog-{en,pl}.js`. After a catalogue change run the generator (`node tools/generate-catalog.mjs`), then stamp. Never edit the generated files by hand; a test checks they are up to date.
- **Simulation** (`tests/unit/core/simulation.test.js`, 60 days, profiles from 13.2): report with `node --test --test-reporter=tap tests/unit/core/simulation.test.js`. For changes to intervals and drawing, check several seeds, not just the default.
- **Service worker** (`sw.js` in the root): the list of app files (`index.html`, `manifest.webmanifest`, `src/`, `assets/`) and a hash of their content in the cache name, written by `npm run stamp`. Run stamp after every change to an app file; a test checks `sw.js` is up to date. A new version never reloads the page in the middle of a series, task, Sweep or big clean. It deletes only its own old caches (`cleaneh-` prefix): every repository of the account shares the origin `thesigns.github.io`, and with it the browser's storage.
  - Switching versions: `createUpdater` in `src/ui/service-worker.js` (at app start after `engine.open()`, on coming back after `AWAY_MS` in the background, looking for a new version every `CHECK_EVERY_MS`), tests in `tests/unit/ui/updater.test.js`. The browser test (`tests/e2e/updates.spec.js`) has its own server from `createFileServer` in `tools/serve.mjs`, which serves `sw.js` with another version; Playwright does not intercept the service worker script.
- **Relative paths** everywhere (HTML, CSS, manifest, service worker): on GitHub Pages the app runs under `/Cleaneh/`. Playwright tests run under the same subpath. `.nojekyll` makes Pages serve the files untouched.
- **Data schema** (`src/data/schema.js`): schema version = IndexedDB version, `MIGRATIONS[n]` goes from n−1 to n in the version change transaction. Every change is a new version with a migration and a test in `tests/e2e/data.spec.js` (an old database with data opened as the app does). A missing migration and data from a newer app version end opening with an error without touching the data; data is never deleted to make room.
- **Stores v1**: `rooms` (by id), `instances` (by instance key), `state` (`features`, `activity`, `sweep`, `settings`), `answers` (index `kind_at`), `series`, `sweeps` (index `scope`). Sweep answers do not go into `answers` (as in Cleanerr), only a record in `sweeps`.
- **Engine** (`src/engine/engine.js`): every operation in the `navigator.locks` queue ('cleaneh-engine'), always on freshly loaded state, then saving only changes and a `BroadcastChannel('cleaneh')` signal. The UI listens to `engine.onChange` and refreshes its view through `engine.snapshot()`. An event that changes nothing saves nothing.

## Look

- It must be very pretty and appealing, as in Cleanerr 1.4: sea green / apricot (NO, never alarm red) / lavender (N/A), a warm "paper" background, the Nunito typeface, seven room colours and group hues (values in specification 13.1), a walk card when the room changes, blobs under icons, springy animations.
- Lavender belongs to the big clean, green to tasks and the Sweep.
- Colours as CSS variables; light and dark theme by `prefers-color-scheme`, or as chosen in Settings. Continuous animations off with `prefers-reduced-motion`.
- Full-screen rewards: confetti on a `<canvas>`, sound synthesised with Web Audio (no audio files, always after a tap), vibration where available.
- Card gestures through Pointer Events; they must not trigger scrolling, pull-to-refresh or the "back" gesture (`touch-action`, `overscroll-behavior`).
- The layout copes with 130% font size and longer Polish texts; decoration shrinks first, text and buttons stay whole.

## Texts and languages

- English (default) and Polish. Every text in both languages right away, developer mode too. No texts hard-coded in the code.
- Both translation files have the same set of keys with the same parameters; a test checks it.
- Plurals through `Intl.PluralRules` (Polish: 1 zadanie, 2 zadania, 5 zadań). Never "tasks: 3" as a workaround. Dates, times and durations through `Intl`.
- **Polish texts are gender-neutral.** No personal past-tense forms ("Skończyłeś?" → "Gotowe?", "Ostatnio sprzątałeś" → "Ostatnie sprzątanie"). Impersonal forms, the imperative, nouns.
- **YES = clean.** Every question asks about the state of things, not about what the user did.
- **The room's name never appears in a question.** It is the label above the question and the name on the walk card.
- Tone: warm, short, lightly humorous. Never judging or shaming. No streaks, no lists of what is overdue.

## Environment

- Windows, Git Bash and PowerShell. Node LTS and npm for dev tools only.
- Test phone: Xiaomi Redmi Note 10 (Android 11, MIUI, Chrome). The service worker, installation and persistent storage need HTTPS or `localhost`, so on the phone the simplest is the published app with `?dev` (developer mode, separate database).
- The typeface `assets/fonts/nunito.woff2` was converted once from Cleanerr's TTF (`fontTools`, `flavor = 'woff2'`, no subsetting). App icons: sources `assets/icons/app.svg` and `app-maskable.svg`, PNGs through `npm run icons`.
- In Git Bash arguments starting with `/` are turned into Windows paths: `--base Cleaneh`, not `--base /Cleaneh/`.
- Larger changes across many files are easiest with a script in the scratchpad directory; heredocs in Git Bash break on quotes and backslashes.

## Workflow

- Loop: change → `npm run stamp` → `npm test` (`node:test`, `tests/unit`) → `npm run lint` (must be clean) → `npm run e2e` (Playwright, `tests/e2e`) → the phone at the end. All at once: `npm run check`.
- The user does the manual testing in the browser, but Claude starts the server (`npm run serve` in the background) when the user asks or when there is something new to look at, and gives the address.
- Locally: `npm run serve` (http://127.0.0.1:8080/), options `--port`, `--host 0.0.0.0`, `--base Cleaneh`.
- ESLint enforces the `core` rules: no browser or Node globals, no `Date.now()`/`new Date()`/`Math.random()`, no imports from `data`/`engine`/`ui`.
- The data layer and the engine are tested in real Chromium (IndexedDB, Web Locks, two tabs as two pages of one context): `tests/e2e/harness.html` loads the modules into `window.T`, tests call them through `page.evaluate`. Every Playwright test has a fresh context, so an empty database. Pure functions (`changes`, `migrationSteps`, `createLock` without Web Locks) in `tests/unit/data`.
- Screenshots at fixed sizes (Playwright projects `redmi` 393×820, `small` 360×616, `small-130` with 130% font size); selected screens in the dark theme and in English. `shoot(page, name)` from `tests/e2e/fixtures.js` saves to `screenshots/<project>/` (outside the repository) — look at them after layout changes. Tests that do not depend on screen size run only in `redmi` (`ONCE` in `playwright.config.js`). `prefers-reduced-motion` is emulated.
- Developer mode (specification 13.4) only in the development version: `localhost` / `127.0.0.1` or an address with `?dev` (`devMode` in `src/ui/dev.js`). With `?dev` off the development server, a separate database `cleaneh-dev` (`startEngine({ name })`). Playwright tests run on 127.0.0.1, so developer mode is on in them (the "Dla programistów" section in Settings).
- Small steps, a commit after every working stage. **`git push` and production deployment only on the user's explicit command.**
- Public repository on GitHub (`thesigns/Cleaneh`), MIT license (`LICENSE`, Jakub W. Adamczyk). No license headers in files. The Nunito typeface has its own SIL OFL license (`assets/fonts/OFL.txt`). `README.md` is in English and written for users first (the app's address, installing, data), developers after; update it when the app's features, the build status or how to run it change.
