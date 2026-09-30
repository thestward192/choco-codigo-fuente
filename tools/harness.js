// Arnés de pruebas manuales (solo desarrollo; no entra al build).
// Desde la consola del navegador:  const h = await import('/tools/harness.js'); await h.install();
// - Mueve el loop con un temporizador si requestAnimationFrame está en pausa (pestaña oculta).
// - Muestra un espejo ampliado del canvas interno arriba a la izquierda.
// - Ayudantes para presionar teclas y esperar escenas.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function press(code, ms = 60) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  await sleep(ms);
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  await sleep(40);
}

export function hold(code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  return () => window.dispatchEvent(new KeyboardEvent('keyup', { code }));
}

export function scenes() {
  return window.__game.scenes.map((s) => s.constructor.name);
}

export async function waitFor(name, timeout = 5000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    if (window.__game.top?.constructor.name === name && !window.__game.transitioning) return true;
    await sleep(50);
  }
  return false;
}

export async function install({ mirrorWidth = 520 } = {}) {
  while (!window.__game) await sleep(50);
  const g = window.__game;
  if (!window.__drive) {
    let lastRaf = performance.now();
    const raf = () => {
      lastRaf = performance.now();
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    // Solo empuja el loop si el navegador dejó de llamar a requestAnimationFrame
    window.__drive = setInterval(() => {
      // El panel de pruebas pierde el foco seguido: no dejar el juego en pausa automática
      if (g.suspended) g.unsuspend();
      if (performance.now() - lastRaf > 100) g.frameTick(performance.now());
    }, 16);
  }
  // En el panel de pruebas el foco va y viene: sin pausa automática durante el arnés
  g.suspend = () => {};
  g.unsuspend();
  if (g.debug) g.debug.overlay = false;
  let m = document.getElementById('__mirror');
  if (!m) {
    m = document.createElement('canvas');
    m.id = '__mirror';
    m.width = 320;
    m.height = 180;
    Object.assign(m.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${mirrorWidth}px`,
      height: `${Math.round((mirrorWidth * 180) / 320)}px`,
      imageRendering: 'pixelated',
      zIndex: 9,
    });
    document.body.appendChild(m);
    const mc = m.getContext('2d');
    const orig = g.renderer.present.bind(g.renderer);
    g.renderer.present = () => {
      orig();
      mc.drawImage(g.renderer.canvas, 0, 0);
    };
  }
  return g;
}

// Guarda el frame actual (320×180 escalado ×scale) en .snaps/<name>.png
export async function snap(name, scale = 3) {
  const g = window.__game;
  g.frameTick(performance.now());
  const src = g.renderer.canvas;
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height);
  await fetch(`/__snap?name=${encodeURIComponent(name)}`, { method: 'POST', body: c.toDataURL('image/png') });
  return name;
}

// Del arranque hasta el título (salta la presentación)
export async function toTitle() {
  await press('Space');
  await sleep(700);
  await press('Space');
  const ok = await waitFor('TitleScene');
  // El primer Enter del título solo salta la animación de entrada: esperarla
  await sleep(2400);
  return ok;
}

// Del arranque hasta el mapa de mundos (usa "Continuar"; requiere una partida guardada)
export async function toMap() {
  await toTitle();
  await press('Enter');
  await waitFor('MainMenuScene');
  await press('Enter');
  return waitFor('WorldMapScene');
}
