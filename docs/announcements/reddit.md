# I built a Codex plugin for viewing and editing Org files

I use Org in Emacs, and wanted my `.org` files to be readable inside Codex too,
without maintaining a Markdown copy.

So I made **Org Workbench**, a plugin that opens Org files directly in Codex's
file panel. It renders the document, but also lets you edit it: toggle TODO
states and checkboxes, change table cells, or switch to source/split view.
The original `.org` text stays the source of truth, with shared undo across views.

There's a folding outline, compact tables with aligned numbers, code highlighting,
math, and light/dark reading profiles. One optional profile is inspired by
[Nicolas Rougier's NANO](https://github.com/rougier/nano-theme).

This reuses **Uniorg** for parsing/rendering, **CodeMirror** for source editing,
**KaTeX**, **Highlight.js**, and the official MCP SDKs. I built the plugin with
Codex's help, not a new Org parser or editor engine. GPL-3.0-or-later.

[Repository](https://github.com/guibor/org-workbench) | [Screenshots](https://github.com/guibor/org-workbench/blob/main/docs/announcements/screenshots.md)

Installation, with Node.js 22+ and a current Codex CLI/Desktop already installed
(macOS/Linux):

    curl -fsSL https://raw.githubusercontent.com/guibor/org-workbench/v0.2.0/install.sh | sh

Restart Codex or open a fresh chat, then open an `.org` file. The installer uses
a checksum-verified prebuilt release; the repo also has inspect-first and
source-build instructions.

It's an early preview: no agenda, Babel, table-formula execution, or Emacs TODO
hooks. Saves are explicit and depend on host write support; documents are limited
to 1 MiB. The plugin itself makes no AI calls and adds no telemetry.
