// Sala de pruebas blanca del Modo Sincronizado (prólogo cooperativo y sala de elementos) —
// docs/coop/06_arte_audio_coop.md: blanco hueso, cuadrícula gris clara, acentos cian y ámbar.
// Todo se dibuja con rectángulos (sin imágenes). Los tiles se dibujan según sus vecinos.
import { SCREEN } from '../../config/balance.js';
import { T } from '../../systems/tilemap.js';
import { COOP } from '../palettes.js';

const TS = SCREEN.TILE;

export const LAB = {
  bg: '#F4F1EA',
  grid: '#E2DED3',
  gridBig: '#D3CEC1',
  fill: '#E6E1D5',
  fillDark: '#D6D0C2',
  edge: '#FFFFFF',
  line: '#A8A293',
  outline: '#6E6A60',
  shadow: '#C4BEB0',
  // Bloque de azúcar agrietado
  sugar: '#D99A3E',
  sugarLight: '#F2C46B',
  sugarDark: '#9C5420',
  // Plancha caliente
  plate: '#3A2E2A',
  plateHot: '#FF6A2A',
  plateGlow: '#FFB13B',
};

// Fondo: blanco hueso con la cuadrícula en dos escalas (parallax suave) y rótulos de prueba
export function drawLabBackground(ctx, camX, camY, time, label = null) {
  ctx.fillStyle = LAB.bg;
  ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
  const px = camX * 0.5;
  const py = camY * 0.5;
  ctx.fillStyle = LAB.grid;
  for (let x = -(Math.floor(px) % 16); x < SCREEN.W; x += 16) ctx.fillRect(x, 0, 1, SCREEN.H);
  for (let y = -(Math.floor(py) % 16); y < SCREEN.H; y += 16) ctx.fillRect(0, y, SCREEN.W, 1);
  ctx.fillStyle = LAB.gridBig;
  for (let x = -(Math.floor(px) % 64); x < SCREEN.W; x += 64) ctx.fillRect(x, 0, 1, SCREEN.H);
  for (let y = -(Math.floor(py) % 64); y < SCREEN.H; y += 64) ctx.fillRect(0, y, SCREEN.W, 1);
  // Cruces de medida en las esquinas de la cuadrícula grande
  ctx.fillStyle = '#C8C2B4';
  for (let x = -(Math.floor(px) % 64); x < SCREEN.W; x += 64) {
    for (let y = -(Math.floor(py) % 64); y < SCREEN.H; y += 64) {
      ctx.fillRect(x - 2, y, 5, 1);
      ctx.fillRect(x, y - 2, 1, 5);
    }
  }
  if (label) label(Math.round(-px), Math.round(-py));
}

// Tiles visibles del mapa. ghostActive: la Vista Debug de Choco está prendida.
// Lo que dibuja la sala aparte (compuertas, cajas, agua) se salta aquí.
export function drawLabTiles(ctx, map, camX, camY, time, ghostActive) {
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(map.w - 1, Math.floor((camX + SCREEN.W) / TS));
  const y1 = Math.min(map.h - 1, Math.floor((camY + SCREEN.H) / TS));
  const plain = (x, y) => {
    const ch = map.charAt(x, y);
    return map.typeAt(x, y) === T.SOLID && ch !== '|' && ch !== '%' && ch !== '&';
  };
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const type = map.typeAt(tx, ty);
      const ch = map.charAt(tx, ty);
      const px = Math.round(tx * TS - camX);
      const py = Math.round(ty * TS - camY);
      if (type === T.SOLID) {
        if (ch === '|' || ch === '%' || ch === '&') continue;
        if (ch === 'u') drawSugar(ctx, px, py, tx, ty, time);
        else if (ch === 'h') drawPlate(ctx, px, py, tx, time);
        else drawSolid(ctx, px, py, tx, ty, plain);
      } else if (type === T.ONEWAY) {
        ctx.fillStyle = LAB.outline;
        ctx.fillRect(px, py, TS, 5);
        ctx.fillStyle = LAB.fill;
        ctx.fillRect(px, py + 1, TS, 3);
        ctx.fillStyle = LAB.edge;
        ctx.fillRect(px, py + 1, TS, 1);
        ctx.fillStyle = (tx & 1) === 0 ? COOP.choco : COOP.tapita;
        ctx.fillRect(px + 6, py + 2, 4, 1);
      } else if (type === T.SPIKES) {
        ctx.fillStyle = LAB.outline;
        for (let i = 0; i < 4; i++) {
          const sx = px + i * 4;
          ctx.fillRect(sx + 1, py + 10, 2, 6);
          ctx.fillRect(sx, py + 13, 4, 3);
        }
        ctx.fillStyle = COOP.both;
        for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 4 + 1, py + 9, 2, 2);
      } else if (type === T.GHOST) {
        drawGhost(ctx, px, py, tx, time, ghostActive);
      }
    }
  }
}

