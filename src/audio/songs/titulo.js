// "Tema de Choco" — pantalla de título y menús. Composición original.
// Sección A heroica (Re mayor) y sección B melancólica (Si menor).

const rep = (s, n) => Array(n).fill(s).join(' ');

// Acordes por compás (A y B), con sus notas para el arpegio y la raíz/quinta para el bajo
const CHORDS = {
  D: { arp: ['D5', 'F#5', 'A5', 'F#5'], bass: ['D3', 'A2'] },
  A: { arp: ['C#5', 'E5', 'A5', 'E5'], bass: ['A2', 'E3'] },
  Bm: { arp: ['B4', 'D5', 'F#5', 'D5'], bass: ['B2', 'F#2'] },
  G: { arp: ['B4', 'D5', 'G5', 'D5'], bass: ['G2', 'D3'] },
  Em: { arp: ['B4', 'E5', 'G5', 'E5'], bass: ['E2', 'B2'] },
};
const PROGRESSION = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A'];

const arp = PROGRESSION.map((c) => rep(CHORDS[c].arp.map((n) => `${n}:1`).join(' '), 4)).join(' ');
const bass = PROGRESSION.map((c, i) => {
  const [r, f] = CHORDS[c].bass;
  // Sección A: bajo en corcheas con salto; sección B: más quieto
  return i < 8 ? `${r}:2 ${r}:2 ${f}:2 ${r}:2 ${r}:2 ${f}:2 ${r}:2 ${f}:2` : `${r}:6 ${f}:2 ${r}:8`;
}).join(' ');

export const SONG_TITULO = {
  id: 'titulo',
  bpm: 116,
  loop: true,
  channels: [
    {
      id: 'lead',
      instrument: 'lead25',
      notes: [
        // A
        'F#5:2 A5:2 D6:4 C#6:2 B5:2 A5:4',
        'E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4',
        'F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4',
        'G5:4 B5:4 A5:4 G5:2 F#5:2',
        'F#5:2 A5:2 D6:4 E6:2 F#6:2 E6:4',
        'C#6:2 A5:2 E5:2 A5:2 C#6:4 E6:4',
        'D6:4 B5:2 G5:2 E6:4 D6:2 B5:2',
        'A5:8 r:4 A5:2 C#6:2',
        // B
        'B5:6 A5:2 F#5:4 D5:4',
        'G5:6 F#5:2 E5:4 D5:4',
        'F#5:6 E5:2 D5:4 A4:4',
        'C#5:4 E5:4 A5:8',
        'B5:4 D6:4 C#6:4 B5:4',
        'B5:4 A5:4 G5:4 F#5:4',
        'G5:4 F#5:4 E5:4 G5:4',
        'A5:8 C#6:4 E6:4',
      ].join(' '),
    },
    { id: 'arp', instrument: 'arp', volume: 0.8, notes: arp },
    { id: 'bass', instrument: 'bass', notes: bass },
    {
      id: 'drums',
      instrument: 'drums',
      notes: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:1 h:1', 8) + ' ' + rep('k:4 h:4 s:4 h:2 h:2', 8),
    },
  ],
};
