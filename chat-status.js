// =====================================================================
// chat-status.js  -  New chat look (runs on chat.html only)  [with status like/views/reply + video]
//  1) Top tab switch:  [GAMES] [CHAT]
//  2) Bottom bar:  Messages | Status | Settings
//  3) Chat list without boxes/lines (one continuous list)
//  4) Status: text or photo, removed automatically after STATUS_HOURS
//  5) Settings: Notifications, Change password, Lock chat
// Add this file in chat.html AFTER chat.js.
// =====================================================================
(function () {
  'use strict';
  if (!document.getElementById('searchForm') || !window.firebase) return;

  /* =================== CONFIG - change values here =================== */
  var CONFIG = {
    STATUS_HOURS: 24,           // how many hours a status stays (max 24 - Rules also allow 24)
    STATUS_MAX: 10,             // max statuses one user can have at the same time
    TEXT_MAX: 200,              // max characters in a text status
    CAP_MAX: 100,               // max characters in a photo caption
    REPLY_MAX: 75,              // max characters in status reply (chat message limit is 100)
    VIDEO_MB: 4, VIDEO_SEC: 20, CHUNK: 150000,   // video limit: size (MB), seconds, chunk size
    TEXT_SEC: 5,                // seconds a text status stays on screen
    PHOTO_SEC: 6,               // seconds a photo status stays on screen
    PHOTO_SIDE: 600,            // max photo width/height in pixels
    PHOTO_QUALITY: 0.6,         // photo quality 0.1 - 1 (higher = clearer, bigger)
    BG: [                       // text status background colours (top to bottom)
      ['#2563eb', '#7c3aed'], ['#db2777', '#f97316'], ['#059669', '#0ea5e9'], ['#7c3aed', '#ec4899'],
      ['#b45309', '#facc15'], ['#0f172a', '#334155'], ['#dc2626', '#7f1d1d'], ['#0d9488', '#164e63']
    ]
  };

  /* =================== TEXT - change any wording here =================== */
  var T = {
    gamesTab: '🎮 GAMES', chatTab: '💬 CHAT', backGames: '← Games',
    tabMsg: 'Messages', tabStatus: 'Status', tabSet: 'Settings',
    loading: 'Loading...',
    myStatus: 'My status', recent: 'Recent updates', tapAdd: 'Tap + to add a status',
    noStatus: 'No status updates yet.\nStatus updates from your chats will appear here.',
    countSep: ' status • ',
    newStatus: 'New status', textStatus: '✏️ Text status', photoStatus: '📷 Photo status',
    typePh: 'Type a status', capPh: 'Add a caption...',
    maxReached: 'You can post up to {n} statuses at a time. Please delete an old one first.',
    postFail: 'Could not post status. Please check your Database Rules (statuses).',
    confirmDel: 'Delete this status?',
    justNow: 'Just now', minAgo: ' min ago', hrAgo: ' hr ago', dayAgo: ' day ago',
    notif: 'Notifications', notifSub: 'Alerts for new messages',
    changePw: 'Change password', pwSub: 'Your chat password',
    curPw: 'Current password', newPw: 'New password ({min}-{max} characters)', newPw2: 'Confirm new password',
    pwLen: 'New password must be {min} to {max} characters',
    pwMismatch: 'The new passwords do not match', pwWrong: 'Current password is incorrect',
    pwDone: 'Password changed successfully', tryAgain: 'Something went wrong. Please try again.',
    lockNow: 'Lock chat now', lockSub: 'Password will be required next time',
    goGames: 'Go to Games',
    cancel: 'Cancel', save: 'Save',
    viewedBy: 'Viewed by', noViews: 'No views yet', swipeUp: 'Swipe up for views',
    replyPh: 'Reply...', replyTag: '↩️ Status reply: ',
    videoStatus: '🎥 Video status', videoLoad: 'Loading video...',
    videoBig: 'Video must be under {mb} MB and {s} seconds.'
  };

  var db = firebase.database();
  var TS = firebase.database.ServerValue.TIMESTAMP;
  function $(id) { return document.getElementById(id); }
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  function core() { return window.ChatCore || null; }
  function nowS() { var C = core(); return C ? C.nowS() : Date.now(); }
  function safeSrc(s) { return (typeof s === 'string' && (s.indexOf('data:image/') === 0 || s.indexOf('https://') === 0)) ? s : ''; }
  function setAv(elm, photo, fallback) {
    elm.innerHTML = '';
    var src = safeSrc(photo);
    if (src) { var i = document.createElement('img'); i.src = src; elm.appendChild(i); }
    else elm.textContent = fallback || '🧑';
  }
  function ago(ms) {
    var s = Math.max(0, Math.round((nowS() - ms) / 1000));
    if (s < 60) return T.justNow;
    if (s < 3600) return Math.floor(s / 60) + T.minAgo;
    if (s < 86400) return Math.floor(s / 3600) + T.hrAgo;
    return Math.floor(s / 86400) + T.dayAgo;
  }
  function grad(i) { var g = CONFIG.BG[((i % CONFIG.BG.length) + CONFIG.BG.length) % CONFIG.BG.length]; return 'linear-gradient(160deg,' + g[0] + ',' + g[1] + ')'; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- CSS ---------------- */
  var st = h('style');
  st.textContent = [
    '#searchView{padding:10px 0 90px!important}',
    '.hs-tabs{display:flex;gap:10px;padding:2px 10px 12px}',
    '.hs-tab{flex:1;text-align:center;padding:13px 8px;border-radius:18px;font-weight:800;font-size:17px;letter-spacing:.5px;color:#cfe3ff;text-decoration:none;border:2px solid #1f3a8a;background:#0b1544;position:relative}',
    '.hs-tab.g.on{color:#fff;border-color:#22d3ee;background:linear-gradient(135deg,#1d4ed8,#a855f7);box-shadow:0 0 16px rgba(99,102,241,.5)}',
    '.hs-tab.c.on{color:#fff;border-color:#fb7185;background:linear-gradient(90deg,#ec4899,#f97316,#facc15);box-shadow:0 0 16px rgba(249,115,22,.45)}',
    '.pane{padding:0 10px}',
    /* chat list: no boxes or lines, full width */
    '#recentBox .user-card,#resultBox .user-card{background:transparent;border:none;border-radius:0;margin:0;padding:11px 4px}',
    '#recentBox .user-card:active,#resultBox .user-card:active{background:rgba(255,255,255,.07);transform:none}',
    '#recentBox .avatar,#resultBox .avatar{width:54px;height:54px}',
    '#recentBox .u-name,#resultBox .u-name{font-size:17px}',
    /* bottom bar */
    '.cbar{position:fixed;left:0;right:0;bottom:0;max-width:480px;margin:0 auto;display:flex;background:#070e2b;border-top:1px solid #1f3a8a;z-index:30}',
    '.cbar button{flex:1;background:none;border:none;color:#9fb0d9;padding:8px 0 10px;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}',
    '.cbar .ic{position:relative;font-size:21px;padding:3px 20px;border-radius:14px}',
    '.cbar button.on{color:#fff;font-weight:700}.cbar button.on .ic{background:#1d4ed8}',
    '.cbar [data-chat-badge]{position:absolute;top:-4px;right:2px;font-size:10px!important;padding:0 5px!important;margin:0!important}',
    /* status */
    '.srow{display:flex;align-items:center;gap:13px;padding:10px 4px;cursor:pointer}',
    '.srow:active{background:rgba(255,255,255,.07)}',
    '.sav{width:56px;height:56px;border-radius:50%;padding:3px;border:3px solid #22d3ee;display:flex;flex-shrink:0}',
    '.sav.seen{border-color:#475569}.sav.none{border:3px dashed #1f3a8a}',
    '.sav>div{flex:1;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden}',
    '.sav img{width:100%;height:100%;object-fit:cover}',
    '.srow .sn{font-weight:700;font-size:16px}.srow .ss{font-size:12px;color:#9fb0d9;margin-top:2px}',
    '.srow .grow{flex:1;min-width:0}',
    '.sadd{width:42px;height:42px;border-radius:50%;background:#2563eb;border:none;color:#fff;font-size:24px;cursor:pointer}',
    '.stitle{font-size:13px;color:#9fb0d9;margin:14px 4px 4px}',
    '.sempty{font-size:13px;color:#9fb0d9;text-align:center;padding:30px 10px}',
    '.ov{position:fixed;inset:0;z-index:150;display:none;flex-direction:column}',
    '.ov .top{display:flex;align-items:center;gap:10px;padding:12px;color:#fff;z-index:3}',
    '.ov .top button{background:rgba(0,0,0,.35);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer}',
    '.ov .top .sp{flex:1}',
    '.cmp-body{flex:1;display:flex;align-items:center;justify-content:center;padding:20px}',
    '.cmp-body textarea{width:100%;height:60%;background:transparent;border:none;outline:none;color:#fff;font-size:28px;font-weight:700;text-align:center;resize:none;font-family:Arial,sans-serif}',
    '.cmp-body textarea::placeholder{color:rgba(255,255,255,.6)}',
    '.cmp-body img{max-width:100%;max-height:70vh;border-radius:10px}',
    '.cmp-bot{display:flex;align-items:center;gap:8px;padding:10px 12px 18px}',
    '.cmp-bot input{flex:1;background:rgba(0,0,0,.4);border:none;border-radius:22px;color:#fff;font-size:15px;padding:12px 16px;outline:none}',
    '.cmp-bot button{width:48px;height:48px;border-radius:50%;background:#22c55e;border:none;color:#fff;font-size:20px;cursor:pointer}',
    '.cnt{color:rgba(255,255,255,.8);font-size:12px;padding-right:6px}',
    '.stv{background:#000}.stv .bars{display:flex;gap:4px;padding:10px 10px 0}',
    '.stv .bar{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}',
    '.stv .bar i{display:block;height:100%;width:0;background:#fff}',
    '.stv .who{display:flex;flex-direction:column;flex:1;min-width:0}.stv .who b{font-size:15px}.stv .who span{font-size:12px;opacity:.8}',
    '.stv .stage{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:1}',
    '.stv .stage .tx{font-size:28px;font-weight:700;color:#fff;text-align:center;padding:30px;word-break:break-word;white-space:pre-wrap}',
    '.stv .stage img{max-width:100%;max-height:100%;object-fit:contain}',
    '.stv .cap{position:absolute;left:0;right:0;bottom:0;padding:18px 16px 28px;text-align:center;color:#fff;font-size:16px;background:linear-gradient(transparent,rgba(0,0,0,.7));z-index:2}',
    '.stv .tap{position:absolute;top:70px;bottom:60px;width:50%;z-index:2}.stv .tap.l{left:0}.stv .tap.r{right:0}',
    '.stv .rbar{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;align-items:center;padding:8px 12px 16px;z-index:4;background:linear-gradient(transparent,rgba(0,0,0,.55))}',
    '.stv .rbar input{flex:1;min-width:0;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.35);border-radius:22px;color:#fff;font-size:15px;padding:11px 16px;outline:none}',
    '.stv .rbar button{width:44px;height:44px;border-radius:50%;border:none;background:rgba(0,0,0,.45);color:#fff;font-size:20px;cursor:pointer}',
    '.stv .rbar .rsd{background:#22c55e}',
    '.stv .vbar{position:absolute;left:0;right:0;bottom:0;text-align:center;color:#fff;font-size:14px;padding:14px 10px 20px;z-index:4;background:linear-gradient(transparent,rgba(0,0,0,.6));cursor:pointer}',
    '.stv .vpan{position:absolute;left:0;right:0;bottom:0;height:62%;background:#0f1b47;border-radius:20px 20px 0 0;z-index:6;display:flex;flex-direction:column;border-top:2px solid #22d3ee}',
    '.stv .vhd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;color:#fff;font-size:16px}',
    '.stv .vhd button{background:rgba(255,255,255,.12);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer}',
    '.stv .vlist{flex:1;overflow-y:auto;padding:0 16px 20px}',
    '.stv .vrow{display:flex;align-items:center;gap:12px;padding:9px 0}',
    '.stv .vav{width:44px;height:44px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;font-weight:700;flex-shrink:0}',
    '.stv .vav img{width:100%;height:100%;object-fit:cover}',
    '.stv .grow{flex:1;min-width:0}.stv .vrow .sn{font-weight:700;color:#fff}.stv .vrow .ss{font-size:12px;color:#9fb0d9}.stv .vl{font-size:20px}',
    '.stv .stage video{max-width:100%;max-height:100%}',
    '.stv .vload{color:#fff;font-size:14px}',
    /* settings */
    '.setp{display:flex;align-items:center;gap:14px;background:#0f1b47;border:1px solid #1f3a8a;border-radius:14px;padding:14px;margin-bottom:12px}',
    '.setp .big{width:64px;height:64px;border-radius:50%;border:3px solid #22d3ee;background:#1e3a8a;display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden;flex-shrink:0}',
    '.setp img{width:100%;height:100%;object-fit:cover}',
    '.setp b{font-size:18px}.setp span{display:block;font-size:12px;color:#9fb0d9;margin-top:3px}',
    '.setr{display:flex;align-items:center;gap:14px;padding:15px 8px;color:#fff;text-decoration:none;cursor:pointer;background:none;border:none;width:100%;text-align:left;font-size:16px;font-weight:700}',
    '.setr:active{background:rgba(255,255,255,.07)}.setr .ri{width:36px;font-size:22px;text-align:center}.setr .rt{flex:1}.setr small{display:block;font-weight:400;font-size:12px;color:#9fb0d9;margin-top:2px}',
    '#bellBtn{background:none;border:1px solid #1f3a8a;color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer}',
    '.mdl{position:fixed;inset:0;z-index:160;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center;padding:20px}',
    '.mdl .box{width:100%;max-width:360px;background:#0f1b47;border:1px solid #22d3ee;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px}',
    '.mdl h3{font-size:18px;text-align:center}.mdl input{background:#060c24;border:1px solid #1f3a8a;border-radius:10px;color:#fff;font-size:16px;padding:12px;outline:none}',
    '.mdl .msg{font-size:13px;color:#f87171;min-height:16px}.mdl .msg.ok{color:#4ade80}',
    '.mdl .b2{display:flex;gap:8px}.mdl .b2 button{flex:1;padding:12px;border-radius:10px;border:none;font-size:15px;font-weight:700;cursor:pointer;background:#16245e;color:#fff}.mdl .b2 button.p{background:#2563eb}',
    '#lockView .lk-back{display:inline-block;color:#cfe3ff;text-decoration:none;font-weight:700;margin:0 auto 10px;max-width:480px}'
  ].join('\n');
  document.head.appendChild(st);
  /* ---------------- Layout: tabs + panes + bottom bar ---------------- */
  var sv = $('searchView');
  var oldHead = sv.querySelector('.header');
  var bell = $('bellBtn');
  if (oldHead) oldHead.parentNode.removeChild(oldHead);

  var tabs = h('div', 'hs-tabs');
  var tg = h('a', 'hs-tab g', T.gamesTab); tg.href = 'index.html';
  var tc = h('a', 'hs-tab c on', T.chatTab); tc.href = '#';
  tabs.appendChild(tg); tabs.appendChild(tc);
  sv.insertBefore(tabs, sv.firstChild);

  var paneM = h('div', 'pane'), paneS = h('div', 'pane'), paneT = h('div', 'pane');
  ['searchForm', 'searchMsg', 'resultBox', 'recentTitle', 'recentBox'].forEach(function (id) { paneM.appendChild($(id)); });
  paneS.style.display = 'none'; paneT.style.display = 'none';
  sv.appendChild(paneM); sv.appendChild(paneS); sv.appendChild(paneT);

  var bar = h('div', 'cbar');
  var btns = {};
  [['m', '💬', T.tabMsg], ['s', '◎', T.tabStatus], ['t', '⚙️', T.tabSet]].forEach(function (a) {
    var b = h('button'); b.type = 'button';
    var ic = h('span', 'ic', a[1]);
    if (a[0] === 'm') { var bd = h('span'); bd.setAttribute('data-chat-badge', ''); bd.style.cssText = 'display:none;background:#ef4444;color:#fff;border-radius:10px;font-weight:700'; ic.appendChild(bd); }
    b.appendChild(ic); b.appendChild(h('span', '', a[2]));
    b.addEventListener('click', function () { show(a[0]); });
    bar.appendChild(b); btns[a[0]] = b;
  });
  sv.appendChild(bar);

  function show(w) {
    paneM.style.display = w === 'm' ? '' : 'none';
    paneS.style.display = w === 's' ? '' : 'none';
    paneT.style.display = w === 't' ? '' : 'none';
    Object.keys(btns).forEach(function (k) { btns[k].classList.toggle('on', k === w); });
    if (w === 's') renderStatus();
    if (w === 't') renderSettings();
    window.scrollTo(0, 0);
  }
  show('m');

  // Way back to Games from the lock screen
  var lv = $('lockView');
  if (lv) { var back = h('a', 'lk-back', T.backGames); back.href = 'index.html'; lv.insertBefore(back, lv.firstChild); }

  /* =================== STATUS =================== */
  var myList = [], contacts = [];
  var seenKey = function () { var C = core(), m = C && C.getMe(); return 'st_seen_' + (m ? m.uid : ''); };

  function loadMine() {
    var C = core(), me = C && C.getMe();
    if (!me) return Promise.resolve([]);
    return db.ref('statuses/' + me.uid).once('value').then(function (s) {
      var v = s.val() || {}, now = nowS(), out = [];
      Object.keys(v).forEach(function (k) {
        var x = v[k];
        if (!x || !x.e) return;
        if (x.e <= now) { db.ref('statuses/' + me.uid + '/' + k).remove().catch(function () {}); db.ref('statusReacts/' + me.uid + '/' + k).remove().catch(function () {}); db.ref('statusBlobs/' + me.uid + '/' + k).remove().catch(function () {}); return; }   // cleanup of expired ones
        x.id = k; x.uid = me.uid; out.push(x);
      });
      out.sort(function (a, b) { return a.t - b.t; });
      return out;
    }).catch(function () { return []; });
  }
  function loadContacts() {
    var C = core(); if (!C) return Promise.resolve([]);
    var inbox = C.getInbox(), now = nowS();
    var rooms = Object.keys(inbox).filter(function (r) { return inbox[r] && inbox[r].uid; });
    return Promise.all(rooms.map(function (r) {
      var e = inbox[r];
      return db.ref('statuses/' + e.uid).once('value').then(function (s) {
        var v = s.val() || {}, list = [];
        Object.keys(v).forEach(function (k) { var x = v[k]; if (x && x.e > now) { x.id = k; x.uid = e.uid; list.push(x); } });
        list.sort(function (a, b) { return a.t - b.t; });
        return list.length ? { uid: e.uid, name: e.nick || e.n || 'Player', photo: e.p, list: list } : null;
      }).catch(function () { return null; });
    })).then(function (arr) {
      arr = arr.filter(Boolean);
      arr.sort(function (a, b) { return b.list[b.list.length - 1].t - a.list[a.list.length - 1].t; });
      return arr;
    });
  }
  function renderStatus() {
    var C = core(), me = C && C.getMe();
    paneS.innerHTML = '';
    if (!me) { paneS.appendChild(h('div', 'sempty', T.loading)); return; }
    var row = h('div', 'srow');
    var av = h('div', 'sav none'); var inner = h('div'); setAv(inner, me.photo); av.appendChild(inner);
    var g = h('div', 'grow'); g.appendChild(h('div', 'sn', T.myStatus)); var sub = h('div', 'ss', T.loading); g.appendChild(sub);
    var add = h('button', 'sadd', '+'); add.type = 'button';
    row.appendChild(av); row.appendChild(g); row.appendChild(add);
    paneS.appendChild(row);
    add.addEventListener('click', function (e) { e.stopPropagation(); addMenu(); });

    paneS.appendChild(h('div', 'stitle', T.recent));
    var box = h('div'); paneS.appendChild(box);
    box.appendChild(h('div', 'sempty', T.loading));

    loadMine().then(function (list) {
      myList = list;
      if (list.length) {
        av.className = 'sav'; sub.textContent = list.length + T.countSep + ago(list[list.length - 1].t);
        row.onclick = function () { openViewer({ name: T.myStatus, photo: me.photo, list: list, mine: true }); };
      } else {
        sub.textContent = T.tapAdd;
        row.onclick = addMenu;
      }
    });
    loadContacts().then(function (arr) {
      contacts = arr; box.innerHTML = '';
      if (!arr.length) { box.appendChild(h('div', 'sempty', T.noStatus)); box.firstChild.style.whiteSpace = 'pre-line'; return; }
      var seen = lsGet(seenKey());
      arr.forEach(function (c) {
        var allSeen = c.list.every(function (x) { return seen[x.id]; });
        var r = h('div', 'srow');
        var a = h('div', 'sav' + (allSeen ? ' seen' : '')); var i2 = h('div'); setAv(i2, c.photo); a.appendChild(i2);
        var gg = h('div', 'grow'); gg.appendChild(h('div', 'sn', c.name)); gg.appendChild(h('div', 'ss', ago(c.list[c.list.length - 1].t)));
        r.appendChild(a); r.appendChild(gg);
        r.addEventListener('click', function () { openViewer(c); });
        box.appendChild(r);
      });
    });
  }

  /* ----- create status ----- */
  function addMenu() {
    if (myList.length >= CONFIG.STATUS_MAX) { alert(T.maxReached.replace('{n}', CONFIG.STATUS_MAX)); return; }
    var m = modal(T.newStatus, function (box, close) {
      var a = h('button', 'p', T.textStatus); a.type = 'button';
      var b = h('button', 'p', T.photoStatus); b.type = 'button';
      var v = h('button', 'p', T.videoStatus); v.type = 'button';
      var c = h('button', '', T.cancel); c.type = 'button';
      [a, b, v, c].forEach(function (x) { x.style.cssText = 'width:100%;margin-top:2px'; box.appendChild(x); });
      a.onclick = function () { close(); composeText(); };
      b.onclick = function () { close(); pickPhoto(); };
      v.onclick = function () { close(); pickVideo(); };
      c.onclick = close;
    });
  }

  function publish(obj) {
    var C = core(), me = C.getMe();
    obj.t = TS; obj.e = nowS() + Math.min(24, CONFIG.STATUS_HOURS) * 3600000;
    return db.ref('statuses/' + me.uid).push(obj);
  }

  var cmp = h('div', 'ov'); document.body.appendChild(cmp);
  function closeCmp() { cmp.style.display = 'none'; cmp.innerHTML = ''; }

  function composeText() {
    var bg = Math.floor(Math.random() * CONFIG.BG.length);
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = grad(bg);
    var top = h('div', 'top');
    var x = h('button', '', '✕'); x.type = 'button'; x.onclick = closeCmp;
    var sp = h('div', 'sp'); var cnt = h('span', 'cnt', '0/' + CONFIG.TEXT_MAX);
    var pal = h('button', '', '🎨'); pal.type = 'button';
    top.appendChild(x); top.appendChild(sp); top.appendChild(cnt); top.appendChild(pal);
    var body = h('div', 'cmp-body'); var ta = h('textarea'); ta.placeholder = T.typePh; ta.maxLength = CONFIG.TEXT_MAX; body.appendChild(ta);
    var bot = h('div', 'cmp-bot'); var s2 = h('div', 'sp'); s2.style.flex = '1';
    var send = h('button', '', '➤'); send.type = 'button'; bot.appendChild(s2); bot.appendChild(send);
    cmp.appendChild(top); cmp.appendChild(body); cmp.appendChild(bot);
    ta.oninput = function () { cnt.textContent = ta.value.length + '/' + CONFIG.TEXT_MAX; };
    pal.onclick = function () { bg = (bg + 1) % CONFIG.BG.length; cmp.style.background = grad(bg); };
    send.onclick = function () {
      var t = ta.value.trim(); if (!t) return;
      send.disabled = true;
      publish({ ty: 'text', tx: t.slice(0, CONFIG.TEXT_MAX), bg: bg })
        .then(function () { closeCmp(); renderStatus(); })
        .catch(function () { send.disabled = false; alert(T.postFail); });
    };
    setTimeout(function () { ta.focus(); }, 100);
  }

  function pickPhoto() {
    var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none';
    document.body.appendChild(f);
    f.addEventListener('change', function () {
      var file = f.files[0]; f.remove();
      if (!file || file.type.indexOf('image/') !== 0) return;
      var rd = new FileReader();
      rd.onload = function (e) {
        var im = new Image();
        im.onload = function () {
          var sc = Math.min(1, CONFIG.PHOTO_SIDE / Math.max(im.width, im.height));
          var cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          composePhoto(cv.toDataURL('image/jpeg', CONFIG.PHOTO_QUALITY));
        };
        im.src = e.target.result;
      };
      rd.readAsDataURL(file);
    });
    f.click();
  }
  function composePhoto(data) {
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = '#000';
    var top = h('div', 'top'); var x = h('button', '', '✕'); x.type = 'button'; x.onclick = closeCmp; top.appendChild(x);
    var body = h('div', 'cmp-body'); var im = h('img'); im.src = data; body.appendChild(im);
    var bot = h('div', 'cmp-bot'); var cap = h('input'); cap.placeholder = T.capPh; cap.maxLength = CONFIG.CAP_MAX;
    var send = h('button', '', '➤'); send.type = 'button'; bot.appendChild(cap); bot.appendChild(send);
    cmp.appendChild(top); cmp.appendChild(body); cmp.appendChild(bot);
    send.onclick = function () {
      send.disabled = true;
      var o = { ty: 'photo', im: data };
      if (cap.value.trim()) o.cp = cap.value.trim().slice(0, CONFIG.CAP_MAX);
      publish(o).then(function () { closeCmp(); renderStatus(); })
        .catch(function () { send.disabled = false; alert(T.postFail); });
    };
  }

  /* ----- video status ----- */
  var vcache = {};
  function publishVideo(dataUrl, dur, cap, onProg) {
    var C = core(), me = C.getMe();
    var ref = db.ref('statuses/' + me.uid).push(), sid = ref.key;
    var n = Math.ceil(dataUrl.length / CONFIG.CHUNK), jobs = [], done = 0;
    for (var i = 0; i < n; i++) {
      (function (i) {
        jobs.push(db.ref('statusBlobs/' + me.uid + '/' + sid + '/c/' + i)
          .set(dataUrl.substr(i * CONFIG.CHUNK, CONFIG.CHUNK))
          .then(function () { done++; if (onProg) onProg(Math.round(done * 100 / n)); }));
      })(i);
    }
    return Promise.all(jobs).then(function () {
      var o = { ty: 'video', nc: n, d: dur, t: TS, e: nowS() + Math.min(24, CONFIG.STATUS_HOURS) * 3600000 };
      if (cap) o.cp = cap;
      return ref.set(o);
    }).catch(function (err) {
      db.ref('statusBlobs/' + me.uid + '/' + sid).remove().catch(function () {});
      throw err;
    });
  }
  function pickVideo() {
    var f = document.createElement('input'); f.type = 'file'; f.accept = 'video/*'; f.style.display = 'none';
    document.body.appendChild(f);
    var bigMsg = T.videoBig.replace('{mb}', CONFIG.VIDEO_MB).replace('{s}', CONFIG.VIDEO_SEC);
    f.addEventListener('change', function () {
      var file = f.files[0]; f.remove();
      if (!file || file.type.indexOf('video/') !== 0) return;
      if (file.size > CONFIG.VIDEO_MB * 1048576) { alert(bigMsg); return; }
      var url = URL.createObjectURL(file), v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = function () {
        var d = isFinite(v.duration) ? Math.round(v.duration) : 0; URL.revokeObjectURL(url);
        if (!d || d > CONFIG.VIDEO_SEC) { alert(bigMsg); return; }
        var rd = new FileReader();
        rd.onload = function (e) { composeVideo(e.target.result, d); };
        rd.readAsDataURL(file);
      };
      v.onerror = function () { alert(T.tryAgain); };
      v.src = url;
    });
    f.click();
  }
  function composeVideo(data, d) {
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = '#000';
    var top = h('div', 'top'); var x = h('button', '', '✕'); x.type = 'button'; x.onclick = closeCmp; top.appendChild(x);
    var body = h('div', 'cmp-body'); var vd = h('video'); vd.src = data; vd.controls = true; vd.setAttribute('playsinline', '');
    vd.style.cssText = 'max-width:100%;max-height:70vh;border-radius:10px'; body.appendChild(vd);
    var bot = h('div', 'cmp-bot'); var cap = h('input'); cap.placeholder = T.capPh; cap.maxLength = CONFIG.CAP_MAX;
    var send = h('button', '', '➤'); send.type = 'button'; bot.appendChild(cap); bot.appendChild(send);
    cmp.appendChild(top); cmp.appendChild(body); cmp.appendChild(bot);
    send.onclick = function () {
      send.disabled = true; cap.disabled = true; send.style.fontSize = '12px';
      publishVideo(data, d, cap.value.trim().slice(0, CONFIG.CAP_MAX), function (p) { send.textContent = p + '%'; })
        .then(function () { closeCmp(); renderStatus(); })
        .catch(function () { send.disabled = false; cap.disabled = false; send.textContent = '➤'; send.style.fontSize = ''; alert(T.postFail); });
    };
  }
  function getVideo(x) {
    if (vcache[x.id]) return Promise.resolve(vcache[x.id]);
    return db.ref('statusBlobs/' + x.uid + '/' + x.id + '/c').once('value').then(function (s) {
      var v = s.val() || {}, keys = Object.keys(v).map(Number).sort(function (a, b) { return a - b; });
      if (!keys.length || (x.nc && keys.length !== x.nc)) throw new Error('missing');
      var src = keys.map(function (k) { return v[k]; }).join('');
      if (src.indexOf('data:video/') !== 0) throw new Error('bad');
      vcache[x.id] = src; return src;
    });
  }

  /* ----- view status ----- */
  var stv = h('div', 'ov stv'); document.body.appendChild(stv);
  var vt = null;
  function closeViewer() {
    if (vt) { clearTimeout(vt); vt = null; }
    stv.style.display = 'none'; stv.innerHTML = ''; stv.ontouchstart = null; stv.ontouchend = null; vcache = {};
    if (paneS.style.display !== 'none') renderStatus();
  }
  function openViewer(who) {
    var list = who.list, seen = lsGet(seenKey()), idx = 0;
    for (var i = 0; i < list.length; i++) { if (!seen[list[i].id]) { idx = i; break; } }
    stv.style.display = 'flex';
    function draw() {
      if (vt) { clearTimeout(vt); vt = null; }
      if (idx >= list.length) { closeViewer(); return; }
      if (idx < 0) idx = 0;
      var x = list[idx], sec = x.ty === 'photo' ? CONFIG.PHOTO_SEC : (x.ty === 'video' ? Math.max(1, x.d || 10) : CONFIG.TEXT_SEC);
      seen[x.id] = 1; lsSet(seenKey(), seen);
      var me0 = core().getMe();
      if (!who.mine) {
        var rr = db.ref('statusReacts/' + x.uid + '/' + x.id + '/' + me0.uid);
        rr.once('value').then(function (sn) {
          if (!sn.exists()) rr.set({ n: (me0.cname || me0.name || 'Player').slice(0, 30), t: TS }).catch(function () {});
          if (heart && sn.val() && sn.val().l) heart.textContent = '❤️';
        }).catch(function () {});
      }
      stv.innerHTML = '';
      stv.style.background = x.ty === 'text' ? grad(x.bg || 0) : '#000';
      var bars = h('div', 'bars');
      list.forEach(function (_, k) { var b = h('div', 'bar'); var f = h('i'); if (k < idx) f.style.width = '100%'; if (k === idx && x.ty !== 'video') { f.style.transition = 'width ' + sec + 's linear'; setTimeout(function () { f.style.width = '100%'; }, 30); } b.appendChild(f); bars.appendChild(b); });
      var top = h('div', 'top');
      var a = h('div', 'avatar'); a.style.cssText = 'width:38px;height:38px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;overflow:hidden'; setAv(a, who.photo);
      var wh = h('div', 'who'); wh.appendChild(h('b', '', who.name)); wh.appendChild(h('span', '', ago(x.t)));
      top.appendChild(a); top.appendChild(wh);
      if (who.mine) { var del = h('button', '', '🗑'); del.type = 'button'; del.onclick = function (e) {
        e.stopPropagation();
        if (!confirm(T.confirmDel)) return;
        db.ref('statuses/' + x.uid + '/' + x.id).remove().catch(function () {});
        db.ref('statusReacts/' + x.uid + '/' + x.id).remove().catch(function () {});
        db.ref('statusBlobs/' + x.uid + '/' + x.id).remove().catch(function () {});
        list.splice(idx, 1); myList = list; draw();
      }; top.appendChild(del); }
      var cl = h('button', '', '✕'); cl.type = 'button'; cl.onclick = closeViewer; top.appendChild(cl);
      var stage = h('div', 'stage');
      if (x.ty === 'photo') { var im = h('img'); im.src = safeSrc(x.im); stage.appendChild(im); }
      else if (x.ty === 'video') {
        var ld = h('div', 'vload', T.videoLoad); stage.appendChild(ld);
        var myIdx = idx;
        getVideo(x).then(function (src) {
          if (idx !== myIdx || !stage.parentNode) return;
          var vd = h('video'); vd.src = src; vd.setAttribute('playsinline', '');
          vd.onplaying = function () {
            var bi = bars.children[idx] && bars.children[idx].firstChild;
            if (bi && !bi.style.width) { bi.style.transition = 'width ' + sec + 's linear'; setTimeout(function () { bi.style.width = '100%'; }, 30); }
          };
          vd.onended = function () { idx++; draw(); };
          stage.innerHTML = ''; stage.appendChild(vd);
          var pp = vd.play(); if (pp && pp.catch) pp.catch(function () { vd.controls = true; });
        }).catch(function () { ld.textContent = T.tryAgain; });
      }
      else stage.appendChild(h('div', 'tx', x.tx || ''));
      stv.appendChild(bars); stv.appendChild(top); stv.appendChild(stage);
      if ((x.ty === 'photo' || x.ty === 'video') && x.cp) stv.appendChild(h('div', 'cap', x.cp));
      var l = h('div', 'tap l'), r = h('div', 'tap r');
      l.onclick = function () { idx--; draw(); }; r.onclick = function () { idx++; draw(); };
      stv.appendChild(l); stv.appendChild(r);
      var capEl = stv.querySelector('.cap'); if (capEl) capEl.style.bottom = '64px';
      var heart = null, sy = null;
      if (!who.mine) {
        var rb = h('div', 'rbar');
        var rin = h('input'); rin.placeholder = T.replyPh; rin.maxLength = CONFIG.REPLY_MAX;
        heart = h('button', '', '🤍'); heart.type = 'button';
        var rsend = h('button', 'rsd', '➤'); rsend.type = 'button';
        rb.appendChild(rin); rb.appendChild(heart); rb.appendChild(rsend); stv.appendChild(rb);
        var nm = (me0.cname || me0.name || 'Player').slice(0, 30);
        rin.onfocus = function () { if (vt) { clearTimeout(vt); vt = null; } var vv = stv.querySelector('video'); if (vv) vv.pause(); };
        rin.onblur = function () {
          var vv = stv.querySelector('video');
          if (vv) { var pr = vv.play(); if (pr && pr.catch) pr.catch(function () {}); return; }
          if (!vt) vt = setTimeout(function () { idx++; draw(); }, sec * 1000);
        };
        heart.onclick = function () {
          var liked = heart.textContent === '❤️';
          var rf = db.ref('statusReacts/' + x.uid + '/' + x.id + '/' + me0.uid);
          heart.textContent = liked ? '🤍' : '❤️';
          rf.once('value').then(function (sn) {
            if (!sn.exists()) return rf.set({ n: nm, t: TS, l: true });
            return liked ? rf.child('l').remove() : rf.child('l').set(true);
          }).catch(function () { heart.textContent = liked ? '❤️' : '🤍'; });
        };
        rsend.onclick = function () {
          var t = rin.value.trim(); if (!t) return;
          var room = [me0.uid, x.uid].sort().join('_');
          var txt = (T.replyTag + t).slice(0, 100);
          rsend.disabled = true;
          db.ref('chats/' + room + '/messages').push({ from: me0.uid, type: 'text', text: txt, dur: Math.min(600000, 10000 + txt.length * 1000), t: TS })
            .then(function () {
              var up = { uid: me0.uid, pid: me0.pid, n: nm, t: TS };
              if (me0.photo && me0.photo.length <= 30000) up.p = me0.photo;
              db.ref('userChats/' + x.uid + '/' + room).update(up).catch(function () {});
              rin.value = ''; rin.blur(); rsend.disabled = false; rsend.textContent = '✔';
              setTimeout(function () { rsend.textContent = '➤'; }, 1200);
            }).catch(function () { rsend.disabled = false; alert(T.tryAgain); });
        };
      } else {
        var vb = h('div', 'vbar', '👁  ' + T.swipeUp); stv.appendChild(vb);
        db.ref('statusReacts/' + x.uid + '/' + x.id).once('value').then(function (sn) {
          vb.textContent = '👁 ' + Object.keys(sn.val() || {}).length + '  •  ' + T.swipeUp;
        }).catch(function () {});
        vb.onclick = function (e) { e.stopPropagation(); openViews(x, draw); };
        stv.ontouchstart = function (e) { sy = e.touches[0].clientY; };
        stv.ontouchend = function (e) {
          if (stv.querySelector('.vpan')) return;
          if (sy !== null && sy - e.changedTouches[0].clientY > 60) openViews(x, draw);
          sy = null;
        };
      }
      if (x.ty !== 'video') vt = setTimeout(function () { idx++; draw(); }, sec * 1000);
    }
    draw();
  }

  function openViews(x, onClose) {
    if (vt) { clearTimeout(vt); vt = null; }
    var vv0 = stv.querySelector('video'); if (vv0) vv0.pause();
    var pan = h('div', 'vpan'), hd = h('div', 'vhd');
    var ttl = h('b', '', T.viewedBy), cx = h('button', '', '✕'); cx.type = 'button';
    hd.appendChild(ttl); hd.appendChild(cx); pan.appendChild(hd);
    var lst = h('div', 'vlist'); lst.appendChild(h('div', 'sempty', T.loading)); pan.appendChild(lst);
    stv.appendChild(pan);
    cx.onclick = function () { pan.remove(); if (onClose) onClose(); };
    var inbox = core().getInbox();
    db.ref('statusReacts/' + x.uid + '/' + x.id).once('value').then(function (sn) {
      var v = sn.val() || {};
      var arr = Object.keys(v).map(function (k) { var r = v[k]; r.uid = k; return r; });
      arr.sort(function (a, b) { return b.t - a.t; });
      ttl.textContent = T.viewedBy + ' ' + arr.length + '  •  ❤️ ' + arr.filter(function (r) { return r.l; }).length;
      lst.innerHTML = '';
      if (!arr.length) { lst.appendChild(h('div', 'sempty', T.noViews)); return; }
      arr.forEach(function (r) {
        var ph = '';
        Object.keys(inbox).forEach(function (rm) { if (inbox[rm] && inbox[rm].uid === r.uid) ph = inbox[rm].p; });
        var row = h('div', 'vrow'), av = h('div', 'vav');
        setAv(av, ph, (r.n || '?').charAt(0).toUpperCase());
        var g = h('div', 'grow'); g.appendChild(h('div', 'sn', r.n)); g.appendChild(h('div', 'ss', ago(r.t)));
        row.appendChild(av); row.appendChild(g);
        if (r.l) row.appendChild(h('span', 'vl', '❤️'));
        lst.appendChild(row);
      });
    }).catch(function () { lst.innerHTML = ''; lst.appendChild(h('div', 'sempty', T.tryAgain)); });
  }

  /* =================== SETTINGS =================== */
  function modal(title, build) {
    var bg = h('div', 'mdl'); var box = h('div', 'box');
    box.appendChild(h('h3', '', title)); bg.appendChild(box); document.body.appendChild(bg);
    bg.style.display = 'flex';
    function close() { bg.remove(); }
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    build(box, close);
    return bg;
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function rhex(n) { var a = new Uint8Array(n), s = ''; crypto.getRandomValues(a); for (var i = 0; i < n; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; }

  function changePassword() {
    var C = core(), me = C.getMe(), P = C.pass || { min: 8, max: 16 };
    modal(T.changePw, function (box, close) {
      function inp(ph) { var i = h('input'); i.type = 'password'; i.placeholder = ph; i.maxLength = P.max; i.autocomplete = 'off'; box.appendChild(i); return i; }
      var cur = inp(T.curPw), n1 = inp(T.newPw.replace('{min}', P.min).replace('{max}', P.max)), n2 = inp(T.newPw2);
      var msg = h('div', 'msg'); box.appendChild(msg);
      var b2 = h('div', 'b2'); var c = h('button', '', T.cancel); var s = h('button', 'p', T.save);
      c.type = s.type = 'button'; b2.appendChild(c); b2.appendChild(s); box.appendChild(b2);
      c.onclick = close;
      s.onclick = function () {
        msg.className = 'msg';
        if (n1.value.length < P.min || n1.value.length > P.max) { msg.textContent = T.pwLen.replace('{min}', P.min).replace('{max}', P.max); return; }
        if (n1.value !== n2.value) { msg.textContent = T.pwMismatch; return; }
        s.disabled = true;
        db.ref('chatAuth/' + me.uid).once('value').then(function (sn) {
          var a = sn.val();
          if (!a) throw new Error('none');
          return sha(a.s + ':' + cur.value).then(function (hh) {
            if (hh !== a.h) { msg.textContent = T.pwWrong; s.disabled = false; return; }
            var ns = rhex(12);
            return sha(ns + ':' + n1.value).then(function (nh) {
              return db.ref('chatAuth/' + me.uid).set({ h: nh, s: ns, u: a.u });
            }).then(function () { msg.className = 'msg ok'; msg.textContent = T.pwDone; setTimeout(close, 1200); });
          });
        }).catch(function () { msg.textContent = T.tryAgain; s.disabled = false; });
      };
    });
  }

  function renderSettings() {
    var C = core(), me = C && C.getMe();
    paneT.innerHTML = '';
    if (!me) { paneT.appendChild(h('div', 'sempty', T.loading)); return; }
    var p = h('div', 'setp'); var big = h('div', 'big'); setAv(big, me.photo);
    var t = h('div'); t.appendChild(h('b', '', me.cname || me.name)); t.appendChild(h('span', '', 'ID: ' + me.pid));
    p.appendChild(big); p.appendChild(t); paneT.appendChild(p);

    function row(icon, title, sub, fn) {
      var r = h('button', 'setr'); r.type = 'button';
      r.appendChild(h('span', 'ri', icon));
      var tx = h('span', 'rt', title); if (sub) tx.appendChild(h('small', '', sub)); r.appendChild(tx);
      r.addEventListener('click', fn); paneT.appendChild(r); return r;
    }
    var nr = row('🔔', T.notif, T.notifSub, function () { if (bell) bell.click(); });
    if (bell) { nr.appendChild(bell); bell.style.display = ''; bell.addEventListener('click', function (e) { e.stopPropagation(); }); bell.addEventListener('click', function () {}); }
    row('🔑', T.changePw, T.pwSub, changePassword);
    row('🔒', T.lockNow, T.lockSub, function () {
      try { sessionStorage.removeItem('mk_ok'); } catch (e) {}
      location.reload();
    });
    row('🎮', T.goGames, '', function () { location.href = 'index.html'; });
  }
})();
