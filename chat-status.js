// =====================================================================
// chat-status.js  -  New chat look (runs on chat.html only)
//  1) Top tab switch:  [GAMES] [CHAT]
//  2) Bottom bar:  Messages | Status | Settings
//  3) Chat list without boxes/lines (one continuous list)
//  4) Status: text / photo / video + music, like, views, reply, 2x hold, auto-remove
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
    CAP_MAX: 100,               // max characters in a photo/video caption
    REPLY_MAX: 75,              // max characters in status reply (chat message limit is 100)
    MAX_SEC: 30,                // MAX seconds for video and for music clip (only limit, no MB limit)
    TEXT_SEC: 30,                // seconds a text status stays on screen
    PHOTO_SEC: 30,               // seconds a photo status stays on screen
    PHOTO_SIDE: 1080,           // max photo width/height in pixels
    PHOTO_QUALITY: 0.8,         // photo quality 0.1 - 1 (higher = clearer, bigger)
    VIDEO_SIDE: 854,            // video is re-encoded to this max width/height (higher = sharper, bigger)
    VIDEO_BPS: 2600000,         // video bitrate when re-encoding (2.2 Mbps = about 8 MB for 30 sec). Lower = faster but blurrier
    SQUEEZE_MB: 5,              // videos bigger than this are re-encoded (made smaller) automatically
    RAW_MAX_MB: 20,             // only if re-encoding is not possible on the phone: biggest raw video allowed
    CHUNK: 150000,              // upload piece size (characters)
    SEG_SEC: 5,                 // status video is cut into pieces of this many seconds (first piece loads, plays, rest loads while watching)
    THUMB_SIDE: 200,            // small preview picture shown while a status loads (pixels)
    THUMB_Q: 0.55,              // preview picture quality 0.1 - 1
    TEXT_COLORS: ['#ffffff', '#facc15', '#22d3ee', '#4ade80', '#f472b6', '#fb923c', '#a78bfa', '#111827'],   // text status colours (A button)
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
    addStatus: 'Add status', tText: 'Text', tMusic: 'Music', recents: 'Recents',
    tCam: 'Camera', tPhotos: 'Photos', tVideos: 'Videos',
    typePh: 'Type a status', capPh: 'Add a caption...', typeOv: 'Text on status',
    maxReached: 'You can post up to {n} statuses at a time. Please delete an old one first.',
    postFail: 'Could not post status. Please check your Database Rules (statuses).',
    confirmDel: 'Delete this status?',
    justNow: 'Just now', minAgo: ' min ago', hrAgo: ' hr ago', dayAgo: ' day ago',
    viewedBy: 'Viewed by', noViews: 'No views yet', swipeUp: 'Swipe up for views',
    replyPh: 'Reply...', replyTag: '↩️ Status reply: ',
    prep: 'Preparing...', tooLong: 'Maximum {s} seconds allowed.',
    musicFail: 'Could not use this audio file.',
    tooHeavy: 'This video is too heavy for this phone. Please pick a smaller one.',
    notif: 'Notifications', notifSub: 'Alerts for new messages',
    changePw: 'Change password', pwSub: 'Your chat password',
    curPw: 'Current password', newPw: 'New password ({min}-{max} characters)', newPw2: 'Confirm new password',
    pwLen: 'New password must be {min} to {max} characters',
    pwMismatch: 'The new passwords do not match', pwWrong: 'Current password is incorrect',
    pwDone: 'Password changed successfully', tryAgain: 'Something went wrong. Please try again.',
    lockNow: 'Lock chat now', lockSub: 'Password will be required next time',
    goGames: 'Go to Games',
    changeName: 'Change username', nameSub: 'Your chat username',
    cancel: 'Cancel', save: 'Save'
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
    '.stv .bar i{display:block;height:100%;width:0;background:#fff;transition:none}',
    '.stv .who{display:flex;flex-direction:column;flex:1;min-width:0}.stv .who b{font-size:15px}.stv .who span{font-size:12px;opacity:.8}',
    '.stv .stage{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:1}',
    '.stv .stage .tx{font-size:28px;font-weight:700;color:#fff;text-align:center;padding:30px;word-break:break-word;white-space:pre-wrap}',
    '.stv .stage img,.stv .stage video{width:100%;height:100%;object-fit:contain}',
    '.stv .cap{position:absolute;left:0;right:0;bottom:0;padding:18px 16px 28px;text-align:center;color:#fff;font-size:16px;background:linear-gradient(transparent,rgba(0,0,0,.7));z-index:2}',
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
    '#lockView .lk-back{display:inline-block;color:#cfe3ff;text-decoration:none;font-weight:700;margin:0 auto 10px;max-width:480px}',
    /* viewer: gestures, chips, reply, views */
    '.stv .gz{position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}',
    '.stv .cap{pointer-events:none}',
    '.stv .pind{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:64px;color:#fff;opacity:.9;z-index:2;pointer-events:none;text-shadow:0 2px 8px #000}',
    '.stv .rchip{position:absolute;top:124px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;font-size:14px;font-weight:700;padding:6px 12px;border-radius:14px;z-index:3;pointer-events:none}',
    '.stv .mchip{position:absolute;top:84px;left:14px;max-width:60%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(0,0,0,.45);color:#fff;font-size:13px;padding:6px 12px;border-radius:14px;z-index:3;pointer-events:none}',
    '.ovt{position:absolute;left:20px;right:20px;top:50%;transform:translateY(-50%);text-align:center;color:#fff;font-size:24px;font-weight:700;background:rgba(0,0,0,.45);border-radius:12px;padding:10px 14px;z-index:2;pointer-events:none;word-break:break-word}',
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
    /* composer */
    '.vload{color:#fff;font-size:15px}',
    '.mchip2{align-self:flex-start;margin:0 12px;background:rgba(0,0,0,.45);color:#fff;padding:7px 12px;border-radius:16px;font-size:13px;cursor:pointer;z-index:3}',
    /* add status sheet */
    '.shw{position:fixed;inset:0;z-index:155;background:rgba(0,0,0,.55);display:flex;align-items:flex-end}',
    '.shs{width:100%;max-width:480px;margin:0 auto;background:#0f1b47;border-radius:24px 24px 0 0;padding:14px 16px 26px;border-top:2px solid #22d3ee}',
    '.shh{display:flex;align-items:center;gap:14px;color:#fff;font-size:20px;font-weight:700;margin-bottom:16px}',
    '.shh button{background:none;border:none;color:#fff;font-size:22px;cursor:pointer}',
    '.shr{display:flex;gap:22px;margin-bottom:14px}',
    '.shb{background:none;border:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;cursor:pointer}',
    '.shb .ic{width:64px;height:64px;border-radius:50%;background:#16245e;display:flex;align-items:center;justify-content:center;font-size:26px}',
    '.shl{color:#9fb0d9;font-size:15px;margin:6px 0 10px}',
    '.shg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.shg button{aspect-ratio:1;background:#16245e;border:none;border-radius:12px;color:#fff;font-size:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer}',
    '.shg button span{font-size:30px}',
    /* loader + thumbnail (no black screen while a status loads) */
    '@keyframes stspin{to{transform:rotate(360deg)}}',
    '.spin{width:48px;height:48px;border-radius:50%;border:5px solid rgba(255,255,255,.28);border-top-color:#fff;border-right-color:#22d3ee;box-shadow:0 0 16px rgba(34,211,238,.7);animation:stspin .8s linear infinite}',
    '.stv .stage>img,.stv .stage>video{position:absolute;left:0;top:0}',
    '.stv .stage img.thm{filter:blur(4px);z-index:1}',
    '.stv .stage video.sv{z-index:2}',
    '.stv .stage .spin{position:absolute;left:50%;top:50%;margin:-24px 0 0 -24px;z-index:3}',
    '.sendld{position:absolute;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;font-size:16px;font-weight:700;z-index:9}'
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
  var cache = { mine: null, contacts: null };
  var VC = null;                 // controls of the open viewer (hold / release)
  var seenKey = function () { var C = core(), m = C && C.getMe(); return 'st_seen_' + (m ? m.uid : ''); };

  function loadMine() {
    var C = core(), me = C && C.getMe();
    if (!me) return Promise.resolve([]);
    return db.ref('statuses/' + me.uid).once('value').then(function (s) {
      var v = s.val() || {}, now = nowS(), out = [];
      Object.keys(v).forEach(function (k) {
        var x = v[k];
        if (!x || !x.e) return;
        if (x.e <= now) {   // cleanup of expired ones (with their views, likes and media)
          db.ref('statuses/' + me.uid + '/' + k).remove().catch(function () {});
          db.ref('statusReacts/' + me.uid + '/' + k).remove().catch(function () {});
          db.ref('statusBlobs/' + me.uid + '/' + k).remove().catch(function () {});
          return;
        }
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

  /* ----- media (photo / video / music) stored in pieces: statusBlobs/uid/sid/c (media) and /m (music) ----- */
  var bcache = {};
  function getBlob(x, kind) {
    var key = x.id + kind;
    if (bcache[key]) return Promise.resolve(bcache[key]);
    var need = kind === 'c' ? x.nc : x.mn;
    return db.ref('statusBlobs/' + x.uid + '/' + x.id + '/' + kind).once('value').then(function (s) {
      var v = s.val() || {}, keys = Object.keys(v).map(Number).sort(function (a, b) { return a - b; });
      if (!keys.length || (need && keys.length !== need)) throw new Error('missing');
      var src = keys.map(function (k) { return v[k]; }).join('');
      if (src.indexOf('data:') !== 0) throw new Error('bad');
      bcache[key] = src; return src;
    });
  }
  // streaming video: the file is stored as plain base64 chunks (statusBlobs/uid/sid/c/<n>); every chunk decodes on its own
  var ccache = {};
  function getChunkBytes(x, j) {
    var key = x.id + 'k' + j;
    if (ccache[key]) return ccache[key];
    ccache[key] = db.ref('statusBlobs/' + x.uid + '/' + x.id + '/c/' + j).once('value').then(function (s) {
      var v = s.val();
      if (typeof v !== 'string') throw new Error('missing');
      var bin = atob(v), n = bin.length, bytes = new Uint8Array(n);
      for (var q = 0; q < n; q++) bytes[q] = bin.charCodeAt(q);
      return bytes;
    }).catch(function (e) { delete ccache[key]; throw e; });
    return ccache[key];
  }
  // phone cannot stream: download everything, then play (still works, just waits)
  function getStreamBlob(x) {
    var out = new Array(x.nc), next = 0;
    return new Promise(function (res, rej) {
      var fail = false, left = x.nc;
      function w() {
        if (fail || next >= x.nc) return;
        var k = next++;
        getChunkBytes(x, k).then(function (b) {
          out[k] = b; delete ccache[x.id + 'k' + k];
          if (--left === 0) res(new Blob(out, { type: (x.sm || 'video/webm').split(';')[0] })); else w();
        }).catch(function (e) { fail = true; rej(e); });
      }
      for (var z = 0; z < Math.min(4, x.nc); z++) w();
    });
  }
  // video pieces: statusBlobs/uid/sid/c/<chunk>; piece k uses x.sc[k] chunks, starting after the earlier pieces
  var scache = {};
  function getSeg(x, k) {
    var key = x.id + 's' + k;
    if (scache[key]) return scache[key];
    var start = 0, cnt = x.sc[k], i;
    for (i = 0; i < k; i++) start += x.sc[i];
    var base = 'statusBlobs/' + x.uid + '/' + x.id + '/c/';
    scache[key] = new Promise(function (res, rej) {
      var parts = new Array(cnt), next = 0, done = 0, fail = false, fin = false;
      function finish() {
        if (fin) return; fin = true;
        try {
          var all = parts.join(''), c = all.indexOf(';base64,');
          if (all.indexOf('data:') !== 0 || c < 0) throw new Error('bad');
          var mime = all.slice(5, c).split(';')[0] || 'video/webm';
          var bin = atob(all.slice(c + 8)), n = bin.length, bytes = new Uint8Array(n);
          for (var q = 0; q < n; q++) bytes[q] = bin.charCodeAt(q);
          res(new Blob([bytes], { type: mime }));
        } catch (e) { delete scache[key]; rej(e); }
      }
      function w() {
        if (fail) return;
        if (next >= cnt) { if (done >= cnt) finish(); return; }
        var j = next++;
        db.ref(base + (start + j)).once('value').then(function (s) {
          var v = s.val();
          if (typeof v !== 'string') throw new Error('missing');
          parts[j] = v; done++; w();
        }).catch(function (e) { fail = true; delete scache[key]; rej(e); });
      }
      for (var z = 0; z < Math.min(3, cnt); z++) w();
    });
    return scache[key];
  }
  function prefetch(x) {
    if (!x) return;
    if (x.ty === 'video' && x.sm) { for (var j = 0; j < Math.min(12, x.nc || 0); j++) getChunkBytes(x, j).catch(function () {}); }
    else if (x.ty === 'video' && x.sc) getSeg(x, 0).catch(function () {});
    else if ((x.ty === 'photo' || x.ty === 'video') && !x.im) getBlob(x, 'c').catch(function () {});
    if (x.mn) getBlob(x, 'm').catch(function () {});
  }
  function prefetchFirst(arr) {
    var seen = lsGet(seenKey());
    arr.slice(0, 6).forEach(function (c) {
      var f = c.list.filter(function (x) { return !seen[x.id]; })[0];
      if (f) prefetch(f);
    });
  }

  function renderStatus() {
    var C = core(), me = C && C.getMe();
    paneS.innerHTML = '';
    if (!me) return;
    var row = h('div', 'srow');
    var av = h('div', 'sav none'); var inner = h('div'); setAv(inner, me.photo); av.appendChild(inner);
    var g = h('div', 'grow'); g.appendChild(h('div', 'sn', T.myStatus)); var sub = h('div', 'ss', ''); g.appendChild(sub);
    var add = h('button', 'sadd', '+'); add.type = 'button';
    row.appendChild(av); row.appendChild(g); row.appendChild(add);
    paneS.appendChild(row);
    row.onclick = addMenu;
    add.addEventListener('click', function (e) { e.stopPropagation(); addMenu(); });

    paneS.appendChild(h('div', 'stitle', T.recent));
    var box = h('div'); paneS.appendChild(box);

    function paintMine(list) {
      myList = list;
      if (list.length) {
        av.className = 'sav'; sub.textContent = list.length + T.countSep + ago(list[list.length - 1].t);
        row.onclick = function () { openViewer({ name: T.myStatus, photo: me.photo, list: list, mine: true }); };
      } else {
        av.className = 'sav none'; sub.textContent = T.tapAdd; row.onclick = addMenu;
      }
    }
    function paintContacts(arr) {
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
    }
    // show the last known list at once (no "Loading..."), then refresh quietly
    if (cache.mine) paintMine(cache.mine);
    if (cache.contacts) paintContacts(cache.contacts);
    loadMine().then(function (l) { cache.mine = l; paintMine(l); });
    loadContacts().then(function (arr) { cache.contacts = arr; paintContacts(arr); prefetchFirst(arr); });
  }

  /* ----- helpers for creating a status ----- */
  var cmp = h('div', 'ov'); document.body.appendChild(cmp);
  var cmpUrl = null;     // preview link of a video being prepared (freed when the composer closes)
  function closeCmp() {
    cmp.style.display = 'none'; cmp.innerHTML = '';
    if (cmpUrl) { try { URL.revokeObjectURL(cmpUrl); } catch (e) {} cmpUrl = null; }
  }
  // bright loader with percent while a status is being posted
  function loaderOn() {
    var w = h('div', 'sendld'); w.appendChild(h('div', 'spin'));
    var t = h('div', '', '0%'); w.appendChild(t); cmp.appendChild(w);
    return { set: function (p) { t.textContent = p + '%'; }, off: function () { if (w.parentNode) w.parentNode.removeChild(w); } };
  }
  function busy(msg) {
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = '#0b1544';
    var b = h('div', 'cmp-body'), t = h('div', 'vload', msg); b.appendChild(t); cmp.appendChild(b);
    return function (m) { t.textContent = m; };
  }
  function pickFileThen(accept, capture, cb) {
    var f = document.createElement('input'); f.type = 'file'; f.accept = accept;
    if (capture) f.setAttribute('capture', 'environment');
    f.style.display = 'none'; document.body.appendChild(f);
    f.addEventListener('change', function () { var file = f.files[0]; f.remove(); if (file) cb(file); });
    f.click();
  }

  // Add status sheet (Text, Music, then phone gallery / camera)
  function addMenu() {
    if (myList.length >= CONFIG.STATUS_MAX) { alert(T.maxReached.replace('{n}', CONFIG.STATUS_MAX)); return; }
    var bg = h('div', 'shw'), sh = h('div', 'shs');
    function close() { bg.remove(); }
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    var hd = h('div', 'shh'); var x = h('button', '', '✕'); x.type = 'button'; x.onclick = close;
    hd.appendChild(x); hd.appendChild(h('span', '', T.addStatus)); sh.appendChild(hd);

    var row = h('div', 'shr');
    function big(icon, label, fn) {
      var b = h('button', 'shb'); b.type = 'button';
      b.appendChild(h('span', 'ic', icon)); b.appendChild(h('span', '', label)); b.onclick = fn; row.appendChild(b);
    }
    big('✏️', T.tText, function () { close(); composeText(null); });
    big('🎵', T.tMusic, function () {
      close();
      function local(cb) {
        pickFileThen('audio/*', false, function (file) {
          busy(T.prep);
          prepMusic(file).then(cb, function () { closeCmp(); alert(T.musicFail); });
        });
      }
      var done = function (m) { composeText(m); };
      if (window.StatusMusic) window.StatusMusic.choose({ local: local, done: done }); else local(done);
    });
    sh.appendChild(row);

    sh.appendChild(h('div', 'shl', T.recents));
    var grid = h('div', 'shg');
    function tile(icon, label, accept, cap) {
      var b = h('button'); b.type = 'button';
      b.appendChild(h('span', '', icon)); b.appendChild(document.createTextNode(label));
      b.onclick = function () { close(); pickFileThen(accept, cap, handleFile); };
      grid.appendChild(b);
    }
    tile('📷', T.tCam, 'image/*,video/*', true);
    tile('🖼️', T.tPhotos, 'image/*', false);
    tile('🎥', T.tVideos, 'video/*', false);
    sh.appendChild(grid);
    bg.appendChild(sh); document.body.appendChild(bg);
  }

  function handleFile(file) {
    if (file.type.indexOf('image/') === 0) preparePhoto(file);
    else if (file.type.indexOf('video/') === 0) prepareVideo(file);
  }

  /* ----- publish (media and music go in pieces, then the small status record) ----- */
  // media = one data-URL string (photo / old-style video)  OR  { segs:[dataURL...], sd } (video in 5-second pieces)
  // music = { url, sec, name } (online song, only the link is saved)  OR  { data, sec, name } (file from phone)
  function publishStatus(o, media, music, onProg) {
    var C = core(), me = C.getMe();
    var ref = db.ref('statuses/' + me.uid).push(), sid = ref.key;
    var jobs = [], total = 0, done = 0;
    function up(kind, data, from) {
      var n = Math.ceil(data.length / CONFIG.CHUNK); total += n;
      for (var i = 0; i < n; i++) {
        (function (i) {
          jobs.push(db.ref('statusBlobs/' + me.uid + '/' + sid + '/' + kind + '/' + (from + i))
            .set(data.substr(i * CONFIG.CHUNK, CONFIG.CHUNK))
            .then(function () { done++; if (onProg) onProg(Math.round(done * 100 / total)); }));
        })(i);
      }
      return n;
    }
    if (media && typeof media === 'object' && media.b64) {
      o.nc = up('c', media.b64, 0); o.sm = media.sm;
    } else if (media && typeof media === 'object') {
      var cnt = [], at = 0;
      media.segs.forEach(function (sg) { var n = up('c', sg, at); cnt.push(n); at += n; });
      o.sc = cnt; o.nc = at; o.sd = media.sd;
    } else if (media) o.nc = up('c', media, 0);
    if (music && music.url) { o.mu = music.url; o.md = music.sec; o.mnm = music.name; }
    else if (music) { o.mn = up('m', music.data, 0); o.md = music.sec; o.mnm = music.name; }
    o.t = TS; o.e = nowS() + Math.min(24, CONFIG.STATUS_HOURS) * 3600000;
    return Promise.all(jobs).then(function () { return ref.set(o); }).catch(function (err) {
      db.ref('statusBlobs/' + me.uid + '/' + sid).remove().catch(function () {});
      throw err;
    });
  }

  /* ----- music: any audio file -> first MAX_SEC seconds, small mono WAV ----- */
  function wavUrl(ch, rate) {
    var n = ch.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), i;
    function w(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    for (i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, ch[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    var bytes = new Uint8Array(b), bin = '';
    for (i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function prepMusic(file) {
    return new Promise(function (res, rej) {
      var AC = window.AudioContext || window.webkitAudioContext;
      var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AC || !OC) { rej(new Error('noaudio')); return; }
      var rd = new FileReader();
      rd.onerror = rej;
      rd.onload = function () {
        var ac = new AC();
        ac.decodeAudioData(rd.result, function (buf) {
          try { ac.close(); } catch (e) {}
          var sec = Math.max(1, Math.min(CONFIG.MAX_SEC, Math.floor(buf.duration)));
          var RATE = 22050, oc = new OC(1, sec * RATE, RATE), src = oc.createBufferSource();
          src.buffer = buf; src.connect(oc.destination); src.start(0);
          oc.startRendering().then(function (out) {
            res({ data: wavUrl(out.getChannelData(0), RATE), sec: sec, name: (file.name || 'Music').replace(/\.[^.]+$/, '').slice(0, 40) });
          }, rej);
        }, rej);
      };
      rd.readAsArrayBuffer(file);
    });
  }
  // music button + small chip (tap chip to remove). Search online or pick from phone.
  function musicBox(btn) {
    var m = null, chip = h('div', 'mchip2'); chip.style.display = 'none';
    function paint() { chip.style.display = m ? '' : 'none'; chip.textContent = m ? '🎵 ' + m.name + '  ✕' : ''; }
    chip.onclick = function () { m = null; paint(); };
    btn.onclick = function () {
      function local(cb) {
        pickFileThen('audio/*', false, function (file) {
          var old = btn.textContent; btn.disabled = true; btn.textContent = '⏳';
          prepMusic(file).then(cb, function () { alert(T.musicFail); })
            .then(function () { btn.disabled = false; btn.textContent = old; });
        });
      }
      var done = function (r) { m = r; paint(); };
      if (window.StatusMusic) window.StatusMusic.choose({ local: local, done: done }); else local(done);
    };
    return { chip: chip, get: function () { return m; }, set: function (v) { m = v; paint(); } };
  }

  /* ----- text status ----- */
  function composeText(pre) {
    var bg = Math.floor(Math.random() * CONFIG.BG.length), tci = 0, TC = CONFIG.TEXT_COLORS;
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = grad(bg);
    var top = h('div', 'top');
    var x = h('button', '', '✕'); x.type = 'button'; x.onclick = closeCmp;
    var sp = h('div', 'sp'); var cnt = h('span', 'cnt', '0/' + CONFIG.TEXT_MAX);
    var bm = h('button', '', '🎵'); bm.type = 'button';
    var tcb = h('button', '', 'A'); tcb.type = 'button'; tcb.style.fontWeight = '800';
    var pal = h('button', '', '🎨'); pal.type = 'button';
    top.appendChild(x); top.appendChild(sp); top.appendChild(cnt); top.appendChild(bm); top.appendChild(tcb); top.appendChild(pal);
    var mb = musicBox(bm); if (pre) mb.set(pre);
    var body = h('div', 'cmp-body'); var ta = h('textarea'); ta.placeholder = T.typePh; ta.maxLength = CONFIG.TEXT_MAX; body.appendChild(ta);
    var bot = h('div', 'cmp-bot'); var s2 = h('div', 'sp'); s2.style.flex = '1';
    var send = h('button', '', '➤'); send.type = 'button'; bot.appendChild(s2); bot.appendChild(send);
    cmp.appendChild(top); cmp.appendChild(mb.chip); cmp.appendChild(body); cmp.appendChild(bot);
    ta.oninput = function () { cnt.textContent = ta.value.length + '/' + CONFIG.TEXT_MAX; };
    pal.onclick = function () { bg = (bg + 1) % CONFIG.BG.length; cmp.style.background = grad(bg); };
    tcb.onclick = function () { tci = (tci + 1) % TC.length; ta.style.color = TC[tci]; tcb.style.color = TC[tci]; };
    send.onclick = function () {
      var t = ta.value.trim(); if (!t && !mb.get()) return;
      send.disabled = true;
      var o = { ty: 'text', bg: bg };
      if (tci) o.tc = TC[tci];
      if (t) o.tx = t.slice(0, CONFIG.TEXT_MAX);
      var ld = loaderOn();
      publishStatus(o, null, mb.get(), function (p) { ld.set(p); })
        .then(function () { ld.off(); cache.mine = null; closeCmp(); renderStatus(); })
        .catch(function () { ld.off(); send.disabled = false; alert(T.postFail); });
    };
    setTimeout(function () { ta.focus(); }, 100);
  }

  /* ----- photo / video: choose, prepare, then composer with Music and Text at top right ----- */
  function preparePhoto(file) {
    var rd = new FileReader();
    rd.onload = function (e) {
      var im = new Image();
      im.onload = function () {
        var sc = Math.min(1, CONFIG.PHOTO_SIDE / Math.max(im.width, im.height));
        var cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        var th = window.StatusStream ? window.StatusStream.thumbOfImage(cv, CONFIG.THUMB_SIDE, CONFIG.THUMB_Q) : '';
        composeMedia('photo', cv.toDataURL('image/jpeg', CONFIG.PHOTO_QUALITY), 0, { th: th });
      };
      im.src = e.target.result;
    };
    rd.readAsDataURL(file);
  }
  function prepareVideo(file) {
    var url = URL.createObjectURL(file), v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = function () {
      var d = isFinite(v.duration) ? Math.round(v.duration) : 0;
      if (!d) { URL.revokeObjectURL(url); alert(T.tryAgain); return; }
      if (v.duration > CONFIG.MAX_SEC + 0.5) { URL.revokeObjectURL(url); alert(T.tooLong.replace('{s}', CONFIG.MAX_SEC)); return; }
      var upd = busy(T.prep), SS = window.StatusStream;
      // fallback (phone cannot re-record): whole video as one piece
      function raw() {
        if (file.size > CONFIG.RAW_MAX_MB * 1048576) { URL.revokeObjectURL(url); closeCmp(); alert(T.tooHeavy); return; }
        (SS ? SS.thumbOfVideo(url, CONFIG.THUMB_SIDE, CONFIG.THUMB_Q) : Promise.resolve('')).then(function (th) {
          var rd = new FileReader();
          rd.onload = function (e) { URL.revokeObjectURL(url); composeMedia('video', e.target.result, d, { th: th }); };
          rd.readAsDataURL(file);
        });
      }
      if (SS && window.MediaRecorder) {
        SS.encode(url, d, { side: CONFIG.VIDEO_SIDE, bps: CONFIG.VIDEO_BPS, seg: CONFIG.SEG_SEC, thumbSide: CONFIG.THUMB_SIDE, thumbQ: CONFIG.THUMB_Q },
          function (p) { upd(T.prep + ' ' + p + '%'); })
          .then(function (r) { cmpUrl = url; composeMedia('video', null, d, { b64: r.b64, sm: r.mime, th: r.th, preview: url }); }, raw);
      } else raw();
    };
    v.onerror = function () { URL.revokeObjectURL(url); alert(T.tryAgain); };
    v.src = url;
  }
  // ex = { th: thumbnail, segs: video pieces, preview: link to show the video here }
  function composeMedia(kind, data, d, ex) {
    ex = ex || {};
    var S = { ov: '', oc: '#ffffff', ob: 'rgba(0,0,0,.45)', ox: 50, oy: 50 };   // text on the status
    cmp.innerHTML = ''; cmp.style.display = 'flex'; cmp.style.background = '#000';
    var top = h('div', 'top');
    var x = h('button', '', '✕'); x.type = 'button'; x.onclick = closeCmp;
    var bm = h('button', '', '🎵'); bm.type = 'button';
    var bt = h('button', '', 'Aa'); bt.type = 'button';
    top.appendChild(x); top.appendChild(h('div', 'sp')); top.appendChild(bm); top.appendChild(bt);
    var mb = musicBox(bm);
    var body = h('div', 'cmp-body'); body.style.position = 'relative';
    var el;
    if (kind === 'video') { el = h('video'); el.src = ex.preview || data; el.controls = true; el.setAttribute('playsinline', ''); }
    else { el = h('img'); el.src = data; }
    el.style.cssText = 'max-width:100%;max-height:70vh;border-radius:10px';
    body.appendChild(el);
    var ovEl = h('div', 'ovt'); ovEl.style.display = 'none';
    var bot = h('div', 'cmp-bot'); var cap = h('input'); cap.placeholder = T.capPh; cap.maxLength = CONFIG.CAP_MAX;
    var send = h('button', '', '➤'); send.type = 'button'; bot.appendChild(cap); bot.appendChild(send);
    cmp.appendChild(top); cmp.appendChild(mb.chip); cmp.appendChild(body); cmp.appendChild(bot); cmp.appendChild(ovEl);
    if (window.StatusText) window.StatusText.drag(ovEl, S, cmp);      // drag the text anywhere
    function paintOv() {
      ovEl.textContent = S.ov; ovEl.style.display = S.ov ? '' : 'none';
      if (window.StatusText) window.StatusText.style(ovEl, S);
    }
    bt.onclick = function () {
      if (window.StatusText) { window.StatusText.edit(S, paintOv); return; }
      modal(T.typeOv, function (box, close) {
        var i = h('input'); i.maxLength = 80; i.value = S.ov; i.placeholder = T.typePh; box.appendChild(i);
        var b2 = h('div', 'b2'), c = h('button', '', T.cancel), s = h('button', 'p', T.save);
        c.type = s.type = 'button'; b2.appendChild(c); b2.appendChild(s); box.appendChild(b2);
        c.onclick = close;
        s.onclick = function () { S.ov = i.value.trim().slice(0, 80); paintOv(); close(); };
        setTimeout(function () { i.focus(); }, 100);
      });
    };
    send.onclick = function () {
      send.disabled = true; cap.disabled = true;
      var o = { ty: kind };
      if (kind === 'video') o.d = d;
      if (ex.th) o.th = ex.th;
      if (S.ov) { o.ov = S.ov; o.oc = S.oc; o.ob = S.ob; o.ox = Math.round(S.ox); o.oy = Math.round(S.oy); }
      if (cap.value.trim()) o.cp = cap.value.trim().slice(0, CONFIG.CAP_MAX);
      var media = ex.b64 ? { b64: ex.b64, sm: ex.sm } : (ex.segs ? { segs: ex.segs, sd: CONFIG.SEG_SEC } : data);
      var ld = loaderOn();
      publishStatus(o, media, mb.get(), function (p) { ld.set(p); })
        .then(function () { ld.off(); cache.mine = null; closeCmp(); renderStatus(); })
        .catch(function () { ld.off(); send.disabled = false; cap.disabled = false; alert(T.postFail); });
    };
  }

  /* ----- view status (full screen: tap = pause, hold = 2x, swipe left/right = next/back, swipe up = views) ----- */
  var stv = h('div', 'ov stv'); document.body.appendChild(stv);
  var vt = null, curCleanup = null;
  function stopT() { if (vt) { clearInterval(vt); vt = null; } }
  function closeViewer() {
    stopT();
    if (curCleanup) { curCleanup(); curCleanup = null; }
    stv.style.display = 'none'; stv.innerHTML = ''; scache = {}; ccache = {};
    if (paneS.style.display !== 'none') renderStatus();
  }
  function openViewer(who) {
    var list = who.list, seen = lsGet(seenKey()), idx = 0, me0 = core().getMe();
    for (var i = 0; i < list.length; i++) { if (!seen[list[i].id]) { idx = i; break; } }
    stv.style.display = 'flex';
    var userPause = false, ext = 0, rate = 1, ready = false, elapsed = 0, dur = 5, token = 0;
    var vidEl = null, audEl = null;

    function paused() { return userPause || ext > 0; }
    function play(el) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    function sync() {
      if (vidEl) { vidEl.rate(rate); if (!ready || paused()) vidEl.pause(); else play(vidEl); }
      if (audEl) { audEl.playbackRate = rate; if (!ready || paused()) audEl.pause(); else play(audEl); }
      var pi = stv.querySelector('.pind'); if (pi) pi.style.display = userPause ? '' : 'none';
      var rc = stv.querySelector('.rchip'); if (rc) rc.style.display = rate > 1 ? '' : 'none';
    }
    function dropMedia() {
      if (vidEl) { try { vidEl.destroy(); } catch (e) {} vidEl = null; }
      if (audEl) { try { audEl.pause(); } catch (e) {} audEl = null; }
    }
    VC = { hold: function () { ext++; sync(); }, release: function () { ext = Math.max(0, ext - 1); sync(); } };
    curCleanup = function () { token++; dropMedia(); VC = null; };

    function draw() {
      stopT(); dropMedia();
      if (idx >= list.length) { closeViewer(); return; }
      if (idx < 0) idx = 0;
      var my = ++token, x = list[idx], heart = null;
      userPause = false; ext = 0; rate = 1; ready = false; elapsed = 0;
      seen[x.id] = 1; lsSet(seenKey(), seen);

      // tell the owner I viewed it
      if (!who.mine) {
        var rr = db.ref('statusReacts/' + x.uid + '/' + x.id + '/' + me0.uid);
        rr.once('value').then(function (sn) {
          if (!sn.exists()) rr.set({ n: (me0.cname || me0.name || 'Player').slice(0, 30), t: TS }).catch(function () {});
          if (heart && sn.val() && sn.val().l) heart.textContent = '❤️';
        }).catch(function () {});
      }

      var base = x.ty === 'video' ? Math.max(1, x.d || 10) : (x.ty === 'photo' ? CONFIG.PHOTO_SEC : CONFIG.TEXT_SEC);
      if (x.mn && x.ty !== 'video') base = Math.max(base, Math.min(CONFIG.MAX_SEC, x.md || base));
      dur = base;

      stv.innerHTML = '';
      stv.style.background = x.ty === 'text' ? grad(x.bg || 0) : '#000';
      var bars = h('div', 'bars');
      list.forEach(function (_, k) { var b = h('div', 'bar'), f = h('i'); if (k < idx) f.style.width = '100%'; b.appendChild(f); bars.appendChild(b); });
      var top = h('div', 'top');
      var a = h('div', 'avatar'); a.style.cssText = 'width:38px;height:38px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;overflow:hidden'; setAv(a, who.photo);
      var wh = h('div', 'who'); wh.appendChild(h('b', '', who.name)); wh.appendChild(h('span', '', ago(x.t)));
      top.appendChild(a); top.appendChild(wh);
      if (who.mine) {
        var del = h('button', '', '🗑'); del.type = 'button';
        del.onclick = function (e) {
          e.stopPropagation();
          if (!confirm(T.confirmDel)) return;
          db.ref('statuses/' + x.uid + '/' + x.id).remove().catch(function () {});
          db.ref('statusReacts/' + x.uid + '/' + x.id).remove().catch(function () {});
          db.ref('statusBlobs/' + x.uid + '/' + x.id).remove().catch(function () {});
          list.splice(idx, 1); myList = list; cache.mine = null; draw();
        };
        top.appendChild(del);
      }
      var cl = h('button', '', '✕'); cl.type = 'button'; cl.onclick = closeViewer; top.appendChild(cl);
      var stage = h('div', 'stage');
      stv.appendChild(bars); stv.appendChild(top); stv.appendChild(stage);
      if ((x.mn || x.mu) && x.mnm) stv.appendChild(h('div', 'mchip', '🎵 ' + x.mnm));
      if (x.ov && x.ty !== 'text') { var ot = h('div', 'ovt', x.ov); if (window.StatusText) window.StatusText.style(ot, x); stv.appendChild(ot); }
      if ((x.ty === 'photo' || x.ty === 'video') && x.cp) stv.appendChild(h('div', 'cap', x.cp));
      var pind = h('div', 'pind', '⏸'); pind.style.display = 'none'; stv.appendChild(pind);
      var rchip = h('div', 'rchip', '2x ▶▶'); rchip.style.display = 'none'; stv.appendChild(rchip);

      // touch layer: tap = pause/play, hold = 2x, swipe = next/back, swipe up (own status) = views
      var gz = h('div', 'gz'); stv.appendChild(gz);
      var sx = 0, sy = 0, moved = false, holdT = null, holding = false;
      gz.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      gz.addEventListener('pointerdown', function (e) {
        sx = e.clientX; sy = e.clientY; moved = false; holding = false; clearTimeout(holdT);
        holdT = setTimeout(function () { if (!moved) { holding = true; rate = 2; sync(); } }, 280);
      });
      gz.addEventListener('pointermove', function (e) {
        if (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12) {
          moved = true; clearTimeout(holdT);
          if (holding) { holding = false; rate = 1; sync(); }
        }
      });
      function endP(e, cancelled) {
        clearTimeout(holdT);
        if (holding) { holding = false; rate = 1; sync(); return; }
        if (cancelled) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved) { userPause = !userPause; sync(); return; }
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -60) { idx++; draw(); } else if (dx > 60) { idx--; draw(); }
        } else if (dy < -60 && who.mine) openViews(x);
      }
      gz.addEventListener('pointerup', function (e) { endP(e, false); });
      gz.addEventListener('pointercancel', function (e) { endP(e, true); });

      var capEl = stv.querySelector('.cap'); if (capEl) capEl.style.bottom = '64px';
      if (!who.mine) {
        var rb = h('div', 'rbar');
        var rin = h('input'); rin.placeholder = T.replyPh; rin.maxLength = CONFIG.REPLY_MAX;
        heart = h('button', '', '🤍'); heart.type = 'button';
        var rsend = h('button', 'rsd', '➤'); rsend.type = 'button';
        rb.appendChild(rin); rb.appendChild(heart); rb.appendChild(rsend); stv.appendChild(rb);
        var nm = (me0.cname || me0.name || 'Player').slice(0, 30);
        rin.onfocus = function () { if (VC) VC.hold(); };
        rin.onblur = function () { if (VC) VC.release(); };
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
        vb.onclick = function (e) { e.stopPropagation(); openViews(x); };
      }

      var tc = 0;
      function tick() {
        if (my !== token) { stopT(); return; }
        // phone sometimes refuses to start the song the first time: try again every half second
        if (audEl && ready && ++tc % 10 === 0 && !paused() && audEl.paused) play(audEl);
        var frac;
        if (vidEl) frac = Math.min(1, vidEl.time() / (x.d || vidEl.dur() || 1));
        else { if (!paused()) elapsed += 0.05 * rate; frac = Math.min(1, elapsed / dur); }
        var bi = bars.children[idx] && bars.children[idx].firstChild;
        if (bi) bi.style.width = (frac * 100) + '%';
        if (!vidEl && frac >= 1) { stopT(); idx++; draw(); }
      }

      // media: thumbnail + bright loader come at once (never a black screen); the real media replaces them as it arrives.
      // Video plays after its first 5-second piece, the rest keeps loading in the background while you watch.
      var hasMus = !!(x.mu || x.mn), thumb = null, spin = h('div', 'spin');
      if (x.ty !== 'text') {
        var ts = x.th ? safeSrc(x.th) : '';
        if (ts) { thumb = h('img', 'thm'); thumb.src = ts; stage.appendChild(thumb); }
        stage.appendChild(spin);
      }
      function clearWait() { if (thumb && thumb.parentNode) thumb.parentNode.removeChild(thumb); thumb = null; spin.style.display = 'none'; }
      function startPlay() { if (my !== token) return; ready = true; sync(); prefetch(list[idx + 1]); stopT(); vt = setInterval(tick, 50); }
      function skip() { if (my !== token) return; setTimeout(function () { if (my === token) { idx++; draw(); } }, 700); }

      // music: an online song streams from its link at once; a file song comes in pieces
      if (x.mu && /^https:\/\/[a-z0-9.-]+\.(mzstatic|apple)\.com\//i.test(x.mu)) {
        var au = new Audio(); au.loop = true; au.preload = 'auto'; au.src = x.mu; audEl = au;
      } else if (x.mn) {
        getBlob(x, 'm').then(function (m) { if (my !== token) return; var a2 = new Audio(m); a2.loop = true; audEl = a2; sync(); }).catch(function () {});
      }

      // plain video from a finished download (old statuses, or phones that cannot stream)
      function playBlob(p) {
        p.then(function (src) {
          if (my !== token) return;
          var vd = h('video'); vd.setAttribute('playsinline', ''); vd.muted = hasMus; vd.preload = 'auto';
          var go = false;
          vd.onloadedmetadata = function () { if (vd.videoHeight / vd.videoWidth >= 1.6) vd.style.objectFit = 'cover'; };
          vd.oncanplay = function () { if (go || my !== token) return; go = true; clearWait(); startPlay(); };
          vd.onended = function () { if (my === token) { idx++; draw(); } };
          vd.onerror = skip;
          vd.src = src; stage.appendChild(vd);
          vidEl = {
            play: function () { return vd.play(); }, pause: function () { vd.pause(); },
            rate: function (r) { vd.playbackRate = r; }, time: function () { return vd.currentTime; },
            dur: function () { return vd.duration; },
            destroy: function () { try { vd.pause(); vd.removeAttribute('src'); vd.load(); if (/^blob:/.test(src)) URL.revokeObjectURL(src); } catch (e) {} }
          };
        }).catch(skip);
      }

      if (x.ty === 'text') {
        var tx = x.tx || (x.mnm ? '🎵 ' + x.mnm : '');
        var txe = h('div', 'tx', tx); if (x.tc) txe.style.color = x.tc;
        stage.appendChild(txe);
        startPlay();
      } else if (x.ty === 'photo') {
        (x.im ? Promise.resolve(safeSrc(x.im)) : getBlob(x, 'c')).then(function (src) {
          if (my !== token) return;
          var im = h('img');
          im.onload = function () {
            if (my !== token) return;
            if (im.naturalHeight / im.naturalWidth >= 1.6) im.style.objectFit = 'cover';
            stage.appendChild(im); clearWait(); startPlay();
          };
          im.onerror = skip;
          im.src = src;
        }).catch(skip);
      } else if (x.sm && window.StatusStream && window.StatusStream.canStream(x.sm)) {
        // true streaming: one video, data is fed into it while it plays (starts after ~5 seconds, loads on in the background)
        var started = false;
        var mp = window.StatusStream.createMsePlayer({
          stage: stage, mime: x.sm, n: x.nc, dur: x.d, ahead: 5, muted: hasMus,
          getChunk: function (j) { return getChunkBytes(x, j); },
          onFirst: function () { if (my !== token) return; started = true; clearWait(); startPlay(); },
          onEnd: function () { if (my === token) { idx++; draw(); } },
          onStall: function (b) { if (my === token && ready) spin.style.display = b ? '' : 'none'; },
          onError: function () {
            if (my !== token) return;
            if (started) { skip(); return; }
            mp.destroy(); vidEl = null;                     // could not stream: download fully, then play
            playBlob(getStreamBlob(x).then(function (b) { return URL.createObjectURL(b); }));
          }
        });
        vidEl = mp; mp.start();
      } else if (x.sm) {
        playBlob(getStreamBlob(x).then(function (b) { return URL.createObjectURL(b); }));
      } else if (x.sc && window.StatusStream) {
        var pl = window.StatusStream.createPlayer({
          stage: stage, n: x.sc.length, sd: x.sd || CONFIG.SEG_SEC, muted: hasMus,
          getSeg: function (k) { return getSeg(x, k); },
          onFirst: function () { if (my !== token) return; clearWait(); startPlay(); },
          onEnd: function () { if (my === token) { idx++; draw(); } },
          onStall: function (b) { if (my === token && ready) spin.style.display = b ? '' : 'none'; },
          onError: skip
        });
        vidEl = pl; pl.start();
      } else {
        playBlob(getBlob(x, 'c'));
      }
    }
    draw();
  }

  // who viewed / who liked (own status only)
  function openViews(x) {
    if (VC) VC.hold();
    var pan = h('div', 'vpan'), hd = h('div', 'vhd');
    var ttl = h('b', '', T.viewedBy), cx = h('button', '', '✕'); cx.type = 'button';
    hd.appendChild(ttl); hd.appendChild(cx); pan.appendChild(hd);
    var lst = h('div', 'vlist'); pan.appendChild(lst);
    stv.appendChild(pan);
    cx.onclick = function () { pan.remove(); if (VC) VC.release(); };
    var inbox = core().getInbox();
    db.ref('statusReacts/' + x.uid + '/' + x.id).once('value').then(function (sn) {
      var v = sn.val() || {};
      var arr = Object.keys(v).map(function (k) { var r = v[k]; r.uid = k; return r; });
      arr.sort(function (a, b) { return b.t - a.t; });
      ttl.textContent = T.viewedBy + ' ' + arr.length + '  •  ❤️ ' + arr.filter(function (r) { return r.l; }).length;
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
    }).catch(function () { lst.appendChild(h('div', 'sempty', T.tryAgain)); });
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
    if (!me) return;
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
    row('✏️', T.changeName, T.nameSub, function () { if (window.ChatUsername) window.ChatUsername.open(renderSettings); });
    row('🔒', T.lockNow, T.lockSub, function () {
      try { sessionStorage.removeItem('mk_ok'); } catch (e) {}
      location.reload();
    });
    row('🎮', T.goGames, '', function () { location.href = 'index.html'; });
  }
})();
