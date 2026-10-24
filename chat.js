// chat.js - Settings > Chat : UID se user dhundo, text / emoji / photo bhejo (live)

var db = firebase.database();
var MAX_TEXT = 50;
var EMOJIS = ['😀','😂','😍','😎','🥳','😭','😡','👍','👋','🙏','🔥','❤️','💯','🎮','🏆','💰','😅','🤝','😉','🤔','😴','🤩','👏','🎉'];

var me = null;        // { uid, pid, name, photo }
var peer = null;      // { uid, pid, name, photo }
var msgRef = null;
var seen = {};

function $(id) { return document.getElementById(id); }

// Sirf data: ya https image hi dikhao (safety)
function safeSrc(s) {
  return (typeof s === 'string' && (s.indexOf('data:image/') === 0 || s.indexOf('https://') === 0)) ? s : '';
}

function setAvatar(el, photo) {
  el.innerHTML = '';
  var src = safeSrc(photo);
  if (src) {
    var img = document.createElement('img');
    img.src = src;
    el.appendChild(img);
  } else {
    el.textContent = '🧑';
  }
}

function showMsg(text, isErr) {
  var el = $('searchMsg');
  el.textContent = text || '';
  el.className = 'hint' + (isErr ? ' err' : '');
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

    // Apna public card banao taaki dusre UID se dhundh sakein
    db.ref('playerIds/' + me.pid).set({ uid: me.uid, n: me.name, p: me.photo });
    renderRecent();
  }).catch(function () {
    showMsg('Data nahi aaya. Database Rules check karo.', true);
  });
});

/* ---------- Search ---------- */
$('uidInput').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

$('searchForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!me) { showMsg('Thoda ruko, loading...', true); return; }

  var pid = $('uidInput').value.trim();
  $('resultBox').innerHTML = '';

  if (pid.length < 10 || pid.length > 12) {
    showMsg('UID 10 se 12 digit ka hona chahiye', true);
    return;
  }
  if (pid === me.pid) {
    showMsg('Ye tumhara apna UID hai', true);
    return;
  }

  showMsg('Dhundh rahe hain...');
  db.ref('playerIds/' + pid).once('value').then(function (snap) {
    var d = snap.val();
    if (!d) { showMsg('Ye UID nahi mila', true); return; }
    showMsg('');
    var p = { uid: d.uid, pid: pid, name: d.n || 'Player', photo: d.p || '' };
    $('resultBox').appendChild(userCard(p));
  }).catch(function () {
    showMsg('Search nahi hua, dobara try karo', true);
  });
});

function userCard(p) {
  var card = document.createElement('div');
  card.className = 'user-card';
  var av = document.createElement('div');
  av.className = 'avatar';
  setAvatar(av, p.photo);
  var info = document.createElement('div');
  var n = document.createElement('div');
  n.className = 'u-name';
  n.textContent = p.name;
  var i = document.createElement('div');
  i.className = 'u-id';
  i.textContent = 'ID: ' + p.pid;
  info.appendChild(n);
  info.appendChild(i);
  card.appendChild(av);
  card.appendChild(info);
  card.addEventListener('click', function () { openChat(p); });
  return card;
}

/* ---------- Recent (sirf is phone mein save) ---------- */
function recentKey() { return 'chatRecent_' + (me ? me.uid : 'x'); }
function getRecent() {
  try {
    var list = JSON.parse(localStorage.getItem(recentKey()) || '[]');
    // apna khud ka card kabhi nahi dikhana
    return list.filter(function (x) { return me && x.uid !== me.uid && x.pid !== me.pid; });
  } catch (e) { return []; }
}
function saveRecent(p) {
  var list = getRecent().filter(function (x) { return x.pid !== p.pid; });
  list.unshift({ uid: p.uid, pid: p.pid, name: p.name, photo: p.photo });
  try { localStorage.setItem(recentKey(), JSON.stringify(list.slice(0, 10))); } catch (e) {}
}
function renderRecent() {
  var box = $('recentBox');
  box.innerHTML = '';
  var list = getRecent();
  $('recentTitle').style.display = list.length ? 'block' : 'none';
  list.forEach(function (p) { box.appendChild(userCard(p)); });
}

