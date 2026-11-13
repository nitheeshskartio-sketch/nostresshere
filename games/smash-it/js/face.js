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
      this.realistic = true; this.browColor = "#3b2a20"; this.irisColor = "#6b4a2b"; this.irisColor2 = "#4a3018";
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

    setSkin(hex) {
      this.skin = hex; this.dirty = true;
      // lips: the skin tone pushed towards a muted rose
      const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const mix = (k, cr, cg, cb) => "rgb(" + Math.round(r * (1 - k) + cr * k) + "," + Math.round(g * (1 - k) + cg * k) + "," + Math.round(b * (1 - k) + cb * k) + ")";
      this.lipTop = mix(0.45, 150, 55, 65); this.lipBot = mix(0.38, 175, 80, 85);
    }

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
      if (this.costume) this.drawCostume(c, "under");
      if (this.realistic) {
        this.drawRealFace(c, e, eye, brow, mouth, t);
        if (e === "cry") this.drawTears(c, t);
        if (e === "confused" || e === "scared" || e === "hurt") this.drawSweat(c, t);
        if (this.costume) this.drawCostume(c, "over");
        c.restore();
        return;
      }
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
      if (this.costume) this.drawCostume(c, "over");
      c.restore();
    }

    /* =========================================================
       REALISTIC FACE (Realistic style): same expressions, human features
       ========================================================= */
    drawRealFace(c, e, eye, brow, mouth, t) {
      const [lx, ly] = EYE_L, [rx, ry] = EYE_R, [mx, my] = MOUTH;
      const shade = (x, y, rX, rY, col) => { c.save(); c.translate(x, y); c.scale(1, rY / rX); const g = c.createRadialGradient(0, 0, 0, 0, 0, rX); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rX, 0, 7); c.fill(); c.restore(); };
      // soft modelling of the face: sockets, cheeks, nose sides, under-lip and jaw
      for (const x of [lx, rx]) shade(x, ly + 2, 56, 40, "rgba(90,45,35,0.16)");
      const warm = ["laugh", "happy", "comfy", "hurt", "cry", "angry"].includes(e) ? 0.2 : 0.1;
      for (const x of [lx - 18, rx + 18]) shade(x, 312, 52, 38, "rgba(215,85,75," + warm + ")");
      shade(256, 268, 30, 70, "rgba(255,255,255,0.08)");
      for (const x of [232, 280]) shade(x, 286, 14, 40, "rgba(90,45,35,0.10)");
      shade(256, 310, 22, 7, "rgba(70,35,30,0.2)");
      shade(256, my + 38, 36, 11, "rgba(80,40,30,0.16)");
      shade(256, 160, 120, 30, "rgba(255,255,255,0.05)");
      // nostrils (the 3D nose sits on top of these)
      c.fillStyle = "rgba(60,25,25,0.28)";
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(256 + s * 8, 304, 4.5, 2.4, s * 0.35, 0, 7); c.fill(); }
      // eyes
      const look = this.look;
      const spin = eye === "spiral";
      const E = {
        open: { open: 1 }, wide: { open: 1.3 }, half: { open: 0.45 }, blink: { closed: true }, happy: { closed: true, smile: true },
        sad: { open: 0.75, sad: true }, squeeze: { closed: true, squeeze: true }, x: { closed: true }, spiral: { open: 0.85 }
      }[eye] || { open: 1 };
      for (const [x, y, side] of [[lx, ly, -1], [rx, ry, 1]]) {
        const lk = spin ? { x: Math.cos(t * 4 + side) * 0.8, y: Math.sin(t * 4 + side) * 0.6 } : look;
        this.drawRealEye(c, x, y, side, E, lk);
      }
      this.drawRealBrows(c, brow);
      this.drawLips(c, mouth, t);
    }

    drawRealEye(c, x, y, side, E, lk) {
      const w = 30, top = 21 * (E.open || 0), bot = 12;
      const lash = "#1d1410";
      c.save(); c.lineCap = "round"; c.lineJoin = "round";
      // crease above the eye
      c.strokeStyle = "rgba(90,50,40,0.32)"; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x - w + 4, y - 8); c.quadraticCurveTo(x + side * 4, y - 36 - (E.open > 1 ? 6 : 0), x + w - 2, y - 6); c.stroke();
      if (E.closed) {
        const dy = E.smile ? -4 : E.squeeze ? 2 : 3;
        c.strokeStyle = lash; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + (E.smile ? -10 : 8) + dy, x + w, y); c.stroke();
        c.lineWidth = 1.8;
        c.lineWidth = 1.3;
        for (let i = 1; i < 6; i++) { const u = i / 6, px = x - w + u * 2 * w, py = y + (E.smile ? -10 : 8) * 2 * u * (1 - u) * 2 * 0.5 + dy * 0.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + (u - 0.5) * 5, py + 4); c.stroke(); }
        if (E.squeeze) { c.strokeStyle = "rgba(90,50,40,0.45)"; c.lineWidth = 2; for (const k of [0, 1]) { c.beginPath(); c.moveTo(x + side * (w + 4), y - 8 + k * 10); c.lineTo(x + side * (w + 16), y - 12 + k * 14); c.stroke(); } }
        if (E.smile) { c.strokeStyle = "rgba(90,50,40,0.3)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w + 6, y + 14); c.quadraticCurveTo(x, y + 22, x + w - 6, y + 14); c.stroke(); }
        c.restore(); return;
      }
      // almond-shaped opening
      const almond = () => { c.beginPath(); c.moveTo(x - w, y + 2); c.bezierCurveTo(x - w * 0.55, y - top - 4, x + w * 0.45, y - top - 6, x + w, y - (E.sad ? -3 : 1)); c.bezierCurveTo(x + w * 0.5, y + bot + 2, x - w * 0.5, y + bot + 2, x - w, y + 2); c.closePath(); };
      almond(); c.save(); c.clip();
      const sg = c.createRadialGradient(x, y - 2, 4, x, y, w + 4); sg.addColorStop(0, "#fbf8f2"); sg.addColorStop(0.75, "#eee4da"); sg.addColorStop(1, "#d9b8ae");
      c.fillStyle = sg; c.fillRect(x - w - 4, y - 40, w * 2 + 8, 70);
      // iris + pupil
      const ir = 13, ix = x + lk.x * 11, iy = y + lk.y * 6 - 1;
      const ig = c.createRadialGradient(ix, iy, 2, ix, iy, ir); ig.addColorStop(0, this.irisColor || "#6b4a2b"); ig.addColorStop(0.7, this.irisColor2 || "#4a3018"); ig.addColorStop(1, "#22150b");
      c.fillStyle = ig; c.beginPath(); c.arc(ix, iy, ir, 0, 7); c.fill();
      c.strokeStyle = "rgba(20,12,6,0.6)"; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = "rgba(255,230,190,0.18)"; c.lineWidth = 1;
      for (let a = 0; a < 6.28; a += 0.5) { c.beginPath(); c.moveTo(ix + Math.cos(a) * 6, iy + Math.sin(a) * 6); c.lineTo(ix + Math.cos(a) * 11, iy + Math.sin(a) * 11); c.stroke(); }
      c.fillStyle = "#0b0705"; c.beginPath(); c.arc(ix, iy, E.open > 1 ? 4.2 : 5.4, 0, 7); c.fill();
      // shadow from the upper lid + a catch-light
      const lg = c.createLinearGradient(0, y - top - 6, 0, y - top + 12); lg.addColorStop(0, "rgba(40,20,15,0.45)"); lg.addColorStop(1, "rgba(40,20,15,0)");
      c.fillStyle = lg; c.fillRect(x - w - 4, y - top - 8, w * 2 + 8, 22);
      c.fillStyle = "rgba(255,255,255,0.92)"; c.beginPath(); c.ellipse(ix + 4, iy - 5, 3.4, 2.6, -0.4, 0, 7); c.fill();
      c.restore();
      // pink inner corner
      c.fillStyle = "rgba(220,120,120,0.55)"; c.beginPath(); c.ellipse(x - side * (w - 3), y + 2, 4, 3, 0, 0, 7); c.fill();
      // lash line (upper) and soft lower lid
      c.strokeStyle = lash; c.lineWidth = 4;
      c.beginPath(); c.moveTo(x - w, y + 2); c.bezierCurveTo(x - w * 0.55, y - top - 4, x + w * 0.45, y - top - 6, x + w, y - (E.sad ? -3 : 1)); c.stroke();
      c.lineWidth = 1.6;
      c.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) { const u = side > 0 ? 0.45 + i * 0.1 : 0.05 + i * 0.1, px = x - w + u * 2 * w, py = y - top * 4 * u * (1 - u) * 0.95 - 2; const out = (u - 0.5) * 2; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + out * 3, py - 3, px + out * 6, py - 4); c.stroke(); }
      c.strokeStyle = "rgba(80,40,30,0.4)"; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(x - w + 4, y + 4); c.bezierCurveTo(x - w * 0.5, y + bot + 3, x + w * 0.5, y + bot + 3, x + w - 2, y + 1); c.stroke();
      if (E.sad) { c.strokeStyle = "rgba(90,50,40,0.25)"; c.beginPath(); c.moveTo(x - w + 8, y + bot + 10); c.quadraticCurveTo(x, y + bot + 16, x + w - 8, y + bot + 10); c.stroke(); }
      c.restore();
    }

    drawRealBrows(c, kind) {
      if (kind === "none") return;
      const col = this.browColor || "#3b2a20";
      for (const [ex, side] of [[EYE_L[0], -1], [EYE_R[0], 1]]) {
        let a = 0, dy = 0;
        if (kind === "raised") dy = -12;
        if (kind === "angry") a = -0.32 * side;
        if (kind === "sad") a = 0.3 * side;
        if (kind === "oneUp" && side > 0) { dy = -16; a = 0.12; }
        c.save(); c.translate(ex, EYE_L[1] - 44 + dy); c.rotate(a);
        // brow made of individual hair strokes: thick at the inside, thin at the tail
        c.lineCap = "round";
        for (let i = 0; i < 42; i++) {
          const u = i / 41, xx = -side * 30 + side * u * 64, yy = -Math.sin(u * Math.PI * 0.9) * 8 + (u < 0.15 ? 3 : 0);
          const th = 9 * (1 - u * 0.75);
          c.strokeStyle = col; c.globalAlpha = 0.55 + ((i * 37) % 10) / 25; c.lineWidth = 1.7;
          c.beginPath(); c.moveTo(xx + ((i * 13) % 5) - 2, yy + th * 0.5); c.lineTo(xx + side * 7, yy - th * 0.5); c.stroke();
        }
        c.globalAlpha = 1; c.restore();
      }
    }

    drawLips(c, kind, t) {
      const [x, y] = MOUTH;
      const w = 42;
      const top = this.lipTop || "#b8656a", bot = this.lipBot || "#c97578";
      // where the corners of the mouth go for each expression
      const cornerY = { smile: -9, grin: -12, smirk: 0, cry: 12, teeth: 2, o: 4, wavy: 4, tongue: 2, squiggle: 3, flat: 1 }[kind] ?? 1;
      const open = { grin: 24, cry: 26, teeth: 14, o: 30, wavy: 16, tongue: 22 }[kind] || 0;
      const ow = kind === "o" ? 22 : w;
      const L = x - ow, Rr = x + ow, cl = y + cornerY, cr = y + (kind === "smirk" ? -12 : cornerY);
      c.save(); c.lineJoin = "round"; c.lineCap = "round";
      const avg = (cl + cr) / 2, q = (mid) => 2 * mid - avg;   // quadratic control point that passes through "mid"
      const openTop = y - 4, openBot = y + open + (kind === "grin" ? 6 : 0);
      // dark opening with teeth / tongue
      if (open) {
        c.fillStyle = "#3a1218";
        c.beginPath(); c.moveTo(L, cl); c.quadraticCurveTo(x, q(openTop + (kind === "cry" ? 5 : 0)), Rr, cr); c.quadraticCurveTo(x, q(openBot), L, cl); c.fill();
        c.save(); c.clip();
        if (kind !== "o" && kind !== "cry") { c.fillStyle = "#f4efe6"; c.fillRect(L, openTop - 6, ow * 2, 13); c.strokeStyle = "rgba(150,140,130,0.6)"; c.lineWidth = 1; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 11, openTop - 6); c.lineTo(x + i * 11, openTop + 7); c.stroke(); } }
        if (kind === "teeth" || kind === "wavy") { c.fillStyle = "#ece6dc"; c.fillRect(L, openBot - 9, ow * 2, 10); }
        if (kind === "tongue" || kind === "grin") { c.fillStyle = "#c4505e"; c.beginPath(); c.ellipse(x + (kind === "tongue" ? 6 : 0), openBot, 20, 10, 0, 0, 7); c.fill(); }
        c.restore();
        if (kind === "tongue") { c.fillStyle = "#d4606c"; c.beginPath(); c.ellipse(x + 8, openBot + 9 + Math.sin(t * 6) * 3, 13, 14, 0.2, 0, 7); c.fill(); c.strokeStyle = "rgba(120,30,40,0.5)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 8, openBot + 1); c.lineTo(x + 8, openBot + 16); c.stroke(); }
      }
      // upper lip with a cupid's bow
      const midTop = open ? openTop : y;
      const ul = (yy) => { c.moveTo(L, cl); c.bezierCurveTo(x - ow * 0.6, yy - 5, x - 14, yy - 12, x - 7, yy - 10); c.quadraticCurveTo(x, yy - 6, x + 7, yy - 10); c.bezierCurveTo(x + 14, yy - 12, x + ow * 0.6, yy - 5, Rr, cr); };
      c.fillStyle = top; c.beginPath(); ul(midTop); c.quadraticCurveTo(x, q(midTop + 1), L, cl); c.fill();
      // lower lip: a smooth band under the mouth line / opening
      const lowY = open ? openBot : y + 1;
      c.fillStyle = bot; c.beginPath(); c.moveTo(L, cl); c.quadraticCurveTo(x, q(lowY), Rr, cr); c.quadraticCurveTo(x, q(lowY + 13), L, cl); c.fill();
      const hg = c.createRadialGradient(x, lowY + 6, 1, x, lowY + 6, 16); hg.addColorStop(0, "rgba(255,255,255,0.3)"); hg.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = hg; c.beginPath(); c.ellipse(x, lowY + 6, 16, 5, 0, 0, 7); c.fill();
      // the line where the lips meet
      if (!open) {
        c.strokeStyle = "rgba(70,20,25,0.75)"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(L, cl);
        if (kind === "squiggle") { for (let i = 1; i <= 8; i++) c.lineTo(L + i * (ow * 2 / 8), y + (i % 2 ? -3 : 3)); }
        else c.quadraticCurveTo(x, q(y + 1), Rr, cr);
        c.stroke();
        c.strokeStyle = "rgba(90,45,35,0.35)"; c.lineWidth = 2;
        for (const [cx, cy, s] of [[L, cl, -1], [Rr, cr, 1]]) { c.beginPath(); c.moveTo(cx + s * 2, cy); c.lineTo(cx + s * 6, cy + (cornerY < -4 ? -4 : 3)); c.stroke(); }
      }
      // smile lines when grinning
      if (kind === "smile" || kind === "grin") { c.strokeStyle = "rgba(110,55,45,0.13)"; c.lineWidth = 3; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 54, y - 40); c.quadraticCurveTo(x + s * 66, y - 4, x + s * 52, y + 22); c.stroke(); } }
      c.restore();
    }

    /* ---------- cartoon face styles (Brutal mode's alternative to photos) ---------- */
    drawCostume(c, layer) {
      const k = this.costume, [lx, ly] = EYE_L, [rx, ry] = EYE_R, [mx, my] = MOUTH;
      const ink = "#2a2833";
      c.save(); c.lineCap = "round"; c.lineJoin = "round";
      if (k === "clown" && layer === "under") {
        c.fillStyle = "#ffffff"; c.strokeStyle = "#4dabf7"; c.lineWidth = 5;
        for (const [x, y] of [[lx, ly], [rx, ry]]) { c.beginPath(); c.moveTo(x, y - 62); c.lineTo(x + 30, y); c.lineTo(x, y + 62); c.lineTo(x - 30, y); c.closePath(); c.fill(); c.stroke(); }
        c.fillStyle = "rgba(240,40,60,0.55)"; for (const x of [150, 362]) { c.beginPath(); c.arc(x, 312, 26, 0, 7); c.fill(); }
        c.fillStyle = "#e03131"; c.beginPath(); c.ellipse(mx, my + 4, 70, 30, 0, 0, 7); c.fill();
      }
      if (k === "clown" && layer === "over") {
        const g = c.createRadialGradient(248, 284, 4, 256, 292, 28); g.addColorStop(0, "#ff8787"); g.addColorStop(1, "#c92a2a");
        c.fillStyle = g; c.beginPath(); c.arc(256, 292, 27, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.arc(247, 283, 7, 0, 7); c.fill();
      }
      if (k === "boss" && layer === "over") {
        c.strokeStyle = "#212529"; c.lineWidth = 8;
        for (const [x, y] of [[lx, ly], [rx, ry]]) { c.beginPath(); c.roundRect(x - 40, y - 30, 80, 60, 12); c.stroke(); }
        c.beginPath(); c.moveTo(lx + 40, ly - 6); c.quadraticCurveTo(256, ly - 18, rx - 40, ry - 6); c.stroke();
        c.fillStyle = "rgba(170,210,255,0.18)"; for (const [x, y] of [[lx, ly], [rx, ry]]) { c.beginPath(); c.roundRect(x - 36, y - 26, 72, 52, 10); c.fill(); }
        c.fillStyle = "#4a3426"; c.beginPath(); c.moveTo(196, 322); c.quadraticCurveTo(226, 296, 256, 312); c.quadraticCurveTo(286, 296, 316, 322); c.quadraticCurveTo(286, 334, 256, 324); c.quadraticCurveTo(226, 334, 196, 322); c.fill();
        c.strokeStyle = "#4a3426"; c.lineWidth = 14; c.beginPath(); c.moveTo(lx - 30, ly - 66); c.lineTo(rx + 30, ry - 66); c.stroke(); // one big angry unibrow
      }
      if (k === "villain" && layer === "over") {
        c.fillStyle = "#212529";
        c.beginPath(); c.moveTo(256, 312); c.bezierCurveTo(220, 296, 190, 318, 176, 300); c.bezierCurveTo(160, 282, 176, 266, 188, 280); c.bezierCurveTo(176, 286, 186, 302, 204, 300); c.bezierCurveTo(226, 298, 242, 302, 256, 304);
        c.bezierCurveTo(270, 302, 286, 298, 308, 300); c.bezierCurveTo(326, 302, 336, 286, 324, 280); c.bezierCurveTo(336, 266, 352, 282, 336, 300); c.bezierCurveTo(322, 318, 292, 296, 256, 312); c.fill();
        c.strokeStyle = "#f2c94c"; c.lineWidth = 7; c.beginPath(); c.arc(rx, ry, 40, 0, 7); c.stroke();
        c.fillStyle = "rgba(255,255,255,0.15)"; c.beginPath(); c.arc(rx, ry, 37, 0, 7); c.fill();
        c.lineWidth = 3; c.beginPath(); c.moveTo(rx + 34, ry + 22); c.quadraticCurveTo(rx + 70, ry + 90, rx + 40, ry + 150); c.stroke();
      }
      if (k === "pirate" && layer === "over") {
        c.strokeStyle = "#212529"; c.lineWidth = 7; c.beginPath(); c.moveTo(lx - 100, ly - 90); c.lineTo(rx + 100, ry + 30); c.stroke();
        c.fillStyle = "#212529"; c.beginPath(); c.ellipse(lx, ly + 2, 42, 36, 0.15, 0, 7); c.fill();
        c.strokeStyle = "#c2255c"; c.lineWidth = 6; c.beginPath(); c.moveTo(rx + 10, ry - 70); c.lineTo(rx - 14, ry + 54); c.stroke();
        c.lineWidth = 3; for (let i = 0; i < 4; i++) { const y = ry - 50 + i * 28, x = rx + 6 - i * 6; c.beginPath(); c.moveTo(x - 12, y - 2); c.lineTo(x + 12, y + 2); c.stroke(); }
      }
      if (k === "monster" && layer === "under") {
        c.fillStyle = "rgba(120,180,110,0.35)"; c.fillRect(-200, -200, 912, 912); // a bit green around the gills
      }
      if (k === "monster" && layer === "over") {
        c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(150, 168); c.lineTo(362, 158); c.stroke();
        for (let x = 162; x < 360; x += 22) { c.beginPath(); c.moveTo(x, 156); c.lineTo(x + 4, 178); c.stroke(); }
        c.fillStyle = "rgba(60,40,70,0.35)"; for (const [x, y] of [[lx, ly], [rx, ry]]) { c.beginPath(); c.ellipse(x, y + 30, 34, 14, 0, 0, 7); c.fill(); }
        c.fillStyle = "#868e96"; for (const x of [88, 424]) { c.fillRect(x - 12, 280, 24, 36); c.fillStyle = "#adb5bd"; c.fillRect(x - 18, 284, 36, 10); c.fillStyle = "#868e96"; }
      }
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
