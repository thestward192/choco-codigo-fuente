# Nivel 1 · Mundo Cartucho

**Género:** plataformas clásico de scroll lateral. **Duración objetivo:** 6–10 minutos en la primera partida.
**Vida disponible:** 1 cuadrito (+ cobertura de Grano de Cacao). **Objetos:** Báculo.
**Rescate:** Óscar. **Recompensa:** Botas de Doble Salto.

## Concepto

El juego que Choco iba a jugar, ahora corrupto. Estética de plataformas de 8/16 bits luminosa, pero con glitches que avanzan: al principio casi todo se ve normal y, conforme avanza, aparecen tiles corruptos, colores invertidos y texto de N.U.L.L. en las nubes. Los bloques misteriosos tienen una **Y** grabada.

Con solo 1 punto de vida, se juega como un clásico: un golpe sin cobertura es una vida perdida. El Grano de Cacao es muy valioso.

## Estructura

Tres secciones continuas (se pasa de una a otra por una tubería de datos o una puerta, con transición de fade):

### 1-A · Pradera de Píxeles (≈ 90 tiles)

- **Paleta:** cielo celeste, colinas verdes con patrón de píxeles, nubes blancas con cara de "loading", tierra café.
- **Enseña:** pisar enemigos, bloques Y (golpear desde abajo suelta bits o Grano de Cacao), plataformas de un solo sentido, Disquete pateable.
- **Enemigos:** Bytelings (6), Disquetes (2), Mosquitos de datos (2), Bloques spam (2).
- **Momento clave:** un Disquete pateado en una rampa baja y elimina una fila de 4 Bytelings (enseña a usarlo como arma).
- **Parallax:** 3 capas (cielo, colinas lejanas, colinas cercanas).

### 1-B · Cuevas del Cartucho (≈ 80 tiles) · Checkpoint al inicio

- **Paleta:** interior de cartucho: fondo verde oscuro con pistas de circuito doradas, chips como bloques, luz tenue.
- **Enseña:** combinar salto preciso y disparo; Cables pelados con ritmo; plataformas móviles (chips sobre rieles).
- **Enemigos:** Bytelings, Blindados (2, solo pisotón), Mosquitos en grupo (formación de 3), Cables pelados (5 en secuencias con ritmo).
- **Momento clave:** pasillo de plataformas móviles sobre un vacío con Mosquitos que obligan a disparar mientras se equilibra.
- **Secreto:** una tubería falsa que lleva a una sala de bits.

### 1-C · Castillo de Silicio (≈ 70 tiles) · Checkpoint al inicio

- **Paleta:** gris metálico, estática roja como "lava" en el fondo, antorchas con llama de píxeles magenta.
- **Enseña:** timing exigente.
- **Peligros:** **Barras de estática** (cadenas de bolas eléctricas que giran alrededor de un eje), estática que sube y baja en pozos, bloques que caen, Blindados en pasillos estrechos.
- **Momento clave:** una sala con 2 barras de estática girando en sentidos opuestos y plataformas pequeñas.
- **Puerta del jefe:** doble puerta con la cara de N.U.L.L. que se abre con glitch.

## Mini-jefe: Guardián del Slot

Un cartucho gigante con patas y la etiqueta despegada, ojos rojos en la ranura. 48×48 px.

**Arena:** una sala de una pantalla con suelo plano y dos plataformas altas.

**Patrón:**

1. **Salto aplastante:** se agacha (telegrafiado 0.6 s), salta hacia la posición de Choco y aterriza con onda de choque. La onda se esquiva saltando.
2. **Embestida:** raspa el suelo (0.8 s), corre hasta la pared y **queda aturdido 2 s** al chocar. Solo en ese momento se le puede **pisar la cabeza**.
3. **Lluvia de bloques:** golpea el suelo y caen 3–5 Bloques spam con sombra previa en el suelo.

**Vida:** 3 pisotones. Tras cada uno se vuelve más rápido (+20 %) y agrega un patrón: al segundo golpe, la embestida es doble; al tercero, combina lluvia y salto.
**Disparos:** hacen 0 daño pero lo empujan un poco (el jugador aprende que no todo se resuelve disparando).

**Derrota:** explota en píxeles, cae una jaula de caracteres, Óscar sale. Diálogo (ver historia), animación de Óscar convirtiéndose en luz rosada y uniéndose a la barra (+1 cuadrito en el HUD con animación), y entrega de las **Botas de Doble Salto** con pantalla de objeto obtenido.

## Y doradas

1. **Encima de las nubes** en 1-A: una fila de bloques Y invisibles (se revelan al golpearlos desde abajo en un punto sospechoso marcado por un bit suelto) lleva a una zona sobre las nubes.
2. **Tubería secreta** en 1-B: una tubería que parece decorativa se puede entrar con ↓.
3. **Pared falsa** en 1-C: un bloque de pared con una grieta sutil se rompe con disparo cargado.

## Chiste recurrente

Desde este nivel, los carteles del mundo aparecen sin la letra Y. En el castillo hay un cartel "¡Ho_ es tu último día!" firmado por N.U.L.L. Óscar suspira si se pasa junto a un cartel después del rescate (en el resto del juego).

## Criterios de aceptación

- El salto se siente preciso y responsivo: coyote time, buffer y salto variable funcionando.
- Un jugador con experiencia termina el nivel en 6–10 minutos con varias muertes.
- Todos los peligros son visibles o telegrafiados antes de ser letales.
- El mini-jefe se puede aprender en 2–3 intentos.
