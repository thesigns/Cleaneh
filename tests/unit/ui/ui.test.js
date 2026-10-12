import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FEATURES, QUESTIONS, ROOM_KINDS } from '../../../src/core/catalog-data.js';
import { addRoom, emptyHome, groupArea, renameRoom, roomArea } from '../../../src/core/home.js';
import { GROUP_HUES, ROOM_HUES, areaHue, areaIcon, hueVars } from '../../../src/ui/areas.js';
import { blobPath } from '../../../src/ui/blob.js';
import catalogEn from '../../../src/ui/i18n/catalog-en.js';
import catalogPl from '../../../src/ui/i18n/catalog-pl.js';
import en from '../../../src/ui/i18n/en.js';
import { LANGUAGES, createI18n, detectLanguage, placeholders } from '../../../src/ui/i18n/index.js';
import pl from '../../../src/ui/i18n/pl.js';
import { SPRITE, sprite } from '../../../tools/icon-sprite.mjs';
import { ROOT } from '../../../tools/stamp-sw.mjs';

const TEXTS = { en, pl };
const forms = (value) => (typeof value === 'string' ? [value] : Object.values(value));

test('both languages have the same keys with the same parameters', () => {
  assert.deepEqual(Object.keys(pl).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    const expected = placeholders(forms(en[key]).join(' ')).filter((p, i, all) => all.indexOf(p) === i);
    for (const lang of LANGUAGES) {
      for (const form of forms(TEXTS[lang][key])) assert.deepEqual([...new Set(placeholders(form))], expected, `${lang} ${key}: "${form}"`);
    }
  }
});

test('plurals have every form the language needs', () => {
  for (const lang of LANGUAGES) {
    const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    for (const [key, value] of Object.entries(TEXTS[lang])) {
      if (typeof value === 'string') continue;
      assert.deepEqual(Object.keys(value).sort(), [...categories].sort(), `${lang} ${key}`);
    }
  }
});

test('Polish counts use the right forms', () => {
  const t = createI18n('pl').t;
  assert.equal(t('move.questions', { count: 1 }), '1 pytanie');
  assert.equal(t('move.questions', { count: 3 }), '3 pytania');
  assert.equal(t('move.questions', { count: 5 }), '5 pytań');
  assert.equal(t('move.questions', { count: 22 }), '22 pytania');
  assert.equal(t('move.questions', { count: 12 }), '12 pytań');
  assert.equal(createI18n('en').t('move.questions', { count: 1 }), '1 question');
});

test('Polish texts avoid gendered past forms (12.3)', () => {
  const texts = [...Object.values(pl).flatMap(forms), ...Object.values(catalogPl.questions).flat()];
  for (const text of texts) assert.doesNotMatch(text, /\p{L}+(łeś|łaś|łem|łam|łbyś|łabyś)\b/u, text);
});

test('the catalog texts cover every question, room kind and switch in both languages', () => {
  for (const catalog of [catalogEn, catalogPl]) {
    assert.deepEqual(Object.keys(catalog.questions), QUESTIONS.map((q) => q.id));
    assert.deepEqual(Object.keys(catalog.roomKinds), ROOM_KINDS.map((k) => k.id));
    assert.deepEqual(Object.keys(catalog.features), FEATURES.map((f) => f.id));
  }
});

test('the language comes from the browser, English when none fits', () => {
  assert.equal(detectLanguage(['pl-PL', 'en']), 'pl');
  assert.equal(detectLanguage(['de-DE', 'en-GB']), 'en');
  assert.equal(detectLanguage(['de', 'fr']), 'en');
  assert.equal(detectLanguage([]), 'en');
});

test('rooms are called by their own name or their numbered kind; groups by their name', () => {
  let home = addRoom(addRoom(addRoom(emptyHome(), 'BEDROOM'), 'BEDROOM'), 'KITCHEN');
  home = renameRoom(home, 3, 'Kuchnia u babci');
  const pl = createI18n('pl');
  assert.equal(pl.areaName(roomArea(1), home), 'Sypialnia');
  assert.equal(pl.areaName(roomArea(2), home), 'Sypialnia 2');
  assert.equal(pl.areaName(roomArea(3), home), 'Kuchnia u babci');
  assert.equal(createI18n('en').areaName(roomArea(3), home), 'Kuchnia u babci', 'a name the user typed is not translated');
  assert.equal(createI18n('en').areaName(roomArea(2), home), 'Bedroom 2');
  assert.equal(pl.areaName(groupArea('PETS'), home), 'Zwierzęta');
  assert.equal(pl.questionText(`kitchen_counter_clean@${roomArea(3)}`), 'Czy blat jest czysty?');
  assert.equal(pl.taskText('kitchen_counter_clean'), 'Przetrzyj blat');
});

