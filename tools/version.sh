#!/usr/bin/env bash
# Fassung hochzählen: tools/version.sh [patch|minor|major|id]. Einzige Quelle ist version.json ({version, id, voll}).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec "${APPKERN_PYTHON:-$HOME/Entwicklung/Werkzeuge/Appkern/.venv/bin/python}" -m appkern.werkzeuge fassung "${1:-patch}"
