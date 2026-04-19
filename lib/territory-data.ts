import type { Geometry } from "geojson";

import { getPool } from "./db";
import { getCachedValue } from "./server-cache";
import type {
  BarangayDetail,
  BoundaryFeatureCollection,
  MunicipalitySummary,
  SearchResult,
} from "./territory-types";

type JsonRow<T> = {
  geojson: T;
};

type SearchRow = SearchResult & {
  exact_rank: number;
  starts_rank: number;
  partial_rank: number;
  display_rank: number;
};

type BarangayDetailRow = {
  psgcCode: string;
  name: string;
  displayName: string;
  municipalityPsgcCode: string;
  municipalityName: string;
  provinceName: string;
  regionName: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  areaSqKm: number | null;
  geometry: Geometry;
};

const PROJECTED_SOURCE_SRID = 32651;
const GEOGRAPHIC_SRID = 4326;
const MUNICIPALITY_OVERVIEW_TOLERANCE = 0.0005;
const GEOJSON_OVERVIEW_DECIMALS = 5;
const GEOJSON_DETAIL_DECIMALS = 6;
const TERRITORY_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeGeometrySql(column: string): string {
  return `
    CASE
      WHEN
        ABS(ST_XMin(${column})) > 180
        OR ABS(ST_XMax(${column})) > 180
        OR ABS(ST_YMin(${column})) > 90
        OR ABS(ST_YMax(${column})) > 90
      THEN ST_Transform(ST_SetSRID(${column}, ${PROJECTED_SOURCE_SRID}), ${GEOGRAPHIC_SRID})
      ELSE ST_Transform(ST_SetSRID(${column}, ${GEOGRAPHIC_SRID}), ${GEOGRAPHIC_SRID})
    END
  `;
}

const NORMALIZED_MUNICIPALITY_GEOM_SQL = normalizeGeometrySql("geom");
const NORMALIZED_MUNICIPALITY_SIMPLIFIED_GEOM_SQL = normalizeGeometrySql("geom_simplified");
const NORMALIZED_BARANGAY_GEOM_SQL = normalizeGeometrySql("geom");
const NORMALIZED_BARANGAY_SIMPLIFIED_GEOM_SQL = normalizeGeometrySql("geom_simplified");
const NORMALIZED_BARANGAY_CENTROID_SQL = normalizeGeometrySql("centroid");
const NORMALIZED_BARANGAY_BBOX_SQL = normalizeGeometrySql("bbox");

async function queryMunicipalities(): Promise<MunicipalitySummary[]> {
  const pool = getPool();
  const { rows } = await pool.query<MunicipalitySummary>(`
    SELECT
      psgc_code AS "psgcCode",
      name,
      type
    FROM municipalities
    ORDER BY name ASC;
  `);

  return rows;
}

async function queryMunicipalityGeometry(): Promise<BoundaryFeatureCollection> {
  const pool = getPool();
  const { rows } = await pool.query<JsonRow<BoundaryFeatureCollection>>(`
    WITH municipality_geometry AS (
      SELECT
        psgc_code,
        name,
        type,
        ST_Multi(ST_SimplifyPreserveTopology(${NORMALIZED_MUNICIPALITY_GEOM_SQL}, ${MUNICIPALITY_OVERVIEW_TOLERANCE})) AS geom
      FROM municipalities
    )
    SELECT
      jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom, ${GEOJSON_OVERVIEW_DECIMALS})::jsonb,
              'properties', jsonb_build_object(
                'psgcCode', psgc_code,
                'name', name,
                'type', type,
                'bbox', jsonb_build_array(
                  ST_XMin(ST_Envelope(geom)),
                  ST_YMin(ST_Envelope(geom)),
                  ST_XMax(ST_Envelope(geom)),
                  ST_YMax(ST_Envelope(geom))
                )
              )
            )
            ORDER BY name ASC
          ),
          '[]'::jsonb
        )
      ) AS geojson
    FROM municipality_geometry;
  `);

  return rows[0]?.geojson ?? { type: "FeatureCollection", features: [] };
}

export async function searchBarangays(query: string): Promise<SearchResult[]> {
  const pool = getPool();
  const { rows } = await pool.query<SearchRow>(
    `
      SELECT
        psgc_code AS "psgcCode",
        name,
        display_name AS "displayName",
        municipality_psgc_code AS "municipalityPsgcCode",
        municipality_name AS "municipalityName",
        CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END AS exact_rank,
        CASE WHEN LOWER(name) LIKE LOWER($1) || '%' THEN 0 ELSE 1 END AS starts_rank,
        CASE WHEN LOWER(name) LIKE '%' || LOWER($1) || '%' THEN 0 ELSE 1 END AS partial_rank,
        CASE WHEN LOWER(display_name) LIKE '%' || LOWER($1) || '%' THEN 0 ELSE 1 END AS display_rank
      FROM barangays
      WHERE
        LOWER(name) LIKE '%' || LOWER($1) || '%'
        OR LOWER(municipality_name) LIKE '%' || LOWER($1) || '%'
        OR LOWER(display_name) LIKE '%' || LOWER($1) || '%'
        OR psgc_code LIKE $1 || '%'
      ORDER BY
        exact_rank ASC,
        starts_rank ASC,
        partial_rank ASC,
        display_rank ASC,
        name ASC,
        municipality_name ASC
      LIMIT 10;
    `,
    [query],
  );

  return rows.map(({ exact_rank: _exactRank, starts_rank: _startsRank, partial_rank: _partialRank, display_rank: _displayRank, ...row }) => row);
}

