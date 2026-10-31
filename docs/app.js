'use strict';
/* Adaptive Workout Coach: static GitHub Pages demo.
 *
 * Client-side session engine. Everything is stored in localStorage under
 * a single key. The timer uses ONE stored deadline:
 *   remaining = deadline - Date.now()
 * The deadline is written once at start (or re-anchored once at resume) and
 * never recomputed on reopen, so closing and reopening the browser can never
 * double-subtract elapsed time.
 *
 * Demo videos come from docs/video-library.js, loaded before this file.
 * To swap an exercise's videos, change only its demo_ids list. Never invent
 * a demo URL. Unknown ids are skipped.
 */

const SECTIONS = [
  { id: 'warmup',    title: 'Warm-up Play',                block: 'foundation' },
  { id: 'strength',  title: 'Strong Legs',                 block: 'accessory' },
  { id: 'stability', title: 'Tall Posture',                block: 'foundation' },
  { id: 'cooldown',  title: 'Cool-down Stretch',           block: 'foundation' },
];

/* Placeholder doses. The prompt was truncated before any set, rep, hold, or
 * week progression, so every dose string in this catalog is a stand-in
 * pending the PT's full program. */
const EXERCISES = [
  { id: 'march-in-place', section: 'warmup',
    name: 'March in place',
    note: 'Lift your knees high and swing your arms. Smile and march like a parade.',
    dose: '1 min', muscle_groups: ['legs', 'warm-up'],
    demo_ids: [],
    video_url: '' },
  { id: 'frog-jumps-small', section: 'warmup',
    name: 'Little frog jumps',
    note: 'Squat low like a frog, jump a little, and land soft with bent knees.',
    dose: '8 jumps', muscle_groups: ['thighs', 'jumping'],
    demo_ids: [],
    video_url: '' },
  { id: 'star-jumps', section: 'warmup',
    name: 'Star jumps',
    note: 'Jump up and spread your arms and legs like a star, then land soft.',
    dose: '10 jumps', muscle_groups: ['whole body', 'jumping'],
    demo_ids: [],
    video_url: '' },
  { id: 'frog-squats', section: 'strength',
    name: 'Frog squats',
    note: 'Feet wide, squat low like a frog, then stand tall. Keep your chest up.',
    dose: '2 x 8', muscle_groups: ['thighs'],
    demo_ids: [],
    video_url: '' },
  { id: 'wall-sit', section: 'strength',
    name: 'Wall sit hold',
    note: 'Back flat on the wall, slide down a little, and hold like a chair. Stop if your legs feel wobbly.',
    dose: '3 x 15 sec', muscle_groups: ['thighs', 'isometric'],
    demo_ids: [],
    video_url: '' },
  { id: 'horse-stance', section: 'strength',
    name: 'Horse stance hold',
    note: 'Feet wide, knees bent a little, back tall. Hold strong like a horse rider.',
    dose: '3 x 15 sec', muscle_groups: ['thighs', 'isometric'],
    demo_ids: [],
    video_url: '' },
  { id: 'glute-bridge-hold', section: 'strength',
    name: 'Glute bridge hold',
    note: 'Lie on your back, feet flat, lift your hips up and hold. Squeeze like you are holding a coin.',
    dose: '3 x 10 sec', muscle_groups: ['thighs', 'hips', 'isometric'],
    demo_ids: [],
    video_url: '' },
  { id: 'bear-crawl', section: 'strength',
    name: 'Bear crawl',
    note: 'Hands and feet on the floor, knees off the floor, crawl across the room and back.',
    dose: '2 times across', muscle_groups: ['thighs', 'arms', 'core'],
    demo_ids: [],
    video_url: '' },
  { id: 'plank-knees', section: 'stability',
    name: 'Plank on knees hold',
    note: 'On your knees and hands, make a straight line from head to knees. Breathe and hold.',
    dose: '3 x 15 sec', muscle_groups: ['posture', 'core', 'isometric'],
    demo_ids: [],
    video_url: '' },
  { id: 'superman-hold', section: 'stability',
    name: 'Superman hold',
    note: 'Lie on your tummy, lift your arms and legs like you are flying, and keep your head looking down.',
    dose: '3 x 10 sec', muscle_groups: ['posture', 'back', 'isometric'],
    demo_ids: [],
    video_url: '' },
  { id: 'wall-angels', section: 'stability',
    name: 'Wall angels',
    note: 'Back on the wall, arms up like a snow angel, slide them down slow. Keep your back tall.',
    dose: '2 x 8', muscle_groups: ['posture', 'shoulders'],
    demo_ids: [],
    video_url: '' },
  { id: 'butterfly-stretch', section: 'cooldown',
    name: 'Butterfly stretch',
    note: 'Sit tall, feet together, knees out like butterfly wings. Breathe slow.',
    dose: '30 sec', muscle_groups: ['stretch'],
    demo_ids: [],
    video_url: '' },
  { id: 'tall-stretch', section: 'cooldown',
    name: 'Tall stretch',
    note: 'Reach your arms high to the sky, stand on tiptoes if you want, then relax.',
    dose: '30 sec', muscle_groups: ['stretch', 'posture'],
    demo_ids: [],
    video_url: '' },
];

/* Resolve every exercise's demo_ids into full video objects from the video
 * library (video-library.js must be loaded before this file). Unknown ids
 * are skipped so one bad id cannot blank the page. video_url is one
 * YouTube link per exercise. The page shows it through youtube-nocookie.com. */
/* One demo link per exercise. A missing video_url stays empty. */
EXERCISES.forEach(function (ex) {
  if (typeof ex.video_url !== 'string') ex.video_url = '';
  ex.demos = resolveDemoList(ex.demo_ids);
});

/* 3 levels, 6 sessions per level, about 3 sessions per week.
 * A level entry can override the catalog dose. Week doses change one
 * variable at a time. All moves are bodyweight only, for kids 5 and older,
 * with a grown-up nearby. No videos are linked yet: every exercise has
 * empty demo_ids until a video is opened and checked as kid friendly.
 */
const SESSIONS_PER_PHASE = 6;

const PHASES = [
  {
    id: 1,
    name: 'Starter',
    weeks: 'Level 1',
    goal: 'Fun warm-up, strong legs, and tall posture. Bodyweight only, with a grown-up nearby.',
    exercises: [
      { exercise_id: 'march-in-place' },
      { exercise_id: 'frog-jumps-small' },
      { exercise_id: 'star-jumps' },
      { exercise_id: 'frog-squats' },
      { exercise_id: 'wall-sit' },
      { exercise_id: 'horse-stance' },
      { exercise_id: 'glute-bridge-hold' },
      { exercise_id: 'bear-crawl' },
      { exercise_id: 'plank-knees' },
      { exercise_id: 'superman-hold' },
      { exercise_id: 'wall-angels' },
      { exercise_id: 'butterfly-stretch' },
      { exercise_id: 'tall-stretch' },
    ],
  },
  {
    id: 2,
    name: 'Stronger',
    weeks: 'Level 2',
    goal: 'Longer holds and a few more reps. Same moves, stronger legs.',
    exercises: [
      { exercise_id: 'march-in-place' },
      { exercise_id: 'frog-jumps-small', dose: '10 jumps' },
      { exercise_id: 'star-jumps', dose: '12 jumps' },
      { exercise_id: 'frog-squats', dose: '2 x 10' },
      { exercise_id: 'wall-sit', dose: '3 x 20 sec' },
      { exercise_id: 'horse-stance', dose: '3 x 20 sec' },
      { exercise_id: 'glute-bridge-hold', dose: '3 x 15 sec' },
      { exercise_id: 'bear-crawl', dose: '3 times across' },
      { exercise_id: 'plank-knees', dose: '3 x 20 sec' },
      { exercise_id: 'superman-hold', dose: '3 x 15 sec' },
      { exercise_id: 'wall-angels', dose: '2 x 10' },
      { exercise_id: 'butterfly-stretch' },
      { exercise_id: 'tall-stretch' },
    ],
  },
  {
    id: 3,
    name: 'Superhero',
    weeks: 'Level 3',
    goal: 'The longest holds. You are a posture superhero.',
    exercises: [
      { exercise_id: 'march-in-place' },
      { exercise_id: 'frog-jumps-small', dose: '12 jumps' },
      { exercise_id: 'star-jumps', dose: '15 jumps' },
      { exercise_id: 'frog-squats', dose: '3 x 8' },
      { exercise_id: 'wall-sit', dose: '3 x 30 sec' },
      { exercise_id: 'horse-stance', dose: '3 x 30 sec' },
      { exercise_id: 'glute-bridge-hold', dose: '3 x 20 sec' },
      { exercise_id: 'bear-crawl', dose: '3 times across' },
      { exercise_id: 'plank-knees', dose: '3 x 30 sec' },
      { exercise_id: 'superman-hold', dose: '3 x 20 sec' },
      { exercise_id: 'wall-angels', dose: '3 x 8' },
      { exercise_id: 'butterfly-stretch' },
      { exercise_id: 'tall-stretch' },
    ],
  },
];

