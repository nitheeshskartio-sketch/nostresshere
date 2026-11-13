/* ============ SMASH IT — arena modes: wrecking ball, dummy factory, apocalypse ============
   Each mode has its own room (hidden from the normal room list) and a row of buttons in the mode HUD. */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = THREE.MathUtils.clamp;
  const P = S.propFactory;

  /* ---------- shared textures ---------- */
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const TX = {};
  const tex = (k, f) => TX[k] || (TX[k] = f());
  const windowsTex = () => tex("win", () => canvasTex(128, 128, (c) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, 128, 128);
    for (let y = 10; y < 120; y += 38) for (let x = 12; x < 120; x += 28) {
      c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x - 2, y - 2, 20, 28);
      const g = c.createLinearGradient(x, y, x + 16, y + 24); g.addColorStop(0, Math.random() < 0.3 ? "#ffe8a3" : "#9cc3e6"); g.addColorStop(1, "#4d6a8a");
      c.fillStyle = g; c.fillRect(x, y, 16, 24); c.fillStyle = "rgba(255,255,255,0.7)"; c.fillRect(x + 7, y, 2, 24);
    }
    c.fillStyle = "rgba(0,0,0,0.15)"; c.fillRect(0, 124, 128, 4);
  }));
  const roadTex = () => tex("road", () => canvasTex(512, 512, (c) => {
    c.fillStyle = "#9aa39a"; c.fillRect(0, 0, 512, 512);           // pavements
    c.fillStyle = "#3d4248"; c.fillRect(0, 200, 512, 112); c.fillRect(200, 0, 112, 512); // roads
    c.strokeStyle = "#ffd43b"; c.lineWidth = 4; c.setLineDash([22, 18]);
    c.beginPath(); c.moveTo(0, 256); c.lineTo(512, 256); c.moveTo(256, 0); c.lineTo(256, 512); c.stroke();
    c.setLineDash([]); c.fillStyle = "#f1f3f5"; for (let i = 0; i < 6; i++) { c.fillRect(205 + i * 18, 170, 10, 26); c.fillRect(170, 205 + i * 18, 26, 10); }
    c.fillStyle = "#74b56b"; c.fillRect(30, 30, 140, 140); c.fillRect(350, 350, 130, 130);
  }, [3, 2]));
  const padTex = (a, b) => tex("pad" + a, () => canvasTex(128, 128, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = b; c.lineWidth = 6; for (let i = 0; i <= 128; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
    const g = c.createRadialGradient(32, 32, 4, 32, 32, 40); g.addColorStop(0, "rgba(255,255,255,0.25)"); g.addColorStop(1, "rgba(0,0,0,0.12)");
    for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) { c.save(); c.translate(x, y); c.fillStyle = g; c.fillRect(3, 3, 58, 58); c.restore(); }
  }, [8, 3]));
  const hazardTex = () => tex("haz", () => canvasTex(128, 32, (c) => {
    c.fillStyle = "#ffd43b"; c.fillRect(0, 0, 128, 32); c.fillStyle = "#212529";
    for (let x = -32; x < 160; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 48, 0); c.lineTo(x + 32, 0); c.fill(); }
  }, [4, 1]));
  const tntTex = () => tex("tnt", () => canvasTex(128, 64, (c) => {
    c.fillStyle = "#c92a2a"; c.fillRect(0, 0, 128, 64); c.fillStyle = "#f8f9fa"; c.fillRect(0, 20, 128, 24);
    c.fillStyle = "#212529"; c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("TNT", 64, 33);
  }));
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, o || {}));
  const mesh = (geo, mat, pos, parent) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(pos[0], pos[1], pos[2]); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; };
  // a static physics block (machine frames, ledges) that props collide with
  const staticBox = (w, sx, sy, sz, pos, mat, rot) => w.addProp({ kind: "static", mesh: mesh(new THREE.BoxGeometry(sx, sy, sz), mat), shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)), mass: 0, pos, rotY: rot || 0 });

  /* =========================================================
     ROOMS for the arena modes
     ========================================================= */
  const ENV = S.ENVS;
  const daylight = (w, g, bg) => {
    w.scene.background = new THREE.Color(bg); w.scene.fog = new THREE.Fog(bg, 14, 32);
    g.add(new THREE.HemisphereLight("#ffffff", "#8a8f99", 1.3));
    w.addSun("#fff4e0", 2.4, [3, 8, 5], 8);
  };

  ENV.demolition = {
    name: "Demolition Yard", icon: "🏗️", desc: "Brick walls, furniture and junk to flatten.", hidden: true,
    build(w, g) {
      daylight(w, g, "#d9e2ec");
      w.addFloorAndWalls(std("#8f8a80", { map: S.tex.concrete("#8f8a80", 8), roughness: 0.95 }), std("#a8a29a", { map: S.tex.brick("#9c5b46", "#6b3d2f", 8), roughness: 0.95 }));
      // a crane arm up out of view holds the ball's chain
      const beam = mesh(new THREE.BoxGeometry(12, 0.35, 0.35), std("#f59f00", { metalness: 0.4 }), [0, 7.6, -0.6], g);
      beam.castShadow = false;
      const stripe = mesh(new THREE.BoxGeometry(12, 0.36, 0.05), new THREE.MeshStandardMaterial({ map: hazardTex() }), [0, 7.6, -0.4], g); stripe.castShadow = false;
    },
    props(w) {
      // brick wall (left), furniture (middle back), junk pile (right)
      const brick = std("#b5563c", { roughness: 0.9 });
      for (let r = 0; r < 6; r++) for (let i = 0; i < 6; i++) {
        const x = -4.2 + i * 0.42 + (r % 2 ? 0.21 : 0);
        if (x > -1.6) continue;
        w.addProp({ kind: "brick", mesh: mesh(new THREE.BoxGeometry(0.4, 0.2, 0.22), brick), shape: new CANNON.Box(new CANNON.Vec3(0.2, 0.1, 0.11)), mass: 0.9, pos: [x, 0.1 + r * 0.205, -2.3], color: "#b5563c" });
      }
      // sofa
      const sofa = new THREE.Group(), fab = std("#5c7cfa", { roughness: 0.95 });
      mesh(new THREE.BoxGeometry(1.5, 0.35, 0.6), fab, [0, 0, 0], sofa); mesh(new THREE.BoxGeometry(1.5, 0.45, 0.16), fab, [0, 0.38, -0.22], sofa);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.16, 0.3, 0.6), fab, [s * 0.68, 0.3, 0], sofa);
      w.addProp({ kind: "sofa", mesh: sofa, shapes: [[new CANNON.Box(new CANNON.Vec3(0.75, 0.18, 0.3))], [new CANNON.Box(new CANNON.Vec3(0.75, 0.22, 0.08)), new CANNON.Vec3(0, 0.38, -0.22)]], mass: 6, pos: [0.2, 0.19, -2.6], color: "#5c7cfa" });
      // table + chairs
      const wood = std("#8d5a2b", { roughness: 0.7 });
      const table = new THREE.Group(); mesh(new THREE.BoxGeometry(1, 0.06, 0.6), wood, [0, 0.36, 0], table);
      for (const [x, z] of [[-0.44, -0.24], [0.44, -0.24], [-0.44, 0.24], [0.44, 0.24]]) mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), wood, [x, 0.17, z], table);
      w.addProp({ kind: "table", mesh: table, shapes: [[new CANNON.Box(new CANNON.Vec3(0.5, 0.03, 0.3)), new CANNON.Vec3(0, 0.36, 0)], [new CANNON.Box(new CANNON.Vec3(0.45, 0.17, 0.25)), new CANNON.Vec3(0, 0.17, 0)]], mass: 3, pos: [2.1, 0.01, -1.9], color: "#8d5a2b" });
      for (const s of [-1, 1]) {
        const ch = new THREE.Group(); mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), wood, [0, 0.24, 0], ch); mesh(new THREE.BoxGeometry(0.36, 0.4, 0.04), wood, [0, 0.46, -0.16], ch);
        for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) mesh(new THREE.BoxGeometry(0.035, 0.24, 0.035), wood, [x, 0.12, z], ch);
        w.addProp({ kind: "chair", mesh: ch, shapes: [[new CANNON.Box(new CANNON.Vec3(0.18, 0.14, 0.18)), new CANNON.Vec3(0, 0.13, 0)], [new CANNON.Box(new CANNON.Vec3(0.18, 0.2, 0.03)), new CANNON.Vec3(0, 0.46, -0.16)]], mass: 1.2, pos: [2.1 + s * 0.75, 0.01, -1.9], rotY: s * 1.4, color: "#8d5a2b" });
      }
      // TV on a cabinet, bookshelf
      staticBox(w, 0.9, 0.5, 0.45, [3.9, 0.25, -2.8], std("#495057"));
      const tv = new THREE.Group(); mesh(new THREE.BoxGeometry(0.8, 0.5, 0.08), std("#212529", { roughness: 0.3 }), [0, 0, 0], tv); mesh(new THREE.PlaneGeometry(0.72, 0.42), std("#1c7ed6", { emissive: "#1864ab", emissiveIntensity: 0.6 }), [0, 0, 0.041], tv);
      w.addProp({ kind: "tv", mesh: tv, shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.25, 0.04)), mass: 1.5, pos: [3.9, 0.76, -2.8], breakable: true, threshold: 3, color: "#212529" });
      for (let i = 0; i < 4; i++) P.crate(w, 3.4 + (i % 2) * 0.62, 0.3 + Math.floor(i / 2) * 0.61, -0.6, 0.6);
      P.barrel(w, -3.6, 0.45, 0.6, "#e8590c"); P.barrel(w, -4.1, 0.45, -0.2, "#495057");
      P.pedestal(w, -0.9, -3.1, 0.7, "#868e96"); P.vase(w, -0.9, 0.97, -3.1, "#e599f7");
    }
  };

  ENV.factory = {
    name: "Dummy Factory", icon: "🏭", desc: "Presses, rollers, crushers and a bubbling vat.", hidden: true,
    build(w, g) {
      w.scene.background = new THREE.Color("#4a5260"); w.scene.fog = new THREE.Fog("#4a5260", 14, 30);
      w.addFloorAndWalls(std("#6c7078", { map: S.tex.concrete("#6c7078", 8), roughness: 0.9 }), std("#495057", { map: S.tex.metal("#495057", "#6c757d", 10), roughness: 0.6, metalness: 0.4 }));
      g.add(new THREE.HemisphereLight("#e7edf5", "#4a4038", 1.6)); w.addSun("#fff1d6", 2.6, [2, 8, 5], 8);
      for (const x of [-2.5, 2.5]) { const l = new THREE.PointLight("#ffe3b0", 14, 10, 1.5); l.position.set(x, 3.4, 0); g.add(l); }
      const steel = std("#adb5bd", { metalness: 0.8, roughness: 0.35 }), yellow = std("#fab005", { metalness: 0.3, roughness: 0.5 });
      const M = (w.arenaData = {});
      // hydraulic press
      const px = -3.6, pz = -2.2;
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.22, 3.8, 0.4), yellow, [px + s * 0.85, 1.9, pz], g);
      mesh(new THREE.BoxGeometry(2.0, 0.4, 0.6), yellow, [px, 3.9, pz], g);
      mesh(new THREE.BoxGeometry(1.6, 0.12, 1.2), steel, [px, 0.06, pz], g);
      const rod = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 16), steel, [px, 3.3, pz], g);
      const plate = mesh(new THREE.BoxGeometry(1.5, 0.28, 1.15), std("#495057", { metalness: 0.6 }), [px, 2.8, pz], g);
      const plateStripe = mesh(new THREE.BoxGeometry(1.52, 0.08, 1.17), new THREE.MeshStandardMaterial({ map: hazardTex() }), [0, -0.1, 0], plate); plateStripe.castShadow = false;
      M.press = { x: px, z: pz, plate, rod, y: 2.8 };
      // rollers
      const rx = -1.1, rz = -2.4;
      M.rollers = { x: rx, z: rz, r: [] };
      for (const [y, dir] of [[1.75, 1], [1.08, -1]]) {
        const r = mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.7, 28), std("#868e96", { metalness: 0.7, roughness: 0.3 }), [rx, y, rz], g); r.rotation.z = Math.PI / 2;
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const ridge = mesh(new THREE.BoxGeometry(0.05, 1.7, 0.05), std("#495057", { metalness: 0.6 }), [Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], r); ridge.castShadow = false; }
        M.rollers.r.push({ m: r, dir });
      }
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.15, 2.3, 0.6), yellow, [rx + s * 0.95, 1.15, rz], g);
      // two vats: boiling water (back) and a toxic vat (front left: acid in Brutal, slime in Normal)
      const makeVat = (vx, vz, color, emissive) => {
        const tub = mesh(new THREE.CylinderGeometry(0.95, 0.85, 1.0, 40, 1, true), std("#868e96", { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), [vx, 0.5, vz], g);
        mesh(new THREE.TorusGeometry(0.95, 0.06, 10, 40), steel, [vx, 1.0, vz], g).rotation.x = Math.PI / 2;
        const liquid = mesh(new THREE.CircleGeometry(0.92, 40), new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.1, emissive, emissiveIntensity: 0.45 }), [vx, 0.86, vz], g);
        liquid.rotation.x = -Math.PI / 2; liquid.castShadow = false;
        const inside = mesh(new THREE.CylinderGeometry(0.9, 0.84, 0.85, 40), std("#495057"), [vx, 0.43, vz], g); inside.castShadow = false;
        return { x: vx, z: vz, liquid, tub, heat: 0 };
      };
      const vx = 1.4, vz = -2.3;
      M.vats = { boil: makeVat(vx, vz, "#74c0fc", "#000000"), acid: makeVat(-3.2, 0.7, "#94d82d", "#2b8a3e") };
      // fire under the boiling vat
      for (let i = 0; i < 5; i++) { const f = mesh(new THREE.ConeGeometry(0.12, 0.3, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? "#ff922b" : "#ffd43b" }), [vx + Math.cos(i * 1.3) * 0.6, 0.12, vz + Math.sin(i * 1.3) * 0.6 + 0.25], g); f.castShadow = false; }
      // padded crusher
      const cx = 3.6, cz = -2.2;
      const pad = std("#e03131", { map: padTex("#e03131", "#c92a2a"), roughness: 0.95 });
      M.crusher = { x: cx, z: cz, walls: [-1, 1].map((s) => ({ s, m: mesh(new THREE.BoxGeometry(0.35, 1.9, 1.1), pad, [cx + s * 1.05, 0.98, cz], g) })), gap: 1.05 };
      mesh(new THREE.BoxGeometry(2.8, 0.15, 1.3), yellow, [cx, 2.0, cz], g);
      // trampoline
      const tramp = new THREE.Group(); tramp.position.set(3.7, 0, 0.9); g.add(tramp);
      mesh(new THREE.TorusGeometry(0.75, 0.07, 10, 40), std("#228be6"), [0, 0.32, 0], tramp).rotation.x = Math.PI / 2;
      const net = mesh(new THREE.CircleGeometry(0.72, 40), std("#212529", { roughness: 0.4 }), [0, 0.3, 0], tramp); net.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32), std("#adb5bd"), [Math.cos(a) * 0.72, 0.16, Math.sin(a) * 0.72], tramp); }
      M.pads = [{ x: 3.7, z: 0.9, r: 0.75, net, t: 0 }];
      // signs
      const sign = (txt, x, y, z, col) => { const m = mesh(new THREE.PlaneGeometry(1.2, 0.28), new THREE.MeshBasicMaterial({ map: canvasTex(256, 60, (c) => { c.fillStyle = col; c.fillRect(0, 0, 256, 60); c.fillStyle = "#fff"; c.font = "bold 30px sans-serif"; c.textAlign = "center"; c.fillText(txt, 128, 41); }) }), [x, y, z], g); m.castShadow = false; };
      sign("PRESS", px, 4.35, pz + 0.31, "#e8590c"); sign("ROLLERS", rx, 2.55, rz + 0.31, "#1971c2"); sign("BOILING", vx, 1.45, vz - 0.2, "#e8590c"); sign("TOXIC VAT", -3.2, 1.45, 0.5, "#2f9e44");
      // glowing drop zones, shown while you drag the person around
      M.zones = [["press", px, pz, 0.95], ["rollers", rx, rz, 0.95], ["boil", vx, vz, 1.0], ["acid", -3.2, 0.7, 1.0], ["crusher", cx, cz, 1.0], ["bounce", 3.7, 0.9, 0.9]].map(([kind, x, z, r]) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 48), new THREE.MeshBasicMaterial({ color: "#ffd43b", transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z); ring.visible = false; g.add(ring);
        return { kind, x, z, r, ring };
      }); sign("CRUSHER", cx, 2.35, cz + 0.66, "#c92a2a");
      w.envUpdate = (dt, t) => {
        for (const r of M.rollers.r) r.m.rotation.x += dt * r.dir * (M.rollers.fast ? 14 : 2);
        for (const k in M.vats) { const v = M.vats[k]; v.liquid.position.y = 0.86 + Math.sin(t * 6 + (k === "acid" ? 2 : 0)) * 0.01 * (1 + v.heat * 3); }
        for (const p of M.pads) { p.t = Math.max(0, p.t - dt * 3); p.net.position.y = 0.3 - Math.sin(p.t * 12) * p.t * 0.2; }
      };
    },
    props(w) {
      P.crate(w, 0.2, 0.3, 1.2, 0.6); P.barrel(w, -1.5, 0.45, 1.4, "#2f9e44");
      staticBox(w, 1.6, 0.12, 1.2, [-3.6, 0.06, -2.2], std("#adb5bd", { metalness: 0.8 }));
    }
  };

  ENV.city = {
    name: "Mini City", icon: "🏙️", desc: "A tiny city, ready for the end of the world.", hidden: true,
    build(w, g) {
      w.scene.background = new THREE.Color("#a5d8ff"); w.scene.fog = new THREE.Fog("#a5d8ff", 16, 34);
      const floor = mesh(new THREE.PlaneGeometry(60, 40), std("#9aa39a", { map: roadTex(), roughness: 0.9 }), [0, 0, -6], g);
      floor.rotation.x = -Math.PI / 2; floor.castShadow = false; w.solids.push(floor);
      // far hills instead of walls
      for (let i = 0; i < 7; i++) { const h = mesh(new THREE.SphereGeometry(R(2.5, 4), 20, 12), std(pick(["#8ce99a", "#69db7c", "#b2f2bb"])), [-12 + i * 4, -1, -9 - R(0, 2)], g); h.scale.y = 0.6; h.castShadow = false; }
      g.add(new THREE.HemisphereLight("#ffffff", "#8a9a7a", 1.3)); w.addSun("#fff4e0", 2.4, [4, 9, 4], 8);
      w.arenaData = { city: true };
    },
    props(w) {
      const cols = ["#ffc9c9", "#ffe8cc", "#fff3bf", "#d3f9d8", "#d0ebff", "#e5dbff", "#f1f3f5", "#ffd8a8"];
      const win = windowsTex();
      const roadX = (x) => Math.abs(x - 0.0) < 0.55, roadZ = (z) => Math.abs(z + 0.85) < 0.5;
      for (let gx = -4.4; gx <= 4.45; gx += 0.75) for (let gz = -3.0; gz <= 1.7; gz += 0.8) {
        if (roadX(gx) || roadZ(gz) || (Math.abs(gx) < 1.2 && gz > -1.6) || Math.random() < 0.18) continue;
        const sz = R(0.34, 0.5), floors = Math.floor(R(1, 3.8)), col = pick(cols);
        const side = new THREE.MeshStandardMaterial({ color: col, map: win, roughness: 0.7 }), roof = new THREE.MeshStandardMaterial({ color: "#6c757d", roughness: 0.8 });
        const mat = [side, side, roof, roof, side, side];
        for (let f = 0; f < floors; f++) {
          const h = R(0.28, 0.4);
          w.addProp({ kind: "bldg", mesh: new THREE.Mesh(new THREE.BoxGeometry(sz, h, sz), mat), shape: new CANNON.Box(new CANNON.Vec3(sz / 2, h / 2, sz / 2)), mass: 0.6 + sz, pos: [gx + R(-0.06, 0.06), 0.01 + f * 0.42 + h / 2, gz + R(-0.06, 0.06)], color: col });
        }
      }
      // little cars and trees
      const carCols = ["#e03131", "#1c7ed6", "#f59f00", "#2f9e44", "#f8f9fa"];
      for (let i = 0; i < 10; i++) {
        const onX = i % 2, c = new THREE.Group();
        mesh(new THREE.BoxGeometry(0.3, 0.1, 0.15), std(pick(carCols), { roughness: 0.3, metalness: 0.3 }), [0, 0, 0], c); mesh(new THREE.BoxGeometry(0.16, 0.08, 0.13), std("#a5d8ff", { roughness: 0.1 }), [-0.02, 0.08, 0], c);
        const x = onX ? R(-4.5, 4.5) : R(-0.2, 0.2), z = onX ? -0.85 + R(-0.2, 0.2) : R(-3, 1.6);
        if (Math.abs(x) < 1.1 && z > -1.4) continue;
        w.addProp({ kind: "car", mesh: c, shape: new CANNON.Box(new CANNON.Vec3(0.15, 0.09, 0.075)), mass: 0.3, pos: [x, 0.07, z], rotY: onX ? 0 : Math.PI / 2, color: "#e03131" });
      }
      for (let i = 0; i < 8; i++) {
        const t = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18), std("#8d5a2b"), [0, -0.1, 0], t); mesh(new THREE.ConeGeometry(0.14, 0.32, 10), std("#2f9e44"), [0, 0.12, 0], t);
        const x = R(-4.6, 4.6), z = R(-3, 1.8); if (Math.abs(x) < 1.2 && z > -1.6) continue;
        w.addProp({ kind: "tree", mesh: t, shape: new CANNON.Cylinder(0.05, 0.12, 0.5, 8), mass: 0.15, pos: [x, 0.25, z], color: "#2f9e44" });
      }
    }
  };

  /* =========================================================
     THE ARENA CONTROLLER
     ========================================================= */
  const VAT_LINES = { water: ["HOT HOT HOT!", "Who turned the stove on?!", "I'm being boiled like an egg!", "Owowowow!"], acid: ["It BURNS!", "This is NOT a spa!", "My skin is fizzing!", "Get me OUT!"], slime: ["Eww, slimy!", "Is this jelly?", "Bleurgh!"] };

  class Arena {
    constructor(world, buddy, tools) {
      this.world = world; this.buddy = buddy; this.tools = tools;
      this.mode = null; this.busy = null; this.timers = []; this.fx = [];
      this.meteors = []; this.quake = 0; this.tornado = null; this.waves = [];
      this.score = 0;
      S.bus.on("wall", (d) => this.onWall(d));
      S.bus.on("gibbed", () => {
        this.busy = null; this.override = null;
        // in the arena modes a new dummy reports for duty a few seconds later
        if (this.mode) this.later(3.5, () => { if (this.mode && this.buddy.gibbed) { this.freshBuddy(); S.audio.play("unlock"); S.bus.emit("toast", "🆕 A fresh dummy reports for duty."); } });
      });
    }
    later(t, fn) { this.timers.push({ t, fn }); }
    get A() { return this.world.arenaData || {}; }
    get brutal() { return !!this.buddy.brutal; }
    hud(html) { const h = document.getElementById("arenaInfo"); if (h) h.innerHTML = html; }

    enter(mode) {
      this.mode = mode; this.score = 0; this.busy = null; this.override = null;
      const env = { wreck: "demolition", torture: "factory", apoc: "city" }[mode];
      this.tools.clear(); this.world.clearTargets && this.world.clearTargets();
      this.world.setEnvironment(env);
      this.clearFx();
      this.freshBuddy();
    }
    // a whole, standing buddy (rebuilt if they were splattered, dissolved or lost limbs)
    freshBuddy() {
      const B = this.buddy;
      this.busy = null; this.override = null; B.machinePose = null;
      if (B.gibbed || B.lost.size || B.chestOpen || B.skullOpen) B.revive(); else B.reset();
      if (S.applyStyle) S.applyStyle();
      B.home = null;
    }
    exit() {
      this.buddy.home = null;
      this.clearFx(); this.mode = null; this.busy = null; this.override = null;
      this.buddy.gravMul = 1;
      if (this.buddy.state === "machine") this.buddy.toFly(new V3(0, 0, 0));
    }
    clearFx() {
      for (const f of this.fx) { f.mesh && this.world.fxGroup.remove(f.mesh); f.body && this.world.physics.removeBody(f.body); }
      this.fx = []; this.meteors = []; this.waves = []; this.timers = []; this.quake = 0;
      if (this.tornado) { this.world.fxGroup.remove(this.tornado.g); this.tornado = null; }
      if (this.wave) { this.world.fxGroup.remove(this.wave.g); this.world.fxGroup.remove(this.wave.flood); this.wave = null; }
      if (this.ball) { this.world.fxGroup.remove(this.ball.g); this.world.fxGroup.remove(this.ball.chain); this.world.physics.removeBody(this.ball.body); this.ball = null; }
    }

    /* ---------- moving the buddy into machines ---------- */
    // take control of the buddy and glide them to a spot along an arc
    carry(to, dur, then, pose) {
      const B = this.buddy;
      if (B.gibbed) { S.bus.emit("toast", "🩹 Patch them up first!"); return false; }
      const from = B.com.clone();
      B.setState("machine"); B.machinePose = pose || "flail"; B.vel.set(0, 0, 0); B.angVel.set(0, 0, 0);
      this.busy = { kind: "carry", t: 0, dur, from, to: to.clone(), then };
      B.react("scared", dur + 0.5, pick(["Where are we going?", "Put me down!", "I don't like this…", "Wait, what's that machine for?"]));
      return true;
    }
    uprightQ() { return new Q().setFromAxisAngle(new V3(0, 1, 0), this.buddy.yawToCamera()); }
    release(v) { const B = this.buddy; this.busy = null; this.override = null; B.machinePose = null; if (B.gibbed) return; B.toFly(v || new V3(0, 0.5, 0), true); B.angVel.set(R(-3, 3), R(-2, 2), R(-3, 3)); }

    /* =========================================================
       1. WRECKING BALL
       ========================================================= */
    makeBall() {
      const g = new THREE.Group();
      const ball = mesh(new THREE.SphereGeometry(0.6, 32, 20), std("#3b3f45", { metalness: 0.85, roughness: 0.35 }), [0, 0, 0], g);
      mesh(new THREE.TorusGeometry(0.14, 0.05, 10, 20), std("#868e96", { metalness: 0.9, roughness: 0.3 }), [0, 0.66, 0], g);
      const chain = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), std("#495057", { metalness: 0.9, roughness: 0.4 }), [0, 0, 0], this.world.fxGroup);
      this.world.fxGroup.add(g);
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: S.GROUP.PROJ, collisionFilterMask: S.GROUP.PROP });
      body.addShape(new CANNON.Sphere(0.6));
      this.world.physics.addBody(body);
      return { g, ball, chain, body };
    }
    swing(target) {
      if (this.ball && this.ball.t < this.ball.dur) return;
      const W = this.world, B = this.buddy;
      if (!this.ball) this.ball = this.makeBall();
      const tg = target.clone(); tg.y = clamp(tg.y, 0.7, 2.2);
      // swing towards the farther side wall (and a little towards the back) so there's room to fly
      const side = tg.x > 0.3 ? -1 : tg.x < -0.3 ? 1 : (Math.random() < 0.5 ? -1 : 1);
      const dir = new V3(side, 0, -0.35).normalize();
      const pivot = new V3(tg.x, 7.6, tg.z);
      const L = pivot.y - tg.y;
      const om = Math.sqrt(9.8 / L) * 1.7;
      Object.assign(this.ball, { pivot, dir, L, om, th0: -1.25, t: 0, dur: 4.2, hit: false, prev: null });
      this.ball.g.visible = this.ball.chain.visible = true;
      S.audio.play("whoosh"); S.audio.play("clank");
      if (!B.gibbed && B.com.distanceTo(tg) < 1.5) B.react("scared", 1.4, pick(["Is that… a wrecking ball?", "Oh no. OH NO.", "Not the ball!"]));
    }
    updateBall(dt) {
      const b = this.ball; if (!b || b.t >= b.dur) { if (b) { b.g.visible = b.chain.visible = false; b.body.position.set(0, -30, 0); } return; }
      b.t += dt;
      const decay = Math.exp(-b.t * 0.35);
      const th = b.th0 * Math.cos(b.om * b.t) * decay;
      const pos = b.pivot.clone().addScaledVector(b.dir, Math.sin(th) * b.L).add(new V3(0, -Math.cos(th) * b.L, 0));
      // rise away at the end
      if (b.t > b.dur - 0.8) pos.y += (b.t - (b.dur - 0.8)) * 9;
      const vel = b.prev ? pos.clone().sub(b.prev).divideScalar(Math.max(dt, 1e-4)) : new V3();
      b.prev = pos.clone();
      b.g.position.copy(pos);
      b.g.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.pivot.clone().sub(pos).normalize());
      const mid = pos.clone().add(b.pivot).multiplyScalar(0.5);
      b.chain.position.copy(mid); b.chain.scale.y = pos.distanceTo(b.pivot); b.chain.quaternion.copy(b.g.quaternion);
      b.body.position.set(pos.x, pos.y, pos.z); b.body.velocity.set(vel.x, vel.y, vel.z);
      // smash the buddy
      const B = this.buddy;
      if (!b.hit && !B.gibbed && vel.length() > 4) {
        const near = Math.min(B.com.distanceTo(pos), B.headPos().distanceTo(pos) + 0.15, B.com.clone().add(new V3(0, -0.5, 0)).distanceTo(pos));
        if (near < 0.6 + 0.42) {
          b.hit = true;
          const d = vel.clone().normalize(); d.y = Math.max(d.y, 0) + 0.12; d.normalize();
          const sp = Math.max(19, vel.length() * 1.5);
          if (B.state === "machine") { this.busy = null; this.override = null; }
          B.toFly(d.multiplyScalar(sp).add(new V3(0, 2.5, 0)), true);
          B.angVel.set(R(-14, 14), R(-8, 8), R(-14, 14));
          B.wrecked = performance.now();
          B.react("scared", 1.2, pick(["WHOAAA—", "AAAAH!", "NOT LIKE THI—"]));
          S.audio.play("bong"); S.audio.play("thud", 12); this.world.shake(16); this.world.slowmo(0.45);
          this.world.stars(pos, 14);
          if (this.brutal) { this.world.splash(B.com.clone(), "#9b0000", 40, 5, 0.035); B.face.injure(14); }
          S.bus.emit("hit", { tool: "wreck", part: "torso", power: 20, flying: false });
          this.score++;
        }
      }
    }
    // the wrecked buddy hits a wall: Brutal = splattered (game over until patched up), Normal = cartoon flat
    onWall(d) {
      const B = this.buddy;
      if (!B.wrecked || performance.now() - B.wrecked > 2200 || d.speed < 8 || B.gibbed) return;
      B.wrecked = 0;
      const W = this.world, A = S.ARENA;
      const n = new V3(), p = B.com.clone();
      if (d.axis === "x") { n.set(-d.sign, 0, 0); p.x = d.sign * (A.x - 0.01); } else if (d.sign < 0) { n.set(0, 0, 1); p.z = A.zBack + 0.01; } else { n.set(0, 0, -1); p.z = A.zFront - 0.01; }
      if (this.brutal) {
        // a huge splat on the wall, drips running down, then nothing left but pieces
        W.surfaceSplat(p, n, "#8a0010", 2.2);
        for (let i = 0; i < 7; i++) W.surfaceSplat(p.clone().add(new V3(n.z * R(-0.8, 0.8), R(-0.9, 0.7), -n.x * R(-0.8, 0.8))), n, pick(["#9b0000", "#7a0010", "#b3001b"]), R(0.3, 0.9));
        for (let i = 0; i < 6; i++) W.surfaceSplat(p.clone().add(new V3(n.z * R(-0.4, 0.4), -0.3 - i * 0.28, -n.x * R(-0.4, 0.4))), n, "#7a0010", R(0.18, 0.3));
        W.bloodSpray(p.clone().addScaledVector(n, 0.4), 30, 4);
        W.splash(p.clone().addScaledVector(n, 0.3), "#9b0000", 70, 5, 0.04);
        S.audio.play("splat"); S.audio.play("crunch", 16);
        W.shake(20); W.slowmo(0.9);
        B.shatter(p.clone().addScaledVector(n, -0.6));
        S.bus.emit("toast", "💀 SPLAT! Smashed into the wall. Tap 🩹 Patch up to rebuild them.");
      } else {
        // cartoon: stuck flat to the wall, then peels off and slides down
        const at = p.clone().addScaledVector(n, 0.18);
        B.setState("machine"); B.machinePose = "spread";
        B.vel.set(0, 0, 0);
        const q = new Q().setFromUnitVectors(new V3(0, 0, 1), n);
        this.busy = { kind: "stuck", t: 0, at, q, n };
        B.react("ko", 3.5, pick(["Ow… I'm wallpaper now.", "Splat.", "I can see my house from here…"]));
        B.dizzy = 4; W.stars(at, 18); W.confetti(at, 40, 0.6);
        S.audio.play("splat"); S.audio.play("boing");
        S.bus.emit("toast", "🧱 Flat as a pancake! (Switch to 😈 Brutal for the messy version.)");
      }
    }

    // trampolines: landing on one throws the buddy back up (a little higher each time)
    updatePads(dt) {
      const B = this.buddy, A = this.A;
      if (!A.pads || B.state !== "fly" || B.gibbed) return;
      for (const p of A.pads) {
        if (Math.hypot(B.com.x - p.x, B.com.z - p.z) < p.r + 0.1 && B.com.y < 1.05 && B.vel.y < -1.5) {
          const up = Math.min(14, Math.max(8, -B.vel.y * 1.12));
          B.vel.y = up; B.vel.x *= 0.6; B.vel.z *= 0.6;
          B.vel.x += (0 - B.com.x) * 0.05; B.com.y = 1.06;
          p.t = 1; S.audio.play("boing");
          this.bounces = (this.bounces || 0) + 1;
          if (this.bounces >= 6) { this.bounces = 0; B.vel.set(R(-10, -6), 7, R(-2, 0)); B.react("scared", 1.4, "Launch sequence complete!"); }
          this.score++;
        }
      }
    }

    /* =========================================================
       4. DUMMY FACTORY
       ========================================================= */
    machine(kind) {
      const B = this.buddy, M = this.A;
      if (!M.press) return;
      if (this.busy) { S.bus.emit("toast", "⏳ One machine at a time!"); return; }
      if (B.gibbed) { S.bus.emit("toast", "🩹 Patch them up first!"); return; }
      const HIP = S.HIP;
      if (kind === "press") {
        this.carry(new V3(M.press.x, HIP, M.press.z + 0.05), 0.9, () => { this.busy = { kind: "press", t: 0, phase: 0 }; }, "flail");
      } else if (kind === "rollers") {
        this.carry(new V3(M.rollers.x, 3.4, M.rollers.z), 0.9, () => { this.busy = { kind: "rollers", t: 0 }; M.rollers.fast = true; }, "up");
      } else if (kind === "crusher") {
        this.carry(new V3(M.crusher.x, HIP, M.crusher.z + 0.05), 0.9, () => { this.busy = { kind: "crusher", t: 0 }; }, "spread");
      } else if (kind === "boil" || kind === "acid" || kind === "slime") {
        if (kind === "acid" && !this.brutal) kind = "slime";
        const V = kind === "boil" ? M.vats.boil : M.vats.acid;
        if (V !== M.vats.boil) { V.liquid.material.color.set(kind === "acid" ? "#94d82d" : "#69db7c"); V.liquid.material.emissive.set(kind === "acid" ? "#2b8a3e" : "#1b5e20"); }
        this.carry(new V3(V.x, 2.9, V.z), 0.9, () => { this.busy = { kind: "vat", t: 0, what: kind, dunked: false, V }; }, "flail");
      } else if (kind === "bounce") {
        this.carry(new V3(3.7, 2.6, 0.9), 0.8, () => { this.release(new V3(0, -2, 0)); this.bounces = 0; }, "flail");
      }
    }
    zoneAt(p) { const Z = this.A.zones; if (!Z) return null; return Z.find((z) => Math.hypot(p.x - z.x, p.z - z.z) < z.r) || null; }
    // while the person is being dragged in the factory, light up the machine underneath them
    updateZones() {
      const Z = this.A.zones; if (!Z) return;
      const dragging = this.buddy.state === "grabbed" && !this.busy;
      const over = dragging ? this.zoneAt(this.buddy.com) : null;
      for (const z of Z) { z.ring.visible = dragging; z.ring.material.color.set(z === over ? "#ff6b6b" : "#ffd43b"); z.ring.material.opacity = z === over ? 0.9 : 0.45; }
    }
    // let go of the person over a machine and in they go
    dropInto() {
      if (this.world.envId !== "factory" || this.busy || this.buddy.gibbed) return false;
      const z = this.zoneAt(this.buddy.com);
      if (!z) return false;
      for (const zz of this.A.zones) zz.ring.visible = false;
      this.machine(z.kind);
      return true;
    }
    updateBusy(dt) {
      const bz = this.busy, B = this.buddy, W = this.world, M = this.A;
      if (!bz) return;
      bz.t += dt;
      const up = this.uprightQ();
      if (B.gibbed) { this.busy = null; this.override = null; return; }
      if (bz.kind === "carry") {
        const k = Math.min(1, bz.t / bz.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        B.com.lerpVectors(bz.from, bz.to, e); B.com.y += Math.sin(e * Math.PI) * 1.2;
        B.quat.slerp(up, 0.15);
        if (k >= 1) { const f = bz.then; this.busy = null; f && f(); }
        return;
      }
      if (bz.kind === "stuck") {
        // flat against the wall for a moment, then peel off and slide down
        B.quat.slerp(bz.q, 0.3);
        if (bz.t < 1.4) B.com.copy(bz.at);
        else B.com.y = Math.max(0.6, bz.at.y - (bz.t - 1.4) * 1.6);
        this.override = { sz: Math.max(0.25, 1 - Math.min(1, bz.t * 6) * 0.75) };
        if (bz.t > 1.4 + Math.max(0, bz.at.y - 0.6) / 1.6 + 0.3) { this.override = null; B.machinePose = null; this.busy = null; B.toFly(bz.n.clone().multiplyScalar(1.2)); }
        return;
      }
      if (bz.kind === "press") {
        const P0 = M.press, top = 2.8, bottom = 0.12 + 0.14 + 0.36;
        B.com.set(P0.x, S.HIP, P0.z + 0.05); B.quat.slerp(up, 0.2);
        let y;
        if (bz.t < 0.6) y = top;
        else if (bz.t < 0.8) { y = top - (top - bottom) * ((bz.t - 0.6) / 0.2); }
        else if (bz.t < 2.4) y = bottom;
        else y = Math.min(top, bottom + (bz.t - 2.4) * 2.2);
        P0.plate.position.y = y; P0.rod.position.y = (3.75 + y) / 2 + 0.2; P0.rod.scale.y = Math.max(0.2, 3.75 - y);
        if (bz.t >= 0.8 && !bz.smashed) {
          bz.smashed = true;
          W.shake(18); W.slowmo(0.5); S.audio.play("anvil"); S.audio.play("crunch", 12);
          B.squash.v = 0.2; B.squash.target = 0.22; B.squash.hold = 1.6; B.squash.vel = 0;
          W.puff(new V3(P0.x, 0.2, P0.z), 14, "#ced4da");
          if (this.brutal) {
            this.pressCount = (this.pressCount || 0) + 1;
            W.splash(new V3(P0.x, 0.4, P0.z + 0.3), "#9b0000", 70, 5, 0.035);
            W.floorSplat(new V3(P0.x, 0, P0.z + 0.4), "#7a0010", 1.8);
            W.bloodSpray(new V3(P0.x, 0.4, P0.z), 20, 3);
            B.face.injure(25);
            if (this.pressCount >= 2) { this.pressCount = 0; B.shatter(new V3(P0.x, 0.3, P0.z)); S.bus.emit("toast", "💀 Pressed flat. Tap 🩹 Patch up."); return; }
            S.bus.emit("toast", "🗜️ Flattened! Press again to finish the job.");
          } else B.react("ko", 2.2, pick(["I'm a pancake!", "Flat… so flat…", "Can you fold me?"]));
          S.bus.emit("pancake", {});
        }
        if (bz.t > 3.3) { P0.plate.position.y = top; this.release(new V3(0, 3, 2.5)); }
        return;
      }
      if (bz.kind === "rollers") {
        const Rr = M.rollers;
        const y = 3.4 - bz.t * 1.8;
        B.com.set(Rr.x, Math.max(-0.2, y), Rr.z); B.quat.slerp(up, 0.2);
        const inGap = y < 2.6 && y > 0.1;
        if (inGap) {
          this.override = { sz: 0.12 };
          if (!bz.squeezed) { bz.squeezed = true; S.audio.play("squish"); S.audio.play("crunch", 8); W.shake(10); if (this.brutal) { B.sever("armL", new V3(-1, 0, 0), 8); B.sever("armR", new V3(1, 0, 0), 8); } }
          if (Math.random() < 0.5) W.splash(new V3(Rr.x + R(-0.5, 0.5), 1.4, Rr.z + 0.35), this.brutal ? "#9b0000" : "#ced4da", 3, 2, 0.025);
        }
        if (y < 0.4 && !bz.out) {
          bz.out = true; Rr.fast = false;
          if (this.brutal) { W.floorSplat(new V3(Rr.x, 0, Rr.z + 0.6), "#7a0010", 1.4); B.face.injure(20); }
          B.react("ko", 2, pick(["I'm paper-thin!", "Flat-pack buddy!", "Ow, my everything!"]));
          this.override = { sz: 0.12, t: 1.2 };
          this.release(new V3(0, 1.5, 3.2));
        }
        return;
      }
      if (bz.kind === "crusher") {
        const C = M.crusher;
        B.com.set(C.x, S.HIP, C.z + 0.05); B.quat.slerp(up, 0.2);
        let gap;
        if (bz.t < 0.4) gap = 1.05; else if (bz.t < 0.9) gap = 1.05 - (bz.t - 0.4) / 0.5 * 0.82; else if (bz.t < 2.2) gap = 0.23; else gap = Math.min(1.05, 0.23 + (bz.t - 2.2) * 1.4);
        for (const wl of C.walls) wl.m.position.x = C.x + wl.s * gap;
        if (gap < 0.5) this.override = { sx: clamp(gap / 0.7, 0.3, 1) };
        if (bz.t > 0.9 && !bz.hit) {
          bz.hit = true; S.audio.play("squish"); S.audio.play("thud", 10); W.shake(12);
          if (this.brutal) { W.splash(new V3(C.x, 1.8, C.z), "#9b0000", 50, 4.5, 0.03); W.bloodSpray(new V3(C.x, 1.5, C.z), 16, 3); B.face.injure(20); B.blast(new V3(C.x, 1.0, C.z), 1.2, 12); }
          else B.react("ko", 2, pick(["Squeeeeze!", "I'm a sandwich!", "Personal space!"]));
        }
        if (bz.t > 3) { this.override = null; this.release(new V3(0, 2, 3)); }
        return;
      }
      if (bz.kind === "vat") {
        const V = bz.V, w = bz.what;
        if (!bz.dunked) {
          // drop in
          const y = 2.9 - bz.t * bz.t * 9;
          B.com.set(V.x, Math.max(0.5, y), V.z); B.quat.slerp(up, 0.2);
          if (y <= 0.5) {
            bz.dunked = true; bz.t = 0;
            W.splash(new V3(V.x, 0.9, V.z), w === "acid" ? "#94d82d" : w === "slime" ? "#69db7c" : "#74c0fc", 50, 4, 0.04);
            S.audio.play("splash");
            B.react(w === "slime" ? "sputter" : "scared", 3, pick(VAT_LINES[w === "boil" ? "water" : w]));
          }
          return;
        }
        // in the liquid
        V.heat = 1;
        const shakeX = Math.sin(bz.t * 40) * 0.04;
        const sink = w === "acid" ? Math.min(1.4, bz.t * 0.55) : 0;
        B.com.set(V.x + shakeX, 0.5 - sink, V.z); B.quat.slerp(up, 0.2);
        const top = new V3(V.x + R(-0.7, 0.7), 0.9, V.z + R(-0.7, 0.7));
        if (Math.random() < 0.6) W.fx.dust.spawn({ pos: top, vel: new V3(R(-0.2, 0.2), R(0.6, 1.4), R(-0.2, 0.2)), size: R(0.1, 0.2), life: R(0.6, 1.1), color: w === "acid" ? "#d8f5a2" : "#f1f3f5", gravity: -0.4, drag: 1.5, grow: 2, floor: false });
        if (Math.random() < 0.5) W.fx.drop.spawn({ pos: top, vel: new V3(R(-0.6, 0.6), R(1, 2.4), R(-0.6, 0.6)), size: 0.03, life: 0.6, color: w === "acid" ? "#94d82d" : w === "slime" ? "#69db7c" : "#a5d8ff" });
        if (Math.floor(bz.t * 3) !== Math.floor((bz.t - dt) * 3)) S.audio.play(w === "acid" ? "hiss" : "steam");
        if (w === "boil" || w === "acid") { const sk = B.skinMat; if (sk) sk.cur.color.lerp(new THREE.Color(w === "acid" ? "#7a8a30" : "#ff6b6b"), dt * 0.6); B.face.wet = 1; }
        if (w === "acid" && bz.t > 2.6 && !bz.done) { bz.done = true; this.dissolve(V); return; }
        if (w !== "acid" && bz.t > (w === "slime" ? 1.6 : 2.6)) {
          V.heat = 0;
          if (w === "slime") this.slime();
          else B.react("cry", 2.5, pick(["I'm cooked!", "Lobster mode activated.", "Never. Again."]));
          this.release(new V3(R(-2.5, -1.5), 9, 3));
          if (w === "boil") this.later(6, () => { if (B.skinMat) B.skinMat.cur.color.set(B.look.skin); });
        }
      }
    }
    // the acid wins: the body dissolves and a skeleton bobs up
    dissolve(V) {
      const B = this.buddy, W = this.world;
      this.busy = null; this.override = null; V.heat = 0;
      B.gibbed = true; B.root.visible = false; B.state = "stand";
      const bone = std("#f1e9d2", { roughness: 0.6 });
      const pieces = [];
      const skull = new THREE.Group();
      mesh(new THREE.SphereGeometry(0.15, 20, 16), bone, [0, 0, 0], skull).scale.set(1, 1.08, 1.05);
      mesh(new THREE.BoxGeometry(0.17, 0.06, 0.14), bone, [0, -0.13, 0.03], skull);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.04, 12, 10), std("#212529"), [s * 0.055, 0.0, 0.13], skull);
      mesh(new THREE.ConeGeometry(0.02, 0.04, 6), std("#212529"), [0, -0.06, 0.145], skull).rotation.x = Math.PI;
      pieces.push([skull, 0.15]);
      const ribs = new THREE.Group();
      for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.15 - i * 0.008, 0.012, 6, 20, Math.PI * 1.6), bone, [0, -i * 0.05, 0], ribs); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI * 0.7; }
      mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3), bone, [0, -0.1, -0.13], ribs);
      pieces.push([ribs, 0.16]);
      for (let i = 0; i < 4; i++) { const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36), bone, [0, 0, 0], b); for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.035, 10, 8), bone, [0, s * 0.18, 0], b); pieces.push([b, 0.08]); }
      for (const [g, r] of pieces) B.makeGib(g, new V3(V.x + R(-0.3, 0.3), 1.1, V.z + R(-0.3, 0.3)), new Q().setFromEuler(new THREE.Euler(R(0, 3), R(0, 3), R(0, 3))), new V3(R(-2, 2), R(4, 6), R(0.5, 2.5)), r, 0.01);
      W.splash(new V3(V.x, 1, V.z), "#94d82d", 60, 4, 0.04);
      for (let i = 0; i < 20; i++) W.fx.dust.spawn({ pos: new V3(V.x + R(-0.6, 0.6), 1, V.z + R(-0.6, 0.6)), vel: new V3(R(-0.3, 0.3), R(1, 2), R(-0.3, 0.3)), size: R(0.2, 0.4), life: R(1, 2), color: "#c0eb75", gravity: -0.5, drag: 1, grow: 2.5, floor: false });
      S.audio.play("hiss"); S.audio.play("splash");
      S.bus.emit("gibbed", {});
      S.bus.emit("toast", "☠️ Dissolved. Only bones left. Tap 🩹 Patch up.");
    }
    slime() {
      const B = this.buddy;
      for (let i = 0; i < 4; i++) B.face.splat(R(0.3, 0.7), R(0.35, 0.75), "paint", "#69db7c", R(0.4, 0.7));
      const meshes = B.hitMeshes.filter((m) => m !== B.faceMesh);
      for (let i = 0; i < 14; i++) {
        const m = pick(meshes), p = m.getWorldPosition(new V3());
        const n = p.clone().sub(B.com).normalize(); n.y += R(-0.3, 0.3);
        B.addDecal(m, p.clone().addScaledVector(n, 0.08), n.normalize(), "#69db7c", R(0.25, 0.45));
      }
      B.react("sputter", 2, pick(VAT_LINES.slime));
    }

    /* =========================================================
       5. APOCALYPSE
       ========================================================= */
    meteor(target) {
      const W = this.world;
      const B = this.buddy;
      const tg = target || (!B.gibbed ? new V3(B.com.x + R(-0.7, 0.7), 0, B.com.z + R(-0.7, 0.7)) : new V3(R(-4.2, 4.2), 0, R(-3, 1.5)));
      const start = tg.clone().add(new V3(R(4, 7) * (Math.random() < 0.5 ? -1 : 1), 10, R(-6, -3)));
      const g = new THREE.Group();
      const geo = new THREE.IcosahedronGeometry(0.34, 1), pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) { const v = new V3().fromBufferAttribute(pa, i); v.multiplyScalar(R(0.8, 1.15)); pa.setXYZ(i, v.x, v.y, v.z); }
      geo.computeVertexNormals();
      mesh(geo, std("#4a3b33", { roughness: 0.9, emissive: "#ff5400", emissiveIntensity: 0.35, flatShading: true }), [0, 0, 0], g);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: "#ff922b", transparent: true, opacity: 0.35, depthWrite: false })); g.add(glow);
      g.position.copy(start); W.fxGroup.add(g);
      const v = tg.clone().sub(start).normalize().multiplyScalar(13);
      const m = { mesh: g, v, tg };
      this.meteors.push(m); this.fx.push(m);
      S.audio.play("fall");
    }
    meteorShower() { for (let i = 0; i < 9; i++) this.later(i * 0.4, () => this.meteor(i % 3 === 2 ? new V3(R(-4.2, 4.2), 0, R(-3, 1.5)) : null)); S.bus.emit("toast", "☄️ Meteor shower incoming!"); }
    updateMeteors(dt) {
      const W = this.world, B = this.buddy;
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.mesh.position.addScaledVector(m.v, dt);
        m.mesh.rotation.x += dt * 4; m.mesh.rotation.y += dt * 3;
        const p = m.mesh.position;
        const fl = W.fx.flame || W.fx.dust;
        for (let k = 0; k < 3; k++) fl.spawn({ pos: p.clone().add(new V3(R(-0.15, 0.15), R(-0.15, 0.15), R(-0.15, 0.15))), vel: m.v.clone().multiplyScalar(-0.15).add(new V3(R(-0.4, 0.4), R(0, 0.6), R(-0.4, 0.4))), size: R(0.12, 0.26), life: R(0.25, 0.5), color: pick(["#ffd43b", "#ff922b", "#ff6b6b", "#868e96"]), gravity: -1, drag: 2, floor: false, grow: 1.5 });
        const hitBuddy = !B.gibbed && B.com.distanceTo(p) < 0.8;
        if (p.y <= 0.3 || hitBuddy) {
          W.fxGroup.remove(m.mesh); this.meteors.splice(i, 1);
          const at = new V3(p.x, Math.max(0.2, p.y), p.z);
          this.tools.explode(at, this.brutal);
          W.floorSplat(new V3(at.x, 0, at.z), "#2b2b2b", 1.6);
          for (let k = 0; k < 18; k++) W.fx.shard.spawn({ pos: at.clone(), vel: new V3(R(-4, 4), R(2, 7), R(-4, 4)), size: R(0.05, 0.12), life: R(2, 3), color: pick(["#495057", "#5c3d2e", "#868e96"]), spin: 10 });
          if (hitBuddy && this.brutal && !B.gibbed) B.shatter(at);
        }
      }
    }
    earthquake() { this.quake = 4.5; this.quakeT = 0; this.later(1.2, () => { const B = this.buddy; if (!B.gibbed && B.state === "stand") { B.toFly(new V3(R(-2, 2), 3, R(-1, 1))); B.angVel.set(R(-4, 4), 0, R(-4, 4)); } }); S.bus.emit("toast", "🌋 EARTHQUAKE!"); this.buddy.react("scared", 3, pick(["The floor is moving!", "Is this a dance floor now?", "EARTHQUAAAKE!"])); }
    updateQuake(dt) {
      if (this.quake <= 0) return;
      const W = this.world, B = this.buddy;
      this.quake -= dt; this.quakeT += dt;
      W.shake(7);
      if (Math.floor(this.quakeT * 6) !== Math.floor((this.quakeT - dt) * 6)) {
        S.audio.play("thud", 4);
        for (const p of W.props) { if (!p.body.mass) continue; p.body.wakeUp(); const k = p.body.mass * R(0.4, 1.0); p.body.applyImpulse(new CANNON.Vec3(R(-k, k), k * R(0.2, 0.6), R(-k, k)), p.body.position); }
        if (Math.random() < 0.4) W.floorSplat(new V3(R(-4.5, 4.5), 0, R(-3, 1.8)), "#343a40", R(0.4, 0.9));
        if (B.state === "stand" && !B.gibbed) { B.lean.vx += R(-3, 3); B.lean.vz += R(-3, 3); if (Math.random() < 0.3) B.toFly(new V3(R(-2, 2), R(2, 4), R(-1, 1))); }
      }
    }
    twister() {
      if (this.tornado) return;
      const W = this.world, g = new THREE.Group();
      const rings = [];
      for (let i = 0; i < 12; i++) {
        const r = mesh(new THREE.TorusGeometry(0.2 + i * 0.12, 0.06 + i * 0.012, 8, 28), new THREE.MeshStandardMaterial({ color: "#868e96", transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 }), [0, 0.15 + i * 0.36, 0], g);
        r.rotation.x = Math.PI / 2; r.castShadow = false; rings.push(r);
      }
      W.fxGroup.add(g);
      const side = Math.random() < 0.5 ? -1 : 1;
      this.tornado = { g, rings, t: 0, dur: 8, x0: side * 5.5, x1: -side * 5.5, z: this.buddy.gibbed ? R(-2.2, 0.2) : this.buddy.com.z };
      S.bus.emit("toast", "🌪️ TORNADO!"); S.audio.play("whoosh");
    }
    updateTornado(dt) {
      const T = this.tornado; if (!T) return;
      const W = this.world, B = this.buddy;
      T.t += dt;
      const k = T.t / T.dur;
      const c = new V3(T.x0 + (T.x1 - T.x0) * k, 0, T.z + Math.sin(T.t * 1.3) * 0.8);
      T.g.position.copy(c);
      T.rings.forEach((r, i) => { r.rotation.z += dt * (6 - i * 0.3); r.position.x = Math.sin(T.t * 3 + i * 0.5) * 0.06 * i; });
      if (Math.random() < 0.8) W.fx.dust.spawn({ pos: c.clone().add(new V3(R(-0.5, 0.5), R(0, 0.4), R(-0.5, 0.5))), vel: new V3(R(-1, 1), R(1, 3), R(-1, 1)), size: R(0.1, 0.25), life: R(0.6, 1.2), color: "#adb5bd", gravity: -0.5, drag: 1.5, grow: 2, floor: false });
      if (Math.floor(T.t * 2) !== Math.floor((T.t - dt) * 2)) S.audio.play("whoosh");
      for (const p of W.props) {
        if (!p.body.mass) continue;
        const bp = p.body.position, dx = bp.x - c.x, dz = bp.z - c.z, d = Math.hypot(dx, dz);
        if (d > 1.7) continue;
        p.body.wakeUp();
        const f = (1 - d / 1.7) * p.body.mass * 22;
        p.body.applyForce(new CANNON.Vec3(-dz / (d + 0.1) * f - dx * f * 0.4, f * (bp.y < 3.5 ? 1.1 : 0.2), dx / (d + 0.1) * f - dz * f * 0.4), bp);
      }
      if (!B.gibbed) {
        const dx = B.com.x - c.x, dz = B.com.z - c.z, d = Math.hypot(dx, dz);
        if (d < 1.3) {
          if (B.state !== "fly" && B.state !== "machine") { B.toFly(new V3(0, 4, 0)); B.react("scared", 2, pick(["I'm flyiiing!", "Not the tornado!", "Wheeeee—help!"])); }
          if (B.state === "fly") { B.vel.x += (-dz * 9 - dx * 3) * dt; B.vel.z += (dx * 9 - dz * 3) * dt; B.vel.y += (B.com.y < 4 ? 14 : 4) * dt; B.angVel.y += dt * 12; }
        }
      }
      if (T.t > T.dur) { W.fxGroup.remove(T.g); this.tornado = null; }
    }
    shockwave(center) {
      const W = this.world, c = center || new V3(0, 0.05, -0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 64), new THREE.MeshBasicMaterial({ color: "#ffe066", transparent: true, opacity: 0.9 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(c.x, 0.1, c.z); W.fxGroup.add(ring);
      const wv = { mesh: ring, c, r: 0.2, hit: new Set() };
      this.waves.push(wv); this.fx.push(wv);
      S.audio.play("boom"); W.shake(14); W.slowmo(0.5);
      W.puff(c.clone(), 20, "#ffe8a3");
    }
    updateWaves(dt) {
      const W = this.world, B = this.buddy;
      for (let i = this.waves.length - 1; i >= 0; i--) {
        const wv = this.waves[i];
        wv.r += dt * 7;
        wv.mesh.scale.setScalar(wv.r); wv.mesh.material.opacity = Math.max(0, 0.9 - wv.r / 8);
        for (const p of W.props) {
          if (!p.body.mass || wv.hit.has(p)) continue;
          const bp = p.body.position, dx = bp.x - wv.c.x, dz = bp.z - wv.c.z, d = Math.hypot(dx, dz);
          if (d < wv.r) { wv.hit.add(p); p.body.wakeUp(); const k = p.body.mass * 5 * Math.max(0.3, 1 - d / 8); p.body.applyImpulse(new CANNON.Vec3(dx / (d + 0.1) * k, k * 0.7, dz / (d + 0.1) * k), bp); if ((p.breakable || p.balloon) && d < 3) W.toBreak.push(p); }
        }
        if (!wv.hit.has(B) && !B.gibbed) {
          const dx = B.com.x - wv.c.x, dz = B.com.z - wv.c.z, d = Math.hypot(dx, dz);
          if (d < wv.r) {
            wv.hit.add(B);
            const dir = new V3(dx, 0, dz).normalize().add(new V3(0, 0.6, 0)).normalize();
            B.applyHit({ dir, power: 13, point: B.com.clone(), part: "torso", lift: 1, dmg: this.brutal ? 20 : 0, tool: { react: ["ko", 1.5, "boom"] } });
          }
        }
        if (wv.r > 8) { W.fxGroup.remove(wv.mesh); this.waves.splice(i, 1); }
      }
    }
    tsunami() {
      if (this.wave) return;
      const W = this.world, g = new THREE.Group();
      const water = new THREE.MeshPhysicalMaterial({ color: "#1c7ed6", roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.82, clearcoat: 1, side: THREE.DoubleSide });
      // the wall of water with a curling crest
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6.4), water); body.position.set(-1.2, 1.2, -0.8); g.add(body);
      const curl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6.4, 24, 1, true, 0, Math.PI * 1.25), water); curl.rotation.x = Math.PI / 2; curl.rotation.y = Math.PI * 0.1; curl.position.set(-0.1, 2.5, -0.8); g.add(curl);
      const foam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 6.4), new THREE.MeshStandardMaterial({ color: "#f1f3f5", roughness: 0.9 })); foam.position.set(0.3, 3.2, -0.8); g.add(foam);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.position.x = -7.5; W.fxGroup.add(g);
      // the flood it leaves behind
      const flood = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), new THREE.MeshPhysicalMaterial({ color: "#339af0", roughness: 0.1, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false }));
      flood.rotation.x = -Math.PI / 2; flood.position.set(-17.5, 0.02, -0.6); W.fxGroup.add(flood);
      this.wave = { g, flood, t: 0, speed: 4.2, hitBuddy: false, front: -7.5 };
      this.fx.push({ mesh: g }, { mesh: flood });
      S.bus.emit("toast", "🌊 TSUNAMI!"); S.audio.play("splash"); S.audio.play("whoosh"); W.shake(8);
      if (!this.buddy.gibbed) this.buddy.react("scared", 2.5, pick(["Is that… a WAVE?!", "I can't swim!", "Surf's up! …AAAH!"]));
    }
    updateWave(dt) {
      const T = this.wave; if (!T) return;
      const W = this.world, B = this.buddy;
      T.t += dt;
      const front = T.front = -7.5 + T.t * T.speed;
      T.g.position.x = front; T.g.position.y = Math.sin(T.t * 3) * 0.06;
      // flood follows the wave, then drains away
      const drain = Math.max(0, T.t - 4.2);
      T.flood.position.x = Math.min(front - 10, 2.5);
      T.flood.position.y = Math.max(-0.05, 0.25 - drain * 0.1);
      T.flood.material.opacity = Math.max(0, 0.6 - drain * 0.18);
      if (front < 6.5) {
        W.shake(5);
        for (let k = 0; k < 4; k++) W.fx.drop.spawn({ pos: new V3(front + R(-0.2, 0.4), R(2.4, 3.3), R(-3.9, 2.3)), vel: new V3(R(2, 5), R(1, 4), R(-1, 1)), size: R(0.03, 0.07), life: 1, color: pick(["#a5d8ff", "#e7f5ff", "#74c0fc"]) });
        if (Math.random() < 0.5) W.fx.dust.spawn({ pos: new V3(front + 0.3, R(2.8, 3.4), R(-3.9, 2.3)), vel: new V3(R(1, 3), R(0, 1), 0), size: R(0.15, 0.3), life: R(0.4, 0.8), color: "#ffffff", gravity: -0.2, drag: 2, grow: 1.5, floor: false });
        if (Math.floor(T.t * 2) !== Math.floor((T.t - dt) * 2)) S.audio.play("splash");
        // everything the wave reaches gets swept along
        for (const p of W.props) {
          if (!p.body.mass) continue;
          const x = p.body.position.x;
          if (x < front + 0.3 && x > front - 2.6) {
            p.body.wakeUp();
            const v = p.body.velocity;
            v.x = Math.max(v.x, T.speed * R(1.3, 1.8)); v.y = Math.max(v.y, R(0.5, 2.5)); v.z += R(-0.3, 0.3);
          }
        }
        if (!T.hitBuddy && !B.gibbed && B.com.x < front + 0.5) {
          T.hitBuddy = true;
          if (B.state === "machine") { this.busy = null; this.override = null; }
          B.toFly(new V3(T.speed * 2.2, 5, R(-1, 1)), true); B.angVel.set(R(-8, 8), R(-4, 4), R(-8, 8));
          B.face.wet = 1; B.react("scared", 2.5, pick(["GLUB GLUB!", "WAAAVE!", "I'm being washed away!"]));
          if (this.brutal) B.applyHit({ dir: new V3(1, 0.3, 0), power: 12, point: B.com.clone(), part: "torso", dmg: 18, lift: 0.6, tool: { react: ["ko", 1.5] } });
          S.audio.play("splash"); W.slowmo(0.4);
        }
        // swept along while inside the wave
        if (!B.gibbed && B.state === "fly" && B.com.x < front + 0.4 && B.com.x > front - 2.6) { B.vel.x = Math.max(B.vel.x, T.speed * 1.6); B.vel.y = Math.max(B.vel.y, 1.5); }
      } else T.g.visible = false;
      if (T.t > 9) { W.fxGroup.remove(T.g); W.fxGroup.remove(T.flood); this.wave = null; }
    }
    rebuildCity() { this.tools.clear(); this.world.spawnProps(); this.world.clearFloor(); S.bus.emit("toast", this.world.envId === "city" ? "🏙️ The city has been rebuilt. Lucky them." : "↺ Everything is back in one piece."); }

    /* =========================================================
       FRAME HOOKS
       ========================================================= */
    // before the buddy moves
    update(dt) {
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
      this.updateBall(dt);
      if (this.world.envId === "factory") { this.updatePads(dt); this.updateZones(); }
      this.updateBusy(dt);
      this.updateMeteors(dt); this.updateQuake(dt); this.updateTornado(dt); this.updateWaves(dt); this.updateWave(dt);
    }
    // after the buddy has posed: squeeze effects (flattened by rollers, crushed sideways…)
    post(dt) {
      const o = this.override; if (!o || this.buddy.gibbed) return;
      const b = this.buddy.bodyG;
      if (o.sz) b.scale.z *= o.sz;
      if (o.sx) b.scale.x *= o.sx;
      if (o.t != null) { o.t -= dt; if (o.t <= 0) { this.override = null; S.audio.play("boing"); } }
      this.buddy.applyTransforms();
    }
  }
  S.Arena = Arena;
})();
