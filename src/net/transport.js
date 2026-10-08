// Interfaz común de los transportes del Modo Sincronizado — docs/coop/04_red.md
// Un transporte manda y recibe objetos (ya decodificados). Implementaciones:
//   WsTransport (WebSocket real) · LoopTransport (en memoria, para pruebas)
// Eventos: onOpen(), onMessage(obj), onClose(reason)
import { NET } from '../config/net.js';

export class Transport {
  constructor() {
    this.state = 'connecting'; // 'connecting' | 'open' | 'closed'
    this.onOpen = () => {};
    this.onMessage = () => {};
    this.onClose = () => {};
    // Contadores para el overlay de depuración
    this.stats = { sent: 0, received: 0, bytesOut: 0, bytesIn: 0 };
  }
  get open() {
    return this.state === 'open';
  }
  send(_msg) {}
  close() {}

  _opened() {
    if (this.state !== 'connecting') return;
    this.state = 'open';
    this.onOpen();
  }
  _received(msg, bytes = 0) {
    if (this.state === 'closed') return;
    this.stats.received++;
    this.stats.bytesIn += bytes;
    this.onMessage(msg);
  }
  _closed(reason = 'closed') {
    if (this.state === 'closed') return;
    this.state = 'closed';
    this.onClose(reason);
  }
}

// Latencia simulada (?lag=120): retrasa cada mensaje en los dos sentidos ms ± NET.LAG_JITTER,
// sin desordenarlos (como TCP).
export class LagTransport extends Transport {
  constructor(inner, ms, { jitter = NET.LAG_JITTER, random = Math.random, schedule = (fn, ms) => setTimeout(fn, ms) } = {}) {
    super();
    this.inner = inner;
    this.ms = ms;
    this.jitter = jitter;
    this.random = random;
    this.schedule = schedule;
    this.lastOut = 0;
    this.lastIn = 0;
    this.stats = inner.stats;
    inner.onOpen = () => this._opened();
    inner.onMessage = (msg) => {
      this.lastIn = this.delay(this.lastIn);
      this.schedule(() => this.onMessage(msg), this.lastIn - Date.now());
    };
    inner.onClose = (reason) => this._closed(reason);
  }

  // Momento de entrega: nunca antes que el mensaje anterior
  delay(last) {
    const d = Math.max(0, this.ms + (this.random() * 2 - 1) * this.jitter);
    return Math.max(last, Date.now() + d);
  }

  send(msg) {
    this.lastOut = this.delay(this.lastOut);
    this.schedule(() => this.inner.send(msg), this.lastOut - Date.now());
  }

  close() {
    this.inner.close();
  }
}
