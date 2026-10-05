// Base de los niveles de plataformas (prólogo, sala de pruebas, nivel 1 y más adelante 4 y 5):
// Choco, báculo, enemigos, peligros, pickups, vidas, checkpoints, pausa, muerte y reaparición,
// cámara, HUD, carteles, avisos, cinemáticas y final del nivel.
//
// Flow se usa a través de game.flow (lo asigna main.js) para no crear ciclos de importación
// entre flow.js y las escenas de nivel que heredan de esta clase.
//
// Las subclases cargan su mapa con setMap(), colocan entidades y sobrescriben los ganchos:
//   drawBackground / drawWorld / drawForeground, levelUpdate(dt), onRespawn(), onShotHitTile()…
import { Scene } from '../core/game.js';
import { SCREEN, LIVES, HEALTH, HOTFIX } from '../config/balance.js';
import { aabbOverlap, isStomp } from '../systems/physics.js';
import { Camera } from '../core/camera.js';
import { Particles } from '../core/particles.js';
import { Choco } from '../entities/choco.js';
import { Shot } from '../entities/projectile.js';
import { Hud } from '../ui/hud.js';
import { Laptop } from '../items/laptop.js';
import { shieldCharge01 } from '../systems/shield.js';
import { T as TILE } from '../systems/tilemap.js';
import { drawText, drawTextBox } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { Cutscene } from '../systems/cutscene.js';
import { hasItem, maxHpFor, goldenFor, setCheckpoint, devLoadout, hotfixSkips } from '../game/progress.js';
import { PauseScene } from '../scenes/PauseScene.js';
import { ItemGetScene } from '../scenes/ItemGetScene.js';
import { fxRng } from '../core/rng.js';

const TS = SCREEN.TILE;
const SIGN_RANGE = 22;
export const INTERACT_RANGE = 20;

export class PlatformLevel extends Scene {
  // opts: { levelId, noDeath (prólogo: sin muerte posible), hudMode: 'full' | 'bar' | 'none' }
  constructor(game, { levelId = null, noDeath = false, hudMode = 'full' } = {}) {
    super(game);
    this.levelId = levelId;
    this.noDeath = noDeath;
    this.hudMode = hudMode;
    this.lives = LIVES.START;
    this.bits = 0;
    this.stats = { time: 0, deaths: 0 };
    this.goldenY = [false, false, false];
    this.goldenHad = this.session && levelId !== null ? goldenFor(this.session.data, levelId) : [false, false, false];
    this.particles = new Particles(900);
    this.camera = new Camera();
    this.hud = new Hud();
    this.laptop = new Laptop();
    this.shots = [];
    this.enemies = [];
    this.hazards = [];
    this.pickups = [];
    this.signs = [];
    this.interactables = [];
    this.t = 0;
    this.banner = null;
    this.cutscene = null;
    this.ending = null;
    this.hudDemo = false;
    this.irisIn = { x: 0, y: 0 };
    this.checkpoint = null;
    this.pendingRespawn = false;
    this.timerRunning = true;
  }

  get session() {
    return this.game.session;
  }

  get founders() {
    return this.session ? this.session.data.founders : [];
  }

  // Objetos y vida según la partida (o los valores de prueba si no hay partida)
  startingLoadout() {
    const d = this.session?.data;
    const items = { staff: true, boots: false, laptop: false, shield: false, lasso: false };
    if (d) for (const k of Object.keys(items)) if (k !== 'staff') items[k] = hasItem(d, k);
    let lo = { items, maxHp: d ? maxHpFor(d) : HEALTH.START_MAX };
    if (this.game.devMode && this.levelId !== null) lo = devLoadout(lo, this.levelId);
    if (this.game.hotfix) lo.maxHp = HOTFIX.MAX_HP;
    return lo;
  }

  // ---------- Construcción ----------
  setMap(map) {
    this.map = map;
    this.camera.setBounds(0, 0, map.pxW, map.pxH);
  }

