# C3 · La Chicharronera

**Género:** plataformas con puzzles cooperativos. **Duración objetivo:** 15–20 minutos.
**Peligros:** calor, aceite hirviendo y planchas (Choco); fregaderos y goteras de la cámara fría (Tapita). **Jefe:** La Paila Mayor.
**Recuerdos:** 3 limones.

## Concepto

Los domingos en la chicharronera de carretera: el parqueo de lastre, la cocina de pailas gigantes, la bodega fría y el comedor con marimba en vivo. Es el mapa donde **Tapita va al frente**: casi todo quema, y Choco depende de la sombra de la hoja y de que ella le abra paso.

Es una chicharronera genérica, sin nombre ni marca de un negocio real. La dueña es **Doña Mayela** (personaje inventado), glitcheada detrás del mostrador: "¿Con yuca o con tortilla?".

## Elementos nuevos del mapa

- **Calor fuerte:** en la cocina el medidor de Choco sube a 16/s, en vez de 11. La sombra de la hoja de Tapita y las zonas junto a los fregaderos lo bajan.
- **Pailas:** hierven en ciclos. El aceite **salta** en arcos visibles (aviso: burbujas grandes 0.6 s antes). Las gotas dañan a Choco y a Tapita no.
- **Extractores:** ventiladores en el techo que jalan hacia arriba. Elevan a Choco como una corriente para subir; a Tapita apenas la mueven.
- **Fregaderos:** agua con jabón. Choco se mete para enfriarse a 0 de una vez. A Tapita la disuelven.
- **Teclas de marimba** (comedor): plataformas que suben y bajan con el ritmo de la música en vivo. El patrón se repite cada 2 compases.
- **Mostradores con túneles bajos:** por debajo solo pasa Tapita.

## Enemigos

- **Chicharrón saltarín:** salta en arco desde una paila (aviso: tiembla en el borde). Daña por contacto. El mazo lo manda de vuelta a la paila; el disparo lo rompe.
- **Mosca de cocina:** vuela en zigzag y persigue a Choco. La melcocha la deja pegada; un disparo la espanta.
- **Paquete perdido:** el enemigo de L.A.G. (presente en todos los mapas). Repite el movimiento de un jugador 1 s tarde y daña por contacto.

## Estructura

### C3-A · El parqueo de lastre (3 salas)

1. **El sol del mediodía.** Un parqueo largo al sol con pocos árboles.
   - Tapita va adelante con la hoja sombrilla y Choco pegado a ella.
   - Para avanzar hay que mover un carro (balanza: Tapita en el capó) que deja una sombra nueva.
   - **Enseña:** en este mapa el sol es el enemigo principal de Choco.
2. **El humo del fogón exterior.** Una cortina de vapor y calor bloquea el camino.
   - Tapita la cruza y le da a una palanca del otro lado que abre una manguera.
   - La manguera crea un charco donde Choco se enfría a mitad de camino.
3. **El portón de la cocina.** Terminal de doble firma: una afuera (Choco) y otra adentro, detrás de un túnel bajo del mostrador (Tapita).

### C3-B · La cocina de pailas (4 salas) · Checkpoint

1. **Pasillo de pailas.** Tres pailas en fila.
   - Tapita carga a Choco encima, pasando entre los saltos de aceite.
   - Choco, montado, les dispara a los chicharrones saltarines antes de que caigan sobre ellos.
2. **Los extractores.**
   - Choco sube por la corriente de los extractores hasta las vigas.
   - Desde arriba apaga un extractor disparándole, y así Tapita puede saltar sin que el aire la desvíe.
   - Tapita, abajo, hace martillazo en un botón que enciende un extractor nuevo para que Choco siga subiendo.
3. **La plancha.** Una plancha de metal larga y caliente.
   - Tapita la cruza y aplasta con el mazo los botones de gas en orden, para enfriar la plancha por tramos durante 4 s cada uno.
   - Choco corre por los tramos fríos siguiendo a Tapita.
4. **Sala del recuerdo (opcional): la paila del rincón.**
   - Un limón flota en una paila hirviendo. Solo Tapita lo puede sacar, pero la paila está rodeada de moscas.
   - Choco las tiene que mantener lejos (disparos y escudo) mientras ella entra y sale.
   - **Recuerdo 1.**

### C3-C · La bodega fría y el comedor (4 salas) · Checkpoint antes del jefe

