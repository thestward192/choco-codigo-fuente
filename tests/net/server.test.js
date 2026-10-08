// Prueba de punta a punta: el servidor real en un puerto libre y dos clientes WebSocket de Node.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'node:net';
import { startServer, originAllowed } from '../../server/index.js';
import { PROTOCOL_VERSION } from '../../src/net/protocol.js';

let srv;
beforeAll(async () => {
  srv = startServer({ port: 0, log: () => {} });
  await new Promise((r) => (srv.server.listening ? r() : srv.server.once('listening', r)));
});
afterAll(() => srv.close());

function client() {
  const ws = new WebSocket(`ws://localhost:${srv.port}/ws`);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const w = waiters.findIndex((x) => x.type === m.type);
    if (w >= 0) waiters.splice(w, 1)[0].resolve(m);
    else inbox.push(m);
  };
  return {
    ws,
    open: () => new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j))),
    send: (m) => ws.send(JSON.stringify(m)),
    next(type) {
      const i = inbox.findIndex((m) => m.type === type);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve) => waiters.push({ type, resolve }));
    },
  };
}

describe('Servidor de salas (de punta a punta)', () => {
  it('dos clientes: crear, unirse, relay con tildes, ping y salida del anfitrión', async () => {
    const a = client();
    const b = client();
    await Promise.all([a.open(), b.open()]);
    a.send({ type: 'create', v: PROTOCOL_VERSION });
    const { code } = await a.next('created');
    b.send({ type: 'join', v: PROTOCOL_VERSION, code });
    expect(await b.next('joined')).toMatchObject({ code, role: 'guest' });
    expect(await a.next('peer')).toMatchObject({ state: 'joined' });

    b.send({ type: 'relay', d: { type: 'hello', msg: '¡Pura vida!' } });
    expect((await a.next('relay')).d).toEqual({ type: 'hello', msg: '¡Pura vida!' });

    a.send({ type: 'ping', t: 7 });
    expect(await a.next('pong')).toEqual({ type: 'pong', t: 7 });

    a.send({ type: 'leave' });
    expect(await b.next('closed')).toMatchObject({ reason: 'host-left' });
    a.ws.close();
    b.ws.close();
  });

  it('una conexión que se cae sin despedirse queda como "lost" para el compañero', async () => {
    const a = client();
    const b = client();
    await Promise.all([a.open(), b.open()]);
    a.send({ type: 'create', v: PROTOCOL_VERSION });
    const { code } = await a.next('created');
    b.send({ type: 'join', v: PROTOCOL_VERSION, code });
    await b.next('joined');
    await a.next('peer'); // joined
    b.ws.close();
    expect(await a.next('peer')).toMatchObject({ state: 'lost' });
    a.ws.close();
  });

  it('responde por HTTP (para revisar que está vivo) y rechaza upgrades inválidos', async () => {
    const res = await fetch(`http://localhost:${srv.port}/`);
    expect(await res.text()).toContain('choco-salas ok');
    const reply = await new Promise((resolve) => {
      const s = net.connect(srv.port, 'localhost', () => {
        s.write('GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n\r\n');
      });
      let data = '';
      s.on('data', (d) => (data += d));
      s.on('close', () => resolve(data));
    });
    expect(reply).toContain('400');
  });

  it('lista de orígenes', () => {
    expect(originAllowed('http://x', [])).toBe(true);
    expect(originAllowed('https://juego.cr', ['https://juego.cr'])).toBe(true);
    expect(originAllowed('https://otro.com', ['https://juego.cr'])).toBe(false);
    expect(originAllowed(undefined, ['https://juego.cr'])).toBe(false);
  });
});
