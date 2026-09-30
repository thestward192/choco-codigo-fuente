// Física de plataformas y colisión AABB contra el tilemap (eje X y luego eje Y).
// Lógica pura: no dibuja ni lee el teclado; recibe un "intent" con lo que quiere el jugador.
import { SCREEN, PLATFORMER } from '../config/balance.js';
import { approach } from '../core/tween.js';

const TS = SCREEN.TILE;
const EPS = 0.001;

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createBody(x, y, w, h) {
  return {
    x,
    y,
    w,
    h,
    vx: 0,
    vy: 0,
    onGround: false,
    wasOnGround: false,
    onOneWay: false,
    hitWall: 0, // -1 izquierda, 1 derecha
    hitCeiling: false,
    dropTimer: 0,
  };
}

// Mueve en X resolviendo contra tiles sólidos. Devuelve true si chocó.
export function moveX(body, dx, map) {
  body.hitWall = 0;
  if (dx === 0) return false;
  let remaining = dx;
  while (remaining !== 0) {
    const step = Math.abs(remaining) > PLATFORMER.MAX_MOVE_SUBSTEP ? Math.sign(remaining) * PLATFORMER.MAX_MOVE_SUBSTEP : remaining;
    remaining -= step;
    body.x += step;
    const y0 = Math.floor(body.y / TS);
    const y1 = Math.floor((body.y + body.h - EPS) / TS);
    if (step > 0) {
      const tx = Math.floor((body.x + body.w - EPS) / TS);
      for (let ty = y0; ty <= y1; ty++) {
        if (map.isSolid(tx, ty)) {
          body.x = tx * TS - body.w;
          body.vx = 0;
          body.hitWall = 1;
          return true;
        }
      }
    } else {
      const tx = Math.floor(body.x / TS);
      for (let ty = y0; ty <= y1; ty++) {
        if (map.isSolid(tx, ty)) {
          body.x = (tx + 1) * TS;
          body.vx = 0;
          body.hitWall = -1;
          return true;
        }
      }
    }
  }
  return false;
}

// Mueve en Y. Aterriza en sólidos y en plataformas de un sentido (si viene de arriba).
export function moveY(body, dy, map) {
  body.hitCeiling = false;
  if (dy === 0) return false;
  let remaining = dy;
  while (remaining !== 0) {
    const step = Math.abs(remaining) > PLATFORMER.MAX_MOVE_SUBSTEP ? Math.sign(remaining) * PLATFORMER.MAX_MOVE_SUBSTEP : remaining;
    remaining -= step;
    const prevBottom = body.y + body.h;
    body.y += step;
    const x0 = Math.floor(body.x / TS);
    const x1 = Math.floor((body.x + body.w - EPS) / TS);
    if (step > 0) {
      const ty = Math.floor((body.y + body.h - EPS) / TS);
      const tileTop = ty * TS;
      for (let tx = x0; tx <= x1; tx++) {
        const solid = map.isSolid(tx, ty);
        const oneway = !solid && map.isOneWay(tx, ty) && prevBottom <= tileTop + EPS && body.dropTimer <= 0;
        if (solid || oneway) {
          body.y = tileTop - body.h;
          body.vy = 0;
          body.onGround = true;
          body.onOneWay = oneway && !anySolidBelow(body, map, ty);
          return true;
        }
      }
    } else {
      const ty = Math.floor(body.y / TS);
      for (let tx = x0; tx <= x1; tx++) {
        if (map.isSolid(tx, ty)) {
          body.y = (ty + 1) * TS;
          body.vy = 0;
          body.hitCeiling = true;
          return true;
        }
      }
    }
  }
  return false;
}

function anySolidBelow(body, map, ty) {
  const x0 = Math.floor(body.x / TS);
  const x1 = Math.floor((body.x + body.w - EPS) / TS);
  for (let tx = x0; tx <= x1; tx++) if (map.isSolid(tx, ty)) return true;
  return false;
}

// Estado de salto que acompaña al cuerpo.
export function createJumpState() {
  return {
    coyote: 0,
    jumping: false, // subiendo por un salto (el corte variable aplica)
    canDoubleJump: false,
    hasBoots: false,
    events: { jumped: false, doubleJumped: false, landed: false, landVy: 0, consumedJump: false, dropped: false },
  };
}

