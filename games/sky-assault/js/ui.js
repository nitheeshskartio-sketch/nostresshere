/* ============ SKY ASSAULT — menus, hangar, upgrades, stages, collection, results ============ */
(function () {
  "use strict";
  const S = window.SKY, E = S.engine, AU = S.audio, ART = S.art;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString();
  const U = (S.ui = {});
  let toastT;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2200); }

  /* ---------- save ---------- */
  const KEY = "nsh-sky-save";
  const fresh = () => ({
    v: 1, stars: 0, upgrades: Object.fromEntries(S.UPGRADES.map((u) => [u.id, 0])),
    planes: ["falcon"], plane: "falcon", primaries: ["mg"], secondaries: ["homing"], primary: "mg", secondary: "homing",
    cards: {}, equipped: [], blueprints: 0, comps: {}, rares: {}, medals: {}, wins: {}, best: {}, cleared: 0, seen: {},
    stats: { missions: 0, wins: 0, kills: 0, stars: 0, rescued: 0, bosses: 0, score: 0, playtime: 0 },
    settings: { sfx: true, music: true, shake: true, flash: true, lowFx: false, control: "auto" }, diff: 0
  });
  let save = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw) { save = Object.assign(fresh(), raw); save.upgrades = Object.assign(fresh().upgrades, raw.upgrades || {}); save.settings = Object.assign(fresh().settings, raw.settings || {}); save.stats = Object.assign(fresh().stats, raw.stats || {}); }
  } catch (e) { /* private mode */ }
  U.save = save;
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  const slots = () => 2 + (save.comps.slot1 ? 1 : 0) + (save.comps.slot2 ? 1 : 0);
  function applySettings() {
    AU.sfx = save.settings.sfx; AU.music = save.settings.music;
    E.shakeOn = save.settings.shake; E.flashOn = save.settings.flash; E.lowFx = save.settings.lowFx; E.controlMode = save.settings.control;
  }
  applySettings();

  /* ---------- layout: keep the play area a 9:16 portrait ---------- */
  function layout() {
    const app = $("app"), f = $("frame"), r = app.getBoundingClientRect();
    let h = r.height, w = (h * 9) / 16;
    if (w > r.width) { w = r.width; h = (w * 16) / 9; }
    f.style.width = w + "px"; f.style.height = h + "px";
    E.resize();
  }
  window.addEventListener("resize", layout);

  /* ---------- screens ---------- */
  const ui = () => $("ui");
  function show(html, cls) {
    const el = ui(); el.className = "ui " + (cls || ""); el.innerHTML = html; el.hidden = false;
    $("hudBtns").hidden = true;
    el.scrollTop = 0;
    return el;
  }
  function hideUi() { ui().hidden = true; ui().innerHTML = ""; }
  const starPill = () => `<div class="pill-stars">⭐ ${fmt(save.stars)}</div>`;
  const topbar = (title, back) => `<div class="ui-top"><button class="ui-back" data-go="${back || "menu"}">←</button><h2>${title}</h2>${starPill()}</div>`;
  function bind(el, handlers) {
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-go],[data-act]"); if (!b || b.disabled) return;
      AU.unlock(); AU.play("click");
      if (b.dataset.go) go(b.dataset.go, b.dataset);
      else if (handlers && handlers[b.dataset.act]) handlers[b.dataset.act](b.dataset, b);
    });
  }
  function go(where, ds) {
    if (where === "menu") menu();
    else if (where === "hangar") hangar(ds && ds.tab);
    else if (where === "upgrades") upgrades();
    else if (where === "stages") stages(ds && ds.world != null ? +ds.world : undefined);
    else if (where === "collection") collection();
    else if (where === "settings") settings();
  }
  // draw a sprite into a little canvas for the menus
  function thumb(spr, w, h, rot) {
    const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2;
    const x = c.getContext("2d"); x.scale(2, 2);
    const k = Math.min(w / spr.width, h / spr.height) * 0.92;
    x.translate(w / 2, h / 2); if (rot) x.rotate(rot); x.scale(k, k); x.drawImage(spr, -spr.width / 2, -spr.height / 2);
    c.style.width = w + "px"; c.style.height = h + "px";
    return c;
  }

  /* ---------- main menu ---------- */
  function menu() {
    E.abandon();
    const next = Math.min(save.cleared, S.STAGE_COUNT - 1);
    const el = show(`<div class="menu">
      ${starPill()}
      <div class="sky-logo"><span class="logo-sky">SKY</span><span class="logo-assault">ASSAULT</span><small>Ultimate air combat · 6 worlds · 18 missions</small></div>
      <div class="menu-btns">
        <button class="mb primary" data-act="play">▶ Play <small>${esc(S.stageName(next))}</small></button>
        <button class="mb" data-go="hangar">🛩️ Aircraft Hangar</button>
        <button class="mb" data-go="upgrades">🔧 Aircraft Upgrades</button>
        <button class="mb" data-go="stages">🗺️ Stage Selection</button>
        <div class="mb-row"><button class="mb" data-go="collection">🏆 Collection</button><button class="mb" data-go="settings">⚙️ Settings</button></div>
      </div>
      <p class="hint">Mouse: fly with the cursor · Touch: drag anywhere · Keys: WASD / arrows, 1–5 or Space for specials</p>
    </div>`, "dim");
    bind(el, { play: () => briefing(next, Math.min(save.diff || 0, save.wins[next] || 0)) });
  }

  /* ---------- hangar ---------- */
  function hangar(tab) {
    tab = tab || "aircraft";
    const tabs = [["aircraft", "🛩️ Aircraft"], ["weapons", "🔫 Weapons"], ["cards", "🃏 Cards"]];
    let body = "";
    if (tab === "aircraft") {
      body = `<div class="cards-grid">${S.PLANES.map((p) => {
        const own = save.planes.includes(p.id), sel = save.plane === p.id;
        const bar = (label, v, max) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.min(100, (v / max) * 100)}%"></b></i></div>`;
        let btn;
        if (sel) btn = `<button class="btn on" disabled>✓ Flying</button>`;
        else if (own) btn = `<button class="btn primary" data-act="pickPlane" data-id="${p.id}">Fly this</button>`;
        else if (p.blueprints) btn = `<button class="btn" ${save.blueprints >= p.blueprints ? "" : "disabled"} data-act="buildPlane" data-id="${p.id}">🧩 Build (${save.blueprints}/${p.blueprints} blueprints)</button>`;
        else btn = `<button class="btn" ${save.stars >= p.cost ? "" : "disabled"} data-act="buyPlane" data-id="${p.id}">⭐ ${fmt(p.cost)}</button>`;
        return `<div class="card ${sel ? "sel" : ""} ${own ? "" : "locked"}"><div class="thumb" data-plane="${p.id}"></div><h3>${p.name}</h3><small class="role">${p.role}</small>
          ${bar("Speed", p.speed, 1.3)}${bar("Hull", p.hp, 150)}${bar("Firepower", p.dmg, 1.35)}<p class="perk">★ ${p.perk}</p>${btn}</div>`;
      }).join("")}</div>`;
    } else if (tab === "weapons") {
      const row = (list, owned, cur, kind) => list.map((w) => {
        const own = owned.includes(w.id), sel = cur === w.id;
        const btn = sel ? `<button class="btn on" disabled>✓ Equipped</button>` : own ? `<button class="btn primary" data-act="equip${kind}" data-id="${w.id}">Equip</button>` : `<button class="btn" ${save.stars >= w.cost ? "" : "disabled"} data-act="buy${kind}" data-id="${w.id}">⭐ ${fmt(w.cost)}</button>`;
        return `<div class="row-item ${sel ? "sel" : ""}"><div><b>${w.name}</b><small>${w.desc}</small></div>${btn}</div>`;
      }).join("");
      body = `<h3 class="sec">Primary weapon <small>fires automatically</small></h3>${row(S.PRIMARY, save.primaries, save.primary, "Pri")}
        <h3 class="sec">Secondary weapon <small>missiles &amp; rockets</small></h3>${row(S.SECONDARY, save.secondaries, save.secondary, "Sec")}
        <h3 class="sec">Special weapons <small>buttons on screen · keys 1–5</small></h3>${S.SPECIALS.map((s) => { const open = save.cleared >= s.unlock; return `<div class="row-item ${open ? "" : "locked"}"><div><b>${s.icon} ${s.name} <kbd>${s.key}</kbd></b><small>${s.desc}${s.cd ? " · recharges in " + s.cd + "s" : " · refill by picking up 💣"}</small></div><span class="tag">${open ? "Ready" : "🔒 Clear " + esc(S.stageName(s.unlock - 1))}</span></div>`; }).join("")}`;
    } else {
      const owned = S.CARDS.filter((c) => save.cards[c.id]);
      body = `<p class="muted">Equip up to <b>${slots()}</b> cards before a mission. Find new cards as 🎁 rare items hidden in supply crates.</p>
        <div class="card-slots">${Array.from({ length: slots() }, (_, i) => { const c = S.CARDS.find((q) => q.id === save.equipped[i]); return `<div class="slot ${c ? "full" : ""}">${c ? c.icon + "<small>" + c.name + "</small>" : "<small>empty slot</small>"}</div>`; }).join("")}</div>
        <div class="bonus-cards">${S.CARDS.map((c) => { const own = !!save.cards[c.id], eq = save.equipped.includes(c.id); return `<button class="bcard ${own ? "" : "locked"} ${eq ? "eq" : ""}" data-act="toggleCard" data-id="${c.id}" ${own ? "" : "disabled"}><span class="ci">${own ? c.icon : "❔"}</span><b>${own ? c.name : "???"}</b><small>${own ? c.desc : "Not found yet"}</small>${eq ? '<span class="tag">Equipped</span>' : ""}</button>`; }).join("")}</div>
        ${owned.length ? "" : `<p class="muted center">No cards yet — look for glowing supply crates during missions!</p>`}`;
    }
    const el = show(`${topbar("🛩️ Aircraft Hangar")}<div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === tab ? "on" : ""}" data-go="hangar" data-tab="${k}">${n}</button>`).join("")}</div><div class="ui-body">${body}</div>`);
    el.querySelectorAll("[data-plane]").forEach((d) => d.appendChild(thumb(ART.player(S.planeById(d.dataset.plane), save.plane === d.dataset.plane ? save.upgrades : {}), 120, 100)));
    const spend = (cost) => { if (save.stars < cost) { toast("Not enough stars ⭐"); return false; } save.stars -= cost; AU.play("buy"); return true; };
    bind(el, {
      pickPlane: (d) => { save.plane = d.id; persist(); hangar("aircraft"); },
      buyPlane: (d) => { const p = S.planeById(d.id); if (spend(p.cost)) { save.planes.push(p.id); save.plane = p.id; persist(); toast("🛩️ " + p.name + " joins your squadron!"); hangar("aircraft"); } },
      buildPlane: (d) => { const p = S.planeById(d.id); if (save.blueprints >= p.blueprints) { save.planes.push(p.id); save.plane = p.id; persist(); AU.play("medal"); toast("🧩 " + p.name + " built from blueprints!"); hangar("aircraft"); } },
      equipPri: (d) => { save.primary = d.id; persist(); hangar("weapons"); },
      equipSec: (d) => { save.secondary = d.id; persist(); hangar("weapons"); },
      buyPri: (d) => { const w = S.PRIMARY.find((q) => q.id === d.id); if (spend(w.cost)) { save.primaries.push(w.id); save.primary = w.id; persist(); hangar("weapons"); } },
      buySec: (d) => { const w = S.SECONDARY.find((q) => q.id === d.id); if (spend(w.cost)) { save.secondaries.push(w.id); save.secondary = w.id; persist(); hangar("weapons"); } },
      toggleCard: (d) => {
        const i = save.equipped.indexOf(d.id);
        if (i >= 0) save.equipped.splice(i, 1);
        else if (save.equipped.length >= slots()) { toast("All " + slots() + " card slots are full. Unequip one first."); return; }
        else save.equipped.push(d.id);
        persist(); hangar("cards");
      }
    });
  }

  /* ---------- upgrades ---------- */
  function upgrades() {
    const plane = S.planeById(save.plane);
    const el = show(`${topbar("🔧 Aircraft Upgrades")}<div class="ui-body">
      <div class="up-hero"><div id="upThumb"></div><div><b>${plane.name}</b><small>Upgrades apply to every aircraft. Wing guns, missile racks and armour show up on your plane.</small></div></div>
      ${S.UPGRADES.map((u) => {
        const l = save.upgrades[u.id], maxed = l >= u.max, cost = S.upCost(u, l);
        return `<div class="row-item up"><div><b>${u.icon} ${u.name}</b><small>${u.fx(l)}${maxed ? "" : " → <em>" + u.fx(l + 1) + "</em>"}</small><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? "on" : ""}"></i>`).join("")}</div></div>
          ${maxed ? `<span class="tag">MAX</span>` : `<button class="btn ${save.stars >= cost ? "primary" : ""}" ${save.stars >= cost ? "" : "disabled"} data-act="buy" data-id="${u.id}">⭐ ${fmt(cost)}</button>`}</div>`;
      }).join("")}</div>`);
    $("upThumb").appendChild(thumb(ART.player(plane, save.upgrades), 120, 100));
    bind(el, { buy: (d) => { const u = S.UPGRADES.find((q) => q.id === d.id), c = S.upCost(u, save.upgrades[u.id]); if (save.stars >= c && save.upgrades[u.id] < u.max) { save.stars -= c; save.upgrades[u.id]++; persist(); AU.play("buy"); upgrades(); } } });
  }

  /* ---------- stage selection ---------- */
  const medalIcons = ["🎯", "💯", "🆘", "✨"];
  const medalNames = ["Destroy 70% of enemies", "Destroy 100% of enemies", "Rescue everyone", "Take no damage"];
  function stages(world) {
    if (world === undefined) world = Math.floor(Math.min(save.cleared, S.STAGE_COUNT - 1) / 3);
    const total = Object.values(save.medals).reduce((s, arr) => s + arr.flat().filter(Boolean).length, 0);
    const el = show(`${topbar("🗺️ Stage Selection")}<div class="tabs worlds">${S.WORLDS.map((w, i) => `<button class="tab ${i === world ? "on" : ""} ${i * 3 > save.cleared ? "locked" : ""}" data-go="stages" data-world="${i}">${w.icon}<span> ${w.name}</span></button>`).join("")}</div>
      <div class="ui-body"><p class="muted">🏅 ${total} / ${S.STAGE_COUNT * 16} medals · replay stages on harder difficulties for more medals and bigger rewards.</p>
      <div class="stage-list">${[0, 1, 2].map((s) => {
        const idx = world * 3 + s, open = idx <= save.cleared, won = save.wins[idx] || 0;
        const B = S.BOSSES[S.WORLDS[world].boss];
        return `<div class="stage ${open ? "" : "locked"}"><div class="st-head"><b>${esc(S.stageName(idx))}</b><small>${s === 2 ? "⚠ Boss: " + B.name + " (" + B.title + ")" : "Mini-boss: " + B.name}</small>${save.rares[idx] ? '<span class="tag gold">🎁 found</span>' : open ? '<span class="tag">🎁 hidden item</span>' : ""}</div>
          ${open ? `<div class="diffs">${S.DIFFS.map((d, di) => { const avail = di <= won; const m = (save.medals[idx] && save.medals[idx][di]) || []; return `<button class="diff ${avail ? "" : "locked"}" ${avail ? "" : "disabled"} data-act="brief" data-idx="${idx}" data-d="${di}" style="--c:${d.color}"><b>${d.name}</b><span class="medals">${medalIcons.map((ic, k) => `<i class="${m[k] ? "got" : ""}" title="${medalNames[k]}">${ic}</i>`).join("")}</span>${save.best[idx + "_" + di] ? `<small>Best ${fmt(save.best[idx + "_" + di])}</small>` : avail ? "<small>Not played</small>" : "<small>🔒 Clear " + S.DIFFS[di - 1].name + "</small>"}</button>`; }).join("")}</div>` : `<p class="muted">🔒 Clear ${esc(S.stageName(idx - 1))} to unlock</p>`}</div>`;
      }).join("")}</div></div>`);
    bind(el, { brief: (d) => briefing(+d.idx, +d.d) });
  }

  /* ---------- mission briefing ---------- */
  function briefing(idx, di) {
    const st = S.makeStage(idx), d = S.DIFFS[di], B = S.BOSSES[st.boss];
    const m = (save.medals[idx] && save.medals[idx][di]) || [];
    const eq = save.equipped.map((id) => S.CARDS.find((c) => c.id === id)).filter(Boolean);
    const plane = S.planeById(save.plane);
    const el = show(`<div class="brief">
      <div class="ui-top"><button class="ui-back" data-go="stages" data-world="${Math.floor(idx / 3)}">←</button><h2>Mission briefing</h2>${starPill()}</div>
      <div class="brief-card">
        <div class="brief-title"><span class="wicon">${st.world.icon}</span><div><b>${esc(st.name)}</b><small style="color:${d.color}">${d.name} difficulty · ${st.sub === 2 ? "Boss" : "Mini-boss"}: ${B.name}</small></div></div>
        <h4>Objectives & medals</h4>
        <ul class="objs">${medalNames.map((n, k) => `<li class="${m[k] ? "got" : ""}"><span>${medalIcons[k]}</span>${n}${k === 2 ? ` (${st.rescues} ${st.rescues === 1 ? "person" : "people"} — hover over the SOS circle)` : ""}${m[k] ? " ✓" : ""}</li>`).join("")}</ul>
        <p class="muted">${save.rares[idx] ? "🎁 You already found this stage's rare item." : "🎁 A glowing supply crate hides a rare item: " + rareName(S.RARE[idx]) + "."}</p>
        <h4>Your loadout</h4>
        <div class="loadout"><div id="brThumb"></div><div><b>${plane.name}</b><small>${S.PRIMARY.find((w) => w.id === save.primary).name} · ${S.SECONDARY.find((w) => w.id === save.secondary).name}</small><small>Cards: ${eq.length ? eq.map((c) => c.icon + " " + c.name).join(", ") : "none"}</small></div></div>
        <div class="row"><button class="btn" data-go="hangar">🛩️ Change loadout</button><button class="btn" data-go="hangar" data-tab="cards">🃏 Cards (${eq.length}/${slots()})</button></div>
        <button class="mb primary big" data-act="launch">🚀 Launch mission</button>
      </div></div>`, "dim");
    $("brThumb").appendChild(thumb(ART.player(plane, save.upgrades), 80, 70));
    bind(el, { launch: () => start(idx, di) });
  }
  function rareName(r) {
    if (!r) return "?";
    if (r.type === "blueprint") return "an Aurora blueprint fragment 🧩";
    if (r.type === "card") { const c = S.CARDS.find((q) => q.id === r.id); return "the " + c.icon + " " + c.name + " card"; }
    const c = S.COMPONENTS.find((q) => q.id === r.id); return "a rare component: " + c.icon + " " + c.name;
  }

  /* ---------- playing ---------- */
  let cur = null, playStart = 0;
  function start(idx, di) {
    cur = { idx, di };
    save.diff = di; persist();
    hideUi();
    $("hudBtns").hidden = false;
    buildHudButtons();
    AU.unlock();
    E.start(idx, di, save);
    playStart = performance.now();
  }
  function buildHudButtons() {
    $("specials").innerHTML = S.SPECIALS.map((s) => `<button class="sp" data-sp="${s.id}" title="${s.name} (${s.key})"><span class="ico">${s.icon}</span><span class="cnt"></span><span class="key">${s.key}</span><i class="cd"></i></button>`).join("");
  }
  $("specials").addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-sp]"); if (!b) return; e.preventDefault(); e.stopPropagation(); E.special(b.dataset.sp); });
  $("pauseBtn").addEventListener("click", () => U.pause());
  const hudCache = {};
  U.onHud = function () {
    for (const s of S.SPECIALS) {
      const st = E.specialState(s.id), el = document.querySelector('[data-sp="' + s.id + '"]');
      if (!el) continue;
      const key = JSON.stringify([st.locked, st.ready, st.active, st.count, st.cd ? Math.round(st.cd * 40) : 0]);
      if (hudCache[s.id] === key) continue;
      hudCache[s.id] = key;
      el.classList.toggle("locked", !!st.locked); el.classList.toggle("ready", !!st.ready); el.classList.toggle("active", !!st.active);
      el.querySelector(".cnt").textContent = s.id === "bomb" && !st.locked ? st.count : "";
      el.querySelector(".cd").style.setProperty("--p", st.cd > 0 ? Math.round(st.cd * 100) + "%" : "0%");
    }
  };
  U.pause = function () {
    if (!E.running || E.paused) return;
    E.pause(true);
    const el = show(`<div class="pause"><h2>⏸ Paused</h2>
      <div class="menu-btns"><button class="mb primary" data-act="resume">▶ Resume</button><button class="mb" data-act="restart">↺ Restart mission</button>
      <div class="mb-row"><button class="mb ${save.settings.sfx ? "" : "off"}" data-act="sfx">🔊 Sound</button><button class="mb ${save.settings.music ? "" : "off"}" data-act="music">🎵 Music</button></div>
      <button class="mb" data-act="quit">🏠 Quit to menu</button></div>
      <p class="hint">Quitting keeps the stars you've collected so far.</p></div>`, "dim");
    bind(el, {
      resume: () => { hideUi(); $("hudBtns").hidden = false; E.pause(false); },
      restart: () => { E.abandon(); start(cur.idx, cur.di); },
      sfx: () => { save.settings.sfx = !save.settings.sfx; applySettings(); persist(); U.pause.redraw(); },
      music: () => { save.settings.music = !save.settings.music; applySettings(); persist(); U.pause.redraw(); },
      quit: () => { const G = E.state(); if (G) { save.stars += G.stats.stars; save.stats.stars += G.stats.stars; persist(); } menu(); }
    });
  };
  U.pause.redraw = () => { E.paused = false; U.pause(); };
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Escape" || e.key === "p" || e.key === "P") && E.running) { e.preventDefault(); if (E.paused) { hideUi(); $("hudBtns").hidden = false; E.pause(false); } else U.pause(); }
  });

  /* ---------- mission results ---------- */
  U.onMissionEnd = function (r) {
    const idx = r.stage.idx, di = r.diffIdx, d = S.DIFFS[di], st = r.stats;
    save.stats.missions++; save.stats.kills += st.killed; save.stats.rescued += st.rescued; save.stats.score += st.score;
    save.stats.playtime += (performance.now() - playStart) / 1000;
    const rewards = [];
    let earned = st.stars;
    rewards.push(["⭐ Stars collected", st.stars]);
    const old = (save.medals[idx] && save.medals[idx][di]) || [false, false, false, false];
    const newMedals = r.medals.map((m, k) => m && !old[k]);
    if (r.won) {
      save.stats.wins++; save.stats.bosses++;
      const comp = Math.round((100 + 30 * idx) * d.reward);
      rewards.push(["🏁 Mission complete", comp]); earned += comp;
      const per = Math.round((120 + 25 * idx) * d.reward);
      const n = newMedals.filter(Boolean).length;
      if (n) { rewards.push(["🏅 New medals × " + n, per * n]); earned += per * n; }
      save.medals[idx] = save.medals[idx] || [];
      save.medals[idx][di] = old.map((m, k) => m || r.medals[k]);
      save.wins[idx] = Math.max(save.wins[idx] || 0, di + 1);
      const wasCleared = save.cleared;
      save.cleared = Math.max(save.cleared, Math.min(S.STAGE_COUNT, idx + 1));
      const sk = idx + "_" + di;
      if (!save.best[sk] || st.score > save.best[sk]) save.best[sk] = st.score;
      for (const sp of S.SPECIALS) if (sp.unlock > wasCleared && sp.unlock <= save.cleared) setTimeout(() => toast("🔓 New special weapon: " + sp.icon + " " + sp.name + "!", 3200), 800);
    }
    let rareLine = "";
    if (r.rare && !save.rares[idx]) {
      save.rares[idx] = true;
      if (r.rare.type === "card") save.cards[r.rare.id] = true;
      else if (r.rare.type === "blueprint") save.blueprints++;
      else save.comps[r.rare.id] = true;
      rareLine = `<div class="rare-got">🎁 Rare item: ${rareName(r.rare)}${r.rare.type === "blueprint" ? ` (${save.blueprints}/6)` : ""}</div>`;
    }
    save.stars += earned; save.stats.stars += earned;
    persist();
    const next = idx + 1 < S.STAGE_COUNT && r.won ? idx + 1 : null;
    const row = (k, v) => `<div class="res-row"><span>${k}</span><b>${v}</b></div>`;
    const el = show(`<div class="results">
      <h2 class="${r.won ? "win" : "lose"}">${r.won ? "🏆 Mission complete!" : "💥 Mission failed"}</h2>
      <p class="muted">${esc(r.stage.name)} · <span style="color:${d.color}">${d.name}</span></p>
      <div class="medal-row">${r.medals.map((m, k) => `<div class="medal ${m ? "got" : ""} ${newMedals[k] ? "new" : ""}"><span>${medalIcons[k]}</span><small>${medalNames[k]}</small>${newMedals[k] ? "<em>NEW</em>" : ""}</div>`).join("")}</div>
      <div class="res-grid">
        ${row("Enemies destroyed", st.killed + " / " + st.spawned + " (" + Math.round(r.killPct * 100) + "%)")}
        ${row("Stars collected", "⭐ " + fmt(st.stars))}
        ${row("People rescued", st.rescued + " / " + st.peopleTotal)}
        ${row("Damage received", Math.round(st.damage))}
        ${row("Best combo", st.maxCombo + " kills")}
        ${row("Mission score", fmt(st.score))}
      </div>
      ${rareLine}
      <div class="rewards"><h4>Rewards</h4>${rewards.map(([k, v]) => row(k, "+" + fmt(v))).join("")}${row("Total", "⭐ +" + fmt(earned))}</div>
      <div class="menu-btns">
        ${next !== null ? `<button class="mb primary" data-act="next">▶ Next mission</button>` : ""}
        <button class="mb ${next === null ? "primary" : ""}" data-act="replay">↺ ${r.won ? "Replay" : "Try again"}</button>
        <div class="mb-row"><button class="mb" data-go="upgrades">🔧 Upgrades</button><button class="mb" data-go="hangar">🛩️ Hangar</button></div>
        <button class="mb" data-go="menu">🏠 Menu</button>
      </div></div>`, "dim");
    if (r.won && newMedals.some(Boolean)) AU.play("medal");
    bind(el, { next: () => briefing(next, 0), replay: () => start(idx, di) });
  };

  /* ---------- collection ---------- */
  function collection() {
    const total = Object.values(save.medals).reduce((s, arr) => s + arr.flat().filter(Boolean).length, 0);
    const st = save.stats;
    const box = (v, l) => `<div class="statbox"><b>${v}</b><small>${l}</small></div>`;
    const el = show(`${topbar("🏆 Collection")}<div class="ui-body">
      <div class="stat-grid">${box(total + "/" + S.STAGE_COUNT * 16, "medals")}${box(Math.min(save.cleared, S.STAGE_COUNT) + "/" + S.STAGE_COUNT, "missions cleared")}${box(fmt(st.kills), "enemies destroyed")}${box(fmt(st.rescued), "people rescued")}${box(fmt(st.stars), "stars earned")}${box(st.bosses, "bosses defeated")}${box(fmt(st.score), "total score")}${box(Math.round(st.playtime / 60) + " min", "flight time")}</div>
      <h3 class="sec">🃏 Bonus cards <small>${S.CARDS.filter((c) => save.cards[c.id]).length}/${S.CARDS.length}</small></h3>
      <div class="bonus-cards small">${S.CARDS.map((c) => `<div class="bcard ${save.cards[c.id] ? "" : "locked"}"><span class="ci">${save.cards[c.id] ? c.icon : "❔"}</span><b>${save.cards[c.id] ? c.name : "???"}</b><small>${save.cards[c.id] ? c.desc : "Hidden in a supply crate"}</small></div>`).join("")}</div>
      <h3 class="sec">🧩 Aurora blueprints <small>${save.blueprints}/6</small></h3>
      <div class="bp-row">${Array.from({ length: 6 }, (_, i) => `<i class="${i < save.blueprints ? "got" : ""}">🧩</i>`).join("")}<span class="muted">${save.planes.includes("aurora") ? "Aurora built ✓" : save.blueprints >= 6 ? "Ready to build in the Hangar!" : "Found on stages 1-2, 2-2, 3-2, 4-2, 5-2 and 6-2"}</span></div>
      <h3 class="sec">⚙️ Rare components</h3>
      <div class="bonus-cards small">${S.COMPONENTS.map((c) => `<div class="bcard ${save.comps[c.id] ? "" : "locked"}"><span class="ci">${save.comps[c.id] ? c.icon : "❔"}</span><b>${save.comps[c.id] ? c.name : "???"}</b><small>${save.comps[c.id] ? c.desc : "Hidden somewhere"}</small></div>`).join("")}</div>
      <h3 class="sec">👾 Enemy files</h3>
      <div class="bestiary" id="bestiary"></div>
      <h3 class="sec">💀 Bosses</h3>
      <div class="bestiary" id="bosses"></div>
    </div>`);
    const b = $("bestiary");
    for (const [k, d] of Object.entries(S.ENEMIES)) { const c = document.createElement("div"); c.className = "beast"; c.appendChild(thumb(ART.enemy(k), 60, 60)); c.insertAdjacentHTML("beforeend", `<b>${d.name}</b><small>${d.type} · ${d.hp} hp</small>`); b.appendChild(c); }
    S.WORLDS.forEach((w, i) => { const B = S.BOSSES[w.boss], beaten = (save.wins[i * 3 + 2] || 0) > 0; const c = document.createElement("div"); c.className = "beast" + (beaten ? "" : " locked"); c.appendChild(thumb(ART.boss(w.boss), 80, 70)); c.insertAdjacentHTML("beforeend", `<b>${B.name}</b><small>${beaten ? "Defeated ✓" : B.title}</small>`); $("bosses").appendChild(c); });
    bind(el);
  }

  /* ---------- settings ---------- */
  function settings() {
    const s = save.settings;
    const tog = (k, label) => `<div class="row-item"><div><b>${label}</b></div><button class="switch ${s[k] ? "on" : ""}" data-act="tog" data-k="${k}">${s[k] ? "On" : "Off"}</button></div>`;
    const el = show(`${topbar("⚙️ Settings")}<div class="ui-body">
      ${tog("sfx", "🔊 Sound effects")}${tog("music", "🎵 Music")}${tog("shake", "📳 Screen shake")}${tog("flash", "⚡ Explosion flashes")}${tog("lowFx", "🪶 Lighter effects (for slower devices)")}
      <div class="row-item"><div><b>🎮 Controls</b><small>Auto: the mouse steers by following the cursor, touch steers by dragging anywhere.</small></div>
        <div class="seg">${[["auto", "Auto"], ["drag", "Always drag"]].map(([k, n]) => `<button class="${s.control === k ? "on" : ""}" data-act="ctrl" data-k="${k}">${n}</button>`).join("")}</div></div>
      <div class="row-item"><div><b>🗑️ Reset progress</b><small>Deletes stars, upgrades, aircraft, medals and collectibles.</small></div><button class="btn danger" data-act="reset">Reset</button></div>
    </div>`);
    bind(el, {
      tog: (d) => { s[d.k] = !s[d.k]; applySettings(); persist(); settings(); },
      ctrl: (d) => { s.control = d.k; applySettings(); persist(); settings(); },
      reset: () => { if (confirm("Reset all Sky Assault progress?")) { const keep = save.settings; Object.keys(save).forEach((k) => delete save[k]); Object.assign(save, fresh(), { settings: keep }); persist(); toast("Progress reset."); menu(); } }
    });
  }

  /* ---------- boot ---------- */
  layout();
  E.init($("game"));
  setTimeout(layout, 50);
  menu();
  // test hooks
  U.go = go; U.start = start; U.briefing = briefing; U.menu = menu;
})();
