// Nivel 2 · La UNA. Composiciones originales (docs/05_audio.md):
//   UNA: exploración relajada, de "pueblo" de RPG (Fa mayor, 96 BPM, marimba).
//   Batalla: enérgica, con bajo constante (La menor, 150 BPM).
//   Beat de rap: 90 BPM exactos con bombo marcado (la mecánica de la batalla depende del tempo).
import { RAP } from '../../config/balance.js';

const rep = (s, n) => Array(n).fill(s).join(' ');

// ---------- UNA (exploración) ----------
const UNA_CHORDS = [
  ['F4', 'A4', 'C5', 'F2', 'C3'],
  ['A4', 'C5', 'E5', 'A2', 'E3'],
  ['Bb4', 'D5', 'F5', 'Bb1', 'F2'],
  ['C5', 'E5', 'G5', 'C2', 'G2'],
  ['F4', 'A4', 'C5', 'F2', 'C3'],
  ['D4', 'F4', 'A4', 'D2', 'A2'],
  ['G4', 'Bb4', 'D5', 'G2', 'D3'],
  ['C5', 'E5', 'G5', 'C2', 'G2'],
];
const UNA_MELODY = [
  'A4:4 C5:2 F5:2 E5:4 C5:4',
  'E5:4 A4:2 C5:2 E5:6 D5:2',
  'D5:4 F5:2 D5:2 Bb4:4 C5:4',
  'C5:4 E5:2 G5:2 E5:4 r:4',
  'F5:4 E5:2 F5:2 A5:4 G5:4',
  'F5:4 D5:4 A4:4 D5:4',
  'D5:2 E5:2 F5:4 G5:4 Bb4:4',
  'C5:8 r:4 G4:4',
].join(' ');

export const SONG_UNA = {
  id: 'una',
  bpm: 96,
  loop: true,
  channels: [
    { id: 'lead', instrument: 'lead25', volume: 0.8, notes: UNA_MELODY },
    { id: 'marimba', instrument: 'marimba', volume: 0.8, notes: UNA_CHORDS.map(([a, b, c]) => rep(`${a}:2 ${b}:2 ${c}:2 ${b}:2`, 2)).join(' ') },
    { id: 'bass', instrument: 'bass', volume: 0.8, notes: UNA_CHORDS.map(([, , , r, f]) => `${r}:8 ${f}:8`).join(' ') },
    { id: 'drums', instrument: 'drums', volume: 0.35, notes: rep('k:4 h:4 s:4 h:2 h:2', 8) },
  ],
};

// ---------- Batalla ----------
const BATTLE_ROOTS = ['A', 'A', 'F', 'G', 'A', 'C', 'F', 'E'];
const BATTLE_ARPS = {
  A: ['A4', 'C5', 'E5', 'C5'],
  F: ['F4', 'A4', 'C5', 'A4'],
  G: ['G4', 'B4', 'D5', 'B4'],
  C: ['C5', 'E5', 'G5', 'E5'],
  E: ['E4', 'G#4', 'B4', 'G#4'],
};
const BATTLE_MELODY = [
  'A5:2 E5:2 A5:2 C6:2 B5:2 A5:2 G5:2 E5:2',
  'A5:4 E5:2 A5:2 C6:4 D6:4',
  'C6:2 A5:2 F5:2 A5:2 C6:4 F6:4',
  'D6:2 B5:2 G5:2 B5:2 D6:4 G6:4',
  'E6:2 C6:2 A5:2 C6:2 E6:4 A5:4',
  'G5:2 E5:2 C6:2 E5:2 G5:4 E5:4',
  'F5:4 C6:4 A5:4 F5:4',
  'E5:2 G#5:2 B5:2 E6:2 G#5:4 B5:4',
].join(' ');

export const SONG_BATTLE = {
  id: 'battle',
  bpm: 150,
  loop: true,
  channels: [
    { id: 'lead', instrument: 'lead', volume: 0.75, notes: BATTLE_MELODY },
    { id: 'arp', instrument: 'arp', volume: 0.7, notes: BATTLE_ROOTS.map((r) => rep(BATTLE_ARPS[r].map((n) => `${n}:1`).join(' '), 4)).join(' ') },
    { id: 'bass', instrument: 'bass', notes: BATTLE_ROOTS.map((r) => rep(`${r}2:1 ${r}2:1 ${r}3:1 ${r}2:1`, 4)).join(' ') },
    { id: 'drums', instrument: 'drums', volume: 0.9, notes: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:1 h:1', 8) },
  ],
};

// ---------- Beat de rap (MC Stack Overflow) ----------
// 4 compases de 16 semicorcheas. Bombo en el 1 y en el "y" del 2, caja en 2 y 4.
const RAP_BASS = ['D2:6 D2:2 r:4 F2:2 A2:2', 'Bb1:6 Bb1:2 r:4 D2:2 F2:2', 'G1:6 G1:2 r:4 Bb1:2 D2:2', 'A1:6 A1:2 r:2 E2:2 A2:2 C#3:2'].join(' ');
const RAP_KEYS = ['F4:8 A4:8', 'F4:8 D4:8', 'D4:8 Bb4:8', 'C#5:8 E4:8'].join(' ');

export const SONG_RAP = {
  id: 'rap',
  bpm: RAP.BPM,
  loop: true,
  channels: [
    { id: 'kick', instrument: 'drums', volume: 1.25, notes: rep('k:4 r:2 k:2 r:6 k:2', 4) },
    { id: 'snare', instrument: 'drums', volume: 1, notes: rep('r:4 s:4 r:4 s:4', 4) },
    { id: 'hat', instrument: 'drums', volume: 0.7, notes: rep('h:2 h:2 h:2 o:2 h:2 h:2 h:1 h:1 h:2', 4) },
    { id: 'bass', instrument: 'bass', volume: 0.9, notes: RAP_BASS },
    { id: 'keys', instrument: 'pad', volume: 0.9, notes: RAP_KEYS },
  ],
};
