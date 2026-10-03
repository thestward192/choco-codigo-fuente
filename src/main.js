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
  // Atajos de desarrollo: ?scene=room (sala de pruebas), ?scene=tech (prueba técnica), ?scene=dev (menú de hitos),
  // ?scene=prologue (cuarto), ?scene=loading (Pantalla de Carga), ?scene=level1 (Mundo Cartucho),
  // ?scene=boss1 (directo al Guardián del Slot), ?scene=level2 (La UNA), ?scene=auditorio (con los
  // 3 carnés, frente a MC Stack Overflow), ?scene=battle (batallas de prueba), ?scene=rap,
  // ?scene=level3 (Novacomp), ?scene=terraza (rescate de Hezron), ?scene=deadline (jefe),
  // ?scene=escudo (práctica del Escudo Firewall)
  let next = () => new SplashScene(game);
  const direct = import.meta.env.DEV ? new URLSearchParams(location.search).get('scene') : null;
  if (direct === 'room') {
    const { TestRoomScene } = await import('./scenes/TestRoomScene.js');
    next = () => new TestRoomScene(game);
  } else if (direct === 'prologue' || direct === 'loading') {
    const mod = direct === 'prologue' ? await import('./levels/level0_prologo/RoomScene.js') : await import('./levels/level0_prologo/LoadingScene.js');
    next = () => (direct === 'prologue' ? new mod.RoomScene(game) : new mod.LoadingScene(game));
  } else if (direct === 'level1' || direct === 'boss1') {
    const { Level1Scene } = await import('./levels/level1_cartucho/Level1Scene.js');
    next = () => new Level1Scene(game, { start: direct === 'boss1' ? 'arena' : null });
  } else if (direct === 'level2' || direct === 'auditorio') {
    const { Level2Scene } = await import('./levels/level2_una/Level2Scene.js');
    next = () => new Level2Scene(game, { start: direct === 'auditorio' ? 'auditorio' : null });
  } else if (['level3', 'terraza', 'deadline', 'escudo'].includes(direct)) {
    const { Level3Scene } = await import('./levels/level3_novacomp/Level3Scene.js');
    next = () => new Level3Scene(game, { start: direct === 'level3' ? null : direct });
  } else if (direct === 'battle' || direct === 'rap') {
    const { DevBattleScene } = await import('./scenes/DevBattleScene.js');
    next = () => new DevBattleScene(game, direct);
  } else if (direct === 'dev') {
    const { DevMenuScene } = await import('./scenes/DevMenuScene.js');
    next = () => new DevMenuScene(game);
  } else if (direct === 'tech') {
    const { TechTestScene } = await import('./scenes/TechTestScene.js');
    next = () => new TechTestScene(game);
  }
  game.start(new BootScene(game, next));
}

start();
