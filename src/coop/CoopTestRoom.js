// Sala de pruebas cooperativa (Hito 10) — docs/coop/08_plan_coop.md
// Para afinar a Choco y a Tapita juntos: alturas de salto, montarse, chimenea de salto de pared,
// túnel bajo, enemigos con el mazo y el martillazo, escalones de melcocha, lazo y puente fantasma.
// Termina cuando los dos llegan a la salida (vuelven a la sala de espera).
import { SCREEN } from '../config/balance.js';
import { Tilemap } from '../systems/tilemap.js';
import { aabbOverlap } from '../systems/physics.js';
import { Byteling } from '../entities/enemies/byteling.js';
import { drawLoadingTiles, drawLoadingBackground } from '../art/tiles/loading.js';
import { drawLassoNode } from '../art/santacruz.js';
import { drawText } from '../art/font.js';
import { COOP as COOP_COLORS } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { SONG_PRUEBA } from '../audio/songs/prueba.js';
import { fxRng } from '../core/rng.js';
import { buildCoopTestRoom, COOP_SIGNS } from './maps/testroom.js';
import { CoopLevel } from './CoopLevel.js';

const TS = SCREEN.TILE;
const T = TEXTS.coop.room;

export class CoopTestRoom extends CoopLevel {
  buildRoom() {
    this.setMap(new Tilemap(buildCoopTestRoom()));
    const m = this.map;
    const foot = (tx, ty) => ({ x: tx * TS + 8, y: (ty + 1) * TS });
    // Carteles (checkpoints de los dos), en orden de izquierda a derecha
    for (const [ch, key] of Object.entries(COOP_SIGNS)) {
      for (const { tx, ty } of m.find(ch)) {
        const f = foot(tx, ty);
        this.addSign(f.x, f.y, T.signs[key], Number(ch));
      }
    }
    this.signs.sort((a, b) => a.x - b.x);
    const P = m.find('P')[0];
    const p = m.find('p')[0];
    this.spawns = { choco: foot(P.tx, P.ty), tapita: foot(p.tx, p.ty) };
    const first = this.signs[0];
    this.checkpoint = { x: first.x, y: first.y, id: first.id, start: true };
    this.lassoNodes = m.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8, hooked: 0 }));
    for (const { tx, ty } of m.find('$')) this.addPickup('bit', tx * TS + 8, ty * TS + 8);
    for (const { tx, ty } of m.find('*')) this.addPickup('crystal', tx * TS + 8, ty * TS + 8);
    const ex = m.find('X')[0];
    this.exitZone = { x: ex.tx * TS - 8, y: ex.ty * TS - 16, w: 32, h: 32 };
    this.buildEntities();
  }

  // Al empezar, cada uno aparece en su lugar; después, junto al último checkpoint
  spawnFor(kind) {
    if (this.checkpoint?.start) return [this.spawns[kind].x, this.spawns[kind].y];
    return super.spawnFor(kind);
  }

  buildEntities() {
    for (const { tx, ty } of this.map.find('b')) this.addEnemy(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: true }));
  }

  enter() {
    this.game.audio.playSong(SONG_PRUEBA);
  }

  levelUpdate(dt) {
    for (const n of this.lassoNodes) if (n.hooked > 0) n.hooked -= dt;
    // Salida: los dos adentro (lo decide el anfitrión)
    const z = this.exitZone;
    const me = this.player.alive && aabbOverlap(this.player.body, z);
    const P = this.partner;
    const them = P.present && P.s?.st === 'play' && aabbOverlap(P.entity.body, z);
    this.atExit = me;
    if (this.isHost && me && them && !this.ended) {
      this.ev('end');
      this.finish();
    }
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    drawLoadingBackground(ctx, cx, cy, this.t, (bx, by) => {
      drawText(ctx, T.title, bx + 110, by + 18, { align: 'center', color: '#1E2A40', shadow: false });
    });
  }

  drawTiles(ctx, cx, cy) {
    drawLoadingTiles(ctx, this.map, cx, cy, this.t, this.map.ghostSolid);
  }

  drawWorld(ctx, cx, cy) {
    const sel = this.player.kind === 'choco' ? this.player.lassoTarget : null;
    for (const n of this.lassoNodes) drawLassoNode(ctx, Math.round(n.x - cx), Math.round(n.y - cy), this.t, { selected: n === sel, hooked: n.hooked, dusk: false });
    this.drawExit(ctx, cx, cy);
  }

  drawForeground(ctx) {
    if (this.atExit && !this.ended && Math.floor(this.t * 2) % 2 === 0) drawText(ctx, T.exitWait, SCREEN.W / 2, SCREEN.H - 14, { align: 'center', color: COOP_COLORS.both });
  }

  // Salida doble: un marco cian y uno ámbar con el portal en el medio
  drawExit(ctx, cx, cy) {
    const e = this.exitZone;
    const x = Math.round(e.x - cx);
    const y = Math.round(e.y - cy);
    for (let i = 0; i < 16; i++) {
      const w = 7 + Math.round(Math.sin(this.t * 6 + i) * 3);
      ctx.fillStyle = i % 3 === 0 ? COOP_COLORS.both : i % 3 === 1 ? COOP_COLORS.choco : COOP_COLORS.tapita;
      ctx.fillRect(x + 16 - w, y + i * 2, w * 2, 2);
    }
    ctx.fillStyle = COOP_COLORS.choco;
    ctx.fillRect(x, y, 2, 32);
    ctx.fillStyle = COOP_COLORS.tapita;
    ctx.fillRect(x + 30, y, 2, 32);
    if (fxRng.chance(0.3)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + fxRng.int(2, 29), y + fxRng.int(0, 31), 2, 1);
    }
  }
}