  // Crea a Choco (conserva objetos y vida máxima si ya existía)
  placeChoco(x, footY, { items = null, maxHp = null } = {}) {
    const prev = this.choco;
    const lo = prev ? { items: prev.items, maxHp: prev.maxHp } : this.startingLoadout();
    this.choco = new Choco(this, x, footY);
    this.choco.items = items || lo.items;
    this.choco.setMaxHp(maxHp ?? lo.maxHp);
    this.choco.hp = this.choco.maxHp;
    this.camera.snapTo(this.choco.footX, this.choco.footY);
    return this.choco;
  }

  // Carteles: texto que aparece solo al acercarse. checkpoint: si tocarlo lo activa.
  addSign(x, footY, text, { checkpoint = false, id = null, draw = null, section = null } = {}) {
    const s = { x, y: footY, text, t: 0, flash: 0, checkpoint, id: id ?? this.signs.length, draw, section };
    this.signs.push(s);
    return s;
  }

  // Objetos con los que se interactúa con ↑ o E
  addInteractable(o) {
    this.interactables.push({ near: false, t: 0, range: INTERACT_RANGE, ...o });
  }

  // ---------- Ciclo de vida ----------
  enter() {}

  exit() {
    this.game.audio.stopAllSustained();
  }

  onSuspend() {
    this.choco?.stopCharge();
    if (this.canPause()) this.openPause();
  }

  canPause() {
    return !this.cutscene && !this.ending && this.choco.alive && !this.game.transitioning && this.game.top === this;
  }

  openPause() {
    this.choco.stopCharge();
    this.game.push(new PauseScene(this.game, this));
  }

  // ---------- API usada por las entidades ----------
  countShots(charged) {
    let n = 0;
    for (const s of this.shots) if (!s.dead && s.charged === charged) n++;
    return n;
  }

  spawnShot(x, y, dir, charged) {
    this.shots.push(new Shot(x, y, dir, charged));
  }

  addBits(n, x, y) {
    if (this.hudMode !== 'full') return;
    this.bits += n;
    if (x !== undefined) {
      this.particles.burst(x, y, n * 3, { speedMin: 20, speedMax: 50, colors: [UI.green, '#E8FFF0'], lifeMin: 0.2, lifeMax: 0.4, angle: -Math.PI / 2, spread: 2 });
    }
    if (this.bits >= LIVES.BITS_PER_LIFE) {
      this.bits -= LIVES.BITS_PER_LIFE;
      this.lives++;
      playSfx(this.game.audio, 'oneUp');
      this.showBanner(TEXTS.pickups.oneUp, '', null, 1.2);
    }
  }

  // Y dorada i (0..2), ya recogida en otra partida → translúcida
  goldenGhost(i) {
    return !!this.goldenHad[i] || this.goldenY[i];
  }

  collect(p) {
    const g = this.game;
    const a = g.audio;
    const c = this.choco;
    this.particles.burst(p.x, p.y, p.type === 'bit' ? 6 : 16, { speedMin: 20, speedMax: 70, colors: ['#FFFFFF', UI.yellow, UI.green], lifeMin: 0.2, lifeMax: 0.5 });
    if (p.type === 'bit') {
      playSfx(a, 'bit');
      this.addBits(1);
    } else if (p.type === 'cacao') {
      playSfx(a, 'cacao');
      const first = !c.coating;
      c.coating = true;
      c.setSquash({ X: 1.25, Y: 0.8 });
      if (first && !this.cacaoExplained) {
        this.cacaoExplained = true;
        this.showBanner(TEXTS.pickups.cacao, TEXTS.pickups.cacaoDesc);
      }
    } else if (p.type === 'chunk') {
      playSfx(a, 'heal');
      c.hp = Math.min(c.maxHp, c.hp + 1);
    } else if (p.type === 'goldenY') {
      playSfx(a, 'goldenY');
      this.goldenY[p.index] = true;
      g.effects.flash('#FFD23F', 3);
      this.particles.burst(p.x, p.y, 24, { speedMin: 30, speedMax: 90, colors: ['#FFD23F', '#FFFFFF', '#B8902A'], lifeMin: 0.3, lifeMax: 0.7 });
      this.showBanner(TEXTS.pickups.goldenY, `${this.goldenY.filter(Boolean).length}/3`, null, 1.4);
    } else if (p.type === 'boots') {
      this.giveItem('boots');
    }
  }

