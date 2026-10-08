# Coop 02 · Tapita (personaje nuevo)

## Quién es

**Tapita** es una **tapa de dulce** (el bloque de dulce de caña que se hace en los trapiches) y la mejor amiga de Choco. Es probadora de software (QA): su talento es romper cosas para encontrarles el bug. Es directa, optimista y terca; si algo puede fallar, ella ya lo intentó.

- **Frases típicas:** "Eso es un bug." · "Si no lo rompo yo, lo rompe el usuario." · "Reproducible. Anotalo."
- **Relación con Choco:** se conocen desde siempre. Tapita es la que lo saca de la compu para ir al puerto o a la chicharronera.
- **Debilidad:** el **agua**. Es dulce de caña: si se moja, se disuelve. Por eso le tiene pánico a la piscina y a la marea.
- **Fortaleza:** el **calor**. Nació en un trapiche, al lado de las pailas, y el calor no le hace nada.

Su diseño es independiente del logo de CHC Studio y de cualquier personaje existente.

## Diseño

- **Sprite de plataformas:** cuerpo de **16×16 px** en un lienzo de **24×22** (margen para el mazo, la hoja y los brazos). Es más baja y ancha que Choco (16×24).
- **Hitbox:** 14×14 px. Esto importa para el diseño: **Tapita cabe por túneles de 1 tile (16 px) de alto; Choco no**.
- **Cuerpo:** un bloque de tapa de dulce visto de lado, con forma de **trapecio** (más ancho abajo). Color ámbar oscuro con textura granulada: puntos de 1 px más claros que brillan de vez en cuando, como cristales de azúcar.
- **Hoja de caña:** una hoja seca, verde amarillenta, le envuelve la parte de arriba como una capucha, y el extremo cuelga detrás como una capa corta. Igual que la bufanda de Choco, reacciona al movimiento: se estira al correr, sube al caer y cae al estar quieta.
- **Cara:** ojos grandes blancos con pupila oscura y brillo de 1 px (sin lentes, para diferenciarla de Choco), mejillas sonrojadas de 2 px y una boca chiquita expresiva.
- **Brazos y piernas:** líneas cortas de 1–2 px, en dulce oscuro, estilo caricatura como Choco.
- **Mazo de trapiche:** un mazo corto de madera que carga al hombro en idle.
- **Detalle:** al correr suelta granitos de azúcar (partículas doradas). Al caer fuerte, una nubecita de azúcar.

### Paleta de Tapita

| Uso | Color |
|---|---|
| Contorno | `#2A1608` |
| Dulce sombra | `#6B3410` |
| Dulce base | `#9C5420` |
| Dulce luz | `#C8782E` |
| Cristales de azúcar | `#F2C46B` |
| Brillo de cristal | `#FFF1C2` |
| Hoja oscura | `#5E6B2A` |
| Hoja base | `#8E9A3F` |
| Hoja luz | `#C4C77A` |
| Madera del mazo | `#7A4E2D` / `#A8743F` |
| Mejillas | `#E88A6A` |
| Ojos | `#F4F1EA` |

### Retrato y expresiones

Retrato de 32×32 para los diálogos, con 4 expresiones: **normal**, **feliz**, **preocupada** (agua cerca) y **determinada** (frente a un jefe).

## Animaciones (plataformas)

Mismas reglas de calidad que Choco (`docs/04_arte.md`): squash & stretch, anticipación, partículas.

| Animación | Frames | FPS | Notas |
|---|---|---|---|
| idle | 4 | 6 | Respira; cada tanto se sacude azúcar de la hoja |
| correr | 6 | 12 | Pasos cortos y rápidos, hoja estirada, granitos de azúcar |
| frenar/giro | 2 | 12 | Derrape con polvo dulce |
| saltar | 2 | 10 | Squash al despegar (más marcado que Choco: es pesada) |
| caer | 2 | 8 | Hoja hacia arriba |
| aterrizar | 2 | 16 | Squash fuerte, polvo y un leve shake (1 px) |
| pegada a la pared | 2 | 8 | Se aplasta contra la pared y resbala dejando un hilito de miel |
| salto de pared | 3 | 16 | Se impulsa con brazos y piernas |
| mazo | 4 | 18 | Anticipación hacia atrás, golpe, rebote del mazo |
| martillazo | 5 | 16 | Gira en el aire, cae en picada con estela, onda de choque y hit-stop al tocar el suelo |
| lanzar melcocha | 3 | 14 | Estira el brazo, la bola sale con un hilo |
| plantarse (ancla) | 3 | 12 | Clava el mazo en el suelo y se agacha; brillo en los bordes |
| hoja sombrilla | 3 | 12 | Se quita la hoja y la sostiene encima como sombrilla |
| montada | 2 | 6 | Encima de Choco: se sostiene con las dos manos |
| daño | 2 | 12 | Retroceso, parpadeo blanco, se le caen granitos |
| disolverse (derrota en agua) | 8 | 10 | Se deshace en un charco dorado y la hoja queda flotando |
| caramelizarse (calor extremo, cosmético) | 4 | 8 | Brilla en ámbar y saca chispitas; no le hace daño |
| victoria | 6 | 8 | Levanta el mazo; lluvia de cristales |

