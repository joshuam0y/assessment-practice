/* compare.js — five pattern cards, exactly two identical. Select both, hit COMPARE.
   Cards sit at random rotations so the match cannot be found by orientation alone.

   NOTE: the rule here is inferred from the assessment's layout and button label,
   not from documentation. If the real game scores differently, this is the file to change. */

(function () {
  var SHAPES = ['circle', 'square', 'triangle'];
  var COLORS = ['#D3202A', '#1E5FBF', '#E8901A'];

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
    for (var i = 0; i < 4; i++) p.push({ s: AP.pick(SHAPES), c: AP.pick(COLORS) });
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
    while (pats.length < 5 && guard++ < 200) {
      var p = randomPattern();
      if (!identical(p, base)) pats.push(p);
    }
    while (pats.length < 5) pats.push(randomPattern());

    S.pats = AP.shuffle([0, 1, 2, 3, 4]).map(function (i) { return pats[i]; });
    S.match = [];
    S.pats.forEach(function (p, i) { if (identical(p, base)) S.match.push(i); });
    S.sel = [];
    draw();
  }

  function draw() {
    var S = AP.S, lay = AP.LAY[5];
    AP.el(AP.board(AP.chrome(true) +
      '<div class="field f-cmp"><div class="cmpwrap" id="cw"></div>' +
      '<button class="cta" id="cCta" disabled>COMPARE</button></div>'));
    AP.wire();

    var cw = AP.$('cw');
    S.pats.forEach(function (p, i) {
      var d = document.createElement('button');
      d.className = 'card';
      d.style.left = 'calc(' + lay[i][0] + '% - 42px)';
      d.style.top = 'calc(' + lay[i][1] + '% - 42px)';
      d.style.transform = 'rotate(' + AP.ri(-16, 16) + 'deg)';
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
    AP.levelClock(function () { S.miss++; S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    AP.results('cmp', S.score,
      [['Matched', S.score], ['Missed', S.miss], ['Level', S.level]],
      '<b>Strategy:</b> compare one position at a time across all five cards rather than reading each card whole. ' +
      'Scan the top-left mark on every card, discard the ones that differ, then move on. ' +
      'Two passes on one attribute beats five full-card reads.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, miss: 0, level: 1, sel: [], locked: false, left: AP.GAME_TIME, lvlMax: 18 };
    next();
    AP.gameClock(finish);
  }

  AP.games.cmp = { start: start };
})();
