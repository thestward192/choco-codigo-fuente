// Nivel 4 · Santa Cruz. Composiciones originales (docs/05_audio.md):
//   Santa Cruz: festiva, con marimba y rasgueo, en 3/4 que alterna con 6/8 (el vaivén de la
//   música folclórica guanacasteca). Re mayor, 138 BPM.
//   Torito Kernel: el mismo tema en Re menor, más rápido, con bajo insistente y percusión pesada.
//   Atardecer: el tema despacio, solo marimba y colchón (práctica del lazo, sin calor).
const rep = (s, n) => Array(n).fill(s).join(' ');

// Un compás = 12 pasos (3/4 con corcheas de 2 pasos)
const CHORDS = ['D', 'D', 'A', 'A', 'A', 'A', 'D', 'D', 'G', 'G', 'D', 'D', 'A', 'A', 'D', 'D'];
const TONES = {
  D: { root: 'D2', fifth: 'A1', arp: ['D4', 'F#4', 'A4', 'F#4', 'A4', 'D5'] },
  A: { root: 'A1', fifth: 'E2', arp: ['C#4', 'E4', 'A4', 'E4', 'G4', 'E4'] },
  G: { root: 'G1', fifth: 'D2', arp: ['B3', 'D4', 'G4', 'D4', 'G4', 'B4'] },
  Dm: { root: 'D2', fifth: 'A1', arp: ['D4', 'F4', 'A4', 'F4', 'A4', 'D5'] },
  Gm: { root: 'G1', fifth: 'D2', arp: ['Bb3', 'D4', 'G4', 'D4', 'G4', 'Bb4'] },
};

const MELODY = [
  'A4:2 D5:2 F#5:2 A5:4 F#5:2',
  'G5:2 F#5:2 E5:2 F#5:6',
  'E5:2 A4:2 C#5:2 E5:4 C#5:2',
  'D5:2 C#5:2 B4:2 A4:6',
  'C#5:2 E5:2 A5:2 G5:4 E5:2',
  'F#5:2 E5:2 D5:2 C#5:6',
  'D5:2 F#5:2 A5:2 B5:4 A5:2',
  'F#5:4 D5:2 D5:6',
  'B4:2 D5:2 G5:2 B5:4 G5:2',
  'A5:2 G5:2 F#5:2 G5:6',
  'F#5:2 A5:2 D6:2 A5:4 F#5:2',
  'E5:2 F#5:2 G5:2 F#5:6',
  'E5:2 G5:2 A5:2 C#6:4 A5:2',
  'G5:2 F#5:2 E5:2 C#5:6',
  'D5:2 E5:2 F#5:2 A5:2 F#5:2 E5:2',
  'D5:12',
];

// Bajo: los compases impares en 6/8 (dos golpes), los pares en 3/4 (tres golpes): el vaivén
function bass(chords, drive = false) {
  return chords
    .map((c, i) => {
      const t = TONES[c];
      if (drive) return rep(`${t.root}:2`, 6);
      return i % 2 === 0 ? `${t.root}:6 ${t.fifth}:6` : `${t.root}:4 ${t.fifth}:4 ${t.root}:4`;
    })
    .join(' ');
}

function strum(chords) {
  return chords.map((c) => TONES[c].arp.map((n) => `${n}:2`).join(' ')).join(' ');
}

// Re mayor → Re menor (Fa# → Fa, Do# → Do) y los acordes a menor
const minorize = (s) => s.replace(/F#/g, 'F').replace(/C#/g, 'C');
const MINOR_CHORDS = CHORDS.map((c) => (c === 'D' ? 'Dm' : c === 'G' ? 'Gm' : c));

export const SONG_SANTACRUZ = {
  id: 'santacruz',
  bpm: 138,
  loop: true,
  channels: [
    { id: 'marimba', instrument: 'marimba', volume: 0.9, notes: MELODY.join(' ') },
    { id: 'strum', instrument: 'arp', volume: 0.5, notes: strum(CHORDS) },
    { id: 'bass', instrument: 'bass', volume: 0.8, notes: bass(CHORDS) },
    { id: 'drums', instrument: 'drums', volume: 0.6, notes: rep('k:2 h:2 s:2 k:2 h:2 s:2', 8) + ' ' + rep('k:4 s:4 h:2 h:2', 8) },
  ],
};

export const SONG_TORITO = {
  id: 'torito',
  bpm: 168,
  loop: true,
  channels: [
    { id: 'lead', instrument: 'lead', volume: 0.6, notes: minorize(MELODY.join(' ')) },
    { id: 'marimba', instrument: 'marimba', volume: 0.6, notes: strum(MINOR_CHORDS) },
    { id: 'bass', instrument: 'bass', volume: 1, notes: bass(MINOR_CHORDS, true) },
    { id: 'drums', instrument: 'drums', volume: 0.95, notes: rep('k:2 k:2 s:2 k:2 h:2 s:2', 16) },
  ],
};

export const SONG_ATARDECER = {
  id: 'atardecer',
  bpm: 96,
  loop: true,
  channels: [
    { id: 'marimba', instrument: 'marimba', volume: 0.8, notes: MELODY.join(' ') },
    { id: 'pad', instrument: 'pad', volume: 0.6, notes: CHORDS.map((c) => `${TONES[c].arp[2]}:12`).join(' ') },
    { id: 'bass', instrument: 'bass', volume: 0.6, notes: CHORDS.map((c) => `${TONES[c].root}:12`).join(' ') },
  ],
};
