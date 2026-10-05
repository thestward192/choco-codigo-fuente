// Nivel 5 · El Código Puro y el final. Composiciones originales (docs/05_audio.md):
//   El Stack: tensa y ascendente (Mi menor, 150 BPM): el bajo sube nota por nota cada compás.
//   N.U.L.L. Final: 4 capas que se suman fase a fase (base + motivo, arpegio roto, colchón y el
//   tema de Choco transportado, que choca contra el motivo de N.U.L.L.).
//   Parche / Final: el tema de Choco lento y emotivo; el motivo de N.U.L.L. resuelto en mayor.
const rep = (s, n) => Array(n).fill(s).join(' ');

// ---------- El Stack ----------
const STACK_BARS = [
  { root: 'E2', arp: ['E4', 'G4', 'B4', 'G4'], lead: 'E5:4 G5:2 B5:2 A5:4 G5:4' },
  { root: 'F#2', arp: ['F#4', 'A4', 'C5', 'A4'], lead: 'F#5:4 A5:2 C6:2 B5:4 A5:4' },
  { root: 'G2', arp: ['G4', 'B4', 'D5', 'B4'], lead: 'G5:4 B5:2 D6:2 C6:4 B5:4' },
  { root: 'A2', arp: ['A4', 'C5', 'E5', 'C5'], lead: 'A5:4 C6:2 E6:2 D6:4 C6:4' },
  { root: 'B2', arp: ['B4', 'D#5', 'F#5', 'D#5'], lead: 'B5:2 A5:2 G5:2 F#5:2 D#5:8' },
  { root: 'C3', arp: ['C5', 'E5', 'G5', 'E5'], lead: 'E5:4 G5:4 C6:6 B5:2' },
  { root: 'D3', arp: ['D5', 'F#5', 'A5', 'F#5'], lead: 'F#5:4 A5:4 D6:6 C6:2' },
  { root: 'B2', arp: ['B4', 'D#5', 'F#5', 'B5'], lead: 'B5:4 D#6:4 F#6:4 E6:2 D#6:2' },
];

export const SONG_STACK = {
  id: 'stack',
  bpm: 150,
  loop: true,
  channels: [
    { id: 'lead', instrument: 'lead25', volume: 0.55, notes: STACK_BARS.map((b) => b.lead).join(' ') },
    { id: 'arp', instrument: 'arp', volume: 0.6, notes: STACK_BARS.map((b) => rep(b.arp.map((n) => `${n}:1`).join(' '), 4)).join(' ') },
    { id: 'bass', instrument: 'bass', volume: 0.9, notes: STACK_BARS.map((b) => rep(`${b.root}:2`, 8)).join(' ') },
    { id: 'drums', instrument: 'drums', volume: 0.7, notes: rep('k:2 h:2 s:2 h:2 k:2 h:1 h:1 s:2 o:2', 8) },
  ],
};

// ---------- N.U.L.L. Final (capas: motif → arp → pad → choco) ----------
const MOTIF = 'E4:4 F4:4 B4:4 A#4:4';
const MOTIF_HI = 'E5:4 F5:4 B5:4 A#5:4';
// Sección A del tema de Choco (el mismo de la pantalla de título), en 8 compases
const CHOCO_THEME = [
  'F#5:2 A5:2 D6:4 C#6:2 B5:2 A5:4',
  'E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4',
  'F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4',
  'G5:4 B5:4 A5:4 G5:2 F#5:2',
  'F#5:2 A5:2 D6:4 E6:2 F#6:2 E6:4',
  'C#6:2 A5:2 E5:2 A5:2 C#6:4 E6:4',
  'D6:4 B5:2 G5:2 E6:4 D6:2 B5:2',
  'A5:8 r:4 A5:2 C#6:2',
].join(' ');

export const NULL_LAYERS = ['motif', 'arp', 'pad', 'choco'];

export const SONG_NULL_FINAL = {
  id: 'nullFinal',
  bpm: 140,
  loop: true,
  layersOn: ['motif'],
  channels: [
    { id: 'bass', instrument: 'bass', volume: 0.95, notes: rep('E2:2 E2:2 F2:2 E2:2 E2:2 B1:2 E2:2 A#1:2', 8) },
    { id: 'drums', instrument: 'drums', volume: 0.8, notes: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:1 h:1', 8) },
    { id: 'motif', instrument: 'lead', volume: 0.6, layer: 'motif', notes: [MOTIF, MOTIF, MOTIF_HI, MOTIF_HI, MOTIF, MOTIF, MOTIF_HI, 'E5:2 F5:2 B5:2 A#5:2 E6:8'].join(' ') },
    { id: 'arp', instrument: 'arp', volume: 0.5, layer: 'arp', notes: rep('E5:1 B5:1 F5:1 E6:1 E5:1 E5:1 A#5:1 F6:1', 16) },
    { id: 'pad', instrument: 'pad', volume: 0.6, layer: 'pad', notes: rep('E4:16 F4:16', 4) },
    { id: 'choco', instrument: 'lead25', volume: 0.55, layer: 'choco', transpose: 2, notes: CHOCO_THEME },
  ],
};

// ---------- Parche / Final ----------
const FINAL_CHORDS = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'];
const FINAL_TONES = {
  D: { root: 'D2', pad: 'F#4' },
  A: { root: 'A1', pad: 'E4' },
  Bm: { root: 'B1', pad: 'D4' },
  G: { root: 'G1', pad: 'B3' },
};

export const SONG_FINAL = {
  id: 'final',
  bpm: 76,
  loop: true,
  channels: [
    // El tema de Choco despacio y, al final, el motivo de N.U.L.L. que esta vez resuelve en mayor
    { id: 'lead', instrument: 'lead25', volume: 0.55, notes: `${CHOCO_THEME} ${MOTIF_HI} G#5:8 B5:8` },
    { id: 'marimba', instrument: 'marimba', volume: 0.5, notes: FINAL_CHORDS.map((c) => rep(`${FINAL_TONES[c].pad}:4`, 4)).join(' ') + ' ' + rep('E4:4', 4) + ' E4:4 G#4:4 B4:4 E5:4' },
    { id: 'pad', instrument: 'pad', volume: 0.7, notes: FINAL_CHORDS.map((c) => `${FINAL_TONES[c].pad}:16`).join(' ') + ' E4:16 G#4:16' },
    { id: 'bass', instrument: 'bass', volume: 0.7, notes: FINAL_CHORDS.map((c) => `${FINAL_TONES[c].root}:8 ${FINAL_TONES[c].root}:8`).join(' ') + ' E2:16 E2:16' },
  ],
};
