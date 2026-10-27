import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../../supabase/migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

test('migration files are numbered 0001.. without gaps or duplicates', () => {
  assert.ok(files.length > 0);
  files.forEach((file, i) => {
    assert.match(file, /^\d{4}_[a-z0-9_]+\.sql$/, file);
    assert.equal(Number(file.slice(0, 4)), i + 1, `expected migration ${i + 1}, found ${file}`);
  });
});

test('setup guide lists every migration', () => {
  const guide = readFileSync(new URL('../../docs/SETUP.md', import.meta.url), 'utf8');
  for (const file of files) assert.ok(guide.includes(file), `docs/SETUP.md is missing ${file}`);
});
