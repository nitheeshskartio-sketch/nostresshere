/* ============ SMASH IT — world: renderer, rooms, props, particles, camera ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3;
  const ARENA = (S.ARENA = { x: 5.2, zBack: -3.6, zFront: 2.4 });
  const GROUP = (S.GROUP = { STATIC: 1, PROP: 2, PROJ: 4, CHAR: 8, FRONT: 16 });
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  S.R = R; S.pick = pick;

  /* =========================================================
     TEXTURES (all drawn in code)
     ========================================================= */
  function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
  function tex(w, h, draw, rx, ry) {
    const c = mk(w, h); draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
    return t;
  }
  const T = (S.tex = {
    checker: (a, b, n) => tex(256, 256, (c) => { c.fillStyle = a; c.fillRect(0, 0, 256, 256); c.fillStyle = b; c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128); }, n, n),
    dots: (bg, dot, n) => tex(256, 256, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 256, 256); c.fillStyle = dot; for (const [x, y] of [[64, 64], [192, 192], [192, 64], [64, 192]]) { if ((x + y) % 256 === 0) continue; c.beginPath(); c.arc(x, y, 28, 0, 7); c.fill(); } c.beginPath(); c.arc(64, 64, 28, 0, 7); c.arc(192, 192, 28, 0, 7); c.fill(); }, n, n),
    concrete: (base, n) => tex(512, 512, (c) => { c.fillStyle = base; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { c.fillStyle = "rgba(" + (Math.random() < 0.5 ? "0,0,0," : "255,255,255,") + R(0.02, 0.07) + ")"; c.fillRect(R(0, 512), R(0, 512), R(1, 4), R(1, 4)); } c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = 3; c.strokeRect(0, 0, 512, 512); }, n, n),
    metal: (a, b, n) => tex(256, 256, (c) => { for (let x = 0; x < 256; x += 32) { const g = c.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, a); c.fillStyle = g; c.fillRect(x, 0, 32, 256); } }, n, 1),
    brick: (a, mortar, n) => tex(512, 256, (c) => { c.fillStyle = mortar; c.fillRect(0, 0, 512, 256); for (let r = 0; r < 8; r++) for (let i = -1; i < 9; i++) { const x = i * 64 + (r % 2) * 32; c.fillStyle = a; c.globalAlpha = R(0.8, 1); c.fillRect(x + 3, r * 32 + 3, 58, 26); } c.globalAlpha = 1; }, n, n / 2),
    wood: (a, b) => tex(256, 256, (c) => { c.fillStyle = a; c.fillRect(0, 0, 256, 256); c.strokeStyle = b; c.lineWidth = 2; for (let i = 0; i < 40; i++) { const y = R(0, 256); c.globalAlpha = R(0.2, 0.6); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(80, y + R(-6, 6), 170, y + R(-6, 6), 256, y); c.stroke(); } c.globalAlpha = 1; c.lineWidth = 14; c.strokeStyle = b; c.strokeRect(7, 7, 242, 242); c.beginPath(); c.moveTo(0, 0); c.lineTo(256, 256); c.stroke(); }),
    cardboard: () => tex(256, 256, (c) => { c.fillStyle = "#c8a165"; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { c.fillStyle = "rgba(90,60,20," + R(0.03, 0.1) + ")"; c.fillRect(R(0, 256), R(0, 256), R(1, 3), R(1, 3)); } c.fillStyle = "rgba(230,200,140,0.75)"; c.fillRect(108, 0, 40, 256); c.strokeStyle = "rgba(90,60,20,0.35)"; c.lineWidth = 4; c.strokeRect(2, 2, 252, 252); c.fillStyle = "rgba(60,40,20,0.5)"; c.font = "bold 30px sans-serif"; c.fillText("FRAGILE?", 30, 220); }),
    bullseye: () => tex(256, 256, (c) => { const cols = ["#e03131", "#fff", "#e03131", "#fff", "#e03131"]; cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(128, 128, 128 - i * 25, 0, 7); c.fill(); }); }),
    stripes: (cols) => tex(512, 256, (c) => { const w = 512 / cols.length; cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w, 0, w + 1, 256); }); }),
    soccer: () => tex(512, 256, (c) => { c.fillStyle = "#fff"; c.fillRect(0, 0, 512, 256); c.fillStyle = "#222"; for (const [x, y] of [[64, 128], [192, 128], [320, 128], [448, 128], [0, 40], [128, 40], [256, 40], [384, 40], [512, 40], [0, 216], [128, 216], [256, 216], [384, 216], [512, 216]]) { c.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); } c.fill(); } }),
    letter: (ch, bg) => tex(128, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 128, 128); c.strokeStyle = "rgba(0,0,0,0.15)"; c.lineWidth = 10; c.strokeRect(5, 5, 118, 118); c.fillStyle = "#fff"; c.font = "bold 84px Fredoka, Arial Black, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, 64, 70); }),
    ring: () => tex(512, 512, (c) => { c.fillStyle = "#1f5fbf"; c.fillRect(0, 0, 512, 512); c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 10; c.strokeRect(14, 14, 484, 484); c.fillStyle = "rgba(255,255,255,0.12)"; c.font = "bold 64px Arial Black, sans-serif"; c.textAlign = "center"; c.fillText("NO STRESS", 256, 230); c.fillText("HERE", 256, 310); }),
    sponge: () => tex(256, 256, (c) => { c.fillStyle = "#ffe066"; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { c.fillStyle = "rgba(180,140,0," + R(0.2, 0.5) + ")"; c.beginPath(); c.ellipse(R(0, 256), R(0, 256), R(3, 9), R(3, 8), R(0, 3), 0, 7); c.fill(); } }),
    polka: (bg, dot) => tex(128, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 128, 128); c.fillStyle = dot; for (const [x, y] of [[32, 32], [96, 96]]) { c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); } }, 3, 3),
    stars: (bg, n) => tex(512, 512, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 120; i++) { c.fillStyle = "rgba(255,255,255," + R(0.2, 0.9) + ")"; c.beginPath(); c.arc(R(0, 512), R(0, 512), R(0.8, 2.6), 0, 7); c.fill(); } }, n, n)
  });

  // white splat shapes (tinted per use) for decals on body/floor
  S.splatTex = [0, 1, 2, 3].map((k) => tex(256, 256, (c) => {
    c.fillStyle = "#fff";
    S.blobPath(c, 128, 128, 70, 1000 + k * 77, true); c.fill();
    for (let i = 0; i < 9; i++) { const a = R(0, 6.28), d = R(80, 118); c.beginPath(); c.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, R(4, 11), 0, 7); c.fill(); }
  }));

  // gash wound (Brutal mode)
  S.gashTex = tex(256, 128, (c) => {
    c.translate(128, 64);
    c.fillStyle = "rgba(140,10,10,0.55)"; c.beginPath(); c.ellipse(0, 0, 110, 34, 0, 0, 7); c.fill();
    c.fillStyle = "#4a0006"; c.beginPath(); c.moveTo(-100, 0);
    for (let x = -100; x <= 100; x += 12) c.lineTo(x, -6 - Math.random() * 7 + Math.abs(x) * 0.05);
    for (let x = 100; x >= -100; x -= 12) c.lineTo(x, 6 + Math.random() * 7 - Math.abs(x) * 0.05);
    c.fill();
    c.fillStyle = "#b3001b"; for (let i = 0; i < 6; i++) c.fillRect(-80 + i * 30 + Math.random() * 10, 8, 5, 18 + Math.random() * 26);
  });

  /* =========================================================
     PARTICLES (instanced, shrink to fade)
     ========================================================= */
  class Particles {
    constructor(scene, geo, mat, cap) {
      this.cap = cap;
      this.mesh = new THREE.InstancedMesh(geo, mat, cap);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.frustumCulled = false;
      const white = new THREE.Color(1, 1, 1);
      for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, white);
      this.mesh.count = 0;
      this.p = [];
      scene.add(this.mesh);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new V3(); this._e = new THREE.Euler();
    }
    spawn(o) {
      if (this.p.length >= this.cap) this.p.shift();
      const p = {
        pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : new V3(),
        rot: new V3(R(0, 6), R(0, 6), R(0, 6)), rv: o.spin != null ? new V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(o.spin) : new V3(),
        size: o.size || 0.05, life: o.life || 1, max: o.life || 1, g: o.gravity != null ? o.gravity : 9.8, drag: o.drag || 0,
        color: new THREE.Color(o.color || "#ffffff"), grow: o.grow || 0, hit: o.hit || null, floor: o.floor !== false,
        stretch: o.stretch || 0
      };
      this.p.push(p);
      return p;
    }
    update(dt) {
      let n = 0;
      const keep = [];
      for (const p of this.p) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vel.y -= p.g * dt;
        if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.pos.addScaledVector(p.vel, dt);
        p.rot.addScaledVector(p.rv, dt);
        if (p.floor && p.pos.y < 0.015) { p.pos.y = 0.015; p.vel.y *= -0.15; p.vel.x *= 0.5; p.vel.z *= 0.5; p.rv.multiplyScalar(0.4); }
        if (p.hit && p.hit(p)) continue;
        const k = p.life / p.max;
        const sc = p.grow ? p.size * (1 + (1 - k) * p.grow) : p.size * Math.min(1, k * 3);
        if (p.stretch) {
          this._q.setFromUnitVectors(new V3(0, 1, 0), p.vel.clone().normalize());
          this._s.set(sc, sc * (1 + p.stretch * Math.min(3, p.vel.length() * 0.2)), sc);
        } else {
          this._e.set(p.rot.x, p.rot.y, p.rot.z); this._q.setFromEuler(this._e); this._s.set(sc, sc, sc);
        }
        this._m.compose(p.pos, this._q, this._s);
        this.mesh.setMatrixAt(n, this._m);
        this.mesh.setColorAt(n, p.color);
        n++;
        keep.push(p);
      }
      this.p = keep;
      this.mesh.count = n;
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
    clear() { this.p = []; this.mesh.count = 0; }
  }

  /* =========================================================
     WORLD
     ========================================================= */
  class World {
    constructor(container) {
      this.container = container;
      const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      container.appendChild(r.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 120);
      this.camera.position.set(0, 1.6, 5.4);
      this.camLook = new V3(0, 1.2, 0);
      this.camMode = "auto";
      this.orbit = { az: 0, el: 0.12 };
      // free-move camera (WASD + mouse look)
      this.free = { pos: new V3(0, 1.6, 5.4), yaw: 0, pitch: -0.08 };
      this.shakeAmt = 0;
      this.closeT = 0;
      this.timeScale = 1; this.slowT = 0;
      this.raycaster = new THREE.Raycaster();

      // physics
      const w = (this.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) }));
      w.broadphase = new CANNON.SAPBroadphase(w);
      w.allowSleep = true;
      w.solver.iterations = 10;
      this.mat = { def: new CANNON.Material("def"), soft: new CANNON.Material("soft"), bouncy: new CANNON.Material("bouncy") };
      w.defaultContactMaterial.restitution = 0.25;
      w.defaultContactMaterial.friction = 0.4;
      w.addContactMaterial(new CANNON.ContactMaterial(this.mat.soft, this.mat.def, { restitution: 0.02, friction: 0.8 }));
      w.addContactMaterial(new CANNON.ContactMaterial(this.mat.bouncy, this.mat.def, { restitution: 0.75, friction: 0.3 }));
      w.addContactMaterial(new CANNON.ContactMaterial(this.mat.bouncy, this.mat.bouncy, { restitution: 0.8, friction: 0.3 }));
      this.statics = [];
      const plane = (pos, axis, angle, group) => {
        const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: this.mat.def, collisionFilterGroup: group || GROUP.STATIC });
        b.position.set(pos[0], pos[1], pos[2]);
        if (axis) b.quaternion.setFromAxisAngle(new CANNON.Vec3(axis[0], axis[1], axis[2]), angle);
        w.addBody(b);
        return b;
      };
      this.groundBody = plane([0, 0, 0], [1, 0, 0], -Math.PI / 2);
      plane([0, 0, ARENA.zBack], null, 0);
      plane([0, 0, ARENA.zFront], [0, 1, 0], Math.PI, GROUP.FRONT); // invisible: stops props, not throws
      plane([-ARENA.x, 0, 0], [0, 1, 0], Math.PI / 2);
      plane([ARENA.x, 0, 0], [0, 1, 0], -Math.PI / 2);

      // groups
      this.envGroup = new THREE.Group(); this.scene.add(this.envGroup);
      this.propGroup = new THREE.Group(); this.scene.add(this.propGroup);
      this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
      this.props = []; this.toBreak = []; this.envStatics = [];
      this.solids = []; // meshes you can aim throws at
      this.floorSplats = []; this.targets = [];
      this.envUpdate = null;
      this.softPiles = [];

      // particle systems
      const sc = this.scene;
      this.fx = {
        drop: new Particles(sc, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0 }), 900),
        confetti: new Particles(sc, new THREE.PlaneGeometry(1, 0.6), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }), 700),
        dust: new Particles(sc, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }), 220),
        feather: new Particles(sc, new THREE.PlaneGeometry(0.35, 1), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0xffffff }), 200),
        shard: new Particles(sc, new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 400),
        star: new Particles(sc, new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 160)
      };

      this.resize();
      if ("ResizeObserver" in window) new ResizeObserver(() => this.resize()).observe(container);
      else window.addEventListener("resize", () => this.resize());
    }

    resize() {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.camera.aspect = w / h;
      // keep the character comfortably in frame on tall phones
      this.camera.fov = w / h < 0.8 ? 52 : 40;
      this.camera.updateProjectionMatrix();
    }

    /* ---------- environment ---------- */
    clearEnv() {
      this.envGroup.clear();
      for (const p of this.props) { this.propGroup.remove(p.mesh); this.physics.removeBody(p.body); }
      for (const b of this.envStatics) this.physics.removeBody(b);
      this.props = []; this.envStatics = []; this.solids = [];
      this.clearFloor();
      this.envUpdate = null;
    }

    setEnvironment(id) {
      this.envId = id;
      this.clearEnv();
      const env = ENVS[id] || ENVS.studio;
      this.envDef = env;
      env.build(this, this.envGroup);
      this.spawnProps();
      if (S.audio) S.audio.startAmbience(id);
    }

    spawnProps() {
      for (const p of this.props) { this.propGroup.remove(p.mesh); this.physics.removeBody(p.body); }
      for (const b of this.envStatics) this.physics.removeBody(b);
      this.props = []; this.envStatics = []; this.softPiles = [];
      this.envDef.props(this);
    }

    addFloorAndWalls(floorMat, wallMat, opts) {
      opts = opts || {};
      const g = this.envGroup;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), floorMat);
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.z = -6;
      g.add(floor); this.solids.push(floor);
      if (wallMat) {
        const H = opts.wallH || 9;
        const back = new THREE.Mesh(new THREE.PlaneGeometry(30, H), wallMat);
        back.position.set(0, H / 2, ARENA.zBack - 0.02); back.receiveShadow = true;
        g.add(back); this.solids.push(back);
        const sideMat = opts.sideMat || wallMat;
        for (const s of [-1, 1]) {
          const side = new THREE.Mesh(new THREE.PlaneGeometry(14, H), sideMat);
          side.position.set(s * (ARENA.x + 0.02), H / 2, ARENA.zBack + 7);
          side.rotation.y = -s * Math.PI / 2; side.receiveShadow = true;
          g.add(side); this.solids.push(side);
        }
      }
    }

    addSun(color, intensity, pos, size) {
      const d = new THREE.DirectionalLight(color, intensity);
      d.position.set(pos[0], pos[1], pos[2]);
      d.castShadow = true;
      const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
      d.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
      const s = size || 7;
      Object.assign(d.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 30 });
      d.shadow.bias = -0.0004; d.shadow.normalBias = 0.02;
      d.target.position.set(0, 0.8, -0.5);
      this.envGroup.add(d, d.target);
      return d;
    }

    /* ---------- props ---------- */
    addProp(def) {
      const mesh = def.mesh;
      mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const body = new CANNON.Body({
        mass: def.mass || 0,
        material: def.soft ? this.mat.soft : def.bouncy ? this.mat.bouncy : this.mat.def,
        linearDamping: def.damp != null ? def.damp : 0.05,
        angularDamping: def.adamp != null ? def.adamp : 0.1,
        collisionFilterGroup: def.mass ? GROUP.PROP : GROUP.STATIC,
        collisionFilterMask: GROUP.STATIC | GROUP.PROP | GROUP.PROJ | GROUP.CHAR | GROUP.FRONT
      });
      (def.shapes || [[def.shape]]).forEach((s) => body.addShape(s[0], s[1], s[2]));
      body.position.set(def.pos[0], def.pos[1], def.pos[2]);
      if (def.rotY) body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), def.rotY);
      body.sleepSpeedLimit = 0.15;
      this.physics.addBody(body);
      mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion);
      this.propGroup.add(mesh);
      const prop = { mesh, body, kind: def.kind, breakable: !!def.breakable, threshold: def.threshold || 4, color: def.color || "#ccc", balloon: !!def.balloon, mass: def.mass, armed: false };
      mesh.userData.prop = prop;
      body.userData = { prop };
      if (!def.mass) this.envStatics.push(body);
      if (prop.breakable || prop.balloon) {
        setTimeout(() => { prop.armed = true; }, 1200); // ignore the initial settle
        body.addEventListener("collide", (e) => {
          if (!prop.armed || prop.broken) return;
          // balloons only pop from throws or the flying buddy, not from bumping each other
          if (prop.balloon && !(e.body.collisionFilterGroup & (GROUP.PROJ | GROUP.CHAR))) return;
          const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
          if (v > prop.threshold) this.toBreak.push(prop);
        });
      }
      this.props.push(prop);
      return prop;
    }

    breakProp(prop) {
      if (prop.broken) return;
      prop.broken = true;
      const p = prop.mesh.position.clone();
      this.propGroup.remove(prop.mesh);
      this.physics.removeBody(prop.body);
      this.props = this.props.filter((x) => x !== prop);
      if (prop.explosive) { S.bus.emit("gasBoom", p); return; }
      if (prop.balloon) {
        S.audio.play("pop");
        for (let i = 0; i < 18; i++) this.fx.confetti.spawn({ pos: p, vel: new V3(R(-2, 2), R(-1, 3), R(-2, 2)), size: 0.05, life: 1.6, color: prop.color, gravity: 3, drag: 1.5, spin: 10 });
      } else {
        S.audio.play(prop.kind === "crate" ? "wood" : "shatter");
        const n = prop.kind === "crate" ? 14 : 20;
        for (let i = 0; i < n; i++) this.fx.shard.spawn({ pos: p.clone().add(new V3(R(-0.2, 0.2), R(-0.1, 0.3), R(-0.2, 0.2))), vel: new V3(R(-3, 3), R(1, 5), R(-3, 3)), size: prop.kind === "crate" ? R(0.06, 0.16) : R(0.04, 0.1), life: R(2.5, 4), color: prop.color, spin: 10 });
        this.puff(p, 6, "#bbb");
      }
      S.bus.emit("break", { kind: prop.kind });
    }

    /* ---------- effects ---------- */
    puff(pos, n, color) {
      for (let i = 0; i < (n || 8); i++) {
        this.fx.dust.spawn({ pos: pos.clone().add(new V3(R(-0.15, 0.15), R(0, 0.1), R(-0.15, 0.15))), vel: new V3(R(-1.2, 1.2), R(0.2, 1.2), R(-1.2, 1.2)), size: R(0.08, 0.16), life: R(0.5, 0.9), color: color || "#d8d2c8", gravity: -0.3, drag: 2.5, grow: 2.5, floor: false });
      }
    }

    stars(pos, n, color) {
      for (let i = 0; i < (n || 8); i++) this.fx.star.spawn({ pos, vel: new V3(R(-3, 3), R(0, 3.5), R(-3, 3)), size: R(0.03, 0.06), life: R(0.35, 0.6), color: color || pick(["#ffd43b", "#ffffff", "#ffe066"]), gravity: 4, spin: 12, floor: false });
    }

    splash(pos, color, n, speed, size) {
      for (let i = 0; i < (n || 14); i++) {
        const v = new V3(R(-1, 1), R(0.2, 1.4), R(-1, 1)).normalize().multiplyScalar(R(0.5, 1) * (speed || 3));
        this.fx.drop.spawn({ pos, vel: v, size: R(0.6, 1.2) * (size || 0.025), life: R(0.5, 1.1), color, stretch: 0.6 });
      }
    }

    confetti(pos, n, power) {
      const cols = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac", "#ffa94d"];
      for (let i = 0; i < n; i++) {
        const v = new V3(R(-1, 1), R(0.3, 1.5), R(-1, 1)).normalize().multiplyScalar(R(2, 7) * (power || 1));
        this.fx.confetti.spawn({ pos, vel: v, size: R(0.05, 0.09), life: R(2, 4), color: pick(cols), gravity: 2.5, drag: 1.8, spin: 14 });
      }
    }

    floorSplat(point, color, size) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: pick(S.splatTex), color, transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.set(-Math.PI / 2, 0, R(0, 6.28));
      const s = (size || 0.5) * R(0.8, 1.3);
      m.scale.set(s, s, s);
      m.position.set(point.x, 0.004 + this.floorSplats.length * 0.0004, point.z);
      m.receiveShadow = true;
      this.fxGroup.add(m);
      this.floorSplats.push(m);
      if (this.floorSplats.length > 45) { const o = this.floorSplats.shift(); this.fxGroup.remove(o); o.material.dispose(); }
    }
    clearFloor() { for (const m of this.floorSplats) { this.fxGroup.remove(m); m.material.dispose(); } this.floorSplats = []; }

    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
    slowmo(d) { if (S.settings && !S.settings.slowmo) return; this.slowT = Math.max(this.slowT, d || 0.7); }
    closeUp(d) { this.closeT = Math.max(this.closeT, d || 1); }

    /* ---------- targets (Target mode) ---------- */
    spawnTarget() {
      const g = new THREE.Group();
      const face = new THREE.MeshStandardMaterial({ map: this._bull || (this._bull = T.bullseye()), roughness: 0.5 });
      const rim = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 40), [rim, face, rim]);
      disc.rotation.x = Math.PI / 2; disc.castShadow = true;
      g.add(disc);
      let x, y, z, tries = 0;
      do {
        x = R(-3.6, 3.6); y = R(0.4, 2.8); z = R(-3, 0.8); tries++;
      } while (tries < 20 && (Math.hypot(x, z) < 1.1 || this.targets.some((t) => t.position.distanceTo(new V3(x, y, z)) < 1)));
      g.position.set(x, y, z);
      g.lookAt(this.camera.position.x, y, this.camera.position.z);
      g.scale.setScalar(0.01);
      g.userData = { target: true, t: 0, base: new V3(x, y, z), phase: R(0, 6), alive: true, moving: Math.random() < 0.35 };
      disc.userData.target = g;
      this.fxGroup.add(g);
      this.targets.push(g);
      return g;
    }
    hitTarget(g) {
      if (!g.userData.alive) return;
      g.userData.alive = false;
      g.userData.dieT = 0;
      S.audio.play("ding");
      this.confetti(g.position.clone(), 40, 0.8);
      S.bus.emit("target", {});
    }
    clearTargets() { for (const t of this.targets) this.fxGroup.remove(t); this.targets = []; }
    targetMeshes() { const out = []; for (const t of this.targets) if (t.userData.alive) out.push(t.children[0]); return out; }

    /* ---------- per-frame ---------- */
    stepTime(rdt) {
      if (this.slowT > 0) {
        this.slowT -= rdt;
        this.timeScale = this.slowT > 0.25 ? 0.22 : 0.22 + (1 - this.slowT / 0.25) * 0.78;
        if (this.slowT <= 0) this.timeScale = 1;
      } else this.timeScale = 1;
    }

    update(dt, rdt, buddy) {
      // sync props
      for (const p of this.props) {
        if (p.balloon) {
          const b = p.body;
          b.applyForce(new CANNON.Vec3(0, b.mass * 9.82 * (b.position.y > 3.2 ? 0.8 : 1.12), 0), b.position);
        }
        p.mesh.position.copy(p.body.position);
        p.mesh.quaternion.copy(p.body.quaternion);
      }
      while (this.toBreak.length) this.breakProp(this.toBreak.shift());
      for (const k in this.fx) this.fx[k].update(dt);

      // targets
      for (let i = this.targets.length - 1; i >= 0; i--) {
        const g = this.targets[i], u = g.userData;
        u.t += dt;
        if (u.alive) {
          const s = Math.min(1, u.t * 4);
          g.scale.setScalar(s < 1 ? s * (1.2 - 0.2 * s) : 1);
          g.position.y = u.base.y + Math.sin(u.t * 2 + u.phase) * 0.08;
          if (u.moving) g.position.x = u.base.x + Math.sin(u.t * 1.3 + u.phase) * 0.8;
          // the flying character can smash targets too
          if (buddy && buddy.state === "fly" && buddy.com.distanceTo(g.position) < 0.75) this.hitTarget(g);
        } else {
          u.dieT += rdt;
          g.scale.setScalar(1 + u.dieT * 3);
          g.children[0].material.forEach((m) => { m.transparent = true; m.opacity = Math.max(0, 1 - u.dieT * 4); });
          if (u.dieT > 0.3) { this.fxGroup.remove(g); this.targets.splice(i, 1); }
        }
      }

      if (this.envUpdate) this.envUpdate(dt, this.time = (this.time || 0) + dt);
      this.updateCamera(rdt, buddy);
    }

    enterFree() {
      const d = new V3(); this.camera.getWorldDirection(d);
      this.free.pos.copy(this.camera.position); this.free.pos.y = 1.6;
      this.free.yaw = Math.atan2(-d.x, -d.z);
      this.free.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)), -1.2, 0.9);
      this.camMode = "free";
    }
    freeDir() { const F = this.free; return new V3(-Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), -Math.cos(F.yaw) * Math.cos(F.pitch)); }
    // mv: x = strafe right, z = forward, turn = left(+)/right(-)
    moveFree(rdt, mv, run) {
      const F = this.free;
      F.yaw += (mv.turn || 0) * rdt * 1.9;
      const fwd = new V3(-Math.sin(F.yaw), 0, -Math.cos(F.yaw)), right = new V3(Math.cos(F.yaw), 0, -Math.sin(F.yaw));
      const v = fwd.multiplyScalar(mv.z || 0).add(right.multiplyScalar(mv.x || 0));
      if (v.lengthSq() > 1) v.normalize();
      F.pos.addScaledVector(v, (run ? 6.5 : 3.6) * rdt);
      F.pos.x = THREE.MathUtils.clamp(F.pos.x, -ARENA.x + 0.3, ARENA.x - 0.3);
      F.pos.z = THREE.MathUtils.clamp(F.pos.z, ARENA.zBack + 0.3, 9);
    }

    updateCamera(rdt, buddy) {
      if (this.camMode === "free") {
        this.camera.position.lerp(this.free.pos, 1 - Math.exp(-rdt * 14));
        this.camLook.copy(this.camera.position).add(this.freeDir());
        this.camera.lookAt(this.camLook);
        if (this.shakeAmt > 0) { const a = this.shakeAmt * 0.04; this.camera.position.add(new V3(R(-a, a), R(-a, a), R(-a, a))); this.shakeAmt = Math.max(0, this.shakeAmt - rdt * 12); }
        return;
      }
      const focus = buddy ? buddy.com.clone() : new V3(0, 1, 0);
      focus.x = THREE.MathUtils.clamp(focus.x, -4, 4);
      focus.y = THREE.MathUtils.clamp(focus.y, 0.5, 3.5);
      const head = buddy ? buddy.headPos() : new V3(0, 1.9, 0);
      const modes = {
        auto: { look: focus.clone().add(new V3(0, 0.2, 0)), dist: 5.3, h: 0.45, az: 0 },
        front: { look: new V3(0, 1.15, 0).lerp(focus, 0.35), dist: 5.6, h: 0.35, az: 0 },
        side: { look: focus.clone().add(new V3(0, 0.15, 0)), dist: 4.8, h: 0.4, az: 0.95 },
        close: { look: head.clone().add(new V3(0, -0.12, 0)), dist: 2.1, h: 0.1, az: 0 },
        wide: { look: new V3(0, 1.1, -0.6).lerp(focus, 0.3), dist: 9, h: 1.6, az: 0 }
      };
      let m = modes[this.camMode] || modes.auto;
      if (this.closeT > 0) { this.closeT -= rdt; m = { look: head.clone().add(new V3(0, -0.15, 0)), dist: 2.6, h: 0.15, az: m.az }; }
      const az = m.az + this.orbit.az, el = this.orbit.el;
      const desired = m.look.clone().add(new V3(Math.sin(az) * m.dist * Math.cos(el), m.h + Math.sin(el) * m.dist, Math.cos(az) * m.dist * Math.cos(el)));
      desired.y = Math.max(0.35, desired.y);
      const k = 1 - Math.exp(-rdt * (this.closeT > 0 ? 8 : 4));
      this.camera.position.lerp(desired, k);
      this.camLook.lerp(m.look, k);
      this.camera.lookAt(this.camLook);
      if (this.shakeAmt > 0) {
        const a = this.shakeAmt * 0.04;
        this.camera.position.add(new V3(R(-a, a), R(-a, a), R(-a, a)));
        this.camera.rotateZ(R(-a, a) * 0.3);
        this.shakeAmt = Math.max(0, this.shakeAmt - rdt * 12);
      }
    }

    render() { this.renderer.render(this.scene, this.camera); }

    rayFrom(ndc) { this.raycaster.setFromCamera(ndc, this.camera); return this.raycaster; }
  }
  S.World = World;
  S.Particles = Particles;

  /* =========================================================
     PROP FACTORIES
     ========================================================= */
  const P = (S.propFactory = {
    box(w, x, y, z, s, rot) {
      const geo = new THREE.BoxGeometry(s, s, s);
      const mat = (w._cardboard = w._cardboard || new THREE.MeshStandardMaterial({ map: T.cardboard(), roughness: 0.95 }));
      return w.addProp({ kind: "box", mesh: new THREE.Mesh(geo, mat), shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)), mass: s * 2.5, pos: [x, y, z], rotY: rot || 0, color: "#c8a165" });
    },
    crate(w, x, y, z, s) {
      const mat = (w._crate = w._crate || new THREE.MeshStandardMaterial({ map: T.wood("#b07a45", "#6e4422"), roughness: 0.85 }));
      return w.addProp({ kind: "crate", mesh: new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat), shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)), mass: 3 * s, pos: [x, y, z], breakable: true, threshold: 5.5, color: "#a0703f", rotY: R(-0.3, 0.3) });
    },
    vase(w, x, y, z, color) {
      const pts = [];
      const prof = [[0, 0], [0.12, 0], [0.16, 0.08], [0.18, 0.2], [0.14, 0.34], [0.08, 0.42], [0.09, 0.5], [0.11, 0.52]];
      prof.forEach(([r, h]) => pts.push(new THREE.Vector2(r, h - 0.26)));
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05, side: THREE.DoubleSide }));
      return w.addProp({ kind: "vase", mesh, shape: new CANNON.Cylinder(0.12, 0.15, 0.52, 10), mass: 0.8, pos: [x, y, z], breakable: true, threshold: 2.2, color });
    },
    pedestal(w, x, z, h, color) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), new THREE.MeshStandardMaterial({ color: color || "#f1f3f5", roughness: 0.6 }));
      return w.addProp({ kind: "pedestal", mesh, shape: new CANNON.Box(new CANNON.Vec3(0.25, h / 2, 0.25)), mass: 0, pos: [x, h / 2, z] });
    },
    cushion(w, x, y, z, color, s) {
      s = s || 1;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 24, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      mesh.scale.y = 0.42;
      const g = new THREE.Group(); g.add(mesh);
      return w.addProp({ kind: "cushion", mesh: g, shape: new CANNON.Box(new CANNON.Vec3(0.36 * s, 0.17 * s, 0.36 * s)), mass: 0.4, soft: true, damp: 0.3, adamp: 0.5, pos: [x, y, z], rotY: R(0, 3), color });
    },
    beachball(w, x, y, z, r) {
      r = r || 0.3;
      const mat = (w._beach = w._beach || new THREE.MeshStandardMaterial({ map: T.stripes(["#ff6b6b", "#fff", "#4dabf7", "#fff", "#ffd43b", "#fff"]), roughness: 0.35 }));
      return w.addProp({ kind: "ball", mesh: new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat), shape: new CANNON.Sphere(r), mass: 0.15, bouncy: true, damp: 0.15, adamp: 0.2, pos: [x, y, z] });
    },
    pitball(w, x, y, z, color) {
      return w.addProp({ kind: "ball", mesh: new THREE.Mesh(w._pitGeo || (w._pitGeo = new THREE.SphereGeometry(0.13, 14, 10)), new THREE.MeshStandardMaterial({ color, roughness: 0.3 })), shape: new CANNON.Sphere(0.13), mass: 0.05, bouncy: true, damp: 0.3, pos: [x, y, z] });
    },
    balloon(w, x, y, z, color) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 }));
      b.scale.y = 1.18; g.add(b);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 8), b.material); knot.position.y = -0.25; knot.rotation.x = Math.PI; g.add(knot);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); str.position.y = -0.56; g.add(str);
      return w.addProp({ kind: "balloon", mesh: g, shape: new CANNON.Sphere(0.21), mass: 0.03, damp: 0.6, adamp: 0.6, pos: [x, y, z], balloon: true, threshold: 1.2, color });
    },
    medball(w, x, y, z) {
      return w.addProp({ kind: "ball", mesh: new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color: "#5c3d2e", roughness: 0.8 })), shape: new CANNON.Sphere(0.2), mass: 4, damp: 0.2, pos: [x, y, z] });
    },
    tire(w, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 12, 28), new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.9 }));
      mesh.rotation.x = Math.PI / 2;
      const g = new THREE.Group(); g.add(mesh);
      return w.addProp({ kind: "tire", mesh: g, shape: new CANNON.Cylinder(0.42, 0.42, 0.24, 12), mass: 2, pos: [x, y, z] });
    },
    block(w, x, y, z, ch, color) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ map: T.letter(ch, color), roughness: 0.5 }));
      return w.addProp({ kind: "block", mesh, shape: new CANNON.Box(new CANNON.Vec3(0.21, 0.21, 0.21)), mass: 0.5, pos: [x, y, z], rotY: R(-0.2, 0.2) });
    },
    barrel(w, x, y, z, color) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 }));
      g.add(m);
      for (const yy of [-0.3, 0.3]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.02, 6, 24), new THREE.MeshStandardMaterial({ color: "#333", metalness: 0.6, roughness: 0.4 })); r.rotation.x = Math.PI / 2; r.position.y = yy; g.add(r); }
      return w.addProp({ kind: "barrel", mesh: g, shape: new CANNON.Cylinder(0.3, 0.3, 0.9, 12), mass: 6, pos: [x, y, z] });
    }
  });

  function pyramid(w, fn, cx, cz, s, rows) {
    for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) fn(w, cx + (i - (rows - r - 1) / 2) * (s + 0.01), s / 2 + r * s + 0.01, cz, s);
  }
  function cushionPile(w, cx, cz, cols) {
    // layered so nothing starts overlapping (overlaps make physics explode)
    const layers = [
      [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]],
      [[0, -0.38], [-0.38, 0.2], [0.38, 0.2]],
      [[-0.2, 0], [0.2, 0.05]],
      [[0, 0]]
    ];
    let k = 0;
    layers.forEach((spots, li) => spots.forEach(([dx, dz]) => P.cushion(w, cx + dx + R(-0.04, 0.04), 0.2 + li * 0.38, cz + dz + R(-0.04, 0.04), cols[k++ % cols.length], li === 3 ? 0.85 : 1)));
    w.softPiles.push({ x: cx, z: cz, r: 1.1 });
  }

  /* =========================================================
     ROOMS
     ========================================================= */
  const ENVS = (S.ENVS = {
    studio: {
      name: "Studio", icon: "💡", desc: "Clean, bright, very professional.",
      build(w, g) {
        w.scene.background = new THREE.Color("#eeeaf3");
        w.scene.fog = new THREE.Fog("#eeeaf3", 14, 30);
        w.addFloorAndWalls(new THREE.MeshStandardMaterial({ color: "#e9e6ee", roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: "#f6f4f9", roughness: 0.95 }));
        g.add(new THREE.HemisphereLight("#ffffff", "#c9c2d6", 1.4));
        w.addSun("#ffffff", 2.4, [3, 7, 5]);
        const fill = new THREE.DirectionalLight("#dfe8ff", 0.7); fill.position.set(-5, 3, 3); g.add(fill);
        // softbox decor
        for (const s of [-1, 1]) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#ffffff", emissiveIntensity: 1.2 }));
          box.position.set(s * 4.4, 2.9, -3.3); box.rotation.y = -s * 0.5; g.add(box);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.9), new THREE.MeshStandardMaterial({ color: "#333" }));
          pole.position.set(s * 4.4, 1.45, -3.3); g.add(pole);
        }
      },
      props(w) {
        pyramid(w, P.box, -2.7, -1.9, 0.5, 3);
        cushionPile(w, 2.7, -1.6, ["#ffc9de", "#a5d8ff", "#fff3bf", "#d0bfff"]);
        P.pedestal(w, -1.4, -3.0, 0.8); P.vase(w, -1.4, 1.07, -3.0, "#4dabf7");
        P.pedestal(w, 1.2, -3.1, 0.6); P.vase(w, 1.2, 0.87, -3.1, "#f783ac");
        P.pedestal(w, -4.3, 0.2, 0.7); P.vase(w, -4.3, 0.97, 0.2, "#69db7c");
      }
    },
    gym: {
      name: "Boxing Gym", icon: "🥊", desc: "Spotlight, ring, crowd murmurs.",
      build(w, g) {
        w.scene.background = new THREE.Color("#14161f");
        w.scene.fog = new THREE.Fog("#14161f", 9, 22);
        const floor = new THREE.MeshStandardMaterial({ map: T.ring(), roughness: 0.8 });
        floor.map.repeat.set(1, 1);
        const outer = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: "#1c1e28", roughness: 0.9 }));
        outer.rotation.x = -Math.PI / 2; outer.position.y = -0.002; outer.receiveShadow = true; g.add(outer); w.solids.push(outer);
        const ring = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.x * 2, ARENA.zFront - ARENA.zBack), floor);
        ring.rotation.x = -Math.PI / 2; ring.position.z = (ARENA.zFront + ARENA.zBack) / 2; ring.receiveShadow = true; g.add(ring); w.solids.push(ring);
        const brick = new THREE.MeshStandardMaterial({ map: T.brick("#5a2d2a", "#2a1a19", 6), roughness: 0.95 });
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), brick); wall.position.set(0, 5, ARENA.zBack - 1.2); g.add(wall); w.solids.push(wall);
        // ropes & posts
        const ropeCols = ["#e03131", "#f8f9fa", "#1c7ed6"];
        const post = new THREE.MeshStandardMaterial({ color: "#c0c0c0", metalness: 0.8, roughness: 0.3 });
        const corners = [[-ARENA.x, ARENA.zBack], [ARENA.x, ARENA.zBack], [-ARENA.x, ARENA.zFront], [ARENA.x, ARENA.zFront]];
        corners.forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6), post); p.position.set(x, 0.8, z); p.castShadow = true; g.add(p); });
        const rope = (a, b, y, col) => {
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
          m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
          m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
          m.castShadow = true; g.add(m);
        };
        [0.55, 0.95, 1.35].forEach((y, i) => { rope(corners[0], corners[1], y, ropeCols[i]); rope(corners[0], corners[2], y, ropeCols[i]); rope(corners[1], corners[3], y, ropeCols[i]); });
        g.add(new THREE.HemisphereLight("#8899ff", "#221111", 0.6));
        const spot = new THREE.SpotLight("#fff4e0", 260, 18, 0.62, 0.45, 1.6);
        spot.position.set(0, 8, 2); spot.target.position.set(0, 0, -0.5);
        spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005;
        g.add(spot, spot.target);
        const rim1 = new THREE.PointLight("#ff4d6d", 12, 12, 1.5); rim1.position.set(-4, 3, -3); g.add(rim1);
        const rim2 = new THREE.PointLight("#4dabf7", 12, 12, 1.5); rim2.position.set(4, 3, -3); g.add(rim2);
      },
      props(w) {
        for (let i = 0; i < 3; i++) P.medball(w, -3.3 + i * 0.45, 0.2, -2.6);
        P.tire(w, 3.6, 0.13, 0.5); P.tire(w, 3.6, 0.4, 0.5); P.tire(w, 3.6, 0.67, 0.5);
        cushionPile(w, 2.6, -2.0, ["#1c7ed6", "#e03131", "#495057", "#1971c2"]);
        pyramid(w, P.box, -3, -1.0, 0.45, 2);
        P.beachball(w, -1.6, 0.3, -2.8, 0.25);
      }
    },
    cartoon: {
      name: "Cartoon Room", icon: "🎨", desc: "Polka dots, toy blocks, silly music.",
      build(w, g) {
        w.scene.background = new THREE.Color("#ffd6e7");
        w.scene.fog = null;
        w.addFloorAndWalls(new THREE.MeshStandardMaterial({ map: T.checker("#fff3bf", "#ffe066", 24), roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: T.dots("#ffc2d9", "#ffffff", 10), roughness: 0.9 }), { sideMat: new THREE.MeshStandardMaterial({ map: T.dots("#c5f6fa", "#ffffff", 6), roughness: 0.9 }) });
        g.add(new THREE.HemisphereLight("#ffffff", "#ffc9de", 1.8));
        w.addSun("#fffaf0", 2.2, [-3, 8, 5]);
        // cloud & sun decor on the wall
        const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 });
        [[-3, 3.4], [2.8, 3.8]].forEach(([x, y]) => { const c = new THREE.Group(); [[0, 0, 0.4], [0.45, -0.05, 0.32], [-0.45, -0.05, 0.32], [0.2, 0.25, 0.3]].forEach(([dx, dy, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat); s.position.set(dx, dy, 0); s.scale.z = 0.3; c.add(s); }); c.position.set(x, y, ARENA.zBack + 0.15); g.add(c); });
        const sun = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: "#ffd43b" })); sun.position.set(0.2, 4.3, ARENA.zBack + 0.05); g.add(sun);
      },
      props(w) {
        const cols = ["#ff6b6b", "#4dabf7", "#69db7c", "#ffa94d", "#b197fc", "#f783ac"];
        let k = 0;
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) P.block(w, -2.8 + (i - (2 - r) / 2) * 0.43, 0.21 + r * 0.42, -1.8, "ABCDEF"[k], cols[k++ % cols.length]);
        P.beachball(w, 1.6, 0.3, -2.6); P.beachball(w, -1.3, 0.3, -2.9, 0.22);
        cushionPile(w, 2.8, -1.4, ["#ffffff", "#ffc9de", "#fff0f6", "#ffe3e3"]);
        P.pedestal(w, -4.4, -0.5, 0.6, "#b197fc"); P.vase(w, -4.4, 0.87, -0.5, "#ffd43b");
      }
    },
    warehouse: {
      name: "Warehouse", icon: "📦", desc: "Crates to smash, echoey drips.",
      build(w, g) {
        w.scene.background = new THREE.Color("#1e1f24");
        w.scene.fog = new THREE.Fog("#1e1f24", 8, 20);
        w.addFloorAndWalls(new THREE.MeshStandardMaterial({ map: T.concrete("#7a7d82", 8), roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: T.metal("#5b6773", "#8a96a3", 10), roughness: 0.6, metalness: 0.4 }));
        g.add(new THREE.HemisphereLight("#9fb0c8", "#2a2420", 0.7));
        w.addSun("#ffcf8a", 1.6, [2, 8, 3], 8);
        const lamps = [];
        for (const x of [-2.5, 2.5]) {
          const lamp = new THREE.Group();
          const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#2b2f33", metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffe8b0" }));
          bulb.position.y = -0.1;
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2), new THREE.MeshBasicMaterial({ color: "#111" })); cord.position.y = 1.1;
          const light = new THREE.PointLight("#ffd28a", 18, 9, 1.6); light.position.y = -0.2;
          lamp.add(shade, bulb, cord, light);
          lamp.position.set(x, 3.6, -1.2);
          g.add(lamp); lamps.push(lamp);
        }
        w.envUpdate = (dt, t) => lamps.forEach((l, i) => { l.rotation.z = Math.sin(t * 0.8 + i) * 0.06; });
      },
      props(w) {
        P.crate(w, -3, 0.35, -2.2, 0.7); P.crate(w, -2.25, 0.35, -2.3, 0.7); P.crate(w, -2.65, 1.06, -2.25, 0.7);
        P.crate(w, 3.6, 0.3, 0.4, 0.6);
        P.barrel(w, 3.9, 0.45, -2.8, "#2f9e44"); P.barrel(w, 3.2, 0.45, -3.0, "#1971c2");
        pyramid(w, P.box, -0.6, -3.0, 0.45, 3);
        cushionPile(w, 2.5, -1.4, ["#adb5bd", "#ced4da", "#868e96"]);
      }
    },
    party: {
      name: "Party Room", icon: "🪩", desc: "Disco ball, balloons, ball pit.",
      build(w, g) {
        w.scene.background = new THREE.Color("#170d2b");
        w.scene.fog = new THREE.Fog("#170d2b", 10, 24);
        w.addFloorAndWalls(new THREE.MeshStandardMaterial({ map: T.checker("#2b1d55", "#3a1f6e", 20), roughness: 0.25, metalness: 0.3 }), new THREE.MeshStandardMaterial({ map: T.stars("#2a1450", 3), roughness: 0.9 }));
        g.add(new THREE.HemisphereLight("#b197fc", "#1a0f30", 0.9));
        w.addSun("#ffffff", 0.9, [2, 8, 4]);
        const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), new THREE.MeshStandardMaterial({ color: "#dddddd", metalness: 1, roughness: 0.15, flatShading: true }));
        disco.position.set(0, 3.7, -1); g.add(disco);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2), new THREE.MeshBasicMaterial({ color: "#555" })); cord.position.set(0, 4.9, -1); g.add(cord);
        const cols = ["#ff4d9d", "#4dd4ff", "#b6ff4d"];
        const spots = cols.map((c, i) => {
          const s = new THREE.SpotLight(c, 160, 16, 0.38, 0.5, 1.4);
          s.position.set(-3 + i * 3, 5, 1.5); g.add(s, s.target); return s;
        });
        spots[1].castShadow = true;
        w.envUpdate = (dt, t) => {
          disco.rotation.y += dt * 0.8;
          spots.forEach((s, i) => s.target.position.set(Math.sin(t * (0.7 + i * 0.2) + i * 2) * 3.5, 0, -1 + Math.cos(t * (0.5 + i * 0.3) + i) * 2));
        };
      },
      props(w) {
        const cols = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac"];
        for (let i = 0; i < 7; i++) P.balloon(w, R(-4, 4), R(1.5, 3), R(-3, -0.5), cols[i % cols.length]);
        let n = 0;
        for (let y = 0; y < 2; y++) for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 3; iz++) P.pitball(w, -3.55 + ix * 0.28 + y * 0.14, 0.14 + y * 0.27, -2.1 + iz * 0.28 + y * 0.14, cols[n++ % cols.length]);
        w.softPiles.push({ x: -3, z: -1.8, r: 1 });
        cushionPile(w, 2.8, -1.6, ["#f783ac", "#b197fc", "#4dabf7"]);
        P.beachball(w, 0.8, 0.3, -2.8);
      }
    }
  });
})();
