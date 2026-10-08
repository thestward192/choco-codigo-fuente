# 07 · Arquitectura técnica

## Stack

- **JavaScript moderno (ES2022) con módulos ES**, sin frameworks ni motores de juego.
- **HTML5 Canvas 2D** para todo el render.
- **Web Audio API** para música y efectos.
- **Vite** solo como servidor de desarrollo y empaquetador (`npm run dev`, `npm run build`). El build final es una carpeta estática (`dist/`) que se puede subir a cualquier hosting o abrir con un servidor local.
- **Vitest** para pruebas unitarias de la lógica pura (física, colisiones, batallas, guardado, puzzles).
- Sin dependencias en tiempo de ejecución.
- **Modo cooperativo:** WebSocket nativo del navegador y un servidor de salas en Node sin dependencias (`server/`). Detalle en `docs/coop/04_red.md`.

## Estructura de carpetas

```
choco-codigo-fuente/
├── index.html
├── package.json
├── vite.config.js
├── assets/
│   └── logo_chc_studio.png
├── docs/                       ← diseño (esta carpeta)
├── src/
│   ├── main.js                 ← arranque
│   ├── config/
│   │   ├── balance.js          ← TODOS los números de gameplay
│   │   └── controls.js         ← mapeo por defecto
│   ├── core/
│   │   ├── game.js             ← loop de paso fijo + gestor de escenas
│   │   ├── renderer.js         ← canvas interno 320×180, escalado, capas
│   │   ├── input.js            ← teclado, gamepad, buffer, remapeo
│   │   ├── camera.js
│   │   ├── audio.js            ← motor Web Audio, buses, secuenciador
│   │   ├── save.js             ← localStorage con try/catch, 3 ranuras
│   │   ├── tween.js            ← easing y tweens
│   │   ├── particles.js        ← pool de partículas
│   │   ├── effects.js          ← shake, hit-stop, flash, glitch, transiciones
│   │   ├── lighting.js         ← capa de oscuridad y luces
│   │   ├── rng.js              ← aleatorio con semilla
│   │   └── debug.js            ← overlay de depuración
│   ├── systems/
│   │   ├── physics.js          ← física de plataformas y colisión con tilemap
│   │   ├── topdown.js          ← movimiento cenital
│   │   ├── tilemap.js
│   │   ├── vision.js           ← conos de visión con raycast (nivel 3)
│   │   ├── dialogue.js         ← cajas de diálogo y scripts
│   │   ├── cutscene.js         ← secuencias de cinemática por pasos
│   │   ├── battle.js           ← batallas por turnos (nivel 2)
│   │   └── hacking.js          ← minijuego de flechas
│   ├── entities/
│   │   ├── choco.js            ← estados: platformer / topdown
│   │   ├── projectile.js
│   │   ├── enemies/            ← un archivo por enemigo
│   │   ├── bosses/             ← un archivo por jefe
│   │   ├── npcs/
│   │   └── pickups.js
│   ├── items/                  ← botas, laptop, escudo, lazo
│   ├── levels/
│   │   ├── level0_prologo/
│   │   ├── level1_cartucho/
│   │   ├── level2_una/
│   │   ├── level3_novacomp/
│   │   ├── level4_santacruz/
│   │   └── level5_codigo/      ← cada uno con mapas (datos), script y escena
│   ├── scenes/
│   │   ├── SplashScene.js
│   │   ├── TitleScene.js
│   │   ├── MainMenuScene.js
│   │   ├── SlotSelectScene.js
│   │   ├── WorldMapScene.js
│   │   ├── LevelTitleScene.js
│   │   ├── PauseScene.js
│   │   ├── OptionsScene.js
│   │   ├── ResultsScene.js
│   │   ├── GameOverScene.js
│   │   ├── EndingScene.js
│   │   └── CreditsScene.js
│   ├── art/
│   │   ├── bake.js             ← convierte definiciones en spritesheets
│   │   ├── font.js             ← fuente bitmap con tildes y ñ
│   │   ├── palettes.js
│   │   ├── choco.js, null.js, founders.js, enemies/, tiles/, ui/
│   ├── audio/
│   │   ├── sfx.js
│   │   └── songs/
│   ├── ui/                     ← HUD, menús, widgets, cajas de texto
│   └── data/
│       ├── dialogues.js        ← todos los textos del juego en un solo lugar
│       └── items.js
└── tests/
```

## Loop del juego

- **Paso fijo de 1/60 s** con acumulador; el render interpola o simplemente dibuja el último estado.
- Tope de 5 pasos de simulación por frame para evitar la "espiral de la muerte" si la pestaña se pausa.
- Pausar automáticamente al perder el foco de la ventana.
- Hit-stop implementado a nivel del loop (congela la simulación, no el render de efectos).

## Escenas

- Pila de escenas (`push`, `pop`, `replace`) para que la pausa y los diálogos se superpongan al nivel sin destruirlo.
- Cada escena implementa `enter()`, `exit()`, `update(dt)`, `draw(ctx)`.
- Transiciones como escenas o efectos gestionados por el gestor de escenas.

## Entidades

- Clases simples con composición (no un ECS completo): cada entidad tiene posición, velocidad, hitbox, máquina de estados y animador.
- **Máquinas de estados explícitas** para Choco, enemigos y jefes (por ejemplo: `idle → telegraph → attack → recover`). Los jefes con fases usan una máquina de fases encima.
- Pool de objetos para proyectiles y partículas (sin crear basura en cada frame).

## Niveles como datos

- Mapas definidos como arreglos de strings (cada carácter un tipo de tile) o JSON generado a mano, más una lista de entidades con posición y parámetros.
- Scripts de nivel (cinemáticas, triggers, diálogos) como funciones declarativas separadas del mapa.
- Diseñar los mapas pensando en la cámara: nunca ocultar un peligro fuera de cuadro.

## Guardado

- Clave `choco-codigo-fuente:v1:slot{n}` y `choco-codigo-fuente:v1:options`.
- Versión en el objeto guardado para poder migrar en el futuro.
- Todo acceso a `localStorage` dentro de try/catch; si falla, se guarda en memoria y se muestra un aviso.

## Herramientas de desarrollo

- `?debug=1` en la URL habilita:
  - Overlay con FPS, hitboxes, estado de la máquina de Choco, conos de visión y cámara.
  - Selector de nivel y de sección, invencibilidad, dar todos los objetos, ajustar vida.
  - Tecla para avanzar frame a frame.
- Estas herramientas no deben existir en el build de producción (usar `import.meta.env.DEV`).

## Rendimiento

- 60 FPS estables en una laptop promedio en Chrome, Firefox y Edge.
- Dibujar solo los tiles visibles.
- Sprites horneados una vez; nada de `getImageData` por frame.
- Efectos de glitch con `drawImage` de franjas, no con manipulación de píxeles en cada frame.

## Calidad de código

- Código y comentarios en español o inglés, pero consistente (recomendado: identificadores en inglés, textos del juego en español).
- Funciones pequeñas, sin lógica de gameplay dentro de funciones de dibujo.
- Todos los números de balance en `config/balance.js`.
- Todos los textos visibles en `data/dialogues.js` (facilita corregir chistes y ortografía).
- Pruebas unitarias para: colisiones AABB y tilemap, salto (altura alcanzada), batalla por turnos (daño, estados, gimmicks), puzzles (validación), guardado (serialización, fallo de localStorage).
