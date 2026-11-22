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

app.get(['/', '/index.html'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(fs.readFileSync(outPath, 'utf8'));
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
