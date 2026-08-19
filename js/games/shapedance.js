/* shapedance.js — four cards, each a 3x3 pattern, exactly two identical.
   Select both, press COMPARE.

   Renamed and rebuilt from the earlier "compare.js". Research finding: the
   real HireVue game is called ShapeDance -- COMPARE is only the on-screen
   button label, which is why candidates misremember it as "Compare".
   Confirmed directly against HireVue's own published screenshot (Leutner,
   Codreanu, Brink & Bitsakis 2023, Frontiers in Psychology, Table 2,
   "Reproduced with permission from HireVue Inc."): four tilted, drifting
   cards, a 3x3 pattern per card (not 2x2), two different checkerboard
   background tints spread across the cards independent of which patterns
   match (a pure decoy), a single COMPARE button, and no "no match" option.
   HireVue's own description: "Mental rotation task that requires players
   to identify matching patterns of increasing complexity in rotated, AND
   ROTATING, stimuli" -- the cards are meant to keep moving, hence the name.

   Scoring in the real game is reported as max level reached times win
   ratio, which penalizes rushing through levels without actually being
   right. Kept "matched" as the primary score for consistency with every
   other game's personal-best tracking, but the level x win-ratio figure
   is shown on the results screen too. */

(function () {
  var SHAPES = ['circle', 'square', 'triangle'];
  var COLORS = ['#D3202A', '#1E5FBF', '#E8901A'];
  var SD_TIME = 198; // HireVue's published duration for this game is 3.3 minutes

  function mark(shape, color) {
    if (shape === 'circle') {
      return '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="' + color + '"/></svg>';
    }
    if (shape === 'square') {
      return '<svg viewBox="0 0 30 30"><rect x="4" y="4" width="22" height="22" fill="' + color + '"/></svg>';
    }
    return '<svg viewBox="0 0 30 30"><path d="M15 3 L27 26 L3 26 Z" fill="' + color + '"/></svg>';
  }

  function randomPattern() {
    var p = [];
    for (var i = 0; i < 9; i++) p.push({ s: AP.pick(SHAPES), c: AP.pick(COLORS) });
    return p;
  }

  function identical(a, b) {
    return a.every(function (x, i) { return x.s === b[i].s && x.c === b[i].c; });
  }

  function build() {
    var S = AP.S;
    var base = randomPattern();
    var pats = [base, base.slice()];
    var guard = 0;
    while (pats.length < 4 && guard++ < 200) {
      var p = randomPattern();
      if (!identical(p, base)) pats.push(p);
    }
    while (pats.length < 4) pats.push(randomPattern());

    var order = AP.shuffle([0, 1, 2, 3]);
    S.pats = order.map(function (i) { return pats[i]; });
    S.match = [];
    S.pats.forEach(function (p, i) { if (identical(p, base)) S.match.push(i); });
    /* Background tile tint is an independent coin flip per card -- a pure
       visual decoy unrelated to which cards actually match. */
    S.bg = S.pats.map(function () { return AP.pick(['bg-a', 'bg-b']); });
    S.sel = [];
    draw();
  }

  function draw() {
    var S = AP.S, lay = AP.LAY[4];
    /* Rotation range AND shake jitter both widen with level, and the shake
       speeds up too -- "increasing complexity in rotated, and rotating,
       stimuli" per HireVue's own description, plus this practice tool's own
       shake on top since a slow smooth pendulum didn't read as "dancing". */
    var wob = Math.min(28, 8 + S.level * 1.4);
    var jit = Math.min(10, 2 + S.level * 0.6);
    var speed = Math.max(0.9, 1.7 - S.level * 0.06);
    AP.el(AP.board(AP.chrome(true) +
      '<div class="field f-cmp"><div class="cmpwrap" id="cw"></div>' +
      '<button class="cta" id="cCta" disabled>COMPARE</button></div>'));
    AP.wire();

    var cw = AP.$('cw');
    S.pats.forEach(function (p, i) {
      var d = document.createElement('button');
      d.className = 'card ' + S.bg[i];
      d.style.left = 'calc(' + lay[i][0] + '% - 48px)';
      d.style.top = 'calc(' + lay[i][1] + '% - 48px)';
      d.style.setProperty('--wob', wob + 'deg');
      d.style.setProperty('--jit', jit + 'px');
      d.style.animationDuration = speed + 's';
      d.style.animationDelay = (-Math.random() * speed) + 's';
      d.innerHTML = p.map(function (m) { return mark(m.s, m.c); }).join('');
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
    else if (S.sel.length < 2) { S.sel.push(i); node.classList.add('sel'); }
    AP.$('cCta').disabled = S.sel.length !== 2;
  }

  function check() {
    var S = AP.S;
    if (S.sel.length !== 2 || S.locked) return;
    S.locked = true;
    clearInterval(AP.lt);

    var ok = S.sel.slice().sort().join() === S.match.slice().sort().join();
    S.attempts++;
    if (ok) { S.score++; S.level++; } else { S.miss++; S.level = Math.max(1, S.level - 1); }

    var c = AP.$('cCta');
    c.textContent = ok ? 'MATCH' : 'NOT A MATCH';
    c.style.background = ok ? '#4ECDC4' : '#FF6B8A';
    AP.misc = setTimeout(next, ok ? 400 : 850);
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    S.locked = false;
    S.lvlMax = Math.max(8, 18 - Math.floor(S.level / 4));
    build();
    AP.levelClock(function () { S.miss++; S.attempts++; S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    var winRatio = S.attempts ? S.score / S.attempts : 0;
    AP.results('sd', S.score,
      [['Matched', S.score], ['Level', S.level], ['Level × win rate', (S.level * winRatio).toFixed(1)]],
      '<b>Strategy:</b> compare one grid position at a time across all four cards rather than reading each card ' +
      'whole — the cards keep drifting, so a full read gets stale before you finish it. Scan the top-left ' +
      'cell on every card, discard the ones that differ, then move on. The background tile color is a decoy; ' +
      'only the pattern matters. HireVue reportedly scores this as level reached times win rate, so guessing to ' +
      'reach a higher level fast is worse than answering carefully.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, miss: 0, attempts: 0, level: 1, sel: [], locked: false, left: SD_TIME, lvlMax: 18 };
    next();
    AP.gameClock(finish, SD_TIME);
  }

  AP.games.sd = { start: start };
})();
