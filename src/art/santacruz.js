// Decoración de Santa Cruz dibujada con rectángulos de píxel (docs/04_arte.md · nivel 4):
// árboles de guanacaste, carretas pintadas, toldos de los puestos, tarima de marimba, bebederos,
// faroles (checkpoints), horno de barro, campana con la jaula de Fabiola, nodos del lazo y comidas.
// Todo es original; las coordenadas son de pantalla (ya restada la cámara).
import { Sprite } from './bake.js';
import { disc } from '../core/lighting.js';

const r = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

// ---------- Árbol de guanacaste: tronco corto y copa muy ancha y plana ----------
// (x, gy): centro del tronco y suelo. w: ancho de la copa. cy: altura de la parte de abajo de la copa
export function drawGuanacaste(ctx, x, gy, w, canopyBottom, t, dusk = false) {
  const trunk = dusk ? '#3A2A40' : '#6A4A2A';
  const leaf = dusk ? ['#2A3A3A', '#34464A', '#22302E'] : ['#6E8B3D', '#86A64A', '#55702E'];
  const top = canopyBottom - 14;
  // Tronco con ramas que se abren
  r(ctx, trunk, x - 3, canopyBottom - 2, 6, gy - canopyBottom + 2);
  r(ctx, dusk ? '#2A1E30' : '#4E3420', x + 1, canopyBottom, 2, gy - canopyBottom);
  ctx.fillStyle = trunk;
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(Math.round(x - 3 - i * 1.6), canopyBottom - 1 - Math.floor(i / 2), 2, 1);
    ctx.fillRect(Math.round(x + 2 + i * 1.6), canopyBottom - 1 - Math.floor(i / 2), 2, 1);
  }
  // Copa: capas planas con borde irregular que se mece apenas
  const half = w / 2;
  for (let row = 0; row < 14; row++) {
    const k = row < 4 ? row / 4 : 1;
    const hw = Math.round(half * (0.55 + 0.45 * k) - (row > 10 ? (row - 10) * 3 : 0));
    const sway = Math.round(Math.sin(t * 1.2 + row * 0.5) * 0.6);
    ctx.fillStyle = row < 3 ? leaf[1] : row > 10 ? leaf[2] : leaf[0];
    ctx.fillRect(Math.round(x - hw + sway), top + row, hw * 2, 1);
  }
  // Manchas de luz en las hojas
  ctx.fillStyle = leaf[1];
  for (let i = 0; i < Math.floor(w / 10); i++) ctx.fillRect(Math.round(x - half + 6 + i * 10), top + 4 + (i % 3) * 2, 4, 1);
}

// ---------- Carreta pintada (motivos de colores, ruedas con rayos) ----------
export function drawCarreta(ctx, x, gy, t, glitch = false) {
  // Cajón
  r(ctx, '#C8612E', x - 20, gy - 26, 40, 12);
  r(ctx, '#FFD23F', x - 20, gy - 26, 40, 2);
  r(ctx, '#2A140C', x - 20, gy - 15, 40, 1);
  for (let i = 0; i < 4; i++) {
    const cx = x - 15 + i * 10;
    r(ctx, ['#FF6B8A', '#4FD1C5', '#43D9FF', '#6E8B3D'][i], cx - 2, gy - 22, 5, 5);
    r(ctx, '#FFFFFF', cx, gy - 20, 1, 1);
  }
  // Toldo de manta sobre la carreta (da sombra)
  r(ctx, '#F4F1EA', x - 22, gy - 36, 44, 4);
  r(ctx, '#D8CDB8', x - 22, gy - 33, 44, 1);
  r(ctx, '#8B5A2B', x - 21, gy - 33, 2, 8);
  r(ctx, '#8B5A2B', x + 19, gy - 33, 2, 8);
  // Rueda
  const a = glitch ? t * 6 : 0;
  ctx.fillStyle = '#5E3A1A';
  disc(ctx, x, gy - 9, 9);
  ctx.fillStyle = '#C8612E';
  disc(ctx, x, gy - 9, 7);
  ctx.fillStyle = '#FFD23F';
  for (let i = 0; i < 6; i++) {
    const ang = a + (i * Math.PI) / 3;
    for (let k = 1; k < 7; k++) ctx.fillRect(Math.round(x + Math.cos(ang) * k), Math.round(gy - 9 + Math.sin(ang) * k), 1, 1);
  }
  r(ctx, '#2A140C', x - 1, gy - 10, 3, 3);
  // Lanza
  r(ctx, '#5E3A1A', x + 20, gy - 16, 14, 2);
}

