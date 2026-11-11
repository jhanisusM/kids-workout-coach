'use strict';
/* Kids Workout Coach: host page for the guided session.
 *
 * Keeps long-term progress (level, sessions per level, trained days) in
 * localStorage under kids-coach-v1, separate from the engine's in-progress
 * session (kwc-guided-session-v1). Builds today's plan from KidsProgram and
 * hands it to SessionScreens. Load order: session-engine.js,
 * session-screens.js, program.js, app.js. */
(function (root) {
  const KP = root.KidsProgram || (typeof require === 'function' ? require('./program.js') : null);

  const LS_KEY = 'kids-coach-v1';
  const SESSION_KEY = 'kwc-guided-session-v1';
  const STORE_VERSION = 5;
  const BACKUP_KEEP = 3;
  const SESSIONS_PER_LEVEL = 6;
  const NOTICE_CORRUPT = 'Saved data could not be read, so progress was reset to a fresh start.';
  const NOTICE_PARTIAL = 'Some saved data could not be read and was reset. The rest of your progress was kept.';
  const BACKUP_NOTICE = 'A backup of your previous save was stored in this browser.';
  const NOTICE_SAVE_FAILED = 'This browser could not save your progress. Your workout still runs, but stars and levels may not be kept.';
  /* Honest length labels per level. Tests check that every generated
   * session's estimate sits inside its level's range. */
  const LEVEL_MINUTES = { 1: [16, 18], 2: [17, 21], 3: [19, 24] };
  const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---------- dates ---------- */
  function dayKey(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function parseDay(key) {
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function isDayKey(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    return dayKey(parseDay(key)) === key;
  }
  function weekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function hasOwn(raw, key) { return Object.prototype.hasOwnProperty.call(raw, key); }
  function normalizeLevel(level) {
    const n = Number(level);
    return n === 1 || n === 2 || n === 3 ? n : 1;
  }

  /* ---------- store ---------- */
  function defaultStore() {
    return { version: STORE_VERSION, level: 1, unlockedLevel: 1, levelSessions: { 1: 0, 2: 0, 3: 0 }, completions: {}, history: [], lastTheme: KP.DEFAULT_THEME };
  }

  function sanitizeLevel(raw, present) {
    if (!present) return { value: 1, repaired: false };
    const n = Number(raw);
    if (n === 1 || n === 2 || n === 3) return { value: n, repaired: false };
    return { value: 1, repaired: true };
  }
  function sanitizeCounts(raw, present) {
    const out = { 1: 0, 2: 0, 3: 0 };
    if (!present) return { value: out, repaired: false };
    if (!isPlainObject(raw)) return { value: out, repaired: true };
    let repaired = false;
    [1, 2, 3].forEach(id => {
      if (!hasOwn(raw, String(id))) return;
      const original = raw[id];
      const n = Number(original);
      const numeric = typeof original === 'number' || (typeof original === 'string' && original.trim() !== '');
      if (!numeric || !Number.isFinite(n)) { repaired = true; return; }
      out[id] = Math.max(0, Math.floor(n));
    });
    return { value: out, repaired: repaired };
  }
  function sanitizeCompletions(raw, present) {
    if (!present) return { value: {}, repaired: false };
    if (!isPlainObject(raw)) return { value: {}, repaired: true };
    const out = {};
    let repaired = false;
    Object.keys(raw).forEach(key => {
      if (!raw[key]) return;
      if (!isDayKey(key)) { repaired = true; return; }
      out[key] = true;
    });
    return { value: out, repaired: repaired };
  }
  function sanitizeHistory(raw, present) {
    if (!present || raw == null) return { value: [], repaired: false };
    if (!Array.isArray(raw)) return { value: [], repaired: true };
    const out = [];
    let repaired = false;
    raw.forEach(item => {
      const from = isPlainObject(item) ? Number(item.from) : NaN;
      const to = isPlainObject(item) ? Number(item.to) : NaN;
      if (!isPlainObject(item) || item.type !== 'advance' || [1, 2, 3].indexOf(from) === -1 || [1, 2, 3].indexOf(to) === -1) {
        repaired = true;
        return;
      }
      out.push({ type: 'advance', from: from, to: to, at: typeof item.at === 'string' ? item.at : null });
    });
    return { value: out, repaired: repaired };
  }

  /* Loads any save from the live app (v3, field names phase /
   * unlockedPhase / phaseSessions), guided v4, or this version (v5).
   * Long-term progress is kept. A missing or unknown last theme becomes
   * Animal Parade, with no notice. Checklist-era fields (session, checks,
   * collapsed, workoutDays, activeDay, symptoms, thirdDay, clearance) are
   * dropped quietly. Only fields that are present and malformed trigger
   * the partial notice. */
  function migrate(raw) {
    if (!isPlainObject(raw)) return { state: defaultStore(), changed: true, notice: NOTICE_CORRUPT };
    const v4 = raw.version === STORE_VERSION;
    const levelKey = v4 ? 'level' : 'phase';
    const unlockedKey = v4 ? 'unlockedLevel' : 'unlockedPhase';
    const countsKey = v4 ? 'levelSessions' : 'phaseSessions';
    const level = sanitizeLevel(raw[levelKey], hasOwn(raw, levelKey));
    const counts = sanitizeCounts(raw[countsKey], hasOwn(raw, countsKey));
    const completions = sanitizeCompletions(raw.completions, hasOwn(raw, 'completions'));
    const history = sanitizeHistory(raw.history, hasOwn(raw, 'history'));
    let unlocked = level.value;
    let unlockedRepaired = false;
    if (hasOwn(raw, unlockedKey)) {
      const n = Number(raw[unlockedKey]);
      if (n === 1 || n === 2 || n === 3) unlocked = Math.max(n, level.value);
      else unlockedRepaired = true;
    }
    const lastTheme = KP.normalizeTheme(raw.lastTheme);
    const repaired = level.repaired || counts.repaired || completions.repaired || history.repaired || unlockedRepaired;
    const state = {
      version: STORE_VERSION,
      level: level.value,
      unlockedLevel: unlocked,
      levelSessions: counts.value,
      completions: completions.value,
      history: history.value,
      lastTheme: lastTheme,
    };
    const changed = JSON.stringify(state) !== JSON.stringify(raw);
    return { state: state, changed: changed, notice: repaired ? NOTICE_PARTIAL : null };
  }

  function loadStoreFromRaw(rawString) {
    if (rawString == null || rawString === '') return { state: defaultStore(), changed: false, notice: null };
    let parsed;
    try { parsed = JSON.parse(rawString); } catch (e) {
      return { state: defaultStore(), changed: true, notice: NOTICE_CORRUPT };
    }
    return migrate(parsed);
  }

  function backupKeys(storage) {
    const prefix = LS_KEY + '.bak-';
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (typeof key === 'string' && key.indexOf(prefix) === 0 && Number.isFinite(Number(key.slice(prefix.length)))) keys.push(key);
    }
    return keys.sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
  }
  /* Before a notice-bearing load overwrites the save, keep the original
   * string as a backup, and keep only the newest few backups. */
  function backupRaw(storage, rawString, now) {
    storage.setItem(LS_KEY + '.bak-' + now, rawString);
    backupKeys(storage).slice(BACKUP_KEEP).forEach(k => storage.removeItem(k));
  }

  /* ---------- progress rules ---------- */
  /* Log a finished session. A day counts once toward the level. A session
   * where every exercise was skipped is not logged. */
  function logFinished(state, summary, today) {
    if (!summary || summary.completed < 1) return { logged: false };
    const day = dayKey(today);
    const already = !!state.completions[day];
    state.completions[day] = true;
    if (!already) state.levelSessions[state.level] = (state.levelSessions[state.level] || 0) + 1;
    return { logged: true, already: already, day: day };
  }
  function advanceDecision(state) {
    if (state.level >= 3) return { ok: false, reason: 'last-level' };
    const have = state.levelSessions[state.level] || 0;
    if (have < SESSIONS_PER_LEVEL) return { ok: false, reason: 'sessions', have: have };
    return { ok: true, next: state.level + 1 };
  }
  function advance(state, at) {
    const d = advanceDecision(state);
    if (!d.ok) return d;
    state.history.push({ type: 'advance', from: state.level, to: d.next, at: at });
    state.level = d.next;
    state.unlockedLevel = Math.max(state.unlockedLevel, d.next);
    return d;
  }
  /* Down is always allowed; up only to a level Advance already unlocked. */
  function chooseLevel(state, next) {
    const n = Number(next);
    if ([1, 2, 3].indexOf(n) === -1 || n === state.level) return false;
    if (n > state.unlockedLevel) return false;
    state.level = n;
    return true;
  }
  function levelLabel(level) {
    const m = LEVEL_MINUTES[normalizeLevel(level)];
    return 'About ' + m[0] + ' to ' + m[1] + ' minutes';
  }

  /* ---------- page ---------- */
  function boot(doc) {
    const win = doc.defaultView;
    /* Reading localStorage itself throws when the browser blocks storage;
     * every use below is guarded, so null just means nothing is kept. */
    let storage = null;
    try { storage = win.localStorage; } catch (e) { storage = null; }
    const $ = id => doc.getElementById(id);
    let raw = null;
    try { raw = storage.getItem(LS_KEY); } catch (e) { raw = null; }
    const loaded = loadStoreFromRaw(raw);
    const store = loaded.state;
    const notices = [];

    function showNotice(text) {
      if (notices.indexOf(text) === -1) notices.push(text);
      $('appNotice').textContent = notices.join(' ');
      $('appNotice').hidden = false;
    }
    function save() {
      try { storage.setItem(LS_KEY, JSON.stringify(store)); return true; } catch (e) {
        showNotice(NOTICE_SAVE_FAILED);
        return false;
      }
    }

    if (loaded.notice) {
      let backedUp = false;
      try { backupRaw(storage, raw, Date.now()); backedUp = true; } catch (e) { backedUp = false; }
      showNotice(loaded.notice + (backedUp ? ' ' + BACKUP_NOTICE : ''));
    }
    if (loaded.changed) save();

    function renderLevels() {
      doc.querySelectorAll('[data-level]').forEach(btn => {
        const id = Number(btn.getAttribute('data-level'));
        const locked = id > store.unlockedLevel;
        btn.classList.toggle('active', id === store.level);
        btn.setAttribute('aria-pressed', id === store.level ? 'true' : 'false');
        btn.disabled = locked;
        btn.querySelector('.level-lock').textContent = locked ? 'Locked' : '';
      });
      $('levelLabel').textContent = levelLabel(store.level) + ' at ' + KP.LEVELS[store.level - 1].name + '.';
      $('levelProgress').textContent = '';
      KP.LEVELS.forEach(l => {
        const n = Math.min(SESSIONS_PER_LEVEL, store.levelSessions[l.id] || 0);
        const li = doc.createElement('li');
        li.textContent = 'Level ' + l.id + ', ' + l.name + ': ' + n + ' of ' + SESSIONS_PER_LEVEL + ' sessions';
        $('levelProgress').appendChild(li);
      });
      const d = advanceDecision(store);
      $('advanceWrap').hidden = store.level >= 3;
      $('advanceBtn').disabled = !d.ok;
      $('advanceBtn').textContent = 'Advance to Level ' + Math.min(3, store.level + 1);
      $('advanceNote').textContent = d.ok
        ? SESSIONS_PER_LEVEL + ' sessions logged. Move up when the grown-up sees easy, clean form.'
        : 'Logged ' + (d.have || 0) + ' of ' + SESSIONS_PER_LEVEL + ' sessions at this level.';
    }
    function renderCalendar() {
      const grid = $('weekGrid');
      grid.textContent = '';
      const start = weekStart(new Date());
      const today = dayKey(new Date());
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dayKey(d);
        const done = !!store.completions[key];
        if (done) count++;
        const cell = doc.createElement('div');
        cell.className = 'day' + (key === today ? ' today' : '') + (done ? ' done' : '');
        cell.setAttribute('data-testid', 'calendar-day');
        [['dow', WEEKDAY_NAMES[i]], ['dnum', String(d.getDate())], ['dmark', done ? '\u2605 done' : '']].forEach(part => {
          const span = doc.createElement('span');
          span.className = part[0];
          span.textContent = part[1];
          cell.appendChild(span);
        });
        grid.appendChild(cell);
      }
      $('calProgress').textContent = count === 1 ? '1 day trained this week' : count + ' days trained this week';
    }

    const screens = root.SessionScreens.mount({
      root: $('session'),
      storage: storage,
      storageKey: SESSION_KEY,
      allowNewMix: true,
      getPlan: () => KP.buildSession({ level: store.level, theme: store.lastTheme }),
      onStatus: group => { doc.body.setAttribute('data-session', group); },
      onFinish: summary => {
        const result = logFinished(store, summary, new Date());
        if (result.logged) save();
        renderLevels();
        renderCalendar();
      },
    });

    function renderThemes() {
      const grid = $('themeGrid');
      if (!grid.childElementCount) {
        KP.THEMES.forEach(theme => {
          const btn = doc.createElement('button');
          btn.type = 'button';
          btn.className = 'theme-btn';
          btn.setAttribute('data-theme', theme.id);
          btn.setAttribute('data-testid', 'theme-btn-' + theme.id);
          const title = doc.createElement('strong');
          title.textContent = theme.name;
          const focus = doc.createElement('span');
          focus.textContent = theme.focus;
          btn.appendChild(title);
          btn.appendChild(focus);
          grid.appendChild(btn);
        });
      }
      grid.querySelectorAll('[data-theme]').forEach(btn => {
        const on = btn.getAttribute('data-theme') === store.lastTheme;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const theme = KP.themeById(store.lastTheme);
      $('themeIntro').textContent = theme.intro;
    }

    doc.addEventListener('click', ev => {
      const levelBtn = ev.target.closest('[data-level]');
      if (levelBtn && chooseLevel(store, levelBtn.getAttribute('data-level'))) {
        save();
        renderLevels();
        screens.refreshPlan();
      }
      const themeBtn = ev.target.closest('[data-theme]');
      if (themeBtn) {
        const next = KP.normalizeTheme(themeBtn.getAttribute('data-theme'));
        if (next !== store.lastTheme) {
          store.lastTheme = next;
          save();
          renderThemes();
          screens.refreshPlan();
        }
      }
    });
    $('advanceBtn').addEventListener('click', () => {
      if (!advance(store, new Date().toISOString()).ok) return;
      save();
      renderLevels();
      screens.refreshPlan();
    });

    renderLevels();
    renderThemes();
    renderCalendar();
    return { store: store, screens: screens };
  }

  const KidsApp = {
    LS_KEY: LS_KEY,
    SESSION_KEY: SESSION_KEY,
    STORE_VERSION: STORE_VERSION,
    SESSIONS_PER_LEVEL: SESSIONS_PER_LEVEL,
    LEVEL_MINUTES: LEVEL_MINUTES,
    NOTICE_CORRUPT: NOTICE_CORRUPT,
    NOTICE_PARTIAL: NOTICE_PARTIAL,
    defaultStore: defaultStore,
    migrate: migrate,
    loadStoreFromRaw: loadStoreFromRaw,
    backupRaw: backupRaw,
    logFinished: logFinished,
    advanceDecision: advanceDecision,
    advance: advance,
    chooseLevel: chooseLevel,
    levelLabel: levelLabel,
    boot: boot,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KidsApp;
  else {
    root.KidsApp = KidsApp;
    if (root.document) boot(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
