# CLAUDE.md

Context for Claude Code working in this repo.

## What this is

A static site with five timed drills that practice the format of pre-employment
cognitive assessments. Four mirror games from the HireVue battery; the fifth is a
Zetamac clone. Everything is generated fresh per round — there is no question bank
to memorise.

Deployed on GitHub Pages. No build step, no server, no dependencies.

## Hard constraints

- **No build step.** Files are served exactly as committed. Do not introduce npm,
  bundlers, TypeScript, JSX, or a framework.
- **No ES modules.** Scripts load via plain `<script>` tags so the site also works
  when `index.html` is opened directly from disk. `import`/`export` breaks that.
- **No backend.** GitHub Pages serves static files only. Anything requiring a
  server (accounts, cross-device sync, leaderboards) is out of scope unless the
  hosting changes.
- **One external dependency**, the Outfit webfont from Google Fonts. Keep it that way.
- **ES5-compatible syntax** in the game modules — `var`, `function`, no arrow
  functions or template literals. The existing code is consistent; match it.

## Layout

```
index.html          shell + script tags (load order is significant)
css/style.css       all styling, sectioned by concern
js/core.js          AP namespace: utils, storage, chrome, clocks, results
js/games/*.js       one file per game, each registers AP.games.<key>
js/app.js           menu view, stats view, nav, boot
```

`js/core.js` must load first. Game modules register themselves onto `AP.games` and
can load in any order. `js/app.js` loads last and boots.

## Conventions

**Shared state** lives at `AP.S` and is replaced wholesale when a game starts.
Timers are `AP.gt` (round clock), `AP.lt` (level timeout), `AP.misc` (one-shot
delays). Always call `AP.stopAll()` before starting a game.

**Every game module** follows the same shape:

```js
(function () {
  function start() {
    AP.stopAll();
    AP.S = { score: 0, level: 1, left: AP.GAME_TIME, lvlMax: 20 /* ... */ };
    next();
    AP.gameClock(finish);
  }
  function next()   { /* build round, draw, AP.levelClock(onTimeout) */ }
  function finish() { AP.results('key', AP.S.score, cells, tipHTML, start); }
  AP.games.key = { start: start };
})();
```

`AP.results()` saves the run, flags a personal best, and renders the replay screen.
Call it exactly once per round.

**Adding a game** takes three edits: a new file in `js/games/`, an entry in
`AP.GAMES` in `core.js`, and a `<script>` tag in `index.html` before `app.js`.

**Puzzle generation must be solvable by construction.** Build the solution first,
then pad with decoys. Never generate randomly and hope. Numerosity picks its
solution set before the target; Pathfinder carves a DFS path, lays connectors in
their final orientation, then scrambles by replaying real slide moves from that
solved state (not rotation — every scrambled position is therefore reachable back
to solved, same guarantee, different mechanism). Preserve that property in any
change.

## Storage

```
localStorage['ap:runs'] = [{ g: gameKey, s: score, d: epochMillis }, ...]
```

Capped at 300 runs, oldest dropped. All reads and writes are wrapped in try/catch —
private browsing throws on `localStorage` access. This is per-device by design;
there is no sync.

## Testing

No test framework. Verify by hand in a browser, plus:

```bash
for f in js/core.js js/app.js js/games/*.js; do node --check "$f"; done
```

The generators are worth property-testing when touched — Numerosity boards should
be solvable in 2–3 tiles, Pathfinder grids should always carve a start-to-end path,
Zetamac answers should always be positive integers.

## Known unknowns

The mechanics come from published descriptions, prep-vendor guides, and (for
ShapeDance) HireVue's own screenshot reproduced in a peer-reviewed paper (Leutner,
Codreanu, Brink & Bitsakis 2023, Frontiers in Psychology) — not from the real
assessments directly. Two games were fully rebuilt after research contradicted the
original guess, not just recalibrated: Pathfinder was a rotate-the-pipe puzzle, but
the real game slides tiles into an open space (15-puzzle style); the game now called
`shapedance.js` was a 5-card, 2x2-pattern "Compare" game, but the real one is called
ShapeDance, uses 4 cards of 3x3 patterns, and has an independent checkerboard-tint
decoy on each card. Zetamac was checked directly against its own public source code
and is the most confident of the five — its number generation already matched
before this research pass.

Remaining genuine unknowns: whether ShapeDance's real matching rule ever requires
selecting more than two cards at higher levels (sources conflict), and Pathfinder's
exact per-level grid-size increment beyond "starts 3x3, grows on success, shrinks on
skip." If either turns out to differ, those are the files to fix.

Personality and emotional-intelligence formats are deliberately excluded. Those
reward familiarity, not rehearsal, and a trainer for them would teach someone to
produce a profile that is not theirs.
