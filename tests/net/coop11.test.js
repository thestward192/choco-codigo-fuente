// Hito 11: mensajes nuevos del juego (nav, cur) y eventos confiables marcados por sala.
import { describe, it, expect } from 'vitest';
import { parseGameMessage, GAME, NAV_TO } from '../../src/net/protocol.js';
import { ReliableChannel } from '../../src/net/sync.js';
import { LoopHub } from '../../src/net/loopTransport.js';
import { CoopSession } from '../../src/net/session.js';

describe('Mensajes del mapa de conexiones y los resultados', () => {
  it('nav solo lleva a pantallas conocidas', () => {
    for (const to of NAV_TO) expect(parseGameMessage({ type: GAME.NAV, to })).toBeTruthy();
    expect(parseGameMessage({ type: GAME.NAV, to: 'credits' })).toBe(null);
    expect(parseGameMessage({ type: GAME.NAV })).toBe(null);
  });

  it('cur necesita su clase (k)', () => {
    expect(parseGameMessage({ type: GAME.CUR, k: 'sel', i: 2 })).toBeTruthy();
    expect(parseGameMessage({ type: GAME.CUR, k: 'ok' })).toBeTruthy();
    expect(parseGameMessage({ type: GAME.CUR, i: 2 })).toBe(null);
  });
});

describe('Eventos confiables marcados por sala', () => {
  it('ignora los eventos y las confirmaciones de otra sala (llegan tarde al cambiar de pantalla)', () => {
    const toB = [];
    const toA = [];
    const A = new ReliableChannel((m) => toB.push(m), { tag: 7 });
    const B = new ReliableChannel((m) => toA.push(m), { tag: 7 });
    A.send({ k: 'door', g: 'd1' });
    expect(toB[0].r).toBe(7);
    expect(B.receive(toB[0])).toEqual({ k: 'door', g: 'd1' });
    // Un evento viejo de la sala anterior (marca 3) no se entrega ni se confirma
    expect(B.receive({ type: 'ev', seq: 2, d: { k: 'end' }, r: 3 })).toBe(null);
    expect(toA.filter((m) => m.r === 3)).toHaveLength(0);
    // Una confirmación vieja no borra un pendiente de esta sala
    A.ack(1, { type: 'ack', seq: 1, r: 3 });
    expect(A.unacked).toBe(1);
    A.ack(1, toA[0]);
    expect(A.unacked).toBe(0);
  });

  it('sin marca funciona como antes', () => {
    const out = [];
    const A = new ReliableChannel((m) => out.push(m));
    A.send({ k: 'x' });
    expect(out[0].r).toBeUndefined();
  });
});

describe('Flujo de pantallas por la red (loopback)', () => {
  it('el anfitrión lleva al invitado al mapa, elige un mapa y los dos confirman los resultados', async () => {
    const hub = new LoopHub();
    const host = new CoopSession({ connect: () => hub.connect() });
    await host.create();
    const guest = new CoopSession({ connect: () => hub.connect() });
    await guest.join(host.code);
    const got = [];
    guest.on('game', (d) => got.push(d));
    const back = [];
    host.on('game', (d) => back.push(d));
    host.sendGame({ type: GAME.NAV, to: 'map', roles: { host: 'tapita', guest: 'choco' } });
    host.sendGame({ type: GAME.CUR, k: 'prog', p: { maps: {} }, i: 1 });
    host.sendGame({ type: GAME.START, map: 'lab', seed: 5, host: 'tapita', guest: 'choco', cp: null });
    guest.sendGame({ type: GAME.CUR, k: 'ok' });
    await new Promise((r) => setTimeout(r, 20));
    expect(got.map((d) => d.type)).toEqual([GAME.NAV, GAME.CUR, GAME.START]);
    expect(got[0].roles.guest).toBe('choco');
    expect(back.some((d) => d.type === GAME.CUR && d.k === 'ok')).toBe(true);
    host.dispose();
    guest.dispose();
  });
});
