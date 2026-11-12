/* ============ SAND THERAPY — app: scene, tools, colours, sound, challenges, creations ============ */
(function () {
  "use strict";
  const ST = window.ST;
  const { NX, NZ, W, D, CELL } = ST.GRID;
  const V3 = THREE.Vector3;
  const $ = (id) => document.getElementById(id);
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- prefs ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("nsh-sand-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("nsh-sand-" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const prefs = Object.assign({ type: "classic", scheme: "solid", color: "#e8b07a", env: "wooden", sound: true, ambience: true, fx: true, vibrate: true, done: {} }, store.get("prefs", {}));
  const save = () => store.set("prefs", prefs);

  let toastT = null;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2200); }
  const buzz = (ms) => { if (prefs.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

  /* =========================================================
     SOUND (synthesized: soft, grainy, satisfying)
     ========================================================= */
  const A = (() => {
    let ctx = null, master, sfx, amb, noise, brown;
    const loops = {};
    function init() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.connect(master); amb = ctx.createGain(); amb.gain.value = prefs.ambience ? 0.35 : 0; amb.connect(master);
      const len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      brown = ctx.createBuffer(1, len, ctx.sampleRate); const b = brown.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = l * 3.5; }
      if (pendingAmb) startAmb(pendingAmb);
      return ctx;
    }
    function nz(dur, o) {
      if (!ctx) return; const t = ctx.currentTime + (o.delay || 0);
      const s = ctx.createBufferSource(); s.buffer = o.brown ? brown : noise;
      const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.frequency.setValueAtTime(o.freq || 1500, t); if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur); f.Q.value = o.q || 1;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(sfx); s.start(t, Math.random() * 1.5, dur + 0.05);
    }
    function tone(f0, dur, o) {
      if (!ctx) return; const t = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f0, t); if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(sfx); osc.start(t); osc.stop(t + dur + 0.05);
    }
    const S = {
      cut() { nz(0.09, { freq: R(1600, 2600), q: 1.4, vol: 0.18 }); for (let i = 0; i < 3; i++) nz(0.015, { type: "highpass", freq: 3500, vol: 0.06, delay: i * 0.02 }); },
      slice() { nz(0.35, { freq: 1200, slide: 3000, q: 0.9, vol: 0.22, att: 0.03 }); },
      crunch() { tone(110, 0.25, { slide: 45, vol: 0.5 }); nz(0.45, { type: "lowpass", freq: 900, slide: 200, vol: 0.5 }); for (let i = 0; i < 8; i++) nz(0.03, { type: "highpass", freq: 2500, vol: 0.08, delay: 0.05 + i * 0.04 }); },
      squish() { nz(0.4, { type: "lowpass", freq: 700, slide: 250, vol: 0.35, att: 0.04 }); tone(160, 0.3, { slide: 90, vol: 0.12 }); },
      pop() { tone(320, 0.18, { slide: 520, vol: 0.2 }); nz(0.12, { type: "lowpass", freq: 600, vol: 0.2 }); },
      stamp() { tone(140, 0.15, { slide: 70, vol: 0.35 }); nz(0.15, { type: "lowpass", freq: 500, vol: 0.3 }); },
      scoop() { nz(0.25, { freq: 900, slide: 1800, vol: 0.2, att: 0.02 }); },
      plop() { tone(220, 0.2, { slide: 110, vol: 0.3 }); nz(0.2, { type: "lowpass", freq: 600, vol: 0.3 }); },
      crumble() { for (let i = 0; i < 14; i++) nz(0.03, { freq: R(1500, 4000), q: 2, vol: 0.08, delay: i * R(0.02, 0.05) }); nz(0.5, { type: "lowpass", freq: 800, slide: 300, vol: 0.25 }); },
      chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, { type: "triangle", vol: 0.12, delay: i * 0.09 })); },
      click() { tone(800, 0.05, { vol: 0.06 }); }
    };
    function loop(name, level) {
      if (!ctx) return;
      if (!prefs.sound) level = 0;
      let L = loops[name];
      if (!L && level > 0) {
        const s = ctx.createBufferSource(); s.buffer = name === "roll" ? brown : noise; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = name === "pour" ? "highpass" : "lowpass"; f.frequency.value = name === "pour" ? 2800 : name === "press" ? 400 : 260;
        const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(sfx); s.start(); L = loops[name] = { g };
      }
      if (L) L.g.gain.setTargetAtTime(level * (name === "pour" ? 0.12 : 0.4), ctx.currentTime, 0.06);
    }
    let ambNodes = [], ambTimer = null, pendingAmb = null;
    function startAmb(env) {
      if (!ctx) { pendingAmb = env; return; }
      ambNodes.forEach((n) => { try { n.stop(); } catch (e) {} }); ambNodes = []; clearInterval(ambTimer);
      if (env === "beach") {
        const s = ctx.createBufferSource(); s.buffer = brown; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
        const g = ctx.createGain(); g.gain.value = 0.3;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.28; lfo.connect(lg).connect(g.gain);
        s.connect(f).connect(g).connect(amb); s.start(); lfo.start(); ambNodes.push(s, lfo);
      } else {
        const chords = env === "neon" ? [[110, 165, 220, 277], [98, 147, 196, 247]] : [[262, 330, 392, 494], [220, 277, 330, 415], [175, 220, 262, 330]];
        let ci = 0;
        const play = () => {
          const t = ctx.currentTime;
          chords[ci++ % chords.length].forEach((f) => {
            const o = ctx.createOscillator(), g = ctx.createGain(); o.type = env === "neon" ? "sawtooth" : "sine"; o.frequency.value = f / (env === "neon" ? 1 : 2);
            const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = env === "neon" ? 700 : 1500;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 2); g.gain.exponentialRampToValueAtTime(0.0001, t + 7.5);
            o.connect(fl).connect(g).connect(amb); o.start(t); o.stop(t + 8);
          });
        };
        play(); ambTimer = setInterval(play, 7000);
      }
    }
    return {
      init, loop,
      play(n) { if (prefs.sound && init() && S[n]) S[n](); },
      amb: startAmb,
      setAmb(on) { if (amb) amb.gain.setTargetAtTime(on ? 0.35 : 0, ctx.currentTime, 0.2); }
    };
  })();

  /* =========================================================
     SCENE
     ========================================================= */
  const stage = $("stage");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 50);
  const look = new V3(0, -0.02, 0.06);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb0a090, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(0.7, 1.7, 0.9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -1, right: 1, top: 0.8, bottom: -0.8, near: 0.5, far: 4 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.004;
  scene.add(sun, sun.target);
  const rimA = new THREE.PointLight(0xff4fd8, 0, 4, 1.5); rimA.position.set(-1, 0.6, -0.4);
  const rimB = new THREE.PointLight(0x3ad7ff, 0, 4, 1.5); rimB.position.set(1, 0.6, -0.4);
  scene.add(rimA, rimB);

  // tray + table
  const tray = new THREE.Group(); scene.add(tray);
  const frameMat = new THREE.MeshStandardMaterial({ color: "#8b5a2b", roughness: 0.6 });
  const bottomMat = new THREE.MeshStandardMaterial({ color: "#6f4518", roughness: 0.8 });
  const tableMat = new THREE.MeshStandardMaterial({ color: "#a0703f", roughness: 0.7 });
  const T = 0.06, Hh = 0.19;
  [[0, -D / 2 - T / 2, W + 2 * T, T], [0, D / 2 + T / 2, W + 2 * T, T], [-W / 2 - T / 2, 0, T, D], [W / 2 + T / 2, 0, T, D]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, Hh, d), frameMat); m.position.set(x, Hh / 2 - 0.03, z); m.castShadow = m.receiveShadow = true; tray.add(m);
  });
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(W, D), bottomMat); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.0015; bottom.receiveShadow = true; tray.add(bottom);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), tableMat); table.rotation.x = -Math.PI / 2; table.position.y = -0.031; table.receiveShadow = true; scene.add(table);
  const neonStrips = [];
  for (const z of [-D / 2 - T, D / 2 + T]) { const s = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * T, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: z < 0 ? "#ff4fd8" : "#3ad7ff" })); s.position.set(0, Hh - 0.03, z); s.visible = false; tray.add(s); neonStrips.push(s); }

  function woodTex(base, dark) {
    const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { x.strokeStyle = dark; x.globalAlpha = R(0.08, 0.3); x.lineWidth = R(1, 4); const y = R(0, 512); x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(170, y + R(-12, 12), 340, y + R(-12, 12), 512, y + R(-6, 6)); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const woods = { table: woodTex("#a26f3e", "#5d3a1a"), frame: woodTex("#8b5a2b", "#4a2c12") };
  woods.table.repeat.set(10, 10);

  const sand = new ST.Sand(scene);

  /* ---------- playgrounds ---------- */
  const ENVS = {
    minimal: { name: "Minimal table", icon: "⚪", bg: "#eeebe6", table: "#f8f6f2", frame: "#ffffff", bottom: "#dee2e6", sun: 2.5, hemi: 1.2 },
    wooden: { name: "Wooden table", icon: "🪵", bg: "#e9dccb", table: "wood", frame: "wood", bottom: "#5c3d1e", sun: 2.5, hemi: 1.05 },
    studio: { name: "Colourful studio", icon: "🎨", bg: "#ffe3ef", table: "#fff4e6", frame: "#4dabf7", bottom: "#ffd43b", sun: 2.5, hemi: 1.25 },
    neon: { name: "Dark neon studio", icon: "🌃", bg: "#0b0b16", table: "#141428", frame: "#22223f", bottom: "#0f0f22", sun: 0.7, hemi: 0.25, neon: true },
    beach: { name: "Beach", icon: "🏖️", bg: "#a5d8ff", table: "#e8c890", frame: "#c49a6c", bottom: "#b08550", sun: 3, hemi: 1.3 },
    pastel: { name: "Soft pastel", icon: "🌸", bg: "#f3e8ff", table: "#fde2e4", frame: "#cdb4db", bottom: "#e2ece9", sun: 2.3, hemi: 1.3 }
  };
  function setEnv(id) {
    const e = ENVS[id] || ENVS.wooden;
    prefs.env = id; save();
    scene.background = new THREE.Color(e.bg);
    tableMat.map = e.table === "wood" ? woods.table : null; tableMat.color.set(e.table === "wood" ? "#ffffff" : e.table); tableMat.needsUpdate = true;
    frameMat.map = e.frame === "wood" ? woods.frame : null; frameMat.color.set(e.frame === "wood" ? "#ffffff" : e.frame); frameMat.needsUpdate = true;
    bottomMat.color.set(e.bottom);
    sun.intensity = e.sun; hemi.intensity = e.hemi;
    rimA.intensity = rimB.intensity = e.neon ? 3 : 0;
    neonStrips.forEach((s) => (s.visible = !!e.neon));
    A.amb(id);
  }

  /* ---------- sizing ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    camera.aspect = w / h;
    const tall = w / h < 1.1;
    camera.fov = tall ? 48 : 36;
    camera.position.set(0, tall ? 2.4 : 1.32, tall ? 1.6 : 1.22);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);

  /* =========================================================
     SHAPES (moulds, cookie cutters) & STAMP PATTERNS
     ========================================================= */
  function polyShape(pts) {
    const inside = (u, v) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c; } return c; };
    return { pts, inside };
  }
  const ring = (n, f) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; const r = f(a); return [Math.cos(a) * r, Math.sin(a) * r]; });
  const SHAPES = {
    circle: { name: "Circle", icon: "⚪", ...polyShape(ring(48, () => 0.9)) },
    square: { name: "Square", icon: "⬜", ...polyShape([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) },
    star: { name: "Star", icon: "⭐", ...polyShape(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.4 : 0.95; return [Math.cos(a) * r, Math.sin(a) * r]; })) },
    heart: { name: "Heart", icon: "❤️", ...polyShape(Array.from({ length: 48 }, (_, i) => { const t = (i / 48) * Math.PI * 2; return [0.055 * 16 * Math.pow(Math.sin(t), 3), -0.055 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 0.05]; })) },
    flower: { name: "Flower", icon: "🌸", ...polyShape(ring(60, (a) => 0.62 + 0.32 * Math.abs(Math.cos(2.5 * a)))) },
    cat: { name: "Cat", icon: "🐱", ...polyShape([[-0.75, 0.2], [-0.8, -0.85], [-0.4, -0.45], [0.4, -0.45], [0.8, -0.85], [0.75, 0.2], [0.55, 0.65], [0, 0.82], [-0.55, 0.65]]) },
    fish: { name: "Fish", icon: "🐟", ...polyShape([[-0.95, -0.5], [-0.55, 0], [-0.95, 0.5], [-0.6, 0.45], [-0.25, 0.05], [0.1, 0.45], [0.55, 0.4], [0.9, 0.05], [0.55, -0.35], [0.1, -0.45], [-0.25, -0.05], [-0.6, -0.45]]) }
  };
  const PATTERNS = {
    flower: { name: "Flower", icon: "🌼", mask: (u, v) => { const r = Math.hypot(u, v), a = Math.atan2(v, u); return r < 0.25 ? 1 : r < 0.85 && Math.abs(Math.sin(a * 3)) * r > r - 0.08 && Math.abs(Math.cos(a * 3)) > 0.82 ? 0.9 : 0; } },
    star: { name: "Star", icon: "✳️", mask: (u, v) => SHAPES.star.inside(u * 1.05, v * 1.05) && !SHAPES.star.inside(u * 1.6, v * 1.6) ? 1 : SHAPES.star.inside(u * 3, v * 3) ? 1 : 0 },
    spiral: { name: "Spiral", icon: "🌀", mask: (u, v) => { const r = Math.hypot(u, v); if (r > 0.95) return 0; const t = Math.atan2(v, u) / (Math.PI * 2) + r * 4; return (t - Math.floor(t)) < 0.35 ? 1 : 0; } },
    dots: { name: "Dots", icon: "🔵", mask: (u, v) => (Math.hypot(((u + 1) * 3.5) % 1 - 0.5, ((v + 1) * 3.5) % 1 - 0.5) < 0.28 && Math.hypot(u, v) < 0.95 ? 1 : 0) },
    waves: { name: "Waves", icon: "🌊", mask: (u, v) => (Math.abs(Math.sin(v * 9 + Math.sin(u * 5) * 1.4)) < 0.3 && Math.hypot(u, v) < 0.95 ? 1 : 0) },
    paw: { name: "Paw", icon: "🐾", mask: (u, v) => (Math.hypot(u / 0.55, (v - 0.25) / 0.45) < 1 || [[-0.55, -0.25], [-0.2, -0.6], [0.2, -0.6], [0.55, -0.25]].some(([a, b]) => Math.hypot(u - a, v - b) < 0.2) ? 1 : 0) }
  };
  const fingerMask = (u, v) => { const r = Math.hypot(u / 0.75, v); if (r >= 1) return 0; return (1 - r * r) * (0.86 + 0.14 * Math.sin(Math.hypot(u / 0.75, v * 1.1 + 0.15) * 34)); };

  /* =========================================================
     TOOLS
     ========================================================= */
  const TOOLS = [
    { id: "knife", g: "Cut", name: "Sharp Knife", icon: "🔪", type: "line", op: { mode: "full", hw: 1.2, side: true }, model: "knife", tip: "Drag to cut clean through the sand" },
    { id: "plastic", g: "Cut", name: "Plastic Knife", icon: "🍴", type: "line", op: { mode: "round", hw: 2.8, side: true }, model: "plastic", tip: "Drag for smooth, rounded cuts" },
    { id: "blade", g: "Cut", name: "Straight Blade", icon: "📏", type: "straight", op: { mode: "full", hw: 1.0, side: true }, model: "blade", tip: "Drag a line, let go to slice it perfectly straight" },
    { id: "wavy", g: "Cut", name: "Wavy Blade", icon: "〰️", type: "line", pattern: "wave", op: { mode: "full", hw: 1.1, side: true }, model: "wavy", tip: "Drag for wavy decorative cuts" },
    { id: "zigzag", g: "Cut", name: "Zigzag Cutter", icon: "⚡", type: "line", pattern: "zigzag", op: { mode: "full", hw: 1.1, side: true }, model: "zigzag", tip: "Drag for zigzag cuts" },
    { id: "wire", g: "Cut", name: "Wire Cutter", icon: "➖", type: "line", op: { mode: "full", hw: 0.7, side: false }, model: "wire", tip: "Drag a thin wire through for razor-thin slices" },
    { id: "grid", g: "Cut", name: "Grid Cutter", icon: "#️⃣", type: "click", model: "grid", tip: "Click to cut the sand into little cubes" },
    { id: "cookie", g: "Cut", name: "Cookie Cutter", icon: "🍪", type: "click", shapes: true, model: "cookie", tip: "Click to cut out a shape" },
    { id: "hammer", g: "Crush", name: "Hammer", icon: "🔨", type: "click", model: "hammer", tip: "Click to smash" },
    { id: "roller", g: "Crush", name: "Roller", icon: "🧻", type: "drag", model: "roller", tip: "Drag to roll the sand flat" },
    { id: "press", g: "Crush", name: "Press", icon: "🗜️", type: "hold", model: "press", tip: "Hold to squash it flat (watch it squeeze out!)" },
    { id: "crusher", g: "Crush", name: "Crusher", icon: "💥", type: "click", model: "crusher", tip: "Click to crumble the sand into pieces" },
    { id: "stamp", g: "Crush", name: "Stamp", icon: "🔆", type: "click", patterns: true, model: "stamp", tip: "Click to press a pattern in" },
    { id: "block", g: "Crush", name: "Heavy Block", icon: "🧱", type: "click", model: "block", tip: "Click to drop a heavy block" },
    { id: "finger", g: "Crush", name: "Finger Press", icon: "👆", type: "finger", model: "finger", tip: "Click for fingerprints · drag to draw" },
    { id: "spatula", g: "Shape", name: "Spatula", icon: "🏓", type: "drag", model: "spatula", tip: "Drag to push and spread sand" },
    { id: "sculpt", g: "Shape", name: "Sculpting Knife", icon: "✏️", type: "line", op: { mode: "shallow", hw: 1.6, depth: 0.018, side: true }, model: "sculpt", tip: "Drag to carve details" },
    { id: "spoon", g: "Shape", name: "Spoon", icon: "🥄", type: "spoon", model: "spoon", tip: "Press to scoop · let go somewhere to drop a sand ball" },
    { id: "scraper", g: "Shape", name: "Scraper", icon: "🪒", type: "drag", model: "scraper", tip: "Drag to shave off thin layers" },
    { id: "mould", g: "Shape", name: "Mould", icon: "🏰", type: "click", shapes: true, model: "mould", tip: "Click to build a shape · click again to stack it higher" },
    { id: "pour", g: "Shape", name: "Pour Sand", icon: "⏳", type: "hold", model: "pour", tip: "Hold to pour sand in your colour" },
    { id: "squeeze", g: "Shape", name: "Squeeze", icon: "✊", type: "hold", model: "squeeze", tip: "Hold to grab & squeeze sand into a peak" },
    { id: "hands", g: "Shape", name: "Freehand", icon: "🖐️", type: "drag", model: "hands", tip: "Drag to build up sand · hold Shift (or right-drag) to dig" },
    { id: "dig", g: "Shape", name: "Dig a Hole", icon: "🕳️", type: "hold", model: "finger", tip: "Hold to dig a deep hole" }
  ];
  const toolById = (id) => TOOLS.find((t) => t.id === id);
  let tool = toolById(prefs.tool) || TOOLS[0];
  let shape = prefs.shape || "star", pattern = prefs.pattern || "flower";
  let size = 18, pressure = 0.6;

  function renderTools() {
    const box = $("tools"); box.innerHTML = "";
    ["Cut", "Crush", "Shape"].forEach((g) => {
      const h = document.createElement("h5"); h.textContent = g; box.appendChild(h);
      const grid = document.createElement("div"); grid.className = "tool-grid";
      TOOLS.filter((t) => t.g === g).forEach((t) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "tool" + (t === tool ? " active" : ""); b.title = t.name + " — " + t.tip;
        b.innerHTML = '<span class="ti">' + t.icon + '</span><span class="tn">' + t.name + "</span>";
        b.addEventListener("click", () => selectTool(t));
        grid.appendChild(b);
      });
      box.appendChild(grid);
    });
  }
  function selectTool(t) {
    tool = t; prefs.tool = t.id; save();
    renderTools(); renderShapeOpts(); buildModel();
    $("toolTip").textContent = t.icon + " " + t.tip; $("toolTip").style.opacity = 1;
    clearTimeout(selectTool.t); selectTool.t = setTimeout(() => ($("toolTip").style.opacity = 0.65), 2500);
    A.play("click");
  }
  function renderShapeOpts() {
    const el = $("shapeOpts"); el.innerHTML = "";
    const list = tool.shapes ? SHAPES : tool.patterns ? PATTERNS : null;
    if (!list) return;
    const cur = tool.shapes ? shape : pattern;
    el.innerHTML = "<h4>" + (tool.shapes ? "Shape" : "Pattern") + '</h4><div class="chips">' + Object.entries(list).map(([id, s]) => '<button type="button" class="chip' + (id === cur ? " active" : "") + '" data-s="' + id + '">' + s.icon + " " + s.name + "</button>").join("") + "</div>";
    el.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { if (tool.shapes) { shape = b.dataset.s; prefs.shape = shape; } else { pattern = b.dataset.s; prefs.pattern = pattern; } save(); renderShapeOpts(); buildModel(); }));
  }
  $("size").addEventListener("input", (e) => { size = +e.target.value; $("sizeVal").textContent = size; buildModel(); });
  $("press").addEventListener("input", (e) => { pressure = +e.target.value / 100; $("pressVal").textContent = e.target.value + "%"; });

  /* =========================================================
     3D TOOL MODELS (follow the cursor and touch the sand)
     ========================================================= */
  const toolG = new THREE.Group(); scene.add(toolG);
  let model = null;
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4 }, o || {}));
  const steel = M("#ced4da", { metalness: 0.9, roughness: 0.2 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; };
  const cyl = (rt, rb, h, m, x, y, z, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; };
  const worldR = () => size * CELL;
  function outlineTube(sh, r, y, rad, mat) {
    const pts = sh.pts.map(([u, v]) => new V3(u * r, y, v * r));
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.1), 120, rad, 6, true), mat);
  }
  function buildModel() {
    toolG.clear();
    const g = new THREE.Group(), r = worldR(), id = tool.model;
    if (id === "knife" || id === "plastic" || id === "sculpt") {
      const bm = id === "plastic" ? M("#f8f9fa", { roughness: 0.3 }) : steel;
      g.add(box(0.16, 0.05, 0.004, bm, 0, 0.03, 0)); g.add(box(0.1, 0.035, 0.022, M(id === "plastic" ? "#ff8787" : "#343a40"), -0.13, 0.04, 0));
      g.rotation.z = -0.45; g.userData.line = true;
    } else if (id === "blade" || id === "wavy" || id === "zigzag") {
      g.add(box(0.3, 0.035, 0.004, id === "blade" ? steel : M(id === "wavy" ? "#b197fc" : "#ffa94d", { metalness: 0.5 }), 0, 0.02, 0));
      g.add(box(0.07, 0.03, 0.025, M("#212529"), -0.18, 0.025, 0)); g.add(box(0.07, 0.03, 0.025, M("#212529"), 0.18, 0.025, 0));
      g.userData.line = true;
    } else if (id === "wire") {
      g.add(cyl(0.012, 0.012, 0.08, M("#e03131"), -0.16, 0.06, 0)); g.add(cyl(0.012, 0.012, 0.08, M("#e03131"), 0.16, 0.06, 0));
      g.add(box(0.32, 0.0015, 0.0015, steel, 0, 0.02, 0)); g.userData.line = true;
    } else if (id === "grid") {
      const s = r * 2.2;
      const sp = Math.max(8, size * 0.6) * CELL;
      for (let x = -s; x <= s + 1e-6; x += sp) g.add(box(0.003, 0.03, s * 2, steel, x, 0.015, 0));
      for (let z = -s; z <= s + 1e-6; z += sp) g.add(box(s * 2, 0.03, 0.003, steel, 0, 0.015, z));
    } else if (id === "cookie" || id === "mould") {
      const sh = SHAPES[shape], mm = id === "cookie" ? M("#5c7cfa", { metalness: 0.6, roughness: 0.25 }) : M("#ff922b", { transparent: true, opacity: 0.75 });
      const rr = id === "cookie" ? r * 1.4 : r;
      for (let y = 0.004; y < (id === "cookie" ? 0.04 : 0.07); y += 0.008) g.add(outlineTube(sh, rr, y, id === "cookie" ? 0.003 : 0.005, mm));
    } else if (id === "hammer") {
      const head = cyl(0.04, 0.04, 0.13, M("#495057", { metalness: 0.7 }), 0, 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
      g.add(cyl(0.012, 0.012, 0.3, M("#c8955c"), 0.0, 0.19, 0));
    } else if (id === "roller") {
      const rl = cyl(0.04, 0.04, Math.max(0.12, r * 2), M("#ffd8a8", { roughness: 0.5 }), 0, 0.04, 0, 28); rl.rotation.x = Math.PI / 2; g.add(rl);
      for (const s of [-1, 1]) { const hd = cyl(0.012, 0.012, 0.07, M("#c92a2a"), 0, 0.04, s * (Math.max(0.12, r * 2) / 2 + 0.035)); hd.rotation.x = Math.PI / 2; g.add(hd); }
      g.userData.line = true;
    } else if (id === "press") {
      g.add(cyl(r, r, 0.018, M("#adb5bd", { metalness: 0.6 }), 0, 0.009, 0, 40)); g.add(cyl(0.015, 0.015, 0.22, M("#495057"), 0, 0.12, 0)); g.add(cyl(0.05, 0.05, 0.025, M("#e03131"), 0, 0.23, 0));
    } else if (id === "crusher") {
      g.add(cyl(r * 0.8, r * 0.8, 0.05, M("#495057", { metalness: 0.6 }), 0, 0.04, 0, 12));
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), steel); c.position.set(Math.cos(a) * r * 0.55, 0.005, Math.sin(a) * r * 0.55); c.rotation.x = Math.PI; g.add(c); }
      g.add(cyl(0.015, 0.015, 0.2, M("#212529"), 0, 0.16, 0));
    } else if (id === "stamp") {
      g.add(cyl(r, r, 0.03, M("#f783ac", { roughness: 0.5 }), 0, 0.015, 0, 40)); g.add(cyl(0.03, 0.04, 0.09, M("#862e9c"), 0, 0.075, 0)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), M("#862e9c"))).position.set(0, 0.13, 0);
    } else if (id === "block") {
      g.add(box(r * 2, 0.12, r * 2, M("#868e96", { roughness: 0.8 }), 0, 0.06, 0));
    } else if (id === "finger") {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 6, 12), M("#f1c27d", { roughness: 0.6 })); f.position.y = 0.08; f.castShadow = true; g.add(f);
      const nail = box(0.022, 0.004, 0.02, M("#ffe3e3"), 0, 0.15, 0.012); g.add(nail);
    } else if (id === "spatula") {
      g.add(box(0.12, 0.004, 0.1, steel, 0, 0.004, 0)); const hd = cyl(0.01, 0.012, 0.25, M("#228be6"), -0.14, 0.09, 0); hd.rotation.z = 1.1; g.add(hd); g.userData.line = true;
    } else if (id === "spoon") {
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M("#e9ecef", { metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide })); bowl.position.y = 0.05; g.add(bowl);
      const hd = cyl(0.008, 0.008, 0.26, M("#e9ecef", { metalness: 0.8 }), -0.12, 0.11, 0); hd.rotation.z = 1.1; g.add(hd);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshStandardMaterial({ map: sand.tex.albedo, roughness: 0.95 })); ball.position.y = 0.045; ball.visible = false; ball.castShadow = true; g.add(ball); g.userData.ball = ball;
    } else if (id === "scraper") {
      g.add(box(0.012, 0.06, Math.max(0.1, r * 2), M("#20c997", { roughness: 0.4 }), 0, 0.03, 0)); g.add(box(0.03, 0.08, 0.05, M("#212529"), -0.03, 0.09, 0)); g.userData.line = true;
    } else if (id === "pour") {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 24, 1, true), M("#ffd8a8", { side: THREE.DoubleSide })); c.rotation.x = Math.PI; c.position.y = 0.35; g.add(c);
      g.userData.pourColor = c;
    } else if (id === "squeeze" || id === "hands") {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), M("#f1c27d", { roughness: 0.6 })); hand.scale.set(1.3, 0.55, 1); hand.position.y = 0.04; hand.castShadow = true; g.add(hand);
      if (id === "squeeze") for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.05, 4, 8), M("#f1c27d")); const a = (i / 4) * Math.PI * 2; f.position.set(Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05); f.rotation.z = Math.cos(a) * 0.6; f.rotation.x = -Math.sin(a) * 0.6; g.add(f); }
    }
    model = g; toolG.add(g);
    toolG.visible = false;
  }

  /* =========================================================
     INPUT → SAND
     ========================================================= */
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null, hover = null, anim = null;
  let undo = [], redo = [];
  const stats = { cookies: 0, stamps: new Set(), stampCount: 0, moulds: new Set(), balls: 0, pourColors: {}, waveLen: 0 };

  function hitFrom(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return sand.raycast(raycaster.ray);
  }
  function pushUndo() { undo.push(sand.snapshot()); if (undo.length > 25) undo.shift(); redo = []; updateUndo(); }
  function updateUndo() { $("undoBtn").disabled = !undo.length; $("redoBtn").disabled = !redo.length; }

  const curColor = () => ST.hexToLinear(prefs.color);
  const jitter = (c, a) => c.map((x) => clamp(x * (1 + R(-a, a)), 0, 1));

  function crumbs(gx, gz, n, color, up, spread) {
    if (!prefs.fx) return;
    const w = sand.toWorld(gx, gz), y = sand.heightAtGrid(gx, gz);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), s = R(0.1, 1) * (spread || 0.4);
      sand.particles.spawn(new V3(w.x + R(-0.01, 0.01), y + 0.01, w.z + R(-0.01, 0.01)), new V3(Math.cos(a) * s, R(0.3, 1) * (up || 0.6), Math.sin(a) * s), R(0.003, 0.008), jitter(color, 0.12), 0);
    }
  }

  function carveStroke(a, b) {
    const o = tool.op;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.gx - a.gx, b.gz - a.gz) / 1.5));
    let prev = a;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, p = { gx: a.gx + (b.gx - a.gx) * t, gz: a.gz + (b.gz - a.gz) * t };
      let q = p;
      if (tool.pattern) {
        const dx = p.gx - prev.gx, dz = p.gz - prev.gz, l = Math.hypot(dx, dz) || 1;
        down.dist += l;
        const nx = -dz / l, nz = dx / l, lam = 14 + size * 0.4, amp = 3 + size * 0.15;
        const ph = down.dist / lam;
        const f = tool.pattern === "wave" ? Math.sin(ph * Math.PI * 2) : 4 * Math.abs(ph - Math.floor(ph + 0.5)) - 1;
        down.nx = down.nx == null ? nx : down.nx * 0.85 + nx * 0.15; down.nz = down.nz == null ? nz : down.nz * 0.85 + nz * 0.15;
        q = { gx: p.gx + down.nx * amp * f, gz: p.gz + down.nz * amp * f };
        stats.waveLen += l;
      }
      const from = down.lastQ || q;
      const removed = sand.carve(from.gx, from.gz, q.gx, q.gz, o);
      if (removed > 0.0005 && Math.random() < 0.35) crumbs(q.gx, q.gz, 2, sand.avgColor(q.gx, q.gz, 3), 0.4, 0.3);
      down.lastQ = q; prev = p;
    }
  }

  function startAnim(kind, dur) { anim = { kind, t: 0, dur: dur || 0.35 }; }

  function clickTool(h) {
    const gx = h.gx, gz = h.gz, r = size;
    switch (tool.id) {
      case "grid": {
        const s = r * 2.2, sp = Math.max(8, size * 0.6);
        for (let x = -s; x <= s + 1e-6; x += sp) sand.carve(gx + x, gz - s, gx + x, gz + s, { mode: "full", hw: 0.9, side: true });
        for (let z = -s; z <= s + 1e-6; z += sp) sand.carve(gx - s, gz + z, gx + s, gz + z, { mode: "full", hw: 0.9, side: true });
        A.play("slice"); startAnim("press", 0.4); buzz(15);
        break;
      }
      case "cookie": {
        const pts = SHAPES[shape].pts, rr = r * 1.4;
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; sand.carve(gx + a[0] * rr, gz + a[1] * rr, gx + b[0] * rr, gz + b[1] * rr, { mode: "full", hw: 0.9, side: true }); }
        stats.cookies++; A.play("slice"); startAnim("press", 0.4); buzz(15);
        break;
      }
      case "hammer": {
        const { avg } = sand.crater(gx, gz, r * 0.9, 0.03 + 0.06 * pressure);
        crumbs(gx, gz, 35, avg, 1.4, 0.8);
        A.play("crunch"); startAnim("hammer", 0.3); buzz(40); slowBurst();
        break;
      }
      case "crusher": {
        const taken = sand.crumble(gx, gz, r);
        const avg = sand.avgColor(gx, gz, r), n = Math.min(240, 40 + Math.floor(taken * 2));
        if (prefs.fx) { const w = sand.toWorld(gx, gz); for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = R(0, r * CELL); sand.particles.spawn(new V3(w.x + Math.cos(a) * d, sand.heightAt(w.x, w.z) + R(0.01, 0.05), w.z + Math.sin(a) * d), new V3(R(-0.25, 0.25), R(0.2, 0.9), R(-0.25, 0.25)), R(0.004, 0.012), jitter(avg, 0.15), taken / n); } }
        else sand.deposit(gx, gz, taken, r, avg, 1);
        A.play("crumble"); startAnim("press", 0.35); buzz(30); slowBurst();
        break;
      }
      case "stamp": sand.imprint(gx, gz, r, PATTERNS[pattern].mask, 0.012 + 0.022 * pressure); stats.stamps.add(pattern); stats.stampCount++; A.play("stamp"); startAnim("press", 0.35); buzz(20); break;
      case "block": { const lvl = 0.004 + 0.03 * (1 - pressure); sand.flatten(gx, gz, r, lvl, 1, true); A.play("crunch"); startAnim("drop", 0.4); buzz(50); slowBurst(); break; }
      case "mould": sand.mould(gx, gz, r, SHAPES[shape].inside, 0.02 + 0.04 * pressure, curColor()); stats.moulds.add(shape); A.play("pop"); startAnim("lift", 0.45); buzz(15); break;
    }
  }

  function slowBurst() { if (!slow) { sand.particles.timeScale = 0.35; clearTimeout(slowBurst.t); slowBurst.t = setTimeout(() => (sand.particles.timeScale = slow ? 0.3 : 1), 700); } }

  canvas.addEventListener("pointerdown", (e) => {
    A.init();
    if (e.button > 0 && !(tool.id === "hands" && e.button === 2)) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const h = hitFrom(e);
    if (!h || !h.inside) return;
    pushUndo();
    down = { id: e.pointerId, start: h, last: h, t: 0, dist: 0, dig: e.shiftKey || e.button === 2, lastQ: null, sound: 0 };
    hover = h;
    if (tool.type === "click") clickTool(h);
    else if (tool.type === "finger") { sand.imprint(h.gx, h.gz, size * 0.55, fingerMask, 0.02 + 0.04 * pressure); A.play("squish"); buzz(12); }
    else if (tool.type === "spoon") {
      const sc = sand.scoop(h.gx, h.gz, size * 0.6, 0.06 * pressure + 0.02);
      down.held = sc; A.play("scoop");
      if (model.userData.ball) { model.userData.ball.visible = sc.taken > 0.05; model.userData.ball.material.color.setRGB(...sc.color.map((x) => Math.pow(x, 1 / 2.2))); }
    } else if (tool.type === "line") { carveStroke(h, h); A.play("cut"); }
  });

  canvas.addEventListener("pointermove", (e) => {
    const h = hitFrom(e);
    hover = h;
    if (!down || e.pointerId !== down.id || !h) return;
    const last = down.last;
    const dx = h.gx - last.gx, dz = h.gz - last.gz, l = Math.hypot(dx, dz);
    if (l < 0.3) return;
    down.dir = [dx / l, dz / l];
    if (tool.type === "line") {
      carveStroke(last, h);
      down.sound += l; if (down.sound > 8) { down.sound = 0; A.play("cut"); }
    } else if (tool.type === "finger") {
      sand.carve(last.gx, last.gz, h.gx, h.gz, { mode: "shallow", hw: size * 0.35, depth: 0.02 + 0.03 * pressure, side: true });
    } else if (tool.id === "roller") {
      const steps = Math.ceil(l / 2);
      for (let s = 1; s <= steps; s++) {
        const p = { gx: last.gx + (dx * s) / steps, gz: last.gz + (dz * s) / steps };
        const avg = sand.heightAtGrid(p.gx, p.gz);
        sand.flatten(p.gx, p.gz, size * 0.8, Math.max(0.004, avg * (1 - 0.45 * pressure)), 0.5, false, [-dz / l * 2, dx / l * 2]);
        sand.ribs(p.gx, p.gz, size * 0.8, dx / l, dz / l, 0.0012);
      }
      down.rolling = 1;
    } else if (tool.id === "spatula") {
      const m = Math.min(3, l);
      sand.push(h.gx, h.gz, size * 0.8, (dx / l) * m, (dz / l) * m, 0.15 + 0.35 * pressure);
      down.rolling = 0.6;
    } else if (tool.id === "scraper") {
      sand.scrape(h.gx, h.gz, size * 0.6, 0.003 + 0.006 * pressure, dx / l, dz / l);
      down.rolling = 0.4;
    } else if (tool.id === "hands") {
      const steps = Math.ceil(l / 2);
      for (let s = 1; s <= steps; s++) { const p = { gx: last.gx + (dx * s) / steps, gz: last.gz + (dz * s) / steps }; sand.sculpt(p.gx, p.gz, size * 0.7, (down.dig ? -1 : 1) * 0.0025 * pressure, curColor()); }
    }
    down.last = h;
  });

  function endPointer(e) {
    if (!down || (e && e.pointerId !== down.id)) return;
    const d = down; down = null;
    if (tool.type === "straight" && hover) {
      const a = d.start, b = hover;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.gx - a.gx, b.gz - a.gz) / 2));
      for (let s = 0; s < steps; s++) sand.carve(a.gx + ((b.gx - a.gx) * s) / steps, a.gz + ((b.gz - a.gz) * s) / steps, a.gx + ((b.gx - a.gx) * (s + 1)) / steps, a.gz + ((b.gz - a.gz) * (s + 1)) / steps, tool.op);
      A.play("slice"); buzz(15);
      if (Math.hypot(b.gx - a.gx, b.gz - a.gz) > 4) crumbs(b.gx, b.gz, 8, sand.avgColor(b.gx, b.gz, 3), 0.5);
    }
    if (tool.type === "spoon" && d.held && d.held.taken > 0.02) {
      const at = hover && hover.inside ? hover : d.start;
      const w = sand.toWorld(at.gx, at.gz);
      const rr = Math.max(3, Math.min(size * 0.9, Math.cbrt(d.held.taken / (2 * CELL))));
      sand.particles.spawn(new V3(w.x, sand.heightAt(w.x, w.z) + 0.12, w.z), new V3(0, -0.2, 0), 0.02, d.held.color, 0);
      const p = sand.particles.p[sand.particles.p.length - 1];
      if (p) { p.ball = rr; }
      stats.balls++;
      if (model.userData.ball) model.userData.ball.visible = false;
    }
    A.loop("roll", 0); A.loop("pour", 0); A.loop("press", 0);
    checkChallenge();
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerleave", () => { if (!down) hover = null; });

  // a falling sand ball lands as a round ball
  sand.onLand = () => {};
  const origUpdate = sand.particles.update.bind(sand.particles);
  sand.particles.update = function (dt) {
    for (const p of this.p) if (p.ball && !p.done) {
      const g = sand.toGrid(p.x, p.z);
      if (p.y - p.r <= sand.heightAtGrid(g.gx, g.gz) + 0.005) { p.done = true; p.vol = 0; sand.ball(g.gx, g.gz, p.ball, p.color); A.play("plop"); buzz(15); p.life = -1; p.y = -1; }
    }
    this.p = this.p.filter((p) => !(p.done));
    origUpdate(dt);
  };

  /* ---------- holds (press, pour, squeeze, dig) ---------- */
  function holdStep(dt) {
    if (!down || !hover || !hover.inside) return;
    const h = hover;
    down.t += dt;
    if (tool.id === "press") {
      if (!down.base) down.base = sand.heightAtGrid(h.gx, h.gz);
      const target = Math.max(0.003, down.base * (1 - Math.min(1, down.t * 0.9) * (0.4 + 0.6 * pressure)));
      sand.flatten(h.gx, h.gz, size, target, 0.25, false);
      A.loop("press", Math.min(1, down.t * 2) * (down.t < 1.4 ? 1 : 0.2));
      if (down.t < 1.2) buzz(5);
    } else if (tool.id === "pour") {
      const w = sand.toWorld(h.gx, h.gz), c = curColor();
      const n = Math.round(dt * 260 * (0.5 + pressure));
      for (let i = 0; i < n; i++) sand.particles.spawn(new V3(w.x + R(-0.012, 0.012), sand.heightAt(w.x, w.z) + 0.3, w.z + R(-0.012, 0.012)), new V3(R(-0.06, 0.06), R(-0.3, 0), R(-0.06, 0.06)), R(0.003, 0.006), jitter(c, 0.08), null);
      stats.pourColors[prefs.color] = (stats.pourColors[prefs.color] || 0) + n;
      A.loop("pour", 1);
    } else if (tool.id === "squeeze") {
      sand.squeeze(h.gx, h.gz, size, 0.05 * pressure * dt * 60);
      if (down.t % 0.3 < dt) A.play("squish");
    } else if (tool.id === "dig") {
      sand.carve(h.gx, h.gz, h.gx + 0.01, h.gz, { mode: "shallow", hw: size * 0.4, depth: 0.004 * pressure * dt * 60, side: true });
      if (down.t % 0.25 < dt) crumbs(h.gx, h.gz, 3, sand.avgColor(h.gx, h.gz, 3), 0.6, 0.4);
    }
    if (down.rolling) { A.loop("roll", down.rolling); down.rolling *= 0.85; }
  }

  /* ---------- tool model placement + animation ---------- */
  function placeModel(dt) {
    if (!hover || !hover.inside) { toolG.visible = false; return; }
    toolG.visible = true;
    const w = sand.toWorld(hover.gx, hover.gz);
    let y = sand.heightAtGrid(hover.gx, hover.gz);
    let lift = down ? 0 : 0.04;
    if (tool.id === "press" && down) lift = 0;
    if (tool.id === "pour") y = Math.max(y, 0);
    if (["cookie", "mould", "grid", "stamp", "block", "crusher", "press"].includes(tool.id)) y = Math.max(y, sand.heightAtGrid(hover.gx, hover.gz));
    if (anim) {
      anim.t += dt * (slow ? 0.35 : 1);
      const k = anim.t / anim.dur;
      if (anim.kind === "press") lift = k < 0.4 ? 0.06 * (1 - k / 0.4) : 0.06 * ((k - 0.4) / 0.6);
      if (anim.kind === "drop") lift = k < 0.3 ? 0.3 * (1 - k / 0.3) ** 0.5 * 0 + 0.3 * (1 - k / 0.3) : 0.08 * ((k - 0.3) / 0.7);
      if (anim.kind === "lift") lift = k < 0.3 ? 0 : 0.12 * ((k - 0.3) / 0.7);
      if (anim.kind === "hammer") model.rotation.z = k < 0.35 ? -0.9 * (1 - k / 0.35) : k < 0.6 ? 0 : -0.9 * ((k - 0.6) / 0.4);
      if (k >= 1) { anim = null; if (model) model.rotation.z = model.userData.line ? model.rotation.z : 0; }
    }
    if (tool.id === "hammer" && !anim) model.rotation.z = down ? 0 : -0.9;
    toolG.position.set(w.x, y + lift, w.z);
    if (model && model.userData.line && down && down.dir) toolG.rotation.y = -Math.atan2(down.dir[1], down.dir[0]);
    if (tool.id === "roller" && down && down.dir) toolG.rotation.y = -Math.atan2(down.dir[1], down.dir[0]);
    if (model && model.userData.pourColor) model.userData.pourColor.material.color.set(prefs.color);
  }

  /* =========================================================
     COLOURS & TYPES
     ========================================================= */
  const TYPES = { classic: "Classic", fine: "Fine-grain", pastel: "Pastel", wet: "Wet-look", glitter: "Glitter ✨", rainbow: "Rainbow 🌈", neon: "Neon", metallic: "Metallic", layered: "Layered", glow: "Glow-in-the-dark" };
  const SCHEMES = { solid: "Solid", rainbow: "Rainbow", gradient: "Gradient", layers: "Two layers", mixed: "Mixed", multi: "Rainbow layers" };
  const PALETTE = ["#e8b07a", "#d9a066", "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#748ffc", "#b197fc", "#f783ac", "#ffffff", "#ffc9de", "#d0bfff", "#a5d8ff", "#b2f2bb", "#fff3bf", "#ffd8a8", "#ff00aa", "#39ff14", "#00e5ff", "#fff01f", "#ff6a00", "#343a40"];
  const pastelize = (c) => { const v = parseInt(c.slice(1), 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, m = (x) => Math.round(x + (255 - x) * 0.45); return "#" + [m(r), m(g), m(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); };

  function applyScheme(kind) {
    prefs.scheme = kind; save();
    const c = prefs.type === "pastel" ? pastelize(prefs.color) : prefs.color;
    const second = pick(PALETTE.filter((x) => x !== prefs.color));
    if (kind === "solid") sand.setScheme("solid", [c]);
    else if (kind === "rainbow") sand.setScheme("rainbow", [c]);
    else if (kind === "gradient") sand.setScheme("gradient", [c, second]);
    else if (kind === "mixed") sand.setScheme("mixed", [c, second, pick(PALETTE)]);
    else if (kind === "layers") sand.setScheme("layers", [second, c]);
    else if (kind === "multi") sand.setScheme("layers", ["#4dabf7", "#69db7c", "#ffd43b", "#ffa94d", "#ff6b6b", "#b197fc"]);
    renderSide();
  }
  function applyType(t) {
    prefs.type = t; save();
    sand.setType(t === "rainbow" || t === "layered" || t === "pastel" ? "classic" : t);
    if (t === "rainbow") applyScheme("rainbow");
    else if (t === "layered") applyScheme("multi");
    else if (t === "pastel") applyScheme(prefs.scheme === "rainbow" || prefs.scheme === "multi" ? "solid" : prefs.scheme);
    renderSide();
  }
  function renderSide() {
    $("types").innerHTML = Object.entries(TYPES).map(([id, n]) => '<button type="button" class="chip' + (prefs.type === id ? " active" : "") + '" data-t="' + id + '">' + n + "</button>").join("");
    $("schemes").innerHTML = Object.entries(SCHEMES).map(([id, n]) => '<button type="button" class="chip' + (prefs.scheme === id ? " active" : "") + '" data-c="' + id + '">' + n + "</button>").join("");
    $("swatches").innerHTML = PALETTE.map((c) => '<button type="button" class="sw' + (c === prefs.color ? " active" : "") + '" style="--c:' + c + '" data-col="' + c + '" aria-label="' + c + '"></button>').join("");
    $("picker").value = prefs.color;
  }
  $("types").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { pushUndo(); applyType(b.dataset.t); A.play("pop"); } });
  $("schemes").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) { pushUndo(); applyScheme(b.dataset.c); A.play("pop"); } });
  $("swatches").addEventListener("click", (e) => { const b = e.target.closest("[data-col]"); if (b) { prefs.color = b.dataset.col; save(); renderSide(); A.play("click"); } });
  $("picker").addEventListener("input", (e) => { prefs.color = e.target.value; save(); renderSide(); });
  $("applyColor").addEventListener("click", () => { pushUndo(); applyScheme(prefs.scheme === "rainbow" || prefs.scheme === "multi" ? "solid" : prefs.scheme); toast("🎨 All the sand is now that colour."); });

  /* =========================================================
     TOP BAR
     ========================================================= */
  const SHAPE_RESET = [["mound", "⛰️ Sand mound"], ["block", "🧱 Sand block (great for slicing)"], ["flat", "▭ Flat tray"], ["random", "🌋 Random hills"], ["towers", "🏯 Towers"]];
  $("resetMenu").innerHTML = SHAPE_RESET.map(([id, n]) => '<button type="button" data-r="' + id + '">' + n + "</button>").join("");
  $("resetBtn").addEventListener("click", (e) => { e.stopPropagation(); $("resetMenu").hidden = !$("resetMenu").hidden; });
  document.addEventListener("click", () => ($("resetMenu").hidden = true));
  $("resetMenu").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; pushUndo(); resetSand(b.dataset.r); });
  function resetSand(kind) { sand.seed = Math.random() * 6; sand.particles.clear(); sand.setShape(kind); applyScheme(prefs.scheme); A.play("squish"); }
  $("randomBtn").addEventListener("click", () => {
    pushUndo();
    prefs.color = pick(PALETTE.slice(0, 18));
    applyType(pick(Object.keys(TYPES)));
    if (prefs.type !== "rainbow" && prefs.type !== "layered") applyScheme(pick(Object.keys(SCHEMES)));
    resetSand(pick(["mound", "block", "random", "towers"]));
    toast("🎲 Surprise sand!");
  });
  $("undoBtn").addEventListener("click", () => { if (!undo.length) return; redo.push(sand.snapshot()); sand.restore(undo.pop()); updateUndo(); });
  $("redoBtn").addEventListener("click", () => { if (!redo.length) return; undo.push(sand.snapshot()); sand.restore(redo.pop()); updateUndo(); });
  let slow = false;
  $("slowBtn").addEventListener("click", () => { slow = !slow; sand.particles.timeScale = slow ? 0.3 : 1; $("slowBtn").classList.toggle("on", slow); toast(slow ? "🐢 Slow motion on — watch every grain." : "Normal speed"); });
  function renderToggles() { $("soundBtn").textContent = prefs.sound ? "🔊" : "🔇"; $("fxBtn").classList.toggle("off", !prefs.fx); }
  $("soundBtn").addEventListener("click", () => { prefs.sound = !prefs.sound; prefs.ambience = prefs.sound; save(); A.init(); A.setAmb(prefs.ambience); renderToggles(); toast(prefs.sound ? "🔊 Sound on" : "🔇 Sound off"); });
  $("fxBtn").addEventListener("click", () => { prefs.fx = !prefs.fx; save(); renderToggles(); toast(prefs.fx ? "✨ Particle effects on" : "Particle effects off"); });
  $("fullBtn").addEventListener("click", () => { const el = document.querySelector(".sand-app"); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); });
  $("envBtn").addEventListener("click", () => showEnvs());
  $("menuBtn").addEventListener("click", () => ($("mainMenu").hidden = false));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input")) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); $(e.shiftKey ? "redoBtn" : "undoBtn").click(); }
    else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); $("redoBtn").click(); }
    else if (k === "[") { $("size").value = Math.max(6, size - 3); $("size").dispatchEvent(new Event("input")); }
    else if (k === "]") { $("size").value = Math.min(60, size + 3); $("size").dispatchEvent(new Event("input")); }
    else if (k === "escape") { $("modal").hidden = true; }
  });

  function snapshotImage(w) {
    renderer.render(scene, camera);
    const c = document.createElement("canvas"), src = renderer.domElement;
    c.width = w; c.height = Math.round((w * src.height) / src.width);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  $("shotBtn").addEventListener("click", () => {
    toolG.visible = false;
    renderer.render(scene, camera);
    renderer.domElement.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "sand-therapy-" + Date.now() + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("📸 Picture downloaded!"); });
  });

  /* =========================================================
     MY CREATIONS (IndexedDB, this device only)
     ========================================================= */
  const db = (() => {
    let p = null;
    const open = () => p || (p = new Promise((res) => { try { const r = indexedDB.open("nsh-sand", 1); r.onupgradeneeded = () => r.result.createObjectStore("c", { keyPath: "id", autoIncrement: true }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }));
    const tx = async (mode, fn) => { const d = await open(); if (!d) return null; return new Promise((res) => { const t = d.transaction("c", mode); const q = fn(t.objectStore("c")); t.oncomplete = () => res(q && q.result); t.onerror = () => res(null); }); };
    return { add: (v) => tx("readwrite", (s) => s.add(v)), all: () => tx("readonly", (s) => s.getAll()), del: (k) => tx("readwrite", (s) => s.delete(k)) };
  })();
  $("saveBtn").addEventListener("click", async () => {
    toolG.visible = false;
    const thumb = await new Promise((res) => snapshotImage(320).toBlob(res, "image/jpeg", 0.85));
    await db.add({ h: sand.h.slice(), col: sand.col.slice(), type: prefs.type, scheme: sand.scheme, schemeId: prefs.scheme, env: prefs.env, thumb, date: Date.now() });
    A.play("chime"); toast("💾 Saved to My Creations");
  });
  async function showCreations() {
    const list = ((await db.all()) || []).sort((a, b) => b.date - a.date);
    openModal('<div class="mhead"><h2>🖼️ My creations</h2><button class="btn small" data-close>Close</button></div><div class="creations">' +
      (list.length ? list.map((c) => '<div class="cr" data-id="' + c.id + '"><img alt="Sand creation" data-load="' + c.id + '"><div class="cr-row"><span>' + new Date(c.date).toLocaleDateString() + '</span><button type="button" data-del="' + c.id + '" title="Delete">🗑️</button></div></div>').join("") : '<div class="empty">Nothing saved yet. Make something lovely and tap 💾.</div>') + "</div>");
    for (const c of list) { const img = $("modalCard").querySelector('[data-load="' + c.id + '"]'); if (img && c.thumb) img.src = URL.createObjectURL(c.thumb); }
    $("modalCard").onclick = async (e) => {
      const l = e.target.closest("[data-load]"), d = e.target.closest("[data-del]");
      if (e.target.closest("[data-close]")) return closeModal();
      if (d) { await db.del(+d.dataset.del); showCreations(); return; }
      if (l) {
        const c = list.find((x) => x.id === +l.dataset.load);
        pushUndo();
        prefs.type = c.type; sand.setType(["rainbow", "layered", "pastel"].includes(c.type) ? "classic" : c.type);
        sand.scheme = c.scheme; prefs.scheme = c.schemeId || "solid";
        sand.restore({ h: c.h, col: c.col });
        setEnv(c.env); renderSide(); closeModal(); $("mainMenu").hidden = true;
        toast("🖼️ Loaded. Keep playing!");
      }
    };
  }

  /* =========================================================
     CHALLENGES (optional)
     ========================================================= */
  const guideG = new THREE.Group(); scene.add(guideG);
  const CH = [
    { id: "slice4", icon: "🔪", name: "Slice into 4", desc: "Cut the block into 4 equal pieces along the guides.", setup: () => { resetSand("block"); guides([[0.5, 0.19, 0.5, 0.81], [0.19, 0.5, 0.81, 0.5]]); }, check: () => guideProgress() },
    { id: "slice9", icon: "🧊", name: "Nine cubes", desc: "Slice the block into 9 cubes along the guides.", setup: () => { resetSand("block"); const a = 0.19 + 0.62 / 3, b = 0.19 + (0.62 * 2) / 3; guides([[a, 0.19, a, 0.81], [b, 0.19, b, 0.81], [0.19, a, 0.81, a], [0.19, b, 0.81, b]]); }, check: () => guideProgress() },
    { id: "tower", icon: "🏯", name: "Tall tower", desc: "Stack moulds into a tower taller than 25 cm (keep clicking the Mould!).", setup: () => { resetSand("flat"); selectTool(toolById("mould")); }, check: () => sand.stats().max / 0.25 },
    { id: "flat", icon: "▭", name: "Totally flat", desc: "Flatten the whole mound with the roller or press.", setup: () => resetSand("mound"), check: () => { const s = sand.stats(); return clamp((0.13 - s.max) / (0.13 - 0.045), 0, 1); } },
    { id: "pattern", icon: "🔆", name: "Pattern party", desc: "Press 4 different stamp patterns into the sand.", setup: () => { resetSand("flat"); stats.stamps.clear(); selectTool(toolById("stamp")); }, check: () => stats.stamps.size / 4 },
    { id: "sculpt", icon: "🏰", name: "Sculpture", desc: "Build a sculpture using 3 different moulds.", setup: () => { resetSand("flat"); stats.moulds.clear(); selectTool(toolById("mould")); }, check: () => stats.moulds.size / 3 },
    { id: "cookies", icon: "🍪", name: "Cookie factory", desc: "Cut out 5 cookie shapes.", setup: () => { resetSand("flat"); stats.cookies = 0; selectTool(toolById("cookie")); }, check: () => stats.cookies / 5 },
    { id: "balls", icon: "⚪", name: "Sand balls", desc: "Scoop and drop 4 sand balls with the spoon.", setup: () => { resetSand("mound"); stats.balls = 0; selectTool(toolById("spoon")); }, check: () => stats.balls / 4 },
    { id: "colours", icon: "🎨", name: "Colour mix", desc: "Pour the 3 suggested colours: pink, blue and yellow.", setup: () => { resetSand("flat"); stats.pourColors = {}; selectTool(toolById("pour")); }, colors: ["#f783ac", "#4dabf7", "#ffd43b"], check() { return this.colors.filter((c) => (stats.pourColors[c] || 0) > 150).length / 3; } },
    { id: "waves", icon: "〰️", name: "Wave art", desc: "Draw long wavy or zigzag patterns across the sand.", setup: () => { resetSand("flat"); stats.waveLen = 0; selectTool(toolById("wavy")); }, check: () => stats.waveLen / 600 }
  ];
  let active = null;
  function guides(list) {
    guideG.clear();
    active.lines = list.map(([u0, v0, u1, v1]) => [u0 * (NX - 1), v0 * (NZ - 1), u1 * (NX - 1), v1 * (NZ - 1)]);
    for (const [a, b, c, d] of active.lines) {
      const p = [sand.toWorld(a, b), sand.toWorld(c, d)];
      const geo = new THREE.BufferGeometry().setFromPoints([new V3(p[0].x, 0.13, p[0].z), new V3(p[1].x, 0.13, p[1].z)]);
      guideG.add(new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff4f8b, dashSize: 0.02, gapSize: 0.015 })).computeLineDistances());
    }
  }
  function guideProgress() {
    let n = 0, cut = 0;
    for (const [a, b, c, d] of active.lines) for (let t = 0.04; t <= 0.96; t += 0.02) {
      const gx = a + (c - a) * t, gz = b + (d - b) * t;
      let low = false;
      for (let o = -3; o <= 3 && !low; o++) low = sand.heightAtGrid(gx + (d !== b ? o : 0), gz + (c !== a ? o : 0)) < 0.02;
      n++; if (low) cut++;
    }
    return n ? cut / n / 0.9 : 0;
  }
  function startChallenge(c) {
    pushUndo(); guideG.clear();
    active = c; c.setup();
    if (c.colors) { prefs.color = c.colors[0]; save(); renderSide(); }
    $("challengeSlot").innerHTML = '<div class="ch"><span>' + c.icon + '</span><span class="ch-text" title="' + c.desc + '">' + c.desc + '</span><div class="ch-bar"><i id="chFill"></i></div><button type="button" id="chQuit" title="Back to free play">✕</button></div>';
    $("chQuit").addEventListener("click", endChallenge);
    closeModal(); $("mainMenu").hidden = true;
    toast(c.icon + " " + c.name + ": " + c.desc, 3500);
  }
  function endChallenge() { active = null; guideG.clear(); $("challengeSlot").innerHTML = ""; }
  function checkChallenge() {
    if (!active) return;
    const p = clamp(active.check(), 0, 1);
    const f = $("chFill"); if (f) f.style.width = p * 100 + "%";
    if (p >= 1 && !active.won) {
      active.won = true;
      prefs.done[active.id] = true; save();
      A.play("chime"); buzz([20, 40, 20]);
      const w = sand.toWorld(NX / 2, NZ / 2);
      if (prefs.fx) for (let i = 0; i < 120; i++) sand.particles.spawn(new V3(w.x + R(-0.5, 0.5), 0.5, w.z + R(-0.3, 0.3)), new V3(R(-0.2, 0.2), R(0, 0.3), R(-0.2, 0.2)), R(0.004, 0.008), ST.hexToLinear(pick(PALETTE)), null);
      toast("🏆 Challenge complete! " + pick(["So satisfying.", "Beautiful work.", "Very zen.", "Sand master!"]), 3200);
      setTimeout(() => { const f2 = $("chFill"); if (f2) f2.parentElement.parentElement.querySelector(".ch-text").textContent = "✅ Done! Keep playing or try another challenge."; }, 300);
    }
  }
  function showChallenges() {
    openModal('<div class="mhead"><h2>🏆 Challenges</h2><button class="btn small" data-close>Close</button></div><p class="muted">Totally optional. Free play is always one click away.</p><div class="cards">' +
      '<button type="button" class="card" data-free><span class="ci">🏖️</span><b>Free play</b><small>No goals. Just sand.</small></button>' +
      CH.map((c) => '<button type="button" class="card' + (prefs.done[c.id] ? " done" : "") + '" data-ch="' + c.id + '"><span class="ci">' + c.icon + "</span><b>" + c.name + "</b><small>" + c.desc + "</small></button>").join("") + "</div>");
    $("modalCard").onclick = (e) => {
      if (e.target.closest("[data-close]")) return closeModal();
      if (e.target.closest("[data-free]")) { endChallenge(); closeModal(); $("mainMenu").hidden = true; return; }
      const b = e.target.closest("[data-ch]"); if (b) startChallenge(CH.find((c) => c.id === b.dataset.ch));
    };
  }
  function showEnvs() {
    openModal('<div class="mhead"><h2>🏖️ Playground</h2><button class="btn small" data-close>Close</button></div><div class="cards">' +
      Object.entries(ENVS).map(([id, e]) => '<button type="button" class="card' + (prefs.env === id ? " active" : "") + '" data-env="' + id + '"><span class="ci">' + e.icon + "</span><b>" + e.name + "</b></button>").join("") + "</div>");
    $("modalCard").onclick = (e) => { if (e.target.closest("[data-close]")) return closeModal(); const b = e.target.closest("[data-env]"); if (b) { A.init(); setEnv(b.dataset.env); showEnvs(); } };
  }
  function showTypes() {
    openModal('<div class="mhead"><h2>🎨 Sand type</h2><button class="btn small" data-close>Close</button></div><div class="cards">' +
      Object.entries(TYPES).map(([id, n]) => '<button type="button" class="card' + (prefs.type === id ? " active" : "") + '" data-ty="' + id + '"><b>' + n + "</b></button>").join("") + '</div><p class="muted">Colours are in the panel on the right while you play.</p>');
    $("modalCard").onclick = (e) => { if (e.target.closest("[data-close]")) return closeModal(); const b = e.target.closest("[data-ty]"); if (b) { applyType(b.dataset.ty); showTypes(); } };
  }
  function openModal(html) { $("modalCard").innerHTML = html; $("modal").hidden = false; }
  function closeModal() { $("modal").hidden = true; }
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });

  $("mainMenu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    A.init();
    const m = b.dataset.m;
    if (m === "play") { $("mainMenu").hidden = true; endChallenge(); }
    else if (m === "type") showTypes();
    else if (m === "env") showEnvs();
    else if (m === "challenges") showChallenges();
    else if (m === "creations") showCreations();
  });

  /* =========================================================
     BOOT + LOOP
     ========================================================= */
  renderTools(); renderSide(); renderShapeOpts(); renderToggles(); updateUndo();
  sand.seed = 1;
  sand.setShape("mound");
  applyType(prefs.type);
  if (prefs.type !== "rainbow" && prefs.type !== "layered") applyScheme(prefs.scheme);
  setEnv(prefs.env);
  selectTool(tool);
  resize();

  let last = performance.now();
  function frame() {
    const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    holdStep(dt);
    sand.update(dt);
    placeModel(dt);
    if (active && down) { frame.ct = (frame.ct || 0) + dt; if (frame.ct > 0.4) { frame.ct = 0; checkChallenge(); } }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  ST.app = { sand, selectTool, toolById, resetSand, applyType, applyScheme, setEnv, startChallenge, CH, renderer, scene, camera, get hover() { return hover; } };
})();
