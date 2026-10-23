/* fruit-merge.js - Fruit Merge game (Matter.js physics) */
(function () {
  'use strict';

  /* =========================================================
     CONFIG - yahan se sab kuchh badal sakte ho
     ========================================================= */
  const CONFIG = {
    GAME_KEY: 'fruit-merge',   // score save karte waqt game ka naam
    GAME_TIME: 240,             // total time (second)
    BG_INTERVAL: 30,           // har itne second mein background badlega
    OVER_TIME: 5,              // container full hone par countdown (second)
    DROP_DELAY: 0.6,          // ek fruit girne ke baad agla girane mein wait (second)
    DROP_LEVELS: 5,            // sirf pehle itne fruit upar se girenge (5 = blueberry..lemon)
    DROP_WEIGHTS: [38, 28, 18, 10, 6], // girne ka chance: chhota zyada, bada kam
    SIZE_SCALE: 1,             // sab fruits ka size ek saath (1.2 = 20% bada, 0.8 = chhota)
    RADII: [14, 18, 23, 28, 34, 41, 49, 58, 68, 80, 94], // har fruit ka alag size
    POINTS: [3, 5, 8, 12, 16, 24, 32, 40, 44, 32, 32],     // merge point (fruit ke level ke hisab se)
    GRAVITY: 1.8,              // girne ki speed
    BOUNCE: 0.25,              // uchhalna
    FRICTION: 0.08,               // fruit-fruit takraane par rokne ki taqat (zyada = kam phisalna)
    FRICTION_STATIC: 0,        // ruke hue fruit ko hilne/phisalne se rokne ki taqat
    WALL_FRICTION: 0.05,          // deewar aur neeche ki zameen ka friction
    ROLL_DAMP: 1,          // ghoomna/lurakna kam (1 = koi roak nahi, 0.95 = bahut zyada roak)
    FACE: true,                // fruit par chehra (false = bina chehra)
    EMOJI_FIT: 1.05,           // (sirf emoji on ho tab) emoji ka size
    // emoji list: '' = gol drawn fruit (sab gol). Emoji gol nahi hote aur unmein patta hota hai, isliye band rakha hai
    EMOJI: ['', '', '', '', '', '', '', '', '', '', ''],
    BROOM_COUNT: 1,            // jhadu kitni baar
    BROOM_LEVELS: 4,           // jhadu pehle itne chhote fruit hatayegi
    UNDO_COUNT: 1              // undo kitni baar
  };

  const W = 400, H = 640, LINE_Y = 80, HAND_Y = 44;
  const THEMES = ['#c3dcc1', '#cfe3f5', '#f7d9c4', '#e3d4f1'];

  const FRUITS = [
    { c: '#3f8fe0', l: '#78b8f5', d: '#1f5aa8', t: 'blue' },
    { c: '#f2453a', l: '#ff7a6b', d: '#b82419', t: 'seeds' },
    { c: '#d3194f', l: '#f0507f', d: '#9a0f38', t: 'bumps' },
    { c: '#ff9b7d', l: '#ffc4ae', d: '#e0553b', t: 'peach' },
    { c: '#ffe135', l: '#fff27a', d: '#e0a800', t: 'lemon' },
    { c: '#a3306e', l: '#d05a97', d: '#6e1a49', t: 'plum' },
    { c: '#ff8a00', l: '#ffb347', d: '#d96500', t: 'dots' },
    { c: '#ee2d24', l: '#ff6a5e', d: '#a8140d', t: 'apple' },
    { c: '#ffd02e', l: '#ffe680', d: '#d9961a', t: 'pine' },
    { c: '#b4d62a', l: '#d6ee6c', d: '#7f9c10', t: 'melon' },
    { c: '#2fa63f', l: '#63d472', d: '#146b24', t: 'stripes' }
  ];
  const LAST = FRUITS.length - 1;

  /* ---------- score save (apne score.js ke hisab se yahin badalna) ---------- */
  function saveScore(s) {
    try {
      if (window.PWScore && typeof window.PWScore.save === 'function') {
        window.PWScore.save(CONFIG.GAME_KEY, s);
      }
    } catch (e) { console.warn('score save error', e); }
  }

  /* ---------- fruit drawing ---------- */
  /* ---------- emoji fruit (circle mein perfect fit) ---------- */
  const emojiCache = {};
  function emojiSprite(lv) {
    const ch = CONFIG.EMOJI[lv];
    if (!ch) return null;
    if (emojiCache[lv] !== undefined) return emojiCache[lv] || null;
    emojiCache[lv] = false;
    try {
      const S = 360, tmp = document.createElement('canvas'); tmp.width = S; tmp.height = S;
      const t = tmp.getContext('2d');
      t.font = '240px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
      t.textAlign = 'center'; t.textBaseline = 'middle';
      t.fillText(ch, S / 2, S / 2);
      const d = t.getImageData(0, 0, S, S).data;
      let x0 = S, y0 = S, x1 = -1, y1 = -1;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          if (d[(y * S + x) * 4 + 3] > 20) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const cv = document.createElement('canvas'); cv.width = bw; cv.height = bh;
      cv.getContext('2d').drawImage(tmp, x0, y0, bw, bh, 0, 0, bw, bh);
      emojiCache[lv] = cv;
      return cv;
    } catch (e) { return null; }
  }
  function drawEmoji(c, img, r) {
    const k = (2 * r * CONFIG.EMOJI_FIT) / Math.max(img.width, img.height);
    const w = img.width * k, h = img.height * k;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(img, -w / 2, -h / 2, w, h);
  }

  const TAU = Math.PI * 2;
  // fixed jagah ke chhote dot (lemon / orange ke chhilke ke liye)
  const SPECKS = (function () {
    let q = 7; const o = [];
    for (let i = 0; i < 34; i++) {
      q = (q * 9301 + 49297) % 233280; const u = q / 233280;
      q = (q * 9301 + 49297) % 233280; const v = q / 233280;
      const rr = Math.sqrt(u) * 0.92, th = v * TAU;
      o.push([Math.cos(th) * rr, Math.sin(th) * rr]);
    }
    return o;
  })();
  function star(c, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, an = rot + i * Math.PI / 5;
      c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
    }
    c.closePath();
  }
  function glow(c, r, x, y, rad, col) {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
  }

  function drawFruit(c, lv, x, y, r, ang, sc) {
    const f = FRUITS[lv], a = ang || 0, t = f.t;
    c.save(); c.translate(x, y); c.rotate(a); if (sc && sc !== 1) c.scale(sc, sc);
    const em = emojiSprite(lv);
    if (em) { drawEmoji(c, em, r); c.restore(); return; }
    const lw = Math.max(1.5, r * 0.07);

    // body (roshni hamesha upar-left se, fruit ghoome tab bhi)
    c.save(); c.rotate(-a);
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
    g.addColorStop(0, f.l); g.addColorStop(0.55, f.c); g.addColorStop(1, f.d);
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.restore();

    // pattern (circle ke andar)
    c.save(); c.beginPath(); c.arc(0, 0, r - 0.5, 0, TAU); c.clip(); c.lineCap = 'round';
    if (t === 'blue') {
      glow(c, r, r * 0.25, r * 0.2, r * 0.9, 'rgba(200,220,255,0.25)');
      c.save(); c.translate(0, -r * 0.52); star(c, r * 0.24, -Math.PI / 2);
      c.fillStyle = 'rgba(15,35,100,0.55)'; c.fill();
      c.lineWidth = Math.max(1, r * 0.03); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.stroke(); c.restore();
    } else if (t === 'seeds') {
      const P = [[-.6, -.4], [0, -.62], [.6, -.4], [-.78, .05], [.78, .05], [-.55, .5], [.55, .5], [0, .8], [-.3, .62], [.3, .62]];
      for (const p of P) {
        c.save(); c.translate(p[0] * r, p[1] * r); c.rotate(Math.atan2(p[1], p[0]) + Math.PI / 2);
        c.beginPath(); c.ellipse(0, 0, Math.max(1, r * 0.05), Math.max(1.4, r * 0.085), 0, 0, TAU);
        c.fillStyle = 'rgba(255,235,140,0.95)'; c.fill();
        c.lineWidth = Math.max(0.8, r * 0.025); c.strokeStyle = 'rgba(120,20,10,0.5)'; c.stroke(); c.restore();
      }
    } else if (t === 'bumps') {
      const rings = [[0, 1], [0.38, 6], [0.72, 11]], dr = r * 0.2;
      for (const rg of rings) {
        for (let i = 0; i < rg[1]; i++) {
          const an = i / rg[1] * TAU + rg[0] * 2, bx = Math.cos(an) * rg[0] * r, by = Math.sin(an) * rg[0] * r;
          c.beginPath(); c.arc(bx, by, dr, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill();
          c.lineWidth = Math.max(1, r * 0.035); c.strokeStyle = 'rgba(110,0,35,0.55)'; c.stroke();
          c.beginPath(); c.arc(bx - dr * 0.3, by - dr * 0.3, dr * 0.28, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fill();
        }
      }
    } else if (t === 'peach') {
      glow(c, r, r * 0.45, -r * 0.1, r, 'rgba(255,225,150,0.6)');
      c.beginPath(); c.moveTo(r * 0.08, -r); c.quadraticCurveTo(r * 0.42, 0, r * 0.08, r);
      c.lineWidth = Math.max(1, r * 0.05); c.strokeStyle = 'rgba(170,50,30,0.35)'; c.stroke();
    } else if (t === 'lemon') {
      glow(c, r, r * 0.3, r * 0.3, r, 'rgba(255,200,0,0.25)');
      c.fillStyle = 'rgba(160,120,0,0.35)';
      for (const p of SPECKS) { c.beginPath(); c.arc(p[0] * r, p[1] * r, Math.max(0.8, r * 0.025), 0, TAU); c.fill(); }
    } else if (t === 'plum') {
      glow(c, r, -r * 0.2, -r * 0.3, r * 0.9, 'rgba(255,255,255,0.22)');
      c.beginPath(); c.moveTo(-r * 0.05, -r); c.quadraticCurveTo(-r * 0.4, 0, -r * 0.05, r);
      c.lineWidth = Math.max(1, r * 0.04); c.strokeStyle = 'rgba(60,10,40,0.35)'; c.stroke();
    } else if (t === 'dots') {
      c.fillStyle = 'rgba(150,60,0,0.32)';
      for (const p of SPECKS) { c.beginPath(); c.arc(p[0] * r, p[1] * r, Math.max(0.8, r * 0.03), 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, -r * 0.82, r * 0.07, 0, TAU); c.fillStyle = 'rgba(120,50,0,0.5)'; c.fill();
    } else if (t === 'apple') {
      c.lineWidth = r * 0.1; c.strokeStyle = 'rgba(255,190,90,0.22)';
      for (const k of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(k * r * 0.6, -r * 0.9); c.quadraticCurveTo(k * r * 1.4, 0, k * r * 0.6, r * 0.9); c.stroke(); }
      c.beginPath(); c.ellipse(0, -r * 0.8, r * 0.16, r * 0.07, 0, 0, TAU); c.fillStyle = 'rgba(80,10,10,0.5)'; c.fill();
    } else if (t === 'pine') {
      c.lineWidth = Math.max(1, r * 0.05); c.strokeStyle = 'rgba(150,80,0,0.5)';
      for (let i = -4; i <= 4; i++) {
        c.beginPath(); c.moveTo(i * r * 0.5 - r, -r); c.lineTo(i * r * 0.5 + r, r); c.stroke();
        c.beginPath(); c.moveTo(i * r * 0.5 + r, -r); c.lineTo(i * r * 0.5 - r, r); c.stroke();
      }
    } else if (t === 'melon') {
      c.lineWidth = Math.max(1, r * 0.04); c.strokeStyle = 'rgba(255,255,255,0.4)';
      for (let k = -2; k <= 2; k++) {
        c.beginPath(); c.moveTo(k * r * 0.4, -r); c.quadraticCurveTo(k * r * 0.95, 0, k * r * 0.4, r); c.stroke();
        c.beginPath(); c.moveTo(-r, k * r * 0.4); c.quadraticCurveTo(0, k * r * 0.95, r, k * r * 0.4); c.stroke();
      }
    } else if (t === 'stripes') {
      c.lineWidth = r * 0.16; c.strokeStyle = 'rgba(10,70,25,0.7)';
      for (const k of [-0.8, -0.4, 0.4, 0.8]) { c.beginPath(); c.moveTo(k * r * 0.5, -r); c.quadraticCurveTo(k * r * 1.5, 0, k * r * 0.5, r); c.stroke(); }
    }
    c.restore();

    // kinaare ka andhera + rim (rim circle ke andar hi, size bilkul physics jitna)
    c.save(); c.rotate(-a);
    const sh = c.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.2)');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = sh; c.fill();
    c.restore();
    c.beginPath(); c.arc(0, 0, r - lw / 2, 0, TAU); c.lineWidth = lw; c.strokeStyle = f.d; c.stroke();

    // chamak (gloss)
    c.save(); c.rotate(-a); c.translate(-r * 0.38, -r * 0.42); c.rotate(-0.7);
    c.beginPath(); c.ellipse(0, 0, r * 0.26, r * 0.12, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    c.beginPath(); c.arc(r * 0.38, 0, Math.max(1, r * 0.05), 0, TAU); c.fill();
    c.restore();

    // chehra
    if (CONFIG.FACE) {
      const er = Math.max(1.6, r * 0.075);
      c.fillStyle = 'rgba(255,110,120,0.30)';
      c.beginPath(); c.arc(-r * 0.5, r * 0.2, r * 0.11, 0, TAU); c.fill();
      c.beginPath(); c.arc(r * 0.5, r * 0.2, r * 0.11, 0, TAU); c.fill();
      c.fillStyle = '#3a1a14';
      c.beginPath(); c.arc(-r * 0.3, -r * 0.02, er, 0, TAU); c.fill();
      c.beginPath(); c.arc(r * 0.3, -r * 0.02, er, 0, TAU); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(-r * 0.3 + er * 0.3, -r * 0.02 - er * 0.3, er * 0.35, 0, TAU); c.fill();
      c.beginPath(); c.arc(r * 0.3 + er * 0.3, -r * 0.02 - er * 0.3, er * 0.35, 0, TAU); c.fill();
      c.beginPath(); c.arc(0, r * 0.12, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
      c.lineWidth = Math.max(1.5, r * 0.07); c.lineCap = 'round'; c.strokeStyle = '#3a1a14'; c.stroke();
    }
    c.restore();
  }

  /* ---------- elements ---------- */
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const nextCv = $('nextCanvas'), nctx = nextCv.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * DPR; canvas.height = H * DPR;
  nextCv.width = 300 * DPR; nextCv.height = 60 * DPR;

  const elScore = $('score'), elTime = $('time'), elBest = $('best');
  const elWarn = $('warn'), elWarnNum = $('warnNum');
  const overlay = $('overlay');

  // niche ki chain
  const chain = $('chain');
  FRUITS.forEach((f, i) => {
    const cv = document.createElement('canvas'); cv.width = 80; cv.height = 80;
    const c = cv.getContext('2d'); drawFruit(c, i, 40, 44, 11 + i * 1.8, 0, 1); chain.appendChild(cv);
  });

  function fit() {
    const wrap = $('boardWrap');
    const aw = wrap.clientWidth - 12 - 20, ah = wrap.clientHeight - 8 - 26;
    const s = Math.max(0.2, Math.min(aw / W, ah / H));
    canvas.style.width = (W * s) + 'px'; canvas.style.height = (H * s) + 'px';
  }
  window.addEventListener('resize', fit);

  /* ---------- state ---------- */
  const M = Matter;
  let engine, fruits = [], mergeQueue = [], queue = [], hand = 0;
  let state = 'ready', score = 0, best = 0, elapsed = 0, timeLeft = CONFIG.GAME_TIME;
  let handX = W / 2, canDrop = true, dropT = 0, broomLeft = 0, undoLeft = 0, snapshot = null;
  let overTimer = CONFIG.OVER_TIME, lastWarnSec = -1, lastTickSec = -1, bgIndex = 0;
  const particles = [], floats = [];
  try { best = parseInt(localStorage.getItem('fruitMergeBest') || '0', 10) || 0; } catch (e) {}
  elBest.textContent = best;

  const radius = lv => CONFIG.RADII[lv] * CONFIG.SIZE_SCALE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function randLevel() {
    const n = CONFIG.DROP_LEVELS, w = CONFIG.DROP_WEIGHTS;
    let total = 0; for (let i = 0; i < n; i++) total += (w[i] || 1);
    let r = Math.random() * total;
    for (let i = 0; i < n; i++) { r -= (w[i] || 1); if (r <= 0) return i; }
    return 0;
  }

  /* ---------- physics ---------- */
  function newEngine() {
    engine = M.Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = CONFIG.GRAVITY;
    const o = { isStatic: true, friction: CONFIG.WALL_FRICTION, restitution: 0 };
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(-30, H / 2, 60, H * 3, o),
      M.Bodies.rectangle(W + 30, H / 2, 60, H * 3, o),
      M.Bodies.rectangle(W / 2, H + 30, W * 3, 60, o)
    ]);
    M.Events.on(engine, 'collisionStart', e => {
      for (const p of e.pairs) {
        const a = p.bodyA, b = p.bodyB;
        if (a.fruit && b.fruit && a.fruit.level === b.fruit.level && !a.fruit.dead && !b.fruit.dead) {
          a.fruit.dead = b.fruit.dead = true; mergeQueue.push([a, b]);
        }
      }
    });
    fruits = []; mergeQueue = [];
  }

  function createFruit(lv, x, y, o) {
    o = o || {};
    const b = M.Bodies.circle(x, y, radius(lv), {
      restitution: CONFIG.BOUNCE, friction: CONFIG.FRICTION, frictionStatic: CONFIG.FRICTION_STATIC, density: 0.0012, slop: 0.02
    });
    b.fruit = { level: lv, born: o.born !== undefined ? o.born : elapsed, pop: !!o.pop, dead: false };
    if (o.angle) M.Body.setAngle(b, o.angle);
    if (o.vx || o.vy) M.Body.setVelocity(b, { x: o.vx || 0, y: o.vy || 0 });
    M.Composite.add(engine.world, b); fruits.push(b); return b;
  }
  function removeFruit(b) {
    M.Composite.remove(engine.world, b);
    const i = fruits.indexOf(b); if (i >= 0) fruits.splice(i, 1);
  }

  function addScore(p) {
    score += p; elScore.textContent = score;
    if (score > best) { best = score; elBest.textContent = best; }
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = 40 + Math.random() * 120;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, t: 0, color: color, size: 3 + Math.random() * 4 });
    }
  }

  function processMerges() {
    while (mergeQueue.length) {
      const pair = mergeQueue.pop(), a = pair[0], b = pair[1];
      if (fruits.indexOf(a) < 0 || fruits.indexOf(b) < 0) continue;
      const L = a.fruit.level;
      const mx = (a.position.x + b.position.x) / 2, my = (a.position.y + b.position.y) / 2;
      removeFruit(a); removeFruit(b);
      const pts = CONFIG.POINTS[L] || 0; addScore(pts);
      floats.push({ x: mx, y: my, text: '+' + pts, t: 0 });
      burst(mx, my, FRUITS[L].c, 10);
      if (L < LAST) createFruit(L + 1, mx, my, { pop: true });
      FruitSound.merge(Math.min(L + 1, LAST));
    }
  }

  /* ---------- hud ---------- */
  function drawNext() {
    nctx.setTransform(DPR, 0, 0, DPR, 0, 0); nctx.clearRect(0, 0, 300, 60);
    // pehla = abhi girne wala (hand), baaki 2 = uske baad. Size asli game ke hisab se.
    const items = [hand].concat(queue.slice(0, 2));
    const labels = ['ABHI', 'AGLA', 'PHIR'];
    nctx.textAlign = 'center'; nctx.font = '900 9px Arial';
    items.forEach((lv, i) => {
      const cx = 50 + i * 100, r = Math.max(9, radius(lv) * 0.6);
      if (i === 0) {
        nctx.beginPath(); nctx.arc(cx, 28, 25, 0, Math.PI * 2);
        nctx.lineWidth = 3; nctx.strokeStyle = '#e0775a'; nctx.stroke();
      }
      drawFruit(nctx, lv, cx, 28, Math.min(r, 21), 0, 1);
      nctx.fillStyle = i === 0 ? '#e0501e' : '#7a6a5a';
      nctx.fillText(labels[i], cx, 58);
    });
  }
  function updateButtons() {
    $('broomCount').textContent = broomLeft; $('undoCount').textContent = undoLeft;
    $('broomBtn').disabled = broomLeft <= 0 || state !== 'playing';
    $('undoBtn').disabled = undoLeft <= 0 || !snapshot || state !== 'playing';
  }
  function setTheme(i) { bgIndex = i; document.documentElement.style.setProperty('--bg1', THEMES[i % THEMES.length]); }

  /* ---------- game flow ---------- */
  function startGame() {
    FruitSound.init(); newEngine();
    score = 0; elapsed = 0; timeLeft = CONFIG.GAME_TIME; elScore.textContent = 0;
    broomLeft = CONFIG.BROOM_COUNT; undoLeft = CONFIG.UNDO_COUNT; snapshot = null;
    queue = [randLevel(), randLevel(), randLevel()]; hand = randLevel();
    canDrop = true; dropT = 0; overTimer = CONFIG.OVER_TIME; lastWarnSec = -1; lastTickSec = -1;
    particles.length = 0; floats.length = 0;
    setTheme(0); elTime.classList.remove('low'); elWarn.classList.add('hidden');
    overlay.classList.add('hidden'); state = 'playing';
    drawNext(); updateButtons(); fit(); FruitSound.start();
  }

  function endGame(reason) {
    if (state !== 'playing') return;
    state = 'over'; elWarn.classList.add('hidden'); updateButtons();
    try { if (score >= best) localStorage.setItem('fruitMergeBest', String(best)); } catch (e) {}
    saveScore(score); FruitSound.over();
    $('ovTitle').textContent = reason === 'time' ? 'Time Up!' : 'Container Full!';
    $('ovText').textContent = reason === 'time' ? 'Time khatam ho gaya.' : 'Fruits upar tak bhar gaye.';
    $('ovScore').textContent = score; $('ovBest').textContent = best;
    $('ovResult').classList.remove('hidden');
    $('playBtn').textContent = '\u21BB PLAY AGAIN';
    overlay.classList.remove('hidden');
  }

  function takeSnapshot() {
    return {
      f: fruits.map(b => ({ l: b.fruit.level, x: b.position.x, y: b.position.y, a: b.angle, vx: b.velocity.x, vy: b.velocity.y })),
      hand: hand, queue: queue.slice(), score: score
    };
  }

