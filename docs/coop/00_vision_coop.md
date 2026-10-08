# Coop 00 · Visión del modo cooperativo

## Ficha

- **Nombre del modo:** **Modo Sincronizado** (en el menú: "Cooperativo").
- **Jugadores:** 2, cada uno en su propia computadora, conectados por internet o por red local.
- **Conexión:** WebSocket, con salas que se crean y se comparten con un **código de 5 caracteres**.
- **Personajes:** **Choco**, con todas sus habilidades del modo normal, y **Tapita**, un personaje nuevo con habilidades propias (ver `docs/coop/02_tapita.md`).
- **Género:** plataformas con **puzzles cooperativos asimétricos**. Cada personaje puede hacer cosas que el otro no, y ninguna sala se resuelve en solitario.
- **Contenido:** 3 mapas nuevos y un nivel final. Cada uno tiene su jefe.
- **Duración objetivo:** 60–80 minutos en total para una pareja que juega por primera vez.

## Premisa en una línea

Choco abre el juego al modo multijugador para jugar con su amiga Tapita, y por el puerto recién abierto se cuela **L.A.G.**, un virus que vive en el atraso de la conexión y que separa todo lo que toca. Los dos tienen que sincronizarse para sacarlo por el puerto, la piscina y la paila antes de que corte la conexión para siempre.

## Pilares

1. **Siempre se necesita al compañero.** Toda sala, todo puzzle y todo jefe exige que los dos hagan algo. No existe una sala que un solo jugador pueda terminar mientras el otro espera.
2. **Asimetría clara.** Choco no aguanta el calor pero puede meterse al agua. Tapita aguanta el calor pero el agua la disuelve. Choco es alto, ágil y ataca de lejos; Tapita es baja, pesada y golpea de cerca. Cada sala juega con esas diferencias.
3. **Se entiende sin hablar.** Los jugadores pueden no tener chat de voz. Las salas se leen con colores y formas, y existe un botón de **señal** (ver mecánicas) para marcar un punto en el mapa.
4. **Mismo estilo y calidad.** Pixel art 320×180, todo generado en código, squash & stretch, partículas, hit-stop y humor tico, igual que el modo normal.
5. **El modo normal no cambia.** El modo solo sigue exactamente igual. El cooperativo es un modo aparte que se elige desde la primera pantalla.

## Estructura

| # | Mapa | Ambiente | Peligro dominante | Jefe |
|---|---|---|---|---|
| C1 | **Puntarenas: el Puerto** | Muelle, contenedores, grúas, ferry, marea | Agua (marea) y arena caliente | El Pulpo Estibador |
| C2 | **La casa de Juan Carlos** | Garaje, piscina, rancho con parrilla | Agua (piscina, aspersores) y brasas | El Limpiafondos 3000 |
| C3 | **La Chicharronera** | Parqueo, cocina de pailas, bodega fría | Calor (aceite, fogones) | La Paila Mayor |
| C4 | **La Sala** (final) | El interior de la conexión: paquetes y cables de datos | Latencia y desincronización | L.A.G. |

- Cada mapa tiene **3 secciones de puzzles** más la arena del jefe. El final tiene 2 secciones más el jefe.
- Los mapas C1 a C3 se pueden jugar en cualquier orden. C4 se abre al terminar los tres.

## Qué se reutiliza del modo normal

- Motor, física de plataformas, cámara, partículas, efectos, audio, fuente, diálogos, cinemáticas, pausa, opciones y controles.
- Choco completo: báculo apuntado, doble salto, Vista Debug, escudo y lazo.
- Elementos del modo normal que encajan: plataformas fantasma, nodos de lazo, plataformas de un sentido, calor y sombra.

## Fuera de alcance del modo cooperativo (por ahora)

- Cooperativo local en el mismo teclado o la misma pantalla.
- Más de 2 jugadores, modo competitivo, chat de texto o voz.
- Emparejamiento automático con desconocidos: solo se juega con código.
- Cuentas de usuario o guardado en el servidor: el progreso se guarda en el navegador de cada jugador.

## Documentos del modo cooperativo

- Historia y diálogos: `docs/coop/01_historia_coop.md`
- Tapita (personaje nuevo): `docs/coop/02_tapita.md`
- Mecánicas y elementos de puzzle: `docs/coop/03_mecanicas_coop.md`
- Red, salas y servidor: `docs/coop/04_red.md`
- Menús, sala de espera y HUD: `docs/coop/05_menus_coop.md`
- Arte y audio de los mapas nuevos: `docs/coop/06_arte_audio_coop.md`
- Plan por hitos: `docs/coop/08_plan_coop.md`
- Niveles: `docs/coop/niveles/c1_puntarenas.md` a `docs/coop/niveles/c4_la_sala.md`