// Un paso de física de plataformas.
// intent: { moveX (-1..1), jumpBuffered (bool), jumpHeld (bool), down (bool), speedMult (1) }
export function stepPlatformer(body, js, intent, dt, map, P = PLATFORMER) {
  const ev = js.events;
  ev.jumped = ev.doubleJumped = ev.landed = ev.consumedJump = ev.dropped = false;
  ev.landVy = 0;

  // --- Horizontal ---
  const mult = intent.speedMult ?? 1;
  const target = intent.moveX * P.MAX_SPEED * mult;
  let accel;
  if (body.onGround) {
    if (intent.moveX === 0) accel = P.DECEL_GROUND;
    else if (body.vx !== 0 && Math.sign(intent.moveX) !== Math.sign(body.vx)) accel = P.DECEL_GROUND; // giro/derrape
    else accel = P.ACCEL_GROUND;
  } else {
    accel = intent.moveX === 0 ? P.DECEL_AIR : P.ACCEL_AIR;
  }
  // Si va más rápido que el máximo (por empujes), frena con desaceleración
  if (Math.abs(body.vx) > Math.abs(target) && Math.sign(body.vx) === Math.sign(target || body.vx)) {
    accel = body.onGround ? P.DECEL_GROUND : P.DECEL_AIR;
  }
  body.vx = approach(body.vx, target, accel * dt);

  // --- Coyote time y recarga del doble salto ---
  if (body.onGround) {
    js.coyote = P.COYOTE;
    js.canDoubleJump = js.hasBoots;
  } else {
    js.coyote = Math.max(0, js.coyote - dt);
  }
  if (body.dropTimer > 0) body.dropTimer = Math.max(0, body.dropTimer - dt);

  // --- Salto (con buffer) ---
  if (intent.jumpBuffered) {
    if (body.onGround && body.onOneWay && intent.down) {
      // Bajar de una plataforma de un sentido
      body.dropTimer = P.DROP_THROUGH_TIME;
      body.onGround = false;
      body.y += 1;
      js.coyote = 0;
      ev.consumedJump = true;
      ev.dropped = true;
    } else if (body.onGround || js.coyote > 0) {
      body.vy = P.JUMP_SPEED;
      body.onGround = false;
      js.coyote = 0;
      js.jumping = true;
      ev.jumped = true;
      ev.consumedJump = true;
    } else if (js.canDoubleJump) {
      body.vy = P.DOUBLE_JUMP_SPEED;
      js.canDoubleJump = false;
      js.jumping = true;
      ev.doubleJumped = true;
      ev.consumedJump = true;
    }
  }

  // --- Salto variable: soltar el botón mientras sube corta la velocidad ---
  if (js.jumping && body.vy < 0 && !intent.jumpHeld) {
    body.vy *= P.JUMP_CUT;
    js.jumping = false;
  }
  if (body.vy >= 0) js.jumping = false;

  // --- Gravedad ---
  const g = body.vy < 0 ? P.GRAVITY_UP : P.GRAVITY_DOWN;
  body.vy = Math.min(body.vy + g * dt, P.MAX_FALL);

  // --- Movimiento y colisión: X y luego Y ---
  moveX(body, body.vx * dt, map);
  const wasGround = body.onGround;
  body.wasOnGround = wasGround;
  const fallingVy = body.vy;
  body.onGround = false;
  body.onOneWay = false;
  moveY(body, body.vy * dt, map);
  if (body.onGround && !wasGround) {
    ev.landed = true;
    ev.landVy = fallingVy;
  }
  return ev;
}

// Rebote al pisar un enemigo. Recarga el doble salto.
export function stompBounce(body, js, jumpHeld, P = PLATFORMER) {
  body.vy = jumpHeld ? P.STOMP_BOUNCE_HELD : P.STOMP_BOUNCE;
  js.jumping = false;
  js.canDoubleJump = js.hasBoots;
}

// ¿Cuenta como pisotón? Cae (vy > 0) y su parte inferior está en la mitad superior del enemigo.
export function isStomp(player, enemy, playerVy) {
  if (playerVy <= 0) return false;
  const bottom = player.y + player.h;
  return bottom <= enemy.y + enemy.h / 2 + 2;
}
