// Checks that the site works when served from a subpath, as on GitHub Pages
// (https://torwager.github.io/probability_distributions/). The repository root is served under
// /probability_distributions/ and nothing is served at /, so any absolute path ("/assets/...") fails.
// Usage: node tests/subpath.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';

const PREFIX = '/probability_distributions/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!p.startsWith(PREFIX)) { res.writeHead(404); res.end('outside the subpath'); return; }
  p = p.slice(PREFIX.length - 1);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;

const pages = ['', 'index.html', 'about.html', 'distributions.html', 'relationships.html',
  'distribution.html?d=normal', 'distribution.html?d=binomial', 'distribution.html?d=dirichlet', 'distribution.html?d=von-mises',
  'relation.html?r=binomial--normal', 'relation.html?r=exponential--gamma', 'relation.html?r=gamma--dirichlet'];
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const IGNORE = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/];
let failures = 0;
for (const rel of pages) {
  const errors = [];
  const onResp = r => { if (r.status() >= 400 && !IGNORE.some(x => x.test(r.url()))) errors.push(`HTTP ${r.status()}: ${r.url()}`); };
  const onFail = r => { if (!IGNORE.some(x => x.test(r.url()))) errors.push('requestfailed: ' + r.url()); };
  const onErr = e => errors.push('pageerror: ' + e.message);
  const onCon = m => { if (m.type() === 'error' && !IGNORE.some(x => x.test(m.text()))) errors.push('console: ' + m.text()); };
  page.on('response', onResp); page.on('requestfailed', onFail); page.on('pageerror', onErr); page.on('console', onCon);
  await page.goto(base + rel, { waitUntil: 'load' });
  await page.waitForTimeout(rel === '' || rel === 'index.html' ? 1200 : 500);
  // every same-origin link on the page must stay inside the subpath
  const outside = await page.evaluate(prefix => [...document.querySelectorAll('a[href]')]
    .map(a => new URL(a.getAttribute('href'), location.href))
    .filter(u => u.origin === location.origin && !u.pathname.startsWith(prefix)).map(u => u.pathname), PREFIX);
  for (const o of new Set(outside)) errors.push('link outside the subpath: ' + o);
  const content = await page.evaluate(() => (document.querySelector('main') || document.body).textContent.length);
  if (content < 200) errors.push('page looks empty');
  page.off('response', onResp); page.off('requestfailed', onFail); page.off('pageerror', onErr); page.off('console', onCon);
  if (errors.length) { failures++; console.log(`FAIL ${PREFIX}${rel}\n  ${errors.join('\n  ')}`); }
  else console.log(`ok   ${PREFIX}${rel}`);
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} page(s) failed under the subpath` : '\nAll pages work under the subpath');
process.exit(failures ? 1 : 0);
