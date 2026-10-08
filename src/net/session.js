// Sesión del Modo Sincronizado — docs/coop/04_red.md
// Conexión con el servidor de salas, sala actual, rol (anfitrión/invitado), ping y reconexión.
// No sabe nada de escenas: las escenas escuchan sus eventos con on(tipo, fn).
//
// Eventos:
//   'status' (status)        → 'offline' | 'connecting' | 'online' | 'room' | 'reconnecting'
//   'peer'   (peer)          → el compañero entró, salió, se cayó o volvió
//   'game'   (d)             → mensaje del juego reenviado por el compañero (ya validado)
//   'closed' (reason)        → la sala se cerró ('host-left', 'host-lost', 'idle', 'expired', 'lost')
//   'error'  (code)          → error del servidor fuera de un pedido (por ejemplo, RATE)
import { NET } from '../config/net.js';
import { PROTOCOL_VERSION, ERR, PEER, GAME, ROLE, parseServerMessage, parseGameMessage, normalizeCode } from './protocol.js';
import { WsTransport } from './wsTransport.js';
import { LagTransport } from './transport.js';

const nowMs = () => (globalThis.performance ? performance.now() : Date.now());

function emptyPeer() {
  return { present: false, lost: false, lostAt: 0, name: null, ping: null };
}

export class CoopSession {
  // connect(): crea un transporte nuevo · now(): ms · timers: para pruebas con relojes falsos
  constructor({ connect = () => new WsTransport(), now = nowMs, timers = globalThis, name = null } = {}) {
    this.makeTransport = connect;
    this.now = now;
    this.timers = timers;
    this.name = name;
    this.transport = null;
    this.status = 'offline';
    this.role = null;
    this.code = null;
    this.token = null;
    this.peer = emptyPeer();
    this.ping = null; // ms (suavizado) con el servidor
    this.listeners = new Map();
    this.pending = null; // pedido en curso: { kind, resolve, timer }
    this.connecting = null; // promesa de connect() en curso
    this.reconnect = null; // { since, timer }
    this.pingTimer = null;
    this.disposed = false;
  }

  get inRoom() {
    return !!this.code;
  }
  get isHost() {
    return this.role === ROLE.HOST;
  }
  get online() {
    return this.status === 'online' || this.status === 'room';
  }
  get stats() {
    return this.transport?.stats ?? { sent: 0, received: 0, bytesOut: 0, bytesIn: 0 };
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  emit(type, arg) {
    for (const fn of [...(this.listeners.get(type) || [])]) fn(arg);
  }

  setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    this.emit('status', s);
  }

  // ---------- Conexión ----------

