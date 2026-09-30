// Byteling: un bichito de 16×16 con una banda de bits en el caparazón. Diseño original.
import { Sprite } from '../bake.js';

const PAL = {
  o: '#1A0F24',
  P: '#6A3FA0',
  p: '#9B6BD6',
  e: '#F4F1EA',
  M: '#FF2E88',
  d: '#2A1446',
  y: '#FFD23F',
};

// Variante de práctica del prólogo: gris y con luces cian
const PAL_TEST = { ...PAL, P: '#6E6E80', p: '#A0A0B0', y: '#43D9FF', M: '#2A2A38' };

const BODY = [
  '....oooooo......',
  '...oPPPPPPo.....',
  '..oPpPPPPPPo....',
  '.oPpPPPPPPPPo...',
  '.oPPeeePPeeePo..',
  '.oPPeeMPPeeMPo..',
  '.oPPeeMPPeeMPo..',
  '.oPPPPPPPPPPPo..',
  '.odydydydydyPo..',
  '.oPPPPPPPPPPPo..',
  '..oPPPPPPPPPo...',
  '...ooooooooo....',
];

// Fila de bits alternada para que "parpadeen"
const bitsAlt = (rows) => rows.map((r, i) => (i === 8 ? r.replace(/dydydydydy/, 'ydydydydyd') : r));

const ANTENNA_A = ['...o.....o......', '....o...o.......'];
const ANTENNA_B = ['..o.......o.....', '...o.....o......'];
const LEGS_A = ['..o.o...o.o.....', '.o..o...o..o....'];
const LEGS_B = ['...oo...oo......', '..o..o.o..o.....'];

function frame(antenna, body, legs) {
  return [...antenna, ...body, ...legs];
}

// Ojos cerrados / aplastado para la muerte
const SQUASHED = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..oooooooooooo..',
  '.oPPPPPPPPPPPPo.',
  '.oPoPoPPPoPoPPo.',
  'oPPPoPPPPPoPPPPo',
  'odydydydydydydyo',
  'oPPPPPPPPPPPPPPo',
  '.oooooooooooooo.',
  '................',
];

export function bytelingSprites(test = false) {
  const pal = test ? PAL_TEST : PAL;
  return {
    walk: [new Sprite(frame(ANTENNA_A, BODY, LEGS_A), pal), new Sprite(frame(ANTENNA_B, bitsAlt(BODY), LEGS_B), pal)],
    squashed: new Sprite(SQUASHED, pal),
  };
}

export const BYTELING_COLORS = [PAL.P, PAL.p, PAL.y, PAL.M, PAL.e];
