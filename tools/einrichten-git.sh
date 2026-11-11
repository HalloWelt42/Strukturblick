#!/usr/bin/env bash
# Git von Strukturblick einrichten: Haken mit den harten Regeln aktivieren (nach jedem Klonen einmal ausführen).
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath tools/git-hooks
echo "Haken aktiv: $(git config core.hooksPath)"
