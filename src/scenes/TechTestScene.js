// Hito 0 · Escena de prueba técnica: cuadrado que se mueve, texto con tildes, sonido,
// partículas, sacudida, hit-stop, flash, glitch, transiciones y música.
import { Scene } from '../core/game.js';
import { DevMenuScene } from './DevMenuScene.js';
import { drawText } from '../art/font.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Particles } from '../core/particles.js';
import { approach } from '../core/tween.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_PRUEBA } from '../audio/songs/prueba.js';

export class TechTestScene extends Scene {
  constructor(game) {
    super(game);
    this.box = { x: 150, y: 110, vx: 0, vy: 0, sx: 1, sy: 1 };
    this.particles = new Particles(400);
    this.t = 0;
    this.keys = [];
    this.music = false;
    this._onKey = (e) => this.keys.push(e.code);
  }

  enter() {
    window.addEventListener('keydown', this._onKey);
  }

  exit() {
    window.removeEventListener('keydown', this._onKey);
    this.game.audio.stopMusic();
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    const inp = g.input;
    const b = this.box;
    const speed = 110;
    b.vx = approach(b.vx, inp.moveX() * speed, 900 * dt);
    b.vy = approach(b.vy, inp.moveY() * speed, 900 * dt);
    b.x = Math.max(4, Math.min(SCREEN.W - 16, b.x + b.vx * dt));
    b.y = Math.max(74, Math.min(SCREEN.H - 16, b.y + b.vy * dt));
    // Estela al moverse
    if (Math.abs(b.vx) + Math.abs(b.vy) > 40 && g.frame % 3 === 0) {
      this.particles.spawn({ x: b.x + 6, y: b.y + 12, vx: -b.vx * 0.1, vy: -10, life: 0.4, color: UI.cyan, size: 2, endSize: 1, front: false });
    }
    b.sx = approach(b.sx, 1, 4 * dt);
    b.sy = approach(b.sy, 1, 4 * dt);

    if (inp.pressed('jump')) {
      playSfx(g.audio, 'test');
      b.sx = 1.4;
      b.sy = 0.6;
    }
    if (inp.pressed('shoot')) {
      this.particles.burst(b.x + 6, b.y + 6, 30, { speedMin: 30, speedMax: 110, colors: [UI.cyan, UI.magenta, UI.yellow], gravity: 120, lifeMin: 0.3, lifeMax: 0.8, size: 2, endSize: 1 });
      playSfx(g.audio, 'enemyDie');
    }
    if (inp.pressed('shield')) {
      g.effects.shake(0.6);
      playSfx(g.audio, 'land');
    }
    if (inp.pressed('lasso')) {
      g.effects.hitstop(12);
      g.effects.flash('#ffffff', 2);
      playSfx(g.audio, 'stomp');
    }
    if (inp.pressed('debug')) {
      g.effects.flash('#FF2E88', 6);
      playSfx(g.audio, 'hurt');
    }
    if (inp.pressed('interact')) {
      g.effects.glitch(0.5, 1);
      playSfx(g.audio, 'glitch');
    }
    for (const k of this.keys) {
      if (k === 'Digit1') g.startTransition({ type: 'fade' });
      if (k === 'Digit2') g.startTransition({ type: 'iris', center: { x: Math.round(b.x + 6), y: Math.round(b.y + 6) } });
      if (k === 'Digit3') g.startTransition({ type: 'glitch' });
      if (k === 'KeyM') {
        this.music = !this.music;
        if (this.music) g.audio.playSong(SONG_PRUEBA);
        else g.audio.stopMusic();
      }
    }
    this.keys.length = 0;
    if (inp.pressed('pause') && !g.transitioning) {
      g.changeScene(() => new DevMenuScene(g, 0), { type: 'fade' });
    }
    this.particles.update(dt);
  }

  draw(ctx) {
    const g = this.game;
    ctx.fillStyle = '#10131F';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.save();
    ctx.translate(g.effects.shakeX, g.effects.shakeY);
    // Cuadrícula de referencia de 16 px
    ctx.fillStyle = '#171B2C';
    for (let x = 0; x < SCREEN.W; x += 16) ctx.fillRect(x, 70, 1, SCREEN.H - 70);
    for (let y = 70; y < SCREEN.H; y += 16) ctx.fillRect(0, y, SCREEN.W, 1);

    drawText(ctx, TEXTS.techTest.title, 6, 5, { color: UI.cyan, bold: true });
    drawText(ctx, TEXTS.techTest.accents, 6, 19);
    drawText(ctx, TEXTS.techTest.symbols, 6, 31, { color: UI.yellow });
    drawText(ctx, TEXTS.techTest.tico, 6, 43, { color: UI.green });
    drawText(ctx, 'CÓDIGO', 6, 57, { bold: true, scale: 1, color: UI.magenta });
    drawText(ctx, 'ÑANDÚ', 60, 57, { bold: true, color: UI.text });

    this.particles.draw(ctx, 0, 0, false);
    // El cuadrado (con squash)
    const b = this.box;
    const w = Math.round(12 * b.sx);
    const h = Math.round(12 * b.sy);
    const x = Math.round(b.x + 6 - w / 2);
    const y = Math.round(b.y + 12 - h);
    ctx.fillStyle = '#5C3521';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#83522F';
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = '#D9AE4B';
    ctx.fillRect(x, y + h - 4, w, 4);
    this.particles.draw(ctx, 0, 0, true);
    ctx.restore();

    TEXTS.techTest.controls.forEach((l, i) => drawText(ctx, l, SCREEN.W - 4, 76 + i * 10, { align: 'right', color: UI.textDim }));
    drawText(ctx, `${TEXTS.techTest.scale(g.renderer.scale)} ${g.fps}`, 6, SCREEN.H - 12, { color: UI.textDim });
    drawText(ctx, this.music ? TEXTS.techTest.musicOn : TEXTS.techTest.musicOff, SCREEN.W - 4, SCREEN.H - 12, {
      align: 'right',
      color: this.music ? UI.green : UI.textDim,
    });
  }
}
