# 04 · Arte y animación

## Resolución y escalado

- **Resolución interna:** 320×180 px (16:9). Todo se dibuja en un canvas de ese tamaño.
- **Escalado:** entero (×2, ×3, ×4, ×6) al tamaño más grande que quepa en la ventana, centrado con barras negras. `imageSmoothingEnabled = false` y `image-rendering: pixelated` en CSS.
- **Tiles:** 16×16 px. Una pantalla muestra 20×11.25 tiles.
- **Cámara:** sigue a Choco con zona muerta horizontal de 24 px, look-ahead de 32 px hacia donde mira y suavizado (lerp 0.12). Posición de la cámara redondeada a píxel entero para evitar temblor.

## Cómo se crean los sprites

Todo el arte se genera **en código**, sin archivos de imagen (excepto el logo de CHC Studio):

- Cada sprite se define como un arreglo de strings donde cada carácter es un índice de paleta (`.` = transparente).
- Al iniciar el juego, un módulo "horneador" convierte esas definiciones en canvas fuera de pantalla (spritesheets) una sola vez.
- Las variantes (volteado horizontal, flash blanco de daño, siluetas, tintes) se generan también al hornear, no en cada frame.
- Mantener las definiciones en archivos por personaje o nivel dentro de `src/art/`.

Ejemplo de formato:

```js
export const CHOCO_IDLE_0 = [
  "....aaaa........",
  "...abbbba.......",
  // ...
];
export const CHOCO_PALETTE = { a: "#1E120C", b: "#5C3521", /* ... */ };
```

## Principios de animación (obligatorios)

- **Squash & stretch** en saltos, aterrizajes y golpes.
- **Anticipación** antes de toda acción importante de enemigos y jefes (telegrafiado).
- **Hit-stop:** congelar 3–6 frames al recibir o dar golpes fuertes.
- **Screen shake** proporcional al impacto, con decaimiento, desactivable en Opciones.
- **Flash blanco** de 2 frames al recibir daño (enemigos y Choco).
- **Partículas:** polvo al correr/aterrizar, migajas de cacao, chispas de disparo, explosiones de píxeles al morir un enemigo, destellos al recoger objetos, gotas de chocolate con calor.
- **Movimiento secundario:** la bufanda de envoltura de Choco, banderines, hojas, pelo/antenas de enemigos.
- **Transiciones de escena:** fade, iris (círculo que se cierra sobre Choco) y glitch (bloques de píxeles desplazados), según el contexto.
- **Texto:** los diálogos se escriben letra por letra con sonido; pausa breve en comas y puntos.

## Tipografía

- Fuente bitmap propia de **5×7 px** (y una de 8×8 para títulos), dibujada en código, que **incluya tildes y ñ** (á é í ó ú ü ñ Á É Í Ó Ú Ñ ¿ ¡) y los símbolos `{ } [ ] ( ) < > / \ _ = ; : ! ? . , ' " % # + - * ∅ ✔`.
- Texto con sombra de 1 px para legibilidad.
- Título del juego con letras grandes pixeladas, efecto de chocolate derretido goteando y un glitch ocasional.

## Paletas por nivel

| Nivel | Colores principales | Ambiente |
|---|---|---|
| 0 · Cuarto | `#1A1426` noche, `#F2B25C` lámpara, `#3C6EF0` tele, `#FF2E88` glitch | Cálido e íntimo, luego invadido por magenta |
| 0 · Pantalla de Carga | `#07070C`, `#2A2F45` wireframe, `#43D9FF` | Vacío y a medio renderizar |
| 1 · Mundo Cartucho | `#5EC8FF` cielo, `#4CBB4C` pasto, `#8B5A2B` tierra, `#FFD23F` bloques Y; cuevas `#0F3B2E` y `#D9AE4B`; castillo `#5A5A6E` y `#E0343F` | Luminoso, clásico, cada vez más corrupto |
| 2 · UNA | `#E9DCC3` paredes, `#8C2F39` acento vino, `#6B4E3D` madera, `#2D5A3D` pizarras | Cálido, académico |
| 3 · Novacomp | `#1B2230` noche, `#3A4A63` muebles, `#8FB3D9` monitores, `#E0343F` alarma, `#6FCF7F` plantas | Frío y moderno, tenso |
| 4 · Santa Cruz | `#FFB347` sol, `#F5E6C8` adobe, `#B5532E` tejas, `#6E8B3D` guanacaste, `#FF6B8A` atardecer | Caliente, festivo, polvoriento |
| 5 · Código Puro | `#07050D` fondo, `#2A1446` morado, `#43D9FF` código de Choco, `#FF2E88` N.U.L.L. | Abstracto, intenso |

## Iluminación y efectos de pantalla

- **Noche e interiores oscuros:** capa de oscuridad multiplicada con "agujeros" de luz radiales (lámparas, monitores, conos de visión, el báculo al cargar).
- **Glitch:** desplazamiento horizontal de franjas, aberración cromática (copias rojo/cian desplazadas 1–2 px) y bloques de píxeles aleatorios. Se intensifica cerca de N.U.L.L.
- **Vista Debug:** filtro azul oscuro, cuadrícula de 16 px, contornos cian en lo revelado y un leve ruido de escaneo.
- **Calor (nivel 4):** ondulación de las filas superiores e inferiores de la pantalla con una onda senoidal.
- **Filtro CRT opcional:** scanlines suaves y viñeta; desactivado por defecto, activable en Opciones.

## Parallax

- Entre 2 y 4 capas por nivel de plataformas, con velocidades 0.1, 0.3, 0.6 y 1.0.
- Las capas lejanas se dibujan con menos contraste.

## Logo de CHC Studio

- Archivo: `assets/logo_chc_studio.png` (fondo blanco, colores `#191D28` y `#02C18E`).
- Se usa **solo** en la pantalla de presentación y en los créditos. No influye en el diseño de Choco ni en las paletas de los niveles.
- En la presentación, mostrarlo sobre fondo blanco escalado con suavizado de imagen activado solo para ese dibujo (es un logo vectorial, no pixel art), con fade de entrada y salida.
