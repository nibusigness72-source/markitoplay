/* match-sound.js - Match Ball ki saari awaazein (koi mp3 nahi, sab code se bani hain)
   Volume badhana/ghatana ho to neeche VOL ki value badlo (0.0 se 1.0). */
(function () {
  var VOL = {
    master: 0.9,   // sab awaazon ka total volume
    tap:    0.6,   // box par click ki awaaz
    drop:   0.8,   // ball dusre box mein girne ki awaaz
    praise: 0.8    // great / nice / perfect aur jeetne ki awaaz
  };

  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem('pw_music_off') === '1'; } catch (e) {}

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = VOL.master;
    master.connect(comp); comp.connect(ctx.destination);
  }
  function ok() { return ctx && !muted; }
  function tone(type, f0, f1, dur, vol, delay) {
    if (!ok()) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function notes(list, type, dur, vol, gap) {
    list.forEach(function (f, i) { tone(type, f, f, dur, vol, i * gap); });
  }

  window.MatchSound = {
    unlock: function () { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted: function (m) { muted = !!m; },
    // box par click, ball upar uthi (halki pop)
    pick: function () { tone('sine', 520, 820, 0.09, 0.30 * VOL.tap); },
    // ball wapas wahin rakh di
    back: function () { tone('sine', 700, 420, 0.09, 0.22 * VOL.tap); },
    // ball dusre box mein gir gayi (thoda "tok")
    drop: function () { tone('sine', 330, 140, 0.14, 0.50 * VOL.drop); tone('triangle', 660, 330, 0.07, 0.18 * VOL.drop); },
    // box full ho gaya (+10)
    done: function (n) {
      var b = 523 * Math.pow(1.06, Math.min(n || 0, 6));
      notes([b, b * 1.25, b * 1.5], 'triangle', 0.18, 0.30 * VOL.praise, 0.08);
    },
    // "GREAT / NICE / PERFECT" ke liye alag dhun
    praise: function (word) {
      if (word === 'PERFECT') notes([523, 659, 784, 1046, 1318], 'triangle', 0.2, 0.30 * VOL.praise, 0.07);
      else if (word === 'GREAT') notes([587, 740, 880], 'triangle', 0.2, 0.30 * VOL.praise, 0.07);
      else notes([523, 698], 'triangle', 0.18, 0.28 * VOL.praise, 0.08);
    },
    // level jeet gaye
    win: function () { notes([523, 659, 784, 1046, 1318, 1568], 'triangle', 0.22, 0.32 * VOL.praise, 0.08); },
    deny: function () { tone('square', 200, 150, 0.12, 0.18 * VOL.tap); },
    skip: function () { tone('sine', 400, 800, 0.2, 0.28 * VOL.tap); },
    start: function () { notes([440, 660], 'triangle', 0.14, 0.30 * VOL.praise, 0.1); },
    tick: function () { tone('square', 1100, 1100, 0.07, 0.16 * VOL.tap); },
    end: function () { notes([660, 523, 392, 330], 'triangle', 0.28, 0.32 * VOL.praise, 0.16); }
  };
})();
