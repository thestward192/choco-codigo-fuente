import { describe, it, expect } from 'vitest';
import { SnapshotBuffer, ReliableChannel, RateTimer } from '../../src/net/sync.js';
import { NET } from '../../src/config/net.js';
import { parseGameMessage, GAME } from '../../src/net/protocol.js';

describe('SnapshotBuffer (interpolación 100 ms atrás)', () => {
  // Estados a 30 Hz moviéndose a 90 px/s; llegan con 40 ms de latencia
  function filled(latency = 40) {
    const b = new SnapshotBuffer();
    for (let i = 0; i <= 30; i++) {
      const ts = 1000 + i * (1000 / 30);
      b.push(ts, { x: i * 3, y: 0, vx: 90, vy: 0, a: i % 2 ? 'run' : 'idle' }, ts + latency + 5000);
    }
    return b;
  }

  it('interpola entre los dos estados que rodean al momento dibujado', () => {
    const b = filled();
    // El reloj local está 5040 ms adelante: "ahora" = último ts + 5040; se dibuja 100 ms atrás
    const lastTs = 1000 + 30 * (1000 / 30);
    const r = b.sample(lastTs + 5040);
    expect(r.mode).toBe('interp');
    // 100 ms atrás del último estado (x = 90) → x = 81
    expect(r.s.x).toBeCloseTo(90 - NET.INTERP_DELAY * 0.09, 0);
  });

  it('si faltan datos extrapola hasta 150 ms y después se congela', () => {
    const b = filled();
    const lastTs = 2000;
    const ex = b.sample(lastTs + 5040 + NET.INTERP_DELAY + 100);
    expect(ex.mode).toBe('extrap');
    expect(ex.s.x).toBeCloseTo(90 + 9, 0);
    const fr = b.sample(lastTs + 5040 + NET.INTERP_DELAY + 1000);
    expect(fr.mode).toBe('frozen');
    expect(fr.s.x).toBeCloseTo(90 + NET.EXTRAPOLATE_MAX * 0.09, 0);
  });

  it('la latencia variable no rompe el reloj: usa la latencia mínima vista', () => {
    const b = new SnapshotBuffer();
    b.push(0, { x: 0, y: 0 }, 10000 + 80);
    b.push(33, { x: 3, y: 0 }, 10033 + 20);
    b.push(66, { x: 6, y: 0 }, 10066 + 60);
    expect(b.offset).toBe(10020);
  });

  it('ignora estados viejos o repetidos y no interpola saltos grandes (reaparecer)', () => {
    const b = new SnapshotBuffer();
    b.push(100, { x: 0, y: 0 }, 100);
    b.push(50, { x: 999, y: 0 }, 150);
    b.push(100, { x: 999, y: 0 }, 150);
    expect(b.list).toHaveLength(1);
    b.push(200, { x: 500, y: 0 }, 200);
    const r = b.sample(150 + NET.INTERP_DELAY);
    expect([0, 500]).toContain(r.s.x);
  });

  it('los campos que no son números se toman del estado más cercano', () => {
    const b = new SnapshotBuffer();
    b.push(0, { x: 0, y: 0, a: 'idle' }, 0);
    b.push(100, { x: 10, y: 0, a: 'run' }, 100);
    expect(b.sample(20 + NET.INTERP_DELAY).s.a).toBe('idle');
    expect(b.sample(80 + NET.INTERP_DELAY).s.a).toBe('run');
  });
});

describe('ReliableChannel (ev + ack)', () => {
  function pair() {
    let t = 0;
    const wire = { a: [], b: [] };
    const A = new ReliableChannel((m) => wire.b.push(m), { now: () => t });
    const B = new ReliableChannel((m) => wire.a.push(m), { now: () => t });
    return {
      A,
      B,
      wire,
      advance: (ms) => (t += ms),
      deliver(to, drop = false) {
        const box = wire[to];
        const out = [];
        while (box.length) {
          const m = box.shift();
          if (drop) continue;
          const ch = to === 'b' ? B : A;
          if (m.type === 'ev') {
            const d = ch.receive(m);
            if (d) out.push(d);
          } else if (m.type === 'ack') ch.ack(m.seq);
        }
        return out;
      },
    };
  }

  it('entrega una vez y confirma', () => {
    const p = pair();
    p.A.send({ k: 'cp', id: 2 });
    expect(p.deliver('b')).toEqual([{ k: 'cp', id: 2 }]);
    p.deliver('a');
    expect(p.A.unacked).toBe(0);
  });

  it('lo perdido se reenvía después de 500 ms y no se duplica', () => {
    const p = pair();
    p.A.send({ k: 'kill', id: 1 });
    p.deliver('b', true); // se perdió
    p.advance(NET.ACK_RESEND - 1);
    p.A.update();
    expect(p.wire.b).toHaveLength(0);
    p.advance(2);
    p.A.update();
    expect(p.deliver('b')).toEqual([{ k: 'kill', id: 1 }]);
    // Llega un duplicado (reenvío cruzado con el ack): no se entrega dos veces
    p.A.update();
    p.advance(NET.ACK_RESEND);
    p.A.update();
    expect(p.deliver('b')).toEqual([]);
    p.deliver('a');
    expect(p.A.unacked).toBe(0);
  });

  it('entrega en cualquier orden sin perder ninguno', () => {
    const p = pair();
    for (let i = 0; i < 5; i++) p.A.send({ k: 'take', id: i });
    p.wire.b.reverse();
    const got = p.deliver('b');
    expect(got.map((d) => d.id).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(p.B.base).toBe(5);
    expect(p.B.seen.size).toBe(0);
  });

  it('ignora números de secuencia inválidos', () => {
    const p = pair();
    expect(p.B.receive({ type: 'ev', seq: 'x', d: 1 })).toBeNull();
    expect(p.B.receive({ type: 'ev', seq: 0, d: 1 })).toBeNull();
  });
});

describe('RateTimer y protocolo', () => {
  it('30 Hz con pasos de 60 Hz manda cada 2 pasos', () => {
    const r = new RateTimer(30);
    let n = 0;
    for (let i = 0; i < 60; i++) if (r.tick(1 / 60)) n++;
    expect(n).toBeGreaterThanOrEqual(30);
    expect(n).toBeLessThanOrEqual(31);
  });

  it('los mensajes del juego nuevos pasan la validación', () => {
    for (const t of [GAME.ME, GAME.WORLD, GAME.ACT, GAME.EV, GAME.ACK]) expect(parseGameMessage({ type: t })).toBeTruthy();
  });
});
