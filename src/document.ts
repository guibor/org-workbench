import { MAX_BYTES } from './org';

export type Snapshot = { text: string; etag?: string; writable: boolean };
export type SaveResult = { outcome: 'saved'; etag: string } | { outcome: 'conflict'; etag?: string } | { outcome: 'too-large'; maxBytes: number };
export type FileAdapter = {
  name: string;
  read(): Promise<Snapshot>;
  write?(text: string, etag: string): Promise<SaveResult>;
  subscribe?(update: () => void): Promise<() => void>;
  image?(relative: string): Promise<string>;
  openLink?(target: string): Promise<void>;
  export?(text: string): Promise<void>;
};
export type State = { source: string; baseline: string; etag?: string; writable: boolean; conflict: boolean; saving: boolean; error: string; undo: boolean; redo: boolean };

/** A single history and save state for both rendered edits and source editing. */
export class DocumentSession {
  private listeners = new Set<() => void>();
  private past: string[] = [];
  private future: string[] = [];
  private disposed = false;
  private revision = 0;
  private refreshPending = false;
  private state: State;
  constructor(public adapter: FileAdapter, snapshot: Snapshot) {
    this.state = { source: snapshot.text, baseline: snapshot.text, etag: snapshot.etag, writable: snapshot.writable && !!snapshot.etag && !!adapter.write, conflict: false, saving: false, error: '', undo: false, redo: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(update: Partial<State>) { this.state = { ...this.state, ...update }; this.listeners.forEach(l => l()); }
  edit(source: string) {
    if (source === this.state.source) return;
    if (new TextEncoder().encode(source).length > MAX_BYTES) { this.set({ error: 'File exceeds the 1 MiB editing limit.' }); return; }
    this.past.push(this.state.source);
    while (this.past.length > 100 || this.past.reduce((n, s) => n + s.length, 0) > 5000000) this.past.shift();
    this.future = [];
    this.set({ source, undo: this.past.length > 0, redo: false, error: '' });
  }
  undo() { const source = this.past.pop(); if (source === undefined) return; this.future.push(this.state.source); this.set({ source, undo: !!this.past.length, redo: true }); }
  redo() { const source = this.future.pop(); if (source === undefined) return; this.past.push(this.state.source); this.set({ source, undo: true, redo: !!this.future.length }); }
  async refresh(discard = false) {
    if (this.state.saving) { this.refreshPending = true; return; }
    const request = ++this.revision;
    try {
      const incoming = await this.adapter.read();
      if (this.disposed || request !== this.revision) return;
      if (new TextEncoder().encode(incoming.text).length > MAX_BYTES) throw new Error('The external file exceeds the 1 MiB editing limit. Your current edits are preserved.');
      const writable = incoming.writable && !!incoming.etag && !!this.adapter.write;
      if (!discard && incoming.text === this.state.baseline) { this.set({ etag: incoming.etag, writable }); return; }
      if (!discard && this.state.source !== this.state.baseline) { this.set({ conflict: true }); return; }
      this.past = []; this.future = [];
      this.set({ source: incoming.text, baseline: incoming.text, etag: incoming.etag, writable, conflict: false, undo: false, redo: false, error: '' });
    } catch (error) { if (!this.disposed) this.set({ error: String(error) }); }
  }
  async save() {
    if (this.state.saving || this.state.conflict || !this.state.writable || !this.state.etag || !this.adapter.write) return;
    const source = this.state.source;
    ++this.revision;
    this.set({ saving: true, error: '' });
    try {
      const result = await this.adapter.write(source, this.state.etag);
      if (this.disposed) return;
      if (result.outcome === 'saved') this.set({ baseline: source, etag: result.etag, conflict: false });
      else if (result.outcome === 'conflict') this.set({ conflict: true });
      else this.set({ error: `The host limits writes to ${result.maxBytes} bytes. Export a copy to keep your edits.` });
    } catch (error) { if (!this.disposed) this.set({ error: String(error) }); }
    finally {
      if (!this.disposed) {
        this.set({ saving: false });
        if (this.refreshPending) { this.refreshPending = false; await this.refresh(); }
      }
    }
  }
  dispose() { this.disposed = true; this.listeners.clear(); }
}
