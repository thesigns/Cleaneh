// Writes the list of app files and a hash of their contents into sw.js.
//
//   node tools/stamp-sw.mjs
//
// The app has no build step, so this is how a change to any app file becomes
// a new version of the service worker cache (specification 9.2). A unit test
// fails when sw.js is not up to date.

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Files and directories that make up the app, relative to the repository root. */
const APP_FILES = ['index.html', 'manifest.webmanifest'];
const APP_DIRS = ['src', 'assets'];

const STAMP = /\/\/ <stamp>\n[\s\S]*?\/\/ <\/stamp>\n/;

async function listDir(dir) {
  const entries = await readdir(ROOT + dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => `${entry.parentPath.slice(ROOT.length)}/${entry.name}`.replaceAll('\\', '/'));
}

/** All app files, sorted, as paths relative to the repository root. */
export async function appFiles() {
  const nested = await Promise.all(APP_DIRS.map(listDir));
  return [...APP_FILES, ...nested.flat()].sort();
}

/** The stamp block for the current app files. */
export async function stampBlock() {
  const files = await appFiles();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file).update('\0').update(await readFile(ROOT + file)).update('\0');
  }
  const version = hash.digest('hex').slice(0, 12);
  const list = files.map((file) => `  '${file}',`).join('\n');
  return `// <stamp>\nconst VERSION = '${version}';\nconst FILES = [\n${list}\n];\n// </stamp>\n`;
}

/** sw.js with the stamp block replaced by the current one. */
export async function stampedServiceWorker() {
  const source = await readFile(ROOT + 'sw.js', 'utf8');
  if (!STAMP.test(source)) throw new Error('sw.js has no // <stamp> … // </stamp> block');
  const block = await stampBlock();
  return source.replace(STAMP, () => block);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const before = await readFile(ROOT + 'sw.js', 'utf8');
  const after = await stampedServiceWorker();
  if (after === before) {
    console.log('sw.js is up to date');
  } else {
    await writeFile(ROOT + 'sw.js', after);
    console.log(`sw.js stamped: ${after.match(/VERSION = '(\w+)'/)[1]}`);
  }
}
