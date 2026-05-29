#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# HolisticDrive webapp launcher (server mode)
#
# Starts the local Node server that talks to the Claude Agent SDK using your
# Claude Code subscription credentials, then opens your default browser at the
# local URL. Press Ctrl+C in this terminal to stop both the server and the
# launcher.
#
# What it does:
#   1. cd into the webapp/ directory (wherever this script lives)
#   2. Verify Node.js is installed
#   3. Run `npm install` if node_modules/ is missing
#   4. Start the server in the background and wait for it to bind
#   5. Open your default browser at http://127.0.0.1:PORT
#   6. Wait until you Ctrl+C, then stop the server cleanly
#
# Configuration:
#   PORT  — override the default 8847 (set in your shell or in .env)
#   HOST  — override loopback bind (default 127.0.0.1); DO NOT change to
#           0.0.0.0 unless you understand the implications
# -----------------------------------------------------------------------------

set -euo pipefail

# Resolve script directory so the launcher works no matter where it's run from.
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

PORT="${PORT:-8847}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}"

# ----- 1. Node.js check -----
if ! command -v node >/dev/null 2>&1; then
  printf '\n✗ Node.js is not installed.\n'
  printf '  Install from https://nodejs.org (LTS recommended) and re-run this script.\n\n'
  exit 1
fi

NODE_VERSION="$(node --version 2>/dev/null | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  printf '\n✗ Node.js %s is too old. The Agent SDK requires Node >= 20.\n' "$NODE_VERSION"
  printf '  Install a newer version from https://nodejs.org and re-run.\n\n'
  exit 1
fi

# ----- 2. Install dependencies if needed -----
if [ ! -d node_modules ]; then
  printf '\n→ Installing dependencies (first-time setup, ~30s)…\n\n'
  npm install
fi

# ----- 3. Start the server in the background -----
LOG_FILE="$(mktemp -t hd-server-XXXXXX.log)"
printf '\n→ Starting server (log: %s)…\n' "$LOG_FILE"

PORT="$PORT" HOST="$HOST" npm start >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Make sure we kill the server when this script exits, regardless of how.
cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\n→ Stopping server (PID %s)…\n' "$SERVER_PID"
    kill "$SERVER_PID" 2>/dev/null || true
    # Give it a beat to exit cleanly.
    for _ in 1 2 3 4 5; do
      if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
      sleep 0.4
    done
    # Force if still alive.
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ----- 4. Wait for /api/health to return 200 -----
printf '→ Waiting for server to be ready…\n'
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -m 1 "${URL}/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  # If the background server already died, surface the log and bail.
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\n✗ Server failed to start. Log:\n\n'
    cat "$LOG_FILE"
    exit 1
  fi
  sleep 0.5
done

if [ -z "${READY:-}" ]; then
  printf '\n✗ Server did not respond to /api/health within 5 seconds.\n'
  printf '  Last log lines:\n\n'
  tail -n 20 "$LOG_FILE"
  exit 1
fi

# ----- 5. Open the browser -----
printf '✓ Ready: %s\n' "$URL"
printf '→ Opening browser…\n\n'
if command -v open >/dev/null 2>&1; then
  # macOS
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  # Linux
  xdg-open "$URL" >/dev/null 2>&1 &
else
  printf '  (no native opener found — visit %s in your browser)\n' "$URL"
fi

printf '─────────────────────────────────────────\n'
printf '  HolisticDrive webapp running.\n'
printf '  URL:        %s\n' "$URL"
printf '  Server log: %s\n' "$LOG_FILE"
printf '  Press Ctrl+C to stop.\n'
printf '─────────────────────────────────────────\n\n'

# ----- 6. Wait for the server process -----
wait "$SERVER_PID"
