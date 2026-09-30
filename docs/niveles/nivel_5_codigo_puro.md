# Nivel 5 · El Código Puro

**Género:** plataformas vertical (gauntlet) + jefe final de 4 fases tipo bullet hell. **Duración objetivo:** 15–25 minutos con muertes.
**Vida disponible:** 5 cuadritos (barra completa). **Objetos:** todos.
**Recompensa:** Trofeo del Código Fuente.

## Concepto

No hay paisaje. Solo código: líneas que se escriben y se borran en el fondo, llaves y corchetes flotando, estructuras de datos como plataformas. Colores: negro profundo, morado oscuro, cian del código de Choco y magenta de N.U.L.L. A medida que se sube, el fondo pasa de código ordenado a código cada vez más glitcheado.

Los cuatro fundadores aparecen como pequeños ecos de luz en los bordes de la pantalla y dan consejos breves en momentos clave.

## 5-A · El Stack (≈ 14 pantallas verticales)

Una escalada vertical que exige usar **todos** los objetos. La cámara sigue a Choco hacia arriba.

**Secciones:**

1. **Push:** plataformas que aparecen y se apilan; doble salto obligatorio.
2. **Firewall enemigo:** muros de fuego de código que solo se atraviesan con el escudo activo, y torretas de Excepciones con proyectiles reflejables (parry para romper candados).
3. **Memoria fantasma:** tramo largo de plataformas fantasma; exige gestionar la batería de la Vista Debug (hay que apagarla en plataformas sólidas para recargar).
4. **Punteros:** cadena de nodos de lazo con Fragmentos de N.U.L.L. persiguiendo.
5. **Overflow:** tramo final donde una masa de datos corruptos **sube desde abajo** a ritmo constante; combina todo lo anterior. Tocarla es perder un cuadrito y ser devuelto a la plataforma segura más reciente.

**Checkpoints:** al inicio, después de la sección 3 y antes del jefe.

**Y doradas:** una en cada una de las secciones 2, 3 y 5, en desvíos opcionales de alto riesgo.

## Jefe final: N.U.L.L.

**Arena:** una pantalla (320×180) con suelo y 3 plataformas flotantes. N.U.L.L. flota en el tercio superior. Barra de vida grande arriba, dividida en 4 segmentos (uno por fase).

**Reglas:**

- Al morir, se reintenta **la fase actual** (se pierde una vida).
- Con Game Over, se vuelve al checkpoint antes del jefe (fase 1).
- Entre fases hay una pausa de 3 s con diálogo de N.U.L.L. y el fundador de esa fase dando un consejo; se recupera 1 cuadrito.
- La música cambia de capa en cada fase (se agregan instrumentos).

### Diálogo de entrada

Ver `docs/01_historia.md` ("Llegaste completo...").

### Fase 1 · "Ondas" (Botas de Doble Salto) · consejo de Óscar

- N.U.L.L. golpea el suelo con sus alas de código y manda **ondas** en ritmo: sencillas, dobles, triples, y luego **ondas de dos alturas** (baja + alta) que solo se pasan con doble salto bien sincronizado.
- **Pilares de código** que salen del suelo con aviso 0.5 s antes.
- **Ventana de daño:** tras cada patrón, el monitor baja a la altura de las plataformas 3 s. Hay que dispararle a la pantalla. **6 golpes** (o 2 cargados).
- Óscar: "¡Saltá con el corazón, Choco! ...y con las botas."

### Fase 2 · "Ráfagas" (Escudo Firewall) · consejo de Hezron

- Patrones de bullet hell: espirales, abanicos y lluvias de Excepciones.
- Algunas balas son **magenta con borde blanco**: son las únicas reflejables. **Solo las balas reflejadas con parry** le hacen daño. **4 reflejos** para terminar la fase.
- Las balas normales se bloquean con el escudo (con su tiempo de recarga, no se puede abusar).
- Hezron: "Tranqui. Esperá la bala blanca y devolvésela."

