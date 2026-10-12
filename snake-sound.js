// snake-sound.js - Snake Game ki awaazein (koi mp3 nahi, sab code se banti hain)
// eat() fruit khana (gaay ke ghaas chabane jaisi narm awaaz) | coin() coin | bite(v) katna/marna | kill() dushman mara | boost() speed
// slither() saamp chalne ki halki awaaz | pot() potion mila | gadget() gadget chala | tick(n) 3-2-1 | respawn() | end()

var SnakeSound = (function () {
  var ctx = null, master = null, noiseBuf = null, enabled = true, lastEat = 0;

  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return; }
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(f1, f2, dur, vol, type, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // q = filter ki "tez-ness" (chhota number = narm/phaila hua, bada = patla)
  function noise(dur, vol, ftype, f1, f2, delay, attack, q) {
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = ftype;
    if (q) f.Q.value = q;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * (attack || 0.03));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  function on() { return enabled && ctx; }

  return {
    unlock: unlock,
    // Fruit khana: gaay ghaas chabati hai waisi narm, geeli "krrmp-krrmp" awaaz
    // (do baar chabana: pehle halka patla sarsar, phir neeche ki taraf dabaa hua munch)
    eat: function () {
      if (!on()) return;
      var now = ctx.currentTime;
      if (now - lastEat < 0.09) return;        // bahut tez khane par awaaz ka dher na lage
      lastEat = now;
      var k = 0.85 + Math.random() * 0.3;
      // chaba 1
      noise(0.13, 0.55, 'bandpass', 1000 * k, 380 * k, 0, 0.22, 0.7);   // patta/ghaas ka sarsar
      noise(0.07, 0.22, 'lowpass', 700, 250, 0.01, 0.2);                 // munh ki geeli awaaz
      tone(150 * k, 80, 0.1, 0.3, 'sine');                               // jabda dabne ki halki dhap
      // chaba 2 (thoda dheema, thoda gehra)
      noise(0.12, 0.42, 'bandpass', 800 * k, 330 * k, 0.11, 0.22, 0.7);
      noise(0.06, 0.18, 'lowpass', 600, 220, 0.12, 0.2);
      tone(120 * k, 70, 0.09, 0.22, 'sine', 0.11);
    },
    // Coin: ting
    coin: function () {
      if (!on()) return;
      tone(1250, 1250, 0.1, 0.22, 'sine');
      tone(1850, 1850, 0.28, 0.22, 'sine', 0.07);
    },
    // Kisi ne kata aur saamp mara: dhap + chabane ki awaaz (v = kitni tez, door ke liye kam)
    bite: function (v) {
      if (!on()) return;
      v = v === undefined ? 1 : v;
      if (v <= 0.02) return;
      tone(150, 45, 0.3, 0.8 * v, 'sine');
      noise(0.18, 0.5 * v, 'lowpass', 1800, 150);
      tone(480, 160, 0.12, 0.3 * v, 'sawtooth', 0.02);
    },
    // Dushman saamp ko maara
    kill: function () {
      if (!on()) return;
      tone(520, 520, 0.12, 0.2, 'triangle', 0.1);
      tone(780, 780, 0.12, 0.2, 'triangle', 0.2);
      tone(1040, 1040, 0.3, 0.2, 'triangle', 0.3);
    },
    // Speed chalu hai: sarr-sarr
    boost: function () {
      if (!on()) return;
      noise(0.32, 0.16, 'bandpass', 500, 2200, 0, 0.4);
    },
    // Saamp chal raha hai: dheemi sarsarahat
    slither: function () {
      if (!on()) return;
      noise(0.3, 0.05, 'lowpass', 600, 260, 0, 0.5);
    },
    // Potion mila
    pot: function () {
      if (!on()) return;
      tone(500, 900, 0.14, 0.2, 'sine');
      tone(900, 1400, 0.2, 0.18, 'sine', 0.1);
    },
    // Gadget (magnet / zoom / speed) chalu
    gadget: function () {
      if (!on()) return;
      tone(300, 1200, 0.3, 0.2, 'triangle');
      noise(0.25, 0.15, 'highpass', 2000, 4000, 0.05);
    },
    // 3, 2, 1 intezaar
    tick: function (n) {
      if (!on()) return;
      var f = n >= 3 ? 700 : (n === 2 ? 820 : 960);
      tone(f, f, 0.14, 0.28, 'triangle');
      noise(0.03, 0.2, 'highpass', 3000, 2500);
    },
    // Phir se shuru
    respawn: function () {
      if (!on()) return;
      tone(520, 520, 0.12, 0.2, 'triangle');
      tone(780, 780, 0.25, 0.2, 'sine', 0.08);
    },
    // Game khatam
    end: function () {
      if (!on()) return;
      tone(660, 660, 0.25, 0.2, 'sine');
      tone(440, 440, 0.45, 0.2, 'sine', 0.22);
    }
  };
})();
