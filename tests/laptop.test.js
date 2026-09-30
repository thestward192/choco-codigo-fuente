import { describe, it, expect } from 'vitest';
import { Laptop } from '../src/items/laptop.js';
import { LAPTOP } from '../src/config/balance.js';

describe('Laptop: batería de la Vista Debug', () => {
  it('dura unos 4.5 s y luego se bloquea hasta recargar a 30', () => {
    const l = new Laptop();
    let t = 0;
    while (l.update(1 / 60, true)) t += 1 / 60;
    expect(t).toBeGreaterThan(4.3);
    expect(t).toBeLessThan(4.7);
    expect(l.locked).toBe(true);
    // Mantener el botón no la reactiva mientras está bloqueada
    expect(l.update(1 / 60, true)).toBe(false);
    // Recarga tras 0.5 s sin usarla
    let r = 0;
    while (l.locked) {
      l.update(1 / 60, false);
      r += 1 / 60;
    }
    expect(l.battery).toBeGreaterThanOrEqual(LAPTOP.MIN_TO_REACTIVATE);
    expect(r).toBeGreaterThan(LAPTOP.RECHARGE_DELAY + 1.5);
  });
});
