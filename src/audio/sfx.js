// Efectos de sonido sintetizados — docs/05_audio.md
// Cada efecto es una función que usa las primitivas del motor (tone, noise).

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const SFX = {
  // --- Movimiento ---
  jump: (a) => a.tone({ wave: 'pulse25', f0: a.vary(260), f1: a.vary(620), dur: 0.11, vol: 0.2 }),
  doubleJump: (a) => {
    // Clic de switch mecánico + barrido más agudo
    a.noise({ dur: 0.018, vol: 0.35, type: 'highpass', freq: 3500 });
    a.tone({ wave: 'pulse12', f0: 2200, f1: 1800, dur: 0.02, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: a.vary(420), f1: a.vary(980), dur: 0.12, vol: 0.18, at: 0.015 });
  },
  land: (a) => a.noise({ dur: 0.07, vol: 0.28, type: 'lowpass', freq: a.vary(600), freq1: 150 }),
  landSoft: (a) => a.noise({ dur: 0.04, vol: 0.12, type: 'lowpass', freq: a.vary(500) }),
  skid: (a) => a.noise({ dur: 0.1, vol: 0.1, type: 'bandpass', freq: a.vary(1400), q: 2 }),
  step: (a) => a.noise({ dur: 0.02, vol: 0.05, type: 'lowpass', freq: a.vary(900) }),

  // --- Báculo ---
  shoot: (a) => a.tone({ wave: 'pulse12', f0: a.vary(1100), f1: a.vary(1500), dur: 0.06, vol: 0.14 }),
  chargeReady: (a) => {
    a.tone({ wave: 'pulse25', f0: N(84), dur: 0.08, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: N(91), dur: 0.12, vol: 0.12, at: 0.06 });
  },
  shootCharged: (a) => {
    a.tone({ wave: 'triangle', f0: 180, f1: 40, dur: 0.28, vol: 0.4 });
    a.tone({ wave: 'pulse25', f0: 1500, f1: 600, dur: 0.14, vol: 0.16 });
    a.noise({ dur: 0.12, vol: 0.2, type: 'bandpass', freq: 2500, freq1: 400 });
  },
  reflect: (a) => a.tone({ wave: 'pulse12', f0: 1800, f1: 2600, dur: 0.06, vol: 0.12 }),

  // --- Combate ---
  enemyHit: (a) => {
    a.noise({ dur: 0.05, vol: 0.25, type: 'bandpass', freq: a.vary(2600), q: 3 });
    a.tone({ wave: 'pulse12', f0: a.vary(700), f1: 300, dur: 0.05, vol: 0.1 });
  },
  enemyDie: (a) => {
    a.noise({ dur: 0.22, vol: 0.32, type: 'lowpass', freq: 4000, freq1: 200 });
    a.tone({ wave: 'pulse25', f0: a.vary(520), f1: 90, dur: 0.18, vol: 0.14 });
  },
  stomp: (a) => {
    a.tone({ wave: 'pulse50', f0: a.vary(520), f1: 130, dur: 0.12, vol: 0.22 });
    a.noise({ dur: 0.04, vol: 0.2, type: 'lowpass', freq: 900 });
  },
  hurt: (a) => {
    a.tone({ wave: 'sawtooth', f0: 420, f1: 110, dur: 0.26, vol: 0.2 });
    a.noise({ dur: 0.1, vol: 0.2, type: 'bandpass', freq: 1200 });
  },
  coatingBreak: (a) => {
    a.tone({ wave: 'pulse25', f0: 1400, f1: 500, dur: 0.18, vol: 0.14 });
    a.noise({ dur: 0.15, vol: 0.18, type: 'highpass', freq: 3000 });
  },
  // Melodía corta descendente "derritiéndose"
  melt: (a) => {
    const notes = [76, 74, 71, 67, 64, 59];
    notes.forEach((m, i) =>
      a.tone({ wave: 'pulse50', f0: N(m), f1: N(m) * 0.94, dur: 0.16, vol: 0.14, at: i * 0.13, curve: 'lin', vibrato: 6 }),
    );
    a.tone({ wave: 'triangle', f0: N(40), f1: N(28), dur: 0.9, vol: 0.25, at: 0.7 });
  },
  fall: (a) => a.tone({ wave: 'pulse25', f0: 900, f1: 90, dur: 0.5, vol: 0.14 }),

  // --- Recolección ---
  bit: (a) => {
    a.tone({ wave: 'pulse25', f0: N(83), dur: 0.05, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: N(88), dur: 0.12, vol: 0.12, at: 0.05 });
  },
  goldenY: (a) => [72, 76, 79, 84, 88].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.14, vol: 0.13, at: i * 0.06 })),
  cacao: (a) => {
    [67, 71, 74, 79].forEach((m, i) => a.tone({ wave: 'pulse50', f0: N(m), dur: 0.1, vol: 0.12, at: i * 0.05 }));
    a.tone({ wave: 'pulse12', f0: N(96), f1: N(100), dur: 0.25, vol: 0.06, at: 0.2 });
  },
  heal: (a) => [64, 68, 71, 76].forEach((m, i) => a.tone({ wave: 'triangle', f0: N(m), dur: 0.12, vol: 0.2, at: i * 0.05 })),
  // Fanfarria de ~2 s al obtener un objeto
  item: (a) => {
    const mel = [
      [72, 0, 0.12],
      [76, 0.12, 0.12],
      [79, 0.24, 0.12],
      [84, 0.36, 0.36],
      [81, 0.78, 0.12],
      [84, 0.9, 0.12],
      [88, 1.02, 0.9],
    ];
    for (const [m, t, d] of mel) a.tone({ wave: 'pulse50', f0: N(m), dur: d, vol: 0.14, at: t });
    const bass = [
      [48, 0, 0.36],
      [55, 0.36, 0.4],
      [53, 0.78, 0.24],
      [48, 1.02, 0.9],
    ];
    for (const [m, t, d] of bass) a.tone({ wave: 'triangle', f0: N(m), dur: d, vol: 0.3, at: t });
  },
  checkpoint: (a) => [60, 64, 67, 72, 76].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.1, vol: 0.12, at: i * 0.05 })),

  // --- Interfaz ---
  menuMove: (a) => a.tone({ wave: 'pulse12', f0: 1320, dur: 0.03, vol: 0.08 }),
  menuConfirm: (a) => {
    a.tone({ wave: 'pulse25', f0: N(76), dur: 0.05, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: N(83), dur: 0.09, vol: 0.12, at: 0.05 });
  },
  menuCancel: (a) => a.tone({ wave: 'pulse25', f0: N(71), f1: N(64), dur: 0.1, vol: 0.12 }),
  interact: (a) => a.tone({ wave: 'pulse25', f0: N(79), dur: 0.05, vol: 0.1 }),
  // Prueba de sonido del Hito 0
  test: (a) => {
    [60, 64, 67, 72].forEach((m, i) => a.tone({ wave: 'pulse50', f0: N(m), dur: 0.09, vol: 0.13, at: i * 0.07 }));
  },
  glitch: (a) => {
    for (let i = 0; i < 5; i++) a.tone({ wave: 'pulse12', f0: 200 + Math.random() * 2000, dur: 0.03, vol: 0.08, at: i * 0.03 });
    a.noise({ dur: 0.18, vol: 0.12, type: 'bandpass', freq: 3000, q: 4 });
  },

  // --- Hito 3: prólogo ---
  oneUp: (a) => [72, 76, 79, 84, 79, 84].forEach((m, i) => a.tone({ wave: 'pulse50', f0: N(m), dur: 0.09, vol: 0.12, at: i * 0.07 })),
  tink: (a) => {
    a.tone({ wave: 'triangle', f0: a.vary(2400), f1: 2000, dur: 0.08, vol: 0.18 });
    a.tone({ wave: 'pulse12', f0: a.vary(3600), dur: 0.03, vol: 0.06 });
  },
  // Rasgueo de guitarra: notas de un acorde en cascada
  strum: (a) => [52, 57, 62, 67, 71, 76].forEach((m, i) => a.tone({ wave: 'triangle', f0: N(m), dur: 0.9 - i * 0.06, vol: 0.14, at: i * 0.025, attack: 0.002 })),
  cricket: (a) => {
    const f = a.vary(4300);
    for (let i = 0; i < 3; i++) a.tone({ wave: 'sine', f0: f, dur: 0.025, vol: 0.025, at: i * 0.045 });
  },
  tvOn: (a) => {
    a.noise({ dur: 0.05, vol: 0.2, type: 'highpass', freq: 2000 });
    a.tone({ wave: 'sine', f0: 15700, dur: 0.6, vol: 0.02, at: 0.02 });
    a.tone({ wave: 'triangle', f0: 60, f1: 120, dur: 0.25, vol: 0.2 });
  },
  staticBurst: (a) => a.noise({ dur: 0.12, vol: 0.05, type: 'bandpass', freq: a.vary(3000), q: 0.6 }),
  // Tecla mecánica (texto de N.U.L.L. en la tele)
  key: (a) => {
    a.noise({ dur: 0.015, vol: 0.16, type: 'highpass', freq: a.vary(3200) });
    a.tone({ wave: 'pulse12', f0: a.vary(1900), dur: 0.012, vol: 0.05 });
  },
  nullAppear: (a) => {
    [64, 65, 71, 70].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), f1: N(m) * 0.97, dur: 0.22, vol: 0.12, at: i * 0.16 }));
    a.noise({ dur: 0.5, vol: 0.12, type: 'bandpass', freq: 1500, freq1: 400, q: 2 });
  },
  beam: (a) => {
    a.tone({ wave: 'sawtooth', f0: 90, f1: 900, dur: 0.7, vol: 0.18, curve: 'lin' });
    a.tone({ wave: 'pulse12', f0: 1800, f1: 400, dur: 0.7, vol: 0.08, vibrato: 60 });
    a.noise({ dur: 0.7, vol: 0.15, type: 'bandpass', freq: 2500, q: 1 });
  },
  detach: (a) => {
    a.tone({ wave: 'triangle', f0: 200, f1: 40, dur: 0.6, vol: 0.4 });
    a.noise({ dur: 0.4, vol: 0.3, type: 'lowpass', freq: 3000, freq1: 200 });
    a.tone({ wave: 'pulse25', f0: 900, f1: 300, dur: 1.2, vol: 0.08, at: 0.1, curve: 'lin', vibrato: 20 });
  },
  squareIn: (a) => a.tone({ wave: 'pulse25', f0: a.vary(700), f1: 1600, dur: 0.12, vol: 0.1 }),
  gulp: (a) => {
    a.tone({ wave: 'pulse50', f0: 300, f1: 180, dur: 0.12, vol: 0.12 });
    a.tone({ wave: 'pulse50', f0: 260, f1: 140, dur: 0.12, vol: 0.1, at: 0.18 });
  },
  suck: (a) => {
    a.tone({ wave: 'sawtooth', f0: 120, f1: 1400, dur: 1.0, vol: 0.14 });
    a.noise({ dur: 1.0, vol: 0.2, type: 'bandpass', freq: 400, freq1: 4000, q: 2 });
  },
  // Consola apagándose: zumbido que cae y un "pop" final
  crtOff: (a) => {
    a.tone({ wave: 'sine', f0: 900, f1: 30, dur: 0.6, vol: 0.2 });
    a.noise({ dur: 0.08, vol: 0.25, type: 'lowpass', freq: 1500, at: 0.55 });
    a.tone({ wave: 'triangle', f0: 70, f1: 30, dur: 0.15, vol: 0.3, at: 0.58 });
  },
  // "Compilación exitosa"
  compile: (a) => {
    for (let i = 0; i < 6; i++) a.noise({ dur: 0.012, vol: 0.12, type: 'highpass', freq: 3000, at: i * 0.05 });
    [72, 79, 84, 88].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.16, vol: 0.12, at: 0.32 + i * 0.07 }));
    a.tone({ wave: 'triangle', f0: N(60), dur: 0.5, vol: 0.25, at: 0.32 });
  },
  portalOpen: (a) => {
    a.tone({ wave: 'pulse25', f0: 100, f1: 800, dur: 0.9, vol: 0.12, vibrato: 30 });
    a.noise({ dur: 0.9, vol: 0.15, type: 'bandpass', freq: 600, freq1: 3000, q: 3 });
  },
  portalEnter: (a) => {
    a.tone({ wave: 'pulse12', f0: 400, f1: 2400, dur: 0.4, vol: 0.12 });
    a.tone({ wave: 'triangle', f0: 200, f1: 60, dur: 0.5, vol: 0.25 });
  },

  // --- Hito 3: Mundo Cartucho ---
  blockBump: (a) => {
    a.tone({ wave: 'triangle', f0: 180, f1: 90, dur: 0.08, vol: 0.3 });
    a.noise({ dur: 0.03, vol: 0.12, type: 'lowpass', freq: 1000 });
  },
  blockBreak: (a) => {
    a.noise({ dur: 0.3, vol: 0.35, type: 'lowpass', freq: 3000, freq1: 150 });
    a.tone({ wave: 'pulse25', f0: 300, f1: 60, dur: 0.25, vol: 0.14 });
  },
  kick: (a) => {
    a.tone({ wave: 'pulse50', f0: 220, f1: 660, dur: 0.07, vol: 0.18 });
    a.noise({ dur: 0.04, vol: 0.2, type: 'highpass', freq: 2000 });
  },
  diskBounce: (a) => a.tone({ wave: 'pulse25', f0: a.vary(500), f1: 300, dur: 0.05, vol: 0.12 }),
  stompMetal: (a) => {
    a.tone({ wave: 'triangle', f0: 1200, f1: 900, dur: 0.15, vol: 0.18 });
    a.tone({ wave: 'pulse50', f0: a.vary(400), f1: 120, dur: 0.12, vol: 0.18 });
  },
  buzz: (a) => a.tone({ wave: 'sawtooth', f0: a.vary(330), f1: 300, dur: 0.25, vol: 0.025, vibrato: 25 }),
  spamShake: (a) => {
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.03, vol: 0.12, type: 'bandpass', freq: 900, q: 2, at: i * 0.08 });
  },
  thud: (a) => {
    a.tone({ wave: 'triangle', f0: 120, f1: 40, dur: 0.15, vol: 0.35 });
    a.noise({ dur: 0.08, vol: 0.2, type: 'lowpass', freq: 600 });
  },
  spark: (a) => {
    for (let i = 0; i < 6; i++) a.noise({ dur: 0.02, vol: 0.12, type: 'highpass', freq: 4000 + Math.random() * 3000, at: i * 0.07 + Math.random() * 0.03 });
  },
  zap: (a) => {
    a.tone({ wave: 'sawtooth', f0: 120, f1: 80, dur: 0.35, vol: 0.12, vibrato: 40 });
    a.noise({ dur: 0.3, vol: 0.12, type: 'bandpass', freq: 3500, q: 1 });
  },
  crackle: (a) => a.noise({ dur: 0.05, vol: 0.05, type: 'highpass', freq: a.vary(5000) }),
  bubble: (a) => [0, 0.12, 0.22, 0.3, 0.4].forEach((t) => a.tone({ wave: 'sine', f0: a.vary(300), f1: 700, dur: 0.06, vol: 0.08, at: t })),
  geyser: (a) => a.noise({ dur: 0.5, vol: 0.2, type: 'bandpass', freq: 800, freq1: 2500, q: 0.8 }),
  crumble: (a) => {
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.04, vol: 0.12, type: 'lowpass', freq: 900, at: i * 0.09 });
  },
  pipe: (a) => [60, 55, 48].forEach((m, i) => a.tone({ wave: 'pulse50', f0: N(m), f1: N(m - 5), dur: 0.12, vol: 0.12, at: i * 0.1 })),
  doorOpen: (a) => {
    a.tone({ wave: 'sawtooth', f0: 70, f1: 50, dur: 0.9, vol: 0.12 });
    a.noise({ dur: 0.9, vol: 0.15, type: 'lowpass', freq: 500 });
    a.tone({ wave: 'pulse25', f0: N(64), dur: 0.2, vol: 0.1, at: 0.9 });
    a.tone({ wave: 'pulse25', f0: N(65), dur: 0.3, vol: 0.1, at: 1.05 });
  },
  sigh: (a) => {
    a.tone({ wave: 'triangle', f0: 600, f1: 380, dur: 0.6, vol: 0.08, attack: 0.08 });
    a.noise({ dur: 0.5, vol: 0.03, type: 'bandpass', freq: 1200, q: 1 });
  },

  // --- Guardián del Slot ---
  bossCrouch: (a) => a.tone({ wave: 'pulse50', f0: 300, f1: 150, dur: 0.5, vol: 0.12, curve: 'lin' }),
  bossLand: (a) => {
    a.tone({ wave: 'triangle', f0: 140, f1: 30, dur: 0.35, vol: 0.5 });
    a.noise({ dur: 0.3, vol: 0.35, type: 'lowpass', freq: 1200, freq1: 100 });
  },
  scrape: (a) => {
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.1, vol: 0.18, type: 'bandpass', freq: 1800, q: 3, at: i * 0.2 });
  },
  wallHit: (a) => {
    a.tone({ wave: 'triangle', f0: 100, f1: 30, dur: 0.4, vol: 0.5 });
    a.noise({ dur: 0.35, vol: 0.4, type: 'lowpass', freq: 2500, freq1: 100 });
    [84, 88, 91].forEach((m, i) => a.tone({ wave: 'pulse12', f0: N(m), dur: 0.08, vol: 0.06, at: 0.3 + i * 0.1 }));
  },
  bossHurt: (a) => {
    a.tone({ wave: 'sawtooth', f0: 500, f1: 80, dur: 0.4, vol: 0.2 });
    a.noise({ dur: 0.25, vol: 0.3, type: 'bandpass', freq: 1500, q: 1 });
  },
  bossDie: (a) => {
    for (let i = 0; i < 8; i++) a.noise({ dur: 0.18, vol: 0.3, type: 'lowpass', freq: 3000 - i * 300, freq1: 100, at: i * 0.12 });
    a.tone({ wave: 'sawtooth', f0: 400, f1: 30, dur: 1.2, vol: 0.18 });
  },
  cageDrop: (a) => {
    a.tone({ wave: 'triangle', f0: 1400, f1: 1300, dur: 0.4, vol: 0.12 });
    a.tone({ wave: 'triangle', f0: 120, f1: 50, dur: 0.25, vol: 0.4 });
  },
  cageOpen: (a) => [76, 79, 83, 88].forEach((m, i) => a.tone({ wave: 'pulse12', f0: N(m), dur: 0.08, vol: 0.1, at: i * 0.05 })),
  // Un fundador se une a la barra
  join: (a) => {
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.12, vol: 0.12, at: i * 0.06 }));
    a.tone({ wave: 'triangle', f0: N(48), dur: 0.8, vol: 0.3, at: 0.36 });
  },
};

