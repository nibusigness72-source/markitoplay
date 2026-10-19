/* shadow-hammer.js - Shadow Hammer (top-down stealth hathoda game)
   Sab gameplay ki values neeche CONFIG mein hain. Har line ke aage Hinglish mein likha hai
   ki value BADHAANE se kya hoga aur GHATAANE se kya hoga. */
(function () {
  'use strict';
  var GAME_ID = 'silent-killer';

  var CONFIG = {
    // ===== TIME, POINTS =====
    GAME_TIME: 240,          // pura game kitne second ka (300 = 5 min). Badhao = zyada der khelna
    SAVE_CAP: 1000,          // ek game mein zyada se zyada itna score save hoga
    KILL_POINTS: 12,          // ek guard marne par points
    CASH_POINTS: 1,          // cash uthane par points
    ROUND_BONUS: 25,         // round poora hone par bonus points
    RESPAWN_WAIT: 3,         // hero marne ke baad kitne second ruk kar wapas aayega

    // ===== ROUNDS (kitne guard) =====
    ROUNDS: [10, 14, 16,18,20],      // round 1 = 8 guard, round 2 = 10, round 3 = 5, phir wahi dobara. Apni marzi ke number daalo
    ROUND_LOOP_GROW: 1,      // har poore chakkar ke baad har round mein itne guard EXTRA (0 = same rahenge)
    SHIELD_FROM_ROUND: 2,    // shield wale guard kis round se aayen (1 = pehle round se, 99 = kabhi nahi)
    SHIELD_RATIO: 0.35,      // guards mein se kitna hissa shield wale (0.25 = chauthai). Badhao = zyada mushkil
    SHIELD_MAX: 7,           // ek round mein zyada se zyada kitne shield wale
    GUARD_RATIO: 0.3,        // kitne guard ek jagah khade rah kar idhar-udhar dekhte hain (baaki ghoomte hain)

    // ===== HERO (apna character) =====
    PLAYER_HP: 1000,         // hero ki jaan. Badhao = zyada goli jhel sakta hai
    PLAYER_SPEED_MULT: 2.5,    // hero ki speed = guard ki speed x yeh number. 2 = guard se double tez
    PLAYER_RADIUS: 20,       // hero ka size (takkar ka). Bada = chhoti gali mein atak sakta hai
    HAMMER_REACH: 44,        // hathoda kitni door tak lagega. Badhao = door se hi maar dega
    HAMMER_SWING: 0.01,      // hathoda ghumane mein kitna second. Ghatao = tez swing
    HAMMER_COOLDOWN: 0.01,    // ek swing ke baad agla swing kitni der baad. Ghatao = jaldi jaldi maar sakte ho
    STUCK_TIME: 1,         // shield par hathoda lagne par hero kitni der atka rahega. Badhao = saza zyada
    HEAL_PER_KILL: 40,       // har guard marne par kitni jaan wapas milegi
    ROUND_HEAL: 300,         // round poora hone par kitni jaan wapas milegi
    SAFE_TIME: 2.5,          // respawn ke baad kitni der koi goli nahi lagegi

    // ===== GUARD (dushman) =====
    ENEMY_SPEED: 110,         // sab guard ki speed (sabki same). Badhao = guard tez daudenge (hero bhi saath badhega)
    CHASE_SPEED_MULT: 1.0,   // peecha karte waqt speed x yeh. 1.0 = same; 1.3 = 30% tez (to hero sirf ~1.5x rahega)
    ENEMY_SMART: 1,        // GUARD KITNA SMART HAI (0 se 1). Badhao = jaldi pehchanenge, sahi nishana, awaaz sun kar pakka aayenge, der tak dhundhenge
    ENEMY_DAMAGE: 200,       // ek goli se hero ki kitni jaan katti hai. 260 = 4 goli mein out. 330 = 3 goli mein out
    ENEMY_BULLET_SPEED: 540, // goli ki speed. Badhao = bachna mushkil
    SHOOT_RANGE: 380,        // guard kitni door se goli chalayega
    SHOOT_STOP: 170,         // itni door se paas aane par guard ruk kar goli chalayega (bahut paas aate hain)
    ENEMY_TYPES: { orange: 3, blue: 3, striped: 3 }, // kis type ke guard kitni baar aayen (sirf dikhne mein fark hai)

    // ===== NAZAR / TORCH =====
    VISION_RANGE: 330,       // torch ki roshni kitni door tak. Badhao = guard door se dekh lega
    VISION_ANGLE: 64,        // torch ka kona (degree). Badhao = chaudi roshni
    CLOSE_SENSE: 46,        // itne paas aane par guard bina dekhe bhi mehsoos kar lega (peeche se bhi)
    LIGHT_ALPHA: 0.62,       // roshni kitni chamakdaar dikhe (0 = nahi dikhegi, 1 = bahut safed)
    CHASE_RANGE: 750,        // chase mein hero is doori se bahar nikla to guard haar maan lega. Badhao = der tak peecha karega
    LOSE_TIME: 3.5,          // hero dikhna band hone ke baad guard kitni der dhundhega

    // ===== AWAAZ =====
    NOISE_KILL_RADIUS: 430,  // kisi ko maarne ki awaaz kitni door tak jayegi. Badhao = door ke guard bhi aayenge
    NOISE_SHOT_RADIUS: 520,  // goli ki awaaz kitni door tak
    NOISE_STEP_RADIUS: 70,   // hero ke chalne ki awaaz kitni door tak (0 = chalne ki awaaz koi nahi sunega)
    ALLY_ALERT_RADIUS: 280,  // ek guard ne hero dekha to is doori ke andar ke saathi guard ko bhi khabar ho jaye
    WALL_MUFFLE: 0.6,        // deewar ke peeche awaaz kitni dheemi (1 = deewar ka asar nahi, 0.3 = bahut dheemi)

    // ===== SHIELD WALA GUARD =====
    SHIELD_BLOCK_ARC: 220,   // aage ka kitna kona (degree) shield se dhaka hai. Badhao = peeche se maarna mushkil
    SHIELD_TURN: 1.7,        // shield wala kitni tez ghoomta hai (radian/second). Ghatao = peeche pahunchna aasaan

    // ===== NAKSHA (map) =====
    TILE: 56,                // ek khane ka size
    CELLS_X: 4,              // naksha kitna chauda (5 khane ke blocks)
    CELLS_Y: 5,              // naksha kitna lamba
            BLOCK_DENSITY: 0.95,     // kitne blocks mein kuch banega (1 = sab bhare, 0.6 = kuch jagah khula maidan). Ghatao = zyada khula
    ROAD_TILES: 1,           // sadak kitni chaudi (1 = patli, shahar jaisa ghana; 2 = chaudi aur khuli)
    GRASS_CHANCE: 0.08,      // ghaas ke maidan (beech mein patthar) ka chance
    
    TOUCH_KILL: true,        // true = guard se takrate hi maar dega; false = sirf tap par
    TOUCH_PAD: 6,            // takraane ki doori. Badhao = thoda door se hi maar dega
            HOUSE_CHANCE: 0.45,      // kitne blocks mein ghar banega (0 = koi ghar nahi, 1 = sab ghar). 8 alag design, palat kar aur bhi
        WALL_CHANCE: 0.25,       // kitne blocks mein band deewar/concrete/patthar wale design aayenge
    THEME: -1,               // shahar ka design: -1 = har round alag shahar (random); 0 se 5 = ek hi shahar fix
    SQUAD_MIN: 2,            // guard kam se kam kitne ke jhund mein aayenge (1 = ek-ek karke)
    SQUAD_MAX: 3,            // guard zyada se zyada kitne ke jhund mein aayenge
    CRATE_CLUSTER_MAX: 3,    // jahan ghar/ghaas nahi, wahan crate ke zyada se zyada kitne dher (1 se 3). Badhao = zyada bhara
    ENEMY_RADIUS: 13,        // guard ka size (dikhne mein bhi aur takkar mein bhi). Bada = mota guard
    SHIELD_BOUNCE: 30,       // shield par aage se maarne par hero kitna peeche uchhalega

    // ===== SCREEN =====
    VIEW_WIDTH: 760,         // screen par naksha kitna chauda dikhe. Chhota = bada zoom, bada = door tak dikhega

    // ===== PICKUP =====
    CASH_PER_ROUND: 6,       // har round mein naksha par kitne cash
    MED_CHANCE: 0.7,         // medkit milne ka chance har round (0 se 1)
    MED_HEAL: 250,           // medkit se kitni jaan
    FREEZE_CHANCE: 0.01,      // snowflake (freeze) aane ka chance har round
    FREEZE_TIME: 5,          // freeze se saare guard kitni der ruke rahenge
    DROP_CHANCE: 0.25        // guard marne par cash girne ka chance
  };

  // ---------- chhote helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('game'), cx = cv.getContext('2d');
  var Snd = window.HammerSound || { unlock: function () {}, step: function () {}, swing: function () {}, kill: function () {}, clang: function () {}, shot: function () {}, hurt: function () {}, die: function () {}, alert: function () {}, torch: function () {}, pickup: function () {}, freeze: function () {}, roundStart: function () {}, roundClear: function () {}, respawn: function () {}, tick: function () {}, end: function () {} };
  var C = CONFIG, T = C.TILE, PI = Math.PI, TAU = PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function normA(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
  function angDiff(a, b) { return Math.abs(normA(a - b)); }
  function turnTo(cur, des, step) { var d = normA(des - cur); return Math.abs(d) <= step ? des : cur + (d > 0 ? step : -step); }
  function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------- smart-ness se nikli values ----------
  var SM = {};
  function calcSmart() {
    var s = clamp(C.ENEMY_SMART, 0, 1);
    SM.reaction = lerp(1.1, 0.25, s);      // dekhne ke kitni der baad pehchanega
    SM.spread = lerp(0.34, 0.05, s);       // nishana kitna bhatakta hai (radian)
    SM.hearChance = lerp(0.4, 1.0, s);     // awaaz sun kar aane ka chance
    SM.lose = C.LOSE_TIME * lerp(0.6, 1.5, s);
    SM.turn = lerp(2.6, 6.5, s);           // ghoomne ki speed
    SM.shootCd = lerp(1.05, 0.55, s);      // do goli ke beech ka gap
    SM.repath = lerp(0.6, 0.25, s);        // rasta kitni jaldi dobara dhundhe
  }

  // ---------- screen ----------
  var W = 0, H = 0, dpr = 1, scale = 1, Q = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    scale = W / C.VIEW_WIDTH; Q = scale * dpr;
    buildSprites();
  }

  // ---------- map ----------
  var MW = 0, MH = 0, solid = null, kindMap = null, varMap = null, theme = 0;
  function isSolidT(tx, ty) { return tx < 0 || ty < 0 || tx >= MW || ty >= MH || solid[ty * MW + tx] === 1; }

  var floorMap = null, doorMap = null;
  // Har design 5x5 ka hai.  #=ghar ki deewar  D=darwaza  .=andar ka farsh  ,=bahar ki zameen
  // c=andar crate  C=bahar crate  b=doosra crate  x=concrete  o=patthar ka dabba  g=ghaas
  var HOUSES = [   // ANDAR JA SAKNE WALE GHAR
    ['#####', '#...#', '#.c.#', '#...#', '##D##'],
    ['#####', '#...#', '#.###', '#...#', '#D###'],
    ['#####', '#.#.#', '#.#.#', '#...#', '##D##'],
    ['#####', '#...#', '#.#.#', '#...#', '#D#D#'],
    ['####,', '#..#,', '#..D,', '#c.#,', '####,'],
    ['#####', '#.#.#', '#.D.#', '#.#.#', '#D###'],
    ['##D##', '#...#', '#.#.#', '#...#', '##D##'],
    ['#####', '#c..#', '#...D', '#..c#', '#####'],
    ['#####', '#...#', '#.#.#', '#...D', '#####'],
    ['#####', '#...#', '###.#', ',,#.#', ',,#D#'],
    [',###,', 'C#.#C', ',#.#,', 'C#.#,', ',#D#,'],
    ['#D###', '#...#', '#...#', '#...#', '###D#'],
    ['#####', '#.c.#', '#...#', '#.c.#', '##D##'],
    ['####,', '#..#,', '#.##,', '#..D,', '####,']
  ];
  var WALLS = [    // BAND DEEWAREN / BLOCK (andar nahi ja sakte)
    ['#,,,,', '#,,,,', '#,,,,', '#####', ',,,,,'],
    ['#,,,#', '#,,,#', '#,,,#', '#####', ',,,,,'],
    ['#,,,#', '#,,,#', '#,,,#', '#,,,#', '#,,,#'],
    ['###,,', ',,#,,', ',,#,,', ',,###', ',,,,,'],
    ['xxxxx', ',,x,,', ',,x,,', ',,x,,', ',,,,,'],
    ['xxx,,', 'xxx,,', 'xxx,,', ',,,xx', ',,,xx'],
    [',,x,,', ',,x,,', 'xxxxx', ',,x,,', ',,x,,'],
    ['oo,oo', 'oo,oo', ',,,,,', 'oo,oo', 'oo,oo'],
    ['#####', '#,,,,', '#,b,,', '#,,,,', '#####'],
    ['##,,,', '#,,,,', ',,,,,', ',,,,#', ',,,##'],
    ['bb,,,', 'bb,,,', ',,,xx', ',,,xx', ',,,,,']
  ];
  var GRASSES = [  // GHAAS ke maidan
    ['ggggg', 'ggggg', 'ggogg', 'ggggg', 'ggggg'],
    ['ggggg', 'gCCgg', 'ggggg', 'ggbbg', 'ggggg'],
    ['ggggg', 'goggg', 'ggggg', 'gggog', 'ggggg'],
    ['ggggg', 'xxxxx', 'ggxgg', 'ggxgg', 'ggggg']
  ];
  function flipHouse(rows, t) { // design ko ghuma/palat kar naya banao (8 tarah)
    var n = rows.length, out = [], r, c, line;
    for (r = 0; r < n; r++) { line = ''; for (c = 0; c < n; c++) {
      var rr = r, cc = c, k;
      if (t & 1) cc = n - 1 - cc;
      if (t & 2) rr = n - 1 - rr;
      if (t & 4) { k = rr; rr = cc; cc = k; }
      line += rows[rr].charAt(cc);
    } out.push(line); }
    return out;
  }
  function sameK(x, y, kk) { return x >= 0 && y >= 0 && x < MW && y < MH && solid[y * MW + x] === 1 && kindMap[y * MW + x] === kk; }
  function stamp(rows, ox, oy) { // design ko naksha par lagao
    for (var y = 0; y < 5; y++) for (var x = 0; x < 5; x++) {
      var ch = rows[y].charAt(x), gx = ox + x, gy = oy + y, gi = gy * MW + gx;
      if (ch === '#') { setS(gx, gy, 4); floorMap[gi] = 1; }
      else if (ch === 'D') { floorMap[gi] = 1; doorMap[gi] = 1; }
      else if (ch === '.') { floorMap[gi] = 1; }
      else if (ch === 'c') { floorMap[gi] = 1; setS(gx, gy, 1); }
      else if (ch === 'C') { setS(gx, gy, 1); }
      else if (ch === 'b') { setS(gx, gy, 2); }
      else if (ch === 'x') { setS(gx, gy, 6); }
      else if (ch === 'o') { setS(gx, gy, 5); }
      else if (ch === 'g') { floorMap[gi] = 2; }
    }
  }
  function genMap() {
    var R = Math.max(1, Math.round(C.ROAD_TILES));
    MW = C.CELLS_X * (5 + R) + R + 2; MH = C.CELLS_Y * (5 + R) + R + 2;
    solid = new Uint8Array(MW * MH); kindMap = new Uint8Array(MW * MH); varMap = new Uint8Array(MW * MH);
    floorMap = new Uint8Array(MW * MH); doorMap = new Uint8Array(MW * MH);
    var x, y;
    for (x = 0; x < MW; x++) { setS(x, 0, 3); setS(x, MH - 1, 3); }
    for (y = 0; y < MH; y++) { setS(0, y, 3); setS(MW - 1, y, 3); }
    for (var cy = 0; cy < C.CELLS_Y; cy++) for (var cxx = 0; cxx < C.CELLS_X; cxx++) {
      if (Math.random() > C.BLOCK_DENSITY) continue;                       // khula maidan
      var ox = 1 + R + cxx * (5 + R), oy = 1 + R + cy * (5 + R), roll = Math.random();
      if (roll < C.HOUSE_CHANCE) stamp(flipHouse(pick(HOUSES), rint(0, 7)), ox, oy);                                  // GHAR
      else if (roll < C.HOUSE_CHANCE + C.WALL_CHANCE) stamp(flipHouse(pick(WALLS), rint(0, 7)), ox, oy);              // DEEWAREN
      else if (roll < C.HOUSE_CHANCE + C.WALL_CHANCE + C.GRASS_CHANCE) stamp(flipHouse(pick(GRASSES), rint(0, 7)), ox, oy); // GHAAS
      else {                                                                                                           // CRATE ka jhund
        var n = rint(1, C.CRATE_CLUSTER_MAX);
        for (var k = 0; k < n; k++) {
          var w = rint(1, 3), hh = rint(1, 3), bx = ox + rint(0, 5 - w), by = oy + rint(0, 5 - hh), kd = Math.random() < 0.3 ? 2 : 1;
          for (y = by; y < by + hh; y++) for (x = bx; x < bx + w; x++) setS(x, y, kd);
        }
      }
    }
    // hero neeche ki sadak par shuru hoga
    var px = Math.floor(MW / 2), py = MH - 2;
    spawnT = { x: px, y: py };
    // jo khali jagah band ho gayi (jahan koi pahunch nahi sakta) use crate se bhar do
    var seen = new Uint8Array(MW * MH), stack = [py * MW + px]; seen[stack[0]] = 1;
    while (stack.length) {
      var cur = stack.pop(), sx = cur % MW, sy = (cur / MW) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = sx + d[0], ny = sy + d[1];
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) return;
        var ni = ny * MW + nx; if (!solid[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      });
    }
    for (y = 1; y < MH - 1; y++) for (x = 1; x < MW - 1; x++) if (!solid[y * MW + x] && !seen[y * MW + x]) setS(x, y, 1);
  }

  var spawnT = { x: 1, y: 1 };
  function setS(x, y, kd) { var i = y * MW + x; solid[i] = 1; kindMap[i] = kd; varMap[i] = rint(0, 2); }

  function circleHits(x, y, r) {
    var x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (!isSolidT(tx, ty)) continue;
      var nx = clamp(x, tx * T, tx * T + T), ny = clamp(y, ty * T, ty * T + T);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
    }
    return false;
  }
  function moveCircle(o, dx, dy, r) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5));
    var sx = dx / n, sy = dy / n;
    for (var i = 0; i < n; i++) {
      if (!circleHits(o.x + sx, o.y, r)) o.x += sx;
      if (!circleHits(o.x, o.y + sy, r)) o.y += sy;
    }
  }
  // DDA: ek kirn kitni door tak jati hai (deewar tak)
  function castRay(x, y, a, maxd) {
    var dx = Math.cos(a), dy = Math.sin(a);
    var tx = Math.floor(x / T), ty = Math.floor(y / T);
    var stx = dx > 0 ? 1 : -1, sty = dy > 0 ? 1 : -1;
    var tdx = dx === 0 ? 1e9 : Math.abs(T / dx), tdy = dy === 0 ? 1e9 : Math.abs(T / dy);
    var mx = dx === 0 ? 1e9 : ((dx > 0 ? (tx + 1) * T - x : x - tx * T) / Math.abs(dx));
    var my = dy === 0 ? 1e9 : ((dy > 0 ? (ty + 1) * T - y : y - ty * T) / Math.abs(dy));
    var d = 0;
    if (isSolidT(tx, ty)) return 0;
    while (d < maxd) {
      if (mx < my) { d = mx; mx += tdx; tx += stx; } else { d = my; my += tdy; ty += sty; }
      if (d >= maxd) return maxd;
      if (isSolidT(tx, ty)) return d;
    }
    return maxd;
  }
  function los(ax, ay, bx, by) { var d = dist(ax, ay, bx, by); if (d < 1) return true; return castRay(ax, ay, Math.atan2(by - ay, bx - ax), d) >= d - 1; }

  // ---------- rasta (A*) ----------
  function Heap() { this.a = []; }
  Heap.prototype.push = function (n, f) { var a = this.a; a.push([n, f]); var i = a.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (a[p][1] <= a[i][1]) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
  Heap.prototype.pop = function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0, n = a.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && a[l][1] < a[m][1]) m = l; if (r < n && a[r][1] < a[m][1]) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } } return top[0]; };
  function nearestFree(tx, ty) {
    if (!isSolidT(tx, ty)) return { x: tx, y: ty };
    for (var r = 1; r < 8; r++) for (var yy = ty - r; yy <= ty + r; yy++) for (var xx = tx - r; xx <= tx + r; xx++) if (!isSolidT(xx, yy)) return { x: xx, y: yy };
    return { x: tx, y: ty };
  }
  function clearLine(ax, ay, bx, by, r) {
    var d = dist(ax, ay, bx, by), n = Math.ceil(d / 8);
    for (var i = 1; i <= n; i++) { var t = i / n; if (circleHits(ax + (bx - ax) * t, ay + (by - ay) * t, r)) return false; }
    return true;
  }
  function findPath(sx, sy, ex, ey, r) {
    var s = nearestFree(Math.floor(sx / T), Math.floor(sy / T)), e = nearestFree(Math.floor(ex / T), Math.floor(ey / T));
    var N = MW * MH, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    var si = s.y * MW + s.x, ei = e.y * MW + e.x, h = new Heap();
    g[si] = 0; h.push(si, 0);
    var DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], guard = 0;
    while (h.a.length && guard++ < 6000) {
      var cur = h.pop(); if (closed[cur]) continue; closed[cur] = 1;
      if (cur === ei) break;
      var cxx = cur % MW, cyy = (cur / MW) | 0;
      for (var k = 0; k < 8; k++) {
        var nx = cxx + DX[k], ny = cyy + DY[k];
        if (isSolidT(nx, ny)) continue;
        if (k >= 4 && (isSolidT(cxx + DX[k], cyy) || isSolidT(cxx, cyy + DY[k]))) continue;
        var ni = ny * MW + nx; if (closed[ni]) continue;
        var ng = g[cur] + (k < 4 ? 1 : 1.414);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; h.push(ni, ng + Math.hypot(e.x - nx, e.y - ny)); }
      }
    }
    if (!closed[ei]) return [];
    var pts = [], i = ei;
    while (i !== si && i !== -1) { pts.push({ x: (i % MW) * T + T / 2, y: ((i / MW) | 0) * T + T / 2 }); i = from[i]; }
    pts.reverse();
      // aakhri point = asli jagah (agar khali ho)
    if (!circleHits(ex, ey, r)) pts[pts.length - 1] = { x: ex, y: ey };
    // seedha kar do (string pull)
    var out = [], ax = sx, ay = sy, idx = 0;
    while (idx < pts.length) {
      var far = idx;
      for (var j = pts.length - 1; j > idx; j--) if (clearLine(ax, ay, pts[j].x, pts[j].y, r)) { far = j; break; }
      out.push(pts[far]); ax = pts[far].x; ay = pts[far].y; idx = far + 1;
    }
    return out;
  }

  // ---------- sprites (character, crate, floor) ----------
  var spr = {};
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

      // ---------- SHAHAR (theme): har round alag shahar ----------
  // floor = bahar ka farsh (2 rang), pat = farsh ka design (check / diamond / herring)
  // fin = ghar ke andar ka farsh, c1/c2 = crate ke rang [base, dark, light]
  // hw = ghar ki deewar [rang, kinara, design: dia / plain / brick / cobble]
  // st = patthar ka dabba [rang, kinara], cc = concrete [rang, kinara], gr = ghaas ke 2 rang
  var THEMES = [
    { floor: ['#c8c8c3', '#bfbfba'], pat: 'check',   fin: ['#d9cdc9', '#d0c3bf'], c1: ['#3f72c4', '#2b4f8f', '#6b9be0'], c2: ['#d0a25f', '#9a7338', '#ecc98a'], hw: ['#d9ab6c', '#26324f', 'dia'],   st: ['#8a9a7a', '#6a3a2a'], cc: ['#b9bcc2', '#2b2e35'], gr: ['#80c345', '#74b83a'] },
    { floor: ['#50525a', '#484a51'], pat: 'diamond', fin: ['#8e8c88', '#86847f'], c1: ['#cc8a33', '#8a5a1c', '#f0b866'], c2: ['#b8742a', '#7a4a14', '#e0a050'], hw: ['#d9ab6c', '#2a4a8a', 'dia'],   st: ['#8a9a7a', '#6a2a1a'], cc: ['#6e7178', '#202226'], gr: ['#6fae3c', '#65a233'] },
    { floor: ['#d8d8d4', '#d0d0cb'], pat: 'herring', fin: ['#e2d8d4', '#dacfcb'], c1: ['#d98f2e', '#8f5a14', '#f2bb6a'], c2: ['#3f9a6a', '#256a45', '#7ad0a0'], hw: ['#b9524a', '#3a1a1a', 'plain'], st: ['#8a9a7a', '#6a2a22'], cc: ['#b9bcc2', '#2b2e35'], gr: ['#80c345', '#74b83a'] },
    { floor: ['#d6dad6', '#ced2ce'], pat: 'herring', fin: ['#e2d8d4', '#dacfcb'], c1: ['#3f9a6a', '#256a45', '#7ad0a0'], c2: ['#d98f2e', '#8f5a14', '#f2bb6a'], hw: ['#c0554e', '#2a1818', 'plain'], st: ['#6f8a74', '#2a3a2c'], cc: ['#a9adb4', '#2b2e35'], gr: ['#7cc043', '#70b53a'] },
    { floor: ['#9fb0c4', '#97a8bd'], pat: 'check',   fin: ['#d6c9c5', '#cdbfbb'], c1: ['#b0452e', '#6a2a1a', '#d9795e'], c2: ['#d0a25f', '#9a7338', '#ecc98a'], hw: ['#7d7b3e', '#1e1e0c', 'brick'], st: ['#8a9a7a', '#4a3a2a'], cc: ['#b9bcc2', '#2b2e35'], gr: ['#80c345', '#74b83a'] },
    { floor: ['#d4cfcd', '#ccc7c5'], pat: 'herring', fin: ['#e4dbd7', '#dcd2ce'], c1: ['#d0a25f', '#9a7338', '#ecc98a'], c2: ['#c97b2e', '#8a4f14', '#eaa55c'], hw: ['#a06c44', '#8a8a8a', 'cobble'], st: ['#7f8f78', '#6a3a2a'], cc: ['#b9bcc2', '#2b2e35'], gr: ['#80c345', '#74b83a'] }
  ];
  var TH = THEMES[0], lastTheme = -1;
  function pickTheme() {
    if (C.THEME >= 0) return C.THEME % THEMES.length;
    var t; do { t = rint(0, THEMES.length - 1); } while (t === lastTheme && THEMES.length > 1);
    lastTheme = t; return t;
  }
  function buildSprites() {
    TH = THEMES[theme];
    spr = { floor: [], crate: {}, wall: null, enemy: {}, player: null };
    var tp = Math.ceil(T * Q) + 1, c, g, i, v, k;
    function tile() { c = mk(tp, tp); g = c.getContext('2d'); g.scale(Q, Q); }
    function paintFloor(base, pat, alt) {
      g.fillStyle = base; g.fillRect(0, 0, T + 1, T + 1);
      if (pat === 'check') { g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, T - 1, T - 1); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(4, 4, T - 8, T - 8); }
      else if (pat === 'diamond') {
        g.strokeStyle = 'rgba(0,0,0,.20)'; g.lineWidth = 1.2; g.strokeRect(0.5, 0.5, T - 1, T - 1);
        g.beginPath(); g.moveTo(T / 2, 3); g.lineTo(T - 3, T / 2); g.lineTo(T / 2, T - 3); g.lineTo(3, T / 2); g.closePath(); g.stroke();
      } else {
        g.strokeStyle = 'rgba(0,0,0,.11)'; g.lineWidth = 1.4;
        for (var q = -T; q < T * 2; q += 9) { g.beginPath(); if (alt) { g.moveTo(q, 0); g.lineTo(q + T, T); } else { g.moveTo(q, T); g.lineTo(q + T, 0); } g.stroke(); }
      }
    }
    for (i = 0; i < 2; i++) { tile(); paintFloor(TH.floor[i], TH.pat, i); spr.floor.push(c); }
    spr.floorIn = []; spr.grass = [];
    for (i = 0; i < 2; i++) {
      tile(); g.fillStyle = TH.fin[i]; g.fillRect(0, 0, T + 1, T + 1);
      g.strokeStyle = 'rgba(90,60,60,.18)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, T - 1, T - 1);
      g.beginPath(); g.moveTo(0, T / 2); g.lineTo(T, T / 2); g.moveTo(T / 2, 0); g.lineTo(T / 2, T); g.stroke();
      spr.floorIn.push(c);
      tile(); g.fillStyle = TH.gr[i]; g.fillRect(0, 0, T + 1, T + 1);
      g.fillStyle = 'rgba(0,0,0,.07)'; for (var gy = 4; gy < T; gy += 8) g.fillRect(0, gy, T + 1, 2);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(8, 10, 3, 3); g.fillRect(34, 30, 3, 3); g.fillRect(20, 44, 3, 3);
      spr.grass.push(c);
    }
    var cols = { 1: TH.c1, 2: TH.c2 };
    [1, 2].forEach(function (kd) {
      spr.crate[kd] = [];
      for (var v2 = 0; v2 < 3; v2++) {
        tile(); var cc = cols[kd];
        g.fillStyle = cc[0]; g.fillRect(0, 0, T + 1, T + 1);
        g.fillStyle = cc[2]; g.fillRect(0, 0, T, 4);
        g.strokeStyle = cc[1]; g.lineWidth = 2.2; g.strokeRect(2, 2, T - 4, T - 4);
        g.lineWidth = 1.6;
        if (v2 === 0) { g.beginPath(); g.moveTo(4, 4); g.lineTo(T - 4, T - 4); g.moveTo(T - 4, 4); g.lineTo(4, T - 4); g.stroke(); }
        else if (v2 === 1) { for (var q2 = 1; q2 < 4; q2++) { g.beginPath(); g.moveTo(3, q2 * T / 4); g.lineTo(T - 3, q2 * T / 4); g.stroke(); } }
        else { g.strokeRect(11, 11, T - 22, T - 22); g.beginPath(); g.moveTo(T / 2, 2); g.lineTo(T / 2, 11); g.moveTo(T / 2, T - 11); g.lineTo(T / 2, T - 2); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.18)'; [[5, 5], [T - 7, 5], [5, T - 7], [T - 7, T - 7]].forEach(function (p) { g.fillRect(p[0], p[1], 2, 2); });
        spr.crate[kd].push(c);
      }
    });
    tile();   // border ki deewar
    g.fillStyle = '#2f343f'; g.fillRect(0, 0, T + 1, T + 1);
    g.fillStyle = '#e0b43a'; for (var s = -T; s < T * 2; s += 18) { g.beginPath(); g.moveTo(s, T); g.lineTo(s + 8, T); g.lineTo(s + 8 + T, 0); g.lineTo(s + T, 0); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(30,34,44,.78)'; g.fillRect(0, 0, T + 1, T + 1);
    spr.wall = c;
    // ghar ki deewar (theme ke hisaab se)
    spr.hwall = [];
    for (v = 0; v < 3; v++) {
      tile(); g.fillStyle = TH.hw[0]; g.fillRect(0, 0, T + 1, T + 1);
      var dsn = TH.hw[2];
      if (dsn === 'brick') {
        g.fillStyle = 'rgba(0,0,0,.20)';
        for (var by2 = 0; by2 < T; by2 += 14) { g.fillRect(0, by2, T + 1, 2); var off = ((by2 / 14) % 2) * 14 + v * 5; for (var bx2 = off; bx2 < T; bx2 += 28) g.fillRect(bx2, by2, 2, 14); }
      } else if (dsn === 'dia') {
        g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(T / 2, 10); g.lineTo(T - 10, T / 2); g.lineTo(T / 2, T - 10); g.lineTo(10, T / 2); g.closePath(); g.fill();
      } else if (dsn === 'cobble') {
        g.fillStyle = 'rgba(0,0,0,.16)'; for (var cy2 = 7; cy2 < T; cy2 += 14) for (var cx2 = 7 + (cy2 % 28 ? 7 : 0) + v * 3; cx2 < T + 7; cx2 += 14) { g.beginPath(); g.arc(cx2, cy2, 5.2, 0, TAU); g.fill(); }
      } else {
        g.fillStyle = 'rgba(0,0,0,.10)'; for (var py2 = 12; py2 < T; py2 += 14) g.fillRect(0, py2 + v, T + 1, 2);
      }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, T + 1, 4);
      spr.hwall.push(c);
    }
    // patthar ka dabba
    tile(); g.fillStyle = TH.st[1]; g.fillRect(0, 0, T + 1, T + 1);
    g.fillStyle = TH.st[0]; g.fillRect(4, 4, T - 8, T - 8);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(T / 2, 8); g.lineTo(T - 8, T / 2); g.lineTo(T / 2, T - 8); g.lineTo(8, T / 2); g.closePath(); g.stroke();
    spr.stone = c;
    // concrete
    tile(); g.fillStyle = TH.cc[0]; g.fillRect(0, 0, T + 1, T + 1);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(8, 8, T - 16, T - 16);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.5; g.strokeRect(8, 8, T - 16, T - 16);
    spr.conc = c;
    var SZ = 80; // character sprite box (world)
    ['orange', 'blue', 'striped', 'shield'].forEach(function (k) { spr.enemy[k] = charSprite(k, SZ); });
    spr.player = charSprite('player', SZ);
    spr.SZ = SZ;
  }
  function charSprite(kind, SZ) {
    var c = mk(SZ * Q, SZ * Q), g = c.getContext('2d'); g.scale(Q, Q); g.translate(SZ / 2, SZ / 2);
    var PAL = {
      player:  { body: '#3f9a4e', dark: '#1d5a2a', edge: '#174a22', light: '#8be69d', skin: '#e2b48c', hat: '#2c7a3a', glove: '#15181d' },
      orange:  { body: '#f28a1e', dark: '#7c3f05', edge: '#7c3f05', light: '#ffc66e', skin: '#d9a578', hat: '#2f2420', glove: '#1d1d1d' },
      blue:    { body: '#2f6fd0', dark: '#12336b', edge: '#12336b', light: '#86b6ff', skin: '#d9a578', hat: '#16181f', glove: '#1d1d1d' },
      striped: { body: '#ededed', dark: '#111',    edge: '#111',    light: '#ffffff', skin: '#d9a578', hat: '#141414', glove: '#111' },
      shield:  { body: '#5f6977', dark: '#272c34', edge: '#272c34', light: '#b3bfce', skin: '#c89a74', hat: '#3b434e', glove: '#14161a' }
    }[kind];
    function line(x1, y1, x2, y2, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    function rrect(x, y, w, h, r, fill, stroke) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.3; g.stroke(); } }
    g.fillStyle = 'rgba(0,0,0,.30)'; g.beginPath(); g.ellipse(2, 4, 14, 18, 0, 0, TAU); g.fill();
    g.fillStyle = '#14161b'; g.beginPath(); g.ellipse(-7, -7, 5.5, 3.4, 0.2, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-7, 7, 5.5, 3.4, -0.2, 0, TAU); g.fill();
    if (kind === 'player' || kind === 'shield') { rrect(-17, -9, 10, 18, 3, kind === 'player' ? '#2a5e33' : '#3a414b', PAL.edge); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(-15, -7, 3, 14); }
    var rh = { x: 18, y: 6.5 }, lh = { x: 15, y: -6 };
    if (kind === 'player') { lh = { x: 8, y: -12 }; rh = { x: 11, y: 10 }; }
    line(1, 11, rh.x, rh.y, 8.2, PAL.edge); line(1, -11, lh.x, lh.y, 8.2, PAL.edge);
    line(1, 11, rh.x, rh.y, 6, PAL.body); line(1, -11, lh.x, lh.y, 6, PAL.body);
    line(1, 10, rh.x, rh.y - 0.6, 2, 'rgba(255,255,255,.22)'); line(1, -12, lh.x, lh.y - 0.6, 2, 'rgba(255,255,255,.22)');
    var gr = g.createRadialGradient(-3, -4, 2, 0, 0, 17);
    gr.addColorStop(0, PAL.light); gr.addColorStop(0.45, PAL.body); gr.addColorStop(1, PAL.dark);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 10.5, 16, 0, 0, TAU); g.fill();
    g.strokeStyle = PAL.edge; g.lineWidth = 1.6; g.stroke();
    if (kind === 'orange') { g.fillStyle = '#ffe9a8'; g.fillRect(-4, -14, 2.6, 28); g.fillRect(2, -13.5, 2.6, 27); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9, 1, 18, 2); }
    if (kind === 'blue') { g.fillStyle = '#fff'; g.fillRect(-1.3, -15, 2.8, 30); g.fillRect(4.2, -14, 1.6, 28); }
    if (kind === 'striped') { g.fillStyle = '#111'; for (var i = -12; i <= 12; i += 6) g.fillRect(-9, i - 1.4, 18, 2.8); }
    if (kind === 'player') {
      g.fillStyle = '#1f5c2b'; g.fillRect(-2, -12, 6, 24); g.fillStyle = '#9af0ac'; g.fillRect(-1, -10, 1.6, 20);
      g.fillStyle = '#2f7a3b'; g.beginPath(); g.arc(-1, -13, 4.6, 0, TAU); g.arc(-1, 13, 4.6, 0, TAU); g.fill();
      g.strokeStyle = '#174a22'; g.lineWidth = 1; g.beginPath(); g.arc(-1, -13, 4.6, 0, TAU); g.stroke(); g.beginPath(); g.arc(-1, 13, 4.6, 0, TAU); g.stroke();
    }
    if (kind === 'shield') { g.fillStyle = '#9aa6b5'; g.fillRect(-5, -13, 3.5, 26); g.fillStyle = '#2d333c'; g.beginPath(); g.arc(-1, -13, 4, 0, TAU); g.arc(-1, 13, 4, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-9, 6, 18, 2.4);
    g.fillStyle = PAL.glove; g.beginPath(); g.arc(rh.x, rh.y, 3.4, 0, TAU); g.fill(); g.beginPath(); g.arc(lh.x, lh.y, 3.4, 0, TAU); g.fill();
    if (kind !== 'player') {
      rrect(12, 4, 20, 5.2, 1.8, '#1b1e24', '#08090b'); g.fillStyle = '#4a515c'; g.fillRect(14, 5, 14, 1.4);
      g.fillStyle = '#0d0e11'; g.fillRect(17, 8.8, 4, 5.5); g.fillRect(30, 5, 4, 3.2);
      rrect(13, -9.6, 11, 5.2, 2, '#6b7380', '#2a2e35'); g.fillStyle = '#9aa3b2'; g.fillRect(14, -8.8, 8, 1.4);
      var tg = g.createRadialGradient(25, -7, 0, 25, -7, 5); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#fff3b8'); tg.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = tg; g.beginPath(); g.arc(25, -7, 5, 0, TAU); g.fill();
      g.fillStyle = '#2a2e35'; g.beginPath(); g.arc(24, -7, 1.6, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(1, 1.5, 8.6, 0, TAU); g.fill();
    g.fillStyle = PAL.skin; g.beginPath(); g.arc(2, 0, 8, 0, TAU); g.fill();
    var hg = g.createRadialGradient(-2, -3, 1, 0, 0, 8.4); hg.addColorStop(0, kind === 'player' ? '#58b866' : '#5a5a66'); hg.addColorStop(1, PAL.hat);
    g.fillStyle = kind === 'striped' || kind === 'orange' || kind === 'blue' ? PAL.hat : hg;
    g.beginPath(); g.arc(-0.6, 0, 7.6, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-2.4, -2.6, 3.4, 2, -0.5, 0, TAU); g.fill();
    if (kind === 'player') {
      rrect(3, -5.6, 5.4, 11.2, 2, '#10261a'); g.fillStyle = '#a4f5b4'; g.fillRect(4.4, -4, 1.7, 8);
      g.fillStyle = '#2f7a3b'; g.fillRect(-5, -1, 8, 2);
    }
    if (kind === 'orange') { g.fillStyle = '#f28a1e'; g.beginPath(); g.arc(-0.6, 0, 7.6, 0, TAU); g.fill(); g.fillStyle = '#c96d0f'; g.fillRect(4.6, -6.4, 3.4, 12.8); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.arc(-0.6, 0, 7.6, 0, TAU); g.stroke(); }
    if (kind === 'blue') { g.fillStyle = '#1b1f2a'; g.beginPath(); g.arc(-0.6, 0, 7.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(-0.8, -7.4, 1.8, 14.8); }
    if (kind === 'striped') { g.fillStyle = '#fff'; g.fillRect(-4, -6.5, 1.8, 13); g.fillRect(0.4, -7.2, 1.8, 14.4); g.fillStyle = '#111'; g.fillRect(4.2, -4.8, 3.4, 3.4); g.fillRect(4.2, 1.4, 3.4, 3.4); }
    if (kind === 'shield') {
      g.fillStyle = '#7a8594'; g.fillRect(-4, -7, 2.4, 14); g.fillStyle = '#0e1013'; g.fillRect(3.6, -4.6, 4, 9.2); g.fillStyle = '#7fd0ff'; g.fillRect(4.6, -3.2, 1.6, 6.4);
      var sg = g.createLinearGradient(14, -22, 30, 22); sg.addColorStop(0, '#c9d8e8'); sg.addColorStop(0.5, '#8ea4bb'); sg.addColorStop(1, '#52667b');
      g.fillStyle = sg; g.strokeStyle = '#26323f'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(22, -21); g.quadraticCurveTo(32, 0, 22, 21); g.lineTo(15, 19); g.quadraticCurveTo(23, 0, 15, -19); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(22.5, -15); g.quadraticCurveTo(28, -3, 24, 5); g.lineTo(22, 3); g.quadraticCurveTo(25, -4, 21, -14); g.fill();
      g.fillStyle = '#26323f'; [-14, -5, 5, 14].forEach(function (yy) { g.beginPath(); g.arc(19, yy, 1.1, 0, TAU); g.fill(); });
    }
    return c;
  }
  function pickupSpr(kind) { // chhote icons, direct draw hote hain
    return kind;
  }

  // ---------- game state ----------
  var state = 'menu', last = 0, dtS = 0.016;
  var P, enemies = [], bullets = [], parts = [], decals = [], pickups = [], texts = [];
  var score = 0, kills = 0, timeLeft = C.GAME_TIME, round = 0, loops = 0, roundNo = 0, frozen = 0, clearT = 0, bannerT = 0, bannerTxt = '', respawnT = 0, shake = 0, tickSec = -1;
  var camX = 0, camY = 0, cash = 0, hitFlash = 0, killsRound = 0, roundTotal = 0, stepAcc = 0, elapsed = 0;
  var input = { down: false, sx: 0, sy: 0, lastSet: 0 };

  function newPlayer() {
    var sx = spawnT.x * T + T / 2, sy = spawnT.y * T + T / 2;
    return { x: sx, y: sy, a: -PI / 2, hp: C.PLAYER_HP, max: C.PLAYER_HP,r: Math.min(C.PLAYER_RADIUS, T * 0.45) , alive: true, path: [], pi: 0, tgt: null, tgtE: null,
      swing: -1, cd: 0, hitDone: true, stuck: 0, safe: C.SAFE_TIME, moving: false, repath: 0, spawnX: sx, spawnY: sy };
  }
  function roundCount() { var base = C.ROUNDS[roundNo % C.ROUNDS.length], loop = Math.floor(roundNo / C.ROUNDS.length); return base + loop * C.ROUND_LOOP_GROW; }
  function freeTiles(minD, from) {
    var arr = [];
    for (var y = 1; y < MH - 1; y++) for (var x = 1; x < MW - 1; x++) if (!solid[y * MW + x]) {
      var wx = x * T + T / 2, wy = y * T + T / 2;
      if (!from || dist(wx, wy, from.x, from.y) >= minD) arr.push({ x: wx, y: wy });
    }
    return arr;
  }
  function startRound() {
    theme = pickTheme(); genMap(); buildSprites();
    var keepHp = P ? P.hp : C.PLAYER_HP;
    P = newPlayer(); if (roundNo > 0) P.hp = Math.min(P.max, keepHp);
    P.safe = 1.2;
    enemies = []; bullets = []; parts = []; decals = []; pickups = []; texts = []; frozen = 0;
    var n = roundCount(), tiles = freeTiles(420, P), placed = [], types = [];
    Object.keys(C.ENEMY_TYPES).forEach(function (k) { for (var i = 0; i < C.ENEMY_TYPES[k]; i++) types.push(k); });
    var shields = roundNo + 1 >= C.SHIELD_FROM_ROUND ? Math.min(C.SHIELD_MAX, Math.round(n * C.SHIELD_RATIO)) : 0;
        var squadLeft = 0, leader = null, squadGuard = false, squadRoute = [];
    for (var i = 0; i < n; i++) {
            var tries = 0, t;
      if (squadLeft <= 0) { // naya jhund: 2-3 guard saath
        squadLeft = Math.min(n - i, rint(C.SQUAD_MIN, C.SQUAD_MAX));
        do { leader = pick(tiles); tries++; } while (tries < 60 && placed.some(function (p) { return dist(p.x, p.y, leader.x, leader.y) < 160; }));
        placed.push(leader); squadGuard = Math.random() < C.GUARD_RATIO; squadRoute = [];
        if (!squadGuard) for (var k0 = 0; k0 < 3; k0++) { var w0 = pick(tiles); squadRoute.push({ x: w0.x, y: w0.y }); }
        t = leader;
      } else {
        var near = tiles.filter(function (q) { return dist(q.x, q.y, leader.x, leader.y) < 120; });
        t = near.length ? pick(near) : leader;
      }
      squadLeft--;
      var type = i < shields ? 'shield' : pick(types);
            var guard = squadGuard;
      var e = { x: t.x, y: t.y, a: rnd(-PI, PI), type: type, alive: true, st: guard ? 'guard' : 'patrol', path: [], pi: 0, seeT: 0, cd: rnd(0.3, 1), repath: 0, lastX: t.x, lastY: t.y, loseT: 0, lookT: 0, wp: [], wpi: 0, scan: rnd(0, TAU), torchT: rnd(1, 4), stepAcc: 0, mark: '', markT: 0, r: Math.min(C.ENEMY_RADIUS, T * 0.45), home: { x: t.x, y: t.y }, stuckT: 0, lastPX: t.x, lastPY: t.y };
            if (!guard) { e.wp = squadRoute.slice(); e.wp.unshift({ x: leader.x, y: leader.y }); e.wpi = rint(0, e.wp.length - 1); }
      enemies.push(e);
    }
    var ft = freeTiles(200, P);
    for (i = 0; i < C.CASH_PER_ROUND; i++) { var c = pick(ft); pickups.push({ x: c.x, y: c.y, kind: 'cash', t: rnd(0, 6) }); }
    if (Math.random() < C.MED_CHANCE) { var m = pick(ft); pickups.push({ x: m.x, y: m.y, kind: 'med', t: 0 }); }
    if (Math.random() < C.FREEZE_CHANCE) { var f = pick(ft); pickups.push({ x: f.x, y: f.y, kind: 'freeze', t: 0 }); }
    roundTotal = n; killsRound = 0; clearT = 0;
    bannerTxt = 'ROUND ' + (roundNo + 1) + '   •   ' + n + ' Guard'; bannerT = 2.2; Snd.roundStart();
    snapCam();
  }
  function resetGame() {
    calcSmart(); score = 0; kills = 0; cash = 0; timeLeft = C.GAME_TIME; roundNo = 0; P = null; tickSec = -1; elapsed = 0; respawnT = 0;
    startRound();
  }

  // ---------- awaaz (noise) ----------
  function noise(x, y, radius, byPlayer) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (!e.alive || e.st === 'chase') continue;
      var d = dist(x, y, e.x, e.y), rr = radius * (los(x, y, e.x, e.y) ? 1 : C.WALL_MUFFLE);
      if (d <= rr && Math.random() < SM.hearChance) {
        e.st = 'investigate'; e.lastX = x + rnd(-30, 30); e.lastY = y + rnd(-30, 30); e.path = findPath(e.x, e.y, e.lastX, e.lastY, e.r); e.pi = 0; e.lookT = 0; e.mark = '?'; e.markT = 2;
      }
    }
    void byPlayer;
  }
  function startChase(e) {
    if (e.st === 'chase') return;
    e.st = 'chase'; e.loseT = 0; e.mark = '!'; e.markT = 1.2; e.seeT = 0;
    Snd.alert(clamp(1 - dist(e.x, e.y, P.x, P.y) / 700, 0.2, 1));
    for (var i = 0; i < enemies.length; i++) {
      var o = enemies[i]; if (o === e || !o.alive || o.st === 'chase') continue;
      if (dist(o.x, o.y, e.x, e.y) <= C.ALLY_ALERT_RADIUS && Math.random() < SM.hearChance) {
        o.st = 'investigate'; o.lastX = P.x; o.lastY = P.y; o.path = findPath(o.x, o.y, P.x, P.y, o.r); o.pi = 0; o.lookT = 0; o.mark = '?'; o.markT = 2;
      }
    }
  }

  // ---------- effects ----------
  function blast(x, y, big) {
    var n = big ? 34 : 14;
    for (var i = 0; i < n; i++) {
      var a = rnd(0, TAU), sp = rnd(60, big ? 340 : 200);
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.35, 0.9), max: 0.9, r: rnd(2, big ? 6.5 : 4), c: pick(['#c4121b', '#e02a2f', '#8a0a10', '#ff6a3a']) });
    }
    var bl = []; for (i = 0; i < 9; i++) bl.push([rnd(-16, 16), rnd(-16, 16), rnd(3, 9)]);
    decals.push({ x: x, y: y, bl: bl });
    if (decals.length > 90) decals.shift();
    if (big) { parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.28, max: 0.28, r: 44, c: 'ring' }); shake = Math.max(shake, 6); }
  }
  function floatText(x, y, s, c) { texts.push({ x: x, y: y, s: s, c: c || '#fff', t: 1 }); }

  // ---------- input ----------
  function toWorld(sx, sy) { return { x: camX + sx / scale, y: camY + sy / scale }; }
  function setTargetAt(sx, sy, fresh) {
    if (state !== 'play' || !P.alive) return;
    var w = toWorld(sx, sy);
    if (fresh) {
      var best = null, bd = 38;
      for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (!e.alive) continue; var d = dist(w.x, w.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (best) { P.tgtE = best; P.tgt = null; P.path = findPath(P.x, P.y, best.x, best.y, P.r); P.pi = 0; P.repath = 0.25; return; }
    }
    P.tgtE = null;
    var tx = clamp(w.x, T + 4, MW * T - T - 4), ty = clamp(w.y, T + 4, MH * T - T - 4);
    if (circleHits(tx, ty, P.r)) { var nf = nearestFree(Math.floor(tx / T), Math.floor(ty / T)); tx = nf.x * T + T / 2; ty = nf.y * T + T / 2; }
    P.tgt = { x: tx, y: ty }; P.path = findPath(P.x, P.y, tx, ty, P.r); P.pi = 0;
  }
  cv.addEventListener('pointerdown', function (ev) {
    ev.preventDefault(); Snd.unlock();
    input.down = true; input.sx = ev.clientX; input.sy = ev.clientY; input.lastSet = performance.now();
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    setTargetAt(ev.clientX, ev.clientY, true);
  });
  cv.addEventListener('pointermove', function (ev) {
    if (!input.down) return; ev.preventDefault();
    input.sx = ev.clientX; input.sy = ev.clientY;
    var n = performance.now(); if (n - input.lastSet < 90) return; input.lastSet = n;
    setTargetAt(ev.clientX, ev.clientY, false);
  });
  function up() { input.down = false; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  // ---------- hero update ----------
  function hitEnemy(e) {
    // dhaal: hero guard ke aage ke kone mein hai?
    var toP = Math.atan2(P.y - e.y, P.x - e.x);
    if (e.type === 'shield' && angDiff(toP, e.a) < (C.SHIELD_BLOCK_ARC * PI / 180) / 2) {
            var bx2 = P.x - e.x, by2 = P.y - e.y, bl = Math.hypot(bx2, by2) || 1;
      moveCircle(P, bx2 / bl * C.SHIELD_BOUNCE, by2 / bl * C.SHIELD_BOUNCE, P.r);
      P.tgtE = null; P.path = []; P.tgt = null;
      Snd.clang(1); floatText(P.x, P.y - 30, 'AAGE SE NAHI!', '#ffd24a');
      parts.push({ x: (P.x + e.x) / 2, y: (P.y + e.y) / 2, vx: 0, vy: 0, life: 0.2, max: 0.2, r: 16, c: 'spark' });
      noise(e.x, e.y, C.NOISE_KILL_RADIUS * 0.5, true);
      if (e.st !== 'chase') startChase(e);
      return;
    }
    e.alive = false; kills++; killsRound++; score += C.KILL_POINTS;
    blast(e.x, e.y, true); Snd.kill(1);
    floatText(e.x, e.y - 20, '+' + C.KILL_POINTS, '#ffd24a');
    noise(e.x, e.y, C.NOISE_KILL_RADIUS, true);
    P.hp = Math.min(P.max, P.hp + C.HEAL_PER_KILL);
    if (Math.random() < C.DROP_CHANCE) pickups.push({ x: e.x, y: e.y, kind: 'cash', t: 0 });
    if (P.tgtE === e) { P.tgtE = null; P.path = []; P.tgt = null; }
  }
  function updPlayer(dt) {
    if (!P.alive) return;
    if (P.safe > 0) P.safe -= dt;
    P.cd -= dt;
    P.moving = false;
    if (P.stuck > 0) { P.stuck -= dt; if (P.swing >= 0) P.swing = -1; return; }
        // takrate hi maar do
    if (C.TOUCH_KILL && P.cd <= 0 && P.swing < 0) {
      for (var ti = 0; ti < enemies.length; ti++) {
        var te = enemies[ti];
        if (te.alive && dist(P.x, P.y, te.x, te.y) < P.r + te.r + C.TOUCH_PAD) {
          P.a = Math.atan2(te.y - P.y, te.x - P.x);
          P.swing = 0.5; P.hitDone = true; Snd.swing(); hitEnemy(te); break;
        }
      }
    }
    // target guard ke piche
    if (P.tgtE) {
      var e = P.tgtE;
      if (!e.alive) { P.tgtE = null; }
      else {
        var d = dist(P.x, P.y, e.x, e.y);
        P.repath -= dt;
        if (d > C.HAMMER_REACH * 0.9 && P.swing < 0 && P.repath <= 0) { P.path = findPath(P.x, P.y, e.x, e.y, P.r); P.pi = 0; P.repath = 0.25; }
        if (d <= C.HAMMER_REACH && P.swing < 0 && P.cd <= 0) {
          P.swing = 0; P.hitDone = false; P.a = Math.atan2(e.y - P.y, e.x - P.x); Snd.swing();
        }
      }
    }
    if (P.swing >= 0) {
      P.swing += dt / C.HAMMER_SWING;
      if (!P.hitDone && P.swing >= 0.5) {
        P.hitDone = true;
        var tgt = P.tgtE && P.tgtE.alive && dist(P.x, P.y, P.tgtE.x, P.tgtE.y) <= C.HAMMER_REACH * 1.25 ? P.tgtE : null;
        if (!tgt) { var bd = C.HAMMER_REACH; for (var i = 0; i < enemies.length; i++) { var q = enemies[i]; if (q.alive) { var dd = dist(P.x, P.y, q.x, q.y); if (dd < bd && angDiff(Math.atan2(q.y - P.y, q.x - P.x), P.a) < 1.1) { bd = dd; tgt = q; } } } }
        if (tgt) hitEnemy(tgt);
      }
      if (P.swing >= 1) { P.swing = -1; P.cd = C.HAMMER_COOLDOWN; }
      return; // swing ke waqt hero khada rahega
    }
    // chalna
    if (P.path && P.pi < P.path.length) {
      var wp = P.path[P.pi], dx = wp.x - P.x, dy = wp.y - P.y, dd2 = Math.hypot(dx, dy), sp = C.ENEMY_SPEED * C.PLAYER_SPEED_MULT;
      if (dd2 < 7) { P.pi++; }
      else {
        var st = Math.min(dd2, sp * dt), ox = P.x, oy = P.y;
        moveCircle(P, dx / dd2 * st, dy / dd2 * st, P.r);
        P.a = turnTo(P.a, Math.atan2(dy, dx), 14 * dt);
        P.moving = Math.hypot(P.x - ox, P.y - oy) > 0.2;
        if (!P.moving && st > 0.5) { P.pi++; }
        stepAcc += Math.hypot(P.x - ox, P.y - oy);
        if (stepAcc > 30) { stepAcc = 0; Snd.step(1); if (C.NOISE_STEP_RADIUS > 0) noise(P.x, P.y, C.NOISE_STEP_RADIUS, true); }
      }
    } else if (!P.tgtE) { P.tgt = null; }
  }
  function playerHit(dmg) {
    if (!P.alive || P.safe > 0) return;
    P.hp -= dmg; hitFlash = 0.25; shake = Math.max(shake, 4); Snd.hurt();
    parts.push({ x: P.x, y: P.y, vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0.4, max: 0.4, r: 4, c: '#c4121b' });
    if (P.hp <= 0) {
      P.hp = 0; P.alive = false; P.path = []; P.tgtE = null; P.tgt = null; respawnT = C.RESPAWN_WAIT; tickSec = -1;
      blast(P.x, P.y, true); Snd.die();
      enemies.forEach(function (e) { if (e.alive) { e.st = e.wp.length ? 'patrol' : 'guard'; e.seeT = 0; e.path = []; e.mark = ''; } });
      bullets = [];
    }
  }

  // ---------- guard update ----------
  function canSee(e) {
    if (!P.alive || P.safe > 0) return false;
    var d = dist(e.x, e.y, P.x, P.y);
    var ox = e.x + Math.cos(e.a) * 16, oy = e.y + Math.sin(e.a) * 16;
    if (d <= C.CLOSE_SENSE) return los(e.x, e.y, P.x, P.y);
    if (e.st === 'chase' && d <= C.VISION_RANGE * 1.25) return los(ox, oy, P.x, P.y);
    if (d > C.VISION_RANGE) return false;
    var half = (C.VISION_ANGLE * PI / 180) / 2;
    if (angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.a) > half) return false;
    return los(ox, oy, P.x, P.y);
  }
  function walkPath(e, dt, sp) {
    if (!e.path || e.pi >= e.path.length) return true;
    var wp = e.path[e.pi], dx = wp.x - e.x, dy = wp.y - e.y, d = Math.hypot(dx, dy);
    if (d < 7) { e.pi++; return e.pi >= e.path.length; }
    var st = Math.min(d, sp * dt), ox = e.x, oy = e.y;
    moveCircle(e, dx / d * st, dy / d * st, e.r);
    var tr = (e.type === 'shield' ? C.SHIELD_TURN : SM.turn) * dt;
    e.a = turnTo(e.a, Math.atan2(dy, dx), tr);
    var mv = Math.hypot(e.x - ox, e.y - oy);
    if (mv < st * 0.3) { e.stuckT += dt; if (e.stuckT > 0.5) { e.pi++; e.stuckT = 0; } } else e.stuckT = 0;
    e.stepAcc += mv;
    if (e.stepAcc > 34) { e.stepAcc = 0; var dp = dist(e.x, e.y, P.x, P.y); if (dp < 240) Snd.step(1 - dp / 240); }
    return false;
  }
  function shoot(e) {
    var base = Math.atan2(P.y - e.y, P.x - e.x), a = base + (Math.random() + Math.random() + Math.random() - 1.5) * (SM.spread * 1.3);
    bullets.push({ x: e.x + Math.cos(e.a) * 24, y: e.y + Math.sin(e.a) * 24, vx: Math.cos(a) * C.ENEMY_BULLET_SPEED, vy: Math.sin(a) * C.ENEMY_BULLET_SPEED, life: 1.4, ox: e.x, oy: e.y });
    var d = dist(e.x, e.y, P.x, P.y);
    Snd.shot(clamp(1 - d / 800, 0.3, 1));
    noise(e.x, e.y, C.NOISE_SHOT_RADIUS * 0.6, false);
    parts.push({ x: e.x + Math.cos(e.a) * 28, y: e.y + Math.sin(e.a) * 28, vx: 0, vy: 0, life: 0.07, max: 0.07, r: 9, c: 'flash' });
  }
  function updEnemy(e, dt) {
    if (!e.alive) return;
    e.cd -= dt; e.markT -= dt; if (e.markT <= 0) e.mark = '';
    e.torchT -= dt; if (e.torchT <= 0) { e.torchT = rnd(2.2, 4.5); var dp0 = dist(e.x, e.y, P.x, P.y); if (dp0 < 300) Snd.torch(1 - dp0 / 300); }
    if (frozen > 0) return;
    var sees = canSee(e), d = dist(e.x, e.y, P.x, P.y), sp = C.ENEMY_SPEED, tr = (e.type === 'shield' ? C.SHIELD_TURN : SM.turn) * dt;
    if (e.st === 'guard') {
      e.scan += dt * 0.9; e.a = turnTo(e.a, e.home.a === undefined ? e.a : e.a, tr); e.a += Math.sin(e.scan) * 0.9 * dt;
    } else if (e.st === 'patrol') {
      if (!e.path.length || e.pi >= e.path.length) { e.wpi = (e.wpi + 1) % e.wp.length; var w = e.wp[e.wpi]; e.path = findPath(e.x, e.y, w.x, w.y, e.r); e.pi = 0; if (!e.path.length) e.pi = 0; }
      walkPath(e, dt, sp);
    } else if (e.st === 'investigate') {
      var arrived = walkPath(e, dt, sp * C.CHASE_SPEED_MULT);
      if (arrived) { e.lookT += dt; e.a += Math.sin(e.lookT * 3) * 1.8 * dt; if (e.lookT > 2.2) { e.st = e.wp.length ? 'patrol' : 'guard'; e.path = []; e.pi = 0; } }
    } else if (e.st === 'search') {
      e.lookT -= dt;
      var arr = walkPath(e, dt, sp);
      if (arr) { e.a += 2 * dt; if (!e.path.length || e.pi >= e.path.length) { var rx = e.lastX + rnd(-150, 150), ry = e.lastY + rnd(-150, 150); e.path = findPath(e.x, e.y, rx, ry, e.r); e.pi = 0; } }
      if (e.lookT <= 0) { e.st = e.wp.length ? 'patrol' : 'guard'; e.path = []; e.pi = 0; }
    } else if (e.st === 'chase') {
      var spC = sp * C.CHASE_SPEED_MULT;
      if (sees) {
        e.lastX = P.x; e.lastY = P.y; e.loseT = 0;
        var want = Math.atan2(P.y - e.y, P.x - e.x);
        e.a = turnTo(e.a, want, tr);
        var inRange = d <= C.SHOOT_RANGE;
        if (inRange && angDiff(e.a, want) < 0.3 && e.cd <= 0) { shoot(e); e.cd = SM.shootCd * rnd(0.9, 1.2); }
        if (d > C.SHOOT_STOP) {
          e.repath -= dt;
          if (e.repath <= 0 || !e.path.length) { e.path = findPath(e.x, e.y, P.x, P.y, e.r); e.pi = 0; e.repath = SM.repath; }
          walkPath(e, dt, spC);
        }
      } else {
        e.loseT += dt;
        e.repath -= dt;
        if (e.repath <= 0) { e.path = findPath(e.x, e.y, e.lastX, e.lastY, e.r); e.pi = 0; e.repath = SM.repath * 1.5; }
        var ar = walkPath(e, dt, spC);
        if (d > C.CHASE_RANGE && e.loseT > 1) { e.st = 'search'; e.lookT = SM.lose; e.path = []; e.mark = '?'; e.markT = 2; }
        else if (ar && e.loseT > SM.lose * 0.5) { e.st = 'search'; e.lookT = SM.lose; e.path = []; e.mark = '?'; e.markT = 2; }
        else if (e.loseT > SM.lose + 4) { e.st = 'search'; e.lookT = SM.lose; e.path = []; }
      }
      return;
    }
    // dekhna (chase ke alawa)
    if (sees) { e.seeT += dt * (1 + (1 - d / C.VISION_RANGE) * 2.5); if (e.seeT >= SM.reaction) { e.lastX = P.x; e.lastY = P.y; startChase(e); } }
    else e.seeT = Math.max(0, e.seeT - dt * 1.5);
    if (sees && e.st !== 'chase') { e.a = turnTo(e.a, Math.atan2(P.y - e.y, P.x - e.x), tr * 0.6); }
  }
  function updBullets(dt) {
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i], n = Math.ceil(C.ENEMY_BULLET_SPEED * dt / 6), dead = false;
      for (var k = 0; k < n && !dead; k++) {
        b.x += b.vx * dt / n; b.y += b.vy * dt / n;
        if (isSolidT(Math.floor(b.x / T), Math.floor(b.y / T))) { dead = true; parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.12, max: 0.12, r: 7, c: 'spark' }); }
        else if (P.alive && dist(b.x, b.y, P.x, P.y) < P.r + 3) { dead = true; if (P.safe <= 0) playerHit(C.ENEMY_DAMAGE); }
      }
      b.life -= dt; if (b.life <= 0) dead = true;
      if (dead) bullets.splice(i, 1);
    }
  }
  function updPickups(dt) {
    for (var i = pickups.length - 1; i >= 0; i--) {
      var p = pickups[i]; p.t += dt;
      if (!P.alive || dist(p.x, p.y, P.x, P.y) > P.r + 16) continue;
      if (p.kind === 'cash') { score += C.CASH_POINTS; cash++; floatText(p.x, p.y - 14, '+' + C.CASH_POINTS, '#7dff8f'); Snd.pickup('cash'); }
      else if (p.kind === 'med') { P.hp = Math.min(P.max, P.hp + C.MED_HEAL); floatText(p.x, p.y - 14, '+HP', '#ff7f9a'); Snd.pickup('med'); }
      else { frozen = C.FREEZE_TIME; floatText(p.x, p.y - 14, 'FREEZE!', '#9fe7ff'); Snd.freeze(); }
      pickups.splice(i, 1);
    }
  }
  function updFx(dt) {
    for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; if (p.life <= 0) parts.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { var t = texts[i]; t.t -= dt; t.y -= 26 * dt; if (t.t <= 0) texts.splice(i, 1); }
    if (shake > 0) shake = Math.max(0, shake - 30 * dt);
    if (hitFlash > 0) hitFlash -= dt;
    if (bannerT > 0) bannerT -= dt;
  }
  function update(dt) {
    elapsed += dt;
    timeLeft -= dt;
    var ts = Math.ceil(timeLeft);
    if (timeLeft <= 0) { timeLeft = 0; finish(); return; }
    if (frozen > 0) frozen -= dt;
    updPlayer(dt);
    for (var i = 0; i < enemies.length; i++) updEnemy(enemies[i], dt);
    updBullets(dt); updPickups(dt); updFx(dt);
    if (!P.alive) {
      respawnT -= dt; var s = Math.ceil(respawnT);
      if (s !== tickSec && s > 0) { tickSec = s; Snd.tick(s); }
      if (respawnT <= 0) { P.alive = true; P.hp = P.max; P.x = P.spawnX; P.y = P.spawnY; P.safe = C.SAFE_TIME; P.path = []; P.tgt = null; P.tgtE = null; P.swing = -1; P.stuck = 0; Snd.respawn(); }
    }
    // round poora?
    if (!clearT && roundTotal > 0 && enemies.every(function (e) { return !e.alive; })) {
      clearT = 2; score += C.ROUND_BONUS; P.hp = Math.min(P.max, P.hp + C.ROUND_HEAL);
      bannerTxt = 'ROUND CLEAR!   +' + C.ROUND_BONUS; bannerT = 2; Snd.roundClear();
    }
    if (clearT) { clearT -= dt; if (clearT <= 0) { clearT = 0; roundNo++; startRound(); } }
    void ts;
    updCam(dt);
  }

  // ---------- camera ----------
  function viewH() { return H / scale; }
  function targetCam() {
    var vw = C.VIEW_WIDTH, vh = viewH(), tx = P.x - vw / 2, ty = P.y - vh * 0.55;
    tx = clamp(tx, 0, Math.max(0, MW * T - vw)); ty = clamp(ty, 0, Math.max(0, MH * T - vh));
    return { x: tx, y: ty };
  }
  function snapCam() { var c = targetCam(); camX = c.x; camY = c.y; }
  function updCam(dt) { var c = targetCam(), k = 1 - Math.pow(0.0005, dt); camX += (c.x - camX) * k; camY += (c.y - camY) * k; }
