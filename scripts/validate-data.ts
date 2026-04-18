#!/usr/bin/env tsx
import { Client } from "pg";

type CheckResult = {
  name: string;
  count: number;
};

const CHECKS: Array<{ name: string; sql: string }> = [
  {
    name: "missing_psgc_codes_in_boundaries",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM barangay_boundaries b
      LEFT JOIN psgc_admin p ON p.code = b.psgc_code
      WHERE p.code IS NULL;
    `,
  },
  {
    name: "duplicate_psgc_codes_in_boundaries",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT psgc_code
        FROM barangay_boundaries
        GROUP BY psgc_code
        HAVING COUNT(*) > 1
      ) d;
    `,
  },
  {
    name: "invalid_boundary_geometry",
    sql: `
      SELECT COUNT(*)::int AS count
      FROM barangay_boundaries
      WHERE NOT ST_IsValid(geom);
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
          COUNT(*) FILTER (WHERE b.psgc_code IS NOT NULL) AS boundary_count
        FROM psgc_admin p
        LEFT JOIN barangay_boundaries b ON b.psgc_code = p.code
        WHERE p.level = 'brgy'
        GROUP BY p.city_municipality_code
        HAVING COUNT(*) FILTER (WHERE p.level = 'brgy') <> COUNT(*) FILTER (WHERE b.psgc_code IS NOT NULL)
      ) x;
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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const results = await runChecks(client);
    let hasErrors = false;

    for (const result of results) {
      const status = result.count === 0 ? "PASS" : "FAIL";
      if (result.count !== 0) hasErrors = true;
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
