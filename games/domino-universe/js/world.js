/* ============ DOMINO UNIVERSE — 3D world, physics simulation, camera, effects, replay ============ */
(function () {
  "use strict";
  const D = window.DOM;
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const TAU = Math.PI * 2;
  const R = (a, b) => a + Math.random() * (b - a);
  const W = (D.world = {});
  let renderer, scene, camera, envGroup, objGroup, ghostGroup, fxPoints, sun;
  const hooks = {};
  W.on = (n, f) => (hooks[n] = hooks[n] || []).push(f);
  const emit = (n, ...a) => (hooks[n] || []).forEach((f) => f(...a));
  W.con = { env: "table", dominoes: [], objects: [] };
  W.mode = "edit";
  W.settings = { gravity: 2.6, speed: 1, slow: false, fx: { sparks: true, recolour: false, confetti: true, flash: true } };

  /* =========================================================
     TEXTURES & MATERIALS
     ========================================================= */
  function ctex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const TEX = {
    pips: ctex(128, 256, (x) => {
      x.fillStyle = "#1d1d1f"; x.fillRect(0, 0, 128, 256);
      x.fillStyle = "#f8f9fa"; x.fillRect(14, 126, 100, 4);
      const dot = (cx, cy) => { x.beginPath(); x.arc(cx, cy, 10, 0, TAU); x.fill(); };
      [[64, 64]].forEach(([a, b]) => dot(a, b)); [[34, 34], [94, 94]].forEach(([a, b]) => dot(a, b));
      [[34, 160], [94, 160], [64, 192], [34, 224], [94, 224]].forEach(([a, b]) => dot(a, b));
    }),
    wood: ctex(256, 256, (x) => { x.fillStyle = "#c58b52"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { x.strokeStyle = "rgba(90,50,20," + (0.08 + rnd() * 0.25) + ")"; x.lineWidth = 1 + rnd() * 2.5; const y = rnd() * 256; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(90, y + rnd() * 10 - 5, 170, y + rnd() * 10 - 5, 256, y); x.stroke(); } }),
    hazard: ctex(128, 256, (x) => { x.fillStyle = "#fd7e14"; x.fillRect(0, 0, 128, 256); x.fillStyle = "#212529"; for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(128, i * 32 - 64); x.lineTo(128, i * 32 - 48); x.lineTo(0, i * 32 + 16); x.fill(); } x.fillStyle = "#fff"; x.font = "bold 64px sans-serif"; x.textAlign = "center"; x.fillText("💥", 64, 150); }),
    bolt: ctex(128, 256, (x) => { x.fillStyle = "#fcc419"; x.fillRect(0, 0, 128, 256); x.strokeStyle = "#e67700"; x.lineWidth = 8; x.strokeRect(8, 8, 112, 240); x.font = "bold 90px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("⚡", 64, 130); }),
    magnet: ctex(128, 256, (x) => { x.fillStyle = "#e03131"; x.fillRect(0, 0, 128, 256); x.fillStyle = "#dee2e6"; x.fillRect(0, 0, 128, 50); x.fillRect(0, 206, 128, 50); x.fillStyle = "#fff"; x.font = "bold 48px sans-serif"; x.textAlign = "center"; x.fillText("N", 64, 120); x.fillText("S", 64, 180); })
  };
  const GROUND_TEX = {
    table: () => ctex(512, 512, (x) => { for (let r = 0; r < 4; r++) { x.fillStyle = ["#b07a45", "#a8703f", "#b98450", "#a6743f"][r]; x.fillRect(0, r * 128, 512, 127); for (let i = 0; i < 30; i++) { x.strokeStyle = "rgba(80,45,15," + (0.05 + rnd() * 0.15) + ")"; x.lineWidth = 1 + rnd() * 2; const y = r * 128 + rnd() * 128; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(170, y + rnd() * 8 - 4, 340, y + rnd() * 8 - 4, 512, y); x.stroke(); } x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(0, r * 128 + 126, 512, 2); } }, [12, 12]),
    studio: () => ctex(256, 256, (x) => { x.fillStyle = "#e9ecef"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } }, [40, 40]),
    playground: () => ctex(256, 256, (x) => { const c = ["#ffa8a8", "#a5d8ff", "#b2f2bb", "#ffec99"]; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = c[i * 2 + j]; x.fillRect(i * 128, j * 128, 128, 128); } x.strokeStyle = "rgba(0,0,0,0.08)"; x.lineWidth = 4; x.strokeRect(0, 0, 256, 256); }, [30, 30]),
    hall: () => ctex(256, 256, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#cfc6b8" : "#efe9df"; x.fillRect(i * 128, j * 128, 128, 128); } for (let i = 0; i < 200; i++) { x.fillStyle = "rgba(120,110,100,0.06)"; x.fillRect(rnd() * 256, rnd() * 256, rnd() * 30, 1); } }, [30, 30]),
    garden: () => ctex(256, 256, (x) => { x.fillStyle = "#6fae4a"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 2500; i++) { x.fillStyle = rnd() < 0.5 ? "rgba(40,90,20,0.25)" : "rgba(170,220,110,0.25)"; x.fillRect(rnd() * 256, rnd() * 256, 2, 4); } }, [40, 40]),
    neon: () => ctex(256, 256, (x) => { x.fillStyle = "#0b0f24"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(116,143,252,0.45)"; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254); x.strokeStyle = "rgba(240,101,149,0.25)"; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }, [40, 40]),
    floating: () => ctex(256, 256, (x) => { x.fillStyle = "#e8e2d6"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(0,0,0,0.06)"; x.lineWidth = 2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.strokeRect(i * 64 + (j % 2) * 32, j * 64, 64, 64); }, [24, 24]),
    fantasy: () => ctex(256, 256, (x) => { x.fillStyle = "#d8c6ff"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.fillStyle = ["rgba(255,255,255,0.35)", "rgba(255,180,230,0.3)", "rgba(160,220,255,0.3)"][i % 3]; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 4 + rnd() * 14, 0, TAU); x.fill(); } }, [30, 30])
  };

  function neonMat() {
    const m = new THREE.MeshStandardMaterial({ color: "#222", emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.3 });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif"); };
    return m;
  }
  const side = (m) => m;
  function materialsFor(mat) {
    switch (mat) {
      case "classic": { const body = new THREE.MeshStandardMaterial({ color: "#1d1d1f", roughness: 0.25, metalness: 0.05 }); const face = new THREE.MeshStandardMaterial({ map: TEX.pips, roughness: 0.25 }); return [body, body, body, body, face, face]; }
      case "wood": return new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.65 });
      case "plastic": return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 });
      case "gloss": return new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
      case "glass": return new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false });
      case "metal": return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.22, metalness: 0.95 });
      case "neon": return neonMat();
      case "magnet": { const s = new THREE.MeshStandardMaterial({ color: "#c92a2a", metalness: 0.5, roughness: 0.3 }); const f = new THREE.MeshStandardMaterial({ map: TEX.magnet, roughness: 0.35 }); return [s, s, s, s, f, f]; }
      case "boom": { const s = new THREE.MeshStandardMaterial({ color: "#e8590c", roughness: 0.4 }); const f = new THREE.MeshStandardMaterial({ map: TEX.hazard, roughness: 0.4 }); return [s, s, s, s, f, f]; }
      case "trigger": { const s = new THREE.MeshStandardMaterial({ color: "#f59f00", roughness: 0.35 }); const f = new THREE.MeshStandardMaterial({ map: TEX.bolt, emissive: "#3a2a00", roughness: 0.35 }); return [s, s, s, s, f, f]; }
    }
    return new THREE.MeshStandardMaterial({ color: "#fff" });
  }
  void side;

  /* =========================================================
     INIT
     ========================================================= */
  W.init = function (stage) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.prepend(renderer.domElement);
    W.canvas = renderer.domElement;
    scene = W.scene = new THREE.Scene();
    camera = W.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: "#7a7f8a", side: THREE.BackSide })));
    for (const [x, y, z, c] of [[0, 4.9, 0, "#ffffff"], [-9.9, 3, 0, "#fff1dd"], [9.9, 3, 3, "#dde9ff"]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(x ? 0.1 : 8, y > 4 ? 0.1 : 3, x ? 6 : 8), new THREE.MeshBasicMaterial({ color: c })); m.material.color.multiplyScalar(3); m.position.set(x, y, z); es.add(m); }
    scene.environment = pm.fromScene(es, 0.04).texture;
    scene.environmentIntensity = 0.6;
    W.hemi = new THREE.HemisphereLight("#ffffff", "#9a8f80", 0.9); scene.add(W.hemi);
    sun = new THREE.DirectionalLight("#fff4e6", 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    objGroup = new THREE.Group(); scene.add(objGroup);
    ghostGroup = new THREE.Group(); scene.add(ghostGroup);
    initFx();
    new ResizeObserver(() => W.resize()).observe(stage);
    W.stage = stage;
    W.resize();
    initCamera();
    let last = performance.now();
    const loop = () => { requestAnimationFrame(loop); const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; W.frame(dt); };
    requestAnimationFrame(loop);
  };
  W.resize = function () { const r = W.stage.getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); camera.aspect = Math.max(1, r.width) / Math.max(1, r.height); camera.updateProjectionMatrix(); if (fxPoints) fxPoints.material.uniforms.scale.value = r.height / (2 * Math.tan((camera.fov * Math.PI) / 360)); };

  /* ---------- environments ---------- */
  W.setEnv = function (id) {
    const env = D.ENVS.find((e) => e.id === id) || D.ENVS[0];
    W.con.env = env.id; W.env = env;
    if (envGroup) { scene.remove(envGroup); envGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    envGroup = new THREE.Group(); scene.add(envGroup);
    scene.background = new THREE.Color(env.sky); scene.fog = new THREE.Fog(env.fog, 60, 170);
    W.hemi.intensity = env.dark ? 0.25 : 0.9; sun.intensity = env.dark ? 0.6 : 2.2;
    scene.environmentIntensity = env.dark ? 0.25 : 0.6;
    const gm = new THREE.MeshStandardMaterial({ map: GROUND_TEX[env.id](), roughness: env.id === "hall" ? 0.25 : env.id === "neon" ? 0.35 : 0.85, metalness: env.id === "neon" ? 0.3 : 0 });
    const size = env.id === "floating" ? 70 : 300;
    const ground = new THREE.Mesh(env.id === "floating" ? new THREE.CylinderGeometry(size / 2, size / 2 - 6, 6, 64) : new THREE.PlaneGeometry(size, size), gm);
    if (env.id === "floating") { ground.position.y = -3; const rock = new THREE.Mesh(new THREE.ConeGeometry(size / 2 - 6, 26, 24), new THREE.MeshStandardMaterial({ color: "#8c7a66", roughness: 1 })); rock.position.y = -19; rock.rotation.x = Math.PI; envGroup.add(rock); }
    else ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true; envGroup.add(ground);
    W.groundMesh = ground;
    const deco = (geo, mat, x, y, z, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (s) m.scale.setScalar(s); m.castShadow = true; envGroup.add(m); return m; };
    if (env.id === "garden") {
      const leaf = new THREE.MeshStandardMaterial({ color: "#3f8f3a", roughness: 0.9 }), trunk = new THREE.MeshStandardMaterial({ color: "#7a5230" });
      for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU, r = 55 + rnd() * 25, x = Math.cos(a) * r, z = Math.sin(a) * r; deco(new THREE.CylinderGeometry(0.5, 0.7, 4), trunk, x, 2, z); deco(new THREE.SphereGeometry(3.4, 16, 12), leaf, x, 6, z, 0.8 + rnd() * 0.6); }
    } else if (env.id === "neon") {
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = 70; const col = ["#748ffc", "#f06595", "#3bc9db"][i % 3]; deco(new THREE.BoxGeometry(1, 30, 1), new THREE.MeshBasicMaterial({ color: col }), Math.cos(a) * r, 15, Math.sin(a) * r); }
    } else if (env.id === "fantasy") {
      const cm = [new THREE.MeshStandardMaterial({ color: "#b197fc", roughness: 0.1, metalness: 0.2, emissive: "#3b2a80" }), new THREE.MeshStandardMaterial({ color: "#63e6be", roughness: 0.1, emissive: "#0b4a3a" })];
      for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU, r = 50 + rnd() * 30; const m = deco(new THREE.OctahedronGeometry(2 + rnd() * 3), cm[i % 2], Math.cos(a) * r, 3 + rnd() * 6, Math.sin(a) * r); m.scale.y = 2; }
    } else if (env.id === "hall") {
      const pm2 = new THREE.MeshStandardMaterial({ color: "#f1ece4", roughness: 0.6 });
      for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, r = 75; deco(new THREE.CylinderGeometry(1.4, 1.6, 30, 20), pm2, Math.cos(a) * r, 15, Math.sin(a) * r); }
    } else if (env.id === "playground") {
      const cols = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c"];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, r = 60 + rnd() * 20; deco(new THREE.SphereGeometry(3, 20, 16), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.4 }), Math.cos(a) * r, 3, Math.sin(a) * r); }
    } else if (env.id === "floating") {
      const iz = new THREE.MeshStandardMaterial({ color: "#a5d07a", roughness: 1 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, r = 80 + rnd() * 30; const m = deco(new THREE.CylinderGeometry(6, 3, 5, 12), iz, Math.cos(a) * r, -6 + rnd() * 14, Math.sin(a) * r); m.scale.setScalar(0.6 + rnd()); }
      const cloud = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 18; i++) deco(new THREE.SphereGeometry(5, 12, 10), cloud, R(-120, 120), R(-20, -8), R(-120, 120), R(0.8, 2.2));
    }
    emit("env", env);
  };

  /* =========================================================
     DOMINO MESHES (instanced, one batch per type)
     ========================================================= */
  const batches = {};
  const geoCache = {};
  const tmpM = new THREE.Matrix4(), tmpQ = new Q(), tmpQ2 = new Q(), tmpP = new V3(), tmpS = new V3(), tmpC = new THREE.Color();
  const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0);
  function batch(type) {
    if (batches[type.id] && batches[type.id].cap >= W.counts[type.id]) return batches[type.id];
    const old = batches[type.id];
    if (old) { scene.remove(old.mesh); old.mesh.dispose(); }
    const cap = Math.max(64, Math.ceil((W.counts[type.id] || 1) * 1.5));
    const geo = geoCache[type.id] || (geoCache[type.id] = new THREE.BoxGeometry(type.size[0], type.size[1], type.size[2]));
    const mesh = new THREE.InstancedMesh(geo, old ? old.mesh.material : materialsFor(type.mat), cap);
    mesh.castShadow = type.mat !== "glass"; mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.userData.type = type.id;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return (batches[type.id] = { mesh, cap, idx: [] });
  }
  // pose of a domino from its build data
  function pose(d, outP, outQ) {
    const t = D.typeById(d.type), s = d.scale || 1;
    tmpQ.setFromAxisAngle(YAX, d.a || 0);
    if (d.lying) { tmpQ2.setFromAxisAngle(XAX, Math.PI / 2); outQ.copy(tmpQ).multiply(tmpQ2); outP.set(d.x, (d.y || 0) + (t.size[2] * s) / 2, d.z); }
    else { outQ.copy(tmpQ); outP.set(d.x, (d.y || 0) + (t.size[1] * s) / 2, d.z); }
  }
  W.pose = pose;
  W.colorOf = (d) => { const t = D.typeById(d.type); return t.mat === "classic" || t.mat === "wood" || t.mat === "boom" || t.mat === "trigger" || t.mat === "magnet" ? "#ffffff" : d.color || t.color; };
  W.rebuild = function () {
    const list = W.con.dominoes;
    W.counts = {};
    for (const d of list) W.counts[d.type] = (W.counts[d.type] || 0) + 1;
    for (const id in batches) if (!W.counts[id]) { batches[id].mesh.count = 0; batches[id].idx = []; }
    for (const t of D.TYPES) if (W.counts[t.id]) { const b = batch(t); b.mesh.count = 0; b.idx = []; }
    list.forEach((d, i) => {
      const b = batches[d.type], k = b.mesh.count++;
      b.idx.push(i); d._b = b; d._k = k;
      pose(d, tmpP, tmpQ); const s = d.scale || 1;
      tmpM.compose(tmpP, tmpQ, tmpS.set(s, s, s));
      b.mesh.setMatrixAt(k, tmpM);
      b.mesh.setColorAt(k, tmpC.set(d.sel ? "#ffe066" : W.colorOf(d)));
    });
    for (const id in batches) { const m = batches[id].mesh; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    W.buildObjects();
    fitShadow();
    emit("rebuilt", list.length);
  };
  W.recolour = function (i, col) { const d = W.con.dominoes[i]; if (!d || !d._b) return; d._b.mesh.setColorAt(d._k, tmpC.set(col)); d._b.mesh.instanceColor.needsUpdate = true; };
  function fitShadow() {
    let minX = -8, maxX = 8, minZ = -8, maxZ = 8;
    for (const d of W.con.dominoes) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minZ = Math.min(minZ, d.z); maxZ = Math.max(maxZ, d.z); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, half = Math.min(80, Math.max(maxX - minX, maxZ - minZ) / 2 + 6);
    sun.position.set(cx + 18, 40, cz + 22); sun.target.position.set(cx, 0, cz);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 140 });
    sun.shadow.camera.updateProjectionMatrix();
    W.bounds = { cx, cz, half };
  }

  /* =========================================================
     MACHINE PARTS (visual + physics)
     ========================================================= */
  const OM = {
    wood: new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.6 }),
    stone: new THREE.MeshStandardMaterial({ color: "#ced4da", roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: "#495057", roughness: 0.5, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: "#adb5bd", roughness: 0.25, metalness: 0.9 }),
    red: new THREE.MeshPhysicalMaterial({ color: "#e03131", roughness: 0.3, clearcoat: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: "#fcc419", roughness: 0.25, metalness: 0.8 }),
    ball: new THREE.MeshPhysicalMaterial({ color: "#4dabf7", roughness: 0.2, clearcoat: 1 }),
    ch: [null, "#ff6b6b", "#4dabf7", "#51cf66"].map((c) => c && new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.25 }))
  };
  const dirOf = (a) => new V3(Math.sin(a || 0), 0, Math.cos(a || 0));
  const latOf = (a) => new V3(Math.cos(a || 0), 0, -Math.sin(a || 0));
  // static boxes and the like, described once and used for both the picture and the physics
  function partsOf(o) {
    const P = [], a = o.a || 0, dir = dirOf(a), lat = latOf(a), q = new Q().setFromAxisAngle(YAX, a);
    const at = (along, y, across) => new V3(o.x, 0, o.z).addScaledVector(dir, along).addScaledVector(lat, across || 0).setY(y);
    const box = (c, sx, sy, sz, mat, extra) => P.push(Object.assign({ k: "box", c, s: [sx, sy, sz], q: q.clone(), mat }, extra || {}));
    switch (o.kind) {
      case "ramp": {
        const plat = o.plat || 3, len = o.len || 6, h = 1.2, L = Math.hypot(len, h), ang = Math.atan2(h, len);
        box(at(-plat / 2, h / 2, 0), 1.6, h, plat, OM.stone, { swap: true });
        const qs = q.clone().multiply(new Q().setFromAxisAngle(XAX, ang));
        const c = at(len / 2, h / 2, 0).add(new V3(0, -0.1 * Math.cos(ang), 0)).addScaledVector(dir, -0.1 * Math.sin(ang));
        P.push({ k: "box", c, s: [1.6, 0.2, L], q: qs, mat: OM.wood });
        for (const s of [-1, 1]) P.push({ k: "box", c: c.clone().addScaledVector(lat, s * 0.85).setY(c.y + 0.12), s: [0.1, 0.25, L], q: qs, mat: OM.dark });
        break;
      }
      case "stairs": case "bridge": {
        const n = o.steps || 4, deck = o.deck || 0;
        for (let i = 0; i < n; i++) { const h = (i + 1) * 0.25; box(at(i * 0.6 + 0.3, h / 2, 0), 1.2, h, 0.6, OM.stone); }
        if (deck) { const h = n * 0.25; box(at(n * 0.6 + deck / 2, h / 2, 0), 1.2, h, deck, OM.wood); }
        if (o.kind === "bridge") { const ds = n * 0.6 + deck; for (let j = 0; j < n - 1; j++) { const h = (n - 1 - j) * 0.25; box(at(ds + j * 0.6 + 0.3, h / 2, 0), 1.2, h, 0.6, OM.stone); } }
        break;
      }
      case "block": box(at(0, 0.15, 0), 1, 0.3, 1, OM.stone); break;
      case "switch": box(at(0, 0.03, 0), 0.8, 0.06, 0.8, OM.ch[o.channel || 1], { sensor: "switch" }); box(at(0, 0.01, 0), 1, 0.02, 1, OM.dark, { noPhys: true }); break;
      case "bell": { const y = o.y || 1.2; P.push({ k: "cyl", c: at(0, (y - 0.3) / 2, 0), s: [0.06, y - 0.3], q, mat: OM.dark }); P.push({ k: "sphere", c: at(0, y, 0), s: [0.38], q, mat: OM.gold, sensor: "bell" }); break; }
      case "pendulum": { const L = o.len || 2.4, top = L + 0.6; P.push({ k: "cyl", c: at(-0.9, top / 2, 0.9), s: [0.08, top], q, mat: OM.dark }); box(at(-0.45, top, 0.45), 0.1, 0.1, 1.4, OM.dark, { noPhys: true, q: new Q().setFromAxisAngle(YAX, a - Math.PI / 4) }); break; }
      case "seesaw": case "lever": P.push({ k: "box", c: at(o.kind === "lever" ? -(o.len || 3) * 0.25 : 0, 0.25, 0), s: [0.5, 0.5, 0.3], q, mat: OM.dark }); break;
      case "spinner": case "slider": P.push({ k: "cyl", c: at(0, 0.35, 0), s: [0.18, 0.7], q, mat: OM.dark, noPhys: o.kind === "slider" }); break;
    }
    return P;
  }
  function meshOf(p) {
    const g = p.k === "box" ? new THREE.BoxGeometry(...p.s) : p.k === "cyl" ? new THREE.CylinderGeometry(p.s[0], p.s[0], p.s[1], 16) : new THREE.SphereGeometry(p.s[0], 24, 16);
    const m = new THREE.Mesh(g, p.mat); m.position.copy(p.c); m.quaternion.copy(p.q); m.castShadow = m.receiveShadow = true;
    return m;
  }
  // the moving bits of each machine, made fresh for every run
  function dynamicOf(o) {
    const a = o.a || 0, dir = dirOf(a), lat = latOf(a), q = new Q().setFromAxisAngle(YAX, a);
    const at = (along, y, across) => new V3(o.x, 0, o.z).addScaledVector(dir, along).addScaledVector(lat, across || 0).setY(y);
    switch (o.kind) {
      case "ball": return [{ k: "sphere", r: 0.35, mass: 2.2, c: new V3(o.x, (o.y || 0) + 0.35, o.z), mat: OM.ball }];
      case "block": return [{ k: "box", s: [0.75, 0.75, 0.75], mass: 3, c: at(0, 0.3 + 0.375, 0), q, mat: OM.red }];
      case "seesaw": return [{ k: "box", s: [0.8, 0.12, o.len || 4], mass: 1.5, c: at(0, 0.56, 0), q, mat: OM.wood, hinge: at(0, 0.5, 0) }];
      case "lever": { const L = o.len || 3; return [{ k: "box", s: [0.7, 0.12, L], mass: 1.2, c: at(0, 0.56, 0), q, mat: OM.wood, hinge: at(-L * 0.25, 0.5, 0) }]; }
      case "pendulum": { const L = o.len || 2.4, top = L + 0.6, piv = at(0, top, 0); const held = piv.clone().addScaledVector(dir, -Math.sin(1.2) * L).setY(top - Math.cos(1.2) * L); return [{ k: "sphere", r: 0.38, mass: 5, c: held, mat: OM.steel, pivot: piv, held: true, channel: o.channel || 1 }]; }
      case "spinner": { const L = o.len || 3; return [{ k: "box", s: [0.22, 0.25, L], mass: 0, kin: true, c: at(0, 0.55, 0), q: new Q().setFromAxisAngle(YAX, a + 0.9), mat: OM.red, spin: o.dir || 1, channel: o.channel || 1 }]; }
      case "slider": return [{ k: "box", s: [1.6, 1, 0.3], mass: 0, kin: true, c: at(0, 0.5, 0), q, mat: OM.red, slide: lat, channel: o.channel || 1 }];
    }
    return [];
  }
  W.buildObjects = function () {
    while (objGroup.children.length) { const m = objGroup.children.pop(); m.traverse((x) => x.geometry && x.geometry.dispose()); }
    W.pickables = [W.groundMesh];
    W.con.objects.forEach((o, i) => {
      const g = new THREE.Group(); g.userData.obj = i;
      for (const p of partsOf(o)) { const m = meshOf(p); m.userData.obj = i; g.add(m); if (p.k === "box" && !p.sensor && !p.noPhys) W.pickables.push(m); }
      if (W.mode === "edit") for (const p of dynamicOf(o)) { const m = p.k === "sphere" ? meshOf({ k: "sphere", s: [p.r], c: p.c, q: new Q(), mat: p.mat }) : meshOf({ k: "box", s: p.s, c: p.c, q: p.q, mat: p.mat }); m.userData.obj = i; g.add(m); if (p.pivot) g.add(rope(p.pivot, p.c)); }
      if (o.sel) g.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.emissive = new THREE.Color("#ffd43b"); m.material.emissiveIntensity = 0.5; } });
      objGroup.add(g);
    });
  };
  function rope(a, b) { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#343a40" })); l.userData.rope = true; return l; }

  /* =========================================================
     SIMULATION
     ========================================================= */
  let phys = null;
  W.sim = null;
  W.startSim = function () {
    if (W.mode === "sim") return;
    W.mode = "sim";
    const env = W.env, g = 9.82 * W.settings.gravity;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -g, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.solver.iterations = 14; world.solver.tolerance = 1e-4;
    const mDom = new CANNON.Material("domino"), mGround = new CANNON.Material("ground");
    world.defaultContactMaterial.friction = 0.4; world.defaultContactMaterial.restitution = 0.05;
    // cannon caps friction by mass, not by contact force, so any domino-on-domino friction
    // glues a leaning domino to the next one and the chain stalls. The floor keeps real friction.
    world.addContactMaterial(new CANNON.ContactMaterial(mDom, mDom, { friction: 0, restitution: 0.02, contactEquationStiffness: 3e7, contactEquationRelaxation: 3 }));
    world.addContactMaterial(new CANNON.ContactMaterial(mDom, mGround, { friction: env.friction, restitution: 0.02, contactEquationStiffness: 3e7, contactEquationRelaxation: 3 }));
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: mGround });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    if (env.id === "floating") ground.position.y = 0;
    world.addBody(ground);
    const sim = (W.sim = { world, bodies: [], dyn: [], t: 0, fallen: 0, total: W.con.dominoes.length, order: 0, started: false, idle: 0, frames: [], recT: 0, done: false, channels: {}, bell: false, pushes: 0 });
    const vec = (v) => new CANNON.Vec3(v.x, v.y, v.z);
    // static parts of machines
    W.con.objects.forEach((o, oi) => {
      for (const p of partsOf(o)) {
        if (p.noPhys) continue;
        const shape = p.k === "box" ? new CANNON.Box(new CANNON.Vec3(p.s[0] / 2, p.s[1] / 2, p.s[2] / 2)) : p.k === "cyl" ? new CANNON.Cylinder(p.s[0], p.s[0], p.s[1], 12) : new CANNON.Sphere(p.s[0]);
        const b = new CANNON.Body({ mass: 0, shape, material: mGround });
        b.position.copy(vec(p.c)); b.quaternion.set(p.q.x, p.q.y, p.q.z, p.q.w);
        b.aabbNeedsUpdate = true; b.updateAABB(); // static bodies keep a stale box at the origin otherwise
        if (p.sensor) { b.userData = { sensor: p.sensor, obj: o }; b.addEventListener("collide", (e) => { if (e.body.mass > 0) sensorHit(p.sensor, o, b); }); }
        world.addBody(b);
      }
    });
    // dominoes
    const q = new Q(), pp = new V3();
    W.con.dominoes.forEach((d, i) => {
      const t = D.typeById(d.type), s = d.scale || 1;
      const he = new CANNON.Vec3((t.size[0] * s) / 2, (t.size[1] * s) / 2, (t.size[2] * s) / 2);
      const b = new CANNON.Body({ mass: t.size[0] * t.size[1] * t.size[2] * s * s * s * t.density * 6, shape: new CANNON.Box(he), material: mDom, linearDamping: 0.01, angularDamping: 0.05 });
      pose(d, pp, q);
      b.position.set(pp.x, pp.y + 0.001, pp.z); b.quaternion.set(q.x, q.y, q.z, q.w);
      b.allowSleep = true; b.sleepSpeedLimit = 0.07; b.sleepTimeLimit = 0.35;
      b.aabbNeedsUpdate = true; b.updateAABB();
      b.sleep();
      b.userData = { i, t };
      b.q0 = q.clone(); b.p0 = pp.clone();
      b.addEventListener("collide", (e) => onDominoHit(b, e));
      // toppling starts very slowly; don't let a touched domino doze off before it actually falls
      b.addEventListener("wakeup", () => { if (!b.fallen) b.allowSleep = false; });
      world.addBody(b);
      sim.bodies.push(b);
    });
    // a spatial grid so moving things can wake their neighbours *before* they touch:
    // a sleeping body acts like a wall at the moment of impact, which would eat the momentum
    sim.grid = new Map();
    sim.bodies.forEach((bd, i) => { const k = Math.floor(bd.position.x) + "," + Math.floor(bd.position.z); let c = sim.grid.get(k); if (!c) sim.grid.set(k, (c = [])); c.push(i); });
    // moving parts of machines
    W.con.objects.forEach((o) => {
      for (const p of dynamicOf(o)) {
        const shape = p.k === "sphere" ? new CANNON.Sphere(p.r) : new CANNON.Box(new CANNON.Vec3(p.s[0] / 2, p.s[1] / 2, p.s[2] / 2));
        const b = new CANNON.Body({ mass: p.held || p.kin ? 0 : p.mass, shape, material: mDom, angularDamping: p.k === "sphere" ? 0.1 : 0.3, linearDamping: 0.02 });
        if (p.kin) b.type = CANNON.Body.KINEMATIC;
        b.position.copy(vec(p.c)); if (p.q) b.quaternion.set(p.q.x, p.q.y, p.q.z, p.q.w);
        b.aabbNeedsUpdate = true; b.updateAABB();
        // balls, blocks and planks stay awake: a sleeping body would act like a wall when first hit
        b.allowSleep = false;
        world.addBody(b);
        const mesh = p.k === "sphere" ? meshOf({ k: "sphere", s: [p.r], c: p.c, q: new Q(), mat: p.mat }) : meshOf({ k: "box", s: p.s, c: p.c, q: p.q, mat: p.mat });
        objGroup.add(mesh);
        const dd = { body: b, mesh, p, o };
        if (p.hinge) { const pivot = new CANNON.Body({ mass: 0 }); pivot.position.copy(vec(p.hinge)); pivot.collisionResponse = false; world.addBody(pivot); const local = new CANNON.Vec3(); b.pointToLocalFrame(vec(p.hinge), local); const axis = new CANNON.Vec3(); b.vectorToLocalFrame(vec(latOf(o.a)), axis); world.addConstraint(new CANNON.HingeConstraint(b, pivot, { pivotA: local, axisA: axis, pivotB: new CANNON.Vec3(0, 0, 0), axisB: vec(latOf(o.a)) })); }
        if (p.pivot) { dd.rope = rope(p.pivot, p.c); objGroup.add(dd.rope); }
        sim.dyn.push(dd);
      }
    });
    // in sim mode the static machine meshes stay; editor-only previews of moving parts go
    objGroup.children.forEach((g) => g.children && g.children.forEach((m) => { if (m.userData.rope) m.visible = false; }));
    hideEditorMovers();
    W.hideGhosts(true);
    phys = world;
    recordFrame(true);
    emit("sim", true);
  };
  function hideEditorMovers() {
    // the editor shows balls & pendulums in place; in a run the physics copies replace them
    objGroup.children.forEach((g) => { if (!g.isGroup) return; const kinds = W.con.objects[g.userData.obj]; if (!kinds) return; const n = partsOf(kinds).length; g.children.forEach((m, k) => { if (k >= n) m.visible = false; }); });
  }
  W.stopSim = function () {
    if (W.mode !== "sim") return;
    W.mode = "edit"; W.sim = null; phys = null; W.replaying = null;
    W.rebuild();
    W.hideGhosts(false);
    clearFx();
    emit("sim", false);
  };
  W.reset = function () { if (W.mode === "sim") { W.stopSim(); } };
  // knock a domino over: push the top along its facing direction, away from the camera
  W.push = function (i, dirSign) {
    const sim = W.sim; if (!sim) return false;
    const b = sim.bodies[i]; if (!b) return false;
    const d = W.con.dominoes[i], t = D.typeById(d.type), s = d.scale || 1;
    const f = dirOf(d.a);
    let sgn = dirSign;
    if (!sgn) { const cd = new V3(); camera.getWorldDirection(cd); sgn = cd.dot(f) >= 0 ? 1 : -1; }
    b.wakeUp();
    const top = new CANNON.Vec3(0, 0, 0); b.pointToWorldFrame(new CANNON.Vec3(0, (t.size[1] * s) / 2 * 0.9, 0), top);
    const imp = b.mass * 0.75 * Math.sqrt(W.settings.gravity) * sgn;
    // cannon wants the point relative to the body's centre
    b.applyImpulse(new CANNON.Vec3(f.x * imp, 0, f.z * imp), new CANNON.Vec3(top.x - b.position.x, top.y - b.position.y, top.z - b.position.z));
    sim.started = true; sim.pushes++;
    D.audio.play("push");
    fxBurst(new V3(top.x, top.y, top.z), "#ffffff", 10, 2);
    return true;
  };
  W.pushAt = function (i) { return W.push(i, 0); };
  function sensorHit(kind, o, b) {
    const sim = W.sim; if (!sim) return;
    if (kind === "switch") activate(o.channel || 1, new V3(b.position.x, 0.2, b.position.z));
    if (kind === "bell" && !sim.bell) { sim.bell = true; D.audio.play("bell"); fxBurst(new V3(b.position.x, b.position.y, b.position.z), "#ffd43b", 60, 5); emit("bell"); }
  }
  function activate(ch, at) {
    const sim = W.sim; if (!sim || sim.channels[ch]) return;
    sim.channels[ch] = true; sim.channelsChanged = true;
    D.audio.play("trigger");
    if (at) fxBurst(at, ["", "#ff6b6b", "#4dabf7", "#51cf66"][ch] || "#ffd43b", 40, 4);
    for (const dd of sim.dyn) {
      if ((dd.p.channel || 1) !== ch) continue;
      if (dd.p.held) { const b = dd.body; b.type = CANNON.Body.DYNAMIC; b.mass = dd.p.mass; b.updateMassProperties(); const piv = new CANNON.Body({ mass: 0 }); piv.position.set(dd.p.pivot.x, dd.p.pivot.y, dd.p.pivot.z); sim.world.addBody(piv); sim.world.addConstraint(new CANNON.DistanceConstraint(b, piv, dd.p.pivot.distanceTo(dd.p.c))); b.wakeUp(); dd.p.held = false; }
      if (dd.p.spin) dd.spinning = true;
      if (dd.p.slide) dd.sliding = 0;
    }
    emit("activate", ch);
  }
  W.activate = activate;
  function onDominoHit(b, e) {
    const sim = W.sim; if (!sim) return;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v < 0.35) return;
    const now = sim.t;
    if (now - (b.lastClick || -1) < 0.06) return;
    b.lastClick = now;
    D.audio.click(b.userData.t.sound, Math.min(1, v / 4));
  }

  W.stepSim = function (dt) {
    const sim = W.sim; if (!sim || W.replaying) return;
    const sdt = dt * W.settings.speed * (W.settings.slow ? 0.3 : 1);
    sim.t += sdt;
    // machines with motors
    for (const dd of sim.dyn) {
      if (dd.spinning) { dd.body.angularVelocity.set(0, 3.2 * dd.p.spin, 0); }
      if (dd.sliding != null) { dd.sliding += sdt; const v = Math.cos(dd.sliding * 1.6) * 2.5; dd.body.velocity.set(dd.p.slide.x * v, 0, dd.p.slide.z * v); }
    }
    // magnetic dominoes pull on each other once moving
    for (const b of sim.bodies) if (b.userData.t.id === "magnet" && b.sleepState !== CANNON.Body.SLEEPING) for (const c of sim.bodies) { if (c === b || c.userData.t.id !== "magnet") continue; const dx = b.position.x - c.position.x, dz = b.position.z - c.position.z, d2 = dx * dx + dz * dz; if (d2 < 9 && d2 > 0.05) { c.wakeUp(); const f = 12 * c.mass / d2; c.applyForce(new CANNON.Vec3((dx / Math.sqrt(d2)) * f, 0, (dz / Math.sqrt(d2)) * f)); } }
    wakeNeighbours(sim);
    sim.world.step(1 / 120, sdt, 10);
    // sync visuals, spot newly fallen dominoes
    let awake = 0, cx = 0, cz = 0, cy = 0;
    const list = W.con.dominoes;
    for (const b of sim.bodies) {
      if (b.sleepState === CANNON.Body.SLEEPING && b.synced) continue;
      b.synced = b.sleepState === CANNON.Body.SLEEPING;
      const d = list[b.userData.i];
      tmpP.set(b.position.x, b.position.y, b.position.z); tmpQ.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      const s = d.scale || 1;
      tmpM.compose(tmpP, tmpQ, tmpS.set(s, s, s));
      d._b.mesh.setMatrixAt(d._k, tmpM); d._b.dirty = true;
      if (b.sleepState !== CANNON.Body.SLEEPING) { awake++; cx += tmpP.x; cy += tmpP.y; cz += tmpP.z; }
      if (!b.fallen) {
        const ang = 2 * Math.acos(Math.min(1, Math.abs(tmpQ.dot(b.q0))));
        if (ang > 0.5 || tmpP.distanceTo(b.p0) > 0.45) { b.fallen = true; b.fallT = sim.t; sim.fallen++; sim.order++; onFallen(b, d, sim.order); }
      } else if (!b.allowSleep && sim.t - b.fallT > 1.5) b.allowSleep = true;
      if (!b.fallen && !b.allowSleep && sim.t - (b.wokeT || (b.wokeT = sim.t)) > 6) {
        // touched but still upright after a long time: it's settled, let it rest
        b.allowSleep = true;
      }
    }
    for (const id in batches) if (batches[id].dirty) { batches[id].mesh.instanceMatrix.needsUpdate = true; batches[id].dirty = false; }
    for (const dd of sim.dyn) {
      dd.mesh.position.copy(dd.body.position); dd.mesh.quaternion.copy(dd.body.quaternion);
      if (dd.body.sleepState !== CANNON.Body.SLEEPING && dd.body.mass > 0) { awake++; cx += dd.mesh.position.x; cy += dd.mesh.position.y; cz += dd.mesh.position.z; }
      if (dd.rope) { const a = dd.rope.geometry.attributes.position; a.setXYZ(1, dd.mesh.position.x, dd.mesh.position.y, dd.mesh.position.z); a.needsUpdate = true; }
    }
    sim.awake = awake;
    if (awake) { const k = 1 - Math.exp(-3 * dt); sim.focus = sim.focus || new V3(cx / awake, cy / awake, cz / awake); sim.focus.lerp(tmpP.set(cx / awake, cy / awake, cz / awake), k); }
    recordFrame(false);
    // finished?
    if (sim.started && !sim.done) {
      // finished once nothing new has toppled for a while (resting piles can jiggle forever)
      if (sim.fallen !== sim.lastFallen || sim.channelsChanged) { sim.lastFallen = sim.fallen; sim.channelsChanged = false; sim.quietT = 0; }
      else sim.quietT = (sim.quietT || 0) + sdt;
      const motors = sim.dyn.some((dd) => dd.spinning || dd.sliding != null || (dd.body.mass > 0 && dd.body.sleepState !== CANNON.Body.SLEEPING && dd.body.velocity.length() > 0.3));
      if ((awake === 0 && sim.quietT > 0.6) || (sim.quietT > 2.5 && !motors) || sim.quietT > 6 || (sim.fallen === sim.total && sim.quietT > 0.8)) { sim.done = true; finished(); }
    }
  };
  function wakeNeighbours(sim) {
    const movers = [];
    for (const b of sim.bodies) if (b.sleepState !== CANNON.Body.SLEEPING && (b.velocity.lengthSquared() > 0.01 || b.angularVelocity.lengthSquared() > 0.04)) movers.push(b);
    for (const dd of sim.dyn) if (dd.body.mass > 0 || dd.spinning || dd.sliding != null) if (dd.body.velocity.lengthSquared() > 0.01 || dd.body.angularVelocity.lengthSquared() > 0.04) movers.push(dd.body);
    for (const m of movers) {
      const r = m.boundingRadius + 1.1, x0 = Math.floor(m.position.x - r), x1 = Math.floor(m.position.x + r), z0 = Math.floor(m.position.z - r), z1 = Math.floor(m.position.z + r);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const c = sim.grid.get(gx + "," + gz); if (!c) continue;
        for (const i of c) { const o = sim.bodies[i]; if (o === m || o.sleepState !== CANNON.Body.SLEEPING || o.fallen) continue; const dx = o.position.x - m.position.x, dz = o.position.z - m.position.z, dy = o.position.y - m.position.y; if (dx * dx + dz * dz + dy * dy < r * r) o.wakeUp(); }
      }
    }
  }
  function onFallen(b, d, order) {
    const fx = W.settings.fx, p = new V3(b.position.x, b.position.y, b.position.z), t = b.userData.t;
    if (fx.recolour) W.recolour(b.userData.i, D.hsl((order % 120) / 120));
    if (t.mat === "neon") { fxBurst(p, W.colorOf(d), 14, 2.5); if (fx.flash) W.recolour(b.userData.i, "#ffffff"), setTimeout(() => W.recolour(b.userData.i, W.colorOf(d)), 180); }
    else if (fx.sparks && order % 3 === 0) fxBurst(p, "#fff3bf", 4, 1.4);
    if (t.id === "trigger") activate(d.channel || 1, p);
    if (t.id === "boom") setTimeout(() => explode(p), 120);
    emit("fallen", W.sim.fallen, W.sim.total);
  }
  function explode(p) {
    const sim = W.sim; if (!sim) return;
    D.audio.play("boom");
    fxBurst(p, "#ffa94d", 70, 7); fxBurst(p, "#fff3bf", 40, 5);
    for (const b of sim.bodies.concat(sim.dyn.map((dd) => dd.body))) {
      if (b.mass === 0) continue;
      const dx = b.position.x - p.x, dz = b.position.z - p.z, dist = Math.hypot(dx, dz);
      if (dist > 2.6 || dist < 0.01) continue;
      const k = (1 - dist / 2.6) * 4 * b.mass;
      b.wakeUp(); b.applyImpulse(new CANNON.Vec3((dx / dist) * k, k * 0.8, (dz / dist) * k), new CANNON.Vec3(0, 0.2, 0));
    }
  }
  function finished() {
    const sim = W.sim;
    if (W.settings.fx.confetti && sim.fallen / sim.total > 0.98) { const f = sim.focus || new V3(); for (let i = 0; i < 4; i++) setTimeout(() => fxBurst(f.clone().add(new V3(R(-3, 3), 2, R(-3, 3))), ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc"][i % 5], 60, 6, true), i * 180); D.audio.play("fanfare"); }
    emit("done", { fallen: sim.fallen, total: sim.total, bell: sim.bell, time: sim.t, pushes: sim.pushes });
  }

  /* ---------- replay ---------- */
  function recordFrame(force) {
    const sim = W.sim; if (!sim) return;
    if (!force && sim.t - sim.recT < 1 / 30) return;
    sim.recT = sim.t;
    const data = [];
    sim.bodies.forEach((b, i) => { if (force || b.sleepState !== CANNON.Body.SLEEPING || !b.recSynced) { b.recSynced = b.sleepState === CANNON.Body.SLEEPING; data.push(i, b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); } });
    sim.dyn.forEach((dd, j) => data.push(-1 - j, dd.body.position.x, dd.body.position.y, dd.body.position.z, dd.body.quaternion.x, dd.body.quaternion.y, dd.body.quaternion.z, dd.body.quaternion.w));
    if (sim.frames.length < 20000) sim.frames.push({ t: sim.t, data: new Float32Array(data), focus: sim.focus ? sim.focus.clone() : null });
  }
  W.canReplay = () => !!(W.sim && W.sim.frames.length > 10 && W.sim.started);
  W.replay = function () {
    if (!W.canReplay()) return false;
    W.replaying = { i: 0, t: 0, speed: 0.5 };
    emit("replay", true);
    return true;
  };
  W.stopReplay = function () { if (!W.replaying) return; W.replaying = null; applyFrame(W.sim.frames.length - 1, true); emit("replay", false); };
  function applyFrame(upto, full) {
    const sim = W.sim, list = W.con.dominoes;
    const from = full ? 0 : W.replaying.applied + 1;
    for (let f = from; f <= upto; f++) {
      const d = sim.frames[f].data;
      for (let k = 0; k < d.length; k += 8) {
        const i = d[k];
        tmpP.set(d[k + 1], d[k + 2], d[k + 3]); tmpQ.set(d[k + 4], d[k + 5], d[k + 6], d[k + 7]);
        if (i >= 0) { const dm = list[i], s = dm.scale || 1; tmpM.compose(tmpP, tmpQ, tmpS.set(s, s, s)); dm._b.mesh.setMatrixAt(dm._k, tmpM); dm._b.dirty = true; }
        else { const dd = sim.dyn[-1 - i]; dd.mesh.position.copy(tmpP); dd.mesh.quaternion.copy(tmpQ); }
      }
    }
    if (W.replaying) W.replaying.applied = upto;
    for (const id in batches) if (batches[id].dirty) { batches[id].mesh.instanceMatrix.needsUpdate = true; batches[id].dirty = false; }
  }
  function replayStep(dt) {
    const rp = W.replaying, frames = W.sim.frames;
    if (rp.applied == null) { rp.applied = -1; applyFrame(0, true); rp.applied = 0; }
    rp.t += dt * rp.speed;
    let i = rp.applied;
    while (i < frames.length - 1 && frames[i + 1].t <= rp.t) i++;
    if (i > rp.applied) applyFrame(i, false);
    const f = frames[i].focus;
    if (f) { cam.target.lerp(f, 1 - Math.exp(-2.5 * dt)); cam.yaw += dt * 0.25; cam.dist += (7 - cam.dist) * dt; cam.pitch += (0.42 - cam.pitch) * dt; }
    if (i >= frames.length - 1) W.stopReplay();
  }

  /* =========================================================
     GHOSTS (gap markers in levels) & editing previews
     ========================================================= */
  W.setGhosts = function (list) {
    while (ghostGroup.children.length) ghostGroup.children.pop();
    W.ghosts = list || [];
    for (const g of W.ghosts) {
      const t = D.typeById(g.type);
      const m = new THREE.Mesh(new THREE.BoxGeometry(...t.size), new THREE.MeshBasicMaterial({ color: "#ffd43b", transparent: true, opacity: 0.35, depthWrite: false }));
      pose(g, m.position, m.quaternion);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: "#ffd43b" }));
      m.add(edge);
      g._mesh = m; m.visible = !g.filled;
      ghostGroup.add(m);
    }
  };
  W.hideGhosts = (h) => { ghostGroup.visible = !h; };
  W.refreshGhosts = () => { for (const g of W.ghosts || []) if (g._mesh) g._mesh.visible = !g.filled; };
  // translucent preview of what you're about to place
  let preview = null;
  W.preview = function (list) {
    if (preview) { scene.remove(preview); preview.dispose(); preview = null; }
    if (!list || !list.length) return;
    const t = D.typeById(list[0].type);
    preview = new THREE.InstancedMesh(new THREE.BoxGeometry(...t.size), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45, depthWrite: false }), list.length);
    list.forEach((d, k) => { pose(d, tmpP, tmpQ); const s = d.scale || 1; tmpM.compose(tmpP, tmpQ, tmpS.set(s, s, s)); preview.setMatrixAt(k, tmpM); preview.setColorAt(k, tmpC.set(d.bad ? "#ff6b6b" : W.colorOf(d))); });
    preview.instanceColor.needsUpdate = true;
    scene.add(preview);
  };

  /* =========================================================
     PICKING
     ========================================================= */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  W.ndc = (cx, cy) => { const r = W.canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); return ndc; };
  // where on a surface would a domino stand?
  W.pickSurface = function (cx, cy) {
    ray.setFromCamera(W.ndc(cx, cy), camera);
    const hits = ray.intersectObjects(W.pickables || [], false);
    for (const h of hits) {
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : YAX;
      if (n.y > 0.8) return { x: h.point.x, y: h.object === W.groundMesh ? 0 : h.point.y, z: h.point.z };
    }
    const p = new V3();
    return ray.ray.intersectPlane(new THREE.Plane(YAX, 0), p) ? { x: p.x, y: 0, z: p.z } : null;
  };
  W.pickDomino = function (cx, cy) {
    ray.setFromCamera(W.ndc(cx, cy), camera);
    const meshes = Object.values(batches).map((b) => b.mesh).filter((m) => m.count > 0);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return -1;
    return batches[hit.object.userData.type].idx[hit.instanceId];
  };
  W.pickObject = function (cx, cy) {
    ray.setFromCamera(W.ndc(cx, cy), camera);
    const hit = ray.intersectObjects(objGroup.children, true)[0];
    return hit && hit.object.userData.obj != null ? hit.object.userData.obj : -1;
  };
  W.project = function (x, y, z) { const v = new V3(x, y, z).project(camera); const r = W.canvas.getBoundingClientRect(); return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height, v.z]; };

  /* =========================================================
     CAMERA: orbit, pan, zoom, presets, follow, first person
     ========================================================= */
  const cam = (W.cam = { target: new V3(0, 0, 0), yaw: 0.6, pitch: 0.75, dist: 22, view: "orbit", fp: 0 });
  function initCamera() { W.frameAll(true); }
  W.frameAll = function (snap) {
    const b = W.bounds || { cx: 0, cz: 0, half: 10 };
    cam.target.set(b.cx, 0, b.cz); cam.dist = Math.max(10, b.half * 2.1); cam.view = "orbit";
    if (snap) applyCam(1);
  };
  W.setView = function (v) {
    const b = W.bounds || { cx: 0, cz: 0, half: 10 };
    cam.view = v;
    if (v === "top") { cam.pitch = 1.5; cam.target.set(b.cx, 0, b.cz); cam.dist = Math.max(12, b.half * 2.4); }
    else if (v === "side") { cam.pitch = 0.18; cam.target.set(b.cx, 0.6, b.cz); cam.dist = Math.max(10, b.half * 1.8); }
    else if (v === "orbit") W.frameAll();
  };
  W.orbit = (dx, dy) => { cam.yaw -= dx * 0.006; cam.pitch = Math.max(0.05, Math.min(1.53, cam.pitch + dy * 0.005)); if (cam.view === "top" || cam.view === "side") cam.view = "orbit"; };
  W.pan = (dx, dy) => { const s = cam.dist * 0.0016, f = new V3(Math.sin(cam.yaw), 0, Math.cos(cam.yaw)), r = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)); cam.target.addScaledVector(r, -dx * s).addScaledVector(f, -dy * s); };
  W.zoom = (k) => { cam.dist = Math.max(2.5, Math.min(160, cam.dist * k)); };
  W.moveKeys = (fx, fz, dt) => { const f = new V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), r = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)); cam.target.addScaledVector(f, fz * dt * cam.dist * 0.8).addScaledVector(r, fx * dt * cam.dist * 0.8); };
  const camPos = new V3(), camLook = new V3();
  function applyCam(k) {
    const sim = W.sim;
    let wantPos, wantLook;
    if ((cam.view === "follow" || cam.view === "first") && sim && sim.focus) {
      cam.target.lerp(sim.focus, 1 - Math.exp(-3 * k));
      if (cam.view === "first") { const f = sim.focus; wantLook = f.clone().setY(0.4); wantPos = f.clone().add(new V3(Math.sin(cam.yaw) * 3.2, 0.9, Math.cos(cam.yaw) * 3.2)); }
    }
    if (!wantPos) {
      wantLook = cam.target.clone();
      wantPos = cam.target.clone().add(new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist));
    }
    if (k >= 1) { camPos.copy(wantPos); camLook.copy(wantLook); } else { camPos.lerp(wantPos, 1 - Math.exp(-10 * k)); camLook.lerp(wantLook, 1 - Math.exp(-10 * k)); }
    camera.position.copy(camPos); camera.lookAt(camLook);
  }

  /* =========================================================
     PARTICLES
     ========================================================= */
  const MAXP = 3000;
  let P;
  function initFx() {
    P = { n: 0, pos: new Float32Array(MAXP * 3), vel: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), max: new Float32Array(MAXP), size: new Float32Array(MAXP), grav: new Float32Array(MAXP) };
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P.pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(P.col, 3)); g.setAttribute("size", new THREE.BufferAttribute(P.size, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { scale: { value: 400 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: "attribute float size; varying vec3 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }",
      fragmentShader: "varying vec3 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d); if(r>0.25) discard; gl_FragColor=vec4(vC*smoothstep(0.25,0.0,r)*1.6,1.0); }" });
    fxPoints = new THREE.Points(g, m); fxPoints.frustumCulled = false; scene.add(fxPoints);
  }
  function fxBurst(p, col, n, speed, confetti) {
    tmpC.set(col);
    for (let i = 0; i < n && P.n < MAXP; i++) {
      const k = P.n++;
      P.pos.set([p.x, p.y, p.z], k * 3);
      const a = R(0, TAU), u = R(-1, 1), r = Math.sqrt(1 - u * u), s = R(0.3, 1) * speed;
      P.vel.set([Math.cos(a) * r * s, Math.abs(u) * s + (confetti ? 3 : 1), Math.sin(a) * r * s], k * 3);
      const c = confetti ? new THREE.Color().setHSL(Math.random(), 0.9, 0.6) : tmpC;
      P.col.set([c.r, c.g, c.b], k * 3);
      P.life[k] = P.max[k] = R(0.5, confetti ? 2.4 : 1.1); P.size[k] = confetti ? 0.14 : R(0.05, 0.12); P.grav[k] = confetti ? 3 : 9;
    }
  }
  W.fxBurst = fxBurst;
  function updateFx(dt) {
    for (let k = 0; k < P.n; k++) {
      P.life[k] -= dt;
      if (P.life[k] <= 0) { const j = --P.n; for (const [arr, w] of [[P.pos, 3], [P.vel, 3], [P.col, 3]]) for (let q = 0; q < w; q++) arr[k * w + q] = arr[j * w + q]; P.life[k] = P.life[j]; P.max[k] = P.max[j]; P.size[k] = P.size[j]; P.grav[k] = P.grav[j]; k--; continue; }
      P.vel[k * 3 + 1] -= P.grav[k] * dt;
      const dr = Math.exp(-1.5 * dt); P.vel[k * 3] *= dr; P.vel[k * 3 + 2] *= dr;
      P.pos[k * 3] += P.vel[k * 3] * dt; P.pos[k * 3 + 1] = Math.max(0.02, P.pos[k * 3 + 1] + P.vel[k * 3 + 1] * dt); P.pos[k * 3 + 2] += P.vel[k * 3 + 2] * dt;
      const f = P.life[k] / P.max[k]; if (f < 0.3) for (let q = 0; q < 3; q++) P.col[k * 3 + q] *= 0.9;
    }
    const g = fxPoints.geometry; g.setDrawRange(0, P.n); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
  }
  function clearFx() { P.n = 0; }

  /* =========================================================
     FRAME
     ========================================================= */
  W.frame = function (dt) {
    if (W.replaying) replayStep(dt);
    else if (W.sim) W.stepSim(dt);
    updateFx(dt * (W.settings.slow ? 0.3 : 1));
    emit("frame", dt);
    applyCam(dt);
    renderer.render(scene, camera);
  };
  W.render = () => renderer.render(scene, camera);
  W.screenshot = () => renderer.domElement.toDataURL("image/png");
})();
