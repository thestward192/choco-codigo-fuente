# Nivel 4 · Santa Cruz, Guanacaste

**Género:** plataformas de acción de scroll lateral con mecánica de calor. **Duración objetivo:** 12–18 minutos.
**Vida disponible:** 4 cuadritos. **Objetos:** Báculo, Botas de Doble Salto, Laptop Debugger, Escudo Firewall.
**Rescate:** Fabiola. **Recompensa:** Lazo de Fibra Óptica.

## Concepto

La casa de Choco: Santa Cruz, la Ciudad Folclórica, en plenas fiestas. Todo es cálido, polvoriento y festivo, pero corrupto: los toros tienen ojos rojos glitcheados, las bombetas explotan en píxeles de código, los zanates atacan en bandada y hay estática en el cielo. El **sol** es un enemigo más: Choco es chocolate y se derrite.

Este es el nivel donde se prueban juntos **todos** los objetos anteriores: doble salto para toros y vacíos, escudo para bombetas, laptop para caminos ocultos.

## Estética

- **Paleta:** cielo naranja-amarillo que pasa a atardecer rosado-morado en la última sección; tierra rojiza, casas de adobe blancas con tejas, madera, verde seco.
- **Elementos:** árboles de guanacaste (copas anchas que dan sombra), carretas pintadas, toldos de colores, faroles, banderines, marimba en una tarima, redondel de madera, las **ruinas del viejo campanario**.
- **Detalles de fondo:** gente glitcheada bailando en loop, humo de fogones, confeti de píxeles.
- **Parallax:** 4 capas (cielo con sol, montañas lejanas, techos del pueblo, primer plano con banderines).

## Mecánica de calor (resumen; detalle en `docs/03_mecanicas.md`)

- Medidor visible en el HUD con un termómetro.
- Al sol sube; en sombra baja. Las sombras se dibujan en el suelo y bajo toldos, con borde claro.
- Bebederos de agua (pocos) enfrían por completo.
- A partir de 60: Choco gotea; a 100: pierde 1 cuadrito.
- **Diseño:** las secciones alternan tramos de sol que obligan a moverse rápido con islas de sombra para planificar.

## Estructura

### 4-A · Entrada al pueblo (≈ 70 tiles)

- Tutorial del calor: tramos cortos de sol entre árboles de guanacaste.
- Primeros Toros glitch (esquivar con doble salto) y Zanates.
- Un Sabanero glitch que jala con su lazo hacia un pozo (se le dispara al lazo).

### 4-B · Plaza y fiestas (≈ 90 tiles) · Checkpoint

- Puestos de comida, tarima de marimba, banderines como plataformas de un solo sentido.
- **Bombeteros corruptos** en los techos: lanzan bombetas en parábola que explotan en área. Primer gran uso del **escudo** y del **parry** (una bombeta reflejada destruye al bombetero).
- **Misión secundaria de Fabiola:** ver abajo.
- Camino alternativo por los techos con plataformas fantasma (Vista Debug).

### 4-C · El Redondel (≈ 60 tiles) · Checkpoint

- Sección de arena: Choco entra al redondel y las puertas se cierran. **3 oleadas** de Toros glitch que embisten desde ambos lados, con bombetas cayendo y el sol a pleno. Solo hay sombra bajo las gradas (en plataformas altas).
- Hay que sobrevivir 60 s o derrotar 6 toros (4 disparos cada uno, o 2 cargados).
- Cada toro se anuncia 0.8 s antes, con polvo y un bufido en su puerta. Si Choco está junto a esa puerta, el toro entra por la otra: nunca aparece encima de él.

### 4-D · Ruinas del Campanario (≈ 12 pantallas verticales) · Checkpoint antes del jefe

- Escalada vertical entre muros de ladrillo en ruinas, con zanates en picada, plataformas que se desmoronan y plataformas fantasma.
- El sol entra por huecos del muro como columnas de luz (calor) que se mueven con el tiempo.
- En la cima: la arena del jefe.

## Jefe: El Torito Kernel

Un toro mecánico gigante (80×56 px) hecho de piezas de carreta y chatarra, con un chip brillante incrustado en la espalda y humo saliendo de la nariz. Fabiola está encerrada en una jaula colgando de la campana.

**Arena:** plataforma amplia en la cima de las ruinas, dos columnas que dan sombra y dos plataformas altas.

**Patrones:**

1. **Embestida:** raspa (0.8 s) y cruza la arena. Se esquiva con doble salto. Si choca contra una columna, **queda aturdido 3 s**.
2. **Pisotón:** se para en dos patas y cae; dos ondas de choque viajan por el suelo (saltar).
3. **Bombetas de nariz:** lanza 3 bombetas en abanico (escudo o parry; una bombeta reflejada lo aturde 2 s).
4. **Humo:** exhala humo que tapa la mitad de la pantalla 3 s (se ve con Vista Debug).

**Punto débil:** el **chip de la espalda**, visible y dañable **solo con Vista Debug activa** mientras está aturdido. Los disparos fuera del punto débil no hacen daño.
**Vida:** 30 (disparo normal 1, cargado 3).
**Fase 2 (al 50 %):** el sol se intensifica (el calor sube 16/s), embiste dos veces seguidas y las columnas se van rompiendo (menos sombra y menos oportunidades de aturdirlo). Presión alta de calor y batería al mismo tiempo.

**Derrota:** el toro se desarma en piezas de carreta, la campana suena y la jaula cae. Fabiola sale (diálogo en la historia). Se vuelve luz turquesa, se une a la barra (+1 cuadrito, **barra completa**) y entrega el **Lazo de Fibra Óptica**.

### 4-E · Atardecer: práctica del lazo (≈ 60 tiles)

- Un barranco al atardecer con nodos brillantes. Sin calor (ya se puso el sol).
- 3 retos crecientes: columpiarse de un nodo a otro, combinar lazo con doble salto, y una cadena de 5 nodos sobre el vacío.
- Al final, un portal hacia el Código Puro.

## Misión secundaria: la rosquilla perfecta

- En la plaza hay 4 puestos. Al interactuar con cada comida, Choco la "recoge" y el juego muestra el comentario que Fabiola hará al respecto (ella todavía no está; el comentario aparece en la pantalla de rescate si se lleva esa comida):
  - **Chorreadas:** "Muy dulces para mí."
  - **Tanelas:** "¿Qué queso es ese? No sé si me cae bien."
  - **Arroz de maíz:** "Tiene demasiadas cosas juntas."
  - **Empanada:** "¿De qué es? Mejor no me digás."
- La **rosquilla perfecta** (sin partes quemaditas) está en un horno de barro escondido en un patio trasero, accesible por los techos con Vista Debug y doble salto.
- Choco solo puede llevar una comida a la vez.
- **Recompensa si le lleva la rosquilla:** la **Receta de la Abuela**: Choco empieza el nivel 5 con una cobertura de Grano de Cacao (un golpe extra), y cada vez que reaparece en un checkpoint de ese nivel también.

## Y doradas

1. **Techos de la plaza:** en el camino de plataformas fantasma.
2. **Redondel:** sobre la bandera más alta, solo durante la tercera oleada.
3. **Atardecer:** al final de una cadena opcional de nodos de lazo muy exigente.

## Criterios de aceptación

- El calor se entiende en menos de 30 s y obliga a planear rutas sin sentirse injusto.
- Las sombras son claramente visibles.
- El jefe exige usar doble salto, escudo y Vista Debug; ninguna estrategia de un solo objeto funciona.
- La sección del lazo enseña bien la física del péndulo antes del nivel 5.