  // Pantalla de objeto obtenido dentro del nivel
  giveItem(item, onDone = null) {
    const g = this.game;
    const c = this.choco;
    c.items[item] = true;
    c.stopCharge();
    c.state = 'victory';
    c.anim.t = 0;
    c.body.vx = 0;
    this.hud.visible = false;
    g.push(
      new ItemGetScene(g, item, () => {
        c.state = 'play';
        this.hud.visible = true;
        onDone?.();
      }),
    );
  }

  showBanner(title, sub, onDone = null, time = 2.2) {
    this.banner = { title, sub, t: 0, time, onDone };
  }

  onChocoDamaged() {}

  // Caer al vacío: en el prólogo vuelve a la última plataforma; en los niveles es muerte.
  onChocoFell(c) {
    if (this.noDeath) {
      this.returnToSafe(c);
      return;
    }
    c.dieByFall();
  }

  returnToSafe(c) {
    const s = c.safe || this.checkpoint;
    playSfx(this.game.audio, 'glitch');
    this.game.effects.glitch(0.25, 0.6);
    c.body.x = s.x - c.body.w / 2;
    c.body.y = s.y - c.body.h;
    c.body.vx = 0;
    c.body.vy = 0;
    c.invuln = 0.6;
    this.camera.snapTo(c.footX, c.footY);
  }

  onChocoDied() {
    this.pendingRespawn = true;
    this.stats.deaths++;
  }

  // Reaparece en el checkpoint. costLife: false al reiniciar desde la pausa.
  respawn(costLife = true) {
    if (costLife && !this.game.infiniteLives) this.lives--;
    if (this.lives <= 0) {
      this.game.flow.gameOver(this.game, this.levelId, { ...this.stats }, this.gameOverOptions());
      return;
    }
    this.shots = [];
    this.onRespawn();
    const prev = this.choco;
    this.choco = null;
    this.placeChoco(this.checkpoint.x, this.checkpoint.y, { items: prev.items, maxHp: prev.maxHp });
    this.choco.invuln = 1;
    this.irisIn.x = Math.round(this.choco.footX - this.camera.rx);
    this.irisIn.y = Math.round(this.choco.cy - this.camera.ry);
  }

  // Gancho: reconstruir la sección (enemigos, bloques…) al reaparecer
  onRespawn() {}

  // Gancho: opciones del Game Over (el nivel 5 conserva el checkpoint de antes del jefe)
  gameOverOptions() {
    return {};
  }

  // Modo Hotfix: la mitad de los checkpoints no se activan
  checkpointOff(id) {
    return this.game.hotfix && hotfixSkips(this.levelId, id);
  }

  // Desde la pausa
  restartFromCheckpoint() {
    const c = this.choco;
    const center = { x: Math.round(c.footX - this.camera.rx), y: Math.round(c.cy - this.camera.ry) };
    this.game.startTransition({ type: 'iris', center, centerIn: this.irisIn, onMid: () => this.respawn(false) });
  }

  quitToMap() {
    this.game.flow.quitLevel(this.game, this.levelId, { ...this.stats });
  }

