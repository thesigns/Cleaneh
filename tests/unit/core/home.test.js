import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_COLORS,
  activeGroups,
  addRoom,
  areas,
  canRemove,
  changeKind,
  emptyHome,
  findRoom,
  groupArea,
  hasArea,
  isEnabled,
  nextColor,
  nextNumber,
  parseArea,
  recolorRoom,
  removeRoom,
  renameRoom,
  roomArea,
  withFeature,
} from '../../../src/core/home.js';

const rooms = (count, kind = 'ROOM') => Array.from({ length: count }).reduce((home) => addRoom(home, kind), emptyHome());

test('a new home is empty', () => {
  assert.deepEqual(areas(emptyHome()), []);
});

test('areas are written as text and read back', () => {
  assert.equal(roomArea(3), 'room#3');
  assert.equal(groupArea('LAUNDRY'), 'group#LAUNDRY');
  assert.deepEqual(parseArea('room#3'), { room: 3 });
  assert.deepEqual(parseArea('group#LAUNDRY'), { group: 'LAUNDRY' });
  assert.throws(() => parseArea('kitchen'));
});

test('rooms get stable ids and numbers within their kind', () => {
  const home = addRoom(addRoom(addRoom(emptyHome(), 'BEDROOM'), 'KITCHEN'), 'BEDROOM', { name: 'Gościnny' });
  assert.deepEqual(home.rooms.map((r) => r.id), [1, 2, 3]);
  assert.deepEqual(home.rooms.map((r) => r.number), [1, 1, 2]);
  assert.equal(findRoom(home, 3).name, 'Gościnny');
});

test('areas follow the kind order, then the order rooms were added, then groups', () => {
  let home = emptyHome();
  for (const kind of ['BEDROOM', 'KITCHEN', 'ENTRYWAY', 'BEDROOM']) home = addRoom(home, kind);
  home = withFeature(withFeature(home, 'CAR', true), 'LAUNDRY', true);
  assert.deepEqual(areas(home), ['room#3', 'room#2', 'room#1', 'room#4', 'group#LAUNDRY', 'group#CAR']);
});

test('the next number follows the rooms in use', () => {
  const home = removeRoom(rooms(3, 'BEDROOM'), 3);
  assert.equal(nextNumber(home, 'BEDROOM'), 3);
  assert.equal(nextNumber(home, 'KITCHEN'), 1);
});

test('blank names fall back to the default', () => {
  const home = addRoom(emptyHome(), 'ROOM', { name: '  ' });
  assert.equal(findRoom(home, 1).name, null);
  assert.equal(findRoom(renameRoom(home, 1, ' Salon '), 1).name, 'Salon');
  assert.equal(findRoom(renameRoom(renameRoom(home, 1, 'Salon'), 1, ''), 1).name, null);
});

test('changing the kind keeps the id and numbers the room within its new kind', () => {
  const home = changeKind(addRoom(addRoom(emptyHome(), 'ROOM'), 'BEDROOM'), 1, 'BEDROOM');
  assert.equal(findRoom(home, 1).kind, 'BEDROOM');
  assert.equal(findRoom(home, 1).number, 2);
  assert.equal(changeKind(home, 1, 'BEDROOM'), home);
  assert.throws(() => changeKind(home, 1, 'CASTLE'));
});

test('removed rooms stay for their history but leave the areas', () => {
  const home = removeRoom(addRoom(addRoom(emptyHome(), 'ROOM'), 'KITCHEN'), 1);
  assert.equal(findRoom(home, 1).removed, true);
  assert.equal(hasArea(home, roomArea(1)), false);
  assert.deepEqual(areas(home), ['room#2']);
  assert.equal(addRoom(home, 'ROOM').rooms.at(-1).id, 3, 'ids are never reused');
  assert.throws(() => renameRoom(home, 1, 'x'));
});

test('room colors go round in the order rooms are added', () => {
  assert.deepEqual(rooms(9).rooms.map((r) => r.color), [0, 1, 2, 3, 4, 5, 6, 0, 1]);
});

test('a new room takes the first color no room has', () => {
  const home = removeRoom(rooms(5), 2);
  assert.equal(nextColor(home), 1);
  assert.equal(findRoom(addRoom(home, 'KITCHEN'), 6).color, 1);
});

test('with every color taken the least used one comes next', () => {
  const home = addRoom(addRoom(rooms(7), 'ROOM', { color: 3 }), 'ROOM', { color: 0 });
  assert.equal(nextColor(home), 1);
});

test('a room keeps its color through kind and name changes, and can be recolored', () => {
  const home = addRoom(addRoom(emptyHome(), 'ROOM'), 'BEDROOM', { color: 5 });
  assert.equal(findRoom(home, 2).color, 5);
  const changed = renameRoom(changeKind(home, 2, 'STUDY'), 2, 'Pracownia');
  assert.equal(findRoom(changed, 2).color, 5);
  assert.equal(findRoom(recolorRoom(changed, 2, 2), 2).color, 2);
  assert.throws(() => recolorRoom(home, 1, ROOM_COLORS));
});

test('the last room cannot be removed', () => {
  const home = addRoom(emptyHome(), 'ROOM');
  assert.equal(canRemove(home, 1), false);
  assert.throws(() => removeRoom(home, 1));
});

test('a group needs its switch', () => {
  const home = addRoom(emptyHome(), 'ROOM');
  assert.equal(hasArea(home, groupArea('PETS')), false);
  assert.equal(hasArea(withFeature(home, 'PET', true), groupArea('PETS')), true);
});

test('a child switch counts only with its parent on, and keeps its state when the parent goes off', () => {
  const catOnly = withFeature(emptyHome(), 'CAT', true);
  assert.equal(isEnabled(catOnly, 'CAT'), false);
  const pets = withFeature(catOnly, 'PET', true);
  assert.equal(isEnabled(pets, 'CAT'), true);
  const petsOff = withFeature(pets, 'PET', false);
  assert.equal(isEnabled(petsOff, 'CAT'), false);
  assert.deepEqual(activeGroups(petsOff), []);
  assert.equal(isEnabled(withFeature(petsOff, 'PET', true), 'CAT'), true, 'the cat comes back with the pets');
  assert.equal(isEnabled(withFeature(emptyHome(), 'WASHING_MACHINE', true), 'WASHING_MACHINE'), false, 'a washing machine hangs under laundry');
});

test('switching a feature on twice keeps it once', () => {
  const home = withFeature(withFeature(emptyHome(), 'CAR', true), 'CAR', true);
  assert.deepEqual(home.features, ['CAR']);
});
