// Arranque de CHOCO: CÓDIGO FUENTE — CHC Studio. Creador: Stward Serrano.
import { Renderer } from './core/renderer.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { SaveSystem } from './core/save.js';
import { Game } from './core/game.js';
import { BootScene } from './scenes/BootScene.js';
import { SplashScene } from './scenes/SplashScene.js';
import { Flow } from './game/flow.js';

async function start() {
  const canvas = document.getElementById('screen');
  const renderer = new Renderer(canvas);
  const input = new Input(window);
  const audio = new AudioEngine();
  const save = new SaveSystem();

  // Herramientas de depuración: solo en desarrollo y con ?debug=1
  let debug = null;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1') {
    const { Debug } = await import('./core/debug.js');
    debug = new Debug();
  }

  const game = new Game({ renderer, input, audio, save, debug });
  game.flow = Flow;
  if (import.meta.env.DEV) window.__game = game;
  canvas.focus();

  // Flujo normal: Presioná cualquier tecla → Presentación → Título.
  let next = () => new SplashScene(game);
  // Atajos de desarrollo (?scene=…): solo existen con npm run dev, el build no los incluye.
  if (import.meta.env.DEV) {
    const { devStart } = await import('./dev/shortcuts.js');
    next = (await devStart(game, new URLSearchParams(location.search).get('scene'))) || next;
  }
  game.start(new BootScene(game, next));
}

start();
