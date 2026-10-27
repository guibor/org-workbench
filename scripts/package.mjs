import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('release');
const dest = resolve(root, 'org-workbench');
await mkdir(dest, { recursive: true });
// Explicit allowlist: no notes, credentials, node_modules, or developer state.
for (const path of ['plugin.json', 'mcp.json', '.mcp.json', '.codex-plugin', 'assets/icon.svg', 'skills', 'dist', 'LICENSE', 'NOTICE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'design.md', 'prd.org', 'docs', 'examples', 'install.sh']) {
  await mkdir(resolve(dest, path, '..'), { recursive: true });
  await cp(path, resolve(dest, path), { recursive: true });
}
await mkdir(resolve(root, '.agents/plugins'), { recursive: true });
const marketplace = JSON.parse(await readFile('.agents/plugins/marketplace.json', 'utf8'));
marketplace.plugins[0].source.path = './org-workbench';
await writeFile(resolve(root, '.agents/plugins/marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n');
console.log(`Installable marketplace: ${root}`);
