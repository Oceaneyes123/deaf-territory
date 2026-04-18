-- Enable PostGIS extension for geometry types
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS municipalities (
    municipality_psgc_code VARCHAR(9) PRIMARY KEY,
    region_psgc_code VARCHAR(2) NOT NULL,
    province_psgc_code VARCHAR(5) NOT NULL,
    city_municipality_name TEXT NOT NULL,
    search_text TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    centroid geometry(Point, 4326) NOT NULL,
    bbox geometry(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT municipalities_city_municipality_name_unique UNIQUE (city_municipality_name)
);

CREATE TABLE IF NOT EXISTS barangays (
    barangay_psgc_code VARCHAR(9) PRIMARY KEY,
    municipality_psgc_code VARCHAR(9) NOT NULL,
    barangay_name TEXT NOT NULL,
    search_text TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    centroid geometry(Point, 4326) NOT NULL,
    bbox geometry(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT barangays_municipality_fk
        FOREIGN KEY (municipality_psgc_code)
        REFERENCES municipalities(municipality_psgc_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT barangays_name_per_municipality_unique UNIQUE (municipality_psgc_code, barangay_name)
);