  activateCheckpoint(s) {
    if (this.checkpoint && this.checkpoint.id === s.id) return;
    if (this.checkpointOff(s.id)) return;
    this.checkpoint = { x: s.x, y: s.y, id: s.id, section: s.section };
    s.flash = 0.6;
    playSfx(this.game.audio, 'checkpoint');
    this.particles.burst(s.x, s.y - 14, 10, { speedMin: 20, speedMax: 50, colors: ['#6FE08A', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    if (this.session && this.levelId !== null) this.session.update(setCheckpoint(this.session.data, this.levelId, s.id));
  }

  // Disparo contra un tile: los bloques agrietados ('K') solo se rompen con disparo cargado
  onShotHitTile(tx, ty, shot) {
    if (this.map.charAt(tx, ty) !== 'K') return;
    if (shot.charged) this.breakCracked(tx, ty);
    else {
      playSfx(this.game.audio, 'tink');
      this.particles.burst(shot.cx, shot.cy, 4, { speedMin: 20, speedMax: 50, colors: ['#FF2E88', '#FFFFFF'], lifeMin: 0.1, lifeMax: 0.2 });
      this.onCrackedResist?.(tx, ty);
    }
  }

  // Rompe todo el grupo de bloques agrietados conectados
  breakCracked(tx, ty) {
    const stack = [[tx, ty]];
    const seen = new Set();
    let n = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      const k = `${x},${y}`;
      if (seen.has(k) || this.map.charAt(x, y) !== 'K') continue;
      seen.add(k);
      this.map.setChar(x, y, '.');
      n++;
      const px = x * TS + 8;
      const py = y * TS + 8;
      this.particles.burst(px, py, 12, { speedMin: 30, speedMax: 110, colors: this.crackColors || ['#3A1630', '#8C1D52', '#FF2E88', '#FFFFFF'], gravity: 300, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (n) {
      playSfx(this.game.audio, 'blockBreak');
      this.game.effects.shake(0.3);
      this.game.effects.hitstop(4);
      this.onCrackedBroken?.(tx, ty);
    }
  }

  // Congela a Choco para una cinemática
  freezeChoco() {
    const c = this.choco;
    c.stopCharge();
    if (c.state === 'play') c.state = 'frozen';
    c.body.vx = 0;
  }

  playCutscene(genFn, { onEnd = null, onSkip = null, skippable = true, keepHud = false } = {}) {
    if (!keepHud) this.hud.visible = false;
    this.freezeChoco();
    this.cutscene = new Cutscene(this, genFn, {
      skippable,
      onSkip,
      onEnd: () => {
        this.cutscene = null;
        this.hud.visible = true;
        if (this.choco.state === 'frozen') this.choco.state = 'play';
        onEnd?.();
      },
    });
  }

  // Fin del nivel: pose de victoria, fundido a blanco y resultados.
  finishLevel({ delay = 1.6, music = true, onFinish = null } = {}) {
    if (this.ending) return;
    const c = this.choco;
    const g = this.game;
    this.ending = { t: 0, delay, onFinish };
    c.stopCharge();
    c.state = 'victory';
    c.anim.t = 0;
    c.body.vx = 0;
    this.hud.visible = false;
    if (music) g.audio.stopMusic(0.6);
  }

  completeStats() {
    return { ...this.stats, bits: this.bits, goldenY: [...this.goldenY] };
  }

  // ---------- Depuración ----------
  debugGiveAll() {
    const c = this.choco;
    c.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
    c.setMaxHp(HEALTH.MAX_POSSIBLE);
    c.hp = c.maxHp;
    this.pickups = this.pickups.filter((p) => p.type !== 'boots');
  }

  debugLife(d) {
    const c = this.choco;
    c.setMaxHp(c.maxHp + d);
    c.hp = c.maxHp;
  }

  debugHudDemo() {
    this.hudDemo = !this.hudDemo;
  }

  debugInfo() {
    const c = this.choco;
    const b = c.body;
    return [
      `${c.state} · ${c.anim.name}`,
      `x ${b.x.toFixed(1)} y ${b.y.toFixed(1)} (tile ${Math.floor(c.footX / TS)},${Math.floor((c.footY - 1) / TS)})`,
      `vx ${b.vx.toFixed(0)} vy ${b.vy.toFixed(0)}`,
      `suelo ${b.onGround ? 'sí' : 'no'} coyote ${c.js.coyote.toFixed(2)}`,
      `carga ${c.chargeT.toFixed(2)} disparos ${this.shots.length}`,
      `enemigos ${this.enemies.length} partículas ${this.particles.activeCount}`,
    ];
  }

  debugDraw(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    const box = (r, color) => {
      if (!r) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(r.x - cx) + 0.5, Math.round(r.y - cy) + 0.5, r.w - 1, r.h - 1);
    };
    box(this.choco.body, '#6FE08A');
    for (const e of this.enemies) box(e.body, '#E0343F');
    for (const h of this.hazards) for (const r of h.hurtboxes?.() || []) box(r, '#FF8A3D');
    for (const p of this.map.platforms) box(p, '#43D9FF');
    for (const s of this.shots) box(s, '#43D9FF');
    for (const p of this.pickups) box(p.hitbox, '#FFD23F');
    const fx = Math.round(this.camera.focusX - cx);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(fx - 12, 0, 1, SCREEN.H);
    ctx.fillRect(fx + 12, 0, 1, SCREEN.H);
  }

  // ---------- Actualización ----------
  update(dt) {
    const g = this.game;
    const inp = g.input;
    this.t += dt;
    const c = this.choco;

    if (inp.pressed('pause') && this.canPause()) {
      this.openPause();
      return;
    }
    if (!this.ending && !this.cutscene && this.timerRunning) this.stats.time += dt;

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.time) {
        const done = this.banner.onDone;
        this.banner = null;
        if (done) done();
      }
    }

    if (this.cutscene) this.cutscene.update(dt);

    // Vista Debug
    if (c.items.laptop) {
      const active = this.laptop.update(dt, inp.down('debug') && c.alive && c.state === 'play');
      if (this.laptop.justToggled) playSfx(g.audio, active ? 'interact' : 'menuCancel');
      this.map.ghostSolid = active;
    } else this.map.ghostSolid = false;

    // Peligros y plataformas se mueven antes que Choco (para que lo carguen)
    for (const h of this.hazards) h.update(dt, this);
    this.levelUpdate(dt);

    c.update(dt, inp);
    this.afterChocoMove(dt);

    // Respawn tras derretirse
    if (this.pendingRespawn && c.meltDone && !g.transitioning) {
      this.pendingRespawn = false;
      if (this.lives <= 1 && !g.infiniteLives) {
        this.lives = 0;
        this.game.flow.gameOver(g, this.levelId, { ...this.stats }, this.gameOverOptions());
        return;
      }
      const center = { x: Math.round(c.footX - this.camera.rx), y: Math.round(c.footY - 8 - this.camera.ry) };
      g.startTransition({ type: 'iris', center, centerIn: this.irisIn, onMid: () => this.respawn() });
    }

    // Enemigos (quietos durante las cinemáticas, salvo los que actúan en ellas, como un jefe que entra)
    if (this.cutscene) for (const e of this.enemies) if (e.alwaysUpdate) e.update(dt, this);
    if (!this.cutscene) {
      for (const e of this.enemies) {
        e.update(dt, this);
        if (!e.active || !c.alive || c.state !== 'play') continue;
        if (!aabbOverlap(c.body, e.hurtbox || e.body)) continue;
        if (e.contact) {
          e.contact(this, c, inp);
          continue;
        }
        if (e.stompable && isStomp(c.body, e.body, c.body.vy)) {
          e.stomp(this);
          c.stomp(inp);
        } else if (e.harmful !== false) {
          c.hurt(e.body.x + e.body.w / 2);
        }
      }
      // Peligros (cables, barras de estática…)
      if (c.alive && c.state === 'play') {
        for (const h of this.hazards) {
          if (h.touches && h.touches(c.body)) {
            c.hurt(h.sourceX ? h.sourceX(c) : c.cx - c.facing, h.hurtOpts || {});
            break;
          }
        }
      }
    }

    // Disparos
    for (const s of this.shots) {
      s.update(dt, this);
      if (s.dead || s.reflected) continue;
      for (const e of this.enemies) {
        if (!e.active || s.hit.has(e)) continue;
        if (!e.shootable && !e.reflects && !e.pushable) continue;
        if (!aabbOverlap(s, e.hurtbox || e.body)) continue;
        if (e.reflects) {
          s.reflect(this);
          e.onReflect?.(this, s);
          break;
        }
        if (e.pushable && !e.shootable) {
          e.push?.(this, s);
          s.kill(this, true);
          break;
        }
        e.damage(s.damage, this, s.dir, s);
        if (s.charged) {
          s.hit.add(e);
          g.effects.hitstop(5);
        } else {
          s.kill(this, false);
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.hazards = this.hazards.filter((h) => !h.dead);

    // Modo Hotfix: sin power-ups de cacao (los granos y trozos son bits)
    if (g.hotfix) {
      for (const p of this.pickups) {
        if (p.type === 'cacao' || p.type === 'chunk') {
          p.type = 'bit';
          p.size = 8;
        }
      }
    }
    if (c.state === 'play') for (const p of this.pickups) p.update(dt, this);
    this.pickups = this.pickups.filter((p) => !p.dead);

    this.updateSigns(dt);
    this.updateInteractables(dt);

    if (this.ending) {
      const e = this.ending;
      e.t += dt;
      if (e.t >= e.delay && !e.sent) {
        e.sent = true;
        if (e.onFinish) e.onFinish();
        else this.game.flow.completeLevel(g, this.levelId, this.completeStats());
      }
    }

    this.particles.update(dt);
    this.updateCamera(dt);
    if (this.cutscene && !this.hudInCutscene) this.hud.visible = false;
    this.hud.update(dt, this.hudState());
  }

  // Ganchos
  levelUpdate(_dt) {}
  afterChocoMove(_dt) {}

  updateCamera(dt) {
    const c = this.choco;
    if (this.cameraLock) {
      const l = this.cameraLock;
      this.camera.x += (l.x - this.camera.x) * Math.min(1, dt * 6);
      this.camera.y += (l.y - this.camera.y) * Math.min(1, dt * 6);
      return;
    }
    if (c.state !== 'dead' || c.deathCause !== 'fall') {
      this.camera.follow({ cx: c.footX, cy: c.footY, facing: c.facing, onGround: c.body.onGround || c.state === 'dead', vy: c.body.vy }, dt);
    }
  }

  // Carteles: el más cercano se muestra solo (y si es checkpoint, se activa)
  updateSigns(dt) {
    const c = this.choco;
    this.activeSign = null;
    for (const s of this.signs) {
      const near = c.alive && Math.abs(s.x - c.footX) < SIGN_RANGE && Math.abs(s.y - c.footY) < 24;
      s.t = near ? Math.min(1, s.t + dt * 6) : Math.max(0, s.t - dt * 6);
      if (s.flash > 0) s.flash -= dt;
      if (near) {
        this.activeSign = s;
        if (s.checkpoint && c.body.onGround && c.state === 'play') this.activateCheckpoint(s);
        if (!s.seen) {
          s.seen = true;
          this.onSignSeen?.(s);
        }
      }
    }
  }

  updateInteractables(dt) {
    const c = this.choco;
    const inp = this.game.input;
    // Solo el más cercano queda activo
    let best = null;
    let bestD = Infinity;
    for (const o of this.interactables) {
      const ok = c.state === 'play' && !this.cutscene && !this.ending && !o.disabled && Math.abs(o.x - c.footX) < o.range && Math.abs(o.y - c.footY) < 26;
      const d = Math.abs(o.x - c.footX);
      if (ok && d < bestD) {
        best = o;
        bestD = d;
      }
    }
    for (const o of this.interactables) {
      o.near = o === best;
      o.t = o.near ? Math.min(1, o.t + dt * 6) : Math.max(0, o.t - dt * 6);
    }
    if (best && (inp.pressed('interact') || inp.pressed('up'))) {
      inp.consume('up');
      playSfx(this.game.audio, 'interact');
      best.onUse(best);
    }
  }

  hudState() {
    const c = this.choco;
    const s = { hp: c.hp, maxHp: c.maxHp, coating: c.coating, items: c.items };
    if (this.hudMode === 'full') {
      Object.assign(s, {
        lives: this.lives,
        bits: this.bits,
        goldenY: this.goldenY,
        laptop: c.items.laptop ? this.laptop : null,
        shield: c.items.shield ? { cooldown01: shieldCharge01(c.shield) } : null,
        lassoInRange: false,
      });
    } else s.items = { staff: c.items.staff };
    if (this.boss && this.boss.showBar) s.boss = this.boss.hudInfo();
    if (this.hudDemo) {
      const w = (Math.sin(this.t * 0.8) + 1) / 2;
      s.shield = { cooldown01: (this.t % 3.5) / 3.5 };
      s.lassoInRange = Math.floor(this.t) % 2 === 0;
      s.heat = w * 100;
      s.vapor = { charges: 3 - (Math.floor(this.t / 2) % 4), max: 3 };
      s.deadline = Math.max(0, 180 - this.t * 4);
      s.boss = { name: TEXTS.debug.bossDemo, hp01: 1 - ((this.t / 20) % 1), segments: 4 };
    }
    return s;
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    const g = this.game;
    const cam = this.camera;
    cam.offsetX = g.effects.shakeX;
    cam.offsetY = g.effects.shakeY;
    const cx = cam.rx;
    const cy = cam.ry;

    this.drawBackground(ctx, cx, cy);
    this.drawTiles(ctx, cx, cy);
    this.drawWorld(ctx, cx, cy);
    for (const s of this.signs) {
      const off = s.checkpoint && this.checkpointOff(s.id);
      if (off) ctx.globalAlpha = 0.3;
      (s.draw || this.drawSign).call(this, ctx, s, cx, cy);
      ctx.globalAlpha = 1;
    }
    for (const o of this.interactables) o.draw?.(ctx, o, cx, cy, this);
    for (const p of this.pickups) p.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, false);
    for (const h of this.hazards) if (!h.front) h.draw(ctx, cx, cy, this);
    for (const e of this.enemies) e.draw(ctx, cx, cy, this);
    for (const s of this.shots) s.draw(ctx, cx, cy);
    if (!this.hideChoco) this.choco.draw(ctx, cx, cy);
    for (const h of this.hazards) if (h.front) h.draw(ctx, cx, cy, this);
    this.particles.draw(ctx, cx, cy, true);
    this.drawForeground(ctx, cx, cy);
    for (const o of this.interactables) if (o.t > 0 && !this.cutscene) this.drawInteractHint(ctx, o, cx, cy);

    if (this.map.ghostSolid) this.drawDebugView(ctx, cx, cy);
    this.drawOverlay(ctx);

    // Franjas de cine durante la cinemática
    if (this.cutscene && !this.cutscene.noBars) {
      const k = Math.min(1, this.cutscene.t * 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.W, Math.round(14 * k));
      ctx.fillRect(0, SCREEN.H - Math.round(14 * k), SCREEN.W, Math.round(14 * k));
    }

    if (this.hudMode !== 'none') this.hud.draw(ctx, this.hudState());
    if (!this.cutscene && this.activeSign && this.activeSign.t > 0.5 && this.activeSign.text) this.drawSignText(ctx, this.activeSign);
    if (this.banner) this.drawBanner(ctx, this.banner);
    this.drawUi(ctx);
    if (this.cutscene) this.cutscene.draw(ctx);
    if (this.ending) {
      const e = this.ending;
      const a = Math.max(0, (e.t - (e.delay - 0.8)) / 0.8);
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = e.color || '#FFFFFF';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
  }

  // Ganchos de dibujo
  drawBackground(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
  }
  drawTiles() {}
  drawWorld() {}
  drawForeground() {}
  drawOverlay() {}
  drawUi() {}

  drawSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    ctx.fillStyle = '#5A4030';
    ctx.fillRect(x - 1, y - 8, 2, 8);
    ctx.fillStyle = '#E9DCC3';
    ctx.fillRect(x - 7, y - 18, 14, 10);
    ctx.fillStyle = '#5A4030';
    ctx.fillRect(x - 5, y - 15, 9, 1);
    ctx.fillRect(x - 5, y - 12, 6, 1);
  }

  // Ícono flotante "↑" sobre lo que se puede usar
  drawInteractHint(ctx, o, cx, cy) {
    const x = Math.round(o.x - cx);
    const y = Math.round(o.y - cy - (o.hintH ?? 30)) + Math.round(Math.sin(this.t * 6));
    ctx.globalAlpha = o.t;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 5, y - 1, 10, 10);
    ctx.fillStyle = UI.yellow;
    ctx.fillRect(x - 5, y - 1, 10, 1);
    drawText(ctx, TEXTS.hud.interact, x, y, { align: 'center', color: UI.yellow, shadow: false });
    ctx.globalAlpha = 1;
  }

  drawSignText(ctx, s) {
    const w = 238;
    const x = SCREEN.W - w - 4;
    const y = this.hudMode === 'full' ? 18 : 4;
    ctx.globalAlpha = 0.85 * s.t;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y, w, 26);
    ctx.globalAlpha = s.t;
    ctx.fillStyle = this.signColor || UI.cyan;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + 25, w, 1);
    drawTextBox(ctx, s.text, x + 6, y + 4, w - 12, { color: UI.text });
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, b) {
    const t = b.t;
    const inT = Math.min(1, t / 0.25);
    const outT = Math.max(0, (t - (b.time - 0.3)) / 0.3);
    const a = inT * (1 - outT);
    ctx.globalAlpha = 0.6 * a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 60, SCREEN.W, 44);
    ctx.globalAlpha = a;
    const slide = Math.round((1 - inT) * 30);
    drawText(ctx, b.title, SCREEN.W / 2 - slide, 68, { align: 'center', bold: true, color: UI.yellow, scale: 1 });
    if (b.sub) drawText(ctx, b.sub, SCREEN.W / 2 + slide, 86, { align: 'center', color: UI.text });
    ctx.globalAlpha = 1;
  }

