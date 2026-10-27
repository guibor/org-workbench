# Design

## Data Flow

The host dispatches `.org` to `org_open`, loads one bundled HTML resource, and
sends the opened file's opaque URI. `host.ts` reads it through the official MCP
Extensions resource API. The browser edition uses a File input instead.

`DocumentSession` owns the original source, baseline, ETag, undo history, and
save/conflict state. Rendering is a projection of source, not a second document.
Every rich edit replaces a verified source range. The source editor maps
CodeMirror offsets back to original offsets, preserving untouched CRLF and mixed
line endings. There is no Org-to-Markdown-to-Org or HTML-to-Org conversion.

## Modules and Main Functions

| Module | Responsibility |
| --- | --- |
| `src/org.ts` | `parseOrg` uses Uniorg's positioned AST, extracts metadata and outline, builds sanitized HAST. `toggleTask`, `toggleCheckbox`, `editCell` produce narrow patches. `applyPatch` checks the expected old text. |
| `src/document.ts` | `DocumentSession.edit`, `undo`, `redo` share history across views. `save` uses `ifMatch`; `refresh` replaces only clean documents unless the user explicitly discards edits. Notifications during a save are deferred. |
| `src/host.ts` | `connectHost` registers input handlers before connecting, applies theme/safe areas, and supplies read/write/subscription/export/image/link adapters. `browserFile` is read/import only; `download` exports an explicit copy. |
| `src/Workbench.tsx` | Session lifecycle, view modes, outline, toolbar, conflict messages, keyboard shortcuts, and table-cell dialog. |
| `src/Reading.tsx` | Safe HAST-to-React projection, folding, code copy, explicit image loading, delegated source actions, and internal-link navigation. |
| `src/Editor.tsx` | CodeMirror source editor with lightweight lexical highlighting, search, shared undo bindings, original-line-ending patch mapping, and cursor-follow navigation. Uniorg remains the semantic parser. |
| `src/style.css` | Serif prose, restrained system-font controls, dense numeric tables, responsive split panes, dark theme, reduced motion, and print. |
| `src/appearance.ts` | `validateAppearance` validates enums and bounds numeric preferences. `loadAppearance` and `saveAppearance` use guarded browser storage for display settings only. |
| `src/AppearancePanel.tsx`, `src/appearance.css` | Accessible modal controls and original reading-profile styles. Native dialog focus/escape behavior; CSS variables affect rendering, never the source editor or document text. |
| `server/index.ts` | Stdio MCP server. Registers the `.org` entrypoint and bundled app resource; app-only tools support bounded image reads and relative-link resolution. No server write tool. |
| `server/files.ts` | `scopedPath` resolves real paths and rejects directory escapes, including symlinks. `readImage` accepts bounded raster formats only. |
| `scripts/` | Build a self-contained server/UI; collect dependency notices; package an explicit runtime, examples, and documentation allowlist. Source lives in the matching public Git tag. |
| `scripts/capture-announcement.mjs` | Capture actual public-fixture UI states in an isolated browser context. `capture` records PNGs and their hashes/captions; `goToHeading` navigates through the real outline. Verify table edits reach source, undo them, and compare the exported document byte-for-byte. No simulated Codex chrome. |
| `scripts/prepare-reddit.mjs` | Split the first Markdown heading from the post body, validate title/body size and screenshot hashes, and create a local ZIP with text, payload, captions, and images. It makes no Reddit API calls and does not submit anything. |
| `install.sh`, `scripts/archive.mjs` | Version-pinned prebuilt ZIP installer and release archive/checksum creation. Validate prerequisites, checksum, paths, and symlinks before extracting; register via the Codex CLI. Preserve old releases and reject unknown existing targets. Read structured marketplace metadata and re-register an existing local source; `restore_previous` attempts rollback on registration/install failure. |

## Trust Boundaries

Document data is not instructions. Export attributes are removed before
conversion; raw HTML is rendered as text; sanitized HAST is converted to React
without `dangerouslySetInnerHTML`. KaTeX runs with trust disabled and expansion
limits. Highlight.js does not evaluate source blocks. Remote images do not load.

Only the host-supplied `openai/resource.path` metadata authorizes relative reads.
The app cannot supply an arbitrary base path. Local link/image resolution is
confined to the opened document directory. Server diagnostics never use stdout.

Original-file writes require a host-provided ETag and writable capability.
Conflicts do not offer an unconditional overwrite. A failed save leaves edits
intact. Export uses `ui/download-file` in the host, not blocked iframe downloads.

## Constraints

The parser/editor limit is 1 MiB. History is bounded to 100 entries or roughly
5 million UTF-16 characters. Rendering is synchronous, so large files may be
slower. File-panel close is host-controlled; users must save or export before
closing. No private source is automatically cached in browser storage.
Only validated appearance preferences persist, when the host permits storage.
MDF Reading remains the default. Nano-inspired is original CSS, not a port or
bundled third-party theme. Fonts are local system fallbacks, never downloaded.

Source editing supports arbitrary text, but rich actions deliberately cover a
small subset. They do not run Emacs hooks or recalculate Org statistics/formulas.
TODO directives are read from the AST, never from code blocks or regular prose.
The initial UI cycles the combined declared keyword list; separate workflow
sequences are a documented follow-up.

## Verification

Vitest covers exact edits, hostile content, version races, permissions and path
containment. Playwright covers desktop/mobile interactions and a test MCP host.
The built stdio server is tested in an isolated directory without node_modules;
the mock-host browser test loads the production HTML bundle. Live installation is a separate gate:
existing Codex chats can show the file handler while rejecting its not-yet-loaded
MCP backend. The user has confirmed that the installed view now opens; this
does not establish that original-file saves succeed. A fresh host session is
required to qualify real writes. Installer tests mock downloads and the CLI,
including corrupted downloads, symlinks, existing directories, and repeat runs.
Browser tests cover preference persistence, focus restoration, mobile overflow,
and source preservation when changing appearance, including storage-denied hosts.
