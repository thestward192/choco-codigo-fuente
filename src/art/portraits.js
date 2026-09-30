// Retratos de 32×32 para diálogos (con expresiones) y sprites de 16×24 de los fundadores.
// Los fundadores son cuadritos de chocolate con personalidad (docs/02_personajes.md).
import { Grid } from './painter.js';
import { SpriteCache } from './bake.js';

export const PORTRAIT_PAL = {
  o: '#1E120C',
  s: '#3D2216',
  b: '#5C3521',
  l: '#83522F',
  h: '#B07A4A',
  e: '#F4F1EA',
  E: '#FFFFFF',
  r: '#C0435A',
  R: '#E0343F',
  p: '#FF7DB0',
  P: '#C24D7F',
  G: '#4CBB4C',
  Y: '#FFD23F',
  y: '#B8902A',
  g: '#3A3A4A',
  M: '#8A8AA0',
  v: '#B18CFF',
  V: '#7A5BC4',
  w: '#E8E8F0',
  W: '#B8B8C8',
  t: '#4FD1C5',
  T: '#2E9C92',
  c: '#43D9FF',
  k: '#101018',
  u: '#D9AE4B',
  U: '#A27B2E',
  z: '#F6DE8A',
  n: '#0B0610',
  m: '#FF2E88',
  q: '#8C1D52',
  N: '#2A2A38',
  K: '#44445A',
};

export const EXPRESSIONS = ['normal', 'happy', 'worried', 'surprised', 'angry'];

// ---------- Piezas comunes ----------

function cuadrito(g) {
  g.rect(4, 6, 27, 29, 'b');
  g.frame(3, 5, 28, 30, 'o');
  // Esquinas redondeadas
  for (const [x, y] of [
    [3, 5],
    [28, 5],
    [3, 30],
    [28, 30],
  ])
    g.set(x, y, '.');
  for (const [x, y] of [
    [4, 6],
    [27, 6],
    [4, 29],
    [27, 29],
  ])
    g.set(x, y, 'o');
  // Bisel exterior
  g.hline(5, 26, 6, 'h').vline(4, 7, 28, 'l').hline(5, 26, 29, 's').vline(27, 7, 28, 's');
  // Relieve del cuadrito (almohadón interior)
  g.hline(7, 24, 9, 'l').vline(7, 9, 26, 'l').hline(7, 24, 26, 's').vline(24, 10, 26, 's');
  g.set(8, 10, 'h').set(9, 10, 'h').set(8, 11, 'h');
}

// Ojos grandes a la altura y (tope), con separación estándar de los cuadritos.
function eyes(g, face, y = 14, lx = 10, rx = 19) {
  const drawEye = (x, flip) => {
    if (face === 'happy') {
      // Arcos ^ ^
      g.set(x, y + 2, 'o').set(x + 1, y + 1, 'o').set(x + 2, y + 2, 'o').set(x, y + 3, 'o').set(x + 2, y + 3, 'o');
      return;
    }
    g.rect(x, y, x + 2, y + 3, 'e');
    if (face === 'surprised') {
      g.set(x + 1, y + 1, 'o').set(x + 1, y + 2, 'o');
      return;
    }
    if (face === 'worried') {
      g.set(x + 1, y + 2, 'o').set(x + 1, y + 3, 'o');
      // Cejas levantadas hacia el centro
      if (!flip) g.line(x - 1, y - 1, x + 2, y - 3, 'o');
      else g.line(x, y - 3, x + 3, y - 1, 'o');
      return;
    }
    if (face === 'angry') {
      g.set(x + 1, y + 2, 'o').set(x + 2, y + 2, 'o').set(x + 1, y + 3, 'o').set(x + 2, y + 3, 'o');
      if (!flip) g.line(x - 1, y - 2, x + 3, y, 'o');
      else g.line(x - 1, y, x + 3, y - 2, 'o');
      g.hline(x, x + 2, y, 'b');
      return;
    }
    // normal: pupila 2×2 con brillo
    g.set(x + 1, y + 2, 'o').set(x + 2, y + 2, 'o').set(x + 1, y + 3, 'o').set(x + 2, y + 3, 'o');
    g.set(x + 1, y + 2, 'E');
  };
  drawEye(lx, false);
  drawEye(rx, true);
}