  // Conecta con el servidor si no lo está. Resuelve true/false.
  connect() {
    if (this.disposed) return Promise.resolve(false);
    if (this.transport?.open) return Promise.resolve(true);
    if (this.connecting) return this.connecting;
    this.setStatus('connecting');
    this.connecting = new Promise((resolve) => {
      this.openTransport(
        () => {
          this.setStatus('online');
          resolve(true);
        },
        () => {
          this.setStatus('offline');
          resolve(false);
        },
      );
    }).finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  openTransport(onOpen, onFail) {
    const t = this.makeTransport();
    this.transport = t;
    let opened = false;
    t.onOpen = () => {
      if (this.transport !== t) return;
      opened = true;
      this.startPing();
      onOpen();
    };
    t.onMessage = (msg) => {
      if (this.transport === t) this.handle(msg);
    };
    t.onClose = () => {
      if (this.transport !== t) return;
      this.stopPing();
      this.transport = null;
      this.failPending('OFFLINE');
      if (!opened) onFail();
      else this.lost();
    };
  }

  // Se cayó la conexión con el servidor
  lost() {
    if (this.disposed) return;
    if (this.inRoom) this.startReconnect();
    else this.setStatus('offline');
  }

  startReconnect() {
    if (this.reconnect) return;
    this.reconnect = { since: this.now(), timer: null };
    this.setStatus('reconnecting');
    this.tryReconnect();
  }

  tryReconnect() {
    const r = this.reconnect;
    if (!r || this.disposed) return;
    if (this.now() - r.since > NET.RECONNECT_GRACE * 1000) {
      this.reconnect = null;
      this.clearRoom();
      this.setStatus('offline');
      this.emit('closed', 'lost');
      return;
    }
    this.openTransport(
      () => this.transport.send({ type: 'resume', token: this.token }),
      () => {
        r.timer = this.timers.setTimeout(() => this.tryReconnect(), NET.RECONNECT_EVERY * 1000);
      },
    );
  }

  // ---------- Pedidos ----------

  request(kind, msg) {
    return this.connect().then((ok) => {
      if (!ok) return { ok: false, error: 'OFFLINE' };
      if (this.pending) return { ok: false, error: 'BUSY' };
      return new Promise((resolve) => {
        const timer = this.timers.setTimeout(() => {
          if (this.pending?.timer !== timer) return;
          this.pending = null;
          resolve({ ok: false, error: 'TIMEOUT' });
        }, NET.REQUEST_TIMEOUT * 1000);
        this.pending = { kind, resolve, timer };
        this.transport.send(msg);
      });
    });
  }

  create() {
    return this.request('create', { type: 'create', v: PROTOCOL_VERSION, name: this.name });
  }

  join(text) {
    const code = normalizeCode(text);
    if (!code) return Promise.resolve({ ok: false, error: ERR.NOT_FOUND });
    return this.request('join', { type: 'join', v: PROTOCOL_VERSION, code, name: this.name });
  }

  resolvePending(result) {
    const p = this.pending;
    if (!p) return false;
    this.pending = null;
    this.timers.clearTimeout(p.timer);
    p.resolve(result);
    return true;
  }

  failPending(error) {
    this.resolvePending({ ok: false, error });
  }

  // ---------- Mensajes ----------

  handle(raw) {
    const msg = parseServerMessage(raw);
    if (!msg) return;
    switch (msg.type) {
      case 'created':
      case 'joined':
        this.enterRoom(msg);
        this.resolvePending({ ok: true, code: msg.code, role: msg.role });
        break;
      case 'resumed':
        this.enterRoom(msg);
        if (this.reconnect) {
          this.timers.clearTimeout(this.reconnect.timer);
          this.reconnect = null;
        }
        break;
      case 'error':
        if (msg.code === ERR.EXPIRED && this.reconnect) {
          this.reconnect = null;
          this.clearRoom();
          this.setStatus('online');
          this.emit('closed', 'lost');
        } else if (!this.resolvePending({ ok: false, error: msg.code })) this.emit('error', msg.code);
        break;
      case 'pong':
        if (typeof msg.t === 'number') {
          const rtt = Math.max(0, this.now() - msg.t);
          this.ping = this.ping === null ? rtt : this.ping + (rtt - this.ping) * NET.PING_SMOOTH;
        }
        break;
      case 'peer':
        this.peerChanged(msg);
        break;
      case 'relay': {
        const d = parseGameMessage(msg.d);
        if (!d) break;
        if (d.type === GAME.STAT && typeof d.ping === 'number') this.peer.ping = d.ping;
        this.emit('game', d);
        break;
      }
      case 'closed':
        this.clearRoom();
        this.setStatus(this.transport?.open ? 'online' : 'offline');
        this.emit('closed', msg.reason || 'closed');
        break;
    }
  }

  // msg.peer: 'here' | 'lost' | 'none' (cómo está el compañero al entrar o volver)
  enterRoom(msg) {
    const prev = this.peer;
    const st = msg.peer || 'none';
    this.code = msg.code;
    this.token = msg.token;
    this.role = msg.role;
    this.peer = {
      ...emptyPeer(),
      present: st !== 'none',
      lost: st === 'lost',
      lostAt: st === 'lost' ? (prev.lost ? prev.lostAt : this.now()) : 0,
      name: msg.peerName ?? null,
      ping: st === 'none' ? null : prev.ping,
    };
    this.setStatus('room');
    this.emit('peer', this.peer);
  }

  peerChanged(msg) {
    const p = this.peer;
    if (msg.state === PEER.JOINED) {
      this.peer = { ...emptyPeer(), present: true, name: msg.name ?? null };
    } else if (msg.state === PEER.LEFT) {
      this.peer = emptyPeer();
    } else if (msg.state === PEER.LOST) {
      p.lost = true;
      p.lostAt = this.now();
    } else if (msg.state === PEER.BACK) {
      p.lost = false;
      p.present = true;
    }
    this.emit('peer', this.peer);
  }

  // Segundos que le quedan al compañero para volver (cuenta regresiva de "Esperando a tu compañero…")
  peerGraceLeft() {
    if (!this.peer.lost) return NET.RECONNECT_GRACE;
    return Math.max(0, NET.RECONNECT_GRACE - (this.now() - this.peer.lostAt) / 1000);
  }

  clearRoom() {
    this.code = null;
    this.token = null;
    this.role = null;
    this.peer = emptyPeer();
  }

  // ---------- Juego ----------

  sendGame(d) {
    if (!this.inRoom || !this.transport?.open) return false;
    return this.transport.send({ type: 'relay', d });
  }

  // Salida limpia de la sala (la conexión con el servidor sigue abierta).
  leave() {
    if (!this.inRoom) return;
    this.sendGame({ type: GAME.BYE });
    this.transport?.send({ type: 'leave' });
    if (this.reconnect) {
      this.timers.clearTimeout(this.reconnect.timer);
      this.reconnect = null;
    }
    this.clearRoom();
    this.setStatus(this.transport?.open ? 'online' : 'offline');
  }

  // ---------- Ping ----------

  startPing() {
    this.stopPing();
    const tick = () => {
      if (!this.transport?.open) return;
      this.transport.send({ type: 'ping', t: this.now() });
      if (this.inRoom && this.ping !== null) this.sendGame({ type: GAME.STAT, ping: Math.round(this.ping) });
    };
    tick();
    this.pingTimer = this.timers.setInterval(tick, NET.PING_INTERVAL * 1000);
  }

  stopPing() {
    if (this.pingTimer) this.timers.clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  // Cierra todo (al volver a la selección de modo).
  dispose() {
    this.leave();
    this.disposed = true;
    this.stopPing();
    this.failPending('OFFLINE');
    const t = this.transport;
    this.transport = null;
    t?.close();
    this.status = 'offline';
    this.listeners.clear();
  }
}

// Calidad del ping para los indicadores: 'good' | 'ok' | 'bad' | null (sin datos)
export function pingQuality(ms) {
  if (ms === null || ms === undefined) return null;
  if (ms < NET.PING_GOOD) return 'good';
  if (ms < NET.PING_OK) return 'ok';
  return 'bad';
}

// Sesión del juego: lee ?lag= de la URL para simular latencia.
export function createSession({ name = null, search = globalThis.location?.search || '' } = {}) {
  let lag = 0;
  try {
    lag = Math.max(0, Number(new URLSearchParams(search).get('lag')) || 0);
  } catch (err) {
    lag = 0;
  }
  const connect = lag > 0 ? () => new LagTransport(new WsTransport(), lag) : () => new WsTransport();
  return new CoopSession({ connect, name });
}
