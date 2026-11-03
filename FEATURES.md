# Kids Workout Coach: FEATURES.md

A bodyweight workout of about 15 to 22 minutes for kids 5 and older. Stronger
thighs, taller posture, fun holds and animal moves. Pure HTML, CSS, and
JavaScript. No build step, no server, no accounts, no tracking. Progress
lives in the browser's localStorage under the key `kids-coach-v1`. The
exercise pool has 25 moves. A new session is a template, not 5 random
moves: 2 warm-up, 3 legs (at least 2 that bend the knee), 2 posture,
then a 1-minute easy finish that is not in the pool (see Session below).
The demo video library holds 17 verified video entries: no video URL has
been invented, and a video is only added after it is opened and checked.
Sit to Stand, Wall Stand, Wall Angels, Prone Y and T Lifts, and
Shoulder-Blade Squeezes have no video.
Gorilla Squats is held out (unverified): it is not a programmed exercise
and has no video entry.

## Where things live

- `docs/index.html`: page layout, CSP, and referrer policy.
- `docs/app.js`: exercise pool, levels, session engine, storage, rendering.
- `docs/video-library.js`: the 17 verified demo videos.
- `docs/styles.css`: styles. `docs/favicon.svg`: icon.
- `tests/app.test.js`: automated checks, run with `npm test`.
- Publishing: GitHub Pages serves the `docs/` folder on `main`.

How to test: open `index.html` (or the single-file preview built from it) in
a browser. Everything is local except YouTube demo embeds and external
demo links. Use the `data-testid` selectors below, not class names or deep CSS paths.

## Session

- Per-level timer: done. Status: done.
  Screen: dashboard timer panel.
  - Web test reference: page `index.html` (or the single-file preview).
    Switch levels before Start.
  - Expected behavior: pressing Start begins that level's countdown and
    keeps it across a page reload from one stored deadline. Starter and
    Stronger both run about 15 to 18 minutes,
    and both clocks are 18:00. Superhero runs about 17 to 22 minutes,
    and its clock is 22:00. Pause freezes the clock, Resume continues it.
    There is no day selection: Start works on any day, and the session
    logs the day it was started on. With no session the session note says
    to press Start to begin, and the clock shows the selected level. The
    page title says about 15 to 22 minutes. The session plan and the
    level goal match the clock: About 15 to 18 minutes on Starter and
    Stronger, About 17 to 22 minutes on Superhero.
  - Key elements: `[data-testid="timer"]`, `[data-testid="btn-start"]`,
    `[data-testid="btn-pause"]`, `[data-testid="btn-resume"]`,
    `[data-testid="session-date"]`, `[data-testid="status-text"]`,
    `[data-testid="session-length"]`.
  - Network: none.
- Session template, locked until Finish or Clear: done.
  Screen: dashboard and routine.
  - Web test reference: press Start, note the moves, reload the page,
    then press Finish workout (or Clear session) and Start again.
  - Expected behavior: pressing Start (fresh start only, not Resume)
    builds one template and stores 7 catalog ids on `session.exerciseIds`.
    Order is 2 warm-up (the first is never high-impact), 3 leg moves
    (at most one high-impact, and at least 2 that bend the knee), and 2
    posture moves from the tall-posture pool. The easy finish is appended
    on screen and is not stored. A big jump in the leg and posture block
    counts once every round, and no round has more than 2 big-jump sets.
    Warm-up is played once. Two high-impact moves are never back to back,
    and the session never starts with one. Progress reads n / 8, and
    checking all 8 gates the Finish prompt. Reloading, pausing, resuming,
    and timer expiry keep the same ids. Finish and Clear end the session,
    so the next Start builds a new template. A saved session from before
    this template (exactly 5 catalog ids) still plays those 5, with the
    old catalog doses, and does not show the round plan. A session with
    no usable ids gets one template written once and saved. The storage
    key stays `kids-coach-v1`.
  - Key elements: `[data-testid="progress-count"]`,
    `[data-testid="status-count"]`, `[data-testid="exercise-check"]`,
    `[data-testid="finish-confirm"]`, `[data-testid="btn-start"]`,
    `[data-testid="session-plan"]`, `[data-testid="session-rounds"]`,
    `[data-testid="session-rest"]`, `[data-testid="exercise-dose"]`.
  - Network: none.
