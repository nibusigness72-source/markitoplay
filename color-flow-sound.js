// color-flow-sound.js  —  Color Flow ki saari awaaz
// Yahan se awaaz ki settings badal sakte ho (sirf number ya true/false badlo).
var SOUND_CONFIG = {
  ON: true,      // true = awaaz chalu | false = poora game chup
  VOLUME: 1      // awaaz kitni tez (0 = chup, 1 = normal, 1.5 = aur tez)
};

var ColorFlowSound = (function () {
  var ac = null;

  function unlock() {                        // phone mein pehli ungli lagne par awaaz chalu hoti hai
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C) ac = new C();
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function tone(f, d, type, v, slide, delay) {
    if (!ac || !SOUND_CONFIG.ON) return;
    var t = ac.currentTime + (delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(Math.min(1, (v || 0.2) * SOUND_CONFIG.VOLUME), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + d + 0.02);
  }

  return {
    unlock: unlock,
    start: function () { tone(520, 0.07, 'sine', 0.15); },                                   // goli par ungli rakhi
    step: function (n) { tone(380 + Math.min(n, 20) * 22, 0.05, 'triangle', 0.1); },         // line aage badhi (jitni lambi, utni oonchi)
    connect: function () { tone(660, 0.1, 'triangle', 0.2); tone(880, 0.14, 'triangle', 0.2, 0, 0.09); },   // do goli mil gayi
    clear: function () { tone(500, 0.1, 'sine', 0.12, -300); },                               // line hat gayi
    blocked: function () { tone(160, 0.08, 'square', 0.08); },                                // line kaat nahi sakte
    level: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.15, 'triangle', 0.22, 0, i * 0.08); }); },
    skip: function () { tone(700, 0.08, 'sine', 0.15, -350); tone(450, 0.1, 'sine', 0.15, -150, 0.08); },
    end: function () { [400, 320, 240, 160].forEach(function (f, i) { tone(f, 0.16, 'sawtooth', 0.14, 0, i * 0.1); }); },
    toggle: function () { SOUND_CONFIG.ON = !SOUND_CONFIG.ON; return SOUND_CONFIG.ON; }
  };
})();