// ---------- drawing ----------
  function drawWorld() {
    var vw = C.VIEW_WIDTH, vh = viewH();
    var shx = shake > 0 ? rnd(-shake, shake) : 0, shy = shake > 0 ? rnd(-shake, shake) : 0;
    cx.setTransform(Q, 0, 0, Q, -(camX + shx) * Q, -(camY + shy) * Q);
    var x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(MW - 1, Math.floor((camX + vw) / T)), y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(MH - 1, Math.floor((camY + vh) / T)), x, y, i;
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var fi = y * MW + x; if (solid[fi]) continue;
      var fk = floorMap[fi];
      cx.drawImage(fk === 1 ? spr.floorIn[(x + y) & 1] : fk === 2 ? spr.grass[(x + y) & 1] : spr.floor[(x + y) & 1], x * T, y * T, T + 0.6, T + 0.6);
      if (doorMap[fi]) { cx.fillStyle = 'rgba(110,235,245,.6)'; cx.fillRect(x * T + 3, y * T + 3, T - 6, T - 6); cx.strokeStyle = 'rgba(40,120,140,.8)'; cx.lineWidth = 2; cx.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6); }
        }
    // khoon ke daag
    cx.fillStyle = 'rgba(140,10,16,.8)';
    for (i = 0; i < decals.length; i++) { var dc = decals[i]; for (var k = 0; k < dc.bl.length; k++) { cx.beginPath(); cx.arc(dc.x + dc.bl[k][0], dc.y + dc.bl[k][1], dc.bl[k][2], 0, TAU); cx.fill(); } }
    // pickup
    for (i = 0; i < pickups.length; i++) drawPickup(pickups[i]);
    // roshni
    for (i = 0; i < enemies.length; i++) { var e = enemies[i]; if (e.alive && frozen <= 0 && e.x > camX - C.VISION_RANGE && e.x < camX + vw + C.VISION_RANGE && e.y > camY - C.VISION_RANGE && e.y < camY + vh + C.VISION_RANGE) drawCone(e); }
    // crate ki chhaya + crate
    cx.fillStyle = 'rgba(0,0,0,.28)';
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var id = y * MW + x; if (solid[id] && kindMap[id] !== 3) cx.fillRect(x * T + 5, y * T + 7, T, T); }
            for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var id2 = y * MW + x; if (!solid[id2]) continue;
      var kk = kindMap[id2], im = kk === 3 ? spr.wall : kk === 4 ? spr.hwall[varMap[id2]] : kk === 5 ? spr.stone : kk === 6 ? spr.conc : spr.crate[kk][varMap[id2]];
      cx.drawImage(im, x * T, y * T, T + 0.6, T + 0.6);
      if (kk === 4 || kk === 6) { // deewar ka kinara (sirf bahar ki taraf)
        cx.fillStyle = kk === 4 ? TH.hw[1] : TH.cc[1];
        if (!sameK(x, y - 1, kk)) cx.fillRect(x * T, y * T, T, 4);
        if (!sameK(x, y + 1, kk)) cx.fillRect(x * T, y * T + T - 4, T, 4);
        if (!sameK(x - 1, y, kk)) cx.fillRect(x * T, y * T, 4, T);
        if (!sameK(x + 1, y, kk)) cx.fillRect(x * T + T - 4, y * T, 4, T);
      }
            }
    // guard
    for (i = 0; i < enemies.length; i++) if (enemies[i].alive) drawChar(enemies[i]);
    if (P.alive) drawPlayer();
    // goli
    for (i = 0; i < bullets.length; i++) {
      var b = bullets[i], an = Math.atan2(b.vy, b.vx);
      cx.save(); cx.translate(b.x, b.y); cx.rotate(an);
      var gr = cx.createLinearGradient(-22, 0, 4, 0); gr.addColorStop(0, 'rgba(255,200,80,0)'); gr.addColorStop(1, 'rgba(255,230,140,.9)');
      cx.fillStyle = gr; cx.fillRect(-22, -1.6, 26, 3.2);
      cx.fillStyle = '#fff3b0'; cx.beginPath(); cx.arc(3, 0, 3, 0, TAU); cx.fill(); cx.restore();
    }
    // particles
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], a = clamp(p.life / p.max, 0, 1);
      if (p.c === 'ring') { cx.strokeStyle = 'rgba(255,230,200,' + a * 0.8 + ')'; cx.lineWidth = 4 * a; cx.beginPath(); cx.arc(p.x, p.y, p.r * (1.2 - a), 0, TAU); cx.stroke(); }
      else if (p.c === 'spark' || p.c === 'flash') { cx.fillStyle = 'rgba(255,240,170,' + a + ')'; cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, TAU); cx.fill(); }
      else { cx.globalAlpha = a; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.6 + a * 0.4), 0, TAU); cx.fill(); cx.globalAlpha = 1; }
    }
    // rasta ka teer + nishana
    drawTarget();
    // upar ke nishaan (!, ?) aur HP
    for (i = 0; i < enemies.length; i++) { var q = enemies[i]; if (q.alive && q.mark) { cx.font = 'bold 22px Arial'; cx.textAlign = 'center'; cx.lineWidth = 4; cx.strokeStyle = '#000'; cx.fillStyle = q.mark === '!' ? '#ff3b3b' : '#ffd24a'; cx.strokeText(q.mark, q.x, q.y - 26); cx.fillText(q.mark, q.x, q.y - 26); } }
    if (P.alive) drawHP();
    for (i = 0; i < texts.length; i++) { var tx = texts[i]; cx.globalAlpha = clamp(tx.t * 2, 0, 1); cx.font = 'bold 15px Arial'; cx.textAlign = 'center'; cx.lineWidth = 3.5; cx.strokeStyle = '#000'; cx.fillStyle = tx.c; cx.strokeText(tx.s, tx.x, tx.y); cx.fillText(tx.s, tx.x, tx.y); cx.globalAlpha = 1; }
  }
  function drawCone(e) {
    var half = (C.VISION_ANGLE * PI / 180) / 2, ox = e.x + Math.cos(e.a) * 16, oy = e.y + Math.sin(e.a) * 16, n = 34;
    cx.beginPath(); cx.moveTo(ox, oy);
    for (var i = 0; i <= n; i++) { var a = e.a - half + (half * 2) * i / n, d = castRay(ox, oy, a, C.VISION_RANGE); cx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d); }
    cx.closePath();
    var g = cx.createRadialGradient(ox, oy, 4, ox, oy, C.VISION_RANGE);
    var al = e.st === 'chase' ? Math.min(1, C.LIGHT_ALPHA * 1.25) : C.LIGHT_ALPHA;
    g.addColorStop(0, 'rgba(255,255,255,' + al + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fill();
  }
  function drawChar(e) {
    var s = spr.enemy[e.type], SZ = spr.SZ;
        cx.save(); cx.translate(e.x, e.y); cx.rotate(e.a); cx.scale(e.r / 13, e.r / 13); cx.drawImage(s, -SZ / 2, -SZ / 2, SZ, SZ);
    if (frozen > 0) { cx.fillStyle = 'rgba(140,220,255,.5)'; cx.beginPath(); cx.arc(0, 0, 16, 0, TAU); cx.fill(); }
    cx.restore();
  }
  function drawPlayer() {
    var SZ = spr.SZ, blink = P.safe > 0 && Math.floor(elapsed * 10) % 2 === 0;
        cx.save(); cx.translate(P.x, P.y); cx.rotate(P.a); cx.scale(P.r / 14, P.r / 14);
    if (blink) cx.globalAlpha = 0.45;
    cx.drawImage(spr.player, -SZ / 2, -SZ / 2, SZ, SZ);
    // hathoda (haath mein)
    var ang;
    if (P.stuck > 0) ang = -0.15 + Math.sin(elapsed * 40) * 0.05;
    else if (P.swing >= 0) { var t = P.swing; var e2 = t < 0.5 ? t / 0.5 : 1; ang = lerp(1.35, -0.9, e2 * e2 * (3 - 2 * e2)); if (t > 0.5) ang = lerp(-0.9, -0.5, (t - 0.5) * 2); }
    else ang = 1.05;
    cx.translate(10, 10); cx.rotate(ang);
    cx.fillStyle = '#6a4423'; cx.fillRect(0, -2.2, 27, 4.4);
    cx.fillStyle = '#3a2412'; cx.fillRect(0, -2.2, 6, 4.4);
    cx.fillStyle = '#8f98a6'; cx.fillRect(23, -9, 13, 18);
    cx.fillStyle = '#c9d2de'; cx.fillRect(23, -9, 13, 4);
    cx.fillStyle = '#555d6b'; cx.fillRect(23, 6, 13, 3);
    cx.restore();
  }
  function drawHP() {
        var w = 54, h = 10, x = P.x - w / 2, y = P.y - P.r - 20, f = clamp(P.hp / P.max, 0, 1);
    cx.fillStyle = 'rgba(0,0,0,.65)'; cx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    cx.fillStyle = f > 0.5 ? '#38d24a' : f > 0.25 ? '#f0b429' : '#e63b3b'; cx.fillRect(x, y, w * f, h);
    cx.font = 'bold 10px Arial'; cx.textAlign = 'center'; cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.fillStyle = '#fff';
    cx.strokeText(String(Math.ceil(P.hp)), P.x, y + 8.5); cx.fillText(String(Math.ceil(P.hp)), P.x, y + 8.5);
  }
  function drawPickup(p) {
    var bob = Math.sin(p.t * 4) * 2;
    cx.save(); cx.translate(p.x, p.y + bob);
    if (p.kind === 'cash') {
      cx.fillStyle = 'rgba(0,0,0,.25)'; cx.fillRect(-9, -4, 20, 13);
      cx.fillStyle = '#55c768'; cx.fillRect(-10, -7, 20, 13); cx.strokeStyle = '#2a7a38'; cx.lineWidth = 1.5; cx.strokeRect(-10, -7, 20, 13);
      cx.fillStyle = '#2a7a38'; cx.font = 'bold 10px Arial'; cx.textAlign = 'center'; cx.fillText('$', 0, 3);
    } else if (p.kind === 'med') {
      cx.fillStyle = '#fff'; cx.fillRect(-11, -9, 22, 18); cx.strokeStyle = '#c4121b'; cx.lineWidth = 2; cx.strokeRect(-11, -9, 22, 18);
      cx.fillStyle = '#e63b3b'; cx.fillRect(-2.5, -7, 5, 14); cx.fillRect(-7, -2.5, 14, 5);
    } else {
      cx.rotate(p.t); cx.strokeStyle = '#9fe7ff'; cx.lineWidth = 3; cx.lineCap = 'round';
      for (var i = 0; i < 3; i++) { cx.rotate(PI / 3); cx.beginPath(); cx.moveTo(-13, 0); cx.lineTo(13, 0); cx.stroke(); }
      cx.fillStyle = '#e6f8ff'; cx.beginPath(); cx.arc(0, 0, 3.5, 0, TAU); cx.fill();
    }
    cx.restore();
  }
  function drawTarget() {
    if (!P.alive) return;
    var pts = [{ x: P.x, y: P.y }];
    if (P.path) for (var i = P.pi; i < P.path.length; i++) pts.push(P.path[i]);
    if (P.tgtE && P.tgtE.alive) pts.push({ x: P.tgtE.x, y: P.tgtE.y });
    if (pts.length > 1 && P.swing < 0) {
      cx.strokeStyle = '#ff9a1f'; cx.lineWidth = 3.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.setLineDash([9, 6]);
      cx.beginPath(); cx.moveTo(pts[0].x, pts[0].y); for (var j = 1; j < pts.length; j++) cx.lineTo(pts[j].x, pts[j].y); cx.stroke(); cx.setLineDash([]);
      var a = pts[pts.length - 1], b = pts[pts.length - 2], an = Math.atan2(a.y - b.y, a.x - b.x);
      if (!P.tgtE) { cx.fillStyle = '#ff9a1f'; cx.save(); cx.translate(a.x, a.y); cx.rotate(an); cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-6, -8); cx.lineTo(-6, 8); cx.closePath(); cx.fill(); cx.restore(); }
    }
    if (P.tgtE && P.tgtE.alive) {
      var e = P.tgtE; cx.fillStyle = '#ff9a1f';
      for (var k = 0; k < 3; k++) {
        var aa = elapsed * 2.2 + k * TAU / 3; cx.save(); cx.translate(e.x + Math.cos(aa) * 26, e.y + Math.sin(aa) * 26); cx.rotate(aa + PI / 2);
        cx.beginPath(); cx.moveTo(0, -7); cx.lineTo(7, 5); cx.lineTo(-7, 5); cx.closePath(); cx.fill(); cx.restore();
      }
    }
  }
  function drawHUD() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (hitFlash > 0) { cx.fillStyle = 'rgba(220,20,30,' + hitFlash * 1.1 + ')'; cx.fillRect(0, 0, W, H); }
    cx.textAlign = 'left'; cx.font = 'bold 14px Arial'; cx.lineWidth = 3.5; cx.strokeStyle = '#000'; cx.fillStyle = '#fff';
    var alive = enemies.filter(function (e) { return e.alive; }).length;
    function t(s, x, y) { cx.strokeText(s, x, y); cx.fillText(s, x, y); }
    t('Round ' + (roundNo + 1), 54, 24); t('Guard: ' + alive + '/' + roundTotal, 54, 43);
    cx.textAlign = 'right'; t('⏱ ' + Math.floor(timeLeft / 60) + ':' + ('0' + Math.floor(timeLeft % 60)).slice(-2), W - 12, 24); cx.fillStyle = '#ffd24a'; t('⭐ ' + score, W - 12, 43);
    if (frozen > 0) { cx.fillStyle = '#9fe7ff'; t('❄ ' + Math.ceil(frozen) + 's', W - 12, 62); }
    cx.textAlign = 'center';
    if (bannerT > 0) { cx.globalAlpha = clamp(bannerT, 0, 1); cx.font = 'bold 26px Arial'; cx.lineWidth = 5; cx.fillStyle = '#ffd24a'; t(bannerTxt, W / 2, H * 0.22); cx.globalAlpha = 1; }
    if (!P.alive) { cx.font = 'bold 22px Arial'; cx.fillStyle = '#fff'; t('Hero out! Wapas aa raha hai: ' + Math.max(1, Math.ceil(respawnT)), W / 2, H * 0.4); }
    else if (P.stuck > 0) { cx.font = 'bold 20px Arial'; cx.fillStyle = '#ff6b6b'; t('Hathoda atak gaya! Peeche se maaro', W / 2, H * 0.3); }
  }
  function render() {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#0b0d14'; cx.fillRect(0, 0, cv.width, cv.height);
    if (!P || !solid) return;
    drawWorld(); drawHUD();
  }

  // ---------- start / finish ----------
  function start() {
    Snd.unlock(); resetGame();
    $('menu').classList.add('hidden'); $('over').classList.add('hidden');
    state = 'play';
  }
  function finish() {
    if (state === 'over') return;
    state = 'over'; input.down = false; Snd.end();
    var fin = Math.min(C.SAVE_CAP, Math.floor(score));
    $('finalScore').textContent = String(Math.floor(score));
    $('finalStats').textContent = 'Guard mare: ' + kills + '   |   Round: ' + (roundNo + 1) + '   |   Cash: ' + cash;
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
    var raw = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    dtS += (raw - dtS) * 0.3;
    if (state === 'play') update(dtS);
    render();
  }

  // ---------- shuruaat ----------
  window.addEventListener('resize', function () { resize(); if (P) snapCam(); });
  calcSmart(); resize(); resetGame();
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  //@HOOK
  requestAnimationFrame(loop);
})();
