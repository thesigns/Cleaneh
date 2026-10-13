// Starts the app: icons, data, engine, language, screens (specification 13.2).

import { startEngine } from '../engine/start.js';
import { button } from './components.js';
import { devMode, devPref, loadDevPrefs } from './dev.js';
import { h } from './dom.js';
import { createI18n, detectLanguage } from './i18n/index.js';
import { loadIcons } from './icons.js';
import { onInstallChange, watchInstallPrompt } from './install.js';
import { createRouter } from './router.js';
import { createUpdater } from './service-worker.js';
import { startTheme } from './theme.js';
import { cleanScreen } from './screens/clean.js';
import { devScreen } from './screens/dev.js';
import { homeScreen, pathToArea } from './screens/home.js';
import { settingsScreen } from './screens/settings.js';
import { SETUP_PATHS, allowedInSetup, setupScreen } from './screens/setup.js';
import { sweepScreen } from './screens/sweep.js';

/** The screen of an address. Until the setup is done, every address leads to its current step (10). */
function screenFor(ctx, path) {
  const step = ctx.settings.onboarding;
  if (step !== 'done' && !allowedInSetup(path, step)) {
    queueMicrotask(() => ctx.router.navigate(SETUP_PATHS[step] ?? SETUP_PATHS.welcome, { replace: true }));
    return { element: document.createElement('div') };
  }
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'setup' && step !== 'done') return setupScreen(ctx, parts[1]);
  if (parts[0] === 'settings' && parts[1] === 'dev' && ctx.dev) return devScreen(ctx, parts[2] ?? null);
  if (parts[0] === 'settings') return settingsScreen(ctx, parts[1] ?? null);
  if (parts[0] === 'clean') return cleanScreen(ctx);
  if (parts[0] === 'sweep') {
    if (parts[1] === 'first') return sweepScreen(ctx, { kind: 'first' });
    if (parts[1] === 'area' && parts[2]) return sweepScreen(ctx, { kind: 'area', area: pathToArea(parts[2]) });
    return sweepScreen(ctx, { kind: 'resume' });
  }
  return homeScreen(ctx);
}

/** When the data cannot be opened: say why, nothing is deleted. */
function errorScreen(root, error) {
  const i18n = createI18n(detectLanguage());
  const t = i18n.t;
  document.documentElement.lang = i18n.lang;
  const newer = error?.name === 'VersionError' || /newer version/.test(error?.message ?? '');
  root.replaceChildren(
    h(
      'div',
      { class: 'screen error' },
      h('div', { class: 'error__body' }, h('h1', { class: 't-headline-s' }, t('error.title')), h('p', { class: 't-body-l' }, t(newer ? 'error.newer' : 'error.storage')), button(t('error.reload'), () => location.reload())),
    ),
  );
}

/** Waits this long for a new version to take over before starting without it. */
const SWITCH_TIMEOUT_MS = 3000;

export async function startApp(root) {
  watchInstallPrompt();
  let engine = null;
  // A new version goes in only when nothing is going on (9.2); without data there is nothing to interrupt.
  const updater = 'serviceWorker' in navigator ? createUpdater({ isIdle: () => (engine ? engine.isIdle() : Promise.resolve(true)) }) : null;
  const registered = updater?.register();
  // Developer mode (13.4): with ?dev on the real address its data goes to a database of its own.
  const dev = devMode(location);
  if (dev) loadDevPrefs();
  await loadIcons();
  let started;
  try {
    started = await startEngine(dev ? { name: dev === 'flag' ? 'cleaneh-dev' : undefined, dev: { month: () => devPref('month'), lastDoneAt: () => devPref('lastDone')?.at ?? null } } : {});
  } catch (error) {
    console.error(error);
    errorScreen(root, error);
    // A newer version may be able to open the data.
    await registered;
    updater?.applyIfIdle();
    return null;
  }
  engine = started.engine;
  const { scheduler, name } = started;

  // Close what was left behind before showing anything (4.3).
  await engine.open();
  // Opening the app is when a new version goes in: the page reloads into it before showing anything.
  await registered;
  if (await updater?.applyIfIdle()) await new Promise((resolve) => setTimeout(resolve, SWITCH_TIMEOUT_MS));
  const { settings } = await engine.snapshot();
  const i18n = createI18n(settings.language ?? detectLanguage());
  document.documentElement.lang = i18n.lang;

  const ctx = {
    engine,
    scheduler,
    i18n,
    /** The settings as loaded; screens that change them update this too. */
    settings,
    haptics: () => ctx.settings.sound && navigator.vibrate?.(10),
    /** Developer mode: 'local', 'flag' or null (the real app). */
    dev,
    router: null,
  };
  ctx.router = createRouter(root, (path) => screenFor(ctx, path));
  // The theme chosen in another tab: Settings show it too.
  startTheme(name, settings.theme, (theme) => {
    ctx.settings = { ...ctx.settings, theme };
    if (/^\/settings(\/dev)?$/.test(ctx.router.path ?? '')) ctx.router.refresh();
  });

  // Coming back: close what was left behind meanwhile (4.3); after a while away it counts as opening the app.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return updater?.hidden();
    await engine.open();
    await updater?.visible();
  });
  // Chrome's install window may get ready after a screen offering it is shown; installed, the offer goes.
  onInstallChange(() => {
    if (/^\/(setup\/install|settings)$/.test(ctx.router.path ?? '')) ctx.router.refresh();
  });
  // A newer version of the app opened in another tab needs the database: reload into it; everything is saved.
  engine.onChange((change) => {
    if (change.type === 'version-change') location.reload();
  });

  await ctx.router.start();
  document.body.dataset.ready = 'true';
  return ctx;
}
