import { describe, it, expect } from 'vitest';
import { Input } from '../src/core/input.js';

// Objetivo falso de eventos de teclado
function fakeTarget() {
  const l = {};
  return {
    addEventListener: (t, f) => (l[t] = f),
    key: (t, code) => l[t]?.({ code, repeat: false, preventDefault() {} }),
  };
}

describe('Modo desarrolladora · tecla suprimida (J del vuelo libre)', () => {
  globalThis.window ||= { addEventListener() {} };
  globalThis.navigator ||= {};

  it('una tecla suprimida no dispara su acción hasta soltarla', () => {
    const t = fakeTarget();
    const inp = new Input(t);
    t.key('keydown', 'KeyJ');
    inp.suppress('KeyJ');
    inp.update(1 / 60);
    expect(inp.pressed('shoot')).toBe(false);
    expect(inp.down('shoot')).toBe(false);
    t.key('keyup', 'KeyJ');
    inp.update(1 / 60);
    t.key('keydown', 'KeyJ');
    inp.update(1 / 60);
    expect(inp.pressed('shoot')).toBe(true);
  });

  it('la otra tecla de disparo sigue funcionando', () => {
    const t = fakeTarget();
    const inp = new Input(t);
    inp.suppress('KeyJ');
    t.key('keydown', 'KeyX');
    inp.update(1 / 60);
    expect(inp.pressed('shoot')).toBe(true);
  });
});

describe('Modo desarrolladora · habilidades infinitas', () => {
  it('la Vista Debug no gasta batería ni se bloquea', async () => {
    const { Laptop } = await import('../src/items/laptop.js');
    const { LAPTOP } = await import('../src/config/balance.js');
    const normal = new Laptop();
    const dev = new Laptop();
    for (let i = 0; i < 600; i++) {
      normal.update(1 / 60, true);
      dev.update(1 / 60, true, true);
    }
    expect(normal.locked).toBe(true);
    expect(dev.active).toBe(true);
    expect(dev.battery).toBe(LAPTOP.BATTERY_MAX);
  });

  it('una batería agotada se recupera al encender el modo', async () => {
    const { Laptop } = await import('../src/items/laptop.js');
    const l = new Laptop();
    l.battery = 0;
    l.locked = true;
    expect(l.update(1 / 60, true, true)).toBe(true);
  });
});
