// "Sala de pruebas" — melodía original de prueba (Hitos 0 y 1).
// Notación: NOTA:duración en semicorcheas. r = silencio. k/s/h = bombo/caja/hat.

const rep = (s, n) => Array(n).fill(s).join(' ');

export const SONG_PRUEBA = {
  id: 'prueba',
  bpm: 124,
  loop: true,
  channels: [
    {
      id: 'lead',
      instrument: 'lead25',
      notes: [
        'E5:2 G5:2 C6:4 B5:2 G5:2 E5:4',
        'F5:2 A5:2 C6:2 D6:2 C6:4 A5:4',
        'G5:2 E5:2 D5:2 E5:2 G5:6 r:2',
        'A5:2 G5:2 E5:2 D5:2 C5:6 r:2',
        'E5:2 G5:2 C6:4 D6:2 E6:2 D6:4',
        'C6:2 A5:2 F5:2 A5:2 C6:4 D6:4',
        'B5:2 G5:2 D5:2 G5:2 B5:4 A5:2 B5:2',
        'C6:8 r:4 G5:2 A5:2',
      ].join(' '),
    },
    {
      id: 'arp',
      instrument: 'arp',
      notes: [
        rep('C5:1 E5:1 G5:1 E5:1', 4),
        rep('F4:1 A4:1 C5:1 A4:1', 4),
        rep('E4:1 G4:1 B4:1 G4:1', 4),
        rep('F4:1 A4:1 D5:1 A4:1', 2) + ' ' + rep('G4:1 B4:1 D5:1 B4:1', 2),
        rep('C5:1 E5:1 G5:1 E5:1', 4),
        rep('F4:1 A4:1 C5:1 A4:1', 4),
        rep('G4:1 B4:1 D5:1 B4:1', 4),
        rep('C5:1 E5:1 G5:1 E5:1', 2) + ' ' + rep('G4:1 B4:1 D5:1 B4:1', 2),
      ].join(' '),
    },
    {
      id: 'bass',
      instrument: 'bass',
      notes: [
        'C3:4 G2:4 C3:4 G2:4',
        'F2:4 C3:4 F2:4 A2:4',
        'E2:4 B2:4 E2:4 G2:4',
        'D2:4 A2:4 G2:4 B2:4',
        'C3:4 G2:4 C3:4 E3:4',
        'F2:4 C3:4 F2:4 A2:4',
        'G2:4 D3:4 G2:4 B2:4',
        'C3:4 G2:4 C3:2 D3:2 E3:2 G2:2',
      ].join(' '),
    },
    {
      id: 'drums',
      instrument: 'drums',
      notes: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:1 h:1', 8),
    },
  ],
};