/* Shared checks stay on the same ids so older saves still match.
 * Level 1 adds frog squats and wall sit without rushing. Level 2 adds
 * plank and superman with good shape. Level 3 adds finishing the whole
 * Superhero level. Fun checks only, no medical gating. */
const SHARED_CHECKLIST = [
  { id: 'all-moves', label: 'Finished every move in the session' },
  { id: 'tall-back', label: 'Kept my back tall during posture moves' },
  { id: 'told-grownup', label: 'Stopped and told a grown-up if anything hurt' },
];

const PHASE_CHECKLISTS = {
  1: SHARED_CHECKLIST.concat([
    { id: 'frog-and-wall', label: 'Did frog squats and wall sit without rushing' },
  ]),
  2: SHARED_CHECKLIST.concat([
    { id: 'super-hold', label: 'Held plank and superman with good shape' },
  ]),
  3: SHARED_CHECKLIST.concat([
    { id: 'superhero-finish', label: 'Finished the whole Superhero level' },
  ]),
};

const EXERCISE_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

function checklistForPhase(phaseId) {
  return PHASE_CHECKLISTS[normalizePhase(phaseId)] || null;
}

/* Resolve a phase into its concrete program. `week` selects doses[week]
 * when that entry exists; otherwise the phase dose, then the catalog dose. */
function resolvePhase(phaseId, week) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) throw new Error('unknown phase: ' + phaseId);
  const exercises = phase.exercises.map((entry, i) => {
    const base = EXERCISE_BY_ID.get(entry.exercise_id);
    if (!base) throw new Error('unknown exercise in phase ' + phaseId + ': ' + entry.exercise_id);
    let note = entry.note !== undefined ? entry.note : base.note;
    if (entry.note_append) note = note + ' ' + entry.note_append;
    return {
      id: base.id, section: base.section, name: base.name, note,
      dose: doseForEntry(entry, base, week),
      muscle_groups: base.muscle_groups, demos: base.demos, order: i,
      video_url: typeof base.video_url === 'string' ? base.video_url : '',
      loaded_knee_flexion: base.loaded_knee_flexion === true,
    };
  });
  return {
    id: phase.id, name: phase.name, weeks: phase.weeks, goal: phase.goal,
    sessions_target: SESSIONS_PER_PHASE, exercises,
  };
}

function doseForEntry(entry, base, week) {
  const w = Number(week);
  if ((w === 1 || w === 2 || w === 3) && entry.doses && entry.doses[w] != null && entry.doses[w] !== '') {
    return entry.doses[w];
  }
  if (entry.dose !== undefined) return entry.dose;
  return base.dose;
}

/* Week 1 is sessions 0-2, week 2 is 3-5, week 3 is 6 and above.
 * The count is the real (uncapped) number of sessions that still count. */
function phaseWeek(sessionCount) {
  const n = Math.max(0, Math.floor(Number(sessionCount) || 0));
  return Math.min(3, Math.floor(n / 3) + 1);
}

/* ---------------- Constants & store ---------------- */
const SESSION_MS = 20 * 60 * 1000;
const LS_KEY = 'kids-coach-v1';
const STORE_VERSION = 3;
const BACKUP_KEEP = 3;
const NOTICE_CORRUPT = 'Saved data could not be read, so progress was reset to a fresh start.';
const NOTICE_PARTIAL = 'Some saved data was unreadable and was reset. The rest of your progress was kept.';
const BACKUP_NOTICE = 'A backup of your previous save was stored in this browser.';
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_WORKOUT_DAYS = [2, 4];

let bootNotice = null;
let bootDirty = false;
let bootRaw = null;
let bootNeedsBackup = false;
let renderedDayKey = null;
let pendingPhase = null;
let pendingPhaseMessage = null;
let pendingAdvance = false;
let checkinMode = null;
let booted = false;
let messageTimer = null;

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
function prettyDay(key) {
  const d = parseDay(key);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function normalizeWorkoutDays(days) {
  if (!Array.isArray(days)) return null;
  const out = [];
  days.forEach(function (d) {
    const n = Number(d);
    if (Number.isInteger(n) && n >= 0 && n <= 6 && out.indexOf(n) === -1) out.push(n);
  });
  out.sort(function (a, b) { return a - b; });
  return out.length ? out : null;
}
function workoutDaysFromThird(thirdDay) {
  if (thirdDay === 'fri-morning' || thirdDay === 'fri-night') return [2, 4, 5];
  if (thirdDay === 'sat-morning') return [2, 4, 6];
  return DEFAULT_WORKOUT_DAYS.slice();
}
function daysOf(workoutDays) {
  return normalizeWorkoutDays(workoutDays) || DEFAULT_WORKOUT_DAYS.slice();
}
function isGymDow(dow, workoutDays) {
  return daysOf(workoutDays).indexOf(dow) !== -1;
}
function isGymDay(date, workoutDays) {
  return isGymDow(date.getDay(), workoutDays);
}
function isGymDayKey(key, workoutDays) {
  return isDayKey(key) && isGymDay(parseDay(key), workoutDays);
}
function nextGymDay(fromDate, workoutDays) {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 14; i++) {
    if (isGymDay(d, workoutDays)) return dayKey(d);
    d.setDate(d.getDate() + 1);
  }
  return dayKey(fromDate);
}
function weekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function weekDayKeys(today) {
  const todayDate = today instanceof Date ? today : new Date(today);
  const start = weekStart(todayDate);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    keys.push(dayKey(d));
  }
  return keys;
}
/* Keep a day that is still in the visible week. Otherwise use today when it
 * is a workout day, or the next workout day. */
function resolveActiveDay(activeDay, today, workoutDays) {
  const todayDate = today instanceof Date ? today : new Date(today);
  if (isDayKey(activeDay) && weekDayKeys(todayDate).indexOf(activeDay) !== -1) return activeDay;
  if (isGymDay(todayDate, workoutDays)) return dayKey(todayDate);
  return nextGymDay(todayDate, workoutDays);
}
function rolloverActiveDay(state, now) {
  const today = now instanceof Date ? now : new Date(now);
  const next = resolveActiveDay(state.activeDay, today, state.workoutDays);
  const changed = next !== state.activeDay;
  if (changed) state.activeDay = next;
  return { changed: changed, activeDay: state.activeDay, todayKey: dayKey(today) };
}
function workoutDaySelection(state, workoutDays, today) {
  const nextDays = normalizeWorkoutDays(workoutDays) || daysOf(state.workoutDays);
  let activeDay = state.activeDay;
  if (!sessionIsActive(state.session) && !isGymDayKey(activeDay, nextDays)) {
    activeDay = resolveActiveDay(null, today, nextDays);
  }
  return { workoutDays: nextDays, activeDay: activeDay };
}
function normalizePhase(phase) {
  const n = Number(phase);
  return PHASES.some(p => p.id === n) ? n : 1;
}
function sessionIsActive(session) {
  return !!(session && (session.state === 'running' || session.state === 'paused' || session.state === 'expired'));
}
function shouldExpireOnLoad(session, now) {
  return !!(session && session.state === 'running' && typeof session.deadline === 'number' && session.deadline - now <= 0);
}
function expireIfDue(state, now) {
  const s = state.session;
  if (!shouldExpireOnLoad(s, now)) return false;
  state.session = {
    state: 'expired',
    startedAt: typeof s.startedAt === 'number' ? s.startedAt : s.deadline - SESSION_MS,
    deadline: s.deadline,
    remainingMs: 0,
    day: s.day,
  };
  return true;
}
function remainingMs(session, now) {
  const s = session === undefined ? store.session : session;
  const t = typeof now === 'number' ? now : Date.now();
  if (!s) return SESSION_MS;
  if (s.state === 'paused' || s.state === 'expired') return Math.max(0, s.remainingMs || 0);
  return Math.max(0, s.deadline - t);
}
function canStartSession(state) {
  const session = state.session;
  if (session && session.state === 'paused') return { ok: true, action: 'resume' };
  if (session && session.state === 'running') return { ok: false, reason: 'already-running' };
  if (session && session.state === 'expired') return { ok: false, reason: 'expired' };
  if (!isGymDayKey(state.activeDay, state.workoutDays)) return { ok: false, reason: 'not-gym-day' };
  return { ok: true, action: 'start' };
}
function programExerciseIds(phaseId) {
  return resolvePhase(normalizePhase(phaseId)).exercises.map(e => e.id);
}
function toggleCheckState(state, id) {
  if (!sessionIsActive(state.session)) return { ok: false, reason: 'no-session' };
  if (!isPlainObject(state.checks)) state.checks = {};
  if (state.checks[id]) delete state.checks[id];
  else state.checks[id] = true;
  const allDone = programExerciseIds(state.phase).every(eid => !!state.checks[eid]);
  return { ok: true, allChecked: allDone };
}
/* Log the session day once. A session that already started keeps its own day,
 * even if that weekday is turned off before Finish. Refuses a missing session
 * or a day that is not a real date. Does not mutate state when it refuses. */
