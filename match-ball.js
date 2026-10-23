/* match-ball.js - Match Ball (PLAY&WIN)
   Box par tap = ball upar. Dusre box par tap = ball wahan. Ek rang ki saari ball ek box mein = box full. */
(function () {
  'use strict';
  var GAME_ID = 'match-ball';

  // =====================================================================
  //  CONFIG  -  game ka saara control yahan hai. Sirf number badlo.
  // =====================================================================
  var C = {
    // ---- time ----
    TIME_LIMIT: 60,         // poore game ka time (second)
    BG_CHANGE_SEC: 30,      // peeche ka rang kitne second mein badle
    NEXT_DELAY: 0.9,        // level jeetne ke baad agle level se pehle kitni der ruke (second). Ye time count nahi hota
    SKIP_COST_SEC: 0,       // Skip Level dabane par kitne second kate (0 = free skip)

    // ---- box (tube) ----
    CAP: 4,                 // bade box mein kitni ball aati hain
    CAP_MIN: 2,             // chhote box mein kam se kam kitni ball aati hain (2 ya 3 size ke chhote box bante hain)
    SMALL_BOX_CHANCE: 0.3,  // kitne boxes chhote honge (0 = sab bade, 0.3 = lagbhag 30%, 1 = sab chhote)

    // ---- level kaise banega ----
    START_COLORS: 2,        // pehle level mein kitne rang
    COLOR_EVERY: 2,         // itne level baad ek rang badh jaye (chhota number = jaldi hard)
    MAX_COLORS: 9,          // rang zyada se zyada kitne (9 se zyada nahi, itne hi rang bane hain)
    EXTRA_TUBES: 2,         // rang ke alawa kitne extra bade box (kam se kam 2, tabhi level hamesha hal hota hai). Inme se ek hamesha khali rahega. Zyada = aasan

    // ---- points ----
    MOVE_POINTS: 3,         // har ball kisi dusre box mein daalne par
    DONE_POINTS: 5,        // ek rang ka box poora full hone par
    LEVEL_POINTS: 0,        // poora level jeetne par extra (0 = koi nahi)

    SAVE_CAP: 99999         // score ki upar ki limit (save karte waqt)
  };

  // ball ke rang: [halka, asli, gehra]
  var COLORS = [
    ['#ff7b7b', '#e11d1d', '#8f0a0a'],   // laal
    ['#c2f77a', '#58c22a', '#2c7a10'],   // hara
    ['#ffe58a', '#f0b429', '#9a6a08'],   // peela
    ['#f59af9', '#d02ad6', '#7a0f80'],   // gulabi-jamuni
    ['#9bcaff', '#2d7bf0', '#123f9a'],   // neela
    ['#ffc994', '#f97316', '#9a3a05'],   // narangi
    ['#9ff5ff', '#14b8cf', '#0a6a78'],   // firozi
    ['#ffc9e0', '#ff6fa8', '#a82a62'],   // gulabi
    ['#cbb2ff', '#7c3aed', '#3f1a8f']    // baingani
  ];

  // peeche ke rang (30 second mein agla). [neeche-baayein, beech, upar-daayein]
  var BGS = [
    ['#7a0014', '#2a0b3d', '#0a1a7a'],
    ['#b58ac0', '#7c88a8', '#4f7f84'],
    ['#b3202f', '#6b2a5c', '#3a1d6e'],
    ['#3a0d0d', '#8a2d22', '#c0392b'],
    ['#0b3b4a', '#1b2a6b', '#4a1a7a'],
    ['#1a6b3a', '#0e3b4a', '#1a1a5a']
  ];
  var WORDS = ['GREAT', 'NICE', 'PERFECT', 'GREAT', 'NICE'];

  var $ = function (id) { return document.getElementById(id); };
  var Snd = window.MatchSound || { unlock: function () {}, pick: function () {}, back: function () {}, drop: function () {}, done: function () {}, praise: function () {}, win: function () {}, deny: function () {}, skip: function () {}, start: function () {}, end: function () {} };
  var stage = $('stage'), wrap = $('wrap'), popEl = $('pop');

  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rint(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------- game ki haalat ----------
  var state = 'menu';            // menu / play / trans / over
  var paused = false;
  var tubes = [], caps = [], counts = {}, tubeEls = [], doneT = [], colorIds = [], doneColors = 0;
  var bgBase = 0, sel = -1, busy = false, level = 1, score = 0, timeLeft = C.TIME_LIMIT, playTime = 0, bgIdx = 0, bgFront = 'A';
  var G = null, last = 0, doneCombo = 0, moves = 0, levelsDone = 0, doneBoxes = 0;

  // ---------- level banana (har baar naya, kuchh pehle se bana hua nahi) ----------
  function isDone(i) {                       // box tabhi full jab POORA bhara ho aur sab ek rang ki ho
    var t = tubes[i];
    if (!t.length || t.length !== caps[i] || counts[t[0].col] !== caps[i]) return false;   // us rang ki SAARI ball + poora bhara
    for (var j = 1; j < t.length; j++) if (t[j].col !== t[0].col) return false;
    return true;
  }
  function genLevel() {
    var k = Math.min(C.MAX_COLORS, C.START_COLORS + Math.floor((level - 1) / C.COLOR_EVERY), COLORS.length);
    colorIds = shuffle(COLORS.map(function (_, i) { return i; })).slice(0, k);
    var tries = 0, layout, cp;
    do {
      tries++;
      var list = [], boxCaps = [], i; counts = {};
      colorIds.forEach(function (id) {         // har rang ke utni hi ball jitna uska box bada hai
        var n = (C.CAP_MIN < C.CAP && Math.random() < C.SMALL_BOX_CHANCE) ? rint(C.CAP_MIN, C.CAP - 1) : C.CAP;
        boxCaps.push(n); counts[id] = n; for (var q = 0; q < n; q++) list.push(id);
      });
      for (i = 0; i < Math.max(2, C.EXTRA_TUBES); i++) boxCaps.push(C.CAP);      // extra bade box
      shuffle(list);
      var order = shuffle(boxCaps.map(function (_, i) { return i; }));
      cp = order.map(function (o) { return boxCaps[o]; });
      var emptyIdx = rint(0, cp.length - 1);                                      // ek box hamesha khali
      var ne = []; for (i = 0; i < cp.length; i++) if (i !== emptyIdx) ne.push(i);
      var sizes = {}; ne.forEach(function (x) { sizes[x] = 1; });
      var rem = list.length - ne.length;
      while (rem > 0) { var j = ne[rint(0, ne.length - 1)]; if (sizes[j] < cp[j]) { sizes[j]++; rem--; } }
      layout = []; var p = 0;
      for (i = 0; i < cp.length; i++) { var n2 = i === emptyIdx ? 0 : sizes[i]; layout.push(list.slice(p, p + n2)); p += n2; }
      var bad = layout.some(function (t, i) { return t.length === cp[i] && t.every(function (c) { return c === t[0] && counts[c] === cp[i]; }); });
      if (!bad) break;
    } while (tries < 200);
    return { lay: layout, caps: cp };
  }

  // ---------- naksha (layout) ----------
  function colsFor(T) { return T <= 3 ? T : T <= 4 ? 2 : T <= 6 ? 3 : 4; }
  function calc() {
    var T = tubes.length, cols = colsFor(T), rows = Math.ceil(T / cols), capMax = Math.max.apply(null, caps);
    var sw = stage.clientWidth, sh = stage.clientHeight, cellW = sw / cols, cellH = sh / rows;
    var d = Math.min(cellW * 0.5, cellH / (capMax + 2.1), 70);
    var thMax = capMax * d + 0.3 * d, tw = d * 1.22, lift = 1.3 * d, base = 0.5 * d;
    var block = lift + thMax + base, t = [];
    for (var i = 0; i < T; i++) {
      var r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, T - r * cols);
      var cx = sw / 2 + (c - (inRow - 1) / 2) * cellW;
      var top = r * cellH + (cellH - block) / 2, yBot = top + lift + thMax, th = caps[i] * d + 0.3 * d;
      t.push({ cx: cx, yTop: yBot - th, yBot: yBot, th: th });     // sab box neeche se barabar, chhote box kam oonche
    }
    G = { d: d, tw: tw, lift: lift, hit: cellW * 0.92, t: t };
  }
  function slotXY(ti, s) { var t = G.t[ti]; return { x: t.cx, y: t.yBot - 0.12 * G.d - (s + 0.5) * G.d }; }
  function liftXY(ti) { var t = G.t[ti]; return { x: t.cx, y: t.yTop - 0.65 * G.d }; }
  function put(ball, xy) { ball.el.style.left = (xy.x - G.d / 2) + 'px'; ball.el.style.top = (xy.y - G.d / 2) + 'px'; }
  function sizeBall(ball) { ball.el.style.width = G.d + 'px'; ball.el.style.height = G.d + 'px'; }

  function place() {                   // box aur ball sab apni jagah par
    for (var i = 0; i < tubes.length; i++) {
      var t = G.t[i], el = tubeEls[i], d = G.d, tw = G.tw, hit = G.hit;
      el.style.left = (t.cx - hit / 2) + 'px'; el.style.top = (t.yTop - G.lift) + 'px';
      el.style.width = hit + 'px'; el.style.height = (G.lift + t.th + 0.5 * d) + 'px';
      var gl = el.children[1], rim = el.children[2], base = el.children[0];
      gl.style.left = (hit - tw) / 2 + 'px'; gl.style.top = G.lift + 'px'; gl.style.width = tw + 'px'; gl.style.height = t.th + 'px';
      rim.style.left = (hit - tw) / 2 - 1 + 'px'; rim.style.top = G.lift - tw * 0.14 + 'px'; rim.style.width = tw + 2 + 'px'; rim.style.height = tw * 0.28 + 'px';
      base.style.left = (hit - tw * 1.32) / 2 + 'px'; base.style.top = G.lift + t.th - tw * 0.18 + 'px'; base.style.width = tw * 1.32 + 'px'; base.style.height = tw * 0.4 + 'px';
      for (var s = 0; s < tubes[i].length; s++) { var b = tubes[i][s]; sizeBall(b); put(b, (sel === i && s === tubes[i].length - 1) ? liftXY(i) : slotXY(i, s)); }
    }
  }

  // ---------- level lagana ----------
  function newLevel() {
    stage.innerHTML = ''; tubeEls = []; doneT = []; sel = -1; busy = false; doneColors = 0; doneCombo = 0;
    var gl = genLevel(); caps = gl.caps;
    tubes = gl.lay.map(function (cols) { return cols.map(function (c) { return { col: c, el: null }; }); });
    calc();
    tubes.forEach(function (t, i) {
      var el = document.createElement('div'); el.className = 'tube'; el.setAttribute('data-i', i);
      el.innerHTML = '<div class="base"></div><div class="glass"></div><div class="rim"></div>';
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); tubeTap(i); });
      stage.appendChild(el); tubeEls.push(el); doneT.push(false);
      t.forEach(function (b) {
        var c = COLORS[b.col], e = document.createElement('div'); e.className = 'ball born';
        e.style.background = 'radial-gradient(circle at 35% 28%, ' + c[0] + ' 0%, ' + c[1] + ' 48%, ' + c[2] + ' 100%)';
        stage.appendChild(e); b.el = e;
      });
    });
    place();
    $('lvlTxt').textContent = 'Level ' + level;
  }

  // ---------- chhote kaam ----------
  function pop(word, big) {
    popEl.textContent = word + '!!!';
    popEl.style.fontSize = Math.min(big ? 64 : 50, wrap.clientWidth * (big ? 0.12 : 0.13)) + 'px';
    popEl.classList.remove('show'); void popEl.offsetWidth; popEl.classList.add('show');
  }
  function confetti(x, y, n) {
    var cols = ['#ff4d4d', '#ffd24a', '#3ddc5f', '#3d8bff', '#c04dff', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'); s.className = 'conf';
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.background = cols[i % cols.length];
      var a = Math.random() * 6.283, r = 60 + Math.random() * 120;
      s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', (Math.sin(a) * r - 40) + 'px'); s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      wrap.appendChild(s); setTimeout(function (el) { return function () { if (el.parentNode) el.parentNode.removeChild(el); }; }(s), 1200);
    }
  }
  function hud() {
    var t = Math.max(0, Math.ceil(timeLeft));
    var el = $('timeTxt'); el.textContent = '⏱ ' + Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
    el.classList.toggle('red', t <= 10);
    $('scoreTxt').textContent = '⭐ ' + score;
  }
  function setBg(i) {
    var b = BGS[i % BGS.length], next = bgFront === 'A' ? $('bgB') : $('bgA'), cur = bgFront === 'A' ? $('bgA') : $('bgB');
    next.style.background = 'linear-gradient(45deg, ' + b[0] + ', ' + b[1] + ' 50%, ' + b[2] + ')';
    next.style.opacity = 1; cur.style.opacity = 0; bgFront = bgFront === 'A' ? 'B' : 'A';
  }

  // ---------- khelna ----------
  function checkDone(i) {
    if (doneT[i] || !isDone(i)) return;
    doneT[i] = true; doneColors++; doneBoxes++; doneCombo++;
    score += C.DONE_POINTS; hud();
    tubeEls[i].classList.add('done');
    tubes[i].forEach(function (b) { b.el.classList.add('dim'); });
    var w = WORDS[Math.min(WORDS.length - 1, doneCombo - 1)], t = G.t[i];
    if (doneColors < colorIds.length) { pop(w); Snd.done(doneCombo); Snd.praise(w); }
    confetti(stage.offsetLeft + t.cx, stage.offsetTop + (t.yTop + t.yBot) / 2, 22);
  }
  function tubeTap(i) {
    if (state !== 'play' || busy || paused) return;
    Snd.unlock();
    if (doneT[i]) return;
    if (sel < 0) {
      if (!tubes[i].length) return;
      sel = i; put(tubes[i][tubes[i].length - 1], liftXY(i)); Snd.pick(); return;
    }
    if (sel === i) {                                       // wapas wahin rakh do
      put(tubes[i][tubes[i].length - 1], slotXY(i, tubes[i].length - 1)); sel = -1; Snd.back(); return;
    }
    if (tubes[i].length >= caps[i]) {                        // box bhara hua hai
      tubeEls[i].classList.remove('shake'); void tubeEls[i].offsetWidth; tubeEls[i].classList.add('shake'); Snd.deny(); return;
    }
    move(sel, i);
  }
  function move(a, b) {
    busy = true; sel = -1; moves++;
    var ball = tubes[a].pop(); tubes[b].push(ball);
    put(ball, liftXY(b));                                  // pehle dusre box ke upar
    setTimeout(function () {
      put(ball, slotXY(b, tubes[b].length - 1));           // phir andar gir jaye
      setTimeout(function () {
        score += C.MOVE_POINTS; hud(); Snd.drop(); busy = false;
        checkDone(b); checkDone(a);
        if (doneColors >= colorIds.length && state === 'play') levelWon();
      }, 170);
    }, 170);
  }
  function levelWon() {
    state = 'trans'; levelsDone++; score += C.LEVEL_POINTS; hud(); Snd.win();
    pop('PERFECT', true);
    confetti(wrap.clientWidth / 2, wrap.clientHeight * 0.4, 50);
    setTimeout(function () { if (state !== 'trans') return; level++; newLevel(); state = 'play'; }, C.NEXT_DELAY * 1000);
  }
  function skipLevel() {
    if (state !== 'play' || busy || paused) return;
    Snd.unlock(); Snd.skip();
    timeLeft -= C.SKIP_COST_SEC;
    level++; newLevel(); hud();
  }
  function resetLevel() {
    if (state !== 'play' || busy || paused) return;
    Snd.unlock(); Snd.skip(); newLevel();
  }

  // ---------- shuru / khatam ----------
  function start() {
    Snd.unlock(); Snd.start();
    score = 0; level = 1; timeLeft = C.TIME_LIMIT; playTime = 0; moves = 0; levelsDone = 0; doneBoxes = 0; paused = false;
    bgBase = bgIdx = rint(0, BGS.length - 1); setBg(bgIdx);
    $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('help').classList.add('hidden');
    newLevel(); state = 'play'; hud();
  }
  function finish() {
    state = 'over'; sel = -1; Snd.end();
    var fin = Math.min(C.SAVE_CAP, Math.floor(score));
    $('finalScore').textContent = String(score);
    $('finalStats').textContent = 'Level: ' + level + '   |   Box full: ' + doneBoxes;
    var note = $('finalNote'); note.textContent = '';
    try {
      if (window.PWScore && PWScore.save) {
        var r = PWScore.save(GAME_ID, fin);
        var okMsg = function (ok) { note.textContent = ok === false ? '⚠️ Score save nahi hua (screen par laal message dekho)' : '✅ Score save ho gaya'; };
        if (r && r.then) r.then(okMsg).catch(function () { note.textContent = '⚠️ Score save nahi hua'; });
        else okMsg(r);
      }
    } catch (e) {}
    $('over').classList.remove('hidden');
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
    if (state === 'play' && !paused) {
      timeLeft -= dt; playTime += dt;
      var idx = bgBase + Math.floor(playTime / C.BG_CHANGE_SEC);   // har 30 second mein naya rang
      if (idx !== bgIdx) { bgIdx = idx; setBg(bgIdx); }
      hud();
      if (timeLeft <= 0) { timeLeft = 0; hud(); finish(); }
    }
  }

  // ---------- button ----------
  window.addEventListener('resize', function () { if (tubes.length) { calc(); place(); } });
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  $('skipBtn').addEventListener('click', skipLevel);
  $('resetBtn').addEventListener('click', resetLevel);
  $('helpBtn').addEventListener('click', function () { if (state === 'play') { paused = true; $('help').classList.remove('hidden'); } });
  $('helpOk').addEventListener('click', function () { paused = false; $('help').classList.add('hidden'); });
  document.addEventListener('visibilitychange', function () { last = performance.now(); });

  bgBase = bgIdx = rint(0, BGS.length - 1); setBg(bgIdx);
  level = 1; newLevel(); hud();
  //@HOOK
  requestAnimationFrame(loop);
})();
