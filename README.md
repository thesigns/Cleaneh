<p align="center">
  <img src="assets/icons/app.svg" width="96" height="96" alt="">
</p>

<h1 align="center">Cleaneh</h1>

<p align="center">
  A cleaning app that asks how your home is doing, one small spot at a time.<br>
  Installable web app (PWA) for phones · English and Polish · works offline · no account, no tracking
</p>

---

> **Status: early development.** The offline app skeleton, the decision logic (with tests and a 60-day simulation) and on-device storage, the Sweep and the main loop (give me a task, series, stopwatch, rewards) are in place; setup, settings and the big clean are being built.
> See the [build order](docs/cleaneh-design.md#143-kolejność-budowy) in the specification.

## The idea

Cleaning gets put off not because it is hard, but because "clean the flat" looks like one endless job. Cleaneh breaks it into small, concrete questions about specific places:

> **Kitchen** — Is the counter clean?

- **YES** — it's clean. The question rests for a while, and the next one comes up.
- **NO** — Cleaneh offers to do it now, shows the estimated time ("~5 min") and starts a stopwatch.
- **NOT NOW** — no penalty; the question stays in the queue.
- **N/A** — you don't have it (no dishwasher, no balcony); the question is switched off.

Questions come one after another until you stop. Cleaneh picks what needs attention most and leans towards the room you are already in.

Two more modes:

- **Sweep** — a quick, swipe-through check of the whole home, card by card.
- **Big clean** — a larger clean (guests, weekend) within a time budget, in a sensible order: room by room, top to bottom, dry before wet.

## Principles

- **Inspection, not orders.** The app asks about the state of things; answering takes a second.
- **Micro-tasks.** Every question is one small thing that takes a few minutes.
- **A painless NO.** Saying no never costs anything, so there is no reason to fib.
- **The app waits, it doesn't chase.** No notifications, no reminders, no streaks to lose, no guilt.
- **It learns your home.** How often a question comes back adapts to how quickly each spot actually gets dirty, and estimated times adapt to how long tasks really take.
- **Only on your device.** No account, no server, no analytics. After the first load it works without internet.

## Rooms and questions

You add the rooms you actually clean, any number of each kind (two bedrooms, three bathrooms, just your own room), each with its own name and colour. The kind of room decides which questions it gets. Things that usually come one per home — laundry, computer, car, kids, pets, air conditioning — are switched on separately.

The catalogue has about 245 questions in English and Polish, some of them seasonal (mowing the lawn, clearing snow): [`docs/cleaneh-questions.md`](docs/cleaneh-questions.md).

## Running it locally

Requires [Node.js](https://nodejs.org/) 24 or newer (for the dev tools only; the app itself has no dependencies and no build step).

```sh
npm install
npm run serve
```

Then open <http://127.0.0.1:8080/> in a browser. In Chrome, DevTools → device toolbar (Ctrl+Shift+M) shows it at phone size.

The service worker, installation and persistent storage need HTTPS or `localhost`, so on a phone over the local network (`npm run serve -- --host 0.0.0.0`) the app opens, but works online only.

## Development

| Command | What it does |
|---|---|
| `npm run serve` | Local file server (`--port`, `--host`, `--base Cleaneh` for a subpath) |
| `npm test` | Unit tests (`node:test`) |
| `npm run lint` | ESLint |
| `npm run e2e` | Browser tests and screenshots with Playwright (first time: `npx playwright install chromium`) |
| `npm run stamp` | Writes the app file list and version hash into `sw.js` — run after changing any app file |
| `npm run icons` | Renders the app icon PNGs from the SVG sources |
| `npm run check` | All of the above that check things, in order |

Tech: plain JavaScript (ES modules), HTML and CSS — no framework, no bundler, no runtime libraries. The files in the repository are exactly what the browser gets.

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

The [specification](docs/cleaneh-design.md) (in Polish) is the source of truth for how the app behaves.

## Background

Cleaneh is the successor of *Cleanerr*, a native Android app by the same author. It keeps Cleanerr's logic and look, moves to the browser, and drops notifications on purpose.

## License

Code: [MIT](LICENSE) © 2026 Jakub W. Adamczyk.

The [Nunito](https://github.com/googlefonts/nunito) typeface is licensed under the [SIL Open Font License 1.1](assets/fonts/OFL.txt).