function applyCompletion(state) {
  const session = state.session;
  if (!sessionIsActive(session)) return { ok: false, reason: 'no-session' };
  const day = session.day;
  if (!isDayKey(day)) return { ok: false, reason: 'not-gym-day', day: day };
  const phase = normalizePhase(state.phase);
  if (!isPlainObject(state.completions)) state.completions = {};
  if (!isPlainObject(state.phaseSessions)) state.phaseSessions = { 1: 0, 2: 0, 3: 0 };
  const already = !!state.completions[day];
  state.completions[day] = true;
  if (!already) state.phaseSessions[phase] = (Number(state.phaseSessions[phase]) || 0) + 1;
  state.session = null;
  state.checks = {};
  return { ok: true, already: already, day: day, phase: phase };
}
function unlockedPhaseOf(state) {
  const current = normalizePhase(state.phase);
  const n = Number(state.unlockedPhase);
  const unlocked = (n === 1 || n === 2 || n === 3) ? n : current;
  return Math.max(current, unlocked);
}
/* Moving down is always allowed. Moving up to a phase Advance has already
 * unlocked is allowed. Anything past that goes through advancePhase. */
function phaseChangeDecision(state, nextPhase) {
  const current = normalizePhase(state.phase);
  const next = Number(nextPhase);
  if (!PHASES.some(p => p.id === next)) return { action: 'noop' };
  if (next === current) return { action: 'noop' };
  if (next > current && next > unlockedPhaseOf(state)) return { action: 'advance' };
  if (sessionIsActive(state.session)) return { action: 'confirm', phase: next };
  return { action: 'apply', phase: next };
}
function applyPhaseChange(state, nextPhase) {
  const next = Number(nextPhase);
  if (!PHASES.some(p => p.id === next)) return state;
  state.phase = next;
  state.session = null;
  state.checks = {};
  return state;
}
function checklistReady(checklist, phaseId) {
  const items = checklistForPhase(phaseId);
  if (!items || !items.length) return false;
  const c = (checklist && checklist[String(phaseId)]) || {};
  return items.every(item => c[item.id] === true);
}
/* Kids version: no medical symptom gating. All sessions count. */
function symptomFlagged(record) {
  return false;
}
function symptomStatus(record) {
  return 'clean';
}
function symptomRecords(state, phaseId) {
  const symptoms = state && isPlainObject(state.symptoms) ? state.symptoms : {};
  const phase = phaseId == null ? null : normalizePhase(phaseId);
  return Object.keys(symptoms).filter(isDayKey).sort().map(day => {
    return { day: day, record: symptoms[day] };
  }).filter(row => {
    if (!isPlainObject(row.record)) return false;
    if (phase == null) return true;
    return Number(row.record.phase) === phase;
  });
}
/* Kids version: every logged session counts toward the week. */
function weekCredit(state, phaseId) {
  const phase = normalizePhase(phaseId);
  const total = Math.max(0, Math.floor(Number(state.phaseSessions && state.phaseSessions[phase]) || 0));
  const held = symptomRecords(state, phase).filter(row => {
    const status = symptomStatus(row.record);
    return status === 'flag' || status === 'pending';
  }).length;
  return Math.max(0, total - held);
}
function programWeek(state, phaseId) {
  return phaseWeek(weekCredit(state, phaseId));
}
/* Kids version: no lock from medical flags. */
function consecutiveFlagLock(state, phaseId) {
  const rows = symptomRecords(state, phaseId).filter(row => symptomStatus(row.record) !== 'pending');
  if (rows.length < 2) return false;
  return symptomStatus(rows[rows.length - 1].record) === 'flag'
    && symptomStatus(rows[rows.length - 2].record) === 'flag';
}
function advanceDecision(state) {
  const phase = normalizePhase(state.phase);
  if (phase >= 3) return { ok: false, reason: 'last-phase' };
  const have = Math.max(0, Math.floor(Number(state.phaseSessions && state.phaseSessions[phase]) || 0));
  if (have < SESSIONS_PER_PHASE) return { ok: false, reason: 'sessions', have: have, need: SESSIONS_PER_PHASE };
  if (!checklistReady(state.checklist, phase)) return { ok: false, reason: 'checklist' };
  if (consecutiveFlagLock(state, phase)) return { ok: false, reason: 'symptoms' };
  return { ok: true, next: phase + 1 };
}
function grantAdvance(state, at) {
  const decision = advanceDecision(state);
  if (!decision.ok) return decision;
  const from = normalizePhase(state.phase);
  const priorUnlock = unlockedPhaseOf(state);
  applyPhaseChange(state, decision.next);
  state.unlockedPhase = Math.max(priorUnlock, decision.next);
  if (!Array.isArray(state.history)) state.history = [];
  state.history.push({
    type: 'advance',
    from: from,
    to: decision.next,
    at: at == null ? null : String(at),
  });
  return { ok: true, from: from, to: decision.next };
}
function advanceReason(decision) {
  if (!decision || decision.ok) return 'Checklist complete and 9 sessions logged. Advance when you are ready.';
  if (decision.reason === 'sessions') {
    const have = Math.max(0, Math.floor(Number(decision.have) || 0));
    if (have >= SESSIONS_PER_PHASE) return 'This level has reached 6 of 6 sessions.';
    return 'Logged ' + have + ' of 6 sessions in this level. Advance stays off until you reach 6.';
  }
  if (decision.reason === 'checklist') return 'Confirm every checklist item before advancing.';
  if (decision.reason === 'symptoms') {
    return 'Advance is paused. Ask a grown-up before moving on.';
  }
  return '';
}
function symptomAdvice(state) {
  return '';
}
/* Kids version: no next-morning check-in. This always returns null. */
function pendingMorning(state, today) {
  return null;
}


function defaultStore(now) {
  const today = now instanceof Date ? now : new Date();
  return {
    version: STORE_VERSION,
    session: null,
    checks: {},
    collapsed: {},
    workoutDays: DEFAULT_WORKOUT_DAYS.slice(),
    completions: {},
    activeDay: dayKey(today),
    phase: 1,
    phaseSessions: { 1: 0, 2: 0, 3: 0 },
    checklist: {},
    unlockedPhase: 1,
    symptoms: {},
    history: [],
  };
}

