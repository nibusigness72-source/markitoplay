// traffic-racer.js - Traffic Racer (gadi ke andar se dikhne wala highway racing game)
// Phone ko lamba (horizontal) pakdo: tilt karke steering, daayi pedal = accelerator, baayi pedal = break

// ================= SETTINGS: yahan ke number badal kar game ko apne hisaab se bana sakte ho =================
var CONFIG = {
  GAME_TIME: 240,          // game ka time (second): 300 = 5 minute

  // ---- gadi ki speed (km/h) ----
  NORMAL_SPEED: 70,       // accelerator na dabao to gadi ki normal speed
  TOP_SPEED: 180,          // accelerator dabate raho to zyada se zyada itni speed tak jaayegi
  ACCEL: 30,               // accelerator dabane par har second itni speed badhegi (bada number = jaldi top speed par)
  RELEASE_DECEL: 30,       // accelerator chhodne par har second itni speed ghategi (normal speed tak)
  CRUISE_ACCEL: 35,        // speed normal se kam ho (break/takkar ke baad) to wapas normal tak har second itni badhegi
  BRAKE_DECEL: 120,        // break dabane par har second itni speed ghategi
  BARRIER_SLOW: 70,        // side ki railing se ragadne par har second itni speed ghategi
  BARRIER_MIN_SPEED: 40,   // railing se ragadne par speed isse neeche nahi jaayegi

  // ---- doosri gadiyan (traffic) ----
    TRAFFIC_COUNT: 10,       // aapko jitni door road dikhti hai, usmein kitni gadiyan (zyada = bheed)
  SPAWN_RANGE: 2,          // gadiyan dikhne ki seema se kitni guna door tak pehle se bani rahengi (2 = double door)
  TRAFFIC_MIN_SPEED: 40,   // doosri gadiyon ki sabse kam speed (km/h)
  TRAFFIC_MAX_SPEED: 90,   // doosri gadiyon ki sabse zyada speed (km/h)
  TRUCK_CHANCE: 0.15,      // kitni gadiyan bade truck hongi (0 = koi nahi, 0.5 = aadhi)

  // ---- point ----
  PASS_POINTS: 10,         // gadi se sata kar nikalne par kitne point
  PASS_GAP: 0.2,          // kitna paas se nikalna zaroori hai (bada number = thoda door se nikalo to bhi point)
  SAVE_CAP: 1000,          // ek baar mein zyada se zyada kitna score save hoga

  // ---- takkar ----
  CRASH_WAIT: 3,           // kisi ko thokne ke baad kitne second ruk kar phir chalu hoga
  SAFE_TIME: 2.5,         // phir se chalu hone ke baad itne second koi gadi nahi thok sakti

  // ---- steering ----
  CONTROL: 'auto',         // 'auto' = phone tilt (na ho to buttons) | 'tilt' = sirf tilt | 'buttons' = sirf screen ke tir
  TILT_FULL: 25,           // phone ko itne degree jhukao to steering poori ghoomegi (chhota number = zyada sensitive)
  TILT_DEADZONE: 2,        // itne degree tak jhukne par kuch nahi hoga (seedha chalega)
  STEER_SPEED: 2,        // gadi kitni tezi se side mein jaayegi (bada = zyada tez mudegi)
  WHEEL_DEG: 140,          // steering wheel screen par kitne degree ghoomega
  CURVE_PUSH: 0.3,         // mod par gadi bahar kitni khichti hai (0 = bilkul nahi, bada = zyada)
  CURVES: 0,               // road kitni ghumaavdaar (0 = seedhi road, 1 = normal, 2 = zyada mod)

  // ---- graphics ----
  DRAW_DISTANCE: 500,      // road kitni door tak dikhe (kam karoge to phone tez chalega, par gadiyan paas se nikalti dikhengi)
  MAX_DPR: 1.5             // screen ki saaf-pan (kam karoge to phone tez chalega, 1 se 2 ke beech rakho)
};
// ====================================================================================================

