/* ============ SMASH IT — the face (cartoon or uploaded photo) ============
   Everything happens locally in a <canvas>. The photo never leaves the device. */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const SIZE = 512;
  // where features should sit on the face texture (photo guides use these too)
  const EYE_L = [196, 236], EYE_R = [316, 236], MOUTH = [256, 352];

  function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
  const R = (a, b) => a + Math.random() * (b - a);

  // blob shape used for splats (shared with the 3D decals)
  function blobPath(ctx, x, y, r, seed, spikes) {
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const n = 14;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.75 + rnd() * 0.4) * (spikes && i % 3 === 0 ? 1.25 : 1);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.quadraticCurveTo(x + Math.cos(a - 0.2) * rr * 1.15, y + Math.sin(a - 0.2) * rr * 1.15, px, py);
    }
    ctx.closePath();
  }
  S.blobPath = blobPath;

  class Face {
    constructor() {
      this.canvas = mk(SIZE);
      this.ctx = this.canvas.getContext("2d");
      this.mess = mk(SIZE);
      this.mctx = this.mess.getContext("2d");
      this.photoLayer = mk(SIZE);
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.anisotropy = 4;
      this.img = null;
      this.adj = { x: 0, y: 0, zoom: 1, rot: 0 };
      this.skin = "#f1c27d";
      this.expr = "neutral"; this.exprT = 0;
      this.look = { x: 0, y: 0 };
      this.blinkT = 2; this.blink = 0;
      this.t = 0;
      this.wet = 0;
      this.dirty = true;
      this.photoDirty = true;
      this.nose = false;
    }

    // Brutal mode always uses the cartoon face, never an uploaded photo
    get hasPhoto() { return !!this.img && !this.suppress; }

    /* ---------- photo ---------- */
    setPhoto(img) { this.img = img; this.autoFit(); }
    clearPhoto() { this.img = null; this.dirty = true; }
    autoFit() { this.adj = { x: 0, y: 0, zoom: 1, rot: 0 }; this.photoDirty = this.dirty = true; }
    setAdjust(a) { Object.assign(this.adj, a); this.photoDirty = this.dirty = true; }

    buildPhotoLayer() {
      const c = this.photoLayer.getContext("2d");
      c.clearRect(0, 0, SIZE, SIZE);
      const img = this.img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      const base = SIZE / (Math.min(w, h) * 0.8);
      const sc = base * this.adj.zoom;
      c.save();
      c.translate(256 + this.adj.x, 286 + this.adj.y);
      c.rotate(this.adj.rot);
      c.scale(sc, sc);
      c.drawImage(img, -w * 0.5, -h * 0.44);
      c.restore();
      // soft oval mask so it blends into the head
      c.globalCompositeOperation = "destination-in";
      c.save();
      c.translate(256, 284);
      c.scale(1, 1.28);
      const g = c.createRadialGradient(0, 0, 120, 0, 0, 200);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(-256, -256, 512, 512);
      c.restore();
      c.globalCompositeOperation = "source-over";
      this.photoDirty = false;
    }

    // Average the cheeks + forehead of the placed photo, so the body matches.
    sampleSkin() {
      if (!this.img) return null;
      if (this.photoDirty) this.buildPhotoLayer();
      const c = this.photoLayer.getContext("2d");
      let r = 0, g = 0, b = 0, n = 0;
      for (const [x, y] of [[176, 300], [336, 300], [256, 170], [256, 200]]) {
        const d = c.getImageData(x - 10, y - 10, 20, 20).data;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      }
      if (n < 50) return null;
      const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
      return "#" + hex(r) + hex(g) + hex(b);
    }

    setSkin(hex) { this.skin = hex; this.dirty = true; }

    /* ---------- expressions ---------- */
    setExpression(name, dur) {
      if (this.expr !== name) this.dirty = true;
      this.expr = name;
      this.exprT = dur || 1.2;
    }

    update(dt) {
      this.t += dt;
      if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0 && this.expr !== "neutral") { this.expr = "neutral"; this.dirty = true; } }
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 0.15; this.blinkT = R(2, 5); this.dirty = true; }
      if (this.blink > 0) { this.blink -= dt; if (this.blink <= 0) this.dirty = true; }
      if (this.wet > 0) { this.wet = Math.max(0, this.wet - dt * 0.12); this.dirty = true; }
      const animated = ["dizzy", "cry", "laugh", "scared", "hurt"].includes(this.expr);
      if (animated || this.dirty) this.redraw();
    }

    setLook(x, y) {
      const nx = Math.max(-1, Math.min(1, x)), ny = Math.max(-1, Math.min(1, y));
      if (Math.abs(nx - this.look.x) > 0.04 || Math.abs(ny - this.look.y) > 0.04) { this.look.x = nx; this.look.y = ny; if (!this.img) this.dirty = true; }
    }

    redraw() {
      const c = this.ctx;
      c.fillStyle = this.skin;
      c.fillRect(0, 0, SIZE, SIZE);
      if (this.hasPhoto) {
        if (this.photoDirty) this.buildPhotoLayer();
        c.drawImage(this.photoLayer, 0, 0);
        this.drawPhotoOverlays(c);
      } else {
        this.drawCartoon(c);
      }
      c.drawImage(this.mess, 0, 0);
      if (this.wet > 0.05) this.drawWet(c);
      this.texture.needsUpdate = true;
      this.dirty = false;
    }

    /* ---------- cartoon face ---------- */
    drawCartoon(c) {
      const e = this.expr, t = this.t;
      const P = {
        neutral: ["open", "normal", "smile"], hurt: ["squeeze", "angry", "wavy"], surprised: ["wide", "raised", "o"],
        laugh: ["happy", "raised", "grin"], cry: ["sad", "sad", "cry"], dizzy: ["spiral", "normal", "tongue"],
        confused: ["open", "oneUp", "squiggle"], angry: ["open", "angry", "teeth"], ko: ["x", "none", "tongue"],
        smug: ["half", "normal", "smirk"], scared: ["wide", "sad", "teeth"], sputter: ["squeeze", "raised", "o"],
        happy: ["happy", "normal", "grin"], comfy: ["happy", "normal", "smile"]
      }[e] || ["open", "normal", "smile"];
      let [eye, brow, mouth] = P;
      if (eye === "open" && this.blink > 0) eye = "blink";

      // the cartoon features are drawn a bit bigger than the photo guides
      c.save(); c.translate(256, 290); c.scale(1.45, 1.45); c.translate(-256, -290);
      // blush
      if (["laugh", "happy", "comfy", "hurt", "cry"].includes(e)) {
        c.fillStyle = "rgba(255,90,120,0.28)";
        for (const x of [150, 362]) { c.beginPath(); c.ellipse(x, 300, 34, 20, 0, 0, 7); c.fill(); }
      }
      this.drawBrows(c, brow);
      this.drawEye(c, EYE_L[0], EYE_L[1], eye, -1, t);
      this.drawEye(c, EYE_R[0], EYE_R[1], eye, 1, t);
      this.drawMouth(c, mouth, t);
      if (e === "cry") this.drawTears(c, t);
      if (e === "confused" || e === "scared" || e === "hurt") this.drawSweat(c, t);
      c.restore();
    }

    drawBrows(c, kind) {
      if (kind === "none") return;
      c.strokeStyle = "#3b2a20"; c.lineWidth = 11; c.lineCap = "round";
      const y = EYE_L[1] - 58;
      const brow = (x, s) => {
        let a = 0, dy = 0;
        if (kind === "raised") dy = -16;
        if (kind === "angry") a = 0.38 * s;
        if (kind === "sad") a = -0.32 * s;
        if (kind === "oneUp" && s > 0) { dy = -20; a = -0.15; }
        c.save(); c.translate(x, y + dy); c.rotate(a);
        c.beginPath(); c.moveTo(-30, 0); c.quadraticCurveTo(0, -10, 30, 0); c.stroke(); c.restore();
      };
      brow(EYE_L[0], 1); brow(EYE_R[0], -1);
    }

    drawEye(c, x, y, kind, side, t) {
      c.lineCap = "round"; c.lineJoin = "round";
      const ink = "#2a2833";
      if (kind === "open" || kind === "wide" || kind === "half") {
        const rx = kind === "wide" ? 36 : 28, ry = kind === "wide" ? 42 : 34;
        c.fillStyle = "#fff"; c.strokeStyle = ink; c.lineWidth = 5;
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); c.stroke();
        const pr = kind === "wide" ? 11 : 15;
        const px = x + this.look.x * (rx - pr - 4), py = y + this.look.y * (ry - pr - 6);
        c.fillStyle = ink; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(px + 5, py - 6, 5, 0, 7); c.fill();
        if (kind === "half") { c.fillStyle = this.skin; c.fillRect(x - rx - 4, y - ry - 6, rx * 2 + 8, ry + 4); c.strokeStyle = ink; c.beginPath(); c.moveTo(x - rx, y - 2); c.lineTo(x + rx, y - 2); c.stroke(); }
      } else if (kind === "blink") {
        c.strokeStyle = ink; c.lineWidth = 7;
        c.beginPath(); c.moveTo(x - 26, y + 4); c.quadraticCurveTo(x, y + 14, x + 26, y + 4); c.stroke();
      } else if (kind === "happy") {
        c.strokeStyle = ink; c.lineWidth = 8;
        c.beginPath(); c.moveTo(x - 26, y + 8); c.quadraticCurveTo(x, y - 24, x + 26, y + 8); c.stroke();
      } else if (kind === "sad") {
        c.strokeStyle = ink; c.lineWidth = 8;
        c.beginPath(); c.moveTo(x - 26, y - 4); c.quadraticCurveTo(x, y + 16, x + 26, y - 4); c.stroke();
      } else if (kind === "squeeze") {
        c.strokeStyle = ink; c.lineWidth = 8;
        c.beginPath(); c.moveTo(x - 24 * side, y - 18); c.lineTo(x + 18 * side, y); c.lineTo(x - 24 * side, y + 18); c.stroke();
      } else if (kind === "x") {
        c.strokeStyle = ink; c.lineWidth = 8;
        c.beginPath(); c.moveTo(x - 20, y - 20); c.lineTo(x + 20, y + 20); c.moveTo(x + 20, y - 20); c.lineTo(x - 20, y + 20); c.stroke();
      } else if (kind === "spiral") {
        c.fillStyle = "#fff"; c.strokeStyle = ink; c.lineWidth = 5;
        c.beginPath(); c.arc(x, y, 32, 0, 7); c.fill(); c.stroke();
        c.lineWidth = 4; c.beginPath();
        for (let a = 0; a < 16; a += 0.2) { const r = a * 1.8; const px = x + Math.cos(a * side + t * 9) * r, py = y + Math.sin(a * side + t * 9) * r; if (a === 0) c.moveTo(px, py); else c.lineTo(px, py); }
        c.stroke();
      }
    }

    drawMouth(c, kind, t) {
      const [x, y] = MOUTH;
      const ink = "#2a2833";
      c.strokeStyle = ink; c.lineWidth = 8; c.lineCap = "round";
      if (kind === "smile") {
        c.beginPath(); c.moveTo(x - 46, y - 8); c.quadraticCurveTo(x, y + 30, x + 46, y - 8); c.stroke();
      } else if (kind === "smirk") {
        c.beginPath(); c.moveTo(x - 36, y + 6); c.quadraticCurveTo(x + 10, y + 16, x + 44, y - 14); c.stroke();
      } else if (kind === "grin" || kind === "cry" || kind === "teeth" || kind === "o" || kind === "wavy") {
        c.fillStyle = "#5a1f2b";
        c.beginPath();
        if (kind === "grin") { c.moveTo(x - 56, y - 14); c.quadraticCurveTo(x, y + 70 + Math.sin(t * 30) * 6, x + 56, y - 14); c.closePath(); }
        else if (kind === "cry") { const w = Math.sin(t * 20) * 4; c.moveTo(x - 46, y + 26); c.quadraticCurveTo(x, y - 30 + w, x + 46, y + 26); c.quadraticCurveTo(x, y + 6, x - 46, y + 26); }
        else if (kind === "teeth") { c.moveTo(x - 50, y); c.lineTo(x + 50, y); c.lineTo(x + 44, y + 30); c.lineTo(x - 44, y + 30); c.closePath(); }
        else if (kind === "o") c.ellipse(x, y + 8, 22, 28, 0, 0, 7);
        else { c.moveTo(x - 50, y + 10); for (let i = 0; i <= 10; i++) c.lineTo(x - 50 + i * 10, y + 4 + (i % 2 ? 14 : 0) + Math.sin(t * 25 + i) * 3); c.lineTo(x + 50, y + 34); c.lineTo(x - 50, y + 34); c.closePath(); }
        c.fill(); c.stroke();
        if (kind === "grin") { c.fillStyle = "#ff8fa3"; c.beginPath(); c.ellipse(x, y + 32, 26, 14, 0, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(x - 44, y - 12, 88, 12); }
        if (kind === "teeth") { c.fillStyle = "#fff"; c.fillRect(x - 46, y + 2, 92, 26); c.strokeStyle = "#999"; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 13, y + 2); c.lineTo(x + i * 13, y + 28); c.stroke(); } c.beginPath(); c.moveTo(x - 46, y + 15); c.lineTo(x + 46, y + 15); c.stroke(); }
      } else if (kind === "tongue") {
        c.beginPath(); c.moveTo(x - 40, y); c.quadraticCurveTo(x, y + 18, x + 40, y); c.stroke();
        c.fillStyle = "#ff6b8a"; c.beginPath(); c.ellipse(x + 12, y + 22 + Math.sin(t * 6) * 4, 16, 22, 0.2, 0, 7); c.fill(); c.stroke();
      } else if (kind === "squiggle") {
        c.beginPath(); c.moveTo(x - 40, y + 6); for (let i = 1; i <= 8; i++) c.lineTo(x - 40 + i * 10, y + 6 + (i % 2 ? -7 : 7)); c.stroke();
      } else {
        c.beginPath(); c.moveTo(x - 36, y + 6); c.lineTo(x + 36, y + 6); c.stroke();
      }
    }

    drawTears(c, t) {
      c.fillStyle = "rgba(90,180,255,0.85)";
      for (const [ex, ey] of [EYE_L, EYE_R]) {
        c.fillRect(ex - 8, ey + 14, 16, 160);
        for (let i = 0; i < 3; i++) {
          const yy = ey + 20 + ((t * 160 + i * 60) % 180);
          c.beginPath(); c.ellipse(ex, yy, 11, 15, 0, 0, 7); c.fill();
        }
      }
    }

    drawSweat(c, t) {
      c.fillStyle = "rgba(120,200,255,0.9)"; c.strokeStyle = "rgba(40,120,200,0.8)"; c.lineWidth = 3;
      const y = 140 + Math.sin(t * 3) * 4;
      c.beginPath(); c.moveTo(390, y - 34); c.quadraticCurveTo(372, y, 390, y + 10); c.quadraticCurveTo(408, y, 390, y - 34); c.fill(); c.stroke();
    }

    /* ---------- overlays on top of a photo ---------- */
    drawPhotoOverlays(c) {
      const e = this.expr, t = this.t;
      const cover = (kind) => { this.drawEye(c, EYE_L[0], EYE_L[1], kind, -1, t); this.drawEye(c, EYE_R[0], EYE_R[1], kind, 1, t); };
      if (e === "dizzy") cover("spiral");
      if (e === "ko") { c.fillStyle = "rgba(255,255,255,0.9)"; for (const [x, y] of [EYE_L, EYE_R]) { c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill(); } cover("x"); }
      if (e === "cry") this.drawTears(c, t);
      if (["laugh", "happy", "comfy", "hurt"].includes(e)) {
        c.fillStyle = "rgba(255,70,110,0.3)";
        for (const x of [150, 362]) { c.beginPath(); c.ellipse(x, 300, 38, 22, 0, 0, 7); c.fill(); }
      }
      if (["confused", "scared", "hurt", "sputter"].includes(e)) this.drawSweat(c, t);
      if (e === "scared") {
        const g = c.createLinearGradient(0, 80, 0, 260);
        g.addColorStop(0, "rgba(80,90,200,0.45)"); g.addColorStop(1, "rgba(80,90,200,0)");
        c.fillStyle = g; c.fillRect(0, 0, SIZE, 260);
      }
      if (e === "angry" || e === "hurt") {
        c.strokeStyle = "rgba(230,30,60,0.9)"; c.lineWidth = 7; c.lineCap = "round";
        const x = 360, y = 130, s = 1 + Math.sin(t * 12) * 0.08;
        c.save(); c.translate(x, y); c.scale(s, s);
        for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(6, -18); c.quadraticCurveTo(6, -6, 18, -6); c.stroke(); }
        c.restore();
      }
    }

    drawWet(c) {
      c.globalAlpha = Math.min(0.6, this.wet);
      c.fillStyle = "rgba(160,215,255,0.5)";
      c.fillRect(0, 0, SIZE, SIZE);
      c.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 9; i++) {
        const x = (i * 97) % 470 + 20, y = ((i * 131 + this.t * 50) % 520) - 10;
        c.beginPath(); c.ellipse(x, y, 6, 10, 0, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
    }

    /* ---------- mess (pie, tomato, paint, soot) ---------- */
    splat(u, v, type, color, size) {
      const c = this.mctx;
      const x = u * SIZE, y = (1 - v) * SIZE, r = (size || 0.5) * 150;
      const seed = Math.floor(Math.random() * 1e6) + 1;
      if (type === "soot") {
        const g = c.createRadialGradient(x, y, 10, x, y, r * 1.6);
        g.addColorStop(0, "rgba(30,30,30,0.85)"); g.addColorStop(1, "rgba(30,30,30,0)");
        c.fillStyle = g; c.fillRect(0, 0, SIZE, SIZE);
      } else if (type === "cream") {
        c.fillStyle = "#fffaf0"; blobPath(c, x, y, r * 1.3, seed, true); c.fill();
        c.fillStyle = "#f3e6c8"; blobPath(c, x + 10, y + 14, r * 0.7, seed + 7); c.fill();
        c.fillStyle = "#fffaf0";
        for (let i = 0; i < 5; i++) { const dx = x + R(-r, r); c.fillRect(dx - 9, y, 18, R(r * 0.8, r * 1.8)); c.beginPath(); c.arc(dx, y + r * 1.4, 10, 0, 7); c.fill(); }
        c.fillStyle = "#e03131"; c.beginPath(); c.arc(x + R(-20, 20), y - r * 0.4, 14, 0, 7); c.fill();
      } else if (type === "egg") {
        c.fillStyle = "rgba(255,255,240,0.85)"; blobPath(c, x, y, r, seed, true); c.fill();
        c.fillStyle = "#ffc11e"; c.beginPath(); c.arc(x + 6, y + 4, r * 0.42, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(x - 4, y - 6, r * 0.14, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,240,0.8)"; for (let i = 0; i < 3; i++) c.fillRect(x + R(-r, r) - 6, y, 12, R(r, r * 2));
      } else {
        c.fillStyle = color || "#e03131";
        blobPath(c, x, y, r, seed, true); c.fill();
        for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + R(-r * 1.8, r * 1.8), y + R(-r * 1.8, r * 1.8), R(5, 14), 0, 7); c.fill(); }
        for (let i = 0; i < 4; i++) { const dx = x + R(-r * 0.8, r * 0.8); c.fillRect(dx - 7, y, 14, R(r, r * 2.4)); }
        if (type === "tomato") { c.fillStyle = "#ffd8a8"; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(x + R(-r * 0.6, r * 0.6), y + R(-r * 0.6, r * 0.6), 5, 8, R(0, 3), 0, 7); c.fill(); } }
      }
      this.dirty = true;
    }

    injure(power) {
      const c = this.mctx;
      if (Math.random() < 0.65) this.splat(R(0.33, 0.67), R(0.3, 0.62), "blood", ["#9b0000", "#b3001b", "#7a0010"][Math.floor(Math.random() * 3)], R(0.14, 0.22) + power * 0.012);
      if (Math.random() < 0.5) {
        const spots = [EYE_L, EYE_R, [150, 310], [362, 310], [256, 150]];
        const [x, y] = spots[Math.floor(Math.random() * spots.length)];
        const g = c.createRadialGradient(x, y, 6, x, y, 50);
        g.addColorStop(0, "rgba(80,25,100,0.5)"); g.addColorStop(0.6, "rgba(110,40,120,0.3)"); g.addColorStop(1, "rgba(110,40,120,0)");
        c.fillStyle = g; c.fillRect(x - 55, y - 55, 110, 110);
      }
      this.dirty = true;
    }

    wipe(u, v, r) {
      const c = this.mctx;
      c.save();
      c.globalCompositeOperation = "destination-out";
      const x = u * SIZE, y = (1 - v) * SIZE, rr = r * SIZE;
      const g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, "rgba(0,0,0,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      c.restore();
      this.dirty = true;
    }

    clean(amount) {
      const c = this.mctx;
      if (amount >= 1) c.clearRect(0, 0, SIZE, SIZE);
      else { c.save(); c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0," + amount + ")"; c.fillRect(0, 0, SIZE, SIZE); c.restore(); }
      this.dirty = true;
    }

    /* ---------- preview for the photo editor ---------- */
    drawPreview(ctx2d, size) {
      if (this.dirty || this.photoDirty) this.redraw();
      ctx2d.clearRect(0, 0, size, size);
      ctx2d.drawImage(this.canvas, 0, 0, size, size);
      const k = size / SIZE;
      // oval that ends up visible on the head
      ctx2d.strokeStyle = "rgba(255,111,165,0.9)"; ctx2d.setLineDash([6, 6]); ctx2d.lineWidth = 2;
      ctx2d.beginPath(); ctx2d.ellipse(256 * k, 284 * k, 170 * k, 218 * k, 0, 0, 7); ctx2d.stroke();
      ctx2d.setLineDash([]);
      ctx2d.fillStyle = "rgba(92,198,255,0.95)"; ctx2d.strokeStyle = "#fff"; ctx2d.lineWidth = 2;
      for (const [x, y] of [EYE_L, EYE_R]) { ctx2d.beginPath(); ctx2d.arc(x * k, y * k, 6, 0, 7); ctx2d.fill(); ctx2d.stroke(); }
      ctx2d.strokeStyle = "rgba(92,198,255,0.95)"; ctx2d.lineWidth = 4; ctx2d.lineCap = "round";
      ctx2d.beginPath(); ctx2d.moveTo((MOUTH[0] - 40) * k, MOUTH[1] * k); ctx2d.lineTo((MOUTH[0] + 40) * k, MOUTH[1] * k); ctx2d.stroke();
    }
  }

  S.Face = Face;
})();
