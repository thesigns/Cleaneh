// Settings (specification 5.2): rooms and switches (the same editors as in
// the setup), turned-off questions, language, theme, sound and vibration, installing,
// starting over, and about; in the development version also developer mode (13.4).

import { APP_VERSION } from '../../version.js';
import { keyArea } from '../../core/scheduler.js';
import { GROUP_HUES, ROOM_HUES, areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button, iconButton } from '../components.js';
import { choose } from '../dialog.js';
import { h, replaceChildren } from '../dom.js';
import { featuresEditor } from '../features.js';
import { LANGUAGES } from '../i18n/index.js';
import { icon } from '../icons.js';
import { installWay, isInstalled, promptInstall } from '../install.js';
import { roomsEditor } from '../rooms.js';
import { openSheet } from '../sheet.js';
import { THEMES, applyTheme } from '../theme.js';
import { installInstructions } from './setup.js';

/** A page of Settings: back, title, an optional intro, the content. */
export function page(ctx, title, intro, ...content) {
  const t = ctx.i18n.t;
  return h(
    'div',
    { class: 'screen settings' },
    h('header', { class: 'settings__bar' }, iconButton('ui_back', t('settings.back'), () => history.back()), h('h1', { class: 't-title-l' }, title)),
    h('div', { class: 'settings__body' }, intro ? h('p', { class: 'settings__intro t-body-m' }, intro) : null, ...content),
  );
}

/** One setting: icon on a blob, title and explanation; a tap opens it, or a switch at the end. */
export function row({ iconName, hue, title, text, onClick = null, control = null, id = null }) {
  const body = [iconBlob(iconName, { size: '3.25rem', animated: false }), h('span', { class: 'setting__text' }, h('span', { class: 't-title-m' }, title), text ? h('span', { class: 'setting__sub t-body-m' }, text) : null)];
  const el = control
    ? h('label', { class: 'setting area', for: id }, ...body, control)
    : h('button', { type: 'button', class: 'setting area', onclick: onClick }, ...body, icon('ui_back', { className: 'setting__chevron' }));
  return paintArea(el, hue);
}

export function section(title, ...rows) {
  return h('section', { class: 'settings__section' }, h('h2', { class: 'settings__heading t-label-l' }, title), h('div', { class: 'settings__group' }, ...rows));
}

export async function settingsScreen(ctx, part) {
  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const { household } = await engine.snapshot();

  if (part === 'rooms') return { element: page(ctx, t('settings.rooms'), null, roomsEditor(ctx, household.home).element) };
  if (part === 'features') return { element: page(ctx, t('settings.features'), t('setup.featuresText'), featuresEditor(ctx, household.home).element) };
  if (part === 'off') return { element: page(ctx, t('settings.off'), t('off.text'), await turnedOffList(ctx)) };

  const off = (await engine.turnedOff()).length;
  const language = ctx.settings.language;
  const languageLabel = language ? t(`language.${language}`) : t('settings.languageSystem');

  const sound = h('input', { class: 'switch', type: 'checkbox', role: 'switch', id: 'setting-sound', checked: ctx.settings.sound, onchange: async (event) => (ctx.settings = await engine.updateSettings({ sound: event.target.checked })) });

  const build = h('span', {}, t('settings.version', { version: APP_VERSION }));
  caches
    ?.keys()
    .then((names) => {
      const name = names.find((n) => n.startsWith('cleaneh-'));
      if (name) build.textContent = `${t('settings.version', { version: APP_VERSION })} · ${name.slice('cleaneh-'.length, 'cleaneh-'.length + 7)}`;
    })
    .catch(() => {});

  const element = page(
    ctx,
    t('settings.title'),
    null,
    section(
      t('settings.home'),
      row({ iconName: 'area_room', hue: ROOM_HUES[4], title: t('settings.rooms'), text: t('settings.roomsText'), onClick: () => router.navigate('/settings/rooms') }),
      row({ iconName: 'area_pets', hue: GROUP_HUES.PETS, title: t('settings.features'), text: t('settings.featuresText'), onClick: () => router.navigate('/settings/features') }),
      row({ iconName: 'ui_not_applicable', hue: ROOM_HUES[4], title: t('settings.off'), text: off ? t('settings.offCount', { count: off }) : t('settings.offNone'), onClick: () => router.navigate('/settings/off') }),
    ),
    section(
      t('settings.app'),
      row({ iconName: 'ui_sparkles', hue: GROUP_HUES.ELECTRONICS, title: t('settings.language'), text: languageLabel, onClick: () => chooseLanguage(ctx) }),
      row({ iconName: 'ui_theme', hue: ROOM_HUES[3], title: t('settings.theme'), text: t(themeKey(ctx.settings.theme)), onClick: () => chooseTheme(ctx) }),
      row({ iconName: 'ui_play', hue: GROUP_HUES.CLEANING_GEAR, title: t('settings.sound'), text: t('settings.soundText'), control: sound, id: 'setting-sound' }),
      isInstalled() ? null : row({ iconName: 'ui_add_square', hue: GROUP_HUES.AIR, title: t('settings.install'), text: t('settings.installText'), onClick: () => install(ctx) }),
    ),
    section(t('settings.data'), row({ iconName: 'ui_close', hue: ROOM_HUES[1], title: t('settings.reset'), text: t('settings.resetText'), onClick: () => startOver(ctx) })),
    ctx.dev ? section(t('settings.devSection'), row({ iconName: 'ui_hourglass', hue: GROUP_HUES.ELECTRONICS, title: t('dev.title'), text: t('settings.devText'), onClick: () => router.navigate('/settings/dev') })) : null,
    section(
      t('settings.about'),
      h(
        'div',
        { class: 'about t-body-m' },
        h('p', { class: 'about__name t-title-m' }, t('app.name')),
        h('p', {}, build),
        h('p', {}, h('button', { type: 'button', class: 'link', onclick: () => showFontLicense(ctx) }, t('settings.font'))),
        h('p', {}, t('settings.code')),
      ),
    ),
  );
  return { element };
}

