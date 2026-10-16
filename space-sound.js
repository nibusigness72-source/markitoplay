// space-sound.js - Space Shooter ki saari awaazein (koi audio file nahi, sab code se banti hain)
//   shoot(ship)        = silencer wali bandook ki "phut" (jahaj ke hisaab se thodi alag)
//   hit()              = goli alien ko lagi (tink)
//   explode(size)      = alien / jahaj ka dhamaka (size 0.5 chhota ... 2 bada)
//   enemyShoot()       = alien ne goli maari
//   rockFall() / rock(size) = patthar girna / patthar tootna
//   pickup(kind)       = boost / jahaj / speed / shield / boost-attack lena
//   move(v)            = jahaj idhar-udhar karne par hawa ki sarr-sarr (v = 0..1)
//   engine(on)         = jahaj ka halka hum (chalu / band)
//   die() / respawn() / wave() / levelUp() / boss() / end()
var SpaceSound = (function () {
  var ctx = null, master = null, noiseBuf = null, ready = false;
  var hum = null, whoosh = null, lastT = {};

  function isOff() { try { return localStorage.getItem('pw_music_off') === '1'; } catch (e) { return false; } }

  function unlock() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        master = ctx.createGain(); master.gain.value = 0.9;
        master.connect(comp); comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        build();
        ready = true;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  function noiseSrc() { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, Math.random()); return s; }

  function build() {
    // ---- jahaj ka hum ----
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 52; o2.type = 'sine'; o2.frequency.value = 104;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    var g = ctx.createGain(); g.gain.value = 0;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o1.start(); o2.start();
    hum = { g: g, o1: o1, o2: o2 };
    // ---- hilne par hawa ----
    var wn = noiseSrc(), wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 600; wf.Q.value = 0.9;
    var wg = ctx.createGain(); wg.gain.value = 0;
    wn.connect(wf); wf.connect(wg); wg.connect(master);
    whoosh = { f: wf, g: wg };
  }

  function on() { return ready && ctx && !isOff(); }
  function gate(name, ms) {                              // ek hi awaaz bahut jaldi-jaldi na baje
    var n = performance.now();
    if (lastT[name] && n - lastT[name] < ms) return false;
    lastT[name] = n; return true;
  }

  function tone(type, f1, f2, dur, vol, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, type, f1, f2, delay, attack, q) {
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; if (q) f.Q.value = q;
    f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + dur * (attack || 0.03));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  var THUMP = [170, 135, 200, 115];                       // har jahaj ki bandook ki halki gunj (Hz)

  return {
    unlock: unlock,

    // silencer wali bandook: halki "phut" + andar ki thap + chhota sa click
    shoot: function (ship) {
      if (!on() || !gate('shoot', 55)) return;
      var r = 0.92 + Math.random() * 0.16, th = (THUMP[ship] || 160) * r;
      noise(0.07, 0.2, 'bandpass', 2600 * r, 900, 0, 0.12, 0.9);       // phut (gas nikalna)
      tone('sine', th, th * 0.38, 0.08, 0.26);                          // thap
      noise(0.012, 0.07, 'highpass', 5200, 5000, 0, 0.1);               // slide ka click
    },

    // goli alien ko lagi
    hit: function () {
      if (!on() || !gate('hit', 45)) return;
      tone('triangle', 1900 + Math.random() * 300, 1100, 0.05, 0.07);
      noise(0.03, 0.06, 'highpass', 3500, 3000);
    },

    // dhamaka: size 0.5 (chhota) se 2 (bada)
    explode: function (size) {
      if (!on() || !gate('exp', 35)) return;
      size = size || 1;
      var d = 0.28 + size * 0.28;
      noise(d, 0.42 + size * 0.15, 'lowpass', 2600, 110, 0, 0.02);
      tone('sine', 120 + 40 / size, 34, d * 0.9, 0.38 + size * 0.12);
      noise(d * 0.6, 0.22, 'bandpass', 3200, 700, 0.02, 0.02, 1.2);    // chinagariyan / crackle
      if (size > 1.2) tone('sawtooth', 90, 30, d, 0.12);
    },

    // alien ki goli
    enemyShoot: function () {
      if (!on() || !gate('eshoot', 90)) return;
      tone('square', 880 + Math.random() * 120, 260, 0.16, 0.045);
      noise(0.12, 0.05, 'bandpass', 2200, 500, 0, 0.1, 2);
    },

    // patthar neeche aa rahe hain (gadgadahat)
    rockFall: function () {
      if (!on()) return;
      noise(2.2, 0.38, 'lowpass', 260, 140, 0, 0.55);
      tone('sine', 55, 38, 2, 0.22);
      noise(1.6, 0.16, 'bandpass', 700, 300, 0.2, 0.5, 0.7);
    },

    // patthar toota (pahad tootne jaisi gunj)
    rock: function (size) {
      if (!on() || !gate('rock', 50)) return;
      size = size || 1;
      noise(0.5 + size * 0.35, 0.55, 'lowpass', 1200, 70, 0, 0.02);
      tone('sine', 78, 28, 0.55 + size * 0.2, 0.5);
      var k;
      for (k = 0; k < 3 + size * 2; k++) noise(0.09, 0.2, 'bandpass', 500 + Math.random() * 900, 220, 0.03 + k * 0.06 + Math.random() * 0.04, 0.05, 1.5);
    },

    // kuch collect kiya
    pickup: function (kind) {
      if (!on()) return;
      var n, base;
      if (kind === 'boost') {                                           // boost attack: bada, upar jaata hua
        noise(0.9, 0.3, 'bandpass', 300, 3500, 0, 0.7, 1.4);
        tone('sawtooth', 130, 520, 0.7, 0.18);
        [523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, f, 0.35, 0.16, 0.25 + i * 0.07); });
        tone('sine', 70, 40, 0.5, 0.4, 0.3);
      } else if (kind === 'ship') {                                     // naya jahaj
        noise(0.5, 0.22, 'bandpass', 500, 4000, 0, 0.6, 1.2);
        [392, 523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, f * 1.01, 0.28, 0.16, i * 0.06); });
      } else if (kind === 'rapid') {                                    // speed
        [880, 1100, 1320, 1760].forEach(function (f, i) { tone('square', f, f, 0.07, 0.06, i * 0.04); });
        noise(0.25, 0.14, 'highpass', 2500, 6000, 0, 0.8);
      } else if (kind === 'shield') {                                   // shield
        tone('sine', 660, 990, 0.35, 0.2); tone('sine', 990, 1320, 0.4, 0.14, 0.08);
        tone('triangle', 330, 330, 0.5, 0.1, 0.05);
      } else {                                                          // power (goli badhi)
        base = 523; for (n = 0; n < 3; n++) tone('triangle', base * Math.pow(1.26, n), base * Math.pow(1.26, n), 0.18, 0.18, n * 0.07);
        tone('sine', 1568, 1568, 0.3, 0.08, 0.2);
      }
    },

    // jahaj hilane par (v = 0..1 kitni tez hil raha hai)
    move: function (v) {
      if (!ready) return;
      var t = ctx.currentTime;
      if (isOff()) { whoosh.g.gain.setTargetAtTime(0, t, 0.05); return; }
      v = Math.max(0, Math.min(1, v));
      whoosh.f.frequency.setTargetAtTime(380 + v * 1500, t, 0.06);
      whoosh.g.gain.setTargetAtTime(v * 0.17, t, 0.06);
    },

    engine: function (run) {
      if (!ready) return;
      var t = ctx.currentTime;
      hum.g.gain.setTargetAtTime(run && !isOff() ? 0.045 : 0, t, 0.15);
      if (!run) whoosh.g.gain.setTargetAtTime(0, t, 0.05);
    },

    // apna jahaj toota
    die: function () {
      if (!on()) return;
      noise(1.2, 0.7, 'lowpass', 2800, 70, 0, 0.02);
      tone('sine', 140, 26, 1, 0.7);
      tone('triangle', 700, 50, 1.1, 0.25, 0.02);
      noise(0.5, 0.35, 'bandpass', 3000, 500, 0.05, 0.02, 1);
      tone('sawtooth', 300, 40, 0.9, 0.12, 0.1);
    },

    respawn: function () {
      if (!on()) return;
      noise(0.6, 0.22, 'bandpass', 300, 2600, 0, 0.8, 1.2);
      tone('triangle', 330, 660, 0.4, 0.15); tone('triangle', 495, 990, 0.4, 0.12, 0.1);
    },

    // "Wave 2/9" aane par
    wave: function () {
      if (!on()) return;
      noise(0.7, 0.28, 'bandpass', 300, 2800, 0, 0.6, 1.3);
      tone('sawtooth', 110, 220, 0.5, 0.1);
      tone('triangle', 880, 880, 0.35, 0.1, 0.3);
    },

    levelUp: function () {
      if (!on()) return;
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.32, 0.17, i * 0.1); tone('sine', f / 2, f / 2, 0.32, 0.1, i * 0.1); });
    },

    // bada boss aaya
    boss: function () {
      if (!on()) return;
      tone('sawtooth', 70, 38, 1.4, 0.25); tone('square', 74, 40, 1.4, 0.1);
      noise(1.4, 0.3, 'lowpass', 500, 120, 0, 0.4);
    },

    end: function () {
      if (!on()) return;
      [784, 659, 523, 392].forEach(function (f, i) { tone('triangle', f, f, 0.3, 0.17, i * 0.13); });
    }
  };
})();
