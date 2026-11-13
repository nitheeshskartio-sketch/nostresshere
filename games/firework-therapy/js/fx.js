/* ============ FIREWORK THERAPY — fireworks engine: rockets, bursts, particles, skies ============ */
(function () {
  "use strict";
  const F = (window.FW = window.FW || {});
  const TAU = Math.PI * 2;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- colours ---------- */
  F.COLORS = [
    { id: "red", name: "Red", hex: "#ff3b3b" }, { id: "blue", name: "Blue", hex: "#3b8bff" }, { id: "green", name: "Green", hex: "#3bff7a" },
    { id: "yellow", name: "Yellow", hex: "#ffe83b" }, { id: "purple", name: "Purple", hex: "#a64dff" }, { id: "pink", name: "Pink", hex: "#ff5fc8" },
    { id: "orange", name: "Orange", hex: "#ff8a1f" }, { id: "white", name: "White", hex: "#ffffff" }, { id: "gold", name: "Gold", hex: "#ffc45a" },
    { id: "silver", name: "Silver", hex: "#d7e1ef" }, { id: "rainbow", name: "Rainbow", hex: "rainbow" },
    { id: "cyan", name: "Neon Cyan", hex: "#2ff3ff", need: 40, special: true }, { id: "lava", name: "Lava", hex: "#ff4d1a", need: 80, special: true },
    { id: "mint", name: "Mint", hex: "#8dffcf", need: 150, special: true }, { id: "ice", name: "Ice", hex: "#bfe9ff", need: 250, special: true }
  ];
  const PASTEL = ["#ffb3c7", "#b3d4ff", "#c7ffb3", "#fff0b3", "#e0b3ff", "#ffd6b3"];
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgbHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); }
  function hue(h) { const f = (n) => { const k = (n + h * 12) % 12; return 255 * (0.55 - 0.45 * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return rgbHex(f(0), f(8), f(4)); }
  F.hue = hue;
  // colour for particle i of n at angle a, given the user's palette and mode
  function colourer(pal, mode) {
    const cols = pal.map((c) => c);
    const anyRainbow = cols.includes("rainbow");
    if (cols.length === 1 && anyRainbow) return (i, n, a) => hue(((a / TAU) % 1 + 1) % 1);
    const solid = cols.map((c) => (c === "rainbow" ? hue(Math.random()) : c));
    if (mode === "gradient" && solid.length > 1) {
      return (i, n, a) => {
        const k = ((a / TAU) % 1 + 1) % 1, seg = k * solid.length, j = Math.floor(seg) % solid.length;
        return mix(solid[j], solid[(j + 1) % solid.length], Math.round((seg - Math.floor(seg)) * 6) / 6);
      };
    }
    if (mode === "layers") return (i, n, a, layer) => solid[(layer || 0) % solid.length];
    return (i) => (anyRainbow && Math.random() < 0.5 ? hue(Math.random()) : solid[i % solid.length]);
  }
  F.colourer = colourer;

  /* ---------- shapes (unit outlines) ---------- */
  function sample(fn, n) { const out = []; for (let i = 0; i < n; i++) out.push(fn((i / n) * TAU, i / n)); return out; }
  function normalise(pts) { let m = 0; for (const [x, y] of pts) m = Math.max(m, Math.abs(x), Math.abs(y)); return pts.map(([x, y]) => [x / m, y / m]); }
  function polyline(verts, n) {
    const segs = [], out = []; let L = 0;
    for (let i = 0; i < verts.length; i++) { const a = verts[i], b = verts[(i + 1) % verts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, l]); L += l; }
    for (let i = 0; i < n; i++) { let d = (i / n) * L; for (const [a, b, l] of segs) { if (d <= l) { out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]); break; } d -= l; } }
    return out;
  }
  F.SHAPES = {
    heart: (n) => normalise(sample((t) => [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))], n)),
    star: (n) => polyline(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 0.42 : 1; return [Math.cos(a) * r, Math.sin(a) * r]; }), n),
    circle: (n) => sample((t) => [Math.cos(t), Math.sin(t)], n),
    ring: (n) => sample((t, k) => { const r = k < 0.5 ? 1 : 0.7; const a = t * 2; return [Math.cos(a) * r, Math.sin(a) * r * 0.32]; }, n),
    spiral: (n) => sample((t, k) => { const arm = Math.floor(k * 3), u = (k * 3) % 1, a = u * TAU * 1.3 + (arm * TAU) / 3; return [Math.cos(a) * u, Math.sin(a) * u]; }, n),
    flower: (n) => sample((t) => { const r = 0.45 + 0.55 * Math.abs(Math.sin(3 * t)); return [Math.cos(t) * r, Math.sin(t) * r]; }, n),
    smiley: (n) => {
      const out = sample((t) => [Math.cos(t), Math.sin(t)], Math.round(n * 0.55));
      for (const ex of [-0.36, 0.36]) for (let i = 0; i < n * 0.07; i++) { const a = Math.random() * TAU, r = Math.random() * 0.1; out.push([ex + Math.cos(a) * r, -0.28 + Math.sin(a) * r]); }
      const m = Math.round(n * 0.3); for (let i = 0; i < m; i++) { const a = Math.PI * (0.18 + (0.64 * i) / m); out.push([Math.cos(a) * 0.58, Math.sin(a) * 0.58 - 0.02]); }
      return out;
    },
    diamond: (n) => polyline([[0, -1], [0.72, 0], [0, 1], [-0.72, 0]], n),
    butterfly: (n) => normalise(sample((t) => { const r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5); return [Math.sin(t) * r, -Math.cos(t) * r]; }, n)),
    custom: (n) => { const pts = F.customShape && F.customShape.length > 3 ? F.customShape : [[0, -1], [1, 1], [-1, 1]]; return polyline(pts, n); }
  };

  /* ---------- firework catalogue ---------- */
  F.TYPES = [
    { id: "peony", cat: "classic", name: "Round", icon: "🎆" },
    { id: "sphere", cat: "classic", name: "Big Sphere", icon: "🌕" },
    { id: "sparkle", cat: "classic", name: "Sparkler Pop", icon: "✨" },
    { id: "double", cat: "classic", name: "Double", icon: "⭕" },
    { id: "multilayer", cat: "classic", name: "Multi-layer", icon: "🎯" },
    { id: "giant", cat: "classic", name: "Giant Burst", icon: "💥" },
    { id: "heart", cat: "shape", name: "Heart", icon: "💖", shape: true },
    { id: "star", cat: "shape", name: "Star", icon: "⭐", shape: true },
    { id: "circle", cat: "shape", name: "Circle", icon: "⚪", shape: true },
    { id: "ring", cat: "shape", name: "Ring", icon: "🪐", shape: true },
    { id: "smiley", cat: "shape", name: "Smiley", icon: "😊", shape: true },
    { id: "flower", cat: "shape", name: "Flower", icon: "🌸", shape: true, need: 15 },
    { id: "spiral", cat: "shape", name: "Spiral", icon: "🌀", shape: true, need: 30 },
    { id: "diamond", cat: "shape", name: "Diamond", icon: "💎", shape: true, need: 45 },
    { id: "butterfly", cat: "shape", name: "Butterfly", icon: "🦋", shape: true, need: 60 },
    { id: "custom", cat: "shape", name: "My Shape", icon: "✏️", shape: true },
    { id: "willow", cat: "special", name: "Golden Willow", icon: "🌾" },
    { id: "chrysanthemum", cat: "special", name: "Chrysanthemum", icon: "🌼" },
    { id: "peonyColour", cat: "special", name: "Colour Peony", icon: "🌺" },
    { id: "glitter", cat: "special", name: "Glitter", icon: "🪩", need: 10 },
    { id: "crackle", cat: "special", name: "Crackling", icon: "🎇", need: 20 },
    { id: "rainbow", cat: "special", name: "Rainbow Burst", icon: "🌈", need: 35 },
    { id: "fallingstar", cat: "special", name: "Falling Stars", icon: "🌠", need: 50 },
    { id: "meteor", cat: "special", name: "Meteor Shower", icon: "☄️", need: 70 },
    { id: "waterfall", cat: "special", name: "Waterfall", icon: "🏞️", need: 90 },
    { id: "fountain", cat: "special", name: "Fountain", icon: "⛲", need: 110 },
    { id: "heartstars", cat: "special", name: "Heart of Stars", icon: "💝", need: 140 },
    { id: "converge", cat: "special", name: "Converging Giant", icon: "🎊", need: 170 },
    { id: "rainbowarc", cat: "special", name: "Sky Rainbow", icon: "🌈", need: 200 },
    { id: "supernova", cat: "hidden", name: "Supernova", icon: "🌟", hidden: true, hint: "Set off 8 explosions in under 1.5 seconds" },
    { id: "loverain", cat: "hidden", name: "Love Rain", icon: "💕", hidden: true, hint: "Double-tap a pink or red heart" }
  ];
  F.typeById = (id) => F.TYPES.find((t) => t.id === id);

  /* ---------- skies ---------- */
  F.BGS = [
    { id: "night", name: "Night Sky", icon: "🌙" },
    { id: "starry", name: "Starry Sky", icon: "✨" },
    { id: "city", name: "City Skyline", icon: "🏙️", water: 0.84 },
    { id: "minimal", name: "Dark Minimal", icon: "⬛" },
    { id: "mountain", name: "Mountains", icon: "🏔️", need: 25, water: 0.88 },
    { id: "beach", name: "Beach at Night", icon: "🏖️", need: 50, water: 0.8 },
    { id: "galaxy", name: "Fantasy Galaxy", icon: "🌌", need: 80 },
    { id: "space", name: "Outer Space", icon: "🪐", need: 120 },
    { id: "festival", name: "Festival", icon: "🏮", need: 160 }
  ];

  /* =========================================================
     ENGINE
     ========================================================= */
  const E = (F.engine = {
    particles: [], rockets: [], emitters: [], smoke: [], timers: [], flashes: [],
    settings: { speed: 1, size: 1, count: 1, height: 0.35, trail: 0.55, duration: 1, delay: 0.25 },
    slow: false, timeScale: 1, bg: "night", onExplode: null, onLaunch: null, sound: null
  });
  let cv, ctx, light, lctx, bgc, W = 1, H = 1, dpr = 1;
  const MAXP = 9000;
  E.size = () => [W, H];

  E.init = function (canvas) {
    cv = canvas; ctx = cv.getContext("2d");
    light = document.createElement("canvas"); lctx = light.getContext("2d");
    bgc = document.createElement("canvas");
    E.resize();
    window.addEventListener("resize", E.resize);
    let last = performance.now();
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      E.frame(dt);
    };
    requestAnimationFrame(loop);
  };
  E.resize = function () {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    for (const c of [cv, light, bgc]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    drawBg();
  };
  E.ground = () => H * (bgInfo().water || 0.92);
  const bgInfo = () => F.BGS.find((b) => b.id === E.bg) || F.BGS[0];
  E.setBg = function (id) { E.bg = id; drawBg(); };

  /* ---------- glow sprites ---------- */
  const glowCache = new Map();
  function toHex(c) { if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) return c; const f = F.COLORS.find((q) => q.id === c); return f && f.hex !== "rainbow" ? f.hex : "#ffd8a8"; }
  F.toHex = toHex;
  function glow(col) {
    col = toHex(col);
    let c = glowCache.get(col);
    if (c) return c;
    c = document.createElement("canvas"); c.width = c.height = 32;
    const x = c.getContext("2d"), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.18, col); g.addColorStop(0.45, col + "55"); g.addColorStop(1, col + "00");
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    glowCache.set(col, c);
    return c;
  }

  let smokeC = null;
  function smokeSprite() {
    if (smokeC) return smokeC;
    smokeC = document.createElement("canvas"); smokeC.width = smokeC.height = 64;
    const x = smokeC.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(150,145,160,0.9)"); g.addColorStop(0.5, "rgba(120,118,135,0.45)"); g.addColorStop(1, "rgba(100,100,120,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return smokeC;
  }

  /* ---------- launching ---------- */
  // fw: { type, colors, mode, size }
  E.launch = function (tx, ty, fw, opts) {
    opts = opts || {};
    const t = fw.type;
    if (t === "fountain") { E.explode(tx, E.ground(), fw); return; }
    if (t === "rainbowarc") { E.explode(tx, ty, fw); return; }
    if (t === "converge") {
      // several rockets from different spots meet and become one giant burst
      const n = 5;
      for (let i = 0; i < n; i++) {
        const sx = (W * (i + 0.5)) / n;
        launchRocket(sx, tx, ty, Object.assign({}, fw, { type: "_none" }), 1.2, i === 0 ? () => E.explode(tx, ty, Object.assign({}, fw, { type: "giant", size: (fw.size || 1) * 1.15 })) : null);
      }
      if (E.sound) E.sound.launch(true);
      return;
    }
    const sx = opts.fromX != null ? opts.fromX : tx + R(-W * 0.08, W * 0.08);
    launchRocket(sx, tx, ty, fw, opts.travel || 1, null);
    if (E.sound) E.sound.launch(Math.random() < (fw.whistle != null ? fw.whistle : 0.3));
    if (E.onLaunch) E.onLaunch(fw);
  };
  function launchRocket(sx, tx, ty, fw, travel, done) {
    const sy = E.ground();
    const dist = Math.max(40, sy - ty);
    const T = (0.55 + dist / 900) * travel / E.settings.speed;
    E.rockets.push({ x: sx, y: sy, sx, sy, tx, ty, t: 0, T, fw, done, wob: R(0, 6), col: fw.colors && fw.colors[0] !== "rainbow" ? toHex(fw.colors[0]) : "#ffd8a8" });
  }

  /* ---------- explosions ---------- */
  function part(o) { if (E.particles.length < MAXP) E.particles.push(Object.assign({ px: o.x, py: o.y, age: 0, drag: 1.4, g: 60, a: 1, size: 2.2, flicker: 0 }, o)); }
  E.explode = function (x, y, fw, depth) {
    const s = (fw.size || 1) * E.settings.size, cnt = E.settings.count, dur = E.settings.duration;
    const pal = fw.colors && fw.colors.length ? fw.colors : ["gold"];
    const colOf = colourer(pal.map((c) => (F.COLORS.find((q) => q.id === c) || { hex: c }).hex), fw.mode || "mix");
    const type = fw.type;
    const base = Math.min(W, H) * 0.32 * s;
    let flashCol = colOf(0, 1, 0, 0);
    const sphere = (n, speed, o, layer) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, u = Math.random() * 2 - 1, rr = Math.sqrt(1 - u * u) * (0.85 + Math.random() * 0.15);
        const v = speed * rr;
        part(Object.assign({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(1.1, 1.6) * dur, col: colOf(i, n, a, layer) }, o));
      }
    };
    const shape = (name, n, speed, o) => {
      const pts = F.SHAPES[name](n);
      const rot = name === "heart" || name === "smiley" || name === "custom" || name === "butterfly" ? R(-0.12, 0.12) : R(-0.4, 0.4);
      const cr = Math.cos(rot), sr = Math.sin(rot);
      pts.forEach(([px, py], i) => {
        const vx = (px * cr - py * sr) * speed, vy = (px * sr + py * cr) * speed;
        part(Object.assign({ x, y, vx: vx * R(0.97, 1.03), vy: vy * R(0.97, 1.03), life: 1.7 * dur, col: colOf(i, pts.length, Math.atan2(py, px)), drag: 2.4, g: 22, size: 2.6 }, o));
      });
    };
    const N = (k) => Math.round(k * cnt * Math.min(1.6, s));
    switch (type) {
      case "_none": return;
      case "peony": sphere(N(160), base * 2.2, {}); break;
      case "sphere": sphere(N(300), base * 3.2, { size: 2.6, life: 1.9 * dur }); break;
      case "sparkle": sphere(N(90), base * 1.2, { glitter: true, flicker: 1, size: 1.8 }); break;
      case "double": sphere(N(140), base * 2.4, {}, 0); E.timers.push({ t: 0.32, fn: () => sphere(N(110), base * 1.4, {}, 1) }); break;
      case "multilayer": for (let L = 0; L < 3; L++) sphere(N(110), base * (1 + L * 0.9), {}, L); break;
      case "giant": sphere(N(520), base * 5.2, { size: 3, life: 2.4 * dur, trail: true }); E.flashes.push({ x, y, col: "#ffffff", t: 0, life: 0.8, big: true }); break;
      case "willow": sphere(N(170), base * 2, { drag: 2.2, g: 70, life: 3.6 * dur, willow: true, size: 2 }); break;
      case "chrysanthemum": sphere(N(220), base * 2.6, { trail: true, life: 1.7 * dur }); break;
      case "peonyColour": { const cc = colourer(["#ff3b3b", "#ffe83b", "#3b8bff", "#ff5fc8", "#3bff7a"], "mix"); for (let i = 0; i < N(240); i++) { const a = Math.random() * TAU, v = base * 2.5 * Math.sqrt(1 - Math.random() ** 2); part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(1.2, 1.7) * dur, col: cc(i), size: 2.6 }); } break; }
      case "glitter": sphere(N(180), base * 2.1, { glitter: true, flicker: 1, life: 2.2 * dur, g: 45 }); break;
      case "crackle": sphere(N(130), base * 2, { crackle: true, life: R(1, 1.3) * dur }); break;
      case "rainbow": { const cc = colourer(["rainbow"], "mix"); for (let i = 0; i < N(260); i++) { const a = (i / N(260)) * TAU, v = base * 2.4 * R(0.85, 1); part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6 * dur, col: cc(i, 0, a), size: 2.6 }); } break; }
      case "fallingstar": sphere(N(70), base * 1.6, { star: true, g: 55, drag: 1.2, life: 3 * dur, size: 3 }); break;
      case "meteor": for (let i = 0; i < Math.round(9 * cnt); i++) { const a = Math.PI / 2 + R(-0.9, 0.9), v = base * R(1.6, 2.6); part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, life: 2.6 * dur, col: colOf(i, 9, a), meteor: true, drag: 0.4, g: 180, size: 4 }); } break;
      case "waterfall": {
        const w = Math.min(W * 0.8, base * 3.4), cols = Math.round(26 * cnt);
        for (let i = 0; i < cols; i++) E.emitters.push({ x: x - w / 2 + (w * i) / (cols - 1), y, t: 0, dur: 3.2 * dur, rate: 22, kind: "fall", col: colOf(i, cols, 0) });
        break;
      }
      case "fountain": E.emitters.push({ x, y, t: 0, dur: 3.5 * dur, rate: 110 * cnt, kind: "fountain", col: colOf(0, 1, 0), colOf, power: base * 3.3 }); flashCol = null; break;
      case "heartstars": shape("heart", N(46), base * 2.2, { secondary: "star", life: 1.25 * dur }); break;
      case "rainbowarc": {
        const cx = W / 2, cy = H * 0.95, rr = Math.min(W * 0.46, H * 0.75);
        for (let band = 0; band < 6; band++) for (let i = 0; i < N(70); i++) {
          const a = Math.PI + (i / N(70)) * Math.PI, r = rr - band * 9;
          part({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: R(-6, 6), vy: R(-6, 6), life: 3.2 * dur + R(0, 0.4), col: hue(band / 6), drag: 3, g: 6, size: 3.2, glitter: true });
        }
        flashCol = null;
        break;
      }
      case "supernova": sphere(N(900), base * 6.5, { size: 3, life: 2.8 * dur, trail: true }); for (let i = 0; i < 12; i++) E.timers.push({ t: 0.4 + i * 0.08, fn: () => E.explode(x + R(-W * 0.35, W * 0.35), y + R(-H * 0.3, H * 0.3), { type: "crackle", colors: ["white", "gold"], size: 0.6 }, 1) }); E.flashes.push({ x, y, col: "#ffffff", t: 0, life: 1.2, big: true }); break;
      case "loverain": shape("heart", N(120), base * 2.6, { secondary: "heart", life: 1.3 * dur }); break;
      default:
        if (F.SHAPES[type]) shape(type, N(type === "smiley" ? 150 : 130), base * 2.3, {});
        else sphere(N(160), base * 2.2, {});
    }
    // bright core flash + a puff of smoke
    if (flashCol) E.flashes.push({ x, y, col: flashCol, t: 0, life: 0.35, r: base * 0.9 });
    for (let i = 0; i < 5 * Math.min(2, s); i++) E.smoke.push({ x: x + R(-base * 0.4, base * 0.4), y: y + R(-base * 0.4, base * 0.4), r: base * R(0.25, 0.5), t: 0, life: R(2.5, 4), vx: R(-8, 8), vy: R(-6, 4), col: flashCol || "#888888" });
    if (E.sound && !depth) E.sound.boom(type, s);
    if (E.onExplode && !depth) E.onExplode(x, y, fw);
  };

  /* ---------- update ---------- */
  E.frame = function (dt) {
    const sdt = dt * E.timeScale * (E.slow ? 0.35 : 1);
    update(sdt);
    render(dt, sdt);
  };
  function update(dt) {
    // rockets climb with a wobble and a spark trail
    for (const r of E.rockets) {
      r.t += dt;
      const k = Math.min(1, r.t / r.T), e = 1 - Math.pow(1 - k, 2.2);
      r.px = r.x; r.py = r.y;
      r.x = r.sx + (r.tx - r.sx) * e + Math.sin(r.t * 18 + r.wob) * 1.5 * (1 - k);
      r.y = r.sy + (r.ty - r.sy) * e;
      for (let i = 0; i < 2; i++) part({ x: r.x + R(-1, 1), y: r.y + R(0, 3), vx: R(-15, 15), vy: R(20, 60), life: R(0.3, 0.6), col: i ? "#ffd8a8" : r.col, size: 1.6, drag: 2, g: 80, spark: true });
      if (k >= 1) { r.dead = true; if (r.fw.type !== "_none") E.explode(r.x, r.y, r.fw); if (r.done) r.done(); }
    }
    E.rockets = E.rockets.filter((r) => !r.dead);
    for (let i = E.timers.length - 1; i >= 0; i--) { const t = E.timers[i]; t.t -= dt; if (t.t <= 0) { E.timers.splice(i, 1); t.fn(); } }
    // emitters: waterfalls & fountains
    for (const em of E.emitters) {
      em.t += dt; em.acc = (em.acc || 0) + em.rate * dt;
      while (em.acc >= 1) {
        em.acc--;
        if (em.kind === "fall") part({ x: em.x + R(-2, 2), y: em.y, vx: R(-6, 6), vy: R(10, 50), life: R(1.6, 2.6), col: Math.random() < 0.3 ? "#fff3c4" : em.col, drag: 0.8, g: 90, size: 1.9, glitter: Math.random() < 0.3 });
        else if (em.kind === "fountain") { const a = -Math.PI / 2 + R(-0.32, 0.32), v = em.power * R(0.65, 1) * (1 - Math.max(0, em.t - em.dur + 0.8)); part({ x: em.x + R(-3, 3), y: em.y - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(1, 1.7), col: em.colOf(Math.floor(R(0, 9)), 9, R(0, TAU)), drag: 0.6, g: 260, size: 2, glitter: Math.random() < 0.4 }); }
      }
    }
    E.emitters = E.emitters.filter((em) => em.t < em.dur);
    // particles
    const ps = E.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) {
        if (p.crackle && !p.popped) { p.popped = true; for (let k = 0; k < 4; k++) part({ x: p.x, y: p.y, vx: R(-70, 70), vy: R(-70, 70), life: R(0.08, 0.2), col: "#ffffff", size: 1.6, drag: 3, g: 0 }); if (E.sound && Math.random() < 0.06) E.sound.crackle(); }
        if (p.secondary) { const shp = p.secondary; p.secondary = null; secondary(p.x, p.y, p.col, null, shp); }
        ps[i] = ps[ps.length - 1]; ps.pop(); continue;
      }
      const dk = Math.exp(-p.drag * dt);
      p.px = p.x; p.py = p.y;
      p.vx *= dk; p.vy = p.vy * dk + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      // trailing sparks for willow, chrysanthemum, falling stars, meteors
      if ((p.willow && Math.random() < 0.35) || (p.trail && Math.random() < 0.25) || (p.star && Math.random() < 0.6) || p.meteor) {
        part({ x: p.x, y: p.y, vx: R(-8, 8) + (p.meteor ? -p.vx * 0.05 : 0), vy: R(-4, 10), life: p.willow ? R(0.8, 1.6) : R(0.25, 0.7), col: p.willow ? "#ffb54a" : p.meteor ? "#ffe6b0" : p.col, size: p.willow ? 1.4 : 1.2, drag: 2.5, g: p.willow ? 40 : 30, glitter: p.star });
      }
    }
    for (const s of E.smoke) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 6; }
    E.smoke = E.smoke.filter((s) => s.t < s.life);
    if (E.smoke.length > 120) E.smoke.splice(0, E.smoke.length - 120);
    for (const f of E.flashes) f.t += dt;
    E.flashes = E.flashes.filter((f) => f.t < f.life);
  }
  function secondary(x, y, col, fw, shape) {
    if (shape === "heart") {
      const pts = F.SHAPES.heart(16);
      for (const [px, py] of pts) part({ x, y, vx: px * 40, vy: py * 40, life: 0.9, col, size: 1.7, drag: 2, g: 30 });
    } else {
      const pts = F.SHAPES.star(14);
      for (const [px, py] of pts) part({ x, y, vx: px * 45, vy: py * 45, life: 0.8, col: Math.random() < 0.5 ? "#ffffff" : col, size: 1.7, drag: 2, g: 20, glitter: true });
    }
    if (E.sound && Math.random() < 0.15) E.sound.crackle();
  }

  /* ---------- render ---------- */
  function render(dt, sdt) {
    const info = bgInfo();
    // fade the light layer: shorter trails fade faster
    const keep = 0.55 + E.settings.trail * 0.42;
    const fade = 1 - Math.pow(keep, dt * 60);
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "destination-out";
    lctx.fillStyle = "rgba(0,0,0," + fade.toFixed(3) + ")";
    lctx.fillRect(0, 0, light.width, light.height);
    lctx.globalCompositeOperation = "lighter";
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // streaks, batched by colour and brightness
    const batches = new Map();
    for (const p of E.particles) {
      let a = 1 - p.age / p.life; a = a < 0.35 ? a / 0.35 : 1;
      if (p.flicker || p.glitter) a *= Math.random() < 0.5 ? 1 : 0.2;
      if (a < 0.03) continue;
      const key = p.col + "|" + Math.min(3, Math.floor(a * 4));
      let b = batches.get(key); if (!b) batches.set(key, (b = []));
      b.push(p);
    }
    lctx.lineCap = "round";
    for (const [key, list] of batches) {
      const [col, q] = key.split("|");
      lctx.globalAlpha = (+q + 1) / 4;
      lctx.strokeStyle = col; lctx.lineWidth = 1.8;
      lctx.beginPath();
      for (const p of list) { lctx.moveTo(p.px, p.py); lctx.lineTo(p.x, p.y); }
      lctx.stroke();
      const g = glow(col);
      for (const p of list) { const s = p.size * 4; lctx.drawImage(g, p.x - s / 2, p.y - s / 2, s, s); }
    }
    lctx.globalAlpha = 1;
    for (const r of E.rockets) { lctx.drawImage(glow("#ffe8c0"), r.x - 6, r.y - 6, 12, 12); }
    for (const f of E.flashes) {
      const k = 1 - f.t / f.life, rr = (f.big ? Math.max(W, H) * 0.6 : f.r) * (0.6 + f.t * 2);
      lctx.globalAlpha = k * (f.big ? 0.5 : 0.9);
      lctx.drawImage(glow(f.col === "#ffffff" ? "#ffffff" : f.col), f.x - rr / 2, f.y - rr / 2, rr, rr);
    }
    lctx.globalAlpha = 1;
    // compose: sky, glow of the sky, smoke, light, reflection
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bgc, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let skyGlow = 0; for (const f of E.flashes) skyGlow = Math.max(skyGlow, (1 - f.t / f.life) * (f.big ? 0.35 : 0.12));
    if (skyGlow > 0.01) { ctx.fillStyle = "rgba(255,240,220," + skyGlow + ")"; ctx.fillRect(0, 0, W, H); }
    // soft drifting smoke, faintly lit by the burst
    const sm = smokeSprite();
    for (const s of E.smoke) { const k = Math.sin((s.t / s.life) * Math.PI); ctx.globalAlpha = k * 0.16; ctx.drawImage(sm, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(light, 0, 0);
    if (info.water) {
      // mirror the fireworks in the water below the horizon
      const hy = Math.round(H * info.water * dpr);
      ctx.save(); ctx.beginPath(); ctx.rect(0, hy, cv.width, cv.height - hy); ctx.clip();
      ctx.globalAlpha = 0.28; ctx.translate(0, hy * 2); ctx.scale(1, -1); ctx.drawImage(light, 0, 0); ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    if (info.fg) ctx.drawImage(info.fg, 0, 0);
  }

  E.clear = function () { E.particles.length = 0; E.rockets.length = 0; E.emitters.length = 0; E.smoke.length = 0; E.timers.length = 0; E.flashes.length = 0; lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, light.width, light.height); };
  E.count = () => E.particles.length;
  E.screenshot = () => cv.toDataURL("image/png");

  /* =========================================================
     SKIES (drawn once per resize)
     ========================================================= */
  function drawBg() {
    if (!bgc) return;
    const x = bgc.getContext("2d"), id = E.bg, info = bgInfo();
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rng = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const grad = (stops) => { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    const stars = (n, maxR, alpha) => { for (let i = 0; i < n; i++) { const r = rng() * maxR + 0.3; x.globalAlpha = alpha * (0.3 + rng() * 0.7); x.fillStyle = rng() < 0.15 ? "#ffe9c4" : rng() < 0.15 ? "#c4dcff" : "#ffffff"; x.beginPath(); x.arc(rng() * W, rng() * H * (info.water || 0.92), r, 0, TAU); x.fill(); } x.globalAlpha = 1; };
    const blob = (cx, cy, r, col, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col.replace("A", a)); g.addColorStop(1, col.replace("A", 0)); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); };
    const water = (hy, top, bot) => { const g = x.createLinearGradient(0, hy, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, hy, W, H - hy); x.strokeStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 40; i++) { const yy = hy + rng() * (H - hy), ww = 20 + rng() * 80, xx = rng() * W; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + ww, yy); x.stroke(); } };
    info.fg = null;
    if (id === "night") { grad([[0, "#050816"], [0.6, "#0d1b3a"], [1, "#1c2d52"]]); stars(140, 1.1, 0.8); x.fillStyle = "#070a14"; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= 20; i++) x.lineTo((W * i) / 20, H * 0.92 - Math.sin(i * 1.3) * 10 - rng() * 14); x.lineTo(W, H); x.fill(); }
    else if (id === "starry") { grad([[0, "#02030a"], [1, "#0b1030"]]); x.save(); x.translate(W / 2, H / 2); x.rotate(-0.5); for (let i = 0; i < 40; i++) blob(R(-W, W) * 0.7, R(-60, 60), R(60, 160), "rgba(150,170,255,A)", 0.05); x.restore(); stars(600, 1.3, 0.9); x.fillStyle = "#03040a"; x.fillRect(0, H * 0.94, W, H * 0.06); }
    else if (id === "city") {
      grad([[0, "#060a1c"], [0.7, "#1a1840"], [0.84, "#3a2550"]]); stars(90, 1, 0.6);
      const hy = H * info.water;
      water(hy, "#141832", "#05060f");
      let bx = 0;
      while (bx < W) { const bw = 18 + rng() * 46, bh = 40 + rng() * H * 0.28; x.fillStyle = "#0a0b18"; x.fillRect(bx, hy - bh, bw, bh); for (let wy = hy - bh + 6; wy < hy - 6; wy += 9) for (let wx = bx + 4; wx < bx + bw - 4; wx += 7) if (rng() < 0.3) { x.fillStyle = rng() < 0.7 ? "rgba(255,214,140,0.8)" : "rgba(170,210,255,0.7)"; x.fillRect(wx, wy, 3, 4); } if (rng() < 0.2) { x.fillStyle = "#ff4d4d"; x.fillRect(bx + bw / 2 - 1, hy - bh - 6, 2, 6); } bx += bw + rng() * 4; }
    }
    else if (id === "minimal") { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); }
    else if (id === "mountain") {
      grad([[0, "#050a1a"], [0.75, "#16244a"], [0.88, "#24365c"]]); stars(220, 1.1, 0.8);
      blob(W * 0.8, H * 0.18, 34, "rgba(255,250,230,A)", 0.9); blob(W * 0.8, H * 0.18, 120, "rgba(200,220,255,A)", 0.12);
      const hy = H * info.water;
      for (const [col, amp, off] of [["#1a2440", 0.32, 0.2], ["#101830", 0.24, 0.6], ["#0a0f20", 0.14, 1.4]]) { x.fillStyle = col; x.beginPath(); x.moveTo(0, hy); for (let i = 0; i <= 40; i++) { const xx = (W * i) / 40; x.lineTo(xx, hy - Math.abs(Math.sin(i * 0.37 + off) + Math.sin(i * 0.13 + off * 2) * 0.6) * H * amp * 0.6 - 10); } x.lineTo(W, hy); x.fill(); }
      water(hy, "#0e1630", "#04060e");
    }
    else if (id === "beach") {
      grad([[0, "#040a1e"], [0.6, "#132a52"], [0.8, "#2a3f6a"]]); stars(180, 1.1, 0.8);
      blob(W * 0.25, H * 0.2, 30, "rgba(255,248,220,A)", 0.95); blob(W * 0.25, H * 0.2, 140, "rgba(180,200,255,A)", 0.12);
      const hy = H * info.water;
      water(hy, "#10264a", "#06101e");
      x.fillStyle = "rgba(255,240,200,0.18)"; for (let i = 0; i < 26; i++) x.fillRect(W * 0.25 - 40 + rng() * 80, hy + i * ((H * 0.12) / 26), 8 + rng() * 40, 2);
      x.fillStyle = "#1c1a1a"; x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * 0.93); x.quadraticCurveTo(W * 0.5, H * 0.9, W, H * 0.95); x.lineTo(W, H); x.fill();
      // palm tree
      x.strokeStyle = "#07080c"; x.lineWidth = 7; x.beginPath(); x.moveTo(W * 0.88, H); x.quadraticCurveTo(W * 0.86, H * 0.82, W * 0.9, H * 0.7); x.stroke();
      x.fillStyle = "#07080c"; for (let i = 0; i < 6; i++) { x.save(); x.translate(W * 0.9, H * 0.7); x.rotate(-2.6 + i * 0.9); x.beginPath(); x.ellipse(36, 0, 40, 7, 0.2, 0, TAU); x.fill(); x.restore(); }
    }
    else if (id === "galaxy") { grad([[0, "#0a0420"], [1, "#1a0630"]]); for (let i = 0; i < 26; i++) blob(rng() * W, rng() * H, 80 + rng() * 220, pick(["rgba(190,80,255,A)", "rgba(60,140,255,A)", "rgba(255,90,170,A)", "rgba(80,255,220,A)"]), 0.1); stars(500, 1.4, 0.9); }
    else if (id === "space") {
      grad([[0, "#000004"], [1, "#04030e"]]); stars(450, 1.2, 0.95);
      const px = W * 0.82, py = H * 0.78, pr = Math.min(W, H) * 0.22;
      const g = x.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr); g.addColorStop(0, "#5a7bd0"); g.addColorStop(0.7, "#1f2f6a"); g.addColorStop(1, "#0a0f24");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
      x.strokeStyle = "rgba(180,200,255,0.25)"; x.lineWidth = 6; x.beginPath(); x.ellipse(px, py, pr * 1.6, pr * 0.32, -0.3, 0, TAU); x.stroke();
    }
    else if (id === "festival") {
      grad([[0, "#0c061c"], [0.7, "#2a0f3a"], [1, "#401530"]]); stars(80, 1, 0.6);
      // strings of lanterns
      const lan = document.createElement("canvas"); lan.width = bgc.width; lan.height = bgc.height; const l = lan.getContext("2d"); l.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let s = 0; s < 3; s++) {
        const y0 = H * (0.08 + s * 0.09), sag = 40 + s * 10;
        l.strokeStyle = "rgba(0,0,0,0.7)"; l.lineWidth = 1.5; l.beginPath(); l.moveTo(0, y0); l.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0); l.stroke();
        for (let i = 1; i < 12; i++) { const t = i / 12, lx = W * t, ly = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0; const col = pick(["#ff6b6b", "#ffd43b", "#ff922b", "#f783ac"]); const gg = l.createRadialGradient(lx, ly + 12, 0, lx, ly + 12, 26); gg.addColorStop(0, col + "88"); gg.addColorStop(1, col + "00"); l.fillStyle = gg; l.beginPath(); l.arc(lx, ly + 12, 26, 0, TAU); l.fill(); l.fillStyle = col; l.beginPath(); l.ellipse(lx, ly + 12, 7, 10, 0, 0, TAU); l.fill(); l.fillStyle = "#3a1a10"; l.fillRect(lx - 4, ly + 1, 8, 3); }
      }
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(lan, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = "#08040e"; x.fillRect(0, H * 0.93, W, H * 0.07);
    }
  }
  F.drawBgPreview = function (id, c) {
    // tiny thumbnail of a sky for the menus
    const save = { bg: E.bg, W, H, dpr, bgc };
    E.bg = id; W = c.width; H = c.height; dpr = 1; bgc = c; drawBg();
    E.bg = save.bg; W = save.W; H = save.H; dpr = save.dpr; bgc = save.bgc;
  };
})();
