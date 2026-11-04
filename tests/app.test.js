'use strict';
/* Run with: node --test tests/*.test.js
 * Loads docs/video-library.js and docs/app.js into one sandbox, the same
 * way the page loads them with two script tags. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const docs = path.join(__dirname, '..', 'docs');
const lib = fs.readFileSync(path.join(docs, 'video-library.js'), 'utf8');
const app = fs.readFileSync(path.join(docs, 'app.js'), 'utf8');
const sandbox = { module: { exports: {} }, console, URL, Date, Math, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(lib + '\n' + app + '\n;globalThis.__EX = EXERCISES; globalThis.__LIB = VIDEO_LIBRARY;', sandbox);
const api = sandbox.module.exports;
const EXERCISES = sandbox.__EX;
const VIDEOS = sandbox.__LIB.videos;

const YOGA = /yoga|downward dog|child'?s pose|cobra|tree pose|warrior|cat-cow|cat cow|happy baby|sun salutation|butterfly pose|lotus|namaste/i;

test('pool has 15 moves and no yoga content', () => {
  assert.strictEqual(EXERCISES.length, 15);
  EXERCISES.forEach(e => assert.ok(!YOGA.test(e.name + ' ' + e.note + ' ' + e.id), e.id));
  VIDEOS.forEach(v => assert.ok(!YOGA.test([v.id, v.title, v.creator, v.description].join(' ')), v.id));
});

test('every demo id resolves to a library video', () => {
  const ids = new Set(VIDEOS.map(v => v.id));
  EXERCISES.forEach(e => e.demo_ids.forEach(id => assert.ok(ids.has(id), e.id + ' -> ' + id)));
  assert.strictEqual(VIDEOS.length, 14);
});

test('every video is an https YouTube link', () => {
  VIDEOS.forEach(v => assert.match(v.url, /^https:\/\/www\.youtube\.com\/(watch\?v=|shorts\/)[A-Za-z0-9_-]{11}$/, v.id));
});

test('embeds use youtube-nocookie with rel=0', () => {
  assert.strictEqual(api.nocookieEmbed('https://www.youtube.com/watch?v=1ZDXv_73zJ8'),
    'https://www.youtube-nocookie.com/embed/1ZDXv_73zJ8?rel=0');
  assert.strictEqual(api.nocookieEmbed('https://evil.example/watch?v=1ZDXv_73zJ8'), '');
});

test('safeHttpsUrl rejects non-https schemes', () => {
  assert.strictEqual(api.safeHttpsUrl('javascript:alert(1)'), '');
  assert.strictEqual(api.safeHttpsUrl('http://example.com/'), '');
  assert.strictEqual(api.safeHttpsUrl('https://www.youtube.com/watch?v=1ZDXv_73zJ8'), 'https://www.youtube.com/watch?v=1ZDXv_73zJ8');
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function sectionOf(id) {
  if (id === 'easy-finish') return 'finish';
  const ex = EXERCISES.find(e => e.id === id);
  return ex ? ex.section : '';
}
function isHigh(id) {
  const ex = EXERCISES.find(e => e.id === id);
  return !!(ex && ex.high_impact);
}
function storeWithSession(ids, phase) {
  return {
    version: 3,
    phase: phase,
    unlockedPhase: phase,
    phaseSessions: { 1: 0, 2: 0, 3: 0 },
    checks: {},
    collapsed: {},
    completions: {},
    activeDay: '2026-11-03',
    workoutDays: [2, 4],
    symptoms: {},
    history: [],
    session: {
      state: 'running',
      startedAt: 1,
      deadline: 2,
      day: '2026-11-03',
      exerciseIds: ids,
    },
  };
}

test('template sessions follow warm-up, legs, posture, finish', () => {
  const warmIds = EXERCISES.filter(e => e.section === 'warmup').map(e => e.id);
  const legIds = EXERCISES.filter(e => e.section === 'strength').map(e => e.id);
  const postureIds = EXERCISES.filter(e => e.section === 'stability').map(e => e.id);
  for (const level of [1, 2, 3]) {
    const seenWarm = new Set();
    const seenLeg = new Set();
    for (let n = 0; n < 1000; n++) {
      const ids = api.pickSessionExerciseIds(mulberry32(level * 100000 + n + 1));
      const state = storeWithSession(ids, level);
      const loaded = api.loadStoreFromRaw(JSON.stringify(state), new Date('2026-11-03T12:00:00'));
      assert.deepEqual(loaded.state.session.exerciseIds, ids);
      const prog = api.programForState(loaded.state).map(e => e.id);
      const again = api.programForState(loaded.state).map(e => e.id);
      assert.deepEqual(again, prog);
      assert.deepEqual(prog.map(sectionOf), [
        'warmup', 'warmup', 'strength', 'strength', 'strength', 'stability', 'stability', 'finish',
      ]);
      assert.strictEqual(new Set(prog).size, prog.length);
      assert.strictEqual(isHigh(prog[0]), false);
      const legHigh = prog.slice(2, 5).filter(isHigh).length;
      assert.ok(legHigh <= 1);
      const highs = [];
      prog.forEach((id, i) => { if (isHigh(id)) highs.push(i); });
      for (let h = 1; h < highs.length; h++) assert.ok(highs[h] - highs[h - 1] > 1);
      const jumps = api.bigJumpSetsByRound(level, ids);
      assert.ok(jumps.warmup <= 2);
      assert.strictEqual(jumps.rounds.length, api.levelPlan(level).rounds);
      jumps.rounds.forEach(n => assert.ok(n <= 2 && n === legHigh));
      assert.deepEqual(prog.slice(5, 7).slice().sort(), postureIds.slice().sort());
      prog.slice(0, 2).forEach(id => seenWarm.add(id));
      prog.slice(2, 5).forEach(id => seenLeg.add(id));
      const finish = api.programForState(loaded.state).find(e => e.id === 'easy-finish');
      assert.strictEqual(finish.dose, '1 min');
      assert.strictEqual(finish.video_url, '');
      assert.ok(!YOGA.test(finish.name + ' ' + finish.note));
    }
    warmIds.forEach(id => assert.ok(seenWarm.has(id), 'level ' + level + ' missing warm-up ' + id));
    legIds.forEach(id => assert.ok(seenLeg.has(id), 'level ' + level + ' missing leg ' + id));
  }
});

test('removed yoga moves and videos are absent', () => {
  const goneMoves = ['butterfly-stretch', 'childs-pose', 'deep-breathing'];
  const goneVideos = ['v-wufshanti-butterfly', 'v-flowgrow-childs-pose', 'v-kidsyogastories-balloon-breath'];
  goneMoves.forEach(id => assert.ok(!EXERCISES.some(e => e.id === id), id));
  goneVideos.forEach(id => assert.ok(!VIDEOS.some(v => v.id === id), id));
});

test('a saved session that cited a removed move gets a soft update notice', () => {
  const raw = JSON.stringify({
    version: 3,
    phase: 1,
    unlockedPhase: 1,
    phaseSessions: { 1: 2, 2: 0, 3: 0 },
    checks: {},
    collapsed: {},
    completions: {},
    activeDay: '2026-11-03',
    workoutDays: [2, 4],
    symptoms: {},
    history: [],
    session: {
      state: 'running',
      startedAt: 1,
      deadline: 2,
      day: '2026-11-03',
      exerciseIds: ['hopscotch', 'step-jacks', 'bear-crawls', 'flamingo-balance', 'butterfly-stretch'],
    },
  });
  const r = api.loadStoreFromRaw(raw, new Date('2026-11-03T12:00:00'));
  assert.strictEqual(r.notice, api.NOTICE_MOVES_UPDATED);
  assert.strictEqual(r.notice, 'Your saved workout was updated to the new moves.');
  assert.notStrictEqual(r.notice, api.NOTICE_PARTIAL);
  assert.strictEqual(r.state.phaseSessions[1], 2);
  assert.strictEqual(r.state.session.exerciseIds, undefined);
});

test('a removed move plus junk ids gets the partial-reset notice', () => {
  const raw = JSON.stringify({
    version: 3,
    phase: 1,
    unlockedPhase: 1,
    phaseSessions: { 1: 2, 2: 0, 3: 0 },
    checks: {},
    collapsed: {},
    completions: {},
    activeDay: '2026-11-03',
    workoutDays: [2, 4],
    symptoms: {},
    history: [],
    session: {
      state: 'running',
      startedAt: 1,
      deadline: 2,
      day: '2026-11-03',
      exerciseIds: ['hopscotch', 'butterfly-stretch', 'not-a-real-move'],
    },
  });
  const r = api.loadStoreFromRaw(raw, new Date('2026-11-03T12:00:00'));
  assert.strictEqual(r.notice, api.NOTICE_PARTIAL);
  assert.strictEqual(r.notice, 'Some saved data was unreadable and was reset. The rest of your progress was kept.');
  assert.notStrictEqual(r.notice, api.NOTICE_MOVES_UPDATED);
  assert.strictEqual(r.state.phaseSessions[1], 2);
  assert.strictEqual(r.state.session.exerciseIds, undefined);
});

test('legacy 5-id session still loads and a new session stays put', () => {
  const legacyIds = ['hopscotch', 'step-jacks', 'bear-crawls', 'donkey-kicks', 'flamingo-balance'];
  const legacy = api.loadStoreFromRaw(JSON.stringify(storeWithSession(legacyIds, 1)), new Date('2026-11-03T12:00:00'));
  assert.strictEqual(legacy.notice, null);
  assert.deepEqual(legacy.state.session.exerciseIds, legacyIds);
  assert.deepEqual(api.programForState(legacy.state).map(e => e.id), legacyIds);
  const freshIds = api.pickSessionExerciseIds(mulberry32(99));
  const first = api.loadStoreFromRaw(JSON.stringify(storeWithSession(freshIds, 2)), new Date('2026-11-03T12:00:00'));
  const second = api.loadStoreFromRaw(JSON.stringify(storeWithSession(freshIds, 2)), new Date('2026-11-03T12:00:00'));
  assert.deepEqual(first.state.session.exerciseIds, freshIds);
  assert.deepEqual(api.programForState(first.state).map(e => e.id), api.programForState(second.state).map(e => e.id));
  assert.ok(!EXERCISES.some(e => e.id === 'easy-finish'));
});

test('rounds, rest, and doses follow the level', () => {
  const ids = ['running-in-place', 'hopscotch', 'bear-crawls', 'frog-jumps', 'donkey-kicks', 'flamingo-balance', 'superkid'];
  assert.strictEqual(api.isTemplateIds(ids), true);
  function dose(level, id) {
    return api.programForState(storeWithSession(ids, level)).find(e => e.id === id).dose;
  }
  assert.deepEqual(api.levelPlan(1), { rounds: 3, restSec: 30 });
  assert.deepEqual(api.levelPlan(2), { rounds: 3, restSec: 15 });
  assert.deepEqual(api.levelPlan(3), { rounds: 3, restSec: 15 });
  assert.strictEqual(dose(1, 'hopscotch'), '30 sec');
  assert.strictEqual(dose(2, 'hopscotch'), '40 sec');
  assert.strictEqual(dose(3, 'running-in-place'), '45 sec');
  assert.strictEqual(dose(1, 'frog-jumps'), '5 jumps');
  assert.strictEqual(dose(2, 'frog-jumps'), '8 jumps');
  assert.strictEqual(dose(3, 'frog-jumps'), '10 jumps');
  assert.strictEqual(dose(1, 'bear-crawls'), '1 time across');
  assert.strictEqual(dose(2, 'bear-crawls'), '2 times across');
  assert.strictEqual(dose(3, 'bear-crawls'), '2 times across');
  assert.strictEqual(dose(1, 'donkey-kicks'), '6 each side');
  assert.strictEqual(dose(3, 'donkey-kicks'), '10 each side');
  assert.strictEqual(dose(1, 'flamingo-balance'), '2 x 8 sec each side');
  assert.strictEqual(dose(2, 'flamingo-balance'), '2 x 10 sec each side');
  assert.strictEqual(dose(3, 'flamingo-balance'), '3 x 15 sec each side');
  assert.strictEqual(dose(1, 'superkid'), '2 x 8 sec');
  assert.strictEqual(dose(2, 'superkid'), '3 x 10 sec');
  assert.strictEqual(dose(3, 'superkid'), '3 x 15 sec');
  assert.strictEqual(dose(1, 'easy-finish'), '1 min');
  const legacy = api.programForState(storeWithSession(
    ['hopscotch', 'step-jacks', 'bear-crawls', 'donkey-kicks', 'flamingo-balance'], 3));
  assert.strictEqual(legacy.find(e => e.id === 'hopscotch').dose, '1 min');
  assert.strictEqual(legacy.find(e => e.id === 'flamingo-balance').dose, '3 x 15 sec each side');
});

function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  items.forEach((item, i) => {
    permutations(items.slice(0, i).concat(items.slice(i + 1))).forEach(rest => {
      out.push([item].concat(rest));
    });
  });
  return out;
}

/* Every legal template, once per set of moves. Order does not change the
 * estimate, so the first order that passes the template rules is enough. */