/** Questions turned off with N/A, by area, each with "Bring back". */
async function turnedOffList(ctx) {
  const { engine, i18n } = ctx;
  const t = i18n.t;
  const box = h('div', { class: 'off' });

  async function render() {
    const [{ household }, keys] = await Promise.all([engine.snapshot(), engine.turnedOff()]);
    const home = household.home;
    if (keys.length === 0) {
      replaceChildren(box, h('p', { class: 'settings__group off__empty t-body-l' }, t('off.empty')));
      return;
    }
    const byArea = new Map();
    for (const key of keys) byArea.set(keyArea(key), [...(byArea.get(keyArea(key)) ?? []), key]);
    replaceChildren(
      box,
      [...byArea].map(([area, inArea]) =>
        section(
          i18n.areaName(area, home),
          ...inArea.map((key) =>
            paintArea(
              h(
                'div',
                { class: 'off-row area' },
                iconBlob(areaIcon(area, home), { size: '2.5rem', animated: false }),
                h('span', { class: 'off-row__text t-body-l' }, i18n.questionText(key)),
                button(t('off.restore'), async () => {
                  await engine.restore(key);
                  render();
                }, { variant: 'tonal', className: 'off-row__restore' }),
              ),
              areaHue(area, home),
            ),
          ),
        ),
      ),
    );
  }

  await render();
  return box;
}

/**
 * A sheet with one choice checked: `options` are `{ value, label }`. Resolves `{ value }` with the one picked,
 * or null when closed without picking.
 */
async function pickOne(ctx, title, options, current) {
  let picked = null;
  const option = ({ value, label }) =>
    h('button', { type: 'button', class: 'choice', role: 'radio', 'aria-checked': String(current === value), onclick: () => ((picked = { value }), sheet.close()) }, h('span', { class: 't-title-m' }, label), current === value ? icon('ui_check') : null);
  const sheet = openSheet({ title, content: h('div', { class: 'choices', role: 'radiogroup' }, options.map(option)), closeLabel: ctx.i18n.t('scope.close') });
  await sheet.closed;
  return picked;
}

/** The app's language: the browser's, or one chosen (12.1). The app reloads in it. */
async function chooseLanguage(ctx) {
  const t = ctx.i18n.t;
  const options = [{ value: null, label: t('settings.languageSystem') }, ...LANGUAGES.map((lang) => ({ value: lang, label: t(`language.${lang}`) }))];
  const picked = await pickOne(ctx, t('settings.language'), options, ctx.settings.language);
  if (!picked || picked.value === ctx.settings.language) return;
  ctx.settings = await ctx.engine.updateSettings({ language: picked.value });
  location.reload();
}

/** The text key of a theme choice. */
export const themeKey = (theme) => ({ light: 'settings.themeLight', dark: 'settings.themeDark' })[theme] ?? 'settings.themeSystem';

/** Light, dark or the system's (5.2, 9.5): at once, without a reload. */
export async function setTheme(ctx, theme) {
  applyTheme(theme);
  ctx.settings = await ctx.engine.updateSettings({ theme });
}

async function chooseTheme(ctx) {
  const t = ctx.i18n.t;
  const picked = await pickOne(ctx, t('settings.theme'), THEMES.map((theme) => ({ value: theme, label: t(themeKey(theme)) })), ctx.settings.theme);
  if (!picked || picked.value === ctx.settings.theme) return;
  await setTheme(ctx, picked.value);
  ctx.router.refresh();
}

/** Installs through Chrome's window, or shows how to add the app where there is none (9.1). */
async function install(ctx) {
  const t = ctx.i18n.t;
  const way = installWay();
  if (way === 'prompt') {
    if (await promptInstall()) ctx.router.refresh();
    return;
  }
  openSheet({ title: t('install.title'), content: h('div', { class: 'install-sheet' }, h('p', { class: 't-body-m setup__text' }, t('install.text')), installInstructions(t, way)), closeLabel: t('install.close') });
}

/** Deletes everything after a question and goes back to the setup, at the rooms (10); language, theme and sound stay. */
async function startOver(ctx) {
  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const choice = await choose({
    title: t('reset.title'),
    body: [h('p', { class: 't-body-m' }, t('reset.text'))],
    safeLabel: t('reset.cancel'),
    otherLabel: t('reset.confirm'),
    otherTone: 'tone-no',
  });
  if (choice !== 'other') return;
  const keep = { language: ctx.settings.language, theme: ctx.settings.theme, sound: ctx.settings.sound };
  await engine.reset();
  ctx.settings = await engine.updateSettings({ ...keep, onboarding: 'rooms' });
  router.root('/setup/rooms');
}

/** The typeface's license, as shipped with the app. */
async function showFontLicense(ctx) {
  const t = ctx.i18n.t;
  const text = await fetch('assets/fonts/OFL.txt').then((r) => r.text()).catch(() => '');
  openSheet({ title: t('settings.font'), content: h('pre', { class: 'license' }, text), closeLabel: t('install.close') });
}
