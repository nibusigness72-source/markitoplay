// color-sound.js - Color Puzzle ki saari awaazein (koi audio file nahi, sab code se)
//
//   ColorSound.tap()          -> kisi bhi dabbe par tap karne ki chhoti "tik"
//   ColorSound.lift()         -> dabba upar uthne ki "blip"
//   ColorSound.pour(dur,wait) -> paani girne ki awaaz (dur second tak, wait second baad shuru)
//   ColorSound.glug(wait)     -> paani dabbe me pahunchne ki "bloop"
//   ColorSound.full()         -> ek dabba poora bhar gaya: sheeshe jaisi "ting"
//   ColorSound.win()          -> level poora: jashn (dhun + patakhe jaisi pop)
//   ColorSound.bad()          -> galat chaal: halki "dub"
//   ColorSound.skip()         -> skip / naya level: "fush"
//   ColorSound.end()          -> time khatam
//
// Mute: music.js ke 🔊/🔇 button wali hi setting (pw_music_off).
(function () {
  var VOL = 0.9;
  var ctx = null, master = null, conv = null, noiseBuf = null;

  function muted() {
    try { return localStorage.getItem('pw_music_off') === '1'; } catch (e) { return false; }
  }

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = VOL;
    master.connect(comp);
    comp.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    var len = Math.floor(ctx.sampleRate * 0.7);
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var ch = ir.getChannelData(c);
      for (var j = 0; j < len; j++) ch[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 3);
    }
    conv = ctx.createConvolver();
    conv.buffer = ir;
    var wet = ctx.createGain();
    wet.gain.value = 0.3;
    conv.connect(wet);
    wet.connect(master);
    return true;
  }

  function ready() {
    if (muted()) return false;
    if (!init()) return false;
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function tone(t, type, f0, f1, dur, peak, echo) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * 0.6);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.007);
    g.gain.setTargetAtTime(0.0001, t + 0.01, dur * 0.3);
    o.connect(g);
    g.connect(master);
    if (echo) g.connect(conv);
    o.start(t);
    o.stop(t + dur + 0.2);
  }

  // paani ka bulbula (sur upar chadhta hai)
  function bloop(t, f, vol, dur, echo) {
    tone(t, 'sine', f, f * 1.9, dur || 0.14, vol, echo);
    tone(t, 'sine', f * 2.02, f * 3.8, (dur || 0.14) * 0.6, vol * 0.2, false);
  }

  function noiseBurst(t, dur, f0, f1, type, peak, q, echo) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q || 0.7;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    if (echo) g.connect(conv);
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur + 0.05);
  }

  var api = {
    tap: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      tone(t, 'sine', 760, 560, 0.07, 0.22);
    },

    lift: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      tone(t, 'sine', 420, 780, 0.1, 0.3);
    },

    // paani girne ki dhaar: lagatar "sssh" + beech-beech me chhote bulbule
    pour: function (dur, wait) {
      if (!ready()) return;
      dur = dur || 0.5; wait = wait || 0;
      var t = ctx.currentTime + wait, i;
      // dhaar ki awaaz: band-pass shor jo thoda lehraata hai
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime(1100, t);
      f.frequency.linearRampToValueAtTime(1900, t + dur);       // bharte-bharte awaaz oonchi (asli paani jaisi)
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 17; lg.gain.value = 260;
      lfo.connect(lg); lg.connect(f.frequency);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.06);
      g.gain.setValueAtTime(0.5, t + dur - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.05);
      src.connect(f); f.connect(g); g.connect(master); g.connect(conv);
      src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.1);
      lfo.start(t); lfo.stop(t + dur + 0.1);
      // gurgle: chhote bulbule
      var n = Math.max(3, Math.round(dur * 11));
      for (i = 0; i < n; i++) bloop(t + 0.03 + (i / n) * dur * 0.95 + rnd(0, 0.02), rnd(380, 900) + i * 18, rnd(0.07, 0.16), 0.08, false);
    },

    glug: function (wait) {
      if (!ready()) return;
      var t = ctx.currentTime + (wait || 0);
      bloop(t, rnd(220, 260), 0.5, 0.16, true);
    },

    // dabba poora bhara: sheeshe ki "ting-ting"
    full: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      tone(t, 'sine', 1319, 1319, 0.5, 0.3, true);
      tone(t + 0.1, 'sine', 1760, 1760, 0.6, 0.28, true);
      tone(t + 0.1, 'triangle', 3520, 3520, 0.3, 0.06, false);
    },

    // level poora: jashn
    win: function () {
      if (!ready()) return;
      var t = ctx.currentTime, i;
      noiseBurst(t, 0.18, 4000, 800, 'highpass', 0.5, 0.7, true);          // patakhe ki "pop"
      tone(t, 'sine', 160, 55, 0.35, 0.7, false);
      var sc = [523, 659, 784, 1047, 1319, 1568];
      for (i = 0; i < sc.length; i++) {
        tone(t + 0.12 + i * 0.09, 'triangle', sc[i], sc[i], 0.4, 0.26, true);
        tone(t + 0.12 + i * 0.09, 'sine', sc[i] * 2, sc[i] * 2, 0.25, 0.07, false);
      }
      // confetti ki chhoti-chhoti pop
      for (i = 0; i < 6; i++) noiseBurst(t + 0.35 + i * 0.07 + rnd(0, 0.03), 0.06, 3500, 1500, 'bandpass', 0.22, 1, false);
    },

    bad: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      tone(t, 'sine', 210, 120, 0.18, 0.4, false);
    },

    skip: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      noiseBurst(t, 0.3, 500, 4000, 'bandpass', 0.4, 0.9, false);
    },

    end: function () {
      if (!ready()) return;
      var t = ctx.currentTime;
      tone(t, 'triangle', 784, 784, 0.25, 0.3, true);
      tone(t + 0.15, 'triangle', 659, 659, 0.25, 0.3, true);
      tone(t + 0.3, 'triangle', 523, 523, 0.5, 0.3, true);
    }
  };

  window.ColorSound = api;

  function unlock() {
    if (!muted() && init() && ctx.state === 'suspended') ctx.resume();
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  function addButton() {
    if (window.PWMusic || !document.body) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99998;width:40px;height:40px;' +
      'border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(0,0,0,.45);' +
      'color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0;';
    function paint() { b.textContent = muted() ? '🔇' : '🔊'; }
    paint();
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      try { localStorage.setItem('pw_music_off', muted() ? '0' : '1'); } catch (err) {}
      paint();
    });
    document.body.appendChild(b);
  }
  if (document.body) addButton(); else document.addEventListener('DOMContentLoaded', addButton);
})();