function mouth(g, face, y = 22, cx = 15) {
  if (face === 'happy') {
    g.hline(cx - 3, cx + 4, y, 'o');
    g.hline(cx - 2, cx + 3, y + 1, 'r').set(cx - 3, y + 1, 'o').set(cx + 4, y + 1, 'o');
    g.hline(cx - 2, cx + 3, y + 2, 'o');
    g.set(cx, y + 1, 'R').set(cx + 1, y + 1, 'R');
  } else if (face === 'worried') {
    g.pts(
      [
        [cx - 2, y + 1],
        [cx - 1, y],
        [cx, y + 1],
        [cx + 1, y],
        [cx + 2, y + 1],
        [cx + 3, y],
      ],
      'o',
    );
  } else if (face === 'surprised') {
    g.rect(cx, y - 1, cx + 1, y + 2, 'o');
    g.set(cx, y, 'r').set(cx + 1, y, 'r').set(cx, y + 1, 'r').set(cx + 1, y + 1, 'r');
    g.frame(cx - 1, y - 1, cx + 2, y + 2, 'o');
  } else if (face === 'angry') {
    g.hline(cx - 2, cx + 3, y + 1, 'o');
    g.set(cx - 3, y + 2, 'o').set(cx + 4, y + 2, 'o');
  } else {
    g.pts(
      [
        [cx - 2, y],
        [cx - 1, y + 1],
        [cx, y + 1],
        [cx + 1, y + 1],
        [cx + 2, y + 1],
        [cx + 3, y],
      ],
      'o',
    );
  }
}

function blush(g, y = 20) {
  g.hline(8, 9, y, 'r').hline(22, 23, y, 'r');
}

// ---------- Fundadores ----------

function oscar(g, face) {
  cuadrito(g);
  eyes(g, face);
  // Pestañas de poeta
  if (face !== 'happy') g.set(10, 13, 'o').set(21, 13, 'o');
  mouth(g, face);
  blush(g);
  // Corazón flotante (arriba a la derecha)
  g.stamp(['.p.p.', 'ppPpp', 'pPppp', '.ppp.', '..p..'].map((r) => r), 25, 0);
  g.set(26, 1, 'e');
  // Rosa en la mano (abajo a la izquierda)
  g.line(6, 31, 5, 27, 'G').set(4, 29, 'G').set(3, 28, 'G');
  g.ellipse(5, 24.5, 2, 2, 'R');
  g.set(5, 24, 'P').set(4, 23, 'P').set(6, 25, 'P').set(4, 24, 'p');
}

function stward(g, face) {
  cuadrito(g);
  eyes(g, face);
  mouth(g, face === 'normal' ? 'normalSmirk' : face);
  if (face === 'normal') g.set(18, 21, 'o'); // media sonrisa confiada
  // Gorra de lado
  g.rect(6, 2, 24, 7, 'Y');
  g.hline(6, 24, 7, 'y');
  g.rect(24, 6, 31, 7, 'Y').hline(25, 31, 8, 'y');
  g.frame(5, 1, 25, 8, 'o');
  g.set(5, 1, '.').set(25, 1, '.');
  g.hline(26, 31, 5, 'o').hline(26, 31, 9, 'o');
  g.set(15, 0, 'o').set(14, 1, 'y').set(15, 1, 'y').set(16, 1, 'y');
  g.hline(8, 12, 3, 'e'); // brillo
  // Cadena dorada
  const chain = [
    [7, 25],
    [8, 26],
    [9, 27],
    [11, 28],
    [13, 29],
    [15, 29],
    [17, 29],
    [19, 28],
    [21, 27],
    [22, 26],
    [23, 25],
  ];
  chain.forEach(([x, y], i) => g.set(x, y, i % 2 ? 'Y' : 'y'));
  g.rect(15, 30, 17, 31, 'Y').set(16, 31, 'y');
  // Micrófono
  g.line(28, 31, 27, 26, 'g');
  g.ellipse(27, 24, 2, 2, 'M');
  g.set(26, 23, 'e').set(28, 25, 'g');
}

