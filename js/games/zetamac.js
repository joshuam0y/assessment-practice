/* zetamac.js — 120 seconds of arithmetic, default settings.

   Layout deliberately matches the real zetamac.com (arithmetic.zetamac.com)
   as closely as possible, NOT the shared boxed "phone" chrome the other
   four games render into: a bare page, "Seconds left" top-left and "Score"
   top-right as plain text (no timeout bar, no level counter, no pause
   button), and one full-width light-gray band mid-page holding the current
   problem and its input on a single line. At round end, that same band
   swaps to "Score: N" plus "Try again" / "change settings" links, same as
   the reference -- "change settings" has no settings screen to go to in
   this app, so it's wired to the game picker instead. The usual PB flag /
   stats / strategy tip still appear below, just visually separated rather
   than replacing the reference layout, so nothing useful is lost.

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
      return { q: (a + b) + ' − ' + a, a: b };
    }
    if (t === 3) {
      a = AP.ri(2, 12); b = AP.ri(2, 100);
      return { q: a + ' × ' + b, a: a * b };
    }
    a = AP.ri(2, 12); b = AP.ri(2, 100);
    return { q: (a * b) + ' ÷ ' + a, a: b };
  }

  function nextQuestion() {
    AP.S.cur = generate();
    var e = AP.$('zq');
    if (e) e.textContent = AP.S.cur.q + ' =';
  }

  function finish() {
    var S = AP.S;
    AP.stopAll();
    var pb = AP.best('z');
    var isPB = (pb === null || S.score > pb) && S.score > 0;
    AP.saveRun('z', S.score);

    var band = AP.$('zBandInner');
    if (band) {
      band.innerHTML =
        '<div class="zeta-end-score">Score: ' + S.score + '</div>' +
        '<div class="zeta-end-links"><a href="#" id="zAgain">Try again</a> or ' +
        '<a href="#" id="zSettings">change settings</a>.</div>';
      AP.$('zAgain').addEventListener('click', function (e) { e.preventDefault(); start(); });
      AP.$('zSettings').addEventListener('click', function (e) { e.preventDefault(); AP.stopAll(); AP.home(); });
    }

    var extra = AP.$('zExtra');
    if (extra) {
      extra.innerHTML =
        '<div class="pbflag"' + (isPB ? '' : ' style="color:var(--dim)"') + '>' +
        (isPB ? 'New personal best' : 'Round over') + '</div>' +
        '<div class="sl">' +
        [['Score', S.score], ['Per sec', (S.score / DURATION).toFixed(2)], ['Baseline', '45']]
          .map(function (c) { return '<div class="sc"><div class="l">' + c[0] + '</div><div class="v">' + c[1] + '</div></div>'; })
          .join('') +
        '</div><div class="tip"><b>Reference:</b> community benchmarks put 45&ndash;55 as a baseline for trading ' +
        'screens, 55&ndash;70 as competitive, 70+ as comfortable at top market makers. Candidate-reported, not ' +
        'published cutoffs. Grinding only the defaults tends to stall around 55&ndash;60 &mdash; widening the ' +
        'ranges breaks the plateau.</div><div class="row2">' +
        '<button class="btn" id="zStats">Stats</button><button class="btn" id="zMenu">Games</button></div>';
      AP.$('zStats').addEventListener('click', AP.stats);
      AP.$('zMenu').addEventListener('click', function () { AP.stopAll(); AP.home(); });
    }
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, left: DURATION };

    AP.el(
      '<div class="backrow"><button class="back" id="bBack">&larr; All games</button></div>' +
      '<div class="zeta-page">' +
        '<div class="zeta-topbar"><span>Seconds left: <b id="zT">' + DURATION + '</b></span>' +
        '<span>Score: <b id="zS">0</b></span></div>' +
        '<div class="zeta-band"><div class="zeta-band-inner" id="zBandInner">' +
        '<span class="zq" id="zq"></span>' +
        '<input class="zin" id="zi" type="text" inputmode="numeric" autocomplete="off" aria-label="Answer">' +
        '</div></div>' +
        '<div class="zeta-extra" id="zExtra"></div>' +
      '</div>'
    );
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
      var t = AP.$('zT');
      if (t) t.textContent = AP.S.left;
      if (AP.S.left <= 0) { AP.stopAll(); finish(); }
    }, 1000);
  }

  AP.games.z = { start: start };
})();
