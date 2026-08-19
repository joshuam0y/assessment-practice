/* core.js — shared state, storage, chrome, clocks, results.
   Loaded first. Everything hangs off the global AP namespace. */

var AP = {
  GAME_TIME: 180,
  KEY: 'ap:runs',
  S: null,
  gt: null,
  lt: null,
  misc: null,
  runs: [],
  games: {},
  main: null
};

/* ---------- metadata ---------- */
AP.GAMES = {
  num: { name: 'Numerosity', tag: 'Arithmetic', col: '#F5A623', unit: 'solved',
    desc: 'Tap hexes that hit the target using the operation shown. Escalates through all four operations.' },
  sd: { name: 'ShapeDance', tag: 'Mental rotation', col: '#D881F0', unit: 'matched',
    desc: 'Tap every card with an identical pattern (usually 2, sometimes more), then press COMPARE.' },
  pf: { name: 'Pathfinder', tag: 'Spatial', col: '#7FD4FF', unit: 'connected',
    desc: 'Slide tiles into the open space to connect the amber terminals. Grid grows 3\u00D73 to 5\u00D75.' },
  ds: { name: 'Digitspan', tag: 'Short-term memory', col: '#4ECDC4', unit: 'recalled',
    desc: 'Watch the sequence, tap it back on the honeycomb. Backward recall from span 5.' },
  z: { name: 'Zetamac', tag: 'Mental math', col: '#9BE564', unit: 'correct',
    desc: 'Two minutes, default settings. Type the answer; it advances automatically.' }
};

/* ---------- utilities ---------- */
AP.$ = function (id) { return document.getElementById(id); };
AP.el = function (html) { AP.main.innerHTML = html; };
AP.ri = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
AP.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
AP.shuffle = function (a) { return a.slice().sort(function () { return Math.random() - 0.5; }); };
AP.mmss = function (s) { return Math.floor(s / 60) + ':' + String(Math.max(0, s % 60)).padStart(2, '0'); };
AP.stopAll = function () { clearInterval(AP.gt); clearInterval(AP.lt); clearTimeout(AP.misc); };

/* ---------- storage ----------
   Schema: [{ g: gameKey, s: score, d: epochMillis }]
   localStorage is per-browser, per-device. No sync, no backend. */
AP.loadRuns = function () {
  try {
    var r = JSON.parse(localStorage.getItem(AP.KEY) || '[]');
    AP.runs = Array.isArray(r) ? r : [];
  } catch (e) { AP.runs = []; }
};
AP.saveRun = function (g, score) {
  AP.runs.push({ g: g, s: score, d: Date.now() });
  if (AP.runs.length > 300) AP.runs = AP.runs.slice(-300);
  try { localStorage.setItem(AP.KEY, JSON.stringify(AP.runs)); } catch (e) {}
};
AP.forGame = function (g) { return AP.runs.filter(function (r) { return r.g === g; }); };
AP.best = function (g) {
  var a = AP.forGame(g);
  return a.length ? Math.max.apply(null, a.map(function (r) { return r.s; })) : null;
};
AP.avg5 = function (g) {
  var a = AP.forGame(g).slice(-5);
  return a.length ? a.reduce(function (x, r) { return x + r.s; }, 0) / a.length : null;
};

/* ---------- shared chrome ---------- */
AP.board = function (inner) {
  return '<div class="backrow"><button class="back" id="bBack">&larr; All games</button></div>' +
    '<div class="board">' + inner + '</div>';
};

/* showLevelTimeout defaults true so the other four games are unaffected.
   Pathfinder passes false: the real HireVue game runs one 5-minute clock
   with no per-puzzle timer, so a level-timeout bar would misrepresent it. */
AP.chrome = function (showGameTime, showLevelTimeout) {
  if (showLevelTimeout === undefined) showLevelTimeout = true;
  return '<div class="bar"><div class="top">' +
    '<button class="pause" id="bPause" aria-label="Quit"><i></i><i></i></button>' +
    '<div class="lvl">Level<b id="cLvl">1</b></div>' +
    (showGameTime
      ? '<div class="gt">Game Time<b id="cGT">' + AP.mmss(AP.GAME_TIME) + '</b></div>'
      : '<div style="width:26px"></div>') +
    '</div>' +
    (showLevelTimeout
      ? '<div class="tolabel">Level Timeout</div><div class="tobar"><span id="cTO"></span></div>'
      : '') +
    '</div>';
};

