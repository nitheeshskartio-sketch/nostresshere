/* ============ Brick Breaker — No Stress Here ============ */
(function () {
  "use strict";

  /* =========================================================
     CONSTANTS
     ========================================================= */
  const W = 640, H = 800;              // logical playfield size
  const COLS = 10, MARGIN = 20, GAP = 4;
  const BW = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
  const BH = 24;
  const TOP = 64;                      // first brick row y
  const PADDLE_Y = H - 64, PADDLE_H = 16, PADDLE_W = 112;
  const BALL_R = 8;
  const MAX_BALLS = 15;
  const LIFE_EVERY = 10000;
  const TIER_SPEED = [380, 420, 460, 500];
  const ROW_COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#748ffc", "#b197fc", "#f783ac", "#ff8787", "#ffc078", "#8ce99a"];

  /* =========================================================
     DOM + STORAGE
     ========================================================= */
  const $ = (id) => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d");
  const wrap = $("wrap"), overlay = $("overlay"), card = $("overlayCard");
  const hudScore = $("hudScore"), hudLevel = $("hudLevel"), hudLives = $("hudLives"), hudBest = $("hudBest");
  const soundBtn = $("soundBtn"), pauseBtn = $("pauseBtn"), toastEl = $("toast");

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  };
  let best = parseInt(store.get("nsh-bb-best", "0"), 10) || 0;
  let maxLevel = parseInt(store.get("nsh-bb-level", "1"), 10) || 1;
  let starMap = {};
  try { starMap = JSON.parse(store.get("nsh-bb-stars", "{}")) || {}; } catch (e) { starMap = {}; }
  let soundOn = store.get("nsh-bb-sound", "1") === "1";

  /* =========================================================
     HELPERS
     ========================================================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shade(hex, amt) { // amt -1..1 (negative = darker)
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function rr(x, y, w, h, r) { // rounded rect path
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  function theme() {
    return isDark()
      ? { bg: "#1b1a24", dot: "rgba(255,255,255,0.05)", text: "#f3f0fa", muted: "#a6a2b4", chip: "rgba(255,255,255,0.08)", steel: ["#9aa0ad", "#5d6270"], ball: "#ffffff" }
      : { bg: "#fdfcff", dot: "rgba(60,40,100,0.06)", text: "#2a2833", muted: "#7a7684", chip: "rgba(42,40,51,0.06)", steel: ["#d5d9e0", "#9299a6"], ball: "#2a2833" };
  }

  let toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms || 2200);
  }
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  /* =========================================================
     SOUND (synthesized, no files)
     ========================================================= */
  let actx = null, master = null, noiseBuf = null;
  function audio() {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
      master = actx.createGain();
      master.gain.value = 0.5;
      const comp = actx.createDynamicsCompressor();
      master.connect(comp).connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!soundOn) return;
    const c = audio(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, q, delay) {
    if (!soundOn) return;
    const c = audio(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5, dur + 0.02);
  }
  const sfx = {
    paddle() { tone(300, 0.09, "sine", 0.35, 460); },
    wall() { tone(220, 0.05, "sine", 0.12); },
    hit(c) { tone(420 + Math.min(c, 12) * 35, 0.07, "triangle", 0.22); },
    brk(c) { const f = 560 + Math.min(c, 12) * 45; tone(f, 0.1, "square", 0.08, f * 1.5); tone(f * 0.5, 0.08, "sine", 0.25); noise(0.05, 0.12, 3200, 1.5); },
    steel() { tone(1500, 0.14, "triangle", 0.12); tone(2250, 0.1, "sine", 0.08); },
    boom() { noise(0.45, 0.6, 350, 0.6); tone(140, 0.35, "sine", 0.5, 35); },
    power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "triangle", 0.2, null, i * 0.06)); },
    bad() { [440, 330, 220].forEach((f, i) => tone(f, 0.16, "sawtooth", 0.07, null, i * 0.09)); },
    life() { [660, 880, 1320].forEach((f, i) => tone(f, 0.15, "sine", 0.25, null, i * 0.08)); },
    lose() { tone(440, 0.7, "triangle", 0.25, 90); },
    clear() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, "triangle", 0.22, null, i * 0.09)); },
    laser() { tone(1300, 0.08, "square", 0.04, 500); },
    zap() { noise(0.12, 0.2, 5000, 2); tone(900, 0.1, "square", 0.05, 1800); },
    acid() { noise(0.15, 0.15, 900, 4); tone(200, 0.12, "sine", 0.15, 400); },
    boss() { tone(180, 0.15, "square", 0.12, 110); noise(0.08, 0.15, 900); },
    launch() { tone(500, 0.1, "sine", 0.25, 800); },
    portal() { tone(300, 0.25, "sine", 0.2, 1200); },
    stun() { tone(150, 0.3, "sawtooth", 0.1, 60); noise(0.2, 0.2, 600); }
  };

  /* =========================================================
     POWER-UPS
     ========================================================= */
  const POWERS = {
    expand:   { label: "WIDE",   color: "#4dabf7", good: true,  msg: "WIDE PADDLE. Thicc and stress-free." },
    multi:    { label: "×3",     color: "#b197fc", good: true,  msg: "MULTI-BALL! Chaos, but the good kind." },
    laser:    { label: "LASER",  color: "#ff6b6b", good: true,  msg: "LASERS! Pew-pew your problems away." },
    magnet:   { label: "MAGNET", color: "#748ffc", good: true,  msg: "MAGNET: the ball sticks. Click to re-launch. Clingy." },
    slow:     { label: "SLOW",   color: "#38d9a9", good: true,  msg: "SLOW-MO. Like a lazy Sunday morning." },
    life:     { label: "+1 ♥",   color: "#f783ac", good: true,  msg: "+1 LIFE. Treat yourself." },
    shield:   { label: "SHIELD", color: "#22b8cf", good: true,  msg: "SHIELD UP. A safety net for your feelings." },
    fire:     { label: "FIRE",   color: "#ff922b", good: true,  msg: "FIREBALL! Your problems are toast. 🔥" },
    acid:     { label: "ACID",   color: "#82c91e", good: true,  msg: "ACID BALL. Dissolves armor. And worries." },
    electric: { label: "ZAP",    color: "#15aabf", good: true,  msg: "ZAP BALL! Shocking, honestly. ⚡" },
    heavy:    { label: "HEAVY",  color: "#7950f2", good: true,  msg: "WRECKING BALL. Nothing is safe. Not even steel." },
    shrink:   { label: "TINY",   color: "#e03131", good: false, msg: "💀 TINY PADDLE. Oh no. Anyway." },
    fast:     { label: "FAST",   color: "#e03131", good: false, msg: "💀 FAST BALL. Deep breaths. In… out…" },
    invert:   { label: "FLIP",   color: "#e03131", good: false, msg: "💀 CONTROLS FLIPPED. Left is right now. Embrace it." }
  };
  const GOOD_POOL = ["expand", "expand", "multi", "multi", "laser", "magnet", "slow", "slow", "life", "shield", "shield", "fire", "acid", "electric", "heavy"];
  const BAD_POOL = ["shrink", "fast", "invert"];
  const BALL_TYPES = ["fire", "acid", "electric", "heavy"];
  const BALL_COLORS = { normal: null, fire: "#ff922b", acid: "#82c91e", electric: "#22b8cf", heavy: "#7950f2" };
  const DURATION = { expand: 20, laser: 15, magnet: 15, slow: 15, shrink: 12, fast: 10, invert: 8, ball: 12 };

  /* =========================================================
     LEVELS
     ========================================================= */
  const SHAPES = {
    wall:    { name: "The Wall of Emails", rows: 6, fn: () => true },
    pyramid: { name: "Pyramid of Chores", rows: 8, fn: (r, c) => Math.abs(c - 4.5) <= r * 0.6 + 0.5 },
    vee:     { name: "Upside-down Week", rows: 8, fn: (r, c) => Math.abs(c - 4.5) <= (7 - r) * 0.6 + 0.5 },
    checker: { name: "Checkered Past", rows: 8, fn: (r, c) => (r + c) % 2 === 0 },
    diamond: { name: "Diamond Hands", rows: 9, fn: (r, c) => Math.abs(c - 4.5) + Math.abs(r - 4) * 1.1 <= 5 },
    pillars: { name: "Pillars of Procrastination", rows: 9, fn: (r, c) => c % 3 !== 2 },
    heart:   { name: "Self-Love Club", rows: 9, grid: [
      ".XX....XX.", "XXXX..XXXX", "XXXXXXXXXX", "XXXXXXXXXX", ".XXXXXXXX.", "..XXXXXX..", "...XXXX...", "....XX....", ".........."] },
    smiley:  { name: "Forced Smile", rows: 9, grid: [
      "..XXXXXX..", ".XXXXXXXX.", "XX.XXXX.XX", "XX.XXXX.XX", "XXXXXXXXXX", "X.XXXXXX.X", "XX......XX", ".XXXXXXXX.", "..XXXXXX.."] },
    frame:   { name: "Boxed In", rows: 9, fn: (r, c) => r === 0 || r === 8 || c === 0 || c === 9 || (r >= 3 && r <= 5 && c >= 3 && c <= 6) },
    stripes: { name: "Zebra Crossing", rows: 10, fn: (r) => r % 2 === 0 },
    zigzag:  { name: "Mood Swings", rows: 9, fn: (r, c) => Math.abs(((c + r * 2) % 8) - 4) <= 1 || r % 4 === 0 },
    alien:   { name: "Visitors From Monday", rows: 8, grid: [
      "..X....X..", "...X..X...", "..XXXXXX..", ".XX.XX.XX.", "XXXXXXXXXX", "X.XXXXXX.X", "X.X....X.X", "...XX.XX..."] }
  };
  const SHAPE_ORDER = ["wall", "pyramid", "heart", "checker", "diamond", "smiley", "pillars", "vee", "zigzag", "frame", "stripes", "alien"];
  const BOSSES = ["Monday Morning", "The Inbox", "The Deadline", "The Group Chat", "The Final Meeting"];
  const BOSS_LINES = ["Ow! My agenda!", "Rude!", "Let's circle back…", "Per my last email!", "This could've been an email!", "Ouch! Synergy!", "Noted. 😠", "I'll remember this!"];
  const BOSS_AMMO = ["📧", "📅", "📎", "☕", "📊"];

  function tierOf(n) { return n <= 10 ? 0 : n <= 25 ? 1 : n <= 50 ? 2 : 3; }

  function makeBrick(r, c, type, hp, rng) {
    return {
      x: MARGIN + c * (BW + GAP), y: TOP + r * (BH + GAP), w: BW, h: BH,
      baseX: MARGIN + c * (BW + GAP), row: r, col: c,
      type, hp, maxHp: hp, alive: true, flash: 0, regen: 0, moving: null,
      color: ROW_COLORS[r % ROW_COLORS.length], seed: Math.floor(rng() * 1e6)
    };
  }

  function pickType(tier, n, rng, r, rows) {
    const x = rng();
    const top = 1 - r / rows; // upper rows are tougher
    if (tier === 0) {
      if (n >= 6 && x < 0.04) return ["tnt", 1];
      if (n >= 3 && x < 0.04 + 0.12 * top) return ["normal", 2];
      return ["normal", 1];
    }
    const t = [
      null,
      { tnt: 0.05, steel: 0.06, regen: 0.03, h4: 0, h3: 0.05, h2: 0.25 },
      { tnt: 0.06, steel: 0.09, regen: 0.05, h4: 0.05, h3: 0.12, h2: 0.22 },
      { tnt: 0.07, steel: 0.11, regen: 0.07, h4: 0.1, h3: 0.15, h2: 0.2 }
    ][tier];
    let acc = 0;
    if (x < (acc += t.tnt)) return ["tnt", 1];
    if (x < (acc += t.steel)) return ["steel", 3];
    if (x < (acc += t.regen)) return ["regen", 2];
    if (x < (acc += t.h4 * (0.5 + top))) return ["normal", 4];
    if (x < (acc += t.h3 * (0.5 + top))) return ["normal", 3];
    if (x < (acc += t.h2)) return ["normal", 2];
    return ["normal", 1];
  }

  function buildLevel(n) {
    const rng = mulberry32(n * 9973 + 17);
    const tier = tierOf(n);
    const L = { n, tier, bricks: [], portals: null, boss: null, name: "" };

    if (n % 10 === 0) { // boss stage
      const bi = Math.min(BOSSES.length - 1, n / 10 - 1);
      L.name = "BOSS: " + BOSSES[bi];
      const hp = 24 + n * 1.2;
      L.boss = { x: W / 2, y: 170, w: 190, h: 110, hp, maxHp: hp, t: 0, fireT: 2.5, flash: 0, say: "", sayT: 0, alive: true };
      // a shield row under the boss (does not need clearing)
      for (let c = 0; c < COLS; c++) {
        if (c % 3 === 1) continue;
        const b = makeBrick(9, c, tier >= 2 && c % 2 ? "regen" : "normal", tier >= 1 ? 2 : 1, rng);
        b.optional = true;
        L.bricks.push(b);
      }
      return L;
    }

    const key = n === 1 ? "wall" : n <= SHAPE_ORDER.length ? SHAPE_ORDER[n - 1] : SHAPE_ORDER[Math.floor(rng() * SHAPE_ORDER.length)];
    const shape = SHAPES[key];
    L.name = shape.name;
    const rows = n === 1 ? 5 : Math.min(shape.rows + (tier >= 2 ? 1 : 0), shape.grid ? shape.grid.length : 11);
    const filled = (r, c) => shape.grid ? shape.grid[r] && shape.grid[r][c] === "X" : shape.fn(r, c);

    // which rows slide side to side (advanced+)
    const movingRows = new Set();
    if (tier >= 2) {
      movingRows.add(1 + Math.floor(rng() * (rows - 1)));
      if (tier >= 3 && rng() < 0.6) movingRows.add(Math.floor(rng() * rows));
    }

    for (let r = 0; r < rows; r++) {
      const moving = movingRows.has(r);
      for (let c = 0; c < COLS; c++) {
        let on = filled(r, c);
        if (moving) on = c % 2 === 1 && c < 9; // spaced out so they can slide
        if (!on) continue;
        const [type, hp] = n === 1 ? ["normal", 1] : pickType(tier, n, rng, r, rows);
        const b = makeBrick(r, c, moving && type === "steel" ? "normal" : type, hp, rng);
        if (moving) b.moving = { amp: BW + GAP, speed: 0.8 + rng() * 0.6, phase: rng() * 6.28 };
        L.bricks.push(b);
      }
    }
    // intermediate+: steel shields with a narrow entry gap under the formation
    if (tier >= 1 && rng() < 0.45) {
      const gap = 1 + Math.floor(rng() * 8);
      for (let c = 0; c < COLS; c++) {
        if (c === gap || c === gap + 1 || rng() < 0.25) continue;
        L.bricks.push(makeBrick(rows + 1, c, "steel", 3, rng));
      }
    }
    // never leave a level with nothing breakable
    if (!L.bricks.some((b) => b.type !== "steel")) L.bricks.push(makeBrick(0, 4, "normal", 1, rng));

    if ((tier === 2 && rng() < 0.3) || tier === 3) {
      const py = TOP + (rows + 3) * (BH + GAP) + 30;
      L.portals = [{ x: 80, y: Math.min(py, 560), hue: 280 }, { x: W - 80, y: Math.min(py, 560), hue: 190 }];
    }
    return L;
  }

  /* =========================================================
     GAME STATE
     ========================================================= */
  let state = "menu"; // menu | play | paused | clear | over
  let level = null, bricks = [], balls = [], capsules = [], lasers = [], shots = [], particles = [], arcs = [], pending = [];
  let score = 0, lives = 3, nextLifeAt = LIFE_EVERY;
  let combo = 0, comboShow = 0, roundTime = 0, levelTime = 0, livesLostInLevel = 0;
  let effects = {}, ballType = "normal", shield = 0, laserT = 0, shake = 0, time = 0, banner = { text: "", sub: "", t: 0 };
  const paddle = { x: W / 2, w: PADDLE_W, targetX: null, stun: 0, squish: 0 };
  const keys = { left: false, right: false };

  function paddleTargetW() {
    let w = PADDLE_W;
    if (effects.expand) w *= 1.55;
    if (effects.shrink) w *= 0.6;
    return w;
  }
  function ballSpeed() {
    let s = TIER_SPEED[level.tier] + (level.n % 10) * 4;
    if (level.tier >= 2) s *= 1 + Math.min(0.25, roundTime * 0.004);
    if (effects.slow) s *= 0.65;
    if (effects.fast) s *= 1.35;
    return s;
  }

  function newBall(stuck) {
    return { x: paddle.x, y: PADDLE_Y - BALL_R, dx: 0, dy: -1, stuck: !!stuck, off: rand(-12, 12), stickT: 0, idle: 0, trail: [], dead: false, portalCd: 0 };
  }

  function startGame(fromLevel) {
    score = 0; lives = 3; nextLifeAt = LIFE_EVERY;
    loadLevel(fromLevel || 1);
    updateHud();
  }

  function loadLevel(n) {
    level = buildLevel(n);
    bricks = level.bricks;
    capsules = []; lasers = []; shots = []; particles = []; arcs = []; pending = [];
    effects = {}; ballType = "normal"; shield = 0; combo = 0;
    levelTime = 0; livesLostInLevel = 0;
    paddle.x = W / 2; paddle.w = PADDLE_W; paddle.stun = 0; paddle.targetX = null;
    resetRound();
    banner = { text: level.boss ? level.name : "Level " + n, sub: level.boss ? "Defeat it to win!" : level.name, t: 2.6 };
    state = "play";
    hideOverlay();
    updateHud();
  }

  function resetRound() {
    balls = [newBall(true)];
    roundTime = 0;
    combo = 0;
  }

  /* =========================================================
     INPUT
     ========================================================= */
  function toLogicalX(clientX) {
    const r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }
  function aimX(x) { return effects.invert ? W - x : x; }

  let touchStart = null;
  canvas.addEventListener("pointerdown", (e) => {
    audio();
    if (state !== "play") return;
    e.preventDefault();
    paddle.targetX = aimX(toLogicalX(e.clientX));
    if (e.pointerType === "mouse") launch();
    else touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  window.addEventListener("pointermove", (e) => {
    if (state !== "play") return;
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      if (e.clientY < r.top - 80 || e.clientY > r.bottom + 120) return;
    } else if (!touchStart) return;
    paddle.targetX = aimX(toLogicalX(e.clientX));
  });
  window.addEventListener("pointerup", (e) => {
    if (touchStart && state === "play") {
      const moved = Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y);
      if (moved < 12 && performance.now() - touchStart.t < 350) launch();
    }
    touchStart = null;
  });

  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") { keys.left = true; paddle.targetX = null; e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { keys.right = true; paddle.targetX = null; e.preventDefault(); }
    else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
      if (e.target.closest && e.target.closest("button")) return; // let buttons work
      e.preventDefault();
      audio();
      if (state === "play") launch();
      else if (state === "paused") resume();
    } else if (k === "p" || k === "P" || k === "Escape") {
      if (state === "play") pause(); else if (state === "paused") resume();
    }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = false;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") pause(); });
  window.addEventListener("blur", () => { keys.left = keys.right = false; });

  function launch() {
    let any = false;
    for (const b of balls) {
      if (!b.stuck) continue;
      const rel = clamp(b.off / (paddle.w / 2), -1, 1);
      let a = rel * 1.0;
      if (Math.abs(a) < 0.08) a = rand(-0.3, 0.3);
      b.dx = Math.sin(a); b.dy = -Math.cos(a);
      b.stuck = false; b.idle = 0;
      any = true;
    }
    if (any) sfx.launch();
  }

  /* =========================================================
     SCORING / EFFECTS
     ========================================================= */
  function mult() { return Math.min(10, 1 + Math.floor(combo / 3)); }

  function addScore(pts, x, y) {
    const m = mult();
    const total = pts * m;
    score += total;
    if (x != null) floatText("+" + total, x, y, m > 1 ? "#ff6fa5" : null);
    while (score >= nextLifeAt) {
      nextLifeAt += LIFE_EVERY;
      lives++;
      sfx.life();
      toast("🎉 " + (nextLifeAt - LIFE_EVERY).toLocaleString() + " points! Free life. You've earned it.");
    }
    updateHud();
  }

  function floatText(text, x, y, color, size) {
    particles.push({ kind: "text", text, x, y, vx: 0, vy: -50, life: 0.9, max: 0.9, color, size: size || 16 });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count && particles.length < 500; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * (speed || 220);
      particles.push({ kind: "shard", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.4, 0.8), max: 0.8, color, size: rand(3, 7), rot: rand(0, 6) });
    }
  }

  function aliveBreakable() { return bricks.filter((b) => b.alive && b.type !== "steel" && !b.optional); }

  /* =========================================================
     BRICK HITS
     ========================================================= */
  function damageBrick(br, source, ball) {
    if (!br.alive) return false;
    br.flash = 1;
    const cx = br.x + br.w / 2, cy = br.y + br.h / 2;

    if (br.type === "steel") {
      if (source === "ball" && ballType === "heavy") {
        br.hp--; shake = Math.max(shake, 5);
        if (br.hp <= 0) { destroyBrick(br); return true; }
        sfx.steel(); burst(cx, cy, "#adb5bd", 6, 140);
      } else if (source === "ball" || source === "laser") {
        sfx.steel();
      }
      return false;
    }

    let dmg = 1;
    if (source === "explosion" || source === "fire") dmg = br.hp;
    if (source === "ball" && (ballType === "heavy" || ballType === "acid")) dmg = br.hp;
    br.hp -= dmg;
    if (br.hp <= 0) { destroyBrick(br); return true; }

    if (br.type === "regen") br.regen = 4; // heals if you don't finish it quickly
    sfx.hit(combo);
    addScore(10);
    return false;
  }

  function destroyBrick(br) {
    br.alive = false;
    combo++;
    comboShow = 1.2;
    const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
    const color = br.type === "steel" ? "#adb5bd" : br.type === "tnt" ? "#fa5252" : br.color;
    burst(cx, cy, color, 12);
    sfx.brk(combo);
    const base = br.type === "steel" ? 300 : br.type === "tnt" ? 75 : br.type === "regen" ? 120 : 50 * br.maxHp;
    addScore(base, cx, cy);

    if (br.type === "tnt") {
      pending.push({ t: 0.09, fn: () => explode(cx, cy) });
    }
    maybeDrop(cx, cy);
  }

  function explode(x, y) {
    sfx.boom();
    shake = Math.max(shake, 10);
    burst(x, y, "#ff922b", 26, 340);
    burst(x, y, "#ffd43b", 14, 260);
    particles.push({ kind: "ring", x, y, life: 0.4, max: 0.4, r: 95 });
    const R = (BW + GAP) * 1.6;
    for (const b of bricks) {
      if (!b.alive || b.type === "steel") continue;
      const d = Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y);
      if (d < R) damageBrick(b, "explosion");
    }
  }

  function zapFrom(x, y) {
    const targets = bricks
      .filter((b) => b.alive && b.type !== "steel")
      .map((b) => ({ b, d: Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) }))
      .filter((o) => o.d > 1 && o.d < 170)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    if (!targets.length) return;
    sfx.zap();
    for (const o of targets) {
      arcs.push({ x1: x, y1: y, x2: o.b.x + o.b.w / 2, y2: o.b.y + o.b.h / 2, life: 0.18 });
      damageBrick(o.b, "zap");
    }
  }

  function acidSplash(br) {
    sfx.acid();
    burst(br.x + br.w / 2, br.y + br.h / 2, "#82c91e", 10, 160);
    for (const b of bricks) {
      if (b === br || !b.alive || b.type === "steel") continue;
      if (Math.abs(b.row - br.row) <= 1 && Math.abs(b.x - br.x) < (BW + GAP) * 1.5) damageBrick(b, "acid");
    }
  }

  function maybeDrop(x, y) {
    const chance = [0.2, 0.17, 0.15, 0.13][level.tier];
    if (Math.random() > chance || capsules.length > 4) return;
    const badChance = [0, 0.15, 0.25, 0.3][level.tier];
    const type = Math.random() < badChance ? pick(BAD_POOL) : pick(GOOD_POOL);
    capsules.push({ x, y, type, vy: 150, wob: rand(0, 6) });
  }

  function applyPower(type) {
    const p = POWERS[type];
    (p.good ? sfx.power : sfx.bad)();
    toast(p.msg);
    floatText(p.label, paddle.x, PADDLE_Y - 30, p.good ? p.color : "#e03131", 20);
    switch (type) {
      case "expand": effects.expand = DURATION.expand; delete effects.shrink; break;
      case "shrink": effects.shrink = DURATION.shrink; delete effects.expand; break;
      case "slow": effects.slow = DURATION.slow; delete effects.fast; break;
      case "fast": effects.fast = DURATION.fast; delete effects.slow; break;
      case "laser": effects.laser = DURATION.laser; break;
      case "magnet": effects.magnet = DURATION.magnet; break;
      case "invert": effects.invert = DURATION.invert; break;
      case "life": lives++; updateHud(); break;
      case "shield": shield = 3; break;
      case "multi": {
        const extra = [];
        for (const b of balls) {
          if (b.stuck) { b.stuck = false; b.dx = 0; b.dy = -1; }
          for (const da of [-0.4, 0.4]) {
            if (balls.length + extra.length >= MAX_BALLS) break;
            const a = Math.atan2(b.dx, -b.dy) + da;
            const nb = newBall(false);
            Object.assign(nb, { x: b.x, y: b.y, dx: Math.sin(a), dy: -Math.abs(Math.cos(a)) });
            extra.push(nb);
          }
        }
        balls.push(...extra);
        break;
      }
      default: // ball types
        if (BALL_TYPES.includes(type)) { ballType = type; effects.ball = DURATION.ball; }
    }
  }

  /* =========================================================
     UPDATE
     ========================================================= */
  function update(dt) {
    time += dt;
    if (banner.t > 0) banner.t -= dt;
    updateParticles(dt);
    if (state !== "play") return;

    roundTime += dt;
    levelTime += dt;
    if (comboShow > 0) comboShow -= dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 30);

    // timers
    for (const k of Object.keys(effects)) {
      effects[k] -= dt;
      if (effects[k] <= 0) {
        delete effects[k];
        if (k === "ball") ballType = "normal";
      }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i].t -= dt;
      if (pending[i].t <= 0) { const f = pending[i].fn; pending.splice(i, 1); f(); }
    }

    updatePaddle(dt);
    updateBricks(dt);
    updateBalls(dt);
    updateLasers(dt);
    updateCapsules(dt);
    if (level.boss) updateBoss(dt);

    // win / lose
    if (state === "play") {
      if (level.boss && !level.boss.alive) { if (level.boss.deathT <= 0) levelClear(); }
      else if (!level.boss && aliveBreakable().length === 0) levelClear();
      else if (balls.length === 0) loseLife();
    }
  }

  function updatePaddle(dt) {
    paddle.w += (paddleTargetW() - paddle.w) * Math.min(1, dt * 10);
    if (paddle.squish > 0) paddle.squish = Math.max(0, paddle.squish - dt * 5);
    if (paddle.stun > 0) { paddle.stun -= dt; return; }
    let dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (effects.invert) dir = -dir;
    if (dir) paddle.x += dir * 720 * dt;
    else if (paddle.targetX != null) paddle.x += (paddle.targetX - paddle.x) * Math.min(1, dt * 22);
    paddle.x = clamp(paddle.x, paddle.w / 2 + 4, W - paddle.w / 2 - 4);
  }

  function updateBricks(dt) {
    for (const b of bricks) {
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 5);
      if (!b.alive) continue;
      if (b.moving) b.x = b.baseX + Math.sin(time * b.moving.speed + b.moving.phase) * b.moving.amp;
      if (b.regen > 0) {
        b.regen -= dt;
        if (b.regen <= 0 && b.hp < b.maxHp) {
          b.hp = b.maxHp;
          b.flash = 1;
          burst(b.x + b.w / 2, b.y + b.h / 2, "#38d9a9", 6, 80);
        }
      }
    }
  }

  function updateBalls(dt) {
    const speed = ballSpeed();
    for (const b of balls) {
      if (b.portalCd > 0) b.portalCd -= dt;
      if (b.stuck) {
        b.x = paddle.x + clamp(b.off, -paddle.w / 2 + 6, paddle.w / 2 - 6);
        b.y = PADDLE_Y - BALL_R - 1;
        if (b.stickT > 0) { b.stickT -= dt; if (b.stickT <= 0) launch(); }
        continue;
      }
      b.trail.push(b.x, b.y);
      if (b.trail.length > 16) b.trail.splice(0, 2);

      const dist = speed * dt;
      const steps = Math.max(1, Math.ceil(dist / 4));
      const step = dist / steps;
      for (let i = 0; i < steps && !b.dead && !b.stuck; i++) moveBall(b, step);

      // anti-stall: a ball that hasn't touched anything useful for a while gets nudged
      b.idle += dt;
      if (b.idle > 9) {
        const a = Math.atan2(b.dx, -b.dy) + rand(-0.35, 0.35);
        b.dx = Math.sin(a); b.dy = -Math.cos(a);
        b.idle = 6;
      }
    }
    balls = balls.filter((b) => !b.dead);
  }

  function fixAngle(b) { // never let the ball go too flat
    const minY = 0.3;
    if (Math.abs(b.dy) < minY) {
      b.dy = (b.dy < 0 ? -1 : 1) * minY;
      b.dx = Math.sign(b.dx || 1) * Math.sqrt(1 - minY * minY);
    }
  }

  function moveBall(b, step) {
    b.x += b.dx * step;
    b.y += b.dy * step;
    const r = ballType === "heavy" ? BALL_R + 2 : BALL_R;

    // walls
    if (b.x < r) { b.x = r; b.dx = Math.abs(b.dx); sfx.wall(); }
    else if (b.x > W - r) { b.x = W - r; b.dx = -Math.abs(b.dx); sfx.wall(); }
    if (b.y < r) { b.y = r; b.dy = Math.abs(b.dy); sfx.wall(); }

    // portals
    if (level.portals && b.portalCd <= 0) {
      for (let i = 0; i < 2; i++) {
        const p = level.portals[i];
        if (Math.hypot(b.x - p.x, b.y - p.y) < 22) {
          const o = level.portals[1 - i];
          b.x = o.x + b.dx * 30; b.y = o.y + b.dy * 30;
          b.portalCd = 0.6; b.trail = [];
          sfx.portal();
          burst(o.x, o.y, "#b197fc", 10, 120);
          break;
        }
      }
    }

    // paddle
    const pl = paddle.x - paddle.w / 2, pr = paddle.x + paddle.w / 2;
    if (b.dy > 0 && b.y + r >= PADDLE_Y && b.y - r <= PADDLE_Y + PADDLE_H && b.x >= pl - r && b.x <= pr + r) {
      const rel = clamp((b.x - paddle.x) / (paddle.w / 2), -1, 1);
      const a = rel * 1.15; // center = straight up, edges = sharp angle
      b.dx = Math.sin(a); b.dy = -Math.cos(a);
      b.y = PADDLE_Y - r;
      b.idle = 0;
      combo = 0;
      paddle.squish = 1;
      sfx.paddle();
      if (effects.magnet) { b.stuck = true; b.off = b.x - paddle.x; b.stickT = 2.5; }
      return;
    }

    // shield
    if (shield > 0 && b.dy > 0 && b.y + r >= H - 12) {
      b.dy = -Math.abs(b.dy); b.y = H - 12 - r;
      shield--;
      sfx.steel();
      burst(b.x, H - 12, "#22b8cf", 10, 160);
      if (shield === 0) toast("Shield broke. It gave its all. 🫡");
    }

    // fell off
    if (b.y - r > H) { b.dead = true; return; }

    // boss
    const boss = level.boss;
    if (boss && boss.alive && circleRect(b, r, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h)) {
      bounceOff(b, r, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h);
      hitBoss(ballType === "heavy" ? 3 : ballType === "normal" ? 1 : 2, b.x, b.y);
      b.idle = 0;
      return;
    }

    // bricks
    for (const br of bricks) {
      if (!br.alive || !circleRect(b, r, br.x, br.y, br.w, br.h)) continue;
      b.idle = 0;
      if (ballType === "fire" && br.type !== "steel") { // burns straight through
        damageBrick(br, "fire", b);
        continue;
      }
      bounceOff(b, r, br.x, br.y, br.w, br.h);
      if (ballType === "acid" && br.type !== "steel") acidSplash(br);
      damageBrick(br, "ball", b);
      if (ballType === "electric") zapFrom(b.x, b.y);
      return; // one bounce per step
    }
  }

  function circleRect(b, r, x, y, w, h) {
    const cx = clamp(b.x, x, x + w), cy = clamp(b.y, y, y + h);
    const dx = b.x - cx, dy = b.y - cy;
    return dx * dx + dy * dy < r * r;
  }
  function bounceOff(b, r, x, y, w, h) {
    const mx = x + w / 2, my = y + h / 2;
    const ox = r + w / 2 - Math.abs(b.x - mx);
    const oy = r + h / 2 - Math.abs(b.y - my);
    if (ox < oy) {
      const s = b.x < mx ? -1 : 1;
      b.dx = s * Math.abs(b.dx); b.x += s * ox;
    } else {
      const s = b.y < my ? -1 : 1;
      b.dy = s * Math.abs(b.dy); b.y += s * oy;
    }
    fixAngle(b);
  }

  function updateLasers(dt) {
    if (effects.laser) {
      laserT -= dt;
      if (laserT <= 0) {
        laserT = 0.35;
        lasers.push({ x: paddle.x - paddle.w / 2 + 8, y: PADDLE_Y - 4 }, { x: paddle.x + paddle.w / 2 - 8, y: PADDLE_Y - 4 });
        sfx.laser();
      }
    }
    for (const l of lasers) {
      l.y -= 900 * dt;
      if (l.y < -20) { l.dead = true; continue; }
      const boss = level.boss;
      if (boss && boss.alive && Math.abs(l.x - boss.x) < boss.w / 2 && Math.abs(l.y - boss.y) < boss.h / 2) {
        l.dead = true; hitBoss(1, l.x, l.y); continue;
      }
      for (const br of bricks) {
        if (br.alive && l.x >= br.x && l.x <= br.x + br.w && l.y >= br.y && l.y <= br.y + br.h) {
          l.dead = true;
          damageBrick(br, "laser");
          burst(l.x, l.y, "#ff6b6b", 4, 100);
          break;
        }
      }
    }
    lasers = lasers.filter((l) => !l.dead);
  }

  function updateCapsules(dt) {
    for (const c of capsules) {
      c.y += c.vy * dt;
      c.wob += dt * 6;
      if (c.y + 11 >= PADDLE_Y && c.y - 11 <= PADDLE_Y + PADDLE_H && Math.abs(c.x - paddle.x) < paddle.w / 2 + 28) {
        c.dead = true;
        applyPower(c.type);
      } else if (c.y > H + 20) c.dead = true;
    }
    capsules = capsules.filter((c) => !c.dead);
  }

  function hitBoss(dmg, x, y) {
    const boss = level.boss;
    boss.hp -= dmg;
    boss.flash = 1;
    combo++;
    comboShow = 1.2;
    shake = Math.max(shake, 4);
    sfx.boss();
    burst(x, y, "#b197fc", 8, 180);
    addScore(100, x, y);
    if (Math.random() < 0.35) { boss.say = pick(BOSS_LINES); boss.sayT = 1.4; }
    if (Math.random() < 0.18) maybeDrop(x, y);
    if (boss.hp <= 0) {
      boss.alive = false;
      boss.deathT = 1.4; // let it explode before the win screen
      shake = 18;
      for (let i = 0; i < 4; i++) pending.push({ t: i * 0.15, fn: () => explode(boss.x + rand(-70, 70), boss.y + rand(-40, 40)) });
      addScore(5000, boss.x, boss.y);
      toast("💥 You defeated " + BOSSES[Math.min(BOSSES.length - 1, level.n / 10 - 1)] + "! Inner peace +100.", 3000);
    }
  }

  function updateBoss(dt) {
    const boss = level.boss;
    if (boss.flash > 0) boss.flash = Math.max(0, boss.flash - dt * 4);
    if (boss.sayT > 0) boss.sayT -= dt;
    if (!boss.alive) { boss.deathT -= dt; return; }
    boss.t += dt;
    boss.x = W / 2 + Math.sin(boss.t * (0.55 + level.tier * 0.12)) * (W / 2 - boss.w / 2 - 24);
    boss.fireT -= dt;
    if (boss.fireT <= 0 && balls.some((b) => !b.stuck)) {
      boss.fireT = Math.max(0.9, 2.3 - level.tier * 0.35) + rand(0, 0.6);
      shots.push({ x: boss.x + rand(-40, 40), y: boss.y + boss.h / 2, vy: 230 + level.tier * 30, icon: pick(BOSS_AMMO), rot: 0 });
    }
    for (const s of shots) {
      s.y += s.vy * dt;
      s.rot += dt * 3;
      if (s.y > PADDLE_Y - 8 && s.y < PADDLE_Y + PADDLE_H + 8 && Math.abs(s.x - paddle.x) < paddle.w / 2 + 10) {
        s.dead = true;
        paddle.stun = 0.8;
        combo = 0;
        shake = 8;
        sfx.stun();
        floatText("STUNNED 😵", paddle.x, PADDLE_Y - 30, "#e03131", 18);
      } else if (s.y > H + 30) s.dead = true;
    }
    shots = shots.filter((s) => !s.dead);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.kind === "shard") { p.vy += 700 * dt; p.rot += dt * 8; }
    }
    particles = particles.filter((p) => p.life > 0);
    for (const a of arcs) a.life -= dt;
    arcs = arcs.filter((a) => a.life > 0);
  }

  /* =========================================================
     ROUND / LEVEL FLOW
     ========================================================= */
  const LOSE_LINES = ["The ball has left the chat.", "Oops. Happens to the best of us.", "Gravity: 1. You: still awesome.", "That ball had somewhere to be.", "It's fine. Everything is fine. 🙂"];

  function loseLife() {
    lives--;
    livesLostInLevel++;
    sfx.lose();
    shake = 8;
    effects = {}; ballType = "normal"; shield = 0; capsules = []; lasers = []; shots = [];
    updateHud();
    if (lives <= 0) return gameOver();
    toast(pick(LOSE_LINES) + " " + lives + (lives === 1 ? " life" : " lives") + " left.");
    resetRound();
  }

  function levelClear() {
    state = "clear";
    sfx.clear();
    const par = level.boss ? 90 : 40 + aliveCountAtStart() * 0.9;
    const lifeBonus = lives * 500;
    const timeBonus = Math.max(0, Math.round((par - levelTime) * 25));
    const goodActive = Object.keys(effects).filter((k) => k === "ball" || (POWERS[k] && POWERS[k].good)).length + (shield ? 1 : 0);
    const powerBonus = goodActive * 250;
    const total = lifeBonus + timeBonus + powerBonus;
    score += total;
    while (score >= nextLifeAt) { nextLifeAt += LIFE_EVERY; lives++; }
    const stars = 1 + (livesLostInLevel === 0 ? 1 : 0) + (levelTime < par ? 1 : 0);
    const n = level.n;
    starMap[n] = Math.max(starMap[n] || 0, stars);
    store.set("nsh-bb-stars", JSON.stringify(starMap));
    maxLevel = Math.max(maxLevel, n + 1);
    store.set("nsh-bb-level", maxLevel);
    saveBest();
    updateHud();

    const lines = ["Your problems: smashed.", "Bricks: 0. You: 1.", "That was therapeutic.", "Look at you go!", "Stress levels critically low. 😌"];
    showOverlay(
      '<span class="emoji-big">' + (level.boss ? "🏆" : "🎉") + "</span>" +
      "<h2>" + (level.boss ? "Boss defeated!" : "Level " + n + " cleared!") + "</h2>" +
      "<p class='muted'>" + pick(lines) + "</p>" +
      '<div class="stars" aria-label="' + stars + ' of 3 stars">' + [1, 2, 3].map((i) => "<span class='" + (i <= stars ? "" : "off") + "'>⭐</span>").join("") + "</div>" +
      '<table class="bonus-table">' +
      "<tr><td>❤️ Lives left × 500</td><td>+" + lifeBonus.toLocaleString() + "</td></tr>" +
      "<tr><td>⏱️ Speed bonus (" + Math.round(levelTime) + "s)</td><td>+" + timeBonus.toLocaleString() + "</td></tr>" +
      "<tr><td>✨ Unused power-ups</td><td>+" + powerBonus.toLocaleString() + "</td></tr>" +
      "<tr class='total'><td>Score</td><td>" + score.toLocaleString() + "</td></tr></table>" +
      '<div class="btn-row"><button class="ov-btn" data-act="next">Next level →</button></div>',
      true
    );
  }
  function aliveCountAtStart() { return bricks.filter((b) => b.type !== "steel" && !b.optional).length; }

  function gameOver() {
    state = "over";
    const isBest = score > best;
    saveBest();
    const n = level.n;
    showOverlay(
      '<span class="emoji-big">🫠</span>' +
      "<h2>Out of lives.</h2>" +
      "<p class='muted'>…but not out of chill. Nobody's grading this.</p>" +
      "<p style='font-size:1.3rem;font-weight:700;margin-top:12px'>" + score.toLocaleString() + " points" + (isBest ? " 🏅 New best!" : "") + "</p>" +
      "<p class='muted'>Reached level " + n + " · Best " + best.toLocaleString() + "</p>" +
      '<div class="btn-row">' +
      '<button class="ov-btn" data-act="retry">Retry level ' + n + "</button>" +
      '<button class="ov-btn secondary" data-act="restart">Start from level 1</button></div>',
      true
    );
  }

  function saveBest() {
    if (score > best) { best = score; store.set("nsh-bb-best", best); }
    updateHud();
  }

  function pause() {
    if (state !== "play") return;
    state = "paused";
    pauseBtn.textContent = "▶";
    showOverlay(
      '<span class="emoji-big">☕</span><h2>Paused</h2>' +
      "<p class='muted'>Take a sip of something. The bricks will wait. They have nowhere to be.</p>" +
      '<div class="btn-row"><button class="ov-btn" data-act="resume">Resume</button>' +
      '<button class="ov-btn secondary" data-act="menu">Main menu</button></div>',
      true
    );
  }
  function resume() {
    if (state !== "paused") return;
    state = "play";
    pauseBtn.textContent = "⏸";
    hideOverlay();
  }

  function showMenu() {
    state = "menu";
    level = level || buildLevel(1);
    if (!level.n) level = buildLevel(1);
    const totalStars = Object.values(starMap).reduce((a, b) => a + b, 0);
    const legend = [
      ["WIDE / ×3 / LASER", "bigger paddle, more balls, pew pew"],
      ["MAGNET / SLOW", "catch & aim, slow-mo"],
      ["SHIELD / +1 ♥", "safety net, extra life"],
      ["FIRE / ACID / ZAP / HEAVY", "special balls"],
      ["Red 💀 capsules", "traps! dodge them"],
      ["💣 TNT · 🔩 Steel · ♻ Regen", "boom · unbreakable · heals"]
    ].map((l) => "<div><b>" + l[0] + "</b><br>" + l[1] + "</div>").join("");
    showOverlay(
      '<span class="emoji-big">🧱</span>' +
      "<h2>Brick Breaker</h2>" +
      "<p class='muted'>Smash your problems. They're bricks now.</p>" +
      (best ? "<p class='muted'>Best: <b>" + best.toLocaleString() + "</b> · Stars: <b>" + totalStars + " ⭐</b></p>" : "") +
      '<div class="btn-row">' +
      (maxLevel > 1 ? '<button class="ov-btn" data-act="continue">Continue · Level ' + maxLevel + "</button>" : "") +
      '<button class="ov-btn ' + (maxLevel > 1 ? "secondary" : "") + '" data-act="new">' + (maxLevel > 1 ? "New game" : "Play") + "</button></div>" +
      '<div class="legend">' + legend + "</div>",
      true
    );
  }

  function showOverlay(html, cursor) {
    card.innerHTML = html;
    overlay.hidden = false;
    wrap.classList.toggle("show-cursor", !!cursor);
    const btn = card.querySelector("button");
    if (btn) btn.focus({ preventScroll: true });
  }
  function hideOverlay() {
    overlay.hidden = true;
    wrap.classList.remove("show-cursor");
  }

  card.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    audio();
    const act = b.dataset.act;
    if (act === "new" || act === "restart") startGame(1);
    else if (act === "continue") startGame(maxLevel);
    else if (act === "next") loadLevel(level.n + 1);
    else if (act === "retry") startGame(level.n);
    else if (act === "resume") resume();
    else if (act === "menu") { pauseBtn.textContent = "⏸"; saveBest(); showMenu(); }
  });

  pauseBtn.addEventListener("click", () => { if (state === "play") pause(); else if (state === "paused") resume(); });
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    store.set("nsh-bb-sound", soundOn ? "1" : "0");
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    toast(soundOn ? "Sound on. Crunchy." : "Sound off. Silent smashing. 🥷");
  });
  soundBtn.textContent = soundOn ? "🔊" : "🔇";

  function updateHud() {
    hudScore.textContent = score.toLocaleString();
    hudLevel.textContent = level ? level.n : 1;
    hudLives.textContent = lives > 5 ? "❤️×" + lives : "❤️".repeat(Math.max(0, lives)) || "💔";
    hudBest.textContent = Math.max(best, score).toLocaleString();
  }
  let lastLives = 3;
  setInterval(() => { if (lives !== lastLives) { bump(hudLives); lastLives = lives; } }, 200);

  /* =========================================================
     DRAW
     ========================================================= */
  function draw() {
    const th = theme();
    ctx.save();
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);
    // dotted background
    ctx.fillStyle = th.dot;
    for (let y = 20; y < H; y += 32) for (let x = 20; x < W; x += 32) ctx.fillRect(x, y, 2, 2);

    if (shake > 0) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);

    if (level) {
      if (level.portals) drawPortals();
      for (const b of bricks) if (b.alive) drawBrick(b, th);
      if (level.boss) drawBoss(th);
      drawShots();
      drawLasers();
      for (const c of capsules) drawCapsule(c);
      drawShield();
      drawPaddle(th);
      for (const b of balls) drawBall(b, th);
      drawArcs();
      drawParticles(th);
      drawStatus(th);
      drawBanner(th);
    }
    ctx.restore();
  }

  function drawBrick(b, th) {
    const x = b.x, y = b.y, w = b.w, h = b.h;
    let top, bot;
    if (b.type === "steel") { top = th.steel[0]; bot = th.steel[1]; }
    else if (b.type === "tnt") { top = "#ff6b6b"; bot = "#c92a2a"; }
    else if (b.type === "regen") { top = "#63e6be"; bot = "#0ca678"; }
    else {
      const darker = (b.maxHp - 1) * 0.16; // tougher bricks are darker
      top = shade(b.color, -darker + 0.08);
      bot = shade(b.color, -darker - 0.15);
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g;
    rr(x, y, w, h, 7);
    ctx.fill();
    // glossy top
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    rr(x + 4, y + 3, w - 8, h * 0.32, 4);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (b.type === "steel") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (const [px, py] of [[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]]) { ctx.beginPath(); ctx.arc(x + px, y + py, 2, 0, 7); ctx.fill(); }
      if (b.hp < b.maxHp) drawCracks(b, 3 - b.hp + 1);
    } else if (b.type === "tnt") {
      ctx.fillStyle = "#fff";
      ctx.font = "700 12px Fredoka, sans-serif";
      ctx.fillText("💣 TNT", x + w / 2, y + h / 2 + 1);
    } else if (b.type === "regen") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "700 14px Fredoka, sans-serif";
      ctx.fillText("♻", x + w / 2, y + h / 2 + 1);
      if (b.hp < b.maxHp) {
        drawCracks(b, 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(x + 4, y + h - 4, (w - 8) * (1 - b.regen / 4), 2);
      }
    } else if (b.maxHp > 1) {
      // pips show remaining hits
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const n = b.hp, sp = 8, sx = x + w / 2 - ((n - 1) * sp) / 2;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(sx + i * sp, y + h / 2 + 2, 2.4, 0, 7); ctx.fill(); }
      if (b.hp < b.maxHp) drawCracks(b, b.maxHp - b.hp);
    }

    if (b.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + b.flash * 0.7 + ")";
      rr(x, y, w, h, 7);
      ctx.fill();
    }
  }

  function drawCracks(b, n) {
    const r = mulberry32(b.seed);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < n; i++) {
      let px = b.x + 8 + r() * (b.w - 16), py = b.y + 3;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let s = 0; s < 3; s++) { px += (r() - 0.5) * 14; py += b.h / 3.4; ctx.lineTo(px, py); }
      ctx.stroke();
    }
  }

  function drawPaddle(th) {
    const w = paddle.w, x = paddle.x - w / 2;
    const sq = paddle.squish;
    const h = PADDLE_H * (1 - sq * 0.25), y = PADDLE_Y + PADDLE_H - h;
    const stunned = paddle.stun > 0;
    let c1 = "#ff8fbb", c2 = "#e64980";
    if (stunned) { c1 = "#adb5bd"; c2 = "#868e96"; }
    else if (effects.invert) { c1 = "#ff8787"; c2 = "#c92a2a"; }

    if (effects.magnet) {
      ctx.shadowColor = "#748ffc"; ctx.shadowBlur = 18;
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    rr(x - sq * 4, y, w + sq * 8, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    rr(x + 8, y + 3, w - 16, 4, 2);
    ctx.fill();

    if (effects.laser) {
      ctx.fillStyle = "#495057";
      for (const cx of [x + 8, x + w - 8]) { rr(cx - 4, y - 8, 8, 12, 3); ctx.fill(); }
    }
    if (stunned) {
      ctx.font = "16px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("💫", paddle.x + Math.sin(time * 10) * 20, y - 12);
    }
  }

  function drawBall(b, th) {
    const r = ballType === "heavy" ? BALL_R + 2 : BALL_R;
    const col = BALL_COLORS[ballType] || th.ball;
    // trail
    if (ballType !== "normal" || balls.length > 1) {
      for (let i = 0; i < b.trail.length; i += 2) {
        const a = i / b.trail.length;
        ctx.fillStyle = col;
        ctx.globalAlpha = a * 0.35;
        ctx.beginPath(); ctx.arc(b.trail[i], b.trail[i + 1], r * (0.4 + a * 0.6), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = col;
    ctx.shadowBlur = ballType === "normal" ? 8 : 18;
    const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r);
    if (ballType === "normal") {
      g.addColorStop(0, isDark() ? "#ffffff" : "#6b6878"); g.addColorStop(1, col);
    } else {
      g.addColorStop(0, "#fff"); g.addColorStop(0.35, col); g.addColorStop(1, shade(col, -0.35));
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawCapsule(c) {
    const p = POWERS[c.type];
    const w = 58, h = 22, x = c.x - w / 2 + Math.sin(c.wob) * 2, y = c.y - h / 2;
    ctx.shadowColor = p.color; ctx.shadowBlur = 12;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(p.color, 0.25)); g.addColorStop(1, shade(p.color, -0.2));
    ctx.fillStyle = g;
    rr(x, y, w, h, h / 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(x + 6, y + 3, w - 12, 5, 3); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 11px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((p.good ? "" : "💀") + p.label, c.x + Math.sin(c.wob) * 2, c.y + 1);
  }

  function drawLasers() {
    ctx.fillStyle = "#ff6b6b";
    ctx.shadowColor = "#ff6b6b"; ctx.shadowBlur = 10;
    for (const l of lasers) { rr(l.x - 2, l.y - 10, 4, 14, 2); ctx.fill(); }
    ctx.shadowBlur = 0;
  }

  function drawShield() {
    if (!shield) return;
    const y = H - 10;
    ctx.strokeStyle = "#22b8cf";
    ctx.shadowColor = "#22b8cf"; ctx.shadowBlur = 12;
    ctx.lineWidth = 2 + shield;
    ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.2;
    ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(W - 6, y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  function drawPortals() {
    for (const p of level.portals) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = "hsla(" + p.hue + ",80%,65%," + (0.8 - i * 0.22) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22 - i * 6, time * (2 + i) + i, time * (2 + i) + i + 4.5);
        ctx.stroke();
      }
    }
  }

  function drawBoss(th) {
    const b = level.boss;
    if (b.alive) {
      const x = b.x, y = b.y + Math.sin(time * 2) * 4, w = b.w, h = b.h;
      const angry = b.hp < b.maxHp * 0.35;
      // grumpy cloud body
      const body = b.flash > 0 ? "#ffffff" : angry ? "#9c36b5" : "#7950f2";
      ctx.fillStyle = body;
      ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      ctx.beginPath();
      for (const [cx, cy, r] of [[-w * 0.3, 0, h * 0.42], [0, -h * 0.15, h * 0.5], [w * 0.3, 0, h * 0.42], [-w * 0.12, h * 0.15, h * 0.4], [w * 0.14, h * 0.15, h * 0.4]]) {
        ctx.moveTo(x + cx + r, y + cy); ctx.arc(x + cx, y + cy, r, 0, 7);
      }
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // face
      ctx.fillStyle = "#fff";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 26, y - 4, 13, 15, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#2a2833";
      const look = clamp((paddle.x - x) / 200, -1, 1) * 4;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * 26 + look, y + 1, 6, 0, 7); ctx.fill(); }
      ctx.strokeStyle = "#2a2833"; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 40, y - 26 - (angry ? 6 : 0)); ctx.lineTo(x + s * 12, y - 18); ctx.stroke(); }
      ctx.beginPath();
      ctx.arc(x, y + 34, 14, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.lineCap = "butt";
      if (b.sayT > 0) {
        ctx.font = "600 15px Fredoka, sans-serif";
        const tw = ctx.measureText(b.say).width + 20;
        const bx = clamp(x + w / 2 - 10, 10, W - tw - 10), by = y - h / 2 - 34;
        ctx.fillStyle = th.bg; ctx.strokeStyle = th.muted; ctx.lineWidth = 1;
        rr(bx, by, tw, 28, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = th.text; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(b.say, bx + 10, by + 15);
      }
    }
    // health bar
    const bw = W - 160, bx = 80, by = 46;
    ctx.fillStyle = th.chip;
    rr(bx, by, bw, 10, 5); ctx.fill();
    ctx.fillStyle = "#e64980";
    rr(bx, by, Math.max(0, bw * (b.hp / b.maxHp)), 10, 5); ctx.fill();
    ctx.fillStyle = th.text; ctx.font = "600 13px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(level.name.replace("BOSS: ", "😈 "), W / 2, by - 6);
  }

  function drawShots() {
    ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const s of shots) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.sin(s.rot) * 0.4);
      ctx.fillText(s.icon, 0, 0); ctx.restore();
    }
  }

  function drawArcs() {
    ctx.strokeStyle = "#66d9e8"; ctx.lineWidth = 2.5;
    ctx.shadowColor = "#22b8cf"; ctx.shadowBlur = 12;
    for (const a of arcs) {
      ctx.globalAlpha = a.life / 0.18;
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        ctx.lineTo(a.x1 + (a.x2 - a.x1) * t + rand(-9, 9), a.y1 + (a.y2 - a.y1) * t + rand(-9, 9));
      }
      ctx.lineTo(a.x2, a.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  function drawParticles(th) {
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === "shard") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = "#ff922b"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - a) + 10, 0, 7); ctx.stroke();
      } else if (p.kind === "text") {
        ctx.fillStyle = p.color || th.text;
        ctx.font = "700 " + p.size + "px Fredoka, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStatus(th) {
    // active effects (top-left)
    let x = 10;
    const list = Object.keys(effects).map((k) => {
      if (k === "ball") return { label: POWERS[ballType].label, color: POWERS[ballType].color, t: effects[k], max: DURATION.ball };
      return { label: POWERS[k].label, color: POWERS[k].color, t: effects[k], max: DURATION[k] };
    });
    if (shield) list.push({ label: "SHIELD ×" + shield, color: POWERS.shield.color, t: 1, max: 1 });
    ctx.font = "700 11px Fredoka, sans-serif";
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    for (const e of list) {
      const w = ctx.measureText(e.label).width + 16;
      ctx.fillStyle = shade(e.color, 0.55); rr(x, 10, w, 20, 10); ctx.fill();
      ctx.fillStyle = e.color; rr(x, 10, Math.max(20, w * clamp(e.t / e.max, 0, 1)), 20, 10); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(e.label, x + 8, 21);
      x += w + 6;
    }
    // combo (top-right)
    const m = mult();
    if (m > 1 && comboShow > 0) {
      ctx.globalAlpha = clamp(comboShow, 0, 1);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ff6fa5";
      ctx.font = "700 " + (18 + m) + "px Fredoka, sans-serif";
      ctx.fillText("×" + m + " COMBO", W - 12, 22);
      ctx.globalAlpha = 1;
    }
    // launch hint
    if (balls.length && balls.every((b) => b.stuck) && !effects.magnet && state === "play") {
      ctx.textAlign = "center";
      ctx.fillStyle = th.muted;
      ctx.font = "600 16px Fredoka, sans-serif";
      ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3;
      ctx.fillText("Click, tap or press Space to launch", W / 2, PADDLE_Y - 60);
      ctx.globalAlpha = 1;
    }
  }

  function drawBanner(th) {
    if (banner.t <= 0) return;
    const a = clamp(banner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = th.text;
    ctx.font = "700 44px Fredoka, sans-serif";
    ctx.fillText(banner.text, W / 2, H / 2 + 40 - (1 - a) * 20);
    ctx.fillStyle = th.muted;
    ctx.font = "500 20px Fredoka, sans-serif";
    ctx.fillText(banner.sub, W / 2, H / 2 + 82 - (1 - a) * 20);
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     SIZING + LOOP
     ========================================================= */
  function resize() {
    const avail = window.innerHeight - 220;
    const gw = Math.max(280, Math.min(640, window.innerWidth - 32, avail * 0.8));
    document.documentElement.style.setProperty("--game-w", Math.floor(gw) + "px");
    const r = wrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  window.addEventListener("resize", resize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  level = buildLevel(Math.max(1, maxLevel));
  bricks = level.bricks;
  balls = [newBall(true)];
  updateHud();
  showMenu();
  requestAnimationFrame(frame);
})();
