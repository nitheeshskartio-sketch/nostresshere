/* ============ HANGMAN — game logic, screens, rewards ============ */
(function () {
  "use strict";
  const H = window.HM;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- helpers ---------- */
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const letters = (w) => [...new Set(w.replace(/[^A-Z]/g, ""))];
  const ATTEMPTS = [8, 8, 7, 7, 6];
  const LEVELS = 50, ROUNDS = 3;

  /* ---------- save ---------- */
  const KEY = "nsh-hangman";
  const fresh = () => ({
    coins: 50, freeHints: 2, level: 0, stars: {}, recent: [],
    owned: { chars: ["blob"], themes: ["sunny"], kbs: ["rounded"] },
    sel: { char: "blob", theme: "sunny", kb: "rounded" },
    set: { sound: true, layout: "qwerty", vibrate: true },
    st: { played: 0, wins: 0, losses: 0, streak: 0, best: 0, guesses: 0, nohint: 0, catWins: {}, catPlayed: {}, bestTimed: 0, bestEndless: 0, bestSurvival: 0 },
    ach: {}, daily: { date: null, last: null, streak: 0, score: 0 }
  });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = fresh(); }
  const F = fresh();
  for (const k of ["owned", "sel", "set", "st", "daily"]) S[k] = Object.assign(F[k], S[k] || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };

  /* ---------- sound ---------- */
  let ac = null;
  function tone(f, d = 0.12, type = "sine", v = 0.12, when = 0, slide = 0) {
    if (!S.set.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.05);
    } catch (e) { /* no audio */ }
  }
  const SFX = {
    hit: () => { tone(660, 0.1, "triangle"); tone(990, 0.12, "triangle", 0.1, 0.06); },
    miss: () => tone(220, 0.22, "sawtooth", 0.06, 0, 140),
    click: () => tone(520, 0.05, "square", 0.04),
    hint: () => [700, 900, 1200].forEach((f, i) => tone(f, 0.12, "sine", 0.08, i * 0.06)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.1)),
    lose: () => { tone(400, 0.5, "sine", 0.1, 0, 120); tone(90, 0.3, "sine", 0.2, 0.75, 50); },
    coin: () => { tone(1300, 0.08, "square", 0.04); tone(1750, 0.12, "square", 0.04, 0.07); }
  };
  const buzz = (ms) => { if (S.set.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  /* ---------- toast / modal / confetti ---------- */
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200); }
  const modal = $("#modal"), card = $("#modalCard");
  function openModal(html, bind) { card.innerHTML = html; modal.hidden = false; if (bind) bind(card); const b = card.querySelector("[data-primary]"); if (b) b.focus(); }
  function closeModal() { modal.hidden = true; card.innerHTML = ""; }
  modal.addEventListener("click", (e) => { if (e.target === modal && modal.dataset.soft) closeModal(); });

  const cv = $("#confetti"), cx = cv.getContext("2d");
  let bits = [], confRAF = 0;
  function confetti(n = 120) {
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ff6fa5", "#5cc6ff", "#ffd23f", "#7be0b0", "#845ef7", "#ff922b"];
    for (let i = 0; i < n; i++) bits.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], s: 5 + Math.random() * 6, life: 1 });
    if (!confRAF) confRAF = requestAnimationFrame(stepConf);
  }
  function stepConf() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter((b) => b.life > 0 && b.y < cv.height + 20);
    for (const b of bits) {
      b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life -= 0.006;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.globalAlpha = Math.min(1, b.life * 2); cx.fillStyle = b.c; cx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cx.restore();
    }
    confRAF = bits.length ? requestAnimationFrame(stepConf) : 0;
    if (!confRAF) cx.clearRect(0, 0, cv.width, cv.height);
  }

  /* =========================================================
     SHOP DATA
     ========================================================= */
  const CHARS = [
    { id: "blob", name: "Blobby", price: 0, c: "#7be0b0", d: "#40c090" },
    { id: "cat", name: "Whiskers", price: 100, c: "#ffa94d", d: "#e8590c" },
    { id: "robot", name: "Bolt", price: 150, c: "#a5b4c8", d: "#5c6b80" },
    { id: "dino", name: "Rexie", price: 200, c: "#8ce99a", d: "#2f9e44" },
    { id: "penguin", name: "Waddles", price: 250, c: "#3b3f4a", d: "#1e2028" }
  ];
  const THEMES = [
    { id: "sunny", name: "Sunny Day", price: 0, sw: "#c5f6fa" },
    { id: "night", name: "Starry Night", price: 80, sw: "#1b1f3b" },
    { id: "candy", name: "Candy Land", price: 80, sw: "#ffdeeb" },
    { id: "ocean", name: "Beach Day", price: 120, sw: "#a5d8ff" },
    { id: "forest", name: "Forest Camp", price: 120, sw: "#d3f9d8" }
  ];
  const KBS = [
    { id: "rounded", name: "Rounded", price: 0 },
    { id: "bubbly", name: "Bubbles", price: 60 },
    { id: "retro", name: "Typewriter", price: 90 },
    { id: "neon", name: "Neon", price: 120 }
  ];

  /* =========================================================
     THE BUDDY (SVG)
     ========================================================= */
  function charExtras(ch) {
    const C = CHARS.find((c) => c.id === ch) || CHARS[0];
    let head = `<circle cx="130" cy="98" r="22" fill="${C.c}" stroke="${C.d}" stroke-width="3"/>`;
    let behind = "", top = `<path d="M130 76 q-4 -6 0 -10" stroke="${C.d}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    let body = `<ellipse cx="130" cy="142" rx="17" ry="22" fill="${C.c}" stroke="${C.d}" stroke-width="3"/><ellipse cx="130" cy="146" rx="9" ry="12" fill="#fff" opacity="0.45"/>`;
    if (ch === "cat") {
      behind = `<path d="M112 86 l-2 -18 l14 10z M148 86 l2 -18 l-14 10z" fill="${C.c}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>`;
      top = `<path d="M130 76 v-8" stroke="${C.d}" stroke-width="3" stroke-linecap="round"/>`;
      head += `<path d="M108 102 h-10 M108 106 l-9 3 M152 102 h10 M152 106 l9 3" stroke="${C.d}" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (ch === "robot") {
      head = `<rect x="108" y="77" width="44" height="40" rx="10" fill="${C.c}" stroke="${C.d}" stroke-width="3"/><circle cx="106" cy="98" r="4" fill="${C.d}"/><circle cx="154" cy="98" r="4" fill="${C.d}"/>`;
      top = `<path d="M130 77 v-9" stroke="${C.d}" stroke-width="3"/><circle cx="130" cy="68" r="3.5" fill="#ff6b6b"/>`;
      body = `<rect x="113" y="121" width="34" height="42" rx="8" fill="${C.c}" stroke="${C.d}" stroke-width="3"/><rect x="121" y="130" width="18" height="12" rx="3" fill="#fff" opacity="0.6"/><circle cx="126" cy="152" r="2.5" fill="#ffd23f"/><circle cx="134" cy="152" r="2.5" fill="#ff6b6b"/>`;
    } else if (ch === "dino") {
      behind = `<path d="M116 82 l-2 -9 l9 5 M128 77 l2 -10 l6 9 M142 80 l7 -6 l0 10" fill="#ffd23f" stroke="${C.d}" stroke-width="2.5" stroke-linejoin="round"/>`;
      body += `<path d="M146 152 q18 8 20 -6 q-6 10 -18 0" fill="${C.c}" stroke="${C.d}" stroke-width="3"/>`;
    } else if (ch === "penguin") {
      head += `<path d="M130 86 q-17 2 -15 16 q2 12 15 12 q13 0 15 -12 q2 -14 -15 -16z" fill="#fff"/>`;
      body = `<ellipse cx="130" cy="142" rx="18" ry="23" fill="${C.c}" stroke="${C.d}" stroke-width="3"/><ellipse cx="130" cy="145" rx="11" ry="17" fill="#fff"/>`;
    }
    return { C, head, behind, top, body };
  }
  function face(mood, ch) {
    const ink = ch === "penguin" ? "#1e2028" : "#2a2833";
    const beak = ch === "penguin" ? `<path d="M125 103 l5 6 l5 -6z" fill="#ff922b"/>` : "";
    const cheeks = `<circle cx="115" cy="104" r="3.5" fill="#ff8fab" opacity="0.6"/><circle cx="145" cy="104" r="3.5" fill="#ff8fab" opacity="0.6"/>`;
    const eyes = (r = 3) => `<circle cx="122" cy="96" r="${r}" fill="${ink}"/><circle cx="138" cy="96" r="${r}" fill="${ink}"/>`;
    switch (mood) {
      case "worried": return eyes() + `<path d="M117 88 l8 2 M143 88 l-8 2" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><path d="M122 109 q4 -3 8 0 q4 3 8 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + beak;
      case "panic": return `<circle cx="122" cy="95" r="5.5" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="138" cy="95" r="5.5" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="122" cy="96" r="2.2" fill="${ink}"/><circle cx="138" cy="96" r="2.2" fill="${ink}"/><ellipse cx="130" cy="110" rx="4.5" ry="5.5" fill="${ink}"/><path d="M152 84 q4 7 0 9 q-4 -2 0 -9z" fill="#74c0fc"/>` + beak;
      case "win": return `<path d="M118 97 q4 -6 8 0 M134 97 q4 -6 8 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M120 104 q10 12 20 0z" fill="${ink}"/><path d="M124 108 q6 4 12 0" fill="#ff6b6b"/>` + cheeks + beak;
      case "lose": return `<path d="M118 92 l7 7 M125 92 l-7 7 M135 92 l7 7 M142 92 l-7 7" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M122 110 q8 -6 16 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M128 111 q2 7 5 0" fill="#ff8fab"/>` + beak;
      default: return eyes() + `<path d="M122 105 q8 8 16 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` + cheeks + beak;
    }
  }
  function sceneSVG(ch) {
    const X = charExtras(ch);
    const wood = "var(--wood)", rope = "var(--rope)";
    return `<svg viewBox="0 0 200 240" role="img" aria-label="Your buddy on the clothesline">
      <g class="decor">
        <circle cx="34" cy="30" r="13" fill="#ffd43b" opacity="0.85"/>
        <path d="M150 22 q6 -8 14 -2 q8 -4 12 4 q6 2 2 8 h-30 q-6 -4 2 -10z" fill="#fff" opacity="0.8"/>
      </g>
      <rect x="0" y="222" width="200" height="18" fill="var(--ground)"/>
      <path d="M0 222 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="var(--ground)"/>
      <g class="part drop" data-p="1"><rect x="34" y="40" width="10" height="184" rx="4" fill="${wood}"/><rect x="22" y="216" width="34" height="8" rx="3" fill="${wood}"/></g>
      <g class="part drop" data-p="2"><rect x="32" y="36" width="114" height="10" rx="4" fill="${wood}"/></g>
      <g class="part drop" data-p="3"><path d="M44 78 L80 46" stroke="${wood}" stroke-width="7" stroke-linecap="round"/><circle cx="39" cy="41" r="3" fill="#fff" opacity="0.6"/></g>
      <g class="part drop" data-p="4"><path d="M130 46 v14" stroke="${rope}" stroke-width="3"/><rect x="125" y="58" width="10" height="16" rx="3" fill="#ffa8a8" stroke="#e8590c" stroke-width="1.5" class="peg"/><circle cx="130" cy="66" r="1.6" fill="#e8590c"/></g>
      <g class="buddy">
        <g class="part" data-p="5">${X.behind}${X.top}${X.head}<g class="face">${face("happy", ch)}</g></g>
        <g class="part" data-p="6">${X.body}</g>
        <g class="part" data-p="7"><path d="M115 132 q-14 6 -18 18 M145 132 q14 6 18 18" stroke="${X.C.d}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="97" cy="151" r="4.5" fill="${X.C.c}" stroke="${X.C.d}" stroke-width="2"/><circle cx="163" cy="151" r="4.5" fill="${X.C.c}" stroke="${X.C.d}" stroke-width="2"/></g>
        <g class="part" data-p="8"><path d="M123 162 l-5 22 M137 162 l5 22" stroke="${X.C.d}" stroke-width="5" stroke-linecap="round"/><ellipse cx="114" cy="186" rx="7" ry="4" fill="${ch === "penguin" ? "#ff922b" : X.C.c}" stroke="${X.C.d}" stroke-width="2"/><ellipse cx="146" cy="186" rx="7" ry="4" fill="${ch === "penguin" ? "#ff922b" : X.C.c}" stroke="${X.C.d}" stroke-width="2"/></g>
      </g>
      <g class="jelly">
        <path d="M94 196 q9 -8 18 0 t18 0 t18 0 t18 0 v4 h-72z" fill="#b197fc" opacity="0.95"/>
        <rect x="90" y="198" width="80" height="26" rx="6" fill="#e9ecef" stroke="#868e96" stroke-width="2.5"/>
        <text x="130" y="216" text-anchor="middle" font-size="10" font-weight="700" fill="#868e96" font-family="Fredoka, sans-serif">JELLY</text>
      </g>
      <g class="splash"><circle cx="112" cy="188" r="5" fill="#b197fc"/><circle cx="148" cy="186" r="6" fill="#b197fc"/><circle cx="130" cy="180" r="4" fill="#b197fc"/><circle cx="100" cy="194" r="3" fill="#b197fc"/><circle cx="160" cy="193" r="3.5" fill="#b197fc"/></g>
    </svg>`;
  }
  // show the first n parts and pick a mood
  function paintScene(root, shown, mood, extra) {
    root.querySelectorAll(".part").forEach((p) => p.classList.toggle("on", +p.dataset.p <= shown));
    const f = root.querySelector(".face"); if (f && f.dataset.m !== mood) { f.innerHTML = face(mood, S.sel.char); f.dataset.m = mood; }
    root.classList.toggle("danger", !!extra);
  }

  /* =========================================================
     WORD PICKING
     ========================================================= */
  const byTier = (t, cat) => H.WORDS.filter((w) => w.tier === t && (!cat || w.cat === cat));
  function levelWords(L) {
    const t = Math.floor(L / 10), pool = shuffle(byTier(t), rng(hash("tier" + t)));
    const i = (L % 10) * ROUNDS;
    return pool.slice(i, i + ROUNDS);
  }
  function randomWord(t, cat) {
    t = Math.max(0, Math.min(4, t));
    let pool = byTier(t, cat).filter((w) => !S.recent.includes(w.word));
    if (!pool.length) pool = byTier(t, cat);
    const w = pool[Math.floor(Math.random() * pool.length)];
    S.recent.push(w.word); if (S.recent.length > 120) S.recent.shift();
    return w;
  }
  function dailyWords(day) {
    const r = rng(hash("daily" + day));
    return [0, 1, 2, 3, 4].map((t) => { const p = byTier(t); return p[Math.floor(r() * p.length)]; });
  }

  /* =========================================================
     ACHIEVEMENTS
     ========================================================= */
  const ACH = [
    ["first", "🎉", "First Win", "Guess your first word"],
    ["master", "📚", "Word Master", "Solve 100 words"],
    ["perfect", "💎", "Perfect Guess", "Solve a word with zero wrong guesses"],
    ["catexp", "🏅", "Category Expert", "Clear all 10 words of a Category Challenge"],
    ["streak10", "🔥", "10-Win Streak", "Win 10 words in a row"],
    ["brain", "🧠", "Brain Power", "Win 10 words without hints"],
    ["speedy", "⏱️", "Speed Speller", "Solve 5 words in one Timed run"],
    ["survivor", "🛡️", "Survivor", "Reach round 10 in Survival"],
    ["marathon", "♾️", "Marathon", "Solve 15 words in one Endless run"],
    ["daily3", "📅", "Daily Devotee", "Play the Daily Challenge 3 days in a row"],
    ["expert", "🎓", "Expert Mind", "Finish an Expert level"],
    ["long", "📏", "Long Haul", "Solve a word with 12 or more letters"],
    ["rich", "🐷", "Piggy Bank", "Hold 500 coins at once"],
    ["party", "🥳", "Party Time", "Play a Two-Player game"],
    ["stylish", "🎨", "Stylish", "Unlock something in the shop"]
  ];
  function award(id) {
    if (S.ach[id]) return;
    S.ach[id] = Date.now(); save();
    const a = ACH.find((x) => x[0] === id);
    setTimeout(() => { toast(a[1] + " Achievement: " + a[2]); SFX.coin(); }, 900);
  }

  /* =========================================================
     SCREENS
     ========================================================= */
  let timer = 0;
  function stopTimer() { clearInterval(timer); timer = 0; }
  function setScene() { app.dataset.scene = S.sel.theme; }
  function go(fn) { stopTimer(); closeModal(); G = null; setScene(); fn(); window.scrollTo(0, 0); }
  const backBtn = (to = "home") => `<button class="btn small ghost back" data-go="${to}">← Back</button>`;
  function bindNav(root = app) { root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { SFX.click(); go(SCREENS[b.dataset.go]); })); }

  function home() {
    const word = "HANGMAN".split("");
    app.innerHTML = `<section class="screen">
      <div class="hero"><h1>${word.map((c, i) => `<span class="${i === 1 || i === 4 ? "blank" : ""}" style="animation-delay:${i * 0.06}s">${c}</span>`).join("")}</h1>
        <p class="muted">Guess the word before your buddy takes a dip in the jelly tub.</p></div>
      <div class="chips"><span class="chip">🪙 ${S.coins}</span><span class="chip">💡 ${S.freeHints} free hints</span><span class="chip">🗺️ Level ${Math.min(S.level + 1, LEVELS)}</span><span class="chip">🔥 Streak ${S.st.streak}</span></div>
      <div class="home-wrap">
        <div class="scene mini-scene" id="mini">${sceneSVG(S.sel.char)}</div>
        <div class="home-btns">
          <button class="btn primary" data-primary data-act="play">▶ Play · Level ${Math.min(S.level + 1, LEVELS)}</button>
          <div class="duo"><button class="btn" data-go="levels">🗺️ Levels</button><button class="btn" data-go="cats">🗂️ Categories</button></div>
          <div class="duo"><button class="btn go" data-act="daily">📅 Daily${S.daily.date === today() ? " ✓" : ""}</button><button class="btn" data-go="modes">🎮 Modes</button></div>
          <div class="duo"><button class="btn" data-go="achs">🏆 Achievements</button><button class="btn" data-go="stats">📊 Statistics</button></div>
          <div class="duo"><button class="btn" data-go="shop">🛍️ Shop</button><button class="btn" data-go="settings">⚙️ Settings</button></div>
        </div>
      </div></section>`;
    paintScene($("#mini"), 8, "happy");
    bindNav();
    $("[data-act=play]").onclick = () => { SFX.click(); startClassic(Math.min(S.level, LEVELS - 1), 0); };
    $("[data-act=daily]").onclick = () => { SFX.click(); startDaily(); };
  }

  function levels() {
    let html = `<section class="screen">${backBtn()}<h2 class="title">🗺️ Levels</h2><p class="muted">Each level has ${ROUNDS} rounds. Clear them all to unlock the next level.</p>`;
    for (let t = 0; t < 5; t++) {
      html += `<h3 class="tier-h">${["🌱", "🌿", "🌳", "⛰️", "🌋"][t]} ${H.TIERS[t]} · ${ATTEMPTS[t]} attempts</h3><div class="levels">`;
      for (let i = t * 10; i < t * 10 + 10; i++) {
        const st = S.stars[i] || 0, locked = i > S.level;
        html += `<button class="lv ${st ? "done" : ""} ${i === S.level ? "cur" : ""} ${locked ? "locked" : ""}" data-l="${i}" ${locked ? "disabled" : ""}>${locked ? "🔒" : i + 1}<small>${st ? "★".repeat(st) : ""}</small></button>`;
      }
      html += `</div>`;
    }
    app.innerHTML = html + `</section>`;
    bindNav();
    app.querySelectorAll(".lv[data-l]").forEach((b) => b.addEventListener("click", () => { SFX.click(); startClassic(+b.dataset.l, 0); }));
  }

  function cats() {
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">🗂️ Category Challenge</h2>
      <p class="muted">10 words from one category, getting harder each time. One miss ends the run — clear all 10 to become a Category Expert.</p>
      <div class="grid">${H.CATS.map((c) => { const w = S.st.catWins[c.id] || 0; return `<button class="card" data-c="${c.id}"><span class="ci">${c.icon}</span><b>${c.name}</b><small>${w} solved${S.ach["cat_" + c.id] ? " · 🏅" : ""}</small></button>`; }).join("")}</div></section>`;
    bindNav();
    app.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => { SFX.click(); startRun("category", { cat: b.dataset.c }); }));
  }

  const MODES = [
    ["classic", "🗺️", "Classic", "Work through 50 levels, 3 rounds each, from Beginner to Expert."],
    ["timed", "⏱️", "Timed", "120 seconds. Solve as many words as you can."],
    ["endless", "♾️", "Endless", "Words keep coming and slowly get harder. One loss ends it."],
    ["daily", "📅", "Daily Challenge", "Five fresh words a day, the same for everyone."],
    ["category", "🗂️", "Category Challenge", "10 words from one category of rising difficulty."],
    ["duo", "👥", "Two-Player", "One player hides a word, the other guesses. Swap and repeat."],
    ["survival", "🛡️", "Survival", "Fewer attempts and harder words every round."]
  ];
  function modes() {
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">🎮 Game Modes</h2>
      <div class="grid">${MODES.map((m) => `<button class="card" data-m="${m[0]}"><span class="ci">${m[1]}</span><b>${m[2]}</b><small>${m[3]}</small>${m[0] === "timed" && S.st.bestTimed ? `<span class="tagr">Best ${S.st.bestTimed}</span>` : m[0] === "endless" && S.st.bestEndless ? `<span class="tagr">Best ${S.st.bestEndless}</span>` : m[0] === "survival" && S.st.bestSurvival ? `<span class="tagr">Best ${S.st.bestSurvival}</span>` : ""}</button>`).join("")}</div></section>`;
    bindNav();
    app.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      SFX.click(); const m = b.dataset.m;
      if (m === "classic") go(levels); else if (m === "daily") startDaily(); else if (m === "category") go(cats); else if (m === "duo") duoSetup(); else startRun(m, {});
    }));
  }

  function achs() {
    const n = ACH.filter((a) => S.ach[a[0]]).length;
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">🏆 Achievements · ${n}/${ACH.length}</h2>
      <div class="ach">${ACH.map((a) => `<div class="${S.ach[a[0]] ? "" : "no"}"><span class="ai">${S.ach[a[0]] ? a[1] : "🔒"}</span><span><b>${a[2]}</b><small>${a[3]}</small></span></div>`).join("")}</div></section>`;
    bindNav();
  }

  function stats() {
    const s = S.st, pct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    let bestCat = "—", bw = 0;
    for (const c of H.CATS) if ((s.catWins[c.id] || 0) > bw) { bw = s.catWins[c.id]; bestCat = c.icon + " " + c.name; }
    const box = (v, l) => `<div class="box"><b>${v}</b><small>${l}</small></div>`;
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">📊 Statistics</h2>
      <div class="panel"><div class="statgrid">
        ${box(s.played, "Words played")}${box(s.wins, "Wins")}${box(s.losses, "Losses")}${box(pct + "%", "Win rate")}
        ${box(s.best, "Longest streak")}${box(s.streak, "Current streak")}${box(bestCat, "Best category")}
        ${box(s.played ? (s.guesses / s.played).toFixed(1) : "—", "Avg guesses / word")}${box(Math.min(S.level + 1, LEVELS), "Current level")}
        ${box(ACH.filter((a) => S.ach[a[0]]).length + "/" + ACH.length, "Achievements")}${box(s.bestTimed, "Best Timed")}${box(s.bestSurvival, "Best Survival")}
      </div></div>
      <div class="panel"><h3>By category</h3><div class="statgrid">${H.CATS.map((c) => box((s.catWins[c.id] || 0) + "/" + (s.catPlayed[c.id] || 0), c.icon + " " + c.name)).join("")}</div></div></section>`;
    bindNav();
  }

  function shop(tab) {
    tab = tab || "chars";
    const lists = { chars: CHARS, themes: THEMES, kbs: KBS };
    const selKey = { chars: "char", themes: "theme", kbs: "kb" }[tab];
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">🛍️ Shop <span class="chip">🪙 ${S.coins}</span></h2>
      <div class="tabs">${[["chars", "Characters"], ["themes", "Backgrounds"], ["kbs", "Keyboards"]].map((t) => `<button class="tab ${t[0] === tab ? "on" : ""}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div class="grid">${lists[tab].map((it) => {
        const own = S.owned[tab].includes(it.id), on = S.sel[selKey] === it.id;
        const pic = tab === "chars" ? `<div class="scene" data-scene-mini style="pointer-events:none">${sceneSVG(it.id)}</div>` : tab === "themes" ? `<span class="ci" style="display:block;height:44px;border-radius:12px;background:${it.sw}"></span>` : `<span class="ci">⌨️</span>`;
        return `<button class="card ${on ? "on" : ""}" data-id="${it.id}">${pic}<b>${it.name}</b><small>${on ? "Equipped" : own ? "Tap to equip" : "🪙 " + it.price}</small></button>`;
      }).join("")}</div></section>`;
    if (tab === "chars") app.querySelectorAll("[data-scene-mini]").forEach((el) => paintScene(el, 8, "happy"));
    bindNav();
    app.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => shop(b.dataset.t)));
    app.querySelectorAll(".card[data-id]").forEach((b) => b.addEventListener("click", () => {
      const it = lists[tab].find((x) => x.id === b.dataset.id);
      if (!S.owned[tab].includes(it.id)) {
        if (S.coins < it.price) { toast("Not enough coins yet — win a few more words!"); SFX.miss(); return; }
        S.coins -= it.price; S.owned[tab].push(it.id); SFX.coin(); award("stylish"); toast("Unlocked " + it.name + "!");
      } else SFX.click();
      S.sel[selKey] = it.id; save(); setScene(); shop(tab);
    }));
  }

  function settings() {
    const tog = (k, l) => `<label class="row" style="justify-content:space-between;padding:8px 0"><span>${l}</span><input type="checkbox" data-k="${k}" ${S.set[k] ? "checked" : ""}></label>`;
    app.innerHTML = `<section class="screen">${backBtn()}<h2 class="title">⚙️ Settings</h2>
      <div class="panel">${tog("sound", "🔊 Sound effects")}${tog("vibrate", "📳 Vibration (phones)")}
        <div class="row" style="justify-content:space-between;padding:8px 0"><span>⌨️ Keyboard layout</span><span class="row"><button class="tab ${S.set.layout === "qwerty" ? "on" : ""}" data-lay="qwerty">QWERTY</button><button class="tab ${S.set.layout === "abc" ? "on" : ""}" data-lay="abc">A–Z</button></span></div>
        <p class="muted" style="margin:6px 0 0">You can also type on a physical keyboard. Colours, characters and keyboard styles live in the Shop.</p></div>
      <div class="panel"><h3>Danger zone</h3><button class="btn" id="reset">🗑️ Reset all progress</button></div></section>`;
    bindNav();
    app.querySelectorAll("[data-k]").forEach((c) => c.addEventListener("change", () => { S.set[c.dataset.k] = c.checked; save(); }));
    app.querySelectorAll("[data-lay]").forEach((b) => b.addEventListener("click", () => { S.set.layout = b.dataset.lay; save(); settings(); }));
    $("#reset").onclick = () => openModal(`<div class="res"><div class="big">🗑️</div><h2>Reset everything?</h2><p class="muted">Coins, levels, stats, unlocks and achievements will be wiped.</p><div class="row"><button class="btn" id="no">Keep it</button><button class="btn primary" id="yes">Reset</button></div></div>`, (c) => {
      c.querySelector("#no").onclick = closeModal;
      c.querySelector("#yes").onclick = () => { S = fresh(); save(); toast("Fresh start!"); go(home); };
    });
  }

  const SCREENS = { home, levels, cats, modes, achs, stats, shop: () => shop(), settings };

  /* =========================================================
     A ROUND
     ========================================================= */
  let G = null; // current round
  /* run = { mode, ...mode state } ; w = word entry */
  function newRound(run, w, opts = {}) {
    stopTimer();
    G = {
      run, w, word: w.word, maxWrong: opts.attempts || ATTEMPTS[w.tier], guessed: new Set(), removed: new Set(), wrong: [],
      hints: 0, maxHints: opts.maxHints != null ? opts.maxHints : (w.tier >= 3 ? 2 : 99), used: {}, clue: !!opts.showClue, showCat: opts.showCat !== false,
      over: false, t0: Date.now(), coinsFree: opts.noCoins
    };
    renderGame();
    if (run.mode === "timed") {
      timer = setInterval(() => {
        const left = Math.max(0, Math.ceil((run.end - Date.now()) / 1000));
        const el = $("#tleft"); if (el) { el.textContent = "⏱️ " + left + "s"; el.classList.toggle("warn", left <= 15); }
        if (left <= 0) { stopTimer(); if (G && !G.over) { G.over = true; G.timeout = true; endTimed(); } }
      }, 250);
    }
  }
  const solved = () => letters(G.word).every((c) => G.guessed.has(c));
  const shownParts = () => (G.wrong.length >= G.maxWrong ? 8 : Math.min(7, Math.ceil((G.wrong.length * 8) / G.maxWrong)));
  const mood = () => { const left = G.maxWrong - G.wrong.length; return left <= 1 ? "panic" : G.wrong.length / G.maxWrong >= 0.45 ? "worried" : "happy"; };

  function crumbs() {
    const r = G.run, c = H.catById(G.w.cat);
    const cat = G.showCat ? `${c.icon} ${c.name}` : "❓ Mystery category";
    const head = {
      classic: `Level ${r.level + 1} · Round ${r.round + 1}/${ROUNDS}`,
      timed: `Timed · word ${r.count + 1}`, endless: `Endless · word ${r.count + 1}`, daily: `Daily · word ${r.idx + 1}/5`,
      category: `Category Challenge · ${r.count + 1}/10`, survival: `Survival · round ${r.count + 1}`, duo: r.names ? `Two-Player · ${esc(r.names[r.guesser])} guesses` : ""
    }[r.mode];
    return `${head} · ${cat}` + (G.w.tier == null ? "" : ` · <span class="muted">${H.TIERS[G.w.tier]}</span>`);
  }
  function wordHTML(reveal) {
    return G.word.split(" ").map((part) => `<span class="w">${[...part].map((ch) => {
      if (ch === "-") return `<span class="tile hyph">-</span>`;
      const got = G.guessed.has(ch);
      return `<span class="tile ${got ? "show" : reveal ? "missed show" : ""}" data-ch="${got ? ch : ""}">${got || reveal ? ch : ""}</span>`;
    }).join("")}</span>`).join("");
  }
  const ROWS = { qwerty: ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"], abc: ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ"] };
  function keyboardHTML() {
    return `<div class="kb ${S.sel.kb}" id="kb">${ROWS[S.set.layout].map((r) => `<div class="krow">${[...r].map((k) => `<button class="key" data-key="${k}" aria-label="${k}">${k}</button>`).join("")}</div>`).join("")}</div>`;
  }
  const HINTS = [
    ["cat", "🗂️", "Category", 5], ["clue", "💬", "Clue", 10], ["reveal", "🔤", "Reveal letter", 25], ["remove", "🧹", "Remove 3", 15], ["extra", "❤️", "+1 attempt", 30]
  ];
  function renderGame() {
    const r = G.run;
    const bar = [];
    if (r.mode !== "duo") bar.push(`<span class="stat" id="coins">🪙 ${S.coins}</span>`);
    if (r.mode === "timed") bar.push(`<span class="stat" id="tleft">⏱️ ${Math.max(0, Math.ceil((r.end - Date.now()) / 1000))}s</span>`);
    if (r.score != null) bar.push(`<span class="stat">⭐ ${r.score}</span>`);
    if (r.mode === "duo") bar.push(`<span class="stat">${esc(r.names[0])} ${r.pts[0]} : ${r.pts[1]} ${esc(r.names[1])}</span>`);
    app.innerHTML = `<section class="screen game">
      <div class="gbar"><button class="btn small ghost" id="quit">← Menu</button><span class="crumbs">${crumbs()}</span><div class="stats">${bar.join("")}</div></div>
      <div class="board">
        <div class="scene" id="scene">${sceneSVG(S.sel.char)}<span class="lives" id="lives"></span></div>
        <div class="right">
          <div class="clue-box" id="clue"></div>
          <div class="word" id="word" aria-label="word to guess"></div>
          <div class="hints" id="hints"></div>
          ${keyboardHTML()}
          <div class="guessed" id="guessed"></div>
        </div>
      </div></section>`;
    $("#quit").onclick = () => { SFX.click(); if (G && !G.over && G.wrong.length + G.guessed.size > 0 && r.mode !== "duo") quitAsk(); else go(home); };
    app.querySelectorAll(".key").forEach((k) => k.addEventListener("click", () => guess(k.dataset.key)));
    update(true);
  }
  function quitAsk() {
    openModal(`<div class="res"><div class="big">🚪</div><h2>Leave this word?</h2><p class="muted">It will count as a loss.</p><div class="row"><button class="btn" id="stay" data-primary>Keep playing</button><button class="btn primary" id="leave">Leave</button></div></div>`, (c) => {
      c.querySelector("#stay").onclick = closeModal;
      c.querySelector("#leave").onclick = () => { if (G && G.run.mode !== "timed") record(false); go(home); };
    });
  }
  function update(first) {
    if (!G) return;
    const left = G.maxWrong - G.wrong.length;
    $("#word").innerHTML = wordHTML(G.over && !G.won);
    $("#lives").textContent = "❤️".repeat(Math.max(0, Math.min(left, 10))) + (left > 10 ? "+" : "") + (left ? "" : "💔");
    const c = H.catById(G.w.cat);
    const clue = G.clue ? `<b>Clue:</b> ${esc(G.w.clue || "No clue given")}` : `<span class="muted">Need help? Grab a hint below.</span>`;
    $("#clue").innerHTML = (G.showCat ? `<b>${c.icon} ${c.name}</b> · ` : "") + clue;
    $("#guessed").innerHTML = G.wrong.length ? `Misses: <b>${G.wrong.join(" ")}</b>` : "";
    app.querySelectorAll(".key").forEach((k) => {
      const ch = k.dataset.key, g = G.guessed.has(ch), hit = g && G.word.includes(ch), gone = G.removed.has(ch);
      k.className = "key" + (hit ? " hit" : g ? " miss" : gone ? " gone" : "");
      k.disabled = g || gone || G.over;
    });
    renderHints();
    const sc = $("#scene");
    paintScene(sc, shownParts(), G.over ? (G.won ? "win" : "lose") : mood(), !G.over && left <= 1 ? 1 : 0);
    if (G.over && !G.won) sc.querySelector(".jelly").style.opacity = 1;
    if (first) app.querySelectorAll(".tile.show").forEach((t) => t.classList.remove("show"));
  }
  function hintCost(h) { return S.freeHints > 0 ? 0 : h[3]; }
  function renderHints() {
    const el = $("#hints"); if (!el) return;
    const duo = G.run.mode === "duo";
    const avail = HINTS.filter((h) => !(h[0] === "cat" && G.showCat) && !(duo && h[0] === "cat"));
    const capped = G.hints >= G.maxHints;
    el.innerHTML = avail.map((h) => {
      let dis = G.over || capped;
      if (h[0] === "clue" && (G.clue || (duo && !G.w.clue))) dis = true;
      if (h[0] === "extra" && G.used.extra) dis = true;
      if (h[0] === "remove" && wrongPool().length === 0) dis = true;
      const cost = duo ? "free" : hintCost(h) ? "🪙" + h[3] : "FREE";
      return `<button class="hint" data-h="${h[0]}" ${dis ? "disabled" : ""}>${h[1]} ${h[2]} <small>${cost}</small></button>`;
    }).join("") + (G.maxHints < 99 ? `<span class="stat" style="font-size:0.75rem">${G.maxHints - G.hints} hint${G.maxHints - G.hints === 1 ? "" : "s"} left</span>` : "");
    el.querySelectorAll("[data-h]").forEach((b) => b.addEventListener("click", () => useHint(b.dataset.h)));
  }
  const wrongPool = () => [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((c) => !G.word.includes(c) && !G.guessed.has(c) && !G.removed.has(c));
  function useHint(id) {
    if (!G || G.over || G.hints >= G.maxHints) return;
    const h = HINTS.find((x) => x[0] === id), duo = G.run.mode === "duo";
    const cost = duo ? 0 : hintCost(h);
    if (cost && S.coins < cost) { toast("Not enough coins for that hint"); SFX.miss(); return; }
    if (!duo) { if (cost) S.coins -= cost; else S.freeHints--; }
    G.hints++; G.used[id] = true; SFX.hint();
    if (id === "cat") G.showCat = true;
    else if (id === "clue") G.clue = true;
    else if (id === "reveal") {
      const hidden = letters(G.word).filter((c) => !G.guessed.has(c));
      const pick = hidden[Math.floor(Math.random() * hidden.length)];
      save(); guess(pick, true); refreshTop(); return;
    } else if (id === "remove") shuffle(wrongPool()).slice(0, 3).forEach((c) => G.removed.add(c));
    else if (id === "extra") { G.maxWrong++; toast("❤️ One more attempt!"); }
    save(); refreshTop(); update();
    if (id === "cat") $(".crumbs").innerHTML = crumbs();
  }
  function refreshTop() { const c = $("#coins"); if (c) c.textContent = "🪙 " + S.coins; }

  function guess(ch, viaHint) {
    if (!G || G.over || !/^[A-Z]$/.test(ch)) return;
    if (G.removed.has(ch)) return;
    if (G.guessed.has(ch)) { toast(`You already tried ${ch}`); return; }   // repeats never cost anything
    G.guessed.add(ch);
    const hit = G.word.includes(ch);
    if (hit) { SFX.hit(); }
    else { G.wrong.push(ch); SFX.miss(); buzz(40); const s = $("#scene"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
    if (solved()) finish(true);
    else if (G.wrong.length >= G.maxWrong) finish(false);
    else update();
    // let the tiles that just appeared animate
    if (hit) app.querySelectorAll(`.tile[data-ch="${ch}"]`).forEach((t) => { t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); });
    if (viaHint) return;
  }

  /* ---------- end of a word ---------- */
  function record(won) {
    const s = S.st;
    s.played++; s.guesses += G ? G.guessed.size : 0;
    if (G) s.catPlayed[G.w.cat] = (s.catPlayed[G.w.cat] || 0) + 1;
    if (won) {
      s.wins++; s.streak++; s.best = Math.max(s.best, s.streak); s.catWins[G.w.cat] = (s.catWins[G.w.cat] || 0) + 1;
      if (!G.hints) s.nohint++;
    } else { s.losses++; s.streak = 0; }
    save();
  }
  function finish(won) {
    G.over = true; G.won = won;
    const r = G.run, duo = r.mode === "duo";
    stopTimer();
    update();
    const sc = $("#scene");
    sc.classList.add(won ? "win" : "lose");
    $("#word").classList.toggle("win", won);
    if (won) { SFX.win(); confetti(); buzz([30, 40, 30]); } else { SFX.lose(); buzz(200); }
    let coins = 0, stars = 0, bonus = [];
    if (!duo) {
      record(won);
      if (won) {
        const left = G.maxWrong - G.wrong.length;
        coins = 10 + 2 * left + G.w.tier * 5;
        if (!G.hints) { coins += 10; bonus.push("🧠 No-hint +10"); }
        if (S.st.streak >= 3) { const b = Math.min(S.st.streak, 10) * 2; coins += b; bonus.push(`🔥 Streak ×${S.st.streak} +${b}`); }
        stars = G.wrong.length <= 2 ? 3 : G.wrong.length <= 4 ? 2 : 1;
        S.coins += coins;
        if (S.st.streak % 3 === 0) { S.freeHints++; bonus.push("💡 Free hint earned"); }
        save();
        award("first");
        if (S.st.wins >= 100) award("master");
        if (!G.wrong.length) award("perfect");
        if (S.st.streak >= 10) award("streak10");
        if (S.st.nohint >= 10) award("brain");
        if (G.word.replace(/[^A-Z]/g, "").length >= 12) award("long");
        if (S.coins >= 500) award("rich");
      }
    }
    G.res = { coins, stars, bonus };
    setTimeout(() => onWordEnd(won), won ? 1100 : 1700);
  }

  /* ---------- mode flow after each word ---------- */
  function resultCard(won, extraHTML, buttons) {
    const R = G.res;
    const msgs = won ? ["Nailed it!", "Brilliant!", "Word wizard!", "Too easy!", "Spot on!"] : ["Splosh! Into the jelly.", "So close!", "The jelly wins this time.", "Next one's yours!"];
    const m = msgs[Math.floor(Math.random() * msgs.length)];
    openModal(`<div class="res"><div class="big">${won ? "🥳" : "🫠"}</div><h2>${m}</h2>
      <p class="muted" style="margin:0">The word was</p><div class="theword">${esc(G.word)}</div>
      ${G.w.clue ? `<p class="muted" style="margin:2px 0 6px">${esc(G.w.clue)}</p>` : ""}
      ${won && R.stars ? `<div class="stars">${"★".repeat(R.stars)}${"☆".repeat(3 - R.stars)}</div>` : ""}
      ${R.coins ? `<div class="reward"><span class="chip">🪙 +${R.coins}</span>${R.bonus.map((b) => `<span class="chip">${b}</span>`).join("")}</div>` : ""}
      ${extraHTML || ""}
      <div class="row">${buttons.map((b, i) => `<button class="btn ${b.cls || ""}" data-b="${i}" ${b.primary ? "data-primary" : ""}>${b.label}</button>`).join("")}</div></div>`, (c) => {
      buttons.forEach((b, i) => c.querySelector(`[data-b="${i}"]`).addEventListener("click", () => { SFX.click(); closeModal(); b.fn(); }));
    });
    if (won && R.coins) SFX.coin();
  }
  const menuBtn = { label: "🏠 Menu", fn: () => go(home) };

  function onWordEnd(won) {
    if (!G) return;
    const r = G.run;
    if (r.mode === "classic") {
      if (won) {
        r.stars.push(G.res.stars);
        if (r.round + 1 < ROUNDS) return resultCard(true, `<p>Round ${r.round + 1} of ${ROUNDS} cleared</p>`, [menuBtn, { label: "Next Round ▶", cls: "primary", primary: true, fn: () => playClassic(r, r.round + 1) }]);
        const st = Math.round(r.stars.reduce((a, b) => a + b, 0) / r.stars.length);
        S.stars[r.level] = Math.max(S.stars[r.level] || 0, st);
        if (r.level === S.level && S.level < LEVELS) S.level++;
        if (r.level >= 40) award("expert");
        save();
        const last = r.level + 1 >= LEVELS;
        return resultCard(true, `<p><b>Level ${r.level + 1} complete!</b> ${last ? "You've beaten every level! 🏆" : ""}</p>`, [{ label: "🗺️ Levels", fn: () => go(levels) }, last ? menuBtn : { label: "Next Level ▶", cls: "primary", primary: true, fn: () => startClassic(r.level + 1, 0) }]);
      }
      return resultCard(false, `<p class="muted">Try the round again — a new attempt costs nothing.</p>`, [menuBtn, { label: "↻ Play Again", cls: "primary", primary: true, fn: () => playClassic(r, r.round) }]);
    }
    if (r.mode === "duo") {
      if (won) r.pts[r.guesser]++; else r.pts[1 - r.guesser]++;
      r.guesser = 1 - r.guesser;
      return resultCard(won, `<p>${esc(r.names[0])} <b>${r.pts[0]}</b> : <b>${r.pts[1]}</b> ${esc(r.names[1])}</p><p class="muted">Now ${esc(r.names[1 - r.guesser])} hides a word for ${esc(r.names[r.guesser])}.</p>`, [menuBtn, { label: "Swap & Play ▶", cls: "primary", primary: true, fn: () => duoWord(r) }]);
    }
    if (r.mode === "daily") {
      if (won) r.score++;
      r.idx++;
      if (r.idx < 5) return resultCard(won, `<p>Daily score: <b>${r.score}/5</b></p>`, [{ label: "Next Word ▶", cls: "primary", primary: true, fn: () => nextDaily(r) }]);
      return endDaily(r, won);
    }
    if (r.mode === "timed") {
      if (won) { r.count++; r.score++; } else toast("It was " + G.word);
      return nextRun(r);   // straight on to the next word while the clock runs
    }
    // endless, survival, category: a loss ends the run
    if (won) {
      r.count++; r.score = r.count;
      if (r.mode === "category" && r.count >= 10) {
        S.ach["cat_" + r.cat] = 1; award("catexp"); S.coins += 50; save();
        return resultCard(true, `<p><b>Category cleared! 🏅</b> +50 bonus coins</p>`, [{ label: "🗂️ Categories", fn: () => go(cats) }, { label: "Play Again", cls: "primary", primary: true, fn: () => startRun("category", { cat: r.cat }) }]);
      }
      if (r.mode === "endless" && r.count >= 15) award("marathon");
      if (r.mode === "survival" && r.count >= 9) award("survivor");
      return resultCard(true, `<p>Run score: <b>${r.count}</b></p>`, [{ label: "🏁 Stop here", fn: () => endRun(r) }, { label: "Next Word ▶", cls: "primary", primary: true, fn: () => nextRun(r) }]);
    }
    endRun(r, true);
  }

  /* ---------- classic ---------- */
  function startClassic(level, round) { go(() => playClassic({ mode: "classic", level, round, stars: [] }, round)); }
  function playClassic(r, round) {
    r.round = round; if (round === 0) r.stars = [];
    const w = levelWords(r.level)[round];
    const t = w.tier;
    // the category is a free hint early on; later tiers make you earn it
    newRound(r, w, { showCat: t <= 2, showClue: t === 0 });
  }

  /* ---------- runs: timed / endless / survival / category ---------- */
  function startRun(mode, o) {
    go(() => {
      const r = Object.assign({ mode, count: 0, score: 0 }, o);
      if (mode === "timed") r.end = Date.now() + 120000;
      nextRun(r);
    });
  }
  function nextRun(r) {
    let w, opts = {};
    if (r.mode === "timed") { w = randomWord(Math.min(4, Math.floor(r.count / 3)), null); opts = { showClue: true }; }
    else if (r.mode === "endless") { w = randomWord(Math.min(4, Math.floor(r.count / 3)), null); }
    else if (r.mode === "category") { w = randomWord(Math.floor(r.count / 2), r.cat); opts = { showClue: r.count < 2 }; }
    else if (r.mode === "survival") { w = randomWord(Math.min(4, 1 + Math.floor(r.count / 2)), null); opts = { attempts: Math.max(4, 8 - Math.floor(r.count / 2)), maxHints: 1 }; }
    save();
    newRound(r, w, opts);
    if (r.mode === "timed" && Date.now() >= r.end) endTimed();
  }
  function endTimed() {
    const r = G.run;
    if (G.timeout && !G.won) { /* the word in progress doesn't count against you */ }
    S.st.bestTimed = Math.max(S.st.bestTimed, r.score);
    if (r.score >= 5) award("speedy");
    const coins = r.score * 3; S.coins += coins; save();
    openModal(`<div class="res"><div class="big">⏱️</div><h2>Time's up!</h2><p class="muted">The last word was <b>${esc(G.word)}</b></p>
      <div class="theword">${r.score} word${r.score === 1 ? "" : "s"}</div><p class="muted">Best: ${S.st.bestTimed}</p>
      <div class="reward"><span class="chip">🪙 +${coins} time bonus</span></div>
      <div class="row"><button class="btn" id="m">🏠 Menu</button><button class="btn primary" id="a" data-primary>↻ Play Again</button></div></div>`, (c) => {
      c.querySelector("#m").onclick = () => go(home);
      c.querySelector("#a").onclick = () => startRun("timed", {});
    });
  }
  function endRun(r, lostWord) {
    const key = { endless: "bestEndless", survival: "bestSurvival" }[r.mode];
    if (key) S.st[key] = Math.max(S.st[key], r.count);
    save();
    const name = { endless: "Endless", survival: "Survival", category: "Category Challenge" }[r.mode];
    const R = G && G.res;
    openModal(`<div class="res"><div class="big">${lostWord ? "🫠" : "🏁"}</div><h2>${name} over</h2>
      ${lostWord ? `<p class="muted" style="margin:0">The word was</p><div class="theword">${esc(G.word)}</div>` : ""}
      <p>You solved <b>${r.count}</b> word${r.count === 1 ? "" : "s"}${key ? ` · Best ${S.st[key]}` : ""}</p>
      ${R && R.coins ? `<div class="reward"><span class="chip">🪙 +${R.coins}</span></div>` : ""}
      <div class="row"><button class="btn" id="m">🏠 Menu</button><button class="btn primary" id="a" data-primary>↻ Play Again</button></div></div>`, (c) => {
      c.querySelector("#m").onclick = () => go(home);
      c.querySelector("#a").onclick = () => startRun(r.mode, r.cat ? { cat: r.cat } : {});
    });
  }

  /* ---------- daily ---------- */
  function startDaily() {
    const d = today();
    if (S.daily.date === d) {
      return go(() => { home(); openModal(`<div class="res"><div class="big">📅</div><h2>Daily done!</h2><p>You scored <b>${S.daily.score}/5</b> today.</p><p class="muted">Streak: ${S.daily.streak} day${S.daily.streak === 1 ? "" : "s"}. New words arrive tomorrow.</p><div class="row"><button class="btn primary" id="ok" data-primary>OK</button></div></div>`, (c) => { c.querySelector("#ok").onclick = closeModal; }); });
    }
    go(() => nextDaily({ mode: "daily", idx: 0, score: 0, words: dailyWords(d) }));
  }
  function nextDaily(r) { newRound(r, r.words[r.idx], { showCat: true, showClue: r.idx < 2 }); }
  function endDaily(r, won) {
    const d = today();
    S.daily.streak = S.daily.last && dayDiff(S.daily.last, d) === 1 ? S.daily.streak + 1 : 1;
    S.daily.last = d; S.daily.date = d; S.daily.score = r.score;
    const bonus = r.score * 10 + (r.score === 5 ? 25 : 0); S.coins += bonus; save();
    if (S.daily.streak >= 3) award("daily3");
    resultCard(won, `<p><b>Daily complete: ${r.score}/5</b> · 🔥 ${S.daily.streak}-day streak</p><div class="reward"><span class="chip">🪙 +${bonus} daily bonus</span></div>`, [{ label: "🏠 Menu", cls: "primary", primary: true, fn: () => go(home) }]);
  }

  /* ---------- two-player ---------- */
  function duoSetup() {
    go(() => {
      app.innerHTML = `<section class="screen">${backBtn("modes")}<h2 class="title">👥 Two-Player</h2>
        <div class="panel"><p class="muted">Take turns: one player secretly types a word, the other guesses it. A solved word scores for the guesser, a failed one for the word-setter.</p>
        <div class="field"><label for="p1">Player 1</label><input id="p1" maxlength="14" value="Player 1"></div>
        <div class="field"><label for="p2">Player 2</label><input id="p2" maxlength="14" value="Player 2"></div>
        <button class="btn primary" id="go" data-primary>Start ▶</button></div></section>`;
      bindNav();
      $("#go").onclick = () => { award("party"); duoWord({ mode: "duo", names: [$("#p1").value.trim() || "Player 1", $("#p2").value.trim() || "Player 2"], pts: [0, 0], guesser: 1 }); };
    });
  }
  function duoWord(r) {
    stopTimer(); G = null;
    const setter = r.names[1 - r.guesser];
    app.innerHTML = `<section class="screen">${backBtn("modes")}<h2 class="title">🤫 ${esc(setter)}, hide a word</h2>
      <div class="panel"><p class="muted">${esc(r.names[r.guesser])}, look away! Letters, spaces and hyphens only, at least 3 letters.</p>
      <div class="field"><label for="sw">Secret word or phrase</label><input id="sw" type="password" autocomplete="off" maxlength="30" spellcheck="false"></div>
      <label class="row"><input type="checkbox" id="peek"> show while typing</label>
      <div class="field"><label for="sc">Clue (optional)</label><input id="sc" maxlength="60" autocomplete="off"></div>
      <div class="field"><label for="sa">Attempts</label><input id="sa" type="number" min="4" max="10" value="7"></div>
      <button class="btn primary" id="hide" data-primary>Hide it & hand over ▶</button></div></section>`;
    bindNav();
    $("#peek").onchange = (e) => { $("#sw").type = e.target.checked ? "text" : "password"; };
    $("#sw").focus();
    const submit = () => {
      const raw = $("#sw").value.toUpperCase().replace(/\s+/g, " ").trim();
      if (!/^[A-Z][A-Z -]*[A-Z]$/.test(raw) || /[ -]{2,}/.test(raw)) return toast("Use letters, single spaces or hyphens only");
      if (raw.replace(/[^A-Z]/g, "").length < 3) return toast("Pick something with at least 3 letters");
      const att = Math.max(4, Math.min(10, +$("#sa").value || 7));
      newRound(r, { word: raw, clue: $("#sc").value.trim(), cat: "gk", tier: null }, { attempts: att, showCat: false, showClue: false, maxHints: 2 });
      $(".crumbs").innerHTML = `Two-Player · ${esc(r.names[r.guesser])} guesses ${esc(setter)}'s word`;
    };
    $("#hide").onclick = submit;
    app.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
  }

  /* ---------- physical keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!modal.hidden) { if (e.key === "Escape" && modal.dataset.soft) closeModal(); return; }
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (G && !G.over && /^[a-z]$/i.test(e.key)) { e.preventDefault(); const k = e.key.toUpperCase(); const b = app.querySelector(`.key[data-key="${k}"]`); if (b) { b.classList.add("press"); setTimeout(() => b.classList.remove("press"), 120); } guess(k); }
  });

  // debug hook for tests
  window.HMG = { get G() { return G; }, get S() { return S; }, guess, useHint, startClassic, startRun, startDaily, go, SCREENS, levelWords, dailyWords };
  go(home);
})();
