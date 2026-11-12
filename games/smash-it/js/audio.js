/* ============ SMASH IT — synthesized audio (no sound files) ============ */
(function () {
  "use strict";
  const S = (window.SMASH = window.SMASH || {});

  const A = (S.audio = { sfx: true, voice: true, ambience: true });
  let ctx = null, master, sfxBus, ambBus, noiseBuf, brownBuf;

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = A.ambience ? 0.4 : 0; ambBus.connect(master);

    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    brownBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    if (pendingAmb) { const p = pendingAmb; pendingAmb = null; A.startAmbience(p); }
    return ctx;
  }
  A.unlock = init;

  /* ---------- primitives ---------- */
  function tone(freq, dur, o) {
    o = o || {};
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideTime || dur));
    if (o.wobble) { // vibrato for boings
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.wobble; lg.gain.value = freq * 0.25;
      lfo.connect(lg).connect(osc.frequency);
      lg.gain.exponentialRampToValueAtTime(1, t + dur);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; g.connect(f); out = f; }
    osc.connect(g);
    out.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(dur, o) {
    o = o || {};
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? brownBuf : noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.freq || 1500, t);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(o.bus || sfxBus);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  const R = (a, b) => a + Math.random() * (b - a);

  /* ---------- sound effects ---------- */
  const SFX = {
    punch(p) { const v = Math.min(1, 0.5 + (p || 5) / 14); tone(R(130, 160), 0.2, { slide: 45, vol: 0.9 * v }); noise(0.09, { filter: "lowpass", freq: 900, vol: 0.6 * v }); noise(0.03, { filter: "highpass", freq: 3000, vol: 0.25 }); },
    slap() { noise(0.1, { filter: "highpass", freq: 2200, vol: 1, attack: 0.001 }); noise(0.05, { freq: 1200, q: 2, vol: 0.5 }); tone(900, 0.05, { type: "triangle", slide: 300, vol: 0.15 }); },
    kick() { tone(110, 0.3, { slide: 38, vol: 1 }); noise(0.14, { filter: "lowpass", freq: 500, vol: 0.7 }); },
    push() { noise(0.28, { freq: 500, slide: 250, vol: 0.4, attack: 0.03 }); },
    soft() { noise(0.16, { filter: "lowpass", freq: 700, vol: 0.6 }); tone(210, 0.12, { slide: 120, vol: 0.35 }); },
    bonk() { tone(R(560, 640), 0.1, { type: "triangle", slide: 220, vol: 0.4 }); tone(240, 0.5, { slide: 420, wobble: 18, vol: 0.25, delay: 0.03 }); },
    squeak() { tone(900, 0.32, { type: "sawtooth", slide: 1500, vol: 0.12, lp: 2500 }); tone(1400, 0.2, { type: "sawtooth", slide: 700, vol: 0.1, lp: 2500, delay: 0.18 }); tone(90, 0.4, { slide: 40, vol: 0.9 }); noise(0.3, { filter: "lowpass", freq: 400, vol: 0.6 }); },
    squish() { noise(0.25, { filter: "lowpass", freq: 450, vol: 0.6 }); tone(140, 0.25, { wobble: 12, vol: 0.25 }); },
    splat() { noise(0.28, { filter: "lowpass", freq: 2200, slide: 180, vol: 0.85 }); tone(170, 0.16, { slide: 60, vol: 0.5 }); },
    egg() { for (let i = 0; i < 3; i++) noise(0.015, { filter: "highpass", freq: 3500, vol: 0.5, delay: i * 0.022 }); SFX.splat(); },
    splash() { noise(0.03, { filter: "highpass", freq: 2000, vol: 0.9 }); noise(0.55, { freq: 3000, slide: 450, q: 0.7, vol: 0.6, delay: 0.02 }); },
    bounce() { tone(R(150, 175), 0.12, { slide: 85, vol: 0.6 }); noise(0.04, { filter: "lowpass", freq: 900, vol: 0.3 }); },
    whoosh() { noise(0.22, { freq: 400, slide: 1800, q: 0.8, vol: 0.18, attack: 0.05 }); },
    thud(p) { const v = Math.min(1, 0.4 + (p || 4) / 10); tone(85, 0.3, { slide: 35, vol: v }); noise(0.22, { filter: "lowpass", freq: 320, vol: 0.7 * v }); },
    wall() { SFX.thud(8); noise(0.12, { freq: 1500, vol: 0.3 }); },
    boom() { noise(0.7, { filter: "lowpass", freq: 1400, slide: 90, vol: 1 }); tone(80, 0.55, { slide: 28, vol: 0.9 }); tone(440, 0.4, { type: "sawtooth", slide: 560, vol: 0.08, lp: 1800, delay: 0.18 }); for (let i = 0; i < 6; i++) noise(0.05, { filter: "highpass", freq: 5000, vol: 0.15, delay: 0.2 + i * 0.05 }); },
    shatter() { for (let i = 0; i < 7; i++) tone(R(1800, 4200), 0.12, { type: "triangle", vol: 0.12, delay: R(0, 0.12) }); noise(0.25, { filter: "highpass", freq: 3000, vol: 0.4 }); },
    wood() { noise(0.18, { freq: 900, q: 2, vol: 0.7 }); tone(190, 0.12, { type: "triangle", slide: 120, vol: 0.4 }); },
    spin() { tone(400, 0.7, { slide: 1300, vol: 0.12 }); },
    slide() { tone(450, 0.55, { slide: 1500, vol: 0.12 }); },
    fall() { tone(1400, 0.6, { slide: 350, vol: 0.12 }); },
    tweet() { for (let i = 0; i < 3; i++) tone(R(2300, 2800), 0.08, { slide: R(2900, 3300), vol: 0.06, delay: i * 0.13 }); },
    grab() { tone(300, 0.1, { slide: 520, vol: 0.2 }); },
    pop() { noise(0.04, { filter: "highpass", freq: 1500, vol: 0.9 }); tone(600, 0.06, { slide: 200, vol: 0.2 }); },
    ding() { tone(1320, 0.4, { vol: 0.25 }); tone(1760, 0.35, { vol: 0.18, delay: 0.06 }); },
    unlock() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, { type: "triangle", vol: 0.2, delay: i * 0.07 })); },
    fanfare() { [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { type: "square", vol: 0.06, lp: 2400, delay: i * 0.1 })); },
    tick() { tone(1000, 0.05, { vol: 0.15 }); },
    buzzer() { tone(140, 0.6, { type: "sawtooth", vol: 0.15, lp: 900 }); },
    boing() { tone(200, 0.6, { slide: 380, wobble: 14, vol: 0.3 }); },
    crunch(p) { const v = Math.min(1, 0.55 + (p || 6) / 16); tone(95, 0.3, { slide: 34, vol: v }); noise(0.16, { filter: "lowpass", freq: 900, vol: 0.8 * v }); for (let i = 0; i < 4; i++) noise(0.02, { filter: "highpass", freq: 2500, vol: 0.35, delay: 0.01 + i * 0.018 }); },
    bong() { tone(520, 1.1, { vol: 0.45 }); tone(1340, 0.8, { vol: 0.2 }); tone(2210, 0.45, { vol: 0.12 }); noise(0.05, { filter: "highpass", freq: 3000, vol: 0.4 }); },
    anvil() { SFX.thud(10); tone(880, 1, { type: "triangle", vol: 0.25 }); tone(1330, 0.7, { vol: 0.15 }); },
    bang() { noise(0.09, { filter: "highpass", freq: 1200, vol: 1, attack: 0.001 }); tone(140, 0.18, { slide: 50, vol: 0.9 }); noise(0.5, { filter: "lowpass", freq: 700, slide: 150, vol: 0.35, delay: 0.03 }); },
    ignite() { noise(0.6, { filter: "lowpass", freq: 300, slide: 1600, vol: 0.7, attack: 0.05 }); tone(90, 0.4, { slide: 60, vol: 0.4 }); },
    hiss() { noise(0.5, { filter: "highpass", freq: 4000, vol: 0.25, attack: 0.05 }); },
    clank() { tone(420, 0.25, { type: "triangle", vol: 0.25 }); tone(780, 0.2, { vol: 0.12 }); SFX.thud(3); },
    steam() { noise(0.7, { filter: "highpass", freq: 2500, vol: 0.4, attack: 0.02 }); },
    comfy() { noise(0.4, { filter: "lowpass", freq: 500, vol: 0.5, attack: 0.04 }); }
  };

  A.play = function (name, p) {
    if (!A.sfx || !init()) return;
    const f = SFX[name];
    if (f) f(p);
  };

  /* ---------- water spray loop ---------- */
  let spray = null;
  A.sprayStart = function () {
    if (!A.sfx || !init() || spray) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.08);
    src.connect(f).connect(g).connect(sfxBus);
    src.start();
    spray = { src, g };
  };
  A.sprayStop = function () {
    if (!spray) return;
    const s = spray; spray = null;
    s.g.gain.cancelScheduledValues(ctx.currentTime);
    s.g.gain.setValueAtTime(s.g.gain.value, ctx.currentTime);
    s.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    s.src.stop(ctx.currentTime + 0.2);
  };

  /* ---------- crackling fire loop ---------- */
  let fire = null;
  A.fireLevel = function (lvl) {
    if (!ctx) return;
    if (!A.sfx) lvl = 0;
    if (!fire && lvl > 0) {
      const src = ctx.createBufferSource(); src.buffer = brownBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(sfxBus); src.start();
      fire = { src, g };
    }
    if (!fire) return;
    const target = Math.min(0.8, lvl) * (0.7 + Math.random() * 0.6);
    fire.g.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    if (lvl > 0 && Math.random() < lvl * 0.25) noise(0.02, { filter: "highpass", freq: 3000, vol: 0.15 * Math.min(1, lvl) });
  };

  /* ---------- environment ambience ---------- */
  let amb = null, pendingAmb = null;
  function stopAmb() {
    if (!amb) return;
    clearInterval(amb.timer);
    amb.nodes.forEach((n) => { try { n.stop(); } catch (e) {} });
    amb.out.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    amb = null;
  }
  A.startAmbience = function (env) {
    if (!ctx) { pendingAmb = env; return; }
    stopAmb();
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ambBus);
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    const nodes = [];
    const loopNoise = (buf, type, freq, q, vol) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = vol;
      s.connect(f).connect(g).connect(out); s.start(); nodes.push(s);
      return g;
    };
    let timer = null;
    const beat = 0.5; let next = ctx.currentTime + 0.1, step = 0;
    const sched = (fn) => { timer = setInterval(() => { while (next < ctx.currentTime + 0.25) { fn(next, step++); next += beat / 2; } }, 60); };
    const note = (f, t, d, type, vol, lp) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      let n = g; if (lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; g.connect(fl); n = fl; }
      o.connect(g); n.connect(out); o.start(t); o.stop(t + d + 0.05);
    };

    if (env === "studio") {
      loopNoise(brownBuf, "lowpass", 220, 0.5, 0.08);
    } else if (env === "gym") {
      const g = loopNoise(brownBuf, "bandpass", 450, 0.6, 0.25);
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.15; lg.gain.value = 0.1; lfo.connect(lg).connect(g.gain); lfo.start(); nodes.push(lfo);
      loopNoise(noiseBuf, "bandpass", 1200, 0.8, 0.02);
    } else if (env === "cartoon") {
      const scale = [523, 587, 659, 784, 880, 1047];
      sched((t, s) => {
        if (s % 2 === 0 || Math.random() < 0.4) note(scale[Math.floor(Math.random() * scale.length)], t, 0.22, "triangle", 0.05);
        if (s % 4 === 0) note([131, 165, 196, 175][(s / 4) % 4 | 0], t, 0.4, "sine", 0.08);
      });
    } else if (env === "warehouse") {
      [55, 55.6].forEach((f) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 160; const g = ctx.createGain(); g.gain.value = 0.05; o.connect(fl).connect(g).connect(out); o.start(); nodes.push(o); });
      loopNoise(brownBuf, "lowpass", 300, 0.5, 0.06);
      sched((t, s) => { if (Math.random() < 0.03) { note(R(900, 1400), t, 0.12, "sine", 0.05); note(R(700, 1000), t + 0.35, 0.1, "sine", 0.02); } });
    } else if (env === "party") {
      const bass = [55, 55, 65.4, 49];
      sched((t, s) => {
        if (s % 2 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(out); o.start(t); o.stop(t + 0.25); }
        else { const n = ctx.createBufferSource(); n.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.connect(f).connect(g).connect(out); n.start(t, Math.random(), 0.06); }
        note(bass[Math.floor(s / 8) % 4] * (s % 4 === 3 ? 2 : 1), t, 0.2, "square", 0.05, 500);
      });
    }
    amb = { nodes, out, timer };
  };
  A.setAmbience = function (on) {
    A.ambience = on;
    if (ambBus) ambBus.gain.setTargetAtTime(on ? 0.4 : 0, ctx.currentTime, 0.1);
  };

  /* ---------- voice lines (browser speech, high & silly) ---------- */
  let lastSpeak = 0;
  A.speak = function (text, force) {
    if (!A.voice || !("speechSynthesis" in window)) return;
    const now = performance.now();
    if (!force && now - lastSpeak < 1300) return;
    lastSpeak = now;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*…]/g, ""));
      u.pitch = R(1.5, 2); u.rate = R(1.1, 1.3); u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) {}
  };
})();
