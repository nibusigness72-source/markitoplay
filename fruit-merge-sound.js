/* fruit-merge-sound.js - sab awaaz yahin bani hain (koi mp3 file nahi chahiye) */
(function () {
  'use strict';
  let ac = null, master = null, muted = false;
  const VOLUME = 0.6; // poori awaaz: 0 se 1

  function init() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = VOLUME;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, f1, f2) {
    if (!ac || muted) return;
    const t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const flt = ac.createBiquadFilter(); flt.type = 'bandpass';
    flt.frequency.setValueAtTime(f1, t);
    flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t);
  }

  window.FruitSound = {
    init: init,
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },

    // fruit girne par
    drop: function () { tone(520, 0.14, 'sine', 0.35, 0, 240); noise(0.08, 0.15, 1800, 600); },

    // fruit merge hone par (level jitna bada, awaaz utni ooncha)
    merge: function (level) {
      const base = 300 + level * 45;
      tone(base, 0.16, 'triangle', 0.35, 0, base * 1.8);
      tone(base * 1.5, 0.22, 'sine', 0.25, 0.08);
      if (level >= 5) { tone(base * 2, 0.2, 'sine', 0.22, 0.16); tone(base * 2.5, 0.25, 'sine', 0.2, 0.24); }
      if (level >= 9) { tone(base * 3, 0.35, 'triangle', 0.25, 0.32); }
    },

    // last 5 second timer tick
    tick: function () { tone(1000, 0.07, 'square', 0.16); },

    // container full hone ka 5 second countdown beep
    warn: function () { tone(880, 0.12, 'square', 0.22); tone(660, 0.14, 'square', 0.22, 0.13); },

    // jhadu
    broom: function () { noise(0.5, 0.5, 400, 3500); tone(300, 0.3, 'sawtooth', 0.12, 0, 900); },

    // undo
    undo: function () { tone(700, 0.18, 'sine', 0.3, 0, 300); tone(500, 0.18, 'sine', 0.25, 0.12, 250); },

    // background badalne par
    bg: function () { tone(784, 0.12, 'sine', 0.2); tone(988, 0.12, 'sine', 0.2, 0.1); tone(1175, 0.2, 'sine', 0.2, 0.2); },

    start: function () { tone(440, 0.12, 'triangle', 0.3); tone(660, 0.12, 'triangle', 0.3, 0.12); tone(880, 0.25, 'triangle', 0.3, 0.24); },

    over: function () { tone(500, 0.25, 'sawtooth', 0.25, 0, 400); tone(400, 0.25, 'sawtooth', 0.25, 0.25, 300); tone(300, 0.5, 'sawtooth', 0.25, 0.5, 150); }
  };
})();