### Fase 3 · "Invisible" (Laptop Debugger) · consejo de Stward

- La arena se oscurece. N.U.L.L. se vuelve **invisible** y aparecen **3 copias** idénticas; solo la real tiene punto débil, visible con **Vista Debug**.
- Las plataformas flotantes pasan a ser **plataformas fantasma**: sin Vista Debug no se puede estar arriba.
- Las copias falsas disparan también; al dispararle a una falsa, explota en Fragmentos que persiguen a Choco.
- Cada vez que se golpea a la real, las copias se barajan. **8 golpes** al punto débil.
- La gestión de batería es la clave: apagar la vista en el suelo para recargar.
- Stward: "No le creás al que más brilla, mae. Debugueá primero, disparás después."

### Fase 4 · "Núcleo" (Lazo de Fibra Óptica) · consejo de Fabiola

- El suelo **se derrumba** en píxeles: debajo solo hay vacío. Solo quedan **nodos** para columpiarse y dos plataformas pequeñas que aparecen y desaparecen.
- N.U.L.L. orbita la arena disparando láseres en barrido (telegrafiados con una línea fina 0.8 s antes).
- Su **núcleo** (el ∅ del monitor) se vuelve "enganchable" cuando está alineado con un nodo cercano (brilla en blanco). Choco debe lanzar el lazo al núcleo y **jalarlo**: el núcleo queda expuesto 3 s para un **disparo cargado**.
- **3 jalones + 3 disparos cargados** para terminar.
- Fabiola: "Con cuidado, Choco. Como cuando pruebo algo nuevo: despacito y con confianza."

### Final · "El parche"

- N.U.L.L. queda debilitada, con la pantalla parpadeando. Choco se engancha con el lazo al núcleo y la cámara hace zoom a la pantalla.
- Aparece en grande el comentario `// TODO: arreglar el manejo de null. Después lo veo.`
- **Minijuego de parche:** 4 líneas de código, cada una con una secuencia de 6 flechas. Cada secuencia correcta escribe la línea con efecto de tecleo, y los 4 fundadores aparecen a los lados animando (una línea por fundador).
- **Límite de 20 s.** Un error reinicia la línea actual. Si se acaba el tiempo, N.U.L.L. lanza un pulso que quita 1 cuadrito y se reintenta el parche (no la fase).
- Código del parche (se escribe en pantalla):

```js
if (nucleo === null) {
  nucleo = new Amigo();
}
return esperanza;
```

## Cinemática final

Ver `docs/01_historia.md`. Requisitos de pulido:

1. N.U.L.L. se estabiliza: la aberración cromática desaparece poco a poco y el magenta se vuelve blanco cálido.
2. Su forma se desarma en píxeles que caen como nieve y queda un cursor pequeño parpadeando.
3. La Y dorada gigante baja flotando; todos los rótulos vistos en el juego aparecen en un montaje rápido completándose.
4. Cada fundador tiene un momento de celebración de 2 s (Óscar llora abrazando la Y, Stward rapea una línea, Hezron suelta una nube en forma de corazón, Fabiola por fin come algo).
5. La barra de chocolate completa se reúne y aparece el **Trofeo del Código Fuente**: una copa dorada de pixel art con un símbolo `{ }` grabado. Choco la levanta, destellos, fade a blanco.
6. Epílogo en el cuarto: 12:00 a. m., el trofeo en el estante y el cursor en la tele escribe `hola :)`.
7. Pantalla de estadísticas finales, luego créditos.

## Criterios de aceptación

- Cada fase obliga a usar su objeto; no se puede ganar sin él.
- Los ataques siempre tienen telegrafiado claro.
- Un jugador que llegó hasta aquí debe necesitar varios intentos, pero sentir que mejora en cada uno.
- La pelea completa dura entre 4 y 7 minutos sin morir.
- El final se siente emotivo: música, ritmo de la cinemática y cierre de todos los chistes recurrentes.
