import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dictsDir = path.resolve(__dirname, '../src/i18n/dictionaries');

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

test('verify all 24 locale dictionaries match en.ts keys', async () => {
  const enModule = await import(pathToFileURL(path.join(dictsDir, 'en.ts')).href);
  const enDict = enModule.default || enModule;
  const enKeys = getKeys(enDict);

  const files = fs.readdirSync(dictsDir).filter((f) => f.endsWith('.ts'));
  assert.equal(files.length, 24, `Expected 24 locale files, found ${files.length}`);

  const errors: string[] = [];

  for (const file of files) {
    if (file === 'en.ts') continue;
    const locale = path.basename(file, '.ts');
    const mod = await import(pathToFileURL(path.join(dictsDir, file)).href);
    const dict = mod.default || mod;
    const keys = getKeys(dict);

    const missingKeys = enKeys.filter((k) => !keys.includes(k));
    const extraKeys = keys.filter((k) => !enKeys.includes(k));

    if (missingKeys.length > 0) {
      errors.push(`[${locale}] Missing keys: ${missingKeys.join(', ')}`);
    }
    if (extraKeys.length > 0) {
      errors.push(`[${locale}] Extra keys: ${extraKeys.join(', ')}`);
    }
  }

  assert.deepEqual(errors, [], `Locale dictionary key mismatches:\n${errors.join('\n')}`);
});
