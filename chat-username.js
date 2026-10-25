// =====================================================================
// chat-username.js  -  Change chat username (Settings > Change username)
//  * asks for new username (live "available / taken" check) + your password
//  * old username becomes free, new one is saved in one single step
// Called by chat-status.js:  window.ChatUsername.open(function(){ ...after change... })
// =====================================================================
(function () {
  'use strict';
  if (!document.getElementById('searchForm') || !window.firebase) return;
  var db = firebase.database();
  var RX = /^[a-z0-9_]{3,16}$/;

  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  var st = h('style');
  st.textContent = [
    '.cu-bg{position:fixed;inset:0;z-index:165;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px}',
    '.cu-box{width:100%;max-width:360px;background:#0f1b47;border:1px solid #22d3ee;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px;color:#fff;font-family:Arial,sans-serif}',
    '.cu-box h3{font-size:18px;text-align:center;margin:0}',
    '.cu-box input{background:#060c24;border:1px solid #1f3a8a;border-radius:10px;color:#fff;font-size:16px;padding:12px;outline:none}',
    '.cu-cur{font-size:13px;color:#9fb0d9;text-align:center}',
    '.cu-msg{font-size:13px;min-height:16px;color:#f87171}.cu-msg.ok{color:#4ade80}',
    '.cu-b2{display:flex;gap:8px}.cu-b2 button{flex:1;padding:12px;border-radius:10px;border:none;font-size:15px;font-weight:700;cursor:pointer;background:#16245e;color:#fff}',
    '.cu-b2 button.p{background:#2563eb}.cu-b2 button:disabled{opacity:.5}'
  ].join('\n');
  document.head.appendChild(st);

  function open(onDone) {
    var C = window.ChatCore, me = C && C.getMe();
    if (!me) return;
    var old = me.cname || '';
    var bg = h('div', 'cu-bg'), box = h('div', 'cu-box');
    box.appendChild(h('h3', '', 'Change username'));
    box.appendChild(h('div', 'cu-cur', 'Current: ' + old));
    var nn = h('input'); nn.placeholder = 'New username (3-16: a-z, 0-9, _)'; nn.maxLength = 16;
    nn.autocomplete = 'off'; nn.autocapitalize = 'none';
    var pw = h('input'); pw.type = 'password'; pw.placeholder = 'Your chat password'; pw.autocomplete = 'off';
    var msg = h('div', 'cu-msg');
    var b2 = h('div', 'cu-b2'), cn = h('button', '', 'Cancel'), sv = h('button', 'p', 'Save');
    cn.type = sv.type = 'button'; b2.appendChild(cn); b2.appendChild(sv);
    box.appendChild(nn); box.appendChild(pw); box.appendChild(msg); box.appendChild(b2);
    bg.appendChild(box); document.body.appendChild(bg);
    function close() { bg.remove(); }
    cn.onclick = close;
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });

    var free = false, tm = null;
    function say(t, ok) { msg.textContent = t || ''; msg.className = 'cu-msg' + (ok ? ' ok' : ''); }
    nn.addEventListener('input', function () {
      nn.value = nn.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      free = false; clearTimeout(tm);
      var v = nn.value;
      if (!v) { say(''); return; }
      if (!RX.test(v)) { say('Use 3 to 16 letters, numbers or _'); return; }
      if (v === old) { say('This is your current username'); return; }
      say('Checking...');
      tm = setTimeout(function () {
        db.ref('chatNames/' + v).once('value').then(function (s) {
          if (nn.value !== v) return;
          free = !s.exists();
          say(free ? 'Available \u2713' : 'This username already exists', free);
        }).catch(function () { say('Could not check. Please try again.'); });
      }, 400);
    });

    sv.onclick = function () {
      var v = nn.value;
      if (!RX.test(v) || v === old) { say('Please type a valid new username'); return; }
      if (!free) { say('Choose an available username first'); return; }
      if (!pw.value) { say('Type your password'); return; }
      sv.disabled = true; say('Please wait...');
      db.ref('chatAuth/' + me.uid).once('value').then(function (s) {
        var a = s.val();
        if (!a) throw new Error('none');
        return sha(a.s + ':' + pw.value).then(function (hh) {
          if (hh !== a.h) { say('Password is incorrect'); sv.disabled = false; return; }
          var up = {};
          up['chatNames/' + v] = { uid: me.uid, pid: me.pid };
          if (old) up['chatNames/' + old] = null;
          up['chatAuth/' + me.uid + '/u'] = v;
          return db.ref().update(up).then(function () {
            me.cname = v;
            db.ref('playerIds/' + me.pid).update({ u: v }).catch(function () {});
            say('Username changed \u2713', true);
            setTimeout(function () { close(); if (onDone) onDone(); }, 900);
          }, function () { free = false; say('Could not save. This username may have just been taken.'); sv.disabled = false; });
        });
      }).catch(function () { say('Something went wrong. Please try again.'); sv.disabled = false; });
    };
    setTimeout(function () { nn.focus(); }, 100);
  }

  window.ChatUsername = { open: open };
})();
