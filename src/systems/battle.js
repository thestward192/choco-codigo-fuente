// Batallas por turnos del nivel 2 — docs/niveles/nivel_2_una.md
// Lógica pura (sin dibujo, sin audio): la escena de batalla anima y pregunta el timing,
// y este módulo calcula daño, RAM, estados y los gimmicks de cada bug.
//
// Una ronda:
//   startRound()           → +2 RAM (desde la segunda), el bug decide su intención
//   [si el bug va primero]  enemyAttack() + applyEnemyHit()
//   chocoAct(cmd)          → Compilar / Debug / Refactor / Commit --force / Objeto / Huir
//   [si no actuó antes]    enemyAttack() + applyEnemyHit()  (dos veces si es doble)
//   endRound()             → fuga de memoria, contador del loop, turnos de Debug
// Cada función devuelve una lista de eventos que la escena convierte en animaciones y textos.
import { BATTLE, BUGS } from '../config/balance.js';

export const BUG_IDS = ['nullPointer', 'loop', 'race', 'leak', 'spaghetti'];
export const COMMANDS = ['compile', 'debug', 'refactor', 'force', 'item', 'flee'];
export const ITEM_IDS = ['cafe', 'empanada', 'galloPinto'];

export const COMMAND_COST = {
  compile: 0,
  debug: BATTLE.DEBUG_COST,
  refactor: BATTLE.REFACTOR_COST,
  force: BATTLE.FORCE_COST,
  item: 0,
  flee: 0,
};

// Comandos que el enredo de Spaghetti Code puede intercambiar
const TANGLEABLE = ['compile', 'debug', 'force'];

export function createBattle({ bug, energy, maxEnergy, items = {}, rng, boss = false }) {
  const def = BUGS[bug];
  if (!def) throw new Error(`Bug desconocido: ${bug}`);
  return {
    bugId: bug,
    boss,
    rng,
    round: 0,
    intent: null,
    result: null, // 'win' | 'lose' | 'fled'
    bug: { hp: def.HP, maxHp: def.HP, loop: 0, loopBroken: false, phase: 0 },
    choco: {
      energy,
      maxEnergy,
      baseMax: maxEnergy, // la fuga de memoria solo dura la pelea
      ram: BATTLE.RAM_START,
      tangled: false,
      weakNext: false, // el próximo Compilar pega en la debilidad (×2)
      debugTurns: 0, // turnos con debilidad e intención reveladas
    },
    items: { cafe: 0, empanada: 0, galloPinto: 0, ...items },
  };
}

export function itemCount(b) {
  return ITEM_IDS.reduce((n, k) => n + (b.items[k] || 0), 0);
}

// ¿Se puede elegir el comando ahora?
export function canUse(b, cmd) {
  if (cmd === 'flee') return !b.boss;
  if (cmd === 'item') return itemCount(b) > 0;
  return b.choco.ram >= COMMAND_COST[cmd];
}

// ---------- Ronda ----------

export function startRound(b) {
  const ev = [];
  b.round++;
  const c = b.choco;
  if (b.round > 1) {
    const before = c.ram;
    c.ram = Math.min(BATTLE.RAM_MAX, c.ram + BATTLE.RAM_REGEN);
    if (c.ram > before) ev.push({ type: 'ram', amount: c.ram - before });
  }
  b.intent = planIntent(b);
  return ev;
}

// Lo que el bug va a hacer esta ronda (Debug lo muestra)
export function planIntent(b) {
  const r = b.rng;
  const bug = b.bug;
  const it = { action: 'attack', first: false, double: false };
  switch (b.bugId) {
    case 'loop':
      it.loopHeal = !bug.loopBroken && bug.loop + 1 >= BUGS.loop.LOOP_TURNS;
      break;
    case 'race':
      it.first = r.chance(BUGS.race.FIRST_CHANCE);
      it.double = r.chance(BUGS.race.DOUBLE_CHANCE);
      break;
    case 'leak':
      it.leak = true;
      break;
    case 'spaghetti':
      if (bug.phase % 2 === 0) it.action = 'tangle';
      break;
    default:
      break;
  }
  return it;
}

