// Pantalla de objeto obtenido: fondo oscurecido, el objeto gira en el centro con rayos de luz,
// nombre grande, descripción de 2 líneas y el control para usarlo. Fanfarria.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, measureText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { itemIcon } from '../art/icons.js';
import { ITEM_ACTION } from '../data/levels.js';
import { playSfx } from '../audio/sfx.js';
import { Ease } from '../core/tween.js';
import { fxRng } from '../core/rng.js';

const MIN_TIME = 1.0; // no se puede cerrar antes (para que la fanfarria se escuche)

export class ItemGetScene extends Scene {
  // onDone: se llama al cerrar. standalone: dibuja su propio fondo (fuera de un nivel)
  constructor(game, item, onDone = null, { standalone = false } = {}) {
    super(game);
    this.item = item;
    this.onDone = onDone;
    this.onClose = null; // lo usa la cinemática
    this.standalone = standalone;
    this.drawBelow = !standalone;
    this.t = 0;
    this.closing = false;
    this.sparks = [];
  }

  enter() {
    this.game.audio.duck(true);
    playSfx(this.game.audio, 'item');
    this.game.effects.flash('#FFFFFF', 4);
  }

  exit() {
    this.game.audio.duck(false);
  }

  update(dt) {
    this.t += dt;
    if (fxRng.chance(0.4)) {
      const a = fxRng.range(0, Math.PI * 2);
      this.sparks.push({ x: SCREEN.W / 2, y: 70, vx: Math.cos(a) * fxRng.range(20, 60), vy: Math.sin(a) * fxRng.range(20, 60), life: 0.8 });
    }
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    if (this.closing) {
      if (this.t > this.closeAt + 0.25) this.finish();
      return;
    }
    if (this.t > MIN_TIME && this.game.input.pressed('confirm')) {
      this.closing = true;
      this.closeAt = this.t;
      playSfx(this.game.audio, 'menuConfirm');
    }
  }

  finish() {
    if (this.game.top === this) this.game.pop();
    this.onClose?.();
    this.onDone?.();
  }

  draw(ctx) {
    const inA = Math.min(1, this.t / 0.3);
    const outA = this.closing ? Math.max(0, 1 - (this.t - this.closeAt) / 0.25) : 1;
    const a = inA * outA;
    ctx.globalAlpha = this.standalone ? 1 : 0.8 * a;
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = a;
    const cx = SCREEN.W / 2;
    const cy = 70;
    // Rayos de luz girando
    ctx.fillStyle = '#FFD23F';
    for (let i = 0; i < 12; i++) {
      const ang = this.t * 0.8 + (i / 12) * Math.PI * 2;
      ctx.globalAlpha = a * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang - 0.08) * 160, cy + Math.sin(ang - 0.08) * 160);
      ctx.lineTo(cx + Math.cos(ang + 0.08) * 160, cy + Math.sin(ang + 0.08) * 160);
      ctx.fill();
    }
    ctx.globalAlpha = a;
    for (const s of this.sparks) {
      ctx.fillStyle = s.life > 0.4 ? '#FFFFFF' : '#FFD23F';
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    // El objeto gira (escala X) y entra con rebote
    const ic = itemIcon(this.item);
    if (ic) {
      const pop = Ease.outBack(Math.min(1, this.t / 0.5));
      const scale = 3 * pop;
      const sx = Math.cos(this.t * 2.5);
      const w = Math.max(1, Math.round(ic.w * scale * Math.abs(sx)));
      const h = Math.round(ic.h * scale);
      const img = sx < 0 ? ic.flipped : ic.normal;
      ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    }
    const info = TEXTS.items[this.item];
    const nameScale = measureText(info.name, true) * 2 <= SCREEN.W - 16 ? 2 : 1;
    drawText(ctx, info.name, cx, 106, { align: 'center', bold: true, scale: nameScale, color: UI.yellow });
    info.desc.forEach((l, i) => drawText(ctx, l, cx, 128 + i * 11, { align: 'center', color: UI.text }));
    const action = ITEM_ACTION[this.item];
    if (action) {
      const keys = this.game.input.keyName(action);
      drawText(ctx, TEXTS.items.use(keys), cx, 153, { align: 'center', color: UI.cyan });
    }
    if (this.t > MIN_TIME && Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, TEXTS.items.continue, cx, 167, { align: 'center', color: UI.textDim });
    }
    ctx.globalAlpha = 1;
  }
}
