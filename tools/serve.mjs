// Local static file server for development. No dependencies.
//
//   node tools/serve.mjs [--port 8080] [--host 127.0.0.1] [--base /Cleaneh/]
//
// Serves the repository root, so the app is at http://localhost:8080/.
// `--base` serves it under a subpath instead, like GitHub Pages does.
// `--host 0.0.0.0` makes it reachable from a phone on the same network, but
// the service worker, installation and persistent storage need HTTPS or
// localhost, so on a phone they only work on a deployed preview.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const port = Number(option('port', process.env.PORT ?? 8080));
const host = option('host', '127.0.0.1');
const base = `/${option('base', '/')}/`.replace(/\/+/g, '/');

/** Maps a request path to a file inside ROOT, or null when it escapes ROOT. */
function fileFor(urlPath) {
  let path;
  try {
    path = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const file = normalize(join(ROOT, path));
  return file === ROOT || file.startsWith(ROOT + sep) ? file : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === base.slice(0, -1) || (url.pathname === '/' && base !== '/')) {
    res.writeHead(302, { Location: base }).end();
    return;
  }
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  let file = fileFor(url.pathname.slice(base.length - 1));
  if (!file) {
    res.writeHead(400).end();
    return;
  }
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': info.size,
      // Always revalidate, so a reload shows the current files.
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      createReadStream(file).pipe(res);
    }
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(port, host, () => {
  const shown = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`Cleaneh dev server: http://${shown}:${port}${base}`);
});
