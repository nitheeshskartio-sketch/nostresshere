/* ============ BREAK EVERYTHING — materials, objects and how they break ============
   Every object is a set of parts. Each part has its own material, and each
   material breaks its own way (glass shards, ceramic chunks, wooden planks,
   plastic dents, cardboard sheets, inflatable pops). */
(function () {
  "use strict";
  const BE = (window.BE = window.BE || {});
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- textures drawn in code ---------- */
  function tex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  }
  BE.tex = {
    wood: tex(256, 256, (x) => { x.fillStyle = "#b07a45"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.strokeStyle = "rgba(80,45,15," + R(0.1, 0.35) + ")"; x.lineWidth = R(1, 3); const y = R(0, 256); x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(90, y + R(-8, 8), 170, y + R(-8, 8), 256, y); x.stroke(); } }),
    cardboard: tex(256, 256, (x) => { x.fillStyle = "#c8a165"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { x.fillStyle = "rgba(90,60,20," + R(0.03, 0.1) + ")"; x.fillRect(R(0, 256), R(0, 256), 2, 2); } x.fillStyle = "rgba(230,200,140,0.7)"; x.fillRect(110, 0, 36, 256); x.fillStyle = "rgba(60,40,20,0.55)"; x.font = "bold 26px sans-serif"; x.fillText("FRAGILE", 20, 225); }),
    tile: tex(256, 256, (x) => { x.fillStyle = "#e7f5ff"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "#4dabf7"; x.lineWidth = 10; x.strokeRect(20, 20, 216, 216); x.fillStyle = "#4dabf7"; for (const [a, b] of [[128, 60], [60, 128], [196, 128], [128, 196]]) { x.beginPath(); x.arc(a, b, 22, 0, 7); x.fill(); } }),
    keys: tex(256, 96, (x) => { x.fillStyle = "#2b2d31"; x.fillRect(0, 0, 256, 96); x.fillStyle = "#e9ecef"; for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) x.fillRect(6 + c * 17.8, 6 + r * 22, 14, 18); }),
    clock: tex(256, 256, (x) => { x.fillStyle = "#fff"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#212529"; x.font = "bold 30px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.fillText(i, 128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); } x.lineWidth = 8; x.lineCap = "round"; x.strokeStyle = "#212529"; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 60); x.moveTo(128, 128); x.lineTo(180, 128); x.stroke(); }),
    screen: tex(256, 160, (x) => { const g = x.createLinearGradient(0, 0, 256, 160); g.addColorStop(0, "#1c7ed6"); g.addColorStop(1, "#7048e8"); x.fillStyle = g; x.fillRect(0, 0, 256, 160); x.fillStyle = "rgba(255,255,255,0.85)"; x.font = "bold 36px sans-serif"; x.textAlign = "center"; x.fillText("NO SIGNAL", 128, 92); }),
    tnt: tex(256, 128, (x) => { x.fillStyle = "#e03131"; x.fillRect(0, 0, 256, 128); x.fillStyle = "#212529"; x.fillRect(0, 10, 256, 8); x.fillRect(0, 110, 256, 8); x.fillStyle = "#fff"; x.font = "bold 54px sans-serif"; x.textAlign = "center"; x.fillText("TNT", 64, 84); x.fillText("TNT", 192, 84); }),
    frosting: tex(128, 128, (x) => { x.fillStyle = "#fff0f6"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 60; i++) { x.fillStyle = pick(["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc"]); x.fillRect(R(0, 128), R(0, 128), 6, 2); } })
  };

  /* ---------- materials: how each one looks, weighs and breaks ---------- */
  const MATERIALS = {
    glass: { name: "Glass", density: 900, hp: 8, thr: 1.8, frag: "shards", n: [14, 30], sound: "glass", look: (c) => new THREE.MeshPhysicalMaterial({ color: c || "#d0ebff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide }) },
    ceramic: { name: "Ceramic", density: 1100, hp: 16, thr: 2.4, frag: "chunks", n: [7, 14], crack: true, dust: "#f1f3f5", sound: "ceramic", look: (c) => new THREE.MeshPhysicalMaterial({ color: c || "#f8f9fa", roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2 }) },
    wood: { name: "Wood", density: 450, hp: 45, thr: 3.6, frag: "planks", n: [5, 9], crack: true, dust: "#c8955c", sound: "wood", look: (c) => new THREE.MeshStandardMaterial({ map: BE.tex.wood, color: c || "#ffffff", roughness: 0.75 }) },
    plastic: { name: "Plastic", density: 500, hp: 30, thr: 3.2, frag: "chunks", n: [4, 7], dent: true, sound: "plastic", look: (c) => new THREE.MeshStandardMaterial({ color: c || "#4dabf7", roughness: 0.35, metalness: 0 }) },
    cardboard: { name: "Cardboard", density: 120, hp: 22, thr: 3, frag: "sheets", n: [5, 9], crush: true, dust: "#d9b77e", sound: "cardboard", look: (c) => new THREE.MeshStandardMaterial({ map: BE.tex.cardboard, color: c || "#ffffff", roughness: 0.95 }) },
    inflatable: { name: "Inflatable", density: 25, hp: 18, thr: 5.5, frag: "scraps", n: [5, 9], squish: true, pop: true, sound: "pop", look: (c) => new THREE.MeshPhysicalMaterial({ color: c || "#ff6b6b", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }) },
    cake: { name: "Cake", density: 300, hp: 10, thr: 2, frag: "crumbs", n: [10, 18], dust: "#fff0f6", sound: "squish", look: (c) => new THREE.MeshStandardMaterial({ color: c || "#ffc9de", roughness: 0.8 }) },
    metal: { name: "Metal", density: 3000, hp: 120, thr: 7, frag: "chunks", n: [3, 5], sound: "metal", look: (c) => new THREE.MeshStandardMaterial({ color: c || "#adb5bd", roughness: 0.3, metalness: 0.8 }) }
  };
  BE.MATERIALS = MATERIALS;

  /* ---------- part builders ---------- */
  // part: { k: "box"|"cyl"|"sphere"|"lathe"|"torus"|"cone", d: dims, p: [x,y,z], r: [rx,ry,rz], m: material, c: colour, map, noPhys }
  const box = (w, h, d, p, m, c, extra) => Object.assign({ k: "box", d: [w, h, d], p, m, c }, extra);
  const cyl = (rt, rb, h, p, m, c, extra) => Object.assign({ k: "cyl", d: [rt, rb, h], p, m, c }, extra);
  const sph = (r, p, m, c, extra) => Object.assign({ k: "sphere", d: [r], p, m, c }, extra);
  const lathe = (pts, p, m, c, extra) => Object.assign({ k: "lathe", d: pts, p, m, c }, extra);
  const torus = (r, t, p, m, c, extra) => Object.assign({ k: "torus", d: [r, t], p, m, c, noPhys: true }, extra);

  /* ---------- the collection ---------- */
  const O = [
    // Glass
    ["bottle", "glass", "Glass Bottle", "🍾", () => [lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.065, 0.2], [0.03, 0.27], [0.022, 0.33], [0.025, 0.34]], [0, 0, 0], "glass", "#69db7c")]],
    ["glass", "glass", "Drinking Glass", "🥛", () => [lathe([[0, 0], [0.045, 0], [0.05, 0.01], [0.055, 0.15], [0.05, 0.15], [0.045, 0.012]], [0, 0, 0], "glass")]],
    ["gplate", "glass", "Glass Plate", "🍽️", () => [cyl(0.16, 0.12, 0.02, [0, 0.01, 0], "glass", "#a5d8ff")]],
    ["window", "glass", "Glass Window", "🪟", () => [box(0.9, 0.7, 0.02, [0, 0.46, 0], "glass", "#e7f5ff"), box(1, 0.06, 0.06, [0, 0.07, 0], "wood"), box(1, 0.06, 0.06, [0, 0.85, 0], "wood"), box(0.06, 0.78, 0.06, [-0.47, 0.46, 0], "wood"), box(0.06, 0.78, 0.06, [0.47, 0.46, 0], "wood"), box(0.08, 0.04, 0.34, [-0.4, 0.02, 0], "wood"), box(0.08, 0.04, 0.34, [0.4, 0.02, 0], "wood")]],
    ["jar", "glass", "Glass Jar", "🫙", () => [cyl(0.08, 0.08, 0.2, [0, 0.1, 0], "glass", "#fff3bf"), cyl(0.083, 0.083, 0.03, [0, 0.215, 0], "metal", "#e03131")]],
    ["gvase", "glass", "Glass Vase", "🏺", () => [lathe([[0, 0], [0.07, 0], [0.1, 0.1], [0.08, 0.25], [0.045, 0.33], [0.06, 0.4]], [0, 0, 0], "glass", "#d0bfff")]],
    ["bulb", "glass", "Light Bulb", "💡", () => [sph(0.07, [0, 0.13, 0], "glass", "#fff9db"), cyl(0.032, 0.03, 0.06, [0, 0.03, 0], "metal")]],
    ["ornament", "glass", "Glass Ornament", "🔮", () => [sph(0.09, [0, 0.09, 0], "glass", "#f783ac"), cyl(0.02, 0.02, 0.03, [0, 0.19, 0], "metal", "#ffd43b")]],
    // Kitchen
    ["plate", "kitchen", "Ceramic Plate", "🍽️", () => [cyl(0.15, 0.11, 0.025, [0, 0.0125, 0], "ceramic")]],
    ["cup", "kitchen", "Coffee Cup", "☕", () => [cyl(0.05, 0.04, 0.08, [0, 0.04, 0], "ceramic", "#ffc9de"), torus(0.025, 0.007, [0.055, 0.045, 0], "ceramic", "#ffc9de", { r: [0, 0, 0] })]],
    ["bowl", "kitchen", "Bowl", "🥣", () => [lathe([[0, 0], [0.05, 0], [0.11, 0.04], [0.13, 0.09], [0.12, 0.09], [0.1, 0.045], [0.045, 0.012]], [0, 0, 0], "ceramic", "#ffd8a8")]],
    ["mug", "kitchen", "Mug", "🍵", () => [cyl(0.055, 0.055, 0.11, [0, 0.055, 0], "ceramic", "#4dabf7"), torus(0.03, 0.009, [0.065, 0.06, 0], "ceramic", "#4dabf7")]],
    ["pot", "kitchen", "Flower Pot", "🪴", () => [cyl(0.13, 0.09, 0.2, [0, 0.1, 0], "ceramic", "#e8590c"), cyl(0.12, 0.12, 0.02, [0, 0.19, 0], "cake", "#5c3d2e"), sph(0.06, [0, 0.26, 0], "plastic", "#40c057")]],
    ["tile", "kitchen", "Tile", "🔲", () => [box(0.3, 0.02, 0.3, [0, 0.01, 0], "ceramic", "#ffffff", { map: "tile" })]],
    ["container", "kitchen", "Kitchen Container", "🥡", () => [box(0.24, 0.12, 0.18, [0, 0.06, 0], "plastic", "#e7f5ff"), box(0.25, 0.025, 0.19, [0, 0.13, 0], "plastic", "#ff922b")]],
    // Everyday
    ["cardbox", "everyday", "Cardboard Box", "📦", () => [box(0.45, 0.35, 0.4, [0, 0.175, 0], "cardboard")]],
    ["crate", "everyday", "Wooden Box", "🧰", () => [box(0.45, 0.45, 0.45, [0, 0.225, 0], "wood")]],
    ["tub", "everyday", "Plastic Tub", "🪣", () => [cyl(0.16, 0.13, 0.25, [0, 0.125, 0], "plastic", "#ffd43b")]],
    ["robot", "everyday", "Old Toy Robot", "🤖", () => [box(0.18, 0.2, 0.12, [0, 0.17, 0], "plastic", "#adb5bd"), box(0.12, 0.1, 0.1, [0, 0.33, 0], "plastic", "#748ffc"), box(0.05, 0.08, 0.05, [-0.05, 0.04, 0], "plastic", "#495057"), box(0.05, 0.08, 0.05, [0.05, 0.04, 0], "plastic", "#495057")]],
    ["clock", "everyday", "Clock", "🕰️", () => [cyl(0.17, 0.17, 0.05, [0, 0.17, 0], "plastic", "#e03131", { r: [Math.PI / 2, 0, 0] }), cyl(0.15, 0.15, 0.01, [0, 0.17, 0.027], "glass", "#ffffff", { r: [Math.PI / 2, 0, 0], map: "clock" })]],
    ["keyboard", "everyday", "Keyboard", "⌨️", () => [box(0.44, 0.03, 0.15, [0, 0.015, 0], "plastic", "#ffffff", { map: "keys", mapTop: true })]],
    ["speaker", "everyday", "Computer Speaker", "🔊", () => [box(0.14, 0.24, 0.14, [0, 0.12, 0], "plastic", "#343a40"), cyl(0.045, 0.045, 0.01, [0, 0.15, 0.072], "metal", "#868e96", { r: [Math.PI / 2, 0, 0] })]],
    ["figurine", "everyday", "Decorative Owl", "🦉", () => [sph(0.09, [0, 0.09, 0], "ceramic", "#b197fc", { s: [1, 1.2, 0.9] }), sph(0.065, [0, 0.22, 0], "ceramic", "#b197fc"), sph(0.02, [-0.025, 0.23, 0.055], "ceramic", "#ffd43b"), sph(0.02, [0.025, 0.23, 0.055], "ceramic", "#ffd43b")]],
    // Furniture
    ["chair", "furniture", "Wooden Chair", "🪑", () => [box(0.44, 0.05, 0.42, [0, 0.45, 0], "wood"), ...[[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].map(([x, z]) => box(0.05, 0.45, 0.05, [x, 0.225, z], "wood")), box(0.05, 0.5, 0.05, [-0.19, 0.72, -0.18], "wood"), box(0.05, 0.5, 0.05, [0.19, 0.72, -0.18], "wood"), box(0.43, 0.14, 0.03, [0, 0.88, -0.18], "wood")]],
    ["table", "furniture", "Small Table", "🛋️", () => [box(0.8, 0.05, 0.55, [0, 0.55, 0], "wood"), ...[[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]].map(([x, z]) => box(0.05, 0.53, 0.05, [x, 0.265, z], "wood"))]],
    ["stool", "furniture", "Stool", "🪑", () => [cyl(0.18, 0.18, 0.05, [0, 0.47, 0], "wood"), ...[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return box(0.045, 0.45, 0.045, [Math.cos(a) * 0.12, 0.225, Math.sin(a) * 0.12], "wood"); })]],
    ["cabinet", "furniture", "Cabinet", "🗄️", () => [box(0.6, 0.8, 0.4, [0, 0.4, 0], "wood", "#e9ddcf"), box(0.28, 0.7, 0.02, [-0.15, 0.4, 0.21], "wood", "#c8a27a"), box(0.28, 0.7, 0.02, [0.15, 0.4, 0.21], "wood", "#c8a27a")]],
    ["shelf", "furniture", "Shelf", "📚", () => [box(0.7, 0.03, 0.25, [0, 0.015, 0], "wood"), box(0.7, 0.03, 0.25, [0, 0.4, 0], "wood"), box(0.7, 0.03, 0.25, [0, 0.79, 0], "wood"), box(0.03, 0.8, 0.25, [-0.335, 0.4, 0], "wood"), box(0.03, 0.8, 0.25, [0.335, 0.4, 0], "wood")]],
    ["drawers", "furniture", "Drawers", "🧺", () => [box(0.5, 0.6, 0.4, [0, 0.3, 0], "wood", "#d9a066"), ...[0.12, 0.3, 0.48].map((y) => box(0.44, 0.15, 0.02, [0, y, 0.21], "wood", "#f1c27d"))]],
    // Funny
    ["duck", "funny", "Giant Rubber Duck", "🦆", () => [sph(0.34, [0, 0.3, 0], "inflatable", "#ffd43b", { s: [1.3, 0.85, 1] }), sph(0.22, [0.24, 0.66, 0], "inflatable", "#ffd43b"), sph(0.1, [-0.42, 0.42, 0], "inflatable", "#ffd43b", { s: [1, 1.3, 0.8], noPhys: true }), sph(0.09, [0.45, 0.62, 0], "plastic", "#ff922b", { s: [1.5, 0.45, 1.1], noPhys: true }), sph(0.035, [0.38, 0.74, 0.12], "plastic", "#212529", { noPhys: true }), sph(0.035, [0.38, 0.74, -0.12], "plastic", "#212529", { noPhys: true }), sph(0.12, [0.02, 0.36, 0.3], "inflatable", "#fcc419", { s: [1.4, 0.6, 0.4], noPhys: true }), sph(0.12, [0.02, 0.36, -0.3], "inflatable", "#fcc419", { s: [1.4, 0.6, 0.4], noPhys: true })]],
    ["beachball", "funny", "Inflatable Ball", "🏐", () => [sph(0.3, [0, 0.3, 0], "inflatable", "#ff6b6b", { stripes: true })]],
    ["donut", "funny", "Cartoon Donut", "🍩", () => [Object.assign(torus(0.22, 0.12, [0, 0.12, 0], "cake", "#e9a35b", { r: [Math.PI / 2, 0, 0] }), { noPhys: false, phys: ["cyl", 0.34, 0.34, 0.24] }), Object.assign(torus(0.22, 0.09, [0, 0.17, 0], "cake", "#f783ac", { r: [Math.PI / 2, 0, 0] }), { noPhys: true })]],
    ["cake", "funny", "Fake Cake", "🎂", () => [cyl(0.26, 0.26, 0.2, [0, 0.1, 0], "cake", "#ffffff", { map: "frosting" }), cyl(0.18, 0.18, 0.15, [0, 0.27, 0], "cake", "#ffc9de"), cyl(0.012, 0.012, 0.08, [0, 0.39, 0], "plastic", "#4dabf7")]],
    ["tv", "funny", "Dummy TV", "📺", () => [box(0.8, 0.5, 0.25, [0, 0.35, 0], "plastic", "#343a40"), box(0.7, 0.4, 0.02, [0, 0.36, 0.13], "glass", "#ffffff", { map: "screen" }), box(0.3, 0.1, 0.2, [0, 0.05, 0], "plastic", "#212529")]],
    ["balloon", "funny", "Giant Balloon", "🎈", () => [sph(0.35, [0, 0.45, 0], "inflatable", "#cc5de8", { s: [1, 1.15, 1] }), cyl(0.03, 0.01, 0.06, [0, 0.06, 0], "inflatable", "#cc5de8")], { floaty: true }],
    ["tnt", "funny", "TNT Barrel", "🧨", () => [cyl(0.18, 0.18, 0.4, [0, 0.2, 0], "wood", "#ffffff", { map: "tnt" })], { explosive: true }]
  ];
  BE.OBJECTS = O.map(([id, cat, name, icon, parts, extra]) => Object.assign({ id, cat, name, icon, parts }, extra || {}));
  BE.objectById = (id) => BE.OBJECTS.find((o) => o.id === id);
  BE.CATEGORIES = { glass: "🥂 Glass", kitchen: "🍳 Kitchen", everyday: "📦 Everyday", furniture: "🪑 Furniture", funny: "🦆 Funny" };

  /* ---------- crack overlays (stage 1 light, stage 2 heavy) ---------- */
  function drawCracks(x, w, dark, branches) {
    x.strokeStyle = dark ? "rgba(25,20,15,0.85)" : "rgba(255,255,255,0.95)"; x.lineCap = "round";
    const br = (px, py, a, len, lw, d) => {
      if (d > 5 || len < 5) return;
      const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      x.lineWidth = lw; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      br(nx, ny, a + R(-0.5, 0.5), len * 0.78, lw * 0.75, d + 1);
      if (Math.random() < 0.5) br(nx, ny, a + R(-1.3, 1.3), len * 0.55, lw * 0.6, d + 1);
    };
    const cx = R(w * 0.3, w * 0.7), cy = R(w * 0.3, w * 0.7);
    for (let i = 0; i < branches; i++) br(cx, cy, (i / branches) * Math.PI * 2 + R(-0.3, 0.3), R(w * 0.1, w * 0.2), 2.6, 0);
    if (!dark) for (const r of [0.08, 0.17]) { x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; x.lineTo(cx + Math.cos(a) * r * w * R(0.8, 1.2), cy + Math.sin(a) * r * w * R(0.8, 1.2)); } x.stroke(); }
  }
  const crackCache = {};
  // glass: white crack lines used as an emissive map (black = no glow)
  BE.glassCrackTex = function (stage) {
    const k = "g" + stage + "_" + Math.floor(Math.random() * 3);
    if (!crackCache[k]) crackCache[k] = tex(256, 256, (x) => { x.fillStyle = "#000"; x.fillRect(0, 0, 256, 256); drawCracks(x, 256, false, stage === 1 ? 6 : 11); if (stage === 2) drawCracks(x, 256, false, 6); });
    return crackCache[k];
  };
  // opaque materials: base texture (or white) with dark cracks drawn over it
  BE.crackTex = function (baseKey, stage) {
    const k = baseKey + stage + "_" + Math.floor(Math.random() * 3);
    if (!crackCache[k]) {
      const base = baseKey !== "plain" && BE.tex[baseKey];
      crackCache[k] = tex(256, 256, (x) => {
        if (base) x.drawImage(base.image, 0, 0, 256, 256); else { x.fillStyle = "#fff"; x.fillRect(0, 0, 256, 256); }
        drawCracks(x, 256, true, stage === 1 ? 5 : 9); if (stage === 2) { drawCracks(x, 256, true, 6); drawCracks(x, 256, true, 4); }
      });
    }
    return crackCache[k];
  };

  /* ---------- geometry for a part ---------- */
  const stripeTex = tex(256, 128, (x) => { ["#ff6b6b", "#ffffff", "#4dabf7", "#ffffff", "#ffd43b", "#ffffff"].forEach((c, i) => { x.fillStyle = c; x.fillRect(i * 43, 0, 44, 128); }); });
  const seg = (d) => Math.max(1, Math.min(8, Math.ceil(d / 0.06)));
  function partGeometry(p) {
    switch (p.k) {
      case "box": return new THREE.BoxGeometry(p.d[0], p.d[1], p.d[2], seg(p.d[0]), seg(p.d[1]), seg(p.d[2]));
      case "cyl": return new THREE.CylinderGeometry(p.d[0], p.d[1], p.d[2], 28, Math.max(2, seg(p.d[2])));
      case "sphere": return new THREE.SphereGeometry(p.d[0], 28, 20);
      case "lathe": return new THREE.LatheGeometry(p.d.map(([r, y]) => new THREE.Vector2(r, y)), 28);
      case "torus": return new THREE.TorusGeometry(p.d[0], p.d[1], 14, 30);
    }
  }

  /* ---------- build one object: meshes in an inner group + one compound physics body ----------
     opts: { scale, material (override), color } */
  BE.build = function (def, opts) {
    opts = opts || {};
    const scale = opts.scale || 1, override = opts.material || null, color = opts.color || null;
    const group = new THREE.Group(), inner = new THREE.Group();
    group.add(inner);
    const shapes = [];
    let mass = 0;
    const parts = def.parts().map((p) => {
      const m = override && p.m !== "metal" ? override : p.m;
      const mat = MATERIALS[m];
      const look = mat.look(color || (override ? undefined : p.c));
      let baseKey = m === "wood" ? "wood" : m === "cardboard" ? "cardboard" : "plain";
      if (p.map) {
        look.map = BE.tex[p.map]; baseKey = p.map;
        look.color.set(color || "#ffffff");
        if (m === "glass") { look.opacity = 0.95; look.transparent = false; }
      }
      if (p.stripes && !override) { look.map = stripeTex; look.color.set(color || "#ffffff"); baseKey = "stripes"; }
      const geo = partGeometry(p);
      const mesh = new THREE.Mesh(geo, look);
      mesh.castShadow = m !== "glass"; mesh.receiveShadow = true;
      const s = p.s || [1, 1, 1];
      mesh.position.set(p.p[0] * scale, p.p[1] * scale, p.p[2] * scale);
      if (p.r) mesh.rotation.set(p.r[0], p.r[1], p.r[2]);
      mesh.scale.set(s[0] * scale, s[1] * scale, s[2] * scale);
      inner.add(mesh);
      // physics shape
      let vol = 0;
      if (!p.noPhys || p.phys) {
        const k = p.phys ? p.phys[0] : p.k;
        let shape = null, yOff = 0;
        if (k === "box") { shape = new CANNON.Box(new CANNON.Vec3((p.d[0] / 2) * scale * s[0], (p.d[1] / 2) * scale * s[1], (p.d[2] / 2) * scale * s[2])); vol = p.d[0] * p.d[1] * p.d[2] * s[0] * s[1] * s[2]; }
        else if (k === "sphere") { shape = new CANNON.Sphere(p.d[0] * scale * Math.max(...s)); vol = 4.19 * p.d[0] ** 3 * s[0] * s[1] * s[2]; }
        else if (k === "cyl") { const rt = p.phys ? p.phys[1] : p.d[0], rb = p.phys ? p.phys[2] : p.d[1], h = p.phys ? p.phys[3] : p.d[2]; shape = new CANNON.Cylinder(rt * scale, rb * scale, h * scale, 14); vol = 3.14 * ((rt + rb) / 2) ** 2 * h; }
        else if (k === "lathe") { const rmax = Math.max(...p.d.map((q) => q[0])), h = Math.max(...p.d.map((q) => q[1])); shape = new CANNON.Cylinder(rmax * scale, rmax * scale, h * scale, 14); vol = 3.14 * rmax * rmax * h; yOff = (h / 2) * scale; }
        if (shape) {
          const q = new CANNON.Quaternion(); if (p.r && k !== "lathe" && !p.phys) q.setFromEuler(p.r[0], p.r[1], p.r[2]);
          shapes.push({ shape, off: new V3(p.p[0] * scale, p.p[1] * scale + yOff, p.p[2] * scale), q, vol });
        }
      }
      // hollow things weigh much less than their outer volume
      if (m === "glass" || m === "ceramic") vol *= p.k === "box" || (p.k === "cyl" && p.d[2] < 0.05) ? 1 : 0.22;
      if (m === "inflatable") vol *= 0.04;
      if (m === "cardboard") vol *= 0.12;
      if (m === "wood" && p.k === "box" && Math.min(...p.d) > 0.3) vol *= 0.18;
      mass += Math.max(0.03, vol * scale ** 3 * mat.density);
      const part = { def: p, mesh, mat: m, look, baseKey, crack: 0 };
      mesh.userData.part = part;
      return part;
    });
    // centre of mass = volume weighted centre of the shapes, so things tip over naturally
    const com = new V3(); let tv = 0;
    for (const sh of shapes) { const w = Math.max(1e-5, sh.vol); com.addScaledVector(sh.off, w); tv += w; }
    if (tv > 0) com.multiplyScalar(1 / tv);
    inner.position.copy(com).multiplyScalar(-1);
    const body = new CANNON.Body({ mass: 1, linearDamping: 0.04, angularDamping: 0.08 });
    for (const sh of shapes) body.addShape(sh.shape, new CANNON.Vec3(sh.off.x - com.x, sh.off.y - com.y, sh.off.z - com.z), sh.q);
    body.mass = Math.min(60, Math.max(0.05, mass)); body.updateMassProperties();
    if (def.floaty) { body.linearDamping = 0.5; body.angularDamping = 0.5; }
    // size, weakest material and health
    const bb = new THREE.Box3().setFromObject(group), size = new V3(); bb.getSize(size);
    const weak = parts.reduce((a, b) => (MATERIALS[b.mat].hp < MATERIALS[a.mat].hp ? b : a), parts[0]);
    const diag = size.length();
    const hp = MATERIALS[weak.mat].hp * (0.55 + diag * 1.1);
    return {
      group, inner, body, parts, com, size, radius: Math.max(size.x, size.z) / 2, height: size.y,
      hp, maxHp: hp, thr: MATERIALS[weak.mat].thr, scale, def, mainMat: weak.mat,
      explosive: !!def.explosive, floaty: !!def.floaty, crush: 0, wob: 0, stage: 0
    };
  };

  /* =========================================================
     FRAGMENTS — material-specific breakage
     ========================================================= */
  function chunkGeo(sx, sy, sz) {
    const g = new THREE.IcosahedronGeometry(1, 0), a = g.attributes.position;
    // keep shared corners together so chunks stay closed
    const seen = new Map();
    for (let i = 0; i < a.count; i++) {
      const key = a.getX(i).toFixed(3) + a.getY(i).toFixed(3) + a.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, R(0.6, 1.2));
      const k = seen.get(key);
      a.setXYZ(i, a.getX(i) * sx * k, a.getY(i) * sy * k, a.getZ(i) * sz * k);
    }
    g.computeVertexNormals();
    return g;
  }
  function polyShardGeo(s, sides, depth) {
    const sh = new THREE.Shape(), base = R(0, 6);
    for (let i = 0; i < sides; i++) {
      const a = base + (i / sides) * Math.PI * 2 + R(-0.35, 0.35), r = s * R(0.35, 1);
      if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  // Returns [{ mesh, size:[x,y,z], mass, round }]: each fragment's physics box (or sphere) size
  BE.fragments = function (part, worldBox) {
    const mat = MATERIALS[part.mat], size = new V3(); worldBox.getSize(size);
    const dims = [size.x, size.y, size.z].map((d) => Math.max(0.01, d));
    const sorted = dims.slice().sort((a, b) => b - a);
    const vol = dims[0] * dims[1] * dims[2], area = sorted[0] * sorted[1];
    const n = Math.max(3, Math.round(R(mat.n[0], mat.n[1]) * Math.min(2.2, Math.max(0.55, Math.cbrt(vol) * 4))));
    const look = part.look.clone();
    if (part.mat === "glass") { look.transparent = true; look.opacity = 0.55; look.map = null; look.emissiveMap = null; look.emissive && look.emissive.set("#000"); }
    const center = new V3(); worldBox.getCenter(center);
    const out = [];
    for (let i = 0; i < n; i++) {
      let geo, fs, round = false;
      const f = mat.frag;
      if (f === "shards" || (f === "chunks" && part.mat === "ceramic" && Math.random() < 0.7)) {
        const s = Math.max(0.02, Math.sqrt(area / n) * R(0.7, 1.4));
        const depth = part.mat === "glass" ? 0.006 : Math.min(0.016, sorted[2] * 0.6 + 0.004);
        geo = polyShardGeo(s, part.mat === "glass" ? 3 : pick([3, 4, 5]), depth); fs = [s * 1.1, s * 1.1, Math.max(0.012, depth)];
      } else if (f === "planks") {
        const ax = dims.indexOf(sorted[0]);
        const others = [0, 1, 2].filter((k) => k !== ax).sort((a, b) => dims[b] - dims[a]);
        fs = [0, 0, 0];
        const splinter = Math.random() < 0.35;
        fs[ax] = sorted[0] * (splinter ? R(0.15, 0.35) : R(0.3, 0.65));
        fs[others[0]] = Math.max(0.012, Math.min(dims[others[0]], splinter ? R(0.01, 0.02) : R(0.03, 0.1)));
        fs[others[1]] = Math.max(0.012, dims[others[1]] * (splinter ? 0.3 : R(0.5, 0.95)));
        geo = new THREE.BoxGeometry(fs[0], fs[1], fs[2]);
        // jagged split ends
        const a = geo.attributes.position;
        for (let v = 0; v < a.count; v++) { const c = [a.getX(v), a.getY(v), a.getZ(v)]; if (Math.abs(c[ax]) > fs[ax] * 0.49) { c[ax] += Math.sign(c[ax]) * R(-0.4, 0.3) * fs[ax] * 0.5; a.setXYZ(v, c[0], c[1], c[2]); } }
        geo.computeVertexNormals();
      } else if (f === "sheets") {
        const s = Math.sqrt(area / n) * R(0.9, 1.5);
        fs = [s, 0.012, s * R(0.6, 1)]; geo = new THREE.BoxGeometry(fs[0], 0.006, fs[2], 2, 1, 2);
        const a = geo.attributes.position; for (let v = 0; v < a.count; v++) if (a.getX(v) > 0) a.setY(v, a.getY(v) + a.getX(v) * R(0.3, 0.9)); // folded
        geo.computeVertexNormals();
      } else if (f === "scraps") {
        const s = Math.sqrt(area / n) * R(0.5, 1); fs = [s, 0.012, s * 0.7];
        geo = polyShardGeo(s * 0.6, 5, 0.004); geo.rotateX(Math.PI / 2);
      } else if (f === "crumbs") {
        const s = Math.max(0.02, Math.cbrt(vol / n) * R(0.5, 1)); fs = [s, s, s]; round = true;
        geo = chunkGeo(s / 2, s / 2.4, s / 2);
      } else {
        const s = Math.max(0.02, Math.cbrt(vol / n) * R(0.7, 1.2));
        fs = [Math.min(s, dims[0]), Math.min(s * R(0.5, 1), dims[1]), Math.min(s * R(0.6, 1), dims[2])].map((d) => Math.max(0.015, d));
        geo = chunkGeo(fs[0] / 2, fs[1] / 2, fs[2] / 2);
      }
      const mesh = new THREE.Mesh(geo, look);
      mesh.castShadow = part.mat !== "glass"; mesh.receiveShadow = true;
      mesh.position.set(center.x + R(-0.45, 0.45) * dims[0], center.y + R(-0.45, 0.45) * dims[1], center.z + R(-0.45, 0.45) * dims[2]);
      mesh.rotation.set(R(0, 6.3), R(0, 6.3), R(0, 6.3));
      out.push({ mesh, size: fs, mass: Math.max(0.01, fs[0] * fs[1] * fs[2] * mat.density * 0.6), round, mat: part.mat });
    }
    return { list: out, material: look };
  };
})();