function drawSolid(ctx, px, py, tx, ty, solid) {
  ctx.fillStyle = LAB.fill;
  ctx.fillRect(px, py, TS, TS);
  // Cuadrícula fina dentro del bloque
  ctx.fillStyle = LAB.fillDark;
  if ((tx + ty) % 2 === 0) ctx.fillRect(px + 2, py + 2, 2, 2);
  ctx.fillRect(px + 8, py, 1, TS);
  ctx.fillRect(px, py + 8, TS, 1);
  // Bordes expuestos: arriba blanco con una línea de color, a los lados y abajo contorno
  const up = !solid(tx, ty - 1);
  if (up) {
    ctx.fillStyle = LAB.outline;
    ctx.fillRect(px, py, TS, 1);
    ctx.fillStyle = LAB.edge;
    ctx.fillRect(px, py + 1, TS, 2);
    ctx.fillStyle = tx % 4 < 2 ? COOP.choco : COOP.tapita;
    ctx.fillRect(px + 2, py + 3, TS - 4, 1);
  }
  ctx.fillStyle = LAB.outline;
  if (!solid(tx - 1, ty)) ctx.fillRect(px, py, 1, TS);
  if (!solid(tx + 1, ty)) ctx.fillRect(px + TS - 1, py, 1, TS);
  if (!solid(tx, ty + 1)) {
    ctx.fillRect(px, py + TS - 1, TS, 1);
    ctx.fillStyle = LAB.shadow;
    ctx.fillRect(px + 1, py + TS - 2, TS - 2, 1);
  }
}

// Bloque de azúcar agrietado: ámbar con cristales y grietas (se rompe con el martillazo)
function drawSugar(ctx, px, py, tx, ty, time) {
  ctx.fillStyle = LAB.sugarDark;
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = LAB.sugar;
  ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
  ctx.fillStyle = LAB.sugarLight;
  ctx.fillRect(px + 1, py + 1, TS - 2, 1);
  ctx.fillRect(px + 1, py + 1, 1, TS - 2);
  // Grietas
  ctx.fillStyle = LAB.sugarDark;
  ctx.fillRect(px + 4, py + 2, 1, 4);
  ctx.fillRect(px + 5, py + 6, 1, 3);
  ctx.fillRect(px + 6, py + 9, 3, 1);
  ctx.fillRect(px + 11, py + 4, 1, 5);
  ctx.fillRect(px + 10, py + 9, 1, 4);
  // Un cristal que brilla de vez en cuando
  const k = Math.floor(time * 3 + tx * 7 + ty * 3) % 9;
  ctx.fillStyle = k === 0 ? '#FFFFFF' : '#FFF1C2';
  ctx.fillRect(px + 8 + (tx % 3), py + 3 + (ty % 3), 1, 1);
}

// Plancha caliente: hierro oscuro con franjas al rojo vivo que laten
function drawPlate(ctx, px, py, tx, time) {
  ctx.fillStyle = LAB.plate;
  ctx.fillRect(px, py, TS, TS);
  const glow = 0.6 + 0.4 * Math.sin(time * 5 + tx);
  ctx.globalAlpha = glow;
  ctx.fillStyle = LAB.plateHot;
  ctx.fillRect(px, py, TS, 2);
  ctx.fillRect(px + 3, py + 5, 10, 1);
  ctx.fillRect(px + 3, py + 9, 10, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = LAB.plateGlow;
  ctx.fillRect(px + ((Math.floor(time * 8) + tx * 5) % 14), py, 2, 1);
  ctx.fillStyle = '#1A1210';
  ctx.fillRect(px, py + TS - 1, TS, 1);
}

// Plataforma fantasma: para Tapita (y para todos) siempre se ve el borde punteado cian; con la
// Vista Debug de Choco se rellena.
function drawGhost(ctx, px, py, tx, time, active) {
  if (active) {
    ctx.fillStyle = '#BFEFFF';
    ctx.fillRect(px, py, TS, TS);
    ctx.fillStyle = COOP.choco;
    ctx.fillRect(px, py, TS, 2);
    ctx.fillRect(px, py + TS - 1, TS, 1);
    ctx.fillRect(px, py, 1, TS);
    ctx.fillRect(px + TS - 1, py, 1, TS);
    return;
  }
  ctx.fillStyle = COOP.choco;
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 3 + tx);
  const off = Math.floor(time * 6) % 2;
  for (let i = off; i < TS; i += 2) {
    ctx.fillRect(px + i, py, 1, 1);
    ctx.fillRect(px + i, py + TS - 1, 1, 1);
    ctx.fillRect(px, py + i, 1, 1);
    ctx.fillRect(px + TS - 1, py + i, 1, 1);
  }
  ctx.globalAlpha = 1;
}
