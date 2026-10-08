// HUD del Modo Sincronizado — docs/coop/05_menus_coop.md
// Arriba a la izquierda, el propio personaje (Choco: cuadritos, batería y escudo; Tapita: la tapa
// partida en 4 trozos, melcochas y si está plantada). Arriba a la derecha, el compañero en chico
// (nombre, vida, estado y ping). Abajo a la derecha, bits o cristales.
import { drawText } from '../art/font.js';
import { CHOCO, UI, COOP as COOP_COLORS } from '../art/palettes.js';
import { PALETTE as TAPITA_PAL, MELCOCHA } from '../art/tapita.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { pingQuality } from '../net/session.js';

const T = TEXTS.coop.hud;

export class CoopHud {
  constructor() {
    this.t = 0;
    this.lastHp = null;
    this.breaking = []; // { slot, t }
    this.countPulse = 0;
    this.lastCount = 0;
  }

  update(dt, s) {
    this.t += dt;
    if (this.lastHp !== null && s.hp < this.lastHp) for (let i = s.hp; i < this.lastHp; i++) this.breaking.push({ slot: i, t: 0 });
    this.lastHp = s.hp;
    for (const b of this.breaking) b.t += dt;
    this.breaking = this.breaking.filter((b) => b.t < 0.6);
    if (s.count && s.count.n !== this.lastCount) {
      this.countPulse = 0.2;
      this.lastCount = s.count.n;
    }
    if (this.countPulse > 0) this.countPulse -= dt;
  }

  draw(ctx, s) {
    if (s.mine === 'tapita') this.drawTapa(ctx, 4, 4, s);
    else this.drawBar(ctx, 4, 4, s);
    this.drawAbilities(ctx, s);
    if (s.partner) this.drawPartner(ctx, s.partner);
    if (s.count) this.drawCount(ctx, s.count);
  }

  // ---------- Choco: 4 cuadritos de chocolate ----------
  drawBar(ctx, x0, y0, s) {
    const n = s.maxHp;
    const w = n * 11 + 3;
    ctx.fillStyle = 'rgba(7,7,12,0.55)';
    ctx.fillRect(x0 - 2, y0 - 2, w + 4, 18);
    ctx.fillStyle = CHOCO.o;
    ctx.fillRect(x0, y0, w, 14);
    for (let i = 0; i < n; i++) {
      const x = x0 + 2 + i * 11;
      const y = y0 + 2;
      const br = this.breaking.find((b) => b.slot === i);
      if (i < s.hp || (br && br.t < 0.1)) {
        ctx.fillStyle = CHOCO.b;
        ctx.fillRect(x, y, 10, 10);
        ctx.fillStyle = CHOCO.l;
        ctx.fillRect(x, y, 10, 1);
        ctx.fillRect(x, y, 1, 10);
        ctx.fillStyle = CHOCO.s;
        ctx.fillRect(x, y + 9, 10, 1);
        ctx.fillRect(x + 9, y, 1, 10);
        ctx.fillStyle = CHOCO.h;
        ctx.fillRect(x + 1, y + 1, 2, 1);
      } else {
        ctx.fillStyle = '#1A100B';
        ctx.fillRect(x, y, 10, 10);
        if (br) this.drawCrumbs(ctx, x + 5, y + 5, br.t, [CHOCO.b, CHOCO.l]);
      }
    }
  }

