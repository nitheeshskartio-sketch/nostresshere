/* ============ FIREWORK THERAPY — input, modes, show creator, collection & saves ============ */
(function () {
  "use strict";
  const F = window.FW, E = F.engine, A = F.audio;
  const $ = (id) => document.getElementById(id);
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let toastT, tipT;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2400); }
  function tip(m, ms) { const t = $("tip"); t.textContent = m; t.style.opacity = 1; clearTimeout(tipT); tipT = setTimeout(() => (t.style.opacity = 0), ms || 2600); }

  /* ---------- save ---------- */
  const KEY = "nsh-fireworks";
  const fresh = () => ({ launched: 0, exploded: {}, bgs: {}, colorWins: 0, shapeWins: 0, hidden: {}, ach: {}, unlockAll: false, favs: [], shows: [], customShape: null,
    st: { type: "peony", colors: ["pink", "gold"], mode: "mix", random: false, bg: "night", settings: null, fxVol: 0.8, musicVol: 0.45, muted: false, track: "calm" } });
  let P = fresh();
  try { const raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw) { P = Object.assign(fresh(), raw); P.st = Object.assign(fresh().st, raw.st || {}); } } catch (e) { /* private mode */ }
  let saveT = 0;
  function save(now) { if (!now && performance.now() - saveT < 1500) { clearTimeout(save.t); save.t = setTimeout(() => save(true), 1600); return; } saveT = performance.now(); try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } }
  const S = P.st;
  if (S.settings) Object.assign(E.settings, S.settings);
  S.settings = E.settings;
  if (P.customShape) F.customShape = P.customShape;
  A.fxVol = S.fxVol; A.musicVol = S.musicVol; A.muted = S.muted;

  const typeOpen = (t) => !t.hidden ? P.unlockAll || !t.need || P.launched >= t.need : !!P.hidden[t.id];
  const bgOpen = (b) => P.unlockAll || !b.need || P.launched >= b.need;
  const colOpen = (c) => P.unlockAll || !c.need || P.launched >= c.need;
  const hexOf = (id) => (F.COLORS.find((c) => c.id === id) || { hex: id }).hex;
  const swatchCss = (id) => (id === "rainbow" ? "conic-gradient(#ff3b3b,#ffe83b,#3bff7a,#3b8bff,#a64dff,#ff3b3b)" : hexOf(id));

  /* ---------- engine boot ---------- */
  E.init($("sky"));
  E.sound = A;
  E.setBg(bgOpen(F.BGS.find((b) => b.id === S.bg) || F.BGS[0]) ? S.bg : "night");

  /* ---------- the firework you're about to launch ---------- */
  const mode = { id: "free" };
  function currentFw(extra) {
    let type = S.type, colors = S.colors.slice(), m = S.mode;
    if (S.random || mode.id === "surprise") {
      const open = F.TYPES.filter((t) => typeOpen(t) && t.id !== "custom" && !t.hidden);
      type = mode.id === "surprise" ? pick(open).id : type;
      const cols = F.COLORS.filter((c) => colOpen(c));
      colors = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => pick(cols).id);
      m = pick(["mix", "gradient", "layers"]);
    }
    if (mode.id === "relax") colors = [pick(["#ffb3c7", "#b3d4ff", "#c7ffb3", "#fff0b3", "#e0b3ff", "#ffd6b3"])];
    return Object.assign({ type, colors, mode: m, size: 1 }, extra || {});
  }
  function launchAt(x, y, fw) {
    const [W, H] = E.size();
    y = Math.min(y, E.ground() - 50); x = Math.max(10, Math.min(W - 10, x));
    fw = fw || currentFw();
    E.launch(x, y, fw);
    P.launched++;
    if (show.recording) { show.cues.push({ t: +((performance.now() - show.recStart) / 1000).toFixed(2), type: fw.type, colors: fw.colors, mode: fw.mode, x: +(x / W).toFixed(3), y: +(y / H).toFixed(3), size: fw.size || 1 }); $("recCount").textContent = show.cues.length; }
    checkUnlocks();
    save();
  }

  /* ---------- unlocks, hidden patterns, achievements ---------- */
  let lastCount = P.launched;
  function checkUnlocks() {
    const n = P.launched;
    for (const t of F.TYPES) if (t.need && t.need > lastCount && t.need <= n && !P.unlockAll) toast("🔓 New firework: " + t.icon + " " + t.name + "!", 3000);
    for (const b of F.BGS) if (b.need && b.need > lastCount && b.need <= n && !P.unlockAll) toast("🔓 New sky: " + b.icon + " " + b.name + "!", 3000);
    for (const c of F.COLORS) if (c.need && c.need > lastCount && c.need <= n && !P.unlockAll) toast("🔓 Special colour: " + c.name + "!", 3000);
    lastCount = n;
    checkAch();
  }
  const ACH = [
    ["first", "🎆", "First Light", "Launch your first firework", () => P.launched >= 1],
    ["f100", "💯", "Sky Painter", "Launch 100 fireworks", () => P.launched >= 100],
    ["f1000", "🌠", "Pyrotechnician", "Launch 1,000 fireworks", () => P.launched >= 1000],
    ["shapes", "💖", "Shape Shifter", "Explode every shape firework", () => F.TYPES.filter((t) => t.cat === "shape").every((t) => P.exploded[t.id])],
    ["specials", "🎇", "Connoisseur", "Explode every special firework", () => F.TYPES.filter((t) => t.cat === "special").every((t) => P.exploded[t.id])],
    ["skies", "🌌", "Sky Traveller", "Watch fireworks in every sky", () => F.BGS.every((b) => P.bgs[b.id])],
    ["custom", "✏️", "Designer", "Launch a firework in your own shape", () => !!P.exploded.custom],
    ["giant", "💥", "Go Big", "Set off a Giant Burst", () => !!P.exploded.giant],
    ["show", "🎬", "Showrunner", "Save your own fireworks show", () => P.shows.length > 0],
    ["colour5", "🎨", "Colour Master", "Complete 5 colour challenges", () => P.colorWins >= 5],
    ["shape5", "⭐", "Shape Master", "Complete 5 shape challenges", () => P.shapeWins >= 5],
    ["hidden", "🔮", "Secret Keeper", "Discover both hidden patterns", () => P.hidden.supernova && P.hidden.loverain]
  ];
  function checkAch() { for (const [id, icon, name, , test] of ACH) if (!P.ach[id] && test()) { P.ach[id] = Date.now(); setTimeout(() => toast("🏆 " + icon + " " + name, 2800), 300); } }
  const recentBooms = [];
  E.onExplode = function (x, y, fw) {
    if (!fw || fw.type === "_none") return;
    P.exploded[fw.type] = (P.exploded[fw.type] || 0) + 1;
    P.bgs[E.bg] = 1;
    // hidden: lots of explosions at once becomes a supernova
    const now = performance.now();
    recentBooms.push(now); while (recentBooms.length && now - recentBooms[0] > 1500) recentBooms.shift();
    if (recentBooms.length >= 8 && fw.type !== "supernova" && !mode.noNova && now - (mode.lastNova || 0) > 8000 && (mode.id === "free" || mode.id === "surprise")) {
      mode.lastNova = now; recentBooms.length = 0;
      const [W, H] = E.size();
      setTimeout(() => { E.explode(W / 2, H * 0.4, { type: "supernova", colors: ["white", "gold"], size: 1 }); if (!P.hidden.supernova) { P.hidden.supernova = 1; toast("🔮 Hidden pattern discovered: 🌟 Supernova!", 3500); } }, 400);
    }
    challengeCheck(fw);
    checkAch(); save();
  };

  /* ---------- pointer input: tap, hold, drag, double-tap, multi-touch ---------- */
  const canvas = $("sky");
  const ptrs = new Map();
  let lastTap = { t: 0, x: 0, y: 0 };
  function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener("pointerdown", (e) => {
    A.unlock();
    closeDrawer();
    const [x, y] = pos(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const now = performance.now();
    const dbl = now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 70;
    lastTap = { t: now, x, y };
    if (dbl) {
      const fw = currentFw();
      // hidden: double-tap a pink or red heart
      if (fw.type === "heart" && fw.colors.some((c) => c === "pink" || c === "red")) {
        launchAt(x, y, Object.assign(fw, { type: "loverain" }));
        if (!P.hidden.loverain) { P.hidden.loverain = 1; setTimeout(() => toast("🔮 Hidden pattern discovered: 💕 Love Rain!", 3500), 900); }
      } else launchAt(x, y, Object.assign(fw, { type: "double" }));
    } else launchAt(x, y);
    ptrs.set(e.pointerId, { x, y, sx: x, sy: y, t: now, next: now + 420, dist: 0 });
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const [x, y] = pos(e);
    const d = Math.hypot(x - p.x, y - p.y);
    p.dist += d;
    // drag: glowing finger trail, and a firework every so often along the path
    if (d > 2) for (let i = 0; i < 3; i++) E.particles.push({ x: x + R(-3, 3), y: y + R(-3, 3), px: x, py: y, vx: R(-20, 20), vy: R(-20, 20), life: R(0.4, 0.9), age: 0, col: hexOf(S.colors[0] === "rainbow" ? "gold" : S.colors[0]), size: 1.8, drag: 2, g: 30, glitter: true });
    if (p.dist > 90) { p.dist = 0; launchAt(x, y); }
    p.x = x; p.y = y;
  });
  const up = (e) => ptrs.delete(e.pointerId);
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  // holding launches a stream
  setInterval(() => {
    const now = performance.now();
    for (const p of ptrs.values()) if (now >= p.next) { p.next = now + Math.max(80, E.settings.delay * 1000); launchAt(p.x + R(-20, 20), p.y + R(-20, 20)); }
  }, 40);

  /* ---------- modes ---------- */
  const MODES = {
    free: { name: "Free Fireworks", icon: "🎆", desc: "Unlimited fireworks, total freedom." },
    colour: { name: "Colour Challenge", icon: "🎨", desc: "Launch fireworks in a requested colour combination." },
    shape: { name: "Shape Challenge", icon: "⭐", desc: "Make the shape that's asked for." },
    show: { name: "Fireworks Show", icon: "🎼", desc: "Sit back: a show synced to the music plays itself. Tap to join in." },
    rapid: { name: "Rapid Fire", icon: "⚡", desc: "Non-stop explosions all across the sky." },
    relax: { name: "Relaxation Mode", icon: "🌙", desc: "Slow fireworks, soft colours, gentle sounds." },
    surprise: { name: "Random Surprise", icon: "🎁", desc: "Every firework is a surprise. Hidden patterns are waiting." }
  };
  let auto = null;
  function setMode(id) {
    mode.id = id; mode.prog = 0;
    clearInterval(auto); auto = null; A.onBeat = null;
    A.gentle = id === "relax"; E.timeScale = id === "relax" ? 0.6 : 1;
    if (id === "relax") { E.setBg(bgOpen(F.BGS[5]) ? "beach" : "starry"); S.bg = E.bg; A.playMusic("calm"); auto = setInterval(() => { const [W, H] = E.size(); if (!document.hidden) launchAt(R(W * 0.15, W * 0.85), R(H * 0.2, H * 0.5)); }, 3000); }
    else if (id === "rapid") { auto = setInterval(() => { const [W, H] = E.size(); const hh = E.settings.height; launchAt(R(W * 0.06, W * 0.94), H * R(Math.max(0.08, hh - 0.18), hh + 0.18)); }, Math.max(110, E.settings.delay * 600)); }
    else if (id === "surprise") { auto = setInterval(() => { const [W, H] = E.size(); if (Math.random() < 0.6) launchAt(R(W * 0.1, W * 0.9), R(H * 0.15, H * 0.5)); }, 4500); }
    else if (id === "show") startAutoShow();
    else if (id === "colour") newColourChallenge();
    else if (id === "shape") newShapeChallenge();
    if (id !== "relax" && id !== "show" && !show.playing) { if (S.track !== "none") A.playMusic(S.track); else A.stopMusic(); }
    renderPill();
    $("menu").hidden = true;
    tip(MODES[id].icon + " " + MODES[id].name + " · " + MODES[id].desc, 3500);
    renderToolbar();
  }
  // a generated show synced to the beat of the music: builds up, then a finale, then again
  function startAutoShow() {
    A.playMusic("grand");
    mode.beat = 0;
    A.onBeat = (i, b, bar) => {
      if (mode.id !== "show") return;
      const [W, H] = E.size(), phase = i % 64;
      const fw = (type, colors) => ({ type, colors, mode: "mix", size: 1 });
      const cols = [["red", "gold"], ["blue", "silver"], ["pink", "purple"], ["green", "gold"], ["rainbow"], ["orange", "yellow"]];
      const types = ["peony", "chrysanthemum", "willow", "heart", "star", "glitter", "crackle", "ring", "peonyColour", "flower", "double"].filter((t) => typeOpen(F.typeById(t)));
      if (phase < 48) {
        if (b === 0 || (phase > 24 && b === 2)) E.launch(R(W * 0.15, W * 0.85), H * R(0.15, 0.45), fw(pick(types), pick(cols)));
        if (phase > 32 && b % 2 === 1 && Math.random() < 0.5) E.launch(R(W * 0.1, W * 0.9), H * R(0.2, 0.5), fw("sparkle", pick(cols)));
        if (phase === 40) { E.launch(W * 0.25, H * 0.3, fw("willow", ["gold"])); E.launch(W * 0.75, H * 0.3, fw("willow", ["gold"])); }
      } else if (phase < 60) {
        // finale: everything at once
        for (let k = 0; k < 3; k++) E.launch(R(W * 0.08, W * 0.92), H * R(0.12, 0.5), fw(pick(types), pick(cols)));
      } else if (phase === 60) E.launch(W / 2, H * 0.3, fw("giant", ["gold", "white"]));
    };
  }
  function renderPill() {
    const el = $("modePill");
    const m = mode.id;
    if (show.playing) { el.innerHTML = `🎬 Playing <b>${esc(show.playing.name)}</b> <button data-pill="stopShow">⏹ Stop</button>`; return; }
    if (m === "colour") el.innerHTML = `🎨 Launch fireworks in ${mode.target.map((c) => `<b style="color:${c === "rainbow" ? "#fff" : hexOf(c)}">${F.COLORS.find((q) => q.id === c).name}</b>`).join(" + ")} <span class="bar"><i style="width:${(mode.prog / 3) * 100}%"></i></span> <button data-pill="skip">Skip</button>`;
    else if (m === "shape") el.innerHTML = `⭐ Make a <b>${mode.shape.icon} ${mode.shape.name}</b> firework <span class="bar"><i style="width:${(mode.prog / 2) * 100}%"></i></span> <button data-pill="skip">Skip</button>`;
    else if (m !== "free") el.innerHTML = `${MODES[m].icon} ${MODES[m].name} <button data-pill="free">✕</button>`;
    else el.innerHTML = "";
  }
  $("modePill").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pill]"); if (!b) return;
    const a = b.dataset.pill;
    if (a === "skip") mode.id === "colour" ? newColourChallenge() : newShapeChallenge();
    else if (a === "free") setMode("free");
    else if (a === "stopShow") stopShow();
    renderPill();
  });
  function newColourChallenge() {
    const pool = F.COLORS.filter((c) => !c.special && c.id !== "rainbow").map((c) => c.id);
    const n = 2 + (Math.random() < 0.35 ? 1 : 0);
    const t = []; while (t.length < n) { const c = pick(pool); if (!t.includes(c)) t.push(c); }
    mode.target = t; mode.prog = 0; renderPill();
  }
  function newShapeChallenge() {
    const pool = F.TYPES.filter((t) => t.cat === "shape" && t.id !== "custom" && typeOpen(t));
    let s; do { s = pick(pool); } while (pool.length > 1 && mode.shape && s.id === mode.shape.id);
    mode.shape = s; mode.prog = 0; renderPill();
  }
  function challengeCheck(fw) {
    if (mode.id === "colour") {
      const want = [...mode.target].sort().join(), got = [...new Set(fw.colors)].sort().join();
      if (want === got) { mode.prog++; if (mode.prog >= 3) { P.colorWins++; toast("🎨 Beautiful! Colour challenge complete (" + P.colorWins + ")"); celebrate(); newColourChallenge(); } renderPill(); }
    } else if (mode.id === "shape") {
      if (fw.type === mode.shape.id) { mode.prog++; if (mode.prog >= 2) { P.shapeWins++; toast("⭐ Perfect " + mode.shape.name + "! (" + P.shapeWins + ")"); celebrate(); newShapeChallenge(); } renderPill(); }
    }
  }
  function celebrate() { const [W, H] = E.size(); for (let i = 0; i < 4; i++) setTimeout(() => E.launch(W * (0.2 + i * 0.2), H * 0.25, { type: "glitter", colors: ["gold", "white"], size: 0.7 }), i * 160); }

  /* ---------- toolbar & drawers ---------- */
  let open = null;
  function renderToolbar() {
    const t = F.typeById(S.type);
    $("typeIcon").textContent = S.random || mode.id === "surprise" ? "🎲" : t.icon;
    $("typeName").textContent = S.random || mode.id === "surprise" ? "Random" : t.name;
    $("colourDots").innerHTML = S.colors.map((c) => `<i style="background:${swatchCss(c)}"></i>`).join("");
    $("soundTb").textContent = S.muted ? "🔇" : "🔊";
    $("slowTb").classList.toggle("on", E.slow);
    document.querySelectorAll(".toolbar [data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === open));
  }
  function closeDrawer() { if (!open) return; open = null; $("drawer").hidden = true; renderToolbar(); }
  function openDrawer(name) {
    if (open === name) return closeDrawer();
    open = name;
    const d = $("drawer");
    d.hidden = false;
    DRAWERS[name](d);
    renderToolbar();
  }
  $("toolbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    A.unlock();
    const t = b.dataset.t;
    if (t === "menu") { closeDrawer(); $("menu").hidden = false; }
    else if (t === "slow") { E.slow = !E.slow; tip(E.slow ? "🐢 Slow motion" : "Normal speed"); renderToolbar(); }
    else if (t === "clear") { E.clear(); tip("🧹 Clear skies"); }
    else if (t === "full") { const el = $("app"); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("Fullscreen isn't available here")); }
    else openDrawer(t);
  });
  $("hideBtn").addEventListener("click", () => { $("app").classList.toggle("ui-hidden"); closeDrawer(); });

  const CATS = [["classic", "Classic"], ["shape", "Shapes"], ["special", "Special"], ["hidden", "🔮 Hidden"]];
  let typeCat = null;
  const DRAWERS = {
    type(d) {
      typeCat = typeCat || F.typeById(S.type).cat;
      d.innerHTML = `<div class="tabs">${CATS.map(([k, n]) => `<button class="chip ${k === typeCat ? "on" : ""}" data-cat="${k}">${n}</button>`).join("")}<button class="chip ${S.random ? "on" : ""}" data-rand="1">🎲 Random</button></div>
        <div class="grid">${F.TYPES.filter((t) => t.cat === typeCat).map((t) => { const ok = typeOpen(t); return `<button class="fwb ${t.id === S.type && !S.random ? "on" : ""} ${ok ? "" : "locked"}" data-type="${t.id}" title="${ok ? t.name : t.hidden ? "Hidden — " + t.hint : "Unlocks after " + t.need + " fireworks"}"><span class="i">${ok || !t.hidden ? t.icon : "❔"}</span><small>${ok || !t.hidden ? t.name : "???"}</small>${ok ? "" : `<span class="lk">${t.hidden ? "🔮" : "🔒" + t.need}</span>`}</button>`; }).join("")}</div>
        ${typeCat === "shape" ? `<div class="row" style="margin-top:10px"><button class="btn" data-draw="1">✏️ Draw my own shape</button><span class="muted">${P.customShape ? "Your shape is saved as ✏️ My Shape" : "Draw anything — it becomes a firework"}</span></div>` : ""}
        ${typeCat === "hidden" ? `<p class="muted" style="margin-top:10px">Hidden patterns appear when you do something special. ${F.TYPES.filter((t) => t.hidden).map((t) => P.hidden[t.id] ? t.icon + " " + t.name + " found!" : "Hint: " + t.hint).join(" · ")}</p>` : ""}`;
      d.onclick = (e) => {
        const c = e.target.closest("[data-cat]"), b = e.target.closest("[data-type]");
        if (c) { typeCat = c.dataset.cat; DRAWERS.type(d); return; }
        if (e.target.closest("[data-rand]")) { S.random = !S.random; DRAWERS.type(d); renderToolbar(); save(); return; }
        if (e.target.closest("[data-draw]")) { drawShape(); return; }
        if (!b) return;
        const t = F.typeById(b.dataset.type);
        if (!typeOpen(t)) { toast(t.hidden ? "🔮 " + t.hint : "🔒 Launch " + (t.need - P.launched) + " more fireworks to unlock " + t.name); return; }
        if (t.id === "custom" && !P.customShape) { drawShape(); return; }
        S.type = t.id; S.random = false; save(); DRAWERS.type(d); renderToolbar(); tip(t.icon + " " + t.name + " — tap the sky!");
      };
    },
    colour(d) {
      d.innerHTML = `<h4>Pick up to 3 colours</h4><div class="sw-row">${F.COLORS.map((c) => { const ok = colOpen(c), i = S.colors.indexOf(c.id); return `<button class="sw ${i >= 0 ? "on" : ""} ${ok ? "" : "locked"}" data-col="${c.id}" title="${ok ? c.name : c.name + " — unlocks after " + c.need + " fireworks"}" style="background:${swatchCss(c.id)};--glow:${c.hex === "rainbow" ? "#fff6" : c.hex + "88"}">${i >= 0 && S.colors.length > 1 ? `<span class="n">${i + 1}</span>` : ""}</button>`; }).join("")}
          <label class="picker" title="Custom colour">＋<input type="color" id="cpick" value="#ff88cc"></label></div>
        <h4>Combine them</h4><div class="tabs">${[["mix", "✨ Mix"], ["gradient", "🌈 Gradient"], ["layers", "🎯 Layers"]].map(([k, n]) => `<button class="chip ${S.mode === k ? "on" : ""}" data-mode="${k}">${n}</button>`).join("")}<button class="chip ${S.random ? "on" : ""}" data-rand="1">🎲 Random colours</button></div>
        <h4>Favourites</h4><div class="favs">${P.favs.map((f, i) => `<button class="fav" data-fav="${i}">${f.colors.map((c) => `<i style="background:${swatchCss(c)}"></i>`).join("")}<span>${f.mode}</span></button>`).join("")}<button class="btn" data-savefav="1">⭐ Save this combo</button></div>`;
      d.querySelector("#cpick").addEventListener("change", (e) => { const v = e.target.value; S.colors = S.colors.length >= 3 ? [S.colors[0], S.colors[1], v] : S.colors.concat(v); S.random = false; save(); DRAWERS.colour(d); renderToolbar(); });
      d.onclick = (e) => {
        const c = e.target.closest("[data-col]"), m = e.target.closest("[data-mode]"), f = e.target.closest("[data-fav]");
        if (c) {
          const col = F.COLORS.find((q) => q.id === c.dataset.col);
          if (!colOpen(col)) { toast("🔒 " + col.name + " unlocks after " + col.need + " fireworks"); return; }
          const i = S.colors.indexOf(col.id);
          if (i >= 0) { if (S.colors.length > 1) S.colors.splice(i, 1); }
          else { if (S.colors.length >= 3) S.colors.shift(); S.colors.push(col.id); }
          S.random = false;
        } else if (m) S.mode = m.dataset.mode;
        else if (e.target.closest("[data-rand]")) S.random = !S.random;
        else if (f) { const fv = P.favs[+f.dataset.fav]; S.colors = fv.colors.slice(); S.mode = fv.mode; S.random = false; }
        else if (e.target.closest("[data-savefav]")) { if (P.favs.length >= 10) P.favs.shift(); P.favs.push({ colors: S.colors.slice(), mode: S.mode }); toast("⭐ Saved to favourites"); }
        else return;
        save(); DRAWERS.colour(d); renderToolbar();
      };
    },
    settings(d) {
      const sl = (k, label, min, max, step, fmt) => `<label class="slider"><span>${label}</span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${E.settings[k]}"><b>${fmt(E.settings[k])}</b></label>`;
      const pct = (v) => Math.round(v * 100) + "%";
      d.innerHTML = `<h4>Explosions</h4>
        ${sl("speed", "🚀 Launch speed", 0.4, 2.2, 0.05, pct)}${sl("size", "💥 Explosion size", 0.4, 2, 0.05, pct)}${sl("count", "✨ Particles", 0.3, 2, 0.05, pct)}
        ${sl("trail", "🌠 Trail length", 0, 1, 0.05, pct)}${sl("duration", "⏳ Duration", 0.5, 2, 0.05, pct)}
        <h4>Automatic launches</h4>${sl("height", "📏 Height (auto)", 0.15, 0.7, 0.01, (v) => Math.round((1 - v) * 100) + "%")}${sl("delay", "⏱ Delay (hold / rapid)", 0.08, 1.2, 0.02, (v) => v.toFixed(2) + "s")}
        <div class="row"><button class="btn ${E.slow ? "on" : ""}" data-slow="1">🐢 Slow motion</button><button class="btn" data-reset="1">↺ Defaults</button></div>`;
      d.oninput = (e) => { const i = e.target.closest("[data-set]"); if (!i) return; E.settings[i.dataset.set] = +i.value; i.nextElementSibling.textContent = { speed: 1, size: 1, count: 1, trail: 1, duration: 1 }[i.dataset.set] ? Math.round(i.value * 100) + "%" : i.dataset.set === "delay" ? (+i.value).toFixed(2) + "s" : Math.round((1 - i.value) * 100) + "%"; save(); };
      d.onclick = (e) => {
        if (e.target.closest("[data-slow]")) { E.slow = !E.slow; DRAWERS.settings(d); renderToolbar(); }
        if (e.target.closest("[data-reset]")) { Object.assign(E.settings, { speed: 1, size: 1, count: 1, height: 0.35, trail: 0.55, duration: 1, delay: 0.25 }); save(); DRAWERS.settings(d); }
      };
    },
    sky(d) {
      d.innerHTML = `<h4>Backgrounds</h4><div class="skies">${F.BGS.map((b) => `<button class="skyb ${b.id === E.bg ? "on" : ""} ${bgOpen(b) ? "" : "locked"}" data-bg="${b.id}"><canvas width="236" height="140"></canvas><span>${bgOpen(b) ? b.icon + " " + b.name : "🔒 " + b.need + " fireworks"}</span></button>`).join("")}</div>`;
      d.querySelectorAll("[data-bg]").forEach((b) => F.drawBgPreview(b.dataset.bg, b.querySelector("canvas")));
      d.onclick = (e) => { const b = e.target.closest("[data-bg]"); if (!b) return; const bg = F.BGS.find((q) => q.id === b.dataset.bg); if (!bgOpen(bg)) { toast("🔒 Launch " + (bg.need - P.launched) + " more fireworks to unlock " + bg.name); return; } E.setBg(bg.id); S.bg = bg.id; save(); DRAWERS.sky(d); };
    },
    sound(d) {
      d.innerHTML = `<h4>Sound</h4>
        <label class="slider"><span>🎆 Fireworks</span><input type="range" data-v="fxVol" min="0" max="1" step="0.05" value="${S.fxVol}"><b>${Math.round(S.fxVol * 100)}%</b></label>
        <label class="slider"><span>🎵 Music</span><input type="range" data-v="musicVol" min="0" max="1" step="0.05" value="${S.musicVol}"><b>${Math.round(S.musicVol * 100)}%</b></label>
        <h4>Background music</h4><div class="tabs">${A.TRACKS.map((t) => `<button class="chip ${S.track === t.id ? "on" : ""}" data-track="${t.id}">${t.name}</button>`).join("")}</div>
        <div class="row"><button class="btn ${S.muted ? "on" : ""}" data-mute="1">${S.muted ? "🔇 Muted — tap to unmute" : "🔇 Mute everything"}</button></div>`;
      d.oninput = (e) => { const i = e.target.closest("[data-v]"); if (!i) return; S[i.dataset.v] = +i.value; A[i.dataset.v] = +i.value; A.setVolumes(); i.nextElementSibling.textContent = Math.round(i.value * 100) + "%"; save(); };
      d.onclick = (e) => {
        const t = e.target.closest("[data-track]");
        if (t) { S.track = t.dataset.track; if (S.track === "none") A.stopMusic(); else A.playMusic(S.track); save(); DRAWERS.sound(d); }
        if (e.target.closest("[data-mute]")) { S.muted = !S.muted; A.muted = S.muted; A.unlock(); A.setVolumes(); save(); DRAWERS.sound(d); renderToolbar(); }
      };
    },
    show(d) { renderShowCreator(d); }
  };

  /* ---------- show creator ---------- */
  const show = { recording: false, cues: [], recStart: 0, name: "", music: "festival", playing: null };
  const BUILT_IN = [
    { name: "Grand Finale", builtIn: true, bg: "city", music: "grand", cues: [
      ...[0, 1, 2, 3].map((i) => ({ t: i * 0.9, type: "peony", colors: [["red", "gold"], ["blue", "white"], ["pink", "purple"], ["green", "gold"]][i], mode: "mix", x: 0.2 + i * 0.2, y: 0.32, size: 1 })),
      { t: 4, type: "willow", colors: ["gold"], mode: "mix", x: 0.3, y: 0.25, size: 1 }, { t: 4.2, type: "willow", colors: ["gold"], mode: "mix", x: 0.7, y: 0.25, size: 1 },
      { t: 6, type: "heart", colors: ["pink"], mode: "mix", x: 0.5, y: 0.3, size: 1.1 },
      ...Array.from({ length: 14 }, (_, i) => ({ t: 7.5 + i * 0.18, type: pick(["chrysanthemum", "crackle", "glitter", "peony"]), colors: pick([["red", "white"], ["blue", "silver"], ["gold"], ["purple", "pink"]]), mode: "mix", x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.3, size: 0.9 })),
      { t: 10.6, type: "giant", colors: ["gold", "white"], mode: "mix", x: 0.5, y: 0.3, size: 1.1 }] },
    { name: "Hearts & Stars", builtIn: true, bg: "starry", music: "calm", cues: [0, 1.4, 2.8, 4.2, 5.6, 7].map((t, i) => ({ t, type: i % 2 ? "star" : "heart", colors: i % 2 ? ["gold", "white"] : ["pink", "red"], mode: "gradient", x: 0.25 + (i % 3) * 0.25, y: 0.25 + (i % 2) * 0.12, size: 1 })).concat([{ t: 8.6, type: "smiley", colors: ["yellow"], mode: "mix", x: 0.5, y: 0.3, size: 1.2 }]) },
    { name: "Golden Night", builtIn: true, bg: "mountain", music: "calm", cues: Array.from({ length: 9 }, (_, i) => ({ t: i * 1.3, type: i % 3 === 2 ? "fallingstar" : "willow", colors: ["gold"], mode: "mix", x: 0.15 + (i % 5) * 0.175, y: 0.2 + (i % 2) * 0.1, size: 1 })).concat([{ t: 12, type: "waterfall", colors: ["gold"], mode: "mix", x: 0.5, y: 0.25, size: 1.2 }]) }
  ];
  function renderShowCreator(d) {
    const dur = show.cues.length ? Math.max(...show.cues.map((c) => c.t)) : 0;
    d.innerHTML = `<h4>🎬 Show creator</h4>
      <div class="row"><button class="btn ${show.recording ? "on" : "primary"}" data-s="rec">${show.recording ? "⏹ Stop recording" : "⏺ Record taps"}</button>
        <button class="btn" data-s="add">➕ Add cue</button><button class="btn" data-s="play" ${show.cues.length ? "" : "disabled"}>▶ Preview</button><button class="btn" data-s="clear" ${show.cues.length ? "" : "disabled"}>🗑️ Clear</button></div>
      <p class="muted">${show.recording ? "Recording! Tap the sky — every firework is added with its timing, type, colours and position." : "Press ⏺ Record, then tap the sky to build a show. Or ➕ add cues using your current firework & colours."}</p>
      <div class="cues">${show.cues.map((c, i) => `<div class="cue"><input type="number" step="0.1" min="0" value="${c.t}" data-ct="${i}" title="Launch time (seconds)"><span>${(F.typeById(c.type) || { icon: "🎆" }).icon}</span><span class="cdots">${c.colors.map((k) => `<i style="background:${swatchCss(k)}"></i>`).join("")} <small class="muted">&nbsp;at ${Math.round(c.x * 100)}%, ${Math.round(c.y * 100)}%</small></span><button data-cdel="${i}" title="Remove">✕</button></div>`).join("") || '<p class="muted">No cues yet.</p>'}</div>
      <div class="row"><select id="showMusic">${A.TRACKS.map((t) => `<option value="${t.id}" ${show.music === t.id ? "selected" : ""}>🎵 ${t.name}</option>`).join("")}</select>
        <input class="txt" id="showName" placeholder="Show name" maxlength="30" value="${esc(show.name)}"><button class="btn primary" data-s="save" ${show.cues.length ? "" : "disabled"}>💾 Save show</button></div>
      <p class="muted">${show.cues.length} fireworks · ${dur.toFixed(1)}s · sky: ${(F.BGS.find((b) => b.id === E.bg) || {}).name} · <a href="#" data-s="mine" style="color:#ffe08a">My Shows →</a></p>`;
    d.onclick = (e) => {
      const b = e.target.closest("[data-s]"), del = e.target.closest("[data-cdel]");
      if (del) { show.cues.splice(+del.dataset.cdel, 1); renderShowCreator(d); return; }
      if (!b) return;
      e.preventDefault();
      const s = b.dataset.s;
      if (s === "rec") { show.recording = !show.recording; if (show.recording) { show.recStart = performance.now() - (show.cues.length ? (Math.max(...show.cues.map((c) => c.t)) + 0.6) * 1000 : 0); closeDrawer(); tip("⏺ Recording — tap the sky!"); } $("recBadge").hidden = !show.recording; $("recCount").textContent = show.cues.length; if (!show.recording) renderShowCreator(d); }
      else if (s === "add") { const fw = currentFw(), last = show.cues.length ? Math.max(...show.cues.map((c) => c.t)) : -0.8; show.cues.push({ t: +(last + 0.8).toFixed(2), type: fw.type, colors: fw.colors, mode: fw.mode, x: +R(0.15, 0.85).toFixed(3), y: +R(0.15, 0.45).toFixed(3), size: 1 }); renderShowCreator(d); }
      else if (s === "play") { closeDrawer(); playShow({ name: show.name || "Preview", bg: E.bg, music: show.music, cues: show.cues }); }
      else if (s === "clear") { show.cues = []; renderShowCreator(d); }
      else if (s === "save") { const name = ($("showName").value || "").trim() || "My show " + (P.shows.length + 1); P.shows.push({ name, bg: E.bg, music: show.music, cues: show.cues.slice(), created: Date.now() }); show.name = name; save(true); checkAch(); toast("💾 Saved “" + name + "” to My Shows"); }
      else if (s === "mine") myShows();
    };
    d.onchange = (e) => { const t = e.target.closest("[data-ct]"); if (t) { show.cues[+t.dataset.ct].t = Math.max(0, +t.value || 0); } if (e.target.id === "showMusic") show.music = e.target.value; if (e.target.id === "showName") show.name = e.target.value; };
  }
  let showTimer = null;
  function playShow(sh) {
    stopShow(true);
    if (sh.bg && bgOpen(F.BGS.find((b) => b.id === sh.bg) || {})) E.setBg(sh.bg);
    if (sh.music && sh.music !== "none") A.playMusic(sh.music); else A.stopMusic();
    const cues = sh.cues.slice().sort((a, b) => a.t - b.t);
    const t0 = performance.now() + 600;
    let i = 0;
    show.playing = { name: sh.name };
    renderPill();
    showTimer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const [W, H] = E.size();
      while (i < cues.length && cues[i].t <= t) { const c = cues[i++]; E.launch(c.x * W, c.y * H, { type: c.type, colors: c.colors, mode: c.mode, size: c.size }); }
      if (i >= cues.length && t > cues[cues.length - 1].t + 4) { stopShow(); toast("🎬 That's a wrap! Replay it from My Shows."); }
    }, 30);
  }
  function stopShow(silent) { clearInterval(showTimer); showTimer = null; if (show.playing) { show.playing = null; if (!silent) { if (S.track !== "none" && mode.id !== "show") A.playMusic(S.track); } renderPill(); } }

  /* ---------- draw your own shape ---------- */
  function drawShape() {
    openModal(`<div class="mhead"><h2>✏️ Draw your firework</h2><button class="ib" data-close>✕</button></div>
      <p class="muted">Draw one continuous line — a letter, a cat, a squiggle. It'll explode in exactly that shape.</p>
      <canvas class="pad" id="pad" width="520" height="520"></canvas>
      <div class="row" style="justify-content:center"><button class="btn" id="padClear">↺ Clear</button><button class="btn primary" id="padUse">✨ Use this shape</button></div>`);
    const c = $("pad"), x = c.getContext("2d"), pts = [];
    const redraw = () => { x.clearRect(0, 0, 520, 520); x.strokeStyle = "#ff9ad5"; x.lineWidth = 8; x.lineCap = x.lineJoin = "round"; x.shadowColor = "#ff9ad5"; x.shadowBlur = 16; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
    let down = false;
    const p = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 520, ((e.clientY - r.top) / r.height) * 520]; };
    c.addEventListener("pointerdown", (e) => { down = true; pts.length = 0; pts.push(p(e)); c.setPointerCapture(e.pointerId); redraw(); });
    c.addEventListener("pointermove", (e) => { if (!down) return; const q = p(e), l = pts[pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 6) { pts.push(q); redraw(); } });
    c.addEventListener("pointerup", () => (down = false));
    $("padClear").onclick = () => { pts.length = 0; redraw(); };
    $("padUse").onclick = () => {
      if (pts.length < 6) { toast("Draw a bit more first ✏️"); return; }
      const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      let m = 0; for (const [a, b] of pts) m = Math.max(m, Math.abs(a - cx), Math.abs(b - cy));
      // keep it as an open line: walk there and back so the outline sampler doesn't close it
      const norm = pts.map(([a, b]) => [+((a - cx) / m).toFixed(3), +((b - cy) / m).toFixed(3)]);
      const path = norm.concat(norm.slice(1, -1).reverse());
      P.customShape = path; F.customShape = path; S.type = "custom"; S.random = false; save(true);
      closeModal(); closeDrawer(); renderToolbar(); tip("✏️ Your shape is ready — tap the sky!");
    };
  }

  /* ---------- menus & modals ---------- */
  function openModal(html) { $("modalCard").innerHTML = html; $("modal").hidden = false; }
  function closeModal() { $("modal").hidden = true; }
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal") || e.target.closest("[data-close]")) closeModal(); });
  function modesModal() {
    openModal(`<div class="mhead"><h2>🎮 Game modes</h2><button class="ib" data-close>✕</button></div><div class="cards">${Object.entries(MODES).map(([k, m]) => `<button class="card" data-mode="${k}"><span class="ci">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>${k === "colour" ? `<small>✓ ${P.colorWins} completed</small>` : k === "shape" ? `<small>✓ ${P.shapeWins} completed</small>` : ""}</button>`).join("")}</div>`);
    $("modalCard").onclick = (e) => { const b = e.target.closest("[data-mode]"); if (b) { closeModal(); stopShow(true); setMode(b.dataset.mode); } };
  }
  function collectionModal() {
    const seen = F.TYPES.filter((t) => P.exploded[t.id]).length;
    openModal(`<div class="mhead"><h2>🎇 Firework collection</h2><button class="ib" data-close>✕</button></div>
      <p class="muted">${seen} / ${F.TYPES.length} launched · ${P.launched.toLocaleString()} fireworks so far. Tap one to use it.</p>
      ${CATS.map(([k, n]) => `<h4 style="margin:14px 0 8px">${n}</h4><div class="cards">${F.TYPES.filter((t) => t.cat === k).map((t) => { const ok = typeOpen(t); return `<button class="card ${ok ? "" : "locked"}" data-type="${t.id}"><span class="ci">${ok || !t.hidden ? t.icon : "❔"}</span><b>${ok || !t.hidden ? t.name : "???"}</b><small>${ok ? (P.exploded[t.id] ? "Launched " + P.exploded[t.id] + "×" : "Not launched yet") : t.hidden ? "Hint: " + t.hint : "🔒 After " + t.need + " fireworks"}</small></button>`; }).join("")}</div>`).join("")}
      ${P.unlockAll ? "" : `<p class="muted" style="margin-top:14px">Rather not wait? <button class="btn" data-all="1">🔓 Unlock all fireworks, colours & skies</button></p>`}`);
    $("modalCard").onclick = (e) => {
      if (e.target.closest("[data-all]")) { P.unlockAll = true; save(true); collectionModal(); toast("🔓 Everything unlocked. Enjoy the show!"); return; }
      const b = e.target.closest("[data-type]"); if (!b) return;
      const t = F.typeById(b.dataset.type); if (!typeOpen(t)) return;
      if (t.id === "custom" && !P.customShape) { drawShape(); return; }
      S.type = t.id; S.random = false; save(); closeModal(); $("menu").hidden = true; renderToolbar(); tip(t.icon + " " + t.name + " — tap the sky!");
    };
  }
  function skiesModal() {
    openModal(`<div class="mhead"><h2>🌌 Backgrounds</h2><button class="ib" data-close>✕</button></div><div class="skies">${F.BGS.map((b) => `<button class="skyb ${b.id === E.bg ? "on" : ""} ${bgOpen(b) ? "" : "locked"}" data-bg="${b.id}"><canvas width="236" height="140"></canvas><span>${bgOpen(b) ? b.icon + " " + b.name : "🔒 " + b.need + " fireworks"}</span></button>`).join("")}</div>`);
    $("modalCard").querySelectorAll("[data-bg]").forEach((b) => F.drawBgPreview(b.dataset.bg, b.querySelector("canvas")));
    $("modalCard").onclick = (e) => { const b = e.target.closest("[data-bg]"); if (!b) return; const bg = F.BGS.find((q) => q.id === b.dataset.bg); if (!bgOpen(bg)) { toast("🔒 Launch " + (bg.need - P.launched) + " more fireworks to unlock it"); return; } E.setBg(bg.id); S.bg = bg.id; save(); closeModal(); $("menu").hidden = true; };
  }
  function myShows() {
    closeDrawer();
    const list = P.shows.map((s, i) => ({ s, i, mine: true })).concat(BUILT_IN.map((s) => ({ s, mine: false })));
    openModal(`<div class="mhead"><h2>🎬 My Shows</h2><button class="ib" data-close>✕</button></div>
      ${P.shows.length ? "" : `<p class="muted">You haven't saved a show yet. Open 🎬 in the toolbar, press ⏺ Record and tap the sky. Meanwhile, enjoy these:</p>`}
      <div class="cards">${list.map(({ s, i, mine }) => `<div class="card"><b>${mine ? "" : "⭐ "}${esc(s.name)}</b><small>${s.cues.length} fireworks · ${Math.max(...s.cues.map((c) => c.t)).toFixed(0)}s · ${(A.TRACKS.find((t) => t.id === s.music) || {}).name || ""}</small>
        <div class="row" style="margin-top:6px"><button class="btn primary" data-play="${mine ? "m" + i : "b" + BUILT_IN.indexOf(s)}">▶ Play</button><button class="btn" data-edit="${mine ? "m" + i : "b" + BUILT_IN.indexOf(s)}">✏️ Edit</button>${mine ? `<button class="btn" data-del="${i}">🗑️</button>` : ""}</div></div>`).join("")}</div>`);
    const get = (k) => (k[0] === "m" ? P.shows[+k.slice(1)] : BUILT_IN[+k.slice(1)]);
    $("modalCard").onclick = (e) => {
      const p = e.target.closest("[data-play]"), ed = e.target.closest("[data-edit]"), dl = e.target.closest("[data-del]");
      if (p) { closeModal(); $("menu").hidden = true; playShow(get(p.dataset.play)); }
      else if (ed) { const s = get(ed.dataset.edit); show.cues = s.cues.map((c) => Object.assign({}, c)); show.name = s.builtIn ? s.name + " (my copy)" : s.name; show.music = s.music; closeModal(); $("menu").hidden = true; openDrawer("show"); }
      else if (dl) { if (confirm("Delete this show?")) { P.shows.splice(+dl.dataset.del, 1); save(true); myShows(); } }
    };
  }
  function achModal() {
    openModal(`<div class="mhead"><h2>🏆 Achievements</h2><button class="ib" data-close>✕</button></div>
      <p class="muted">${ACH.filter((a) => P.ach[a[0]]).length} / ${ACH.length} · just for fun, no pressure.</p>
      <div class="ach">${ACH.map(([id, icon, name, desc]) => `<div class="${P.ach[id] ? "" : "no"}"><span class="ai">${icon}</span><span><b>${name}</b><small>${desc}</small></span></div>`).join("")}</div>`);
  }
  $("menu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    A.unlock();
    const m = b.dataset.m;
    if (m === "free") { stopShow(true); setMode("free"); }
    else if (m === "relax") { stopShow(true); setMode("relax"); }
    else if (m === "modes") modesModal();
    else if (m === "collection") collectionModal();
    else if (m === "skies") skiesModal();
    else if (m === "shows") myShows();
    else if (m === "achievements") achModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    const k = e.key.toLowerCase();
    if (k === "escape") { if (!$("modal").hidden) closeModal(); else if (open) closeDrawer(); else $("menu").hidden = !$("menu").hidden; }
    else if (k === "h") $("app").classList.toggle("ui-hidden");
    else if (k === "s") { E.slow = !E.slow; renderToolbar(); }
    else if (k === "c") E.clear();
    else if (k === " ") { e.preventDefault(); const [W, H] = E.size(); launchAt(R(W * 0.1, W * 0.9), H * R(0.15, 0.5)); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) A.stopMusic(); else if (mode.id === "relax") A.playMusic("calm"); else if (mode.id === "show") startAutoShow(); else if (S.track !== "none" && $("menu").hidden) A.playMusic(S.track); });

  /* ---------- boot ---------- */
  renderToolbar();
  renderPill();
  // a few fireworks behind the menu to set the mood
  const intro = setInterval(() => { if (!$("menu").hidden) { const [W, H] = E.size(); E.launch(R(W * 0.1, W * 0.9), H * R(0.12, 0.4), { type: pick(["peony", "willow", "chrysanthemum", "heart", "star", "glitter"]), colors: pick([["pink", "gold"], ["blue", "white"], ["gold"], ["purple", "pink"], ["green", "yellow"], ["rainbow"]]), mode: "mix", size: 0.9, whistle: 0 }); } else clearInterval(intro); }, 1400);
  const s0 = E.sound; E.sound = null; setTimeout(() => (E.sound = s0), 100); // stay silent until the first tap
  FW.app = { setMode, playShow, launchAt, P: () => P, S, ACH, myShows, collectionModal, skiesModal, achModal, modesModal, openDrawer, drawShape, BUILT_IN };
})();
