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
};

export function playSfx(audio, name) {
  const fn = SFX[name];
  if (fn && audio && audio.ctx) fn(audio);
}
