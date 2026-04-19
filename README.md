# Deaf Territory

Local setup guide for the Iloilo barangay boundary viewer.

## Requirements

- Node.js 20+
- npm
- PostgreSQL 15+ with PostGIS enabled
- A PSGC staging table named `staging_psgc`
- A barangay boundary GeoJSON file at `data/barangays.geojson` or another path set through `BOUNDARY_GEOJSON_PATH`

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and update the values for your machine.

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deaf_territory
BOUNDARY_GEOJSON_PATH=data/barangays.geojson
PSGC_XLSX_PATH=D:/Download/data.xlsx
```

`DATABASE_URL` is required by the API routes and ETL scripts.
The ETL scripts load `.env.local` automatically.
Hosted Postgres endpoints use TLS automatically unless you explicitly disable it with `PGSSLMODE=disable`.
If your provider requires strict certificate validation, set `PGSSLMODE=verify-full` or `DATABASE_SSL_REJECT_UNAUTHORIZED=true`.

## 3. Prepare the database

Create your database and make sure PostGIS is available:

```sql
CREATE DATABASE deaf_territory;
```

Then connect to that database and enable PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 4. Load source data

This repo expects two raw inputs before the canonical app tables can be built.

### PSGC source

Load the latest Iloilo-capable PSGC dataset into a table named `staging_psgc`.

Expected columns:

- `code`
- `name`
- `level`
- `parent_code`
- `region_code`
- `province_code`
- `city_municipality_code`
- `barangay_code`

The app scripts read from `staging_psgc` and copy the Iloilo subset into canonical staging tables.

Minimum bootstrap SQL:

```sql
CREATE TABLE staging_psgc (
  code VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code VARCHAR(10),
  region_code VARCHAR(2),
  province_code VARCHAR(4),
  city_municipality_code VARCHAR(9),
  barangay_code VARCHAR(10)
);
```

If you have the PSA publication workbook, the repo can load it directly:

```bash
npm run db:load-psgc-xlsx -- D:/Download/data.xlsx
```

Or set `PSGC_XLSX_PATH` and run:

```bash
npm run db:load-psgc-xlsx
```

That command populates `staging_psgc` for you before `npm run db:prepare`.

### Boundary source

Place your barangay boundary GeoJSON at:

```text
data/barangays.geojson
```

If the file lives elsewhere, point `BOUNDARY_GEOJSON_PATH` at it in `.env.local`.

If you download the Level 4 barangay shapefile from `altcoder/philippines-psgc-shapefiles` and extract it under `data/source/ph-adm4/`, you can generate the Iloilo-only GeoJSON with:

```bash
npm run db:generate-iloilo-boundaries
```

Or pass the extracted `.shp` file path directly:

```bash
npm run db:generate-iloilo-boundaries -- D:/path/to/PH_Adm4_BgySubMuns.shp.shp
```

## 5. Build the canonical tables

Run the full database preparation flow:

```bash
npm run db:prepare
```

This runs:

- `npm run db:import-psgc`
- `npm run db:import-boundaries`
- `npm run db:build-search-index`
- `npm run db:validate-data`

## 6. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful commands

```bash
npm run dev:clean
npm run typecheck
npm run build
npm run db:validate-data
```

If `next dev` starts throwing generated module errors such as `Cannot find module './447.js'`, clear the build output and restart with `npm run dev:clean`.

## Notes

- The frontend uses MapLibre.
- The APIs read from the canonical `municipalities` and `barangays` tables, not from mock local files.
- If `DATABASE_URL` is missing, the app can still build, but API requests will fail at runtime.
