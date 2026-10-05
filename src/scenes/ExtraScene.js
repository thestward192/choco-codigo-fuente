// Escena extra (si se recolectaron las 15 Y doradas) — docs/01_historia.md
// Óscar y la Y en una cena elegante a la luz de las velas en el Mundo Cartucho, con marimba suave.
// Al terminar vuelve a la pantalla de título.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { Cutscene } from '../systems/cutscene.js';
import { drawText } from '../art/font.js';
import { founderSprite } from '../art/portraits.js';
import { drawGiantY } from '../art/codigo.js';
import { Lighting } from '../core/lighting.js';
import { Particles } from '../core/particles.js';
import { TEXTS, DIALOGUES } from '../data/dialogues.js';
import { ACCENTS, UI } from '../art/palettes.js';
import { SONG_ATARDECER } from '../audio/songs/santacruz.js';
import { fxRng } from '../core/rng.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.extra;
const R = fxRng;
const FLOOR = 140;

export class ExtraScene extends Scene {
  constructor(game) {
    super(game);
    this.t = 0;
    this.lighting = new Lighting();
    this.particles = new Particles(120);
    this.ending = false;
    this.leaving = false;
    const s = this;
    this.cs = new Cutscene(
      this,
      function* (cs) {
        yield 2.4;
        yield cs.say(DIALOGUES.extraScene);
        yield 1;
        s.ending = true;
        yield 4;
      },
      { skippable: true, onEnd: () => s.leave() },
    );
  }

  enter() {
    this.game.audio.playSong(SONG_ATARDECER, { fade: 1 });
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Flow.toTitle(this.game);
  }

  update(dt) {
    this.t += dt;
    this.cs.update(dt);
    this.particles.update(dt);
    // Corazoncitos que suben de la mesa
    if (R.chance(0.04)) this.particles.spawn({ x: 160 + R.range(-30, 30), y: FLOOR - 30, vy: -14, vx: R.range(-5, 5), life: 2.4, colors: [ACCENTS.oscar, '#FFD23F'], size: 2, endSize: 1 });
  }

  draw(ctx) {
    // Cielo de noche del Mundo Cartucho con estrellas
    ctx.fillStyle = '#0E1A3A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    for (let i = 0; i < 30; i++) {
      if (Math.floor(this.t * 2 + i) % 7 === 0) continue;
      ctx.fillStyle = i % 4 ? '#8AA0D0' : '#FFFFFF';
      ctx.fillRect((i * 97) % SCREEN.W, (i * 53) % 90, 1, 1);
    }
    // El castillo de silicio a lo lejos
    ctx.fillStyle = '#2A2A3E';
    ctx.fillRect(220, 60, 70, 80);
    for (let x = 220; x < 290; x += 10) ctx.fillRect(x, 54, 6, 6);
    ctx.fillRect(244, 34, 22, 30);
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(252, 44, 6, 6);
    // Pasto
    ctx.fillStyle = '#1E4A2A';
    ctx.fillRect(0, FLOOR, SCREEN.W, SCREEN.H - FLOOR);
    ctx.fillStyle = '#2E6A3A';
    ctx.fillRect(0, FLOOR, SCREEN.W, 2);
    // Mesa con mantel y dos velas
    ctx.fillStyle = '#5E3A1A';
    ctx.fillRect(132, FLOOR - 16, 4, 16);
    ctx.fillRect(184, FLOOR - 16, 4, 16);
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(124, FLOOR - 22, 72, 7);
    ctx.fillStyle = '#C8C0B0';
    ctx.fillRect(124, FLOOR - 16, 72, 1);
    for (const vx of [148, 172]) {
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(vx - 1, FLOOR - 31, 3, 9);
      const fl = Math.sin(this.t * 13 + vx) > 0 ? 1 : 0;
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(vx - 1 + fl, FLOOR - 35, 2, 4);
      ctx.fillStyle = '#FF8A3D';
      ctx.fillRect(vx, FLOOR - 34, 1, 2);
    }
    // Dos copitas
    ctx.fillStyle = '#8AE8FF';
    ctx.fillRect(138, FLOOR - 28, 3, 4);
    ctx.fillRect(178, FLOOR - 28, 3, 4);
    // Óscar en su silla y la Y en la suya
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(100, FLOOR - 26, 3, 26);
    ctx.fillRect(100, FLOOR - 10, 16, 3);
    ctx.fillRect(217, FLOOR - 26, 3, 26);
    ctx.fillRect(204, FLOOR - 10, 16, 3);
    ctx.drawImage(founderSprite('oscar', Math.floor(this.t * 2) % 2).normal, 104, FLOOR - 33);
    drawGiantY(ctx, 210, FLOOR - 26, 2, this.t);
    // Luz de las velas
    const L = this.lighting;
    L.begin('#05030A', 0.45);
    L.light(160, FLOOR - 32, 64 + Math.sin(this.t * 9) * 2, { strength: 0.9 });
    L.draw(ctx);
    this.particles.draw(ctx, 0, 0, false);
    this.particles.draw(ctx, 0, 0, true);
    drawText(ctx, T.title, SCREEN.W / 2, 18, { align: 'center', bold: true, color: UI.yellow });
    drawText(ctx, T.place, SCREEN.W / 2, 30, { align: 'center', color: UI.textDim });
    if (this.ending) drawText(ctx, T.end, SCREEN.W / 2, SCREEN.H - 14, { align: 'center', color: UI.text });
    this.cs.draw(ctx);
  }
}

