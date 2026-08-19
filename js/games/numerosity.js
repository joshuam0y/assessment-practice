/* numerosity.js — target value, one operation, scattered number hexes.
   Tap order is operation order: 84 ÷ 12 and 12 ÷ 84 are different answers.
   Auto-advances the moment the running value equals the target. */

(function () {
  var HEXCOL = ['#2E86DE', '#8E44AD', '#D81B60', '#7CB342', '#00897B', '#EF6C00', '#3949AB'];

  var OPS = {
    '+': function (a, b) { return a + b; },
    '\u2212': function (a, b) { return a - b; },
    '\u00D7': function (a, b) { return a * b; },
    '\u00F7': function (a, b) { return a / b; }
  };

  /* Difficulty ladder. Level rises on each solve, falls on each timeout. */
  function question(level) {
    var op, need, target, sol = [];
    if (level < 4) { op = '+'; need = 2; }
    else if (level < 9) { op = '+'; need = AP.ri(2, 3); }
    else if (level < 14) { op = '\u2212'; need = 2; }
    else if (level < 19) { op = '\u00D7'; need = 2; }
    else if (level < 24) { op = '\u00F7'; need = 2; }
    else { op = AP.pick(['+', '\u2212', '\u00D7', '\u00F7']); need = op === '+' ? AP.ri(2, 3) : 2; }

    var count = level < 5 ? 5 : (level < 12 ? 6 : (level < 20 ? 8 : 10));

    /* Build the solution first so every board is guaranteed solvable. */
    if (op === '+') {
      var lo = level < 4 ? 4 : 8, hi = level < 4 ? 24 : (level < 12 ? 48 : 90);
      for (var i = 0; i < need; i++) sol.push(AP.ri(lo, hi));
      target = sol.reduce(function (a, b) { return a + b; }, 0);
    } else if (op === '\u2212') {
      var sub = AP.ri(9, 55); target = AP.ri(6, 60); sol = [target + sub, sub];
    } else if (op === '\u00D7') {
      var f1 = AP.ri(3, 12), f2 = AP.ri(3, 12); sol = [f1, f2]; target = f1 * f2;
    } else {
      var q = AP.ri(2, 9), d = AP.ri(3, 12); sol = [q * d, d]; target = q;
    }

    /* Pad with decoys that are not the target itself. */
    var tiles = sol.slice(), guard = 0;
    while (tiles.length < count && guard++ < 300) {
      var v = (op === '\u00D7' || op === '\u00F7')
        ? AP.ri(2, 26)
        : AP.ri(3, Math.max(10, Math.round(target * 0.85)));
      if (v !== target && tiles.indexOf(v) === -1) tiles.push(v);
    }
    while (tiles.length < count) tiles.push(AP.ri(2, 99));

    return { op: op, target: target, tiles: AP.shuffle(tiles) };
  }

  function runningValue() {
    var S = AP.S;
    if (!S.sel.length) return null;
    var f = OPS[S.q.op], v = S.q.tiles[S.sel[0]];
    for (var i = 1; i < S.sel.length; i++) v = f(v, S.q.tiles[S.sel[i]]);
    return v;
  }

  function draw() {
    var S = AP.S, q = S.q, n = q.tiles.length, lay = AP.LAY[n] || AP.LAY[8];
    AP.el(AP.board(AP.chrome(true) +
      '<div class="panels">' +
      '<div class="panel"><div class="cap">Operation</div><div class="opdot">' + q.op + '</div></div>' +
      '<div class="panel"><div class="cap">Current</div><div class="big" id="cur">&mdash;</div></div>' +
      '<div class="panel"><div class="cap">Result</div><div class="big">' + q.target + '</div></div>' +
      '</div><div class="field f-num"><div class="scatter" id="sc"></div></div>'));
    AP.wire();

    var sc = AP.$('sc');
    q.tiles.forEach(function (v, i) {
      var d = document.createElement('div');
      d.className = 'hexwrap' + (n > 8 ? ' small' : '');
      d.style.left = lay[i][0] + '%';
      d.style.top = lay[i][1] + '%';
      d.innerHTML = AP.hexSVG(v, HEXCOL[i % HEXCOL.length], n > 8);
      d.setAttribute('role', 'button');
      d.tabIndex = 0;
      d.addEventListener('click', function () { tap(i, d); });
      sc.appendChild(d);
    });
  }

  function tap(i, node) {
    var S = AP.S;
    if (S.locked) return;
    var at = S.sel.indexOf(i);
    if (at > -1) { S.sel.splice(at, 1); node.classList.remove('on'); }
    else { S.sel.push(i); node.classList.add('on'); }

    var v = runningValue();
    var cur = AP.$('cur');
    if (cur) cur.textContent = v === null ? '—' : v;

    if (S.sel.length >= 2 && v !== null && Math.abs(v - S.q.target) < 1e-9) {
      S.locked = true;
      S.score++;
      S.level++;
      clearInterval(AP.lt);
      AP.misc = setTimeout(next, 360);
    }
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    S.q = question(S.level);
    S.sel = [];
    S.locked = false;
    S.lvlMax = Math.max(9, 20 - Math.floor(S.level / 4));
    draw();
    AP.levelClock(function () { S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    AP.results('num', S.score,
      [['Solved', S.score], ['Level', S.level], ['Per min', (S.score / 3).toFixed(1)]],
      '<b>Strategy:</b> scan magnitude before calculating. For a large target ignore the small hexes entirely; ' +
      'for division find the one that is roughly a multiple of another. Eliminating four candidates in a second ' +
      'beats computing four in ten. Check the operation panel every level &mdash; it changes.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, level: 1, sel: [], locked: false, left: AP.GAME_TIME, lvlMax: 20 };
    next();
    AP.gameClock(finish);
  }

  AP.games.num = { start: start };
})();
