#!/usr/bin/env tsx
// Prints database stats: total titles, enrichment status, per-service counts, type breakdown.
//
// Usage: npm run stats

import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* rely on actual env */ }

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    total,
    enriched,
    movies,
    series,
    onNetflix,
    onPrime,
    onPrimePay,
    onDisney,
    onApple,
    onApplePay,
    noService,
    syncLogs,
  ] = await Promise.all([
    prisma.title.count(),
    prisma.title.count({ where: { ratingsUpdatedAt: { not: null } } }),
    prisma.title.count({ where: { type: "movie" } }),
    prisma.title.count({ where: { type: "show" } }),
    prisma.title.count({ where: { onNetflix: true } }),
    prisma.title.count({ where: { onPrime: true } }),
    prisma.title.count({ where: { onPrimePay: true } }),
    prisma.title.count({ where: { onDisney: true } }),
    prisma.title.count({ where: { onApple: true } }),
    prisma.title.count({ where: { onApplePay: true } }),
    prisma.title.count({
      where: {
        onNetflix: false,
        onPrime: false,
        onPrimePay: false,
        onDisney: false,
        onApple: false,
        onApplePay: false,
      },
    }),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 3 }),
  ]);

  const unenriched = total - enriched;
  const enrichedPct = total > 0 ? ((enriched / total) * 100).toFixed(1) : "0.0";

  console.log("\n=== WhatToWatch DB Stats ===\n");

  console.log("Titles");
  console.log(`  Total:      ${total.toLocaleString()}`);
  console.log(`  Movies:     ${movies.toLocaleString()}`);
  console.log(`  Series:     ${series.toLocaleString()}`);

  console.log("\nEnrichment");
  console.log(`  Enriched:   ${enriched.toLocaleString()} (${enrichedPct}%)`);
  console.log(`  Pending:    ${unenriched.toLocaleString()}`);

  console.log("\nBy Service (flags set):");
  console.log(`  Netflix:    ${onNetflix.toLocaleString()}`);
  console.log(`  Prime:      ${onPrime.toLocaleString()}`);
  console.log(`  Prime Pay:  ${onPrimePay.toLocaleString()}`);
  console.log(`  Disney+:    ${onDisney.toLocaleString()}`);
  console.log(`  Apple TV+:  ${onApple.toLocaleString()}`);
  console.log(`  Apple Pay:  ${onApplePay.toLocaleString()}`);
  console.log(`  No service: ${noService.toLocaleString()}${noService > 0 ? " ⚠️  (orphaned — sync may be incomplete)" : ""}`);

  if (syncLogs.length > 0) {
    console.log("\nRecent Syncs");
    for (const log of syncLogs) {
      const duration = log.completedAt
        ? `${((log.completedAt.getTime() - log.startedAt.getTime()) / 1000).toFixed(0)}s`
        : "in progress";
      const purge = log.titlesDeleted != null ? `  -${log.titlesDeleted} purged` : "";
      console.log(
        `  [${log.status.padEnd(8)}] ${log.startedAt.toISOString().slice(0, 16)}  ${log.titlesSynced} titles${purge}  (${duration})`
      );
    }
  }

  console.log();
}

main()
  .catch((err) => {
    console.error("Error:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
