/* digitspan.js — a sequence builds in the bar, then you tap it back on the honeycomb.

   Span starts at 3 and rises on each success, falls on each miss. From span 5 the
   recall direction can flip to backward, and the direction is only revealed once
   the sequence has finished showing — you cannot plan the reversal while watching. */

(function () {
  var LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
  var SHOW_MS = 720;

  /* Four rows of four, odd rows offset — a honeycomb. [left%, top%]
     The stagger must be split evenly across both row types (+/-5, not
     0/+10) or the whole grid leans toward whichever side gets the full
     offset -- confirmed visually shifted right before this fix. */
  function honeycomb() {
    var pos = [];
    for (var r = 0; r < 4; r++) {
      var rowOffset = r % 2 ? 5 : -5;
      for (var i = 0; i < 4; i++) pos.push([19 + i * 21 + rowOffset, 16 + r * 23]);
    }
    return pos;
  }

  /* No repeats within a sequence — repeats make recall ambiguous to score. */
  function sequence(len) {
    var out = [], guard;
    for (var i = 0; i < len; i++) {
      var c;
      guard = 0;
      do { c = AP.pick(LETTERS); guard++; } while (guard < 30 && out.indexOf(c) > -1);
      out.push(c);
    }
    return out;
  }

  function draw() {
    var pos = honeycomb();
    AP.el(AP.board(AP.chrome(true) +
      '<div class="field f-hex"><div class="seqbar" id="sq">&nbsp;</div>' +
      '<div class="comb" id="cb"></div></div>'));
    AP.wire();

    var cb = AP.$('cb');
    LETTERS.forEach(function (L, i) {
      var d = document.createElement('div');
      d.className = 'hexwrap small';
      d.style.left = pos[i][0] + '%';
      d.style.top = pos[i][1] + '%';
      d.innerHTML = AP.hexSVG(L, '#1B72C4', true);
      d.setAttribute('role', 'button');
      d.tabIndex = 0;
      d.addEventListener('click', function () { tap(L, d); });
      cb.appendChild(d);
    });
  }

  function show() {
    var S = AP.S;
    S.seq = sequence(S.len);
    S.entry = [];
    S.phase = 'show';
    S.shown = 0;
    draw();
    tick();
  }

  function tick() {
    var S = AP.S, bar = AP.$('sq');
    if (!bar) return;

    if (S.shown >= S.seq.length) {
      bar.textContent = S.back ? 'BACKWARD' : 'TAP IN ORDER';
      bar.style.letterSpacing = '.14em';
      bar.style.fontSize = '17px';
      bar.style.background = S.back ? '#C2185B' : '#1B72C4';
      S.phase = 'input';
      return;
    }
    bar.textContent = S.seq.slice(0, S.shown + 1).join(' ');
    S.shown++;
    AP.misc = setTimeout(tick, SHOW_MS);
  }

  function tap(letter, node) {
    var S = AP.S;
    if (S.phase !== 'input') return;
    S.entry.push(letter);
    node.classList.add('on');

    var want = S.back ? S.seq.slice().reverse() : S.seq;
    var i = S.entry.length - 1;
    if (S.entry[i] !== want[i]) return end(false);
    if (S.entry.length === want.length) return end(true);
  }

  function end(ok) {
    var S = AP.S;
    S.phase = 'done';
    clearInterval(AP.lt);

    if (ok) { S.score++; S.len++; } else { S.miss++; S.len = Math.max(3, S.len - 1); }

    var bar = AP.$('sq');
    if (bar) {
      bar.textContent = ok
        ? 'CORRECT'
        : (S.back ? S.seq.slice().reverse().join(' ') : S.seq.join(' '));
      bar.style.background = ok ? '#00897B' : '#C2185B';
      bar.style.fontSize = ok ? '17px' : '22px';
    }
    S.level = S.len - 2;
    AP.misc = setTimeout(next, ok ? 500 : 1400);
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    S.back = S.len >= 5 && Math.random() < 0.4;
    S.lvlMax = 6 + S.len * 2.5;
    show();
    AP.levelClock(function () { if (AP.S.phase !== 'done') end(false); });
  }

  function finish() {
    var S = AP.S;
    AP.results('ds', S.score,
      [['Correct', S.score], ['Best span', S.len], ['Missed', S.miss]],
      '<b>Strategy:</b> chunk. Six loose letters exceed working memory; three pairs do not &mdash; hold ' +
      '"DF, BK, MP" rather than six items. Rehearse at a steady rhythm instead of racing. ' +
      'Read the bar before tapping: backward recall is where the points go.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = {
      score: 0, miss: 0, len: 3, level: 1,
      left: AP.GAME_TIME, entry: [], phase: 'show', lvlMax: 14
    };
    next();
    AP.gameClock(finish);
  }

  AP.games.ds = { start: start };
})();
