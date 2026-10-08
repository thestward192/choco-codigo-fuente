// Flujo entre pantallas — docs/06_menus_ui.md y docs/coop/05_menus_coop.md
//   Presentación → Título → Selección de modo
//     Modo solo → Menú principal → (Nueva partida → Ranura → Prólogo | Continuar → Mapa)
//     Cooperativo → Menú cooperativo → (Crear sala | Unirse) → Sala de espera
//   Mapa → Tarjeta de título → Nivel → Resultados → Mapa
//   Nivel → Pausa / Game Over
import { Session } from './session.js';
import { newGameData, completeLevel, recordAttempt, nextLevel, isCompleted, clearCheckpoint } from './progress.js';
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
import { RoomScene } from '../levels/level0_prologo/RoomScene.js';
import { LoadingScene } from '../levels/level0_prologo/LoadingScene.js';
import { Level1Scene } from '../levels/level1_cartucho/Level1Scene.js';
import { Level2Scene } from '../levels/level2_una/Level2Scene.js';
import { Level3Scene } from '../levels/level3_novacomp/Level3Scene.js';
import { Level4Scene } from '../levels/level4_santacruz/Level4Scene.js';
import { Level5Scene } from '../levels/level5_codigo/Level5Scene.js';
import { EndingScene } from '../scenes/EndingScene.js';
import { ModeSelectScene } from '../scenes/ModeSelectScene.js';
import { CoopMenuScene } from '../coop/CoopMenuScene.js';
import { JoinScene } from '../coop/JoinScene.js';
import { LobbyScene } from '../coop/LobbyScene.js';

export const Flow = {
  toTitle(game, { type = 'fade' } = {}) {
    game.changeScene(() => new TitleScene(game), { type });
  },

  toMainMenu(game) {
    game.changeScene(() => new MainMenuScene(game), { type: 'fade', duration: 0.2 });
  },

  toModeSelect(game) {
    game.changeScene(() => new ModeSelectScene(game), { type: 'fade', duration: 0.2 });
  },

  // ---------- Modo Sincronizado (cooperativo) ----------
  toCoopMenu(game, { message = null } = {}) {
    game.changeScene(() => new CoopMenuScene(game, { message }), { type: 'fade', duration: 0.2 });
  },

  toCoopJoin(game) {
    game.changeScene(() => new JoinScene(game), { type: 'fade', duration: 0.2 });
  },

  toCoopLobby(game) {
    game.changeScene(() => new LobbyScene(game), { type: 'glitch' });
  },

  toCredits(game, opts = {}) {
    game.changeScene(() => new CreditsScene(game, opts), { type: 'fade' });
  },

  // Crea una partida nueva en la ranura y arranca el prólogo.
  newGame(game, slot) {
    const prologue = levelById(0);
    game.session = new Session(game, slot, newGameData({ prologueBuilt: prologue.built }));
    game.session.save();
    if (prologue.built) this.startLevel(game, 0);
    else this.toWorldMap(game, { focus: 1 });
  },

  // Continuar: si el prólogo quedó a medias, se vuelve a empezar; si no, al mapa.
  continueGame(game, slot, data) {
    game.session = new Session(game, slot, data);
    if (levelById(0).built && !isCompleted(data, 0)) this.startLevel(game, 0);
    else this.toWorldMap(game, { focus: nextLevel(data) });
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
    if (id === 0) return new RoomScene(game);
    if (id === 1) return new Level1Scene(game);
    if (id === 2) return new Level2Scene(game);
    if (id === 3) return new Level3Scene(game);
    if (id === 4) return new Level4Scene(game);
    if (id === 5) return new Level5Scene(game);
    // Los niveles que todavía no existen abren la sala de pruebas como reemplazo.
    return new TestRoomScene(game, { levelId: id });
  },

  // ---------- Prólogo ----------
  // Del cuarto a la Pantalla de Carga (después de la cinemática "La barra rota")
  toLoadingScreen(game, stats) {
    game.changeScene(() => new LoadingScene(game, { stats }), { type: 'fade', color: '#000', duration: 0.6 });
  },

  // Al cruzar el portal: se guarda el prólogo (con el Báculo) y sigue la tarjeta del nivel 1
  completePrologue(game, stats) {
    const s = game.session;
    if (s) s.update(completeLevel(s.data, 0, stats).data);
    this.startLevel(game, 1);
  },

  quitPrologue(game, stats) {
    const s = game.session;
    if (s) s.update(recordAttempt(s.data, stats));
    this.toTitle(game);
  },

  // stats: { time, deaths, bits, goldenY: [bool×3] }
  completeLevel(game, id, stats) {
    const s = game.session;
    let result = { newRecord: true, firstTime: true, rewards: { founder: null, item: null } };
    if (s) {
      result = completeLevel(s.data, id, stats);
      s.update(result.data);
    }
    // El nivel 5 termina el juego: cinemática final, epílogo, estadísticas y créditos
    if (id === 5) {
      game.changeScene(() => new EndingScene(game, { stats, result }), { type: 'fade', color: '#FFFFFF', duration: 0.8 });
      return;
    }
    const toResults = () => game.changeScene(() => new ResultsScene(game, id, stats, result), { type: 'fade' });
    // Objeto obtenido la primera vez (en los niveles reales lo entrega el fundador dentro del nivel)
    if (result.rewards.item && !levelById(id)?.built) {
      game.changeScene(() => new ItemGetScene(game, result.rewards.item, toResults, { standalone: true }), { type: 'fade' });
    } else toResults();
  },

  // keepCheckpoint: en el jefe final, el Game Over vuelve al checkpoint de antes del jefe
  gameOver(game, id, stats, { keepCheckpoint = false } = {}) {
    const s = game.session;
    if (s) {
      const d = recordAttempt(s.data, stats);
      s.update(keepCheckpoint ? d : clearCheckpoint(d));
    }
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
