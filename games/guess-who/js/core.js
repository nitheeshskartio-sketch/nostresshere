/* ============ GUESS WHO? — categories, question bank helpers, answer matching ============ */
(function () {
  "use strict";
  const G = (window.GW = window.GW || {});

  /* ---------- categories ---------- */
  G.CATS = [
    { id: "movchar", name: "Movie Characters", icon: "🎭", color: "#ff6b6b", ask: "Guess the Character!" },
    { id: "actors", name: "Actors", icon: "🕴️", color: "#4dabf7", ask: "Guess the Actor!" },
    { id: "actresses", name: "Actresses", icon: "💃", color: "#f783ac", ask: "Guess the Actress!" },
    { id: "movies", name: "Movies", icon: "🎬", color: "#fcc419", ask: "Guess the Movie!" },
    { id: "tv", name: "TV Shows & Web Series", icon: "📺", color: "#9775fa", ask: "Guess the Show!" },
    { id: "heroes", name: "Superheroes", icon: "🦸", color: "#ff922b", ask: "Guess the Superhero!" },
    { id: "cartoons", name: "Cartoon Characters", icon: "🐭", color: "#51cf66", ask: "Guess the Cartoon!" },
    { id: "anime", name: "Anime Characters", icon: "🍥", color: "#22b8cf", ask: "Guess the Anime Character!" },
    { id: "villains", name: "Villains", icon: "😈", color: "#868e96", ask: "Guess the Villain!" },
    { id: "famous", name: "Famous Personalities", icon: "🌟", color: "#e599f7", ask: "Who is it?" },
    { id: "countries", name: "Countries of the World", icon: "🌍", color: "#20c997", ask: "Guess the Country!" },
    { id: "culture", name: "World Culture", icon: "🗺️", color: "#fab005", ask: "Guess it!" }
  ];
  G.SUBS = [];   // { cat, id, name, icon, ask?, items: [entry] }
  G.ALL = [];    // every entry
  G.DIFF = ["Easy", "Medium", "Hard", "Expert"];
  /* entry rows: [answer, "alias|alias", difficulty 1-4, explanation, "clue|clue|…"]
     clues are written from vague to revealing. Calling add() again with the same
     cat + id appends to that subcategory; a repeated answer in one category is skipped. */
  const seenAns = new Set();
  G.add = function (cat, id, name, icon, rows, opts) {
    let sub = G.SUBS.find((s) => s.cat === cat && s.id === id);
    if (!sub) { sub = { cat, id, name, icon, items: [] }; G.SUBS.push(sub); }
    if (opts && opts.ask) sub.ask = opts.ask;
    const shared = opts && opts.shared; // subcategories that reuse answers from elsewhere (e.g. "guess the country by flag")
    for (const r of rows) {
      const key = cat + "|" + (shared ? id + "|" : "") + r[0].toLowerCase();
      if (seenAns.has(key)) continue;
      seenAns.add(key);
      const clues = (Array.isArray(r[4]) ? r[4] : r[4].split("|")).map((s) => s.trim()).filter(Boolean);
      if (clues.length < 3) continue;
      const e = { id: cat + "/" + id + "/" + r[0], cat, sub: id, answer: r[0], aliases: r[1] ? r[1].split("|").map((s) => s.trim()).filter(Boolean) : [], diff: Math.max(1, Math.min(4, r[2] || 2)), info: r[3], clues };
      sub.items.push(e); G.ALL.push(e);
    }
    return sub;
  };
  G.subsOf = (cat) => G.SUBS.filter((s) => s.cat === cat);
  G.catById = (id) => G.CATS.find((c) => c.id === id);
  G.subById = (cat, id) => G.SUBS.find((s) => s.cat === cat && s.id === id);

  /* =========================================================
     ANSWER MATCHING
     ========================================================= */
  const SUFFIX = new Set(["jr", "junior", "sr", "senior", "ii", "iii"]);
  const SWAP = { doctor: "dr", mister: "mr", saint: "st", and: "and", "&": "and" };
  G.norm = function (s) {
    let t = String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.replace(/&/g, " and ").replace(/['’`.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    let w = t.split(" ").filter(Boolean).map((x) => SWAP[x] || x);
    if (w[0] === "the" && w.length > 1) w = w.slice(1);
    while (w.length > 1 && SUFFIX.has(w[w.length - 1])) w.pop();
    return w.join(" ");
  };
  G.compact = (s) => G.norm(s).replace(/ /g, "");
  const raw = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  // edit distance that counts a swapped pair of letters as one typo
  function dist(a, b) {
    const n = a.length, m = b.length;
    if (!n) return m; if (!m) return n;
    const d = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1); r[0] = i; return r; });
    for (let j = 0; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[n][m];
  }
  G.dist = dist;
  G.sim = (a, b) => (!a.length && !b.length ? 1 : 1 - dist(a, b) / Math.max(a.length, b.length));
  const candCache = new Map();
  function cands(e) {
    let c = candCache.get(e.id);
    // normalised forms plus plain lower-case spellings (so "doctor" and "dr" both work)
    if (!c) { const names = [e.answer].concat(e.aliases); c = [...new Set(names.map(G.compact).concat(names.map(raw)).filter(Boolean))]; candCache.set(e.id, c); }
    return c;
  }
  G.cands = cands;
  // how well does the guess fit an entry? 1 = exact
  function score(guess, e, rawGuess) { let best = 0; for (const c of cands(e)) { const s = c === guess || c === rawGuess ? 1 : Math.max(G.sim(guess, c), rawGuess ? G.sim(rawGuess, c) : 0); if (s > best) best = s; } return best; }
  // short names must be spelt (almost) exactly; longer names may have a typo or two
  function allowed(len, threshold) {
    if (len <= 4) return 1;
    if (len <= 6) return Math.max(threshold, 0.83);
    return threshold;
  }
  G.threshold = 0.85;
  /* returns { ok, exact, ambiguous, near } */
  G.check = function (input, target) {
    const g = G.compact(input), gr = raw(input);
    if (!g) return { ok: false, empty: true };
    const mine = score(g, target, gr);
    // the best fit among the *other* answers of the same kind (a movie question isn't blocked by a character's name)
    let other = 0, otherName = null;
    const tn = G.compact(target.answer);
    // subcategories that ask their own kind of question (capital, currency, food…) only compete with themselves
    const own = G.subById(target.cat, target.sub), solo = own && own.ask;
    for (const e of G.ALL) {
      if (e === target || e.cat !== target.cat || (solo && e.sub !== target.sub) || G.compact(e.answer) === tn) continue;
      const s = score(g, e, gr);
      if (s > other) { other = s; otherName = e.answer; }
    }
    if (mine === 1) {
      // an exact alias that's equally an exact name for someone else is too vague (e.g. just "Jack")
      if (g !== G.compact(target.answer) && gr !== raw(target.answer) && other === 1) return { ok: false, ambiguous: true, other: otherName };
      return { ok: true, exact: true };
    }
    const need = allowed(g.length, G.threshold);
    if (mine >= need) {
      // it looks like our answer, but is it closer (or just as close) to a different name?
      if (other >= mine - 0.02) return { ok: false, ambiguous: true, other: otherName };
      return { ok: true, exact: false };
    }
    return { ok: false, near: mine >= need - 0.12 };
  };

  /* ---------- pick 3 clues: random, never repeated, kept in vague → revealing order ---------- */
  G.pickClues = function (e, rnd, expert) {
    rnd = rnd || Math.random;
    const idx = e.clues.map((_, i) => i);
    // expert rounds draw from the vaguer clues only
    const pool = expert && idx.length > 4 ? idx.slice(0, idx.length - 1) : idx;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 3).sort((a, b) => a - b).map((i) => e.clues[i]);
  };
  G.rng = function (seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  G.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
})();
