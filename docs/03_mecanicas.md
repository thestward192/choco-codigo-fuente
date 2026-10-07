# 03 · Mecánicas

Todas las medidas usan la resolución interna de **320×180 px**, tiles de **16×16 px** y una simulación a **60 pasos fijos por segundo**. Las velocidades están en px/s. Todos los números son **valores iniciales de balance**: deben vivir en un archivo de configuración (`src/config/balance.js`) para ajustarlos sin tocar la lógica.

## Controles

| Acción | Teclado | Alternativo | Gamepad |
|---|---|---|---|
| Mover | ← → ↑ ↓ | W A S D | Stick izq. / D-pad |
| Saltar / confirmar | Espacio | Z | A (Cruz) |
| Disparar báculo (mantener = cargar) | X | J | X (Cuadrado) |
| Escudo Firewall | C | K | B (Círculo) |
| Lazo de Fibra Óptica | V | L | RB / R1 |
| Vista Debug (laptop) | Q | U | LB / L1 |
| Interactuar / hackear / hablar | E | ↑ en plataformas | Y (Triángulo) |
| Pausa | Esc | P / Enter | Start |

- Los controles se pueden **reasignar** en Opciones y desde la pausa, con teclas o con botones del mouse (izquierdo, central, derecho y laterales).
- La acción de un objeto no obtenido no hace nada (ni sonido).
- Soportar gamepad con la Gamepad API, con zona muerta de 0.25 en los sticks.
- **Input buffer:** los botones de salto y disparo guardan la pulsación 0.1 s para que un toque un poco temprano siga contando.

## Física de plataformas (niveles 1, 4 y 5)

| Parámetro | Valor |
|---|---|
| Velocidad máxima horizontal | 105 px/s |
| Aceleración en suelo | 900 px/s² |
| Desaceleración en suelo | 1400 px/s² |
| Aceleración en el aire | 600 px/s² |
| Gravedad (subiendo) | 900 px/s² |
| Gravedad (bajando) | 1150 px/s² |
| Velocidad máxima de caída | 320 px/s |
| Velocidad de salto | −300 px/s (≈ 3 tiles de altura) |
| Salto variable | al soltar el botón subiendo, `vy *= 0.45` |
| Doble salto | −265 px/s (≈ 2.3 tiles extra) |
| Coyote time | 0.10 s |
| Rebote al pisar enemigo | −230 px/s (−300 si se mantiene saltar) |
| Hitbox de Choco | 10×20 px, centrada abajo en el sprite de 16×24 |

- Colisiones AABB contra el tilemap, resolviendo eje X y luego eje Y.
- Posiciones con decimales; se redondean solo al dibujar.
- Tipos de tile: sólido, plataforma de un solo sentido (se atraviesa desde abajo; ↓ + salto para bajar), pinchos/daño, agua/vacío (muerte), fantasma (solo sólido con Vista Debug activa), gancho de lazo, sombra (nivel 4).
- Los enemigos se pisan si Choco cae sobre ellos con `vy > 0` y su parte inferior está en la mitad superior del enemigo.

## Movimiento cenital (niveles 2 y 3)

- Velocidad de caminar: 70 px/s, con aceleración rápida (0.08 s para llegar al máximo).
- Movimiento en 8 direcciones; el sprite usa 4 direcciones.
- Colisión por hitbox de 10×8 px en los pies.
- En el nivel 3, mantener **Shift** (o RT/R2) para caminar sigiloso: 35 px/s y no hace ruido.

## Báculo Compilador

| Parámetro | Disparo normal | Disparo cargado |
|---|---|---|
| Daño | 1 | 3 |
| Velocidad | 240 px/s | 200 px/s |
| Alcance | 170 px | 220 px |
| Tamaño | 6×6 (llaves `{ }`) | 14×14 (bloque `{ }` brillante) |
| Especial | — | Atraviesa enemigos |
| Cadencia | 0.25 s, máximo 2 en pantalla | Carga completa a los 0.8 s |

- **Puntería:** mantener ↑ al disparar apunta hacia arriba; ↑ con ← o → apunta en diagonal hacia arriba. En el aire, ↓ apunta hacia abajo y ↓ con ← o → en diagonal hacia abajo. En el suelo, ↓ no apunta, porque baja de las plataformas de un sentido. El disparo cargado se apunta igual, al soltar.
- Mientras carga, Choco se mueve al 70 % de velocidad.
- Enemigos **Blindados** reflejan el disparo normal hacia atrás.
- En el nivel 2 el báculo es un comando de batalla. En el nivel 3 el disparo **aturde** a un bot 2 s pero hace ruido en un radio de 80 px (riesgo-recompensa).

## Vida: la barra de chocolate

- La vida se mide en **cuadritos**. Choco empieza el juego con **1** (el núcleo).
- Cada fundador rescatado agrega **+1 cuadrito máximo**: nivel 2 con 2, nivel 3 con 3, nivel 4 con 4, nivel 5 con 5.
- Al entrar a un nivel o revivir en un checkpoint, la vida se llena al máximo.
- Tras recibir daño: **1.2 s de invencibilidad** con parpadeo, retroceso y 4 frames de hit-stop.
- **Grano de Cacao** (power-up, aparece en bloques Y y lugares escondidos): le da a Choco una **cobertura** brillante que absorbe un golpe extra. Solo una a la vez. Es el equivalente a "crecer" en el nivel 1.
- **Recuperar vida:** los **Trozos de Cacao** (raros) curan 1 cuadrito.

