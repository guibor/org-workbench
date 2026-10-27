import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const orgSyntax = StreamLanguage.define({
  token(stream) {
    if (stream.sol() && stream.match(/^\*+\s.*/)) return 'heading';
    if (stream.sol() && stream.match(/^\s*#\+.*/)) return 'meta';
    if (stream.sol() && stream.match(/^\s*:[A-Z_]+:.*/)) return 'propertyName';
    if (stream.match(/\[\[[^\]]+\](?:\[[^\]]*\])?\]/)) return 'link';
    if (stream.match(/\[[ Xx-]\]/)) return 'bool';
    if (stream.match(/<\d{4}-\d{2}-\d{2}[^>]*>/)) return 'number';
    stream.next(); return null;
  },
});

function editorOffset(source: string, offset: number) { return source.slice(0, offset).replace(/\r\n/g, '\n').length; }
function sourceOffset(source: string, offset: number) {
  let index = 0, count = 0;
  while (index < source.length && count < offset) { if (source[index] === '\r' && source[index + 1] === '\n') index++; index++; count++; }
  return index;
}

export function Editor({ source, change, undo, redo, save, jump, cursor }: { source: string; change: (text: string) => void; undo: () => void; redo: () => void; save: () => void; jump: { offset: number; serial: number } | null; cursor: (offset: number) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const callbacks = useRef({ change, undo, redo, save, cursor });
  callbacks.current = { change, undo, redo, save, cursor };
  const applying = useRef(false);
  const backing = useRef(source);
  useEffect(() => {
    const editor = new EditorView({ parent: mount.current!, state: EditorState.create({ doc: source.replace(/\r\n/g, '\n'), extensions: [
      lineNumbers(), highlightActiveLine(), drawSelection(), search(), highlightSelectionMatches(), orgSyntax, syntaxHighlighting(HighlightStyle.define([
        { tag: tags.heading, color: 'var(--ink)', fontWeight: '600' },
        { tag: tags.meta, color: 'var(--accent)' },
        { tag: tags.propertyName, color: 'var(--muted)' },
        { tag: [tags.link, tags.bool], color: 'var(--accent)' },
        { tag: tags.number, color: 'var(--warning)' },
      ])), EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Org source', spellcheck: 'false' }),
      Prec.highest(keymap.of([
        { key: 'Mod-z', run: () => { callbacks.current.undo(); return true; } },
        { key: 'Mod-Shift-z', run: () => { callbacks.current.redo(); return true; } },
        { key: 'Mod-s', run: () => { callbacks.current.save(); return true; } },
      ])), keymap.of([...defaultKeymap, ...searchKeymap]),
      EditorView.updateListener.of(update => {
        if (update.docChanged && !applying.current) {
          // Apply CodeMirror's changes to the original text; untouched CRLF and mixed endings survive.
          const original = backing.current;
          const edits: { from: number; to: number; insert: string }[] = [];
          update.changes.iterChanges((from, to, _a, _b, inserted) => edits.push({ from: sourceOffset(original, from), to: sourceOffset(original, to), insert: inserted.toString().replace(/\n/g, original.includes('\r\n') ? '\r\n' : '\n') }));
          let next = original;
          for (const edit of edits.reverse()) next = next.slice(0, edit.from) + edit.insert + next.slice(edit.to);
          backing.current = next;
          callbacks.current.change(next);
        }
        if (update.selectionSet && !applying.current) callbacks.current.cursor(sourceOffset(backing.current, update.state.selection.main.head));
      }),
    ] }) });
    view.current = editor;
    return () => { editor.destroy(); view.current = null; };
  }, []);
  useEffect(() => {
    const editor = view.current;
    backing.current = source;
    const normalized = source.replace(/\r\n/g, '\n');
    if (!editor || normalized === editor.state.doc.toString()) return;
    applying.current = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: normalized } });
    applying.current = false;
  });
  useEffect(() => {
    if (!jump || !view.current) return;
    const pos = Math.min(editorOffset(backing.current, jump.offset), view.current.state.doc.length);
    applying.current = true;
    view.current.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    applying.current = false;
    view.current.focus();
  }, [jump]);
  return <div className="editor" ref={mount} />;
}
