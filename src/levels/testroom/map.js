// Sala de pruebas del Hito 1. Se construye con un pequeño editor en código para que sea
// fácil mover secciones; el resultado es el mismo formato de strings que usan los niveles.
//
// Tiles:  # sólido  = un sentido  ^ pinchos  ~ vacío  g fantasma
// Entidades: P Choco · b Byteling (gira en bordes) · B Byteling (solo gira en paredes)
//            $ bit · c Grano de Cacao · h Trozo de Cacao · O Botas de Doble Salto
//            Y Y dorada (3) · X salida · N terminal (prueba de diálogos)
// Carteles: 1..9, T, K, V, G, E (ver SIGNS). Cada cartel también es un checkpoint.

export const TESTROOM_W = 122;
export const TESTROOM_H = 18;
const GROUND = 16;

export const SIGNS = {
  1: 'welcome',
  2: 'steps',
  3: 'coyote',
  4: 'buffer',
  5: 'oneway',
  6: 'shoot',
  7: 'enemies',
  8: 'spikes',
  9: 'boots',
  T: 'tall',
  K: 'cacao',
  V: 'pit',
  G: 'ghost',
  E: 'end',
};

export function buildTestRoom() {
  const g = Array.from({ length: TESTROOM_H }, () => Array(TESTROOM_W).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  };
  const put = (x, y, ch) => (g[y][x] = ch);

  // Paredes y suelo
  fill(0, 0, 1, TESTROOM_H - 1, '#');
  fill(TESTROOM_W - 2, 0, TESTROOM_W - 1, TESTROOM_H - 1, '#');
  fill(2, GROUND, TESTROOM_W - 3, TESTROOM_H - 1, '#');

  // Inicio
  put(4, GROUND - 1, 'P');
  put(2, GROUND - 1, 'N');
  put(7, GROUND - 1, '1');

  // Escalones de 1, 2 y 3 tiles
  put(10, GROUND - 1, '2');
  fill(13, GROUND - 1, 14, GROUND - 1, '#');
  fill(16, GROUND - 2, 17, GROUND - 1, '#');
  fill(19, GROUND - 3, 20, GROUND - 1, '#');
  put(19, GROUND - 5, '$');
  put(20, GROUND - 5, '$');

  // Hueco para coyote time (3 tiles, al vacío)
  put(23, GROUND - 1, '3');
  fill(26, GROUND, 28, TESTROOM_H - 1, '.');
  put(27, GROUND - 3, '$');

  // Obstáculos bajos para saltos seguidos (buffer)
  put(31, GROUND - 1, '4');
  put(34, GROUND - 1, '#');
  put(37, GROUND - 1, '#');
  put(40, GROUND - 1, '#');

  // Torre de plataformas de un sentido
  put(43, GROUND - 1, '5');
  fill(45, GROUND - 2, 48, GROUND - 2, '=');
  fill(47, GROUND - 4, 50, GROUND - 4, '=');
  fill(45, GROUND - 6, 48, GROUND - 6, '=');
  fill(47, GROUND - 8, 50, GROUND - 8, '=');
  fill(45, GROUND - 10, 48, GROUND - 10, '=');
  put(46, GROUND - 11, '$');
  put(49, GROUND - 12, 'Y'); // Y dorada 1: arriba de la torre
  put(47, GROUND - 11, '$');

  // Disparo y enemigos (corral con paredes bajas)
  put(52, GROUND - 1, '6');
  put(54, GROUND - 1, '7');
  fill(56, GROUND - 2, 56, GROUND - 1, '#');
  fill(71, GROUND - 2, 71, GROUND - 1, '#');
  put(60, GROUND - 1, 'b');
  put(64, GROUND - 1, 'b');
  put(68, GROUND - 1, 'b');

  // Pinchos
  put(74, GROUND - 1, '8');
  fill(77, GROUND - 1, 79, GROUND - 1, '^');
  put(78, GROUND - 4, 'Y'); // Y dorada 2: sobre los pinchos

  // Botas y pared alta
  put(82, GROUND - 1, '9');
  put(84, GROUND - 1, 'O');
  put(86, GROUND - 1, 'T');
  fill(88, GROUND - 4, 89, GROUND - 1, '#'); // 4 tiles: el salto simple (≈3) no alcanza
  put(88, GROUND - 6, '$');
  put(102, GROUND - 5, 'Y'); // Y dorada 3: sobre el vacío (doble salto o puente fantasma)

  // Grano de Cacao
  put(92, GROUND - 1, 'K');
  put(94, GROUND - 2, 'c');

  // Vacío con puente fantasma
  put(96, GROUND - 1, 'V');
  put(98, GROUND - 1, 'G');
  fill(100, GROUND, 103, TESTROOM_H - 1, '.');
  fill(100, TESTROOM_H - 1, 103, TESTROOM_H - 1, '~');
  fill(100, GROUND - 1, 103, GROUND - 1, 'g');

  // Final (muro bajo para que los Bytelings que no giran en bordes no caigan al vacío)
  put(105, GROUND - 1, '#');
  put(107, GROUND - 1, 'h');
  put(110, GROUND - 1, 'E');
  put(113, GROUND - 1, 'B');
  put(116, GROUND - 1, 'B');
  put(118, GROUND - 1, 'X'); // salida
  for (let i = 0; i < 6; i++) put(106 + i * 2, GROUND - 4 - (i === 2 || i === 3 ? 1 : 0), '$');

  return g.map((r) => r.join(''));
}