test('names sort the way the language does', () => {
  const names = ['Łazienka', 'Salon', 'Garaż', 'Ogródek'];
  assert.deepEqual([...names].sort(createI18n('pl').collator.compare), ['Garaż', 'Łazienka', 'Ogródek', 'Salon']);
});

test('the icon sprite is up to date (run `node tools/icon-sprite.mjs`)', async () => {
  assert.equal(await readFile(ROOT + SPRITE, 'utf8'), await sprite());
});

test('every room kind and group has an icon in the sprite', async () => {
  const text = await readFile(ROOT + SPRITE, 'utf8');
  const home = ROOM_KINDS.reduce((h, kind) => addRoom(h, kind.id), emptyHome());
  for (const room of home.rooms) assert.match(text, new RegExp(`id="${areaIcon(roomArea(room.id), home)}"`), room.kind);
  for (const group of Object.keys(GROUP_HUES)) assert.match(text, new RegExp(`id="${areaIcon(groupArea(group), home)}"`), group);
});

test('area colors follow the formulas of 13.1', () => {
  const blue = hueVars(ROOM_HUES[0]); // 210, 0.62, fill 0.5
  assert.equal(blue['--area-l'], 'hsl(210 55.8% 36%)');
  assert.equal(blue['--area-container-l'], 'hsl(210 62% 90%)');
  assert.equal(blue['--area-d'], 'hsl(210 72% 76%)');
  assert.equal(blue['--area-container-d'], 'hsl(210 31% 22%)');
  assert.equal(blue['--area-fill-top-l'], 'hsl(210 62% 50%)');
  assert.equal(blue['--area-fill-bottom-l'], 'hsl(210 62% 38%)');
  assert.equal(blue['--area-fill-top-d'], 'hsl(210 46.5% 42%)');
  assert.equal(blue['--area-fill-bottom-d'], 'hsl(210 43.4% 32%)');
  const home = addRoom(addRoom(emptyHome(), 'ROOM'), 'ROOM', { color: 6 });
  assert.equal(areaHue(roomArea(2), home), ROOM_HUES[6]);
  assert.equal(areaHue(groupArea('CAR'), home), GROUP_HUES.CAR);
});

test('a blob is a closed smooth curve inside its box', () => {
  const d = blobPath(100, 100, 1.3, 0.09);
  assert.match(d, /^M[\d.]+ [\d.]+(C[\d. ]+){8}Z$/);
  for (const n of d.match(/[\d.]+/g).map(Number)) assert.ok(n >= 0 && n <= 100, `${n} outside the box`);
});

test('the home screen line: today first, then the last cleaning without minutes (5.1)', async () => {
  const { pastLine, stopwatchText } = await import('../../../src/ui/screens/home.js');
  const pl = createI18n('pl');
  const none = { tasks: 0, taskTimeMs: 0 };
  assert.equal(pastLine(pl, none, { kind: 'never' }), null);
  assert.equal(pastLine(pl, none, { kind: 'just-now' }).text, 'Ostatnie sprzątanie: przed chwilą');
  assert.equal(pastLine(pl, none, { kind: 'hours', hours: 1 }).text, 'Ostatnie sprzątanie: 1 godzinę temu');
  assert.equal(pastLine(pl, none, { kind: 'hours', hours: 5 }).text, 'Ostatnie sprzątanie: 5 godzin temu');
  assert.equal(pastLine(pl, none, { kind: 'hours', hours: 22 }).text, 'Ostatnie sprzątanie: 22 godziny temu');
  assert.equal(pastLine(pl, none, { kind: 'days', days: 1, hours: 23 }).text, 'Ostatnie sprzątanie: 1 dzień i 23 godziny temu');
  assert.equal(pastLine(pl, none, { kind: 'days', days: 3, hours: 0 }).text, 'Ostatnie sprzątanie: 3 dni temu');
  assert.equal(pastLine(pl, none, { kind: 'long' }).text, 'Miło znowu widzieć. Zacznijmy od czegoś małego.');
  assert.equal(pastLine(pl, { tasks: 2, taskTimeMs: 13 * 60_000 + 5000 }, { kind: 'just-now' }).text, 'Dziś: 2 zadania · 14 min');
  assert.equal(pastLine(createI18n('en'), none, { kind: 'days', days: 2, hours: 1 }).text, 'Last cleaning: 2 days and 1 hour ago');
  assert.equal(stopwatchText(247), '4:07');
  assert.equal(stopwatchText(3735), '1:02:15');
  assert.equal(stopwatchText(-3), '0:00');
});

test('the reward jingle: 1.25 s, peak at 80%, fading to silence at the end', async () => {
  const { synthesize } = await import('../../../src/ui/sound.js');
  const samples = synthesize(44_100);
  assert.equal(samples.length, Math.floor(44_100 * 1.25));
  const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  assert.ok(Math.abs(peak - 0.8) < 1e-6, `peak ${peak}`);
  assert.equal(samples.at(-1), 0);
});
