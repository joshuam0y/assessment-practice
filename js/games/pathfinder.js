/* pathfinder.js — rotate pipe tiles until the two amber terminals connect.

   Generation is solvable by construction: carve a random path with DFS, lay the
   correct connectors along it, fill the rest with decoys, then randomise every
   rotation. Tiles reachable from the start light up, so the player always sees
   the live edge of their path.

   Connection directions are indexed 0=N 1=E 2=S 3=W throughout. */

(function () {
  var DR = [-1, 0, 1, 0];
  var DC = [0, 1, 0, -1];

  function rotate(conn) { return [conn[3], conn[0], conn[1], conn[2]]; }

  function makeGrid(n) {
    var cells = [], r, c;
    for (r = 0; r < n; r++) {
      cells.push([]);
      for (c = 0; c < n; c++) cells[r].push({ conn: [0, 0, 0, 0], path: false });
    }

    var start = { r: AP.ri(0, n - 1), c: 0 };
    var end = { r: AP.ri(0, n - 1), c: n - 1 };
    var seen = {}, found = null;

    function key(p) { return p.r + ',' + p.c; }

    function dfs(p, acc) {
      if (found) return;
      if (p.r === end.r && p.c === end.c) {
        if (acc.length >= n + 1) found = acc.slice();
        return;
      }
      var order = AP.shuffle([0, 1, 2, 3]);
      for (var i = 0; i < 4; i++) {
        var d = order[i], nr = p.r + DR[d], nc = p.c + DC[d];
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        var np = { r: nr, c: nc };
        if (seen[key(np)]) continue;
        seen[key(np)] = 1;
        acc.push(np);
        dfs(np, acc);
        if (found) return;
        acc.pop();
        delete seen[key(np)];
      }
    }

    seen[key(start)] = 1;
    dfs(start, [start]);
    if (!found) found = [start, end];

    for (var i = 0; i < found.length - 1; i++) {
      var a = found[i], b = found[i + 1];
      for (var d = 0; d < 4; d++) {
        if (a.r + DR[d] === b.r && a.c + DC[d] === b.c) {
          cells[a.r][a.c].conn[d] = 1;
          cells[b.r][b.c].conn[(d + 2) % 4] = 1;
        }
      }
    }
    found.forEach(function (p) { cells[p.r][p.c].path = true; });

    for (r = 0; r < n; r++) {
      for (c = 0; c < n; c++) {
        var cell = cells[r][c];
        if (!cell.path) {
          cell.conn = AP.pick([
            [1, 0, 1, 0], [1, 1, 0, 0], [0, 1, 1, 0], [1, 1, 0, 1], [0, 1, 1, 1]
          ]).slice();
        }
        for (var t = AP.ri(0, 3); t > 0; t--) cell.conn = rotate(cell.conn);
      }
    }
    return { n: n, cells: cells, start: start, end: end };
  }

  /* Flood fill from the start across mutually-open edges. */
  function reachable(g) {
    var seen = {}, queue = [g.start];
    seen[g.start.r + ',' + g.start.c] = 1;
    while (queue.length) {
      var p = queue.shift(), cell = g.cells[p.r][p.c];
      for (var d = 0; d < 4; d++) {
        if (!cell.conn[d]) continue;
        var nr = p.r + DR[d], nc = p.c + DC[d];
        if (nr < 0 || nc < 0 || nr >= g.n || nc >= g.n) continue;
        if (!g.cells[nr][nc].conn[(d + 2) % 4]) continue;
        var k = nr + ',' + nc;
        if (seen[k]) continue;
        seen[k] = 1;
        queue.push({ r: nr, c: nc });
      }
    }
    return seen;
  }

  function pipeSVG(conn, lit, terminal) {
    var col = lit ? '#E8EEF4' : '#BBDEFB';
    var ends = [[30, 0], [60, 30], [30, 60], [0, 30]];
    var s = '<svg viewBox="0 0 60 60">';
    for (var d = 0; d < 4; d++) {
      if (conn[d]) {
        s += '<line x1="30" y1="30" x2="' + ends[d][0] + '" y2="' + ends[d][1] +
          '" stroke="' + col + '" stroke-width="14"/>';
      }
    }
    if (terminal) s += '<circle cx="30" cy="30" r="9" fill="#F5A623"/>';
    return s + '</svg>';
  }

  function draw() {
    AP.el(AP.board(AP.chrome(true) +
      '<div class="field f-path"><div class="pgrid" id="pg" style="grid-template-columns:repeat(' +
      AP.S.g.n + ',1fr)"></div></div>'));
    AP.wire();
    paint();
  }

  function paint() {
    var g = AP.S.g, lit = reachable(g), pg = AP.$('pg');
    if (!pg) return;
    pg.innerHTML = '';

    for (var r = 0; r < g.n; r++) {
      for (var c = 0; c < g.n; c++) {
        (function (r, c) {
          var cell = g.cells[r][c];
          var on = !!lit[r + ',' + c];
          var terminal = (r === g.start.r && c === g.start.c) || (r === g.end.r && c === g.end.c);
          var b = document.createElement('button');
          b.className = 'pcell' + (on ? ' lit' : '');
          b.innerHTML = pipeSVG(cell.conn, on, terminal);
          b.addEventListener('click', function () {
            if (AP.S.locked) return;
            cell.conn = rotate(cell.conn);
            paint();
            if (reachable(g)[g.end.r + ',' + g.end.c]) {
              AP.S.locked = true;
              AP.S.score++;
              AP.S.level++;
              clearInterval(AP.lt);
              AP.misc = setTimeout(next, 460);
            }
          });
          pg.appendChild(b);
        })(r, c);
      }
    }
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    var n = S.level < 4 ? 3 : (S.level < 9 ? 4 : 5);
    S.g = makeGrid(n);
    S.locked = false;
    S.lvlMax = Math.max(14, 34 - S.level);
    draw();
    AP.levelClock(function () { S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    AP.results('pf', S.score,
      [['Solved', S.score], ['Level', S.level], ['Per min', (S.score / 3).toFixed(1)]],
      '<b>Strategy:</b> work inward from both amber terminals, not left to right. They have the fewest valid ' +
      'orientations, so fixing them collapses the middle. Rotate toward a target orientation rather than ' +
      'spinning to see what happens.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, level: 1, locked: false, left: AP.GAME_TIME, lvlMax: 34 };
    next();
    AP.gameClock(finish);
  }

  AP.games.pf = { start: start };
})();
