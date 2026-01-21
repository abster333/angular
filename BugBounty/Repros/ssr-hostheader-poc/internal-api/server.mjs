import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 4401;
const SECRET = 'INTERNAL_SECRET_123';

const server = http.createServer((req, res) => {
  if (req.url === '/secret') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(SECRET);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`Internal API listening on http://${HOST}:${PORT}`);
});