1. **La cámara fría.** El hielo del techo se derrite y gotea en columnas que mojan.
   - Aquí Choco va al frente: es fresco para él. Abre el paso con dianas y mueve cajas con el lazo.
   - Tapita avanza bajo el escudo de Choco, o tapando goteras con melcocha.
   - **Contraste intencional:** después de una sección de puro calor, una donde Tapita necesita a Choco.
2. **El fregadero.** Un fregadero largo lleno de agua con un tapón al fondo.
   - Choco bucea, saca el tapón (lo jala con el lazo) y el agua se va.
   - Tapita pasa por el fondo seco hasta un botón pesado. Ese botón abre la puerta de Choco, que mientras tanto está encerrado en el fregadero que se vuelve a llenar.
3. **El comedor y la marimba.** Teclas de marimba que suben y bajan al ritmo.
   - Si Tapita hace martillazo en una tecla grave, una tecla aguda del otro lado salta más alto, y Choco la usa para llegar a la tarima.
   - Las dos rutas se cruzan varias veces.
   - **Recuerdo 2:** encima de la marimba, con una secuencia de 4 martillazos a tiempo con la música.
4. **El mostrador de Doña Mayela.**
   - Para pasar a la cocina grande hay que responderle a Doña Mayela. "¿Con yuca o con tortilla?" tiene dos botones, uno de cada color; si cada uno pisa uno distinto, la pregunta se cierra (respuesta: "con todo").
   - **Recuerdo 3:** el limón detrás del mostrador, por un túnel bajo y una plataforma fantasma que Choco sostiene con la Vista Debug.

## Jefe: La Paila Mayor

La paila más grande de la cocina (96×56 px): una olla de hierro negro sobre un fogón enorme, con dos ojos de chicharrón que flotan en el aceite, un borde que funciona como boca y dos asas a los lados. Tiene el eco atrasado de L.A.G.

**Arena:** la cocina grande. La paila en el centro sobre su fogón, dos mesas de acero (plataformas), un fregadero a cada lado (para que Choco se enfríe) y la **perilla del gas** en la pared del fondo, alta.

**Patrones:**

1. **Salpicadura:** el aceite salta en 3 o 5 arcos (aviso: burbujas grandes y un sonido de borboteo). Choco necesita el escudo, la hoja de Tapita o estar lejos.
2. **Chicharrones saltarines:** escupe 2 o 3 chicharrones que rebotan por la arena 4 s.
3. **Ola de aceite:** se ladea (aviso: 1 s, las asas brillan) y derrama una ola de aceite por el piso de un lado.
   - Choco tiene que estar en una mesa, en el fregadero o montado en Tapita.
   - Tapita no recibe daño, pero la ola la empuja si no está plantada.
4. **Fase 2 (al 50 %): fuego alto.** El fogón crece y el calor ambiente sube a 20/s. Choco tiene que ir a los fregaderos con frecuencia, y Tapita lo cubre con la hoja cuando puede.

**Cómo se le hace daño (necesita a los dos):**

1. Choco le dispara a la **perilla del gas** (diana cian, alta: hay que apuntar en diagonal). La llama baja y el aceite deja de hervir durante **4 s**.
2. En esos 4 s, Tapita salta al borde de la paila (el calor no le hace nada) y hace **martillazo sobre un asa**: la paila se ladea y los dos ojos de chicharrón quedan expuestos en la parte baja durante 3 s.
3. Los dos atacan los ojos: el mazo de Tapita (2) y los disparos de Choco (1, cargado 3).
4. Si Tapita no llega al asa a tiempo, la llama vuelve con un **estallido** (aviso de 0.5 s) que la empuja fuera del borde.

**Vida:** 30.

**Derrota:** la paila se enfría con un silbido y los ojos de chicharrón se vuelven chicharrones normales. Doña Mayela sale del loop:

> **Doña Mayela:** Diay, ¿y ustedes qué van a querer?
> **Tapita:** Con todo. Y con limón.

Si encontraron los 3 limones, la cinemática muestra el plato completo, con limones.

## Criterios de aceptación

- El calor fuerte se siente exigente pero se puede manejar con la hoja de Tapita, sin que Choco tenga que adivinar.
- La cámara fría invierte el rol (Choco al frente) para no dejar a Choco sin protagonismo en el mapa.
- El patrón de la marimba se aprende escuchándolo.
- En el jefe, la secuencia perilla → martillazo → ataque doble se entiende al segundo intento.
