# Reading Profiles and Community Preview Installation

The user confirmed the installed view opens and requested optional themes,
one-command installation, a commit/push, and Reddit/announcement preparation.

MDF Reading stays the default. An original Nano-inspired profile draws on
Rougier's restrained typography without importing NANO code or fonts. Plain
offers system sans typography. Controls adjust rendering only; browser storage
contains validated preferences, not documents. Arbitrary CSS injection is not
part of this release. Light/dark remains independent of the reading profile.

The primary installer uses pinned prebuilt GitHub release assets, verifies
SHA-256, validates ZIP paths and rejects symlinks, then registers a versioned
user-owned marketplace through the supported Codex CLI. No runtime package
installation or sudo. Checksums from the same publisher are not signatures.

Announcement files are drafts only. Do not post or send them without a new
explicit request. Native opening is user-confirmed; original-file save remains
a distinct acceptance gate despite mock-host coverage.

Verification before release: 25 unit/protocol/installer tests and 12 Playwright
tests passed on macOS. Desktop/mobile light and dark screenshots were visually
checked. Appearance changes preserve the exported source byte-for-byte; a
storage-denied host still permits session-local customization. Keyboard focus
returns to the palette control after dismissing the native dialog.

Testing the real CLI with an isolated CODEX_HOME found that marketplace add
rejects a new source path under an existing name. Upgrades now inspect structured
marketplace metadata, re-register the previous local source, and attempt rollback
on failure. The installer does not silently migrate Git-based registrations.
