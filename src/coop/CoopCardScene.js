// Tarjeta del mapa (cooperativo) — docs/coop/05_menus_coop.md
// Fondo del color del mapa, "RECUERDO n", el nombre que entra animado y Choco y Tapita que llegan
// corriendo desde los dos costados. Dura lo mismo en las dos computadoras y no se salta (así los
// dos entran juntos a la sala).
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, measureText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { Ease } from '../core/tween.js';
import { playSfx } from '../audio/sfx.js';
import { drawCoopChar } from './art.js';

const T = TEXTS.coop;
export const CARD_TIME = 2.6;
// Fondo de cada mapa (docs/coop/06_arte_audio_coop.md)
const COLORS = { prologue: '#D3CEC1', lab: '#C9C4B6', c1: '#2E8FB8', c2: '#4C9A52', c3: '#6B3A1E', c4: '#10142A' };
const BUILT = ['prologue', 'lab'];

export class CoopCardScene extends Scene {
  // map: id del mapa · onDone: entra a la sala
  constructor(game, { map, onDone }) {
    super(game);
    this.online = true;
    this.map = map;
    this.onDone = onDone;
    this.t = 0;
    this.done = false;
    this.placeholder = !BUILT.includes(map);
  }

  enter() {
    this.game.audio.stopMusic(0.4);
    playSfx(this.game.audio, 'checkpoint');
  }

  update(dt) {
    this.t += dt;
    if (!this.done && this.t >= CARD_TIME) {
      this.done = true;
      this.onDone();
    }
  }

  draw(ctx) {
    const bg = COLORS[this.map] || '#10142A';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Franjas diagonales que se desplazan, mitad cian y mitad ámbar
    ctx.globalAlpha = 0.14;
    for (let i = -10; i < 30; i++) {
      ctx.fillStyle = i % 2 ? COOP.choco : COOP.tapita;
      const x = Math.round(i * 24 + ((this.t * 20) % 48));
      for (let y = 0; y < SCREEN.H; y += 2) ctx.fillRect(x + y / 2, y, 10, 2);
    }
    ctx.globalAlpha = 1;
    const light = this.map === 'prologue' || this.map === 'lab';
    const ink = light ? '#2A2730' : UI.text;
    const n = { c1: 1, c2: 2, c3: 3 }[this.map];
    const label = this.map === 'c4' ? T.card.final : this.map === 'lab' ? T.card.lab : T.card.label(n);
    const k = Ease.outBack(Math.min(1, this.t / 0.5));
    drawText(ctx, label, SCREEN.W / 2, Math.round(30 - (1 - k) * 20), { align: 'center', color: light ? '#6E6A60' : '#FFFFFF' });
    const name = T.map.names[this.map] || this.map;
    const nk = Ease.outCubic(Math.min(1, Math.max(0, (this.t - 0.2) / 0.5)));
    const w = measureText(name, true);
    drawText(ctx, name, Math.round(SCREEN.W / 2 - w / 2 + (1 - nk) * 160), 46, { bold: true, color: ink });
    if (this.t > 0.7) drawText(ctx, T.map.subtitles[this.map] || '', SCREEN.W / 2, 60, { align: 'center', color: light ? '#4A4656' : UI.textDim });
    if (this.placeholder && this.t > 0.9) drawText(ctx, T.map.building, SCREEN.W / 2, 150, { align: 'center', color: UI.yellow });
    // Los dos llegan corriendo y se encuentran en el centro
    const run = Ease.outCubic(Math.min(1, this.t / 1.1));
    const feet = 124;
    const arrived = run >= 1;
    drawCoopChar(ctx, 'choco', Math.round(-30 + (SCREEN.W / 2 - 22 + 30) * run), feet, { anim: arrived ? 'idle' : 'run', t: this.t, scale: 2 });
    drawCoopChar(ctx, 'tapita', Math.round(SCREEN.W + 30 - (SCREEN.W / 2 + 30 - 22) * run), feet, { anim: arrived ? 'idle' : 'run', t: this.t + 0.3, scale: 2, flip: true });
    ctx.fillStyle = light ? '#A8A293' : 'rgba(0,0,0,0.4)';
    ctx.fillRect(40, feet, SCREEN.W - 80, 1);
  }
}
