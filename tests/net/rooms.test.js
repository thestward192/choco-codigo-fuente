import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/rooms.js';
import { NET } from '../../src/config/net.js';
import { PROTOCOL_VERSION, isValidCode } from '../../src/net/protocol.js';

// Conexión falsa: guarda lo que el servidor le manda
function fakeConn() {
  return {
    out: [],
    closed: null,
    send(msg) {
      this.out.push(msg);
    },
    close(code, reason) {
      this.closed = { code, reason };
    },
    last(type) {
      return [...this.out].reverse().find((m) => !type || m.type === type);
    },
  };
}

let clock;
let rooms;
const send = (conn, msg) => rooms.message(conn, JSON.stringify(msg));
const connect = () => {
  const c = fakeConn();
  rooms.connect(c);
  return c;
};
const create = () => {
  const c = connect();
  send(c, { type: 'create', v: PROTOCOL_VERSION });
  return c;
};
const join = (code) => {
  const c = connect();
  send(c, { type: 'join', v: PROTOCOL_VERSION, code });
  return c;
};

beforeEach(() => {
  clock = 0;
  let seed = 7;
  rooms = new RoomManager({ now: () => clock, random: () => ((seed = (seed * 16807) % 2147483647) / 2147483647) });
});

describe('Salas', () => {
  it('crear sala devuelve un código válido, un token y el rol de anfitrión', () => {
    const host = create();
    const m = host.last('created');
    expect(isValidCode(m.code)).toBe(true);
    expect(m.role).toBe('host');
    expect(m.token.length).toBeGreaterThanOrEqual(8);
    expect(m.peer).toBe('none');
    expect(rooms.roomCount).toBe(1);
  });

  it('los códigos no se repiten', () => {
    const codes = new Set();
    for (let i = 0; i < 300; i++) codes.add(create().last('created').code);
    expect(codes.size).toBe(300);
  });

  it('unirse con el código (en minúsculas) avisa a los dos', () => {
    const host = create();
    const code = host.last('created').code;
    const guest = join(code.toLowerCase());
    expect(guest.last('joined')).toMatchObject({ code, role: 'guest', peer: 'here' });
    expect(host.last('peer')).toMatchObject({ state: 'joined' });
  });

  it('código inexistente → NOT_FOUND', () => {
    create();
    const g = join('ZZZZZ');
    expect(g.last()).toEqual({ type: 'error', code: 'NOT_FOUND' });
  });

  it('un tercero recibe FULL', () => {
    const host = create();
    const code = host.last('created').code;
    join(code);
    const third = join(code);
    expect(third.last()).toEqual({ type: 'error', code: 'FULL' });
  });

  it('versión distinta → VERSION', () => {
    const c = connect();
    send(c, { type: 'create', v: PROTOCOL_VERSION + 1 });
    expect(c.last()).toEqual({ type: 'error', code: 'VERSION' });
    const host = create();
    const g = connect();
    send(g, { type: 'join', v: 999, code: host.last('created').code });
    expect(g.last()).toEqual({ type: 'error', code: 'VERSION' });
  });

  it('relay reenvía al compañero tal cual, nunca a uno mismo', () => {
    const host = create();
    const guest = join(host.last('created').code);
    send(guest, { type: 'relay', d: { type: 'pick', char: 'tapita' } });
    expect(host.last('relay')).toEqual({ type: 'relay', d: { type: 'pick', char: 'tapita' } });
    expect(guest.last('relay')).toBeUndefined();
  });

  it('ping responde pong con el mismo t', () => {
    const c = connect();
    send(c, { type: 'ping', t: 1234.5 });
    expect(c.last()).toEqual({ type: 'pong', t: 1234.5 });
  });

  it('si sale el invitado, el anfitrión se entera y la sala sigue abierta', () => {
    const host = create();
    const code = host.last('created').code;
    const guest = join(code);
    send(guest, { type: 'leave' });
    expect(host.last('peer')).toMatchObject({ state: 'left' });
    expect(rooms.roomCount).toBe(1);
    // Se puede volver a entrar
    expect(join(code).last('joined')).toBeTruthy();
  });

  it('si sale el anfitrión, la sala se cierra para los dos', () => {
    const host = create();
    const code = host.last('created').code;
    const guest = join(code);
    send(host, { type: 'leave' });
    expect(guest.last('closed')).toMatchObject({ reason: 'host-left' });
    expect(rooms.roomCount).toBe(0);
    expect(join(code).last()).toEqual({ type: 'error', code: 'NOT_FOUND' });
  });

  it('ignora mensajes desconocidos o mal formados sin cerrar la conexión', () => {
    const c = connect();
    rooms.message(c, '{esto no es json');
    send(c, { type: 'hackear' });
    send(c, [1, 2, 3]);
    expect(c.out).toEqual([]);
    expect(c.closed).toBeNull();
  });
});

