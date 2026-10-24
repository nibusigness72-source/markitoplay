// =====================================================================
// chat-advance.js  -  Chat Advance (sirf chat.html par chalta hai)
//  1) Create-account / Unlock (lock) PEHLE, uske baad hi Search UID/Username dikhe
//  2) Message timer icon (chat box ke left): seconds scroll karke chuno
//     + After seen / Before seen. Kuch na chuno to purana Auto timer.
//  3) Video + File share (chunks mein, Realtime Database)
//       Video : dekhna shuru -> timer = video ki lambai. Pura dekha -> turant delete.
//       File  : kholte hi server se delete (view-once).
//
// chat.html mein ise chat.js se PEHLE lagao. chat.js mein chhote hooks chahiye
// (chat-js-patch.txt) aur Firebase Rules (chat-advance-rules.txt).
// =====================================================================
(function () {
  'use strict';
  if (!document.getElementById('searchForm') || !window.firebase) return;

  var LS_KEY = 'chat_adv_timer';
  var SEC_MIN = 1, SEC_MAX = 600, ROW = 40;
  var MAX_BYTES = 8 * 1024 * 1024;            // rules mein bhi 8388608
  var CHUNK = 200000;                          // 4 ka multiple (base64 chunk alag decode hota hai)
  var MAX_CHUNKS = 64;
  var BLOCKED = /\.(exe|bat|cmd|com|msi|scr|apk|jar|js|vbs|ps1|sh|dll|lnk|hta|reg)$/i;

  function noop() {}
  function $(id) { return document.getElementById(id); }
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  function core() {
    var C = window.ChatCore;
    return (C && C.getMsgRef && C.getMsgRef()) ? C : null;
  }
  function fmtSize(b) {
    b = Number(b) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function fmtDur(ms) {
    var s = Math.round((Number(ms) || 0) / 1000), m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtSec(n) {
    if (n < 60) return n + ' sec';
    var m = Math.floor(n / 60), s = n % 60;
    return m + ' min' + (s ? ' ' + s + ' sec' : '');
  }
  function safeName(n) {
    return String(n || 'file').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 60) || 'file';
  }

  /* ---------------- CSS ---------------- */
  var css = [
    'html.adv-wait #searchView{display:none!important}',
    '.adv-gate-err{max-width:480px;margin:40px auto;padding:14px;background:rgba(239,68,68,.12);border:1px solid #ef4444;border-radius:12px;color:#fff;font-size:14px;text-align:center}',
    '.input-bar{gap:5px;padding:8px 6px}',
    '.input-bar .icon-btn{width:36px;height:36px;font-size:17px}',
    '.input-bar .send-btn{width:40px;height:40px}',
    '.input-wrap input{padding:11px 38px 11px 12px}',
    '.adv-timer{position:relative;background:transparent;color:#fff}',
    '.adv-timer.on{border-color:#facc15}',
    '.adv-clip{background:transparent;color:#fff;border-color:#1f3a8a}',
    '.adv-badge{position:absolute;top:-7px;right:-6px;background:#facc15;color:#000;font-size:9px;font-weight:800;border-radius:8px;padding:1px 4px;display:none}',
    '.adv-timer.on .adv-badge{display:block}',
    '.adv-timer.sent .adv-badge{background:#22d3ee}',
    '.adv-sel{text-align:center;font-size:22px;font-weight:800;color:#facc15;padding:2px}',
    '.adv-wheel-box{position:relative;height:200px}',
    '.adv-wheel{height:200px;overflow-y:auto;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:80px 0;box-sizing:border-box}',
    '.adv-wheel::-webkit-scrollbar{display:none}',
    '.adv-it{height:40px;line-height:40px;text-align:center;scroll-snap-align:center;font-size:20px;color:#9fb0d9;cursor:pointer}',
    '.adv-band{position:absolute;left:12%;right:12%;top:80px;height:40px;border-top:2px solid #22d3ee;border-bottom:2px solid #22d3ee;pointer-events:none}',
    '.adv-chips{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}',
    '.adv-chip{background:#16245e;border:1px solid #1f3a8a;color:#fff;border-radius:14px;padding:6px 12px;font-size:13px;cursor:pointer}',
    '.adv-seg{display:flex;gap:8px}',
    '.adv-seg button{flex:1;background:#16245e;border:1px solid #1f3a8a;color:#fff;border-radius:10px;padding:11px 6px;font-size:14px;font-weight:700;cursor:pointer}',
    '.adv-seg button.on{border-color:#22d3ee;color:#22d3ee}',
    '.adv-desc{font-size:12px;color:#9fb0d9;text-align:center;min-height:32px;padding:0 4px}',
    '.adv-viewer{position:fixed;left:0;top:0;right:0;bottom:0;z-index:110;background:#000;display:none;flex-direction:column;align-items:center;justify-content:center}',
    '.adv-vtop{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px;z-index:2}',
    '.adv-vtop button{background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer}',
    '.adv-vtimer{color:#facc15;font-weight:700;font-size:16px}',
    '.adv-vbody{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 14px 14px;color:#fff;text-align:center;box-sizing:border-box}',
    '.adv-vbody video{max-width:100%;max-height:80vh;background:#000}',
    '.adv-status{font-size:15px;color:#9fb0d9}',
    '.adv-dl{display:inline-block;margin-top:14px;padding:12px 22px;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none}',
    '.adv-note{margin-top:14px;font-size:12px;color:#9fb0d9;max-width:320px}',
    '.advcard{display:flex;align-items:center;gap:10px;min-width:180px;cursor:pointer}',
    '.advic{font-size:30px}',
    '.advic.big{font-size:60px}',
    '.advname{font-weight:700;font-size:14px;word-break:break-all}',
    '.advmeta{font-size:11px;color:#cfe3ff;opacity:.85}',
    '.advhint{font-size:11px;color:#facc15;margin-top:2px}',
    '.adv-up{font-size:13px;opacity:.9}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* =================================================================
     1) LOCK PEHLE: unlock hone tak Search (UID / Username) chhupa rahe
     ================================================================= */
  var HTML = document.documentElement;
  HTML.classList.add('adv-wait');
  var gateErr = h('div', 'adv-gate-err');
  gateErr.style.display = 'none';
  document.body.appendChild(gateErr);

  var waitTimer = setInterval(function () {
    var u = firebase.auth().currentUser, lock = $('lockView'), ok = false;
    try { ok = !!u && sessionStorage.getItem('mk_ok') === u.uid; } catch (e) {}
    var lockShown = !!lock && lock.style.display !== 'none';
    if (ok && !lockShown) {                      // account bana / unlock ho chuka
      HTML.classList.remove('adv-wait');
      gateErr.style.display = 'none';
      clearInterval(waitTimer);
      return;
    }
    // Lock se pehle koi error aaye (jaise "Pehle Home page kholo") to wo dikhao
    var sm = $('searchMsg'), t = sm ? sm.textContent : '';
    if (t && !lockShown && sm.className.indexOf('err') >= 0) {
      gateErr.textContent = t;
      gateErr.style.display = 'block';
    } else {
      gateErr.style.display = 'none';
    }
  }, 200);

  /* =================================================================
     2) TIMER ICON + PICKER
     ================================================================= */
  var cfg = null;      // null = Auto (purana default). Warna { sec, mode:'seen'|'sent' }
  try {
    var j = JSON.parse(localStorage.getItem(LS_KEY));
    if (j && j.sec >= SEC_MIN && j.sec <= SEC_MAX && (j.mode === 'seen' || j.mode === 'sent')) {
      cfg = { sec: Math.floor(j.sec), mode: j.mode };
    }
  } catch (e) {}

  var bar = document.querySelector('#chatView .input-bar');
  var wrap = bar && bar.querySelector('.input-wrap');
  var camLbl = bar && bar.querySelector('label.cam');

  var tBtn = h('button', 'icon-btn adv-timer', '\u23F1');
  tBtn.type = 'button'; tBtn.id = 'advTimerBtn';
  var badge = h('span', 'adv-badge');
  tBtn.appendChild(badge);
  if (bar && wrap) bar.insertBefore(tBtn, wrap);

  var clip = h('button', 'icon-btn adv-clip', '\uD83D\uDCCE');
  clip.type = 'button'; clip.id = 'advAttach';
  var pick = document.createElement('input');
  pick.type = 'file'; pick.hidden = true; pick.id = 'advFilePick';
  if (bar && camLbl) { bar.insertBefore(clip, camLbl); bar.appendChild(pick); }

  function paintBadge() {
    badge.textContent = cfg ? cfg.sec + 's' : '';
    tBtn.classList.toggle('on', !!cfg);
    tBtn.classList.toggle('sent', !!cfg && cfg.mode === 'sent');
    tBtn.title = cfg
      ? 'Timer: ' + fmtSec(cfg.sec) + (cfg.mode === 'sent' ? ' (before seen)' : ' (after seen)')
      : 'Timer: Auto';
  }
  function saveCfg(c) {
    cfg = c;
    try { if (c) localStorage.setItem(LS_KEY, JSON.stringify(c)); else localStorage.removeItem(LS_KEY); } catch (e) {}
    paintBadge();
  }
  paintBadge();

  var sheetBg = null;
  function ensureSheet() {
    if (sheetBg) return sheetBg;
    sheetBg = h('div', 'sheet-bg');
    sheetBg.id = 'advSheetBg';
    sheetBg.style.display = 'none';
    var sh = h('div', 'sheet'); sh.id = 'advSheet';
    sheetBg.appendChild(sh);
    sheetBg.addEventListener('click', function (e) { if (e.target === sheetBg) closeSheet(); });
    document.body.appendChild(sheetBg);
    return sheetBg;
  }
  function closeSheet() { if (sheetBg) sheetBg.style.display = 'none'; }

  function openTimerSheet() {
    var bg = ensureSheet(), sh = $('advSheet');
    sh.innerHTML = '';
    var sel = cfg ? cfg.sec : 10, mode = cfg ? cfg.mode : 'seen';

    sh.appendChild(h('div', 'sheet-title', '\u23F1 Message timer'));
    var big = h('div', 'adv-sel'); sh.appendChild(big);

    var box = h('div', 'adv-wheel-box'), wheel = h('div', 'adv-wheel');
    for (var i = SEC_MIN; i <= SEC_MAX; i++) wheel.appendChild(h('div', 'adv-it', String(i)));
    box.appendChild(wheel);
    box.appendChild(h('div', 'adv-band'));
    sh.appendChild(box);

    var chips = h('div', 'adv-chips');
    [5, 10, 30, 60, 120, 300].forEach(function (n) {
      var c = h('button', 'adv-chip', fmtSec(n)); c.type = 'button';
      c.addEventListener('click', function () { go(n); });
      chips.appendChild(c);
    });
    sh.appendChild(chips);

    var seg = h('div', 'adv-seg');
    var bSeen = h('button', '', '\uD83D\uDC41 After seen'); bSeen.type = 'button';
    var bSent = h('button', '', '\u23F3 Before seen'); bSent.type = 'button';
    seg.appendChild(bSeen); seg.appendChild(bSent);
    sh.appendChild(seg);
    var desc = h('div', 'adv-desc'); sh.appendChild(desc);

    function paint() {
      big.textContent = fmtSec(sel);
      bSeen.classList.toggle('on', mode === 'seen');
      bSent.classList.toggle('on', mode === 'sent');
      desc.textContent = mode === 'sent'
        ? 'Before seen: bhejte hi ' + fmtSec(sel) + ' ka timer chalu. Samne wale ne dekha ya nahi, ' + fmtSec(sel) + ' baad message gayab.'
        : 'After seen: samne wala message dekhega tab ' + fmtSec(sel) + ' ka timer chalu hoga, phir gayab.';
    }
    function go(n) { sel = n; wheel.scrollTop = (n - 1) * ROW; paint(); }

    wheel.addEventListener('scroll', function () {
      var k = Math.round(wheel.scrollTop / ROW) + 1;
      sel = Math.min(SEC_MAX, Math.max(SEC_MIN, k));
      paint();
    });
    wheel.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.className === 'adv-it') go(parseInt(t.textContent, 10));
    });
    bSeen.addEventListener('click', function () { mode = 'seen'; paint(); });
    bSent.addEventListener('click', function () { mode = 'sent'; paint(); });

    var ok = h('button', 'sheet-btn', '\u2705 Timer set karo'); ok.type = 'button';
    ok.addEventListener('click', function () { saveCfg({ sec: sel, mode: mode }); closeSheet(); });
    var auto = h('button', 'sheet-btn', '\u267B Auto (default) par wapas'); auto.type = 'button';
    auto.addEventListener('click', function () { saveCfg(null); closeSheet(); });
    var cn = h('button', 'sheet-btn cancel', 'Cancel'); cn.type = 'button';
    cn.addEventListener('click', closeSheet);
    sh.appendChild(ok); sh.appendChild(auto); sh.appendChild(cn);

    bg.style.display = 'flex';
    go(sel);
  }
  tBtn.addEventListener('click', openTimerSheet);
 /* =================================================================
     3) VIDEO + FILE
     ================================================================= */
  var V = null;                                       // full screen viewer
  var vs = { key: null, url: null, tick: null, token: 0, video: null };

  function ensureViewer() {
    if (V) return V;
    V = h('div', 'adv-viewer'); V.id = 'advViewer';
    var top = h('div', 'adv-vtop');
    var x = h('button', '', '\u2715'); x.type = 'button';
    x.addEventListener('click', closeViewer);
    var tm = h('span', 'adv-vtimer');
    top.appendChild(x); top.appendChild(tm);
    var body = h('div', 'adv-vbody');
    V.appendChild(top); V.appendChild(body);
    V._t = tm; V._b = body;
    V.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.body.appendChild(V);
    return V;
  }
  function closeViewer() {
    vs.token++;
    if (vs.tick) { clearInterval(vs.tick); vs.tick = null; }
    if (vs.video) { try { vs.video.pause(); } catch (e) {} vs.video.removeAttribute('src'); vs.video = null; }
    if (vs.url) { try { URL.revokeObjectURL(vs.url); } catch (e) {} vs.url = null; }
    vs.key = null;
    if (V) { V.style.display = 'none'; V._b.innerHTML = ''; V._t.textContent = ''; }
  }

  function b64ToBytes(s) {
    var bin = atob(s), n = bin.length, a = new Uint8Array(n);
    for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function mimeFor(d) {
    if (d.type === 'video') {
      return (typeof d.mime === 'string' && /^video\/[a-z0-9.+-]+$/i.test(d.mime)) ? d.mime : 'video/mp4';
    }
    return 'application/octet-stream';
  }

  // Chunks ko 4-4 karke download karo, Blob banao
  function fetchBlob(C, key, d, onP) {
    var base = 'chatBlobs/' + C.getRoom() + '/' + key + '/c/';
    var parts = new Array(d.nc), done = 0, next = 0, failed = false;
    return new Promise(function (resolve, reject) {
      function worker() {
        if (failed) return;
        if (next >= d.nc) {
          if (done >= d.nc) resolve(new Blob(parts, { type: mimeFor(d) }));
          return;
        }
        var i = next++;
        C.db.ref(base + i).once('value').then(function (s) {
          var v = s.val();
          if (typeof v !== 'string') throw new Error('gone');
          parts[i] = b64ToBytes(v);
          done++;
          onP(Math.round(done * 100 / d.nc));
          worker();
        }).catch(function (e) { failed = true; reject(e); });
      }
      for (var k = 0; k < Math.min(4, d.nc); k++) worker();
    });
  }

  function markSeen(C, key) {
    var m = C.getMsgs()[key], ref = C.getMsgRef();
    if (!m || m.d.seenAt || m.marking || !ref) return;
    m.marking = true;
    ref.child(key + '/seenAt').set(C.TS).catch(function () { m.marking = false; });
  }

  function openMedia(key) {
    var C = core();
    if (!C) return;
    var m = C.getMsgs()[key];
    if (!m || m.mine) return;
    var d = m.d;
    if (!(d.nc >= 1 && d.nc <= MAX_CHUNKS && d.nc % 1 === 0)) { alert('Ye file kharab hai'); return; }
    closeViewer();
    var v = ensureViewer();
    var token = ++vs.token;
    vs.key = key;
    v._b.innerHTML = ''; v._t.textContent = '';
    var status = h('div', 'adv-status', '\u23EC Load ho raha hai... 0%');
    v._b.appendChild(status);
    v.style.display = 'flex';

    fetchBlob(C, key, d, function (p) {
      if (vs.token === token) status.textContent = '\u23EC Load ho raha hai... ' + p + '%';
    }).then(function (blob) {
      if (vs.token !== token) return;
      if (d.type === 'video') playVideo(C, key, d, blob, v); else showFile(C, key, d, blob, v);
    }).catch(function (err) {
      if (vs.token !== token) return;
      status.textContent = '\u274C ' + (err && err.message === 'gone' ? 'File ab available nahi hai' : 'Load nahi hua, dobara try karo');
    });
  }

  function playVideo(C, key, d, blob, v) {
    var url = URL.createObjectURL(blob);
    vs.url = url;
    v._b.innerHTML = '';
    var vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('controlsList', 'nodownload noremoteplayback');
    vid.disablePictureInPicture = true;
    vid.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var marked = false, ref = C.getMsgRef();
    // Play dabate hi timer shuru (seenAt)
    vid.addEventListener('play', function () { if (!marked) { marked = true; markSeen(C, key); } });
    // Pura dekh liya -> turant delete
    vid.addEventListener('ended', function () {
      ref.child(key).remove().catch(noop);
      closeViewer();
    });
    vid.addEventListener('error', function () {
      v._b.innerHTML = '';
      v._b.appendChild(h('div', 'adv-status', '\u274C Ye video is phone par chal nahi raha'));
    });
    v._b.appendChild(vid);
    vs.video = vid;
    if (vid.play) { var pr = vid.play(); if (pr && pr.catch) pr.catch(noop); }

    vs.tick = setInterval(function () {
      var m = C.getMsgs()[key];
      if (!m) { closeViewer(); return; }          // delete ho gaya / expire / chat chhod di
      var dd = m.d;
      v._t.textContent = dd.seenAt
        ? '\u23F3 ' + Math.max(0, Math.ceil((dd.seenAt + dd.dur - C.nowS()) / 1000)) + 's'
        : '';
    }, 500);
  }

  function showFile(C, key, d, blob, v) {
    var url = URL.createObjectURL(blob);
    vs.url = url;
    v._b.innerHTML = '';
    var name = safeName(d.fn);
    v._b.appendChild(h('div', 'advic big', '\uD83D\uDCC4'));
    v._b.appendChild(h('div', 'advname', name));
    v._b.appendChild(h('div', 'advmeta', fmtSize(d.sz)));
    var a = h('a', 'adv-dl', '\u2B07 Save karo');
    a.href = url; a.download = name;
    v._b.appendChild(a);
    var note = h('div', 'adv-note', '\u23F3 Server se delete ho rahi hai...');
    v._b.appendChild(note);

    // Khulte hi delete: pehle seenAt, phir message hatao (blob chunks onRemoved se hatenge)
    var ref = C.getMsgRef(), m = C.getMsgs()[key];
    var p = (m && m.d.seenAt) ? Promise.resolve() : ref.child(key + '/seenAt').set(C.TS);
    p.then(function () { return ref.child(key).remove(); }).then(function () {
      note.textContent = '\u2705 Server se delete ho gayi. Screen band karte hi ye yahan se bhi chali jayegi, abhi Save kar lo.';
    }).catch(function () {
      note.textContent = '\u26A0\uFE0F Server se delete nahi hui, thodi der mein apne aap hat jayegi.';
    });
  }

  // chat.js ke buildMessage se bulaya jata hai (type video / file)
  function buildMedia(key, d, m, box) {
    var isV = d.type === 'video';
    var card = h('div', 'advcard');
    card.appendChild(h('span', 'advic', isV ? '\uD83C\uDFAC' : '\uD83D\uDCC4'));
    var info = h('div', '');
    info.appendChild(h('div', 'advname', safeName(d.fn)));
    info.appendChild(h('div', 'advmeta', (isV ? 'Video \u2022 ' + fmtDur(d.dur) + ' \u2022 ' : 'File \u2022 ') + fmtSize(d.sz)));
    info.appendChild(h('div', 'advhint', m.mine ? '\uD83D\uDCE4 Bheja gaya' : (isV ? '\u25B6 Tap to watch' : '\uD83D\uDC41 Tap to open (sirf 1 baar)')));
    card.appendChild(info);
    if (!m.mine) card.addEventListener('click', function (e) { e.stopPropagation(); openMedia(key); });
    box.appendChild(card);
    m.media = card;
  }

  // chat.js ke child_removed se bulaya jata hai
  function onRemoved(key, d) {
    if (!d || (d.type !== 'video' && d.type !== 'file')) return;
    if (d.type === 'video' && vs.key === key) closeViewer();
    var C = window.ChatCore;
    if (C && C.getRoom && C.getRoom()) {
      C.db.ref('chatBlobs/' + C.getRoom() + '/' + key).remove().catch(noop);
    }
  }

  /* ---------- Bhejna ---------- */
  var sending = false;

  function readB64(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(new Error('read')); };
      r.readAsDataURL(f);
    });
  }
  function videoMs(f) {
    return new Promise(function (res) {
      var v = document.createElement('video'), u = URL.createObjectURL(f), done = false;
      function fin(x) { if (done) return; done = true; try { URL.revokeObjectURL(u); } catch (e) {} res(x); }
      v.preload = 'metadata';
      v.onloadedmetadata = function () {
        var s = v.duration;
        fin(isFinite(s) && s > 0 ? Math.max(1000, Math.min(3600000, Math.ceil(s * 1000))) : null);
      };
      v.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 8000);
      v.src = u;
    });
  }
  function uploadChunks(C, base, b64, n, onP) {
    return new Promise(function (resolve, reject) {
      var next = 0, done = 0, failed = false;
      function w() {
        if (failed) return;
        if (next >= n) { if (done >= n) resolve(); return; }
        var i = next++;
        C.db.ref(base + '/c/' + i).set(b64.substr(i * CHUNK, CHUNK)).then(function () {
          done++; onP(Math.round(done * 100 / n)); w();
        }).catch(function (e) { failed = true; reject(e); });
      }
      for (var k = 0; k < Math.min(3, n); k++) w();
    });
  }

  function sendMedia(f) {
    var C = core();
    if (!C || !C.getRoom() || !C.getPeer()) { alert('Pehle koi chat kholo'); return; }
    if (sending) { alert('Pehli file abhi ja rahi hai, ruko'); return; }
    if (BLOCKED.test(f.name || '')) { alert('Is type ki file allowed nahi hai'); return; }
    if (!f.size) { alert('File khali hai'); return; }
    if (f.size > MAX_BYTES) { alert('File ' + (MAX_BYTES / 1048576) + ' MB se chhoti honi chahiye'); return; }

    var ref = C.getMsgRef(), room = C.getRoom(), me = C.getMe();
    var name = safeName(f.name);
    var prog = h('div', 'msg mine adv-up', '\u2B06\uFE0F ' + name + ' taiyaar ho rahi hai...');
    var list = $('messages');
    list.appendChild(prog); list.scrollTop = list.scrollHeight;
    sending = true;

    var base = null;
    var isVideo = (f.type || '').indexOf('video/') === 0;
    (isVideo ? videoMs(f) : Promise.resolve(null)).then(function (ms) {
      var asVideo = isVideo && !!ms;
      return readB64(f).then(function (b64) {
        var n = Math.ceil(b64.length / CHUNK);
        if (n < 1 || n > MAX_CHUNKS) throw new Error('size');
        var key = ref.push().key;
        base = 'chatBlobs/' + room + '/' + key;
        return C.db.ref(base + '/o').set(me.uid).then(function () {
          return uploadChunks(C, base, b64, n, function (p) { prog.textContent = '\u2B06\uFE0F ' + name + '  ' + p + '%'; });
        }).then(function () {
          var meta = { from: me.uid, type: asVideo ? 'video' : 'file', fn: name, sz: f.size, nc: n, dur: asVideo ? ms : 60000, t: C.TS };
          if (/^[\w.+-]+\/[\w.+-]+$/.test(f.type || '') && f.type.length <= 100) meta.mime = f.type;
          return ref.child(key).set(meta);
        });
      });
    }).then(function () {
      if (C.getRoom() === room && C.getPeer()) C.touchPeer();
    }).catch(function () {
      if (base) C.db.ref(base).remove().catch(noop);
      alert('Bhej nahi paye, dobara try karo');
    }).then(function () {
      sending = false;
      if (prog.parentNode) prog.parentNode.removeChild(prog);
    });
  }

  clip.addEventListener('click', function () { pick.click(); });
  pick.addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (f) sendMedia(f);
  });

  /* ---------- chat.js ke liye hooks ---------- */
  window.ChatAdv = {
    // null = Auto (purana default). Warna { dur(ms), mode: 'sent' | null }
    timerFor: function () {
      return cfg ? { dur: cfg.sec * 1000, mode: cfg.mode === 'sent' ? 'sent' : null } : null;
    },
    buildMedia: buildMedia,
    onRemoved: onRemoved
  };
})();
