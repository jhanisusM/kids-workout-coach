# Kids Workout Coach

A guided bodyweight workout for kids 5 and older, one move at a time.
Pick a story theme, then press Start and the app runs the whole session.

Run it here: https://jhanisusM.github.io/kids-workout-coach/

## What a session looks like

Pick today's adventure first. Each theme is a short story wrapped around a
body focus:

- **Jungle Explorer:** strong legs. Trek through the jungle. Strong legs
  carry you over roots and vines.
- **Superhero Training:** tall posture. Train like a superhero. Stand tall,
  reach long, and keep a strong back.
- **Space Mission:** balance. You are on a spacewalk. Slow, steady steps
  keep you steady out there.
- **Animal Parade:** whole-body mix. Join the animal parade. Move like a
  different animal in each part of the walk.
- **Ocean Adventure:** strong arms and a steady body. Dive in and move
  through the waves. Strong arms and a steady body help you swim.
- **Playground Games:** coordination and play. Recess is on. Play the
  games, keep the landings quiet, and have fun.

Every session still has 4 warm-up moves, 6 main moves done twice (with a
water break between rounds), and 4 cool-down moves, chosen to fit the
story. Main moves come mostly from that theme's focus. Animal Parade keeps
the mixed shape: 3 thigh moves, 2 posture moves, and 1 play move. Each
move shows a themed name next to the real exercise name, and keeps its
original demo video.

Starter runs about 16 to 18 minutes, Stronger about 17 to 21, Superhero
about 19 to 24, at every theme.

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
(level, sessions, trained days, and the last theme) is stored in this
browser under `kids-coach-v1`, and an active session under
`kwc-guided-session-v1` until it ends. Saves from earlier versions load
with their progress kept. If the browser refuses to save, the page says so
and the workout still runs.

## Files

- `docs/index.html`, `docs/app.js` (progress, levels, theme menu, page
  wiring), `docs/program.js` (moves, themes, and session builder),
  `docs/styles.css`, `docs/favicon.svg`.
- `docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`:
  the guided session, shared byte-for-byte with Adaptive Workout Coach and
  checked by `tests/shared-files.test.js` against `shared-files.sha256`.
- `docs/specs/guided-session.md`: the session spec.
  `docs/specs/pick-focus.md`: the theme picker spec.
- `tests/`: run `npm ci && npm test` (Node 18 or newer, no runtime
  dependencies).
- `FEATURES.md`: every feature with its status and a web test reference.
- The live Pages site deploys from the `docs/` folder on `main`.
