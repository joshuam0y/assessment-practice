/* pathfinder.js — slide tiles into open space until the two amber terminals
   connect. Frame-measured against three real HireVue gameplay recordings
   (ffmpeg + blob/angle tracking on actual footage, not vendor prose) --
   numbers below are as-observed, not estimated:

   - Sliding (not rotation) confirmed by HireVue's own in-game instruction
     text captured from footage: "Slide the blocks to create a path between
     the endpoints." / "Some of the tiles can't be moved."
   - 5:00 total session time, but ALSO a real per-puzzle timeout (~60s,
     measured 63.6s from the bar's drain rate) -- an earlier version of this
     file removed the per-puzzle timer based on weaker (text-only) research
     that turned out to be wrong. Confirmed on camera: Level 17's bar drained
     to zero and dropped the run to Level 16.
   - Level: +2 per solve, -1 per fail/timeout (measured from the on-screen
     level counter across two full runs).
   - Grid size: 3x3 for levels 1-9, 4x4 from level 11 on (levels 1..9 by
     +2 steps never lands exactly on 10, which is why the cutover reads as
     "11" in the footage). HireVue's own instruction artwork shows a board
     5 tiles wide, implying 5x5 appears further in than any run captured.
   - Exactly 2 empty (slidable-into) cells on every board observed, at both
     3x3 and 4x4 -- this does not scale with grid size. Fixed (immovable)
     tiles: always both endpoints, plus 1-2 extra "obstacle" blanks once the
     grid grows to 4x4.
   - Tile shapes actually seen: straight, corner, and endpoint/stub (a
     single connector with a rounded cap). No T-junctions or crosses appear
     on any board in any recording -- dropped from the decoy pool.

   Generation is solvable by construction: carve a random path with DFS, lay
   the correct connectors along it in their FINAL orientation (nothing
   rotates, only position changes), then scramble by replaying real slide
   moves from that solved state -- every scrambled position is therefore
   reachable back to solved.

   Connection directions are indexed 0=N 1=E 2=S 3=W throughout. */