// ---------- Toldo de un puesto de comida (franjas) ----------
export function drawAwning(ctx, x, y, w, colorA, colorB) {
  for (let i = 0; i < w; i += 6) r(ctx, (i / 6) % 2 ? colorB : colorA, x + i, y, Math.min(6, w - i), 6);
  // Borde ondulado
  for (let i = 0; i < w; i += 6) {
    r(ctx, (i / 6) % 2 ? colorB : colorA, x + i + 1, y + 6, 4, 2);
    r(ctx, (i / 6) % 2 ? colorB : colorA, x + i + 2, y + 8, 2, 1);
  }
  r(ctx, '#2A140C', x, y - 1, w, 1);
}

// Puesto: mostrador, postes y la comida en exhibición
export function drawStall(ctx, x, gy, food, colors, near, t) {
  r(ctx, '#5E3A1A', x - 22, gy - 38, 2, 38);
  r(ctx, '#5E3A1A', x + 20, gy - 38, 2, 38);
  drawAwning(ctx, x - 24, gy - 44, 48, colors[0], colors[1]);
  r(ctx, '#8B5A2B', x - 20, gy - 14, 40, 14);
  r(ctx, '#B07A45', x - 20, gy - 14, 40, 2);
  r(ctx, '#5E3A1A', x - 20, gy - 2, 40, 2);
  if (food) {
    const s = foodSprite(food);
    const bob = near ? Math.round(Math.sin(t * 6)) : 0;
    ctx.drawImage(s.normal, x - 4, gy - 23 + bob);
  }
}

// ---------- Tarima de marimba ----------
export function drawMarimba(ctx, x, gy, t) {
  r(ctx, '#5E3A1A', x - 26, gy - 8, 52, 8);
  r(ctx, '#8B5A2B', x - 26, gy - 8, 52, 2);
  // Teclas de madera de distintos largos
  for (let i = 0; i < 12; i++) {
    const h = 10 - Math.floor(i / 2);
    const hit = Math.floor(t * 6) % 12 === i;
    r(ctx, hit ? '#FFD27A' : i % 2 ? '#B07A45' : '#A06A35', x - 22 + i * 4, gy - 22 - (hit ? 1 : 0), 3, h);
  }
  r(ctx, '#2A140C', x - 24, gy - 13, 48, 1);
  r(ctx, '#2A140C', x - 22, gy - 12, 1, 4);
  r(ctx, '#2A140C', x + 21, gy - 12, 1, 4);
  // Notitas glitcheadas
  if (Math.floor(t * 2) % 2 === 0) {
    r(ctx, '#2A140C', x + 8, gy - 34 - Math.round((t * 10) % 6), 2, 2);
    r(ctx, '#2A140C', x + 9, gy - 40 - Math.round((t * 10) % 6), 1, 6);
  }
}

// ---------- Bebedero de agua ----------
export function drawFountain(ctx, x, gy, t, splash = 0) {
  r(ctx, '#B8A37E', x - 8, gy - 12, 16, 12);
  r(ctx, '#F5E6C8', x - 8, gy - 12, 16, 2);
  r(ctx, '#DCC9A4', x - 6, gy - 22, 3, 10);
  r(ctx, '#43D9FF', x - 6, gy - 10, 12, 2);
  // Chorrito
  const f = Math.floor(t * 10) % 3;
  r(ctx, '#8AE8FF', x - 3, gy - 22, 3, 1);
  r(ctx, '#43D9FF', x - 1 + (f === 1 ? 1 : 0), gy - 21, 1, 10);
  if (splash > 0) {
    ctx.globalAlpha = splash;
    r(ctx, '#FFFFFF', x - 10, gy - 16, 20, 1);
    ctx.globalAlpha = 1;
  }
}

