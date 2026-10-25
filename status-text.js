// =====================================================================
// status-text.js  -  Text on a photo/video status
//  * choose text colour + background colour
//  * drag the text anywhere on the screen (no more stuck in the middle)
// Used by chat-status.js (window.StatusText).
// =====================================================================
(function () {
  'use strict';
  var TXT = ['#ffffff', '#facc15', '#22d3ee', '#4ade80', '#f472b6', '#fb923c', '#a78bfa', '#111827'];
  var BGS = ['none', 'rgba(0,0,0,.45)', '#000000', '#ffffff', '#facc15', '#22d3ee', '#f472b6', '#ef4444', '#2563eb'];

  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null && txt !== '') e.textContent = txt;
    return e;
  }
  function num(v, d) { v = Number(v); return isFinite(v) ? Math.max(5, Math.min(95, v)) : d; }

  // put colours and position on a text element. s = { oc, ob, ox, oy } (works for the composer and the viewer)
  function style(el, s) {
    var bg = s.ob === undefined ? 'rgba(0,0,0,.45)' : (s.ob === 'none' ? 'transparent' : s.ob);
    el.style.color = s.oc || '#ffffff';
    el.style.background = bg;
    el.style.left = num(s.ox, 50) + '%';
    el.style.right = 'auto';
    el.style.top = num(s.oy, 50) + '%';
    el.style.transform = 'translate(-50%,-50%)';
    el.style.maxWidth = '86%';
    el.style.width = 'max-content';
  }

  // make the text draggable inside box (the full screen layer)
  function drag(el, s, box) {
    var on = false;
    el.style.touchAction = 'none'; el.style.pointerEvents = 'auto'; el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function (e) { on = true; try { el.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    el.addEventListener('pointermove', function (e) {
      if (!on) return;
      var r = box.getBoundingClientRect();
      s.ox = Math.max(8, Math.min(92, (e.clientX - r.left) * 100 / r.width));
      s.oy = Math.max(8, Math.min(92, (e.clientY - r.top) * 100 / r.height));
      style(el, s);
    });
    function up() { on = false; }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  // editor window: text + colours.  s is changed only when Save is pressed.
  function edit(s, done) {
    var bg = h('div'); bg.style.cssText = 'position:fixed;inset:0;z-index:170;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px';
    var box = h('div'); box.style.cssText = 'width:100%;max-width:360px;background:#0f1b47;border:1px solid #22d3ee;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;color:#fff;font-family:Arial,sans-serif';
    var ttl = h('b', '', 'Text on status'); ttl.style.cssText = 'text-align:center;font-size:18px';
    var tmp = { ov: s.ov, oc: s.oc || '#ffffff', ob: s.ob === undefined ? 'rgba(0,0,0,.45)' : s.ob };

    var pv = h('div'); pv.style.cssText = 'min-height:70px;display:flex;align-items:center;justify-content:center;background:#334155;border-radius:10px;padding:8px';
    var pt = h('div'); pt.style.cssText = 'font-size:22px;font-weight:700;padding:8px 12px;border-radius:10px;text-align:center;word-break:break-word;max-width:100%';
    pv.appendChild(pt);
    var inp = h('input'); inp.maxLength = 80; inp.placeholder = 'Type a status'; inp.value = tmp.ov || '';
    inp.style.cssText = 'background:#060c24;border:1px solid #1f3a8a;border-radius:10px;color:#fff;font-size:16px;padding:12px;outline:none';
    function paint() {
      pt.textContent = inp.value || 'Aa';
      pt.style.color = tmp.oc; pt.style.background = tmp.ob === 'none' ? 'transparent' : tmp.ob;
    }
    inp.oninput = paint;

    function row(label, list, key) {
      var w = h('div'), l = h('div', '', label); l.style.cssText = 'font-size:12px;color:#9fb0d9;margin-bottom:6px';
      var r = h('div'); r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      list.forEach(function (c) {
        var b = h('button', '', c === 'none' ? '\u2205' : ''); b.type = 'button';
        b.style.cssText = 'width:34px;height:34px;border-radius:50%;border:2px solid #475569;cursor:pointer;color:#fff;font-size:16px;background:' + (c === 'none' ? '#16245e' : c);
        b.onclick = function () { tmp[key] = c; paint(); mark(); };
        b._c = c; r.appendChild(b);
      });
      w.appendChild(l); w.appendChild(r); box.appendChild(w); return r;
    }
    var hint = h('div', '', 'After saving, drag the text with your finger to move it.');
    hint.style.cssText = 'font-size:12px;color:#9fb0d9;text-align:center';
    box.appendChild(ttl); box.appendChild(pv); box.appendChild(inp);
    var r1 = row('Text colour', TXT, 'oc'), r2 = row('Background', BGS, 'ob');
    function mark() {
      Array.prototype.forEach.call(r1.children, function (b) { b.style.borderColor = b._c === tmp.oc ? '#22d3ee' : '#475569'; });
      Array.prototype.forEach.call(r2.children, function (b) { b.style.borderColor = b._c === tmp.ob ? '#22d3ee' : '#475569'; });
    }
    box.appendChild(hint);

    var b2 = h('div'); b2.style.cssText = 'display:flex;gap:8px';
    function btn(txt, bgc, fn) {
      var b = h('button', '', txt); b.type = 'button';
      b.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:none;font-size:15px;font-weight:700;cursor:pointer;color:#fff;background:' + bgc;
      b.onclick = fn; b2.appendChild(b);
    }
    function close() { bg.remove(); }
    btn('Cancel', '#16245e', close);
    btn('Clear', '#7f1d1d', function () { s.ov = ''; close(); if (done) done(); });
    btn('Save', '#2563eb', function () {
      s.ov = inp.value.trim().slice(0, 80); s.oc = tmp.oc; s.ob = tmp.ob;
      close(); if (done) done();
    });
    box.appendChild(b2);
    bg.appendChild(box); bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    paint(); mark();
    setTimeout(function () { inp.focus(); }, 100);
  }

  window.StatusText = { style: style, drag: drag, edit: edit, TXT: TXT, BGS: BGS };
})();
