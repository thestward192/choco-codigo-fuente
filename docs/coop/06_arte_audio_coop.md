# Coop 06 · Arte y audio del modo cooperativo

Las reglas generales de `docs/04_arte.md` y `docs/05_audio.md` aplican igual: 320×180, escalado entero, todo generado en código, squash & stretch, anticipación, partículas, hit-stop, shake y transiciones. Música y efectos originales, sintetizados con Web Audio.

## Lenguaje visual cooperativo

- **Cian** para lo de Choco, **ámbar** para lo de Tapita y **magenta con rayas** para lo que necesita a los dos (ver el código de colores en `docs/coop/03_mecanicas_coop.md`).
- **Agua:** siempre azul con una línea de superficie animada y brillo. **Calor:** siempre con ondulación del aire y tonos rojo-naranja. Así se lee de un vistazo qué es peligroso para quién.
- **L.A.G.:** cuando está presente, los objetos glitcheados se dibujan con un **eco atrasado**: una copia semitransparente 4 frames tarde. Es su firma visual, distinta del glitch magenta de N.U.L.L.

## Paletas por mapa

| Mapa | Base | Acentos |
|---|---|---|
| Prólogo cooperativo (sala de pruebas) | Blanco hueso, cuadrícula gris clara | Cian, ámbar |
| C1 Puntarenas | Cielo celeste a mediodía, mar azul verdoso, arena clara, madera del muelle | Contenedores de colores (rojo, azul, verde), naranja de las boyas |
| C2 Casa de Juan Carlos | Verde de jardín, celeste de piscina, terracota del rancho | Inflables rosados y amarillos, brasas naranja |
| C3 Chicharronera | Madera oscura, lastre café, humo gris | Ámbar del aceite, rojo de los fogones, verde limón |
| C4 La Sala | Negro azulado, cuadrícula fina | Cian y ámbar (una mitad de cada color), blanco de los paquetes |

## Parallax

- **C1:** cielo con gaviotas, mar con barcos lejanos, el muelle y los contenedores, y en primer plano postes con cuerdas.
- **C2:** cielo de tarde, el techo del vecino, el jardín con palmeras y la tapia, y en primer plano macetas y la manguera.
- **C3:** interior. Fondo de pared con rótulos de precios borrosos, ventanas al parqueo y humo de pailas en primer plano.
- **C4:** cables de datos que pasan a dos velocidades y paquetes que viajan de un lado al otro.

## Enemigos nuevos (resumen; detalle en cada mapa)

| Mapa | Enemigo | Idea visual |
|---|---|---|
| C1 | Cangrejo de carga | Cangrejo con un contenedor diminuto en la espalda |
| C1 | Gaviota ladrona | Gaviota que roba cristales y bits |
| C2 | Inflable mordelón | Cocodrilo inflable que muerde y rebota |
| C2 | Hormiga de la parrilla | Fila de hormigas que siguen el dulce de Tapita |
| C3 | Chicharrón saltarín | Chicharrón crujiente que salta en arco desde la paila |
| C3 | Mosca de cocina | Vuela en zigzag; se pega con melcocha |
| Todos | Paquete perdido | Cubito blanco con ojos que repite el movimiento de un jugador 1 s tarde (marca de L.A.G.) |

Todos son originales y telegrafían sus ataques con al menos 0.4 s.

## Música (nueva)

| Tema | Dónde | Estilo |
|---|---|---|
| "Sincronizados" | Selección de modo, menú y sala de espera | Tema de Choco reinterpretado con dos voces que se responden (pregunta y respuesta) |
| "Prueba de conexión" | Prólogo cooperativo | Chiptune mínimo; se atrasa y se desafina en la escena de L.A.G. |
| "Paseo de los Turistas" | C1 | Tropical alegre a 116 BPM, con marimba, bajo saltarín y pulsos cortos |
| "Estibando" | Jefe C1 | Más denso y en tono menor, con percusión de metal (contenedores) |
| "Ya casi está la carne" | C2 | Relajado de tarde de piscina a 96 BPM, con guitarra rasgueada (onda pulso), acordes de séptima y percusión suave |
| "Remolino" | Jefe C2 | Arpegios que giran y suben, como el agua en el desagüe |
| "Domingo de pailas" | C3 | Bolero tico rápido a 132 BPM, con marimba al frente y bajo caminante |
| "Aceite hirviendo" | Jefe C3 | Ritmo de 6/8 con efectos de burbujeo como percusión |
| "La Sala" | C4 | Electrónico con **eco**: cada frase se repite atrasada (nodo de retraso de Web Audio) |
| "L.A.G." | Jefe final | Empieza desincronizado (dos pistas desfasadas) y se va alineando a medida que L.A.G. pierde vida, hasta sonar perfectamente junto en la última fase |
| Créditos cooperativos | Final | Popurrí de los temas cooperativos, igual que los créditos del modo normal |

Todas las melodías son originales: el popurrí y las reinterpretaciones usan solo temas propios del juego.

## Efectos de sonido nuevos

- **Tapita:** pasos (más graves que los de Choco), salto, aterrizaje pesado, pegarse a la pared, salto de pared, mazo, martillazo con su onda, lanzar melcocha, melcocha que se endurece (crujido), plantarse, abrir la hoja, daño y disolverse.
- **Cooperativo:**
  - Señal: un "¡pip!" con el timbre de cada personaje.
  - Apilarse y montarse.
  - Terminal de doble firma: primer toque, cuenta regresiva y éxito con dos notas que forman un acorde.
  - Puerta doble lista.
  - Compañero se cayó: conexión rota. Compañero reaparece: conexión restablecida.
- **Agua:** chapuzón, nadar, burbujas, aviso de marea (campana grave), aspersor que gotea y se enciende, desagüe.
- **Calor:** chisporroteo de aceite, plancha, fogón.
- **Red** (menús): sala creada, compañero conectado (dos notas ascendentes), compañero desconectado (dos descendentes), código copiado.
