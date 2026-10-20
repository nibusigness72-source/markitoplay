// snake-game.js - Snake Game (Worms Zone jaisa) | 5 minute | fruit = 1 point, coin = 5 point

// ================= SETTINGS: yahan ke number badal kar game kam/zyada kar sakte ho =================
var CONFIG = {
  GAME_TIME: 120,         // game ka time (second): 300 = 5 minute  (abhi test ke liye 30 hai)
  MAP_SIZE: 3000,        // map ki lambai-chaudai (bada number = badi map)

  // ---- sab kuch bada dikhana ----
  SIZE_UP: 1.3,          // saamp, fruit, coin sab itna guna bada dikhega (1 = pehle jaisa, 2 = double). Physics wahi rahegi
  FRUIT_SIZE: 1.6,       // fruit/coin/potion ko upar se aur itna guna bada (1 = normal, 2 = double)

  // ---- robot saamp (phone hang na ho isliye sirf paas ke chalte hain) ----
  ROBOT_COUNT: 7,        // tumhare aas-paas ek samay mein kitne robot saamp (zyada = bheed, par phone dheema)
  ACTIVE_RADIUS: 900,    // is doori ke andar hi robot chalte hain. Isse door jaate hi robot hat jaate hain, aage naye bante jaate hain
  ROBOT_SMART: 0.8,      // 0 se 1: zyada = robot kam marte hain, kam = jaldi out

  BASE_SPEED: 200,       // SABHI saamp ki ek jaisi speed (badhao/ghatao)
  BOOST_MULT: 2,       // speed dabane par kitni guna tez
  BOOST_COST: 5,         // speed par ek baar mein kitne point katenge
  BOOST_COST_EVERY: 1.5, // kitne second mein ek baar point katenge

  // ---- khana ----
  FRUIT_COUNT: 450,      // map par fruit kitne rahenge
  FRUIT_POINTS: 1,       // ek fruit ke point
  CLUSTER_CHANCE: 0.12,  // kitni baar fruit 4-5 ke gucche mein girenge (0 = kabhi nahi, 0.3 = bahut zyada gucche)
  CLUSTER_MIN: 4,        // gucche mein kam se kam fruit
  CLUSTER_MAX: 5,        // gucche mein zyada se zyada fruit
  CLUSTER_SPREAD: 38,    // gucche ke fruit kitne paas-paas (bada = phaile hue)
  COIN_COUNT: 25,        // map par coin kitne (zyada rakhoge to bahut coin aayenge)
  COIN_POINTS: 5,        // ek coin ke point
  COIN_SIZE: 1.6,
  POTION_COUNT: 8,       // map par gadget (potion) kitne
  DROP_FRUITS: 20,       // saamp marne par kitne fruit girenge
  DROP_POINTS: 10,       // un sab fruit ke kul point (aadha khaya to aadhe point)
  GROW_PER_POINT: 0.6,   // 1 point khane par kitna bada hoga (10 fruit = 3 khane lamba)
  START_LEN: 12,         // shuru mein saamp kitna chhota
  RESPAWN_WAIT: 3,       // marne ke baad kitne second ruko

  // ---- gadget ----
  GADGET_TIME: 10,       // gadget kitne second chalta hai
  MAGNET_RADIUS: 150,    // magnet kitni door tak khinchta hai
  ZOOM: 1,               // 1 = normal, bada number = zyada map dikhega, chhota = paas se
  PLAYER_SKIN: 'random', // 'random' ya 0 se 7 (apne saamp ka design)
  SAVE_CAP: 1000         // ek baar mein zyada se zyada kitna score save hoga
};
// ====================================================================================================

var FRUITS = ['🍎', '🍊', '🥭', '🍌', '🍇', '🍓', '🍒', '🥝', '🍑', '🥕', '🌽', '🧀', '🍞', '🍅', '🍄', '🥦', '🍋', '🥐'];
var NAMES = ['Rohit', 'Sneha', 'Aman', 'Kiran', 'Vikas', 'Neha', 'Raj', 'Pooja', 'Arjun', 'Meera', 'Dev', 'Isha', 'Sahil', 'Tina', 'Karan', 'Riya'];
var POTS = [{ c: '#32d66a', i: '🧲' }, { c: '#ffb02e', i: '🔍' }, { c: '#7c6cff', i: '⚡' }];
var SKINS = 8;
var EMOJIS = ['😜', '😎', '🤪', '😏', '😈'];
var Snd = SnakeSound;

