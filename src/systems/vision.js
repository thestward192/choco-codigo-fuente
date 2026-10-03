// Conos de visión con raycast contra el tilemap (nivel 3) — docs/niveles/nivel_3_novacomp.md
// Los rayos se cortan con los tiles opacos (paredes, racks, puertas) y con las nubes de vapor
// de Hezron (círculos). El vidrio, los escritorios y las barandas no tapan la vista.
// Lógica pura: sin dibujo.
import { SCREEN, STEALTH } from '../config/balance.js';

const TS = SCREEN.TILE;

// Distancia hasta el primer tile opaco a lo largo de (dx, dy) normalizado (DDA por tiles).
function rayTiles(isOpaque, x, y, dx, dy, maxDist) {
  let tx = Math.floor(x / TS);
  let ty = Math.floor(y / TS);
  if (isOpaque(tx, ty)) return 0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(TS / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(TS / dy) : Infinity;
  let tMaxX = dx > 0 ? ((tx + 1) * TS - x) / dx : dx < 0 ? (tx * TS - x) / dx : Infinity;
  let tMaxY = dy > 0 ? ((ty + 1) * TS - y) / dy : dy < 0 ? (ty * TS - y) / dy : Infinity;
  for (let guard = 0; guard < 256; guard++) {
    let t;
    if (tMaxX < tMaxY) {
      t = tMaxX;
      if (t > maxDist) return maxDist;
      tx += stepX;
      tMaxX += tDeltaX;
    } else {
      t = tMaxY;
      if (t > maxDist) return maxDist;
      ty += stepY;
      tMaxY += tDeltaY;
    }
    if (isOpaque(tx, ty)) return t;
  }
  return maxDist;
}

// Primer punto de entrada del rayo en un círculo { x, y, r } (0 si el origen está adentro).
export function rayCircle(x, y, dx, dy, c) {
  const ox = x - c.x;
  const oy = y - c.y;
  const cc = ox * ox + oy * oy - c.r * c.r;
  if (cc <= 0) return 0;
  const b = ox * dx + oy * dy;
  if (b > 0) return null; // apunta hacia afuera
  const disc = b * b - cc;
  if (disc < 0) return null;
  return -b - Math.sqrt(disc);
}

// Largo del rayo desde (x, y) con ángulo `ang` hasta chocar con algo (o maxDist).
export function castRay(isOpaque, x, y, ang, maxDist, circles = []) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let d = rayTiles(isOpaque, x, y, dx, dy, maxDist);
  for (const c of circles) {
    const t = rayCircle(x, y, dx, dy, c);
    if (t !== null && t < d) d = t;
  }
  return Math.max(0, d);
}

// ¿Hay línea de vista libre entre dos puntos?
export function lineOfSight(isOpaque, x0, y0, x1, y1, circles = []) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  if (d < 0.001) return true;
  return castRay(isOpaque, x0, y0, Math.atan2(y1 - y0, x1 - x0), d, circles) >= d - 0.5;
}

// Diferencia angular en -π..π
export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// viewer: { x, y, facing, half, range }. half >= π = visión circular (drones).
export function canSee(viewer, px, py, isOpaque, circles = []) {
  const d = Math.hypot(px - viewer.x, py - viewer.y);
  if (d > viewer.range) return false;
  const ang = Math.atan2(py - viewer.y, px - viewer.x);
  if (viewer.half < Math.PI && Math.abs(angleDiff(ang, viewer.facing)) > viewer.half) return false;
  return castRay(isOpaque, viewer.x, viewer.y, ang, d, circles) >= d - 0.5;
}

// Polígono del cono (origen + puntos del arco recortados), para dibujarlo.
export function conePolygon(viewer, isOpaque, circles = [], rays = STEALTH.CONE_RAYS) {
  const pts = [];
  const full = viewer.half >= Math.PI;
  if (!full) pts.push({ x: viewer.x, y: viewer.y });
  const n = full ? rays * 2 : rays;
  for (let i = 0; i <= n; i++) {
    const a = full ? (i / n) * Math.PI * 2 : viewer.facing - viewer.half + (i / n) * viewer.half * 2;
    const d = castRay(isOpaque, viewer.x, viewer.y, a, viewer.range, circles);
    pts.push({ x: viewer.x + Math.cos(a) * d, y: viewer.y + Math.sin(a) * d });
  }
  return pts;
}

// Medidor de sospecha (0..1). Dentro del cono se llena en SUSPICION_TIME (o la mitad si está
// cerca); afuera baja poco a poco.
export function stepSuspicion(sus, seen, dist, dt) {
  if (seen) {
    const time = dist < STEALTH.CLOSE_DIST ? STEALTH.SUSPICION_TIME_CLOSE : STEALTH.SUSPICION_TIME;
    return Math.min(1, sus + dt / time);
  }
  return Math.max(0, sus - STEALTH.SUSPICION_DECAY * dt);
}
