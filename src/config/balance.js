// ============================================================================
// balance.js — TODOS los números de gameplay viven aquí.
// Para ajustar la dificultad o la sensación del juego, cambiá solo este archivo.
// Unidades: px, segundos, px/s, px/s². Resolución interna 320×180, tiles de 16.
// ============================================================================

export const SCREEN = {
  W: 320,
  H: 180,
  TILE: 16,
};

export const SIM = {
  STEP: 1 / 60, // paso fijo de simulación
  MAX_STEPS_PER_FRAME: 5, // evita la "espiral de la muerte"
};

export const INPUT = {
  BUFFER: 0.1, // salto y disparo recuerdan la pulsación este tiempo
  STICK_DEADZONE: 0.25,
  SKIP_HOLD: 1.0, // mantener Esc/Start para saltar cinemáticas
};

// Física de plataformas (niveles 1, 4 y 5) — docs/03_mecanicas.md
export const PLATFORMER = {
  MAX_SPEED: 105,
  ACCEL_GROUND: 900,
  DECEL_GROUND: 1400,
  ACCEL_AIR: 600,
  DECEL_AIR: 600, // no definido en docs: igual a la aceleración en el aire (ver DECISIONES.md)
  GRAVITY_UP: 900,
  GRAVITY_DOWN: 1150,
  MAX_FALL: 320,
  JUMP_SPEED: -300,
  JUMP_CUT: 0.45,
  DOUBLE_JUMP_SPEED: -265,
  COYOTE: 0.1,
  STOMP_BOUNCE: -230,
  STOMP_BOUNCE_HELD: -300,
  DROP_THROUGH_TIME: 0.2, // tiempo que se ignoran las plataformas de un sentido al bajar
  HITBOX_W: 10,
  HITBOX_H: 20,
  SPRITE_W: 16,
  SPRITE_H: 24,
  SKID_MIN_SPEED: 55, // velocidad mínima para mostrar el derrape al girar
  MAX_MOVE_SUBSTEP: 6, // px máximos por sub-movimiento de colisión
};

// Báculo Compilador
export const STAFF = {
  NORMAL: { DAMAGE: 1, SPEED: 240, RANGE: 170, SIZE: 6 },
  CHARGED: { DAMAGE: 3, SPEED: 200, RANGE: 220, SIZE: 14 },
  COOLDOWN: 0.25,
  MAX_ON_SCREEN: 2,
  CHARGE_TIME: 0.8, // carga completa
  CHARGE_VISIBLE_AFTER: 0.16, // mantener menos que esto es un toque (sin brillo de carga)
  CHARGE_MOVE_MULT: 0.7,
  SHOOT_POSE_TIME: 0.19, // 3 frames a 16 fps
  RECOIL_PX: 1,
  MUZZLE_X: 15, // salida del disparo (núcleo del báculo) relativa al centro de los pies
  MUZZLE_Y: -10,
};

// Vida: la barra de chocolate
export const HEALTH = {
  START_MAX: 1, // el núcleo
  MAX_POSSIBLE: 5,
  INVINCIBLE_TIME: 1.2,
  HURT_HITSTOP_FRAMES: 4,
  HURT_POSE_TIME: 0.25,
  KNOCKBACK_X: 110,
  KNOCKBACK_Y: -170,
  DEATH_HITSTOP_FRAMES: 8,
  MELT_FPS: 10,
  RESPAWN_DELAY: 1.6, // tras terminar de derretirse
  FALL_DEATH_MARGIN: 32, // px debajo del mapa para contar como caída al vacío
};

export const LIVES = {
  START: 3,
  BITS_PER_LIFE: 100,
};

// Cámara — docs/04_arte.md
export const CAMERA = {
  DEADZONE_X: 24,
  LOOKAHEAD_X: 32,
  LOOKAHEAD_LERP: 0.05,
  LERP: 0.12, // por frame a 60 fps
  LERP_Y: 0.1,
  FALL_LERP_Y: 0.25, // cuando cae rápido, la cámara lo alcanza antes (nada fuera de cuadro)
  TARGET_Y_RATIO: 0.62, // Choco se ubica algo abajo del centro vertical
  AIR_MARGIN_TOP: 44, // en el aire la cámara solo sube si Choco pasa este margen
  AIR_MARGIN_BOTTOM: 50,
};

