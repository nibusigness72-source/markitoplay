// =====================================================================
// status-stream.js  -  STREAMING version
//  * video is ONE file (not cut). It starts after about 5 seconds are loaded,
//    the rest keeps loading in the background while you watch.
//  * if the net is slow it waits quietly (loader) and goes on after 3 seconds are ready.
//  * if anything gets stuck, it downloads the whole video and continues from the same second.
//  * video is recorded at max 1.2 Mbps so Firebase can deliver it fast enough.
//  If this file gives trouble, use status-stream-full.js instead (rename it to status-stream.js).
// =====================================================================
(function () {
  'use strict';
  function noop() {}

  /* ---------- thumbnails (small JPEG, stored inside the status record) ---------- */
  function drawThumb(src, w, h, side, q) {
    try {
      var sc = Math.min(1, side / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.max(2, Math.round(w * sc)); cv.height = Math.max(2, Math.round(h * sc));
      cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', q);
    } catch (e) { return ''; }
  }
  function thumbOfImage(cv, side, q) { return drawThumb(cv, cv.width, cv.height, side, q); }
  function thumbOfVideo(url, side, q) {
    return new Promise(function (res) {
      var v = document.createElement('video'), done = false;
      function fin(x) { if (done) return; done = true; try { v.removeAttribute('src'); v.load(); } catch (e) {} res(x); }
      v.muted = true; v.preload = 'auto'; v.setAttribute('playsinline', '');
      v.onloadeddata = function () { try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); } catch (e) { fin(''); } };
      v.onseeked = function () { fin(drawThumb(v, v.videoWidth, v.videoHeight, side, q)); };
      v.onerror = function () { fin(''); };
      setTimeout(function () { fin(''); }, 6000);
      v.src = url;
    });
  }

  /* ---------- upload side: video -> ONE continuous file (re-recorded) ---------- */
  // o = { side, bps, thumbSide, thumbQ }.  Resolves { b64: base64 text (no header), mime, th }
  function encodeReal(url, dur, o, onProg) {
    o = { side: o.side, bps: Math.min(o.bps || 1200000, 1200000), thumbSide: o.thumbSide, thumbQ: o.thumbQ };
    return new Promise(function (res, rej) {
      var MR = window.MediaRecorder;
      var mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].filter(function (m) {
        return MR && MR.isTypeSupported && MR.isTypeSupported(m);
      })[0];
      if (!mime) { rej(new Error('nomime')); return; }
      var v = document.createElement('video');
      v.src = url; v.setAttribute('playsinline', ''); v.preload = 'auto';
      v.onerror = function () { rej(new Error('verr')); };
      v.onloadedmetadata = function () {
        var sc = Math.min(1, o.side / Math.max(v.videoWidth, v.videoHeight));
        var cv = document.createElement('canvas');
        cv.width = Math.max(2, Math.round(v.videoWidth * sc) & ~1); cv.height = Math.max(2, Math.round(v.videoHeight * sc) & ~1);
        if (!cv.captureStream) { rej(new Error('nocap')); return; }
        var cx = cv.getContext('2d'), stream = cv.captureStream(30), ac = null, wake = null;
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            ac = new AC();
            var sn = ac.createMediaElementSource(v), ad = ac.createMediaStreamDestination();
            sn.connect(ad);
            ad.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
            if (ac.state === 'suspended') ac.resume();
            // phones may put the audio engine to sleep: wake it again and again, otherwise the video is recorded without sound
            wake = setInterval(function () { if (ac && ac.state !== 'running') ac.resume(); }, 250);
          }
        } catch (e) {}
        var chunks = [], th = '', dead = false, rec = null;
        function closeAc() { clearInterval(wake); if (ac) { try { ac.close(); } catch (e) {} ac = null; } }
        try { rec = new MR(stream, { mimeType: mime, videoBitsPerSecond: o.bps, audioBitsPerSecond: 64000 }); }
        catch (e) { closeAc(); rej(new Error('norec')); return; }
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          if (dead) return; dead = true; closeAc();
          var type = (rec.mimeType || mime), blob = new Blob(chunks, { type: type.split(';')[0] });
          var rd = new FileReader();
          rd.onload = function () {
            var all = String(rd.result), c = all.indexOf(';base64,');
            if (c < 0) { rej(new Error('b64')); return; }
            res({ b64: all.slice(c + 8), mime: type, th: th });
          };
          rd.onerror = function () { rej(new Error('read')); };
          rd.readAsDataURL(blob);
        };
        function abort(err) {
          if (dead) return; dead = true; closeAc();
          try { if (rec.state !== 'inactive') rec.stop(); } catch (e) {}
          try { v.pause(); } catch (e) {}
          rej(err);
        }
        function frame() {
          if (dead) return;
          cx.drawImage(v, 0, 0, cv.width, cv.height);
          var t = v.currentTime;
          if (!th && t > 0.15) th = drawThumb(cv, cv.width, cv.height, o.thumbSide, o.thumbQ);
          if (onProg && dur) onProg(Math.min(99, Math.round(t * 100 / dur)));
          if (!v.ended) next();
        }
        function next() {
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(frame); else requestAnimationFrame(frame);
        }
        v.onended = function () { setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 300); };
        rec.start(1000);
        var p = v.play();
        if (p && p.catch) p.catch(function () {
          v.muted = true;                                  // phone blocked sound: record without sound
          var p2 = v.play(); if (p2 && p2.catch) p2.catch(abort);
        });
        setTimeout(function () { abort(new Error('timeout')); }, Math.max(20, dur * 2 + 15) * 1000);
        frame();
      };
    });
  }

  // very old test statuses (video in 5-second pieces) are not supported any more: they are just skipped
  function createPlayer(o) {
    setTimeout(function () { if (o.onError) o.onError(); }, 0);
    return { start: noop, play: noop, pause: noop, rate: noop, time: function () { return 0; }, dur: function () { return 1; }, destroy: noop };
  }

  /* ---------- watch side: STREAMING. One video; data is fed into it while it plays ---------- */
  function canStream(mime) {
    return !!(mime && window.MediaSource && MediaSource.isTypeSupported && MediaSource.isTypeSupported(mime));
  }
  // o = { stage, mime, n (chunks), dur (sec), ahead (sec to buffer before start), muted, getChunk(j)->Promise<Uint8Array>,
  //       onFirst, onEnd, onStall(bool), onError }
  function createMsePlayer(o) {
    var v = document.createElement('video');
    v.className = 'sv'; v.setAttribute('playsinline', ''); v.playsInline = true; v.preload = 'auto';
    v.muted = !!o.muted; v.style.visibility = 'hidden';
    v.onloadedmetadata = function () { if (v.videoWidth && v.videoHeight / v.videoWidth >= 1.6) v.style.objectFit = 'cover'; };
    o.stage.appendChild(v);
    var ms = new MediaSource(), url = URL.createObjectURL(ms), sb = null, blobUrl = null;
    var dead = false, first = false, want = false, done = false, stalled = false, bailed = false;
    var got = {}, nextFetch = 0, nextAppend = 0, inflight = 0, AHEAD = o.ahead || 5, REBUF = 3;

    function bufEnd() { try { var b = v.buffered; return b.length ? b.end(b.length - 1) : 0; } catch (e) { return 0; } }
    function stall(b) { if (stalled === b) return; stalled = b; if (o.onStall) o.onStall(b); }
    function tryPlay() { var p = v.play(); if (p && p.catch) p.catch(noop); }
    function fail() {
      if (dead || bailed) return;
      if (first) bail(); else if (o.onError) o.onError();
    }

    // SAFETY NET: if streaming ever gets stuck, download the whole video and carry on from the same second
    function loadAll() {
      return new Promise(function (res, rej) {
        var out = new Array(o.n), next = 0, left = o.n, bad = false;
        function w() {
          if (bad || next >= o.n) return;
          var k = next++;
          o.getChunk(k).then(function (b) { out[k] = b; if (--left === 0) res(out); else w(); })
            .catch(function (e) { bad = true; rej(e); });
        }
        for (var z = 0; z < Math.min(4, o.n); z++) w();
      });
    }
    function bail() {
      if (dead || bailed) return;
      bailed = true; stall(true);
      var t = v.currentTime || 0;
      loadAll().then(function (parts) {
        if (dead) return;
        blobUrl = URL.createObjectURL(new Blob(parts, { type: o.mime.split(';')[0] }));
        v.onloadedmetadata = function () {
          v.onloadedmetadata = null;
          try { if (t > 0.5) v.currentTime = t; } catch (e) {}
          stall(false); if (want) tryPlay();
        };
        v.src = blobUrl; v.load();
      }).catch(function () { if (!dead && o.onError) o.onError(); });
    }

    function fetchMore() {                       // keep loading chunks in order while watching
      while (!dead && !bailed && inflight < 6 && nextFetch < o.n && nextFetch - nextAppend < 24) {
        (function (j) {
          inflight++;
          o.getChunk(j).then(function (bytes) {
            if (dead || bailed) return;
            got[j] = bytes; inflight--; append(); fetchMore();
          }).catch(function () { inflight--; fail(); });
        })(nextFetch++);
      }
    }
    function append() {
      if (dead || bailed || !sb || sb.updating) return;
      if (got[nextAppend]) {
        var b = got[nextAppend]; delete got[nextAppend]; nextAppend++;
        try { sb.appendBuffer(b); } catch (e) { fail(); }
      } else if (nextAppend >= o.n && !done) {
        done = true;
        try { if (ms.readyState === 'open') ms.endOfStream(); } catch (e) {}
        check();
      }
    }
    function check() {                            // start as soon as ~5 seconds are ready
      if (first || dead || bailed) return;
      var e = bufEnd();
      if (e >= AHEAD || (done && e > 0)) {
        first = true;
        try { if (v.buffered.length && v.buffered.start(0) > 0.05) v.currentTime = v.buffered.start(0); } catch (x) {}
        v.style.visibility = 'visible';
        if (o.onFirst) o.onFirst();
      }
    }
    function jumpGap() {                          // small hole between two pieces of data: jump over it
      try {
        var b = v.buffered, ct = v.currentTime;
        for (var k = 0; k < b.length; k++) if (b.start(k) > ct + 0.01) { v.currentTime = b.start(k) + 0.02; return; }
      } catch (e) {}
    }
    ms.addEventListener('sourceopen', function () {
      if (sb || dead) return;
      try { sb = ms.addSourceBuffer(o.mime); } catch (e) { fail(); return; }
      sb.addEventListener('updateend', function () { append(); fetchMore(); check(); });
      sb.addEventListener('error', fail);
      fetchMore();
    });

    // watchdog every quarter second
    var lastCT = -1, noMove = 0, lastEnd = 0, noGrow = 0;
    var wd = setInterval(function () {
      if (dead || bailed || !first || !want) { noMove = 0; return; }
      var ct = v.currentTime, end = bufEnd(), ahead = end - ct;
      // 1) data ran out: wait quietly until 3 seconds are ready, then go on
      if (!stalled) {
        if (!done && ahead < 0.4 && !v.paused) { v.pause(); stall(true); }
        else if (v.paused && !v.ended) tryPlay();
      } else if (done || ahead >= REBUF) { stall(false); tryPlay(); }
      // 2) video not moving although it should
      if (!stalled && !v.paused && !v.ended) {
        noMove = Math.abs(ct - lastCT) < 0.01 ? noMove + 250 : 0;
        if (noMove >= 1000 && ahead > 0.5) jumpGap();
        if (noMove >= 5000) { bail(); return; }
      } else noMove = 0;
      lastCT = ct;
      // 3) no new data for a long time: fall back to full download
      if (end > lastEnd + 0.01) { lastEnd = end; noGrow = 0; } else noGrow += 250;
      if (!done && noGrow >= 12000) bail();
    }, 250);
    v.onended = function () { if (!dead && o.onEnd) o.onEnd(); };
    v.onerror = function () { fail(); };

    return {
      start: function () { v.src = url; },
      play: function () { want = true; return v.play(); },
      pause: function () { want = false; v.pause(); },
      rate: function (x) { v.playbackRate = x; },
      time: function () { return v.currentTime || 0; },
      dur: function () { return o.dur; },
      destroy: function () {
        dead = true; clearInterval(wd); v.onended = v.onerror = v.onloadedmetadata = null;
        try { v.pause(); v.removeAttribute('src'); v.load(); } catch (x) {}
        try { URL.revokeObjectURL(url); if (blobUrl) URL.revokeObjectURL(blobUrl); } catch (x) {}
        if (v.parentNode) v.parentNode.removeChild(v);
      }
    };
  }

  window.StatusStream = { encode: encodeReal, canStream: canStream, createMsePlayer: createMsePlayer, createPlayer: createPlayer, thumbOfVideo: thumbOfVideo, thumbOfImage: thumbOfImage, thumbOf: thumbOfVideo };
})();