var cv = document.getElementById('game');
var ctx = cv.getContext('2d');
function $(id) { return document.getElementById(id); }
var elScore = $('score'), elTime = $('time'), elCoins = $('coins'), elFx = $('fx'), elBanner = $('banner');
var elWait = $('wait'), elWmsg = $('wmsg'), elWnum = $('wnum'), elHint = $('hint'), overlay = $('overlay');
var resTitle = $('resultTitle'), resText = $('resultText'), againBtn = $('againBtn'), gBtn = [$('g0'), $('g1'), $('g2')], gCnt = [$('c0'), $('c1'), $('c2')];

var W, H, dpr, cam = { x: 0, y: 0, z: 600 }, bgPat, wallPat;
var snakes, player, state, started, timeLeft, score, coins, fruits, kills, stock, fx, skinP;
var deadT, deadN, clock, boosting, boostAcc, slitherT, boostT, foodT, hudT, bannerT, bubble, lastTime, loopId;
var robT, robWait, robFast, vis = { l: 0, t: 0, r: 0, b: 0 };
var ptrs = {}, joy = null, keysDown = {};

// khana ek jaali (grid) mein rakha hai taaki phone tez chale
var CELL = 150, COLS = 1, grid = [], cnt = [0, 0, 0], drops = [];
var sprites = {}, coinSpr = null;

function rf(a, b) { return a + Math.random() * (b - a); }
function rnd(n) { return Math.floor(Math.random() * n); }
function rad(len) { return Math.min(8 + Math.sqrt(len) * 1.5, 24); }
function turnTo(a, t, rate, dt) {
  var d = Math.atan2(Math.sin(t - a), Math.cos(t - a)), m = rate * dt;
  return a + Math.max(-m, Math.min(m, d));
}
function cc(v) { return Math.max(0, Math.min(COLS - 1, Math.floor(v / CELL))); }

// ---------- saamp ka design (skin) ----------
function segFill(sk, i) {
  switch (sk) {
    case 0: return '#f4f6f8';
    case 1: return i % 2 ? '#3a2f4d' : '#54486c';
    case 2: return i % 3 ? '#d1561c' : '#8a3510';
    case 3: return i % 2 ? '#86c232' : '#5a8f1c';
    case 4: return i % 4 < 2 ? '#a02ec0' : '#f2b705';
    case 5: return i % 2 ? '#f7c92a' : '#8f3bbd';
    case 6: return i % 4 < 2 ? '#141414' : '#f1f1f1';
    default: return i % 2 ? '#14b8a0' : '#0e8b79';
  }
}

function makeSnake(x, y, skin, len, isPlayer) {
  var a = rf(0, 6.283);
  var s = { x: x, y: y, ang: a, tAng: a, len: len, r: rad(len), skin: skin, isPlayer: isPlayer, alive: true,
            name: isPlayer ? 'You' : NAMES[rnd(NAMES.length)], think: 0, wander: a, inv: 2, segs: [] };
  var sp = s.r * 0.55;
  for (var i = 0; i < len; i++) s.segs.push({ x: x - Math.cos(a) * sp * i, y: y - Math.sin(a) * sp * i });
  return s;
}

function farSpot() {
  var M = CONFIG.MAP_SIZE;
  return { x: rf(300, M - 300), y: rf(300, M - 300) };
}

function nearSnake(x, y, d) {
  for (var i = 0; i < snakes.length; i++) {
    if (Math.hypot(snakes[i].x - x, snakes[i].y - y) < d) return true;
  }
  return false;
}

// Screen ke kone tak ki doori (is se bahar robot paida hote hain, screen par achanak nahi dikhte)
function viewReach() {
  var sc = Math.min(W, H) / cam.z * CONFIG.SIZE_UP;
  return Math.hypot(W, H) / 2 / sc;
}

// dmin..dmax = tumse kitni door paida ho (cam ke aas-paas)
function spawnRobot(dmin, dmax) {
  var M = CONFIG.MAP_SIZE, k, a, d, x, y;
  for (k = 0; k < 20; k++) {
    a = rf(0, 6.283); d = rf(dmin, dmax);
    x = cam.x + Math.cos(a) * d; y = cam.y + Math.sin(a) * d;
    if (x < 250 || y < 250 || x > M - 250 || y > M - 250) continue;
    if (nearSnake(x, y, 220)) continue;
    snakes.push(makeSnake(x, y, rnd(SKINS), Math.floor(rf(8, 70)), false));
    return true;
  }
  return false;
}

// Aas-paas ke robot ginte hain: door gaye to hata dete hain, kam hue to aage naye bana dete hain
function manageRobots() {
  var R = CONFIG.ACTIVE_RADIUS, i, s, near = 0, vr = viewReach();
  for (i = snakes.length - 1; i >= 0; i--) {
    s = snakes[i];
    if (s.isPlayer) continue;
    if (Math.hypot(s.x - cam.x, s.y - cam.y) > R * 1.15) { snakes.splice(i, 1); continue; }
    near++;
  }
  var dmin = Math.max(R * 0.6, vr * 1.1), dmax = Math.max(dmin + 120, R * 0.98);
  var maxNew = robFast ? 99 : 2;
  while (near < CONFIG.ROBOT_COUNT && maxNew > 0 && clock >= robWait) {
    if (!spawnRobot(dmin, dmax)) break;
    near++; maxNew--;
  }
  robFast = false;
}

