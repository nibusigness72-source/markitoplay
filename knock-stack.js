/* knock-stack.js - Knock Stack (PLAY&WIN)
   Ungli screen par = ball niche aakar ring todta hai. Ungli hatao = ball ruk kar uchhalta hai.
   Kaala hissa nahi tootta (aag wali ball ko chhodkar). */
(function () {
  'use strict';
  var GAME_ID = 'knock-stack';

  // =====================================================================
  //  CONFIG  -  game ka saara control yahan hai. Sirf number badlo.
  // =====================================================================
  var C = {
    // ---- time ----
    TIME_LIMIT: 180,         // poore game ka time (second). Level clear hone ke beech ka waqt count nahi hota
    CLEAR_PAUSE: 1.0,       // level jeetne ke baad agle level se pehle kitni der ruke (second)

    // ---- ghoomna ----
    ROT_SPEED: 0.85,        // tower kitna tez ghoome (chakkar/second jaisa). Chhota = dheere. 0.3 bahut dheere, 1.0 tez
    ROT_GROW: 0.06,         // har level mein ghoomna kitna badhe (yahi game ko hard banata hai)
    ROT_MAX: 1.6,           // ghoomne ki sabse zyada speed
    ALT_DIR: true,          // true = ek level seedha, agla ulta ghoome

    // ---- ring ka design ----
    SEGS: 10,               // ring kitne tukdon ki hai. 10 matlab ek tukda = 10% hissa
    BLACK_SEGS: 1,          // shuru ke levels mein kitne tukde kaale (1 = 10%)
    BLACK_GROW_EVERY: 5,    // itne level baad ek aur kaala tukda badh jaye (chhota number = jaldi hard)
    BLACK_MAX: 3,           // kaale tukde zyada se zyada kitne
    SECOND_COLOR: 0,        // 0 = har ring mein sirf ek rang + kaala. Teesra rang chahiye to 0.3 kar do (dusra halka rang aayega)

    // ---- level ----
    RINGS_BASE: 40,         // pehle level mein kitni ring
    RINGS_PER_LEVEL: 2,     // har level mein kitni ring badhe
    RINGS_MAX: 50,          // ring ki sabse zyada sankhya
    LEVEL_BONUS: 5,         // level jeetne par extra points (0 = koi nahi, sirf ring ke points)

    // ---- ball ----
    GRAVITY: 520,           // ball kitni tez neeche aaye (uchhalte waqt)
    BOUNCE_V: 118,          // uchhalne ki taakat. Bada = zyada oonchi uchhal
    SMASH_SPEED: 105,       // ungli rakhne par ball ki neeche aane ki max speed
    SMASH_ACCEL: 2400,      // ungli rakhte hi ball kitni jaldi tez ho

    // ---- aag wali ball ----
    FIRE_RINGS: 5,          // lagatar kitni ring todne par ball aag wali ban jaye
    FIRE_LAST: 4,           // aag wali ball kitni ring tak chalegi (kaala bhi todegi), phir normal
    
    // ---- smooth chalne ke liye ----
    MAX_DPR: 1,          // screen ki sharpness. Chhota = zyada smooth (1 sabse smooth, 2 sabse sharp par lag kar sakta hai)
    PRELOAD: 26,            // level shuru hote hi kitni ring pehle banein (baaki ball ke saath aage aage banti jayengi)
    LOOKAHEAD: 32,          // ball ke neeche kitni ring hamesha taiyaar rakhni hain
    GEN_PER_FRAME: 2,       // ek frame mein zyada se zyada kitni nayi ring banein

    SAVE_CAP: 800         // score ki upar ki limit (save karte waqt)
  };

  // level ke rang: [mukhya rang, dusra halka rang]
  var PAL = [
    ['#c98bff', '#f3e1ff'], ['#ffd84a', '#fff7c9'], ['#f29a62', '#ffe3d0'], ['#2fd6b4', '#d2fff4'],
    ['#5b8cff', '#dbe6ff'], ['#ff6fa8', '#ffdcec'], ['#7ed957', '#e6ffd6'], ['#ff6a5c', '#ffe2de'],
    ['#4fc3f7', '#dcf4ff'], ['#b5c93a', '#f2f7c4']
  ];

  // ---- naap (sab "u" mein, u = screen ki chaudai ka 1%) ----
  var R_OUT = 34, R_IN = 11, R_POLE = 9.5, K = 0.36, PITCH = 8, THICK = 4.4, BALL_R = 3.4, BALL_POS = 22;
  var TAU = Math.PI * 2, FRONT = Math.PI / 2;

  var $ = function (id) { return document.getElementById(id); };
  var Snd = window.KnockSound || { unlock: function () {}, bounce: function () {}, smash: function () {}, fire: function () {}, hit: function () {}, clear: function () {}, start: function () {}, end: function () {} };
  var cv = $('game'), cx = cv.getContext('2d', { alpha: false });
  var W = 0, H = 0, u = 1, CX = 0, DPR = 1;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function shade(c, f, a) { return 'rgba(' + clamp(Math.round(c[0] * f), 0, 255) + ',' + clamp(Math.round(c[1] * f), 0, 255) + ',' + clamp(Math.round(c[2] * f), 0, 255) + ',' + (a == null ? 1 : a) + ')'; }
  var BLACK = [36, 36, 42];

  // ---- rang ki strings pehle se bana kar rakhte hain (har frame banane se game atakta hai) ----
  function mkTone(c, black) {
    var o = [], k;
    for (k = 0; k <= 6; k++) o.push(shade(c, 0.5 + 0.3 * k / 6));
    return { inner: shade(c, 0.45), top: shade(c, 1), edge: black ? 'rgba(255,255,255,.18)' : shade(c, 1.12, 0.8), outer: o };
  }
  var toneA = null, toneB = null, toneK = mkTone(BLACK, true);
  var bgG = null, poleG = null, poleTop = '', meterG = null, ballG = null, fireG = null;
  function tone(t) { return t === 2 ? toneK : t === 1 ? toneB : toneA; }

  function resize() {
    DPR = Math.min(C.MAX_DPR, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    u = Math.min(W / 100, H / 150); CX = W / 2;
    bgG = poleG = meterG = ballG = fireG = null;   // gradient dobara banenge
  }

  // ---------- game ki haalat ----------
  var state = 'menu', stateT = 0;
  var rings = [], N = 0, cur = 0, rot = 0, dir = 1, rotSpeed = 0, sa = TAU / 10;
  var by = -18, vy = 0, camY = 0, held = false;
  var timeLeft = 60, endTitle = '', fireLeft = 0, score = 0, level = 1, broken = 0, totalBroken = 0, combo = 0, meter = 0, fire = false, bestCombo = 0;
  var pieces = [], parts = [], floats = [], squash = 0, flash = 0, scorePop = 0, pal = PAL[0], colA = rgb(PAL[0][0]), colB = rgb(PAL[0][1]);
  var overShown = false, last = 0, blk = 1;

  // ek ring banao (ball ke aage aage ek ek karke bante jaate hain, saari ring ek saath nahi)
  function makeRing() {
    var segs = [], j, start = rint(0, C.SEGS - 1);
    for (j = 0; j < C.SEGS; j++) segs.push(Math.random() < C.SECOND_COLOR ? 1 : 0);
    for (j = 0; j < blk; j++) segs[(start + j) % C.SEGS] = 2;
    rings.push({ segs: segs, off: Math.random() * TAU, splats: [] });
  }
  function genTo(k) { var lim = Math.min(N - 1, k); while (rings.length <= lim) makeRing(); }

  function buildLevel() {
    pal = PAL[(level - 1) % PAL.length]; colA = rgb(pal[0]); colB = rgb(pal[1]);
    toneA = mkTone(colA); toneB = mkTone(colB); poleG = null;
    N = Math.min(C.RINGS_MAX, C.RINGS_BASE + (level - 1) * C.RINGS_PER_LEVEL);
    sa = TAU / C.SEGS;
    blk = Math.min(C.BLACK_MAX, C.BLACK_SEGS + Math.floor((level - 1) / C.BLACK_GROW_EVERY));
    rings = [];
    genTo(C.PRELOAD - 1);                    // shuru mein sirf aadhi ring, baaki aage banengi
    dir = (C.ALT_DIR && level % 2 === 0) ? -1 : 1;
    rotSpeed = Math.min(C.ROT_MAX, C.ROT_SPEED + (level - 1) * C.ROT_GROW);
    rot = 0; cur = 0; by = -18; vy = 0; camY = by; broken = 0; combo = 0; meter = 0; fire = false;
    pieces = []; parts = []; floats = [];
  }
  function resetGame() { timeLeft = C.TIME_LIMIT; endTitle = '💥 Game Over!'; score = 0; level = 1; totalBroken = 0; bestCombo = 0; overShown = false; buildLevel(); }

  function segAt(i) {
    var a = (((FRONT - rot - rings[i].off) % TAU) + TAU) % TAU;
    return Math.floor(a / sa) % C.SEGS;
  }
  function ballWY() { return by + BALL_POS * K - BALL_R; }   // ball ka centre (world y)
  function sy(wy) { return (wy - camY) * u + H * 0.40; }      // world y -> screen y

  // ---------- particles ----------
  function spawn(n, col, sp, up, size, life) {
    for (var i = 0; i < n; i++) parts.push({ x: rnd(-1.5, 1.5), wy: ballWY(), vx: rnd(-sp, sp), vy: rnd(-up, up * 0.3), g: 150, life: life, max: life, s: size * rnd(0.6, 1.2), col: col });
  }
  function addFloat(txt, col) { floats.push({ x: rnd(-6, 6), wy: ballWY() - 6, t: 0, txt: txt, col: col }); }

  function smashRing(i) {
    var r = rings[i], pts = 1, j;
    combo++; bestCombo = Math.max(bestCombo, combo); score += pts; scorePop = 1; broken++; totalBroken++;
    for (j = 0; j < C.SEGS; j++) {
      var a0 = rot + r.off + j * sa, mid = a0 + sa / 2;
      pieces.push({ a0: a0, type: r.segs[j], wy: i * PITCH, dist: 0, dy: 0, vr: rnd(14, 34), vyy: -rnd(8, 34), spin: rnd(-2.5, 2.5), t: 0, mid: mid });
    }
    spawn(5, pal[0], 22, 40, 1.4, 0.6);
    if (fire) { fireLeft--; if (fireLeft <= 0) { fire = false; meter = 0; } }
    else {
      meter = Math.min(1, meter + 1 / C.FIRE_RINGS);
      if (meter >= 1) { fire = true; fireLeft = C.FIRE_LAST; Snd.fire(); addFloat('🔥', '#ff9a2e'); }
    }
    Snd.smash(combo);
    cur++;
  }
  function bounce(top) {
    by = top; vy = -C.BOUNCE_V; combo = 0; meter = 0; fire = false; squash = 1;
    var r = rings[cur];
    if (r) {
      var la = (((FRONT - rot - r.off) % TAU) + TAU) % TAU;
      r.splats.push({ a: la + rnd(-0.12, 0.12), r: BALL_POS + rnd(-2, 2), s: rnd(2.2, 4) });
      if (r.splats.length > 4) r.splats.shift();
    }
    spawn(6, '#2aa0ff', 16, 36, 1.0, 0.45);
    Snd.bounce();
  }
  function levelClear() {
    state = 'clear'; stateT = 0; score += C.LEVEL_BONUS; scorePop = 1; Snd.clear();
    for (var i = 0; i < 44; i++) parts.push({ x: rnd(-20, 20), wy: ballWY() - 4, vx: rnd(-40, 40), vy: -rnd(40, 110), g: 160, life: 1.6, max: 1.6, s: rnd(1, 2), col: i % 2 ? pal[0] : '#ffd24a' });
  }
  function die() {
    state = 'dead'; stateT = 0; Snd.hit();
    for (var i = 0; i < 30; i++) parts.push({ x: rnd(-2, 2), wy: ballWY(), vx: rnd(-55, 55), vy: -rnd(10, 80), g: 200, life: 1.0, max: 1.0, s: rnd(1, 2.2), col: i % 3 ? '#1b8cff' : '#222' });
  }

  // ---------- update ----------
  function physics(dt) {
    var hold = held && state === 'play';
    if (hold) { vy += C.SMASH_ACCEL * dt * (vy < 0 ? 2 : 1); if (vy > C.SMASH_SPEED) vy = C.SMASH_SPEED; }
    else vy += C.GRAVITY * dt;
    if (!hold && fire) { fire = false; meter = 0; }
    var prev = by; by += vy * dt;
    var guard = 0;
    while (cur <= N && prev <= cur * PITCH && by > cur * PITCH && guard++ < 6) {
      var top = cur * PITCH;
      if (cur === N) {                       // aakhri platform
        by = top; vy = -C.BOUNCE_V * 0.8; squash = 1; Snd.bounce();
        if (state === 'play') levelClear();
        break;
      }
      genTo(cur);
      var seg = rings[cur].segs[segAt(cur)];
      if (hold) {
        if (seg === 2 && !fire) { by = top; die(); return; }
        smashRing(cur);                       // cur badh jata hai, ball neeche chalta rahe
      } else { bounce(top); break; }
    }
  }
  function update(dt) {
    stateT += dt;
    rot += dir * rotSpeed * dt;
    if (rings.length < N && rings.length < cur + C.LOOKAHEAD) for (var g = 0; g < C.GEN_PER_FRAME && rings.length < N; g++) makeRing();
    if (state === 'play' || state === 'menu' || state === 'clear') physics(dt);
        if (state === 'play' || state === 'dead') { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; endTitle = '⏱️ Time Up!'; state = 'over'; stateT = 1; } }
    if (state === 'clear' && stateT > C.CLEAR_PAUSE) { level++; buildLevel(); state = 'play'; stateT = 0; flash = 1; }
    if (state === 'dead' && stateT > 3) { buildLevel(); state = 'play'; stateT = 0; held = false; ptrs = {}; }
if (state === 'over' && stateT > 0.9 && !overShown) { overShown = true; finish(); }
    squash = Math.max(0, squash - dt * 6); flash = Math.max(0, flash - dt * 2.2); scorePop = Math.max(0, scorePop - dt * 4);
    camY += (by - camY) * Math.min(1, dt * 9);
    var i, p;
    if (fire && state === 'play') for (i = 0; i < 2; i++) parts.push({ x: rnd(-2.5, 2.5), wy: ballWY() - rnd(0, 3), vx: rnd(-6, 6), vy: -rnd(10, 40), g: -20, life: 0.5, max: 0.5, s: rnd(2, 3.6), col: Math.random() < 0.5 ? '#ff5a1f' : '#ffb02e' });
    for (i = parts.length - 1; i >= 0; i--) { p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.wy += p.vy * dt; }
    for (i = pieces.length - 1; i >= 0; i--) { p = pieces[i]; p.t += dt; if (p.t > 0.5) { pieces.splice(i, 1); continue; } p.dist += p.vr * dt; p.dy += p.vyy * dt; p.vyy += 170 * dt; }
    for (i = floats.length - 1; i >= 0; i--) { p = floats[i]; p.t += dt; if (p.t > 0.55) floats.splice(i, 1); }
  }
// ---------- drawing ----------
  function island(x, y, s, kind) {
    cx.save(); cx.translate(x, y); cx.scale(s, s);
    cx.fillStyle = 'rgba(120,170,205,.30)'; cx.beginPath(); cx.ellipse(0, 0, 60, 20, 0, 0, TAU); cx.fill();
    cx.fillStyle = 'rgba(95,190,140,.38)'; cx.beginPath(); cx.ellipse(0, -8, 54, 14, 0, 0, TAU); cx.fill();
    if (kind === 0) { cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillRect(-6, -52, 12, 40); cx.fillStyle = 'rgba(90,120,200,.5)'; cx.fillRect(-8, -60, 16, 9); }
    else { cx.fillStyle = 'rgba(80,170,120,.45)'; cx.beginPath(); cx.arc(-10, -26, 20, 0, TAU); cx.arc(12, -34, 16, 0, TAU); cx.fill(); cx.fillStyle = 'rgba(110,150,200,.4)'; cx.fillRect(-3, -22, 6, 16); }
    cx.restore();
  }
  function drawBack() {
    if (!bgG) { bgG = cx.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#a9e3ff'); bgG.addColorStop(1, '#eaf9ff'); }
    cx.fillStyle = bgG; cx.fillRect(0, 0, W, H);
    var span = H * 1.5, k, off = camY * u * 0.12;
    for (k = 0; k < 4; k++) {
      var yy = ((k * span / 3 + off) % span + span) % span - H * 0.2;
      var side = k % 2 ? 0.86 : 0.14;
      island(W * side, yy, W / 260, k % 2);
      cx.fillStyle = 'rgba(255,255,255,.55)';
      cx.beginPath(); cx.ellipse(W * (k % 2 ? 0.2 : 0.8), yy + H * 0.18, W * 0.16, W * 0.045, 0, 0, TAU); cx.fill();
    }
    cx.fillStyle = 'rgba(255,255,255,.17)'; cx.fillRect(CX - 12 * u, 0, 24 * u, H);   // ball ki patti
  }
  function topPath(ty, a0, a1, ro, ri, ox, oy) {      // sirf rasta banata hai
    var n = 5, i, a, x, y;
    for (i = 0; i <= n; i++) { a = a0 + (a1 - a0) * i / n; x = CX + ox + Math.cos(a) * ro * u; y = ty + oy + Math.sin(a) * ro * u * K; if (i) cx.lineTo(x, y); else cx.moveTo(x, y); }
    for (i = n; i >= 0; i--) { a = a0 + (a1 - a0) * i / n; cx.lineTo(CX + ox + Math.cos(a) * ri * u, ty + oy + Math.sin(a) * ri * u * K); }
    cx.closePath();
  }
  function polyTop(ty, a0, a1, ro, ri, ox, oy) { cx.beginPath(); topPath(ty, a0, a1, ro, ri, ox, oy); }
  function wallPath(ty, a0, a1, rad, th, ox, oy) {     // sirf rasta banata hai
    var n = 5, i, a;
    for (i = 0; i <= n; i++) { a = a0 + (a1 - a0) * i / n; var x = CX + ox + Math.cos(a) * rad * u, y = ty + oy + Math.sin(a) * rad * u * K; if (i) cx.lineTo(x, y); else cx.moveTo(x, y); }
    for (i = n; i >= 0; i--) { a = a0 + (a1 - a0) * i / n; cx.lineTo(CX + ox + Math.cos(a) * rad * u, ty + oy + th + Math.sin(a) * rad * u * K); }
    cx.closePath();
  }
  function drawSeg(ty, a0, type, ox, oy) {            // toota hua tukda (sirf upar ka hissa)
    cx.fillStyle = tone(type).top; polyTop(ty, a0, a0 + sa, R_OUT, R_IN, ox, oy); cx.fill();
  }
  function drawRing(i) {
    var r = rings[i], segs = r.segs, ty = sy(i * PITCH), th = THICK * u, base = rot + r.off, j, t, a, s0, s1, any, tn;
    // andar ki deewar (ek rang ke tukde ek saath)
    for (t = 0; t < 3; t++) {
      any = false; cx.beginPath();
      for (j = 0; j < C.SEGS; j++) if (segs[j] === t) {
        a = base + j * sa;
        if (Math.min(Math.sin(a), Math.sin(a + sa)) < 0.6) { wallPath(ty, a, a + sa, R_IN, th, 0, 0); any = true; }
      }
      if (any) { cx.fillStyle = tone(t).inner; cx.fill(); }
    }
    // bahar ki deewar (jo peeche chhup jaati hai use draw nahi karte)
    for (j = 0; j < C.SEGS; j++) {
      a = base + j * sa; s0 = Math.sin(a); s1 = Math.sin(a + sa);
      if (Math.max(s0, s1) < -0.6) continue;
      cx.fillStyle = tone(segs[j]).outer[Math.round(Math.max(0, Math.sin(a + sa / 2)) * 6)];
      cx.beginPath(); wallPath(ty, a, a + sa, R_OUT, th, 0, 0); cx.fill();
    }
    // upar ka hissa (ek rang ke tukde ek saath)
    cx.lineWidth = 1.2;
    for (t = 0; t < 3; t++) {
      any = false; cx.beginPath();
      for (j = 0; j < C.SEGS; j++) if (segs[j] === t) { topPath(ty, base + j * sa, base + (j + 1) * sa, R_OUT, R_IN, 0, 0); any = true; }
      if (any) { tn = tone(t); cx.fillStyle = tn.top; cx.fill(); cx.strokeStyle = tn.edge; cx.stroke(); }
    }
    for (j = 0; j < r.splats.length; j++) {            // ball ke rang ke dhabbe
      var sp = r.splats[j], ang = base + sp.a;
      cx.fillStyle = 'rgba(30,140,255,.8)'; cx.beginPath();
      cx.ellipse(CX + Math.cos(ang) * sp.r * u, ty + Math.sin(ang) * sp.r * u * K, sp.s * u, sp.s * u * K, 0, 0, TAU); cx.fill();
    }
  }
  function drawPlatform(ty) {

    var th = 3 * u, ro = R_OUT + 7, i, b, s, n = 5;
    cx.fillStyle = '#e8c548'; cx.beginPath();
    for (i = 0; i <= 24; i++) { var a = Math.PI * i / 24; var x = CX + Math.cos(a) * ro * u, y = ty + Math.sin(a) * ro * u * K; if (i) cx.lineTo(x, y); else cx.moveTo(x, y); }
    for (i = 24; i >= 0; i--) { var a2 = Math.PI * i / 24; cx.lineTo(CX + Math.cos(a2) * ro * u, ty + th + Math.sin(a2) * ro * u * K); }
    cx.closePath(); cx.fill();
    var bandW = ro / 4, sectors = 16;
    for (b = 0; b < 4; b++) for (s = 0; s < sectors; s++) {
      cx.fillStyle = (b + s) % 2 ? '#fafafa' : '#222';
      polyTop(ty, rot * 0.2 + s * TAU / sectors, rot * 0.2 + (s + 1) * TAU / sectors, bandW * (b + 1), bandW * b, 0, 0); cx.fill();
    }
    cx.strokeStyle = '#f3d767'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(CX, ty, ro * u, ro * u * K, 0, 0, TAU); cx.stroke();
  }
  function drawPole() {
    var yTop = sy(cur * PITCH), yEnd = sy(N * PITCH), w = R_POLE * u;
    if (yEnd < 0) return;
    var yBot = Math.min(yEnd, H + 4);
    if (!poleG) {
      poleG = cx.createLinearGradient(CX - w, 0, CX + w, 0);
      poleG.addColorStop(0, shade(colA, 0.5)); poleG.addColorStop(0.5, shade(colA, 0.8)); poleG.addColorStop(1, shade(colA, 0.5));
      poleTop = shade(colA, 0.9);
    }
    cx.fillStyle = poleG; cx.fillRect(CX - w, yTop, w * 2, Math.max(0, yBot - yTop));
    cx.fillStyle = poleTop; cx.beginPath(); cx.ellipse(CX, yTop, w, w * K, 0, 0, TAU); cx.fill();
  }
  function drawPieces() {
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i], a0 = p.a0 + p.spin * p.t, mid = a0 + sa / 2;
      var ox = Math.cos(mid) * p.dist * u, oy = Math.sin(mid) * p.dist * u * K + p.dy * u;
      cx.globalAlpha = p.t < 0.2 ? 1 : Math.max(0, 1 - (p.t - 0.2) / 0.3);
      drawSeg(sy(p.wy), a0, p.type, ox, oy);
    }
    cx.globalAlpha = 1;
  }
  function drawBall() {
    var bx = CX, byy = sy(ballWY()), r = BALL_R * u;
    var sx = 1 + 0.28 * squash, syy = 1 - 0.28 * squash + (vy > 50 ? 0.12 : 0);
    cx.save(); cx.translate(bx, byy); cx.scale(sx, syy);
    if (!ballG) {
      ballG = cx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      ballG.addColorStop(0, '#8fd8ff'); ballG.addColorStop(0.5, '#1b9bff'); ballG.addColorStop(1, '#0a5fd0');
      fireG = cx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      fireG.addColorStop(0, '#fff3a8'); fireG.addColorStop(0.5, '#ff9a2e'); fireG.addColorStop(1, '#e0300f');
    }
    if (fire) { cx.fillStyle = 'rgba(255,140,40,.35)'; cx.beginPath(); cx.arc(0, 0, r * 1.5, 0, TAU); cx.fill(); }   // halka glow (bhaari shadow nahi)
    cx.fillStyle = fire ? fireG : ballG; cx.beginPath(); cx.arc(0, 0, r, 0, TAU); cx.fill();
    cx.restore();
  }
  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; cx.globalAlpha = Math.max(0, p.life / p.max); cx.fillStyle = p.col;
      cx.beginPath(); cx.arc(CX + p.x * u, sy(p.wy), p.s * u * 0.6, 0, TAU); cx.fill();
    }
    cx.globalAlpha = 1;
  }
  function txt(t, x, y, size, fill, stroke) {
    cx.font = '900 ' + size + 'px "Arial Black", Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.lineJoin = 'round'; cx.lineWidth = size * 0.14; cx.strokeStyle = stroke || 'rgba(20,40,80,.35)'; cx.strokeText(t, x, y);
    cx.fillStyle = fill || '#fff'; cx.fillText(t, x, y);
  }
  function drawHUD() {
    // upar ki patti: level aur kitni ring tooti
    var by0 = Math.max(60, H * 0.065), bw = W * 0.56, bx = CX - bw / 2, bh = 14;
    cx.fillStyle = 'rgba(40,60,100,.30)'; cx.beginPath(); cx.roundRect(bx, by0 - bh / 2, bw, bh, bh / 2); cx.fill();
    var pr = state === 'clear' ? 1 : (N ? broken / N : 0);
    cx.fillStyle = '#18d36a'; cx.beginPath(); cx.roundRect(bx, by0 - bh / 2, Math.max(bh, bw * pr), bh, bh / 2); cx.fill();
    [[bx - 4, level, '#18d36a'], [bx + bw + 4, level + 1, 'rgba(110,130,160,.85)']].forEach(function (c) {
      cx.fillStyle = c[2]; cx.beginPath(); cx.arc(c[0], by0, 17, 0, TAU); cx.fill();
      cx.font = '900 16px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#fff'; cx.fillText(String(c[1]), c[0], by0 + 1);
    });
    // timer
    var tl = Math.ceil(timeLeft), tcol = tl <= 10 ? '#ff4d3d' : '#fff';
    txt('⏱ ' + Math.floor(tl / 60) + ':' + ('0' + (tl % 60)).slice(-2), W - 52, 28, u * 4.6, tcol);
    // score
    txt(String(Math.floor(score)), CX, Math.max(120, H * 0.14), u * (11 + 2.5 * scorePop));
    // rainbow meter
    var mx = 4 * u, mw = 5.5 * u, mh = H * 0.30, my = H * 0.46;
    if (!meterG) {
      meterG = cx.createLinearGradient(0, my, 0, my + mh);
      meterG.addColorStop(0, '#ff3b30'); meterG.addColorStop(0.2, '#ffd60a'); meterG.addColorStop(0.4, '#34ff7a'); meterG.addColorStop(0.55, '#19e6ff'); meterG.addColorStop(0.75, '#2a3bff'); meterG.addColorStop(1, '#ff1fb4');
    }
    cx.fillStyle = meterG; cx.beginPath(); cx.roundRect(mx, my, mw, mh, mw / 2); cx.fill();
    cx.save(); cx.beginPath(); cx.roundRect(mx, my, mw, mh, mw / 2); cx.clip();
    cx.fillStyle = 'rgba(205,210,215,.92)'; cx.fillRect(mx, my, mw, mh * (1 - meter)); cx.restore();
    cx.strokeStyle = fire ? '#fff' : 'rgba(255,255,255,.7)'; cx.lineWidth = fire ? 3 : 1.5; cx.beginPath(); cx.roundRect(mx, my, mw, mh, mw / 2); cx.stroke();
     // floats (+points)
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i]; cx.globalAlpha = 1 - f.t / 0.55;
      txt(f.txt, CX + f.x * u, sy(f.wy) - f.t * 40, u * 5, f.col);
    }
    cx.globalAlpha = 1;
        if (state === 'clear') txt('LEVEL ' + level + ' CLEAR!', CX, H * 0.27, u * 8, '#ffe14a');
    if (state === 'dead') txt('OUT! ' + Math.ceil(3 - stateT), CX, H * 0.27, u * 8, '#ff4d3d');
    if (state === 'play' && level === 1 && totalBroken < 2) txt('Ungli rakho = tod do', CX, H * 0.9, u * 5, '#fff');
  }
  function render() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBack();
    drawPole();
    var maxI = Math.min(N, Math.floor((camY + H * 0.6 / u + R_OUT * K + 4) / PITCH) + 1), i;
    genTo(maxI);
    for (i = maxI; i >= cur; i--) {
      if (i === N) drawPlatform(sy(N * PITCH)); else if (rings[i]) drawRing(i);
    }
    drawPieces();
    if ((state !== 'over' && state !== 'dead') || stateT < 0.02) {
      if (cur <= N && by < cur * PITCH) {   // ball ki parchhai
        var h = clamp((cur * PITCH - by) / 40, 0, 1);
        cx.fillStyle = 'rgba(0,0,0,' + (0.28 * (1 - h)) + ')'; cx.beginPath();
        cx.ellipse(CX, sy(cur * PITCH) + BALL_POS * K * u, BALL_R * u * (1.1 - 0.4 * h), BALL_R * u * K * (1.1 - 0.4 * h), 0, 0, TAU); cx.fill();
      }
      drawBall();
    }
    drawParts();
    drawHUD();
    if (flash > 0) { cx.fillStyle = 'rgba(255,255,255,' + flash + ')'; cx.fillRect(0, 0, W, H); }
  }

  // ---------- input ----------
  var ptrs = {};
  function holdOn(e) { if (e.cancelable) e.preventDefault(); Snd.unlock(); ptrs[e.pointerId] = 1; held = true; }
  function holdOff(e) { delete ptrs[e.pointerId]; held = Object.keys(ptrs).length > 0; }
  cv.addEventListener('pointerdown', holdOn);
  window.addEventListener('pointerup', holdOff);
  window.addEventListener('pointercancel', holdOff);
  window.addEventListener('blur', function () { ptrs = {}; held = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { ptrs = {}; held = false; } });
  window.addEventListener('keydown', function (e) { if (e.code === 'Space' || e.code === 'ArrowDown') { held = true; Snd.unlock(); e.preventDefault(); } });
  window.addEventListener('keyup', function (e) { if (e.code === 'Space' || e.code === 'ArrowDown') held = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- shuru / khatam ----------
  function start() {
    Snd.unlock(); Snd.start(); resetGame(); state = 'play'; stateT = 0; held = false; ptrs = {};
    $('menu').classList.add('hidden'); $('over').classList.add('hidden');
  }
  function finish() {
    state = 'over'; held = false; Snd.end();
    var fin = Math.min(C.SAVE_CAP, Math.floor(score));
    $('overTitle').textContent = endTitle;
    $('finalScore').textContent = String(Math.floor(score));
    $('finalStats').textContent = 'Level: ' + level + '   |   Ring tooti: ' + totalBroken;
    var note = $('finalNote'); note.textContent = '';
    try {
      if (window.PWScore && PWScore.save) {
        var r = PWScore.save(GAME_ID, fin);
        if (r && r.then) r.then(function () { note.textContent = '✅ Score save ho gaya'; }).catch(function () { note.textContent = '⚠️ Score save nahi hua'; });
        else note.textContent = '✅ Score save ho gaya';
      }
    } catch (e) {}
    $('over').classList.remove('hidden');
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    update(dt); render();
  }

  window.addEventListener('resize', resize);
  resize(); resetGame();
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  //@HOOK
  requestAnimationFrame(loop);
})();
