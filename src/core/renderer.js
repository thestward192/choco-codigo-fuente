// Renderer: canvas interno de 320×180 escalado a un múltiplo entero, centrado con barras negras.
import { SCREEN } from '../config/balance.js';

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

// Escala entera más grande que cabe en la ventana (en píxeles físicos).
export function computeScale(availW, availH, fixed = 0) {
  const auto = Math.max(1, Math.floor(Math.min(availW / SCREEN.W, availH / SCREEN.H)));
  if (fixed > 0) return Math.min(fixed, auto);
  return auto;
}

export class Renderer {
  constructor(displayCanvas) {
    this.display = displayCanvas;
    this.dctx = displayCanvas.getContext('2d', { alpha: false });
    this.canvas = createCanvas(SCREEN.W, SCREEN.H);
    this.ctx = this.canvas.getContext('2d');
    this.snapCanvas = createCanvas(SCREEN.W, SCREEN.H);
    this.snapCtx = this.snapCanvas.getContext('2d');
    this.tintCanvases = new Map();
    this.fixedScale = 0; // 0 = automática
    this.scale = 1;
    this.crt = false;
    this.crtOverlay = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setFixedScale(s) {
    this.fixedScale = s;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const availW = Math.floor(window.innerWidth * dpr);
    const availH = Math.floor(window.innerHeight * dpr);
    this.scale = computeScale(availW, availH, this.fixedScale);
    const w = SCREEN.W * this.scale;
    const h = SCREEN.H * this.scale;
    this.display.width = w;
    this.display.height = h;
    // Tamaño CSS en píxeles lógicos para que cada píxel interno sea un bloque entero de píxeles físicos
    this.display.style.width = `${w / dpr}px`;
    this.display.style.height = `${h / dpr}px`;
    this.dctx.imageSmoothingEnabled = false;
    this.crtOverlay = null;
  }

  begin() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    return ctx;
  }

  // Copia del frame actual (para glitch y fondos de pausa).
  snapshot() {
    this.snapCtx.clearRect(0, 0, SCREEN.W, SCREEN.H);
    this.snapCtx.drawImage(this.canvas, 0, 0);
    return this.snapCanvas;
  }

  // Versión tintada de un canvas (silueta de color), con buffers reutilizados.
  tinted(src, color) {
    let c = this.tintCanvases.get(color);
    if (!c) {
      c = createCanvas(SCREEN.W, SCREEN.H);
      this.tintCanvases.set(color, c);
    }
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  present() {
    const d = this.dctx;
    d.imageSmoothingEnabled = false;
    d.drawImage(this.canvas, 0, 0, this.display.width, this.display.height);
    if (this.crt) this.drawCrt(d);
  }

  // Filtro CRT opcional: scanlines suaves + viñeta (horneado una vez por tamaño).
  drawCrt(d) {
    if (!this.crtOverlay) {
      const w = this.display.width;
      const h = this.display.height;
      const c = createCanvas(w, h);
      const x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,0.18)';
      const line = Math.max(1, Math.floor(this.scale / 3));
      for (let y = 0; y < h; y += this.scale) x.fillRect(0, y + this.scale - line, w, line);
      const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      this.crtOverlay = c;
    }
    d.drawImage(this.crtOverlay, 0, 0);
  }
}
