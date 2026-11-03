# Kids Workout Coach

A guided 20-minute bodyweight workout for kids 5 and older. Stronger thighs, taller posture, fun holds and animal moves.

Run it here: https://jhanisusM.github.io/kids-workout-coach/

## What it is

- 15 moves in 3 levels: Starter, Stronger, Superhero, 6 sessions per level. Each session picks 5 moves at random.
- Warm-up play, strong legs, and tall posture.
- Bodyweight only. No weights, no accounts, no tracking, no names or photos.
- Progress is stored in the browser only, under its own key (kids-coach-v1), so it cannot mix with other workout apps.
- A grown-up should stay nearby. Stop any move that hurts and tell a grown-up. This is a fun workout, not medical advice.

## What it is not

- There is no Next-morning check-in, no pain score, and no swelling check in this app. Finish logs the day directly with a star message.
- There is no yoga content. Yoga moves and yoga videos were removed.

## Demo videos

- 14 checked YouTube demos live in `docs/video-library.js`. Each was opened and checked as kid friendly, with the creator and move confirmed. No video URL has been invented.
- Embeds use youtube-nocookie with related videos limited to the same channel, and the player cannot open new tabs.

## Files

- `docs/index.html`, `docs/app.js`, `docs/styles.css`, `docs/video-library.js`, `docs/favicon.svg`
- `tests/app.test.js`: run `npm test` (Node 18 or newer, nothing to install).
- `FEATURES.md`: every feature with its status and a web test guide.
- The live Pages site deploys from the `docs/` folder on `main`.
