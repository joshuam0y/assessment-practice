/* shapedance.js — cards on a fixed lattice, each a 3x3 pattern with some
   cells left blank, exactly two identical. Select both, press COMPARE.

   Frame-measured against three real HireVue gameplay recordings (ffmpeg +
   blob/angle tracking on actual footage, not vendor prose or a screenshot).
   This replaced an earlier version built from a single published screenshot
   plus prep-vendor text, which got several things wrong once checked against
   real play:

   - Motion: NOT floating/drifting/shaking. Every card has a fixed random
     tilt (measured 3-87 degrees) baked in once, no animation. Only from
     LEVEL 22 on does a subset of cards additionally spin continuously at
     constant angular velocity (measured 5-35 deg/s, most commonly ~25.8),
     each with its own randomized direction -- no oscillation, no easing,
     no reversal. Confirmed by HireVue's own in-game instruction text
     captured from footage: "Complexity increases as you progress through
     the levels... and some cubes will rotate."
   - Layout: a FIXED 2-column x 3-row lattice (6 slots). Cards never
     translate; positional jitter measured at 0.01-0.46px over 12s, i.e.
     pinned in place.
   - Card count: 3-6 (not always 4), shifting from mostly 3-4 early to 4-6
     from around level 10 on, capped at the 6 lattice slots.
   - Pattern: always a 3x3 grid, but NOT always fully filled -- filled-cell
     count escalates 2 -> 3 -> 4 -> 5-6 -> 6-7 (out of 9) as level rises.
   - Shape/color variety: 1 combo early, 2 from ~level 10, all 3 (square,
     triangle, circle) from ~level 18.
   - Level: +2 per correct match, -1 per miss or timeout.
   - Timing: 200s total session, ~30s per-level timeout (measured 31.7s).
   - Background tile tint (white/grey vs tan/orange checkerboard) and card
     SIZE are both independent decoys unrelated to which cards match.

   Scoring in the real game is reported as max level reached times win
   ratio, which penalizes rushing without accuracy. Kept "matched" as the
   primary score for consistency with every other game's personal-best
   tracking, but level x win-ratio is shown on the results screen too.

   Match count: the frame-measured footage above only ever showed exactly
   one matching pair per round. Per explicit correction from someone who's
   actually taken the real assessment recently, later rounds sometimes have
   3 or 4 cards that all match each other, not just 2 -- selection is no
   longer capped at 2, and matchCountForLevel() below escalates the odds of
   a 3- or 4-way match as level rises (always leaving at least one
   non-matching decoy card, so there's still a real discrimination task). */

