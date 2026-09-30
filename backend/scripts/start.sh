#!/usr/bin/env sh
set -eu

node --input-type=module -e '
  import net from "node:net";
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  const url = new URL(value.replace("postgresql+asyncpg://", "postgresql://"));
  const host = url.hostname || "postgres";
  const port = Number(url.port || 5432);
  for (let attempt = 1; attempt <= 60; attempt++) {
    const ready = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(2000);
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => { socket.destroy(); resolve(false); });
    });
    if (ready) process.exit(0);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Postgres is unavailable at ${host}:${port}`);
'

exec npm run dev
