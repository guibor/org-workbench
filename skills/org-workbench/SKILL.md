---
name: org-workbench
description: Open an Org document in the Org Workbench file editor in Codex. Preserve the original Org source, use rendered tasks and tables, and explain supported editing behavior.
---

# Org Workbench

Open the requested `.org` file with the host's file-opening tool (in Codex,
`open_in_codex` with target type `file`). The registered file extension handler
opens the interactive editor. Do not fabricate resource URIs or invoke `org_open`
with a filesystem path in place of a host resource URI.

The editor offers Read, Split, and Source modes. Task badges cycle through the
document's TODO keywords; checkboxes and table cells edit the original source.
Save writes the original file only when the host advertises writable resources
and an ETag. Otherwise export a copy. Never promise a disk write from export.

Raw HTML, Babel, includes, file-local variables, and table formulas are not
executed. Local links/images are scoped to the opened document folder; remote
images are blocked. Cross-file ID/Denote resolution requires Emacs or an index.

The source is canonical. Do not convert the file to Markdown as the primary
workflow. For custom workflows or syntax the renderer does not support, use
Source mode or the user's existing Org editor.
