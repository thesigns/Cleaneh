// Specification 13.2: tens of days of use on the full catalog, for several
// profiles of using Cleaneh, to check the pool stays under control.
//
// The "world" gives every instance a hidden true interval (base × 0.5–2) after
// which it is really dirty. The simulated user answers truthfully, does 80% of
// the tasks after NO and only cleans through the app.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRoom, areas, emptyHome, withFeature } from '../../../src/core/home.js';
import { IDLE, createLoop } from '../../../src/core/loop.js';
import { seededRandom } from '../../../src/core/random.js';
import { createScheduler } from '../../../src/core/scheduler.js';
import { answerSweep, currentCard, firstSweep, sweepHousehold } from '../../../src/core/sweep.js';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../../../src/core/time.js';
import { T0, ZONE } from './support.js';

const DAYS = 60;

/** How someone uses the app: answers per daily series, longer series, a weekly big clean, days away. */
const PROFILES = {
  'daily series': { perDay: 10 },
  'longer every 3rd day': { perDay: 10, longer: { every: 3, answers: 30 } },
  'weekly big clean': { perDay: 10, bigClean: { every: 7, budgetMs: 60 * MINUTE_MS } },
  'two weeks away': { perDay: 10, away: [20, 33] },
};

function homeOf(kinds, features) {
  let home = kinds.reduce((h, kind) => addRoom(h, kind), emptyHome());
  for (const feature of features) home = withFeature(home, feature, true);
  return home;
}

const HOMES = {
  'teen room': homeOf(['ROOM'], ['ELECTRONICS', 'COMPUTER']),
  flat: homeOf(['ENTRYWAY', 'KITCHEN', 'BATHROOM', 'ROOM', 'ROOM', 'BALCONY'], ['LAUNDRY', 'WASHING_MACHINE', 'ELECTRONICS', 'COMPUTER', 'CLEANING_GEAR']),
  house: homeOf(
    ['ENTRYWAY', 'HALLWAY', 'KITCHEN', 'DINING_ROOM', 'LIVING_ROOM', 'BEDROOM', 'BEDROOM', 'KIDS_ROOM', 'STUDY', 'BATHROOM', 'BATHROOM', 'TOILET', 'LAUNDRY_ROOM', 'STAIRS', 'BASEMENT', 'TERRACE', 'GARAGE', 'GARDEN'],
    ['DISHWASHER', 'LAUNDRY', 'WASHING_MACHINE', 'ELECTRONICS', 'COMPUTER', 'CLEANING_GEAR', 'ROBOT_VACUUM', 'CAR', 'CHILD', 'PET', 'DOG'],
  ),
};

function createWorld(scheduler, random) {
  const truth = new Map();
  const cleanedAt = new Map();
  const trueInterval = (key) => {
    if (!truth.has(key)) truth.set(key, scheduler.question(key).days * Math.exp(Math.log(0.5) + random.next() * Math.log(4)));
    return truth.get(key);
  };
  return {
    trueInterval,
    isDirty(key, now) {
      if (!cleanedAt.has(key)) cleanedAt.set(key, now - trueInterval(key) * random.next() * 1.5 * DAY_MS);
      return now >= cleanedAt.get(key) + trueInterval(key) * DAY_MS;
    },
    clean(key, now) {
      cleanedAt.set(key, now);
    },
  };
}

const average = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

