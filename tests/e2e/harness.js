// App modules for tests in a real browser, as window.T.

import * as home from '../../src/core/home.js';
import { IDLE } from '../../src/core/loop.js';
import { seededRandom } from '../../src/core/random.js';
import { createScheduler, instanceKey } from '../../src/core/scheduler.js';
import { DAY_MS, MINUTE_MS, fixedZone } from '../../src/core/time.js';
import { MIGRATIONS, SCHEMA_VERSION } from '../../src/data/schema.js';
import { DEFAULT_SETTINGS, openStore } from '../../src/data/store.js';
import { createEngine } from '../../src/engine/engine.js';
import { createLock } from '../../src/engine/lock.js';

const T0 = Date.parse('2026-07-01T08:00:00Z');
const zone = fixedZone(0);

/** A clock the test moves by hand. */
function testClock(start = T0) {
  return {
    t: start,
    now() {
      return this.t;
    },
    advance(ms) {
      this.t += ms;
    },
  };
}

/** A store, a scheduler on the full catalog and an engine with a test clock. */
async function engineFor({ name, start = T0, seed = 1 } = {}) {
  const store = await openStore(name ? { name } : {});
  const clock = testClock(start);
  const scheduler = createScheduler({ zone });
  const engine = createEngine({ store, scheduler, zone, clock, random: seededRandom(seed) });
  return { store, clock, scheduler, engine };
}

window.T = {
  T0,
  DAY_MS,
  MINUTE_MS,
  IDLE,
  DEFAULT_SETTINGS,
  MIGRATIONS,
  SCHEMA_VERSION,
  home,
  instanceKey,
  openStore,
  createLock,
  engineFor,
  testClock,
};
