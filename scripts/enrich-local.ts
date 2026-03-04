#!/usr/bin/env tsx
// Enriches all pending titles directly against the DB — no HTTP server needed.
// Runs in batches of 100, pausing between batches. Stops cleanly on OMDB rate limit.
//
// Usage: npm run enrich:local

import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* rely on actual env */ }

import { enrichTitles } from "../lib/enrich";
import { OmdbRateLimitError } from "../lib/omdb";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

async function main() {
  const totalPending = await prisma.title.count({
    where: { ratingsUpdatedAt: { isSet: false } },
  });

  if (totalPending === 0) {
    console.log("Nothing to enrich — all titles are up to date.");
    return;
  }

  console.log(`\nEnriching ${totalPending.toLocaleString()} pending titles in batches of ${BATCH_SIZE}…\n`);

  const totalStart = Date.now();
  let totalEnriched = 0;
  let totalFailed = 0;
  let batch = 0;

  while (true) {
    batch++;
    const batchStart = Date.now();
    process.stdout.write(`  Batch ${batch}… `);

    try {
      const { enriched, failed, remaining } = await enrichTitles(BATCH_SIZE);
      const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
      totalEnriched += enriched;
      totalFailed += failed;

      console.log(`${enriched} enriched, ${failed} failed — ${remaining.toLocaleString()} remaining  (${elapsed}s)`);

      if (remaining === 0) {
        console.log("\nAll titles enriched!");
        break;
      }
    } catch (err) {
      if (err instanceof OmdbRateLimitError) {
        console.log("\n⚠  OMDB daily limit reached (1000 req/day). Run again tomorrow.");
        break;
      }
      throw err;
    }
  }

  const totalSecs = ((Date.now() - totalStart) / 1000).toFixed(0);
  console.log(`\nDone in ${totalSecs}s — enriched: ${totalEnriched.toLocaleString()}, failed: ${totalFailed.toLocaleString()}`);
}

main()
  .catch((err) => {
    console.error("\nError:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
