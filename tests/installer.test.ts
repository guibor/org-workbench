import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'org-install-test-')); directories.push(root);
  const bin = join(root, 'bin'), files = join(root, 'fixture');
  await mkdir(bin); await mkdir(join(files, 'org-workbench/dist/ui'), { recursive: true });
  await mkdir(join(files, 'org-workbench/.codex-plugin')); await mkdir(join(files, '.agents/plugins'), { recursive: true });
  for (const file of ['org-workbench/dist/server.mjs', 'org-workbench/dist/ui/index.html', 'org-workbench/.codex-plugin/plugin.json', '.agents/plugins/marketplace.json']) await writeFile(join(files, file), '{}');
  const archive = join(root, 'org-workbench-v0.2.0.zip');
  execFileSync('zip', ['-qr', archive, '.'], { cwd: files });
  const sha = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(join(root, 'SHA256SUMS'), `${sha}  org-workbench-v0.2.0.zip\n`);
  await writeFile(join(bin, 'curl'), '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do case "$1" in -o) out="$2"; shift;; https:*) url="$1";; esac; shift; done\ncp "$FIXTURE_ROOT/${url##*/}" "$out"\n', { mode: 0o755 });
  await writeFile(join(bin, 'codex'), `#!/bin/sh
printf '%s\\n' "$*" >> "$FIXTURE_ROOT/codex-calls"
if [ "$1 $2 $3" = 'plugin marketplace list' ]; then
  if [ -n "$FIXTURE_PREVIOUS" ]; then
    printf '{"marketplaces":[{"name":"org-workbench-community","root":"%s","marketplaceSource":{"sourceType":"local","source":"%s"}}]}' "$FIXTURE_PREVIOUS" "$FIXTURE_PREVIOUS"
  else
    printf '{"marketplaces":[]}'
  fi
fi
if [ "$FIXTURE_FAIL_NEW" = '1' ] && [ "$1 $2 $3" = 'plugin marketplace add' ] && [ "$4" = "$ORG_WORKBENCH_HOME/releases/v0.2.0" ]; then exit 1; fi
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FIXTURE_ROOT: root, ORG_WORKBENCH_HOME: join(root, 'home with spaces'), FIXTURE_PREVIOUS: '', FIXTURE_FAIL_NEW: '' };
  return { root, env, archive, run: () => spawnSync('/bin/sh', [resolve('install.sh')], { env, encoding: 'utf8' }) };
}
it('installs a verified prebuilt archive and is idempotent without deleting older versions', async () => {
  const f = await fixture();
  const old = join(f.env.ORG_WORKBENCH_HOME, 'releases/v0.1.1'); await mkdir(old, { recursive: true }); await writeFile(join(old, 'keep'), 'original');
  const first = f.run(); expect(first.stderr).toBe(''); expect(first.status).toBe(0);
  expect(f.run().status).toBe(0);
  expect(await readFile(join(old, 'keep'), 'utf8')).toBe('original');
  const calls = await readFile(join(f.root, 'codex-calls'), 'utf8');
  expect(calls).toContain('plugin marketplace add '); expect(calls).toContain('plugin add org-workbench@org-workbench-community');
});
it('rejects corrupt downloads before calling Codex', async () => {
  const f = await fixture(); await writeFile(f.archive, 'corrupt');
  const result = f.run(); expect(result.status).not.toBe(0); expect(result.stderr).toContain('Checksum verification failed');
  await expect(readFile(join(f.root, 'codex-calls'))).rejects.toThrow();
});
it('refuses to overwrite an existing unrecognized installation', async () => {
  const f = await fixture(); await mkdir(join(f.env.ORG_WORKBENCH_HOME, 'releases/v0.2.0'), { recursive: true });
  const result = f.run(); expect(result.status).not.toBe(0); expect(result.stderr).toContain('Refusing to replace');
});
it('rejects a symlink in a checksum-valid archive', async () => {
  const f = await fixture(); const files = join(f.root, 'fixture');
  const { symlink } = await import('node:fs/promises'); await symlink('/etc/passwd', join(files, 'org-workbench/escape'));
  await rm(f.archive); execFileSync('zip', ['-qyr', f.archive, '.'], { cwd: files });
  await writeFile(join(f.root, 'SHA256SUMS'), `${createHash('sha256').update(await readFile(f.archive)).digest('hex')}  org-workbench-v0.2.0.zip\n`);
  const result = f.run(); expect(result.status).not.toBe(0); expect(result.stderr).toContain('symbolic link');
});
it('re-registers a previous local marketplace without removing its files', async () => {
  const f = await fixture();
  f.env.FIXTURE_PREVIOUS = join(f.root, 'previous release');
  await mkdir(f.env.FIXTURE_PREVIOUS); await writeFile(join(f.env.FIXTURE_PREVIOUS, 'keep'), 'old');
  expect(f.run().status).toBe(0);
  const calls = await readFile(join(f.root, 'codex-calls'), 'utf8');
  expect(calls).toContain('plugin marketplace remove org-workbench-community');
  expect(calls).toContain(`plugin marketplace add ${f.env.ORG_WORKBENCH_HOME}/releases/v0.2.0`);
  expect(await readFile(join(f.env.FIXTURE_PREVIOUS, 'keep'), 'utf8')).toBe('old');
});
it('restores the previous registration if registering the new release fails', async () => {
  const f = await fixture(); f.env.FIXTURE_PREVIOUS = join(f.root, 'previous release'); f.env.FIXTURE_FAIL_NEW = '1';
  const result = f.run(); expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Restoring the previous');
  const calls = await readFile(join(f.root, 'codex-calls'), 'utf8');
  expect(calls).toContain(`plugin marketplace add ${f.env.FIXTURE_PREVIOUS}\nplugin add org-workbench@org-workbench-community`);
});
