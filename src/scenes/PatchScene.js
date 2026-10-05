// El parche (final del nivel 5): zoom a la pantalla de N.U.L.L. Aparece el comentario viejo
// `// TODO: arreglar el manejo de null. Después lo veo.`, Choco lo borra y escribe la corrección
// línea por línea con secuencias de flechas, mientras los 4 fundadores animan a los lados (una
// línea por fundador). Límite de 20 s: si se acaba, N.U.L.L. lanza un pulso que quita un cuadrito
// y se reintenta el parche (no la fase).
//   opts: { hp, maxHp, onPulse() → hp nuevo, onDone() }
import { Scene } from '../core/game.js';
import { SCREEN, PATCH } from '../config/balance.js';
import { createPatch, patchInput, patchUpdate } from '../systems/patch.js';
import { drawText } from '../art/font.js';
import { founderSprite } from '../art/portraits.js';
import { drawMiniBar } from '../ui/hud.js';
import { ACCENTS, UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { FOUNDERS } from '../data/levels.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { Particles } from '../core/particles.js';

const T = TEXTS.patch;
const GLYPH = { up: '↑', down: '↓', left: '←', right: '→' };
const INTRO = 3.4; // comentario, borrado y primera línea lista
const EDITOR = { x: 78, y: 40, w: 164 };

export class PatchScene extends Scene {
  constructor(game, opts = {}) {
    super(game);
    this.opts = opts;
    this.hp = opts.hp ?? 1;
    this.maxHp = opts.maxHp ?? 5;
    this.t = 0;
    this.patch = createPatch(fxRng);
    this.typed = []; // caracteres escritos por línea
    this.cheer = FOUNDERS.map(() => 0);
    this.pulseT = 0;
    this.doneT = -1;
    this.attempt = 1;
    this.particles = new Particles(200);
    this.onClose = null;
  }

  get playing() {
    return this.t >= INTRO && this.pulseT <= 0 && this.doneT < 0;
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    const inp = g.input;
    const p = this.patch;
    this.particles.update(dt);
    for (let i = 0; i < 4; i++) if (this.cheer[i] > 0) this.cheer[i] -= dt;
    // Escribir las líneas ya resueltas, letra por letra
    for (let i = 0; i < p.line; i++) {
      const full = T.code[i].length;
      const before = Math.floor(this.typed[i] || 0);
      this.typed[i] = Math.min(full, (this.typed[i] || 0) + dt * PATCH.TYPE_SPEED);
      if (Math.floor(this.typed[i]) > before && Math.floor(this.typed[i]) % 2 === 0) playSfx(g.audio, 'key');
    }
    if (this.doneT >= 0) {
      this.doneT += dt;
      if (this.doneT > 2.6 && !this.closed) {
        this.closed = true;
        this.opts.onDone?.();
        if (g.top === this) g.pop();
        this.onClose?.();
      }
      return;
    }
    if (this.pulseT > 0) {
      this.pulseT -= dt;
      if (this.pulseT <= 0) {
        // Reintento: secuencias nuevas, el reloj lleno
        this.patch = createPatch(fxRng);
        this.typed = [];
        this.attempt++;
      }
      return;
    }
    if (this.t < INTRO) {
      if (this.t > 1.2 && this.t - dt <= 1.2) playSfx(g.audio, 'nullAppear');
      if (this.t > 2 && Math.floor(this.t * 30) !== Math.floor((this.t - dt) * 30) && this.t < 2.8) playSfx(g.audio, 'key');
      return;
    }
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (!inp.pressed(dir)) continue;
      const before = p.line;
      const r = patchInput(p, dir);
      if (r === 'ok') playSfx(g.audio, 'hackKey');
      else if (r === 'error') {
        playSfx(g.audio, 'hackError');
        g.effects.shake(0.2);
      } else if (r === 'line' || r === 'done') {
        playSfx(g.audio, 'hackOk');
        this.cheer[before] = 1.6;
        const fx = before % 2 === 0 ? 40 : SCREEN.W - 40;
        this.particles.burst(fx, before < 2 ? 70 : 128, 16, { speedMin: 30, speedMax: 90, colors: [ACCENTS[FOUNDERS[before]], '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.7 });
        if (r === 'done') {
          this.doneT = 0;
          playSfx(g.audio, 'compile');
        }
      }
      break;
    }
    if (patchUpdate(p, dt) === 'timeout') {
      this.pulseT = 1.6;
      playSfx(g.audio, 'nullPulse');
      g.effects.flash('#FF2E88', 6);
      g.effects.shake(0.8);
      g.effects.glitch(0.5, 1);
      this.hp = this.opts.onPulse ? this.opts.onPulse() : Math.max(1, this.hp - 1);
    }
  }

  draw(ctx) {
    const p = this.patch;
    // La pantalla de N.U.L.L. de cerca: negro, marco magenta, líneas de escaneo
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.fillStyle = '#16081E';
    for (let y = (Math.floor(this.t * 20) % 2); y < SCREEN.H; y += 2) ctx.fillRect(0, y, SCREEN.W, 1);
    const glow = this.pulseT > 0 ? '#FF2E88' : this.doneT >= 0 ? '#43D9FF' : '#8C1D52';
    ctx.fillStyle = glow;
    ctx.fillRect(4, 4, SCREEN.W - 8, 1);
    ctx.fillRect(4, SCREEN.H - 5, SCREEN.W - 8, 1);
    ctx.fillRect(4, 4, 1, SCREEN.H - 8);
    ctx.fillRect(SCREEN.W - 5, 4, 1, SCREEN.H - 8);
    if (fxRng.chance(0.08) && this.doneT < 0) {
      ctx.fillStyle = fxRng.pick(['#FF2E88', '#43D9FF']);
      ctx.fillRect(fxRng.int(8, SCREEN.W - 60), fxRng.int(8, SCREEN.H - 8), fxRng.int(10, 50), 1);
    }
    // Vida de Choco
    drawMiniBar(ctx, 10, 10, this.hp, 6);
    drawText(ctx, T.title, SCREEN.W / 2, 10, { align: 'center', bold: true, color: UI.cyan });
    this.drawTodo(ctx);
    this.drawEditor(ctx);
    this.drawFounders(ctx);
    if (this.t >= INTRO && this.doneT < 0) this.drawArrows(ctx);
    // Reloj
    if (this.t >= INTRO && this.doneT < 0) {
      const k = Math.max(0, p.t / p.time);
      const bx = 60;
      const by = SCREEN.H - 16;
      const bw = SCREEN.W - 120;
      ctx.fillStyle = '#2A1446';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = k < 0.3 ? (Math.floor(this.t * 10) % 2 ? UI.red : '#FF8A8A') : UI.cyan;
      ctx.fillRect(bx, by, Math.round(bw * k), 4);
      drawText(ctx, `${Math.ceil(p.t)} s`, bx + bw + 6, by - 2, { color: UI.textDim });
    }
    this.particles.draw(ctx, 0, 0, false);
    this.particles.draw(ctx, 0, 0, true);
    if (this.pulseT > 0) {
      ctx.globalAlpha = Math.min(1, this.pulseT) * 0.35;
      ctx.fillStyle = '#FF2E88';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
      drawText(ctx, T.pulse, SCREEN.W / 2, 84, { align: 'center', bold: true, scale: 2, color: '#FFFFFF', shadow: '#8C1D52' });
      drawText(ctx, T.retry, SCREEN.W / 2, 108, { align: 'center', color: UI.text });
    }
    if (this.doneT >= 0) {
      const msg = this.doneT < 1.1 ? T.compiling + '.'.repeat(Math.floor(this.doneT * 4) % 4) : T.applied;
      drawText(ctx, msg, SCREEN.W / 2, 128, { align: 'center', bold: true, color: this.doneT < 1.1 ? UI.yellow : UI.green });
    }
  }

  // El comentario viejo: aparece, Choco lo selecciona y lo borra
  drawTodo(ctx) {
    const s = T.todo;
    const y = 24;
    if (this.t < 0.4) return;
    let n = s.length;
    if (this.t < 1.2) n = Math.floor(((this.t - 0.4) / 0.8) * s.length);
    let erase = 0;
    if (this.t > 2) erase = Math.min(s.length, Math.floor(((this.t - 2) / 0.8) * s.length));
    const shown = s.slice(0, Math.max(0, n - erase));
    if (!shown) return;
    const selected = this.t > 1.6 && this.t < 2;
    const w = drawText(ctx, shown, SCREEN.W / 2, y, { align: 'center', color: selected ? '#0B0610' : '#E0343F', shadow: false });
    if (selected) {
      ctx.fillStyle = '#43D9FF';
      ctx.fillRect(Math.round(SCREEN.W / 2 - w / 2) - 1, y - 1, Math.round(w) + 2, 9);
      drawText(ctx, shown, SCREEN.W / 2, y, { align: 'center', color: '#0B0610', shadow: false });
    }
  }

  drawEditor(ctx) {
    const p = this.patch;
    if (this.t < 2.6) return;
    const { x, y, w } = EDITOR;
    ctx.fillStyle = '#100820';
    ctx.fillRect(x - 6, y - 4, w + 12, 4 * 12 + 8);
    ctx.fillStyle = '#2A1446';
    ctx.fillRect(x - 6, y - 4, w + 12, 1);
    for (let i = 0; i < 4; i++) {
      const ly = y + i * 12;
      drawText(ctx, String(i + 1), x - 2, ly, { align: 'right', color: '#3A2A5A', shadow: false });
      const code = T.code[i];
      const n = Math.floor(this.typed[i] || 0);
      if (n > 0) drawText(ctx, code.slice(0, n), x + 4, ly, { color: UI.cyan, shadow: false });
      // Línea actual: cursor parpadeante
      if (i === p.line && this.doneT < 0 && this.pulseT <= 0 && Math.floor(this.t * 3) % 2) {
        ctx.fillStyle = ACCENTS[FOUNDERS[i]];
        ctx.fillRect(x + 4, ly, 4, 7);
      }
      if (i < p.line && n >= code.length) drawText(ctx, '✔', x + w, ly, { align: 'right', color: UI.green, shadow: false });
    }
  }

  drawArrows(ctx) {
    const p = this.patch;
    if (p.line >= p.lines.length || this.pulseT > 0) return;
    const seq = p.lines[p.line];
    const cell = 16;
    const total = seq.length * (cell + 3) - 3;
    const shake = p.errorT > 0 ? (Math.floor(this.t * 40) % 2 ? 2 : -2) : 0;
    const ax = Math.round((SCREEN.W - total) / 2) + shake;
    const ay = 104;
    drawText(ctx, T.lineFor(TEXTS.characters[FOUNDERS[p.line]]), SCREEN.W / 2, ay - 12, { align: 'center', color: ACCENTS[FOUNDERS[p.line]] });
    seq.forEach((d, i) => {
      const cx = ax + i * (cell + 3);
      const done = i < p.idx;
      const cur = i === p.idx;
      const bump = cur ? -Math.round(Math.abs(Math.sin(this.t * 8))) : 0;
      ctx.fillStyle = p.errorT > 0 ? UI.red : done ? UI.green : cur ? '#F4F1EA' : '#3A2A5A';
      ctx.fillRect(cx, ay + bump, cell, cell);
      ctx.fillStyle = done ? '#0A2A14' : '#0B0610';
      ctx.fillRect(cx + 1, ay + 1 + bump, cell - 2, cell - 2);
      drawText(ctx, GLYPH[d], cx + cell / 2, ay + 4 + bump, { align: 'center', color: done ? UI.green : cur ? '#FFFFFF' : '#8A7AAA', shadow: false });
    });
  }

  // Los fundadores a los lados: cada uno anima su línea
  drawFounders(ctx) {
    const pos = [
      [28, 74],
      [SCREEN.W - 28, 74],
      [28, 140],
      [SCREEN.W - 28, 140],
    ];
    FOUNDERS.forEach((who, i) => {
      const [x, y] = pos[i];
      const c = this.cheer[i];
      const jump = c > 0 ? Math.round(Math.abs(Math.sin(c * 8)) * 8) : Math.round(Math.sin(this.t * 3 + i) * 1);
      const frame = c > 0 ? 2 + (Math.floor(this.t * 10) % 4) : Math.floor(this.t * 3 + i) % 2;
      const spr = founderSprite(who, frame);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = ACCENTS[who];
      ctx.fillRect(x - 16, y + 1, 32, 2);
      ctx.globalAlpha = 1;
      ctx.drawImage(spr.get(i % 2 === 1), x - 16, y - 48 - jump, 32, 48);
      if (c > 0) drawText(ctx, T.cheers[who], x, y - 60 - jump, { align: 'center', color: ACCENTS[who] });
    });
  }
}
