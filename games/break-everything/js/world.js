/* ============ BREAK EVERYTHING — world: scene, physics, rooms, damage, breaking, effects, replay ============ */
(function () {
  "use strict";
  const BE = window.BE;
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const W = (BE.world = {});
  const G = (BE.G = { STATIC: 1, FRONT: 2, OBJ: 4, FRAG: 8, PROJ: 16, KIN: 32 });
  const ALL = 63;
  const STEP = 1 / 100;
  const BUF = 7; // seconds of replay history

  let renderer, scene, camera, world, raycaster, envGroup;
  let acc = 0, uid = 0, lastT = 0;
  const objects = (W.objects = []);
  const frags = (W.frags = []);
  const dyn = (W.dyn = []);
  const ents = new Set();
  const impacts = [], cooldown = new Map(), timers = [], afterStep = [], fxList = [];
  const hooks = {};
  W.simT = 0; W.slow = false; W.shakeOn = true; W.fxOn = true; W.paused = false;
  W.on = (n, f) => (hooks[n] = hooks[n] || []).push(f);
  const emit = (n, ...a) => (hooks[n] || []).forEach((f) => f(...a));
  W.later = (sec, fn) => timers.push({ t: W.simT + sec, fn });
  W.afterStep = (fn) => afterStep.push(fn);

  /* ---------- canvas textures for rooms ---------- */
  function ctex(w, h, draw, rx, ry) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || rx || 1);
    return t;
  }
  const speckle = (x, w, h, n, cols) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = R(0.03, 0.12); x.fillRect(R(0, w), R(0, h), R(1, 4), R(1, 4)); } x.globalAlpha = 1; };
  const T = {
    concrete: () => ctex(256, 256, (x) => { x.fillStyle = "#b9bec4"; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 2500, ["#6c757d", "#f8f9fa"]); for (let i = 0; i < 6; i++) { x.fillStyle = "rgba(80,80,80,0.05)"; x.beginPath(); x.arc(R(0, 256), R(0, 256), R(20, 60), 0, 7); x.fill(); } x.strokeStyle = "rgba(60,60,60,0.25)"; x.strokeRect(0, 0, 256, 256); }, 4, 3),
    concreteWall: () => ctex(256, 256, (x) => { x.fillStyle = "#d5d9de"; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 2000, ["#868e96", "#ffffff"]); x.fillStyle = "rgba(90,90,90,0.25)"; for (const [a, b] of [[40, 60], [200, 60], [40, 190], [200, 190]]) { x.beginPath(); x.arc(a, b, 5, 0, 7); x.fill(); } }, 4, 2),
    wallTile: () => ctex(256, 256, (x) => { x.fillStyle = "#cfd8dc"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }, 6, 4),
    checker: () => ctex(256, 256, (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? "#343a40" : "#f1f3f5"; x.fillRect(i * 64, j * 64, 64, 64); } }, 5, 4),
    glossDark: () => ctex(256, 256, (x) => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#1b1f3b"); g.addColorStop(1, "#0b0d1e"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(120,140,255,0.12)"; for (let i = 0; i < 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); } }, 4, 1),
    darkFloor: () => ctex(256, 256, (x) => { x.fillStyle = "#151829"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(130,150,255,0.25)"; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254); }, 6, 5),
    brick: () => ctex(256, 256, (x) => { x.fillStyle = "#8d6e63"; x.fillRect(0, 0, 256, 256); for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { x.fillStyle = ["#a1503d", "#b35c44", "#9c4a36", "#a85a3f"][(r * 7 + c * 3) & 3]; x.fillRect(c * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26); } speckle(x, 256, 256, 800, ["#000", "#fff"]); }, 5, 3),
    warehouseFloor: () => ctex(256, 256, (x) => { x.fillStyle = "#8e9399"; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 3000, ["#495057", "#ced4da"]); x.fillStyle = "rgba(40,40,40,0.08)"; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(R(0, 256), R(0, 256), R(20, 50), R(10, 30), R(0, 3), 0, 7); x.fill(); } }, 3, 3),
    panel: () => ctex(256, 256, (x) => { x.drawImage(BE.tex.wood.image, 0, 0, 256, 256); x.fillStyle = "rgba(90,50,20,0.25)"; for (let i = 0; i < 256; i += 64) x.fillRect(i, 0, 4, 256); }, 5, 2),
    rug: () => ctex(256, 256, (x) => { x.fillStyle = "#c46b4a"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "#f2d0a4"; x.lineWidth = 8; x.strokeRect(18, 18, 220, 220); x.strokeStyle = "#5c3d2e"; x.lineWidth = 4; x.strokeRect(36, 36, 184, 184); x.fillStyle = "#f2d0a4"; for (let i = 0; i < 4; i++) { x.save(); x.translate(128, 128); x.rotate((i * Math.PI) / 2); x.beginPath(); x.moveTo(0, -60); x.lineTo(20, -30); x.lineTo(0, 0); x.lineTo(-20, -30); x.fill(); x.restore(); } }, 1, 1),
    woodFloor: () => ctex(256, 256, (x) => { for (let r = 0; r < 8; r++) { x.fillStyle = ["#9c6b3f", "#a87447", "#8f6239", "#b07d4e"][r & 3]; x.fillRect(0, r * 32, 256, 31); x.fillStyle = "rgba(60,30,10,0.4)"; x.fillRect(((r * 97) % 200) + 20, r * 32, 2, 31); } }, 4, 4),
    pastel: () => ctex(256, 256, (x) => { x.fillStyle = "#ffe3ec"; x.fillRect(0, 0, 256, 256); x.font = "28px sans-serif"; const em = ["⭐", "☁️", "🌙", "💖"]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillText(em[(i + j) & 3], i * 64 + ((j % 2) * 32) + 8, j * 64 + 40); }, 5, 2),
    foam: () => ctex(256, 256, (x) => { const c = ["#a5d8ff", "#ffd8a8", "#b2f2bb", "#d0bfff"]; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = c[i * 2 + j]; x.fillRect(i * 128, j * 128, 128, 128); } x.strokeStyle = "rgba(0,0,0,0.08)"; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }, 4, 3),
    stripes: () => ctex(256, 256, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#ffd43b" : "#ff6b6b"; x.fillRect(i * 32, 0, 32, 256); } x.fillStyle = "rgba(255,255,255,0.15)"; x.fillRect(0, 200, 256, 56); }, 4, 1),
    toonFloor: () => ctex(256, 256, (x) => { const c = ["#4dabf7", "#ffffff"]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = c[(i + j) % 2]; x.fillRect(i * 64, j * 64, 64, 64); } }, 4, 3),
    studio: () => ctex(256, 256, (x) => { x.fillStyle = "#e3e7ec"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(40,60,90,0.14)"; x.lineWidth = 1; for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } }, 5, 4)
  };
  const texCache = {};
  const tx = (k) => texCache[k] || (texCache[k] = T[k]());
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8 }, o));

  /* ---------- environments ---------- */
  // surfaces are rectangles objects can be placed on: { x0, x1, z0, z1, y }
  const FLOOR = { x0: -3.9, x1: 3.9, z0: -3.3, z1: 1.3, y: 0 };
  const ENVS = [
    { id: "empty", name: "Empty Destruction Room", icon: "🏚️", bg: "#c9ced4", floor: () => std({ map: tx("concrete") }), wall: () => std({ map: tx("concreteWall") }),
      props(P) { P.plat("pedL", -2.3, -2.4, 1.0, 0.6, 0.8, std({ color: "#adb5bd", roughness: 0.9 })); P.plat("pedR", 2.3, -2.4, 1.0, 0.6, 0.8, std({ color: "#adb5bd", roughness: 0.9 })); P.decal("⚠️ SMASH ZONE ⚠️", 0, 2.8, "#ffd43b", "#212529"); },
      items: [["plate", 1, "pedL", { stack: 4 }], ["mug", 2, "pedL"], ["bottle", 3, "pedR"], ["glass", 2, "pedR"], ["cardbox", 3, "floor"], ["cardbox", 1, "floor", { stack: 2 }], ["crate", 1, "floor"], ["tv", 1, "floor"], ["chair", 1, "floor"], ["tub", 1, "floor"], ["beachball", 1, "floor"], ["tnt", 1, "floor"], ["gvase", 1, "floor"]] },
    { id: "kitchen", name: "Kitchen", icon: "🍳", bg: "#e9ecef", floor: () => std({ map: tx("checker"), roughness: 0.4 }), wall: () => std({ map: tx("wallTile"), roughness: 0.3 }),
      props(P) {
        P.plat("counter", 0, -3.55, 8.6, 0.92, 0.8, std({ color: "#f1f3f5", roughness: 0.25 }), std({ color: "#5c7cfa", roughness: 0.5 }));
        P.plat("shelf", 0, -3.82, 6, 0.05, 0.36, std({ map: BE.tex.wood }), null, 1.75);
        P.box(-3.5, 2.6, -3.95, 1.4, 0.9, 0.1, std({ color: "#dee2e6" }));
      },
      items: [["plate", 2, "counter", { stack: 4 }], ["cup", 3, "counter"], ["mug", 3, "counter"], ["bowl", 2, "counter"], ["jar", 2, "counter"], ["container", 2, "counter"], ["pot", 1, "counter"], ["glass", 4, "shelf"], ["bottle", 3, "shelf"], ["jar", 1, "shelf"],
        ["table", 1, "floor", { at: [0, -0.9], top: { name: "table", w: 0.7, d: 0.45, y: 0.575 } }], ["plate", 2, "table"], ["cup", 2, "table"], ["bowl", 1, "table"], ["glass", 1, "table"], ["chair", 2, "floor"], ["tub", 1, "floor"], ["tile", 3, "floor"]] },
    { id: "glassroom", name: "Glass Room", icon: "🥂", bg: "#0b0d1e", dark: true, floor: () => std({ map: tx("darkFloor"), roughness: 0.15, metalness: 0.3 }), wall: () => std({ map: tx("glossDark"), roughness: 0.3 }),
      props(P) {
        const acr = () => new THREE.MeshPhysicalMaterial({ color: "#c5d5ff", roughness: 0.1, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1 });
        P.plat("tier1", 0, -2.0, 8.6, 0.35, 0.6, acr()); P.plat("tier2", 0, -2.6, 8.6, 0.7, 0.6, acr()); P.plat("tier3", 0, -3.2, 8.6, 1.05, 0.6, acr());
        P.neon(0, 2.4, -3.97, 8.5, "#748ffc"); P.neon(0, 0.03, -1.68, 8.5, "#f783ac");
      },
      items: [["bottle", 5, "tier1"], ["glass", 5, "tier1"], ["jar", 3, "tier2"], ["gvase", 4, "tier2"], ["ornament", 3, "tier2"], ["bulb", 5, "tier3"], ["bottle", 4, "tier3"], ["gplate", 2, "tier3"], ["window", 2, "floor", { at: [-2.6, -0.6] }], ["window", 1, "floor", { at: [2.6, -0.6] }], ["gplate", 2, "floor", { stack: 3 }], ["glass", 3, "floor"]] },
    { id: "warehouse", name: "Warehouse", icon: "🏭", bg: "#5c5f66", floor: () => std({ map: tx("warehouseFloor"), roughness: 0.85 }), wall: () => std({ map: tx("brick") }),
      props(P) {
        const metal = std({ color: "#1c7ed6", metalness: 0.6, roughness: 0.4 }), shelfM = std({ color: "#adb5bd", metalness: 0.5, roughness: 0.5 });
        for (const sx of [-2.2, 2.2]) { P.plat(sx < 0 ? "rackL1" : "rackR1", sx, -3.5, 3.4, 0.05, 0.7, shelfM, null, 0.9); P.plat(sx < 0 ? "rackL2" : "rackR2", sx, -3.5, 3.4, 0.05, 0.7, shelfM, null, 1.8); for (const px of [-1.68, 1.68]) for (const pz of [-3.83, -3.17]) P.box(sx + px, 1.0, pz, 0.06, 2.0, 0.06, metal); }
        P.stripe(-4.2, 0.0, 0.12, 5.0, "#fcc419"); P.stripe(4.2, 0.0, 0.12, 5.0, "#fcc419");
      },
      items: [["cardbox", 3, "rackL1"], ["cardbox", 2, "rackL2"], ["tub", 3, "rackR1"], ["speaker", 2, "rackR2"], ["robot", 2, "rackR2"], ["cardbox", 3, "floor", { stack: 3 }], ["crate", 3, "floor"], ["crate", 1, "floor", { stack: 2 }], ["tnt", 3, "floor"], ["keyboard", 2, "floor"], ["container", 2, "floor"]] },
    { id: "woodroom", name: "Wooden Furniture Room", icon: "🪑", bg: "#d8b48a", floor: () => std({ map: tx("woodFloor"), roughness: 0.6 }), wall: () => std({ map: tx("panel") }),
      props(P) { P.rug(0, -0.8, 4.2, 2.8); P.box(0, 2.5, -3.97, 1.4, 1.0, 0.05, std({ color: "#ffe8cc" })); },
      items: [["table", 1, "floor", { at: [-1.6, -1.2], top: { name: "t1", w: 0.7, d: 0.45, y: 0.575 } }], ["table", 1, "floor", { at: [1.7, -0.4], top: { name: "t2", w: 0.7, d: 0.45, y: 0.575 } }],
        ["shelf", 1, "floor", { at: [-3.4, -3.0], top: { name: "sh", w: 0.6, d: 0.18, y: 0.415 }, top2: { name: "sh2", w: 0.6, d: 0.18, y: 0.805 } }], ["cabinet", 1, "floor", { at: [3.2, -3.0], top: { name: "cab", w: 0.5, d: 0.3, y: 0.8 } }], ["drawers", 1, "floor", { at: [0.2, -3.1], top: { name: "dr", w: 0.42, d: 0.3, y: 0.6 } }],
        ["pot", 1, "t1"], ["mug", 2, "t1"], ["plate", 1, "t2", { stack: 3 }], ["cup", 1, "t2"], ["gvase", 1, "cab"], ["figurine", 1, "dr"], ["clock", 1, "dr"], ["bowl", 1, "sh"], ["jar", 1, "sh"], ["bottle", 2, "sh2"],
        ["chair", 3, "floor"], ["stool", 2, "floor"]] },
    { id: "toyroom", name: "Toy Room", icon: "🧸", bg: "#ffe3ec", floor: () => std({ map: tx("foam"), roughness: 0.95 }), wall: () => std({ map: tx("pastel") }),
      props(P) { P.plat("blockL", -2.6, -2.9, 1.4, 0.45, 1.0, std({ color: "#ffa8a8", roughness: 0.95 })); P.plat("blockR", 2.6, -2.9, 1.4, 0.7, 1.0, std({ color: "#91a7ff", roughness: 0.95 })); },
      items: [["duck", 1, "floor", { at: [0, -2.4] }], ["beachball", 3, "floor"], ["balloon", 3, "floor"], ["robot", 2, "blockL"], ["figurine", 1, "blockL"], ["donut", 1, "blockR"], ["cake", 1, "blockR"], ["ornament", 2, "floor"], ["robot", 1, "floor"], ["donut", 1, "floor"], ["cardbox", 1, "floor"]] },
    { id: "cartoon", name: "Cartoon Arena", icon: "🎪", bg: "#ffec99", floor: () => std({ map: tx("toonFloor"), roughness: 0.5 }), wall: () => std({ map: tx("stripes"), roughness: 0.6 }),
      props(P) { for (const [x, z] of [[-3, -2.7], [0, -3.1], [3, -2.7]]) P.plat("ped" + x, x, z, 0.8, 0.5, 0.8, std({ color: "#ffffff", roughness: 0.4 }), std({ color: "#f03e3e" })); P.decal("💥 ARENA 💥", 0, 3.0, "#ffffff", "#f03e3e"); },
      items: [["tv", 1, "ped-3"], ["cake", 1, "ped0"], ["tv", 1, "ped3"], ["tnt", 5, "floor"], ["donut", 2, "floor"], ["balloon", 2, "floor"], ["crate", 2, "floor"], ["cardbox", 2, "floor"], ["bottle", 3, "floor"], ["plate", 1, "floor", { stack: 3 }], ["beachball", 1, "floor"]] },
    { id: "studio", name: "Minimalist Testing Studio", icon: "🧪", bg: "#cfd6de", floor: () => std({ map: tx("studio"), roughness: 0.6 }), wall: () => std({ color: "#c9d2dc", roughness: 0.9 }),
      props(P) { for (let i = 0; i < 7; i++) P.plat("p" + i, -3.3 + i * 1.1, -2.2, 0.5, 0.8, 0.5, std({ color: "#ffffff", roughness: 0.35 }), std({ color: "#343a40", roughness: 0.4 })); P.stripe(0, -1.6, 8.6, 0.04, "#fa5252"); P.decal("TEST  #001", 0, 3.1, "#ffffff", "#343a40"); },
      items: [["gvase", 1, "p0"], ["bottle", 1, "p1"], ["mug", 1, "p2"], ["bulb", 1, "p3"], ["figurine", 1, "p4"], ["glass", 1, "p5"], ["jar", 1, "p6"], ["cardbox", 1, "floor", { at: [-2.4, 0.4] }], ["crate", 1, "floor", { at: [2.4, 0.4] }], ["chair", 1, "floor", { at: [0, 0.2] }], ["beachball", 1, "floor", { at: [-1, 1.0] }], ["tv", 1, "floor", { at: [1.2, 1.0] }]] }
  ];
  W.ENVS = ENVS;

  /* ---------- particles (one cheap Points cloud, CPU simulated) ---------- */
  class Particles {
    constructor(max, additive) {
      this.max = max; this.n = 0;
      this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
      this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
      this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.a0 = new Float32Array(max);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("color", new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      this.mat = new THREE.ShaderMaterial({
        uniforms: { scale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        vertexShader: "attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }",
        fragmentShader: "varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d); if(r>0.25) discard; gl_FragColor=vec4(vC.rgb, vC.a*smoothstep(0.25,0.12,r)); }"
      });
      this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.geo = g;
    }
    add(p, v, life, size, c, a, grav, drag, grow) {
      if (this.n >= this.max) return;
      const i = this.n++;
      this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
      this.col.set([c.r, c.g, c.b, a], i * 4); this.a0[i] = a;
      this.size[i] = size; this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav; this.drag[i] = drag; this.grow[i] = grow || 0;
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.copy(this.n - 1, i); this.n--; i--; continue; }
        const k = Math.exp(-this.drag[i] * dt);
        this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        if (this.pos[i * 3 + 1] < 0.01 && this.grav[i] > 0) { this.pos[i * 3 + 1] = 0.01; this.vel[i * 3 + 1] *= -0.2; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
        this.size[i] += this.grow[i] * dt;
        this.col[i * 4 + 3] = this.a0[i] * Math.min(1, (this.life[i] / this.maxLife[i]) * 2);
      }
      this.geo.setDrawRange(0, this.n);
      this.geo.attributes.position.needsUpdate = this.geo.attributes.color.needsUpdate = this.geo.attributes.size.needsUpdate = true;
    }
    copy(from, to) {
      for (const [arr, w] of [[this.pos, 3], [this.vel, 3], [this.col, 4]]) for (let k = 0; k < w; k++) arr[to * w + k] = arr[from * w + k];
      for (const arr of [this.size, this.life, this.maxLife, this.grav, this.drag, this.grow, this.a0]) arr[to] = arr[from];
    }
    clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
    snap() { return { n: this.n, p: this.pos.slice(0, this.n * 3), c: this.col.slice(0, this.n * 4), s: this.size.slice(0, this.n) }; }
    show(s) { this.pos.set(s.p); this.col.set(s.c); this.size.set(s.s); this.geo.setDrawRange(0, s.n); this.geo.attributes.position.needsUpdate = this.geo.attributes.color.needsUpdate = this.geo.attributes.size.needsUpdate = true; }
  }
  let pNorm, pAdd;
  const tmpC = new THREE.Color();
  const amount = (n) => Math.max(1, Math.round(n * (W.fxOn ? 1 : 0.25)));
  const rv = (s) => new V3(R(-s, s), R(-s, s), R(-s, s));

  W.fx = {
    dust(p, color, n, spread) { tmpC.set(color || "#ced4da"); for (let i = 0; i < amount(n); i++) pNorm.add(p.clone().add(rv(spread || 0.1)), rv(1.2).add(new V3(0, R(0.2, 1.2), 0)), R(0.6, 1.4), R(0.025, 0.06), tmpC, R(0.22, 0.42), 0.5, 2.5, 0.1); },
    glints(p, n, spread) { tmpC.set("#ffffff"); for (let i = 0; i < amount(n); i++) pAdd.add(p.clone().add(rv(spread || 0.15)), rv(3).add(new V3(0, R(1, 3), 0)), R(0.4, 1.1), R(0.02, 0.045), tmpC, 0.9, 7, 0.5); },
    sparks(p, n, dir) { for (let i = 0; i < amount(n); i++) { tmpC.setHSL(R(0.06, 0.13), 1, 0.6); pAdd.add(p, rv(4).add(dir ? dir.clone().multiplyScalar(3) : new V3(0, 2, 0)), R(0.2, 0.6), R(0.02, 0.04), tmpC, 1, 9, 1); } },
    splash(p, n) { for (let i = 0; i < amount(n || 50); i++) { tmpC.setHSL(R(0.55, 0.6), 0.85, R(0.6, 0.8)); pNorm.add(p.clone().add(rv(0.05)), rv(3.2).add(new V3(0, R(1, 3.5), 0)), R(0.5, 1.1), R(0.03, 0.07), tmpC, 0.75, 9, 0.4); } },
    confetti(p, n) { const c = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac"]; for (let i = 0; i < amount(n); i++) { tmpC.set(c[i % c.length]); pNorm.add(p.clone().add(rv(0.1)), rv(3.5).add(new V3(0, R(1.5, 4), 0)), R(1.2, 2.4), R(0.018, 0.032), tmpC, 1, 3, 1.4); } },
    fire(p, n, s) { s = s || 1; for (let i = 0; i < amount(n); i++) { tmpC.setHSL(R(0.02, 0.12), 1, R(0.5, 0.65)); pAdd.add(p.clone().add(rv(0.25 * s)), rv(3 * s).add(new V3(0, R(0.5, 2.5) * s, 0)), R(0.3, 0.8), R(0.25, 0.5) * s, tmpC, 0.9, -1.5, 3, 0.6); } },
    smoke(p, n, s) { s = s || 1; for (let i = 0; i < amount(n); i++) { tmpC.setHSL(0, 0, R(0.25, 0.45)); pNorm.add(p.clone().add(rv(0.3 * s)), rv(1.5 * s).add(new V3(0, R(0.6, 1.8), 0)), R(1.2, 2.4), R(0.25, 0.45) * s, tmpC, 0.5, -0.4, 1.5, 0.5); } },
    crumbs(p, n, colors) { for (let i = 0; i < amount(n); i++) { tmpC.set(colors[i % colors.length]); pNorm.add(p.clone().add(rv(0.08)), rv(2.5).add(new V3(0, R(1, 3), 0)), R(0.8, 1.6), R(0.025, 0.05), tmpC, 1, 9, 0.5); } },
    ring(p, color, max) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(p); m.position.y = Math.max(0.02, p.y - 0.2); scene.add(m);
      fxList.push({ t: 0, dur: 0.45, up(k) { m.scale.setScalar(0.1 + k * max); m.material.opacity = 0.8 * (1 - k); }, done() { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
    },
    flash(p, color, intensity, dur) {
      if (!W.fxOn) return;
      const l = new THREE.PointLight(color, intensity, 8, 1.6); l.position.copy(p); scene.add(l);
      fxList.push({ t: 0, dur: dur || 0.35, up(k) { l.intensity = intensity * (1 - k) * (1 - k); }, done() { scene.remove(l); l.dispose && l.dispose(); } });
    }
  };

  /* ---------- init ---------- */
  W.init = function (stage) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.prepend(renderer.domElement);
    scene = W.scene = new THREE.Scene();
    camera = W.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
    camera.position.set(0, 3.5, 7.8);
    raycaster = new THREE.Raycaster();

    // soft studio reflections for glass and glossy stuff
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const roomM = new THREE.MeshBasicMaterial({ color: "#8a8f99", side: THREE.BackSide });
    es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), roomM));
    for (const [x, y, z, w, h, c] of [[0, 3.9, 0, 6, 0.1, "#ffffff"], [-5.9, 2, 0, 0.1, 3, "#fff4e6"], [5.9, 2, -2, 0.1, 2, "#e7f5ff"], [0, 1.5, -5.9, 4, 1, "#ffffff"]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w || 0.1, h || 0.1, w > 1 && x === 0 && y > 3 ? 6 : 1), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.material.color.multiplyScalar(3); es.add(m); }
    scene.environment = pm.fromScene(es, 0.04).texture;
    scene.environmentIntensity = 0.55;

    W.hemi = new THREE.HemisphereLight("#ffffff", "#b0a898", 0.9); scene.add(W.hemi);
    const sun = (W.sun = new THREE.DirectionalLight("#fff6ea", 2.1));
    sun.position.set(3.5, 8, 5); sun.target.position.set(0, 0, -1);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6.5, right: 6.5, top: 6, bottom: -5, near: 1, far: 22 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight("#dbe4ff", 0.5); fill.position.set(-5, 4, 3); scene.add(fill);

    pNorm = new Particles(2500, false); pAdd = new Particles(1500, true);
    scene.add(pNorm.points, pAdd.points);

    // physics
    world = W.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.solver.iterations = 10;
    world.defaultContactMaterial.friction = 0.45;
    world.defaultContactMaterial.restitution = 0.12;
    world.defaultContactMaterial.contactEquationStiffness = 5e7;
    W.bouncyMat = new CANNON.Material("bouncy");
    world.addContactMaterial(new CANNON.ContactMaterial(W.bouncyMat, world.defaultMaterial, { friction: 0.3, restitution: 0.85 }));
    const plane = (pos, euler, group) => { const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), collisionFilterGroup: group || G.STATIC, collisionFilterMask: ALL }); b.position.set(...pos); b.quaternion.setFromEuler(...euler); b.isRoom = true; b.aabbNeedsUpdate = true; b.updateAABB(); world.addBody(b); return b; };
    plane([0, 0, 0], [-Math.PI / 2, 0, 0]);
    plane([0, 0, -4], [0, 0, 0]);
    plane([-5, 0, 0], [0, Math.PI / 2, 0]);
    plane([5, 0, 0], [0, -Math.PI / 2, 0]);
    plane([0, 6, 0], [Math.PI / 2, 0, 0]);
    const front = plane([0, 0, 2.6], [0, Math.PI, 0], G.FRONT); front.collisionFilterMask = G.OBJ | G.FRAG;

    new ResizeObserver(() => W.resize()).observe(stage);
    W.stage = stage;
    W.resize();
  };

  W.resize = function () {
    const r = W.stage.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const s = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    pNorm.mat.uniforms.scale.value = pAdd.mat.uniforms.scale.value = s;
    W.tall = w / h < 0.95;
    W.setView(W.view || "normal", true);
  };

  /* ---------- room building ---------- */
  let envStatics = [];
  W.envPick = [];
  W.setEnv = function (id) {
    const env = ENVS.find((e) => e.id === id) || ENVS[0];
    W.env = env;
    if (envGroup) { scene.remove(envGroup); envGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    for (const b of envStatics) world.removeBody(b);
    envStatics = []; W.envPick = [];
    envGroup = new THREE.Group(); scene.add(envGroup);
    scene.background = new THREE.Color(env.bg);
    scene.fog = new THREE.Fog(env.bg, 14, 30);
    W.hemi.intensity = env.dark ? 0.35 : 0.9; W.sun.intensity = env.dark ? 1.1 : 2.1;
    scene.environmentIntensity = env.dark ? 0.9 : 0.55;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), env.floor());
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1); floor.receiveShadow = true; envGroup.add(floor); W.envPick.push(floor);
    const wallM = env.wall();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallM); back.position.set(0, 3, -4); back.receiveShadow = true; envGroup.add(back);
    for (const sx of [-1, 1]) {
      const m = wallM.clone(); if (m.map) { m.map = m.map.clone(); m.map.repeat.set(m.map.repeat.x * 0.66, m.map.repeat.y); m.map.needsUpdate = true; }
      const side = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 6), m); side.position.set(sx * 5, 3, -0.7); side.rotation.y = -sx * Math.PI / 2; side.receiveShadow = true; envGroup.add(side);
    }
    const baseboard = std({ color: env.dark ? "#2b2f4a" : "#ffffff" });
    for (const [x, z, w, ry] of [[0, -3.98, 10, 0], [-4.98, -0.7, 6.6, Math.PI / 2], [4.98, -0.7, 6.6, Math.PI / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.04), baseboard); b.position.set(x, 0.06, z); b.rotation.y = ry; envGroup.add(b); }
    const surf = { floor: Object.assign({}, FLOOR) };
    const P = {
      plat(name, x, z, w, h, d, mat, frontMat, y0) {
        y0 = y0 || 0;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; envGroup.add(m); W.envPick.push(m);
        if (frontMat) { const f = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, Math.max(0.05, h - 0.06), 0.02), frontMat); f.position.set(x, y0 + (h - 0.06) / 2, z + d / 2 + 0.005); envGroup.add(f); }
        const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), collisionFilterGroup: G.STATIC, collisionFilterMask: ALL });
        b.position.set(x, y0 + h / 2, z); b.isRoom = true; b.aabbNeedsUpdate = true; b.updateAABB(); world.addBody(b); envStatics.push(b);
        surf[name] = { x0: x - w / 2 + 0.08, x1: x + w / 2 - 0.08, z0: z - d / 2 + 0.08, z1: z + d / 2 - 0.08, y: y0 + h };
        // keep floor items out from under this platform
        if (y0 + h < 2.2 && z + d / 2 > surf.floor.z0 - 0.3) surf.floor.z0 = Math.max(surf.floor.z0, z + d / 2 + 0.25);
      },
      box(x, y, z, w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; envGroup.add(m); },
      neon(x, y, z, w, c) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); envGroup.add(m); const l = new THREE.PointLight(c, 2.5, 6); l.position.set(x, y, z + 0.6); envGroup.add(l); },
      stripe(x, z, w, d, c) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: c })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); envGroup.add(m); },
      rug(x, z, w, d) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ map: tx("rug"), roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.003, z); m.receiveShadow = true; envGroup.add(m); },
      decal(text, x, y, fg, bgc) {
        const c = document.createElement("canvas"); c.width = 1024; c.height = 160; const g = c.getContext("2d");
        if (bgc) { g.fillStyle = bgc; g.beginPath(); g.roundRect(8, 8, 1008, 144, 40); g.fill(); }
        g.fillStyle = fg; g.font = "bold 96px Fredoka, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 84);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.56), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(x, y, -3.97); envGroup.add(m);
      }
    };
    env.props(P);
    W.surfaces = surf;
    emit("env", env);
  };

  /* ---------- spawning & layout ---------- */
  const Yax = new V3(0, 1, 0);
  W.spawn = function (id, o) {
    const def = BE.objectById(id); if (!def) return null;
    o = o || {};
    const obj = BE.build(def, o);
    obj.id = ++uid; obj.alive = true; obj.born = W.simT; obj.grace = o.grace != null ? o.grace : 0.9;
    const q = new THREE.Quaternion().setFromAxisAngle(Yax, o.ry || 0);
    const c = obj.com.clone().applyQuaternion(q);
    const b = obj.body;
    b.position.set(o.x + c.x, (o.y || 0) + c.y + 0.004, o.z + c.z);
    b.quaternion.set(q.x, q.y, q.z, q.w);
    b.collisionFilterGroup = G.OBJ; b.collisionFilterMask = ALL;
    b.allowSleep = true; b.sleepSpeedLimit = 0.12; b.sleepTimeLimit = 0.8;
    b.obj = obj;
    if (o.vel) b.velocity.set(o.vel.x, o.vel.y, o.vel.z);
    b.addEventListener("collide", (e) => onCollide(obj, e));
    world.addBody(b);
    scene.add(obj.group); ents.add(obj.group);
    obj.group.traverse((m) => { if (m.isMesh) m.userData.obj = obj; });
    obj.group.position.copy(b.position); obj.group.quaternion.copy(b.quaternion);
    objects.push(obj);
    emit("spawn", obj);
    return obj;
  };

  // items: [[id, count, surfaceName, opts]]
  W.layout = function (items, opts) {
    opts = opts || {};
    const placed = {}, made = [];
    const surf = W.surfaces;
    for (const [id, n, on, io] of items) {
      const o = io || {};
      for (let k = 0; k < n; k++) {
        const s = surf[on]; if (!s) continue;
        const def = BE.objectById(id);
        const scale = o.scale || (opts.scale ? opts.scale() : 1);
        const probe = BE.build(def, { scale, material: o.material, color: o.color });
        const r = probe.radius + 0.04;
        const list = (placed[on] = placed[on] || []);
        let x, z, ok = false;
        for (let t = 0; t < 60 && !ok; t++) {
          if (o.at && t === 0) { x = o.at[0]; z = o.at[1]; }
          else { x = R(s.x0 + Math.min(r, (s.x1 - s.x0) / 2), s.x1 - Math.min(r, (s.x1 - s.x0) / 2)); z = R(s.z0 + Math.min(r, (s.z1 - s.z0) / 2), s.z1 - Math.min(r, (s.z1 - s.z0) / 2)); }
          ok = list.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + r);
        }
        if (!ok) continue;
        list.push({ x, z, r });
        const ry = o.top || o.at ? 0 : o.ry != null ? o.ry : R(-0.6, 0.6);
        const stack = o.stack || 1;
        for (let st = 0; st < stack; st++) {
          const obj = W.spawn(id, { x, z, y: s.y + st * (probe.height + 0.004), ry, scale, material: o.material, color: o.color, grace: opts.grace });
          if (obj) made.push(obj);
        }
        for (const tk of ["top", "top2"]) if (o[tk]) { const t = o[tk]; surf[t.name] = { x0: x - t.w / 2, x1: x + t.w / 2, z0: z - t.d / 2, z1: z + t.d / 2, y: t.y * scale }; }
      }
    }
    return made;
  };
  // free spot on the floor for dropping new things
  W.freeSpot = function (r) {
    const s = W.surfaces.floor;
    let best = null, bd = -1;
    for (let t = 0; t < 25; t++) {
      const x = R(s.x0 + r, s.x1 - r), z = R(s.z0 + r, s.z1 - r);
      let d = 9;
      for (const o of objects) d = Math.min(d, Math.hypot(o.body.position.x - x, o.body.position.z - z) - o.radius);
      if (d > bd) { bd = d; best = { x, z }; }
      if (d > r + 0.2) break;
    }
    return best;
  };

  /* ---------- removal ---------- */
  function retire(m) { m.visible = false; m.userData.retiredAt = W.simT; }
  W.retire = retire;
  W.removeObj = function (obj, silent) {
    if (!obj.alive) return;
    obj.alive = false;
    const i = objects.indexOf(obj); if (i >= 0) objects.splice(i, 1);
    world.removeBody(obj.body);
    retire(obj.group);
    if (!silent) emit("remove", obj);
  };
  function cleanGraveyard() {
    if (W.replaying) return;
    for (const m of ents) {
      if (m.userData.retiredAt != null && W.simT - m.userData.retiredAt > BUF + 0.5) {
        ents.delete(m); if (m.parent) m.parent.remove(m);
        if (!m.userData.keep) m.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (!o.userData.sharedMat) o.material.dispose && o.material.dispose(); } });
      }
    }
  }
  W.track = (m) => ents.add(m);
  W.untrack = (m) => ents.delete(m);

  /* ---------- damage ---------- */
  function onCollide(obj, e) {
    if (!obj.alive) return;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v < 1.1) return;
    const c = e.contact, mine = c.bi === obj.body;
    const bp = mine ? c.bi.position : c.bj.position, r = mine ? c.ri : c.rj;
    impacts.push({ obj, other: e.body, v, p: new V3(bp.x + r.x, bp.y + r.y, bp.z + r.z) });
  }
  function processImpacts() {
    const t = W.simT;
    for (const im of impacts) {
      const { obj, other, v } = im;
      if (!obj.alive) continue;
      const key = obj.id + ":" + other.id;
      if ((cooldown.get(key) || 0) > t) continue;
      cooldown.set(key, t + 0.15);
      let f;
      if (other.kin) f = other.kin.f;
      else if (other.mass === 0) f = 1;
      else f = Math.min(4, Math.max(0.12, Math.sqrt(other.mass / obj.body.mass)));
      const mul = other.proj ? other.proj.mul : other.frag ? 0.55 : 1;
      if (other.proj && other.proj.onHit) other.proj.onHit(obj, im.p, v);
      if (t - obj.born < obj.grace && !other.proj && !other.kin) continue;
      const over = v - obj.thr;
      const dir = new V3(other.velocity.x - obj.body.velocity.x, other.velocity.y - obj.body.velocity.y, other.velocity.z - obj.body.velocity.z);
      if (dir.lengthSq() > 1e-6) dir.normalize(); else dir.set(0, -1, 0);
      if (over <= 0) { if (v > 1.6 && f > 0.3) BE.audio.knock(obj.mainMat, v / 8); continue; }
      const src = other.proj ? { kind: "tool", tool: other.proj.tool } : other.kin ? { kind: "tool", tool: other.kin.tool } : other.obj ? { kind: "impact", chain: other.obj.lastSrc && other.obj.lastSrc.chain } : { kind: "fall" };
      W.damage(obj, over * 7 * f * mul, im.p, dir, src, Math.min(5, v * 0.5));
    }
    impacts.length = 0;
    if (cooldown.size > 4000) for (const [k, v] of cooldown) if (v < t) cooldown.delete(k);
  }

  W.damage = function (obj, dmg, point, dir, src, force) {
    if (!obj.alive || !(dmg > 0)) return;
    obj.hp -= dmg; obj.lastSrc = src;
    emit("damage", obj, dmg, src);
    const mat = BE.MATERIALS[obj.mainMat];
    if (obj.hp <= 0) { W.breakObj(obj, point, dir, force || 3, src); return; }
    const k = dmg / obj.maxHp;
    const quiet = src && src.quiet;
    if (!quiet) BE.audio.knock(obj.mainMat, 0.3 + k * 2);
    if (point) {
      if (!quiet) W.fx.dust(point, mat.dust || "#e9ecef", 3 + k * 20, 0.05);
      if (obj.mainMat === "glass") W.fx.glints(point, 2 + k * 10);
      // plastic & metal dent, cardboard crushes in
      for (const part of obj.parts) {
        const pm = BE.MATERIALS[part.mat];
        if (pm.dent || part.mat === "metal" || pm.crush) dent(part, point, (0.07 + k * 0.12) * obj.scale, Math.min(0.05, 0.012 + k * 0.08) * obj.scale);
      }
    }
    if (mat.squish) obj.wob = Math.min(1.6, obj.wob + 0.5 + k * 3);
    if (mat.crush) obj.crush = Math.min(0.45, obj.crush + k * 0.4);
    updateStage(obj);
  };
  function updateStage(obj) {
    const r = obj.hp / obj.maxHp, st = r < 0.4 ? 2 : r < 0.75 ? 1 : 0;
    if (st <= obj.stage) return;
    obj.stage = st;
    for (const part of obj.parts) {
      const look = part.look;
      if (part.mat === "glass") { look.emissiveMap = BE.glassCrackTex(st); look.emissive.set("#ffffff"); look.emissiveIntensity = st === 1 ? 0.45 : 0.85; if (look.transparent) look.opacity = Math.min(0.8, look.opacity + 0.12); look.needsUpdate = true; }
      else if (part.mat === "ceramic" || part.mat === "wood" || (part.mat === "plastic" && st === 2) || part.mat === "cake") { look.map = BE.crackTex(part.baseKey, st); look.needsUpdate = true; }
    }
  }
  const tmpV = new V3();
  function dent(part, worldPoint, radius, depth) {
    const mesh = part.mesh, geo = mesh.geometry;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    mesh.updateWorldMatrix(true, false);
    const local = mesh.worldToLocal(worldPoint.clone());
    const sc = mesh.scale.x, rl = radius / sc, dl = depth / sc;
    if (local.distanceTo(geo.boundingSphere.center) > geo.boundingSphere.radius + rl) return;
    const pos = geo.attributes.position, c = geo.boundingSphere.center;
    let moved = false;
    for (let i = 0; i < pos.count; i++) {
      tmpV.fromBufferAttribute(pos, i);
      const d = tmpV.distanceTo(local);
      if (d >= rl) continue;
      const k = (1 - d / rl) ** 2;
      const toC = c.clone().sub(tmpV); const len = toC.length(); if (len < 1e-4) continue;
      tmpV.addScaledVector(toC, Math.min(dl * k, len * 0.5) / len);
      pos.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); moved = true;
    }
    if (moved) { pos.needsUpdate = true; geo.computeVertexNormals(); }
  }

  /* direct hit from a tool: push + damage */
  W.hit = function (obj, point, dir, power, push, src) {
    if (!obj.alive) return;
    const b = obj.body; b.wakeUp();
    const imp = Math.min(push * b.mass, push * 6);
    b.applyImpulse(new CANNON.Vec3(dir.x * imp, dir.y * imp, dir.z * imp), new CANNON.Vec3(point.x - b.position.x, point.y - b.position.y, point.z - b.position.z));
    W.damage(obj, power * R(0.85, 1.15), point, dir, src, 2 + push * 0.5);
  };

  /* ---------- breaking ---------- */
  let chainId = 0;
  W.newChain = () => ++chainId;
  W.lastBreak = null;
  W.breakObj = function (obj, point, dir, force, src) {
    if (!obj.alive) return;
    const b = obj.body;
    const vel = new V3(b.velocity.x, b.velocity.y, b.velocity.z);
    const center = new V3(b.position.x, b.position.y, b.position.z);
    const pc = point ? point.clone() : center.clone();
    dir = dir || new V3(0, -1, 0);
    force = Math.max(1.5, force || 3);
    obj.group.updateMatrixWorld(true);
    const mats = new Set();
    let nfr = 0;
    const box = new THREE.Box3();
    for (const part of obj.parts) {
      mats.add(part.mat);
      box.setFromObject(part.mesh);
      const fr = BE.fragments(part, box);
      const mul = part.mat === "glass" ? 1.4 : part.mat === "inflatable" ? 1.8 : part.mat === "wood" ? 0.75 : part.mat === "cardboard" ? 0.6 : 1;
      for (const f of fr.list) {
        const out = f.mesh.position.clone().sub(pc); out.y += 0.05;
        if (out.lengthSq() < 1e-6) out.set(R(-1, 1), 1, R(-1, 1));
        out.normalize();
        const v = vel.clone().addScaledVector(out, force * R(0.25, 1) * mul).addScaledVector(dir, force * 0.35 * R(0, 1) * mul);
        if (obj.squashY) f.mesh.position.y = Math.min(f.mesh.position.y, b.position.y);
        addFrag(f, v, fr.material);
        nfr++;
      }
      fr.material.userData = { fragMat: true };
    }
    // effects per material
    const sz = Math.max(obj.size.x, obj.size.y, obj.size.z);
    for (const m of mats) {
      const M = BE.MATERIALS[m];
      if (M.dust) W.fx.dust(center, M.dust, 8 + sz * 30, sz * 0.3);
      if (m === "glass") { W.fx.glints(center, 12 + sz * 30, sz * 0.4); setTimeout(() => BE.audio.tinkle(6), 250); }
      if (m === "inflatable") { W.fx.confetti(center, 30 + sz * 40); W.fx.ring(center, "#ffffff", 1.2 + sz); }
      if (m === "cake") W.fx.crumbs(center, 30, ["#ffc9de", "#fff0f6", "#e9a35b", "#ff6b6b", "#4dabf7"]);
      if (m === "wood") W.fx.dust(center, "#a0703f", 6 + sz * 10, sz * 0.3);
    }
    const loud = 0.55 + Math.min(0.7, obj.maxHp / 90);
    BE.audio.breakSound(obj.mainMat, loud);
    for (const m of mats) if (m !== obj.mainMat) BE.audio.breakSound(m, loud * 0.5);
    W.shake(Math.min(0.9, 0.12 + obj.maxHp / 160));
    W.removeObj(obj, true);
    W.lastBreak = { t: W.simT, point: center.clone() };
    W.focus = center.clone();
    obj.frags = nfr;
    emit("break", obj, src || { kind: "tool" });
    if (obj.explosive) {
      const chain = (src && src.chain) || W.newChain();
      W.later(0.07, () => W.explode(center, 2.6 * obj.scale, 230 * obj.scale, { kind: "explosion", chain, by: obj }));
    }
  };

  /* ---------- fragments: live bodies, then frozen debris ---------- */
  const MAX_ACTIVE = 360, MAX_DEBRIS = 1300;
  function fragBody(f) {
    const s = f.size;
    const shape = f.round ? new CANNON.Sphere(s[0] / 2) : new CANNON.Box(new CANNON.Vec3(Math.max(0.006, s[0] / 2), Math.max(0.006, s[1] / 2), Math.max(0.006, s[2] / 2)));
    const damp = f.mat === "inflatable" ? 0.6 : f.mat === "cardboard" ? 0.3 : 0.05;
    const b = new CANNON.Body({ mass: f.mass, shape, linearDamping: damp, angularDamping: 0.25, collisionFilterGroup: G.FRAG, collisionFilterMask: G.STATIC | G.FRONT | G.OBJ | G.FRAG | G.PROJ | G.KIN });
    b.allowSleep = true; b.sleepSpeedLimit = 0.3; b.sleepTimeLimit = 0.5; b.frag = true;
    return b;
  }
  function addFrag(f, v, sharedMat) {
    f.mesh.userData.sharedMat = true;
    scene.add(f.mesh); ents.add(f.mesh);
    const b = fragBody(f);
    b.position.set(f.mesh.position.x, f.mesh.position.y, f.mesh.position.z);
    b.quaternion.set(f.mesh.quaternion.x, f.mesh.quaternion.y, f.mesh.quaternion.z, f.mesh.quaternion.w);
    b.velocity.set(v.x, v.y, v.z);
    b.angularVelocity.set(R(-10, 10), R(-10, 10), R(-10, 10));
    world.addBody(b);
    f.body = b; f.born = W.simT; f.mat0 = sharedMat;
    frags.push(f);
  }
  function freeze(f) { if (!f.body) return; world.removeBody(f.body); f.body = null; f.mesh.userData.frozenAt = W.simT; }
  function wake(f) {
    if (f.body) { f.body.wakeUp(); return; }
    const b = fragBody(f); b.position.copy(f.mesh.position); b.quaternion.copy(f.mesh.quaternion);
    world.addBody(b); f.body = b; f.born = W.simT; f.mesh.userData.frozenAt = null;
  }
  function dropFrag(i) { const f = frags[i]; if (f.body) world.removeBody(f.body); retire(f.mesh); frags.splice(i, 1); }
  function updateFrags() {
    let active = 0;
    for (let i = frags.length - 1; i >= 0; i--) {
      const f = frags[i];
      if (!f.body) continue;
      const b = f.body;
      f.mesh.position.copy(b.position); f.mesh.quaternion.copy(b.quaternion);
      if (b.position.y < -1) { dropFrag(i); continue; }
      const age = W.simT - f.born;
      if (b.sleepState === CANNON.Body.SLEEPING || (age > 7 && b.velocity.lengthSquared() < 0.3) || age > 14) freeze(f);
      else active++;
    }
    if (active > MAX_ACTIVE) { let over = active - MAX_ACTIVE; for (let i = 0; i < frags.length && over > 0; i++) if (frags[i].body) { if (frags[i].body.position.y < 0.25) freeze(frags[i]); else { dropFrag(i); i--; } over--; } }
    if (frags.length > MAX_DEBRIS) for (let i = 0; i < frags.length - MAX_DEBRIS; i++) if (!frags[i].body) { dropFrag(i); i--; }
  }
  W.clearDebris = function () {
    const list = frags.splice(0, frags.length);
    for (const f of list) {
      if (f.body) world.removeBody(f.body);
      const m = f.mesh, s0 = m.scale.x;
      fxList.push({ t: 0, dur: 0.35, up(k) { m.scale.setScalar(s0 * (1 - k)); }, done() { retire(m); } });
    }
  };
  W.clearAll = function () {
    for (const o of objects.slice()) W.removeObj(o, true);
    for (const f of frags.splice(0, frags.length)) { if (f.body) world.removeBody(f.body); retire(f.mesh); }
    emit("cleared");
  };
  W.debrisCount = () => frags.length;

  /* push everything near a point (wakes frozen debris too) */
  W.blast = function (p, radius, dv, opts) {
    opts = opts || {};
    for (const f of frags) {
      const d = f.mesh.position.distanceTo(p); if (d > radius) continue;
      wake(f);
      const k = 1 - d / radius, dir = f.mesh.position.clone().sub(p); dir.y = Math.abs(dir.y) + 0.4; dir.normalize();
      f.body.velocity.x += dir.x * dv * k; f.body.velocity.y += dir.y * dv * k; f.body.velocity.z += dir.z * dv * k;
    }
    if (opts.objects) for (const o of objects) {
      const pos = o.body.position, d = Math.hypot(pos.x - p.x, pos.y - p.y, pos.z - p.z) - o.radius * 0.5; if (d > radius) continue;
      const k = 1 - Math.max(0, d) / radius, dir = new V3(pos.x - p.x, Math.abs(pos.y - p.y) + 0.5, pos.z - p.z).normalize();
      o.body.wakeUp(); o.body.velocity.x += dir.x * dv * k; o.body.velocity.y += dir.y * dv * k; o.body.velocity.z += dir.z * dv * k;
    }
  };

  /* ---------- explosions ---------- */
  W.explode = function (c, radius, power, src) {
    radius = radius || 2.5; power = power || 220;
    src = src || { kind: "explosion", chain: W.newChain() };
    W.fx.fire(c, 50, radius / 2.5); W.fx.smoke(c, 26, radius / 2.5); W.fx.sparks(c, 40); W.fx.dust(c, "#868e96", 20, 0.4);
    W.fx.ring(c, "#ffd43b", radius * 1.2); W.fx.flash(c.clone().add(new V3(0, 0.5, 0)), "#ffa94d", 60, 0.5);
    BE.audio.explosion(Math.min(1.2, power / 200));
    W.shake(1.2);
    for (const o of objects.slice()) {
      const pos = o.body.position;
      const d = Math.max(0, Math.hypot(pos.x - c.x, pos.y - c.y, pos.z - c.z) - o.radius * 0.6);
      if (d > radius) continue;
      const k = 1 - d / radius;
      const dir = new V3(pos.x - c.x, pos.y - c.y + 0.6, pos.z - c.z).normalize();
      const dv = 2 + 11 * k * (o.body.mass < 2 ? 1.2 : o.body.mass > 15 ? 0.6 : 1);
      o.body.wakeUp();
      o.body.velocity.x += dir.x * dv; o.body.velocity.y += dir.y * dv; o.body.velocity.z += dir.z * dv;
      o.body.angularVelocity.set(R(-8, 8), R(-8, 8), R(-8, 8));
      const hp = new V3(pos.x, pos.y, pos.z).addScaledVector(dir, -o.radius * 0.5);
      W.damage(o, power * k * R(0.8, 1.1), hp, dir, src, 2 + 6 * k);
    }
    W.blast(c, radius * 1.4, 13);
    for (const d of dyn) if (d.body && d.body.mass > 0) { const p = d.body.position, dd = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z); if (dd < radius) { const dir = new V3(p.x - c.x, p.y - c.y + 0.5, p.z - c.z).normalize(); const k = (1 - dd / radius) * 10; d.body.velocity.x += dir.x * k; d.body.velocity.y += dir.y * k; d.body.velocity.z += dir.z * k; } }
    emit("explode", c, src);
  };

  /* ---------- extra moving things (projectiles, tool bodies) ---------- */
  W.addDyn = function (mesh, body, opts) {
    const d = Object.assign({ mesh, body, born: W.simT, life: 15 }, opts || {});
    if (mesh) { scene.add(mesh); ents.add(mesh); }
    if (body) world.addBody(body);
    dyn.push(d);
    return d;
  };
  W.removeDyn = function (d) {
    const i = dyn.indexOf(d); if (i < 0) return;
    dyn.splice(i, 1);
    if (d.body) world.removeBody(d.body);
    if (d.mesh) retire(d.mesh);
    d.dead = true;
  };
  W.addBody = (b) => world.addBody(b);
  W.removeBody = (b) => world.removeBody(b);

  /* ---------- picking ---------- */
  const ndc = new THREE.Vector2();
  W.ray = function (cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  };
  W.pick = function (cx, cy) {
    W.ray(cx, cy);
    const meshes = [];
    for (const o of objects) o.inner.traverse((m) => { if (m.isMesh) meshes.push(m); });
    const hits = raycaster.intersectObjects(meshes.concat(W.envPick), false);
    if (hits.length) {
      const h = hits[0];
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new V3(0, 1, 0);
      return { obj: h.object.userData.obj || null, point: h.point.clone(), normal: n, ray: raycaster.ray.clone() };
    }
    const p = new V3();
    if (raycaster.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), 0), p) && Math.abs(p.x) < 5 && p.z > -4 && p.z < 3) return { obj: null, point: p, normal: new V3(0, 1, 0), ray: raycaster.ray.clone() };
    return { obj: null, point: null, ray: raycaster.ray.clone() };
  };

  /* ---------- camera ---------- */
  const cam = { p: new V3(0, 3.5, 7.8), l: new V3(0, 0.75, -0.7), tp: new V3(0, 3.5, 7.8), tl: new V3(0, 0.75, -0.7), fov: 50, tfov: 50 };
  let shakeAmt = 0;
  W.focus = new V3(0, 0.5, -1);
  // camera distance adapts to the stage shape so the whole room stays in view
  function fitScale(fov, halfW) { const a = camera.aspect || 1.6; const D = halfW / (Math.tan((fov * Math.PI) / 360) * a); return Math.min(2.2, Math.max(1, D / 7.6)); }
  const at = (look, off, k) => [[look[0] + off[0] * k, look[1] + off[1] * k, look[2] + off[2] * k], look];
  const VIEWS = {
    normal: () => { const f = W.tall ? 60 : 52, k = fitScale(f, W.tall ? 3.4 : 4.5); return [...at([0, 0.5, -1.3], [0, 2.4, 7.2], k), f]; },
    close: () => { const f = W.focus; const k = W.tall ? 1.5 : 1; return [[f.x * 0.85, f.y + 0.7 * k, f.z + 1.8 * k], [f.x, f.y + 0.05, f.z], 48]; },
    top: () => { const f = W.tall ? 60 : 52, k = fitScale(f, W.tall ? 3.6 : 5.2) * 0.85; return [...at([0, 0, -0.8], [0, 9, 3], k), f]; },
    left: () => { const f = W.tall ? 64 : 52, k = Math.min(1.5, fitScale(f, 3.6)); return [...at([0.4, 0.7, -0.9], [-7.6, 2.9, 5.7], k), f]; },
    right: () => { const f = W.tall ? 64 : 52, k = Math.min(1.5, fitScale(f, 3.6)); return [...at([-0.4, 0.7, -0.9], [7.6, 2.9, 5.7], k), f]; }
  };
  W.VIEWS = Object.keys(VIEWS);
  W.setView = function (name, snap) {
    W.view = VIEWS[name] ? name : "normal";
    const [p, l, f] = VIEWS[W.view]();
    cam.tp.set(...p); cam.tl.set(...l); cam.tfov = f;
    if (snap) { cam.p.copy(cam.tp); cam.l.copy(cam.tl); cam.fov = f; }
  };
  W.shake = (a) => { if (W.shakeOn) shakeAmt = Math.min(1.4, Math.max(shakeAmt, a)); };
  function updateCamera(dt) {
    if (W.view === "close") { const [p, l] = VIEWS.close(); cam.tp.set(...p); cam.tl.set(...l); }
    const k = 1 - Math.exp(-4 * dt);
    cam.p.lerp(cam.tp, k); cam.l.lerp(cam.tl, k); cam.fov += (cam.tfov - cam.fov) * k;
    camera.position.copy(cam.p);
    if (shakeAmt > 0.002) { camera.position.add(rv(0.07 * shakeAmt)); shakeAmt *= Math.exp(-7 * dt); }
    camera.lookAt(cam.l);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); W.resizeParticles(); }
  }
  W.resizeParticles = function () { const h = renderer.domElement.height; const s = h / (2 * Math.tan((camera.fov * Math.PI) / 360)); pNorm.mat.uniforms.scale.value = pAdd.mat.uniforms.scale.value = s; };

  /* ---------- replay of the last destruction ---------- */
  const frames = [];
  let recT = 0;
  function record() {
    if (W.simT - recT < 1 / 30) return;
    recT = W.simT;
    const refs = [], data = [];
    for (const m of ents) {
      if (!m.visible || m.userData.frozenAt) continue;
      refs.push(m);
      data.push(m.position.x, m.position.y, m.position.z, m.quaternion.x, m.quaternion.y, m.quaternion.z, m.quaternion.w, m.scale.x, m.scale.y, m.scale.z);
    }
    frames.push({ t: W.simT, refs, data: new Float32Array(data), pn: pNorm.snap(), pa: pAdd.snap() });
    while (frames.length && W.simT - frames[0].t > BUF) frames.shift();
  }
  let rp = null;
  W.canReplay = () => !!(W.lastBreak && frames.length > 5 && W.simT - W.lastBreak.t < BUF - 1);
  W.replay = function () {
    if (!W.canReplay() || rp) return false;
    const t0 = Math.max(frames[0].t, W.lastBreak.t - 0.9), t1 = Math.min(frames[frames.length - 1].t, W.lastBreak.t + 2.4);
    const saved = new Map();
    for (const m of ents) saved.set(m, { p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone(), v: m.visible });
    rp = { t: t0, t0, t1, saved, focus: W.lastBreak.point.clone(), view: W.view, fi: 0 };
    W.replaying = true;
    emit("replay", true);
    return true;
  };
  W.stopReplay = function () {
    if (!rp) return;
    for (const [m, s] of rp.saved) { m.position.copy(s.p); m.quaternion.copy(s.q); m.scale.copy(s.s); m.visible = s.v; }
    for (const m of ents) if (!rp.saved.has(m)) m.visible = true;
    pNorm.clear(); pAdd.clear();
    rp = null; W.replaying = false;
    W.setView(W.view);
    emit("replay", false);
  };
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  function replayStep(dt) {
    rp.t += dt * 0.38;
    if (rp.t >= rp.t1) { W.stopReplay(); return; }
    while (rp.fi < frames.length - 2 && frames[rp.fi + 1].t <= rp.t) rp.fi++;
    const A = frames[rp.fi], B = frames[Math.min(frames.length - 1, rp.fi + 1)];
    const a = B.t > A.t ? Math.min(1, Math.max(0, (rp.t - A.t) / (B.t - A.t))) : 0;
    const idxB = new Map(); B.refs.forEach((m, i) => idxB.set(m, i));
    for (const m of ents) {
      const fz = m.userData.frozenAt, rt = m.userData.retiredAt, s = rp.saved.get(m);
      if (fz && rp.t >= fz && (rt == null || rp.t < rt) && s) { m.visible = true; m.position.copy(s.p); m.quaternion.copy(s.q); m.scale.copy(s.s); }
      else m.visible = false;
    }
    A.refs.forEach((m, i) => {
      const d = A.data, o = i * 10;
      m.visible = true;
      m.position.set(d[o], d[o + 1], d[o + 2]); qa.set(d[o + 3], d[o + 4], d[o + 5], d[o + 6]); m.scale.set(d[o + 7], d[o + 8], d[o + 9]);
      const j = idxB.get(m);
      if (j != null && a > 0) { const e = B.data, p = j * 10; m.position.lerp(tmpV.set(e[p], e[p + 1], e[p + 2]), a); qb.set(e[p + 3], e[p + 4], e[p + 5], e[p + 6]); qa.slerp(qb, a); }
      m.quaternion.copy(qa);
    });
    pNorm.show(A.pn); pAdd.show(A.pa);
    // slow cinematic orbit around the break
    const k = (rp.t - rp.t0) / Math.max(0.1, rp.t1 - rp.t0), ang = -0.7 + k * 1.4, f = rp.focus;
    const dist = W.tall ? 4.2 : 3.2;
    cam.p.set(f.x + Math.sin(ang) * dist, f.y + 1.3, f.z + Math.cos(ang) * dist); cam.l.copy(f);
    camera.position.copy(cam.p); camera.lookAt(cam.l);
  }

  /* ---------- main loop ---------- */
  function updateObjects(sdt) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i], b = o.body;
      o.group.position.copy(b.position); o.group.quaternion.copy(b.quaternion);
      if (b.position.y < -2 || Math.abs(b.position.x) > 8 || b.position.z > 8) { W.removeObj(o); continue; }
      let sx = 1 + o.crush * 0.18, sy = 1 - o.crush * 0.55;
      if (o.wob > 0.01) { const w = Math.sin(W.simT * 26) * o.wob * 0.1; sx *= 1 + w * 0.6; sy *= 1 - w; o.wob *= Math.exp(-3.5 * sdt); }
      if (o.mainMat === "inflatable") { const st = 1 + (1 - o.hp / o.maxHp) * 0.12; sx *= st; sy *= st; }
      if (o.squashY) sy *= o.squashY;
      let sz = sx;
      if (o.squashX) sx *= o.squashX, sz /= Math.sqrt(o.squashX);
      o.inner.scale.set(sx, sy, sz);
    }
  }
  function applyForces() {
    for (const o of objects) if (o.floaty && !o.held) o.body.applyForce(new CANNON.Vec3(0, o.body.mass * 9.1, 0));
    emit("forces");
  }
  W.frame = function (dt) {
    if (rp) { replayStep(dt); fxStep(dt); renderer.render(scene, camera); emit("frame", dt, 0); return; }
    const sdt = W.paused ? 0 : dt * (W.slow ? 0.3 : 1);
    W.simT += sdt;
    emit("pre", sdt, dt);
    acc += sdt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      applyForces();
      world.step(STEP);
      processImpacts();
      while (afterStep.length) afterStep.shift()();
      acc -= STEP; steps++;
    }
    if (steps === 5) acc = 0;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= W.simT) { const t = timers.splice(i, 1)[0]; t.fn(); }
    updateObjects(sdt);
    updateFrags();
    for (let i = dyn.length - 1; i >= 0; i--) {
      const d = dyn[i];
      if (d.body && d.mesh && d.sync !== false) { d.mesh.position.copy(d.body.position); d.mesh.quaternion.copy(d.body.quaternion); }
      if (d.update) d.update(sdt, d);
      if (!d.dead && (W.simT - d.born > d.life || (d.body && d.body.position.y < -2))) W.removeDyn(d);
    }
    pNorm.update(sdt); pAdd.update(sdt);
    fxStep(sdt);
    cleanGraveyard();
    if (sdt > 0) record();
    emit("frame", dt, sdt);
    updateCamera(dt);
    renderer.render(scene, camera);
  };
  function fxStep(dt) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i]; f.t += dt;
      const k = Math.min(1, f.t / f.dur); f.up(k);
      if (k >= 1) { fxList.splice(i, 1); f.done && f.done(); }
    }
  }
  W.start = function () {
    lastT = performance.now();
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.max(0, Math.min((now - lastT) / 1000, 0.05));
      lastT = now;
      W.frame(dt);
    };
    requestAnimationFrame(loop);
  };
  W.render = () => renderer.render(scene, camera);
  W.canvas = () => renderer.domElement;
})();