  // ---------- Tapita: la tapa partida en 4 ----------
  drawTapa(ctx, x0, y0, s) {
    const pieces = s.maxHp;
    const W = 44;
    const H = 14;
    ctx.fillStyle = 'rgba(7,7,12,0.55)';
    ctx.fillRect(x0 - 2, y0 - 2, W + 6, H + 6);
    // Trapecio: cada trozo es una franja vertical; los que faltan quedan como hueco con grieta
    for (let i = 0; i < pieces; i++) {
      const br = this.breaking.find((b) => b.slot === i);
      const full = i < s.hp || (br && br.t < 0.1);
      const px = x0 + 1 + i * 11;
      for (let row = 0; row < H; row++) {
        // El borde de afuera del trapecio se inclina (más ancho abajo)
        const inset = Math.max(0, Math.round((H - 1 - row) * 0.25));
        const left = i === 0 ? inset : 0;
        const right = i === pieces - 1 ? inset : 0;
        const w = 10 - left - right;
        let c;
        if (!full) c = row === 0 || row === H - 1 ? '#2A1608' : '#1A0E06';
        else if (row === 0 || row === H - 1) c = TAPITA_PAL.o;
        else if (row === 1) c = TAPITA_PAL.l;
        else if (row >= H - 3) c = TAPITA_PAL.s;
        else c = TAPITA_PAL.b;
        ctx.fillStyle = c;
        ctx.fillRect(px + left, y0 + 1 + row, w, 1);
      }
      if (full) {
        ctx.fillStyle = TAPITA_PAL.c;
        ctx.fillRect(px + 3 + ((i * 5) % 4), y0 + 6 + ((i * 3) % 4), 1, 1);
      } else {
        // Grieta
        ctx.fillStyle = TAPITA_PAL.o;
        ctx.fillRect(px + 4, y0 + 3, 1, 3);
        ctx.fillRect(px + 5, y0 + 6, 1, 3);
        ctx.fillRect(px + 4, y0 + 9, 1, 3);
        if (br) this.drawCrumbs(ctx, px + 5, y0 + 7, br.t, [TAPITA_PAL.b, TAPITA_PAL.c]);
      }
    }
  }

