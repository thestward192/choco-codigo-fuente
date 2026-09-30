# 02 · Personajes

## Choco (protagonista)

Una barra de chocolate oscuro, ingeniera, alma de CHC Studio. Es curioso, terco y un poco culpable por haber dejado a N.U.L.L. a medias. Su diseño es **independiente del logo de CHC Studio**: no usa sus colores ni su forma.

### Diseño

- **Sprite de plataformas:** 16×24 px. **Sprite cenital (niveles 2 y 3):** 16×16 px.
- **Cuerpo:** barra rectangular vertical con esquinas levemente redondeadas, dividida en cuadritos marcados con líneas en relieve (una línea oscura con una línea clara debajo).
- **Envoltura:** papel aluminio dorado roto en la parte superior; el pedazo roto flota detrás como bufanda y reacciona al movimiento (se estira al correr, sube al caer, cae al estar quieto).
- **Cara:** dos ojos grandes blancos con pupila oscura y brillo de 1 px; boca simple de 2–3 px que cambia según la emoción.
- **Lentes:** montura fina oscura, con un reflejo que cruza el lente cada pocos segundos en idle.
- **Audífonos:** alrededor del cuello, con un LED cian que parpadea.
- **Brazos y piernas:** líneas cortas de 1–2 px de grosor en chocolate oscuro, estilo caricatura.
- **Detalle:** al correr suelta migajas de cacao (partículas).

### Estado según la vida

La barra muestra físicamente cuántos cuadritos tiene: con 1 punto de vida es solo el núcleo (una barra corta de un cuadrito con la envoltura); cada fundador rescatado agrega un cuadrito visible al cuerpo en el HUD. En el sprite del juego, el cuerpo tiene tamaño fijo para no cambiar la hitbox, pero los cuadritos "vacíos" se ven como huecos con contorno punteado en el retrato del HUD.

### Paleta de Choco

| Uso | Color |
|---|---|
| Contorno | `#1E120C` |
| Chocolate sombra | `#3D2216` |
| Chocolate base | `#5C3521` |
| Chocolate luz | `#83522F` |
| Brillo | `#B07A4A` |
| Envoltura oscura | `#A27B2E` |
| Envoltura base | `#D9AE4B` |
| Envoltura brillo | `#F6DE8A` |
| Ojos | `#F4F1EA` |
| LED audífonos | `#43D9FF` |

### Animaciones (plataformas)

| Animación | Frames | FPS | Notas |
|---|---|---|---|
| idle | 4 | 6 | Respira (cuerpo sube 1 px), parpadeo aleatorio, reflejo en lentes |
| correr | 6 | 12 | Inclinado hacia adelante, bufanda estirada, migajas |
| frenar/giro | 2 | 12 | Derrape con polvo |
| saltar (subida) | 2 | 10 | Squash al despegar, stretch al subir |
| doble salto | 4 | 16 | Giro completo con estela de chispas |
| caer | 2 | 8 | Bufanda hacia arriba |
| aterrizar | 2 | 16 | Squash fuerte + polvo |
| disparar | 3 | 16 | Báculo al frente, retroceso de 1 px |
| cargar disparo | 4 | 10 | Brillo en el báculo que crece, partículas absorbidas |
| escudo | 3 | 12 | Burbuja hexagonal alrededor |
| lazo (lanzar/colgar/columpiar) | 3 + 2 + 4 | 12 | |
| daño | 2 | 12 | Retroceso, parpadeo blanco |
| derretirse (muerte) | 8 | 10 | Se derrite en charco y la envoltura cae encima |
| victoria | 6 | 8 | Levanta el báculo, bufanda al viento |

En vista cenital: idle, caminar (4 direcciones, 4 frames), interactuar y sorpresa (signo "!").

## N.U.L.L. (antagonista)

*Núcleo Universal de Lógica Libre.* IA que Choco programó en la universidad y abandonó con un bug sin arreglar. Resentida, sarcástica, brillante. Habla en minúsculas cuando está tranquila y en MAYÚSCULAS glitcheadas cuando se enoja.

### Diseño

