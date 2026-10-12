import { test } from 'node:test';
import assert from 'node:assert/strict';
import { householdChanges, isEmpty } from '../../../src/data/changes.js';
import { MIGRATIONS, SCHEMA_VERSION, migrationSteps } from '../../../src/data/schema.js';
import { createLock } from '../../../src/engine/lock.js';
import { addRoom, emptyHome, recolorRoom, withFeature } from '../../../src/core/home.js';

test('every schema version up to the current one has a migration', () => {
  assert.equal(migrationSteps(0, SCHEMA_VERSION).length, SCHEMA_VERSION);
  for (let version = 1; version <= SCHEMA_VERSION; version++) assert.equal(typeof MIGRATIONS[version], 'function', `version ${version}`);
});

test('migrations run in order from the stored version', () => {
  const calls = [];
  const migrations = { 1: () => calls.push(1), 2: () => calls.push(2), 3: () => calls.push(3) };
  for (const step of migrationSteps(1, 3, migrations)) step();
  assert.deepEqual(calls, [2, 3]);
  assert.deepEqual(migrationSteps(3, 3, migrations), []);
});

test('a missing migration fails instead of skipping', () => {
  assert.throws(() => migrationSteps(1, 3, { 1() {}, 3() {} }), /No migration to schema version 2/);
});

test('data from a newer version of the app is refused', () => {
  assert.throws(() => migrationSteps(3, 2, MIGRATIONS), /newer version/);
});

test('only what changed is written', () => {
  const home = withFeature(addRoom(addRoom(emptyHome(), 'KITCHEN'), 'ROOM'), 'CAR', true);
  const kept = { interval: 2 };
  const before = { home, instances: { 'a@room#1': kept, 'b@room#1': { interval: 3 }, 'gone@room#2': { interval: 1 } } };
  assert.ok(isEmpty(householdChanges(before, before)));

  const recolored = recolorRoom(home, 2, 5);
  const after = { home: recolored, instances: { 'a@room#1': kept, 'b@room#1': { interval: 4 }, 'new@room#2': { interval: 7 } } };
  const changes = householdChanges(before, after);
  assert.deepEqual(changes.rooms.map((room) => room.id), [2]);
  assert.equal(changes.features, null);
  assert.deepEqual(changes.instances.map(([key]) => key), ['b@room#1', 'new@room#2']);
  assert.deepEqual(changes.removed, ['gone@room#2']);

  const switched = householdChanges(before, { ...before, home: withFeature(home, 'PET', true) });
  assert.deepEqual(switched.features, ['CAR', 'PET']);
  assert.equal(householdChanges(before, { ...before, home: { ...home, features: [...home.features] } }).features, null, 'same switches');
});

test('without Web Locks the queue still runs one at a time, also after a failure', async () => {
  const lock = createLock('test', null);
  const order = [];
  const slow = lock.run(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    order.push('slow');
    throw new Error('boom');
  });
  const fast = lock.run(async () => order.push('fast'));
  await assert.rejects(slow, /boom/);
  await fast;
  assert.deepEqual(order, ['slow', 'fast']);
});
