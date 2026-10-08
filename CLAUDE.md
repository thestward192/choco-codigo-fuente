# CLAUDE.md · Contexto para Claude Code

Este repositorio es **CHOCO: CÓDIGO FUENTE**, un juego de pixel art en JavaScript + HTML5 Canvas de **CHC Studio**, creado por **Stward Serrano**.

## Fuente de verdad

Todo el diseño está en `docs/`. Antes de implementar cualquier parte, leé el documento correspondiente:

- Visión y alcance: `docs/00_vision.md`
- Historia y diálogos: `docs/01_historia.md`
- Personajes y enemigos: `docs/02_personajes.md`
- Mecánicas y números: `docs/03_mecanicas.md`
- Arte y animación: `docs/04_arte.md`
- Audio: `docs/05_audio.md`
- Menús e interfaz: `docs/06_menus_ui.md`
- Arquitectura: `docs/07_arquitectura.md`
- Plan por hitos: `docs/08_plan_desarrollo.md`
- Niveles: `docs/niveles/nivel_0_prologo.md` a `docs/niveles/nivel_5_codigo_puro.md`
- **Modo cooperativo (Modo Sincronizado):** todo en `docs/coop/`
  - Visión: `docs/coop/00_vision_coop.md` · Historia: `docs/coop/01_historia_coop.md` · Tapita: `docs/coop/02_tapita.md`
  - Mecánicas: `docs/coop/03_mecanicas_coop.md` · Red y servidor: `docs/coop/04_red.md` · Menús: `docs/coop/05_menus_coop.md`
  - Arte y audio: `docs/coop/06_arte_audio_coop.md` · Plan (hitos 9–16): `docs/coop/08_plan_coop.md`
  - Niveles: `docs/coop/niveles/c1_puntarenas.md` a `docs/coop/niveles/c4_la_sala.md`

Si algo no está definido en los documentos, tomá la decisión más razonable, anotala en `docs/DECISIONES.md` (crealo si no existe) y mencionala al terminar el hito. Si algo en los documentos se contradice, preguntá antes de construir sobre eso.

## Reglas

1. **Trabajar por hitos** (`docs/08_plan_desarrollo.md`; los hitos 9–16 del cooperativo están en `docs/coop/08_plan_coop.md`). Al terminar cada uno: correr `npm test`, verificar que el juego arranca sin errores en consola, y parar para que Stward lo pruebe. Entregar una lista breve de qué probar.
2. **Sin motores ni frameworks de juego.** Solo JavaScript, Canvas 2D y Web Audio. Vite y Vitest como herramientas de desarrollo.
3. **Todo el arte y el audio se generan en código.** El único archivo de imagen es `assets/logo_chc_studio.png`, y se usa solo en la presentación y los créditos. No influye en el diseño de Choco.
4. **Originalidad:** nada de personajes, sprites, sonidos, melodías, nombres ni logos de juegos o compañías existentes (Nintendo, Game Freak, Sony, etc.), ni logos oficiales de la UNA o Novacomp. Los niveles se inspiran en géneros, no en juegos concretos.
5. **Pixel perfect:** resolución interna 320×180, escalado entero, sin suavizado, cámara redondeada a píxel.
6. **Calidad de animación alta:** squash & stretch, anticipación, hit-stop, partículas, screen shake y transiciones en todo el juego (`docs/04_arte.md`).
7. **Números en `src/config/balance.js`** y **textos en `src/data/dialogues.js`**. Nada de números mágicos de gameplay dispersos.
8. **Español de Costa Rica** en todos los textos del juego (voseo, tono cálido, humor de ingeniería). Revisar tildes y signos de apertura ¿ ¡.
9. **Los chistes de los fundadores (Óscar, Stward, Hezron, Fabiola) son cariñosos**, nunca humillantes.
10. **Dificultad exigente pero justa:** todo ataque telegrafiado, nada de peligros fuera de cámara.
11. **`localStorage` siempre dentro de try/catch**; el juego debe funcionar aunque no se pueda guardar.
12. **Créditos:** solo "Creador: Stward Serrano" y "CHC Studio" con su logo.

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build estático en dist/
npm test         # pruebas unitarias (Vitest)
```

Modo depuración: agregar `?debug=1` a la URL.

Modo cooperativo (desde el Hito 9): `npm run server` levanta el servidor de salas y `npm run dev:coop` levanta juego y servidor juntos. El modo solo no debe cambiar nunca por culpa del cooperativo.
