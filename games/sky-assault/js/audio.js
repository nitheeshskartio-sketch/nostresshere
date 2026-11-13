/* ============ SKY ASSAULT — synthesized sound effects and music ============ */
(function () {
  "use strict";
  const S = window.SKY;
  const A = (S.audio = { sfx: true, music: true });
  const R = (a, b) => a + Math.random() * (b - a);
  let ctx = null, master, sfxBus, musBus, noiseBuf;
  const last = {};

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.32; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  A.unlock = init;
  const ok = () => A.sfx && init();
  // don't let a flood of the same sound pile up
  const gate = (k, ms) => { const t = performance.now(); if (t - (last[k] || 0) < ms) return false; last[k] = t; return true; };

  function noise(t, dur, o) {
    o = o || {};
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || "lowpass"; f.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur); f.Q.value = o.q || 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(o.out || sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(t, dur, o) {
    o = o || {};
    const os = ctx.createOscillator(); os.type = o.type || "sine"; os.frequency.setValueAtTime(o.f || 440, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g).connect(o.out || sfxBus); os.start(t); os.stop(t + dur + 0.05);
  }

  const SFX = {
    shoot(t) { noise(t, 0.04, { type: "highpass", f: 2500, vol: 0.03 }); tone(t, 0.04, { type: "square", f: 900, f2: 500, vol: 0.012 }); },
    missile(t) { noise(t, 0.25, { type: "bandpass", f: 800, f2: 2400, q: 2, vol: 0.06, a: 0.02 }); },
    eshot(t) { tone(t, 0.08, { type: "triangle", f: 700, f2: 380, vol: 0.03 }); },
    hit(t) { tone(t, 0.03, { type: "square", f: 1500, vol: 0.015 }); },
    small(t) { noise(t, 0.35, { f: 1800, f2: 200, vol: 0.32 }); tone(t, 0.18, { f: 160, f2: 50, vol: 0.2 }); },
    big(t) { noise(t, 1.0, { f: 2400, f2: 90, vol: 0.55 }); tone(t, 0.6, { f: 110, f2: 30, vol: 0.45 }); noise(t + 0.08, 0.7, { type: "bandpass", f: 400, f2: 120, vol: 0.2 }); },
    huge(t) { noise(t, 2.2, { f: 2000, f2: 60, vol: 0.75 }); tone(t, 1.4, { f: 90, f2: 22, vol: 0.6 }); for (let i = 1; i < 5; i++) noise(t + i * 0.25, 0.6, { f: 1400, f2: 120, vol: 0.35 }); },
    splash(t) { noise(t, 0.5, { type: "bandpass", f: 1400, f2: 400, vol: 0.3 }); },
    star(t) { tone(t, 0.09, { type: "triangle", f: R(1500, 1800), vol: 0.05 }); },
    power(t) { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, 0.16, { type: "triangle", f, vol: 0.12 })); },
    hurt(t) { noise(t, 0.3, { f: 900, f2: 150, vol: 0.4 }); tone(t, 0.25, { type: "sawtooth", f: 200, f2: 60, vol: 0.12 }); },
    bomb(t) { noise(t, 0.4, { type: "bandpass", f: 300, f2: 3000, q: 1, vol: 0.3, a: 0.3 }); setTimeout(() => SFX.huge(ctx.currentTime), 300); },
    shield(t) { tone(t, 0.5, { type: "sine", f: 300, f2: 900, vol: 0.18 }); tone(t, 0.5, { type: "triangle", f: 450, f2: 1350, vol: 0.08 }); },
    laser(t) { tone(t, 0.6, { type: "sawtooth", f: 120, f2: 900, vol: 0.12 }); },
    emp(t) { tone(t, 0.6, { type: "square", f: 1200, f2: 80, vol: 0.12 }); noise(t, 0.6, { type: "highpass", f: 3000, vol: 0.15 }); },
    strike(t) { noise(t, 1.6, { type: "bandpass", f: 300, f2: 1600, q: 1.5, vol: 0.25, a: 0.6 }); },
    warn(t) { for (let i = 0; i < 3; i++) { tone(t + i * 0.5, 0.25, { type: "square", f: 620, vol: 0.07 }); tone(t + i * 0.5 + 0.25, 0.25, { type: "square", f: 460, vol: 0.07 }); } },
    rescue(t) { [784, 988, 1175].forEach((f, i) => tone(t + i * 0.09, 0.2, { type: "triangle", f, vol: 0.12 })); },
    beep(t) { tone(t, 0.07, { type: "square", f: 1000, vol: 0.03 }); },
    medal(t) { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.1, 0.4, { type: "triangle", f, vol: 0.14 })); },
    click(t) { tone(t, 0.03, { type: "triangle", f: 900, vol: 0.06 }); },
    buy(t) { [660, 990].forEach((f, i) => tone(t + i * 0.08, 0.15, { type: "triangle", f, vol: 0.12 })); }
  };
  const GATES = { shoot: 70, eshot: 60, hit: 40, star: 35, small: 45, splash: 80, missile: 90, beep: 200 };
  A.play = function (name) {
    if (!ok()) return;
    if (GATES[name] && !gate(name, GATES[name])) return;
    SFX[name] && SFX[name](ctx.currentTime + 0.005);
  };

  /* ---------- music: bass + arpeggio + drums, per world ---------- */
  let seq = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.startMusic = function (spec, boss) {
    A.stopMusic();
    if (!A.music || !init()) return;
    const bpm = spec.bpm * (boss ? 1.12 : 1), step = 60 / bpm / 4;
    const scale = spec.scale, root = spec.root - (boss ? 2 : 0);
    const prog = boss ? [0, 0, -2, -1] : [0, 5, 3, 4];
    const note = (deg, oct) => root + 12 * oct + scale[((deg % scale.length) + scale.length) % scale.length] + 12 * Math.floor(deg / scale.length);
    let i = 0, next = ctx.currentTime + 0.1;
    seq = setInterval(() => {
      while (next < ctx.currentTime + 0.25) {
        const bar = Math.floor(i / 16) % 4, s = i % 16, chord = prog[bar];
        if (s % 4 === 0) { tone(next, 0.18, { f: 120, f2: 40, vol: 0.5, out: musBus }); }
        if (boss && s % 4 === 2) tone(next, 0.1, { f: 100, f2: 40, vol: 0.3, out: musBus });
        if (s % 8 === 4) noise(next, 0.12, { type: "bandpass", f: 1800, vol: 0.18, out: musBus });
        if (s % 2 === 1) noise(next, 0.04, { type: "highpass", f: 6000, vol: 0.06, out: musBus });
        if (s % 2 === 0) tone(next, step * 1.8, { type: "sawtooth", f: mtof(note(chord, -1)), vol: 0.07, out: musBus });
        const arp = [0, 2, 4, 2, 5, 4, 2, 4][s % 8];
        tone(next, step * 0.9, { type: "square", f: mtof(note(chord + arp, 1)), vol: 0.025, out: musBus });
        if (s === 0 || s === 6 || s === 10) tone(next, step * 3, { type: "triangle", f: mtof(note(chord + [4, 2, 5][s % 3], 1)), vol: 0.04, out: musBus });
        next += step; i++;
      }
    }, 50);
  };
  A.stopMusic = function () { if (seq) clearInterval(seq); seq = null; };
  A.setMusicVol = (v) => { if (musBus) musBus.gain.value = v; };
})();
