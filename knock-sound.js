/* knock-sound.js - Knock Stack ki saari awaazein (koi mp3 nahi, sab code se bani hain)
   Volume badhana/ghatana ho to neeche VOL ki value badlo (0.0 se 1.0). */
(function () {
  var VOL = {
    master: 0.9,   // sab awaazon ka total volume
    bounce: 0.6,   // ball uchhalne ki awaaz
    smash:  0.9,   // ring tootne ki awaaz
    fire:   0.7    // aag wali ball ki awaaz
  };

  var ctx = null, master = null, noiseBuf = null, muted = false, lastSmash = 0;
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

  window.KnockSound = {
    unlock: function () { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted: function (m) { muted = !!m; },
    // ball ring par uchhli (bloop)
    bounce: function () { tone('sine', 420, 190, 0.14, 0.45 * VOL.bounce); noise(0.05, 0.12 * VOL.bounce, 'lowpass', 1200, 400); },
    // ring toot gayi. combo jitna bada, awaaz utni oonchi
    smash: function (combo) {
      var n = performance.now(); if (n - lastSmash < 40) return; lastSmash = n;
      var k = VOL.smash, p = 1 + Math.min(combo, 8) * 0.07;
      noise(0.22, 0.6 * k, 'bandpass', 1500 * p, 300);
      tone('square', 300 * p, 70, 0.12, 0.28 * k);
      tone('triangle', 640 * p, 260, 0.1, 0.22 * k);
    },
    // aag wali ball ban gayi
    fire: function () { noise(0.6, 0.5 * VOL.fire, 'bandpass', 400, 3000); tone('sawtooth', 160, 700, 0.5, 0.25 * VOL.fire); },
    // kaale hisse se takraye
    hit: function () { tone('sawtooth', 240, 50, 0.5, 0.5); noise(0.45, 0.6, 'lowpass', 1800, 100); tone('square', 120, 40, 0.3, 0.3); },
    clear: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone('triangle', f, f, 0.2, 0.32, i * 0.09); }); },
    start: function () { tone('triangle', 440, 440, 0.1, 0.3); tone('triangle', 660, 660, 0.18, 0.3, 0.1); },
    end: function () { [660, 523, 392, 330].forEach(function (f, i) { tone('triangle', f, f, 0.28, 0.32, i * 0.16); }); }
  };
})();
