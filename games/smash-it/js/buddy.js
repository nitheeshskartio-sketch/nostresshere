/* ============ SMASH IT — the buddy (character rig, physics, reactions) ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const HIP = 1.02, G = 9.8;
  const UP = new V3(0, 1, 0);
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = THREE.MathUtils.clamp;

  /* ---------- looks ---------- */
  S.OUTFITS = {
    office: { name: "Office Worker", icon: "💼", shirt: "#f1f3f5", sleeves: "long", pants: "#495057", shoes: "#212529", acc: "tie", accColor: "#1c7ed6", hair: "short", hairColor: "#4a3426" },
    gym:    { name: "Gym Bro", icon: "💪", shirt: "#e03131", sleeves: "none", pants: "#212529", shorts: true, shoes: "#f8f9fa", hair: "spiky", hairColor: "#2b2b2b" },
    boss:   { name: "The Boss", icon: "👔", shirt: "#1f2a44", sleeves: "long", pants: "#1f2a44", shoes: "#111111", acc: "tie", accColor: "#c92a2a", hair: "bald", hairColor: "#333" },
    hoodie: { name: "Hoodie Kid", icon: "🧢", shirt: "#2f9e44", sleeves: "long", pants: "#1971c2", shoes: "#fa5252", hair: "afro", hairColor: "#1a1110" },
    hero:   { name: "Super Dude", icon: "🦸", shirt: "#7048e8", sleeves: "long", pants: "#5f3dc4", shoes: "#f59f00", acc: "cape", accColor: "#e03131", hair: "mohawk", hairColor: "#f08c00" },
    clown:  { name: "Clown", icon: "🤡", shirt: "#ffd43b", sleeves: "long", pants: "#fa5252", shoes: "#fd7e14", bigShoes: true, acc: "nose", hair: "clown", hairColor: "#ff6b6b", polka: true }
  };
  S.SKINS = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"];
  S.HAIRS = { short: "Short", spiky: "Spiky", long: "Ponytail", afro: "Afro", mohawk: "Mohawk", clown: "Clown", bald: "Bald" };
  S.HAIR_COLORS = ["#2b1d16", "#4a3426", "#a0522d", "#e8c07d", "#d9480f", "#868e96", "#ff6b6b", "#7048e8"];

  /* ---------- speech ---------- */
  const LINES = {
    hurt: ["Ow!", "Hey!", "Ouch!", "Not the face!", "Rude!", "Why?!", "Ow ow ow!", "My hair!", "I felt that!"],
    surprised: ["Whoa!", "What?!", "Huh?!", "Didn't see that coming!"],
    laugh: ["Hahaha!", "That tickles!", "Hehe, do it again!", "Is that all you've got?"],
    cry: ["Waaah!", "Okay okay, I'm sorry!", "I want my mom!", "I'll answer your emails!"],
    dizzy: ["Wheee…", "Ooh, pretty stars…", "Which way is up?", "Is the room spinning?"],
    confused: ["Wait, what?", "Did I deserve that?", "Is this team building?", "Was that on the agenda?"],
    angry: ["Oh, it's ON!", "Hey! Watch it!", "I'm telling HR!"],
    ko: ["Ugh…", "Goodnight…", "Five more minutes…"],
    scared: ["Aaaah!", "Put me down!", "Wheeeee!", "I can fly!"],
    land: ["Oof.", "I'm okay!", "Totally meant to do that.", "Ten out of ten landing."],
    soft: ["Ooh, comfy!", "Nap time?", "Soft landing!"],
    getup: ["I'm fine!", "Still standing!", "Is that all?", "Ta-da!"],
    taunt: ["Is that all?", "I felt nothing.", "Come on!", "My grandma hits harder.", "Bored now.", "You call that stress relief?"],
    pie: ["Mmm, banana cream?", "Pfft!", "Delicious. Rude, but delicious."],
    egg: ["Eggscuse me?!", "That's no yolk!"],
    tomato: ["Is this ketchup?", "Hey, I'm a fruit too!"],
    water: ["Glub glub!", "I'm drowning! …no wait.", "Refreshing!"],
    paint: ["I'm art now!", "Is this my color?", "Very abstract."],
    pillow: ["Pillow fight!", "Hehe, soft!"],
    sponge: ["Ooh, a spa day!", "Squeaky clean!"],
    boom: ["My eyebrows!", "Kaboom?!", "Party time!"],
    spin: ["Wheee!", "Weeeee!"],
    wave: ["Hi there!", "Hello!"],
    shrug: ["Whatever.", "Meh."],
    dance: ["Watch these moves!", "Party time!"],
    yawn: ["*yawn*", "So sleepy…"],
    pancake: ["I'm a pancake!", "Flat as a…", "Squished!"],
    sever: ["My arm!", "I was using that!", "It's just a flesh wound!", "That's not coming back, is it?", "Who needs two legs anyway?", "Can I get that back?", "Okay, now you're just showing off."],
    brutal: ["That's gonna leave a mark!", "My spleen!", "I need a doctor!", "Not cool!", "Call my lawyer!", "Ow, my everything!", "Was that a sledgehammer?!", "I felt that in my soul!"]
  };
  S.LINES = LINES;

  /* ---------- toon gradient ---------- */
  const toonGrad = (() => {
    const d = new Uint8Array([90, 170, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    return t;
  })();

  /* ---------- spring joint ---------- */
  class Joint {
    constructor(group, k, c, gain, kind) {
      this.g = group; this.k = k; this.c = c; this.gain = gain; this.kind = kind;
      this.a = new V3(); this.v = new V3(); this.t = new V3();
      this.min = new V3(-3, -3, -3); this.max = new V3(3, 3, 3);
      this.stiff = 1;
    }
    step(dt, A) {
      const v = this.v, a = this.a, t = this.t;
      if (A && this.gain) {
        const g = this.gain * dt;
        if (this.kind === "hang") { v.z -= A.x * g; v.x += A.z * g; }
        else { v.z += A.x * g; v.x -= A.z * g; }
      }
      const k = this.k * this.stiff, c = this.c;
      v.x += (-(a.x - t.x) * k - v.x * c) * dt;
      v.y += (-(a.y - t.y) * k - v.y * c) * dt;
      v.z += (-(a.z - t.z) * k - v.z * c) * dt;
      a.addScaledVector(v, dt);
      a.clamp(this.min, this.max);
      this.g.rotation.set(a.x, a.y, a.z);
    }
    kick(x, y, z) { this.v.x += x; this.v.y += y; this.v.z += z; }
    set(x, y, z) { this.t.set(x, y, z); }
  }

  /* =========================================================
     BUDDY
     ========================================================= */
  class Buddy {
    constructor(world, face) {
      this.world = world; this.face = face;
      this.root = new THREE.Group();
      world.scene.add(this.root);
      this.look = Object.assign({ outfit: "office", skin: S.SKINS[1] }, { hair: S.OUTFITS.office.hair, hairColor: S.OUTFITS.office.hairColor });
      this.style = "real";
      this.com = new V3(0, HIP, 0); this.vel = new V3(); this.prevV = new V3();
      this.quat = new Q(); this.angVel = new V3();
      this.feet = new V3(0, 0, 0);
      this.lean = { x: 0, z: 0, vx: 0, vz: 0 };
      this.heading = 0; this.spinV = 0;
      this.squash = { v: 1, vel: 0, hold: 0, target: 1 };
      this.headSq = { v: 1, vel: 0 };
      this.state = "stand"; this.stateT = 0;
      this.emote = null; this.dizzy = 0; this.idleT = 0; this.nextIdle = R(5, 8);
      this.recent = []; this.decals = [];
      this.health = 100; this.dead = false; this.burn = 0; this.soak = 0;
      this.gravMul = 1; this.power = 1; this.maxY = 0;
      this.pointer = { x: 0, y: 0 };
      this.grabTarget = new V3(); this.grabVel = new V3();
      this.build();
      this.makePhysicsProxy();
    }

    /* ---------- materials ---------- */
    mat(color, opts) {
      opts = opts || {};
      const std = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.65, metalness: 0 }, opts));
      const toon = new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, map: opts.map || null });
      const m = { std, toon, cur: this.style === "toon" ? toon : std };
      this.mats.push(m);
      return m;
    }
    mesh(geo, m, part, parent, pos) {
      const me = new THREE.Mesh(geo, m.cur);
      me.userData.mat = m;
      me.castShadow = true; me.receiveShadow = true;
      if (pos) me.position.set(pos[0], pos[1], pos[2]);
      if (part) { me.userData.part = part; this.hitMeshes.push(me); }
      // outline for the cartoon style
      const ol = new THREE.Mesh(geo, this.outlineMat);
      ol.scale.setScalar(1.06); ol.visible = this.style === "toon"; ol.castShadow = false;
      ol.raycast = () => {};
      me.add(ol); this.outlines.push(ol);
      parent.add(me);
      return me;
    }

    build() {
      this.root.clear();
      this.mats = []; this.hitMeshes = []; this.outlines = []; this.decals = [];
      this.outlineMat = this.outlineMat || new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.BackSide });
      const O = S.OUTFITS[this.look.outfit];
      const skin = this.mat(this.look.skin, { roughness: 0.55 });
      const shirtMap = O.polka ? S.tex.polka(O.shirt, "#ff6b6b") : null;
      const shirt = this.mat(O.shirt, { roughness: 0.8, map: shirtMap });
      const pants = this.mat(O.pants, { roughness: 0.85 });
      const shoes = this.mat(O.shoes, { roughness: 0.45 });
      const hairM = this.mat(this.look.hairColor, { roughness: 0.75 });
      this.skinMat = skin;
      this.faceMat = { std: new THREE.MeshStandardMaterial({ map: this.face.texture, roughness: 0.55 }), toon: new THREE.MeshToonMaterial({ map: this.face.texture, gradientMap: toonGrad }) };
      this.faceMat.cur = this.style === "toon" ? this.faceMat.toon : this.faceMat.std;
      this.mats.push(this.faceMat);

      const body = (this.bodyG = new THREE.Group());
      this.root.add(body);
      const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);

      // pelvis
      const pelvis = this.mesh(new THREE.SphereGeometry(1, 24, 16), pants, "torso", body, [0, 0.02, 0]);
      pelvis.scale.set(0.25, 0.17, 0.18);

      // spine + torso
      const spineG = new THREE.Group(); spineG.position.y = 0.05; body.add(spineG);
      const torso = this.mesh(cap(0.23, 0.3), shirt, "torso", spineG, [0, 0.3, 0]);
      torso.scale.set(1.15, 1, 0.8);
      this.mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 12), skin, "head", spineG, [0, 0.6, 0]);

      // head
      const headG = new THREE.Group(); headG.position.y = 0.64; spineG.add(headG);
      const headIn = (this.headIn = new THREE.Group()); headIn.position.y = 0.27; headG.add(headIn);
      const head = this.mesh(new THREE.SphereGeometry(0.28, 36, 24), skin, "head", headIn);
      head.scale.y = 1.04;
      const faceGeo = new THREE.SphereGeometry(0.2818, 48, 32, Math.PI / 2 - 1.0, 2.0, 0.5, 1.85);
      const face = new THREE.Mesh(faceGeo, this.faceMat.cur);
      face.userData = { part: "head", face: true, mat: this.faceMat };
      face.scale.y = 1.04;
      face.castShadow = false; face.receiveShadow = true;
      headIn.add(face); this.hitMeshes.push(face); this.faceMesh = face;
      for (const s of [-1, 1]) { const ear = this.mesh(new THREE.SphereGeometry(0.06, 12, 10), skin, "head", headIn, [s * 0.275, 0.0, -0.01]); ear.scale.set(0.5, 1, 0.8); }
      this.nose = this.mesh(new THREE.SphereGeometry(0.042, 14, 10), skin, "head", headIn, [0, 0.0, 0.285]);
      this.nose.visible = !this.face.hasPhoto;
      this.buildHair(headIn, hairM, O);
      if (O.acc === "nose") {
        const red = this.mat("#e03131", { roughness: 0.3 });
        this.clownNose = this.mesh(new THREE.SphereGeometry(0.065, 16, 12), red, "head", headIn, [0, 0.0, 0.3]);
      }

      // dizzy stars
      this.starsG = new THREE.Group(); this.starsG.position.y = 0.36; this.starsG.visible = false; headIn.add(this.starsG);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
      for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), starMat); const a = (i / 4) * Math.PI * 2; st.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); this.starsG.add(st); }

      // arms
      const sleeveU = O.sleeves === "none" ? skin : shirt, sleeveF = O.sleeves === "long" ? shirt : skin;
      const arm = (s) => {
        const sh = new THREE.Group(); sh.position.set(s * 0.31, 0.5, 0); spineG.add(sh);
        this.mesh(cap(0.075, 0.22), sleeveU, "arm", sh, [0, -0.17, 0]);
        const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
        this.mesh(cap(0.067, 0.2), sleeveF, "arm", el, [0, -0.15, 0]);
        const hand = this.mesh(new THREE.SphereGeometry(0.085, 16, 12), skin, "arm", el, [0, -0.33, 0]);
        hand.scale.set(1, 1.1, 0.8);
        return [sh, el];
      };
      const [shL, elL] = arm(1), [shR, elR] = arm(-1);

      // legs
      const leg = (s) => {
        const hp = new THREE.Group(); hp.position.set(s * 0.13, -0.06, 0); body.add(hp);
        this.mesh(cap(0.1, 0.26), pants, "leg", hp, [0, -0.22, 0]);
        const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
        this.mesh(cap(0.085, 0.26), O.shorts ? skin : pants, "leg", kn, [0, -0.2, 0]);
        const shoe = this.mesh(new THREE.SphereGeometry(1, 18, 12), shoes, "leg", kn, [0, -0.45, 0.05]);
        const big = O.bigShoes ? 1.45 : 1;
        shoe.scale.set(0.1 * big, 0.075, 0.16 * big);
        return [hp, kn];
      };
      const [hipL, knL] = leg(1), [hipR, knR] = leg(-1);

      // limbs that can come off in Brutal mode
      this.limbs = {
        armL: { g: shL, joints: ["shL", "elL"], kind: "arm", parent: spineG },
        armR: { g: shR, joints: ["shR", "elR"], kind: "arm", parent: spineG },
        legL: { g: hipL, joints: ["hipL", "knL"], kind: "leg", parent: body },
        legR: { g: hipR, joints: ["hipR", "knR"], kind: "leg", parent: body }
      };
      for (const k in this.limbs) {
        const L = this.limbs[k];
        L.meshes = []; L.hp = 34;
        L.g.traverse((o) => { if (o.isMesh && o.userData.part) L.meshes.push(o); });
      }
      this.lost = new Set(); this.lostJoints = new Set(); this.bleeds = [];

      // joints
      const J = (this.j = {
        spine: new Joint(spineG, 140, 12, 0.6, "up"),
        neck: new Joint(headG, 90, 9, 2.5, "up"),
        shL: new Joint(shL, 60, 6.5, 3.6, "hang"), elL: new Joint(elL, 60, 6.5, 2.5, "hang"),
        shR: new Joint(shR, 60, 6.5, 3.6, "hang"), elR: new Joint(elR, 60, 6.5, 2.5, "hang"),
        hipL: new Joint(hipL, 120, 11, 2, "hang"), knL: new Joint(knL, 120, 11, 1.5, "hang"),
        hipR: new Joint(hipR, 120, 11, 2, "hang"), knR: new Joint(knR, 120, 11, 1.5, "hang")
      });
      J.neck.min.set(-0.9, -1.4, -0.8); J.neck.max.set(0.9, 1.4, 0.8);
      J.spine.min.set(-0.6, -0.6, -0.5); J.spine.max.set(0.8, 0.6, 0.5);
      for (const k of ["elL", "elR"]) { J[k].min.set(-2.6, -0.2, -0.3); J[k].max.set(0.05, 0.2, 0.3); }
      for (const k of ["knL", "knR"]) { J[k].min.set(-0.05, -0.1, -0.2); J[k].max.set(2.4, 0.1, 0.2); }
      this.chains = [];

      if (O.acc === "tie") {
        const tm = this.mat(O.accColor, { roughness: 0.5 });
        const knot = new THREE.Group(); knot.position.set(0, 0.52, 0.195); spineG.add(knot);
        this.mesh(new THREE.BoxGeometry(0.07, 0.06, 0.03), tm, null, knot);
        let parent = knot;
        for (let i = 0; i < 2; i++) {
          const seg = new THREE.Group(); seg.position.y = i === 0 ? -0.03 : -0.14; parent.add(seg);
          this.mesh(new THREE.BoxGeometry(0.06 + i * 0.03, 0.15, 0.02), tm, null, seg, [0, -0.075, 0]);
          const jt = new Joint(seg, 30, 3, 1.6, "hang"); jt.max.x = 0.05; jt.min.x = -1.6;
          this.chains.push(jt); parent = seg;
        }
      }
      if (O.acc === "cape") {
        const cm = this.mat(O.accColor, { roughness: 0.6, side: THREE.DoubleSide });
        let parent = spineG, y = 0.56;
        for (let i = 0; i < 4; i++) {
          const seg = new THREE.Group(); seg.position.set(0, y, i === 0 ? -0.19 : 0); parent.add(seg);
          const w = 0.5 + i * 0.06;
          const m = this.mesh(new THREE.BoxGeometry(w, 0.24, 0.015), cm, null, seg, [0, -0.12, 0]);
          m.castShadow = true;
          const jt = new Joint(seg, 22 - i * 3, 2.5, 2.2, "hang"); jt.min.x = -0.05; jt.max.x = 1.7;
          this.chains.push(jt); parent = seg; y = -0.24;
        }
      }
      // ponytail chain created in buildHair
      if (this.ponyRoot) {
        let parent = this.ponyRoot;
        for (let i = 0; i < 2; i++) {
          const seg = new THREE.Group(); seg.position.y = i === 0 ? 0 : -0.16; parent.add(seg);
          this.mesh(new THREE.CapsuleGeometry(0.055 - i * 0.012, 0.1, 4, 10), hairM, null, seg, [0, -0.08, 0]);
          const jt = new Joint(seg, 26, 3, 2, "hang"); jt.min.x = -0.1;
          this.chains.push(jt); parent = seg;
        }
        this.ponyRoot = null;
      }

      this.applyTransforms();
    }

    buildHair(headIn, m, O) {
      const style = this.look.hair;
      this.ponyRoot = null;
      if (style === "bald") return;
      const capMesh = () => {
        const c = this.mesh(new THREE.SphereGeometry(0.297, 32, 16, 0, Math.PI * 2, 0, 1.3), m, "head", headIn);
        c.rotation.x = -0.5;
        return c;
      };
      if (style === "short" || style === "spiky" || style === "long") capMesh();
      if (style === "spiky") {
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2, tilt = 0.55;
          const sp = this.mesh(new THREE.ConeGeometry(0.06, 0.18, 8), m, "head", headIn);
          const dir = new V3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt) - 0.25).normalize();
          sp.position.copy(dir.clone().multiplyScalar(0.3));
          sp.quaternion.setFromUnitVectors(UP, dir);
        }
        const top = this.mesh(new THREE.ConeGeometry(0.07, 0.2, 8), m, "head", headIn, [0, 0.36, -0.05]);
        top.rotation.x = -0.2;
      }
      if (style === "long") {
        const back = this.mesh(new THREE.SphereGeometry(0.3, 24, 16), m, "head", headIn, [0, -0.04, -0.1]);
        back.scale.set(1.0, 1.05, 0.75);
        const pr = new THREE.Group(); pr.position.set(0, 0.06, -0.31); headIn.add(pr);
        this.ponyRoot = pr;
      }
      if (style === "afro") {
        const geo = new THREE.IcosahedronGeometry(0.43, 3);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const v = new V3().fromBufferAttribute(pos, i); v.multiplyScalar(1 + Math.sin(v.x * 40) * Math.cos(v.y * 37) * 0.04); pos.setXYZ(i, v.x, v.y, v.z); }
        geo.computeVertexNormals();
        this.mesh(geo, m, "head", headIn, [0, 0.12, -0.1]);
      }
      if (style === "mohawk") {
        for (let i = 0; i < 7; i++) {
          const a = -0.25 + i * 0.32;
          const fin = this.mesh(new THREE.ConeGeometry(0.05, 0.24, 6), m, "head", headIn, [0, Math.cos(a) * 0.3 + 0.08, Math.sin(-a) * 0.3 + 0.0]);
          fin.rotation.x = -a;
          fin.scale.z = 0.45;
        }
      }
      if (style === "clown") {
        for (const s of [-1, 1]) {
          const puff = this.mesh(new THREE.IcosahedronGeometry(0.17, 2), m, "head", headIn, [s * 0.27, 0.1, -0.04]);
          puff.scale.set(1, 1.1, 1.1);
        }
      }
    }

    setStyle(style) {
      this.style = style;
      for (const m of this.mats) { m.cur = style === "toon" ? m.toon : m.std; }
      this.root.traverse((o) => { if (o.isMesh && o.userData.mat) o.material = o.userData.mat.cur; });
      for (const o of this.outlines) o.visible = style === "toon";
    }

    setLook(patch) {
      Object.assign(this.look, patch);
      if (patch.skin) this.face.setSkin(patch.skin);
      this.build();
    }

    refreshFace() { if (this.nose) this.nose.visible = !this.face.hasPhoto; }

    /* ---------- physics proxy so props get shoved ---------- */
    makePhysicsProxy() {
      const b = (this.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: S.GROUP.CHAR, collisionFilterMask: S.GROUP.PROP }));
      b.addShape(new CANNON.Sphere(0.26), new CANNON.Vec3(0, 0.02, 0));
      b.addShape(new CANNON.Sphere(0.28), new CANNON.Vec3(0, 0.35, 0));
      b.addShape(new CANNON.Sphere(0.3), new CANNON.Vec3(0, 0.95, 0));
      b.addShape(new CANNON.Sphere(0.2), new CANNON.Vec3(0, -0.45, 0));
      b.addShape(new CANNON.Sphere(0.16), new CANNON.Vec3(0, -0.85, 0));
      this.world.physics.addBody(b);
      b.addEventListener("collide", (e) => {
        if (this.state !== "fly") return;
        const sp = this.vel.length();
        if (sp > 4) {
          this.vel.multiplyScalar(0.75);
          if (sp > 6 && (!this._lastBonk || performance.now() - this._lastBonk > 300)) {
            this._lastBonk = performance.now();
            S.audio.play("thud", 5);
            S.bus.emit("propHit", {});
          }
        }
      });
    }

    /* ---------- helpers ---------- */
    headPos() { return this.headIn.getWorldPosition(new V3()); }
    invQuat() { return this.quat.clone().invert(); }
    yawToCamera() {
      const c = this.world.camera.position;
      return Math.atan2(c.x - this.com.x, c.z - this.com.z);
    }
    setState(s) { this.state = s; this.stateT = 0; }

    say(kind, force) {
      if (this.dead) return;
      const line = typeof kind === "string" && LINES[kind] ? pick(LINES[kind]) : kind;
      S.bus.emit("say", line);
      if (force || Math.random() < 0.7) S.audio.speak(line, force);
    }
    react(expr, dur, lineKind, emote) {
      if (this.dead) return;
      this.face.setExpression(expr, dur || 1.3);
      if (lineKind) this.say(lineKind);
      if (emote) this.emote = { name: emote, t: dur || 1.5 };
    }

    /* ---------- approximate hit test (for water drops) ---------- */
    approxHit(p) {
      const h = this.headPos();
      if (p.distanceTo(h) < 0.33) return "head";
      const l = p.clone().sub(this.com).applyQuaternion(this.invQuat());
      const seg = (a, b, r) => { const t = clamp(l.y < a ? 0 : l.y > b ? 1 : (l.y - a) / (b - a), 0, 1); const y = a + (b - a) * t; return Math.hypot(l.x, l.y - y, l.z) < r; };
      if (seg(-0.05, 0.6, 0.3)) return "torso";
      if (seg(-1.0, -0.05, 0.24)) return "leg";
      return null;
    }

    /* =========================================================
       HITS & ACTIONS
       ========================================================= */
    applyHit(o) {
      const p = o.power * this.power * (this.brutal ? 1.2 : 1);
      const d = o.dir.clone().normalize();
      const dl = d.clone().applyQuaternion(this.invQuat());
      const J = this.j;
      this.idleT = 0; this.emote = null;
      const now = performance.now() / 1000;
      this.recent.push(now);
      this.recent = this.recent.filter((t) => now - t < 4);

      // limb & head reactions
      if (o.part === "head") {
        J.neck.kick(dl.z * p * 1.4, o.slap ? -Math.sign(dl.x || 1) * p * 2.6 : 0, -dl.x * p * 1.6);
        if (d.y < -0.5) this.headSq.vel -= p * 0.9;
        else this.headSq.vel -= p * 0.35;
      } else if (o.part === "arm") {
        const lp = o.point.clone().sub(this.com).applyQuaternion(this.invQuat());
        const sh = lp.x > 0 ? J.shL : J.shR;
        sh.kick(dl.z * p * 1.5, 0, -dl.x * p * 1.5 + (lp.x > 0 ? 1 : -1) * p * 0.8);
      } else if (o.part === "leg") {
        J.hipL.kick(-dl.z * p * 0.6, 0, dl.x * p * 0.6);
        J.hipR.kick(-dl.z * p * 0.6, 0, dl.x * p * 0.6);
      }
      J.spine.kick(dl.z * p * 0.6, 0, -dl.x * p * 0.6);
      J.shL.kick(R(-1, 1) * p * 0.4, 0, p * 0.3); J.shR.kick(R(-1, 1) * p * 0.4, 0, -p * 0.3);

      const lift = o.lift || 0;
      const launch = p >= (o.launchAt || 9.5) || lift > 0.5;
      if (this.state === "stand" || this.state === "getup") {
        if (launch) {
          this.toFly(d.clone().multiplyScalar(p * 0.5).add(new V3(0, p * 0.32 + lift * 4, 0)), true);
          this.angVel.add(new V3().crossVectors(UP, d).multiplyScalar(p * 0.55));
        } else {
          let k = 0.28;
          if (o.part === "leg") k = -0.35; // sweep the legs: top falls the other way
          this.lean.vx += d.z * p * k;
          this.lean.vz -= d.x * p * k;
          if (o.part === "head") { this.lean.vx += d.z * p * 0.1; this.lean.vz -= d.x * p * 0.1; }
        }
      } else if (this.state === "fly") {
        this.vel.addScaledVector(d, p * 0.45).add(new V3(0, p * 0.12, 0));
        this.angVel.add(new V3().crossVectors(UP, d).multiplyScalar(p * 0.35));
      } else if (this.state === "down") {
        if (p >= 6 || lift > 0.5) this.toFly(d.clone().multiplyScalar(p * 0.4).add(new V3(0, p * 0.35 + lift * 3, 0)), true);
        else { this.vel.addScaledVector(d, p * 0.12); this.stateT = Math.min(this.stateT, 0.3); }
      }

      // facial reaction + voice
      if (!this.dead) this.pickReaction(p, o);
      // Brutal mode: limbs take damage and can come off
      if (this.brutal) {
        const lp = o.point.clone().sub(this.com).applyQuaternion(this.invQuat());
        const dmg = o.dmg != null ? o.dmg : p;
        if (o.part === "arm" || o.part === "leg") this.hurtLimb(o.part + (lp.x > 0 ? "L" : "R"), dmg, d, p);
        else if (p >= 11 && Math.random() < 0.35) this.hurtLimb(pick(Object.keys(this.limbs)), dmg, d, p);
      }
      return p;
    }

    /* ---------- Brutal mode: wounds & lost limbs (no health — the buddy never dies) ---------- */
    damage() {}
    legsLost() { return (this.lost.has("legL") ? 1 : 0) + (this.lost.has("legR") ? 1 : 0); }
    hurtLimb(key, dmg, dir, p) {
      if (!this.brutal) return;
      const L = this.limbs[key];
      if (!L || this.lost.has(key)) return;
      L.hp -= dmg;
      if (L.hp <= 0) this.sever(key, dir || new V3(0, 0, -1), p || 10);
    }
    blast(pos, radius, power) {
      for (const k in this.limbs) {
        if (this.lost.has(k)) continue;
        const wp = this.limbs[k].g.getWorldPosition(new V3());
        const d = wp.distanceTo(pos);
        if (d < radius) this.hurtLimb(k, power * (1 - d / radius) * 5, wp.sub(pos).normalize(), power);
      }
    }
    sever(key, dir, p) {
      const L = this.limbs[key], W = this.world;
      this.lost.add(key);
      L.joints.forEach((j) => this.lostJoints.add(j));
      this.hitMeshes = this.hitMeshes.filter((m) => !L.meshes.includes(m));
      const g = L.g;
      g.updateWorldMatrix(true, true);
      const pos = g.getWorldPosition(new V3()), quat = g.getWorldQuaternion(new Q()), scl = g.getWorldScale(new V3());
      // the wound left on the body
      const fleshMat = new THREE.MeshStandardMaterial({ color: "#7a0c0c", roughness: 0.3 });
      const boneMat = new THREE.MeshStandardMaterial({ color: "#efe3c8", roughness: 0.6 });
      const makeStump = () => {
        const st = new THREE.Group();
        const f = new THREE.Mesh(new THREE.SphereGeometry(L.kind === "arm" ? 0.082 : 0.105, 16, 12), fleshMat); f.scale.y = 0.6; st.add(f);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.06, 10), boneMat); b.position.y = -0.04; st.add(b);
        return st;
      };
      const stump = makeStump(); stump.position.copy(g.position); L.parent.add(stump);
      // the limb flies off as a physics object you can keep knocking around
      L.parent.remove(g);
      g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.copy(scl);
      const cap = makeStump(); cap.rotation.x = Math.PI; g.add(cap);
      const len = L.kind === "arm" ? 0.7 : 0.95, rad = L.kind === "arm" ? 0.085 : 0.1;
      const prop = W.addProp({ kind: "limb", mesh: g, shapes: [0.15, 0.42, 0.68].map((f) => [new CANNON.Sphere(rad), new CANNON.Vec3(0, -len * f, 0)]), mass: L.kind === "arm" ? 2 : 3.5, pos: [pos.x, pos.y, pos.z], damp: 0.25, adamp: 0.35, color: "#8a0e0e" });
      prop.body.quaternion.set(quat.x, quat.y, quat.z, quat.w); g.quaternion.copy(quat);
      const v = dir.clone().multiplyScalar(2 + p * 0.3).add(new V3(R(-1, 1), 2.5 + p * 0.15, R(-1, 1)));
      prop.body.velocity.set(v.x, v.y, v.z);
      prop.body.angularVelocity.set(R(-8, 8), R(-8, 8), R(-8, 8));
      this.bleeds.push({ obj: stump, t: 6, acc: 0 }, { obj: cap, t: 3.5, acc: 0 });
      // blood everywhere
      W.splash(pos, "#9b0000", 45, 4.5, 0.032);
      W.floorSplat(new V3(pos.x, 0, pos.z), "#7a0010", 1.1);
      W.shake(10); W.slowmo(0.6);
      S.audio.play("crunch", 14); S.audio.play("splat");
      this.face.injure(10);
      this.react(L.kind === "arm" ? "cry" : "scared", 2.2, "sever");
      S.bus.emit("sever", { key });
      if (L.kind === "leg" && (this.state === "stand" || this.state === "getup")) { this.toFly(new V3(R(-1, 1), 1.5, R(-0.5, 0.5)), true); this.angVel.set(R(-3, 3), 0, R(-3, 3)); }
    }
    restore() {
      const W = this.world;
      for (const pr of W.props.filter((x) => x.kind === "limb")) { W.propGroup.remove(pr.mesh); W.physics.removeBody(pr.body); }
      W.props = W.props.filter((x) => x.kind !== "limb");
      this.build();
    }
    revive() { this.restore(); this.reset(); }
    addBleed(mesh, point, t) {
      if (!mesh || !mesh.parent) return;
      const o = new THREE.Object3D();
      o.position.copy(mesh.worldToLocal(point.clone()));
      mesh.add(o);
      this.bleeds.push({ obj: o, t: t || 2.5, acc: 0 });
      if (this.bleeds.length > 14) this.bleeds.shift();
    }
    updateBleeding(dt) {
      const W = this.world;
      for (const b of this.bleeds) {
        if (b.t <= 0 || !b.obj.parent) continue;
        b.t -= dt; b.acc += dt;
        if (b.acc < 0.05) continue;
        b.acc = 0;
        const wp = b.obj.getWorldPosition(new V3());
        const k = Math.min(1, b.t / 4) * 1.6 + 0.3;
        W.fx.drop.spawn({
          pos: wp, vel: new V3(R(-1.2, 1.2), R(0.3, 2.2), R(-1.2, 1.2)).multiplyScalar(k), size: R(0.012, 0.024), life: 1.4,
          color: pick(["#9b0000", "#b3001b", "#7a0010"]), stretch: 0.6,
          hit: (pt) => { if (pt.pos.y < 0.03) { if (Math.random() < 0.3) W.floorSplat(pt.pos, "#7a0010", R(0.16, 0.34)); return true; } return false; }
        });
      }
      this.bleeds = this.bleeds.filter((b) => b.t > 0);
    }

    pickReaction(p, o) {
      const t = o.tool || {};
      if (this.recent.length >= 10 && Math.random() < 0.35) return this.react("cry", 2.2, "cry", "cry");
      if (t.react) return this.react(t.react[0], t.react[1] || 1.4, t.react[2], t.react[3]);
      if (this.state === "fly") return this.react("scared", 1.2, "scared");
      if (p >= 8.5) return this.react("ko", 1.1, Math.random() < 0.5 ? "hurt" : null);
      const r = Math.random();
      if (r < 0.55) this.react("hurt", 0.9, Math.random() < 0.6 ? "hurt" : null);
      else if (r < 0.67) this.react("surprised", 1, "surprised");
      else if (r < 0.79) this.react("angry", 1.3, "angry", "angry");
      else if (r < 0.89) this.react("confused", 1.6, "confused", "confused");
      else this.react("laugh", 1.5, "laugh", "laugh");
    }

    toFly(v, fromHit) {
      if (this.state !== "fly") { this.setState("fly"); this.maxY = this.com.y; S.audio.play(v.y > 4 ? "slide" : "fall"); S.bus.emit("fall", {}); }
      this.vel.copy(v);
      if (!fromHit) this.angVel.set(R(-3, 3), R(-2, 2), R(-3, 3));
      this.squash.hold = 0; this.squash.target = 1;
    }

    toDown() {
      this.setState("down");
      const up = UP.clone().applyQuaternion(this.quat);
      const h = new V3(up.x, 0, up.z);
      if (h.lengthSq() < 0.01) h.set(this.vel.x || 1, 0, this.vel.z);
      h.normalize();
      const fwd = new V3(0, 0, 1).applyQuaternion(this.quat);
      const z = new V3(0, fwd.y >= 0 ? 1 : -1, 0);
      const x = h.clone().cross(z);
      this.lyingQ = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, h, z));
      this.downFor = R(1.1, 1.8) + (this.dizzy > 0 ? 1 : 0);
    }

    action(name) {
      if (this.dead) return;
      this.idleT = 0;
      if (name === "spin") {
        if (this.state !== "stand") return;
        this.spinV = 24; this.emote = { name: "spin", t: 2.6 };
        S.audio.play("spin"); this.say("spin"); S.bus.emit("spin", {});
      } else if (name === "shake") {
        if (this.state === "fly") return;
        this.setState("shake"); this.shakeFrom = this.com.clone();
        S.audio.play("grab"); this.react("scared", 1.8, "scared");
        S.bus.emit("shake", {});
      } else if (name === "launch") {
        this.toFly(new V3(R(-1.2, 1.2), R(9, 11), R(-0.6, 0.3)));
        this.angVel.set(R(-6, 6), R(-4, 4), R(-6, 6));
        this.react("scared", 1.5, "scared");
      } else if (name === "dance") {
        if (this.state !== "stand") return;
        this.emote = { name: "dance", t: 4 }; this.face.setExpression("happy", 4); this.say("dance");
      } else if (name === "pancake") {
        if (this.state !== "stand") return;
        this.squash.target = 0.28; this.squash.hold = 1.3; this.squash.v = 0.4; this.squash.vel = 0;
        this.react("ko", 1.6, "pancake");
        S.bus.emit("pancake", {});
      }
    }

    nudge(d, a, part) {
      this.idleT = 0;
      if (this.state === "stand") {
        this.lean.vx += d.z * a; this.lean.vz -= d.x * a;
        if (part === "head") this.j.neck.kick(d.z * a * 6, 0, -d.x * a * 6);
      } else if (this.state === "fly") this.vel.addScaledVector(d, a * 2);
      else if (this.state === "down") this.vel.addScaledVector(d, a * 0.5);
    }

    /* ---------- grab & throw ---------- */
    grabStart(point) {
      this.setState("grabbed");
      this.grabOffset = point.clone().sub(this.com);
      this.grabTarget.copy(this.com);
      this.grabVel.set(0, 0, 0);
      this.vel.set(0, 0, 0);
      this.squash.hold = 0; this.squash.target = 1;
      S.audio.play("grab");
      this.react("scared", 3, "scared");
    }
    grabMove(point) { this.grabTarget.copy(point).sub(this.grabOffset); }
    grabRelease() {
      const v = this.grabVel.clone();
      if (v.length() > 16) v.setLength(16);
      if (v.length() < 1.5) v.set(0, 0.5, 0);
      this.toFly(v);
      this.angVel.set(R(-2, 2), R(-2, 2), R(-2, 2)).add(new V3().crossVectors(UP, v).multiplyScalar(0.7));
      if (v.length() > 6) { S.audio.play("whoosh"); S.bus.emit("throwChar", { speed: v.length() }); }
    }

    /* ---------- decals (mess stuck to the body) ---------- */
    addDecal(mesh, point, normal, color, size, tex) {
      if (!mesh || mesh === this.faceMesh || !mesh.parent) return;
      const mat = new THREE.MeshStandardMaterial({ map: tex || pick(S.splatTex), color, transparent: true, depthWrite: false, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -4 });
      const d = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      const inv = mesh.getWorldQuaternion(new Q()).invert();
      const ws = mesh.getWorldScale(new V3());
      const nl = normal.clone().applyQuaternion(inv).normalize();
      d.position.copy(mesh.worldToLocal(point.clone())).addScaledVector(nl, 0.01 / Math.max(ws.x, ws.y, ws.z));
      d.quaternion.setFromUnitVectors(new V3(0, 0, 1), nl);
      d.rotateZ(R(0, 6.28));
      d.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
      d.raycast = () => {};
      mesh.add(d);
      this.decals.push(d);
      if (this.decals.length > 70) { const o = this.decals.shift(); o.parent && o.parent.remove(o); o.material.dispose(); }
      S.bus.emit("splatBody", {});
    }
    wash(point, radius) {
      let n = 0;
      for (let i = this.decals.length - 1; i >= 0; i--) {
        const d = this.decals[i];
        if (d.getWorldPosition(new V3()).distanceTo(point) < radius) {
          d.material.opacity -= 0.25;
          if (d.material.opacity <= 0) { d.parent && d.parent.remove(d); d.material.dispose(); this.decals.splice(i, 1); n++; }
        }
      }
      return n;
    }
    cleanAll() { for (const d of this.decals) { d.parent && d.parent.remove(d); d.material.dispose(); } this.decals = []; this.face.clean(1); this.face.wet = 0; }
    get messCount() { return this.decals.length; }

    /* ---------- reset ---------- */
    reset() {
      this.com.set(0, HIP, 0); this.vel.set(0, 0, 0); this.prevV.set(0, 0, 0); this.angVel.set(0, 0, 0);
      this.feet.set(0, 0, 0); Object.assign(this.lean, { x: 0, z: 0, vx: 0, vz: 0 });
      this.heading = this.yawToCamera(); this.spinV = 0; this.dizzy = 0; this.emote = null;
      this.squash = { v: 1, vel: 0, hold: 0, target: 1 };
      this.setState("stand");
      for (const k in this.j) { this.j[k].a.set(0, 0, 0); this.j[k].v.set(0, 0, 0); }
      this.cleanAll();
      this.face.setExpression("happy", 1.5);
    }

    /* =========================================================
       UPDATE
       ========================================================= */
    update(dt) {
      this.stateT += dt; this.idleT += dt;
      if (this.dizzy > 0) this.dizzy -= dt;
      if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
      const prev = this.com.clone();
      const A = this.world.ARENA || S.ARENA;

      if (this.state === "stand") this.updateStand(dt);
      else if (this.state === "fly") this.updateFly(dt, A);
      else if (this.state === "down") this.updateDown(dt);
      else if (this.state === "getup") this.updateGetup(dt);
      else if (this.state === "grabbed") this.updateGrabbed(dt, A);
      else if (this.state === "shake") this.updateShake(dt);

      // never leave the room, whatever state we're in (sliding while down, panic running, walking…)
      const m = 0.4;
      const cx = clamp(this.com.x, -A.x + m, A.x - m), cz = clamp(this.com.z, A.zBack + m, A.zFront - m);
      if (cx !== this.com.x) { this.com.x = cx; this.vel.x *= -0.3; }
      if (cz !== this.com.z) { this.com.z = cz; this.vel.z *= -0.3; }
      this.feet.x = clamp(this.feet.x, -A.x + m, A.x - m);
      this.feet.z = clamp(this.feet.z, A.zBack + m, A.zFront - m);
      if (this.panicTo) { this.panicTo.x = clamp(this.panicTo.x, -A.x + 1, A.x - 1); this.panicTo.z = clamp(this.panicTo.z, A.zBack + 1, A.zFront - 1); }

      // velocity / acceleration → limbs swing with inertia
      const v = this.com.clone().sub(prev).divideScalar(Math.max(dt, 1e-4));
      const acc = v.clone().sub(this.prevV).divideScalar(Math.max(dt, 1e-4));
      this.prevV.copy(v);
      if (acc.length() > 140) acc.setLength(140);
      const Aloc = acc.add(new V3(0, G * this.gravMul, 0)).applyQuaternion(this.invQuat());
      this.setPose(dt);
      for (const k in this.j) if (!this.lostJoints.has(k)) this.j[k].step(dt, Aloc);
      if (this.bleeds.length) this.updateBleeding(dt);
      for (const c of this.chains) c.step(dt, Aloc);

      // squash springs
      const sq = this.squash;
      if (sq.hold > 0) { sq.hold -= dt; if (sq.hold <= 0) { sq.target = 1; sq.vel = 6; S.audio.play("boing"); } }
      sq.vel += (-(sq.v - sq.target) * 180 - sq.vel * 9) * dt; sq.v = clamp(sq.v + sq.vel * dt, 0.22, 1.5);
      const hs = this.headSq;
      hs.vel += (-(hs.v - 1) * 220 - hs.vel * 10) * dt; hs.v = clamp(hs.v + hs.vel * dt, 0.5, 1.4);
      this.headIn.scale.set(1 / Math.sqrt(hs.v), hs.v, 1 / Math.sqrt(hs.v));
      const s = sq.v;
      this.bodyG.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      this.bodyG.position.y = this.state === "stand" ? -(1 - s) * HIP * 0 : 0;

      this.applyTransforms();

      // dizzy stars
      this.starsG.visible = this.dizzy > 0;
      if (this.dizzy > 0) this.starsG.rotation.y += dt * 6;

      // eyes follow the pointer
      if (["neutral", "happy"].includes(this.face.expr)) this.face.setLook(this.pointer.x * 0.9, -this.pointer.y * 0.7);

      // physics proxy
      const b = this.body;
      b.position.set(this.com.x, this.com.y, this.com.z);
      b.quaternion.set(this.quat.x, this.quat.y, this.quat.z, this.quat.w);
      b.velocity.set(v.x, v.y, v.z);

      this.idleBehaviour();
    }

    applyTransforms() {
      this.root.position.copy(this.com);
      this.root.quaternion.copy(this.quat);
    }

    updateStand(dt) {
      if (this.legsLost()) { this.toFly(new V3(R(-0.5, 0.5), 0.6, R(-0.5, 0.5)), true); this.angVel.set(R(-2, 2), 0, R(-2, 2)); return; }
      const L = this.lean;
      const k = 30, c = 4.2;
      L.vx += (-k * L.x - c * L.vx) * dt; L.vz += (-k * L.z - c * L.vz) * dt;
      L.x += L.vx * dt; L.z += L.vz * dt;
      if (this.dizzy > 0) { L.vx += Math.sin(this.stateT * 3.1) * dt * 1.2; L.vz += Math.cos(this.stateT * 2.3) * dt * 1.4; }

      // walk back home when calm
      const home = new V3(0, 0, 0);
      const toHome = home.clone().sub(this.feet); toHome.y = 0;
      this.walking = false; this.panic = false;
      let targetYaw = this.yawToCamera();
      if (this.burn > 0 && !this.dead) {
        // on fire: run around in a panic
        if (!this.panicTo || this.panicT <= 0 || this.feet.distanceTo(this.panicTo) < 0.3) { this.panicTo = new V3(R(-3.5, 3.5), 0, R(-2.6, 1.3)); this.panicT = R(0.7, 1.5); }
        this.panicT -= dt;
        const d = this.panicTo.clone().sub(this.feet); d.y = 0;
        this.feet.addScaledVector(d.normalize(), Math.min(this.feet.distanceTo(this.panicTo), 2.6 * dt));
        this.walking = true; this.panic = true;
        targetYaw = Math.atan2(d.x, d.z);
      } else if (this.idleT > 1.4 && toHome.length() > 0.3 && Math.abs(L.x) + Math.abs(L.z) < 0.2 && this.spinV < 1) {
        this.walking = true;
        const step = Math.min(toHome.length(), 1.2 * dt);
        this.feet.addScaledVector(toHome.normalize(), step);
        targetYaw = Math.atan2(toHome.x, toHome.z);
      }
      if (this.spinV > 0.5) {
        this.heading += this.spinV * dt;
        this.spinV *= Math.exp(-0.75 * dt);
        if (this.spinV < 2.5) { this.spinV = 0; this.dizzy = 3.2; this.react("dizzy", 3, "dizzy"); S.audio.play("tweet"); }
      } else {
        let dy = targetYaw - this.heading;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        this.heading += dy * Math.min(1, dt * 5);
      }
      const qLean = new Q().setFromEuler(new THREE.Euler(L.x, 0, L.z));
      const qYaw = new Q().setFromAxisAngle(UP, this.heading);
      this.quat.copy(qLean).multiply(qYaw);
      const bob = this.emote && this.emote.name === "dance" ? Math.abs(Math.sin(this.stateT * 8)) * 0.08 : Math.sin(this.stateT * 2.2) * 0.008;
      this.com.copy(this.feet).add(new V3(0, HIP * this.squash.v + bob, 0).applyQuaternion(qLean));

      if (Math.hypot(L.x, L.z) > 0.95) {
        const w = new V3(L.vx, 0, L.vz);
        const r = this.com.clone().sub(this.feet);
        this.toFly(new V3().crossVectors(w, r), true);
        this.angVel.copy(w);
        this.react("scared", 1, "surprised");
      }
    }

    updateFly(dt, A) {
      const v = this.vel;
      v.y -= G * this.gravMul * dt;
      this.com.addScaledVector(v, dt);
      if (this.com.y > this.maxY) this.maxY = this.com.y;
      const w = this.angVel.length();
      if (w > 1e-4) this.quat.premultiply(new Q().setFromAxisAngle(this.angVel.clone().divideScalar(w), w * dt));
      this.quat.normalize();
      this.angVel.multiplyScalar(Math.exp(-0.25 * dt));

      // walls
      const r = 0.35;
      const wall = (axis, lim, sign) => {
        if (sign * this.com[axis] > lim - r) {
          this.com[axis] = sign * (lim - r);
          if (sign * v[axis] > 0) {
            const sp = Math.abs(v[axis]);
            v[axis] = -v[axis] * 0.4;
            this.angVel.multiplyScalar(0.6);
            if (sp > 3) {
              S.audio.play("wall"); this.world.shake(Math.min(8, sp * 0.7));
              this.world.puff(this.com.clone(), 8, "#cfc8bc");
              this.react("ko", 1.2, "hurt");
              S.bus.emit("wall", { speed: sp });
              if (sp > 9) this.world.slowmo(0.5);
            }
          }
        }
      };
      wall("x", A.x, 1); wall("x", A.x, -1); wall("z", -A.zBack, -1); wall("z", A.zFront, 1);
      if (this.com.y > 6) { this.com.y = 6; if (v.y > 0) v.y *= -0.3; }

      // ground
      const up = UP.clone().applyQuaternion(this.quat);
      const ext = 0.24 + 0.76 * Math.max(0, Math.abs(up.y) - 0.15) / 0.85;
      if (this.com.y < ext) {
        this.com.y = ext;
        const soft = (this.world.softPiles || []).some((p) => Math.hypot(this.com.x - p.x, this.com.z - p.z) < p.r);
        if (v.y < -2) {
          const sp = -v.y;
          if (soft) {
            v.y = sp * 0.12; S.audio.play("comfy"); this.world.puff(this.com.clone(), 10, "#ffffff");
            for (let i = 0; i < 12; i++) this.world.fx.feather.spawn({ pos: this.com.clone(), vel: new V3(R(-2, 2), R(1, 3), R(-2, 2)), size: 0.08, life: 3, gravity: 0.8, drag: 2.5, spin: 6 });
            this.react("comfy", 2, "soft"); S.bus.emit("land", { soft: true, height: this.maxY });
          } else {
            v.y = sp * 0.3;
            S.audio.play("thud", sp); this.world.shake(Math.min(9, sp * 0.8));
            this.world.puff(new V3(this.com.x, 0.05, this.com.z), 12);
            if (sp > 8) { this.dizzy = 2.5; this.world.slowmo(0.35); }
            S.bus.emit("land", { soft: false, height: this.maxY, speed: sp });
            // land on the feet if mostly upright
            if (up.y > 0.8 && sp < 8 && !this.dead && !this.legsLost()) {
              this.feet.set(this.com.x, 0, this.com.z);
              this.setState("stand");
              this.lean.vx = v.z * 0.4; this.lean.vz = -v.x * 0.4; this.lean.x = this.lean.z = 0;
              this.heading = Math.atan2(2 * (this.quat.w * this.quat.y + this.quat.x * this.quat.z), 1 - 2 * (this.quat.y * this.quat.y + this.quat.z * this.quat.z));
              this.react("happy", 1.2, "land");
              return;
            }
            this.react(sp > 8 ? "ko" : "hurt", 1, Math.random() < 0.5 ? "land" : null);
          }
          v.x *= 0.55; v.z *= 0.55;
          this.angVel.multiplyScalar(0.45);
        } else {
          v.y = Math.max(v.y, 0);
          const f = Math.exp(-(soft ? 8 : 4) * dt);
          v.x *= f; v.z *= f;
          this.angVel.multiplyScalar(Math.exp(-5 * dt));
          if (Math.hypot(v.x, v.z) < 0.6 && v.y < 0.5) this.toDown();
        }
      }
    }

    updateDown(dt) {
      this.quat.slerp(this.lyingQ, 1 - Math.exp(-9 * dt));
      this.com.y += (0.24 - this.com.y) * Math.min(1, dt * 8);
      this.com.x += this.vel.x * dt; this.com.z += this.vel.z * dt;
      this.vel.multiplyScalar(Math.exp(-5 * dt));
      if (this.stateT > this.downFor && !this.dead && !this.legsLost()) {
        this.setState("getup");
        this.getupFrom = { q: this.quat.clone(), y: this.com.y };
        this.getupYaw = this.yawToCamera();
        S.audio.play("boing");
      }
    }

    updateGetup(dt) {
      const t = Math.min(1, this.stateT / 0.85);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const target = new Q().setFromAxisAngle(UP, this.getupYaw);
      this.quat.copy(this.getupFrom.q).slerp(target, e);
      this.com.y = this.getupFrom.y + (HIP - this.getupFrom.y) * e + Math.sin(e * Math.PI) * 0.22;
      if (t >= 1) {
        this.setState("stand");
        this.feet.set(this.com.x, 0, this.com.z);
        this.heading = this.getupYaw;
        Object.assign(this.lean, { x: 0, z: 0, vx: R(-0.6, 0.6), vz: R(-0.6, 0.6) });
        if (this.dizzy > 0) this.react("dizzy", this.dizzy, "dizzy");
        else this.react("smug", 1.4, Math.random() < 0.6 ? "getup" : null);
        S.bus.emit("getup", {});
      }
    }

    updateGrabbed(dt, A) {
      const tgt = this.grabTarget.clone();
      tgt.x = clamp(tgt.x, -A.x + 0.4, A.x - 0.4);
      tgt.z = clamp(tgt.z, A.zBack + 0.4, A.zFront - 0.4);
      tgt.y = clamp(tgt.y, HIP * 0.95, 5.2);
      const nv = tgt.sub(this.com).multiplyScalar(14);
      if (nv.length() > 18) nv.setLength(18);
      this.grabVel.lerp(nv, Math.min(1, dt * 12));
      this.com.addScaledVector(nv, dt);
      // dangle: tilt against the motion
      const tilt = new V3(this.grabVel.z * 0.05, 0, -this.grabVel.x * 0.05);
      const target = new Q().setFromEuler(new THREE.Euler(clamp(tilt.x, -0.8, 0.8), 0, clamp(tilt.z, -0.8, 0.8))).multiply(new Q().setFromAxisAngle(UP, this.yawToCamera()));
      this.quat.slerp(target, 1 - Math.exp(-6 * dt));
    }

    updateShake(dt) {
      const t = this.stateT;
      const base = this.shakeFrom;
      const lift = Math.min(1, t / 0.3);
      this.com.set(base.x + (t > 0.3 ? Math.sin(t * 34) * 0.32 : 0), base.y + lift * 0.9 + (t > 0.3 ? Math.abs(Math.sin(t * 22)) * 0.15 : 0), base.z);
      this.quat.copy(new Q().setFromEuler(new THREE.Euler(0, 0, t > 0.3 ? Math.sin(t * 34) * 0.35 : 0))).multiply(new Q().setFromAxisAngle(UP, this.yawToCamera()));
      if (t > 0.3 && Math.floor(t * 17) !== Math.floor((t - dt) * 17)) S.audio.play("soft");
      if (t > 1.8) {
        this.dizzy = 3.5;
        this.toFly(new V3(0, -0.5, 0));
        this.angVel.set(R(-1, 1), 0, R(-1, 1));
        this.react("dizzy", 3.5, "dizzy");
        S.audio.play("tweet");
      }
    }

    /* ---------- poses ---------- */
    setPose(dt) {
      const J = this.j, t = this.stateT, T = performance.now() / 1000;
      let name = "idle";
      if (this.state === "fly" || this.state === "grabbed" || this.state === "shake") name = "flail";
      else if (this.state === "down") name = "down";
      else if (this.state === "getup") name = "idle";
      else if (this.walking) name = "walk";
      if (this.state === "stand") {
        if (this.spinV > 0.5) name = "spin";
        else if (this.emote) name = this.emote.name;
        else if (this.dizzy > 0) name = "dizzy";
        if (this.squash.target < 1) name = "pancake";
        if (this.panic) name = "panic";
      }
      const sym = (j1, j2, x, y, z) => { J[j1].set(x, y, z); J[j2].set(x, -y, -z); };
      const looseLegs = this.state === "fly" || this.state === "grabbed" || this.state === "shake" || this.state === "down";
      for (const k of ["hipL", "hipR", "knL", "knR"]) J[k].stiff = looseLegs ? 0.45 : 1;

      // defaults
      J.spine.set(Math.sin(T * 2.2) * 0.02, 0, 0);
      J.neck.set(0, clamp(this.pointer.x * 0.35, -0.5, 0.5), 0);
      sym("shL", "shR", 0.05, 0, 0.14);
      sym("elL", "elR", -0.18, 0, 0);
      sym("hipL", "hipR", 0, 0, 0.03);
      sym("knL", "knR", 0.04, 0, 0);

      switch (name) {
        case "walk": {
          const ph = T * 9;
          J.hipL.set(Math.sin(ph) * 0.5, 0, 0.03); J.hipR.set(-Math.sin(ph) * 0.5, 0, -0.03);
          J.knL.set(Math.max(0, -Math.sin(ph)) * 0.7, 0, 0); J.knR.set(Math.max(0, Math.sin(ph)) * 0.7, 0, 0);
          J.shL.set(-Math.sin(ph) * 0.45, 0, 0.12); J.shR.set(Math.sin(ph) * 0.45, 0, -0.12);
          break;
        }
        case "flail": {
          const f = T * 18;
          J.shL.set(Math.sin(f) * 0.7, 0, 2.2 + Math.sin(f * 1.3) * 0.5); J.shR.set(Math.sin(f + 2) * 0.7, 0, -2.2 - Math.sin(f * 1.1) * 0.5);
          J.elL.set(-0.6 + Math.sin(f * 1.7) * 0.5, 0, 0); J.elR.set(-0.6 + Math.sin(f * 1.5 + 1) * 0.5, 0, 0);
          J.hipL.set(Math.sin(f * 0.9) * 0.8, 0, 0.3); J.hipR.set(Math.sin(f * 0.9 + 3) * 0.8, 0, -0.3);
          J.knL.set(0.7 + Math.sin(f) * 0.5, 0, 0); J.knR.set(0.7 + Math.sin(f + 2) * 0.5, 0, 0);
          J.neck.set(-0.25, 0, Math.sin(f * 0.5) * 0.2);
          break;
        }
        case "down":
          sym("shL", "shR", 0, 0, 1.25); sym("elL", "elR", -0.3, 0, 0);
          sym("hipL", "hipR", 0.05, 0, 0.25); sym("knL", "knR", 0.2, 0, 0);
          J.neck.set(0, Math.sin(T * 1.5) * 0.3, 0);
          break;
        case "spin":
          sym("shL", "shR", 0, 0, 1.55); sym("elL", "elR", -0.05, 0, 0); J.neck.set(-0.2, 0, 0.2);
          break;
        case "dizzy":
          sym("shL", "shR", Math.sin(T * 3) * 0.3, 0, 0.35);
          J.spine.set(Math.cos(T * 3.3) * 0.08, 0, Math.sin(T * 3) * 0.15);
          J.neck.set(Math.cos(T * 4) * 0.25, 0, Math.sin(T * 4) * 0.35);
          sym("knL", "knR", 0.25, 0, 0);
          break;
        case "laugh":
          J.spine.set(0.3 + Math.sin(T * 26) * 0.07, 0, 0);
          sym("shL", "shR", -0.7, 0, 0.3); sym("elL", "elR", -1.7, 0, 0);
          J.neck.set(-0.35 + Math.sin(T * 26) * 0.08, 0, 0);
          break;
        case "cry":
          J.spine.set(0.18 + Math.sin(T * 12) * 0.04, 0, 0);
          sym("shL", "shR", -1.35, 0, 0.32); sym("elL", "elR", -2.2, 0, 0);
          J.neck.set(0.32, 0, 0);
          break;
        case "angry":
          J.spine.set(0.12, 0, 0);
          sym("shL", "shR", -0.3 + Math.sin(T * 30) * 0.05, 0, 0.35); sym("elL", "elR", -1.6, 0, 0);
          J.neck.set(0.15, 0, 0);
          break;
        case "confused":
          J.shR.set(-0.6, 0, -2.4); J.elR.set(-2.0 + Math.sin(T * 14) * 0.2, 0, 0);
          J.shL.set(0, 0, 0.5); J.elL.set(-1.3, 0, 0);
          J.neck.set(0, 0, 0.3);
          break;
        case "taunt":
          sym("shL", "shR", -1.25, 0, 0.2); sym("elL", "elR", -0.6 + Math.sin(T * 9) * 0.5, 0, 0);
          J.neck.set(-0.1, 0, Math.sin(T * 4) * 0.1);
          break;
        case "wave":
          J.shR.set(0, 0, -2.7); J.elR.set(-0.3 + Math.sin(T * 11) * 0.45, 0, Math.sin(T * 11) * 0.2);
          J.neck.set(0, 0, 0.12);
          break;
        case "shrug":
          sym("shL", "shR", -0.25, 0, 0.6); sym("elL", "elR", -1.5, 0, 0); J.neck.set(0, 0, 0.25);
          break;
        case "yawn":
          sym("shL", "shR", 0, 0, 2.7); sym("elL", "elR", -0.6, 0, 0); J.spine.set(-0.15, 0, 0); J.neck.set(-0.4, 0, 0);
          break;
        case "dance": {
          const b = T * 8;
          sym("shL", "shR", Math.sin(b) * 0.3, 0, 1.7 + Math.sin(b) * 0.6); sym("elL", "elR", -1 + Math.sin(b * 0.5) * 0.4, 0, 0);
          J.spine.set(0, Math.sin(T * 4) * 0.3, Math.sin(T * 4) * 0.2);
          J.neck.set(Math.abs(Math.sin(b)) * 0.25, 0, 0);
          sym("knL", "knR", 0.2 + Math.abs(Math.sin(b)) * 0.3, 0, 0);
          break;
        }
        case "panic": {
          const ph = T * 16;
          J.hipL.set(Math.sin(ph) * 0.7, 0, 0.03); J.hipR.set(-Math.sin(ph) * 0.7, 0, -0.03);
          J.knL.set(Math.max(0, -Math.sin(ph)) * 0.9, 0, 0); J.knR.set(Math.max(0, Math.sin(ph)) * 0.9, 0, 0);
          J.shL.set(Math.sin(ph * 1.3) * 0.6, 0, 2.4); J.shR.set(Math.sin(ph * 1.1) * 0.6, 0, -2.4);
          J.elL.set(-0.5 + Math.sin(ph * 2) * 0.4, 0, 0); J.elR.set(-0.5 + Math.cos(ph * 2) * 0.4, 0, 0);
          J.neck.set(-0.2, Math.sin(ph * 0.5) * 0.4, 0);
          break;
        }
        case "pancake":
          sym("shL", "shR", 0, 0, 1.5); sym("hipL", "hipR", 0, 0, 0.45);
          break;
        case "comfy":
          sym("shL", "shR", 0, 0, 2.5); sym("elL", "elR", -1.4, 0, 0);
          break;
      }
    }

    /* ---------- random life when left alone ---------- */
    idleBehaviour() {
      if (this.dead || this.burn > 0) return;
      if (this.state !== "stand" || this.emote || this.dizzy > 0 || this.walking || this.spinV > 0.5) return;
      if (this.idleT < this.nextIdle) return;
      this.idleT = 0; this.nextIdle = R(6, 10);
      const party = this.world.envId === "party";
      const opts = party ? ["dance", "dance", "taunt", "wave"] : ["taunt", "taunt", "wave", "shrug", "yawn", "dance", "smug"];
      const e = pick(opts);
      if (e === "smug") { this.react("smug", 2, "taunt"); return; }
      const face = { taunt: "smug", wave: "happy", shrug: "confused", yawn: "sputter", dance: "happy" }[e];
      this.react(face, e === "dance" ? 4 : 2.2, e, e);
      if (e === "dance") this.emote.t = 4;
    }
  }

  S.Buddy = Buddy;
  S.HIP = HIP;
})();