- Finish workout with star message: done. Screen: dashboard.
  - Web test reference: check every exercise in a running session (the
    template moves, including Easy Finish), then press Finish workout.
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
    starts a fresh session on that level's clock with a new template and checkboxes
    reset. Expiry itself preserves the old session's moves until then. Checkboxes stay
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
    25-exercise pool (warm-up play, strong legs, tall posture). Inchworm
    is under warm-up and Superkid is under tall posture. Progress reads
    0 / 25. Doses shown are the selected level's doses. During a template
    session the routine shows the 7 picks plus Easy Finish (n / 8), and
    the session plan shows the level's rounds and rest. A legacy 5-id
    session shows those 5 at the old catalog doses and hides the round
    plan. Checkboxes are disabled before a session starts, and the
    progress note says to start a session first.
  - Key elements: `[data-testid="routine"]`,
    `[data-testid="exercise-check"]`, `[data-testid="progress-count"]`,
    `[data-testid="progress-note"]`, `[data-testid="status-count"]`,
    `[data-testid="exercise-dose"]`, `[data-testid="session-rounds"]`,
    `[data-testid="session-rest"]`.
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
    Level 1: Starter). The Starter and Stronger goals say about 15 to 18
    minutes. Superhero says about 17 to 22 minutes. All three levels
    are 3 rounds of legs and posture. Level 1 rests 30 seconds. Levels
    2 and 3 rest 15 seconds (20 seconds of rest at 3 rounds would run
    Stronger past 18 minutes).
    None of the goals say five random videos. Changing level while a
    session runs asks for confirmation first. Locked levels say what
    to complete first. The grown-up tips line is on this card.
  - Key elements: `[data-testid="phase-title"]`,
    `[data-testid="level-btn-1"]`, `[data-testid="level-btn-2"]`,
    `[data-testid="level-btn-3"]`, `[data-testid="phase-confirm"]`,
    `[data-testid="btn-phase-yes"]`, `[data-testid="btn-phase-no"]`.
  - Network: none.
- Progression, 6 sessions per level: done. Screen: levels card.
  - Web test reference: finish sessions and watch the per-level rows.
  - Expected behavior: each level tracks sessions toward 6 of 6. Rounds,
    rest, and doses change with the level. There is no separate move
    list per level: the same pool is picked from, with that level's
    numbers. Starter doses include warm-ups at 30 sec, jumps at 5,
    crawls at 1 time across, Flamingo at 2 x 8 sec each side, and
    Superkid at 2 x 8 sec. Stronger uses 40 sec, 8 jumps, 2 times
    across, 2 x 10 sec each side, and 3 x 10 sec. Superhero uses 45 sec,
    10 jumps, 2 times across, 3 x 15 sec each side, and 3 x 15 sec.
    The newer thigh and posture moves use a few more reps or short
    holds (not one long hold) so a session of those moves still lands
    in the same window: Starter and Stronger about 15 to 18 minutes,
    Superhero about 17 to 22.
  - Key elements: `[data-testid="phase-progress"]`,
    `[data-testid="phase-goal"]`, `[data-testid="week-note"]`,
    `[data-testid="grownup-tips"]`, `[data-testid="across-note"]`.
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
  - Expected behavior: one row per move for all 25 pool moves. Easy
    Finish is not in this list. Inchworm is a warm-up move and Superkid
    is a tall-posture move. New thigh moves are Sit to Stand, Bodyweight
    Squat, Low Step-Ups, Wall Sit, and Reverse Lunge. New posture moves
    are Wall Stand, Wall Angels, Bird Dog, Prone Y and T Lifts, and
    Shoulder-Blade Squeezes. The list is backed by
    17 library entries (Hopscotch and Step Jacks share one Little Sports
    video; Low Step-Ups, Wall Sit, and Reverse Lunge share one Live Lean
    TV kids circuit). YouTube watch-URL picks play inline via
    youtube-nocookie embeds; the 4 Shorts picks (Bear Crawls, Frog Jumps,
    Star Jumps, Crab Walk) show as demo links on the routine card only,
    with no embed, and in All the moves those rows show the move name
    only. Sit to Stand, Wall Stand, Wall Angels, Prone Y and T Lifts,
    and Shoulder-Blade Squeezes have no demo, because no kid-appropriate
    video was found. No invented URLs and no search-result URLs: every
    video was opened and checked, and each title and channel was
    rechecked through YouTube oEmbed.
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
  - Web test reference: page `index.html`. Open a move whose demo is a
    YouTube watch URL (for example Hopscotch) and let the player finish.
  - Expected behavior: the iframe loads from `www.youtube-nocookie.com`
    with `rel=0`, so end-of-video suggestions stay on the same channel.
    `sandbox` is `allow-scripts allow-same-origin allow-presentation`
    (no `allow-popups`). `allow` is `encrypted-media; picture-in-picture;
    fullscreen` (no autoplay, sensors, or clipboard).
  - Key elements: `[data-testid="demo-embed"]`, `[data-testid="demo-watch"]`.
  - Network: youtube-nocookie only. The page itself does not log a CSP
    violation.
