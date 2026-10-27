# Plugin-First Reddit Kit

The user clarified that Codex file-viewer integration is the point of the
product, requested screenshots and a ready Reddit post, and asked that existing
frameworks be reused rather than reimplemented. Stay on main was confirmed.

The README and announcement now lead with the Codex plugin. The Reddit body
credits Uniorg, CodeMirror, KaTeX, Highlight.js, and the official MCP SDKs.
Capture the actual UI using only the public fixture; never fake Codex chrome.
The screenshot manifest states that these are browser-demo captures of the
same renderer, not native desktop-host screenshots.

The capture script verifies an edited cell appears in both views and that
undo/export restores the original document byte-for-byte. Screenshots are
direct captures with captions, alt text, dimensions, and hashes.

The Reddit post has not been submitted. No OAuth app entry is configured and
Chrome automation timed out. Do not equate a completed local kit with an
account-side draft or publication. Current flair and account eligibility still
require the authenticated composer, even after checking public community rules.
