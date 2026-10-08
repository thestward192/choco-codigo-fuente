// Dos sesiones del juego conectadas en memoria a la misma lógica de salas del servidor.
import { describe, it, expect, afterEach } from 'vitest';
import { LoopHub } from '../../src/net/loopTransport.js';
import { CoopSession } from '../../src/net/session.js';
import { Transport, LagTransport } from '../../src/net/transport.js';
import { NET } from '../../src/config/net.js';

// Temporizadores manuales: nada corre solo
function fakeTimers() {
  let id = 0;
  const list = new Map();
  return {
    list,
    setTimeout(fn, ms) {
      list.set(++id, { fn, ms, repeat: false });
      return id;
    },
    setInterval(fn, ms) {
      list.set(++id, { fn, ms, repeat: true });
      return id;
    },
    clearTimeout(i) {
      list.delete(i);
    },
    clearInterval(i) {
      list.delete(i);
    },
    // Dispara todos los temporizadores pendientes una vez
    fire({ intervals = true, timeouts = true } = {}) {
      for (const [i, t] of [...list]) {
        if ((t.repeat && !intervals) || (!t.repeat && !timeouts)) continue;
        if (!t.repeat) list.delete(i);
        t.fn();
      }
    },
  };
}

const settle = async () => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
};

let clock = 0;
let hub;
const sessions = [];
function makeSession(connect) {
  const timers = fakeTimers();
  const s = new CoopSession({ connect: connect || (() => hub.connect()), now: () => clock, timers });
  s.timers = timers;
  sessions.push(s);
  return s;
}

function setup() {
  clock = 0;
  hub = new LoopHub({ now: () => clock });
}

afterEach(() => {
  for (const s of sessions.splice(0)) s.dispose();
});

async function pair() {
  setup();
  const host = makeSession();
  const guest = makeSession();
  const created = await host.create();
  const joined = await guest.join(created.code.toLowerCase());
  await settle();
  return { host, guest, created, joined };
}