  drawCrumbs(ctx, x, y, t, colors) {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = colors[k % colors.length];
      ctx.fillRect(Math.round(x + (k - 1.5) * 3 * t * 6), Math.round(y + t * t * 60 + k), 2, 2);
    }
  }

  // ---------- Habilidades (debajo de la vida) ----------
  drawAbilities(ctx, s) {
    const y = 22;
    if (s.mine === 'choco') {
      // Batería de la laptop
      if (s.laptop) {
        const b = s.laptop;
        ctx.fillStyle = '#0B0D16';
        ctx.fillRect(4, y, 22, 6);
        ctx.fillStyle = b.locked ? UI.red : b.active ? UI.cyan : '#2A6F8A';
        ctx.fillRect(5, y + 1, Math.round(20 * b.battery01), 4);
        drawText(ctx, T.debug, 29, y - 1, { color: UI.textDim, shadow: false });
      }
      // Escudo
      if (s.shield01 !== undefined) {
        const k = s.shield01;
        ctx.fillStyle = '#0B0D16';
        ctx.fillRect(4, y + 8, 22, 4);
        ctx.fillStyle = k >= 1 ? UI.green : '#2A5A3A';
        ctx.fillRect(5, y + 9, Math.round(20 * k), 2);
      }
      let row = y + 15;
      // Calor (solo en zonas calientes): naranja al sol, celeste en la sombra
      if (s.heat) {
        const h = s.heat;
        ctx.fillStyle = '#0B0D16';
        ctx.fillRect(4, row, 22, 6);
        ctx.fillStyle = h.drip && Math.floor(this.t * 8) % 2 ? '#FF5A5A' : h.shade ? '#8AD8FF' : '#FF8A3A';
        ctx.fillRect(5, row + 1, Math.round(20 * Math.min(1, h.v01)), 4);
        drawText(ctx, T.heat, 29, row - 1, { color: h.shade ? '#8AD8FF' : '#FF8A3A', shadow: UI.shadow });
        row += 9;
      }
      // Oxígeno (solo con la cabeza debajo del agua): 5 burbujas
      if (s.oxygen01 !== undefined) {
        const n = 5;
        const warn = s.oxygen01 < 0.3;
        for (let i = 0; i < n; i++) {
          const fill = s.oxygen01 * n - i;
          ctx.fillStyle = '#0A2A5A';
          ctx.fillRect(5 + i * 5, row, 4, 4);
          if (fill > 0) {
            ctx.fillStyle = warn && Math.floor(this.t * 6) % 2 ? '#FF5A5A' : '#8AD8FF';
            ctx.fillRect(6 + i * 5, row + 1, 2, 2);
          }
        }
        drawText(ctx, T.air, 31, row - 2, { color: '#8AD8FF', shadow: UI.shadow });
      }
      return;
    }
    // Tapita: melcochas disponibles (2 bolitas) y estado de plantada
    for (let i = 0; i < s.melMax; i++) {
      const x = 5 + i * 8;
      const on = i < s.melAvail;
      ctx.fillStyle = MELCOCHA.outline;
      ctx.fillRect(x - 1, y, 7, 7);
      ctx.fillStyle = on ? MELCOCHA.ball : '#3A2410';
      ctx.fillRect(x, y + 1, 5, 5);
      if (on) {
        ctx.fillStyle = MELCOCHA.shine;
        ctx.fillRect(x + 1, y + 2, 1, 1);
      }
    }
    if (s.planted) drawText(ctx, T.planted, 22, y - 1, { color: COOP_COLORS.tapita, shadow: UI.shadow });
    else if (s.umbrella) drawText(ctx, T.umbrella, 22, y - 1, { color: '#C4C77A', shadow: UI.shadow });
  }

  // ---------- Compañero ----------
  drawPartner(ctx, p) {
    const w = 82;
    const x = SCREEN.W - w - 3;
    const y = 3;
    const color = p.kind === 'tapita' ? COOP_COLORS.tapita : COOP_COLORS.choco;
    ctx.fillStyle = 'rgba(7,7,12,0.6)';
    ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 2, 20);
    drawText(ctx, TEXTS.coop.chars[p.kind], x + 5, y + 2, { color, bold: true, shadow: false });
    // Vida en chico (o el estado, si está en el menú, desconectado o reapareciendo)
    const status = p.status ? T.status[p.status] : null;
    if (status) {
      if (Math.floor(this.t * 3) % 3 !== 0) drawText(ctx, status, x + 5, y + 11, { color: UI.yellow, shadow: false });
    } else {
      for (let i = 0; i < p.maxHp; i++) {
        ctx.fillStyle = i < p.hp ? color : '#1A1A28';
        ctx.fillRect(x + 5 + i * 6, y + 13, 5, 4);
      }
    }
    // Ping: puntito de color; el número solo en rojo
    const q = pingQuality(p.ping);
    const dot = q === 'good' ? UI.green : q === 'ok' ? UI.yellow : q === 'bad' ? UI.red : UI.panelBorder;
    ctx.fillStyle = dot;
    ctx.fillRect(x + w - 6, y + 4, 3, 3);
    if (q === 'bad') drawText(ctx, `${Math.round(p.ping)}`, x + w - 8, y + 2, { align: 'right', color: UI.red, shadow: false });
  }

  drawCount(ctx, c) {
    const pulse = this.countPulse > 0 ? 1 : 0;
    const x = SCREEN.W - 6;
    const y = SCREEN.H - 12 - pulse;
    const text = `${c.n}`;
    drawText(ctx, text, x, y, { align: 'right', color: c.kind === 'crystals' ? TAPITA_PAL.c : UI.green });
    const ix = x - text.length * 6 - 8;
    if (c.kind === 'crystals') {
      ctx.fillStyle = TAPITA_PAL.o;
      ctx.fillRect(ix, y + 1, 5, 6);
      ctx.fillStyle = TAPITA_PAL.c;
      ctx.fillRect(ix + 1, y + 2, 3, 4);
      ctx.fillStyle = TAPITA_PAL.C;
      ctx.fillRect(ix + 1, y + 2, 1, 1);
    } else {
      ctx.fillStyle = UI.green;
      ctx.fillRect(ix, y + 2, 5, 5);
      ctx.fillStyle = '#E8FFF0';
      ctx.fillRect(ix + 1, y + 3, 1, 1);
    }
  }
}
