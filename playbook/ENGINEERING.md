# Org Workbench — Engineering Playbook

> Single source of truth for how this project is built.

## Architecture

- Main components: positioned Org parser, source-state model, React editor, host adapter, stdio MCP server.
- Runtimes: Node 22+, modern browser/MCP App iframe.
- Dependencies: Uniorg, CodeMirror, React, KaTeX, Highlight.js, official MCP SDKs.

## Repository map

- App: `src/`; MCP server: `server/`.
- Supporting tools: `scripts/`, unit/protocol tests and Playwright host fixture in `tests/`.
- Generated: `dist/`, `release/`, `node_modules/`; never manually edit installed plugin caches.

## Conventions

- TypeScript, React, narrow functions and explicit source ranges.
- Tests target data loss, unsafe rendering, scope escapes, races, and real interactions.
- Build and package locally; public source and optional prebuilt archive. Local install via Codex marketplace CLI.
- Read and update `../design.md` for implementation changes, `../prd.org` for requirements.

## Open technical questions

- See `../docs/compatibility.org`; live desktop acceptance is not implied by mock-host tests.
