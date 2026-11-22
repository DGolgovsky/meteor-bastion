import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src');
const PLACEHOLDER = '<!-- __GAME_JS__ -->\n';
const PLACEHOLDER_FALLBACK = '<!-- __GAME_JS__ -->';

export function assembleGame() {
  const orderText = fs.readFileSync(path.join(SRC, 'order.txt'), 'utf8');
  const order = orderText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const js = order
    .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8'))
    .join('');

  const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
  let html;
  if (shell.includes(PLACEHOLDER)) {
    html = shell.replace(PLACEHOLDER, () => js);
  } else if (shell.includes(PLACEHOLDER_FALLBACK)) {
    html = shell.replace(PLACEHOLDER_FALLBACK, () => js);
  } else {
    throw new Error('placeholder <!-- __GAME_JS__ --> not found in src/shell.html');
  }

  return { html, js, moduleCount: order.length };
}

export function buildIndexHtml() {
  const { html, js, moduleCount } = assembleGame();
  const outPath = path.join(__dirname, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  return { outPath, bytes: Buffer.byteLength(html, 'utf8'), moduleCount, js };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const { js, moduleCount } = assembleGame();
    new vm.Script(js, { filename: 'meteor-bastion.bundle.js' });
    console.log(`syntax ok: ${moduleCount} modules (${js.length} chars)`);
  } else {
    const { bytes, moduleCount } = buildIndexHtml();
    console.log(`built index.html: ${bytes} bytes from ${moduleCount} modules`);
  }
}
