// The theme chosen in Settings, on the page before anything shows (specification 9.5): the settings come
// from IndexedDB only later, so theme.js keeps a copy in localStorage. A classic script, loaded from
// index.html without defer. The key follows the database: with ?dev off the development server the app
// has a database of its own (13.4), and so a theme of its own.
try {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const name = !local && new URLSearchParams(location.search).has('dev') ? 'cleaneh-dev' : 'cleaneh';
  const theme = localStorage.getItem(`${name}.theme`);
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.media = meta.dataset.scheme === theme ? 'all' : 'not all';
  }
} catch {
  // Without storage the system's theme shows until the settings are read.
}
