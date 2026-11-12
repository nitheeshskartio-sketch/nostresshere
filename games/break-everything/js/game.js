/* ============ BREAK EVERYTHING — modes, scoring, unlocks, stats & UI ============ */
(function () {
  "use strict";
  const BE = window.BE, W = BE.world, T = BE.tools, A = BE.audio;
  const $ = (id) => document.getElementById(id);
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let toastT;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2200); }

  /* ---------- saved progress ---------- */
  const KEY = "nsh-be-progress";
  const fresh = () => ({ broken: 0, score: 0, byObj: {}, byMat: {}, byCat: {}, tools: {}, envs: {}, bestCombo: 0, playtime: 0, frags: 0, explosions: 0, crushed: 0, replays: 0, best: {}, stars: {}, ach: {}, unlockAll: false, seen: {} });
  let P = fresh();
  try { P = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* private mode */ }
  const prefs = Object.assign({ sound: true, shake: true, fx: true, env: "empty" }, (() => { try { return JSON.parse(localStorage.getItem("nsh-be-prefs") || "{}"); } catch (e) { return {}; } })());
  let saveT = 0;
  function save(now) {
    if (!now && performance.now() - saveT < 2500) return;
    saveT = performance.now();
    try { localStorage.setItem(KEY, JSON.stringify(P)); localStorage.setItem("nsh-be-prefs", JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }
  window.addEventListener("pagehide", () => save(true));

  /* ---------- unlocks ---------- */
  const ENV_NEED = { empty: 0, studio: 0, kitchen: 10, glassroom: 30, toyroom: 50, woodroom: 80, warehouse: 120, cartoon: 170 };
  const toolOpen = (t) => P.unlockAll || P.broken >= t.need;
  const envOpen = (id) => P.unlockAll || P.broken >= (ENV_NEED[id] || 0);
  function checkUnlocks() {
    for (const t of T.list) if (t.need && toolOpen(t) && !P.seen["t" + t.id]) { P.seen["t" + t.id] = 1; toast("🔓 Unlocked: " + t.icon + " " + t.name + "!", 2800); A.fanfare(); renderTools(); }
    for (const e of W.ENVS) if (ENV_NEED[e.id] && envOpen(e.id) && !P.seen["e" + e.id]) { P.seen["e" + e.id] = 1; toast("🔓 New room: " + e.icon + " " + e.name + "!", 2800); A.fanfare(); }
  }

  /* ---------- achievements ---------- */
  const ACH = [
    ["first", "🥇", "First Break", "Break anything", () => P.broken >= 1],
    ["b100", "💯", "Wrecking Crew", "Break 100 things", () => P.broken >= 100],
    ["b500", "🏗️", "Demolition Expert", "Break 500 things", () => P.broken >= 500],
    ["b2000", "👑", "Professional Destroyer", "Break 2,000 things", () => P.broken >= 2000],
    ["combo5", "🔥", "Combo Starter", "Reach a 5× combo", () => P.bestCombo >= 5],
    ["combo15", "⚡", "Combo Master", "Reach a 15× combo", () => P.bestCombo >= 15],
    ["glass50", "🥂", "Shatterbug", "Shatter 50 glass things", () => (P.byMat.glass || 0) >= 50],
    ["furn20", "🪑", "Furniture Hater", "Break 20 pieces of furniture", () => (P.byCat.furniture || 0) >= 20],
    ["pop25", "🎈", "Pop Star", "Pop 25 inflatables", () => (P.byMat.inflatable || 0) >= 25],
    ["chain10", "🧨", "Chain Reaction", "Take out 10 things with one chain of explosions", () => !!P.ach.chain10],
    ["boom25", "💣", "Kaboom Enthusiast", "Set off 25 explosions", () => P.explosions >= 25],
    ["press10", "🥞", "Pancake Maker", "Crush 10 things with the press or crusher", () => P.crushed >= 10],
    ["alltools", "🧰", "Toolbox", "Use every tool at least once", () => T.list.every((t) => P.tools[t.id])],
    ["allenv", "🧳", "Tourist", "Break something in all 8 rooms", () => W.ENVS.every((e) => P.envs[e.id])],
    ["collector", "📚", "Collector", "Break every kind of object", () => BE.OBJECTS.every((o) => P.byObj[o.id])],
    ["replay", "🎬", "Instant Replay", "Watch a slow-motion replay", () => P.replays >= 1],
    ["time3", "⏱️", "Speed Demon", "3 stars in Time Attack", () => (P.stars.time || 0) >= 3],
    ["survive", "🌪️", "Survivor", "3 stars in Survival", () => (P.stars.survival || 0) >= 3],
    ["precise", "🎯", "Sharpshooter", "3 stars in Precision", () => (P.stars.precision || 0) >= 3],
    ["clean", "🧹", "Clean Sweep", "3 stars in Complete Destruction", () => (P.stars.complete || 0) >= 3]
  ];
  function checkAch() {
    for (const [id, icon, name, , test] of ACH) if (!P.ach[id] && test()) { P.ach[id] = Date.now(); setTimeout(() => toast("🏆 Achievement: " + icon + " " + name, 2800), 400); A.fanfare(); }
  }

  /* ---------- modes ---------- */
  const MODES = {
    free: { name: "Free Destruction", icon: "🔨", desc: "No rules. No timer. Just break stuff." },
    time: { name: "Time Attack", icon: "⏱️", desc: "60 seconds. Break as much as you can. New stuff keeps arriving.", stars: [15, 30, 50] },
    complete: { name: "Complete Destruction", icon: "🧹", desc: "Destroy every single object in the room, as fast as you can." },
    target: { name: "Target Mode", icon: "🎯", desc: "Break the 8 marked targets. Breaking anything else costs points." },
    chain: { name: "Chain Reaction", icon: "🧨", desc: "3 shots. Set off the TNT and take everything down in one glorious chain." },
    survival: { name: "Survival", icon: "🌪️", desc: "Stuff keeps falling in, faster and faster. Don't let the room fill up!", stars: [60, 120, 180] },
    precision: { name: "Precision", icon: "🎳", desc: "12 shots. Break as many things as you can. Aim well." }
  };
  const S = { mode: "free", score: 0, broken: 0, combo: 0, lastBreakT: -9, t: 0, over: false };
  const chains = {};

  function envItems(filter) { return W.env.items.filter(([id, n]) => n > 0 && (!filter || filter(id))); }
  function startMode(mode) {
    closeModal();
    $("mainMenu").hidden = true;
    T.release();
    if (W.replaying) W.stopReplay();
    S.mode = mode; S.score = 0; S.broken = 0; S.combo = 0; S.t = 0; S.over = false; S.mistakes = 0; S.shots = null; S.spawnT = 0; S.warnT = 0; S.endT = null; S.lastBreakT = -9;
    T.laserMax = 0;
    W.clearAll();
    W.setEnv(prefs.env);
    for (const m of markers.splice(0)) W.scene.remove(m.mesh);
    const md = MODES[mode];
    $("modeName").textContent = md.name; $("modeBtn").firstChild.textContent = md.icon + " ";
    $("newBtn").disabled = mode !== "free";
    if (mode === "free" || mode === "complete" || mode === "time" || mode === "precision") W.layout(envItems());
    if (mode === "target") {
      W.layout(envItems((id) => id !== "tnt"));
      const cands = W.objects.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(8, W.objects.length));
      for (const o of cands) markTarget(o);
      S.targets = cands.length; S.hitTargets = 0;
    }
    if (mode === "chain") layoutChain();
    if (mode === "survival") { W.layout(envItems().slice(0, 4)); S.limit = 22; }
    if (mode === "chain") { S.shots = 3; T.laserMax = 1.2; }
    if (mode === "precision") { S.shots = 12; T.laserMax = 1.2; }
    if (S.shots != null && T.current === "hand") T.current = "hammer";
    S.total = W.objects.length;
    W.setView("normal");
    if (mode !== "free") toast(md.icon + " " + md.name + ": " + md.desc, 3500);
    updateHud(); renderTools();
  }
  function layoutChain() {
    W.layout(envItems((id) => id !== "tnt").filter(([, , on]) => on !== "floor"));
    // a winding path of TNT with breakables around every barrel
    const s = W.surfaces.floor;
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      pts.push({ x: s.x0 + 0.4 + k * (s.x1 - s.x0 - 0.8), z: (s.z0 + s.z1) / 2 + Math.sin(k * Math.PI * 2.2) * (s.z1 - s.z0) * 0.32 });
    }
    const extras = ["plate", "bottle", "glass", "mug", "cardbox", "jar", "cup", "tub", "bowl", "gvase", "robot", "beachball"].filter((id) => BE.objectById(id));
    for (const p of pts) {
      W.spawn("tnt", { x: p.x, z: p.z, ry: R(0, 3) });
      for (let j = 0; j < 2; j++) {
        const a = R(0, Math.PI * 2), d = R(0.48, 0.62);
        const x = Math.max(s.x0, Math.min(s.x1, p.x + Math.cos(a) * d)), z = Math.max(s.z0, Math.min(s.z1, p.z + Math.sin(a) * d));
        if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < 0.4)) continue;
        W.spawn(pick(extras), { x, z, ry: R(0, 3) });
      }
    }
  }
  // floating markers over targets
  const markers = [];
  const markGeo = new THREE.ConeGeometry(0.09, 0.2, 16), markMat = new THREE.MeshBasicMaterial({ color: "#fa5252" });
  function markTarget(o) {
    o.target = true;
    const mesh = new THREE.Mesh(markGeo, markMat); mesh.rotation.x = Math.PI;
    W.scene.add(mesh);
    markers.push({ o, mesh });
    o.parts.forEach((p) => { if (p.look.emissive && p.mat !== "glass") { p.look.emissive.set("#ff6b6b"); p.look.emissiveIntensity = 0.25; } });
  }

  /* ---------- scoring & stats ---------- */
  W.on("break", (obj, src) => {
    const now = W.simT;
    S.combo = now - S.lastBreakT < 1.6 ? S.combo + 1 : 1;
    S.lastBreakT = now;
    const mult = 1 + Math.min(4, Math.floor((S.combo - 1) / 3) * 0.5);
    let pts = Math.round((10 + obj.maxHp * 1.5) * mult);
    if (S.mode === "target") { if (obj.target) { pts += 200; S.hitTargets++; } else { pts = -50; S.mistakes++; A.buzz(); } }
    S.score = Math.max(0, S.score + pts); S.broken++;
    if (S.combo >= 3) A.combo(S.combo);
    // stats
    const id = obj.def.id;
    P.broken++; P.score += Math.max(0, pts);
    P.byObj[id] = (P.byObj[id] || 0) + 1;
    P.byMat[obj.mainMat] = (P.byMat[obj.mainMat] || 0) + 1;
    P.byCat[obj.def.cat] = (P.byCat[obj.def.cat] || 0) + 1;
    P.envs[W.env.id] = (P.envs[W.env.id] || 0) + 1;
    P.frags += obj.frags || 0;
    P.bestCombo = Math.max(P.bestCombo, S.combo);
    if (src && (src.tool === "press" || src.tool === "hydraulic")) P.crushed++;
    if (src && src.chain) { chains[src.chain] = (chains[src.chain] || 0) + 1; if (chains[src.chain] >= 10 && !P.ach.chain10) { P.ach.chain10 = Date.now(); toast("🏆 Achievement: 🧨 Chain Reaction", 2800); A.fanfare(); } }
    const mi = markers.findIndex((m) => m.o === obj); if (mi >= 0) { W.scene.remove(markers[mi].mesh); markers.splice(mi, 1); }
    checkUnlocks(); checkAch(); save();
    updateHud(true);
  });
  W.on("explode", () => { P.explosions++; });

  /* ---------- per-frame mode logic ---------- */
  let playAcc = 0;
  W.on("frame", (dt, sdt) => {
    if (!$("mainMenu").hidden || !$("modal").hidden) return;
    playAcc += dt; if (playAcc > 1) { P.playtime += playAcc; playAcc = 0; save(); }
    for (const m of markers) { const p = m.o.group.position; m.mesh.position.set(p.x, p.y + m.o.height * 0.6 + 0.35 + Math.sin(W.simT * 4) * 0.06, p.z); m.mesh.rotation.y += dt * 2; }
    if (S.combo > 1 && W.simT - S.lastBreakT > 1.6) { S.combo = 0; updateCombo(); }
    if (S.over || sdt === 0) return;
    S.t += sdt;
    const md = S.mode;
    if (md === "time") {
      const left = 60 - S.t;
      if (W.objects.length < 5) wave(8);
      if (left <= 0) finish();
      else if (Math.ceil(left) !== S.lastTick) { S.lastTick = Math.ceil(left); if (left < 6) A.tick(); updateHud(); }
    } else if (md === "complete") {
      if (W.objects.length === 0) finish(); else if (Math.floor(S.t) !== S.lastTick) { S.lastTick = Math.floor(S.t); updateHud(); }
    } else if (md === "target") {
      if (S.hitTargets >= S.targets) finish(); else if (Math.floor(S.t) !== S.lastTick) { S.lastTick = Math.floor(S.t); updateHud(); }
    } else if (md === "survival") {
      S.spawnT -= sdt;
      if (S.spawnT <= 0) { S.spawnT = Math.max(0.55, 2.4 - S.t * 0.014); wave(S.t > 90 ? 2 : 1); }
      const full = W.objects.length >= S.limit;
      S.warnT = full ? S.warnT + sdt : 0;
      if (S.warnT > 3) finish();
      if (Math.floor(S.t * 2) !== S.lastTick) { S.lastTick = Math.floor(S.t * 2); updateHud(); }
    } else if (md === "chain" || md === "precision") {
      const idle = W.simT - Math.max(S.lastBreakT, S.lastShotT || 0) > 3.2;
      if ((S.shots <= 0 && idle && !W.dyn.length) || W.objects.length === 0) finish();
    }
  });
  function wave(n) {
    const ids = envItems((id) => id !== "window").map((x) => x[0]);
    for (let i = 0; i < n; i++) {
      const id = pick(ids.length ? ids : ["cardbox", "plate", "bottle"]);
      const probe = BE.build(BE.objectById(id), {});
      const spot = W.freeSpot(probe.radius);
      if (spot) W.spawn(id, { x: spot.x, z: spot.z, y: R(1.4, 2.6), ry: R(0, 3), grace: 3 });
    }
    S.total = (S.total || 0) + n;
  }

  /* ---------- tool gating for shot-limited modes ---------- */
  T.canUse = (tool) => {
    if (!$("mainMenu").hidden) return false;
    if (S.over) return false;
    if (!toolOpen(tool)) { toast("🔒 Break " + (tool.need - P.broken) + " more things to unlock the " + tool.name); return false; }
    if (S.shots == null) return true;
    if (S.shots <= 0) { toast("No shots left. Watch the chaos!"); return false; }
    return true;
  };
  T.onUse = (tool) => {
    P.tools[tool.id] = (P.tools[tool.id] || 0) + 1;
    if (S.shots != null) { S.shots--; S.lastShotT = W.simT; updateHud(); }
    checkAch();
  };
  const handInShotModes = () => S.shots != null;

  /* ---------- finishing a mode ---------- */
  function finish() {
    if (S.over) return;
    S.over = true;
    T.release();
    const md = S.mode, M = MODES[md];
    let stars = 1, main = "", sub = "", best = P.best[md], isBest = false;
    if (md === "time") { stars = S.broken >= M.stars[2] ? 3 : S.broken >= M.stars[1] ? 2 : 1; main = S.broken + " things broken"; sub = S.score + " points"; isBest = best == null || S.score > best; if (isBest) P.best[md] = S.score; }
    if (md === "complete") { const t = S.t; stars = t < 45 ? 3 : t < 90 ? 2 : 1; main = fmtTime(t); sub = "to destroy " + S.total + " objects"; isBest = best == null || t < best; if (isBest) P.best[md] = Math.round(t * 10) / 10; }
    if (md === "target") { const t = S.t; stars = t < 40 && S.mistakes <= 2 ? 3 : t < 80 && S.mistakes <= 5 ? 2 : 1; main = fmtTime(t); sub = S.mistakes + " oops (non-targets broken)"; isBest = best == null || S.score > best; if (isBest) P.best[md] = S.score; }
    if (md === "chain" || md === "precision") { const r = S.broken / Math.max(1, S.total); stars = r >= (md === "chain" ? 0.9 : 0.8) ? 3 : r >= (md === "chain" ? 0.65 : 0.55) ? 2 : 1; main = S.broken + " / " + S.total + " broken"; sub = S.score + " points"; isBest = best == null || S.broken > best; if (isBest) P.best[md] = S.broken; }
    if (md === "survival") { const t = S.t; stars = t >= M.stars[2] ? 3 : t >= M.stars[1] ? 2 : t >= M.stars[0] ? 1 : 0; main = fmtTime(t) + " survived"; sub = S.broken + " things broken"; isBest = best == null || t > best; if (isBest) P.best[md] = Math.round(t); }
    P.stars[md] = Math.max(P.stars[md] || 0, stars);
    checkAch(); save(true);
    A.fanfare();
    setTimeout(() => openModal(`<div class="results">
      <div class="mhead" style="justify-content:center"><h2>${M.icon} ${M.name}</h2></div>
      <div class="big-stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? "" : "no"}">⭐</span>`).join("")}</div>
      <div class="num">${esc(main)}</div><p class="muted">${esc(sub)}${isBest ? " · 🎉 new best!" : ""}</p>
      <div class="row"><button class="btn primary" data-a="again">↺ Play again</button><button class="btn" data-a="free">🔨 Free mode</button><button class="btn" data-a="menu">🏠 Menu</button></div></div>`, (a) => {
      if (a === "again") startMode(md); else if (a === "free") startMode("free"); else { closeModal(); showMenu(); }
    }), 700);
  }
  const fmtTime = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return (m ? m + ":" + String(s).padStart(2, "0") : s + "") + (m ? "" : "s"); };

  /* ---------- HUD ---------- */
  function updateHud(bump) {
    $("score").textContent = S.score.toLocaleString();
    $("brokenN").textContent = S.broken;
    if (bump) { const el = $("score").parentNode; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    const md = S.mode, h = $("modeHud");
    let html = "";
    if (md === "time") { const left = Math.max(0, 60 - S.t); html = `<div class="mode-pill ${left < 10 ? "warn" : ""}">⏱️ <span class="big">${Math.ceil(left)}</span>s</div>`; }
    else if (md === "complete") html = `<div class="mode-pill">🧹 <span class="big">${W.objects.length}</span> left · ${fmtTime(S.t)}</div>`;
    else if (md === "target") html = `<div class="mode-pill">🎯 <span class="big">${S.hitTargets}/${S.targets}</span> · ${fmtTime(S.t)}${S.mistakes ? " · ❌" + S.mistakes : ""}</div>`;
    else if (md === "chain" || md === "precision") html = `<div class="mode-pill">${md === "chain" ? "🧨" : "🎳"} Shots <span class="big">${S.shots}</span> · ${S.broken}/${S.total}</div>`;
    else if (md === "survival") { const k = Math.min(1, W.objects.length / S.limit); html = `<div class="mode-pill ${S.warnT > 0 ? "warn" : ""}">🌪️ ${fmtTime(S.t)} · clutter <div class="bar"><i style="width:${k * 100}%"></i></div></div>`; }
    h.innerHTML = html;
    updateCombo();
  }
  function updateCombo() {
    const c = $("combo");
    if (S.combo >= 2) { c.textContent = "×" + S.combo + " combo"; c.classList.add("show"); c.classList.toggle("hot", S.combo >= 8); }
    else c.classList.remove("show", "hot");
  }

  /* ---------- tools panel ---------- */
  const CAT = { hand: "Hands", hit: "Hit", throw: "Throw", special: "Special" };
  function renderTools() {
    const el = $("tools");
    el.innerHTML = Object.entries(CAT).map(([c, n]) => `<h5>${n}</h5><div class="tool-grid">${T.list.filter((t) => t.cat === c).map((t) => `<button class="tool ${t.id === T.current ? "active" : ""} ${toolOpen(t) ? "" : "locked"}" data-t="${t.id}" title="${esc(t.name + (toolOpen(t) ? " — " + t.tip : " — break " + (t.need - P.broken) + " more things to unlock"))}"><span class="ti">${t.icon}</span><span class="tn">${esc(t.name)}</span></button>`).join("")}</div>`).join("");
  }
  function selectTool(id) {
    const t = T.byId(id); if (!t) return;
    if (!toolOpen(t)) { toast("🔒 Break " + (t.need - P.broken) + " more things to unlock the " + t.name); return; }
    if (t.cat === "hand" && handInShotModes()) { toast("No hands in this mode. Pick a tool!"); return; }
    T.current = id; setPlacing(false);
    renderTools(); tip(t.icon + " " + t.name + " · " + t.tip);
    A.click();
  }
  $("tools").addEventListener("click", (e) => { const b = e.target.closest(".tool"); if (b) selectTool(b.dataset.t); });
  let tipT;
  function tip(m) { const t = $("toolTip"); t.textContent = m; t.style.opacity = 1; clearTimeout(tipT); tipT = setTimeout(() => (t.style.opacity = 0), 3200); }

  /* ---------- side panel: add & customise ---------- */
  const sideSel = { cat: "glass", id: "bottle", mat: "", color: "" };
  const COLORS = ["", "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac", "#ffffff", "#343a40", "#20c997", "#e8590c", "#a5d8ff", "#d0bfff", "#c0eb75"];
  function renderSide() {
    $("cats").innerHTML = Object.entries(BE.CATEGORIES).map(([k, n]) => `<button class="chip ${k === sideSel.cat ? "active" : ""}" data-c="${k}">${n}</button>`).join("");
    refreshObjBtns();
    $("matSel").innerHTML = `<option value="">Original</option>` + Object.entries(BE.MATERIALS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join("");
    $("swatches").innerHTML = COLORS.slice(0, 8).concat(COLORS.slice(8)).slice(0, 16).map((c) => `<button class="sw ${c === sideSel.color ? "active" : ""}" data-col="${c}" style="--c:${c || "conic-gradient(#ff6b6b,#ffd43b,#69db7c,#4dabf7,#ff6b6b)"}" title="${c ? c : "Original colours"}">${c ? "" : "↺"}</button>`).join("");
  }
  function refreshObjBtns() {
    sideSel.locked = P.broken;
    $("objs").innerHTML = BE.OBJECTS.filter((o) => o.cat === sideSel.cat).map((o) => `<button class="ob ${o.id === sideSel.id ? "active" : ""}" data-o="${o.id}" title="${esc(o.name)}">${o.icon}</button>`).join("");
  }
  $("cats").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; sideSel.cat = b.dataset.c; renderSide(); });
  $("objs").addEventListener("click", (e) => { const b = e.target.closest(".ob"); if (!b) return; sideSel.id = b.dataset.o; refreshObjBtns(); tip(BE.objectById(sideSel.id).icon + " " + BE.objectById(sideSel.id).name + " selected · press ➕ Add or 📍 Click to place"); });
  $("swatches").addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (!b) return; sideSel.color = b.dataset.col; renderSide(); });
  $("matSel").addEventListener("change", (e) => (sideSel.mat = e.target.value));
  $("size").addEventListener("input", (e) => ($("sizeVal").textContent = e.target.value + "%"));
  $("qty").addEventListener("input", (e) => ($("qtyVal").textContent = e.target.value));
  const spawnOpts = () => ({ scale: +$("size").value / 100, material: sideSel.mat || undefined, color: sideSel.color || undefined });
  function roomFull() { if (W.objects.length >= 90) { toast("The room is full! Break something first 😄"); return true; } return false; }
  $("addBtn").addEventListener("click", () => {
    A.unlock();
    if (!$("mainMenu").hidden) $("mainMenu").hidden = true;
    const q = +$("qty").value, def = BE.objectById(sideSel.id);
    let n = 0;
    for (let i = 0; i < q; i++) {
      if (roomFull()) break;
      const o = spawnOpts(), probe = BE.build(def, o), spot = W.freeSpot(probe.radius);
      if (!spot) break;
      W.spawn(def.id, Object.assign(o, { x: spot.x, z: spot.z, y: 0.25 + i * 0.05, ry: R(-0.5, 0.5), grace: 1.5 })); n++;
    }
    if (n) { S.total = (S.total || 0) + n; A.click(); tip("➕ Added " + n + " × " + def.name); updateHud(); }
  });
  let placing = false;
  function setPlacing(on) {
    placing = on;
    $("placeBtn").classList.toggle("on", on);
    T.placing = on ? (pk) => {
      if (!pk.point) return;
      if (roomFull()) return;
      const def = BE.objectById(sideSel.id);
      const up = pk.normal && pk.normal.y > 0.6;
      W.spawn(def.id, Object.assign(spawnOpts(), { x: Math.max(-4.6, Math.min(4.6, pk.point.x)), z: Math.max(-3.7, Math.min(2.2, pk.point.z)), y: (up ? pk.point.y : pk.point.y + 0.2) + 0.02, ry: R(-0.4, 0.4), grace: 1.5 }));
      S.total = (S.total || 0) + 1; A.click(); updateHud();
    } : null;
    if (on) tip("📍 Click anywhere in the room to place " + BE.objectById(sideSel.id).name + "s. Click 📍 again to stop.");
  }
  $("placeBtn").addEventListener("click", () => setPlacing(!placing));

  /* ---------- top bar ---------- */
  const VIEW_NAMES = { normal: "🎥 Normal", close: "🔍 Close-up", top: "⬇️ Top", left: "◀ Left", right: "▶ Right" };
  function renderViewMenu() { $("viewMenu").innerHTML = W.VIEWS.map((v) => `<button data-v="${v}" class="${v === W.view ? "active" : ""}">${VIEW_NAMES[v]}</button>`).join("") + `<button data-v="reset">↺ Reset camera</button>`; }
  $("viewBtn").addEventListener("click", (e) => { e.stopPropagation(); renderViewMenu(); $("viewMenu").hidden = !$("viewMenu").hidden; });
  $("viewMenu").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v === "reset" ? "normal" : b.dataset.v; W.setView(v); $("viewName").textContent = VIEW_NAMES[v].split(" ").slice(1).join(" "); $("viewMenu").hidden = true; });
  document.addEventListener("click", () => ($("viewMenu").hidden = true));
  $("menuBtn").addEventListener("click", showMenu);
  $("modeBtn").addEventListener("click", showModes);
  $("resetBtn").addEventListener("click", () => startMode(S.mode));
  $("newBtn").addEventListener("click", () => { if (S.mode !== "free") return; W.clearAll(); W.setEnv(prefs.env); W.layout(envItems()); S.total = W.objects.length; tip("📦 Fresh collection delivered"); A.click(); });
  $("debrisBtn").addEventListener("click", () => { W.clearDebris(); tip("🧹 Swept!"); A.click(); });
  function replay() {
    if (W.replay()) { P.replays++; checkAch(); save(); } else toast("Break something first, then replay it!");
  }
  $("replayBtn").addEventListener("click", replay);
  $("skipReplay").addEventListener("click", () => W.stopReplay());
  W.on("replay", (on) => { $("replayBadge").hidden = !on; });
  function setSlow(on) { W.slow = on; $("slowBtn").classList.toggle("on", on); tip(on ? "🐢 Slow motion on" : "Normal speed"); }
  $("slowBtn").addEventListener("click", () => setSlow(!W.slow));
  function applyPrefs() {
    A.on = prefs.sound; W.shakeOn = prefs.shake; W.fxOn = prefs.fx;
    $("soundBtn").textContent = prefs.sound ? "🔊" : "🔇"; $("soundBtn").classList.toggle("off", !prefs.sound);
    $("shakeBtn").classList.toggle("off", !prefs.shake); $("fxBtn").classList.toggle("off", !prefs.fx);
  }
  $("soundBtn").addEventListener("click", () => { prefs.sound = !prefs.sound; applyPrefs(); save(true); if (prefs.sound) A.click(); });
  $("shakeBtn").addEventListener("click", () => { prefs.shake = !prefs.shake; applyPrefs(); save(true); tip(prefs.shake ? "📳 Screen shake on" : "Screen shake off"); });
  $("fxBtn").addEventListener("click", () => { prefs.fx = !prefs.fx; applyPrefs(); save(true); tip(prefs.fx ? "✨ Full effects" : "Light effects (faster)"); });
  $("envBtn").addEventListener("click", showEnvs);
  $("statsBtn").addEventListener("click", showStats);
  $("fullBtn").addEventListener("click", () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("Fullscreen isn't available here"));
    else toast("Fullscreen isn't available here");
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.key === "Escape") { if (!$("modal").hidden) closeModal(); else if (W.replaying) W.stopReplay(); else showMenu(); }
    else if (e.key === "r" || e.key === "R") replay();
    else if (e.key === "s" || e.key === "S") setSlow(!W.slow);
    else if (e.key === "c" || e.key === "C") $("debrisBtn").click();
    else if (/^[1-9]$/.test(e.key)) { const open = T.list.filter(toolOpen); const t = open[+e.key - 1]; if (t) selectTool(t.id); }
  });

  /* ---------- modals ---------- */
  let modalCb = null;
  function openModal(html, cb) { $("modalCard").innerHTML = html; $("modal").hidden = false; modalCb = cb || null; T.release(); }
  function closeModal() { $("modal").hidden = true; modalCb = null; }
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) { if (!S.over || S.mode === "free") closeModal(); return; }
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "close") { closeModal(); return; }
    if (modalCb) modalCb(b.dataset.a, b);
  });
  const head = (title, sub) => `<div class="mhead"><div><h2>${title}</h2>${sub ? `<small class="muted">${sub}</small>` : ""}</div><button class="tb" data-a="close" title="Close">✕</button></div>`;
  const starStr = (n) => "⭐".repeat(n || 0) + "☆".repeat(3 - (n || 0));
  function bestStr(md) {
    const b = P.best[md]; if (b == null) return "not played yet";
    if (md === "complete" || md === "target") return md === "complete" ? "best " + fmtTime(b) : "best " + b + " pts";
    if (md === "survival") return "best " + fmtTime(b);
    if (md === "time") return "best " + b + " pts";
    return "best " + b + " broken";
  }
  function showModes() {
    openModal(head("🎮 Game modes", "Room: " + W.env.icon + " " + W.env.name + " (change it in 🏠 Environments)") + `<div class="cards">${Object.entries(MODES).map(([k, m]) => `<button class="card ${k === S.mode ? "active" : ""}" data-a="${k}"><span class="ci">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>${k === "free" ? "" : `<span class="stars">${starStr(P.stars[k])}</span><small>${bestStr(k)}</small>`}</button>`).join("")}</div>`, (a) => startMode(a));
  }
  function showEnvs() {
    openModal(head("🏠 Environments", "Pick a room to wreck") + `<div class="cards">${W.ENVS.map((e) => { const open = envOpen(e.id); return `<button class="card ${e.id === prefs.env ? "active" : ""} ${open ? "" : "locked"}" data-a="${e.id}"><span class="ci">${e.icon}</span><b>${e.name}</b><small>${e.items.filter((i) => i[1] > 0).reduce((s, i) => s + i[1] * ((i[3] && i[3].stack) || 1), 0)} things to break</small>${open ? `<small>${P.envs[e.id] ? P.envs[e.id] + " broken here" : "fresh & unbroken"}</small>` : `<span class="lock">🔒 break ${ENV_NEED[e.id] - P.broken} more</span>`}</button>`; }).join("")}</div>`, (a) => {
      if (!envOpen(a)) { toast("🔒 Break " + (ENV_NEED[a] - P.broken) + " more things to open this room"); return; }
      prefs.env = a; save(true); startMode(S.mode === "chain" || S.mode === "precision" || S.mode === "free" ? S.mode : "free");
    });
  }
  function showObjects() {
    const seen = BE.OBJECTS.filter((o) => P.byObj[o.id]).length;
    openModal(head("🍽️ Object collection", `${seen} / ${BE.OBJECTS.length} discovered · tap one to add it to the room`) + Object.entries(BE.CATEGORIES).map(([c, n]) => `<h3>${n}</h3><div class="mini-cards">${BE.OBJECTS.filter((o) => o.cat === c).map((o) => { const k = P.byObj[o.id] || 0; const mat = BE.MATERIALS[o.parts()[0].m].name; return `<button class="mini ${k ? "" : "unseen"}" data-a="${o.id}"><span class="ci">${o.icon}</span><b style="font-size:.8rem">${esc(o.name)}</b><small>${mat} · ${k ? k + " broken" : "never broken"}</small></button>`; }).join("")}</div>`).join(""), (a) => {
      sideSel.id = a; sideSel.cat = BE.objectById(a).cat; renderSide(); closeModal();
      if (S.mode !== "free" && !$("mainMenu").hidden) startMode("free");
      $("mainMenu").hidden = true;
      $("addBtn").click();
    });
  }
  function showToolsC() {
    openModal(head("🧰 Tool collection", T.list.filter(toolOpen).length + " / " + T.list.length + " unlocked · you've broken " + P.broken + " things") + Object.entries(CAT).map(([c, n]) => `<h3>${n}</h3><div class="cards">${T.list.filter((t) => t.cat === c).map((t) => { const open = toolOpen(t); return `<button class="card ${open ? "" : "locked"} ${t.id === T.current ? "active" : ""}" data-a="${t.id}"><span class="ci">${t.icon}</span><b>${t.name}</b><small>${t.tip}</small><small>${open ? (P.tools[t.id] ? "used " + P.tools[t.id] + "×" : "never used") : ""}</small>${open ? "" : `<span class="lock">🔒 ${t.need - P.broken} more</span>`}</button>`; }).join("")}</div>`).join("") + (P.unlockAll ? "" : `<p class="muted" style="margin-top:14px">Don't feel like earning them? <button class="btn" data-a="__all">🔓 Unlock everything</button></p>`), (a) => {
      if (a === "__all") { P.unlockAll = true; for (const t of T.list) P.seen["t" + t.id] = 1; for (const e of W.ENVS) P.seen["e" + e.id] = 1; save(true); renderTools(); showToolsC(); toast("🔓 Everything unlocked. Go wild."); return; }
      const t = T.byId(a); if (!toolOpen(t)) { toast("🔒 Break " + (t.need - P.broken) + " more things to unlock it"); return; }
      closeModal(); if (!$("mainMenu").hidden) startMode("free"); selectTool(a);
    });
  }
  function showStats() {
    const fav = Object.entries(P.tools).sort((a, b) => b[1] - a[1])[0];
    const favT = fav && T.byId(fav[0]);
    const hrs = P.playtime / 3600;
    const stat = (v, l) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`;
    const bars = (obj, label) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...e.map((x) => x[1])); return e.length ? `<div class="bars">${e.map(([k, v]) => `<div class="brow"><span>${label(k)}</span><span class="track"><i style="width:${(v / max) * 100}%"></i></span><span>${v}</span></div>`).join("")}</div>` : `<p class="muted">Nothing yet. Go break something!</p>`; };
    const got = ACH.filter((a) => P.ach[a[0]]).length;
    openModal(head("📊 My statistics", "Your career in destruction") + `<div class="stat-grid">
      ${stat(P.broken.toLocaleString(), "things broken")}${stat(P.score.toLocaleString(), "total points")}${stat(P.frags.toLocaleString(), "pieces created")}${stat("×" + P.bestCombo, "best combo")}
      ${stat(P.explosions, "explosions")}${stat(P.crushed, "things crushed")}${stat(hrs >= 1 ? hrs.toFixed(1) + " h" : Math.round(P.playtime / 60) + " min", "stress relieved")}${stat(favT ? favT.icon + " " + favT.name : "—", "favourite tool")}
      ${stat(BE.OBJECTS.filter((o) => P.byObj[o.id]).length + "/" + BE.OBJECTS.length, "objects discovered")}${stat(got + "/" + ACH.length, "achievements")}</div>
      <h3>By material</h3>${bars(P.byMat, (k) => (BE.MATERIALS[k] || { name: k }).name)}
      <h3>By kind</h3>${bars(P.byCat, (k) => BE.CATEGORIES[k] || k)}
      <h3>Tools used</h3>${bars(P.tools, (k) => { const t = T.byId(k); return t ? t.icon + " " + t.name : k; })}
      <h3>Game modes</h3><div class="cards">${Object.entries(MODES).filter(([k]) => k !== "free").map(([k, m]) => `<div class="card"><b>${m.icon} ${m.name}</b><span class="stars">${starStr(P.stars[k])}</span><small>${bestStr(k)}</small></div>`).join("")}</div>
      <h3>Achievements</h3><div class="ach">${ACH.map(([id, icon, name, desc]) => `<div class="${P.ach[id] ? "" : "no"}"><span class="ai">${icon}</span><span><b>${name}</b><small>${desc}</small></span></div>`).join("")}</div>
      <p class="muted" style="margin-top:14px"><button class="btn" data-a="reset">🗑️ Reset all statistics</button></p>`, (a) => {
      if (a === "reset" && confirm("Reset all statistics, unlocks and achievements?")) { P = fresh(); save(true); renderTools(); showStats(); }
    });
  }
  function showMenu() { T.release(); closeModal(); $("mainMenu").hidden = false; }
  $("mainMenu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    A.unlock(); A.click();
    const m = b.dataset.m;
    if (m === "free") startMode("free");
    else if (m === "modes") showModes();
    else if (m === "objects") showObjects();
    else if (m === "toolsC") showToolsC();
    else if (m === "envs") showEnvs();
    else if (m === "stats") showStats();
  });

  /* ---------- boot ---------- */
  if (!envOpen(prefs.env)) prefs.env = "empty";
  for (const t of T.list) if (toolOpen(t)) P.seen["t" + t.id] = 1;
  for (const e of W.ENVS) if (envOpen(e.id)) P.seen["e" + e.id] = 1;
  W.init($("stage"));
  T.init(W.canvas());
  applyPrefs();
  renderTools(); renderSide();
  W.setEnv(prefs.env);
  W.layout(envItems());
  S.total = W.objects.length;
  updateHud();
  W.start();

  // test hooks
  BE.app = { S, P: () => P, startMode, finish, selectTool, MODES, ACH, showStats, showObjects, showToolsC, showEnvs, showModes, closeModal };
})();
