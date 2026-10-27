# Reddit Draft

Not posted. Suggested home: r/emacs or r/orgmode; choose one initially and
check its current self-promotion rules and flair requirements before posting.

## Title

I made an Org viewer/editor for Codex that keeps the original .org file (also works in a browser)

## Body

I use Org in Emacs, but I also spend time in Codex. I wanted my Org files to
be readable there without keeping a second Markdown version around. I also
wanted to edit them, not just look at an export.

I built **Org Workbench**, with Codex's help. It's a local, GPL-licensed Org
viewer/editor that opens in Codex's file panel, with a standalone browser
edition too. It doesn't require Emacs to render the document.

What it does so far:

- Rendered, source, and split views, with a searchable, folding outline.
- Editable TODO states, checkboxes, and table cells. These make narrow changes
  to the original source instead of serializing the whole document from HTML.
- Compact tables, numeric alignment, code highlighting, footnotes, and math.
- A serif reading profile, a plain profile, and an optional Nano-inspired
  profile, with adjustable type, width, and table density. Credit to Nicolas
  P. Rougier's [NANO work](https://github.com/rougier/nano-theme) for the latter's
  restrained hierarchy; this isn't an official theme port.
- Shared undo and version-checked saves when the desktop host supports writes.

This is an early preview, not Emacs Org in a webview. There is no agenda,
Babel, formula execution, automatic TODO logging, statistics-cookie updating,
or cross-file note index. Files are limited to 1 MiB. There is no autosave.
The browser edition imports a file and downloads an edited copy; only a
compatible desktop host can save the original. Mock-host saves are tested;
more real-host testing and non-private Org fixtures would be useful.

The viewer itself makes no AI calls, uploads no documents, and has no
telemetry. Uniorg does the parsing; CodeMirror handles source editing.

Repository, screenshots, and installation:
https://github.com/guibor/org-workbench

With Node.js 22+ and a current Codex CLI/Desktop already installed:

```sh
curl -fsSL https://raw.githubusercontent.com/guibor/org-workbench/v0.2.0/install.sh | sh
```

That downloads a prebuilt release and verifies its checksum. The README also
has inspect-before-running and source-build instructions.

I'd particularly appreciate examples of tables or ordinary Org documents
that render badly. Please use small, non-private examples. I want to improve
the useful subset without pretending to replace Emacs.

## Attachments

Use `docs/reading.png` and `docs/tables.png`, optionally `docs/nano.png`.
Do not include screenshots of personal notes. This draft is not a claim of
affiliation with OpenAI, GNU Emacs, or the NANO projects.