function spawnPlayer() {
  var p = farSpot();
  player = makeSnake(p.x, p.y, skinP, CONFIG.START_LEN, true);
  snakes.push(player);
  cam.x = p.x; cam.y = p.y;
  robFast = true; robWait = 0;
  state = 'play';
  elWait.classList.remove('show');
  Snd.respawn();
}

// ---------- khana (fruit, coin, potion) ----------
function initGrid() {
  var n, i;
  COLS = Math.ceil(CONFIG.MAP_SIZE / CELL) + 1;
  n = COLS * COLS;
  grid = [];
  for (i = 0; i < n; i++) grid.push([]);
  cnt = [0, 0, 0]; drops = [];
}

function addFood(f) {
  var M = CONFIG.MAP_SIZE;
  f.x = Math.max(40, Math.min(M - 40, f.x));
  f.y = Math.max(40, Math.min(M - 40, f.y));
  f.born = clock; f.gone = false; f.mt = -1;
  f.c = cc(f.y) * COLS + cc(f.x);
  grid[f.c].push(f);
  if (f.drop) drops.push(f); else cnt[f.t]++;
}

function delFood(f) {
  var a = grid[f.c], i = a.indexOf(f);
  if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); }
  f.gone = true;
  if (!f.drop) cnt[f.t]--;
}

function moveFood(f, x, y) {
  var nc = cc(y) * COLS + cc(x), a, i;
  f.x = x; f.y = y;
  if (nc === f.c) return;
  a = grid[f.c]; i = a.indexOf(f);
  if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); }
  f.c = nc; grid[nc].push(f);
}

function newFood(t) {
  var M = CONFIG.MAP_SIZE, f = { x: rf(80, M - 80), y: rf(80, M - 80), t: t, drop: false };
  if (t === 0) { f.e = FRUITS[rnd(FRUITS.length)]; f.v = CONFIG.FRUIT_POINTS; }
  else if (t === 1) { f.v = CONFIG.COIN_POINTS; }
  else { f.k = rnd(3); f.v = 0; }
  addFood(f);
}

// 4-5 fruit ek jagah (photo jaisa gucha)
function fruitCluster() {
  var M = CONFIG.MAP_SIZE, n = CONFIG.CLUSTER_MIN + rnd(Math.max(1, CONFIG.CLUSTER_MAX - CONFIG.CLUSTER_MIN + 1));
  var bx = rf(100, M - 100), by = rf(100, M - 100), i, a, d;
  for (i = 0; i < n; i++) {
    a = rf(0, 6.283); d = rf(0, CONFIG.CLUSTER_SPREAD);
    addFood({ x: bx + Math.cos(a) * d, y: by + Math.sin(a) * d, t: 0, e: FRUITS[rnd(FRUITS.length)], v: CONFIG.FRUIT_POINTS, drop: false });
  }
  return n;
}

function fillFoods(full) {
  var i, f, k, made, lim = full ? 100000 : 40;
  for (i = drops.length - 1; i >= 0; i--) {
    f = drops[i];
    if (f.gone) drops.splice(i, 1);
    else if (clock - f.born > 60) { delFood(f); drops.splice(i, 1); }
  }
  var want = [CONFIG.FRUIT_COUNT, CONFIG.COIN_COUNT, CONFIG.POTION_COUNT];
  for (k = 0; k < 3; k++) {
    made = 0;
    while (cnt[k] < want[k] && made < lim) {
      if (k === 0 && Math.random() < CONFIG.CLUSTER_CHANCE) made += fruitCluster();
      else { newFood(k); made++; }
    }
  }
}

// Saamp marne par: bahut saare fruit + mooh ke paas ek coin
function dropPile(s) {
  var g = s.segs, n = CONFIG.DROP_FRUITS, v = CONFIG.DROP_POINTS / n, k, p;
  for (k = 0; k < n; k++) {
    p = g[Math.floor(k * g.length / n)];
    addFood({ x: p.x + rf(-s.r, s.r), y: p.y + rf(-s.r, s.r), t: 0, e: FRUITS[rnd(FRUITS.length)], v: v, drop: true });
  }
  addFood({ x: s.x, y: s.y, t: 1, v: CONFIG.COIN_POINTS, drop: true });
}

