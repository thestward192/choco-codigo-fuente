// Sincronización del Modo Sincronizado — docs/coop/04_red.md
// Lógica pura (con pruebas):
//   SnapshotBuffer: guarda los estados que llegan y los devuelve interpolados INTERP_DELAY atrás.
//   ReliableChannel: eventos con número de secuencia, confirmación (ack) y reenvío.
//   RateTimer: "¿toca mandar?" a una frecuencia fija.
import { NET } from '../config/net.js';

const OFFSET_WINDOW = 60; // muestras para estimar la diferencia de relojes (≈ 2 s a 30 Hz)

export class SnapshotBuffer {
  // lerp: campos numéricos que se interpolan · snapDist: si un salto es más grande, no se interpola
  constructor({ delay = NET.INTERP_DELAY, extrapolate = NET.EXTRAPOLATE_MAX, keep = NET.SNAPSHOT_KEEP, lerp = ['x', 'y'], snapDist = 64 } = {}) {
    this.delay = delay;
    this.extrapolate = extrapolate;
    this.keep = keep;
    this.lerp = lerp;
    this.snapDist = snapDist;
    this.list = []; // [{ ts, s }] ordenados por ts (reloj del que manda)
    this.offsets = [];
    this.offset = null; // reloj local − reloj del que manda (con la latencia mínima vista)
  }

  get latest() {
    return this.list.length ? this.list[this.list.length - 1].s : null;
  }

  clear() {
    this.list = [];
    this.offsets = [];
    this.offset = null;
  }

  // ts: momento en el reloj del que manda · now: reloj local
  push(ts, s, now) {
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return;
    const last = this.list[this.list.length - 1];
    if (last && ts <= last.ts) return; // viejo o repetido
    this.list.push({ ts, s });
    this.offsets.push(now - ts);
    if (this.offsets.length > OFFSET_WINDOW) this.offsets.shift();
    this.offset = Math.min(...this.offsets);
    const cut = ts - this.keep;
    while (this.list.length > 2 && this.list[0].ts < cut) this.list.shift();
  }

  // Estado para dibujar ahora. Devuelve { s, mode: 'interp' | 'extrap' | 'frozen' | 'old' } o null.
  sample(now) {
    const L = this.list;
    if (!L.length) return null;
    const t = now - this.offset - this.delay;
    if (t <= L[0].ts) return { s: L[0].s, mode: 'old' };
    const last = L[L.length - 1];
    if (t >= last.ts) {
      const ahead = Math.min(t - last.ts, this.extrapolate);
      const s = { ...last.s };
      if (typeof s.vx === 'number') s.x += (s.vx * ahead) / 1000;
      if (typeof s.vy === 'number') s.y += (s.vy * ahead) / 1000;
      return { s, mode: t - last.ts > this.extrapolate ? 'frozen' : 'extrap' };
    }
    let i = L.length - 2;
    while (i > 0 && L[i].ts > t) i--;
    const a = L[i];
    const b = L[i + 1];
    const k = (t - a.ts) / (b.ts - a.ts || 1);
    // Saltos grandes (reaparecer, teletransporte): sin interpolar
    if (Math.hypot((b.s.x ?? 0) - (a.s.x ?? 0), (b.s.y ?? 0) - (a.s.y ?? 0)) > this.snapDist) {
      return { s: k < 0.5 ? a.s : b.s, mode: 'interp' };
    }
    const s = { ...(k < 0.5 ? a.s : b.s) };
    for (const key of this.lerp) {
      const va = a.s[key];
      const vb = b.s[key];
      if (typeof va === 'number' && typeof vb === 'number') s[key] = va + (vb - va) * k;
    }
    return { s, mode: 'interp' };
  }
}

// Eventos confiables: { type: 'ev', seq, d } → el otro responde { type: 'ack', seq }.
// Lo que no se confirma en ACK_RESEND ms se vuelve a mandar (por ejemplo, tras una reconexión).
export class ReliableChannel {
  // send(msg): manda un mensaje del juego · now(): ms
  constructor(send, { resend = NET.ACK_RESEND, now = () => Date.now() } = {}) {
    this.out = send;
    this.resend = resend;
    this.now = now;
    this.seq = 0;
    this.pending = new Map(); // seq → { d, at }
    this.base = 0; // todos los seq ≤ base ya se recibieron
    this.seen = new Set(); // seq > base recibidos
  }

  send(d) {
    const seq = ++this.seq;
    this.pending.set(seq, { d, at: this.now() });
    this.out({ type: 'ev', seq, d });
    return seq;
  }

  // Mensaje 'ev' recibido: confirma siempre y devuelve d solo la primera vez.
  receive(msg) {
    const seq = msg?.seq;
    if (!Number.isInteger(seq) || seq <= 0) return null;
    this.out({ type: 'ack', seq });
    if (seq <= this.base || this.seen.has(seq)) return null;
    this.seen.add(seq);
    while (this.seen.has(this.base + 1)) {
      this.base++;
      this.seen.delete(this.base);
    }
    return msg.d;
  }

  ack(seq) {
    this.pending.delete(seq);
  }

  // Reenvía lo que no se confirmó a tiempo.
  update() {
    const now = this.now();
    for (const [seq, p] of this.pending) {
      if (now - p.at >= this.resend) {
        p.at = now;
        this.out({ type: 'ev', seq, d: p.d });
      }
    }
  }

  get unacked() {
    return this.pending.size;
  }
}

// ¿Toca mandar? A una frecuencia fija con el paso de la simulación.
export class RateTimer {
  constructor(hz) {
    this.every = 1 / hz;
    this.acc = this.every; // el primero sale de una vez
  }
  tick(dt) {
    this.acc += dt;
    if (this.acc < this.every) return false;
    this.acc = Math.min(this.acc - this.every, this.every);
    return true;
  }
}
