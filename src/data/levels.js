// Datos de cada nivel (los textos están en dialogues.js → TEXTS.levels).
// built: false = todavía no existe; se juega la sala de pruebas como reemplazo.
// built: true = nivel real (el objeto lo entrega el fundador dentro del nivel).

export const FOUNDERS = ['oscar', 'stward', 'hezron', 'fabiola'];

export const LEVELS = [
  { id: 0, file: '00_prologo.exe', type: 'exe', color: '#1A1426', accent: '#F2B25C', founder: null, item: 'staff', built: true },
  { id: 1, file: '01_mundo_cartucho.exe', type: 'exe', color: '#2E7FC0', accent: '#FFD23F', founder: 'oscar', item: 'boots', built: true },
  { id: 2, file: '02_una/', type: 'dir', color: '#8C2F39', accent: '#E9DCC3', founder: 'stward', item: 'laptop', built: true },
  { id: 3, file: '03_novacomp/', type: 'dir', color: '#1B2230', accent: '#8FB3D9', founder: 'hezron', item: 'shield', built: true },
  { id: 4, file: '04_santa_cruz/', type: 'dir', color: '#C8612E', accent: '#FFB347', founder: 'fabiola', item: 'lasso', built: true },
  { id: 5, file: '05_codigo_puro/', type: 'dir', color: '#2A1446', accent: '#FF2E88', founder: null, item: 'trophy', built: false },
];

// Niveles que aparecen en el explorador de archivos (el prólogo se juega al empezar)
export const MAP_LEVELS = [1, 2, 3, 4, 5];

export const ITEM_ORDER = ['staff', 'boots', 'laptop', 'shield', 'lasso'];

// Acción de control de cada objeto (para mostrar la tecla)
export const ITEM_ACTION = {
  staff: 'shoot',
  boots: 'jump',
  laptop: 'debug',
  shield: 'shield',
  lasso: 'lasso',
};

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || null;
}
