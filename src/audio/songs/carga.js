// "99 %" — Pantalla de Carga del prólogo. Composición original.
// Ambiente vacío: pulsos de "cargando" que dan vueltas, un pad grave y un bajo lento.

const rep = (str, n) => Array(n).fill(str).join(' ');

const CHORDS = [
  { pad: 'A3', bass: 'A2', arp: ['A4', 'E5', 'A5', 'C6'] },
  { pad: 'F3', bass: 'F2', arp: ['F4', 'C5', 'F5', 'A5'] },
  { pad: 'C4', bass: 'C3', arp: ['C5', 'G5', 'C6', 'E6'] },
  { pad: 'G3', bass: 'G2', arp: ['G4', 'D5', 'G5', 'B5'] },
];

// Bip de progreso: siempre la misma figura, como una barra que nunca termina
const arp = CHORDS.map(({ arp: [a, b, c, d] }) => rep(`${a}:1 ${b}:1 ${c}:1 ${d}:1 r:4 ${a}:1 ${b}:1 r:6`, 2)).join(' ');
const pad = CHORDS.map((c) => `${c.pad}:32`).join(' ');
const bass = CHORDS.map((c) => `${c.bass}:24 r:8`).join(' ');
const ping = rep('r:28 E6:2 r:2', 4);

export const SONG_CARGA = {
  id: 'carga',
  bpm: 92,
  loop: true,
  channels: [
    { id: 'pad', instrument: 'pad', volume: 1, notes: pad },
    { id: 'bass', instrument: 'bass', volume: 0.6, notes: bass },
    { id: 'arp', instrument: 'arp', volume: 0.6, notes: arp },
    { id: 'ping', instrument: 'lead25', volume: 0.35, notes: ping },
    { id: 'drums', instrument: 'drums', volume: 0.25, notes: rep('h:4 h:4 h:4 o:4', 8) },
  ],
};