export function intentVisible(b) {
  return b.choco.debugTurns > 0;
}

// ---------- Choco ----------

// El enredo: la acción elegida puede cambiar por otra al azar (Refactor, Objeto y Huir no se enredan)
export function resolveTangle(b, cmd) {
  const c = b.choco;
  if (!c.tangled || !TANGLEABLE.includes(cmd)) return { cmd, swapped: false };
  c.tangled = false;
  const others = TANGLEABLE.filter((k) => k !== cmd && canUse(b, k));
  if (others.length === 0 || b.rng.chance(0.5)) return { cmd, swapped: false };
  return { cmd: b.rng.pick(others), swapped: true };
}

function damageBug(b, amount, ev, extra = {}) {
  const dmg = Math.max(0, Math.round(amount));
  b.bug.hp = Math.max(0, b.bug.hp - dmg);
  ev.push({ type: 'damage', target: 'bug', amount: dmg, ...extra });
  if (b.bug.hp <= 0) {
    b.result = 'win';
    ev.push({ type: 'win' });
  }
}

function healChoco(b, amount, ev) {
  const c = b.choco;
  const before = c.energy;
  c.energy = Math.min(c.maxEnergy, c.energy + amount);
  ev.push({ type: 'heal', target: 'choco', amount: c.energy - before });
}

// opts: { timing: 'crit' | 'good' | 'normal' (Compilar), item: id (Objeto) }
export function chocoAct(b, cmd, opts = {}) {
  const ev = [];
  const c = b.choco;
  if (!canUse(b, cmd)) return [{ type: 'invalid', cmd }];
  c.ram -= COMMAND_COST[cmd];
  switch (cmd) {
    case 'compile': {
      let dmg = BATTLE.COMPILE_DAMAGE;
      const crit = opts.timing === 'crit';
      if (crit) dmg *= BATTLE.CRIT_MULT;
      const weak = c.weakNext;
      if (weak) {
        dmg *= BATTLE.WEAK_MULT;
        c.weakNext = false;
      }
      damageBug(b, dmg, ev, { crit, weak, cmd });
      break;
    }
    case 'debug': {
      c.debugTurns = BATTLE.DEBUG_TURNS;
      c.weakNext = true;
      ev.push({ type: 'debug' });
      if (b.bugId === 'loop' && !b.bug.loopBroken) {
        b.bug.loopBroken = true;
        b.bug.loop = 0;
        if (b.intent) b.intent.loopHeal = false;
        ev.push({ type: 'loopBroken' });
      }
      break;
    }
    case 'refactor': {
      healChoco(b, BATTLE.REFACTOR_HEAL, ev);
      if (c.tangled) {
        c.tangled = false;
        ev.push({ type: 'untangle' });
      }
      break;
    }
    case 'force': {
      if (b.rng.chance(BATTLE.FORCE_FAIL)) ev.push({ type: 'fail', cmd });
      else damageBug(b, BATTLE.FORCE_DAMAGE, ev, { cmd });
      break;
    }
    case 'item': {
      const id = opts.item;
      if (!b.items[id]) return [{ type: 'invalid', cmd }];
      b.items[id]--;
      const def = BATTLE.ITEMS[id];
      healChoco(b, def.energy, ev);
      if (def.ram) {
        const before = c.ram;
        c.ram = Math.min(BATTLE.RAM_MAX, c.ram + def.ram);
        ev.push({ type: 'ram', amount: c.ram - before });
      }
      ev.unshift({ type: 'item', item: id });
      break;
    }
    case 'flee': {
      if (b.rng.chance(BATTLE.FLEE_CHANCE)) {
        b.result = 'fled';
        ev.push({ type: 'fled' });
      } else ev.push({ type: 'fleeFail' });
      break;
    }
    default:
      break;
  }
  return ev;
}

