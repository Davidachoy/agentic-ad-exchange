#!/usr/bin/env bash
# mac-sync.sh — pull the Agentic Ad Exchange scaffold from the Pi to the Mac.
#
# Usage (on the Mac):
#   ./mac-sync.sh                    # pull only
#   ./mac-sync.sh --install          # pull, then pnpm install
#   ./mac-sync.sh --run              # pull, install, pnpm dev
#   ./mac-sync.sh --delete           # pull AND remove files missing on the Pi (use carefully)
#
# Override any of these via env var if your setup differs:
#   PI_USER=hustlxai-1  PI_HOST=hustlxai-rbp1.local  PI_PATH=/home/hustlxai-1/hackathon-ideas/arc-hackathon  MAC_PATH=~/arc-hackathon
set -euo pipefail

PI_USER="${PI_USER:-hustlxai-1}"
PI_HOST="${PI_HOST:-hustlxai-rbp1.local}"    # or put the LAN IP, e.g. 192.168.1.42
PI_PATH="${PI_PATH:-/home/hustlxai-1/hackathon-ideas/arc-hackathon}"
MAC_PATH="${MAC_PATH:-$HOME/arc-hackathon}"

RSYNC_FLAGS=(
  -avz                 # archive (preserve perms/mtimes), verbose, compress in transit
  --progress           # per-file progress
  --human-readable     # sizes in KB/MB
  --exclude=node_modules/
  --exclude=dist/
  --exclude=.pnpm-store/
  --exclude=coverage/
  --exclude='*.tsbuildinfo'
  --exclude=.env.local
  --exclude=.env
  --exclude=.DS_Store
)

DO_INSTALL=0
DO_RUN=0
for arg in "$@"; do
  case "$arg" in
    --install)  DO_INSTALL=1 ;;
    --run)      DO_INSTALL=1; DO_RUN=1 ;;
    --delete)   RSYNC_FLAGS+=(--delete) ;;
    -h|--help)
      sed -n '2,13p' "$0"; exit 0 ;;
    *)
      echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

mkdir -p "$MAC_PATH"

echo "→ syncing $PI_USER@$PI_HOST:$PI_PATH/  →  $MAC_PATH/"
rsync "${RSYNC_FLAGS[@]}" \
  "$PI_USER@$PI_HOST:$PI_PATH/" \
  "$MAC_PATH/"

if [ "$DO_INSTALL" = "1" ]; then
  echo "→ pnpm install in $MAC_PATH"
  (cd "$MAC_PATH" && pnpm install)
fi

if [ "$DO_RUN" = "1" ]; then
  echo "→ pnpm dev in $MAC_PATH (Ctrl-C to stop)"
  (cd "$MAC_PATH" && pnpm dev)
fi

echo "done."
