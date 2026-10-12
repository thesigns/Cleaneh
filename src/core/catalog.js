// The question catalog (specification 7): questions, sets, room kinds, groups,
// switches and stages. The data comes from catalog-data.js, generated from
// docs/cleaneh-questions.md.

import { FEATURES, GROUPS, QUESTIONS, ROOM_KINDS, SETS } from './catalog-data.js';
import { isoDate } from './time.js';

export { FEATURES, GROUPS, ROOM_KINDS, SETS };

/**
 * @typedef {'NORMAL' | 'HYGIENE'} Priority
 * @typedef {'START' | 'TIDY' | 'DUST' | 'WIPE' | 'FLOOR_DRY' | 'FLOOR_WET' | 'FINISH'} Stage
 * @typedef {[number, number]} Season inclusive months [from, to]; may wrap around the new year
 */

/**
 * @typedef {object} Question
 * @property {string} id stable, language independent, e.g. 'kitchen_counter_clean'
 * @property {number} minutes estimated task time
 * @property {number} days base interval
 * @property {Priority} priority
 * @property {Stage} stage order in a big clean
 * @property {string | null} requires switch the question needs
 * @property {Season | null} season months in which it is active
 * @property {boolean} firstSweep asked in the first Sweep (★)
 * @property {string | null} set set of a room question
 * @property {string | null} group group of a question outside rooms
 */

/** Weight of a priority in the draw (specification 8.2). */
export const PRIORITY_WEIGHT = { NORMAL: 1, HYGIENE: 3 };

/**
 * Stages of a big clean in order (specification 4.4): background work first, then in each room top to bottom
 * and dry before wet, taking things out last.
 */
export const STAGES = ['START', 'TIDY', 'DUST', 'WIPE', 'FLOOR_DRY', 'FLOOR_WET', 'FINISH'];

const FEATURE_BY_ID = new Map(FEATURES.map((feature) => [feature.id, feature]));
const KIND_BY_ID = new Map(ROOM_KINDS.map((kind) => [kind.id, kind]));
const GROUP_BY_ID = new Map(GROUPS.map((group) => [group.id, group]));

/** A switch's parent, or null. */
export function featureParent(id) {
  return FEATURE_BY_ID.get(id)?.parent ?? null;
}

/** Sets of a room kind. */
export function kindSets(kind) {
  const found = KIND_BY_ID.get(kind);
  if (!found) throw new Error(`Unknown room kind ${kind}`);
  return found.sets;
}

/** Position of a room kind in the Sweep order. */
export function kindOrder(kind) {
  return ROOM_KINDS.findIndex((k) => k.id === kind);
}

/** The switch of a group. */
export function groupSwitch(group) {
  const found = GROUP_BY_ID.get(group);
  if (!found) throw new Error(`Unknown group ${group}`);
  return found.switch;
}

/** Position of a group in the Sweep order. */
export function groupOrder(group) {
  return GROUPS.findIndex((g) => g.id === group);
}

/** Whether a month (1–12) is in a season. */
export function inSeason(season, month) {
  const [from, to] = season;
  return from <= to ? month >= from && month <= to : month >= from || month <= to;
}

/** First day ('YYYY-MM-DD') of the season window that contains a local date. Only meaningful in season. */
export function seasonWindowStart(season, date) {
  const [from, to] = season;
  const year = from <= to || date.month >= from ? date.year : date.year - 1;
  return isoDate({ year, month: from, day: 1 });
}

/**
 * A catalog of questions with lookups by id, set, group and room kind.
 * @param {Question[]} questions
 */
export function createCatalog(questions) {
  const byId = new Map();
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`Duplicate question id ${q.id}`);
    if ((q.set === null) === (q.group === null)) throw new Error(`${q.id}: needs exactly one of set and group`);
    byId.set(q.id, q);
  }
  const forKindCache = new Map();
  return {
    questions,
    /** @returns {Question | undefined} */
    get: (id) => byId.get(id),
    forSet: (set) => questions.filter((q) => q.set === set),
    forGroup: (group) => questions.filter((q) => q.group === group),
    /** Questions of a room of this kind, in catalog order. */
    forKind(kind) {
      if (!forKindCache.has(kind)) {
        const sets = kindSets(kind);
        forKindCache.set(kind, questions.filter((q) => q.set !== null && sets.includes(q.set)));
      }
      return forKindCache.get(kind);
    },
  };
}

/**
 * A question with defaults for the fields tests usually leave out.
 * @param {Partial<Question> & { id: string }} fields
 * @returns {Question}
 */
export function question(fields) {
  return {
    minutes: 5,
    days: 7,
    priority: 'NORMAL',
    stage: 'WIPE',
    requires: null,
    season: null,
    firstSweep: false,
    set: null,
    group: null,
    ...fields,
  };
}

/** The full catalog from docs/cleaneh-questions.md. */
export const DEFAULT_CATALOG = createCatalog(QUESTIONS);
