// ===== CHAT PAGE (sirf chat.html par chalta hai) =====
if (document.getElementById('searchForm') && window.firebase) {
(function () {
// chat.js - Settings > Chat : UID search, chat list (auto), text / emoji / photo, timers, menu

var db = firebase.database();
var MAX_TEXT = 50;
var PHOTO_MS = 60000;      // photo: dekhne ke 60 sec baad delete
var TS = firebase.database.ServerValue.TIMESTAMP;

// Emoji picker (category wise). Space se alag kiye hain.
var EMOJI_SETS = [
  { icon: '😀', list: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊' },
  { icon: '👍', list: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 👀 👁️ 👅 👄 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙋 🙇 🤦 🤷 💃 🕺 🏃 🚶' },
  { icon: '❤️', list: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 💬 💭 💤 ✨ 🌟 ⭐ 🔥 🎉 🎊 🎈 🎁 🏆 🥇 🥈 🥉 ✅ ❌ ❓ ❗ ⚠️ 🚫 🔔 🔕 💲 💰 💵 💎 🇮🇳 🏁 🚩' },
  { icon: '🎮', list: '🎮 🕹️ 👾 🎯 🎲 🧩 ♟️ 🎰 🎳 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏏 🏑 🏓 🏸 🥊 🥋 🎧 🎤 🎵 🎶 🎸 🎹 🥁 📱 💻 🖥️ ⌨️ 🖱️ 📷 📸 🎥 📺 🔋 🔌 💡 🔦 📚 📖 ✏️ 📝 📌 📎 🔑 🔒 🔓 🛒 🛍️ 🎬 🕶️ 👑 💍 👟 👕' },
  { icon: '🐶', list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐘 🦒 🐪 🌵 🌴 🌳 🌲 🌸 🌹 🌻 🌼 🍀 🍁 🍂 🌈 ☀️ 🌙 ☁️ ❄️ 🌊' },
  { icon: '🍔', list: '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🌽 🥕 🍞 🧀 🍗 🍖 🍔 🍟 🍕 🌭 🌮 🌯 🍿 🍩 🍪 🎂 🍰 🍫 🍬 🍭 🍦 ☕ 🍵 🥤 🍺 🍷 🧃 🍚 🍜 🍝' },
  { icon: '🚗', list: '🚗 🚕 🚌 🏎️ 🚓 🚑 🚒 🏍️ 🛵 🚲 🚂 ✈️ 🚀 🛸 🚁 ⛵ 🚢 🏠 🏢 🏫 🏥 ⛰️ 🏝️ 🌍 🗺️' }
];

var me = null;          // { uid, pid, name, photo }
var peer = null;        // { uid, pid, name, photo, nick }
var roomId = null;
var msgRef = null;
var hiddenRef = null;
var inboxRef = null;
var inbox = {};         // meri chat list (live)
window.activeChatRoom = null;

function $(id) { return document.getElementById(id); }
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt) e.textContent = txt;
  return e;
}
function roomOf(a, b) { return [a, b].sort().join('_'); }

// Sirf data: ya https image hi dikhao (safety)
function safeSrc(s) {
  return (typeof s === 'string' && (s.indexOf('data:image/') === 0 || s.indexOf('https://') === 0)) ? s : '';
}
function cleanP(s) { return (typeof s === 'string' && s.length <= 30000) ? s : ''; }

function setAvatar(elm, photo) {
  elm.innerHTML = '';
  var src = safeSrc(photo);
  if (src) {
    var img = document.createElement('img');
    img.src = src;
    elm.appendChild(img);
  } else {
    elm.textContent = '🧑';
  }
}

function showMsg(text, isErr) {
  var e = $('searchMsg');
  e.textContent = text || '';
  e.className = 'hint' + (isErr ? ' err' : '');
}

/* ---------- Emoji gino (emoji = 1 character) ---------- */
var seg = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
function chars(s) {
  if (seg) return Array.from(seg.segment(s), function (x) { return x.segment; });
  return Array.from(s);
}
function charCount(s) { return chars(s).length; }

/* ---------- Server time ---------- */
var offset = 0;
db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
function nowS() { return Date.now() + offset; }

// Text ki lambai ke hisab se delete timer (second)
function calculateReadTimer(textLength) {
  if (textLength <= 5)  return 10;
  if (textLength <= 20) return 30;
  if (textLength <= 30) return 50;
  return 90;                       // 50 tak
}

function fmtTime(t) {
  var d = new Date(t || nowS());
  var h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}
function fullDate(ms) {
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
function listTime(ms) {
  var d = new Date(ms), n = new Date();
  if (d.toDateString() === n.toDateString()) return fmtTime(ms);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ---------- Login + apni profile ---------- */
firebase.auth().onAuthStateChanged(function (user) {
  if (!user) { window.location.href = 'login.html'; return; }

  db.ref('users/' + user.uid).once('value').then(function (snap) {
    var d = snap.val() || {};
    if (!d.playerId) {
      showMsg('Pehle Home page kholo, tumhara ID ban jayega', true);
      return;
    }
    me = { uid: user.uid, pid: String(d.playerId), name: d.name || 'Player', photo: d.photo || '' };

    // Apna public card (dusre UID se dhundh sakein)
    db.ref('playerIds/' + me.pid).set({ uid: me.uid, n: me.name, p: me.photo });

    gate(function () {      // pehle Username + Password wala lock
      startInbox();

      // Notification par click karke aaye ho to seedha chat kholo: chat.html?pid=...
      var qp = new URLSearchParams(location.search).get('pid');
      if (qp && /^[0-9]{10,12}$/.test(qp)) {
        findUser(qp, function (p) { openChat(p); }, function (m) { showMsg(m, true); });
      }
    });
  }).catch(function () {
    showMsg('Data nahi aaya. Database Rules check karo.', true);
  });
});

/* ---------- Search ---------- */
function findUser(pid, ok, fail) {
  if (pid === me.pid) { fail('Ye tumhara apna UID hai'); return; }
  db.ref('playerIds/' + pid).once('value').then(function (snap) {
    var d = snap.val();
    if (!d) { fail('Ye UID nahi mila'); return; }
    if (d.uid === me.uid) { fail('Ye tumhara apna UID hai'); return; }
    ok({ uid: d.uid, pid: pid, name: d.n || 'Player', photo: d.p || '' });
  }).catch(function () { fail('Search nahi hua, dobara try karo'); });
}

/* ---------- Chat Lock: Username + Password (theek 8 akshar) ---------- */
var lockCb = null, lockMode = 'create', lockAuth = null, nameOk = false, nameTimer = null;

function rhex(n) { var a = new Uint8Array(n), s = ''; crypto.getRandomValues(a); for (var i = 0; i < n; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; }
function sha(str) {
  if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.reject(new Error('secure'));
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
    return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  });
}
function lkMsg(t, err) { var e = $('lkMsg'); e.textContent = t || ''; e.className = 'hint' + (err ? ' err' : ''); }
function genPass() {
  var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*', a = new Uint8Array(8), s = '';
  crypto.getRandomValues(a);
  for (var i = 0; i < 8; i++) s += ch.charAt(a[i] % ch.length);
  return s;
}
function nameBad(t) {
  var e = $('nameErr');
  if (t) { e.innerHTML = ''; e.appendChild(el('b', '', 'Invalid Username')); e.appendChild(document.createTextNode(t)); e.style.display = 'block'; }
  else e.style.display = 'none';
}
function showSug() {      // sujhaye hue naam: base_247, basekin, base_official
  var base = ($('lkName').value || me.name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 9) || 'player';
  var list = [base + '_' + (10 + Math.floor(Math.random() * 990)), base + 'king', base + '_official'], box = $('sugList');
  box.innerHTML = '';
  list.forEach(function (n) {
    var b = el('button', 'sug', n + '  ⧉'); b.type = 'button';
    b.addEventListener('click', function () { $('lkName').value = n; checkName(); });
    box.appendChild(b);
  });
}
function checkName() {
  var v = $('lkName').value.trim().toLowerCase();
  nameOk = false; clearTimeout(nameTimer);
  if (!v) { nameBad(''); return; }
  if (!/^[a-z0-9_]{3,16}$/.test(v)) { nameBad('Username 3 se 16 akshar ka ho, sirf a-z, 0-9 aur _'); return; }
  nameTimer = setTimeout(function () {
    db.ref('chatNames/' + v).once('value').then(function (s) {
      if ($('lkName').value.trim().toLowerCase() !== v) return;
      if (s.exists()) { nameBad('This username already exists.'); showSug(); }
      else { nameBad(''); nameOk = true; }
    }).catch(function () { nameBad('Check nahi hua, dobara try karo'); });
  }, 350);
}
function lockUI(mode) {
  lockMode = mode;
  var create = mode === 'create';
  $('nameBlock').style.display = create ? '' : 'none';
  $('lkWho').style.display = create ? 'none' : 'block';
  if (!create && lockAuth) $('lkWho').textContent = '👤 ' + lockAuth.u;
  $('pwLabel').textContent = mode === 'reset' ? '🔒 Naya Password' : '🔒 Password';
  $('lkGo').textContent = create ? 'Chat shuru karo' : (mode === 'reset' ? 'Naya password save karo' : 'Unlock');
  $('forgotBox').style.display = mode === 'unlock' ? 'flex' : 'none';
  $('lkGen').style.display = mode === 'unlock' ? 'none' : '';
  $('lkPass').value = ''; $('pwCount').textContent = '0/8'; lkMsg('');
}
function unlocked() {
  try { sessionStorage.setItem('mk_ok', me.uid); } catch (e) {}
  me.cname = lockAuth.u;
  $('lockView').style.display = 'none';
  if (lockCb) { var f = lockCb; lockCb = null; f(); }
}
function gate(cb) {
  lockCb = cb;
  db.ref('chatAuth/' + me.uid).once('value').then(function (s) {
    lockAuth = s.val();
    var ok = false; try { ok = sessionStorage.getItem('mk_ok') === me.uid; } catch (e) {}
    if (lockAuth && ok) { me.cname = lockAuth.u; lockCb = null; cb(); return; }
    $('lockView').style.display = 'block';
    lockUI(lockAuth ? 'unlock' : 'create');
    if (!lockAuth) { $('lkName').value = ''; showSug(); }
  }).catch(function () { showMsg('Chat lock check nahi hua. Database Rules check karo.', true); });
}
$('lkName').addEventListener('input', function () { this.value = this.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); checkName(); });
$('lkPass').addEventListener('input', function () { $('pwCount').textContent = charCount(this.value) + '/8'; });
$('lkEye').addEventListener('click', function () { var p = $('lkPass'); p.type = p.type === 'password' ? 'text' : 'password'; });
$('lkGen').addEventListener('click', function () {
  var pw = genPass(), p = $('lkPass'); p.value = pw; p.type = 'text'; $('pwCount').textContent = '8/8';
  try { navigator.clipboard.writeText(pw); } catch (e) {}
  lkMsg('Ye password copy ho gaya. Kahin surakshit likh lo, dobara nahi dikhega.');
});
$('lkReset').addEventListener('click', function () {
  lockUI('reset');
  lkMsg('Aap apne account se login ho, isliye naya 8 akshar ka password bana sakte ho.');
});
$('lkGo').addEventListener('click', function () {
  var pw = $('lkPass').value;
  if (charCount(pw) !== 8) { lkMsg('Password theek 8 akshar ka hona chahiye (abhi ' + charCount(pw) + ')', true); return; }
  var fail = function (e) { lkMsg(e && e.message === 'secure' ? 'Secure (https) connection chahiye' : 'Nahi hua, dobara try karo', true); };
  lkMsg('Ruko...');
  if (lockMode === 'unlock') {
    sha(lockAuth.s + ':' + pw).then(function (h) {
      if (h !== lockAuth.h) { lkMsg('Password galat hai', true); return; }
      unlocked();
    }).catch(fail);
  } else if (lockMode === 'reset') {
    if (!confirm('Naya password set karna hai? Purana password band ho jayega.')) { lkMsg(''); return; }
    var s1 = rhex(12);
    sha(s1 + ':' + pw).then(function (h) {
      return db.ref('chatAuth/' + me.uid).set({ h: h, s: s1, u: lockAuth.u }).then(function () { lockAuth = { h: h, s: s1, u: lockAuth.u }; unlocked(); });
    }).catch(fail);
  } else {
    var u = $('lkName').value.trim().toLowerCase();
    if (!nameOk) { lkMsg('Pehle sahi Username chuno', true); return; }
    var s2 = rhex(12);
    sha(s2 + ':' + pw).then(function (h) {
      var up = {};
      up['chatNames/' + u] = { uid: me.uid, pid: me.pid };
      up['chatAuth/' + me.uid] = { h: h, s: s2, u: u };
      return db.ref().update(up).then(function () { lockAuth = { h: h, s: s2, u: u }; unlocked(); }, function () {
        nameOk = false; nameBad('This username already exists.'); showSug(); lkMsg('Save nahi hua', true);
      });
    }).catch(fail);
  }
});
  /* ---------- Search (Player ID ya Username) ---------- */
$('uidInput').addEventListener('input', function () {
  this.value = this.value.replace(/[^a-zA-Z0-9_]/g, '');
});

function showFound(p) {
  showMsg('');
  var r = inbox[roomOf(me.uid, p.uid)];
  if (r && r.nick) p.nick = r.nick;
  $('resultBox').appendChild(userCard(p));
}

$('searchForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!me) { showMsg('Thoda ruko, loading...', true); return; }
  var raw = $('uidInput').value.trim();
  $('resultBox').innerHTML = '';
  if (/^[0-9]{10,12}$/.test(raw)) {                                           // Player ID se
    showMsg('Dhundh rahe hain...');
    findUser(raw, showFound, function (m) { showMsg(m, true); });
  } else if (/^[a-zA-Z0-9_]{3,16}$/.test(raw) && !/^[0-9]+$/.test(raw)) {    // Username se
    showMsg('Dhundh rahe hain...');
    db.ref('chatNames/' + raw.toLowerCase()).once('value').then(function (s) {
      var d = s.val();
      if (!d) { showMsg('Ye username nahi mila', true); return; }
      findUser(String(d.pid), showFound, function (m) { showMsg(m, true); });
    }).catch(function () { showMsg('Search nahi hua, dobara try karo', true); });
  } else {
    showMsg('UID (10 se 12 ank) ya Username (3 se 16 akshar) likho', true);
  }
});

function userCard(p, opts) {
  opts = opts || {};
  var card = el('div', 'user-card');
  var av = el('div', 'avatar');
  setAvatar(av, p.photo);
  var info = el('div', 'u-info');
  var top = el('div', 'u-top');
  top.appendChild(el('span', 'u-name', p.nick || p.name));
  if (opts.unread) top.appendChild(el('span', 'new-badge', 'NEW'));
  info.appendChild(top);
  info.appendChild(el('div', 'u-id', 'ID: ' + p.pid + (opts.time ? '  •  ' + opts.time : '')));
  card.appendChild(av);
  card.appendChild(info);
  if (opts.onMenu) {
    var dots = el('button', 'dots-btn', '⋮');
    dots.addEventListener('click', function (e) { e.stopPropagation(); opts.onMenu(); });
    card.appendChild(dots);
  }
  card.addEventListener('click', function () { openChat(p); });
  return card;
}

/* ---------- Meri chat list (live, apne aap bharti hai) ---------- */
function startInbox() {
  inboxRef = db.ref('userChats/' + me.uid);
  inboxRef.on('value', function (s) {
    inbox = s.val() || {};
    if (peer && roomId && inbox[roomId]) {
      peer.nick = inbox[roomId].nick || '';
      updateHeader();
    }
    renderList();
  });
}

function renderList() {
  var box = $('recentBox');
  box.innerHTML = '';
  var rooms = Object.keys(inbox).filter(function (r) { return inbox[r] && inbox[r].pid; });
  rooms.sort(function (a, b) {
    return Math.max(inbox[b].t || 0, inbox[b].r || 0) - Math.max(inbox[a].t || 0, inbox[a].r || 0);
  });
  $('recentTitle').style.display = rooms.length ? 'block' : 'none';

  rooms.forEach(function (room) {
    var e = inbox[room];
    var p = { uid: e.uid, pid: e.pid, name: e.n || 'Player', photo: e.p || '', nick: e.nick || '' };
    var unread = !!(e.t && (!e.r || e.t > e.r));
    var last = Math.max(e.t || 0, e.r || 0);
    box.appendChild(userCard(p, {
      unread: unread,
      time: last ? listTime(last) : '',
      onMenu: function () {
        openSheet(p.nick || p.name, [
          { label: '✏️ Naam badlo', fn: function () { editNick(room, p.nick); } },
          { label: '🗑 Delete chat (list se hatao)', danger: true, fn: function () {
            if (confirm('Is chat ko list se hatayein?')) {
              db.ref('userChats/' + me.uid + '/' + room).remove().catch(function () { alert('Delete nahi hua'); });
            }
          }}
        ]);
      }
    }));
  });
}

function editNick(room, current) {
  var v = prompt('Is contact ka naam likho (khali chhodo = asli naam)', current || '');
  if (v === null) return;
  v = v.trim();
  if (v.length > 20) { alert('Naam 20 akshar tak rakho'); return; }
  var ref = db.ref('userChats/' + me.uid + '/' + room + '/nick');
  (v ? ref.set(v) : ref.remove()).catch(function () { alert('Naam save nahi hua'); });
}
/* ---------- Chat window ---------- */
var msgs = {};          // key -> { d, box, ... }
var hidden = {};        // "Delete for me" wale message
var tick = null;
var started = false;
var editingKey = null;
var viewingKey = null;

function updateHeader() {
  $('peerName').textContent = peer.nick || peer.name;
}

function openChat(p) {
  if (!me || p.uid === me.uid) {
    showMsg('Apne aap se chat nahi ho sakti', true);
    return;
  }
  peer = p;
  roomId = roomOf(me.uid, peer.uid);
  window.activeChatRoom = roomId;
  if (inbox[roomId] && inbox[roomId].nick) peer.nick = inbox[roomId].nick;
// Meri list mein ye chat jod do + "padh liya" mark karo
  db.ref('userChats/' + me.uid + '/' + roomId).update({
    uid: peer.uid, pid: peer.pid, n: peer.name, p: cleanP(peer.photo), r: TS
  }).catch(function () {});

  msgs = {}; hidden = {}; started = false; editingKey = null;
  $('messages').innerHTML = '';
  updateHeader();
  $('peerId').textContent = 'ID: ' + p.pid;
  setAvatar($('peerAvatar'), p.photo);
  $('searchView').style.display = 'none';
  $('chatView').style.display = 'flex';

  msgRef = db.ref('chats/' + roomId + '/messages');
  hiddenRef = db.ref('chatHidden/' + me.uid + '/' + roomId);

  // Pehle "delete for me" list aaye, phir messages
  hiddenRef.on('value', function (s) {
    hidden = s.val() || {};
    Object.keys(msgs).forEach(updateVis);
    if (!started) { started = true; startMessages(); }
  });

  tick = setInterval(tickAll, 1000);
}

function markRead() {
  if (!roomId || !peer || document.hidden) return;
  db.ref('userChats/' + me.uid + '/' + roomId + '/r').set(TS).catch(function () {});
}

// Message bhejne ke baad samne wale ki list mein chat dikhao (NEW)
function touchPeer() {
  db.ref('userChats/' + peer.uid + '/' + roomId).update({
    uid: me.uid, pid: me.pid, n: me.name, p: cleanP(me.photo), t: TS
  }).catch(function () {});
  markRead();
}

function startMessages() {
  var q = msgRef.limitToLast(100);
  q.on('child_added', function (s) {
    var d = s.val();
    if (!d || msgs[s.key]) return;
    buildMessage(s.key, d);
    if (msgs[s.key] && !msgs[s.key].mine) markRead();
    markSeen();
  });
  q.on('child_changed', function (s) {
    var m = msgs[s.key];
    if (!m) return;
    m.d = s.val();
    refresh(s.key);
  });
  q.on('child_removed', function (s) {
    var m = msgs[s.key];
    if (!m) return;
    if (m.box.parentNode) m.box.parentNode.removeChild(m.box);
    delete msgs[s.key];
    if (viewingKey === s.key) closeViewer();
    if (window.ChatAdv) window.ChatAdv.onRemoved(s.key, m.d);
    if (hidden[s.key]) hiddenRef.child(s.key).remove().catch(function () {});  // safai
  });
}

function leaveChat() {
  if (msgRef) { msgRef.off(); msgRef = null; }
  if (hiddenRef) { hiddenRef.off(); hiddenRef = null; }
  if (tick) { clearInterval(tick); tick = null; }
  closeViewer(); closeSheet(); cancelEdit();
  peer = null; roomId = null; msgs = {};
  window.activeChatRoom = null;
  $('emojiPanel').style.display = 'none';
  $('chatView').style.display = 'none';
  $('searchView').style.display = 'block';
  renderList();
}
$('chatBack').addEventListener('click', leaveChat);
$('nickBtn').addEventListener('click', function () {
  if (peer) editNick(roomId, peer.nick);
});

/* ---------- Message banana ---------- */
function buildMessage(key, d) {
  var mine = d.from === me.uid;
  var box = el('div', 'msg ' + (mine ? 'mine' : 'theirs'));
  var m = { d: d, box: box, mine: mine };

  if (d.type === 'photo') {
    var src = safeSrc(d.img);
    if (!src) return;
    m.wrap = el('div', 'pwrap');
    var img = el('img');
    img.src = src;
    img.draggable = false;
    m.wrap.appendChild(img);
    m.wrap.appendChild(el('div', 'tapview', '👁 Tap to view'));
    m.wrap.addEventListener('click', function (e) { e.stopPropagation(); openViewer(key); });
    box.appendChild(m.wrap);
  } else if (d.type === 'video' || d.type === 'file') {
    if (!window.ChatAdv) return;
    window.ChatAdv.buildMedia(key, d, m, box);
  } else {
    m.content = el('span', 'txt');       // textContent = safe
    box.appendChild(m.content);
    box.addEventListener('click', function () { openMenu(key); });
  }

  var foot = el('div', 'foot');
  m.edited = el('span', 'edited');
  m.timer  = el('span', 'timer');
  foot.appendChild(m.edited);
  foot.appendChild(m.timer);
  foot.appendChild(el('span', 'time', fmtTime(d.t)));
  m.tick = el('span', 'tick');
  foot.appendChild(m.tick);
  var dots = el('button', 'dots', '⋮');
  dots.addEventListener('click', function (e) { e.stopPropagation(); openMenu(key); });
  foot.appendChild(dots);
  box.appendChild(foot);

  msgs[key] = m;
  $('messages').appendChild(box);
  refresh(key);
  $('messages').scrollTop = $('messages').scrollHeight;
}

function refresh(key) {
  var m = msgs[key], d = m.d;
  if (d.type === 'text') m.content.textContent = d.text || '';
  m.edited.textContent = d.edited ? 'edited' : '';
  m.tick.textContent = m.mine ? (d.seenAt ? '✓✓' : '✓') : '';
  if (m.wrap) m.wrap.classList.toggle('blur', !m.mine && !d.seenAt);
  updateVis(key);
}

function updateVis(key) {
  var m = msgs[key];
  if (m) m.box.style.display = (hidden[key] || m.expired) ? 'none' : '';
}

/* ---------- "Dekh liya" -> timer shuru ---------- */
function setSeen(key) {
  var m = msgs[key];
  if (!m || m.mine || m.d.seenAt || m.marking) return;
  m.marking = true;
  msgRef.child(key + '/seenAt').set(TS).catch(function () { m.marking = false; });
}

// Text: chat khula ho aur screen par ho tabhi "dekha" maana jaye
function markSeen() {
  if (!peer || document.hidden || $('chatView').style.display === 'none') return;
  Object.keys(msgs).forEach(function (k) {
    if (msgs[k].d.type === 'text') setSeen(k);
  });
}
document.addEventListener('visibilitychange', function () { markSeen(); markRead(); });

// Har second: timer dikhao, khatam hone par delete
function tickAll() {
  var now = nowS();
  Object.keys(msgs).forEach(function (k) {
    var m = msgs[k], d = m.d;
    var base = (d.mode === 'sent') ? d.t : d.seenAt;
    if (!base || !d.dur) return;
    var remain = base + d.dur - now;
    var label = '⏳ ' + Math.max(0, Math.ceil(remain / 1000)) + 's';
    m.timer.textContent = label;
    if (viewingKey === k) $('viewerTimer').textContent = label;

    if (remain <= 0) {
      m.expired = true;
      updateVis(k);
      if (viewingKey === k) closeViewer();
      if (remain <= -700 && (!m.rmAt || Date.now() - m.rmAt > 5000)) {
        m.rmAt = Date.now();
        msgRef.child(k).remove().catch(function () {});
      }
    }
  });
}

/* ---------- Photo full screen ---------- */
function openViewer(key) {
  var m = msgs[key];
  if (!m) return;
  var src = safeSrc(m.d.img);
  if (!src) return;
  viewingKey = key;
  $('viewerImg').src = src;
  $('viewerTimer').textContent = '';
  $('viewer').style.display = 'flex';
  setSeen(key);                      // samne wale ne dekha -> 60 sec timer
}
function closeViewer() {
  viewingKey = null;
  $('viewer').style.display = 'none';
  $('viewerImg').removeAttribute('src');
}
$('viewerClose').addEventListener('click', closeViewer);
$('viewer').addEventListener('contextmenu', function (e) { e.preventDefault(); });
/* ---------- Menu sheet ---------- */
function closeSheet() { $('sheetBg').style.display = 'none'; }
$('sheetBg').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });

function openSheet(title, rows) {
  var sh = $('sheet');
  sh.innerHTML = '';
  sh.appendChild(el('div', 'sheet-title', title));
  rows.forEach(function (r) {
    if (r.text) { sh.appendChild(el('div', 'sheet-line', r.text)); return; }
    var b = el('button', 'sheet-btn' + (r.danger ? ' danger' : ''), r.label);
    b.addEventListener('click', function () { closeSheet(); r.fn(); });
    sh.appendChild(b);
  });
  var c = el('button', 'sheet-btn cancel', 'Cancel');
  c.addEventListener('click', closeSheet);
  sh.appendChild(c);
  $('sheetBg').style.display = 'flex';
}

function openMenu(key) {
  var m = msgs[key];
  if (!m) return;
  var d = m.d, rows = [];

  rows.push({ label: 'ℹ️ Details', fn: function () { showDetails(key); } });
  if (m.mine && d.type === 'text' && !d.seenAt) {
    rows.push({ label: '✏️ Edit message', fn: function () { startEdit(key); } });
  }
  rows.push({ label: '🗑 Delete for me', fn: function () {
    hiddenRef.child(key).set(true).catch(function () { alert('Delete nahi hua'); });
  }});
  if (m.mine) {
    rows.push({ label: '🗑 Delete for everyone', danger: true, fn: function () {
      if (confirm('Dono taraf se delete karein?')) {
        msgRef.child(key).remove().catch(function () { alert('Delete nahi hua'); });
      }
    }});
  }
  openSheet('Message', rows);
}

function showDetails(key) {
  var m = msgs[key], d = m.d;
  var rows = [
    { text: 'Type: ' + (d.type === 'photo' ? 'Photo' : 'Text') },
    { text: 'Bheja gaya: ' + fullDate(d.t) },
    { text: 'Dekha gaya: ' + (d.seenAt ? fullDate(d.seenAt) : 'Abhi nahi dekha') },
    { text: 'Delete timer: ' + ((d.dur || 0) / 1000) + ' second (dekhne ke baad)' },
    { text: 'Delete hoga: ' + (d.seenAt && d.dur ? fullDate(d.seenAt + d.dur) : 'Dekhne ke baad') }
  ];
  if (d.type === 'text') rows.splice(1, 0, { text: 'Lambai: ' + charCount(d.text || '') + ' / ' + MAX_TEXT + ' character' });
  if (d.edited) rows.push({ text: 'Ye message edit hua hai' });
  openSheet('Message Details', rows);
}

/* ---------- Edit ---------- */
function startEdit(key) {
  editingKey = key;
  input.value = msgs[key].d.text || '';
  $('editBar').style.display = 'flex';
  updateCounter();
  input.focus();
}
function cancelEdit() {
  editingKey = null;
  $('editBar').style.display = 'none';
  input.value = '';
  updateCounter();
}
$('editCancel').addEventListener('click', cancelEdit);

/* ---------- Text / Emoji bhejna ---------- */
var input = $('msgInput');

input.addEventListener('input', function () {
  var c = chars(input.value);
  if (c.length > MAX_TEXT) input.value = c.slice(0, MAX_TEXT).join('');
  updateCounter();
});

function updateCounter() {
  var n = charCount(input.value);
  $('counter').textContent = n + '/' + MAX_TEXT;
  $('counter').className = 'counter' + (n >= MAX_TEXT ? ' full' : '');
}

function sendText() {
  var text = input.value.trim();
  var n = charCount(text);
  if (!text || !msgRef || n > MAX_TEXT) return;
  var dur = calculateReadTimer(n) * 1000;
  var advMode = null;
  var advSel = window.ChatAdv ? window.ChatAdv.timerFor() : null;
  if (advSel) { dur = advSel.dur; advMode = advSel.mode; }

  if (editingKey) {
    var key = editingKey;
    cancelEdit();
    msgRef.child(key).update({ text: text, dur: dur, edited: true, mode: advMode })
      .catch(function () { alert('Edit nahi hua. Shayad samne wale ne dekh liya.'); });
    return;
  }

  input.value = '';
  updateCounter();
  var out = { from: me.uid, type: 'text', text: text, dur: dur, t: TS };
  if (advMode) out.mode = advMode;
  msgRef.push(out)
    .then(touchPeer)
    .catch(function () { alert('Message nahi gaya, dobara try karo'); });
}

$('sendBtn').addEventListener('click', sendText);
input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); sendText(); }
});
  /* ---------- Emoji picker ---------- */
