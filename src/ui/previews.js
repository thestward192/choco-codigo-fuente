// Vistas previas animadas de cada nivel para el mapa de mundos (dibujo procedural simple).
import { fxRng } from '../core/rng.js';

function clip(ctx, x, y, w, h, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

const PREVIEWS = {
  // Mundo Cartucho: cielo, colinas, bloque Y que rebota
  1(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#5EC8FF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#F4F1EA';
    const cx = x + ((t * 8) % (w + 30)) - 20;
    ctx.fillRect(Math.round(cx), y + 8, 14, 4);
    ctx.fillRect(Math.round(cx) + 3, y + 5, 8, 3);
    ctx.fillStyle = '#3E9A3E';
    for (let i = 0; i < w; i++) {
      const hh = 10 + Math.round(Math.sin((i + t * 4) / 9) * 4);
      ctx.fillRect(x + i, y + h - 12 - hh, 1, hh);
    }
    ctx.fillStyle = '#4CBB4C';
    ctx.fillRect(x, y + h - 12, w, 3);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x, y + h - 9, w, 9);
    const by = y + 14 - Math.round(Math.abs(Math.sin(t * 3)) * 4);
    ctx.fillStyle = '#B8902A';
    ctx.fillRect(x + w / 2 - 6, by, 12, 12);
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(x + w / 2 - 5, by + 1, 10, 10);
    ctx.fillStyle = '#6B4A10';
    ctx.fillRect(x + w / 2 - 3, by + 3, 1, 2);
    ctx.fillRect(x + w / 2 + 2, by + 3, 1, 2);
    ctx.fillRect(x + w / 2 - 2, by + 5, 1, 1);
    ctx.fillRect(x + w / 2 + 1, by + 5, 1, 1);
    ctx.fillRect(x + w / 2 - 1, by + 6, 2, 3);
  },
  // UNA: paredes cálidas, pizarra y pasillo
  2(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#E9DCC3';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8C2F39';
    ctx.fillRect(x, y + h - 22, w, 3);
    ctx.fillStyle = '#6B4E3D';
    ctx.fillRect(x, y + h - 14, w, 14);
    for (let i = 0; i < w; i += 8) {
      ctx.fillStyle = '#5A3F30';
      ctx.fillRect(x + i, y + h - 14, 1, 14);
    }
    ctx.fillStyle = '#2D5A3D';
    ctx.fillRect(x + 12, y + 6, 44, 22);
    ctx.fillStyle = '#6B4E3D';
    ctx.fillRect(x + 11, y + 28, 46, 2);
    ctx.fillStyle = '#E8FFF0';
    const n = Math.floor(t * 6) % 30;
    for (let i = 0; i < Math.min(n, 24); i++) ctx.fillRect(x + 15 + i * 1.5, y + 10 + (i % 3) * 5, 1, 1);
    ctx.fillStyle = '#C8B89C';
    ctx.fillRect(x + w - 34, y + 6, 20, 26);
    ctx.fillStyle = '#8C2F39';
    ctx.fillRect(x + w - 32, y + 8, 16, 4);
  },
  // Novacomp: oficina de noche con un cono de visión que barre
  3(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#1B2230';
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#3A4A63';
      ctx.fillRect(x + 8 + i * 26, y + h - 20, 20, 8);
      ctx.fillStyle = '#8FB3D9';
      ctx.fillRect(x + 12 + i * 26, y + h - 26, 6, 5);
      ctx.fillRect(x + 19 + i * 26, y + h - 26, 6, 5);
    }
    const a = Math.sin(t * 1.2) * 0.7;
    const ox = x + w / 2;
    const oy = y + 6;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFD23F';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.sin(a - 0.4) * 60, oy + Math.cos(a - 0.4) * 60);
    ctx.lineTo(ox + Math.sin(a + 0.4) * 60, oy + Math.cos(a + 0.4) * 60);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5A5A6E';
    ctx.fillRect(ox - 3, oy - 3, 6, 5);
    if (Math.floor(t * 2) % 2) {
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x + w - 8, y + 4, 4, 4);
    }
  },
  // Santa Cruz: sol, casas de adobe y ondas de calor
  4(ctx, x, y, w, h, t) {
    const bands = ['#FFB347', '#FF9E4A', '#FF8A52', '#FF6B8A'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y + i * Math.ceil(h / 4), w, Math.ceil(h / 4));
    });
    ctx.fillStyle = '#FFF2B0';
    ctx.fillRect(x + w - 30, y + 6, 14, 14);
    ctx.fillRect(x + w - 32, y + 9, 18, 8);
    for (let i = 0; i < 4; i++) {
      const hx = x + 6 + i * 28;
      const wob = Math.round(Math.sin(t * 5 + i) * 1);
      ctx.fillStyle = '#F5E6C8';
      ctx.fillRect(hx + wob, y + h - 22, 22, 16);
      ctx.fillStyle = '#B5532E';
      ctx.fillRect(hx - 2 + wob, y + h - 26, 26, 5);
      ctx.fillStyle = '#6B4E3D';
      ctx.fillRect(hx + 8 + wob, y + h - 14, 6, 8);
    }
    ctx.fillStyle = '#B5532E';
    ctx.fillRect(x, y + h - 6, w, 6);
    // Banderines
    for (let i = 0; i < w; i += 6) {
      ctx.fillStyle = ['#E0343F', '#FFD23F', '#4FD1C5', '#6FE08A'][(i / 6) % 4];
      ctx.fillRect(x + i, y + 24 + Math.round(Math.sin(i / 10 + t * 2)), 3, 3);
    }
  },
  // Código Puro: lluvia de código y el ojo de N.U.L.L.
  5(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#07050D';
    ctx.fillRect(x, y, w, h);
    for (let c = 0; c < w; c += 5) {
      const speed = 20 + ((c * 7) % 30);
      const yy = ((t * speed + c * 13) % (h + 20)) - 10;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k === 0 ? '#DFFAFF' : (c / 5) % 3 === 0 ? '#FF2E88' : '#2A6F8A';
        ctx.fillRect(x + c, Math.round(y + yy - k * 4), 2, 2);
      }
    }
    const ex = x + w / 2;
    const ey = y + h / 2;
    ctx.fillStyle = '#2A1446';
    ctx.fillRect(ex - 14, ey - 9, 28, 18);
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(ex - 6, ey - 6, 12, 12);
    ctx.fillStyle = '#07050D';
    ctx.fillRect(ex - 4, ey - 4, 8, 8);
    ctx.fillStyle = '#FF2E88';
    for (let i = -5; i <= 5; i++) ctx.fillRect(Math.round(ex + i), Math.round(ey - i), 1, 1);
  },
};

export function drawPreview(ctx, id, x, y, w, h, t, locked) {
  clip(ctx, x, y, w, h, () => {
    if (locked) {
      ctx.fillStyle = '#0B0B12';
      ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = fxRng.pick(['#1A1A26', '#2A2A38', '#101018']);
        ctx.fillRect(x + fxRng.int(0, w), y + fxRng.int(0, h), fxRng.int(1, 6), 1);
      }
      return;
    }
    (PREVIEWS[id] || PREVIEWS[5])(ctx, x, y, w, h, t);
  });
}
