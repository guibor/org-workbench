#!/bin/sh
# Org Workbench installer. No sudo, source build, or npm dependencies.
set -eu
umask 077

VERSION=0.2.0
REPOSITORY=https://github.com/guibor/org-workbench
ARCHIVE="org-workbench-v${VERSION}.zip"
BASE="${REPOSITORY}/releases/download/v${VERSION}"
ROOT="${ORG_WORKBENCH_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/org-workbench}"
TARGET="$ROOT/releases/v$VERSION"

die() { printf 'Org Workbench: %s\n' "$*" >&2; exit 1; }
for command in curl node codex unzip mktemp awk; do
  command -v "$command" >/dev/null 2>&1 || die "Required command not found: $command. Install it, then run this command again."
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || die 'Node.js 22 or newer is required.'
if command -v shasum >/dev/null 2>&1; then
  hash() { shasum -a 256 "$1" | awk '{print $1}'; }
elif command -v sha256sum >/dev/null 2>&1; then
  hash() { sha256sum "$1" | awk '{print $1}'; }
else
  die 'A SHA-256 checker (shasum or sha256sum) is required.'
fi
case "$ROOT" in /*) ;; *) die 'ORG_WORKBENCH_HOME and XDG_DATA_HOME must use absolute paths.' ;; esac

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/org-workbench.XXXXXXXX")
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT
trap 'exit 130' INT TERM
printf 'Downloading Org Workbench %s...\n' "$VERSION"
curl --proto '=https' --tlsv1.2 -fLsS --retry 2 "$BASE/$ARCHIVE" -o "$STAGE/$ARCHIVE"
curl --proto '=https' --tlsv1.2 -fLsS --retry 2 "$BASE/SHA256SUMS" -o "$STAGE/SHA256SUMS"
EXPECTED=$(awk -v name="$ARCHIVE" '$2 == name {print $1}' "$STAGE/SHA256SUMS")
case "$EXPECTED" in ''|*[!0-9a-fA-F]*) die 'The release checksum is missing or invalid.' ;; esac
[ "${#EXPECTED}" -eq 64 ] || die 'The release checksum is invalid.'
[ "$(hash "$STAGE/$ARCHIVE")" = "$EXPECTED" ] || die 'Checksum verification failed. Nothing was installed.'

# Validate entries before extraction. Filesystem tools must never consume traversal paths.
unzip -Z1 "$STAGE/$ARCHIVE" > "$STAGE/entries"
awk '
  /(^\/|(^|\/)\.\.(\/|$)|\\)/ {exit 1}
  !/^(org-workbench\/|\.agents\/)/ {exit 1}
' "$STAGE/entries" || die 'The archive contains an unexpected path.'
unzip -Z -l "$STAGE/$ARCHIVE" > "$STAGE/attributes"
awk '$1 ~ /^l/ {bad=1} END {exit bad}' "$STAGE/attributes" || die 'The archive contains a symbolic link.'
mkdir "$STAGE/extracted"
unzip -q "$STAGE/$ARCHIVE" -d "$STAGE/extracted"
[ -z "$(find "$STAGE/extracted" -type l -print)" ] || die 'The archive contains a symbolic link.'
for required in org-workbench/dist/server.mjs org-workbench/dist/ui/index.html org-workbench/.codex-plugin/plugin.json .agents/plugins/marketplace.json; do
  [ -f "$STAGE/extracted/$required" ] || die "The archive is missing $required."
done
printf '%s\n' "$EXPECTED" > "$STAGE/extracted/.archive-sha256"
mkdir -p "$ROOT/releases"
if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
  [ ! -L "$TARGET" ] || die "Refusing to use symbolic link $TARGET."
  [ -f "$TARGET/.archive-sha256" ] && [ "$(cat "$TARGET/.archive-sha256")" = "$EXPECTED" ] || die "Refusing to replace existing directory $TARGET. Choose a different ORG_WORKBENCH_HOME."
else
  mv "$STAGE/extracted" "$TARGET"
fi
codex plugin marketplace list --json > "$STAGE/marketplaces.json"
PREVIOUS=$(node - "$STAGE/marketplaces.json" "$TARGET" <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(data.marketplaces)) throw new Error('Unrecognized Codex marketplace list. Update the Codex CLI.');
const entry = data.marketplaces.find(item => item.name === 'org-workbench-community');
if (entry && entry.root !== fs.realpathSync(process.argv[3])) {
  const previous = entry.marketplaceSource;
  if (previous?.sourceType !== 'local' || typeof previous.source !== 'string' || !previous.source.startsWith('/')) {
    throw new Error('An existing non-local marketplace uses this name. Remove that registration explicitly before installing.');
  }
  process.stdout.write(previous.source);
}
NODE
)
restore_previous() {
  [ -n "$PREVIOUS" ] || return 0
  printf 'Restoring the previous marketplace registration...\n' >&2
  if codex plugin marketplace add "$PREVIOUS"; then
    codex plugin add org-workbench@org-workbench-community || printf 'Reinstall the previous plugin with the Codex CLI.\n' >&2
  else
    printf 'Could not restore the previous registration at %s. Its files are unchanged.\n' "$PREVIOUS" >&2
  fi
}
if [ -n "$PREVIOUS" ]; then
  printf 'Updating the Org Workbench marketplace registration; old release files are retained.\n'
  codex plugin marketplace remove org-workbench-community
fi
if ! codex plugin marketplace add "$TARGET"; then
  restore_previous
  die 'Could not register the new release.'
fi
if ! codex plugin add org-workbench@org-workbench-community; then
  if [ -n "$PREVIOUS" ]; then
    codex plugin marketplace remove org-workbench-community
    restore_previous
  fi
  die 'Could not install the new plugin.'
fi
printf '\nInstalled Org Workbench %s in %s\n' "$VERSION" "$TARGET"
printf 'Restart Codex or use a fresh chat with @Org Workbench selected, then open a .org file.\n'
printf 'Node.js must also be on the PATH seen by Codex Desktop. Older versions were left untouched.\n'