export const EFFECTS = {
  SHAKE_MAX_PX: 6,
  SHAKE_DECAY: 1.6, // trauma perdido por segundo
  SHAKE_HURT: 0.45,
  SHAKE_LAND_HARD: 0.18,
  SHAKE_STOMP: 0.2,
  SHAKE_CHARGED: 0.25,
  SHAKE_ENEMY_DIE: 0.15,
  HITSTOP_STOMP: 3,
  HITSTOP_ENEMY_DIE: 3,
  HITSTOP_CHARGED_HIT: 5,
  HARD_LANDING_VY: 280, // velocidad de caída a partir de la cual el aterrizaje sacude
};

// Squash & stretch de Choco (escala relativa; 1 = normal)
export const SQUASH = {
  JUMP: { X: 0.72, Y: 1.3 },
  DOUBLE_JUMP: { X: 0.8, Y: 1.2 },
  LAND: { X: 1.35, Y: 0.68 },
  LAND_SOFT: { X: 1.15, Y: 0.86 },
  STOMP: { X: 0.8, Y: 1.22 },
  HURT: { X: 1.2, Y: 0.82 },
  SPRING_FREQ: 22, // rad/s del resorte que devuelve la escala a 1
  SPRING_ZETA: 0.42, // amortiguamiento (<1 = rebota un poco)
};

// Vida visual de Choco (tiempos de animaciones secundarias)
export const CHOCO_FX = {
  LAND_POSE_TIME: 0.125, // 2 frames a 16 fps
  SPIN_TIME: 0.25, // doble salto: 4 frames a 16 fps
  JUMP_POSE_SWITCH: 0.1, // primer frame de salto (despegue)
  BLINK_MIN: 1.8,
  BLINK_MAX: 4.5,
  BLINK_TIME: 0.12,
  GLARE_EVERY: 3.5, // reflejo en los lentes
  GLARE_STEP: 0.07,
  LED_PERIOD: 1.2,
  LED_ON: 0.25,
  INVULN_BLINK: 0.07,
  HIT_FLASH_TIME: 2 / 60,
  CRUMB_EVERY: 0.09, // migajas de cacao al correr
  STEP_SOUND_EVERY: 0.25,
  SCARF_SEGMENTS: 6,
  SCARF_SEG_LEN: 2,
  RUN_ANIM_MIN_SPEED: 8,
};

// Enemigos de prueba (se reutilizan en el nivel 1)
export const ENEMIES = {
  BYTELING: {
    SPEED: 28,
    HP: 1,
    W: 12,
    H: 12,
    CONTACT_DAMAGE: 1,
    WALK_FPS: 6,
    SQUASH_TIME: 0.4,
    HIT_FLASH: 0.08,
  },
};

// Enemigos del Mundo Cartucho — docs/02_personajes.md y docs/niveles/nivel_1_mundo_cartucho.md
Object.assign(ENEMIES, {
  DISK: {
    SPEED: 26,
    W: 12,
    H: 12,
    SHELL_SPEED: 190, // disco pateado
    KICK_GRACE: 0.3, // tras patearlo, no daña a Choco este tiempo
    SHELL_WAKE: 7, // si nadie lo patea, se vuelve a parar
    WALK_FPS: 6,
  },
  MOSQUITO: {
    W: 10,
    H: 9,
    HP: 1,
    SPEED: 22, // avance horizontal
    RANGE: 40, // ida y vuelta desde su punto de origen
    WAVE_AMP: 9, // onda senoidal
    WAVE_PERIOD: 1.5,
    WING_FPS: 18,
  },
  ARMOR: {
    SPEED: 22,
    W: 12,
    H: 12,
    WALK_FPS: 5,
  },
  SPAM: {
    TRIGGER_DX: 22, // Choco a esta distancia horizontal debajo lo activa
    SHAKE_TIME: 0.4, // telegrafiado
    GRAVITY: 900,
    MAX_FALL: 340,
    SHADOW_TIME: 0.7, // lluvia del jefe: sombra previa en el suelo
  },
  CABLE: {
    TELEGRAPH: 0.6, // chispas antes de salir
    UP_TIME: 1.0,
    DOWN_TIME: 1.4,
    RISE_SPEED: 160, // px/s
    HEIGHT: 30,
  },
});