function sanitizePhase(raw, present) {
  if (!present) return { value: 1, repaired: false };
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return { value: n, repaired: false };
  return { value: 1, repaired: true };
}
function sanitizePhaseSessions(raw, present) {
  const out = { 1: 0, 2: 0, 3: 0 };
  if (!present) return { value: out, repaired: false, changed: true };
  if (!isPlainObject(raw)) return { value: out, repaired: true, changed: true };
  let repaired = false;
  let changed = false;
  [1, 2, 3].forEach(id => {
    if (!Object.prototype.hasOwnProperty.call(raw, String(id))) { changed = true; return; }
    const original = raw[id];
    const n = Number(original);
    const numeric = typeof original === 'number' || (typeof original === 'string' && original.trim() !== '');
    if (!numeric || !Number.isFinite(n)) {
      repaired = true;
      changed = true;
      return;
    }
    let count = Math.floor(n);
    if (count < 0) count = 0;
    if (count !== n || count !== original) changed = true;
    out[id] = count;
  });
  Object.keys(raw).forEach(key => {
    if (key !== '1' && key !== '2' && key !== '3') changed = true;
  });
  return { value: out, repaired: repaired, changed: changed };
}
function sanitizeFlagMap(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  Object.keys(raw).forEach(key => { if (raw[key]) out[key] = true; });
  return { value: out, repaired: false };
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
function sanitizeChecklist(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  let repaired = false;
  Object.keys(raw).forEach(phaseKey => {
    const bucket = raw[phaseKey];
    if (!isPlainObject(bucket)) { repaired = true; return; }
    const clean = {};
    Object.keys(bucket).forEach(item => { if (bucket[item]) clean[item] = true; });
    out[phaseKey] = clean;
  });
  return { value: out, repaired: repaired };
}
function sanitizeActiveDay(raw, present, today) {
  if (!present) return { value: dayKey(today), repaired: false };
  if (!isDayKey(raw)) return { value: dayKey(today), repaired: true };
  return { value: raw, repaired: false };
}
function sanitizeWorkoutDays(raw, present, thirdDay) {
  if (present) {
    const parsed = normalizeWorkoutDays(raw);
    if (!parsed) return { value: workoutDaysFromThird(thirdDay), repaired: true, changed: true };
    const same = Array.isArray(raw) && raw.length === parsed.length && raw.every(function (n, i) { return n === parsed[i]; });
    return { value: parsed, repaired: !same, changed: !same };
  }
  const known = thirdDay == null || thirdDay === 'none' || thirdDay === 'fri-morning' || thirdDay === 'fri-night' || thirdDay === 'sat-morning';
  return { value: workoutDaysFromThird(thirdDay), repaired: thirdDay != null && !known, changed: true };
}
function sanitizeSession(raw, present) {
  if (!present || raw == null) return { value: null, repaired: false };
  if (!isPlainObject(raw)) return { value: null, repaired: true };
  const state = raw.state;
  if (state !== 'running' && state !== 'paused' && state !== 'expired') return { value: null, repaired: true };
  if (typeof raw.deadline !== 'number' || !Number.isFinite(raw.deadline)) return { value: null, repaired: true };
  if (!isDayKey(raw.day)) return { value: null, repaired: true };
  let remaining = null;
  let repaired = false;
  if (Object.prototype.hasOwnProperty.call(raw, 'remainingMs') && raw.remainingMs != null) {
    if (typeof raw.remainingMs === 'number' && Number.isFinite(raw.remainingMs)) remaining = raw.remainingMs;
    else repaired = true;
  }
  const startedAt = (typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt))
    ? raw.startedAt
    : raw.deadline - SESSION_MS;
  return {
    value: { state: state, startedAt: startedAt, deadline: raw.deadline, remainingMs: remaining, day: raw.day },
    repaired: repaired,
  };
}
function sanitizeSymptoms(raw, present) {
  return { value: {}, repaired: false };
}
function sanitizeHistory(raw, present) {
  if (!present || raw == null) return { value: [], repaired: false };
  if (!Array.isArray(raw)) return { value: [], repaired: true };
  const out = [];
  let repaired = false;
  raw.forEach(item => {
    if (!isPlainObject(item) || item.type !== 'advance') { repaired = true; return; }
    const from = Number(item.from);
    const to = Number(item.to);
    if ((from !== 1 && from !== 2 && from !== 3) || (to !== 1 && to !== 2 && to !== 3)) {
      repaired = true;
      return;
    }
    const at = typeof item.at === 'string' ? item.at : null;
    if (item.at != null && typeof item.at !== 'string') repaired = true;
    const extra = Object.keys(item).some(key => key !== 'type' && key !== 'from' && key !== 'to' && key !== 'at');
    if (extra || item.from !== from || item.to !== to) repaired = true;
    out.push({ type: 'advance', from: from, to: to, at: at });
  });
  return { value: out, repaired: repaired };
}
function hasOwn(raw, key) {
  return Object.prototype.hasOwnProperty.call(raw, key);
}

/* v1 (no version) and v2 -> v3. Validates each field, keeps good progress,
 * and grandfathers unlockedPhase at the current phase. Session counts are
 * kept as stored, including totals above 9. An older third-day choice becomes
 * workoutDays. Clearance is dropped and does not block Start. Corrupt roots
 * become a fresh store plus a one-time notice. */
function migrate(raw, now) {
  const today = now instanceof Date ? now : new Date();
  if (!isPlainObject(raw)) {
    return { state: defaultStore(today), changed: true, notice: NOTICE_CORRUPT };
  }
  let repaired = false;
  let changed = raw.version !== STORE_VERSION;

  const phaseInfo = sanitizePhase(raw.phase, hasOwn(raw, 'phase'));
  if (phaseInfo.repaired) repaired = true;
  if (!hasOwn(raw, 'phase') || phaseInfo.repaired) changed = true;
  const phase = phaseInfo.value;

  let unlocked = phase;
  if (!hasOwn(raw, 'unlockedPhase')) changed = true;
  else {
    const n = Number(raw.unlockedPhase);
    if (n === 1 || n === 2 || n === 3) unlocked = n;
    else { repaired = true; changed = true; }
  }
  if (unlocked < phase) { unlocked = phase; changed = true; }

  const sessionsInfo = sanitizePhaseSessions(raw.phaseSessions, hasOwn(raw, 'phaseSessions'));
  if (sessionsInfo.repaired) repaired = true;
  if (sessionsInfo.changed) changed = true;

  const checksInfo = sanitizeFlagMap(raw.checks, hasOwn(raw, 'checks'));
  const collapsedInfo = sanitizeFlagMap(raw.collapsed, hasOwn(raw, 'collapsed'));
  const completionsInfo = sanitizeCompletions(raw.completions, hasOwn(raw, 'completions'));
  const checklistInfo = sanitizeChecklist(raw.checklist, hasOwn(raw, 'checklist'));
  const dayInfo = sanitizeActiveDay(raw.activeDay, hasOwn(raw, 'activeDay'), today);
  const daysInfo = sanitizeWorkoutDays(raw.workoutDays, hasOwn(raw, 'workoutDays'), raw.thirdDay);
  const sessionInfo = sanitizeSession(raw.session, hasOwn(raw, 'session'));
  const symptomsInfo = sanitizeSymptoms(raw.symptoms, hasOwn(raw, 'symptoms'));
  const historyInfo = sanitizeHistory(raw.history, hasOwn(raw, 'history'));

  [checksInfo, collapsedInfo, completionsInfo, checklistInfo, dayInfo, daysInfo, sessionInfo, symptomsInfo, historyInfo].forEach(info => {
    if (info.repaired) repaired = true;
  });
  if (daysInfo.changed) changed = true;
  if (hasOwn(raw, 'thirdDay') || hasOwn(raw, 'clearance')) changed = true;
  if (!hasOwn(raw, 'checks') || !hasOwn(raw, 'collapsed') || !hasOwn(raw, 'completions') ||
      !hasOwn(raw, 'checklist') || !hasOwn(raw, 'activeDay') || !hasOwn(raw, 'workoutDays') ||
      !hasOwn(raw, 'session') || !hasOwn(raw, 'symptoms') || !hasOwn(raw, 'history')) {
    changed = true;
  }

  if (repaired) changed = true;
  return {
    state: {
      version: STORE_VERSION,
      session: sessionInfo.value,
      checks: checksInfo.value,
      collapsed: collapsedInfo.value,
      workoutDays: daysInfo.value,
      completions: completionsInfo.value,
      activeDay: dayInfo.value,
      phase: phase,
      phaseSessions: sessionsInfo.value,
      checklist: checklistInfo.value,
      unlockedPhase: unlocked,
      symptoms: symptomsInfo.value,
      history: historyInfo.value,
    },
    changed: changed,
    notice: repaired ? NOTICE_PARTIAL : null,
  };
}

