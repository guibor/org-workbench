# Contributing

Small, source-preserving improvements are welcome. Open an issue with a minimal,
non-private Org example and expected behavior. Do not attach private notes or
credentials. Report security issues privately as described in SECURITY.md.

1. Read `prd.org`, `design.md`, and the playbook.
2. Install Node 22+ and run `npm ci`.
3. Add a regression fixture/test for any parsing or editing change.
4. Run `npm run build`, `npm test`, and `npm run test:e2e`.
5. Update design/compatibility documentation when behavior changes.

Keep Org source canonical. Do not replace the parser with regexes, serialize the
whole document for a one-token edit, evaluate Babel/HTML, or introduce remote
services into the default workflow. Check keyboard access and narrow layouts.

Contributions are licensed GPL-3.0-or-later. Be respectful and concrete in reviews.