function eatFoods(s) {
  var hr = s.r + 12 * CONFIG.FRUIT_SIZE, x0 = cc(s.x - hr), x1 = cc(s.x + hr), y0 = cc(s.y - hr), y1 = cc(s.y + hr);
  var cx, cy, a, i, f, dx, dy;
  for (cy = y0; cy <= y1; cy++) for (cx = x0; cx <= x1; cx++) {
    a = grid[cy * COLS + cx];
    for (i = a.length - 1; i >= 0; i--) {
      f = a[i];
      if (f.t === 2 && !s.isPlayer) continue;
      dx = f.x - s.x; dy = f.y - s.y;
      if (dx * dx + dy * dy > hr * hr) continue;
      delFood(f);
      s.len = Math.min(220, s.len + f.v * CONFIG.GROW_PER_POINT);
      if (!s.isPlayer) continue;
      if (f.t === 0) { score += f.v; fruits++; Snd.eat(); }
      else if (f.t === 1) { score += f.v; coins++; Snd.coin(); }
      else { stock[f.k]++; Snd.pot(); }
    }
  }
}

// Magnet: paas ka khana saamp ki taraf khinchta hai
function magnetPull(s, dt) {
  var R = CONFIG.MAGNET_RADIUS, x0 = cc(s.x - R), x1 = cc(s.x + R), y0 = cc(s.y - R), y1 = cc(s.y + R);
  var cx, cy, a, i, f, mx, my, md;
  for (cy = y0; cy <= y1; cy++) for (cx = x0; cx <= x1; cx++) {
    a = grid[cy * COLS + cx];
    for (i = a.length - 1; i >= 0; i--) {
      f = a[i];
      if (f.mt === clock) continue;
      mx = s.x - f.x; my = s.y - f.y; md = Math.sqrt(mx * mx + my * my);
      if (md < R && md > 1) { f.mt = clock; moveFood(f, f.x + mx / md * 340 * dt, f.y + my / md * 340 * dt); }
    }
  }
}

// ---------- maut ----------
function banner(text) {
  elBanner.textContent = '👻  ' + text;
  elBanner.classList.add('show');
  bannerT = 2;
}

function die(s, by) {
  s.alive = false;
  dropPile(s);
  var i = snakes.indexOf(s);
  if (i >= 0) snakes.splice(i, 1);
  if (s.isPlayer) {
    state = 'dead';
    deadT = CONFIG.RESPAWN_WAIT;
    deadN = 0;
    elWmsg.textContent = by ? by.name + ' ne tumhe kaat liya!' : 'Deewar se takra gaye!';
    elWait.classList.add('show');
    boosting = false;
    Snd.bite(1);
  } else {
    var d = player && player.alive ? Math.hypot(s.x - player.x, s.y - player.y) : 9999;
    Snd.bite(Math.max(0, 1 - d / 900) * 0.7);
    if (by === player && player.alive) {
      kills++;
      banner('+1  You defeated the snake!');
      bubble = { t: 1.6, e: EMOJIS[rnd(EMOJIS.length)] };
      Snd.kill();
    }
    robWait = Math.max(robWait, clock + rf(1.5, 3.5));   // naya saamp thodi der baad
  }
}

function hitWho(s) {
  var i, j, o, g, dx, dy, lim;
  for (i = 0; i < snakes.length; i++) {
    o = snakes[i];
    if (o === s || !o.alive) continue;
    lim = s.r * 0.5 + o.r * 0.9; lim *= lim;
    g = o.segs;
    for (j = 0; j < g.length; j++) {
      dx = g[j].x - s.x; dy = g[j].y - s.y;
      if (dx * dx + dy * dy < lim) return o;
    }
  }
  return null;
}

// ---------- robot ka dimaag ----------
function danger(s, a, look) {
  var M = CONFIG.MAP_SIZE, k, px, py, i, j, o, g, dx, dy, lim;
  for (k = 1; k <= 3; k++) {
    px = s.x + Math.cos(a) * look * k / 3;
    py = s.y + Math.sin(a) * look * k / 3;
    if (px < 70 || py < 70 || px > M - 70 || py > M - 70) return true;
    for (i = 0; i < snakes.length; i++) {
      o = snakes[i];
      if (o === s) continue;
      lim = o.r + s.r * 0.6 + 14; lim *= lim;
      g = o.segs;
      for (j = 0; j < g.length; j++) {
        dx = g[j].x - px; dy = g[j].y - py;
        if (dx * dx + dy * dy < lim) return true;
      }
    }
  }
  return false;
}

