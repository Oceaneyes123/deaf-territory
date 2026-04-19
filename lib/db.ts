import { Pool } from "pg";

import { getPgPoolConfig } from "./pg-config";

declare global {
  var __deafTerritoryPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__deafTerritoryPool) {
    global.__deafTerritoryPool = new Pool(getPgPoolConfig());
  }

  return global.__deafTerritoryPool;
}
