/* ============ FIREWORK THERAPY — synthesized fireworks sounds & soft music ============ */
(function () {
  "use strict";
  const F = window.FW;
  const A = (F.audio = { fxVol: 0.8, musicVol: 0.45, muted: false, gentle: false, onBeat: null });
  const R = (a, b) => a + Math.random() * (b - a);
  let ctx = null, master, fxBus, musBus, noiseBuf, verb;
  let recent = 0, recentT = 0;

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    fxBus = ctx.createGain(); fxBus.gain.value = A.fxVol; fxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = A.musicVol * 0.5; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a simple echo so booms roll around the sky
    verb = ctx.createDelay(1); verb.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.32; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    verb.connect(lp).connect(fb).connect(verb); lp.connect(fxBus);
    return ctx;
  }
  A.unlock = init;
  A.setVolumes = function () { if (!ctx) return; fxBus.gain.value = A.fxVol; musBus.gain.value = A.musicVol * 0.5; master.gain.value = A.muted ? 0 : 1; };
  const ok = () => !A.muted && init();
  function budget() { const t = performance.now(); if (t - recentT > 150) { recent = 0; recentT = t; } return ++recent < 8; }

  function noise(t, dur, o) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || "lowpass"; f.frequency.setValueAtTime(o.f, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur); f.Q.value = o.q || 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + (o.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g); g.connect(o.out || fxBus); if (o.verb) g.connect(verb);
    s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
  }
  function tone(t, dur, o) {
    const os = ctx.createOscillator(); os.type = o.type || "sine"; os.frequency.setValueAtTime(o.f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + (o.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g).connect(o.out || fxBus); os.start(t); os.stop(t + dur + 0.05);
  }

  A.launch = function (whistle) {
    if (!ok() || !budget()) return;
    const t = ctx.currentTime, k = A.gentle ? 0.4 : 1;
    noise(t, 0.12, { f: 600, f2: 200, vol: 0.25 * k });
    noise(t, 0.6, { type: "bandpass", f: 900, f2: 2400, q: 2, vol: 0.06 * k, a: 0.1 });
    if (whistle) tone(t + 0.05, R(0.8, 1.2), { f: R(700, 1000), f2: R(2400, 3200), vol: 0.06 * k, a: 0.08 });
  };
  A.boom = function (type, size) {
    if (!ok() || !budget()) return;
    const t = ctx.currentTime + R(0.02, 0.12), k = (A.gentle ? 0.35 : 1) * Math.min(1.4, 0.6 + (size || 1) * 0.5);
    const deep = type === "giant" || type === "supernova" || type === "sphere" || type === "converge";
    noise(t, deep ? 2.2 : 1.3, { f: A.gentle ? 600 : 1800, f2: 60, vol: 0.55 * k, verb: true });
    tone(t, deep ? 1.4 : 0.8, { f: deep ? 70 : 95, f2: 28, vol: 0.5 * k });
    if (type === "crackle" || type === "glitter" || type === "chrysanthemum" || type === "heartstars" || type === "supernova") A.crackle(1.6, k);
    if (type === "willow" || type === "waterfall" || type === "fallingstar" || type === "fountain") noise(t + 0.2, 3, { type: "highpass", f: 5000, vol: 0.05 * k, a: 0.6 });
    if (type === "sparkle" || type === "glitter" || type === "rainbowarc" || type === "rainbow") for (let i = 0; i < 10; i++) tone(t + 0.1 + R(0, 1.2), 0.08, { f: R(2500, 6000), vol: 0.025 * k });
  };
  A.crackle = function (dur, k) {
    if (!ok()) return;
    const t = ctx.currentTime + 0.3; k = k == null ? 1 : k;
    const n = Math.round((dur || 0.6) * 40);
    for (let i = 0; i < n; i++) noise(t + R(0, dur || 0.6), 0.02, { type: "highpass", f: R(2000, 6000), vol: R(0.05, 0.16) * k });
  };

  /* ---------- music: three gentle generative tracks ---------- */
  A.TRACKS = [
    { id: "calm", name: "Calm Night", bpm: 72, root: 57, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]] },
    { id: "festival", name: "Festival Lights", bpm: 104, root: 60, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], drums: true },
    { id: "grand", name: "Grand Celebration", bpm: 92, root: 55, chords: [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]], drums: true, brass: true },
    { id: "none", name: "No music" }
  ];
  let seq = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.playMusic = function (id) {
    A.stopMusic();
    const tr = A.TRACKS.find((x) => x.id === id);
    if (!tr || !tr.bpm || !init()) return;
    A.current = id;
    const beat = 60 / tr.bpm;
    let i = 0, next = ctx.currentTime + 0.15;
    seq = setInterval(() => {
      while (next < ctx.currentTime + 0.3) {
        const bar = Math.floor(i / 4) % tr.chords.length, b = i % 4, ch = tr.chords[bar];
        if (b === 0) for (const n of ch) { tone(next, beat * 4.2, { type: "triangle", f: mtof(tr.root + n), vol: 0.035, a: 0.5, out: musBus }); tone(next, beat * 4.2, { type: "sine", f: mtof(tr.root + n + 12), vol: 0.015, a: 0.8, out: musBus }); }
        if (b === 0 || b === 2) tone(next, beat * 1.8, { type: "sine", f: mtof(tr.root + ch[0] - 24), vol: 0.09, a: 0.05, out: musBus });
        // a soft twinkling arpeggio
        for (let s = 0; s < 2; s++) if (Math.random() < 0.7) tone(next + s * beat * 0.5, beat * 0.8, { type: "sine", f: mtof(tr.root + 12 + ch[(b * 2 + s) % ch.length]), vol: 0.025, out: musBus });
        if (tr.drums) { if (b % 2 === 0) tone(next, 0.2, { f: 110, f2: 40, vol: 0.18, out: musBus }); if (b % 2 === 1) noise(next, 0.12, { type: "bandpass", f: 1800, vol: 0.05, out: musBus }); noise(next + beat / 2, 0.04, { type: "highpass", f: 7000, vol: 0.025, out: musBus }); }
        if (tr.brass && b === 0 && bar % 2 === 0) tone(next, beat * 2, { type: "sawtooth", f: mtof(tr.root + ch[2]), vol: 0.02, a: 0.2, out: musBus });
        const when = (next - ctx.currentTime) * 1000, beatNo = i;
        if (A.onBeat) setTimeout(() => A.onBeat && A.onBeat(beatNo, b, bar), Math.max(0, when));
        next += beat; i++;
      }
    }, 60);
  };
  A.stopMusic = function () { if (seq) clearInterval(seq); seq = null; A.current = null; };
})();
