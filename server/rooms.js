// Salas del Modo Sincronizado — docs/coop/04_red.md
// Lógica pura (sin sockets): crear, unirse, reconexión, reenvío, límites y expiración.
// Una "conexión" es cualquier objeto con send(obj) y close(code, reason); así la misma lógica la
// usan el servidor real (server/index.js) y el transporte en memoria del juego (loopTransport).
import { NET } from '../src/config/net.js';
import { PROTOCOL_VERSION, ERR, PEER, ROLE, randomCode, parseClientMessage, decode } from '../src/net/protocol.js';

const HOST = 0;
const GUEST = 1;
const utf8 = new TextEncoder();

// Cómo ve un jugador a su compañero al entrar o volver
function peerState(p) {
  if (!p) return 'none';
  return p.conn ? 'here' : 'lost';
}

function defaultToken(random) {
  let s = '';
  for (let i = 0; i < 24; i++) s += Math.floor(random() * 16).toString(16);
  return s;
}

export class RoomManager {
  // now(): milisegundos · random(): 0..1 · token(): texto único para reconectarse
  constructor({ now = () => Date.now(), random = Math.random, token = null, limits = {} } = {}) {
    this.now = now;
    this.random = random;
    this.makeToken = token || (() => defaultToken(random));
    this.limits = { ...NET, ...limits };
    this.rooms = new Map(); // code → room
    this.tokens = new Map(); // token → { room, player }
    this.conns = new Map(); // conn → { room, player, windowStart, count }
    // Solo contadores: el servidor no guarda el contenido de los mensajes
    this.stats = { roomsCreated: 0, relayed: 0, kicked: 0 };
  }

  get roomCount() {
    return this.rooms.size;
  }

  connect(conn) {
    this.conns.set(conn, { room: null, player: null, windowStart: this.now(), count: 0 });
  }

  // Mensaje de texto recibido de una conexión.
  message(conn, text) {
    const st = this.conns.get(conn);
    if (!st) return;
    const L = this.limits;
    if (typeof text !== 'string' || utf8.encode(text).length > L.MAX_MESSAGE_BYTES) return this.kick(conn, ERR.RATE);
    const now = this.now();
    if (now - st.windowStart >= 1000) {
      st.windowStart = now;
      st.count = 0;
    }
    if (++st.count > L.MAX_MESSAGES_PER_SECOND) return this.kick(conn, ERR.RATE);

    const msg = parseClientMessage(decode(text));
    if (!msg) return; // tipos desconocidos o JSON roto: se ignoran
    if (st.room) st.room.lastActivity = now;

    switch (msg.type) {
      case 'create':
        return this.create(conn, st, msg);
      case 'join':
        return this.join(conn, st, msg);
      case 'resume':
        return this.resume(conn, st, msg);
      case 'leave':
        return this.leave(conn, st);
      case 'relay':
        return this.relay(st, msg.d);
      case 'ping':
        return conn.send({ type: 'pong', t: msg.t });
    }
  }

  create(conn, st, msg) {
    if (msg.v !== PROTOCOL_VERSION) return conn.send({ type: 'error', code: ERR.VERSION });
    if (st.room) this.leave(conn, st);
    if (this.rooms.size >= this.limits.MAX_ROOMS) return conn.send({ type: 'error', code: ERR.SERVER });
    let code = null;
    for (let i = 0; i < 100 && !code; i++) {
      const c = randomCode(this.random);
      if (!this.rooms.has(c)) code = c;
    }
    if (!code) return conn.send({ type: 'error', code: ERR.SERVER });
    const now = this.now();
    const room = { code, players: [null, null], createdAt: now, lastActivity: now, emptySince: null };
    this.rooms.set(code, room);
    this.stats.roomsCreated++;
    const player = this.addPlayer(room, HOST, conn, st, msg.name);
    conn.send({ type: 'created', code, token: player.token, role: ROLE.HOST, peer: 'none' });
  }

  join(conn, st, msg) {
    if (msg.v !== PROTOCOL_VERSION) return conn.send({ type: 'error', code: ERR.VERSION });
    const room = this.rooms.get(msg.code);
    if (!room) return conn.send({ type: 'error', code: ERR.NOT_FOUND });
    if (st.room === room) return; // ya está adentro
    // Un lugar guardado para reconexión también cuenta como ocupado
    if (room.players[GUEST] || !room.players[HOST]) return conn.send({ type: 'error', code: ERR.FULL });
    if (st.room) this.leave(conn, st);
    const player = this.addPlayer(room, GUEST, conn, st, msg.name);
    const host = room.players[HOST];
    conn.send({ type: 'joined', code: room.code, token: player.token, role: ROLE.GUEST, peer: peerState(host), peerName: host.name });
    this.sendTo(host, { type: 'peer', state: PEER.JOINED, name: player.name });
  }