describe('Reconexión', () => {
  it('se guarda el lugar 20 s y al volver con el token se retoma el rol', () => {
    const host = create();
    const { code } = host.last('created');
    const guest = join(code);
    const token = guest.last('joined').token;
    rooms.disconnect(guest);
    expect(host.last('peer')).toMatchObject({ state: 'lost' });
    // Mientras tanto nadie más puede ocupar el lugar
    expect(join(code).last()).toEqual({ type: 'error', code: 'FULL' });
    clock += (NET.RECONNECT_GRACE - 1) * 1000;
    rooms.tick();
    const back = connect();
    send(back, { type: 'resume', token });
    expect(back.last('resumed')).toMatchObject({ code, role: 'guest', peer: 'here' });
    expect(host.last('peer')).toMatchObject({ state: 'back' });
    send(back, { type: 'relay', d: { type: 'hello' } });
    expect(host.last('relay').d).toEqual({ type: 'hello' });
  });

  it('pasados 20 s el lugar se libera', () => {
    const host = create();
    const guest = join(host.last('created').code);
    const token = guest.last('joined').token;
    rooms.disconnect(guest);
    clock += (NET.RECONNECT_GRACE + 1) * 1000;
    rooms.tick();
    expect(host.last('peer')).toMatchObject({ state: 'left' });
    const late = connect();
    send(late, { type: 'resume', token });
    expect(late.last()).toEqual({ type: 'error', code: 'EXPIRED' });
  });

  it('si el anfitrión no vuelve, la sala se cierra para el invitado', () => {
    const host = create();
    const guest = join(host.last('created').code);
    rooms.disconnect(host);
    expect(guest.last('peer')).toMatchObject({ state: 'lost' });
    clock += (NET.RECONNECT_GRACE + 1) * 1000;
    rooms.tick();
    expect(guest.last('closed')).toMatchObject({ reason: 'host-lost' });
    expect(rooms.roomCount).toBe(0);
  });

  it('el anfitrión que vuelve ve al invitado que sigue ahí', () => {
    const host = create();
    const { token } = host.last('created');
    join(host.last('created').code);
    rooms.disconnect(host);
    const back = connect();
    send(back, { type: 'resume', token });
    expect(back.last('resumed')).toMatchObject({ role: 'host', peer: 'here' });
  });

  it('un resume con la conexión vieja todavía abierta la reemplaza', () => {
    const host = create();
    const { token } = host.last('created');
    const again = connect();
    send(again, { type: 'resume', token });
    expect(host.closed).toMatchObject({ reason: 'replaced' });
    expect(again.last('resumed')).toBeTruthy();
  });
});

describe('Expiración y límites', () => {
  it('una sala con un solo jugador que no envía nada se borra a los 10 min', () => {
    const host = create();
    clock += (NET.IDLE_ROOM_TTL - 1) * 1000;
    rooms.tick();
    expect(rooms.roomCount).toBe(1);
    send(host, { type: 'ping', t: 1 }); // actividad
    clock += (NET.IDLE_ROOM_TTL - 1) * 1000;
    rooms.tick();
    expect(rooms.roomCount).toBe(1);
    clock += 2000;
    rooms.tick();
    expect(rooms.roomCount).toBe(0);
    expect(host.last('closed')).toMatchObject({ reason: 'idle' });
  });

  it('una sala vacía se borra (como mucho a los 2 min)', () => {
    const r = new RoomManager({ now: () => clock, limits: { RECONNECT_GRACE: 9999 } });
    rooms = r;
    const host = create();
    rooms.disconnect(host);
    clock += (NET.EMPTY_ROOM_TTL - 1) * 1000;
    rooms.tick();
    expect(rooms.roomCount).toBe(1);
    clock += 2000;
    rooms.tick();
    expect(rooms.roomCount).toBe(0);
  });

  it('máximo de salas → SERVER', () => {
    rooms = new RoomManager({ now: () => clock, limits: { MAX_ROOMS: 3 } });
    create();
    create();
    create();
    expect(create().last()).toEqual({ type: 'error', code: 'SERVER' });
  });

  it('demasiados mensajes por segundo → RATE y se desconecta', () => {
    const c = connect();
    for (let i = 0; i < NET.MAX_MESSAGES_PER_SECOND; i++) send(c, { type: 'ping', t: i });
    expect(c.closed).toBeNull();
    send(c, { type: 'ping', t: 0 });
    expect(c.closed).toMatchObject({ reason: 'RATE' });
    expect(c.out.at(-1)).toEqual({ type: 'error', code: 'RATE' });
  });

  it('el contador de mensajes se reinicia cada segundo', () => {
    const c = connect();
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < NET.MAX_MESSAGES_PER_SECOND; i++) send(c, { type: 'ping', t: i });
      clock += 1000;
    }
    expect(c.closed).toBeNull();
  });

  it('mensaje de más de 16 KB → RATE y se desconecta', () => {
    const c = connect();
    send(c, { type: 'relay', d: 'x'.repeat(NET.MAX_MESSAGE_BYTES) });
    expect(c.closed).toMatchObject({ reason: 'RATE' });
  });
});
