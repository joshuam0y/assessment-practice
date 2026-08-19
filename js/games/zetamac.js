/* zetamac.js — 120 seconds of arithmetic, default settings.

   Default ranges: addition 2–100 + 2–100, subtraction as its inverse,
   multiplication 2–12 × 2–100, division as its inverse. Subtraction and division
   are generated backwards from a known result so answers stay whole.

   No submit button — the field checks on every keystroke and advances on a match,
   which is how the original behaves. */

(function () {
  var DURATION = 120;

  function generate() {
    var t = AP.ri(1, 4), a, b;
    if (t === 1) {
      a = AP.ri(2, 100); b = AP.ri(2, 100);
      return { q: a + ' + ' + b, a: a + b };
    }
    if (t === 2) {
      a = AP.ri(2, 100); b = AP.ri(2, 100);
      return { q: (a + b) + ' \u2212 ' + a, a: b };
    }
    if (t === 3) {
      a = AP.ri(2, 12); b = AP.ri(2, 100);
      return { q: a + ' \u00D7 ' + b, a: a * b };
    }
    a = AP.ri(2, 12); b = AP.ri(2, 100);
    return { q: (a * b) + ' \u00F7 ' + a, a: b };
  }

  function nextQuestion() {
    AP.S.cur = generate();
    var e = AP.$('zq');
    if (e) e.textContent = AP.S.cur.q + ' =';
  }

  function finish() {
    var S = AP.S;
    AP.results('z', S.score,
      [['Score', S.score], ['Per sec', (S.score / DURATION).toFixed(2)], ['Baseline', '45']],
      '<b>Reference:</b> community benchmarks put 45&ndash;55 as a baseline for trading screens, ' +
      '55&ndash;70 as competitive, 70+ as comfortable at top market makers. Candidate-reported, not published ' +
      'cutoffs. Grinding only the defaults tends to stall around 55&ndash;60 &mdash; widening the ranges breaks ' +
      'the plateau.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, left: DURATION, level: 1 };

    AP.el(AP.board(
      '<div class="bar"><div class="top">' +
      '<button class="pause" id="bPause" aria-label="Quit"><i></i><i></i></button>' +
      '<div class="lvl">Score<b id="zS">0</b></div>' +
      '<div class="gt">Time<b id="zT">' + DURATION + '</b></div></div>' +
      '<div class="tolabel">Session</div><div class="tobar"><span id="cTO"></span></div></div>' +
      '<div class="field f-zeta"><div class="zwrap">' +
      '<div class="zq" id="zq"></div>' +
      '<input class="zin" id="zi" type="text" inputmode="numeric" autocomplete="off" aria-label="Answer">' +
      '<div class="zmeta">Default settings &middot; ' + DURATION + ' seconds</div>' +
      '</div></div>'));
    AP.wire();

    var input = AP.$('zi');
    input.addEventListener('input', function () {
      var v = input.value.replace(/[^0-9-]/g, '');
      if (v !== input.value) input.value = v;
      if (v !== '' && Number(v) === AP.S.cur.a) {
        AP.S.score++;
        AP.$('zS').textContent = AP.S.score;
        input.value = '';
        nextQuestion();
      }
    });
    input.focus();
    nextQuestion();

    AP.gt = setInterval(function () {
      AP.S.left--;
      var t = AP.$('zT'), b = AP.$('cTO');
      if (t) t.textContent = AP.S.left;
      if (b) b.style.transform = 'scaleX(' + Math.max(0, AP.S.left / DURATION) + ')';
      if (AP.S.left <= 0) { AP.stopAll(); finish(); }
    }, 1000);
  }

  AP.games.z = { start: start };
})();
