import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BookOpen, Code2, Columns2, Download, FolderOpen, Save, Undo2, Redo2, PanelLeft, Search, Sun, Moon, RefreshCw, Link2, X, FileText, Check, AlertCircle } from 'lucide-react';
import { parseOrg, applyPatch, toggleTask, toggleCheckbox, editCell, type Patch } from './org';
import type { TableCell } from 'uniorg';
import { DocumentSession, type FileAdapter } from './document';
import { connectHost, browserFile, download } from './host';
import { Editor } from './Editor';
import { Reading } from './Reading';
import sample from '../examples/field-notes.org?raw';

const demoAdapter: FileAdapter = { name: 'field-notes.org', read: async () => ({ text: sample, writable: false }) };
const embedded = window.parent !== window;
function Tool({ label, children, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button {...props} className={`icon-button ${active ? 'active' : ''}`} aria-label={label} title={label} aria-pressed={active}>{children}</button>;
}

export function Workbench() {
  const [session, setSession] = useState<DocumentSession | null>(embedded ? null : new DocumentSession(demoAdapter, { text: sample, writable: false }));
  const [fatal, setFatal] = useState('');
  const current = useRef(session);
  current.current = session;
  useEffect(() => {
    if (!embedded) return;
    let alive = true;
    let sequence = 0;
    let bridge: Awaited<ReturnType<typeof connectHost>> | undefined;
    void connectHost(async adapter => {
      const request = ++sequence;
      try {
        const snapshot = await adapter.read();
        parseOrg(snapshot.text);
        if (!alive || request !== sequence) return;
        if (current.current && current.current.getSnapshot().source !== current.current.getSnapshot().baseline) { setFatal('Another file was requested while this document has unsaved edits. Save or export your edits before reopening.'); return; }
        current.current?.dispose();
        setSession(new DocumentSession(adapter, snapshot));
        setFatal('');
      } catch (error) { setFatal(String(error)); }
    }, setFatal).then(app => { bridge = app; if (!alive) void app.close(); }).catch(e => setFatal(String(e)));
    return () => { alive = false; void bridge?.close(); };
  }, []);
  if (!session) return <main className="loading"><FileText size={32} /><h1>Org Workbench</h1><p role="status">{fatal || 'Opening document…'}</p></main>;
  return <Workspace key={session.adapter.name} session={session} fatal={fatal} replace={next => { session.dispose(); setSession(next); setFatal(''); }} />;
}

function Workspace({ session, replace, fatal }: { session: DocumentSession; replace: (s: DocumentSession) => void; fatal: string }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [mode, setMode] = useState<'read' | 'split' | 'source'>('read');
  const [outline, setOutline] = useState(window.innerWidth > 800);
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const [sync, setSync] = useState(true);
  const [jump, setJump] = useState<{ offset: number; serial: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [cell, setCell] = useState<{ node: TableCell; value: string; source: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const dirty = state.source !== state.baseline;
  const parsed = useMemo(() => { try { return { doc: parseOrg(state.source), error: '' }; } catch (e) { return { doc: null, error: String(e) }; } }, [state.source]);
  const doc = parsed.doc;
  const sourceRef = useRef(state.source); sourceRef.current = state.source;
  useEffect(() => {
    let stopped = false;
    let cleanup: (() => void) | undefined;
    void session.adapter.subscribe?.(() => { void session.refresh(); }).then(off => { if (stopped) off(); else cleanup = off; });
    const focus = () => { void session.refresh(); };
    window.addEventListener('focus', focus);
    return () => { stopped = true; cleanup?.(); window.removeEventListener('focus', focus); };
  }, [session]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  const exportCopy = () => { if (session.adapter.export) void session.adapter.export(state.source).catch(e => setNotice(String(e))); else download(state.source, session.adapter.name); };
  const save = () => { if (state.writable) void session.save(); else exportCopy(); };
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).closest('.cm-editor')) return;
      if (e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'z') { e.preventDefault(); e.shiftKey ? session.redo() : session.undo(); }
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [state, session]);
  function editSource(offset: number) { if (mode === 'read') setMode('split'); setJump({ offset, serial: Date.now() }); }
  function navigate(offset: number) {
    const target = pane.current?.querySelector<HTMLElement>(`[id="org-${offset}"]`);
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (mode !== 'read') setJump({ offset, serial: Date.now() });
    if (window.innerWidth < 800) setOutline(false);
  }
  function cursor(offset: number) {
    if (!sync || mode !== 'split') return;
    const elements = Array.from(pane.current?.querySelectorAll<HTMLElement>('[data-source]') || []);
    const closest = elements.filter(e => Number(e.dataset.source) <= offset).at(-1);
    closest?.scrollIntoView({ block: 'nearest' });
  }
  function act(kind: string, offset: number) {
    const node = doc?.nodes.get(offset);
    if (!node || !doc) return;
    try {
      let change: Patch | undefined;
      if (kind === 'todo' && node.type === 'headline') change = toggleTask(state.source, node, doc.keywords);
      if (kind === 'checkbox' && node.type === 'list-item') change = toggleCheckbox(state.source, node);
      if (kind === 'cell' && node.type === 'table-cell') setCell({ node, value: state.source.slice(node.contentsBegin, node.contentsEnd), source: state.source });
      if (change) session.edit(applyPatch(state.source, change));
      setNotice('');
    } catch (e) { setNotice(String(e)); }
  }
  async function openLink(href: string) {
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (!target) { setNotice('This link target was not found in the document.'); return; }
      for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.classList.contains('folded')) (parent.querySelector(':scope > .fold') as HTMLButtonElement)?.click();
      target.scrollIntoView({ block: 'center' }); return;
    }
    if (/^(id:|denote:|elisp:|shell:|javascript:|data:)/i.test(href)) { setNotice('This link requires Org or your note index. It has not been executed.'); return; }
    try {
      if (session.adapter.openLink) await session.adapter.openLink(href);
      else if (/^https?:|^mailto:/i.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
      else setNotice('Local file links require the desktop file handler.');
    } catch (e) { setNotice(String(e)); }
  }
  return <main className="workbench">
    <header className="toolbar">
      <div className="identity"><Tool label="Toggle outline" active={outline} onClick={() => setOutline(!outline)}><PanelLeft size={18} /></Tool><FileText className="brand-icon" size={20} /><div className="file-identity"><strong>Org Workbench</strong><span title={session.adapter.name}>{session.adapter.name}{dirty ? ' •' : ''}</span></div></div>
      <div className="modes" role="group" aria-label="Document view">{([['read', BookOpen, 'Read'], ['split', Columns2, 'Split'], ['source', Code2, 'Source']] as const).map(([value, Icon, label]) => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}><Icon size={15} /><span>{label}</span></button>)}</div>
      <div className="tools"><Tool label="Undo" disabled={!state.undo} onClick={() => session.undo()}><Undo2 size={17} /></Tool><Tool label="Redo" disabled={!state.redo} onClick={() => session.redo()}><Redo2 size={17} /></Tool><span className="divider" />
        {mode === 'split' && <Tool label="Follow source cursor" active={sync} onClick={() => setSync(!sync)}><Link2 size={17} /></Tool>}
        {!embedded && <Tool label="Open Org file" onClick={() => input.current?.click()}><FolderOpen size={17} /></Tool>}
        <Tool label="Reload from disk" onClick={() => { if (!dirty || confirm('Discard your unsaved edits and reload?')) void session.refresh(true); }}><RefreshCw size={16} /></Tool>
        <Tool label={dark ? 'Light theme' : 'Dark theme'} onClick={() => { setDark(!dark); document.documentElement.dataset.theme = !dark ? 'dark' : 'light'; }}><Sun size={17} className={dark ? '' : 'hidden'} /><Moon size={17} className={dark ? 'hidden' : ''} /></Tool>
        <Tool label="Download copy" onClick={exportCopy}><Download size={17} /></Tool>
        {state.writable && <button className="save-button" disabled={!dirty || state.saving || state.conflict} onClick={save}><Save size={15} /><span>{state.saving ? 'Saving…' : 'Save'}</span></button>}
      </div>
    </header>
    <input ref={input} type="file" accept=".org,text/org" hidden onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file || (dirty && !confirm('Discard your unsaved edits and open another file?'))) return;
      try { const adapter = await browserFile(file); const snapshot = await adapter.read(); parseOrg(snapshot.text); replace(new DocumentSession(adapter, snapshot)); }
      catch (error) { setNotice(String(error)); }
    }} />
    {(fatal || notice || state.error || parsed.error || state.conflict) && <div className="notice" role="alert"><AlertCircle size={17} /><span>{state.conflict ? 'The file changed outside Org Workbench. Your edits are preserved. Download a copy before reloading.' : fatal || notice || state.error || parsed.error}</span>{notice && <Tool label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></Tool>}</div>}
    <div className={`workspace ${outline ? 'with-outline' : ''}`}>
      {outline && <aside className="outline"><div className="outline-title">CONTENTS<span>{doc?.headings.length || 0}</span></div><label className="outline-search"><Search size={14} /><input aria-label="Filter outline" placeholder="Find a section" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <nav aria-label="Document outline">{doc?.headings.filter(h => `${h.title} ${h.tags.join(' ')} ${h.todo || ''}`.toLowerCase().includes(query.toLowerCase())).map(h => <button key={h.id} style={{ paddingLeft: 12 + Math.min(h.level - 1, 6) * 12 }} onClick={() => navigate(h.offset)}><span className={`outline-dot ${h.todo === 'DONE' ? 'complete' : ''}`} /><span>{h.title || h.todo || 'Untitled heading'}</span></button>)}</nav>
        <div className="outline-bottom"><div><span>Tasks</span><strong>{doc?.done || 0} / {doc?.tasks || 0}</strong></div><progress max={doc?.tasks || 1} value={doc?.done || 0} /><span className="file-type">ORG · PLAIN TEXT</span></div>
      </aside>}
      <div className={`panes mode-${mode}`}>
        {mode !== 'read' && <div className="source-pane"><div className="pane-label">SOURCE <span>{state.source.split('\n').length} lines</span></div><Editor source={state.source} change={text => session.edit(text)} undo={() => session.undo()} redo={() => session.redo()} save={save} jump={jump} cursor={cursor} /></div>}
        {mode !== 'source' && <div className="reading-pane" ref={pane}>{doc ? <Reading doc={doc} adapter={session.adapter} fallbackTitle={session.adapter.name} action={act} editSource={editSource} link={href => void openLink(href)} /> : <div className="empty">The rendered view is unavailable. Your source is preserved.</div>}</div>}
      </div>
    </div>
    <footer className="statusbar"><span className={dirty ? 'dirty-status' : ''}>{dirty ? 'Unsaved changes' : <><Check size={12} />{state.writable ? 'Saved' : 'Local document'}</>}</span><span>{state.writable ? 'Original .org file' : embedded ? 'Host is read-only · Export available' : 'Browser edition · Export to save'}<span className="status-separator">·</span>{new TextEncoder().encode(state.source).length.toLocaleString()} bytes</span></footer>
    {cell && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setCell(null); }}><form className="cell-dialog" role="dialog" aria-modal="true" aria-label="Edit table cell" onSubmit={e => {
      e.preventDefault();
      try { if (sourceRef.current !== cell.source) throw new Error('The document changed while this cell was open. Reopen the cell to edit it.'); session.edit(applyPatch(state.source, editCell(state.source, cell.node, cell.value))); setCell(null); setNotice(''); }
      catch (error) { setNotice(String(error)); setCell(null); }
    }}><label htmlFor="cell-value">Edit table cell</label><input id="cell-value" autoFocus value={cell.value} onChange={e => setCell({ ...cell, value: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') setCell(null); }} /><div><button type="button" onClick={() => setCell(null)}>Cancel</button><button className="save-button" type="submit">Apply</button></div></form></div>}
  </main>;
}
