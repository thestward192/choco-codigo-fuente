// Agua del Modo Sincronizado — docs/coop/03_mecanicas_coop.md
// Lógica pura (sin dibujo ni sonido): la usan Choco, Tapita, las salas y las pruebas.
//
// El agua son rectángulos { x, y, w, h } en píxeles; `y` es la superficie (la marea la puede mover).
// - Choco: agua baja (hasta la mitad del cuerpo) lo frena al 70 %; en agua profunda flota y nada.
//   Sube solo a la superficie, con ↓ bucea y tiene 10 s de oxígeno con la cabeza debajo del agua.
// - Tapita: con los pies mojados se daña; con más de la mitad del cuerpo adentro se disuelve.
import { COOP, PLATFORMER, SCREEN } from '../config/balance.js';
import { approach } from '../core/tween.js';
import { moveX, moveY } from './physics.js';

const W = COOP.WATER;
const O = COOP.OXYGEN;

// Junta las celdas de agua de un mapa (carácter `ch`) en rectángulos: una corrida horizontal por
// fila, y las corridas iguales de filas seguidas se unen hacia abajo. Los charcos (`puddle`, medio
// tile de agua sobre el piso: agua baja) van aparte.
export function waterZonesFromMap(map, ch = 'w', TS = SCREEN.TILE, puddle = 'v') {
  const runs = [];
  for (let ty = 0; ty < map.h; ty++) {
    let tx = 0;
    while (tx < map.w) {
      if (map.charAt(tx, ty) !== ch) {
        tx++;
        continue;
      }
      const x0 = tx;
      while (tx < map.w && map.charAt(tx, ty) === ch) tx++;
      runs.push({ x0, x1: tx - 1, ty });
    }
  }
  const zones = [];
  for (const r of runs) {
    const z = zones.find((q) => q.x0 === r.x0 && q.x1 === r.x1 && q.ty1 === r.ty - 1);
    if (z) z.ty1 = r.ty;
    else zones.push({ x0: r.x0, x1: r.x1, ty0: r.ty, ty1: r.ty });
  }
  const out = zones.map((z) => ({ x: z.x0 * TS, y: z.ty0 * TS, w: (z.x1 - z.x0 + 1) * TS, h: (z.ty1 - z.ty0 + 1) * TS, baseY: z.ty0 * TS }));
  for (let ty = 0; ty < map.h; ty++) {
    let tx = 0;
    while (tx < map.w) {
      if (map.charAt(tx, ty) !== puddle) {
        tx++;
        continue;
      }
      const x0 = tx;
      while (tx < map.w && map.charAt(tx, ty) === puddle) tx++;
      out.push({ x: x0 * TS, y: ty * TS + TS / 2, w: (tx - x0) * TS, h: TS / 2, baseY: ty * TS + TS / 2, puddle: true });
    }
  }
  return out;
}

// La zona de agua que toca el cuerpo, o null. Si toca varias, la de la superficie más alta (lo que
// importa es dónde está la superficie: debajo, todo es agua hasta el fondo).
export function waterAt(zones, body) {
  let best = null;
  for (const z of zones) {
    if (body.x + body.w <= z.x || body.x >= z.x + z.w) continue;
    if (body.y + body.h <= z.y || body.y >= z.y + z.h) continue;
    if (!best || z.y < best.y) best = z;
  }
  return best;
}

// Fracción del cuerpo debajo de la superficie (0..1).
export function submergedFraction(body, zone) {
  if (!zone) return 0;
  const top = Math.max(body.y, zone.y);
  return Math.max(0, Math.min(1, (body.y + body.h - top) / body.h));
}

// ¿El punto está debajo del agua?
export function pointInWater(zones, x, y) {
  for (const z of zones) if (x >= z.x && x < z.x + z.w && y > z.y && y < z.y + z.h) return true;
  return false;
}

// Cómo está Choco en el agua: 'dry' | 'shallow' | 'deep'
export function chocoWaterState(body, zone) {
  const f = submergedFraction(body, zone);
  if (f <= 0) return 'dry';
  return f > 0.5 ? 'deep' : 'shallow';
}

// Cómo está Tapita en el agua: 'dry' | 'wet' (se daña) | 'dissolve'
export function tapitaWaterState(body, zone) {
  if (!zone) return 'dry';
  const f = submergedFraction(body, zone);
  if (f > W.TAPITA_DISSOLVE) return 'dissolve';
  return body.y + body.h - zone.y >= W.TAPITA_WET ? 'wet' : 'dry';
}

export function createSwimState() {
  return { oxygen: O.MAX, surfacing: 0, under: false, bob: 0 };
}

// Un paso nadando (agua profunda). intent: { moveX, up, down, jumpPressed }.
// Devuelve { jumpedOut, stroke, outOfAir }.
export function swimStep(body, sw, intent, dt, map, zone) {
  const out = { jumpedOut: false, stroke: false, outOfAir: false };
  body.onGround = false;
  body.platform = null;
  sw.bob += dt;
  const floatY = zone.y - W.FLOAT_Y; // la cabeza queda afuera
  const atSurface = body.y <= floatY + 3;
  const forcedUp = sw.surfacing > 0;
  if (forcedUp) sw.surfacing = Math.max(0, sw.surfacing - dt);

  // Horizontal
  body.vx = approach(body.vx, intent.moveX * W.SWIM_SPEED, W.SWIM_ACCEL * dt);

  // Vertical: sube solo a la superficie; ↓ bucea; ↑ sube más rápido
  let target;
  if (forcedUp) target = -W.UP_SPEED * 1.4;
  else if (intent.down) target = W.DIVE_SPEED;
  else if (intent.up && !atSurface) target = -W.UP_SPEED;
  else if (atSurface) target = (floatY + Math.sin(sw.bob * 3) * W.BOB - body.y) * 6;
  else target = -W.RISE_SPEED;
  body.vy = approach(body.vy, target, W.WATER_ACCEL * dt);

  if (intent.jumpPressed && !forcedUp) {
    if (atSurface) {
      body.vy = W.JUMP_OUT;
      out.jumpedOut = true;
    } else {
      body.vy = Math.min(body.vy, W.STROKE);
      out.stroke = true;
    }
  }

  moveX(body, body.vx * dt, map);
  moveY(body, body.vy * dt, map);
  // Flotando no se pasa de la superficie (salvo al saltar afuera)
  if (!out.jumpedOut && body.y < floatY - W.BOB) {
    body.y = floatY - W.BOB;
    if (body.vy < 0) body.vy = 0;
  }

  // Oxígeno: se gasta con la cabeza debajo del agua y se recarga afuera
  sw.under = body.y + 3 > zone.y;
  if (sw.under) {
    sw.oxygen = Math.max(0, sw.oxygen - dt);
    if (sw.oxygen <= 0 && !forcedUp) {
      out.outOfAir = true;
      sw.oxygen = O.AFTER_DAMAGE;
      sw.surfacing = O.SURFACE_TIME;
    }
  } else sw.oxygen = Math.min(O.MAX, sw.oxygen + O.REFILL * dt);
  return out;
}

// Fuera del agua el oxígeno se recarga.
export function breathe(sw, dt) {
  sw.under = false;
  sw.surfacing = 0;
  sw.oxygen = Math.min(O.MAX, sw.oxygen + O.REFILL * dt);
}

// Altura máxima de salto de referencia (para pruebas de diseño)
export const JUMP_OUT_HEIGHT = (W.JUMP_OUT * W.JUMP_OUT) / (2 * PLATFORMER.GRAVITY_UP);
