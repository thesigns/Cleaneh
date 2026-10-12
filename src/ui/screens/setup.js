// The setup (specification 10): welcome, rooms, gear and household, the first
// Sweep, the home screen prompt, the Sweep's summary. Every step has its own
// address (Back goes one step back) and is saved, so an interrupted setup
// comes back where it stopped.

import { activeRooms } from '../../core/home.js';
import { GROUP_HUES, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button } from '../components.js';
import { h } from '../dom.js';
import { featuresEditor } from '../features.js';
import { icon } from '../icons.js';
import { installWay, isInstalled, promptInstall, requestPersistence } from '../install.js';
import { roomsEditor } from '../rooms.js';
import { summaryContent } from './summary.js';

/** Where each step of the setup lives. */
export const SETUP_PATHS = {
  welcome: '/setup/welcome',
  rooms: '/setup/rooms',
  features: '/setup/features',
  sweep: '/sweep/first',
  install: '/setup/install',
  summary: '/setup/summary',
};

/**
 * Whether a path may show during the setup at `step`. Before the first Sweep is done the steps up to it can be
 * gone back to; after it only the current step remains (a second first Sweep would start the intervals over).
 */
export function allowedInSetup(path, step) {
  if (step === 'install' || step === 'summary') return path === SETUP_PATHS[step];
  return [SETUP_PATHS.welcome, SETUP_PATHS.rooms, SETUP_PATHS.features, SETUP_PATHS.sweep].includes(path);
}

/** Saves the step the user is on, so the app comes back to it. */
async function enter(ctx, step, extra = {}) {
  if (ctx.settings.onboarding === step && Object.keys(extra).length === 0) return;
  ctx.settings = await ctx.engine.updateSettings({ onboarding: step, ...extra });
}

/** The step after the first Sweep: the home screen prompt, unless the app is installed already. */
export function afterFirstSweep() {
  return isInstalled() ? 'summary' : 'install';
}

function brandBar(t) {
  return h('header', { class: 'home__bar' }, h('img', { class: 'home__logo', src: 'assets/icons/app.svg', alt: '' }), h('span', { class: 'home__name t-title-l' }, t('app.name')));
}

function dots(count, active) {
  return h('div', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: count }, (_, i) => h('span', { class: i === active ? 'dots__dot dots__dot--on' : 'dots__dot' })));
}

export async function setupScreen(ctx, step) {
  const { i18n, router } = ctx;
  const t = i18n.t;
  await enter(ctx, step);
  const go = (next) => router.navigate(SETUP_PATHS[next]);

  if (step === 'welcome') {
    const point = (iconName, title, text) =>
      h('li', { class: 'point' }, iconBlob(iconName, { size: '3.25rem', animated: false, className: 'blob--primary' }), h('div', {}, h('p', { class: 't-title-m' }, t(title)), h('p', { class: 'point__text t-body-m' }, t(text))));
    return {
      element: h(
        'div',
        { class: 'screen setup' },
        brandBar(t),
        h(
          'div',
          { class: 'setup__scroll' },
          h('h1', { class: 'setup__title t-headline-m' }, t('setup.title')),
          h('p', { class: 'setup__text t-body-l' }, t('setup.subtitle')),
          h(
            'ul',
            { class: 'points' },
            point('ui_home_pin', 'setup.point1Title', 'setup.point1Text'),
            point('ui_broom', 'setup.point2Title', 'setup.point2Text'),
            point('ui_sparkles', 'setup.point3Title', 'setup.point3Text'),
          ),
          h('p', { class: 'setup__note t-body-m' }, t('setup.note')),
        ),
        h('div', { class: 'setup__actions' }, button(t('setup.start'), () => go('rooms'))),
      ),
    };
  }

  if (step === 'rooms' || step === 'features') {
    const { household } = await ctx.engine.snapshot();
    const rooms = step === 'rooms';
    const next = button(t('setup.next'), () => (rooms ? go('features') : startFirstSweep()));
    // The first Sweep needs at least one room (7.5).
    const updateNext = (home) => (next.disabled = activeRooms(home).length === 0);
    const editor = rooms ? roomsEditor(ctx, household.home, { onChange: updateNext }) : featuresEditor(ctx, household.home);
    updateNext(household.home);

    async function startFirstSweep() {
      await enter(ctx, 'sweep');
      router.navigate(SETUP_PATHS.sweep);
    }

    return {
      element: h(
        'div',
        { class: 'screen setup' },
        dots(2, rooms ? 0 : 1),
        h(
          'div',
          { class: 'setup__scroll' },
          iconBlob(rooms ? 'area_room' : 'area_pets', { size: '5.5rem', animated: false, className: 'blob--primary setup__blob' }),
          h('h1', { class: 'setup__title t-headline-s' }, t(rooms ? 'setup.roomsTitle' : 'setup.featuresTitle')),
          h('p', { class: 'setup__text t-body-m' }, t(rooms ? 'setup.roomsText' : 'setup.featuresText')),
          editor.element,
        ),
        h('div', { class: 'setup__actions' }, next, button(t('setup.back'), () => history.back(), { variant: 'text', className: 'setup__back' })),
      ),
    };
  }

  if (step === 'install') {
    const finish = async () => {
      await enter(ctx, 'summary', { installPromptShown: true });
      router.navigate(SETUP_PATHS.summary, { replace: true });
    };
    const way = installWay();
    const how =
      way === 'prompt'
        ? button(t('install.button'), async () => {
            await promptInstall();
            finish();
          }, { iconName: 'ui_add_square' })
        : way === 'ios'
          ? h(
              'ol',
              { class: 'install-steps t-body-l' },
              h('li', {}, ...withIcon(t('install.iosStep1'), 'ui_share')),
              h('li', {}, ...withIcon(t('install.iosStep2'), 'ui_add_square')),
            )
          : h('p', { class: 't-body-l setup__text' }, t('install.other'));
    return {
      element: h(
        'div',
        { class: 'screen setup' },
        brandBar(t),
        h(
          'div',
          { class: 'setup__scroll setup__scroll--center' },
          h('img', { class: 'install__icon', src: 'assets/icons/app.svg', alt: '' }),
          h('h1', { class: 'setup__title t-headline-m' }, t('install.title')),
          h('p', { class: 'setup__text t-body-l' }, t('install.text')),
          way === 'prompt' ? null : how,
        ),
        h('div', { class: 'setup__actions' }, way === 'prompt' ? how : null, button(t('install.skip'), finish, { variant: way === 'prompt' ? 'text' : 'filled' })),
      ),
    };
  }

  // The first Sweep's summary: the end of the setup.
  const { household } = await ctx.engine.snapshot();
  const summary = ctx.settings.firstSummary ?? { toStart: [], remaining: 0 };
  const done = async () => {
    await enter(ctx, 'done', { firstSummary: null });
    requestPersistence();
  };
  return {
    element: paintArea(h(
      'div',
      { class: 'screen screen--summary area' },
      summaryContent(ctx, household, summary, false, {
        onStart: async () => {
          await done();
          await ctx.engine.send({ kind: 'take', key: summary.toStart[0] });
          router.navigate('/', { replace: true });
        },
        onDone: async () => {
          await done();
          router.navigate('/', { replace: true });
        },
      }),
    ), GROUP_HUES.CLEANING_GEAR),
  };
}

/** A text with '{icon}' replaced by the icon. */
function withIcon(text, iconName) {
  const [before, after] = text.split('{icon}');
  return [before, icon(iconName, { className: 'inline-icon' }), after ?? ''];
}
