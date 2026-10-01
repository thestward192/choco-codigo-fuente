// "Mundo Cartucho" — nivel 1. Composición original: alegre, rápida, de plataformas clásico.
// Una sola melodía con variaciones (docs/05_audio.md): pradera (Do mayor, 150 BPM), cuevas
// (más grave y espaciada), castillo (en menor, con bajo insistente) y Guardián (rápida, con capa extra).

const rep = (s, n) => Array(n).fill(s).join(' ');

// Acordes por compás: notas del arpegio y raíz del bajo
const CH = {
  C: { arp: ['C5', 'E5', 'G5', 'E5'], root: 'C' },
  Am: { arp: ['A4', 'C5', 'E5', 'C5'], root: 'A' },
  F: { arp: ['A4', 'C5', 'F5', 'C5'], root: 'F' },
  G: { arp: ['B4', 'D5', 'G5', 'D5'], root: 'G' },
  Em: { arp: ['B4', 'E5', 'G5', 'E5'], root: 'E' },
  E: { arp: ['B4', 'E5', 'G#5', 'E5'], root: 'E' },
};
const PROG = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F/G', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'G'];

const MELODY = [
  'E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 A5:4',
  'A5:2 C6:2 A5:2 E5:2 r:2 E5:2 G5:4',
  'F5:2 A5:2 C6:4 A5:2 F5:2 A5:4',
  'G5:6 F5:2 E5:4 D5:4',
  'E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 C6:4',
  'D6:2 C6:2 A5:2 C6:2 E6:4 D6:4',
  'C6:2 A5:2 F5:4 B5:2 A5:2 G5:4',
  'C6:8 r:4 G5:2 A5:2',
  'A5:4 C6:4 F6:4 E6:2 D6:2',
  'D6:4 B5:4 G5:4 A5:2 B5:2',
  'G5:4 B5:4 E6:4 D6:2 B5:2',
  'C6:6 B5:2 A5:8',
  'A5:2 F5:2 A5:2 C6:2 F6:4 E6:4',
  'D6:2 B5:2 G5:2 B5:2 D6:4 G6:4',
  'G#5:4 B5:4 E6:4 D6:4',
  'D6:2 C6:2 B5:2 A5:2 G5:4 r:4',
].join(' ');

function arpBar(chord, steps = 16) {
  const [a, b, c, d] = CH[chord].arp;
  return rep(`${a}:1 ${b}:1 ${c}:1 ${d}:1`, steps / 4);
}

function arp() {
  return PROG.map((p) => (p.includes('/') ? p.split('/').map((c) => arpBar(c, 8)).join(' ') : arpBar(p))).join(' ');
}

// Bajo: raíz y octava que saltan (pradera) o corcheas insistentes (castillo)
function bass(style) {
  const bar = (root, steps) => {
    const lo = `${root}2`;
    const hi = `${root}3`;
    const n = steps / 2;
    if (style === 'drive') return rep(`${lo}:1 ${lo}:1`, n);
    if (style === 'slow') return `${lo}:${steps - 4} ${hi}:4`;
    return Array.from({ length: n }, (_, i) => `${i % 2 ? hi : lo}:2`).join(' ');
  };
  return PROG.map((p) => (p.includes('/') ? p.split('/').map((c) => bar(CH[c].root, 8)).join(' ') : bar(CH[p].root, 16))).join(' ');
}

// Pasa la melodía a modo menor (Mi→Mib, La→Lab, Si→Sib), salvo el Sol# del acorde de Mi
function minorize(track) {
  return track.replace(/(^|\s)([EAB])(\d)/g, (m, sp, n, o) => `${sp}${{ E: 'D#', A: 'G#', B: 'A#' }[n]}${o}`);
}

const DRUMS = {
  pradera: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2', 16),
  cuevas: rep('k:4 h:2 h:2 h:4 o:4', 16),
  castillo: rep('k:2 h:1 h:1 s:2 k:2 k:2 h:2 s:2 h:2', 16),
};

function build({ id, bpm, transpose = 0, minor = false, bassStyle = 'jump', drums, leadInst = 'lead25', arpVol = 0.7, extra = null }) {
  const mel = minor ? minorize(MELODY) : MELODY;
  const arpTrack = minor ? minorize(arp()) : arp();
  const channels = [
    { id: 'lead', instrument: leadInst, transpose, notes: mel },
    { id: 'arp', instrument: 'arp', volume: arpVol, transpose, notes: arpTrack },
    { id: 'bass', instrument: 'bass', transpose, notes: minor ? minorize(bass(bassStyle)) : bass(bassStyle) },
    { id: 'drums', instrument: 'drums', volume: id === 'cuevas' ? 0.6 : 1, notes: drums },
  ];
  if (extra) channels.push(extra);
  return { id, bpm, loop: true, channels };
}

export const SONG_CARTUCHO = build({ id: 'cartucho', bpm: 150, drums: DRUMS.pradera });
export const SONG_CUEVAS = build({ id: 'cuevas', bpm: 128, transpose: -5, bassStyle: 'slow', drums: DRUMS.cuevas, leadInst: 'lead', arpVol: 0.9 });
export const SONG_CASTILLO = build({ id: 'castillo', bpm: 156, minor: true, bassStyle: 'drive', drums: DRUMS.castillo });
// Guardián: el castillo más rápido y con una segunda voz una octava abajo
export const SONG_GUARDIAN = build({
  id: 'guardian',
  bpm: 172,
  minor: true,
  bassStyle: 'drive',
  drums: DRUMS.castillo,
  extra: { id: 'lead2', instrument: 'lead', volume: 0.5, transpose: -12, notes: minorize(MELODY) },
});
