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

test('random session picks 5 distinct known moves', () => {
  for (let n = 0; n < 50; n++) {
    const ids = api.pickRandomExerciseIds ? api.pickRandomExerciseIds() : api.newSession(Date.now(), 'x').exerciseIds;
    assert.strictEqual(ids.length, 5);
    assert.strictEqual(new Set(ids).size, 5);
    ids.forEach(id => assert.ok(EXERCISES.some(e => e.id === id), id));
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

test('corrupt saved data falls back to a fresh store', () => {
  const r = api.loadStoreFromRaw('{not json', new Date());
  assert.ok(r.state && typeof r.state === 'object');
  assert.ok(r.notice);
  const r2 = api.loadStoreFromRaw('{"__proto__":{"polluted":true}}', new Date());
  assert.ok(r2.state);
  assert.strictEqual(vm.runInContext('({}).polluted', sandbox), undefined);
});
