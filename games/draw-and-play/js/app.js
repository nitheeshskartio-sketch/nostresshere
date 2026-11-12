/* ============ DRAW & PLAY — app: levels, progress, palette, completion ============ */
(function () {
  "use strict";
  const DP = window.DP;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const mix = DP.color.mix;

  /* =========================================================
     SAVED PROGRESS (localStorage) + ARTWORK (IndexedDB)
     ========================================================= */
  const KEY = "nsh-draw";
  const state = Object.assign({ stars: {}, scores: {}, recent: [], world: 0, boundary: true, unlockAll: false }, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const db = (() => {
    let p = null;
    const open = () => p || (p = new Promise((res) => {
      try {
        const r = indexedDB.open("nsh-draw", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("art");
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    }));
    const tx = async (mode, fn) => { const d = await open(); if (!d) return null; return new Promise((res) => { const t = d.transaction("art", mode); const req = fn(t.objectStore("art")); t.oncomplete = () => res(req && req.result); t.onerror = () => res(null); }); };
    return {
      get: (k) => tx("readonly", (s) => s.get(k)),
      put: (k, v) => tx("readwrite", (s) => s.put(v, k)),
      del: (k) => tx("readwrite", (s) => s.delete(k)),
      all: () => tx("readonly", (s) => s.getAll()),
      keys: () => tx("readonly", (s) => s.getAllKeys())
    };
  })();

  /* =========================================================
     UNLOCKS
     ========================================================= */
  const totalStars = () => Object.values(state.stars).reduce((a, b) => a + b, 0);
  const WORLD_NEED = [0, 8, 20, 32, 44, 56];
  const BRUSH_NEED = { fill: 0, brush: 0, pencil: 0, crayon: 0, marker: 0, watercolor: 0, eraser: 0, spray: 3, glitter: 6, rainbow: 10, neon: 15, texture: 20 };
  const PALETTES = {
    basic: { name: "Basic", need: 0, colors: ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#007aff", "#5856d6", "#af52de", "#ff2d92", "#a2845e", "#8e8e93", "#1c1c1e"] },
    pastel: { name: "Pastel", need: 0, colors: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff", "#d7baff", "#ffc6ff", "#c9f2ff", "#fde2e4", "#e2ece9", "#fff1e6", "#ffffff"] },
    nature: { name: "Nature", need: 0, colors: ["#2d6a4f", "#40916c", "#74c69d", "#b7e4c7", "#8b5e34", "#6f4518", "#bc6c25", "#dda15e", "#90e0ef", "#0077b6", "#023e8a", "#e9c46a"] },
    skin: { name: "Skin", need: 0, colors: ["#ffe0bd", "#ffcd94", "#eac086", "#e0ac69", "#c68642", "#a0662f", "#8d5524", "#5c3a21", "#f8d5c2", "#e8b4a0", "#d4a373", "#3b2219"] },
    neon: { name: "Neon", need: 8, colors: ["#ff073a", "#ff6ec7", "#fe019a", "#bc13fe", "#4d4dff", "#00ffff", "#39ff14", "#ccff00", "#fff01f", "#ff9933", "#00ff9f", "#ff00ff"] },
    sunset: { name: "Sunset", need: 16, colors: ["#370617", "#6a040f", "#9d0208", "#d00000", "#dc2f02", "#e85d04", "#f48c06", "#faa307", "#ffba08", "#ffd6a5", "#cdb4db", "#7b2cbf"] }
  };
  const brushUnlocked = (id) => state.unlockAll || totalStars() >= (BRUSH_NEED[id] || 0);
  const paletteUnlocked = (id) => state.unlockAll || totalStars() >= PALETTES[id].need;
  const worldUnlocked = (w) => state.unlockAll || totalStars() >= WORLD_NEED[w];
  function levelUnlocked(L) {
    if (state.unlockAll) return true;
    if (!worldUnlocked(L.world)) return false;
    if (L.index === 0) return true;
    const prev = DP.LEVELS.find((x) => x.world === L.world && x.index === L.index - 1);
    return !!state.stars[prev.id];
  }

  let toastT = null;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2200); }

  /* =========================================================
     LEVEL MAP
     ========================================================= */
  const thumbCache = {};
  function lineThumb(L) {
    if (thumbCache[L.id]) return thumbCache[L.id];
    const c = document.createElement("canvas"); c.width = c.height = 240;
    DP.drawPage(c.getContext("2d"), L, 240);
    return (thumbCache[L.id] = c.toDataURL());
  }

  async function renderMap() {
    $("totalStars").textContent = totalStars();
    const ws = $("worlds"); ws.innerHTML = "";
    DP.WORLDS.forEach((w, i) => {
      const got = w.levels.reduce((a, _, li) => a + (state.stars[w.id + "-" + (li + 1)] || 0), 0);
      const b = document.createElement("button");
      b.type = "button"; b.className = "world" + (i === state.world ? " active" : "") + (worldUnlocked(i) ? "" : " locked");
      b.style.setProperty("--wc", w.color);
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i === state.world);
      b.innerHTML = '<span class="wi">' + w.icon + "</span><b>" + w.name + "</b><small>" + (worldUnlocked(i) ? "⭐ " + got + " / 30" : "Needs " + WORLD_NEED[i] + " ⭐") + "</small>";
      b.addEventListener("click", () => { state.world = i; save(); renderMap(); });
      ws.appendChild(b);
    });
    const w = DP.WORLDS[state.world];
    $("worldTitle").textContent = w.icon + " World " + (state.world + 1) + ": " + w.name;
    const got = w.levels.reduce((a, _, li) => a + (state.stars[w.id + "-" + (li + 1)] || 0), 0);
    $("worldBar").style.width = (got / 30) * 100 + "%";
    $("worldProg").textContent = got + " / 30 ⭐";
    const grid = $("levels"); grid.innerHTML = "";
    const keys = new Set((await db.keys()) || []);
    const levels = DP.LEVELS.filter((L) => L.world === state.world);
    let firstOpen = null;
    for (const L of levels) {
      const ok = levelUnlocked(L), st = state.stars[L.id] || 0;
      if (ok && !st && !firstOpen) firstOpen = L;
      const b = document.createElement("button");
      b.type = "button"; b.className = "level" + (ok ? "" : " locked");
      b.innerHTML = '<span class="thumb"><img alt="" loading="lazy"></span><span class="num">' + L.num + "</span>" +
        (L.special ? '<span class="sp">' + DP.SPECIALS[L.special].icon + " Special</span>" : "") +
        '<span class="lv-info"><b>' + L.title + "</b><small>" + L.difficulty + "</small><span class=\"lv-stars\">" + [1, 2, 3].map((i) => '<span class="' + (i <= st ? "" : "off") + '">⭐</span>').join("") + "</span></span>";
      b.querySelector("img").src = lineThumb(L);
      if (keys.has(L.id)) db.get(L.id).then((rec) => { if (rec && rec.thumb) b.querySelector("img").src = URL.createObjectURL(rec.thumb); });
      b.addEventListener("click", () => { if (ok) openLevel(L); else toast(worldUnlocked(L.world) ? "🔒 Finish level " + L.index + " first." : "🔒 This world needs " + WORLD_NEED[L.world] + " stars."); });
      b.title = ok ? "Level " + L.num + ": " + L.title : "Locked";
      grid.appendChild(b);
    }
    if (firstOpen) grid.children[firstOpen.index].classList.add("current");
    const nextW = DP.WORLDS.findIndex((_, i) => !worldUnlocked(i));
    $("unlockHint").textContent = nextW > 0 ? "⭐ Collect " + WORLD_NEED[nextW] + " stars to unlock " + DP.WORLDS[nextW].icon + " " + DP.WORLDS[nextW].name + " (you have " + totalStars() + ")." : "🎉 Every world is unlocked. You legend.";
  }

  function show(screen) {
    ["mapScreen", "playScreen", "galleryScreen"].forEach((id) => ($(id).hidden = id !== screen));
    document.body.classList.toggle("playing", screen === "playScreen");
    window.scrollTo(0, 0);
  }

  /* =========================================================
     PLAY
     ========================================================= */
  const engine = new DP.Engine($("viewport"));
  let level = null, special = null, timer = null, started = false, finished = false, cov = 0, saveT = null, covT = null, limited = null, suggested = null;

  async function openLevel(L, fresh) {
    if (level && !finished) await saveNow();
    level = L; special = L.special; finished = false; started = false; cov = 0;
    show("playScreen");
    engine.locked = false;
    engine.load(L);
    const rec = fresh ? null : await db.get(L.id);
    if (rec && rec.paint) await engine.loadPaint(rec.paint);
    else if (special === "partial") engine.preColor(0.4, ["#ffc078", "#74c0fc", "#8ce99a", "#ffa8a8", "#b197fc", "#ffe066"]);
    // challenge setup
    const rnd = mulberry(L.id);
    limited = special === "palette" ? shuffle(PALETTES.basic.colors.slice(0, 11), rnd).slice(0, 6) : null;
    suggested = special === "combo" ? pick([["#ff6b6b", "#ffd43b", "#4dabf7", "#69db7c"], ["#f783ac", "#b197fc", "#74c0fc", "#fff3bf"], ["#2d6a4f", "#dda15e", "#90e0ef", "#bc6c25"], ["#ff9500", "#5856d6", "#00c7be", "#ffcc00"]]) : null;
    if (limited && !limited.includes(engine.opts.color)) setColor(limited[0]);
    if (special === "brushes" && engine.opts.tool === "fill") setTool("brush");
    $("lvlTitle").textContent = "Level " + L.num + " · " + L.title;
    $("lvlSub").textContent = DP.WORLDS[L.world].icon + " " + DP.WORLDS[L.world].name + " · " + L.difficulty;
    const sb = $("specialBadge");
    sb.hidden = !special;
    if (special) { sb.textContent = DP.SPECIALS[special].icon + " " + DP.SPECIALS[special].name; sb.title = DP.SPECIALS[special].desc; }
    clearInterval(timer);
    $("timer").hidden = special !== "timed";
    if (special === "timed") { timeLeft = L.index < 5 ? 180 : 240; renderTimer(); }
    const prev = DP.LEVELS[DP.LEVELS.indexOf(L) - 1], next = DP.LEVELS[DP.LEVELS.indexOf(L) + 1];
    $("prevBtn").disabled = !prev || !levelUnlocked(prev);
    $("nextBtn").disabled = !next || !levelUnlocked(next);
    renderTools(); renderPalette(); updateUndo(); updateCoverage();
    if (special && !rec) setTimeout(() => showMsg(DP.SPECIALS[special].icon, DP.SPECIALS[special].name, DP.SPECIALS[special].desc + (special === "timed" ? " The clock starts with your first touch." : ""), [["Let's go!", null, true]]), 300);
  }

  function mulberry(str) { let a = 0; for (const ch of str) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------- timer ---------- */
  let timeLeft = 0;
  function renderTimer() {
    const m = Math.floor(Math.max(0, timeLeft) / 60), s = Math.floor(Math.max(0, timeLeft) % 60);
    $("timerVal").textContent = m + ":" + String(s).padStart(2, "0");
    $("timer").classList.toggle("urgent", timeLeft <= 20 && started);
  }
  function startTimer() {
    if (special !== "timed" || started) return;
    started = true;
    timer = setInterval(() => {
      if (!$("doneOverlay").hidden || !$("msgOverlay").hidden) return;
      timeLeft--; renderTimer();
      if (timeLeft <= 0) {
        clearInterval(timer);
        cov = engine.coverage();
        if (cov >= 0.5) finish(true);
        else {
          engine.locked = true;
          showMsg("⏰", "Time's up!", "You coloured " + Math.round(cov * 100) + "% — you need 50% to finish. Want another go?", [
            ["Try again", () => { engine.locked = false; openLevel(level, true); }, true],
            ["Keep colouring (no timer)", () => { engine.locked = false; special = null; $("timer").hidden = true; $("specialBadge").hidden = true; }]
          ]);
        }
      }
    }, 1000);
  }

  /* ---------- engine events ---------- */
  engine.onChange = (kind) => {
    startTimer();
    if (kind === "stroke" || kind === "fill") pushRecent(engine.opts.color);
    updateUndo();
    clearTimeout(covT); covT = setTimeout(updateCoverage, 200);
    clearTimeout(saveT); saveT = setTimeout(saveNow, 1200);
  };
  engine.onView = (z) => { $("zoomPct").textContent = Math.round(z * 100) + "%"; };

  function updateCoverage() {
    cov = engine.coverage();
    const pct = Math.round(cov * 100);
    $("ringPct").textContent = pct + "%";
    $("ringFg").style.strokeDashoffset = 94.25 * (1 - Math.min(1, cov / 0.95));
    $("ring").classList.toggle("ok", cov >= 0.5);
    const fb = $("finishBtn");
    fb.disabled = cov < 0.5;
    fb.classList.toggle("ready", cov >= 0.5 && !finished);
    fb.title = cov < 0.5 ? "Colour at least half the picture to finish (" + pct + "% so far)" : "Finish and collect your stars!";
  }
  function updateUndo() { $("undoBtn").disabled = !engine.undoStack.length; $("redoBtn").disabled = !engine.redoStack.length; }

  async function saveNow(final) {
    if (!level) return;
    clearTimeout(saveT);
    const paint = await engine.paintBlob();
    const old = (await db.get(level.id)) || {};
    const rec = { paint, thumb: old.thumb || null, done: old.done || false, ts: Date.now(), title: level.title };
    if (final || old.done) rec.thumb = await new Promise((res) => engine.composite(360).toBlob(res, "image/jpeg", 0.88));
    if (final) rec.done = true;
    await db.put(level.id, rec);
  }

  /* =========================================================
     TOOLS
     ========================================================= */
  const TOOL_ORDER = ["fill", "brush", "pencil", "crayon", "watercolor", "marker", "spray", "glitter", "rainbow", "neon", "texture", "eraser"];
  function renderTools() {
    const box = $("tools"); box.innerHTML = "";
    TOOL_ORDER.forEach((id) => {
      const def = id === "fill" ? { name: "Fill", icon: "🪣" } : DP.BRUSHES[id];
      const b = document.createElement("button");
      b.type = "button"; b.className = "tool" + (engine.opts.tool === id ? " active" : "");
      const locked = !brushUnlocked(id), banned = special === "brushes" && id === "fill";
      if (locked) { b.classList.add("locked"); b.dataset.need = BRUSH_NEED[id]; }
      b.disabled = banned;
      b.title = banned ? "No paint bucket in this challenge!" : locked ? def.name + " unlocks at " + BRUSH_NEED[id] + " stars" : def.name;
      b.innerHTML = '<span class="ti">' + def.icon + '</span><span class="tn">' + def.name + "</span>";
      b.addEventListener("click", () => { if (locked) { toast("🔒 " + def.name + " unlocks at " + BRUSH_NEED[id] + " ⭐ (you have " + totalStars() + ")"); return; } setTool(id); });
      box.appendChild(b);
    });
    const pat = $("patterns");
    pat.hidden = engine.opts.tool !== "texture";
    pat.innerHTML = DP.PATTERNS.map((p) => '<button type="button" data-p="' + p + '" class="' + (engine.opts.pattern === p ? "active" : "") + '">' + p + "</button>").join("");
    const noSize = engine.opts.tool === "fill";
    $("size").closest("label").style.opacity = noSize ? 0.4 : 1;
  }
  function setTool(id) { engine.opts.tool = id; renderTools(); }
  $("patterns").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { engine.opts.pattern = b.dataset.p; renderTools(); } });
  const bindRange = (id, out, fn, fmt) => { const el = $(id); const upd = () => { fn(+el.value); $(out).textContent = fmt(+el.value); }; el.addEventListener("input", upd); upd(); };
  bindRange("size", "sizeVal", (v) => (engine.opts.size = v), (v) => v);
  bindRange("opacity", "opVal", (v) => (engine.opts.opacity = v / 100), (v) => v + "%");
  bindRange("intensity", "inVal", (v) => { engine.opts.intensity = v / 100; renderCurrent(); }, (v) => v + "%");
  $("boundary").checked = state.boundary; engine.opts.boundary = state.boundary;
  $("boundary").addEventListener("change", (e) => { engine.opts.boundary = state.boundary = e.target.checked; save(); toast(e.target.checked ? "🛡️ Colours stay inside the lines" : "🎨 Free drawing — go anywhere"); });

  /* =========================================================
     PALETTE
     ========================================================= */
  let palTab = "basic";
  function setColor(c) { engine.opts.color = c; $("customColor").value = c; renderPalette(); }
  function sw(c, cls) { return '<button type="button" class="sw' + (cls || "") + (c === engine.opts.color ? " active" : "") + '" style="--c:' + c + '" data-c="' + c + '" title="' + c + '" aria-label="Colour ' + c + '"></button>'; }
  function renderCurrent() {
    $("curSwatch").style.background = engine.color;
    $("curHex").textContent = engine.opts.color.toUpperCase() + (engine.opts.intensity < 1 ? " · " + Math.round(engine.opts.intensity * 100) + "%" : "");
    $("curName").textContent = limited ? "Limited palette" : "Your colour";
  }
  function renderPalette() {
    const tabs = $("palTabs");
    if (limited) {
      tabs.innerHTML = "";
      $("swatches").innerHTML = limited.map((c) => sw(c)).join("");
      $("shades").innerHTML = ""; $("shades").previousElementSibling.hidden = true;
      $("recentBox").hidden = true;
      $("customColor").closest(".picker").classList.add("disabled");
    } else {
      tabs.innerHTML = Object.entries(PALETTES).map(([id, p]) => '<button type="button" data-tab="' + id + '" class="' + (id === palTab ? "active" : "") + (paletteUnlocked(id) ? "" : " locked") + '">' + (paletteUnlocked(id) ? "" : "🔒") + p.name + "</button>").join("");
      $("swatches").innerHTML = PALETTES[palTab].colors.map((c) => sw(c)).join("");
      const base = engine.opts.color;
      const shades = [0.6, 0.45, 0.3, 0.15].map((t) => mix(base, "#000000", t)).concat([base], [0.25, 0.45, 0.65, 0.82].map((t) => mix(base, "#ffffff", t)));
      $("shades").innerHTML = shades.map((c) => sw(c)).join(""); $("shades").previousElementSibling.hidden = false;
      $("recentBox").hidden = false;
      $("recent").innerHTML = state.recent.length ? state.recent.map((c) => sw(c)).join("") : '<small class="muted" style="grid-column:1/-1">Colours you use show up here.</small>';
      $("customColor").closest(".picker").classList.remove("disabled");
    }
    $("suggestBox").hidden = !suggested;
    if (suggested) $("suggest").innerHTML = suggested.map((c) => sw(c)).join("");
    renderCurrent();
  }
  document.querySelector(".palette-panel").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) { if (!paletteUnlocked(t.dataset.tab)) { toast("🔒 " + PALETTES[t.dataset.tab].name + " palette unlocks at " + PALETTES[t.dataset.tab].need + " ⭐"); return; } palTab = t.dataset.tab; renderPalette(); return; }
    const s = e.target.closest("[data-c]");
    if (s) { setColor(s.dataset.c); if (engine.opts.tool === "eraser") setTool("brush"); }
  });
  $("customColor").addEventListener("input", (e) => { engine.opts.color = e.target.value; renderPalette(); });
  function pushRecent(c) {
    if (engine.opts.tool === "eraser" || limited) return;
    state.recent = [c].concat(state.recent.filter((x) => x !== c)).slice(0, 12);
    save();
    if (!$("recentBox").hidden) $("recent").innerHTML = state.recent.map((x) => sw(x)).join("");
  }

  /* =========================================================
     TOP BAR
     ========================================================= */
  $("homeBtn").addEventListener("click", async () => { await saveNow(); clearInterval(timer); level = null; show("mapScreen"); renderMap(); });
  $("prevBtn").addEventListener("click", () => { const L = DP.LEVELS[DP.LEVELS.indexOf(level) - 1]; if (L) openLevel(L); });
  $("nextBtn").addEventListener("click", () => { const L = DP.LEVELS[DP.LEVELS.indexOf(level) + 1]; if (L && levelUnlocked(L)) openLevel(L); });
  $("undoBtn").addEventListener("click", () => engine.undo());
  $("redoBtn").addEventListener("click", () => engine.redo());
  $("resetBtn").addEventListener("click", () => showMsg("🗑️", "Clear all colouring?", "This wipes the page back to plain outlines. (You can still Undo.)", [["Clear it", () => engine.clearAll(), true], ["Keep it"]]));
  $("zoomIn").addEventListener("click", () => engine.zoomBy(1.25));
  $("zoomOut").addEventListener("click", () => engine.zoomBy(0.8));
  $("zoomFit").addEventListener("click", () => engine.fit());
  $("panBtn").addEventListener("click", () => { engine.panMode = !engine.panMode; $("panBtn").classList.toggle("on", engine.panMode); $("viewport").classList.toggle("can-pan", engine.panMode); toast(engine.panMode ? "✋ Drag to move the page. Tap ✋ again to colour." : "🖌️ Back to colouring"); });
  $("saveBtn").addEventListener("click", async () => { await saveNow(); toast("💾 Saved on this device. Come back any time."); });
  $("downloadBtn").addEventListener("click", () => download());
  $("finishBtn").addEventListener("click", () => finish(false));
  document.addEventListener("keydown", (e) => {
    if ($("playScreen").hidden || e.target.closest("input")) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? engine.redo() : engine.undo(); }
    else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); engine.redo(); }
    else if (k === "f" && !e.ctrlKey) setTool(special === "brushes" ? "brush" : "fill");
    else if (k === "b") setTool("brush");
    else if (k === "e") setTool("eraser");
    else if (k === "[") { $("size").value = Math.max(2, +$("size").value - 4); $("size").dispatchEvent(new Event("input")); }
    else if (k === "]") { $("size").value = Math.min(90, +$("size").value + 4); $("size").dispatchEvent(new Event("input")); }
  });

  function hiResComposite(size) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
    x.drawImage(engine.paint, 0, 0, size, size);
    const lines = document.createElement("canvas"); lines.width = lines.height = size;
    DP.drawPage(lines.getContext("2d"), level, size);
    x.globalCompositeOperation = "multiply";
    x.drawImage(lines, 0, 0);
    return c;
  }
  function download() {
    const c = hiResComposite(1600);
    c.toBlob((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "draw-and-play-" + level.id + "-" + level.title.toLowerCase().replace(/\s+/g, "-") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("⬇️ Downloaded! Fridge-worthy.");
    }, "image/png");
  }

  /* =========================================================
     MESSAGES
     ========================================================= */
  function showMsg(icon, title, text, buttons) {
    const card = $("msgCard");
    card.innerHTML = '<div class="big">' + icon + "</div><h2>" + title + '</h2><p class="muted">' + text + '</p><div class="done-btns"></div>';
    const row = card.querySelector(".done-btns");
    buttons.forEach(([label, fn, primary]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (primary ? " primary" : ""); b.textContent = label;
      b.addEventListener("click", () => { $("msgOverlay").hidden = true; if (fn) fn(); });
      row.appendChild(b);
    });
    $("msgOverlay").hidden = false;
    row.querySelector("button").focus();
  }

  /* =========================================================
     COMPLETION
     ========================================================= */
  const PRAISE = ["Beautiful!", "Masterpiece!", "Gallery-worthy!", "Wow, look at that!", "Pure art!", "Stunning!", "Picasso who?"];
  async function finish(byTimer) {
    cov = engine.coverage();
    if (cov < 0.5) { toast("Colour at least half the picture first 🙂"); return; }
    finished = true; clearInterval(timer);
    $("finishBtn").classList.remove("ready");
    const colors = engine.colorsUsed.size, tools = engine.toolsUsed.size;
    let stars = cov >= 0.88 || (cov >= 0.75 && colors >= 5) ? 3 : cov >= 0.68 ? 2 : 1;
    const rows = [["🖍️ Coloured", Math.round(cov * 100) + "%", Math.round(cov * 700)], ["🎨 Colours used", colors, Math.min(colors, 10) * 25], ["🖌️ Tools used", tools, Math.min(tools, 6) * 20]];
    if (special === "timed") rows.push(["⏱️ Time left", Math.max(0, timeLeft) + "s", Math.max(0, timeLeft) * 3]);
    if (special === "combo") { const hit = suggested.filter((c) => engine.colorsUsed.has(c)).length; rows.push(["💡 Suggested colours", hit + " / 4", hit * 80]); }
    if (special === "palette" || special === "brushes" || special === "partial") rows.push(["🏅 Challenge bonus", "✓", 150]);
    const score = rows.reduce((a, r) => a + r[2], 0);
    const before = totalStars();
    const prevStars = state.stars[level.id] || 0;
    state.stars[level.id] = Math.max(prevStars, stars);
    state.scores[level.id] = Math.max(state.scores[level.id] || 0, score);
    save();
    await saveNow(true);
    const after = totalStars();

    // what did we unlock?
    const unl = [];
    Object.entries(BRUSH_NEED).forEach(([id, n]) => { if (n > before && n <= after) unl.push(DP.BRUSHES[id].icon + " " + DP.BRUSHES[id].name + " brush"); });
    Object.values(PALETTES).forEach((p) => { if (p.need > before && p.need <= after) unl.push("🎨 " + p.name + " palette"); });
    WORLD_NEED.forEach((n, i) => { if (n > before && n <= after) unl.push(DP.WORLDS[i].icon + " " + DP.WORLDS[i].name + " world"); });
    const next = DP.LEVELS[DP.LEVELS.indexOf(level) + 1];
    if (next && next.world === level.world && !prevStars) unl.unshift("▶ Level " + next.num + ": " + next.title);

    $("doneImg").src = hiResComposite(700).toDataURL("image/jpeg", 0.92);
    $("doneTitle").textContent = (byTimer ? "⏰ Just in time! " : "") + pick(PRAISE);
    $("doneStars").innerHTML = [1, 2, 3].map((i) => '<span class="' + (i <= stars ? "" : "off") + '">⭐</span>').join("");
    $("doneScore").innerHTML = "Score <b>" + score.toLocaleString() + "</b>" + (state.scores[level.id] === score && prevStars ? " · new best!" : "");
    $("doneTable").innerHTML = rows.map((r) => "<tr><td>" + r[0] + " <small class='muted'>(" + r[1] + ")</small></td><td>+" + r[2] + "</td></tr>").join("");
    $("doneUnlocks").textContent = unl.length ? "🔓 Unlocked: " + unl.join(" · ") : stars < 3 ? "Tip: colour more of the picture (or use 5+ colours) for 3 stars." : "";
    $("doneNext").hidden = !next || !levelUnlocked(next);
    $("doneOverlay").hidden = false;
    confetti();
  }

  $("doneNext").addEventListener("click", () => { $("doneOverlay").hidden = true; const n = DP.LEVELS[DP.LEVELS.indexOf(level) + 1]; if (n) openLevel(n); });
  $("doneKeep").addEventListener("click", () => { $("doneOverlay").hidden = true; finished = false; updateCoverage(); });
  $("doneReplay").addEventListener("click", () => { $("doneOverlay").hidden = true; openLevel(level, true); });
  $("doneDownload").addEventListener("click", download);

  function confetti() {
    const c = $("confetti"), x = c.getContext("2d");
    c.width = innerWidth; c.height = innerHeight;
    const cols = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac", "#ffa94d"];
    const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: pick(cols) }));
    const t0 = performance.now();
    (function step(t) {
      x.clearRect(0, 0, c.width, c.height);
      for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }
      if (t - t0 < 4500 && !$("doneOverlay").hidden) requestAnimationFrame(step); else x.clearRect(0, 0, c.width, c.height);
    })(t0);
  }

  /* =========================================================
     GALLERY
     ========================================================= */
  async function renderGallery() {
    show("galleryScreen");
    const g = $("gallery"); g.innerHTML = "";
    const done = [];
    for (const L of DP.LEVELS) if (state.stars[L.id]) done.push(L);
    if (!done.length) { g.innerHTML = '<div class="empty"><div style="font-size:3rem">🖼️</div>Nothing here yet — finish a page and it\'ll be framed right here.</div>'; return; }
    for (const L of done) {
      const rec = await db.get(L.id);
      const f = document.createElement("div"); f.className = "frame";
      f.innerHTML = '<img alt="' + L.title + '"><div class="f-row"><div><b>' + L.title + "</b><br><small class=\"muted\">" + DP.WORLDS[L.world].icon + " " + "⭐".repeat(state.stars[L.id]) + '</small></div><div class="f-btns"><button class="tb" type="button" data-open title="Open">🖍️</button></div></div>';
      f.querySelector("img").src = rec && rec.thumb ? URL.createObjectURL(rec.thumb) : lineThumb(L);
      f.querySelector("[data-open]").addEventListener("click", () => openLevel(L));
      g.appendChild(f);
    }
  }
  $("galleryBtn").addEventListener("click", renderGallery);
  $("galleryBack").addEventListener("click", () => { show("mapScreen"); renderMap(); });

  window.addEventListener("beforeunload", () => { if (level && !finished) saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && level) saveNow(); });

  // test hook
  DP.app = { engine, openLevel, state, finish, renderMap, save };

  renderMap();
})();
