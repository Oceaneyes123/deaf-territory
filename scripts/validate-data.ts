#!/usr/bin/env tsx
import { Client } from "pg";

import { getPgClientConfig } from "../lib/pg-config";
import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

type CheckResult = {
  name: string;
  count: number;
};

const CHECKS: Array<{ name: string; sql: string }> = [
  {
    name: "missing_canonical_barangays",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM psgc_admin_staging p
      LEFT JOIN barangays b ON b.psgc_code = p.code
      WHERE p.level = 'brgy' AND b.psgc_code IS NULL;
    `,
  },
  {
    name: "barangays_missing_municipality_fk",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM barangays b
      LEFT JOIN municipalities m ON m.psgc_code = b.municipality_psgc_code
      WHERE m.psgc_code IS NULL;
    `,
  },
  {
    name: "invalid_municipality_geometry",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM municipalities
      WHERE NOT ST_IsValid(geom) OR NOT ST_IsValid(geom_simplified);
    `,
  },
  {
    name: "invalid_barangay_geometry",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM barangays
      WHERE NOT ST_IsValid(geom) OR NOT ST_IsValid(geom_simplified);
    `,
  },
  {
    name: "municipality_barangay_count_mismatch",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT
          p.city_municipality_code,
          COUNT(*) FILTER (WHERE p.level = 'brgy') AS psgc_count,
          COUNT(b.psgc_code) AS canonical_count
        FROM psgc_admin_staging p
        LEFT JOIN barangays b ON b.psgc_code = p.code
        WHERE p.level = 'brgy'
        GROUP BY p.city_municipality_code
        HAVING COUNT(*) FILTER (WHERE p.level = 'brgy') <> COUNT(b.psgc_code)
      ) mismatches;
    `,
  },
  {
    name: "missing_display_names",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM barangays
      WHERE display_name = '' OR search_text = '';
    `,
  },
];

async function runChecks(client: Client): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of CHECKS) {
    const { rows } = await client.query<{ count: number }>(check.sql);
    results.push({ name: check.name, count: rows[0].count });
  }

  return results;
}

async function main() {
  const client = new Client(getPgClientConfig());
  await client.connect();

  try {
    const results = await runChecks(client);
    let hasErrors = false;

    for (const result of results) {
      const status = result.count === 0 ? "PASS" : "FAIL";
      if (result.count !== 0) {
        hasErrors = true;
      }
      console.log(`${status} ${result.name}: ${result.count}`);
    }

    if (hasErrors) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("validate-data failed", error);
  process.exit(1);
});
