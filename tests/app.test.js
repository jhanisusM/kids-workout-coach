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
      assert.ok(highs.length <= 2);
      for (let h = 1; h < highs.length; h++) assert.ok(highs[h] - highs[h - 1] > 1);
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

test('corrupt saved data falls back to a fresh store', () => {
  const r = api.loadStoreFromRaw('{not json', new Date());
  assert.ok(r.state && typeof r.state === 'object');
  assert.ok(r.notice);
  const r2 = api.loadStoreFromRaw('{"__proto__":{"polluted":true}}', new Date());
  assert.ok(r2.state);
  assert.strictEqual(vm.runInContext('({}).polluted', sandbox), undefined);
});
