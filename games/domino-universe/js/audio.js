/* ============ DOMINO UNIVERSE — synthesized sounds ============ */
(function () {
  "use strict";
  const D = window.DOM;
  const A = (D.audio = { sfx: 0.8, music: 0.35, musicOn: true, sfxOn: true });
  const R = (a, b) => a + Math.random() * (b - a);
  let ctx = null, master, sfxBus, musBus, noiseBuf, clicks = 0, clickT = 0;
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master); musBus = ctx.createGain(); musBus.connect(master);
    A.setVolumes();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  A.unlock = init;
  A.setVolumes = () => { if (!ctx) return; sfxBus.gain.value = A.sfxOn ? A.sfx : 0; musBus.gain.value = A.musicOn ? A.music * 0.5 : 0; };
  function noise(t, dur, f, vol, type, q) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = type || "bandpass"; fl.frequency.value = f; fl.Q.value = q || 1; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl).connect(g).connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); }
  function tone(t, dur, f, vol, type, f2, out) { const o = ctx.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(out || sfxBus); o.start(t); o.stop(t + dur + 0.02); }
  // one domino knocking another; quieter and simpler when there are lots at once
  A.click = function (kind, k) {
    if (!A.sfxOn || !init()) return;
    const now = performance.now();
    if (now - clickT > 100) { clicks = 0; clickT = now; }
    if (++clicks > 7) return;
    const t = ctx.currentTime, v = (0.25 + k * 0.6) / (1 + clicks * 0.15);
    switch (kind) {
      case "wood": noise(t, 0.05, R(1100, 1500), v * 0.9, "bandpass", 4); tone(t, 0.06, R(520, 700), v * 0.25, "triangle"); break;
      case "glass": tone(t, 0.18, R(2600, 3400), v * 0.18); tone(t, 0.12, R(5000, 6000), v * 0.08); break;
      case "metal": tone(t, 0.3, R(1300, 1700), v * 0.14); tone(t, 0.25, R(3200, 3900), v * 0.06); noise(t, 0.02, 4000, v * 0.3, "highpass"); break;
      case "heavy": noise(t, 0.08, R(500, 700), v, "bandpass", 2); tone(t, 0.1, 160, v * 0.3, "triangle", 90); break;
      default: noise(t, 0.035, R(2400, 3200), v * 0.8, "bandpass", 3); tone(t, 0.03, R(1600, 2000), v * 0.12, "square");
    }
  };
  A.play = function (name) {
    if (!A.sfxOn || !init()) return;
    const t = ctx.currentTime;
    if (name === "push") { noise(t, 0.08, 900, 0.3, "lowpass"); }
    else if (name === "place") { noise(t, 0.04, 2000, 0.25, "bandpass", 2); tone(t, 0.05, 900, 0.05, "triangle"); }
    else if (name === "trigger") { [660, 880, 1320].forEach((f, i) => tone(t + i * 0.06, 0.18, f, 0.12, "triangle")); }
    else if (name === "bell") { for (const [f, v] of [[880, 0.25], [1760, 0.12], [2640, 0.06], [3520, 0.04]]) tone(t, 1.8, f, v); }
    else if (name === "boom") { noise(t, 0.8, 1200, 0.6, "lowpass"); tone(t, 0.5, 90, 0.5, "sine", 30); }
    else if (name === "fanfare") { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.12, 0.45, f, 0.15, "triangle")); }
    else if (name === "ui") tone(t, 0.04, 900, 0.05, "triangle");
    else if (name === "undo") tone(t, 0.08, 600, 0.06, "triangle", 400);
    else if (name === "delete") noise(t, 0.08, 600, 0.2, "lowpass");
  };
  /* ambient music: slow chords with a little sparkle */
  let seq = null;
  A.startMusic = function () {
    if (seq || !A.musicOn || !init()) return;
    const chords = [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]];
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    let i = 0, next = ctx.currentTime + 0.2;
    seq = setInterval(() => {
      while (next < ctx.currentTime + 0.5) {
        const ch = chords[Math.floor(i / 4) % 4];
        if (i % 4 === 0) for (const n of ch) tone(next, 3.6, mtof(n), 0.03, "triangle", null, musBus);
        if (Math.random() < 0.6) tone(next + 0.4, 0.8, mtof(ch[Math.floor(Math.random() * 4)] + 12), 0.025, "sine", null, musBus);
        next += 0.9; i++;
      }
    }, 120);
  };
  A.stopMusic = () => { clearInterval(seq); seq = null; };
})();
