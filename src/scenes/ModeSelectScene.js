// Selección de modo (después del título) — docs/coop/05_menus_coop.md
// Dos tarjetas: MODO SOLO (Choco en idle con el báculo) y COOPERATIVO (Choco y Tapita chocando
// los puños). La elegida rebota (squash & stretch) y la otra se oscurece; al confirmar hace zoom.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { ANIMS, withShootArms } from '../art/choco.js';
import { Ease } from '../core/tween.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';
import { updateBackdrop, drawBackdrop } from './menuCommon.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { drawCoopChar } from '../coop/art.js';
import { TitleScene } from './TitleScene.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.modeSelect;
const MODES = ['solo', 'coop'];
const CARD = { w: 116, h: 112, y: 32, gap: 20 };
const BOUNCE_TIME = 0.35; // rebote de la tarjeta al elegirla
const ZOOM_TIME = 0.3; // zoom al confirmar
const BUMP_PERIOD = 3.2; // cada cuánto chocan los puños

export class ModeSelectScene extends Scene {
  constructor(game) {
    super(game);
    this.t = 0;
    // Se recuerda la última elección, pero la pantalla nunca se salta
    this.sel = Math.max(0, MODES.indexOf(game.options.lastMode));
    this.bounce = BOUNCE_TIME;
    this.zoom = 0;
    this.chosen = null;
  }

  enter() {
    this.game.audio.playSong(SONG_TITULO);
  }

  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    if (this.bounce > 0) this.bounce -= dt;
    if (this.chosen) {
      this.zoom = Math.min(ZOOM_TIME, this.zoom + dt);
      return;
    }
    if (this.game.transitioning) return;
    const inp = this.game.input;
    const a = this.game.audio;
    if (inp.pressed('left') || inp.pressed('right')) {
      const next = inp.pressed('left') ? 0 : 1;
      if (next !== this.sel) {
        this.sel = next;
        this.bounce = BOUNCE_TIME;
        playSfx(a, 'menuMove');
      }
    }
    if (inp.pressed('confirm')) {
      this.chosen = MODES[this.sel];
      playSfx(a, 'menuConfirm');
      const g = this.game;
      if (g.options.lastMode !== this.chosen) {
        g.options.lastMode = this.chosen;
        g.saveOptions();
      }
      if (this.chosen === 'solo') Flow.toMainMenu(g);
      else Flow.toCoopMenu(g);
    } else if (inp.pressed('cancel')) {
      playSfx(a, 'menuCancel');
      this.game.changeScene(() => new TitleScene(this.game, { skipIntro: true }), { type: 'fade', duration: 0.2 });
    }
  }

  cardRect(i) {
    const totalW = CARD.w * 2 + CARD.gap;
    const x = Math.round((SCREEN.W - totalW) / 2 + i * (CARD.w + CARD.gap));
    let sx = 1;
    let sy = 1;
    if (i === this.sel) {
      if (this.bounce > 0) {
        const p = 1 - this.bounce / BOUNCE_TIME;
        const k = Math.sin(p * Math.PI * 2) * (1 - p) * 0.07;
        sx = 1 + k;
        sy = 1 - k;
      }
      if (this.chosen) {
        const z = 1 + Ease.outCubic(this.zoom / ZOOM_TIME) * 0.12;
        sx *= z;
        sy *= z;
      }
    }
    const w = Math.round(CARD.w * sx);
    const h = Math.round(CARD.h * sy);
    const cx = x + CARD.w / 2;
    const bottom = CARD.y + CARD.h; // el rebote se apoya en la base de la tarjeta
    return { x: Math.round(cx - w / 2), y: bottom - h, w, h, cx, sx, sy };
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: null, choco: false, dim: 0.35 });
    drawText(ctx, T.title, SCREEN.W / 2, 12, { align: 'center', bold: true, color: UI.text });
    // La tarjeta elegida se dibuja de último (encima)
    const order = this.sel === 0 ? [1, 0] : [0, 1];
    for (const i of order) this.drawCard(ctx, i);
    drawText(ctx, T.hint, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
  }

  drawCard(ctx, i) {
    const r = this.cardRect(i);
    const active = i === this.sel;
    const accent = i === 0 ? UI.cyan : COOP.both;
    drawTerminalPanel(ctx, r.x, r.y, r.w, r.h, i === 0 ? './solo' : './sincronizado');
    // Borde de la elegida
    if (active) {
      ctx.fillStyle = Math.floor(this.t * 4) % 2 || !this.chosen ? accent : UI.yellow;
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, 1);
      ctx.fillRect(r.x - 1, r.y + r.h, r.w + 2, 1);
      ctx.fillRect(r.x - 1, r.y - 1, 1, r.h + 2);
      ctx.fillRect(r.x + r.w, r.y - 1, 1, r.h + 2);
    }
    const feetY = r.y + Math.round(78 * r.sy);
    // Piso de la tarjeta
    ctx.fillStyle = '#161A2A';
    ctx.fillRect(r.x + 8, feetY, r.w - 16, 1);

    if (i === 0) {
      drawCoopChar(ctx, 'choco', r.cx, feetY, { anim: ANIMS.idle, t: this.t, sx: r.sx, sy: r.sy });
    } else {
      this.drawBump(ctx, r, feetY);
    }
    drawText(ctx, i === 0 ? T.solo : T.coop, r.cx, feetY + 8, { align: 'center', bold: true, color: active ? UI.text : UI.textDim });
    drawText(ctx, i === 0 ? T.soloSub : T.coopSub, r.cx, feetY + 20, { align: 'center', color: active ? accent : UI.textDim });

    if (!active) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#07060F';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
  }

  // Choco y Tapita frente a frente; cada BUMP_PERIOD se acercan y chocan los puños.
  drawBump(ctx, r, feetY) {
    const p = (this.t % BUMP_PERIOD) / BUMP_PERIOD;
    let k = 0; // 0 = separados, 1 = puños juntos
    if (p < 0.08) k = Ease.inOutQuad(p / 0.08);
    else if (p < 0.2) k = 1;
    else if (p < 0.3) k = 1 - Ease.inOutQuad((p - 0.2) / 0.1);
    const apart = 22 - Math.round(k * 6);
    const bumping = k > 0.9;
    const pose = bumping ? withShootArms(ANIMS.idle.frames[0]) : null;
    const opts = { anim: ANIMS.idle, t: this.t, sx: r.sx, sy: r.sy, frame: pose, staff: false };
    drawCoopChar(ctx, 'choco', r.cx - apart * r.sx, feetY, opts);
    drawCoopChar(ctx, 'tapita', r.cx + apart * r.sx, feetY, { ...opts, flip: true, t: this.t + 0.4 });
    // Chispa del choque
    if (bumping && p < 0.16) {
      const s = Math.round((0.16 - p) * 60);
      const y = feetY - 30;
      ctx.fillStyle = UI.yellow;
      ctx.fillRect(Math.round(r.cx) - s, y, s * 2 + 1, 1);
      ctx.fillRect(Math.round(r.cx), y - s, 1, s * 2 + 1);
    }
  }
}
