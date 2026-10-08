# 00 · Visión del juego

## Ficha

- **Título:** CHOCO: CÓDIGO FUENTE
- **Estudio:** CHC Studio
- **Creador:** Stward Serrano
- **Plataforma:** Navegador (escritorio), JavaScript + HTML5 Canvas, sin motores externos
- **Género:** Aventura de pixel art que cambia de género en cada nivel
- **Idioma:** Español de Costa Rica (voseo, expresiones ticas, humor de ingeniería)
- **Duración objetivo:** 60–90 minutos en la primera partida, con muertes incluidas
- **Controles:** Teclado y gamepad

## Premisa en una línea

Una barra de chocolate ingeniera entra a su consola para detener a la IA que ella misma dejó abandonada, recorriendo sus recuerdos corruptos: la universidad, el trabajo y el pueblo donde vive.

## Pilares de diseño

1. **Cada nivel es otro juego.** Plataformas clásico, RPG cenital con batallas por turnos, sigilo, plataformas de acción con calor, y un jefe final tipo bullet hell. Cambiar de género es la sorpresa central.
2. **Los objetos se acumulan.** Cada nivel entrega un objeto que se vuelve necesario en los siguientes. El jefe final exige usar los cuatro.
3. **Difícil pero justo.** El jugador muere por errores propios, nunca por controles imprecisos o trampas invisibles. Patrones aprendibles, telegrafiado claro de ataques, checkpoints escasos pero bien ubicados.
4. **Personal y con humor.** Lugares reales (UNA, Novacomp, Santa Cruz) y los cuatro fundadores de CHC Studio con sus chistes internos. El tono es cálido, nunca burlón.
5. **Pulido visible.** Animaciones con anticipación y rebote, partículas, screen shake, transiciones, efectos de glitch. Todo debe sentirse vivo.

## Estructura del juego

| # | Mundo | Género | Fundador rescatado | Objeto obtenido |
|---|---|---|---|---|
| 0 | Prólogo: cuarto de Choco + Pantalla de Carga | Tutorial | — | Báculo Compilador |
| 1 | Mundo Cartucho | Plataformas clásico | Óscar | Botas de Doble Salto |
| 2 | UNA | RPG cenital + batallas por turnos | Stward | Laptop Debugger |
| 3 | Oficinas de Novacomp | Sigilo cenital | Hezron | Escudo Firewall |
| 4 | Santa Cruz, Guanacaste | Plataformas de acción con calor | Fabiola | Lazo de Fibra Óptica |
| 5 | El Código Puro | Gauntlet + jefe de 4 fases | (todos) | Trofeo del Código Fuente |

## Modo cooperativo

Además del modo solo, el juego tiene un **modo cooperativo en línea para 2 jugadores** (Modo Sincronizado). Se elige desde la primera pantalla, después del título. Tiene un personaje nuevo, Tapita, 3 mapas nuevos con puzzles cooperativos y un nivel final, cada uno con su jefe. Todo su diseño está en `docs/coop/` (empezando por `docs/coop/00_vision_coop.md`). El modo solo no cambia.

## Fuera de alcance (por ahora)

- Multijugador competitivo, más de 2 jugadores, cooperativo local en el mismo teclado, tablas de puntuación en línea
- Versión móvil táctil (se puede evaluar después)
- Editor de niveles

## Reglas de propiedad intelectual

Los niveles toman el **estilo** de géneros clásicos, pero todo el arte, los personajes, los nombres y la música son **originales**. No usar personajes, sprites, sonidos, nombres ni logos de Nintendo, Game Freak, Sony u otras compañías. No usar los logos oficiales de la UNA ni de Novacomp: solo el nombre del lugar y una ambientación inspirada en él. La consola del cuarto de Choco es genérica.