function eachLegalTemplate(visit) {
  const warm = EXERCISES.filter(e => e.section === 'warmup');
  const easy = warm.filter(e => e.high_impact !== true);
  const legs = EXERCISES.filter(e => e.section === 'strength');
  const posture = EXERCISES.filter(e => e.section === 'stability');
  const posturePairs = [];
  if (posture.length <= 2) posturePairs.push(posture.map(e => e.id));
  else {
    for (let i = 0; i < posture.length; i++) {
      for (let j = i + 1; j < posture.length; j++) posturePairs.push([posture[i].id, posture[j].id]);
    }
  }
  let count = 0;
  easy.forEach(first => {
    warm.forEach(second => {
      if (second.id === first.id) return;
      for (let i = 0; i < legs.length; i++) {
        for (let j = i + 1; j < legs.length; j++) {
          for (let k = j + 1; k < legs.length; k++) {
            const trioOrders = permutations([legs[i].id, legs[j].id, legs[k].id]);
            posturePairs.forEach(pair => {
              let found = null;
              trioOrders.some(order => permutations(pair).some(post => {
                const ids = [first.id, second.id].concat(order, post);
                if (!api.isTemplateIds(ids)) return false;
                found = ids;
                return true;
              }));
              if (!found) return;
              count += 1;
              visit(found);
            });
          }
        }
      }
    });
  });
  return count;
}

