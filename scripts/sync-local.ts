#!/usr/bin/env tsx
// Runs the full step-based catalog sync directly against the DB — no HTTP server needed.
// Simulates the Vercel after() chain by calling each step sequentially in a loop.
// Useful for measuring per-step timings before deploying.
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

import { startSync, runSyncStep } from "../lib/sync";

async function main() {
  const totalStart = Date.now();
  console.log("Starting sync — initialising (reset flags + fetch genres)…");

  const initStart = Date.now();
  await startSync();
  console.log(`  init done in ${((Date.now() - initStart) / 1000).toFixed(1)}s\n`);

  let stepNum = 0;
  while (true) {
    stepNum++;
    const stepStart = Date.now();
    console.log(`\n--- step ${stepNum} ---`);

    const { done, phase } = await runSyncStep();
    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
    console.log(`  step ${stepNum} complete: ${phase}  (${elapsed}s)`);

    if (done) break;
  }

  const totalSecs = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\nSync complete in ${totalSecs}s across ${stepNum} steps.`);
}

main().catch((err) => {
  console.error("Sync failed:", err.message ?? err);
  process.exit(1);
});
