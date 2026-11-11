# Kids Workout Coach

A guided bodyweight workout for kids 5 and older, one move at a time.
Stronger thighs, taller posture, fun holds and animal moves. Press Start
once and the app runs the whole session.

Run it here: https://jhanisusM.github.io/kids-workout-coach/

## What a session looks like

- **Warm-up:** 4 moves (a pulse raiser, one more warm-up move, Arm Circles,
  and a coordination move).
- **Main:** 6 moves, done twice: 3 thigh moves, 2 posture moves, and 1 play
  move. A water break sits between the rounds.
- **Cool-down:** Slow March, Wall Stand, Wall Angels, Flamingo Balance.

Picks are random from Ask AI's 48-move list, so sessions vary. Starter runs
about 16 to 18 minutes, Stronger about 17 to 21, Superhero about 19 to 24.

Levels: Starter has no jumps and uses Sit-to-Stand. Frog Jumps start at
Stronger. Star Jumps are Superhero only. Wall Sit holds 10, 20, or 30
seconds. Move up with Advance after 6 logged sessions; moving back is always
allowed.

## How it runs

- Rep moves wait for **Done**. Timed moves count down and move on by
  themselves. Rests start by themselves and show what is up next, with
  **Skip rest**.
- **Pause / Resume**, **Skip exercise**, and **End** (with a confirm) are
  always on screen, with a big main button above the fold on phones.
- A reload picks up the same move and time. Finishing shows "Workout
  complete" and puts a star on today in the week view.
- One demo video at a time, never autoplaying, from YouTube's
  privacy-enhanced domain. Round 2 shows no video.
- The screen stays awake during a session where the browser supports it.

## Safety

A grown-up stays in the room. Clear about 2 meters of floor and use a
non-slip surface with bare feet or grippy shoes. Stop for pain, dizziness,
limping, or losing balance again and again. Jumps are soft, quiet, and
two-footed. There is no yoga content.

This is a fun workout, not medical advice. If your child has a heart, lung,
bone, or joint condition, a recent injury or surgery, or a doctor has
limited their activity, check with their doctor before starting. Dose
numbers are a starting point; a pediatric physical therapist can check
them.

## Privacy

Bodyweight only. No accounts, no tracking, no names or photos. Progress
(level, sessions, trained days) is stored in this browser under
`kids-coach-v1`, and an active session under `kwc-guided-session-v1` until
it ends. Saves from earlier versions load with their progress kept. If the
browser refuses to save, the page says so and the workout still runs.

## Files

- `docs/index.html`, `docs/app.js` (progress, levels, page wiring),
  `docs/program.js` (moves and session builder), `docs/styles.css`,
  `docs/favicon.svg`.
- `docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`:
  the guided session, shared byte-for-byte with Adaptive Workout Coach and
  checked by `tests/shared-files.test.js` against `shared-files.sha256`.
- `docs/specs/guided-session.md`: the session spec.
- `tests/`: run `npm ci && npm test` (Node 18 or newer, no runtime
  dependencies).
- `FEATURES.md`: every feature with its status and a web test reference.
- The live Pages site deploys from the `docs/` folder on `main`.
