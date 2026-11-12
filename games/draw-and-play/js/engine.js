/* ============ DRAW & PLAY — colouring engine ============
   Layers: white paper → paint (what you colour) → black outlines on top.
   The outlines are analysed once per page into enclosed areas ("regions"),
   which power the paint bucket, "stay inside the lines" and completion %. */
(function () {
  "use strict";
  const DP = (window.DP = window.DP || {});
  const SIZE = 800, N = SIZE * SIZE;
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };
  const R = (a, b) => a + Math.random() * (b - a);

  /* ---------- colour helpers ---------- */
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgbToHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
  function mix(h, h2, t) { const a = hexToRgb(h), b = hexToRgb(h2); return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }
  DP.color = { hexToRgb, rgbToHex, mix };

  /* ---------- textures ---------- */
  function noiseCanvas(size, density, minA, maxA, dot) {
    // transparent with dark speckles; used with destination-out so the paper shows through
    const c = mk(size), x = c.getContext("2d");
    for (let i = 0; i < size * size * density; i++) { x.fillStyle = "rgba(0,0,0," + R(minA, maxA) + ")"; x.fillRect(R(0, size), R(0, size), dot, dot); }
    return c;
  }
  const GRAIN = { fine: noiseCanvas(128, 0.3, 0.15, 0.55, 1), coarse: noiseCanvas(128, 0.06, 0.5, 0.95, 2.2) };

  const PATTERNS = ["dots", "stripes", "checks", "hearts", "stars", "zigzag"];
  DP.PATTERNS = PATTERNS;
  const patCache = {};
  function patternFor(ctx, kind, color) {
    const key = kind + color;
    if (!patCache[key]) {
      const c = mk(28), x = c.getContext("2d");
      x.fillStyle = color; x.strokeStyle = color; x.lineWidth = 4;
      if (kind === "dots") { x.beginPath(); x.arc(7, 7, 5, 0, 7); x.arc(21, 21, 5, 0, 7); x.fill(); }
      if (kind === "stripes") { x.beginPath(); x.moveTo(-4, 32); x.lineTo(32, -4); x.moveTo(-18, 18); x.lineTo(18, -18); x.moveTo(10, 46); x.lineTo(46, 10); x.stroke(); }
      if (kind === "checks") { x.fillRect(0, 0, 14, 14); x.fillRect(14, 14, 14, 14); }
      if (kind === "hearts") { x.beginPath(); x.moveTo(14, 22); x.bezierCurveTo(0, 12, 6, 2, 14, 9); x.bezierCurveTo(22, 2, 28, 12, 14, 22); x.fill(); }
      if (kind === "stars") { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 10; x.lineTo(14 + Math.cos(a) * r, 14 + Math.sin(a) * r); } x.fill(); }
      if (kind === "zigzag") { x.beginPath(); x.moveTo(0, 18); x.lineTo(7, 10); x.lineTo(14, 18); x.lineTo(21, 10); x.lineTo(28, 18); x.stroke(); }
      patCache[key] = c;
    }
    return ctx.createPattern(patCache[key], "repeat");
  }

  /* =========================================================
     BRUSHES — each draws onto the stroke canvas
     ========================================================= */
  function line(ctx, a, b, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function along(a, b, step, fn) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / step));
    for (let i = 1; i <= n; i++) fn(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n);
  }
  const BRUSHES = {
    brush: { name: "Brush", icon: "🖌️", seg(c, a, b, o) { line(c, a, b, o.size, o.color); } },
    pencil: { name: "Pencil", icon: "✏️", grain: "fine", seg(c, a, b, o) { const w = Math.max(1.5, o.size * 0.35); line(c, a, b, w, o.color); line(c, { x: a.x + R(-1, 1), y: a.y + R(-1, 1) }, { x: b.x + R(-1, 1), y: b.y + R(-1, 1) }, w * 0.6, o.color); } },
    crayon: { name: "Crayon", icon: "🖍️", grain: "coarse", seg(c, a, b, o) { line(c, a, b, o.size, o.color); } },
    watercolor: { name: "Watercolour", icon: "💧", alpha: 0.7, seg(c, a, b, o) {
      along(a, b, Math.max(2, o.size * 0.18), (x, y) => {
        const r = o.size * R(0.45, 0.6);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        const [cr, cg, cb] = hexToRgb(o.color);
        g.addColorStop(0, "rgba(" + cr + "," + cg + "," + cb + ",0.22)"); g.addColorStop(0.75, "rgba(" + cr + "," + cg + "," + cb + ",0.16)"); g.addColorStop(1, "rgba(" + cr + "," + cg + "," + cb + ",0)");
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      });
    } },
    marker: { name: "Marker", icon: "🖊️", alpha: 0.75, blend: "multiply", seg(c, a, b, o) { line(c, a, b, o.size, o.color); } },
    spray: { name: "Spray Paint", icon: "🫧", seg(c, a, b, o) {
      c.fillStyle = o.color;
      along(a, b, 4, (x, y) => { for (let i = 0; i < o.size * 0.9; i++) { const ang = R(0, 6.28), d = Math.sqrt(Math.random()) * o.size * 0.9; c.fillRect(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.6, 1.6); } });
    } },
    glitter: { name: "Glitter", icon: "✨", seg(c, a, b, o) {
      line(c, a, b, o.size, mix(o.color, "#ffffff", 0.08));
      const cols = [mix(o.color, "#ffffff", 0.6), "#ffffff", "#ffe066", mix(o.color, "#000000", 0.25)];
      along(a, b, 3, (x, y) => {
        for (let i = 0; i < 2; i++) {
          const px = x + R(-o.size / 2, o.size / 2), py = y + R(-o.size / 2, o.size / 2), r = R(0.8, 2.6);
          c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          if (Math.random() < 0.15) { c.beginPath(); c.moveTo(px, py - r * 2.5); c.lineTo(px + r * 0.6, py); c.lineTo(px, py + r * 2.5); c.lineTo(px - r * 0.6, py); c.fill(); c.beginPath(); c.moveTo(px - r * 2.5, py); c.lineTo(px, py + r * 0.6); c.lineTo(px + r * 2.5, py); c.lineTo(px, py - r * 0.6); c.fill(); }
          else c.fillRect(px, py, r, r);
        }
      });
    } },
    rainbow: { name: "Rainbow", icon: "🌈", seg(c, a, b, o, st) {
      along(a, b, 2, (x, y) => { st.dist += 2; c.strokeStyle = "hsl(" + ((st.dist * 0.8) % 360) + ",90%,60%)"; c.lineWidth = o.size; c.lineCap = "round"; c.beginPath(); c.moveTo(st.px, st.py); c.lineTo(x, y); c.stroke(); st.px = x; st.py = y; });
    } },
    neon: { name: "Neon", icon: "💡", seg(c, a, b, o) {
      c.save(); c.shadowColor = o.color; c.shadowBlur = o.size * 1.1;
      line(c, a, b, o.size * 0.7, o.color);
      c.shadowBlur = o.size * 0.4; line(c, a, b, Math.max(1.5, o.size * 0.28), mix(o.color, "#ffffff", 0.75));
      c.restore();
    } },
    texture: { name: "Pattern", icon: "🧶", seg(c, a, b, o) { c.strokeStyle = patternFor(c, o.pattern, o.color); c.lineWidth = o.size; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } },
    eraser: { name: "Eraser", icon: "🧽", blend: "destination-out", seg(c, a, b, o) { line(c, a, b, o.size, "#000"); } }
  };
  DP.BRUSHES = BRUSHES;

  /* =========================================================
     ENGINE
     ========================================================= */
  class Engine {
    constructor(viewport) {
      this.viewport = viewport;
      this.display = mk(SIZE); this.display.className = "page-canvas";
      this.dctx = this.display.getContext("2d");
      viewport.appendChild(this.display);
      this.paint = mk(SIZE); this.pctx = this.paint.getContext("2d", { willReadFrequently: true });
      this.lines = mk(SIZE); this.lctx = this.lines.getContext("2d");
      this.stroke = mk(SIZE); this.sctx = this.stroke.getContext("2d");
      this.tmp = mk(SIZE); this.tctx = this.tmp.getContext("2d");
      this.preview = mk(SIZE); this.vctx = this.preview.getContext("2d");
      this.opts = { tool: "fill", color: "#ff6b6b", size: 22, opacity: 1, intensity: 1, boundary: true, pattern: "dots" };
      this.undoStack = []; this.redoStack = [];
      this.view = { scale: 1, x: 0, y: 0 };
      this.masks = new Map();
      this.colorsUsed = new Set(); this.toolsUsed = new Set();
      this.dirty = true; this.active = null; this.locked = false;
      this.onChange = () => {};
      this.bindInput();
      const loop = () => { if (this.dirty) this.render(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      if ("ResizeObserver" in window) new ResizeObserver(() => this.fit()).observe(viewport);
      window.addEventListener("resize", () => this.fit());
    }

    /* ---------- load a page ---------- */
    load(level) {
      this.level = level;
      const work = mk(SIZE), w = work.getContext("2d", { willReadFrequently: true });
      DP.drawPage(w, level, SIZE);
      const src = w.getImageData(0, 0, SIZE, SIZE).data;
      const out = this.lctx.createImageData(SIZE, SIZE), o = out.data;
      const isLine = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const dark = 255 - (src[i * 4] + src[i * 4 + 1] + src[i * 4 + 2]) / 3;
        o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = 20;
        o[i * 4 + 3] = dark < 25 ? 0 : Math.min(255, (dark - 25) * 1.25);
        if (dark > 100) isLine[i] = 1;
      }
      this.lctx.putImageData(out, 0, 0);
      this.labelRegions(isLine);
      this.pctx.clearRect(0, 0, SIZE, SIZE);
      this.undoStack = []; this.redoStack = [];
      this.masks.clear();
      this.colorsUsed = new Set(); this.toolsUsed = new Set();
      this.fit();
      this.dirty = true;
    }

    labelRegions(isLine) {
      const lab = new Int32Array(N);
      const stack = new Int32Array(N);
      const areas = [0];
      let next = 1;
      for (let s = 0; s < N; s++) {
        if (isLine[s] || lab[s]) continue;
        let sp = 0, area = 0;
        stack[sp++] = s; lab[s] = next;
        while (sp) {
          const i = stack[--sp]; area++;
          const x = i % SIZE;
          if (x > 0 && !isLine[i - 1] && !lab[i - 1]) { lab[i - 1] = next; stack[sp++] = i - 1; }
          if (x < SIZE - 1 && !isLine[i + 1] && !lab[i + 1]) { lab[i + 1] = next; stack[sp++] = i + 1; }
          if (i >= SIZE && !isLine[i - SIZE] && !lab[i - SIZE]) { lab[i - SIZE] = next; stack[sp++] = i - SIZE; }
          if (i < N - SIZE && !isLine[i + SIZE] && !lab[i + SIZE]) { lab[i + SIZE] = next; stack[sp++] = i + SIZE; }
        }
        areas.push(area); next++;
      }
      // grow regions under the outlines a little, so fills tuck neatly beneath them
      const grown = lab.slice();
      for (let pass = 0; pass < 3; pass++) {
        const src = grown.slice();
        for (let i = 0; i < N; i++) {
          if (src[i]) continue;
          const x = i % SIZE;
          const v = (x > 0 && src[i - 1]) || (x < SIZE - 1 && src[i + 1]) || (i >= SIZE && src[i - SIZE]) || (i < N - SIZE && src[i + SIZE]);
          if (v) grown[i] = v;
        }
      }
      this.labels = lab; this.grown = grown; this.areas = areas;
      this.outer = lab[2 * SIZE + 2] || 0;
      // pixels that count toward completion (every 2nd pixel is plenty)
      const idx = [];
      for (let y = 0; y < SIZE; y += 2) for (let x = 0; x < SIZE; x += 2) { const i = y * SIZE + x, l = lab[i]; if (l && l !== this.outer && areas[l] >= 60) idx.push(i); }
      this.countIdx = Uint32Array.from(idx);
      this.regionCount = areas.filter((a, i) => i && i !== this.outer && a >= 60).length;
    }

    regionAt(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return 0;
      let l = this.grown[y * SIZE + x];
      for (let r = 1; !l && r < 8; r++) for (let dy = -r; dy <= r && !l; dy++) for (let dx = -r; dx <= r && !l; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < SIZE && yy < SIZE) l = this.grown[yy * SIZE + xx]; }
      return l;
    }

    mask(id) {
      if (this.masks.has(id)) { const m = this.masks.get(id); this.masks.delete(id); this.masks.set(id, m); return m; }
      const c = mk(SIZE), x = c.getContext("2d");
      const img = x.createImageData(SIZE, SIZE), d = img.data, g = this.grown;
      for (let i = 0; i < N; i++) if (g[i] === id) d[i * 4 + 3] = 255;
      x.putImageData(img, 0, 0);
      this.masks.set(id, c);
      if (this.masks.size > 40) this.masks.delete(this.masks.keys().next().value);
      return c;
    }

    /* ---------- colour with intensity ---------- */
    get color() { return this.opts.intensity >= 1 ? this.opts.color : mix(this.opts.color, "#ffffff", 1 - this.opts.intensity); }

    /* ---------- actions ---------- */
    snapshot() {
      const c = mk(SIZE); c.getContext("2d").drawImage(this.paint, 0, 0);
      this.undoStack.push(c);
      if (this.undoStack.length > 20) this.undoStack.shift();
      this.redoStack = [];
    }
    undo() { if (!this.undoStack.length) return false; const c = mk(SIZE); c.getContext("2d").drawImage(this.paint, 0, 0); this.redoStack.push(c); this.restore(this.undoStack.pop()); return true; }
    redo() { if (!this.redoStack.length) return false; const c = mk(SIZE); c.getContext("2d").drawImage(this.paint, 0, 0); this.undoStack.push(c); this.restore(this.redoStack.pop()); return true; }
    restore(c) { this.pctx.globalCompositeOperation = "source-over"; this.pctx.clearRect(0, 0, SIZE, SIZE); this.pctx.drawImage(c, 0, 0); this.dirty = true; this.onChange("undo"); }
    clearAll() { this.snapshot(); this.pctx.clearRect(0, 0, SIZE, SIZE); this.dirty = true; this.onChange("reset"); }

    fillAt(x, y, colorOverride) {
      const id = this.regionAt(x, y);
      if (!id) return false;
      const col = colorOverride || this.color;
      const t = this.tctx;
      t.globalCompositeOperation = "source-over";
      t.clearRect(0, 0, SIZE, SIZE);
      t.fillStyle = col; t.fillRect(0, 0, SIZE, SIZE);
      t.globalCompositeOperation = "destination-in";
      t.drawImage(this.mask(id), 0, 0);
      t.globalCompositeOperation = "source-over";
      this.pctx.save();
      this.pctx.globalAlpha = colorOverride ? 1 : this.opts.opacity;
      this.pctx.drawImage(this.tmp, 0, 0);
      this.pctx.restore();
      if (!colorOverride) { this.colorsUsed.add(this.opts.color); this.toolsUsed.add("fill"); }
      this.dirty = true;
      return true;
    }

    /* ---------- strokes ---------- */
    beginStroke(p) {
      const tool = this.opts.tool;
      this.snapshot();
      if (tool === "fill") { if (this.fillAt(p.x, p.y)) { this.pulse(p); this.onChange("fill"); } else this.undoStack.pop(); return; }
      const b = BRUSHES[tool];
      this.active = { b, region: this.opts.boundary ? this.regionAt(p.x, p.y) : 0, last: p, st: { dist: 0, px: p.x, py: p.y }, o: { size: this.opts.size, color: this.color, pattern: this.opts.pattern } };
      this.sctx.clearRect(0, 0, SIZE, SIZE);
      b.seg(this.sctx, p, { x: p.x + 0.01, y: p.y + 0.01 }, this.active.o, this.active.st);
      this.dirty = true;
    }
    moveStroke(p) {
      const a = this.active; if (!a) return;
      a.b.seg(this.sctx, a.last, p, a.o, a.st);
      a.last = p; this.dirty = true;
    }
    endStroke() {
      const a = this.active; if (!a) return;
      this.composeStroke(this.pctx);
      this.sctx.clearRect(0, 0, SIZE, SIZE);
      this.active = null;
      if (this.opts.tool !== "eraser") this.colorsUsed.add(this.opts.color);
      this.toolsUsed.add(this.opts.tool);
      this.dirty = true;
      this.onChange("stroke");
    }
    cancelStroke() { if (!this.active) return; this.active = null; this.sctx.clearRect(0, 0, SIZE, SIZE); this.restore(this.undoStack.pop()); }

    composeStroke(ctx) {
      const a = this.active, t = this.tctx;
      t.globalCompositeOperation = "source-over";
      t.clearRect(0, 0, SIZE, SIZE);
      t.drawImage(this.stroke, 0, 0);
      if (a.b.grain) { t.globalCompositeOperation = "destination-out"; t.fillStyle = t.createPattern(GRAIN[a.b.grain], "repeat"); t.fillRect(0, 0, SIZE, SIZE); }
      if (a.region) { t.globalCompositeOperation = "destination-in"; t.drawImage(this.mask(a.region), 0, 0); }
      t.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalAlpha = this.opts.opacity * (a.b.alpha || 1);
      ctx.globalCompositeOperation = a.b.blend || "source-over";
      ctx.drawImage(this.tmp, 0, 0);
      ctx.restore();
    }

    pulse(p) { this.flash = { x: p.x, y: p.y, t: performance.now() }; }

    /* ---------- drawing to screen ---------- */
    render() {
      const d = this.dctx;
      d.globalCompositeOperation = "source-over";
      d.fillStyle = "#fff"; d.fillRect(0, 0, SIZE, SIZE);
      if (this.active) {
        this.vctx.clearRect(0, 0, SIZE, SIZE);
        this.vctx.drawImage(this.paint, 0, 0);
        this.composeStroke(this.vctx);
        d.drawImage(this.preview, 0, 0);
      } else d.drawImage(this.paint, 0, 0);
      d.drawImage(this.lines, 0, 0);
      this.dirty = false;
      if (this.flash) {
        const k = (performance.now() - this.flash.t) / 400;
        if (k < 1) { d.strokeStyle = "rgba(255,255,255," + (1 - k) * 0.9 + ")"; d.lineWidth = 6; d.beginPath(); d.arc(this.flash.x, this.flash.y, 10 + k * 60, 0, 7); d.stroke(); this.dirty = true; }
        else this.flash = null;
      }
    }

    /* ---------- completion ---------- */
    coverage() {
      const d = this.pctx.getImageData(0, 0, SIZE, SIZE).data, idx = this.countIdx;
      let n = 0;
      for (let k = 0; k < idx.length; k++) if (d[idx[k] * 4 + 3] > 50) n++;
      return idx.length ? n / idx.length : 0;
    }

    /* pre-colour some areas (for the "finish the picture" challenge) */
    preColor(fraction, palette) {
      const ids = [];
      this.areas.forEach((a, i) => { if (i && i !== this.outer && a >= 200) ids.push(i); });
      ids.sort(() => Math.random() - 0.5);
      const n = Math.floor(ids.length * fraction);
      for (let k = 0; k < n; k++) {
        const id = ids[k];
        const t = this.tctx;
        t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, SIZE, SIZE);
        t.fillStyle = palette[k % palette.length]; t.fillRect(0, 0, SIZE, SIZE);
        t.globalCompositeOperation = "destination-in"; t.drawImage(this.mask(id), 0, 0);
        t.globalCompositeOperation = "source-over";
        this.pctx.drawImage(this.tmp, 0, 0);
      }
      this.dirty = true;
    }

    composite(size) {
      const c = mk(size), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
      x.drawImage(this.paint, 0, 0, size, size);
      x.drawImage(this.lines, 0, 0, size, size);
      return c;
    }

    async loadPaint(blob) {
      try {
        const img = await createImageBitmap(blob);
        this.pctx.clearRect(0, 0, SIZE, SIZE);
        this.pctx.drawImage(img, 0, 0, SIZE, SIZE);
        this.dirty = true;
      } catch (e) {}
    }
    paintBlob() { return new Promise((res) => this.paint.toBlob(res, "image/png")); }

    /* =========================================================
       VIEW: fit / zoom / pan
       ========================================================= */
    fit() {
      const vw = this.viewport.clientWidth, vh = this.viewport.clientHeight;
      if (!vw || !vh) return;
      const s = Math.min(vw, vh) * 0.96 / SIZE;
      this.view = { scale: s, x: (vw - SIZE * s) / 2, y: (vh - SIZE * s) / 2 };
      this.minScale = s;
      this.applyView();
    }
    applyView() {
      const v = this.view;
      this.display.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.scale + ")";
      if (this.onView) this.onView(v.scale / this.minScale);
    }
    zoomAt(cx, cy, factor) {
      const v = this.view;
      const ns = Math.max(this.minScale * 0.9, Math.min(this.minScale * 6, v.scale * factor));
      const k = ns / v.scale;
      v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.scale = ns;
      this.clampView(); this.applyView();
    }
    zoomBy(f) { const r = this.viewport.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, f); }
    clampView() {
      const v = this.view, vw = this.viewport.clientWidth, vh = this.viewport.clientHeight, w = SIZE * v.scale;
      const m = 80;
      v.x = Math.min(vw - m, Math.max(m - w, v.x));
      v.y = Math.min(vh - m, Math.max(m - w, v.y));
    }

    toPage(e) {
      const r = this.display.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
    }

    bindInput() {
      const vp = this.viewport;
      const ptrs = new Map();
      let gesture = null, panning = null;
      this.panMode = false;
      vp.addEventListener("pointerdown", (e) => {
        if (this.locked) return;
        e.preventDefault();
        try { vp.setPointerCapture(e.pointerId); } catch (err) {}
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
          // second finger: switch to pinch/pan and undo the stroke the first finger began
          if (this.active) this.cancelStroke();
          const [a, b] = [...ptrs.values()];
          gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
          return;
        }
        if (ptrs.size > 2) return;
        if (this.panMode || e.button === 1 || e.button === 2 || this.spaceDown) { panning = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y }; vp.classList.add("panning"); return; }
        this.beginStroke(this.toPage(e));
      });
      vp.addEventListener("pointermove", (e) => {
        if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (gesture && ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          const r = vp.getBoundingClientRect();
          this.view.x += cx - gesture.cx; this.view.y += cy - gesture.cy;
          this.zoomAt(cx - r.left, cy - r.top, d / gesture.d);
          gesture = { d, cx, cy };
          return;
        }
        if (panning) { this.view.x = panning.vx + e.clientX - panning.x; this.view.y = panning.vy + e.clientY - panning.y; this.clampView(); this.applyView(); return; }
        if (this.active) {
          const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          for (const ce of evs.length ? evs : [e]) this.moveStroke(this.toPage(ce));
        }
      });
      const up = (e) => {
        ptrs.delete(e.pointerId);
        if (gesture) { if (ptrs.size < 2) gesture = null; return; }
        if (panning) { panning = null; vp.classList.remove("panning"); return; }
        if (this.active) this.endStroke();
      };
      vp.addEventListener("pointerup", up);
      vp.addEventListener("pointercancel", up);
      vp.addEventListener("contextmenu", (e) => e.preventDefault());
      vp.addEventListener("wheel", (e) => {
        e.preventDefault();
        const r = vp.getBoundingClientRect();
        this.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      }, { passive: false });
      window.addEventListener("keydown", (e) => { if (e.code === "Space" && !e.target.closest("input,button,select,textarea")) { this.spaceDown = true; vp.classList.add("can-pan"); e.preventDefault(); } });
      window.addEventListener("keyup", (e) => { if (e.code === "Space") { this.spaceDown = false; vp.classList.remove("can-pan"); } });
    }
  }

  DP.Engine = Engine;
  DP.SIZE = SIZE;
})();
