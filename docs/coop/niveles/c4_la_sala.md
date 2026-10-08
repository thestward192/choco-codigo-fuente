# C4 · La Sala (nivel final cooperativo)

**Género:** plataformas con puzzles de sincronización + jefe de 3 fases. **Duración objetivo:** 15–20 minutos (varios intentos en el jefe).
**Se abre:** al completar C1, C2 y C3. **Peligros:** paquetes corruptos (dañan a los dos), latencia. **Jefe:** L.A.G.

## Concepto

El interior de la conexión entre los dos jugadores. Cables de datos que pasan como ríos de luz, paquetes que viajan de un lado al otro y relojes que no coinciden. La mitad del lugar es cian (el lado de Choco) y la otra mitad ámbar (el lado de Tapita).

Aquí la mecánica es la **latencia misma**, usada como puzzle:

- **Lo que hace uno, le llega al otro un segundo tarde.** Es un retraso de diseño, siempre de exactamente 1 s y siempre visible, no la latencia real de la red.
- Hay que **anticiparse** y **coordinarse**, no solo turnarse.

Ya no hay agua ni calor: los dos son igual de vulnerables y todo depende de la sincronía.

## Elementos nuevos del mapa

- **Rastro de paquetes:** cada personaje deja tras de sí una estela de cubitos de luz de su color. **1 s después**, la estela se vuelve sólida durante 2 s, pero **solo para el compañero**. Uno "dibuja" el camino que el otro va a pisar.
- **Puertas con eco:** una puerta que abre un jugador se abre en el lado del otro 1 s más tarde, y se cierra igual.
- **Paquetes corruptos:** bloques magenta que se mueven en línea recta y dañan a los dos.
- **Relojes:** relojes de pared que, al dispararles (Choco) o martillarlos (Tapita), **congelan** 3 s una parte de la sala del compañero (plataformas móviles, paquetes).
- **Cables de datos:** corrientes horizontales que arrastran a los dos. Tapita plantada no se mueve, y Choco se puede amarrar a ella con el lazo.

## Estructura

### C4-A · La cola de paquetes (3 salas)

1. **El rastro.** Una sala con un vacío enorme.
   - Choco cruza con doble salto y su estela se vuelve el puente de Tapita un segundo después.
   - Después al revés: Tapita sube trepando por una pared (pegajosa) y su estela le arma a Choco los escalones de una pared lisa.
   - **Enseña:** el rastro de paquetes.
2. **Las puertas con eco.** Dos pasillos paralelos (arriba Choco y abajo Tapita) con puertas que se abren con eco.
   - Cada uno tiene que abrir la puerta del otro **1 s antes** de que el otro llegue.
   - Si la abre muy tarde, el otro choca; si la abre muy temprano, se cierra antes de que pase.
3. **Los relojes.** Paquetes corruptos cruzan las dos mitades de la sala.
   - Cada uno congela, con los relojes de su lado, los paquetes de la mitad del otro.
   - Al final, una doble firma, con relojes que se congelan y se descongelan.

### C4-B · La sala espejo (3 salas) · Checkpoint

1. **Espejo.** La pantalla de cada jugador muestra su mitad (arriba o abajo) y la del otro en pequeño en una esquina, como "cámara del compañero" (cuadro de 96×54 px).
   - Las mitades son reflejos con una diferencia: cada botón de una mitad mueve una plataforma de la otra.
   - Hay que guiarse con la señal y la cámara del compañero.
2. **El cable.** Un cable de datos atraviesa la sala y arrastra hacia el vacío.
   - Tapita se planta en mitad del cable y Choco se columpia de ella para cruzar.
   - Después Choco jala a Tapita con el lazo, mientras ella va pegada a la pared de enfrente.
3. **La antesala.** Un pasillo de recuerdos de los tres mapas (el ferry, la piscina y la paila) en miniatura y glitcheados, con un reto rápido de cada uno, como repaso.
   - Termina en la puerta doble de la arena.

## Jefe: L.A.G.

