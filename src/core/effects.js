// Efectos de pantalla: sacudida (trauma), hit-stop, flash y glitch.
import { EFFECTS, SCREEN } from '../config/balance.js';
import { fxRng } from './rng.js';

export class Effects {
  constructor() {
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.hitstopFrames = 0;
    this.flashColor = null;
    this.flashFrames = 0;
    this.flashTotal = 0;
    this.glitchTime = 0;
    this.glitchIntensity = 0;
    this.shakeEnabled = true;
    this.intenseGlitch = true;
  }

  // Sacudida proporcional al impacto: amount 0..1 se suma al trauma.
  shake(amount) {
    if (!this.shakeEnabled) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Congela la simulación N frames (se implementa en el loop del juego).
  hitstop(frames) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  flash(color = '#ffffff', frames = 2) {
    this.flashColor = color;
    this.flashFrames = frames;
    this.flashTotal = frames;
  }

  glitch(duration = 0.3, intensity = 1) {
    this.glitchTime = Math.max(this.glitchTime, duration);
    this.glitchIntensity = Math.max(this.glitchIntensity, intensity);
  }

  // Se llama una vez por paso fijo (incluso durante el hit-stop).
  update(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - EFFECTS.SHAKE_DECAY * dt);
      const mag = EFFECTS.SHAKE_MAX_PX * this.trauma * this.trauma;
      this.shakeX = Math.round((fxRng.next() * 2 - 1) * mag);
      this.shakeY = Math.round((fxRng.next() * 2 - 1) * mag);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    if (this.flashFrames > 0) this.flashFrames--;
    if (this.glitchTime > 0) {
      this.glitchTime -= dt;
      if (this.glitchTime <= 0) this.glitchIntensity = 0;
    }
  }

  // Dibuja flash y glitch sobre el frame final (después de la escena).
  drawOverlay(ctx, renderer) {
    if (this.flashFrames > 0 && this.flashColor) {
      ctx.globalAlpha = Math.min(1, (this.flashFrames / this.flashTotal) * 0.85);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
    if (this.glitchTime > 0) {
      drawGlitch(ctx, renderer, this.intenseGlitch ? this.glitchIntensity : this.glitchIntensity * 0.35);
    }
  }
}

// Glitch con drawImage de franjas (sin manipular píxeles): desplaza bandas horizontales,
// agrega aberración cromática y bloques de color.
export function drawGlitch(ctx, renderer, intensity = 1) {
  const buf = renderer.snapshot();
  const R = fxRng;
  const bands = Math.round(3 + intensity * 6);
  for (let i = 0; i < bands; i++) {
    const y = R.int(0, SCREEN.H - 4);
    const h = R.int(2, 10);
    const dx = Math.round((R.next() * 2 - 1) * 14 * intensity);
    ctx.drawImage(buf, 0, y, SCREEN.W, h, dx, y, SCREEN.W, h);
  }
  // Aberración cromática: copias tintadas desplazadas
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 * intensity;
  const off = Math.max(1, Math.round(2 * intensity));
  ctx.drawImage(renderer.tinted(buf, '#ff0044'), -off, 0);
  ctx.drawImage(renderer.tinted(buf, '#00e5ff'), off, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const blocks = Math.round(intensity * 5);
  for (let i = 0; i < blocks; i++) {
    ctx.fillStyle = R.pick(['#FF2E88', '#43D9FF', '#F4F1EA', '#0B0610']);
    ctx.fillRect(R.int(0, SCREEN.W), R.int(0, SCREEN.H), R.int(4, 24), R.int(1, 4));
  }
}