- Safe links: done. Screen: routine cards.
  - Web test reference: page `index.html`. Read a demo link on a routine
    card, including a Shorts pick such as Bear Crawls.
  - Expected behavior: a demo link is shown only when its URL is https.
    `javascript:` and `http:` links are omitted. External links open with
    `rel="noopener noreferrer"`.
  - Key elements: `[data-testid="demo-link"]`, `[data-testid="demo-watch"]`.
  - Network: none from the link itself. Following a watch link leaves
    this page for YouTube.
- Content Security Policy: done. Location: `docs/index.html` head.
  - Web test reference: page `index.html`. Reload with the console open.
  - Expected behavior: the CSP meta tag allows scripts, styles, and
    images from this site only (`'self'`), sets `connect-src 'none'`,
    and limits frames to `https://www.youtube-nocookie.com`. The referrer
    policy is `strict-origin-when-cross-origin`.
  - Key elements: `meta[http-equiv="Content-Security-Policy"]`,
    `[data-testid="demo-embed"]`.
  - Network: youtube-nocookie frames only. No CSP console violations
    from this page.
- Safe rendering and storage: done. Screen: session message.
  - Web test reference: page `index.html`. Reload with a saved session
    that lists a removed move, and again with damaged saved data.
  - Expected behavior: all text put into the page goes through `esc()`.
    A saved session listing a removed move gets new moves and the
    message 'Your saved workout was updated to the new moves.', while
    damaged data still gets the reset notices. A saved session that
    lists a removed move plus junk ids gets the partial-reset notice
    ('Some saved data was unreadable and was reset. The rest of your
    progress was kept.') rather than that soft notice. Saved data that
    cannot be parsed resets to a fresh store
    ('Saved data could not be read, so progress was reset to a fresh
    start.'), and the original is backed up first.
  - Key elements: `[data-testid="session-message"]`.
  - Network: none.

## Automated tests

- `npm test` (Node 18 or newer, no installs): 16 checks. The pool has
  25 moves and no yoga content, every demo id resolves, every video is
  an https YouTube link, embeds use youtube-nocookie with `rel=0`, and
  the URL guard rejects `javascript:` and http links. The removed-ids
  check confirms the dropped yoga moves and videos are absent. The
  soft-notice check confirms a saved session that listed a removed move
  gets new moves and 'Your saved workout was updated to the new moves.'
  A saved session that lists a removed move plus junk ids gets the
  partial-reset notice. It also runs 1000 seeded sessions per level and
  checks the template order, the high-impact rules, that each leg block
  has at least 2 knee-bending moves, that a repeated big jump counts
  once per round and no round exceeds 2 big-jump sets, that every
  warm-up, leg, and posture move appears, that a legacy 5-id save still
  loads, that a new session is stable across a reload, that rounds,
  rest, and doses match the level, that the true shortest and longest
  unpadded session at each level (every legal template, not a sample)
  sits inside that level's label and inside 15 to 18 minutes for Starter
  and Stronger, and that each level's timer is at least that longest
  session, that the
  length, across, and grown-up copy is present with no in-app clinician
  note, and that corrupt saved data falls back safely.