function drop(x) {
    if (state !== 'playing' || !canDrop) return;
    const r = radius(hand);
    x = clamp(x, r + 2, W - r - 2);
    snapshot = takeSnapshot();
    createFruit(hand, x, HAND_Y);
    FruitSound.drop();
    hand = queue.shift(); queue.push(randLevel());
    canDrop = false; dropT = elapsed;
    drawNext(); updateButtons();
  }

  function useUndo() {
    if (state !== 'playing' || undoLeft <= 0 || !snapshot) return;
    const s = snapshot; snapshot = null; undoLeft--;
    fruits.slice().forEach(removeFruit); mergeQueue = [];
    s.f.forEach(o => createFruit(o.l, o.x, o.y, { angle: o.a, vx: o.vx, vy: o.vy, born: -10 }));
    hand = s.hand; queue = s.queue; score = s.score; elScore.textContent = score;
    canDrop = true; drawNext(); updateButtons(); FruitSound.undo();
  }

  function useBroom() {
    if (state !== 'playing' || broomLeft <= 0) return;
    const list = fruits.filter(b => b.fruit.level < CONFIG.BROOM_LEVELS);
    if (!list.length) return;
    broomLeft--;
    list.forEach(b => { burst(b.position.x, b.position.y, FRUITS[b.fruit.level].c, 8); removeFruit(b); });
    FruitSound.broom(); updateButtons();
  }

  function overflowing() {
    for (const b of fruits) {
      if (elapsed - b.fruit.born < 1.2) continue;
      if (b.position.y - b.circleRadius < LINE_Y && Math.abs(b.velocity.y) < 1.2) return true;
    }
    return false;
  }

  function applyRollDamp() {
    const d = CONFIG.ROLL_DAMP;
    if (d >= 1) return;
    for (const b of fruits) M.Body.setAngularVelocity(b, b.angularVelocity * d);
  }

  /* ---------- update / render ---------- */
  let acc = 0;
  function update(dt) {
    elapsed += dt; timeLeft = CONFIG.GAME_TIME - elapsed;
    acc += dt; if (acc > 0.1) acc = 0.1;
    while (acc >= 1 / 120) { M.Engine.update(engine, 1000 / 120); applyRollDamp(); acc -= 1 / 120; processMerges(); }

    if (!canDrop && elapsed - dropT >= CONFIG.DROP_DELAY) canDrop = true;

    const bi = Math.floor(elapsed / CONFIG.BG_INTERVAL) % THEMES.length;
    if (bi !== bgIndex) { setTheme(bi); FruitSound.bg(); }

    const sec = Math.max(0, Math.ceil(timeLeft));
    elTime.textContent = sec;
    if (sec <= 5) { elTime.classList.add('low'); if (sec !== lastTickSec && sec > 0) { lastTickSec = sec; FruitSound.tick(); } }

    if (overflowing()) {
      overTimer -= dt;
      const ws = Math.max(0, Math.ceil(overTimer));
      elWarn.classList.remove('hidden'); elWarnNum.textContent = ws;
      if (ws !== lastWarnSec) { lastWarnSec = ws; if (ws > 0) FruitSound.warn(); }
      if (overTimer <= 0) { endGame('full'); return; }
    } else { overTimer = CONFIG.OVER_TIME; lastWarnSec = -1; elWarn.classList.add('hidden'); }

    if (timeLeft <= 0) { elTime.textContent = 0; endGame('time'); }
  }

  const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function render(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.setLineDash([30, 18]); ctx.lineWidth = 7; ctx.strokeStyle = '#e0775a'; ctx.beginPath();
    ctx.moveTo(4, LINE_Y); ctx.lineTo(W - 4, LINE_Y); ctx.stroke(); ctx.setLineDash([]);

    if (state === 'playing' && canDrop) {
      const r = radius(hand), hx = clamp(handX, r + 2, W - r - 2);
      ctx.fillStyle = FRUITS[hand].c; ctx.globalAlpha = 0.55;
      for (let y = HAND_Y + r + 10; y < H - 6; y += 28) { ctx.beginPath(); ctx.arc(hx, y, 4.5, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; drawFruit(ctx, hand, hx, HAND_Y, r, 0, 1);
    }
    for (const b of fruits) {
      let s = 1;
      if (b.fruit.pop) { const t = (elapsed - b.fruit.born) / 0.28; if (t < 1) s = 0.55 + 0.45 * easeBack(Math.max(0, t)); }
      drawFruit(ctx, b.fruit.level, b.position.x, b.position.y, b.circleRadius, b.angle, s);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.t += dt; if (p.t >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
      ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.font = '900 28px Arial'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt; if (f.t > 0.9) { floats.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - f.t / 0.9; ctx.fillStyle = '#e0501e';
      ctx.strokeText(f.text, f.x, f.y - f.t * 50); ctx.fillText(f.text, f.x, f.y - f.t * 50);
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (state === 'playing') update(dt);
    render(dt); requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  const app = $('app');
  function px(e) { const rc = canvas.getBoundingClientRect(); return (e.clientX - rc.left) / rc.width * W; }
  app.addEventListener('pointermove', e => { handX = px(e); });
  app.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a, .overlay')) return;
    handX = px(e); drop(handX);
  });
  $('playBtn').addEventListener('click', startGame);
  $('broomBtn').addEventListener('click', useBroom);
  $('undoBtn').addEventListener('click', useUndo);
  $('soundBtn').addEventListener('click', function () {
    FruitSound.init(); const m = !FruitSound.isMuted(); FruitSound.setMuted(m);
    this.textContent = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  });

  newEngine(); fit(); updateButtons(); requestAnimationFrame(loop);
})();
