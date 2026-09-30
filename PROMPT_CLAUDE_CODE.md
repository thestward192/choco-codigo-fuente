# Prompt para Claude Code

Copiá todo lo que está dentro del bloque de abajo y pegalo como primer mensaje en Claude Code, con esta carpeta abierta.

---

```
Vamos a construir CHOCO: CÓDIGO FUENTE, un juego de pixel art en JavaScript + HTML5 Canvas, de CHC Studio, creado por Stward Serrano.

Todo el diseño ya está escrito en esta carpeta. Antes de escribir código:

1. Leé CLAUDE.md completo y respetá sus reglas.
2. Leé todos los documentos de docs/ y docs/niveles/ en orden (00 a 08, luego nivel_0 a nivel_5).
3. Haceme un resumen corto (máximo 15 líneas) de cómo entendiste el juego, y listá cualquier contradicción o duda importante que encuentres en los documentos. Si no hay dudas bloqueantes, seguí sin esperar.

Después, trabajá siguiendo docs/08_plan_desarrollo.md, un hito a la vez:

- Empezá por el Hito 0 (base técnica) y el Hito 1 (Choco y la física de plataformas).
- Al terminar cada hito: corré npm test, verificá que el juego arranca sin errores en la consola del navegador, anotá en docs/DECISIONES.md las decisiones que tomaste que no estaban en los documentos, y pará. Dame una lista corta de qué probar y cómo correrlo.
- No pasés al siguiente hito hasta que yo lo apruebe.

Prioridades de calidad, en este orden:
1. Que se sienta bien al jugar: controles precisos y responsivos (coyote time, buffer de salto, salto variable).
2. Animaciones con vida: squash & stretch, anticipación, hit-stop, partículas, screen shake y transiciones.
3. Pixel perfect: 320×180 interno, escalado entero, sin suavizado.
4. Código ordenado: números de balance en src/config/balance.js y textos en src/data/dialogues.js.

Todo el arte y el audio se generan en código (sprites como arreglos de strings horneados a canvas, música y efectos con Web Audio). El único archivo de imagen es assets/logo_chc_studio.png, solo para la presentación y los créditos.

Los niveles se inspiran en géneros clásicos (plataformas, RPG cenital, sigilo), pero todo el arte, los personajes, la música y los nombres deben ser originales.

Empezá.
```

---

## Consejos para trabajar con Claude Code

- **Probá bien el Hito 1 antes de aprobarlo.** Si el salto no se siente bien, pedí ajustes concretos: "el salto se siente flotante", "frena muy lento", "quiero que caiga más rápido".
- **Pedí cambios pequeños y concretos**, por ejemplo: "hacé que el Toro glitch telegrafíe 0.2 s más" o "cambiá la frase de Hezron en la terraza por...".
- **Si un nivel es muy difícil o muy fácil**, pedí que ajuste solo `src/config/balance.js`.
- **Para retomar en otra sesión**, decile: "Leé CLAUDE.md, docs/08_plan_desarrollo.md y docs/DECISIONES.md, y decime en qué hito vamos."
- **Chistes y diálogos:** están todos en `src/data/dialogues.js`, así que podés editarlos vos directamente.