(function () {
  'use strict';
  var C = CONFIG, Snd = TrafficSound, GAME_ID = 'traffic-racer';
  var PI = Math.PI, TAU = PI * 2, D2R = PI / 180, R2D = 180 / PI;

  function $(id) { return document.getElementById(id); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var cv = $('game'), ctx = cv.getContext('2d'), wrap = $('wrap');
  var W = 100, H = 100, F = 50, HOR = 36, dpr = 1, portrait = false, LW = 100, LH = 100;

  // ---------- duniya ka naap ----------
  var SEG = 200, ROADW = 2000, CAMH = 330, DEPTH = 1 / Math.tan(50 * D2R);
  var RAIL_X = 1.12, UPS = 77.2;                       // 1 km/h = 77.2 world unit / second
  var LANE_X = [-0.75, -0.25, 0.25, 0.75];
  var PHX = 0.125;                                      // apni gadi ki aadhi chaudai
  var BARRIER_START = 0.93, X_LIMIT = 1.0;
  var N = 0, TRACK = 0, DRAW = 200, segs = [], fogA = [], fogS = [];

  // ---------- game ki halat ----------
  var state = 'menu';                                   // menu | play | crash | paused | over
  var P, cars = [], score, passes, crashes, topSpeed, timeLeft, crashT, invul, shake, flash, popups, scraping, clock = 0;
  var wheelAng = 0, steerIn = 0, rpm = 0, skyX = 0, crackSeed = [], lastTick = 0;
  var gasDown = false, brakeDown = false, keyDir = 0, steerBtn = 0, playT = 0;
  var tilt = { ok: false, deg: 0, zero: 0, t: 0, pending: false };
  var ptrs = {}, keys = {};

  // =====================================================================
  //                           ROAD (raasta)
  // =====================================================================
  function easeIn(a, b, p) { return a + (b - a) * p * p; }
  function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * PI) / 2) + 0.5); }

  function addSeg(curve) {
    var i = segs.length;
    segs.push({ i: i, curve: curve, alt: Math.floor(i / 3) % 2, scn: [],
                a: { z: i * SEG, cz: 0, sc: 0, sx: 0, sy: 0, sw: 0 }, b: { z: (i + 1) * SEG, cz: 0, sc: 0, sx: 0, sy: 0, sw: 0 }, vis: false });
  }
  function addSection(enter, hold, leave, curve) {
    var i;
    for (i = 0; i < enter; i++) addSeg(easeIn(0, curve, i / enter));
    for (i = 0; i < hold; i++) addSeg(curve);
    for (i = 0; i < leave; i++) addSeg(easeInOut(curve, 0, i / leave));
  }

  function buildTrack() {
    var k, mag, dir;
    segs = [];
    for (k = 0; k < 90; k++) addSeg(0);                            // shuru mein seedhi road
        var TARGET = Math.max(3000, Math.ceil(C.DRAW_DISTANCE * Math.max(1.2, C.SPAWN_RANGE) * 2.8));
    while (segs.length < TARGET) {
      if (Math.random() < 0.35) {
        for (k = 0, mag = ri(60) + 40; k < mag; k++) addSeg(0);
      } else {
        mag = [0.8, 1.5, 2.4][ri(3)] * C.CURVES;
        dir = Math.random() < 0.5 ? -1 : 1;
        addSection(30 + ri(20), 40 + ri(80), 30 + ri(20), dir * mag);
      }
    }
    N = segs.length; TRACK = N * SEG;
    // road ke kinare ke ped / patthar
    var i, s, side, r;
    for (i = 0; i < N; i++) {
      for (side = -1; side <= 1; side += 2) {
        if (i % 4 !== 0 && Math.random() > 0.16) continue;
        r = Math.random();
        if (r < 0.40) segs[i].scn.push({ t: 0, x: side * (1.45 + Math.random() * 3.5), w: 900 + Math.random() * 500 });
        else if (r < 0.68) segs[i].scn.push({ t: 1, x: side * (1.45 + Math.random() * 3.5), w: 1000 + Math.random() * 600 });
        else if (r < 0.82) segs[i].scn.push({ t: 2, x: side * (1.3 + Math.random() * 2.5), w: 500 + Math.random() * 300 });
        else if (r < 0.92) segs[i].scn.push({ t: 3, x: side * (1.4 + Math.random() * 3), w: 800 + Math.random() * 700 });
      }
    }
  }

  function findSeg(z) { return segs[Math.floor(z / SEG) % N]; }
  function relOf(z) {                                             // meri gadi se kitna aage (+) / peeche (-)
    var d = (z - P.z) % TRACK;
    if (d > TRACK / 2) d -= TRACK; else if (d < -TRACK / 2) d += TRACK;
    return d;
  }

  // =====================================================================
  //                 SPRITES (gadiyan, ped) - code se bani tasveeren
  // =====================================================================
  function shade(hex, p) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = p < 0 ? 0 : 255, q = Math.abs(p);
    return 'rgb(' + Math.round((t - r) * q + r) + ',' + Math.round((t - g) * q + g) + ',' + Math.round((t - b) * q + b) + ')';
  }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }

  function tyre(g, x, y, w, h) {
    var gr = g.createLinearGradient(x, y, x + w, y);
    gr.addColorStop(0, '#020202'); gr.addColorStop(0.18, '#1e1e20'); gr.addColorStop(0.5, '#34343a'); gr.addColorStop(0.82, '#1e1e20'); gr.addColorStop(1, '#020202');
    g.fillStyle = gr; rrect(g, x, y, w, h, w * 0.25); g.fill();
    g.save(); rrect(g, x, y, w, h, w * 0.25); g.clip();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(1, h * 0.025);
    for (var k = 1; k < 7; k++) { g.beginPath(); g.moveTo(x, y + h * k / 7); g.lineTo(x + w, y + h * k / 7 + h * 0.03); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + w * 0.42, y, w * 0.08, h);
    g.restore();
  }
  function tailLight(g, x, y, w, h, mirror, cx) {
    g.save();
    if (mirror) { g.translate(cx, 0); g.scale(-1, 1); g.translate(-cx, 0); }
    var gr = g.createLinearGradient(x, y, x + w, y);
    gr.addColorStop(0, '#7a0606'); gr.addColorStop(0.55, '#e11616'); gr.addColorStop(1, '#ff7b6b');
    g.shadowColor = 'rgba(255,40,30,.95)'; g.shadowBlur = h * 0.7;
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, y + h * 0.15); g.quadraticCurveTo(x + w * 0.5, y - h * 0.1, x + w, y); g.lineTo(x + w * 0.92, y + h); g.lineTo(x + w * 0.06, y + h * 0.92); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,230,210,.55)'; g.fillRect(x + w * 0.62, y + h * 0.18, w * 0.28, h * 0.22);
    g.fillStyle = 'rgba(40,0,0,.55)'; g.fillRect(x + w * 0.05, y + h * 0.55, w * 0.9, h * 0.07);
    g.restore();
  }
  function plate(g, cx, y, w, h) {
    g.fillStyle = '#f2f2ee'; rrect(g, cx - w / 2, y, w, h, 2); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#2a3a8a'; g.fillRect(cx - w / 2 + 1, y + 1, w * 0.09, h - 2);
    g.fillStyle = '#222';
    for (var i = 0; i < 6; i++) g.fillRect(cx - w * 0.34 + i * w * 0.115, y + h * 0.28, w * 0.07, h * 0.44);
  }

  // saadhaaran car (hatchback / sedan / sports / SUV): peeche se dikhne wala roop
  function drawPassenger(w, h, col, P) {
    var c = mk(w, h), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(w / 2, h * 0.975, w * 0.5, h * 0.05, 0, 0, TAU); g.fill();
    tyre(g, w * 0.07, h * 0.76, w * 0.17, h * 0.23); tyre(g, w * 0.76, h * 0.76, w * 0.17, h * 0.23);
    var lt = P.lowerTop, lb = P.lowerBot;
    // neeche ka body
    var lg = g.createLinearGradient(0, h * lt, 0, h * lb);
    lg.addColorStop(0, shade(col, 0.22)); lg.addColorStop(0.45, col); lg.addColorStop(1, shade(col, -0.5));
    g.fillStyle = lg; g.beginPath();
    g.moveTo(w * 0.07, h * lb); g.lineTo(w * 0.012, h * (lt + 0.17)); g.quadraticCurveTo(w * 0.008, h * lt, w * 0.11, h * (lt - 0.012));
    g.lineTo(w * 0.89, h * (lt - 0.012)); g.quadraticCurveTo(w * 0.992, h * lt, w * 0.988, h * (lt + 0.17)); g.lineTo(w * 0.93, h * lb); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
    // cabin (chhat + sheesha)
    var bw = P.cabinBotW / 2, tw = P.cabinTopW / 2, ct = P.cabinTop, cb = lt + 0.01;
    var cg = g.createLinearGradient(0, h * ct, 0, h * cb);
    cg.addColorStop(0, shade(col, 0.35)); cg.addColorStop(1, shade(col, 0.05));
    g.fillStyle = cg; g.beginPath();
    g.moveTo(w * (0.5 - bw), h * cb); g.lineTo(w * (0.5 - tw) - w * 0.012, h * (ct + 0.05));
    g.quadraticCurveTo(w * (0.5 - tw), h * ct, w * (0.5 - tw) + w * 0.05, h * ct);
    g.lineTo(w * (0.5 + tw) - w * 0.05, h * ct);
    g.quadraticCurveTo(w * (0.5 + tw), h * ct, w * (0.5 + tw) + w * 0.012, h * (ct + 0.05));
    g.lineTo(w * (0.5 + bw), h * cb); g.closePath(); g.fill(); g.stroke();
    // peeche ka sheesha
    var iw = bw - 0.04, itw = tw - 0.035, it = ct + P.glassTop, ib = cb - 0.03;
    var win = function () {
      g.beginPath(); g.moveTo(w * (0.5 - iw), h * ib); g.lineTo(w * (0.5 - itw), h * (it + 0.02));
      g.quadraticCurveTo(w * (0.5 - itw), h * it, w * (0.5 - itw) + w * 0.03, h * it);
      g.lineTo(w * (0.5 + itw) - w * 0.03, h * it); g.quadraticCurveTo(w * (0.5 + itw), h * it, w * (0.5 + itw), h * (it + 0.02));
      g.lineTo(w * (0.5 + iw), h * ib); g.closePath();
    };
    var wg = g.createLinearGradient(0, h * it, 0, h * ib);
    wg.addColorStop(0, '#2d4157'); wg.addColorStop(0.5, '#0f1822'); wg.addColorStop(1, '#070b10');
    g.fillStyle = wg; win(); g.fill();
    g.save(); win(); g.clip();
    g.fillStyle = 'rgba(255,190,130,.22)';
    g.beginPath(); g.moveTo(w * 0.28, h * it); g.lineTo(w * 0.40, h * it); g.lineTo(w * 0.30, h * ib); g.lineTo(w * 0.2, h * ib); g.fill();
    g.fillStyle = 'rgba(255,255,255,.1)';
    g.beginPath(); g.moveTo(w * 0.56, h * it); g.lineTo(w * 0.62, h * it); g.lineTo(w * 0.52, h * ib); g.lineTo(w * 0.46, h * ib); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2;                         // wiper
    g.beginPath(); g.moveTo(w * 0.32, h * (ib - 0.02)); g.lineTo(w * 0.52, h * (it + 0.05)); g.stroke();
    // peeche baithne wale ke sir ki parchhai
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(w * 0.45, h * (ib - 0.03), w * 0.05, h * 0.06, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w * 0.58, h * (ib - 0.03), w * 0.045, h * 0.055, 0, 0, TAU); g.fill();
    g.restore();
    // trunk ki line, light, number plate
    g.strokeStyle = 'rgba(0,0,0,.38)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(w * 0.1, h * (lt + 0.045)); g.lineTo(w * 0.9, h * (lt + 0.045)); g.stroke();
    tailLight(g, w * 0.03, h * (lt + 0.012), w * 0.22, h * P.tailH, false, w / 2);
    tailLight(g, w * 0.03, h * (lt + 0.012), w * 0.22, h * P.tailH, true, w / 2);
    // bumper
    var bg = g.createLinearGradient(0, h * (lb - 0.14), 0, h * lb);
    bg.addColorStop(0, '#34363b'); bg.addColorStop(1, '#0d0e10');
    g.fillStyle = bg; g.beginPath();
    g.moveTo(w * 0.045, h * (lb - 0.1)); g.lineTo(w * 0.955, h * (lb - 0.1)); g.lineTo(w * 0.935, h * (lb + 0.01)); g.lineTo(w * 0.065, h * (lb + 0.01)); g.closePath(); g.fill();
    plate(g, w * 0.5, h * (lt + 0.15), w * 0.25, h * 0.085);
    g.fillStyle = 'rgba(255,150,40,.9)'; g.fillRect(w * 0.09, h * (lb - 0.07), w * 0.045, h * 0.03); g.fillRect(w * 0.865, h * (lb - 0.07), w * 0.045, h * 0.03);
    var eg = g.createLinearGradient(0, 0, w, 0); eg.addColorStop(0, '#888'); eg.addColorStop(0.5, '#eee'); eg.addColorStop(1, '#777');
    g.fillStyle = eg; g.beginPath(); g.ellipse(w * 0.79, h * (lb - 0.025), w * 0.05, h * 0.03, 0, 0, TAU); g.fill();
    g.fillStyle = '#050505'; g.beginPath(); g.ellipse(w * 0.79, h * (lb - 0.025), w * 0.034, h * 0.02, 0, 0, TAU); g.fill();
    // chamak (gloss)
    var gl = g.createLinearGradient(0, h * lt, 0, h * (lt + 0.15));
    gl.addColorStop(0, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(w * 0.08, h * lt, w * 0.84, h * 0.12);
    return c;
  }

  // van (bada dabba)
  function drawVan(w, h, col) {
    var c = mk(w, h), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(w / 2, h * 0.975, w * 0.5, h * 0.045, 0, 0, TAU); g.fill();
    tyre(g, w * 0.08, h * 0.78, w * 0.16, h * 0.21); tyre(g, w * 0.76, h * 0.78, w * 0.16, h * 0.21);
    var bg = g.createLinearGradient(0, 0, 0, h * 0.82);
    bg.addColorStop(0, shade(col, 0.3)); bg.addColorStop(0.5, col); bg.addColorStop(1, shade(col, -0.4));
    g.fillStyle = bg; rrect(g, w * 0.04, h * 0.04, w * 0.92, h * 0.78, w * 0.07); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
    // do darwaze
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(w * 0.5, h * 0.06); g.lineTo(w * 0.5, h * 0.7); g.stroke();
    // khidkiyan
    var wg = g.createLinearGradient(0, h * 0.09, 0, h * 0.34); wg.addColorStop(0, '#2a3d52'); wg.addColorStop(1, '#0a1119');
    g.fillStyle = wg; rrect(g, w * 0.1, h * 0.09, w * 0.36, h * 0.26, 6); g.fill(); rrect(g, w * 0.54, h * 0.09, w * 0.36, h * 0.26, 6); g.fill();
    g.fillStyle = 'rgba(255,190,130,.2)'; g.beginPath(); g.moveTo(w * 0.15, h * 0.09); g.lineTo(w * 0.25, h * 0.09); g.lineTo(w * 0.17, h * 0.35); g.lineTo(w * 0.1, h * 0.35); g.fill();
    // lights
    var tl = function (x) {
      var gr = g.createLinearGradient(x, 0, x + w * 0.06, 0); gr.addColorStop(0, '#8a0a0a'); gr.addColorStop(1, '#ff4a3a');
      g.shadowColor = 'rgba(255,40,30,.9)'; g.shadowBlur = 10; g.fillStyle = gr; rrect(g, x, h * 0.4, w * 0.06, h * 0.2, 3); g.fill(); g.shadowBlur = 0;
    };
    tl(w * 0.055); tl(w * 0.885);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(w * 0.1, h * 0.38, w * 0.8, h * 0.012);
    var bb = g.createLinearGradient(0, h * 0.7, 0, h * 0.84); bb.addColorStop(0, '#3a3c40'); bb.addColorStop(1, '#0d0e10');
    g.fillStyle = bb; g.fillRect(w * 0.05, h * 0.7, w * 0.9, h * 0.12);
    plate(g, w * 0.5, h * 0.55, w * 0.24, h * 0.075);
    return c;
  }

  // truck (bada dabba trailer)
  function drawTruck(w, h, col, variant) {
    var c = mk(w, h), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(w / 2, h * 0.975, w * 0.52, h * 0.04, 0, 0, TAU); g.fill();
    tyre(g, w * 0.05, h * 0.76, w * 0.2, h * 0.23); tyre(g, w * 0.75, h * 0.76, w * 0.2, h * 0.23);
    g.fillStyle = '#1c1d20'; g.fillRect(w * 0.1, h * 0.7, w * 0.8, h * 0.14);          // chassis
    var bg = g.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, shade(col, -0.18)); bg.addColorStop(0.2, col); bg.addColorStop(0.8, col); bg.addColorStop(1, shade(col, -0.22));
    g.fillStyle = bg; rrect(g, w * 0.03, h * 0.02, w * 0.94, h * 0.66, 5); g.fill();   // dabba
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;                                  // sheet ki patliyan
    for (var i = 1; i < 12; i++) { g.beginPath(); g.moveTo(w * (0.03 + i * 0.0783), h * 0.03); g.lineTo(w * (0.03 + i * 0.0783), h * 0.67); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2;                                  // darwaza
    g.beginPath(); g.moveTo(w * 0.5, h * 0.03); g.lineTo(w * 0.5, h * 0.67); g.stroke();
    g.fillStyle = 'rgba(120,120,125,.9)'; g.fillRect(w * 0.47, h * 0.3, w * 0.012, h * 0.16); g.fillRect(w * 0.52, h * 0.3, w * 0.012, h * 0.16);
    var cols = [['#d32f2f', '#ffffff'], ['#1565c0', '#ffd54f'], ['#2e7d32', '#ffffff']][variant % 3];   // kampani ki patti
    g.fillStyle = cols[0]; g.fillRect(w * 0.03, h * 0.12, w * 0.94, h * 0.07);
    g.fillStyle = cols[1]; g.fillRect(w * 0.03, h * 0.19, w * 0.94, h * 0.02);
    for (i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#e31b1b' : '#f5f5f5'; g.fillRect(w * (0.06 + i * 0.0745), h * 0.6, w * 0.0745, h * 0.04); }   // reflector tape
    // lights, bumper, plate
    var tl = function (x) {
      var gr = g.createLinearGradient(x, 0, x + w * 0.05, 0); gr.addColorStop(0, '#7a0808'); gr.addColorStop(1, '#ff4030');
      g.shadowColor = 'rgba(255,40,30,.9)'; g.shadowBlur = 10; g.fillStyle = gr; rrect(g, x, h * 0.48, w * 0.05, h * 0.09, 2); g.fill(); g.shadowBlur = 0;
    };
    tl(w * 0.05); tl(w * 0.9);
    var bb = g.createLinearGradient(0, h * 0.72, 0, h * 0.8); bb.addColorStop(0, '#9a9da3'); bb.addColorStop(1, '#3a3c40');
    g.fillStyle = bb; g.fillRect(w * 0.08, h * 0.72, w * 0.84, h * 0.06);
    plate(g, w * 0.5, h * 0.62, w * 0.18, h * 0.05);
    g.fillStyle = '#0b0b0c'; g.fillRect(w * 0.08, h * 0.82, w * 0.12, h * 0.12); g.fillRect(w * 0.8, h * 0.82, w * 0.12, h * 0.12);   // mudflap
    return c;
  }
var TYPES = [
    { id: 'hatch', mw: 486, len: 1150, ar: 0.80, P: { lowerTop: 0.5, lowerBot: 0.86, cabinTop: 0.07, cabinTopW: 0.56, cabinBotW: 0.78, glassTop: 0.045, tailH: 0.12 } },
    { id: 'sedan', mw: 514, len: 1250, ar: 0.72, P: { lowerTop: 0.5, lowerBot: 0.86, cabinTop: 0.12, cabinTopW: 0.5, cabinBotW: 0.7, glassTop: 0.05, tailH: 0.12 } },
    { id: 'suv', mw: 546, len: 1250, ar: 0.93, P: { lowerTop: 0.5, lowerBot: 0.87, cabinTop: 0.05, cabinTopW: 0.66, cabinBotW: 0.8, glassTop: 0.06, tailH: 0.2 } },
    { id: 'sport', mw: 520, len: 1200, ar: 0.62, P: { lowerTop: 0.47, lowerBot: 0.86, cabinTop: 0.14, cabinTopW: 0.5, cabinBotW: 0.8, glassTop: 0.04, tailH: 0.12 } },
    { id: 'van', mw: 560, len: 1300, ar: 1.04 },
    { id: 'truck', mw: 700, len: 1800, ar: 1.2 }
  ];
  var CAR_COLORS = ['#d62828', '#f1f1f1', '#c0c4c9', '#1b1b1d', '#1f5fbf', '#e9b307', '#2b8a3e', '#7a3b1e', '#ff7a00', '#5a6068', '#8e24aa'];
  var carCache = {};

  function carSprite(type, col, variant) {
    var key = type.id + col + variant;
    if (carCache[key]) return carCache[key];
    var w = 260, h = Math.round(w * type.ar), c;
    if (type.id === 'van') c = drawVan(w, h, col);
    else if (type.id === 'truck') c = drawTruck(w, h, col, variant);
    else c = drawPassenger(w, h, col, type.P);
    carCache[key] = c;
    return c;
  }

  // ped / patthar
  var SC = [];
  function buildScenery() {
    var c, g, i, k;
    // 0: chir (pine)
    c = mk(128, 200); g = c.getContext('2d');
    g.fillStyle = '#4a2f1a'; g.fillRect(58, 160, 12, 40);
    for (i = 0; i < 4; i++) {
      var y0 = 8 + i * 36, hw = 30 + i * 11;
      var gr = g.createLinearGradient(64 - hw, 0, 64 + hw, 0);
      gr.addColorStop(0, '#143d22'); gr.addColorStop(0.6, '#25663a'); gr.addColorStop(1, '#3b8a4a');
      g.fillStyle = gr; g.beginPath(); g.moveTo(64, y0); g.lineTo(64 + hw, y0 + 56); g.lineTo(64 - hw, y0 + 56); g.closePath(); g.fill();
    }
    SC[0] = c;
    // 1: paturi ka ped (orange / lal)
    c = mk(160, 190); g = c.getContext('2d');
    g.fillStyle = '#4b3220'; g.beginPath(); g.moveTo(72, 190); g.lineTo(76, 100); g.lineTo(88, 100); g.lineTo(92, 190); g.fill();
    var autumn = ['#c4511a', '#e07b1f', '#f0a82a', '#b73a1c', '#e8c23a'];
    for (i = 0; i < 16; i++) {
      var a = Math.random() * TAU, d = Math.random() * 42, r = 22 + Math.random() * 18;
      g.fillStyle = autumn[ri(autumn.length)];
      g.beginPath(); g.arc(80 + Math.cos(a) * d, 72 + Math.sin(a) * d * 0.8, r, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(80, 108, 62, 18, 0, 0, TAU); g.fill();
    SC[1] = c;
    // 2: jhaadi
    c = mk(96, 60); g = c.getContext('2d');
    var bush = ['#2d5a22', '#3f7a2c', '#6b8a2a'];
    for (i = 0; i < 6; i++) { g.fillStyle = bush[ri(3)]; g.beginPath(); g.arc(18 + i * 12, 38 - Math.random() * 8, 14 + Math.random() * 6, 0, TAU); g.fill(); }
    SC[2] = c;
    // 3: patthar / pahaadi
    c = mk(160, 120); g = c.getContext('2d');
    g.fillStyle = '#7a4a26'; g.beginPath(); g.moveTo(4, 118); g.lineTo(20, 52); g.lineTo(52, 18); g.lineTo(90, 30); g.lineTo(128, 10); g.lineTo(156, 70); g.lineTo(156, 118); g.closePath(); g.fill();
    g.fillStyle = '#b8782f'; g.beginPath(); g.moveTo(20, 52); g.lineTo(52, 18); g.lineTo(90, 30); g.lineTo(70, 76); g.lineTo(30, 90); g.closePath(); g.fill();
    g.fillStyle = '#d9a04a'; g.beginPath(); g.moveTo(52, 18); g.lineTo(90, 30); g.lineTo(80, 50); g.lineTo(54, 44); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(90, 30); g.lineTo(128, 10); g.lineTo(156, 70); g.lineTo(110, 90); g.closePath(); g.fill();
    SC[3] = c;
  }

  // aasmaan + door ki pahaadiyan
  var skyC = null, hillC = null;
  function buildSky() {
    var g, i, x, y, gr;
    skyC = mk(W, HOR + 2); g = skyC.getContext('2d');
    gr = g.createLinearGradient(0, 0, 0, HOR);
    gr.addColorStop(0, '#3f4684'); gr.addColorStop(0.35, '#a1548a'); gr.addColorStop(0.6, '#ef8a4a'); gr.addColorStop(1, '#ffc884');
    g.fillStyle = gr; g.fillRect(0, 0, W, HOR + 2);
    // badal
    for (i = 0; i < 9; i++) {
      x = Math.random() * W; y = HOR * (0.15 + Math.random() * 0.5);
      g.fillStyle = 'rgba(255,170,150,' + (0.1 + Math.random() * 0.15) + ')';
      g.beginPath(); g.ellipse(x, y, W * (0.06 + Math.random() * 0.1), HOR * 0.025, 0, 0, TAU); g.fill();
    }
    // suraj
    var sx = W * 0.56, sy = HOR * 0.78, sr = Math.max(8, H * 0.06);
    gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
    gr.addColorStop(0, 'rgba(255,245,200,.95)'); gr.addColorStop(0.15, 'rgba(255,220,140,.7)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, HOR + 2);
    g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    // pahaadiyan (do parat) - chaudai 2W taaki ghoom sake
    hillC = mk(W * 2, Math.round(HOR * 0.5)); g = hillC.getContext('2d');
    var layers = [['#6d4a73', 0.55, 0.012], ['#4a3350', 0.38, 0.02], ['#2d2233', 0.22, 0.03]], l, hh = hillC.height;
    for (l = 0; l < layers.length; l++) {
      g.fillStyle = layers[l][0]; g.beginPath(); g.moveTo(0, hh);
      var ph1 = Math.random() * 9, ph2 = Math.random() * 9;
      for (x = 0; x <= W * 2; x += 6) {
        var t = x / (W * 2) * TAU * 2;      // 2 poore chakkar: do sire mel khayenge
        y = hh * (1 - layers[l][1]) - Math.sin(t * 1 + ph1) * hh * 0.12 - Math.sin(t * 2.5 + ph2) * hh * 0.07 - Math.sin(t * 6 + ph1) * hh * 0.03;
        g.lineTo(x, y);
      }
      g.lineTo(W * 2, hh); g.closePath(); g.fill();
    }
    // door ke chhote ped (ridge par)
    g.fillStyle = '#1d1a25';
    for (i = 0; i < 160; i++) {
      x = Math.random() * W * 2; var th = hh * (0.08 + Math.random() * 0.08);
      g.beginPath(); g.moveTo(x, hh * 0.9); g.lineTo(x + th * 0.18, hh * 0.9 - th); g.lineTo(x - th * 0.18, hh * 0.9 - th); g.fill();
    }
  }

  // =====================================================================
  //                    GADI KA ANDAR (cockpit)
  // =====================================================================
  var cock = null;
  function buildCockpit() {
    cock = mk(W, H);
    var g = cock.getContext('2d'), gr, i;
    g.scale(W / 1000, H / 450);

    // chhat (upar ki patti) - photo jaisa: baayen side thoda neecha, daayen taraf poora khula kaanch
    gr = g.createLinearGradient(0, 0, 0, 40); gr.addColorStop(0, '#060607'); gr.addColorStop(1, '#2a2a2e');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(1000, 0); g.lineTo(1000, 30); g.quadraticCurveTo(700, 40, 352, 38); g.lineTo(0, 20); g.closePath(); g.fill();
    g.strokeStyle = '#46484e'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 20); g.lineTo(352, 38); g.quadraticCurveTo(700, 40, 1000, 30); g.stroke();

    // baayi A-pillar (patli, tirchhi)
    gr = g.createLinearGradient(284, 0, 372, 0); gr.addColorStop(0, '#111113'); gr.addColorStop(0.55, '#2b2c30'); gr.addColorStop(1, '#0d0d0f');
    g.fillStyle = gr; poly(g, [[334, 34], [372, 38], [336, 224], [284, 224]]); g.fill();
    g.strokeStyle = '#52555b'; g.lineWidth = 2; g.beginPath(); g.moveTo(372, 38); g.lineTo(336, 224); g.stroke();

    // baayi darwaza (khidki ke neeche)
    gr = g.createLinearGradient(0, 230, 0, 450); gr.addColorStop(0, '#2f3135'); gr.addColorStop(0.3, '#212225'); gr.addColorStop(1, '#0e0e10');
    g.fillStyle = gr; poly(g, [[0, 326], [286, 232], [286, 450], [0, 450]]); g.fill();
    g.strokeStyle = '#6a6d73'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 326); g.lineTo(286, 232); g.stroke();
    g.strokeStyle = 'rgba(210,214,220,.35)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 410); g.lineTo(240, 300); g.stroke();   // chandi ki patti
    g.fillStyle = '#2a2b2e'; rrect(g, 0, 380, 215, 46, 12); g.fill();                   // armrest
    g.fillStyle = '#3b3d41'; rrect(g, 8, 384, 198, 6, 3); g.fill();

    // dashboard (daayen taraf zara neeche dhalta hai)
    gr = g.createLinearGradient(0, 205, 0, 450); gr.addColorStop(0, '#2b2c30'); gr.addColorStop(0.16, '#1c1d20'); gr.addColorStop(1, '#09090a');
    g.fillStyle = gr; g.beginPath(); g.moveTo(262, 232); g.lineTo(336, 222); g.quadraticCurveTo(560, 206, 1000, 238); g.lineTo(1000, 450); g.lineTo(262, 450); g.closePath(); g.fill();
    g.strokeStyle = '#62656b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(336, 222); g.quadraticCurveTo(560, 206, 1000, 238); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 6; g.beginPath(); g.moveTo(342, 230); g.quadraticCurveTo(560, 214, 990, 246); g.stroke();

    g.save(); g.translate(0, 40);
    // instrument ka hood
    gr = g.createLinearGradient(0, 176, 0, 232); gr.addColorStop(0, '#2c2d30'); gr.addColorStop(1, '#050506');
    g.fillStyle = gr; g.beginPath(); g.moveTo(372, 226); g.quadraticCurveTo(372, 184, 420, 182); g.lineTo(612, 182); g.quadraticCurveTo(658, 184, 658, 226); g.closePath(); g.fill();
    g.strokeStyle = '#55585e'; g.lineWidth = 2; g.beginPath(); g.moveTo(376, 214); g.quadraticCurveTo(378, 186, 420, 185); g.lineTo(612, 185); g.stroke();
    g.fillStyle = '#060607'; rrect(g, 382, 218, 252, 70, 26); g.fill();

    // do dial (speed, rpm)
    var dials = [[428, 252], [586, 252]];
    for (i = 0; i < 2; i++) {
      var dx = dials[i][0], dy = dials[i][1], k;
      var dg = g.createRadialGradient(dx, dy - 6, 2, dx, dy, 36); dg.addColorStop(0, '#222831'); dg.addColorStop(1, '#07090c');
      g.fillStyle = dg; g.beginPath(); g.arc(dx, dy, 35, 0, TAU); g.fill();
      g.strokeStyle = '#8a8d93'; g.lineWidth = 2.5; g.beginPath(); g.arc(dx, dy, 35, 0, TAU); g.stroke();
      for (k = 0; k <= 20; k++) {
        var a = (-225 + k * 13.5) * D2R, long = k % 2 === 0;
        g.strokeStyle = (i === 1 && k > 16) ? '#ff3b30' : '#d9dde3'; g.lineWidth = long ? 1.6 : 0.8;
        g.beginPath(); g.moveTo(dx + Math.cos(a) * (long ? 26 : 29), dy + Math.sin(a) * (long ? 26 : 29)); g.lineTo(dx + Math.cos(a) * 33, dy + Math.sin(a) * 33); g.stroke();
      }
      g.fillStyle = '#9fe8ff'; g.font = 'bold 6px Arial'; g.textAlign = 'center';
      g.fillText(i === 0 ? 'km/h' : 'x1000', dx, dy + 21);
    }
    g.fillStyle = '#10212e'; rrect(g, 468, 234, 78, 36, 4); g.fill();                    // beech ka chhota screen
    g.fillStyle = '#42d6ff'; g.font = 'bold 6px Arial'; g.textAlign = 'center'; g.fillText('DRIVE', 507, 250); g.fillStyle = '#7a8a96'; g.fillText('Speed  Km/h', 507, 262);

    g.restore();
    // daayi taraf ka console (screen + buttons), champagne rang ki patti ke saath
    gr = g.createLinearGradient(0, 250, 0, 410); gr.addColorStop(0, '#2a2b2f'); gr.addColorStop(1, '#0f1012');
    g.fillStyle = gr; poly(g, [[668, 262], [832, 262], [842, 396], [684, 412]]); g.fill();
    g.strokeStyle = '#cdc6b0'; g.lineWidth = 3; g.stroke();
    var sg = g.createLinearGradient(0, 270, 0, 330); sg.addColorStop(0, '#0a1620'); sg.addColorStop(1, '#030507');
    g.fillStyle = sg; rrect(g, 700, 274, 112, 56, 4); g.fill();
    g.strokeStyle = '#8f8a7a'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.06)'; poly(g, [[700, 274], [740, 274], [706, 330], [700, 330]]); g.fill();
    g.fillStyle = '#e53935'; poly(g, [[758, 346], [772, 368], [744, 368]]); g.fill();    // hazard
    for (i = 0; i < 6; i++) { g.fillStyle = '#3a3c41'; rrect(g, 700 + i * 19, 342, 14, 9, 2); g.fill(); }
    g.fillStyle = '#cfd2d6'; g.beginPath(); g.arc(716, 380, 9, 0, TAU); g.fill(); g.beginPath(); g.arc(808, 378, 9, 0, TAU); g.fill();
    g.fillStyle = '#2a2b2f'; g.beginPath(); g.arc(716, 380, 5.5, 0, TAU); g.fill(); g.beginPath(); g.arc(808, 378, 5.5, 0, TAU); g.fill();

    // baayi vent
    g.fillStyle = '#0a0a0b'; g.beginPath(); g.ellipse(300, 262, 20, 11, -0.1, 0, TAU); g.fill();
    g.strokeStyle = '#4a4c52'; g.lineWidth = 2; g.stroke();

    // baayi side-mirror
    gr = g.createLinearGradient(0, 200, 0, 330); gr.addColorStop(0, '#252628'); gr.addColorStop(1, '#0c0c0d');
    g.fillStyle = gr; rrect(g, 26, 202, 202, 126, 46); g.fill();
    g.strokeStyle = '#8c8f95'; g.lineWidth = 2; g.stroke();
    var mg = g.createLinearGradient(0, 212, 0, 318);
    mg.addColorStop(0, '#b4784d'); mg.addColorStop(0.45, '#8a6a74'); mg.addColorStop(0.55, '#5b5d66'); mg.addColorStop(1, '#2b2c30');
    g.fillStyle = mg; rrect(g, 40, 212, 176, 106, 38); g.fill();
    g.save(); rrect(g, 40, 212, 176, 106, 38); g.clip();
    g.strokeStyle = 'rgba(235,238,242,.75)'; g.lineWidth = 7; g.beginPath(); g.moveTo(40, 292); g.lineTo(216, 258); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.1)'; poly(g, [[60, 212], [110, 212], [70, 318], [40, 318]]); g.fill();
    g.restore();
    // headlight ka nishaan
    g.strokeStyle = '#d7dadd'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(64, 256, 9, 7, 0, 0, TAU); g.stroke();
    for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(44, 252 + i * 4); g.lineTo(54, 252 + i * 4); g.stroke(); }

    // rear-view mirror
    gr = g.createLinearGradient(0, 80, 0, 150); gr.addColorStop(0, '#2a2b2e'); gr.addColorStop(1, '#0a0a0b');
    g.fillStyle = '#17171a'; poly(g, [[856, 0], [892, 0], [888, 84], [860, 84]]); g.fill();
    g.fillStyle = gr; g.beginPath(); g.moveTo(742, 112); g.quadraticCurveTo(742, 82, 790, 82); g.lineTo(972, 82); g.quadraticCurveTo(1000, 84, 1000, 112); g.quadraticCurveTo(1000, 146, 960, 148); g.lineTo(790, 148); g.quadraticCurveTo(742, 148, 742, 112); g.closePath(); g.fill();
    g.strokeStyle = '#5b5e64'; g.lineWidth = 2; g.stroke();
    var rg = g.createLinearGradient(0, 90, 0, 142); rg.addColorStop(0, '#4a3a3a'); rg.addColorStop(0.5, '#25222a'); rg.addColorStop(1, '#101014');
    g.fillStyle = rg; g.beginPath(); g.moveTo(752, 112); g.quadraticCurveTo(752, 92, 792, 91); g.lineTo(968, 91); g.quadraticCurveTo(992, 92, 992, 112); g.quadraticCurveTo(992, 140, 960, 141); g.lineTo(792, 141); g.quadraticCurveTo(752, 140, 752, 112); g.closePath(); g.fill();

        // ---- REAL LOOK: dashboard ka grain, silai, dial ki chamak, LED ----
    g.save(); g.beginPath(); g.moveTo(262, 232); g.lineTo(336, 222); g.quadraticCurveTo(560, 206, 1000, 238); g.lineTo(1000, 450); g.lineTo(262, 450); g.closePath(); g.clip();
    for (i = 0; i < 2600; i++) {
      var gx = 262 + (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * 738, gy = 210 + (((Math.sin(i * 78.233) * 12543.123) % 1) + 1) % 1 * 240;
      if (gx > 372 && gx < 660 && gy < 335) continue;
      g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)'; g.fillRect(gx, gy, 1.2, 1.2);
    }
    g.restore();
    g.setLineDash([6, 5]); g.strokeStyle = 'rgba(205,198,176,.55)'; g.lineWidth = 1.3;
    rrect(g, 6, 386, 203, 34, 8); g.stroke();
    g.setLineDash([]);
    g.save(); g.shadowColor = 'rgba(255,120,40,.9)'; g.shadowBlur = 8; g.strokeStyle = 'rgba(255,140,60,.55)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(690, 232); g.quadraticCurveTo(850, 226, 1000, 250); g.stroke(); g.restore();
    g.save(); g.translate(0, 40);
    for (i = 0; i < 2; i++) {
      var qx = i ? 586 : 428, qy = 252;
      var gl = g.createRadialGradient(qx, qy, 8, qx, qy, 40); gl.addColorStop(0, 'rgba(120,200,255,.10)'); gl.addColorStop(1, 'rgba(120,200,255,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(qx, qy, 40, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.ellipse(qx - 8, qy - 16, 22, 9, -0.5, 0, TAU); g.fill();
      g.strokeStyle = '#c9ccd1'; g.lineWidth = 1; g.beginPath(); g.arc(qx, qy, 37.5, 0, TAU); g.stroke();
    }
    g.restore();
// kaanch par halki chamak + kinaaron ka andhera (vignette)
    g.fillStyle = 'rgba(255,255,255,.045)'; poly(g, [[360, 24], [470, 24], [400, 214], [330, 214]]); g.fill();
    var vg = g.createRadialGradient(500, 200, 180, 500, 220, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
    g.fillStyle = vg; g.fillRect(0, 0, 1000, 450);
  }

  // =====================================================================
  //                         DRAW (road + gadiyan)
  // =====================================================================
  function quad(x1, y1, x2, y2, x3, y3, x4, y4, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
  }
  function proj(p, camX, camZ) {
    var cz = p.z - camZ, sc = DEPTH / (cz > 1 ? cz : 1);
    p.cz = cz; p.sc = sc;
    p.sx = Math.round(W / 2 + sc * (-camX) * F);
    p.sy = Math.round(HOR + sc * CAMH * F);
    p.sw = Math.round(sc * ROADW * F);
  }

  var GRASS = ['#c9a444', '#bd9838'], SHOULD = '#6f6c66', ROAD = ['#505054', '#4b4b4f'];
  var buckets = [];

  function drawWorld() {
    var bi = Math.floor(P.z / SEG) % N, base = segs[bi], bp = (P.z % SEG) / SEG;
    var dx = -(base.curve * bp), x = 0, camX = P.x * ROADW, n, seg, a, b, idx, cz, looped, al;
    // aasmaan
    ctx.drawImage(skyC, 0, 0);
    var hh = hillC.height, off = ((skyX % W) + W) % W;
    ctx.drawImage(hillC, off, 0, W, hh, 0, HOR - hh + 2, W, hh);
    // zameen ka base rang
    ctx.fillStyle = GRASS[0]; ctx.fillRect(0, HOR, W, H - HOR);
    for (n = 0; n < DRAW; n++) buckets[n] = null;

    for (n = 0; n < DRAW; n++) {
      idx = (bi + n) % N; seg = segs[idx]; looped = idx < bi;
      cz = P.z - (looped ? TRACK : 0);
      proj(seg.a, camX - x, cz); proj(seg.b, camX - x - dx, cz);
      x += dx; dx += seg.curve;
      a = seg.a; b = seg.b;
      seg.vis = !(a.cz <= DEPTH * 1.2 || b.sy >= a.sy);
      if (!seg.vis) continue;
      var x1 = a.sx, y1 = a.sy, w1 = a.sw, x2 = b.sx, y2 = b.sy, w2 = b.sw, alt = seg.alt, s;
      ctx.fillStyle = GRASS[alt]; ctx.fillRect(0, y2, W, y1 - y2 + 1);
      quad(x1 - w1 * RAIL_X, y1 + 1, x1 - w1, y1 + 1, x2 - w2, y2, x2 - w2 * RAIL_X, y2, SHOULD);
      quad(x1 + w1, y1 + 1, x1 + w1 * RAIL_X, y1 + 1, x2 + w2 * RAIL_X, y2, x2 + w2, y2, SHOULD);
      quad(x1 - w1, y1 + 1, x1 + w1, y1 + 1, x2 + w2, y2, x2 - w2, y2, ROAD[alt]);
      quad(x1 - w1 * 0.985, y1 + 1, x1 - w1 * 0.95, y1 + 1, x2 - w2 * 0.95, y2, x2 - w2 * 0.985, y2, '#e8e8e4');
      quad(x1 + w1 * 0.95, y1 + 1, x1 + w1 * 0.985, y1 + 1, x2 + w2 * 0.985, y2, x2 + w2 * 0.95, y2, '#e8e8e4');
      if (alt) {
        for (s = -0.5; s <= 0.5; s += 0.5) quad(x1 + w1 * (s - 0.012), y1 + 1, x1 + w1 * (s + 0.012), y1 + 1, x2 + w2 * (s + 0.012), y2, x2 + w2 * (s - 0.012), y2, '#eeeeea');
      }
      if (fogA[n] > 0.004) { ctx.fillStyle = fogS[n]; ctx.fillRect(0, y2, W, y1 - y2 + 1); }
    }

    // gadiyan ko unke segment mein daalo
    var i, c, rel, si, nn;
    for (i = 0; i < cars.length; i++) {
      c = cars[i]; rel = relOf(c.z);
      if (rel < SEG * 2 || rel > DRAW * SEG) continue;
      si = Math.floor(c.z / SEG) % N; nn = (si - bi + N) % N;
      if (nn >= DRAW) continue;
      (buckets[nn] = buckets[nn] || []).push(c);
    }

    // door se paas: ped, gadiyan
    for (n = DRAW - 1; n >= 0; n--) {
      seg = segs[(bi + n) % N];
    
      a = seg.a; b = seg.b;
        al = 1 - fogA[n];
      if (a.cz <= DEPTH * 1.2 || al < 0.01) continue;
      var j, it, spr, pw2, ph, sxp;
      // railing (dono taraf) - door se paas ki taraf banti hai taaki aage wali zameen use na dhake
      ctx.globalAlpha = al;
      var x1 = a.sx, y1 = a.sy, w1 = a.sw, x2 = b.sx, y2 = b.sy, w2 = b.sw, alt = seg.alt;
      var s1 = a.sc * F, s2 = b.sc * F, side, xr1, xr2;
              if (s1 * 255 < 0.6) break;
      for (side = -1; side <= 1; side += 2) {
        xr1 = x1 + side * w1 * RAIL_X; xr2 = x2 + side * w2 * RAIL_X;
                if (n > 160) { quad(xr1, y1 - s1 * 80, xr2, y2 - s2 * 80, xr2, y2 - s2 * 255, xr1, y1 - s1 * 255, '#d3d7dc'); continue; }
        quad(xr1, y1 - s1 * 80, xr2, y2 - s2 * 80, xr2, y2 - s2 * 150, xr1, y1 - s1 * 150, alt ? '#a9aeb5' : '#9aa0a8');
        quad(xr1, y1 - s1 * 150, xr2, y2 - s2 * 150, xr2, y2 - s2 * 255, xr1, y1 - s1 * 255, alt ? '#e9ecf0' : '#d8dce1');
        quad(xr1, y1 - s1 * 146, xr2, y2 - s2 * 146, xr2, y2 - s2 * 158, xr1, y1 - s1 * 158, '#757a82');
        quad(xr1, y1 - s1 * 244, xr2, y2 - s2 * 244, xr2, y2 - s2 * 255, xr1, y1 - s1 * 255, '#ffffff');
        if (seg.i % 4 === 0) { var pw = s1 * 40; quad(xr1 - pw, y1, xr1 + pw, y1, xr1 + pw, y1 - s1 * 250, xr1 - pw, y1 - s1 * 250, '#e4e6e9'); }
      }
      for (j = 0; j < seg.scn.length; j++) {
        it = seg.scn[j]; spr = SC[it.t];
        pw2 = a.sc * it.w * F; ph = pw2 * spr.height / spr.width;
        sxp = a.sx + a.sc * it.x * ROADW * F;
        if (sxp + pw2 / 2 < 0 || sxp - pw2 / 2 > W || pw2 < 2) continue;
        ctx.globalAlpha = al; ctx.drawImage(spr, sxp - pw2 / 2, a.sy - ph, pw2, ph);
      }
      if (buckets[n]) {
        for (j = 0; j < buckets[n].length; j++) {
          c = buckets[n][j];
          var pct = (c.z % SEG) / SEG, sc = lerp(a.sc, b.sc, pct), cx = lerp(a.sx, b.sx, pct) + sc * c.x * ROADW * F, cy = lerp(a.sy, b.sy, pct);
          var cw = sc * c.type.mw * F, spr2 = carSprite(c.type, c.col, c.variant), chh = cw * spr2.height / spr2.width;
            ctx.globalAlpha = c.ghost ? al * 0.45 : al; ctx.drawImage(spr2, cx - cw / 2, cy - chh * 0.985, cw, chh);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================
  //                   COCKPIT ke chalte hisse (dial, steering, haath)
  // =====================================================================
  function dialNeedle(cx, cy, frac, col) {
    var a = (-225 + clamp(frac, 0, 1) * 270) * D2R;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * 29, cy + Math.sin(a) * 29); ctx.stroke();
    ctx.fillStyle = '#d0d3d8'; ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, TAU); ctx.fill();
  }

  function hand(g, x, y, flip) {
    var sk = g.createLinearGradient(x - 24, y - 20, x + 24, y + 20);
    sk.addColorStop(0, '#e0a679'); sk.addColorStop(1, '#a8683f');
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.fillStyle = sk; g.beginPath(); g.ellipse(0, 0, 24, 19, 0, 0, TAU); g.fill();
    for (var i = 0; i < 4; i++) {                              // ungliyan
      g.fillStyle = sk; g.beginPath(); g.ellipse(-4 + i * 9, -17 + Math.abs(i - 1.5) * 1.5, 5.4, 10, 0.1 * (i - 1.5), 0, TAU); g.fill();
      g.strokeStyle = 'rgba(80,40,20,.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-8 + i * 9, -24); g.lineTo(-8 + i * 9, -9); g.stroke();
    }
    g.fillStyle = sk; g.beginPath(); g.ellipse(-20, 8, 8, 13, -0.5, 0, TAU); g.fill();   // angutha
    g.strokeStyle = 'rgba(80,40,20,.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, 24, 19, 0, 0.2, 2.6); g.stroke();
    g.restore();
  }

  function drawWheel() {
    var cx = 505, cy = 352, R = 128, sq = 0.88, a = wheelAng, cs = Math.cos(a), sn = Math.sin(a);
    // baanh: kandhe se haath tak (steering ke saath ghoomte haath ko pakadti hain)
    var hl = [-112, -4], hr = [112, 0], i, hp, sh, sleeve, g = ctx;
    var tp = function (p) { return [cx + p[0] * cs - p[1] * sn, cy + (p[0] * sn + p[1] * cs) * sq]; };
    var arms = [[tp(hl), [300, 470]], [tp(hr), [760, 470]]];
    for (i = 0; i < 2; i++) {
      hp = arms[i][0]; sh = arms[i][1];
      var ang = Math.atan2(hp[1] - sh[1], hp[0] - sh[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
      var skg = g.createLinearGradient(sh[0], sh[1], hp[0], hp[1]); skg.addColorStop(0, '#7a4a2e'); skg.addColorStop(0.5, '#b97a50'); skg.addColorStop(1, '#d9a070');
      g.fillStyle = skg; g.beginPath();
      g.moveTo(sh[0] + nx * 40, sh[1] + ny * 40); g.lineTo(hp[0] + nx * 14, hp[1] + ny * 14); g.lineTo(hp[0] - nx * 14, hp[1] - ny * 14); g.lineTo(sh[0] - nx * 40, sh[1] - ny * 40); g.closePath(); g.fill();
    }
    g.save(); g.translate(cx, cy); g.scale(1, sq); g.rotate(a);
    // wheel ki rim
    var rg = g.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, '#2b2c30'); rg.addColorStop(0.5, '#0c0c0e'); rg.addColorStop(1, '#2b2c30');
    g.strokeStyle = rg; g.lineWidth = 27; g.beginPath(); g.arc(0, 0, R - 12, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.17)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R - 2, PI * 1.05, PI * 1.9); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.arc(0, 0, R - 12, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#d7352b'; g.fillRect(-3, -R - 1, 6, 15);                                 // upar ka laal nishaan
    // teen spoke
    var sg = g.createLinearGradient(0, -30, 0, 40); sg.addColorStop(0, '#2e3035'); sg.addColorStop(1, '#0d0d0f');
    g.fillStyle = sg;
    g.beginPath(); g.moveTo(-R + 10, -14); g.lineTo(-44, -26); g.lineTo(-44, 40); g.lineTo(-R + 10, 22); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(R - 10, -14); g.lineTo(44, -26); g.lineTo(44, 40); g.lineTo(R - 10, 22); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-26, 30); g.lineTo(26, 30); g.lineTo(18, R - 18); g.lineTo(-18, R - 18); g.closePath(); g.fill();
    // buttons
    g.fillStyle = '#4d5057'; for (i = 0; i < 3; i++) { rrect(g, -R + 26 + i * 18, -4 + i * 2, 12, 9, 2); g.fill(); rrect(g, R - 38 - i * 18, -4 + i * 2, 12, 9, 2); g.fill(); }
    g.fillStyle = '#2f6fb0'; g.fillRect(-R + 30, 12, 10, 4); g.fillRect(R - 40, 12, 10, 4);
    // beech ka hub
    var hg = g.createRadialGradient(-10, -16, 4, 0, 0, 56); hg.addColorStop(0, '#4b4e55'); hg.addColorStop(0.6, '#1a1b1e'); hg.addColorStop(1, '#09090a');
    g.fillStyle = hg; g.beginPath(); g.ellipse(0, 6, 58, 52, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6b6e75'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#c9ccd1'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 6, 20, 17, 0, 0, TAU); g.stroke();
    g.fillStyle = '#c9ccd1'; g.font = 'bold 20px Arial'; g.textAlign = 'center'; g.fillText('P', 0, 13);
    // haath
    hand(g, hl[0], hl[1], false); hand(g, hr[0], hr[1], true);
    g.restore();
  }

  function drawMirrors() {
    var i, c, rel, g = ctx;
    // peeche aane wali gadiyan: rear-view mirror mein chhoti dikhti hain
    g.save(); rrect(g, 752, 91, 240, 50, 20); g.clip();
    for (i = 0; i < cars.length; i++) {
      c = cars[i]; rel = relOf(c.z);
      if (rel > -1500 || rel < -16000) continue;
      var k = 1500 / -rel, mx = 872 + (c.x - P.x) * 110 * k * 1.2, mw = 62 * k, mh = 30 * k;
      g.fillStyle = 'rgba(15,15,18,.95)'; g.fillRect(mx - mw / 2, 140 - mh, mw, mh);
      g.fillStyle = 'rgba(255,240,190,.95)'; g.fillRect(mx - mw / 2 + mw * 0.06, 140 - mh * 0.45, mw * 0.22, mh * 0.2); g.fillRect(mx + mw / 2 - mw * 0.28, 140 - mh * 0.45, mw * 0.22, mh * 0.2);
    }
    g.restore();
  }

  function drawPedals() {
    var g = ctx, w = W, h = H, i;
    // break (baayi taraf): chhoti patti, seedhi lakeeron wali
    var bx = w * 0.083, by = h * 0.805, bw = w * 0.075, bh = h * 0.095;
    g.globalAlpha = brakeDown ? 0.95 : 0.6;
    g.fillStyle = brakeDown ? '#ff5a4a' : 'rgba(255,255,255,.12)'; rrect(g, bx, by, bw, bh, bh * 0.28); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, h * 0.005); rrect(g, bx, by, bw, bh, bh * 0.28); g.stroke();
    g.lineWidth = Math.max(1, h * 0.0035);
    for (i = 0; i < 9; i++) { g.beginPath(); g.moveTo(bx + bw * (0.2 + i * 0.075), by + bh * 0.2); g.lineTo(bx + bw * (0.2 + i * 0.075), by + bh * 0.8); g.stroke(); }
    // accelerator (daayi taraf): lambi dhaal jaisi patti, andar chhota gola
    var ax = w * 0.878, ay = h * 0.765, aw = w * 0.063, ah = h * 0.175;
    g.globalAlpha = gasDown ? 0.95 : 0.6;
    g.fillStyle = gasDown ? '#46d36a' : 'rgba(255,255,255,.12)';
    g.beginPath(); g.moveTo(ax + aw * 0.2, ay); g.lineTo(ax + aw, ay); g.lineTo(ax + aw, ay + ah * 0.9); g.quadraticCurveTo(ax + aw, ay + ah, ax + aw * 0.7, ay + ah); g.lineTo(ax + aw * 0.1, ay + ah); g.quadraticCurveTo(ax, ay + ah, ax, ay + ah * 0.9); g.lineTo(ax, ay + ah * 0.2); g.quadraticCurveTo(ax, ay, ax + aw * 0.2, ay); g.closePath(); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, h * 0.005); g.stroke();
    g.lineWidth = Math.max(1, h * 0.0035);
    for (i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ax + aw * (0.5 + i * 0.12), ay + ah * 0.12); g.lineTo(ax + aw * (0.5 + i * 0.12), ay + ah * 0.9); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ax + aw * 0.28, ay + ah * (gasDown ? 0.72 : 0.22), aw * 0.17, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }

  function buttonsMode() {
    if (C.CONTROL === 'buttons') return true;
    if (C.CONTROL === 'tilt') return false;
    return !(tilt.ok && performance.now() - tilt.t < 1500) && playT > 1.5;
  }

  function drawSteerButtons() {
    var g = ctx, w = W, h = H, k;
    for (k = 0; k < 2; k++) {
      var x = k === 0 ? w * 0.30 : w * 0.56, y = h * 0.80, bw = w * 0.14, bh = h * 0.17, on = k === 0 ? (steerBtn < -0.1) : (steerBtn > 0.1);
      g.globalAlpha = on ? 0.95 : 0.5; g.fillStyle = on ? '#ffd24a' : 'rgba(255,255,255,.16)'; rrect(g, x, y, bw, bh, bh * 0.3); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, h * 0.006); rrect(g, x, y, bw, bh, bh * 0.3); g.stroke();
      g.fillStyle = on ? '#222' : '#fff'; g.beginPath();
      var cx = x + bw / 2, cy = y + bh / 2, s = bh * 0.28, d = k === 0 ? -1 : 1;
      g.moveTo(cx + d * s, cy); g.lineTo(cx - d * s * 0.6, cy - s); g.lineTo(cx - d * s * 0.6, cy + s); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }

  function drawHUD() {
    var g = ctx, u = H / 405, kmh = Math.round(P.speed);
    var sc = Math.floor(score);
    g.textBaseline = 'alphabetic';
    // SCORE (upar baayen): kaala tab, neeche cyan ank
    var tg = g.createLinearGradient(0, 0, 100 * u, 0); tg.addColorStop(0, 'rgba(0,0,0,.72)'); tg.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = tg; g.beginPath(); g.moveTo(0, 12 * u); g.lineTo(98 * u, 12 * u); g.lineTo(88 * u, 52 * u); g.lineTo(0, 52 * u); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold ' + (13 * u) + 'px Arial'; g.textAlign = 'left'; g.fillText('SCORE', 16 * u, 29 * u);
    g.fillStyle = '#19e6d6'; g.font = 'bold ' + (21 * u) + 'px Arial'; g.fillText(String(sc), 16 * u, 49 * u);
    // bacha hua time (chhota, beech mein)
    var t = Math.max(0, Math.ceil(timeLeft)), mm = Math.floor(t / 60), ss = t % 60;
    g.fillStyle = 'rgba(0,0,0,.5)'; rrect(g, W / 2 - 36 * u, 10 * u, 72 * u, 24 * u, 6 * u); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold ' + (15 * u) + 'px Arial'; g.fillText(mm + ':' + (ss < 10 ? '0' : '') + ss, W / 2, 28 * u);
    // pause (upar daayen)
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(W - 40 * u, 20 * u, 7 * u, 19 * u); g.fillRect(W - 28 * u, 20 * u, 7 * u, 19 * u);
    // SPEED + KMH
    g.textAlign = 'right';
    g.fillStyle = '#fff'; g.font = 'bold ' + (13 * u) + 'px Arial'; g.fillText('SPEED', W - 18 * u, 78 * u);
    g.fillStyle = '#19e6d6'; g.font = 'bold ' + (22 * u) + 'px Arial';
    var unit = 'KMH', uw; g.font = 'bold ' + (12 * u) + 'px Arial'; uw = g.measureText(unit).width;
    g.fillText(unit, W - 18 * u, 99 * u);
    g.font = 'bold ' + (23 * u) + 'px Arial'; g.fillText(String(kmh), W - 18 * u - uw - 4 * u, 99 * u);
    // +10 popup
    var i, p;
    for (i = popups.length - 1; i >= 0; i--) {
      p = popups[i]; p.t += 1 / 60;
      if (p.t > 1.2) { popups.splice(i, 1); continue; }
      g.globalAlpha = 1 - p.t / 1.2; g.fillStyle = '#ffd24a'; g.textAlign = 'center';
      g.font = 'bold ' + (26 * dpr) + 'px Arial'; g.fillText(p.text, W * 0.5, H * 0.46 - p.t * 30 * dpr);
      g.font = 'bold ' + (11 * dpr) + 'px Arial'; g.fillStyle = '#fff'; g.fillText('CLOSE PASS!', W * 0.5, H * 0.46 + 14 * dpr - p.t * 30 * dpr);
      g.globalAlpha = 1;
    }
    if (invul > 0 && state === 'play') {
      g.fillStyle = 'rgba(80,220,120,.85)'; g.font = 'bold ' + (12 * dpr) + 'px Arial'; g.textAlign = 'center'; g.fillText('SAFE ' + invul.toFixed(1), W / 2, 52 * dpr);
    }
  }

  function drawCrash() {
    var g = ctx;
    g.fillStyle = 'rgba(200,0,0,' + (0.25 * Math.min(1, crashT / C.CRASH_WAIT) + flash * 0.5) + ')'; g.fillRect(0, 0, W, H);
    // sheesha par daraar
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, 1.5 * dpr);
    var cx = W * 0.5, cy = H * 0.3, i, k;
    for (i = 0; i < crackSeed.length; i++) {
      var a = crackSeed[i][0], l = crackSeed[i][1] * H * 0.5, x = cx, y = cy;
      g.beginPath(); g.moveTo(x, y);
      for (k = 1; k <= 4; k++) { x += Math.cos(a + (k % 2 ? 0.12 : -0.12)) * l / 4; y += Math.sin(a + (k % 2 ? 0.12 : -0.12)) * l / 4; g.lineTo(x, y); }
      g.stroke();
    }
    g.textAlign = 'center'; g.fillStyle = '#ff4136'; g.font = 'bold ' + (34 * dpr) + 'px Arial'; g.fillText('💥 ACCIDENT!', W / 2, H * 0.3);
    g.fillStyle = '#fff'; g.font = 'bold ' + (46 * dpr) + 'px Arial'; g.fillText(String(Math.max(1, Math.ceil(crashT))), W / 2, H * 0.52);
  }

  function render() {
    var sp = P.speed / C.TOP_SPEED, shx = 0, shy = 0, g = ctx;
        shx = (Math.random() - 0.5) * shake * 22 * dpr; shy = (Math.random() - 0.5) * shake * 18 * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save(); g.translate(shx, shy); drawWorld(); g.restore();
    // speed ki lakeeren
    if (P.speed > 170) {
      var al = clamp((P.speed - 170) / 130, 0, 1) * 0.3, i, an, r0, r1;
      g.strokeStyle = 'rgba(255,255,255,' + al + ')'; g.lineWidth = Math.max(1, dpr);
      for (i = 0; i < 22; i++) {
        an = Math.random() * TAU; r0 = H * (0.25 + Math.random() * 0.2); r1 = r0 + H * (0.12 + Math.random() * 0.25);
        g.beginPath(); g.moveTo(W / 2 + Math.cos(an) * r0 * 2, HOR + Math.sin(an) * r0); g.lineTo(W / 2 + Math.cos(an) * r1 * 2, HOR + Math.sin(an) * r1); g.stroke();
      }
    }
    // railing se ragadte waqt chingaari
    if (scraping) {
      var side = P.x > 0 ? 1 : -1, i2;
      for (i2 = 0; i2 < 9; i2++) {
        g.strokeStyle = i2 % 2 ? '#ffd27a' : '#ff8a2a'; g.lineWidth = Math.max(1, 1.6 * dpr);
        var sx = side < 0 ? W * (0.04 + Math.random() * 0.2) : W * (0.78 + Math.random() * 0.2), sy = H * (0.45 + Math.random() * 0.2);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (Math.random() - 0.5) * 22 * dpr, sy + Math.random() * 14 * dpr); g.stroke();
      }
    }
    g.save(); g.translate(shx * 0.4, shy * 0.4);
    g.drawImage(cock, 0, 0);
    g.save(); g.scale(W / 1000, H / 450);
    dialNeedle(428, 292, P.speed / 300, '#ff4a3d'); dialNeedle(586, 292, rpm, '#ffd24a');
    drawMirrors(); drawWheel();
    g.restore();
    g.restore();
    drawPedals();
    if (buttonsMode()) drawSteerButtons();
    drawHUD();
    if (state === 'crash') drawCrash();
    if (state === 'paused') {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold ' + (34 * dpr) + 'px Arial'; g.fillText('PAUSED', W / 2, H * 0.45);
      g.font = (14 * dpr) + 'px Arial'; g.fillText('Chalu karne ke liye screen dabao', W / 2, H * 0.56);
    }
  }

  // =====================================================================
  //                          GAME KA LOGIC
   // =====================================================================
  function newCar(rel) {
    var lane = 0, ok = false, tries = 0, i, o;
    while (!ok && tries < 12) {
      lane = ri(4); ok = true; tries++;
      for (i = 0; i < cars.length; i++) { o = cars[i]; if (o.lane === lane && Math.abs(relOf(o.z) - rel) < 3400) { ok = false; break; } }
    }
    if (!ok) return null;
    var truck = Math.random() < C.TRUCK_CHANCE, type = truck ? TYPES[5] : (Math.random() < 0.12 ? TYPES[4] : TYPES[ri(4)]);
    var col = truck ? ['#f2f2f2', '#e6e9ee', '#d9dfe7', '#c6ced8'][ri(4)] : CAR_COLORS[ri(CAR_COLORS.length)];
    var spd = rnd(C.TRAFFIC_MIN_SPEED, C.TRAFFIC_MAX_SPEED);
    if (truck) spd = C.TRAFFIC_MIN_SPEED + (spd - C.TRAFFIC_MIN_SPEED) * 0.5;
    return { lane: lane, x: LANE_X[lane] + rnd(-0.03, 0.03), z: (P.z + rel + TRACK) % TRACK, speed: spd, type: type, col: col, variant: ri(3),
             hx: type.mw / 2 / ROADW, mode: 'A', awarded: false, minDx: 9 };
  }

  function fillTraffic(initial) {
          var guard = 0, c, rel, SR = Math.max(1.2, C.SPAWN_RANGE), MAXC = maxCars();
    while (cars.length < MAXC && guard++ < 1200) {
      rel = initial ? rnd(6500, DRAW * SEG * SR) : rnd(DRAW * SEG * SR * 0.95, DRAW * SEG * SR);
      c = newCar(rel);
      if (c && initial && c.lane === nearLane() && rel < 20000) c = null;      // shuru mein meri lane saaf rahe
      if (c) cars.push(c);
    }
  }
    function maxCars() { return Math.round(C.TRAFFIC_COUNT * DRAW * Math.max(1.2, C.SPAWN_RANGE) / 200); }
  function nearLane() {
    var best = 0, bd = 9, i;
    for (i = 0; i < 4; i++) if (Math.abs(LANE_X[i] - P.x) < bd) { bd = Math.abs(LANE_X[i] - P.x); best = i; }
    return best;
  }

  function resetGame() {
    P = { z: 0, x: LANE_X[0], speed: C.NORMAL_SPEED };
    cars = []; score = 0; passes = 0; crashes = 0; topSpeed = 0; timeLeft = C.GAME_TIME; crashT = 0; invul = C.SAFE_TIME; shake = 0; flash = 0;
    popups = []; scraping = false; wheelAng = 0; steerIn = 0; steerBtn = 0; rpm = 0.2; playT = 0;
    fillTraffic(true);
  }

  function calibrate() { if (tilt.ok) { tilt.zero = tilt.deg; tilt.pending = false; } else tilt.pending = true; }

  function steerValue(dt) {
    var tgt = 0, useBtn = buttonsMode();
    if (keyDir !== 0) tgt = keyDir;
    else if (useBtn) tgt = steerBtn;
    else if (tilt.ok) {
      var d = tilt.deg - tilt.zero;
      while (d > 180) d -= 360; while (d < -180) d += 360;
      var ad = Math.abs(d);
      tgt = ad < C.TILT_DEADZONE ? 0 : (d < 0 ? -1 : 1) * clamp((ad - C.TILT_DEADZONE) / (C.TILT_FULL - C.TILT_DEADZONE), 0, 1);
    }
    steerIn += (tgt - steerIn) * (1 - Math.exp(-dt * 14));
    return steerIn;
  }

  function doCrash(car) {
    state = 'crash'; crashT = C.CRASH_WAIT; crashes++; shake = 1.2; flash = 1; lastTick = Math.ceil(crashT);
    crackSeed = []; for (var i = 0; i < 12; i++) crackSeed.push([Math.random() * TAU, 0.2 + Math.random() * 0.5]);
    Snd.crash(); Snd.scrape(false); Snd.skid(false, 0);
  }

  function respawn() {
    var i, c;
    for (i = 0; i < cars.length; i++) { c = cars[i]; if (Math.abs(relOf(c.z)) < 9000) c.ghost = true; }
    P.speed = 0; invul = C.SAFE_TIME; state = 'play'; shake = 0; flash = 0;
    var best = 0, bd = 9; for (i = 0; i < 4; i++) if (Math.abs(LANE_X[i] - P.x) < bd) { bd = Math.abs(LANE_X[i] - P.x); best = i; }
    P.x = LANE_X[best];

    calibrate(); Snd.respawn();
  }

  function update(dt) {
    var i, c, rel, o, seg;
    clock += dt; playT += dt;
    if (state === 'play' || state === 'crash') { timeLeft -= dt; if (timeLeft <= 0) { finish(); return; } }
    if (invul > 0) invul -= dt;
    shake = Math.max(0, shake - dt * 1.6); flash = Math.max(0, flash - dt * 2.2);
    if (state === 'crash') {
      crashT -= dt;
      var k = Math.ceil(crashT); if (k !== lastTick && k >= 1) { lastTick = k; Snd.tick(k); }
      P.speed = Math.max(0, P.speed - 220 * dt);
      if (crashT <= 0) respawn();
    }
    if (tilt.pending && tilt.ok) { tilt.zero = tilt.deg; tilt.pending = false; }
    keyDir = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    var tgtBtn = 0; for (i in ptrs) { if (ptrs[i] === 'L') tgtBtn -= 1; else if (ptrs[i] === 'R') tgtBtn += 1; }
    steerBtn += (tgtBtn - steerBtn) * (1 - Math.exp(-dt * 12));
    var steer = steerValue(dt);

    if (state === 'play') {
      var kmh = P.speed;
      if (brakeDown) kmh -= C.BRAKE_DECEL * dt;
      else if (gasDown) kmh = Math.min(C.TOP_SPEED, kmh + C.ACCEL * dt);
      else if (kmh < C.NORMAL_SPEED) kmh = Math.min(C.NORMAL_SPEED, kmh + C.CRUISE_ACCEL * dt);
      else kmh = Math.max(C.NORMAL_SPEED, kmh - C.RELEASE_DECEL * dt);
      scraping = Math.abs(P.x) > BARRIER_START;
      if (scraping && kmh > C.BARRIER_MIN_SPEED) kmh = Math.max(C.BARRIER_MIN_SPEED, kmh - C.BARRIER_SLOW * dt);
      P.speed = Math.max(0, Math.min(C.TOP_SPEED, kmh));
    } else scraping = false;
    if (P.speed > topSpeed) topSpeed = P.speed;

    // aage badhna
    var spd = P.speed / C.TOP_SPEED;
    P.z = (P.z + P.speed * UPS * dt) % TRACK;
    seg = findSeg(P.z);
    if (state === 'play') {
      var lat = steer * C.STEER_SPEED * (0.35 + 0.65 * clamp(P.speed / 150, 0, 1)) * clamp(P.speed / 20, 0, 1);
      P.x += lat * dt;
    }
    P.x -= dt * 2 * spd * spd * seg.curve * C.CURVE_PUSH;          // mod par gadi bahar khichti hai
    P.x = clamp(P.x, -X_LIMIT, X_LIMIT);
    skyX -= seg.curve * spd * dt * W * 0.06;
    var wt = steer * C.WHEEL_DEG * D2R; wheelAng += (wt - wheelAng) * (1 - Math.exp(-dt * 12));

    // engine ki rpm (dial ke liye)
    var GEARS = [0, 45, 85, 130, 185, 245, 320], gear = 1, j;
    for (j = 1; j < GEARS.length - 1; j++) if (P.speed >= GEARS[j]) gear = j + 1;
    rpm += ((0.18 + clamp((P.speed - GEARS[gear - 1]) / (GEARS[gear] - GEARS[gear - 1]), 0, 1) * 0.62 + (gasDown ? 0.08 : 0)) - rpm) * (1 - Math.exp(-dt * 8));

    // doosri gadiyan
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      c.z = (c.z + c.speed * UPS * dt) % TRACK;
      for (j = 0; j < cars.length; j++) {                          // aage wali gadi se tez na chalen
        o = cars[j]; if (o === c || o.lane !== c.lane) continue;
        var gap = (o.z - c.z + TRACK) % TRACK;
        if (gap < 3200 && o.speed < c.speed) c.speed = o.speed;
      }
    }
        var SR = Math.max(1.2, C.SPAWN_RANGE), AL = DRAW * SEG * SR * 1.05, AMIN = DRAW * SEG * SR * 0.95, AMAX = DRAW * SEG * SR;
    for (i = cars.length - 1; i >= 0; i--) {
      c = cars[i]; rel = relOf(c.z);
      if (rel < -8000) { cars.splice(i, 1); continue; }              // bahut peeche reh gayi: aage nayi gadi banegi
      if (rel > AL) { cars.splice(i, 1); }                            // bahut aage: hata do
    }
                var MAXC = maxCars();
    var tries = 0, nc;
    while (cars.length < MAXC && tries++ < 12) { nc = newCar(rnd(AMIN, AMAX)); if (nc) cars.push(nc); }
        var zn = 0, ZT = Math.round(C.TRAFFIC_COUNT * DRAW / 200 * 1.15), q, zr;
    for (q = 0; q < cars.length; q++) { zr = relOf(cars[q].z); if (zr > 0 && zr < DRAW * SEG * 1.15) zn++; }
    tries = 0; while (zn < ZT && tries++ < 6) { nc = newCar(rnd(DRAW * SEG * 1.02, DRAW * SEG * 1.15)); if (nc) { cars.push(nc); zn++; } }
    if (cars.length < MAXC * 0.5) { nc = newCar(-rnd(3000, 6500)); if (nc) cars.push(nc); }

    // takkar aur "sata kar nikalna"
    if (state === 'play') {
      for (i = 0; i < cars.length; i++) {
        c = cars[i]; rel = relOf(c.z);
        var len = c.type.len;
        if (Math.abs(rel) < len) {
          var dxx = Math.abs(c.x - P.x);
          if (dxx < c.minDx) c.minDx = dxx;
          if (!c.ghost && c.mode === 'A' && invul <= 0 && dxx < c.hx + PHX * 0.9) { doCrash(c); break; }
        } else {
          if (!c.ghost && c.mode === 'A' && rel < -len && !c.awarded) {
            c.awarded = true;
            if (c.minDx < c.hx + PHX + C.PASS_GAP) {
              score += C.PASS_POINTS; passes++;
              popups.push({ t: 0, text: '+' + C.PASS_POINTS }); Snd.pass();
            }
          }
          c.mode = rel > 0 ? 'A' : 'B';
          if (rel > len) { c.minDx = 9; c.awarded = false; }
        }
      }
    }

    // awaazein
    Snd.engine(P.speed, gasDown && state === 'play', state === 'play' || state === 'crash');
    if (state === 'crash') Snd.engine(0, false, false);
    Snd.scrape(scraping && state === 'play');
    Snd.skid(brakeDown && P.speed > 40 && state === 'play', P.speed);
  }

  // =====================================================================
  //                      SHURU / KHATAM / INPUT
  // =====================================================================
  function start() {
    Snd.unlock();
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(function () {});
    } catch (e) {}
    resetGame();
    $('menu').classList.add('hidden'); $('over').classList.add('hidden');
    state = 'play'; calibrate();
  }

  function finish() {
    if (state === 'over') return;
    state = 'over';
    Snd.engine(0, false, false); Snd.scrape(false); Snd.skid(false, 0); Snd.end();
    var fin = Math.min(C.SAVE_CAP, Math.floor(score));
    $('finalScore').textContent = String(Math.floor(score));
    $('finalStats').textContent = 'Sata kar nikle: ' + passes + '   |   Takkar: ' + crashes + '   |   Top speed: ' + Math.round(topSpeed) + ' km/h';
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

  // phone ka jhukav -> steering
  function orientAngle() {
    if (portrait) return 90;
    var a = (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 90);
    return ((a % 360) + 360) % 360;
  }
  window.addEventListener('deviceorientation', function (e) {
    if (e.beta == null || e.gamma == null) return;
    var b = e.beta * D2R, g = e.gamma * D2R;
    var dx = Math.sin(g) * Math.cos(b), dy = -Math.sin(b), gr, gd;     // phone ke andar "neeche" ki disha
    if (orientAngle() === 270) { gr = dy; gd = dx; } else { gr = -dy; gd = -dx; }
    tilt.deg = Math.atan2(gr, gd) * R2D; tilt.ok = true; tilt.t = performance.now();
  });

  function toLocal(e) {
    var x = portrait ? e.clientY : e.clientX, y = portrait ? window.innerWidth - e.clientX : e.clientY;
    return { x: x / LW, y: y / LH };                                  // 0..1
  }
  function role(p) {
    if (p.x > 0.88 && p.y < 0.2) return 'P';
    if (p.x < 0.30 && p.y > 0.45) return 'B';
    if (p.x > 0.70 && p.y > 0.40) return 'G';
    if (buttonsMode() && p.y > 0.72) { if (p.x > 0.26 && p.x < 0.48) return 'L'; if (p.x >= 0.48 && p.x < 0.72) return 'R'; }
    return 'N';
  }
  function recalc() {
    gasDown = false; brakeDown = false;
    for (var k in ptrs) { if (ptrs[k] === 'G') gasDown = true; if (ptrs[k] === 'B') brakeDown = true; }
    if (keys.ArrowUp || keys.w || keys.W) gasDown = true;
    if (keys.ArrowDown || keys.s || keys.S || keys[' ']) brakeDown = true;
  }

  window.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.overlay, .back')) return;
    e.preventDefault(); Snd.unlock();
    if (state === 'paused') { state = 'play'; return; }
    if (state !== 'play' && state !== 'crash') return;
    var r = role(toLocal(e));
    if (r === 'P') { if (state === 'play') state = 'paused'; Snd.engine(0, false, false); return; }
    ptrs[e.pointerId] = r; recalc();
  });
  function ptrEnd(e) { delete ptrs[e.pointerId]; recalc(); }
  window.addEventListener('pointerup', ptrEnd);
  window.addEventListener('pointercancel', ptrEnd);
  window.addEventListener('keydown', function (e) { keys[e.key] = true; recalc(); if (e.key === 'p' || e.key === 'P') { if (state === 'play') state = 'paused'; else if (state === 'paused') state = 'play'; } });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; recalc(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'play') state = 'paused'; });

  // screen ka size (phone seedha ho to ghuma kar lamba)
  function setup() {
    var iw = window.innerWidth, ih = window.innerHeight;
    portrait = ih > iw;
    LW = portrait ? ih : iw; LH = portrait ? iw : ih;
    wrap.style.width = LW + 'px'; wrap.style.height = LH + 'px';
    wrap.style.transform = portrait ? 'translateX(' + iw + 'px) rotate(90deg)' : 'none';
    dpr = Math.min(window.devicePixelRatio || 1, C.MAX_DPR);
    W = Math.round(LW * dpr); H = Math.round(LH * dpr); F = W / 2; HOR = Math.round(H * 0.30);
    cv.width = W; cv.height = H;
    buildSky(); buildCockpit();
  }
  window.addEventListener('resize', setup);
  window.addEventListener('orientationchange', function () { setTimeout(setup, 150); });

  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (state === 'play' || state === 'crash') update(dt);
    render();
  }

  // ---------- shuruaat ----------
  DRAW = C.DRAW_DISTANCE;
for (var q = 0; q < DRAW; q++) { fogA[q] = clamp(Math.pow(clamp((q - 30) / Math.max(40, DRAW * 0.55 - 30), 0, 1), 1.25), 0, 1); fogS[q] = 'rgba(255,200,132,' + fogA[q].toFixed(3) + ')'; }
  buildTrack(); buildScenery(); setup();
  resetGame();
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  //@HOOK
  requestAnimationFrame(loop);
})();