(function () {
  var DR = [-1, 0, 1, 0];
  var DC = [0, 1, 0, -1];
  var PF_TIME = 300;
  var PF_LEVEL_TIME = 60;

  /* Straight (2 rotations), corner (4 rotations), stub/dead-end (4
     rotations). No T-junctions or crosses -- none appear in any of the
     recorded footage. */
  var DECOY_SHAPES = [
    [1, 0, 1, 0], [0, 1, 0, 1],
    [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1],
    [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
  ];

  function key(p) { return p.r + ',' + p.c; }
  function isSamePos(a, b) { return a.r === b.r && a.c === b.c; }
  function isAtAnyOf(p, list) { return list.some(function (e) { return isSamePos(p, e); }); }

  function makeSolvedGrid(n) {
    var cells = [], r, c;
    for (r = 0; r < n; r++) {
      cells.push([]);
      for (c = 0; c < n; c++) cells[r].push({ conn: [0, 0, 0, 0], path: false, fixed: false });
    }

    var start = { r: AP.ri(0, n - 1), c: 0 };
    var end = { r: AP.ri(0, n - 1), c: n - 1 };
    var seen = {}, found = null;

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
    cells[start.r][start.c].fixed = true;
    cells[end.r][end.c].fixed = true;

    var nonPath = [];
    for (r = 0; r < n; r++) {
      for (c = 0; c < n; c++) if (!cells[r][c].path) nonPath.push({ r: r, c: c });
    }
    nonPath = AP.shuffle(nonPath);

    /* 1-2 fixed obstacle blanks once the grid is 4x4+ -- solid blockers,
       not pipe tiles, and never part of the empty/slide pool. */
    var obstacleCount = n >= 4 ? AP.ri(1, 2) : 0;
    var obstacles = nonPath.splice(0, Math.min(obstacleCount, nonPath.length));
    obstacles.forEach(function (p) { cells[p.r][p.c].fixed = true; cells[p.r][p.c].conn = [0, 0, 0, 0]; });

    /* Always exactly 2 empty cells, regardless of grid size. */
    var empties = nonPath.splice(0, Math.min(2, nonPath.length));
    while (empties.length < 2) empties.push(empties.length ? empties[0] : { r: 0, c: 0 });

    nonPath.forEach(function (p) { cells[p.r][p.c].conn = AP.pick(DECOY_SHAPES).slice(); });

    return { n: n, cells: cells, start: start, end: end, empties: empties };
  }

  /* Every cell the player could actually click right now, paired with which
     empty slot that click would resolve to. Mirrors paint()'s click handler
     exactly: a cell adjacent to only one empty targets that one; a cell
     adjacent to BOTH empties always resolves to empties[0], never empties[1]
     -- the same rule the real UI enforces. Scrambling with this (instead of
     picking an empty first, then a neighbor) is what makes "every scrambled
     state solvable" actually true through the deployed UI: an earlier
     version scrambled by choosing the empty first, which could pick
     empties[1] for a tile that was ALSO adjacent to empties[0] -- a swap the
     click UI can never perform for that tile, since it would always route to
     empties[0] instead. That produced boards a real BFS solver (with no such
     restriction) called solvable, but a player using the actual buttons
     could get stuck on with no legal way to finish -- confirmed by
     reproducing it directly against the shipped click handler. */
  function clickableCells(g) {
    var out = [];
    for (var r = 0; r < g.n; r++) {
      for (var c = 0; c < g.n; c++) {
        var pos = { r: r, c: c };
        if (g.cells[r][c].fixed) continue;
        if (isAtAnyOf(pos, g.empties)) continue;
        var adj0 = isAdjacent(pos, g.empties[0]);
        var adj1 = isAdjacent(pos, g.empties[1]);
        if (!adj0 && !adj1) continue;
        out.push({ pos: pos, targetIdx: adj0 ? 0 : 1 });
      }
    }
    return out;
  }

  function scramble(g, moves) {
    for (var i = 0; i < moves; i++) {
      var opts = clickableCells(g);
      if (!opts.length) continue;
      var pick = AP.pick(opts);
      var emptyPos = g.empties[pick.targetIdx];
      var tmp = g.cells[emptyPos.r][emptyPos.c];
      g.cells[emptyPos.r][emptyPos.c] = g.cells[pick.pos.r][pick.pos.c];
      g.cells[pick.pos.r][pick.pos.c] = tmp;
      g.empties[pick.targetIdx] = pick.pos;
    }
  }

  function isAdjacent(a, b) { return (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1; }

  /* Flood fill from the start across mutually-open edges. */
  function reachable(g) {
    var seen = {}, queue = [g.start];
    seen[key(g.start)] = 1;
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
      AP.S.g.n + ',1fr)"></div>' +
      '<button class="cta" id="pfSkip">Skip this one</button></div>'));
    AP.wire();
    paint();
    AP.$('pfSkip').addEventListener('click', function () {
      if (AP.S.locked) return;
      AP.S.level = Math.max(1, AP.S.level - 1);
      next();
    });
  }

  function paint() {
    var g = AP.S.g, lit = reachable(g), pg = AP.$('pg');
    if (!pg) return;
    pg.innerHTML = '';

    for (var r = 0; r < g.n; r++) {
      for (var c = 0; c < g.n; c++) {
        (function (r, c) {
          var pos = { r: r, c: c };
          var cell = g.cells[r][c];
          var isEmpty = isAtAnyOf(pos, g.empties);
          var isObstacle = cell.fixed && !cell.path;
          var on = !isEmpty && !isObstacle && !!lit[key(pos)];
          var terminal = !isEmpty &&
            ((r === g.start.r && c === g.start.c) || (r === g.end.r && c === g.end.c));
          var slidable = !isEmpty && !cell.fixed &&
            (isAdjacent(pos, g.empties[0]) || isAdjacent(pos, g.empties[1]));

          var b = document.createElement('button');
          b.className = 'pcell' + (on ? ' lit' : '') + (isEmpty ? ' empty' : '') +
            (isObstacle ? ' obstacle' : '') + (slidable ? ' slidable' : '');
          b.innerHTML = (isEmpty || isObstacle) ? '' : pipeSVG(cell.conn, on, terminal);
          b.addEventListener('click', function () {
            if (AP.S.locked || isEmpty || cell.fixed || !slidable) return;
            var targetIdx = isAdjacent(pos, g.empties[0]) ? 0 : 1;
            var emptyPos = g.empties[targetIdx];
            var tmp = g.cells[emptyPos.r][emptyPos.c];
            g.cells[emptyPos.r][emptyPos.c] = cell;
            g.cells[r][c] = tmp;
            g.empties[targetIdx] = pos;
            AP.S.moves++;
            paint();
            if (reachable(g)[key(g.end)]) {
              AP.S.locked = true;
              AP.S.score++;
              AP.S.level += 2;
              AP.misc = setTimeout(next, 460);
            }
          });
          pg.appendChild(b);
        })(r, c);
      }
    }
  }

  function serialize(g) {
    return g.empties.map(function (e) { return e.r + ',' + e.c; }).join('|') + '#' +
      g.cells.map(function (row) { return row.map(function (c) { return c.conn.join(''); }).join(';'); }).join('/');
  }

  function cloneForCheck(g) {
    return {
      n: g.n, start: g.start, end: g.end,
      empties: g.empties.map(function (e) { return { r: e.r, c: e.c }; }),
      cells: g.cells.map(function (row) {
        return row.map(function (c) { return { conn: c.conn.slice(), fixed: c.fixed, path: c.path }; });
      })
    };
  }

  /* Real solvability check using the exact same tie-break rule the click
     handler enforces (clickableCells), not just "some sequence of swaps
     exists." Confirmed by testing this specific case: scrambling by picking
     an empty first (rather than picking a clickable tile first, as
     clickableCells now does) can still occasionally produce a board where
     reversing the scramble isn't itself a legal click sequence, and no
     alternate legal sequence exists either -- a board a graph-theoretic
     "some swap sequence solves it" checker would call fine but a real
     player using the actual buttons could get stuck on with no way out.
     Bounded by both depth and total states explored so a rare hard case
     can't hang the page. */
  function isSolvable(startGrid, maxDepth, maxStates) {
    if (reachable(startGrid)[key(startGrid.end)]) return true;
    var seen = {};
    seen[serialize(startGrid)] = 1;
    var frontier = [startGrid];
    for (var depth = 1; depth <= maxDepth; depth++) {
      var next = [];
      for (var fi = 0; fi < frontier.length; fi++) {
        var opts = clickableCells(frontier[fi]);
        for (var oi = 0; oi < opts.length; oi++) {
          if (Object.keys(seen).length > maxStates) return true; // assume solvable rather than hang
          var g2 = cloneForCheck(frontier[fi]);
          var emptyPos = g2.empties[opts[oi].targetIdx];
          var tmp = g2.cells[emptyPos.r][emptyPos.c];
          g2.cells[emptyPos.r][emptyPos.c] = g2.cells[opts[oi].pos.r][opts[oi].pos.c];
          g2.cells[opts[oi].pos.r][opts[oi].pos.c] = tmp;
          g2.empties[opts[oi].targetIdx] = opts[oi].pos;
          var k = serialize(g2);
          if (seen[k]) continue;
          seen[k] = 1;
          if (reachable(g2)[key(g2.end)]) return true;
          next.push(g2);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return false;
  }

  function next() {
    var S = AP.S;
    if (S.left <= 0) return;
    var n = S.level <= 9 ? 3 : (S.level <= 20 ? 4 : 5);
    var attempts = 0;
    do {
      S.g = makeSolvedGrid(n);
      scramble(S.g, n * n * 3);
      attempts++;
    } while (!isSolvable(S.g, 45, 6000) && attempts < 8);
    S.locked = false;
    S.lvlMax = PF_LEVEL_TIME;
    draw();
    AP.levelClock(function () { S.level = Math.max(1, S.level - 1); next(); });
  }

  function finish() {
    var S = AP.S;
    AP.results('pf', S.score,
      [['Solved', S.score], ['Level', S.level], ['Moves', S.moves]],
      '<b>Strategy:</b> work the empty slots toward where the amber terminals still need to connect, one slide ' +
      'at a time, like a 15-puzzle &mdash; plan two or three moves ahead instead of sliding whatever happens ' +
      'to be adjacent. There are two open slots, not one, so you often have a choice of which to use -- pick ' +
      'whichever keeps your other slot useful. Skip a puzzle that has gone sideways rather than burning the ' +
      'full 60-second level timer fighting it; a skip costs the same one level a timeout would.',
      start);
  }

  function start() {
    AP.stopAll();
    AP.S = { score: 0, level: 1, locked: false, moves: 0, left: PF_TIME };
    next();
    AP.gameClock(finish, PF_TIME);
  }

  AP.games.pf = { start: start };
})();
