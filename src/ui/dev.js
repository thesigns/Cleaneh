// Developer mode (specification 13.4): only on the development server (localhost) or with ?dev in the
// address, never in the real app. Its knobs (season month, theme, a pretend last cleaning) live in this
// browser's localStorage, outside the app's data; other tabs follow through the storage event.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const PREFIX = 'cleaneh.dev.';

/**
 * Whether this is the development version: 'local' on the development server, 'flag' with ?dev on any other
 * address (then the app uses a separate database), null in the real app.
 * @param {{ hostname: string, search: string }} where
 * @returns {'local' | 'flag' | null}
 */
export function devMode({ hostname, search }) {
  if (LOCAL_HOSTS.has(hostname)) return 'local';
  return new URLSearchParams(search).has('dev') ? 'flag' : null;
}

/**
 * The developer knobs: month 1–12 or null (real), theme 'light' | 'dark' | null (system), lastDone as
 * `{ choice, at }` (a pretend last DONE at `at` ms) or null (real).
 */
const prefs = { month: null, theme: null, lastDone: null };
const listeners = new Set();

function read(name) {
  try {
    const value = localStorage.getItem(PREFIX + name);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

/** Reads the knobs and starts following other tabs' changes. */
export function loadDevPrefs() {
  for (const name of Object.keys(prefs)) prefs[name] = read(name);
  addEventListener('storage', (event) => {
    const name = event.key?.startsWith(PREFIX) ? event.key.slice(PREFIX.length) : null;
    if (name === null || !(name in prefs)) return;
    prefs[name] = read(name);
    if (name === 'theme') applyTheme(prefs.theme);
    for (const listener of listeners) listener(name);
  });
  applyTheme(prefs.theme);
}

export const devPref = (name) => prefs[name];

export function setDevPref(name, value) {
  prefs[name] = value;
  try {
    if (value === null) localStorage.removeItem(PREFIX + name);
    else localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    // Without storage the knob still works until the page reloads.
  }
  if (name === 'theme') applyTheme(value);
  for (const listener of listeners) listener(name);
}

/** Calls `listener(name)` when a knob changes here or in another tab. Returns a function that stops it. */
export function onDevPref(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The theme on <html>: data-theme overrides the system's (theme.css). */
export function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