/* ---------- Chat window ---------- */
function openChat(p) {
  if (!me || p.uid === me.uid) {
    showMsg('Apne aap se chat nahi ho sakti', true);
    return;
  }
  peer = p;
  saveRecent(p);
  seen = {};
  $('messages').innerHTML = '';
  $('peerName').textContent = p.name;
  $('peerId').textContent = 'ID: ' + p.pid;
  setAvatar($('peerAvatar'), p.photo);
  $('searchView').style.display = 'none';
  $('chatView').style.display = 'flex';

  var roomId = [me.uid, peer.uid].sort().join('_');
  msgRef = db.ref('chats/' + roomId + '/messages');
  msgRef.limitToLast(100).on('child_added', function (snap) {
    addMessage(snap.key, snap.val());
  });
}

$('chatBack').addEventListener('click', function () {
  if (msgRef) { msgRef.off(); msgRef = null; }
  peer = null;
  $('emojiPanel').style.display = 'none';
  $('chatView').style.display = 'none';
  $('searchView').style.display = 'block';
  renderRecent();
});

function fmtTime(t) {
  var d = new Date(t || Date.now());
  var h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}

function addMessage(key, d) {
  if (!d || seen[key]) return;
  seen[key] = true;

  var box = document.createElement('div');
  box.className = 'msg ' + (d.from === me.uid ? 'mine' : 'theirs');

  if (d.type === 'photo') {
    var src = safeSrc(d.img);
    if (!src) return;
    var img = document.createElement('img');
    img.src = src;
    box.appendChild(img);
  } else {
    var t = document.createElement('span');
    t.textContent = d.text || '';      // textContent = safe, HTML nahi chalega
    box.appendChild(t);
  }

  var time = document.createElement('span');
  time.className = 'time';
  time.textContent = fmtTime(d.t);
  box.appendChild(time);

  var list = $('messages');
  list.appendChild(box);
  list.scrollTop = list.scrollHeight;
}

/* ---------- Text / Emoji bhejna ---------- */
var input = $('msgInput');

function charCount(s) { return Array.from(s).length; }   // emoji ko 1 gino

input.addEventListener('input', function () {
  var chars = Array.from(input.value);
  if (chars.length > MAX_TEXT) input.value = chars.slice(0, MAX_TEXT).join('');
  updateCounter();
});

function updateCounter() {
  var n = charCount(input.value);
  $('counter').textContent = n + '/' + MAX_TEXT;
  $('counter').className = 'counter' + (n >= MAX_TEXT ? ' full' : '');
}

function sendText() {
  var text = input.value.trim();
  if (!text || !msgRef || charCount(text) > MAX_TEXT) return;
  input.value = '';
  updateCounter();
  msgRef.push({
    from: me.uid,
    type: 'text',
    text: text,
    t: firebase.database.ServerValue.TIMESTAMP
  }).catch(function () { alert('Message nahi gaya, dobara try karo'); });
}

$('sendBtn').addEventListener('click', sendText);
input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); sendText(); }
});

// Emoji panel
var panel = $('emojiPanel');
EMOJIS.forEach(function (em) {
  var s = document.createElement('span');
  s.textContent = em;
  s.addEventListener('click', function () {
    if (charCount(input.value) < MAX_TEXT) {
      input.value += em;
      updateCounter();
    }
  });
  panel.appendChild(s);
});
$('emojiBtn').addEventListener('click', function () {
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
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
    msgRef.push({
      from: me.uid,
      type: 'photo',
      img: dataUrl,
      t: firebase.database.ServerValue.TIMESTAMP
    }).catch(function () { alert('Photo nahi gayi, dobara try karo'); });
  });
});
