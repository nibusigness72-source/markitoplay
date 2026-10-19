/* hammer-sound.js - Shadow Hammer ki saari awaazein (koi mp3 nahi, sab code se bani hain)
   Volume badhana/ghatana ho to neeche VOL ki value badlo (0.0 se 1.0). */
(function () {
  var VOL = {
    master: 0.9,   // sab awaazon ka total volume
    steps:  0.5,   // chalne ki awaaz (0 kar do to band)
    shots:  0.9,   // goli ki awaaz
    kill:   1.0,   // marne/blast ki awaaz
    torch:  0.5    // torch ki click/hum awaaz
  };

  var ctx = null, master = null, noiseBuf = null, muted = false, lastStep = 0;
  try { muted = localStorage.getItem('pw_music_off') === '1'; } catch (e) {}

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = VOL.master;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function ok() { return ctx && !muted; }
  function tone(type, f0, f1, dur, vol, delay) {
    if (!ok()) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fType, f0, f1, delay) {
    if (!ok()) return;
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    f.type = fType; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  // v = door/paas ka volume (0..1)
  function vv(v) { return v == null ? 1 : Math.max(0, Math.min(1, v)); }

  window.HammerSound = {
    unlock: function () { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted: function (m) { muted = !!m; },
    // chalne ki awaaz (thak-thak)
    step: function (v) {
      if (!ok()) return; var n = performance.now(); if (n - lastStep < 90) return; lastStep = n;
      noise(0.07, 0.16 * vv(v) * VOL.steps, 'lowpass', 700 + Math.random() * 300, 220);
      tone('sine', 110 + Math.random() * 20, 60, 0.07, 0.10 * vv(v) * VOL.steps);
    },
    swing: function () { noise(0.16, 0.2, 'bandpass', 500, 1800); },
    // hathoda lagne par: thud + blast + khoon
    kill: function (v) {
      var k = VOL.kill * vv(v);
      tone('sine', 190, 40, 0.28, 0.9 * k);
      noise(0.45, 0.8 * k, 'lowpass', 2400, 120);
      noise(0.2, 0.5 * k, 'highpass', 1800, 900, 0.02);
      tone('square', 90, 30, 0.22, 0.3 * k, 0.03);
    },
    // shield se takrane ki khanak
    clang: function (v) {
      var k = vv(v);
      tone('square', 1400, 900, 0.18, 0.28 * k); tone('triangle', 2100, 1500, 0.22, 0.22 * k);
      noise(0.1, 0.25 * k, 'highpass', 3000, 2000);
    },
    // goli: kind 'enemy' = guard ne chalayi
    shot: function (v) {
      var k = VOL.shots * vv(v);
      noise(0.22, 0.75 * k, 'bandpass', 1800, 300);
      tone('sawtooth', 260, 50, 0.16, 0.45 * k);
      tone('sine', 120, 40, 0.18, 0.5 * k);
    },
    hurt: function () { tone('sawtooth', 220, 90, 0.2, 0.35); noise(0.12, 0.3, 'lowpass', 900, 200); },
    die: function () { tone('sawtooth', 300, 40, 0.9, 0.5); noise(0.7, 0.4, 'lowpass', 1200, 80); },
    // guard ne dekh liya
    alert: function (v) { var k = vv(v); tone('square', 700, 700, 0.07, 0.22 * k); tone('square', 1000, 1000, 0.1, 0.22 * k, 0.08); },
    torch: function (v) { tone('square', 2400, 1800, 0.025, 0.12 * VOL.torch * vv(v)); },
    pickup: function (kind) {
      if (kind === 'cash') { tone('triangle', 880, 880, 0.08, 0.3); tone('triangle', 1320, 1320, 0.14, 0.3, 0.07); }
      else if (kind === 'med') { tone('sine', 520, 780, 0.25, 0.35); tone('sine', 780, 1040, 0.25, 0.3, 0.12); }
      else { tone('sine', 1500, 700, 0.5, 0.3); tone('triangle', 2200, 1100, 0.5, 0.2, 0.05); }
    },
    freeze: function () { tone('sine', 2000, 500, 0.7, 0.3); noise(0.5, 0.25, 'highpass', 4000, 2500); },
    roundStart: function () { tone('triangle', 330, 330, 0.12, 0.3); tone('triangle', 440, 440, 0.12, 0.3, 0.12); tone('triangle', 660, 660, 0.25, 0.3, 0.24); },
    roundClear: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone('triangle', f, f, 0.22, 0.32, i * 0.1); }); },
    respawn: function () { tone('sine', 300, 900, 0.35, 0.3); },
    tick: function (n) { tone('square', n <= 1 ? 1200 : 800, n <= 1 ? 1200 : 800, 0.08, 0.2); },
    end: function () { [660, 523, 392, 330].forEach(function (f, i) { tone('triangle', f, f, 0.28, 0.32, i * 0.16); }); }
  };
})();