function simulate({ profile, home = HOMES.flat, tuning = {}, seed = 1 }) {
  const scheduler = createScheduler({ zone: ZONE, tuning });
  const loop = createLoop(scheduler);
  const random = seededRandom(seed);
  const world = createWorld(scheduler, random);
  const asked = new Map();
  let answers = 0;

  // Onboarding: rooms and switches chosen, the first Sweep answered truthfully.
  let sweep = firstSweep(scheduler, { home, instances: {} }, T0);
  for (let card = currentCard(sweep); card; card = currentCard(sweep)) {
    sweep = answerSweep(sweep, world.isDirty(card.key, T0) ? 'NO' : 'YES', T0);
  }
  let household = sweepHousehold(scheduler, sweep);
  let activity = IDLE;
  let now = T0;

  const send = (event) => {
    const step = loop.reduce(household, activity, event, now, random);
    household = step.household;
    activity = step.activity;
    return step;
  };

  /** Answers what is asked, up to `limit` answers; does 80% of the tasks after NO. */
  const answerQuestions = (limit) => {
    let handled = 0;
    while (activity.kind === 'asking' && handled < limit) {
      const { key } = activity;
      const dirty = world.isDirty(key, now);
      send({ kind: 'answer', key, answer: dirty ? 'NO' : 'YES' });
      asked.set(key, (asked.get(key) ?? 0) + 1);
      answers++;
      handled++;
      if (!dirty) continue;
      if (random.next() < 0.8) {
        send({ kind: 'start', key });
        now += scheduler.taskDurationMs(household, key);
        world.clean(key, now);
        send({ kind: 'done', key });
      } else {
        send({ kind: 'skip', key });
      }
    }
    if (activity.kind === 'asking' || activity.kind === 'offering') send({ kind: 'stop' });
  };

  const daily = [];
  for (let day = 0; day < DAYS; day++) {
    const away = profile.away && day >= profile.away[0] && day <= profile.away[1];
    const evening = T0 + day * DAY_MS + 11 * HOUR_MS;

    if (!away && profile.bigClean && day % profile.bigClean.every === profile.bigClean.every - 1) {
      now = T0 + day * DAY_MS + 2 * HOUR_MS;
      household = scheduler.refresh(household, now, random);
      send({ kind: 'open' });
      const plan = loop.planner.plan(household, loop.planner.areasWithWork(household, areas(home), now), profile.bigClean.budgetMs, now);
      send({ kind: 'start-clean', plan });
      answerQuestions(Infinity);
    }

    now = evening;
    household = scheduler.refresh(household, now, random);
    const active = scheduler.keysFor(home).filter((key) => scheduler.isActive(household, key, now));
    const hygiene = active.filter((key) => scheduler.question(key).priority === 'HYGIENE');
    daily.push({
      active: active.length,
      pool: scheduler.pool(household, now).length,
      dirty: active.filter((key) => world.isDirty(key, now)).length / active.length,
      hygieneDirty: hygiene.length ? hygiene.filter((key) => world.isDirty(key, now)).length / hygiene.length : 0,
    });
    if (away) continue;

    send({ kind: 'open' });
    const limit = profile.longer && day % profile.longer.every === 0 ? profile.longer.answers : profile.perDay;
    send({ kind: 'request-task' });
    answerQuestions(limit);
  }

  const end = T0 + DAYS * DAY_MS;
  const active = scheduler.keysFor(home).filter((key) => scheduler.isActive(household, key, end));
  const hygiene = active.filter((key) => scheduler.question(key).priority === 'HYGIENE');
  const ratios = active
    .filter((key) => (asked.get(key) ?? 0) >= 3)
    .map((key) => household.instances[key].interval / world.trueInterval(key))
    .sort((a, b) => a - b);
  const secondHalf = daily.slice(DAYS / 2);
  return {
    daily,
    active: active.length,
    neededPerDay: active.reduce((sum, key) => sum + 1 / world.trueInterval(key), 0),
    answersPerDay: answers / DAYS,
    avgPool: average(secondHalf.map((d) => d.pool)),
    dirty: average(secondHalf.map((d) => d.dirty)),
    hygieneDirty: average(secondHalf.map((d) => d.hygieneDirty)),
    hygieneActive: hygiene.length,
    neverAsked: active.filter((key) => !asked.has(key)).length,
    hygieneNeverAsked: hygiene.filter((key) => !asked.has(key)).length,
    learnedToTrue: ratios.length ? ratios[Math.floor(ratios.length / 2)] : NaN,
  };
}

function line(name, r) {
  const pct = (v) => `${Math.round(v * 100)}%`.padStart(4);
  return (
    `${name.padEnd(34)} active ${String(r.active).padStart(3)} | needed/day ${r.neededPerDay.toFixed(1).padStart(5)} | ` +
    `answers/day ${r.answersPerDay.toFixed(1).padStart(5)} | avg pool ${r.avgPool.toFixed(1).padStart(5)} | ` +
    `dirty ${pct(r.dirty)} (hygiene ${pct(r.hygieneDirty)}) | never asked ${String(r.neverAsked).padStart(3)} ` +
    `(hygiene ${r.hygieneNeverAsked}) | learned/true ${r.learnedToTrue.toFixed(2)}`
  );
}

