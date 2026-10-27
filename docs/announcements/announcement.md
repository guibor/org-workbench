# Org Workbench: An Org File Viewer and Editor Plugin for Codex

Open your existing `.org` files directly inside Codex, with readable tables,
a folding outline, interactive tasks, and source editing. Your original Org
file stays the source of truth. No Markdown conversion or separate editor window.

Org Workbench adds rendered, source, and split views to Codex's file panel.
TODO states, checkboxes, and table cells are editable, with shared undo and
version-checked saves when the host supports writes. Reading profiles include
MDF Reading, Plain, and Nano-inspired, with configurable text size, spacing,
page width, and table density.

It builds on Uniorg, CodeMirror, KaTeX, Highlight.js, React, and the official
MCP SDKs. Org Workbench supplies the file-viewer integration and source-preserving
interactions; it does not reimplement those parsing and editing frameworks.

Install on macOS/Linux with Node.js 22+ and a current Codex CLI/Desktop:

```sh
curl -fsSL https://raw.githubusercontent.com/guibor/org-workbench/v0.2.0/install.sh | sh
```

Restart Codex or use a fresh chat after installation. This is a GPL-3.0-or-later
community preview: explicit saves, a 1 MiB document limit, and no agenda,
Babel, formula execution, or Emacs workflow hooks. The plugin adds no telemetry
or AI calls. A browser demo is available for trying the interface without the
desktop integration; it exports copies rather than saving original files.

https://github.com/guibor/org-workbench

## Short Version

Org Workbench is an open-source Codex plugin for reading and editing `.org`
files right in the file panel. Rendered/source/split views, editable tasks and
tables, and configurable reading profiles, without converting your notes to
Markdown. Built on Uniorg and CodeMirror. Early GPL preview:
https://github.com/guibor/org-workbench
