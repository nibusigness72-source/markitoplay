// color-flow.js  —  COLOR FLOW
// Ek hi rang ke do gole ko ungli se jodo. Koi line kisi dusri line ko cut nahi karegi
// aur board ka har box bharna zaroori hai. Gole par tap karo to us rang ki line hat jayegi.
// Awaaz ki settings color-flow-sound.js mein hain. Rang/size ki settings color-flow.css mein.
(function () {
  // =====================================================================
  //   ADMIN PANEL  —  yahan se sab kuch badal sakte ho (sirf number/naam badlo)
  // =====================================================================
  var CONFIG = {
    // ---- Mode: game kitna mushkil ----
    MODE: 'hard',           // 'normal' = aasaan  |  'hard' = mushkil (bade board, zyada rang)

    // ---- Game ----
    TIME: 60,                 // poora game kitne second ka (60 = 1 minute)
    PAIR_POINTS: 2,           // ek rang ke do gole mil jayein to kitne point (har rang ke sirf ek baar)
    LEVEL_POINTS: 15,         // poora level (saare rang mile + poora box bhara) hone par kitne point
    TIME_BONUS: 0,            // level poora hone par kitne second extra time mile (0 = koi nahi)
    SKIP_PENALTY: 0,          // Skip dabane par kitne point kate (0 = kuch nahi katega)
    NEXT_LEVEL_DELAY: 0.9,    // level poora hone ke baad agla level kitne second mein aaye

    // ---- Puzzle ----
    MIN_LEN: 3,               // ek rang ki line mein kam se kam kitne box (2 = bahut aasaan, 4 = mushkil)

    // ---- Levels: cols = chaudai, rows = lambai, colors = kitne rang ----
    // Level 1 pehli line se, level 2 dusri line se... aakhri line ke baad wahi size baar-baar aayega.
    LEVELS: {
      normal: [
        { cols: 4, rows: 4, colors: 3 },
        { cols: 4, rows: 5, colors: 4 },
        { cols: 5, rows: 5, colors: 4 },
        { cols: 5, rows: 6, colors: 5 },
        { cols: 6, rows: 6, colors: 5 },
        { cols: 6, rows: 7, colors: 6 },
        { cols: 7, rows: 7, colors: 6 },
        { cols: 7, rows: 8, colors: 7 }
      ],
      hard: [
        { cols: 5, rows: 5, colors: 4 },
        { cols: 5, rows: 6, colors: 5 },
        { cols: 6, rows: 6, colors: 6 },
        { cols: 6, rows: 7, colors: 7 },
        { cols: 7, rows: 7, colors: 8 },
        { cols: 7, rows: 8, colors: 9 }
      ]
    },

    // ---- Dikhne mein ----
    COLORS: ['#ff4d4d', '#2a6cff', '#12c21b', '#ffee00', '#ff8c00', '#00e5ff', '#b24fc9', '#ffffff', '#00ff8c', '#a31212', '#1b3bd1'],
    LINE_WIDTH: 0.34,         // line kitni moti (box ka hissa)
    DOT_SIZE: 0.38,           // gole kitne bade (box ka hissa)
    GLOW: true,               // ungli ke paas halka gola dikhe

    // ---- Score save (score.js ke zariye) ----
    SAVE_NAME: 'color-flow'
  };
  // =====================================================================

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('board'), ctx = cv.getContext('2d');
  var W = 360, DPR = Math.min(window.devicePixelRatio || 1, 2), TAU = Math.PI * 2;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var P = null;                           // abhi ka puzzle
  var state = 'ready', score = 0, timeLeft = CONFIG.TIME, levelNo = 1, winT = 0, lastHint = 0;
  var cur = -1, finger = null, popups = [];

  // ---------- Puzzle banana: pehle poora board bharne wala raasta, phir usse tukde ----------
  function hamPath(cols, rows) {
    var N = cols * rows, p = [], pos = [], i, r, c;
    for (r = 0; r < rows; r++) for (i = 0; i < cols; i++) { c = (r % 2 === 0) ? i : cols - 1 - i; p.push(r * cols + c); }
    function reindex(from) { for (var x = from; x < N; x++) pos[p[x]] = x; }
    reindex(0);
    for (var it = 0; it < N * 30; it++) {
      if (Math.random() < 0.5) { p.reverse(); reindex(0); }
      var head = p[N - 1], hr = Math.floor(head / cols), hc = head % cols, nb = [];
      if (hr > 0) nb.push(head - cols);
      if (hr < rows - 1) nb.push(head + cols);
      if (hc > 0) nb.push(head - 1);
      if (hc < cols - 1) nb.push(head + 1);
      nb = nb.filter(function (n) { return n !== p[N - 2]; });
      if (!nb.length) continue;
      var j = pos[nb[rnd(nb.length)]], a = j + 1, b = N - 1, t;
      while (a < b) { t = p[a]; p[a] = p[b]; p[b] = t; a++; b--; }
      reindex(j + 1);
    }
    return p;
  }

  function levelCfg() {
    var list = CONFIG.LEVELS[CONFIG.MODE] || CONFIG.LEVELS.normal;
    return list[Math.min(levelNo - 1, list.length - 1)];
  }

  function newLevel() {
    var L = levelCfg(), cols = L.cols, rows = L.rows, k = Math.min(L.colors, CONFIG.COLORS.length), N = cols * rows;
    var minLen = Math.max(2, Math.min(CONFIG.MIN_LEN, Math.floor(N / k)));
    var path = hamPath(cols, rows), lens = [], i, extra = N - k * minLen;
    for (i = 0; i < k; i++) lens.push(minLen);
    while (extra-- > 0) lens[rnd(k)]++;
    var order = shuffle(CONFIG.COLORS.map(function (_, x) { return x; })).slice(0, k);
    P = { cols: cols, rows: rows, k: k, N: N, cell: W / cols, H: (W / cols) * rows,
          colorOf: order, dots: [], dotAt: [], owner: [], paths: [], done: [], paid: [] };
    for (i = 0; i < N; i++) { P.dotAt.push(-1); P.owner.push(-1); }
    var idx = 0;
    for (i = 0; i < k; i++) {
      var seg = path.slice(idx, idx + lens[i]); idx += lens[i];
      P.dots.push([seg[0], seg[seg.length - 1]]);
      P.dotAt[seg[0]] = P.dotAt[seg[seg.length - 1]] = i;
      P.owner[seg[0]] = P.owner[seg[seg.length - 1]] = i;
      P.paths.push([]); P.done.push(false); P.paid.push(false);
    }
    cur = -1; finger = null;
    cv.width = W * DPR; cv.height = P.H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fit(); setHud();
  }

  function fit() {
    if (!P) return;
    var st = $('stage'), aw = st.clientWidth, ah = st.clientHeight;
    var w = Math.min(aw, ah * W / P.H);
    cv.style.width = w + 'px'; cv.style.height = (w * P.H / W) + 'px';
  }
  window.addEventListener('resize', fit);

  // ---------- HUD ----------
  function setHud() {
    $('score').textContent = score;
    $('level').textContent = levelNo;
    $('time').textContent = Math.max(0, Math.ceil(timeLeft));
    $('bar').style.width = Math.max(0, Math.min(100, timeLeft / CONFIG.TIME * 100)) + '%';
    $('modeName').textContent = CONFIG.MODE.toUpperCase();
    document.querySelector('.timer').classList.toggle('low', timeLeft <= 10 && state !== 'ready');
  }
  function pop(text, x, y, color) { popups.push({ text: text, x: x, y: y, color: color, life: 1.1 }); }
  function centerOf(c) { return { x: (c % P.cols + 0.5) * P.cell, y: (Math.floor(c / P.cols) + 0.5) * P.cell }; }

  // ---------- Game shuru / khatam ----------
  function startGame() {
    ColorFlowSound.unlock();
    score = 0; timeLeft = CONFIG.TIME; levelNo = 1; popups = [];
    $('overlay').classList.add('hide');
    state = 'play'; newLevel();
  }
  $('startBtn').onclick = startGame;

  $('skipBtn').onclick = function () {                    // Skip: agla level, koi point nahi
    if (state !== 'play') return;
    ColorFlowSound.unlock(); ColorFlowSound.skip();
    score = Math.max(0, score - CONFIG.SKIP_PENALTY);
    levelNo++; newLevel();
  };

  function endGame() {
    state = 'over'; cur = -1;
    $('msg').innerHTML = '<b style="font-size:26px">⏰ Time khatam</b><br><br>Score: ' + score + '<br>Level: ' + levelNo;
    $('startBtn').textContent = 'Phir se khelo';
    $('overlay').classList.remove('hide');
    ColorFlowSound.end();
    if (score > 0 && window.PWScore) {                    // Score score.js ke zariye save hota hai
      var s = score;
      Promise.resolve(PWScore.save(CONFIG.SAVE_NAME, s)).then(function (res) {
        if (res) $('msg').innerHTML += '<br><small>+' + s + ' points mile</small>';
      }).catch(function () {});
    }
    setHud();
  }

  // ---------- Line banane ka logic ----------
  function unmark(c) { if (P.dotAt[c] < 0) P.owner[c] = -1; }
  function clearPath(k) {
    P.paths[k].forEach(unmark);
    P.paths[k] = []; P.done[k] = false;
  }

  function finishPath(k) {
    P.done[k] = true;
    ColorFlowSound.connect();
    if (!P.paid[k]) {                                      // har rang ke point sirf ek baar
      P.paid[k] = true; score += CONFIG.PAIR_POINTS;
      var head = P.paths[k][P.paths[k].length - 1], c = centerOf(head);
      pop('+' + CONFIG.PAIR_POINTS, c.x, c.y, CONFIG.COLORS[P.colorOf[k]]);
    }
    setHud(); checkLevel();
  }

  function checkLevel() {
    var i, filled = 0;
    for (i = 0; i < P.k; i++) if (!P.done[i]) return;
    state = 'win'; winT = 0; cur = -1;
    score += CONFIG.LEVEL_POINTS; timeLeft += CONFIG.TIME_BONUS;
    pop('LEVEL +' + CONFIG.LEVEL_POINTS, W / 2, P.H / 2, '#ffd23f');
    ColorFlowSound.level(); setHud();
  }

  function extend(n) {                                    // ungli n box par aayi: line badhao / peeche karo
    var k = cur, path = P.paths[k], len = path.length, head = path[len - 1];
    if (len >= 2 && n === path[len - 2]) {                // peeche ki taraf
      unmark(head); path.pop(); P.done[k] = false; ColorFlowSound.step(path.length); return true;
    }
    if (P.done[k]) return false;                          // jud chuki line aage nahi badhti
    var o = P.owner[n];
    if (o === k) {
      if (P.dotAt[n] === k && n !== path[0]) { path.push(n); finishPath(k); return true; }   // dusra gola mila
      var i = path.indexOf(n);
      if (i >= 0) { for (var j = i + 1; j < path.length; j++) unmark(path[j]); path.length = i + 1; return true; }
      return false;
    }
    if (o >= 0) { ColorFlowSound.blocked(); return false; }  // dusre rang ki line/gole ko cut nahi kar sakte
    path.push(n); P.owner[n] = k; ColorFlowSound.step(path.length);
    return true;
  }

  function cellAt(e) {
    var r = cv.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * P.H;
    finger = { x: x, y: y };
    var c = Math.max(0, Math.min(P.cols - 1, Math.floor(x / P.cell)));
    var rr = Math.max(0, Math.min(P.rows - 1, Math.floor(y / P.cell)));
    return rr * P.cols + c;
  }

  function down(e) {
    if (state !== 'play') return;
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    ColorFlowSound.unlock();
    var c = cellAt(e), k;
    if (P.dotAt[c] >= 0) {                                // gole par tap: us rang ki purani line hat jaati hai
      k = P.dotAt[c];
      if (P.paths[k].length > 1) ColorFlowSound.clear(); else ColorFlowSound.start();
      clearPath(k); P.paths[k] = [c]; cur = k;
    } else if (P.owner[c] >= 0) {                         // line ke beech se dobara shuru
      k = P.owner[c]; var i = P.paths[k].indexOf(c);
      if (i < 0) return;
      for (var j = i + 1; j < P.paths[k].length; j++) unmark(P.paths[k][j]);
      P.paths[k].length = i + 1; P.done[k] = false; cur = k;
    }
  }

  function move(e) {
    if (cur < 0 || state !== 'play') return;
    var t = cellAt(e);
    for (var guard = 0; guard < 30; guard++) {            // ungli tez chale to beech ke box bhi chhute nahi
      var path = P.paths[cur], head = path[path.length - 1];
      if (head === t) break;
      var hr = Math.floor(head / P.cols), hc = head % P.cols, tr = Math.floor(t / P.cols), tc = t % P.cols;
      var dr = tr - hr, dc = tc - hc, next;
      if (Math.abs(dc) >= Math.abs(dr)) next = hr * P.cols + hc + (dc > 0 ? 1 : -1);
      else next = (hr + (dr > 0 ? 1 : -1)) * P.cols + hc;
      if (!extend(next)) break;
    }
  }

  function up() {
    if (cur >= 0 && P.paths[cur].length <= 1) P.paths[cur] = [];   // sirf tap kiya to line nahi bachti
    cur = -1; finger = null;
  }

  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  document.addEventListener('touchmove', function (e) { if (e.target === cv) e.preventDefault(); }, { passive: false });

  // ---------- Drawing ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, P ? P.H : 0);
    if (!P) return;
    var cs = P.cell, g = cs * 0.04, i, k;
    for (i = 0; i < P.N; i++) {                           // box
      var x = (i % P.cols) * cs, y = Math.floor(i / P.cols) * cs, o = P.owner[i];
      ctx.fillStyle = '#1f2328'; rr(x + g, y + g, cs - 2 * g, cs - 2 * g, cs * 0.12); ctx.fill();
      if (o >= 0) {
        ctx.globalAlpha = P.done[o] ? 0.38 : 0.26; ctx.fillStyle = CONFIG.COLORS[P.colorOf[o]];
        rr(x + g, y + g, cs - 2 * g, cs - 2 * g, cs * 0.12); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = cs * CONFIG.LINE_WIDTH;
    for (k = 0; k < P.k; k++) {                           // lines
      var pth = P.paths[k]; if (pth.length < 2) continue;
      ctx.strokeStyle = CONFIG.COLORS[P.colorOf[k]]; ctx.beginPath();
      pth.forEach(function (c, n) { var p = centerOf(c); if (n === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }
    for (k = 0; k < P.k; k++) {                           // gole
      ctx.fillStyle = CONFIG.COLORS[P.colorOf[k]];
      P.dots[k].forEach(function (c) { var p = centerOf(c); ctx.beginPath(); ctx.arc(p.x, p.y, cs * CONFIG.DOT_SIZE, 0, TAU); ctx.fill(); });
    }
    if (CONFIG.GLOW && cur >= 0 && finger) {              // ungli ke paas halka gola
      ctx.globalAlpha = 0.28; ctx.fillStyle = CONFIG.COLORS[P.colorOf[cur]];
      ctx.beginPath(); ctx.arc(finger.x, finger.y, cs * 0.95, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center'; ctx.font = '900 26px "Trebuchet MS",sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    for (i = popups.length - 1; i >= 0; i--) {            // +2 / +20 likha hua
      var p = popups[i]; p.life -= 1 / 60; p.y -= 0.6;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Loop ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (state === 'play') {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; endGame(); } else setHud();
    } else if (state === 'win') {
      winT += dt;
      if (winT >= CONFIG.NEXT_LEVEL_DELAY) { levelNo++; state = 'play'; newLevel(); }
    }
    draw(); requestAnimationFrame(loop);
  }
  $('msg').innerHTML = 'Same rang ke gole ungli se jodo.<br>Koi line kisi ko cut nahi karegi, saare box bharo.<br>Pair = ' +
    CONFIG.PAIR_POINTS + ' point &nbsp;|&nbsp; Level poora = ' + CONFIG.LEVEL_POINTS + ' point<br>Time: ' + CONFIG.TIME + ' second';
  $('modeName').textContent = CONFIG.MODE.toUpperCase();
  newLevel();                                              // shuru mein board dikhane ke liye
  requestAnimationFrame(loop);
})();
