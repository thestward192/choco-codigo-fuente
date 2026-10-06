import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Solo en desarrollo: POST /__snap?name=x guarda una captura PNG del juego en .snaps/
// (lo usa tools/harness.js para revisar pantallas). No existe en el build.
function snapshots() {
  return {
    name: 'choco-snapshots',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__snap', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url, 'http://x');
        const name = (url.searchParams.get('name') || 'snap').replace(/[^a-z0-9_-]/gi, '_');
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const dir = path.resolve('.snaps');
          fs.mkdirSync(dir, { recursive: true });
          const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(b64, 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  // Rutas relativas: el build en dist/ se puede subir a cualquier hosting o subcarpeta.
  base: './',
  plugins: [snapshots()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // El juego es un solo paquete (arte y audio generados en código): ~750 kB, ~250 kB con gzip.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    watch: { ignored: ['**/.snaps/**'] },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
