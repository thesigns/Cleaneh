<p align="center">
  <img src="assets/icons/app.svg" width="96" height="96" alt="">
</p>

<h1 align="center">Cleaneh</h1>

<p align="center">
  A cleaning app that asks how your home is doing, one small spot at a time.<br>
  For phones · English and Polish · works offline · no account, no tracking
</p>

<p align="center">
  <a href="https://thesigns.github.io/Cleaneh/"><b>Open Cleaneh → thesigns.github.io/Cleaneh</b></a>
</p>

---

> **Version 0.1, first release.** Everything described below works; it is now being tested on real phones. If something looks off, please [open an issue](https://github.com/thesigns/Cleaneh/issues).

## How it works

Cleaning gets put off not because it is hard, but because "clean the flat" looks like one endless job. Cleaneh breaks it into small questions about specific places:

> **Kitchen** — Is the counter clean?

- **YES** — it's clean. The question rests for a while, and the next one comes up.
- **NO** — Cleaneh offers a short task ("~5 min") with a stopwatch. Tap **DONE** when you finish.
- **NOT NOW** — no penalty; the question will come back.
- **N/A** — you don't have it (no dishwasher, no balcony); the question is switched off.

Tap **Give me a task** whenever you have a moment. Questions come one after another until you stop, starting with what needs attention most, and staying in the room you are already in where possible.

Two more ways to clean:

- **Sweep** — a quick check of the whole home: swipe cards right for YES, left for NO, up for N/A.
- **Big clean** — for guests or a weekend: choose how much time you have and which rooms, and Cleaneh plans a sensible order (room by room, top to bottom, dry before wet).

Cleaneh learns as you go: a spot that gets dirty quickly is asked about more often, one that stays clean less often, and estimated times follow how long tasks really take.

**No notifications, ever.** Cleaneh waits for you to open it. Its icon on your home screen is the only reminder, and the home screen shows gently when you last cleaned. No streaks to lose, no lists of what you have neglected.

## Getting started

1. Open **<https://thesigns.github.io/Cleaneh/>** on your phone.
2. Add your rooms (any number of each kind, each with its own name and colour) and switch on what you have: pets, a dishwasher, a car, kids and so on. These decide which questions you get. The catalogue has about 245 of them, some seasonal (mowing the lawn, clearing snow).
3. Do a short first Sweep, so Cleaneh knows where to start.
4. Put Cleaneh on your home screen. It then opens like any other app, full screen, and keeps your data more safely.

### Putting it on your home screen

- **Android (Chrome):** tap **Install the app** (offered during setup and in Settings), or in Chrome's menu ⋮ choose *Install app* / *Add to Home screen*.
- **iPhone and iPad (Safari):** tap Share, then *Add to Home Screen*. **Do this first, before the setup**, and then open Cleaneh from the new icon: on an iPhone the icon has its own storage, separate from Safari, so a setup done in Safari does not come along. Cleaneh offers this right after its welcome screen.
- **Computer (Chrome, Edge):** the install icon at the right end of the address bar. Cleaneh is made for phones, but works on a computer too, in a phone-sized column.

## Your data

- **Everything stays on your device**, in this browser. There is no account, no server, no analytics and no cookies, and the app makes no requests to anyone else.
- **One device, one browser.** Nothing is synced: your phone and your computer each have their own Cleaneh.
- **Clearing the browser's data for the site deletes Cleaneh's data too.** On an iPhone, Safari also deletes data of sites not used for 7 days, unless the app is on the home screen. There is no export or backup yet.
- **Start over** in Settings deletes everything except your language, theme and sound settings, and takes you back to the setup.

## Offline and updates

After the first visit Cleaneh works without internet. New versions download in the background and switch on the next time you open the app, never in the middle of a task, a Sweep or a big clean.

## Settings

Rooms, gear and household, turned-off questions (bring any of them back), language (English, Polish, or the browser's), theme (light, dark, or the system's), sound and vibration for rewards, installing, and starting over.

---

## For developers

Plain JavaScript (ES modules), HTML and CSS: no framework, no bundler, no runtime libraries. The files in the repository are exactly what the browser gets. The [specification](docs/cleaneh-design.md) and the [question catalogue](docs/cleaneh-questions.md) (both in Polish) are the source of truth for how the app behaves.

### Running it locally

Requires [Node.js](https://nodejs.org/) 24 or newer, for the dev tools only.

```sh
npm install
npm run serve
```

Then open <http://127.0.0.1:8080/>. In Chrome, DevTools → device toolbar (Ctrl+Shift+M) shows it at phone size.

The service worker, installation and persistent storage need HTTPS or `localhost`, so on a phone over the local network (`npm run serve -- --host 0.0.0.0`) the app opens, but works online only. To test on a phone, use the published app with `?dev`.

**Developer mode** (time shift, season month, language and theme, a pretend last cleaning, the pool preview) is at the end of Settings on `localhost`, or on any address with `?dev`, e.g. <https://thesigns.github.io/Cleaneh/?dev>. With `?dev` it uses a separate database, so real data stays untouched. The real app never shows it.

### Commands

| Command | What it does |
|---|---|
| `npm run serve` | Local file server (`--port`, `--host`, `--base Cleaneh` for a subpath) |
| `npm test` | Unit tests (`node:test`) |
| `npm run lint` | ESLint |
| `npm run e2e` | Browser tests and screenshots with Playwright (first time: `npx playwright install chromium`) |
| `npm run stamp` | Writes the app file list and version hash into `sw.js`; run after changing any app file |
| `npm run icons` | Renders the app icon PNGs from the SVG sources |
| `npm run check` | All of the above that check things, in order |

### Layout

```
index.html, manifest.webmanifest, sw.js   the app shell
src/core     decision logic: pure JS, no DOM, fully unit-tested
src/data     IndexedDB storage
src/engine   the only place that changes state
src/ui       screens, components, theme, translations
assets/      font, icons
tools/       dev tools: server, service worker stamp, icon renderer
tests/       unit tests and Playwright tests
docs/        specification and question catalogue (in Polish)
design/      icon sources
```

### Publishing

The app is published with GitHub Pages straight from the repository: Settings → Pages → Deploy from a branch → `main`, `/ (root)`. Every push to `main` is a new version for everyone. All paths are relative, so it works under any `https://<user>.github.io/<repo>/`. `.nojekyll` tells Pages to serve the files untouched. Only the files listed in `sw.js` are cached by the app; the rest of the repository (docs, tests) is reachable on the site but never loaded by it.

All repositories of one GitHub account share a single origin (`<user>.github.io`), and so the browser's storage. Cleaneh keeps everything under its own names (database `cleaneh`, keys `cleaneh.*`, caches `cleaneh-*`, service worker scope `/Cleaneh/`) and removes only its own caches. Other apps on the same account must not clear storage wholesale.

## Background

Cleaneh is the successor of *Cleanerr*, a native Android app by the same author. It keeps Cleanerr's logic and look, moves to the browser, and drops notifications on purpose.

## License

Code: [MIT](LICENSE) © 2026 Jakub W. Adamczyk.

The [Nunito](https://github.com/googlefonts/nunito) typeface is licensed under the [SIL Open Font License 1.1](assets/fonts/OFL.txt).
