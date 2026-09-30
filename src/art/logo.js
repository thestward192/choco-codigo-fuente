// Logo de CHC Studio (único archivo de imagen del juego). Solo para la presentación y los créditos.
// Es un logo vectorial, no pixel art: se dibuja con suavizado activado solo en ese dibujo.

const LOGO_URL = new URL('../../assets/logo_chc_studio.png', import.meta.url).href;
let img = null;
let ready = false;

export function loadLogo() {
  if (!img) {
    img = new Image();
    img.onload = () => (ready = true);
    img.onerror = () => (ready = false);
    img.src = LOGO_URL;
  }
  return img;
}

export function logoReady() {
  return ready;
}

// Dibuja el logo escalado para que mida `size` px de alto, centrado en (cx, cy).
export function drawLogo(ctx, cx, cy, size) {
  if (!ready) return false;
  const s = size / img.naturalHeight;
  const w = Math.round(img.naturalWidth * s);
  const h = Math.round(img.naturalHeight * s);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  ctx.restore();
  return true;
}
