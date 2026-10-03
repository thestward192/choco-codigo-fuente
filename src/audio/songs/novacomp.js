// Nivel 3 · Novacomp. Composiciones originales (docs/05_audio.md):
//   Novacomp: sigilosa, bajo pulsante y pocos elementos (Re menor, 100 BPM). Capa "alarm":
//   percusión y una sirena en pulso que entran cuando suena la alarma.
//   DEADLINE: tic-tac incorporado a la percusión (Mi menor, 132 BPM); el jefe agrega un
//   tic-tac propio que se acelera con cada tercio.
const rep = (s, n) => Array(n).fill(s).join(' ');

// ---------- Novacomp (sigilo) ----------
const NOVA_ROOTS = ['D2', 'D2', 'Bb1', 'Bb1', 'G1', 'G1', 'A1', 'A1'];
const NOVA_PAD = ['D4', 'D4', 'F4', 'F4', 'D4', 'D4', 'E4', 'C#4'];
const NOVA_LEAD = [
  'r:8 A4:2 r:2 D5:2 r:2',
  'F5:4 E5:2 r:2 D5:4 r:4',
  'r:8 Bb4:2 r:2 D5:2 r:2',
  'F5:4 G5:2 r:2 F5:4 r:4',
  'r:8 G4:2 r:2 Bb4:2 r:2',
  'D5:4 C5:2 r:2 Bb4:4 r:4',
  'r:4 A4:2 r:2 C#5:2 r:2 E5:2 r:2',
  'G5:4 F5:2 E5:2 C#5:8',
].join(' ');

export const SONG_NOVACOMP = {
  id: 'novacomp',
  bpm: 100,
  loop: true,
  channels: [
    { id: 'bass', instrument: 'bass', volume: 0.85, notes: NOVA_ROOTS.map((r) => rep(`${r}:2`, 8)).join(' ') },
    { id: 'pad', instrument: 'pad', volume: 0.55, notes: NOVA_PAD.map((n) => `${n}:16`).join(' ') },
    { id: 'lead', instrument: 'lead25', volume: 0.5, notes: NOVA_LEAD },
    { id: 'tick', instrument: 'drums', volume: 0.4, notes: rep('r:2 h:2', 32) },
    { id: 'alarmDrums', instrument: 'drums', volume: 0.9, layer: 'alarm', notes: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2', 8) },
    { id: 'siren', instrument: 'lead', volume: 0.35, layer: 'alarm', notes: rep('A5:8 D6:8', 8) },
  ],
};

// ---------- DEADLINE ----------
const DL_ROOTS = ['E2', 'E2', 'C2', 'C2', 'A1', 'A1', 'B1', 'B1'];
const DL_ARPS = {
  E2: ['E4', 'G4', 'B4', 'G4'],
  C2: ['C4', 'E4', 'G4', 'E4'],
  A1: ['A3', 'C4', 'E4', 'C4'],
  B1: ['B3', 'D#4', 'F#4', 'D#4'],
};
const DL_LEAD = [
  'E5:4 r:2 E5:2 G5:4 F#5:4',
  'E5:2 D5:2 B4:4 r:8',
  'E5:4 r:2 E5:2 G5:4 A5:4',
  'G5:2 E5:2 C5:4 r:8',
  'A4:2 C5:2 E5:2 A5:2 G5:4 E5:4',
  'C5:4 A4:4 r:8',
  'B4:2 D#5:2 F#5:2 B5:2 A5:4 F#5:4',
  'D#5:8 B4:4 r:4',
].join(' ');

export const SONG_DEADLINE = {
  id: 'deadline',
  bpm: 132,
  loop: true,
  channels: [
    { id: 'ticktock', instrument: 'drums', volume: 0.8, notes: rep('h:4 o:4', 16) },
    { id: 'kick', instrument: 'drums', volume: 1, notes: rep('k:4 r:4 k:2 r:2 s:4', 8) },
    { id: 'bass', instrument: 'bass', volume: 0.9, notes: DL_ROOTS.map((r) => rep(`${r}:1 ${r}:1 ${r.replace(/\d/, (d) => Number(d) + 1)}:1 ${r}:1`, 4)).join(' ') },
    { id: 'arp', instrument: 'arp', volume: 0.55, notes: DL_ROOTS.map((r) => rep(DL_ARPS[r].map((n) => `${n}:1`).join(' '), 4)).join(' ') },
    { id: 'lead', instrument: 'lead', volume: 0.6, notes: DL_LEAD },
  ],
};