function think(s, dt) {
  s.think -= dt;
  if (s.think > 0) return;
  s.think = 0.15 + Math.random() * 0.2;
  var best = null, bw = 0, i, f, dx, dy, d2, w, cx, cy, a;
  var x0 = cc(s.x - 300), x1 = cc(s.x + 300), y0 = cc(s.y - 300), y1 = cc(s.y + 300);
  for (cy = y0; cy <= y1; cy++) for (cx = x0; cx <= x1; cx++) {
    a = grid[cy * COLS + cx];
    for (i = 0; i < a.length; i++) {
      f = a[i];
      if (f.t === 2) continue;
      dx = f.x - s.x; dy = f.y - s.y; d2 = dx * dx + dy * dy;
      if (d2 > 90000) continue;                                   // 300 se door ka khana nahi dekhte
      w = (f.t === 1 ? 4 : (f.drop ? 3 : 1)) / (d2 + 2000);       // coin aur maut ka dher zyada pasand
      if (w > bw) { bw = w; best = f; }
    }
  }
  s.wander += (Math.random() - 0.5) * 0.9;
  var want = best ? Math.atan2(best.y - s.y, best.x - s.x) : s.wander;
  var pick = want;
  if (Math.random() > (1 - CONFIG.ROBOT_SMART) * 0.5) {         // samajhdaar hai to khatra dekhta hai
    var offs = [0, 0.6, -0.6, 1.2, -1.2, 2, -2, 3], look = 80 + s.r * 3;
    for (i = 0; i < offs.length; i++) {
      if (!danger(s, want + offs[i], look)) { pick = want + offs[i]; break; }
    }
  }
  s.tAng = pick;
  s.wander = pick;
}

// ---------- chalna ----------
function moveSnake(s, dt, mul) {
  s.ang = turnTo(s.ang, s.tAng, s.isPlayer ? 6 : 4.2, dt);
  var v = CONFIG.BASE_SPEED * mul;
  s.x += Math.cos(s.ang) * v * dt;
  s.y += Math.sin(s.ang) * v * dt;
  s.r = rad(s.len);
  var n = Math.floor(s.len), g = s.segs, sp = s.r * 0.55, i, p, q, dx, dy, d, k;
  g[0].x = s.x; g[0].y = s.y;
  while (g.length < n) g.push({ x: g[g.length - 1].x, y: g[g.length - 1].y });
  while (g.length > n && g.length > 3) g.pop();
  for (i = 1; i < g.length; i++) {
    p = g[i - 1]; q = g[i];
    dx = p.x - q.x; dy = p.y - q.y; d = Math.sqrt(dx * dx + dy * dy);
    if (d > sp) { k = (d - sp) / d; q.x += dx * k; q.y += dy * k; }
  }
}

function update(dt) {
  var i, k, s, o, M = CONFIG.MAP_SIZE;
  clock += dt;
  if (started) {
    timeLeft -= dt;
    if (timeLeft <= 0) { finish(); return; }
  }
  for (k = 0; k < 3; k++) if (fx[k] > 0) fx[k] -= dt;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) elBanner.classList.remove('show'); }
  if (bubble) { bubble.t -= dt; if (bubble.t <= 0) bubble = null; }

  if (state === 'dead') {
    deadT -= dt;
    k = Math.ceil(deadT);
    if (k !== deadN && k >= 1) { deadN = k; elWnum.textContent = k; Snd.tick(k); }
    if (deadT <= 0) spawnPlayer();
  }

  var list = snakes.slice();
  for (i = 0; i < list.length; i++) {
    s = list[i];
    if (!s.alive) continue;
    if (s.inv > 0) s.inv -= dt;
    var mul = 1;
    if (s.isPlayer) {
      var free = fx[2] > 0;
      var b = free || (boosting && score >= CONFIG.BOOST_COST);
      if (b) {
        mul = CONFIG.BOOST_MULT;
        if (!free) {
          boostAcc += dt;
          if (boostAcc >= CONFIG.BOOST_COST_EVERY) {
            boostAcc = 0;
            score = Math.max(0, score - CONFIG.BOOST_COST);
            s.len = Math.max(CONFIG.START_LEN, s.len - CONFIG.BOOST_COST * CONFIG.GROW_PER_POINT);
          }
        }
        boostT -= dt;
        if (boostT <= 0) { boostT = 0.28; Snd.boost(); }
      }
      if (fx[0] > 0) magnetPull(s, dt);                          // magnet: khana khinchta hai
    } else {
      think(s, dt);
    }
    moveSnake(s, dt, mul);
    if (s.x < 0 || s.y < 0 || s.x > M || s.y > M) { die(s, null); continue; }
    if (s.inv <= 0) {
      o = hitWho(s);
      if (o) { die(s, o); continue; }
    }
    eatFoods(s);
  }

  if (state === 'play') {
    slitherT -= dt;
    if (slitherT <= 0) { slitherT = 0.45; Snd.slither(); }
    cam.x = player.x; cam.y = player.y;
  }
  var zt = (520 + Math.min(player ? player.len : 12, 150) * 2.4) * CONFIG.ZOOM * (fx[1] > 0 ? 1.5 : 1);
  cam.z += (zt - cam.z) * Math.min(1, dt * 3);

  robT -= dt;
  if (robT <= 0) { robT = 0.4; manageRobots(); }
  foodT -= dt;
  if (foodT <= 0) { foodT = 0.5; fillFoods(false); }
  hudT -= dt;
  if (hudT <= 0) { hudT = 0.1; hud(); }
}

