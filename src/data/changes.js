// What changed between two households, so a commit writes only that.
// Core keeps unchanged rooms and instance states as the same objects, so
// comparing references is enough.

/**
 * @param {import('../core/scheduler.js').Household} before as loaded
 * @param {import('../core/scheduler.js').Household} after
 */
export function householdChanges(before, after) {
  const beforeRooms = new Map(before.home.rooms.map((room) => [room.id, room]));
  const rooms = after.home.rooms.filter((room) => beforeRooms.get(room.id) !== room);
  const features = sameList(before.home.features, after.home.features) ? null : [...after.home.features];
  const instances = Object.entries(after.instances).filter(([key, state]) => before.instances[key] !== state);
  const removed = Object.keys(before.instances).filter((key) => !(key in after.instances));
  return { rooms, features, instances, removed };
}

/** Whether nothing changed. */
export function isEmpty({ rooms, features, instances, removed }) {
  return rooms.length === 0 && features === null && instances.length === 0 && removed.length === 0;
}

function sameList(a, b) {
  return a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
}
