/* ============ DOMINO UNIVERSE — app: input, panels, modes, levels, saves ============ */
(function () {
  "use strict";
  const D = window.DOM, W = D.world, B = D.build, A = D.audio;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const V3 = THREE.Vector3;
  let toastT, hintT;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2400); }
  function hint(m, ms) { const h = $("hint"); h.textContent = m; h.style.opacity = 1; clearTimeout(hintT); hintT = setTimeout(() => (h.style.opacity = 0), ms || 3200); }
  B.say = hint;

  /* ---------- saves ---------- */
  const KEY = "nsh-domino";
  const fresh = () => ({ levels: {}, creations: [], settings: { sfx: 0.8, music: 0.35, musicOn: true, gravity: 2.6, fx: { sparks: true, recolour: false, confetti: true, flash: true } }, last: null, stats: { fallen: 0, runs: 0, placed: 0 } });
  let S = fresh();
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r) { S = Object.assign(fresh(), r); S.settings = Object.assign(fresh().settings, r.settings || {}); S.settings.fx = Object.assign(fresh().settings.fx, (r.settings || {}).fx || {}); S.stats = Object.assign(fresh().stats, r.stats || {}); } } catch (e) { /* private mode */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save — storage is full or blocked"); } }
  function applySettings() { A.sfx = S.settings.sfx; A.music = S.settings.music; A.musicOn = S.settings.musicOn; A.setVolumes(); W.settings.gravity = S.settings.gravity; W.settings.fx = S.settings.fx; }
  applySettings();

  /* ---------- boot ---------- */
  W.init($("stage"));
  W.setEnv("table");
  W.rebuild();

  /* =========================================================
     MODES
     ========================================================= */
  const M = { kind: "free", level: null, data: null };
  function setLabel(t) { $("modeLabel").textContent = t; }
  function loadCon(con, opts) {
    opts = opts || {};
    if (W.mode === "sim") W.stopSim();
    W.con = { env: con.env || "table", dominoes: (con.dominoes || []).map((d) => Object.assign({}, d)), objects: (con.objects || []).map((o) => Object.assign({}, o)) };
    W.setEnv(W.con.env);
    W.setGhosts(opts.ghosts || []);
    B.placed = 0; B.budget = opts.budget == null ? Infinity : opts.budget;
    B.clearHistory();
    W.rebuild();
    if (!opts.keepCam) W.frameAll(true);
    refreshAll();
  }
  function startFree(con, label) {
    M.kind = "free"; M.level = null; M.data = null;
    W.settings.speed = 1;
    loadCon(con || { env: W.con.env, dominoes: [], objects: [] });
    setLabel(label || "🧱 Free Build");
    $("menu").hidden = true;
    renderTools(); renderSide(); goalPill();
    hint("Pick a tool on the left and click the floor. Right-drag to look around, wheel to zoom.", 4500);
  }
  /* ---------- levels ---------- */
  function startLevel(i, kind) {
    const L = D.LEVELS[i], b = L.build();
    M.kind = kind || "level"; M.level = i; M.data = b;
    W.settings.speed = L.speed || 1;
    const gaps = new Set(b.gaps || []);
    const doms = b.dominoes.filter((d) => !gaps.has(d));
    let ghosts = (b.gaps || []).map((g) => Object.assign({}, g));
    if (M.kind === "perfect") {
      // a finished build with a few mistakes hidden in it: fix them
      ghosts = [];
      const all = b.dominoes.map((d) => Object.assign({}, d));
      const idxs = [];
      while (idxs.length < Math.min(3, Math.floor(all.length / 6))) { const k = 3 + Math.floor(Math.random() * (all.length - 6)); if (!idxs.includes(k) && !all[k].lying) idxs.push(k); }
      for (const k of idxs) { const d = all[k]; if (Math.random() < 0.5) d.a += Math.PI / 2; else { d.x += Math.cos(d.a) * 0.6; d.z -= Math.sin(d.a) * 0.6; } d.wrong = true; }
      M.wrong = idxs.length;
      loadCon({ env: L.env || "table", dominoes: all, objects: b.objects }, { ghosts, budget: Infinity });
      // the start domino index stays the same
      B.budget = Infinity;
    } else loadCon({ env: L.env || "table", dominoes: doms, objects: b.objects }, { ghosts, budget: ghosts.length ? ghosts.length + 2 : 0 });
    // remember which dominoes are the starters (indices shift because gaps were removed)
    M.starts = b.starts.map((si) => (M.kind === "perfect" ? si : doms.indexOf(b.dominoes[si]))).filter((x) => x >= 0);
    M.pushesLeft = L.pushes || b.pushes || 0;
    setLabel((M.kind === "perfect" ? "✨ Perfect: " : "🏁 ") + (i + 1) + ". " + L.name);
    $("menu").hidden = true;
    renderTools(); renderSide(); goalPill();
    markStarts();
    const msg = M.kind === "perfect" ? M.wrong + " dominoes are out of place. Select them (👆) and fix, rotate or delete them, then ▶ Start." : L.desc + (ghosts.length ? " Click the glowing ghosts to fill the gaps." : "") + (M.pushesLeft ? " You get " + M.pushesLeft + " pushes: press ▶ then tap dominoes." : "");
    hint(msg, 6500);
  }
  let startMarks = [];
  function markStarts() {
    for (const m of startMarks) W.scene.remove(m);
    startMarks = [];
    if (M.kind !== "level" && M.kind !== "puzzle" && M.kind !== "perfect" && M.kind !== "speed") return;
    if (M.pushesLeft) return;
    for (const si of M.starts || []) {
      const d = W.con.dominoes[si]; if (!d) continue;
      const g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 16), new THREE.MeshBasicMaterial({ color: "#40c057" }));
      cone.rotation.x = Math.PI; cone.position.y = 1.7;
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 12), new THREE.MeshBasicMaterial({ color: "#40c057" }));
      arrow.rotation.x = Math.PI / 2; arrow.position.set(0, 0.25, 0.6);
      g.add(cone, arrow); g.position.set(d.x, d.y || 0, d.z); g.rotation.y = d.a || 0;
      W.scene.add(g); startMarks.push(g);
    }
  }
  W.on("frame", (dt) => { for (const g of startMarks) g.children[0].position.y = 1.7 + Math.sin(performance.now() / 250) * 0.08; void dt; });

  /* ---------- speed build ---------- */
  function startSpeed() {
    const ang = Math.random() * Math.PI * 2, dist = 11 + Math.random() * 3;
    const a = { x: -Math.cos(ang) * dist / 2, z: -Math.sin(ang) * dist / 2 }, b = { x: Math.cos(ang) * dist / 2, z: Math.sin(ang) * dist / 2 };
    const face = Math.atan2(b.x - a.x, b.z - a.z);
    M.kind = "speed"; M.level = null; M.time = 60; M.started = false;
    W.settings.speed = 1;
    loadCon({ env: "playground", dominoes: [{ x: a.x, z: a.z, a: face, type: "trigger", channel: 0 }], objects: [{ kind: "bell", x: b.x, z: b.z, y: 1.2 }] }, { budget: Infinity });
    M.starts = [0];
    setLabel("⏱️ Speed Build");
    $("menu").hidden = true;
    B.tool = "path"; renderTools(); renderSide(); goalPill(); markStarts();
    hint("Build a domino path from the ⚡ start to the 🔔 bell before the timer runs out!", 5000);
  }
  setInterval(() => {
    if (M.kind === "speed" && W.mode === "edit" && $("menu").hidden && $("modal").hidden && M.time > 0) { M.time -= 0.25; goalPill(); if (M.time <= 0) { hint("⏰ Time! Let's see if it works…"); run(); } }
  }, 250);

  /* ---------- massive chain ---------- */
  function startMassive(n) {
    M.kind = "massive"; M.level = null;
    W.settings.speed = 2.5;
    loadCon({ env: "hall", dominoes: B.massive(n), objects: [] });
    M.starts = [0];
    setLabel("🌊 Massive Chain · " + W.con.dominoes.length.toLocaleString());
    $("menu").hidden = true;
    renderTools(); renderSide(); goalPill(); markStarts();
    hint(W.con.dominoes.length.toLocaleString() + " dominoes. Press ▶ Start and watch (runs at 2.5× speed).", 4500);
  }

  /* =========================================================
     RUNNING THE SIMULATION
     ========================================================= */
  function run() {
    if (W.mode === "sim") return;
    if (!W.con.dominoes.length) { toast("Place some dominoes first!"); return; }
    A.unlock();
    M.preRun = JSON.stringify(W.con.dominoes.map(B.clean));
    W.startSim();
    S.stats.runs++;
    if (M.pushesLeft) { hint("Tap a domino to push it — " + M.pushesLeft + " pushes"); }
    else if (M.starts && M.starts.length && M.kind !== "free" && M.kind !== "creative") { for (const s of M.starts) W.push(s, 1); }
    else hint("Click a domino to knock it over 👉");
    runUi();
  }
  function stop() { if (W.mode !== "sim") return; W.stopSim(); markStarts(); runUi(); goalPill(); if (M.kind === "speed") { M.time = Math.max(M.time, 0); } }
  function runUi() {
    const sim = W.mode === "sim";
    $("startBtn").hidden = sim; $("stopBtn").hidden = !sim; $("resetBtn").hidden = !sim;
    $("replayBtn").hidden = !sim;
    document.querySelectorAll("#tools button, #side button, #side input").forEach((b) => (b.disabled = sim && !b.closest(".keep")));
    ["undoBtn", "redoBtn", "randomBtn", "clearBtn"].forEach((id) => ($(id).disabled = sim));
    if (!sim) refreshAll();
  }
  $("startBtn").addEventListener("click", run);
  $("stopBtn").addEventListener("click", stop);
  $("resetBtn").addEventListener("click", () => { stop(); hint("Everything's standing again"); });
  $("slowBtn").addEventListener("click", () => { W.settings.slow = !W.settings.slow; $("slowBtn").classList.toggle("on", W.settings.slow); hint(W.settings.slow ? "🐢 Slow motion" : "Normal speed"); });
  $("replayBtn").addEventListener("click", () => { if (W.replaying) W.stopReplay(); else if (!W.replay()) toast("Run the chain reaction first, then replay it"); });
  W.on("replay", (on) => { $("replayBtn").classList.toggle("on", on); if (on) hint("🎬 Cinematic replay"); });
  W.on("fallen", (n, total) => { goalPill(n, total); });
  W.on("done", (r) => {
    S.stats.fallen += r.fallen; save();
    goalPill(r.fallen, r.total);
    if (M.kind === "free" || M.kind === "creative" || M.kind === "massive") { hint(r.fallen === r.total ? "🎉 All " + r.total.toLocaleString() + " fell! 🎬 to replay" : r.fallen + " of " + r.total + " fell. Reset and tweak it!", 5000); return; }
    setTimeout(() => results(r), 900);
  });
  W.on("bell", () => { if (M.kind === "speed") hint("🔔 Ding!"); });

  function results(r) {
    if (W.mode !== "sim") return;
    const L = M.level != null ? D.LEVELS[M.level] : null;
    const needBell = (L && M.data && M.data.goal === "bell") || M.kind === "speed";
    const all = r.fallen === r.total, win = needBell ? r.bell : all;
    const pct = r.fallen / r.total;
    const stars = win ? (all ? 3 : 2) : pct >= 0.75 ? 1 : 0;
    let title = win ? "🎉 Perfect chain reaction!" : "Almost!";
    if (M.kind === "speed") title = r.bell ? "🔔 You rang the bell!" : "The chain didn't reach the bell";
    if (L && win) { const k = (M.kind === "perfect" ? "p" : "") + M.level; S.levels[k] = Math.max(S.levels[k] || 0, stars); save(); }
    const next = L && win && M.level + 1 < D.LEVELS.length ? M.level + 1 : null;
    openModal(`<div class="res"><div class="big">${win ? "🏆" : "🤏"}</div><h2>${title}</h2>
      <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <p>${r.fallen.toLocaleString()} of ${r.total.toLocaleString()} dominoes fell in ${r.time.toFixed(1)}s${needBell ? (r.bell ? " · the bell rang 🔔" : " · the bell stayed quiet") : ""}</p>
      <div class="row">${next !== null ? `<button class="btn primary" data-a="next">Next level →</button>` : ""}<button class="btn" data-a="retry">↺ ${win ? "Replay" : "Try again"}</button><button class="btn" data-a="replay">🎬 Watch replay</button><button class="btn" data-a="levels">🗺️ Levels</button></div></div>`, (a) => {
      closeModal();
      if (a === "next") startLevel(next, M.kind);
      else if (a === "retry") { stop(); if (M.kind === "speed") startSpeed(); }
      else if (a === "replay") W.replay();
      else if (a === "levels") { stop(); levelsModal(M.kind === "perfect" ? "perfect" : M.kind === "puzzle" ? "puzzle" : "level"); }
    });
  }
  function goalPill(n, total) {
    const p = $("goalPill");
    const cnt = W.con.dominoes.length;
    $("countPill").textContent = W.mode === "sim" && W.sim ? "💥 " + (n != null ? n : W.sim.fallen).toLocaleString() + " / " + (total || W.sim.total).toLocaleString() + " fallen" : cnt.toLocaleString() + " dominoes" + (W.con.objects.length ? " · " + W.con.objects.length + " parts" : "");
    let t = "";
    if (M.kind === "speed") t = "⏱️ " + Math.ceil(Math.max(0, M.time)) + "s left";
    else if ((M.kind === "level" || M.kind === "puzzle") && (W.ghosts || []).length) { const left = W.ghosts.filter((g) => !g.filled).length; t = left ? "Fill " + left + " gap" + (left > 1 ? "s" : "") + " · " + Math.max(0, B.budget - B.placed) + " spare" : "✓ Gaps filled — press ▶ Start"; }
    else if (M.pushesLeft && W.mode === "sim") t = "👉 " + (M.pushesLeft) + " push" + (M.pushesLeft > 1 ? "es" : "") + " left";
    else if (M.kind === "perfect") t = "Fix the " + M.wrong + " misplaced dominoes";
    p.hidden = !t; p.textContent = t;
  }

  /* =========================================================
     TOOLS PANEL
     ========================================================= */
  const TOOLS = [
    ["select", "👆", "Select & move"], ["single", "➕", "Single"], ["line", "📏", "Line"], ["path", "✍️", "Draw path"],
    ["pattern", "🔷", "Patterns"], ["structure", "🏗️", "Structures"], ["object", "⚙️", "Machines"], ["erase", "🧽", "Erase"]
  ];
  const PATTERNS = [["line", "➖", "Line"], ["curve", "〰️", "Curve"], ["circle", "⭕", "Circle"], ["spiral", "🌀", "Spiral"], ["zigzag", "⚡", "Zigzag"], ["triangle", "🔺", "Triangle"], ["square", "⬜", "Square"], ["star", "⭐", "Star"], ["heart", "💖", "Heart"], ["wave", "🌊", "Wave"]];
  const STRUCTS = [["stairs", "🪜", "Stairs"], ["bridge", "🌉", "Bridge"], ["tower", "🗼", "Tower"], ["split", "🔱", "Split"], ["loop", "🔄", "Loop"], ["maze", "🌀", "Maze"]];
  const TIPS = {
    select: "Click to select (Shift adds). Drag on empty floor for a box. Drag a selected piece to move it. ⌫ delete, Ctrl+D duplicate, R rotate.",
    single: "Click to place one domino. Placing near the last one keeps the direction going. R rotates.",
    line: "Press and drag to lay a straight line.",
    path: "Drag to draw any path — dominoes follow your finger.",
    pattern: "Press at the centre and drag outwards: the distance sets the size, the direction sets the rotation.",
    structure: "Press and drag to place it pointing in the drag direction.",
    object: "Press and drag to place a machine part facing the drag direction.",
    erase: "Click or drag over dominoes and parts to remove them."
  };
  function levelLocked() { return M.kind === "level" || M.kind === "puzzle"; }
  function renderTools() {
    const el = $("tools");
    const lockedTools = levelLocked() ? ["single", "erase", "select"] : M.kind === "perfect" ? ["select", "erase"] : null;
    if (lockedTools && !lockedTools.includes(B.tool)) B.tool = lockedTools[0] === "select" && M.kind === "perfect" ? "select" : "single";
    let h = `<h5>Tools</h5><div class="tgrid">${TOOLS.map(([id, ic, n]) => `<button class="tool ${B.tool === id ? "on" : ""}" data-tool="${id}" ${lockedTools && !lockedTools.includes(id) ? "disabled" : ""}><span class="ti">${ic}</span><span class="tn">${n}</span></button>`).join("")}</div>`;
    if (B.tool === "pattern") h += `<h5>Pattern</h5><div class="subgrid">${PATTERNS.map(([id, ic, n]) => `<button class="${B.pattern === id ? "on" : ""}" data-pat="${id}"><span>${ic}</span>${n}</button>`).join("")}</div>`;
    if (B.tool === "structure") h += `<h5>Structure</h5><div class="subgrid">${STRUCTS.map(([id, ic, n]) => `<button class="${B.structure === id ? "on" : ""}" data-str="${id}"><span>${ic}</span>${n}</button>`).join("")}</div>`;
    if (B.tool === "object") h += `<h5>Machine part</h5><div class="subgrid">${D.OBJECTS.map((o) => `<button class="${B.object === o.id ? "on" : ""}" data-obj="${o.id}" title="${esc(o.desc)}"><span>${o.icon}</span>${o.name}</button>`).join("")}</div>`;
    if (B.tool === "select") h += `<h5>Selection</h5><div class="row"><button class="btn" data-sel="dup">⧉ Duplicate</button><button class="btn" data-sel="rot">⟳ Rotate</button><button class="btn" data-sel="del">🗑 Delete</button><button class="btn" data-sel="all">Select all</button></div>`;
    h += `<p class="desc">${TIPS[B.tool]}</p>`;
    el.innerHTML = h;
  }
  $("tools").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tool]"), p = e.target.closest("[data-pat]"), s = e.target.closest("[data-str]"), o = e.target.closest("[data-obj]"), sel = e.target.closest("[data-sel]");
    if (t) { B.tool = t.dataset.tool; W.preview(null); hint(TIPS[B.tool], 4000); }
    else if (p) B.pattern = p.dataset.pat;
    else if (s) B.structure = s.dataset.str;
    else if (o) { B.object = o.dataset.obj; hint(D.OBJECTS.find((q) => q.id === B.object).desc); }
    else if (sel) { const a = sel.dataset.sel; if (a === "dup") B.duplicateSel(); else if (a === "rot") B.rotateSel(Math.PI / 12); else if (a === "del") B.deleteSel(); else { W.con.dominoes.forEach((d) => (d.sel = true)); W.con.objects.forEach((q) => (q.sel = true)); B.changed(); } }
    else return;
    A.play("ui"); renderTools();
  });

  /* ---------- side panel ---------- */
  const COLS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#748ffc", "#b197fc", "#f783ac", "#ffffff", "#adb5bd", "#343a40", "rainbow"];
  function renderSide() {
    const t = D.typeById(B.type);
    const sl = (id, label, min, max, step, val, fmt) => `<label class="slider"><span>${label} <b id="${id}V">${fmt(val)}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
    $("side").innerHTML = `
      <section><h4>Domino</h4><div class="types">${D.TYPES.map((q) => `<button class="ty ${q.id === B.type ? "on" : ""}" data-type="${q.id}" title="${esc(q.name + " — " + q.desc)}">${q.icon}</button>`).join("")}</div>
        <p class="desc"><b>${t.name}:</b> ${t.desc}</p>
        ${t.colourable ? `<div class="swatches">${COLS.map((c) => `<button class="sw ${B.color === c ? "on" : ""}" data-col="${c}" style="--c:${c === "rainbow" ? "conic-gradient(#ff6b6b,#ffd43b,#69db7c,#4dabf7,#b197fc,#ff6b6b)" : c}"></button>`).join("")}<label class="sw" style="--c:conic-gradient(#ff6b6b,#ffd43b,#69db7c,#4dabf7,#b197fc,#ff6b6b);position:relative" title="Custom colour"><input type="color" id="colPick" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>` : ""}
        ${t.id === "trigger" || ["switch", "pendulum", "spinner", "slider"].includes(B.object) ? `<h4>Channel</h4><div class="chans">${[1, 2, 3].map((c) => `<button data-ch="${c}" class="${B.channel === c ? "on" : ""}" style="background:${["", "#ff6b6b", "#4dabf7", "#51cf66"][c]}">${c}</button>`).join("")}</div><p class="desc">Trigger dominoes and switches start every machine on the same channel.</p>` : ""}
      </section>
      <section><h4>Placement</h4>
        ${sl("spacing", "Spacing", 0.4, 0.95, 0.01, B.spacing, (v) => Math.round(v * 100) + "%")}
        ${sl("scale", "Size", 0.6, 1.6, 0.05, B.scale, (v) => Math.round(v * 100) + "%")}
        ${sl("rot", "Rotation", 0, 345, 15, Math.round((B.rot * 180) / Math.PI) % 360, (v) => v + "°")}
        <label class="chk"><input type="checkbox" id="snapChk" ${B.snap ? "checked" : ""}> Grid snapping (0.25 · 15°)</label>
        <p class="desc">Spacing is a share of the domino's height: dominoes reach about 100%, the sweet spot is 50–70%.</p>
      </section>
      <section class="keep"><h4>Reaction</h4>
        ${sl("speedS", "Chain speed", 0.25, 3, 0.05, W.settings.speed, (v) => v.toFixed(2) + "×")}
        ${sl("gravS", "Falling speed", 1, 5, 0.1, S.settings.gravity, (v) => v.toFixed(1))}
        <label class="chk"><input type="checkbox" data-fx="sparks" ${S.settings.fx.sparks ? "checked" : ""}> ✨ Sparks</label>
        <label class="chk"><input type="checkbox" data-fx="recolour" ${S.settings.fx.recolour ? "checked" : ""}> 🌈 Colour-change wave</label>
        <label class="chk"><input type="checkbox" data-fx="confetti" ${S.settings.fx.confetti ? "checked" : ""}> 🎉 Finale confetti</label>
        <label class="chk"><input type="checkbox" data-fx="flash" ${S.settings.fx.flash ? "checked" : ""}> 💡 Neon flashes</label>
      </section>`;
    runUi();
  }
  $("side").addEventListener("click", (e) => {
    const t = e.target.closest("[data-type]"), c = e.target.closest("[data-col]"), ch = e.target.closest("[data-ch]");
    if (t) { B.type = t.dataset.type; renderSide(); A.play("ui"); }
    else if (c) { B.color = c.dataset.col === "rainbow" ? D.hsl(Math.random()) : c.dataset.col; B.rainbow = c.dataset.col === "rainbow"; renderSide(); }
    else if (ch) { B.channel = +ch.dataset.ch; renderSide(); }
  });
  $("side").addEventListener("input", (e) => {
    const id = e.target.id, v = +e.target.value;
    if (id === "spacing") B.spacing = v; else if (id === "scale") B.scale = v; else if (id === "rot") B.rot = (v * Math.PI) / 180;
    else if (id === "speedS") W.settings.speed = v; else if (id === "gravS") { S.settings.gravity = v; W.settings.gravity = v; save(); }
    else if (id === "colPick") { B.color = e.target.value; B.rainbow = false; }
    else if (id === "snapChk") B.snap = e.target.checked;
    else if (e.target.dataset.fx) { S.settings.fx[e.target.dataset.fx] = e.target.checked; save(); }
    const lab = document.getElementById(id + "V");
    if (lab) lab.textContent = id === "rot" ? v + "°" : id === "speedS" ? v.toFixed(2) + "×" : id === "gravS" ? v.toFixed(1) : Math.round(v * 100) + "%";
  });
  function refreshAll() { $("undoBtn").disabled = !B.canUndo() || W.mode === "sim"; $("redoBtn").disabled = !B.canRedo() || W.mode === "sim"; goalPill(); }
  B.onChange = () => { refreshAll(); if (B.rainbow) B.color = D.hsl(Math.random()); };

  /* =========================================================
     POINTER INPUT ON THE 3D STAGE
     ========================================================= */
  const cv = W.canvas;
  const ptrs = new Map();
  let act = null, pinch = null;
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  cv.addEventListener("wheel", (e) => { e.preventDefault(); W.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  cv.addEventListener("pointerdown", (e) => {
    A.unlock();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { cancelAct(); const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return; }
    if (W.replaying) return;
    // camera gestures: right or middle button, shift, or one finger during a run
    if (e.button === 2 || e.button === 1 || e.shiftKey && B.tool !== "select" || (W.mode === "sim" && e.pointerType !== "mouse")) { act = { kind: e.button === 1 || e.shiftKey ? "pan" : "orbit", x: e.clientX, y: e.clientY, moved: 0 }; return; }
    if (W.mode === "sim") {
      // during the run: click a domino to push it
      const i = W.pickDomino(e.clientX, e.clientY);
      if (i >= 0) {
        if (M.pushesLeft || M.kind === "free" || M.kind === "creative" || M.kind === "massive") {
          if (M.pushesLeft) { if (M.pushUsed >= M.pushesLeft) { hint("No pushes left — watch the chain!"); return; } }
          if (W.sim.bodies[i].fallen) return;
          W.push(i); if (M.pushesLeft) { M.pushUsed = (M.pushUsed || 0) + 1; hint("👉 " + (M.pushesLeft - M.pushUsed) + " pushes left"); }
        } else hint("This one starts on its own — just watch!");
        return;
      }
      act = { kind: "orbit", x: e.clientX, y: e.clientY, moved: 0 };
      return;
    }
    toolDown(e);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) { if (W.mode === "edit" && e.pointerType === "mouse") hover(e); return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      W.zoom(pinch.d / Math.max(10, d)); W.orbit(cx - pinch.cx, cy - pinch.cy);
      pinch = { d, cx, cy }; return;
    }
    if (!act) return;
    const dx = e.clientX - act.x, dy = e.clientY - act.y;
    act.moved += Math.abs(dx) + Math.abs(dy);
    if (act.kind === "orbit") { W.orbit(dx, dy); act.x = e.clientX; act.y = e.clientY; return; }
    if (act.kind === "pan") { W.pan(dx, dy); act.x = e.clientX; act.y = e.clientY; return; }
    toolMove(e);
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (act && act.kind !== "orbit" && act.kind !== "pan") toolUp(e); act = null; B.erasing = false; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  function cancelAct() { act = null; W.preview(null); selBoxEl.hidden = true; }

  // tool gestures
  const selBoxEl = Object.assign(document.createElement("div"), { hidden: true });
  selBoxEl.style.cssText = "position:fixed;border:2px dashed var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);pointer-events:none;z-index:30;border-radius:4px";
  document.body.appendChild(selBoxEl);
  function toolDown(e) {
    const p = W.pickSurface(e.clientX, e.clientY);
    const t = B.tool;
    act = { kind: t, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, p0: p, pts: p ? [[p.x, p.z]] : [], moved: 0 };
    if (t === "erase") { B.eraseAt(e.clientX, e.clientY); return; }
    if (t === "select") {
      const i = W.pickDomino(e.clientX, e.clientY), o = i < 0 ? W.pickObject(e.clientX, e.clientY) : -1;
      const item = i >= 0 ? W.con.dominoes[i] : o >= 0 ? W.con.objects[o] : null;
      if (item) {
        if (!item.sel && !e.shiftKey) B.clearSel();
        item.sel = e.shiftKey ? !item.sel : true;
        B.changed();
        if (item.sel) { B.checkpoint(); act.kind = "move"; act.last = p; }
      } else act.kind = "box";
      return;
    }
    if (!p) { act = null; return; }
    if (t === "single" || t === "path") preview();
  }
  function toolMove(e) {
    const p = W.pickSurface(e.clientX, e.clientY);
    act.x = e.clientX; act.y = e.clientY;
    if (act.kind === "erase") { B.eraseAt(e.clientX, e.clientY); return; }
    if (act.kind === "box") { const x0 = Math.min(act.x0, act.x), y0 = Math.min(act.y0, act.y); Object.assign(selBoxEl.style, { left: x0 + "px", top: y0 + "px", width: Math.abs(act.x - act.x0) + "px", height: Math.abs(act.y - act.y0) + "px" }); selBoxEl.hidden = false; return; }
    if (act.kind === "move") { if (p && act.last) { B.moveSel(p.x - act.last.x, p.z - act.last.z, false); act.last = p; } return; }
    if (!p) return;
    act.p1 = p;
    if (act.kind === "path") { const l = act.pts[act.pts.length - 1]; if (Math.hypot(p.x - l[0], p.z - l[1]) > 0.15) act.pts.push([p.x, p.z]); }
    preview();
  }
  function toolUp() {
    if (!act) return;
    const k = act.kind;
    if (k === "box") { selBoxEl.hidden = true; if (act.moved > 6) B.selectBox(act.x0, act.y0, act.x, act.y, false); else { B.clearSel(); B.changed(); } return; }
    if (k === "move") { B.moveSel(0, 0, true); return; }
    if (k === "erase") return;
    const items = build();
    W.preview(null);
    if (!items) return;
    const n = B.commit(items.dominoes || [], items.objects);
    if (n || (items.objects && items.objects.length)) { S.stats.placed += n; if (M.kind === "level" || M.kind === "puzzle") goalPill(); }
  }
  function build() {
    const a = act, p0 = a.p0; if (!p0) return null;
    const p1 = a.p1 || p0, dist = Math.hypot(p1.x - p0.x, p1.z - p0.z), dirA = dist > 0.3 ? Math.atan2(p1.x - p0.x, p1.z - p0.z) : B.rot;
    switch (a.kind) {
      case "single": return { dominoes: B.makeSingle(a.p1 || p0) };
      case "line": return dist > 0.3 ? { dominoes: B.makeLine(p0, p1) } : { dominoes: B.makeSingle(p0) };
      case "path": return a.pts.length > 2 ? { dominoes: B.makePath(a.pts, p0.y) } : { dominoes: B.makeSingle(p0) };
      case "pattern": return { dominoes: B.makePattern(B.pattern, p0, dist > 0.5 ? dist : 3, dist > 0.5 ? Math.atan2(p1.z - p0.z, p1.x - p0.x) : B.rot) };
      case "structure": return B.makeStructure(B.structure, p0, dirA);
      case "object": return { dominoes: [], objects: [B.makeObject(B.object, p0, dirA)] };
    }
    return null;
  }
  function preview() {
    const items = build();
    if (!items) return W.preview(null);
    const list = (items.dominoes || []).map((d) => Object.assign({}, d));
    B.fit(list);
    W.preview(list);
  }
  let hoverT = 0;
  function hover(e) {
    if (performance.now() - hoverT < 50 || act) return; hoverT = performance.now();
    if (B.tool !== "single") { return; }
    const p = W.pickSurface(e.clientX, e.clientY); if (!p) return W.preview(null);
    const list = B.makeSingle(p).map((d) => Object.assign({}, d)); B.fit(list); W.preview(list);
  }
  cv.addEventListener("pointerleave", () => { if (!act) W.preview(null); });

  /* ---------- camera buttons & keys ---------- */
  $("views").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (!b) return; W.setView(b.dataset.view); document.querySelectorAll("#views button").forEach((q) => q.classList.toggle("on", q === b)); hint({ orbit: "🎥 Free camera", top: "⬇️ Top-down", side: "↔️ Side view", follow: "🎯 Following the action", first: "👁️ First person" }[b.dataset.view]); });
  const keys = new Set();
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? B.redo() : B.undo(); refreshAll(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); B.redo(); refreshAll(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "d") { e.preventDefault(); B.duplicateSel(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "a") { e.preventDefault(); W.con.dominoes.forEach((d) => (d.sel = true)); B.changed(); return; }
    if (k === "delete" || k === "backspace") { B.deleteSel(); return; }
    if (k === "r") { if (B.selection().d.length || B.selection().o.length) B.rotateSel(Math.PI / 12); else { B.rot = (B.rot + Math.PI / 12) % (Math.PI * 2); renderSide(); hint("Rotation " + Math.round((B.rot * 180) / Math.PI) + "°"); } return; }
    if (k === " ") { e.preventDefault(); W.mode === "sim" ? stop() : run(); return; }
    if (k === "escape") { if (!$("modal").hidden) closeModal(); else if (W.replaying) W.stopReplay(); else { B.clearSel(); B.changed(); } return; }
    if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) keys.add(k);
  });
  document.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  W.on("frame", (dt) => {
    if (!keys.size) return;
    const fx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0), fz = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    if (fx || fz) W.moveKeys(fx, fz, dt);
    if (keys.has("q")) W.orbit(-300 * dt, 0); if (keys.has("e")) W.orbit(300 * dt, 0);
  });

  /* ---------- top bar ---------- */
  $("undoBtn").addEventListener("click", () => { B.undo(); refreshAll(); });
  $("redoBtn").addEventListener("click", () => { B.redo(); refreshAll(); });
  $("randomBtn").addEventListener("click", () => { if (levelLocked() || M.kind === "perfect") { toast("Not in this mode"); return; } const list = B.randomArrangement(); B.commit(list); W.frameAll(); hint("🎲 " + list.length + " random dominoes"); });
  $("clearBtn").addEventListener("click", () => { if (levelLocked() || M.kind === "perfect") { toast("Not in this mode — use ↶ Undo instead"); return; } if (!W.con.dominoes.length && !W.con.objects.length) return; B.checkpoint(); W.con.dominoes = []; W.con.objects = []; B.changed(); hint("Cleared. ↶ Undo brings it back."); });
  $("saveBtn").addEventListener("click", saveModal);
  $("openBtn").addEventListener("click", creationsModal);
  $("envBtn").addEventListener("click", envModal);
  $("setBtn").addEventListener("click", settingsModal);
  $("menuBtn").addEventListener("click", showMenu);
  $("shotBtn").addEventListener("click", () => { const a = document.createElement("a"); a.href = W.screenshot(); a.download = "domino-universe.png"; a.click(); toast("📸 Screenshot saved"); });
  $("fullBtn").addEventListener("click", () => { const el = $("app"); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("Fullscreen isn't available here")); });
  // video recording of the canvas
  let rec = null;
  $("recBtn").addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    if (!window.MediaRecorder || !cv.captureStream) { toast("Video recording isn't supported in this browser"); return; }
    const chunks = [];
    const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    rec = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 6e6 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })); a.download = "domino-chain.webm"; a.click(); rec = null; $("recBtn").classList.remove("rec"); toast("🎞️ Video saved"); };
    rec.start(); $("recBtn").classList.add("rec"); hint("⏺ Recording — press again to stop and download");
    if (W.mode === "edit") setTimeout(run, 400);
  });

  /* =========================================================
     MENUS & MODALS
     ========================================================= */
  let modalCb = null;
  function openModal(html, cb) { $("modalCard").innerHTML = html; $("modal").hidden = false; modalCb = cb || null; }
  function closeModal() { $("modal").hidden = true; modalCb = null; }
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal") || e.target.closest("[data-close]")) { closeModal(); return; } const b = e.target.closest("[data-a]"); if (b && modalCb) modalCb(b.dataset.a, b); });
  const head = (t, sub) => `<div class="mhead"><div><h2>${t}</h2>${sub ? `<small class="muted">${sub}</small>` : ""}</div><button class="tb" data-close>✕</button></div>`;
  function nextLevel() { for (let i = 0; i < D.LEVELS.length; i++) if (!S.levels[i]) return i; return 0; }
  function showMenu() {
    const n = nextLevel();
    $("menu").innerHTML = `<div class="menu-card"><div class="menu-dominoes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><h1>Domino Universe</h1>
      <p class="muted">Build anything. Push the first one. Watch everything fall.</p>
      <div class="menu-btns">
        <button class="mbtn primary" data-m="play">▶ Play <small>Level ${n + 1}: ${esc(D.LEVELS[n].name)}</small></button>
        <div class="mrow"><button class="mbtn" data-m="levels">🗺️ Level Selection</button><button class="mbtn" data-m="free">🧱 Free Build</button></div>
        <div class="mrow"><button class="mbtn" data-m="puzzle">🧩 Puzzle Mode</button><button class="mbtn" data-m="mine">📂 My Creations</button></div>
        <div class="mrow"><button class="mbtn" data-m="collection">🁢 Domino Collection</button><button class="mbtn" data-m="modes">🎮 More Modes</button></div>
      </div></div>`;
    $("menu").hidden = false;
  }
  $("menu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    A.unlock(); A.play("ui"); A.startMusic();
    const m = b.dataset.m;
    if (m === "play") startLevel(nextLevel(), "level");
    else if (m === "levels") levelsModal("level");
    else if (m === "free") startFree();
    else if (m === "puzzle") levelsModal("puzzle");
    else if (m === "mine") creationsModal();
    else if (m === "collection") collectionModal();
    else if (m === "modes") modesModal();
  });
  function levelsModal(kind) {
    const isPuzzle = (L, b) => (b.gaps && b.gaps.length) || L.pushes;
    const list = D.LEVELS.map((L, i) => ({ L, i, b: L.build() })).filter(({ L, b }) => kind !== "puzzle" || isPuzzle(L, b));
    const key = (i) => (kind === "perfect" ? "p" : "") + i;
    const open = (i) => i === 0 || kind !== "level" || S.levels[i - 1] || S.levels[i] || S.unlockAll;
    openModal(head(kind === "puzzle" ? "🧩 Puzzle Mode" : kind === "perfect" ? "✨ Perfect Reaction" : "🗺️ Levels", kind === "puzzle" ? "Fill the gaps or find the right pushes" : kind === "perfect" ? "Each build has hidden mistakes. Find and fix them so every domino falls." : "Five tiers, each one teaches something new") +
      D.TIERS.map((tn, t) => { const items = list.filter((x) => x.L.tier === t); if (!items.length) return ""; return `<h3>${tn}</h3><div class="cards">${items.map(({ L, i, b }) => { const ok = open(i), st = S.levels[key(i)] || 0; return `<button class="card ${ok ? "" : "locked"}" data-a="${i}"><b>${i + 1}. ${esc(L.name)}</b><small>${esc(L.desc)}</small><span class="stars">${"★".repeat(st)}${"☆".repeat(3 - st)}</span><span class="tag">${b.dominoes.length.toLocaleString()} 🁢</span>${ok ? "" : '<span class="tag" style="top:28px">🔒</span>'}</button>`; }).join("")}</div>`; }).join("") +
      (kind === "level" && !S.unlockAll ? `<p class="muted" style="margin-top:12px"><button class="btn" data-a="unlock">🔓 Unlock all levels</button></p>` : ""), (a) => {
      if (a === "unlock") { S.unlockAll = true; save(); levelsModal(kind); return; }
      const i = +a; if (!open(i)) { toast("🔒 Finish the previous level first"); return; }
      closeModal(); startLevel(i, kind === "puzzle" ? "puzzle" : kind === "perfect" ? "perfect" : "level");
    });
  }
  function modesModal() {
    const modes = [["challenge", "🏁", "Challenge Mode", "Complete the predefined builds and trigger the whole reaction."], ["puzzle", "🧩", "Puzzle Mode", "Find the missing pieces or the right pushes."], ["speed", "⏱️", "Speed Build", "60 seconds to build a path from the start to the bell."], ["massive", "🌊", "Massive Chain", "Thousands of dominoes in one giant hall."], ["perfect", "✨", "Perfect Reaction", "Spot and fix the hidden mistakes so not one domino is missed."], ["creative", "🌍", "Creative World", "Pick any of the 8 worlds and build something huge."]];
    openModal(head("🎮 Game modes") + `<div class="cards">${modes.map(([id, ic, n, d]) => `<button class="card" data-a="${id}"><span class="ci">${ic}</span><b>${n}</b><small>${d}</small></button>`).join("")}</div>`, (a) => {
      if (a === "challenge") levelsModal("level"); else if (a === "puzzle") levelsModal("puzzle"); else if (a === "perfect") levelsModal("perfect");
      else if (a === "speed") { closeModal(); startSpeed(); }
      else if (a === "massive") openModal(head("🌊 Massive Chain", "How many dominoes?") + `<div class="cards">${[500, 1000, 2000, 3000].map((n) => `<button class="card" data-a="${n}"><span class="ci">🁢</span><b>${n.toLocaleString()} dominoes</b><small>${n > 2000 ? "Needs a fast computer" : "One giant snake"}</small></button>`).join("")}</div>`, (n) => { closeModal(); startMassive(+n); });
      else if (a === "creative") envModal(true);
    });
  }
  function envModal(creative) {
    openModal(head("🌍 Worlds", "Each surface has its own look and grip") + `<div class="cards">${D.ENVS.map((e) => `<button class="card ${e.id === W.con.env ? "on" : ""}" data-a="${e.id}"><span class="ci">${e.icon}</span><b>${e.name}</b><small>Grip: ${e.friction < 0.4 ? "slippery" : e.friction > 0.6 ? "grippy" : "normal"}</small></button>`).join("")}</div>`, (a) => {
      closeModal();
      if (creative) { startFree({ env: a, dominoes: [], objects: [] }, "🌍 Creative World · " + D.ENVS.find((e) => e.id === a).name); M.kind = "creative"; }
      else { if (W.mode === "sim") stop(); W.setEnv(a); W.rebuild(); }
    });
  }
  function collectionModal() {
    openModal(head("🁢 Domino Collection", "Every type behaves differently. Tap one to build with it.") +
      ["classic", "special"].map((cat) => `<h3>${cat === "classic" ? "Classic" : "Special"}</h3><div class="cards">${D.TYPES.filter((t) => t.cat === cat).map((t) => `<button class="card" data-a="t:${t.id}"><span class="ci">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small><small>Size ${t.size.map((v) => v.toFixed(2)).join(" × ")} · weight ×${t.density}</small></button>`).join("")}</div>`).join("") +
      `<h3>Machine parts</h3><div class="cards">${D.OBJECTS.map((o) => `<button class="card" data-a="o:${o.id}"><span class="ci">${o.icon}</span><b>${o.name}</b><small>${o.desc}</small></button>`).join("")}</div>`, (a) => {
      closeModal(); if ($("menu").hidden === false) startFree();
      const [k, id] = a.split(":");
      if (k === "t") { B.type = id; if (B.tool === "object" || B.tool === "select" || B.tool === "erase") B.tool = "single"; }
      else { B.tool = "object"; B.object = id; }
      renderTools(); renderSide();
    });
  }
  function settingsModal() {
    const s = S.settings;
    openModal(head("⚙️ Settings") + `
      <label class="slider"><span>🔊 Sound effects <b>${Math.round(s.sfx * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-s="sfx"></label>
      <label class="slider"><span>🎵 Music <b>${Math.round(s.music * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-s="music"></label>
      <label class="chk"><input type="checkbox" data-s="musicOn" ${s.musicOn ? "checked" : ""}> Background music</label>
      <p class="muted">Controls: left-click to build · right-drag to rotate the view · Shift- or middle-drag to pan · wheel to zoom · WASD to move · Q/E to turn · Space to start/stop · Ctrl+Z undo. On touch: one finger builds, two fingers rotate and zoom.</p>
      <p><button class="btn" data-a="reset">🗑️ Reset level progress</button></p>`, (a) => { if (a === "reset" && confirm("Reset all level stars?")) { S.levels = {}; save(); toast("Progress reset"); } });
    $("modalCard").oninput = (e) => { const k = e.target.dataset.s; if (!k) return; s[k] = e.target.type === "checkbox" ? e.target.checked : +e.target.value; applySettings(); if (k === "musicOn") { if (s.musicOn) A.startMusic(); else A.stopMusic(); } const b = e.target.parentElement.querySelector("b"); if (b) b.textContent = Math.round(e.target.value * 100) + "%"; save(); };
  }
  function currentCon() { return { env: W.con.env, dominoes: W.con.dominoes.map(B.clean), objects: W.con.objects.map((o) => Object.assign({}, o, { sel: undefined })) }; }
  function saveModal() {
    if (!W.con.dominoes.length) { toast("Nothing to save yet"); return; }
    openModal(head("💾 Save creation") + `<p><input class="txt" id="saveName" maxlength="40" placeholder="Name your creation" style="width:100%"></p><div class="row"><button class="btn primary" data-a="save">💾 Save</button><button class="btn" data-a="code">🔗 Get share code</button></div><div id="codeBox"></div>`, (a) => {
      if (a === "save") {
        const name = ($("saveName").value || "").trim() || "Creation " + (S.creations.length + 1);
        S.creations.unshift({ name, at: Date.now(), fav: false, con: currentCon() });
        save(); closeModal(); toast("💾 Saved “" + name + "”");
      } else if (a === "code") {
        const code = D.encode(currentCon());
        $("codeBox").innerHTML = `<p class="muted">Send this code to a friend — they paste it into My Creations → Import.</p><textarea class="code" readonly>${code}</textarea><button class="btn" data-a="copy">📋 Copy</button>`;
      } else if (a === "copy") { const t = $("modalCard").querySelector("textarea"); t.select(); navigator.clipboard ? navigator.clipboard.writeText(t.value).then(() => toast("📋 Copied!")) : document.execCommand("copy"); }
    });
    setTimeout(() => $("saveName") && $("saveName").focus(), 50);
  }
  const FEATURED = [["Neon Finale", 19], ["Domino Field", 18], ["Grand Machine", 16], ["Thousand Fall", 17]];
  function creationsModal() {
    const list = S.creations.slice().sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
    openModal(head("📂 My Creations", list.length + " saved") +
      (list.length ? `<div class="cards">${list.map((c) => { const i = S.creations.indexOf(c); return `<div class="card"><b>${c.fav ? "⭐ " : ""}${esc(c.name)}</b><small>${c.con.dominoes.length.toLocaleString()} dominoes · ${new Date(c.at).toLocaleDateString()}</small><div class="row"><button class="btn primary" data-a="open:${i}">✏️ Edit</button><button class="btn" data-a="play:${i}">▶</button><button class="btn" data-a="fav:${i}">${c.fav ? "★" : "☆"}</button><button class="btn" data-a="share:${i}">🔗</button><button class="btn" data-a="del:${i}">🗑️</button></div></div>`; }).join("")}</div>` : `<p class="muted">Nothing saved yet — build something and press 💾.</p>`) +
      `<h3>Import a friend's creation</h3><textarea class="code" id="importCode" placeholder="Paste a share code here"></textarea><button class="btn" data-a="import">📥 Import</button>
      <h3>✨ Featured creations</h3><p class="muted">Showcase builds to open, study and remix. (There's no online gallery — share your own builds with codes.)</p><div class="cards">${FEATURED.map(([n, li]) => `<button class="card" data-a="feat:${li}"><b>${n}</b><small>${D.LEVELS[li].build().dominoes.length.toLocaleString()} dominoes</small></button>`).join("")}</div>`, (a) => {
      const [k, v] = a.split(":"), c = S.creations[+v];
      if (k === "open" || k === "play") { closeModal(); startFree(c.con, "📂 " + c.name); if (k === "play") setTimeout(() => { run(); if (W.con.dominoes.length) W.push(0, 1); }, 300); }
      else if (k === "fav") { c.fav = !c.fav; save(); creationsModal(); }
      else if (k === "del") { if (confirm("Delete “" + c.name + "”?")) { S.creations.splice(+v, 1); save(); creationsModal(); } }
      else if (k === "share") { const code = D.encode(c.con); if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast("🔗 Share code copied!"), () => prompt("Copy this code:", code)); else prompt("Copy this code:", code); }
      else if (k === "import") { try { const con = D.decode($("importCode").value); closeModal(); startFree(con, "📥 Imported creation"); toast("📥 Imported " + con.dominoes.length + " dominoes"); } catch (e) { toast("That code doesn't look right"); } }
      else if (k === "feat") { const b = D.LEVELS[+v].build(); closeModal(); startFree({ env: D.LEVELS[+v].env || "table", dominoes: b.dominoes.map((d) => Object.assign({}, d, { mine: true })), objects: b.objects || [] }, "✨ " + D.LEVELS[+v].name); M.starts = b.starts; }
    });
  }

  /* ---------- start ---------- */
  renderTools(); renderSide(); runUi(); goalPill();
  showMenu();
  // a little demo behind the menu
  W.con.dominoes = D.patternDominoes("spiral", 0, 0, 5, 0, 0.58, { type: "colour" }).map((d, i, all) => Object.assign(d, { color: D.hsl(i / all.length) }));
  W.rebuild(); W.frameAll(true); W.cam.pitch = 0.6;
  W.on("frame", (dt) => { if (!$("menu").hidden && W.mode === "edit") W.cam.yaw += dt * 0.12; });
  window.addEventListener("beforeunload", save);
  D.app = { startLevel, startFree, startSpeed, startMassive, run, stop, M, S: () => S, levelsModal, collectionModal, creationsModal, modesModal, envModal, settingsModal, showMenu, closeModal };
})();
