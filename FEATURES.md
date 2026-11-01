# Kids Workout Coach: FEATURES.md

A guided 20-minute bodyweight workout for kids 5 and older. Stronger thighs,
taller posture, fun holds and animal moves. Pure HTML, CSS, and JavaScript.
No build step, no server, no accounts, no tracking. Progress lives in the
browser's localStorage under the key `kids-coach-v1`. The demo video library
holds the top verified pick per move (added 2026-10-31 at the user's
request): no video URL has been invented, and a video is only added
after it is opened and checked as kid friendly.

How to test: open `index.html` (or the single-file preview built from it) in
a browser. Everything is local except YouTube demo embeds and external
demo links. Use the `data-testid` selectors below, not class names or deep CSS paths.

## Session

- 20-minute timer: done. Status: done. Screen: dashboard timer panel.
  - Web test reference: page `index.html` (or the single-file preview).
  - Expected behavior: pressing Start begins a 20:00 countdown that keeps
    running across a page reload from one stored deadline. Pause freezes it,
    Resume continues it. On a rest day Start is disabled and the session
    note says the day is a rest day.
  - Key elements: `[data-testid="timer"]`, `[data-testid="btn-start"]`,
    `[data-testid="btn-pause"]`, `[data-testid="btn-resume"]`,
    `[data-testid="session-date"]`, `[data-testid="status-text"]`.
  - Network: none.
- Finish workout with star message: done. Screen: dashboard.
  - Web test reference: check every exercise in a running session, then
    press Finish workout.
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
    pressing Start on a workout day abandons the expired session without
    logging it and starts a fresh 20:00 session with checkboxes reset.
    On a rest day Start stays disabled. Checkboxes stay until Log anyway,
    Discard, or a fresh Start.
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
  - Web test reference: start a session, then check moves off.
  - Expected behavior: 13 moves in Level 1 (warm-up play, strong legs,
    tall posture, cool-down stretch), each with steps and a dose label.
    Checking updates the counts to n / 13. Checkboxes are disabled before
    a session starts, and the progress note says to start a session first.
  - Key elements: `[data-testid="routine"]`,
    `[data-testid="exercise-check"]`, `[data-testid="progress-count"]`,
    `[data-testid="progress-note"]`, `[data-testid="status-count"]`.
  - Network: none.
- Collapsible sections: done. Screen: routine.
  - Web test reference: tap a section header.
  - Expected behavior: the section collapses and expands. Finished
    sections show as complete.
  - Key elements: `[data-testid="section-head"]`.
  - Network: none.

## Levels and progression

- Level picker (Starter, Stronger, Superhero): done. Screen: levels card.
  - Web test reference: tap Level 2 or Level 3.
  - Expected behavior: the heading shows the level name (for example
    Level 1: Starter). Changing level while a session runs asks for
    confirmation first. Locked levels say what to complete first.
  - Key elements: `[data-testid="phase-title"]`,
    `[data-testid="level-btn-1"]`, `[data-testid="level-btn-2"]`,
    `[data-testid="level-btn-3"]`, `[data-testid="phase-confirm"]`,
    `[data-testid="btn-phase-yes"]`, `[data-testid="btn-phase-no"]`.
  - Network: none.
- Progression, 6 sessions per level: done. Screen: levels card.
  - Web test reference: finish sessions and watch the per-level rows.
  - Expected behavior: each level tracks sessions toward 6 of 6.
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

## Calendar and settings

- Weekly calendar: done. Screen: sidebar.
  - Web test reference: tap a workout day, then tap a rest day.
  - Expected behavior: workout days are tappable and select the day;
    completed days show a done mark and count toward the week. Tapping a
    rest day shows a short rest-day message instead of silently doing
    nothing.
  - Key elements: `[data-testid="week-grid"]`,
    `[data-testid="calendar-day"]`, `[data-testid="calendar-day-rest"]`,
    `[data-testid="cal-progress"]`.
  - Network: none.
- Rest-day note jumps to the calendar: done. Screen: session panel.
  - Web test reference: on a rest day with no session, tap the session
    note.
  - Expected behavior: the page scrolls to the Weekly calendar, where a
    workout day can be picked. Picking a workout day, then Start, begins
    a session. The note is only tappable for the rest-day case; session
    lines for running, paused, or expired sessions are unchanged.
  - Key elements: `[data-testid="session-date"]`,
    `[data-testid="week-grid"]`.
  - Network: none.
- Settings, workout days: done. Screen: settings panel.
  - Web test reference: open Settings from the menu button, toggle days.
  - Expected behavior: picked days become workout days; at least one day
    stays on, with a note if the last day is unticked.
  - Key elements: `[data-testid="btn-menu"]`,
    `[data-testid="settings-panel"]`, `[data-testid="workout-days"]`,
    `[data-testid="workout-day-choice"]`,
    `[data-testid="btn-settings-close"]`, `[data-testid="frequency-count"]`.
  - Network: none.
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
  - Expected behavior: one row per move; YouTube picks play inline via
    youtube-nocookie embeds, and every move has a demo link on its card.
    No invented URLs: every video was opened and checked as kid friendly.
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
