// Transporte en memoria: varias sesiones en la misma página conectadas a un "servidor" local que
// usa la misma lógica de salas que el real (server/rooms.js). Sirve para las pruebas del protocolo
// sin red y para el atajo de depuración ?coop=local (Hito 10).
import { Transport } from './transport.js';
import { RoomManager } from '../../server/rooms.js';
import { encode, decode } from './protocol.js';

export class LoopHub {
  // manual: true → los mensajes se entregan solo al llamar flush() (pruebas deterministas)
  constructor({ now = () => Date.now(), manual = false, limits } = {}) {
    this.rooms = new RoomManager({ now, limits });
    this.manual = manual;
    this.queue = [];
    this.scheduled = false;
  }

  connect() {
    return new LoopTransport(this);
  }

  deliver(fn) {
    this.queue.push(fn);
    if (this.manual || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.flush();
    });
  }

  // Entrega todo lo pendiente (incluido lo que se genere mientras tanto).
  flush() {
    let guard = 0;
    while (this.queue.length && guard++ < 10000) this.queue.shift()();
  }

  tick() {
    this.rooms.tick();
  }
}

export class LoopTransport extends Transport {
  constructor(hub) {
    super();
    this.hub = hub;
    // Lado "servidor" de la conexión: copia los mensajes como si viajaran por la red
    this.conn = {
      send: (msg) => {
        const text = encode(msg);
        hub.deliver(() => this._received(decode(text), text.length));
      },
      close: () => hub.deliver(() => this._closed('closed')),
    };
    hub.rooms.connect(this.conn);
    hub.deliver(() => this._opened());
  }

  send(msg) {
    if (!this.open) return false;
    const text = encode(msg);
    this.stats.sent++;
    this.stats.bytesOut += text.length;
    this.hub.deliver(() => this.hub.rooms.message(this.conn, text));
    return true;
  }

  // Cierre del cliente (el servidor lo ve como una conexión caída)
  close(reason = 'closed') {
    if (this.state === 'closed') return;
    this.hub.rooms.disconnect(this.conn);
    this._closed(reason);
  }
}
