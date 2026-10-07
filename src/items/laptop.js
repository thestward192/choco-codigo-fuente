// Laptop Debugger: batería de la Vista Debug — docs/03_mecanicas.md
import { LAPTOP } from '../config/balance.js';

export class Laptop {
  constructor() {
    this.battery = LAPTOP.BATTERY_MAX;
    this.active = false;
    this.locked = false; // se agotó: no se activa hasta llegar a MIN_TO_REACTIVATE
    this.idleT = 0;
    this.justToggled = false;
  }

  // wantsOn: el jugador mantiene el botón de la Vista Debug.
  // infinite: modo desarrolladora, la batería no se gasta.
  update(dt, wantsOn, infinite = false) {
    if (infinite) {
      this.battery = LAPTOP.BATTERY_MAX;
      this.locked = false;
    }
    const was = this.active;
    this.active = wantsOn && !this.locked && this.battery > 0;
    if (this.active) {
      if (!infinite) this.battery -= LAPTOP.DRAIN * dt;
      this.idleT = 0;
      if (this.battery <= 0) {
        this.battery = 0;
        this.active = false;
        this.locked = true;
      }
    } else {
      this.idleT += dt;
      if (this.idleT >= LAPTOP.RECHARGE_DELAY) this.battery = Math.min(LAPTOP.BATTERY_MAX, this.battery + LAPTOP.RECHARGE * dt);
      if (this.locked && this.battery >= LAPTOP.MIN_TO_REACTIVATE) this.locked = false;
    }
    this.justToggled = was !== this.active;
    return this.active;
  }
}
