// Enemigos de Santa Cruz (docs/02_personajes.md · nivel 4), diseño original, mirando a la derecha:
//   Toro glitch (32×24), Bombetero corrupto (16×24), Sabanero glitch (16×24), Zanate (12×10).
// Todos tienen los ojos rojos glitcheados de N.U.L.L.
import { Grid } from '../painter.js';
import { SpriteCache } from '../bake.js';

export const SC_ENEMY_PAL = {
  o: '#1A0E0A',
  // Toro
  B: '#5A3222', b: '#3A2016', l: '#7A4A30', h: '#F4F1EA', H: '#C8BCA8', n: '#C8907A', w: '#2A1A10',
  e: '#E0343F', E: '#FF2E88', c: '#43D9FF',
  // Gente
  s: '#B07A55', S: '#8A5A3A', t: '#F4F1EA', T: '#C8BCA8', p: '#3A4A7A', P: '#2A3458', m: '#8B5A2B', M: '#5E3A1A',
  r: '#C8612E', y: '#FFD23F', g: '#6E8B3D',
  // Zanate
  k: '#14141E', K: '#2A2A44', v: '#4A3A7A', Y: '#FFD23F',
};

// ---------- Toro glitch ----------
function toro(pose) {
  const g = new Grid(32, 24);
  const head = pose === 'scrape' || pose === 'charge1' || pose === 'charge2' ? 3 : 0;
  // Patas (cuatro), según la pose
  const legs = {
    walk1: [[6, 0], [10, 1], [18, 0], [22, 1]],
    walk2: [[6, 1], [10, 0], [18, 1], [22, 0]],
    scrape: [[6, 0], [10, 0], [18, 0], [23, -2]],
    charge1: [[4, -1], [9, 1], [19, 1], [24, -1]],
    charge2: [[6, 1], [11, -1], [17, -1], [22, 1]],
  }[pose] || [[6, 0], [10, 0], [18, 0], [22, 0]];
  for (const [x, dx] of legs) {
    g.line(x, 16, x + dx, 22, 'b').line(x + 1, 16, x + 1 + dx, 22, 'B');
    g.hline(x + dx, x + 1 + dx, 23, 'w');
  }
  // Cuerpo
  g.ellipse(14, 11, 11, 6, 'B');
  g.hline(6, 20, 6, 'l').hline(8, 18, 5, 'l');
  g.hline(5, 22, 16, 'b');
  // Cola con mechón
  g.line(3, 9, 1, 14, 'b').set(0, 15, 'w').set(1, 15, 'w');
  // Joroba
  g.ellipse(19, 6, 4, 2, 'B');
  // Cabeza y hocico
  g.rect(23, 7 + head, 29, 14 + head, 'B');
  g.rect(28, 11 + head, 31, 15 + head, 'n');
  g.set(30, 12 + head, 'o').set(30, 14 + head, 'o');
  // Cuernos
  g.line(24, 7 + head, 22, 3 + head, 'h').line(22, 3 + head, 23, 1 + head, 'H');
  g.line(28, 7 + head, 30, 3 + head, 'h').line(30, 3 + head, 29, 1 + head, 'H');
  // Ojo rojo glitcheado
  g.rect(26, 9 + head, 27, 10 + head, 'e').set(28, 9 + head, 'E');
  g.outline('o');
  return g.toRows();
}

// ---------- Bombetero corrupto: sombrero, camisa y una bombeta en la mano ----------
function bombetero(pose) {
  const g = new Grid(16, 24);
  // Piernas
  g.rect(5, 18, 6, 23, 'P').rect(9, 18, 10, 23, 'P');
  // Torso
  g.rect(4, 11, 11, 18, 'r').hline(4, 11, 11, 'y');
  // Cabeza
  g.rect(5, 5, 10, 10, 's').hline(5, 10, 10, 'S');
  g.set(8, 7, 'e').set(9, 7, 'E');
  // Sombrero de paja
  g.hline(2, 13, 4, 't').rect(5, 1, 10, 3, 't').hline(5, 10, 3, 'T');
  // Brazos
  if (pose === 'throw') {
    g.line(11, 12, 14, 7, 's');
    g.rect(13, 3, 15, 5, 'k').set(14, 2, 'y');
  } else if (pose === 'aim') {
    g.line(11, 12, 14, 10, 's');
    g.rect(13, 8, 15, 10, 'k').set(15, 7, 'Y').set(14, 6, 'y');
  } else {
    g.line(11, 12, 13, 16, 's');
    g.rect(12, 16, 14, 18, 'k').set(13, 15, 'y');
  }
  g.line(4, 12, 2, 16, 's');
  g.outline('o');
  return g.toRows();
}

