import { describe, expect, it } from 'vitest';
import { parseOrg, toggleTask, toggleCheckbox, editCell, applyPatch } from '../src/org';
import type { OrgNode } from 'uniorg';
function node<T extends OrgNode['type']>(source: string, type: T) {
  const result = [...parseOrg(source).nodes.values()].find(n => n.type === type);
  if (!result) throw new Error(`Missing ${type}`);
  return result as OrgNode & { type: T };
}
describe('source-preserving Org edits', () => {
  it.each(['\n', '\r\n'])('changes only a TODO token, with %j newlines and Unicode', newline => {
    const source = ['#+title: שלום 📝', '#+TODO: NEXT(n) WAIT(w@) | DONE(d)', '* NEXT [#A] Write :work:', ':PROPERTIES:', ':ID: abc', ':END:', 'Original  spacing.'].join(newline);
    const doc = parseOrg(source);
    expect(applyPatch(source, toggleTask(source, node(source, 'headline'), doc.keywords))).toBe(source.replace('* NEXT', '* WAIT'));
  });
  it('changes only checkbox state, not nested content or a code example', () => {
    const source = '* Heading\n  - [ ] Parent\n    - [X] Child\n\n#+begin_src org\n- [ ] do not edit\n#+end_src\n';
    expect(applyPatch(source, toggleCheckbox(source, node(source, 'list-item')))).toBe(source.replace('  - [ ] Parent', '  - [X] Parent'));
  });
  it('preserves table padding, formulas, and blank cells', () => {
    const source = '|    | two |\n|----+-----|\n| 3  | 4   |\n#+TBLFM: $1=$2\n';
    const cell = node(source, 'table-cell');
    const edited = applyPatch(source, editCell(source, cell, 'one'));
    expect(edited).toContain('one'); expect(edited).toContain('| 3  | 4   |\n#+TBLFM: $1=$2\n');
    expect(() => editCell(source, cell, 'a|b')).toThrow();
  });
  it('rejects stale edits', () => {
    const source = '* TODO Example\n';
    const edit = toggleTask(source, node(source, 'headline'), ['TODO', 'DONE']);
    expect(() => applyPatch('* WAIT Example\n', edit)).toThrow('changed');
  });
  it('never renders executable export HTML or spoofed UI attributes', () => {
    const doc = parseOrg('#+HTML: <script>bad()</script>\n#+ATTR_HTML: :data-action todo :data-offset 0 :onclick bad()\nA paragraph.\n\n#+begin_export html\n<img src=x onerror=bad()>\n#+end_export\n\n[[javascript:bad()][bad]]\n');
    const output = JSON.stringify(doc.html);
    expect(output).not.toContain('"tagName":"script"'); expect(output).not.toContain('"onerror"'); expect(output).not.toContain('"onclick"'); expect(output).not.toContain('"dataAction":"todo"');
    expect(output).not.toContain('"href":"javascript:');
  });
  it('renders a TODO-only heading, properties, math, and internal IDs', () => {
    const doc = parseOrg('* TODO\n:PROPERTIES:\n:ID: test\n:END:\n\n[[id:test][link]] $x^2$\n');
    const output = JSON.stringify(doc.html);
    expect(doc.headings).toHaveLength(1); expect(output).toContain('Properties'); expect(output).toContain('#org-0'); expect(output).toContain('katex');
  });
});
