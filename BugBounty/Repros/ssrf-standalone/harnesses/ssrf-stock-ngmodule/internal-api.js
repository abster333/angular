import http from 'node:http';

const PORT = 4401;
const HOST = process.env.HOST ?? '127.0.0.1';
const SECRET = 'INTERNAL_SECRET_123';

const server = http.createServer((req, res) => {
  if (req.url === '/api-2') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({data: SECRET}));
    return;
  }

  res.writeHead(404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({error: 'not found'}));
});

server.listen(PORT, HOST, () => {
  console.log(`Internal API listening on http://${HOST}:${PORT}/api-2`);
});
