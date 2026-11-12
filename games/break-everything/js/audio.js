/* ============ BREAK EVERYTHING — synthesized sounds (no audio files) ============ */
(function () {
  "use strict";
  const BE = (window.BE = window.BE || {});
  const A = (BE.audio = { on: true });
  const R = (a, b) => a + Math.random() * (b - a);
  let ctx = null, master, noiseBuf;
  let recent = 0, recentT = 0;

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  A.unlock = init;
  const ok = () => A.on && init() && ctx.state !== "closed";
  // stops a pile-up of sounds when lots of things break at once
  function budget(n) { const t = performance.now(); if (t - recentT > 120) { recent = 0; recentT = t; } recent += n || 1; return recent < 9; }

  function noise(t, dur, { type = "bandpass", f = 2000, f2, q = 1, vol = 0.4, attack = 0.002, out } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(out || master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  }
  function tone(t, dur, { type = "sine", f = 440, f2, vol = 0.3, attack = 0.003, out } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out || master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  /* ---------- breaking sounds per material ---------- */
  const BREAK = {
    glass(t, k) {
      noise(t, 0.35, { type: "highpass", f: 3500, vol: 0.45 * k });
      noise(t, 0.12, { f: 1800, q: 0.8, vol: 0.35 * k });
      for (let i = 0; i < 9; i++) tone(t + R(0, 0.45) + i * 0.02, R(0.08, 0.25), { f: R(2600, 7000), vol: R(0.04, 0.12) * k });
    },
    ceramic(t, k) {
      noise(t, 0.2, { f: 2400, q: 1.2, vol: 0.45 * k });
      tone(t, 0.1, { type: "triangle", f: 220, f2: 90, vol: 0.3 * k });
      for (let i = 0; i < 6; i++) tone(t + R(0.02, 0.35), R(0.05, 0.14), { f: R(1200, 3200), vol: R(0.05, 0.12) * k });
    },
    wood(t, k) {
      noise(t, 0.09, { f: 1300, q: 1.5, vol: 0.6 * k, attack: 0.001 });
      tone(t, 0.18, { type: "triangle", f: 140, f2: 60, vol: 0.45 * k });
      for (let i = 0; i < 5; i++) noise(t + R(0.03, 0.3), 0.04, { f: R(800, 2500), q: 3, vol: 0.18 * k });
    },
    plastic(t, k) {
      tone(t, 0.12, { type: "triangle", f: R(380, 520), f2: 160, vol: 0.4 * k });
      noise(t, 0.12, { f: 1500, q: 2, vol: 0.3 * k });
      for (let i = 0; i < 3; i++) tone(t + R(0.05, 0.3), 0.06, { type: "triangle", f: R(500, 900), vol: 0.1 * k });
    },
    cardboard(t, k) {
      for (let i = 0; i < 10; i++) noise(t + i * 0.025 + R(0, 0.02), 0.06, { type: "lowpass", f: R(1500, 3500), vol: R(0.12, 0.3) * k });
      tone(t, 0.15, { f: 110, f2: 60, vol: 0.3 * k });
    },
    inflatable(t, k) {
      noise(t, 0.18, { type: "lowpass", f: 5000, f2: 400, vol: 0.9 * k, attack: 0.001 });
      tone(t, 0.25, { f: 210, f2: 50, vol: 0.5 * k });
      noise(t + 0.05, 0.4, { f: 600, f2: 200, q: 4, vol: 0.15 * k });
    },
    cake(t, k) {
      noise(t, 0.25, { type: "lowpass", f: 900, f2: 200, vol: 0.55 * k });
      tone(t, 0.2, { f: 260, f2: 90, vol: 0.25 * k });
    },
    metal(t, k) {
      for (const [m, v] of [[1, 0.25], [2.76, 0.15], [5.4, 0.08], [8.9, 0.05]]) tone(t, R(0.5, 0.9), { f: 330 * m, vol: v * k });
      noise(t, 0.05, { f: 4000, vol: 0.3 * k });
    }
  };
  A.breakSound = function (mat, k) {
    if (!ok() || !budget(2)) return;
    (BREAK[mat] || BREAK.plastic)(ctx.currentTime + 0.005, Math.min(1.3, k || 1));
  };
  /* small knock when something is hit but doesn't break */
  A.knock = function (mat, k) {
    if (!ok() || !budget(1)) return;
    const t = ctx.currentTime; k = Math.min(1, Math.max(0.15, k));
    if (mat === "glass") { tone(t, 0.25, { f: R(1800, 2600), vol: 0.18 * k }); tone(t, 0.18, { f: R(3600, 5000), vol: 0.08 * k }); }
    else if (mat === "ceramic") { tone(t, 0.12, { f: R(900, 1400), vol: 0.2 * k }); noise(t, 0.04, { f: 2000, vol: 0.2 * k }); }
    else if (mat === "wood") { tone(t, 0.12, { type: "triangle", f: R(160, 240), f2: 90, vol: 0.4 * k }); noise(t, 0.04, { f: 900, vol: 0.25 * k }); }
    else if (mat === "inflatable") { tone(t, 0.2, { f: R(140, 200), f2: 80, vol: 0.4 * k }); }
    else if (mat === "cardboard") { noise(t, 0.08, { type: "lowpass", f: 900, vol: 0.4 * k }); }
    else if (mat === "metal") { tone(t, 0.4, { f: R(600, 900), vol: 0.15 * k }); tone(t, 0.3, { f: R(1600, 2400), vol: 0.07 * k }); }
    else if (mat === "cake") { noise(t, 0.1, { type: "lowpass", f: 500, vol: 0.4 * k }); }
    else { tone(t, 0.08, { type: "triangle", f: R(300, 450), f2: 150, vol: 0.3 * k }); noise(t, 0.04, { f: 1500, vol: 0.15 * k }); }
  };
  A.tinkle = function (n) {
    if (!ok()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < (n || 5); i++) tone(t + R(0.1, 0.9), R(0.05, 0.12), { f: R(3000, 7000), vol: R(0.02, 0.06) });
  };
  A.whoosh = function (k) {
    if (!ok() || !budget(1)) return;
    noise(ctx.currentTime, 0.22, { f: 400, f2: 2200, q: 2, vol: 0.12 * (k || 1), attack: 0.08 });
  };
  A.thud = function (k) {
    if (!ok() || !budget(1)) return;
    const t = ctx.currentTime;
    tone(t, 0.25, { f: 90, f2: 40, vol: 0.5 * Math.min(1, k) });
    noise(t, 0.12, { type: "lowpass", f: 700, vol: 0.3 * Math.min(1, k) });
  };
  A.explosion = function (k) {
    if (!ok()) return;
    const t = ctx.currentTime; k = k || 1;
    noise(t, 1.6, { type: "lowpass", f: 3000, f2: 120, vol: 0.9 * k, attack: 0.004 });
    tone(t, 0.9, { f: 110, f2: 28, vol: 0.8 * k });
    noise(t + 0.08, 1.2, { f: 300, f2: 80, q: 0.7, vol: 0.4 * k });
  };
  A.splash = function () {
    if (!ok()) return;
    const t = ctx.currentTime;
    noise(t, 0.35, { f: 1600, f2: 500, q: 1.5, vol: 0.5 });
    for (let i = 0; i < 6; i++) tone(t + R(0.05, 0.4), 0.05, { f: R(900, 2000), f2: 2600, vol: 0.06 });
  };
  A.boing = function () {
    if (!ok() || !budget(1)) return;
    tone(ctx.currentTime, 0.3, { f: 180, f2: 600, vol: 0.2, type: "triangle" });
  };
  A.hydraulic = function (dur) {
    if (!ok()) return;
    const t = ctx.currentTime;
    noise(t, dur, { f: 4000, q: 0.5, vol: 0.12, attack: 0.1 });
    tone(t, dur, { type: "sawtooth", f: 55, f2: 70, vol: 0.12, attack: 0.1 });
  };
  A.fuse = function (dur) {
    if (!ok()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < dur * 22; i++) noise(t + i / 22 + R(0, 0.03), 0.03, { type: "highpass", f: 3000, vol: R(0.05, 0.15) });
  };
  A.whistle = function (dur) {
    if (!ok()) return;
    tone(ctx.currentTime, dur, { f: 1800, f2: 500, vol: 0.12, attack: 0.05 });
  };
  /* continuous laser hum */
  let laser = null;
  A.laserOn = function () {
    if (!ok() || laser) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 880;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 30; const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency);
    const fl = ctx.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = 1800; fl.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    o.connect(fl).connect(g).connect(master); o.start(); lfo.start();
    laser = { o, lfo, g };
  };
  A.laserOff = function () {
    if (!laser) return;
    const t = ctx.currentTime, l = laser; laser = null;
    l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value, t); l.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    l.o.stop(t + 0.1); l.lfo.stop(t + 0.1);
  };
  A.sizzle = function () { if (ok() && budget(0.3)) noise(ctx.currentTime, 0.1, { type: "highpass", f: 5000, vol: 0.06 }); };

  /* ---------- game feedback ---------- */
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  A.combo = function (n) {
    if (!ok()) return;
    const f = 523 * Math.pow(2, PENTA[Math.min(PENTA.length - 1, n - 2)] / 12);
    tone(ctx.currentTime, 0.2, { type: "triangle", f, vol: 0.12 });
  };
  A.fanfare = function () {
    if (!ok()) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.1, 0.35, { type: "triangle", f, vol: 0.18 }));
  };
  A.tick = function () { if (ok()) tone(ctx.currentTime, 0.04, { type: "square", f: 1200, vol: 0.05 }); };
  A.buzz = function () { if (ok()) tone(ctx.currentTime, 0.3, { type: "square", f: 140, vol: 0.1 }); };
  A.click = function () { if (ok()) tone(ctx.currentTime, 0.03, { type: "triangle", f: 900, vol: 0.06 }); };
})();