## Habilidades

Tapita **no** usa los objetos de Choco (báculo, botas, laptop, escudo ni lazo). Usa las mismas **acciones de control**, así que hereda los controles reasignados del jugador:

| Acción (tecla por defecto) | Choco | Tapita |
|---|---|---|
| Saltar (Espacio/Z) | Salto + doble salto | Salto simple (más bajo) + **salto de pared** |
| Disparar (X/J) | Báculo (8 direcciones) | **Mazo** (en el aire con ↓: **Martillazo**) |
| Lazo (V/L) | Lazo de Fibra Óptica | **Melcocha** (lanzar caramelo pegajoso) |
| Escudo (C/K) | Escudo Firewall | **Plantarse** (ancla) |
| Vista Debug (Q/U) | Vista Debug | **Hoja sombrilla** |
| Interactuar (E) | Igual | Igual |

### Física (números iniciales; van a `config/balance.js` en `COOP.TAPITA`)

| Parámetro | Tapita | Choco (referencia) |
|---|---|---|
| Velocidad máxima | 85 px/s | 105 px/s |
| Salto (impulso) | −270 px/s (≈ 40 px, 2.5 tiles) | −300 px/s (≈ 50 px) |
| Doble salto | No | Sí |
| Peso | **2** | 1 |
| Hitbox | 14×14 | 10×20 |

### Mazo de trapiche (Disparar)

- Golpe corto hacia adelante: alcance 14 px, daño 2, recarga 0.35 s. Empuja cajas y contenedores livianos 1 tile.
- **Martillazo** (Disparar en el aire manteniendo ↓): cae en picada a 300 px/s. Al tocar el suelo:
  - Rompe **bloques de azúcar agrietados** y pisos frágiles.
  - Activa **botones de martillazo** (los únicos que no se activan solo con peso).
  - Crea una onda de choque de 2 tiles a cada lado: aturde enemigos 1.5 s y hace saltar un poco a Choco si está cerca, lo que sirve como impulso extra de 0.5 tile.
  - Hit-stop de 5 frames y shake.

### Melcocha (Lazo)

- Lanza una bola de caramelo en parábola hacia donde mira (con ↑, más alta). Recarga 0.6 s; **máximo 2 en el mundo**: la tercera borra la más vieja.
- Al pegar en una pared o un piso, en 0.5 s se endurece como una **plataforma de caramelo de 2×1 tiles durante 6 s**. Choco y Tapita se pueden parar encima, y parpadea en el último segundo.
- Si pega en un **chorro de agua, un ventilador o un desagüe**, lo **tapa** 6 s.
- Si pega en un enemigo, lo deja **pegado** 2.5 s.
- El agua la disuelve: no se puede poner sobre agua.

### Plantarse / ancla (Escudo, mantener)

- Tapita clava el mazo y no se mueve mientras mantiene la tecla. Mientras está plantada:
  - Cuenta como **peso 3**: hunde balanzas al máximo y mantiene botones extrapesados.
  - No la empujan corrientes de agua, ventiladores ni retrocesos.
  - Choco la puede usar como **nodo del lazo**: se columpia de ella. Es la base de muchos puzzles.

### Hoja sombrilla (Vista Debug, mantener)

- Se quita la hoja de caña y la sostiene arriba. Se mueve al 60 %.
- Hace **sombra** debajo y a 1 tile de cada lado: si Choco está ahí, su calor baja como en la sombra normal. Es la herramienta clave en la Chicharronera.
- La protege de **gotas y salpicaduras** (aspersores, lluvia, olas pequeñas), pero **no** de meterse al agua.

### Pasivas

- **Pegajosa:** al tocar una pared en el aire se queda pegada hasta 1.2 s, resbalando a 30 px/s. Desde ahí puede saltar en diagonal (salto de pared).
- **Chiquita:** cabe por túneles de 1 tile de alto.
- **Aguanta el calor:** el medidor de calor no existe para ella; sobre planchas calientes y junto a pailas está bien. En calor extremo se "carameliza" (efecto visual, sin daño).
- **Odia el agua:**
  - Las gotas y salpicaduras le quitan 1 cuadrito, salvo que esté con la hoja sombrilla.
  - Meterse al agua (más de la mitad del cuerpo sumergida) la **disuelve**: derrota inmediata.

## Vida

- **4 trozos de dulce**, mostrados en el HUD como una tapa partida en 4. Al perder uno, la tapa del HUD muestra la grieta.
- Mismas reglas de invencibilidad y retroceso que Choco.