// ---------- Sabanero glitch: sombrero ancho, pañuelo y el lazo ----------
function sabanero(pose) {
  const g = new Grid(16, 24);
  g.rect(5, 18, 6, 23, 'M').rect(9, 18, 10, 23, 'M');
  g.hline(4, 6, 23, 'k').hline(9, 11, 23, 'k');
  g.rect(4, 11, 11, 18, 'p').hline(4, 11, 17, 'm');
  g.rect(5, 11, 10, 12, 'e');
  g.rect(5, 5, 10, 10, 's').hline(5, 10, 10, 'S');
  g.set(8, 7, 'e').set(9, 7, 'E');
  g.hline(1, 14, 4, 'M').rect(5, 1, 10, 3, 'M').hline(5, 10, 3, 'm');
  if (pose === 'swing') {
    g.line(11, 12, 13, 6, 's');
  } else if (pose === 'throw') {
    g.line(11, 12, 15, 11, 's');
  } else {
    g.line(11, 12, 12, 16, 's');
    // Lazo enrollado en la mano
    g.frame(12, 14, 15, 18, 'T');
  }
  g.line(4, 12, 2, 16, 's');
  g.outline('o');
  return g.toRows();
}

// ---------- Zanate: pájaro negro brillante de ojo amarillo y cola larga ----------
function zanate(pose) {
  const g = new Grid(12, 10);
  if (pose === 'dive') {
    g.line(1, 1, 8, 7, 'k').line(2, 1, 9, 7, 'K').line(1, 2, 7, 7, 'k');
    g.rect(8, 6, 10, 8, 'k').set(9, 6, 'Y').set(11, 8, 'H');
    g.set(0, 0, 'v').set(3, 4, 'v');
    g.outline('o');
    return g.toRows();
  }
  // Cuerpo, cabeza, pico y cola
  g.ellipse(5, 6, 3, 2, 'k');
  g.rect(7, 3, 9, 5, 'k').set(8, 4, 'Y').set(10, 4, 'H').set(11, 4, 'H');
  g.line(2, 6, 0, 8, 'K').line(2, 7, 0, 9, 'k');
  g.set(4, 5, 'v').set(6, 5, 'v');
  if (pose === 'flap1') g.line(4, 4, 2, 0, 'K').line(5, 4, 4, 0, 'k');
  else if (pose === 'flap2') g.line(4, 7, 2, 9, 'K').line(5, 7, 4, 9, 'k');
  else if (pose === 'alert') g.line(4, 4, 1, 1, 'K').line(6, 4, 7, 0, 'K');
  else g.hline(3, 6, 5, 'K');
  if (pose === 'perch') g.set(5, 9, 'Y').set(6, 9, 'Y');
  g.outline('o');
  return g.toRows();
}

const BUILDERS = { toro, bombetero, sabanero, zanate };
let cache = null;
export function scEnemySprite(kind, pose) {
  cache ||= new SpriteCache((key) => {
    const [k, p] = key.split(':');
    return BUILDERS[k](p);
  }, SC_ENEMY_PAL);
  return cache.get(`${kind}:${pose}`);
}

export const TORO_COLORS = ['#5A3222', '#3A2016', '#F4F1EA', '#E0343F', '#FF2E88'];
export const PERSON_COLORS = ['#C8612E', '#FFD23F', '#B07A55', '#F4F1EA', '#FF2E88'];
export const ZANATE_COLORS = ['#14141E', '#2A2A44', '#4A3A7A', '#FFD23F'];
