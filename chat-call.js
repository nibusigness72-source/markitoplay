// =====================================================================
// chat-call.js  -  Voice call + VIDEO call inside chat (free, no minute limit)
//  * Voice call (📞): Speaker, Mute, Hold, Notes + End   (same as before)
//  * Video call (🎥): WhatsApp style
//      - Samne wale ki video FULL SCREEN, apni video chhoti window mein
//      - Chhoti window ko ungli se kisi bhi KONE (corner) mein khicho
//      - Chhoti window par TAP = dono video ki jagah badal jaati hai
//      - Screen par TAP = buttons chhupao / dikhao
//      - Buttons: Speaker, Mute, Camera on/off, Camera flip (front/back), Hold, Notes, End
//  * Caller sees: Calling... -> Ringing... -> timer
//  * Receiver declines / busy  -> caller sees "User is busy"
//  * Receiver does not pick / offline -> caller sees "User is not available"
//  * Uses WebRTC + Firebase Database ("calls" and "callInbox" rules)
// Add in chat.html (after chat-links.js):  <script src="chat-call.js"></script>
// =====================================================================
(function () {
  'use strict';
  if (!document.getElementById('searchForm') || !window.firebase || !firebase.database) return;
  var db = firebase.database();
  var TS = firebase.database.ServerValue.TIMESTAMP;

  var CONFIG = {
    RING_SEC: 40,              // kitne second tak ghanti bajegi
    VIDEO_WIDTH: 1280,         // video size (1280x720 = HD). Data kam karna ho to 640 x 480
    VIDEO_HEIGHT: 720,
    VIDEO_FPS: 24,             // video ki speed
    VIDEO_MAX_KBPS: 1200,      // video ka data limit (kbps). 0 = koi limit nahi
    ICE: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
      // , { urls: 'turn:YOUR_HOST:3478', username: 'USER', credential: 'PASS' }
    ]
  };
  var T = {
    calling: 'Calling...', ringing: 'Ringing...', incoming: 'Incoming voice call', incomingVideo: 'Incoming video call',
    connecting: 'Connecting...',
    declined: 'User is busy', busy: 'User is busy', ended: 'Call ended', noAnswer: 'User is not available',
    fail: 'Call failed. Please try again.', netFail: 'Connection lost',
    micDenied: 'Please allow Microphone permission to make calls.',
    noCam: 'Camera not available - joining with voice only.',
    noSupport: 'Calls are not supported on this browser.',
    accept: 'Accept', decline: 'Decline', end: 'End', mute: 'Mute', unmute: 'Unmute',
    speaker: 'Speaker', hold: 'Hold', notes: 'Notes', onHold: 'On hold',
    camOff: 'Camera off', camOn: 'Camera on', flip: 'Flip', flipFail: 'Could not switch camera.',
    peerCamOff: '📷 Camera off',
    noSpeaker: 'Speaker switch is not supported on this browser. Use phone volume.',
    notesHint: 'Write notes during the call...', close: 'Close'
  };

  function core() { return window.ChatCore; }
  function nowS() { var C = core(); return C ? C.nowS() : Date.now(); }
  function noop() {}
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }

  /* =================== STYLE =================== */
  var st = h('style');
  st.textContent = [
    '.cl-btn{margin-left:auto;background:#16a34a;border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer;flex-shrink:0}',
    '.cl-btn+.cl-btn{margin-left:8px}',
    '.cl-btn.vid{background:#2563eb}',
    '#callUi{position:fixed;inset:0;z-index:400;background:radial-gradient(circle at 50% 0,#0b2257,#050a1c 70%);display:none;flex-direction:column;align-items:center;justify-content:space-between;padding:60px 20px 50px;color:#fff;font-family:Arial,sans-serif;overflow:hidden}',
    '#callUi .cl-av{width:110px;height:110px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:700;border:3px solid #22d3ee;margin:0 auto 16px}',
    '#callUi .cl-nm{font-size:26px;font-weight:700;text-align:center;word-break:break-word}',
    '#callUi .cl-st{font-size:16px;color:#9fb0d9;text-align:center;margin-top:8px;min-height:20px}',
    '#callUi .cl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px 26px;justify-items:center;width:100%;max-width:340px}',
    '#callUi .cl-row{display:flex;gap:34px;justify-content:center}',
    '#callUi .cl-b{display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:none;color:#fff;font-size:13px;cursor:pointer}',
    '#callUi .cl-b i{font-style:normal;width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#16245e}',
    '#callUi .cl-b.red i{background:#dc2626}#callUi .cl-b.green i{background:#16a34a}#callUi .cl-b.on i{background:#fff;color:#0f1b47}',
    '#callUi .cl-toast{position:absolute;left:20px;right:20px;bottom:150px;background:#1e293b;color:#fff;font-size:13px;padding:10px 12px;border-radius:10px;text-align:center;display:none;z-index:6}',
    '#callUi .cl-notes{position:absolute;inset:0;background:#050a1c;display:none;flex-direction:column;padding:60px 16px 30px;gap:12px;z-index:7}',
    '#callUi .cl-notes textarea{flex:1;background:#0f1b47;color:#fff;border:1px solid #22d3ee;border-radius:12px;padding:12px;font-size:16px;resize:none;outline:none}',
    '#callUi .cl-notes button{background:#16a34a;color:#fff;border:none;border-radius:12px;padding:13px;font-size:16px;cursor:pointer}',

    /* ---------- VIDEO CALL ---------- */
    '#callUi .cl-v{position:absolute;object-fit:cover;background:#000;display:block}',
    '#callUi:not(.vmode) .cl-v,#callUi.vend .cl-v,#callUi .cl-v.hidden{display:none}',
    '#callUi .cl-big{inset:0;width:100%;height:100%;z-index:1}',
    '#callUi .cl-pip{width:28vw;min-width:96px;max-width:150px;aspect-ratio:3/4;height:auto;border-radius:14px;border:2px solid rgba(255,255,255,.8);box-shadow:0 4px 16px rgba(0,0,0,.6);z-index:2;touch-action:none;cursor:grab}',
    '#callUi .cl-pip.tl{top:76px;left:12px}',
    '#callUi .cl-pip.tr{top:76px;right:12px}',
    '#callUi .cl-pip.bl{bottom:230px;left:12px}',
    '#callUi .cl-pip.br{bottom:230px;right:12px}',
    '#callUi .cl-pip.dragging{opacity:.9}',
    '#callUi .cl-v.mir{transform:scaleX(-1)}',
    '#callUi.vmode{background:#000;padding:0;justify-content:flex-end}',
    '#callUi.vmode .cl-top{position:absolute;top:0;left:0;right:0;z-index:3;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 30px;background:linear-gradient(rgba(0,0,0,.65),transparent)}',
    '#callUi.vmode .cl-av{display:none}',
    '#callUi.vmode .cl-nm{font-size:19px;text-align:left}',
    '#callUi.vmode .cl-st{font-size:14px;color:#e2e8f0;text-align:left;margin-top:2px}',
    '#callUi.vmode .cl-grid{position:absolute;left:0;right:0;bottom:130px;z-index:3;display:flex!important;flex-wrap:wrap;gap:12px 10px;max-width:none;padding:0 10px;justify-content:center}',
    '#callUi.vmode .cl-row{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 30px);z-index:3}',
    '#callUi.vmode .cl-b{font-size:11px;text-shadow:0 1px 3px #000}',
    '#callUi.vmode .cl-grid .cl-b i{width:52px;height:52px;font-size:22px;background:rgba(30,41,59,.78)}',
    '#callUi.vmode .cl-grid .cl-b.on i{background:#fff;color:#0f1b47}',
    '#callUi.vmode .cl-toast{bottom:250px}',
    '#callUi .cl-top,#callUi .cl-grid,#callUi .cl-row{transition:opacity .25s}',
    '#callUi.hidectl .cl-top,#callUi.hidectl .cl-grid,#callUi.hidectl .cl-row{opacity:0;pointer-events:none}',
    '#callUi .cl-roff{position:absolute;left:0;right:0;top:45%;z-index:2;display:none;justify-content:center;pointer-events:none}',
    '#callUi .cl-roff span{background:rgba(0,0,0,.65);padding:8px 14px;border-radius:20px;font-size:14px}'
  ].join('\n');
  document.head.appendChild(st);

  // Awaaz isi element se chalti hai (speaker / hold isi par kaam karta hai)
  var audio = document.createElement('audio');
  audio.autoplay = true; audio.setAttribute('playsinline', '');
  document.body.appendChild(audio);

  /* =================== CALL SCREEN =================== */
  var ui = null, uiTimer = null, toastT = null;

  function mkVideo() {
    var v = h('video', 'cl-v');
    v.autoplay = true; v.muted = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    return v;
  }
  function playVid(v) { var p = v.play(); if (p && p.catch) p.catch(noop); }

  function buildUi() {
    ui = h('div'); ui.id = 'callUi';
    var vr = mkVideo(), vl = mkVideo();
    var roff = h('div', 'cl-roff'); roff.appendChild(h('span', '', T.peerCamOff));
    var top = h('div', 'cl-top'); top.style.width = '100%';
    var av = h('div', 'cl-av'), nm = h('div', 'cl-nm'), s = h('div', 'cl-st');
    top.appendChild(av); top.appendChild(nm); top.appendChild(s);
    var grid = h('div', 'cl-grid');
    var row = h('div', 'cl-row');
    var toast = h('div', 'cl-toast');
    var notes = h('div', 'cl-notes');
    var ta = h('textarea'); ta.placeholder = T.notesHint;
    try { ta.value = localStorage.getItem('cl_notes') || ''; } catch (e) {}
    ta.addEventListener('input', function () { try { localStorage.setItem('cl_notes', ta.value); } catch (e) {} });
    var cb = h('button', '', T.close); cb.type = 'button';
    cb.addEventListener('click', function () { notes.style.display = 'none'; });
    notes.appendChild(ta); notes.appendChild(cb);
    ui.appendChild(vr); ui.appendChild(vl); ui.appendChild(roff);
    ui.appendChild(top); ui.appendChild(grid); ui.appendChild(row); ui.appendChild(toast); ui.appendChild(notes);
    ui._av = av; ui._nm = nm; ui._st = s; ui._grid = grid; ui._row = row; ui._toast = toast; ui._notes = notes;
    ui._vr = vr; ui._vl = vl; ui._roff = roff;
    document.body.appendChild(ui);
    initPip();
  }
  function toast(msg) {
    if (!ui) return;
    ui._toast.textContent = msg; ui._toast.style.display = 'block';
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { ui._toast.style.display = 'none'; }, 3000);
  }
  function btn(icon, label, cls, fn) {
    var b = h('button', 'cl-b' + (cls ? ' ' + cls : '')); b.type = 'button';
    b.appendChild(h('i', '', icon)); b.appendChild(h('span', '', label));
    b.addEventListener('click', fn); return b;
  }

  function applyMic(c) {
    var t = c.stream && c.stream.getAudioTracks()[0];
    if (t) t.enabled = !(c.mute || c.hold);
    audio.muted = !!c.hold;
  }
  function applySpeaker(c, quiet) {
    var fail = function () { c.spk = false; if (!quiet) toast(T.noSpeaker); };
    if (!audio.setSinkId || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { fail(); return Promise.resolve(); }
    return navigator.mediaDevices.enumerateDevices().then(function (list) {
      var outs = list.filter(function (d) { return d.kind === 'audiooutput'; });
      var pick = null, i;
      for (i = 0; i < outs.length; i++) {
        var lb = (outs[i].label || '').toLowerCase();
        if (c.spk && lb.indexOf('speaker') > -1) pick = outs[i];
        if (!c.spk && (lb.indexOf('earpiece') > -1 || lb.indexOf('receiver') > -1)) pick = outs[i];
      }
      if (!pick) { if (!c.spk) return; fail(); return; }
      return audio.setSinkId(pick.deviceId);
    }).catch(fail);
  }
  function tick(c) {
    if (!c.t0) return;
    var sec = Math.floor((Date.now() - c.t0) / 1000), m = Math.floor(sec / 60), r = sec % 60;
    setStatus((c.hold ? T.onHold + ' - ' : '') + (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r);
  }

  /* ----- video helpers ----- */
  function layoutVideo(c) {
    if (!ui || !c || !c.vid) return;
    var local = ui._vl, remote = ui._vr;
    var big = c.localBig ? local : remote;
    var small = c.localBig ? remote : local;
    var mir = c.facing === 'user';
    big.className = 'cl-v cl-big' + (big === local && mir ? ' mir' : '');
    small.className = 'cl-v cl-pip ' + c.pip + (small === local && mir ? ' mir' : '') + (c.t0 ? '' : ' hidden');
    ui._roff.style.display = (c.peerCamOff && c.t0) ? 'flex' : 'none';
  }
  function attachStreams(c) {
    if (!ui || !c || !c.vid) return;
    if (c.localPreview && ui._vl.srcObject !== c.localPreview) { ui._vl.srcObject = c.localPreview; playVid(ui._vl); }
    if (c.remoteStream && ui._vr.srcObject !== c.remoteStream) { ui._vr.srcObject = c.remoteStream; playVid(ui._vr); }
  }
  function swapViews() {
    var c = call;
    if (!c || !c.vid || !c.t0) return;
    c.localBig = !c.localBig;
    layoutVideo(c);
  }
  // Chhoti window: khicho = kone mein chipak jaye, tap = jagah badlo
  function initPip() {
    var drag = null;
    ui.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('cl-pip')) return;
      var r = t.getBoundingClientRect();
      drag = { el: t, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
      try { t.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ui.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      drag.moved = true;
      var el = drag.el;
      el.classList.add('dragging');
      el.style.left = (drag.ox + dx) + 'px'; el.style.top = (drag.oy + dy) + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
    });
    function end() {
      if (!drag) return;
      var d = drag; drag = null;
      var el = d.el;
      el.classList.remove('dragging');
      if (!d.moved) { swapViews(); return; }
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var c = call;
      if (c) c.pip = (cy < window.innerHeight / 2 ? 't' : 'b') + (cx < window.innerWidth / 2 ? 'l' : 'r');
      el.style.left = el.style.top = el.style.right = el.style.bottom = '';
      layoutVideo(c);
    }
    ui.addEventListener('pointerup', end);
    ui.addEventListener('pointercancel', end);
    // Badi screen par tap = buttons chhupao / dikhao
    ui.addEventListener('click', function (e) {
      var c = call;
      if (!c || !c.vid || !c.t0) return;
      if (e.target.classList && e.target.classList.contains('cl-big')) ui.classList.toggle('hidectl');
    });
  }
  function toggleCam(c) {
    var t = c.stream.getVideoTracks()[0];
    if (!t) return;
    c.camOff = !c.camOff;
    t.enabled = !c.camOff;
    var me = core().getMe();
    if (me) db.ref('calls/' + c.room + '/cam/' + me.uid).set(!c.camOff).catch(noop);
    renderGrid();
  }
  function capBitrate(c) {
    if (!CONFIG.VIDEO_MAX_KBPS) return;
    try {
      c.pc.getSenders().forEach(function (s) {
        if (!s.track || s.track.kind !== 'video' || !s.getParameters || !s.setParameters) return;
        var p = s.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = CONFIG.VIDEO_MAX_KBPS * 1000;
        s.setParameters(p).catch(noop);
      });
    } catch (e) {}
  }
  function camConstraints(face) {
    return { facingMode: face ? { ideal: face } : 'user', width: { ideal: CONFIG.VIDEO_WIDTH }, height: { ideal: CONFIG.VIDEO_HEIGHT }, frameRate: { ideal: CONFIG.VIDEO_FPS } };
  }
  function flipCam(c) {
    if (c.flipping) return;
    var old = c.stream.getVideoTracks()[0];
    if (!old) return;
    c.flipping = true;
    var next = c.facing === 'user' ? 'environment' : 'user';
    function getCam(face) { return navigator.mediaDevices.getUserMedia({ video: camConstraints(face) }); }
    function useTrack(ns, face) {
      var nt = ns.getVideoTracks()[0];
      nt.enabled = !c.camOff;
      var sender = c.pc.getSenders().filter(function (s) { return s.track === old; })[0];
      var p = sender ? sender.replaceTrack(nt) : Promise.resolve();
      return p.then(function () {
        try { c.stream.removeTrack(old); } catch (e) {}
        c.stream.addTrack(nt);
        old = nt; c.facing = face;
        c.localPreview = new MediaStream([nt]);
        attachStreams(c); layoutVideo(c); capBitrate(c);
      });
    }
    old.stop();   // kai phone mein pehla camera band kiye bina doosra nahi khulta
    getCam(next).then(function (ns) { return useTrack(ns, next); }).catch(function () {
      return getCam(c.facing).then(function (ns) { return useTrack(ns, c.facing); }).then(function () { toast(T.flipFail); });
    }).catch(function () { toast(T.flipFail); }).then(function () { c.flipping = false; });
  }

  function renderGrid() {
    if (!ui) return;
    ui._grid.innerHTML = '';
    var c = call;
    if (!c) { ui._grid.style.display = 'none'; return; }
    ui._grid.style.display = 'grid';
    ui._grid.appendChild(btn('🔊', T.speaker, c.spk ? 'on' : '', function () {
      c.spk = !c.spk; applySpeaker(c).then(renderGrid);
    }));
    ui._grid.appendChild(btn(c.mute ? '🔇' : '🎤', c.mute ? T.unmute : T.mute, c.mute ? 'on' : '', function () {
      c.mute = !c.mute; applyMic(c); renderGrid();
    }));
    if (c.vid && c.stream.getVideoTracks().length) {
      ui._grid.appendChild(btn(c.camOff ? '🚫' : '📷', c.camOff ? T.camOn : T.camOff, c.camOff ? 'on' : '', function () { toggleCam(c); }));
      ui._grid.appendChild(btn('🔄', T.flip, '', function () { flipCam(c); }));
    }
    ui._grid.appendChild(btn('⏸', T.hold, c.hold ? 'on' : '', function () {
      if (!c.t0) return;
      c.hold = !c.hold; applyMic(c); tick(c); renderGrid();
    }));
    ui._grid.appendChild(btn('📝', T.notes, '', function () { ui._notes.style.display = 'flex'; }));
  }
  function showUi(mode, name, status) {   // mode: out | in | live
    if (!ui) buildUi();
    var c = call;
    var vmode = !!(c && c.vid && mode !== 'in');
    ui.style.display = 'flex';
    ui.classList.toggle('vmode', vmode);
    ui.classList.remove('vend');
    if (!vmode) ui.classList.remove('hidectl');
    ui._av.textContent = (name || '?').charAt(0).toUpperCase();
    ui._nm.textContent = name || '';
    ui._st.textContent = status || '';
    ui._row.innerHTML = '';
    ui._notes.style.display = 'none';
    if (mode === 'in') {
      ui._grid.style.display = 'none';
      ui._row.appendChild(btn('📵', T.decline, 'red', declineCall));
      ui._row.appendChild(btn(incoming && incoming.vid ? '🎥' : '📞', T.accept, 'green', acceptCall));
    } else {
      renderGrid();
      ui._row.appendChild(btn('📵', T.end, 'red', function () { endCall('end', T.ended); }));
    }
    if (vmode) { attachStreams(c); layoutVideo(c); }
  }
  function setStatus(t) { if (ui) ui._st.textContent = t; }
  function hideUi() {
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
    if (ui) {
      ui.style.display = 'none'; ui._notes.style.display = 'none';
      ui.classList.remove('vmode', 'vend', 'hidectl');
    }
  }

  /* =================== RING TONE =================== */
  var rg = null;
  function ring(on) {
    if (rg) { clearInterval(rg.i); try { rg.ctx.close(); } catch (e) {} rg = null; }
    if (navigator.vibrate) navigator.vibrate(0);
    if (!on) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      var beep = function () {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 440; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.35);
        if (navigator.vibrate) navigator.vibrate(300);
      };
      beep(); rg = { ctx: ctx, i: setInterval(beep, 1500) };
    } catch (e) {}
  }

  /* screen on rakho (video call mein) */
  var wl = null;
  function wakeOn() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(noop); } catch (e) {} }
  function wakeOff() { try { if (wl) { wl.release(); wl = null; } } catch (e) {} }

  /* =================== CALL ENGINE =================== */
  var call = null;
  var incoming = null;

  function pushIce(c, s) { db.ref('calls/' + c.room + '/ic/' + core().getMe().uid).push(s).catch(noop); }
  function flushQueue(c) {
    c.queue.forEach(function (cand) { c.pc.addIceCandidate(cand).catch(noop); });
    c.queue = [];
  }
  function listenIce(c) {
    var ref = db.ref('calls/' + c.room + '/ic/' + c.peerUid);
    var fn = ref.on('child_added', function (s) {
      var cand; try { cand = new RTCIceCandidate(JSON.parse(s.val())); } catch (e) { return; }
      if (c.haveRemote) c.pc.addIceCandidate(cand).catch(noop); else c.queue.push(cand);
    });
    c.refs.push(function () { ref.off('child_added', fn); });
  }
  function watchRoom(c) {
    var ref = db.ref('calls/' + c.room);
    var fn = ref.on('value', function (s) {
      if (call !== c) return;
      var v = s.val();
      if (!v) { finish(c, T.ended); return; }
      if (c.vid) {
        var off = !!(v.cam && v.cam[c.peerUid] === false);
        if (off !== c.peerCamOff) { c.peerCamOff = off; layoutVideo(c); }
      }
      if (c.role === 'caller' && v.st === 'ringing' && !c.t0) setStatus(T.ringing);
      if (c.role === 'caller' && v.st === 'accept' && v.answer && !c.gotAnswer) {
        c.gotAnswer = true;
        c.pc.setRemoteDescription(new RTCSessionDescription(v.answer)).then(function () {
          c.haveRemote = true; flushQueue(c); setStatus(T.connecting);
        }).catch(function () { endCall('end', T.fail); });
      }
      if (v.st === 'decline') finish(c, T.declined);
      else if (v.st === 'busy') finish(c, T.busy);
      else if (v.st === 'end') finish(c, T.ended);
    });
    c.refs.push(function () { ref.off('value', fn); });
  }

  // Awaaz (+ video agar chahiye). Camera na mile to sirf awaaz se judo.
  function getMedia(vid) {
    var md = navigator.mediaDevices;
    if (!vid) return md.getUserMedia({ audio: true });
    return md.getUserMedia({ audio: true, video: camConstraints('user') }).catch(function () {
      return md.getUserMedia({ audio: true });
    });
  }

  function newCall(room, role, peerUid, name, stream, vid) {
    var c = { room: room, role: role, peerUid: peerUid, name: name, stream: stream, pc: null, vid: !!vid,
      refs: [], queue: [], out: [], ready: false, haveRemote: false, gotAnswer: false, ended: false, t0: 0,
      mute: false, hold: false, spk: false,
      facing: 'user', camOff: false, peerCamOff: false, localBig: true, pip: 'tr',
      localPreview: null, remoteStream: null, flipping: false };
    var pc = new RTCPeerConnection({ iceServers: CONFIG.ICE });
    c.pc = pc;
    stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
    var vts = stream.getVideoTracks();
    if (vts.length) c.localPreview = new MediaStream(vts);
    // Meri camera nahi hai, par samne wale ki video dekhni hai
    if (vid && !vts.length && role === 'caller') {
      try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch (e) {}
    }
    pc.ontrack = function (e) {
      var s = (e.streams && e.streams[0]) || new MediaStream([e.track]);
      if (e.track.kind === 'audio') {
        audio.srcObject = s;
        var p = audio.play(); if (p && p.catch) p.catch(noop);
      } else if (e.track.kind === 'video') {
        c.remoteStream = s;
        if (ui) { ui._vr.srcObject = s; playVid(ui._vr); }
      }
    };
    pc.onicecandidate = function (e) {
      if (!e.candidate) return;
      var s = JSON.stringify(e.candidate);
      if (c.ready) pushIce(c, s); else c.out.push(s);
    };
    pc.onconnectionstatechange = function () {
      if (call !== c) return;
      var s = pc.connectionState;
      if (s === 'connected' && !c.t0) {
        c.t0 = Date.now(); ring(false);
        if (c.ringTimer) { clearTimeout(c.ringTimer); c.ringTimer = null; }
        if (c.vid) c.localBig = false;      // ab samne wale ki video full screen
        showUi('live', c.name, '00:00');
        uiTimer = setInterval(function () { tick(c); }, 1000);
        if (c.vid) {
          capBitrate(c); wakeOn();
          c.spk = true;                     // video call mein pehle se speaker
          applySpeaker(c, true).then(renderGrid);
        }
      } else if (s === 'failed') {
        endCall('end', T.netFail);
      } else if (s === 'disconnected') {
        setTimeout(function () { if (call === c && pc.connectionState === 'disconnected') endCall('end', T.netFail); }, 8000);
      }
    };
    call = c;
    return c;
  }
  function openReady(c) {
    c.ready = true;
    c.out.forEach(function (s) { pushIce(c, s); });
    c.out = [];
  }

  function finish(c, msg) {
    if (c.ended) return;
    c.ended = true;
    ring(false); wakeOff();
    if (c.ringTimer) clearTimeout(c.ringTimer);
    c.refs.forEach(function (f) { try { f(); } catch (e) {} });
    try { c.pc.close(); } catch (e) {}
    try { c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    audio.srcObject = null; audio.muted = false;
    if (ui) { ui._vl.srcObject = null; ui._vr.srcObject = null; ui.classList.add('vend'); ui._roff.style.display = 'none'; }
    if (call === c) call = null;
    var me = core().getMe();
    if (c.role === 'caller' && !c.t0) db.ref('callInbox/' + c.peerUid).remove().catch(noop);
    if (c.role === 'callee') db.ref('callInbox/' + me.uid).remove().catch(noop);
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
    if (msg) {
      if (ui) { ui._grid.style.display = 'none'; ui._notes.style.display = 'none'; }
      setStatus(msg);
      setTimeout(function () { if (!call && !incoming) hideUi(); }, 2500);
    } else hideUi();
    setTimeout(function () {
      var ref = db.ref('calls/' + c.room);
      ref.once('value').then(function (s) {
        var v = s.val();
        if (v && (v.st === 'end' || v.st === 'decline' || v.st === 'busy')) ref.remove().catch(noop);
      }).catch(noop);
    }, 3000);
  }
  function endCall(st, msg) {
    var c = call; if (!c) return;
    db.ref('calls/' + c.room).update({ st: st }).catch(noop);
    finish(c, msg);
  }

  /* ----- caller ----- */
  function startCall(vid) {
    var C = core(), me = C.getMe(), peer = C.getPeer(), room = C.getRoom();
    if (!me || !peer || !room || call || incoming) return;
    if (!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert(T.noSupport); return; }
    var name = peer.nick || peer.name || 'Player';
    getMedia(vid).then(function (stream) {
      var c = newCall(room, 'caller', peer.uid, name, stream, vid);
      showUi('out', name, T.calling);
      if (vid && !stream.getVideoTracks().length) toast(T.noCam);
      c.pc.createOffer().then(function (o) { return c.pc.setLocalDescription(o); }).then(function () {
        var d = c.pc.localDescription;
        var data = { from: me.uid, to: peer.uid, st: 'ring', t: TS, offer: { type: d.type, sdp: d.sdp } };
        if (vid) data.vid = true;
        return db.ref('calls/' + room).set(data);
      }).then(function () {
        openReady(c); listenIce(c);
        var inb = { room: room, from: me.uid, n: (me.cname || me.name || 'Player').slice(0, 30), t: TS };
        if (vid) inb.vid = true;
        return db.ref('callInbox/' + peer.uid).set(inb);
      }).then(function () {
        watchRoom(c); ring(true);
        c.ringTimer = setTimeout(function () { if (call === c && !c.t0) endCall('end', T.noAnswer); }, CONFIG.RING_SEC * 1000);
      }).catch(function () { finish(c, T.fail); });
    }, function () { alert(T.micDenied); });
  }

  /* ----- receiver ----- */
  function showIncoming(v) {
    var C = core(), name = v.n || 'Player';
    var inbox = C.getInbox() || {};
    Object.keys(inbox).forEach(function (r) { if (inbox[r] && inbox[r].uid === v.from) name = inbox[r].nick || inbox[r].n || name; });
    incoming = { room: v.room, from: v.from, name: name, vid: !!v.vid };
    showUi('in', name, v.vid ? T.incomingVideo : T.incoming);
    ring(true);
    // tell the caller that this phone is ringing
    db.ref('calls/' + v.room).once('value').then(function (s) {
      var d = s.val();
      if (d && d.st === 'ring') db.ref('calls/' + v.room).update({ st: 'ringing' }).catch(noop);
    }).catch(noop);
    incoming.timer = setTimeout(function () { if (incoming && incoming.room === v.room) dropIncoming(); }, CONFIG.RING_SEC * 1000);
  }
  function dropIncoming() {
    if (!incoming) return;
    clearTimeout(incoming.timer); incoming = null;
    ring(false); hideUi();
    var me = core().getMe(); if (me) db.ref('callInbox/' + me.uid).remove().catch(noop);
  }
  function declineCall() {
    var inc = incoming; if (!inc) return;
    clearTimeout(inc.timer); incoming = null; ring(false); hideUi();
    var me = core().getMe();
    db.ref('calls/' + inc.room).update({ st: 'decline' }).catch(noop);
    db.ref('callInbox/' + me.uid).remove().catch(noop);
  }
  function acceptCall() {
    var inc = incoming; if (!inc) return;
    var me = core().getMe();
    clearTimeout(inc.timer); incoming = null; ring(false);
    showUi('out', inc.name, T.connecting);
    getMedia(inc.vid).then(function (stream) {
      var c = newCall(inc.room, 'callee', inc.from, inc.name, stream, inc.vid);
      showUi('out', inc.name, T.connecting);
      if (inc.vid && !stream.getVideoTracks().length) toast(T.noCam);
      db.ref('calls/' + inc.room).once('value').then(function (s) {
        var v = s.val();
        if (!v || (v.st !== 'ring' && v.st !== 'ringing') || !v.offer || v.from !== inc.from) throw new Error('gone');
        return c.pc.setRemoteDescription(new RTCSessionDescription(v.offer)).then(function () {
          c.haveRemote = true;
          return c.pc.createAnswer();
        }).then(function (a) { return c.pc.setLocalDescription(a); }).then(function () {
          var d = c.pc.localDescription;
          return db.ref('calls/' + inc.room).update({ st: 'accept', answer: { type: d.type, sdp: d.sdp } });
        });
      }).then(function () {
        openReady(c); listenIce(c); watchRoom(c);
        db.ref('callInbox/' + me.uid).remove().catch(noop);
        flushQueue(c);
      }).catch(function () { finish(c, T.ended); });
    }, function () {
      hideUi(); alert(T.micDenied);
      db.ref('calls/' + inc.room).update({ st: 'decline' }).catch(noop);
      db.ref('callInbox/' + me.uid).remove().catch(noop);
    });
  }
  function listenInbox() {
    var me = core().getMe();
    db.ref('callInbox/' + me.uid).on('value', function (s) {
      var v = s.val();
      if (!v) { if (incoming) dropIncoming(); return; }
      if (nowS() - v.t > (CONFIG.RING_SEC + 5) * 1000) { s.ref.remove().catch(noop); return; }
      if (incoming && incoming.room === v.room) return;
      if (call || incoming) {   // already on another call -> caller sees "User is busy"
        db.ref('calls/' + v.room).update({ st: 'busy' }).catch(noop);
        s.ref.remove().catch(noop);
        return;
      }
      showIncoming(v);
    });
  }
  /* =================== START =================== */
  function addBtn() {
    var head = document.querySelector('#chatView .chat-head');
    if (!head || document.getElementById('callBtn')) return;
    var b = h('button', 'cl-btn', '📞'); b.id = 'callBtn'; b.type = 'button'; b.title = 'Voice call';
    b.addEventListener('click', function () { startCall(false); });
    var v = h('button', 'cl-btn vid', '🎥'); v.id = 'vcallBtn'; v.type = 'button'; v.title = 'Video call';
    v.addEventListener('click', function () { startCall(true); });
    head.appendChild(b); head.appendChild(v);
  }
  addBtn();
  var wait = setInterval(function () {
    var C = core();
    if (C && C.getMe()) { clearInterval(wait); listenInbox(); }
  }, 700);
})();
