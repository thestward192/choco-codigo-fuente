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

// ============================================================================
// Nivel 3 · Oficinas de Novacomp — docs/niveles/nivel_3_novacomp.md
// ============================================================================

// Sigilo: conos de visión, sospecha, alarma y ruido
export const STEALTH = {
  CONE_HALF: Math.PI / 6, // 60° de apertura
  BOT_RANGE: 80, // 72–96 px según el enemigo
  CAMERA_RANGE: 96,
  CONE_RAYS: 22, // rayos para dibujar el cono (la detección usa un rayo directo)
  DRONE_RADIUS: 28, // visión circular del dron
  SUSPICION_TIME: 0.7, // dentro del cono: el medidor se llena en este tiempo
  SUSPICION_TIME_CLOSE: 0.35, // ...o en este si Choco está cerca
  CLOSE_DIST: 32,
  SUSPICION_DECAY: 0.45, // por segundo al salir del cono (baja poco a poco)
  ALARM_TIME: 12,
  NOISE_RUN_RADIUS: 40, // caminar normal cerca de enemigos
  NOISE_SHOT_RADIUS: 80, // disparar o chocar con la aspiradora
  NOISE_RUN_EVERY: 0.35, // cada cuánto se emite el ruido de pasos
  BOT_SPEED: 30,
  BOT_INVESTIGATE_SPEED: 42,
  BOT_CHASE_SPEED: 60, // menos que caminar (70): se puede huir
  BOT_PAUSE: 0.8, // en los extremos de la ruta
  LOOK_AROUND: 1.6, // revisa el punto del "?" este tiempo
  REPATH_EVERY: 0.4,
  STUN_BOT: 2, // Báculo: aturde a un BotSeg
  STUN_CAMERA: 3, // ...y a una cámara
  STUN_DRONE: 2,
  CAMERA_SPEED: 0.7, // rad/s del barrido
  CAMERA_PAUSE: 1.0, // pausa en cada extremo del arco
  CAMERA_HACK_OFF: 10,
  DRONE_SPEED: 0.9, // rad/s alrededor de su centro
  DRONE_CHASE_SPEED: 52, // con la alarma baja a perseguir
  LASER_ON: 1.5,
  LASER_OFF: 1.3,
  LASER_WARN: 0.45, // parpadeo antes de prenderse
  LASER_HACK_OFF: 6,
  VACUUM_SPEED: 22,
  VACUUM_PUSH: 90, // empujón al chocar con Choco
  CONTACT_RESPAWN_DELAY: 0.6,
  HURT_KNOCKBACK: 130, // retroceso en cenital (láser, proyectiles)
};

// Hackeo con la laptop (minijuego de flechas) — docs/03_mecanicas.md
export const HACK = {
  NORMAL: { LENGTH: 5, TIME: 3 },
  TUTORIAL: { LENGTH: 4, TIME: 4 },
  SAFE: { LENGTH: 7, TIME: 2.5 }, // caja fuerte de gerencia
  BOSS: { LENGTH: 6, TIME: 3 }, // terminales de DEADLINE
  MAX_ERRORS: 3, // tres errores: alarma (o terminal bloqueada en el jefe)
  BOSS_LOCK: 5,
  ERROR_FLASH: 0.25,
};

// Nubes de vapor de Hezron
export const VAPOR = {
  CHARGES: 3, // por sección
  RADIUS: 24,
  DURATION: 6,
  THROW_DIST: 18, // la nube cae delante de Choco
  THROW_TIME: 0.25,
  FOLLOW_DIST: 16, // Hezron camina detrás de Choco
  FOLLOW_SPEED: 90,
  BALLOON_TIME: 1.8,
};

// Escudo Firewall — docs/03_mecanicas.md
export const SHIELD = {
  DURATION: 1.5,
  COOLDOWN: 3.5,
  MOVE_MULT: 0.6,
  PARRY_WINDOW: 0.15, // activarlo justo antes del impacto refleja el proyectil
  PARRY_HITSTOP: 6,
  RADIUS: 13,
  REFLECT_SPEED_MULT: 1.6,
};

// Disparo del Báculo en vista cenital (nivel 3)
export const TOPDOWN_SHOT = {
  MUZZLE: 9, // px delante de los pies
  HEIGHT: 7, // altura del disparo sobre el piso
};

