import { expect, it, vi } from 'vitest';
import { DocumentSession, type FileAdapter, type SaveResult } from '../src/document';

function fixture() {
  let disk = { text: 'original', etag: 'v1', writable: true };
  const write = vi.fn(async (text: string, etag: string): Promise<SaveResult> => {
    if (etag !== disk.etag) return { outcome: 'conflict' };
    disk = { text, etag: 'v2', writable: true }; return { outcome: 'saved', etag: 'v2' };
  });
  const adapter: FileAdapter = { name: 'test.org', read: async () => disk, write };
  const session = new DocumentSession(adapter, disk);
  return { session, write, adapter, external: (text: string) => { disk = { text, etag: 'external', writable: true }; } };
}
it('preserves dirty edits on an external update and refuses overwrite', async () => {
  const f = fixture(); f.session.edit('mine'); f.external('theirs');
  await f.session.refresh(); await f.session.save();
  expect(f.session.getSnapshot()).toMatchObject({ source: 'mine', baseline: 'original', conflict: true });
  expect(f.write).not.toHaveBeenCalled();
  await f.session.refresh(true); expect(f.session.getSnapshot()).toMatchObject({ source: 'theirs', conflict: false });
});
it('checks ETag even without an update notification', async () => {
  const f = fixture(); f.session.edit('mine'); f.external('theirs'); await f.session.save();
  expect(f.session.getSnapshot()).toMatchObject({ source: 'mine', conflict: true });
});
it('does not mark edits made during an in-flight save as saved', async () => {
  const f = fixture(); let finish!: (r: SaveResult) => void;
  f.adapter.write = () => new Promise(resolve => { finish = resolve; });
  f.session.edit('first'); const pending = f.session.save(); f.session.edit('second');
  finish({ outcome: 'saved', etag: 'v2' }); await pending;
  expect(f.session.getSnapshot()).toMatchObject({ source: 'second', baseline: 'first', saving: false });
});
it('shares undo history between mutations and source changes', () => {
  const f = fixture(); f.session.edit('one'); f.session.edit('two'); f.session.undo(); expect(f.session.getSnapshot().source).toBe('one'); f.session.redo(); expect(f.session.getSnapshot().source).toBe('two');
});
it('never writes without version metadata', async () => {
  const write = vi.fn(); const s = new DocumentSession({ name: 'x.org', read: async () => ({ text: '', writable: true }), write }, { text: '', writable: true });
  s.edit('text'); await s.save(); expect(write).not.toHaveBeenCalled(); expect(s.getSnapshot().writable).toBe(false);
});
it('explicit reload discards edits even when disk still equals the original baseline', async () => {
  const f = fixture(); f.session.edit('unsaved'); await f.session.refresh(true);
  expect(f.session.getSnapshot()).toMatchObject({ source: 'original', undo: false });
});
it('defers notifications during save and detects a subsequent external edit', async () => {
  const f = fixture(); let finish!: (r: SaveResult) => void;
  f.adapter.write = () => new Promise(resolve => { finish = resolve; });
  f.session.edit('first'); const pending = f.session.save(); f.session.edit('second'); f.external('theirs');
  await f.session.refresh(); finish({ outcome: 'saved', etag: 'v2' }); await pending;
  expect(f.session.getSnapshot()).toMatchObject({ source: 'second', conflict: true });
});
