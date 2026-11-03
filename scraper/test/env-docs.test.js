import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const platformVariables = new Set([
  'VERCEL_PROJECT_PRODUCTION_URL', // Vercel supplies the production hostname automatically.
  'GITHUB_STEP_SUMMARY', // GitHub Actions supplies this report-output path automatically.
]);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.next') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(js|ts|tsx|mjs)$/.test(extname(path)) ? [path] : [];
  });
}

test('source environment variables have their own README Configuration table row', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const section = readme.split(/^## Configuration\r?\n/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'README Configuration section missing');
  const documented = new Set([...section.matchAll(/^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|/gm)].map(match => match[1]));
  assert.ok(documented.size, 'README Configuration variable table missing');
  const missing = [];
  for (const file of ['web/src', 'scraper/src'].flatMap(dir => sourceFiles(join(root, dir)))) {
    const names = new Set([...readFileSync(file, 'utf8').matchAll(/\b(?:process\.env|env)\.([A-Z][A-Z0-9_]*)\b/g)].map(match => match[1]));
    for (const name of names) {
      if (!documented.has(name) && !platformVariables.has(name)) {
        missing.push(`${name} in ${relative(root, file)} is missing from the README Configuration table`);
      }
    }
  }
  assert.deepEqual(missing.sort(), [], missing.join('\n'));
});