// Jefe: DEADLINE
export const DEADLINE = {
  COUNTDOWN: 180, // 3:00
  COUNTDOWN_RESET: 60, // al vencerse: pierde un cuadrito y vuelve a 1:00
  HP_PER_THIRD: 8, // 8 disparos normales vacían un tercio
  THIRDS: 3,
  FREEZE: 6, // terminal hackeada: el reloj se congela y abre su pantalla
  REBOOT: 3, // si no se vació el tercio, la terminal se reinicia en este tiempo
  IDLE: [1.3, 1.0, 0.75], // pausa entre ataques por tercio
  // Invitaciones a reunión
  FAN_TELEGRAPH: 0.6,
  FAN_COUNTS: [[5, 8], [8, 8], [8, 11]], // abanicos por tercio
  FAN_SPREAD: [1.1, 1.5, 1.8], // rad
  FAN_SPEED: 70,
  FAN_GAP: 0.45, // entre el primer y el segundo abanico
  // Barrido de manecillas
  SWEEP_TELEGRAPH: 1.0,
  SWEEP_TIME: [3.4, 2.7, 2.1], // segundos por vuelta completa
  SWEEP_HIT: 5, // grosor (px) de la manecilla para el golpe
  // Notificaciones que persiguen
  NOTIF_COUNT: 3,
  NOTIF_SPEED: 46,
  NOTIF_TURN: 2.6, // rad/s
  NOTIF_LIFE: 4,
  NOTIF_TELEGRAPH: 0.5,
  CORE_R: 9, // radio del núcleo cuando la pantalla está abierta
  INTRO: 2.2,
};

// Torreta de práctica del escudo (al salir del nivel 3)
export const TURRET = {
  INTERVAL: 1.7,
  TELEGRAPH: 0.5,
  SPEED: 75,
  BLOCKS_NEEDED: 2,
  PARRIES_NEEDED: 2,
};

// ============================================================================
// Nivel 4 · Santa Cruz — docs/niveles/nivel_4_santa_cruz.md
// ============================================================================

// Calor — docs/03_mecanicas.md
export const HEAT = {
  MAX: 100,
  SUN_RATE: 11, // por segundo al sol
  SUN_RATE_BOSS2: 16, // fase 2 del Torito Kernel
  SHADE_RATE: 30, // baja por segundo en la sombra
  AFTER_DAMAGE: 40, // al llegar a 100 pierde un cuadrito y el medidor baja a esto
  DRIP_FROM: 60, // empieza a gotear y la pantalla ondula
  WAVE_ROWS: 14, // filas de arriba y de abajo que ondulan
  WAVE_AMP: 2, // px
  WATER_COOLDOWN: 0.8, // un bebedero no vuelve a sonar antes de esto
};

// Lazo de Fibra Óptica — docs/03_mecanicas.md
export const LASSO = {
  RANGE: 90,
  CONE_HALF: Math.PI / 3, // 120° de apertura
  MIN_LEN: 24,
  MAX_LEN: 90,
  REEL_SPEED: 70, // px/s al acortar (↑) o alargar (↓)
  THROW_SPEED: 700, // la punta viaja hasta el nodo
  GRAVITY: 900,
  PUMP: 260, // aceleración tangencial con ← →
  MAX_SPEED: 330,
  RELEASE_VY: -120,
  KEEP_MOMENTUM: 0.35, // segundos sin frenado en el aire tras soltar
  HAND_Y: -14, // la cuerda sale de la mano (relativo a los pies)
  PULL_HOP: -170, // al jalar algo (el núcleo de N.U.L.L.) Choco sale con un saltito
  HOOK_GRACE: 0.2, // al engancharse, ignora las plataformas de un sentido para salir de la cornisa
};

