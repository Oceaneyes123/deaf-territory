#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { getRequiredEnv, loadLocalEnv } from "./_lib/env";

loadLocalEnv();

function timestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
}

function runPgDump(databaseUrl: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pgDump = spawn(
      "pg_dump",
      [
        "--format=custom",
        "--blobs",
        "--no-owner",
        "--no-acl",
        `--file=${outputFile}`,
        databaseUrl,
      ],
      {
        env: process.env,
        stdio: "inherit",
      },
    );

    pgDump.on("error", (error) => {
      reject(
        new Error(
          `Failed to start pg_dump. Install PostgreSQL client tools and make sure pg_dump is on PATH. Original error: ${error.message}`,
        ),
      );
    });

    pgDump.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_dump exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function main() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");
  const outputDir = path.resolve(process.argv[2] ?? "database-exports");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `deaf-territory-${timestamp()}.dump`);
  await runPgDump(databaseUrl, outputFile);

  console.log(`Database export created: ${outputFile}`);
}

main().catch((error) => {
  console.error("export-database failed", error);
  process.exit(1);
});
