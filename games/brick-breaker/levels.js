/* ============ Brick Breaker — level generator (300 unique levels) ============
   Grid: 12 columns × up to 15 rows. Cell codes:
   .  empty           1-5  normal brick with that many hits
   S  indestructible  T    TNT (explodes)        B  bonus (+points)
   P  power-up brick  F    speed-up brick        W  slow-down brick
   R  regenerating brick */
(function () {
  "use strict";
  const COLS = 12, MAXR = 15, TOTAL = 300;
  const PITCH_X = 50.33, PITCH_Y = 26; // must match the game (cell width+gap, height+gap)

  function rngOf(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- shape families: f(x, y, p) in pixel-proportional space, x∈[-1,1] ---------- */
  const TAU = Math.PI * 2;
  const polar = (x, y) => [Math.hypot(x, y), Math.atan2(y, x)];
  const FAMILIES = [
    { name: "Circle", f: (x, y, p) => Math.hypot(x, y) < 0.55 * p.s },
    { name: "Ring", f: (x, y, p) => { const d = Math.hypot(x, y); return d < 0.58 * p.s && d > 0.58 * p.s - 0.12 - p.t * 0.12; } },
    { name: "Triangle", f: (x, y, p) => y > -0.4 * p.s && Math.abs(x) < (y + 0.4 * p.s) * 1.1 },
    { name: "Upside-down Triangle", f: (x, y, p) => y < 0.4 * p.s && Math.abs(x) < (0.4 * p.s - y) * 1.1 },
    { name: "Diamond", f: (x, y, p) => Math.abs(x) * 0.8 + Math.abs(y) * 1.1 < 0.55 * p.s },
    { name: "Hexagon", f: (x, y, p) => { const ax = Math.abs(x), ay = Math.abs(y), r = 0.5 * p.s; return ay < r * 0.87 && ax * 0.87 + ay * 0.5 < r * 0.87; } },
    { name: "Star", f: (x, y, p) => { const [d, a] = polar(x, y); const k = 0.5 + 0.5 * Math.cos(5 * (a + p.rot)); return d < (0.24 + 0.36 * k) * p.s; } },
    { name: "Heart", f: (x, y, p) => { const X = x / (0.62 * p.s), Y = -y / (0.62 * p.s) + 0.15; return Math.pow(X * X + Y * Y - 0.3, 3) - X * X * Y * Y * Y * 1.2 < 0; } },
    { name: "Arrow", f: (x, y, p) => (y > -0.05 && Math.abs(x) < 0.13 * p.s + 0.04) || (y <= -0.05 && y > -0.4 && Math.abs(x) < (y + 0.42) * 1.3) },
    { name: "Cross", f: (x, y, p) => Math.abs(x) < 0.12 + p.t * 0.06 || Math.abs(y) < 0.08 + p.t * 0.05 },
    { name: "X Marks the Spot", f: (x, y, p) => Math.abs(Math.abs(x) - Math.abs(y) * 1.6) < 0.14 + p.t * 0.06 },
    { name: "Pyramid", f: (x, y, p) => Math.abs(x) < 0.15 + (y + 0.4) * 1.4 && y > -0.42 },
    { name: "Spiral", f: (x, y, p) => { const [d, a] = polar(x, y); if (d > 0.62) return false; const t = (a + p.rot) / TAU + d * (2 + p.t * 1.5); return (t - Math.floor(t)) < 0.42; } },
    { name: "Zigzag", f: (x, y, p) => Math.abs(y - (Math.abs(((x * 2.2 + p.rot) % 1 + 1) % 1 - 0.5) - 0.25) * 0.9) < 0.07 + p.t * 0.05 || Math.abs(y + 0.25 - (Math.abs(((x * 2.2 + p.rot + 0.5) % 1 + 1) % 1 - 0.5) - 0.25) * 0.9) < 0.06 },
    { name: "Waves", f: (x, y, p) => { const w = Math.sin(x * 5 + p.rot * 3) * 0.08; return Math.abs(((y - w) * 6) % 2) < 1 - p.t * 0.3; } },
    { name: "Checkerboard", f: (x, y, p, r, c) => (r + c + p.k) % 2 === 0 },
    { name: "Layers", f: (x, y, p, r) => r % (2 + (p.k % 2)) !== 1 },
    { name: "Pillars", f: (x, y, p, r, c) => c % (3 + (p.k % 2)) !== 2 },
    { name: "Islands", f: (x, y, p) => p.isl.some(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) < rr) },
    { name: "Scattered Stars", f: (x, y, p, r, c) => ((r * 7 + c * 13 + p.k * 5) % 5) < 2 },
    { name: "Hourglass", f: (x, y, p) => Math.abs(x) < Math.abs(y) * 1.4 + 0.08 && Math.abs(y) < 0.42 },
    { name: "Crescent Moon", f: (x, y, p) => Math.hypot(x, y) < 0.5 * p.s && Math.hypot(x - 0.22 * p.s, y - 0.06) > 0.4 * p.s },
    { name: "Flower", f: (x, y, p) => { const [d, a] = polar(x, y); return d < (0.32 + 0.22 * Math.abs(Math.cos(3 * (a + p.rot)))) * p.s; } },
    { name: "Target", f: (x, y, p) => { const d = Math.hypot(x, y) / p.s; return d < 0.6 && (Math.floor(d / 0.14) % 2 === 0); } },
    { name: "Frame", f: (x, y, p, r, c, R) => r === 0 || r === R - 1 || c === 0 || c === COLS - 1 || (Math.abs(x) < 0.25 && Math.abs(y) < 0.1) },
    { name: "Staircase", f: (x, y, p, r, c, R) => (p.k % 2 ? c : COLS - 1 - c) >= r * (COLS / R) - 1 && (p.k % 2 ? c : COLS - 1 - c) <= r * (COLS / R) + 2 },
    { name: "Chevrons", f: (x, y, p) => (((y + Math.abs(x) * 0.6) * 5 + 10) % 2) < 1 },
    { name: "Space Invader", grid: ["..X......X..", "...X....X...", "..XXXXXXXX..", ".XX.XXXX.XX.", "XXXXXXXXXXXX", "X.XXXXXXXX.X", "X.X......X.X", "...XX..XX..."] },
    { name: "Smiley", f: (x, y, p) => { const d = Math.hypot(x, y); if (d > 0.55) return false; if (Math.hypot(Math.abs(x) - 0.2, y + 0.12) < 0.07) return false; if (y > 0.08 && y < 0.2 && Math.abs(x) < 0.3 && d > 0.25) return false; return true; } },
    { name: "Castle", f: (x, y, p, r, c, R) => (y > -0.15 && Math.abs(x) < 0.7) || (y <= -0.15 && (Math.abs(x) > 0.45 && Math.abs(x) < 0.7)) || (y <= -0.15 && y > -0.3 && c % 2 === 0) },
    { name: "Bridge", f: (x, y, p) => (y < -0.15 && y > -0.35) || (Math.abs(x) > 0.55 && y < 0.35) || (Math.abs(Math.abs(x) - 0.2) < 0.06 && y < 0.35) },
    { name: "Tetris Party", f: (x, y, p, r, c) => ((Math.floor(c / 2) * 3 + Math.floor(r / 2) * 5 + p.k) % 4) !== 0 },
    { name: "Comet", f: (x, y, p) => Math.hypot(x - 0.3, y) < 0.22 || (x < 0.3 && x > -0.75 && Math.abs(y) < 0.04 + (x + 0.75) * 0.17) },
    { name: "Ladder", f: (x, y, p, r, c) => c === 2 || c === 9 || (r % 2 === 0 && c > 2 && c < 9) }
  ];

  /* ---------- helpers ---------- */
  const blank = (R) => Array.from({ length: R }, () => Array(COLS).fill("."));
  const inb = (R, r, c) => r >= 0 && r < R && c >= 0 && c < COLS;
  const count = (g, fn) => g.reduce((a, row) => a + row.filter(fn).length, 0);
  const isBreak = (ch) => ch !== "." && ch !== "S";

  function shapeMask(fam, R, rng) {
    const p = { s: 0.75 + rng() * 0.4, t: rng(), rot: rng() * TAU, k: Math.floor(rng() * 10), ox: (rng() - 0.5) * 0.25, oy: (rng() - 0.5) * 0.08 };
    p.isl = Array.from({ length: 3 + Math.floor(rng() * 3) }, () => [rng() * 1.4 - 0.7, (rng() - 0.5) * (R * PITCH_Y / 300) * 0.8, 0.12 + rng() * 0.12]);
    const g = blank(R);
    const hy = (R * PITCH_Y) / 2;
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
      let on;
      if (fam.grid) { const gr = fam.grid, rr = r - Math.floor((R - gr.length) / 2); on = gr[rr] && gr[rr][c] === "X"; }
      else {
        const x = ((c + 0.5) * PITCH_X - 302) / 302 - p.ox, y = ((r + 0.5) * PITCH_Y - hy) / 302 - p.oy;
        on = fam.f(x, y, p, r, c, R);
      }
      if (on) g[r][c] = "1";
    }
    return g;
  }

  /* ---------- indestructible obstacle schemes ---------- */
  const SCHEMES = {
    pillars(g, R, rng, tier) {
      const n = 1 + Math.floor(rng() * (1 + tier));
      for (let i = 0; i < n; i++) { const r = 1 + Math.floor(rng() * (R - 2)), c = Math.floor(rng() * COLS); g[r][c] = "S"; }
    },
    core(g, R) {
      const cr = (R - 1) / 2, cc = (COLS - 1) / 2;
      for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (isBreak(g[r][c]) && Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1.5) g[r][c] = "S";
    },
    shield(g, R, rng, tier) {
      let bottom = 0;
      for (let r = 0; r < R; r++) if (g[r].some(isBreak)) bottom = r;
      const row = Math.min(R - 1, bottom + 2);
      const gw = tier >= 3 ? 1 : 2;
      const gaps = new Set();
      const ng = tier >= 4 ? 1 : 2;
      for (let i = 0; i < ng; i++) { const s = Math.floor(rng() * (COLS - gw)); for (let k = 0; k < gw; k++) gaps.add(s + k); }
      for (let c = 0; c < COLS; c++) if (!gaps.has(c)) g[row][c] = "S";
    },
    divider(g, R, rng) {
      const c = 3 + Math.floor(rng() * 6);
      const open = rng() < 0.5 ? 0 : 1;
      for (let r = open; r < R - 2; r++) g[r][c] = "S";
    },
    cage(g, R, rng) {
      const h = 3 + Math.floor(rng() * 2), w = 4 + Math.floor(rng() * 2);
      const r0 = Math.floor(rng() * Math.max(1, R - h - 2)), c0 = Math.floor(rng() * (COLS - w));
      const door = c0 + 1 + Math.floor(rng() * (w - 2));
      for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) {
        const edge = r === r0 || r === r0 + h - 1 || c === c0 || c === c0 + w - 1;
        if (edge) g[r][c] = r === r0 + h - 1 && c === door ? "." : "S";
        else if (g[r][c] === ".") g[r][c] = "2";
      }
    },
    tunnel(g, R, rng) {
      const c = 1 + Math.floor(rng() * (COLS - 5)), w = 2 + Math.floor(rng() * 2);
      for (let r = 2; r < R; r++) { g[r][c] = "S"; g[r][c + w + 1] = "S"; }
      for (let r = 0; r < 4; r++) for (let k = 1; k <= w; k++) if (g[r][c + k] === ".") g[r][c + k] = "1";
    },
    deflectors(g, R, rng) {
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const r0 = 1 + Math.floor(rng() * (R - 3)), c0 = Math.floor(rng() * (COLS - 3)), dir = rng() < 0.5 ? 1 : -1;
        for (let k = 0; k < 3; k++) { const r = r0 + k, c = dir > 0 ? c0 + k : c0 + 2 - k; if (inb(R, r, c)) g[r][c] = "S"; }
      }
    },
    outline(g, R, rng) {
      const src = g.map((row) => row.slice());
      let doors = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
        if (src[r][c] !== ".") continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => inb(R, r + dr, c + dc) && isBreak(src[r + dr][c + dc]));
        if (n) { if (rng() < 0.12 || (r > R / 2 && doors < 2 && rng() < 0.3)) { doors++; continue; } g[r][c] = "S"; }
      }
    }
  };

  /* ---------- special bricks & strengths ---------- */
  function assignTypes(g, R, rng, tier, n) {
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
      if (!isBreak(g[r][c])) continue;
      const top = 1 - r / R, x = rng();
      let hp = 1;
      const h = [0.06, 0.22, 0.32, 0.4, 0.48][tier] * (0.6 + top);
      if (n > 3 && x < h) hp = 2;
      if (tier >= 1 && x < h * 0.45) hp = 3;
      if (tier >= 2 && x < h * 0.2) hp = 4;
      if (tier >= 4 && x < h * 0.08) hp = 5;
      let ch = String(Math.max(+g[r][c] || 1, hp));
      const y = rng();
      if (n >= 6 && y < 0.035) ch = "T";
      else if (y < 0.06) ch = "B";
      else if (y < 0.085) ch = "P";
      else if (tier >= 1 && y < 0.1) ch = "F";
      else if (tier >= 1 && y < 0.115) ch = "W";
      else if (tier >= 2 && y < 0.14) ch = "R";
      g[r][c] = ch;
    }
  }

  /* ---------- make every breakable brick reachable ---------- */
  function ensureReachable(g, R) {
    for (let pass = 0; pass < 6; pass++) {
      const seen = Array.from({ length: R }, () => Array(COLS).fill(false));
      const q = [];
      for (let c = 0; c < COLS; c++) if (g[R - 1][c] !== "S") { seen[R - 1][c] = true; q.push([R - 1, c]); }
      while (q.length) {
        const [r, c] = q.shift();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr === -1) continue;
          if (!inb(R, rr, cc) || seen[rr][cc] || g[rr][cc] === "S") continue;
          seen[rr][cc] = true; q.push([rr, cc]);
        }
      }
      // the gap above the top row is open, and joins anything that touches row 0
      if (seen[0].some(Boolean)) for (let c = 0; c < COLS; c++) if (g[0][c] !== "S" && !seen[0][c]) { seen[0][c] = true; q.push([0, c]); }
      while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (!inb(R, rr, cc) || seen[rr][cc] || g[rr][cc] === "S") continue; seen[rr][cc] = true; q.push([rr, cc]); } }
      let fixed = false;
      for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
        if (!isBreak(g[r][c]) || seen[r][c]) continue;
        // punch a doorway: turn the steel below this brick (down to open space) into tough bricks
        for (let rr = r + 1; rr < R; rr++) { if (g[rr][c] === "S") { g[rr][c] = "3"; fixed = true; } if (seen[rr][c]) break; }
        if (fixed) break;
      }
      if (!fixed) return;
    }
  }

  /* ---------- specials ---------- */
  function maze(R, rng) {
    const g = blank(R).map((row) => row.fill("S"));
    const cells = [];
    for (let r = 1; r < R - 1; r += 2) for (let c = 1; c < COLS; c += 2) cells.push([r, c]);
    const vis = new Set();
    const key = (r, c) => r + "," + c;
    const stack = [cells[Math.floor(rng() * cells.length)]];
    g[stack[0][0]][stack[0][1]] = ".";
    vis.add(key(...stack[0]));
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2]).filter(([rr, cc]) => rr > 0 && rr < R - 1 && cc > 0 && cc < COLS && !vis.has(key(rr, cc)));
      if (!nb.length) { stack.pop(); continue; }
      const [rr, cc, wr, wc] = nb[Math.floor(rng() * nb.length)];
      g[wr][wc] = "."; g[rr][cc] = "."; vis.add(key(rr, cc)); stack.push([rr, cc]);
    }
    // braid: knock out some walls so it's playable, and open the bottom
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < COLS - 1; c++) if (g[r][c] === "S" && rng() < 0.22) g[r][c] = ".";
    for (let c = 0; c < COLS; c++) if (rng() < 0.45 || c % 4 === 1) g[R - 1][c] = ".";
    for (let c = 0; c < COLS; c++) if (rng() < 0.3) g[0][c] = ".";
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === "." && r < R - 2 && rng() < 0.75) g[r][c] = "1";
    return g;
  }

  function fortress(R, rng, n) {
    const g = blank(R), cr = (R - 1) / 2, cc = (COLS - 1) / 2;
    const dist = (r, c) => Math.hypot((r - cr) * 1.0, (c - cc) * 0.55);
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
      const d = dist(r, c);
      if (d < 0.9) g[r][c] = "B";
      else if (d < 2.2) g[r][c] = String(Math.min(5, 3 + Math.floor(n / 100)));
      else if (d < 3.1) g[r][c] = (c === Math.round(cc) || c === Math.round(cc) + 1) && r > cr ? "4" : "S";
      else if (d < 4.6) g[r][c] = String(Math.min(5, 2 + Math.floor(n / 80)));
      else if (d < 5.4 && r < R - 1) g[r][c] = rng() < 0.15 ? "T" : "2";
    }
    return g;
  }

  /* ---------- build everything ---------- */
  const SPECIAL_ROT = ["time", "maze", "limited", "moving", "survival"];
  const SPECIAL_INFO = {
    time: { icon: "⏱️", name: "Time Challenge", desc: "Clear every breakable brick before the clock hits zero." },
    maze: { icon: "🌀", name: "Maze", desc: "Steel corridors everywhere. Find the angles." },
    limited: { icon: "💔", name: "One Life", desc: "A single ball. No pressure. (Some pressure.)" },
    moving: { icon: "↔️", name: "Moving Obstacles", desc: "Steel bars slide back and forth. Use them, or dodge them." },
    survival: { icon: "♾️", name: "Survival", desc: "The wall keeps coming down. Break as many bricks as you can!" },
    fortress: { icon: "🏰", name: "Fortress", desc: "Milestone! Smash through layered walls to the treasure core." },
    boss: { icon: "😈", name: "Boss", desc: "Milestone! Defeat the boss." }
  };
  const TIERS = [{ name: "Beginner", from: 1, to: 20 }, { name: "Easy", from: 21, to: 50 }, { name: "Medium", from: 51, to: 100 }, { name: "Advanced", from: 101, to: 200 }, { name: "Expert", from: 201, to: 300 }];
  const tierOf = (n) => TIERS.findIndex((t) => n >= t.from && n <= t.to);

  const LEVELS = [];
  const seen = new Set();
  for (let n = 1; n <= TOTAL; n++) {
    const tier = tierOf(n);
    const L = { n, tier, kind: "normal", lives: 3, movers: [], movingRows: [], time: 0 };
    if (n % 10 === 0) {
      if (n % 20 === 0) { L.kind = "boss"; L.grid = null; L.name = "Boss Battle"; LEVELS.push(L); continue; }
      L.kind = "fortress";
    } else if (n % 10 === 5 && n >= 15) L.kind = SPECIAL_ROT[Math.floor(n / 10) % SPECIAL_ROT.length];
    if (L.kind === "limited") L.lives = 1;

    let g, R, fam, tries = 0;
    do {
      const rng = rngOf(n * 7919 + tries * 104729 + 3);
      R = Math.min(MAXR, 6 + Math.floor(Math.min(8, tier * 1.6 + (n % 10) * 0.12 + rng() * 2)));
      if (L.kind === "fortress") { R = Math.min(MAXR, 11 + tier); g = fortress(R, rng, n); fam = { name: "Fortress" }; }
      else if (L.kind === "maze") { R = Math.min(MAXR, 9 + tier * 2 - (tier % 2)); g = maze(R, rng); fam = { name: "Maze" }; }
      else if (L.kind === "survival") { R = 5; g = blank(R).map((row) => row.fill("1")); fam = { name: "Survival" }; }
      else {
        fam = FAMILIES[(n * 7 + tries * 3 + Math.floor(rng() * 5)) % FAMILIES.length];
        g = shapeMask(fam, R, rng);
        if (n === 1) { R = 5; g = blank(5).map((row) => row.fill("1")); fam = { name: "Warm-up Wall" }; }
        if (count(g, isBreak) < 12) { tries++; continue; }
        // obstacle schemes get richer with difficulty
        const pool = [["pillars"], ["pillars", "core", "shield", "divider"], ["shield", "core", "divider", "cage", "tunnel", "deflectors"], ["shield", "core", "divider", "cage", "tunnel", "deflectors", "outline"], ["cage", "tunnel", "deflectors", "outline", "shield", "divider", "core"]][tier];
        const k = n <= 4 ? 0 : tier === 0 ? (n % 3 === 0 ? 1 : 0) : tier === 1 ? 1 : tier === 2 ? 1 + (rng() < 0.5 ? 1 : 0) : tier === 3 ? 2 : 2 + (rng() < 0.5 ? 1 : 0);
        L.schemes = [];
        for (let i = 0; i < k; i++) { const s = pool[Math.floor(rng() * pool.length)]; L.schemes.push(s); SCHEMES[s](g, R, rng, tier); }
      }
      if (L.kind !== "fortress") assignTypes(g, R, rng, tier, n);
      ensureReachable(g, R);
      if (L.kind === "moving" || (tier >= 3 && rng() < 0.25 && L.kind === "normal")) {
        const nb = L.kind === "moving" ? 2 : 1;
        for (let i = 0; i < nb; i++) L.movers.push({ row: Math.min(MAXR + 2, R + 1 + i * 2), len: 2 + Math.floor(rng() * 2), speed: 0.5 + rng() * 0.5 + tier * 0.08, phase: rng() * TAU });
      }
      if (tier >= 3 && L.kind === "normal" && rng() < 0.3) L.movingRows.push(Math.floor(rng() * Math.min(4, R)));
      tries++;
    } while ((count(g, isBreak) < 10 || seen.has(g.map((r) => r.join("")).join("|"))) && tries < 40);
    seen.add(g.map((r) => r.join("")).join("|"));
    L.grid = g.map((r) => r.join(""));
    L.rows = R;
    L.name = L.kind === "normal" ? fam.name : SPECIAL_INFO[L.kind].name + (fam.name && L.kind !== "fortress" && L.kind !== "maze" && L.kind !== "survival" ? ": " + fam.name : "");
    const breakables = count(g, isBreak);
    if (L.kind === "time") L.time = Math.round(60 + breakables * 1.7);
    LEVELS.push(L);
  }

  window.BBLevels = { LEVELS, TIERS, SPECIAL_INFO, COLS, MAXR, TOTAL, tierOf, unique: seen.size };
})();