// Enemigos de Santa Cruz — docs/02_personajes.md
Object.assign(ENEMIES, {
  TORO: {
    W: 26,
    H: 16,
    HP: 4,
    WALK_SPEED: 18,
    SIGHT_X: 120, // ve a Choco a esta distancia horizontal
    SIGHT_Y: 28,
    SCRAPE: 0.8, // telegrafiado
    CHARGE_SPEED: 175,
    CHARGE_MAX: 220, // px máximos de embestida
    RECOVER: 0.9,
  },
  BOMBETERO: {
    W: 12,
    H: 18,
    HP: 2,
    RANGE: 170, // distancia horizontal para empezar a tirar
    INTERVAL: 2.4,
    TELEGRAPH: 0.6, // enciende la mecha
    FLIGHT: 1.0, // segundos de vuelo de la bombeta
  },
  BOMBETA: {
    R: 4,
    BLAST_R: 20,
    GRAVITY: 420,
    MARK_TIME: 0.5, // la marca en el suelo aparece antes de caer
  },
  SABANERO: {
    W: 12,
    H: 20,
    HP: 3,
    RANGE: 120,
    TELEGRAPH: 0.75, // gira el lazo sobre la cabeza
    ROPE_SPEED: 210,
    ROPE_RANGE: 130,
    PULL_SPEED: 70, // jala a Choco hacia él
    PULL_MAX: 2.2, // segundos máximos de jalón
    COOLDOWN: 2.2,
  },
  ZANATE: {
    W: 10,
    H: 8,
    HP: 1,
    WAKE_X: 110, // se alborotan cuando Choco se acerca
    TELEGRAPH: 0.45, // graznido y alas arriba antes de la picada
    DIVE_SPEED: 170,
    STAGGER: 0.5, // entre un zanate y el siguiente
  },
  TAMAL: {
    R: 6,
    SPEED: 80,
    INTERVAL: 3.2,
    WARN: 0.6, // la olla tiembla antes de soltarlo
    FUSE: 0.4, // explota al chocar con una pared
    LIFE: 6, // si no chocó con nada, se apaga solo
  },
});

// Columnas de sol de las ruinas (las plataformas que se desmoronan usan HAZARDS.FALLING_PLATFORM)
export const RUINS = {
  BEAM_W: 22, // ancho de una columna de sol
  BEAM_SPEED: 0.35, // rad/s de la oscilación
  BEAM_SWAY: 40, // px de vaivén
};

// El Redondel: sección de arena con 3 oleadas
export const REDONDEL = {
  SURVIVE: 60, // o derrotar KILLS toros
  KILLS: 6,
  WAVES: [
    { at: 0, toros: [-1] },
    { at: 18, toros: [1, -1] },
    { at: 36, toros: [-1, 1, 1] },
  ],
  BOMB_EVERY: [4.5, 3.2, 2.4], // bombetas que caen del cielo por oleada
  GOLDEN_WAVE: 2, // la Y dorada aparece en la tercera oleada (índice 2)
};

// Jefe: El Torito Kernel (80×56)
export const TORITO = {
  W: 64,
  H: 44,
  HP: 30,
  IDLE: [1.1, 0.8],
  SCRAPE: 0.8,
  CHARGE_SPEED: 210,
  STUN_COLUMN: 3,
  STUN_PARRY: 2,
  REAR: 0.7, // se para en dos patas antes del pisotón
  SHOCK_SPEED: 140,
  SHOCK_H: 10,
  NOSE_TELEGRAPH: 0.6,
  BOMB_FAN: [-44, 0, 44], // px respecto a Choco
  BOMB_FLIGHT: 1.1,
  SMOKE_TELEGRAPH: 0.5,
  SMOKE_TIME: 3,
  COLUMN_HITS: 2, // en la fase 2 una columna aguanta esto antes de romperse
  CHIP: { W: 12, H: 18, FROM_FLOOR: 6 }, // punto débil en la parte de atrás
  INTRO: 1.8,
};

// ---------- Nivel 5 · El Código Puro (docs/niveles/nivel_5_codigo_puro.md) ----------
// El Stack: escalada vertical por secciones (Push, Firewall, Memoria fantasma, Punteros, Overflow)
export const STACK = {
  PUSH_DELAY: 0.3, // la siguiente plataforma del Push aparece tras pisar la anterior
  PUSH_SLIDE: 0.45, // tarda en deslizarse desde la pared
  SEGMENT_DELAY: 0.5, // Segmento corrupto: desaparece 0.5 s después de pisarlo
  SEGMENT_RESPAWN: 2.6,
  FIREWALL_KNOCKBACK: 150, // sin escudo, el fuego empuja hacia atrás
  TURRET_INTERVAL: 2.4,
  TURRET_TELEGRAPH: 0.6,
  TURRET_SPEED: 80,
  TURRET_RANGE: 190, // solo dispara si Choco está a esta distancia
  BULLET_LIFE: 5,
  RETURN_SPEED: 240, // una bala devuelta con parry vuela hacia quien la disparó
  EXCEPTION_WARN: 0.8, // Excepción: aviso en el borde de la pantalla antes de cruzarla
  EXCEPTION_SPEED: 140,
  EXCEPTION_EVERY: { D: 3.4, E: 2.6 }, // por sección
  FRAGMENT: { HP: 1, SPEED: 115, TELEGRAPH: 0.5, RANGE: 120, DASH: 0.9, REST: 0.9, W: 10, H: 10 },
  OVERFLOW_SPEED: 12, // px/s: la masa de datos corruptos sube a ritmo constante
  OVERFLOW_DELAY: 2.5, // tiempo antes de que empiece a subir
  OVERFLOW_START: 40, // px debajo del suelo de la sección
  OVERFLOW_PUSHBACK: 56, // al tocarla, baja un poco para dar aire
  ECHO_TIME: 3.6, // los consejos de los ecos de los fundadores
};

