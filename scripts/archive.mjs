import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const name = `org-workbench-v${version}.zip`;
await mkdir('artifacts', { recursive: true });
const archive = resolve('artifacts', name);
await rm(archive, { force: true });
execFileSync('zip', ['-qr', archive, 'org-workbench', '.agents'], { cwd: 'release' });
const checksum = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile('artifacts/SHA256SUMS', `${checksum}  ${name}\n`);
console.log(`Release archive: ${archive}`);
