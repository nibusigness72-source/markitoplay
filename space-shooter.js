// space-shooter.js - Space Shooter (Galaxy Attack jaisa)
// Ungli se jahaj chalao, goli apne aap chalti hai. Alien side se udte hue aate hain.
(function () {
  'use strict';

  // =====================================================================
  //                 SETTINGS  (sirf yahin ke number badalna)
  // =====================================================================
  var CONFIG = {
    // ---- game ----
    GAME_TIME:60,          // poore game ka time (second). 300 = 5 minute
    SAVE_CAP: 1000,          // ek baar mein zyada se zyada kitna score save hoga
    WAIT_AFTER_HIT: 5,       // jahaj toot jaye to kitne second rukna padega
    SAFE_TIME: 2.5,          // wapas aane ke baad kitne second koi goli/alien nuksaan nahi karega
    DEATH_LEVEL_LOSS: 1,     // jahaj tootne par goli ke kitne upgrade ghat jayenge (0 = kuch nahi ghatega)

    // ---- ungli se jahaj chalana ----
    MOVE_SENS: 1.2,          // ungli jitni hile, jahaj usse kitna zyada hile (1 = barabar, bada = tez)
    FOLLOW: 18,              // jahaj ungli ke peeche kitni tezi se aaye (bada = turant, chhota = narm)
    PLAYER_HIT_R: 10,        // apne jahaj ka "lagne wala" gola. Chhota = bachna aasaan
    MAX_DPR: 2,              // screen ki sharpness (kam karoge to phone tez chalega)

    // ---- background ----
    BG_CHANGE_SEC: 30,       // kitne second baad background badle
    BG_SPEED: 90,            // background kitni tez neeche jaye (isse lagta hai jahaj upar ud raha hai)
    SHAKE: 1,                // dhamake par screen halki hilti hai (0 = bilkul nahi hilegi)

    // ---- apni bandook ----
    START_BULLETS: 3,        // shuru mein ek baar mein kitni goli
    MAX_BULLETS: 7,          // zyada se zyada ek baar mein kitni goli
    BULLET_SPACING: 11,      // goliyon ke beech ka faasla
    BULLET_FAN: 5,           // bahar ki goli thodi phailti hai (0 = bilkul seedhi)
    BULLET_SPEED: 780,       // goli ki raftaar
    SHIPS: [                 // har jahaj: fireGap = do goli ke beech ka samay (chhota = tez), damage = ek goli kitna nuksaan
      { name: 'Green', fireGap: 0.20, damage: 1 },
      { name: 'Fire',  fireGap: 0.18, damage: 1 },
      { name: 'Ice',   fireGap: 0.16, damage: 1 },
      { name: 'Royal', fireGap: 0.14, damage: 1 }
    ],

    // ---- girte gift (boost) ----
    DROP_CHANCE: 0.12,       // alien marne par gift girne ka chance (0.12 = 12%). 0 = kabhi nahi
    DROP_WEIGHTS: { power: 4, ship: 2, rapid: 3, shield: 2, boost: 2 },   // kaun sa gift kitna aayega (bada number = zyada)
    PICKUP_FALL: 95,         // gift kitni tez neeche girta hai
    RAPID_TIME: 8,           // speed boost kitne second
    RAPID_MULT: 1.8,         // speed boost mein goli kitni guna tez
    SHIELD_TIME: 7,          // shield kitne second
    BOOST_TIME: 7,           // boost attack (peela missile) kitne second
    BOOST_START: 2,          // boost attack shuru mein ek baar mein kitne missile
    BOOST_MAX: 9,            // boost attack ke ant mein ek baar mein kitne missile
    BOOST_GAP: 0.3,          // missile ke do round ke beech ka samay
    BOOST_DAMAGE: 3,         // ek missile kitna nuksaan karta hai

    // ---- alien ----
    // hp = kitni goli mein marega, pts = marne par point, size = alien ka size,
    // fire = [kam se kam, zyada se zyada] second baad goli maarega ([0,0] = kabhi goli nahi maarega)
    ENEMIES: {
      beetle: { hp: 1,  pts: 3,  size: 46,  fire: [0.3, 1] },
      moth:   { hp: 2,  pts: 3,  size: 48,  fire: [0.2, 0.8] },
      purple: { hp: 3,  pts: 3,  size: 52,  fire: [0.5, 1] },
      crab:   { hp: 4,  pts: 3,  size: 52,  fire: [0.2, 0.6] },
      scarab: { hp: 6,  pts: 3,  size: 56,  fire: [0.1, 0.3] },
      boss:   { hp: 300, pts: 30, size: 150, fire: [0.9, 1.6] }
    },
    ENEMY_BULLET_SPEED: 240, // alien ki goli ki raftaar
    ENEMY_AIM: 0,          // alien ki goli seedhi tumhari taraf jaye uska chance (0 = hamesha seedhi neeche)
    ENEMY_RISE: 5,           // jahaj ke saath alien dheere-dheere upar kitna sarakte hain (0 = ruke rahenge)
    DIVE_CHANCE: 5,        // alien tumhare upar jhapatta maare uska chance (0 = kabhi nahi)

    ENTER_SPEED: 2.5,        // formation wale alien side se kitni guna tez beech mein aayenge (1 = purani raftaar)
    STREAM_SPEED: 1.5,       // side se udte hue guzarne wale alien kitni guna tez (1 = purani raftaar)
    
    DIVE_EVERY: 2,           // kitne second mein ek baar jhapatta chance
    COLOR_VARIANTS: 5,       // ek hi alien kitne alag rang mein (1 se 5)

    // ---- patthar (mitti ka gola) ----
    ASTEROID: {
      hp: [3, 6, 10],        // chhota / beech ka / bada patthar kitni goli mein tootega
      size: [46, 72, 104],   // unka size
      pts: 2,                // tootne par point
      speed: [150, 270]      // girne ki raftaar (kam, zyada)
    },
    ASTEROID_WAVES: [4, 7],  // har level mein kaun si wave patthar ki hogi
    ASTEROID_COUNT: 14,      // ek patthar wave mein kitne patthar

    // ---- level / wave ----
    WAVES_PER_LEVEL: 9,      // ek level mein kitni wave ("Wave 2/9")
    ENEMIES_PER_WAVE: 15,    // ek wave mein kitne alien (pehle level mein)
    MORE_PER_LEVEL: 7,       // har naye level mein itne alien aur badhenge
    HP_PER_LEVEL: 0.7,       // har naye level mein alien ki HP kitni badhegi (0.3 = 30%)
    FIRE_FASTER_PER_LEVEL: 0.07, // har level mein alien thoda jaldi-jaldi goli maarenge
    BOSS_AT_END: true,       // aakhri wave mein bada boss aaye?
    WAVE_GAP: 1.6            // wave khatam hone ke baad agli wave tak ruk
  };

  var C = CONFIG, Snd = SpaceSound, GAME_ID = 'space-shooter';

  // =====================================================================
  //                         chhote madadgaar
  // =====================================================================
  var PI = Math.PI, TAU = PI * 2;
  function $(id) { return document.getElementById(id); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sym(g, f) { f(); g.save(); g.scale(-1, 1); f(); g.restore(); }
  function poly(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function lg(g, x0, y0, x1, y1, st) { var q = g.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < st.length; i++) q.addColorStop(st[i][0], st[i][1]); return q; }
  function rg(g, x0, y0, r0, x1, y1, r1, st) { var q = g.createRadialGradient(x0, y0, r0, x1, y1, r1); for (var i = 0; i < st.length; i++) q.addColorStop(st[i][0], st[i][1]); return q; }
  function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // =====================================================================
  //                 canvas, size aur sprite cache
  // =====================================================================
  var W = 450, H = 800, SS = 1, dpr = 1, cv = $('game'), ctx = cv.getContext('2d');
  var cache = {};
  function spr(key, w, h, fn) {                                  // ek baar banao, baar-baar use karo
    var c = cache[key];
    if (c) return c;
    c = mk(Math.ceil(w * SS), Math.ceil(h * SS));
    var g = c.getContext('2d'); g.scale(SS, SS); fn(g, w, h);
    c.lw = w; c.lh = h; cache[key] = c; return c;
  }
  function blit(c, x, y, sc, rot, al) {                          // sprite ko (x,y) par beech mein banao
    sc = sc || 1; var w = c.lw * sc, h = c.lh * sc;
    if (al != null && al < 1) ctx.globalAlpha = al;
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore(); }
    else ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
    if (al != null && al < 1) ctx.globalAlpha = 1;
  }

  var GLOWS = { fire: '255,150,40', hot: '255,225,140', blue: '80,195,255', green: '110,255,90', purple: '200,100,255', red: '255,70,80', white: '255,255,255', gold: '255,210,60' };
  function glowSpr(name) {
    return spr('glow' + name, 64, 64, function (g) {
      g.fillStyle = rg(g, 32, 32, 0, 32, 32, 32, [[0, 'rgba(255,255,255,.95)'], [0.2, 'rgba(' + GLOWS[name] + ',.8)'], [0.55, 'rgba(' + GLOWS[name] + ',.28)'], [1, 'rgba(' + GLOWS[name] + ',0)']]);
      g.fillRect(0, 0, 64, 64);
    });
  }
  function smokeSpr() {
    return spr('smoke', 48, 48, function (g) {
      g.fillStyle = rg(g, 24, 24, 0, 24, 24, 24, [[0, 'rgba(235,225,220,.55)'], [0.5, 'rgba(180,170,170,.25)'], [1, 'rgba(120,110,110,0)']]);
      g.fillRect(0, 0, 48, 48);
    });
  }

  // =====================================================================
  //                     APNE JAHAJ (4 alag jahaj)
  // =====================================================================
  var SHIP_W = 100, SHIP_H = 108;
  function artShip(g, k) {
    g.translate(50, 0);
    var i;
    if (k === 0) {                                               // ---- hara jahaj (hare pankh, neele pod) ----
      sym(g, function () {
        g.fillStyle = lg(g, 0, 50, 46, 90, [[0, '#d2ff7a'], [0.5, '#35c63a'], [1, '#0d6a22']]);
        poly(g, [[8, 50], [30, 62], [47, 80], [46, 90], [26, 88], [8, 80]]); g.fill();
        g.strokeStyle = '#0a4a16'; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 58); g.lineTo(42, 80); g.stroke();
        g.fillStyle = lg(g, 6, 40, 26, 84, [[0, '#c4f7ff'], [0.4, '#27a9e8'], [1, '#0b4fa8']]);
        rr(g, 7, 38, 18, 48, 7); g.fill(); g.strokeStyle = '#08306f'; g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, 10, 42, 4, 32, 2); g.fill();
        g.fillStyle = '#ffb400'; circ(g, 15, 38, 3.4); g.fill(); g.fillStyle = '#ff4a1a'; circ(g, 15, 38, 1.7); g.fill();
        g.fillStyle = '#2d3b57'; rr(g, 10, 86, 11, 8, 2); g.fill();
      });
      g.fillStyle = lg(g, -10, 0, 10, 0, [[0, '#23902c'], [0.5, '#9af55a'], [1, '#23902c']]);
      g.beginPath(); g.moveTo(0, 2); g.bezierCurveTo(5, 14, 9, 32, 9, 58); g.lineTo(8, 96); g.lineTo(0, 103); g.lineTo(-8, 96); g.lineTo(-9, 58); g.bezierCurveTo(-9, 32, -5, 14, 0, 2); g.closePath(); g.fill();
      g.strokeStyle = '#0a4a16'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = rg(g, -2, 30, 1, 0, 36, 16, [[0, '#f0ffd0'], [0.4, '#7be63a'], [1, '#17802a']]);
      g.beginPath(); g.ellipse(0, 36, 6.5, 15, 0, 0, TAU); g.fill(); g.strokeStyle = '#0d5a1a'; g.stroke();
      g.fillStyle = '#1aa7d8'; poly(g, [[-5, 78], [5, 78], [3, 94], [-3, 94]]); g.fill();
    } else if (k === 1) {                                        // ---- laal-narangi jahaj (4 top wala) ----
      sym(g, function () {
        g.fillStyle = lg(g, 0, 50, 46, 86, [[0, '#ffb066'], [0.5, '#f0561c'], [1, '#8a1c08']]);
        poly(g, [[6, 46], [30, 60], [48, 80], [48, 88], [28, 84], [6, 86]]); g.fill(); g.strokeStyle = '#5a1004'; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = 'rgba(255,230,190,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(12, 54); g.lineTo(44, 80); g.stroke();
        g.fillStyle = lg(g, 0, 0, 6, 0, [[0, '#cfd3da'], [1, '#6b7078']]);            // bandook ke pylon
        rr(g, 15, 26, 5, 52, 2); g.fill(); rr(g, 25, 36, 4, 44, 2); g.fill();
        g.fillStyle = '#ffd24a'; rr(g, 14, 20, 7, 9, 2); g.fill(); rr(g, 24.5, 30, 5, 8, 2); g.fill();
        g.fillStyle = '#ff7a2a'; rr(g, 12, 60, 10, 24, 3); g.fill();
        g.fillStyle = '#c0270c'; poly(g, [[6, 84], [26, 100], [12, 106]]); g.fill();
      });
      g.fillStyle = lg(g, -10, 0, 10, 0, [[0, '#a8230a'], [0.5, '#ff7a30'], [1, '#a8230a']]);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(5, 16, 9, 34, 9, 60); g.lineTo(7, 96); g.lineTo(0, 104); g.lineTo(-7, 96); g.lineTo(-9, 60); g.bezierCurveTo(-9, 34, -5, 16, 0, 0); g.closePath(); g.fill();
      g.strokeStyle = '#5a1004'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#d4261a'; poly(g, [[0, 0], [4, 18], [-4, 18]]); g.fill();
      g.fillStyle = rg(g, -1, 40, 1, 0, 44, 11, [[0, '#d8ffff'], [0.5, '#34c8e0'], [1, '#0a6a8a']]);
      g.beginPath(); g.ellipse(0, 44, 4.5, 12, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffd24a'; rr(g, -4, 66, 8, 10, 2); g.fill();
    } else if (k === 2) {                                        // ---- neela jahaj (3 hare thruster) ----
      sym(g, function () {
        g.fillStyle = lg(g, 0, 40, 46, 86, [[0, '#a8e8ff'], [0.5, '#1f8ae0'], [1, '#0b3a8a']]);
        poly(g, [[8, 40], [30, 54], [48, 78], [47, 86], [26, 82], [8, 84]]); g.fill(); g.strokeStyle = '#06265c'; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(12, 50); g.lineTo(44, 76); g.stroke();
        g.fillStyle = '#9fb4cc'; rr(g, 42, 20, 3, 62, 1.5); g.fill(); g.fillStyle = '#e8f2ff'; rr(g, 41, 16, 5, 8, 2); g.fill();     // antenna
        g.fillStyle = lg(g, 0, 0, 12, 0, [[0, '#7fd2ff'], [1, '#1362c0']]); rr(g, 12, 44, 12, 40, 4); g.fill(); g.strokeStyle = '#06265c'; g.stroke();
        g.fillStyle = '#34ff7a'; rr(g, 13, 86, 10, 8, 2); g.fill();
      });
      g.fillStyle = lg(g, -12, 0, 12, 0, [[0, '#1160b8'], [0.5, '#52c2ff'], [1, '#1160b8']]);
      g.beginPath(); g.moveTo(0, 2); g.bezierCurveTo(7, 16, 11, 34, 11, 60); g.lineTo(9, 96); g.lineTo(0, 100); g.lineTo(-9, 96); g.lineTo(-11, 60); g.bezierCurveTo(-11, 34, -7, 16, 0, 2); g.closePath(); g.fill();
      g.strokeStyle = '#06265c'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#ff9a1a'; poly(g, [[0, 12], [6, 36], [0, 46], [-6, 36]]); g.fill();
      g.fillStyle = '#8a2be2'; circ(g, 0, 32, 3.4); g.fill(); g.fillStyle = '#fff'; circ(g, -1, 31, 1.1); g.fill();
      g.fillStyle = '#34ff7a'; rr(g, -4, 86, 8, 8, 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; rr(g, -8, 48, 3, 30, 1.5); g.fill();
    } else {                                                     // ---- shahi jahaj (baingni + sona) ----
      sym(g, function () {
        g.fillStyle = lg(g, 0, 40, 48, 90, [[0, '#d18cff'], [0.5, '#7a2fd0'], [1, '#2d0f6a']]);
        poly(g, [[8, 44], [32, 52], [49, 70], [48, 92], [28, 84], [8, 88]]); g.fill();
        g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.stroke();
        g.fillStyle = lg(g, 0, 40, 40, 90, [[0, '#fff2a8'], [1, '#d99a14']]); poly(g, [[12, 56], [38, 66], [46, 80], [26, 76], [12, 78]]); g.fill();
        g.fillStyle = '#ffd24a'; poly(g, [[8, 84], [24, 102], [10, 100]]); g.fill();
        g.fillStyle = '#ff4aa8'; circ(g, 38, 70, 2.6); g.fill();
      });
      g.fillStyle = lg(g, -10, 0, 10, 0, [[0, '#4a1a98'], [0.5, '#b070ff'], [1, '#4a1a98']]);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(7, 14, 10, 34, 10, 60); g.lineTo(8, 98); g.lineTo(0, 106); g.lineTo(-8, 98); g.lineTo(-10, 60); g.bezierCurveTo(-10, 34, -7, 14, 0, 0); g.closePath(); g.fill();
      g.strokeStyle = '#ffd24a'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = rg(g, -1, 36, 1, 0, 40, 14, [[0, '#ffe8ff'], [0.45, '#ff58c8'], [1, '#8a0a6a']]);
      g.beginPath(); g.moveTo(0, 20); g.lineTo(6, 40); g.lineTo(0, 58); g.lineTo(-6, 40); g.closePath(); g.fill(); g.strokeStyle = '#ffd24a'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ffd24a'; poly(g, [[0, 6], [3, 16], [-3, 16]]); g.fill();
    }
  }
  function shipSpr(k) { return spr('ship' + k, SHIP_W, SHIP_H, function (g) { artShip(g, k); }); }

  // =====================================================================
  //                     ALIEN (5 qism + boss, alag-alag rang)
  // =====================================================================
  var ETYPES = ['beetle', 'moth', 'purple', 'crab', 'scarab'];
  var SHIFTS = [0, 60, 140, 215, 285];
  function colFn(sh) { return function (h, s, l, a) { return 'hsla(' + ((h + sh) % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }; }

  function artEnemy(g, type, sh, fr) {                           // 90 x 90, beech (45,45). fr = pankh ki sthiti 0/1/2
    var c = colFn(sh), wa = (fr - 1) * 0.3, i;
    g.translate(45, 0);
    if (type === 'beetle') {                                     // peele-hare V pankh, narangi sar
      sym(g, function () {
        g.save(); g.translate(7, 50); g.rotate(-wa);
        g.fillStyle = lg(g, 0, -44, 34, 0, [[0, c(62, 95, 62)], [1, c(100, 70, 36)]]);
        poly(g, [[0, 8], [8, -8], [20, -28], [30, -46], [36, -36], [31, -18], [40, -6], [20, 12], [0, 16]]); g.fill();
        g.strokeStyle = c(40, 80, 24); g.lineWidth = 1.2; g.stroke();
        g.fillStyle = c(22, 96, 54); poly(g, [[30, -46], [36, -36], [31, -18], [27, -30]]); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(6, 4); g.lineTo(26, -26); g.stroke();
        g.restore();
        g.fillStyle = c(48, 95, 55); poly(g, [[5, 36], [10, 16], [13, 38]]); g.fill();      // sinng
      });
      g.fillStyle = lg(g, -14, 30, 14, 66, [[0, c(28, 98, 62)], [1, c(8, 80, 36)]]);
      g.beginPath(); g.ellipse(0, 44, 14, 17, 0, 0, TAU); g.fill(); g.strokeStyle = c(5, 80, 22); g.lineWidth = 1.2; g.stroke();
      g.fillStyle = rg(g, -2, 54, 1, 0, 56, 14, [[0, c(110, 100, 85)], [0.5, c(125, 90, 45)], [1, c(135, 80, 22)]]);
      g.beginPath(); g.ellipse(0, 55, 8, 14, 0, 0, TAU); g.fill();
      g.fillStyle = c(358, 90, 50); poly(g, [[-6, 66], [6, 66], [0, 82]]); g.fill();
      g.fillStyle = c(200, 100, 60); circ(g, -9, 44, 2.6); g.fill(); circ(g, 9, 44, 2.6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-4, 36, 4, 2.4, -0.5, 0, TAU); g.fill();
    } else if (type === 'moth') {                                // gulabi-laal gol sharir, hari aankh, cyan paron ke gucche
      sym(g, function () {
        for (i = 0; i < 4; i++) {
          g.save(); g.translate(10, 46); g.rotate(-wa + (-0.45 - i * 0.28));
          g.fillStyle = lg(g, 0, 0, 34, 0, [[0, c(165, 90, 42)], [0.6, c(185, 95, 52)], [1, c(210, 100, 70)]]);
          g.beginPath(); g.ellipse(18, 0, 22 - i * 1.5, 4.4, 0, 0, TAU); g.fill();
          g.strokeStyle = c(150, 80, 25); g.lineWidth = 0.8; g.stroke();
          g.restore();
        }
        g.fillStyle = c(345, 90, 55); poly(g, [[8, 56], [16, 66], [8, 70]]); g.fill();
      });
      g.fillStyle = lg(g, 0, 32, 0, 66, [[0, c(335, 92, 60)], [1, c(350, 85, 32)]]);
      g.beginPath(); g.ellipse(0, 48, 15, 15, 0, 0, TAU); g.fill(); g.strokeStyle = c(345, 90, 22); g.lineWidth = 1.3; g.stroke();
      g.fillStyle = rg(g, -2, 44, 1, 0, 48, 9, [[0, c(150, 100, 92)], [0.5, c(155, 90, 52)], [1, c(165, 90, 26)]]);
      g.beginPath(); g.ellipse(0, 48, 8.5, 9.5, 0, 0, TAU); g.fill(); g.strokeStyle = c(345, 85, 20); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, -3, 44, 2); g.fill();
      g.fillStyle = c(345, 90, 45); poly(g, [[-9, 60], [9, 60], [0, 72]]); g.fill();
    } else if (type === 'purple') {                              // baingni gumbad, cyan crystal pankh, narangi pair
      sym(g, function () {
        g.save(); g.translate(8, 42); g.rotate(-wa * 0.8);
        g.fillStyle = lg(g, 0, -40, 20, 0, [[0, c(185, 90, 85)], [1, c(200, 90, 50)]]);
        poly(g, [[0, 6], [4, -20], [12, -34], [16, -20], [26, -30], [24, -4], [14, 8]]); g.fill();
        g.strokeStyle = c(205, 80, 35); g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; poly(g, [[8, 0], [11, -22], [13, -6]]); g.fill();
        g.restore();
        g.fillStyle = c(25, 95, 52); rr(g, 7, 70, 6, 12, 3); g.fill(); rr(g, 14, 66, 5, 10, 3); g.fill();
      });
      g.fillStyle = lg(g, -16, 28, 16, 72, [[0, c(290, 70, 62)], [0.6, c(280, 70, 38)], [1, c(270, 70, 20)]]);
      g.beginPath(); g.moveTo(0, 28); g.bezierCurveTo(18, 30, 20, 56, 8, 74); g.lineTo(-8, 74); g.bezierCurveTo(-20, 56, -18, 30, 0, 28); g.fill();
      g.strokeStyle = c(270, 70, 14); g.lineWidth = 1.3; g.stroke();
      g.strokeStyle = c(290, 70, 72, 0.7); g.lineWidth = 1; for (i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, 58); g.lineTo(i * 3, 72); g.stroke(); }
      g.fillStyle = rg(g, -2, 42, 1, 0, 45, 9, [[0, c(150, 100, 92)], [0.5, c(145, 90, 50)], [1, c(150, 90, 24)]]);
      g.beginPath(); g.arc(0, 45, 8, 0, TAU); g.fill(); g.strokeStyle = c(280, 70, 14); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, -3, 42, 2); g.fill();
    } else if (type === 'crab') {                                // laal kekda, neele lapat jaise pankh
      sym(g, function () {
        for (i = 0; i < 3; i++) {
          g.save(); g.translate(9, 46); g.rotate(-wa + (-0.5 - i * 0.32));
          g.fillStyle = lg(g, 0, 0, 38, 0, [[0, c(215, 85, 40)], [1, c(200, 100, 70)]]);
          poly(g, [[0, 3], [20, 5], [40, 0], [20, -5], [0, -3]]); g.fill();
          g.restore();
        }
        g.fillStyle = lg(g, 4, 36, 22, 64, [[0, c(5, 90, 60)], [1, c(350, 85, 26)]]);
        g.beginPath(); g.ellipse(11, 50, 12, 14, 0.25, 0, TAU); g.fill(); g.strokeStyle = c(350, 90, 16); g.lineWidth = 1.2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(8, 44, 4, 6, 0.3, 0, TAU); g.fill();
        g.fillStyle = c(120, 70, 40); poly(g, [[16, 62], [22, 72], [12, 66]]); g.fill();
      });
      g.fillStyle = lg(g, 0, 40, 0, 70, [[0, c(358, 90, 58)], [1, c(345, 85, 28)]]);
      g.beginPath(); g.moveTo(0, 38); g.lineTo(10, 54); g.lineTo(0, 74); g.lineTo(-10, 54); g.closePath(); g.fill(); g.strokeStyle = c(350, 90, 16); g.lineWidth = 1.2; g.stroke();
      g.fillStyle = c(120, 70, 38); circ(g, 0, 52, 3.5); g.fill();
    } else {                                                     // scarab: hara kavach, peela mukut, cyan pankh
      sym(g, function () {
        g.save(); g.translate(9, 40); g.rotate(-wa);
        g.fillStyle = lg(g, 0, -20, 34, 20, [[0, c(190, 80, 90)], [0.5, c(200, 90, 55)], [1, c(215, 90, 36)]]);
        poly(g, [[0, 0], [12, -14], [30, -12], [38, 6], [28, 24], [10, 28], [0, 22]]); g.fill();
        g.strokeStyle = c(215, 80, 24); g.lineWidth = 1.1; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(8, 0); g.lineTo(30, 4); g.moveTo(8, 10); g.lineTo(26, 16); g.stroke();
        g.restore();
        g.fillStyle = c(50, 95, 55); poly(g, [[3, 22], [14, 10], [10, 26]]); g.fill();
      });
      g.fillStyle = lg(g, -14, 26, 14, 76, [[0, c(125, 75, 50)], [0.5, c(118, 85, 35)], [1, c(110, 85, 18)]]);
      g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(16, 30, 18, 56, 8, 76); g.lineTo(-8, 76); g.bezierCurveTo(-18, 56, -16, 30, 0, 24); g.fill();
      g.strokeStyle = c(110, 80, 12); g.lineWidth = 1.3; g.stroke();
      g.fillStyle = lg(g, -9, 20, 9, 40, [[0, c(55, 100, 75)], [1, c(40, 95, 45)]]);
      g.beginPath(); g.moveTo(0, 12); g.lineTo(11, 32); g.lineTo(-11, 32); g.closePath(); g.fill(); g.strokeStyle = c(35, 90, 25); g.lineWidth = 1; g.stroke();
      g.fillStyle = rg(g, -1, 52, 1, 0, 54, 10, [[0, c(300, 100, 90)], [0.5, c(290, 80, 52)], [1, c(280, 80, 25)]]);
      g.beginPath(); g.ellipse(0, 54, 7, 11, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; circ(g, -2, 50, 1.8); g.fill();
    }
  }
  function enemySpr(type, sh, fr) { return spr('e' + type + sh + fr, 90, 90, function (g) { artEnemy(g, type, sh, fr); }); }

  function artBoss(g, fr) {                                      // 170 x 150
    var wa = (fr - 1) * 0.12, i;
    g.translate(85, 0);
    sym(g, function () {
      for (i = 0; i < 5; i++) {
        g.save(); g.translate(14, 70); g.rotate(-wa - 0.15 - i * 0.2);
        g.fillStyle = lg(g, 0, 0, 80, 0, [[0, '#ffe27a'], [0.5, '#ff9a2a'], [1, '#c8300c']]);
        poly(g, [[0, 6], [40, 8], [78 - i * 6, 0], [40, -8], [0, -6]]); g.fill(); g.strokeStyle = '#7a1a06'; g.lineWidth = 1.2; g.stroke();
        g.restore();
      }
      g.fillStyle = lg(g, 10, 50, 40, 120, [[0, '#ff5a3a'], [1, '#6a0a0a']]);
      poly(g, [[12, 60], [44, 76], [52, 104], [30, 118], [12, 104]]); g.fill(); g.strokeStyle = '#3a0505'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ffd24a'; poly(g, [[44, 76], [52, 104], [46, 100]]); g.fill();
      g.fillStyle = '#ffb02a'; poly(g, [[8, 56], [14, 30], [22, 58]]); g.fill();
    });
    g.fillStyle = lg(g, -26, 40, 26, 130, [[0, '#ff6a4a'], [0.5, '#c81818'], [1, '#5a0808']]);
    g.beginPath(); g.moveTo(0, 36); g.bezierCurveTo(32, 40, 38, 90, 18, 128); g.lineTo(-18, 128); g.bezierCurveTo(-38, 90, -32, 40, 0, 36); g.fill();
    g.strokeStyle = '#3a0505'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffd24a'; poly(g, [[0, 30], [10, 52], [0, 62], [-10, 52]]); g.fill();
    g.fillStyle = rg(g, -4, 82, 2, 0, 86, 20, [[0, '#e8ffff'], [0.4, '#33d0ff'], [1, '#0a5a9a']]);
    g.beginPath(); g.ellipse(0, 86, 15, 21, 0, 0, TAU); g.fill(); g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#2a0404'; circ(g, 0, 86, 6); g.fill(); g.fillStyle = '#ff3a3a'; circ(g, 0, 86, 3.4); g.fill();
    g.fillStyle = '#ffb02a'; poly(g, [[-16, 126], [16, 126], [8, 146], [-8, 146]]); g.fill();
    sym(g, function () { g.fillStyle = '#ffe27a'; poly(g, [[6, 38], [24, 14], [20, 44]]); g.fill(); g.strokeStyle = '#7a1a06'; g.lineWidth = 1; g.stroke(); });
  }
  function bossSpr(fr) { return spr('boss' + fr, 170, 150, function (g) { artBoss(g, fr); }); }

  // =====================================================================
  //                  GOLI, GIFT, PATTHAR, GRAH
  // =====================================================================
  function bulletSpr(k) {                                        // apni goli: jahaj ke hisaab se
    return spr('bul' + k, 24, 44, function (g) {
      g.translate(12, 0);
      if (k === 0) {                                             // hara kaanta
        g.shadowColor = '#4dff3a'; g.shadowBlur = 8;
        g.fillStyle = lg(g, 0, 4, 0, 40, [[0, '#f0ffd8'], [0.35, '#6ae83a'], [1, '#0a8a1c']]);
        poly(g, [[0, 3], [7, 24], [5, 38], [-5, 38], [-7, 24]]); g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.65)'; poly(g, [[0, 8], [2, 24], [-1, 24]]); g.fill();
      } else if (k === 1) {                                      // narangi aag
        g.shadowColor = '#ff7a1a'; g.shadowBlur = 9;
        g.fillStyle = lg(g, 0, 4, 0, 42, [[0, '#fff0a0'], [0.3, '#ffb020'], [0.7, '#f0561c'], [1, '#a81808']]);
        g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(8, 16, 9, 28, 6, 38); g.quadraticCurveTo(0, 44, -6, 38); g.bezierCurveTo(-9, 28, -8, 16, 0, 3); g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,220,.85)'; g.beginPath(); g.ellipse(0, 28, 3, 8, 0, 0, TAU); g.fill();
      } else if (k === 2) {                                      // neeli boond
        g.shadowColor = '#3cc8ff'; g.shadowBlur = 9;
        g.fillStyle = lg(g, 0, 4, 0, 42, [[0, '#f0ffff'], [0.3, '#60d8ff'], [0.75, '#1f8ae8'], [1, '#1448b8']]);
        g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(5, 16, 9, 26, 7, 34); g.quadraticCurveTo(0, 44, -7, 34); g.bezierCurveTo(-9, 26, -5, 16, 0, 3); g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-2, 30, 1.8, 5, 0.1, 0, TAU); g.fill();
      } else {                                                   // gulabi-baingni heera
        g.shadowColor = '#ff5ad8'; g.shadowBlur = 9;
        g.fillStyle = lg(g, 0, 4, 0, 42, [[0, '#ffffff'], [0.3, '#ff7ae8'], [0.7, '#a02be0'], [1, '#4a0f9a']]);
        poly(g, [[0, 3], [8, 22], [0, 42], [-8, 22]]); g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; poly(g, [[0, 9], [3, 22], [0, 30], [-2, 22]]); g.fill();
      }
    });
  }
  function enemyBulletSpr() {
    return spr('ebul', 22, 30, function (g) {
      g.translate(11, 0);
      g.shadowColor = '#ff3a5a'; g.shadowBlur = 8;
      g.fillStyle = lg(g, 0, 2, 0, 28, [[0, '#ffe0e8'], [0.3, '#ff5a7a'], [1, '#b0103a']]);
      g.beginPath(); g.moveTo(0, 28); g.bezierCurveTo(10, 18, 8, 6, 0, 2); g.bezierCurveTo(-8, 6, -10, 18, 0, 28); g.fill();
      g.shadowBlur = 0; g.fillStyle = '#fff'; circ(g, 0, 14, 3); g.fill();
    });
  }
    function nukeSpr() {                                           // asli goli (cartridge): taamba ki nok + peetal ka khol
    return spr('nuke', 34, 62, function (g) {
      g.translate(17, 0);
      g.lineJoin = 'round';
      // peetal ka khol (casing)
      g.fillStyle = lg(g, -8, 0, 8, 0, [[0, '#6e4c08'], [0.18, '#d9a826'], [0.42, '#fff2a8'], [0.65, '#e2b434'], [1, '#6a4806']]);
      g.beginPath(); g.moveTo(-7.4, 25); g.lineTo(7.4, 25); g.lineTo(8.4, 52); g.lineTo(-8.4, 52); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,36,0,.8)'; g.lineWidth = 0.9; g.stroke();
      // khol ke upar ka gola-pan (shoulder)
      g.fillStyle = lg(g, -8, 0, 8, 0, [[0, '#6e4c08'], [0.3, '#e8bd3a'], [0.5, '#fff6b8'], [1, '#6a4806']]);
      g.beginPath(); g.moveTo(-7.4, 25); g.lineTo(7.4, 25); g.lineTo(7.4, 29); g.lineTo(-7.4, 29); g.closePath(); g.fill();
      // goli ki nok (taambe ka jacket)
      g.fillStyle = lg(g, -7.4, 0, 7.4, 0, [[0, '#5a2408'], [0.22, '#c8672a'], [0.45, '#ffb27a'], [0.7, '#c05a22'], [1, '#4a1c06']]);
      g.beginPath(); g.moveTo(0, 1); g.bezierCurveTo(5.2, 6, 7.4, 14, 7.4, 26); g.lineTo(-7.4, 26); g.bezierCurveTo(-7.4, 14, -5.2, 6, 0, 1); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(50,20,0,.85)'; g.lineWidth = 0.9; g.stroke();
      // nok aur khol ke beech ki crimp line
      g.strokeStyle = 'rgba(40,20,0,.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-7.4, 26); g.lineTo(7.4, 26); g.stroke();
      // chamak (specular)
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-2.6, 13, 1.1, 7, 0.08, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-4.6, 31, 1.7, 18);
      // neeche ka patta (extractor groove) aur rim
      g.fillStyle = 'rgba(40,24,0,.75)'; g.fillRect(-8.4, 47.4, 16.8, 1.8);
      g.fillStyle = lg(g, -9.6, 0, 9.6, 0, [[0, '#7a5608'], [0.35, '#f3cf5a'], [0.55, '#fff3b0'], [1, '#6e4c06']]);
      rr(g, -9.6, 52, 19.2, 6, 1.6); g.fill(); g.strokeStyle = 'rgba(60,36,0,.8)'; g.lineWidth = 0.9; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-7.5, 53, 3, 1.2);
    });
    }
  function pickupSpr(kind) {                                     // 56 x 56 gift ke nishaan
    return spr('pk' + kind, 56, 56, function (g) {
      g.translate(28, 28);
      var i;
      if (kind === 'power') {                                    // hexagon + chevron
        g.shadowColor = '#3cd8ff'; g.shadowBlur = 8;
        g.fillStyle = lg(g, 0, -22, 0, 22, [[0, '#2a8ac8'], [1, '#08264e']]);
        g.beginPath(); for (i = 0; i < 6; i++) g.lineTo(Math.cos(i * PI / 3 + PI / 6) * 22, Math.sin(i * PI / 3 + PI / 6) * 22); g.closePath(); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.stroke();
        g.strokeStyle = '#7ae8ff'; g.lineWidth = 3.6; g.lineCap = 'round'; g.lineJoin = 'round';
        for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-9, 6 - i * 7); g.lineTo(0, -2 - i * 7); g.lineTo(9, 6 - i * 7); g.stroke(); }
      } else if (kind === 'ship') {                              // sone ka ring + chhota jahaj
        g.shadowColor = '#ffd24a'; g.shadowBlur = 8;
        g.fillStyle = lg(g, 0, -22, 0, 22, [[0, '#5a2fb0'], [1, '#1c0a4a']]); circ(g, 0, 0, 22); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#ffe27a'; poly(g, [[0, -15], [5, -2], [16, 10], [16, 14], [5, 9], [0, 16], [-5, 9], [-16, 14], [-16, 10], [-5, -2]]); g.fill();
        g.fillStyle = '#7ae8ff'; g.beginPath(); g.ellipse(0, -1, 2.4, 6, 0, 0, TAU); g.fill();
      } else if (kind === 'rapid') {                             // bijli
        g.shadowColor = '#ffb020'; g.shadowBlur = 8;
        g.fillStyle = lg(g, 0, -22, 0, 22, [[0, '#ffa020'], [1, '#c83a0a']]); circ(g, 0, 0, 22); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#fff2a8'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#fffbe0'; poly(g, [[4, -16], [-9, 3], [-1, 3], [-5, 16], [9, -3], [1, -3]]); g.fill();
      } else if (kind === 'shield') {                            // shield
        g.shadowColor = '#4ab8ff'; g.shadowBlur = 8;
        g.fillStyle = lg(g, 0, -22, 0, 22, [[0, '#3a8ae8'], [1, '#0a2a7a']]); circ(g, 0, 0, 22); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#bfe8ff'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#eaf8ff'; g.beginPath(); g.moveTo(0, -14); g.lineTo(11, -9); g.quadraticCurveTo(11, 8, 0, 15); g.quadraticCurveTo(-11, 8, -11, -9); g.closePath(); g.fill();
        g.fillStyle = '#2a8ae8'; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, -6); g.quadraticCurveTo(7, 5, 0, 10); g.closePath(); g.fill();
      } else {                                                   // boost attack = peela missile
        g.shadowColor = '#ffd24a'; g.shadowBlur = 9;
        g.drawImage(nukeSpr(), -14, -26, 28, 51);
      }
    });
  }
  var starburst = function () {                                  // gift ke peeche ki peeli chamak
    return spr('burst', 100, 100, function (g) {
      g.translate(50, 50);
      for (var i = 0; i < 14; i++) {
        g.save(); g.rotate(i * TAU / 14); g.fillStyle = i % 2 ? 'rgba(255,230,90,.85)' : 'rgba(255,190,40,.7)';
        poly(g, [[-4, 0], [0, -(i % 2 ? 40 : 29)], [4, 0]]); g.fill(); g.restore();
      }
      g.fillStyle = rg(g, 0, 0, 0, 0, 0, 30, [[0, 'rgba(255,255,200,.9)'], [1, 'rgba(255,200,40,0)']]); circ(g, 0, 0, 30); g.fill();
    });
  };

  function rockSpr(v) {                                          // mitti-patthar ka gola (aasmaani chattaan)
    return spr('rock' + v, 110, 110, function (g) {
      var R = seeded(v * 977 + 13), n = 13, pts = [], i, a;
      for (i = 0; i < n; i++) { a = i / n * TAU; pts.push([55 + Math.cos(a) * (40 + R() * 11), 55 + Math.sin(a) * (40 + R() * 11)]); }
      g.beginPath(); g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
      for (i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      g.closePath();
      g.fillStyle = rg(g, 40, 38, 4, 56, 56, 58, [[0, '#f4e6bc'], [0.45, '#c8aa72'], [0.8, '#7a5e38'], [1, '#3a2a18']]); g.fill();
      g.save(); g.clip();
      for (i = 0; i < 7; i++) {                                  // gaddhe
        var cx = 20 + R() * 70, cy = 20 + R() * 70, cr = 6 + R() * 12;
        g.fillStyle = rg(g, cx + cr * 0.3, cy + cr * 0.3, 1, cx, cy, cr, [[0, 'rgba(60,40,20,.75)'], [0.75, 'rgba(90,66,36,.55)'], [1, 'rgba(250,235,200,.5)']]);
        circ(g, cx, cy, cr); g.fill();
        g.strokeStyle = 'rgba(255,240,205,.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, cr, PI * 0.9, PI * 1.9); g.stroke();
      }
      g.fillStyle = rg(g, 70, 76, 6, 60, 60, 60, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,5,0,.55)']]); g.fillRect(0, 0, 110, 110);
      g.restore();
      g.strokeStyle = 'rgba(40,26,12,.8)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
      for (i = 0; i < n; i++) { var p2 = pts[i], q2 = pts[(i + 1) % n]; g.quadraticCurveTo(p2[0], p2[1], (p2[0] + q2[0]) / 2, (p2[1] + q2[1]) / 2); }
      g.closePath(); g.stroke();
    });
  }
   // grah (planet) - background ke liye
  function planetSpr(kind, r) {
    var S = Math.ceil(r * 2 * (kind === 'ringed' ? 1.7 : 1.08));
    return spr('pl' + kind + r, S, S, function (g) {
      var R = seeded(kind.length * 31 + r), c = S / 2, i, pal;
      pal = {
        mars: ['#e0643a', '#8a2a10', '#2a0a06', '#ff9a6a', '#5a1608'],
        rock: ['#4a4a82', '#1c1c46', '#0a0a24', '#7a7ab8', '#10102e'],
        violet: ['#a848c8', '#4a1068', '#14042a', '#d890f0', '#2a0a48'],
        ringed: ['#4aa8ff', '#1a4ab0', '#06143a', '#9adcff', '#0a2a70'],
        teal: ['#32c8a0', '#0e6a58', '#032820', '#8affd8', '#064a3a']
      }[kind];
      if (kind === 'ringed') {
        g.save(); g.translate(c, c); g.rotate(-0.35); g.scale(1, 0.28);
        g.strokeStyle = 'rgba(200,225,255,.5)'; g.lineWidth = r * 0.18; g.beginPath(); g.arc(0, 0, r * 1.45, PI, TAU); g.stroke();
        g.strokeStyle = 'rgba(150,190,255,.38)'; g.lineWidth = r * 0.1; g.beginPath(); g.arc(0, 0, r * 1.2, PI, TAU); g.stroke();
        g.restore();
      }
      g.save(); circ(g, c, c, r); g.clip();
      g.fillStyle = rg(g, c - r * 0.35, c - r * 0.35, r * 0.1, c, c, r, [[0, pal[0]], [0.55, pal[1]], [1, pal[2]]]); g.fillRect(0, 0, S, S);
      for (i = 0; i < 26; i++) {                                 // dhabbe / gaddhe
        var x = c + (R() - 0.5) * r * 2, y = c + (R() - 0.5) * r * 2, rx = r * (0.1 + R() * 0.3), ry = rx * (0.3 + R() * 0.6);
        g.fillStyle = R() > 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,' + (0.05 + R() * 0.12) + ')';
        g.beginPath(); g.ellipse(x, y, rx, ry, R() * PI, 0, TAU); g.fill();
        if (kind === 'rock' || kind === 'violet') { g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke(); }
      }
      if (kind === 'mars') {                                     // neela samundar / barf ka dhabba
        g.fillStyle = rg(g, c - r * 0.45, c + r * 0.55, 1, c - r * 0.45, c + r * 0.55, r * 0.3, [[0, 'rgba(210,235,255,.9)'], [0.6, 'rgba(90,150,210,.7)'], [1, 'rgba(90,150,210,0)']]);
        g.fillRect(0, 0, S, S);
      }
      g.fillStyle = rg(g, c + r * 0.45, c + r * 0.45, r * 0.2, c, c, r * 1.12, [[0, 'rgba(0,0,0,0)'], [0.65, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,.88)']]); g.fillRect(0, 0, S, S);
      g.restore();
      g.strokeStyle = 'rgba(' + (kind === 'mars' ? '255,140,90' : '140,160,255') + ',.4)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, r - 1, PI * 0.9, PI * 1.7); g.stroke();
      if (kind === 'ringed') {
        g.save(); g.translate(c, c); g.rotate(-0.35); g.scale(1, 0.28);
        g.strokeStyle = 'rgba(200,225,255,.55)'; g.lineWidth = r * 0.18; g.beginPath(); g.arc(0, 0, r * 1.45, 0, PI); g.stroke();
        g.strokeStyle = 'rgba(150,190,255,.4)'; g.lineWidth = r * 0.1; g.beginPath(); g.arc(0, 0, r * 1.2, 0, PI); g.stroke();
        g.restore();
      }
    });
  }

  // =====================================================================
  //          BACKGROUND (har 30 second mein badalta hai, rangeen)
  // =====================================================================
  var BGS = [
    { base: ['#1c0408', '#3e0c0a'], blobs: ['#d03a1a', '#ff8a2a', '#a01030', '#ff5a3a'], planets: [['mars', 82, 0.74, 0.3], ['rock', 44, 0.22, 1.35], ['mars', 30, 0.88, 2.1]], comet: false, stars: '255,225,190' },
    { base: ['#07052e', '#1a0c5c'], blobs: ['#6a30d0', '#c040ff', '#3a56ff', '#a020a0'], planets: [['rock', 74, 0.8, 0.45], ['rock', 120, 0.2, 1.55]], comet: true, stars: '210,200,255' },
    { base: ['#14041f', '#40084c'], blobs: ['#e0208c', '#8a22d0', '#ff5aa0', '#5a1aa0'], planets: [['violet', 128, 0.72, 0.5], ['violet', 40, 0.12, 0.2], ['rock', 28, 0.9, 1.7]], comet: false, stars: '255,210,255' },
    { base: ['#020a26', '#06307c'], blobs: ['#10a0ff', '#2060ff', '#20e0d0', '#6a40ff'], planets: [['ringed', 62, 0.25, 0.6], ['rock', 52, 0.82, 1.6]], comet: true, stars: '200,235,255' },
    { base: ['#02100c', '#04322a'], blobs: ['#14c08a', '#0a8a70', '#a0ff50', '#10a0a0'], planets: [['teal', 92, 0.3, 0.55], ['rock', 38, 0.85, 1.4]], comet: false, stars: '200,255,230' }
  ];
  var BGS_N = BGS.length, bg = null, bgPrev = null, bgFade = 1, bgIdx = 0, bgT = 0, bgScroll = 0, streaks = [];

  function buildBG(idx) {
    var T = BGS[idx % BGS_N], BS = SS * 0.55, R = Math.random, i, k;
    var neb = mk(Math.ceil(W * BS), Math.ceil(H * BS)), g = neb.getContext('2d');
    g.scale(BS, BS);
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, T.base[0]], [0.5, T.base[1]], [1, T.base[0]]]); g.fillRect(0, 0, W, H);   // upar-neeche ek jaisa (jod dikhe nahi)
    for (i = 0; i < 16; i++) {                                   // badal jaise rangeen dhundh (upar-neeche jodne par seedhe mil jaate hain)
      var bx = R() * W, by = R() * H, br = 120 + R() * 200, col = T.blobs[ri(T.blobs.length)], a = 0.10 + R() * 0.2;
      for (k = -1; k <= 1; k++) {
        g.fillStyle = rg(g, bx, by + k * H, 0, bx, by + k * H, br, [[0, hexA(col, a)], [0.55, hexA(col, a * 0.45)], [1, hexA(col, 0)]]);
        g.fillRect(bx - br, by + k * H - br, br * 2, br * 2);
      }
    }
    g.lineCap = 'round';
    for (i = 0; i < 26; i++) {                                   // dhool ki lakeeren
      var sx = R() * W, sy = R() * H, len = 80 + R() * 200, ang = R() * PI, col2 = T.blobs[ri(T.blobs.length)];
      for (k = -1; k <= 1; k++) {
        g.strokeStyle = hexA(col2, 0.05 + R() * 0.1); g.lineWidth = 1 + R() * 3;
        g.beginPath(); g.moveTo(sx, sy + k * H); g.quadraticCurveTo(sx + Math.cos(ang) * len * 0.5 + 30, sy + k * H + Math.sin(ang) * len * 0.5 - 30, sx + Math.cos(ang) * len, sy + k * H + Math.sin(ang) * len); g.stroke();
      }
    }
    if (T.comet) {                                               // lambi chamakti poonchh
      var cx = R() * W * 0.5, cy = H * (0.2 + R() * 0.5);
      for (k = -1; k <= 1; k++) {
        g.save(); g.translate(cx, cy + k * H); g.rotate(-0.8);
        g.fillStyle = lg(g, 0, 0, 380, 0, [[0, 'rgba(255,255,255,.0)'], [0.25, 'rgba(170,140,255,.28)'], [0.9, 'rgba(230,220,255,.8)'], [1, 'rgba(255,255,255,.95)']]);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(380, -7); g.arc(380, 0, 7, -PI / 2, PI / 2); g.lineTo(0, 0); g.fill();
        g.restore();
      }
    }
    var st = mk(Math.ceil(W * SS), Math.ceil(H * SS)), s = st.getContext('2d');
    s.scale(SS, SS);
    for (i = 0; i < 150; i++) {                                  // taare
      var x = R() * W, y = R() * H, r = R() < 0.1 ? 1.5 + R() : 0.4 + R() * 0.9;
      s.fillStyle = 'rgba(' + T.stars + ',' + (0.3 + R() * 0.6) + ')'; s.beginPath(); s.arc(x, y, r, 0, TAU); s.fill();
      if (r > 1.5) { s.strokeStyle = 'rgba(' + T.stars + ',.5)'; s.lineWidth = 0.6; s.beginPath(); s.moveTo(x - r * 3, y); s.lineTo(x + r * 3, y); s.moveTo(x, y - r * 3); s.lineTo(x, y + r * 3); s.stroke(); }
    }
    var pl = [];
    for (i = 0; i < T.planets.length; i++) {
      var d = T.planets[i];
      pl.push({ spr: planetSpr(d[0], d[1]), x: d[2] * W + (R() - 0.5) * 40, y0: d[3] * H * 2.2, kind: d[0], mul: d[0] === 'rock' ? 0.9 : 0.55 });
    }
    return { neb: neb, stars: st, planets: pl };
  }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function drawBGLayer(b, al) {
    var off, y, i, p, LOOP = H * 2.2, py;
    ctx.globalAlpha = al;
    off = bgScroll * 0.35 % H;                                   // dhundh: sabse dheere
    ctx.drawImage(b.neb, 0, off - H, W, H); ctx.drawImage(b.neb, 0, off, W, H);
    off = bgScroll * 0.55 % H;                                   // taare
    ctx.drawImage(b.stars, 0, off - H, W, H); ctx.drawImage(b.stars, 0, off, W, H);
    for (i = 0; i < b.planets.length; i++) {                     // grah / chattaan: beech ki raftaar
      p = b.planets[i]; py = (p.y0 + bgScroll * p.mul) % LOOP - p.spr.lh;
      if (py > -p.spr.lh && py < H + p.spr.lh) ctx.drawImage(p.spr, p.x - p.spr.lw / 2, py - p.spr.lh / 2, p.spr.lw, p.spr.lh);
    }
    ctx.globalAlpha = 1;
  }

  function initStreaks() {
    streaks = [];
    for (var i = 0; i < 34; i++) streaks.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(1.6, 3.4), l: rnd(8, 22), a: rnd(0.12, 0.35) });
  }

  function drawBG() {
    var i, s;
    if (!bg) bg = buildBG(bgIdx);
    if (bgFade < 1 && bgPrev) { drawBGLayer(bgPrev, 1); drawBGLayer(bg, bgFade); }
    else drawBGLayer(bg, 1);
    ctx.lineCap = 'round'; ctx.lineWidth = 1.1;
    for (i = 0; i < streaks.length; i++) {                       // tez taare: upar udne ka ehsaas
      s = streaks[i];
      ctx.strokeStyle = 'rgba(255,255,255,' + s.a + ')';
      ctx.beginPath(); ctx.moveTo(s.x, s.y - s.l); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
  }

  // =====================================================================
  //                          GAME KI STHITI
  // =====================================================================
  var scl = 1, ox = 0, oy = 0;
  var state = 'menu', clock = 0, score = 0, kills = 0, timeLeft = 0, last = 0, dtS = 0.016, sndT = 0, diveT = 0, shake = 0;
  var P = null, enemies = [], pb = [], eb = [], pickups = [], parts = [], pops = [];
  var wv = null, banner = null, bgNext = null;
  var keys = {}, ptr = null, lx = 0, ly = 0, touching = false, touchX = 0, touchY = 0;
  var maxLevel = 1;

  function resetGame() {
    score = 0; kills = 0; timeLeft = C.GAME_TIME; enemies = []; pb = []; eb = []; pickups = []; parts = []; pops = []; shake = 0; diveT = 0; maxLevel = 1;
    P = { x: W / 2, y: H + 70, tx: W / 2, ty: H - 150, alive: true, ship: 0, bullets: C.START_BULLETS, rapidT: 0, shieldT: 0, boostT: 0, boostEl: 0, boostAcc: 0, fireT: 0, invul: C.SAFE_TIME, waitT: 0, spd: 0, px: W / 2, py: H + 70 };
    wv = { level: 1, wave: 0, state: 'gap', t: 0.5, queue: [], qt: 0 };
    banner = null; bgIdx = 0; bgFade = 1; bgPrev = null; bg = null; bgNext = null; bgT = 0;
  }

  // ---------------------------------------------------------------------
  //                            Alien banana
  // ---------------------------------------------------------------------
   function fireScale() { return Math.max(0.4, 1 - C.FIRE_FASTER_PER_LEVEL * (wv.level - 1)); }
  function hpMul() { return 1 + (wv.level - 1) * C.HP_PER_LEVEL; }

  function mkEnemy(type, x, y) {
    var d = C.ENEMIES[type], e = { type: type, x: x, y: y, vx: 0, vy: 0, age: 0, flash: 0, ph: rnd(0, 9), sh: ri(clamp(C.COLOR_VARIANTS, 1, 5)), mode: 'fall', dead: false, rock: false, rot: 0 };
    e.size = d.size; e.hp = e.maxhp = Math.max(1, Math.round(d.hp * hpMul())); e.pts = d.pts; e.r = d.size * (type === 'boss' ? 0.36 : 0.3);
    e.fireT = d.fire[1] > 0 ? rnd(d.fire[0], d.fire[1]) * fireScale() : 1e9;
    return e;
  }
  function spawnStream(type, side, y0, amp, dur, cyc) {
    var e = mkEnemy(type, side < 0 ? -50 : W + 50, y0);
    e.mode = 'stream'; e.x0 = e.x; e.x1 = side < 0 ? W + 50 : -50; e.y0 = y0; e.amp = amp; e.dur = dur / C.STREAM_SPEED; e.cyc = cyc; e.sp = rnd(0, TAU); e.rise = rnd(50, 110);
    enemies.push(e);
  }
  function spawnEnter(type, side, tx, ty) {
    var e = mkEnemy(type, side < 0 ? -50 : W + 50, ty - rnd(30, 170));
    e.mode = 'enter'; e.sx = e.x; e.sy = e.y; e.tx = tx; e.ty = ty; e.dur = rnd(1.7, 2.2) / C.ENTER_SPEED; e.amp = rnd(40, 80) * (Math.random() < 0.5 ? 1 : -1); e.riseLeft = rnd(30, 70); e.hx = tx; e.hy = ty;
    enemies.push(e);
  }
  function spawnRock() {
    var A = C.ASTEROID, r = Math.random(), sc = r < 0.5 ? 0 : (r < 0.85 ? 1 : 2), e;
    e = { type: 'rock', rock: true, x: rnd(30, W - 30), y: -70, vx: rnd(-45, 45), vy: rnd(A.speed[0], A.speed[1]) * (sc === 2 ? 0.8 : 1), age: 0, flash: 0, ph: 0, sh: 0, mode: 'fall', dead: false, rot: rnd(0, TAU), spin: rnd(-1.5, 1.5), v: ri(4), sc: sc, trailT: 0 };
    e.size = A.size[sc]; e.hp = e.maxhp = Math.max(1, Math.round(A.hp[sc] * (1 + (wv.level - 1) * C.HP_PER_LEVEL * 0.5))); e.pts = A.pts; e.r = e.size * 0.4; e.fireT = 1e9;
    enemies.push(e);
  }
  function spawnBoss() {
    var e = mkEnemy('boss', W / 2, -110);
    e.mode = 'boss'; e.r = 54; Snd.boss(); enemies.push(e);
  }

  function makeWave(L, w) {
    var q = [], n = C.ENEMIES_PER_WAVE + (L - 1) * C.MORE_PER_LEVEL, i, tier = Math.min(4, Math.floor((w - 1) / 2) + Math.floor((L - 1) / 2));
    function pt() { return ETYPES[clamp(tier - ri(2), 0, 4)]; }
    function add(t, f) { q.push({ t: t, f: f }); }
    function addStream(t, type, side, y0, amp, dur, cyc) { add(t, function () { spawnStream(type, side, y0, amp, dur, cyc); }); }
    function addEnter(t, type, side, tx, ty) { add(t, function () { spawnEnter(type, side, tx, ty); }); }
    if (C.ASTEROID_WAVES.indexOf(w) >= 0) {                         // patthar ki baarish
      var cnt = C.ASTEROID_COUNT + (L - 1) * 2;
      add(0, function () { Snd.rockFall(); });
      for (i = 0; i < cnt; i++) add(0.6 + i * 0.5 + rnd(0, 0.25), spawnRock);
    } else if (C.BOSS_AT_END && w === C.WAVES_PER_LEVEL) {          // boss
      add(0, spawnBoss);
      for (i = 0; i < 8; i++) addStream(4 + i * 0.8, ETYPES[clamp(tier - ri(2), 0, 4)], i % 2 ? -1 : 1, 150 + (i % 3) * 60, 50, 6, 1.5);
    } else if (w % 2 === 1) {                                       // udte hue alien (side se aate, lehrate hue guzarte hain)
      var groups = 2 + (L > 2 ? 1 : 0), per = Math.ceil(n / groups), g, j, y0, t0, side, ty = pt(), dur = Math.max(4.2, 6.2 - L * 0.25);
      for (g = 0; g < groups; g++) {
        side = (g + w) % 2 ? -1 : 1; y0 = rnd(110, H * 0.34); t0 = g * (per * 0.36 + 1.3); ty = pt();
        for (j = 0; j < per; j++) {
          addStream(t0 + j * 0.36, ty, side, y0, rnd(40, 70), dur, 1.5);
          if (w % 4 === 1) addStream(t0 + j * 0.36, ty, -side, y0 + 90, rnd(40, 70), dur, 1.5);      // dono taraf se
        }
      }
    } else {                                                        // formation (side se aakar jagah le lete hain)
      var cols = n >= 24 ? 7 : 6, rows, sp = Math.min(58, (W - 70) / (cols - 1)), row, col;
      n = Math.min(n, cols * 5); rows = Math.ceil(n / cols);
      for (i = 0; i < n; i++) {
        row = Math.floor(i / cols); col = i % cols;
        addEnter(i * 0.12 / C.ENTER_SPEED, ETYPES[clamp(tier - ri(2) + (row === 0 ? 1 : 0), 0, 4)], i % 2 ? -1 : 1, W / 2 + (col - (cols - 1) / 2) * sp, 120 + row * 56);
      }
    }
    return q;
  }

  // ---------------------------------------------------------------------
  //                   wave aur level ka sanchalan
  // ---------------------------------------------------------------------
  function showBanner(l1, l2, dur) { banner = { l1: l1, l2: l2, t: 0, dur: dur }; }

  function startWave() {
    wv.wave++;
    if (wv.wave > C.WAVES_PER_LEVEL) { wv.wave = 1; wv.level++; maxLevel = wv.level; showBanner('LEVEL', String(wv.level), 2.4); Snd.levelUp(); wv.state = 'banner'; wv.t = 2.4; wv.queue = makeWave(wv.level, 1); wv.qt = 0; return; }
    wv.queue = makeWave(wv.level, wv.wave); wv.qt = 0; wv.state = 'banner'; wv.t = 2.1;
    showBanner('Wave', wv.wave + '/' + C.WAVES_PER_LEVEL, 2.1); Snd.wave();
  }

  function director(dt) {
    var q;
    if (wv.state === 'gap') { wv.t -= dt; if (wv.t <= 0) startWave(); }
    else if (wv.state === 'banner') { wv.t -= dt; if (wv.t <= 0) wv.state = 'fight'; }
    else if (wv.state === 'fight') {
      wv.qt += dt;
      while (wv.queue.length && wv.queue[0].t <= wv.qt) { q = wv.queue.shift(); q.f(); }
      if (!wv.queue.length && !enemies.length) {
        if (wv.wave >= C.WAVES_PER_LEVEL) { wv.state = 'gap'; wv.t = C.WAVE_GAP + 1.4; showBanner('LEVEL', 'CLEAR!', 2.2); Snd.levelUp(); }
        else { wv.state = 'gap'; wv.t = C.WAVE_GAP; }
      }
    }
  }

  // ---------------------------------------------------------------------
  //                    explosion / chingari / gift
  // ---------------------------------------------------------------------
  function part(k, x, y, vx, vy, life, size, col, ex) {
    if (parts.length > 460) return;
    var p = { k: k, x: x, y: y, vx: vx, vy: vy, life: life, max: life, s: size, col: col, rot: rnd(0, TAU), vr: rnd(-6, 6), ex: ex || 0 };
    parts.push(p);
  }
  function explosion(x, y, s, col) {                                // s: 0.5 chhota ... 3 bada
    var i, a, v;
    col = col || 'fire';
    part(0, x, y, 0, 0, 0.2, 34 * s, 'hot');
    for (i = 0; i < 5 + s * 4; i++) { a = rnd(0, TAU); v = rnd(20, 110) * s; part(0, x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, Math.cos(a) * v, Math.sin(a) * v, rnd(0.35, 0.8), rnd(22, 40) * s, col); }
    for (i = 0; i < 6 + s * 6; i++) { a = rnd(0, TAU); v = rnd(110, 330) * Math.min(1.6, s); part(1, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.7), rnd(8, 16), col); }
    part(4, x, y, 0, 0, 0.4, 18 * s, col);
    for (i = 0; i < 2 + s * 2; i++) { a = rnd(0, TAU); v = rnd(40, 160) * s; part(3, x, y, Math.cos(a) * v, Math.sin(a) * v - 30, rnd(0.6, 1.1), rnd(3, 6) * Math.min(s, 1.6), '#ffcf7a'); }
    for (i = 0; i < 2; i++) part(2, x + rnd(-8, 8), y + rnd(-8, 8), rnd(-20, 20), rnd(-30, 10), rnd(0.8, 1.3), rnd(20, 34) * s, 'smoke');
    if (s >= 1.5 && C.SHAKE !== 0) shake = Math.max(shake, Math.min(1, s / 3));
  }
  function popup(x, y, txt, col) { pops.push({ x: x, y: y, t: 0, txt: txt, col: col || '#ffe27a' }); }

  function maybeDrop(x, y, force) {
    if (!force && Math.random() >= C.DROP_CHANCE) return;
    var W2 = C.DROP_WEIGHTS, tot = 0, k, r;
    for (k in W2) tot += W2[k];
    if (tot <= 0) return;
    r = Math.random() * tot;
    for (k in W2) { r -= W2[k]; if (r <= 0) break; }
    pickups.push({ kind: k, x: clamp(x, 30, W - 30), y: y, age: 0, ph: rnd(0, 6) });
  }

  function killEnemy(e) {
    e.dead = true; score += e.pts;
    if (e.rock) { explosion(e.x, e.y, 0.8 + e.sc * 0.5, 'fire'); Snd.rock(1 + e.sc * 0.5); for (var i = 0; i < 5; i++) part(3, e.x, e.y, rnd(-130, 130), rnd(-130, 60), rnd(0.7, 1.3), rnd(4, 9), '#c8aa72'); }
    else {
      kills++;
      if (e.type === 'boss') {
        for (var k = 0; k < 7; k++) explosion(e.x + rnd(-60, 60), e.y + rnd(-40, 40), rnd(1.2, 2.2), k % 2 ? 'fire' : 'hot');
        explosion(e.x, e.y, 3.2, 'fire'); Snd.explode(2); Snd.rock(2); Snd.die();
        maybeDrop(e.x - 40, e.y, true); maybeDrop(e.x + 40, e.y, true); maybeDrop(e.x, e.y + 20, true);
        popup(e.x, e.y - 30, '+' + e.pts, '#ffe27a');
      } else {
        explosion(e.x, e.y, 0.7 + e.size / 90, e.type === 'moth' || e.type === 'purple' ? 'purple' : 'fire'); Snd.explode(0.6 + e.size / 120);
        maybeDrop(e.x, e.y, false);
      }
    }
  }

  // ---------------------------------------------------------------------
  //                              Player
  // ---------------------------------------------------------------------
  function shipFlameColor() { return ['blue', 'fire', 'green', 'purple'][P.ship]; }

  function fireGun() {
    var n = P.bullets, i, off, S = C.SHIPS[P.ship];
    for (i = 0; i < n; i++) {
      off = i - (n - 1) / 2;
      pb.push({ x: P.x + off * C.BULLET_SPACING, y: P.y - 46, vx: off * C.BULLET_FAN, vy: -C.BULLET_SPEED, dmg: S.damage, k: P.ship, r: 6, missile: false });
    }
    Snd.shoot(P.ship);
  }
  function fireBoost(count) {
    var i;
    for (i = 0; i < count; i++) pb.push({ x: P.x + rnd(-42, 42), y: P.y - 20, vx: rnd(-90, 90), vy: -rnd(380, 520), dmg: C.BOOST_DAMAGE, k: 9, r: 8, missile: true, trail: 0 });
  }

  function hurtPlayer(src) {
    if (!P.alive || P.invul > 0) return false;
    if (P.shieldT > 0) { explosion(P.x, P.y - 20, 0.5, 'blue'); P.invul = 0.4; return false; }
    P.alive = false; P.waitT = C.WAIT_AFTER_HIT;
    explosion(P.x, P.y, 2.2, 'fire'); explosion(P.x, P.y, 1.2, 'hot'); Snd.die();
    P.bullets = Math.max(C.START_BULLETS, P.bullets - C.DEATH_LEVEL_LOSS);
    P.rapidT = 0; P.shieldT = 0; P.boostT = 0; eb.length = 0;
    touching = false;
    return true;
  }
  function respawn() {
    P.alive = true; P.x = W / 2; P.y = H + 70; P.tx = W / 2; P.ty = H - 150; P.invul = C.SAFE_TIME; P.fireT = 0.3;
    Snd.respawn();
  }
  function collect(k) {
    if (k === 'power') { if (P.bullets < C.MAX_BULLETS) P.bullets++; popup(P.x, P.y - 60, P.bullets >= C.MAX_BULLETS ? 'MAX GUN!' : 'GUN +1', '#7ae8ff'); }
    else if (k === 'ship') {
      if (P.ship < C.SHIPS.length - 1) { P.ship++; popup(P.x, P.y - 60, 'NEW SHIP!', '#ffe27a'); }
      else { if (P.bullets < C.MAX_BULLETS) P.bullets++; popup(P.x, P.y - 60, 'GUN +1', '#7ae8ff'); }
      explosion(P.x, P.y, 0.9, 'gold');
    }
    else if (k === 'rapid') { P.rapidT = C.RAPID_TIME; popup(P.x, P.y - 60, 'SPEED!', '#ffb020'); }
    else if (k === 'shield') { P.shieldT = C.SHIELD_TIME; popup(P.x, P.y - 60, 'SHIELD!', '#7ac8ff'); }
    else { P.boostT = C.BOOST_TIME; P.boostEl = 0; P.boostAcc = 0; popup(P.x, P.y - 60, 'BOOST ATTACK!', '#ffe27a'); }
    Snd.pickup(k);
  }

  function enemyFire(e) {
    var sp = C.ENEMY_BULLET_SPEED, a, i, n;
    if (e.type === 'boss') {
      n = e.hp < e.maxhp * 0.5 ? 7 : 5;
      for (i = 0; i < n; i++) { a = PI / 2 + (i - (n - 1) / 2) * 0.22; eb.push({ x: e.x, y: e.y + 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 }); }
    } else {
      a = PI / 2;
      if (P.alive && Math.random() < C.ENEMY_AIM) a = Math.atan2(P.y - e.y, P.x - e.x);
      eb.push({ x: e.x, y: e.y + e.size * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 });
    }
    Snd.enemyShoot();
  }

  // ---------------------------------------------------------------------
  //                              UPDATE
  // ---------------------------------------------------------------------
  function updEnemy(e, dt) {
    var u, ease, dx, dy, d, px, py, ln;
    e.age += dt; if (e.flash > 0) e.flash -= dt;
    if (e.mode === 'enter') {
      u = Math.min(1, e.age / e.dur); ease = u * u * (3 - 2 * u);
      dx = e.tx - e.sx; dy = e.ty - e.sy; ln = Math.sqrt(dx * dx + dy * dy) || 1; px = -dy / ln; py = dx / ln;
      d = e.amp * Math.sin(u * PI * 2);
      e.x = lerp(e.sx, e.tx, ease) + px * d; e.y = lerp(e.sy, e.ty, ease) + py * d;
      if (u >= 1) { e.mode = 'hold'; e.holdT = 0; }
    } else if (e.mode === 'hold') {
      e.holdT += dt;
      if (e.riseLeft > 0) { d = Math.min(e.riseLeft, C.ENEMY_RISE * dt); e.hy -= d; e.riseLeft -= d; }
      e.x = e.hx + Math.sin(e.holdT * 0.9 + e.ph) * 14; e.y = e.hy + Math.sin(e.holdT * 1.3 + e.ph) * 5;
    } else if (e.mode === 'stream') {
      u = e.age / e.dur;
      e.x = lerp(e.x0, e.x1, u); e.y = e.y0 + e.amp * Math.sin(u * e.cyc * TAU + e.sp) - e.rise * u;
      if (u >= 1) e.dead = true;
    } else if (e.mode === 'dive') {
      e.vx += clamp((P.x - e.x) * 1.1, -260, 260) * dt; e.vx = clamp(e.vx, -200, 200);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.y > H + 70) e.dead = true;
    } else if (e.mode === 'boss') {
      if (e.y < 150) e.y += 80 * dt;
      else e.x = W / 2 + Math.sin((e.age - 1.8) * 0.55) * (W * 0.26);
    } else {                                                        // patthar
      e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt;
      e.trailT -= dt;
      if (e.trailT <= 0) { e.trailT = 0.055; part(2, e.x + rnd(-6, 6), e.y - e.size * 0.5, rnd(-10, 10), -rnd(10, 40), rnd(0.5, 0.9), e.size * rnd(0.35, 0.55), 'smoke'); }
      if (e.y > H + 130 || e.x < -90 || e.x > W + 90) e.dead = true;
    }
    if ((e.mode === 'hold' || e.mode === 'stream' || e.mode === 'boss') && e.y > 10 && e.y < H - 120 && P.alive && wv.state !== 'banner') {
      e.fireT -= dt;
      if (e.fireT <= 0) { enemyFire(e); var f = C.ENEMIES[e.type].fire; e.fireT = rnd(f[0], f[1]) * fireScale(); }
    }
  }

  function hittable(e) { return e.x > -8 && e.x < W + 8 && e.y > -8 && e.y < H; }

  function update(dt) {
    var i, j, e, b, d, any;
    clock += dt; timeLeft -= dt; bgT += dt;
    if (bgT > C.BG_CHANGE_SEC - 6 && !bgNext) bgNext = buildBG(bgIdx + 1);
    if (bgT >= C.BG_CHANGE_SEC) { bgT = 0; bgPrev = bg; bgIdx++; bg = bgNext || buildBG(bgIdx); bgNext = null; bgFade = 0; }
    if (bgFade < 1) bgFade = Math.min(1, bgFade + dt / 2.2);
    shake = Math.max(0, shake - dt * 2.5);
    if (timeLeft <= 0) { timeLeft = 0; finish(); return; }

    // ---- keyboard (computer par test ke liye) ----
    if (P.alive) {
      if (keys.ArrowLeft || keys.a) P.tx -= 460 * dt; if (keys.ArrowRight || keys.d) P.tx += 460 * dt;
      if (keys.ArrowUp || keys.w) P.ty -= 460 * dt; if (keys.ArrowDown || keys.s) P.ty += 460 * dt;
    }
    P.tx = clamp(P.tx, 30, W - 30); P.ty = clamp(P.ty, 80, H - 50);

    // ---- apna jahaj ----
    if (P.alive) {
      P.px = P.x; P.py = P.y;
      var f = Math.min(1, C.FOLLOW * dt); P.x += (P.tx - P.x) * f; P.y += (P.ty - P.y) * f;
      P.spd += (Math.min(1, Math.sqrt((P.x - P.px) * (P.x - P.px) + (P.y - P.py) * (P.y - P.py)) / dt / 800) - P.spd) * Math.min(1, dt * 10);
      if (P.invul > 0) P.invul -= dt;
      if (P.rapidT > 0) P.rapidT -= dt; if (P.shieldT > 0) P.shieldT -= dt;
      P.fireT -= dt;
      if (P.fireT <= 0 && P.y < H + 20) { fireGun(); P.fireT = C.SHIPS[P.ship].fireGap / (P.rapidT > 0 ? C.RAPID_MULT : 1); }
      if (P.boostT > 0) {
        P.boostT -= dt; P.boostEl += dt; P.boostAcc -= dt;
        if (P.boostAcc <= 0) { fireBoost(Math.round(lerp(C.BOOST_START, C.BOOST_MAX, Math.min(1, P.boostEl / C.BOOST_TIME)))); P.boostAcc = C.BOOST_GAP; Snd.shoot(P.ship); }
      }
      // engine ki lau
      if (Math.random() < dt * 30) part(0, P.x + rnd(-10, 10), P.y + 36, rnd(-8, 8), rnd(40, 90), 0.3, rnd(10, 16), shipFlameColor());
    } else {
      P.waitT -= dt; P.spd = 0;
      if (P.waitT <= 0) respawn();
    }
    sndT -= dt;
    if (sndT <= 0) { sndT = 0.06; Snd.move(P.alive ? P.spd : 0); }

    // ---- wave ----
    director(dt);
    diveT += dt;
    if (diveT >= C.DIVE_EVERY) {
      diveT = 0;
      if (Math.random() < C.DIVE_CHANCE) {
        var hs = enemies.filter(function (q) { return q.mode === 'hold'; });
        if (hs.length) { var dv = hs[ri(hs.length)]; dv.mode = 'dive'; dv.vx = 0; dv.vy = 230; }
      }
    }

    // ---- alien ----
    for (i = enemies.length - 1; i >= 0; i--) {
      e = enemies[i]; updEnemy(e, dt);
      if (e.dead) enemies.splice(i, 1);
    }

    // ---- apni goli ----
    for (i = pb.length - 1; i >= 0; i--) {
      b = pb[i];
      if (b.missile) {                                              // missile sabse paas wale alien ki taraf mudta hai
        var tg = null, td = 1e9, dd, ang, cur, des, dl;
        for (j = 0; j < enemies.length; j++) { e = enemies[j]; if (!hittable(e)) continue; dd = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y); if (dd < td) { td = dd; tg = e; } }
        if (tg) {
          cur = Math.atan2(b.vy, b.vx); des = Math.atan2(tg.y - b.y, tg.x - b.x); dl = des - cur; while (dl > PI) dl -= TAU; while (dl < -PI) dl += TAU;
          cur += clamp(dl, -6 * dt, 6 * dt); var spd = 600; b.vx = Math.cos(cur) * spd; b.vy = Math.sin(cur) * spd;
        } else { b.vy = -600; }
        b.trail -= dt; if (b.trail <= 0) { b.trail = 0.035; part(2, b.x, b.y + 14, rnd(-8, 8), 30, 0.4, 11, 'smoke'); }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -40 || b.x < -30 || b.x > W + 30 || b.y > H + 40) { pb.splice(i, 1); continue; }
      for (j = 0; j < enemies.length; j++) {
        e = enemies[j]; if (e.dead || !hittable(e)) continue;
        d = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y);
        if (d < (e.r + b.r) * (e.r + b.r)) {
          e.hp -= b.dmg; e.flash = 0.07; Snd.hit();
          part(1, b.x, b.y, rnd(-90, 90), rnd(-160, -30), rnd(0.15, 0.3), 9, b.k === 1 || b.missile ? 'fire' : (b.k === 0 ? 'green' : (b.k === 2 ? 'blue' : 'purple')));
          if (b.missile) { explosion(b.x, b.y, 0.9, 'fire'); Snd.explode(0.7); for (var q = 0; q < enemies.length; q++) { var o = enemies[q]; if (o !== e && !o.dead && hittable(o) && (o.x - b.x) * (o.x - b.x) + (o.y - b.y) * (o.y - b.y) < 55 * 55) { o.hp -= 1; o.flash = 0.07; if (o.hp <= 0) killEnemy(o); } } }
          if (e.hp <= 0) killEnemy(e);
          pb.splice(i, 1); break;
        }
      }
    }
    for (i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);

    // ---- alien ki goli ----
    for (i = eb.length - 1; i >= 0; i--) {
      b = eb[i]; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > H + 30 || b.y < -40 || b.x < -30 || b.x > W + 30) { eb.splice(i, 1); continue; }
      if (P.alive && P.invul <= 0) {
        d = (P.x - b.x) * (P.x - b.x) + (P.y - b.y) * (P.y - b.y);
        if (d < (C.PLAYER_HIT_R + b.r) * (C.PLAYER_HIT_R + b.r)) { eb.splice(i, 1); hurtPlayer(); break; }
      }
    }

    // ---- jahaj se takkar (alien / patthar) ----
    if (P.alive && P.invul <= 0) {
      for (i = 0; i < enemies.length; i++) {
        e = enemies[i]; if (!hittable(e)) continue;
        d = (P.x - e.x) * (P.x - e.x) + (P.y - e.y) * (P.y - e.y);
        if (d < (C.PLAYER_HIT_R + e.r * 0.85) * (C.PLAYER_HIT_R + e.r * 0.85)) {
          if (P.shieldT > 0 && e.type !== 'boss') { e.hp = 0; killEnemy(e); }
          else { hurtPlayer(); }
          break;
        }
      }
    }

    // ---- gift ----
    for (i = pickups.length - 1; i >= 0; i--) {
      var pk = pickups[i]; pk.age += dt; pk.y += C.PICKUP_FALL * dt; pk.x += Math.sin(pk.age * 2 + pk.ph) * 18 * dt;
      if (pk.y > H + 40) { pickups.splice(i, 1); continue; }
      if (P.alive) {
        d = (P.x - pk.x) * (P.x - pk.x) + (P.y - pk.y) * (P.y - pk.y);
        if (d < 38 * 38) { collect(pk.kind); pickups.splice(i, 1); }
      }
    }

    // ---- chingari / popup ----
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += (p.vy + C.BG_SPEED * 0.45) * dt; p.rot += p.vr * dt;
      if (p.k === 3) p.vy += 220 * dt; else if (p.k === 2) { p.vx *= 0.97; } else if (p.k === 1) { p.vx *= 0.96; p.vy *= 0.96; }
    }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; pops[i].y -= 26 * dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
  }

   // =====================================================================
  //                              DRAW
  // =====================================================================
  function flameSpr(col) {
    var cm = { blue: ['120,200,255', '40,120,255'], fire: ['255,230,120', '255,100,20'], green: ['190,255,190', '30,220,90'], purple: ['255,200,255', '200,60,255'] }[col];
    return spr('flame' + col, 20, 44, function (g) {
      g.translate(10, 0);
      g.fillStyle = lg(g, 0, 0, 0, 44, [[0, 'rgba(255,255,255,.95)'], [0.2, 'rgba(' + cm[0] + ',.9)'], [0.6, 'rgba(' + cm[1] + ',.55)'], [1, 'rgba(' + cm[1] + ',0)']]);
      g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-7, 14, 0, 44); g.quadraticCurveTo(7, 14, 6, 0); g.closePath(); g.fill();
    });
  }
  var FLAME_X = [[-15, 15], [-16, 16], [-14, 0, 14], [-12, 12]];
  var FLAME_Y = [94, 100, 94, 100];

  function shieldSpr() {
    return spr('shield', 120, 120, function (g) {
      g.fillStyle = rg(g, 60, 60, 30, 60, 60, 58, [[0, 'rgba(80,190,255,0)'], [0.75, 'rgba(80,190,255,.16)'], [1, 'rgba(160,230,255,.6)']]);
      circ(g, 60, 60, 58); g.fill();
      g.strokeStyle = 'rgba(200,240,255,.85)'; g.lineWidth = 1.6; g.beginPath(); g.arc(60, 60, 56.5, 0, TAU); g.stroke();
    });
  }

  function drawPlayer() {
    var k = P.ship, sp = shipSpr(k), fl = flameSpr(shipFlameColor()), xs = FLAME_X[k], i, al = 1, len;
    if (P.invul > 0) al = Math.sin(clock * 28) > 0 ? 1 : 0.35;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < xs.length; i++) {
      len = 0.75 + 0.3 * Math.sin(clock * 38 + i * 2) + P.spd * 0.25 + 0.15 * Math.random();
      ctx.globalAlpha = al; ctx.drawImage(fl, P.x + xs[i] - 10, P.y - 54 + FLAME_Y[k] - 3, 20, 44 * len);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    blit(sp, P.x, P.y, 1, 0, al);
    if (P.shieldT > 0) {
      var a = P.shieldT < 2 ? (Math.sin(clock * 25) > 0 ? 1 : 0.3) : 0.85 + 0.15 * Math.sin(clock * 6);
      blit(shieldSpr(), P.x, P.y - 4, 1.0, 0, a);
    }
    if (P.boostT > 0) { ctx.globalCompositeOperation = 'lighter'; blit(glowSpr('gold'), P.x, P.y, 2.2, 0, 0.45 + 0.2 * Math.sin(clock * 14)); ctx.globalCompositeOperation = 'source-over'; }
  }

  function drawEnemy(e) {
    var s, fr, sc;
    if (e.rock) {
      ctx.globalCompositeOperation = 'lighter'; blit(glowSpr('fire'), e.x, e.y - e.size * 0.55, e.size / 32, 0, 0.75); ctx.globalCompositeOperation = 'source-over';
      s = rockSpr(e.v); sc = e.size / 110; blit(s, e.x, e.y, sc, e.rot);
      if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; blit(s, e.x, e.y, sc, e.rot, 0.7); ctx.globalCompositeOperation = 'source-over'; }
      return;
    }
    fr = [0, 1, 2, 1][Math.floor(e.age * 9 + e.ph) % 4];
    if (e.type === 'boss') { s = bossSpr(fr); sc = e.size / 150; } else { s = enemySpr(e.type, SHIFTS[e.sh], fr); sc = e.size / 70; }
    blit(s, e.x, e.y + (e.type === 'boss' ? 0 : 0), sc, 0);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; blit(s, e.x, e.y, sc, 0, 0.75); ctx.globalCompositeOperation = 'source-over'; }
  }

  function txt(s, x, y, size, col, align, stroke) {
    ctx.font = 'bold ' + size + 'px Arial, Helvetica, sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.16); ctx.strokeStyle = stroke || 'rgba(10,6,30,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  function drawBanner() {
    var b = banner, u = b.t / b.dur, sc = 1, al = 1, y = H * 0.42, i, a;
    if (b.t < 0.25) { sc = 1 + (1 - b.t / 0.25) * 1.2; al = b.t / 0.25; }
    if (b.dur - b.t < 0.4) al = (b.dur - b.t) / 0.4;
    ctx.globalAlpha = al;
    ctx.globalCompositeOperation = 'lighter';                       // peeli bijli ki patti
    ctx.fillStyle = lg(ctx, 0, y - 4, 0, y + 4, [[0, 'rgba(255,230,0,0)'], [0.5, 'rgba(255,240,60,.95)'], [1, 'rgba(255,230,0,0)']]);
    ctx.fillRect(0, y + 38 - 4, W, 8);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    for (i = 0; i < 9; i++) { a = (i * 53 + Math.floor(b.t * 14) * 37) % W; ctx.beginPath(); ctx.moveTo(a, y + 38); ctx.lineTo(a + 8, y + 30 + (i % 3) * 5); ctx.lineTo(a + 16, y + 42); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(sc, sc);
    var gr = lg(ctx, 0, -34, 0, 32, [[0, '#fff6a0'], [0.5, '#ffc61a'], [1, '#ff8a00']]);
    ctx.font = 'italic 900 58px Impact, "Arial Black", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = '#3a2000'; ctx.strokeText(b.l1, 0, 0); ctx.fillStyle = gr; ctx.fillText(b.l1, 0, 0);
    ctx.font = 'italic 900 62px Impact, "Arial Black", Arial, sans-serif';
    ctx.lineWidth = 9; ctx.strokeText(b.l2, 0, 74); ctx.fillStyle = gr; ctx.fillText(b.l2, 0, 74);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawHUD() {
    var m = Math.floor(timeLeft / 60), s = Math.floor(timeLeft % 60), x = 14, i, chips = [];
    txt(String(score), W / 2, 30, 34, '#ffffff', 'center');
    txt(m + ':' + (s < 10 ? '0' : '') + s, W - 14, 28, 22, timeLeft < 20 ? '#ff6a6a' : '#ffe27a', 'right');
    txt('Level ' + wv.level + '  •  Wave ' + Math.min(wv.wave, C.WAVES_PER_LEVEL) + '/' + C.WAVES_PER_LEVEL, W / 2, 58, 13, '#cfe6ff', 'center');
    chips.push(['GUN ' + P.bullets, '#7ae8ff']);
    if (P.rapidT > 0) chips.push(['SPEED ' + Math.ceil(P.rapidT), '#ffb020']);
    if (P.shieldT > 0) chips.push(['SHIELD ' + Math.ceil(P.shieldT), '#7ac8ff']);
    if (P.boostT > 0) chips.push(['BOOST ' + Math.ceil(P.boostT), '#ffe27a']);
    for (i = 0; i < chips.length; i++) { txt(chips[i][0], x, H - 22 - i * 20, 14, chips[i][1], 'left'); }
    // boss ki jaan
    for (i = 0; i < enemies.length; i++) {
      if (enemies[i].type === 'boss') {
        var e = enemies[i], w = W - 120;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, 60, 74, w, 11, 5); ctx.fill();
        ctx.fillStyle = lg(ctx, 60, 0, 60 + w, 0, [[0, '#ff5a3a'], [1, '#ffb02a']]); rr(ctx, 61, 75, Math.max(2, (w - 2) * e.hp / e.maxhp), 9, 4); ctx.fill();
      }
    }
    if (!P.alive) {
      txt(String(Math.ceil(P.waitT)), W / 2, H * 0.45, 96, '#ffe27a', 'center');
      txt('Jahaj wapas aa raha hai...', W / 2, H * 0.45 + 70, 16, '#ffffff', 'center');
    }
  }

  function render() {
    var i, e, p, b, sx = 0, sy = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scl, 0, 0, scl, ox, oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (shake > 0 && C.SHAKE !== 0) { sx = Math.sin(clock * 90) * shake * 4 * (C.SHAKE || 1); sy = Math.cos(clock * 77) * shake * 4 * (C.SHAKE || 1); ctx.translate(sx, sy); }
    drawBG();
    if (state !== 'menu' && P) {
      for (i = 0; i < pickups.length; i++) {
        p = pickups[i];
        blit(starburst(), p.x, p.y, 0.82 + 0.08 * Math.sin(p.age * 5), p.age * 0.9, 0.9);
        blit(pickupSpr(p.kind), p.x, p.y, 0.95 + 0.07 * Math.sin(p.age * 6 + p.ph));
      }
      for (i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
      for (i = 0; i < eb.length; i++) { b = eb[i]; ctx.globalCompositeOperation = 'lighter'; blit(glowSpr('red'), b.x, b.y, 0.55, 0, 0.6); ctx.globalCompositeOperation = 'source-over'; blit(enemyBulletSpr(), b.x, b.y + 4, 0.8, Math.atan2(b.vx, -b.vy) + PI); }
      for (i = 0; i < pb.length; i++) {
        b = pb[i];
        if (b.missile) { blit(nukeSpr(), b.x, b.y, 0.5, Math.atan2(b.vx, -b.vy)); }
        else {
          ctx.globalCompositeOperation = 'lighter'; blit(glowSpr(['green', 'fire', 'blue', 'purple'][b.k]), b.x, b.y + 4, 0.6, 0, 0.45); ctx.globalCompositeOperation = 'source-over';
          blit(bulletSpr(b.k), b.x, b.y, 0.9, Math.atan2(b.vx, -b.vy));
        }
      }
      if (P.alive) drawPlayer();
      for (i = 0; i < parts.length; i++) {                           // chingari / dhuan
        p = parts[i]; var t = p.life / p.max;
        if (p.k === 2) { blit(smokeSpr(), p.x, p.y, p.s / 24 * (1.6 - t * 0.6), p.rot, t * 0.7); }
        else if (p.k === 3) { ctx.globalAlpha = Math.min(1, t * 2); ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore(); ctx.globalAlpha = 1; }
        else {
          ctx.globalCompositeOperation = 'lighter';
          if (p.k === 0) blit(glowSpr(p.col), p.x, p.y, p.s / 28 * (0.6 + t * 0.6), 0, Math.min(1, t * 1.6));
          else if (p.k === 1) { ctx.strokeStyle = 'rgba(' + GLOWS[p.col] + ',' + t + ')'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke(); }
          else if (p.k === 4) { ctx.strokeStyle = 'rgba(' + GLOWS[p.col] + ',' + t * 0.8 + ')'; ctx.lineWidth = 3 * t + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.3 - t) * 2.2, 0, TAU); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      for (i = 0; i < pops.length; i++) { p = pops[i]; ctx.globalAlpha = Math.max(0, 1 - p.t / 1.1); txt(p.txt, p.x, p.y, 17, p.col, 'center'); ctx.globalAlpha = 1; }
      if (touching && P.alive) {                                      // ungli ka nishaan
        ctx.fillStyle = rg(ctx, touchX, touchY, 2, touchX, touchY, 21, [[0, 'rgba(210,210,225,.55)'], [1, 'rgba(180,180,200,.4)']]); circ(ctx, touchX, touchY, 21); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      drawHUD();
      if (banner) drawBanner();
      if (state === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        txt('PAUSED', W / 2, H * 0.45, 40, '#ffffff', 'center'); txt('Chalu karne ke liye screen dabao', W / 2, H * 0.45 + 46, 15, '#ffffff', 'center');
      }
    }
    ctx.restore();
  }

  // =====================================================================
  //                         ungli / keyboard
  // =====================================================================
  function toL(e) { return { x: (e.clientX * dpr - ox) / scl, y: (e.clientY * dpr - oy) / scl }; }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (state === 'paused') { state = 'play'; return; }
    if (state !== 'play' || ptr !== null) return;
    ptr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var p = toL(e); lx = p.x; ly = p.y; touchX = p.x; touchY = p.y; touching = true;
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== ptr || state !== 'play' || !P) return;
    e.preventDefault();
    var p = toL(e);
    if (P.alive) { P.tx = clamp(P.tx + (p.x - lx) * C.MOVE_SENS, 30, W - 30); P.ty = clamp(P.ty + (p.y - ly) * C.MOVE_SENS, 80, H - 50); }
    lx = p.x; ly = p.y; touchX = p.x; touchY = p.y;
  });
  function ptrEnd(e) { if (e.pointerId === ptr) { ptr = null; touching = false; } }
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  window.addEventListener('keydown', function (e) { keys[e.key] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'play') { state = 'paused'; Snd.engine(false); Snd.move(0); } });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // =====================================================================
  //                       screen ka size, shuru, khatam
  // =====================================================================
  function setup() {
    var iw = window.innerWidth, ih = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, C.MAX_DPR);
    H = clamp(Math.round(450 * ih / iw), 620, 980);
    cv.width = Math.round(iw * dpr); cv.height = Math.round(ih * dpr);
    scl = Math.min(cv.width / W, cv.height / H); ox = (cv.width - W * scl) / 2; oy = (cv.height - H * scl) / 2;
    SS = Math.max(1, Math.round(scl * 4) / 4);
    cache = {}; bg = null; bgPrev = null; bgNext = null; bgFade = 1; initStreaks();
    if (P && state === 'play') { P.tx = clamp(P.tx, 30, W - 30); P.ty = clamp(P.ty, 80, H - 50); }
  }
  window.addEventListener('resize', setup);
  window.addEventListener('orientationchange', function () { setTimeout(setup, 150); });

  function warm() {                                                // sabhi sprite pehle hi bana lo (khelte waqt atakna nahi chahiye)
    var jobs = [], t, s, f, k;
    for (k = 0; k < 4; k++) (function (k) { jobs.push(function () { shipSpr(k); bulletSpr(k); flameSpr(['blue', 'fire', 'green', 'purple'][k]); }); })(k);
    jobs.push(function () { nukeSpr(); enemyBulletSpr(); shieldSpr(); starburst(); smokeSpr(); for (var n in GLOWS) glowSpr(n); ['power', 'ship', 'rapid', 'shield', 'boost'].forEach(pickupSpr); });
    jobs.push(function () { for (var v = 0; v < 4; v++) rockSpr(v); bossSpr(0); bossSpr(1); bossSpr(2); });
    for (t = 0; t < ETYPES.length; t++) for (s = 0; s < clamp(C.COLOR_VARIANTS, 1, 5); s++) (function (t, s) { jobs.push(function () { for (var f = 0; f < 3; f++) enemySpr(ETYPES[t], SHIFTS[s], f); }); })(t, s);
    jobs.push(function () { if (!bg) bg = buildBG(0); });
    (function run() { var j = jobs.shift(); if (!j) return; try { j(); } catch (e) {} setTimeout(run, 12); })();
  }

  function start() {
    Snd.unlock();
    resetGame();
    $('menu').classList.add('hidden'); $('over').classList.add('hidden');
    state = 'play'; Snd.engine(true);
  }

  function finish() {
    if (state === 'over') return;
    state = 'over'; touching = false; ptr = null;
    Snd.engine(false); Snd.move(0); Snd.end();
    var fin = Math.min(C.SAVE_CAP, Math.floor(score));
    $('finalScore').textContent = String(Math.floor(score));
    $('finalStats').textContent = 'Alien mare: ' + kills + '   |   Level: ' + maxLevel;
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

  function stepBG(dt) {
    bgScroll += C.BG_SPEED * dt;
    for (var i = 0; i < streaks.length; i++) { var s = streaks[i]; s.y += C.BG_SPEED * s.v * dt; if (s.y - s.l > H) { s.y = -rnd(0, 30); s.x = rnd(0, W); } }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var raw = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    dtS += (raw - dtS) * 0.25;                                      // dt ko smooth rakho taaki jhatke na lagein
    if (state === 'play') { stepBG(dtS); update(dtS); }
    else if (state === 'menu' || state === 'over') stepBG(dtS);
    render();
  }

  // ---------- shuruaat ----------
  setup(); resetGame();
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  setTimeout(warm, 50);
  //@HOOK
  requestAnimationFrame(loop);
})();