function loadStoreFromRaw(rawString, now) {
  if (rawString == null || rawString === '') {
    return { state: defaultStore(now), changed: false, notice: null };
  }
  try {
    return migrate(JSON.parse(rawString), now);
  } catch (e) {
    return { state: defaultStore(now), changed: true, notice: NOTICE_CORRUPT };
  }
}

function rawBackupKey(now) {
  const stamp = typeof now === 'number' ? now : Date.now();
  return LS_KEY + '.bak-' + stamp;
}
/* Copy the original saved string before the first write that replaces it. */
function backupRawBeforeSave(storage, rawString, now) {
  const key = rawBackupKey(now);
  storage.setItem(key, rawString);
  return key;
}
function backupStamp(key) {
  const prefix = LS_KEY + '.bak-';
  if (typeof key !== 'string' || key.indexOf(prefix) !== 0) return null;
  const n = Number(key.slice(prefix.length));
  return Number.isFinite(n) ? n : null;
}
function listBackupKeys(storage) {
  const keys = [];
  if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') return keys;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (backupStamp(key) != null) keys.push(key);
  }
  keys.sort((a, b) => backupStamp(b) - backupStamp(a));
  return keys;
}
/* Keep the newest backups and drop the rest. */
function pruneBackups(storage, keep) {
  const limit = keep == null ? BACKUP_KEEP : keep;
  const keys = listBackupKeys(storage);
  const removed = [];
  keys.slice(Math.max(0, limit)).forEach(key => {
    storage.removeItem(key);
    removed.push(key);
  });
  return { kept: keys.slice(0, Math.max(0, limit)), removed: removed };
}
/* The on-screen target and any later goal check stop at 9. Storage does not. */
function cappedSessionCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(SESSIONS_PER_PHASE, Math.floor(n));
}

function loadStore() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return defaultStore();
    const raw = localStorage.getItem(LS_KEY);
    bootRaw = raw;
    const result = loadStoreFromRaw(raw, new Date());
    bootNotice = result.notice;
    bootDirty = result.changed;
    bootNeedsBackup = !!result.notice && raw != null && raw !== '';
    return result.state;
  } catch (e) {
    return defaultStore();
  }
}

function getResolveVideo() {
  if (typeof resolveVideo === 'function') return resolveVideo;
  if (typeof require === 'function') {
    try {
      const lib = require('./video-library.js');
      if (lib && typeof lib.resolveVideo === 'function') return lib.resolveVideo;
    } catch (err) { /* library missing: demos stay empty */ }
  }
  return function () { return null; };
}
/* Unknown or throwing ids are skipped. One bad id must not blank the page. */
function resolveDemoList(ids, resolve) {
  const fn = resolve || getResolveVideo();
  const out = [];
  const list = Array.isArray(ids) ? ids : [];
  list.forEach(id => {
    let video = null;
    try { video = fn(id); }
    catch (err) {
      if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn(err && err.message ? err.message : 'unknown video id: ' + id);
      }
    }
    if (video && typeof video === 'object' && video.url) out.push(video);
  });
  return out;
}

const store = loadStore();
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

/* ---------------- Helpers ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtTime(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function currentPhaseId() {
  return normalizePhase(store.phase);
}
function currentProgram() {
  const phase = currentPhaseId();
  return resolvePhase(phase, programWeek(store, phase)).exercises;
}
function checkedCount() {
  return currentProgram().filter(e => store.checks[e.id]).length;
}
function allChecked() {
  return currentProgram().every(e => store.checks[e.id]);
}
function gymDows() {
  return daysOf(store.workoutDays);
}
function showMessage(text) {
  const el = $('sessionMessage');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

/* ---------------- Session lifecycle ---------------- */
function startSession() {
  const decision = canStartSession(store);
  if (!decision.ok) {
    if (decision.reason === 'not-gym-day') {
      showMessage('Pick a workout day before starting. Rest days are not logged.');
    }
    return;
  }
  if (decision.action === 'resume') { resumeSession(); return; }
  if (decision.action !== 'start') return;
  const now = Date.now();
  store.session = {
    state: 'running',
    startedAt: now,
    deadline: now + SESSION_MS,
    remainingMs: null,
    day: store.activeDay,
  };
  save();
  renderAll();
  showMessage('Session started: 20:00 on the clock.');
}

function pauseSession() {
  const s = store.session;
  if (!s || s.state !== 'running') return;
  s.remainingMs = Math.max(0, s.deadline - Date.now());
  s.state = 'paused';
  save();
  renderAll();
}

function resumeSession() {
  const s = store.session;
  if (!s || s.state !== 'paused') return;
  s.deadline = Date.now() + Math.max(0, s.remainingMs || 0);
  s.remainingMs = null;
  s.state = 'running';
  save();
  renderAll();
}

function hideCheckin() {
  checkinMode = null;
  // Kids version: no check-in modal exists.
}

function endSession(message) {
  store.session = null;
  store.checks = {};
  pendingPhase = null;
  pendingPhaseMessage = null;
  pendingAdvance = false;
  hideCheckin();
  save();
  renderAll();
  if (message) showMessage(message);
}

function offerExpiryChoice() {
  if (!expireIfDue(store, Date.now())) return false;
  save();
  renderAll();
  const expiryText = 'Time is up. Log this workout anyway, or discard it.';
  if (bootNotice) {
    showMessage(bootNotice + ' ' + expiryText);
    bootNotice = null;
  } else {
    showMessage(expiryText);
  }
  return true;
}

function discardExpired() {
  endSession('Session discarded. Nothing was logged.');
}

function openFinishCheckin() {
  if (!sessionIsActive(store.session)) {
    showMessage('Start a session before logging a workout.');
    renderAll();
    return;
  }
  if (!isDayKey(store.session.day)) {
    showMessage('Nothing was logged. This program does not train on that day.');
    return;
  }
  const result = applyCompletion(store);
  save();
  renderAll();
  showMessage(result.already
    ? 'Already logged for ' + prettyDay(result.day) + '. This day counts once. You earned a star!'
    : 'Workout complete: logged for ' + prettyDay(result.day) + '. You earned a star!');
}

function toggleCheck(id) {
  const result = toggleCheckState(store, id);
  if (!result.ok) {
    showMessage('Start a session before checking off exercises.');
    renderAll();
    return;
  }
  save();
  renderAll();
}

function requestClear() { $('clearConfirm').classList.add('show'); }
function cancelClear() { $('clearConfirm').classList.remove('show'); }
function confirmClear() {
  cancelClear();
  endSession('Session cleared: timer, checkboxes, and progress reset.');
}

/* ---------------- Level actions ---------------- */
function checklistConfirmed(phaseId) {
  const items = checklistForPhase(phaseId) || [];
  const c = store.checklist[String(phaseId)] || {};
  return items.map(i => ({ id: i.id, label: i.label, confirmed: c[i.id] === true }));
}
function commitPhase(n, successMessage) {
  const from = currentPhaseId();
  const priorUnlock = unlockedPhaseOf(store);
  const advancing = pendingAdvance && n > from;
  if (advancing) {
    const decision = advanceDecision(store);
    if (!decision.ok || decision.next !== n) {
      pendingPhase = null;
      pendingPhaseMessage = null;
      pendingAdvance = false;
      renderAll();
      showMessage(decision.ok ? 'Stay on this phase for now.' : (advanceReason(decision) || 'Stay on this phase for now.'));
      return;
    }
  }
  applyPhaseChange(store, n);
  if (advancing) {
    store.unlockedPhase = Math.max(priorUnlock, n);
    if (!Array.isArray(store.history)) store.history = [];
    store.history.push({ type: 'advance', from: from, to: n, at: new Date().toISOString() });
  }
  pendingPhase = null;
  pendingPhaseMessage = null;
  pendingAdvance = false;
  save();
  renderAll();
  showMessage(successMessage || 'Level selected. Your session starts fresh when you press Start.');
}
function confirmPhaseChange() {
  if (pendingPhase == null) return;
  commitPhase(pendingPhase, pendingPhaseMessage);
}
function cancelPhaseChange() {
  pendingPhase = null;
  pendingPhaseMessage = null;
  pendingAdvance = false;
  renderPrompts();
}
function toggleChecklistItem(id, confirmed) {
  const key = String(currentPhaseId());
  const cur = Object.assign({}, store.checklist[key] || {});
  if (confirmed) cur[id] = true;
  else delete cur[id];
  store.checklist[key] = cur;
  save();
  renderPhase();
}
function advancePhase() {
  const decision = advanceDecision(store);
  if (!decision.ok) {
    showMessage(advanceReason(decision) || 'Stay on this phase for now.');
    renderPhase();
    return;
  }
  pendingAdvance = true;
  const next = decision.next;
  const message = 'Advanced to Level ' + next + '.';
  if (sessionIsActive(store.session)) {
    pendingPhase = next;
    pendingPhaseMessage = message;
    renderPrompts();
    return;
  }
  commitPhase(next, message);
}

