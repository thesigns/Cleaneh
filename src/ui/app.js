// Starts the app: icons, data, engine, language, screens (specification 13.2).

import { startEngine } from '../engine/start.js';
import { button } from './components.js';
import { h } from './dom.js';
import { createI18n, detectLanguage } from './i18n/index.js';
import { loadIcons } from './icons.js';
import { watchInstallPrompt } from './install.js';
import { createRouter } from './router.js';
import { cleanScreen } from './screens/clean.js';
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

export async function startApp(root) {
  watchInstallPrompt();
  await loadIcons();
  let started;
  try {
    started = await startEngine();
  } catch (error) {
    console.error(error);
    errorScreen(root, error);
    return null;
  }
  const { engine, scheduler } = started;

  // Close what was left behind before showing anything (4.3).
  await engine.open();
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
    router: null,
  };
  ctx.router = createRouter(root, (path) => screenFor(ctx, path));

  // Coming back to the tab: close what was left behind meanwhile (4.3).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') engine.open();
  });
  // A newer version of the app opened in another tab needs the database: reload into it; everything is saved.
  engine.onChange((change) => {
    if (change.type === 'version-change') location.reload();
  });

  await ctx.router.start();
  document.body.dataset.ready = 'true';
  return ctx;
}