(function () {
  var TYPE_POOL = [
    { s: 'square', c: '#1E5FBF' },
    { s: 'triangle', c: '#E8901A' },
    { s: 'circle', c: '#D3202A' }
  ];
  var SD_TIME = 200;
  var SD_LEVEL_TIME = 30;
  var SD_ROTATION_LEVEL = 22;
  /* Fixed 2x3 lattice -- [left%, top%] for each of the 6 slots. */
  var LATTICE = [[30, 16], [70, 16], [30, 50], [70, 50], [30, 84], [70, 84]];

  function mark(shape, color) {
    if (shape === 'circle') {
      return '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="' + color + '"/></svg>';
    }
    if (shape === 'square') {
      return '<svg viewBox="0 0 30 30"><rect x="4" y="4" width="22" height="22" fill="' + color + '"/></svg>';
    }
    return '<svg viewBox="0 0 30 30"><path d="M15 3 L27 26 L3 26 Z" fill="' + color + '"/></svg>';
  }

  function fillCountForLevel(level) {
    if (level < 10) return 2;
    if (level < 14) return 3;
    if (level < 18) return 4;
    if (level < 22) return AP.ri(5, 6);
    return AP.ri(6, 7);
  }

  function typesForLevel(level) {
    if (level < 10) return TYPE_POOL.slice(0, 1);
    if (level < 18) return TYPE_POOL.slice(0, 2);
    return TYPE_POOL;
  }

  function cardCountForLevel(level) {
    return level < 10 ? AP.ri(3, 4) : AP.ri(4, 6);
  }

  /* min(desired, numCards - 1) always leaves at least one card that has to
     be ruled out -- without that floor, a round with only 4-5 cards could
     occasionally ask the player to just select every card on screen. */
  function matchCountForLevel(level, numCards) {
    var desired = 2;
    if (level >= 22 && Math.random() < 0.25) desired = 4;
    else if (level >= 14 && Math.random() < 0.35) desired = 3;
    return Math.min(desired, numCards - 1);
  }

  function randomPattern(fillCount, types) {
    var p = [], filled = {};
    AP.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, fillCount).forEach(function (i) { filled[i] = 1; });
    for (var i = 0; i < 9; i++) p.push(filled[i] ? AP.pick(types) : null);
    return p;
  }

  function identical(a, b) {
    return a.every(function (x, i) {
      if (x === null || b[i] === null) return x === b[i];
      return x.s === b[i].s && x.c === b[i].c;
    });
  }

  function build() {
    var S = AP.S;
    var fillCount = fillCountForLevel(S.level);
    var types = typesForLevel(S.level);
    var numCards = Math.min(6, cardCountForLevel(S.level));
    var matchCount = matchCountForLevel(S.level, numCards);
    var base = randomPattern(fillCount, types);
    var pats = [];
    for (var m = 0; m < matchCount; m++) pats.push(base.slice());
    var guard = 0;
    while (pats.length < numCards && guard++ < 200) {
      var p = randomPattern(fillCount, types);
      if (!identical(p, base)) pats.push(p);
    }
    while (pats.length < numCards) pats.push(randomPattern(fillCount, types));

    var order = AP.shuffle(pats.map(function (_, i) { return i; }));
    S.pats = order.map(function (i) { return pats[i]; });
    S.match = [];
    S.pats.forEach(function (p, i) { if (identical(p, base)) S.match.push(i); });
    S.bg = S.pats.map(function () { return AP.pick(['bg-a', 'bg-b']); });
    S.slots = AP.shuffle([0, 1, 2, 3, 4, 5]).slice(0, numCards);
    S.sel = [];
    draw();
  }

  function draw() {
    var S = AP.S;
    var canSpin = S.level >= SD_ROTATION_LEVEL;
    AP.el(AP.board(AP.chrome(true) +
      '<div class="field f-cmp"><div class="cmpwrap" id="cw"></div>' +
      '<button class="cta" id="cCta" disabled>COMPARE</button></div>'));
    AP.wire();

    var cw = AP.$('cw');
    S.pats.forEach(function (p, i) {
      var pos = LATTICE[S.slots[i]];
      var tilt = AP.ri(-70, 70);
      var scale = AP.pick([0.85, 1, 1.15]);
      var d = document.createElement('button');
      d.className = 'card ' + S.bg[i];
      d.style.left = 'calc(' + pos[0] + '% - 48px)';
      d.style.top = 'calc(' + pos[1] + '% - 48px)';
      d.style.setProperty('--tilt', tilt + 'deg');
      d.style.setProperty('--scale', scale);
      /* Only from level 22 does any card actually spin, per real footage --
         constant velocity, own random direction, no oscillation. */
      if (canSpin && Math.random() < 0.5) {
        var dps = AP.ri(5, 35);
        d.classList.add(AP.pick(['spin-cw', 'spin-ccw']));
        d.style.animationDuration = (360 / dps) + 's';
      }
      d.innerHTML = p.map(function (m) { return m ? mark(m.s, m.c) : '<span class="blank"></span>'; }).join('');
      d.addEventListener('click', function () { tap(i, d); });
      cw.appendChild(d);
    });
    AP.$('cCta').addEventListener('click', check);
  }

  function tap(i, node) {
    var S = AP.S;
    if (S.locked) return;
    var at = S.sel.indexOf(i);
    if (at > -1) { S.sel.splice(at, 1); node.classList.remove('sel'); }
    else { S.sel.push(i); node.classList.add('sel'); }
    AP.$('cCta').disabled = S.sel.length < 2;
  }

  function check() {
    var S = AP.S;
    if (S.sel.length < 2 || S.locked) return;
    S.locked = true;
    clearInterval(AP.lt);

    var ok = S.sel.slice().sort().join() === S.match.slice().sort().join();
    S.attempts++;
    if (ok) { S.score++; S.level += 2; } else { S.miss++; S.level = Math.max(1, S.level - 1); }

    var c = AP.$('cCta');
    c.textContent = ok ? 'MATCH' : 'NOT A MATCH';
    c.style.background = ok ? '#4ECDC4' : '#FF6B8A';
    AP.misc = setTimeout(next, ok ? 400 : 850);
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    S.locked = false;
    S.lvlMax = SD_LEVEL_TIME;
    build();
    AP.levelClock(function () { S.miss++; S.attempts++; S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    var winRatio = S.attempts ? S.score / S.attempts : 0;
    AP.results('sd', S.score,
      [['Matched', S.score], ['Level', S.level], ['Level × win rate', (S.level * winRatio).toFixed(1)]],
      '<b>Strategy:</b> compare one grid position at a time across all cards rather than reading each one whole. ' +
      'Early rounds only fill 2 of 9 cells, so check those first. Background tile color and card size are both ' +
      'decoys; only the pattern matters. Rotation only starts at level 22 -- until then, everything you see is ' +
      'exactly what it is, just tilted. Later rounds sometimes have 3 or 4 cards that all match instead of just ' +
      '2, so select every card you think matches before pressing COMPARE, not just the first two. HireVue ' +
      'reportedly scores this as level reached times win rate, so guessing to climb levels fast is worse than ' +
      'answering carefully.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, miss: 0, attempts: 0, level: 1, sel: [], locked: false, left: SD_TIME, lvlMax: SD_LEVEL_TIME };
    next();
    AP.gameClock(finish, SD_TIME);
  }

  AP.games.sd = { start: start };
})();