function labelRangeMinutes(label) {
  const range = String(label).match(/(\d+)\s+to\s+(\d+)/);
  if (range) return { low: Number(range[1]), high: Number(range[2]) };
  const one = String(label).match(/(\d+)/);
  const n = one ? Number(one[1]) : 0;
  return { low: n, high: n };
}

test('every real session length sits inside the level label and timer', () => {
  for (const level of [1, 2, 3]) {
    let minSec = Infinity;
    let maxSec = 0;
    const seen = eachLegalTemplate(ids => {
      const sec = api.estimateSessionSeconds(level, ids);
      if (sec < minSec) minSec = sec;
      if (sec > maxSec) maxSec = sec;
    });
    assert.ok(seen > 0, 'level ' + level + ' has a template');
    const range = labelRangeMinutes(api.sessionLengthLabel(level));
    assert.ok(minSec + 1e-6 >= range.low * 60, 'level ' + level + ' shortest ' + minSec + ' is under ' + range.low);
    assert.ok(maxSec <= range.high * 60 + 1e-6, 'level ' + level + ' longest ' + maxSec + ' is over ' + range.high);
    assert.ok(api.sessionMs(level) >= maxSec * 1000, 'level ' + level + ' timer is short of ' + maxSec);
    if (level < 3) {
      assert.ok(minSec + 1e-6 >= 15 * 60, 'level ' + level + ' shortest ' + minSec);
      assert.ok(maxSec <= 18 * 60 + 1e-6, 'level ' + level + ' longest ' + maxSec);
    }
  }
});

