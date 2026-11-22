import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { buildIndexHtml } from './build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const { outPath } = buildIndexHtml();

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.get(['/', '/index.html'], (_req, res) => {
  try {
    if (!fs.existsSync(outPath)) buildIndexHtml();
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(fs.readFileSync(outPath, 'utf8'));
  } catch (err) {
    console.error('Failed to serve index.html:', err);
    res.status(500).type('text/plain').send('Internal Server Error');
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

app.listen(PORT, HOST, () => {
  console.log(`Meteor Bastion server listening at http://${HOST}:${PORT}`);
});
