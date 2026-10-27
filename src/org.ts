import { unified } from 'unified';
import orgParse from 'uniorg-parse';
import orgRehype from 'uniorg-rehype';
import sanitize, { defaultSchema } from 'rehype-sanitize';
import katex from 'rehype-katex';
import highlight from 'rehype-highlight';
import type { OrgData, OrgNode, Headline, ListItem, TableCell } from 'uniorg';
import type { Root } from 'hast';

export const MAX_BYTES = 1024 * 1024;
export type Patch = { from: number; to: number; before: string; insert: string };
export type Heading = { id: string; title: string; level: number; offset: number; todo: string | null; tags: string[] };
export type OrgDocument = { tree: OrgData; html: Root; title: string; subtitle: string; headings: Heading[]; nodes: Map<number, OrgNode>; keywords: string[]; tasks: number; done: number };

function walk(node: OrgNode, visit: (node: OrgNode) => void) {
  visit(node);
  if ('children' in node) node.children.forEach(n => walk(n, visit));
}
export function start(node: OrgNode) { return node.position?.start.offset ?? 0; }
export function end(node: OrgNode) { return node.position?.end.offset ?? 0; }
function text(value: string) { return { type: 'text' as const, value }; }

export function parseOrg(source: string): OrgDocument {
  if (new TextEncoder().encode(source).length > MAX_BYTES) throw new Error('This version supports Org files up to 1 MiB. The file has not been changed.');
  let tree = unified().use(orgParse, { trackPosition: true }).parse(source) as OrgData;
  const directives: Record<string, string> = {};
  const sequences: string[][] = [];
  walk(tree, node => {
    if (node.type !== 'keyword') return;
    directives[node.key] = node.value;
    if (['TODO', 'SEQ_TODO', 'TYP_TODO'].includes(node.key)) sequences.push(node.value.split(/\s+/).map(s => s.replace(/\(.*\)$/, '')).filter(Boolean));
  });
  const keywords = sequences.length ? [...new Set(sequences.flat().filter(s => s !== '|'))] : ['TODO', 'DONE'];
  const doneKeywords = sequences.length ? sequences.flatMap(s => s.includes('|') ? s.slice(s.indexOf('|') + 1) : s.slice(-1)) : ['DONE'];
  if (sequences.length) tree = unified().use(orgParse, { trackPosition: true, todoKeywords: keywords }).parse(source) as OrgData;
  const headings: Heading[] = [];
  const nodes = new Map<number, OrgNode>();
  const targets = new Map<string, string>();
  let tasks = 0, done = 0;
  walk(tree, node => {
    nodes.set(start(node), node);
    // Export attributes are document input, never trusted UI behavior or CSS.
    if ('affiliated' in node) node.affiliated = {};
    if (node.type === 'headline') {
      const id = `org-${start(node)}`;
      headings.push({ id, title: node.rawValue, level: node.level, offset: start(node), todo: node.todoKeyword, tags: node.tags });
      targets.set(`*${node.rawValue}`, id);
      targets.set(node.rawValue, id);
      if (node.todoKeyword) { tasks++; if (doneKeywords.includes(node.todoKeyword)) done++; }
    }
    if (node.type === 'section') {
      const heading = node.children[0];
      const drawer = node.children.find(n => n.type === 'property-drawer');
      if (drawer && 'children' in drawer) for (const p of drawer.children) {
        if (p.type === 'node-property' && ['CUSTOM_ID', 'ID'].includes(p.key)) targets.set(p.key === 'ID' ? `id:${p.value}` : `#${p.value}`, `org-${start(heading)}`);
      }
    }
    if (node.type === 'list-item' && node.checkbox) { tasks++; if (node.checkbox === 'on') done++; }
  });
  // Restore actionable parent nodes after child nodes sharing an offset.
  walk(tree, node => { if (['headline', 'list-item', 'table-cell', 'src-block', 'paragraph'].includes(node.type)) nodes.set(start(node), node); });
  const converted = unified().use(orgRehype, {
    useSections: true,
    handlers: {
      section(org) { return this.h(null, 'section', { 'data-section': start(org.children[0]) }, this.toHast(org.children, org)); },
      headline(org) {
        const children = this.toHast(org.children, org);
        if (org.todoKeyword) children.unshift(this.h(null, 'button', { type: 'button', 'data-action': 'todo', 'data-offset': start(org), className: doneKeywords.includes(org.todoKeyword) ? ['task-state', 'complete'] : ['task-state'], 'aria-label': `Change status: ${org.rawValue}` }, org.todoKeyword), text(' '));
        if (org.priority) children.push(this.h(null, 'span', { className: ['priority'] }, ` [#${org.priority}]`));
        if (org.tags.length) children.push(this.h(null, 'span', { className: ['tags'] }, org.tags.map(t => this.h(null, 'span', { className: ['tag'] }, t))));
        return this.h(null, `h${Math.min(org.level + 1, 6)}`, { id: `org-${start(org)}`, 'data-source': start(org) }, children);
      },
      'list-item'(org) {
        if (!org.checkbox) return undefined as never;
        return this.h(null, 'li', { className: ['check-item'] }, [this.h(null, 'input', { type: 'checkbox', checked: org.checkbox === 'on', 'data-action': 'checkbox', 'data-offset': start(org), 'aria-label': source.slice(org.contentsBegin, Math.min(org.contentsEnd, org.contentsBegin + 100)).trim(), 'aria-checked': org.checkbox === 'trans' ? 'mixed' : org.checkbox === 'on' ? 'true' : 'false' }), this.h(null, 'div', {}, this.toHast(org.children, org))]);
      },
      planning(org) {
        return this.h(null, 'div', { className: ['planning'] }, (['scheduled', 'deadline', 'closed'] as const).flatMap(key => org[key] ? [this.h(null, 'span', {}, `${key}: ${org[key]!.rawValue}`)] : []));
      },
      'property-drawer'(org) { return this.h(null, 'details', { className: ['properties'] }, [this.h(null, 'summary', {}, 'Properties'), this.h(null, 'pre', {}, source.slice(start(org), end(org)))]); },
      drawer(org) { return this.h(null, 'details', { className: ['properties'] }, [this.h(null, 'summary', {}, org.name), this.h(null, 'pre', {}, source.slice(start(org), end(org)))]); },
      'export-block'(org) { return this.h(null, 'pre', { className: ['inert-export'] }, org.value); },
      'export-snippet'(org) { return this.h(null, 'code', {}, org.value); },
      'special-block'(org) { return this.h(null, 'aside', { className: ['org-callout'] }, this.toHast(org.children, org)); },
      keyword(org) { return ['INCLUDE', 'SETUPFILE', 'HTML'].includes(org.key) ? this.h(null, 'pre', { className: ['inert-export'] }, `#+${org.key}: ${org.value}`) : []; },
      paragraph(org) { return this.h(null, 'p', { 'data-source': start(org), dir: 'auto' }, this.toHast(org.children, org)); },
      'src-block'(org) { return this.h(null, 'pre', { 'data-source': start(org), className: ['src-block'] }, [this.h(null, 'code', { className: [`language-${org.language || 'text'}`] }, org.value)]); },
      table(org) {
        if (org.tableType !== 'org') return this.h(null, 'pre', {}, org.value ?? '');
        const firstRule = org.children.findIndex(r => r.rowType === 'rule');
        const rows = org.children.map((r, i) => r.rowType === 'rule' ? null : this.h(null, 'tr', {}, r.children.map(cell => this.h(null, i < firstRule ? 'th' : 'td', { 'data-action': 'cell', 'data-offset': start(cell), tabIndex: 0, title: 'Edit cell', className: /^\s*[-+]?\d[\d,.% ]*\s*$/.test(source.slice(cell.contentsBegin, cell.contentsEnd)) ? ['numeric'] : [] }, this.toHast(cell.children, cell)))));
        const head = firstRule > 0 ? rows.slice(0, firstRule).filter(r => r !== null) : [];
        const body = (firstRule > 0 ? rows.slice(firstRule + 1) : rows).filter(r => r !== null);
        return this.h(null, 'div', { className: ['table-scroll'], tabIndex: 0, role: 'region', 'aria-label': 'Org table' }, [this.h(null, 'table', {}, [...(head.length ? [this.h(null, 'thead', {}, head)] : []), this.h(null, 'tbody', {}, body)]), ...(org.tblfm ? [this.h(null, 'div', { className: ['formula'] }, `Formula (not evaluated): ${org.tblfm}`)] : [])]);
      },
      link(org) {
        const target = targets.get(org.rawLink) || targets.get(org.path);
        const href = target ? `#${target}` : org.rawLink;
        const label = org.children.length ? this.toHast(org.children, org) : [text(org.rawLink)];
        if (!org.children.length && /\.(png|jpe?g|gif|webp|avif)$/i.test(org.path)) return this.h(null, 'span', { 'data-image': org.linkType === 'file' ? org.path : org.rawLink }, org.path);
        return this.h(null, 'a', { href: /^(https?:|mailto:|#)/i.test(href) ? href : undefined, 'data-link': href, title: org.rawLink }, label);
      },
    },
  }).use(sanitize, {
    ...defaultSchema, clobberPrefix: '',
    required: { ...defaultSchema.required, input: { type: 'checkbox' } },
    tagNames: [...defaultSchema.tagNames!, 'button', 'input', 'section', 'aside'],
    attributes: { ...defaultSchema.attributes, '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'id', 'dir', 'dataSource', 'dataSection', 'dataAction', 'dataOffset', 'dataLink', 'dataImage', 'ariaLabel', 'ariaChecked', 'tabIndex', 'role'], li: ['className'], button: ['type'], input: ['type', 'checked'], },
  }).use(highlight, { detect: false }).use(katex, { trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20 }).runSync(tree) as Root;
  return { tree, html: converted, title: directives.TITLE || '', subtitle: directives.SUBTITLE || '', headings, nodes, keywords, tasks, done };
}

function patch(source: string, from: number, to: number, insert: string): Patch {
  if (from < 0 || to < from || to > source.length) throw new Error('Invalid source range.');
  return { from, to, before: source.slice(from, to), insert };
}
export function applyPatch(source: string, edit: Patch) {
  if (source.slice(edit.from, edit.to) !== edit.before) throw new Error('The document changed. Please try the edit again.');
  return source.slice(0, edit.from) + edit.insert + source.slice(edit.to);
}
export function toggleTask(source: string, node: Headline, keywords: string[]): Patch {
  const offset = start(node);
  const match = /^(\*+[ \t]+)(\S+)/.exec(source.slice(offset));
  if (!match || match[2] !== node.todoKeyword) throw new Error('Task no longer matches the source.');
  const from = offset + match[1].length;
  return patch(source, from, from + match[2].length, keywords[(keywords.indexOf(match[2]) + 1) % keywords.length]);
}
export function toggleCheckbox(source: string, node: ListItem): Patch {
  const offset = start(node);
  const match = /^[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[@\d+\][ \t]+)?\[([ Xx-])\]/.exec(source.slice(offset, node.contentsBegin));
  if (!match) throw new Error('Checkbox no longer matches the source.');
  const from = offset + match[0].length - 2;
  return patch(source, from, from + 1, match[1].toUpperCase() === 'X' ? ' ' : 'X');
}
export function editCell(source: string, node: TableCell, value: string): Patch {
  if (/[\r\n|]/.test(value)) throw new Error('Use \\vert{} for a literal pipe. A cell cannot contain a newline.');
  if (node.contentsBegin === undefined || node.contentsEnd === undefined) throw new Error('This table cell has no editable source range.');
  return patch(source, node.contentsBegin, node.contentsEnd, value);
}
