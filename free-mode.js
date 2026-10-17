// free-mode.js - 15 Feb 2027 tak bina login ke poori website chalegi
// Kaise: bina login wale ko Firebase "guest" (anonymous) bana deta hai, taaki point, history, leaderboard sab chalte rahein.
(function () {
  // Is tarikh (raat 12 baje) tak login nahi maanga jayega. Tarikh badalni ho to sirf yahin badlo.
  var FREE_UNTIL = new Date('2027-02-16T00:00:00+05:30').getTime();   // 15 Feb ki raat 12 baje tak
  var FREE = Date.now() < FREE_UNTIL;
  window.PW_FREE_MODE = FREE;

  function ls(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function lg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var hasFb = !!(window.firebase && firebase.auth);
  var page = (location.pathname.split('/').pop() || '').toLowerCase();
  var onLoginPage = page === 'login.html' || page === 'auth.html';

  // Free samay khatam: guest ko hata do, login wapas shuru
  if (!FREE) {
    if (hasFb) firebase.auth().onAuthStateChanged(function (u) {
      if (u && u.isAnonymous) { ls('loggedIn', null); firebase.auth().signOut(); }
    });
    return;
  }

  // Jisne khud logout dabaya, use login page dikhega (logout wali jagah ye line jodni hai: pw_manual_logout)
  if (lg('pw_manual_logout') === '1') return;

  ls('loggedIn', '1');                                            // jin pages par "loggedIn" ki jaanch hai wo bhi pass ho jaayen
  if (!hasFb) { if (onLoginPage) location.replace('index.html'); return; }

  var a = firebase.auth(), done = false;
  function enter() { if (done) return; done = true; if (onLoginPage) location.replace('index.html'); }

  a.onAuthStateChanged(function (u) {
    if (u) { enter(); return; }                                    // login ya guest pehle se hai
    a.signInAnonymously().then(enter, function (e) {
      console.warn('guest login nahi hua (Firebase mein Anonymous on karo):', e);
      ls('loggedIn', null);                                        // fail hua to normal login chalne do
    });
  });
})();
