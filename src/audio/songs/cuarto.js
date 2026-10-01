// "Medianoche en Santa Cruz" — el cuarto de Choco (prólogo). Composición original.
// Calmada, lo-fi, con una marimba lejana (triangular con decay corto) — docs/05_audio.md
// Acordes: Fmaj7 · Em7 · Dm7 · Cmaj7 · Sib maj7 · Am7 · Gm7 · C7

const rep = (str, n) => Array(n).fill(str).join(' ');
const CHORDS = [
  { pad: ['A4', 'E5'], bass: ['F2', 'C3'], arp: ['F5', 'A5', 'C6', 'E6'] },
  { pad: ['G4', 'D5'], bass: ['E2', 'B2'], arp: ['E5', 'G5', 'B5', 'D6'] },
  { pad: ['F4', 'C5'], bass: ['D2', 'A2'], arp: ['D5', 'F5', 'A5', 'C6'] },
  { pad: ['E4', 'B4'], bass: ['C2', 'G2'], arp: ['C5', 'E5', 'G5', 'B5'] },
  { pad: ['D4', 'A4'], bass: ['A#1', 'F2'], arp: ['A#4', 'D5', 'F5', 'A5'] },
  { pad: ['C4', 'G4'], bass: ['A1', 'E2'], arp: ['A4', 'C5', 'E5', 'G5'] },
  { pad: ['A#3', 'F4'], bass: ['G1', 'D2'], arp: ['G4', 'A#4', 'D5', 'F5'] },
  { pad: ['E4', 'A#4'], bass: ['C2', 'G2'], arp: ['C5', 'E5', 'G5', 'A#5'] },
];

const pad1 = CHORDS.map((c) => `${c.pad[0]}:16`).join(' ');
const pad2 = CHORDS.map((c) => `${c.pad[1]}:16`).join(' ');
const bass = CHORDS.map(({ bass: [r, f] }) => `${r}:6 ${r}:2 ${f}:4 ${r}:4`).join(' ');
// Marimba: arpegio en corcheas con huecos (suena "lejos")
const marimba = CHORDS.map(({ arp: [a, b, c, d] }, i) => (i % 2 === 0 ? `${a}:2 ${b}:2 ${c}:2 ${d}:2 r:2 ${c}:2 ${b}:2 r:2` : `r:2 ${b}:2 ${c}:2 r:2 ${d}:2 ${c}:2 ${a}:4`)).join(' ');
// Melodía suave (entra la segunda vuelta)
const melody = [
  'r:8 C6:2 A5:2 G5:4',
  'B5:6 G5:2 E5:8',
  'r:8 A5:2 F5:2 E5:4',
  'G5:12 r:4',
  'r:4 F5:2 G5:2 A5:4 C6:4',
  'B5:4 A5:4 E5:8',
  'r:4 D5:2 F5:2 A5:4 G5:4',
  'E5:12 r:4',
].join(' ');

export const SONG_CUARTO = {
  id: 'cuarto',
  bpm: 76,
  loop: true,
  channels: [
    { id: 'pad1', instrument: 'pad', volume: 0.9, notes: pad1 },
    { id: 'pad2', instrument: 'pad', volume: 0.7, notes: pad2 },
    { id: 'bass', instrument: 'bass', volume: 0.7, gate: 0.7, notes: bass },
    { id: 'marimba', instrument: 'marimba', volume: 0.45, notes: marimba },
    { id: 'melody', instrument: 'lead25', volume: 0.45, notes: `r:128 ${melody}` },
    { id: 'drums', instrument: 'drums', volume: 0.35, notes: rep('k:4 h:2 h:2 s:4 h:2 k:2', 8) },
  ],
};
