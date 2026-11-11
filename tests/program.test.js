'use strict';
/* Session builder tests: what a generated kids session contains, checked
 * across many seeds at every level. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const KP = require(path.join(__dirname, '..', 'docs', 'program.js'));
const SE = require(path.join(__dirname, '..', 'docs', 'session-engine.js'));
const KidsApp = require(path.join(__dirname, '..', 'docs', 'app.js'));
const SOURCE = require(path.join(__dirname, 'fixtures', 'exercises-kids.json'));

const SEEDS = 400;
const BY_ID = new Map(KP.MOVES.map(m => [m.id, m]));
const baseId = slot => slot.id.replace(/-r[12]$/, '');
const moveOf = slot => BY_ID.get(baseId(slot));
const THIGH_ROLES = ['squat', 'single-leg', 'hold-hop'];
const POSTURE_ROLES = ['posture', 'crab'];

function each(fn) {
  [1, 2, 3].forEach(level => {
    for (let seed = 0; seed < SEEDS; seed++) fn(KP.buildSession({ level: level, rand: KP.seeded(seed * 7919 + level) }), level, seed);
  });
}
function rounds(plan) {
  const main = plan.slots.filter(s => s.phase === 'main');
  return { r1: main.filter(s => /-r1$/.test(s.id)), r2: main.filter(s => /-r2$/.test(s.id)) };
}

test('phases run warm-up, main, cool-down, in that order, with no slot out of place', () => {
  each(plan => {
    const order = plan.slots.map(s => SE.PHASES.indexOf(s.phase));
    assert.ok(order.every(i => i >= 0));
    assert.deepStrictEqual(order, order.slice().sort((a, b) => a - b));
  });
});

test('4 warm-up moves, 6 main moves in round 1, round 2 repeats them, 4-move fixed cool-down', () => {
  each(plan => {
    const counts = SE.phaseCounts(plan.slots);
    assert.strictEqual(counts.warmup, 4);
    assert.strictEqual(counts.cooldown, 4);
    const { r1, r2 } = rounds(plan);
    assert.strictEqual(r1.length, 6);
    assert.ok(r2.length === 6 || r2.length === 5, 'round 2 has 6, or 5 when the play move is dropped');
    assert.deepStrictEqual(r2.map(baseId), r1.slice(0, r2.length).map(baseId));
    assert.deepStrictEqual(plan.slots.filter(s => s.phase === 'cooldown').map(s => s.id),
      ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance']);
  });
});

test('each main round is 3 thigh moves, then 2 posture moves, then 1 play move', () => {
  each(plan => {
    const roles = rounds(plan).r1.map(s => moveOf(s).roles);
    roles.slice(0, 3).forEach(r => assert.ok(r.some(x => THIGH_ROLES.indexOf(x) !== -1), r.join()));
    roles.slice(3, 5).forEach(r => assert.ok(r.some(x => POSTURE_ROLES.indexOf(x) !== -1), r.join()));
    assert.ok(roles[5].indexOf('play') !== -1);
  });
});

test('no move appears twice in a session, apart from its round-2 repeat', () => {
  each(plan => {
    const firsts = plan.slots.filter(s => !/-r2$/.test(s.id)).map(baseId);
    assert.strictEqual(new Set(firsts).size, firsts.length, firsts.join());
  });
});

test('Starter has no jumps; Frog Jumps from Stronger up; Star Jumps only at Superhero', () => {
  const seen = { 1: new Set(), 2: new Set(), 3: new Set() };
  each((plan, level) => {
    plan.slots.forEach(s => {
      const move = moveOf(s);
      seen[level].add(move.id);
      if (level === 1) assert.strictEqual(KP.hopsAt(move, 1), false, move.id + ' hops at Starter');
    });
    const hopsInWarmup = plan.slots.filter(s => s.phase === 'warmup' && KP.hopsAt(moveOf(s), level)).length;
    assert.ok(hopsInWarmup <= 1);
  });
  assert.ok(!seen[1].has('frog-jumps') && !seen[1].has('star-jumps'));
  assert.ok(seen[2].has('frog-jumps') && !seen[2].has('star-jumps'));
  assert.ok(seen[3].has('frog-jumps') && seen[3].has('star-jumps'));
});

test('Wall Sit holds 10, 20, then 30 seconds by level', () => {
  const wallSit = BY_ID.get('wall-sit');
  assert.deepStrictEqual([1, 2, 3].map(l => KP.doseAt(wallSit, l).seconds), [10, 20, 30]);
  each((plan, level) => {
    plan.slots.filter(s => baseId(s) === 'wall-sit').forEach(s => {
      assert.strictEqual(s.dose.kind, 'time');
      assert.strictEqual(s.dose.seconds, [10, 20, 30][level - 1]);
    });
  });
});

test('Starter squats are Sit-to-Stand; Stronger and Superhero use Bodyweight Squat', () => {
  each((plan, level) => {
    assert.strictEqual(baseId(rounds(plan).r1[0]), level === 1 ? 'sit-to-stand' : 'bodyweight-squat');
  });
});

test('keep / fix / replace decisions hold: Bird Dog, High Knees, Hand Walk-Outs, no yoga', () => {
  const names = KP.MOVES.map(m => m.name);
  ['Donkey Kicks', 'Running in Place', 'Inchworm'].forEach(n => assert.ok(names.indexOf(n) === -1, n));
  ['Bird Dog', 'High Knees', 'Hand Walk-Outs'].forEach(n => assert.ok(names.indexOf(n) !== -1, n));
  const walkOut = BY_ID.get('hand-walk-outs');
  const instructions = [walkOut.cue].concat(walkOut.doses.map(d => d.label)).join(' ');
  assert.ok(!/downward|down dog|hold/i.test(instructions), instructions);
  assert.match(walkOut.description, /Do not hold a downward-dog shape/);
  KP.MOVES.forEach(m => assert.ok(!/yoga/i.test(m.name + ' ' + (m.description || '') + ' ' + (m.cue || '')), m.name));
});

test('every move in exercises-kids.json is in the app with its exact URL', () => {
  const byName = new Map(KP.MOVES.map(m => [m.jsonName || m.name, m]));
  assert.strictEqual(KP.MOVES.length, SOURCE.length);
  SOURCE.forEach(e => {
    const move = byName.get(e.nameOfExercise);
    assert.ok(move, e.nameOfExercise);
    assert.strictEqual(move.url, e.url, e.nameOfExercise);
  });
});

test('demos sit on round 1 and warm-up/cool-down only; every demo is a real https YouTube link', () => {
  each(plan => {
    plan.slots.forEach(s => {
      if (/-r2$/.test(s.id)) assert.strictEqual(s.demoUrl, '');
      else if (s.demoUrl) assert.ok(SE.embedUrl(s.demoUrl).indexOf('https://www.youtube-nocookie.com/embed/') === 0, s.demoUrl);
    });
  });
});

test('rest: main rest by level, a water break after round 1, no rest after the last move', () => {
  each((plan, level) => {
    const { r1, r2 } = rounds(plan);
    r1.slice(0, -1).concat(r2).forEach(s => assert.strictEqual(s.restSec, KP.MAIN_REST_SEC[level]));
    assert.ok(r1[5].restSec > KP.MAIN_REST_SEC[level]);
    assert.strictEqual(r1[5].restLabel, 'Water break');
    const engine = SE.create(plan);
    assert.strictEqual(engine.restSecAfter(plan.slots.length - 1), 0);
  });
});

test('every generated session fits inside the honest minute label for its level', () => {
  const seen = {};
  each((plan, level) => {
    const min = SE.estimateSeconds(plan) / 60;
    const range = KidsApp.LEVEL_MINUTES[level];
    assert.ok(min >= range[0] && min <= range[1], 'level ' + level + ': ' + min.toFixed(2));
    const s = seen[level] || (seen[level] = { lo: Infinity, hi: 0 });
    s.lo = Math.min(s.lo, min);
    s.hi = Math.max(s.hi, min);
  });
  /* The label must not over-promise either: its ends sit within a minute
   * of what really happens. */
  [1, 2, 3].forEach(level => {
    const range = KidsApp.LEVEL_MINUTES[level];
    assert.ok(seen[level].lo - range[0] < 1, 'level ' + level + ' low end ' + seen[level].lo);
    assert.ok(range[1] - seen[level].hi < 1, 'level ' + level + ' high end ' + seen[level].hi);
  });
});

test('the level label shows the same minutes the test checks', () => {
  [1, 2, 3].forEach(level => {
    const r = KidsApp.LEVEL_MINUTES[level];
    assert.strictEqual(KidsApp.levelLabel(level), 'About ' + r[0] + ' to ' + r[1] + ' minutes');
  });
});

test('a session runs start to finish through the engine in slot order', () => {
  const plan = KP.buildSession({ level: 2, rand: KP.seeded(42) });
  let now = 0;
  const engine = SE.create(plan, { clock: () => now });
  engine.start();
  const seen = [];
  while (engine.getState().status !== 'finished') {
    if (engine.getState().status === 'rest') { engine.skipRest(); continue; }
    seen.push(engine.current().id);
    now += 1000;
    engine.done();
  }
  assert.deepStrictEqual(seen, plan.slots.map(s => s.id));
  assert.strictEqual(engine.summary().completed, plan.slots.length);
});
