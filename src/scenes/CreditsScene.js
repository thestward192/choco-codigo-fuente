// Créditos: cortos y limpios sobre código que baja lentamente, con Choco y los cuatro
// fundadores caminando en fila abajo. Solo "Creador: Stward Serrano" y CHC Studio con su logo.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { loadLogo, drawLogo } from '../art/logo.js';
import { founderSprite } from '../art/portraits.js';
import { chocoFrame, ANIMS, FRAME_W, FRAME_H } from '../art/choco.js';
import { FOUNDERS } from '../data/levels.js';
import { SONG_CREDITOS, CREDITS_SONG_SECONDS } from '../audio/songs/creditos.js';
import { Flow } from '../game/flow.js';
import { ExtraScene } from './ExtraScene.js';

const C = TEXTS.credits;
const SPEED = 14; // px/s
const PARADE_TOP = SCREEN.H - 32; // el texto se corta sobre el desfile

export class CreditsScene extends Scene {
  // opts: { extra } → después de los créditos, la escena extra (15 Y doradas)
  constructor(game, { extra = false } = {}) {
    super(game);
    this.extra = extra;
    this.t = 0;
    this.scroll = 0;
    this.leaving = false;
    loadLogo();
    // Contenido: [tipo, texto, alto]
    this.items = [
      { type: 'title', text: C.title, h: 40 },
      { type: 'label', text: C.creatorLabel, h: 12 },
      { type: 'name', text: C.creator, h: 40 },
      { type: 'name', text: C.studio, h: 14 },
      { type: 'logo', h: 80 },
      { type: 'thanks', text: C.thanks, h: 20 },
    ];
    this.total = this.items.reduce((s, i) => s + i.h, 0);
    this.code = [];
    for (let i = 0; i < 26; i++) this.code.push({ x: (i * 12.3) % SCREEN.W, y: (i * 37) % SCREEN.H, s: 6 + (i % 5) * 3, ch: i });
  }

  enter() {
    this.game.audio.playSong(SONG_CREDITOS);
  }

  update(dt) {
    const inp = this.game.input;
    const fast = inp.down('confirm') ? 4 : 1;
    this.t += dt;
    this.scroll += SPEED * dt * fast;
    for (const c of this.code) {
      c.y += c.s * dt * fast;
      if (c.y > SCREEN.H) c.y -= SCREEN.H + 10;
    }
    // "Gracias por jugar" se detiene en el centro y espera unos segundos
    const endScroll = SCREEN.H + this.total - SCREEN.H / 2 - 20;
    if (this.scroll >= endScroll) {
      this.scroll = endScroll;
      this.holdT = (this.holdT || 0) + dt * fast;
    }
    if (this.leaving || this.game.transitioning) return;
    // Se espera también a que termine el popurrí (salvo que se esté acelerando con confirmar)
    if (fast > 1) this.hurried = true;
    const musicDone = this.hurried || this.t >= CREDITS_SONG_SECONDS;
    if ((this.holdT >= 3 && musicDone) || inp.pressed('cancel')) {
      this.leaving = true;
      if (this.extra) this.game.changeScene(() => new ExtraScene(this.game), { type: 'fade', duration: 0.8 });
      else Flow.toTitle(this.game);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    const bits = ['{', '}', ';', '0', '1', '<', '>', '/', '='];
    for (const c of this.code) drawText(ctx, bits[c.ch % bits.length], Math.round(c.x), Math.round(c.y), { color: '#152033', shadow: false });

    // El texto sube hasta el borde del desfile, sin pasar por encima de los personajes
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN.W, PARADE_TOP);
    ctx.clip();
    let y = SCREEN.H - Math.round(this.scroll);
    for (const it of this.items) {
      if (y > -it.h && y < SCREEN.H) {
        if (it.type === 'title') drawText(ctx, it.text, SCREEN.W / 2, y, { align: 'center', bold: true, scale: 2, color: UI.yellow });
        else if (it.type === 'label') drawText(ctx, it.text, SCREEN.W / 2, y, { align: 'center', color: UI.textDim });
        else if (it.type === 'name') drawText(ctx, it.text, SCREEN.W / 2, y, { align: 'center', bold: true, color: UI.text });
        else if (it.type === 'thanks') drawText(ctx, it.text, SCREEN.W / 2, y, { align: 'center', bold: true, color: UI.cyan });
        else if (it.type === 'logo') {
          // El logo se muestra sobre una tarjeta blanca (es su fondo original)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(SCREEN.W / 2 - 36, y, 72, 72);
          drawLogo(ctx, SCREEN.W / 2, y + 36, 70);
        }
      }
      y += it.h;
    }
    ctx.restore();
    this.drawParade(ctx);
  }

  // Choco y los cuatro fundadores caminando en fila
  drawParade(ctx) {
    const groundY = SCREEN.H - 6;
    ctx.fillStyle = '#10131F';
    ctx.fillRect(0, groundY, SCREEN.W, 6);
    ctx.fillStyle = '#2A2F45';
    const off = Math.floor(this.t * 30) % 8;
    for (let x = -off; x < SCREEN.W; x += 8) ctx.fillRect(x, groundY, 4, 1);
    const baseX = 150;
    const run = ANIMS.run.frames[Math.floor(this.t * 10) % ANIMS.run.frames.length];
    ctx.drawImage(chocoFrame(run, 'happy', true).normal, baseX + 30 - FRAME_W / 2, groundY - FRAME_H);
    FOUNDERS.forEach((f, i) => {
      const frame = 2 + (Math.floor(this.t * 8 + i) % 4);
      ctx.drawImage(founderSprite(f, frame).normal, baseX - 14 - i * 20, groundY - 24);
    });
  }
}