// --- Hito 4: La UNA ---
Object.assign(SFX, {
  // Espiral de glitch al empezar una batalla
  battleStart: (a) => {
    for (let i = 0; i < 8; i++) a.tone({ wave: 'pulse12', f0: 300 + i * 180, f1: 200 + i * 120, dur: 0.05, vol: 0.09, at: i * 0.04 });
    a.noise({ dur: 0.45, vol: 0.18, type: 'bandpass', freq: 600, freq1: 4000, q: 2 });
    a.tone({ wave: 'triangle', f0: 90, f1: 45, dur: 0.4, vol: 0.3, at: 0.35 });
  },
  bugHit: (a) => {
    a.noise({ dur: 0.08, vol: 0.3, type: 'bandpass', freq: a.vary(2200), q: 2 });
    a.tone({ wave: 'pulse25', f0: a.vary(600), f1: 180, dur: 0.1, vol: 0.14 });
  },
  crit: (a) => {
    a.tone({ wave: 'triangle', f0: 200, f1: 40, dur: 0.35, vol: 0.45 });
    a.noise({ dur: 0.25, vol: 0.35, type: 'lowpass', freq: 5000, freq1: 300 });
    [84, 91].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.1, vol: 0.12, at: 0.05 + i * 0.06 }));
  },
  windup: (a) => a.tone({ wave: 'pulse25', f0: 220, f1: 880, dur: 0.5, vol: 0.08, curve: 'lin' }),
  impact: (a) => {
    a.tone({ wave: 'sawtooth', f0: 300, f1: 70, dur: 0.18, vol: 0.2 });
    a.noise({ dur: 0.12, vol: 0.25, type: 'lowpass', freq: 1800 });
  },
  parryPerfect: (a) => {
    a.tone({ wave: 'triangle', f0: 1800, f1: 2400, dur: 0.12, vol: 0.2 });
    a.tone({ wave: 'pulse12', f0: N(96), dur: 0.15, vol: 0.1, at: 0.04 });
    a.noise({ dur: 0.05, vol: 0.2, type: 'highpass', freq: 5000 });
  },
  parryGood: (a) => a.tone({ wave: 'triangle', f0: 1200, f1: 900, dur: 0.1, vol: 0.18 }),
  debugScan: (a) => {
    for (let i = 0; i < 6; i++) a.tone({ wave: 'pulse12', f0: 900 + i * 220, dur: 0.035, vol: 0.07, at: i * 0.045 });
    a.tone({ wave: 'sine', f0: 1600, f1: 400, dur: 0.4, vol: 0.06, at: 0.25 });
  },
  forceFail: (a) => {
    a.tone({ wave: 'sawtooth', f0: 330, f1: 310, dur: 0.18, vol: 0.12 });
    a.tone({ wave: 'sawtooth', f0: 220, f1: 200, dur: 0.3, vol: 0.12, at: 0.16 });
  },
  victory: (a) => [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => a.tone({ wave: 'pulse50', f0: N(m), dur: i === 6 ? 0.4 : 0.09, vol: 0.12, at: i * 0.08 })),
  flee: (a) => [76, 72, 67, 64].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.06, vol: 0.1, at: i * 0.05 })),
  buzzer: (a) => {
    a.tone({ wave: 'sawtooth', f0: 110, dur: 0.5, vol: 0.18 });
    a.tone({ wave: 'sawtooth', f0: 116, dur: 0.5, vol: 0.14 });
  },
  lever: (a) => {
    a.noise({ dur: 0.03, vol: 0.25, type: 'highpass', freq: 2500 });
    a.tone({ wave: 'triangle', f0: 260, f1: 180, dur: 0.08, vol: 0.25 });
  },
  pcOn: (a) => a.tone({ wave: 'pulse12', f0: a.vary(1400), f1: 2000, dur: 0.06, vol: 0.08 }),
  pcOff: (a) => a.tone({ wave: 'pulse12', f0: a.vary(1200), f1: 500, dur: 0.06, vol: 0.07 }),
  gateOpen: (a) => {
    a.tone({ wave: 'sawtooth', f0: 90, f1: 140, dur: 0.6, vol: 0.12 });
    a.noise({ dur: 0.6, vol: 0.12, type: 'bandpass', freq: 1500, q: 3 });
    [72, 79].forEach((m, i) => a.tone({ wave: 'pulse25', f0: N(m), dur: 0.12, vol: 0.1, at: 0.6 + i * 0.08 }));
  },
  push: (a) => a.noise({ dur: 0.18, vol: 0.15, type: 'lowpass', freq: a.vary(500), freq1: 200 }),
  hop: (a) => a.tone({ wave: 'pulse25', f0: a.vary(330), f1: a.vary(700), dur: 0.1, vol: 0.14 }),
  save: (a) => {
    [60, 67, 72, 76, 79].forEach((m, i) => a.tone({ wave: 'triangle', f0: N(m), dur: 0.2, vol: 0.18, at: i * 0.07 }));
    a.tone({ wave: 'pulse12', f0: N(96), dur: 0.3, vol: 0.05, at: 0.35 });
  },
  buy: (a) => {
    a.tone({ wave: 'pulse25', f0: N(84), dur: 0.05, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: N(91), dur: 0.12, vol: 0.12, at: 0.06 });
    a.noise({ dur: 0.05, vol: 0.1, type: 'highpass', freq: 6000, at: 0.02 });
  },
  denied: (a) => a.tone({ wave: 'pulse50', f0: 180, f1: 140, dur: 0.22, vol: 0.14 }),
  eat: (a) => [0, 0.1, 0.2].forEach((t) => a.noise({ dur: 0.05, vol: 0.12, type: 'bandpass', freq: a.vary(1200), q: 3, at: t })),
  // Batalla de rap
  scratch: (a) => {
    a.noise({ dur: 0.12, vol: 0.22, type: 'bandpass', freq: 800, freq1: 3000, q: 3 });
    a.noise({ dur: 0.12, vol: 0.18, type: 'bandpass', freq: 3000, freq1: 600, q: 3, at: 0.13 });
  },
  crowd: (a) => {
    a.noise({ dur: 1.2, vol: 0.2, type: 'bandpass', freq: 1100, q: 0.5, attack: 0.05 });
    for (let i = 0; i < 6; i++) a.tone({ wave: 'triangle', f0: 500 + Math.random() * 400, f1: 800 + Math.random() * 300, dur: 0.25, vol: 0.05, at: i * 0.1 });
  },
  boo: (a) => {
    a.tone({ wave: 'sawtooth', f0: 180, f1: 120, dur: 0.8, vol: 0.08, attack: 0.1 });
    a.noise({ dur: 0.8, vol: 0.1, type: 'lowpass', freq: 700, attack: 0.1 });
  },
  beatSelect: (a) => a.tone({ wave: 'pulse25', f0: N(79), dur: 0.05, vol: 0.12 }),
  // --- Nivel 3 · sigilo ---
  suspicious: (a) => {
    a.tone({ wave: 'triangle', f0: N(76), f1: N(80), dur: 0.12, vol: 0.12 });
    a.tone({ wave: 'triangle', f0: N(80), f1: N(83), dur: 0.12, vol: 0.1, at: 0.13 });
  },
  alert: (a) => {
    a.tone({ wave: 'pulse25', f0: N(88), dur: 0.06, vol: 0.18 });
    a.tone({ wave: 'pulse25', f0: N(93), dur: 0.14, vol: 0.18, at: 0.06 });
  },
  alarm: (a) => {
    for (let i = 0; i < 4; i++) a.tone({ wave: 'sawtooth', f0: 660, f1: 990, dur: 0.22, vol: 0.09, at: i * 0.26 });
  },
  calm: (a) => a.tone({ wave: 'triangle', f0: N(72), f1: N(67), dur: 0.35, vol: 0.12 }),
  hackKey: (a) => a.tone({ wave: 'pulse12', f0: a.vary(1500), dur: 0.035, vol: 0.1 }),
  hackError: (a) => {
    a.tone({ wave: 'pulse50', f0: 140, f1: 110, dur: 0.16, vol: 0.16 });
    a.noise({ dur: 0.08, vol: 0.12, type: 'bandpass', freq: 900 });
  },
  hackOk: (a) => [N(76), N(81), N(88)].forEach((f, i) => a.tone({ wave: 'pulse25', f0: f, dur: 0.07, vol: 0.13, at: i * 0.06 })),
  hackOpen: (a) => {
    a.tone({ wave: 'pulse25', f0: 300, f1: 900, dur: 0.12, vol: 0.1 });
    a.noise({ dur: 0.05, vol: 0.08, type: 'highpass', freq: 4000, at: 0.1 });
  },
  vapor: (a) => {
    a.noise({ dur: 0.45, vol: 0.18, type: 'lowpass', freq: 1800, freq1: 400, attack: 0.04 });
    a.tone({ wave: 'sine', f0: 220, f1: 160, dur: 0.3, vol: 0.05 });
  },
  servo: (a) => a.noise({ dur: 0.08, vol: 0.05, type: 'bandpass', freq: 2200, q: 6 }),
  stun: (a) => {
    a.tone({ wave: 'pulse12', f0: 1800, f1: 300, dur: 0.18, vol: 0.12 });
    a.noise({ dur: 0.1, vol: 0.12, type: 'highpass', freq: 3000 });
  },
  laserOn: (a) => a.tone({ wave: 'sawtooth', f0: 90, f1: 120, dur: 0.12, vol: 0.05 }),
  vacuumBump: (a) => {
    a.tone({ wave: 'pulse25', f0: N(84), dur: 0.08, vol: 0.12 });
    a.tone({ wave: 'pulse25', f0: N(79), dur: 0.12, vol: 0.12, at: 0.09 });
  },
  // --- Escudo Firewall ---
  shieldOn: (a) => {
    a.tone({ wave: 'triangle', f0: 180, f1: 420, dur: 0.16, vol: 0.14 });
    a.tone({ wave: 'pulse12', f0: 900, f1: 1300, dur: 0.1, vol: 0.06, at: 0.03 });
  },
  shieldBlock: (a) => {
    a.tone({ wave: 'triangle', f0: 520, f1: 380, dur: 0.1, vol: 0.16 });
    a.noise({ dur: 0.05, vol: 0.12, type: 'bandpass', freq: 3200, q: 2 });
  },
  parry: (a) => {
    a.tone({ wave: 'pulse25', f0: N(91), dur: 0.05, vol: 0.18 });
    a.tone({ wave: 'triangle', f0: N(98), f1: N(103), dur: 0.25, vol: 0.18, at: 0.03 });
    a.noise({ dur: 0.12, vol: 0.15, type: 'highpass', freq: 5000 });
  },
  // --- DEADLINE ---
  tick: (a) => a.noise({ dur: 0.02, vol: 0.22, type: 'bandpass', freq: 3200, q: 8 }),
  tock: (a) => a.noise({ dur: 0.025, vol: 0.2, type: 'bandpass', freq: 1900, q: 8 }),
  envelope: (a) => a.noise({ dur: 0.06, vol: 0.1, type: 'bandpass', freq: a.vary(2600), q: 2 }),
  notif: (a) => {
    a.tone({ wave: 'sine', f0: N(84), dur: 0.08, vol: 0.14 });
    a.tone({ wave: 'sine', f0: N(91), dur: 0.12, vol: 0.12, at: 0.08 });
  },
  freeze: (a) => {
    a.tone({ wave: 'triangle', f0: 1400, f1: 300, dur: 0.5, vol: 0.14 });
    a.noise({ dur: 0.4, vol: 0.1, type: 'highpass', freq: 6000, freq1: 2000 });
  },
  expired: (a) => {
    a.tone({ wave: 'sawtooth', f0: 220, f1: 110, dur: 0.6, vol: 0.14 });
    for (let i = 0; i < 3; i++) a.tone({ wave: 'pulse50', f0: 880, dur: 0.08, vol: 0.1, at: i * 0.15 });
  },
  clockBreak: (a) => {
    a.noise({ dur: 0.7, vol: 0.3, type: 'lowpass', freq: 5000, freq1: 300 });
    for (let i = 0; i < 6; i++) a.tone({ wave: 'triangle', f0: 1200 + i * 300, f1: 500, dur: 0.15, vol: 0.06, at: i * 0.08 });
  },
  turretShot: (a) => a.tone({ wave: 'pulse25', f0: 700, f1: 400, dur: 0.08, vol: 0.1 }),

  // --- Nivel 4 · Santa Cruz ---
  // Lazo: silbido al lanzar, "tink" al engancharse (docs/05_audio.md)
  lassoThrow: (a) => a.noise({ dur: 0.16, vol: 0.12, type: 'bandpass', freq: a.vary(1800), freq1: 3600, q: 4 }),
  lassoHook: (a) => {
    a.tone({ wave: 'triangle', f0: N(96), dur: 0.05, vol: 0.14 });
    a.tone({ wave: 'pulse12', f0: N(103), dur: 0.09, vol: 0.08, at: 0.03 });
  },
  lassoRelease: (a) => a.tone({ wave: 'pulse25', f0: a.vary(500), f1: a.vary(1100), dur: 0.12, vol: 0.12 }),
  lassoSwing: (a) => [0, 0.18, 0.36].forEach((t) => a.noise({ dur: 0.1, vol: 0.06, type: 'bandpass', freq: 1400, freq1: 2400, q: 3, at: t })),
  ropeCut: (a) => {
    a.noise({ dur: 0.06, vol: 0.2, type: 'highpass', freq: 3000 });
    a.tone({ wave: 'pulse12', f0: 900, f1: 300, dur: 0.1, vol: 0.08 });
  },
  // Bombeta: silbido + explosión
  bombetaThrow: (a) => a.tone({ wave: 'sine', f0: a.vary(1600), f1: 700, dur: 0.6, vol: 0.07 }),
  bombetaBoom: (a) => {
    a.noise({ dur: 0.35, vol: 0.38, type: 'lowpass', freq: a.vary(2200), freq1: 120 });
    a.tone({ wave: 'triangle', f0: 120, f1: 40, dur: 0.3, vol: 0.3 });
  },
  fuse: (a) => a.noise({ dur: 0.3, vol: 0.06, type: 'highpass', freq: 5000 }),
  toroCharge: (a) => {
    a.tone({ wave: 'sawtooth', f0: 90, f1: 60, dur: 0.35, vol: 0.14 });
    [0, 0.12, 0.24].forEach((t) => a.noise({ dur: 0.05, vol: 0.18, type: 'lowpass', freq: 500, at: t }));
  },
  zanate: (a) => {
    a.tone({ wave: 'pulse12', f0: a.vary(1900), f1: 2600, dur: 0.07, vol: 0.07 });
    a.tone({ wave: 'pulse12', f0: a.vary(2200), f1: 1500, dur: 0.09, vol: 0.06, at: 0.08 });
  },
  dive: (a) => a.noise({ dur: 0.25, vol: 0.08, type: 'bandpass', freq: 2500, freq1: 900, q: 2 }),
  potRattle: (a) => [0, 0.07, 0.14, 0.21].forEach((t) => a.noise({ dur: 0.03, vol: 0.1, type: 'bandpass', freq: a.vary(3200), q: 6, at: t })),
  snort: (a) => a.noise({ dur: 0.4, vol: 0.18, type: 'lowpass', freq: 900, freq1: 300 }),
  smoke: (a) => a.noise({ dur: 0.9, vol: 0.14, type: 'lowpass', freq: 1500, freq1: 200 }),
  roar: (a) => {
    a.tone({ wave: 'sawtooth', f0: 110, f1: 70, dur: 0.9, vol: 0.2, vibrato: 8 });
    a.noise({ dur: 0.8, vol: 0.15, type: 'lowpass', freq: 800 });
  },
  // Campana del campanario
  bell: (a) => {
    a.tone({ wave: 'sine', f0: N(64), dur: 2.2, vol: 0.22 });
    a.tone({ wave: 'sine', f0: N(64) * 2.76, dur: 1.4, vol: 0.06 });
    a.tone({ wave: 'triangle', f0: N(52), dur: 1.8, vol: 0.12 });
  },
  water: (a) => {
    a.noise({ dur: 0.25, vol: 0.16, type: 'bandpass', freq: a.vary(1200), freq1: 2600, q: 2 });
    [0, 0.06, 0.12].forEach((t, i) => a.tone({ wave: 'sine', f0: N(84 + i * 3), dur: 0.05, vol: 0.06, at: t }));
  },
  // Se derrite un cuadrito por el calor
  heatBurn: (a) => {
    a.noise({ dur: 0.4, vol: 0.16, type: 'highpass', freq: 2500, freq1: 6000 });
    a.tone({ wave: 'pulse50', f0: N(72), f1: N(60), dur: 0.35, vol: 0.12 });
  },
  sizzle: (a) => a.noise({ dur: 0.05, vol: 0.035, type: 'highpass', freq: a.vary(5000) }),
  foodPick: (a) => [N(76), N(79), N(84)].forEach((f, i) => a.tone({ wave: 'triangle', f0: f, dur: 0.07, vol: 0.12, at: i * 0.05 })),
  portal: (a) => {
    a.tone({ wave: 'triangle', f0: 200, f1: 900, dur: 0.7, vol: 0.14, vibrato: 10 });
    a.noise({ dur: 0.6, vol: 0.08, type: 'bandpass', freq: 3000, q: 3 });
  },
});

export function playSfx(audio, name) {
  const fn = SFX[name];
  if (fn && audio && audio.ctx) fn(audio);
}
