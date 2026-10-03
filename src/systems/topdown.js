// Movimiento cenital (niveles 2 y 3) — docs/03_mecanicas.md
// 8 direcciones, aceleración rápida, colisión por hitbox en los pies contra el tilemap y
// contra rectángulos dinámicos (estantes, NPCs, mostradores). Lógica pura: sin dibujo ni teclado.
import { SCREEN, TOPDOWN } from '../config/balance.js';
import { approach } from '../core/tween.js';

const TS = SCREEN.TILE;
const EPS = 0.001;

export function createTopdownBody(footX, footY, w = TOPDOWN.HITBOX_W, h = TOPDOWN.HITBOX_H) {
  return { x: footX - w / 2, y: footY - h, w, h, vx: 0, vy: 0, blockedX: 0, blockedY: 0 };
}

// Dirección de entrada normalizada (las diagonales no son más rápidas)
export function normalizeInput(ix, iy) {
  if (ix && iy) return { x: ix * Math.SQRT1_2, y: iy * Math.SQRT1_2 };
  return { x: ix, y: iy };
}

function rectHitsTiles(x, y, w, h, map) {
  const x0 = Math.floor(x / TS);
  const x1 = Math.floor((x + w - EPS) / TS);
  const y0 = Math.floor(y / TS);
  const y1 = Math.floor((y + h - EPS) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (map.isSolid(tx, ty)) return true;
  return false;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Mueve un eje resolviendo contra tiles y rectángulos. Devuelve el obstáculo (o true si fue un tile).
function moveAxis(body, d, axis, map, rects) {
  if (d === 0) return null;
  const steps = Math.ceil(Math.abs(d) / 4);
  const step = d / steps;
  for (let i = 0; i < steps; i++) {
    const prev = body[axis];
    body[axis] += step;
    let hit = rectHitsTiles(body.x, body.y, body.w, body.h, map) ? true : null;
    if (!hit) for (const r of rects) if (r && !r.passable && overlaps(body, r)) hit = r;
    if (hit) {
      // Se pega al borde del obstáculo
      body[axis] = prev;
      if (hit === true) {
        // Avanza píxel a píxel hasta tocar el tile
        const dir = Math.sign(step);
        for (let k = 0; k < Math.abs(step); k += 0.25) {
          body[axis] += dir * 0.25;
          if (rectHitsTiles(body.x, body.y, body.w, body.h, map)) {
            body[axis] -= dir * 0.25;
            break;
          }
        }
      } else if (axis === 'x') body.x = step > 0 ? hit.x - body.w : hit.x + hit.w;
      else body.y = step > 0 ? hit.y - body.h : hit.y + hit.h;
      return hit;
    }
  }
  return null;
}

// Un paso de movimiento cenital.
// input: { x, y } en -1..1 (se normaliza), speed: velocidad máxima
// rects: obstáculos dinámicos { x, y, w, h, passable? }
// Devuelve { hitX, hitY } con el obstáculo contra el que chocó en cada eje (o null).
export function stepTopdown(body, input, dt, map, rects = [], speed = TOPDOWN.WALK_SPEED) {
  const dir = normalizeInput(Math.sign(input.x || 0), Math.sign(input.y || 0));
  const accel = speed / TOPDOWN.ACCEL_TIME;
  body.vx = approach(body.vx, dir.x * speed, accel * dt);
  body.vy = approach(body.vy, dir.y * speed, accel * dt);
  const hitX = moveAxis(body, body.vx * dt, 'x', map, rects);
  if (hitX) body.vx = 0;
  const hitY = moveAxis(body, body.vy * dt, 'y', map, rects);
  if (hitY) body.vy = 0;
  body.blockedX = hitX ? Math.sign(input.x || 0) : 0;
  body.blockedY = hitY ? Math.sign(input.y || 0) : 0;
  return { hitX, hitY };
}

// Tile que ocupa el centro de los pies
export function footTile(body) {
  return { tx: Math.floor((body.x + body.w / 2) / TS), ty: Math.floor((body.y + body.h / 2) / TS) };
}

// Dirección cardinal de un vector (para el sprite de 4 direcciones)
export function facingFrom(x, y, current = 'down') {
  if (!x && !y) return current;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