// Peligros y plataformas del nivel 1
export const HAZARDS = {
  STATIC_BAR: { BALL_SPACING: 8, BALL_R: 3, HIT_R: 3, SPEED: 1.5 }, // rad/s
  GEYSER: { WARN: 0.8, UP: 1.1, DOWN: 1.6, HEIGHT: 56, SPEED: 220 },
  FALLING_PLATFORM: { DELAY: 0.45, GRAVITY: 700, RESPAWN: 3 },
  MOVING_PLATFORM: { SPEED: 38 },
};

// Bloques Y (golpear desde abajo)
export const YBLOCK = {
  BUMP_TIME: 0.18,
  BUMP_HEIGHT: 5,
  MULTI_HITS: 6, // bloque de bits múltiples
  MULTI_WINDOW: 4, // segundos para sacarle todos los bits
};

// Mini-jefe: Guardián del Slot (48×48)
export const GUARDIAN = {
  W: 34,
  H: 40,
  HP: 3,
  SPEED_UP: 1.2, // +20 % tras cada pisotón
  IDLE_TIME: 0.9,
  CROUCH_TIME: 0.6, // telegrafiado del salto aplastante
  JUMP_VY: -360,
  JUMP_TIME: 0.75, // tiempo de vuelo hacia la posición de Choco
  SHOCKWAVE_SPEED: 130,
  SHOCKWAVE_H: 10,
  SCRAPE_TIME: 0.8, // telegrafiado de la embestida
  CHARGE_SPEED: 170,
  STUN_TIME: 2,
  RAIN_WINDUP: 0.5,
  RAIN_BLOCKS: [3, 5],
  RAIN_INTERVAL: 0.28,
  SHOT_PUSH: 6, // los disparos no hacen daño, pero lo empujan
  HURT_TIME: 0.8,
  INTRO_TIME: 1.6,
};

// Prólogo
export const PROLOGUE = {
  SQUARE_STAGGER: 0.28,
  SQUARE_FLIGHT: 1.9, // cámara lenta
  SUCK_TIME: 1.0,
  CRT_OFF_TIME: 1.0,
  TV_LINE_HOLD: 1.4,
  WIRE_REVEAL_DIST: 120, // a esta distancia los wireframes se empiezan a rellenar
  WIRE_REVEAL_FULL: 56,
};

export const PICKUPS = {
  BOB_AMPLITUDE: 2,
  BOB_SPEED: 3,
  HEAL: 1,
  // Lo que sale de un bloque Y salta hacia un lado y cae al suelo
  DROP_VX: 45,
  DROP_VY: -140,
  DROP_GRAVITY: 700,
};

// Vista Debug (Laptop) — se usa en hitos posteriores; aquí para las plataformas fantasma
export const LAPTOP = {
  BATTERY_MAX: 100,
  DRAIN: 22,
  RECHARGE: 18,
  RECHARGE_DELAY: 0.5,
  MIN_TO_REACTIVATE: 30,
};

// ============================================================================
// Nivel 2 · La UNA — docs/niveles/nivel_2_una.md
// ============================================================================

// Movimiento cenital (niveles 2 y 3) — docs/03_mecanicas.md
export const TOPDOWN = {
  WALK_SPEED: 70,
  ACCEL_TIME: 0.08, // tiempo para llegar a la velocidad máxima
  SNEAK_SPEED: 35, // nivel 3
  HITBOX_W: 10, // hitbox en los pies
  HITBOX_H: 8,
  WALK_FPS: 8,
  INTERACT_RANGE: 20, // px desde los pies hasta el objeto
  CAMERA_LERP: 0.14,
  // Estantes con ruedas (biblioteca)
  PUSH_DELAY: 0.14, // empujar contra el estante este tiempo antes de que se mueva
  PUSH_TIME: 0.22, // lo que tarda en deslizarse un tile
  PUSH_ALIGN: 6, // tolerancia de alineación (px) para empujar
  // Salto corto con las Botas sobre pilas de libros bajas
  HOP_TIME: 0.38,
  HOP_HEIGHT: 9,
  // Tras huir de una batalla: el bug se queda quieto y Choco parpadea
  FLEE_GRACE: 1.6,
  BUG_SPEED: 30,
  BUG_PAUSE: 0.6, // pausa en los extremos de la ruta
};

