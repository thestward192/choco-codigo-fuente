// El Torito Kernel (80×56): toro mecánico gigante hecho de piezas de carreta y chatarra —
// tablones pintados, ruedas de carreta como articulaciones, cuernos de metal, ojos rojos y humo
// en la nariz. Mira a la derecha. El chip de la espalda NO se dibuja aquí: solo se ve con la
// Vista Debug (lo dibuja la entidad).
import { Grid } from '../painter.js';
import { SpriteCache } from '../bake.js';

export const TORITO_PAL = {
  o: '#1A0E0A',
  P: '#C8612E', p: '#9A4420', q: '#E07A42', // tablones pintados
  Y: '#FFD23F', y: '#B8902A', // motivos amarillos
  M: '#6A6A80', m: '#44445A', L: '#9A9AB0', // chatarra
  W: '#5E3A1A', w: '#8B5A2B', // ruedas de madera
  h: '#E8E0D0', H: '#A8A090', // cuernos
  e: '#E0343F', E: '#FF2E88', c: '#43D9FF', // ojos y cables
  n: '#3A3A4E',
  x: '#F4F1EA',
};

function wheel(g, cx, cy, r, spin) {
  g.ellipse(cx, cy, r, r, 'W');
  g.ellipse(cx, cy, r - 2, r - 2, 'w');
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3;
    g.line(cx, cy, Math.round(cx + Math.cos(a) * (r - 1)), Math.round(cy + Math.sin(a) * (r - 1)), 'W');
  }
  g.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'Y');
}

// pose: stand | walk1 | walk2 | scrape | rear | stun | hurt
function torito(pose) {
  const g = new Grid(80, 56);
  const rear = pose === 'rear';
  const headDown = pose === 'scrape' || pose === 'stun';
  const lift = rear ? -8 : 0; // la parte delantera se levanta
  // ---- Patas (vigas de metal con pezuñas de rueda) ----
  const legs = {
    walk1: [-3, 2, 3, -2],
    walk2: [3, -2, -3, 2],
    scrape: [0, 0, 0, 5],
  }[pose] || [0, 0, 0, 0];
  const legX = [14, 24, 52, 62];
  legX.forEach((x, i) => {
    const front = i >= 2;
    const top = 36 + (front ? lift : 0);
    const bottom = front && rear ? 44 : 53;
    const dx = legs[i];
    g.rect(x, top, x + 4, bottom, i % 2 ? 'm' : 'M');
    g.line(x + 2, top, x + 2 + dx, bottom, 'L');
    g.rect(x - 1 + dx, bottom, x + 5 + dx, bottom + 2, 'n');
  });
  // ---- Cuerpo: un cajón de carreta con tablones ----
  const by = 16;
  for (let y = by; y < by + 22; y++) {
    const t = y - by;
    const x0 = 8 + (t < 3 ? 3 - t : 0);
    g.hline(x0, 66, y, t % 5 === 4 ? 'p' : 'P');
  }
  if (rear) {
    // Inclinado: la mitad delantera sube
    for (let x = 40; x < 68; x++) {
      const k = Math.round(((x - 40) / 28) * -lift);
      for (let y = by - k; y < by; y++) g.set(x, y, 'P');
    }
  }
  g.hline(8, 66, by, 'q');
  // Motivos de carreta: rombos y flores amarillas
  for (let i = 0; i < 5; i++) {
    const cx = 16 + i * 11;
    g.set(cx, by + 9, 'Y').set(cx - 1, by + 10, 'Y').set(cx + 1, by + 10, 'Y').set(cx, by + 11, 'Y').set(cx, by + 10, 'E');
  }
  g.hline(8, 66, by + 21, 'p');
  // Joroba de chatarra con cables
  g.ellipse(46, by - 2 + (rear ? -5 : 0), 9, 4, 'M');
  g.hline(39, 53, by - 5 + (rear ? -5 : 0), 'L');
  g.line(30, by - 1, 38, by - 4 + (rear ? -5 : 0), 'c');
  // Ruedas de carreta como hombro y cadera
  wheel(g, 18, by + 18, 7, pose === 'walk1' ? 0.4 : 0);
  wheel(g, 56, by + 18 + (rear ? lift : 0), 7, pose === 'walk2' ? 0.4 : 0);
  // Cola: cadena con borla
  g.line(8, by + 3, 3, by + 12, 'm').line(3, by + 12, 2, by + 18, 'm');
  g.rect(1, by + 18, 3, by + 21, 'Y');
  // ---- Cabeza: bloque de metal con hocico de madera ----
  const hy = (headDown ? 26 : 12) + (rear ? -10 : 0);
  const hx = 64;
  g.rect(hx, hy, hx + 12, hy + 14, 'M');
  g.hline(hx, hx + 12, hy, 'L');
  g.rect(hx + 8, hy + 8, hx + 15, hy + 16, 'w');
  g.set(hx + 12, hy + 11, 'o').set(hx + 12, hy + 14, 'o');
  // Cuernos de metal
  g.line(hx + 2, hy, hx - 3, hy - 6, 'h').line(hx - 3, hy - 6, hx - 1, hy - 10, 'H');
  g.line(hx + 9, hy, hx + 13, hy - 6, 'h').line(hx + 13, hy - 6, hx + 11, hy - 10, 'H');
  // Ojo
  if (pose === 'stun' || pose === 'hurt') g.line(hx + 4, hy + 4, hx + 7, hy + 7, 'x').line(hx + 7, hy + 4, hx + 4, hy + 7, 'x');
  else g.rect(hx + 5, hy + 4, hx + 7, hy + 6, 'e').set(hx + 8, hy + 4, 'E');
  // Cuello de tablones
  g.rect(58, hy + 4, 64, hy + 12, 'p');
  g.outline('o');
  return g.toRows();
}

let cache = null;
export function toritoSprite(pose) {
  cache ||= new SpriteCache(torito, TORITO_PAL);
  return cache.get(pose);
}

export const TORITO_W = 80;
export const TORITO_H = 56;
export const TORITO_COLORS = ['#C8612E', '#9A4420', '#FFD23F', '#6A6A80', '#5E3A1A', '#8B5A2B'];
