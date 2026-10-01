// Tilemap definido como arreglo de strings (un carácter por tile de 16×16).
import { SCREEN } from '../config/balance.js';

const TS = SCREEN.TILE;

// Tipos de colisión
export const T = {
  EMPTY: 0,
  SOLID: 1,
  ONEWAY: 2, // se atraviesa desde abajo; ↓ + salto para bajar
  SPIKES: 3, // daño
  VOID: 4, // agua / vacío: muerte
  GHOST: 5, // sólido solo con Vista Debug activa
  SHADE: 6, // sombra (nivel 4), sin colisión
  HIDDEN: 7, // bloque invisible: solo choca si se golpea desde abajo (y entonces se revela)
};

// Leyenda por defecto: carácter → tipo. Los niveles pueden extenderla.
export const DEFAULT_LEGEND = {
  '.': T.EMPTY,
  ' ': T.EMPTY,
  '#': T.SOLID,
  K: T.SOLID, // agrietado: se rompe con disparo cargado
  '=': T.ONEWAY,
  '^': T.SPIKES,
  '~': T.VOID,
  g: T.GHOST,
  s: T.SHADE,
  i: T.HIDDEN,
};

export class Tilemap {
  // rows: string[]; legend: {char: tipo}. Los caracteres que no están en la leyenda son EMPTY
  // (sirven para marcar entidades en el mapa).
  constructor(rows, legend = DEFAULT_LEGEND) {
    this.rows = rows;
    this.legend = legend;
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.pxW = this.w * TS;
    this.pxH = this.h * TS;
    this.types = new Uint8Array(this.w * this.h);
    this.chars = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const ch = rows[y][x] ?? '.';
        this.chars.push(ch);
        this.types[y * this.w + x] = legend[ch] ?? T.EMPTY;
      }
    }
    this.ghostSolid = false; // Vista Debug activa
    // Plataformas dinámicas (móviles, que caen, bloques spam): rectángulos sólidos solo por arriba
    // { x, y, w, h, dx, dy, active }
    this.platforms = [];
  }

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }

  // Fuera del mapa: los costados son pared, arriba y abajo están vacíos.
  typeAt(tx, ty) {
    if (tx < 0 || tx >= this.w) return ty < this.h ? T.SOLID : T.EMPTY;
    if (ty < 0 || ty >= this.h) return T.EMPTY;
    return this.types[ty * this.w + tx];
  }

  charAt(tx, ty) {
    if (!this.inBounds(tx, ty)) return '.';
    return this.chars[ty * this.w + tx];
  }

  setChar(tx, ty, ch) {
    if (!this.inBounds(tx, ty)) return;
    const i = ty * this.w + tx;
    this.chars[i] = ch;
    this.types[i] = this.legend[ch] ?? T.EMPTY;
  }

  isSolid(tx, ty) {
    const t = this.typeAt(tx, ty);
    return t === T.SOLID || (t === T.GHOST && this.ghostSolid);
  }

  isOneWay(tx, ty) {
    return this.typeAt(tx, ty) === T.ONEWAY;
  }

  // ¿El rectángulo toca algún tile de tipo `type`? Con recorte opcional (inset) de la hitbox.
  overlapsType(x, y, w, h, type, inset = 0) {
    const x0 = Math.floor((x + inset) / TS);
    const x1 = Math.floor((x + w - inset - 0.001) / TS);
    const y0 = Math.floor((y + inset) / TS);
    const y1 = Math.floor((y + h - inset - 0.001) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.typeAt(tx, ty) === type) return true;
    return false;
  }

  // Pinchos: solo la mitad inferior del tile hace daño (se ven como puntas).
  touchesSpikes(x, y, w, h) {
    const x0 = Math.floor((x + 1) / TS);
    const x1 = Math.floor((x + w - 1.001) / TS);
    const y0 = Math.floor(y / TS);
    const y1 = Math.floor((y + h - 0.001) / TS);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.typeAt(tx, ty) !== T.SPIKES) continue;
        const spikeTop = ty * TS + 7;
        if (y + h > spikeTop && y < (ty + 1) * TS) return true;
      }
    }
    return false;
  }

  // Busca todas las posiciones de un carácter (para colocar entidades).
  find(ch) {
    const out = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.charAt(x, y) === ch) out.push({ tx: x, ty: y });
    return out;
  }
}
