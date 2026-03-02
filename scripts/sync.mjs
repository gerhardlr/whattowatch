#!/usr/bin/env node
// Usage: node scripts/sync.mjs [base-url]
// Defaults to http://localhost:3000, falls back to https://whattowatch-umber.vercel.app

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local so SYNC_SECRET is available without extra tooling
try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* .env.local not found — rely on actual env */ }

const DEFAULT_LOCAL = "http://localhost:3000";
const DEFAULT_REMOTE = "https://whattowatch-umber.vercel.app";

const baseUrl = (process.argv[2] ?? DEFAULT_LOCAL).replace(/\/$/, "");
const secret = process.env.SYNC_SECRET ?? "";
const url = `${baseUrl}/api/sync`;

console.log(`POST ${url}`);

let res;
try {
  res = await fetch(url, {
    method: "POST",
    headers: { "x-sync-secret": secret },
  });
} catch {
  if (baseUrl === DEFAULT_LOCAL) {
    console.warn(`Local server unreachable — retrying against ${DEFAULT_REMOTE}`);
    res = await fetch(`${DEFAULT_REMOTE}/api/sync`, {
      method: "POST",
      headers: { "x-sync-secret": secret },
    });
  } else {
    throw new Error(`Could not reach ${url}`);
  }
}

const body = await res.json().catch(() => null);
console.log(JSON.stringify(body, null, 2));
if (!res.ok) process.exit(1);
