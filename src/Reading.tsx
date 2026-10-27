import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { ChevronRight, Copy, Image as ImageIcon, Check } from 'lucide-react';
import type { OrgDocument } from './org';
import type { FileAdapter } from './document';

function Section({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  const [folded, setFolded] = useState(false);
  return <section {...props} className={folded ? 'org-section folded' : 'org-section'}>
    <button className="fold icon-button" aria-label={folded ? 'Expand section' : 'Collapse section'} title={folded ? 'Expand section' : 'Collapse section'} aria-expanded={!folded} onClick={() => setFolded(!folded)}><ChevronRight size={16} /></button>{children}
  </section>;
}
function CodeBlock({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  const [copied, setCopied] = useState(false);
  return <div className="code-wrap"><button className="icon-button copy-code" title="Copy code" aria-label="Copy code" onClick={async e => {
    const content = e.currentTarget.parentElement?.querySelector('pre')?.textContent || '';
    try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button><pre {...props}>{children}</pre></div>;
}
function OrgImage({ target, adapter }: { target: string; adapter: FileAdapter }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  return src ? <img src={src} alt={target} loading="lazy" onError={() => { setSrc(''); setError('Image could not be loaded'); }} /> : <button className="image-placeholder" onClick={async () => {
    try {
      if (/^https?:/i.test(target)) throw new Error('Remote images are blocked to avoid tracking. Open the image link in a browser.');
      if (!adapter.image) throw new Error('Relative images require the desktop file handler.');
      setSrc(await adapter.image(target));
    } catch (e) { setError(String(e).replace(/^Error: /, '')); }
  }}><ImageIcon size={18} /><span>{target}</span>{error && <small>{error}</small>}</button>;
}

export function Reading({ doc, adapter, fallbackTitle, action, editSource, link }: { doc: OrgDocument; adapter: FileAdapter; fallbackTitle: string; action: (kind: string, offset: number) => void; editSource: (offset: number) => void; link: (href: string) => void }) {
  const rendered = useMemo(() => toJsxRuntime(doc.html, {
    Fragment, jsx, jsxs,
    components: {
      section: Section,
      pre: CodeBlock,
      span: ({ children, ...props }) => {
        const target = (props as Record<string, unknown>)['data-image'];
        return typeof target === 'string' ? <OrgImage target={target} adapter={adapter} /> : <span {...props}>{children}</span>;
      },
      input: props => <input {...props} readOnly />,
    },
  }), [doc, adapter]);
  return <article className="document" onClick={event => {
    const target = event.target as HTMLElement;
    const interactive = target.closest<HTMLElement>('[data-action]');
    if (interactive) { event.preventDefault(); action(interactive.dataset.action!, Number(interactive.dataset.offset)); return; }
    const anchor = target.closest<HTMLAnchorElement>('a');
    if (anchor) { event.preventDefault(); link(anchor.dataset.link || anchor.getAttribute('href') || ''); }
  }} onKeyDown={event => {
    if (event.key === 'Enter' && (event.target as HTMLElement).dataset.action === 'cell') { event.preventDefault(); action('cell', Number((event.target as HTMLElement).dataset.offset)); }
  }} onDoubleClick={event => {
    if ((event.target as HTMLElement).closest('button,input,a,[data-action]')) return;
    const block = (event.target as HTMLElement).closest<HTMLElement>('[data-source]');
    if (block) editSource(Number(block.dataset.source));
  }}>
    <header className="document-header"><div className="eyebrow">THE WORKING DOCUMENT</div><h1 dir="auto">{doc.title || fallbackTitle.replace(/\.org$/i, '')}</h1>{doc.subtitle && <p className="subtitle" dir="auto">{doc.subtitle}</p>}</header>
    {rendered}
    <footer className="document-footer">{doc.headings.length} sections <span>·</span> {doc.tasks ? `${doc.done} of ${doc.tasks} tasks complete` : 'Org document'}</footer>
  </article>;
}
