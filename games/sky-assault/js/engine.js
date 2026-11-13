/* ============ SKY ASSAULT — the game engine ============ */
(function () {
  "use strict";
  const S = window.SKY, W = S.W, H = S.H, ART = S.art, AU = S.audio;
  const TAU = Math.PI * 2;
  const R = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const E = (S.engine = { running: false, paused: false });
  let cv, ctx, scale = 1;
  let G = null;
  E.state = () => G;

  /* =========================================================
     SET-UP
     ========================================================= */
  E.init = function (canvas) {
    cv = canvas; ctx = cv.getContext("2d");
    E.resize();
    window.addEventListener("resize", E.resize);
    initInput();
    let last = performance.now();
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.034, (now - last) / 1000));
      last = now;
      E.frame(dt);
    };
    requestAnimationFrame(loop);
  };
  E.resize = function () {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    scale = cv.width / W;
  };
  E.frame = function (dt) {
    if (!G) { drawIdle(dt); return; }
    if (E.running && !E.paused) update(dt);
    render();
  };

  // stats for the chosen aircraft + upgrades + cards
  function buildPlayer(save, plane) {
    const up = save.upgrades, cards = new Set(save.equipped || []), comps = save.comps || {};
    const has = (c) => cards.has(c);
    const p = {
      plane, x: W / 2, y: H - 140, tx: W / 2, ty: H - 140, vx: 0, bank: 0, inv: 2,
      maxHp: plane.hp * (1 + 0.12 * up.health) * (has("armor") ? 1.3 : 1),
      speed: 430 * plane.speed * (1 + 0.06 * up.speed) * (comps.engine ? 1.08 : 1),
      dmg: plane.dmg * (1 + 0.15 * up.mainDmg) * (has("firepower") ? 1.2 : 1),
      rate: 1 + 0.1 * up.fireRate,
      power: 1 + up.power, boostT: 0,
      wing: up.wing, missileDmg: (1 + 0.18 * up.missile) * (has("missiles") ? 1.4 : 1) * plane.dmg, missileExtra: 0,
      specialDur: 1 + 0.15 * up.specialDur, laserDmg: 1 + 0.25 * up.laserDmg, bombPow: 1 + 0.25 * up.bombPower,
      magnet: 115 * (1 + 0.3 * up.magnet) * (has("magnet") ? 2 : 1) * (plane.id === "aurora" ? 1.5 : 1), magnetT: 0,
      recharge: (plane.id === "swift" ? 1.25 : 1) * (has("recharge") ? 1.3 : 1),
      armour: plane.id === "rhino" ? 0.8 : 1,
      pierce: plane.id === "phantom" ? 1 : 0,
      missileRate: plane.id === "viper" ? 2 : 1,
      regen: plane.id === "aurora" ? 0.6 : 0,
      rescueRate: has("rescue") ? 2 : 1, starMul: has("bounty") ? 1.3 : 1, luck: has("lucky") ? 2 : 1,
      primary: save.primary || "mg", secondary: save.secondary || "homing",
      fireT: 0, wingT: 0, missileT: 0.5,
      sprite: ART.player(plane, up)
    };
    p.hp = p.maxHp;
    p.bombs = 2 + (plane.id === "falcon" ? 1 : 0) + (has("bombbay") ? 1 : 0);
    return p;
  }

  E.start = function (stageIdx, diffIdx, save) {
    const stage = S.makeStage(stageIdx), diff = S.DIFFS[diffIdx];
    const plane = S.planeById(save.plane);
    G = {
      stage, diff, diffIdx, save, t: 0, ev: 0, scroll: 0, speed: stage.world.scroll,
      P: buildPlayer(save, plane),
      enemies: [], pb: [], pm: [], eb: [], pickups: [], fx: [], gfx: [], people: [], texts: [], beams: [], allies: [],
      boss: null, phase: "play", phaseT: 0,
      stats: { spawned: 0, killed: 0, stars: 0, rescued: 0, peopleTotal: 0, damage: 0, score: 0, rareGot: null, bossKilled: false, maxCombo: 0 },
      combo: { n: 0, t: 0 }, forms: {}, formId: 0,
      cds: { shield: 0, laser: 0, emp: 0, strike: 0 }, shieldT: 0, laserT: 0, empFx: null, bombFx: null,
      shake: 0, flash: 0, banner: { text: stage.name.toUpperCase(), sub: diff.name + " · " + S.BOSSES[stage.boss].name + " awaits", t: 3.2 },
      clouds: [], rareTaken: !!(save.rares && save.rares[stageIdx]),
      hpMul: diff.hp * (1 + stageIdx * 0.085), fireMul: diff.fire * (1 + Math.min(0.45, stageIdx * 0.025)),
      unlockedSpecials: S.SPECIALS.filter((s) => (save.cleared || 0) >= s.unlock).map((s) => s.id),
      escaped: 0
    };
    for (let i = 0; i < 5; i++) G.clouds.push(newCloud(R(-100, H)));
    E.running = true; E.paused = false;
    AU.startMusic(stage.world.music, false);
    if (S.ui && S.ui.onHud) S.ui.onHud(G);
  };
  E.stop = function () { E.running = false; G = null; AU.stopMusic(); };
  E.pause = function (on) { if (!G) return; E.paused = on; if (on) AU.stopMusic(); else AU.startMusic(G.stage.world.music, !!G.boss); };

  /* =========================================================
     INPUT
     ========================================================= */
  const keys = new Set();
  const ptr = { on: false, x: 0, y: 0, drag: false, lx: 0, ly: 0, kind: "mouse" };
  E.controlMode = "auto"; // auto: mouse follows, touch drags
  function toLogical(e) { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; }
  function initInput() {
    cv.addEventListener("pointerdown", (e) => {
      AU.unlock();
      if (!G || !E.running || E.paused) return;
      const [x, y] = toLogical(e);
      ptr.on = true; ptr.kind = e.pointerType; ptr.lx = x; ptr.ly = y; ptr.x = x; ptr.y = y;
      ptr.drag = e.pointerType !== "mouse" || E.controlMode === "drag";
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!G) return;
      const [x, y] = toLogical(e);
      if (ptr.drag && ptr.on) { G.P.tx += (x - ptr.lx) * 1.15; G.P.ty += (y - ptr.ly) * 1.15; }
      ptr.lx = x; ptr.ly = y; ptr.x = x; ptr.y = y;
      if (e.pointerType === "mouse" && E.controlMode !== "drag") { ptr.follow = true; ptr.kind = "mouse"; }
    });
    const up = () => { ptr.on = false; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", () => { ptr.follow = false; });
    window.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, select, textarea")) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) { keys.add(k); ptr.follow = false; e.preventDefault(); }
      if (!G || !E.running) return;
      if (k === " " || k === "1") { e.preventDefault(); E.special("bomb"); }
      else if (k === "2") E.special("shield"); else if (k === "3") E.special("laser"); else if (k === "4") E.special("emp"); else if (k === "5") E.special("strike");
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => { keys.clear(); if (G && E.running && !E.paused && S.ui) S.ui.pause(); });
  }

  /* =========================================================
     UPDATE
     ========================================================= */
  function update(dt) {
    G.t += dt; G.phaseT += dt;
    G.scroll += G.speed * dt;
    updatePlayer(dt);
    runEvents();
    updateEnemies(dt);
    if (G.boss) updateBoss(dt);
    updateBullets(dt);
    updatePickups(dt);
    updatePeople(dt);
    updateSpecials(dt);
    updateFx(dt);
    for (const c of G.clouds) { c.y += (G.speed * 2.2 + c.v) * dt; if (c.y > H + 120) Object.assign(c, newCloud(-160)); }
    if (G.combo.t > 0) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo.n = 0; }
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt * 3);
    G.flash = Math.max(0, G.flash - dt * 2.5);
    // stage flow
    if (G.phase === "play" && G.t > G.stage.dur && G.ev >= G.stage.events.length) {
      const air = G.enemies.filter((e) => e.def.type === "air").length;
      if (air === 0 || G.t > G.stage.dur + 7) { G.phase = "warning"; G.phaseT = 0; AU.play("warn"); G.banner = { text: "WARNING", sub: S.BOSSES[G.stage.boss].name + " · " + S.BOSSES[G.stage.boss].title, t: 2.8, warn: true }; AU.startMusic(G.stage.world.music, true); }
    }
    if (G.phase === "warning" && G.phaseT > 2.8) { spawnBoss(); G.phase = "boss"; }
    if (G.phase === "victory" && G.phaseT > 3.2) finish(true);
    if (G.phase === "dead" && G.phaseT > 2.2) finish(false);
    if (S.ui && S.ui.onHud) S.ui.onHud(G);
  }

  function updatePlayer(dt) {
    const P = G.P;
    if (G.phase === "dead") return;
    const sp = P.speed;
    // keyboard
    let kx = 0, ky = 0;
    if (keys.has("arrowleft") || keys.has("a")) kx--; if (keys.has("arrowright") || keys.has("d")) kx++;
    if (keys.has("arrowup") || keys.has("w")) ky--; if (keys.has("arrowdown") || keys.has("s")) ky++;
    if (kx || ky) { const l = Math.hypot(kx, ky); P.tx = P.x + (kx / l) * sp * 0.12; P.ty = P.y + (ky / l) * sp * 0.12; }
    else if (ptr.follow && !ptr.drag) { P.tx = ptr.x; P.ty = ptr.y - 10; }
    P.tx = clamp(P.tx, 26, W - 26); P.ty = clamp(P.ty, 90, H - 40);
    const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
    const max = sp * (ptr.drag ? 2.2 : 1) * dt;
    const ox = P.x;
    if (d <= max) { P.x = P.tx; P.y = P.ty; } else { P.x += (dx / d) * max; P.y += (dy / d) * max; }
    P.vx = (P.x - ox) / Math.max(dt, 1e-4);
    P.bank += (clamp(P.vx / sp, -1, 1) - P.bank) * Math.min(1, dt * 8);
    P.inv = Math.max(0, P.inv - dt);
    if (P.boostT > 0) P.boostT -= dt;
    if (P.magnetT > 0) P.magnetT -= dt;
    if (P.regen && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);
    if (G.phase === "victory") return;
    // weapons
    if (G.laserT <= 0) {
      P.fireT -= dt;
      while (P.fireT <= 0) { firePrimary(P); P.fireT += primaryInterval(P); }
    }
    if (P.wing > 0) { P.wingT -= dt; if (P.wingT <= 0) { P.wingT = 0.2 / P.rate; fireWing(P); } }
    P.missileT -= dt;
    if (P.missileT <= 0) { P.missileT = missileInterval(P); fireMissiles(P); }
    // engine trail
    if (Math.random() < 0.5) for (const ex of P.sprite.meta.engines) fxAdd({ type: "fire", x: P.x + ex * (1 - Math.abs(P.bank) * 0.25), y: P.y + P.sprite.meta.tail + 6, vx: R(-10, 10), vy: R(160, 240), life: 0.14, size: 5, grow: -10, color: G.save.upgrades.speed >= 3 ? "#74c0fc" : "#ffa94d" });
    if (P.hp < P.maxHp * 0.3 && Math.random() < 0.3) fxAdd({ type: "smoke", x: P.x + R(-8, 8), y: P.y + 10, vx: R(-10, 10), vy: 120, life: 0.8, size: 6, grow: 14, color: "#555" });
  }

  /* ---------- player weapons ---------- */
  const PRI = { mg: 0.085, double: 0.11, triple: 0.12, spread: 0.14, heavy: 0.22, rapid: 0.05 };
  const primaryInterval = (P) => PRI[P.primary] / P.rate;
  const pw = (P) => Math.min(7, P.power + (P.boostT > 0 ? 2 : 0));
  function pbullet(x, y, ang, speed, dmg, kind, opts) {
    G.pb.push(Object.assign({ x, y, vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed, dmg, kind, r: kind === "heavy" ? 9 : 5, pierce: G.P.pierce, hit: null }, opts || {}));
  }
  function firePrimary(P) {
    const n = pw(P), x = P.x, y = P.y - 30, d = P.dmg;
    switch (P.primary) {
      case "mg": for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2); pbullet(x + o * 9, y + Math.abs(o) * 4, o * 0.035, 1050, 1 * d, "mg"); } break;
      case "double": {
        const par = n >= 3 ? 4 : 2;
        for (let i = 0; i < par; i++) pbullet(x + (i - (par - 1) / 2) * 11, y, 0, 1000, 1.35 * d, "dbl");
        if (n === 2 || n >= 4) for (const s of [-1, 1]) pbullet(x + s * 18, y + 8, s * 0.12, 950, 1.1 * d, "dbl");
        if (n >= 5) for (const s of [-1, 1]) pbullet(x + s * 22, y + 10, s * 0.26, 900, 1.1 * d, "dbl");
        break;
      }
      case "triple": {
        for (let i = -1; i <= 1; i++) pbullet(x + i * 14, y, 0, 980, 1.25 * d, "tri");
        for (let k = 2; k <= n; k++) for (const s of [-1, 1]) pbullet(x + s * 16, y + 6, s * (k - 1) * 0.1, 930, 1.05 * d, "tri");
        break;
      }
      case "spread": { const m = 1 + 2 * Math.min(n, 5); for (let i = 0; i < m; i++) pbullet(x, y, (i - (m - 1) / 2) * 0.11, 900, 1.15 * d, "spr"); break; }
      case "heavy": {
        const m = Math.min(n, 3);
        for (let i = 0; i < m; i++) pbullet(x + (i - (m - 1) / 2) * 18, y, 0, 760, 4.2 * d, "heavy", { pierce: 2 + G.P.pierce });
        if (n >= 4) for (const s of [-1, 1]) pbullet(x + s * 20, y + 8, s * 0.16, 720, 3.4 * d, "heavy", { pierce: 1 + G.P.pierce });
        break;
      }
      case "rapid": { const m = Math.ceil(n / 1.5); for (let i = 0; i < m; i++) pbullet(x + (i - (m - 1) / 2) * 7 + R(-1.5, 1.5), y, R(-0.015, 0.015) + (i - (m - 1) / 2) * 0.02, 1250, 0.78 * d, "rapid"); break; }
    }
    AU.play("shoot");
  }
  function fireWing(P) {
    const m = P.sprite.meta, d = 0.7 * (1 + 0.22 * P.wing) * P.dmg, two = P.wing >= 4;
    for (const s of [-1, 1]) {
      pbullet(P.x + s * m.wingX * 0.9, P.y + m.wingY - 6, 0, 1000, d, "wing");
      if (two) pbullet(P.x + s * m.wingX * 0.6, P.y + m.wingY - 4, s * 0.06, 980, d, "wing");
    }
  }
  const MIS = { homing: 0.9, multi: 1.5, side: 0.75, explosive: 1.5, guided: 0.6 };
  const missileInterval = (P) => MIS[P.secondary] / P.missileRate;
  function pmissile(x, y, ang, speed, dmg, o) {
    G.pm.push(Object.assign({ x, y, ang, speed, dmg, turn: 4, t: 0, target: null, aoe: 0, homing: true }, o || {}));
  }
  function fireMissiles(P) {
    const d = P.missileDmg, ex = P.missileExtra;
    switch (P.secondary) {
      case "homing": for (const s of [-1, 1]) for (let i = 0; i <= ex; i++) pmissile(P.x + s * (16 + i * 8), P.y, s * 0.6, 420, 3 * d); break;
      case "multi": { const tg = nearestTargets(P.x, P.y, 4 + ex * 2); for (let i = 0; i < 4 + ex * 2; i++) pmissile(P.x + R(-14, 14), P.y, R(-0.9, 0.9), 380, 1.8 * d, { target: tg[i % Math.max(1, tg.length)] || null, turn: 5, small: true }); break; }
      case "side": for (const s of [-1, 1]) for (let i = 0; i <= ex; i++) pmissile(P.x + s * 26, P.y + 6 + i * 6, s * 1.4, 300, 5 * d, { homing: false, straighten: true }); break;
      case "explosive": pmissile(P.x, P.y - 10, 0, 360, 7 * d, { homing: false, aoe: 70 + ex * 20, big: true }); break;
      case "guided": for (let i = 0; i <= ex; i++) pmissile(P.x + (i % 2 ? 12 : -12), P.y, 0, 620, 2.6 * d, { cone: true, turn: 6 }); break;
    }
    AU.play("missile");
  }

  /* ---------- targets ---------- */
  function targets() {
    const out = [];
    for (const e of G.enemies) if (e.alive && hittable(e)) out.push(e);
    const B = G.boss;
    if (B && B.alive && !B.entering) { for (const p of B.parts) if (p.alive) out.push(p); out.push(B.coreT); }
    return out;
  }
  const hittable = (e) => !(e.def.sub && e.submerged) && !(e.def.stealth && e.alpha < 0.35) && e.y > -e.r && e.y < H + e.r;
  function nearestTargets(x, y, n) { return targets().filter((t) => t.y < y).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, n); }
  function hurt(t, dmg, x, y) {
    if (t.isPart) return hurtPart(t, dmg);
    if (t.isCore) return hurtCore(dmg);
    if (!t.alive) return;
    t.hp -= dmg; t.flash = 0.06;
    if (t.hp <= 0) kill(t);
  }

  /* =========================================================
     ENEMIES
     ========================================================= */
  function runEvents() {
    const evs = G.stage.events;
    while (G.ev < evs.length && evs[G.ev].t <= G.t) { spawnEvent(evs[G.ev]); G.ev++; }
  }
  function mkEnemy(kind, x, y, o) {
    const def = S.ENEMIES[kind];
    const spr = ART.enemy(kind);
    const e = Object.assign({ kind, def, x, y, hp: def.hp * G.hpMul, maxHp: def.hp * G.hpMul, r: def.r, alive: true, t: 0, flash: 0, ang: 0, aim: Math.PI / 2, alpha: 1, spr, empT: 0, fireT: R(0.5, 1.2) * (def.rate || 1), vx: 0, vy: 0 }, o || {});
    if (!e.noCount) G.stats.spawned++;
    G.enemies.push(e);
    return e;
  }
  function spawnEvent(ev) {
    const sp = S.ENEMIES[ev.kind] ? S.ENEMIES[ev.kind].speed || 150 : 150;
    if (ev.type === "wave") spawnFormation(ev, sp);
    else if (ev.type === "heavy") {
      const e = mkEnemy(ev.kind, ev.x, -60);
      if (ev.kind === "bomber") e.path = (t) => ({ x: ev.x + Math.sin(t * 0.6) * 40, y: -60 + t * sp });
      else { const hy = R(150, 240); e.path = (t) => ({ x: ev.x + Math.sin(t * 0.8) * 120, y: t < 2.2 ? -60 + (hy + 60) * (t / 2.2) : t < 11 ? hy + Math.sin(t * 1.3) * 18 : hy + (t - 11) * 120 }); }
    } else if (ev.type === "ground" || ev.type === "naval") spawnGround(ev);
    else if (ev.type === "rescue") {
      const gy = G.scroll + H + 30;
      let x = ev.x; for (let i = 0; i < 12 && ART.isWater(G.stage.world, x, gy); i++) x = R(80, 460);
      G.people.push({ x, gy, prog: 0, done: false, gone: false, wave: R(0, 6) });
      G.stats.peopleTotal++;
    } else if (ev.type === "rare") {
      const gy = G.scroll + H + 30;
      let x = ev.x; for (let i = 0; i < 12 && ART.isWater(G.stage.world, x, gy); i++) x = R(80, 460);
      const e = mkEnemy("crate", x, -30, { ground: true, gy, rare: !G.rareTaken, noCount: true });
      e.hp = e.maxHp = 12;
    } else if (ev.type === "carrier") {
      const e = mkEnemy("drone", ev.x, -40, { carrier: true, noCount: true });
      e.hp = e.maxHp = 6 * G.hpMul;
      e.path = (t) => ({ x: ev.x + Math.sin(t * 1.6) * 90, y: -40 + t * 110 });
    }
  }
  function spawnGround(ev) {
    const world = G.stage.world;
    const gy = G.scroll + H + 70;
    const naval = ev.type === "naval";
    for (let gi = 0; gi < (ev.group || 1); gi++) {
      let x = ev.x + gi * 60;
      const g2 = gy + gi * 50;
      if (naval) {
        if (world.terrain !== "ocean") x = ART.riverX(world, g2) + R(-world.river * 0.15, world.river * 0.15);
        else for (let i = 0; i < 12 && !ART.isWater(world, x, g2); i++) x = R(80, 460);
      } else {
        for (let i = 0; i < 16 && ART.isWater(world, x, g2); i++) x = R(60, 480);
        if (ART.isWater(world, x, g2)) continue;
      }
      x = clamp(x, 40, W - 40);
      const e = mkEnemy(ev.kind, x, H + G.scroll - g2, { ground: true, gy: g2, baseX: x, naval });
      if (ev.kind === "sub") { e.cycle = R(0, 3); e.submerged = true; }
    }
  }

  function spawnFormation(ev, sp) {
    const id = ++G.formId, form = ev.form, k = ev.kind;
    const counts = { line: 5, vee: G.stage.idx > 6 ? 7 : 5, snake: 6, zigzag: 5, circle: 6, dive: 4, surround: 6, behind: 4, cross: 6 };
    const n = counts[form] || 5;
    G.forms[id] = { n, killed: 0, gone: 0 };
    const side = ev.side, x0 = ev.x;
    for (let i = 0; i < n; i++) {
      let path, delay = 0;
      if (form === "line") { delay = i * 0.32; path = (t) => ({ x: x0, y: -40 + t * sp }); }
      else if (form === "vee") { const o = Math.ceil(i / 2) * (i % 2 ? -1 : 1); path = (t) => ({ x: clamp(x0, 130, W - 130) + o * 44, y: -40 - Math.abs(o) * 38 + t * sp * 0.85 }); }
      else if (form === "snake") { delay = i * 0.3; path = (t) => ({ x: clamp(x0, 150, W - 150) + Math.sin(t * 2.4) * 120, y: -40 + t * sp * 0.75 }); }
      else if (form === "zigzag") { delay = i * 0.34; path = (t) => { const ph = (t * 0.75) % 2; const tri = ph < 1 ? ph : 2 - ph; return { x: 90 + tri * (W - 180) * (side > 0 ? 1 : -1) + (side > 0 ? 0 : W - 180), y: -40 + t * sp * 0.6 }; }; }
      else if (form === "circle") {
        delay = i * 0.26;
        const cx = W / 2 + side * 60, cy = 300, rr = 130, v = sp * 1.1, T1 = (cy + 40) / v, w = v / rr;
        path = (t) => {
          if (t < T1) return { x: cx + side * rr, y: -40 + t * v };
          const a = (t - T1) * w;
          if (a < TAU * 1.05) return { x: cx + side * rr * Math.cos(a), y: cy - rr * Math.sin(a) };
          const ex = cx + side * rr * Math.cos(TAU * 1.05), ey = cy - rr * Math.sin(TAU * 1.05);
          return { x: ex, y: ey + (t - T1 - (TAU * 1.05) / w) * v };
        };
      } else if (form === "dive") {
        delay = i * 0.2;
        const ax = 90 + ((W - 180) * i) / Math.max(1, n - 1);
        let dx = null, dy = null;
        path = (t, e) => {
          if (t < 1.1) return { x: ax, y: -40 + (190 * t) / 1.1 };
          if (t < 1.7) return { x: ax + Math.sin(t * 12) * 3, y: 150 };
          if (dx === null) { const a = Math.atan2(G.P.y - 150, G.P.x - ax); dx = Math.cos(a); dy = Math.sin(a); e.diving = true; }
          const tt = t - 1.7; return { x: ax + dx * tt * sp * 1.7, y: 150 + dy * tt * sp * 1.7 };
        };
      } else if (form === "surround") {
        const s = i % 2 ? -1 : 1, row = Math.floor(i / 2);
        delay = row * 0.35;
        path = (t) => ({ x: s < 0 ? -40 + t * sp * 0.9 : W + 40 - t * sp * 0.9, y: 150 + row * 70 + Math.sin(t * 3) * 14 });
      } else if (form === "behind") {
        delay = 1 + i * 0.4;
        const sx = side < 0 ? -30 : W + 30;
        path = (t) => ({ x: sx - side * t * sp * 0.75, y: H + 30 - t * sp * 1.05 });
        if (i === 0) G.texts.push({ x: side < 0 ? 40 : W - 40, y: H - 80, text: "⚠", t: 1.2, size: 40, color: "#ff6b6b" });
      } else if (form === "cross") {
        const s = i % 2 ? -1 : 1;
        delay = Math.floor(i / 2) * 0.35;
        path = (t) => ({ x: s < 0 ? -30 + t * sp * 0.8 : W + 30 - t * sp * 0.8, y: -30 + t * sp * 0.75 });
      }
      const p0 = path(0, {});
      const e = mkEnemy(k, p0.x, p0.y, { path, delay, form: id, waiting: delay > 0 });
      if (form === "behind") e.fireT = 1.5;
    }
  }

  function updateEnemies(dt) {
    const P = G.P;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (e.waiting) { e.delay -= dt; if (e.delay > 0) continue; e.waiting = false; }
      e.t += dt; e.flash = Math.max(0, e.flash - dt); e.empT = Math.max(0, e.empT - dt);
      const px = e.x, py = e.y;
      if (e.path) { const p = e.path(e.t, e); e.x = p.x; e.y = p.y; }
      else if (e.ground) {
        e.y = H + G.scroll - e.gy;
        if (e.kind === "tank") e.x = e.baseX + Math.sin(e.t * 0.5) * 24;
        if (e.naval && G.stage.world.terrain === "ocean") e.x = e.baseX + Math.sin(e.t * 0.3) * 30;
        if (e.naval && Math.random() < 0.25) G.gfx.push({ type: "wake", x: e.x + R(-6, 6), gy: e.gy + e.spr.height * 0.42, t: 0, life: 2.2, r: R(4, 8) });
      } else if (e.kamikaze2) { e.x += e.vx * dt; e.y += e.vy * dt; }
      e.vx = (e.x - px) / Math.max(dt, 1e-4); e.vy = (e.y - py) / Math.max(dt, 1e-4);
      if (!e.ground && (Math.abs(e.vx) + Math.abs(e.vy) > 5)) e.ang = Math.atan2(e.vy, e.vx) - Math.PI / 2;
      // kamikaze drones home in on you
      if (e.def.kamikaze && e.t > 0.6) {
        if (!e.kamikaze2) { e.kamikaze2 = true; e.path = null; }
        const a = Math.atan2(P.y - e.y, P.x - e.x), cur = Math.atan2(e.vy || 1, e.vx || 0);
        let da = a - cur; da = Math.atan2(Math.sin(da), Math.cos(da));
        const na = cur + clamp(da, -2.2 * dt, 2.2 * dt), spd = e.def.speed * (1 + Math.min(1, e.t * 0.3));
        e.vx = Math.cos(na) * spd; e.vy = Math.sin(na) * spd;
        if (Math.random() < 0.5) fxAdd({ type: "fire", x: e.x - Math.cos(na) * 12, y: e.y - Math.sin(na) * 12, vx: 0, vy: 0, life: 0.2, size: 5, grow: -10, color: "#ff922b" });
      }
      if (e.def.stealth) e.alpha = 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(e.t * 1.4)), 2);
      if (e.def.sub) {
        e.cycle += dt;
        const c = e.cycle % 6;
        e.submerged = c < 3;
        e.alpha = c < 3 ? 0.3 : c < 3.6 ? 0.3 + (c - 3) * 1.15 : 1;
        if (c > 3 && c < 3.1 && !e.splashed) { e.splashed = true; splash(e.x, e.y, 16); } else if (c < 3) e.splashed = false;
      }
      // aiming turrets
      if (e.def.turret || e.spr.meta.turrets) { const want = Math.atan2(P.y - e.y, P.x - e.x); let da = want - e.aim; da = Math.atan2(Math.sin(da), Math.cos(da)); e.aim += clamp(da, -3 * dt, 3 * dt); }
      // damaged things smoke
      if (e.hp < e.maxHp * 0.45 && Math.random() < (e.def.big ? 0.4 : 0.15)) fxAdd({ type: "smoke", x: e.x + R(-e.r / 2, e.r / 2), y: e.y + R(-e.r / 2, e.r / 2), vx: R(-8, 8), vy: e.ground ? G.speed : R(-20, 10), life: 0.9, size: 5, grow: 18, color: "#444" });
      // firing
      if (e.def.fire && e.empT <= 0 && !(e.def.sub && e.submerged) && e.y > 20 && e.y < H * 0.82 && G.phase !== "dead" && G.phase !== "victory") {
        e.fireT -= dt;
        if (e.fireT <= 0) { e.fireT = (e.def.rate / G.fireMul) * R(0.85, 1.15); enemyFire(e); }
      }
      if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burst--; e.burstT = 0.09; shootAt(e.x, e.y, aimAt(e.x, e.y) + R(-0.05, 0.05), 250, "red"); } }
      // touching the player
      if (!e.ground && P.inv <= 0 && G.phase !== "dead" && Math.hypot(e.x - P.x, e.y - P.y) < e.r + 12) {
        damagePlayer(e.def.kamikaze ? 24 : 20);
        if (!e.def.big) kill(e, true);
      }
      // left the screen
      if (e.y > H + 90 || e.y < -260 || e.x < -150 || e.x > W + 150) {
        if (e.y > -260 && (e.t > 1 || e.ground)) escape(e);
      }
    }
    G.enemies = G.enemies.filter((e) => e.alive);
  }
  function escape(e) {
    e.alive = false;
    if (e.noCount) return;
    G.escaped++;
    G.combo.n = Math.max(0, G.combo.n - 3);
    if (e.form && G.forms[e.form]) G.forms[e.form].gone++;
  }

  /* ---------- enemy bullets ---------- */
  const aimAt = (x, y) => Math.atan2(G.P.y - y, G.P.x - x);
  function shootAt(x, y, ang, speed, kind, o) {
    if (G.phase === "dead") return;
    const s = speed * G.diff.bspd;
    G.eb.push(Object.assign({ x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, r: kind === "big" ? 9 : kind === "pink" ? 6 : 5, kind, dmg: (kind === "big" ? 16 : 10) * G.diff.dmg }, o || {}));
  }
  function enemyMissile(x, y, ang) {
    G.eb.push({ x, y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, r: 6, kind: "missile", missile: true, hp: 2 * Math.sqrt(G.hpMul), turn: 1.7, life: 6, dmg: 16 * G.diff.dmg });
  }
  function enemyFire(e) {
    const a = aimAt(e.x, e.y);
    const pat = e.def.fire;
    let sx = e.x, sy = e.y;
    if (e.spr.meta.turrets) { const tt = pick(e.spr.meta.turrets); sx = e.x + tt[0]; sy = e.y + tt[1]; }
    switch (pat) {
      case "aimed": shootAt(sx, sy, a, 230, "red"); break;
      case "aimed3": for (let k = -1; k <= 1; k++) shootAt(sx, sy, a + k * 0.17, 230, "red"); break;
      case "down": shootAt(sx, sy, Math.PI / 2 + R(-0.1, 0.1), 260, "red"); break;
      case "ring": { const n = 12 + Math.min(8, G.stage.idx); for (let i = 0; i < n; i++) shootAt(sx, sy, (i / n) * TAU + e.t, 150, "pink"); break; }
      case "spiral": { e.spin = (e.spin || 0) + 0.42; for (let k = 0; k < 2; k++) shootAt(sx, sy, e.spin + k * Math.PI, 160, "pink"); break; }
      case "burst": e.burst = 3; e.burstT = 0; break;
      case "spray": shootAt(sx, sy, Math.PI / 2 + R(-0.7, 0.7), R(190, 250), "red"); break;
      case "missile": enemyMissile(sx, sy, a); break;
      case "missile2": enemyMissile(e.x - 14, e.y, a - 0.5); enemyMissile(e.x + 14, e.y, a + 0.5); break;
      case "launch": for (const s of [-1, 1]) { const d = mkEnemy("drone", e.x + s * 20, e.y - 40, { noCount: false }); const ox = d.x; d.path = (t) => ({ x: ox + s * t * 60, y: e.y - 40 - Math.sin(Math.min(1, t) * 1.5) * 80 + t * 140 }); } break;
    }
    if (pat !== "launch") AU.play("eshot");
  }

  /* =========================================================
     BOSS
     ========================================================= */
  function spawnBoss() {
    const def = S.BOSSES[G.stage.boss], st = G.stage;
    const size = st.sub === 2 ? 1 : st.sub === 1 ? 0.82 : 0.72;
    const hpF = (st.sub === 2 ? 1 : st.sub === 1 ? 0.6 : 0.4) * G.hpMul;
    const spr = ART.boss(st.boss);
    const B = (G.boss = { def, spr, size, x: W / 2, y: -def.h * size * 0.6, ty: def.naval ? 300 : 250, t: 0, entering: true, alive: true, hp: def.hp * hpF, maxHp: def.hp * hpF, phase: 1, flash: 0, empT: 0, dying: 0 });
    const order = def.parts.map((p, i) => [p, i]).sort((a, b) => (a[0].t === "engine" ? 1 : 0) - (b[0].t === "engine" ? 1 : 0));
    B.parts = order.slice(0, st.bossParts).map(([p]) => ({ isPart: true, t: p.t, ox: p.x * size, oy: p.y * size, x: 0, y: 0, r: (p.t === "engine" ? 30 : 22) * size, hp: def.hp * S.PART_HP[p.t] * hpF * 1.6, maxHp: def.hp * S.PART_HP[p.t] * hpF * 1.6, alive: true, fireT: R(1, 2.5), aim: Math.PI / 2, flash: 0, spin: 0 }));
    B.coreT = { isCore: true, x: 0, y: 0, r: def.core[2] * size, alive: true };
    G.stats.spawned++;
  }
  function updateBoss(dt) {
    const B = G.boss, P = G.P;
    B.t += dt; B.flash = Math.max(0, B.flash - dt); B.empT = Math.max(0, B.empT - dt);
    if (B.dying > 0) {
      B.dying += dt;
      if (Math.random() < 0.5) boom(B.x + R(-B.def.w * 0.4, B.def.w * 0.4) * B.size, B.y + R(-B.def.h * 0.4, B.def.h * 0.4) * B.size, R(20, 50), "air");
      B.y += dt * 30; G.shake = Math.max(G.shake, 0.4);
      if (B.dying > 2.4 && B.alive) {
        B.alive = false;
        boom(B.x, B.y, 160, B.def.naval ? "water" : "air"); AU.play("huge"); G.flash = 1; G.shake = 1.2;
        dropStars(B.x, B.y, 60 + G.stage.idx * 6, 120);
        G.phase = "victory"; G.phaseT = 0; G.stats.bossKilled = true;
        G.banner = { text: "MISSION COMPLETE", sub: B.def.name + " destroyed!", t: 3 };
        AU.startMusic(G.stage.world.music, false);
      }
      return;
    }
    if (B.entering) { B.y += (B.ty - B.y) * Math.min(1, dt * 1.2); if (Math.abs(B.y - B.ty) < 4) B.entering = false; }
    else {
      const span = Math.max(30, (W - B.def.w * B.size) / 2 - 10 + 60);
      B.x = W / 2 + Math.sin(B.t * (B.def.naval ? 0.3 : 0.45)) * Math.min(130, span);
      B.y = B.ty + Math.sin(B.t * 0.8) * 18;
    }
    const ratio = B.hp / B.maxHp;
    B.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    const agg = [1, 1.35, 1.8][B.phase - 1] * G.fireMul;
    B.coreT.x = B.x + B.def.core[0] * B.size; B.coreT.y = B.y + B.def.core[1] * B.size;
    for (const p of B.parts) {
      p.x = B.x + p.ox; p.y = B.y + p.oy; p.flash = Math.max(0, p.flash - dt);
      if (!p.alive) { if (Math.random() < 0.15) fxAdd({ type: "smoke", x: p.x, y: p.y, vx: R(-10, 10), vy: R(-30, 0), life: 1, size: 8, grow: 20, color: "#333" }); continue; }
      const want = Math.atan2(P.y - p.y, P.x - p.x); let da = want - p.aim; da = Math.atan2(Math.sin(da), Math.cos(da)); p.aim += clamp(da, -2 * dt, 2 * dt);
      p.spin += dt * 6;
      if (B.entering || B.empT > 0 || G.phase !== "boss") continue;
      p.fireT -= dt * agg;
      if (p.fireT > 0) continue;
      switch (p.t) {
        case "turret": p.fireT = 1.5; { const n = B.phase === 1 ? 1 : 3; for (let k = 0; k < n; k++) shootAt(p.x, p.y, p.aim + (k - (n - 1) / 2) * 0.16, 240, "red"); } break;
        case "cannon": p.fireT = 2.4; { const n = B.phase === 3 ? 7 : 5; for (let k = 0; k < n; k++) shootAt(p.x, p.y, p.aim + (k - (n - 1) / 2) * 0.2, 200, "big"); } break;
        case "missile": p.fireT = 3.3; enemyMissile(p.x - 10, p.y, p.aim - 0.4); enemyMissile(p.x + 10, p.y, p.aim + 0.4); break;
        case "laser": p.fireT = 5.5; G.beams.push({ part: p, t: 0, warn: 0.9, dur: 1.3 + B.phase * 0.2, w: 26 * B.size + 6 }); break;
        case "hangar": p.fireT = 5; for (const s of [-1, 1]) { const kd = B.phase === 3 ? "kamikaze" : "drone"; const d = mkEnemy(kd, p.x + s * 16, p.y, { noCount: true }); const ox = d.x, oy = d.y; if (kd === "drone") d.path = (t) => ({ x: ox + s * t * 90, y: oy + t * 170 }); } break;
        case "engine": p.fireT = 99; break;
      }
      AU.play("eshot");
    }
    // the core itself joins in as it gets angrier
    if (!B.entering && B.empT <= 0 && G.phase === "boss") {
      B.coreFire = (B.coreFire || 0) - dt;
      if (B.phase >= 2 && B.coreFire <= 0) {
        if (ratio < 0.15) { B.coreFire = 2.2 / agg * 1.4; const n = 24; for (let i = 0; i < n; i++) shootAt(B.coreT.x, B.coreT.y, (i / n) * TAU + B.t, 170, "pink"); for (let k = -2; k <= 2; k++) shootAt(B.coreT.x, B.coreT.y, aimAt(B.coreT.x, B.coreT.y) + k * 0.12, 260, "big"); }
        else if (B.phase === 2) { B.coreFire = 3.2 / agg * 1.3; const n = 14; for (let i = 0; i < n; i++) shootAt(B.coreT.x, B.coreT.y, (i / n) * TAU + B.t * 0.5, 150, "pink"); }
        else { B.coreFire = 0.12; B.spin = (B.spin || 0) + 0.33; for (let k = 0; k < 3; k++) shootAt(B.coreT.x, B.coreT.y, B.spin + (k * TAU) / 3, 160, "pink"); }
      }
    }
    // ramming the boss hurts
    if (P.inv <= 0 && Math.abs(P.x - B.x) < B.def.w * B.size * 0.38 && Math.abs(P.y - B.y) < B.def.h * B.size * 0.38) { damagePlayer(22); P.ty += 120; }
  }
  function hurtPart(p, dmg) {
    if (!p.alive) return;
    p.hp -= dmg; p.flash = 0.06;
    if (p.hp <= 0) {
      p.alive = false;
      boom(p.x, p.y, 46, "air"); AU.play("big"); G.shake = Math.max(G.shake, 0.6);
      hurtCore(G.boss.maxHp * (p.t === "engine" ? 0.12 : 0.05), true);
      addScore(1500, p.x, p.y);
      dropStars(p.x, p.y, 8, 40);
      G.texts.push({ x: p.x, y: p.y - 20, text: (p.t === "engine" ? "ENGINE" : p.t.toUpperCase()) + " DESTROYED", t: 1.2, size: 18, color: "#ffd43b" });
      G.beams = G.beams.filter((b) => b.part !== p);
    }
  }
  function hurtCore(dmg, direct) {
    const B = G.boss;
    if (!B || !B.alive || B.dying || B.entering) return;
    const down = B.parts.filter((p) => !p.alive).length / Math.max(1, B.parts.length);
    B.hp -= direct ? dmg : dmg * (0.45 + 0.55 * down);
    B.flash = 0.05;
    if (B.hp <= 0) { B.hp = 0; B.dying = 0.01; G.eb.length = 0; G.beams.length = 0; addScore(10000, B.x, B.y); G.stats.killed++; comboHit(); for (const p of B.parts) p.alive = false; }
  }

  /* =========================================================
     BULLETS & COLLISIONS
     ========================================================= */
  function updateBullets(dt) {
    const tg = targets(), P = G.P;
    // player bullets
    for (const b of G.pb) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -30 || b.x < -30 || b.x > W + 30) { b.dead = true; continue; }
      for (const t of tg) {
        if (b.hit && b.hit.has(t)) continue;
        if (Math.abs(t.x - b.x) > t.r + b.r || Math.abs(t.y - b.y) > t.r + b.r) continue;
        if ((t.x - b.x) ** 2 + (t.y - b.y) ** 2 > (t.r + b.r) ** 2) continue;
        hurt(t, b.dmg, b.x, b.y);
        fxAdd({ type: "spark", x: b.x, y: b.y - 4, vx: R(-60, 60), vy: R(-80, 20), life: 0.12, size: 2, color: "#fff3bf" });
        AU.play("hit");
        if (b.pierce > 0) { b.pierce--; (b.hit = b.hit || new Set()).add(t); continue; }
        b.dead = true; break;
      }
      // shooting down missiles
      if (!b.dead) for (const m of G.eb) if (m.missile && !m.dead && Math.abs(m.x - b.x) < 10 && Math.abs(m.y - b.y) < 14) { m.hp -= b.dmg; b.dead = true; if (m.hp <= 0) { m.dead = true; boom(m.x, m.y, 10, "air"); addScore(50, m.x, m.y); } break; }
    }
    G.pb = G.pb.filter((b) => !b.dead);
    // player missiles
    for (const m of G.pm) {
      m.t += dt;
      if (m.straighten) { m.ang += (0 - m.ang) * Math.min(1, dt * 5); m.speed = Math.min(900, m.speed + dt * 900); }
      else if (m.homing || m.cone) {
        if (!m.target || (m.target.alive === false) || (m.target.isPart && !m.target.alive)) {
          let best = null, bd = 1e9;
          for (const t of tg) { if (t.y > m.y + 20) continue; if (m.cone && Math.abs(t.x - m.x) > (m.y - t.y) * 0.6 + 40) continue; const d = Math.hypot(t.x - m.x, t.y - m.y); if (d < bd) { bd = d; best = t; } }
          m.target = best;
        }
        if (m.target && m.t > 0.12) { const want = Math.atan2(m.target.x - m.x, -(m.target.y - m.y)); let da = want - m.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); m.ang += clamp(da, -m.turn * dt, m.turn * dt); }
        else if (!m.target) m.ang += (0 - m.ang) * Math.min(1, dt * 2);
        m.speed = Math.min(m.cone ? 900 : 640, m.speed + dt * 500);
      } else m.speed = Math.min(700, m.speed + dt * 300);
      m.x += Math.sin(m.ang) * m.speed * dt; m.y -= Math.cos(m.ang) * m.speed * dt;
      if (Math.random() < 0.7) fxAdd({ type: "smoke", x: m.x - Math.sin(m.ang) * 8, y: m.y + Math.cos(m.ang) * 8, vx: 0, vy: 0, life: 0.4, size: m.big ? 5 : 3, grow: 10, color: "#ccc", alpha: 0.5 });
      if (m.y < -40 || m.x < -40 || m.x > W + 40 || m.y > H + 40 || m.t > 4) { m.dead = true; continue; }
      for (const t of tg) {
        if ((t.x - m.x) ** 2 + (t.y - m.y) ** 2 > (t.r + 6) ** 2) continue;
        if (m.aoe) { boom(m.x, m.y, m.aoe * 0.6, "air"); for (const u of tg) if (Math.hypot(u.x - m.x, u.y - m.y) < m.aoe + u.r) hurt(u, m.dmg * (u === t ? 1 : 0.6), m.x, m.y); }
        else { hurt(t, m.dmg, m.x, m.y); boom(m.x, m.y, 8, "air", true); }
        m.dead = true; break;
      }
    }
    G.pm = G.pm.filter((m) => !m.dead);
    // enemy bullets
    for (const b of G.eb) {
      if (b.missile) {
        b.life -= dt;
        const want = Math.atan2(P.y - b.y, P.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let da = want - cur; da = Math.atan2(Math.sin(da), Math.cos(da));
        const na = cur + clamp(da, -b.turn * dt, b.turn * dt), sp = Math.min(300, Math.hypot(b.vx, b.vy) + dt * 60) * (b.life > 0 ? 1 : 1);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        if (b.life <= 0) b.turn = 0;
        if (Math.random() < 0.6) fxAdd({ type: "smoke", x: b.x - b.vx * 0.03, y: b.y - b.vy * 0.03, vx: 0, vy: 0, life: 0.5, size: 3, grow: 9, color: "#aaa", alpha: 0.5 });
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -40 || b.x > W + 40 || b.y < -60 || b.y > H + 40) { b.dead = true; continue; }
      if (G.phase !== "dead" && Math.abs(b.x - P.x) < b.r + 14 && Math.abs(b.y - P.y) < b.r + 14) {
        if (G.shieldT > 0 && Math.hypot(b.x - P.x, b.y - P.y) < 52) { b.dead = true; fxAdd({ type: "spark", x: b.x, y: b.y, vx: R(-80, 80), vy: R(-80, 80), life: 0.2, size: 3, color: "#74c0fc" }); continue; }
        if (Math.hypot(b.x - P.x, b.y - P.y) < b.r + 7) { b.dead = true; if (P.inv <= 0) damagePlayer(b.dmg); if (b.missile) boom(b.x, b.y, 14, "air"); }
      }
    }
    G.eb = G.eb.filter((b) => !b.dead);
    // boss lasers
    for (const bm of G.beams) {
      bm.t += dt;
      bm.x = bm.part.x;
      if (bm.t > bm.warn && bm.t < bm.warn + bm.dur && P.inv <= 0 && G.shieldT <= 0 && Math.abs(P.x - bm.x) < bm.w / 2 + 8 && P.y > bm.part.y) damagePlayer(30 * G.diff.dmg * dt * 2.2, true);
      if (bm.t > bm.warn && bm.t < bm.warn + 0.05) AU.play("laser");
    }
    G.beams = G.beams.filter((b) => b.t < b.warn + b.dur && b.part.alive);
  }

  function damagePlayer(dmg, continuous) {
    const P = G.P;
    if (G.shieldT > 0 || G.phase === "dead" || G.phase === "victory") return;
    if (!continuous && P.inv > 0) return;
    dmg *= P.armour;
    P.hp -= dmg; G.stats.damage += dmg;
    G.combo.n = 0;
    if (!continuous) { P.inv = 0.9; AU.play("hurt"); G.shake = Math.max(G.shake, 0.5); G.flash = Math.max(G.flash, 0.25); fxAdd({ type: "spark", x: P.x, y: P.y, vx: 0, vy: 0, life: 0.2, size: 14, color: "#ff6b6b" }); }
    if (P.hp <= 0) {
      P.hp = 0; G.phase = "dead"; G.phaseT = 0;
      boom(P.x, P.y, 70, "air"); AU.play("big"); G.shake = 1;
      G.banner = { text: "AIRCRAFT DOWN", sub: "Repair, upgrade and try again!", t: 2.5, warn: true };
    }
  }

  /* =========================================================
     KILLS, SCORE, PICKUPS
     ========================================================= */
  const comboMult = (n) => (n >= 50 ? 16 : n >= 30 ? 8 : n >= 15 ? 4 : n >= 5 ? 2 : 1);
  E.comboMult = comboMult;
  function comboHit() { G.combo.n++; G.combo.t = 2.8; G.stats.maxCombo = Math.max(G.stats.maxCombo, G.combo.n); }
  function addScore(v, x, y) { const s = Math.round(v * comboMult(G.combo.n) * G.diff.reward); G.stats.score += s; }
  function kill(e, crash) {
    if (!e.alive) return;
    e.alive = false;
    if (!e.noCount) G.stats.killed++;
    comboHit();
    addScore(e.def.score, e.x, e.y);
    const big = e.def.big;
    boom(e.x, e.y, big ? 70 : e.r * 1.6, e.naval ? "water" : e.ground ? "ground" : "air");
    AU.play(big ? "big" : "small");
    if (big) G.shake = Math.max(G.shake, 0.45);
    if (e.def.crate) {
      if (e.rare && !G.rareTaken) G.pickups.push(mkPickup("rare", e.x, e.y));
      dropStars(e.x, e.y, 12, 50);
    } else dropStars(e.x, e.y, e.def.stars, e.r);
    if (e.carrier) G.pickups.push(mkPickup(pick(["boost", "boost", "missile", "repair", "bomb", "magnet", "shield"]), e.x, e.y));
    else if (Math.random() < (big ? 0.35 : 0.035) * G.P.luck) G.pickups.push(mkPickup(pick(["repair", "boost", "shield", "bomb", "missile", "magnet"]), e.x, e.y));
    if (e.form && G.forms[e.form]) {
      const f = G.forms[e.form]; f.killed++;
      if (f.killed === f.n) { addScore(500 * f.n, e.x, e.y); G.texts.push({ x: e.x, y: e.y, text: "FORMATION BONUS", t: 1.2, size: 18, color: "#ffd43b" }); dropStars(e.x, e.y, 8, 30); AU.play("power"); }
    }
  }
  const PK = { star: ["⭐", "#fcc419"], repair: ["🔧", "#40c057"], boost: ["🔥", "#fd7e14"], shield: ["🛡️", "#4dabf7"], bomb: ["💣", "#e03131"], missile: ["🚀", "#be4bdb"], magnet: ["🧲", "#f06595"], rare: ["🎁", "#fcc419"] };
  function mkPickup(type, x, y, val) { return { type, x, y, vx: R(-60, 60), vy: R(-80, 20), val: val || 1, t: 0 }; }
  function dropStars(x, y, n, spread) {
    n = Math.round(n * G.P.starMul * G.diff.reward);
    while (n > 0) { const v = n >= 10 ? 5 : 1; n -= v; const p = mkPickup("star", x + R(-spread, spread) * 0.5, y + R(-spread, spread) * 0.5, v); p.vx = R(-120, 120); p.vy = R(-140, 40); G.pickups.push(p); }
  }
  function updatePickups(dt) {
    const P = G.P, mag = P.magnet * (P.magnetT > 0 ? 3.5 : 1);
    for (const p of G.pickups) {
      p.t += dt;
      const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy);
      const pulled = (p.type === "star" && d < mag) || (p.type !== "star" && d < mag * 0.6) || G.phase === "victory";
      if (pulled && G.phase !== "dead") { const s = 700 + (G.phase === "victory" ? 600 : 0); p.vx += (dx / d) * s * dt * 3; p.vy += (dy / d) * s * dt * 3; const v = Math.hypot(p.vx, p.vy); if (v > s) { p.vx *= s / v; p.vy *= s / v; } }
      else { p.vx *= Math.exp(-2 * dt); p.vy += (70 - p.vy) * Math.min(1, dt * 1.5); if (p.type === "star" && p.t > 0.6 && d < 320) p.vx += (dx / d) * 160 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (d < 26 && G.phase !== "dead") { collect(p); p.dead = true; }
      if (p.y > H + 40) p.dead = true;
    }
    G.pickups = G.pickups.filter((p) => !p.dead);
  }
  function collect(p) {
    const P = G.P;
    switch (p.type) {
      case "star": G.stats.stars += p.val; AU.play("star"); return;
      case "repair": P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.35); break;
      case "boost": P.boostT = 12; break;
      case "shield": G.shieldT = Math.max(G.shieldT, 5 * P.specialDur); AU.play("shield"); break;
      case "bomb": P.bombs = Math.min(9, P.bombs + 1); break;
      case "missile": P.missileExtra = Math.min(3, P.missileExtra + 1); break;
      case "magnet": P.magnetT = 12; break;
      case "rare": G.stats.rareGot = S.RARE[G.stage.idx]; G.rareTaken = true; G.texts.push({ x: p.x, y: p.y - 20, text: "RARE ITEM FOUND!", t: 1.6, size: 22, color: "#ffd43b" }); AU.play("medal"); return;
    }
    const names = { repair: "REPAIR", boost: "WEAPON BOOST", shield: "SHIELD", bomb: "+1 MEGA BOMB", missile: "MISSILES UP", magnet: "STAR MAGNET" };
    G.texts.push({ x: p.x, y: p.y - 18, text: names[p.type], t: 1, size: 16, color: "#fff" });
    AU.play("power");
  }

  /* ---------- people waiting for rescue ---------- */
  function updatePeople(dt) {
    const P = G.P;
    for (const h of G.people) {
      if (h.done || h.gone) continue;
      h.y = H + G.scroll - h.gy; h.wave += dt * 6;
      const near = Math.hypot(P.x - h.x, P.y - h.y) < 74 && G.phase !== "dead";
      h.prog = near ? h.prog + (dt / 1.6) * P.rescueRate : Math.max(0, h.prog - dt * 0.4);
      if (near && Math.random() < 0.3) fxAdd({ type: "spark", x: h.x + R(-10, 10), y: h.y, vx: 0, vy: -90, life: 0.4, size: 2, color: "#69db7c" });
      if (h.prog >= 1) {
        h.done = true; G.stats.rescued++; AU.play("rescue");
        addScore(2000, h.x, h.y); dropStars(h.x, h.y, 20, 20);
        G.texts.push({ x: h.x, y: h.y - 30, text: "RESCUED!", t: 1.4, size: 20, color: "#69db7c" });
        for (let i = 0; i < 20; i++) fxAdd({ type: "spark", x: h.x, y: h.y, vx: R(-40, 40), vy: R(-260, -80), life: 0.6, size: 3, color: "#b2f2bb" });
      }
      if (h.y > H + 40) h.gone = true;
    }
  }

  /* =========================================================
     SPECIAL WEAPONS
     ========================================================= */
  E.specialState = (id) => {
    if (!G) return { ready: false };
    if (!G.unlockedSpecials.includes(id)) return { locked: true };
    if (id === "bomb") return { ready: G.P.bombs > 0, count: G.P.bombs, active: !!G.bombFx };
    const sp = S.SPECIALS.find((s) => s.id === id);
    const act = id === "shield" ? G.shieldT > 0 : id === "laser" ? G.laserT > 0 : false;
    return { ready: G.cds[id] <= 0, cd: G.cds[id] / sp.cd, active: act };
  };
  E.special = function (id) {
    if (!G || !E.running || E.paused || G.phase === "dead" || G.phase === "victory") return;
    if (!G.unlockedSpecials.includes(id)) return;
    const P = G.P, sp = S.SPECIALS.find((s) => s.id === id);
    if (id === "bomb") {
      if (P.bombs <= 0 || G.bombFx) return;
      P.bombs--; G.bombFx = { t: 0, x: P.x, y: P.y - 120 }; AU.play("bomb"); P.inv = Math.max(P.inv, 1.2);
      return;
    }
    if (G.cds[id] > 0) return;
    G.cds[id] = sp.cd;
    if (id === "shield") { G.shieldT = 5 * P.specialDur; AU.play("shield"); }
    else if (id === "laser") { G.laserT = 3 * P.specialDur * (P.plane.id === "phantom" ? 2 : 1); AU.play("laser"); }
    else if (id === "emp") { G.empFx = { t: 0, x: P.x, y: P.y, hit: new Set() }; AU.play("emp"); }
    else if (id === "strike") {
      AU.play("strike");
      [110, 270, 430].forEach((x, i) => G.allies.push({ x, y: H + 80 + i * 70, drop: 0 }));
    }
  };
  function updateSpecials(dt) {
    const P = G.P;
    for (const k in G.cds) if (G.cds[k] > 0) G.cds[k] -= dt * P.recharge;
    if (G.shieldT > 0) G.shieldT -= dt;
    // mega bomb: expanding blast that wipes bullets and regular enemies
    if (G.bombFx) {
      const b = G.bombFx; b.t += dt;
      if (b.t > 0.35 && !b.done) {
        b.done = true; G.flash = 1; G.shake = 1.2;
        for (const e of G.eb) { e.dead = true; fxAdd({ type: "spark", x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, size: 4, color: "#ffe066" }); }
        G.beams.length = 0;
        const dmg = 45 * P.bombPow * Math.sqrt(G.hpMul);
        for (const e of G.enemies.slice()) if (e.alive && e.y > -30 && e.y < H + 30) { if (!e.def.big) kill(e); else hurt(e, dmg); }
        if (G.boss && !G.boss.entering) { for (const p of G.boss.parts) if (p.alive) hurtPart(p, p.maxHp * 0.25 * P.bombPow); hurtCore(G.boss.maxHp * 0.05 * P.bombPow, true); }
        for (let i = 0; i < 14; i++) boom(R(40, W - 40), R(80, H - 200), R(30, 60), "air", true);
      }
      if (b.t > 1.4) G.bombFx = null;
    }
    // laser beam
    if (G.laserT > 0) {
      G.laserT -= dt;
      const dps = 38 * P.laserDmg * P.dmg;
      for (const t of targets()) if (t.y < P.y && Math.abs(t.x - P.x) < 18 + t.r) { hurt(t, dps * dt, t.x, t.y); if (Math.random() < 0.3) fxAdd({ type: "spark", x: t.x + R(-6, 6), y: t.y + t.r * 0.5, vx: R(-120, 120), vy: R(-60, 60), life: 0.25, size: 3, color: "#ffd8f0" }); }
      for (const b of G.eb) if (b.y < P.y && Math.abs(b.x - P.x) < 20) b.dead = true;
    }
    // EMP ring
    if (G.empFx) {
      const f = G.empFx; f.t += dt;
      const rr = Math.min(330, f.t * 800);
      for (const b of G.eb) if (Math.hypot(b.x - f.x, b.y - f.y) < rr) { b.dead = true; }
      for (const e of G.enemies) if (!f.hit.has(e) && Math.hypot(e.x - f.x, e.y - f.y) < rr) { f.hit.add(e); e.empT = 5 * P.specialDur; hurt(e, 3); }
      if (G.boss && !f.hit.has(G.boss) && Math.hypot(G.boss.x - f.x, G.boss.y - f.y) < rr + 150) { f.hit.add(G.boss); G.boss.empT = 3 * P.specialDur; }
      if (f.t > 0.9) G.empFx = null;
    }
    // airstrike bombers
    for (const a of G.allies) {
      a.y -= 560 * dt; a.drop -= dt;
      if (a.drop <= 0 && a.y < H - 40 && a.y > 40) {
        a.drop = 0.09;
        const bx = a.x + R(-30, 30), by = a.y + 30;
        boom(bx, by, 36, ART.isWater(G.stage.world, bx, G.scroll + H - by) ? "water" : "ground", true);
        for (const t of targets()) if (Math.hypot(t.x - bx, t.y - by) < 64 + t.r) hurt(t, (t.isCore ? 10 : 16) * Math.sqrt(G.hpMul), bx, by);
        for (const b of G.eb) if (Math.hypot(b.x - bx, b.y - by) < 60) b.dead = true;
      }
    }
    G.allies = G.allies.filter((a) => a.y > -120);
  }

  /* =========================================================
     EFFECTS
     ========================================================= */
  const MAXFX = 1400;
  function fxAdd(p) { if (G.fx.length < MAXFX * (E.lowFx ? 0.4 : 1)) { p.max = p.life; G.fx.push(p); } }
  function boom(x, y, size, kind, quiet) {
    const n = Math.round(6 + size * 0.35);
    for (let i = 0; i < n; i++) { const a = R(0, TAU), s = R(20, 90) * (size / 30); fxAdd({ type: "fire", x: x + R(-size, size) * 0.25, y: y + R(-size, size) * 0.25, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (kind === "ground" ? G.speed : 0), life: R(0.35, 0.7), size: R(0.25, 0.45) * size, grow: size * 0.6, color: pick(["#fff3bf", "#ffd43b", "#ff922b", "#fa5252"]) }); }
    for (let i = 0; i < n * 0.6; i++) { const a = R(0, TAU), s = R(10, 50) * (size / 30); fxAdd({ type: "smoke", x: x + R(-size, size) * 0.3, y: y + R(-size, size) * 0.3, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (kind === "ground" ? G.speed : -10), life: R(0.9, 1.6), size: size * 0.3, grow: size * 0.9, color: kind === "water" ? "#dbe4ff" : pick(["#343a40", "#495057", "#5c5f66"]), alpha: 0.7 }); }
    for (let i = 0; i < n * 0.8; i++) { const a = R(0, TAU), s = R(150, 420); fxAdd({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R(0.2, 0.45), size: 2, color: "#ffe066" }); }
    if (size > 18) for (let i = 0; i < size * 0.25; i++) { const a = R(0, TAU), s = R(80, 260); fxAdd({ type: "debris", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R(0.6, 1.2), size: R(2, 5), rot: R(0, 6), vr: R(-12, 12), color: kind === "ground" ? "#5c4a3a" : "#343a40" }); }
    fxAdd({ type: "ring", x, y, vx: 0, vy: kind === "ground" || kind === "water" ? G.speed : 0, life: 0.4, size: size * 0.4, grow: size * 3.2, color: kind === "water" ? "#ffffff" : "#ffd8a8" });
    fxAdd({ type: "flash", x, y, vx: 0, vy: 0, life: 0.16, size: size * 1.5, grow: 0, color: "#fff4e6" });
    if (kind === "ground") G.gfx.push({ type: "scorch", x, gy: G.scroll + H - y, r: size * 0.55, t: 0, life: 40 });
    if (kind === "water") splash(x, y, size);
    if (!quiet && size > 40) G.shake = Math.max(G.shake, Math.min(0.8, size / 120));
  }
  function splash(x, y, size) {
    for (let i = 0; i < size * 0.6; i++) { const a = R(0, TAU), s = R(30, 140); fxAdd({ type: "splash", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + G.speed, life: R(0.4, 0.9), size: R(2, 5), grow: 6, color: "#e7f5ff" }); }
    G.gfx.push({ type: "foam", x, gy: G.scroll + H - y, r: size * 0.6, t: 0, life: 3 });
    AU.play("splash");
  }
  function updateFx(dt) {
    for (const p of G.fx) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const drag = p.type === "smoke" ? 1.5 : p.type === "debris" ? 2.5 : p.type === "fire" ? 3 : 0.5;
      p.vx *= Math.exp(-drag * dt); if (p.type !== "ring" && p.type !== "smoke") p.vy *= Math.exp(-drag * dt);
      if (p.type === "smoke") p.vy += (G.speed * 0.6 - p.vy) * dt;
      p.size = Math.max(0.1, p.size + (p.grow || 0) * dt);
      if (p.vr) p.rot += p.vr * dt;
    }
    G.fx = G.fx.filter((p) => p.life > 0);
    for (const g of G.gfx) g.t += dt;
    G.gfx = G.gfx.filter((g) => g.t < g.life && H + G.scroll - g.gy < H + 120);
    if (G.gfx.length > 400) G.gfx.splice(0, G.gfx.length - 400);
    for (const t of G.texts) { t.t -= dt; t.y -= 30 * dt; }
    G.texts = G.texts.filter((t) => t.t > 0);
  }
  function newCloud(y) { return { x: R(-60, W + 60), y, i: Math.floor(R(0, 6)), s: R(0.8, 1.6), v: R(0, 40), a: R(0.35, 0.7) }; }

  /* =========================================================
     FINISH
     ========================================================= */
  function finish(won) {
    if (!G || G.phase === "done") return;
    const st = G.stats;
    const killPct = st.spawned ? st.killed / st.spawned : 1;
    const medals = won ? [killPct >= 0.7, killPct >= 0.999, st.peopleTotal === 0 || st.rescued >= st.peopleTotal, st.damage < 0.5] : [false, false, false, false];
    G.phase = "done";
    E.running = false;
    AU.stopMusic();
    if (S.ui && S.ui.onMissionEnd) S.ui.onMissionEnd({ won, stage: G.stage, diffIdx: G.diffIdx, stats: st, killPct, medals, score: st.score, stars: st.stars, rare: st.rareGot });
  }
  E.abandon = () => { if (G) { E.running = false; AU.stopMusic(); G = null; } };

  /* =========================================================
     RENDER
     ========================================================= */
  function blit(spr, x, y, rot, sx, sy, alpha) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== undefined) ctx.scale(sx, sy === undefined ? sx : sy);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
  }
  function render() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const sh = G.shake && E.shakeOn !== false ? G.shake * 9 : 0;
    ctx.save();
    if (sh) ctx.translate(R(-sh, sh), R(-sh, sh));
    drawTerrain();
    drawGroundFx();
    drawPeople();
    for (const e of G.enemies) if (e.ground && e.alive && !e.waiting) drawEnemy(e);
    // shadows of everything flying
    ctx.globalAlpha = G.stage.world.terrain === "space" ? 0.12 : 0.22;
    for (const e of G.enemies) if (!e.ground && e.alive && !e.waiting) blit(ART.shadow(e.spr), e.x + 26, e.y + 40, e.ang, 0.8);
    if (G.boss && G.boss.alive) blit(ART.shadow(G.boss.spr), G.boss.x + 40, G.boss.y + 60, 0, G.boss.size * 0.85);
    if (G.phase !== "dead") blit(ART.shadow(G.P.sprite), G.P.x + 30, G.P.y + 50, 0, 0.75 * (1 - Math.abs(G.P.bank) * 0.25), 0.75);
    ctx.globalAlpha = 1;
    drawClouds(false);
    if (G.boss && G.boss.alive) drawBoss();
    for (const e of G.enemies) if (!e.ground && e.alive && !e.waiting) drawEnemy(e);
    drawPickups();
    drawPlayerShots();
    if (G.phase !== "dead" && G.phase !== "done") drawPlayer();
    drawAllies();
    drawEnemyShots();
    drawFx();
    drawClouds(true);
    drawSpecialFx();
    ctx.restore();
    if (G.flash > 0 && E.flashOn !== false) { ctx.fillStyle = "rgba(255,250,235," + Math.min(0.85, G.flash * 0.8) + ")"; ctx.fillRect(0, 0, W, H); }
    drawHud();
  }
  function drawTerrain() {
    const CH = ART.CH, world = G.stage.world;
    const k0 = Math.floor(G.scroll / CH), k1 = Math.floor((G.scroll + H) / CH);
    for (let k = k0; k <= k1; k++) {
      const c = ART.chunk(world, k);
      ctx.drawImage(c, 0, H + G.scroll - (k + 1) * CH);
    }
    if (world.terrain === "ocean") {
      // gentle moving sparkle on the water
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(120,180,255,0.05)";
      for (let i = 0; i < 6; i++) { const y = ((G.t * 30 + i * 170) % (H + 100)) - 50; ctx.fillRect(0, y, W, 2); }
      ctx.globalCompositeOperation = "source-over";
    }
    if (world.terrain === "space") {
      // fast parallax stars
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 40; i++) { const x = (i * 137.5) % W, y = ((G.t * (120 + (i % 5) * 60) + i * 97) % (H + 20)) - 10; ctx.fillRect(x, y, 1.5, 3 + (i % 5)); }
    }
  }
  function drawGroundFx() {
    for (const g of G.gfx) {
      const y = H + G.scroll - g.gy, k = 1 - g.t / g.life;
      if (g.type === "scorch") { ctx.globalAlpha = Math.min(0.55, k * 3); const gr = ctx.createRadialGradient(g.x, y, 0, g.x, y, g.r); gr.addColorStop(0, "rgba(20,15,10,0.9)"); gr.addColorStop(1, "rgba(20,15,10,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, y, g.r, 0, TAU); ctx.fill(); }
      else if (g.type === "wake") { ctx.globalAlpha = k * 0.5; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, y, g.r + g.t * 14, 0, TAU); ctx.stroke(); }
      else if (g.type === "foam") { ctx.globalAlpha = k * 0.6; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, y, g.r * (1 + g.t), 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawPeople() {
    const spr = ART.person();
    for (const h of G.people) {
      if (h.done || h.gone) continue;
      ctx.strokeStyle = "rgba(105,219,124,0.8)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(h.x, h.y, 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (h.prog > 0) { ctx.strokeStyle = "#69db7c"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(h.x, h.y, 60, -Math.PI / 2, -Math.PI / 2 + h.prog * TAU); ctx.stroke(); }
      blit(spr, h.x, h.y);
      ctx.strokeStyle = "#ffd8a8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x + 5, h.y - 4); ctx.lineTo(h.x + 12, h.y - 10 + Math.sin(h.wave) * 5); ctx.stroke();
      ctx.font = "bold 13px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3; ctx.strokeText("SOS", h.x, h.y - 26); ctx.fillText("SOS", h.x, h.y - 26);
    }
  }
  function drawEnemy(e) {
    const P = G.P, spr = e.spr, m = spr.meta;
    let alpha = e.alpha;
    if (e.ground && !e.naval && G.stage.world.terrain === "space") {
      // gun platforms floating in space
      const r = e.r + 12;
      ctx.fillStyle = "#3b4060"; ctx.strokeStyle = "#748ffc"; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffd43b"; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.fillRect(e.x + Math.cos(a) * (r - 5) - 1.5, e.y + Math.sin(a) * (r - 5) - 1.5, 3, 3); }
    }
    blit(e.flash > 0 ? ART.flash(spr) : spr, e.x, e.y, e.ground ? 0 : e.ang, 1, 1, alpha);
    if (e.flash > 0) blit(spr, e.x, e.y, e.ground ? 0 : e.ang, 1, 1, alpha * 0.4);
    if (e.carrier) { ctx.strokeStyle = "rgba(255,212,59,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 22 + Math.sin(e.t * 8) * 3, 0, TAU); ctx.stroke(); }
    if (e.rare && e.alive) { ctx.strokeStyle = "rgba(255,212,59," + (0.5 + 0.5 * Math.sin(e.t * 6)) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 34, 0, TAU); ctx.stroke(); }
    // turrets, rotors, dishes drawn live
    if (m.turret) drawTurret(e.x + m.turret[0], e.y + m.turret[1], e.aim, m.turret[2], m.turret[3], m.turret[4], m.turret[5]);
    if (m.turrets && e.kind !== "carrier") for (const t of m.turrets) drawTurret(e.x + t[0], e.y + t[1], e.aim, 8, 18, "#495057", 2);
    if (m.rotor) { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.globalAlpha = 0.25; ctx.fillStyle = "#212529"; ctx.beginPath(); ctx.arc(m.rotor[0], -m.rotor[1], m.rotor[2], 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8; ctx.strokeStyle = "#212529"; ctx.lineWidth = 3; const a = e.t * 30; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(Math.cos(a + k * 1.57) * m.rotor[2], Math.sin(a + k * 1.57) * m.rotor[2]); ctx.lineTo(-Math.cos(a + k * 1.57) * m.rotor[2], -Math.sin(a + k * 1.57) * m.rotor[2]); ctx.stroke(); } ctx.restore(); }
    if (m.dish) { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.t * 2); ctx.fillStyle = "#f8f9fa"; ctx.beginPath(); ctx.ellipse(0, 0, 20, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#495057"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    if (!e.ground && !e.def.kamikaze && e.def.type === "air" && e.alpha > 0.5) { ctx.globalCompositeOperation = "lighter"; const fx = e.x + Math.sin(e.ang) * e.r * 0.9, fy = e.y - Math.cos(e.ang) * e.r * 0.9; ctx.globalAlpha = 0.6; blit(ART.glow("#ff922b", 3), fx, fy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    if (e.empT > 0 && Math.random() < 0.4) fxAdd({ type: "spark", x: e.x + R(-e.r, e.r), y: e.y + R(-e.r, e.r), vx: 0, vy: 0, life: 0.1, size: 3, color: "#74c0fc" });
    if (e.def.big && e.hp < e.maxHp) { const w = e.r * 1.6; ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 5); ctx.fillStyle = "#ff6b6b"; ctx.fillRect(e.x - w / 2, e.y - e.r - 12, (w * e.hp) / e.maxHp, 5); }
  }
  function drawTurret(x, y, aim, r, len, col, twin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(aim);
    ctx.fillStyle = "#212529";
    if (twin) { ctx.fillRect(r * 0.2, -r * 0.45, len, r * 0.28); ctx.fillRect(r * 0.2, r * 0.17, len, r * 0.28); } else ctx.fillRect(r * 0.2, -r * 0.18, len, r * 0.36);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBoss() {
    const B = G.boss;
    blit(B.flash > 0 ? ART.flash(B.spr) : B.spr, B.x, B.y, 0, B.size);
    if (B.flash > 0) blit(B.spr, B.x, B.y, 0, B.size, B.size, 0.5);
    for (const p of B.parts) {
      const s = B.size;
      if (!p.alive) { ctx.fillStyle = "rgba(20,15,10,0.8)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.9, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,120,40," + (0.3 + 0.3 * Math.sin(B.t * 9 + p.ox)) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.4, 0, TAU); ctx.fill(); continue; }
      const fl = p.flash > 0;
      switch (p.t) {
        case "turret": drawTurret(p.x, p.y, p.aim, 16 * s, 28 * s, fl ? "#fff" : "#868e96"); break;
        case "cannon": drawTurret(p.x, p.y, p.aim, 20 * s, 34 * s, fl ? "#fff" : "#e8590c", true); break;
        case "missile": ctx.fillStyle = fl ? "#fff" : "#495057"; ctx.fillRect(p.x - 20 * s, p.y - 16 * s, 40 * s, 32 * s); for (let i = 0; i < 4; i++) { ctx.fillStyle = "#f8f9fa"; ctx.beginPath(); ctx.arc(p.x + (-12 + (i % 2) * 24) * s, p.y + (-7 + Math.floor(i / 2) * 14) * s, 5 * s, 0, TAU); ctx.fill(); ctx.fillStyle = "#e03131"; ctx.beginPath(); ctx.arc(p.x + (-12 + (i % 2) * 24) * s, p.y + (-7 + Math.floor(i / 2) * 14) * s, 2.2 * s, 0, TAU); ctx.fill(); } break;
        case "laser": { ctx.fillStyle = fl ? "#fff" : "#343a40"; ctx.beginPath(); ctx.arc(p.x, p.y, 20 * s, 0, TAU); ctx.fill(); const charge = G.beams.find((b) => b.part === p); ctx.fillStyle = charge ? "#ff2d55" : "#be4bdb"; ctx.globalCompositeOperation = "lighter"; blit(ART.glow(charge ? "#ff2d55" : "#be4bdb", 6), p.x, p.y, 0, s * (charge ? 1.6 : 1)); ctx.globalCompositeOperation = "source-over"; break; }
        case "engine": ctx.fillStyle = fl ? "#fff" : "#212529"; ctx.beginPath(); ctx.arc(p.x, p.y, 30 * s, 0, TAU); ctx.fill(); ctx.strokeStyle = "#868e96"; ctx.lineWidth = 3 * s; for (let k = 0; k < 6; k++) { const a = p.spin + (k * TAU) / 6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * 26 * s, p.y + Math.sin(a) * 26 * s); ctx.stroke(); } ctx.globalCompositeOperation = "lighter"; blit(ART.glow("#ff922b", 8), p.x, p.y - 30 * s, 0, s); ctx.globalCompositeOperation = "source-over"; break;
        case "hangar": ctx.fillStyle = fl ? "#fff" : "#343a40"; ctx.fillRect(p.x - 26 * s, p.y - 20 * s, 52 * s, 40 * s); ctx.strokeStyle = "#fcc419"; ctx.lineWidth = 3 * s; ctx.strokeRect(p.x - 26 * s, p.y - 20 * s, 52 * s, 40 * s); ctx.beginPath(); ctx.moveTo(p.x, p.y - 20 * s); ctx.lineTo(p.x, p.y + 20 * s); ctx.stroke(); break;
      }
      if (p.hp < p.maxHp) { const w = 40 * s; ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(p.x - w / 2, p.y - p.r - 10, w, 4); ctx.fillStyle = "#ffd43b"; ctx.fillRect(p.x - w / 2, p.y - p.r - 10, (w * Math.max(0, p.hp)) / p.maxHp, 4); }
    }
    // the core glows angrier each phase
    const c = B.coreT, col = ["#74c0fc", "#ffa94d", "#ff4d4d"][B.phase - 1];
    ctx.globalCompositeOperation = "lighter"; blit(ART.glow(col, 10), c.x, c.y, 0, B.size * (1.6 + 0.2 * Math.sin(B.t * 6))); ctx.globalCompositeOperation = "source-over";
    if (B.empT > 0) { ctx.strokeStyle = "rgba(116,192,252,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(B.x, B.y, B.def.w * B.size * 0.4, 0, TAU); ctx.stroke(); }
    // laser beams
    for (const bm of G.beams) {
      const x = bm.part.x, y0 = bm.part.y + 14;
      if (bm.t < bm.warn) { ctx.strokeStyle = "rgba(255,45,85," + (0.3 + 0.4 * Math.sin(bm.t * 30)) + ")"; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, H); ctx.stroke(); ctx.setLineDash([]); }
      else {
        const k = Math.min(1, (bm.t - bm.warn) * 8) * Math.min(1, (bm.warn + bm.dur - bm.t) * 6);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,45,85," + 0.35 * k + ")"; ctx.fillRect(x - bm.w, y0, bm.w * 2, H - y0);
        ctx.fillStyle = "rgba(255,180,200," + 0.9 * k + ")"; ctx.fillRect(x - (bm.w / 2) * k, y0, bm.w * k, H - y0);
        ctx.fillStyle = "rgba(255,255,255," + k + ")"; ctx.fillRect(x - bm.w * 0.15, y0, bm.w * 0.3, H - y0);
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }
  function drawPlayer() {
    const P = G.P, spr = P.sprite;
    if (P.inv > 0 && Math.floor(P.inv * 20) % 2 && G.phase !== "victory") return;
    const sx = 1 - Math.abs(P.bank) * 0.28;
    // engine flames
    ctx.globalCompositeOperation = "lighter";
    const fc = G.save.upgrades.speed >= 3 ? "#74c0fc" : "#ffa94d";
    for (const ex of spr.meta.engines) blit(ART.streak(fc, 5, 22), P.x + ex * sx, P.y + spr.meta.tail + 10 + Math.random() * 3, 0, 1, 0.8 + Math.random() * 0.5);
    ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(P.x, P.y); ctx.scale(sx, 1); ctx.transform(1, 0, P.bank * 0.06, 1, 0, 0);
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    if (P.boostT > 0) { ctx.strokeStyle = "rgba(255,146,43," + (0.4 + 0.3 * Math.sin(G.t * 12)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 44, 0, TAU); ctx.stroke(); }
    if (G.shieldT > 0) {
      const k = Math.min(1, G.shieldT);
      ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createRadialGradient(P.x, P.y, 30, P.x, P.y, 54); gr.addColorStop(0, "rgba(77,171,247,0)"); gr.addColorStop(0.85, "rgba(116,192,252," + 0.45 * k + ")"); gr.addColorStop(1, "rgba(165,216,255,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(P.x, P.y, 54, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(165,216,255," + (0.5 + 0.3 * Math.sin(G.t * 10)) * k + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 50, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    // the tiny hitbox, so you know exactly what to dodge with
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(P.x, P.y, 3, 0, TAU); ctx.fill();
  }
  const SHOT = { mg: ["#ffe066", 3, 16], dbl: ["#ffa94d", 4, 18], tri: ["#69db7c", 4, 16], spr: ["#74c0fc", 4, 12], heavy: ["#ff922b", 8, 22], rapid: ["#e599f7", 2.5, 20], wing: ["#ffd43b", 2.5, 12] };
  function drawPlayerShots() {
    ctx.globalCompositeOperation = "lighter";
    for (const b of G.pb) { const s = SHOT[b.kind]; blit(ART.streak(s[0], s[1], s[2]), b.x, b.y, Math.atan2(b.vx, -b.vy)); }
    ctx.globalCompositeOperation = "source-over";
    for (const m of G.pm) {
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.ang);
      const s = m.big ? 1.6 : m.small ? 0.8 : 1;
      ctx.fillStyle = "#f1f3f5"; ctx.fillRect(-2 * s, -8 * s, 4 * s, 14 * s); ctx.fillStyle = "#e03131"; ctx.beginPath(); ctx.moveTo(-2 * s, -8 * s); ctx.lineTo(0, -12 * s); ctx.lineTo(2 * s, -8 * s); ctx.fill();
      ctx.fillStyle = "#868e96"; ctx.fillRect(-4 * s, 3 * s, 8 * s, 2 * s);
      ctx.globalCompositeOperation = "lighter"; ctx.drawImage(ART.glow("#ff922b", 3), -6, 4 * s); ctx.restore(); ctx.globalCompositeOperation = "source-over";
    }
    if (G.laserT > 0) {
      const P = G.P, k = Math.min(1, G.laserT * 3), w = 16 + Math.sin(G.t * 40) * 3;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(240,101,149," + 0.35 * k + ")"; ctx.fillRect(P.x - w * 1.6, 0, w * 3.2, P.y - 30);
      ctx.fillStyle = "rgba(255,190,220," + 0.8 * k + ")"; ctx.fillRect(P.x - w / 2, 0, w, P.y - 30);
      ctx.fillStyle = "rgba(255,255,255," + k + ")"; ctx.fillRect(P.x - w / 5, 0, w / 2.5, P.y - 30);
      blit(ART.glow("#f06595", 10), P.x, P.y - 34, 0, 1.4);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  const EB = { red: "#ff4d4d", pink: "#f06595", big: "#ff922b", blue: "#4dabf7" };
  function drawEnemyShots() {
    ctx.globalCompositeOperation = "lighter";
    for (const b of G.eb) if (!b.missile) blit(ART.glow(EB[b.kind] || "#ff4d4d", b.r), b.x, b.y);
    ctx.globalCompositeOperation = "source-over";
    for (const b of G.eb) if (b.missile) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.fillStyle = "#343a40"; ctx.fillRect(-3, -9, 6, 16); ctx.fillStyle = "#ff4d4d"; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(0, -14); ctx.lineTo(3, -9); ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.drawImage(ART.glow("#ffa94d", 3), -6, 4); ctx.restore(); ctx.globalCompositeOperation = "source-over";
    }
  }
  function drawPickups() {
    for (const p of G.pickups) {
      if (p.type === "star") blit(ART.star(p.val >= 5 ? 11 : 7), p.x, p.y, p.t * 3);
      else { const k = PK[p.type]; blit(ART.pickup(k[0], k[1]), p.x, p.y, 0, 1 + Math.sin(p.t * 6) * 0.06); }
    }
  }
  function drawAllies() {
    const spr = ART.player(S.PLANES[2], {});
    for (const a of G.allies) blit(spr, a.x, a.y, 0, 1.3);
  }
  function drawFx() {
    for (const p of G.fx) {
      const k = Math.max(0, p.life / p.max);
      if (p.type === "fire" || p.type === "flash" || p.type === "spark") {
        ctx.globalCompositeOperation = "lighter";
        if (p.type === "spark") { ctx.strokeStyle = p.color; ctx.globalAlpha = k; ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
        else { ctx.globalAlpha = p.type === "flash" ? k * 0.8 : k; blit(ART.glow(p.color, 8), p.x, p.y, 0, p.size / 16); }
        ctx.globalCompositeOperation = "source-over";
      } else if (p.type === "smoke") { ctx.globalAlpha = k * (p.alpha || 0.6); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
      else if (p.type === "debris") { ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); ctx.restore(); }
      else if (p.type === "ring") { ctx.globalAlpha = k * 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke(); }
      else if (p.type === "splash") { ctx.globalAlpha = k; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const t of G.texts) {
      ctx.globalAlpha = Math.min(1, t.t * 2);
      ctx.font = "bold " + t.size + "px Fredoka, sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
  function drawClouds(high) {
    const T = G.stage.world.terrain;
    if (T === "space") return;
    const tint = T === "industrial" ? "rgba(90,90,90,0.9)" : T === "snow" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.9)";
    for (let i = 0; i < G.clouds.length; i++) {
      if ((i % 3 === 0) !== high) continue;
      const c = G.clouds[i];
      ctx.globalAlpha = high ? c.a * 0.45 : c.a;
      blit(ART.cloud(c.i, tint), c.x, c.y, 0, c.s);
    }
    ctx.globalAlpha = 1;
  }
  function drawSpecialFx() {
    if (G.bombFx) {
      const b = G.bombFx, k = b.t / 1.4;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,212,59," + (1 - k) + ")"; ctx.lineWidth = 30 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, k * 900, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    if (G.empFx) {
      const f = G.empFx, rr = Math.min(330, f.t * 800);
      ctx.strokeStyle = "rgba(116,192,252," + (1 - f.t / 0.9) + ")"; ctx.lineWidth = 6;
      ctx.beginPath(); for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, j = rr + R(-6, 6); ctx.lineTo(f.x + Math.cos(a) * j, f.y + Math.sin(a) * j); } ctx.stroke();
    }
  }

  /* ---------- HUD ---------- */
  function drawHud() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const P = G.P, st = G.stats;
    const g = ctx.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 70);
    // hull
    const hk = P.hp / P.maxHp;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; roundRect(14, 14, 168, 14, 7); ctx.fill();
    ctx.fillStyle = hk > 0.5 ? "#51cf66" : hk > 0.25 ? "#fcc419" : "#ff6b6b"; roundRect(14, 14, Math.max(6, 168 * hk), 14, 7); ctx.fill();
    ctx.font = "bold 10px Fredoka, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText("HULL " + Math.ceil(P.hp), 20, 25);
    // power pips
    const pwr = pw(P);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i < pwr ? (i >= P.power ? "#ff922b" : "#ffd43b") : "rgba(255,255,255,0.2)"; ctx.fillRect(14 + i * 13, 33, 10, 5); }
    // objectives
    const kp = st.spawned ? Math.round((st.killed / st.spawned) * 100) : 0;
    ctx.font = "12px Fredoka, sans-serif";
    const obj = [["🎯 " + kp + "%", kp >= 70], ["🆘 " + st.rescued + "/" + st.peopleTotal, st.peopleTotal === 0 || st.rescued >= st.peopleTotal], [st.damage < 0.5 ? "✨ no hits" : "💥 hit", st.damage < 0.5]];
    let ox = 14; for (const [t, okk] of obj) { ctx.fillStyle = okk ? "#b2f2bb" : "rgba(255,255,255,0.75)"; ctx.fillText(t, ox, 54); ox += ctx.measureText(t).width + 12; }
    // score
    ctx.textAlign = "center"; ctx.font = "bold 24px Fredoka, sans-serif"; ctx.fillStyle = "#fff";
    ctx.fillText(st.score.toLocaleString(), W / 2, 32);
    // stars
    ctx.textAlign = "right"; ctx.font = "bold 18px Fredoka, sans-serif"; ctx.fillStyle = "#ffd43b"; ctx.fillText("⭐ " + st.stars, W - 64, 30);
    // combo
    const m = comboMult(G.combo.n);
    if (m > 1) {
      ctx.font = "bold " + (m >= 16 ? 22 : 20) + "px Fredoka, sans-serif"; ctx.fillStyle = ["#fff", "#fff", "#69db7c", "#ffd43b", "#ff922b", "#ff6b6b"][Math.log2(m) + 1];
      ctx.fillText(m >= 16 ? "DOMINATING!" : m + "x COMBO", W - 14, 56);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(W - 110, 62, 96, 3); ctx.fillStyle = "#fff"; ctx.fillRect(W - 110, 62, 96 * Math.max(0, G.combo.t / 2.8), 3);
    }
    // boss health
    const B = G.boss;
    if (B && B.alive) {
      const w = 380, x = (W - w) / 2, y = 78;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; roundRect(x - 4, y - 4, w + 8, 22, 8); ctx.fill();
      ctx.fillStyle = "#c92a2a"; roundRect(x, y, w * Math.max(0, B.hp / B.maxHp), 14, 6); ctx.fill();
      for (const t of [0.33, 0.66]) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x + w * t, y, 2, 14); }
      ctx.font = "bold 11px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.fillText(B.def.name.toUpperCase() + " · PHASE " + B.phase + " · " + B.parts.filter((p) => p.alive).length + " parts left", W / 2, y + 11);
    }
    // banner
    if (G.banner) {
      const bn = G.banner, a = Math.min(1, bn.t * 2, (3.2 - bn.t) * 4 + 0.2);
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillStyle = bn.warn ? "rgba(201,42,42,0.75)" : "rgba(0,0,0,0.5)"; ctx.fillRect(0, H * 0.36, W, 110);
      ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.font = "bold 40px Fredoka, sans-serif"; ctx.fillText(bn.warn && bn.text === "WARNING" && Math.floor(G.t * 4) % 2 ? "" : bn.text, W / 2, H * 0.36 + 56);
      ctx.font = "16px Fredoka, sans-serif"; ctx.fillText(bn.sub, W / 2, H * 0.36 + 88);
      ctx.globalAlpha = 1;
    }
    // hull alarm
    if (hk < 0.25 && G.phase !== "dead") { ctx.strokeStyle = "rgba(255,0,0," + (0.25 + 0.25 * Math.sin(G.t * 8)) + ")"; ctx.lineWidth = 14; ctx.strokeRect(0, 0, W, H); if (Math.sin(G.t * 8) > 0.95) AU.play("beep"); }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  /* idle background behind the menus: a calm fly-over */
  let idleT = 0;
  function drawIdle(dt) {
    idleT += dt;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const world = S.WORLDS[Math.floor(idleT / 20) % S.WORLDS.length];
    const scroll = idleT * 50, CH = ART.CH;
    for (let k = Math.floor(scroll / CH); k <= Math.floor((scroll + H) / CH); k++) ctx.drawImage(ART.chunk(world, k), 0, H + scroll - (k + 1) * CH);
    ctx.fillStyle = "rgba(10,14,30,0.35)"; ctx.fillRect(0, 0, W, H);
    const spr = ART.player(S.planeById((S.ui && S.ui.save && S.ui.save.plane) || "falcon"), (S.ui && S.ui.save && S.ui.save.upgrades) || {});
    const x = W / 2 + Math.sin(idleT * 0.7) * 60, y = H * 0.72 + Math.sin(idleT * 1.1) * 14;
    ctx.globalAlpha = 0.3; blit(ART.shadow(spr), x + 30, y + 50, 0, 0.75); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter"; for (const ex of spr.meta.engines) blit(ART.streak("#ffa94d", 5, 22), x + ex, y + spr.meta.tail + 10, 0, 1, 0.9 + Math.random() * 0.4); ctx.globalCompositeOperation = "source-over";
    blit(spr, x, y, 0, 1 - Math.abs(Math.cos(idleT * 0.7)) * 0.05);
  }
})();
