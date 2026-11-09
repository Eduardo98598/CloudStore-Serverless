// @ts-check
/**
 * CloudStore Serverless - Local Development Server
 * Native Node.js HTTP static server without external dependencies.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Normalize and sanitize request URL
  let reqUrl = req.url ? req.url.split('?')[0] : '/';
  if (reqUrl === '/') {
    reqUrl = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path is a directory, look for index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <title>404 - No Encontrado | CloudStore</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }</style>
          </head>
          <body class="text-center p-4">
            <div>
              <h1 class="display-1 fw-bold text-primary">404</h1>
              <h2 class="mb-3">Página no encontrada</h2>
              <p class="text-secondary mb-4">El recurso solicitado <code>${reqUrl}</code> no existe en el servidor.</p>
              <a href="/" class="btn btn-primary px-4 py-2">Volver al Inicio</a>
            </div>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Error del servidor: ${err.code}`);
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 CloudStore Serverless Frontend iniciado con éxito`);
  console.log(`  🌐 Servidor local: http://localhost:${PORT}`);
  console.log(`  📁 Directorio raíz: ${PUBLIC_DIR}`);
  console.log(`  ⚙️  Modo API: Simulado (USE_MOCK_API = true en js/config.js)`);
  console.log(`=======================================================`);
});