test('copy names the session length, across, and grown-up tips', () => {
  assert.strictEqual(api.ACROSS_NOTE, 'Across means about 3 to 4 meters.');
  assert.deepEqual(api.SESSION_MINUTES, { 1: 18, 2: 18, 3: 22 });
  assert.strictEqual(api.sessionLengthLabel(1), 'About 15 to 18 minutes.');
  assert.strictEqual(api.sessionLengthLabel(2), 'About 15 to 18 minutes.');
  assert.strictEqual(api.sessionLengthLabel(3), 'About 20 to 22 minutes.');
  assert.match(api.GROWNUP_TIPS, /soft landings/);
  assert.match(api.GROWNUP_TIPS, /knees not caving in/);
  assert.match(api.GROWNUP_TIPS, /flat back/);
  assert.match(api.GROWNUP_TIPS, /neck looking at the floor/);
  assert.match(api.GROWNUP_TIPS, /mat for crawls/);
  assert.match(api.GROWNUP_TIPS, /pain, dizziness, or limping/);
  api.PHASES.forEach(p => {
    const label = api.sessionLengthLabel(p.id).replace(/\.$/, '');
    assert.ok(p.goal.indexOf(label) === 0, p.goal);
    assert.doesNotMatch(p.goal, /five random/i);
    assert.doesNotMatch(p.goal, /physical therapist|clinician/i);
  });
  assert.doesNotMatch(app, /physical therapist|clinician/i);
});

