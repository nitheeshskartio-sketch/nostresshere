/* ============ SMASH IT — Fatality Mode ============
   Pick a finishing move, press EXECUTE, and a scripted cinematic plays on the existing buddy:
   its own camera moves, slow motion, effects, sounds and ending. Every finisher is cartoon / fantasy
   (stone, ice, ash, flattening, launching into the sky…) — never blood or gore — and the photo face
   is always swapped for the drawn cartoon face while this mode is on. */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = THREE.MathUtils.clamp;
  const lerp = THREE.MathUtils.lerp;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeIn = (k) => k * k * k;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const HIP = 1.02;
  const INTRO = 2.0;

  /* ---------- small builders ---------- */
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, o || {}));
  const glow = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 0.85 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = (geo, mat, pos, parent, shadow) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (shadow !== false && !mat.transparent) { m.castShadow = true; m.receiveShadow = true; }
    if (parent) parent.add(m);
    return m;
  };
  const v = (x, y, z) => new V3(x, y, z);
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const TX = {};
  const tex = (k, f) => TX[k] || (TX[k] = f());
  const stoneTex = (rep) => tex("stone" + rep, () => canvasTex(512, 512, (c) => {
    c.fillStyle = "#3e3537"; c.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) {
      const x = i * 128 + (r % 2) * 64, y = r * 64, l = Math.floor(R(105, 140));
      c.fillStyle = "rgb(" + l + "," + (l - 8) + "," + (l - 6) + ")"; c.fillRect(x + 3, y + 3, 122, 58);
      for (let k = 0; k < 30; k++) { c.fillStyle = "rgba(0,0,0," + R(0.05, 0.15) + ")"; c.fillRect(x + R(4, 120), y + R(4, 56), R(2, 6), R(2, 5)); }
    }
  }, [rep, rep]));
  const sigilTex = () => tex("sigil", () => canvasTex(512, 512, (c) => {
    c.translate(256, 256); c.strokeStyle = "#ff3b1f"; c.fillStyle = "#ff3b1f"; c.lineWidth = 10;
    c.beginPath(); c.arc(0, 0, 240, 0, 7); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 214, 0, 7); c.stroke();
    for (let i = 0; i < 24; i++) { c.save(); c.rotate((i / 24) * Math.PI * 2); c.fillRect(-3, -236, 6, 18); c.restore(); }
    // eight curved blades swirling round a centre ring (a neutral "arena" mark)
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate((i / 8) * Math.PI * 2);
      c.beginPath(); c.moveTo(0, -70); c.quadraticCurveTo(60, -120, 18, -190); c.quadraticCurveTo(30, -125, -12, -78); c.closePath(); c.fill();
      c.restore();
    }
    c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 62, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill();
  }));
  const noteTex = () => tex("note", () => canvasTex(128, 128, (c) => { c.fillStyle = "#b2f2bb"; c.font = "bold 100px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("♪", 64, 70); }));
  const tntTex = () => tex("tnt", () => canvasTex(128, 64, (c) => {
    c.fillStyle = "#c92a2a"; c.fillRect(0, 0, 128, 64); c.fillStyle = "#f8f9fa"; c.fillRect(0, 20, 128, 24);
    c.fillStyle = "#212529"; c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("TNT", 64, 33);
  }));
  const hazardTex = () => tex("haz", () => canvasTex(128, 32, (c) => {
    c.fillStyle = "#ffd43b"; c.fillRect(0, 0, 128, 32); c.fillStyle = "#212529";
    for (let x = -32; x < 160; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 48, 0); c.lineTo(x + 32, 0); c.fill(); }
  }, [3, 1]));

  /* =========================================================
     THE FATALITY PIT (room)
     ========================================================= */
  S.ENVS.pit = {
    name: "The Pit", icon: "💀", desc: "Where finishing moves happen.", hidden: true,
    build(w, g) {
      const bg = new THREE.Color("#1c0709");
      w.scene.background = bg; w.scene.fog = new THREE.Fog("#1c0709", 14, 34);
      const floor = mesh(new THREE.PlaneGeometry(60, 40), std("#8a7e80", { map: stoneTex(14), roughness: 0.92 }), [0, 0, -6], g);
      floor.rotation.x = -Math.PI / 2; floor.castShadow = false; w.solids.push(floor);
      const sig = mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: sigilTex(), color: "#d9480f", alphaTest: 0.5 }), [0, 0.012, 0], g);
      sig.rotation.x = -Math.PI / 2;
      // back wall with battlements, low enough to see the red sky above
      const wallM = std("#9a8e90", { map: stoneTex(5), roughness: 0.9 });
      const back = mesh(new THREE.BoxGeometry(14, 3.2, 0.6), wallM, [0, 1.6, -3.9], g); w.solids.push(back);
      for (let x = -6.5; x <= 6.6; x += 1.3) mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), wallM, [x, 3.47, -3.9], g);
      for (const s of [-1, 1]) {
        const side = mesh(new THREE.BoxGeometry(0.6, 3.2, 8), wallM, [s * 5.5, 1.6, -0.3], g); w.solids.push(side);
        // pillars with fire bowls
        const px = s * 3.5;
        mesh(new THREE.CylinderGeometry(0.34, 0.42, 3.6, 12), std("#7a6e70", { map: stoneTex(2), roughness: 0.85 }), [px, 1.8, -3.35], g);
        mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.32, 16), std("#3b3335", { metalness: 0.6, roughness: 0.4 }), [px, 3.76, -3.35], g);
        // banners
        const ban = mesh(new THREE.PlaneGeometry(0.9, 2), std("#8f1d1d", { side: THREE.DoubleSide, roughness: 0.95 }), [s * 1.6, 2.0, -3.58], g);
        const emb = mesh(new THREE.CircleGeometry(0.28, 24), std("#ffc078", { metalness: 0.5, roughness: 0.4 }), [s * 1.6, 2.35, -3.57], g);
        ban.castShadow = emb.castShadow = false;
      }
      // red moon and far mountains
      mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ color: "#ff6b4a", fog: false }), [5, 9, -26], g);
      for (let i = 0; i < 9; i++) { const c = mesh(new THREE.ConeGeometry(R(3, 5), R(4, 8), 5), new THREE.MeshBasicMaterial({ color: "#2b0d10", fog: false }), [-16 + i * 4 + R(-1, 1), 1.6, -22 - R(0, 3)], g, false); c.rotation.y = R(0, 3); }
      g.add(new THREE.HemisphereLight("#ffd0c4", "#3a2224", 1.35));
      w.addSun("#ffe2d6", 2.3, [-3, 8, 5], 8);
      const fires = [-1, 1].map((s) => { const l = new THREE.PointLight("#ff8a3d", 6, 9, 1.6); l.position.set(s * 3.5, 4.2, -3.1); g.add(l); return l; });
      // two spare lights the finishers can use (made once, so nothing recompiles mid-cinematic)
      const fx = [0, 1].map(() => { const l = new THREE.PointLight("#ffffff", 0, 12, 1.5); l.position.set(0, 2, 1); g.add(l); return l; });
      w.arenaData = { pit: true, fxLights: fx, bg };
      let acc = 0;
      w.envUpdate = (dt, t) => {
        fires.forEach((l, i) => { l.intensity = 5 + Math.sin(t * 13 + i * 2) * 0.9 + Math.sin(t * 29 + i) * 0.6; });
        acc += dt;
        if (acc > 0.05) {
          acc = 0;
          const F = S.fatal;
          if (F) for (const s of [-1, 1]) F.glowP.spawn({ pos: v(s * 3.5 + R(-0.25, 0.25), 3.9, -3.35 + R(-0.25, 0.25)), vel: v(R(-0.2, 0.2), R(1, 1.8), R(-0.2, 0.2)), size: R(0.09, 0.17), life: R(0.4, 0.8), color: pick(["#ff922b", "#ffd43b", "#ff6b3d"]), gravity: -1, drag: 1, floor: false });
        }
      };
    },
    props(w) {
      for (const s of [-1, 1]) S.propFactory.vase(w, s * 4.3, 0.27, -2.6, s < 0 ? "#a0522d" : "#7d5a3c");
    }
  };

  /* ---------- prop models used by the finishers ---------- */
  const MK = {
    fist(color) {
      const g = new THREE.Group(), m = glow(color || "#ffd43b", 0.75);
      mesh(new THREE.BoxGeometry(0.75, 0.6, 0.62), m, [0, 0.3, 0], g);
      for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.17, 0.2, 0.62), m, [-0.28 + i * 0.187, 0.7, 0], g);
      mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), m, [0.42, 0.42, 0.12], g);
      mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 12), glow(color || "#ffd43b", 0.35), [0, -0.8, 0], g);
      return g;
    },
    palm(color) {
      const g = new THREE.Group(), m = glow(color || "#66d9e8", 0.6);
      mesh(new THREE.BoxGeometry(0.34, 0.4, 0.06), m, [0, 0, 0], g);
      for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.07, 0.26, 0.05), m, [-0.12 + i * 0.08, 0.32 - Math.abs(i - 1.5) * 0.03, 0], g);
      mesh(new THREE.BoxGeometry(0.07, 0.2, 0.05), m, [0.22, 0.04, 0], g).rotation.z = -0.7;
      return g;
    },
    anvil() {
      const g = new THREE.Group(), m = std("#3d4147", { metalness: 0.8, roughness: 0.35 });
      mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), m, [0, 0.09, 0], g);
      mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), m, [0, 0.28, 0], g);
      mesh(new THREE.BoxGeometry(0.66, 0.16, 0.3), m, [0, 0.46, 0], g);
      const horn = mesh(new THREE.ConeGeometry(0.13, 0.36, 12), m, [0.5, 0.46, 0], g); horn.rotation.z = -Math.PI / 2;
      return g;
    },
    shoe(color) {
      const g = new THREE.Group();
      mesh(new THREE.BoxGeometry(0.13, 0.08, 0.28), std(color || "#2b2b2b", { roughness: 0.4 }), [0, 0.06, 0.02], g);
      mesh(new THREE.BoxGeometry(0.14, 0.03, 0.3), std("#e9ecef"), [0, 0.015, 0.02], g);
      return g;
    },
    skeleton(B) {
      const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: "#e7f5ff" });
      const hy = B.headPos().y - B.com.y;
      mesh(new THREE.SphereGeometry(0.12, 14, 12), m, [0, hy, 0], g, false);
      mesh(new THREE.BoxGeometry(0.13, 0.05, 0.1), m, [0, hy - 0.12, 0.02], g, false);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#000" }), [s * 0.045, hy + 0.01, 0.105], g, false);
      mesh(new THREE.CylinderGeometry(0.02, 0.02, hy - 0.1, 6), m, [0, hy / 2 - 0.05, -0.02], g, false);
      for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.13 - i * 0.01, 0.012, 5, 16, Math.PI * 1.7), m, [0, hy - 0.3 - i * 0.065, 0], g, false); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI * 0.65; }
      mesh(new THREE.BoxGeometry(0.26, 0.08, 0.1), m, [0, 0, 0], g, false);
      for (const s of [-1, 1]) {
        const a = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 6), m, [s * 0.24, hy - 0.5, 0], g, false); a.rotation.z = s * 0.15;
        mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 6), m, [s * 0.09, -0.5, 0], g, false);
      }
      return g;
    },
    chicken() {
      const g = new THREE.Group(), w = std("#f8f9fa", { roughness: 0.9 }), o = std("#ff922b"), r = std("#e03131");
      mesh(new THREE.SphereGeometry(0.3, 18, 14), w, [0, 0.45, 0], g).scale.set(1, 0.9, 1.25);
      const head = new THREE.Group(); head.position.set(0, 0.8, 0.26); g.add(head);
      mesh(new THREE.SphereGeometry(0.15, 14, 12), w, [0, 0, 0], head);
      mesh(new THREE.ConeGeometry(0.05, 0.12, 8), o, [0, -0.02, 0.17], head).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.045, 8, 6), r, [0, 0.13 + (i === 1 ? 0.02 : 0), -0.05 + i * 0.05], head);
      mesh(new THREE.SphereGeometry(0.035, 8, 6), r, [0, -0.1, 0.12], head);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.025, 8, 6), std("#111"), [s * 0.08, 0.03, 0.12], head);
      const tail = mesh(new THREE.ConeGeometry(0.14, 0.3, 8), w, [0, 0.62, -0.38], g); tail.rotation.x = -0.9;
      const legs = [-1, 1].map((s) => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), o, [s * 0.1, 0.12, 0], g));
      g.userData = { head, legs };
      return g;
    },
    duck(s) {
      const g = new THREE.Group(), y = std("#ffd43b", { roughness: 0.35 });
      mesh(new THREE.SphereGeometry(0.14 * s, 14, 10), y, [0, 0, 0], g).scale.set(1, 0.8, 1.25);
      mesh(new THREE.SphereGeometry(0.09 * s, 12, 10), y, [0, 0.13 * s, 0.1 * s], g);
      mesh(new THREE.BoxGeometry(0.07 * s, 0.025 * s, 0.08 * s), std("#ff922b"), [0, 0.11 * s, 0.2 * s], g);
      for (const k of [-1, 1]) mesh(new THREE.SphereGeometry(0.015 * s, 6, 5), std("#111"), [k * 0.045 * s, 0.16 * s, 0.17 * s], g);
      return g;
    },
    tentacle(n) {
      const g = new THREE.Group(), m = std("#7048e8", { roughness: 0.45 }), su = std("#e599f7");
      const segs = [];
      for (let i = 0; i < n; i++) { const r = 0.16 * (1 - i / n) + 0.03; const s = mesh(new THREE.SphereGeometry(r, 12, 10), m, [0, 0, 0], g); if (i % 2) mesh(new THREE.SphereGeometry(r * 0.35, 8, 6), su, [0, 0, r * 0.85], s); segs.push(s); }
      g.userData.segs = segs;
      return g;
    }
  };

  /* =========================================================
     THE FINISHERS
     Each `run(F)` schedules its own timeline on F (times in seconds after the intro).
     ========================================================= */
  const CATS = [
    { id: "classic", name: "Classic", icon: "🥋" },
    { id: "brutal", name: "Brutal", icon: "🔨" },
    { id: "element", name: "Elemental", icon: "🔥" },
    { id: "machine", name: "Machine", icon: "⚙️" },
    { id: "boom", name: "Explosion", icon: "💥" },
    { id: "monster", name: "Monster", icon: "🐉" },
    { id: "fart", name: "Fartalities", icon: "💨" },
    { id: "secret", name: "Secret", icon: "🔒" }
  ];

  // shared bits of choreography
  const CAM = {
    wide: [[0, 2.6, 8.2], [0, 1.05, -0.9]],
    mid: [[0, 1.6, 4.2], [0, 1.15, 0]],
    close: [[0, 1.55, 2.5], [0, 1.4, 0]],
    low: [[1.6, 0.45, 3.2], [0, 1.5, 0]],
    high: [[2.6, 5.5, 4.6], [0, 0.4, 0]],
    top: [[0, 5.2, 1.4], [0, 0, 0]],
    flat: [[2.3, 1.3, 2.7], [0, 0.05, -0.1]],
    side: [[3.6, 1.4, 1.6], [0, 1.1, 0]]
  };
  function flatten(F, t, dur, o) {
    // squash the buddy flat on their back (face up)
    o = o || {};
    F.span(t, t + (dur || 0.08), (k) => {
      F.B.quat.setFromEuler(new E(-Math.PI / 2 * k, o.yaw || 0, 0));
      F.B.root.scale.set(1 + 0.3 * k, 1 + 0.15 * k, 1 - 0.9 * k);
      F.B.com.y = lerp(o.fromY || HIP, 0.06, k);
    });
    F.at(t, () => { F.B.machinePose = "spread"; F.face("ko", 30); });
  }
  function fallBack(F, t, dur) {
    let q0;
    F.at(t, () => { q0 = F.B.quat.clone(); F.B.machinePose = "spread"; });
    F.span(t, t + (dur || 0.6), (k) => {
      const e = easeIn(k);
      F.B.quat.copy(q0).multiply(new Q().setFromAxisAngle(v(1, 0, 0), -Math.PI / 2 * e));
      F.B.com.y = lerp(HIP, 0.2, e);
      if (k >= 1) { S.audio.play("thud", 8); F.W.puff(F.B.com.clone().setY(0.05), 16); F.W.shake(6); }
    });
  }
  function toSky(F, t, dur, to, spin) {
    let from;
    F.at(t, () => { from = F.B.com.clone(); F.B.machinePose = "flail"; });
    F.span(t, t + dur, (k) => {
      const e = easeIn(k);
      F.B.com.lerpVectors(from, to, e);
      F.B.quat.setFromEuler(new E(k * (spin || 9), k * 3, k * (spin || 9) * 0.6));
      if (k >= 1) F.gone();
    });
  }
  function twinkle(F, t, pos) {
    F.at(t, () => {
      const s = F.add(mesh(new THREE.OctahedronGeometry(0.35, 0), glow("#fff3bf", 1), pos.toArray ? pos.toArray() : pos));
      S.audio.play("sparkle");
      F.anim((dt, a) => { s.rotation.z += dt * 4; s.scale.setScalar(Math.max(0.01, Math.sin(Math.min(1, a / 1.2) * Math.PI) * 1.6)); return a < 1.2; });
    });
  }
  function shoeFall(F, t, x, z) {
    let shoe;
    F.at(t, () => { shoe = F.add(MK.shoe(S.OUTFITS[F.B.look.outfit].shoes)); shoe.position.set(x, 9, z); S.audio.play("whistle"); });
    F.span(t, t + 1.1, (k) => {
      shoe.position.y = lerp(9, 0, easeIn(k)); shoe.rotation.set(k * 9, k * 4, 0);
      if (k >= 1) { shoe.rotation.set(0, 0.6, 0); S.audio.play("bonk"); F.W.puff(v(x, 0.05, z), 8); }
    });
  }
  function charred(F, k) { F.tint("#2e2622", k * 0.82); }
  function stoneCrumble(F, t, color) {
    F.at(t, () => {
      S.audio.play("crunch", 10); S.audio.play("shatter");
      const c = F.B.com.clone();
      F.gone();
      F.debris({ pos: c, n: 26, cols: [color, "#868e96", "#495057"], size: [0.06, 0.16], speed: 2.2, up: 1.5, spread: [0.3, 0.9, 0.3] });
      F.smoke(c, 18, "#adb5bd", 0.25);
      F.W.shake(8);
    });
  }

  const LIST = [
    /* ---------------- CLASSIC ---------------- */
    { id: "skysplit", cat: "classic", name: "Sky Splitter", icon: "👊", pv: "rise", color: "#f59f00", desc: "A titanic golden fist bursts from the floor and uppercuts them into orbit.", dur: 6,
      run(F) {
        F.cam(0, 0.7, CAM.low); F.pose(0, "panic"); F.face(0, "scared", 3); F.say(0.1, "W-wait! Can we talk about this?");
        F.at(0.7, () => { F.ring(v(0, 0.03, 0), "#ffa94d", 1.2, 1.2); S.audio.play("rumble"); F.W.shake(4); F.light(0, "#ffa94d", 8, v(0, 0.3, 0.4)); });
        F.span(0.7, 1.4, () => { F.glowP.spawn({ pos: v(R(-0.5, 0.5), 0.05, R(-0.5, 0.5)), vel: v(0, R(2, 4), 0), size: R(0.03, 0.06), life: 0.5, color: "#ffd43b", gravity: 0, floor: false }); });
        let fist;
        F.at(1.3, () => { fist = F.add(MK.fist()); fist.position.set(0, -2.2, 0.15); });
        F.span(1.3, 1.5, (k) => { fist.position.y = lerp(-2.2, 1.0, easeIn(k)); });
        F.slow(1.48, 1.95, 0.12);
        F.at(1.5, () => { F.flash("#fff3bf", 260); F.W.shake(16); S.audio.play("punch", 22); S.audio.play("boom"); F.sparks(F.B.headPos(), 30, "#ffd43b"); F.face("ko", 30); });
        F.cam(1.5, 1.1, [[0, 0.5, 4.6], () => F.B.com.clone().setY(Math.min(F.B.com.y, 9))]);
        F.span(1.5, 2.4, (k) => { fist.position.y = 1.0 + k * 3; fist.children.forEach((c) => (c.material.opacity = 0.75 * (1 - k))); });
        toSky(F, 1.5, 1.9, v(0.4, 34, -3), 7);
        F.at(2.4, () => F.light(0, 0));
        twinkle(F, 3.5, v(0.4, 9, -3));
        F.cam(4.1, 0.8, CAM.mid);
        shoeFall(F, 4.4, 0.2, 0.3);
      } },
    { id: "spirit", cat: "classic", name: "Spirit Rip", icon: "👻", pv: "pulse", color: "#38d9a9", desc: "A green rune pulls their soul right out. The empty shell turns to grey stone.", dur: 5.6,
      run(F) {
        F.cam(0, 0.9, CAM.close); F.pose(0, "spread"); F.face(0, "scared", 5); F.say(0.1, "Why do I feel so… light?");
        F.at(0, () => { F.ring(v(0, 0.03, 0), "#38d9a9", 1.4, 4); F.light(0, "#38d9a9", 10, v(0, 0.5, 1)); S.audio.play("charge"); });
        F.span(0, 1, (k) => { F.B.com.y = HIP + 0.25 * ease(k); });
        let ghost;
        F.at(1, () => { ghost = F.add(F.ghostOf("#63e6be")); S.audio.play("swell"); });
        F.slow(1.6, 2.4, 0.3);
        F.span(1, 3, (k) => {
          ghost.position.copy(F.B.com).add(v(Math.sin(k * 20) * 0.04, 1.1 * ease(k), -0.6 * ease(k)));
          ghost.quaternion.copy(F.B.quat); ghost.scale.setScalar(1 + Math.sin(k * 30) * 0.03);
          F.tint("#868e96", k * 0.9);
          if (Math.random() < 0.5) F.glowP.spawn({ pos: F.B.com.clone().add(v(R(-0.2, 0.2), R(0, 0.9), 0)), vel: v(0, 1.5, -0.6), size: 0.04, life: 0.6, color: "#96f2d7", gravity: 0, floor: false });
        });
        F.cam(1.2, 1.6, [[1.4, 1.8, 3.2], () => ghost ? ghost.position.clone() : v(0, 2, 0)]);
        F.at(3, () => { S.audio.play("whoosh"); F.flash("#96f2d7", 200); S.audio.play("thunder"); });
        F.span(3, 3.6, (k) => { ghost.position.y += k * 0.9; ghost.scale.set(1 - k * 0.6, 1 + k * 2, 1 - k * 0.6); ghost.traverse((o) => { if (o.material) o.material.opacity = 0.5 * (1 - k); }); });
        F.cam(3.2, 0.8, CAM.mid);
        F.at(3.4, () => F.light(0, 0));
        F.at(3.4, () => { F.face("ko", 30); });
        F.span(3.4, 3.9, (k) => { F.B.com.y = HIP + 0.25 * (1 - k); });
        stoneCrumble(F, 4.3, "#868e96");
      } },
    { id: "clones", cat: "classic", name: "Shadow Clone Strike", icon: "🥷", pv: "orbit", color: "#7950f2", desc: "Six shadow warriors rise from the smoke and strike all at once.", dur: 5,
      run(F) {
        const cl = [];
        F.at(0, () => {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, g = new THREE.Group(), m = std("#120d1a", { roughness: 0.9 });
            mesh(new THREE.CapsuleGeometry(0.2, 0.9, 6, 12), m, [0, 0.75, 0], g);
            mesh(new THREE.SphereGeometry(0.17, 14, 12), m, [0, 1.48, 0], g);
            for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ff2d2d" }), [s * 0.06, 1.5, 0.15], g, false);
            g.position.set(Math.sin(a) * 2, -1.8, Math.cos(a) * 2); g.lookAt(0, -1.8, 0);
            F.add(g); cl.push({ g, a });
            F.smoke(v(Math.sin(a) * 2, 0.1, Math.cos(a) * 2), 6, "#1a1325", 0.3);
          }
          S.audio.play("swell"); F.face("scared", 5); F.pose(0, "panic");
        });
        F.say(0.2, "Uh… are these your friends?");
        F.span(0, 1, (k) => { for (const c of cl) c.g.position.y = lerp(-1.8, 0, easeOut(k)); });
        F.span(0.2, 2, (k) => { const a = k * 2.2; F.camSet(v(Math.sin(a) * 4.2, 1.8, Math.cos(a) * 4.2), v(0, 1.1, 0)); });
        F.span(1.8, 2.05, (k) => { for (const c of cl) { const r = lerp(2, 0.45, easeIn(k)); c.g.position.set(Math.sin(c.a) * r, 0, Math.cos(c.a) * r); } });
        F.slow(2.04, 2.7, 0.12);
        F.at(2.05, () => { F.flash("#ff2d2d", 220); F.W.shake(18); S.audio.play("punch", 22); S.audio.play("kick"); F.sparks(F.B.com.clone(), 40, "#ff6b6b"); F.face("ko", 30); });
        F.cam(2.05, 0.6, CAM.mid);
        F.span(2.05, 3, (k) => { F.B.com.y = HIP + 1.4 * easeOut(k); F.B.quat.setFromEuler(new E(0, k * 14, k * 0.4)); });
        F.at(3, () => {
          const c = F.B.com.clone(); F.gone();
          F.smoke(c, 40, "#1a1325", 0.45); S.audio.play("boom");
          for (let i = 0; i < 40; i++) F.W.fx.feather.spawn({ pos: c.clone(), vel: v(R(-4, 4), R(0, 5), R(-4, 4)), size: R(0.15, 0.3), life: R(1.5, 2.5), color: "#212529", gravity: 1.2, drag: 1.5, spin: 8 });
          for (const cc of cl) F.smoke(cc.g.position.clone().setY(0.8), 8, "#1a1325", 0.4);
        });
        F.span(3, 3.4, (k) => { for (const c of cl) c.g.scale.setScalar(Math.max(0.01, 1 - k)); });
      } },
    { id: "drill", cat: "classic", name: "Top Spin Drill", icon: "🌀", pv: "spin", color: "#4dabf7", desc: "Spun like a top until they drill straight down through the floor.", dur: 5,
      run(F) {
        F.cam(0, 0.8, CAM.mid); F.pose(0, "up"); F.face(0, "dizzy", 6); F.say(0, "Whoa whoa whoa whoaaa!");
        let ang = 0;
        F.span(0, 3.4, (k, dt) => {
          ang += dt * (2 + k * 40); F.B.quat.setFromEuler(new E(0, ang, 0));
          if (Math.random() < 0.6) F.W.fx.dust.spawn({ pos: F.B.com.clone().add(v(R(-0.6, 0.6), R(-0.9, 0.5), R(-0.6, 0.6))), vel: v(R(-2, 2), 0.5, R(-2, 2)), size: 0.08, life: 0.5, color: "#ced4da", gravity: 0, drag: 2, grow: 2, floor: false });
        });
        F.at(0.2, () => S.audio.play("spin")); F.at(1, () => S.audio.play("spin")); F.at(1.6, () => { S.audio.play("whoosh"); S.audio.play("rumble"); });
        F.span(1.6, 3.4, (k) => {
          F.B.com.y = HIP - 3.4 * easeIn(k); F.W.shake(3);
          for (let i = 0; i < 3; i++) F.W.fx.shard.spawn({ pos: v(R(-0.3, 0.3), 0.05, R(-0.3, 0.3)), vel: v(R(-3, 3), R(2, 5), R(-3, 3)), size: R(0.03, 0.07), life: 1, color: pick(["#5a5052", "#7a6e70", "#3b3335"]), spin: 10 });
          if (Math.random() < 0.3) F.sparks(v(0, 0.05, 0), 3, "#ffd43b");
        });
        F.at(1.8, () => { const h = F.add(mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: "#050304" }), [0, 0.015, 0])); h.rotation.x = -Math.PI / 2; h.scale.setScalar(0.1); F.anim((dt, a) => { h.scale.setScalar(Math.min(1, 0.1 + a)); return a < 1; }); });
        F.cam(2.2, 1, CAM.high);
        F.at(3.4, () => { F.gone(); F.smoke(v(0, 0.1, 0), 20, "#868e96", 0.3); });
        F.cam(3.6, 1, [[0, 3.2, 1.6], [0, 0, 0]]);
      } },
    { id: "palms", cat: "classic", name: "Thousand Palm Fury", icon: "🖐️", pv: "side", color: "#66d9e8", desc: "A storm of spirit palms, then one giant strike flattens them into the wall.", dur: 6,
      run(F) {
        F.cam(0, 0.5, CAM.close); F.pose(0, "flail");
        let base;
        F.at(0, () => { base = F.B.com.clone(); S.audio.play("charge"); });
        for (let i = 0; i < 22; i++) {
          const t = 0.3 + i * 0.085;
          F.at(t, () => {
            const p = F.add(MK.palm()), a = R(0, Math.PI * 2), from = base.clone().add(v(Math.cos(a) * 1.4, R(-0.3, 0.8), Math.abs(Math.sin(a)) * 1.2 + 0.2)), to = base.clone().setY(base.y + R(0, 0.6));
            p.position.copy(from); p.lookAt(base);
            F.anim((dt, age) => { const k = Math.min(1, age / 0.08); p.position.lerpVectors(from, to, k); if (age > 0.1) { F.remove(p); return false; } return true; });
            F.B.com.copy(base).add(v(R(-0.06, 0.06), R(-0.03, 0.03), R(-0.06, 0.06)));
            S.audio.play(i % 2 ? "slap" : "punch", 8); F.face(pick(["hurt", "ko", "scared"]), 1);
            F.sparks(base.clone().add(v(0, R(0, 0.6), 0.2)), 4, "#99e9f2");
          });
        }
        F.cam(2.3, 0.5, CAM.side);
        let big;
        F.at(2.4, () => { big = F.add(MK.palm("#3bc9db")); big.scale.setScalar(4); big.position.set(0, 1.3, 3); big.lookAt(0, 1.3, 0); S.audio.play("charge"); F.light(0, "#66d9e8", 10, v(0, 1.4, 2)); });
        F.span(2.4, 3, (k) => { big.position.z = lerp(3, 0.9, easeIn(k)); });
        F.slow(2.98, 3.5, 0.15);
        F.at(3, () => { F.flash("#c5f6fa", 240); F.W.shake(20); S.audio.play("punch", 25); S.audio.play("boom"); F.face("ko", 30); F.remove(big); F.light(0, 0, 0); });
        F.span(3, 3.35, (k) => { F.B.com.set(0, lerp(base.y, 1.6, k), lerp(0, -3.4, easeOut(k))); });
        F.at(3.35, () => { S.audio.play("wall"); F.W.shake(12); F.smoke(v(0, 1.6, -3.4), 18, "#adb5bd", 0.3); F.B.machinePose = "spread"; });
        F.span(3.35, 3.5, (k) => { F.B.root.scale.z = 1 - 0.7 * k; });
        F.cam(3.4, 0.8, [[0, 1.6, 1.4], [0, 1.2, -3.4]]);
        F.span(4, 5.2, (k) => { F.B.com.y = lerp(1.6, 0.9, easeIn(k)); });
        F.cam(5.1, 0.6, [[0, 2.4, 0.4], [0, 0.2, -2.6]]);
        F.span(5.2, 5.6, (k) => { F.B.quat.setFromEuler(new E(Math.PI / 2 * easeIn(k), 0, 0)); F.B.com.z = lerp(-3.4, -2.6, k); F.B.com.y = lerp(0.9, 0.15, easeIn(k)); if (k >= 1) { S.audio.play("thud", 6); F.W.puff(v(0, 0.05, -2.6), 12); } });
      } },

    /* ---------------- BRUTAL ---------------- */
    { id: "anvils", cat: "brutal", name: "Anvil Storm", icon: "⚒️", pv: "drop", color: "#868e96", desc: "Anvils rain from the sky. They dodge eight of them. Not the ninth.", dur: 6.4,
      run(F) {
        F.cam(0, 0.8, [[0, 3.4, 6.4], [0, 0.8, 0]]); F.pose(0, "panic"); F.face(0, "scared", 8); F.say(0.2, "Why is it raining ANVILS?!");
        for (let i = 0; i < 8; i++) {
          const t = 0.4 + i * 0.28, x = R(-2.4, 2.4), z = R(-1.6, 1.4);
          let a;
          F.at(t, () => { a = F.add(MK.anvil()); a.position.set(x, 9, z); a.rotation.y = R(0, 3); });
          F.span(t, t + 0.5, (k) => { a.position.y = lerp(9, 0, easeIn(k)); if (k >= 1) { S.audio.play("anvil"); F.W.shake(6); F.W.puff(v(x, 0.05, z), 10); } });
        }
        F.span(0.4, 2.8, (k) => { F.B.com.x = Math.sin(k * 14) * 0.6; });
        let sh, big;
        F.at(2.8, () => { sh = F.add(mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0 }), [0, 0.02, 0])); sh.rotation.x = -Math.PI / 2; S.audio.play("whistle"); F.pose(0, "up"); F.face("scared", 5); });
        F.span(2.8, 3.6, (k) => { sh.material.opacity = 0.6 * k; sh.scale.setScalar(0.3 + k * 1.3); F.B.com.x *= 0.9; });
        F.cam(2.8, 0.6, [[1.2, 0.4, 2.6], [0, 3, -0.5]]);
        F.at(3.4, () => { big = F.add(MK.anvil()); big.scale.setScalar(4.2); big.position.set(0, 12, 0); });
        F.span(3.4, 3.75, (k) => { big.position.y = lerp(12, 0, easeIn(k)); });
        F.slow(3.72, 4.2, 0.15);
        F.cam(3.6, 0.3, CAM.wide);
        F.at(3.75, () => { F.flash("#fff", 160); F.W.shake(26); S.audio.play("anvil"); S.audio.play("boom"); F.ring(v(0, 0.04, 0), "#ced4da", 3, 0.8); F.smoke(v(0, 0.2, 0), 30, "#ced4da", 0.35); });
        flatten(F, 3.75, 0.05);
        F.at(3.8, () => F.B.com.set(0, 0.06, 0));
        F.span(4.6, 5.4, (k) => { big.position.y = lerp(0, 9, easeIn(k)); });
        F.cam(4.6, 0.8, CAM.flat);
        F.at(5.6, () => S.audio.play("squeak"));
      } },
    { id: "hammer", cat: "brutal", name: "Titan's Hammer", icon: "🔨", pv: "drop", color: "#e8590c", desc: "A hammer the size of a house swings down from behind them.", dur: 5.4,
      run(F) {
        const piv = new THREE.Group(); piv.position.set(0, 0.55, -2.7);
        F.at(0, () => {
          F.add(piv);
          const wood = std("#6b4423", { roughness: 0.8 }), st = std("#6c6466", { map: stoneTex(1), roughness: 0.85 }), gold = std("#f59f00", { metalness: 0.7, roughness: 0.3 });
          mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.7, 10), wood, [0, 1.35, 0], piv);
          mesh(new THREE.BoxGeometry(1.3, 0.85, 0.85), st, [0, 2.7, 0], piv);
          for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.9, 0.9), gold, [s * 0.5, 2.7, 0], piv);
          piv.rotation.x = -0.15; S.audio.play("rumble"); F.pose(0, "confused"); F.face("confused", 3);
        });
        F.cam(0, 0.8, [[3, 0.9, 4.4], [0, 2.4, -1.6]]);
        F.say(0.4, "That is a very big hammer.");
        F.span(0.5, 1.9, (k) => { piv.rotation.x = lerp(-0.15, -0.65, ease(k)); });
        F.at(1.5, () => { F.face("scared", 5); F.pose(0, "panic"); S.audio.play("whoosh"); });
        F.span(1.9, 2.15, (k) => { piv.rotation.x = lerp(-0.65, Math.PI / 2, easeIn(k)); });
        F.slow(2.14, 2.7, 0.15);
        F.cam(1.9, 0.2, [[3.6, 1.4, 2.6], [0, 0.6, 0]]);
        F.at(2.15, () => {
          F.flash("#fff", 170); F.W.shake(28); S.audio.play("boom"); S.audio.play("crunch", 20);
          F.ring(v(0, 0.05, 0), "#ffc078", 3.5, 0.7); F.smoke(v(0, 0.3, 0.2), 30, "#ced4da", 0.4);
          F.debris({ pos: v(0, 0.2, 0.3), n: 16, cols: ["#5a5052", "#7a6e70"], size: [0.05, 0.12], speed: 5, up: 3 });
        });
        flatten(F, 2.15, 0.05);
        F.span(3.4, 4.2, (k) => { piv.rotation.x = lerp(Math.PI / 2, -0.1, ease(k)); });
        F.cam(3.5, 0.9, CAM.flat);
      } },
    { id: "meteor", cat: "brutal", name: "Meteor Fall", icon: "☄️", pv: "drop", color: "#fa5252", desc: "The sky goes red. One blazing meteor. One very precise target.", dur: 6.4,
      run(F) {
        F.cam(0, 1, [[0, 1.2, 6], [2, 6, -6]]); F.sky("#3a0505", 1);
        F.say(0.1, "Is that a shooting star? Make a wish!");
        let m;
        const from = v(9, 22, -16), to = v(0, 0.3, 0);
        F.at(0.6, () => {
          m = F.add(new THREE.Group());
          mesh(new THREE.IcosahedronGeometry(0.9, 1), std("#3b2a22", { emissive: "#ff4d1a", emissiveIntensity: 0.9, roughness: 0.9, flatShading: true }), [0, 0, 0], m);
          mesh(new THREE.SphereGeometry(1.25, 18, 14), glow("#ff922b", 0.35), [0, 0, 0], m);
          m.position.copy(from); S.audio.play("whistle"); S.audio.play("rumble"); F.light(0, "#ff6b3d", 0, from);
        });
        F.span(0.6, 2.9, (k) => {
          m.position.lerpVectors(from, to, easeIn(k)); m.rotation.x += 0.1;
          F.lightAt(0, m.position, 12 * k);
          for (let i = 0; i < 3; i++) F.glowP.spawn({ pos: m.position.clone().add(v(R(-0.5, 0.5), R(-0.5, 0.5), R(-0.5, 0.5))), vel: v(R(-0.5, 0.5), R(0, 1), R(-0.5, 0.5)), size: R(0.2, 0.4), life: R(0.3, 0.6), color: pick(["#ff922b", "#ffd43b", "#fa5252"]), gravity: 0, grow: 1, floor: false });
        });
        F.at(1.6, () => { F.pose(0, "panic"); F.face("scared", 6); });
        F.cam(1.8, 0.8, CAM.wide);
        F.slow(2.88, 3.5, 0.15);
        F.at(2.9, () => {
          F.flash("#ffd8a8", 300); F.W.shake(32); S.audio.play("boom"); S.audio.play("thunder");
          F.blast(v(0, 0.4, 0), "#ff922b", 3.5, 0.6); F.ring(v(0, 0.05, 0), "#ff6b3d", 4.5, 0.9);
          F.debris({ pos: v(0, 0.3, 0), n: 22, cols: ["#3b2a22", "#5a5052"], size: [0.06, 0.16], speed: 6, up: 4 });
          const cr = F.add(mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: "#120807", transparent: true, opacity: 0.85, depthWrite: false }), [0, 0.016, 0])); cr.rotation.x = -Math.PI / 2;
          F.face("ko", 30); charred(F, 1);
        });
        let b0;
        F.at(2.9, () => { b0 = F.B.com.clone(); });
        F.span(2.9, 3.8, (k) => { F.B.com.set(lerp(0, 2.4, k), b0.y + Math.sin(k * Math.PI) * 2, lerp(0, 0.8, k)); F.B.quat.setFromEuler(new E(-k * Math.PI * 2.5, 0, k * 2)); if (k >= 1) { F.B.quat.setFromEuler(new E(-Math.PI / 2, 0, 0.4)); F.B.com.y = 0.2; S.audio.play("thud", 8); F.W.puff(v(2.4, 0.05, 0.8), 14); } });
        F.span(2.9, 3.6, (k) => { const gl = m.children[1]; gl.material.opacity = 0.35 * (1 - k); m.children[0].material.emissiveIntensity = 0.9 - 0.5 * k; });
        F.span(3, 6.4, () => { m.position.y = Math.max(-0.4, m.position.y - 0.002); if (Math.random() < 0.25) F.smoke(F.B.com.clone().add(v(0, 0.2, 0)), 1, "#495057", 0.15); });
        F.cam(3.6, 1.2, [[3.6, 1.6, 3.6], [1.4, 0.3, 0.4]]);
      } },
    { id: "pillars", cat: "brutal", name: "Pillar Clap", icon: "🗿", pv: "clap", color: "#a9a9a9", desc: "Two stone pillars rise either side… and clap together.", dur: 5.6,
      run(F) {
        const P = [];
        F.at(0, () => {
          for (const s of [-1, 1]) { const p = F.add(mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), std("#7a6e70", { map: stoneTex(1), roughness: 0.9 }), [s * 2.4, -1.7, 0])); p.userData.s = s; P.push(p); }
          S.audio.play("rumble"); F.W.shake(5); F.pose(0, "confused"); F.face("confused", 3);
        });
        F.cam(0, 0.8, CAM.mid);
        F.span(0, 1.2, (k) => { for (const p of P) p.position.y = lerp(-1.7, 1.6, easeOut(k)); });
        F.say(0.6, "Okay, nice décor, very dramatic.");
        F.at(1.5, () => { F.face("scared", 4); F.pose(0, "up"); });
        F.span(1.8, 2.05, (k) => { for (const p of P) p.position.x = p.userData.s * lerp(2.4, 0.66, easeIn(k)); });
        F.slow(2.04, 2.6, 0.15);
        F.at(2.05, () => { F.flash("#fff", 150); F.W.shake(24); S.audio.play("crunch", 20); S.audio.play("boom"); F.smoke(v(0, 2.2, 0), 25, "#ced4da", 0.35); });
        F.span(2.05, 2.1, (k) => { F.B.root.scale.x = 1 - 0.94 * k; });
        F.span(2.9, 3.7, (k) => { for (const p of P) p.position.x = p.userData.s * lerp(0.66, 2.6, ease(k)); });
        F.cam(3, 0.8, [[2.4, 1.4, 2.4], [0, 1, 0]]);
        F.span(3.9, 4.6, (k) => { F.B.quat.setFromEuler(new E(Math.PI / 2 * easeIn(k), 0, 0)); F.B.com.y = lerp(HIP, 0.06, easeIn(k)); F.B.com.z = lerp(0, 0.9, k); if (k >= 1) { S.audio.play("slide"); F.W.puff(v(0, 0.05, 0.9), 10); } });
        F.span(4.6, 5.4, (k) => { for (const p of P) p.position.y = lerp(1.6, -1.8, easeIn(k)); });
        F.cam(4.5, 0.8, [[1.4, 2.6, 3.4], [0, 0, 0.7]]);
      } },
    { id: "boulder", cat: "brutal", name: "Boulder Bowling", icon: "🎳", pv: "side", color: "#8d6e63", desc: "A rolling boulder, ten bowling pins and one human pin.", dur: 5.4,
      run(F) {
        const pins = [];
        F.at(0, () => {
          const w = std("#f8f9fa", { roughness: 0.3 }), r = std("#e03131");
          const prof = [[0, 0], [0.07, 0], [0.1, 0.12], [0.06, 0.3], [0.045, 0.36], [0.065, 0.45], [0, 0.52]].map(([a, b]) => new THREE.Vector2(a, b));
          let i = 0;
          for (let row = 0; row < 4; row++) for (let c = 0; c <= row; c++) {
            const g = new THREE.Group(); mesh(new THREE.LatheGeometry(prof, 14), w, [0, 0, 0], g); mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.03, 12), r, [0, 0.33, 0], g);
            g.position.set(2.2 + row * 0.32, 0, -0.5 + (c - row / 2) * 0.3); F.add(g); pins.push(g); i++;
          }
        });
        let bo;
        F.at(0, () => { bo = F.add(mesh(new THREE.IcosahedronGeometry(1.05, 1), std("#7a6e70", { flatShading: true, roughness: 0.95 }), [-10, 1.05, 0])); S.audio.play("rumble"); });
        F.cam(0, 0.7, [[-1, 0.5, 4.2], [-2, 1, 0]]); F.face(0.4, "scared", 6); F.pose(0.4, "panic"); F.say(0.5, "Not the face! Not the face!");
        F.span(0, 1.9, (k) => { bo.position.x = lerp(-10, -0.9, k); bo.rotation.z = -bo.position.x / 1.05; F.W.shake(2); });
        F.span(0.6, 1.9, (k) => { F.B.com.x = 0.6 * k; });
        F.slow(1.88, 2.4, 0.15);
        F.at(1.9, () => { F.flash("#fff", 140); F.W.shake(16); S.audio.play("crunch", 14); S.audio.play("wood"); F.face("ko", 30); });
        F.span(1.9, 2.8, (k) => { bo.position.x = lerp(-0.9, 12, k); bo.rotation.z = -bo.position.x / 1.05; });
        F.cam(1.9, 1, [[0, 2.2, 6.5], [2, 1.5, -1]]);
        toSky(F, 1.9, 1.4, v(7, 13, -16), 6);
        F.at(2.15, () => {
          S.audio.play("wood"); S.audio.play("clank");
          for (const p of pins) { const pos = p.position.clone(); F.remove(p); const pr = F.debris({ mesh: p, pos: pos.add(v(0, 0.26, 0)), r: 0.08, vel: v(R(3, 7), R(2, 5), R(-3, 3)) }); }
        });
        twinkle(F, 3.6, v(4, 7.5, -10));
      } },

    /* ---------------- ELEMENTAL ---------------- */
    { id: "freeze", cat: "element", name: "Deep Freeze", icon: "🧊", pv: "pulse", color: "#74c0fc", desc: "A freezing wind locks them in ice… then the ice shatters.", dur: 6.4,
      run(F) {
        F.sky("#0b2a40", 1); F.cam(0, 1, CAM.mid); F.pose(0, "up"); F.face(0, "scared", 8);
        F.say(0.1, "It's… s-s-so… c-cold…");
        F.at(0, () => { S.audio.play("freeze"); F.ring(v(0, 0.03, 0), "#a5d8ff", 1.8, 5); F.light(0, "#74c0fc", 8, v(0, 1, 1.2)); });
        F.span(0, 4, () => { for (let i = 0; i < 2; i++) { const a = R(0, 6.28); F.glowP.spawn({ pos: v(Math.cos(a) * 1.6, R(0, 2.4), Math.sin(a) * 1.6), vel: v(-Math.sin(a) * 2 - Math.cos(a), R(-0.2, 0.2), Math.cos(a) * 2 - Math.sin(a)), size: 0.025, life: 0.8, color: "#e7f5ff", gravity: 0, floor: false }); } });
        F.span(0.4, 2, (k) => { F.tint("#a5d8ff", k * 0.75, "#1c7ed6", k * 0.25); });
        const cr = [];
        F.at(0.5, () => { for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28 + R(-0.2, 0.2), c = F.add(mesh(new THREE.ConeGeometry(R(0.06, 0.12), R(0.4, 0.9), 5), std("#d0ebff", { transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.1 }), [Math.cos(a) * R(0.5, 0.8), 0, Math.sin(a) * R(0.5, 0.8)])); c.rotation.set(R(-0.4, 0.4), 0, R(-0.4, 0.4)); c.scale.setScalar(0.01); cr.push(c); } });
        F.span(0.5, 1.6, (k) => { for (const c of cr) c.scale.setScalar(Math.max(0.01, easeOut(k))); });
        let ice;
        F.at(1.6, () => { ice = F.add(mesh(new THREE.BoxGeometry(1.05, 2.15, 0.85), std("#c5e4ff", { transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.2, depthWrite: false }), [0, 1.07, 0])); ice.scale.y = 0.01; ice.position.y = 0; S.audio.play("freeze"); });
        F.span(1.6, 2.2, (k) => { ice.scale.y = Math.max(0.01, k); ice.position.y = 1.07 * k; });
        F.span(2.2, 4, (k) => { const a = k * Math.PI; F.camSet(v(Math.sin(a) * 3.2, 1.6, Math.cos(a) * 3.2), v(0, 1.1, 0)); });
        F.at(3.4, () => { S.audio.play("shatter"); F.W.shake(3); });
        F.cam(4, 0.3, CAM.mid);
        F.slow(4.3, 4.9, 0.2);
        F.at(4.3, () => {
          F.flash("#e7f5ff", 220); S.audio.play("shatter"); S.audio.play("crunch", 10); F.W.shake(14);
          F.remove(ice); for (const c of cr) F.remove(c);
          const c = F.B.com.clone(); F.gone();
          F.debris({ pos: c, n: 34, cube: true, cols: ["#d0ebff", "#a5d8ff", "#e7f5ff"], size: [0.07, 0.15], speed: 4, up: 3, spread: [0.35, 0.9, 0.3], mat: { transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.1, emissive: "#4dabf7", emissiveIntensity: 0.45 } });
          for (let i = 0; i < 40; i++) F.W.fx.shard.spawn({ pos: c.clone().add(v(R(-0.3, 0.3), R(-0.8, 0.8), 0)), vel: v(R(-5, 5), R(0, 5), R(-5, 5)), size: R(0.02, 0.05), life: R(0.8, 1.5), color: "#e7f5ff", spin: 14 });
          F.light(0, 0, 0);
        });
      } },
    { id: "inferno", cat: "element", name: "Inferno Pillar", icon: "🔥", pv: "rise", color: "#ff6b00", desc: "A ring of flames, a roaring fire column, and a pile of ash on the wind.", dur: 6.4,
      run(F) {
        F.cam(0, 0.8, CAM.low); F.face(0, "scared", 8); F.pose(0, "panic"); F.say(0.1, "Is it getting hot in here?!");
        F.at(0, () => { S.audio.play("ignite"); F.light(0, "#ff6b00", 10, v(0, 0.6, 0.8)); });
        F.span(0, 1.5, () => { for (let i = 0; i < 4; i++) { const a = R(0, 6.28); F.fire(v(Math.cos(a) * 1.2, 0.05, Math.sin(a) * 1.2), 1, 0.05); } });
        let col;
        F.at(1.5, () => {
          col = F.add(new THREE.Group());
          mesh(new THREE.CylinderGeometry(0.6, 0.85, 8, 24, 1, true), glow("#ff6b00", 0.35), [0, 4, 0], col);
          mesh(new THREE.CylinderGeometry(0.4, 0.55, 8, 24, 1, true), glow("#ffa94d", 0.3), [0, 4, 0], col);
          col.scale.set(1, 0.01, 1); S.audio.play("fire"); S.audio.play("roar"); F.W.shake(10); F.flash("#ffc078", 150);
        });
        F.span(1.5, 1.8, (k) => { col.scale.y = Math.max(0.01, k); });
        F.slow(1.6, 2.2, 0.25);
        F.span(1.5, 3.4, (k) => { charred(F, k); F.lightAt(0, v(0, 1.4, 0.8), 18); col.rotation.y += 0.2; if (Math.random() < 0.7) F.fire(v(R(-0.6, 0.6), R(0, 2.2), R(-0.6, 0.6)), 1, 0.05, 4); F.B.machinePose = "flail"; });
        F.cam(1.6, 1.6, [[0, 3.6, 3.2], [0, 1.6, 0]]);
        F.span(3.4, 3.9, (k) => { col.scale.set(1 - k, 1, 1 - k); if (k >= 1) F.remove(col); });
        F.at(3.4, () => { F.pose(0, "spread"); F.face("ko", 30); F.light(0, "#ff6b00", 3, v(0, 0.5, 0.8)); });
        F.span(3.4, 4.6, () => { if (Math.random() < 0.4) F.smoke(F.B.headPos(), 1, "#495057", 0.12); });
        F.cam(3.6, 1, CAM.close);
        F.at(4.6, () => {
          S.audio.play("whoosh"); const c = F.B.com.clone(); F.gone(); F.light(0, 0, 0);
          for (let i = 0; i < 70; i++) F.smokeP.spawn({ pos: c.clone().add(v(R(-0.25, 0.25), R(-1, 0.8), R(-0.15, 0.15))), vel: v(R(1.5, 3.5), R(0, 1), R(-0.5, 0.5)), size: R(0.04, 0.09), life: R(1, 2), color: pick(["#343a40", "#495057", "#212529"]), gravity: -0.2, drag: 0.6, floor: false });
          const pile = F.add(mesh(new THREE.ConeGeometry(0.4, 0.22, 16), std("#343a40", { roughness: 1 }), [0, 0.11, 0])); pile.scale.setScalar(0.1);
          F.anim((dt, a) => { pile.scale.setScalar(Math.min(1, 0.1 + a)); return a < 1; });
        });
        F.cam(4.7, 1.2, CAM.mid);
      } },
    { id: "thunder", cat: "element", name: "Thunder Judgment", icon: "⚡", pv: "drop", color: "#ffd43b", desc: "The sky turns black. Lightning finds its target. X-ray included.", dur: 5.8,
      run(F) {
        F.sky("#05060d", 0.8); F.cam(0, 0.8, [[0, 1.2, 5.5], [0, 2.5, 0]]); F.face(0, "scared", 4); F.say(0.2, "I should not have worn metal buttons.");
        for (const [t, x, z] of [[0.6, -2.6, -1], [1.1, 2.4, -2], [1.6, -1.2, 1.2]]) F.at(t, () => F.bolt(v(x + R(-1, 1), 9, z), v(x, 0, z)));
        let sk;
        F.at(2.3, () => { F.bolt(v(0.6, 10, -1), F.B.headPos()); S.audio.play("zap"); sk = F.add(MK.skeleton(F.B)); sk.position.copy(F.B.com); sk.quaternion.copy(F.B.quat); F.light(1, "#a5d8ff", 14, v(0, 1.5, 1)); F.pose(0, "spread"); });
        F.cam(2.3, 0.3, CAM.close);
        F.slow(2.3, 3.3, 0.35);
        F.span(2.3, 3.3, (k) => { const on = Math.floor(k * 22) % 2 === 0; F.B.root.visible = !on; sk.visible = on; sk.position.copy(F.B.com); F.B.com.x = R(-0.03, 0.03); if (Math.random() < 0.4) S.audio.play("zap"); if (Math.random() < 0.5) F.sparks(F.B.com.clone().add(v(0, R(-0.6, 0.8), 0)), 3, "#a5d8ff"); });
        F.at(3.3, () => { F.remove(sk); F.B.root.visible = true; charred(F, 1); F.face("dizzy", 30); F.light(1, 0, 0); F.B.dizzy = 4; });
        F.span(3.3, 4.6, () => { if (Math.random() < 0.4) F.smoke(F.B.headPos().add(v(0, 0.1, 0)), 1, "#868e96", 0.12); });
        F.say(3.6, "…ow.");
        F.cam(3.4, 1, CAM.mid);
        fallBack(F, 4.4, 0.55);
      } },
    { id: "lava", cat: "element", name: "Lava Geyser", icon: "🌋", pv: "rise", color: "#e8590c", desc: "The floor cracks open. A geyser of lava. They come down as a stone statue.", dur: 6.4,
      run(F) {
        F.cam(0, 0.8, CAM.low); F.face(0, "scared", 6);
        const cracks = [];
        F.at(0, () => { S.audio.play("rumble"); F.light(0, "#ff4d1a", 0, v(0, 0.2, 0.3)); for (let i = 0; i < 7; i++) { const c = F.add(mesh(new THREE.PlaneGeometry(0.06, R(1, 1.8)), glow("#ff6b00", 0.95), [0, 0.02, 0])); c.rotation.set(-Math.PI / 2, 0, (i / 7) * 6.28); c.translateY(0.6); c.scale.y = 0.01; cracks.push(c); } });
        F.span(0, 1.4, (k) => { for (const c of cracks) c.scale.y = Math.max(0.01, k); F.W.shake(2 + k * 3); F.lightAt(0, v(0, 0.3, 0.3), 10 * k); });
        F.say(0.2, "Why is the floor glowing?");
        let gy;
        F.at(1.5, () => { gy = F.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, 6, 18, 1, true), glow("#ff922b", 0.7), [0, 3, 0])); gy.scale.y = 0.01; S.audio.play("fire"); S.audio.play("boom"); F.flash("#ffa94d", 150); F.pose(0, "flail"); });
        F.span(1.5, 2.6, (k) => { gy.scale.y = Math.max(0.01, Math.min(1, k * 3)); F.B.com.y = HIP + 6 * easeOut(k); F.B.quat.setFromEuler(new E(k * 6, 0, k * 2)); F.tint("#6c6466", k * 0.4, "#ff4d1a", 0.6 * k); for (let i = 0; i < 4; i++) F.W.fx.drop.spawn({ pos: v(R(-0.4, 0.4), R(0.5, 4), R(-0.4, 0.4)), vel: v(R(-3, 3), R(2, 7), R(-3, 3)), size: R(0.03, 0.07), life: 1, color: pick(["#ff922b", "#fa5252", "#ffd43b"]) }); });
        F.cam(1.6, 1, [[0, 1, 6], () => F.B.com.clone()]);
        F.span(2.6, 3.6, (k) => { gy.scale.set(1 - k, 1, 1 - k); F.tint("#6c6466", 0.4 + 0.55 * k, "#ff4d1a", 0.6 * (1 - k)); F.B.com.y = HIP + 6 - 6 * easeIn(k); F.B.quat.setFromEuler(new E(6 + k * (Math.PI * 2 - 6), 0, 2 * (1 - k))); if (k >= 1) F.B.quat.identity(); });
        F.at(2.6, () => F.pose(0, "up"));
        F.at(3.6, () => { F.remove(gy); F.W.shake(14); S.audio.play("thud", 12); F.smoke(v(0, 0.1, 0), 20, "#868e96", 0.3); F.face("ko", 30); F.light(0, 0, 0); });
        F.cam(3.5, 0.5, CAM.mid);
        F.at(4.4, () => { S.audio.play("shatter"); F.sparks(F.B.com.clone(), 6, "#adb5bd"); });
        stoneCrumble(F, 5, "#6c6466");
      } },
    { id: "cyclone", cat: "element", name: "Cyclone Ascension", icon: "🌪️", pv: "spin", color: "#adb5bd", desc: "A tornado spins them sky-high and drops them head-first into the floor.", dur: 6.2,
      run(F) {
        let tw;
        F.at(0, () => {
          tw = F.add(new THREE.Group());
          for (let i = 0; i < 8; i++) mesh(new THREE.CylinderGeometry(0.4 + i * 0.22, 0.3 + i * 0.22, 0.9, 18, 1, true), glow("#dee2e6", 0.12 + (i % 2) * 0.06), [0, i * 0.85 + 0.45, 0], tw);
          tw.scale.setScalar(0.01); S.audio.play("swell");
        });
        F.cam(0, 1, CAM.wide);
        F.span(0, 1, (k) => { tw.scale.setScalar(Math.max(0.01, k)); });
        F.span(0, 4, (k, dt) => { tw.rotation.y += dt * 12; for (let i = 0; i < 3; i++) { const a = R(0, 6.28), h = R(0, 6); F.W.fx.dust.spawn({ pos: v(Math.cos(a) * (0.5 + h * 0.2), h, Math.sin(a) * (0.5 + h * 0.2)), vel: v(-Math.sin(a) * 4, 1, Math.cos(a) * 4), size: 0.12, life: 0.6, color: "#ced4da", gravity: 0, drag: 0.5, grow: 1, floor: false }); } });
        F.at(0.6, () => { F.pose(0, "flail"); F.face("dizzy", 10); S.audio.play("whoosh"); });
        F.say(0.8, "Wheeeeee— wait, nooo!");
        F.span(1, 3.4, (k) => { const a = k * 26, r = 0.35 + k * 0.8; F.B.com.set(Math.cos(a) * r, HIP + k * 9, Math.sin(a) * r); F.B.quat.setFromEuler(new E(k * 4, a, k * 2)); });
        F.cam(1, 2.2, [[0, 1, 7], () => F.B.com.clone().setY(Math.min(F.B.com.y, 7))]);
        F.span(3.4, 4.2, (k) => { tw.scale.setScalar(Math.max(0.01, 1 - k)); });
        F.cam(3.6, 0.6, [[0, 2, 5], [0, 1, 0]]);
        F.at(4.2, () => { F.B.root.visible = true; S.audio.play("whistle"); F.B.machinePose = "flail"; });
        F.span(4.2, 4.9, (k) => { F.B.com.set(0, lerp(12, 0.2, easeIn(k)), 0.3); F.B.quat.setFromEuler(new E(0, 0, Math.PI)); });
        F.at(4.9, () => { S.audio.play("thud", 12); F.W.shake(12); F.ring(v(0, 0.04, 0.3), "#ced4da", 1.4, 0.6); F.smoke(v(0, 0.1, 0.3), 16, "#ced4da", 0.3); });
        F.cam(4.9, 0.6, [[1.4, 1, 2.6], [0, 0.5, 0.3]]);
      } },
    { id: "sand", cat: "element", name: "Sandstorm Erosion", icon: "🏜️", pv: "side", color: "#e9c46a", desc: "A desert wind wears them away, grain by grain, into a sand pile.", dur: 5.4,
      run(F) {
        F.sky("#6b4b1f", 1); F.cam(0, 1, [[2.4, 1.4, 3.4], [0, 1, 0]]); F.face(0, "confused", 3); F.say(0.2, "I've got sand in places I didn't know I had.");
        F.at(0, () => { S.audio.play("swell"); });
        F.span(0, 5, () => { for (let i = 0; i < 4; i++) F.W.fx.dust.spawn({ pos: v(-5, R(0, 2.5), R(-2, 2)), vel: v(R(5, 8), R(-0.3, 0.3), 0), size: R(0.04, 0.08), life: 1.6, color: "#e9c46a", gravity: 0, floor: false }); });
        let pile;
        F.at(0.8, () => { F.face("scared", 6); F.pose(0, "spread"); pile = F.add(mesh(new THREE.ConeGeometry(0.85, 0.65, 24), std("#d4a64a", { roughness: 1 }), [0, 0, 0])); pile.scale.set(0.01, 0.01, 0.01); S.audio.play("swell"); });
        F.span(0.8, 3.8, (k) => {
          F.tint("#d4a64a", Math.min(1, k * 2.2));
          const s = Math.max(0.02, 1 - easeIn(k)); F.B.root.scale.set(1 - 0.2 * k, s, 1 - 0.2 * k); F.B.com.y = HIP * s;
          pile.scale.set(k, k, k); pile.position.y = 0.32 * k;
          for (let i = 0; i < 4; i++) F.W.fx.dust.spawn({ pos: F.B.com.clone().add(v(R(-0.2, 0.2), R(-HIP * s, HIP * s * 0.8), R(-0.1, 0.1))), vel: v(R(1.5, 3), R(-0.5, 0.5), R(-0.3, 0.3)), size: 0.04, life: 1, color: "#d4a64a", gravity: 1, floor: true });
        });
        F.cam(2, 1.6, CAM.mid);
        F.at(3.8, () => F.gone());
      } },

    /* ---------------- MACHINE ---------------- */
    { id: "crusher", cat: "machine", name: "Mega Crusher 9000", icon: "🏗️", pv: "drop", color: "#fab005", desc: "Sirens. Warning lights. A hydraulic press the size of a truck.", dur: 5.6,
      run(F) {
        const blk = new THREE.Group();
        F.at(0, () => {
          F.add(blk); const st = std("#495057", { metalness: 0.6, roughness: 0.4 });
          mesh(new THREE.BoxGeometry(2.2, 0.9, 2.2), st, [0, 0.45, 0], blk);
          for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(2.22, 0.25, 0.02), std("#ffd43b", { map: hazardTex() }), [0, 0.45, s * 1.11], blk); }
          mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 16), std("#ced4da", { metalness: 0.9, roughness: 0.2 }), [0, 6.9, 0], blk);
          blk.position.y = 10; S.audio.play("siren"); F.face("scared", 6); F.pose(0, "panic");
        });
        F.span(0, 2.4, (k, dt) => { blk.position.y = lerp(10, 3.2, ease(k)); F.lightAt(0, v(0, 2.6, 1.2), Math.sin(F.t * 14) > 0 ? 12 : 0, "#ff2d2d"); });
        F.at(1.2, () => S.audio.play("siren"));
        for (let i = 0; i < 6; i++) F.sfx(0.2 + i * 0.4, "clank");
        F.cam(0, 1, [[1.6, 0.4, 3], [0, 2.4, 0]]);
        F.say(0.5, "This seems like a workplace safety issue!");
        F.span(2.6, 2.75, (k) => { blk.position.y = lerp(3.2, 0, easeIn(k)); });
        F.cam(2.5, 0.2, CAM.mid);
        F.slow(2.74, 3.3, 0.18);
        F.at(2.75, () => { F.flash("#fff", 160); F.W.shake(28); S.audio.play("crunch", 22); S.audio.play("boom"); S.audio.play("steam"); F.light(0, 0, 0); for (const s of [-1, 1]) for (let i = 0; i < 12; i++) F.W.fx.dust.spawn({ pos: v(s * 1.1, 0.2, R(-1, 1)), vel: v(s * R(2, 4), R(0, 1), R(-1, 1)), size: 0.15, life: 1, color: "#f1f3f5", gravity: -0.5, drag: 1.5, grow: 2, floor: false }); });
        flatten(F, 2.75, 0.05);
        F.span(3.8, 4.8, (k) => { blk.position.y = lerp(0, 8, ease(k)); });
        F.cam(3.8, 0.9, CAM.flat);
      } },
    { id: "laser", cat: "machine", name: "Laser Deletion", icon: "🟥", pv: "scan", color: "#ff2d55", desc: "A scanning laser grid digitises them, cube by cube, into nothing.", dur: 5.6,
      run(F) {
        let L;
        F.at(0, () => { L = F.add(new THREE.Group()); for (let i = -4; i <= 4; i++) { mesh(new THREE.BoxGeometry(2.6, 0.012, 0.012), glow("#ff2d55", 1), [0, 0, i * 0.12], L); mesh(new THREE.BoxGeometry(0.012, 0.012, 1.2), glow("#ff2d55", 1), [i * 0.3, 0, 0], L); } mesh(new THREE.PlaneGeometry(2.6, 1.2), glow("#ff2d55", 0.15), [0, 0, 0], L).rotation.x = -Math.PI / 2; L.position.y = 2.4; F.light(0, "#ff2d55", 8, v(0, 2, 0.8)); F.pose(0, "spread"); F.face("confused", 4); });
        F.cam(0, 0.8, CAM.mid); F.say(0.2, "Is that a barcode scanner? Am I on sale?");
        F.span(0, 2.4, (k) => { const y = 2.3 * (0.5 + 0.5 * Math.cos(k * Math.PI * 3)); L.position.y = y; F.lightAt(0, v(0, y, 0.8), 8); if (Math.random() < 0.15) S.audio.play("laser"); });
        F.at(2.4, () => { S.audio.play("charge"); F.face("scared", 4); });
        F.cam(2.4, 0.6, [[1.2, 1.4, 2.8], [0, 1, 0]]);
        F.at(2.8, () => {
          S.audio.play("zap"); F.flash("#ff8fa3", 120);
          const cubes = [];
          F.B.root.updateMatrixWorld(true);
          for (const m of F.B.hitMeshes) {
            if (!m.geometry) continue;
            m.geometry.computeBoundingSphere(); const bs = m.geometry.boundingSphere, p = bs.center.clone().applyMatrix4(m.matrixWorld);
            const r = bs.radius * m.getWorldScale(v(0, 0, 0)).x, n = Math.max(3, Math.min(14, Math.round(r * 40)));
            const col = m.material && m.material.color ? "#" + m.material.color.getHexString() : "#ffc9a9";
            for (let i = 0; i < n; i++) cubes.push({ p: p.clone().add(v(R(-r, r) * 0.7, R(-r, r) * 0.7, R(-r, r) * 0.5)), col });
          }
          F.gone();
          const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
          for (const c of cubes) {
            const me = F.add(mesh(geo, std(c.col, { emissive: "#ff2d55", emissiveIntensity: 0 }), c.p.toArray())), d = c.p.y * 0.55;
            F.anim((dt, a) => { if (a < d) return true; const k = a - d; me.position.y += dt * (0.6 + k * 2); me.rotation.x += dt * 4; me.material.emissiveIntensity = Math.min(1.5, k * 3); me.scale.setScalar(Math.max(0.01, 1 - k * 0.9)); if (k > 1.1) { F.remove(me); return false; } return true; });
          }
        });
        F.span(2.8, 4.4, (k) => { L.position.y = lerp(0.05, 2.4, k); if (Math.random() < 0.2) S.audio.play("laser"); });
        F.at(4.6, () => { F.remove(L); F.light(0, 0, 0); S.audio.play("click"); });
      } },
    { id: "claw", cat: "machine", name: "Robo-Claw Launch", icon: "🦾", pv: "drop", color: "#5c7cfa", desc: "A giant claw machine grabs them, shakes them, then flings them into orbit.", dur: 5.8,
      run(F) {
        const cl = new THREE.Group(), fingers = [];
        F.at(0, () => {
          F.add(cl); const m = std("#adb5bd", { metalness: 0.85, roughness: 0.25 }), d = std("#343a40", { metalness: 0.6, roughness: 0.4 });
          mesh(new THREE.CylinderGeometry(0.05, 0.05, 10, 8), d, [0, 5.4, 0], cl);
          mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.4, 16), m, [0, 0.2, 0], cl);
          for (let i = 0; i < 3; i++) { const f = new THREE.Group(); f.rotation.y = (i / 3) * Math.PI * 2; const h = new THREE.Group(); h.position.set(0, 0, 0.32); f.add(h); mesh(new THREE.BoxGeometry(0.1, 0.9, 0.08), m, [0, -0.4, 0], h); mesh(new THREE.BoxGeometry(0.1, 0.35, 0.08), m, [0, -0.9, -0.12], h).rotation.x = 0.6; h.rotation.x = 0.7; cl.add(f); fingers.push(h); }
          cl.position.y = 10; S.audio.play("clank"); F.face("confused", 3);
        });
        F.cam(0, 0.8, [[0, 1.8, 5], [0, 2.2, 0]]); F.say(0.3, "Not the claw machine! I'm not a plushie!");
        F.span(0, 1.2, (k) => { cl.position.y = lerp(10, 2.25, ease(k)); });
        F.at(1.2, () => { S.audio.play("clank"); S.audio.play("grab"); F.pose(0, "flail"); F.face("scared", 6); });
        F.span(1.2, 1.4, (k) => { for (const f of fingers) f.rotation.x = lerp(0.7, 0.1, k); });
        F.span(1.4, 2.2, (k) => { cl.position.y = lerp(2.25, 4.2, ease(k)); F.B.com.y = cl.position.y - 1.2; });
        F.span(2.2, 3.3, () => { const j = v(R(-0.25, 0.25), R(-0.15, 0.15), R(-0.2, 0.2)); cl.position.set(j.x, 4.2 + j.y, j.z); F.B.com.set(j.x, 3 + j.y, j.z); F.W.shake(3); if (Math.random() < 0.2) S.audio.play("clank"); });
        F.cam(2.2, 0.5, [[0, 2.6, 4.2], [0, 3.2, 0]]);
        F.span(3.3, 3.6, (k) => { cl.rotation.y = k * 12; F.B.com.set(Math.sin(k * 12) * 0.4, 3, Math.cos(k * 12) * 0.4); });
        F.at(3.6, () => { for (const f of fingers) f.rotation.x = 0.8; S.audio.play("boing"); S.audio.play("whoosh"); F.flash("#dbe4ff", 100); });
        F.slow(3.6, 3.9, 0.3);
        toSky(F, 3.6, 1.1, v(-6, 22, -14), 8);
        F.cam(3.6, 0.8, [[0, 1.4, 6], [-3, 9, -7]]);
        F.span(4, 5, (k) => { cl.position.y = lerp(4.2, 11, k); });
        twinkle(F, 4.8, v(-3.6, 8.6, -9));
      } },
    { id: "rocket", cat: "machine", name: "Rocket Ride", icon: "🚀", pv: "rise", color: "#e03131", desc: "Strapped to a rocket for a lap of the arena and a firework finale.", dur: 6.6,
      run(F) {
        let rk;
        F.at(0, () => {
          rk = new THREE.Group(); const w = std("#f8f9fa", { metalness: 0.3, roughness: 0.3 }), r = std("#e03131");
          mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 14), w, [0, 0, 0], rk); mesh(new THREE.ConeGeometry(0.13, 0.3, 14), r, [0, 0.6, 0], rk);
          for (let i = 0; i < 3; i++) { const f = mesh(new THREE.BoxGeometry(0.02, 0.25, 0.18), r, [0, -0.35, 0], rk); f.rotation.y = (i / 3) * 6.28; f.translateZ(0.14); }
          rk.position.set(0, 0.25, -0.26); F.B.root.add(rk); F.track(rk); S.audio.play("clank"); F.face("confused", 3);
        });
        F.cam(0, 0.8, [[2.4, 1.4, 2.6], [0, 1.2, 0]]); F.say(0.2, "Why is there a rocket on my back?");
        for (let i = 0; i < 3; i++) F.sfx(0.6 + i * 0.4, "tick");
        F.at(1.8, () => { S.audio.play("ignite"); S.audio.play("rumble"); F.face("scared", 6); F.pose(0, "flail"); });
        F.span(1.8, 2.4, () => { F.W.shake(4); F.B.com.x = R(-0.03, 0.03); F.fire(F.B.com.clone().add(v(0, -0.5, -0.26)), 2, 0.05, -3); F.smoke(v(R(-0.3, 0.3), 0.1, -0.2), 1, "#ced4da", 0.25); });
        const path = new THREE.CatmullRomCurve3([v(0, HIP, 0), v(0, 2.2, 0), v(2.6, 3.2, -1.4), v(0, 4, -2.6), v(-2.8, 4.6, -0.8), v(-1, 5.4, 1), v(1.6, 6.2, 0), v(0, 7.6, -1.2)]);
        F.span(2.4, 4.6, (k) => {
          const p = path.getPoint(easeIn(k * 0.7 + 0.3 * k * k)), d = path.getTangent(Math.min(0.999, k));
          F.B.com.copy(p); F.B.quat.setFromUnitVectors(v(0, 1, 0), d);
          const tail = p.clone().addScaledVector(d, -0.75);
          F.fire(tail, 2, 0.05, -1); F.smokeP.spawn({ pos: tail, vel: v(R(-0.2, 0.2), R(-0.2, 0.2), R(-0.2, 0.2)), size: R(0.1, 0.16), life: 1.6, color: "#dee2e6", gravity: -0.2, grow: 2, floor: false });
        });
        F.cam(2.4, 2.2, [[0, 2.4, 7.4], () => F.B.com.clone()]);
        F.at(4.6, () => {
          F.gone(); F.flash("#fff3bf", 200); S.audio.play("boom"); S.audio.play("sparkle");
          const c = F.B.com.clone();
          for (let b = 0; b < 4; b++) F.later(b * 0.25, () => { const o = c.clone().add(v(R(-1.5, 1.5), R(-0.6, 1.2), R(-1, 0.5))), col = pick(["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2"]); S.audio.play("bang"); for (let i = 0; i < 60; i++) { const d = v(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(2.5, 3.5)); F.glowP.spawn({ pos: o.clone(), vel: d, size: 0.05, life: R(1, 1.6), color: col, gravity: 1.5, drag: 1.2, floor: false }); } });
          F.W.confetti(c, 80, 1);
        });
        F.cam(4.6, 0.8, [[0, 2.4, 9], [0, 6, -1.2]]);
      } },
    { id: "cube", cat: "machine", name: "Cube Compactor", icon: "📦", pv: "clap", color: "#82c91e", desc: "Four steel walls and a lid close in. Out comes one very neat cube.", dur: 5.6,
      run(F) {
        const W4 = [], st = std("#868e96", { metalness: 0.7, roughness: 0.35 });
        let lid;
        F.at(0, () => {
          for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.rotation.y = (i / 4) * Math.PI * 2; const w = mesh(new THREE.BoxGeometry(2.4, 2.4, 0.16), st, [0, -1.25, 1.2], g); mesh(new THREE.BoxGeometry(2.42, 0.18, 0.18), std("#ffd43b", { map: hazardTex() }), [0, 1.1, 0], w); g.userData.w = w; F.add(g); W4.push(w); }
          lid = F.add(mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), st, [0, 6, 0]));
          S.audio.play("siren"); F.face("scared", 6); F.pose(0, "panic");
        });
        F.cam(0, 0.8, [[3.2, 4.4, 4.4], [0, 0.8, 0]]); F.say(0.3, "I'm claustrophobic! I'm claustro—");
        F.span(0, 1, (k) => { for (const w of W4) w.position.y = lerp(-1.25, 1.2, easeOut(k)); });
        for (let i = 0; i < 4; i++) F.sfx(1.2 + i * 0.25, "clank");
        F.span(1.2, 2.4, (k) => { const e = easeIn(k); for (const w of W4) w.position.z = lerp(1.2, 0.43, e); lid.position.y = lerp(6, 0.95, e); F.B.root.scale.set(lerp(1, 0.5, e), lerp(1, 0.42, e), lerp(1, 0.75, e)); F.B.com.y = lerp(HIP, 0.43, e); });
        F.at(2.4, () => { F.W.shake(16); S.audio.play("crunch", 18); S.audio.play("steam"); F.flash("#fff", 120); F.smoke(v(0, 1.2, 0), 14, "#f1f3f5", 0.25); });
        F.slow(2.4, 2.8, 0.25);
        let cube;
        F.at(3, () => {
          F.gone();
          const O = S.OUTFITS[F.B.look.outfit], fm = new THREE.MeshStandardMaterial({ map: F.B.face.texture, roughness: 0.6 }), sm = std(O.shirt, { roughness: 0.8 }), pm = std(O.pants, { roughness: 0.85 }), hm = std(F.B.look.hairColor, { roughness: 0.8 });
          cube = F.add(mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), [sm, sm, hm, pm, fm, sm], [0, 0.36, 0]));
          F.face("dizzy", 30);
        });
        F.span(3, 3.8, (k) => { for (const w of W4) w.position.y = lerp(1.2, -1.3, easeIn(k)); lid.position.y = lerp(0.95, 7, easeIn(k)); });
        F.cam(3.2, 0.9, [[0, 0.9, 2.2], [0, 0.4, 0]]);
        F.span(4.2, 4.5, (k) => { cube.position.y = 0.36 + Math.sin(k * Math.PI) * 0.35; cube.rotation.y = k * Math.PI / 2 * 0.25; if (k >= 1) { S.audio.play("thud", 5); F.W.puff(v(0, 0.05, 0), 8); } });
      } },

    /* ---------------- EXPLOSION ---------------- */
    { id: "dynamite", cat: "boom", name: "Dynamite Belt", icon: "🧨", pv: "pulse", color: "#f03e3e", desc: "A fashionable new belt. With a fuse.", dur: 6.2,
      run(F) {
        let belt, fuse;
        F.at(0, () => {
          belt = new THREE.Group(); const r = std("#c92a2a", { roughness: 0.6 }), wh = std("#f8f9fa");
          const R0 = F.B.real ? 0.2 : 0.3;
          for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, s = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), r, [Math.sin(a) * R0, 0.18, Math.cos(a) * R0], belt); mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.04, 10), wh, [0, 0.08, 0], s); }
          fuse = new THREE.Object3D(); fuse.position.set(0, 0.36, R0); belt.add(fuse);
          F.B.root.add(belt); F.track(belt); S.audio.play("clank"); F.face("confused", 3);
        });
        F.cam(0, 0.8, CAM.close); F.say(0.2, "A new belt? For me? You shouldn't have.");
        F.at(1, () => { S.audio.play("hiss"); F.face("scared", 6); F.pose(0, "panic"); });
        F.span(1, 2.8, () => { const p = fuse.getWorldPosition(v(0, 0, 0)); if (Math.random() < 0.7) F.sparks(p, 2, "#ffd43b"); });
        for (let i = 0; i < 7; i++) F.sfx(1.2 + i * 0.22 - i * i * 0.008, "tick");
        F.cam(1.4, 1.4, [[0.8, 1.2, 1.8], [0, 1.1, 0]]);
        F.slow(2.8, 3.4, 0.2);
        F.at(2.8, () => {
          F.remove(belt); F.flash("#ffe8cc", 260); F.W.shake(26); S.audio.play("boom"); S.audio.play("bang");
          F.blast(F.B.com.clone(), "#ff922b", 2.2, 0.5); F.smoke(F.B.com.clone(), 40, "#495057", 0.4);
          F.debris({ pos: F.B.com.clone(), n: 9, cols: ["#c92a2a"], size: [0.04, 0.06], speed: 6, up: 3, cyl: true });
          charred(F, 1); F.face("dizzy", 30); F.pose(0, "spread"); F.B.dizzy = 4;
        });
        F.cam(2.8, 0.5, CAM.mid);
        F.span(3, 4.8, () => { if (Math.random() < 0.5) F.smoke(F.B.headPos().add(v(0, 0.1, 0)), 1, "#868e96", 0.12); });
        F.say(3.8, "…I'm okay.");
        fallBack(F, 4.6, 0.55);
      } },
    { id: "supernova", cat: "boom", name: "Supernova", icon: "🌟", pv: "pulse", color: "#fff3bf", desc: "They rise, glow, overheat… and go supernova.", dur: 6.4,
      run(F) {
        F.sky("#090212", 1); F.cam(0, 1, CAM.mid); F.pose(0, "spread"); F.face(0, "scared", 8); F.say(0.2, "I feel… POWERFUL! And also… very warm.");
        F.at(0, () => { S.audio.play("charge"); S.audio.play("swell"); F.light(0, "#fff3bf", 0, v(0, 2, 1)); });
        F.span(0, 2.8, (k) => {
          F.B.com.y = HIP + 1.4 * ease(k); F.B.quat.setFromEuler(new E(0, k * 2, 0));
          F.tint("#fff9db", k * 0.8, "#ffe066", k * 1.2); F.lightAt(0, F.B.com.clone().add(v(0, 0, 1)), 18 * k);
          for (let i = 0; i < 3; i++) { const d = v(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(); F.glowP.spawn({ pos: F.B.com.clone().addScaledVector(d, 2.2), vel: d.multiplyScalar(-3.4), size: 0.04, life: 0.6, color: pick(["#fff3bf", "#ffd43b", "#ffffff"]), gravity: 0, floor: false }); }
        });
        F.span(0.6, 3, (k) => { const a = k * 2; F.camSet(v(Math.sin(a) * lerp(4.2, 3, k), 1.8 + k, Math.cos(a) * lerp(4.2, 3, k)), F.B.com.clone()); });
        F.span(2.4, 3, (k) => { F.W.shake(2 + k * 6); });
        F.slow(3, 3.6, 0.25);
        F.at(3, () => {
          const c = F.B.com.clone(); F.gone(); F.flash("#ffffff", 600); S.audio.play("boom"); S.audio.play("thunder");
          F.blast(c, "#ffe066", 8, 1.2); F.blast(c, "#ff922b", 5, 0.9); F.ring(v(0, 0.05, 0), "#ffd43b", 7, 1.2); F.W.shake(34);
          for (const p of F.W.props) if (p.mass) { const d = p.body.position.vsub(new CANNON.Vec3(c.x, c.y, c.z)); d.normalize(); p.body.applyImpulse(d.scale(6 * p.body.mass), new CANNON.Vec3(0, 0, 0)); }
          const sc = F.add(mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: "#0b0606", transparent: true, opacity: 0.8, depthWrite: false }), [0, 0.016, 0])); sc.rotation.x = -Math.PI / 2;
          F.light(0, 0, 0);
        });
        F.cam(3, 0.6, CAM.wide);
        F.span(3.6, 6, () => { if (Math.random() < 0.6) F.glowP.spawn({ pos: v(R(-3, 3), 5, R(-2, 1.5)), vel: v(0, -1, 0), size: 0.03, life: 3, color: "#fff3bf", gravity: 0, floor: false }); });
      } },
    { id: "kaboom", cat: "boom", name: "Mega Kaboom", icon: "💣", pv: "drop", color: "#ff922b", desc: "Never press the big red button. They press the big red button.", dur: 7.2,
      run(F) {
        let btn, bomb, cap, stem;
        F.at(0, () => {
          btn = F.add(new THREE.Group()); mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 16), std("#495057", { metalness: 0.5 }), [0, 0.45, 0], btn); mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), std("#fa5252", { emissive: "#c92a2a", emissiveIntensity: 0.5 }), [0, 0.93, 0], btn);
          btn.position.set(0.75, -1, 0.15); F.face("confused", 3);
        });
        F.span(0, 0.6, (k) => { btn.position.y = lerp(-1, 0, easeOut(k)); });
        F.cam(0, 0.8, [[1.2, 1.4, 2.8], [0.4, 1, 0]]); F.say(0.4, "Ooh. A big red button. What does this do?");
        F.at(1.6, () => { F.pose(0, "wave"); });
        F.at(2.1, () => { S.audio.play("click"); btn.children[1].position.y = 0.9; F.face("happy", 1); });
        F.at(2.5, () => { S.audio.play("siren"); S.audio.play("whistle"); F.face("scared", 6); F.pose(0, "panic"); });
        F.cam(2.4, 0.8, [[0, 1.2, 5], [0, 3, -1]]);
        F.at(2.6, () => { bomb = F.add(new THREE.Group()); mesh(new THREE.SphereGeometry(0.42, 20, 16), std("#212529", { metalness: 0.4, roughness: 0.3 }), [0, 0, 0], bomb); mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), std("#495057"), [0, 0.44, 0], bomb); bomb.position.set(-0.9, 12, 0.2); });
        F.span(2.6, 3.4, (k) => { bomb.position.y = lerp(12, 0.42, easeIn(k)); if (k >= 1) { S.audio.play("thud", 8); F.W.shake(6); } });
        F.span(3.4, 4.2, () => { if (Math.random() < 0.7) F.sparks(bomb.position.clone().add(v(0, 0.55, 0)), 2, "#ffd43b"); });
        F.at(3.4, () => S.audio.play("hiss"));
        F.cam(3.4, 0.5, [[-0.2, 1, 2.6], [-0.5, 0.7, 0]]);
        F.slow(4.2, 5, 0.2);
        F.at(4.2, () => {
          F.remove(bomb); F.remove(btn); F.flash("#fff4e6", 450); F.W.shake(36); S.audio.play("boom"); S.audio.play("thunder");
          F.blast(v(-0.9, 0.5, 0.2), "#ff922b", 3.2, 0.8);
          cap = F.add(mesh(new THREE.SphereGeometry(1, 24, 16), std("#ff922b", { emissive: "#ff6b00", emissiveIntensity: 1, roughness: 1 }), [-0.9, 1, 0.2]));
          stem = F.add(mesh(new THREE.CylinderGeometry(0.5, 0.9, 1, 16), std("#ff922b", { emissive: "#ff6b00", emissiveIntensity: 1, roughness: 1 }), [-0.9, 0.5, 0.2]));
          F.light(0, "#ff922b", 20, v(-0.9, 2, 1));
        });
        toSky(F, 4.2, 1.2, v(4, 24, -10), 9);
        F.span(4.2, 7.2, (k) => {
          const e = easeOut(Math.min(1, k * 1.4)); cap.position.y = 1 + 5 * e; cap.scale.set(1 + 1.8 * e, 0.9 + 0.7 * e, 1 + 1.8 * e);
          stem.scale.set(1, 1 + 5 * e, 1); stem.position.y = (1 + 5 * e) / 2;
          const c = new THREE.Color("#ff922b").lerp(new THREE.Color("#5c5f66"), k); cap.material.color.copy(c); stem.material.color.copy(c);
          cap.material.emissiveIntensity = stem.material.emissiveIntensity = Math.max(0, 1 - k * 1.5);
          F.lightAt(0, v(-0.9, 3, 1), 20 * (1 - k));
          if (Math.random() < 0.5) F.smoke(cap.position.clone().add(v(R(-1.5, 1.5), R(-0.6, 0.6), R(-1, 1))), 1, "#868e96", 0.5);
        });
        F.cam(4.3, 1.4, [[0, 3, 11], [-0.9, 3.6, -1]]);
      } },
    { id: "chain", cat: "boom", name: "Chain Detonation", icon: "🛢️", pv: "orbit", color: "#fd7e14", desc: "A ring of TNT barrels goes off one by one, juggling them in mid-air.", dur: 5.6,
      run(F) {
        const bar = [];
        F.at(0, () => {
          const t = tntTex(), side = std("#ffffff", { map: t }), top = std("#c92a2a");
          for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, b = F.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 16), [side, top, top], [Math.sin(a) * 1.3, 0.28, Math.cos(a) * 1.3])); b.scale.setScalar(0.01); bar.push(b); }
          S.audio.play("pop"); F.face("scared", 6); F.pose(0, "panic");
        });
        F.span(0, 0.5, (k) => { for (const b of bar) b.scale.setScalar(Math.max(0.01, easeOut(k))); });
        F.say(0.3, "Oh no. Oh no no no no.");
        F.span(0.3, 4.6, (k) => { const a = -1.2 + k * 2.4; F.camSet(v(Math.sin(a) * 5, 2.4, Math.cos(a) * 5), F.B.com.clone().setY(Math.max(1, F.B.com.y * 0.8))); });
        const times = [1.2, 1.8, 2.3, 2.75, 3.15];
        let from;
        times.forEach((t, i) => {
          F.at(t, () => {
            const b = bar[i], p = b.position.clone(); F.remove(b);
            F.blast(p, "#ff922b", 1.4, 0.4); F.smoke(p, 16, "#495057", 0.35); S.audio.play("boom"); F.W.shake(12); F.flash("#ffe8cc", 90);
            from = F.B.com.clone(); F.B.machinePose = "flail"; F.face(pick(["hurt", "ko", "scared"]), 2);
          });
          const t2 = times[i + 1] || t + 0.5;
          F.span(t, t2, (k) => {
            const ang = (i / 5) * Math.PI * 2 + 0.3 + Math.PI, tgt = v(Math.sin(ang) * 0.5, 1.4 + i * 0.4, Math.cos(ang) * 0.5);
            F.B.com.lerpVectors(from, tgt, k).y += Math.sin(k * Math.PI) * 0.8; F.B.quat.setFromEuler(new E(k * 5 + i, i, k * 3));
          });
        });
        F.slow(3.6, 4.1, 0.2);
        F.at(3.65, () => {
          const c = F.B.com.clone(); F.gone(); F.flash("#fff3bf", 300); S.audio.play("boom"); S.audio.play("bang"); F.W.shake(22);
          F.blast(c, "#ff922b", 2.6, 0.6); F.smoke(c, 30, "#495057", 0.4); F.W.confetti(c, 120, 1.3);
          F.debris({ pos: c, n: 10, cols: [S.OUTFITS[F.B.look.outfit].shirt, S.OUTFITS[F.B.look.outfit].pants], size: [0.05, 0.1], speed: 5, up: 2 });
        });
      } },

    /* ---------------- MONSTER ---------------- */
    { id: "kaiju", cat: "monster", name: "Kaiju Stomp", icon: "🦖", pv: "drop", color: "#40c057", desc: "Footsteps shake the arena. Then a very big foot.", dur: 5.8,
      run(F) {
        F.cam(0, 1, [[1.4, 0.4, 3], [0, 3, -0.5]]);
        for (let i = 0; i < 3; i++) F.at(i * 0.6, () => { S.audio.play("thud", 12); F.W.shake(6 + i * 4); });
        F.at(0.3, () => { F.face("scared", 6); F.pose(0, "up"); });
        F.say(0.6, "Mommy?");
        F.at(1.6, () => S.audio.play("roar"));
        let foot, sh;
        F.at(1.4, () => {
          sh = F.add(mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0, depthWrite: false }), [0, 0.02, 0])); sh.rotation.x = -Math.PI / 2;
          foot = F.add(new THREE.Group()); const g = std("#2f9e44", { roughness: 0.7, flatShading: true }), cl = std("#f1f3f5", { roughness: 0.3 });
          mesh(new THREE.SphereGeometry(1.3, 20, 14), g, [0, 0.4, 0], foot).scale.set(1, 0.42, 1.3);
          mesh(new THREE.CylinderGeometry(0.85, 1.05, 9, 16), g, [0, 5, -0.2], foot);
          for (let i = -1; i <= 1; i++) { const t = mesh(new THREE.SphereGeometry(0.38, 12, 10), g, [i * 0.62, 0.25, 1.3], foot); t.scale.set(0.8, 0.6, 1.3); const c = mesh(new THREE.ConeGeometry(0.12, 0.42, 8), cl, [i * 0.62, 0.15, 1.85], foot); c.rotation.x = Math.PI / 2; }
          foot.position.set(0, 12, 0);
        });
        F.span(1.4, 2.4, (k) => { sh.material.opacity = 0.55 * k; foot.position.y = lerp(12, 8, k); });
        F.span(2.4, 2.65, (k) => { foot.position.y = lerp(8, 0, easeIn(k)); });
        F.cam(2.3, 0.3, CAM.wide);
        F.slow(2.64, 3.2, 0.18);
        F.at(2.65, () => { F.flash("#fff", 150); F.W.shake(34); S.audio.play("boom"); S.audio.play("crunch", 22); F.ring(v(0, 0.05, 0), "#ced4da", 4, 0.8); F.smoke(v(0, 0.2, 0), 30, "#ced4da", 0.4); });
        flatten(F, 2.65, 0.05);
        F.span(3.6, 4.6, (k) => { foot.position.y = 8 * easeIn(k); foot.position.x = -3 * k; sh.material.opacity = 0.55 * (1 - k); });
        F.at(4.4, () => S.audio.play("roar"));
        F.cam(3.6, 1, CAM.flat);
      } },
    { id: "kraken", cat: "monster", name: "Kraken's Embrace", icon: "🐙", pv: "rise", color: "#9775fa", desc: "Tentacles burst from a dark pool and drag them into the deep.", dur: 6,
      run(F) {
        let pool, T = [];
        F.at(0, () => {
          pool = F.add(new THREE.Group());
          mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshBasicMaterial({ color: "#04121c" }), [0, 0.014, 0], pool).rotation.x = -Math.PI / 2;
          mesh(new THREE.RingGeometry(1.45, 1.6, 40), glow("#3bc9db", 0.8), [0, 0.016, 0], pool).rotation.x = -Math.PI / 2;
          pool.scale.setScalar(0.01); S.audio.play("splash"); S.audio.play("rumble"); F.face("confused", 3);
          for (let i = 0; i < 4; i++) { const t = F.add(MK.tentacle(16)); t.userData.a = (i / 4) * Math.PI * 2 + 0.4; T.push(t); }
        });
        F.span(0, 0.8, (k) => { pool.scale.setScalar(Math.max(0.01, easeOut(k))); });
        F.cam(0, 1, [[0, 3, 4.6], [0, 0.8, 0]]); F.say(0.3, "Is that a hot tub? …it's not a hot tub.");
        let grow = 0, wrap = 0, sink = 0, lift = 0;
        F.span(0.8, 1.8, (k) => { grow = easeOut(k); });
        F.at(0.8, () => { S.audio.play("roar"); F.face("scared", 8); F.pose(0, "panic"); S.audio.play("splash"); });
        F.span(1.8, 2.6, (k) => { wrap = ease(k); lift = 0.5 * k; });
        F.at(2, () => { F.pose(0, "flail"); F.say(0, "Let go, you overgrown calamari!"); });
        F.span(2.8, 3.9, (k) => { sink = easeIn(k); });
        F.span(0.8, 5, () => {
          const time = F.t;
          F.B.com.y = HIP + lift - sink * 3.6; if (sink > 0 || lift > 0) F.B.com.x = Math.sin(time * 20) * 0.03;
          for (const tt of T) {
            const segs = tt.userData.segs, a = tt.userData.a, base = v(Math.cos(a) * 0.95, -0.2 - sink * 3, Math.sin(a) * 0.95), n = segs.length;
            segs.forEach((s, i) => {
              const u = i / (n - 1), free = base.clone().add(v(Math.cos(a) * u * 0.6 + Math.sin(time * 3 + i * 0.5 + a) * 0.25 * u, u * 2.6 * grow, Math.sin(a) * u * 0.6 + Math.cos(time * 2.6 + i * 0.4) * 0.25 * u));
              const wa = a + Math.PI + u * 7, wr = v(F.B.com.x + Math.cos(wa) * 0.28, F.B.com.y - 0.6 + u * 1.1, F.B.com.z + Math.sin(wa) * 0.24);
              s.position.lerpVectors(free, wr, wrap * Math.pow(u, 0.6));
              s.scale.setScalar(Math.max(0.01, grow));
            });
          }
        });
        F.at(2.8, () => { S.audio.play("splash"); S.audio.play("gulp"); });
        F.span(2.8, 3.9, () => { if (Math.random() < 0.6) F.W.fx.drop.spawn({ pos: v(R(-0.8, 0.8), 0.05, R(-0.8, 0.8)), vel: v(R(-1.5, 1.5), R(2, 4), R(-1.5, 1.5)), size: 0.04, life: 0.8, color: "#1864ab" }); });
        F.at(3.9, () => F.gone());
        F.span(4.1, 4.9, (k) => { pool.scale.setScalar(Math.max(0.01, 1 - easeIn(k))); });
        F.at(5, () => { const b = F.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), std("#99e9f2", { transparent: true, opacity: 0.6 }), [0, 0.06, 0])); F.anim((dt, a) => { b.scale.setScalar(1 + a * 2); if (a > 0.4) { S.audio.play("pop"); F.remove(b); return false; } return true; }); });
        F.cam(3.6, 1, [[0, 2.4, 3.2], [0, 0, 0]]);
      } },
    { id: "dragon", cat: "monster", name: "Dragon's Breath", icon: "🐉", pv: "side", color: "#c92a2a", desc: "A dragon rises over the wall, takes a deep breath… and exhales.", dur: 6.6,
      run(F) {
        const D = new THREE.Group(), jaw = new THREE.Group(), neck = [];
        F.at(0, () => {
          F.add(D); const sc = std("#8f1d1d", { roughness: 0.55, flatShading: true }), bel = std("#e8b04a", { roughness: 0.6 }), hn = std("#f1f3f5", { roughness: 0.3 });
          mesh(new THREE.BoxGeometry(0.9, 0.7, 1.5), sc, [0, 0, 0.2], D);
          mesh(new THREE.BoxGeometry(0.7, 0.35, 0.8), sc, [0, 0.05, 1.2], D);
          for (const s of [-1, 1]) {
            mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffd43b" }), [s * 0.36, 0.2, 0.75], D, false);
            const h = mesh(new THREE.ConeGeometry(0.1, 0.7, 8), hn, [s * 0.3, 0.45, -0.3], D); h.rotation.x = -0.9; h.rotation.z = s * -0.3;
            mesh(new THREE.ConeGeometry(0.04, 0.12, 6), hn, [s * 0.25, -0.15, 1.5], D).rotation.x = Math.PI;
          }
          jaw.position.set(0, -0.3, 0.3); D.add(jaw); mesh(new THREE.BoxGeometry(0.65, 0.18, 1.4), bel, [0, 0, 0.6], jaw);
          for (let i = 0; i < 6; i++) neck.push(F.add(mesh(new THREE.SphereGeometry(0.5 - i * 0.02, 14, 10), sc, [0, 0, 0])));
          D.position.set(0, -1, -5.2); S.audio.play("rumble");
        });
        F.cam(0, 1, [[2.4, 0.6, 4.6], [0, 2.4, -2.4]]);
        F.span(0, 2, (k) => { D.position.y = lerp(-1, 3.6, easeOut(k)); D.rotation.x = 0.25; neck.forEach((n, i) => n.position.set(0, D.position.y - 0.6 - i * 0.7, -5.4 - i * 0.15)); });
        F.at(0.9, () => { S.audio.play("roar"); F.W.shake(10); F.face("scared", 8); F.pose(0, "up"); });
        F.say(1.4, "Nice dragon… good dragon… who's a good dragon?");
        F.span(2.2, 2.8, (k) => { jaw.rotation.x = 0.6 * k; F.lightAt(0, D.position.clone().add(v(0, -0.3, 1.5)), 10 * k, "#ff922b"); });
        F.at(2.2, () => S.audio.play("charge"));
        F.at(2.8, () => { S.audio.play("fire"); S.audio.play("roar"); });
        F.at(3.5, () => S.audio.play("fire"));
        F.span(2.8, 4.4, (k) => {
          const mouth = D.position.clone().add(v(0, -0.35, 1.6)), tgt = F.B.com.clone();
          for (let i = 0; i < 9; i++) { const d = tgt.clone().sub(mouth).normalize().add(v(R(-0.12, 0.12), R(-0.12, 0.12), R(-0.12, 0.12))).multiplyScalar(R(7, 10)); F.glowP.spawn({ pos: mouth.clone(), vel: d, size: R(0.08, 0.18), life: R(0.5, 0.8), color: pick(["#ff922b", "#ffd43b", "#fa5252", "#ffe066"]), gravity: -1, grow: 2, floor: false }); }
          charred(F, Math.min(1, k * 1.3)); F.B.machinePose = "flail"; F.W.shake(3);
        });
        F.slow(3.1, 3.7, 0.35);
        F.cam(2.8, 1.2, [[-2.6, 1.6, 3], [0, 1.6, -1.6]]);
        F.span(4.4, 4.8, (k) => { jaw.rotation.x = 0.6 * (1 - k); });
        F.at(4.4, () => { F.light(0, 0, 0); F.face("ko", 30); F.pose(0, "spread"); });
        F.span(4.4, 6.4, () => { if (Math.random() < 0.4) F.smoke(F.B.headPos(), 1, "#495057", 0.12); });
        F.cam(4.4, 0.8, CAM.mid);
        F.span(5, 6.2, (k) => { D.position.y = lerp(3.6, -2, easeIn(k)); neck.forEach((n, i) => n.position.set(0, D.position.y - 0.6 - i * 0.7, -5.4 - i * 0.15)); });
        fallBack(F, 5.4, 0.6);
      } },
    { id: "chomp", cat: "monster", name: "Chomp Pit", icon: "🪱", pv: "rise", color: "#e64980", desc: "A giant sand-worm erupts from the floor and swallows them whole. Burp.", dur: 5.8,
      run(F) {
        let wm, teeth = [];
        F.at(0, () => { S.audio.play("rumble"); F.face("scared", 6); F.pose(0, "panic"); const cr = F.add(mesh(new THREE.RingGeometry(1.0, 1.25, 40), new THREE.MeshBasicMaterial({ color: "#120807" }), [0, 0.016, 0])); cr.rotation.x = -Math.PI / 2; });
        F.span(0, 1.2, (k) => F.W.shake(2 + k * 4));
        F.say(0.2, "The floor is… breathing?");
        F.at(1.2, () => {
          wm = F.add(new THREE.Group()); const sk = std("#c2858f", { roughness: 0.7 });
          mesh(new THREE.CylinderGeometry(1.0, 1.1, 6, 24, 1, true), std("#c2858f", { roughness: 0.7, side: THREE.DoubleSide }), [0, -3, 0], wm);
          for (let i = 0; i < 6; i++) mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 24), sk, [0, -0.6 - i * 0.9, 0], wm).rotation.x = Math.PI / 2;
          mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: "#2b0a10" }), [0, -0.5, 0], wm).rotation.x = -Math.PI / 2;
          for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, p = new THREE.Group(); p.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95); p.rotation.y = -a; wm.add(p); const t = mesh(new THREE.ConeGeometry(0.1, 0.4, 6), std("#fff9db", { roughness: 0.3 }), [0, 0.2, 0], p); teeth.push(p); }
          wm.position.y = -0.2; S.audio.play("roar"); F.flash("#ffdeeb", 100);
        });
        F.span(1.2, 1.7, (k) => { wm.position.y = lerp(-0.2, 2.6, easeOut(k)); F.B.com.y = HIP + 1.2 * easeOut(k); });
        F.cam(1.2, 0.5, [[0, 3, 5.6], [0, 2, 0]]);
        F.span(1.8, 2.1, (k) => { for (const p of teeth) p.rotation.z = -1.3 * k; F.B.com.y = HIP + 1.2 - 2 * k; });
        F.slow(1.8, 2.2, 0.35);
        F.at(2.1, () => { F.gone(); S.audio.play("gulp"); S.audio.play("crunch", 6); });
        F.span(2.1, 3.6, (k) => { wm.rotation.z = Math.sin(k * 12) * 0.12 * (1 - k); wm.rotation.x = Math.cos(k * 10) * 0.08; });
        F.at(3.2, () => { S.audio.play("burp"); for (const p of teeth) p.rotation.z = -0.4; F.smoke(v(0, 2.8, 0.2), 10, "#b2f2bb", 0.3); });
        let shoe;
        F.at(3.4, () => { shoe = F.add(MK.shoe(S.OUTFITS[F.B.look.outfit].shoes)); shoe.position.set(0, 2.7, 0.4); for (const p of teeth) p.rotation.z = -1.3; });
        F.span(3.4, 4.2, (k) => { shoe.position.set(0, 2.7 + Math.sin(k * Math.PI) * 1.4 - k * 2.7, 0.4 + k * 2); shoe.rotation.x = k * 10; if (k >= 1) { S.audio.play("bonk"); shoe.rotation.set(0, 0.5, 0); shoe.position.y = 0; } });
        F.span(4.4, 5.4, (k) => { wm.position.y = lerp(2.6, -3.5, easeIn(k)); });
        F.cam(4.2, 0.8, [[0.6, 1, 3.6], [0, 0.3, 1.6]]);
      } },
    { id: "hen", cat: "monster", name: "Hex of the Hen", icon: "🐔", pv: "spin", color: "#cc5de8", desc: "A witch's hex, a puff of purple smoke, and one confused chicken.", dur: 5.8,
      run(F) {
        F.cam(0, 0.8, CAM.mid); F.face(0, "confused", 3); F.say(0.2, "Wait, what spell is that? Is it a nice one?");
        F.at(0, () => { S.audio.play("charge"); S.audio.play("sparkle"); F.ring(v(0, 0.03, 0), "#cc5de8", 1.3, 2); F.light(0, "#cc5de8", 10, v(0, 1, 1)); });
        F.span(0, 1.6, (k) => { for (let i = 0; i < 3; i++) { const a = F.t * 6 + i * 2.1, r = 1 - k * 0.6; F.glowP.spawn({ pos: v(Math.cos(a) * r, 0.2 + k * 1.6 + i * 0.3, Math.sin(a) * r), vel: v(0, 0.3, 0), size: 0.05, life: 0.5, color: pick(["#cc5de8", "#e599f7", "#f3d9fa"]), gravity: 0, floor: false }); } F.B.com.y = HIP + 0.1 * Math.sin(k * 20); });
        F.at(0.8, () => { F.face("scared", 4); F.pose(0, "up"); });
        let ch;
        F.at(1.6, () => {
          S.audio.play("pop"); S.audio.play("boom"); F.flash("#e599f7", 200); F.gone(); F.smoke(v(0, 0.8, 0), 40, "#cc5de8", 0.45); F.light(0, 0, 0);
          ch = F.add(MK.chicken()); ch.scale.setScalar(0.01);
        });
        F.span(1.6, 1.9, (k) => { ch.scale.setScalar(Math.max(0.01, easeOut(k) * 1.3)); });
        F.cam(1.8, 0.6, [[0, 0.9, 2.6], [0, 0.6, 0]]);
        F.span(2, 3.2, (k) => { ch.userData.head.rotation.y = Math.sin(k * 14) * 0.6; ch.position.y = Math.abs(Math.sin(k * 9)) * 0.08; });
        for (let i = 0; i < 4; i++) F.sfx(2.1 + i * 0.35, "cluck");
        F.span(3.3, 4.8, (k) => { ch.rotation.y = -Math.PI / 2; ch.position.x = lerp(0, -5.5, easeIn(k)); ch.position.y = Math.abs(Math.sin(k * 30)) * 0.1; ch.userData.legs.forEach((l, i) => (l.rotation.x = Math.sin(k * 60 + i * 3) * 0.7)); if (Math.random() < 0.3) F.W.fx.feather.spawn({ pos: ch.position.clone().add(v(0, 0.5, 0)), vel: v(R(-0.5, 0.5), R(0.5, 1.5), R(-0.5, 0.5)), size: 0.12, life: 2, color: "#f8f9fa", gravity: 0.8, drag: 2, spin: 6 }); });
        F.at(3.3, () => S.audio.play("cluck"));
        F.cam(3.3, 1.2, [[0, 1.4, 4.2], () => ch.position.clone().setY(0.5)]);
      } },

    /* ---------------- FARTALITIES ---------------- */
    { id: "thunderbum", cat: "fart", name: "Thunder Bum", icon: "💨", pv: "rise", color: "#94d82d", desc: "One burrito too many. A rumble, a toot… and lift-off.", dur: 5.6,
      run(F) {
        const butt = () => F.B.com.clone().add(v(0, -0.05, -0.2).applyQuaternion(F.B.quat));
        F.cam(0, 0.8, CAM.close); F.pose(0, "panic"); F.face(0, "hurt", 3); F.say(0.1, "Uh oh. That burrito was a mistake.");
        F.at(0.2, () => { S.audio.play("rumble"); });
        for (let i = 0; i < 3; i++) F.at(1 + i * 0.4, () => { S.audio.play("fart", 0.35); F.smoke(butt(), 4, "#a9e34b", 0.18); F.B.com.y = HIP + 0.05; F.face("scared", 1); });
        F.span(0.8, 2.2, (k) => { F.B.root.scale.set(1 + 0.15 * k, 1, 1 + 0.25 * k); });
        F.cam(1.6, 0.6, [[2.4, 1, 2.2], [0, 1, 0]]);
        F.at(2.2, () => { S.audio.play("fart", 1.6); S.audio.play("boom"); F.flash("#d8f5a2", 200); F.W.shake(16); F.ring(v(0, 0.05, 0), "#94d82d", 3, 0.8); F.smoke(butt(), 30, "#94d82d", 0.45); F.B.root.scale.set(1, 1, 1); F.pose(0, "up"); F.face("ko", 30); });
        F.slow(2.2, 2.7, 0.3);
        F.span(2.2, 3.8, (k) => { F.B.com.set(0, HIP + 30 * easeIn(k), 0); F.B.quat.setFromEuler(new E(0, k * 6, 0)); F.smokeP.spawn({ pos: butt(), vel: v(R(-0.4, 0.4), -2, R(-0.4, 0.4)), size: R(0.12, 0.22), life: 1.5, color: "#a9e34b", gravity: 0, grow: 2, floor: false }); if (k >= 1) F.gone(); });
        F.cam(2.3, 1.2, [[0, 0.6, 5], () => F.B.com.clone().setY(Math.min(F.B.com.y, 8))]);
        twinkle(F, 4, v(0, 8.5, -1));
        F.at(4.4, () => S.audio.play("toot", 420));
        F.span(4, 5.6, () => { if (Math.random() < 0.3) F.smoke(v(R(-2, 2), 0.1, R(-1.5, 1)), 1, "#a9e34b", 0.35); });
      } },
    { id: "sbd", cat: "fart", name: "Silent But Deadly", icon: "🤫", pv: "pulse", color: "#a9e34b", desc: "No sound. Just a creeping green fog. Even the flowers give up.", dur: 6.2,
      run(F) {
        const flowers = [];
        F.at(0, () => {
          for (const s of [-1, 1]) { const g = F.add(new THREE.Group()); mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.25, 12), std("#c2703d"), [0, 0.12, 0], g); const st = new THREE.Group(); st.position.y = 0.25; g.add(st); mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), std("#2f9e44"), [0, 0.25, 0], st); mesh(new THREE.SphereGeometry(0.1, 12, 10), std(s < 0 ? "#f783ac" : "#ffd43b"), [0, 0.52, 0], st); g.position.set(s * 1.1, 0, 0.4); flowers.push(st); }
          F.face("smug", 3);
        });
        F.cam(0, 0.8, CAM.close); F.say(0.4, "Excuse me.");
        const butt = () => F.B.com.clone().add(v(0, -0.05, -0.2).applyQuaternion(F.B.quat));
        F.span(1.2, 4.8, () => { if (Math.random() < 0.45) F.smokeP.spawn({ pos: butt().add(v(R(-0.1, 0.1), -0.4, 0)), vel: v(R(-1, 1), R(-0.3, 0.1), R(-0.5, 0.9)), size: R(0.08, 0.14), life: R(2, 3), color: pick(["#a9e34b", "#94d82d", "#c0eb75"]), gravity: 0.05, drag: 0.4, grow: 2.2, floor: true }); });
        F.cam(1.2, 2, [[0, 2.2, 4.8], [0, 0.6, 0]]);
        F.span(2, 3.4, (k) => { for (const f of flowers) f.rotation.z = (f.parent.position.x < 0 ? 1 : -1) * 1.4 * ease(k); });
        F.at(2.6, () => { for (const f of flowers) { const h = f.children[1]; h.material = std("#5c5f66"); } });
        F.span(2, 5, () => { if (Math.random() < 0.3) F.W.fx.star.spawn({ pos: F.B.headPos().add(v(R(-0.4, 0.4), R(-0.2, 0.3), R(-0.3, 0.3))), vel: v(R(-1, 1), R(-0.5, 0.5), R(-1, 1)), size: 0.015, life: 0.4, color: "#212529", gravity: 0, floor: false }); });
        F.at(3.4, () => { F.face("confused", 2); F.say(0, "*sniff*… oh. Oh no."); });
        F.at(4, () => { F.face("ko", 30); F.pose(0, "dizzy"); F.B.dizzy = 3; S.audio.play("tweet"); });
        F.cam(3.4, 0.6, CAM.close);
        fallBack(F, 4.7, 0.7);
        F.cam(4.6, 1, CAM.mid);
      } },
    { id: "balloon", cat: "fart", name: "Balloon Belly", icon: "🎈", pv: "pulse", color: "#ffd43b", desc: "They swell up like a balloon, float away… and let go.", dur: 6.4,
      run(F) {
        F.cam(0, 0.8, CAM.mid); F.face(0, "scared", 6); F.say(0.2, "I don't feel so good… I feel… roomy.");
        F.span(0.2, 2.2, (k) => { const e = ease(k); F.B.root.scale.set(1 + 1.2 * e, 1 + 0.35 * e, 1 + 1.3 * e); F.B.machinePose = "spread"; });
        for (let i = 0; i < 4; i++) F.sfx(0.3 + i * 0.45, "squeak");
        F.span(1.8, 2.8, (k) => { F.B.com.y = HIP + 2.2 * ease(k); F.B.com.x = Math.sin(k * 6) * 0.2; });
        F.cam(2, 0.8, [[0, 1.8, 6], [0, 2.4, 0]]);
        const pts = [v(0, HIP + 2.2, 0)];
        for (let i = 0; i < 9; i++) pts.push(v(R(-4, 4), R(0.8, 4), R(-2.8, 1.4)));
        pts.push(v(0.6, 0.4, 0.8));
        const path = new THREE.CatmullRomCurve3(pts);
        F.at(2.8, () => { S.audio.play("pop"); S.audio.play("fart", 1.4); F.face("ko", 30); F.pose(0, "flail"); });
        F.slow(2.8, 3.1, 0.3);
        F.span(2.8, 4.8, (k) => {
          const p = path.getPoint(k), d = path.getTangent(Math.min(0.999, k)); F.B.com.copy(p); F.B.quat.setFromUnitVectors(v(0, 0, 1), d.clone().negate());
          const s = 1 + 1.2 * (1 - k); F.B.root.scale.set(s, 1 + 0.35 * (1 - k), s);
          F.smokeP.spawn({ pos: p.clone().addScaledVector(d, -0.4), vel: v(0, 0, 0), size: 0.12, life: 1.2, color: "#a9e34b", gravity: -0.1, grow: 2, floor: false });
        });
        for (let i = 0; i < 9; i++) F.sfx(2.9 + i * 0.21, "toot", 120 + i * 40 + R(-20, 20));
        F.cam(2.8, 2, CAM.wide);
        F.at(4.8, () => { S.audio.play("thud", 8); F.W.shake(8); F.W.puff(v(0.6, 0.05, 0.8), 12); });
        flatten(F, 4.8, 0.08, { fromY: 0.4 });
        F.at(4.8, () => F.B.com.set(0.6, 0.06, 0.8));
        F.cam(4.8, 0.8, [[1.6, 2.6, 3], [0.6, 0, 0.6]]);
        F.at(5.6, () => S.audio.play("toot", 600));
      } },
    { id: "gasgiant", cat: "fart", name: "Gas Giant Kaboom", icon: "🕯️", pv: "pulse", color: "#2f9e44", desc: "Never break wind next to a candle. Especially that much wind.", dur: 6,
      run(F) {
        let cn, fl;
        F.at(0, () => {
          cn = F.add(new THREE.Group()); mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 12), std("#495057", { metalness: 0.5 }), [0, 0.35, 0], cn); mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12), std("#fff9db"), [0, 0.82, 0], cn);
          fl = mesh(new THREE.SphereGeometry(0.05, 10, 8), glow("#ffd43b", 1), [0, 1.0, 0], cn); fl.scale.y = 1.8; cn.position.set(0, 0, -0.75);
          F.face("smug", 3); F.light(1, "#ffd43b", 3, v(0, 1.1, -0.6));
        });
        F.cam(0, 0.8, [[2.6, 1.2, 2.2], [0, 1, -0.3]]); F.say(0.3, "Hold my candle.");
        F.span(0.8, 1.6, (k) => { F.B.quat.setFromEuler(new E(0, 0, 0)); F.B.machinePose = "taunt"; });
        F.at(1.6, () => { S.audio.play("fart", 1.1); F.face("happy", 2); });
        const butt = () => F.B.com.clone().add(v(0, -0.05, -0.2));
        F.span(1.6, 2.3, () => { for (let i = 0; i < 3; i++) F.smokeP.spawn({ pos: butt(), vel: v(R(-0.3, 0.3), R(0, 0.3), -1.2), size: 0.15, life: 1, color: "#94d82d", gravity: 0, grow: 2, floor: false }); fl.scale.setScalar(1 + Math.random() * 0.4); });
        F.at(2.2, () => { F.face("scared", 3); });
        F.slow(2.35, 2.9, 0.25);
        F.at(2.35, () => {
          F.flash("#d8f5a2", 300); F.W.shake(22); S.audio.play("boom"); S.audio.play("fire"); F.remove(cn); F.light(1, 0, 0);
          F.blast(v(0, 0.9, -0.5), "#94d82d", 2.6, 0.6); F.blast(v(0, 0.9, -0.5), "#ff922b", 1.6, 0.5); charred(F, 1); F.face("ko", 30); F.pose(0, "flail");
        });
        let from;
        F.at(2.35, () => { from = F.B.com.clone(); });
        F.span(2.35, 3.5, (k) => { F.B.com.set(0, from.y + Math.sin(k * Math.PI) * 2.2 - 0.85 * k, lerp(from.z, 1.8, k)); F.B.quat.setFromEuler(new E(k * Math.PI * 2.5, 0, 0)); if (k >= 1) { S.audio.play("thud", 8); F.W.puff(v(0, 0.05, 1.8), 12); } });
        F.cam(2.4, 1, CAM.mid);
        F.at(3.5, () => { F.B.quat.setFromEuler(new E(Math.PI / 2, 0, 0)); F.B.com.y = 0.18; F.B.machinePose = "spread"; });
        F.span(3.5, 5.6, () => { if (Math.random() < 0.3) F.smoke(F.B.com.clone().add(v(0, 0.2, 0)), 1, "#495057", 0.15); });
        F.at(4.6, () => { S.audio.play("toot", 520); F.fire(F.B.com.clone().add(v(0, 0.15, -0.3)), 6, 0.05); });
      } },
    { id: "symphony", cat: "fart", name: "Fart Symphony", icon: "🎺", pv: "orbit", color: "#20c997", desc: "A spotlight, a melody in eight toots, and a grand finale.", dur: 6.4,
      run(F) {
        F.sky("#050508", 1); F.at(0, () => { F.light(0, "#fff9db", 14, v(0, 3.2, 0.6)); F.face("laugh", 6); F.pose(0, "taunt"); });
        F.cam(0, 1, CAM.close); F.say(0.1, "Ladies and gentlemen… my masterpiece.");
        const notes = [262, 294, 330, 262, 330, 392, 392, 523];
        const butt = () => F.B.com.clone().add(v(0, -0.05, -0.2).applyQuaternion(F.B.quat));
        notes.forEach((f, i) => {
          const t = 1.2 + i * 0.32;
          F.at(t, () => {
            S.audio.play("toot", f / 2); F.smoke(butt(), 3, "#a9e34b", 0.14); F.B.machinePose = "dance";
            const n = F.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: noteTex(), transparent: true, depthWrite: false })));
            n.position.copy(F.B.com).add(v(R(-0.4, 0.4), 0.2, 0.3));
            F.anim((dt, a) => { n.position.y += dt * 0.9; n.position.x += Math.sin(a * 6) * dt * 0.4; n.lookAt(F.W.camera.position); n.material.opacity = Math.max(0, 1 - a / 1.6); if (a > 1.6) { F.remove(n); return false; } return true; });
          });
          F.span(t, t + 0.25, (k) => { F.B.com.y = HIP + Math.sin(k * Math.PI) * 0.12; });
        });
        F.cam(1.4, 2, [[1.8, 1.4, 2.6], [0, 1.2, 0]]);
        F.at(4, () => { S.audio.play("charge"); F.face("scared", 4); F.pose(0, "up"); });
        F.at(4.5, () => { S.audio.play("fart", 1.8); S.audio.play("fanfare"); F.flash("#d8f5a2", 200); F.W.shake(14); F.ring(v(0, 0.05, 0), "#20c997", 3, 0.8); F.smoke(butt(), 30, "#94d82d", 0.45); F.W.confetti(F.B.com.clone(), 90, 1); F.light(0, 0, 0); });
        F.slow(4.5, 4.9, 0.3);
        toSky(F, 4.5, 1.2, v(0, 26, -2), 6);
        F.cam(4.5, 0.8, [[0, 0.8, 5], [0, 5, -1]]);
        twinkle(F, 5.6, v(0, 7.5, -1.5));
      } },

    /* ---------------- SECRET ---------------- */
    { id: "blackhole", cat: "secret", name: "Event Horizon", icon: "🕳️", pv: "spin", color: "#5f3dc4", desc: "A black hole opens. Physics stops being on their side.", dur: 6, unlock: { total: 5 },
      run(F) {
        let bh;
        F.sky("#000000", 1.2);
        F.at(0, () => {
          bh = F.add(new THREE.Group()); mesh(new THREE.SphereGeometry(0.6, 24, 18), new THREE.MeshBasicMaterial({ color: "#000" }), [0, 0, 0], bh, false);
          const d1 = mesh(new THREE.RingGeometry(0.7, 1.6, 48), glow("#ff922b", 0.75), [0, 0, 0], bh); d1.rotation.x = -Math.PI / 2 + 0.3;
          const d2 = mesh(new THREE.RingGeometry(0.62, 0.85, 48), glow("#ffffff", 0.9), [0, 0, 0], bh); d2.rotation.x = -Math.PI / 2 + 0.3;
          mesh(new THREE.RingGeometry(0.6, 0.75, 48), glow("#b197fc", 0.7), [0, 0, 0], bh).lookAt(0, 0, 10);
          bh.position.set(0, 3.2, -1.6); bh.scale.setScalar(0.01); S.audio.play("rumble"); S.audio.play("swell"); F.face("scared", 8);
        });
        F.cam(0, 1, [[0, 1.6, 5.6], [0, 2.2, -1]]);
        F.span(0, 1.2, (k) => { bh.scale.setScalar(Math.max(0.01, easeOut(k))); });
        F.span(0, 4.2, (k, dt) => {
          bh.children[1].rotation.z += dt * 3; bh.children[2].rotation.z -= dt * 5;
          for (let i = 0; i < 3; i++) { const d = v(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(); F.glowP.spawn({ pos: bh.position.clone().addScaledVector(d, 3), vel: d.multiplyScalar(-2.8).add(v(-d.z, 0, d.x)), size: 0.03, life: 1, color: pick(["#b197fc", "#ffffff", "#ff922b"]), gravity: 0, floor: false }); }
          for (const p of F.W.props) if (p.mass) { const d = new CANNON.Vec3(bh.position.x, bh.position.y, bh.position.z).vsub(p.body.position); const L = d.length(); if (L < 0.7) continue; d.normalize(); p.body.applyForce(d.scale(14 * p.body.mass), p.body.position); p.body.wakeUp(); }
          F.W.shake(1.5);
        });
        F.say(0.8, "Not the spaghetti effect!");
        F.at(1.4, () => F.pose(0, "flail"));
        let from;
        F.at(1.4, () => { from = F.B.com.clone(); });
        F.span(1.4, 3.4, (k) => {
          const e = easeIn(k), a = k * 12, r = 0.8 * (1 - e);
          F.B.com.lerpVectors(from, bh.position, e).add(v(Math.cos(a) * r, 0, Math.sin(a) * r));
          F.B.quat.setFromUnitVectors(v(0, 1, 0), bh.position.clone().sub(F.B.com).normalize());
          F.B.root.scale.set(Math.max(0.05, 1 - e * 0.9), 1 + e * 3, Math.max(0.05, 1 - e * 0.9));
          if (k >= 1) F.gone();
        });
        F.slow(2.6, 3.4, 0.4);
        F.at(3.4, () => S.audio.play("gulp"));
        F.span(3.6, 4.2, (k) => { bh.scale.setScalar(Math.max(0.01, 1 + Math.sin(k * 20) * 0.1 - k)); });
        F.at(4.2, () => { F.flash("#ffffff", 400); S.audio.play("boom"); F.ring(v(0, 3.2, -1.6), "#b197fc", 6, 0.8, true); F.remove(bh); F.sky(null); });
        F.cam(4.2, 1, CAM.wide);
      } },
    { id: "ducks", cat: "secret", name: "Rubber Duck Rain", icon: "🦆", pv: "drop", color: "#fcc419", desc: "It's raining ducks. Hundreds of them. Then one enormous one.", dur: 6, unlock: { total: 10 },
      run(F) {
        F.cam(0, 1, [[0, 3, 6.2], [0, 0.8, 0]]); F.face(0, "confused", 3); F.say(0.2, "Is that… quacking? From the sky?");
        for (let i = 0; i < 60; i++) {
          const t = 0.4 + i * 0.045;
          F.at(t, () => { const d = MK.duck(1); F.debris({ mesh: d, pos: v(R(-1.6, 1.6), R(5, 8), R(-1.2, 1.2)), r: 0.13, vel: v(0, -2, 0), quiet: true }); if (i % 4 === 0) S.audio.play("quack"); });
        }
        F.at(1, () => { F.face("scared", 6); F.pose(0, "panic"); });
        let big;
        F.at(3.4, () => { big = F.add(MK.duck(9)); big.position.set(0, 12, 0); S.audio.play("whistle"); });
        F.span(3.4, 4, (k) => { big.position.y = lerp(12, 1.0, easeIn(k)); });
        F.cam(3.4, 0.6, [[0, 2.4, 8], [0, 1.6, 0]]);
        F.at(4, () => { F.gone(); S.audio.play("squeak"); F.W.shake(18); F.flash("#fff9db", 120); F.smoke(v(0, 0.3, 0), 20, "#fff3bf", 0.35); for (const p of F.debrisList) { p.body.velocity.set(R(-3, 3), R(2, 4), R(-3, 3)); p.body.wakeUp(); } });
        F.span(4, 4.4, (k) => { big.scale.set(1 + 0.2 * Math.sin(k * Math.PI), 1 - 0.2 * Math.sin(k * Math.PI), 1 + 0.2 * Math.sin(k * Math.PI)); });
        F.at(5, () => S.audio.play("squeak"));
      } },
    { id: "piano", cat: "secret", name: "Grand Piano Finale", icon: "🎹", pv: "drop", color: "#343a40", desc: "A banana peel, a backflip, and a grand piano for the big finish.", dur: 6.6, unlock: { total: 15 },
      run(F) {
        let peel, pn, sh;
        F.at(0, () => { peel = F.add(new THREE.Group()); for (let i = 0; i < 3; i++) { const p = mesh(new THREE.BoxGeometry(0.08, 0.02, 0.22), std("#ffd43b"), [0, 0.02, 0], peel); p.rotation.y = (i / 3) * 6.28; p.translateZ(0.08); } peel.position.set(0, 0, 0.8); F.face("happy", 2); F.pose(0, "walk"); });
        F.cam(0, 0.8, [[2.4, 1, 3], [0, 0.8, 0.4]]); F.say(0.2, "La la la, what a lovely day.");
        F.span(0, 1, (k) => { F.B.com.z = 0.8 * k; F.B.com.y = HIP + Math.abs(Math.sin(k * 12)) * 0.03; });
        F.at(1, () => { S.audio.play("slide"); F.pose(0, "flail"); F.face("scared", 3); });
        F.span(1, 1.9, (k) => { F.B.com.set(0, HIP + Math.sin(k * Math.PI) * 1.6, 0.8 + k * 0.4); F.B.quat.setFromEuler(new E(-k * Math.PI * 2.5, 0, 0)); });
        F.slow(1.2, 1.6, 0.3);
        F.at(1.9, () => { F.B.quat.setFromEuler(new E(-Math.PI / 2, 0, 0)); F.B.com.y = 0.2; S.audio.play("thud", 8); F.W.puff(v(0, 0.05, 1.2), 12); F.face("dizzy", 30); F.B.dizzy = 6; S.audio.play("tweet"); F.pose(0, "spread"); });
        F.cam(1.9, 0.6, [[0, 3.4, 3.6], [0, 0.2, 1.2]]);
        F.at(2.6, () => { S.audio.play("whistle"); sh = F.add(mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0, depthWrite: false }), [0, 0.02, 1.2])); sh.rotation.x = -Math.PI / 2; F.face("scared", 6); });
        F.say(2.8, "Is that… a grand piano?");
        F.span(2.6, 3.8, (k) => { sh.material.opacity = 0.5 * k; });
        F.at(3.4, () => {
          pn = F.add(new THREE.Group()); const b = std("#111", { roughness: 0.2, metalness: 0.2 });
          mesh(new THREE.BoxGeometry(1.5, 0.35, 1.9), b, [0, 0.6, 0], pn); const lid = mesh(new THREE.BoxGeometry(1.5, 0.04, 1.9), b, [0, 1.0, -0.3], pn); lid.rotation.x = -0.5;
          mesh(new THREE.BoxGeometry(1.3, 0.05, 0.22), std("#f8f9fa"), [0, 0.8, 1.0], pn);
          for (const [x, z] of [[-0.6, -0.8], [0.6, -0.8], [0, 0.8]]) mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), b, [x, 0.22, z], pn);
          pn.position.set(0, 12, 1.2); pn.rotation.set(0.3, 0.4, 0.2);
        });
        F.span(3.4, 3.95, (k) => { pn.position.y = lerp(12, 0, easeIn(k)); });
        F.cam(3.6, 0.3, CAM.wide);
        F.slow(3.94, 4.5, 0.18);
        F.at(3.95, () => {
          F.flash("#fff", 150); F.W.shake(26); S.audio.play("piano"); S.audio.play("boom");
          const c = pn.position.clone().add(v(0, 0.5, 0)); F.remove(pn); F.remove(sh); F.gone();
          F.debris({ pos: c, n: 14, cube: true, cols: ["#111"], size: [0.12, 0.25], speed: 5, up: 4 });
          F.debris({ pos: c, n: 26, cube: true, cols: ["#f8f9fa", "#111"], size: [0.03, 0.06], speed: 6, up: 5, flat: true });
          F.smoke(c, 25, "#ced4da", 0.35);
        });
        F.at(5, () => S.audio.play("toot", 131));
      } },
    { id: "friendship", cat: "secret", name: "Friendship…?", icon: "🌈", pv: "orbit", color: "#f06595", desc: "Rainbows, dancing and a gift box. What could possibly go wrong?", dur: 6.2, unlock: { cats: true },
      run(F) {
        const rb = [];
        F.at(0, () => {
          ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"].forEach((c, i) => { const r = F.add(mesh(new THREE.TorusGeometry(2.6 - i * 0.14, 0.07, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c }), [0, 0, -2.4], null, false)); r.scale.setScalar(0.01); rb.push(r); });
          S.audio.play("sparkle"); S.audio.play("fanfare"); F.face("laugh", 8); F.pose(0, "dance"); F.light(0, "#ffdeeb", 8, v(0, 2, 1.4));
        });
        F.span(0, 1, (k) => { for (const r of rb) r.scale.setScalar(Math.max(0.01, easeOut(k))); });
        F.cam(0, 1, CAM.mid); F.say(0.3, "Aww! Are we friends now? Best friends forever?");
        F.span(0, 2.2, () => { if (Math.random() < 0.3) F.W.confetti(v(R(-2, 2), 3, R(-1, 1)), 3, 0.3); F.B.com.y = HIP + Math.abs(Math.sin(F.t * 8)) * 0.06; });
        let box, lid, glove, spring;
        F.at(1.6, () => {
          box = F.add(new THREE.Group()); const p = std("#f06595", { roughness: 0.5 }), y = std("#ffd43b");
          mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), p, [0, 0.225, 0], box); mesh(new THREE.BoxGeometry(0.52, 0.47, 0.08), y, [0, 0.225, 0], box);
          lid = mesh(new THREE.BoxGeometry(0.56, 0.1, 0.56), p, [0, 0.5, 0], box); mesh(new THREE.BoxGeometry(0.58, 0.11, 0.08), y, [0, 0, 0], lid);
          glove = mesh(new THREE.SphereGeometry(0.2, 16, 12), std("#e03131", { roughness: 0.4 }), [0, 0.3, 0], box); glove.scale.set(1, 1.2, 0.9); glove.visible = false;
          spring = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), std("#adb5bd", { metalness: 0.9 }), [0, 0.3, 0], box); spring.visible = false;
          box.position.set(0, 0, 0.7); box.scale.setScalar(0.01); S.audio.play("pop");
        });
        F.span(1.6, 1.9, (k) => { box.scale.setScalar(Math.max(0.01, easeOut(k))); });
        F.at(2.4, () => { F.pose(0, "wave"); F.face("happy", 3); F.say(0, "A present? For me?"); });
        F.cam(2.4, 0.6, [[1.4, 1.2, 2.6], [0, 0.9, 0.4]]);
        F.at(3.2, () => { lid.visible = false; glove.visible = spring.visible = true; S.audio.play("boing"); F.flash("#ffdeeb", 100); });
        F.span(3.2, 3.35, (k) => { glove.position.y = lerp(0.3, 1.45, k); spring.scale.y = 0.01 + k * 1.2; spring.position.y = 0.3 + 0.6 * k; });
        F.slow(3.3, 3.8, 0.2);
        F.at(3.35, () => { S.audio.play("punch", 22); F.W.shake(14); F.face("ko", 30); F.sparks(F.B.headPos(), 20, "#ffd43b"); F.light(0, 0, 0); });
        toSky(F, 3.35, 1.3, v(1, 26, -6), 7);
        F.span(3.35, 4.65, () => { const p = F.B.com.clone(); F.glowP.spawn({ pos: p, vel: v(0, 0, 0), size: 0.12, life: 0.8, color: pick(["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"]), gravity: 0, floor: false }); });
        F.cam(3.4, 1, [[0, 0.6, 5.4], [0.4, 6, -2]]);
        twinkle(F, 4.8, v(0.6, 8, -3.4));
        F.at(5.2, () => { F.W.confetti(v(0, 4, 0), 100, 0.8); });
      } }
  ];

  /* =========================================================
     ENGINE
     ========================================================= */
  const STORE_KEY = "nsh-smash-fatal";
  const loadStats = () => { try { return Object.assign({ total: 0, cats: [], seen: [] }, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch (e) { return { total: 0, cats: [], seen: [] }; } };
  const saveStats = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} };

  class Fatality {
    constructor(world, buddy, face) {
      this.W = world; this.B = buddy; this.fc = face;
      this.on = false; this.cur = null; this.playing = false; this.last = null;
      this.stats = loadStats();
      this.objs = []; this.debrisList = []; this.anims = []; this.ev = []; this.spans = []; this.slows = []; this.tinted = null;
      this.camP = new V3(0, 2.6, 8.2); this.camL = new V3(0, 1.05, -0.9);
      this.glowP = new S.Particles(world.scene, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), 1200);
      this.smokeP = new S.Particles(world.scene, new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.34, depthWrite: false, roughness: 1 }), 600);
      this.sel = LIST[0].id; this.tab = "all";
      this.buildDom();
    }
    get list() { return LIST; }

    /* ---------- unlocks ---------- */
    locked(d) {
      const u = d.unlock; if (!u) return false;
      if (u.total) return this.stats.total < u.total;
      if (u.cats) return CATS.filter((c) => c.id !== "secret").some((c) => !this.stats.cats.includes(c.id));
      return false;
    }
    lockText(d) {
      const u = d.unlock;
      if (u.total) return "Perform " + u.total + " fatalities to unlock (" + this.stats.total + "/" + u.total + ")";
      const left = CATS.filter((c) => c.id !== "secret" && !this.stats.cats.includes(c.id)).map((c) => c.icon + " " + c.name);
      return "Perform one from every collection to unlock. Still to try: " + left.join(", ");
    }

    /* ---------- DOM ---------- */
    buildDom() {
      const st = document.getElementById("stage");
      const fx = (this.fxEl = document.createElement("div"));
      fx.className = "fx-cine"; fx.setAttribute("aria-hidden", "true");
      fx.innerHTML = '<div class="fx-bar top"></div><div class="fx-bar bot"></div><div class="fx-vig"></div><div class="fx-flash"></div><div class="fx-title"></div><div class="fx-sub"></div>';
      st.appendChild(fx);
      const skip = (this.skipEl = document.createElement("button"));
      skip.type = "button"; skip.className = "fx-skip"; skip.textContent = "Skip ⏭"; skip.hidden = true;
      skip.addEventListener("click", () => this.skip());
      st.appendChild(skip);
      const end = (this.endEl = document.createElement("div"));
      end.className = "fx-end"; end.hidden = true;
      st.appendChild(end);
      const menu = (this.menuEl = document.createElement("div"));
      menu.className = "fat-menu"; menu.hidden = true; menu.setAttribute("role", "dialog"); menu.setAttribute("aria-label", "Choose a Fatality");
      st.appendChild(menu);
      document.addEventListener("keydown", (e) => {
        if (!this.on) return;
        if (e.key === "Escape") { if (this.playing) this.skip(); else if (!menu.hidden) this.closeMenu(); }
        if (e.key === "Enter" && !menu.hidden && !this.playing) { e.preventDefault(); this.execute(this.sel); }
      });
    }
    renderMenu() {
      const m = this.menuEl, tabs = [{ id: "all", name: "All", icon: "☠️" }].concat(CATS);
      const shown = LIST.filter((d) => this.tab === "all" || d.cat === this.tab);
      const sel = LIST.find((d) => d.id === this.sel) || LIST[0];
      const card = (d) => {
        const lk = this.locked(d), seen = this.stats.seen.includes(d.id);
        return '<button type="button" class="fat-card' + (d.id === this.sel ? " on" : "") + (lk ? " locked" : "") + '" data-f="' + d.id + '" style="--fc:' + d.color + '">' +
          '<span class="pv pv-' + d.pv + '"><i>' + (lk ? "🔒" : "🧍") + "</i><b>" + (lk ? "❔" : d.icon) + "</b></span>" +
          '<span class="fc-name">' + (lk ? "???" : d.name) + "</span>" +
          '<span class="fc-cat">' + CATS.find((c) => c.id === d.cat).icon + " " + CATS.find((c) => c.id === d.cat).name + (seen ? " · ✓" : "") + "</span></button>";
      };
      const lk = this.locked(sel);
      m.innerHTML =
        '<div class="fm-head"><div><div class="fm-kicker">Fatality Mode</div><h2>Choose your finisher</h2></div><button type="button" class="fm-x" data-x aria-label="Close">✕</button></div>' +
        '<div class="fm-tabs" role="tablist">' + tabs.map((c) => '<button type="button" role="tab" aria-selected="' + (this.tab === c.id) + '" class="' + (this.tab === c.id ? "on" : "") + '" data-tab="' + c.id + '">' + c.icon + " " + c.name + "</button>").join("") + "</div>" +
        '<div class="fm-grid">' + shown.map(card).join("") + "</div>" +
        '<div class="fm-foot" style="--fc:' + sel.color + '"><div class="fm-info"><b>' + (lk ? "🔒 Secret finisher" : sel.icon + " " + sel.name) + "</b><span>" + (lk ? this.lockText(sel) : sel.desc) + '</span></div><div class="fm-btns"><button type="button" class="fm-rand" data-rand>🎲 Random</button><button type="button" class="fm-go" data-go' + (lk ? " disabled" : "") + ">💀 EXECUTE FATALITY</button></div></div>" +
        '<div class="fm-count">Fatalities performed: <b>' + this.stats.total + "</b></div>";
      m.querySelector("[data-x]").addEventListener("click", () => this.closeMenu());
      m.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { this.tab = b.dataset.tab; this.renderMenu(); }));
      m.querySelectorAll("[data-f]").forEach((b) => {
        b.addEventListener("click", () => { this.sel = b.dataset.f; S.audio.unlock(); S.audio.play("tick"); this.renderMenu(); const g = this.menuEl.querySelector(".fm-grid"); if (g) g.scrollTop = this.gridScroll || 0; });
        b.addEventListener("dblclick", () => { if (!this.locked(LIST.find((d) => d.id === b.dataset.f))) this.execute(b.dataset.f); });
      });
      const g = m.querySelector(".fm-grid");
      g.addEventListener("scroll", () => { this.gridScroll = g.scrollTop; });
      g.scrollTop = this.gridScroll || 0;
      m.querySelector("[data-rand]").addEventListener("click", () => this.random());
      m.querySelector("[data-go]").addEventListener("click", () => this.execute(this.sel));
    }
    openMenu() {
      if (this.playing) return;
      this.endEl.hidden = true;
      this.renderMenu(); this.menuEl.hidden = false;
      S.audio.unlock(); S.audio.play("gong");
      const go = this.menuEl.querySelector("[data-go]"); if (go) go.focus({ preventScroll: true });
    }
    closeMenu() { this.menuEl.hidden = true; }
    random() {
      const pool = LIST.filter((d) => !this.locked(d) && (!this.last || d.id !== this.last.id));
      this.execute(pick(pool).id);
    }

    /* ---------- mode on/off ---------- */
    enter() {
      this.on = true;
      this.W.setEnvironment("pit");
      this.fc.suppress = true; this.fc.dirty = true; this.fc.photoDirty = true; this.B.refreshFace();
      this.fresh();
    }
    exit() {
      this.stop(true);
      this.on = false; this.closeMenu(); this.endEl.hidden = true;
      const brutal = S.settings && S.settings.violence === "brutal";
      this.fc.suppress = brutal; this.fc.dirty = true; this.fc.photoDirty = true; this.B.refreshFace();
    }
    fresh() {
      const B = this.B;
      B.root.scale.set(1, 1, 1);
      B.revive();                       // rebuilds the body with fresh materials, so any tint is gone
      if (S.applyStyle) S.applyStyle();
      this.tinted = null;
      B.machinePose = null; B.dizzy = 0; B.home = null;
    }

    /* ---------- playback ---------- */
    execute(id) {
      const d = LIST.find((x) => x.id === id);
      if (!d || this.locked(d)) return;
      S.audio.unlock();
      this.closeMenu(); this.endEl.hidden = true;
      this.stop(true);
      if (S.game && S.game.tools) S.game.tools.clear();
      if (S.brutal) S.brutal.clear();
      this.W.clearFloor();
      this.fresh();
      const B = this.B;
      B.setState("machine"); B.machinePose = "dizzy"; B.vel.set(0, 0, 0); B.angVel.set(0, 0, 0);
      B.com.set(0, HIP, 0); B.quat.identity();
      this.cur = d; this.last = d; this.playing = true; this.t = -INTRO; this.done = false;
      this.ev = []; this.spans = []; this.slows = []; this.anims = []; this.tinted = null;
      this.skyBg = null;
      this.camP.set(0, 2.6, 8.2); this.camL.set(0, 1.05, -0.9); this.shot = null;
      this.W.camCtl = (cam) => { cam.position.copy(this.camP); cam.lookAt(this.camL); };
      document.body.classList.add("cine");
      this.fxEl.classList.add("on"); this.skipEl.hidden = false;
      this.fxEl.style.setProperty("--fc", d.color);
      // the intro: everyone holds their breath
      this.off = -INTRO;
      this.cam(0, 1.6, [[0, 1.5, 3.8], [0, 1.2, 0]]);
      this.at(0, () => { S.audio.play("gong"); this.title("FINISH THEM!", "finish"); S.audio.announce("Finish them!"); this.face("dizzy", 3); });
      this.at(0.05, () => this.W.shake(4));
      this.span(0, INTRO, (k) => { B.com.x = Math.sin(k * 9) * 0.06; B.quat.setFromEuler(new E(0, 0, Math.sin(k * 7) * 0.08)); });
      this.at(INTRO - 0.25, () => { this.title(""); this.sub(d.icon + " " + d.name); B.com.x = 0; B.quat.identity(); B.machinePose = null; });
      // the finisher itself
      this.off = 0;
      d.run(this);
      // the ending
      this.at(d.dur, () => this.finish());
    }
    finish() {
      const d = this.cur;
      this.done = true;
      this.W.forceScale = null;
      this.title("FATALITY", "fatal"); this.sub(d.icon + " " + d.name);
      S.audio.play("sting"); S.audio.play("thunder"); S.audio.announce("Fatality");
      this.flash("#ff2d2d", 220); this.W.shake(6);
      const s = this.stats; s.total++; if (!s.cats.includes(d.cat)) s.cats.push(d.cat); if (!s.seen.includes(d.id)) s.seen.push(d.id); saveStats(s);
      const newly = LIST.filter((x) => x.unlock && !this.locked(x) && !s.seenUnlock?.includes(x.id));
      s.seenUnlock = (s.seenUnlock || []).concat(newly.map((x) => x.id)); saveStats(s);
      this.later(2.4, () => {
        this.skipEl.hidden = true; this.sub("");
        this.endEl.innerHTML = '<div class="fe-name">' + d.icon + " " + d.name + '</div>' +
          (newly.length ? '<div class="fe-unlock">🔓 Secret unlocked: ' + newly.map((x) => x.icon + " " + x.name).join(", ") + "</div>" : "") +
          '<div class="fe-btns"><button type="button" data-e="replay">↻ Replay</button><button type="button" data-e="random">🎲 Random</button><button type="button" data-e="menu" class="main">☠️ Choose another</button><button type="button" data-e="exit">✕ Done</button></div>';
        this.endEl.hidden = false;
        if (newly.length) S.audio.play("unlock");
        this.endEl.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => {
          const e = b.dataset.e;
          if (e === "replay") this.execute(d.id);
          else if (e === "random") this.random();
          else if (e === "menu") { this.stop(); this.openMenu(); }
          else { this.stop(); }
        }));
      });
    }
    later(t, fn) { this.ev.push({ t: this.t + t, fn, abs: true }); }
    skip() {
      if (!this.playing || this.done) return;
      // fast-forward silently to just before the ending, which then plays normally
      const A = S.audio, keep = [A.sfx, A.voice];
      A.sfx = false; A.voice = false;
      const end = this.cur.dur - 0.001;
      let guard = 0;
      while (this.t < end && guard++ < 3000) this.tick(Math.min(1 / 30, end - this.t + 1e-6));
      A.sfx = keep[0]; A.voice = keep[1];
      this.W.forceScale = null;
    }
    // stop the cinematic and give the camera back; `keep` leaves the buddy as is (we rebuild right after)
    stop(keep) {
      const was = this.playing || this.objs.length || this.debrisList.length;
      this.playing = false; this.cur = null; this.done = false;
      this.ev = []; this.spans = []; this.slows = []; this.anims = [];
      for (const o of this.objs) { o.parent && o.parent.remove(o); }
      this.objs = [];
      for (const p of this.debrisList) { this.W.propGroup.remove(p.mesh); this.W.physics.removeBody(p.body); }
      this.W.props = this.W.props.filter((p) => !this.debrisList.includes(p));
      this.debrisList = [];
      this.glowP.clear(); this.smokeP.clear();
      this.W.forceScale = null; this.W.camCtl = null; this.W.updateCamera(0);
      const A = this.W.arenaData; if (A && A.fxLights) A.fxLights.forEach((l) => (l.intensity = 0));
      if (this.skyBg && this.W.scene.background) { this.W.scene.background.copy(this.skyBg); this.W.scene.fog && this.W.scene.fog.color.copy(this.skyBg); }
      this.skyBg = null;
      document.body.classList.remove("cine");
      this.fxEl.classList.remove("on"); this.title(""); this.sub(""); this.skipEl.hidden = true; this.endEl.hidden = true;
      if (was && !keep) this.fresh();
      if ("speechSynthesis" in window && was) try { speechSynthesis.cancel(); } catch (e) {}
    }

    /* ---------- per frame (before the buddy moves) ---------- */
    update(dt, rdt) {
      this.glowP.update(dt); this.smokeP.update(dt);
      if (!this.playing) return;
      this.tick(dt, rdt);
    }
    tick(dt) {
      this.t += dt;
      const t = this.t;
      // time scale for the next frame
      let sc = null;
      for (const [a, b, s] of this.slows) if (t >= a && t < b) sc = s;
      if (S.settings && S.settings.slowmo === false && sc != null) sc = Math.max(sc, 0.6);
      this.W.forceScale = this.done ? null : sc;
      // events
      for (let i = 0; i < this.ev.length; i++) {
        const e = this.ev[i];
        if (t >= e.t) { this.ev.splice(i--, 1); try { e.fn(); } catch (err) { console.error(err); } }
      }
      for (let i = 0; i < this.spans.length; i++) {
        const s = this.spans[i];
        if (t < s.t0) continue;
        const k = clamp((t - s.t0) / Math.max(1e-4, s.t1 - s.t0), 0, 1);
        try { s.fn(k, dt); } catch (err) { console.error(err); }
        if (k >= 1) this.spans.splice(i--, 1);
      }
      for (let i = 0; i < this.anims.length; i++) {
        const a = this.anims[i]; a.age += dt;
        let keep = true;
        try { keep = a.fn(dt, a.age); } catch (err) { console.error(err); keep = false; }
        if (!keep) this.anims.splice(i--, 1);
      }
      // camera
      const sh = this.shot;
      if (sh) {
        const k = clamp((t - sh.t0) / Math.max(1e-4, sh.dur), 0, 1), e = ease(k);
        const [p, l] = this.resolveShot(sh);
        this.camP.lerpVectors(sh.fromP, p, e); this.camL.lerpVectors(sh.fromL, l, e);
      }
    }
    resolveShot(sh) {
      const r = (x) => (typeof x === "function" ? x() : Array.isArray(x) ? v(x[0], x[1], x[2]) : x.clone());
      const p = r(sh.pos), l = r(sh.look);
      if (this.W.camera.aspect < 0.8) p.sub(l).multiplyScalar(1.55).add(l);
      return [p, l];
    }

    /* =========================================================
       TIMELINE HELPERS (used by the finishers)
       ========================================================= */
    at(t, fn) { this.ev.push({ t: t + this.off, fn }); }
    span(t0, t1, fn) { this.spans.push({ t0: t0 + this.off, t1: t1 + this.off, fn }); }
    slow(t0, t1, s) { this.slows.push([t0 + this.off, t1 + this.off, s]); }
    sfx(t, n, p) { this.at(t, () => S.audio.play(n, p)); }
    pose(t, n) { this.at(t, () => { this.B.machinePose = n; }); }
    say(t, line) { this.at(t, () => { if (!this.B.gibbed) { S.bus.emit("say", line); S.audio.speak(line, true); } }); }
    face(a, b, c) {
      // face(t, expr, dur) on the timeline, or face(expr, dur) right now
      if (typeof a === "number") { this.at(a, () => this.face(b, c)); return; }
      this.B.face.setExpression(a, b || 2);
    }
    cam(t, dur, shot) {
      this.at(t, () => { this.shot = { t0: this.t, dur, fromP: this.camP.clone(), fromL: this.camL.clone(), pos: shot[0], look: shot[1] }; });
    }
    camSet(p, l) {
      if (this.shot && this.shot.t0 >= this.t - 1e-6) return; // a camera move that starts this frame wins
      this.shot = null;
      if (this.W.camera.aspect < 0.8) p = p.clone().sub(l).multiplyScalar(1.55).add(l);
      this.camP.copy(p); this.camL.copy(l);
    }
    anim(fn) { this.anims.push({ fn, age: 0 }); }
    add(o) { this.W.fxGroup.add(o); this.objs.push(o); return o; }
    track(o) { this.objs.push(o); return o; }
    remove(o) { if (!o) return; o.parent && o.parent.remove(o); this.objs = this.objs.filter((x) => x !== o); }
    gone() { const B = this.B; if (B.gibbed) return; B.root.visible = false; B.gibbed = true; B.body.position.set(0, -50, 0); }

    /* ---------- screen overlays ---------- */
    flash(color, ms) {
      const f = this.fxEl.querySelector(".fx-flash");
      f.style.background = color; f.style.transition = "none"; f.style.opacity = "0.9";
      void f.offsetWidth;
      f.style.transition = "opacity " + (ms || 200) + "ms ease-out"; f.style.opacity = "0";
    }
    title(text, cls) {
      const el = this.fxEl.querySelector(".fx-title");
      el.className = "fx-title" + (cls ? " " + cls : "");
      el.textContent = text;
      if (text) { void el.offsetWidth; el.classList.add("show"); }
    }
    sub(text) { const el = this.fxEl.querySelector(".fx-sub"); el.textContent = text; el.classList.toggle("show", !!text); }
    sky(color, k) {
      const bg = this.W.scene.background; if (!bg || !bg.isColor) return;
      if (!this.skyBg) this.skyBg = bg.clone();
      if (color === null) { const from = bg.clone(), to = this.skyBg; this.anim((dt, a) => { const kk = Math.min(1, a / 0.8); bg.copy(from).lerp(to, kk); this.W.scene.fog && this.W.scene.fog.color.copy(bg); return kk < 1; }); return; }
      const from = bg.clone(), to = new THREE.Color(color);
      this.anim((dt, a) => { const kk = Math.min(1, a / (k || 1)); bg.copy(from).lerp(to, kk); this.W.scene.fog && this.W.scene.fog.color.copy(bg); return kk < 1; });
    }

    /* ---------- lights ---------- */
    // light(i, color, intensity, pos); a colour of 0/null just switches light i off
    light(i, color, intensity, pos) {
      const L = this.W.arenaData && this.W.arenaData.fxLights; if (!L || !L[i]) return;
      if (!color) { L[i].intensity = 0; return; }
      L[i].color.set(color);
      L[i].intensity = intensity || 0;
      if (pos) L[i].position.copy(pos);
    }
    lightAt(i, pos, intensity, color) { const L = this.W.arenaData && this.W.arenaData.fxLights; if (!L || !L[i]) return; L[i].position.copy(pos); L[i].intensity = intensity; if (color) L[i].color.set(color); }

    /* ---------- buddy looks ---------- */
    tint(color, k, em, ek) {
      const B = this.B;
      if (!this.tinted) {
        this.tinted = new Map();
        B.root.traverse((o) => {
          if (!o.isMesh || o.material === B.outlineMat) return;
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) if (m && m.color && !this.tinted.has(m)) this.tinted.set(m, { c: m.color.clone(), e: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity });
        });
      }
      const tc = new THREE.Color(color), ec = em ? new THREE.Color(em) : null;
      for (const [m, o] of this.tinted) {
        m.color.copy(o.c).lerp(tc, clamp(k, 0, 1));
        if (m.emissive && o.e) { if (ec) { m.emissive.copy(o.e).lerp(ec, clamp(ek || 0, 0, 1)); m.emissiveIntensity = 1; } }
      }
    }
    ghostOf(color) {
      const g = this.B.root.clone(true), mat = glow(color, 0.5);
      g.traverse((o) => { if (o.isMesh) { if (o.material === this.B.outlineMat) o.visible = false; else o.material = mat; o.castShadow = false; } });
      g.scale.set(1, 1, 1);
      return g;
    }

    /* ---------- effects ---------- */
    fire(p, n, size, up) {
      for (let i = 0; i < (n || 1); i++) this.glowP.spawn({ pos: p.clone().add(v(R(-0.08, 0.08), 0, R(-0.08, 0.08))), vel: v(R(-0.3, 0.3), up != null ? up + R(-0.5, 0.5) : R(1.5, 3), R(-0.3, 0.3)), size: (size || 0.06) * R(1, 2.2), life: R(0.35, 0.7), color: pick(["#ff922b", "#ffd43b", "#ff6b3d", "#ffe066"]), gravity: -1.5, drag: 1, grow: 1.2, floor: false });
    }
    smoke(p, n, color, size) {
      for (let i = 0; i < (n || 8); i++) this.smokeP.spawn({ pos: p.clone().add(v(R(-0.2, 0.2), R(-0.1, 0.2), R(-0.2, 0.2))), vel: v(R(-1.2, 1.2), R(0.3, 1.6), R(-1.2, 1.2)), size: (size || 0.2) * R(0.45, 0.85), life: R(0.9, 1.8), color: color || "#adb5bd", gravity: -0.4, drag: 1.6, grow: 1.5, floor: false });
    }
    sparks(p, n, color) { for (let i = 0; i < (n || 10); i++) this.W.fx.star.spawn({ pos: p.clone(), vel: v(R(-4, 4), R(-1, 4), R(-4, 4)), size: R(0.02, 0.045), life: R(0.3, 0.6), color: color || "#ffd43b", gravity: 5, spin: 14, floor: false }); }
    ring(p, color, rMax, dur, vertical) {
      const r = this.add(mesh(new THREE.RingGeometry(0.85, 1, 48), glow(color, 0.9), p.toArray()));
      if (vertical) r.lookAt(this.W.camera.position); else r.rotation.x = -Math.PI / 2;
      r.scale.setScalar(0.05);
      this.anim((dt, a) => { const k = Math.min(1, a / dur); r.scale.setScalar(0.05 + rMax * easeOut(k)); r.material.opacity = 0.9 * (1 - k); if (k >= 1) { this.remove(r); return false; } return true; });
    }
    blast(p, color, rMax, dur) {
      const s = this.add(mesh(new THREE.SphereGeometry(1, 24, 16), glow(color, 0.8), p.toArray()));
      s.scale.setScalar(0.1);
      this.anim((dt, a) => { const k = Math.min(1, a / dur); s.scale.setScalar(0.1 + rMax * easeOut(k)); s.material.opacity = 0.8 * (1 - k); if (k >= 1) { this.remove(s); return false; } return true; });
      for (let i = 0; i < 24; i++) this.fire(p, 1, 0.12, R(-2, 4));
    }
    bolt(a, b) {
      const pts = [], n = 10;
      for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); if (i && i < n) p.add(v(R(-0.35, 0.35), 0, R(-0.35, 0.35))); pts.push(p); }
      const g = new THREE.Group();
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 40, 0.035, 5), glow("#e7f5ff", 1), null, g);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 40, 0.12, 6), glow("#74c0fc", 0.35), null, g);
      this.add(g);
      S.audio.play("thunder"); this.flash("#e7f5ff", 160); this.W.shake(8);
      this.lightAt(1, b.clone().add(v(0, 1, 0.6)), 16, "#a5d8ff");
      this.sparks(b, 14, "#a5d8ff");
      this.anim((dt, age) => { g.visible = Math.floor(age * 30) % 3 !== 1; if (age > 0.28) { this.remove(g); this.light(1, null, 0); return false; } return true; });
    }
    // loose physical pieces (no blood, ever): either n generated chunks, or one given mesh
    debris(o) {
      const W = this.W, out = [];
      const make = (m, pos, r, vel, cyl) => {
        const p = W.addProp({ kind: "fdebris", mesh: m, shape: cyl ? new CANNON.Cylinder(r * 0.6, r * 0.6, r * 3, 6) : new CANNON.Sphere(r), mass: Math.max(0.08, r * 3), pos: [pos.x, pos.y, pos.z], damp: 0.2, adamp: 0.3, color: "#888" });
        p.body.velocity.set(vel.x, vel.y, vel.z);
        p.body.angularVelocity.set(R(-8, 8), R(-8, 8), R(-8, 8));
        this.debrisList.push(p); out.push(p);
        if (this.debrisList.length > 140) { const old = this.debrisList.shift(); W.propGroup.remove(old.mesh); W.physics.removeBody(old.body); W.props = W.props.filter((x) => x !== old); }
        return p;
      };
      if (o.mesh) return make(o.mesh, o.pos, o.r || 0.1, o.vel || v(0, 0, 0));
      const sp = o.spread || [0.2, 0.2, 0.2];
      for (let i = 0; i < o.n; i++) {
        const s = R(o.size[0], o.size[1]), col = pick(o.cols);
        const geo = o.cyl ? new THREE.CylinderGeometry(s * 0.6, s * 0.6, s * 3, 8) : o.flat ? new THREE.BoxGeometry(s, s * 0.4, s * 3) : o.cube ? new THREE.BoxGeometry(s * 1.5, s * 1.5, s * 1.5) : new THREE.DodecahedronGeometry(s, 0);
        const m = new THREE.Mesh(geo, std(col, Object.assign({ roughness: 0.8, flatShading: true }, o.mat || {})));
        const pos = o.pos.clone().add(v(R(-sp[0], sp[0]), R(-sp[1], sp[1]), R(-sp[2], sp[2])));
        const dir = pos.clone().sub(o.pos); dir.y = Math.abs(dir.y); if (dir.lengthSq() < 1e-4) dir.set(R(-1, 1), 1, R(-1, 1)); dir.normalize();
        make(m, pos, s * (o.cube ? 0.8 : 0.9), dir.multiplyScalar(R(0.4, 1) * (o.speed || 3)).add(v(0, R(0.5, 1) * (o.up || 1), 0)), o.cyl);
      }
      return out;
    }
  }

  Fatality.LIST = LIST;
  Fatality.CATS = CATS;
  S.Fatality = Fatality;
})();