// Jefe final: N.U.L.L. (4 fases + el parche)
export const NULL_BOSS = {
  W: 64,
  H: 64,
  INTRO: 1.2,
  PHASE_PAUSE: 3, // pausa entre fases (diálogo y consejo); se recupera 1 cuadrito
  HOVER_Y: 58, // centro del monitor en el tercio superior (debajo de la barra del jefe)
  P1: {
    HP: 6, // 6 golpes (o 2 cargados)
    SLAM_TELEGRAPH: 0.6, // levanta las alas antes de golpear el suelo
    WAVE_SPEED: 125,
    WAVE_LOW_H: 10,
    WAVE_HIGH: [16, 38], // banda alta: de 16 a 38 px sobre el suelo
    GAP: 0.42, // separación entre ondas dobles y triples
    HIGH_DELAY: 0.5, // la alta llega después de la baja: hace falta el doble salto
    PILLAR_WARN: 0.5,
    PILLAR_UP: 0.6,
    PILLAR_H: 76,
    WINDOW: 3, // ventana de daño: el monitor baja a la altura de las plataformas
    WINDOW_Y: 100,
    REST: 0.8,
  },
  P2: {
    HITS: 4, // solo las balas devueltas con parry le hacen daño
    TELEGRAPH: 0.6,
    BULLET_SPEED: 68,
    REFLECT_EVERY: 4, // una de cada tantas es reflejable (magenta con borde blanco)
    SPIRAL_TIME: 3.6,
    SPIRAL_RATE: 0.13,
    FAN_N: 7,
    FAN_SPREAD: 1.2, // rad
    FAN_WAVES: 3,
    FAN_GAP: 0.8,
    RAIN_TIME: 3.4,
    RAIN_RATE: 0.2,
    REST: 1.1,
  },
  P3: {
    HITS: 8, // golpes al punto débil de la real
    COPIES: 3,
    SHOT_EVERY: [2.0, 3.2],
    SHOT_TELEGRAPH: 0.6,
    SHOT_SPEED: 74,
    FRAGMENTS: 3, // una copia falsa explota en estos Fragmentos
    FAKE_RESPAWN: 2.2,
    SHUFFLE: 0.6, // las copias se barajan tras cada golpe a la real
    DARK: 0.66,
    DRIFT: 6, // px de vaivén de las copias
  },
  P4: {
    PULLS: 3, // 3 jalones + 3 disparos cargados
    ORBIT_RX: 112,
    ORBIT_RY: 36,
    ORBIT_CY: 72,
    ORBIT_SPEED: 0.42, // rad/s
    LASER_EVERY: 3.4,
    LASER_WARN: 0.8, // línea fina antes del barrido
    LASER_SWEEP: 1.1,
    LASER_ARC: 1.0, // rad que barre
    LASER_LEN: 380,
    LASER_HIT: 4, // px de grosor que hacen daño
    HOOK_DIST: 44, // el núcleo es enganchable si pasa así de cerca de un nodo
    EXPOSE: 3, // tras el jalón, el núcleo queda expuesto
    PLATFORM_ON: 4.2,
    PLATFORM_OFF: 2,
    PLATFORM_BLINK: 0.8, // parpadea antes de desaparecer
    COLLAPSE_TIME: 1.6, // el suelo se derrumba en píxeles
  },
};

// Minijuego del parche: 4 líneas de 6 flechas en 20 s
export const PATCH = {
  LINES: 4,
  ARROWS: 6,
  TIME: 20,
  ERROR_FLASH: 0.3,
  TYPE_SPEED: 40, // letras por segundo al escribir cada línea
};

// Modo Hotfix (se desbloquea al terminar el juego): 1 cuadrito fijo, sin cacao, la mitad de los
// checkpoints. Lista de checkpoints que se apagan por nivel.
export const HOTFIX = {
  MAX_HP: 1,
  SKIP_CHECKPOINTS: { 1: [1], 2: [1], 3: ['openspace', 'servers'], 4: [1, 3], 5: [1] },
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
