'use strict';
/* Static checks on docs/index.html. The kids repo has no DOM library (no
 * new dependencies), so the screens are exercised in the browser run
 * described in FEATURES.md; these checks cover what the HTML itself
 * promises. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DOCS = path.join(__dirname, '..', 'docs');
const HTML = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');

test('the security headers match the adult app', () => {
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(HTML)[1];
  assert.strictEqual(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; form-action 'none'");
  assert.match(HTML, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
});

test('scripts load in order from this site only, with no inline script', () => {
  const scripts = Array.from(HTML.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g));
  assert.deepStrictEqual(scripts.map(m => (/src="([^"]+)"/.exec(m[1]) || [])[1]),
    ['session-engine.js', 'session-screens.js', 'program.js', 'app.js']);
  scripts.forEach(m => assert.strictEqual(m[2].trim(), ''));
  scripts.forEach(m => assert.ok(fs.existsSync(path.join(DOCS, /src="([^"]+)"/.exec(m[1])[1]))));
});

test('the checklist and the old video library are gone', () => {
  assert.ok(!fs.existsSync(path.join(DOCS, 'video-library.js')));
  assert.doesNotMatch(HTML, /checklist|video-library|exercise-list/i);
  const js = ['app.js', 'program.js'].map(f => fs.readFileSync(path.join(DOCS, f), 'utf8')).join('\n');
  assert.doesNotMatch(js, /checks\[|toggleCheck|renderChecklist|VIDEO_LIBRARY/);
});

test('the page has the hosts the session screens and the level picker need', () => {
  ['session-root', 'app-notice', 'level-btn-1', 'level-btn-2', 'level-btn-3', 'level-label', 'btn-advance', 'week-grid', 'disclaimer-footer']
    .forEach(id => assert.match(HTML, new RegExp('data-testid="' + id + '"'), id));
  assert.match(HTML, /<body data-session="idle">/);
});

test('every demo link the app can show is an https YouTube watch link', () => {
  const KP = require(path.join(DOCS, 'program.js'));
  KP.MOVES.forEach(m => assert.match(m.url, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/, m.name));
});
