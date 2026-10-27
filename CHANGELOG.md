# Changelog

## 0.2.0 - 2026-10-27

- Added MDF Reading, Nano-inspired, and Plain presentation profiles with
  adjustable text size, line height, page width, and table density.
- Persist only validated display preferences; source and paths are never cached.
- Added a pinned, checksum-verified one-command prebuilt installer. No Git,
  source build, or sudo; old versions are retained.
- Added release ZIP/checksum tooling and installation/troubleshooting instructions.
- Prepared Reddit and announcement drafts (not posted).
- User confirmed native opening works; native original-file saving remains a
  separate acceptance gate. Added appearance and installer regression tests.

## 0.1.1 - 2026-10-27

First public preview. Rendered/source/split Org editing, task and checkbox
patches, editable tables, outline/folding, syntax highlighting, math, and
conditional MCP resource saves. Browser import/export is included.

Validated with unit/protocol tests and desktop/mobile browser workflows.
Real desktop open/edit/save remains an explicit acceptance gate after plugin
reload; see the compatibility ledger.
