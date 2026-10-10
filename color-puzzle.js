// color-puzzle.js - Color Puzzle (rang chhantne wala khel)
// Ek dabba dabao (upar uthega), phir doosra dabao: rang us dabbe me chala jayega.
// Rang tabhi jaata hai jab doosre dabbe ka sabse upar wala rang same ho (ya wo dabba khaali ho).
(function () {
  'use strict';

  // ================= SETTINGS (sirf yahin badalna) =================
  var CONFIG = {
    TIME: 120,             // pura game kitne second ka (120 = 2 minute)
    POUR_POINTS: 5,        // ek baar rang daalne ke point
    FULL_POINTS: 20,       // ek dabba poora (4 rang, sab same) bharne ke extra point
    SCORE_CAP: 1000,       // ek game ka sabse zyada score jo save hoga (Firebase rule ke andar)

    TUBE_SIZE: 4,          // ek dabbe me kitne rang aate hain
    EMPTY_TUBES: 2,        // hamesha kitne dabbe khaali rahenge (2 = aasan, 1 = bahut mushkil)
    START_COLORS: 2,       // pehle level me kitne rang (2 rang + 2 khaali = 4 dabbe)
    LEVELS_PER_STEP: 1,    // itne level baad ek rang aur badhta hai (2 kar do to dheere-dheere mushkil)
    MAX_COLORS: 9,         // sabse zyada kitne rang (isse zyada nahi badhega)

    BG_CHANGE: 30,         // peeche ka nazara har itne second me badle
    WIN_DELAY: 1.8,        // level poora hone ke baad naya level kitni der me aaye (second)
    POUR_TIME: 0.9         // ek baar rang daalne me kitna samay lage (chhota = tez)
  };

  // Rang (inhe mat badalna, ye hamesha wahi rahenge)
  var COLORS = ['#e0453a', '#ff9a2e', '#ffe14a', '#b8e834', '#3ddc5a', '#1fd1b2', '#3aa0ff', '#5b5bff', '#b05bff', '#ff5fb2'];

  // ================= Elements =================
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var menu = document.getElementById('menu');
  var over = document.getElementById('over');
  var startBtn = document.getElementById('startBtn');
  var againBtn = document.getElementById('againBtn');
  var finalScoreEl = document.getElementById('finalScore');
  var finalNoteEl = document.getElementById('finalNote');

  function sfx(name, a, b) {
    try { if (window.ColorSound) window.ColorSound[name](a, b); } catch (e) {}
  }

  // ================= Screen size =================
  var W = 360, H = 640, scale = 1, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var iw = window.innerWidth, ih = window.innerHeight;
    var s = iw / 360;
    var h = ih / s;
    if (h < 560) { s = ih / 560; h = 560; }
    if (h > 900) { s = ih / 900; h = 900; }
    scale = s;
    W = Math.round(iw / s);
    H = h;
    canvas.width = Math.round(iw * dpr);
    canvas.height = Math.round(ih * dpr);
    layout();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  // ================= State =================
  var CAP = CONFIG.TUBE_SIZE;
  var state = 'menu';        // menu | play | win | over
  var timeLeft = CONFIG.TIME, score = 0, dispScore = 0, clock = 0;
  var levelNo = 1;
  var tubes = [];            // tubes[i] = [rang, rang, ...] (neeche se upar)
  var geo = [];              // har dabbe ki jagah
  var UH = 36, TW = 44, TH = 160;
  var selected = -1;
  var anim = null;
  var winT = 0, stuckT = 0;
  var parts = [], pops = [];
  var fullAt = [];           // kis dabbe ka "poora" celebration kab hua
  var bgIdx = 0, bgPrev = 0, bgFade = 1;
  var skipBtn = { x: 0, y: 0, w: 170, h: 46 };

  // ================= Level banana =================
  function colorsForLevel(n) {
    return Math.min(CONFIG.MAX_COLORS, CONFIG.START_COLORS + Math.floor((n - 1) / CONFIG.LEVELS_PER_STEP));
  }

  function isUniform(t) {
    for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false;
    return true;
  }
  function isFull(t) { return t.length === CAP && isUniform(t); }

  function topGroup(t) {
    var c = t[t.length - 1], n = 0;
    for (var i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
    return n;
  }

  // a se b me daal sakte hain? kitne rang jayenge? (0 = nahi ja sakta)
  function pourCount(a, b) {
    if (a === b || !a.length || b.length >= CAP) return 0;
    if (isFull(a)) return 0;
    if (b.length && b[b.length - 1] !== a[a.length - 1]) return 0;
    return Math.min(topGroup(a), CAP - b.length);
  }

  // kaam ki chaal (ek hi rang wale dabbe ko khaali dabbe me ulatna bekaar hai)
  function usefulMove(ts, i, j) {
    var k = pourCount(ts[i], ts[j]);
    if (!k) return false;
    if (!ts[j].length && isUniform(ts[i])) return false;
    return true;
  }

  function hasMoves(ts) {
    for (var i = 0; i < ts.length; i++)
      for (var j = 0; j < ts.length; j++) if (i !== j && usefulMove(ts, i, j)) return true;
    return false;
  }

  function solvedAll(ts) {
    for (var i = 0; i < ts.length; i++) if (ts[i].length && !isFull(ts[i])) return false;
    return true;
  }

  // solver: kya ye level hal ho sakta hai? (chhota DFS)
  function solvable(start) {
    var seen = {}, nodes = 0;
    function key(ts) { return ts.map(function (t) { return t.join(''); }).sort().join('|'); }
    function dfs(ts, depth) {
      if (solvedAll(ts)) return true;
      if (++nodes > 30000 || depth > 80) return false;
      var k = key(ts);
      if (seen[k]) return false;
      seen[k] = 1;
      var moves = [];
      for (var i = 0; i < ts.length; i++)
        for (var j = 0; j < ts.length; j++) {
          if (i === j || !usefulMove(ts, i, j)) continue;
          var sc = 0;
          if (ts[j].length) sc += 2;                       // pehle milte-julte rang jodo
          if (ts[i].length === pourCount(ts[i], ts[j])) sc += 1;   // poora dabba khaali ho jaye
          moves.push([sc + Math.random() * 0.5, i, j]);
        }
      moves.sort(function (a, b) { return b[0] - a[0]; });
      for (var m = 0; m < moves.length; m++) {
        var a = moves[m][1], b = moves[m][2], n = pourCount(ts[a], ts[b]);
        var nt = ts.map(function (t) { return t.slice(); });
        for (var q = 0; q < n; q++) nt[b].push(nt[a].pop());
        if (dfs(nt, depth + 1)) return true;
        if (nodes > 30000) return false;
      }
      return false;
    }
    return dfs(start.map(function (t) { return t.slice(); }), 0);
  }

  function makeLevel(n) {
    var nc = colorsForLevel(n), tries = 0, ts;
    do {
      var units = [], i;
      for (i = 0; i < nc; i++) for (var k = 0; k < CAP; k++) units.push(i);
      for (i = units.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = units[i]; units[i] = units[j]; units[j] = t;
      }
      ts = [];
      for (i = 0; i < nc; i++) ts.push(units.slice(i * CAP, (i + 1) * CAP));
      for (i = 0; i < CONFIG.EMPTY_TUBES; i++) ts.push([]);
      tries++;
      var bad = ts.some(function (t) { return t.length && isFull(t); });
      if (!bad && solvable(ts)) break;
    } while (tries < 40);
    // dabbon ki jagah thodi mix karo (khaali dabbe beech me na aa jaayein sirf end me)
    return ts;
  }

  // ================= Dabbon ki jagah =================
  function layout() {
    var n = tubes.length || 5;
    var rowsN = n <= 5 ? 1 : 2;
    var per = rowsN === 1 ? n : Math.ceil(n / 2);
    var areaTop = 118, areaBot = H - 88, avail = areaBot - areaTop;
    UH = clamp(Math.floor(((avail - 34 - (rowsN - 1) * 40) / rowsN - 22) / CAP), 22, 42);
    TW = Math.max(30, Math.min(48, Math.floor((W - 28) / per) - 16));
    TH = CAP * UH + 12;
    var slot = (W - 20) / Math.max(per, 5 > per ? per : per);
    slot = Math.min(slot, TW + 26);
    geo = [];
    var idx = 0;
    // pehli row me per, doosri me bacha hua
    for (var r = 0; r < rowsN; r++) {
      var cnt = r === 0 ? per : n - per;
      var totalW = cnt * slot;
      var x0 = (W - totalW) / 2;
      var contentH = rowsN * (TH) + (rowsN - 1) * 44;
      var top = areaTop + Math.max(26, (avail - contentH) / 2);
      for (var k = 0; k < cnt; k++) {
        geo.push({ x: x0 + slot * (k + 0.5), y: top + TH + r * (TH + 44) });
        idx++;
      }
    }
    skipBtn.x = W / 2 - skipBtn.w / 2;
    skipBtn.y = H - 66;
  }

  // ================= Level shuru =================
  function startLevel() {
    tubes = makeLevel(levelNo);
    CAP = CONFIG.TUBE_SIZE;
    selected = -1; anim = null; winT = 0; stuckT = 0;
    fullAt = tubes.map(function () { return -99; });
    layout();
    state = 'play';
    if (!hasMoves(tubes)) startLevel();
  }

  function newGame() {
    score = 0; dispScore = 0; levelNo = 1;
    timeLeft = CONFIG.TIME;
    parts = []; pops = [];
    bgIdx = 0; bgPrev = 0; bgFade = 1;
    startLevel();
    menu.classList.add('hidden');
    over.classList.add('hidden');
  }

  function finish() {
    state = 'over';
    selected = -1; anim = null;
    sfx('end');
    var finalScore = Math.min(Math.max(0, score), CONFIG.SCORE_CAP);
    finalScoreEl.textContent = finalScore;
    finalNoteEl.textContent = finalScore > 0 ? 'Score save ho raha hai...' : 'Is baar koi point nahi mila';
    over.classList.remove('hidden');
    if (finalScore > 0 && window.PWScore) {
      PWScore.save('color-puzzle', finalScore).then(function (r) {
        finalNoteEl.textContent = r ? '✅ Score save ho gaya' : '❌ Score save nahi hua, login check karo';
      });
    }
  }

  startBtn.addEventListener('click', newGame);
  againBtn.addEventListener('click', newGame);

  // ================= Chaal =================
  function popText(text, x, y, color, size) {
    pops.push({ t: text, x: x, y: y, c: color, s: size || 26, life: 1.1, max: 1.1 });
  }

  function confetti(x, y, n, spread) {
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x, y: y, vx: rand(-spread, spread), vy: rand(-spread * 1.3, -spread * 0.2),
        c: COLORS[Math.floor(Math.random() * COLORS.length)], s: rand(4, 8),
        rot: rand(0, 6), w: rand(-10, 10), life: rand(0.9, 1.7), g: 700
      });
    }
  }

  function startPour(from, to) {
    var k = pourCount(tubes[from], tubes[to]);
    anim = { from: from, to: to, k: k, color: tubes[from][tubes[from].length - 1], t: 0, dur: CONFIG.POUR_TIME,
             toLen: tubes[to].length, fromLen: tubes[from].length };
    selected = -1;
    sfx('pour', CONFIG.POUR_TIME * 0.5, CONFIG.POUR_TIME * 0.22);
    sfx('glug', CONFIG.POUR_TIME * 0.85);
  }

  function commitPour() {
    var a = anim; anim = null;
    for (var i = 0; i < a.k; i++) tubes[a.to].push(tubes[a.from].pop());
    score += CONFIG.POUR_POINTS;
    var g = geo[a.to];
    popText('+' + CONFIG.POUR_POINTS, g.x, g.y - TH - 10, '#ffffff', 22);

    if (isFull(tubes[a.to])) {
      score += CONFIG.FULL_POINTS;
      fullAt[a.to] = clock;
      confetti(g.x, g.y - TH / 2, 22, 170);
      popText('+' + CONFIG.FULL_POINTS, g.x, g.y - TH - 34, '#ffe14d', 30);
      sfx('full');
    }

    if (solvedAll(tubes)) {
      state = 'win';
      winT = CONFIG.WIN_DELAY;
      sfx('win');
      for (var b = 0; b < 4; b++) confetti(rand(40, W - 40), rand(120, 260), 24, 240);
      popText('LEVEL ' + levelNo + ' COMPLETE!', W / 2, H * 0.33, '#ffe14d', 30);
    } else if (!hasMoves(tubes)) {
      stuckT = 1.6;
      popText('Koi chaal nahi!', W / 2, H * 0.33, '#ff9a8a', 28);
      sfx('bad');
    }
  }

  function nextLevel(skipped) {
    levelNo++;
    startLevel();
    if (skipped) sfx('skip');
  }

  // ================= Touch =================
  function logical(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }

  function hitTube(p) {
    for (var i = 0; i < geo.length; i++) {
      var g = geo[i];
      if (Math.abs(p.x - g.x) <= TW / 2 + 9 && p.y >= g.y - TH - 30 && p.y <= g.y + 10) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (state !== 'play') return;
    var p = logical(e);

    // skip button
    if (p.x >= skipBtn.x && p.x <= skipBtn.x + skipBtn.w && p.y >= skipBtn.y && p.y <= skipBtn.y + skipBtn.h) {
      if (anim) return;
      nextLevel(true);
      return;
    }

    if (anim || stuckT > 0) return;
    var i = hitTube(p);
    if (i < 0) { if (selected >= 0) { selected = -1; sfx('tap'); } return; }
    sfx('tap');

    if (selected < 0) {
      if (tubes[i].length && !isFull(tubes[i])) { selected = i; sfx('lift'); }
      else sfx('bad');
      return;
    }
    if (selected === i) { selected = -1; return; }
    if (pourCount(tubes[selected], tubes[i])) { startPour(selected, i); return; }

    // chaal nahi chali: doosra dabba chun lo ya chhod do
    if (tubes[i].length && !isFull(tubes[i])) { selected = i; sfx('lift'); }
    else { selected = -1; sfx('bad'); }
  });

  // ================= Update =================
  function update(dt) {
    clock += dt;
    var i;

    if (state === 'play' || state === 'win') {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finish(); return; }

      // peeche ka nazara har BG_CHANGE second me badle
      var idx = Math.floor((CONFIG.TIME - timeLeft) / CONFIG.BG_CHANGE) % THEMES.length;
      if (idx !== bgIdx) { bgPrev = bgIdx; bgIdx = idx; bgFade = 0; }
    }
    bgFade = Math.min(1, bgFade + dt / 1.4);

    if (anim) {
      anim.t += dt / anim.dur;
      if (anim.t >= 1) commitPour();
    }
    if (state === 'win') {
      winT -= dt;
      if (winT <= 0) nextLevel(false);
    }
    if (state === 'play' && stuckT > 0) {
      stuckT -= dt;
      if (stuckT <= 0) nextLevel(true);       // fas gaye to khud naya level
    }

    dispScore += (score - dispScore) * Math.min(1, dt * 10);
    if (Math.abs(score - dispScore) < 0.5) dispScore = score;

    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.w * dt; p.life -= dt;
      if (p.life <= 0 || p.y > H + 20) parts.splice(i, 1);
    }
    for (i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= dt; pops[i].y -= 34 * dt;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
  }

  // ================= Peeche ka nazara (har 30 second me naya) =================
  var THEMES = [
    { top: '#9af2cf', mid: '#3aa88a', hill1: '#2f8f78', hill2: '#1b5a50', ground: '#15272b', orb: '#f4fff9', deco: 'trees' },
    { top: '#ffb27a', mid: '#e0527a', hill1: '#9a3a7a', hill2: '#5a2468', ground: '#24132f', orb: '#fff1c4', deco: 'sun' },
    { top: '#7fdcff', mid: '#2a7fd0', hill1: '#2b62b8', hill2: '#173f84', ground: '#0e1e3d', orb: '#ffffff', deco: 'bubbles' },
    { top: '#5a3fc0', mid: '#2a1c78', hill1: '#2b2a8a', hill2: '#181a5a', ground: '#0c0a2a', orb: '#fff6c8', deco: 'stars' },
    { top: '#ff9ae0', mid: '#b05bff', hill1: '#8a46d8', hill2: '#5a2fa0', ground: '#1f1038', orb: '#ffffff', deco: 'candy' },
    { top: '#ffe08a', mid: '#f08a3a', hill1: '#c8602a', hill2: '#8a3a22', ground: '#2a160f', orb: '#fff7d6', deco: 'sun' }
  ];

  function hills(base, amp, period, par, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 10; x += 10) {
      var y = base + Math.sin((x + par) / period) * amp + Math.sin((x + par) / (period * 0.37) + 1.3) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawTheme(th, alpha) {
    ctx.globalAlpha = alpha;
    var g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, th.top);
    g.addColorStop(1, th.mid);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // suraj / chaand
    ctx.fillStyle = th.orb;
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath(); ctx.arc(W * 0.78, 120 + Math.sin(clock * 0.4) * 4, 28, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = alpha * 0.25;
    ctx.beginPath(); ctx.arc(W * 0.78, 120 + Math.sin(clock * 0.4) * 4, 46, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = alpha;

    var i;
    if (th.deco === 'stars') {
      ctx.fillStyle = '#fff';
      for (i = 0; i < 26; i++) {
        ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(clock * 1.2 + i)));
        ctx.fillRect((i * 97) % W, (i * 53) % 230 + 8, 2, 2);
      }
      ctx.globalAlpha = alpha;
    } else if (th.deco === 'bubbles' || th.deco === 'candy') {
      for (i = 0; i < 10; i++) {
        ctx.globalAlpha = alpha * 0.22;
        ctx.fillStyle = th.deco === 'candy' ? COLORS[(i * 3) % COLORS.length] : '#ffffff';
        var by = (260 - ((clock * (14 + i * 3) + i * 70) % 300));
        ctx.beginPath(); ctx.arc((i * 61 + 20) % W, by, 6 + (i % 4) * 4, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }

    hills(215, 18, 70, clock * 6, th.hill1);
    hills(250, 14, 55, -clock * 9 + 80, th.hill2);

    if (th.deco === 'trees') {
      ctx.fillStyle = th.hill2;
      for (i = 0; i < 12; i++) {
        var tx = (i * 37 + 10) % W, ty = 242 + Math.sin(i) * 6, h = 26 + (i % 3) * 8;
        ctx.beginPath(); ctx.moveTo(tx, ty - h); ctx.lineTo(tx - 9, ty); ctx.lineTo(tx + 9, ty); ctx.closePath(); ctx.fill();
      }
    }

    ctx.fillStyle = th.ground;
    ctx.fillRect(0, 262, W, H - 262);
    ctx.globalAlpha = 1;
  }

  // ================= Dabba banana =================
  function tubePath(w, h) {
    var r = w / 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h);
    ctx.lineTo(-w / 2, -r);
    ctx.arc(0, -r, r, Math.PI, 0, true);
    ctx.lineTo(w / 2, -h);
  }

  // layers: [{c: rang number, h: unit me oonchai}]  (neeche se upar)
  function drawTube(x, y, angle, layers, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // sheeshe ka halka andar ka rang
    tubePath(TW, TH);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();

    ctx.save();
    tubePath(TW, TH);
    ctx.clip();
    var yy = 0;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], hh = L.h * UH;
      if (hh <= 0.2) continue;
      var col = COLORS[L.c];
      var lg = ctx.createLinearGradient(-TW / 2, 0, TW / 2, 0);
      lg.addColorStop(0, shade(col, 1.2));
      lg.addColorStop(0.5, col);
      lg.addColorStop(1, shade(col, 0.78));
      ctx.fillStyle = lg;
      ctx.fillRect(-TW / 2 - 1, -yy - hh - 0.5, TW + 2, hh + 1);
      yy += hh;
    }
    // sheeshe ki chamak
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-TW / 2 + 5, -TH + 8, 4, TH - TW);
    ctx.restore();

    tubePath(TW, TH);
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = glow ? '#fff3a8' : 'rgba(225,230,235,0.92)';
    if (glow) { ctx.shadowColor = '#ffe14d'; ctx.shadowBlur = 14; }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return 'rgb(' + clamp(r, 0, 255) + ',' + clamp(g, 0, 255) + ',' + clamp(b, 0, 255) + ')';
  }

  function layersOf(t, cut, add) {
    var L = t.map(function (c) { return { c: c, h: 1 }; });
    if (cut > 0) {                              // upar se cut unit kam karo
      var rem = cut;
      for (var i = L.length - 1; i >= 0 && rem > 0; i--) {
        var take = Math.min(1, rem);
        L[i].h -= take; rem -= take;
      }
    }
    if (add && add.h > 0) L.push(add);
    return L;
  }

  function outlinedText(text, x, y, size, fill, align) {
    ctx.font = '900 ' + size + 'px Arial, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size / 6);
    ctx.strokeStyle = 'rgba(10,20,30,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || '#fff';
    ctx.fillText(text, x, y);
  }

  // ================= Draw =================
  function draw() {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var i;

    if (bgFade < 1) { drawTheme(THEMES[bgPrev], 1); drawTheme(THEMES[bgIdx], ease(bgFade)); }
    else drawTheme(THEMES[bgIdx], 1);

    // dabbe
    var a = anim;
    for (i = 0; i < tubes.length; i++) {
      if (a && (i === a.from)) continue;
      var g = geo[i], lift = (i === selected) ? -Math.min(22, UH * 0.6) : 0;
      var layers = layersOf(tubes[i], 0, null);
      if (a && i === a.to) {
        var q = pourAmount(a);
        layers = layersOf(tubes[i], 0, { c: a.color, h: a.k * q });
      }
      var done = isFull(tubes[i]);
      var gl = done && (clock - fullAt[i] < 99);
      drawTube(g.x, g.y + lift, 0, layers, done);
      if (done) {
        // poore bhare dabbe par chhota sa sitara
        ctx.save();
        ctx.translate(g.x, g.y - TH - 12);
        var pulse = 1 + Math.sin(clock * 4 + i) * 0.08;
        ctx.scale(pulse, pulse);
        outlinedText('★', 0, 0, 20, '#ffe14d');
        ctx.restore();
      }
    }

    // jis dabbe se rang gir raha hai
    if (a) {
      var gs = geo[a.from], gt = geo[a.to];
      var p = a.t, m, ang, pr = pourAmount(a);
      var sign = gt.x >= gs.x ? 1 : -1;
      var maxAng = sign * 1.12;
      if (p < 0.28) { m = ease(p / 0.28); }
      else if (p < 0.78) { m = 1; }
      else { m = 1 - ease((p - 0.78) / 0.22); }
      ang = maxAng * m + (p >= 0.28 && p < 0.78 ? sign * 0.22 * ((p - 0.28) / 0.5) * m : 0);

      // dabbe ka kinara target ke upar aaye
      var lipLX = sign * TW / 2, lipLY = -TH;
      var tx = gt.x, ty = gt.y - Math.max(0, tubes[a.to].length + a.k * pr) * UH - TH * 0.0 - 16;
      var topY = gt.y - TH - 10;
      ty = Math.min(ty, topY + 24);
      function lipAt(an) { return { x: lipLX * Math.cos(an) - lipLY * Math.sin(an), y: lipLX * Math.sin(an) + lipLY * Math.cos(an) }; }
      var lipF = lipAt(maxAng + sign * 0.22);
      var ox = tx - lipF.x + sign * 4, oy = topY - lipF.y;
      var cx = gs.x + (ox - gs.x) * m, cy = gs.y + (oy - gs.y) * m;
      var lipNow = lipAt(ang);

      var cut = a.k * pr;
      drawTube(cx, cy, ang, layersOf(tubes[a.from], cut, null), false);

      // paani ki dhaar
      if (p > 0.22 && p < 0.8) {
        var sx = cx + lipNow.x, sy = cy + lipNow.y;
        var surf = gt.y - (tubes[a.to].length + a.k * pr) * UH;
        var col = COLORS[a.color];
        var fade = p < 0.3 ? (p - 0.22) / 0.08 : (p > 0.74 ? (0.8 - p) / 0.06 : 1);
        ctx.globalAlpha = clamp(fade, 0, 1);
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(4, TW * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (gt.x - sx) * 0.06, surf);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // kan (confetti)
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i];
      ctx.save();
      ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
      ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
      ctx.fillStyle = pt.c;
      ctx.fillRect(-pt.s / 2, -pt.s / 2, pt.s, pt.s * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // points likha hua
    for (i = 0; i < pops.length; i++) {
      var q2 = pops[i], age = q2.max - q2.life;
      var sc = age < 0.15 ? 0.5 + age / 0.15 * 0.7 : (age < 0.3 ? 1.2 - (age - 0.15) / 0.15 * 0.2 : 1);
      ctx.globalAlpha = clamp(q2.life * 2, 0, 1);
      ctx.save();
      ctx.translate(clamp(q2.x, 70, W - 70), q2.y); ctx.scale(sc, sc);
      outlinedText(q2.t, 0, 0, q2.s, q2.c);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // upar ki patti
    var t = Math.ceil(timeLeft), mm = Math.floor(t / 60), ss = t % 60;
    outlinedText('⏱ ' + mm + ':' + (ss < 10 ? '0' : '') + ss, 14, 26, 22, timeLeft <= 10 ? '#ff8a8a' : '#ffffff', 'left');
    outlinedText('LEVEL ' + levelNo, W / 2, 26, 24, '#ffffff');
    outlinedText('TOTAL SCORE', W / 2, 58, 13, '#e8f6ff');
    outlinedText(String(Math.round(dispScore)), W / 2, 84, 34, '#ffe14d');

    // skip button
    if (state === 'play' || state === 'win') {
      var b = skipBtn;
      var bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      bg.addColorStop(0, '#9b6bff'); bg.addColorStop(1, '#6a3fd8');
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(b.x, b.y + 4, b.w, b.h, 22); ctx.fill();
      ctx.fillStyle = bg;
      rr(b.x, b.y, b.w, b.h, 22); ctx.fill();
      outlinedText('🔄  Skip Level', b.x + b.w / 2, b.y + b.h / 2 + 1, 20, '#ffffff');
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // rang daalne ka kitna hissa ho chuka (0 se 1)
  function pourAmount(a) {
    if (a.t < 0.28) return 0;
    if (a.t > 0.78) return 1;
    return ease((a.t - 0.28) / 0.5);
  }

  // ================= Loop =================
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (state !== 'menu' && state !== 'over') update(dt);
    else { clock += dt; bgFade = Math.min(1, bgFade + dt / 1.4); }
    draw();
    requestAnimationFrame(frame);
  }

  // menu ke peeche bhi dabbe dikhen
  window.addEventListener('resize', resize);
  tubes = [[0, 1, 0, 1], [1, 0, 1, 0], [], []];
  fullAt = tubes.map(function () { return -99; });
  resize();

  //@HOOK
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