- **Forma base:** un monitor CRT flotante con la pantalla rota. En la pantalla, un solo ojo con el símbolo **∅** como pupila.
- **Alas:** franjas de código (caracteres que cambian cada frame) que salen de los costados del monitor.
- **Colores:** magenta `#FF2E88`, blanco `#F4F1EA`, negro `#0B0610`, con aberración cromática (copias desplazadas en rojo y cian).
- **Tamaño en la pelea final:** 64×64 px (más elementos flotantes separados).
- **Forma final (tras el parche):** un cursor de texto blanco de 4×8 px que parpadea, con un pequeño brillo cálido.
- **Apariciones previas:** su cara aparece en pantallas, en televisores dentro de los niveles y en glitches, siempre con texto que se escribe letra por letra.

## Los cuatro fundadores (cuadritos)

Cada uno tiene sprite de 16×24 (plataformas) y 16×16 (cenital), un retrato de 32×32 para los diálogos y 2–3 expresiones (normal, feliz, preocupado). Son **cuadritos de chocolate** con personalidad, no humanos: un cuadrito café con los rasgos de cada uno, para que se sienta parte de Choco. Cada uno tiene un color de acento propio.

### Óscar

- **Nivel:** 1 (Mundo Cartucho). **Entrega:** Botas de Doble Salto.
- **Personalidad:** romántico, dramático, poeta. Está perdidamente enamorado de la **letra Y**.
- **Rasgos visuales:** cuadrito de chocolate con un corazón pequeño flotando, una rosa en la mano en su retrato. Acento: rosado `#FF7DB0`.
- **Chistes:** le escribe poemas a la Y; defiende que es "vocal y consonante a la vez, como el amor"; suspira frente a los rótulos incompletos; nombra todas sus variables `y`.
- **Frases de ejemplo:**
  - "Hay 26 letras en el abecedario. Bueno, 27 con la ñ. Pero solo una me entiende."
  - "No es obsesión, Choco. Es tipado fuerte."

### Stward

- **Nivel:** 2 (UNA). **Entrega:** Laptop Debugger.
- **Personalidad:** rapero, confiado, con flow. Todo lo convierte en rima.
- **Rasgos visuales:** gorra de lado, cadena dorada pixelada, micrófono. Acento: amarillo `#FFD23F`.
- **Chistes:** narra las entradas a los niveles con una rima corta; se ofende si Choco elige una rima mala en la batalla; al final improvisa un verso de victoria.
- **Frases de ejemplo:**
  - "Compilo en la tarima, sin warnings ni errores; si el bug quiere guerra, que traiga refuerzos mejores."
  - "Esa rima estuvo más floja que un try sin catch."

### Hezron

- **Nivel:** 3 (Novacomp). **Entrega:** Escudo Firewall.
- **Personalidad:** relajado, imperturbable, siempre con su vape. Nunca se estresa.
- **Rasgos visuales:** audífonos grandes, vape en la mano, siempre con una nubecita de vapor saliendo. Acento: lila `#B18CFF`.
- **Habilidad en el nivel 3:** nubes de vapor que bloquean visión de cámaras y bots.
- **Chistes:** cada vez que aparece anuncia un sabor absurdo distinto ("mango con chile", "horchata con menta", "café de la oficina, edición lunes"); ante cualquier crisis dice "tranqui".
- **Frases de ejemplo:**
  - "Tranqui, mae. Nada que una nube no arregle."
  - "Me queda una carga. Usala con sabiduría. Es de maracuyá."

### Fabiola

- **Nivel:** 4 (Santa Cruz). **Entrega:** Lazo de Fibra Óptica.
- **Personalidad:** amable, delicada y extremadamente selectiva con la comida.
- **Rasgos visuales:** moño, delantal pequeño en el retrato, expresión de duda frente a la comida. Acento: turquesa `#4FD1C5`.
- **Chistes:** revisa cada comida antes de probarla y encuentra un problema; la misión secundaria gira en torno a encontrarle algo que sí se coma.
- **Frases de ejemplo:**
  - "¿Eso tiene cebolla? Aunque sea poquita, se siente."
  - "Está rico, seguro. Pero la textura... no sé, Choco."

