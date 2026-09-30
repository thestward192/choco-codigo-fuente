# Nivel 3 · Oficinas de Novacomp

**Género:** sigilo de vista cenital. **Duración objetivo:** 12–18 minutos.
**Vida disponible:** 3 cuadritos. **Objetos:** Báculo (aturde, hace ruido), Laptop Debugger (hackeo y Vista Debug).
**Rescate:** Hezron (a mitad del nivel). **Recompensa:** Escudo Firewall.

## Concepto

El recuerdo del trabajo convertido en una oficina de alta seguridad, de noche, con luces de emergencia. Oficina tech moderna: escritorios con dos monitores, plantas, pizarras con post-its, una cafetera, salas de reuniones de vidrio, bean bags y una terraza. No usar el logo oficial de Novacomp: solo el nombre en la recepción y una ambientación inspirada en una oficina de tecnología.

**Regla de oro:** el sigilo debe ser **legible**. El jugador siempre ve los conos de visión, las rutas se pueden observar antes de entrar y el ruido se representa con ondas visibles.

## Sistema de sigilo

- **Conos de visión:** 60° de apertura, 72–96 px de largo según el enemigo; se dibujan semitransparentes y se cortan con las paredes (raycast contra el tilemap).
- **Sospecha:** si Choco está dentro de un cono, un medidor sobre el enemigo se llena en 0.7 s (0.35 s si está a menos de 32 px). Si sale del cono antes, baja poco a poco y el enemigo va a revisar el último punto donde lo vio ("?").
- **Alarma:** al llenarse → "!", luces rojas, música tensa, todos los BotSeg de la sección van hacia Choco. La alarma dura **12 s**; si Choco evita el contacto (escondiéndose en casilleros o debajo de escritorios marcados), vuelve la calma.
- **Contacto con un BotSeg:** Choco pierde 1 cuadrito y reaparece al inicio de la sección.
- **Ruido:** correr cerca de enemigos (radio 40 px), chocar con la aspiradora robot o disparar (radio 80 px) atrae a los enemigos al punto del ruido. Caminar sigiloso (Shift) no hace ruido.
- **Escondites:** casilleros y escritorios con tela; entrar con E, Choco queda invisible pero no puede moverse.
- **Báculo:** aturde a un BotSeg 2 s y a una cámara 3 s, pero hace ruido.

## Hackeo con la laptop

- Terminales en paredes: minijuego de secuencia de flechas (5–7 flechas, 3 s). Tres errores activan la alarma.
- **Efectos posibles:** apagar una cámara 10 s, abrir una puerta, desviar la ruta de un BotSeg, apagar un pasillo de láseres 6 s.
- **Vista Debug** en este nivel: muestra los **cables** que conectan cada terminal con lo que controla, y rutas futuras de los bots (una línea punteada), a costa de batería.

## Nubes de vapor de Hezron (segunda mitad)

- Tras rescatarlo, Hezron sigue a Choco (camina detrás, se esconde cuando Choco se esconde).
- **3 cargas** por sección. Con **C** (el botón del escudo, que todavía no se tiene) Hezron suelta una nube de 24 px de radio que dura **6 s** y **bloquea los conos de visión** que la atraviesan.
- Cada vez que usa una carga, dice un sabor distinto en un globo pequeño.

## Estructura

### 3-A · Recepción y lobby · Checkpoint

- Tutorial de sigilo: 2 cámaras giratorias y 1 BotSeg con ruta simple. Una terminal enseña a hackear.
- Detalle: recepción con el nombre "NOVACOMP" en letras pixeladas y un ascensor que no funciona.

### 3-B · Open space · Checkpoint

- Filas de escritorios, 3 BotSeg con rutas que se cruzan, 1 aspiradora robot, 2 cámaras.
- **Sala de reuniones del daily:** NPCs glitcheados sentados en círculo repitiendo "Ayer trabajé en... hoy voy a... sin bloqueos". No son enemigos; si Choco entra, lo invitan a hablar y pierde 3 s en un diálogo que no se puede saltar (chiste del daily).
- **Cafetera:** interactuar recupera 1 cuadrito una sola vez ("café de oficina: no sabe a nada, pero funciona").

### 3-C · Terraza · Rescate de Hezron

- Terraza al aire libre de noche con vista a luces de ciudad. Hezron está sentado en un bean bag rodeado de vapor; los drones pasan sin verlo.
- Diálogo de rescate (ver historia). Hezron no se une todavía a la barra: acompaña a Choco hasta el final del nivel.
- Mini tutorial: usar la primera nube para cruzar una zona patrullada por 2 drones.

### 3-D · Pasillo de gerencia y láseres · Checkpoint

- Pasillo con láseres rítmicos, 2 drones, 2 BotSeg y una cámara que cubre la única ruta.
- La oficina de gerencia tiene una caja fuerte (terminal difícil, 7 flechas, 2.5 s) con una Y dorada.
- Rutas alternativas: por la sala de impresión (más larga, menos guardias) o directo (más corta, requiere nubes).

### 3-E · Sala de servidores · Jefe

- Racks de servidores con luces parpadeantes, cables en el techo, frío (vapor en el aire).

## Jefe: DEADLINE

Un reloj de pared gigante corrupto, con manecillas afiladas y una pantalla en el centro que muestra una cuenta regresiva. Flota en el centro de una arena cenital de 20×11 tiles con 4 columnas-servidor y 3 terminales en los bordes.

**Cuenta regresiva:** empieza en **3:00**. Si llega a 0, "el deadline se venció": Choco pierde 1 cuadrito y el contador vuelve a 1:00.

**Ataques:**

1. **Invitaciones a reunión:** sobres que salen en abanicos de 5 y 8 proyectiles (esquivar o cubrirse detrás de columnas).
2. **Barrido de manecillas:** el minutero gira como un láser que recorre la arena; hay que ponerse detrás de una columna. Telegrafiado: la manecilla brilla y hace tic-tac más fuerte 1 s antes.
3. **Notificaciones:** 3 proyectiles lentos que **persiguen** a Choco durante 4 s. Una nube de Hezron las confunde: pierden el objetivo y se deshacen.

**Cómo vencerlo:**

- Hay que **hackear las 3 terminales** (secuencia de 6 flechas, 3 s) mientras sigue atacando. Durante el hackeo Choco no se puede mover.
- Cada terminal hackeada **congela el reloj 6 s** y abre su pantalla: se le dispara al núcleo (8 disparos normales, o menos con cargados, para vaciar un tercio de su vida).
- Tras cada tercio: más proyectiles por abanico y las manecillas giran más rápido. En el último tercio, las terminales se reubican.

**Derrota:** las manecillas se caen, la cuenta regresiva muestra "SIN FECHA DE ENTREGA" y el reloj se desarma. Hezron: "Tranqui. Ya no hay prisa." Se vuelve luz lila, se une a la barra (+1 cuadrito) y entrega el **Escudo Firewall**. Una sala corta de práctica al salir enseña bloquear y hacer parry contra una torreta de prueba.

## Y doradas

1. **Caja fuerte** de gerencia (3-D).
2. **Terraza:** encima de un toldo que solo se alcanza usando una nube para pasar entre 3 drones.
3. **Open space:** en el escritorio de "Choco" (con su nombre en un post-it), visible solo con Vista Debug.

## Criterios de aceptación

- Los conos de visión se ven siempre y se cortan con paredes correctamente.
- El jugador entiende por qué lo detectaron (el medidor de sospecha y el "!" son claros).
- Cada sección tiene al menos dos formas de resolverse.
- DEADLINE se puede aprender en 2–4 intentos y la cuenta regresiva genera presión sin ser injusta.
