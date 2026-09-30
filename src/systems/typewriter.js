// Máquina de escribir: revela un texto letra por letra con pausas en comas y puntos.
// Lógica pura (se prueba sin navegador).
import { TEXT } from '../config/balance.js';

export class Typewriter {
  constructor(text, speed = 'normal') {
    this.chars = [...text];
    this.cps = TEXT.CHARS_PER_SECOND[speed] ?? TEXT.CHARS_PER_SECOND.normal;
    this.shown = speed === 'instant' ? this.chars.length : 0;
    this.acc = 0;
    this.wait = 0;
  }

  get done() {
    return this.shown >= this.chars.length;
  }

  // Avanza el tiempo. Devuelve los caracteres nuevos revelados en este paso.
  update(dt) {
    const revealed = [];
    if (this.done) return revealed;
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait > 0) return revealed;
      dt = -this.wait;
      this.wait = 0;
    }
    this.acc += dt * this.cps;
    while (this.acc >= 1 && !this.done) {
      this.acc -= 1;
      const ch = this.chars[this.shown++];
      revealed.push(ch);
      // Pausas naturales (no al final del texto)
      if (!this.done) {
        if (ch === ',' || ch === ';') this.wait = TEXT.PAUSE_COMMA;
        else if (ch === '.' || ch === '?' || ch === '!' || ch === '…') this.wait = TEXT.PAUSE_PERIOD;
        if (this.wait > 0) {
          this.acc = 0;
          break;
        }
      }
    }
    return revealed;
  }

  complete() {
    this.shown = this.chars.length;
    this.wait = 0;
  }
}