(function buildEmojiPanel() {
  var panel = $('emojiPanel');
  panel.innerHTML = '';
  var tabs = el('div', 'emoji-tabs');
  var grid = el('div', 'emoji-grid');

  function show(i) {
    grid.innerHTML = '';
    EMOJI_SETS[i].list.split(' ').forEach(function (em) {
      if (!em) return;
      var s = el('span', '', em);
      s.addEventListener('click', function () {
        if (charCount(input.value + em) <= MAX_TEXT) { input.value += em; updateCounter(); }
      });
      grid.appendChild(s);
    });
    Array.prototype.forEach.call(tabs.children, function (b, j) { b.classList.toggle('on', j === i); });
  }

  EMOJI_SETS.forEach(function (set, i) {
    var b = el('button', '', set.icon);
    b.addEventListener('click', function () { show(i); });
    tabs.appendChild(b);
  });
  panel.appendChild(tabs);
  panel.appendChild(grid);
  show(0);
})();

$('emojiBtn').addEventListener('click', function () {
  var p = $('emojiPanel');
  p.style.display = p.style.display === 'none' ? 'flex' : 'none';
});

/* ---------- Photo bhejna ---------- */
function resizeForChat(file, maxSide, done) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      done(c.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

$('photoPick').addEventListener('change', function () {
  var file = this.files[0];
  this.value = '';
  if (!file || !msgRef) return;
  if (file.type.indexOf('image/') !== 0) { alert('Sirf photo chuno'); return; }

  resizeForChat(file, 600, function (dataUrl) {
    msgRef.push({ from: me.uid, type: 'photo', img: dataUrl, dur: PHOTO_MS, t: TS })
      .then(touchPeer)
      .catch(function () { alert('Photo nahi gayi, dobara try karo'); });
  });
});

/* ---------- Notification button ---------- */
function bellState() {
  var b = $('bellBtn');
  if (!('Notification' in window)) { b.style.display = 'none'; return; }
  b.textContent = Notification.permission === 'granted' ? '🔔' : '🔕';
}
$('bellBtn').addEventListener('click', function () {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { alert('Notification pehle se ON hai'); return; }
  if (Notification.permission === 'denied') { alert('Browser settings mein is site ka Notification Allow karo'); return; }
  Notification.requestPermission().then(bellState);
});
bellState();

window.ChatCore = {
  db: db, TS: TS, nowS: nowS,
  touchPeer: function () { touchPeer(); },
  getMe: function () { return me; },
  getPeer: function () { return peer; },
  getRoom: function () { return roomId; },
  getMsgRef: function () { return msgRef; },
  getMsgs: function () { return msgs; }
};

})();
}

