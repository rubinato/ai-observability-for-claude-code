#!/bin/sh
# macOS / Ubuntu / Debian. Runs from a clone, or straight from GitHub when piped.
set -e
command -v node >/dev/null || { echo "Node.js 22+ is required: https://nodejs.org (Ubuntu/Debian: https://github.com/nodesource/distributions)"; exit 1; }
d=$(dirname "$0")
[ -f "$d/cli.mjs" ] && exec node "$d/cli.mjs" install
exec npx -y github:rubinato/ai-observability-for-claude-code install
