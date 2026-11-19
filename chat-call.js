// =====================================================================
// chat-call.js  -  Voice call inside chat (free, no minute limit)
//  * Phone-style call screen: Speaker, Mute, Hold, Notes + End button
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
    RING_SEC: 40,
    ICE: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
      // , { urls: 'turn:YOUR_HOST:3478', username: 'USER', credential: 'PASS' }
    ]
  };
  var T = {
    calling: 'Calling...', ringing: 'Ringing...', incoming: 'Incoming voice call', connecting: 'Connecting...',
    declined: 'User is busy', busy: 'User is busy', ended: 'Call ended', noAnswer: 'User is not available',
    fail: 'Call failed. Please try again.', netFail: 'Connection lost',
    micDenied: 'Please allow Microphone permission to make calls.',
    noSupport: 'Calls are not supported on this browser.',
    accept: 'Accept', decline: 'Decline', end: 'End', mute: 'Mute', unmute: 'Unmute',
    speaker: 'Speaker', hold: 'Hold', notes: 'Notes', onHold: 'On hold',
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
    '#callUi{position:fixed;inset:0;z-index:400;background:radial-gradient(circle at 50% 0,#0b2257,#050a1c 70%);display:none;flex-direction:column;align-items:center;justify-content:space-between;padding:60px 20px 50px;color:#fff;font-family:Arial,sans-serif}',
    '#callUi .cl-av{width:110px;height:110px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:700;border:3px solid #22d3ee;margin:0 auto 16px}',
    '#callUi .cl-nm{font-size:26px;font-weight:700;text-align:center;word-break:break-word}',
    '#callUi .cl-st{font-size:16px;color:#9fb0d9;text-align:center;margin-top:8px;min-height:20px}',
    '#callUi .cl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px 26px;justify-items:center;width:100%;max-width:340px}',
    '#callUi .cl-row{display:flex;gap:34px;justify-content:center}',
    '#callUi .cl-b{display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:none;color:#fff;font-size:13px;cursor:pointer}',
    '#callUi .cl-b i{font-style:normal;width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#16245e}',
    '#callUi .cl-b.red i{background:#dc2626}#callUi .cl-b.green i{background:#16a34a}#callUi .cl-b.on i{background:#fff;color:#0f1b47}',
    '#callUi .cl-toast{position:absolute;left:20px;right:20px;bottom:150px;background:#1e293b;color:#fff;font-size:13px;padding:10px 12px;border-radius:10px;text-align:center;display:none}',
    '#callUi .cl-notes{position:absolute;inset:0;background:#050a1c;display:none;flex-direction:column;padding:60px 16px 30px;gap:12px}',
    '#callUi .cl-notes textarea{flex:1;background:#0f1b47;color:#fff;border:1px solid #22d3ee;border-radius:12px;padding:12px;font-size:16px;resize:none;outline:none}',
    '#callUi .cl-notes button{background:#16a34a;color:#fff;border:none;border-radius:12px;padding:13px;font-size:16px;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(st);

  var audio = document.createElement('audio');
  audio.autoplay = true; audio.setAttribute('playsinline', '');
  document.body.appendChild(audio);

  /* =================== CALL SCREEN =================== */
  var ui = null, uiTimer = null, toastT = null;
  function buildUi() {
    ui = h('div'); ui.id = 'callUi';
    var top = h('div'); top.style.width = '100%';
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
    ui.appendChild(top); ui.appendChild(grid); ui.appendChild(row); ui.appendChild(toast); ui.appendChild(notes);
    ui._av = av; ui._nm = nm; ui._st = s; ui._grid = grid; ui._row = row; ui._toast = toast; ui._notes = notes;
    document.body.appendChild(ui);
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
  function applySpeaker(c) {
    if (!audio.setSinkId || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { c.spk = false; toast(T.noSpeaker); return Promise.resolve(); }
    return navigator.mediaDevices.enumerateDevices().then(function (list) {
      var outs = list.filter(function (d) { return d.kind === 'audiooutput'; });
      var pick = null, i;
      for (i = 0; i < outs.length; i++) {
        var lb = (outs[i].label || '').toLowerCase();
        if (c.spk && lb.indexOf('speaker') > -1) pick = outs[i];
        if (!c.spk && (lb.indexOf('earpiece') > -1 || lb.indexOf('receiver') > -1)) pick = outs[i];
      }
      if (!pick) { if (!c.spk) return; c.spk = false; toast(T.noSpeaker); return; }
      return audio.setSinkId(pick.deviceId);
    }).catch(function () { c.spk = false; toast(T.noSpeaker); });
  }
  function tick(c) {
    if (!c.t0) return;
    var sec = Math.floor((Date.now() - c.t0) / 1000), m = Math.floor(sec / 60), r = sec % 60;
    setStatus((c.hold ? T.onHold + ' - ' : '') + (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r);
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
    ui._grid.appendChild(btn('⏸', T.hold, c.hold ? 'on' : '', function () {
      if (!c.t0) return;
      c.hold = !c.hold; applyMic(c); tick(c); renderGrid();
    }));
    ui._grid.appendChild(btn('📝', T.notes, '', function () { ui._notes.style.display = 'flex'; }));
  }
  function showUi(mode, name, status) {   // mode: out | in | live
    if (!ui) buildUi();
    ui.style.display = 'flex';
    ui._av.textContent = (name || '?').charAt(0).toUpperCase();
    ui._nm.textContent = name || '';
    ui._st.textContent = status || '';
    ui._row.innerHTML = '';
    ui._notes.style.display = 'none';
    if (mode === 'in') {
      ui._grid.style.display = 'none';
      ui._row.appendChild(btn('📵', T.decline, 'red', declineCall));
      ui._row.appendChild(btn('📞', T.accept, 'green', acceptCall));
    } else {
      renderGrid();
      ui._row.appendChild(btn('📵', T.end, 'red', function () { endCall('end', T.ended); }));
    }
  }
  function setStatus(t) { if (ui) ui._st.textContent = t; }
  function hideUi() {
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
    if (ui) { ui.style.display = 'none'; ui._notes.style.display = 'none'; }
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

  function newCall(room, role, peerUid, name, stream) {
    var c = { room: room, role: role, peerUid: peerUid, name: name, stream: stream, pc: null,
      refs: [], queue: [], out: [], ready: false, haveRemote: false, gotAnswer: false, ended: false, t0: 0,
      mute: false, hold: false, spk: false };
    var pc = new RTCPeerConnection({ iceServers: CONFIG.ICE });
    c.pc = pc;
    stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
    pc.ontrack = function (e) {
      audio.srcObject = e.streams[0];
      var p = audio.play(); if (p && p.catch) p.catch(noop);
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
        showUi('live', c.name, '00:00');
        uiTimer = setInterval(function () { tick(c); }, 1000);
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
    ring(false);
    if (c.ringTimer) clearTimeout(c.ringTimer);
    c.refs.forEach(function (f) { try { f(); } catch (e) {} });
    try { c.pc.close(); } catch (e) {}
    try { c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    audio.srcObject = null; audio.muted = false;
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
  function startCall() {
    var C = core(), me = C.getMe(), peer = C.getPeer(), room = C.getRoom();
    if (!me || !peer || !room || call || incoming) return;
    if (!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert(T.noSupport); return; }
    var name = peer.nick || peer.name || 'Player';
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var c = newCall(room, 'caller', peer.uid, name, stream);
      showUi('out', name, T.calling);
      c.pc.createOffer().then(function (o) { return c.pc.setLocalDescription(o); }).then(function () {
        var d = c.pc.localDescription;
        return db.ref('calls/' + room).set({ from: me.uid, to: peer.uid, st: 'ring', t: TS, offer: { type: d.type, sdp: d.sdp } });
      }).then(function () {
        openReady(c); listenIce(c);
        return db.ref('callInbox/' + peer.uid).set({ room: room, from: me.uid, n: (me.cname || me.name || 'Player').slice(0, 30), t: TS });
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
    incoming = { room: v.room, from: v.from, name: name };
    showUi('in', name, T.incoming);
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
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var c = newCall(inc.room, 'callee', inc.from, inc.name, stream);
      showUi('out', inc.name, T.connecting);
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
    b.addEventListener('click', startCall);
    head.appendChild(b);
  }
  addBtn();
  var wait = setInterval(function () {
    var C = core();
    if (C && C.getMe()) { clearInterval(wait); listenInbox(); }
  }, 700);
})();
