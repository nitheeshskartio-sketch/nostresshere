/* ============ SMASH IT — game: input, UI, modes ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const $ = (id) => document.getElementById(id);

  /* ---------- tiny event bus ---------- */
  const handlers = {};
  S.bus = {
    on(n, f) { (handlers[n] = handlers[n] || []).push(f); },
    emit(n, d) { (handlers[n] || []).forEach((f) => { try { f(d); } catch (e) { console.error(e); } }); }
  };

  /* ---------- prefs (never includes the photo) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("nsh-smash-" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("nsh-smash-" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const prefs = Object.assign({ env: "studio", outfit: "office", skin: S.SKINS[1], hair: "short", hairColor: "#4a3426", style: "real", tool: "glove", toolBrutal: "knuckles", violence: "normal", brutalOk: false, sfx: true, voice: true, ambience: true, slowmo: true, totalHits: 0, unlockAll: false }, store.get("prefs", {}));
  const save = () => store.set("prefs", prefs);
  S.settings = prefs;
  Object.assign(S.audio, { sfx: prefs.sfx, voice: prefs.voice, ambience: prefs.ambience });

  /* ---------- boot ---------- */
  const stage = $("stage");
  let world, face, buddy, tools;
  try {
    world = new S.World(stage);
  } catch (e) {
    $("loading").innerHTML = "<div><b>Your browser can't do 3D (WebGL) right now.</b><br>Try a recent Chrome, Edge, Firefox or Safari. 🙏</div>";
    return;
  }
  face = new S.Face();
  face.setSkin(prefs.skin);
  buddy = new S.Buddy(world, face);
  buddy.look = { outfit: prefs.outfit, skin: prefs.skin, hair: prefs.hair, hairColor: prefs.hairColor };
  buddy.style = prefs.style;
  buddy.build();
  buddy.heading = 0;
  tools = new S.Tools(world, buddy);
  world.setEnvironment(prefs.env);
  const brutal = new S.Brutal(world, buddy, tools);
  S.brutal = brutal;
  S.game = { world, face, buddy, tools, brutal };
  $("loading").hidden = true;

  /* ---------- toast ---------- */
  let toastT = null;
  function toast(msg, ms) {
    const t = $("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2200);
  }

  /* =========================================================
     TOOLS TRAY + UNLOCKS
     ========================================================= */
  const unlocked = (t) => S.toolSet(t) === "brutal" || (S.toolSet(t) === "both" && prefs.violence === "brutal") || prefs.unlockAll || prefs.totalHits >= t.unlock;
  // Normal mode and Brutal mode each have their own objects (sponge & water work in both)
  const inMode = (t) => { const s = S.toolSet(t); return s === "both" || s === prefs.violence; };
  const visibleTools = () => S.TOOLS.filter(inMode);
  let current = S.toolById(prefs.violence === "brutal" ? prefs.toolBrutal : prefs.tool) || visibleTools()[0];
  if (!unlocked(current) || !inMode(current)) current = visibleTools()[0];

  function renderTray() {
    const tray = $("tray");
    tray.innerHTML = "";
    visibleTools().forEach((t, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tool" + (t === current ? " active" : "") + (unlocked(t) ? "" : " locked");
      b.dataset.id = t.id;
      b.title = unlocked(t) ? t.name + (i < 10 ? " (" + ((i + 1) % 10) + ")" : "") : "Unlocks after " + t.unlock + " hits";
      b.innerHTML = '<span class="ti">' + t.icon + '</span><span class="tn">' + (unlocked(t) ? t.name : "🔒 " + t.unlock + " hits") + "</span>";
      b.setAttribute("aria-pressed", t === current);
      tray.appendChild(b);
    });
  }
  $("tray").addEventListener("click", (e) => {
    const b = e.target.closest(".tool");
    if (!b) return;
    const t = S.toolById(b.dataset.id);
    if (!unlocked(t)) { toast("🔒 " + t.name + " unlocks after " + t.unlock + " total hits. You're at " + prefs.totalHits + "."); S.audio.play("buzzer"); return; }
    selectTool(t);
  });
  function selectTool(t) {
    if (tools.spraying) tools.stopSpray();
    brutal.showGun(t.kind === "gun");
    current = t;
    if (prefs.violence === "brutal") prefs.toolBrutal = t.id; else prefs.tool = t.id;
    save();
    renderTray();
    // scroll only the tray (scrollIntoView would also scroll the page sideways)
    const tray = $("tray"), el = tray.querySelector('[data-id="' + t.id + '"]');
    if (el) {
      const off = el.getBoundingClientRect().left - tray.getBoundingClientRect().left;
      tray.scrollTo({ left: tray.scrollLeft + off - (tray.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
    $("hint").textContent = t.kind === "gun" ? "Click to shoot · hold for rapid fire · headshots hurt more" : t.kind === "place" ? "Click the floor to place a gas cylinder · set it on fire or shoot it" : t.fluid === "petrol" ? "Hold to pour petrol · then throw a 🔥 Fire Stick" : t.kind === "drop" ? "Click anywhere to drop the anvil on their head" : t.kind === "spray" ? "Hold to spray water · it washes off the mess" : t.kind === "throw" ? "Click to throw · hold to keep throwing · drag the buddy to toss them" : "Click the buddy to " + (t.id === "slap" ? "slap" : "hit") + " · drag them to throw";
  }

  function checkUnlocks(before) {
    for (const t of S.TOOLS) {
      if (t.unlock > before && t.unlock <= prefs.totalHits && !prefs.unlockAll) {
        S.audio.play("unlock");
        toast("🔓 Unlocked: " + t.icon + " " + t.name + "!", 3200);
        renderTray();
        const el = $("tray").querySelector('[data-id="' + t.id + '"]');
        if (el) { el.classList.add("new"); setTimeout(() => el.classList.remove("new"), 2500); }
      }
    }
  }

  /* =========================================================
     STATS / STRESS / COMBO
     ========================================================= */
  const session = { hits: 0, combo: 0, lastHit: 0, best: 0 };
  function renderStats() {
    $("hits").textContent = session.hits.toLocaleString();
    const stress = Math.max(0, 100 - session.hits * 0.8);
    $("stressFill").style.width = stress + "%";
    $("stressLabel").textContent = stress <= 0 ? "Zen 🧘" : stress < 30 ? "Chill 😌" : stress < 70 ? "Better 🙂" : "Stressed 😤";
    const c = $("combo");
    if (session.combo >= 3) { c.textContent = "×" + session.combo + " combo"; c.classList.add("on"); }
    else c.classList.remove("on");
  }
  S.bus.on("hit", (d) => {
    const now = performance.now();
    session.hits++;
    session.combo = now - session.lastHit < 1100 ? session.combo + 1 : 1;
    session.lastHit = now;
    session.best = Math.max(session.best, session.combo);
    const before = prefs.totalHits;
    prefs.totalHits++;
    if (prefs.totalHits % 5 === 0) save();
    checkUnlocks(before);
    if (session.combo >= 3) S.bus.emit("combo", session.combo);
    if (session.combo === 10) toast("🔥 10-hit combo! You're on fire (metaphorically).");
    renderStats();
    hideHint();
  });
  setInterval(() => { if (performance.now() - session.lastHit > 1100 && session.combo) { session.combo = 0; renderStats(); } }, 400);

  /* ---------- speech bubble ---------- */
  let bubbleT = 0;
  S.bus.on("say", (text) => {
    const b = $("bubble");
    b.textContent = text; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop", "show");
    bubbleT = 1.9;
  });
  function placeBubble(rdt) {
    const b = $("bubble");
    if (bubbleT > 0) { bubbleT -= rdt; if (bubbleT <= 0) b.classList.remove("show"); }
    const p = buddy.headPos().add(new V3(0, 0.5, 0)).project(world.camera);
    const w = stage.clientWidth, h = stage.clientHeight;
    const x = Math.min(w - 90, Math.max(90, (p.x * 0.5 + 0.5) * w));
    const y = Math.min(h - 140, Math.max(70, (-p.y * 0.5 + 0.5) * h));
    b.style.transform = "translate(" + x + "px," + y + "px) translate(-50%,-100%)";
  }

  /* =========================================================
     INPUT
     ========================================================= */
  const canvas = world.renderer.domElement;
  const ndc = new THREE.Vector2();
  let down = null, holdTimer = null;
  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    return ndc;
  }
  function findProp(o) { while (o) { if (o.userData && o.userData.prop) return o.userData.prop; o = o.parent; } return null; }
  function aimPoint(ray) {
    const list = buddy.hitMeshes.concat(world.targetMeshes(), world.propGroup.children, world.solids);
    const h = ray.intersectObjects(list, true)[0];
    return h ? h.point.clone() : ray.ray.at(6, new V3());
  }
  function startGrab() {
    if (!down || down.mode !== "pending") return;
    clearTimeout(holdTimer);
    down.mode = "grab";
    const n = new V3(); world.camera.getWorldDirection(n); n.y = 0; n.normalize().negate();
    down.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, down.hit.point);
    buddy.grabStart(down.hit.point);
    S.bus.emit("grab", {});
    hideHint();
  }

  canvas.addEventListener("pointerdown", (e) => {
    S.audio.unlock();
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const ray = world.rayFrom(toNdc(e));
    const base = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    if (current.kind === "spray") {
      down = Object.assign(base, { mode: "spray" });
      tools.aim.copy(aimPoint(ray)); tools.startSpray(current.fluid); hideHint();
      return;
    }
    const ch = ray.intersectObjects(buddy.hitMeshes, false)[0];
    if (current.kind === "gun") { brutal.shoot(ndc.clone()); down = Object.assign(base, { mode: "gun", last: performance.now() }); hideHint(); return; }
    if (current.kind === "place") { brutal.placeGas(aimPoint(ray), !!ch); down = Object.assign(base, { mode: "none" }); hideHint(); return; }
    if (current.kind === "drop" && !ch) { tools.drop(current); down = Object.assign(base, { mode: "none" }); hideHint(); return; }
    if (ch) {
      down = Object.assign(base, { mode: "pending", hit: ch });
      holdTimer = setTimeout(startGrab, 380);
      return;
    }
    if (current.kind === "throw") {
      tools.throwAt(current, aimPoint(ray));
      down = Object.assign(base, { mode: "throw", last: performance.now(), ray: ray.ray.clone() });
      hideHint();
      return;
    }
    const ph = ray.intersectObjects(world.propGroup.children, true)[0];
    const prop = ph && findProp(ph.object);
    if (prop && current.kind === "melee") { tools.melee(current, { point: ph.point, prop }); down = Object.assign(base, { mode: "none" }); return; }
    down = Object.assign(base, { mode: "orbit", az: world.orbit.az, el: world.orbit.el });
  });

  canvas.addEventListener("pointermove", (e) => {
    toNdc(e);
    buddy.pointer.x = ndc.x; buddy.pointer.y = ndc.y;
    if (!down || e.pointerId !== down.id) return;
    const ray = world.rayFrom(ndc);
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (down.mode === "pending" && Math.hypot(dx, dy) > 9) startGrab();
    if (down.mode === "grab") { const p = new V3(); if (ray.ray.intersectPlane(down.plane, p)) buddy.grabMove(p); }
    else if (down.mode === "orbit") {
      world.orbit.az = THREE.MathUtils.clamp(down.az - dx * 0.006, -1.2, 1.2);
      world.orbit.el = THREE.MathUtils.clamp(down.el + dy * 0.004, 0.0, 0.6);
    } else if (down.mode === "spray") tools.aim.copy(aimPoint(ray));
    else if (down.mode === "throw") down.ray = ray.ray.clone();
  });

  function endPointer(e) {
    if (!down || (e && e.pointerId !== down.id)) return;
    clearTimeout(holdTimer);
    const d = down; down = null;
    if (d.mode === "pending") {
      const h = d.hit;
      if (current.kind === "drop") tools.drop(current);
      else if (current.kind === "throw") tools.throwAt(current, h.point.clone());
      else if (current.kind === "melee") tools.melee(current, { point: h.point.clone(), part: h.object.userData.part, object: h.object });
      hideHint();
    } else if (d.mode === "grab") buddy.grabRelease();
    else if (d.mode === "spray") tools.stopSpray();
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (/^[0-9]$/.test(e.key)) {
      const t = visibleTools()[(+e.key + 9) % 10];
      if (t && unlocked(t)) selectTool(t);
    } else if (e.key === "r" || e.key === "R") resetAll();
    else if (e.key === "c" || e.key === "C") cycleCam();
    else if (e.key === "Escape") closePanel();
  });

  /* =========================================================
     ACTION BUTTONS
     ========================================================= */
  const ACTIONS = [
    { id: "spin", icon: "🌀", name: "Spin" },
    { id: "shake", icon: "📳", name: "Shake" },
    { id: "launch", icon: "🚀", name: "Launch" },
    { id: "dance", icon: "💃", name: "Dance" },
    { id: "clean", icon: "🧼", name: "Clean up" },
    { id: "heal", icon: "🩹", name: "Patch up" },
    { id: "slowmo", icon: "🐢", name: "Slow-mo" }
  ];
  $("actions").innerHTML = ACTIONS.map((a) => '<button type="button" class="act" data-act="' + a.id + '" title="' + a.name + '"><span>' + a.icon + '</span><small>' + a.name + "</small></button>").join("");
  $("actions").addEventListener("click", (e) => {
    const b = e.target.closest(".act"); if (!b) return;
    S.audio.unlock();
    const a = b.dataset.act;
    if (a === "heal") { tools.clear(); brutal.clear(); buddy.revive(); applyStyle(); world.clearFloor(); S.audio.play("unlock"); toast("🩹 All patched up. Good as new. Mostly."); }
    else if (a === "clean") { buddy.cleanAll(); world.clearFloor(); S.audio.play("splash"); toast("🧼 Squeaky clean. For now."); }
    else if (a === "slowmo") { world.slowT = 3.2; toast("🐢 Slooooow mooootion…"); }
    else { buddy.action(a); if (a === "launch") S.bus.emit("fall", {}); }
    hideHint();
  });

  /* =========================================================
     TOP BAR BUTTONS
     ========================================================= */
  const CAMS = [["auto", "🎥 Follow cam"], ["front", "🎬 Front view"], ["side", "📐 Side view"], ["close", "🔍 Close-up"], ["wide", "🌄 Wide shot"]];
  let camI = 0;
  function cycleCam() { camI = (camI + 1) % CAMS.length; world.camMode = CAMS[camI][0]; world.orbit.az = 0; world.orbit.el = 0.12; toast(CAMS[camI][1]); }
  $("camBtn").addEventListener("click", cycleCam);

  function applyStyle() { buddy.setStyle(prefs.style); $("styleBtn").title = prefs.style === "toon" ? "Style: Cartoon" : "Style: Realistic"; $("styleBtn").classList.toggle("on", prefs.style === "toon"); }
  $("styleBtn").addEventListener("click", () => { prefs.style = prefs.style === "toon" ? "real" : "toon"; save(); applyStyle(); toast(prefs.style === "toon" ? "🖍️ Cartoon style" : "📸 Realistic style"); });
  applyStyle();

  function renderSound() { const on = prefs.sfx || prefs.voice || prefs.ambience; $("soundBtn").textContent = on ? "🔊" : "🔇"; }
  $("soundBtn").addEventListener("click", () => {
    const on = !(prefs.sfx || prefs.voice || prefs.ambience);
    prefs.sfx = prefs.voice = prefs.ambience = on; save();
    Object.assign(S.audio, { sfx: on, voice: on }); S.audio.setAmbience(on);
    if (!on && "speechSynthesis" in window) speechSynthesis.cancel();
    renderSound(); toast(on ? "🔊 Sound on" : "🔇 Sound off");
  });
  renderSound();

  function resetAll() {
    tools.clear(); brutal.clear(); buddy.restore(); applyStyle(); buddy.reset(); world.spawnProps(); world.clearFloor();
    for (const k in world.fx) world.fx[k].clear();
    world.orbit.az = 0; world.orbit.el = 0.12;
    toast("↺ Fresh start! Like nothing ever happened.");
  }
  $("resetBtn").addEventListener("click", resetAll);

  /* =========================================================
     PANELS
     ========================================================= */
  const panel = $("panel");
  let panelName = null;
  function openPanel(name) {
    if (panelName === name) return closePanel();
    panelName = name;
    const P = PANELS[name];
    $("panelTitle").textContent = P.title;
    $("panelBody").innerHTML = "";
    P.render($("panelBody"));
    panel.classList.add("open");
    document.querySelectorAll(".hud-right .icon").forEach((b) => b.classList.toggle("on", b.dataset.panel === name));
  }
  function closePanel() {
    panelName = null; panel.classList.remove("open");
    document.querySelectorAll(".hud-right .icon[data-panel]").forEach((b) => b.classList.remove("on"));
  }
  $("panelClose").addEventListener("click", closePanel);
  document.querySelectorAll("[data-panel]").forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.panel)));

  const h = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; };

  const PANELS = {
    face: { title: "📷 Upload a face", render: renderFacePanel },
    char: { title: "👕 Character", render: renderCharPanel },
    room: { title: "🏠 Room", render: renderRoomPanel },
    mode: { title: "🎮 Game mode", render: renderModePanel },
    settings: { title: "⚙️ Settings", render: renderSettingsPanel }
  };

  /* ---------- face upload ---------- */
  let photoImg = null;
  function renderFacePanel(el) {
    if (prefs.violence === "brutal") {
      el.appendChild(h('<p class="privacy">😇 <b>Photo faces only work in Normal mode.</b> Brutal mode always uses the cartoon buddy — no real faces get the rough treatment.</p>'));
      const b = h('<button class="btn primary" type="button">😇 Switch to Normal mode</button>');
      b.addEventListener("click", () => { setViolence("normal"); openPanel("face"); });
      el.appendChild(b);
      return;
    }
    el.appendChild(h('<p class="privacy">🔒 <b>Private by design.</b> Your photo is processed only inside this browser tab. It is never uploaded and never saved. Close the tab (or tap Remove) and it\'s gone.</p>'));
    const wrap = h('<div class="face-edit"><canvas id="facePrev" width="240" height="240" aria-label="Face preview"></canvas></div>');
    el.appendChild(wrap);
    const btns = h('<div class="row"><label class="btn primary">📁 Choose photo<input id="fileIn" type="file" accept="image/*" hidden></label><label class="btn">🤳 Selfie<input id="camIn" type="file" accept="image/*" capture="user" hidden></label></div>');
    el.appendChild(btns);
    const sl = h('<div class="sliders" id="sliders">' +
      '<label>Zoom<input type="range" id="sZoom" min="0.4" max="3" step="0.01"></label>' +
      '<label>Left / right<input type="range" id="sX" min="-220" max="220" step="1"></label>' +
      '<label>Up / down<input type="range" id="sY" min="-220" max="220" step="1"></label>' +
      '<label>Rotate<input type="range" id="sRot" min="-0.8" max="0.8" step="0.01"></label></div>');
    el.appendChild(sl);
    el.appendChild(h('<p class="muted small">Line up the eyes with the blue dots and the mouth with the blue line. You can also drag the preview to move it and scroll to zoom.</p>'));
    el.appendChild(h('<label class="check"><input type="checkbox" id="matchSkin" checked> Match body skin tone to the photo</label>'));
    el.appendChild(h('<div class="row"><button class="btn" id="autoFit" type="button">✨ Auto-fit</button><button class="btn danger" id="removePhoto" type="button">🗑️ Remove photo</button></div>'));
    el.appendChild(h('<p class="muted small">No photo? No problem — the default buddy has a very punchable cartoon face.</p>'));

    const prev = $("facePrev"), pc = prev.getContext("2d");
    const draw = () => face.drawPreview(pc, prev.width);
    const sync = () => {
      const a = face.adj;
      $("sZoom").value = a.zoom; $("sX").value = a.x; $("sY").value = a.y; $("sRot").value = a.rot;
      $("sliders").classList.toggle("disabled", !face.hasPhoto);
      $("removePhoto").disabled = !face.hasPhoto; $("autoFit").disabled = !face.hasPhoto;
      draw();
    };
    const onFile = (input) => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast("That doesn't look like an image 🤔"); return; }
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        // downscale big photos (memory + speed); still only in this tab
        const max = 1024, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        photoImg = c;
        face.setPhoto(c);
        buddy.refreshFace();
        if ($("matchSkin").checked) matchSkin();
        sync();
        input.value = "";
        toast("📷 Face on! Adjust it until it looks right.");
        buddy.react("surprised", 1.5, "surprised");
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that image 😕"); };
      img.src = url;
    };
    $("fileIn").addEventListener("change", (e) => onFile(e.target));
    $("camIn").addEventListener("change", (e) => onFile(e.target));
    const onSlide = () => { face.setAdjust({ zoom: +$("sZoom").value, x: +$("sX").value, y: +$("sY").value, rot: +$("sRot").value }); draw(); };
    ["sZoom", "sX", "sY", "sRot"].forEach((id) => { $(id).addEventListener("input", onSlide); $(id).addEventListener("change", () => { if ($("matchSkin").checked) matchSkin(); }); });
    $("autoFit").addEventListener("click", () => { face.autoFit(); sync(); if ($("matchSkin").checked) matchSkin(); });
    $("removePhoto").addEventListener("click", () => {
      face.clearPhoto(); photoImg = null; buddy.refreshFace();
      face.setSkin(prefs.skin); buddy.setLook({ skin: prefs.skin }); applyStyle();
      sync(); toast("🗑️ Photo removed and forgotten.");
    });
    // drag / wheel on preview
    let pd = null;
    prev.addEventListener("pointerdown", (e) => { if (!face.hasPhoto) return; pd = { x: e.clientX, y: e.clientY, ax: face.adj.x, ay: face.adj.y }; prev.setPointerCapture(e.pointerId); });
    prev.addEventListener("pointermove", (e) => { if (!pd) return; const k = 512 / prev.clientWidth; face.setAdjust({ x: pd.ax + (e.clientX - pd.x) * k, y: pd.ay + (e.clientY - pd.y) * k }); sync(); });
    prev.addEventListener("pointerup", () => { if (pd && $("matchSkin").checked) matchSkin(); pd = null; });
    prev.addEventListener("wheel", (e) => { if (!face.hasPhoto) return; e.preventDefault(); face.setAdjust({ zoom: Math.max(0.4, Math.min(3, face.adj.zoom * (e.deltaY < 0 ? 1.06 : 0.94))) }); sync(); }, { passive: false });
    sync();
  }
  function matchSkin() {
    const hex = face.sampleSkin();
    if (!hex) return;
    face.setSkin(hex); buddy.setLook({ skin: hex }); applyStyle();
  }

  /* ---------- character ---------- */
  function renderCharPanel(el) {
    el.appendChild(h("<h4>Outfit</h4>"));
    const grid = h('<div class="cards"></div>');
    Object.entries(S.OUTFITS).forEach(([id, o]) => {
      const b = h('<button type="button" class="card' + (prefs.outfit === id ? " active" : "") + '"><span class="ci">' + o.icon + "</span><span>" + o.name + "</span></button>");
      b.addEventListener("click", () => {
        prefs.outfit = id; prefs.hair = o.hair; prefs.hairColor = o.hairColor; save();
        buddy.setLook({ outfit: id, hair: o.hair, hairColor: o.hairColor }); applyStyle();
        buddy.react("happy", 1.4, pick(["Lookin' good!", "New fit, who dis?", "Fancy!"]));
        refresh();
      });
      grid.appendChild(b);
    });
    el.appendChild(grid);
    el.appendChild(h("<h4>Skin tone</h4>"));
    const sk = h('<div class="swatches"></div>');
    S.SKINS.forEach((c) => {
      const b = h('<button type="button" class="sw' + (buddy.look.skin === c ? " active" : "") + '" style="--c:' + c + '" aria-label="Skin tone ' + c + '"></button>');
      b.addEventListener("click", () => { prefs.skin = c; save(); face.setSkin(c); buddy.setLook({ skin: c }); applyStyle(); refresh(); });
      sk.appendChild(b);
    });
    el.appendChild(sk);
    el.appendChild(h("<h4>Hair</h4>"));
    const hs = h('<div class="chips"></div>');
    Object.entries(S.HAIRS).forEach(([id, name]) => {
      const b = h('<button type="button" class="chip' + (buddy.look.hair === id ? " active" : "") + '">' + name + "</button>");
      b.addEventListener("click", () => { prefs.hair = id; save(); buddy.setLook({ hair: id }); applyStyle(); refresh(); });
      hs.appendChild(b);
    });
    el.appendChild(hs);
    const hc = h('<div class="swatches"></div>');
    S.HAIR_COLORS.forEach((c) => {
      const b = h('<button type="button" class="sw' + (buddy.look.hairColor === c ? " active" : "") + '" style="--c:' + c + '" aria-label="Hair color ' + c + '"></button>');
      b.addEventListener("click", () => { prefs.hairColor = c; save(); buddy.setLook({ hairColor: c }); applyStyle(); refresh(); });
      hc.appendChild(b);
    });
    el.appendChild(hc);
    el.appendChild(h('<p class="muted small">Tip: with a photo, try <b>Bald</b> so the photo\'s own hair shows.</p>'));
    function refresh() { const n = panelName; panelName = null; openPanel(n); }
  }

  /* ---------- room ---------- */
  function renderRoomPanel(el) {
    const grid = h('<div class="cards"></div>');
    Object.entries(S.ENVS).forEach(([id, e]) => {
      const b = h('<button type="button" class="card wide' + (prefs.env === id ? " active" : "") + '"><span class="ci">' + e.icon + "</span><span><b>" + e.name + "</b><small>" + e.desc + "</small></span></button>");
      b.addEventListener("click", () => {
        prefs.env = id; save();
        tools.clear(); world.clearTargets(); world.setEnvironment(id); buddy.reset();
        if (modes.current === "target") modes.enter("target");
        const n = panelName; panelName = null; openPanel(n);
        toast(e.icon + " Welcome to the " + e.name + ".");
      });
      grid.appendChild(b);
    });
    el.appendChild(grid);
  }

  /* ---------- settings ---------- */
  function renderSettingsPanel(el) {
    const opts = [["sfx", "🔊 Sound effects"], ["voice", "🗣️ Voice lines (silly robot voice)"], ["ambience", "🎶 Room ambience & music"], ["slowmo", "🐢 Slow-motion on big hits"]];
    opts.forEach(([k, label]) => {
      const row = h('<label class="check"><input type="checkbox"' + (prefs[k] ? " checked" : "") + "> " + label + "</label>");
      row.querySelector("input").addEventListener("change", (e) => {
        prefs[k] = e.target.checked; save();
        if (k === "sfx") S.audio.sfx = prefs.sfx;
        if (k === "voice") { S.audio.voice = prefs.voice; if (!prefs.voice && "speechSynthesis" in window) speechSynthesis.cancel(); }
        if (k === "ambience") S.audio.setAmbience(prefs.ambience);
        renderSound();
      });
      el.appendChild(row);
    });
    el.appendChild(h('<p class="muted small">Total hits on this device: <b>' + prefs.totalHits.toLocaleString() + "</b>. New objects unlock as you play.</p>"));
    const ua = h('<button type="button" class="btn">' + (prefs.unlockAll ? "🔒 Re-lock objects (earn them)" : "🔓 Unlock everything now (cheater!)") + "</button>");
    ua.addEventListener("click", () => { prefs.unlockAll = !prefs.unlockAll; save(); renderTray(); const n = panelName; panelName = null; openPanel(n); toast(prefs.unlockAll ? "🔓 Everything unlocked. We won't tell." : "🔒 Back to earning them."); });
    el.appendChild(ua);
    el.appendChild(h('<p class="muted small">Keys: <b>1–0</b> pick object · <b>R</b> reset · <b>C</b> camera · <b>Esc</b> close panel</p>'));
  }

  /* =========================================================
     MODES
     ========================================================= */
  const MODES = {
    free: { name: "Free Play", icon: "🎈", desc: "No rules. No timer. Just vibes." },
    timed: { name: "60-Second Stress Relief", icon: "⏱️", desc: "How much stress can you release in one minute?" },
    chaos: { name: "Chaos Mode", icon: "🌪️", desc: "Low gravity, triple throws, stuff rains from the sky." },
    target: { name: "Target Mode", icon: "🎯", desc: "Hit the floating targets with anything. Even the buddy." },
    challenge: { name: "Funny Challenges", icon: "🃏", desc: "Silly little missions, one after another." }
  };

  const CHALLENGES = [
    { text: "Land 3 pies right in the face", need: 3, tool: "pie", on: { splat: (d) => d.type === "cream" && d.face } },
    { text: "Make them spin twice", need: 2, on: { spin: () => true } },
    { text: "Throw them into the comfy pile", need: 1, on: { land: (d) => d.soft } },
    { text: "Knock them down 3 times", need: 3, on: { fall: () => true } },
    { text: "Hit the head, body, an arm and a leg", need: 4, set: true, on: { hit: (d) => !d.quiet && d.part } },
    { text: "Use 4 different objects", need: 4, set: true, on: { hit: (d) => d.tool } },
    { text: "Toss them higher than 3 meters", need: 1, on: { land: (d) => d.height > 3 } },
    { text: "Slam them into a wall", need: 1, on: { wall: (d) => d.speed > 4 } },
    { text: "Smash 2 breakable things", need: 2, needBreakables: true, on: { break: (d) => d.kind !== "balloon" } },
    { text: "Hit them while they're flying", need: 2, on: { hit: (d) => d.flying && !d.quiet } },
    { text: "Get a 10-hit combo", need: 1, on: { combo: (n) => n >= 10 } },
    { text: "Cover them in 6 splats", need: 6, tool: "tomato", on: { splatBody: () => true, splat: (d) => d.face } },
    { text: "Shake them silly", need: 1, on: { shake: () => true } },
    { text: "Turn them into a pancake", need: 1, tool: "inflatable", on: { pancake: () => true } },
    { text: "Set off a confetti bomb", need: 1, tool: "confetti", on: { boom: () => true } },
    { text: "Hose them down for 3 seconds", need: 3, tool: "water", on: { spray: (d) => d.dt } },
    { text: "Bonk them 5 times with the rubber mallet", need: 5, tool: "mallet", on: { hit: (d) => d.tool === "mallet" } },
    { text: "Bounce a football off their head", need: 1, tool: "football", on: { hit: (d) => d.tool === "football" && d.part === "head" } },
    { text: "Grab them and throw them 3 times", need: 3, on: { throwChar: () => true } }
  ];

  const modes = {
    current: "free", d: {},
    enter(id) {
      this.exit();
      this.current = id; this.d = {};
      $("modeName").textContent = MODES[id].name;
      $("modeIcon").textContent = MODES[id].icon;
      const hud = $("modeHud");
      hud.innerHTML = ""; hud.hidden = id === "free";
      if (id === "timed") {
        Object.assign(this.d, { t: 60, started: false, hits: 0, falls: 0, splats: 0, tools: {}, best: 0, startHits: session.hits });
        hud.innerHTML = '<div class="mh-big" id="mhTimer">60</div><div class="mh-sub" id="mhSub">Hit anything to start the clock!</div>';
      } else if (id === "chaos") {
        world.physics.gravity.y = -5.4; buddy.gravMul = 0.55; buddy.power = 1.6; tools.multi = 3;
        Object.assign(this.d, { rain: 1, props: 25 });
        hud.innerHTML = '<div class="mh-big chaos">🌪️ CHAOS</div><div class="mh-sub">Low gravity · triple throws · falling stuff</div>';
        toast("🌪️ Chaos Mode! Gravity has left the building.");
      } else if (id === "target") {
        world.clearTargets();
        for (let i = 0; i < 5; i++) world.spawnTarget();
        Object.assign(this.d, { score: 0 });
        hud.innerHTML = '<div class="mh-big" id="mhScore">🎯 0</div><div class="mh-sub">Hit targets with anything — throw the buddy at them too!</div>';
      } else if (id === "challenge") {
        this.d.done = 0;
        hud.innerHTML = '<div class="ch-card"><div class="ch-top"><span class="ch-label">Challenge <b id="chNum">1</b></span><button type="button" class="ch-skip" id="chSkip">Skip ⏭</button></div><div class="ch-text" id="chText"></div><div class="ch-bar"><i id="chFill"></i></div></div>';
        $("chSkip").addEventListener("click", () => this.nextChallenge());
        this.nextChallenge();
      }
    },
    exit() {
      if (this.current === "chaos") { world.physics.gravity.y = -9.82; buddy.gravMul = 1; buddy.power = 1; tools.multi = 1; }
      if (this.current === "target") world.clearTargets();
      $("modeHud").hidden = true;
    },
    nextChallenge() {
      const ok = CHALLENGES.filter((c) => (!c.tool || (unlocked(S.toolById(c.tool)) && inMode(S.toolById(c.tool)))) && (!c.needBreakables || world.props.some((p) => p.breakable)) && c !== this.d.ch);
      const c = pick(ok);
      this.d.ch = c; this.d.prog = 0; this.d.set = new Set();
      $("chText").textContent = c.text + (c.tool ? " " + S.toolById(c.tool).icon : "");
      $("chNum").textContent = this.d.done + 1;
      this.renderProg();
      if (c.tool && current.id !== c.tool && S.toolById(c.tool).kind !== "melee") selectTool(S.toolById(c.tool));
    },
    renderProg() { const c = this.d.ch; if (!c) return; $("chFill").style.width = Math.min(100, (this.d.prog / c.need) * 100) + "%"; },
    event(name, data) {
      if (this.current === "challenge" && this.d.ch && !this.d.completing) {
        const c = this.d.ch, f = c.on[name];
        if (!f) return;
        const r = f(data);
        if (!r) return;
        if (c.set) { this.d.set.add(r); this.d.prog = this.d.set.size; }
        else if (typeof r === "number") this.d.prog += r;
        else this.d.prog++;
        this.renderProg();
        if (this.d.prog >= c.need) {
          this.d.completing = true; this.d.done++;
          S.audio.play("fanfare");
          world.confetti(buddy.com.clone().add(new V3(0, 1, 0)), 120, 1);
          toast("✅ Challenge complete! " + pick(["Nailed it.", "Flawless.", "Your boss would be proud. Or scared.", "Achievement: unlocked."]));
          buddy.react("laugh", 1.5, pick(["Okay, that was impressive.", "You did it!", "Again? Really?"]));
          setTimeout(() => { this.d.completing = false; if (this.current === "challenge") this.nextChallenge(); }, 1500);
        }
      }
      if (this.current === "timed" && this.d.started) {
        if (name === "hit") { this.d.hits++; this.d.tools[data.tool] = (this.d.tools[data.tool] || 0) + 1; }
        if (name === "fall") this.d.falls++;
        if (name === "splat" || name === "splatBody") this.d.splats++;
        if (name === "combo") this.d.best = Math.max(this.d.best, data);
      }
      if (this.current === "timed" && !this.d.started && !this.d.over && (name === "hit" || name === "grab")) {
        this.d.started = true; if (name === "hit") { this.d.hits++; this.d.tools[data.tool] = 1; }
        $("mhSub").textContent = "Go go go! 💥";
      }
      if (this.current === "target" && name === "target") {
        this.d.score++;
        $("mhScore").textContent = "🎯 " + this.d.score;
        $("mhScore").classList.remove("bump"); void $("mhScore").offsetWidth; $("mhScore").classList.add("bump");
        setTimeout(() => { if (this.current === "target") world.spawnTarget(); }, 500);
        if (this.d.score % 10 === 0) toast("🎯 " + this.d.score + " targets! Sharpshooter.");
      }
    },
    update(rdt) {
      const d = this.d;
      if (this.current === "timed" && d.started && !d.over) {
        const before = Math.ceil(d.t);
        d.t -= rdt;
        const now = Math.max(0, Math.ceil(d.t));
        $("mhTimer").textContent = now;
        $("mhTimer").classList.toggle("urgent", d.t < 10);
        if (now !== before && d.t < 5.5 && d.t > 0) S.audio.play("tick");
        if (d.t <= 0) { d.over = true; this.results(); }
      }
      if (this.current === "chaos") {
        d.rain -= rdt; d.props -= rdt;
        if (d.rain <= 0) {
          d.rain = R(0.5, 1.1);
          const pool = S.TOOLS.filter((t) => t.kind === "throw" && inMode(t) && unlocked(t) && t.proj !== "bomb" && t.proj !== "dynamite");
          const t = pick(pool);
          const start = buddy.com.clone().add(new V3(R(-1.5, 1.5), R(4, 5.5), R(-1.2, 1)));
          const target = buddy.com.clone().add(new V3(R(-0.4, 0.4), R(0, 0.6), 0));
          const T = 1.1, g = -world.physics.gravity.y;
          tools.spawn(t, start, target.sub(start).divideScalar(T).add(new V3(0, 0.5 * g * T, 0)));
        }
        if (d.props <= 0) { d.props = 25; world.spawnProps(); }
      }
    },
    results() {
      const d = this.d;
      S.audio.play("buzzer");
      setTimeout(() => S.audio.play("fanfare"), 500);
      const fav = Object.entries(d.tools).sort((a, b) => b[1] - a[1])[0];
      const favT = fav && (S.toolById(fav[0]) || { icon: "💦", name: "Water" });
      const verdict = d.hits < 20 ? "Gentle Soul 🕊️" : d.hits < 50 ? "Steady Stress-Buster 💪" : d.hits < 100 ? "Certified Chaos Agent 🌪️" : "Absolute Menace 😈";
      showModal(
        '<div class="res-emoji">⏱️</div><h2>Time\'s up!</h2><p class="muted">Stress released: <b>' + Math.min(100, Math.round(d.hits * 1.4 + d.falls * 3)) + "%</b></p>" +
        '<div class="res-grid"><div><b>' + d.hits + "</b><span>hits</span></div><div><b>" + d.falls + "</b><span>knockdowns</span></div><div><b>" + d.splats + "</b><span>splats</span></div><div><b>×" + d.best + "</b><span>best combo</span></div></div>" +
        (favT ? '<p>Favourite weapon: <b>' + favT.icon + " " + favT.name + "</b></p>" : "") +
        '<p class="verdict">You are a: <b>' + verdict + "</b></p>" +
        '<div class="row center"><button class="btn primary" data-m="again">Play again</button><button class="btn" data-m="free">Free Play</button></div>'
      );
      buddy.react("cry", 2.5, "Is it over? Please say it's over.");
    }
  };
  ["hit", "fall", "land", "spin", "splat", "splatBody", "break", "target", "wall", "shake", "pancake", "boom", "spray", "throwChar", "combo", "grab"].forEach((n) => S.bus.on(n, (d) => modes.event(n, d)));

  function renderModePanel(el) {
    const grid = h('<div class="cards"></div>');
    Object.entries(MODES).forEach(([id, m]) => {
      const b = h('<button type="button" class="card wide' + (modes.current === id ? " active" : "") + '"><span class="ci">' + m.icon + "</span><span><b>" + m.name + "</b><small>" + m.desc + "</small></span></button>");
      b.addEventListener("click", () => { modes.enter(id); closePanel(); });
      grid.appendChild(b);
    });
    el.appendChild(grid);
  }
  $("modeBtn").addEventListener("click", () => openPanel("mode"));

  function showModal(html) {
    $("modalCard").innerHTML = html;
    $("modal").hidden = false;
    $("modalCard").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      $("modal").hidden = true;
      if (b.dataset.m === "again") { resetAll(); modes.enter("timed"); } else modes.enter("free");
    }));
  }

  /* ---------- hint ---------- */
  let hinted = false;
  function hideHint() { if (hinted) return; hinted = true; setTimeout(() => $("hint").classList.add("fade"), 2500); }

  /* =========================================================
     LOOP
     ========================================================= */
  /* =========================================================
     NORMAL / BRUTAL
     ========================================================= */
  function setViolence(v) {
    prefs.violence = v; save();
    const brutal = v === "brutal";
    face.suppress = brutal; face.dirty = true; face.photoDirty = true;
    if (!brutal) { S.brutal.clear(); if (buddy.lost.size) { buddy.revive(); applyStyle(); } }
    buddy.brutal = brutal; buddy.refreshFace();
    document.body.classList.toggle("brutal", brutal);
    $("vNormal").classList.toggle("on", !brutal); $("vBrutal").classList.toggle("on", brutal);
    $("vNormal").setAttribute("aria-pressed", !brutal); $("vBrutal").setAttribute("aria-pressed", brutal);
    const want = S.toolById(brutal ? prefs.toolBrutal : prefs.tool);
    selectTool(want && inMode(want) && unlocked(want) ? want : visibleTools()[0]);
    if (modes.current === "challenge") modes.nextChallenge();
    if (panelName === "face") { panelName = null; openPanel("face"); }
  }
  $("vNormal").addEventListener("click", () => { if (prefs.violence !== "normal") { setViolence("normal"); toast("😇 Normal mode — pies, pillows and photo faces."); } });
  $("vBrutal").addEventListener("click", () => {
    if (prefs.violence === "brutal") return;
    const go = () => { setViolence("brutal"); toast("😈 Brutal mode — cartoon buddy only."); buddy.react("scared", 1.6, "Uh oh. Where did you get a sledgehammer?"); };
    if (prefs.brutalOk) return go();
    $("modalCard").innerHTML = '<div class="res-emoji">😈</div><h2>Brutal mode</h2><p>Rougher weapons — sledgehammer, bat, frying pan, bricks, dynamite, anvils — with <b>cartoon blood, wounds and limbs that come off</b>. The buddy never dies — tap 🩹 Patch up to put them back together.</p><p class="muted">Photo faces are switched off in this mode; it always uses the cartoon buddy.</p><div class="row center"><button class="btn primary" data-v="go">Bring it on</button><button class="btn" data-v="no">Stay Normal</button></div>';
    $("modal").hidden = false;
    $("modalCard").querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => { $("modal").hidden = true; if (b.dataset.v === "go") { prefs.brutalOk = true; go(); } }));
  });

  renderTray(); setViolence(prefs.violence); renderStats();
  modes.enter("free");
  let last = performance.now();
  function step(rdt, now) {
    world.stepTime(rdt);
    const dt = rdt * world.timeScale;
    if (down && down.mode === "gun" && now - down.last > 180) { down.last = now; brutal.shoot(ndc.clone()); }
    if (down && down.mode === "throw" && now - down.last > 230) {
      down.last = now;
      const ray = new THREE.Raycaster(); ray.ray.copy(down.ray);
      const list = buddy.hitMeshes.concat(world.targetMeshes(), world.propGroup.children, world.solids);
      const hit = ray.intersectObjects(list, true)[0];
      tools.throwAt(current, hit ? hit.point.clone() : ray.ray.at(6, new V3()));
    }
    tools.update(dt);
    buddy.update(dt);
    brutal.update(dt, rdt);
    world.physics.step(1 / 60, dt, 4);
    tools.postPhysics(dt);
    face.update(rdt);
    world.update(dt, rdt, buddy);
    modes.update(rdt);
    placeBubble(rdt);
  }
  function frame() {
    // performance.now(), not the rAF timestamp: the first rAF time can be older than `last`
    const now = performance.now();
    const rdt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    step(rdt, now);
    world.render();
    requestAnimationFrame(frame);
  }
  S.game.step = (rdt) => step(rdt, performance.now()); // handy for automated tests
  requestAnimationFrame(frame);
  setTimeout(() => buddy.react("happy", 2, pick(["Hi! Go easy on me.", "Hello! …wait, why are you holding that?", "Oh no. Not again."])), 900);
  window.addEventListener("beforeunload", save);
})();