function hezron(g, face) {
  cuadrito(g);
  // Ojos relajados: párpado a media altura
  eyes(g, face);
  if (face === 'normal') {
    g.hline(10, 12, 14, 'b').hline(19, 21, 14, 'b');
    g.hline(10, 12, 15, 'o').hline(19, 21, 15, 'o');
  }
  mouth(g, face);
  // Audífonos grandes
  g.line(4, 8, 8, 3, 'V').line(8, 3, 23, 3, 'V').line(23, 3, 27, 8, 'V');
  g.line(5, 8, 8, 4, 'v').line(8, 4, 23, 4, 'v').line(23, 4, 26, 8, 'v');
  g.rect(0, 12, 4, 21, 'v').rect(27, 12, 31, 21, 'v');
  g.vline(0, 12, 21, 'V').vline(31, 12, 21, 'V');
  g.frame(0, 11, 4, 22, 'o').frame(27, 11, 31, 22, 'o');
  g.set(2, 14, 'w').set(29, 14, 'w');
  // Vape y nubecita
  g.rect(22, 24, 24, 31, 'g').set(23, 25, 'c').vline(21, 24, 31, 'o').vline(25, 24, 31, 'o').hline(22, 24, 23, 'o');
  g.ellipse(26, 3, 2.5, 2, 'w');
  g.ellipse(29.5, 1.5, 1.5, 1.5, 'w');
  g.ellipse(22, 1, 1.5, 1, 'W');
  g.set(25, 4, 'W').set(27, 4, 'W');
}

function fabiola(g, face) {
  cuadrito(g);
  eyes(g, face);
  mouth(g, face);
  if (face === 'normal') {
    // Una ceja levantada: duda ante la comida
    g.line(19, 12, 22, 11, 'o');
  }
  blush(g);
  // Moño
  g.stamp(['tt...tt', 'tTt.tTt', 'tTTtTTt', 'tTt.tTt', 'tt...tt'], 6, 1);
  g.set(9, 3, 'T');
  // Contorno del moño
  g.frame(5, 0, 13, 6, '.');
  g.set(5, 1, 'o').set(5, 5, 'o').set(13, 1, 'o').set(13, 5, 'o');
  // Delantal
  g.rect(9, 24, 22, 31, 'e');
  g.hline(9, 22, 24, 't').vline(9, 24, 31, 't').vline(22, 24, 31, 't');
  g.rect(13, 27, 18, 29, 'W').frame(13, 27, 18, 29, 't');
  g.line(9, 23, 7, 19, 't').line(22, 23, 24, 19, 't');
}

// ---------- Choco ----------

function choco(g, face) {
  // Barra (vista de cerca): parte de arriba de chocolate, envoltura dorada abajo
  g.rect(5, 3, 26, 31, 'b');
  g.frame(4, 2, 27, 32, 'o');
  g.set(4, 2, '.').set(27, 2, '.').set(5, 3, 'o').set(26, 3, 'o');
  g.hline(6, 25, 3, 'l').vline(5, 4, 31, 'h').vline(26, 4, 31, 's');
  // Ranura entre cuadritos
  g.hline(5, 26, 23, 's').vline(15, 24, 31, 's');
  // Envoltura dorada con borde roto
  g.rect(5, 26, 26, 31, 'u');
  const tear = [26, 25, 26, 27, 26, 25, 26, 26, 27, 25, 26, 26, 25, 26, 27, 26, 25, 26, 26, 27, 26, 25];
  tear.forEach((ty, i) => {
    const x = 5 + i;
    for (let y = ty; y < 26; y++) g.set(x, y, 'u');
    g.set(x, ty, i % 3 === 0 ? 'U' : 'z');
  });
  g.vline(26, 26, 31, 'U').vline(5, 26, 31, 'z');
  // Lentes grandes
  const lens = (x0) => {
    g.frame(x0, 8, x0 + 8, 15, 'k');
    g.rect(x0 + 1, 9, x0 + 7, 14, face === 'happy' ? 'b' : 'e');
  };
  lens(6);
  lens(17);
  g.hline(15, 16, 10, 'k');
  // Ojos dentro de los lentes
  const pupils = (x0) => {
    if (face === 'happy') {
      g.pts(
        [
          [x0 + 2, 12],
          [x0 + 3, 11],
          [x0 + 4, 11],
          [x0 + 5, 12],
          [x0 + 6, 13],
          [x0 + 1, 13],
        ],
        'o',
      );
    } else if (face === 'surprised') {
      g.rect(x0 + 3, 11, x0 + 4, 12, 'o');
    } else if (face === 'worried') {
      g.rect(x0 + 3, 12, x0 + 4, 13, 'o');
      g.hline(x0 + 1, x0 + 7, 9, 'b');
    } else if (face === 'angry') {
      g.rect(x0 + 4, 11, x0 + 6, 13, 'o');
      g.hline(x0 + 1, x0 + 7, 9, 'b').hline(x0 + 1, x0 + 7, 10, 'b');
    } else {
      g.rect(x0 + 4, 11, x0 + 6, 13, 'o');
      g.set(x0 + 4, 11, 'E');
    }
  };
  pupils(6);
  pupils(17);
  // Reflejo en los lentes
  if (face !== 'happy') g.set(8, 9, 'c').set(19, 9, 'c');
  // Boca
  mouth(g, face, 18, 15);
  // Audífonos alrededor del cuello
  g.rect(1, 19, 4, 25, 'g').rect(27, 19, 30, 25, 'g');
  g.frame(0, 18, 4, 26, 'o').frame(27, 18, 31, 26, 'o');
  g.set(29, 21, 'c').set(2, 21, 'M');
}

