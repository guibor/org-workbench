import { expect, it } from 'vitest';
import { mkdtemp, writeFile, symlink, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scopedPath, readImage } from '../server/files';

it('scopes links to the document directory, including symlink escapes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'org-test-'));
  try {
    await mkdir(join(dir, 'notes')); await writeFile(join(dir, 'notes', 'a.org'), '* Notes'); await writeFile(join(dir, 'secret'), 'secret');
    await symlink(join(dir, 'secret'), join(dir, 'notes', 'escape'));
    const opened = join(dir, 'notes', 'a.org');
    expect(await scopedPath(opened, 'a.org')).toContain('a.org');
    for (const target of ['../secret', 'escape', '/etc/passwd', 'https://example.com', 'a.org::1']) await expect(scopedPath(opened, target)).rejects.toThrow();
    await expect(scopedPath(undefined, 'a.org')).rejects.toThrow(); await expect(readImage(opened, 'a.org')).rejects.toThrow();
  } finally { await rm(dir, { recursive: true }); }
});
