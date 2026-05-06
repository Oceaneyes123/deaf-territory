# Database Repopulation and Transfer

This project has two supported ways to move database data:

- Rebuild the app tables from source files with the existing import pipeline.
- Export the current PostgreSQL database and restore it into another PostgreSQL database.

Use the rebuild path when you want a clean database generated from the PSGC workbook and barangay boundary GeoJSON. Use the export path when you want the exact current database state, including staging tables and generated PostGIS geometries.

## Requirements

- Node.js 20+
- npm
- PostgreSQL 15+ with PostGIS available
- PostgreSQL client tools on `PATH` for transfer exports: `pg_dump`, `pg_restore`, and optionally `psql`
- A configured `DATABASE_URL` in `.env` or `.env.local`

Example local connection:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deaf_territory
BOUNDARY_GEOJSON_PATH=data/barangays.geojson
PSGC_XLSX_PATH=D:/Download/data.xlsx
```

Hosted PostgreSQL endpoints usually require TLS. The app scripts enable TLS automatically for non-localhost hosts. PostgreSQL command-line tools can use `?sslmode=require` in the connection string or the `PGSSLMODE=require` environment variable.

## Option 1: Rebuild from Source Data

This recreates the canonical `municipalities` and `barangays` tables from source data already used by the project.

1. Create the target database.

```sql
CREATE DATABASE deaf_territory;
```

2. Connect to the target database and enable PostGIS.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

3. Configure `.env.local` so `DATABASE_URL` points to the target database.

4. Load the raw PSGC workbook into `staging_psgc`.

```bash
npm run db:load-psgc-xlsx -- D:/Download/data.xlsx
```

If `PSGC_XLSX_PATH` is set, the path argument can be omitted:

```bash
npm run db:load-psgc-xlsx
```

5. Make sure the barangay boundary GeoJSON exists at `data/barangays.geojson`, or set `BOUNDARY_GEOJSON_PATH` to the correct file.

If the source shapefile is under `data/source/ph-adm4/`, regenerate the GeoJSON with:

```bash
npm run db:generate-iloilo-boundaries
```

6. Build and validate the database.

```bash
npm run db:prepare
```

`db:prepare` runs the existing import flow:

- `db:import-psgc`
- `db:import-boundaries`
- `db:build-search-index`
- `db:validate-data`

## Option 2: Export Current Database for Transfer

This creates a portable PostgreSQL custom-format dump under `database-exports/`.

```bash
npm run db:export
```

To choose a different output directory:

```bash
npm run db:export -- D:/backups/deaf-territory
```

The export uses:

```bash
pg_dump --format=custom --blobs --no-owner --no-acl
```

That format is ready for `pg_restore` and is usually the best transfer format between PostgreSQL databases. `--no-owner` and `--no-acl` make the dump easier to restore into databases owned by a different user.

The generated dump may contain credentials indirectly through operational logs or shell history if your `DATABASE_URL` includes a password. Do not commit database exports. The `database-exports/` directory is ignored by git.

## Restore an Export into Another Database

Create the target database first, then enable PostGIS in it:

```sql
CREATE DATABASE deaf_territory_transfer;
\c deaf_territory_transfer
CREATE EXTENSION IF NOT EXISTS postgis;
```

Restore with a target connection string:

```bash
npm run db:restore -- database-exports/deaf-territory-YYYYMMDD-HHMMSS.dump postgres://user:password@host:5432/deaf_territory_transfer
```

Or set `TARGET_DATABASE_URL`:

```bash
TARGET_DATABASE_URL=postgres://user:password@host:5432/deaf_territory_transfer npm run db:restore -- database-exports/deaf-territory-YYYYMMDD-HHMMSS.dump
```

On PowerShell:

```powershell
$env:TARGET_DATABASE_URL="postgres://user:password@host:5432/deaf_territory_transfer"
npm run db:restore -- database-exports/deaf-territory-YYYYMMDD-HHMMSS.dump
```

The restore script runs `pg_restore --clean --if-exists --no-owner --no-acl`, so it replaces matching objects in the target database. Use a new or disposable target database unless you intentionally want to overwrite the existing tables.

After restore, validate the transferred data:

```bash
DATABASE_URL=postgres://user:password@host:5432/deaf_territory_transfer npm run db:validate-data
```

On PowerShell:

```powershell
$env:DATABASE_URL="postgres://user:password@host:5432/deaf_territory_transfer"
npm run db:validate-data
```

## Quick Choice Guide

- Use `npm run db:prepare` when rebuilding from known source files.
- Use `npm run db:export` and `npm run db:restore` when transferring the exact current database.
- Use export and restore for production handoff, staging copy, or migration to a hosted PostgreSQL provider.