// ---------- El bug ----------

// Ataque del bug según su intención. { kind, damage, miss, tangle }
export function enemyAttack(b) {
  const id = b.bugId;
  const def = BUGS[id];
  const it = b.intent || planIntent(b);
  if (id === 'nullPointer') return { kind: 'deref', damage: def.DAMAGE, miss: b.rng.chance(def.MISS), tangle: false };
  if (id === 'spaghetti' && it.action === 'tangle') return { kind: 'tangle', damage: def.TANGLE_DAMAGE, miss: false, tangle: true };
  return { kind: id, damage: def.DAMAGE, miss: false, tangle: false };
}

// Aplica un ataque con el resultado de la defensa: 'perfect' (0), 'good' (mitad), 'miss' (completo)
export function applyEnemyHit(b, atk, defense = 'miss') {
  const ev = [];
  const c = b.choco;
  if (atk.miss) {
    ev.push({ type: 'enemyMiss' });
    return ev;
  }
  let dmg = atk.damage;
  if (defense === 'perfect') dmg = 0;
  else if (defense === 'good') dmg = Math.floor(dmg / 2);
  c.energy = Math.max(0, c.energy - dmg);
  ev.push({ type: 'damage', target: 'choco', amount: dmg, defense });
  if (atk.tangle && defense !== 'perfect') {
    c.tangled = true;
    ev.push({ type: 'tangled' });
  }
  if (c.energy <= 0) {
    b.result = 'lose';
    ev.push({ type: 'lose' });
  }
  return ev;
}

export function endRound(b) {
  const ev = [];
  const c = b.choco;
  const bug = b.bug;
  if (b.result) return ev;
  if (b.bugId === 'leak') {
    c.maxEnergy = Math.max(1, c.maxEnergy - BUGS.leak.LEAK);
    c.energy = Math.min(c.energy, c.maxEnergy);
    ev.push({ type: 'leak', amount: BUGS.leak.LEAK });
  }
  if (b.bugId === 'loop' && !bug.loopBroken) {
    bug.loop++;
    if (bug.loop >= BUGS.loop.LOOP_TURNS) {
      bug.loop = 0;
      const healed = bug.maxHp - bug.hp;
      bug.hp = bug.maxHp;
      ev.push({ type: 'loopHeal', amount: healed });
    }
  }
  if (b.bugId === 'spaghetti') bug.phase++;
  if (c.debugTurns > 0) c.debugTurns--;
  return ev;
}

// Estado de Choco al terminar: la energía máxima vuelve a la normal (la fuga se cierra)
export function battleOutcome(b) {
  const c = b.choco;
  return {
    result: b.result,
    energy: Math.min(c.energy, c.baseMax),
    items: { ...b.items },
    bits: b.result === 'win' ? BUGS[b.bugId].BITS : 0,
  };
}

// ---------- Timing ----------

// Posición del marcador (0..1) en la barra de Compilar: va y vuelve.
export function timingPos(t) {
  const p = (t / BATTLE.TIMING_SWEEP) % 2;
  return p <= 1 ? p : 2 - p;
}

// pos 0..1 → 'crit' (centro), 'good' o 'normal'
export function judgeTiming(pos) {
  const d = Math.abs(pos - 0.5);
  if (d <= BATTLE.TIMING_CRIT) return 'crit';
  if (d <= BATTLE.TIMING_GOOD) return 'good';
  return 'normal';
}

// offset: segundos entre la pulsación y el impacto (negativo = antes). null = no presionó.
export function judgeDefense(offset) {
  if (offset === null || offset === undefined) return 'miss';
  const d = Math.abs(offset);
  if (d <= BATTLE.DEFENSE_PERFECT) return 'perfect';
  if (d <= BATTLE.DEFENSE_GOOD) return 'good';
  return 'miss';
}
