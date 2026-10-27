import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { profiles, validateAppearance } from '../src/appearance';

it('validates stored preferences and uses profile defaults for missing settings', () => {
  for (const value of [null, 'invalid', {}, { profile: 'url(https://untrusted.test)' }]) expect(validateAppearance(value)).toEqual(profiles.reading);
  expect(validateAppearance({ profile: 'plain' })).toEqual(profiles.plain);
});
it('bounds numeric settings and never retains source or arbitrary properties', () => {
  expect(validateAppearance({ profile: 'nano', fontSize: 900, lineHeight: -1, width: 1, tableDensity: 'comfortable', source: 'private' })).toEqual({ profile: 'nano', fontSize: 24, lineHeight: 1.35, width: 640, tableDensity: 'comfortable' });
  expect(validateAppearance({ fontSize: NaN, width: Infinity })).toEqual(profiles.reading);
});
it('keeps plugin manifests and the pinned installer on the package version', () => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const file of ['plugin.json', '.codex-plugin/plugin.json']) expect(JSON.parse(readFileSync(file, 'utf8')).version).toBe(version);
  expect(readFileSync('install.sh', 'utf8')).toContain(`VERSION=${version}\n`);
});
