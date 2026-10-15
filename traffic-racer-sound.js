// traffic-racer-sound.js - Traffic Racer ki saari awaazein (koi audio file nahi, sab code se banti hain)
//   engine(kmh, gas, on)  = gadi ka engine (speed ke saath awaaz tez hoti hai, gear badalne ki awaaz bhi)
//   crash()               = accident / takkar
//   pass()                = doosri gadi ke paas se sata kar nikalna (sar-sarr + ting)
//   scrape(on)            = side ki railing se ragadna
//   skid(on, kmh)         = break lagane par tyre ki cheekh
//   respawn() / end()     = phir se chalu / game khatam
var TrafficSound = (function () {
  var ctx = null, master = null, noiseBuf = null, ready = false;
  var eng = null, wind = null, scr = null, skd = null;
  var lastGear = 0, gearDip = 0;

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
    // ---- engine: do awaaz (saw + square) + neeche ki gunj ----
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sine';
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 2;
    var g = ctx.createGain(); g.gain.value = 0;
    var g1 = ctx.createGain(); g1.gain.value = 0.5;
    var g2 = ctx.createGain(); g2.gain.value = 0.22;
    var g3 = ctx.createGain(); g3.gain.value = 0.7;
    o1.connect(g1); o2.connect(g2); o3.connect(g3);
    g1.connect(lp); g2.connect(lp); g3.connect(lp);
    lp.connect(g); g.connect(master);
    o1.start(); o2.start(); o3.start();
    eng = { o1: o1, o2: o2, o3: o3, lp: lp, g: g };
    // ---- hawa ----
    var wn = noiseSrc(), wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 800; wf.Q.value = 0.6;
    var wg = ctx.createGain(); wg.gain.value = 0;
    wn.connect(wf); wf.connect(wg); wg.connect(master);
    wind = { f: wf, g: wg };
    // ---- railing se ragadna ----
    var sn = noiseSrc(), sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 2200;
    var so = ctx.createOscillator(); so.type = 'sawtooth'; so.frequency.value = 1900;
    var sof = ctx.createBiquadFilter(); sof.type = 'bandpass'; sof.frequency.value = 2000; sof.Q.value = 6;
    var sg = ctx.createGain(); sg.gain.value = 0;
    sn.connect(sf); sf.connect(sg); so.connect(sof); sof.connect(sg); sg.connect(master); so.start();
    scr = { g: sg, o: so };
    // ---- break ki cheekh ----
    var kn = noiseSrc(), kf = ctx.createBiquadFilter(); kf.type = 'bandpass'; kf.frequency.value = 3200; kf.Q.value = 4;
    var kg = ctx.createGain(); kg.gain.value = 0;
    kn.connect(kf); kf.connect(kg); kg.connect(master);
    skd = { g: kg };
  }

  function on() { return ready && ctx && !isOff(); }

  function tone(type, f1, f2, dur, vol, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, type, f1, f2, delay, attack) {
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type;
    f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + dur * (attack || 0.03));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // gear ki speed seema (km/h)
  var GEARS = [0, 45, 85, 130, 185, 245, 320];

  return {
    unlock: unlock,

    // har frame bulao: speed, gas dabaa hai ya nahi, chalu hai ya band
    engine: function (kmh, gas, run) {
      if (!ready) return;
      var t = ctx.currentTime, off = isOff();
      if (!run || off) {
        eng.g.gain.setTargetAtTime(0, t, 0.08);
        wind.g.gain.setTargetAtTime(0, t, 0.08);
        return;
      }
      var gear = 1, i;
      for (i = 1; i < GEARS.length - 1; i++) if (kmh >= GEARS[i]) gear = i + 1;
      if (gear > lastGear && lastGear > 0) gearDip = 1;            // gear badla: awaaz thodi giregi
      lastGear = gear;
      gearDip = Math.max(0, gearDip - 0.06);
      var lo = GEARS[gear - 1], hi = GEARS[gear];
      var r = Math.max(0, Math.min(1, (kmh - lo) / (hi - lo)));    // is gear mein kitna ghooma
      var rpm = 0.14 + r * 0.7 + (gas ? 0.08 : 0) - gearDip * 0.25;
      var f = 38 + rpm * 150;                                       // engine ki mool awaaz (Hz)
      eng.o1.frequency.setTargetAtTime(f, t, 0.03);
      eng.o2.frequency.setTargetAtTime(f * 2.01, t, 0.03);
      eng.o3.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      eng.lp.frequency.setTargetAtTime(380 + rpm * 1100 + (gas ? 500 : 0), t, 0.05);
      eng.g.gain.setTargetAtTime(0.10 + (gas ? 0.09 : 0) + rpm * 0.07, t, 0.05);
      var sp = Math.min(1, kmh / 300);
      wind.f.frequency.setTargetAtTime(500 + sp * 1800, t, 0.1);
      wind.g.gain.setTargetAtTime(sp * sp * 0.34 + sp * 0.03, t, 0.1);
    },

    // accident
    crash: function () {
      if (!on()) return;
      tone('sine', 110, 28, 0.6, 0.9);                              // bhaari dhamaka
      noise(0.7, 0.9, 'lowpass', 1400, 120);                         // takkar ka shor
      noise(0.35, 0.55, 'bandpass', 2400, 600, 0.02);                // dhaat ka tootna
      tone('square', 240, 90, 0.25, 0.3, 0.02);
      tone('triangle', 520, 310, 0.5, 0.25, 0.05);                   // dhaat ki ghanti
      tone('triangle', 790, 480, 0.4, 0.18, 0.08);
      noise(0.9, 0.35, 'highpass', 5200, 3200, 0.15, 0.1);           // sheesha toot kar bikharna
      var k;
      for (k = 0; k < 5; k++) tone('sine', 2600 + Math.random() * 2400, 1800, 0.12, 0.08, 0.2 + k * 0.08);
    },

    // doosri gadi ke paas se nikalna
    pass: function () {
      if (!on()) return;
      noise(0.42, 0.34, 'bandpass', 380, 1700, 0, 0.45);             // sarr-sarr
      noise(0.3, 0.2, 'bandpass', 1700, 300, 0.25, 0.1);
      tone('sine', 1180, 1560, 0.12, 0.13, 0.12);                    // +10 ki ting
      tone('sine', 1560, 1560, 0.2, 0.1, 0.22);
    },

    // railing se ragadna (chalu / band)
    scrape: function (flag) {
      if (!ready) return;
      var t = ctx.currentTime;
      var v = (flag && !isOff()) ? 0.2 + Math.random() * 0.1 : 0;
      scr.g.gain.setTargetAtTime(v, t, 0.03);
      if (flag) scr.o.frequency.setTargetAtTime(1500 + Math.random() * 1200, t, 0.05);
    },

    // break ki cheekh
    skid: function (flag, kmh) {
      if (!ready) return;
      var v = (flag && !isOff()) ? Math.min(0.2, kmh / 1200) : 0;
      skd.g.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    },

    respawn: function () {
      if (!on()) return;
      tone('sine', 220, 760, 0.35, 0.22);
      tone('triangle', 520, 520, 0.12, 0.18, 0.3);
      tone('triangle', 780, 780, 0.22, 0.18, 0.4);
    },

    // 3-2-1 tick
    tick: function (n) {
      if (!on()) return;
      var f = n >= 3 ? 700 : (n === 2 ? 820 : 960);
      tone('triangle', f, f, 0.14, 0.25);
    },

    end: function () {
      if (!on()) return;
      tone('triangle', 523, 523, 0.22, 0.25);
      tone('triangle', 659, 659, 0.22, 0.25, 0.14);
      tone('triangle', 784, 784, 0.22, 0.25, 0.28);
      tone('triangle', 1047, 1047, 0.45, 0.25, 0.42);
    }
  };
})();
