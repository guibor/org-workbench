import { realpath, readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, extname, isAbsolute } from 'node:path';

export async function scopedPath(opened: unknown, requested: string) {
  if (typeof opened !== 'string' || !isAbsolute(opened)) throw new Error('An opened-file context is required.');
  if (!requested || isAbsolute(requested) || requested.includes('\0') || /^[a-z][a-z0-9+.-]*:/i.test(requested) || requested.includes('::')) throw new Error('Only relative links inside the document folder are supported.');
  const base = await realpath(dirname(opened));
  const path = await realpath(resolve(base, requested));
  const rel = relative(base, path);
  if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw new Error('Link leaves the document folder.');
  if (!(await stat(path)).isFile()) throw new Error('Link is not a file.');
  return path;
}

export async function readImage(opened: unknown, requested: string) {
  const path = await scopedPath(opened, requested);
  const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' };
  const type = mime[extname(path).toLowerCase()];
  if (!type || (await stat(path)).size > 5 * 1024 * 1024) throw new Error('Only raster images up to 5 MiB are supported.');
  const bytes = await readFile(path);
  return `data:${type};base64,${bytes.toString('base64')}`;
}