// ---------- screen par dikhana ----------
function hud() {
  elScore.textContent = Math.floor(score);
  elCoins.textContent = coins;
  var t = Math.max(0, Math.ceil(timeLeft)), m = Math.floor(t / 60), sc = t % 60;
  elTime.textContent = m + ':' + (sc < 10 ? '0' : '') + sc;
  var html = '', k, p;
  for (k = 0; k < 3; k++) {
    gCnt[k].textContent = stock[k];
    if (fx[k] > 0) {
      p = Math.max(0, Math.min(100, Math.round(fx[k] / CONFIG.GADGET_TIME * 100)));
      html += '<span style="--p:' + p + '"><em>' + POTS[k].i + '</em></span>';
      gBtn[k].classList.add('on');
    } else gBtn[k].classList.remove('on');
  }
  elFx.innerHTML = html;
}

function emojiSprite(e) {
  var c = sprites[e], x;
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 64;
    x = c.getContext('2d');
    x.font = '48px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(e, 32, 34);
    sprites[e] = c;
  }
  return c;
}

function makeCoinSprite() {
  var c = document.createElement('canvas'), x;
  c.width = c.height = 64;
  x = c.getContext('2d');
  x.beginPath(); x.arc(32, 32, 28, 0, 6.283); x.fillStyle = '#ffc928'; x.fill();
  x.lineWidth = 5; x.strokeStyle = '#e19a00'; x.stroke();
  x.font = '34px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('🪙', 32, 34);
  coinSpr = c;
}

function makePatterns() {
  var c = document.createElement('canvas'), x, i;
  c.width = 160; c.height = 160;
  x = c.getContext('2d');
  x.fillStyle = '#1f5fae'; x.fillRect(0, 0, 160, 160);
  for (i = 0; i < 70; i++) {
    x.fillStyle = 'rgba(8,40,100,' + rf(0.12, 0.3) + ')';
    x.beginPath(); x.arc(rf(0, 160), rf(0, 160), rf(1, 3.2), 0, 6.283); x.fill();
  }
  bgPat = ctx.createPattern(c, 'repeat');
  var w = document.createElement('canvas');
  w.width = 48; w.height = 48;
  x = w.getContext('2d');
  x.fillStyle = '#d3141a'; x.fillRect(0, 0, 48, 48);
  x.strokeStyle = '#150808'; x.lineWidth = 9;
  x.beginPath(); x.moveTo(0, 12); x.lineTo(24, 34); x.lineTo(48, 12); x.stroke();
  wallPat = ctx.createPattern(w, 'repeat');
  makeCoinSprite();
}

