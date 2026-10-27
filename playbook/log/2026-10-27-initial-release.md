# Initial implementation

The current request supersedes a read-only feasibility proposal: the community
tool must support actual edits while preserving original Org source.

Decisions:
- Use Uniorg instead of a new parser; GPL-3.0-or-later for compatible licensing.
- Source ranges, not document serialization, for rich edits.
- Use official host resource writes with ETags; no generic server write tool.
- Package a self-contained stdio server and HTML UI; no runtime npm install.
- Keep original files, browser drafts, and external edits distinct.

Validation: 16 unit/state/security/protocol tests and eight desktop/mobile
Playwright tests pass. Runtime dependency audit reports no known vulnerabilities.
Codex recognizes the installed `.org` handler. The current pre-install chat
cannot yet load the new MCP server and reports `unknown MCP server` in its logs.
Real desktop save acceptance must be recorded separately after reload.

References:
- https://github.com/openai/mcp-extensions/blob/main/docs/spec.md
- https://github.com/openai/mcp-extensions/blob/main/docs/patterns.md
- https://github.com/openai/mcp-extensions/blob/main/AGENTS.md
- https://github.com/rasendubi/uniorg
- https://github.com/github/markup
- https://docs.gitlab.com/user/project/repository/files/