// ---------- N.U.L.L. ----------

function nullPortrait(g, face) {
  // Alas de código (columnas de caracteres magenta)
  for (let y = 7; y <= 24; y += 2) {
    const w = 3 - Math.abs(y - 15) / 5;
    for (let i = 0; i < w; i++) {
      g.set(i, y, (y + i) % 3 ? 'm' : 'q');
      g.set(31 - i, y, (y + i) % 4 ? 'q' : 'm');
    }
  }
  // Monitor CRT
  g.rect(3, 3, 28, 26, 'N');
  g.frame(2, 2, 29, 27, 'o');
  g.hline(3, 28, 3, 'K').vline(3, 3, 26, 'K');
  g.rect(6, 6, 25, 23, 'n');
  g.frame(5, 5, 26, 24, 'o');
  // Pie
  g.rect(12, 28, 19, 30, 'N').frame(11, 27, 20, 31, 'o');
  // Grieta de la pantalla
  g.line(7, 7, 10, 10, 'W').line(10, 10, 9, 13, 'W').line(10, 10, 13, 9, 'W');
  // Ojo con ∅ como pupila
  const cx = 15.5;
  const cy = 14.5;
  if (face === 'angry') {
    g.ellipse(cx, cy, 7, 3.5, 'm');
    g.ellipse(cx, cy, 5, 2, 'n');
    g.ellipse(cx, cy, 2.5, 2.5, 'R');
    g.hline(8, 23, 10, 'm');
  } else {
    g.ellipse(cx, cy, 6, face === 'worried' ? 4 : 5, 'e');
    g.ellipse(cx, cy, 3.5, 3.5, 'm');
    g.ellipse(cx, cy, 2, 2, 'n');
    g.line(12, 18, 19, 11, 'm');
    if (face === 'worried') {
      g.hline(9, 22, 9, 'n').hline(9, 22, 10, 'n');
      g.vline(22, 19, 21, 'c');
    }
  }
  // Líneas de escaneo
  for (let y = 7; y <= 22; y += 3) for (let x = 6; x <= 25; x += 1) if (g.get(x, y) === 'n') g.set(x, y, 'q');
}

function systemPortrait(g) {
  g.rect(3, 4, 28, 27, 'n').frame(2, 3, 29, 28, 'c');
  g.stamp(['c...', '.c..', '..c.', '.c..', 'c...'], 7, 11);
  g.hline(13, 20, 16, 'c');
  g.hline(13, 20, 17, 'c');
}

const BUILDERS = { oscar, stward, hezron, fabiola, choco, null: nullPortrait, system: systemPortrait };

export function buildPortraitRows(key) {
  const [who, face] = key.split(':');
  const g = new Grid(32, 32);
  (BUILDERS[who] || systemPortrait)(g, face || 'normal');
  return g.toRows();
}

let portraitCache = null;
export function portrait(who, face = 'normal') {
  if (!portraitCache) portraitCache = new SpriteCache(buildPortraitRows, PORTRAIT_PAL);
  return portraitCache.get(`${who}:${face}`);
}

