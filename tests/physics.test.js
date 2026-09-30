import { describe, it, expect } from 'vitest';
import { Tilemap, T } from '../src/systems/tilemap.js';
import { createBody, createJumpState, stepPlatformer, moveX, moveY, aabbOverlap, isStomp, stompBounce } from '../src/systems/physics.js';
import { PLATFORMER, SIM } from '../src/config/balance.js';

const DT = SIM.STEP;

// Sala plana de 20×6 tiles con suelo en la fila 5
function flatRoom(extra = {}) {
  const rows = Array.from({ length: 6 }, (_, y) => (y === 5 ? '#'.repeat(20) : '.'.repeat(20)).split(''));
  for (const [k, ch] of Object.entries(extra)) {
    const [x, y] = k.split(',').map(Number);
    rows[y][x] = ch;
  }
  return new Tilemap(rows.map((r) => r.join('')));
}

const idle = { moveX: 0, jumpBuffered: false, jumpHeld: false, down: false };

function settle(body, js, map, steps = 30) {
  for (let i = 0; i < steps; i++) stepPlatformer(body, js, idle, DT, map);
}

describe('AABB', () => {
  it('detecta solapamiento y bordes que solo se tocan', () => {
    expect(aabbOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(aabbOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe('Tilemap', () => {
  it('lee tipos desde la leyenda y trata los costados como pared', () => {
    const m = new Tilemap(['.=^', '#~g']);
    expect(m.typeAt(0, 1)).toBe(T.SOLID);
    expect(m.typeAt(1, 0)).toBe(T.ONEWAY);
    expect(m.typeAt(2, 0)).toBe(T.SPIKES);
    expect(m.typeAt(1, 1)).toBe(T.VOID);
    expect(m.typeAt(-1, 0)).toBe(T.SOLID);
    expect(m.typeAt(0, 5)).toBe(T.EMPTY);
  });

  it('las plataformas fantasma solo son sólidas con la Vista Debug', () => {
    const m = new Tilemap(['g']);
    expect(m.isSolid(0, 0)).toBe(false);
    m.ghostSolid = true;
    expect(m.isSolid(0, 0)).toBe(true);
  });

  it('los pinchos solo dañan en su mitad inferior', () => {
    const m = new Tilemap(['^']);
    expect(m.touchesSpikes(2, 0, 10, 5)).toBe(false);
    expect(m.touchesSpikes(2, 0, 10, 12)).toBe(true);
  });
});

describe('Colisión con el tilemap', () => {
  it('se detiene contra una pared en X', () => {
    const m = flatRoom({ '5,4': '#' });
    const b = createBody(60, 60, 10, 20);
    moveX(b, 30, m);
    expect(b.x).toBe(80 - 10);
    expect(b.hitWall).toBe(1);
  });

  it('aterriza sobre el suelo en Y', () => {
    const m = flatRoom();
    const b = createBody(20, 50, 10, 20);
    moveY(b, 20, m);
    expect(b.y + b.h).toBe(80);
    expect(b.onGround).toBe(true);
  });

  it('atraviesa una plataforma de un sentido desde abajo y se para encima desde arriba', () => {
    const m = flatRoom({ '1,3': '=', '2,3': '=' });
    const b = createBody(20, 60, 10, 20); // debajo de la plataforma (fila 3 = y 48)
    moveY(b, -30, m);
    expect(b.hitCeiling).toBe(false);
    const c = createBody(20, 20, 10, 20);
    moveY(c, 20, m);
    expect(c.y + c.h).toBe(48);
    expect(c.onGround).toBe(true);
  });

  it('↓ + salto baja de una plataforma de un sentido', () => {
    const m = flatRoom({ '1,3': '=', '2,3': '=' });
    const b = createBody(20, 28, 10, 20);
    const js = createJumpState();
    settle(b, js, m, 5);
    expect(b.onOneWay).toBe(true);
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, down: true }, DT, m);
    expect(js.events.dropped).toBe(true);
    for (let i = 0; i < 20; i++) stepPlatformer(b, js, idle, DT, m);
    expect(b.y + b.h).toBe(80); // cayó al suelo
  });
});

describe('Salto', () => {
  function maxHeight(held) {
    const m = flatRoom();
    const b = createBody(100, 60, 10, 20);
    const js = createJumpState();
    settle(b, js, m);
    const ground = b.y;
    let minY = b.y;
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, jumpHeld: held }, DT, m);
    for (let i = 0; i < 90; i++) {
      stepPlatformer(b, js, { ...idle, jumpHeld: held }, DT, m);
      minY = Math.min(minY, b.y);
    }
    return ground - minY;
  }

  it('el salto completo alcanza unos 3 tiles (≈ 48–52 px)', () => {
    const h = maxHeight(true);
    expect(h).toBeGreaterThan(46);
    expect(h).toBeLessThan(53);
  });

  it('el salto variable: soltar temprano salta mucho menos', () => {
    expect(maxHeight(false)).toBeLessThan(maxHeight(true) * 0.4);
  });

  it('coyote time: se puede saltar poco después de salir del borde', () => {
    const m = flatRoom();
    const b = createBody(100, 60, 10, 20);
    const js = createJumpState();
    settle(b, js, m);
    // Simula salir del borde: se quita el suelo
    b.onGround = false;
    const air = new Tilemap(Array(6).fill('.'.repeat(20)));
    stepPlatformer(b, js, idle, DT, air);
    stepPlatformer(b, js, idle, DT, air);
    expect(js.coyote).toBeGreaterThan(0);
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, jumpHeld: true }, DT, air);
    expect(js.events.jumped).toBe(true);
    expect(b.vy).toBeLessThan(0);
  });

  it('sin coyote (pasado el tiempo) no salta en el aire sin botas', () => {
    const air = new Tilemap(Array(6).fill('.'.repeat(20)));
    const b = createBody(100, 0, 10, 20);
    const js = createJumpState();
    for (let i = 0; i < Math.ceil(PLATFORMER.COYOTE / DT) + 2; i++) stepPlatformer(b, js, idle, DT, air);
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, jumpHeld: true }, DT, air);
    expect(js.events.jumped).toBe(false);
    expect(js.events.doubleJumped).toBe(false);
  });

  it('doble salto con botas, se recarga al tocar el suelo y al pisar un enemigo', () => {
    const m = flatRoom();
    const b = createBody(100, 60, 10, 20);
    const js = createJumpState();
    js.hasBoots = true;
    settle(b, js, m);
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, jumpHeld: true }, DT, m);
    for (let i = 0; i < 10; i++) stepPlatformer(b, js, { ...idle, jumpHeld: true }, DT, m);
    stepPlatformer(b, js, { ...idle, jumpBuffered: true, jumpHeld: true }, DT, m);
    expect(js.events.doubleJumped).toBe(true);
    expect(js.canDoubleJump).toBe(false);
    stompBounce(b, js, false);
    expect(js.canDoubleJump).toBe(true);
    expect(b.vy).toBe(PLATFORMER.STOMP_BOUNCE);
  });

  it('rebote más alto si se mantiene saltar al pisar', () => {
    const b = createBody(0, 0, 10, 20);
    const js = createJumpState();
    stompBounce(b, js, true);
    expect(b.vy).toBe(PLATFORMER.STOMP_BOUNCE_HELD);
  });
});