// ---------- Farol (checkpoint): apagado → encendido con llama ----------
export function drawFarol(ctx, x, gy, on, t, flash) {
  r(ctx, '#2A140C', x - 3, gy - 2, 7, 2);
  r(ctx, '#3A2A20', x, gy - 30, 1, 28);
  r(ctx, '#2A140C', x - 4, gy - 38, 9, 2);
  r(ctx, '#2A140C', x - 3, gy - 31, 7, 1);
  const lit = flash > 0 && Math.floor(flash * 20) % 2 ? '#FFFFFF' : on ? '#FFD27A' : '#5A4A3A';
  r(ctx, lit, x - 3, gy - 36, 7, 5);
  if (on) {
    const f = Math.floor(t * 8) % 2;
    r(ctx, '#FF8A3D', x - 1, gy - 36 + f, 3, 3);
    r(ctx, '#FFFFFF', x, gy - 35, 1, 1);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#FFD27A';
    disc(ctx, x, gy - 33, 9);
    ctx.globalAlpha = 1;
  }
}

// ---------- Horno de barro (la rosquilla perfecta) ----------
export function drawOven(ctx, x, gy, t, hasFood) {
  ctx.fillStyle = '#8A4A2A';
  disc(ctx, x, gy - 10, 12);
  r(ctx, '#8A4A2A', x - 12, gy - 10, 24, 10);
  ctx.fillStyle = '#A85A32';
  disc(ctx, x - 2, gy - 13, 8);
  r(ctx, '#2A140C', x - 5, gy - 9, 10, 9);
  r(ctx, '#FF8A3D', x - 4, gy - 3, 8, 2);
  if (Math.floor(t * 6) % 2) r(ctx, '#FFD23F', x - 2, gy - 4, 3, 1);
  // Humito
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    ctx.globalAlpha = 0.5 * (1 - k);
    r(ctx, '#E8E0D0', x + 6 + Math.round(Math.sin(k * 6 + i) * 2), gy - 22 - Math.round(k * 18), 3, 3);
  }
  ctx.globalAlpha = 1;
  if (hasFood) ctx.drawImage(foodSprite('rosquilla').normal, x - 4, gy - 31 + Math.round(Math.sin(t * 4)));
}

// ---------- Nodo del lazo: esfera brillante ----------
export function drawLassoNode(ctx, x, y, t, { selected = false, hooked = 0, dusk = true } = {}) {
  const pulse = Math.sin(t * 5) * 0.5 + 0.5;
  ctx.globalAlpha = 0.25 + pulse * 0.2;
  ctx.fillStyle = '#43D9FF';
  disc(ctx, x, y, 7 + (selected ? 2 : 0));
  ctx.globalAlpha = 1;
  ctx.fillStyle = dusk ? '#1A3A52' : '#2A6F8A';
  disc(ctx, x, y, 4);
  ctx.fillStyle = selected || hooked > 0 ? '#FFFFFF' : '#8AE8FF';
  disc(ctx, x, y, 3);
  r(ctx, '#FFFFFF', x - 1, y - 2, 1, 1);
  if (selected) {
    // Corchetes que marcan el nodo seleccionado
    const d = 9 + Math.round(pulse);
    ctx.fillStyle = '#FFFFFF';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillRect(Math.round(x + sx * d - (sx > 0 ? 2 : 0)), Math.round(y + sy * d), 3, 1);
      ctx.fillRect(Math.round(x + sx * d), Math.round(y + sy * d - (sy > 0 ? 2 : 0)), 1, 3);
    }
  }
}

