# 05 · Audio

Todo el audio se genera con la **Web Audio API**, sin archivos: música chiptune con osciladores y efectos sintetizados. Original, sin melodías de otros juegos.

## Motor de audio

- Un contexto de audio que se crea tras la primera interacción del usuario (requisito del navegador). La pantalla de presentación dice "Presioná cualquier tecla" para desbloquearlo.
- Tres buses con volumen propio: **Música**, **Efectos** y **Voces** (bips de diálogo), más un volumen maestro. Todos ajustables en Opciones.
- Canales de música estilo consola clásica: 2 pulsos (onda cuadrada con ancho variable), 1 triangular (bajo) y 1 ruido (percusión).
- Secuenciador por patrones: cada canción se define como datos (notas, duraciones, instrumentos) en `src/audio/songs/`.
- Música por **capas**: algunas canciones agregan o quitan canales según la situación (alarma, fases del jefe).
- Transiciones: fundido de 0.5 s entre canciones.

## Música

| Pista | Uso | Carácter |
|---|---|---|
| Presentación / Título | Menú principal | Tema principal de Choco: pegajoso, con una melodía heroica y un toque melancólico |
| Cuarto | Prólogo | Calmada, lo-fi, con marimba lejana (simulada con triangular y decay corto) |
| N.U.L.L. | Apariciones | Motivo de 4 notas disonante, arpegios glitcheados |
| Mundo Cartucho | Nivel 1 | Alegre, rápida, clásica de plataformas; variación en cuevas y castillo |
| UNA | Exploración nivel 2 | Relajada, de "pueblo" de RPG |
| Batalla | Nivel 2 | Enérgica, con bajo constante |
| Beat de rap | Jefe nivel 2 | Beat de 90 BPM con bombo marcado; el tempo debe ser exacto porque la mecánica depende de él |
| Novacomp | Nivel 3 | Sigilosa, bajo pulsante y pocos elementos; capa de alarma que agrega percusión y una alarma en pulso |
| DEADLINE | Jefe nivel 3 | Tic-tac incorporado a la percusión, acelerando |
| Santa Cruz | Nivel 4 | Festiva, con ritmo de marimba y rasgueo, en compás que recuerde a la música folclórica guanacasteca |
| Torito Kernel | Jefe nivel 4 | Versión intensa y distorsionada del tema de Santa Cruz |
| El Stack | Nivel 5 | Tensa y ascendente |
| N.U.L.L. Final | Jefe final | 4 capas que se suman fase a fase; el motivo de N.U.L.L. y el tema de Choco se enfrentan |
| Parche / Final | Cinemática final | El tema de Choco lento y emotivo; el motivo de N.U.L.L. resuelto en acorde mayor |
| Créditos | Créditos | Medley alegre de todos los temas |

## Efectos de sonido

Cada efecto se define como una función parametrizable (tipo de onda, envolvente, barrido de frecuencia, ruido). Incluir pequeña variación aleatoria de tono (±5 %) en los efectos repetitivos.

| Efecto | Descripción |
|---|---|
| Salto | Barrido ascendente corto |
| Doble salto | Clic mecánico + barrido más agudo |
| Aterrizaje | Ruido corto grave |
| Pisar enemigo | "Plop" con barrido descendente |
| Disparo | Pulso rápido agudo |
| Carga | Tono ascendente continuo que se estabiliza con brillo al completarse |
| Disparo cargado | Golpe grave + agudo |
| Golpe a enemigo / muerte | Crujido digital / explosión de ruido corta |
| Daño a Choco | Tono descendente áspero |
| Muerte de Choco | Melodía corta descendente "derritiéndose" |
| Bit | Dos notas rápidas ascendentes |
| Y dorada | Arpegio brillante de 5 notas |
| Grano de Cacao | Arpegio + brillo |
| Objeto obtenido | Fanfarria de 2 s |
| Escudo | Zumbido de campo de energía |
| Parry | Golpe metálico brillante |
| Lazo | Silbido al lanzar, "tink" al engancharse |
| Vista Debug | Encendido tipo terminal, zumbido suave mientras está activa |
| Hackeo | Tecla por flecha, acorde de éxito, buzzer de error |
| Detectado ("!") | Golpe agudo de alerta |
| Alarma | Pulso alternante |
| Bombeta | Silbido + explosión |
| Calor alto | Chisporroteo suave en loop |
| Checkpoint | Arpegio ascendente |
| Diálogo | Bip por letra, con tono distinto por personaje (N.U.L.L. con tono glitcheado) |
| Menú | Mover (tick), confirmar, cancelar |
