// Flujo entre pantallas — docs/06_menus_ui.md
//   Presentación → Título → Menú principal → (Nueva partida → Ranura → Prólogo | Continuar → Mapa)
//   Mapa → Tarjeta de título → Nivel → Resultados → Mapa
//   Nivel → Pausa / Game Over
import { Session } from './session.js';
import { newGameData, completeLevel, recordAttempt, nextLevel } from './progress.js';
import { levelById } from '../data/levels.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { WorldMapScene } from '../scenes/WorldMapScene.js';
import { LevelTitleScene } from '../scenes/LevelTitleScene.js';
import { ResultsScene } from '../scenes/ResultsScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { ItemGetScene } from '../scenes/ItemGetScene.js';
import { CreditsScene } from '../scenes/CreditsScene.js';
import { TestRoomScene } from '../scenes/TestRoomScene.js';

export const Flow = {
  toTitle(game, { type = 'fade' } = {}) {
    game.changeScene(() => new TitleScene(game), { type });
  },

  toMainMenu(game) {
    game.changeScene(() => new MainMenuScene(game), { type: 'fade', duration: 0.2 });
  },

  toCredits(game) {
    game.changeScene(() => new CreditsScene(game), { type: 'fade' });
  },

  // Crea una partida nueva en la ranura y arranca (el prólogo llega en el Hito 3).
  newGame(game, slot) {
    const prologue = levelById(0);
    game.session = new Session(game, slot, newGameData({ prologueBuilt: prologue.built }));
    game.session.save();
    if (prologue.built) this.startLevel(game, 0);
    else this.toWorldMap(game, { focus: 1 });
  },

  continueGame(game, slot, data) {
    game.session = new Session(game, slot, data);
    this.toWorldMap(game, { focus: nextLevel(data) });
  },

  toWorldMap(game, { focus = null } = {}) {
    game.audio.playSong(SONG_TITULO);
    game.changeScene(() => new WorldMapScene(game, focus), { type: 'glitch' });
  },

  // Tarjeta de título y luego el nivel
  startLevel(game, id) {
    game.changeScene(() => new LevelTitleScene(game, id, () => this.enterLevel(game, id)), { type: 'fade' });
  },

  enterLevel(game, id) {
    game.changeScene(() => this.makeLevel(game, id), { type: 'iris' });
  },

  makeLevel(game, id) {
    // Todos los niveles se construyen en hitos siguientes; mientras tanto, la sala de pruebas.
    return new TestRoomScene(game, { levelId: id });
  },

  // stats: { time, deaths, bits, goldenY: [bool×3] }
  completeLevel(game, id, stats) {
    const s = game.session;
    let result = { newRecord: true, firstTime: true, rewards: { founder: null, item: null } };
    if (s) {
      result = completeLevel(s.data, id, stats);
      s.update(result.data);
    }
    const toResults = () => game.changeScene(() => new ResultsScene(game, id, stats, result), { type: 'fade' });
    // Objeto obtenido la primera vez (en los niveles reales lo entrega el fundador en el nivel)
    if (result.rewards.item) {
      game.changeScene(() => new ItemGetScene(game, result.rewards.item, toResults, { standalone: true }), { type: 'fade' });
    } else toResults();
  },

  gameOver(game, id, stats) {
    const s = game.session;
    if (s) s.update(recordAttempt(s.data, stats));
    game.changeScene(() => new GameOverScene(game, id), { type: 'fade', color: '#000' });
  },

  // Salir al mapa desde la pausa: se guardan las muertes y el tiempo del intento
  quitLevel(game, id, stats) {
    const s = game.session;
    if (s) {
      s.update(recordAttempt(s.data, stats));
      this.toWorldMap(game, { focus: id });
    } else this.toTitle(game);
  },
};
