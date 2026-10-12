import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_CATALOG,
  GROUPS,
  ROOM_KINDS,
  SETS,
  createCatalog,
  inSeason,
  question,
  seasonWindowStart,
} from '../../../src/core/catalog.js';
import { generate, parse } from '../../../tools/generate-catalog.mjs';
import { ROOT } from '../../../tools/stamp-sw.mjs';

const questions = DEFAULT_CATALOG.questions;
const kind = (id) => ROOM_KINDS.find((k) => k.id === id);

test('generated catalog files are up to date (run `node tools/generate-catalog.mjs`)', async () => {
  const { files } = await generate();
  for (const [path, text] of Object.entries(files)) {
    assert.equal(await readFile(ROOT + path, 'utf8'), text, path);
  }
});

test('catalog has every question from the Markdown source', () => {
  assert.equal(questions.length, 247);
});

test('task times and intervals are within spec limits', () => {
  for (const q of questions) {
    assert.ok(q.minutes >= 2 && q.minutes <= 15, `${q.id}: ${q.minutes} min`);
    assert.ok(q.days >= 1, `${q.id}: ${q.days} days`);
  }
});

test('every question is in exactly one set or group', () => {
  for (const q of questions) assert.ok((q.set === null) !== (q.group === null), q.id);
});

test('every set has questions and belongs to a room kind', () => {
  for (const set of SETS) {
    assert.ok(DEFAULT_CATALOG.forSet(set).length > 0, `${set} has no questions`);
    assert.ok(ROOM_KINDS.some((k) => k.sets.includes(set)), `${set} is in no room kind`);
  }
});

test('every group has questions', () => {
  for (const group of GROUPS) assert.ok(DEFAULT_CATALOG.forGroup(group.id).length > 0, `${group.id} has no questions`);
});

test('a general room has every set of the other living rooms', () => {
  for (const id of ['LIVING_ROOM', 'BEDROOM', 'KIDS_ROOM', 'STUDY', 'WALK_IN_CLOSET']) {
    for (const set of kind(id).sets) assert.ok(kind('ROOM').sets.includes(set), `${id} has ${set}, a room lacks it`);
  }
});

test('questions of a room kind come from its sets, in catalog order', () => {
  const kitchen = DEFAULT_CATALOG.forKind('KITCHEN');
  assert.ok(kitchen.every((q) => q.set === 'KITCHEN' || q.set === 'DINING_TABLE'));
  assert.deepEqual(kitchen, questions.filter((q) => kitchen.includes(q)));
  assert.equal(DEFAULT_CATALOG.forKind('TERRACE'), DEFAULT_CATALOG.forKind('TERRACE'), 'cached');
});

test('season contains months in a plain range', () => {
  const season = [5, 9];
  assert.ok(inSeason(season, 5) && inSeason(season, 9));
  assert.ok(!inSeason(season, 4) && !inSeason(season, 10));
  assert.equal(seasonWindowStart(season, { year: 2026, month: 7, day: 15 }), '2026-05-01');
});

test('season wraps around the new year', () => {
  const winter = [12, 3];
  assert.ok(inSeason(winter, 12) && inSeason(winter, 2));
  assert.ok(!inSeason(winter, 11) && !inSeason(winter, 4));
  assert.equal(seasonWindowStart(winter, { year: 2026, month: 12, day: 20 }), '2026-12-01');
  assert.equal(seasonWindowStart(winter, { year: 2027, month: 2, day: 10 }), '2026-12-01');
});

test('a catalog rejects duplicates and questions without exactly one place', () => {
  assert.throws(() => createCatalog([question({ id: 'x', set: 'KITCHEN' }), question({ id: 'x', set: 'KITCHEN' })]));
  assert.throws(() => createCatalog([question({ id: 'x' })]));
  assert.throws(() => createCatalog([question({ id: 'x', set: 'KITCHEN', group: 'PETS' })]));
});

test('the generator reports mistakes in the catalog', () => {
  const minimal = (row) => `## Kuchnia\n\n| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n${row}\n`;
  assert.throws(() => parse(minimal('| x | Q? | Q? | Do | Do | 5 | 2 | H | — | nieznany |  | kuchnia |')), /unknown stage/);
  assert.throws(() => parse(minimal('| x | Q? | Q? | Do | Do | 5 | 2 | H | kosmos | start |  | kuchnia |')), /unknown requirement/);
  assert.throws(() => parse(minimal('| x | Q? | Q? |  | Do | 5 | 2 | H | — | start |  | kuchnia |')), /missing 'Zadanie PL'/);
});