  resume(conn, st, msg) {
    const ref = this.tokens.get(msg.token);
    if (!ref) return conn.send({ type: 'error', code: ERR.EXPIRED });
    const { room, player } = ref;
    if (st.room && st.room !== room) this.leave(conn, st);
    // Si la conexión vieja sigue "viva" (el servidor no se enteró de que se cayó), se reemplaza
    if (player.conn && player.conn !== conn) {
      const old = player.conn;
      const ost = this.conns.get(old);
      if (ost) {
        ost.room = null;
        ost.player = null;
      }
      old.close(1000, 'replaced');
    }
    const wasLost = player.lostAt !== null;
    player.conn = conn;
    player.lostAt = null;
    st.room = room;
    st.player = player;
    room.lastActivity = this.now();
    room.emptySince = null;
    const other = room.players[1 - player.slot];
    conn.send({ type: 'resumed', code: room.code, token: player.token, role: player.role, peer: peerState(other), peerName: other?.name ?? null });
    if (wasLost) this.sendTo(other, { type: 'peer', state: PEER.BACK });
  }

  // Salida limpia. Si sale el anfitrión, la sala se cierra para los dos.
  leave(conn, st) {
    const room = st.room;
    if (!room) return;
    this.removePlayer(room, st.player, 'left');
  }

  relay(st, d) {
    const room = st.room;
    if (!room) return;
    const other = room.players[1 - st.player.slot];
    if (!other?.conn) return; // el compañero no está: el mensaje se pierde (los confiables se reenvían)
    this.stats.relayed++;
    other.conn.send({ type: 'relay', d });
  }

  // La conexión se cerró sin despedirse: se guarda el lugar RECONNECT_GRACE segundos.
  disconnect(conn) {
    const st = this.conns.get(conn);
    this.conns.delete(conn);
    if (!st?.room) return;
    const { room, player } = st;
    if (player.conn !== conn) return;
    player.conn = null;
    player.lostAt = this.now();
    const other = room.players[1 - player.slot];
    this.sendTo(other, { type: 'peer', state: PEER.LOST });
    if (!room.players.some((p) => p?.conn)) room.emptySince = this.now();
  }

  // Revisa expiraciones (el servidor lo llama cada SERVER_TICK).
  tick() {
    const now = this.now();
    const L = this.limits;
    for (const room of [...this.rooms.values()]) {
      for (const p of room.players) {
        if (p && p.lostAt !== null && now - p.lostAt > L.RECONNECT_GRACE * 1000) this.removePlayer(room, p, 'lost');
      }
      if (!this.rooms.has(room.code)) continue;
      const connected = room.players.filter((p) => p?.conn);
      if (connected.length === 0) {
        if (room.emptySince === null) room.emptySince = now;
        if (now - room.emptySince > L.EMPTY_ROOM_TTL * 1000) this.closeRoom(room, 'expired');
      } else if (!room.players[GUEST] && now - room.lastActivity > L.IDLE_ROOM_TTL * 1000) {
        this.closeRoom(room, 'idle');
      }
    }
  }

  // ---------- Internos ----------

  addPlayer(room, slot, conn, st, name) {
    const player = { slot, role: slot === HOST ? ROLE.HOST : ROLE.GUEST, token: this.makeToken(), conn, name: name || null, lostAt: null };
    room.players[slot] = player;
    room.emptySince = null;
    this.tokens.set(player.token, { room, player });
    st.room = room;
    st.player = player;
    return player;
  }

  removePlayer(room, player, why) {
    if (!player) return;
    if (player.slot === HOST) {
      this.closeRoom(room, why === 'lost' ? 'host-lost' : 'host-left', player);
      return;
    }
    room.players[GUEST] = null;
    this.forget(player);
    this.sendTo(room.players[HOST], { type: 'peer', state: PEER.LEFT });
  }

  closeRoom(room, reason, except = null) {
    for (const p of room.players) {
      if (!p) continue;
      if (p !== except) this.sendTo(p, { type: 'closed', reason });
      this.forget(p);
    }
    this.rooms.delete(room.code);
  }

  forget(player) {
    this.tokens.delete(player.token);
    if (player.conn) {
      const st = this.conns.get(player.conn);
      if (st) {
        st.room = null;
        st.player = null;
      }
    }
    player.conn = null;
  }

  sendTo(player, msg) {
    if (player?.conn) player.conn.send(msg);
  }

  kick(conn, code) {
    this.stats.kicked++;
    conn.send({ type: 'error', code });
    conn.close(1008, code);
    this.disconnect(conn);
  }
}