describe('Sesiones por loopback', () => {
  it('crear y unirse: roles, código y compañero presente para los dos', async () => {
    const { host, guest, created, joined } = await pair();
    expect(created).toMatchObject({ ok: true, role: 'host' });
    expect(joined).toMatchObject({ ok: true, role: 'guest', code: created.code });
    expect(host.isHost).toBe(true);
    expect(guest.isHost).toBe(false);
    expect(host.status).toBe('room');
    expect(host.peer.present).toBe(true);
    expect(guest.peer.present).toBe(true);
  });

  it('los mensajes del juego llegan al otro; los desconocidos se descartan', async () => {
    const { host, guest } = await pair();
    const got = [];
    host.on('game', (d) => got.push(d));
    guest.sendGame({ type: 'pick', char: 'choco', ready: true });
    guest.sendGame({ type: 'virus' });
    await settle();
    expect(got).toEqual([{ type: 'pick', char: 'choco', ready: true }]);
  });

  it('mide el ping y se lo pasa al compañero', async () => {
    const { host, guest } = await pair();
    host.ping = null; // olvidar la primera medición (al conectar)
    host.timers.fire({ timeouts: false }); // manda ping
    clock += 42;
    await settle();
    expect(host.ping).toBe(42);
    host.timers.fire({ timeouts: false }); // manda ping + stat con el ping
    await settle();
    expect(guest.peer.ping).toBe(42);
  });

  it('código que no existe → NOT_FOUND, sin quedar en ninguna sala', async () => {
    setup();
    const s = makeSession();
    const r = await s.join('ZZZZZ');
    expect(r).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(s.inRoom).toBe(false);
    expect(s.status).toBe('online');
  });

  it('si sale el anfitrión, el invitado recibe "closed"', async () => {
    const { host, guest } = await pair();
    const closed = [];
    guest.on('closed', (r) => closed.push(r));
    host.leave();
    await settle();
    expect(closed).toEqual(['host-left']);
    expect(guest.inRoom).toBe(false);
  });

  it('si sale el invitado, el anfitrión queda solo en la sala', async () => {
    const { host, guest } = await pair();
    guest.leave();
    await settle();
    expect(host.inRoom).toBe(true);
    expect(host.peer.present).toBe(false);
  });

  it('el invitado pierde la conexión y vuelve solo dentro de los 20 s', async () => {
    const { host, guest, created } = await pair();
    const statuses = [];
    const hostSaw = [];
    guest.on('status', (s) => statuses.push(s));
    host.on('peer', (p) => hostSaw.push(p.lost ? 'lost' : 'here'));
    guest.transport.close(); // se cae la red
    expect(guest.status).toBe('reconnecting');
    await settle(); // el primer intento sale de una vez y el servidor local responde
    expect(statuses).toEqual(['reconnecting', 'room']);
    expect(hostSaw).toEqual(['lost', 'here']);
    expect(guest.status).toBe('room');
    expect(guest.code).toBe(created.code);
    expect(guest.role).toBe('guest');
    expect(host.peer.lost).toBe(false);
    expect(guest.peer.present).toBe(true);
  });

  it('cuenta regresiva del compañero caído', async () => {
    const { host, guest } = await pair();
    guest.makeTransport = () => {
      const t = new Transport();
      setTimeout(() => t._closed('unreachable'), 0);
      return t;
    };
    guest.transport.close();
    await settle();
    expect(host.peer.lost).toBe(true);
    clock += 3000;
    expect(host.peerGraceLeft()).toBeCloseTo(NET.RECONNECT_GRACE - 3);
  });

  it('si el servidor no vuelve en 20 s, la sesión avisa "lost"', async () => {
    const { guest } = await pair();
    // A partir de ahora no hay servidor
    guest.makeTransport = () => {
      const t = new Transport();
      setTimeout(() => t._closed('unreachable'), 0);
      return t;
    };
    const closed = [];
    guest.on('closed', (r) => closed.push(r));
    guest.transport.close();
    await settle();
    expect(guest.status).toBe('reconnecting');
    clock += (NET.RECONNECT_GRACE + 1) * 1000;
    guest.timers.fire({ intervals: false });
    await settle();
    expect(closed).toEqual(['lost']);
    expect(guest.inRoom).toBe(false);
  });

  it('sin servidor: crear sala responde OFFLINE', async () => {
    setup();
    const s = makeSession(() => {
      const t = new Transport();
      setTimeout(() => t._closed('unreachable'), 0);
      return t;
    });
    expect(await s.create()).toEqual({ ok: false, error: 'OFFLINE' });
    expect(s.status).toBe('offline');
  });

  it('servidor que no contesta: el pedido vence con TIMEOUT', async () => {
    setup();
    const s = makeSession(() => {
      const t = new Transport();
      t.send = () => true; // se traga todo
      setTimeout(() => t._opened(), 0);
      return t;
    });
    const p = s.create();
    await settle();
    s.timers.fire({ intervals: false });
    expect(await p).toEqual({ ok: false, error: 'TIMEOUT' });
  });
});

describe('Latencia simulada', () => {
  it('retrasa los mensajes sin desordenarlos', async () => {
    const queue = [];
    const inner = new Transport();
    const sent = [];
    inner.send = (m) => sent.push(m);
    let r = 0;
    const randoms = [1, 0, 0.5, 1];
    const lag = new LagTransport(inner, 100, { jitter: 20, random: () => randoms[r++ % 4], schedule: (fn, ms) => queue.push({ fn, ms }) });
    lag.send({ n: 1 }); // 120 ms
    lag.send({ n: 2 }); // 80 ms → no puede salir antes que el 1
    expect(queue[0].ms).toBeGreaterThanOrEqual(115);
    expect(queue[1].ms).toBeGreaterThanOrEqual(queue[0].ms - 1);
    queue.forEach((q) => q.fn());
    expect(sent).toEqual([{ n: 1 }, { n: 2 }]);
  });
});
