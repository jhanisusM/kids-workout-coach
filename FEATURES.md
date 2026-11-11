# Kids Workout Coach: FEATURES.md

A guided bodyweight workout for kids 5 and older, one move at a time. Press
Start once and the app runs warm-up, two rounds of strong-legs and
tall-posture moves, then a cool-down, hands-free. Pure HTML, CSS, and
JavaScript. No build step, no server, no accounts, no tracking.

Status is one of: done, removed.

Run the tests with `npm ci && npm test` (Node 18 or newer). The site in
`docs/` has no dependencies.

## Where things live

- `docs/index.html`: page layout, CSP, referrer policy, level picker, progress card.
- `docs/session-engine.js`: the guided session state machine (shared, hash-checked).
- `docs/session-screens.js`: start, exercise, rest, and finish screens (shared, hash-checked).
- `docs/session.css`: layout and session screen styles (shared, hash-checked).
- `docs/program.js`: the 48-move pool from exercises-kids.json, doses by level, and the session builder.
- `docs/app.js`: progress store (`kids-coach-v1`), migration of old saves, levels, calendar, page wiring.
- `docs/styles.css`: kids colors and level picker. `docs/favicon.svg`: icon.
- `docs/specs/guided-session.md`: the guided session spec.
- `tests/`: `session-engine.test.js` (shared), `shared-files.test.js` (shared), `program.test.js`, `store.test.js`, `page.test.js`, fixtures.

How to test in a browser: serve `docs/` (`cd docs && python3 -m http.server 8000`)
and use the `data-testid` selectors below, not class names.

## Guided session screens (shared with the other workout app)

`docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`, and
the engine test file are identical in kids-workout-coach and
adaptive-workout-coach. `shared-files.test.js` fails if a copy drifts from
the hash in `shared-files.sha256`. To change one, edit it, copy it to both
repos, and update both manifests (the command is in the test file header).

| Feature | Status | Location | Web test reference |
| --- | --- | --- | --- |
| Start screen: title, minute estimate, exercise count, phase breakdown, Start | done | `session-screens.js` `renderStart` | Load the page. `[data-testid=session-screen]` has `data-status="idle"`. Check `session-title`, `time-estimate` ("About N minutes."), `exercise-count`, and `phase-breakdown` (3 items, `data-phase` warmup, main, cooldown). `btn-start` is visible without scrolling at 390x844. No `iframe` on the page. |
| Move list folded before Start | done | `plan-list` inside a closed `details` | `plan-list` is not visible until "See the moves" is opened. |
| Safety notes on the start screen | done | `safety-notes` | Short notes from synthesis.md. Medical-clearance wording is only in the README. |
| New mix | done | `btn-new-mix` | On the start screen, draws a new session. Not shown during a session. |
| Exercise screen | done | `renderRun` | After Start: `data-status="exercise"`, `[data-mode=exercise]`. Shows `phase-label`, `exercise-position` ("Exercise N of M"), `progress-bar`, `exercise-name`, `exercise-dose`, `btn-done`, `btn-pause`, `btn-skip`, `btn-end`, and `exercise-note`. The page header and other cards are hidden (`body[data-session=active]`). |
| Rep moves wait for Done | done | engine `done` | A rep move has no countdown and stays until `btn-done`. |
| Timed moves count down and auto-advance | done | engine `tick` | `countdown` shows mm:ss and moves on at 0. `btn-done` ends it early. "5 seconds left." is announced. Timed each-side moves announce "Switch sides." at half time. |
| Rest screen with Up next | done | engine rest rule | Starts by itself after a move that has rest. `rest-title`, `countdown`, `up-next` ("Up next: name"), the next move's demo, and `btn-skip-rest`. |
| Rest rule | done | `SessionEngine.restAfter` | Rest from the data wins (0 included). With no value: 20 s after main moves, none after warm-up or cool-down moves. Never after the last move, never after Skip. |
| Pause / Resume | done | engine `pause`, `resume` | `btn-pause` shows `paused-badge` and `btn-resume`; countdown and `session-elapsed` stop. Resume continues from the same second. |
| Skip exercise | done | engine `skip` | `btn-skip` moves to the next move with no rest and counts it as skipped. |
| End with confirm | done | engine `requestEnd`, `confirmEnd` | `btn-end` opens `end-confirm`. `btn-end-no` returns to the same screen and time. `btn-end-yes` clears the session and shows the start screen. Nothing is logged. |
| Finish screen | done | `renderFinish` | "Workout complete" in `finish-title`; `finish-completed` ("Exercises completed: X of Y"), `finish-skipped`, `finish-time`. `btn-finish-done` returns to a fresh start screen. |
| Reload resumes | done | one state object in localStorage | Reload during any screen: the same screen, move, and remaining time come back (the deadline is stored, so time keeps running while the page is closed unless paused). Cleared on finish and on End. |
| Demo videos, one at a time, never autoplay | done | `setDemo` | Only the current move (or Up next on rest) has an `iframe` (`demo-embed`): `https://www.youtube-nocookie.com/embed/<id>?rel=0`, sandbox `allow-scripts allow-same-origin allow-presentation`, referrer policy `strict-origin-when-cross-origin`. `demo-watch` opens youtube.com with `rel="noopener noreferrer"`. Repeat rounds/sets show no demo. |
| Save failure notice | done | `onSaveError`, `storage-notice` | When localStorage `setItem` throws, `storage-notice` says the browser could not save; the workout keeps running. |
| Screen Wake Lock | done | `wantWake` | Held during exercise and rest where supported; fails silently. Re-requested when the tab is shown again. |
| Live announcements, focus, reduced motion | done | `session-live` (`aria-live=polite`), `session.css` | Each new screen is announced and its heading or primary button gets focus. `prefers-reduced-motion` turns off transitions. |
| Mobile first, controls above the fold | done | `session.css` | At 390x844 the primary button is in the first screen on every screen. The disclaimer footer is in the normal flow at 860 px and below, so it never covers controls. |
| Network | done | CSP in `index.html` | Only this site's files plus youtube-nocookie iframes, one at a time. `connect-src 'none'`, `img-src 'self'`. |