// Batallas por turnos
export const BATTLE = {
  ENERGY_PER_SQUARE: 10, // 10 de energía por cuadrito (20 en el nivel 2)
  RAM_MAX: 10,
  RAM_START: 6,
  RAM_REGEN: 2, // por turno
  COMPILE_DAMAGE: 4,
  CRIT_MULT: 1.5,
  WEAK_MULT: 2, // Compilar contra la debilidad revelada por Debug
  DEBUG_COST: 3,
  DEBUG_TURNS: 2,
  REFACTOR_COST: 4,
  REFACTOR_HEAL: 6,
  FORCE_COST: 7,
  FORCE_DAMAGE: 12,
  FORCE_FAIL: 0.25,
  FLEE_CHANCE: 0.6,
  // Golpe con timing: el marcador cruza la barra de ida y vuelta
  TIMING_SWEEP: 0.9, // segundos de un extremo al otro
  TIMING_SWEEPS: 2, // si no se presiona, sale un golpe normal al terminar
  TIMING_CRIT: 0.07, // media ventana del centro (fracción de la barra) → crítico
  TIMING_GOOD: 0.22, // media ventana "BIEN" (golpe normal con texto)
  // Defensa con timing: un destello marca el impacto
  DEFENSE_WINDUP: [0.7, 1.1], // anticipación del ataque (s), al azar en el rango
  DEFENSE_PERFECT: 1.5 / 60, // media ventana: 3 frames en total → daño 0
  DEFENSE_GOOD: 0.12, // media ventana → mitad del daño
  DEFENSE_EARLY_LOCK: 0.25, // presionar antes de esto no cuenta (y bloquea el intento)
  // Recompensa en bits por bug derrotado (se suma a la de cada bug)
  ITEMS: {
    cafe: { energy: 8, ram: 0, price: 15 },
    empanada: { energy: 4, ram: 3, price: 20 },
    galloPinto: { energy: 15, ram: 0, price: 40 },
  },
  INTRO_TIME: 0.9, // espiral de glitch al empezar
  MAX_ITEMS: 9, // por tipo
};

// Los 5 bugs del nivel 2 (docs/niveles/nivel_2_una.md)
export const BUGS = {
  nullPointer: { HP: 12, DAMAGE: 7, MISS: 0.5, BITS: 8 },
  loop: { HP: 16, DAMAGE: 3, LOOP_TURNS: 3, BITS: 10 },
  race: { HP: 14, DAMAGE: 3, FIRST_CHANCE: 0.5, DOUBLE_CHANCE: 0.3, BITS: 10 },
  leak: { HP: 18, DAMAGE: 2, LEAK: 1, BITS: 12 },
  spaghetti: { HP: 15, DAMAGE: 3, TANGLE_DAMAGE: 1, BITS: 10 },
};

// Batalla de rap contra MC Stack Overflow
export const RAP = {
  BPM: 90, // la mecánica depende de este tempo: la canción usa el mismo valor
  BEATS_PER_BAR: 4,
  LINE_BARS: 2, // cada línea de Stack dura 2 compases
  CHOOSE_BARS: 6, // compases para elegir respuesta
  ON_BEAT_WINDOW: 0.12, // confirmar a ±0.12 s del beat cuenta doble
  HYPE: 3, // barras de Choco
  FLOW: 3, // barras de Stack
  WEAK_FLOW: 0.5, // respuesta floja
  SCORE_CORRECT: 100,
  SCORE_WEAK: 40,
  OVERFLOW_DAMAGE: 4, // ataque de desbordamiento entre rondas (energía)
};

// Puzzles del nivel 2
export const PUZZLES = {
  BINARY_TARGETS: [37, 170, 233], // la tercera ronda se muestra en hexadecimal
  GATES_MAX_CHANGES: 3, // circuito 2: palancas que se pueden cambiar antes de reiniciar
  GATES_RESET_DELAY: 0.8,
};

export const AUDIO = {
  PITCH_VARIATION: 0.05, // ±5 % en efectos repetitivos
  MUSIC_FADE: 0.5,
  SCHEDULE_AHEAD: 0.12,
  SCHEDULER_INTERVAL_MS: 25,
};

export const TEXT = {
  CHARS_PER_SECOND: { slow: 25, normal: 50, instant: 10000 },
  PAUSE_COMMA: 0.08,
  PAUSE_PERIOD: 0.18,
};

export const TRANSITION = {
  FADE: 0.35,
  IRIS: 0.6,
  GLITCH: 0.45,
};
