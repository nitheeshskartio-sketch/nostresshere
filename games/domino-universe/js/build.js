/* ============ DOMINO UNIVERSE — building tools: place, draw, patterns, select, move, erase, undo ============ */
(function () {
  "use strict";
  const D = window.DOM, W = D.world, A = D.audio;
  const TAU = Math.PI * 2;
  const B = (D.build = {
    tool: "single", pattern: "circle", structure: "stairs", object: "ball",
    type: "classic", color: "#ff6b6b", scale: 1, spacing: 0.58, snap: false, rot: 0, channel: 1, autoSpace: true,
    budget: Infinity, placed: 0, onChange: null, locked: false, allowed: null
  });
  const con = () => W.con;

  /* ---------- undo / redo ---------- */
  const undo = [], redo = [];
  const snap = () => JSON.stringify({ d: con().dominoes.map(clean), o: con().objects.map((o) => Object.assign({}, o, { sel: undefined })), p: B.placed, g: (W.ghosts || []).map((g) => !!g.filled) });
  function clean(d) { const c = { x: d.x, y: d.y || 0, z: d.z, a: d.a, type: d.type }; if (d.color) c.color = d.color; if (d.lying) c.lying = true; if (d.channel) c.channel = d.channel; if (d.scale && d.scale !== 1) c.scale = d.scale; if (d.mine) c.mine = true; return c; }
  B.clean = clean;
  B.checkpoint = function () { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; };
  function restore(s) { const j = JSON.parse(s); con().dominoes = j.d; con().objects = j.o; B.placed = j.p; (W.ghosts || []).forEach((g, i) => (g.filled = j.g[i])); W.refreshGhosts(); changed(); }
  B.undo = function () { if (!undo.length || W.mode !== "edit") return false; redo.push(snap()); restore(undo.pop()); A.play("undo"); return true; };
  B.redo = function () { if (!redo.length || W.mode !== "edit") return false; undo.push(snap()); restore(redo.pop()); A.play("undo"); return true; };
  B.clearHistory = () => { undo.length = 0; redo.length = 0; };
  B.canUndo = () => undo.length > 0; B.canRedo = () => redo.length > 0;
  function changed() { W.rebuild(); if (B.onChange) B.onChange(); }
  B.changed = changed;

  /* ---------- overlap test: oriented footprints on the same level ---------- */
  function footprint(d) {
    const t = D.typeById(d.type), s = d.scale || 1;
    const hw = (t.size[0] * s) / 2, hl = ((d.lying ? t.size[1] : t.size[2]) * s) / 2;
    const c = Math.cos(d.a || 0), sn = Math.sin(d.a || 0);
    // local x = width axis (cos a, -sin a), local z = facing axis (sin a, cos a)
    return { x: d.x, z: d.z, ax: [c, -sn], az: [sn, c], hw, hl, y0: d.y || 0, y1: (d.y || 0) + (d.lying ? t.size[2] : t.size[1]) * s };
  }
  function overlaps(a, b) {
    if (a.y1 <= b.y0 + 0.02 || b.y1 <= a.y0 + 0.02) return false;
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const [ax, az] of [a.ax, a.az, b.ax, b.az]) {
      const dist = Math.abs(dx * ax + dz * az);
      const ra = a.hw * Math.abs(a.ax[0] * ax + a.ax[1] * az) + a.hl * Math.abs(a.az[0] * ax + a.az[1] * az);
      const rb = b.hw * Math.abs(b.ax[0] * ax + b.ax[1] * az) + b.hl * Math.abs(b.az[0] * ax + b.az[1] * az);
      if (dist > ra + rb - 0.005) return false;
    }
    return true;
  }
  function gridOf(list) { const g = new Map(); list.forEach((d, i) => { const k = Math.floor(d.x) + "," + Math.floor(d.z); let c = g.get(k); if (!c) g.set(k, (c = [])); c.push(i); }); return g; }
  // mark (and drop) new dominoes that would overlap existing ones
  function fit(list, opts) {
    const ex = con().dominoes, g = gridOf(ex), fps = [];
    const keep = [];
    for (const d of list) {
      const f = footprint(d);
      let bad = false;
      for (let gx = Math.floor(d.x) - 1; gx <= Math.floor(d.x) + 1 && !bad; gx++) for (let gz = Math.floor(d.z) - 1; gz <= Math.floor(d.z) + 1 && !bad; gz++) { const c = g.get(gx + "," + gz); if (c) for (const i of c) if (!(opts && opts.ignore && opts.ignore.has(i)) && overlaps(f, footprint(ex[i]))) { bad = true; break; } }
      if (!bad) for (const o of fps) if (overlaps(f, o)) { bad = true; break; }
      d.bad = bad;
      if (!bad) { keep.push(d); fps.push(f); }
    }
    return keep;
  }
  B.fit = fit;

  /* ---------- making dominoes ---------- */
  const R = () => (B.snap ? 0.25 : 0);
  const snapV = (v) => (B.snap ? Math.round(v / 0.25) * 0.25 : v);
  const snapA = (a) => (B.snap ? Math.round(a / (Math.PI / 12)) * (Math.PI / 12) : a);
  function proto(extra) {
    const t = D.typeById(B.type);
    return Object.assign({ type: B.type, color: t.colourable ? B.color : null, scale: B.scale !== 1 ? B.scale : undefined, mine: true, channel: B.type === "trigger" ? B.channel : undefined }, extra);
  }
  const sp = () => B.spacing * B.scale * (D.typeById(B.type).size[1] / 1);
  function along(pts, y) { return D.alongPath(pts, sp(), { y }).map((d) => proto({ x: d.x, z: d.z, a: d.a, y: d.y })); }
  B.makeLine = (p0, p1) => along([[p0.x, p0.z], [p1.x, p1.z]], p0.y);
  B.makePath = (pts, y) => {
    // smooth the hand-drawn line a little before laying dominoes on it
    const sm = pts.map((p, i) => { let x = 0, z = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(pts.length - 1, i + 2); k++) { x += pts[k][0]; z += pts[k][1]; n++; } return [x / n, z / n]; });
    return along(sm, y);
  };
  B.makePattern = (name, c, r, rot) => D.patternDominoes(name, c.x, c.z, Math.max(0.8, r), rot, sp(), { y: c.y }).map((d) => proto({ x: d.x, z: d.z, a: d.a, y: d.y }));
  B.makeSingle = function (p) {
    const list = con().dominoes;
    let a = B.rot;
    // keep going in the direction of the last domino you placed nearby
    const last = list.length ? list[list.length - 1] : null;
    if (last && last.mine && Math.hypot(last.x - p.x, last.z - p.z) < 1.6 && Math.hypot(last.x - p.x, last.z - p.z) > 0.2) a = Math.atan2(p.x - last.x, p.z - last.z);
    return [proto({ x: snapV(p.x), z: snapV(p.z), y: p.y, a: snapA(a) })];
  };
  B.makeStructure = function (name, p, dirA) {
    const a = snapA(dirA), f = [Math.sin(a), Math.cos(a)];
    const out = { dominoes: [], objects: [] };
    const toWorld = (along, across) => ({ x: p.x + f[0] * along + f[1] * across, z: p.z + f[1] * along - f[0] * across });
    if (name === "stairs" || name === "bridge") {
      const n = 4, deck = name === "bridge" ? 2.4 : 0;
      const seg = D.bridgeSeg(0, 0, n, deck, B.type, name === "bridge");
      // rotate the seg (built along +x) into place
      const rotP = (q) => { const w = toWorld(q.x, -q.z); return Object.assign({}, q, w, { a: a, y: q.y }); };
      out.dominoes = seg.all.map((q) => proto(rotP(q)));
      const o = seg.obj; out.objects.push({ kind: o.kind, x: p.x, z: p.z, a, steps: o.steps, deck: o.deck });
    } else if (name === "tower") {
      out.dominoes = D.towerAt(0, 0, 3, B.type).map((q) => { const w = toWorld(q.x, 0); return proto({ x: w.x, z: w.z, y: (p.y || 0) + q.y, a: a, lying: q.lying }); });
    } else if (name === "maze") {
      out.dominoes = along(D.mazePath(p.x, p.z, 5, 2.2, Math.floor(Math.random() * 1000) + 1), p.y);
    } else if (name === "loop") {
      out.dominoes = B.makePattern("circle", p, 4, a);
    } else if (name === "split") {
      const w0 = toWorld(0, 0), lead = along([[w0.x, w0.z], [toWorld(3, 0).x, toWorld(3, 0).z]], p.y);
      lead[lead.length - 1].type = "heavy";
      for (const s of [-1, 1]) { const pts = D.roundCorners([[3.42, s * 0.27], [4.6, s * 0.27], [8, s * 2.6], [12, s * 2.6]], 2.2).map(([u, v]) => { const w = toWorld(u, v); return [w.x, w.z]; }); out.dominoes.push(...along(pts, p.y)); }
      out.dominoes.unshift(...lead);
    }
    return out;
  };
  B.makeObject = function (kind, p, dirA) {
    const o = { kind, x: snapV(p.x), z: snapV(p.z), a: snapA(dirA) };
    if (kind === "ball") o.y = p.y || 0;
    if (kind === "ramp") { o.len = 6; o.plat = 3; }
    if (kind === "stairs" || kind === "bridge") { o.steps = 4; o.deck = kind === "bridge" ? 2.4 : 0; }
    if (kind === "pendulum") o.len = 2.4;
    if (kind === "spinner") { o.len = 3; o.dir = 1; }
    if (kind === "bell") o.y = 1.2;
    if (["switch", "pendulum", "spinner", "slider"].includes(kind)) o.channel = B.channel;
    return o;
  };

  // add a batch of dominoes, respecting the level budget and refusing overlaps
  B.commit = function (list, objects) {
    if (W.mode !== "edit") return 0;
    let ok = fit(list);
    const skipped = list.length - ok.length;
    if (B.budget !== Infinity) {
      ok = ok.slice(0, Math.max(0, B.budget - B.placed));
      // snap onto a ghost if you put a domino close to one
      for (const d of ok) { const g = (W.ghosts || []).find((q) => !q.filled && Math.hypot(q.x - d.x, q.z - d.z) < 0.45 && Math.abs((q.y || 0) - (d.y || 0)) < 0.3); if (g) { Object.assign(d, { x: g.x, z: g.z, y: g.y || 0, a: g.a, type: g.type, color: g.color }); g.filled = true; d.ghost = true; } }
    }
    if (!ok.length && !(objects && objects.length)) { if (skipped) B.say && B.say("That spot's taken — dominoes can't overlap"); return 0; }
    B.checkpoint();
    con().dominoes.push(...ok);
    if (objects) con().objects.push(...objects);
    B.placed += ok.length;
    W.refreshGhosts();
    if (skipped && B.say) B.say("Skipped " + skipped + " overlapping " + (skipped === 1 ? "domino" : "dominoes"));
    A.play("place");
    changed();
    return ok.length;
  };

  /* ---------- selection ---------- */
  B.selection = () => ({ d: con().dominoes.map((d, i) => (d.sel ? i : -1)).filter((i) => i >= 0), o: con().objects.map((o, i) => (o.sel ? i : -1)).filter((i) => i >= 0) });
  B.clearSel = () => { con().dominoes.forEach((d) => (d.sel = false)); con().objects.forEach((o) => (o.sel = false)); };
  B.deleteSel = function () {
    const s = B.selection(); if (!s.d.length && !s.o.length) return;
    B.checkpoint();
    for (const i of s.d) { const d = con().dominoes[i]; if (d.ghost) { const g = (W.ghosts || []).find((q) => Math.hypot(q.x - d.x, q.z - d.z) < 0.01); if (g) g.filled = false; } if (d.mine) B.placed--; }
    con().dominoes = con().dominoes.filter((d) => !d.sel); con().objects = con().objects.filter((o) => !o.sel);
    W.refreshGhosts(); A.play("delete"); changed();
  };
  B.duplicateSel = function () {
    const s = B.selection(); if (!s.d.length && !s.o.length) return;
    // copy, then shift sideways until it fits
    const src = s.d.map((i) => con().dominoes[i]);
    let minX = Infinity, maxX = -Infinity; for (const d of src) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); }
    const dx = Math.max(2, maxX - minX + 1.5);
    const copy = src.map((d) => Object.assign(clean(d), { x: d.x + dx, mine: true }));
    const objs = s.o.map((i) => Object.assign({}, con().objects[i], { x: con().objects[i].x + dx, sel: false }));
    B.clearSel();
    const n = B.commit(copy, objs);
    con().dominoes.slice(-n).forEach((d) => (d.sel = true)); con().objects.slice(-objs.length || con().objects.length).forEach((o, k) => { if (k >= 0 && objs.length) o.sel = true; });
    changed();
  };
  B.rotateSel = function (da) {
    const s = B.selection(); if (!s.d.length && !s.o.length) return;
    B.checkpoint();
    const items = s.d.map((i) => con().dominoes[i]).concat(s.o.map((i) => con().objects[i]));
    const cx = items.reduce((t, q) => t + q.x, 0) / items.length, cz = items.reduce((t, q) => t + q.z, 0) / items.length;
    const c = Math.cos(da), sn = Math.sin(da);
    for (const q of items) { const x = q.x - cx, z = q.z - cz; q.x = cx + x * c + z * sn; q.z = cz - x * sn + z * c; q.a = (q.a || 0) + da; }
    changed();
  };
  B.moveSel = function (dx, dz, final) {
    const s = B.selection();
    for (const i of s.d) { const d = con().dominoes[i]; d.x += dx; d.z += dz; }
    for (const i of s.o) { const o = con().objects[i]; o.x += dx; o.z += dz; }
    if (final) { const ign = new Set(s.d); const moved = s.d.map((i) => con().dominoes[i]); const bad = moved.filter((d) => { const f = footprint(d); return con().dominoes.some((e, j) => !ign.has(j) && Math.abs(e.x - d.x) < 2 && Math.abs(e.z - d.z) < 2 && overlaps(f, footprint(e))); }).length; if (bad && B.say) B.say("⚠️ " + bad + " moved dominoes overlap others"); }
    changed();
  };
  B.selectBox = function (x0, y0, x1, y1, add) {
    if (!add) B.clearSel();
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    con().dominoes.forEach((d) => { const [sx, sy, sz] = W.project(d.x, (d.y || 0) + 0.5, d.z); if (sz < 1 && sx >= ax && sx <= bx && sy >= ay && sy <= by) d.sel = true; });
    con().objects.forEach((o) => { const [sx, sy, sz] = W.project(o.x, 0.4, o.z); if (sz < 1 && sx >= ax && sx <= bx && sy >= ay && sy <= by) o.sel = true; });
    changed();
  };
  B.eraseAt = function (cx, cy) {
    const i = W.pickDomino(cx, cy);
    if (i >= 0) {
      const d = con().dominoes[i];
      if (B.budget !== Infinity && !d.mine) return false; // can't remove the level's own dominoes
      if (!B.erasing) { B.checkpoint(); B.erasing = true; }
      if (d.ghost) { const g = (W.ghosts || []).find((q) => Math.hypot(q.x - d.x, q.z - d.z) < 0.01); if (g) g.filled = false; }
      if (d.mine) B.placed--;
      con().dominoes.splice(i, 1); W.refreshGhosts(); A.play("delete"); changed(); return true;
    }
    if (B.budget === Infinity) { const o = W.pickObject(cx, cy); if (o >= 0) { if (!B.erasing) { B.checkpoint(); B.erasing = true; } con().objects.splice(o, 1); A.play("delete"); changed(); return true; } }
    return false;
  };

  /* ---------- random arrangement ---------- */
  B.randomArrangement = function () {
    const pats = ["curve", "circle", "spiral", "wave", "zigzag"];
    const out = [];
    let x = -12, z = 0, a = Math.PI / 2;
    const types = ["colour", "wood", "plastic", "classic", "neon"];
    const ty = types[Math.floor(Math.random() * types.length)];
    for (let k = 0; k < 5; k++) {
      const p = pats[Math.floor(Math.random() * pats.length)];
      const r = 3 + Math.random() * 3;
      const list = D.patternDominoes(p, x + r, z + (Math.random() - 0.5) * 6, r, Math.random() * TAU, 0.58);
      list.forEach((d, i) => out.push(Object.assign(d, { type: ty, color: D.hsl((k * 0.2 + i / list.length / 5) % 1), mine: true })));
      x += r * 2 + 2;
    }
    void a;
    return fit(out);
  };

  /* ---------- massive generator for the Massive Chain mode ---------- */
  B.massive = function (target) {
    const out = [];
    const rows = Math.max(4, Math.round(Math.sqrt(target / 70))), w = Math.max(20, Math.round(target / rows * 0.58 * 0.9));
    const pts = [];
    for (let r = 0; r < rows; r++) {
      const z = -rows + r * 2.1, a0 = r % 2 ? w / 2 : -w / 2, b0 = r % 2 ? -w / 2 : w / 2;
      pts.push([a0, z], [b0, z]);
      if (r < rows - 1) { const dir = r % 2 ? -1 : 1; for (let k = 1; k < 12; k++) { const t = -Math.PI / 2 + (k / 12) * Math.PI; pts.push([b0 + dir * Math.cos(t) * 1.05, z + 1.05 + Math.sin(t) * 1.05]); } }
    }
    const list = D.alongPath(pts, 0.58);
    list.forEach((d, i) => out.push(Object.assign(d, { type: i % 50 === 49 ? "neon" : "colour", color: D.hsl((i / list.length) * 3 % 1), mine: true })));
    return out;
  };
})();
