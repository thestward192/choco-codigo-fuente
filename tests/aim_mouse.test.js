import { describe, it, expect } from 'vitest';
import { Input, prettyKey, mouseCode } from '../src/core/input.js';
import { STAFF } from '../src/config/balance.js';

globalThis.window ||= { addEventListener() {} };
globalThis.navigator ||= {};

function fakeTarget() {
  const l = {};
  return {
    addEventListener: (t, f) => (l[t] = f),
    fire: (t, e) => l[t]?.({ repeat: false, preventDefault() {}, ...e }),
  };
}

describe('Botones del mouse como teclas', () => {
  it('nombres legibles', () => {
    expect(prettyKey(mouseCode(0))).toBe('CLIC IZQ.');
    expect(prettyKey('Mouse2')).toBe('CLIC DER.');
    expect(prettyKey('Mouse4')).toBe('MOUSE 5');
  });

  it('un clic asignado a disparar dispara', () => {
    const t = fakeTarget();
    const inp = new Input(t);
    inp.keys.shoot = ['Mouse0', 'KeyJ'];
    t.fire('mousedown', { button: 0 });
    inp.update(1 / 60);
    expect(inp.pressed('shoot')).toBe(true);
    t.fire('mouseup', { button: 0 });
    inp.update(1 / 60);
    expect(inp.down('shoot')).toBe(false);
  });

  it('al reasignar, el siguiente clic se captura', () => {
    const t = fakeTarget();
    const inp = new Input(t);
    let got = null;
    inp.captureNextKey((c) => (got = c));
    t.fire('mousedown', { button: 2 });
    expect(got).toBe('Mouse2');
    // El clic capturado no cuenta como acción
    inp.update(1 / 60);
    expect(inp.anyKeyLatched).toBe(false);
  });

  it('el clic derecho asignado bloquea el menú contextual', () => {
    const t = fakeTarget();
    const inp = new Input(t);
    let prevented = false;
    t.fire('contextmenu', { preventDefault: () => (prevented = true) });
    expect(prevented).toBe(false);
    inp.keys.lasso = ['Mouse2'];
    t.fire('contextmenu', { preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
  });
});

describe('Báculo apuntado', () => {
  it('cada dirección es unitaria y ↑/↓ no tienen componente horizontal', () => {
    for (const [k, a] of Object.entries(STAFF.AIM)) expect(Math.hypot(a.dx, a.dy), k).toBeCloseTo(1, 3);
    expect(STAFF.AIM.up.dx).toBe(0);
    expect(STAFF.AIM.down.dx).toBe(0);
    expect(STAFF.AIM.h).toMatchObject({ x: STAFF.MUZZLE_X, y: STAFF.MUZZLE_Y });
  });

  it('el proyectil vuela en la dirección apuntada y recorre su alcance en diagonal', async () => {
    const { Shot } = await import('../src/entities/projectile.js');
    const scene = { map: { isSolid: () => false }, particles: { spawn() {}, burst() {} } };
    const up = new Shot(100, 100, 1, false, { x: 0, y: -1 });
    expect(up.dir).toBe(0);
    up.update(0.1, scene);
    expect(up.cy).toBeLessThan(100);
    const d = new Shot(100, 100, -1, false, { x: -0.7071, y: 0.7071 });
    let n = 0;
    while (!d.dead && n++ < 1000) d.update(1 / 60, scene);
    expect(d.dist).toBeGreaterThanOrEqual(STAFF.NORMAL.RANGE);
    expect(d.dist).toBeLessThan(STAFF.NORMAL.RANGE + 10);
  });

  it('choca con el techo al disparar hacia arriba', async () => {
    const { Shot } = await import('../src/entities/projectile.js');
    let hit = null;
    const scene = { map: { isSolid: (tx, ty) => ty <= 3 }, particles: { spawn() {}, burst() {} }, onShotHitTile: (tx, ty) => (hit = { tx, ty }) };
    const s = new Shot(100, 100, 1, false, { x: 0, y: -1 });
    for (let i = 0; i < 60 && !s.dead; i++) s.update(1 / 60, scene);
    expect(s.dead).toBe(true);
    expect(hit.ty).toBe(3);
  });
});
