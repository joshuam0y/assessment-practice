/* app.js — views and boot. Loaded last, after core and every game module. */

(function () {

  AP.home = function () {
    AP.stopAll();
    setNav('games');

    var h = '<div class="hero"><h1>Assessment practice</h1>' +
      '<p class="lede">Five timed drills for pre-employment cognitive assessments. Every round is generated ' +
      'fresh, so there is nothing to memorise. Scores are saved on this device only.</p></div>' +
      '<h2>Games</h2><div class="grid">';

    Object.keys(AP.GAMES).forEach(function (k) {
      var g = AP.GAMES[k], pb = AP.best(k), n = AP.forGame(k).length;
      h += '<button class="gcard" data-g="' + k + '">' +
        '<div class="tag" style="color:' + g.col + '">' + g.tag + '</div>' +
        '<h3>' + g.name + '</h3><p>' + g.desc + '</p>' +
        '<div class="pb">' +
        (pb === null
          ? 'No runs yet'
          : 'Best <b>' + pb + '</b> ' + g.unit + ' &middot; ' + n + ' run' + (n === 1 ? '' : 's')) +
        '</div></button>';
    });
    h += '</div>';

    AP.el(h);
    Array.prototype.forEach.call(document.querySelectorAll('.gcard'), function (b) {
      b.addEventListener('click', function () {
        var g = AP.games[b.getAttribute('data-g')];
        if (g) g.start();
      });
    });
  };

  /* Bar chart of recent scores. PR bar in amber. */
  function spark(scores) {
    if (scores.length < 2) return '<svg class="spark" viewBox="0 0 300 44"></svg>';
    var d = scores.slice(-24);
    var mx = Math.max.apply(null, d), mn = Math.min.apply(null, d);
    var range = Math.max(1, mx - mn), w = 300 / d.length;
    var s = '<svg class="spark" viewBox="0 0 300 44" preserveAspectRatio="none" role="img" ' +
      'aria-label="Recent scores, most recent on the right">';
    d.forEach(function (v, i) {
      var h = 6 + ((v - mn) / range) * 32;
      s += '<rect x="' + (i * w + 1) + '" y="' + (42 - h) + '" width="' + Math.max(2, w - 2) +
        '" height="' + h + '" rx="1" fill="' + (v === mx ? '#F5A623' : '#4ECDC4') +
        '" opacity="' + (v === mx ? 1 : 0.7) + '"/>';
    });
    return s + '</svg>';
  }

  AP.stats = function () {
    AP.stopAll();
    setNav('stats');

    if (!AP.runs.length) {
      AP.el('<div class="hero"><h1>Stats</h1><p class="lede">Nothing logged yet. Play a round and your ' +
        'scores show up here &mdash; best, recent average, and a trend bar per game.</p></div>' +
        '<button class="btn go" id="sBack" style="max-width:200px">Go to games</button>');
      AP.$('sBack').addEventListener('click', AP.home);
      return;
    }

    var h = '<div class="hero"><h1>Stats</h1><p class="lede">' + AP.runs.length +
      ' runs logged on this device. Watch the last-5 average rather than the best &mdash; it is what you ' +
      'would actually score on a random day.</p></div>';

    Object.keys(AP.GAMES).forEach(function (k) {
      var a = AP.forGame(k);
      if (!a.length) return;
      var g = AP.GAMES[k];
      var scores = a.map(function (r) { return r.s; });
      var mean = scores.reduce(function (x, y) { return x + y; }, 0) / scores.length;

      h += '<div class="srow"><div class="hd">' +
        '<h3 style="color:' + g.col + '">' + g.name + '</h3>' +
        '<span class="n">' + a.length + ' run' + (a.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="snums">' +
        '<div>Best<b>' + Math.max.apply(null, scores) + '</b></div>' +
        '<div>Last 5<b>' + AP.avg5(k).toFixed(1) + '</b></div>' +
        '<div>All time<b>' + mean.toFixed(1) + '</b></div>' +
        '</div>' + spark(scores) + '</div>';
    });

    h += '<button class="danger" id="clr">Clear all data</button>';
    AP.el(h);

    var armed = false;
    AP.$('clr').addEventListener('click', function () {
      if (!armed) {
        armed = true;
        AP.$('clr').textContent = 'Click again to confirm';
        setTimeout(function () {
          armed = false;
          var c = AP.$('clr');
          if (c) c.textContent = 'Clear all data';
        }, 4000);
        return;
      }
      AP.runs = [];
      try { localStorage.removeItem(AP.KEY); } catch (e) {}
      AP.stats();
    });
  };

  function setNav(view) {
    AP.$('navGames').classList.toggle('on', view === 'games');
    AP.$('navStats').classList.toggle('on', view === 'stats');
  }

  /* boot */
  AP.main = document.getElementById('main');
  AP.$('navGames').addEventListener('click', AP.home);
  AP.$('navStats').addEventListener('click', AP.stats);
  AP.loadRuns();
  AP.home();
})();
