/* ============ SMASH IT — Brutal mode extras: fire, petrol, gas cylinders, pistol, K.O. ghost ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const FLAME = ["#ffd43b", "#ffa94d", "#fd7e14", "#f76707", "#e8590c", "#fab005"];
  const BURN_LINES = ["HOT HOT HOT!", "Stop, drop and roll!", "WATER! WATER!", "Why is it always fire?!", "I'm toast!"];

  class Brutal {
    constructor(world, buddy, tools) {
      this.world = world; this.buddy = buddy; this.tools = tools;
      this.puddles = []; this.spots = []; this.tracers = []; this.ghosts = []; this.timers = [];
      const W = world;
      this.flame = new S.Particles(W.scene, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }), 800);
      W.fx.flame = this.flame;
      this.fireLight = new THREE.PointLight("#ff8a2a", 0, 7, 1.6);
      W.scene.add(this.fireLight);
      this.fuelMat = new THREE.MeshStandardMaterial({ color: "#c9a227", transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      this.scorchMat = new THREE.MeshStandardMaterial({ color: "#1f1f1f", transparent: true, opacity: 0.45, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      this.flameAcc = 0; this.lineT = 0; this.sootT = 0;
      this.buildGun();
      S.bus.on("gasBoom", (pos) => this.gasExplode(pos));
    }

    later(t, fn) { this.timers.push({ t, fn }); }

    /* =========================================================
       PETROL & FIRE
       ========================================================= */
    addFuel(p) {
      let pd = this.puddles.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < q.r * 0.85 + 0.12);
      if (pd) {
        pd.amount = Math.min(3, pd.amount + 0.025);
        pd.r = Math.min(1.1, 0.22 + pd.amount * 0.32);
        pd.mesh.scale.setScalar(pd.r);
        if (pd.mesh.material !== this.fuelMat && !pd.burning) pd.mesh.material = this.fuelMat;
        if (pd.burning > 0) pd.burning += 0.06;
        return;
      }
      if (this.puddles.length >= 30) return;
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), this.fuelMat);
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.006 + this.puddles.length * 0.0003, p.z); m.scale.setScalar(0.22);
      m.receiveShadow = true;
      this.world.fxGroup.add(m);
      this.puddles.push({ x: p.x, z: p.z, r: 0.22, amount: 0.1, mesh: m, burning: 0 });
    }

    petrolHit(pos, part) {
      const B = this.buddy;
      B.soak = Math.min(1, B.soak + 0.02);
      if (B.burn > 0) { B.burn += 0.15; this.burst(pos, 6); }
      if (Math.random() < 0.25) this.world.splash(pos, "#d4a72c", 3, 1.2, 0.016);
      if (part === "head" && Math.random() < 0.08) B.react("sputter", 1, pick(["Is this… petrol?", "Why do I smell gasoline?", "Uh oh."]));
    }

    burst(pos, n, spread, speed) {
      for (let i = 0; i < n; i++) {
        this.flame.spawn({ pos: pos.clone().add(new V3(R(-1, 1), R(-0.3, 1), R(-1, 1)).multiplyScalar(spread || 0.15)), vel: new V3(R(-1, 1), R(0.5, 2), R(-1, 1)).multiplyScalar(speed || 1.5), size: R(0.06, 0.16), life: R(0.35, 0.8), color: pick(FLAME), gravity: -2, drag: 1.5, floor: false });
      }
    }

    // set fire to whatever is near a point
    ignite(point, radius) {
      radius = radius || 0.5;
      let any = false;
      for (const pd of this.puddles) if (!pd.burning && pd.amount > 0 && Math.hypot(pd.x - point.x, pd.z - point.z) < pd.r + radius) { pd.burning = 3 + pd.amount * 4; any = true; }
      const B = this.buddy;
      if (B.approxHit(point) || B.com.distanceTo(point) < radius + 0.55) { this.burnBuddy(); any = true; }
      for (const p of this.world.props) if (p.explosive && p.mesh.position.distanceTo(point) < radius + 0.45) p.heat = Math.max(p.heat || 0, 1.1);
      if (!any) this.spots.push({ x: point.x, y: Math.max(0.02, point.y), z: point.z, t: 2.5 });
      this.burst(point, 18, 0.2, 2);
      S.audio.play("ignite");
      S.bus.emit("ignite", {});
    }

    burnBuddy() {
      const B = this.buddy;
      if (B.gibbed) return;
      const dur = 4 + B.soak * 9;
      if (B.burn <= 0) B.react("scared", 1.5, pick(BURN_LINES));
      B.burn = Math.max(B.burn, dur);
      B.soak = 0;
    }

    douse(pos, radius) {
      let n = 0;
      for (const pd of this.puddles) if (pd.burning > 0 && Math.hypot(pd.x - pos.x, pd.z - pos.z) < pd.r + radius) { pd.burning = Math.max(0, pd.burning - 0.5); n++; }
      for (const sp of this.spots) if (Math.hypot(sp.x - pos.x, sp.z - pos.z) < radius + 0.3) sp.t = 0;
      if (n && Math.random() < 0.2) { this.world.puff(pos, 3, "#e9ecef"); S.audio.play("steam"); }
    }
    douseBuddy(pos) {
      const B = this.buddy;
      if (B.burn > 0) {
        B.burn = Math.max(0, B.burn - 0.6);
        this.world.puff(pos, 2, "#e9ecef");
        if (B.burn <= 0) { S.audio.play("steam"); B.react("sputter", 1.4, pick(["Phew!", "Thank you!", "I'm extra crispy."])); }
      }
      B.soak = Math.max(0, B.soak - 0.05);
    }

    /* =========================================================
       GAS CYLINDERS
       ========================================================= */
    placeGas(point, onBuddy) {
      const A = S.ARENA, B = this.buddy;
      const p = point.clone();
      if (onBuddy) { p.copy(B.com).add(new V3(R(0.55, 0.75) * (Math.random() < 0.5 ? -1 : 1), 0, R(0.2, 0.4))); }
      p.x = THREE.MathUtils.clamp(p.x, -A.x + 0.4, A.x - 0.4);
      p.z = THREE.MathUtils.clamp(p.z, A.zBack + 0.4, A.zFront - 0.4);
      if (!onBuddy && Math.hypot(p.x - B.com.x, p.z - B.com.z) < 0.45) p.x += 0.55;
      const g = new THREE.Group();
      const red = new THREE.MeshStandardMaterial({ color: "#d62828", roughness: 0.35, metalness: 0.35 });
      const steel = new THREE.MeshStandardMaterial({ color: "#ced4da", roughness: 0.25, metalness: 0.9 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.56, 24), red); g.add(body);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); top.position.y = 0.28; g.add(top);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.04, 24), steel); bot.position.y = -0.3; g.add(bot);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 12), steel); neck.position.y = 0.48; g.add(neck);
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 18), steel); valve.position.y = 0.54; valve.rotation.x = Math.PI / 2; g.add(valve);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.08, 24), new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.5 })); band.position.y = 0.05; g.add(band);
      const prop = this.world.addProp({ kind: "gas", mesh: g, shapes: [[new CANNON.Cylinder(0.16, 0.16, 0.82, 12), new CANNON.Vec3(0, 0.1, 0)]], mass: 6, pos: [p.x, 0.33, p.z], breakable: true, threshold: 9, color: "#d62828" });
      prop.explosive = true; prop.heat = 0;
      const gas = this.world.props.filter((q) => q.explosive);
      if (gas.length > 6) { const old = gas[0]; old.broken = true; this.world.propGroup.remove(old.mesh); this.world.physics.removeBody(old.body); this.world.props = this.world.props.filter((q) => q !== old); }
      S.audio.play("clank");
      S.bus.emit("placeGas", {});
    }

    gasExplode(pos) {
      const W = this.world, B = this.buddy;
      this.boomSrc = "gas";
      this.tools.explode(pos.clone().add(new V3(0, 0.2, 0)), true);
      this.boomSrc = null;
      for (let i = 0; i < 70; i++) this.flame.spawn({ pos: pos.clone().add(new V3(R(-0.3, 0.3), R(0, 0.6), R(-0.3, 0.3))), vel: new V3(R(-4, 4), R(1, 7), R(-4, 4)), size: R(0.12, 0.3), life: R(0.5, 1.1), color: pick(FLAME), gravity: -1, drag: 2.2, floor: false });
      W.shake(18); W.slowmo(0.9);
      const d = B.com.distanceTo(pos);
      B.blast(pos, 2.8, 18);
      this.ignite(pos, 1.3);
      // chain reaction
      for (const p of W.props) if (p.explosive && p.mesh.position.distanceTo(pos) < 2.4) p.heat = Math.max(p.heat || 0, 1.35);
      S.bus.emit("gasBoom2", {});
    }

    onExplosion(pos) {
      const B = this.buddy, d = B.com.distanceTo(pos);
      B.blast(pos, 2.2, 13);
      if (d < 1.4) this.burnBuddy();
      for (const pd of this.puddles) if (Math.hypot(pd.x - pos.x, pd.z - pos.z) < pd.r + 1) pd.burning = Math.max(pd.burning, 3 + pd.amount * 4);
      for (const p of this.world.props) if (p.explosive && p.mesh.position.distanceTo(pos) < 2.2) p.heat = Math.max(p.heat || 0, 1.35);
    }

    /* =========================================================
       PISTOL
       ========================================================= */
    buildGun() {
      const W = this.world;
      if (!W.camera.parent) W.scene.add(W.camera);
      const g = new THREE.Group();
      const dark = new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 0.35, metalness: 0.7 });
      const grip = new THREE.MeshStandardMaterial({ color: "#5c3d2e", roughness: 0.7 });
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.26), dark); slide.position.set(0, 0.03, 0.06); g.add(slide);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), dark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, 0.2); g.add(barrel);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.06), grip); handle.position.set(0, -0.05, -0.04); handle.rotation.x = -0.25; g.add(handle);
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), dark); guard.position.set(0, -0.005, 0.02); guard.rotation.y = Math.PI / 2; g.add(guard);
      this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, 0.03, 0.23); g.add(this.muzzle);
      this.flash = new THREE.PointLight("#ffd27a", 0, 5, 2); this.flash.position.set(0, 0.03, 0.3); g.add(this.flash);
      this.flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0 })); this.flashMesh.position.copy(this.muzzle.position); g.add(this.flashMesh);
      g.position.set(0.24, -0.2, -0.55);
      g.visible = false;
      W.camera.add(g);
      this.gun = g; this.recoil = 0;
    }
    showGun(on) { this.gun.visible = !!on; }

    /* =========================================================
       SAW CUTTER (hold to cut)
       ========================================================= */
    buildSaw() {
      const g = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: "#ced4da", metalness: 0.95, roughness: 0.2 });
      const disc = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 40), steel); blade.rotation.x = Math.PI / 2; disc.add(blade);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 4), steel); t.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0); t.rotation.z = a - Math.PI / 2 + 0.4; disc.add(t); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), new THREE.MeshStandardMaterial({ color: "#343a40", metalness: 0.6 })); hub.rotation.x = Math.PI / 2; disc.add(hub);
      g.add(disc);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: "#f59f00", roughness: 0.45 })); body.position.set(0.08, 0.12, -0.08); g.add(body);
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 30, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: "#e8590c", side: THREE.DoubleSide, roughness: 0.5 })); guard.rotation.x = Math.PI / 2; guard.position.z = -0.03; g.add(guard);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10), new THREE.MeshStandardMaterial({ color: "#212529" })); handle.rotation.z = Math.PI / 2; handle.position.set(0.24, 0.16, -0.08); g.add(handle);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.visible = false;
      this.world.fxGroup.add(g);
      g.userData.disc = disc;
      return g;
    }

    buildChainsaw() {
      // the bar points along +Z (toward what you aim at)
      const g = new THREE.Group();
      const orange = new THREE.MeshStandardMaterial({ color: "#f76707", roughness: 0.45 });
      const dark = new THREE.MeshStandardMaterial({ color: "#212529", roughness: 0.5 });
      const steel = new THREE.MeshStandardMaterial({ color: "#adb5bd", metalness: 0.9, roughness: 0.25 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.3), orange); body.position.set(0, 0.02, -0.12); g.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.22), dark); cap.position.set(0, 0.13, -0.12); g.add(cap);
      const top = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 20, Math.PI), dark); top.position.set(0, 0.14, -0.14); top.rotation.y = Math.PI / 2; g.add(top);
      const rear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), dark); rear.position.set(0, -0.02, -0.33); g.add(rear);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.08, 0.5), steel); bar.position.set(0, -0.01, 0.27); g.add(bar);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), steel); tip.rotation.z = Math.PI / 2; tip.position.set(0, -0.01, 0.52); g.add(tip);
      // chain teeth travel around the bar
      const teeth = [];
      for (let i = 0; i < 26; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.022), dark); g.add(t); teeth.push(t); }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.visible = false;
      this.world.fxGroup.add(g);
      g.userData.teeth = teeth; g.userData.chain = 0;
      return g;
    }

    showSaw(kind) {
      this.saws = this.saws || {};
      for (const k in this.saws) this.saws[k].visible = false;
      this.sawFx = this.sawFx || 0; this.sawLine = this.sawLine || 0; this.sawHit = this.sawHit || 0;
      if (!kind) { this.saw = null; S.audio.sawLevel(false, false); return; }
      if (!this.saws[kind]) { this.saws[kind] = kind === "chainsaw" ? this.buildChainsaw() : this.buildSaw(); this.saws[kind].scale.setScalar(2.2); } // big enough to read from the locked camera
      this.saw = this.saws[kind]; this.sawKind = kind;
      this.saw.visible = true;
    }

    sawUpdate(dt, ndc, held) {
      if (!this.saw || !this.saw.visible) return;
      const W = this.world, B = this.buddy;
      const ray = W.rayFrom(ndc);
      const list = B.hitMeshes.concat(W.propGroup.children, W.solids);
      const h = ray.intersectObjects(list, true)[0];
      const dir = ray.ray.direction.clone();
      // (no distance cap: the locked camera sits 8-13 m from the buddy)
      const target = h ? h.point.clone() : ray.ray.at(Math.max(2, W.camera.position.distanceTo(B.com) - 0.4), new V3());
      const chain = this.sawKind === "chainsaw";
      const right = new V3().crossVectors(dir, new V3(0, 1, 0)).normalize();
      if (chain) {
        // bar reaches out to the point you aim at
        // held from the side so you can see the bar and chain biting in
        const tip = target.clone().addScaledVector(dir, held && h ? 0.05 : -0.1);
        const want = tip.clone().addScaledVector(right, 0.45).add(new V3(0, -0.18, 0)).addScaledVector(dir, -0.95);
        this.saw.position.lerp(want, Math.min(1, dt * 25));
        this.saw.lookAt(tip);
        const u = this.saw.userData;
        u.chain = (u.chain + dt * (held ? 3 : 0.3)) % 1;
        u.teeth.forEach((t, i) => {
          let f = (i / u.teeth.length + u.chain) % 1, y, z;
          if (f < 0.42) { y = 0.035; z = 0.02 + (f / 0.42) * 0.5; } else if (f < 0.5) { const a = ((f - 0.42) / 0.08) * Math.PI; y = Math.cos(a) * 0.035; z = 0.52 + Math.sin(a) * 0.04; }
          else if (f < 0.92) { y = -0.055; z = 0.52 - ((f - 0.5) / 0.42) * 0.5; } else { const a = ((f - 0.92) / 0.08) * Math.PI; y = -Math.cos(a) * 0.045 - 0.01; z = 0.02 - Math.sin(a) * 0.03; }
          t.position.set(0, y - 0.01, z);
        });
      } else {
        // hover the blade just in front of whatever you point at
        // the blade's lower edge bites into the point you aim at
        this.saw.position.lerp(target.clone().add(new V3(0, 0.3, 0)).addScaledVector(dir, held && h ? 0.02 : -0.15), Math.min(1, dt * 25));
        this.saw.lookAt(W.camera.position);
        this.saw.userData.disc.rotation.z -= dt * (held ? 60 : 4);
      }
      const cutting = !!(held && h);
      S.audio.sawLevel(held, cutting, chain);
      if (!cutting) return;
      this.saw.position.x += R(-0.01, 0.01); this.saw.position.y += R(-0.01, 0.01);
      W.shake(0.6);
      this.sawFx -= dt; this.sawLine -= dt; this.sawHit -= dt;
      const o = h.object, part = o.userData && o.userData.part;
      if (part) {
        // cutting the buddy
        if (part === "arm" || part === "leg") {
          const lp = h.point.clone().sub(B.com).applyQuaternion(B.invQuat());
          B.hurtLimb(part + (lp.x > 0 ? "L" : "R"), (chain ? 55 : 40) * dt, dir, 10);
        } else B.hurtCore(part, (chain ? 55 : 40) * dt, dir, false);
        B.nudge(dir, 0.12, part);
        if (this.sawFx <= 0) {
          this.sawFx = 0.05;
          W.splash(h.point, pick(["#9b0000", "#b3001b", "#7a0010"]), 4, 2.5, 0.022);
          // the blade throws a rooster-tail of blood off in the direction it spins
          const throwDir = chain ? dir.clone().negate().add(new V3(0, -0.35, 0)).addScaledVector(right, 0.35).normalize() : right.clone().add(new V3(0, 0.55, 0)).addScaledVector(dir, -0.4).normalize();
          for (let i = 0; i < 6; i++) W.fx.drop.spawn({ pos: h.point.clone(), vel: throwDir.clone().multiplyScalar(R(3, 6.5)).add(new V3(R(-0.6, 0.6), R(-0.3, 0.6), R(-0.6, 0.6))), size: R(0.01, 0.024), life: 1.3, color: pick(["#9b0000", "#b3001b", "#7a0010"]), stretch: 0.9, hit: (pt) => { if (pt.pos.y < 0.03) { if (Math.random() < 0.25) W.floorSplat(pt.pos, "#7a0010", R(0.12, 0.26)); return true; } return false; } });
          if (Math.random() < 0.35) W.fx.shard.spawn({ pos: h.point.clone(), vel: throwDir.clone().multiplyScalar(R(2, 4)).add(new V3(0, R(0.5, 1.5), 0)), size: R(0.015, 0.035), life: R(2, 3), color: pick(["#8f1212", "#6b0b0b", "#e8b9a0"]), spin: 12 });
          if (Math.random() < 0.3) W.floorSplat(new V3(h.point.x + R(-0.3, 0.3), 0, h.point.z + R(-0.3, 0.3)), "#7a0010", R(0.2, 0.4));
        }
        if (this.sawHit <= 0) {
          this.sawHit = 0.35;
          if (o !== B.faceMesh) { B.addDecal(o, h.point, dir.clone().negate(), "#ffffff", 0.2, S.gashTex); B.addBleed(o, h.point, 2); }
          else B.face.injure(9);
          if (part === "torso" || part === "head") B.hurtCore(part, 0, dir, true);
          W.bloodSpray(h.point, 2, 2);
          S.bus.emit("hit", { tool: this.sawKind, part, power: 6, flying: B.state === "fly" });
        }
        if (this.sawLine <= 0) { this.sawLine = R(1.4, 2.2); B.react("scared", 1.4, pick(chain ? ["AAAAH!", "A CHAINSAW?!", "Where did you even GET that?!", "This is not stress relief!", "I'm too young for this!"] : ["AAAAH!", "NOT THE SAW!", "That's a SAW!", "Put it down! PUT IT DOWN!", "I'm too young for this!"])); }
        return;
      }
      // metal, props or walls: sparks
      if (this.sawFx <= 0) { this.sawFx = 0.05; W.stars(h.point, 3, pick(["#ffe066", "#ffffff", "#ffa94d"])); }
      let po = o; while (po && !(po.userData && po.userData.prop)) po = po.parent;
      const prop = po && po.userData.prop;
      if (prop) {
        prop.sawT = (prop.sawT || 0) + dt;
        if (prop.body.mass) { prop.body.wakeUp(); prop.body.applyImpulse(new CANNON.Vec3(dir.x, 0.2, dir.z).scale(dt * 6), prop.body.position); }
        if (prop.kind === "limb" && this.sawFx <= 0.01) W.splash(h.point, "#9b0000", 4, 2, 0.02);
        if ((prop.breakable || prop.balloon || prop.explosive) && prop.sawT > 0.6) W.toBreak.push(prop);
      }
    }

    shoot(ndc) {
      const W = this.world, B = this.buddy;
      const ray = W.rayFrom(ndc);
      const dir = ray.ray.direction.clone();
      const list = B.hitMeshes.concat(W.targetMeshes(), W.propGroup.children, W.solids);
      const h = ray.intersectObjects(list, true)[0];
      const from = this.muzzle.getWorldPosition(new V3());
      const end = h ? h.point.clone() : ray.ray.at(30, new V3());
      S.audio.play("bang");
      this.recoil = 1; this.flash.intensity = 6; this.flashMesh.material.opacity = 1;
      W.shake(1.6);
      // tracer
      const geo = new THREE.BufferGeometry().setFromPoints([from, end]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#ffe8a3", transparent: true, opacity: 0.9 }));
      W.fxGroup.add(line); this.tracers.push({ line, t: 0.08 });
      if (!h) return;
      let o = h.object;
      if (o.userData.part) {
        const head = o.userData.part === "head";
        B.applyHit({ dir, power: head ? 6 : 4, point: h.point, part: o.userData.part, tool: { id: "gun", react: head ? ["ko", 1.2, "brutal"] : null }, dmg: head ? 25 : 12, cut: true });
        this.tools.gore(h.point, dir, o.userData.part, o, head ? 9 : 6);
        if (B.burn <= 0 && B.soak > 0.3 && Math.random() < 0.3) this.burnBuddy();
        S.bus.emit("hit", { tool: "gun", part: o.userData.part, power: head ? 9 : 6, flying: B.state === "fly" });
        if (head) S.bus.emit("headshot", {});
        return;
      }
      if (o.userData.target) { W.hitTarget(o.userData.target); return; }
      while (o && !(o.userData && o.userData.prop)) o = o.parent;
      const prop = o && o.userData.prop;
      if (prop) {
        if (prop.body.mass) { prop.body.wakeUp(); prop.body.applyImpulse(new CANNON.Vec3(dir.x, dir.y, dir.z).scale(3), new CANNON.Vec3(h.point.x, h.point.y, h.point.z)); }
        if (prop.explosive || prop.breakable || prop.balloon) W.toBreak.push(prop);
      }
      W.puff(h.point, 3, "#cfc8bc");
      W.stars(h.point, 4, "#ffe066");
    }

    /* =========================================================
       PER FRAME
       ========================================================= */
    update(dt, rdt) {
      const W = this.world, B = this.buddy;
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
      const fires = [];
      this.flameAcc += dt;
      const spawnN = (rate) => { let n = rate * dt; let k = Math.floor(n); if (Math.random() < n - k) k++; return k; };

      for (const pd of this.puddles) {
        if (pd.burning <= 0) continue;
        pd.burning -= dt;
        for (let i = 0, n = spawnN(30 + pd.r * 60); i < n; i++) {
          const a = R(0, 6.28), rr = Math.sqrt(Math.random()) * pd.r;
          this.flame.spawn({ pos: new V3(pd.x + Math.cos(a) * rr, 0.03, pd.z + Math.sin(a) * rr), vel: new V3(R(-0.2, 0.2), R(1, 2.4), R(-0.2, 0.2)), size: R(0.05, 0.12) * (0.7 + pd.r * 0.6), life: R(0.35, 0.75), color: pick(FLAME), gravity: -1.2, floor: false });
        }
        if (Math.random() < dt * 3) W.fx.dust.spawn({ pos: new V3(pd.x, 0.6, pd.z), vel: new V3(R(-0.2, 0.2), R(0.6, 1.2), R(-0.2, 0.2)), size: R(0.12, 0.2), life: 1.4, color: "#3d3d3d", gravity: -0.3, drag: 1, grow: 2.5, floor: false });
        fires.push({ x: pd.x, z: pd.z, y: 0, r: pd.r });
        for (const q of this.puddles) if (!q.burning && q.amount > 0 && Math.hypot(q.x - pd.x, q.z - pd.z) < q.r + pd.r + 0.15) q.burning = 3 + q.amount * 4;
        if (B.burn <= 0 && B.com.y < 1.4 && Math.hypot(B.com.x - pd.x, B.com.z - pd.z) < pd.r + 0.25) this.burnBuddy();
        if (pd.burning <= 0) { pd.amount = 0; pd.mesh.material = this.scorchMat; }
      }
      for (let i = this.spots.length - 1; i >= 0; i--) {
        const sp = this.spots[i];
        sp.t -= dt;
        for (let k = 0, n = spawnN(25); k < n; k++) this.flame.spawn({ pos: new V3(sp.x + R(-0.12, 0.12), sp.y, sp.z + R(-0.12, 0.12)), vel: new V3(R(-0.2, 0.2), R(1, 2), R(-0.2, 0.2)), size: R(0.05, 0.1), life: R(0.3, 0.6), color: pick(FLAME), gravity: -1, floor: false });
        fires.push({ x: sp.x, z: sp.z, y: sp.y, r: 0.25 });
        if (sp.t <= 0) this.spots.splice(i, 1);
      }

      // the buddy on fire
      if (B.burn > 0) {
        B.burn -= dt;
        const inv = B.quat;
        for (let i = 0, n = spawnN(55); i < n; i++) {
          const local = new V3(R(-0.28, 0.28), R(-0.95, 1.15), R(-0.22, 0.22)).applyQuaternion(inv);
          this.flame.spawn({ pos: B.com.clone().add(local), vel: new V3(R(-0.3, 0.3), R(1.2, 2.6), R(-0.3, 0.3)), size: R(0.06, 0.15), life: R(0.3, 0.65), color: pick(FLAME), gravity: -1.5, floor: false });
        }
        if (Math.random() < dt * 6) W.fx.dust.spawn({ pos: B.com.clone().add(new V3(0, 1.1, 0)), vel: new V3(R(-0.2, 0.2), R(0.8, 1.4), R(-0.2, 0.2)), size: R(0.12, 0.2), life: 1.3, color: "#2f2f2f", gravity: -0.3, drag: 1, grow: 2.5, floor: false });
        this.sootT -= dt;
        if (this.sootT <= 0) { this.sootT = 0.9; B.face.splat(R(0.3, 0.7), R(0.3, 0.7), "soot", null, R(0.3, 0.5)); }
        this.lineT -= dt;
        if (this.lineT <= 0 && !B.dead) { this.lineT = R(1.6, 2.6); B.react("scared", 1.5, pick(BURN_LINES)); }
        fires.push({ x: B.com.x, z: B.com.z, y: B.com.y, r: 0.5 });
        for (const pd of this.puddles) if (!pd.burning && pd.amount > 0 && B.com.y < 1.4 && Math.hypot(B.com.x - pd.x, B.com.z - pd.z) < pd.r + 0.3) pd.burning = 3 + pd.amount * 4;
        if (B.burn <= 0) { B.burn = 0; W.puff(B.com.clone().add(new V3(0, 0.8, 0)), 6, "#555"); }
      }

      // gas cylinders heat up near fire, then go boom
      for (const p of W.props) {
        if (!p.explosive || p.broken) continue;
        const pos = p.mesh.position;
        const near = fires.some((f) => Math.hypot(f.x - pos.x, f.z - pos.z) < f.r + 0.5 && Math.abs(f.y - pos.y) < 1.4);
        if (near) p.heat = (p.heat || 0) + dt;
        if (p.heat > 0) {
          if (Math.random() < dt * 8) this.flame.spawn({ pos: pos.clone().add(new V3(0, 0.55, 0)), vel: new V3(R(-0.5, 0.5), R(1, 2), R(-0.5, 0.5)), size: 0.05, life: 0.4, color: "#ffd166", gravity: -1, floor: false });
          if (!p.hissing && p.heat > 0.3) { p.hissing = true; S.audio.play("hiss"); }
          if (p.heat > 1.5) W.toBreak.push(p);
        }
      }

      // firelight + crackle
      const main = B.burn > 0 ? { x: B.com.x, y: B.com.y + 0.6, z: B.com.z } : fires[0] ? { x: fires[0].x, y: fires[0].y + 0.6, z: fires[0].z } : null;
      if (main) { this.fireLight.position.set(main.x, main.y, main.z); this.fireLight.intensity = 6 + Math.random() * 4 + Math.min(10, fires.length * 1.5); }
      else this.fireLight.intensity = 0;
      S.audio.fireLevel(Math.min(1, fires.length * 0.3));

      // tracers, gun, ghosts
      for (let i = this.tracers.length - 1; i >= 0; i--) { const t = this.tracers[i]; t.t -= rdt; t.line.material.opacity = Math.max(0, t.t / 0.08); if (t.t <= 0) { W.fxGroup.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); this.tracers.splice(i, 1); } }
      if (this.gun.visible) {
        const ray = W.rayFrom(new THREE.Vector2(B.pointer.x, B.pointer.y));
        this.gun.lookAt(ray.ray.at(8, new V3()));
        this.recoil = Math.max(0, this.recoil - rdt * 8);
        this.gun.rotateX(-this.recoil * 0.35);
        this.gun.position.z = -0.55 + this.recoil * 0.06;
      }
      this.flash.intensity = Math.max(0, this.flash.intensity - rdt * 60);
      this.flashMesh.material.opacity = Math.max(0, this.flashMesh.material.opacity - rdt * 14);
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        const gh = this.ghosts[i];
        gh.t += rdt;
        gh.g.position.y += rdt * 0.7;
        gh.g.position.x += Math.sin(gh.t * 3) * rdt * 0.3;
        gh.m.opacity = Math.max(0, 0.75 - Math.max(0, gh.t - 2) * 0.5);
        if (gh.t > 3.6) { W.fxGroup.remove(gh.g); this.ghosts.splice(i, 1); }
      }
    }

    clear() {
      for (const pd of this.puddles) this.world.fxGroup.remove(pd.mesh);
      this.puddles = []; this.spots = []; this.timers = [];
      for (const g of this.ghosts) this.world.fxGroup.remove(g.g);
      this.ghosts = [];
      this.buddy.burn = 0; this.buddy.soak = 0;
      this.fireLight.intensity = 0;
      S.audio.fireLevel(0);
    }
  }
  S.Brutal = Brutal;
})();