// ---------- Campana del campanario y la jaula colgando ----------
export function drawBell(ctx, x, y, t, ring = 0) {
  const sw = Math.round(Math.sin(t * 12) * 3 * ring);
  r(ctx, '#5E3A1A', x - 30, y - 6, 60, 4);
  r(ctx, '#3A2A20', x - 1, y - 2, 2, 4);
  ctx.fillStyle = '#B8902A';
  for (let row = 0; row < 14; row++) {
    const hw = 3 + Math.round(row * 0.65);
    ctx.fillRect(x - hw + sw, y + 2 + row, hw * 2, 1);
  }
  r(ctx, '#FFD23F', x - 3 + sw, y + 4, 2, 6);
  r(ctx, '#6A4A10', x - 10 + sw, y + 15, 20, 2);
  r(ctx, '#3A2A20', x - 1 + sw * 2, y + 16, 3, 3);
}

// Jaula de alambre de púas con Fabiola adentro (se dibuja ella aparte)
export function drawCage(ctx, x, y, open = 0) {
  const h = 30;
  ctx.fillStyle = '#8A8AA0';
  if (open < 1) {
    for (let i = 0; i < 6; i++) {
      if (open > 0 && i * 0.17 < open) continue;
      ctx.fillRect(x - 13 + i * 5, y - h, 1, h);
    }
  }
  r(ctx, '#5A5A6E', x - 15, y - h - 2, 30, 2);
  r(ctx, '#5A5A6E', x - 15, y - 1, 30, 2);
  // Púas
  ctx.fillStyle = '#B0B0C4';
  for (let i = 0; i < 6; i++) ctx.fillRect(x - 13 + i * 5, y - h - 4, 1, 2);
}

// ---------- Columna de sol de las ruinas ----------
export function drawSunbeam(ctx, x, y0, w, h, t) {
  for (let i = 0; i < w; i++) {
    const edge = i < 2 || i >= w - 2;
    ctx.globalAlpha = edge ? 0.35 : 0.2 + 0.05 * Math.sin(t * 4 + i * 0.4);
    ctx.fillStyle = edge ? '#FFF4C0' : '#FFD27A';
    ctx.fillRect(Math.round(x + i), Math.round(y0), 1, Math.round(h));
  }
  ctx.globalAlpha = 1;
  // Polvito flotando en la luz
  ctx.fillStyle = '#FFF4C0';
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.2 + i / 6) % 1;
    ctx.fillRect(Math.round(x + 3 + ((i * 7) % (w - 4))), Math.round(y0 + k * h), 1, 1);
  }
}

// ---------- Comidas de la plaza (8×8) ----------
const FOOD = {
  // Chorreada: tortilla dulce de maíz con natilla
  chorreada: ['..yyyy..', '.yYYYYy.', 'yYYwwYYy', 'yYwwwwYy', 'yYYwwYYy', '.yYYYYy.', '..yyyy..', '........'],
  // Tanela: pan de queso cuadrado
  tanela: ['........', '.oooooo.', '.oYYYYo.', '.oYyYYo.', '.oYYyYo.', '.oYYYYo.', '.oooooo.', '........'],
  // Arroz de maíz: platito con muchas cosas
  arroz: ['........', '..YgYr..', '.YyYYgY.', 'YYrYYyYY', 'wwwwwwww', '.wqqqqw.', '..wwww..', '........'],
  // Empanada
  empanada: ['........', '...yyy..', '..yYYYy.', '.yYYYYYy', 'yYYYYYYy', 'yyYyYyYy', '........', '........'],
  // Rosquilla perfecta: dorada parejita, sin quemaditos
  rosquilla: ['..yyyy..', '.yYYYYy.', 'yYY..YYy', 'yY....Yy', 'yYY..YYy', '.yYYYYy.', '..yyyy..', '........'],
};
const FOOD_PAL = { y: '#B8762A', Y: '#F2B84A', w: '#F4F1EA', o: '#8A5A2A', g: '#6E8B3D', r: '#E0343F', q: '#C9B458' };
const foodCache = {};
export function foodSprite(key) {
  return (foodCache[key] ||= new Sprite(FOOD[key], FOOD_PAL));
}
export const FOOD_KEYS = Object.keys(FOOD);
