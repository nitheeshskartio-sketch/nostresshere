/* ============ DOMINO UNIVERSE — domino types, worlds, pattern generators and levels ============ */
(function () {
  "use strict";
  const D = (window.DOM = window.DOM || {});
  const TAU = Math.PI * 2;

  /* ---------- domino types ----------
     size: [width, height, thickness] in metres-ish units (a classic domino is 0.5 × 1 × 0.16)
     density scales mass, sound picks the click */
  D.TYPES = [
    { id: "classic", name: "Classic", icon: "🁢", cat: "classic", size: [0.5, 1, 0.16], density: 1, sound: "plastic", mat: "classic", color: "#1d1d1f", desc: "Black with white pips. The original." },
    { id: "colour", name: "Colourful", icon: "🟥", cat: "classic", size: [0.5, 1, 0.16], density: 1, sound: "plastic", mat: "plastic", color: "#ff6b6b", colourable: true, desc: "Any colour you like." },
    { id: "wood", name: "Wooden", icon: "🪵", cat: "classic", size: [0.5, 1, 0.16], density: 0.8, sound: "wood", mat: "wood", color: "#ffffff", desc: "Warm wood with a soft tock." },
    { id: "plastic", name: "Plastic", icon: "🔷", cat: "classic", size: [0.5, 1, 0.16], density: 0.9, sound: "plastic", mat: "gloss", color: "#4dabf7", colourable: true, desc: "Shiny and clicky." },
    { id: "glass", name: "Transparent", icon: "🧊", cat: "classic", size: [0.5, 1, 0.16], density: 1.1, sound: "glass", mat: "glass", color: "#a5d8ff", colourable: true, desc: "See-through, with a crystal tink." },
    { id: "metal", name: "Metallic", icon: "🔩", cat: "classic", size: [0.5, 1, 0.16], density: 2.2, sound: "metal", mat: "metal", color: "#ced4da", colourable: true, desc: "Heavy chrome. Rings when it falls." },
    { id: "heavy", name: "Heavy", icon: "🏋️", cat: "special", size: [0.55, 1, 0.2], density: 4, sound: "heavy", mat: "plastic", color: "#495057", desc: "Four times the weight. Hits hard." },
    { id: "light", name: "Lightweight", icon: "🪶", cat: "special", size: [0.5, 1, 0.12], density: 0.3, sound: "plastic", mat: "plastic", color: "#fff3bf", desc: "Feather-light. Easy to topple." },
    { id: "tall", name: "Extra Tall", icon: "📏", cat: "special", size: [0.55, 1.7, 0.2], density: 1, sound: "wood", mat: "plastic", color: "#b197fc", desc: "Reaches far — spans bigger gaps." },
    { id: "mini", name: "Miniature", icon: "🤏", cat: "special", size: [0.28, 0.55, 0.09], density: 1, sound: "plastic", mat: "plastic", color: "#ffa94d", desc: "Tiny and quick." },
    { id: "neon", name: "Neon Glow", icon: "💡", cat: "special", size: [0.5, 1, 0.16], density: 1, sound: "plastic", mat: "neon", color: "#3bc9db", colourable: true, desc: "Glows in the dark and flashes when it falls." },
    { id: "magnet", name: "Magnetic", icon: "🧲", cat: "special", size: [0.5, 1, 0.16], density: 1.6, sound: "metal", mat: "magnet", color: "#e03131", desc: "Pulls on other magnetic dominoes once it's moving." },
    { id: "boom", name: "Explosive", icon: "💥", cat: "special", size: [0.5, 1, 0.16], density: 1, sound: "plastic", mat: "boom", color: "#fd7e14", desc: "Bursts when it hits the floor, knocking things flying." },
    { id: "trigger", name: "Trigger", icon: "⚡", cat: "special", size: [0.5, 1, 0.16], density: 1, sound: "plastic", mat: "trigger", color: "#fcc419", desc: "When it falls it activates every machine on its channel." }
  ];
  D.typeById = (id) => D.TYPES.find((t) => t.id === id) || D.TYPES[0];

  /* ---------- machine parts ---------- */
  D.OBJECTS = [
    { id: "ball", name: "Ball", icon: "⚽", desc: "Rolls when something hits it." },
    { id: "ramp", name: "Ramp", icon: "📐", desc: "A platform with a slope down. Put a ball on top." },
    { id: "seesaw", name: "Seesaw", icon: "⚖️", desc: "Drop something on one end…" },
    { id: "lever", name: "Lever", icon: "🎚️", desc: "A plank on a pivot near one end." },
    { id: "pendulum", name: "Pendulum", icon: "🕰️", desc: "A heavy ball held up high. Released by a trigger." },
    { id: "block", name: "Falling Block", icon: "🧱", desc: "A heavy block on a shelf. Push it off!" },
    { id: "spinner", name: "Rotating Arm", icon: "🌀", desc: "Starts spinning when its channel is triggered." },
    { id: "slider", name: "Moving Wall", icon: "↔️", desc: "Slides back and forth once triggered." },
    { id: "switch", name: "Trigger Switch", icon: "🔘", desc: "Anything touching it activates its channel." },
    { id: "stairs", name: "Stairs", icon: "🪜", desc: "Steps up. Dominoes climb them one by one." },
    { id: "bridge", name: "Bridge", icon: "🌉", desc: "Steps up, a deck across, steps down." },
    { id: "bell", name: "Finish Bell", icon: "🔔", desc: "Rings when the reaction reaches it." }
  ];

  /* ---------- worlds (friction changes how things slide) ---------- */
  D.ENVS = [
    { id: "table", name: "Wooden Tabletop", icon: "🪵", friction: 0.5, sky: "#f3e9dc", fog: "#f3e9dc" },
    { id: "studio", name: "Minimalist Studio", icon: "⬜", friction: 0.45, sky: "#eef1f5", fog: "#eef1f5" },
    { id: "playground", name: "Colourful Playground", icon: "🎠", friction: 0.6, sky: "#cfefff", fog: "#cfefff" },
    { id: "hall", name: "Giant Indoor Hall", icon: "🏛️", friction: 0.35, sky: "#d9d4cc", fog: "#d9d4cc" },
    { id: "garden", name: "Outdoor Garden", icon: "🌳", friction: 0.7, sky: "#bfe3ff", fog: "#d8efff" },
    { id: "neon", name: "Futuristic Neon Room", icon: "🌃", friction: 0.4, sky: "#0b0f24", fog: "#0b0f24", dark: true },
    { id: "floating", name: "Floating Platforms", icon: "☁️", friction: 0.5, sky: "#9fd3ff", fog: "#c8e7ff" },
    { id: "fantasy", name: "Fantasy World", icon: "🔮", friction: 0.55, sky: "#e5d4ff", fog: "#e5d4ff" }
  ];

  /* =========================================================
     PATTERN GENERATORS — all produce dominoes along a path,
     each turned so its thin side faces along the path
     ========================================================= */
  // resample a polyline every `sp` units, smoothing sharp corners so chains turn reliably
  D.alongPath = function (pts, sp, o) {
    o = o || {};
    const out = [];
    if (pts.length < 2) return out;
    const segs = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > 1e-6) { segs.push([a, b, l, L]); L += l; } }
    if (!segs.length) return out;
    const at = (d) => { for (const [a, b, l, s0] of segs) if (d <= s0 + l + 1e-9) { const k = (d - s0) / l; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } const s = segs[segs.length - 1]; return [s[1][0], s[1][1]]; };
    // even spacing that lands exactly on both ends (the "auto spacing" option)
    const n = Math.max(1, Math.round(L / sp));
    const step = L / n;
    for (let i = 0; i <= n; i++) {
      const d = Math.min(L, i * step);
      const p = at(d), p0 = at(Math.max(0, d - step * 0.5)), p1 = at(Math.min(L, d + step * 0.5));
      const a = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
      out.push(Object.assign({ x: p[0], z: p[1], a, y: o.y || 0, type: o.type || "classic", color: o.color || null }, o.extra || {}));
    }
    return out;
  };
  // pattern outline points (centre cx,cz, size r)
  D.PATTERNS = {
    line: (r) => [[-r, 0], [r, 0]],
    curve: (r) => Array.from({ length: 41 }, (_, i) => { const t = i / 40; return [(t - 0.5) * 2 * r, Math.sin(t * Math.PI * 1.5) * r * 0.45]; }),
    circle: (r) => Array.from({ length: 73 }, (_, i) => { const t = (i / 72) * TAU * 0.97; return [Math.cos(t) * r, Math.sin(t) * r]; }),
    spiral: (r) => Array.from({ length: 241 }, (_, i) => { const t = i / 240, a = t * TAU * 2.6, rr = r * (1 - t * 0.66); return [Math.cos(a) * rr, Math.sin(a) * rr]; }),
    // a triangle wave with softly rounded peaks
    zigzag: (r) => Array.from({ length: 161 }, (_, i) => { const t = i / 160; return [(t - 0.5) * 2 * r, ((r * 0.3 * 2) / Math.PI) * Math.asin(0.9 * Math.sin(t * Math.PI * 5))]; }),
    triangle: (r) => roundCorners(closedPoly(3, r), r * 0.2, true),
    square: (r) => roundCorners([[-r, -r], [r, -r], [r, r], [-r, r], [-r, -r * 0.8]], r * 0.22),
    star: (r) => roundCorners(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.5 : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; }).slice(0, 10).concat([[Math.cos(-Math.PI / 2 + TAU * 0.95) * r * 0.75, Math.sin(-Math.PI / 2 + TAU * 0.95) * r * 0.75]]), r * 0.14),
    heart: (r) => Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * TAU * 0.97 + 0.05; return [(16 * Math.sin(t) ** 3 * r) / 17, (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r) / 17]; }),
    wave: (r) => Array.from({ length: 81 }, (_, i) => { const t = i / 80; return [(t - 0.5) * 2 * r, Math.sin(t * TAU * 2) * r * 0.3]; })
  };
  function closedPoly(n, r) { return Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * TAU * 0.96 - Math.PI / 2; return [Math.cos(a) * r, Math.sin(a) * r]; }); }
  // replace each sharp corner with a little arc
  function roundCorners(p, rad) {
    const out = [p[0]];
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
      const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2), k = Math.min(rad, l1 * 0.45, l2 * 0.45);
      const s = [b[0] + (v1[0] / l1) * k, b[1] + (v1[1] / l1) * k], e = [b[0] + (v2[0] / l2) * k, b[1] + (v2[1] / l2) * k];
      for (let j = 0; j <= 8; j++) { const t = j / 8, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * b[0] + t * t * e[0], u * u * s[1] + 2 * u * t * b[1] + t * t * e[1]]); }
    }
    out.push(p[p.length - 1]);
    return out;
  }
  D.roundCorners = roundCorners;
  D.patternDominoes = function (name, cx, cz, r, rot, sp, o) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const pts = D.PATTERNS[name](r).map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
    return D.alongPath(pts, sp, o);
  };
  // a maze-like winding path on a grid
  D.mazePath = function (cx, cz, cells, cell, seed) {
    let s = seed || 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const seen = new Set(), path = [[0, 0]]; seen.add("0,0");
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let i = 0; i < cells * cells * 2 && path.length < cells * cells * 0.7; i++) {
      const [x, z] = path[path.length - 1];
      const opts = dirs.map(([dx, dz]) => [x + dx, z + dz]).filter(([nx, nz]) => Math.abs(nx) <= cells / 2 && Math.abs(nz) <= cells / 2 && !seen.has(nx + "," + nz));
      if (!opts.length) break;
      const n = opts[Math.floor(rnd() * opts.length)]; seen.add(n[0] + "," + n[1]); path.push(n);
    }
    return roundCorners(path.map(([x, z]) => [cx + x * cell, cz + z * cell]), cell * 0.32);
  };

  /* =========================================================
     LEVELS — each is built from a complete, working solution.
     "gaps" removes dominoes the player has to put back (shown as ghosts).
     ========================================================= */
  const SP = 0.58;
  const line = (x0, z0, x1, z1, o) => D.alongPath([[x0, z0], [x1, z1]], (o && o.sp) || SP, o);
  const pat = (n, cx, cz, r, rot, o) => D.patternDominoes(n, cx, cz, r, rot || 0, (o && o.sp) || SP, o);
  const pathOf = (pts, o) => D.alongPath(pts, (o && o.sp) || SP, o);
  const rainbow = (list) => list.map((d, i) => Object.assign(d, { type: "colour", color: hsl(i / list.length) }));
  function hsl(h) { const f = (n) => { const k = (n + h * 12) % 12; return Math.round(255 * (0.6 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join(""); }
  D.hsl = hsl;
  const gapsAt = (list, idxs) => idxs.map((i) => list[i]);

  D.TIERS = ["Beginner", "Easy", "Medium", "Advanced", "Expert"];
  // steps up, an optional flat deck, steps down — with dominoes on every step
  function bridgeSeg(sx, z, n, deck, type, down) {
    const up = [], dk = [], dn = [];
    for (let i = 0; i < n; i++) up.push({ x: sx + i * 0.6 + 0.12, z, y: (i + 1) * 0.25, a: Math.PI / 2, type });
    const ds = sx + n * 0.6;
    if (deck) dk.push(...line(ds + 0.12, z, ds + deck - 0.32, z, { type, y: n * 0.25 }));
    const de = ds + (deck || 0);
    if (down !== false) for (let j = 0; j < n - 1; j++) dn.push({ x: de + j * 0.6 + 0.12, z, y: (n - 1 - j) * 0.25, a: Math.PI / 2, type });
    return { up, deck: dk, down: dn, all: up.concat(dk, dn), end: de + (down !== false ? (n - 1) * 0.6 : 0), obj: { kind: down !== false ? "bridge" : "stairs", x: sx, z, a: Math.PI / 2, steps: n, deck: deck || 0 } };
  }
  D.bridgeSeg = bridgeSeg;
  function towerAt(cx, cz, levels, type) {
    // pairs of standing dominoes with a flat domino as each floor: the classic domino tower
    const out = [];
    let y = 0;
    for (let L = 0; L < levels; L++) {
      for (const dx of [-0.38, 0.38]) out.push({ x: cx + dx, z: cz, y, a: Math.PI / 2, type: type || "wood" });
      out.push({ x: cx, z: cz, y: y + 1.0, a: Math.PI / 2, type: type || "wood", lying: true });
      y += 1.16;
    }
    return out;
  }
  D.towerAt = towerAt;
  // a long back-and-forth path that fills a big rectangle
  function serpentine(x0, z0, w, rows, gap, o) {
    const pts = [];
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * gap, a = r % 2 ? x0 + w : x0, b = r % 2 ? x0 : x0 + w;
      pts.push([a, z], [b, z]);
      if (r < rows - 1) { const cx = b, cz = z + gap / 2, dir = r % 2 ? -1 : 1; for (let k = 1; k < 12; k++) { const t = -Math.PI / 2 + (k / 12) * Math.PI; pts.push([cx + dir * Math.cos(t) * gap / 2, cz + Math.sin(t) * gap / 2]); } }
    }
    return pathOf(pts, o);
  }
  // a bracket of paths that split in two again and again without ever crossing
  function bracket(x, z, depth, off, out) {
    const seg = pathOf([[x, z], [x + 1.6, z]], { type: "wood" });
    out.push(...seg);
    const ex = seg[seg.length - 1].x;
    if (depth >= 5) { out.push({ x: ex + 0.58, z, a: Math.PI / 2, type: "boom" }); return; }
    for (const s of [-1, 1]) {
      const sx = ex + 0.45, sz = z + s * 0.27, L = 3 + off * 1.1;
      const pts = D.roundCorners([[sx, sz], [sx + 1, sz], [sx + L - 1, z + s * off], [sx + L, z + s * off]], 1.8);
      out.push(...pathOf(pts, { type: "colour", color: hsl((depth + 1) / 7) }));
      bracket(sx + L + 0.58, z + s * off, depth + 1, off / 2, out);
    }
  }
  D.LEVELS = [
    { tier: 0, name: "First Push", desc: "Tap ▶ Start to push the first domino. Watch them all go.", build() { const d = line(-6, 0, 6, 0, { type: "wood" }); return { dominoes: d, starts: [0] }; } },
    { tier: 0, name: "Mind the Gap", desc: "Three dominoes are missing. Place them on the glowing ghosts, then start.", build() { const d = line(-6, 0, 6, 0, { type: "colour", color: "#4dabf7" }); return { dominoes: d, starts: [0], gaps: gapsAt(d, [5, 11, 16]) }; } },
    { tier: 0, name: "Gentle Curve", desc: "Dominoes turn corners if the curve is gentle.", build() { const d = rainbow(pathOf(Array.from({ length: 41 }, (_, i) => { const t = i / 40; return [(t - 0.5) * 14, Math.sin(t * Math.PI * 2) * 3]; }))); return { dominoes: d, starts: [0], gaps: gapsAt(d, [8, 22]) }; } },
    { tier: 0, name: "Small Circle", desc: "A ring that chases its own tail.", build() { const d = pat("circle", 0, 0, 4, 0, { type: "plastic", color: "#ff922b" }); return { dominoes: d, starts: [0], gaps: gapsAt(d, [20]) }; } },
    { tier: 1, name: "Zigzag", desc: "Sharp turns need rounded corners. Fill the corner gaps.", build() { const d = pat("zigzag", 0, 0, 7, 0, { type: "colour", color: "#69db7c" }); return { dominoes: d, starts: [0], gaps: gapsAt(d, [10, 24, 38]) }; } },
    { tier: 1, name: "Split Paths", desc: "One domino can knock over two. The line splits in two.", build() {
      const a = line(-7, 0, -0.6, 0, { type: "wood" });
      a[a.length - 1].type = "heavy"; // a heavier domino has enough punch for two
      const ex = a[a.length - 1].x + 0.42;
      const up = pathOf(D.roundCorners([[ex, 0.27], [ex + 1.2, 0.27], [ex + 5, 3], [ex + 10, 3]], 2.4), { type: "colour", color: "#f783ac" });
      const dn = pathOf(D.roundCorners([[ex, -0.27], [ex + 1.2, -0.27], [ex + 5, -3], [ex + 10, -3]], 2.4), { type: "colour", color: "#4dabf7" });
      return { dominoes: a.concat(up, dn), starts: [0], gaps: [up[7], dn[10]] };
    } },
    { tier: 1, name: "Down the Ramp", desc: "Knock the ball off the platform so it rolls into the next line.", build() {
      const top = line(-5.4, 0, -3.15, 0, { type: "wood", y: 1.2 });
      const low = line(6, 0, 11, 0, { type: "colour", color: "#ff6b6b" });
      return { dominoes: top.concat(low), objects: [{ kind: "ramp", x: -2, z: 0, a: Math.PI / 2, len: 7, plat: 4.4 }, { kind: "ball", x: -2.4, y: 1.2, z: 0 }], starts: [0], gaps: [low[1]] };
    } },
    { tier: 1, name: "Rainbow Road", desc: "Long and winding. Only one gap — can you spot it?", build() { const d = rainbow(pat("wave", 0, 0, 9, 0)); return { dominoes: d, starts: [0], gaps: gapsAt(d, [33]) }; } },
    { tier: 2, name: "Spiral", desc: "From the outside in.", build() { const d = rainbow(pat("spiral", 0, 0, 7, 0)); return { dominoes: d, starts: [0], gaps: gapsAt(d, [30, 60]) }; } },
    { tier: 2, name: "Up the Stairs", desc: "Dominoes climb steps when each step is low enough. Ring the bell!", build() {
      const pre = line(-7, 0, -1.8, 0, { type: "wood" });
      const b = bridgeSeg(-1.2, 0, 6, 0, "wood", false);
      return { dominoes: pre.concat(b.all), objects: [b.obj, { kind: "bell", x: 2.75, z: 0, y: 2.0 }], starts: [0], gaps: [b.up[2]], goal: "bell" };
    } },
    { tier: 2, name: "Bridge Crossing", desc: "Up, across and down again.", build() {
      const pre = line(-8, 0, -3.0, 0, { type: "wood" });
      const b = bridgeSeg(-2.4, 0, 4, 2.6, "wood");
      const post = line(b.end + 0.12, 0, b.end + 5, 0, { type: "colour", color: "#ff922b" });
      return { dominoes: pre.concat(b.all, post), objects: [b.obj], starts: [0], gaps: [b.deck[1]] };
    } },
    { tier: 2, name: "Swing Time", desc: "Hit the switch to release the pendulum. It finishes the job.", build() {
      const a = line(-8, 0, -1.3, 0, { type: "colour", color: "#be4bdb" });
      const b = line(1.05, 1.6, 8, 1.6, { type: "colour", color: "#20c997" });
      return { dominoes: a.concat(b), objects: [{ kind: "switch", x: -0.75, z: 0, channel: 1 }, { kind: "pendulum", x: 0.55, z: 1.6, a: Math.PI / 2, len: 2.4, channel: 1 }], starts: [0], gaps: [a[8]] };
    } },
    { tier: 3, name: "Block Drop", desc: "Shove the heavy block off its shelf onto the next line.", build() {
      const a = line(-7, 0, -0.95, 0, { type: "heavy" });
      const b = line(1.0, 0, 7, 0, { type: "wood" });
      return { dominoes: a.concat(b), objects: [{ kind: "block", x: 0, z: 0, a: Math.PI / 2 }], starts: [0], gaps: [a[4], b[2]] };
    } },
    { tier: 3, name: "The Maze", desc: "A long winding maze path.", build() { const d = pathOf(D.mazePath(0, 0, 6, 2.2, 11), { type: "plastic", color: "#748ffc" }); return { dominoes: d, starts: [0], gaps: gapsAt(d, [Math.floor(d.length * 0.3), Math.floor(d.length * 0.6), d.length - 5]) }; } },
    { tier: 3, name: "Two Pushes", desc: "Three lines but only two pushes. The ⚡ trigger domino starts the spinning arm…", pushes: 2, build() {
      const a = line(-8, -3, 0, -3, { type: "colour", color: "#ff6b6b" });
      const t = [{ x: 0.58, z: -3, a: Math.PI / 2, type: "trigger", channel: 1 }];
      const b = line(-8, 3, 8, 3, { type: "colour", color: "#4dabf7" });
      const c = line(2.7, -0.2, 8, -0.2, { type: "colour", color: "#51cf66" });
      return { dominoes: a.concat(t, b, c), objects: [{ kind: "spinner", x: 2.1, z: -1.4, len: 3, channel: 1, dir: -1 }], starts: [0, a.length + 1], pushes: 2 };
    } },
    { tier: 3, name: "Tower Topple", desc: "Knock down a domino tower and let it spill into the finale.", build() {
      const a = line(-8, 0, -1.0, 0, { type: "wood" });
      const tower = towerAt(0, 0, 3);
      const c = line(1.5, 0, 8, 0, { type: "colour", color: "#fcc419" });
      return { dominoes: a.concat(tower, c), starts: [0], gaps: [a[5]] };
    } },
    { tier: 4, name: "Grand Machine", desc: "Line → switch → pendulum → bridge → spiral. A real Rube Goldberg machine.", build() {
      const a = pathOf(D.roundCorners([[-12, -6], [-6, -6], [-6, -1.6], [-1.3, -1.6]], 1.6), { type: "wood" });
      const b = line(1.05, 0, 3.6, 0, { type: "colour", color: "#20c997" });
      const br = bridgeSeg(4.2, 0, 5, 2.2, "wood");
      // the spiral is turned so it starts heading the same way the chain arrives
      const sp = rainbow(pat("spiral", br.end + 0.7, 4.6, 4.6, -Math.PI / 2));
      return { dominoes: a.concat(b, br.all, sp), objects: [{ kind: "switch", x: -0.75, z: -1.6, channel: 1 }, { kind: "pendulum", x: 0.55, z: 0, a: Math.PI / 2, len: 2.2, channel: 1 }, br.obj], starts: [0], gaps: [a[12], br.up[1], sp[20]] };
    } },
    { tier: 4, name: "Thousand Fall", desc: "Over a thousand dominoes. One push. (Runs at triple speed.)", speed: 3, build() { const d = rainbow(serpentine(-20, -16, 40, 16, 2.1)); return { dominoes: d, starts: [0] }; } },
    { tier: 4, name: "Domino Field", desc: "A path that splits again and again — with explosive fireworks at the end.", build() { const out = []; bracket(-16, 0, 0, 8, out); return { dominoes: out, starts: [0] }; } },
    { tier: 4, name: "Neon Finale", desc: "A glowing neon wave that pours into a giant spiral, in the dark.", env: "neon", build() {
      const wave = Array.from({ length: 160 }, (_, i) => { const x = -25.5 + (i / 159) * 31.5; return [x, 2 * Math.sin((2 * Math.PI * (x + 25.5)) / 14)]; });
      const d = pathOf(wave, { type: "neon" });
      const sp = pat("spiral", 6.6, 8, 6, -Math.PI / 2, { type: "neon" });
      const all = d.concat(sp);
      all.forEach((q, i) => (q.color = hsl(0.5 + (i / all.length) * 0.5)));
      return { dominoes: all, starts: [0] };
    } }
  ];

  // share codes: compact, URL-safe
  D.encode = function (con) {
    const r = (v) => Math.round(v * 100) / 100;
    const json = JSON.stringify({ e: con.env, d: con.dominoes.map((d) => [r(d.x), r(d.y || 0), r(d.z), r(d.a), d.type, d.color || 0, d.lying ? 1 : 0, d.channel || 0, d.scale || 1]), o: con.objects || [] });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  D.decode = function (code) {
    const json = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/-/g, "+").replace(/_/g, "/")))));
    return { env: json.e || "table", dominoes: json.d.map(([x, y, z, a, type, color, lying, channel, scale]) => ({ x, y, z, a, type, color: color || null, lying: !!lying, channel: channel || 0, scale: scale || 1 })), objects: json.o || [] };
  };
})();
