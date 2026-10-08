# Coop 03 · Mecánicas cooperativas

Todos los números de este documento son iniciales y van a `config/balance.js` en el bloque `COOP`. Los textos van a `data/dialogues.js`.

## Controles

- Cada jugador juega en su computadora con sus propios controles, incluidos los que haya reasignado (teclado, mouse o gamepad).
- Tapita usa las mismas acciones que Choco con otro efecto (ver la tabla en `docs/coop/02_tapita.md`).
- **Acción nueva: Señal** (T por defecto, Back/Select en gamepad; reasignable). Pone un marcador "¡Aquí!" durante 3 s en el punto donde está el personaje, con un sonido corto que el compañero escucha. Si se mantiene y se mueve con las flechas, el marcador se puede poner hasta 5 tiles lejos. Es la forma de comunicarse sin chat.

## Choco en el modo cooperativo

- Tiene **todo** desde el inicio: báculo apuntado en 8 direcciones, doble salto, Vista Debug, escudo y lazo. Física y números iguales al modo normal.
- **Vida:** 4 cuadritos.
- **Calor:** usa el medidor del nivel 4 en las zonas marcadas como calientes (sol de Puntarenas, brasas, cocina de la chicharronera). Los números son los de `HEAT`, salvo los de cada mapa.
- **Agua:** Choco **sí** se puede mojar:
  - **Agua baja** (hasta la mitad del cuerpo): camina al 70 %.
  - **Agua profunda:** **flota y nada**. Sube a la superficie solo; con ↓ bucea a 60 px/s.
  - **Oxígeno:** 10 s debajo del agua (medidor de burbujas sobre la cabeza). Se recarga al salir a la superficie o al tocar una burbuja de aire. Al agotarse pierde 1 cuadrito y sale a flote.
  - **Disparos debajo del agua:** van a la mitad de velocidad y alcance.
- **Aceite y planchas calientes:** tocarlos le quita 1 cuadrito y lo hace rebotar.

## Interacciones entre los dos

Estas son las mecánicas que hacen que el compañero sea necesario. Cada una se enseña en el prólogo cooperativo o en la primera sala de un mapa.

### Apilarse y montarse

- Los personajes son **sólidos por arriba** uno para el otro: uno se puede parar sobre el otro.
- **Tapita sobre Choco:** Choco la carga.
  - Choco camina al 85 % y salta a −240 px/s, sin doble salto mientras la lleva.
  - **En el agua Choco flota y sirve de balsa:** Tapita va seca encima mientras no se sumerja.
- **Choco sobre Tapita:** Tapita lo carga a velocidad normal. Choco no toca el piso, así que pasa sobre planchas calientes sin quemarse, aunque el medidor de calor ambiente sigue corriendo.
- El de arriba puede saltar desde el de abajo: es un escalón de 1.5 tiles extra.
- **Peso combinado:** si los dos están sobre la misma plataforma o botón, el peso se suma (Choco 1 + Tapita 2 = 3).

### Choco con el lazo y Tapita

- **Tapita plantada es un nodo de lazo:** Choco se columpia de ella con la física normal del lazo.
- **Tapita sin plantar se puede jalar:** si Choco está en el suelo, el lazo la arrastra hacia él a 120 px/s. Sirve para cruzar vacíos cortos o sacarla del agua a tiempo.

### Vista Debug compartida

- Mientras Choco mantiene la Vista Debug, las **plataformas fantasma son sólidas para los dos**. Tapita las ve con un borde punteado cian, aunque no tenga la vista activa.
- La batería se gasta igual que en el modo normal. Por eso los puzzles de fantasmas exigen que Tapita cruce rápido mientras Choco "le sostiene la luz".

### Escudo compartido

- Si Tapita está a 12 px o menos de Choco cuando él activa el escudo, la burbuja los cubre a los dos. Bloquea proyectiles y **salpicaduras de agua** que la dañarían a ella.
- El parry funciona igual que en el modo normal.

### Hoja sombrilla de Tapita

- Choco bajo la sombra de la hoja enfría como en la sombra normal. Es la forma de cruzar zonas calientes largas: Tapita adelante con la sombrilla y Choco pegado a ella.

### Martillazo e impulso

- La onda del martillazo hace saltar a Choco 0.5 tile extra si está a menos de 2 tiles. Combinado con su doble salto, le permite llegar a alturas a las que solo no llega.

## Elementos de puzzle

Código de colores fijo en los tres mapas, para que los puzzles se lean sin explicación:

- **Cian** (el color del báculo y los audífonos de Choco): solo Choco lo activa.
- **Ámbar** (el dulce de Tapita): solo Tapita lo activa.
- **Blanco/gris:** cualquiera de los dos.
- **Magenta con rayas:** necesita a los dos.

