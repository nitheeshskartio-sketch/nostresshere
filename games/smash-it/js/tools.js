/* ============ SMASH IT — tools: melee swings, throwables, water spray ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const PAINTS = ["#ff4d6d", "#4dabf7", "#69db7c", "#ffd43b", "#b197fc", "#ff922b", "#f783ac"];

  /* ---------- the catalogue ---------- */
  const TOOLS = (S.TOOLS = [
    { id: "glove", name: "Boxing Glove", icon: "🥊", kind: "melee", swing: "jab", power: 6.5, tc: 0.1, sound: "punch", unlock: 0 },
    { id: "slap", name: "Slap", icon: "🖐️", kind: "melee", swing: "slap", power: 4.5, tc: 0.09, sound: "slap", unlock: 0 },
    { id: "kick", name: "Kick", icon: "🦶", kind: "melee", swing: "kick", power: 10, tc: 0.12, sound: "kick", lift: 0.6, unlock: 0 },
    { id: "push", name: "Push", icon: "👐", kind: "melee", swing: "push", power: 5, tc: 0.14, sound: "push", unlock: 0 },
    { id: "tomato", name: "Tomato", icon: "🍅", kind: "throw", proj: "tomato", unlock: 0 },
    { id: "pillow", name: "Pillow", icon: "☁️", kind: "throw", proj: "pillow", unlock: 0 },
    { id: "softhammer", name: "Soft Hammer", icon: "🔨", kind: "melee", swing: "overhead", power: 6, tc: 0.16, sound: "soft", unlock: 0, L: 0.75 },
    { id: "football", name: "Football", icon: "⚽", kind: "throw", proj: "football", unlock: 0 },
    { id: "egg", name: "Egg", icon: "🥚", kind: "throw", proj: "egg", unlock: 10 },
    { id: "pie", name: "Cream Pie", icon: "🥧", kind: "throw", proj: "pie", unlock: 20 },
    { id: "balloon", name: "Water Balloon", icon: "🎈", kind: "throw", proj: "balloon", unlock: 30 },
    { id: "foambat", name: "Foam Bat", icon: "🏏", kind: "melee", swing: "bat", power: 7.5, tc: 0.15, sound: "soft", unlock: 45, L: 1.0 },
    { id: "paint", name: "Paint Bucket", icon: "🪣", kind: "throw", proj: "paint", unlock: 60 },
    { id: "sponge", name: "Giant Sponge", icon: "🧽", kind: "melee", swing: "jab", power: 2.5, tc: 0.13, sound: "squish", unlock: 75, react: ["comfy", 1.6, "sponge"], set: "both" },
    { id: "mallet", name: "Rubber Mallet", icon: "⚒️", kind: "melee", swing: "overhead", power: 7, tc: 0.14, sound: "bonk", unlock: 90, L: 0.65 },
    { id: "water", name: "Water Spray", icon: "💦", kind: "spray", unlock: 110, set: "both" },
    { id: "inflatable", name: "Giant Inflatable Hammer", icon: "🎪", kind: "melee", swing: "giant", power: 9, tc: 0.34, sound: "squeak", unlock: 130, L: 1.9 },
    { id: "confetti", name: "Confetti Bomb", icon: "🎉", kind: "throw", proj: "bomb", unlock: 160 },
    // ---- Brutal mode (cartoon blood, always the cartoon face) ----
    { id: "knuckles", name: "Brass Knuckles", icon: "👊", kind: "melee", swing: "jab", power: 8, tc: 0.09, sound: "crunch", set: "brutal", unlock: 0 },
    { id: "bat", name: "Baseball Bat", icon: "⚾", kind: "melee", swing: "bat", power: 10, tc: 0.15, sound: "crunch", set: "brutal", unlock: 0, L: 1.0 },
    { id: "pan", name: "Frying Pan", icon: "🍳", kind: "melee", swing: "slap", power: 8.5, tc: 0.11, sound: "bong", set: "brutal", unlock: 0, L: 0.7 },
    { id: "wrench", name: "Pipe Wrench", icon: "🔧", kind: "melee", swing: "overhead", power: 9.5, tc: 0.15, sound: "crunch", set: "brutal", unlock: 0, L: 0.7 },
    { id: "sledge", name: "Sledgehammer", icon: "🔨", kind: "melee", swing: "overhead", power: 12, tc: 0.24, sound: "crunch", set: "brutal", unlock: 0, L: 1.1 },
    { id: "boot", name: "Steel-Toe Boot", icon: "🥾", kind: "melee", swing: "kick", power: 13, tc: 0.12, sound: "crunch", lift: 0.9, set: "brutal", unlock: 0 },
    { id: "brick", name: "Brick", icon: "🧱", kind: "throw", proj: "brick", set: "brutal", unlock: 0 },
    { id: "bowling", name: "Bowling Ball", icon: "🎳", kind: "throw", proj: "bowling", set: "brutal", unlock: 0 },
    { id: "dynamite", name: "Dynamite", icon: "🧨", kind: "throw", proj: "dynamite", set: "brutal", unlock: 0 },
    { id: "anvil", name: "Anvil Drop", icon: "🏗️", kind: "drop", proj: "anvil", set: "brutal", unlock: 0 },
    { id: "petrol", name: "Petrol Can", icon: "⛽", kind: "spray", fluid: "petrol", set: "brutal", unlock: 0 },
    { id: "torch", name: "Fire Stick", icon: "🔥", kind: "throw", proj: "torch", set: "brutal", unlock: 0 },
    { id: "gas", name: "Gas Cylinder", icon: "🛢️", kind: "place", set: "brutal", unlock: 0 },
    { id: "gun", name: "Pistol", icon: "🔫", kind: "gun", set: "brutal", unlock: 0 },
    { id: "knife", name: "Knife", icon: "🔪", kind: "melee", swing: "bat", power: 6, tc: 0.09, sound: "slice", set: "brutal", unlock: 0, L: 0.6, cut: true },
    { id: "saw", name: "Saw Cutter", icon: "🪚", kind: "saw", variant: "saw", set: "brutal", unlock: 0 },
    { id: "chainsaw", name: "Chainsaw", icon: "⛓️", kind: "saw", variant: "chainsaw", set: "brutal", unlock: 0 }
  ]);
  S.toolSet = (t) => t.set || "normal";
  S.toolById = (id) => TOOLS.find((t) => t.id === id);

  const PROJ = {
    tomato: { r: 0.075, mass: 0.15, splat: "tomato", color: "#e03131", power: 2.5, sound: "splat", line: "tomato", size: 0.32 },
    egg: { r: 0.06, mass: 0.06, splat: "egg", color: "#ffd43b", power: 2, sound: "egg", line: "egg", size: 0.26 },
    pie: { r: 0.15, mass: 0.4, splat: "cream", color: "#fff6e3", power: 3.5, sound: "splat", line: "pie", size: 0.45, faceSize: 0.85 },
    balloon: { r: 0.12, mass: 0.5, water: true, power: 3.5, sound: "splash", line: "water" },
    paint: { r: 0.14, mass: 0.8, splat: "paint", power: 4, sound: "splat", line: "paint", size: 0.55, faceSize: 1.0 },
    pillow: { r: 0.16, mass: 0.25, bounce: 0.35, power: 2.5, sound: "soft", line: "pillow", react: ["laugh", 1.6, "pillow", "laugh"] },
    football: { r: 0.11, mass: 0.43, bounce: 0.6, power: 6.5, sound: "bounce" },
    bomb: { r: 0.12, mass: 0.5, bomb: true },
    brick: { r: 0.11, mass: 2.5, bounce: 0.15, power: 7.5, sound: "crunch", gore: true },
    bowling: { r: 0.11, mass: 6, bounce: 0.3, power: 9.5, sound: "crunch", gore: true },
    dynamite: { r: 0.1, mass: 0.6, bomb: true, brutal: true },
    anvil: { r: 0.22, mass: 40, bounce: 0.05, power: 12, sound: "anvil", gore: true, anvil: true },
    torch: { r: 0.08, mass: 0.4, torch: true, power: 3, sound: "ignite" }
  };
  const BLOOD = ["#9b0000", "#b3001b", "#7a0010", "#a4161a"];

  /* ---------- shared materials ---------- */
  const M = {};
  function mat(key, make) { return M[key] || (M[key] = make()); }
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5 }, o || {}));

  /* ---------- instrument & projectile models ---------- */
  function mesh(geo, m, pos, parent) { const x = new THREE.Mesh(geo, m); x.castShadow = true; if (pos) x.position.set(pos[0], pos[1], pos[2]); parent.add(x); return x; }

  function buildInstrument(tool, L, skin) {
    const g = new THREE.Group();
    const skinM = mat("skin" + skin, () => std(skin, { roughness: 0.55 }));
    switch (tool.id) {
      case "glove": {
        const red = mat("glove", () => std("#e03131", { roughness: 0.25, metalness: 0.05 }));
        const m = mesh(new THREE.SphereGeometry(0.17, 24, 16), red, [0, 0, -0.14], g); m.scale.set(1, 0.9, 1.15);
        mesh(new THREE.SphereGeometry(0.07, 14, 10), red, [0.14, 0.03, -0.1], g);
        const cuff = mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.18, 20), mat("white", () => std("#f8f9fa")), [0, 0, -0.36], g); cuff.rotation.x = Math.PI / 2;
        const arm = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 12), skinM, [0, 0, -0.72], g); arm.rotation.x = Math.PI / 2;
        break;
      }
      case "push": {
        for (const s of [-1, 1]) {
          mesh(new THREE.BoxGeometry(0.17, 0.2, 0.05), skinM, [s * 0.16, 0, -0.03], g);
          for (let i = 0; i < 4; i++) mesh(new THREE.CapsuleGeometry(0.02, 0.08, 3, 6), skinM, [s * 0.16 + (i - 1.5) * 0.04, 0.15, -0.03], g);
          const arm = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 10), mat("sleeve", () => std("#5c7cfa")), [s * 0.16, -0.02, -0.4], g); arm.rotation.x = Math.PI / 2;
        }
        break;
      }
      case "kick": {
        const shoe = mat("kshoe", () => std("#4c6ef5", { roughness: 0.4 }));
        const sole = mat("ksole", () => std("#f8f9fa"));
        const s = mesh(new THREE.SphereGeometry(1, 18, 12), shoe, [0, 0, -0.16], g); s.scale.set(0.11, 0.09, 0.2);
        const so = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.38), sole, [0, -0.08, -0.16], g); so.scale.set(1, 1, 1);
        const leg = mesh(new THREE.CapsuleGeometry(0.085, 0.6, 4, 10), mat("kpants", () => std("#343a40")), [0, 0.3, -0.42], g); leg.rotation.x = -0.6;
        break;
      }
      case "sponge": {
        const sp = mat("sponge", () => new THREE.MeshStandardMaterial({ map: S.tex.sponge(), roughness: 0.95 }));
        mesh(new THREE.BoxGeometry(0.55, 0.36, 0.28), sp, [0, 0, -0.14], g);
        mesh(new THREE.BoxGeometry(0.55, 0.36, 0.05), mat("scrub", () => std("#2f9e44", { roughness: 1 })), [0, 0, -0.3], g);
        break;
      }
      case "slap": {
        const palm = mesh(new THREE.BoxGeometry(0.2, 0.22, 0.05), skinM, [0, 0, 0], g);
        for (let i = 0; i < 4; i++) mesh(new THREE.CapsuleGeometry(0.022, 0.12, 3, 6), skinM, [(i - 1.5) * 0.048, -0.18, 0], g);
        const th = mesh(new THREE.CapsuleGeometry(0.024, 0.08, 3, 6), skinM, [0.12, -0.02, 0], g); th.rotation.z = 0.9;
        mesh(new THREE.CylinderGeometry(0.06, 0.07, L - 0.1, 10), mat("sleeve", () => std("#5c7cfa")), [0, (L - 0.1) / 2 + 0.1, 0], g);
        palm.scale.set(1, 1, 1);
        break;
      }
      case "softhammer":
      case "mallet":
      case "inflatable": {
        const giant = tool.id === "inflatable";
        const headR = giant ? 0.5 : tool.id === "mallet" ? 0.11 : 0.13;
        const headL = giant ? 1.15 : tool.id === "mallet" ? 0.28 : 0.34;
        const headM = giant ? mat("infl", () => new THREE.MeshStandardMaterial({ map: S.tex.stripes(["#e03131", "#ffd43b", "#e03131", "#ffd43b", "#e03131", "#ffd43b"]), roughness: 0.18, metalness: 0.05 }))
          : tool.id === "mallet" ? mat("rubber", () => std("#212529", { roughness: 0.6 })) : mat("softh", () => std("#ff8fab", { roughness: 0.35 }));
        const handleM = giant ? headM : mat("wood", () => std("#c8955c", { roughness: 0.7 }));
        const head = mesh(new THREE.CylinderGeometry(headR, headR, headL, 28), headM, [0, 0, -headL / 2], g);
        head.rotation.x = Math.PI / 2;
        const hr = giant ? 0.11 : 0.03;
        mesh(new THREE.CylinderGeometry(hr, hr, L, 12), handleM, [0, L / 2, -headL / 2], g);
        if (giant) for (const z of [-0.02, -headL + 0.02]) { const cap = mesh(new THREE.SphereGeometry(headR, 24, 12), headM, [0, 0, z], g); cap.scale.set(1, 1, 0.25); }
        break;
      }
      case "knife": {
        const steel = mat("blade", () => std("#dee2e6", { metalness: 0.95, roughness: 0.12 }));
        const blade = new THREE.Shape(); blade.moveTo(-0.022, 0.3); blade.lineTo(0.022, 0.3); blade.lineTo(0.024, 0.06); blade.quadraticCurveTo(0.01, 0, -0.012, -0.01); blade.lineTo(-0.022, 0.08); blade.closePath();
        const bm = mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.006, bevelEnabled: false }), steel, [0, 0, -0.003], g);
        mesh(new THREE.BoxGeometry(0.07, 0.02, 0.025), mat("guard", () => std("#495057", { metalness: 0.8, roughness: 0.3 })), [0, 0.31, 0], g);
        mesh(new THREE.CylinderGeometry(0.018, 0.02, L - 0.32, 10), mat("knifeh", () => std("#3b2a20", { roughness: 0.6 })), [0, 0.32 + (L - 0.32) / 2, 0], g);
        bm.rotation.y = Math.PI / 2;
        break;
      }
      case "knuckles": {
        const fist = mesh(new THREE.SphereGeometry(0.12, 18, 12), skinM, [0, 0, -0.1], g); fist.scale.set(1, 0.85, 1);
        const metal = mat("brass", () => std("#d4a72c", { metalness: 0.9, roughness: 0.25 }));
        for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.028, 0.012, 8, 14), metal, [(i - 1.5) * 0.055, 0.02, -0.01], g); }
        mesh(new THREE.BoxGeometry(0.24, 0.03, 0.03), metal, [0, -0.02, -0.01], g);
        const arm = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 10), skinM, [0, 0, -0.5], g); arm.rotation.x = Math.PI / 2;
        break;
      }
      case "bat": {
        const wood = mat("batwood", () => std("#c8955c", { roughness: 0.5 }));
        mesh(new THREE.CylinderGeometry(0.03, 0.075, L, 16), wood, [0, L / 2, 0], g);
        mesh(new THREE.SphereGeometry(0.075, 14, 10), wood, [0, 0, 0], g);
        mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), mat("tape", () => std("#212529")), [0, L - 0.12, 0], g);
        break;
      }
      case "pan": {
        const iron = mat("iron", () => std("#2b2b2b", { metalness: 0.7, roughness: 0.35 }));
        const disc = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 28), iron, [0, 0, -0.03], g); disc.rotation.x = Math.PI / 2;
        mesh(new THREE.CylinderGeometry(0.025, 0.03, L - 0.18, 10), mat("panh", () => std("#5c3d2e", { roughness: 0.6 })), [0, (L + 0.18) / 2, -0.03], g);
        break;
      }
      case "wrench": {
        const red = mat("wrenchred", () => std("#c92a2a", { roughness: 0.4, metalness: 0.3 }));
        const steel = mat("steel", () => std("#adb5bd", { metalness: 0.9, roughness: 0.25 }));
        mesh(new THREE.BoxGeometry(0.1, 0.12, 0.18), steel, [0, 0, -0.09], g);
        mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), steel, [0, -0.08, -0.14], g);
        mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 10), red, [0, L / 2, -0.09], g);
        break;
      }
      case "sledge": {
        const steel = mat("sledgehead", () => std("#495057", { metalness: 0.85, roughness: 0.35 }));
        mesh(new THREE.BoxGeometry(0.18, 0.18, 0.42), steel, [0, 0, -0.21], g);
        mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 12), mat("wood", () => std("#c8955c", { roughness: 0.7 })), [0, L / 2, -0.21], g);
        break;
      }
      case "boot": {
        const leather = mat("boot", () => std("#6f4518", { roughness: 0.6 }));
        const s = mesh(new THREE.SphereGeometry(1, 18, 12), leather, [0, 0, -0.16], g); s.scale.set(0.12, 0.1, 0.21);
        mesh(new THREE.SphereGeometry(0.07, 14, 10), mat("steel", () => std("#adb5bd", { metalness: 0.9, roughness: 0.25 })), [0, -0.01, -0.03], g).scale.set(1.3, 0.9, 0.8);
        mesh(new THREE.BoxGeometry(0.22, 0.05, 0.4), mat("sole2", () => std("#212529")), [0, -0.09, -0.16], g);
        const leg = mesh(new THREE.CapsuleGeometry(0.09, 0.6, 4, 10), leather, [0, 0.3, -0.42], g); leg.rotation.x = -0.6;
        break;
      }
      case "foambat": {
        const foam = mat("foam", () => std("#ff922b", { roughness: 0.85 }));
        mesh(new THREE.CylinderGeometry(0.045, 0.1, L, 16), foam, [0, L / 2, 0], g);
        mesh(new THREE.SphereGeometry(0.1, 16, 10), foam, [0, 0, 0], g);
        mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12), mat("grip", () => std("#343a40")), [0, L - 0.1, 0], g);
        break;
      }
    }
    return g;
  }

  function buildProjectile(kind, color) {
    const g = new THREE.Group();
    switch (kind) {
      case "tomato": {
        mesh(new THREE.SphereGeometry(0.075, 18, 12), mat("tomato", () => std("#e03131", { roughness: 0.25 })), null, g).scale.y = 0.85;
        const leaf = mesh(new THREE.ConeGeometry(0.04, 0.03, 5), mat("leaf", () => std("#2f9e44")), [0, 0.065, 0], g); leaf.rotation.x = Math.PI;
        break;
      }
      case "egg": mesh(new THREE.SphereGeometry(0.055, 16, 12), mat("egg", () => std("#fff4e0", { roughness: 0.4 })), null, g).scale.y = 1.3; break;
      case "pie": {
        const tin = mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.05, 24), mat("tin", () => std("#ced4da", { metalness: 0.7, roughness: 0.3 })), [0, -0.02, 0], g);
        const cream = mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("cream", () => std("#fffaf0", { roughness: 0.7 })), [0, 0, 0], g); cream.scale.y = 0.5;
        mesh(new THREE.SphereGeometry(0.03, 10, 8), mat("cherry", () => std("#c92a2a", { roughness: 0.2 })), [0, 0.08, 0], g);
        tin.scale.set(1, 1, 1);
        g.userData.faceAxis = new V3(0, 1, 0);
        break;
      }
      case "balloon": {
        mesh(new THREE.SphereGeometry(0.12, 18, 14), mat("wballoon", () => std("#4dabf7", { roughness: 0.1, transparent: true, opacity: 0.85 })), null, g).scale.y = 1.15;
        mesh(new THREE.ConeGeometry(0.025, 0.04, 8), mat("wballoon"), [0, -0.15, 0], g).rotation.x = Math.PI;
        break;
      }
      case "paint": {
        mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.24, 20), mat("bucket", () => std("#adb5bd", { metalness: 0.6, roughness: 0.35 })), null, g);
        const top = mesh(new THREE.CircleGeometry(0.125, 20), std(color, { roughness: 0.2 }), [0, 0.121, 0], g); top.rotation.x = -Math.PI / 2;
        const handle = mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 20, Math.PI), mat("bucket"), [0, 0.12, 0], g); handle.rotation.y = Math.PI / 2;
        break;
      }
      case "pillow": {
        const p = mesh(new THREE.SphereGeometry(0.2, 18, 12), mat("pillow", () => std("#f8f9fa", { roughness: 0.95 })), null, g); p.scale.set(1.3, 0.45, 0.95);
        break;
      }
      case "football": mesh(new THREE.SphereGeometry(0.11, 24, 16), mat("soccer", () => new THREE.MeshStandardMaterial({ map: S.tex.soccer(), roughness: 0.45 })), null, g); break;
      case "brick": mesh(new THREE.BoxGeometry(0.22, 0.075, 0.1), mat("brick", () => std("#a1443a", { roughness: 0.95 })), null, g); break;
      case "bowling": {
        mesh(new THREE.SphereGeometry(0.11, 24, 16), mat("bowl", () => std("#1d1d3a", { roughness: 0.15, metalness: 0.2 })), null, g);
        for (const [x, y] of [[-0.03, 0.08], [0.03, 0.08], [0, 0.04]]) mesh(new THREE.SphereGeometry(0.015, 8, 6), mat("hole", () => std("#000")), [x, y, 0.07], g);
        break;
      }
      case "dynamite": {
        const red = mat("dyn", () => std("#c92a2a", { roughness: 0.6 }));
        for (const [x, z] of [[-0.035, 0], [0.035, 0], [0, 0.05]]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), red, [x, 0, z], g);
        mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 14), mat("dyntape", () => std("#212529")), [0, 0, 0.017], g);
        const spark = mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd43b" }), [0, 0.15, 0], g);
        g.userData.spark = spark;
        break;
      }
      case "anvil": {
        const ir = mat("anvil", () => std("#3d4148", { metalness: 0.8, roughness: 0.4 }));
        mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), ir, [0, -0.12, 0], g);
        mesh(new THREE.BoxGeometry(0.16, 0.12, 0.13), ir, [0, -0.02, 0], g);
        mesh(new THREE.BoxGeometry(0.44, 0.1, 0.2), ir, [0.02, 0.09, 0], g);
        const horn = mesh(new THREE.ConeGeometry(0.08, 0.2, 12), ir, [-0.29, 0.09, 0], g); horn.rotation.z = Math.PI / 2;
        break;
      }
      case "torch": {
        mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.45, 10), mat("torchwood", () => std("#8b5e34", { roughness: 0.8 })), [0, -0.12, 0], g);
        mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), mat("rag", () => std("#3d2b1f", { roughness: 1 })), [0, 0.12, 0], g);
        const fl = mesh(new THREE.ConeGeometry(0.06, 0.18, 10), new THREE.MeshBasicMaterial({ color: "#ffb703", transparent: true, opacity: 0.9 }), [0, 0.25, 0], g);
        fl.castShadow = false;
        break;
      }
      case "bomb": {
        mesh(new THREE.SphereGeometry(0.12, 20, 14), mat("bomb", () => std("#f06595", { roughness: 0.3 })), null, g);
        mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10), mat("bombcap", () => std("#495057")), [0, 0.13, 0], g);
        const spark = mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd43b" }), [0, 0.19, 0], g);
        g.userData.spark = spark;
        break;
      }
    }
    return g;
  }

  /* =========================================================
     TOOLS CONTROLLER
     ========================================================= */
  class Tools {
    constructor(world, buddy) {
      this.world = world; this.buddy = buddy;
      this.anims = []; this.projs = [];
      this.spraying = false; this.aim = new V3(); this.sprayAcc = 0; this.sprayDrops = 0; this.sprayReactT = 0;
      this.ray = new THREE.Raycaster();
      this.multi = 1;
    }

    camBasis() {
      const c = this.world.camera;
      const fwd = new V3(); c.getWorldDirection(fwd);
      const right = new V3().crossVectors(fwd, new V3(0, 1, 0)).normalize();
      return { pos: c.position.clone(), fwd, right, up: new V3().crossVectors(right, fwd) };
    }

    /* ---------- melee ---------- */
    melee(tool, hit) {
      const B = this.camBasis();
      const H = hit.point.clone();
      let toward = H.clone().sub(B.pos).normalize();
      const flat = new V3(toward.x, toward.y * 0.25, toward.z).normalize();
      const back = flat.clone().negate();
      const skin = this.buddy.look.skin;
      let anim;
      if (tool.swing === "giant" && !hit.prop) {
        H.copy(this.buddy.headPos()).add(new V3(0, 0.3, 0));
      }
      if (["jab", "push", "kick"].includes(tool.swing)) {
        let start, dir;
        if (tool.swing === "kick") {
          start = H.clone().add(back.clone().multiplyScalar(1.0)).add(new V3(0, -0.75, 0)).addScaledVector(B.right, 0.15);
          dir = H.clone().sub(start).normalize();
        } else {
          start = H.clone().addScaledVector(back, 1.1).addScaledVector(B.right, tool.id === "glove" ? 0.18 : 0).add(new V3(0, tool.id === "glove" ? -0.05 : 0, 0));
          dir = H.clone().sub(start).normalize();
        }
        const holder = new THREE.Group();
        holder.add(buildInstrument(tool, 0, skin));
        holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new V3(0, 0, 0), dir.clone().negate(), new V3(0, 1, 0)));
        holder.position.copy(start);
        this.world.fxGroup.add(holder);
        anim = { kind: "jab", holder, start, contact: H.clone().addScaledVector(dir, -0.02), t: 0, tc: tool.tc, dur: tool.tc + 0.28, dir };
      } else {
        // arcs pivot around the "hand" (grip)
        let P, d;
        const L = tool.L || 0.75;
        const towardCam = back.clone();
        if (tool.swing === "slap" || tool.swing === "bat") {
          const s = Math.random() < 0.5 ? 1 : -1;
          P = H.clone().addScaledVector(B.right, s * L * 0.92).addScaledVector(towardCam, L * 0.35).add(new V3(0, 0.08, 0));
          d = B.right.clone().multiplyScalar(-s).addScaledVector(flat, 0.35).normalize();
        } else {
          P = H.clone().add(new V3(0, L * 0.88, 0)).addScaledVector(towardCam, L * 0.45).addScaledVector(B.right, L * 0.12);
          d = new V3(0, -1, 0).addScaledVector(flat, 0.45).normalize();
        }
        const realL = P.distanceTo(H);
        const r = H.clone().sub(P);
        const yAx = r.clone().negate().normalize();
        const zAx = d.clone().addScaledVector(yAx, -d.dot(yAx)).normalize();
        const xAx = new V3().crossVectors(yAx, zAx);
        const q0 = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
        const axis = new V3().crossVectors(r, d).normalize();
        const holder = new THREE.Group();
        const inst = buildInstrument(tool, realL, skin);
        inst.position.y = -realL;
        holder.add(inst);
        holder.position.copy(P);
        this.world.fxGroup.add(holder);
        anim = { kind: "arc", holder, q0, axis, a0: tool.swing === "giant" ? 1.9 : 1.6, t: 0, tc: tool.tc, dur: tool.tc + (tool.swing === "giant" ? 0.55 : 0.3), dir: d };
        if (tool.swing === "giant") S.audio.play("whoosh");
      }
      anim.tool = tool; anim.hit = hit; anim.point = H; anim.inst = anim.holder.children[0];
      this.anims.push(anim);
      this.stepAnim(anim, 0);
      if (tool.swing !== "giant" && Math.random() < 0.5) S.audio.play("whoosh");
    }

    stepAnim(a, dt) {
      a.t += dt;
      const t = a.t;
      if (a.kind === "jab") {
        if (t < a.tc) { const e = t / a.tc; a.holder.position.lerpVectors(a.start, a.contact, e * e); }
        else {
          const k = Math.min(1, (t - a.tc) / (a.dur - a.tc));
          a.holder.position.lerpVectors(a.contact, a.start, 1 - Math.pow(1 - k, 2));
          const sq = a.tool.id === "sponge" ? 1 - Math.sin(Math.min(1, k * 3) * Math.PI) * 0.45 : 1 - Math.sin(Math.min(1, k * 4) * Math.PI) * 0.15;
          a.inst.scale.set(1 + (1 - sq) * 0.5, 1 + (1 - sq) * 0.3, sq);
          if (k > 0.7) a.holder.scale.setScalar(Math.max(0.01, 1 - (k - 0.7) / 0.3));
        }
      } else {
        let th;
        if (t < a.tc) { const e = t / a.tc; th = -a.a0 * (1 - e * e); }
        else {
          const k = Math.min(1, (t - a.tc) / (a.dur - a.tc));
          th = -Math.sin(k * Math.PI * 0.5) * a.a0 * 0.45 + Math.sin(k * Math.PI * 3) * 0.06 * (1 - k);
          if (a.tool.swing === "giant") { const sq = 1 - Math.sin(Math.min(1, k * 2.5) * Math.PI) * 0.35; a.inst.scale.set(1 + (1 - sq), sq, 1 + (1 - sq) * 0.5); }
          if (k > 0.7) a.holder.scale.setScalar(Math.max(0.01, 1 - (k - 0.7) / 0.3));
        }
        a.holder.quaternion.copy(new Q().setFromAxisAngle(a.axis, th).multiply(a.q0));
      }
      if (!a.struck && t >= a.tc) { a.struck = true; this.strike(a.tool, a.hit, a.point, a.dir); }
      return t >= a.dur;
    }

    strike(tool, hit, point, dir) {
      const W = this.world, B = this.buddy;
      S.audio.play(tool.sound, tool.power);
      if (hit.prop) {
        const prop = hit.prop;
        if (prop.body.mass) {
          prop.body.wakeUp();
          prop.body.applyImpulse(new CANNON.Vec3(dir.x, dir.y + 0.3, dir.z).scale(tool.power * 0.5 * Math.min(2, prop.body.mass + 0.3)), new CANNON.Vec3(point.x, point.y, point.z));
        }
        if ((prop.breakable || prop.balloon) && tool.power >= 4) W.toBreak.push(prop);
        W.stars(point, 6);
        W.shake(tool.power * 0.3);
        S.bus.emit("propHit", { tool: tool.id });
        return;
      }
      const lift = tool.lift || 0;
      let fdir = dir.clone();
      if (tool.swing === "kick") fdir.y = Math.max(fdir.y, 0.35);
      if (tool.swing === "giant") {
        if (B.state === "stand") { B.action("pancake"); B.applyHit({ dir: new V3(0, -1, 0.2), power: 3, point, part: "head", tool: { react: ["ko", 1.6, "pancake"] } }); }
        else B.applyHit({ dir: fdir, power: tool.power + 3, point, part: hit.part, tool });
        W.slowmo(0.7); W.closeUp(1.4); W.shake(12);
        W.puff(new V3(B.com.x, 0.05, B.com.z), 18);
        W.stars(point, 16);
        S.bus.emit("hit", { tool: tool.id, part: "head", power: 12, flying: false });
        return;
      }
      const brutal = tool.set === "brutal";
      const limbHit = hit.part === "arm" || hit.part === "leg";
      const p = B.applyHit({ dir: fdir, power: tool.power, point, part: hit.part, tool: brutal ? { react: tool.id === "pan" ? ["dizzy", 2, "brutal"] : Math.random() < 0.5 ? ["ko", 1.2, "brutal"] : null } : tool, slap: tool.id === "slap" || tool.id === "pan", lift, dmg: tool.cut && limbHit ? tool.power * 2.6 : undefined, cut: !!tool.cut });
      if (tool.id === "pan" && hit.part === "head") B.dizzy = 2.5;
      if (brutal) this.gore(point, fdir, hit.part, hit.object, p);
      if (tool.cut && hit.object && hit.object !== B.faceMesh) {
        // a clean slash: long gash that keeps bleeding
        B.addDecal(hit.object, point, fdir.clone().negate(), "#ffffff", 0.3, S.gashTex);
        B.addBleed(hit.object, point, 2.5);
        W.splash(point, "#b3001b", 22, 3.2, 0.028);
      }
      if (tool.cut && hit.part === "head") B.face.injure(10);
      else if (tool.id === "sponge") {
        B.wash(point, 0.6);
        if (hit.part === "head") { B.face.clean(0.45); B.face.wet = Math.min(1, B.face.wet + 0.4); }
        W.splash(point, "#ffffff", 16, 2, 0.03);
        for (let i = 0; i < 8; i++) W.fx.drop.spawn({ pos: point.clone().add(new V3(R(-0.2, 0.2), R(-0.1, 0.2), R(-0.1, 0.1))), vel: new V3(R(-0.3, 0.3), R(0.2, 0.8), R(-0.3, 0.3)), size: R(0.03, 0.06), life: R(1, 2), color: "#e7f5ff", gravity: -0.15, drag: 1.5, floor: false });
      } else {
        W.stars(point, Math.round(4 + p));
        if (tool.swing === "kick" || p > 7) W.puff(point, 6);
      }
      W.shake(p * 0.55);
      if (p > 9 || (tool.swing === "kick" && B.state === "fly")) { W.slowmo(0.45); }
      S.bus.emit("hit", { tool: tool.id, part: hit.part, power: p, flying: B.state === "fly" });
    }

    /* ---------- throwing ---------- */
    throwAt(tool, target) {
      const n = this.multi;
      for (let i = 0; i < n; i++) {
        const B = this.camBasis();
        const start = B.pos.clone().addScaledVector(B.fwd, 0.7).addScaledVector(B.right, 0.28 + (i - (n - 1) / 2) * 0.35).addScaledVector(B.up, -0.32);
        const tg = target.clone().add(i ? new V3(R(-0.35, 0.35), R(-0.2, 0.3), 0) : new V3());
        // if the camera is outside the side/back walls, start the throw just inside them
        const A = S.ARENA;
        for (let k = 0; k < 20 && (Math.abs(start.x) > A.x - 0.25 || start.z < A.zBack + 0.25); k++) start.lerp(tg, 0.1);
        const dist = start.distanceTo(tg);
        const T = THREE.MathUtils.clamp(dist / 10, 0.22, 0.85);
        const g = -this.world.physics.gravity.y;
        const vel = tg.clone().sub(start).divideScalar(T).add(new V3(0, 0.5 * g * T, 0));
        this.spawn(tool, start, vel);
      }
      S.audio.play("whoosh");
    }

    spawn(tool, start, vel) {
      const def = PROJ[tool.proj];
      const color = tool.proj === "paint" ? pick(PAINTS) : def.color;
      const mesh = buildProjectile(tool.proj, color);
      mesh.position.copy(start);
      this.world.fxGroup.add(mesh);
      const shape = tool.proj === "pillow" ? new CANNON.Box(new CANNON.Vec3(0.24, 0.09, 0.17)) : tool.proj === "brick" ? new CANNON.Box(new CANNON.Vec3(0.11, 0.0375, 0.05)) : new CANNON.Sphere(def.r);
      const body = new CANNON.Body({
        mass: def.mass, shape, linearDamping: 0.01, angularDamping: 0.2,
        material: def.bounce ? this.world.mat.bouncy : this.world.mat.def,
        collisionFilterGroup: S.GROUP.PROJ, collisionFilterMask: S.GROUP.STATIC | S.GROUP.PROP | S.GROUP.PROJ
      });
      body.position.set(start.x, start.y, start.z);
      body.velocity.set(vel.x, vel.y, vel.z);
      if (tool.proj !== "pie" && tool.proj !== "anvil") body.angularVelocity.set(R(-8, 8), R(-8, 8), R(-8, 8));
      const pr = { tool, def, kind: tool.proj, color, mesh, body, prev: start.clone(), age: 0, dead: false, hits: 0 };
      body.addEventListener("collide", (e) => this.onWorldHit(pr, e));
      this.world.physics.addBody(body);
      this.projs.push(pr);
      return pr;
    }

    onWorldHit(pr, e) {
      if (pr.dead) return;
      const other = e.body;
      const prop = other.userData && other.userData.prop;
      const pos = new V3(pr.body.position.x, pr.body.position.y, pr.body.position.z);
      const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
      const d = pr.def;
      if (prop && (prop.balloon || (prop.breakable && impact > 6))) this.world.toBreak.push(prop);
      if (d.bomb) { pr.dead = true; this.explode(pos, d.brutal); return; }
      if (d.torch) { pr.dead = true; if (S.brutal) S.brutal.ignite(pos, 0.7); return; }
      if (d.bounce) {
        if (impact > 1.5) S.audio.play(pr.kind === "pillow" ? "soft" : pr.kind === "football" ? "bounce" : "thud", 4);
        if (d.anvil && impact > 4 && !pr.landed) { pr.landed = true; this.world.shake(8); this.world.puff(pos, 14); }
        return;
      }
      // splatters
      pr.dead = true;
      S.audio.play(d.sound);
      if (d.water) { this.world.splash(pos, "#74c0fc", 30, 3.5, 0.03); if (pos.y < 0.4) this.world.floorSplat(pos, "#a5d8ff", 0.8); return; }
      const col = d.splat === "cream" ? "#fff6e3" : d.splat === "egg" ? "#ffd43b" : pr.color;
      this.world.splash(pos, col, 16, 2.5);
      if (pos.y < 0.45) this.world.floorSplat(pos, col, d.size * 1.6);
    }

    explode(pos, brutal) {
      const W = this.world, B = this.buddy;
      S.audio.play("boom");
      if (brutal) {
        W.puff(pos, 10, "#6b6b6b"); W.puff(pos, 5, "#ff922b");
        for (let i = 0; i < 26; i++) W.fx.shard.spawn({ pos, vel: new V3(R(-5, 5), R(2, 7), R(-5, 5)), size: R(0.03, 0.08), life: R(2, 3.5), color: pick(["#495057", "#5c3d2e", "#212529"]), spin: 12 });
        W.floorSplat(new V3(pos.x, 0, pos.z), "#212529", 1.4);
      } else {
        W.confetti(pos, 160, 1.2);
        W.puff(pos, 18, "#c0b8d0");
      }
      W.stars(pos, 14);
      W.shake(14);
      W.slowmo(0.8);
      const toB = B.com.clone().sub(pos);
      const dist = toB.length();
      if (dist < 2.6) {
        const dir = toB.normalize().add(new V3(0, 0.8, 0)).normalize();
        B.applyHit({ dir, power: 5 + 9 * (1 - dist / 2.6), point: pos, part: "torso", tool: { react: ["ko", 1.6, "boom"] }, lift: 1 });
        if (dist < 2.1) { B.face.splat(0.5, 0.55, "soot", null, 0.8); B.dizzy = 3; }
        if (brutal) this.gore(B.com.clone().add(new V3(0, 0.3, 0)), dir, "torso", null, 12);
        S.bus.emit("hit", { tool: brutal ? "dynamite" : "confetti", part: "torso", power: 12, flying: B.state === "fly" });
      }
      if (brutal && S.brutal) {
        S.brutal.onExplosion(pos);
        for (let i = 0; i < 40; i++) S.brutal.flame.spawn({ pos: pos.clone(), vel: new V3(R(-3, 3), R(0.5, 5), R(-3, 3)), size: R(0.1, 0.24), life: R(0.4, 0.9), color: pick(["#ffd166", "#fb8500", "#ff5400"]), gravity: -1, drag: 2.2, floor: false });
      }
      for (const p of W.props) {
        if (!p.body.mass) continue;
        const dv = new V3(p.body.position.x - pos.x, p.body.position.y - pos.y, p.body.position.z - pos.z);
        const d = dv.length();
        if (d < 2.8) {
          dv.normalize().add(new V3(0, 0.6, 0)).multiplyScalar((1 - d / 2.8) * 7 * Math.min(3, p.body.mass + 0.3));
          p.body.wakeUp();
          p.body.applyImpulse(new CANNON.Vec3(dv.x, dv.y, dv.z), p.body.position);
          if ((p.breakable || p.balloon) && d < 1.6) W.toBreak.push(p);
        }
      }
      S.bus.emit("boom", { brutal: !!brutal });
    }

    onCharHit(pr, I) {
      const W = this.world, B = this.buddy, d = pr.def;
      const v = new V3(pr.body.velocity.x, pr.body.velocity.y, pr.body.velocity.z);
      const dir = v.clone().normalize();
      const point = I.point.clone();
      const n = I.face ? I.face.normal.clone().transformDirection(I.object.matrixWorld) : dir.clone().negate();
      const part = I.object.userData.part || "torso";
      const tool = pr.tool;
      if (d.bomb) { pr.dead = true; this.explode(point, d.brutal); return; }
      if (d.torch) {
        pr.dead = true;
        B.applyHit({ dir, power: d.power, point, part, tool: { id: "torch" } });
        if (S.brutal) S.brutal.ignite(point, 0.4);
        S.bus.emit("hit", { tool: "torch", part, power: 3, flying: B.state === "fly" });
        return;
      }
      if (d.anvil && B.state === "stand") { B.action("pancake"); this.world.slowmo(0.7); this.world.closeUp(1.3); this.world.shake(14); }
      const react = d.react || (d.line ? [d.water ? "sputter" : part === "head" ? "sputter" : "surprised", 1.4, d.line] : null);
      const p = B.applyHit({ dir, power: d.power, point, part, tool: { react: d.gore ? ["ko", 1.3, "brutal"] : react } });
      S.audio.play(d.sound, p);
      if (d.gore) this.gore(point, dir, part, I.object, p);
      const onFace = I.object === B.faceMesh && I.uv;
      if (d.water) {
        W.splash(point, "#74c0fc", 40, 4, 0.034);
        B.face.wet = 1; B.wash(point, 0.7); B.face.clean(0.25);
        W.floorSplat(new V3(B.com.x, 0, B.com.z + 0.2), "#a5d8ff", 1);
      } else if (d.splat) {
        const col = d.splat === "cream" ? "#fff6e3" : d.splat === "egg" ? "#ffe8a3" : pr.color;
        if (onFace) B.face.splat(I.uv.x, I.uv.y, d.splat, pr.color, d.faceSize || d.size * 1.4);
        else B.addDecal(I.object, point, n, col, d.size);
        if (d.splat === "paint") {
          for (let i = 0; i < 3; i++) {
            const hits = this.rayBody(point.clone().add(new V3(R(-0.3, 0.3), R(-0.4, 0.2), 0.6)), new V3(R(-0.2, 0.2), R(-0.2, 0.1), -1));
            if (hits) { if (hits.object === B.faceMesh && hits.uv) B.face.splat(hits.uv.x, hits.uv.y, "paint", pr.color, 0.6); else B.addDecal(hits.object, hits.point, hits.face.normal.clone().transformDirection(hits.object.matrixWorld), pr.color, 0.35); }
          }
          W.floorSplat(new V3(B.com.x + R(-0.3, 0.3), 0, B.com.z + R(-0.2, 0.4)), pr.color, 0.9);
        }
        if (d.splat === "egg") for (let i = 0; i < 8; i++) W.fx.shard.spawn({ pos: point, vel: new V3(R(-2, 2), R(0, 2.5), R(-2, 2)), size: R(0.015, 0.03), life: 2, color: "#fff4e0", spin: 10 });
        W.splash(point, col, 18, 2.5);
        S.bus.emit("splat", { type: d.splat, face: !!onFace });
      }
      if (d.bounce) {
        const vn = v.dot(n);
        const out = v.clone().addScaledVector(n, -2 * vn).multiplyScalar(d.bounce);
        pr.body.velocity.set(out.x, out.y, out.z);
        pr.body.position.set(point.x + n.x * (d.r + 0.03), point.y + n.y * (d.r + 0.03), point.z + n.z * (d.r + 0.03));
        if (pr.kind === "pillow") for (let i = 0; i < 14; i++) W.fx.feather.spawn({ pos: point, vel: new V3(R(-2, 2), R(0.5, 2.5), R(-2, 2)), size: 0.07, life: 3, gravity: 0.7, drag: 2.5, spin: 6 });
        else W.stars(point, 8);
        pr.hits++;
      } else pr.dead = true;
      S.bus.emit("hit", { tool: tool.id, part, power: p, flying: B.state === "fly" });
    }

    rayBody(origin, dir) {
      this.ray.set(origin, dir.normalize()); this.ray.far = 1.5;
      const r = this.ray.intersectObjects(this.buddy.hitMeshes, false);
      return r[0] || null;
    }

    /* ---------- water spray ---------- */
    startSpray(fluid) { this.fluid = fluid || "water"; this.spraying = true; S.audio.sprayStart(); }
    stopSpray() { this.spraying = false; S.audio.sprayStop(); }

    sprayStep(dt) {
      if (!this.spraying) return;
      const W = this.world, B = this.buddy;
      const cam = W.camera;
      const nozzle = new V3(0.32, -0.3, -0.7).applyMatrix4(cam.matrixWorld);
      this.sprayAcc += dt * 70;
      const aimDir = this.aim.clone().sub(nozzle).normalize();
      while (this.sprayAcc >= 1) {
        this.sprayAcc--;
        const dir = aimDir.clone().add(new V3(R(-0.03, 0.03), R(-0.02, 0.04), R(-0.03, 0.03))).normalize();
        const petrol = this.fluid === "petrol";
        W.fx.drop.spawn({
          pos: nozzle, vel: dir.multiplyScalar(petrol ? R(8, 9.5) : R(10, 12)), size: R(0.009, 0.016), life: 1.4, color: petrol ? "#d4a72c" : "#8fd0ff", gravity: 6, stretch: 0.8,
          hit: (p) => {
            const part = B.approxHit(p.pos);
            if (part) { if (petrol) { if (S.brutal) S.brutal.petrolHit(p.pos, part); } else this.dropHit(p.pos, p.vel, part); return true; }
            for (const t of W.targets) if (t.userData.alive && t.position.distanceTo(p.pos) < 0.32) { W.hitTarget(t); return true; }
            if (p.pos.y < 0.03) {
              if (petrol) { if (S.brutal) S.brutal.addFuel(p.pos); }
              else { if (Math.random() < 0.05) W.floorSplat(p.pos, "#a5d8ff", 0.35); if (S.brutal) S.brutal.douse(p.pos, 0.25); }
              return true;
            }
            return false;
          }
        });
      }
      this.sprayReactT -= dt;
      S.bus.emit(this.fluid === "petrol" ? "pour" : "spray", { dt });
    }

    dropHit(pos, vel, part) {
      const W = this.world, B = this.buddy;
      this.sprayDrops++;
      const dir = vel.clone().normalize();
      B.nudge(dir, 0.08, part);
      B.wash(pos, 0.35);
      if (S.brutal) S.brutal.douseBuddy(pos);
      if (part === "head") { B.face.clean(0.03); B.face.wet = Math.min(1, B.face.wet + 0.03); }
      if (Math.random() < 0.3) W.splash(pos, "#a5d8ff", 3, 1.5, 0.018);
      if (this.sprayReactT <= 0) {
        this.sprayReactT = 1.6;
        B.react("sputter", 1.2, Math.random() < 0.5 ? "water" : null);
      }
      if (this.sprayDrops % 12 === 0) S.bus.emit("hit", { tool: "water", part, power: 1, flying: B.state === "fly", quiet: true });
    }

    /* ---------- per frame ---------- */
    update(dt) {
      for (let i = this.anims.length - 1; i >= 0; i--) {
        const a = this.anims[i];
        if (this.stepAnim(a, dt)) { this.world.fxGroup.remove(a.holder); this.anims.splice(i, 1); }
      }
      this.sprayStep(dt);
    }

    postPhysics(dt) {
      const targets = this.world.targetMeshes();
      const list = this.buddy.hitMeshes.concat(targets);
      for (const pr of this.projs) {
        if (pr.dead) continue;
        pr.age += dt;
        const cur = new V3(pr.body.position.x, pr.body.position.y, pr.body.position.z);
        const seg = cur.clone().sub(pr.prev);
        const len = seg.length();
        if (len > 1e-4 && pr.hits < 3) {
          this.ray.set(pr.prev, seg.divideScalar(len));
          this.ray.far = len + pr.def.r;
          const hits = this.ray.intersectObjects(list, false);
          if (hits.length) {
            const I = hits[0];
            if (I.object.userData.target) {
              this.world.hitTarget(I.object.userData.target);
              if (!pr.def.bounce) { pr.dead = true; if (pr.def.bomb) this.explode(I.point); else this.world.splash(I.point, pr.def.water ? "#74c0fc" : pr.color || "#fff", 14, 2.5); S.audio.play(pr.def.sound || "pop"); }
            } else this.onCharHit(pr, I);
          }
        }
        pr.prev.copy(cur);
        pr.mesh.position.copy(cur);
        if (pr.kind === "pie") {
          const v = new V3(pr.body.velocity.x, pr.body.velocity.y, pr.body.velocity.z);
          if (v.lengthSq() > 1) pr.mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), v.normalize());
        } else pr.mesh.quaternion.copy(pr.body.quaternion);
        if (pr.kind === "torch" && S.brutal) for (let k = 0; k < 2; k++) S.brutal.flame.spawn({ pos: pr.mesh.localToWorld(new V3(0, 0.25, 0)), vel: new V3(R(-0.3, 0.3), R(0.5, 1.2), R(-0.3, 0.3)), size: R(0.04, 0.08), life: R(0.2, 0.4), color: pick(["#ffd166", "#fb8500"]), gravity: -1, floor: false });
        if (pr.kind === "bomb" || pr.kind === "dynamite") {
          const sp = pr.mesh.userData.spark;
          sp.scale.setScalar(0.7 + Math.random() * 0.8);
          if (pr.age > 2.5) { pr.dead = true; this.explode(cur, pr.def.brutal); }
        }
        if (pr.age > (pr.def.bounce ? 7 : 4)) pr.dead = true;
      }
      for (let i = this.projs.length - 1; i >= 0; i--) {
        const pr = this.projs[i];
        if (!pr.dead) continue;
        this.world.physics.removeBody(pr.body);
        this.world.fxGroup.remove(pr.mesh);
        this.projs.splice(i, 1);
      }
    }

    /* ---------- Brutal mode: cartoon blood & bruises ---------- */
    gore(point, dir, part, object, power) {
      const W = this.world, B = this.buddy;
      W.splash(point, pick(BLOOD), Math.round(8 + power * 2.2), 2 + power * 0.25, 0.028);
      if (object && object !== B.faceMesh && object.userData && object.userData.part) {
        B.addDecal(object, point, dir.clone().negate(), pick(BLOOD), 0.18 + power * 0.018);
        if (power >= 8) B.addDecal(object, point, dir.clone().negate(), "#ffffff", 0.14 + power * 0.008, S.gashTex);
      }
      if (part === "head") B.face.injure(power);
      if (power >= 7) W.bloodSpray(point, Math.round(power / 3), 2.6);
      if (power > 7 || Math.random() < 0.4) W.floorSplat(new V3(B.com.x + R(-0.45, 0.45), 0, B.com.z + R(-0.3, 0.45)), "#7a0010", 0.35 + power * 0.05);
      if (power > 9) { W.slowmo(0.45); W.shake(power * 0.6); }
    }

    drop(tool) {
      const h = this.buddy.headPos();
      this.spawn(tool, h.clone().add(new V3(R(-0.06, 0.06), 4.4, R(-0.06, 0.06))), new V3(0, -1, 0));
      S.audio.play("fall");
    }

    clear() {
      for (const pr of this.projs) { this.world.physics.removeBody(pr.body); this.world.fxGroup.remove(pr.mesh); }
      this.projs = [];
      for (const a of this.anims) this.world.fxGroup.remove(a.holder);
      this.anims = [];
    }
  }
  S.Tools = Tools;
})();