async function queryBarangaysByMunicipality(psgcCode: string): Promise<BoundaryFeatureCollection> {
  const pool = getPool();
  const { rows } = await pool.query<JsonRow<BoundaryFeatureCollection>>(
    `
      WITH barangay_geometry AS (
        SELECT
          psgc_code,
          name,
          municipality_psgc_code,
          municipality_name,
          ${NORMALIZED_BARANGAY_SIMPLIFIED_GEOM_SQL} AS geom
        FROM barangays
        WHERE municipality_psgc_code = $1
      )
      SELECT
        jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(geom, ${GEOJSON_DETAIL_DECIMALS})::jsonb,
                'properties', jsonb_build_object(
                  'psgcCode', psgc_code,
                  'name', name,
                  'municipalityCode', municipality_psgc_code,
                  'municipalityName', municipality_name,
                  'bbox', jsonb_build_array(
                    ST_XMin(ST_Envelope(geom)),
                    ST_YMin(ST_Envelope(geom)),
                    ST_XMax(ST_Envelope(geom)),
                    ST_YMax(ST_Envelope(geom))
                  )
                )
              )
              ORDER BY name ASC
            ),
            '[]'::jsonb
          )
        ) AS geojson
      FROM barangay_geometry;
    `,
    [psgcCode],
  );

  return rows[0]?.geojson ?? { type: "FeatureCollection", features: [] };
}

async function queryBarangayDetail(psgcCode: string): Promise<BarangayDetail | null> {
  const pool = getPool();
  const { rows } = await pool.query<BarangayDetailRow>(
    `
      WITH barangay_detail AS (
        SELECT
          psgc_code,
          name,
          display_name,
          municipality_psgc_code,
          municipality_name,
          province_name,
          region_name,
          ${NORMALIZED_BARANGAY_GEOM_SQL} AS geom,
          ${NORMALIZED_BARANGAY_SIMPLIFIED_GEOM_SQL} AS geom_simplified,
          ${NORMALIZED_BARANGAY_CENTROID_SQL} AS centroid,
          ${NORMALIZED_BARANGAY_BBOX_SQL} AS bbox
        FROM barangays
        WHERE psgc_code = $1
        LIMIT 1
      )
      SELECT
        psgc_code AS "psgcCode",
        name,
        display_name AS "displayName",
        municipality_psgc_code AS "municipalityPsgcCode",
        municipality_name AS "municipalityName",
        province_name AS "provinceName",
        region_name AS "regionName",
        ARRAY[ST_X(centroid), ST_Y(centroid)]::float8[] AS centroid,
        ARRAY[
          ST_XMin(bbox),
          ST_YMin(bbox),
          ST_XMax(bbox),
          ST_YMax(bbox)
        ]::float8[] AS bbox,
        ROUND((ST_Area(geom::geography) / 1000000.0)::numeric, 4)::float8 AS "areaSqKm",
        ST_AsGeoJSON(geom_simplified, ${GEOJSON_DETAIL_DECIMALS})::jsonb AS geometry
      FROM barangay_detail;
    `,
    [psgcCode],
  );

  return rows[0] ?? null;
}

export async function listMunicipalities(): Promise<MunicipalitySummary[]> {
  return getCachedValue("territory:municipalities", TERRITORY_CACHE_TTL_MS, queryMunicipalities);
}

export async function hasMunicipality(psgcCode: string): Promise<boolean> {
  const municipalities = await listMunicipalities();
  return municipalities.some((entry) => entry.psgcCode === psgcCode);
}

export async function getMunicipalityGeometry(): Promise<BoundaryFeatureCollection> {
  return getCachedValue("territory:municipality-geometry", TERRITORY_CACHE_TTL_MS, queryMunicipalityGeometry);
}

export async function listBarangaysByMunicipality(psgcCode: string): Promise<BoundaryFeatureCollection> {
  return getCachedValue(
    `territory:barangays-by-municipality:${psgcCode}`,
    TERRITORY_CACHE_TTL_MS,
    () => queryBarangaysByMunicipality(psgcCode),
  );
}

export async function getBarangayDetail(psgcCode: string): Promise<BarangayDetail | null> {
  return getCachedValue(
    `territory:barangay-detail:${psgcCode}`,
    TERRITORY_CACHE_TTL_MS,
    () => queryBarangayDetail(psgcCode),
  );
}
