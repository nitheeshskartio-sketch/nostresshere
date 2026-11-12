/* ============ Pop It — No Stress Here ============ */
(function () {
  "use strict";

  /* ---------- storage helpers ---------- */
  function read(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  /* ---------- shapes (X = bubble, . = empty) ---------- */
  var SHAPES = {
    square: {
      label: "Square", icon: "🟪",
      rows: ["XXXXXX", "XXXXXX", "XXXXXX", "XXXXXX", "XXXXXX", "XXXXXX"]
    },
    heart: {
      label: "Heart", icon: "💗",
      rows: [".XX...XX.", "XXXX.XXXX", "XXXXXXXXX", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X...."]
    },
    circle: {
      label: "Circle", icon: "🟠",
      rows: ["..XXXX..", ".XXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX.."]
    },
    smiley: {
      label: "Smiley", icon: "🙂",
      rows: ["..XXXXX..", ".XXXXXXX.", "XX.XXX.XX", "XX.XXX.XX", "XXXXXXXXX", "X.XXXXX.X", "XX.....XX", ".XXXXXXX.", "..XXXXX.."]
    },
    long: {
      label: "Mega", icon: "📏",
      rows: ["XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX"]
    }
  };

  /* ---------- color palettes ---------- */
  function byRow(list) {
    return function (r, c, rows) { return list[Math.min(list.length - 1, Math.floor((r * list.length) / rows))]; };
  }
  var PALETTES = {
    rainbow: { label: "Rainbow", sw: "conic-gradient(#ff6b6b,#ffd43b,#69db7c,#4dabf7,#845ef7,#ff6b6b)",
      color: byRow(["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#845ef7", "#f783ac"]) },
    pastel: { label: "Pastel", sw: "conic-gradient(#ffb3c1,#fdffb6,#caffbf,#9bf6ff,#bdb2ff,#ffb3c1)",
      color: byRow(["#ffb3c1", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff"]) },
    candy: { label: "Candy", sw: "linear-gradient(90deg,#ff8fc8 50%,#7fd8ff 50%)",
      color: function (r, c) { return (r + c) % 2 ? "#7fd8ff" : "#ff8fc8"; } },
    mint: { label: "Mint", sw: "#6fe0bf",
      color: function () { return "#6fe0bf"; } },
    galaxy: { label: "Galaxy", sw: "linear-gradient(135deg,#5b4bdb,#d65bd6)",
      color: function (r, c, rows) { return "hsl(" + Math.round(248 + (r / Math.max(1, rows - 1)) * 62) + " 62% 58%)"; } }
  };

  /* ---------- funny copy ---------- */
  var QUIPS = [
    "Pop goes the anxiety. 🫧",
    "Your thumb is now a certified stress surgeon.",
    "That bubble had it coming.",
    "Scientists confirm: popping is 40% cheaper than therapy. (We are not scientists.)",
    "Somewhere, an unread email just lost its power over you.",
    "Wow. Such pop. Very calm.",
    "If stress were bubbles, you'd be done by now.",
    "Your productivity is down. Your vibes are up. Good trade.",
    "This is the most important work you'll do today.",
    "Mind: blank. Thumb: busy. Perfect.",
    "Fun fact: you can't be mad while going 'pop pop pop'. Try it.",
    "The bubbles don't judge you. They just go pop.",
    "Inhale… pop… exhale… pop.",
    "Achievement unlocked: did a thing that didn't matter, and it felt great."
  ];
  var FLIP_QUIPS = [
    "Flipped! Look, they all came back. Like your will to live. 🌱",
    "New side, new you.",
    "And so, the cycle continues. Beautiful.",
    "Infinite bubbles. Infinite peace. Infinite thumbs (hopefully).",
    "Plot twist: the bubbles were inside you all along."
  ];
  var MILESTONES = {
    100: "100 lifetime pops! Your thumb sends its regards. 👍",
    500: "500 pops! You are now 50% bubble.",
    1000: "1,000 pops!! Legend. Absolute legend. 🏆",
    2500: "2,500 pops. At this point, you ARE the pop it.",
    5000: "5,000 pops. We're running out of things to say. Keep going. 🫠",
    10000: "10,000 pops. Please drink some water."
  };

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var board = $("board"), boardFlip = $("boardFlip"), stage = document.querySelector(".stage");
  var flipBtn = $("flipBtn"), comboLayer = $("combo"), toastEl = $("toast");
  var elPops = $("sessionPops"), elFlips = $("flips"), elLifetime = $("lifetime");
  var meter = $("meter"), meterFill = $("meterFill"), stressText = $("stressText"), stressEmoji = $("stressEmoji");
  var soundBtn = $("soundBtn"), hapticBtn = $("hapticBtn"), resetBtn = $("resetBtn");

  /* ---------- state ---------- */
  var state = {
    shape: SHAPES[read("nsh-popit-shape", "")] ? read("nsh-popit-shape") : "square",
    palette: PALETTES[read("nsh-popit-palette", "")] ? read("nsh-popit-palette") : "rainbow",
    sound: read("nsh-popit-sound", "1") === "1",
    haptic: read("nsh-popit-haptic", "1") === "1",
    pops: 0,
    flips: 0,
    lifetime: parseInt(read("nsh-popit-lifetime", "0"), 10) || 0,
    flipping: false
  };
  var bubbles = [];
  var cols = 0;

  /* =========================================================
     SOUND — synthesized so it works offline, no audio files
     ========================================================= */
  var actx = null, master = null, noiseBuf = null;

  function audio() {
    if (!actx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      actx = new Ctx();
      master = actx.createGain();
      master.gain.value = 0.7;
      var comp = actx.createDynamicsCompressor();
      master.connect(comp).connect(actx.destination);
      noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.5), actx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  // The "pok" of silicone: a quick pitch-dropping thump + a tiny airy click.
  function popSound(down, volume) {
    if (!state.sound) return;
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime;
    var v = volume == null ? 1 : volume;
    var r = 0.88 + Math.random() * 0.24; // every bubble sounds slightly different

    // body thump
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime((down ? 560 : 330) * r, t);
    o.frequency.exponentialRampToValueAtTime((down ? 150 : 95) * r, t + (down ? 0.05 : 0.08));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((down ? 0.6 : 0.45) * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (down ? 0.1 : 0.14));
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.16);

    // second harmonic for a rubbery "boing" edge
    var o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime((down ? 1100 : 700) * r, t);
    o2.frequency.exponentialRampToValueAtTime((down ? 300 : 220) * r, t + 0.04);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o2.connect(g2).connect(master);
    o2.start(t);
    o2.stop(t + 0.06);

    // click of air
    var n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = (down ? 2600 : 1600) * r;
    bp.Q.value = 1.2;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime((down ? 0.45 : 0.25) * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    n.connect(bp).connect(ng).connect(master);
    n.start(t, Math.random() * 0.4, 0.03);
  }

  function whooshSound() {
    if (!state.sound) return;
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime;
    var n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.3);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(bp).connect(g).connect(master);
    n.start(t, 0, 0.5);
    // soft "slap" as it lands
    setTimeout(function () { popSound(false, 0.6); }, 380);
  }

  function buzz(ms) {
    if (state.haptic && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  /* =========================================================
     BOARD
     ========================================================= */
  function cellSize() {
    var avail = Math.min(stage.clientWidth || window.innerWidth, 640) - 8;
    return Math.max(32, Math.min(64, Math.floor(avail / cols)));
  }

  function build() {
    var shape = SHAPES[state.shape];
    var pal = PALETTES[state.palette];
    var grid = shape.rows;
    var rows = grid.length;
    cols = grid[0].length;
    var filled = function (r, c) { return r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === "X"; };

    board.innerHTML = "";
    bubbles = [];
    board.style.setProperty("--cols", cols);
    board.style.setProperty("--cell", cellSize() + "px");

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var tile = document.createElement("div");
        tile.className = "tile";
        if (!filled(r, c)) {
          tile.classList.add("empty");
          board.appendChild(tile);
          continue;
        }
        tile.style.setProperty("--c", pal.color(r, c, rows, cols));
        // round the outside corners so the board looks molded, not blocky
        var up = filled(r - 1, c), dn = filled(r + 1, c), lf = filled(r, c - 1), rt = filled(r, c + 1);
        if (!up && !lf) tile.classList.add("r-tl");
        if (!up && !rt) tile.classList.add("r-tr");
        if (!dn && !lf) tile.classList.add("r-bl");
        if (!dn && !rt) tile.classList.add("r-br");

        var b = document.createElement("button");
        b.type = "button";
        b.className = "bubble";
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Bubble row " + (r + 1) + ", column " + (c + 1));
        tile.appendChild(b);
        board.appendChild(tile);
        bubbles.push(b);
      }
    }
    flipBtn.hidden = true;
  }

  function restartAnim(el, cls) {
    el.classList.remove("anim-down", "anim-up");
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function setPressed(b, pressed) {
    b.classList.toggle("pressed", pressed);
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
  }

  /* ---------- the main action ---------- */
  var lastPop = 0, combo = 0;

  function press(b, point, forceDown) {
    if (state.flipping) return;
    var isDown = b.classList.contains("pressed");
    var down = forceDown == null ? !isDown : forceDown;
    if (down === isDown) return;

    setPressed(b, down);
    restartAnim(b, down ? "anim-down" : "anim-up");
    popSound(down);
    buzz(down ? 14 : 8);

    if (down) {
      var puff = document.createElement("span");
      puff.className = "puff";
      b.parentNode.appendChild(puff);
      setTimeout(function () { puff.remove(); }, 420);
    }

    boardFlip.classList.remove("jiggle");
    void boardFlip.offsetWidth;
    boardFlip.classList.add("jiggle");

    countPop(point);
    checkCleared();
  }

  function countPop(point) {
    state.pops++;
    state.lifetime++;
    write("nsh-popit-lifetime", state.lifetime);

    elPops.textContent = state.pops.toLocaleString();
    elPops.classList.remove("bump");
    void elPops.offsetWidth;
    elPops.classList.add("bump");
    renderStress();
    renderLifetime();

    // combos for speedy poppers
    var now = performance.now();
    combo = now - lastPop < 260 ? combo + 1 : 1;
    lastPop = now;
    if (combo >= 5 && combo % 5 === 0) {
      var words = ["Combo", "Nice", "Wow", "Pop frenzy", "Thumb of fury", "UNSTOPPABLE"];
      floatText(words[Math.min(words.length - 1, combo / 5 - 1)] + " ×" + combo + "!", point);
    }

    if (MILESTONES[state.lifetime]) {
      toast(MILESTONES[state.lifetime]);
    } else if (state.pops === 1) {
      toast("First pop of the session! Feel that? That's peace. 🫧");
    } else if (state.pops % 25 === 0) {
      toast(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
    }
  }

  function checkCleared() {
    var all = bubbles.every(function (b) { return b.classList.contains("pressed"); });
    if (all && flipBtn.hidden) {
      flipBtn.hidden = false;
      toast("Side cleared! 🎉 Flip it over and keep going.");
    } else if (!all) {
      flipBtn.hidden = true;
    }
  }

  function flip() {
    if (state.flipping) return;
    state.flipping = true;
    flipBtn.hidden = true;
    whooshSound();
    buzz([10, 40, 20]);
    boardFlip.classList.remove("jiggle", "flipping");
    void boardFlip.offsetWidth;
    boardFlip.classList.add("flipping");
    // halfway through the spin, the other side (all bubbles up) faces you
    setTimeout(function () {
      bubbles.forEach(function (b) { setPressed(b, false); b.classList.remove("anim-down", "anim-up"); });
    }, 330);
    setTimeout(function () {
      boardFlip.classList.remove("flipping");
      state.flipping = false;
      state.flips++;
      elFlips.textContent = state.flips.toLocaleString();
      toast(FLIP_QUIPS[(state.flips - 1) % FLIP_QUIPS.length]);
    }, 720);
  }

  function unpopAll() {
    if (state.flipping) return;
    var pressed = bubbles.filter(function (b) { return b.classList.contains("pressed"); });
    if (!pressed.length) { toast("Nothing to un-pop. You're already perfectly un-popped."); return; }
    flipBtn.hidden = true;
    pressed.forEach(function (b, i) {
      setTimeout(function () {
        setPressed(b, false);
        restartAnim(b, "anim-up");
        if (i % 3 === 0) popSound(false, 0.5);
      }, i * 22);
    });
  }

  /* ---------- stress meter ---------- */
  function renderStress() {
    var s = 100 - state.pops; // 1 pop = 1% less stress. Science.
    var shown = Math.max(0, Math.min(100, s));
    meterFill.style.width = shown + "%";
    meter.setAttribute("aria-valuenow", shown);
    var text, emoji;
    if (s >= 90) { text = "yikes"; emoji = "😫"; }
    else if (s >= 70) { text = "tense"; emoji = "😬"; }
    else if (s >= 50) { text = "getting there"; emoji = "😐"; }
    else if (s >= 30) { text = "pretty chill"; emoji = "🙂"; }
    else if (s > 0) { text = "very chill"; emoji = "😌"; }
    else if (s > -25) { text = "ZEN ACHIEVED"; emoji = "🧘"; }
    else if (s > -75) { text = "dangerously relaxed"; emoji = "😴"; }
    else { text = "you are now a puddle"; emoji = "🫠"; }
    stressText.textContent = (s < 0 ? s : shown) + "% — " + text;
    stressEmoji.textContent = emoji;
    if (s === 0) toast("Stress: 0%. ZEN ACHIEVED. 🧘 (You can keep going, we won't stop you.)");
  }

  function renderLifetime() {
    elLifetime.textContent = "Lifetime pops on this device: " + state.lifetime.toLocaleString();
  }

  /* ---------- little UI helpers ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  function floatText(text, point) {
    var rect = stage.getBoundingClientRect();
    var x = point ? point.x - rect.left : rect.width / 2;
    var y = point ? point.y - rect.top : rect.height / 2;
    var el = document.createElement("div");
    el.className = "combo-pop";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    comboLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, 950);
  }

  /* =========================================================
     INPUT — tap, drag-to-pop, keyboard
     ========================================================= */
  var dragging = false, dragDown = true, visited = new Set();

  function bubbleAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var b = el && el.closest ? el.closest(".bubble") : null;
    return b && board.contains(b) ? b : null;
  }

  board.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    audio(); // unlock audio on first touch
    dragging = true;
    visited.clear();
    var b = bubbleAt(e.clientX, e.clientY);
    // a drag keeps doing whatever the first press did (pushing in or popping out)
    dragDown = b ? !b.classList.contains("pressed") : true;
    if (b) {
      visited.add(b);
      press(b, { x: e.clientX, y: e.clientY });
    }
  });

  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var b = bubbleAt(e.clientX, e.clientY);
    if (b && !visited.has(b)) {
      visited.add(b);
      press(b, { x: e.clientX, y: e.clientY }, dragDown);
    }
  });

  function endDrag() { dragging = false; visited.clear(); }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("blur", endDrag);

  // keyboard (Enter / Space on a focused bubble produces a click with detail 0)
  board.addEventListener("click", function (e) {
    if (e.detail !== 0) return;
    var b = e.target.closest(".bubble");
    if (b) press(b, null);
  });

  // arrow keys to move between bubbles
  board.addEventListener("keydown", function (e) {
    var i = bubbles.indexOf(document.activeElement);
    if (i < 0) return;
    var step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      var next = bubbles[i + step];
      if (next) next.focus();
    }
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "f" || e.key === "F") && !flipBtn.hidden && !e.metaKey && !e.ctrlKey) flip();
  });

  flipBtn.addEventListener("click", flip);
  resetBtn.addEventListener("click", unpopAll);

  /* ---------- toggles ---------- */
  function renderToggles() {
    soundBtn.setAttribute("aria-pressed", state.sound);
    soundBtn.textContent = (state.sound ? "🔊" : "🔇") + " Sound";
    hapticBtn.setAttribute("aria-pressed", state.haptic);
  }
  soundBtn.addEventListener("click", function () {
    state.sound = !state.sound;
    write("nsh-popit-sound", state.sound ? "1" : "0");
    renderToggles();
    toast(state.sound ? "Sound on. Pop responsibly." : "Silent mode. Stealth popping engaged. 🥷");
  });
  hapticBtn.addEventListener("click", function () {
    state.haptic = !state.haptic;
    write("nsh-popit-haptic", state.haptic ? "1" : "0");
    renderToggles();
    if (state.haptic) buzz(30);
    toast(state.haptic ? "Buzz on (works on phones that can buzz)." : "Buzz off.");
  });

  /* ---------- shape & color pickers ---------- */
  function makePicker(container, items, current, onPick, decorate) {
    container.innerHTML = "";
    Object.keys(items).forEach(function (key) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("role", "radio");
      chip.setAttribute("aria-checked", key === current ? "true" : "false");
      chip.dataset.key = key;
      decorate(chip, items[key]);
      chip.addEventListener("click", function () {
        container.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-checked", c === chip ? "true" : "false"); });
        onPick(key);
      });
      container.appendChild(chip);
    });
  }

  makePicker($("shapePicker"), SHAPES, state.shape, function (key) {
    state.shape = key;
    write("nsh-popit-shape", key);
    build();
  }, function (chip, s) { chip.textContent = s.icon + " " + s.label; });

  makePicker($("colorPicker"), PALETTES, state.palette, function (key) {
    state.palette = key;
    write("nsh-popit-palette", key);
    // recolor without losing which bubbles are pressed
    var pressed = bubbles.map(function (b) { return b.classList.contains("pressed"); });
    build();
    bubbles.forEach(function (b, i) { setPressed(b, pressed[i]); });
    checkCleared();
  }, function (chip, p) {
    var sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.setProperty("--sw", p.sw);
    chip.appendChild(sw);
    chip.appendChild(document.createTextNode(p.label));
  });

  /* ---------- resize ---------- */
  var resizeRaf = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () { board.style.setProperty("--cell", cellSize() + "px"); });
  });

  /* ---------- go ---------- */
  build();
  renderToggles();
  renderStress();
  renderLifetime();
})();
