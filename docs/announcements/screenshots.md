# Org Workbench Screenshots

Org Workbench is a Codex file-viewer plugin. These screenshots show its actual
interface using the public `examples/field-notes.org` fixture. They were captured
from the browser demo, which uses the same React renderer as the plugin;
they are not full Codex application screenshots. No host chrome or save state
has been composited into them.

## Reading

![Org Workbench reading view with a folding outline and the public example document](screenshots/01-reading.png)

## Tasks and Tables

![Org tasks and a four-column table with aligned numeric values](screenshots/02-tables.png)

## Source and Rendered Document

![Org table syntax and its rendered table in split view](screenshots/03-split.png)

## Editing the Same Source

![A table cell changed to Quiet morning in both the source and rendered table](screenshots/04-editing.png)

## Nano-Inspired Dark Profile

![The Nano-inspired reading profile in dark mode](screenshots/05-nano-dark.png)

## Reading Controls

![Appearance controls for profile, text size, line height, page width, and table density](screenshots/06-appearance.png)

Captions, alt text, dimensions, and SHA-256 hashes are in
[`screenshots/manifest.json`](screenshots/manifest.json).
To regenerate while a local preview is running: `npm run screenshots`.