## Vidas, bits y checkpoints

- Cada intento de nivel empieza con **3 vidas**.
- Los **bits** son la moneda: 100 bits = 1 vida extra. Se muestran en el HUD.
- Al perder todas las vidas: pantalla de **Game Over** con opción de reintentar el nivel desde el inicio. Los objetos y fundadores de niveles anteriores se conservan siempre.
- Los checkpoints son **pocos y bien ubicados** (ver cada nivel). Se activan al tocarlos, con animación y sonido claros, y guardan el progreso.

## Objetos

### Botas de Doble Salto (nivel 1)

- Pasivo: permite un segundo salto en el aire. Se recarga al tocar el suelo, al pisar un enemigo o al engancharse con el lazo.
- Efecto visual: giro de Choco, anillo de partículas bajo los pies, sonido de "clic" de switch mecánico.

### Laptop Debugger (nivel 2)

- **Vista Debug** (mantener Q): la pantalla toma un filtro azul oscuro con cuadrícula, y aparecen:
  - **Plataformas fantasma**, que solo son sólidas mientras la vista está activa.
  - **Puntos débiles** de enemigos y jefes (un círculo parpadeante).
  - Y doradas y caminos secretos ocultos.
- **Batería:** 100; se gasta a 22/s con la vista activa (unos 4.5 s) y se recarga a 18/s tras 0.5 s sin usarla. Si se agota, la vista se apaga y no se puede activar hasta llegar a 30.
- **Hackeo** (E junto a una terminal): minijuego de secuencia. Aparecen de 4 a 7 flechas; hay que ingresarlas en orden antes de que se acabe el tiempo (2.5 a 4 s según el nivel). Un error reinicia la secuencia; tres errores activan la alarma (nivel 3) o bloquean la terminal por 5 s.

### Escudo Firewall (nivel 3)

- Al presionar C: burbuja hexagonal durante **1.5 s** que bloquea proyectiles y daño por contacto.
- **Recarga:** 3.5 s, mostrada en el HUD con un ícono que se llena.
- Mientras está activo: Choco se mueve al 60 % y no puede disparar.
- **Parry:** si el escudo se activa dentro de los **0.15 s** previos a que un proyectil lo toque, el proyectil **se refleja** hacia su origen con destello, hit-stop de 6 frames y sonido especial. Clave en el jefe final.

### Lazo de Fibra Óptica (nivel 4)

- Se engancha solo a **nodos** (esferas brillantes) dentro de un rango de 90 px, en un cono de 120° hacia donde mira Choco o hacia arriba. El nodo seleccionado se resalta.
- Al engancharse, Choco se **columpia como péndulo** (cuerda rígida, longitud = distancia inicial, se puede acortar con ↑ y alargar con ↓ entre 24 y 90 px).
- Al soltar V o presionar saltar, sale disparado conservando la velocidad tangencial, más un impulso vertical de −120 px/s. Recarga el doble salto.
- **Jalar:** algunos objetos marcados (cajas, el núcleo del jefe) se jalan hacia Choco en vez de columpiarse.

## Mecánicas por nivel

- **Nivel 2:** batallas por turnos y puzzles (ver `docs/niveles/nivel_2_una.md`).
- **Nivel 3:** sigilo, detección, alarma y nubes de vapor de Hezron (ver `docs/niveles/nivel_3_novacomp.md`).
- **Nivel 4:** **Calor.** Medidor de 0 a 100. Al sol sube 11/s; en la sombra (árboles de guanacaste, toldos, carretas, aleros) baja 30/s. Al llegar a 100, Choco pierde 1 cuadrito y el medidor baja a 40. A partir de 60, el sprite de Choco empieza a gotear y el borde de la pantalla ondula por el calor. El agua de los bebederos lo enfría de golpe a 0.

## Coleccionables

- **Y doradas:** 3 por nivel (15 en total), escondidas en lugares que requieren exploración o dominar una mecánica. Algunas solo se ven con Vista Debug. Recolectarlas todas desbloquea la escena extra del final.
- **Bits:** moneda para vidas extra.
- La pantalla de resultados de cada nivel muestra: tiempo, muertes, bits y Y doradas encontradas.

## Guardado

- Guardado automático en `localStorage` al completar un nivel y al tocar un checkpoint, **con todo envuelto en try/catch**: si falla (modo privado), el juego sigue funcionando y muestra un aviso discreto de que no se puede guardar.
- **3 ranuras** de partida. Cada una guarda: niveles completados, fundadores rescatados, objetos, Y doradas por nivel, mejor tiempo por nivel, muertes totales, tiempo total y checkpoint actual.
- Las opciones (volumen, controles, pantalla) se guardan aparte.

## Dificultad

Una sola dificultad, **exigente pero justa**:

- Los ataques siempre se telegrafían (brillo, pose o sonido) con al menos 0.4 s de anticipación.
- Nada de muertes por cosas que el jugador no podía ver: la cámara muestra lo que viene.
- La dificultad sube por densidad de enemigos, combinación de mecánicas y precisión exigida, no por aumentar la vida de los enemigos.
- Curva: nivel 1 exigente como un clásico de plataformas, nivel 5 debe requerir varios intentos.
- Al terminar el juego se desbloquea **Modo Hotfix**: 1 cuadrito de vida fijo, sin power-ups de cacao y con la mitad de los checkpoints.
