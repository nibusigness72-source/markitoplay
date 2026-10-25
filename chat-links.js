// =====================================================================
// chat-links.js  -  Links in chat messages become tappable
//  * only http:// and https:// links, opens in a new tab
//  * works on its own: no change needed in chat.js
// =====================================================================
(function () {
  'use strict';
  var list = document.getElementById('messages');
  if (!list || !window.MutationObserver) return;
  var RX = /(https?:\/\/[^\s<>"']+)/gi;

  var st = document.createElement('style');
  st.textContent = '.txt a.lnk{color:#67e8f9;text-decoration:underline;word-break:break-all}';
  document.head.appendChild(st);

  function fix(sp) {
    if (sp.querySelector('a')) return;
    var t = sp.textContent;
    if (!/https?:\/\//i.test(t)) return;
    var parts = t.split(RX);
    sp.textContent = '';
    parts.forEach(function (p, i) {
      if (!p) return;
      if (i % 2 === 1) {
        var url = p.replace(/[.,!?;:)\]]+$/, ''), tail = p.slice(url.length), ok = false;
        try { var u = new URL(url); ok = (u.protocol === 'http:' || u.protocol === 'https:'); } catch (e) {}
        if (ok) {
          var a = document.createElement('a');
          a.className = 'lnk'; a.href = url; a.textContent = url;
          a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
          a.addEventListener('click', function (e) { e.stopPropagation(); });
          sp.appendChild(a);
          if (tail) sp.appendChild(document.createTextNode(tail));
          return;
        }
      }
      sp.appendChild(document.createTextNode(p));
    });
  }
  var mo = new MutationObserver(scan);
  function scan() {
    mo.disconnect();
    try { Array.prototype.forEach.call(list.querySelectorAll('.txt'), fix); }
    finally { mo.observe(list, { childList: true, subtree: true, characterData: true }); }
  }
  scan();
})();
