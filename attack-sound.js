// attack-sound.js  —  Ball Hunt ki saari awaaz (beep, jeet-haar, aur paddle ki baat-cheet)
// Yahan se awaaz ki settings badal sakte ho. Coding ki zarurat nahi, bas number badlo.
var SOUND_CONFIG = {
  ON: true,            // true = awaaz chalu | false = poora game chup
  VOLUME: 1,           // awaaz kitni tez (0 = bilkul chup, 1 = normal, 1.5 = aur tez)
  TALK_ON: true,       // true = paddle bolega | false = sirf beep, bolna band
  TALK_LANG: 'hi-IN',  // bolne ki bhasha ('hi-IN' = Hindi, 'en-IN' = English)
  TALK_RATE: 1.15,     // bolne ki speed (chhota = dheere, bada = tez)
  TALK_VOLUME: 0.8,    // bolne ki awaaz (0 se 1)
  TALK_GAP: 2.2,       // do baar bolne ke beech kam se kam kitne second
  YOU_PITCH: 1.4,      // tumhare paddle ki awaaz (bada = patli awaaz)
  ROBOT_PITCH: 0.6     // robot ki awaaz (chhota = bhaari awaaz)
};

var BallHuntSound = (function () {
  var ac = null, lastSay = 0;

  function unlock() {                       // phone mein pehli ungli lagne par awaaz chalu hoti hai
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

  // paddle bolta hai. who = 'you' ya 'robot'
  function say(text, who, force) {
    if (!SOUND_CONFIG.ON || !SOUND_CONFIG.TALK_ON || !window.speechSynthesis) return;
    var now = Date.now();
    if (!force && (now - lastSay < SOUND_CONFIG.TALK_GAP * 1000 || speechSynthesis.speaking)) return;
    lastSay = now;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = SOUND_CONFIG.TALK_LANG;
    u.pitch = who === 'robot' ? SOUND_CONFIG.ROBOT_PITCH : SOUND_CONFIG.YOU_PITCH;
    u.rate = SOUND_CONFIG.TALK_RATE;
    u.volume = SOUND_CONFIG.TALK_VOLUME;
    speechSynthesis.speak(u);
  }

  return {
    unlock: unlock,
    say: say,
    hit: function (isYou) { tone(isYou ? 540 : 310, 0.09, 'square', 0.18, -160); },   // paddle se ball takrayi
    wall: function () { tone(220, 0.05, 'triangle', 0.15); },                          // deewar se takrayi
    swish: function () { tone(900, 0.06, 'sine', 0.05, -400); },                       // ungli hilane / serve
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.14, 'triangle', 0.2, 0, i * 0.09); }); },
    lose: function () { [400, 320, 240, 160].forEach(function (f, i) { tone(f, 0.16, 'sawtooth', 0.14, 0, i * 0.1); }); },
    change: function () { tone(600, 0.1, 'sine', 0.15, 300); tone(900, 0.12, 'sine', 0.15, 300, 0.12); },
    toggle: function () {                                                              // mute / unmute
      SOUND_CONFIG.ON = !SOUND_CONFIG.ON;
      if (!SOUND_CONFIG.ON && window.speechSynthesis) speechSynthesis.cancel();
      return SOUND_CONFIG.ON;
    }
  };
})();