// ---------- Sprites de plataformas de los fundadores (16×24) ----------
// frames: 0..1 idle, 2..5 caminar

function founderSmall(who, frame) {
  const g = new Grid(16, 24);
  const walk = frame >= 2;
  const k = walk ? frame - 2 : frame;
  const bob = walk ? (k % 2 === 1 ? -1 : 0) : k === 1 ? 1 : 0;
  const top = 10 + bob;
  // Piernas
  const legs = walk
    ? [
        [
          [5, 3],
          [10, 12],
        ],
        [
          [5, 5],
          [10, 10],
        ],
        [
          [5, 7],
          [10, 8],
        ],
        [
          [5, 5],
          [10, 10],
        ],
      ][k]
    : [
        [5, 5],
        [10, 10],
      ];
  if (walk) {
    const [[h1, f1], [h2, f2]] = [
      [legs[0][0], legs[0][1]],
      [legs[1][0], legs[1][1]],
    ];
    g.line(h1, top + 11, f1, 23, 'o').set(f1 + 1, 23, 'o');
    g.line(h2, top + 11, f2, 23, 'o').set(f2 + 1, 23, 'o');
  } else {
    g.vline(5, top + 11, 23, 'o').set(6, 23, 'o');
    g.vline(10, top + 11, 23, 'o').set(11, 23, 'o');
  }
  // Cuerpo: cuadrito 10×10
  g.rect(3, top, 12, top + 10, 'b');
  g.frame(2, top - 1, 13, top + 11, 'o');
  g.set(2, top - 1, '.').set(13, top - 1, '.').set(2, top + 11, '.').set(13, top + 11, '.');
  g.hline(3, 12, top, 'h').vline(3, top + 1, top + 9, 'l').hline(4, 12, top + 10, 's').vline(12, top + 1, top + 9, 's');
  // Cara
  g.rect(5, top + 3, 6, top + 5, 'e').rect(9, top + 3, 10, top + 5, 'e');
  g.set(6, top + 4, 'o').set(6, top + 5, 'o').set(10, top + 4, 'o').set(10, top + 5, 'o');
  g.hline(7, 8, top + 7, 'o');
  // Brazos
  const armY = top + 5 + (walk && k % 2 ? 1 : 0);
  g.set(1, armY, 'o').set(0, armY + 1, 'o').set(14, armY, 'o').set(15, armY + 1, 'o');
  // Accesorios
  if (who === 'oscar') {
    const hy = top - 7 + (frame % 2);
    g.stamp(['p.p', 'ppp', '.p.'], 6, hy);
    g.set(15, armY + 1, 'R').set(15, armY + 2, 'G');
    g.set(4, top + 6, 'r').set(11, top + 6, 'r');
  } else if (who === 'stward') {
    g.rect(3, top - 3, 12, top, 'Y').hline(12, 15, top, 'Y').hline(3, 12, top, 'y');
    g.frame(2, top - 4, 13, top + 1, '.');
    g.hline(3, 12, top - 4, 'o').vline(2, top - 3, top, 'o');
    g.hline(8, 12, top + 9, 'Y').set(7, top + 9, 'y');
    g.set(15, armY, 'M').set(15, armY + 1, 'g');
  } else if (who === 'hezron') {
    g.rect(0, top + 1, 1, top + 5, 'v').rect(14, top + 1, 15, top + 5, 'v');
    g.hline(3, 12, top - 2, 'V').set(2, top - 1, 'V').set(13, top - 1, 'V');
    g.set(15, armY + 2, 'g').set(15, armY + 3, 'g');
    g.set(14 + (frame % 2), top - 4, 'w').set(13, top - 5, 'W');
  } else if (who === 'fabiola') {
    g.stamp(['t.t', 'tTt', 't.t'], 3, top - 3);
    g.rect(5, top + 8, 10, top + 10, 'e').hline(5, 10, top + 8, 't');
  }
  return g.toRows();
}

let smallCache = null;
export function founderSprite(who, frame) {
  if (!smallCache) {
    smallCache = new SpriteCache((key) => {
      const [w, f] = key.split(':');
      return founderSmall(w, Number(f));
    }, PORTRAIT_PAL);
  }
  return smallCache.get(`${who}:${frame}`);
}
