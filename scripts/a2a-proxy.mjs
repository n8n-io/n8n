#!/usr/bin/env node
/**
 * Tiny reverse proxy for the A2A demo HTML page.
 * Serves a2a-demo.html at / and proxies /rest/* to the n8n backend.
 * Usage: node scripts/a2a-proxy.mjs [n8n-url]
 *        node scripts/a2a-proxy.mjs http://localhost:51198
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const N8N_URL = process.argv[2] || 'http://localhost:5678';
const PORT = 8889;
const __dir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dir, 'a2a-demo.html'), 'utf8');

createServer((req, res) => {
  // Serve HTML
  if (req.url === '/' || req.url === '/a2a-demo.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Proxy everything else to n8n
  const target = new URL(req.url, N8N_URL);
  const headers = { ...req.headers, host: target.host };
  delete headers['origin'];
  delete headers['referer'];

  const proxyReq = httpRequest(target, { method: req.method, headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
}).listen(PORT, () => {
  console.log(`A2A Demo: http://localhost:${PORT}`);
  console.log(`Proxying API to: ${N8N_URL}`);
});
