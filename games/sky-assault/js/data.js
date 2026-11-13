/* ============ SKY ASSAULT — game data: aircraft, weapons, enemies, worlds, stages ============ */
(function () {
  "use strict";
  const S = (window.SKY = window.SKY || {});
  S.W = 540; S.H = 960;

  // small seeded RNG so every stage is the same each time you play it
  S.rng = function (seed) {
    let a = seed >>> 0;
    const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  };

  /* ---------- aircraft ---------- */
  S.PLANES = [
    { id: "falcon", name: "Falcon", role: "Balanced fighter", speed: 1, hp: 100, dmg: 1, cost: 0, perk: "Starts every mission with +1 Mega Bomb", look: { body: "#4dabf7", wing: "#1c7ed6", accent: "#e7f5ff", len: 74, span: 70, sweep: 16, engines: 1, canards: false } },
    { id: "swift", name: "Swift", role: "Fast interceptor", speed: 1.3, hp: 80, dmg: 0.95, cost: 1500, perk: "Special weapons recharge 25% faster", look: { body: "#ffd43b", wing: "#f59f00", accent: "#fff9db", len: 78, span: 56, sweep: 30, engines: 1, canards: true } },
    { id: "rhino", name: "Rhino", role: "Heavy attack aircraft", speed: 0.82, hp: 150, dmg: 1.25, cost: 4000, perk: "Armour plating: takes 20% less damage", look: { body: "#69db7c", wing: "#2f9e44", accent: "#ebfbee", len: 80, span: 86, sweep: 6, engines: 2, canards: false } },
    { id: "viper", name: "Viper", role: "Advanced missile fighter", speed: 1.05, hp: 95, dmg: 1, cost: 7000, perk: "Missiles fire twice as often", look: { body: "#ff6b6b", wing: "#c92a2a", accent: "#fff5f5", len: 76, span: 74, sweep: 24, engines: 2, canards: true } },
    { id: "phantom", name: "Phantom X", role: "Experimental aircraft", speed: 1.15, hp: 110, dmg: 1.15, cost: 12000, perk: "Bullets pierce one enemy · Laser lasts twice as long", look: { body: "#9775fa", wing: "#5f3dc4", accent: "#f3f0ff", len: 82, span: 78, sweep: 38, engines: 2, canards: false, forward: true } },
    { id: "aurora", name: "Aurora", role: "Special prototype", speed: 1.2, hp: 140, dmg: 1.35, cost: 0, blueprints: 6, perk: "Built-in star magnet · Hull slowly repairs itself", look: { body: "#f8f9fa", wing: "#ced4da", accent: "#ffd43b", len: 84, span: 82, sweep: 28, engines: 3, canards: true, gold: true } }
  ];
  S.planeById = (id) => S.PLANES.find((p) => p.id === id) || S.PLANES[0];

  /* ---------- weapons ---------- */
  S.PRIMARY = [
    { id: "mg", name: "Machine Guns", cost: 0, desc: "Fast streams of bullets. More streams with every power level." },
    { id: "double", name: "Double Cannons", cost: 800, desc: "Paired cannons that hit harder." },
    { id: "triple", name: "Triple Cannons", cost: 2000, desc: "Three cannons wide. Great against formations." },
    { id: "spread", name: "Spread Shot", cost: 3000, desc: "A wide fan of shots that covers the whole sky." },
    { id: "heavy", name: "Heavy Bullets", cost: 5000, desc: "Slow, huge shells that punch through enemies." },
    { id: "rapid", name: "Rapid-Fire Cannon", cost: 6500, desc: "A blistering stream of needle rounds." }
  ];
  S.SECONDARY = [
    { id: "homing", name: "Homing Missiles", cost: 0, desc: "Pairs of missiles that chase the nearest enemy." },
    { id: "multi", name: "Multi-Target Rockets", cost: 1800, desc: "A volley of rockets, each picking a different target." },
    { id: "side", name: "Side Missiles", cost: 2500, desc: "Launched from the wingtips, then straight ahead. Big damage." },
    { id: "explosive", name: "Explosive Missiles", cost: 4500, desc: "One heavy missile that blows up everything around it." },
    { id: "guided", name: "Guided Rockets", cost: 6000, desc: "Very fast rockets that lock on to targets ahead." }
  ];
  S.SPECIALS = [
    { id: "bomb", name: "Mega Bomb", icon: "💥", key: "1", unlock: 0, desc: "Destroys regular enemies and clears all bullets on screen." },
    { id: "shield", name: "Energy Shield", icon: "🛡️", key: "2", unlock: 0, cd: 22, desc: "Blocks every hit for a few seconds." },
    { id: "laser", name: "Laser Beam", icon: "🔆", key: "3", unlock: 3, cd: 28, desc: "A continuous beam that melts anything in front of you." },
    { id: "emp", name: "EMP Blast", icon: "⚡", key: "4", unlock: 6, cd: 26, desc: "Fries nearby bullets and stops enemy weapons for a while." },
    { id: "strike", name: "Airstrike", icon: "✈️", key: "5", unlock: 9, cd: 38, desc: "Calls in bombers that carpet-bomb the whole screen." }
  ];

  /* ---------- hangar upgrades ---------- */
  S.UPGRADES = [
    { id: "mainDmg", name: "Main weapon damage", icon: "🔫", max: 8, base: 120, fx: (l) => "+" + l * 15 + "% damage" },
    { id: "fireRate", name: "Firing speed", icon: "⏩", max: 6, base: 160, fx: (l) => "+" + l * 10 + "% fire rate" },
    { id: "power", name: "Projectile quantity", icon: "🎯", max: 4, base: 350, fx: (l) => "Starts at power " + (l + 1) },
    { id: "wing", name: "Wing guns", icon: "🪽", max: 6, base: 200, fx: (l) => (l ? "Level " + l + " wing guns" : "No wing guns yet") },
    { id: "missile", name: "Missile strength", icon: "🚀", max: 8, base: 180, fx: (l) => "+" + l * 18 + "% missile damage" },
    { id: "health", name: "Aircraft health", icon: "❤️", max: 8, base: 150, fx: (l) => "+" + l * 12 + "% hull" },
    { id: "specialDur", name: "Special duration", icon: "⏱️", max: 5, base: 260, fx: (l) => "+" + l * 15 + "% shield / laser / EMP time" },
    { id: "laserDmg", name: "Laser damage", icon: "🔆", max: 5, base: 300, fx: (l) => "+" + l * 25 + "% laser damage" },
    { id: "bombPower", name: "Mega bomb power", icon: "💥", max: 5, base: 260, fx: (l) => "+" + l * 25 + "% bomb damage" },
    { id: "magnet", name: "Star collection radius", icon: "🧲", max: 5, base: 120, fx: (l) => "+" + l * 30 + "% pickup range" },
    { id: "speed", name: "Movement speed", icon: "💨", max: 5, base: 180, fx: (l) => "+" + l * 6 + "% speed" }
  ];
  S.upCost = (u, level) => Math.round((u.base * Math.pow(1.62, level)) / 10) * 10;

  /* ---------- bonus cards & rare components ---------- */
  S.CARDS = [
    { id: "firepower", name: "Firepower", icon: "🔥", desc: "+20% weapon damage" },
    { id: "magnet", name: "Star Magnet", icon: "🧲", desc: "Stars fly to you from twice as far" },
    { id: "armor", name: "Reinforced Hull", icon: "🛡️", desc: "+30% aircraft health" },
    { id: "rescue", name: "Rescue Winch", icon: "🪝", desc: "Rescue people twice as fast" },
    { id: "recharge", name: "Quick Recharge", icon: "🔋", desc: "Specials recharge 30% faster" },
    { id: "bounty", name: "Bounty Hunter", icon: "💰", desc: "+30% stars from everything" },
    { id: "bombbay", name: "Bomb Bay", icon: "💣", desc: "+1 Mega Bomb every mission" },
    { id: "missiles", name: "Missile Expert", icon: "🚀", desc: "+40% missile damage" },
    { id: "lucky", name: "Lucky Charm", icon: "🍀", desc: "Enemies drop more pickups" }
  ];
  S.COMPONENTS = [
    { id: "slot1", name: "Card Rack", icon: "🗂️", desc: "+1 card slot" },
    { id: "engine", name: "Golden Engine", icon: "⚙️", desc: "+8% speed on every aircraft" },
    { id: "slot2", name: "Card Rack II", icon: "🗂️", desc: "+1 card slot" }
  ];
  // the hidden rare item on each of the 18 stages
  S.RARE = (() => {
    const cards = S.CARDS.map((c) => ({ type: "card", id: c.id }));
    const comps = S.COMPONENTS.map((c) => ({ type: "comp", id: c.id }));
    const out = [];
    let ci = 0, mi = 0;
    for (let i = 0; i < 18; i++) {
      if (i % 3 === 1) out.push({ type: "blueprint", id: "bp" + (i + 2) / 3 });
      else if ((i === 5 || i === 11 || i === 17) && mi < comps.length) out.push(comps[mi++]);
      else out.push(cards[ci++ % cards.length]);
    }
    return out;
  })();

  /* ---------- difficulty ---------- */
  S.DIFFS = [
    { id: "normal", name: "Normal", hp: 1, fire: 1, bspd: 1, dmg: 1, reward: 1, color: "#40c057" },
    { id: "hard", name: "Hard", hp: 1.5, fire: 1.3, bspd: 1.12, dmg: 1.35, reward: 1.6, color: "#fab005" },
    { id: "insane", name: "Insane", hp: 2.2, fire: 1.65, bspd: 1.24, dmg: 1.7, reward: 2.4, color: "#fd7e14" },
    { id: "nightmare", name: "Nightmare", hp: 3.2, fire: 2.1, bspd: 1.38, dmg: 2.2, reward: 3.5, color: "#e03131" }
  ];

  /* ---------- enemies ----------
     hp is in "bullets" (a level-1 machine-gun bullet does 1 damage) */
  S.ENEMIES = {
    fighter: { name: "Fighter", type: "air", hp: 5, r: 20, score: 100, stars: 2, fire: "aimed", rate: 2.4, speed: 190 },
    drone: { name: "Attack Drone", type: "air", hp: 2.5, r: 14, score: 60, stars: 1, fire: "down", rate: 3.2, speed: 270 },
    kamikaze: { name: "Kamikaze Drone", type: "air", hp: 3, r: 14, score: 90, stars: 2, kamikaze: true, speed: 240 },
    bomber: { name: "Heavy Bomber", type: "air", hp: 60, r: 46, score: 900, stars: 14, fire: "ring", rate: 2.6, speed: 46, big: true },
    gunship: { name: "Armoured Gunship", type: "air", hp: 42, r: 34, score: 700, stars: 10, fire: "spray", rate: 0.16, speed: 70, big: true },
    stealth: { name: "Stealth Jet", type: "air", hp: 10, r: 24, score: 260, stars: 4, fire: "aimed3", rate: 2.1, speed: 150, stealth: true },
    missileFighter: { name: "Missile Fighter", type: "air", hp: 14, r: 24, score: 300, stars: 5, fire: "missile", rate: 2.9, speed: 160 },
    tank: { name: "Anti-Air Tank", type: "ground", hp: 12, r: 20, score: 220, stars: 4, fire: "aimed", rate: 2.3, turret: true },
    launcher: { name: "Missile Launcher", type: "ground", hp: 18, r: 22, score: 300, stars: 5, fire: "missile", rate: 3.4 },
    turret: { name: "Machine-Gun Turret", type: "ground", hp: 16, r: 20, score: 240, stars: 4, fire: "burst", rate: 2.3, turret: true },
    bunker: { name: "Bunker", type: "ground", hp: 40, r: 28, score: 500, stars: 9, fire: "ring", rate: 3.4 },
    radar: { name: "Radar Station", type: "ground", hp: 24, r: 26, score: 600, stars: 14, fire: null },
    missileBase: { name: "Missile Base", type: "ground", hp: 70, r: 38, score: 900, stars: 14, fire: "missile2", rate: 3.2, big: true },
    defence: { name: "Defence Installation", type: "ground", hp: 100, r: 44, score: 1200, stars: 18, fire: "spiral", rate: 0.13, big: true, turret: true },
    battleship: { name: "Battleship", type: "naval", hp: 160, r: 56, score: 1600, stars: 24, fire: "aimed3", rate: 1.7, big: true, turret: true },
    carrier: { name: "Aircraft Carrier", type: "naval", hp: 200, r: 62, score: 2000, stars: 28, fire: "launch", rate: 3.5, big: true },
    missileBoat: { name: "Missile Boat", type: "naval", hp: 16, r: 20, score: 280, stars: 5, fire: "missile", rate: 3.1 },
    destroyer: { name: "Destroyer", type: "naval", hp: 70, r: 40, score: 900, stars: 12, fire: "burst", rate: 2, big: true, turret: true },
    sub: { name: "Submarine", type: "naval", hp: 26, r: 24, score: 500, stars: 9, fire: "missile2", rate: 3.6, sub: true },
    crate: { name: "Supply Crate", type: "ground", hp: 12, r: 22, score: 300, stars: 10, fire: null, crate: true }
  };

  /* ---------- worlds ---------- */
  S.WORLDS = [
    { id: "valley", name: "Green Valley", icon: "🌲", terrain: "valley", river: 70, scroll: 46,
      air: ["fighter", "drone", "kamikaze", "bomber"], ground: ["tank", "turret", "bunker", "radar", "launcher"], naval: ["missileBoat"], boss: "thunderhawk",
      music: { root: 57, scale: [0, 2, 4, 7, 9], bpm: 128 } },
    { id: "ocean", name: "Ocean Assault", icon: "🌊", terrain: "ocean", river: 0, scroll: 42,
      air: ["fighter", "drone", "gunship", "missileFighter", "kamikaze"], ground: [], naval: ["missileBoat", "destroyer", "battleship", "carrier", "sub"], boss: "leviathan",
      music: { root: 55, scale: [0, 3, 5, 7, 10], bpm: 132 } },
    { id: "desert", name: "Desert Storm", icon: "🏜️", terrain: "desert", river: 0, scroll: 50,
      air: ["fighter", "bomber", "gunship", "missileFighter", "drone"], ground: ["tank", "launcher", "missileBase", "bunker", "turret", "radar"], naval: [], boss: "citadel",
      music: { root: 52, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 136 } },
    { id: "frozen", name: "Frozen Front", icon: "❄️", terrain: "snow", river: 120, scroll: 44,
      air: ["stealth", "missileFighter", "fighter", "kamikaze"], ground: ["tank", "turret", "defence", "radar", "bunker"], naval: ["destroyer", "sub", "missileBoat"], boss: "frostwing",
      music: { root: 50, scale: [0, 2, 3, 7, 8], bpm: 124 } },
    { id: "industrial", name: "Industrial Warzone", icon: "🏭", terrain: "industrial", river: 60, scroll: 52,
      air: ["gunship", "bomber", "drone", "kamikaze", "missileFighter"], ground: ["defence", "missileBase", "turret", "tank", "bunker", "launcher"], naval: ["missileBoat"], boss: "colossus",
      music: { root: 53, scale: [0, 3, 5, 6, 7, 10], bpm: 140 } },
    { id: "space", name: "Space Warfare", icon: "🪐", terrain: "space", river: 0, scroll: 60,
      air: ["stealth", "drone", "missileFighter", "fighter", "kamikaze", "gunship"], ground: ["turret", "defence", "radar"], naval: [], boss: "starbreaker",
      music: { root: 48, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 146 } }
  ];

  /* ---------- bosses: a hull plus destructible parts ----------
     part types: turret (aimed fire), cannon (fans), missile (homing pods), laser (beams), engine (no weapon, big chunk of damage), hangar (launches drones) */
  S.BOSSES = {
    thunderhawk: { name: "Thunderhawk", title: "Giant Bomber", hp: 900, w: 420, h: 260, core: [0, -30, 46],
      parts: [{ t: "engine", x: -150, y: -10 }, { t: "engine", x: 150, y: -10 }, { t: "turret", x: -80, y: 30 }, { t: "turret", x: 80, y: 30 }, { t: "missile", x: -40, y: 70 }, { t: "missile", x: 40, y: 70 }, { t: "cannon", x: 0, y: 90 }] },
    leviathan: { name: "Leviathan", title: "Armoured Sea Fortress", hp: 1200, w: 300, h: 460, core: [0, -40, 52], naval: true,
      parts: [{ t: "turret", x: -70, y: 120 }, { t: "turret", x: 70, y: 120 }, { t: "cannon", x: 0, y: 170 }, { t: "missile", x: -80, y: -60 }, { t: "missile", x: 80, y: -60 }, { t: "laser", x: 0, y: 60 }, { t: "turret", x: -60, y: -140 }, { t: "turret", x: 60, y: -140 }] },
    citadel: { name: "Sand Citadel", title: "Flying Fortress", hp: 1500, w: 440, h: 340, core: [0, 0, 56],
      parts: [{ t: "engine", x: -170, y: -70 }, { t: "engine", x: 170, y: -70 }, { t: "cannon", x: -110, y: 60 }, { t: "cannon", x: 110, y: 60 }, { t: "laser", x: 0, y: 110 }, { t: "missile", x: -60, y: -100 }, { t: "missile", x: 60, y: -100 }, { t: "turret", x: -170, y: 60 }, { t: "turret", x: 170, y: 60 }] },
    frostwing: { name: "Frostwing", title: "Helicopter Carrier", hp: 1800, w: 400, h: 380, core: [0, 0, 56],
      parts: [{ t: "engine", x: -130, y: -120 }, { t: "engine", x: 130, y: -120 }, { t: "hangar", x: -110, y: 40 }, { t: "hangar", x: 110, y: 40 }, { t: "turret", x: -60, y: 140 }, { t: "turret", x: 60, y: 140 }, { t: "laser", x: 0, y: 150 }, { t: "missile", x: 0, y: -60 }] },
    colossus: { name: "Iron Colossus", title: "Mechanical War Machine", hp: 2200, w: 420, h: 400, core: [0, -20, 60],
      parts: [{ t: "cannon", x: -160, y: 40 }, { t: "cannon", x: 160, y: 40 }, { t: "laser", x: -80, y: 120 }, { t: "laser", x: 80, y: 120 }, { t: "missile", x: -120, y: -100 }, { t: "missile", x: 120, y: -100 }, { t: "turret", x: 0, y: 150 }, { t: "engine", x: 0, y: -150 }, { t: "turret", x: -180, y: -40 }, { t: "turret", x: 180, y: -40 }] },
    starbreaker: { name: "Starbreaker", title: "Giant Space Battleship", hp: 2800, w: 480, h: 420, core: [0, 0, 64],
      parts: [{ t: "engine", x: -150, y: -150 }, { t: "engine", x: 150, y: -150 }, { t: "laser", x: -180, y: 80 }, { t: "laser", x: 180, y: 80 }, { t: "laser", x: 0, y: 170 }, { t: "cannon", x: -100, y: 120 }, { t: "cannon", x: 100, y: 120 }, { t: "missile", x: -90, y: -60 }, { t: "missile", x: 90, y: -60 }, { t: "hangar", x: 0, y: -110 }, { t: "turret", x: -220, y: 0 }, { t: "turret", x: 220, y: 0 }] }
  };
  S.PART_HP = { engine: 0.16, turret: 0.07, cannon: 0.1, missile: 0.09, laser: 0.12, hangar: 0.11 };

  /* ---------- stage generator ---------- */
  S.STAGE_COUNT = 18;
  const FORMS = [
    { id: "line", from: 0 }, { id: "vee", from: 0 }, { id: "snake", from: 0 }, { id: "zigzag", from: 1 },
    { id: "circle", from: 1 }, { id: "dive", from: 2 }, { id: "surround", from: 2 }, { id: "behind", from: 4 }, { id: "cross", from: 5 }
  ];
  S.stageName = (i) => S.WORLDS[Math.floor(i / 3)].name + " " + (Math.floor(i / 3) + 1) + "-" + ((i % 3) + 1);
  S.makeStage = function (idx) {
    const world = S.WORLDS[Math.floor(idx / 3)], sub = idx % 3, r = S.rng(idx * 7919 + 13);
    const dur = 58 + sub * 9 + Math.floor(idx / 3) * 3;
    const events = [];
    const forms = FORMS.filter((f) => f.from <= idx).map((f) => f.id);
    const light = world.air.filter((k) => !S.ENEMIES[k].big);
    const heavy = world.air.filter((k) => S.ENEMIES[k].big);
    // early stages get gentler waves
    const ramp = Math.min(1, 0.55 + idx * 0.05);
    let t = 2.2;
    while (t < dur) {
      if (heavy.length && r() < 0.16 + idx * 0.006) events.push({ t, type: "heavy", kind: r.pick(heavy), x: r.range(120, 420) });
      else {
        const form = r.pick(forms);
        let kind = r.pick(light);
        if (form === "dive" && light.includes("kamikaze") && r() < 0.5) kind = "kamikaze";
        events.push({ t, type: "wave", form, kind, x: r.range(110, 430), side: r() < 0.5 ? -1 : 1 });
      }
      t += r.range(2.4, 4.2) / ramp;
    }
    // things on the ground and on the water
    t = 3.5;
    const gpool = world.ground, npool = world.naval;
    while (t < dur + 4) {
      const naval = npool.length && (!gpool.length || r() < 0.38);
      events.push({ t, type: naval ? "naval" : "ground", kind: r.pick(naval ? npool : gpool), x: r.range(70, 470), group: !naval && r() < 0.3 ? r.int(2, 3) : 1 });
      t += r.range(2.0, 3.6) / ramp;
    }
    // stranded people to rescue
    const rescues = idx === 0 ? 1 : 1 + (idx % 3) + (idx > 8 ? 1 : 0);
    for (let i = 0; i < rescues; i++) events.push({ t: dur * (0.18 + (0.7 * (i + 0.5)) / rescues), type: "rescue", x: r.range(90, 450) });
    events.push({ t: dur * 0.46, type: "rare", x: r.range(110, 430) });
    // pickup carriers
    for (let i = 0; i < 2 + sub; i++) events.push({ t: dur * (0.25 + i * 0.25), type: "carrier", x: r.range(100, 440) });
    events.sort((a, b) => a.t - b.t);
    return { idx, world, sub, name: S.stageName(idx), dur, events, rescues, boss: world.boss, bossScale: sub === 2 ? 1 : sub === 1 ? 0.62 : 0.42, bossParts: sub === 2 ? 99 : sub === 1 ? 6 : 4 };
  };
})();
