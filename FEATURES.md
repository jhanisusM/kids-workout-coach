# Kids Workout Coach: FEATURES.md

A guided 20-minute bodyweight workout for kids 5 and older. Stronger thighs,
taller posture, fun holds and animal moves. Pure HTML, CSS, and JavaScript.
No build step, no server, no accounts, no tracking. Progress lives in the
browser's localStorage under the key `kids-coach-v1`. The exercise pool has
15 moves; every session picks 5 of them at random (see Program below). The
demo video library holds 14 verified video entries: no video URL has been
invented, and a video is only added after it is opened and checked.
Gorilla Squats is held out (unverified): it is not a programmed exercise
and has no video entry.

## Where things live

- `docs/index.html`: page layout, CSP, and referrer policy.
- `docs/app.js`: exercise pool, levels, session engine, storage, rendering.
- `docs/video-library.js`: the 14 verified demo videos.
- `docs/styles.css`: styles. `docs/favicon.svg`: icon.
- `tests/app.test.js`: automated checks, run with `npm test`.
- Publishing: GitHub Pages serves the `docs/` folder on `main`.

How to test: open `index.html` (or the single-file preview built from it) in
a browser. Everything is local except YouTube demo embeds and external
demo links. Use the `data-testid` selectors below, not class names or deep CSS paths.

## Session

- 20-minute timer: done. Status: done. Screen: dashboard timer panel.
  - Web test reference: page `index.html` (or the single-file preview).
  - Expected behavior: pressing Start begins a 20:00 countdown that keeps
    running across a page reload from one stored deadline. Pause freezes it,
    Resume continues it. There is no day selection: Start works on any day,
    and the session logs the day it was started on. With no session the
    session note says to press Start to begin.
  - Key elements: `[data-testid="timer"]`, `[data-testid="btn-start"]`,
    `[data-testid="btn-pause"]`, `[data-testid="btn-resume"]`,
    `[data-testid="session-date"]`, `[data-testid="status-text"]`.
  - Network: none.
- Five random videos per session, locked until Finish or Clear: done.
  Screen: dashboard and routine.
  - Web test reference: press Start, note the 5 moves, reload the page,
    then press Finish workout (or Clear session) and Start again.
  - Expected behavior: pressing Start (fresh start only, not Resume)
    picks 5 distinct exercise ids uniformly at random from the
    15-exercise pool, in picked order, with catalog doses. The session's
    program is exactly those 5: progress reads n / 5, and checking all 5
    (not all 15) gates the Finish prompt. Reloading, pausing, resuming,
    and timer expiry all keep the same 5: the ids are stored on the
    session (`session.exerciseIds`) and carried over when a session
    expires. Finish (completed) and Clear (cleared) end the session, so
    the next Start generates a fresh random 5; repeats across sessions
    are allowed by chance. A stored session from before this feature
    (no `exerciseIds`) gets one fresh random 5 generated once and saved,
    so it stays stable across renders and reloads. The timer stays
    20 minutes and the storage key stays `kids-coach-v1`.
  - Key elements: `[data-testid="progress-count"]`,
    `[data-testid="status-count"]`, `[data-testid="exercise-check"]`,
    `[data-testid="finish-confirm"]`, `[data-testid="btn-start"]`.
  - Network: none.
- Finish workout with star message: done. Screen: dashboard.
  - Web test reference: check every exercise in a running session (all 5
    picked moves), then press Finish workout.
  - Expected behavior: a finish prompt appears once all moves are checked.
    Finishing logs the day once and shows a star message. No pain score, no
    swelling score, no volume cut, no next-morning check-in.
  - Key elements: `[data-testid="finish-confirm"]`,
    `[data-testid="btn-finish-now"]`, `[data-testid="btn-finish"]`,
    `[data-testid="session-message"]`.
  - Network: none.
- Timer expiry choice: done. Screen: dashboard.
  - Web test reference: let a running session reach 00:00.
  - Expected behavior: an expiry prompt offers Log anyway or Discard.
    An expired session never traps the timer: Start stays visible, and
    pressing Start abandons the expired session without logging it and
    starts a fresh 20:00 session with a fresh random 5 and checkboxes
    reset. Expiry itself preserves the old session's 5 until then. Checkboxes stay
    until Log anyway, Discard, or a fresh Start.
  - Key elements: `[data-testid="expiry-confirm"]`,
    `[data-testid="btn-expire-log"]`, `[data-testid="btn-expire-discard"]`,
    `[data-testid="btn-start"]`.
  - Network: none.
