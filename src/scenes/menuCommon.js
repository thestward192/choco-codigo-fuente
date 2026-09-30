// Fondo compartido de título y menús: se conserva entre pantallas para que no "salte".
import { TitleBackground, buildLogo, LogoDrips } from '../art/title.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { chocoFrame, ANIMS, FRAME_W, FRAME_H } from '../art/choco.js';
import { fxRng } from '../core/rng.js';

export function backdrop(game) {
  if (!game.shared) game.shared = {};
  if (!game.shared.backdrop) {
    const logo = buildLogo('CHOCO');
    game.shared.backdrop = {
      bg: new TitleBackground(),
      logo: logo.canvas,
      drips: new LogoDrips(logo.drips),
      chocoT: 0,
      blinkIn: 2,
      blinkT: 0,
      glitchIn: 4,
      glitchT: 0,
    };
  }
  return game.shared.backdrop;
}

export function updateBackdrop(game, dt) {
  const b = backdrop(game);
  b.bg.update(dt);
  b.drips.update(dt);
  b.chocoT += dt;
  b.blinkIn -= dt;
  if (b.blinkIn <= 0) {
    b.blinkT = 0.12;
    b.blinkIn = fxRng.range(2, 4.5);
  }
  if (b.blinkT > 0) b.blinkT -= dt;
  // Glitch magenta ocasional: N.U.L.L. acecha
  b.glitchIn -= dt;
  if (b.glitchIn <= 0) {
    b.glitchT = 0.25;
    b.glitchIn = fxRng.range(4, 8);
  }
  if (b.glitchT > 0) b.glitchT -= dt;
}

// Dibuja fondo + logo (en logoY) + Choco en idle en primer plano.
export function drawBackdrop(ctx, game, { logoY = 14, logoScale = 1, choco = true, dim = 0 } = {}) {
  const b = backdrop(game);
  b.bg.draw(ctx);
  if (choco) {
    const anim = ANIMS.idle;
    const f = anim.frames[Math.floor(b.chocoT * anim.fps) % anim.frames.length];
    const spr = chocoFrame(f, b.blinkT > 0 ? 'blink' : 'normal', true);
    ctx.drawImage(spr.normal, 18, SCREEN.H - FRAME_H * 2 - 3, FRAME_W * 2, FRAME_H * 2);
  }
  if (dim > 0) {
    ctx.globalAlpha = dim;
    ctx.fillStyle = '#07060F';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
  }
  if (logoY !== null) drawTitleLogo(ctx, game, logoY, logoScale);
}

export function drawTitleLogo(ctx, game, y, scale = 1) {
  const b = backdrop(game);
  const w = b.logo.width * scale;
  const h = b.logo.height * scale;
  const x = Math.round((SCREEN.W - w) / 2);
  y = Math.round(y);
  if (b.glitchT > 0 && game.options.intenseGlitch) {
    // Copias desplazadas en magenta y cian
    ctx.globalAlpha = 0.6;
    ctx.drawImage(b.logo, x - 2, y, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - 2, y + fxRng.int(0, h - 4), w + 4, fxRng.int(2, 5));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(b.logo, x, y, w, h);
  if (scale === 1) b.drips.draw(ctx, x, y);
  return { x, y, w, h };
}

export function drawVersion(ctx, text) {
  drawText(ctx, text, SCREEN.W - 3, SCREEN.H - 10, { align: 'right', color: '#3A3A55', shadow: false });
}
