#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

function getDumpFile(): string {
  const dumpFile = process.argv[2]?.trim();
  if (!dumpFile) {
    throw new Error("Dump file path is required. Usage: npm run db:restore -- database-exports/deaf-territory.dump <target-database-url>");
  }

  const resolved = path.resolve(dumpFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Dump file not found: ${resolved}`);
  }

  return resolved;
}

function getTargetDatabaseUrl(): string {
  const targetDatabaseUrl = process.argv[3]?.trim() || process.env.TARGET_DATABASE_URL?.trim();
  if (!targetDatabaseUrl) {
    throw new Error("Target database URL is required. Pass it after the dump path or set TARGET_DATABASE_URL.");
  }

  return targetDatabaseUrl;
}

function runPgRestore(dumpFile: string, targetDatabaseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pgRestore = spawn(
      "pg_restore",
      [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        `--dbname=${targetDatabaseUrl}`,
        dumpFile,
      ],
      {
        env: process.env,
        stdio: "inherit",
      },
    );

    pgRestore.on("error", (error) => {
      reject(
        new Error(
          `Failed to start pg_restore. Install PostgreSQL client tools and make sure pg_restore is on PATH. Original error: ${error.message}`,
        ),
      );
    });

    pgRestore.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_restore exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function main() {
  const dumpFile = getDumpFile();
  const targetDatabaseUrl = getTargetDatabaseUrl();

  await runPgRestore(dumpFile, targetDatabaseUrl);
  console.log(`Database restored into target database from: ${dumpFile}`);
}

main().catch((error) => {
  console.error("restore-database failed", error);
  process.exit(1);
});
