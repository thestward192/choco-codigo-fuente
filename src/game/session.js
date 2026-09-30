// Partida en curso: qué ranura se usa y sus datos. Guarda con try/catch vía SaveSystem.
import { TEXTS } from '../data/dialogues.js';

export class Session {
  constructor(game, slot, data) {
    this.game = game;
    this.slot = slot;
    this.data = data;
  }

  // Reemplaza los datos y guarda. Si no se puede guardar, avisa una sola vez.
  update(data, { save = true } = {}) {
    this.data = data;
    if (save) this.save();
  }

  save() {
    const ok = this.game.save.saveSlot(this.slot, this.data);
    if (!ok && !this.warned) {
      this.warned = true;
      this.game.notify(TEXTS.system.cantSave, 5);
    }
    return ok;
  }
}