  // Filtro de la Vista Debug: azul oscuro, cuadrícula de 16 px y línea de escaneo.
  drawDebugView(ctx, cx, cy) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#0A2A7A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = UI.cyan;
    for (let x = -(cx % TS); x < SCREEN.W; x += TS) ctx.fillRect(x, 0, 1, SCREEN.H);
    for (let y = -(cy % TS); y < SCREEN.H; y += TS) ctx.fillRect(0, y, SCREEN.W, 1);
    ctx.globalAlpha = 0.18;
    const sy = Math.floor((this.t * 90) % SCREEN.H);
    ctx.fillRect(0, sy, SCREEN.W, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#9FE8FF';
    for (let i = 0; i < 6; i++) ctx.fillRect(fxRng.int(0, SCREEN.W), fxRng.int(0, SCREEN.H), 1, 1);
    this.drawDebugReveal(ctx, cx, cy);
  }

  // Lo que la Vista Debug revela: bloques invisibles, paredes agrietadas, puntos débiles
  drawDebugReveal(ctx, cx, cy) {
    const m = this.map;
    const x0 = Math.max(0, Math.floor(cx / TS));
    const y0 = Math.max(0, Math.floor(cy / TS));
    const x1 = Math.min(m.w - 1, Math.floor((cx + SCREEN.W) / TS));
    const y1 = Math.min(m.h - 1, Math.floor((cy + SCREEN.H) / TS));
    const blink = Math.floor(this.t * 4) % 2 === 0;
    ctx.strokeStyle = UI.cyan;
    ctx.lineWidth = 1;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const hidden = m.typeAt(tx, ty) === TILE.HIDDEN;
        const cracked = m.charAt(tx, ty) === 'K';
        if (!hidden && !cracked) continue;
        const x = tx * TS - cx;
        const y = ty * TS - cy;
        ctx.globalAlpha = hidden ? 0.9 : 0.6;
        ctx.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
        if (hidden && blink) drawText(ctx, '?', x + 8, y + 4, { align: 'center', color: UI.cyan, shadow: false });
        if (cracked) {
          ctx.fillStyle = UI.cyan;
          ctx.fillRect(x + 5, y + 4, 1, 4);
          ctx.fillRect(x + 6, y + 8, 1, 3);
          ctx.fillRect(x + 9, y + 6, 3, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
    // Puntos débiles: un círculo que parpadea
    for (const e of this.enemies) {
      if (!e.active && e.state !== 'intro') continue;
      const wp = e.weakPoint ? e.weakPoint() : { x: e.body.x + e.body.w / 2, y: e.body.y + 3 };
      if (!wp) continue;
      const r = blink ? 4 : 5;
      ctx.strokeStyle = blink ? '#FFFFFF' : UI.cyan;
      ctx.beginPath();
      ctx.arc(Math.round(wp.x - cx) + 0.5, Math.round(wp.y - cy) + 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