## Kids session

| Feature | Status | Location | Web test reference |
| --- | --- | --- | --- |
| Session shape | done | `program.js` `buildSession` | Start screen breakdown: Warm-up 4, Main 12 (11 when Superhero runs long), Cool-down 4. `exercise-position` counts to 20 (or 19). |
| Warm-up | done | `pickWarmup` | A pulse raiser, one more warm-up move, Arm Circles, then a coordination move. Starter never hops; other levels have at most one hopping warm-up move. 10 s rest between. |
| Main: 6 moves x 2 rounds | done | `pickMainRound` | Round 1: 3 thigh moves (squat, single-leg, hold or hop), 2 posture moves, 1 play move. Round 2 repeats it with "Round 2." in the note and no demo. A "Water break" rest closes round 1. Rest 25 / 20 / 15 s by level. |
| Cool-down | done | fixed list | Slow March, Wall Stand, Wall Angels, Flamingo Balance, 10 s rest between. |
| Level rules | done | `doses`, `hopFrom` | Starter: no jumps (hop moves are marches or stepping), Sit-to-Stand instead of squats. Frog Jumps from Stronger. Star Jumps at Superhero only. Wall Sit 10 / 20 / 30 s. |
| Honest length label | done | `app.js` `LEVEL_MINUTES`, `level-label` | "About 16 to 18 minutes at Starter", 17 to 21 at Stronger, 19 to 24 at Superhero. Tests check every generated session sits inside its label. |
| Random picks | done | `buildSession({ rand })` | Each new session (and New mix) draws again. Tests use a seeded generator. |
| Keep / fix / replace | done | `MOVES` | Donkey Kicks replaced by Bird Dog. Running in Place merged into High Knees. Inchworm replaced by Hand Walk-Outs, with no downward-dog hold. No yoga moves. |
| Library moves | done | role `library` | 12 moves from the JSON are kept with their URLs but not drawn into sessions yet (see README). |

## Levels and progress

| Feature | Status | Location | Web test reference |
| --- | --- | --- | --- |
| Level picker | done | `level-btn-1..3` | Picking a level on the start screen rebuilds the session. Higher levels show "Locked" until Advance unlocks them. Hidden during a session. |
| Advance after 6 sessions | done | `advanceDecision`, `btn-advance` | `advance-note` counts logged sessions. Moving back is always allowed. |
| Logging | done | `logFinished` | Finishing with at least one exercise done marks today in `week-grid` and adds one session to the level (once per day). Ending early or skipping everything logs nothing. |
| Old saves | done | `migrate` | Saves from main, PR #2, and PR #3 keep level, unlocked level, sessions per level, trained days, and advance history, with no notice. The old checklist session is dropped quietly. Broken saves reset with a notice and a backup key. |
| Save failure | done | `app-notice` | If progress cannot be saved, `app-notice` says so. |

## Removed

| Feature | Status | Notes |
| --- | --- | --- |
| Checklist screen with per-move checkboxes | removed | Replaced by the guided session. |
| Single session countdown clock (18:00 / 22:00) | removed | Each move has its own countdown or Done. |
| Session template from PR #2/#3 (2 warm-up, 3 legs, 2 posture, 1-minute finish, 3 rounds) | removed | Replaced by Ask AI's 4 + 6x2 + 4 plan. |
| `docs/video-library.js` | removed | Each move carries its own URL from exercises-kids.json. |
