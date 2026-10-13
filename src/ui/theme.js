// The light or dark theme (specification 9.5): the system's, or the one chosen in Settings (5.2).
// data-theme on <html> overrides the system's in theme.css. The setting lives in the app's settings; a copy
// in localStorage lets theme-early.js put it on the page before anything shows, and other tabs follow it.

/** The choices: null follows the system. */
export const THEMES = [null, 'light', 'dark'];

let key = 'cleaneh.theme';

/** Puts `theme` on the page, the status bar's color too. */
function show(theme) {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.dataset.scheme;
    meta.media = !theme ? `(prefers-color-scheme: ${scheme})` : theme === scheme ? 'all' : 'not all';
  }
}

/**
 * Shows the theme from the settings at start and follows changes made in other tabs (`onChange(theme)`).
 * `name` is the database's: its theme copy has its own key, as in theme-early.js.
 */
export function startTheme(name, theme, onChange) {
  key = `${name}.theme`;
  applyTheme(theme);
  addEventListener('storage', (event) => {
    if (event.key !== key) return;
    const changed = THEMES.includes(event.newValue) ? event.newValue : null;
    show(changed);
    onChange(changed);
  });
}

/** Shows `theme` and keeps the copy for the next start and the other tabs. */
export function applyTheme(theme) {
  show(theme);
  try {
    if (theme) localStorage.setItem(key, theme);
    else localStorage.removeItem(key);
  } catch {
    // Without storage the next start shows the system's theme for a moment.
  }
}
