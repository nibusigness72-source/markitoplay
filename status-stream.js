// =====================================================================
// status-stream.js  -  Status video: 5-second pieces + background loading
//  * Upload side : video is cut into SEG_SEC (5 sec) independent pieces + a small thumbnail
//  * Watch side  : first piece loads (about 5 sec of video) -> plays at once,
//                  next pieces keep loading in the background while you watch.
//                  If the next piece is not ready yet, a loader shows and it continues by itself.
// Used by chat-status.js (window.StatusStream). No settings needed here.
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

  /* ---------- upload side: video -> independent pieces ---------- */
  // o = { side, bps, seg, thumbSide, thumbQ }.  Resolves { segs: [dataURL...], th: dataURL }
  function encode(url, dur, o, onProg) {
    return new Promise(function (res, rej) {
      var MR = window.MediaRecorder;
      var mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].filter(function (m) {
        return MR && MR.isTypeSupported && MR.isTypeSupported(m);
      })[0];
      if (!mime) { rej(new Error('nomime')); return; }
      var base = mime.split(';')[0];
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

        var blobs = [], started = 0, pending = 0, cur = null, th = '', segStart = 0, ended = false, dead = false;
        function closeAc() { clearInterval(wake); if (ac) { try { ac.close(); } catch (e) {} ac = null; } }
        function startRec() {
          var rec, ch = [], my = started;
          try { rec = new MR(stream, { mimeType: mime, videoBitsPerSecond: o.bps, audioBitsPerSecond: 96000 }); }
          catch (e) { return null; }
          started++; pending++;
          rec.ondataavailable = function (e) { if (e.data && e.data.size) ch.push(e.data); };
          rec.onstop = function () {
            blobs[my] = new Blob(ch, { type: base }); pending--;
            if (ended && pending === 0) finish();
          };
          rec.start(1000);
          return rec;
        }
        function finish() {
          if (dead) return; dead = true; closeAc();
          Promise.all(blobs.map(function (b) {
            return new Promise(function (r2, j2) {
              var rd = new FileReader(); rd.onload = function () { r2(rd.result); }; rd.onerror = j2; rd.readAsDataURL(b);
            });
          })).then(function (segs) { res({ segs: segs, th: th }); }, rej);
        }
        function abort(err) {
          if (dead) return; dead = true; closeAc();
          try { if (cur && cur.state !== 'inactive') cur.stop(); } catch (e) {}
          try { v.pause(); } catch (e) {}
          rej(err);
        }
        function frame() {
          if (dead) return;
          cx.drawImage(v, 0, 0, cv.width, cv.height);
          var t = v.currentTime;
          if (!th && t > 0.15) th = drawThumb(cv, cv.width, cv.height, o.thumbSide, o.thumbQ);
          if (onProg && dur) onProg(Math.min(99, Math.round(t * 100 / dur)));
          // new piece every o.seg seconds (start the new recorder first, then stop the old one: no gap)
          if (t - segStart >= o.seg && dur - t > 1.2 && !v.ended && cur) {
            var nr = startRec();
            if (nr) { var old = cur; cur = nr; segStart = t; if (old.state !== 'inactive') old.stop(); }
          }
          if (!v.ended) next();
        }
        function next() {
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(frame); else requestAnimationFrame(frame);
        }
        v.onended = function () {
          ended = true;
          setTimeout(function () {
            if (cur && cur.state !== 'inactive') cur.stop(); else if (pending === 0) finish();
          }, 250);
        };
        cur = startRec();
        if (!cur) { abort(new Error('norec')); return; }
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

  /* ---------- watch side: plays piece after piece, loads ahead in background ---------- */
  // o = { stage, n, sd, muted, getSeg(k)->Promise<Blob>, onFirst, onEnd, onStall(bool), onError }
  // returned object: start() play() pause() rate(r) time() dur() destroy()
  function createPlayer(o) {
    var vids = [mk(), mk()], urls = [], P = [], i = 0, dead = false, r = 1, want = false, first = false, stalled = false;

    function mk() {
      var e = document.createElement('video');
      e.className = 'sv'; e.setAttribute('playsinline', ''); e.playsInline = true; e.preload = 'auto';
      e.muted = !!o.muted; e.style.visibility = 'hidden';
      e.onloadedmetadata = function () { if (e.videoWidth && e.videoHeight / e.videoWidth >= 1.6) e.style.objectFit = 'cover'; };
      e.oncanplay = function () {
        if (!first && !dead && e.getAttribute('data-k') === '0') { first = true; if (o.onFirst) o.onFirst(); }
      };
      e.onended = function () {
        if (dead || e !== vids[i % 2]) return;
        if (i + 1 >= o.n) { if (o.onEnd) o.onEnd(); } else enter(i + 1);
      };
      e.onerror = function () {
        if (!dead && e === vids[i % 2] && e.getAttribute('data-k') === String(i)) fail();
      };
      o.stage.appendChild(e);
      return e;
    }
    function fail() { if (!dead && o.onError) o.onError(); }
    function stall(b) { if (stalled === b) return; stalled = b; if (o.onStall) o.onStall(b); }
    function load(k) {
      if (k >= o.n) return null;
      if (!P[k]) {
        P[k] = o.getSeg(k).then(function (b) {
          if (dead) return null;
          urls[k] = URL.createObjectURL(b); return urls[k];
        });
      }
      return P[k];
    }
    function pump(k) {                       // keep loading the next piece while watching
      var p = load(k); if (!p) return;
      p.then(function () { if (!dead) pump(k + 1); }).catch(noop);
    }
    function tryPlay(e) { var p = e.play(); if (p && p.catch) p.catch(noop); }
    // phones do not really load a hidden video until it has been played once: play it silently for a moment so the switch has no pause
    function prime(e) {
      e._pr = true; e.muted = true;
      var p = e.play();
      Promise.resolve(p).then(function () {
        if (e._pr && !dead) { e.pause(); try { e.currentTime = 0; } catch (x) {} }
      }).catch(noop).then(function () { e._pr = false; });
    }
    function prep(k) {                       // put the next piece in the hidden player, ready to go
      var p = load(k); if (!p) return;
      p.then(function (u) {
        if (dead || !u || k === i) return;
        var e = vids[k % 2];
        if (e.getAttribute('data-k') !== String(k)) { e.src = u; e.setAttribute('data-k', String(k)); e.load(); prime(e); }
      }).catch(noop);
    }
    function enter(k) {
      i = k;
      var e = vids[k % 2], p = load(k);
      if (!urls[k]) stall(true);
      p.then(function (u) {
        if (dead || i !== k) return;
        stall(false);
        if (e.getAttribute('data-k') !== String(k)) { e.src = u; e.setAttribute('data-k', String(k)); }
        e._pr = false; e.playbackRate = r; e.muted = !!o.muted;
        e.style.visibility = 'visible'; vids[(k + 1) % 2].style.visibility = 'hidden';
        if (want) tryPlay(e);
        prep(k + 1);
      }).catch(function () { if (!dead && i === k) fail(); });
    }

    // watchdog: if the video stops by itself (phone hiccup), push it again
    var lastT = -1, stuck = 0;
    var wd = setInterval(function () {
      if (dead || !want || stalled) { lastT = -1; stuck = 0; return; }
      var e = vids[i % 2];
      if (e.getAttribute('data-k') !== String(i) || e._pr) return;
      if (e.paused && !e.ended) { tryPlay(e); return; }
      var t = e.currentTime;
      if (!e.ended && Math.abs(t - lastT) < 0.01) {
        stuck += 300;
        if (stuck >= 1500) { stuck = 0; try { e.currentTime = t + 0.05; } catch (x) {} tryPlay(e); }
      } else stuck = 0;
      lastT = t;
    }, 300);

    return {
      start: function () { pump(0); enter(0); },
      play: function () { want = true; var e = vids[i % 2]; if (e.getAttribute('data-k') === String(i)) return e.play(); },
      pause: function () { want = false; vids[i % 2].pause(); },
      rate: function (x) { r = x; vids.forEach(function (e) { e.playbackRate = x; }); },
      time: function () { return i * o.sd + (vids[i % 2].currentTime || 0); },
      dur: function () { return o.n * o.sd; },
      destroy: function () {
        dead = true; clearInterval(wd);
        vids.forEach(function (e) {
          e.onended = e.onerror = e.oncanplay = null;
          try { e.pause(); e.removeAttribute('src'); e.load(); } catch (x) {}
          if (e.parentNode) e.parentNode.removeChild(e);
        });
        urls.forEach(function (u) { if (u) { try { URL.revokeObjectURL(u); } catch (x) {} } });
      }
    };
  }

  window.StatusStream = { encode: encode, createPlayer: createPlayer, thumbOfVideo: thumbOfVideo, thumbOfImage: thumbOfImage, thumbOf: thumbOfVideo };
})();