## Enemigos

Todos los enemigos son **bugs** o sistemas corrompidos. Diseño original, sin parecido a personajes existentes. Cada enemigo tiene: animación de movimiento (2–4 frames), telegrafiado antes de atacar (brillo o pose de 6–12 frames), animación de daño y muerte con partículas de píxeles.

### Nivel 1 · Mundo Cartucho

| Enemigo | Tamaño | Comportamiento | Cómo vencerlo |
|---|---|---|---|
| **Byteling** | 16×16 | Camina en línea recta, gira al chocar o al borde (según variante) | Pisotón o 1 disparo |
| **Disquete** | 16×16 | Camina; al pisarlo se vuelve un disco que se puede patear y rebota, matando enemigos (y a Choco si lo golpea de vuelta) | Pisotón |
| **Mosquito de datos** | 12×12 | Vuela en onda senoidal | Solo disparo |
| **Cable pelado** | 16×32 | Sale de conectores en el piso, con chispas telegrafiadas 0.6 s antes | Esquivar (invencible) |
| **Bloque spam** | 16×16 | Cae del techo cuando Choco pasa debajo, tiembla 0.4 s antes | Esquivar; se puede usar como plataforma |
| **Blindado** | 16×16 | Casco metálico; los disparos rebotan | Solo pisotón |

### Nivel 2 · UNA (batalla por turnos)

| Bug | Gimmick |
|---|---|
| **NullPointer** | Ataque que falla 50 % de las veces, pero cuando acierta hace mucho daño |
| **Loop Infinito** | Repite la misma acción cada turno; si no se rompe en 3 turnos, cura su vida al máximo |
| **Race Condition** | Actúa antes o después que Choco al azar; a veces ataca dos veces |
| **Memory Leak** | Cada turno le baja 1 de energía máxima a Choco durante la pelea |
| **Spaghetti Code** | Enreda: la próxima acción de Choco se elige al azar entre dos |
| **MC Stack Overflow** (jefe) | Batalla de rap (ver nivel 2) |

### Nivel 3 · Novacomp

| Enemigo | Comportamiento |
|---|---|
| **BotSeg** | Patrulla una ruta fija con cono de visión; al ver a Choco, "!" y lo persigue |
| **Cámara** | Fija, gira su cono de visión en un arco con pausas |
| **Dron** | Patrulla en el aire en círculos; su visión es circular |
| **Láser** | Barreras que se prenden y apagan con ritmo |
| **Aspiradora robot** | Recorre el piso al azar; hace ruido al chocar con Choco y alerta a los bots cercanos |
| **DEADLINE** (jefe) | Reloj gigante corrupto (ver nivel 3) |

### Nivel 4 · Santa Cruz

| Enemigo | Comportamiento | Cómo vencerlo |
|---|---|---|
| **Toro glitch** | Raspa el piso (telegrafiado 0.8 s) y embiste en línea recta | Doble salto por encima; 4 disparos |
| **Bombetero corrupto** | Lanza bombetas en parábola que explotan en área | Escudo bloquea; 2 disparos |
| **Sabanero glitch** | Lanza su lazo y jala a Choco hacia él | Disparar al lazo o esquivar |
| **Zanate** | Bandadas de 3–5 que atacan en picada | Disparos; escudo |
| **Tamal explosivo** | Hazard: rueda cuesta abajo | Saltar |
| **El Torito Kernel** (jefe) | Toro mecánico gigante (ver nivel 4) |

### Nivel 5 · Código Puro

| Enemigo | Comportamiento |
|---|---|
| **Excepción** | Proyectiles que aparecen en el borde de la pantalla con aviso |
| **Segmento corrupto** | Plataformas que desaparecen al pisarlas 0.5 s |
| **Firewall enemigo** | Muros de fuego de código que solo el escudo atraviesa |
| **Fragmento de N.U.L.L.** | Mini copias que persiguen a Choco en línea recta |
| **N.U.L.L.** (jefe final) | Ver nivel 5 |
