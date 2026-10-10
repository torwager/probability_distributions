// Locate Playwright (installed globally, no project dependency) and a Chromium binary.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const CANDIDATES = [process.env.PLAYWRIGHT_PATH, '/opt/node22/lib/node_modules/playwright', 'playwright'].filter(Boolean);

export function loadPlaywright() {
  for (const c of CANDIDATES) { try { return require(c); } catch (_) { /* try next */ } }
  throw new Error('Playwright not found. Set PLAYWRIGHT_PATH to its install directory.');
}

export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+/.test(d)).sort().reverse();
    for (const d of dirs) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch (_) { /* fall back to playwright default */ }
  return undefined;
}
