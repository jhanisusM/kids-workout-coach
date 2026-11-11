'use strict';
/* Long-term progress store: old saves load cleanly, progress rules hold.
 * The fixtures in old-saves.json were produced by the real app.js from
 * main, PR #2 (session-template) and PR #3 (new-moves), mid-session. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const App = require(path.join(__dirname, '..', 'docs', 'app.js'));
const OLD = require(path.join(__dirname, 'fixtures', 'old-saves.json'));

function memoryStorage(init) {
  const data = new Map(Object.entries(init || {}));
  return {
    get length() { return data.size; },
    key: i => Array.from(data.keys())[i] || null,
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
    keys: () => Array.from(data.keys()),
  };
}

test('every earlier save loads with no notice and keeps level, sessions, days, and history', () => {
  Object.keys(OLD).forEach(name => {
    const raw = OLD[name];
    const r = App.loadStoreFromRaw(JSON.stringify(raw));
    assert.strictEqual(r.notice, null, name);
    assert.strictEqual(r.state.version, App.STORE_VERSION);
    assert.strictEqual(r.state.level, raw.phase, name);
    assert.ok(r.state.unlockedLevel >= r.state.level);
    Object.keys(raw.phaseSessions).forEach(l => assert.strictEqual(r.state.levelSessions[l], raw.phaseSessions[l], name));
    assert.deepStrictEqual(Object.keys(r.state.completions).sort(), Object.keys(raw.completions).filter(k => raw.completions[k]).sort(), name);
    assert.strictEqual(r.state.history.length, (raw.history || []).length, name);
  });
});

test('checklist-era fields are dropped quietly', () => {
  const r = App.loadStoreFromRaw(JSON.stringify(OLD['kids-new-moves']));
  assert.deepStrictEqual(Object.keys(r.state).sort(), ['completions', 'history', 'lastTheme', 'level', 'levelSessions', 'unlockedLevel', 'version']);
  assert.strictEqual(r.state.lastTheme, 'animal-parade');
  assert.strictEqual(r.changed, true);
});

test('a v4 save round-trips unchanged', () => {
  const first = App.loadStoreFromRaw(JSON.stringify(OLD['kids-main'])).state;
  const again = App.loadStoreFromRaw(JSON.stringify(first));
  assert.deepStrictEqual(again.state, first);
  assert.strictEqual(again.changed, false);
  assert.strictEqual(again.notice, null);
});

test('no save, or an empty one, starts fresh with no notice', () => {
  [null, ''].forEach(raw => {
    const r = App.loadStoreFromRaw(raw);
    assert.deepStrictEqual(r.state, App.defaultStore());
    assert.strictEqual(r.notice, null);
  });
});

test('broken JSON or a non-object resets with the reset notice', () => {
  ['{nope', '[]', '42', 'null', '"text"'].forEach(raw => {
    const r = App.loadStoreFromRaw(raw);
    assert.deepStrictEqual(r.state, App.defaultStore());
    assert.strictEqual(r.notice, App.NOTICE_CORRUPT, raw);
  });
});

test('one malformed field gives the soft notice and keeps the rest', () => {
  const raw = Object.assign({}, OLD['kids-main'], { completions: { '2026-11-03': true, 'yesterday': true } });
  const r = App.loadStoreFromRaw(JSON.stringify(raw));
  assert.strictEqual(r.notice, App.NOTICE_PARTIAL);
  assert.deepStrictEqual(Object.keys(r.state.completions), ['2026-11-03']);
  assert.strictEqual(r.state.level, 2);
});

test('backups keep only the newest three', () => {
  const storage = memoryStorage();
  [1, 2, 3, 4, 5].forEach(n => App.backupRaw(storage, 'raw' + n, n));
  assert.deepStrictEqual(storage.keys().sort(), ['kids-coach-v1.bak-3', 'kids-coach-v1.bak-4', 'kids-coach-v1.bak-5']);
});

test('a finished session logs the day once; a session with nothing done is not logged', () => {
  const s = App.defaultStore();
  const day = new Date(2026, 10, 10, 9);
  assert.deepStrictEqual(App.logFinished(s, { completed: 0, skipped: 20 }, day), { logged: false });
  assert.strictEqual(s.levelSessions[1], 0);
  App.logFinished(s, { completed: 5 }, day);
  App.logFinished(s, { completed: 20 }, new Date(2026, 10, 10, 18));
  assert.strictEqual(s.levelSessions[1], 1);
  assert.deepStrictEqual(s.completions, { '2026-11-10': true });
});

test('Advance unlocks after 6 sessions; down is always allowed; up only to unlocked levels', () => {
  const s = App.defaultStore();
  assert.strictEqual(App.chooseLevel(s, 2), false);
  assert.strictEqual(App.advance(s, 'now').ok, false);
  s.levelSessions[1] = App.SESSIONS_PER_LEVEL;
  assert.strictEqual(App.advance(s, 'now').ok, true);
  assert.strictEqual(s.level, 2);
  assert.strictEqual(App.chooseLevel(s, 1), true);
  assert.strictEqual(App.chooseLevel(s, 2), true);
  assert.strictEqual(App.chooseLevel(s, 3), false);
});

test('progress and the running session use separate keys', () => {
  assert.strictEqual(App.LS_KEY, 'kids-coach-v1');
  assert.notStrictEqual(App.SESSION_KEY, App.LS_KEY);
});


const KP = require(path.join(__dirname, '..', 'docs', 'program.js'));

test('the last picked theme is kept, and an unknown or missing value becomes Animal Parade with no notice', () => {
  const kept = App.loadStoreFromRaw(JSON.stringify({
    version: 5, level: 1, unlockedLevel: 1, levelSessions: { 1: 0, 2: 0, 3: 0 },
    completions: {}, history: [], lastTheme: 'jungle-explorer',
  }));
  assert.strictEqual(kept.notice, null);
  assert.strictEqual(kept.state.lastTheme, 'jungle-explorer');
  const missing = App.loadStoreFromRaw(JSON.stringify({
    version: 4, level: 2, unlockedLevel: 2, levelSessions: { 1: 6, 2: 0, 3: 0 },
    completions: { '2026-11-03': true }, history: [],
  }));
  assert.strictEqual(missing.notice, null);
  assert.strictEqual(missing.state.lastTheme, KP.DEFAULT_THEME);
  const unknown = App.loadStoreFromRaw(JSON.stringify({
    version: 5, level: 1, unlockedLevel: 1, levelSessions: { 1: 0, 2: 0, 3: 0 },
    completions: {}, history: [], lastTheme: 'pirate-ship',
  }));
  assert.strictEqual(unknown.notice, null);
  assert.strictEqual(unknown.state.lastTheme, KP.DEFAULT_THEME);
});