test('a repeated big jump counts once per round, and no round exceeds 2', () => {
  const ids = ['running-in-place', 'hopscotch', 'bear-crawls', 'frog-jumps', 'donkey-kicks', 'flamingo-balance', 'superkid'];
  assert.strictEqual(api.isTemplateIds(ids), true);
  assert.deepEqual(api.bigJumpSetsByRound(1, ids), { warmup: 1, rounds: [1, 1, 1] });
  assert.deepEqual(api.bigJumpSetsByRound(2, ids), { warmup: 1, rounds: [1, 1, 1] });
  assert.deepEqual(api.bigJumpSetsByRound(3, ids), { warmup: 1, rounds: [1, 1, 1] });
  const sets = api.bigJumpSetsByRound(3, ids);
  const total = sets.warmup + sets.rounds.reduce((sum, n) => sum + n, 0);
  assert.strictEqual(total, 4);
  const twoInOneRound = ['running-in-place', 'arm-circles', 'frog-jumps', 'star-jumps', 'donkey-kicks', 'flamingo-balance', 'superkid'];
  assert.deepEqual(api.bigJumpSetsByRound(3, twoInOneRound), { warmup: 0, rounds: [2, 2, 2] });
  assert.strictEqual(api.isTemplateIds(twoInOneRound), false);
});

test('each level timer covers its longest estimate', () => {
  for (const level of [1, 2, 3]) {
    let longest = 0;
    for (let n = 0; n < 1000; n++) {
      const ids = api.pickSessionExerciseIds(mulberry32(level * 100000 + n + 1));
      longest = Math.max(longest, api.estimateSessionSeconds(level, ids));
    }
    const timerSec = api.sessionMs(level) / 1000;
    assert.ok(longest <= timerSec, 'level ' + level + ' estimate ' + longest + ' exceeds timer ' + timerSec);
    const started = api.newSession(1_000_000, '2026-11-03', mulberry32(level), level);
    assert.strictEqual(started.deadline - started.startedAt, api.sessionMs(level));
  }
});

test('corrupt saved data falls back to a fresh store', () => {
  const r = api.loadStoreFromRaw('{not json', new Date());
  assert.ok(r.state && typeof r.state === 'object');
  assert.ok(r.notice);
  const r2 = api.loadStoreFromRaw('{"__proto__":{"polluted":true}}', new Date());
  assert.ok(r2.state);
  assert.strictEqual(vm.runInContext('({}).polluted', sandbox), undefined);
});