*Lógica de Atraso Global.* Un **reloj de arena** gigante (64×96 px) hecho de paquetes de datos: la arena que cae son cubitos blancos. Tiene **dos caras**, una cian arriba y una ámbar abajo, que hablan la misma frase con un segundo de diferencia. Todo lo que hace tiene un eco atrasado.

**Arena:** un espacio cuadrado con plataformas que flotan a los lados, el reloj en el centro y el piso dividido en una mitad cian y otra ámbar.

### Fase 1 · Eco (100 % → 66 %)

- **Ataques con eco:**
  - Lanza ráfagas de paquetes en línea recta (aviso: la cara brilla).
  - **1 s después, la misma ráfaga se repite** en el mismo lugar: un "fantasma" del ataque, que se dibuja transparente antes de volverse sólido.
  - Hay que esquivar el ataque y no quedarse donde estaba.
- **Cómo se le hace daño:**
  - La **cara cian** solo recibe daño de Choco (disparos) y la **cara ámbar** solo de Tapita (mazo, desde las plataformas laterales, o melcocha, que la aturde).
  - El daño a una cara queda "**en espera**" (una barra que se vacía en 1 s). Si la otra cara recibe un golpe en ese segundo, **el daño de los dos cuenta**. Si no, la cara se cura.
  - Hay que atacar en sincronía, con la señal o contando.

### Fase 2 · Separación (66 % → 33 %)

- El reloj se da vuelta y una **pared de datos** parte la arena en dos: Choco queda en la mitad de arriba y Tapita en la de abajo. Cada uno ve al otro solo por la cámara del compañero.
- **Lo que pasa en una mitad, pasa en la otra 1 s después:**
  - Los paquetes que esquiva Choco le llegan a Tapita un segundo más tarde, por el mismo lugar.
  - Uno ve el ataque antes y le puede avisar al otro con la señal.
- **Cómo se le hace daño:**
  - L.A.G. lanza paquetes blindados.
  - Choco los refleja con **parry** hacia la pared de datos.
  - Cada paquete reflejado aparece 1 s después en la mitad de Tapita, que tiene que **devolverlo con el mazo** hacia el núcleo del reloj (el mazo tiene la potencia que no tiene el disparo).
  - Solo los paquetes que pasan por los dos hacen daño.

### Fase 3 · Handshake (33 % → 0 %)

- La pared cae. El reloj baja al centro y gira, con la arena cayendo cada vez más rápido.
- Aparecen **dos terminales**, una en cada extremo de la arena, que **cambian de lugar** cada vez que se usan.
- **Cómo se le hace daño:**
  - Los dos tienen que activar sus terminales con menos de **0.5 s** de diferencia (un **handshake**) mientras esquivan ráfagas con eco y paquetes corruptos.
  - Cada handshake exitoso le quita un tercio de lo que le queda. Son **3 handshakes**.
  - Un handshake fallido (más de 0.5 s de diferencia) suelta una onda que empuja a los dos al borde.
- **La música** (dos pistas desfasadas desde la fase 1) se va alineando con cada handshake, y suena perfectamente junta en el último.

**Vida:** 36 en total: 12 por fase (fases 1 y 2) y 3 handshakes en la fase 3.

**Derrota:** el reloj de arena se detiene. Todos los paquetes caen **al mismo tiempo**, por primera vez, y forman un pequeño ícono de carga que gira tranquilo. Cinemática final (ver `docs/coop/01_historia_coop.md`).

## Recuerdos

La Sala no tiene recuerdos. Si se encontraron los 9 de los otros mapas, al final se desbloquea la **escena extra**: Choco, Tapita, Juan Carlos y Doña Mayela en el muelle de Puntarenas al atardecer, con churchill, carne asada y chicharrón con limón, mientras el ícono de carga gira entre ellos.

## Criterios de aceptación

- El retraso de diseño (1 s) siempre se ve, y nunca se confunde con la latencia real de la red.
- Las tres fases del jefe exigen a los dos jugadores; ninguna se puede vencer con uno solo.
- La cámara del compañero de la sala espejo se lee bien a 320×180, sin tapar la acción propia.
- La alineación de la música en la fase 3 se nota y se siente como una victoria.
