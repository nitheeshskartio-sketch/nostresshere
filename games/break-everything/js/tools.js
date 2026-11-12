/* ============ BREAK EVERYTHING — tools: hit, throw, grab & the big special machines ============ */
(function () {
  "use strict";
  const BE = window.BE, W = BE.world, G = BE.G;
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const UP = new V3(0, 1, 0);

  /* need = objects you must have broken to unlock the tool */
  const TOOLS = [
    { id: "hand", cat: "hand", name: "Grab & Throw", icon: "✋", need: 0, tip: "Drag things around, lift them up and drop them, or fling them at stuff (mouse wheel pushes away)" },
    { id: "hammer", cat: "hit", name: "Hammer", icon: "🔨", need: 0, power: 24, push: 2.2, rate: 0.32, len: 0.45, tip: "Classic. Click or hold to keep smashing" },
    { id: "stick", cat: "hit", name: "Stick", icon: "🥢", need: 0, power: 11, push: 1.8, rate: 0.24, len: 0.7, tip: "A stick. Gentle-ish. Whacky." },
    { id: "bat", cat: "hit", name: "Baseball Bat", icon: "🏏", need: 0, power: 28, push: 5, rate: 0.4, len: 0.8, tip: "Big swing, sends things flying" },
    { id: "glove", cat: "hit", name: "Boxing Glove", icon: "🥊", need: 0, power: 18, push: 7, rate: 0.3, punch: true, tip: "Punch things across the room" },
    { id: "rod", cat: "hit", name: "Metal Rod", icon: "🦯", need: 15, power: 32, push: 3, rate: 0.34, len: 0.9, metal: true, tip: "Clangs nicely" },
    { id: "sledge", cat: "hit", name: "Sledgehammer", icon: "⚒️", need: 60, power: 62, push: 3.5, rate: 0.6, len: 0.85, area: 0.3, tip: "Heavy. Very heavy." },
    { id: "giant", cat: "hit", name: "Giant Hammer", icon: "🎪", need: 110, power: 95, push: 4.5, rate: 0.75, len: 1.25, area: 0.6, tip: "Cartoon-sized. Flattens everything nearby" },
    { id: "wrecking", cat: "hit", name: "Heavy Ball", icon: "⚫", need: 220, rate: 1.4, tip: "A wrecking ball swings through the spot you click" },
    { id: "football", cat: "throw", name: "Football", icon: "⚽", need: 0, r: 0.11, mass: 0.43, speed: 14, mul: 1.2, rest: true, tip: "Throw at the spot you click" },
    { id: "stone", cat: "throw", name: "Stone", icon: "🪨", need: 0, r: 0.065, mass: 1.1, speed: 15, mul: 1.3, tip: "Small, hard, rude" },
    { id: "bowling", cat: "throw", name: "Bowling Ball", icon: "🎳", need: 0, r: 0.108, mass: 6.5, speed: 10.5, mul: 1, tip: "Heavy roll of doom" },
    { id: "water", cat: "throw", name: "Water Balloon", icon: "💧", need: 40, r: 0.09, mass: 0.4, speed: 12, mul: 0.5, tip: "Splash! Only breaks fragile things" },
    { id: "bouncy", cat: "throw", name: "Bouncy Ball", icon: "🔴", need: 75, r: 0.06, mass: 0.15, speed: 17, mul: 1.5, bouncy: true, tip: "Boing boing boing" },
    { id: "cube", cat: "throw", name: "Heavy Cube", icon: "🧊", need: 30, size: 0.22, mass: 18, speed: 8, mul: 1, tip: "18 kg of cube" },
    { id: "bomb", cat: "special", name: "Cartoon Bomb", icon: "💣", need: 0, rate: 0.6, tip: "Drop a bomb. Wait for it…" },
    { id: "weight", cat: "special", name: "Drop Weight", icon: "🏋️", need: 150, rate: 0.9, tip: "1 TON falls from the ceiling" },
    { id: "roller", cat: "special", name: "Rolling Ball", icon: "🌕", need: 190, rate: 1.0, tip: "A giant ball rolls through the spot you click" },
    { id: "press", cat: "special", name: "Crushing Press", icon: "🗜️", need: 280, rate: 2.0, tip: "A huge press slams down and flattens things" },
    { id: "hydraulic", cat: "special", name: "Hydraulic Crusher", icon: "🦾", need: 360, rate: 2.0, tip: "Two jaws squeeze everything in between" },
    { id: "laser", cat: "special", name: "Laser", icon: "🔦", need: 450, tip: "Hold to burn through anything" }
  ];
  const T = (BE.tools = { list: TOOLS, current: "hammer", placing: null, canUse: () => true, onUse: () => {}, laserMax: 0 });
  T.byId = (id) => TOOLS.find((t) => t.id === id);

  /* ---------- materials & models ---------- */
  const M = {
    wood: new THREE.MeshStandardMaterial({ map: BE.tex.wood, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: "#868e96", metalness: 0.85, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: "#343a40", metalness: 0.7, roughness: 0.35 }),
    red: new THREE.MeshPhysicalMaterial({ color: "#e03131", roughness: 0.35, clearcoat: 0.8 }),
    white: new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.5 }),
    yellow: new THREE.MeshStandardMaterial({ color: "#fcc419", roughness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: "#212529", roughness: 0.4 }),
    brown: new THREE.MeshStandardMaterial({ color: "#8b5a2b", roughness: 0.9 }),
    bat: new THREE.MeshPhysicalMaterial({ color: "#d9a066", roughness: 0.35, clearcoat: 0.6 })
  };
  function mk(geo, mat, x, y, z, rx, ry, rz) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.userData.keep = true; return m; }
  const stripesTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 32; const x = c.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#212529" : "#fcc419"; x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16, 32); x.lineTo(i * 16 - 16, 32); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  const hazard = new THREE.MeshStandardMaterial({ map: stripesTex, roughness: 0.5 });
  const MODELS = {
    hammer() { const g = new THREE.Group(); g.add(mk(new THREE.CylinderGeometry(0.017, 0.02, 0.44, 10), M.wood, 0, 0.22)); g.add(mk(new THREE.BoxGeometry(0.075, 0.075, 0.2), M.metal, 0, 0.44)); return g; },
    stick() { const g = new THREE.Group(); g.add(mk(new THREE.CylinderGeometry(0.012, 0.018, 0.72, 7), M.brown, 0, 0.36, 0, 0, 0, 0.04)); g.add(mk(new THREE.CylinderGeometry(0.005, 0.008, 0.14, 5), M.brown, 0.03, 0.5, 0, 0, 0, -0.7)); return g; },
    bat() { const g = new THREE.Group(); const pts = [[0, 0], [0.02, 0], [0.018, 0.02], [0.016, 0.25], [0.03, 0.55], [0.036, 0.78], [0.03, 0.8], [0, 0.8]].map(([r, y]) => new THREE.Vector2(r, y)); g.add(mk(new THREE.LatheGeometry(pts, 16), M.bat)); return g; },
    rod() { const g = new THREE.Group(); g.add(mk(new THREE.CylinderGeometry(0.013, 0.013, 0.92, 10), M.metal, 0, 0.46)); g.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 10), M.black, 0, 0.08)); return g; },
    sledge() { const g = new THREE.Group(); g.add(mk(new THREE.CylinderGeometry(0.02, 0.024, 0.86, 10), M.wood, 0, 0.43)); g.add(mk(new THREE.BoxGeometry(0.11, 0.11, 0.3), M.dark, 0, 0.85)); return g; },
    giant() { const g = new THREE.Group(); g.add(mk(new THREE.CylinderGeometry(0.05, 0.055, 1.2, 12), M.yellow, 0, 0.6)); const h = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 24), M.red, 0, 1.25, 0, Math.PI / 2); g.add(h); for (const z of [-0.22, 0.22]) g.add(mk(new THREE.CylinderGeometry(0.225, 0.225, 0.06, 24), M.white, 0, 1.25, z, Math.PI / 2)); return g; },
    glove() { const g = new THREE.Group(); const s = mk(new THREE.SphereGeometry(0.12, 18, 14), M.red); s.scale.set(1, 0.9, 1.25); g.add(s); g.add(mk(new THREE.SphereGeometry(0.05, 12, 10), M.red, 0.1, 0, 0.03)); g.add(mk(new THREE.CylinderGeometry(0.085, 0.09, 0.1, 16), M.white, 0, 0, -0.17, Math.PI / 2)); return g; }
  };
  const models = (T.models = {});
  const TS = 1.7; // tools are drawn a bit bigger than life so they read well from the room camera
  function model(id) {
    if (!models[id]) { const g = MODELS[id](); g.scale.setScalar(TS); g.visible = false; W.scene.add(g); W.track(g); models[id] = g; }
    return models[id];
  }

  /* ---------- reticle under the pointer ---------- */
  let reticle;
  function makeReticle() {
    reticle = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32), new THREE.MeshBasicMaterial({ color: "#ff6fa5", transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
    reticle.renderOrder = 10; reticle.visible = false; W.scene.add(reticle);
  }
  function placeReticle(pk) {
    if (!pk || !pk.point || W.replaying) { reticle.visible = false; return; }
    reticle.visible = true;
    reticle.position.copy(pk.point).addScaledVector(pk.normal, 0.01);
    reticle.lookAt(pk.point.clone().add(pk.normal));
    reticle.material.color.set(pk.obj ? "#ff6fa5" : "#adb5bd");
  }

  /* ---------- swinging tools ---------- */
  const anims = [];
  const ease = (x) => x * x * (3 - 2 * x);
  function swing(tool, pk) {
    if (!pk.point) return false;
    const target = pk.point.clone();
    const g = model(tool.id);
    const cam = W.camera, toCam = cam.position.clone().sub(target).normalize();
    const right = new V3().crossVectors(UP, toCam).normalize();
    W.focus.copy(target);
    BE.audio.whoosh(tool.power / 30);
    if (tool.punch) {
      anims.push({ t: 0, dur: 0.22, g, impact: 0.55, tool, pk, hit: false, upd(k) {
        const reach = k < 0.55 ? ease(k / 0.55) : 1 - ease((k - 0.55) / 0.45) * 0.9;
        const back = toCam.clone().multiplyScalar(1.1 - reach * 0.95);
        g.position.copy(target).add(back).add(new V3(0, 0.02, 0));
        g.lookAt(target.clone().sub(toCam));
      } });
      return true;
    }
    const L = tool.len * TS;
    // handle points from up-right-near towards the target
    const d = right.clone().multiplyScalar(-0.5).add(UP.clone().multiplyScalar(-0.75)).add(toCam.clone().multiplyScalar(-0.3)).normalize();
    const pivot = target.clone().addScaledVector(d, -L);
    if (pivot.y < 0.1) pivot.y = 0.1;
    const dd = target.clone().sub(pivot).normalize();
    const a = new V3().crossVectors(dd, toCam).normalize();
    const z = new V3().crossVectors(a, dd).normalize();
    const qImpact = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, dd, z));
    const test = dd.clone().applyAxisAngle(a, 1.2);
    const sgn = test.y > dd.y ? 1 : -1;
    const qa = new THREE.Quaternion();
    anims.push({ t: 0, dur: Math.max(0.2, tool.rate * 0.85), g, impact: 0.6, tool, pk, hit: false, upd(k) {
      let ang;
      if (k < 0.6) { const s = k / 0.6; ang = 1.9 * (1 - s * s); }
      else { const s = (k - 0.6) / 0.4; ang = Math.sin(s * Math.PI) * 0.25; }
      qa.setFromAxisAngle(a, ang * sgn);
      g.quaternion.copy(qa).multiply(qImpact);
      g.position.copy(pivot);
    } });
    return true;
  }
  function doImpact(an) {
    const { tool, pk } = an;
    const p = pk.point, cam = W.camera;
    const dir = p.clone().sub(cam.position).normalize().add(new V3(0, -0.3, 0)).normalize();
    const src = { kind: "tool", tool: tool.id };
    if (pk.obj && pk.obj.alive) W.hit(pk.obj, p, dir, tool.power, tool.push, src);
    else {
      W.fx.dust(p, "#adb5bd", 6, 0.05);
      if (tool.metal || tool.id === "sledge" || tool.id === "hammer") W.fx.sparks(p, 8);
      BE.audio.thud(tool.power / 40);
    }
    if (tool.area) {
      for (const o of W.objects.slice()) {
        if (o === pk.obj) continue;
        const d = Math.hypot(o.body.position.x - p.x, o.body.position.z - p.z) - o.radius;
        if (d < tool.area && o.body.position.y < p.y + 0.8) W.hit(o, new V3(o.body.position.x, o.body.position.y, o.body.position.z), dir, tool.power * (1 - Math.max(0, d) / tool.area) * 0.8, tool.push * 0.6, src);
      }
      W.fx.ring(p, "#ffffff", tool.area * 2.4);
      W.shake(tool.power / 120);
    }
    W.blast(p, 0.35 + (tool.area || 0), 2 + tool.push * 0.5);
    W.shake(Math.min(0.5, tool.power / 150));
  }

  /* ---------- throwing ---------- */
  const projGeo = {}, projMat = {
    football: new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 128, 64); x.fillStyle = "#212529"; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(i * 24 + (i % 2) * 6, 16 + (i % 2) * 30, 9, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.5 }),
    stone: new THREE.MeshStandardMaterial({ color: "#868e96", roughness: 0.95, flatShading: true }),
    bowling: new THREE.MeshPhysicalMaterial({ color: "#1c7ed6", roughness: 0.15, clearcoat: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: "#4dabf7", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }),
    bouncy: new THREE.MeshPhysicalMaterial({ color: "#fa5252", roughness: 0.2, clearcoat: 1 }),
    cube: new THREE.MeshStandardMaterial({ color: "#495057", metalness: 0.7, roughness: 0.35 })
  };
  function throwStart() {
    const cam = W.camera, fwd = new V3(); cam.getWorldDirection(fwd);
    const right = new V3().crossVectors(fwd, UP).normalize();
    const s = cam.position.clone().addScaledVector(fwd, 0.8).addScaledVector(right, 0.35).addScaledVector(UP, -0.3);
    s.x = Math.max(-4.6, Math.min(4.6, s.x)); s.y = Math.max(0.4, Math.min(5.5, s.y)); s.z = Math.max(-3.6, s.z);
    return s;
  }
  function launchVel(start, target, speed) {
    const delta = target.clone().sub(start);
    const t = Math.max(0.15, delta.length() / speed);
    return delta.multiplyScalar(1 / t).add(new V3(0, 0.5 * 9.82 * t, 0));
  }
  let projCount = 0;
  function throwIt(tool, pk) {
    const start = throwStart();
    const target = pk.point ? pk.point.clone() : start.clone().addScaledVector(pk.ray.direction, 8);
    let geo, shape;
    if (tool.id === "cube") { geo = projGeo.cube || (projGeo.cube = new THREE.BoxGeometry(tool.size, tool.size, tool.size)); shape = new CANNON.Box(new CANNON.Vec3(tool.size / 2, tool.size / 2, tool.size / 2)); }
    else { geo = projGeo[tool.id] || (projGeo[tool.id] = tool.id === "stone" ? new THREE.DodecahedronGeometry(tool.r, 0) : new THREE.SphereGeometry(tool.r, 20, 14)); shape = new CANNON.Sphere(tool.r); }
    const mesh = new THREE.Mesh(geo, projMat[tool.id]); mesh.castShadow = true; mesh.userData.keep = true;
    if (tool.id === "stone") mesh.scale.set(R(0.8, 1.2), R(0.7, 1), R(0.8, 1.2));
    const body = new CANNON.Body({ mass: tool.mass, shape, collisionFilterGroup: G.PROJ, collisionFilterMask: G.STATIC | G.OBJ | G.FRAG | G.PROJ | G.KIN, linearDamping: 0.01, angularDamping: 0.1 });
    if (tool.bouncy || tool.rest) body.material = W.bouncyMat;
    body.position.set(start.x, start.y, start.z);
    const v = launchVel(start, target, tool.speed);
    body.velocity.set(v.x, v.y, v.z);
    body.angularVelocity.set(R(-10, 10), R(-10, 10), R(-10, 10));
    body.proj = { tool: tool.id, mul: tool.mul };
    mesh.position.copy(start);
    const d = W.addDyn(mesh, body, { life: 10, update(dt, dd) { const age = W.simT - dd.born; if (age > 9) mesh.scale.setScalar(Math.max(0.01, (10 - age))); } });
    let lastBounce = 0;
    body.addEventListener("collide", (e) => {
      const iv = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (tool.id === "water" && iv > 1.5 && !d.dead) {
        W.afterStep(() => { if (d.dead) return; const p = mesh.position.clone(); W.removeDyn(d); W.fx.splash(p, 70); W.fx.ring(p, "#a5d8ff", 1.2); BE.audio.splash(); W.blast(p, 0.6, 2); });
      } else if ((tool.bouncy || tool.rest) && iv > 2 && W.simT - lastBounce > 0.1) { lastBounce = W.simT; BE.audio.boing(); }
      else if (iv > 3 && W.simT - lastBounce > 0.15 && !e.body.obj) { lastBounce = W.simT; BE.audio.thud(tool.mass / 8); }
    });
    BE.audio.whoosh(1);
    if (++projCount > 26) { const old = W.dyn.find((x) => x.body && x.body.proj && !x.dead); if (old) W.removeDyn(old); projCount--; }
    d.onRemove = () => projCount--;
    return true;
  }

  /* ---------- specials ---------- */
  function bomb(pk) {
    if (!pk.point) return false;
    const p = pk.point.clone().add(new V3(0, 0.6, 0));
    const g = new THREE.Group();
    const ball = mk(new THREE.SphereGeometry(0.15, 22, 16), M.black); g.add(ball);
    g.add(mk(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12), M.dark, 0, 0.16));
    const fuse = mk(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), M.brown, 0.02, 0.22, 0, 0, 0, -0.4); g.add(fuse);
    const hl = mk(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), -0.06, 0.07, 0.11); g.add(hl);
    const body = new CANNON.Body({ mass: 2, shape: new CANNON.Sphere(0.15), collisionFilterGroup: G.PROJ, collisionFilterMask: G.STATIC | G.OBJ | G.FRAG | G.PROJ | G.KIN, linearDamping: 0.1, angularDamping: 0.6 });
    body.position.set(p.x, p.y, p.z); body.proj = { tool: "bomb", mul: 0.2 };
    const tip = new V3();
    BE.audio.fuse(1.6);
    W.addDyn(g, body, { life: 1.6, update(dt, d) {
      tip.set(0.06, 0.27, 0).applyQuaternion(g.quaternion).add(g.position);
      W.fx.sparks(tip, 1);
      const k = (W.simT - d.born) / 1.6; ball.material = k > 0.7 && Math.floor(W.simT * 14) % 2 ? M.red : M.black;
      g.scale.setScalar(1 + Math.max(0, k - 0.7) * 0.6);
      if (W.simT - d.born >= 1.58 && !d.boom) { d.boom = true; const c = g.position.clone(); W.afterStep(() => W.explode(c, 2.6, 240, { kind: "explosion", chain: W.newChain(), tool: "bomb" })); }
    } });
    return true;
  }

  function weight(pk) {
    if (!pk.point) return false;
    const x = Math.max(-4.4, Math.min(4.4, pk.point.x)), z = Math.max(-3.5, Math.min(2.2, pk.point.z));
    const g = new THREE.Group();
    g.add(mk(new THREE.CylinderGeometry(0.3, 0.42, 0.45, 4, 1), M.dark, 0, 0, 0, 0, Math.PI / 4));
    g.add(mk(new THREE.TorusGeometry(0.1, 0.03, 8, 16), M.dark, 0, 0.3, 0));
    const lab = document.createElement("canvas"); lab.width = 256; lab.height = 128; const lx = lab.getContext("2d"); lx.fillStyle = "#fff"; lx.font = "bold 70px sans-serif"; lx.textAlign = "center"; lx.fillText("1 TON", 128, 88);
    const lt = new THREE.CanvasTexture(lab); lt.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: lt, transparent: true })); sign.position.set(0, 0, 0.36); sign.rotation.x = -0.26; g.add(sign);
    const body = new CANNON.Body({ mass: 200, shape: new CANNON.Box(new CANNON.Vec3(0.33, 0.22, 0.33)), collisionFilterGroup: G.PROJ, collisionFilterMask: G.STATIC | G.OBJ | G.FRAG | G.PROJ | G.KIN });
    body.position.set(x, 5.4, z); body.proj = { tool: "weight", mul: 1.2 };
    // shadow marker
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.25, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.01, z); W.scene.add(mark);
    BE.audio.whistle(0.9);
    let landed = false;
    body.addEventListener("collide", (e) => {
      if (landed || Math.abs(e.contact.getImpactVelocityAlongNormal()) < 3) return;
      landed = true;
      W.afterStep(() => { const p = new V3(body.position.x, 0.05, body.position.z); BE.audio.thud(1.5); W.fx.dust(p, "#adb5bd", 40, 0.4); W.fx.ring(p, "#ffffff", 2.2); W.shake(1); W.blast(p, 1.4, 6, { objects: true }); W.scene.remove(mark); });
    });
    W.addDyn(g, body, { life: 6, update(dt, d) { const age = W.simT - d.born; mark.material.opacity = landed ? 0 : 0.15 + Math.min(0.35, age * 0.4); mark.scale.setScalar(0.6 + Math.min(0.4, age * 0.5)); if (age > 5.2) g.scale.setScalar(Math.max(0.01, (6 - age) / 0.8)); }, onRemove() { W.scene.remove(mark); } });
    return true;
  }

  function roller(pk) {
    if (!pk.point) return false;
    const r = 0.55, z = Math.max(-3.3, Math.min(2, pk.point.z));
    const fromLeft = pk.point.x > 0;
    const x0 = fromLeft ? -4.35 : 4.35;
    const tex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#ffd43b"; x.fillRect(0, 0, 256, 128); x.fillStyle = "#f08c00"; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 14, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const mesh = mk(new THREE.SphereGeometry(r, 32, 22), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.7 }));
    const body = new CANNON.Body({ mass: 90, shape: new CANNON.Sphere(r), collisionFilterGroup: G.PROJ, collisionFilterMask: G.STATIC | G.OBJ | G.FRAG | G.PROJ | G.KIN, linearDamping: 0.05, angularDamping: 0.05 });
    body.position.set(x0, r + 0.02, z);
    const dir = new V3(pk.point.x - x0, 0, pk.point.z - z).normalize();
    body.velocity.set(dir.x * 7.5, 0, dir.z * 7.5);
    body.angularVelocity.set(dir.z * 7.5 / r, 0, -dir.x * 7.5 / r);
    body.proj = { tool: "roller", mul: 1 };
    BE.audio.thud(1);
    W.addDyn(mesh, body, { life: 7, update(dt, d) { const age = W.simT - d.born; if (age > 6.2) mesh.scale.setScalar(Math.max(0.01, (7 - age) / 0.8)); if (body.velocity.length() > 2 && Math.random() < 0.3) W.fx.dust(new V3(body.position.x, 0.05, body.position.z), "#ced4da", 1, 0.2); } });
    return true;
  }

  // a kinematic body that pushes debris but crushes objects through squash logic
  function kinBox(hx, hy, hz, tool) {
    const b = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), collisionFilterGroup: G.KIN, collisionFilterMask: G.FRAG | G.PROJ });
    b.kin = { f: 4, tool };
    return b;
  }
  const bb = new THREE.Box3();
  function press(pk) {
    if (!pk.point) return false;
    const x = Math.max(-4.2, Math.min(4.2, pk.point.x)), z = Math.max(-3.2, Math.min(1.9, pk.point.z));
    const H = 0.7, TOP = 4.6;
    const g = new THREE.Group();
    const plate = mk(new THREE.BoxGeometry(1.4, 0.3, 1.4), M.metal); g.add(plate);
    const band = mk(new THREE.BoxGeometry(1.42, 0.1, 1.42), hazard, 0, 0.1); g.add(band);
    const rod = mk(new THREE.CylinderGeometry(0.12, 0.12, 6, 16), M.dark, 0, 3.15); g.add(rod);
    g.add(mk(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), M.yellow, 0, 0.3));
    const body = kinBox(H, 0.15, H, "press");
    let phase = 0, crunch = false;
    const src = { kind: "tool", tool: "press" };
    BE.audio.hydraulic(2.2);
    const d = W.addDyn(g, body, { life: 3.2, sync: true, update(dt, dd) {
      const t = W.simT - dd.born;
      let y;
      if (t < 0.35) y = TOP;
      else if (t < 1.05) { const s = (t - 0.35) / 0.7; y = TOP - (TOP - 0.15) * s * s; }
      else if (t < 1.45) y = 0.15;
      else y = 0.15 + (TOP - 0.15) * ease(Math.min(1, (t - 1.45) / 1.2));
      const vy = dt > 0 ? (y - body.position.y) / dt : 0;
      body.position.set(x, y, z); body.velocity.set(0, vy, 0);
      g.position.set(x, y, z);
      if (t >= 1.05 && phase === 0) { phase = 1; W.shake(1.1); BE.audio.thud(1.6); W.fx.dust(new V3(x, 0.05, z), "#adb5bd", 40, 0.6); W.fx.ring(new V3(x, 0.05, z), "#ffffff", 2.4); }
      const bottom = y - 0.15;
      for (const o of W.objects.slice()) {
        const p = o.body.position;
        if (Math.abs(p.x - x) > H + o.radius * 0.4 || Math.abs(p.z - z) > H + o.radius * 0.4) continue;
        bb.setFromObject(o.group);
        const base = bb.min.y;
        if (bottom >= base + o.height * (o.squashY || 1)) continue;
        const sq = Math.max(0.08, (bottom - base) / o.height);
        o.squashY = Math.min(o.squashY || 1, sq);
        if (!crunch) { crunch = true; BE.audio.breakSound(o.mainMat, 0.8); }
        const want = o.maxHp * (1 - o.squashY) * 2.1;
        const done = o.maxHp - o.hp;
        if (want > done) W.damage(o, want - done, new V3(p.x, bottom, p.z), new V3(0, -1, 0), src, 2.5);
      }
    } });
    return !!d;
  }

  function hydraulic(pk) {
    if (!pk.point) return false;
    const x = Math.max(-3.6, Math.min(3.6, pk.point.x)), z = Math.max(-3.2, Math.min(1.9, pk.point.z));
    const HW = 0.12, HH = 0.5, HD = 0.55, OPEN = 1.5, SHUT = 0.04;
    const jaws = [-1, 1].map((sgn) => {
      const g = new THREE.Group();
      g.add(mk(new THREE.BoxGeometry(HW * 2, HH * 2, HD * 2), M.yellow));
      g.add(mk(new THREE.BoxGeometry(HW * 2 + 0.01, 0.12, HD * 2 + 0.01), hazard, 0, HH - 0.1));
      const cyl = mk(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 14), M.metal, sgn * 1.3, 0, 0, 0, 0, Math.PI / 2); g.add(cyl);
      const b = kinBox(HW, HH, HD, "hydraulic");
      return { g, b, sgn };
    });
    const src = { kind: "tool", tool: "hydraulic" };
    BE.audio.hydraulic(2.4);
    let clamp = false;
    const holder = new THREE.Group();
    for (const j of jaws) holder.add(j.g);
    const d = W.addDyn(holder, null, { life: 3.4, sync: false, update(dt, dd) {
      const t = W.simT - dd.born;
      let gap;
      if (t < 0.3) gap = OPEN;
      else if (t < 1.4) gap = OPEN - (OPEN - SHUT) * ease((t - 0.3) / 1.1);
      else if (t < 1.8) gap = SHUT;
      else gap = SHUT + (OPEN - SHUT) * ease(Math.min(1, (t - 1.8) / 1.2));
      for (const j of jaws) {
        const jx = x + j.sgn * (gap + HW);
        const vx = dt > 0 ? (jx - j.b.position.x) / dt : 0;
        j.b.position.set(jx, HH + 0.01, z); j.b.velocity.set(vx, 0, 0);
        j.g.position.set(jx, HH + 0.01, z);
      }
      if (t >= 1.4 && !clamp) { clamp = true; W.shake(0.9); BE.audio.thud(1.2); W.fx.sparks(new V3(x, 0.5, z), 20); }
      for (const o of W.objects.slice()) {
        const p = o.body.position;
        if (Math.abs(p.z - z) > HD + o.radius * 0.4 || p.y > HH * 2 + 0.2) continue;
        const half = o.radius;
        if (Math.abs(p.x - x) > gap + half) continue;
        const sq = Math.max(0.08, gap / Math.max(0.05, half));
        if (sq >= 1) continue;
        o.squashX = Math.min(o.squashX || 1, sq);
        o.body.position.x += (x - p.x) * 0.2;
        const want = o.maxHp * (1 - o.squashX) * 2.1, done = o.maxHp - o.hp;
        if (want > done) W.damage(o, want - done, new V3(p.x, p.y, p.z), new V3(-Math.sign(p.x - x) || 1, 0, 0), src, 2.5);
      }
    }, onRemove() { for (const j of jaws) W.removeBody(j.b); } });
    for (const j of jaws) W.addBody(j.b);
    return !!d;
  }

  function wrecking(pk) {
    if (!pk.point) return false;
    const target = pk.point.clone(); target.y = Math.max(0.36, target.y);
    const Lr = Math.min(3.6, 5.9 - target.y);
    const piv = target.clone().add(new V3(0, Lr, 0));
    const cam = W.camera, toCam = cam.position.clone().sub(target); toCam.y = 0; toCam.normalize();
    const side = new V3().crossVectors(UP, toCam).normalize();
    const r = 0.34;
    const g = new THREE.Group();
    g.add(mk(new THREE.SphereGeometry(r, 26, 18), M.dark));
    g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), M.metal, 0, r + 0.04));
    const chainGeo = new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]);
    const chain = new THREE.Line(chainGeo, new THREE.LineBasicMaterial({ color: "#495057" }));
    chain.frustumCulled = false; W.scene.add(chain);
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Sphere(r), collisionFilterGroup: G.KIN, collisionFilterMask: G.OBJ | G.FRAG | G.PROJ });
    body.kin = { f: 4, tool: "wrecking" };
    const A0 = -1.15, A1 = 1.05, DUR = 1.25;
    const path = (a) => piv.clone().addScaledVector(side, Math.sin(a) * Lr).addScaledVector(UP, -Math.cos(a) * Lr);
    const p0 = path(A0); body.position.set(p0.x, p0.y, p0.z);
    BE.audio.whoosh(2);
    W.addDyn(g, body, { life: DUR + 0.6, update(dt, d) {
      const t = W.simT - d.born;
      const s = Math.min(1, t / DUR), a = A0 + (A1 - A0) * ease(s);
      const p = path(a);
      const vel = dt > 0 ? p.clone().sub(new V3(body.position.x, body.position.y, body.position.z)).multiplyScalar(1 / dt) : new V3();
      body.position.set(p.x, p.y, p.z); body.velocity.set(vel.x, vel.y, vel.z);
      g.position.copy(p);
      if (t > DUR) g.scale.setScalar(Math.max(0.01, 1 - (t - DUR) / 0.6));
      chainGeo.attributes.position.setXYZ(0, piv.x, piv.y, piv.z); chainGeo.attributes.position.setXYZ(1, p.x, p.y + r, p.z); chainGeo.attributes.position.needsUpdate = true;
    }, onRemove() { W.scene.remove(chain); chainGeo.dispose(); } });
    return true;
  }

  /* ---------- laser ---------- */
  let laser = null;
  const beamMat = new THREE.MeshBasicMaterial({ color: "#ff2d55", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: "#ff6b6b", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  function laserStart() {
    if (laser) return;
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8, 1, true), beamMat); core.userData.keep = true;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12, 1, true), glowMat); glow.userData.keep = true;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), glowMat); dot.userData.keep = true;
    g.add(core, glow); W.scene.add(g, dot); W.track(g); W.track(dot);
    const light = new THREE.PointLight("#ff4d6d", 6, 2.5); W.scene.add(light);
    laser = { g, dot, light, t: 0 };
    BE.audio.laserOn();
  }
  function laserStop() {
    if (!laser) return;
    W.retire(laser.g); W.retire(laser.dot); W.scene.remove(laser.light);
    laser = null; BE.audio.laserOff();
  }
  const emitter = new V3();
  function laserUpdate(sdt) {
    if (!laser) return;
    laser.t += sdt;
    if (T.laserMax && laser.t > T.laserMax) { laserStop(); return; }
    const pk = W.pick(ptr.x, ptr.y);
    const cam = W.camera, fwd = new V3(); cam.getWorldDirection(fwd);
    const right = new V3().crossVectors(fwd, UP).normalize();
    emitter.copy(cam.position).addScaledVector(fwd, 1.2).addScaledVector(right, 0.9).addScaledVector(UP, 0.5);
    const end = pk.point ? pk.point : emitter.clone().addScaledVector(pk.ray.direction, 12);
    const len = emitter.distanceTo(end);
    laser.g.position.copy(emitter).lerp(end, 0.5);
    laser.g.quaternion.setFromUnitVectors(UP, end.clone().sub(emitter).normalize());
    laser.g.scale.set(1 + Math.sin(W.simT * 60) * 0.15, len, 1 + Math.sin(W.simT * 60) * 0.15);
    laser.dot.position.copy(end); laser.light.position.copy(end).addScaledVector(pk.normal || UP, 0.15);
    if (pk.point && sdt > 0) {
      W.fx.sparks(end, 2, pk.normal);
      if (Math.random() < 0.3) W.fx.smoke(end, 1, 0.3);
      if (pk.obj) { W.damage(pk.obj, 55 * sdt, end, end.clone().sub(emitter).normalize(), { kind: "tool", tool: "laser", quiet: true }, 1.5); BE.audio.sizzle(); }
      W.blast(end, 0.2, 0.6);
    }
  }

  /* ---------- hand: grab, drag, drop, throw ---------- */
  let grab = null;
  function grabStart(pk) {
    if (!pk.obj || !pk.obj.alive) return false;
    const o = pk.obj, b = o.body;
    b.wakeUp();
    const jb = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionResponse: false });
    jb.position.set(pk.point.x, pk.point.y, pk.point.z);
    W.addBody(jb);
    const local = new CANNON.Vec3(); b.pointToLocalFrame(new CANNON.Vec3(pk.point.x, pk.point.y, pk.point.z), local);
    const c = new CANNON.PointToPointConstraint(b, local, jb, new CANNON.Vec3(0, 0, 0), Math.min(2500, b.mass * 90 + 40));
    W.physics.addConstraint(c);
    const n = new V3(); W.camera.getWorldDirection(n); n.y = 0; n.normalize();
    grab = { o, jb, c, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, pk.point), target: pk.point.clone(), last: pk.point.clone(), vel: new V3(), ld: b.linearDamping, ad: b.angularDamping };
    o.held = true; b.angularDamping = 0.7; b.linearDamping = 0.35;
    W.focus.copy(pk.point);
    BE.audio.click();
    return true;
  }
  function grabMove() {
    if (!grab) return;
    const ray = W.ray(ptr.x, ptr.y), p = new V3();
    if (!ray.intersectPlane(grab.plane, p)) return;
    p.x = Math.max(-4.7, Math.min(4.7, p.x)); p.y = Math.max(0.05, Math.min(4.5, p.y)); p.z = Math.max(-3.8, Math.min(2.4, p.z));
    grab.target.copy(p);
  }
  function grabWheel(dy) {
    if (!grab) return;
    const n = grab.plane.normal.clone();
    grab.plane.constant -= Math.sign(dy) * 0.15; // move plane along its normal
    grabMove();
    void n;
  }
  function grabEnd() {
    if (!grab) return;
    const { o, jb, c } = grab;
    W.physics.removeConstraint(c); W.removeBody(jb);
    if (o.alive) {
      o.held = false; o.body.linearDamping = grab.ld; o.body.angularDamping = grab.ad;
      const v = o.body.velocity, sp = v.length();
      if (sp > 2) { const k = Math.min(1.35, 16 / sp); v.x *= k; v.y *= k; v.z *= k; BE.audio.whoosh(1); }
    }
    grab = null;
  }
  function grabUpdate(sdt) {
    if (!grab) return;
    if (!grab.o.alive) { grabEnd(); return; }
    const jb = grab.jb;
    if (sdt > 0) { const v = grab.target.clone().sub(new V3(jb.position.x, jb.position.y, jb.position.z)).multiplyScalar(1 / Math.max(sdt, 1e-3)); jb.velocity.set(v.x, v.y, v.z); }
    jb.position.set(grab.target.x, grab.target.y, grab.target.z);
  }

  /* ---------- input ---------- */
  const ptr = { x: 0, y: 0, down: false, id: null, next: 0 };
  T.ptr = ptr;
  function use(tool, pk) {
    if (!T.canUse(tool)) return false;
    let ok = false;
    if (tool.cat === "hit") ok = tool.id === "wrecking" ? wrecking(pk) : swing(tool, pk);
    else if (tool.cat === "throw") ok = throwIt(tool, pk);
    else if (tool.id === "bomb") ok = bomb(pk);
    else if (tool.id === "weight") ok = weight(pk);
    else if (tool.id === "roller") ok = roller(pk);
    else if (tool.id === "press") ok = press(pk);
    else if (tool.id === "hydraulic") ok = hydraulic(pk);
    else if (tool.id === "laser") { laserStart(); ok = true; }
    if (ok) T.onUse(tool, pk);
    return ok;
  }
  T.use = (id, pk) => use(T.byId(id), pk);
  T.release = () => { ptr.down = false; laserStop(); grabEnd(); };
  T.init = function (canvas) {
    makeReticle();
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (W.replaying || e.button > 0) return;
      BE.audio.unlock();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.down = true; ptr.id = e.pointerId;
      const pk = W.pick(e.clientX, e.clientY);
      if (T.placing) { T.placing(pk); ptr.down = false; return; }
      const tool = T.byId(T.current);
      if (tool.cat === "hand") { if (!grabStart(pk)) { if (pk.point) W.blast(pk.point, 0.4, 2.5); } return; }
      use(tool, pk);
      ptr.next = performance.now() + (tool.rate || 0.35) * 1000;
    });
    canvas.addEventListener("pointermove", (e) => {
      ptr.x = e.clientX; ptr.y = e.clientY;
      if (grab) grabMove();
      if (e.pointerType === "mouse") placeReticle(grab ? null : W.pick(e.clientX, e.clientY));
    });
    const up = () => { ptr.down = false; laserStop(); grabEnd(); };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", () => { reticle.visible = false; });
    canvas.addEventListener("wheel", (e) => { if (grab) { e.preventDefault(); grabWheel(e.deltaY); } }, { passive: false });

    W.on("pre", (sdt) => { grabUpdate(sdt); });
    W.on("frame", (dt, sdt) => {
      // swing animations (in sim time so slow-mo slows the swing too)
      for (let i = anims.length - 1; i >= 0; i--) {
        const an = anims[i];
        an.t += sdt; const k = Math.min(1, an.t / an.dur);
        an.g.visible = true; an.upd(k);
        if (!an.hit && k >= an.impact) { an.hit = true; doImpact(an); }
        if (k >= 1) { anims.splice(i, 1); if (!anims.some((a) => a.g === an.g)) an.g.visible = false; }
      }
      laserUpdate(sdt);
      // holding the button keeps smashing
      if (ptr.down && !grab && !W.replaying) {
        const tool = T.byId(T.current);
        if (tool.cat !== "hand" && tool.id !== "laser" && performance.now() >= ptr.next) {
          ptr.next = performance.now() + (tool.rate || 0.35) * 1000 * (tool.cat === "throw" ? 1 : 1.05);
          if (tool.cat !== "special" || tool.id === "bomb") use(tool, W.pick(ptr.x, ptr.y));
        }
      }
    });
    W.on("replay", (on) => { if (on) { laserStop(); grabEnd(); reticle.visible = false; } });
  };
  // dyn removal hook for counters
  const removeDyn = W.removeDyn;
  W.removeDyn = function (d) { if (d.dead) return; removeDyn(d); if (d.onRemove) d.onRemove(); };
})();