function drawSnake(s) {
  var g = s.segs, i, r = s.r, p, q;
  if (s.head === undefined) s.head = 0;
  if (s.inv > 0) ctx.globalAlpha = 0.5 + 0.4 * Math.sin(clock * 14);
  for (i = g.length - 1; i >= 0; i--) {
    q = g[i];
    if (q.x < vis.l - r || q.x > vis.r + r || q.y < vis.t - r || q.y > vis.b + r) continue;   // screen ke bahar nahi banate
    ctx.beginPath();
    ctx.arc(q.x, q.y, r, 0, 6.283);
    ctx.fillStyle = segFill(s.skin, i);
    ctx.fill();
    if (s.skin === 0) { ctx.strokeStyle = 'rgba(150,170,200,.55)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if ((s.skin === 1 || s.skin === 5) && i % 2) {
      ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.3, 0, 6.283);
      ctx.fillStyle = s.skin === 1 ? '#f59e0b' : '#e53935'; ctx.fill();
    }
  }
  p = g[0];
  var cx = Math.cos(s.ang), cy = Math.sin(s.ang), nx = -cy, ny = cx, k;
  if (s.skin === 0) {                                              // laal mooh
    ctx.beginPath(); ctx.arc(p.x + cx * r * 0.75, p.y + cy * r * 0.75, r * 0.3, 0, 6.283);
    ctx.fillStyle = '#e53935'; ctx.fill();
  }
  for (k = -1; k <= 1; k += 2) {                                   // aankhen
    var ex = p.x + cx * r * 0.35 + nx * r * 0.5 * k, ey = p.y + cy * r * 0.35 + ny * r * 0.5 * k;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.38, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + cx * r * 0.14, ey + cy * r * 0.14, r * 0.2, 0, 6.283); ctx.fillStyle = '#111'; ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  var sc = Math.min(W, H) / cam.z * CONFIG.SIZE_UP, M = CONFIG.MAP_SIZE, i, f, s, fs = CONFIG.FRUIT_SIZE;
  ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (W / 2 - cam.x * sc), dpr * (H / 2 - cam.y * sc));
  var l = cam.x - W / 2 / sc, t = cam.y - H / 2 / sc, r = cam.x + W / 2 / sc, b = cam.y + H / 2 / sc;
  vis.l = l; vis.t = t; vis.r = r; vis.b = b;
  ctx.fillStyle = bgPat; ctx.fillRect(l - 5, t - 5, r - l + 10, b - t + 10);
  ctx.fillStyle = wallPat;                                         // laal deewar
  if (t < 0) ctx.fillRect(l - 50, t - 50, r - l + 100, 50 - t);
  if (b > M) ctx.fillRect(l - 50, M, r - l + 100, b - M + 50);
  if (l < 0) ctx.fillRect(l - 50, t - 50, 50 - l, b - t + 100);
  if (r > M) ctx.fillRect(M, t - 50, r - M + 50, b - t + 100);

  var x0 = cc(l - 40), x1 = cc(r + 40), y0 = cc(t - 40), y1 = cc(b + 40), cx, cy, a, j, sz, yy;
  for (cy = y0; cy <= y1; cy++) for (cx = x0; cx <= x1; cx++) {
    a = grid[cy * COLS + cx];
    for (j = 0; j < a.length; j++) {
      f = a[j];
      if (f.x < l - 40 || f.x > r + 40 || f.y < t - 40 || f.y > b + 40) continue;
      yy = f.y + Math.sin(clock * 3 + f.x) * 2;
      if (f.t === 0) {
        sz = (f.drop ? 24 : 27) * fs * 1.333;
        ctx.drawImage(emojiSprite(f.e), f.x - sz / 2, yy - sz / 2, sz, sz);
      } else if (f.t === 1) {
        sz = 32 * fs * CONFIG.COIN_SIZE;
        ctx.drawImage(coinSpr, f.x - sz / 2, yy - sz / 2, sz, sz);
      } else {
        var P = POTS[f.k];
        ctx.save(); ctx.translate(f.x, yy); ctx.scale(fs, fs);
        ctx.beginPath(); ctx.arc(0, 4, 12, 0, 6.283); ctx.fillStyle = P.c; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#dfe6ee'; ctx.fillRect(-4, -14, 8, 8);
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-5, -17, 10, 4);
        ctx.restore();
      }
    }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (i = 0; i < snakes.length; i++) { s = snakes[i]; if (!s.isPlayer) drawSnake(s); }
  if (player && player.alive) drawSnake(player);

  if (bubble && player && player.alive) {                          // maarne par emoji
    var bx = player.x + 12, by = player.y - 46;
    ctx.fillStyle = '#fff'; ctx.fillRect(bx - 18, by - 18, 36, 34);
    ctx.font = '24px serif'; ctx.fillText(bubble.e, bx, by);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);                          // screen par joystick
  if (joy) {
    ctx.beginPath(); ctx.arc(joy.x, joy.y, 56, 0, 6.283);
    ctx.lineWidth = 3; ctx.strokeStyle = '#f59e0b'; ctx.stroke();
    ctx.beginPath(); ctx.arc(joy.kx, joy.ky, 17, 0, 6.283);
    ctx.fillStyle = 'rgba(255,225,170,.9)'; ctx.fill();
  }
}

function loop(now) {
  var dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state !== 'over') {
    if (started) update(dt);
    else { cam.x = player.x; cam.y = player.y; }
    draw();
    loopId = requestAnimationFrame(loop);
  }
}

// ---------- game shuru / khatam ----------
// Phone seedha (portrait) ho to poora game 90 degree ghuma kar lamba (landscape) kar dete hain - Fruit Cut jaisa
var portrait = false, wrap = $('wrap');
function setup() {
  dpr = Math.min(2, window.devicePixelRatio || 1);   // 2 se zyada nahi: phone tez chalta hai
  var iw = window.innerWidth, ih = window.innerHeight;
  portrait = ih > iw;
  W = portrait ? ih : iw;                             // game ki chaudai
  H = portrait ? iw : ih;                             // game ki unchai
  wrap.style.width = W + 'px';
  wrap.style.height = H + 'px';
  wrap.style.transform = portrait ? 'translateX(' + iw + 'px) rotate(90deg)' : 'none';
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ungli ki jagah (screen) -> game ki jagah (ghumne ke baad)
function toLocal(e) {
  return portrait ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY };
}

