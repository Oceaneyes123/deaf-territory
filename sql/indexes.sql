CREATE INDEX IF NOT EXISTS idx_psgc_admin_staging_level
    ON psgc_admin_staging (level);

CREATE INDEX IF NOT EXISTS idx_psgc_admin_staging_city_municipality_code
    ON psgc_admin_staging (city_municipality_code);

CREATE INDEX IF NOT EXISTS idx_barangay_boundary_staging_geom_gist
    ON barangay_boundary_staging USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_barangay_boundary_staging_city_municipality_code
    ON barangay_boundary_staging (city_municipality_code);

CREATE INDEX IF NOT EXISTS idx_municipalities_geom_gist
    ON municipalities USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_municipalities_geom_simplified_gist
    ON municipalities USING GIST (geom_simplified);

CREATE INDEX IF NOT EXISTS idx_municipalities_centroid_gist
    ON municipalities USING GIST (centroid);

CREATE INDEX IF NOT EXISTS idx_municipalities_bbox_gist
    ON municipalities USING GIST (bbox);

CREATE INDEX IF NOT EXISTS idx_barangays_geom_gist
    ON barangays USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_barangays_geom_simplified_gist
    ON barangays USING GIST (geom_simplified);

CREATE INDEX IF NOT EXISTS idx_barangays_centroid_gist
    ON barangays USING GIST (centroid);

CREATE INDEX IF NOT EXISTS idx_barangays_bbox_gist
    ON barangays USING GIST (bbox);

CREATE INDEX IF NOT EXISTS idx_barangays_municipality_psgc_code_btree
    ON barangays (municipality_psgc_code);

CREATE INDEX IF NOT EXISTS idx_barangays_search_text_tsv_gin
    ON barangays USING GIN (to_tsvector('simple', search_text));

CREATE INDEX IF NOT EXISTS idx_municipalities_search_text_tsv_gin
    ON municipalities USING GIN (to_tsvector('simple', search_text));
