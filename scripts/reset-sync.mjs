#!/usr/bin/env node
// Resets any stuck "running" sync logs to "failed".
// Usage: node scripts/reset-sync.mjs

import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* rely on actual env */ }

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const { count } = await prisma.syncLog.updateMany({
  where: { status: "running" },
  data: { status: "failed", error: "Manually reset (crashed sync)", completedAt: new Date() },
});

console.log(`Reset ${count} stuck sync log(s) to "failed".`);
await prisma.$disconnect();