- Clear session with confirmation: done. Screen: dashboard.
  - Web test reference: press Clear session, then Yes, clear it (or Keep
    going to cancel).
  - Expected behavior: clearing wipes the timer, checkboxes, and progress
    only after confirmation. Cancelling keeps the session.
  - Key elements: `[data-testid="btn-clear"]`,
    `[data-testid="clear-confirm"]`, `[data-testid="btn-clear-yes"]`,
    `[data-testid="btn-clear-no"]`.
  - Network: none.

## Routine

- Exercise checklist with big dose labels: done. Screen: routine.
  - Web test reference: look at the routine before starting, then start
    a session and check moves off.
  - Expected behavior: with no session, the routine shows the full
    15-exercise pool (warm-up play, strong legs, tall posture), each with steps and a dose label, and progress reads
    0 / 15 with the 'Start a session' note. During a session it shows
    only the 5 picked moves, and checking updates the counts to n / 5.
    Doses are the catalog doses in both cases: levels no longer override
    them. Checkboxes are disabled before a session starts, and the
    progress note says to start a session first.
  - Key elements: `[data-testid="routine"]`,
    `[data-testid="exercise-check"]`, `[data-testid="progress-count"]`,
    `[data-testid="progress-note"]`, `[data-testid="status-count"]`.
  - Network: none.
- Collapsible sections: done. Screen: routine.
  - Web test reference: tap a section header.
  - Expected behavior: the section collapses and expands. Finished
    sections show as complete. The header is a real button with
    `aria-expanded` that reads true when open and false when collapsed.
  - Key elements: `[data-testid="section-head"]`.
  - Network: none.

## Levels and progression

- Level picker (Starter, Stronger, Superhero): done. Screen: levels card.
  - Web test reference: tap Level 2 or Level 3.
  - Expected behavior: the heading shows the level name (for example
    Level 1: Starter). Levels count sessions only: Level 1's goal is
    'Five random videos every session. Bodyweight only, with a grown-up
    nearby.', Level 2's is 'Keep going: five new random videos every
    session.', and Level 3's is 'Superhero sessions: five random videos
    every time.' Changing level while a session runs asks for
    confirmation first. Locked levels say what to complete first.
  - Key elements: `[data-testid="phase-title"]`,
    `[data-testid="level-btn-1"]`, `[data-testid="level-btn-2"]`,
    `[data-testid="level-btn-3"]`, `[data-testid="phase-confirm"]`,
    `[data-testid="btn-phase-yes"]`, `[data-testid="btn-phase-no"]`.
  - Network: none.
- Progression, 6 sessions per level: done. Screen: levels card.
  - Web test reference: finish sessions and watch the per-level rows.
  - Expected behavior: each level tracks sessions toward 6 of 6. The
    level rows count sessions only; there are no per-level move lists
    and no week-based dose changes anymore.
  - Key elements: `[data-testid="phase-progress"]`,
    `[data-testid="phase-goal"]`, `[data-testid="week-note"]`.
  - Network: none.
- Advance after 6 sessions: done. Screen: levels card.
  - Web test reference: log 6 sessions, then Advance.
  - Expected behavior: Advance stays disabled until 6 sessions are
    logged. Advancing moves to the next level with a confirmation
    message. No checklist, no medical gating.
  - Key elements: `[data-testid="btn-advance"]`,
    `[data-testid="advance-note"]`.
  - Network: none.

## Calendar and info

