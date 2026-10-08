// Utilidades compartidas por las pantallas del Modo Sincronizado.
import { createSession } from '../net/session.js';
import { TEXTS } from '../data/dialogues.js';

// La sesión de red vive en game.coop mientras se está en el modo cooperativo.
export function ensureSession(game) {
  if (!game.coop || game.coop.disposed) game.coop = createSession();
  return game.coop;
}

// Cierra la sesión (al volver a la selección de modo).
export function closeSession(game) {
  game.coop?.dispose();
  game.coop = null;
}

// Mide mensajes y bytes por segundo para el overlay de depuración (?debug=1).
export class NetMeter {
  constructor() {
    this.t = 0;
    this.prev = null;
    this.msgs = 0;
    this.kbs = 0;
  }
  update(dt, session) {
    this.t += dt;
    if (this.t < 1) return;
    const s = session?.stats;
    if (s) {
      const now = { m: s.sent + s.received, b: s.bytesOut + s.bytesIn };
      if (this.prev) {
        this.msgs = Math.round((now.m - this.prev.m) / this.t);
        this.kbs = ((now.b - this.prev.b) / this.t / 1024).toFixed(1);
      }
      this.prev = now;
    }
    this.t = 0;
  }
  lines(session) {
    const ping = session?.ping === null || session?.ping === undefined ? '—' : Math.round(session.ping);
    const out = [TEXTS.coop.debugNet(ping, this.msgs, this.kbs)];
    if (session?.code) out.push(`${session.code} · ${session.role} · ${session.status}`);
    return out;
  }
}
