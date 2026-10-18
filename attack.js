// attack.js  —  BALL HUNT (tum neeche, robot upar)
// Ungli se apna lal paddle chalao. Ball ko hit karo = point. Robot ke paas se ball nikal jaye = bade point.
// Sound ki settings attack-sound.js mein hain. Rang/size ki settings attack.css mein.
(function () {
  // =====================================================================
  //   YAHAN SE SAB KUCH BADAL SAKTE HO  (sirf number ya naam badlo)
  // =====================================================================
  var CONFIG = {
    // ---- Game ----
    TIME: 60,                 // poora game kitne second ka (60 = 1 minute)
    HIT_POINTS: 4,            // tum ball ko paddle se maaro to kitne point
    MISS_POINTS: 20,          // robot ball na rok paye to tumhe kitne point

    // ---- Ball ----
    BALL_SPEED: 1.4,            // ball ki speed (1 = normal, 0.5 = aadhi, 2 = double)
    BALL_START: 330,          // serve par ball kitni tez (is par BALL_SPEED guna hota hai)
    BALL_SPEEDUP: 1.04,       // har hit par ball kitni tez ho (1.04 = 4% tez | 1 = tez nahi hogi)
    BALL_MAX: 750,            // ball ki sabse zyada speed (is par BALL_SPEED guna hota hai)
    BALL_SIZE: 12,            // ball ka size
    BALL_COLOR_EVERY: 8,      // ball kitne second mein rang badle (0 = rang nahi badlega)
    BALL_COLORS: ['#ffffff', '#ffd23f', '#ff8a3d', '#ff9ad5', '#9cf0ff'],   // ball ke rang (football jaisa)

    // ---- Robot (upar wala) ----
    ROBOT_SMART: 0.5,         // kitna hoshiyar: 0 = bilkul bevkuf, 1 = bahut smart
    ROBOT_DEFENCE: 0.7,       // ball ROKNE ki koshish: 0 = koshish hi nahi, 1 = har ball rokega
    ROBOT_ATTACK: 0.5,        // ball tumhari taraf GIRANE ki koshish: 0 = seedha maarega, 1 = kone mein maarega
    ROBOT_SPEED: 1,           // robot kitna tez daude (1 = normal, 2 = double)

    // ---- Paddle (tumhara) ----
    PADDLE_SIZE: 30,          // dono paddle ka size
    TOUCH_OFFSET: 50,         // ungli se paddle kitna upar dikhe (taki ungli ke neeche na chhupe)
    FOLLOW: 18,               // paddle ungli ke peeche kitni tezi se aaye (bada = tez)

    // ---- Serve ----
    GOAL_MOVE: 0.7,           // ball girne ke baad paddle ke paas jaane mein kitne second
    SERVE_WAIT: 1,            // ball ruka rahega kitne second, phir serve

    // ---- Board (har THEME_EVERY second mein badlega) ----
    THEME_EVERY: 30,
    THEMES: [
      { name: 'Classic Green', bg: '#fbcf6f', table: '#7cc940', line: '#ffffff', page: '#2a2110' },
      { name: 'Ocean Blue',    bg: '#bfe9ff', table: '#2f86d9', line: '#ffffff', page: '#0e2233' },
      { name: 'Night Purple',  bg: '#2b2250', table: '#8a4fd6', line: '#ffe27a', page: '#120d26' }
    ],

    // ---- Paddle ke rang ----
    YOU_COLOR: '#ff5f57',
    ROBOT_COLOR: '#00d2ff',

    // ---- Bolna (paddle jo bolte hain) ----
    TALK_CHANCE: 0.3,         // ball maarte waqt bolne ka mauka (0.3 = 30%)
    MOVE_TALK: 700,           // ungli itni door hilane par tumhara paddle bolega (chhota = zyada bolega)
    YOU_LINES: ['Wah!', 'Mast shot!', 'Aur zor se!', 'Chalo!'],
    ROBOT_LINES: ['Beep boop!', 'Pakad liya!', 'Nahi bachoge!', 'Hehe, mera point!']
  };

  // =====================================================================

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('game'), ctx = cv.getContext('2d');
  var W = 360, H = 640, TAU = Math.PI * 2, DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var T = { x: 24, y: 34, w: 312, h: 572 };
  T.r = T.x + T.w; T.b = T.y + T.h; T.mid = T.y + T.h / 2;

  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var human = { x: W / 2, y: 560, vx: 0, vy: 0, tx: W / 2, ty: 560, out: -1 };
  var bot = { x: W / 2, y: 80, vx: 0, vy: 0, out: 1, aim: W / 2, noise: 0, think: 0, trying: true };
  var ball = { x: W / 2, y: T.mid, vx: 0, vy: 0, sp: 0, rot: 0, color: CONFIG.BALL_COLORS[0], trail: [] };
  human.r = bot.r = CONFIG.PADDLE_SIZE; ball.r = CONFIG.BALL_SIZE;

  var state = 'ready', score = 0, timeLeft = CONFIG.TIME;
  var server = bot, stateT = 0, lastHitter = null, themeIdx = 0, colorT = CONFIG.BALL_COLOR_EVERY, moveDist = 0;
  var popups = [];

  function pop(text, x, y, color) { popups.push({ text: text, x: x, y: y, color: color, life: 1.1 }); }
  function setHud() {
    $('sYou').textContent = score;
    $('time').textContent = Math.max(0, Math.ceil(timeLeft));
    $('bar').style.width = Math.max(0, Math.min(100, timeLeft / CONFIG.TIME * 100)) + '%';
    document.querySelector('.timer').classList.toggle('low', timeLeft <= 10 && state !== 'ready');
  }
  function applyTheme(i, announce) {
    themeIdx = i % CONFIG.THEMES.length;
    $('themeName').textContent = CONFIG.THEMES[themeIdx].name;
    document.body.style.background = CONFIG.THEMES[themeIdx].page;
    if (announce) { pop('Board change!', W / 2, T.mid, '#fff'); BallHuntSound.change(); }
  }

  // ---------- Game shuru / khatam ----------
  function startGame() {
    BallHuntSound.unlock();
    score = 0; timeLeft = CONFIG.TIME;
    human.r = bot.r = CONFIG.PADDLE_SIZE; ball.r = CONFIG.BALL_SIZE;
    human.x = human.tx = W / 2; human.y = human.ty = 560;
    bot.x = W / 2; bot.y = 80;
    applyTheme(0); setHud();
    $('overlay').classList.add('hide');
    beginServe(bot, true);
  }
  $('startBtn').onclick = startGame;

  function endGame() {
    state = 'over';
    $('msg').innerHTML = '<b style="font-size:26px">⏰ Time khatam</b><br><br>Score: ' + score;
    $('startBtn').textContent = 'Phir se khelo';
    $('overlay').classList.add('show'); $('overlay').classList.remove('hide');
    if (score > 0) BallHuntSound.win(); else BallHuntSound.lose();
    saveOnline();
    setHud();
  }

  // Score score.js ke zariye save hota hai (arrow-escape jaisa)
  function saveOnline() {
    if (score > 0 && window.PWScore) {
      var s = score;
      Promise.resolve(PWScore.save('ball-hunt', s)).then(function (res) {
        if (res) $('msg').innerHTML += '<br><small>+' + s + ' points mile</small>';
      }).catch(function () {});
    }
  }

  // ---------- Serve ----------
  function beginServe(who, instant) {
    server = who; state = instant ? 'serve' : 'goal'; stateT = 0; lastHitter = null;
    ball.vx = ball.vy = 0; ball.trail.length = 0; ball.color = rnd(CONFIG.BALL_COLORS);
  }
  function decideBot() {                      // robot is baar ball rokne ki koshish karega ya nahi
    bot.trying = Math.random() < 0.2 + 0.8 * CONFIG.ROBOT_DEFENCE;
    bot.noise = (Math.random() - 0.5) * 2 * (1 - CONFIG.ROBOT_SMART) * 110;
    bot.think = 0;
  }
  function launch() {
    var dir = server === human ? -1 : 1;
    var sp = CONFIG.BALL_START * CONFIG.BALL_SPEED, a = (Math.random() - 0.5) * 0.6;
    ball.sp = sp; ball.vx = sp * Math.sin(a); ball.vy = dir * sp * Math.cos(a);
    lastHitter = server; state = 'play'; decideBot();
    BallHuntSound.swish();
  }

  function fold(x, a, b) { var w = b - a, d = (x - a) % (2 * w); if (d < 0) d += 2 * w; return a + (d > w ? 2 * w - d : d); }

  // ---------- Robot ka dimag ----------
  function aiUpdate(dt) {
    var s = CONFIG.ROBOT_SMART, ag = CONFIG.ROBOT_ATTACK;
    var tx = W / 2, ty = 80;
    if (state === 'play' && ball.vy < 0) {
      if (bot.trying) {
        bot.think -= dt;
        if (bot.think <= 0) {
          bot.think = 0.32 - s * 0.28 + Math.random() * 0.1;          // smart jitna zyada, utni jaldi soch
          var t = Math.max(0, (ball.y - bot.y) / -ball.vy);
          bot.aim = fold(ball.x + ball.vx * t, T.x + 12, T.r - 12) + bot.noise;   // ball kahan aayegi (bevkuf = galti)
        }
        tx = bot.aim;
        ty = 80 + ag * 130 * clamp((380 - ball.y) / 200, 0, 1);        // attack zyada = aage aake maarega
      } else { tx = W / 2 + (ball.x - W / 2) * 0.3; }                  // koshish nahi = aise hi khada
    } else if (state === 'play') { tx = W / 2 + (ball.x - W / 2) * 0.3; }
    var vmax = (140 + s * 520) * CONFIG.ROBOT_SPEED * (0.6 + 0.4 * CONFIG.ROBOT_DEFENCE), ox = bot.x, oy = bot.y;
    bot.x = clamp(bot.x + clamp(tx - bot.x, -vmax * dt, vmax * dt), T.x + 8, T.r - 8);
    bot.y = clamp(bot.y + clamp(ty - bot.y, -vmax * 0.8 * dt, vmax * 0.8 * dt), 50, 220);
    bot.vx = (bot.x - ox) / dt; bot.vy = (bot.y - oy) / dt;
  }

  // ---------- Tumhara paddle (ungli ke peeche) ----------
  function humanUpdate(dt) {
    var ox = human.x, oy = human.y, k = Math.min(1, dt * CONFIG.FOLLOW);
    human.x += (human.tx - human.x) * k; human.y += (human.ty - human.y) * k;
    human.vx = (human.x - ox) / dt; human.vy = (human.y - oy) / dt;
    moveDist += Math.abs(human.x - ox) + Math.abs(human.y - oy);
    if (moveDist > CONFIG.MOVE_TALK) {                                  // ungli ke saath idhar-udhar hone par thoda bolega
      moveDist = 0; BallHuntSound.swish();
      if (Math.random() < 0.5) BallHuntSound.say(rnd(CONFIG.YOU_LINES), 'you');
    }
  }

  // ---------- Ball paddle se takrayi ----------
  function tryHit(p, isHuman) {
    if (lastHitter === p || Math.sign(ball.vy) === p.out) return false;
    var dx = ball.x - p.x, dy = ball.y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) > p.r + ball.r) return false;
    var cap = CONFIG.BALL_MAX * CONFIG.BALL_SPEED;
    var sp = Math.min(cap, Math.max(ball.sp, CONFIG.BALL_START * CONFIG.BALL_SPEED) * CONFIG.BALL_SPEEDUP);
    var a = clamp(dx / (p.r + ball.r), -1, 1) * 0.85 + clamp(p.vx * 0.0012, -0.35, 0.35);
    if (!isHuman) a += (human.x < W / 2 ? 1 : -1) * CONFIG.ROBOT_ATTACK * 0.45 * Math.random();   // robot tumse door maarta hai
    a = clamp(a, -1.1, 1.1);
    ball.sp = sp; ball.vx = sp * Math.sin(a); ball.vy = p.out * sp * Math.cos(a);
    ball.y = p.y + p.out * (p.r + ball.r + 1);
    lastHitter = p;
    if (isHuman) { score += CONFIG.HIT_POINTS; pop('+' + CONFIG.HIT_POINTS, p.x, p.y - 45, CONFIG.YOU_COLOR); decideBot(); }
    BallHuntSound.hit(isHuman);
    if (Math.random() < CONFIG.TALK_CHANCE) BallHuntSound.say(isHuman ? rnd(CONFIG.YOU_LINES) : rnd(CONFIG.ROBOT_LINES), isHuman ? 'you' : 'robot');
    return true;
  }

  // ---------- Ball nikal gayi ----------
  function goal(youMissed) {
    if (youMissed) {                                  // tumse ball nikal gayi: koi point nahi
      pop('Miss!', W / 2, T.b - 80, '#ffffff');
      BallHuntSound.lose(); BallHuntSound.say(rnd(CONFIG.ROBOT_LINES), 'robot', true); beginServe(human);
    } else {                                          // robot se ball nikal gayi: tumhe bade point
      score += CONFIG.MISS_POINTS; pop('+' + CONFIG.MISS_POINTS, W / 2, T.y + 90, CONFIG.YOU_COLOR);
      BallHuntSound.win(); BallHuntSound.say(rnd(CONFIG.YOU_LINES), 'you', true); beginServe(bot);
    }
    setHud();
  }

  // ---------- Har frame ka kaam ----------
  function update(dt) {
    if (state === 'ready' || state === 'over') return;
    timeLeft -= dt;
    var want = Math.floor((CONFIG.TIME - timeLeft) / CONFIG.THEME_EVERY);
    if (want !== themeIdx && timeLeft > 0) applyTheme(want, true);
    if (CONFIG.BALL_COLOR_EVERY > 0) {
      colorT -= dt;
      if (colorT <= 0) { colorT = CONFIG.BALL_COLOR_EVERY * (0.8 + Math.random() * 0.4); ball.color = rnd(CONFIG.BALL_COLORS); }
    }
    if (timeLeft <= 0) { timeLeft = 0; return endGame(); }
    humanUpdate(dt); aiUpdate(dt);
    stateT += dt;

    if (state === 'goal' || state === 'serve') {
      var f = server === human ? { x: human.x, y: human.y - human.r - ball.r - 3 } : { x: bot.x, y: bot.y + bot.r + ball.r + 3 };
      if (state === 'goal') {                       // ball girne ke baad us paddle ke paas jaati hai
        var k = Math.min(1, stateT / CONFIG.GOAL_MOVE);
        ball.x += (f.x - ball.x) * (0.1 + 0.2 * k); ball.y += (f.y - ball.y) * (0.1 + 0.2 * k);
        if (stateT > CONFIG.GOAL_MOVE) { state = 'serve'; stateT = 0; }
      } else {                                      // wahan ruki rehti hai, phir serve
        ball.x = f.x; ball.y = f.y;
        if (stateT > CONFIG.SERVE_WAIT) launch();
      }
    } else {
      var steps = 3, h = dt / steps;
      for (var i = 0; i < steps; i++) {
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        if (ball.x < T.x + ball.r) { ball.x = T.x + ball.r; ball.vx = Math.abs(ball.vx); BallHuntSound.wall(); }
        if (ball.x > T.r - ball.r) { ball.x = T.r - ball.r; ball.vx = -Math.abs(ball.vx); BallHuntSound.wall(); }
        tryHit(human, true); tryHit(bot, false);
      }
      ball.rot += ball.vx * dt * 0.05 + 0.1 * dt * Math.sign(ball.vy);
      ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 8) ball.trail.shift();
      if (ball.y > T.b + 28) goal(true);
      else if (ball.y < T.y - 28) goal(false);
    }
    setHud();
  }

  // ---------- Drawing ----------
  function paddle(p, color) {
    var hy = p.out === -1 ? p.y + p.r - 6 : p.y - p.r - 34;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(p.x + 9, p.y + 7, p.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(p.x - 13, hy, 26, 40);                       // handle
    ctx.fillStyle = color; ctx.fillRect(p.x - 7, hy + (p.out === -1 ? 6 : 0), 14, 34);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(p.x - p.r + 6, p.out === -1 ? p.y + 12 : p.y - 16, p.r * 2 - 12, 4);
  }

  function drawBall() {                              // football jaisi ball
    ball.trail.forEach(function (t, i) {
      ctx.fillStyle = 'rgba(255,255,255,' + (i / ball.trail.length * 0.25) + ')';
      ctx.beginPath(); ctx.arc(t.x, t.y, ball.r * (0.4 + i / 16), 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(ball.x + 6, ball.y + 6, ball.r, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.rot);
    var R = ball.r;
    ctx.fillStyle = ball.color; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var i = 0; i < 5; i++) { var a = i / 5 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4); }
    ctx.closePath(); ctx.fill();
    for (i = 0; i < 5; i++) {
      a = i / 5 * TAU - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4); ctx.lineTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(a + 0.63) * R * 0.95, Math.sin(a + 0.63) * R * 0.95, R * 0.28, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, TAU); ctx.stroke();
  }

  function draw() {
    var th = CONFIG.THEMES[themeIdx];
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(T.x - 8, T.y, T.w + 16, T.h + 16);       // table ki parchhai
    ctx.fillStyle = '#000'; ctx.fillRect(T.x - 12, T.y - 12, T.w + 24, T.h + 24);              // kinara
    ctx.fillStyle = th.table; ctx.fillRect(T.x, T.y, T.w, T.h);                                  // table
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (var i = 0; i < 8; i += 2) ctx.fillRect(T.x, T.y + i * T.h / 8, T.w, T.h / 8);          // patti
    ctx.fillStyle = th.line; ctx.fillRect(W / 2 - 6, T.y, 12, T.h);
    ctx.fillRect(T.x, T.y, T.w, 3); ctx.fillRect(T.x, T.b - 3, T.w, 3);
    ctx.fillStyle = '#000'; ctx.fillRect(T.x - 12, T.mid - 13, T.w + 24, 26);                   // jaali (net)
    ctx.fillStyle = '#fff'; ctx.fillRect(T.x, T.mid - 5, T.w, 10);

    paddle(bot, CONFIG.ROBOT_COLOR); drawBall(); paddle(human, CONFIG.YOU_COLOR);

    ctx.textAlign = 'center'; ctx.font = '900 26px "Trebuchet MS",sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    for (i = popups.length - 1; i >= 0; i--) {
      var p = popups[i]; p.life -= 1 / 60; p.y -= 0.6;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Ungli / mouse ----------
  function pointer(e) {
    var r = cv.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    human.tx = clamp(x, T.x + 8, T.r - 8);
    human.ty = clamp(y - (e.pointerType === 'touch' ? CONFIG.TOUCH_OFFSET : 0), 430, 600);
  }
  cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} BallHuntSound.unlock(); pointer(e); });
  cv.addEventListener('pointermove', pointer);
  document.addEventListener('touchmove', function (e) { if (e.target === cv) e.preventDefault(); }, { passive: false });

  // ---------- Loop ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  $('msg').innerHTML = 'Ungli se lal paddle chalao.<br>Ball maaro = ' + CONFIG.HIT_POINTS + ' point &nbsp;|&nbsp; Robot miss kare = ' + CONFIG.MISS_POINTS + ' point<br>Time: ' + CONFIG.TIME + ' second';
  applyTheme(0); setHud();
  requestAnimationFrame(loop);
})();