AP.wire = function () {
  var p = AP.$('bPause'), b = AP.$('bBack');
  if (p) p.addEventListener('click', function () { AP.stopAll(); AP.home(); });
  if (b) b.addEventListener('click', function () { AP.stopAll(); AP.home(); });
  var e = AP.$('cLvl');
  if (e) e.textContent = AP.S.level;
};

/* Total round clock. Fires onEnd once. duration overrides AP.GAME_TIME for
   games that don't run the default 3 minutes (Pathfinder's real 5-minute
   single timer). Repaints #cGT immediately so the very first frame shows
   the right duration instead of the 3:00 default for one tick. */
AP.gameClock = function (onEnd, duration) {
  AP.S.left = duration || AP.GAME_TIME;
  var e0 = AP.$('cGT');
  if (e0) e0.textContent = AP.mmss(AP.S.left);
  AP.gt = setInterval(function () {
    AP.S.left--;
    var e = AP.$('cGT');
    if (e) e.textContent = AP.mmss(AP.S.left);
    if (AP.S.left <= 0) { AP.stopAll(); onEnd(); }
  }, 1000);
};

/* Per-level timeout bar. Reset by calling again. Reads AP.S.lvlMax. */
AP.levelClock = function (onTimeout) {
  clearInterval(AP.lt);
  AP.S.lvlLeft = AP.S.lvlMax;
  var b = AP.$('cTO');
  if (b) b.style.transform = 'scaleX(1)';
  AP.lt = setInterval(function () {
    AP.S.lvlLeft -= 0.2;
    var bb = AP.$('cTO');
    if (bb) bb.style.transform = 'scaleX(' + Math.max(0, AP.S.lvlLeft / AP.S.lvlMax) + ')';
    if (AP.S.lvlLeft <= 0) { clearInterval(AP.lt); onTimeout(); }
  }, 200);
};

/* Hexagon used by Numerosity (numbers) and Digitspan (letters). */
AP.hexSVG = function (label, col, small) {
  return '<svg viewBox="0 0 100 114" aria-hidden="true">' +
    '<polygon points="50,3 95,29 95,85 50,111 5,85 5,29" fill="' + col +
    '" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>' +
    '<text x="50" y="57" text-anchor="middle" dominant-baseline="central" fill="#fff" ' +
    'font-family="Outfit,sans-serif" font-size="' + (small ? 34 : 38) + '" font-weight="700">' +
    label + '</text></svg>';
};

/* Scatter positions keyed by tile count, as [left%, top%]. */
AP.LAY = {
  4: [[28, 24], [72, 22], [26, 70], [72, 72]],
  5: [[28, 18], [70, 16], [50, 42], [26, 70], [70, 72]],
  6: [[26, 14], [70, 15], [50, 37], [24, 60], [72, 60], [48, 82]],
  8: [[24, 12], [62, 11], [42, 29], [78, 31], [22, 50], [58, 51], [36, 72], [72, 74]],
  10: [[22, 10], [58, 9], [40, 25], [76, 26], [20, 42], [56, 42], [80, 44], [32, 62], [66, 63], [46, 82]]
};

/* Results screen. Saves the run, flags a personal best, offers a replay. */
AP.results = function (gameKey, score, cells, tip, again) {
  AP.stopAll();
  var pb = AP.best(gameKey);
  var isPB = (pb === null || score > pb) && score > 0;
  AP.saveRun(gameKey, score);

  var h = '<div class="rpanel"><div class="pbflag"' + (isPB ? '' : ' style="color:var(--dim)"') + '>' +
    (isPB ? 'New personal best' : 'Round over') + '</div>' +
    '<h1 style="margin-top:8px">' + score + ' ' + AP.GAMES[gameKey].unit + '</h1><div class="sl">';
  cells.forEach(function (c) {
    h += '<div class="sc"><div class="l">' + c[0] + '</div><div class="v">' + c[1] + '</div></div>';
  });
  h += '</div><div class="tip">' + tip + '</div><div class="row2">' +
    '<button class="btn go" id="rAgain">Play again</button>' +
    '<button class="btn" id="rStats">Stats</button>' +
    '<button class="btn" id="rMenu">Games</button></div></div>';

  AP.el(h);
  AP.$('rAgain').addEventListener('click', again);
  AP.$('rStats').addEventListener('click', AP.stats);
  AP.$('rMenu').addEventListener('click', AP.home);
};
