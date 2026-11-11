# Theme picker

The start screen lets kids pick a story theme, then Start runs a guided
session built around that theme's body focus. This is the kids app spec
(kids-workout-coach). The adult app has its own focus-picker spec in the
same folder.

## Goal

Sessions should feel like a chosen adventure, not a random mix. Each
theme is a short story wrapped around a body focus, picked from a menu
before the timer starts. Level rules, rests, and honest time labels stay
in place.

## Themes

Six themes, shown on the start screen as a kid-friendly, accessible
menu (large buttons, or a large select if the buttons would push Start
off the first screen at 390x844):

| Theme | Body focus | Intro line |
| --- | --- | --- |
| Jungle Explorer | Strong legs | Trek through the jungle. Strong legs carry you over roots and vines. |
| Superhero Training | Tall posture | Train like a superhero. Stand tall, reach long, and keep a strong back. |
| Space Mission | Balance | You are on a spacewalk. Slow, steady steps keep you steady out there. |
| Animal Parade | Whole-body mix | Join the animal parade. Move like a different animal in each part of the walk. |
| Ocean Adventure | Strong arms and a steady body | Dive in and move through the waves. Strong arms and a steady body help you swim. |
| Playground Games | Coordination and play | Recess is on. Play the games, keep the landings quiet, and have fun. |

The last picked theme is remembered. The default is Animal Parade (the
whole-body mix, closest to the earlier random session). Picking a theme
updates the intro line and rebuilds the preview at once. Start and New
mix use the selected theme. The picker is hidden during a session. The
picker and Start stay visible without scrolling at 390x844.

## What a themed session contains

The session shape is unchanged: 4 warm-up moves, 6 main moves done for
2 rounds, then 4 cool-down moves. A water break sits after round 1.
Round 2 repeats round 1 with no demo. If the estimate would pass 20:30,
round 2 drops its last move. Rest is 25 / 20 / 15 seconds in the main
block by level, and 10 seconds in the warm-up and cool-down.

- The warm-up and the cool-down are chosen from the move pool to fit
  the story (for example, a space session uses slow balance walking; a
  playground session uses games). Cool-down stays standing and easy.
- Main moves come mostly from the theme's body focus (at least 4 of the
  6 unique main moves belong to that focus). Animal Parade keeps the
  mixed shape: 3 thigh moves, 2 posture moves, and 1 play move.
- The same theme and level should feel recognizable from one day to the
  next. Seeded variety is allowed inside the theme's small pools, but
  signature moves for that story should show up often. The same theme,
  level, and seed always build the same session.
- Every move keeps its real exercise name visible, next to a themed
  display name, and keeps its original video URL. A short themed
  one-liner sits in the move's note. No URL is invented.
- The start title names the theme and the level. The intro line is
  visible on the start screen.

## Level rules (unchanged)

Starter, Stronger, and Superhero. No jumps at Starter (hop moves are
marches or stepping). Frog Jumps from Stronger up. Star Jumps at
Superhero only, and only in themes that use a hopping main move. Wall
Sit holds 10 / 20 / 30 seconds when it appears. Starter uses
Sit-to-Stand, not Bodyweight Squat, whenever the session has a squat
pattern. Level-up stays at 6 logged sessions; moving back is always
allowed. Honest per-level time labels stay "About 16 to 18 minutes" at
Starter, 17 to 21 at Stronger, and 19 to 24 at Superhero, and every
generated session must sit inside its level's label.

## Data

Store `kids-coach-v1` moves to version 5:

```
{ version: 5, level, unlockedLevel, levelSessions, completions, history,
  lastTheme: 'animal-parade' }
```

- `lastTheme` updates when a theme is picked, and defaults to
  Animal Parade. An unknown value becomes Animal Parade with no notice.
- Older saves (main, PR #2, PR #3, and guided v4) keep level, unlocked
  level, sessions per level, trained days, and advance history, with no
  notice. Only fields that are present and malformed trigger the
  partial notice.

The plan passed to the engine includes `theme` so a running session
keeps the theme that was started.

## Out of scope

Changing the shared session engine or screens, changing the 6-session
level-up rule, accounts, and audio cues.

## Acceptance

- The start screen shows all six themes and Animal Parade is selected
  on a first visit.
- Picking a theme updates the intro, title, estimate, and move list at
  once. Start runs that theme. Main moves match the theme's focus.
  Themed names appear with the real exercise name, and demo URLs match
  the original pool.
- Jump rules, Wall Sit doses, water break, and per-level time labels
  hold for every theme.
- Reloading the start screen restores the last theme. Old saves load
  quietly with their progress kept.
- Existing guided-session tests stay green, with theme coverage added.
  Tests walk 5,000 seeds per theme and level.
