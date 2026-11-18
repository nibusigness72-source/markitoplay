// =====================================================================
// chat-suggest.js  -  Username suggestions in the chat search box
//  * Tap the search box  -> the pinned username (PINNED below) shows on top
//  * Type letters        -> search runs from the FIRST letter on every letter (like Instagram);
//                           usernames that START with those letters appear below
//  * Tap a name          -> that chat opens (same as searching it)
//  * Full ID / username search still works exactly as before
// Needs: Firebase Rules change for "chatNames" (see rules snippet).
// Add in chat.html AFTER chat.js / chat-status.js:  <script src="chat-suggest.js"></script>
// =====================================================================
(function () {
  'use strict';
  var form = document.getElementById('searchForm');
  var input = document.getElementById('uidInput');
  if (!form || !input || !window.firebase || !firebase.database) return;

  /* =================== CONFIG - change values here =================== */
  var CONFIG = {
    PINNED: 'sonyyadav',   // this name is shown on top for everyone (leave '' to turn off)
    MAX: 10,               // max suggestions below the pinned name (Rules allow up to 10)
    DELAY_MS: 0,           // wait (milliseconds) after each letter before searching. 0 = search on every letter
    CACHE_SEC: 30,         // remember results of the same letters for this many seconds (faster, fewer reads)
    OPEN_WAIT_MS: 5000     // how long to wait for the chat card after tapping a name
  };

  /* =================== TEXT - change any wording here =================== */
  var T = {
    pinned: 'Suggested',
    others: 'Matching usernames',
    none: 'No username starts with these letters.',
    loading: 'Searching...',
    fail: 'Could not load suggestions.'
  };

  var db = firebase.database();
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  function myName() {
    var C = window.ChatCore, m = C && C.getMe && C.getMe();
    return (m && m.cname) ? String(m.cname).toLowerCase() : '';
  }

  /* ---------------- CSS ---------------- */
  var st = h('style');
  st.textContent = [
    '.sg-box{display:none;margin-top:4px}',
    '.sg-t{display:none}',
    '.sg-row{display:flex;align-items:center;gap:14px;padding:11px 4px;cursor:pointer;color:#fff;background:transparent;border:none}',
    '.sg-row:active{background:rgba(255,255,255,.07)}',
    '.sg-av{width:54px;height:54px;border-radius:50%;background:#1e3a8a;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;flex-shrink:0}',
    '.sg-nm{font-size:17px;font-weight:600}',
    '.sg-nm b{font-weight:700}',
    '.sg-star{display:none}',
    '.sg-msg{font-size:14px;color:#9fb0d9;padding:10px 4px}'
  ].join('\n');
  document.head.appendChild(st);

  var box = h('div', 'sg-box');
  form.parentNode.insertBefore(box, form.nextSibling);

  /* ---------------- helpers ---------------- */
  function show() {
    // chat-status.js moves the search form into its own pane, so keep the list right under the form
    if (box.previousSibling !== form) form.parentNode.insertBefore(box, form.nextSibling);
    box.style.display = 'block';
  }
  function hide() { box.style.display = 'none'; box.innerHTML = ''; }

  function row(name, typed, pin) {
    var r = h('div', 'sg-row' + (pin ? ' pin' : ''));
    r.appendChild(h('div', 'sg-av', name.charAt(0).toUpperCase()));
    var nm = h('div', 'sg-nm');
    if (typed && name.indexOf(typed) === 0) {
      nm.appendChild(h('b', '', name.slice(0, typed.length)));
      nm.appendChild(document.createTextNode(name.slice(typed.length)));
    } else nm.textContent = name;
    r.appendChild(nm);
    if (pin) r.appendChild(h('span', 'sg-star', '★'));
    // pointerdown + preventDefault keeps the keyboard/input from closing the list first
    r.addEventListener('mousedown', function (e) { e.preventDefault(); });
    r.addEventListener('click', function () { openName(name); });
    return r;
  }

  // Same as typing the full username and tapping the found card
  function openName(name) {
    hide();
    input.value = name;
    input.blur();
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    var t0 = Date.now();
    (function wait() {
      var card = document.querySelector('#resultBox .user-card');
      if (card) { card.click(); return; }
      if (Date.now() - t0 < CONFIG.OPEN_WAIT_MS) setTimeout(wait, 150);
    })();
  }

  var pinnedOk = null;   // null = not checked yet, true / false afterwards
  function checkPinned() {
    if (!CONFIG.PINNED) return Promise.resolve(false);
    if (pinnedOk !== null) return Promise.resolve(pinnedOk);
    return db.ref('chatNames/' + CONFIG.PINNED).once('value').then(function (s) {
      pinnedOk = s.exists(); return pinnedOk;
    }).catch(function () { return false; });
  }

  var seq = 0, timer = null;
  var cache = {};                      // typed letters -> { t: time, names: [...] }

  function draw(typed, me, pinShown, list) {
    box.innerHTML = '';
    if (pinShown) {
      box.appendChild(h('div', 'sg-t', T.pinned));
      box.appendChild(row(CONFIG.PINNED, typed, true));
    }
    var names = list.filter(function (k) { return k !== me && k !== CONFIG.PINNED; }).slice(0, CONFIG.MAX);
    if (names.length) {
      box.appendChild(h('div', 'sg-t', T.others));
      names.forEach(function (n) { box.appendChild(row(n, typed, false)); });
    } else if (typed && !pinShown) {
      box.appendChild(h('div', 'sg-msg', T.none));
    }
    if (box.childNodes.length) show(); else hide();
  }

  function update() {
    var typed = input.value.trim().toLowerCase();
    var me = myName(), my = ++seq, now = Date.now();

    // IDs (digits only) are not usernames: nothing to suggest
    if (/^[0-9]+$/.test(typed)) { hide(); return; }

      var pinMatch = !!CONFIG.PINNED && (!typed || CONFIG.PINNED.indexOf(typed) === 0);
    var pinKnown = pinMatch;

    if (!typed) {                       // empty box: only the pinned name, shown at once
      draw('', me, pinMatch, []);
      return;
    }

    // 1) instant: same letters seen before, or filter the shorter search we already have
    var hit = cache[typed], quick = null;
    if (hit && now - hit.t < CONFIG.CACHE_SEC * 1000) {
      draw(typed, me, pinKnown, hit.names);
      return;                           // fresh enough, no new request needed
    }
    for (var n = typed.length - 1; n >= 1 && !quick; n--) {
      var c = cache[typed.slice(0, n)];
      if (c && now - c.t < CONFIG.CACHE_SEC * 1000) {
        quick = c.names.filter(function (k) { return k.indexOf(typed) === 0; });
      }
    }
    if (quick) draw(typed, me, pinKnown, quick);       // shown at once, no blank flicker

    // 2) real search from the first letter, runs on every letter typed
    var q = db.ref('chatNames').orderByKey().startAt(typed).endAt(typed + '\uf8ff').limitToFirst(CONFIG.MAX + 2).once('value');
        Promise.all([Promise.resolve(pinMatch), q]).then(function (res) {
      if (my !== seq) return;           // an older search finished late: ignore
      var names = [];
      res[1].forEach(function (c2) { names.push(c2.key); });
      cache[typed] = { t: Date.now(), names: names };
      draw(typed, me, pinMatch && !!res[0], names);
    }).catch(function () {
      if (my !== seq || quick) return;
      box.innerHTML = '';
      box.appendChild(h('div', 'sg-msg', T.fail));
      show();
    });
  }

  function later() { clearTimeout(timer); timer = setTimeout(update, CONFIG.DELAY_MS); }

  input.addEventListener('focus', later);
  input.addEventListener('click', later);
  input.addEventListener('input', later);
  input.addEventListener('blur', function () { setTimeout(hide, 200); });
  form.addEventListener('submit', function () { seq++; hide(); });
})();