describe('Movimiento horizontal', () => {
  it('acelera hasta la velocidad máxima y frena en el suelo', () => {
    const m = flatRoom();
    const b = createBody(20, 60, 10, 20);
    const js = createJumpState();
    settle(b, js, m);
    for (let i = 0; i < 30; i++) stepPlatformer(b, js, { ...idle, moveX: 1 }, DT, m);
    expect(b.vx).toBe(PLATFORMER.MAX_SPEED);
    for (let i = 0; i < 10; i++) stepPlatformer(b, js, idle, DT, m);
    expect(b.vx).toBe(0);
  });

  it('respeta el multiplicador de velocidad (cargando el báculo al 70 %)', () => {
    const m = flatRoom();
    const b = createBody(20, 60, 10, 20);
    const js = createJumpState();
    settle(b, js, m);
    for (let i = 0; i < 40; i++) stepPlatformer(b, js, { ...idle, moveX: 1, speedMult: 0.7 }, DT, m);
    expect(b.vx).toBeCloseTo(PLATFORMER.MAX_SPEED * 0.7, 5);
  });
});

describe('Pisotón', () => {
  it('cuenta si cae y los pies están en la mitad superior del enemigo', () => {
    const enemy = { x: 0, y: 100, w: 12, h: 12 };
    expect(isStomp({ x: 0, y: 84, w: 10, h: 20 }, enemy, 100)).toBe(true);
    expect(isStomp({ x: 0, y: 84, w: 10, h: 20 }, enemy, -50)).toBe(false);
    expect(isStomp({ x: 0, y: 92, w: 10, h: 20 }, enemy, 100)).toBe(false);
  });
});