function newGame() {
  if (loopId) cancelAnimationFrame(loopId);
  setup();
  if (!bgPat) makePatterns();
  snakes = [];
  player = null; started = false; boosting = false; boostAcc = 0; joy = null; ptrs = {};
  state = 'play'; timeLeft = CONFIG.GAME_TIME;
  score = 0; coins = 0; fruits = 0; kills = 0; stock = [0, 0, 0]; fx = [0, 0, 0];
  clock = 0; slitherT = 0; boostT = 0; foodT = 0; hudT = 0; bannerT = 0; bubble = null; robT = 0; robWait = 0; robFast = true;
  skinP = CONFIG.PLAYER_SKIN === 'random' ? rnd(SKINS) : CONFIG.PLAYER_SKIN;
  elBanner.classList.remove('show'); elWait.classList.remove('show'); overlay.classList.remove('show');
  elHint.style.display = 'block';
  initGrid();
  fillFoods(true);
  cam.z = 620;
  spawnPlayer();
  cam.x = player.x; cam.y = player.y;
  // shuru mein robot pehle se paas mein dikhte hain
  var n = 0;
  while (n < CONFIG.ROBOT_COUNT && spawnRobot(260, CONFIG.ACTIVE_RADIUS * 0.9)) n++;
  hud();
  lastTime = performance.now();
  loopId = requestAnimationFrame(loop);
}

function finish() {
  if (state === 'over') return;
  state = 'over';
  elWait.classList.remove('show');
  Snd.end();
  var fin = Math.min(CONFIG.SAVE_CAP, Math.floor(score));
  resTitle.textContent = '⏰ Time khatam';
  resText.textContent = 'Score: ' + Math.floor(score) + '  |  Coin: ' + coins + '  |  Fruit: ' + fruits + '  |  Maare: ' + kills;
  if (fin > 0 && window.PWScore) {
    PWScore.save('snake-game', fin).then(function (res) {
      if (res) resText.textContent += '  →  +' + fin + ' points mile';
    });
  }
  overlay.classList.add('show');
}
function useGadget(k) {
  if (state === 'over' || stock[k] <= 0 || fx[k] > 0) return;
  stock[k]--;
  fx[k] = CONFIG.GADGET_TIME;
  Snd.gadget();
  hud();
}

// ---------- ungli / keyboard ----------
function boostOn() {
  for (var k in ptrs) if (ptrs[k] === 'boost') return true;
  return !!keysDown[' '];
}

window.addEventListener('pointerdown', function (e) {
  var t = e.target;
  if (t && t.closest && t.closest('.gad, .back, .overlay')) return;
  e.preventDefault();
  Snd.unlock();
  if (state === 'over') return;
  if (!started) { started = true; elHint.style.display = 'none'; }
  var onBoost = t && t.closest && t.closest('#boost'), haveMove = false, k, p = toLocal(e);
  for (k in ptrs) if (ptrs[k] === 'move') haveMove = true;
  if (onBoost || haveMove) ptrs[e.pointerId] = 'boost';
  else { ptrs[e.pointerId] = 'move'; joy = { x: p.x, y: p.y, kx: p.x, ky: p.y }; }
  boosting = boostOn();
});

window.addEventListener('pointermove', function (e) {
  if (ptrs[e.pointerId] !== 'move' || !joy) return;
  var p = toLocal(e), dx = p.x - joy.x, dy = p.y - joy.y, m = Math.sqrt(dx * dx + dy * dy);
  if (m > 56) { dx = dx / m * 56; dy = dy / m * 56; }
  joy.kx = joy.x + dx; joy.ky = joy.y + dy;
  if (m > 8 && player && player.alive) player.tAng = Math.atan2(dy, dx);
});

function ptrEnd(e) {
  var t = ptrs[e.pointerId];
  delete ptrs[e.pointerId];
  if (t === 'move') joy = null;
  boosting = boostOn();
}
window.addEventListener('pointerup', ptrEnd);
window.addEventListener('pointercancel', ptrEnd);

window.addEventListener('keydown', function (e) {
  var map = { ArrowLeft: Math.PI, ArrowRight: 0, ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2, a: Math.PI, d: 0, w: -Math.PI / 2, s: Math.PI / 2 };
  if (e.key in map && player && player.alive) { player.tAng = map[e.key]; started = true; elHint.style.display = 'none'; }
  if (e.key === ' ') { keysDown[' '] = true; boosting = boostOn(); Snd.unlock(); }
});
window.addEventListener('keyup', function (e) {
  if (e.key === ' ') { keysDown[' '] = false; boosting = boostOn(); }
});

gBtn.forEach(function (b, k) { b.addEventListener('click', function () { useGadget(k); }); });
againBtn.addEventListener('click', newGame);
window.addEventListener('resize', setup);
window.addEventListener('orientationchange', function () { setTimeout(setup, 150); });

newGame();
