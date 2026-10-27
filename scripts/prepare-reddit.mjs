import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import assert from 'node:assert/strict';

const directory = resolve('artifacts/reddit-post');
const markdown = await readFile('docs/announcements/reddit.md', 'utf8');
const [heading, ...lines] = markdown.split('\n');
assert(heading.startsWith('# '), 'The first heading must be the Reddit title.');
const title = heading.slice(2).trim(), text = lines.join('\n').trim();
assert(title.length > 0 && title.length <= 300 && text.length > 0 && text.length < 40000);
const manifest = JSON.parse(await readFile('docs/announcements/screenshots/manifest.json', 'utf8'));
await mkdir(resolve(directory, 'screenshots'), { recursive: true });
for (const shot of manifest.screenshots) {
  assert(basename(shot.file) === shot.file && shot.file.endsWith('.png'));
  const source = resolve('docs/announcements/screenshots', shot.file);
  const bytes = await readFile(source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), shot.sha256);
  await copyFile(source, resolve(directory, 'screenshots', shot.file));
}
const payload = { sr: 'emacs', kind: 'self', title, text, sendreplies: true };
await writeFile(resolve(directory, 'title.txt'), `${title}\n`);
await writeFile(resolve(directory, 'body.md'), `${text}\n`);
await writeFile(resolve(directory, 'payload.json'), JSON.stringify(payload, null, 2) + '\n');
for (const file of ['posting-kit.org', 'announcement.md', 'screenshots.md', 'screenshots/manifest.json']) {
  await copyFile(resolve('docs/announcements', file), resolve(directory, file));
}
await writeFile(resolve(directory, 'captions.md'), manifest.screenshots.map(shot => `## ${shot.file}\n\n${shot.caption}\n\nAlt text: ${shot.alt}\n`).join('\n'));
const archive = resolve('artifacts/org-workbench-reddit-kit.zip');
await rm(archive, { force: true });
execFileSync('zip', ['-qr', archive, 'title.txt', 'body.md', 'payload.json', 'posting-kit.org', 'announcement.md', 'captions.md', 'screenshots.md', 'screenshots'], { cwd: directory });
console.log(`Prepared ${archive}\nTitle: ${title}\nBody: ${text.split(/\s+/).length} words\nImages: ${manifest.screenshots.length}\nNo Reddit request was made.`);
