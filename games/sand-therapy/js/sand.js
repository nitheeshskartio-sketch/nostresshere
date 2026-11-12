/* ============ SAND THERAPY — the sand: height map, textures, physics, particles ============
   The sand surface is a 320×200 height map rendered as a lit 3D mesh.
   Kinetic sand is cohesive: cut walls stay standing. Only "loose" sand (poured,
   crumbled, pushed aside) slumps, and it firms up again after a few seconds. */
(function () {
  "use strict";
  const ST = (window.ST = window.ST || {});
  const NX = 320, NZ = 200, W = 1.6, D = 1.0;
  const CX = W / (NX - 1), CZ = D / (NZ - 1), CELL = (CX + CZ) / 2;
  const N = NX * NZ;
  const R = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  ST.GRID = { NX, NZ, W, D, CELL };

  /* ---------- grain textures (drawn in code, tileable) ---------- */
  function grainTextures() {
    const S = 256;
    const hmap = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) hmap[i] = Math.random();
    const blur = (src) => { const o = new Float32Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let k = -1; k <= 1; k++) for (let l = -1; l <= 1; l++) s += src[((y + k + S) % S) * S + ((x + l + S) % S)]; o[y * S + x] = s / 9; } return o; };
    const hs = blur(hmap);
    const mk = () => { const c = document.createElement("canvas"); c.width = c.height = S; return c; };
    // albedo: light/dark grains
    const a = mk(), ax = a.getContext("2d"), ad = ax.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const v = 205 + (hmap[i] - 0.5) * 70 + (hs[i] - 0.5) * 60; ad.data[i * 4] = ad.data[i * 4 + 1] = ad.data[i * 4 + 2] = clamp(v, 0, 255); ad.data[i * 4 + 3] = 255; }
    ax.putImageData(ad, 0, 0);
    // normal map from grain height
    const n = mk(), nx = n.getContext("2d"), nd = nx.createImageData(S, S);
    const h = (x, y) => hmap[((y + S) % S) * S + ((x + S) % S)] * 0.6 + hs[((y + S) % S) * S + ((x + S) % S)] * 0.4;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (h(x - 1, y) - h(x + 1, y)) * 2.2, dy = (h(x, y - 1) - h(x, y + 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
      nd.data[i] = (dx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
    }
    nx.putImageData(nd, 0, 0);
    // glitter: sparse metallic flakes
    const g = mk(), gx = g.getContext("2d"), gd = gx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const f = Math.random() < 0.06 ? 255 : 0; gd.data[i * 4] = gd.data[i * 4 + 1] = gd.data[i * 4 + 2] = f; gd.data[i * 4 + 3] = 255; }
    gx.putImageData(gd, 0, 0);
    const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const flakesRough = mk(), fr = flakesRough.getContext("2d"), frd = fr.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const v = gd.data[i * 4] ? 40 : 235; frd.data[i * 4] = frd.data[i * 4 + 1] = frd.data[i * 4 + 2] = v; frd.data[i * 4 + 3] = 255; }
    fr.putImageData(frd, 0, 0);
    return { albedo: T(a, true), normal: T(n), flakes: T(g), flakeRough: T(flakesRough) };
  }

  /* ---------- colour helpers ---------- */
  const hex = (c) => { const v = parseInt(c.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
  const lin = (c) => c.map((x) => Math.pow(x, 2.2)); // vertex colours are linear
  ST.hexToLinear = (c) => lin(hex(c));
  function hsl(h, s, l) { const k = (n) => (n + h * 12) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)]; }

  /* =========================================================
     SAND
     ========================================================= */
  class Sand {
    constructor(scene) {
      this.h = new Float32Array(N);
      this.col = new Float32Array(N * 3);
      this.loose = new Float32Array(N);
      const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), colr = new Float32Array(N * 3), uv = new Float32Array(N * 2);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        pos[k * 3] = -W / 2 + i * CX; pos[k * 3 + 2] = -D / 2 + j * CZ;
        nor[k * 3 + 1] = 1;
        uv[k * 2] = (i / (NX - 1)) * 7; uv[k * 2 + 1] = (j / (NZ - 1)) * 4.4;
      }
      const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
      let p = 0;
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
        idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("color", new THREE.BufferAttribute(colr, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.1, 0), 1.2);
      this.geo = geo;
      this.tex = grainTextures();
      this.mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: this.tex.albedo, normalMap: this.tex.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.95, metalness: 0 });
      // neon / glow sand: emissive light in the sand's own colour
      this.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive * vColor;"); };
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.castShadow = true; this.mesh.receiveShadow = true;
      scene.add(this.mesh);
      this.scheme = { kind: "solid", layers: null };
      this.dirty = null; this.looseBox = null;
      this.particles = new Grains(scene, this);
    }

    /* ---------- basics ---------- */
    idx(i, j) { return j * NX + i; }
    toGrid(x, z) { return { gx: (x + W / 2) / CX, gz: (z + D / 2) / CZ }; }
    toWorld(gx, gz) { return { x: -W / 2 + gx * CX, z: -D / 2 + gz * CZ }; }
    inside(gx, gz) { return gx >= 0 && gz >= 0 && gx <= NX - 1 && gz <= NZ - 1; }
    heightAtGrid(gx, gz) {
      if (!this.inside(gx, gz)) return -0.05;
      const i = Math.min(NX - 2, Math.floor(gx)), j = Math.min(NZ - 2, Math.floor(gz)), fx = gx - i, fz = gz - j, h = this.h;
      const k = j * NX + i;
      return (h[k] * (1 - fx) + h[k + 1] * fx) * (1 - fz) + (h[k + NX] * (1 - fx) + h[k + NX + 1] * fx) * fz;
    }
    heightAt(x, z) { const g = this.toGrid(x, z); return this.heightAtGrid(g.gx, g.gz); }
    mark(i0, j0, i1, j1) {
      i0 = clamp(Math.floor(i0), 0, NX - 1); i1 = clamp(Math.ceil(i1), 0, NX - 1); j0 = clamp(Math.floor(j0), 0, NZ - 1); j1 = clamp(Math.ceil(j1), 0, NZ - 1);
      const d = this.dirty;
      this.dirty = d ? { i0: Math.min(d.i0, i0), j0: Math.min(d.j0, j0), i1: Math.max(d.i1, i1), j1: Math.max(d.j1, j1) } : { i0, j0, i1, j1 };
    }
    markLoose(i0, j0, i1, j1) {
      // whole cells only (fractional bounds would make the relax loop skip every cell)
      i0 = clamp(Math.floor(i0), 0, NX - 1); i1 = clamp(Math.ceil(i1), 0, NX - 1); j0 = clamp(Math.floor(j0), 0, NZ - 1); j1 = clamp(Math.ceil(j1), 0, NZ - 1);
      const d = this.looseBox;
      this.looseBox = d ? { i0: Math.min(d.i0, i0), j0: Math.min(d.j0, j0), i1: Math.max(d.i1, i1), j1: Math.max(d.j1, j1) } : { i0, j0, i1, j1 };
    }
    // walk the cells inside a radius
    each(gx, gz, r, fn) {
      const i0 = Math.max(0, Math.floor(gx - r)), i1 = Math.min(NX - 1, Math.ceil(gx + r)), j0 = Math.max(0, Math.floor(gz - r)), j1 = Math.min(NZ - 1, Math.ceil(gz + r));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(i - gx, j - gz); if (d <= r) fn(j * NX + i, i, j, d); }
      this.mark(i0, j0, i1, j1);
    }

    /* ---------- add sand somewhere (keeps colours mixing naturally) ---------- */
    deposit(gx, gz, amount, r, color, loose) {
      if (amount <= 0) return;
      r = Math.max(0.8, r || 1.2);
      let wsum = 0;
      const cells = [];
      this.each(gx, gz, r, (k, i, j, d) => { const w = 1 - d / (r + 0.01); wsum += w; cells.push(k, w); });
      if (!wsum) return;
      const h = this.h, col = this.col, L = this.loose;
      for (let n = 0; n < cells.length; n += 2) {
        const k = cells[n], add = (amount * cells[n + 1]) / wsum;
        if (color) { const f = add / (h[k] + add + 1e-6); col[k * 3] += (color[0] - col[k * 3]) * f; col[k * 3 + 1] += (color[1] - col[k * 3 + 1]) * f; col[k * 3 + 2] += (color[2] - col[k * 3 + 2]) * f; }
        h[k] += add;
        if (loose) L[k] = Math.max(L[k], loose);
      }
      if (loose) this.markLoose(gx - r, gz - r, gx + r, gz + r);
    }
    colorAt(k) { return [this.col[k * 3], this.col[k * 3 + 1], this.col[k * 3 + 2]]; }

    /* =========================================================
       TOOL OPERATIONS (all in grid units)
       ========================================================= */
    // cut along a segment. mode: "full" (to the tray), "round" (smooth U), "shallow" (carving)
    carve(ax, az, bx, bz, o) {
      const hw = o.hw, pad = hw + 5;
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1e-6, len = Math.sqrt(len2);
      const px = -dz / len, pz = dx / len;
      const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - pad)), i1 = Math.min(NX - 1, Math.ceil(Math.max(ax, bx) + pad));
      const j0 = Math.max(0, Math.floor(Math.min(az, bz) - pad)), j1 = Math.min(NZ - 1, Math.ceil(Math.max(az, bz) + pad));
      const h = this.h, moves = [];
      let removed = 0;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const t = clamp(((i - ax) * dx + (j - az) * dz) / len2, 0, 1);
        const cx = ax + dx * t, cz = az + dz * t, d = Math.hypot(i - cx, j - cz);
        if (d >= hw) continue;
        const k = j * NX + i, f = d / hw;
        let nh;
        if (o.mode === "round") nh = h[k] * f * f;
        else if (o.mode === "shallow") nh = Math.max(0, h[k] - o.depth * (1 - f * f));
        else nh = 0;
        const rem = h[k] - nh;
        if (rem <= 1e-5) continue;
        h[k] = nh; removed += rem;
        // the blade nudges a little sand aside, well clear of the cut, and it stays firm (kinetic sand holds its walls)
        if (o.side) { const s = (i - cx) * px + (j - cz) * pz >= 0 ? 1 : -1, off = hw + 2.8 + Math.random() * 2; moves.push(cx + px * s * off, cz + pz * s * off, rem * (o.mode === "shallow" ? 0.6 : 0.35), k); }
      }
      for (let n = 0; n < moves.length; n += 4) this.deposit(moves[n], moves[n + 1], moves[n + 2], 2.2, this.colorAt(moves[n + 3]), 0);
      this.mark(i0, j0, i1, j1);
      return removed;
    }

    // hammer: a crater with a raised rim
    crater(gx, gz, r, depth) {
      let removed = 0;
      const ring = [];
      this.each(gx, gz, r * 1.5, (k, i, j, d) => {
        if (d < r) { const rem = Math.min(this.h[k], depth * (1 - (d / r) ** 2)); this.h[k] -= rem; removed += rem; }
        else ring.push(k, i, j, d);
      });
      const avg = this.avgColor(gx, gz, r);
      for (let n = 0; n < ring.length; n += 4) { const d = ring[n + 3], w = Math.sin(((d - r) / (r * 0.5)) * Math.PI); this.deposit(ring[n + 1], ring[n + 2], (removed * 0.9 * w) / Math.max(1, ring.length / 4) * 1.6, 1, avg, 0.8); }
      return { removed, avg };
    }

    // press / block / roller: flatten down to a level and squeeze the extra out sideways
    flatten(gx, gz, r, level, rate, square, outward) {
      let removed = 0;
      const test = square ? (i, j) => Math.max(Math.abs(i - gx), Math.abs(j - gz)) <= r : null;
      const rr = square ? r * 1.42 : r;
      this.each(gx, gz, rr, (k, i, j, d) => {
        if (test && !test(i, j)) return;
        if (this.h[k] > level) { const rem = (this.h[k] - level) * rate; this.h[k] -= rem; removed += rem; }
      });
      if (removed > 0) {
        const avg = this.avgColor(gx, gz, r);
        const n = 28;
        for (let s = 0; s < n; s++) {
          const a = (s / n) * Math.PI * 2, rad = (square ? r * 1.15 : r) + 1.5 + Math.random() * 2;
          const ox = outward ? outward[0] : 0, oz = outward ? outward[1] : 0;
          this.deposit(gx + Math.cos(a) * rad + ox, gz + Math.sin(a) * rad + oz, removed / n, 2, avg, 0.55);
        }
      }
      return removed;
    }

    // roller ribs: subtle stripes so it looks rolled
    ribs(gx, gz, r, ax, az, amt) {
      this.each(gx, gz, r, (k, i, j) => { const along = (i - gx) * ax + (j - gz) * az; this.h[k] = Math.max(0, this.h[k] - amt * (0.5 + 0.5 * Math.sin(along * 1.9))); });
    }

    // crusher: break into crumbs (returns how many crumbs to spawn)
    crumble(gx, gz, r) {
      let taken = 0;
      this.each(gx, gz, r, (k, i, j, d) => {
        const f = 1 - d / r;
        const t = this.h[k] * 0.4 * f; this.h[k] -= t; taken += t;
        this.h[k] *= 0.8 + Math.random() * 0.35;
        this.loose[k] = 1;
      });
      this.markLoose(gx - r, gz - r, gx + r, gz + r);
      return taken;
    }

    // stamps & fingerprints: press a pattern in
    imprint(gx, gz, r, mask, depth) {
      let removed = 0;
      this.each(gx, gz, r * 1.42, (k, i, j) => {
        const u = (i - gx) / r, v = (j - gz) / r;
        if (Math.abs(u) > 1 || Math.abs(v) > 1) return;
        const m = mask(u, v);
        if (m <= 0) return;
        const rem = Math.min(this.h[k], depth * m);
        this.h[k] -= rem; removed += rem;
      });
      if (removed > 0) { const avg = this.avgColor(gx, gz, r); for (let s = 0; s < 20; s++) { const a = (s / 20) * Math.PI * 2; this.deposit(gx + Math.cos(a) * (r * 1.25 + 1), gz + Math.sin(a) * (r * 1.25 + 1), removed / 20, 1.8, avg, 0.3); } }
      return removed;
    }

    // spatula / fingers: push sand along a direction
    push(gx, gz, r, dx, dz, strength) {
      const moves = [];
      this.each(gx, gz, r, (k, i, j, d) => {
        const w = (1 - d / r) * strength, a = this.h[k] * w;
        if (a <= 1e-5) return;
        this.h[k] -= a;
        moves.push(i + dx, j + dz, a, k);
      });
      for (let n = 0; n < moves.length; n += 4) this.deposit(moves[n], moves[n + 1], moves[n + 2], 1.1, this.colorAt(moves[n + 3]), 0.45);
    }

    // scraper: shave a thin layer and pile it up in front
    scrape(gx, gz, r, layer, fx, fz) {
      let taken = 0;
      this.each(gx, gz, r, (k) => { const t = Math.min(layer, this.h[k]); this.h[k] -= t; taken += t; });
      if (taken > 0) this.deposit(gx + fx * (r + 2), gz + fz * (r + 2), taken * 0.95, r * 0.7, this.avgColor(gx, gz, r), 0.7);
      return taken;
    }

    // spoon: scoop a bowl-shaped amount out
    scoop(gx, gz, r, depth) {
      let taken = 0;
      const avg = this.avgColor(gx, gz, r);
      this.each(gx, gz, r, (k, i, j, d) => { const t = Math.min(this.h[k], depth * (1 - (d / r) ** 2)); this.h[k] -= t; taken += t; });
      return { taken, color: avg };
    }

    // drop a round sand ball
    ball(gx, gz, r, color) {
      this.each(gx, gz, r, (k, i, j, d) => {
        const add = Math.sqrt(Math.max(0, r * r - d * d)) * CELL * 0.95;
        const f = add / (this.h[k] + add + 1e-6);
        for (let c = 0; c < 3; c++) this.col[k * 3 + c] += (color[c] - this.col[k * 3 + c]) * f;
        this.h[k] += add;
        this.loose[k] = Math.max(this.loose[k], 0.15);
      });
      this.markLoose(gx - r, gz - r, gx + r, gz + r);
    }

    // moulds: build a crisp shape on top of whatever is there (click again to stack)
    mould(gx, gz, r, inside, height, color) {
      let top = 0;
      const cells = [];
      this.each(gx, gz, r * 1.42, (k, i, j) => {
        const u = (i - gx) / r, v = (j - gz) / r;
        if (Math.abs(u) > 1 || Math.abs(v) > 1 || !inside(u, v)) return;
        cells.push(k); top = Math.max(top, this.h[k]);
      });
      const target = top + height;
      for (const k of cells) {
        const add = target - this.h[k];
        if (add <= 0) continue;
        const f = add / (target + 1e-6);
        for (let c = 0; c < 3; c++) this.col[k * 3 + c] += (color[c] - this.col[k * 3 + c]) * f;
        this.h[k] = target; this.loose[k] = 0;
      }
      return cells.length;
    }

    // squeeze: gather sand into a pinched peak
    squeeze(gx, gz, r, rate) {
      let taken = 0;
      this.each(gx, gz, r, (k, i, j, d) => { if (d < r * 0.3) return; const t = this.h[k] * rate * (d / r); this.h[k] -= t; taken += t; });
      if (taken > 0) { this.each(gx, gz, r * 0.3, (k, i, j, d) => { this.h[k] += (taken / (Math.PI * (r * 0.3) ** 2 + 1)) * (1.6 - d / (r * 0.3)); this.loose[k] = Math.max(this.loose[k], 0.35); }); this.markLoose(gx - r, gz - r, gx + r, gz + r); }
    }

    // freehand: raise or dig
    sculpt(gx, gz, r, amt, color) {
      this.each(gx, gz, r, (k, i, j, d) => {
        const w = 1 - (d / r) ** 2;
        if (amt > 0) { const add = amt * w, f = add / (this.h[k] + add + 1e-6); for (let c = 0; c < 3; c++) this.col[k * 3 + c] += (color[c] - this.col[k * 3 + c]) * f; this.h[k] += add; }
        else this.h[k] = Math.max(0, this.h[k] + amt * w);
      });
    }

    avgColor(gx, gz, r) {
      let a = 0, b = 0, c = 0, n = 0;
      const i0 = Math.max(0, Math.floor(gx - r)), i1 = Math.min(NX - 1, Math.ceil(gx + r)), j0 = Math.max(0, Math.floor(gz - r)), j1 = Math.min(NZ - 1, Math.ceil(gz + r));
      for (let j = j0; j <= j1; j += 2) for (let i = i0; i <= i1; i += 2) { const k = j * NX + i; if (this.h[k] < 0.002) continue; a += this.col[k * 3]; b += this.col[k * 3 + 1]; c += this.col[k * 3 + 2]; n++; }
      return n ? [a / n, b / n, c / n] : [0.6, 0.45, 0.3];
    }

    /* =========================================================
       SHAPES & COLOURS
       ========================================================= */
    setShape(kind) {
      const h = this.h;
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const u = (i / (NX - 1)) * 2 - 1, v = (j / (NZ - 1)) * 2 - 1, k = j * NX + i;
        let y = 0;
        if (kind === "mound") { const d = Math.hypot(u * 1.0, v * 1.25); y = 0.13 * Math.max(0, Math.cos(Math.min(1, d / 0.85) * Math.PI / 2)) ** 1.3; }
        else if (kind === "block") { const e = Math.max(Math.abs(u) / 0.62, Math.abs(v) / 0.62); y = e < 1 ? 0.1 * Math.min(1, (1 - e) * 22) : 0; }
        else if (kind === "flat") y = 0.05 * Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(v))) * 30);
        else if (kind === "random") {
          y = 0.035 + 0.03 * Math.sin(u * 4.1 + this.seed) * Math.cos(v * 3.3 - this.seed) + 0.02 * Math.sin(u * 9 + v * 7 + this.seed * 2) + 0.03 * Math.max(0, 1 - Math.hypot(u - Math.sin(this.seed) * 0.5, v) * 2.5);
          y *= Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(v))) * 20);
        } else if (kind === "towers") {
          y = 0.03;
          for (const [cx, cz, rr, hh] of [[-0.5, -0.2, 0.14, 0.14], [0, 0.25, 0.12, 0.18], [0.5, -0.1, 0.16, 0.11], [-0.15, -0.45, 0.09, 0.09]]) if (Math.hypot(u - cx, (v - cz) * 1.6) < rr * 1.6) y = Math.max(y, hh);
          y *= Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(v))) * 20);
        }
        h[k] = Math.max(0, y);
      }
      this.initMax = Math.max(...[0.13, 0.1, 0.05, 0.12, 0.18]);
      this.loose.fill(0); this.looseBox = null;
      this.shape = kind;
      this.mark(0, 0, NX - 1, NZ - 1);
    }

    // fill the sand with a colour scheme
    setScheme(kind, colors) {
      this.scheme = { kind, colors: colors.map(ST.hexToLinear) };
      const C = this.scheme.colors, col = this.col;
      const seed = Math.random() * 10;
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i, u = i / (NX - 1), v = j / (NZ - 1);
        let c;
        if (kind === "rainbow") c = lin(hsl((u * 0.85 + v * 0.15) % 1, 0.75, 0.6));
        else if (kind === "gradient") { const t = u * 0.8 + v * 0.2; c = [0, 1, 2].map((n) => C[0][n] + (C[1][n] - C[0][n]) * t); }
        else if (kind === "mixed") { const nz = Math.sin(u * 13 + seed) + Math.sin(v * 11 - seed * 1.3) + Math.sin((u + v) * 17 + seed * 2); c = C[Math.abs(Math.floor(nz * 1.3)) % C.length]; }
        else c = C[0];
        col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
      }
      this.mark(0, 0, NX - 1, NZ - 1);
    }

    /* ---------- the look of the sand ---------- */
    setType(t) {
      const m = this.mat;
      Object.assign(m, { roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.4, metalnessMap: null, roughnessMap: null });
      m.emissive.setRGB(0, 0, 0);
      m.normalScale.set(0.9, 0.9);
      this.tex.albedo.repeat.set(1, 1); this.tex.normal.repeat.set(1, 1);
      const rep = (n) => { this.tex.albedo.repeat.set(n, n); this.tex.normal.repeat.set(n, n); this.tex.flakes.repeat.set(n, n); this.tex.flakeRough.repeat.set(n, n); };
      if (t === "fine") { rep(2.2); m.normalScale.set(0.45, 0.45); m.roughness = 0.9; }
      if (t === "wet") { m.roughness = 0.42; m.clearcoat = 0.45; m.normalScale.set(0.55, 0.55); }
      if (t === "glitter") { m.metalnessMap = this.tex.flakes; m.roughnessMap = this.tex.flakeRough; m.metalness = 1; m.roughness = 1; rep(1.6); }
      if (t === "metallic") { m.metalness = 0.75; m.roughness = 0.38; m.normalScale.set(0.5, 0.5); }
      if (t === "neon") { m.emissive.setRGB(0.55, 0.55, 0.55); m.roughness = 0.7; }
      if (t === "glow") { m.emissive.setRGB(0.9, 0.9, 0.9); m.roughness = 0.85; }
      m.needsUpdate = true;
      this.type = t;
      this.mark(0, 0, NX - 1, NZ - 1);
    }

    /* =========================================================
       PHYSICS: loose sand slumps, then firms up
       ========================================================= */
    relax(dt) {
      const b = this.looseBox;
      if (!b) return;
      const h = this.h, L = this.loose, col = this.col;
      const T = CELL * 0.8; // ~39° angle of repose for loose sand
      const i0 = Math.max(1, b.i0 - 2), i1 = Math.min(NX - 2, b.i1 + 2), j0 = Math.max(1, b.j0 - 2), j1 = Math.min(NZ - 2, b.j1 + 2);
      let any = false;
      // settle at a fixed rate per second (not per frame), so slow devices look the same
      const iters = Math.max(1, Math.min(10, Math.round(dt * 150)));
      for (let it = 0; it < iters; it++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * NX + i;
        if (L[k] < 0.02) continue;
        any = true;
        for (const nb of [k + 1, k - 1, k + NX, k - NX]) {
          const d = h[k] - h[nb];
          if (d > T) {
            const m = (d - T) * 0.22 * L[k];
            const f = m / (h[nb] + m + 1e-6);
            for (let c = 0; c < 3; c++) col[nb * 3 + c] += (col[k * 3 + c] - col[nb * 3 + c]) * f;
            h[k] -= m; h[nb] += m;
            L[nb] = Math.max(L[nb], L[k] * 0.7);
          }
        }
      }
      const decay = Math.exp(-dt * 0.9);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) L[j * NX + i] *= decay;
      if (any) this.mark(i0, j0, i1, j1);
      else this.looseBox = null;
    }

    /* ---------- push changes to the GPU ---------- */
    update(dt) {
      this.relax(dt);
      this.particles.update(dt);
      const d = this.dirty;
      if (!d) return;
      this.dirty = null;
      const pos = this.geo.attributes.position, nor = this.geo.attributes.normal, colA = this.geo.attributes.color;
      const P = pos.array, Nn = nor.array, Cc = colA.array, h = this.h, col = this.col;
      const layered = this.scheme.kind === "layers" ? this.scheme.colors : null;
      const j0 = Math.max(0, d.j0 - 4), j1 = Math.min(NZ - 1, d.j1 + 4), i0 = Math.max(0, d.i0 - 4), i1 = Math.min(NX - 1, d.i1 + 4);
      const H = (i, j) => h[clamp(j, 0, NZ - 1) * NX + clamp(i, 0, NX - 1)];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * NX + i, y = h[k];
        P[k * 3 + 1] = y;
        let nx = (H(i - 1, j) - H(i + 1, j)) / (2 * CX), nz = (H(i, j - 1) - H(i, j + 1)) / (2 * CZ);
        const l = Math.hypot(nx, 1, nz);
        Nn[k * 3] = nx / l; Nn[k * 3 + 1] = 1 / l; Nn[k * 3 + 2] = nz / l;
        // fake ambient occlusion: darker down in cuts and dents
        const around = (H(i - 4, j) + H(i + 4, j) + H(i, j - 4) + H(i, j + 4)) / 4;
        const ao = clamp(1 - Math.max(0, around - y) * 9, 0.45, 1) * (y < 0.0015 ? 0.55 : 1);
        let r, g, b;
        if (layered) { const t = clamp(y / 0.13, 0, 0.999) * layered.length, c = layered[Math.floor(t)]; r = c[0]; g = c[1]; b = c[2]; }
        else { r = col[k * 3]; g = col[k * 3 + 1]; b = col[k * 3 + 2]; }
        Cc[k * 3] = r * ao; Cc[k * 3 + 1] = g * ao; Cc[k * 3 + 2] = b * ao;
      }
      const start = j0 * NX * 3, count = (j1 - j0 + 1) * NX * 3;
      for (const a of [pos, nor, colA]) { a.clearUpdateRanges(); a.addUpdateRange(start, count); a.needsUpdate = true; }
    }

    /* ---------- find where a ray touches the sand ---------- */
    raycast(ray) {
      const o = ray.origin, dir = ray.direction;
      let t = 0, prev = null;
      for (let s = 0; s < 400; s++) {
        const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t;
        const hh = this.heightAt(x, z);
        if (y <= hh) {
          // refine between the last two samples
          let a = prev != null ? prev : t - 0.01, b2 = t;
          for (let k = 0; k < 8; k++) { const m = (a + b2) / 2, yy = o.y + dir.y * m, hm = this.heightAt(o.x + dir.x * m, o.z + dir.z * m); if (yy <= hm) b2 = m; else a = m; }
          const p = new THREE.Vector3(o.x + dir.x * b2, o.y + dir.y * b2, o.z + dir.z * b2);
          const g = this.toGrid(p.x, p.z);
          return { point: p, gx: g.gx, gz: g.gz, inside: this.inside(g.gx, g.gz) };
        }
        prev = t;
        t += 0.008;
      }
      return null;
    }

    snapshot() { return { h: this.h.slice(), col: this.col.slice() }; }
    restore(s) { this.h.set(s.h); this.col.set(s.col); this.loose.fill(0); this.looseBox = null; this.particles.clear(); this.mark(0, 0, NX - 1, NZ - 1); }
    stats() {
      let max = 0, sum = 0, n = 0;
      for (let j = 10; j < NZ - 10; j += 2) for (let i = 10; i < NX - 10; i += 2) { const y = this.h[j * NX + i]; if (y > max) max = y; sum += y; n++; }
      return { max, mean: sum / n };
    }
  }

  /* =========================================================
     GRAINS: crumbs and poured sand that fall and pile up
     ========================================================= */
  class Grains {
    constructor(scene, sand) {
      this.sand = sand; this.cap = 2600;
      this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.95 }), this.cap);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.castShadow = true; this.mesh.frustumCulled = false;
      for (let i = 0; i < this.cap; i++) this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      this.mesh.count = 0;
      scene.add(this.mesh);
      this.p = [];
      this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.e = new THREE.Euler(); this.c = new THREE.Color();
      this.timeScale = 1;
    }
    spawn(pos, vel, r, color, vol) {
      if (this.p.length >= this.cap) return;
      this.p.push({ x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, r, color, vol: vol != null ? vol : (r * r * r * 4.2) / (CELL * CELL), rot: Math.random() * 6, life: 6 });
    }
    update(dt) {
      dt *= this.timeScale;
      const S = this.sand, keep = [];
      let n = 0;
      for (const p of this.p) {
        p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 6; p.life -= dt;
        const g = S.toGrid(p.x, p.z);
        if (!S.inside(g.gx, g.gz)) { if (p.y < -0.3 || p.life < 0) continue; }
        else if (p.y - p.r * 0.5 <= S.heightAtGrid(g.gx, g.gz)) {
          // landed: becomes part of the sand
          S.deposit(g.gx, g.gz, p.vol, 2 + p.r / CELL * 0.6, p.color, 1);
          if (S.onLand) S.onLand(p);
          continue;
        }
        if (n < this.cap) {
          this.e.set(p.rot, p.rot * 0.7, 0); this.q.setFromEuler(this.e); this.s.setScalar(p.r);
          this.m4.compose(new THREE.Vector3(p.x, p.y, p.z), this.q, this.s);
          this.mesh.setMatrixAt(n, this.m4);
          this.c.setRGB(p.color[0], p.color[1], p.color[2], THREE.LinearSRGBColorSpace);
          this.mesh.setColorAt(n, this.c);
          n++;
        }
        keep.push(p);
      }
      this.p = keep;
      this.mesh.count = n;
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
    clear() { this.p = []; this.mesh.count = 0; }
  }

  ST.Sand = Sand;
})();