- Weekly calendar (read-only progress view): done. Screen: sidebar.
  - Web test reference: finish a session, then look at the calendar.
  - Expected behavior: the week grid is read-only: calendar cells are
    plain divs, not tappable, and tapping one does nothing. The current
    day is highlighted, completed days show a done mark, and the progress
    line reads "n day(s) trained this week" (for example "2 days trained
    this week", or "1 day trained this week" for one day). There is no
    day selection and no rest-day concept: pressing Start starts a
    session on any day, and the session logs the day it was started on.
  - Key elements: `[data-testid="week-grid"]`,
    `[data-testid="calendar-day"]` (on every cell, including days with
    no training), `[data-testid="cal-progress"]`.
  - Network: none.
- Settings panel: removed. It held only a Close button, so the menu
  button and the empty panel were taken out. `[data-testid="btn-menu"]`
  and `[data-testid="settings-panel"]` no longer exist.
- Info panel: done. Screen: info panel.
  - Web test reference: tap the info button, then Close.
  - Expected behavior: the panel explains how the routine is organized.
  - Key elements: `[data-testid="btn-info"]`,
    `[data-testid="info-panel"]`, `[data-testid="block-note"]`,
    `[data-testid="btn-info-close"]`.
  - Network: none.

## Moves directory

- All the moves, with demo videos: done. Screen: moves directory.
  - Web test reference: scroll to All the moves.
  - Expected behavior: one row per move for all 15 pool moves, backed by
    14 library entries (Hopscotch and Step Jacks share one Little Sports
    video). YouTube watch-URL picks play inline via youtube-nocookie
    embeds; the 4 Shorts picks (Bear Crawls, Frog Jumps, Star Jumps,
    Crab Walk) show as demo links on the routine card only,
    with no embed, and in All the moves those rows show the move name
    only. Every move has a demo link on its routine card. No invented
    URLs and no search-result URLs: every video was opened and checked,
    and each title and channel was rechecked through YouTube oEmbed.
    Yoga content was removed: Butterfly Stretch, Child's Pose, and Deep
    Breathing are no longer in the pool, and their 3 videos are gone.
    Chapter and segment notes apply where a video is shared or excerpted:
    Hopscotch at 0:00 and Step Jacks at 0:25 in the Little Sports video;
    Donkey Kicks Left at 6:56 and Right at 7:48 in the Little Sports
    compilation;
    Windmills as the first move in its Little Sports video. High Knees
    is flagged as the weakest pick: its demo is from XHIT Daily, an
    adult fitness channel, not kid-specific. Gorilla Squats is held out
    and appears nowhere as a programmed exercise.
  - Key elements: `[data-testid="demo-list"]`,
    `[data-testid="demo-row"]`.
  - Network: youtube-nocookie embeds and external demo links.

## Safety and privacy

- Grown-up supervision note: done. Screen: top of page and footer.
  - Web test reference: read the safety note under the header.
  - Expected behavior: the note says a grown-up should stay nearby, to
    stop any move that hurts and tell a grown-up. This is a fun workout,
    not medical advice.
  - Network: none.
- Local-only storage: done.
  - Web test reference: finish a session, reload the page.
  - Expected behavior: progress is still there, stored only in this
    browser under `kids-coach-v1`. No names, no photos, no accounts.
  - Network: none.

## Kid safety and security

- Privacy-friendly embeds: done. Screen: routine cards and All the moves.
  - Web test reference: open any watch-URL demo and let it end.
  - Expected behavior: embeds load from `www.youtube-nocookie.com` with
    `rel=0`, so end-of-video suggestions stay on the same channel. The
    iframe sandbox has no `allow-popups`, so taps inside the player
    cannot open YouTube in a new tab. Only `encrypted-media`,
    `picture-in-picture`, and `fullscreen` are allowed (no autoplay).
  - Network: youtube-nocookie embeds.
- Safe links: done. Every demo link must be https or it is not shown,
  and external links open with `rel="noopener noreferrer"`.
- Content Security Policy: done. Location: `docs/index.html`. Scripts,
  styles, and images come from this site only, the page makes no network
  requests of its own, and frames are limited to youtube-nocookie. The
  referrer policy is `strict-origin-when-cross-origin`, which YouTube
  needs for embeds to play.
- Safe rendering and storage: done. All text put into the page goes
  through `esc()`. Saved data that cannot be parsed resets to a fresh
  store with a notice, and the original is backed up first.

## Automated tests

- `npm test` (Node 18 or newer, no installs): checks the pool has 15
  moves and no yoga content, every demo id resolves, every video is an
  https YouTube link, embeds use youtube-nocookie with `rel=0`, the URL
  guard rejects `javascript:` and http links, a session picks 5 distinct
  moves, and corrupt saved data falls back safely.
