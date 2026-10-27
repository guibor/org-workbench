# Security

Treat every opened Org file as untrusted. This plugin does not execute Babel,
HTML, includes, formulas, file-local variables, or shell/Elisp links. It contains
no credentials and makes no automatic network requests for document content.

The MCP server runs with the user's process privileges, but exposes no generic
filesystem or command tool. Relative reads require the host's opened-file
metadata and must remain inside that document directory after realpath
resolution. Raster images are size-bounded; SVG is deliberately excluded.

The implementation is not a replacement for OS isolation. Do not open files in
a directory whose contents/symlinks an attacker can race while the plugin reads
them. A trusted host must enforce resource URI authorization and ETags.

Please report vulnerabilities using GitHub's private vulnerability reporting
when enabled, or contact the repository owner privately. Do not post sensitive
documents, tokens, or exploit data from someone else's machine in public issues.

Only the latest preview release is supported. Rebuild/update dependencies regularly.
