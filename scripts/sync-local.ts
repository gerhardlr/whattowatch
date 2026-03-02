#!/usr/bin/env tsx
// Runs the full catalog sync directly against the DB — no HTTP server needed.
// Bypasses Vercel's function timeout limit for local or CI use.
//
// Usage: npm run sync:local

import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* rely on actual env */ }

import { syncTitles } from "../lib/sync";

async function main() {
  console.log("Starting catalog sync…");
  const start = Date.now();

  try {
    const result = await syncTitles();
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Synced ${result.titlesSynced} titles in ${secs}s (syncId: ${result.syncId})`);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "ALREADY_RUNNING") {
      console.error("Sync already in progress. Run npm run sync:reset first if it crashed.");
      process.exit(1);
    }
    console.error("Sync failed:", e.message ?? err);
    process.exit(1);
  }
}

main();
