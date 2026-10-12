// Languages (specification 12): English (the fallback) and Polish. Texts come
// from en.js / pl.js and, for questions and names, from the generated
// catalog-en.js / catalog-pl.js.

import { findRoom, parseArea } from '../../core/home.js';
import catalogEn from './catalog-en.js';
import catalogPl from './catalog-pl.js';
import en from './en.js';
import pl from './pl.js';

export const LANGUAGES = ['en', 'pl'];
const TEXTS = { en, pl };
const CATALOG = { en: catalogEn, pl: catalogPl };

/** The first supported language among the browser's, or English. */
export function detectLanguage(preferred = globalThis.navigator?.languages ?? []) {
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LANGUAGES.includes(base)) return base;
  }
  return 'en';
}

/** 'kitchen_counter_clean@room#2' or 'kitchen_counter_clean' -> 'kitchen_counter_clean'. */
function questionId(keyOrId) {
  return keyOrId.split('@')[0];
}

/** Placeholders in a text: '{count} questions' -> ['count']. */
export function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

/** Texts and names in one language. */
export function createI18n(lang) {
  if (!LANGUAGES.includes(lang)) throw new Error(`Unsupported language ${lang}`);
  const texts = TEXTS[lang];
  const catalog = CATALOG[lang];
  const plurals = new Intl.PluralRules(lang);

  function fill(text, params) {
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }

  /** A text by key; plurals pick their form by `params.count`. */
  function t(key, params = {}) {
    const value = texts[key];
    if (value === undefined) {
      console.error(`Missing text ${key} (${lang})`);
      return key;
    }
    if (typeof value === 'string') return fill(value, params);
    return fill(value[plurals.select(params.count)] ?? value.other, params);
  }

  const kindName = (kind) => catalog.roomKinds[kind] ?? kind;
  const groupName = (group) => t(`group.${group}`);

  /** A room's own name, or its kind numbered after the first: "Bedroom", "Bedroom 2" (7.5). */
  function roomName(room) {
    if (room.name) return room.name;
    const base = kindName(room.kind);
    return room.number <= 1 ? base : t('area.numbered', { name: base, number: room.number });
  }

  /** Name of an area: a room's (see roomName) or a group's. */
  function areaName(area, home) {
    const parsed = parseArea(area);
    if ('group' in parsed) return groupName(parsed.group);
    const room = findRoom(home, parsed.room);
    return room ? roomName(room) : kindName('ROOM');
  }

  return {
    lang,
    t,
    kindName,
    groupName,
    roomName,
    areaName,
    featureName: (feature) => catalog.features[feature] ?? feature,
    /** The question of an instance or question id, without the room's name (7.5). */
    questionText: (keyOrId) => catalog.questions[questionId(keyOrId)]?.[0] ?? keyOrId,
    /** The task as a command, e.g. "Take out the trash". */
    taskText: (keyOrId) => catalog.questions[questionId(keyOrId)]?.[1] ?? keyOrId,
    /** Sorts names the way the language does (Polish letters in their place). */
    collator: new Intl.Collator(lang),
  };
}
