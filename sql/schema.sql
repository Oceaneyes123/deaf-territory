CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS psgc_admin_staging (
    code VARCHAR(10) PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    parent_code VARCHAR(10),
    region_code VARCHAR(2),
    province_code VARCHAR(4),
    city_municipality_code VARCHAR(9),
    barangay_code VARCHAR(10),
    source TEXT NOT NULL DEFAULT 'psgc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barangay_boundary_staging (
    psgc_code VARCHAR(10) PRIMARY KEY,
    barangay_name TEXT NOT NULL,
    city_municipality_code VARCHAR(9) NOT NULL,
    province_code VARCHAR(4),
    geom geometry(MultiPolygon, 4326) NOT NULL,
    source TEXT NOT NULL DEFAULT 'boundary-import',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS municipalities (
    psgc_code VARCHAR(9) PRIMARY KEY,
    region_psgc_code VARCHAR(2),
    province_psgc_code VARCHAR(4),
    name TEXT NOT NULL,
    province_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('municipality', 'city')),
    search_text TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    geom_simplified geometry(MultiPolygon, 4326) NOT NULL,
    centroid geometry(Point, 4326) NOT NULL,
    bbox geometry(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barangays (
    psgc_code VARCHAR(10) PRIMARY KEY,
    municipality_psgc_code VARCHAR(9) NOT NULL REFERENCES municipalities(psgc_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    municipality_name TEXT NOT NULL,
    province_name TEXT NOT NULL,
    region_name TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    search_text TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    geom_simplified geometry(MultiPolygon, 4326) NOT NULL,
    centroid geometry(Point, 4326) NOT NULL,
    bbox geometry(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT barangays_name_per_municipality_unique UNIQUE (municipality_psgc_code, name)
);

DROP TRIGGER IF EXISTS psgc_admin_staging_touch_updated_at ON psgc_admin_staging;
CREATE TRIGGER psgc_admin_staging_touch_updated_at
BEFORE UPDATE ON psgc_admin_staging
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS barangay_boundary_staging_touch_updated_at ON barangay_boundary_staging;
CREATE TRIGGER barangay_boundary_staging_touch_updated_at
BEFORE UPDATE ON barangay_boundary_staging
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS municipalities_touch_updated_at ON municipalities;
CREATE TRIGGER municipalities_touch_updated_at
BEFORE UPDATE ON municipalities
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS barangays_touch_updated_at ON barangays;
CREATE TRIGGER barangays_touch_updated_at
BEFORE UPDATE ON barangays
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
