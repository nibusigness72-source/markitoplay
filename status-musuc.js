// =====================================================================
// status-music.js  -  Search music online and put it on a status
//  * Search any song name; tap  ▶  to listen,  ✔  to use it.
//  * Uses the free Apple/iTunes search: every song gives a 30-second preview clip
//    (that is exactly the 30 sec limit of a status). The clip is streamed from its link,
//    nothing is uploaded, so the status posts fast.
//  * "From phone" button still lets you pick an audio file from the phone.
// Used by chat-status.js (window.StatusMusic).
// =====================================================================
(function () {
  'use strict';
  var API = 'https://itunes.apple.com/search?media=music&entity=song&limit=25&term=';

  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  var st = h('style');
  st.textContent = [
    '.smu{position:fixed;inset:0;z-index:175;background:#0b1544;display:flex;flex-direction:column;color:#fff;font-family:Arial,sans-serif}',
    '.smu .bar{display:flex;gap:8px;align-items:center;padding:12px}',
    '.smu .bar button{width:42px;height:42px;border-radius:50%;border:none;background:#16245e;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0}',
    '.smu .bar input{flex:1;min-width:0;background:#060c24;border:1px solid #1f3a8a;border-radius:22px;color:#fff;font-size:16px;padding:11px 16px;outline:none}',
    '.smu .lst{flex:1;overflow-y:auto;padding:0 12px 10px}',
    '.smu .it{display:flex;align-items:center;gap:10px;padding:8px 0}',
    '.smu .it img,.smu .it .ph{width:48px;height:48px;border-radius:8px;background:#1e3a8a;object-fit:cover;flex-shrink:0}',
    '.smu .it .nm{flex:1;min-width:0}.smu .it b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.smu .it span{font-size:12px;color:#9fb0d9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}',
    '.smu .it button{width:40px;height:40px;border-radius:50%;border:none;color:#fff;font-size:16px;cursor:pointer;flex-shrink:0}',
    '.smu .it .pl{background:#16245e}.smu .it .us{background:#22c55e}',
    '.smu .msg{text-align:center;color:#9fb0d9;font-size:14px;padding:30px 10px}',
    '.smu .ph-btn{margin:8px 12px 18px;padding:13px;border-radius:12px;border:1px solid #1f3a8a;background:#16245e;color:#fff;font-size:15px;font-weight:700;cursor:pointer}',
    '.smu .sp{width:34px;height:34px;border-radius:50%;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;animation:smuspin .8s linear infinite;margin:0 auto}',
    '@keyframes smuspin{to{transform:rotate(360deg)}}'
  ].join('\n');
  document.head.appendChild(st);

  function jsonp(url) {
    return new Promise(function (res, rej) {
      var cb = 'smu_' + Date.now(), s = document.createElement('script');
      function clean() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (d) { clean(); res(d); };
      s.onerror = function () { clean(); rej(new Error('jsonp')); };
      s.src = url + '&callback=' + cb;
      document.head.appendChild(s);
      setTimeout(function () { clean(); rej(new Error('timeout')); }, 10000);
    });
  }
  function search(term) {
    var url = API + encodeURIComponent(term);
    var p = window.fetch ? fetch(url).then(function (r) { return r.json(); }) : Promise.reject(new Error('nofetch'));
    return p.catch(function () { return jsonp(url); });
  }
  function okUrl(u) { return typeof u === 'string' && /^https:\/\/[a-z0-9.-]+\.(mzstatic|apple)\.com\//i.test(u); }

  // opts = { local: function(cb), done: function(music) }
  function choose(opts) {
    var au = null, playingBtn = null;
    var ov = h('div', 'smu');
    var bar = h('div', 'bar');
    var x = h('button', '', '\u2715'); x.type = 'button';
    var inp = h('input'); inp.type = 'search'; inp.placeholder = 'Search a song...'; inp.maxLength = 60;
    var go = h('button', '', '\uD83D\uDD0E'); go.type = 'button';
    bar.appendChild(x); bar.appendChild(inp); bar.appendChild(go);
    var lst = h('div', 'lst'); lst.appendChild(h('div', 'msg', 'Type a song or artist name and tap search.'));
    var ph = h('button', 'ph-btn', '\uD83D\uDCC1 Pick from phone'); ph.type = 'button';
    ov.appendChild(bar); ov.appendChild(lst); ov.appendChild(ph);
    document.body.appendChild(ov);

    function stop() { if (au) { try { au.pause(); } catch (e) {} au = null; } if (playingBtn) { playingBtn.textContent = '\u25B6'; playingBtn = null; } }
    function close() { stop(); ov.remove(); }
    x.onclick = close;
    ph.onclick = function () { close(); if (opts.local) opts.local(opts.done); };

    var token = 0;
    function run() {
      var q = inp.value.trim(); if (!q) return;
      var my = ++token; stop();
      lst.innerHTML = ''; var sp = h('div', 'sp'); sp.style.marginTop = '30px'; lst.appendChild(sp);
      search(q).then(function (d) {
        if (my !== token) return;
        lst.innerHTML = '';
        var arr = ((d && d.results) || []).filter(function (r) { return okUrl(r.previewUrl); });
        if (!arr.length) { lst.appendChild(h('div', 'msg', 'No songs found. Try another name.')); return; }
        arr.forEach(function (r) {
          var it = h('div', 'it');
          var art = r.artworkUrl60 && /^https:\/\//.test(r.artworkUrl60) ? r.artworkUrl60 : '';
          if (art) { var im = h('img'); im.src = art; im.alt = ''; it.appendChild(im); } else it.appendChild(h('div', 'ph'));
          var nm = h('div', 'nm'); nm.appendChild(h('b', '', r.trackName || 'Song')); nm.appendChild(h('span', '', r.artistName || ''));
          var pl = h('button', 'pl', '\u25B6'); pl.type = 'button';
          var us = h('button', 'us', '\u2714'); us.type = 'button';
          pl.onclick = function () {
            if (playingBtn === pl) { stop(); return; }
            stop(); au = new Audio(r.previewUrl); playingBtn = pl; pl.textContent = '\u23F8';
            au.onended = stop; au.onerror = stop;
            var p = au.play(); if (p && p.catch) p.catch(stop);
          };
          us.onclick = function () {
            var name = ((r.trackName || 'Song') + (r.artistName ? ' - ' + r.artistName : '')).slice(0, 40);
            var m = { url: r.previewUrl, sec: 30, name: name };
            close(); if (opts.done) opts.done(m);
          };
          it.appendChild(nm); it.appendChild(pl); it.appendChild(us); lst.appendChild(it);
        });
      }).catch(function () {
        if (my !== token) return;
        lst.innerHTML = ''; lst.appendChild(h('div', 'msg', 'Could not search. Check your internet and try again.'));
      });
    }
    go.onclick = run;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    setTimeout(function () { inp.focus(); }, 100);
  }

  window.StatusMusic = { choose: choose };
})();
