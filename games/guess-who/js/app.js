/* ============ GUESS WHO? — screens, rounds, modes, scoring, progress ============ */
(function () {
  "use strict";
  const G = window.GW;
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString();
  let toastT;
  function toast(m, ms) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 2400); }

  /* ---------- saved progress ---------- */
  const KEY = "nsh-guesswho";
  const fresh = () => ({ score: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, firstClue: 0, cats: {}, solved: {}, seen: [], best: {}, board: {}, ach: {}, daily: {}, dailyStreak: 0, lastDaily: null, settings: { threshold: 0.85, sound: true }, name: "", unlockAll: false });
  let P = fresh();
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r) { P = Object.assign(fresh(), r); P.settings = Object.assign(fresh().settings, r.settings || {}); } } catch (e) { /* private mode */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } };
  G.threshold = P.settings.threshold;

  /* ---------- tiny sound effects ---------- */
  let ac = null;
  function beep(notes) {
    if (!P.settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime;
      notes.forEach(([f, d, type], i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.value = f; const t = t0 + i * 0.09; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); });
    } catch (e) { /* no audio */ }
  }
  const SFX = { ok: () => beep([[523, 0.18], [659, 0.18], [784, 0.3]]), no: () => beep([[300, 0.18, "sawtooth"], [220, 0.3, "sawtooth"]]), clue: () => beep([[880, 0.12]]), tick: () => beep([[1200, 0.05, "square"]]), win: () => beep([[523, 0.2], [659, 0.2], [784, 0.2], [1047, 0.45]]) };

  /* ---------- confetti ---------- */
  const cv = document.getElementById("confetti"), cx = cv.getContext("2d");
  let bits = [], raf = 0;
  function confetti(n) {
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#b197fc", "#ff922b", "#f783ac"];
    for (let i = 0; i < (n || 120); i++) bits.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6, s: 5 + Math.random() * 6, c: cols[i % cols.length], vr: (Math.random() - 0.5) * 0.4, life: 120 + Math.random() * 60 });
    if (!raf) raf = requestAnimationFrame(tickC);
  }
  function tickC() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter((b) => (b.life -= 1) > 0 && b.y < cv.height + 20);
    for (const b of bits) { b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr; cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c; cx.globalAlpha = Math.min(1, b.life / 40); cx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cx.restore(); }
    raf = bits.length ? requestAnimationFrame(tickC) : 0;
    if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  /* =========================================================
     SCREENS
     ========================================================= */
  function show(html) { app.innerHTML = `<div class="screen">${html}</div>`; window.scrollTo(0, 0); }
  app.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b && ACT[b.dataset.go]) ACT[b.dataset.go](b.dataset); });
  const ACT = {};
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const expertOpen = () => P.unlockAll || P.correct >= 30;
  const MODES = {
    classic: { name: "Classic Quiz", icon: "🎯", desc: "10 questions from a category. Three clues each.", flow: true },
    timed: { name: "Timed Challenge", icon: "⏱️", desc: "Answer as many as you can in 90 seconds.", flow: true },
    endless: { name: "Endless Mode", icon: "♾️", desc: "Keep going until you make 3 mistakes.", flow: true },
    daily: { name: "Daily Challenge", icon: "📅", desc: "10 fresh questions every day, the same for everyone. Build a streak!" },
    mixed: { name: "Mixed Categories", icon: "🎲", desc: "10 random questions from every category." },
    expert: { name: "Expert Mode", icon: "🧠", desc: "Harder answers and vaguer clues. 1.5× points.", lock: () => !expertOpen(), lockMsg: "Answer 30 questions correctly to unlock" }
  };

  ACT.home = function () {
    const acc = P.correct + P.wrong ? Math.round((P.correct / (P.correct + P.wrong)) * 100) : 0;
    const dailyDone = P.daily[today()];
    show(`<div class="hero">
      <div class="title" aria-label="Guess Who?"><span>G</span><span>U</span><span>E</span><span>S</span><span>S</span> <span>W</span><span>H</span><span>O</span><span class="q">?</span></div>
      <p class="tag">Movies, stars, heroes, countries & cultures. Three clues. One guess. How fast can you get it?</p>
      <div class="chips"><span class="chip">⭐ ${fmt(P.score)} points</span><span class="chip">🎯 ${acc}% accuracy</span><span class="chip">🔥 Daily streak ${P.dailyStreak}</span></div>
      <div class="home-btns">
        <button class="btn primary" data-go="cats" data-mode="classic">▶ Play</button>
        <button class="btn go" data-go="daily">${dailyDone ? "📅 Daily done — " + dailyDone.score + " pts" : "📅 Daily Challenge"}</button>
        <button class="btn" data-go="modes">🎮 Game Modes</button>
        <div class="home-grid"><button class="btn" data-go="board">🏆 Leaderboard</button><button class="btn" data-go="achievements">🏅 Achievements</button></div>
        <div class="home-grid"><button class="btn" data-go="stats">📊 Statistics</button><button class="btn" data-go="settings">⚙️ Settings</button></div>
      </div>
      <p class="muted" style="margin-top:16px">${G.ALL.length} answers across ${G.CATS.length} categories and ${G.SUBS.length} subcategories</p></div>`);
  };
  ACT.modes = function () {
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">🎮 Game Modes</h2><p class="muted">Pick how you want to play.</p>
      <div class="grid">${Object.entries(MODES).map(([k, m]) => { const locked = m.lock && m.lock(); return `<button class="card ${locked ? "locked" : ""}" data-go="mode" data-mode="${k}"><span class="ci">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>${P.best[k] ? `<small>Best: ${fmt(P.best[k])}</small>` : ""}${locked ? `<span class="lock">🔒 ${m.lockMsg}</span>` : ""}</button>`; }).join("")}</div>`);
  };
  ACT.mode = function (d) {
    const m = MODES[d.mode];
    if (m.lock && m.lock()) { toast("🔒 " + m.lockMsg + " (" + P.correct + "/30)"); return; }
    if (m.flow) ACT.cats({ mode: d.mode });
    else if (d.mode === "daily") ACT.daily();
    else if (d.mode === "mixed") startGame({ mode: "mixed", pool: G.ALL.slice(), label: "Mixed Categories", balanced: true });
    else if (d.mode === "expert") startGame({ mode: "expert", pool: G.ALL.filter((e) => e.diff >= 3), label: "Expert Mode", balanced: true });
  };
  ACT.cats = function (d) {
    const mode = (d && d.mode) || "classic";
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">${MODES[mode].icon} ${MODES[mode].name}</h2><p class="muted">Choose a category.</p>
      <div class="grid">${G.CATS.map((c) => { const items = G.ALL.filter((e) => e.cat === c.id), solved = items.filter((e) => P.solved[e.id]).length; return `<button class="card" style="--c:${c.color}" data-go="subs" data-cat="${c.id}" data-mode="${mode}"><span class="ci">${c.icon}</span><b>${c.name}</b><small>${G.subsOf(c.id).length} subcategories · ${items.length} answers</small><div class="progress"><i style="width:${(solved / items.length) * 100}%"></i></div><small>${solved}/${items.length} solved${P.cats[c.id] ? " · " + fmt(P.cats[c.id].score) + " pts" : ""}</small></button>`; }).join("")}</div>`);
  };
  ACT.subs = function (d) {
    const c = G.catById(d.cat), subs = G.subsOf(d.cat), mode = d.mode || "classic";
    const all = G.ALL.filter((e) => e.cat === c.id);
    const stars = (items) => { const a = Math.max(1, Math.min(4, Math.round(items.reduce((s, e) => s + e.diff, 0) / items.length))); return "★".repeat(a) + "☆".repeat(4 - a); };
    const lv = P.diffPick || 0;
    const dpick = `<div class="dpick" role="group" aria-label="Difficulty">${["Any difficulty"].concat(G.DIFF).map((n, i) => `<button class="tab ${lv === i ? "on" : ""}" data-go="setdiff" data-v="${i}" data-cat="${c.id}" data-mode="${mode}">${n}</button>`).join("")}</div>`;
    show(`<button class="btn small ghost back" data-go="cats" data-mode="${mode}">← Categories</button>
      <div class="sub-head"><span class="ci">${c.icon}</span><div><h2 class="screen-title">${c.name}</h2><small class="muted">${MODES[mode].name} · pick a subcategory</small></div></div>
      ${dpick}
      <div class="grid">${subs.map((s) => { const solved = s.items.filter((e) => P.solved[e.id]).length; return `<button class="card" style="--c:${c.color}" data-go="start" data-cat="${c.id}" data-sub="${s.id}" data-mode="${mode}"><span class="ci">${s.icon}</span><b>${s.name}</b><small>${s.items.length} answers · <span class="diff" title="Difficulty">${stars(s.items)}</span></small><div class="progress"><i style="width:${(solved / s.items.length) * 100}%"></i></div><small>${solved}/${s.items.length} solved</small></button>`; }).join("")}
        <button class="card" style="--c:${c.color}" data-go="start" data-cat="${c.id}" data-sub="*" data-mode="${mode}"><span class="ci">🎲</span><b>All ${c.name}</b><small>${all.length} answers, every subcategory mixed</small><span class="diff">${stars(all)}</span></button></div>`);
  };
  ACT.setdiff = function (d) { P.diffPick = +d.v || 0; save(); ACT.subs({ cat: d.cat, mode: d.mode }); };
  ACT.start = function (d) {
    const c = G.catById(d.cat);
    let pool = d.sub === "*" ? G.ALL.filter((e) => e.cat === d.cat) : G.subById(d.cat, d.sub).items.slice();
    const lv = P.diffPick || 0;
    if (lv) { const f = pool.filter((e) => e.diff === lv); if (f.length >= 5) pool = f; else toast("Not enough " + G.DIFF[lv - 1] + " questions here — mixing difficulties"); }
    const label = c.name + (d.sub === "*" ? "" : " › " + G.subById(d.cat, d.sub).name) + (lv && pool.every((e) => e.diff === lv) ? " · " + G.DIFF[lv - 1] : "");
    startGame({ mode: d.mode || "classic", pool, label, cat: d.cat, sub: d.sub });
  };
  ACT.daily = function () {
    const day = today();
    if (P.daily[day]) { toast("You've done today's challenge — come back tomorrow!"); return ACT.dailyResult(); }
    // one question from each category, picked by the date so everyone gets the same set
    const r = G.rng(G.hash("daily-" + day));
    const cats = G.CATS.slice();
    for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; }
    const pool = cats.slice(0, 10).map((c) => { const items = G.ALL.filter((e) => e.cat === c.id); return items[Math.floor(r() * items.length)]; });
    startGame({ mode: "daily", pool, fixed: true, label: "Daily Challenge · " + day, seed: G.hash("clues-" + day) });
  };
  ACT.dailyResult = function () {
    const d = P.daily[today()];
    show(`<button class="btn small ghost back" data-go="home">← Home</button><div class="panel summary"><h2>📅 Today's challenge</h2><div class="score">${d ? d.score : 0}</div><p class="muted">${d ? d.correct + " / 10 correct" : ""} · 🔥 streak ${P.dailyStreak} day${P.dailyStreak === 1 ? "" : "s"}</p><p class="muted">A new set of questions arrives at midnight.</p><button class="btn primary" data-go="home">Home</button></div>`);
  };

  /* =========================================================
     A GAME
     ========================================================= */
  let S = null, timer = null;
  function startGame(o) {
    clearInterval(timer);
    S = Object.assign({ q: 0, score: 0, correct: 0, wrong: 0, lives: 3, time: 90, streak: 0, firstClues: 0, asked: new Set(), history: [] }, o);
    S.total = S.mode === "timed" || S.mode === "endless" ? Infinity : S.fixed ? S.pool.length : 10;
    S.rnd = S.seed ? G.rng(S.seed) : Math.random;
    if (S.mode === "timed") timer = setInterval(() => { if (!S || S.mode !== "timed") return clearInterval(timer); S.time -= 1; const el = document.getElementById("timeStat"); if (el) { el.textContent = "⏱️ " + S.time + "s"; el.classList.toggle("warn", S.time <= 10); } if (S.time <= 10 && S.time > 0) SFX.tick(); if (S.time <= 0) { clearInterval(timer); endGame(); } }, 1000);
    nextQuestion();
  }
  // avoid repeating recent answers: prefer ones not seen lately
  function pickEntry() {
    if (S.fixed) return S.pool[S.q];
    // mixed modes: pick a category first so big categories (like countries) don't crowd out the rest
    if (S.balanced) {
      const cats = [...new Set(S.pool.map((e) => e.cat))], cat = cats[Math.floor(Math.random() * cats.length)];
      const recentB = new Set(P.seen.slice(-80));
      let cb = S.pool.filter((e) => e.cat === cat && !S.asked.has(e.id) && !recentB.has(e.id));
      if (!cb.length) cb = S.pool.filter((e) => e.cat === cat && !S.asked.has(e.id));
      if (cb.length) return cb[Math.floor(Math.random() * cb.length)];
    }
    const recent = new Set(P.seen.slice(-80));
    let cand = S.pool.filter((e) => !S.asked.has(e.id) && !recent.has(e.id));
    if (!cand.length) cand = S.pool.filter((e) => !S.asked.has(e.id));
    if (!cand.length) { S.asked.clear(); cand = S.pool.slice(); }
    return cand[Math.floor(Math.random() * cand.length)];
  }
  function nextQuestion() {
    if (S.q >= S.total || (S.mode === "endless" && S.lives <= 0) || (S.mode === "timed" && S.time <= 0)) return endGame();
    const e = pickEntry();
    S.asked.add(e.id);
    P.seen.push(e.id); if (P.seen.length > 200) P.seen.splice(0, P.seen.length - 200);
    S.cur = { e, clues: G.pickClues(e, S.rnd, S.mode === "expert"), shown: 1, tries: 0, done: false };
    S.q++;
    renderQuestion(true);
  }
  const POINTS = [100, 75, 50];
  const mult = () => (S.mode === "expert" ? 1.5 : 1);
  function renderQuestion(fresh) {
    const { e, clues, shown } = S.cur, c = G.catById(e.cat), sub = G.subById(e.cat, e.sub);
    const worth = Math.round(POINTS[shown - 1] * mult());
    const info = S.mode === "timed" ? `<span class="stat ${S.time <= 10 ? "warn" : ""}" id="timeStat">⏱️ ${S.time}s</span>` : S.mode === "endless" ? `<span class="stat">${"❤️".repeat(S.lives)}${"🖤".repeat(3 - S.lives)}</span>` : `<span class="stat">Q ${S.q}/${S.total}</span>`;
    show(`<div class="gbar"><div class="crumbs"><b>${c.icon} ${c.name}</b> › ${sub.icon} ${esc(sub.name)}${S.label && !S.cat ? " · " + esc(S.label) : ""}</div><div class="stats">${info}<span class="stat">⭐ ${fmt(S.score)}</span>${S.streak > 1 ? `<span class="stat">🔥 ${S.streak}</span>` : ""}</div></div>
      <div class="qcard" style="--c:${c.color}">
        <div class="qhead"><h1>${sub.ask || c.ask}</h1><span class="worth ${worth < 75 * mult() ? "w50" : worth < 100 * mult() ? "w75" : ""}" id="worth">Worth ${worth}</span></div>
        <div class="clues">${[0, 1, 2].map((i) => i < shown ? `<div class="clue ${fresh && i === shown - 1 ? "new" : ""}"><span class="n">${i + 1}</span><span>${esc(clues[i])}</span></div>` : `<div class="clue hidden"><span class="n">${i + 1}</span><span>Clue ${i + 1} is hidden — revealing it lowers the score to ${Math.round(POINTS[i] * mult())}</span></div>`).join("")}</div>
        <div id="zone">
          <form class="answer" id="ansForm" autocomplete="off"><input id="ans" type="text" placeholder="Type your answer…" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80"><button class="btn primary" type="submit">Submit</button></form>
          <div class="feedback" id="fb"></div>
          <div class="under"><button class="btn small" type="button" id="revealBtn" ${shown >= 3 ? "disabled" : ""}>💡 Reveal next clue</button><button class="btn small ghost" type="button" id="giveBtn">🏳️ Give up</button></div>
        </div>
      </div>`);
    const input = document.getElementById("ans");
    setTimeout(() => input && input.focus(), 50);
    document.getElementById("ansForm").addEventListener("submit", (ev) => { ev.preventDefault(); submit(input.value); });
    document.getElementById("revealBtn").addEventListener("click", reveal);
    document.getElementById("giveBtn").addEventListener("click", () => finishQ(false, "gave up"));
  }
  function reveal() {
    const cur = S.cur; if (cur.done || cur.shown >= 3) return;
    cur.shown++; SFX.clue();
    const val = document.getElementById("ans").value;
    renderQuestion(true);
    document.getElementById("ans").value = val;
  }
  function submit(text) {
    const cur = S.cur; if (cur.done) return;
    const fb = document.getElementById("fb");
    if (!text.trim()) { fb.className = "feedback meh"; fb.textContent = "Type a name first 🙂"; return; }
    const r = G.check(text, cur.e);
    if (r.ok) return finishQ(true, r.exact ? "" : "close enough — we'll count it!");
    if (r.ambiguous) { fb.className = "feedback meh"; fb.textContent = "🤔 That could be someone else — be a bit more specific."; return; }
    // a wrong guess unlocks the next clue; after the third clue it ends the question
    cur.tries++;
    SFX.no();
    const form = document.getElementById("ansForm");
    if (cur.shown >= 3) return finishQ(false, "");
    cur.shown++;
    renderQuestion(true);
    const fb2 = document.getElementById("fb"); fb2.className = "feedback bad"; fb2.textContent = (r.near ? "So close… but no. " : "Nope! ") + "Here's another clue.";
    const f2 = document.getElementById("ansForm"); f2.classList.add("shake"); setTimeout(() => f2.classList.remove("shake"), 450);
    void form;
  }
  function finishQ(ok, note) {
    const cur = S.cur; if (cur.done) return;
    cur.done = true;
    const e = cur.e, c = G.catById(e.cat);
    const pts = ok ? Math.round(POINTS[cur.shown - 1] * mult()) : 0;
    S.score += pts;
    const cs = (P.cats[e.cat] = P.cats[e.cat] || { score: 0, correct: 0, wrong: 0 });
    if (ok) {
      S.correct++; S.streak++; P.correct++; P.streak++; P.score += pts; cs.score += pts; cs.correct++; P.solved[e.id] = 1;
      if (cur.shown === 1) { P.firstClue++; S.firstClues++; }
      P.bestStreak = Math.max(P.bestStreak, P.streak);
      SFX.ok(); confetti(cur.shown === 1 ? 160 : 90);
    } else {
      S.wrong++; S.streak = 0; P.wrong++; P.streak = 0; cs.wrong++;
      if (S.mode === "endless") S.lives--;
    }
    S.history.push({ e, ok, pts, clues: cur.shown });
    checkAch();
    save();
    const auto = S.mode === "timed";
    const zone = document.getElementById("zone");
    zone.innerHTML = `<div class="result ${ok ? "ok" : "no"}">
      <div class="big">${ok ? (cur.shown === 1 ? "🤩" : "🎉") : ["🙈", "😅", "🤷", "😬"][Math.floor(Math.random() * 4)]}</div>
      <h2>${ok ? ["Correct!", "Nailed it!", "Yes!", "Brilliant!"][Math.floor(Math.random() * 4)] : note === "gave up" ? "No worries!" : ["Not this time!", "So close!", "Oops!"][Math.floor(Math.random() * 3)]}</h2>
      <div class="ans">${esc(e.answer)}</div>
      <p class="info">${esc(e.info)}</p>
      <div class="pts"><span class="stat">+${pts} points</span><span class="stat">💡 ${cur.shown} clue${cur.shown > 1 ? "s" : ""} used</span>${note && ok ? `<span class="stat">✍️ ${note}</span>` : ""}${S.mode === "endless" && !ok ? `<span class="stat">${S.lives} ${S.lives === 1 ? "life" : "lives"} left</span>` : ""}</div>
      <div><button class="btn primary" id="nextBtn">${isLast() ? "See results →" : "Next question →"}</button></div></div>`;
    // show all three clues now so you can see what you missed
    const box = document.querySelector(".clues");
    box.innerHTML = cur.clues.map((t, i) => `<div class="clue"><span class="n">${i + 1}</span><span>${esc(t)}</span></div>`).join("");
    const w = document.getElementById("worth"); if (w) { w.textContent = ok ? "+" + pts : "0 points"; w.className = "worth" + (ok ? "" : " w50"); }
    const nb = document.getElementById("nextBtn"); nb.addEventListener("click", nextQuestion); nb.focus();
    if (auto) setTimeout(() => { if (S && S.cur === cur && S.time > 0) nextQuestion(); }, ok ? 1300 : 2200);
  }
  const isLast = () => S.q >= S.total || (S.mode === "endless" && S.lives <= 0) || (S.mode === "timed" && S.time <= 0);
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && document.getElementById("nextBtn") && document.activeElement !== document.getElementById("ans")) { e.preventDefault(); document.getElementById("nextBtn").click(); } });

  function endGame() {
    clearInterval(timer);
    const s = S; if (!s) return ACT.home();
    S = null;
    const isBest = !P.best[s.mode] || s.score > P.best[s.mode];
    if (isBest) P.best[s.mode] = s.score;
    if (s.mode === "daily") {
      const d = today();
      P.daily[d] = { score: s.score, correct: s.correct };
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
      P.dailyStreak = P.lastDaily === yk ? P.dailyStreak + 1 : 1;
      P.lastDaily = d;
    }
    s.perfect = s.mode !== "timed" && s.mode !== "endless" && s.correct === s.total;
    checkAch(s);
    save();
    if (s.correct >= Math.max(3, s.history.length * 0.6)) { SFX.win(); confetti(220); }
    const stars = s.history.length ? Math.round((s.correct / s.history.length) * 3) : 0;
    show(`<div class="panel summary"><h2>${MODES[s.mode].icon} ${MODES[s.mode].name} complete!</h2>
      <p class="muted">${esc(s.label || "")}</p>
      <div class="score">${fmt(s.score)}</div><p class="muted">points${isBest ? " · 🎉 new best!" : " · best " + fmt(P.best[s.mode])}</p>
      <div style="font-size:1.8rem;color:#f59f00;letter-spacing:4px">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <div class="statgrid" style="margin:14px 0"><div class="box"><b>${s.correct}/${s.history.length}</b><small>correct</small></div><div class="box"><b>${s.history.length ? Math.round((s.correct / s.history.length) * 100) : 0}%</b><small>accuracy</small></div><div class="box"><b>${s.firstClues}</b><small>first-clue answers</small></div><div class="box"><b>🔥 ${P.bestStreak}</b><small>best streak ever</small></div></div>
      ${s.score > 0 ? `<div class="name-row"><input id="pname" maxlength="16" placeholder="Your name" value="${esc(P.name)}"><button class="btn go" id="saveScore">🏆 Save to leaderboard</button></div>` : ""}
      <div class="row center"><button class="btn primary" id="again">↺ Play again</button><button class="btn" data-go="home">🏠 Home</button></div></div>
      <div class="panel"><h3>Your answers</h3><table class="table"><tr><th>Answer</th><th>Clues</th><th class="num">Points</th></tr>${s.history.map((h) => `<tr><td>${h.ok ? "✅" : "❌"} ${esc(h.e.answer)}</td><td>${h.clues}</td><td class="num">${h.pts}</td></tr>`).join("")}</table></div>`);
    const sv = document.getElementById("saveScore");
    if (sv) sv.addEventListener("click", () => { const n = (document.getElementById("pname").value || "Player").trim().slice(0, 16); P.name = n; const b = (P.board[s.mode] = P.board[s.mode] || []); b.push({ name: n, score: s.score, date: today(), label: s.label }); b.sort((a, c) => c.score - a.score); b.splice(10); save(); toast("🏆 Saved!"); sv.disabled = true; });
    document.getElementById("again").addEventListener("click", () => { if (s.mode === "daily") return ACT.dailyResult(); startGame({ mode: s.mode, pool: s.pool, label: s.label, cat: s.cat, sub: s.sub }); });
  }

  /* =========================================================
     ACHIEVEMENTS, LEADERBOARD, STATS, SETTINGS
     ========================================================= */
  const ACH = [
    ["first", "🎉", "First Guess", "Get your first answer right", () => P.correct >= 1],
    ["streak3", "🔥", "On Fire", "3 correct in a row", () => P.bestStreak >= 3],
    ["streak5", "🔥", "Hot Streak", "5 correct in a row", () => P.bestStreak >= 5],
    ["streak10", "☄️", "Unstoppable", "10 correct in a row", () => P.bestStreak >= 10],
    ["streak20", "👑", "Legendary", "20 correct in a row", () => P.bestStreak >= 20],
    ["clue1x10", "⚡", "Mind Reader", "Answer 10 questions on the very first clue", () => P.firstClue >= 10],
    ["c50", "🎬", "Film Buff", "50 correct answers", () => P.correct >= 50],
    ["c200", "🍿", "Walking Encyclopedia", "200 correct answers", () => P.correct >= 200],
    ["p1000", "⭐", "Thousand Club", "Earn 1,000 points", () => P.score >= 1000],
    ["p10000", "🌟", "Superstar", "Earn 10,000 points", () => P.score >= 10000],
    ["perfect", "💯", "Perfect Round", "Get every question right in a round", (s) => s && s.perfect],
    ["allcats", "🗺️", "All-Rounder", "Score in every category", () => G.CATS.every((c) => P.cats[c.id] && P.cats[c.id].correct > 0)],
    ["daily3", "📅", "Regular", "Daily challenge 3 days in a row", () => P.dailyStreak >= 3],
    ["daily7", "🗓️", "Devoted", "Daily challenge 7 days in a row", () => P.dailyStreak >= 7],
    ["expert", "🧠", "Expert Unlocked", "Unlock Expert Mode", () => P.correct >= 30],
    ["speed", "⏱️", "Speed Demon", "10 correct in one Timed Challenge", (s) => s && s.mode === "timed" && s.correct >= 10]
  ];
  function checkAch(s) {
    for (const [id, icon, name, , test] of ACH) if (!P.ach[id] && test(s)) { P.ach[id] = Date.now(); setTimeout(() => toast("🏅 Achievement: " + icon + " " + name, 2800), 600); }
  }
  ACT.achievements = function () {
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">🏅 Achievements</h2><p class="muted">${ACH.filter((a) => P.ach[a[0]]).length} / ${ACH.length} unlocked</p>
      <div class="ach">${ACH.map(([id, icon, name, desc]) => `<div class="${P.ach[id] ? "" : "no"}"><span class="ai">${icon}</span><span><b>${name}</b><small>${desc}</small></span></div>`).join("")}</div>`);
  };
  ACT.board = function (d) {
    const mode = (d && d.mode) || "classic";
    const list = P.board[mode] || [];
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">🏆 Leaderboard</h2><p class="muted">Top scores on this device — share it with friends and family and compete for the top spot.</p>
      <div class="tabs">${Object.entries(MODES).map(([k, m]) => `<button class="tab ${k === mode ? "on" : ""}" data-go="board" data-mode="${k}">${m.icon} ${m.name}</button>`).join("")}</div>
      <div class="panel">${list.length ? `<table class="table"><tr><th>#</th><th>Name</th><th>Played</th><th class="num">Score</th></tr>${list.map((r, i) => `<tr><td>${["🥇", "🥈", "🥉"][i] || i + 1}</td><td>${esc(r.name)}</td><td><small class="muted">${esc(r.label || "")} · ${r.date}</small></td><td class="num"><b>${fmt(r.score)}</b></td></tr>`).join("")}</table>` : `<p class="muted center">No scores yet — finish a game and save your score!</p>`}</div>`);
  };
  ACT.stats = function () {
    const acc = P.correct + P.wrong ? Math.round((P.correct / (P.correct + P.wrong)) * 100) : 0;
    const box = (v, l) => `<div class="box"><b>${v}</b><small>${l}</small></div>`;
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">📊 Statistics</h2>
      <div class="panel"><div class="statgrid">${box(fmt(P.score), "total score")}${box(P.correct, "correct")}${box(P.wrong, "incorrect")}${box(acc + "%", "accuracy")}${box(P.bestStreak, "best streak")}${box(P.firstClue, "first-clue answers")}${box(Object.keys(P.solved).length + "/" + G.ALL.length, "answers discovered")}${box(P.dailyStreak, "daily streak")}</div></div>
      <div class="panel"><h3>Best scores</h3><table class="table">${Object.entries(MODES).map(([k, m]) => `<tr><td>${m.icon} ${m.name}</td><td class="num">${P.best[k] != null ? fmt(P.best[k]) : "—"}</td></tr>`).join("")}</table></div>
      <div class="panel"><h3>By category</h3><table class="table"><tr><th>Category</th><th class="num">Score</th><th class="num">Correct</th><th class="num">Accuracy</th></tr>${G.CATS.map((c) => { const s = P.cats[c.id] || { score: 0, correct: 0, wrong: 0 }; const n = s.correct + s.wrong; return `<tr><td>${c.icon} ${c.name}</td><td class="num">${fmt(s.score)}</td><td class="num">${s.correct}</td><td class="num">${n ? Math.round((s.correct / n) * 100) + "%" : "—"}</td></tr>`; }).join("")}</table></div>`);
  };
  ACT.settings = function () {
    show(`<button class="btn small ghost back" data-go="home">← Home</button><h2 class="screen-title">⚙️ Settings</h2>
      <div class="panel"><h3>Answer matching</h3><p class="muted">How close a misspelt answer must be to count. Names that sound like a different answer are never accepted.</p>
        <label class="slider"><span>Similarity needed <b id="thrV">${Math.round(P.settings.threshold * 100)}%</b></span><input type="range" id="thr" min="0.75" max="0.97" step="0.01" value="${P.settings.threshold}"></label>
        <div class="row"><input class="btn" id="tryIn" placeholder="Try a spelling, e.g. spidermn" style="flex:1;min-width:0;text-align:left;font-weight:400"><button class="btn small" id="tryBtn">Test vs “Spider-Man”</button></div><p class="muted" id="tryOut"></p></div>
      <div class="panel"><h3>Sound</h3><label class="row"><input type="checkbox" id="snd" ${P.settings.sound ? "checked" : ""}> Sound effects</label></div>
      <div class="panel"><h3>Progress</h3><div class="row"><button class="btn small" id="unlock" ${P.unlockAll ? "disabled" : ""}>🔓 Unlock Expert Mode now</button><button class="btn small" id="reset">🗑️ Reset all progress</button></div></div>`);
    const thr = document.getElementById("thr");
    thr.addEventListener("input", () => { P.settings.threshold = +thr.value; G.threshold = P.settings.threshold; document.getElementById("thrV").textContent = Math.round(thr.value * 100) + "%"; save(); });
    document.getElementById("tryBtn").addEventListener("click", () => { const e = G.ALL.find((x) => x.answer === "Spider-Man"); const r = G.check(document.getElementById("tryIn").value, e); document.getElementById("tryOut").textContent = r.ok ? "✅ Accepted" + (r.exact ? " (exact or alias)" : " (close enough)") : r.ambiguous ? "🤔 Too close to “" + r.other + "”" : "❌ Not accepted"; });
    document.getElementById("snd").addEventListener("change", (e) => { P.settings.sound = e.target.checked; save(); });
    document.getElementById("unlock").addEventListener("click", () => { P.unlockAll = true; save(); toast("🧠 Expert Mode unlocked"); ACT.settings(); });
    document.getElementById("reset").addEventListener("click", () => { if (confirm("Reset all scores, stats, achievements and leaderboards?")) { const keep = P.settings; P = fresh(); P.settings = keep; save(); toast("Progress reset"); ACT.home(); } });
  };

  ACT.home();
  G.app = { P: () => P, startGame, ACT, S: () => S, submit: (t) => submit(t), reveal, MODES };
})();