test('the pool stays under control for every profile', (t) => {
  const reports = Object.fromEntries(Object.entries(PROFILES).map(([name, profile]) => [name, simulate({ profile })]));
  const plain = simulate({ profile: PROFILES['daily series'], tuning: { elapsedAwareIntervals: false } });
  t.diagnostic(`Simulation, ${DAYS} days, typical flat (second half averaged):`);
  for (const [name, r] of Object.entries(reports)) t.diagnostic(line(name, r));
  t.diagnostic(line('daily series, plain multipliers', plain));
  const away = reports['two weeks away'].daily;
  t.diagnostic(`two weeks away, pool by day 18–45: ${away.slice(18, 46).map((d) => d.pool).join(' ')}`);
  t.diagnostic(`two weeks away, dirty % by day 18–45: ${away.slice(18, 46).map((d) => Math.round(d.dirty * 100)).join(' ')}`);

  for (const [name, r] of Object.entries(reports)) {
    // The draw puts hygiene first (priority ×3), so it is never dirtier than the rest.
    assert.ok(r.hygieneDirty <= r.dirty + 0.05, `${name}: hygiene ${r.hygieneDirty} vs all ${r.dirty}`);
    // No runaway growth: the last two weeks are not clearly above the two before them (whole weeks, so each
    // window has the same number of big cleans; day to day the pool swings by about ±15%).
    const pool = (from, to) => average(r.daily.slice(from, to).map((d) => d.pool));
    if (name !== 'two weeks away') assert.ok(pool(46, 60) <= pool(32, 46) * 1.25, `${name}: pool keeps growing`);
  }
  const daily = reports['daily series'];
  // With 10 answers a day for about 35 needed, some questions wait long; hygiene ones less often than the rest.
  assert.ok(daily.hygieneNeverAsked / daily.hygieneActive <= daily.neverAsked / daily.active, 'hygiene is asked first');
  assert.ok(reports['longer every 3rd day'].dirty < daily.dirty, 'longer series keep the home cleaner');
  assert.ok(reports['weekly big clean'].dirty < daily.dirty, 'a weekly big clean keeps the home cleaner');

  // Intervals aware of the real time since the last clean learn the real ones (8.3); plain multipliers learn
  // about half, because the app asks late and NO is common.
  assert.ok(daily.learnedToTrue >= 0.8 && daily.learnedToTrue <= 1.25, `learned/true ${daily.learnedToTrue}`);
  assert.ok(plain.learnedToTrue < 0.7, `plain multipliers ${plain.learnedToTrue}`);

  // Back after two weeks away: the pool and the dirt go down again, the cap keeps old questions from taking over.
  const peak = Math.max(...away.map((d) => d.pool));
  assert.ok(away[45].pool < peak * 0.9, `pool after return ${away[45].pool}, peak ${peak}`);
  assert.ok(away[45].dirty < away[34].dirty - 0.1, `dirty after return ${away[45].dirty}, at the end of the break ${away[34].dirty}`);
});

test('the pool stays under control from a single room to a house', (t) => {
  t.diagnostic(`Simulation, ${DAYS} days, by home (second half averaged):`);
  for (const [homeName, home] of Object.entries(HOMES)) {
    for (const name of ['daily series', 'weekly big clean']) {
      const r = simulate({ profile: PROFILES[name], home });
      t.diagnostic(line(`${homeName}, ${name}`, r));
      assert.ok(r.avgPool <= r.active);
      // Priority only matters when the pool does not empty. A single room gets through it every day; there,
      // hygiene questions (1–2 day intervals) are simply caught dirty more often by the once-a-day check.
      if (homeName !== 'teen room') assert.ok(r.hygieneDirty <= r.dirty + 0.05, `${homeName}, ${name}: hygiene ${r.hygieneDirty} vs all ${r.dirty}`);
      if (homeName === 'teen room') assert.ok(r.active >= 20 && r.active <= 60, `a single room has a small catalog: ${r.active}`);
    }
  }
});
