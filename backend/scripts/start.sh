#!/usr/bin/env sh
set -eu

python - <<'PY'
import os
import socket
import sys
import time
from urllib.parse import urlparse

raw_url = os.environ.get("DATABASE_URL", "")
if not raw_url:
    print("[backend] DATABASE_URL is not configured", file=sys.stderr)
    sys.exit(1)

url = urlparse(raw_url.replace("postgresql+asyncpg://", "postgresql://", 1))
host = url.hostname or "postgres"
port = int(url.port or 5432)
redacted = raw_url
if "@" in redacted:
    scheme, rest = redacted.split("//", 1)
    redacted = f"{scheme}//***:***@{rest.split('@', 1)[1]}"

print(f"[backend] DATABASE_URL={redacted}")
print(f"[backend] waiting for postgres DNS/port at {host}:{port}")

last_error = None
for attempt in range(1, 61):
    try:
        socket.getaddrinfo(host, port)
        with socket.create_connection((host, port), timeout=2):
            print(f"[backend] postgres is reachable at {host}:{port}")
            sys.exit(0)
    except OSError as exc:
        last_error = exc
        print(f"[backend] postgres not ready ({attempt}/60): {exc}")
        time.sleep(1)

print(f"[backend] could not reach postgres at {host}:{port}: {last_error}", file=sys.stderr)
sys.exit(1)
PY

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
