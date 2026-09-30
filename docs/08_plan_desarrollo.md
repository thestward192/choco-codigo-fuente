# 08 · Plan de desarrollo

El juego se construye **por hitos**. Al terminar cada hito, el juego debe poder correrse y probarse, y se debe esperar la revisión del creador (Stward) antes de pasar al siguiente. Cada hito termina con una lista corta de qué probar.

## Hito 0 · Base técnica

- Proyecto con Vite, estructura de carpetas, `npm run dev`, `npm run build`, `npm test`.
- Loop de paso fijo, gestor de escenas, renderer 320×180 con escalado entero, input (teclado + gamepad + buffer), cámara, tween, partículas, efectos (shake, hit-stop, flash, transiciones).
- Horneador de sprites y fuente bitmap con tildes y ñ.
- Motor de audio con un efecto y una melodía de prueba.
- Overlay de depuración con `?debug=1`.
- **Probar:** una escena de prueba con un cuadrado que se mueve, texto con tildes, sonido al presionar una tecla, escalado al cambiar el tamaño de la ventana.

## Hito 1 · Choco y la física de plataformas

- Sprite completo de Choco con todas las animaciones de plataformas (ver `docs/02_personajes.md`).
- Física de `docs/03_mecanicas.md`: coyote time, buffer, salto variable, colisión con tilemap y tipos de tile.
- Báculo: disparo normal y cargado.
- Sistema de vida (barra de chocolate), daño, invencibilidad, muerte con animación de derretirse.
- **Probar:** una sala de pruebas donde el salto se sienta perfecto. Este hito es crítico: si el salto no se siente bien, nada más importa.

## Hito 2 · Menús, HUD y guardado

- Presentación con el logo, título, menú principal, ranuras, mapa de mundos (explorador de archivos), pausa, opciones, game over, resultados, créditos.
- HUD completo (con elementos que se activan según los objetos).
- Guardado en 3 ranuras con try/catch.
- Cajas de diálogo con retratos y sistema de cinemáticas.

## Hito 3 · Prólogo y Nivel 1

- Prólogo completo con cinemática "La barra rota" y Pantalla de Carga.
- Nivel 1 completo: 3 secciones, enemigos, bloques Y, Grano de Cacao, Guardián del Slot, rescate de Óscar, Botas de Doble Salto, 3 Y doradas.
- Música del título, del cuarto y del nivel 1.

## Hito 4 · Nivel 2 (UNA)

- Movimiento cenital, mapa de interiores, NPCs, soda, terminal de guardado.
- Los 3 puzzles.
- Sistema de batallas por turnos completo con los 5 bugs, timing de ataque y defensa.
- Batalla de rap sincronizada con el beat.
- Rescate de Stward, Laptop Debugger (y Vista Debug funcionando también en plataformas).

## Hito 5 · Nivel 3 (Novacomp)

- Sistema de sigilo: conos con raycast, sospecha, alarma, ruido, escondites.
- Hackeo.
- Hezron como acompañante con nubes de vapor.
- Jefe DEADLINE.
- Escudo Firewall con parry.

## Hito 6 · Nivel 4 (Santa Cruz)

- Mecánica de calor y sombras.
- Enemigos, redondel, ruinas verticales, misión de la rosquilla.
- Jefe El Torito Kernel.
- Lazo de Fibra Óptica con física de péndulo y sección de práctica.

## Hito 7 · Nivel 5 y final

- El Stack con subida del Overflow.
- N.U.L.L. con sus 4 fases y el minijuego del parche.
- Cinemática final, epílogo, estadísticas, créditos y escena extra.
- Modo Hotfix.

## Hito 8 · Pulido y balance

- Música completa y todos los efectos de sonido.
- Revisión de animaciones y efectos (partículas, shake, transiciones) en todo el juego.
- Balance de dificultad: tiempos objetivo por nivel (ver cada documento), ajustando solo `config/balance.js`.
- Revisión de todos los textos (ortografía, tildes, tono tico).
- Pruebas en Chrome, Firefox y Edge; con teclado y gamepad.
- Build de producción limpio sin herramientas de debug.

## Definición de "terminado" para cada hito

- Se puede jugar de principio a fin lo que corresponde al hito sin errores en la consola.
- `npm test` pasa.
- Todo número de balance está en `config/balance.js` y todo texto visible en `data/dialogues.js`.
- Se entregó una lista de qué probar y qué decisiones de diseño se tomaron que no estaban en los documentos.
