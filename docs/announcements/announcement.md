# Announcement Draft

Not posted or sent.

## Org Workbench: Read and Edit Org Without Converting It

Org Workbench is a local, open-source viewer and editor for `.org` files.
It opens in Codex's file panel and also runs in a browser. The original Org
source stays canonical: no Markdown copy, HTML round-trip, or Emacs dependency.

The 0.2 preview includes rendered/source/split views, a folding outline,
interactive tasks and checkboxes, editable tables, shared undo, code highlighting,
and math. Reading profiles include MDF Reading, Plain, and Nano-inspired,
with adjustable typography and table density in both light and dark modes.
The latter draws on Nicolas P. Rougier's NANO design ideas; it is not an official port.

Install a prebuilt release on macOS/Linux with Node.js 22+ and a current
Codex CLI/Desktop already available:

```sh
curl -fsSL https://raw.githubusercontent.com/guibor/org-workbench/v0.2.0/install.sh | sh
```

The installer verifies the release checksum and installs without sudo or a
source build. Restart Codex or open a fresh chat after installation. Review the
script before executing it if preferred; detailed instructions are in the repo.

This is a community preview, not a replacement for Emacs Org. Files are limited
to 1 MiB. There is no autosave, agenda, Babel, formula execution, or automatic
Org workflow hooks. Browser edits download a copy; saving the original requires
a compatible writable desktop host. The viewer has no telemetry or AI calls.

Built on Uniorg, CodeMirror, React, and MCP Apps. GPL-3.0-or-later.
Independent community project, not affiliated with OpenAI or GNU Emacs.

Code, screenshots, limitations, and contributions:
https://github.com/guibor/org-workbench

### Short Version

Org Workbench is an open-source Org viewer/editor for Codex and the browser:
read/source/split views, editable tasks and tables, and customizable reading
profiles. It keeps your `.org` source intact. No Emacs needed, no telemetry.
Early GPL preview, with a prebuilt one-command installer:
https://github.com/guibor/org-workbench
