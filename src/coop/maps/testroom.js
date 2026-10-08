// Sala de pruebas cooperativa (Hito 10): para afinar a Choco y a Tapita juntos.
// Cada sección enseña una diferencia entre los dos o una interacción básica.
//
// Tiles:  # sólido  = un sentido  ~ vacío  g fantasma (Vista Debug de Choco)
// Entidades: P Choco · p Tapita · b Byteling · $ bit (Choco) · * cristal (Tapita) · n nodo de lazo
//            X salida (los dos adentro) · 1..8 carteles (cada cartel es checkpoint de los dos)
//
// Alturas que importan (se prueban en tests/coop.test.js):
//   Tapita salta ≈ 2.5 tiles; Choco ≈ 3 tiles (5.5 con el doble salto).
//   La pared alta mide 6 tiles: Choco solo no llega; parado sobre Tapita, sí.
//   El túnel mide 1 tile de alto: Tapita (14 px) cabe; Choco (20 px) no.

export const COOP_ROOM_W = 108;
export const COOP_ROOM_H = 18;
const GROUND = 16;

export const COOP_SIGNS = {
  1: 'welcome',
  2: 'steps',
  3: 'wall',
  4: 'tunnel',
  5: 'enemies',
  6: 'melcocha',
  7: 'void',
  8: 'exit',
};

// Medidas usadas por las pruebas
export const COOP_ROOM_FEATURES = {
  wallTop: 10, // fila del tope de la pared alta (6 tiles sobre el suelo)
  wallX: [30, 36],
  tunnelRow: 15,
  tunnelX: [42, 50],
};

export function buildCoopTestRoom() {
  const g = Array.from({ length: COOP_ROOM_H }, () => Array(COOP_ROOM_W).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  };
  const put = (x, y, ch) => (g[y][x] = ch);

  // Paredes y suelo
  fill(0, 0, 1, COOP_ROOM_H - 1, '#');
  fill(COOP_ROOM_W - 2, 0, COOP_ROOM_W - 1, COOP_ROOM_H - 1, '#');
  fill(2, GROUND, COOP_ROOM_W - 3, COOP_ROOM_H - 1, '#');

  // Inicio
  put(4, GROUND - 1, 'P');
  put(6, GROUND - 1, 'p');
  put(9, GROUND - 1, '1');

  // Escalones de 1, 2 y 3 tiles (el de 3: Tapita sube parándose sobre Choco)
  put(12, GROUND - 1, '2');
  put(14, GROUND - 1, '#');
  fill(16, GROUND - 2, 17, GROUND - 1, '#');
  fill(19, GROUND - 3, 21, GROUND - 1, '#');
  put(20, GROUND - 5, '*');
  put(16, GROUND - 4, '$');

  // Pared alta de 6 tiles con una chimenea para Tapita (salto de pared)
  put(24, GROUND - 1, '3');
  fill(27, GROUND - 7, 27, GROUND - 3, '#'); // pilar flotante: entre él y la pared queda la chimenea
  fill(30, GROUND - 6, 36, GROUND - 1, '#');
  put(28, GROUND - 8, '$');
  put(33, GROUND - 8, '*');
  put(34, GROUND - 8, '$');

  // Túnel de 1 tile: solo Tapita
  put(39, GROUND - 1, '4');
  fill(42, GROUND - 4, 50, GROUND - 2, '#');
  for (let x = 43; x <= 49; x += 2) put(x, GROUND - 1, '*');
  put(46, GROUND - 6, '$');

  // Enemigos en un corral
  put(54, GROUND - 1, '5');
  fill(56, GROUND - 2, 56, GROUND - 1, '#');
  fill(71, GROUND - 2, 71, GROUND - 1, '#');
  put(60, GROUND - 1, 'b');
  put(64, GROUND - 1, 'b');
  put(68, GROUND - 1, 'b');

  // Pared para escalones de melcocha
  put(74, GROUND - 1, '6');
  fill(80, GROUND - 6, 82, GROUND - 1, '#');
  put(81, GROUND - 8, '*');
  put(82, GROUND - 8, '$');

  // Vacío con nodos de lazo y puente fantasma
  put(85, GROUND - 1, '7');
  fill(89, GROUND, 97, COOP_ROOM_H - 1, '.');
  fill(89, COOP_ROOM_H - 1, 97, COOP_ROOM_H - 1, '~');
  fill(89, GROUND, 97, GROUND, 'g');
  put(91, GROUND - 6, 'n');
  put(95, GROUND - 6, 'n');
  put(93, GROUND - 3, '$');

  // Salida: los dos adentro
  put(101, GROUND - 1, '8');
  put(104, GROUND - 1, 'X');

  return g.map((r) => r.join(''));
}
