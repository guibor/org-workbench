import { readFile, readdir, writeFile } from 'node:fs/promises';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const sections = [];
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path || info.dev) continue;
  const name = path.split('node_modules/').at(-1);
  let licenses = [];
  try {
    licenses = (await readdir(path)).filter(f => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f));
  } catch { continue; }
  const texts = await Promise.all(licenses.map(f => readFile(`${path}/${f}`, 'utf8').catch(() => '')));
  sections.push(`${name}@${info.version}\nLicense: ${info.license || 'See upstream'}\n${texts.join('\n')}`);
}
await writeFile('dist/THIRD_PARTY_LICENSES.txt', sections.join('\n\n----------------------------------------\n\n'));
