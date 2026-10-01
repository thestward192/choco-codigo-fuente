// Motivo de N.U.L.L. (apariciones). Composición original.
// 4 notas disonantes (Mi · Fa · Si · La#: semitono y tritono) y arpegios glitcheados.

const rep = (str, k) => Array(k).fill(str).join(' ');
const MOTIF = 'E4:4 F4:4 B4:4 A#4:4';

const motif = [MOTIF, 'r:16', MOTIF, 'E5:2 F5:2 B5:2 A#5:2 r:8'].join(' ');
// Arpegio "roto": saltos de octava y notas que se repiten como un buffer trabado
const glitchArp = [rep('E5:1 E6:1 F5:1 B5:1 E5:1 E5:1 A#5:1 F6:1', 2), rep('E5:1 E6:1 F5:1 B5:1 B5:1 B5:1 B5:1 A#4:1', 2)].join(' ');
const bass = rep('E2:3 E2:1 F2:4 E2:3 E2:1 A#1:4', 4);

export const SONG_NULL = {
  id: 'null',
  bpm: 104,
  loop: true,
  channels: [
    { id: 'motif', instrument: 'lead', volume: 0.9, notes: motif },
    { id: 'arp', instrument: 'arp', volume: 0.55, notes: `${glitchArp} ${glitchArp}` },
    { id: 'bass', instrument: 'bass', volume: 0.9, notes: bass },
    { id: 'drums', instrument: 'drums', volume: 0.5, notes: rep('k:4 r:2 k:2 s:4 r:3 h:1', 4) },
  ],
};
