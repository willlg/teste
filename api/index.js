const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // Libera CORS para o Trello
  res.setHeader('Access-Control-Allow-Origin', 'https://trello.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Remove '/api' do início da URL
  let reqPath = req.url.replace(/^\/api/, '');
  if (reqPath === '' || reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', reqPath);

  // Serve o arquivo se existir
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = {
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
};
