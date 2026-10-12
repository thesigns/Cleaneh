// The home (specification 7.5, 7.6): the user's rooms and the switches that are on.
// Plain, immutable data: every change returns a new home.

import { GROUPS, featureParent, groupOrder, groupSwitch, kindOrder } from './catalog.js';

/** How many room colors there are (specification 7.5, 13.1). */
export const ROOM_COLORS = 7;

/**
 * A room the user cleans. `id` never changes and is never reused; it also gives the order in which rooms were
 * added. `number` makes the default name ("Bedroom 2"); `name` is the user's own, shown as typed. `color` is the
 * room's own (0–6), not its kind's.
 * @typedef {object} Room
 * @property {number} id
 * @property {string} kind
 * @property {number} number
 * @property {string | null} name
 * @property {number} color
 * @property {boolean} removed removed rooms stay for their history
 */

/**
 * @typedef {object} Home
 * @property {Room[]} rooms also removed ones
 * @property {string[]} features switches that are on (a child also needs its parent on to count)
 */

/**
 * Where a question is asked: 'room#3' (a room by id) or 'group#LAUNDRY' (a group outside rooms).
 * @typedef {string} Area
 */

/** @returns {Home} */
export function emptyHome() {
  return { rooms: [], features: [] };
}

/** @returns {Area} */
export function roomArea(id) {
  return `room#${id}`;
}

/** @returns {Area} */
export function groupArea(group) {
  return `group#${group}`;
}

/** @returns {{ room: number } | { group: string }} */
export function parseArea(area) {
  const [type, value] = area.split('#');
  if (type === 'room') return { room: Number(value) };
  if (type === 'group') return { group: value };
  throw new Error(`Bad area ${area}`);
}

/** @returns {Room | undefined} */
export function findRoom(home, id) {
  return home.rooms.find((room) => room.id === id);
}

/** Rooms in use, in Sweep order: by kind, then in the order they were added. */
export function activeRooms(home) {
  return home.rooms
    .filter((room) => !room.removed)
    .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.id - b.id);
}

/**
 * A switch counts when it is on and so is its parent (specification 7.6). Turning a parent off keeps the
 * children's own state, so they come back as they were.
 */
export function isEnabled(home, feature) {
  if (!home.features.includes(feature)) return false;
  const parent = featureParent(feature);
  return parent === null || isEnabled(home, parent);
}

/** Groups switched on, in Sweep order. */
export function activeGroups(home) {
  return GROUPS.filter((group) => isEnabled(home, group.switch)).map((group) => group.id);
}

/** All areas in Sweep order: rooms, then groups. */
export function areas(home) {
  return [...activeRooms(home).map((room) => roomArea(room.id)), ...activeGroups(home).map(groupArea)];
}

/** Whether an area is part of the home now. */
export function hasArea(home, area) {
  const parsed = parseArea(area);
  if ('room' in parsed) return findRoom(home, parsed.room)?.removed === false;
  return groupOrder(parsed.group) >= 0 && isEnabled(home, groupSwitch(parsed.group));
}

export function withFeature(home, feature, on) {
  const rest = home.features.filter((f) => f !== feature);
  return { ...home, features: on ? [...rest, feature] : rest };
}

/** The id the next added room gets. */
export function nextRoomId(home) {
  return home.rooms.reduce((max, room) => Math.max(max, room.id), 0) + 1;
}

/** The number a room of this kind gets when added (or changed to it): one more than the highest in use. */
export function nextNumber(home, kind) {
  return activeRooms(home)
    .filter((room) => room.kind === kind)
    .reduce((max, room) => Math.max(max, room.number), 0) + 1;
}

/**
 * The color a new room gets (specification 7.5): the first one no room has; with all taken, the least used, the
 * first of them on a tie. Without removing rooms this goes round: the eighth room has the first color again.
 */
export function nextColor(home) {
  const used = new Array(ROOM_COLORS).fill(0);
  for (const room of activeRooms(home)) used[room.color] += 1;
  return used.indexOf(Math.min(...used));
}

/** Adds a room; without a name it is called like its kind, numbered after the others of that kind. */
export function addRoom(home, kind, { name = null, color = nextColor(home) } = {}) {
  if (kindOrder(kind) < 0) fail(`Unknown room kind ${kind}`);
  const room = { id: nextRoomId(home), kind, number: nextNumber(home, kind), name: clean(name), color: checked(color), removed: false };
  return { ...home, rooms: [...home.rooms, room] };
}

export function renameRoom(home, id, name) {
  return update(home, id, (room) => ({ ...room, name: clean(name) }));
}

export function recolorRoom(home, id, color) {
  return update(home, id, (room) => ({ ...room, color: checked(color) }));
}

/**
 * A new kind: questions both kinds share keep their state, the others stop (their state stays for a way back),
 * new ones start like in a new room (specification 7.5). The number follows the new kind.
 */
export function changeKind(home, id, kind) {
  if (kindOrder(kind) < 0) fail(`Unknown room kind ${kind}`);
  return update(home, id, (room) => (room.kind === kind ? room : { ...room, kind, number: nextNumber(home, kind) }));
}

/** At least one room stays (specification 7.5). */
export function canRemove(home, id) {
  return activeRooms(home).some((room) => room.id !== id);
}

/** Removes a room for good; its history stays. */
export function removeRoom(home, id) {
  if (!canRemove(home, id)) fail('The last room cannot be removed');
  return update(home, id, (room) => ({ ...room, removed: true }));
}

function update(home, id, change) {
  const room = findRoom(home, id);
  if (!room || room.removed) fail(`No room ${id}`);
  const changed = change(room);
  return changed === room ? home : { ...home, rooms: home.rooms.map((r) => (r.id === id ? changed : r)) };
}

function clean(name) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

function checked(color) {
  if (!Number.isInteger(color) || color < 0 || color >= ROOM_COLORS) fail(`No room color ${color}`);
  return color;
}

function fail(message) {
  throw new Error(message);
}