| Elemento | Quién lo activa | Comportamiento |
|---|---|---|
| Botón liviano (gris) | Cualquiera | Activo mientras alguien lo pise |
| Botón pesado (ámbar, ancho) | Peso ≥ 2 | Tapita sola, o los dos apilados |
| Botón extrapesado (ámbar con rayas) | Peso ≥ 3 | Tapita plantada, o Tapita con Choco encima |
| Botón de martillazo (ámbar con grieta) | Martillazo de Tapita | Algunos quedan activos un tiempo (temporizador visible) |
| Diana de código (cian, `{ }`) | Disparo del báculo | Algunas solo se alcanzan apuntando arriba o en diagonal |
| Terminal de doble firma (magenta) | Los dos | Dos terminales separadas: hay que interactuar con las dos con menos de 0.5 s de diferencia. Hay cuenta regresiva en pantalla al tocar la primera |
| Palanca (gris) | Cualquiera | Cambia de estado al interactuar |
| Balanza de poleas | Por peso | Dos plataformas unidas por una cuerda: baja la que tiene más peso, 40 px/s |
| Compuerta | Botón o palanca conectados | Se abre mientras su señal esté activa (algunas quedan abiertas) |
| Plataforma fantasma | Vista Debug de Choco | Sólida para los dos mientras Choco la mantiene |
| Nodo de lazo | Choco | Igual que en el modo normal |
| Túnel bajo (1 tile) | Tapita | Choco no cabe |
| Cortina de agua | Choco pasa | Tapita se daña. La puede tapar con melcocha, o pasar bajo el escudo de Choco |
| Cortina de vapor o calor | Tapita pasa | Choco se daña. Se cruza bajo la hoja sombrilla |
| Bloque de azúcar agrietado | Martillazo | Se rompe y deja un hueco |
| Caja de madera | Mazo (empuja); disparo cargado (rompe) | Las cajas grandes solo las empuja Tapita; Choco las puede jalar con el lazo |
| Ventilador / extractor | Empuja según el peso | A Choco lo eleva (corriente para subir); a Tapita apenas la mueve; plantada no la mueve |
| Agua con marea | — | Sube y baja en ciclos con aviso de 1.5 s (sonido y burbujas). Choco nada; a Tapita la disuelve |
| Chorro / aspersor | — | Salpicaduras que dañan a Tapita. Se tapa con melcocha 6 s |
| Plancha caliente / aceite | — | Daña a Choco al tocarlo; Tapita camina encima sin problema |
| Puerta de salida doble | Los dos | Dos marcos (cian para Choco y ámbar para Tapita). La sala termina cuando cada uno está en el suyo durante 0.5 s |

## Vida, derrota y reaparición

- Cada personaje tiene su vida: Choco 4 cuadritos y Tapita 4 trozos.
- **No hay vidas limitadas** en el cooperativo. El costo de equivocarse es el tiempo, y se refleja en el resultado.
- **Si uno cae** (sin vida, disuelta, derretido o al vacío):
  - Se ve una animación de "se cayó la conexión": el personaje se pixela y desaparece.
  - A los 3 s reaparece en el **último checkpoint de la sala**, con vida completa, mientras el compañero siga en pie.
  - Los botones que soltó se sueltan, pero las compuertas que ya quedaron abiertas no se cierran.
- **Si caen los dos**, la sala se **reinicia completa**: puzzle, enemigos y objetos. Así un puzzle nunca queda trabado.
- **Sin muertes injustas:** todo peligro se anuncia (regla general del juego). La marea avisa, los aspersores gotean antes de encenderse y los contenedores proyectan sombra antes de caer.

## Salas y checkpoints

- Cada sección está hecha de **salas de puzzle** de 1 a 3 pantallas, separadas por puertas de salida dobles.
- La cámara de cada jugador sigue a su propio personaje. Las salas están diseñadas para que los dos casi siempre se vean.
  - Si el compañero sale de la pantalla, aparece una **flecha en el borde** con su color y la distancia en tiles.
- Entrar a una sala nueva guarda checkpoint para los dos.

## Coleccionables

- **Recuerdos:** 3 por mapa y 9 en total, siempre en una sala opcional que exige una combinación difícil.
  - En Puntarenas son **pedacitos de churchill**, en la casa de Juan Carlos **chancletas perdidas** y en la Chicharronera **limones**.
  - Juntar los 9 desbloquea la escena extra del final cooperativo.
- **Bits** (Choco) y **cristales** (Tapita): cada uno junta solo los suyos. Se cuentan en los resultados y no dan vidas.

## Resultados del mapa

- Tiempo total, caídas de cada uno, bits, cristales y recuerdos.
- **Sincronía:** porcentaje de puertas dobles en las que los dos llegaron con menos de 3 s de diferencia. Es un dato divertido, no afecta la nota.
- **Nota** (S, A, B o C) según el tiempo, con límites por mapa en `COOP.RANKS`.

## Pausa, diálogos y cinemáticas

- **No hay pausa real en línea.** Abrir el menú de pausa no congela el juego. El compañero ve un ícono "en el menú" sobre el personaje del otro, y los peligros le siguen haciendo daño. El menú tiene Continuar, Controles, Opciones y "Salir de la sala".
- **Diálogos:** avanzan cuando **los dos** presionan confirmar, o solos después de 4 s por caja. Saltar una cinemática exige que los dos mantengan Esc (un anillo por jugador).
- **Jefes:** cada jefe exige que los dos hagan algo para dañarlo (ver cada mapa). Ninguno se puede vencer con un solo jugador atacando.

## Dificultad

- **Curva:** prólogo muy fácil; C1, C2 y C3 de dificultad parecida entre sí (se pueden jugar en cualquier orden); C4 exigente.
- Los puzzles se basan en descubrir la combinación, no en precisión extrema. La precisión se pide en los jefes y en las salas de recuerdos.
- **Modo desarrolladora:** funciona igual que en el modo solo, aplicado al jugador que lo tenga encendido. Ninguno de los dos se cae, J activa el vuelo libre y las habilidades son infinitas, para probar las salas con una sola persona y dos ventanas.
