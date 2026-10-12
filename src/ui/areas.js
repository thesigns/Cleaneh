// How an area looks (specification 7.5, 13.1): its color, its icon and a
// stable seed for its blob shapes.

import { GROUPS } from '../core/catalog.js';
import { findRoom, parseArea } from '../core/home.js';

/** Room colors in the order new rooms get them, neighbors far apart: hue, saturation, fill lightness. */
export const ROOM_HUES = [
  { name: 'blue', h: 210, s: 0.62, f: 0.5 },
  { name: 'coral', h: 4, s: 0.62, f: 0.54 },
  { name: 'green', h: 142, s: 0.42, f: 0.4 },
  { name: 'amber', h: 34, s: 0.78, f: 0.46 },
  { name: 'violet', h: 266, s: 0.46, f: 0.56 },
  { name: 'teal', h: 180, s: 0.55, f: 0.36 },
  { name: 'pink', h: 326, s: 0.5, f: 0.52 },
];

/** Each group has its own hue. */
export const GROUP_HUES = {
  LAUNDRY: { h: 210, s: 0.6, f: 0.5 },
  ELECTRONICS: { h: 235, s: 0.5, f: 0.5 },
  CLEANING_GEAR: { h: 170, s: 0.55, f: 0.5 },
  AIR: { h: 185, s: 0.6, f: 0.5 },
  CAR: { h: 5, s: 0.65, f: 0.5 },
  CHILD: { h: 46, s: 0.85, f: 0.5 },
  PETS: { h: 25, s: 0.5, f: 0.5 },
};

const KIND_ICONS = {
  ENTRYWAY: 'area_hall',
  HALLWAY: 'area_hallway',
  KITCHEN: 'area_kitchen',
  PANTRY: 'area_pantry',
  DINING_ROOM: 'area_dining_room',
  LIVING_ROOM: 'area_living_room',
  ROOM: 'area_room',
  BEDROOM: 'area_bedroom',
  KIDS_ROOM: 'area_kids_room',
  STUDY: 'area_study',
  WALK_IN_CLOSET: 'area_walk_in_closet',
  BATHROOM: 'area_bathroom',
  TOILET: 'area_wc',
  LAUNDRY_ROOM: 'area_laundry_room',
  STAIRS: 'area_stairs',
  STORAGE: 'area_storage',
  BASEMENT: 'area_basement',
  ATTIC: 'area_attic',
  BALCONY: 'area_balcony',
  TERRACE: 'area_terrace',
  GARAGE: 'area_garage',
  GARDEN: 'area_garden',
};

const GROUP_ICONS = {
  LAUNDRY: 'area_laundry',
  ELECTRONICS: 'area_electronics',
  CLEANING_GEAR: 'area_cleaning',
  AIR: 'area_air',
  CAR: 'area_car',
  CHILD: 'area_child',
  PETS: 'area_pets',
};

/** Icon of a room kind. */
export function kindIcon(kind) {
  return KIND_ICONS[kind] ?? KIND_ICONS.ROOM;
}

/** Icon of an area: by the room's kind, or the group's. */
export function areaIcon(area, home) {
  const parsed = parseArea(area);
  if ('group' in parsed) return GROUP_ICONS[parsed.group];
  return kindIcon(findRoom(home, parsed.room)?.kind);
}

/** Hue of an area: the room's own color, or the group's. */
export function areaHue(area, home) {
  const parsed = parseArea(area);
  if ('group' in parsed) return GROUP_HUES[parsed.group];
  return ROOM_HUES[(findRoom(home, parsed.room)?.color ?? 0) % ROOM_HUES.length];
}

/** A stable number per area, so its blob always has the same shape. */
export function areaSeed(area) {
  const parsed = parseArea(area);
  return 'room' in parsed ? parsed.room : 100 + GROUPS.findIndex((g) => g.id === parsed.group);
}

const hsl = (h, s, l) => `hsl(${h} ${Math.round(Math.min(s, 1) * 1000) / 10}% ${Math.round(l * 1000) / 10}%)`;

/**
 * CSS custom properties of a hue for both themes (13.1). The stylesheet picks the light or dark ones as
 * --area, --area-container, --on-area, --area-fill-top, --area-fill-bottom.
 */
export function hueVars({ h, s, f }) {
  return {
    '--area-l': hsl(h, 0.9 * s, 0.36),
    '--area-container-l': hsl(h, s, 0.9),
    '--on-area-l': '#ffffff',
    '--area-fill-top-l': hsl(h, s, f),
    '--area-fill-bottom-l': hsl(h, s, f - 0.12),
    '--area-d': hsl(h, s + 0.1, 0.76),
    '--area-container-d': hsl(h, 0.5 * s, 0.22),
    '--on-area-d': hsl(h, 0.3, 0.12),
    '--area-fill-top-d': hsl(h, 0.75 * s, f - 0.08),
    '--area-fill-bottom-d': hsl(h, 0.7 * s, f - 0.18),
  };
}

/** Sets an area's colors on an element; it and its children can then use var(--area) and the rest. */
export function paintArea(element, hue) {
  for (const [name, value] of Object.entries(hueVars(hue))) element.style.setProperty(name, value);
  return element;
}
