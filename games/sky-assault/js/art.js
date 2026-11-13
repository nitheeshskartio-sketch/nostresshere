/* ============ SKY ASSAULT — procedural art: aircraft, enemies, bosses, bullets, terrain ============ */
(function () {
  "use strict";
  const S = window.SKY, W = S.W;
  const A = (S.art = {});
  const cache = new Map();
  const TAU = Math.PI * 2;

  function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  // build once, then reuse: draw functions get a context whose origin is the sprite centre
  function sprite(key, w, h, draw) {
    if (cache.has(key)) return cache.get(key);
    const c = canvas(w, h), x = c.getContext("2d");
    x.translate(w / 2, h / 2);
    c.meta = draw(x) || {};
    cache.set(key, c);
    return c;
  }
  A.sprite = sprite;
  // black silhouette of a sprite, for shadows
  A.shadow = function (spr) {
    if (spr.shadow) return spr.shadow;
    const c = canvas(spr.width, spr.height), x = c.getContext("2d");
    x.drawImage(spr, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
    spr.shadow = c;
    return c;
  };
  // white silhouette, flashed when something takes a hit
  A.flash = function (spr) {
    if (spr.flashC) return spr.flashC;
    const c = canvas(spr.width, spr.height), x = c.getContext("2d");
    x.drawImage(spr, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    spr.flashC = c;
    return c;
  };
  const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (x, cx, cy, r0, r1, stops) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  A.shade = shade;
  function poly(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); }
  function mirror(x, pts, fill, stroke) { for (const s of [-1, 1]) { poly(x, pts.map(([a, b]) => [a * s, b])); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); } } }

  /* =========================================================
     JET (nose pointing up)
     ========================================================= */
  function drawJet(x, o) {
    const L = o.len, hs = o.span / 2, bw = L * 0.12, nose = -L / 2, tail = L / 2;
    const wy = -L * 0.06, root = L * 0.38, sw = o.sweep;
    const wingFill = lin(x, -hs, 0, hs, 0, [[0, shade(o.wing, -0.25)], [0.5, o.wing], [1, shade(o.wing, -0.25)]]);
    // main wings
    const tipF = o.forward ? wy + root * 0.75 - sw * 0.5 : wy + sw, tipB = tipF + L * 0.1;
    mirror(x, [[bw * 0.6, wy], [hs, tipF], [hs, tipB], [bw * 0.6, wy + root]], wingFill, "rgba(0,0,0,0.25)");
    // tail planes
    mirror(x, [[bw * 0.55, tail - L * 0.22], [hs * 0.42, tail - L * 0.09 + sw * 0.15], [hs * 0.42, tail - L * 0.01], [bw * 0.55, tail - L * 0.03]], wingFill, "rgba(0,0,0,0.25)");
    if (o.canards) mirror(x, [[bw * 0.6, nose + L * 0.27], [hs * 0.34, nose + L * 0.34], [hs * 0.34, nose + L * 0.38], [bw * 0.6, nose + L * 0.36]], wingFill);
    // wingtip accents & panel lines
    x.strokeStyle = o.accent; x.lineWidth = 3;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * hs * 0.72, tipF - sw * 0.28 + 2); x.lineTo(s * hs * 0.72, tipB - (tipB - wy - root) * 0.28 - 1); x.stroke(); }
    x.strokeStyle = "rgba(0,0,0,0.18)"; x.lineWidth = 1;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * bw, wy + root * 0.55); x.lineTo(s * hs * 0.9, tipB - 2); x.stroke(); }
    // engines
    const eng = [];
    const ne = o.engines || 1;
    for (let i = 0; i < ne; i++) eng.push(ne === 1 ? 0 : (i - (ne - 1) / 2) * bw * 0.95);
    // fuselage
    x.beginPath(); x.moveTo(0, nose);
    x.quadraticCurveTo(bw * 1.05, nose + L * 0.18, bw, nose + L * 0.45);
    x.lineTo(bw * (ne > 1 ? 1.05 : 0.8), tail); x.lineTo(-bw * (ne > 1 ? 1.05 : 0.8), tail);
    x.lineTo(-bw, nose + L * 0.45); x.quadraticCurveTo(-bw * 1.05, nose + L * 0.18, 0, nose); x.closePath();
    x.fillStyle = lin(x, -bw, 0, bw, 0, [[0, shade(o.body, -0.35)], [0.45, shade(o.body, 0.25)], [1, shade(o.body, -0.4)]]); x.fill();
    x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 1; x.stroke();
    // spine stripe
    x.fillStyle = o.accent; x.globalAlpha = 0.55; x.fillRect(-1.5, nose + L * 0.42, 3, L * 0.4); x.globalAlpha = 1;
    // canopy
    x.beginPath(); x.ellipse(0, nose + L * 0.26, bw * 0.55, L * 0.11, 0, 0, TAU);
    x.fillStyle = lin(x, 0, nose + L * 0.15, 0, nose + L * 0.37, [[0, "#a5d8ff"], [0.4, "#1c3d5a"], [1, "#0b1a2a"]]); x.fill();
    x.fillStyle = "rgba(255,255,255,0.7)"; x.beginPath(); x.ellipse(-bw * 0.18, nose + L * 0.21, bw * 0.15, L * 0.04, 0, 0, TAU); x.fill();
    // nozzles
    for (const ex of eng) { x.fillStyle = "#212529"; x.beginPath(); x.ellipse(ex, tail - 1, bw * (ne > 1 ? 0.42 : 0.6), 4, 0, 0, TAU); x.fill(); x.fillStyle = "#495057"; x.beginPath(); x.ellipse(ex, tail - 2, bw * (ne > 1 ? 0.28 : 0.4), 2.5, 0, 0, TAU); x.fill(); }
    if (o.gold) { x.strokeStyle = "#fcc419"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, nose + 4); x.lineTo(0, nose + L * 0.12); x.stroke(); }
    return { engines: eng, tail, wingY: tipF + 4, wingX: hs * 0.85 };
  }

  A.player = function (plane, up) {
    up = up || {};
    const pods = Math.min(3, Math.ceil((up.wing || 0) / 2)), racks = (up.missile || 0) >= 3, armour = (up.health || 0) >= 4;
    const L = plane.look, key = "pl_" + plane.id + pods + racks + armour;
    return sprite(key, L.span + 34, L.len + 24, (x) => {
      const m = drawJet(x, L);
      // upgrades you can see: wing gun pods, missile racks, armour plates
      for (const s of [-1, 1]) {
        for (let i = 0; i < pods; i++) { const px = s * (m.wingX - i * 9), py = m.wingY + i * 3; x.fillStyle = "#343a40"; x.fillRect(px - 2.5, py - 12, 5, 16); x.fillStyle = "#ffd43b"; x.fillRect(px - 1.5, py - 14, 3, 3); }
        if (racks) { for (let i = 0; i < 2; i++) { const px = s * (L.len * 0.17 + i * 7), py = 2; x.fillStyle = "#f8f9fa"; x.fillRect(px - 1.8, py - 10, 3.6, 16); x.fillStyle = "#e03131"; x.beginPath(); x.moveTo(px - 1.8, py - 10); x.lineTo(px, py - 15); x.lineTo(px + 1.8, py - 10); x.fill(); } }
      }
      if (armour) { x.fillStyle = "rgba(33,37,41,0.45)"; x.fillRect(-L.len * 0.1, -L.len * 0.05, L.len * 0.2, L.len * 0.3); x.strokeStyle = "rgba(255,255,255,0.35)"; x.strokeRect(-L.len * 0.1, -L.len * 0.05, L.len * 0.2, L.len * 0.3); }
      return m;
    });
  };

  /* =========================================================
     ENEMIES (drawn nose-down)
     ========================================================= */
  const down = (x) => x.rotate(Math.PI);
  const DRAW = {
    fighter: [60, 56, (x) => { down(x); drawJet(x, { len: 46, span: 46, sweep: 14, body: "#868e96", wing: "#c92a2a", accent: "#ffe3e3", engines: 1 }); }],
    missileFighter: [70, 64, (x) => { down(x); drawJet(x, { len: 54, span: 58, sweep: 20, body: "#495057", wing: "#e8590c", accent: "#fff4e6", engines: 2, canards: true }); for (const s of [-1, 1]) for (const k of [0.36, 0.6]) { x.fillStyle = "#f1f3f5"; x.fillRect(s * 29 * k - 1.5, -6, 3, 14); x.fillStyle = "#fa5252"; x.fillRect(s * 29 * k - 1.5, -9, 3, 3); } }],
    drone: [40, 40, (x) => { down(x); poly(x, [[0, -16], [14, 12], [0, 6], [-14, 12]]); x.fillStyle = lin(x, -14, 0, 14, 0, [[0, "#343a40"], [0.5, "#868e96"], [1, "#343a40"]]); x.fill(); x.strokeStyle = "#212529"; x.stroke(); x.fillStyle = "#ff6b6b"; x.beginPath(); x.arc(0, -3, 3.5, 0, TAU); x.fill(); }],
    kamikaze: [36, 44, (x) => { down(x); poly(x, [[0, -20], [9, 8], [4, 18], [-4, 18], [-9, 8]]); x.fillStyle = lin(x, -9, 0, 9, 0, [[0, "#a61e1e"], [0.5, "#ff6b6b"], [1, "#a61e1e"]]); x.fill(); x.fillStyle = "#ffd43b"; x.fillRect(-9, 2, 18, 4); x.fillStyle = "#212529"; x.beginPath(); x.arc(0, -8, 3, 0, TAU); x.fill(); }],
    bomber: [150, 110, (x) => {
      down(x);
      const wing = lin(x, -70, 0, 70, 0, [[0, "#2b3a2a"], [0.5, "#5c7a4f"], [1, "#2b3a2a"]]);
      mirror(x, [[8, -14], [72, -4], [72, 10], [8, 16]], wing, "rgba(0,0,0,0.4)");
      mirror(x, [[6, 34], [30, 40], [30, 46], [6, 46]], wing);
      for (const ex of [-46, -24, 24, 46]) { x.fillStyle = "#343a40"; x.beginPath(); x.ellipse(ex, -10, 6, 13, 0, 0, TAU); x.fill(); x.fillStyle = "#868e96"; x.beginPath(); x.arc(ex, -20, 4, 0, TAU); x.fill(); }
      x.beginPath(); x.ellipse(0, 2, 12, 50, 0, 0, TAU); x.fillStyle = lin(x, -12, 0, 12, 0, [[0, "#2b3a2a"], [0.5, "#7a9a6a"], [1, "#2b3a2a"]]); x.fill(); x.strokeStyle = "rgba(0,0,0,0.4)"; x.stroke();
      x.fillStyle = "#1c3d5a"; x.beginPath(); x.ellipse(0, -36, 6, 8, 0, 0, TAU); x.fill();
      x.fillStyle = "#e03131"; x.beginPath(); x.arc(-56, 4, 5, 0, TAU); x.arc(56, 4, 5, 0, TAU); x.fill();
    }],
    gunship: [110, 110, (x) => {
      down(x);
      x.fillStyle = "#495057"; x.fillRect(-3, 10, 6, 44); mirror(x, [[3, 44], [16, 50], [16, 56], [3, 54]], "#495057");
      mirror(x, [[10, -6], [36, -2], [36, 8], [10, 10]], "#343a40", "#212529");
      for (const s of [-1, 1]) { x.fillStyle = "#212529"; x.fillRect(s * 30 - 5, -10, 10, 22); x.fillStyle = "#fa5252"; x.fillRect(s * 30 - 4, -12, 8, 3); }
      x.beginPath(); x.ellipse(0, -2, 15, 32, 0, 0, TAU); x.fillStyle = lin(x, -15, 0, 15, 0, [[0, "#343a40"], [0.5, "#868e96"], [1, "#343a40"]]); x.fill(); x.strokeStyle = "#212529"; x.stroke();
      x.fillStyle = "#1c3d5a"; x.beginPath(); x.ellipse(0, -22, 9, 9, 0, 0, TAU); x.fill();
      return { rotor: [0, -2, 46] };
    }],
    stealth: [96, 64, (x) => {
      down(x);
      poly(x, [[0, -26], [46, 14], [30, 20], [16, 12], [0, 22], [-16, 12], [-30, 20], [-46, 14]]);
      x.fillStyle = lin(x, 0, -26, 0, 22, [[0, "#495057"], [1, "#16191c"]]); x.fill(); x.strokeStyle = "rgba(160,170,255,0.4)"; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = "#364fc7"; x.beginPath(); x.ellipse(0, -10, 5, 9, 0, 0, TAU); x.fill();
    }],
    tank: [50, 56, (x) => {
      x.fillStyle = "#2b2b2b"; x.fillRect(-19, -24, 9, 48); x.fillRect(10, -24, 9, 48);
      x.fillStyle = "#555"; for (let i = -22; i < 22; i += 5) { x.fillRect(-19, i, 9, 1.5); x.fillRect(10, i, 9, 1.5); }
      x.fillStyle = lin(x, -12, 0, 12, 0, [[0, "#4d5a33"], [0.5, "#7a8a4a"], [1, "#4d5a33"]]); x.fillRect(-12, -20, 24, 40);
      x.strokeStyle = "rgba(0,0,0,0.4)"; x.strokeRect(-12, -20, 24, 40);
      return { turret: [0, 2, 10, 24, "#6b7a3e"] };
    }],
    turret: [56, 56, (x) => { poly(x, Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * TAU + 0.39) * 24, Math.sin((i / 8) * TAU + 0.39) * 24])); x.fillStyle = rad(x, -6, -6, 2, 26, [[0, "#adb5bd"], [1, "#6c757d"]]); x.fill(); x.strokeStyle = "#495057"; x.lineWidth = 2; x.stroke(); return { turret: [0, 0, 11, 22, "#495057", 2] }; }],
    launcher: [50, 66, (x) => {
      x.fillStyle = "#3d4a2a"; x.fillRect(-13, -30, 26, 60); x.fillStyle = "#2b3420"; x.fillRect(-13, 18, 26, 12);
      x.fillStyle = "#1c3d5a"; x.fillRect(-10, 20, 20, 6);
      x.fillStyle = "#6b7a3e"; x.fillRect(-11, -26, 22, 40); x.strokeStyle = "rgba(0,0,0,0.5)"; x.strokeRect(-11, -26, 22, 40);
      for (const mx of [-6, 0, 6]) for (const my of [-22, -8]) { x.fillStyle = "#f1f3f5"; x.beginPath(); x.arc(mx, my, 2.6, 0, TAU); x.fill(); x.fillStyle = "#e03131"; x.beginPath(); x.arc(mx, my, 1.2, 0, TAU); x.fill(); }
    }],
    bunker: [70, 70, (x) => {
      x.fillStyle = "rgba(0,0,0,0.25)"; x.beginPath(); x.arc(3, 3, 31, 0, TAU); x.fill();
      x.fillStyle = rad(x, -10, -10, 4, 32, [[0, "#ced4da"], [0.7, "#868e96"], [1, "#495057"]]); x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.fill();
      x.strokeStyle = "#fcc419"; x.lineWidth = 3; x.setLineDash([6, 5]); x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.stroke(); x.setLineDash([]);
      x.fillStyle = "#212529"; for (let i = 0; i < 4; i++) { x.save(); x.rotate((i / 4) * TAU + 0.78); x.fillRect(-7, 14, 14, 4); x.restore(); }
      x.fillStyle = "#495057"; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill();
    }],
    radar: [64, 64, (x) => { x.fillStyle = "#adb5bd"; x.fillRect(-24, -24, 48, 48); x.strokeStyle = "#495057"; x.lineWidth = 2; x.strokeRect(-24, -24, 48, 48); x.fillStyle = "#dee2e6"; x.fillRect(-16, -16, 32, 32); return { dish: true }; }],
    missileBase: [92, 92, (x) => {
      x.fillStyle = "#868e96"; x.fillRect(-42, -42, 84, 84); x.strokeStyle = "#495057"; x.lineWidth = 3; x.strokeRect(-42, -42, 84, 84);
      x.strokeStyle = "#fcc419"; x.lineWidth = 2; x.strokeRect(-36, -36, 72, 72);
      for (const sx of [-18, 18]) { x.fillStyle = "#343a40"; x.beginPath(); x.arc(sx, 0, 14, 0, TAU); x.fill(); x.fillStyle = "#e9ecef"; x.beginPath(); x.arc(sx, 0, 7, 0, TAU); x.fill(); x.fillStyle = "#e03131"; x.beginPath(); x.arc(sx, 0, 3.5, 0, TAU); x.fill(); }
    }],
    defence: [104, 104, (x) => {
      poly(x, Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * TAU + 0.39) * 48, Math.sin((i / 8) * TAU + 0.39) * 48]));
      x.fillStyle = rad(x, 0, 0, 10, 50, [[0, "#adb5bd"], [1, "#5c636a"]]); x.fill(); x.strokeStyle = "#343a40"; x.lineWidth = 3; x.stroke();
      x.strokeStyle = "#e03131"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 34, 0, TAU); x.stroke();
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.78; x.fillStyle = "#343a40"; x.beginPath(); x.arc(Math.cos(a) * 34, Math.sin(a) * 34, 7, 0, TAU); x.fill(); }
      return { turret: [0, 0, 15, 26, "#343a40", 2] };
    }],
    crate: [52, 52, (x) => {
      x.fillStyle = "#b07a45"; x.fillRect(-21, -21, 42, 42); x.strokeStyle = "#6b4423"; x.lineWidth = 3; x.strokeRect(-21, -21, 42, 42);
      x.beginPath(); x.moveTo(-21, -21); x.lineTo(21, 21); x.moveTo(21, -21); x.lineTo(-21, 21); x.stroke();
      starPath(x, 0, 0, 12, 5.5); x.fillStyle = "#ffd43b"; x.fill(); x.strokeStyle = "#e67700"; x.lineWidth = 1.5; x.stroke();
    }],
    battleship: [70, 180, (x) => { hull(x, 30, 170, "#6c757d"); deck(x, 170); x.fillStyle = "#495057"; x.fillRect(-12, -14, 24, 30); x.fillStyle = "#343a40"; x.fillRect(-7, -6, 14, 12); return { turrets: [[0, -50], [0, 44], [0, 72]], naval: true }; }],
    carrier: [86, 200, (x) => {
      hull(x, 40, 190, "#5c636a");
      x.fillStyle = "#343a40"; x.fillRect(-34, -84, 68, 170);
      x.strokeStyle = "#f8f9fa"; x.lineWidth = 2; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(0, -80); x.lineTo(0, 80); x.stroke(); x.setLineDash([]);
      x.strokeStyle = "#fcc419"; x.beginPath(); x.moveTo(-22, 40); x.lineTo(14, -70); x.stroke();
      x.fillStyle = "#868e96"; x.fillRect(22, -16, 14, 34); x.fillStyle = "#212529"; x.fillRect(25, -10, 8, 8);
      return { turrets: [[-24, 70]], naval: true };
    }],
    destroyer: [50, 130, (x) => { hull(x, 22, 120, "#868e96"); deck(x, 120); x.fillStyle = "#495057"; x.fillRect(-9, -10, 18, 24); return { turrets: [[0, -34], [0, 34]], naval: true }; }],
    missileBoat: [34, 66, (x) => { hull(x, 13, 56, "#adb5bd"); x.fillStyle = "#495057"; x.fillRect(-6, -2, 12, 14); for (const my of [-16, -8]) { x.fillStyle = "#f1f3f5"; x.fillRect(-7, my, 14, 4); x.fillStyle = "#e03131"; x.fillRect(5, my, 2, 4); } return { naval: true }; }],
    sub: [32, 100, (x) => {
      x.beginPath(); x.ellipse(0, 0, 11, 44, 0, 0, TAU); x.fillStyle = lin(x, -11, 0, 11, 0, [[0, "#16191c"], [0.5, "#495057"], [1, "#16191c"]]); x.fill();
      x.fillStyle = "#212529"; x.beginPath(); x.ellipse(0, -6, 6, 11, 0, 0, TAU); x.fill(); x.fillStyle = "#343a40"; x.fillRect(-9, 34, 18, 3);
      return { naval: true };
    }]
  };
  function hull(x, w, L, col) {
    x.beginPath(); x.moveTo(0, L / 2); x.quadraticCurveTo(w, L * 0.3, w, 0); x.lineTo(w * 0.9, -L / 2); x.lineTo(-w * 0.9, -L / 2); x.lineTo(-w, 0); x.quadraticCurveTo(-w, L * 0.3, 0, L / 2); x.closePath();
    x.fillStyle = lin(x, -w, 0, w, 0, [[0, shade(col, -0.35)], [0.5, shade(col, 0.15)], [1, shade(col, -0.35)]]); x.fill();
    x.strokeStyle = "rgba(0,0,0,0.45)"; x.lineWidth = 2; x.stroke();
  }
  function deck(x, L) { x.strokeStyle = "rgba(0,0,0,0.2)"; x.lineWidth = 1; for (let y = -L / 2 + 10; y < L / 2 - 20; y += 8) { x.beginPath(); x.moveTo(-8, y); x.lineTo(8, y); x.stroke(); } }
  function starPath(x, cx, cy, R, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
  A.starPath = starPath;
  A.enemy = (kind) => { const d = DRAW[kind]; return sprite("en_" + kind, d[0], d[1], d[2]); };

  /* =========================================================
     BOSS HULLS (parts are drawn live on top)
     ========================================================= */
  const BOSS_DRAW = {
    thunderhawk(x, b) {
      const wing = lin(x, -210, 0, 210, 0, [[0, "#3b3f45"], [0.5, "#6c757d"], [1, "#3b3f45"]]);
      mirror(x, [[30, -60], [210, -10], [205, 40], [30, 30]], wing, "#212529");
      mirror(x, [[20, 70], [90, 100], [88, 118], [20, 112]], wing, "#212529");
      x.beginPath(); x.ellipse(0, 0, 44, 130, 0, 0, TAU); x.fillStyle = lin(x, -44, 0, 44, 0, [[0, "#343a40"], [0.5, "#868e96"], [1, "#343a40"]]); x.fill(); x.strokeStyle = "#212529"; x.lineWidth = 3; x.stroke();
      x.fillStyle = "#e03131"; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 120, -20); x.lineTo(s * 190, -4); x.lineTo(s * 190, 6); x.lineTo(s * 120, -8); x.fill(); }
      x.fillStyle = "#1c3d5a"; x.beginPath(); x.ellipse(0, 100, 16, 18, 0, 0, TAU); x.fill();
    },
    leviathan(x) {
      hull(x, 140, 460, "#5c636a");
      x.fillStyle = "#343a40"; x.fillRect(-100, -170, 200, 300);
      x.strokeStyle = "rgba(255,255,255,0.12)"; x.lineWidth = 2; for (let y = -160; y < 130; y += 22) { x.beginPath(); x.moveTo(-96, y); x.lineTo(96, y); x.stroke(); }
      x.fillStyle = "#495057"; x.fillRect(-46, -90, 92, 110); x.fillStyle = "#868e96"; x.fillRect(-30, -76, 60, 30);
      x.strokeStyle = "#fcc419"; x.lineWidth = 4; x.setLineDash([14, 10]); x.strokeRect(-100, -170, 200, 300); x.setLineDash([]);
    },
    citadel(x) {
      poly(x, Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * 200, Math.sin((i / 6) * TAU) * 150]));
      x.fillStyle = lin(x, 0, -150, 0, 150, [[0, "#c9a36a"], [1, "#7a5a32"]]); x.fill(); x.strokeStyle = "#4a3418"; x.lineWidth = 5; x.stroke();
      poly(x, Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * 130, Math.sin((i / 6) * TAU) * 96]));
      x.fillStyle = "#a07a45"; x.fill(); x.strokeStyle = "#5c4022"; x.lineWidth = 3; x.stroke();
      x.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.fillRect(Math.cos(a) * 160 - 6, Math.sin(a) * 120 - 6, 12, 12); }
    },
    frostwing(x) {
      x.fillStyle = "#495057"; x.fillRect(-150, -170, 300, 60); x.fillRect(-170, -40, 340, 150);
      x.beginPath(); x.ellipse(0, 0, 90, 180, 0, 0, TAU); x.fillStyle = lin(x, -90, 0, 90, 0, [[0, "#dee2e6"], [0.5, "#f8f9fa"], [1, "#adb5bd"]]); x.fill(); x.strokeStyle = "#495057"; x.lineWidth = 4; x.stroke();
      x.strokeStyle = "#4dabf7"; x.lineWidth = 6; x.beginPath(); x.moveTo(-70, 80); x.lineTo(70, 80); x.stroke();
      x.fillStyle = "#1c3d5a"; x.beginPath(); x.ellipse(0, 150, 26, 18, 0, 0, TAU); x.fill();
    },
    colossus(x) {
      for (const s of [-1, 1]) { x.fillStyle = "#343a40"; x.fillRect(s * 150 - 30, -160, 60, 320); x.fillStyle = "#212529"; for (let y = -150; y < 150; y += 16) x.fillRect(s * 150 - 30, y, 60, 6); }
      x.fillStyle = lin(x, -130, 0, 130, 0, [[0, "#5c4a3a"], [0.5, "#a0785a"], [1, "#5c4a3a"]]); x.fillRect(-130, -140, 260, 280);
      x.strokeStyle = "#2b1d12"; x.lineWidth = 4; x.strokeRect(-130, -140, 260, 280);
      x.strokeStyle = "#fcc419"; x.lineWidth = 6; x.setLineDash([16, 12]); x.beginPath(); x.moveTo(-120, 130); x.lineTo(120, 130); x.stroke(); x.setLineDash([]);
    },
    starbreaker(x) {
      poly(x, [[0, 210], [140, 120], [240, -40], [190, -200], [-190, -200], [-240, -40], [-140, 120]]);
      x.fillStyle = lin(x, 0, -200, 0, 210, [[0, "#2b2f45"], [0.6, "#4c5480"], [1, "#2b2f45"]]); x.fill(); x.strokeStyle = "#91a7ff"; x.lineWidth = 3; x.stroke();
      x.strokeStyle = "rgba(145,167,255,0.25)"; x.lineWidth = 1.5; for (let y = -180; y < 180; y += 26) { x.beginPath(); x.moveTo(-200 + Math.abs(y) * 0.2, y); x.lineTo(200 - Math.abs(y) * 0.2, y); x.stroke(); }
      x.fillStyle = "#748ffc"; x.globalAlpha = 0.5; x.fillRect(-6, -190, 12, 360); x.globalAlpha = 1;
    }
  };
  A.boss = (id) => { const b = S.BOSSES[id]; return sprite("boss_" + id, b.w + 30, b.h + 30, (x) => { BOSS_DRAW[id](x, b); }); };

  /* =========================================================
     BULLETS, PICKUPS, CLOUDS
     ========================================================= */
  A.glow = (color, r) => sprite("gl_" + color + r, r * 4, r * 4, (x) => { x.fillStyle = rad(x, 0, 0, 0, r * 2, [[0, "#fff"], [0.3, "#fff"], [0.45, color], [1, "rgba(0,0,0,0)"]]); x.beginPath(); x.arc(0, 0, r * 2, 0, TAU); x.fill(); });
  A.streak = (color, w, h) => sprite("st_" + color + w + h, w * 3, h + w * 2, (x) => {
    x.fillStyle = color; x.globalAlpha = 0.45; x.beginPath(); x.roundRect(-w * 1.4, -h / 2 - w, w * 2.8, h + w * 2, w * 1.4); x.fill();
    x.globalAlpha = 1; x.fillStyle = "#fff"; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, w / 2); x.fill();
  });
  A.star = (r) => sprite("star_" + r, r * 2.6, r * 2.6, (x) => { starPath(x, 0, 0, r, r * 0.45); x.fillStyle = lin(x, 0, -r, 0, r, [[0, "#fff3bf"], [0.5, "#fcc419"], [1, "#e67700"]]); x.fill(); x.strokeStyle = "#e67700"; x.lineWidth = 1.5; x.stroke(); });
  A.pickup = (icon, color) => sprite("pk_" + icon, 52, 52, (x) => {
    x.fillStyle = rad(x, 0, 0, 10, 26, [[0, color], [1, "rgba(0,0,0,0)"]]); x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(0, 0, 16, 0, TAU); x.fill(); x.strokeStyle = color; x.lineWidth = 3; x.stroke();
    x.font = "18px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(icon, 0, 1);
  });
  A.cloud = (i, tint) => sprite("cl_" + i + tint, 260, 160, (x) => {
    const r = S.rng(i * 97 + 3);
    for (let k = 0; k < 9; k++) { const cx = r.range(-80, 80), cy = r.range(-34, 34), rr = r.range(30, 56); x.fillStyle = rad(x, cx, cy, 0, rr, [[0, tint], [1, "rgba(255,255,255,0)"]]); x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill(); }
  });
  A.person = () => sprite("person", 30, 40, (x) => {
    x.fillStyle = "#ffd8a8"; x.beginPath(); x.arc(0, -10, 5, 0, TAU); x.fill();
    x.fillStyle = "#fd7e14"; x.fillRect(-5, -5, 10, 14); x.fillStyle = "#343a40"; x.fillRect(-5, 9, 4, 8); x.fillRect(1, 9, 4, 8);
  });

  /* =========================================================
     TERRAIN — 540 × 480 chunks that join up seamlessly
     ========================================================= */
  const CH = (A.CH = 480);
  A.riverX = (world, gy) => world.terrain === "industrial" ? W / 2 + Math.sin(gy / 1300) * 140 : W / 2 + Math.sin(gy / 900 + 1.3) * 140 + Math.sin(gy / 310) * 40;
  A.isWater = (world, x, gy) => world.terrain === "ocean" ? !islandAt(x, gy) : world.river ? Math.abs(x - A.riverX(world, gy)) < world.river / 2 - 6 : false;
  function islandAt(x, gy) { const k = Math.floor(gy / CH); for (const j of [k - 1, k, k + 1]) for (const it of features("ocean", j)) if (it.t === "island" && Math.hypot(x - it.x, gy - it.gy) < it.r + 14) return true; return false; }

  // features (trees, houses, islands…) for a chunk, generated from its index so neighbours agree
  const featCache = new Map();
  function features(terrain, k) {
    const key = terrain + k;
    if (featCache.has(key)) return featCache.get(key);
    const r = S.rng(k * 1013 + terrain.length * 77 + 5), out = [];
    const y0 = k * CH, rnd = () => ({ x: r.range(0, W), gy: y0 + r.range(0, CH) });
    if (terrain === "valley") {
      for (let i = 0; i < 6; i++) out.push(Object.assign({ t: "field", w: r.range(70, 160), h: r.range(50, 120), a: r.range(-0.3, 0.3), c: r.pick(["#9bc46a", "#b5cf6b", "#7fb35a", "#c7d68a", "#8fbf5a"]) }, rnd()));
      for (let i = 0; i < 9; i++) { const c = rnd(); for (let j = 0; j < 14; j++) out.push({ t: "tree", x: c.x + r.range(-50, 50), gy: c.gy + r.range(-40, 40), r: r.range(7, 13) }); }
      for (let i = 0; i < 3; i++) out.push(Object.assign({ t: "house", w: r.range(16, 26), h: r.range(14, 20), c: r.pick(["#c0504d", "#a0522d", "#6c757d"]) }, rnd()));
      if (r() < 0.45) out.push(Object.assign({ t: "base", w: r.range(110, 160), h: r.range(90, 130) }, rnd()));
    } else if (terrain === "ocean") {
      for (let i = 0; i < 40; i++) out.push(Object.assign({ t: "wave", w: r.range(14, 34) }, rnd()));
      if (r() < 0.45) out.push(Object.assign({ t: "island", r: r.range(40, 80) }, rnd()));
    } else if (terrain === "desert") {
      for (let i = 0; i < 7; i++) out.push(Object.assign({ t: "dune", w: r.range(120, 260), a: r.range(-0.4, 0.4) }, rnd()));
      for (let i = 0; i < 12; i++) out.push(Object.assign({ t: "rock", r: r.range(5, 14) }, rnd()));
      for (let i = 0; i < 8; i++) out.push(Object.assign({ t: "cactus" }, rnd()));
      if (r() < 0.4) out.push(Object.assign({ t: "base", w: r.range(110, 160), h: r.range(90, 130), sand: true }, rnd()));
    } else if (terrain === "snow") {
      for (let i = 0; i < 5; i++) out.push(Object.assign({ t: "mountain", w: r.range(90, 180), h: r.range(70, 130) }, rnd()));
      for (let i = 0; i < 7; i++) { const c = rnd(); for (let j = 0; j < 10; j++) out.push({ t: "pine", x: c.x + r.range(-45, 45), gy: c.gy + r.range(-35, 35), r: r.range(7, 12) }); }
      for (let i = 0; i < 10; i++) out.push(Object.assign({ t: "floe", r: r.range(8, 22) }, rnd()));
    } else if (terrain === "industrial") {
      for (let i = 0; i < 7; i++) out.push(Object.assign({ t: "factory", w: r.range(70, 150), h: r.range(50, 110), c: r.pick(["#6c757d", "#5c636a", "#7f6a55", "#4c6070"]) }, rnd()));
      for (let i = 0; i < 6; i++) out.push(Object.assign({ t: "chimney", r: r.range(8, 14) }, rnd()));
      for (let i = 0; i < 4; i++) out.push(Object.assign({ t: "tank", r: r.range(14, 26) }, rnd()));
    } else if (terrain === "space") {
      for (let i = 0; i < 70; i++) out.push(Object.assign({ t: "star", r: r.range(0.5, 1.8), c: r.pick(["#ffffff", "#dbe4ff", "#fff3bf", "#ffe3e3"]) }, rnd()));
      if (r() < 0.5) out.push(Object.assign({ t: "nebula", r: r.range(120, 220), c: r.pick(["rgba(132,94,247,", "rgba(51,154,240,", "rgba(240,101,149,"]) }, rnd()));
      if (r() < 0.5) out.push(Object.assign({ t: "station", w: r.range(120, 220), h: r.range(70, 140) }, rnd()));
      for (let i = 0; i < 3; i++) out.push(Object.assign({ t: "asteroid", r: r.range(8, 22), s: r() * 100 }, rnd()));
    }
    featCache.set(key, out);
    if (featCache.size > 60) featCache.delete(featCache.keys().next().value);
    return out;
  }

  const BASE = { valley: "#86b45a", ocean: "#1e5f8c", desert: "#e3c38a", snow: "#eef3f8", industrial: "#7b8087", space: "#0b0d1e" };
  A.chunk = function (world, k) {
    const key = "ch_" + world.id + "_" + k;
    if (cache.has(key)) return cache.get(key);
    const c = canvas(W, CH), x = c.getContext("2d");
    const T = world.terrain, y0 = k * CH;
    const sy = (gy) => (k + 1) * CH - gy; // ground coordinate → row in this chunk
    // base colour with soft noise
    x.fillStyle = BASE[T]; x.fillRect(0, 0, W, CH);
    const r = S.rng(k * 31 + 7);
    if (T !== "space") for (let i = 0; i < 160; i++) { x.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.04)"; x.beginPath(); x.arc(r.range(0, W), r.range(0, CH), r.range(10, 50), 0, TAU); x.fill(); }
    if (T === "ocean") { x.fillStyle = lin(x, 0, 0, W, 0, [[0, "rgba(0,30,60,0.25)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(0,30,60,0.25)"]]); x.fillRect(0, 0, W, CH); }
    if (T === "space") { x.fillStyle = lin(x, 0, 0, W, CH, [[0, "#0b0d1e"], [1, "#151034"]]); x.fillRect(0, 0, W, CH); }
    const all = [];
    for (const j of [k - 1, k, k + 1]) all.push(...features(T, j));
    const order = ["field", "dune", "nebula", "star", "mountain", "base", "station", "factory", "tank", "wave", "island", "floe", "rock", "cactus", "house", "chimney", "asteroid", "tree", "pine"];
    all.sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
    // rivers / canals / frozen channels go under the features that sit on land
    const drawRiver = () => {
      if (!world.river) return;
      const wv = world.river, pts = [];
      for (let row = -12; row <= CH + 12; row += 6) pts.push([A.riverX(world, (k + 1) * CH - row), row]);
      const band = (half, col) => { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px - half, py) : x.moveTo(px - half, py))); for (let i = pts.length - 1; i >= 0; i--) x.lineTo(pts[i][0] + half, pts[i][1]); x.closePath(); x.fillStyle = col; x.fill(); };
      if (T === "snow") { band(wv / 2 + 8, "#cfe3f2"); band(wv / 2, "#5a8fb8"); band(wv / 2 - 10, "#3d78a6"); }
      else if (T === "industrial") { band(wv / 2 + 6, "#495057"); band(wv / 2, "#3b5a4a"); }
      else { band(wv / 2 + 9, "#d9c690"); band(wv / 2, "#3f86c7"); band(wv / 2 - 12, "#2f74b5"); }
    };
    if (T === "valley" || T === "desert") {
      // a winding road
      x.strokeStyle = T === "desert" ? "#b39566" : "#9e8f6e"; x.lineWidth = 16; x.beginPath();
      for (let row = -10; row <= CH + 10; row += 8) { const gy = (k + 1) * CH - row; const rx = W / 2 + Math.sin(gy / 700) * 200; row === -10 ? x.moveTo(rx, row) : x.lineTo(rx, row); }
      x.stroke(); x.strokeStyle = "rgba(255,255,255,0.35)"; x.lineWidth = 1.5; x.setLineDash([10, 10]); x.stroke(); x.setLineDash([]);
    }
    if (T === "industrial") { x.strokeStyle = "rgba(0,0,0,0.18)"; x.lineWidth = 2; for (let gx = 0; gx <= W; gx += 90) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, CH); x.stroke(); } for (let gy = (90 - (y0 % 90)) % 90; gy < CH; gy += 90) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); } }
    let riverDone = false;
    for (const f of all) {
      const y = sy(f.gy), px = f.x;
      if (y < -260 || y > CH + 260) continue;
      if (!riverDone && order.indexOf(f.t) >= order.indexOf("base")) { drawRiver(); riverDone = true; }
      if (world.river && ["tree", "pine", "house", "base", "factory", "tank", "chimney", "cactus", "rock", "mountain"].includes(f.t) && Math.abs(px - A.riverX(world, f.gy)) < world.river / 2 + 22) continue;
      switch (f.t) {
        case "field": x.save(); x.translate(px, y); x.rotate(f.a); x.fillStyle = f.c; x.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); x.strokeStyle = "rgba(0,0,0,0.08)"; for (let i = -f.h / 2 + 5; i < f.h / 2; i += 7) { x.beginPath(); x.moveTo(-f.w / 2, i); x.lineTo(f.w / 2, i); x.stroke(); } x.restore(); break;
        case "tree": x.fillStyle = "rgba(0,0,0,0.25)"; x.beginPath(); x.arc(px + 4, y + 4, f.r, 0, TAU); x.fill(); x.fillStyle = rad(x, px - f.r * 0.3, y - f.r * 0.3, 1, f.r, [[0, "#5fa03d"], [1, "#2f5f22"]]); x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); break;
        case "house": x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(px - f.w / 2 + 4, y - f.h / 2 + 4, f.w, f.h); x.fillStyle = f.c; x.fillRect(px - f.w / 2, y - f.h / 2, f.w, f.h); x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(px - f.w / 2, y, f.w, f.h / 2); break;
        case "base":
          x.fillStyle = f.sand ? "#c9b28a" : "#9aa0a6"; x.fillRect(px - f.w / 2, y - f.h / 2, f.w, f.h);
          x.strokeStyle = "#fcc419"; x.lineWidth = 2; x.strokeRect(px - f.w / 2 + 6, y - f.h / 2 + 6, f.w - 12, f.h - 12);
          x.strokeStyle = "rgba(255,255,255,0.6)"; x.beginPath(); x.arc(px, y, 16, 0, TAU); x.stroke(); x.font = "bold 18px sans-serif"; x.fillStyle = "rgba(255,255,255,0.6)"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("H", px, y + 1);
          break;
        case "wave": x.strokeStyle = "rgba(255,255,255,0.22)"; x.lineWidth = 2; x.beginPath(); x.moveTo(px - f.w / 2, y); x.quadraticCurveTo(px, y - 5, px + f.w / 2, y); x.stroke(); break;
        case "island":
          x.fillStyle = "rgba(255,255,255,0.25)"; x.beginPath(); x.arc(px, y, f.r + 12, 0, TAU); x.fill();
          x.fillStyle = "#e9d8a6"; x.beginPath(); x.arc(px, y, f.r + 4, 0, TAU); x.fill();
          x.fillStyle = rad(x, px - 10, y - 10, 4, f.r, [[0, "#74b84a"], [1, "#3d7a2a"]]); x.beginPath(); x.arc(px, y, f.r - 4, 0, TAU); x.fill();
          break;
        case "dune": x.save(); x.translate(px, y); x.rotate(f.a); x.fillStyle = "rgba(160,110,50,0.18)"; x.beginPath(); x.ellipse(0, 6, f.w / 2, 18, 0, 0, TAU); x.fill(); x.fillStyle = "rgba(255,240,200,0.3)"; x.beginPath(); x.ellipse(0, -4, f.w / 2, 12, 0, 0, TAU); x.fill(); x.restore(); break;
        case "rock": x.fillStyle = "rgba(0,0,0,0.2)"; x.beginPath(); x.arc(px + 3, y + 3, f.r, 0, TAU); x.fill(); x.fillStyle = "#a07a50"; x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); break;
        case "cactus": x.fillStyle = "#4c8a3a"; x.beginPath(); x.arc(px, y, 4, 0, TAU); x.fill(); break;
        case "mountain":
          x.fillStyle = "#b8c4d0"; x.beginPath(); x.moveTo(px - f.w / 2, y + f.h / 2); x.lineTo(px, y - f.h / 2); x.lineTo(px + f.w / 2, y + f.h / 2); x.fill();
          x.fillStyle = "#8a9aac"; x.beginPath(); x.moveTo(px, y - f.h / 2); x.lineTo(px + f.w / 2, y + f.h / 2); x.lineTo(px + f.w * 0.1, y + f.h / 2); x.fill();
          x.fillStyle = "#ffffff"; x.beginPath(); x.moveTo(px - f.w * 0.16, y - f.h * 0.18); x.lineTo(px, y - f.h / 2); x.lineTo(px + f.w * 0.16, y - f.h * 0.18); x.fill();
          break;
        case "pine": x.fillStyle = "rgba(0,0,0,0.18)"; x.beginPath(); x.arc(px + 3, y + 3, f.r, 0, TAU); x.fill(); x.fillStyle = "#2f5f45"; x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,0.8)"; x.beginPath(); x.arc(px - f.r * 0.25, y - f.r * 0.25, f.r * 0.5, 0, TAU); x.fill(); break;
        case "floe": if (Math.abs(px - A.riverX(world, f.gy)) < world.river / 2 - f.r) { x.fillStyle = "rgba(255,255,255,0.85)"; x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); } break;
        case "factory":
          x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(px - f.w / 2 + 6, y - f.h / 2 + 6, f.w, f.h);
          x.fillStyle = f.c; x.fillRect(px - f.w / 2, y - f.h / 2, f.w, f.h);
          x.fillStyle = "rgba(255,255,255,0.12)"; for (let i = -f.w / 2 + 6; i < f.w / 2 - 4; i += 14) x.fillRect(px + i, y - f.h / 2 + 4, 7, f.h - 8);
          x.strokeStyle = "rgba(0,0,0,0.4)"; x.lineWidth = 2; x.strokeRect(px - f.w / 2, y - f.h / 2, f.w, f.h);
          break;
        case "chimney": x.fillStyle = "#3d3d3d"; x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); x.fillStyle = "#111"; x.beginPath(); x.arc(px, y, f.r * 0.55, 0, TAU); x.fill(); break;
        case "tank": x.fillStyle = rad(x, px - 5, y - 5, 2, f.r, [[0, "#dee2e6"], [1, "#868e96"]]); x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); x.strokeStyle = "#495057"; x.stroke(); break;
        case "star": x.fillStyle = f.c; x.globalAlpha = 0.5 + f.r * 0.25; x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); x.globalAlpha = 1; break;
        case "nebula": x.fillStyle = rad(x, px, y, 0, f.r, [[0, f.c + "0.22)"], [1, f.c + "0)"]]); x.beginPath(); x.arc(px, y, f.r, 0, TAU); x.fill(); break;
        case "station":
          x.fillStyle = "#3b4060"; x.fillRect(px - f.w / 2, y - f.h / 2, f.w, f.h); x.strokeStyle = "#748ffc"; x.lineWidth = 2; x.strokeRect(px - f.w / 2, y - f.h / 2, f.w, f.h);
          x.strokeStyle = "rgba(116,143,252,0.3)"; x.lineWidth = 1; for (let i = -f.w / 2 + 20; i < f.w / 2; i += 20) { x.beginPath(); x.moveTo(px + i, y - f.h / 2); x.lineTo(px + i, y + f.h / 2); x.stroke(); }
          x.fillStyle = "#ffd43b"; for (let i = -f.w / 2 + 10; i < f.w / 2; i += 30) x.fillRect(px + i, y - f.h / 2 + 4, 4, 4);
          break;
        case "asteroid": x.fillStyle = "#5c5f66"; x.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, rr = f.r * (0.75 + 0.25 * Math.sin(i * 2.3 + f.s)); x.lineTo(px + Math.cos(a) * rr, y + Math.sin(a) * rr); } x.closePath(); x.fill(); x.fillStyle = "rgba(0,0,0,0.3)"; x.beginPath(); x.arc(px + f.r * 0.2, y + f.r * 0.1, f.r * 0.3, 0, TAU); x.fill(); break;
      }
    }
    if (!riverDone) drawRiver();
    cache.set(key, c);
    // keep only recent chunks in memory
    const keys = [...cache.keys()].filter((q) => q.startsWith("ch_"));
    if (keys.length > 8) cache.delete(keys[0]);
    return c;
  };
})();