// ===== NOTIFICATION + BADGE (jis page par ye file judi ho wahan chalta hai) =====
(function () {
  var IS_CHAT_PAGE = !!document.getElementById('searchForm');
  if (!window.firebase || !firebase.auth || !firebase.database) return;

  var db = firebase.database();
  var baseline = {};
  var first = true;

  function setBadge(n) {
    document.querySelectorAll('[data-chat-badge]').forEach(function (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.style.display = n > 0 ? 'inline-block' : 'none';
    });
  }

  function toast(title, body, url) {
    var old = document.getElementById('chatToast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'chatToast';
    t.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'width:calc(100% - 24px);max-width:456px;background:#0f1b47;color:#fff;border:1px solid #22d3ee;' +
      'border-radius:12px;padding:12px 14px;font-family:Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:pointer';
    var a = document.createElement('div');
    a.style.cssText = 'font-weight:700;font-size:14px';
    a.textContent = title;
    var b = document.createElement('div');
    b.style.cssText = 'font-size:13px;color:#9fb0d9;margin-top:2px';
    b.textContent = body;
    t.appendChild(a); t.appendChild(b);
    t.addEventListener('click', function () { location.href = url; });
    document.body.appendChild(t);
    try { if (navigator.vibrate) navigator.vibrate(120); } catch (e) {}
    setTimeout(function () { if (t.parentNode) t.remove(); }, 5000);
  }

  function systemNotify(title, body, url, tag) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      var n = new Notification(title, { body: body, tag: tag });
      n.onclick = function () { window.focus(); location.href = url; n.close(); };
      return true;
    } catch (e) { return false; }
  }

  function notify(e, room) {
    // Isi chat mein baithe ho aur screen par ho to alag se batane ki zaroorat nahi
    if (window.activeChatRoom === room && !document.hidden) return;
    if (IS_CHAT_PAGE && !document.hidden) return;   // chat page ki list khud dikhati hai

    var name = e.nick || e.n || 'Player';
    var url = 'chat.html?pid=' + e.pid;
    if (document.hidden) systemNotify('💬 ' + name, 'Naya message aaya hai', url, room);
    else toast('💬 ' + name, 'Naya message aaya hai', url);
  }

  firebase.auth().onAuthStateChanged(function (u) {
    if (!u) return;
    db.ref('userChats/' + u.uid).on('value', function (s) {
      var all = s.val() || {};
      var unread = 0, lastUnread = null;

      Object.keys(all).forEach(function (room) {
        var e = all[room];
        if (!e || !e.t) return;
        var isUnread = !e.r || e.t > e.r;
        if (isUnread) {
          unread++;
          lastUnread = e;
          if (!first && e.t > (baseline[room] || 0)) notify(e, room);
        }
        baseline[room] = e.t;
      });

      setBadge(unread);

      // Page kholte hi agar pehle se unread hain to ek baar batao
      if (first) {
        first = false;
        if (unread > 0 && !IS_CHAT_PAGE && !sessionStorage.getItem('chatToastShown')) {
          try { sessionStorage.setItem('chatToastShown', '1'); } catch (e) {}
          toast('💬 ' + unread + ' naya chat message',
                unread === 1 ? (lastUnread.nick || lastUnread.n || 'Player') : 'Chat kholo',
                'chat.html');
        }
      }
    });
  });
})();
