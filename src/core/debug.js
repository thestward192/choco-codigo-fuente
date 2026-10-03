// Overlay y herramientas de depuración (?debug=1). No existen en el build de producción:
// main.js solo importa este módulo cuando import.meta.env.DEV es verdadero.
import { drawText } from '../art/font.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';

export class Debug {
  constructor() {
    this.overlay = true;
    this.invincible = false;
    this.infiniteLives = false;
    this.frameStepping = false;
    this._stepRequested = false;
    this.pendingKeys = [];
    window.addEventListener('keydown', (e) => {
      if (/^F\d+$/.test(e.code)) {
        e.preventDefault();
        this.pendingKeys.push(e.code);
      }
    });
    this.lines = [];
  }

  // Procesa las teclas de depuración una vez por paso.
  update(game) {
    for (const k of this.pendingKeys) {
      const scene = game.top;
      if (k === 'F1') this.overlay = !this.overlay;
      else if (k === 'F2') this.invincible = !this.invincible;
      else if (k === 'F3' && scene?.debugGiveAll) scene.debugGiveAll();
      else if (k === 'F4' && scene?.debugLife) scene.debugLife(-1);
      else if (k === 'F5' && scene?.debugLife) scene.debugLife(1);
      else if (k === 'F6') this.frameStepping = !this.frameStepping;
      else if (k === 'F7') this._stepRequested = true;
      else if (k === 'F8' && scene?.debugHudDemo) scene.debugHudDemo();
      else if (k === 'F9') this.infiniteLives = !this.infiniteLives;
      else if (k === 'F10') (scene?.debugF10 || scene?.debugCarnes)?.call(scene);
    }
    this.pendingKeys.length = 0;
  }

  consumeStep() {
    if (this._stepRequested) {
      this._stepRequested = false;
      return true;
    }
    return false;
  }

  draw(ctx, game) {
    if (!this.overlay) return;
    const scene = game.top;
    const lines = [`${TEXTS.debug.on} ${game.fps} FPS ×${game.renderer.scale}`];
    if (scene?.debugInfo) lines.push(...scene.debugInfo());
    if (this.invincible) lines.push(TEXTS.debug.invincible);
    if (this.infiniteLives) lines.push(TEXTS.debug.infiniteLives);
    if (this.frameStepping) lines.push(TEXTS.debug.stepping);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000';
    ctx.fillRect(SCREEN.W - 132, 0, 132, lines.length * 9 + 3);
    ctx.globalAlpha = 1;
    lines.forEach((l, i) => drawText(ctx, l, SCREEN.W - 2, 2 + i * 9, { align: 'right', color: '#6FE08A', shadow: false }));
    // Dibujos de mundo (hitboxes, cámara) los agrega la escena
    if (scene?.debugDraw) scene.debugDraw(ctx);
  }
}
