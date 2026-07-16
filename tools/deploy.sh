#!/bin/sh
# Builds the app and publishes dist/index.html to the gh-pages branch (GitHub Pages).
# Usage: sh tools/deploy.sh
set -e
cd "$(dirname "$0")/.."

npm run build

# Build a one-file gh-pages branch without touching the working tree.
BLOB=$(git hash-object -w dist/index.html)
TREE=$(printf '100644 blob %s\tindex.html\n' "$BLOB" | git mktree)
COMMIT=$(git commit-tree "$TREE" -m "deploy $(date +%Y-%m-%d)")
git branch -f gh-pages "$COMMIT"
git push -f origin gh-pages

echo "Deployed. The site updates in a minute or two."