function openPanel(which) {
  const settings = $('settingsPanel');
  const info = $('infoPanel');
  if (which === 'settings') {
    if (info) info.hidden = true;
    if (settings) settings.hidden = false;
  } else if (which === 'info') {
    if (settings) settings.hidden = true;
    if (info) info.hidden = false;
  }
  syncPanelButtons();
}
function closePanels() {
  const settings = $('settingsPanel');
  const info = $('infoPanel');
  if (settings) settings.hidden = true;
  if (info) info.hidden = true;
  syncPanelButtons();
}
function syncPanelButtons() {
  const menu = $('btnMenu');
  const info = $('btnInfo');
  const settingsOpen = !!($('settingsPanel') && !$('settingsPanel').hidden);
  const infoOpen = !!($('infoPanel') && !$('infoPanel').hidden);
  if (menu) menu.setAttribute('aria-expanded', settingsOpen ? 'true' : 'false');
  if (info) info.setAttribute('aria-expanded', infoOpen ? 'true' : 'false');
}

/* ---------------- Rendering ---------------- */
const demoIdx = {};

function renderStatus() {
  const bar = $('statusBar'), s = store.session;
  bar.classList.toggle('active', !!(s && s.state === 'running'));
  bar.classList.toggle('complete', !!(s && s.state === 'paused'));
  const n = checkedCount(), total = currentProgram().length;
  $('statusCount').textContent = n + ' / ' + total;
  $('statusFill').style.width = (total ? n / total * 100 : 0) + '%';
  $('statusDay').textContent = prettyDay(s ? s.day : store.activeDay);
  if (!s) $('statusText').textContent = 'Ready';
  else if (s.state === 'paused') $('statusText').textContent = 'Paused';
  else if (s.state === 'expired') $('statusText').textContent = 'Time is up';
}

function renderTimer() {
  const s = store.session, t = $('timer');
  const expired = !!(s && s.state === 'expired');
  t.classList.toggle('done', expired);
  if (!s) t.textContent = fmtTime(SESSION_MS);
  else t.textContent = fmtTime(remainingMs(s, Date.now()));
  const active = sessionIsActive(s);
  $('btnStart').hidden = !!s;
  /* On a rest day Start stays disabled with a plain note, instead of
   * silently doing nothing when tapped. Tapping a workout day on the
   * calendar enables it again. */
  const restDay = !s && !isGymDayKey(store.activeDay, store.workoutDays);
  $('btnStart').disabled = restDay;
  $('btnPause').hidden = !(s && s.state === 'running');
  $('btnResume').hidden = !(s && s.state === 'paused');
  $('btnFinish').hidden = !active || expired;
  let detail = 'in progress';
  if (s && s.state === 'paused') detail = 'paused';
  else if (expired) detail = 'time is up';
  $('sessionDate').textContent = s
    ? 'Session: ' + prettyDay(s.day) + ' (' + detail + ')'
    : restDay
      ? 'This is a rest day. Tap a workout day on the calendar, then press Start.'
      : 'No active session: pick a workout day and press Start.';
}

function renderProgress() {
  const n = checkedCount(), total = currentProgram().length;
  const active = sessionIsActive(store.session);
  $('progressCount').textContent = n + ' / ' + total;
  $('progressFill').style.width = (total ? n / total * 100 : 0) + '%';
  if (!active) $('progressNote').textContent = 'Start a session to check off exercises.';
  else if (n === 0) $('progressNote').textContent = 'Check off exercises as you finish them.';
  else if (n === total) $('progressNote').textContent = 'All done. Press Finish workout to log this day.';
  else $('progressNote').textContent = (total - n) + ' to go.';
}

function renderPrompts() {
  const s = store.session;
  const active = sessionIsActive(s);
  const expired = !!(s && s.state === 'expired');
  $('finishConfirm').classList.toggle('show', active && allChecked() && !expired);
  $('expiryConfirm').classList.toggle('show', expired);
  $('phaseConfirm').classList.toggle('show', pendingPhase != null);
  if ($('phaseConfirmText')) {
    $('phaseConfirmText').textContent = pendingAdvance
      ? 'Advance level? This ends the current session and clears its checkboxes.'
      : 'Change level? This ends the current session and clears its checkboxes.';
  }
}

function isYoutubeHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'youtu.be' || host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'www.youtube-nocookie.com';
}
function youtubeId(url) {
  let parsed;
  try { parsed = new URL(String(url || '').trim()); } catch (e) { return ''; }
  if (!isYoutubeHost(parsed.hostname)) return '';
  const host = parsed.hostname.toLowerCase();
  let id = '';
  if (host === 'youtu.be') id = parsed.pathname.replace(/^\//, '').split('/')[0];
  else if (/^\/embed\//.test(parsed.pathname)) id = parsed.pathname.split('/')[2] || '';
  else id = parsed.searchParams.get('v') || '';
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
}
function nocookieEmbed(url) {
  const id = youtubeId(url);
  return id ? 'https://www.youtube-nocookie.com/embed/' + id : '';
}
function youtubeWatchUrl(url) {
  const id = youtubeId(url);
  return id ? 'https://www.youtube.com/watch?v=' + id : '';
}
function videoEmbedHtml(ex) {
  const embed = nocookieEmbed(ex && ex.video_url);
  const watch = youtubeWatchUrl(ex && ex.video_url);
  if (!embed || !watch) return '';
  return '<div class="video-frame"><iframe src="' + esc(embed) + '" title="' + esc('Demo: ' + ex.name) + '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>' +
    '<a class="demo-watch" href="' + esc(watch) + '" target="_blank" rel="noopener noreferrer">Watch demo</a>';
}

function demoHtml(ex) {
  if (!ex.demos || !ex.demos.length) return '';
  const i = demoIdx[ex.id] || 0;
  const d = ex.demos[i];
  if (!d || !d.url) return '';
  let nav = '';
  if (ex.demos.length > 1) {
    nav = '<div class="demo-nav">' +
      '<button class="demo-arrow" data-demo-prev="' + esc(ex.id) + '" aria-label="Previous demo">\u2039</button>' +
      '<span class="demo-pos">' + (i + 1) + ' of ' + ex.demos.length + '</span>' +
      '<button class="demo-arrow" data-demo-next="' + esc(ex.id) + '" aria-label="Next demo">\u203a</button></div>';
  }
  const handle = d.handle ? ' ' + esc(d.handle) : '';
  return '<div class="demo" id="demo-' + esc(ex.id) + '">' +
    '<a class="demo-link" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
    '\u25b6 Demo: ' + esc(d.creator) + handle +
    '<span class="demo-desc">' + esc(d.description) + '</span></a>' + nav + '</div>';
}

function renderSections() {
  const root = $('routine');
  const program = currentProgram();
  const canCheck = sessionIsActive(store.session);
  let stepNo = 0;
  root.innerHTML = SECTIONS.map(sec => {
    const exs = program.filter(e => e.section === sec.id).sort((a, b) => a.order - b.order);
    if (!exs.length) return '';
    stepNo += 1;
    const done = exs.every(e => store.checks[e.id]);
    const collapsed = !!store.collapsed[sec.id];
    const rows = exs.map(e => {
      const tags = e.muscle_groups.map(t => '<span class="muscle-tag">' + esc(t) + '</span>').join('');
      return '<li class="exercise"><div class="exercise-main"><div class="exercise-copy"><label class="check-row">' +
        '<input type="checkbox" data-check="' + esc(e.id) + '" data-testid="exercise-check"' + (store.checks[e.id] ? ' checked' : '') + (canCheck ? '' : ' disabled') + '>' +
        '<span><span class="exercise-name">' + esc(e.name) + '</span>' +
        '<span class="exercise-note">' + esc(e.note) + '</span>' +
        '<span class="muscle-tags">' + tags + '</span></span>' +
        '<span class="dose">' + esc(e.dose) + '</span></label>' +
        demoHtml(e) + '</div><div class="exercise-video">' + videoEmbedHtml(e) + '</div></div></li>';
    }).join('');
    const countLabel = exs.length === 1 ? '1 exercise' : exs.length + ' exercises';
    return '<section class="section' + (collapsed ? ' collapsed' : '') + (done ? ' complete' : '') + '">' +
      '<button class="section-head" data-section="' + esc(sec.id) + '" data-testid="section-head">' +
      '<span class="section-title"><span class="step-no">' + String(stepNo).padStart(2, '0') + '</span>' +
      '<h3 class="section-heading">' + esc(sec.title) + '</h3>' +
      '<span class="block-tag">' + (sec.block === 'foundation' ? 'foundation block' : 'accessory block') + '</span></span>' +
      '<span class="duration">' + countLabel + '</span></button>' +
      '<ul class="exercise-list">' + rows + '</ul></section>';
  }).join('');
}

function renderCalendar() {
  const grid = $('weekGrid');
  if (!grid) return;
  const start = weekStart(new Date());
  const today = dayKey(new Date());
  const gyms = gymDows();
  let html = '';
  const weekKeys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dayKey(d);
    const isGym = gyms.indexOf(d.getDay()) !== -1;
    if (isGym) weekKeys.push(key);
    const done = !!store.completions[key];
    const cls = 'day' + (isGym ? ' gym' : '') + (key === today ? ' today' : '') + (key === store.activeDay ? ' selected' : '');
    html += '<div class="' + cls + '"' + (isGym ? ' data-day="' + key + '" role="button" tabindex="0" data-testid="calendar-day"' : ' data-testid="calendar-day-rest"') + '>' +
      '<span class="dow">' + WEEKDAY_NAMES[i] + '</span>' +
      '<span class="dnum">' + d.getDate() + '</span>' +
      '<span class="dmark">' + (done ? '\u2713 done' : '') + '</span></div>';
  }
  grid.innerHTML = html;
  const doneCount = weekKeys.filter(k => store.completions[k]).length;
  if ($('calProgress')) $('calProgress').textContent = doneCount + ' / ' + weekKeys.length;
}

function renderSettings() {
  const group = $('workoutDays');
  const days = gymDows();
  if (group) {
    group.innerHTML = WEEKDAY_NAMES.map(function (name, dow) {
      const on = days.indexOf(dow) !== -1;
      return '<label class="day-choice"><input type="checkbox" data-workout-day="' + dow + '" data-testid="workout-day-choice"' +
        (on ? ' checked' : '') + '><span>' + name + '</span></label>';
    }).join('');
  }
  const freq = $('frequencyCount');
  if (freq) {
    freq.textContent = days.length === 1 ? '1 workout day' : days.length + ' workout days';
  }
}

function renderInfo() {
  const note = $('blockNote');
  if (!note) return;
  note.textContent =
    'The routine is split into warm-up play, strong legs, tall posture, and cool-down stretch. ' +
    'Every move is bodyweight only, for kids 5 and older, with a grown-up nearby.';
}

function renderDemoDirectory() {
  const list = $('demoVideoList');
  if (!list) return;
  list.innerHTML = EXERCISES.map(function (ex) {
    return '<li class="demo-row" data-testid="demo-row"><span class="demo-name">' + esc(ex.name) + '</span>' + videoEmbedHtml(ex) + '</li>';
  }).join('');
}

/* ---------------- Level UI ---------------- */
function renderPhase() {
  const p = currentPhaseId();
  const phase = PHASES.find(x => x.id === p);
  const week = programWeek(store, p);
  $('phaseTitle').textContent = 'Level ' + p + ': ' + phase.name;
  $('phaseGoal').textContent = phase.goal;
  const doseDraft = $('doseDraftNote');
  if (doseDraft) doseDraft.textContent = 'Grown-up note: bodyweight only. Stop if it hurts and tell a grown-up.';
  const unlocked = unlockedPhaseOf(store);
  document.querySelectorAll('#phasePicker .phase-btn').forEach(b => {
    const id = Number(b.getAttribute('data-phase'));
    const locked = id > unlocked;
    b.classList.toggle('active', id === p);
    b.classList.toggle('locked', locked);
    const nameEl = b.querySelector('.phase-name');
    const named = PHASES.find(x => x.id === id);
    if (nameEl && named) nameEl.textContent = named.name;
    b.setAttribute('aria-disabled', locked ? 'true' : 'false');
    const lock = b.querySelector('.phase-lock');
    if (lock) {
      lock.textContent = locked ? 'Locked. Complete Level ' + (id - 1) + ' first.' : '';
    }
  });

  const credit = weekCredit(store, p);
  const total = Math.max(0, Math.floor(Number(store.phaseSessions[p]) || 0));
  let weekText = 'Week ' + week + ' moves for this level. Finish sessions to move up.';
  if (total > credit) {
    weekText += ' Finish sessions to move up a level.';
  }
  $('weekNote').textContent = weekText;

  const advice = symptomAdvice(store);
  const adviceEl = $('symptomAdvice');
  adviceEl.hidden = !advice;
  adviceEl.textContent = advice;

  let prog = '';
  for (let id = 1; id <= 3; id++) {
    const done = store.phaseSessions[id] || 0;
    const shown = cappedSessionCount(done);
    const target = SESSIONS_PER_PHASE;
    const reached = shown >= target;
    const phaseName = PHASES.find(x => x.id === id).name;
    prog += '<div class="phase-row"><span>Level ' + id + ': ' + phaseName + '</span>' +
      '<span class="' + (reached ? 'done' : '') + '">' + shown + ' / ' + target + ' sessions</span></div>';
  }
  $('phaseProgress').innerHTML = prog;

  const wrap = $('checklistWrap');
  if (p >= 3) {
    wrap.hidden = true;
  } else {
    wrap.hidden = false;
    const items = checklistConfirmed(p);
    $('checklistTitle').textContent = 'Before moving to Level ' + (p + 1) + ', confirm every item';
    $('checklistItems').innerHTML = items.map(it =>
      '<label class="check-item"><input type="checkbox" data-checklist-item="' + it.id + '" data-testid="checklist-item"' +
      (it.confirmed ? ' checked' : '') + '><span>' + esc(it.label) + '</span></label>'
    ).join('');
    const decision = advanceDecision(store);
    const btn = $('advanceBtn');
    btn.disabled = !decision.ok;
    btn.textContent = 'Advance to Level ' + (p + 1);
    $('advanceNote').textContent = advanceReason(decision);
  }
}

function renderAll() {
  renderPhase();
  renderStatus();
  renderTimer();
  renderProgress();
  renderPrompts();
  renderSections();
  renderCalendar();
  renderSettings();
  renderInfo();
  renderDemoDirectory();
}

/* ---------------- Tick ---------------- */
function tick() {
  const now = Date.now();
  const todayKey = dayKey(new Date(now));
  if (renderedDayKey !== todayKey) {
    renderedDayKey = todayKey;
    const rolled = rolloverActiveDay(store, new Date(now));
    if (rolled.changed) save();
    renderCalendar();
    renderStatus();
    renderTimer();
  }
  const s = store.session;
  if (!s || s.state !== 'running') return;
  const left = s.deadline - now;
  if (left <= 0) { offerExpiryChoice(); return; }
  $('timer').textContent = fmtTime(left);
  $('statusText').textContent = 'Running: ' + fmtTime(left) + ' left';
}

/* ---------------- Events (delegated) ---------------- */
function onClick(ev) {
  if (ev.target.closest('[data-close-panel]')) {
    closePanels();
    return;
  }
  const secBtn = ev.target.closest('[data-section]');
  if (secBtn) {
    const id = secBtn.getAttribute('data-section');
    store.collapsed[id] = !store.collapsed[id];
    if (!store.collapsed[id]) delete store.collapsed[id];
    save(); renderSections(); renderStatus();
    return;
  }
  const prev = ev.target.closest('[data-demo-prev]');
  const next = ev.target.closest('[data-demo-next]');
  if (prev || next) {
    const id = (prev || next).getAttribute(prev ? 'data-demo-prev' : 'data-demo-next');
    const ex = EXERCISES.find(e => e.id === id);
    if (ex && ex.demos.length > 1) {
      const n = ex.demos.length;
      demoIdx[id] = (((demoIdx[id] || 0) + (prev ? -1 : 1)) % n + n) % n;
      const box = $('demo-' + id);
      if (box) box.outerHTML = demoHtml(ex);
    }
    return;
  }
  const day = ev.target.closest('[data-day]');
  if (day) {
    store.activeDay = day.getAttribute('data-day');
    save(); renderCalendar(); renderStatus(); renderTimer();
    const routine = $('routine');
    if (routine && typeof routine.scrollIntoView === 'function') {
      try { routine.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { /* ignore */ }
    }
    return;
  }
  /* Rest days are not tappable targets, but a tap on one should still say
   * so instead of silently doing nothing. */
  const restCell = ev.target.closest('.day');
  if (restCell) {
    showMessage('Rest day. Tap a workout day to train.');
    return;
  }
  const phaseBtn = ev.target.closest('[data-phase]');
  if (phaseBtn) {
    const n = Number(phaseBtn.getAttribute('data-phase'));
    const decision = phaseChangeDecision(store, n);
    if (decision.action === 'noop') {
      pendingPhase = null;
      pendingPhaseMessage = null;
      pendingAdvance = false;
      renderPrompts();
      return;
    }
    if (decision.action === 'advance') {
      advancePhase();
      return;
    }
    pendingAdvance = false;
    if (decision.action === 'confirm') {
      pendingPhase = decision.phase;
      pendingPhaseMessage = null;
      renderPrompts();
      return;
    }
    commitPhase(decision.phase, null);
    return;
  }
  if (ev.target.id === 'advanceBtn') advancePhase();
}
function onChange(ev) {
  const box = ev.target.closest('[data-check]');
  if (box) { toggleCheck(box.getAttribute('data-check')); return; }
  const item = ev.target.closest('[data-checklist-item]');
  if (item) { toggleChecklistItem(item.getAttribute('data-checklist-item'), item.checked); return; }
  const dayBox = ev.target.closest('[data-workout-day]');
  if (dayBox) {
    const dow = Number(dayBox.getAttribute('data-workout-day'));
    const current = gymDows().slice();
    const idx = current.indexOf(dow);
    if (dayBox.checked) {
      if (idx === -1) current.push(dow);
    } else if (idx !== -1) {
      if (current.length === 1) {
        dayBox.checked = true;
        const note = $('workoutDaysNote');
        if (note) note.hidden = false;
        showMessage('Keep at least one workout day.');
        return;
      }
      current.splice(idx, 1);
    }
    const picked = workoutDaySelection(store, current, new Date());
    store.workoutDays = picked.workoutDays;
    store.activeDay = picked.activeDay;
    const note = $('workoutDaysNote');
    if (note) note.hidden = true;
    save();
    renderCalendar();
    renderStatus();
    renderTimer();
    renderSettings();
  }
}
function onKey(ev) {
  if (ev.key === 'Escape') {
    const settingsOpen = $('settingsPanel') && !$('settingsPanel').hidden;
    const infoOpen = $('infoPanel') && !$('infoPanel').hidden;
    if (settingsOpen || infoOpen) closePanels();
    return;
  }
  if (ev.key === 'Enter' || ev.key === ' ') {
    const day = ev.target.closest && ev.target.closest('[data-day]');
    if (day) { ev.preventDefault(); day.click(); }
  }
}
function bindUi() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  $('btnStart').addEventListener('click', startSession);
  $('btnMenu').addEventListener('click', function () {
    if ($('settingsPanel').hidden) openPanel('settings');
    else closePanels();
  });
  $('btnInfo').addEventListener('click', function () {
    if ($('infoPanel').hidden) openPanel('info');
    else closePanels();
  });
  $('btnPause').addEventListener('click', pauseSession);
  $('btnResume').addEventListener('click', resumeSession);
  $('btnFinish').addEventListener('click', openFinishCheckin);
  $('btnFinishNow').addEventListener('click', openFinishCheckin);
  $('btnClear').addEventListener('click', requestClear);
  $('btnClearYes').addEventListener('click', confirmClear);
  $('btnClearNo').addEventListener('click', cancelClear);
  $('btnExpireLog').addEventListener('click', openFinishCheckin);
  $('btnExpireDiscard').addEventListener('click', discardExpired);
  $('btnPhaseYes').addEventListener('click', confirmPhaseChange);
  $('btnPhaseNo').addEventListener('click', cancelPhaseChange);
}

/* ---------------- Init ---------------- */
function boot() {
  if (typeof document === 'undefined') return;
  if (booted) return;
  booted = true;
  bindUi();
  const today = new Date();
  renderedDayKey = dayKey(today);
  const rolled = rolloverActiveDay(store, today);
  if (rolled.changed) bootDirty = true;
  let backupMade = false;
  if (bootNeedsBackup && bootRaw != null && bootRaw !== '') {
    try {
      backupRawBeforeSave(localStorage, bootRaw, Date.now());
      backupMade = true;
    } catch (e) {
      bootDirty = false;
    }
  }
  try { pruneBackups(localStorage, BACKUP_KEEP); } catch (e) { /* ignore */ }
  if (bootDirty) {
    if (bootDirty) save();
    bootNeedsBackup = false;
  }
  if (backupMade) bootNotice = bootNotice ? (bootNotice + ' ' + BACKUP_NOTICE) : BACKUP_NOTICE;
  // The info note and demo list render even when a stored session has
  // already expired. Expiry used to return before this call.
  renderInfo();
  renderDemoDirectory();
  const expired = offerExpiryChoice();
  if (!expired) {
    renderAll();
    if (bootNotice) showMessage(bootNotice);
  }
  bootNotice = null;
  setInterval(tick, 250);
}
boot();

if (typeof module !== 'undefined') {
  module.exports = {
    SESSION_MS: SESSION_MS,
    SESSIONS_PER_PHASE: SESSIONS_PER_PHASE,
    STORE_VERSION: STORE_VERSION,
    LS_KEY: LS_KEY,
    BACKUP_KEEP: BACKUP_KEEP,
    NOTICE_CORRUPT: NOTICE_CORRUPT,
    NOTICE_PARTIAL: NOTICE_PARTIAL,
    BACKUP_NOTICE: BACKUP_NOTICE,
    resolvePhase: resolvePhase,
    resolveDemoList: resolveDemoList,
    remainingMs: remainingMs,
    migrate: migrate,
    loadStoreFromRaw: loadStoreFromRaw,
    defaultStore: defaultStore,
    dayKey: dayKey,
    parseDay: parseDay,
    isDayKey: isDayKey,
    prettyDay: prettyDay,
    mondayOf: mondayOf,
    isGymDay: isGymDay,
    isGymDayKey: isGymDayKey,
    nextGymDay: nextGymDay,
    weekDayKeys: weekDayKeys,
    resolveActiveDay: resolveActiveDay,
    rolloverActiveDay: rolloverActiveDay,
    workoutDaySelection: workoutDaySelection,
    weekStart: weekStart,
    sessionIsActive: sessionIsActive,
    shouldExpireOnLoad: shouldExpireOnLoad,
    expireIfDue: expireIfDue,
    canStartSession: canStartSession,
    youtubeId: youtubeId,
    toggleCheckState: toggleCheckState,
    applyCompletion: applyCompletion,
    phaseChangeDecision: phaseChangeDecision,
    applyPhaseChange: applyPhaseChange,
    checklistReady: checklistReady,
    checklistForPhase: checklistForPhase,
    normalizePhase: normalizePhase,
    cappedSessionCount: cappedSessionCount,
    rawBackupKey: rawBackupKey,
    backupRawBeforeSave: backupRawBeforeSave,
    listBackupKeys: listBackupKeys,
    pruneBackups: pruneBackups,
    phaseWeek: phaseWeek,
    weekCredit: weekCredit,
    programWeek: programWeek,
    symptomFlagged: symptomFlagged,
    symptomStatus: symptomStatus,
    consecutiveFlagLock: consecutiveFlagLock,
    advanceDecision: advanceDecision,
    grantAdvance: grantAdvance,
    pendingMorning: pendingMorning,
    symptomAdvice: symptomAdvice,
  };
}
