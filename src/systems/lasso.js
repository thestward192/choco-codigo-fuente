// Lazo de Fibra Óptica — docs/03_mecanicas.md
// - Se engancha solo a nodos dentro de 90 px, en un cono de 120° hacia donde mira Choco o hacia
//   arriba. Entre los posibles se elige el más cercano con la vista libre.
// - Enganchado, Choco es un péndulo de cuerda rígida (longitud = distancia inicial, se acorta con ↑
//   y se alarga con ↓ entre 24 y 90 px). ← → empujan el columpio.
// - Al soltar sale con la velocidad tangencial y un impulso vertical extra.
// Lógica pura: la usan Choco y las pruebas.
import { LASSO } from '../config/balance.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Diferencia angular absoluta entre dos direcciones (rad)
function angleBetween(ax, ay, bx, by) {
  const d = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (d === 0) return 0;
  return Math.acos(clamp((ax * bx + ay * by) / d, -1, 1));
}

// ¿Hay una línea libre entre dos puntos? (pasos de 4 px contra los tiles sólidos)
export function clearLine(isSolid, TS, x0, y0, x1, y1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (isSolid(Math.floor(x / TS), Math.floor(y / TS))) return false;
  }
  return true;
}

// ¿El nodo está al alcance? hand: punto de la mano; facing: -1 | 1.
export function nodeInReach(node, hand, facing, P = LASSO) {
  const dx = node.x - hand.x;
  const dy = node.y - hand.y;
  const dist = Math.hypot(dx, dy);
  if (dist > P.RANGE || dist < 4) return false;
  return angleBetween(dx, dy, facing, 0) <= P.CONE_HALF || angleBetween(dx, dy, 0, -1) <= P.CONE_HALF;
}

// El mejor nodo (el más cercano al alcance y con la vista libre) o null.
export function pickNode(nodes, hand, facing, isSolid = null, TS = 16, P = LASSO) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    if (n.disabled || !nodeInReach(n, hand, facing, P)) continue;
    if (isSolid && !clearLine(isSolid, TS, hand.x, hand.y, n.x, n.y)) continue;
    const d = Math.hypot(n.x - hand.x, n.y - hand.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

// Engancha: el punto (px, py) cuelga de (ax, ay) con la velocidad actual.
export function createSwing(node, px, py, vx, vy, P = LASSO) {
  const len = clamp(Math.hypot(px - node.x, py - node.y), P.MIN_LEN, P.MAX_LEN);
  const s = { node, ax: node.x, ay: node.y, px, py, vx, vy, len };
  constrain(s);
  return s;
}

// Cuerda rígida: el punto vuelve al círculo y se le quita la velocidad radial.
function constrain(s) {
  let dx = s.px - s.ax;
  let dy = s.py - s.ay;
  let d = Math.hypot(dx, dy);
  if (d < 0.0001) {
    dx = 0;
    dy = 1;
    d = 1;
  }
  const nx = dx / d;
  const ny = dy / d;
  s.px = s.ax + nx * s.len;
  s.py = s.ay + ny * s.len;
  const radial = s.vx * nx + s.vy * ny;
  s.vx -= radial * nx;
  s.vy -= radial * ny;
}

// Un paso del péndulo. input: { moveX (-1..1), reel (-1 acortar, 1 alargar, 0) }.
export function swingStep(s, dt, input = {}, P = LASSO) {
  const moveX = input.moveX || 0;
  const reel = input.reel || 0;
  if (reel) s.len = clamp(s.len + reel * P.REEL_SPEED * dt, P.MIN_LEN, P.MAX_LEN);
  s.vy += P.GRAVITY * dt;
  // Bombear: aceleración en la dirección tangente que coincide con ← →
  if (moveX) {
    const dx = s.px - s.ax;
    const dy = s.py - s.ay;
    const d = Math.hypot(dx, dy) || 1;
    let tx = -dy / d;
    let ty = dx / d;
    if (tx * moveX < 0) {
      tx = -tx;
      ty = -ty;
    }
    s.vx += tx * P.PUMP * dt;
    s.vy += ty * P.PUMP * dt;
  }
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > P.MAX_SPEED) {
    s.vx *= P.MAX_SPEED / sp;
    s.vy *= P.MAX_SPEED / sp;
  }
  s.px += s.vx * dt;
  s.py += s.vy * dt;
  constrain(s);
  return s;
}

// Velocidad al soltar: la tangencial más el impulso hacia arriba.
export function releaseVelocity(s, P = LASSO) {
  return { vx: s.vx, vy: s.vy + P.RELEASE_VY };
}

// Ángulo del columpio (0 = colgando justo debajo del nodo; positivo hacia la derecha)
export function swingAngle(s) {
  return Math.atan2(s.px - s.ax, s.py - s.ay);
}
